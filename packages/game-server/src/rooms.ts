import { randomUUID } from "node:crypto";
import {
  applyAction,
  createInitialState,
  projectForSeat,
  SeededRandom,
  type GameAction,
  type GameState,
} from "@kv/game-core";
import type { Identity } from "@kv/contracts";
import { SEATS, TEAM_BY_SEAT } from "@kv/contracts";
import { hashSeed, hashSession, MatchStore, type MatchRecord } from "./persist.js";
import { secureSeed } from "./secureRng.js";
import { log } from "./logger.js";

export type RoomCommand =
  | { type: "READY"; seat: number }
  | { type: "START_MATCH"; seat: number }
  | GameAction;

export type RoomStatus = "open" | "in_progress" | "completed" | "expired";

export interface SeatAssignment {
  seat: number;
  identity: Identity;
  ready: boolean;
  connected: boolean;
  lastSeenAt: number;
  processedCommandIds: Set<string>;
  clientSeq: number;
}

export interface Room {
  roomId: string;
  code: string;
  mode: "private" | "quick";
  status: RoomStatus;
  createdAt: number;
  expiresAt: number;
  seats: (SeatAssignment | null)[];
  hostSeat: number | null;
  game: GameState | null;
  stateVersion: number;
  lastCommandAt: number;
  matchRecordId: string | null;
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const matchStore = new MatchStore();

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export function createRoom(mode: "private" | "quick"): Room {
  const now = Date.now();
  return {
    roomId: randomUUID(),
    code: generateRoomCode(),
    mode,
    status: "open",
    createdAt: now,
    expiresAt: now + 2 * 60 * 60 * 1000,
    seats: [null, null, null, null],
    hostSeat: null,
    game: null,
    stateVersion: 0,
    lastCommandAt: now,
    matchRecordId: null,
  };
}

export function findEmptySeat(room: Room): number | null {
  const idx = room.seats.findIndex((s) => s === null);
  return idx >= 0 ? idx : null;
}

export function joinRoom(room: Room, identity: Identity): { seat: number } | { error: string } {
  if (room.status === "completed" || room.status === "expired") {
    return { error: "Room closed" };
  }
  if (Date.now() > room.expiresAt) {
    room.status = "expired";
    return { error: "Room expired" };
  }
  const existing = room.seats.findIndex((s) => s?.identity.sessionId === identity.sessionId);
  if (existing >= 0) {
    room.seats[existing]!.connected = true;
    room.seats[existing]!.lastSeenAt = Date.now();
    log("info", "seat_reconnect", {
      roomId: room.roomId,
      sessionId: hashSession(identity.sessionId),
      event: "reconnect",
      seat: existing,
    });
    return { seat: existing };
  }
  if (room.status === "in_progress") {
    return { error: "Match already started" };
  }
  const seat = findEmptySeat(room);
  if (seat === null) return { error: "Room full" };
  room.seats[seat] = {
    seat,
    identity,
    ready: false,
    connected: true,
    lastSeenAt: Date.now(),
    processedCommandIds: new Set(),
    clientSeq: -1,
  };
  if (room.hostSeat === null) room.hostSeat = seat;
  return { seat };
}

export function roomLobbyView(room: Room) {
  return {
    roomId: room.roomId,
    code: room.code,
    mode: room.mode,
    status: room.status,
    seats: room.seats.map((s, seat) =>
      s
        ? {
            seat,
            displayName: s.identity.displayName,
            team: TEAM_BY_SEAT[seat],
            ready: s.ready,
            connected: s.connected,
            kind: s.identity.kind,
          }
        : null,
    ),
    hostSeat: room.hostSeat,
    canStart:
      room.seats.every((s) => s !== null && s.ready) &&
      room.seats.filter(Boolean).length === SEATS,
  };
}

function beginMatchRecord(room: Room, seed: number): MatchRecord {
  const createdAt = new Date().toISOString();
  return matchStore.create({
    matchId: room.roomId,
    roomId: room.roomId,
    roomCode: room.code,
    mode: room.mode,
    participants: room.seats.map((s, seat) => ({
      seat,
      team: TEAM_BY_SEAT[seat],
      kind: s!.identity.kind,
      sessionIdHash: hashSession(s!.identity.sessionId),
      userId: s!.identity.userId,
      displayName: s!.identity.displayName,
    })),
    seedHash: hashSeed(seed),
    seed,
    scores: { teamTricks: [0, 0], teamHands: [0, 0] },
    result: null,
    rewardStatus: "none",
    createdAt,
  });
}

export function applyRoomCommand(
  room: Room,
  seat: number,
  commandId: string,
  clientSeq: number,
  action: RoomCommand,
): { ok: boolean; error?: string; room: Room; duplicate?: boolean } {
  const assignment = room.seats[seat];
  if (!assignment) return { ok: false, error: "Not seated", room };
  if (assignment.processedCommandIds.has(commandId)) {
    return { ok: true, room, duplicate: true };
  }
  if (clientSeq <= assignment.clientSeq) {
    return { ok: false, error: "Stale sequence", room };
  }
  if (processedCommandCap(assignment)) {
    return { ok: false, error: "Command buffer overflow", room };
  }
  assignment.clientSeq = clientSeq;
  assignment.processedCommandIds.add(commandId);
  assignment.lastSeenAt = Date.now();
  room.lastCommandAt = Date.now();

  if (action.type === "READY") {
    assignment.ready = true;
    room.stateVersion += 1;
    return { ok: true, room };
  }

  if (action.type === "START_MATCH") {
    if (room.hostSeat !== seat) return { ok: false, error: "Host only", room };
    if (!room.seats.every((s) => s?.ready)) return { ok: false, error: "Not all ready", room };
    const seed = secureSeed();
    room.game = createInitialState(room.roomId, seed);
    const r = applyAction(room.game, { type: "START_MATCH" }, undefined, new SeededRandom(seed));
    if (!r.ok) return { ok: false, error: r.error, room };
    room.game = r.state;
    room.status = "in_progress";
    room.stateVersion = room.game.stateVersion;
    room.matchRecordId = room.roomId;
    beginMatchRecord(room, seed);
    matchStore.appendAction(room.roomId, {
      at: new Date().toISOString(),
      seat,
      type: "START_MATCH",
      commandId,
      summary: { seedHash: hashSeed(seed) },
    });
    if (process.env.KV_QUIET !== "1") {
      log("info", "match_started", { matchId: room.roomId, roomId: room.roomId, event: "start" });
    }
    return { ok: true, room };
  }

  if (!room.game) return { ok: false, error: "Match not started", room };
  // Authorization: seat in action must match bound seat
  if ("seat" in action && action.seat !== seat) {
    return { ok: false, error: "Seat mismatch", room };
  }

  const r = applyAction(room.game, action as GameAction);
  if (!r.ok) return { ok: false, error: r.error, room };
  room.game = r.state;
  room.stateVersion = room.game.stateVersion;

  if (room.matchRecordId) {
    matchStore.appendAction(room.matchRecordId, {
      at: new Date().toISOString(),
      seat,
      type: action.type,
      commandId,
      summary: sanitizeActionSummary(action),
    });
    matchStore.updateScores(room.matchRecordId, {
      teamTricks: [...room.game.handScore.teamTricks] as [number, number],
      teamHands: [...room.game.matchScore.teamHands] as [number, number],
    });
    for (const ev of r.events ?? []) {
      if (ev.type === "trick_won") {
        matchStore.appendTrick(room.matchRecordId, {
          winnerSeat: ev.winnerSeat,
          team: ev.team,
          superiorAfter: room.game.superiorSuit,
        });
      }
    }
  }

  if (room.game.phase === "match_complete") {
    room.status = "completed";
    if (room.matchRecordId) {
      matchStore.complete(
        room.matchRecordId,
        {
          winnerTeam: room.game.matchWinnerTeam,
          surrender: room.game.surrenderTeam !== null,
        },
        "pending",
      );
    }
  }
  return { ok: true, room };
}

function processedCommandCap(assignment: SeatAssignment): boolean {
  if (assignment.processedCommandIds.size > 500) {
    const arr = [...assignment.processedCommandIds];
    assignment.processedCommandIds = new Set(arr.slice(-200));
  }
  return false;
}

function sanitizeActionSummary(action: RoomCommand): Record<string, unknown> {
  if (action.type === "PLAY_CARD") {
    return { cardInstanceId: action.cardInstanceId, chameleon: Boolean(action.declareChameleon) };
  }
  if (action.type === "PLAY_SPECIAL") {
    return { specialInstanceId: action.specialInstanceId, targetSeat: action.targetSeat };
  }
  return { type: action.type };
}

export function projectRoomForSeat(room: Room, seat: number) {
  if (!room.game) {
    return { lobby: roomLobbyView(room), game: null };
  }
  return { lobby: roomLobbyView(room), game: projectForSeat(room.game, seat) };
}

export function expireStaleRooms(rooms: Map<string, Room>, graceMs: number): void {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (now > room.expiresAt && room.status === "open") {
      room.status = "expired";
    }
    for (const s of room.seats) {
      if (s && !s.connected && now - s.lastSeenAt > graceMs && room.status === "open") {
        // leave empty seat reclaim only in open lobby
        room.seats[s.seat] = null;
      }
    }
  }
}
