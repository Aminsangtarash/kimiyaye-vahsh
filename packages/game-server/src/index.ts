import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { randomUUID } from "node:crypto";
import { loadServerEnv, SOCKET_EVENTS, ClientCommandSchema } from "@kv/contracts";
import type { AnimalRealm, Identity, Suit } from "@kv/contracts";
import {
  applyRoomCommand,
  createPlayVsBotsRoom,
  createRoom,
  expireStaleRooms,
  handleDisconnect,
  joinRoom,
  matchStore,
  projectRoomForSeat,
  setRoomCallbacks,
  setRoomRuntimeConfig,
  type Room,
  type RoomCommand,
} from "./rooms.js";
import { verifyGameTicket } from "./ticket.js";
import { MockRewardProvider, buildRewardEvent } from "./rewards.js";
import { RateLimiter, MAX_PAYLOAD_BYTES } from "./rateLimit.js";
import { log } from "./logger.js";
import { hashSession } from "./persist.js";

const env = loadServerEnv();
setRoomRuntimeConfig({
  matchStartCountdownMs: env.MATCH_START_COUNTDOWN_MS,
  quickMatchBotFillAfterMs: env.QUICK_MATCH_BOT_FILL_AFTER_MS,
  botActionDelayMs: env.NODE_ENV === "test" ? 0 : env.BOT_ACTION_DELAY_MS,
  trickResolveDelayMs: env.NODE_ENV === "test" ? 0 : 2500,
  hunterSelectionTimeoutMs: env.NODE_ENV === "test" ? 0 : env.HUNTER_SELECTION_TIMEOUT_MS,
  resultAckTimeoutMs: env.NODE_ENV === "test" ? 0 : env.RESULT_ACK_TIMEOUT_MS,
  specialCardsEnabled: env.SPECIAL_CARDS_V1_ENABLED,
  reconnectGraceMs: env.RECONNECT_GRACE_MS,
  impact: {
    trickWon: env.IMPACT_TRICK_WON,
    successfulSpecial: env.IMPACT_SUCCESSFUL_SPECIAL,
    legendaryCounter: env.IMPACT_LEGENDARY_COUNTER,
    teamAssist: env.IMPACT_TEAM_ASSIST,
    humanTimeout: env.IMPACT_HUMAN_TIMEOUT,
  },
});

const app: express.Express = express();
app.use(
  cors({
    origin: env.CORS_ORIGINS.split(",").map((s) => s.trim()),
  }),
);
app.use(express.json({ limit: "32kb" }));

const rooms = new Map<string, Room>();
const codeIndex = new Map<string, string>();
const quickQueue: string[] = [];
const rewards = new MockRewardProvider();
const commandLimiter = new RateLimiter(30, 10);
const joinLimiter = new RateLimiter(10, 2);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: env.CORS_ORIGINS.split(",").map((s) => s.trim()) },
  maxHttpBufferSize: MAX_PAYLOAD_BYTES,
});

function emitToRoom(room: Room) {
  for (let seat = 0; seat < 4; seat++) {
    const s = room.seats[seat];
    if (!s?.connected || s.controllerType === "bot") continue;
    const view = projectRoomForSeat(room, seat);
    io.to(`${room.roomId}:${seat}`).emit(SOCKET_EVENTS.event, {
      type: "game_state",
      stateVersion: room.stateVersion,
      payload: view,
    });
  }
}

setRoomCallbacks({
  broadcast: emitToRoom,
  matchStarted: (room) => emitToRoom(room),
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "kv-game-server",
    v2: true,
    specialCardsEnabled: env.SPECIAL_CARDS_V1_ENABLED,
    ts: new Date().toISOString(),
  });
});

app.get("/ready", (_req, res) => {
  res.json({ ok: true, rooms: rooms.size, nodeEnv: env.NODE_ENV });
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

setInterval(() => {
  expireStaleRooms(rooms, env.RECONNECT_GRACE_MS);
  commandLimiter.prune();
  joinLimiter.prune();
  for (const room of rooms.values()) {
    if (room.mode === "quick" && room.status === "open") emitToRoom(room);
  }
}, 5_000).unref();

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
    } else if (occupiedCountSafe(room) < 3) {
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

  socket.on(SOCKET_EVENTS.playVsBots, (payload: { realm?: string }, ack) => {
    if (!joinLimiter.allow(rateKey)) {
      ack?.({ ok: false, error: "Rate limited" });
      return;
    }
    try {
      const preferred =
        payload?.realm && ["carnivore", "herbivore", "bird", "reptile"].includes(payload.realm)
          ? (payload.realm as AnimalRealm)
          : undefined;
      const { room, seat } = createPlayVsBotsRoom(identity, preferred);
      rooms.set(room.roomId, room);
      codeIndex.set(room.code, room.roomId);
      boundRoomId = room.roomId;
      boundSeat = seat;
      socket.join(`${room.roomId}:${seat}`);
      ack?.({ ok: true, roomId: room.roomId, code: room.code, seat });
      emitToRoom(room);
    } catch (e) {
      ack?.({ ok: false, error: e instanceof Error ? e.message : "Failed" });
    }
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
    const action = mapCommand(cmd.type, seat, cmd.payload);
    if (!action) {
      ack?.({ ok: false, error: "Unsupported" });
      return;
    }
    const result = applyRoomCommand(room, seat, cmd.commandId, cmd.clientSeq, action);
    if (!result.ok) {
      ack?.({
        ok: false,
        error: result.error,
        commandId: cmd.commandId,
        stateVersion: room.stateVersion,
      });
      return;
    }

    if (room.game?.phase === "match_complete" && !result.duplicate) {
      const hasBots = room.seats.some((s) => s?.controllerType === "bot");
      if (!(hasBots && env.REWARD_SKIP_BOT_MATCHES)) {
        for (const s of room.seats) {
          if (
            s?.identity.kind === "authenticated" &&
            s.identity.userId &&
            room.game.matchWinnerTeam !== null
          ) {
            const team = s.seat % 2 === 0 ? 0 : 1;
            const teamResult = team === room.game.matchWinnerTeam ? "win" : "loss";
            const ev = buildRewardEvent(
              room.roomId,
              s.identity.userId,
              teamResult,
              env.GAME_TICKET_SECRET,
            );
            void rewards.submit({
              ...ev,
              hasBots,
              mvpParticipantIds: room.game.mvpParticipantIds,
              impactScore: room.game.seatStats[s.seat]?.impactScore,
            });
          }
        }
      }
    }
    emitToRoom(room);
    ack?.({ ok: true, commandId: cmd.commandId, stateVersion: room.stateVersion });
  });

  socket.on("disconnect", () => {
    if (!boundRoomId || boundSeat === null) return;
    const room = rooms.get(boundRoomId);
    if (!room) return;
    handleDisconnect(room, identity.sessionId);
    emitToRoom(room);
  });
});

function occupiedCountSafe(room: Room): number {
  return room.seats.filter(Boolean).length;
}

function mapCommand(
  type: string,
  seat: number,
  payload: unknown,
): RoomCommand | null {
  const p = (payload ?? {}) as Record<string, unknown>;
  switch (type) {
    case "SELECT_REALM":
      if (typeof p.realm !== "string") return null;
      return { type: "SELECT_REALM", seat, realm: p.realm as AnimalRealm };
    case "SELECT_HUNTER_REALM":
      if (typeof p.realm !== "string") return null;
      return {
        type: "SELECT_HUNTER_REALM",
        seat,
        realm: p.realm as AnimalRealm,
        source: "manual",
      };
    case "ADD_BOT":
      return {
        type: "ADD_BOT",
        seat,
        targetSeat: typeof p.targetSeat === "number" ? p.targetSeat : undefined,
      };
    case "FILL_BOTS":
      return { type: "FILL_BOTS", seat };
    case "REMOVE_BOT":
      if (typeof p.targetSeat !== "number") return null;
      return { type: "REMOVE_BOT", seat, targetSeat: p.targetSeat };
    case "PLAY_CARD":
      if (typeof p.cardInstanceId !== "string") return null;
      return {
        type: "PLAY_CARD",
        seat,
        cardInstanceId: p.cardInstanceId,
        specialInstanceIds: Array.isArray(p.specialInstanceIds)
          ? p.specialInstanceIds.filter((x): x is string => typeof x === "string")
          : undefined,
        declareChameleon: Boolean(p.declareChameleon),
      };
    case "REQUEST_SPECIAL_DRAW":
      return { type: "REQUEST_SPECIAL_DRAW", seat };
    case "DISCARD_SPECIAL":
      if (typeof p.specialInstanceId !== "string") return null;
      return { type: "DISCARD_SPECIAL", seat, specialInstanceId: p.specialInstanceId };
    case "PLAY_SPECIAL":
      if (typeof p.specialInstanceId !== "string") return null;
      return {
        type: "PLAY_SPECIAL",
        seat,
        specialInstanceId: p.specialInstanceId,
        targetSeat: typeof p.targetSeat === "number" ? p.targetSeat : undefined,
        targetSuit: p.targetSuit as Suit | undefined,
        targetPlayIndex: typeof p.targetPlayIndex === "number" ? p.targetPlayIndex : undefined,
      };
    case "PASS_SPECIAL":
      return { type: "PASS_SPECIAL", seat };
    case "CONTINUE_HAND":
      return { type: "CONTINUE_HAND" };
    case "SURRENDER":
      return { type: "SURRENDER", seat };
    case "READY":
    case "START_MATCH":
      return { type: "READY", seat } as unknown as RoomCommand;
    default:
      return null;
  }
}

httpServer.listen(env.GAME_SERVER_PORT, env.GAME_SERVER_HOST, () => {
  log("info", "server_listen", {
    event: "listen",
    port: env.GAME_SERVER_PORT,
  });
});
