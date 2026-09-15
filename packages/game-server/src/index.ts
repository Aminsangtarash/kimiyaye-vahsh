import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { randomUUID } from "node:crypto";
import { loadServerEnv } from "@kv/contracts";
import { SOCKET_EVENTS, ClientCommandSchema } from "@kv/contracts";
import type { Identity, Suit } from "@kv/contracts";
import {
  applyRoomCommand,
  createRoom,
  expireStaleRooms,
  joinRoom,
  matchStore,
  projectRoomForSeat,
  type Room,
} from "./rooms.js";
import { verifyGameTicket } from "./ticket.js";
import { MockRewardProvider, buildRewardEvent } from "./rewards.js";
import { RateLimiter, MAX_PAYLOAD_BYTES } from "./rateLimit.js";
import { log } from "./logger.js";
import { hashSession } from "./persist.js";

const env = loadServerEnv();
const app: express.Express = express();
app.use(
  cors({
    origin: env.CORS_ORIGINS.split(",").map((s) => s.trim()),
  }),
);
app.use(express.json({ limit: "32kb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "kv-game-server", ts: new Date().toISOString() });
});

app.get("/ready", (_req, res) => {
  res.json({
    ok: true,
    rooms: rooms.size,
    nodeEnv: env.NODE_ENV,
  });
});

app.get("/metrics", (_req, res) => {
  res.type("text/plain").send(
    [
      `# HELP kv_rooms_total Active rooms`,
      `# TYPE kv_rooms_total gauge`,
      `kv_rooms_total ${rooms.size}`,
      `# HELP kv_connections_total Active socket connections`,
      `# TYPE kv_connections_total gauge`,
      `kv_connections_total ${io.engine.clientsCount}`,
    ].join("\n") + "\n",
  );
});

/** Dev/admin-only match audit viewer — disabled in production */
app.get("/admin/matches/:matchId", (req, res) => {
  if (env.NODE_ENV === "production") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const adminKey = req.header("x-kv-admin-key");
  if (adminKey !== (process.env.KV_ADMIN_KEY || "dev-admin")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const rec = matchStore.get(req.params.matchId);
  if (!rec) {
    res.status(404).json({ error: "Match not found" });
    return;
  }
  res.json(rec);
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: env.CORS_ORIGINS.split(",").map((s) => s.trim()) },
  maxHttpBufferSize: MAX_PAYLOAD_BYTES,
});

const rooms = new Map<string, Room>();
const codeIndex = new Map<string, string>();
const quickQueue: string[] = [];
const rewards = new MockRewardProvider();
const commandLimiter = new RateLimiter(30, 10);
const joinLimiter = new RateLimiter(10, 2);

setInterval(() => {
  expireStaleRooms(rooms, env.RECONNECT_GRACE_MS);
  commandLimiter.prune();
  joinLimiter.prune();
}, 30_000).unref();

function identityFromHandshake(auth: Record<string, unknown>): Identity {
  const ticket = typeof auth.ticket === "string" ? auth.ticket : undefined;
  const displayName =
    typeof auth.displayName === "string" && auth.displayName.trim()
      ? auth.displayName.trim().slice(0, 32)
      : "Guest";
  if (ticket) {
    const claims = verifyGameTicket(ticket, env.GAME_TICKET_SECRET);
    if (claims) {
      return {
        kind: "authenticated",
        userId: claims.sub,
        displayName: claims.displayName,
        sessionId: claims.sub,
      };
    }
  }
  const sessionId =
    typeof auth.sessionId === "string" && auth.sessionId.length > 8
      ? auth.sessionId
      : randomUUID();
  return { kind: "guest", displayName, sessionId };
}

function emitToRoom(room: Room) {
  for (let seat = 0; seat < 4; seat++) {
    const s = room.seats[seat];
    if (!s?.connected) continue;
    const view = projectRoomForSeat(room, seat);
    io.to(`${room.roomId}:${seat}`).emit(SOCKET_EVENTS.event, {
      type: "game_state",
      stateVersion: room.stateVersion,
      payload: view,
    });
  }
}

function emitToSeat(room: Room, seat: number) {
  const view = projectRoomForSeat(room, seat);
  io.to(`${room.roomId}:${seat}`).emit(SOCKET_EVENTS.event, {
    type: "game_state",
    stateVersion: room.stateVersion,
    payload: view,
  });
}

io.on("connection", (socket) => {
  const identity = identityFromHandshake(socket.handshake.auth as Record<string, unknown>);
  let boundRoomId: string | null = null;
  let boundSeat: number | null = null;
  const rateKey = hashSession(identity.sessionId);

  log("info", "socket_connect", {
    sessionId: rateKey,
    userId: identity.userId,
    event: "connect",
  });

  socket.on(SOCKET_EVENTS.quickMatch, (_payload, ack) => {
    if (!joinLimiter.allow(rateKey)) {
      ack?.({ ok: false, error: "Rate limited" });
      return;
    }
    let room: Room | undefined;
    while (quickQueue.length) {
      const id = quickQueue.shift()!;
      room = rooms.get(id);
      if (room && room.status === "open") break;
      room = undefined;
    }
    if (!room) {
      room = createRoom("quick");
      rooms.set(room.roomId, room);
      codeIndex.set(room.code, room.roomId);
      quickQueue.push(room.roomId);
    }
    const joined = joinRoom(room, identity);
    if ("error" in joined) {
      ack?.({ ok: false, error: joined.error });
      return;
    }
    boundRoomId = room.roomId;
    boundSeat = joined.seat;
    socket.join(`${room.roomId}:${joined.seat}`);
    ack?.({ ok: true, roomId: room.roomId, code: room.code, seat: joined.seat });
    emitToRoom(room);
  });

  socket.on(SOCKET_EVENTS.joinRoom, (payload: { code?: string; create?: boolean }, ack) => {
    if (!joinLimiter.allow(rateKey)) {
      ack?.({ ok: false, error: "Rate limited" });
      return;
    }
    let room: Room | undefined;
    if (payload.create) {
      room = createRoom("private");
      rooms.set(room.roomId, room);
      codeIndex.set(room.code, room.roomId);
    } else if (payload.code) {
      room = rooms.get(codeIndex.get(payload.code.toUpperCase()) ?? "");
    }
    if (!room) {
      ack?.({ ok: false, error: "Room not found" });
      return;
    }
    const joined = joinRoom(room, identity);
    if ("error" in joined) {
      ack?.({ ok: false, error: joined.error });
      return;
    }
    boundRoomId = room.roomId;
    boundSeat = joined.seat;
    socket.join(`${room.roomId}:${joined.seat}`);
    // Recovery: push current legal projection only
    emitToSeat(room, joined.seat);
    ack?.({ ok: true, roomId: room.roomId, code: room.code, seat: joined.seat });
    emitToRoom(room);
  });

  socket.on(SOCKET_EVENTS.command, (raw, ack) => {
    if (!commandLimiter.allow(rateKey)) {
      ack?.({ ok: false, error: "Rate limited" });
      return;
    }
    const size = Buffer.byteLength(JSON.stringify(raw ?? {}));
    if (size > MAX_PAYLOAD_BYTES) {
      ack?.({ ok: false, error: "Payload too large" });
      return;
    }
    const parsed = ClientCommandSchema.safeParse(raw);
    if (!parsed.success) {
      ack?.({ ok: false, error: "Invalid command" });
      return;
    }
    const cmd = parsed.data;
    const room = rooms.get(cmd.roomId);
    if (!room || boundSeat === null || boundRoomId !== cmd.roomId) {
      ack?.({ ok: false, error: "Unauthorized room access" });
      return;
    }
    const seat = boundSeat;
    let action;
    switch (cmd.type) {
      case "READY":
        action = { type: "READY" as const, seat };
        break;
      case "START_MATCH":
        action = { type: "START_MATCH" as const, seat };
        break;
      case "PLAY_CARD": {
        const p = cmd.payload as { cardInstanceId?: string; declareChameleon?: boolean };
        if (!p?.cardInstanceId) {
          ack?.({ ok: false, error: "Missing card" });
          return;
        }
        action = {
          type: "PLAY_CARD" as const,
          seat,
          cardInstanceId: p.cardInstanceId,
          declareChameleon: p.declareChameleon,
        };
        break;
      }
      case "PLAY_SPECIAL": {
        const p = cmd.payload as {
          specialInstanceId?: string;
          targetSeat?: number;
          targetSuit?: string;
          targetPlayIndex?: number;
        };
        if (!p?.specialInstanceId) {
          ack?.({ ok: false, error: "Missing special" });
          return;
        }
        action = {
          type: "PLAY_SPECIAL" as const,
          seat,
          specialInstanceId: p.specialInstanceId,
          targetSeat: p.targetSeat,
          targetSuit: p.targetSuit as Suit | undefined,
          targetPlayIndex: p.targetPlayIndex,
        };
        break;
      }
      case "PASS_SPECIAL":
        action = { type: "PASS_SPECIAL" as const, seat };
        break;
      case "SURRENDER":
        action = { type: "SURRENDER" as const, seat };
        break;
      default:
        ack?.({ ok: false, error: "Unsupported" });
        return;
    }
    const result = applyRoomCommand(room, seat, cmd.commandId, cmd.clientSeq, action);
    if (!result.ok) {
      log("warn", "command_rejected", {
        roomId: room.roomId,
        matchId: room.matchRecordId ?? undefined,
        sessionId: rateKey,
        event: cmd.type,
        error: result.error,
      });
      ack?.({
        ok: false,
        error: result.error,
        commandId: cmd.commandId,
        stateVersion: room.stateVersion,
      });
      return;
    }
    if (room.game?.phase === "match_complete" && !result.duplicate) {
      let anyAuth = false;
      for (const s of room.seats) {
        if (
          s?.identity.kind === "authenticated" &&
          s.identity.userId &&
          room.game.matchWinnerTeam !== null
        ) {
          anyAuth = true;
          const team = s.seat % 2 === 0 ? 0 : 1;
          const teamResult = team === room.game.matchWinnerTeam ? "win" : "loss";
          void rewards.submit(
            buildRewardEvent(room.roomId, s.identity.userId, teamResult, env.GAME_TICKET_SECRET),
          );
        }
      }
      if (room.matchRecordId) {
        matchStore.complete(
          room.matchRecordId,
          {
            winnerTeam: room.game.matchWinnerTeam,
            surrender: room.game.surrenderTeam !== null,
          },
          anyAuth ? "submitted" : "skipped_guest",
        );
      }
    }
    emitToRoom(room);
    ack?.({ ok: true, commandId: cmd.commandId, stateVersion: room.stateVersion });
  });

  socket.on("disconnect", () => {
    if (!boundRoomId || boundSeat === null) return;
    const room = rooms.get(boundRoomId);
    const s = room?.seats[boundSeat];
    if (s) {
      s.connected = false;
      s.lastSeenAt = Date.now();
      log("info", "socket_disconnect", {
        roomId: boundRoomId,
        sessionId: rateKey,
        event: "disconnect",
        seat: boundSeat,
      });
      if (room) emitToRoom(room);
    }
  });
});

httpServer.listen(env.GAME_SERVER_PORT, env.GAME_SERVER_HOST, () => {
  log("info", "server_listen", {
    event: "listen",
    port: env.GAME_SERVER_PORT,
  });
});

