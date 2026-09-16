import { randomUUID } from "node:crypto";
import {
  ALL_ANIMAL_REALMS,
  SEATS,
  TEAM_BY_SEAT,
  type AnimalRealm,
  type ControllerType,
  type Identity,
  type LobbyPhase,
  type RoomMode,
} from "@kv/contracts";
import {
  applyAction,
  buildMatchParticipants,
  createInitialState,
  projectForSeat,
  SeededRandom,
  type GameAction,
  type GameState,
} from "@kv/game-core";
import { balancedStrategy } from "./bot/balanced.js";
import { hashSeed, hashSession, MatchStore, type MatchRecord } from "./persist.js";
import { secureSeed } from "./secureRng.js";
import { log } from "./logger.js";

export type RoomCommand =
  | { type: "SELECT_REALM"; seat: number; realm: AnimalRealm }
  | { type: "ADD_BOT"; seat: number; targetSeat?: number }
  | { type: "FILL_BOTS"; seat: number }
  | { type: "REMOVE_BOT"; seat: number; targetSeat: number }
  | { type: "READY"; seat: number }
  | { type: "START_MATCH"; seat: number }
  | GameAction;

export type RoomStatus = "open" | "starting" | "in_progress" | "completed" | "expired";

export interface SeatAssignment {
  seat: number;
  identity: Identity;
  controllerType: ControllerType;
  /** Original human identity when bot took over after disconnect */
  ownerIdentity: Identity | null;
  realm: AnimalRealm | null;
  connected: boolean;
  lastSeenAt: number;
  processedCommandIds: Set<string>;
  clientSeq: number;
  botActing: boolean;
}

export interface Room {
  roomId: string;
  code: string;
  mode: RoomMode;
  status: RoomStatus;
  lobbyPhase: LobbyPhase;
  createdAt: number;
  expiresAt: number;
  seats: (SeatAssignment | null)[];
  hostSeat: number | null;
  game: GameState | null;
  stateVersion: number;
  lastCommandAt: number;
  matchRecordId: string | null;
  countdownEndsAt: number | null;
  countdownTimer: ReturnType<typeof setTimeout> | null;
  quickMatchBotFillAt: number | null;
  startingLock: boolean;
}

export interface RoomRuntimeConfig {
  matchStartCountdownMs: number;
  quickMatchBotFillAfterMs: number;
  botActionDelayMs: number;
  /** How long completed tricks stay visible before collect (ms). */
  trickResolveDelayMs: number;
  specialCardsEnabled: boolean;
  impact: {
    trickWon: number;
    successfulSpecial: number;
    legendaryCounter: number;
    teamAssist: number;
    humanTimeout: number;
  };
  reconnectGraceMs: number;
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const matchStore = new MatchStore();

let runtimeConfig: RoomRuntimeConfig = {
  matchStartCountdownMs: 3000,
  quickMatchBotFillAfterMs: 45000,
  botActionDelayMs: 0,
  trickResolveDelayMs: 2000,
  specialCardsEnabled: false,
  impact: {
    trickWon: 10,
    successfulSpecial: 10,
    legendaryCounter: 20,
    teamAssist: 10,
    humanTimeout: -5,
  },
  reconnectGraceMs: 60000,
};

export function setRoomRuntimeConfig(partial: Partial<RoomRuntimeConfig>): void {
  runtimeConfig = { ...runtimeConfig, ...partial, impact: { ...runtimeConfig.impact, ...(partial.impact ?? {}) } };
}

export function getRoomRuntimeConfig(): RoomRuntimeConfig {
  return runtimeConfig;
}

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

export function createRoom(mode: RoomMode): Room {
  const now = Date.now();
  return {
    roomId: randomUUID(),
    code: generateRoomCode(),
    mode,
    status: "open",
    lobbyPhase: "WAITING_FOR_PLAYERS",
    createdAt: now,
    expiresAt: now + 2 * 60 * 60 * 1000,
    seats: [null, null, null, null],
    hostSeat: null,
    game: null,
    stateVersion: 0,
    lastCommandAt: now,
    matchRecordId: null,
    countdownEndsAt: null,
    countdownTimer: null,
    quickMatchBotFillAt: mode === "quick" ? now + runtimeConfig.quickMatchBotFillAfterMs : null,
    startingLock: false,
  };
}

function botIdentity(seat: number): Identity {
  return {
    kind: "guest",
    displayName: `ربات ${seat + 1}`,
    sessionId: `bot-${randomUUID()}`,
  };
}

export function findEmptySeat(room: Room): number | null {
  const idx = room.seats.findIndex((s) => s === null);
  return idx >= 0 ? idx : null;
}

export function occupiedCount(room: Room): number {
  return room.seats.filter(Boolean).length;
}

export function takenRealms(room: Room): Set<AnimalRealm> {
  return new Set(room.seats.map((s) => s?.realm).filter(Boolean) as AnimalRealm[]);
}

export function autoAssignMissingRealms(room: Room): void {
  const free = ALL_ANIMAL_REALMS.filter((r) => !takenRealms(room).has(r));
  let i = 0;
  for (const s of room.seats) {
    if (s && !s.realm && i < free.length) {
      s.realm = free[i++];
    }
  }
}

export function uniqueRealmsComplete(room: Room): boolean {
  if (occupiedCount(room) < SEATS) return false;
  const realms = room.seats.map((s) => s!.realm);
  if (realms.some((r) => !r)) return false;
  return new Set(realms).size === 4;
}

function clearCountdown(room: Room): void {
  if (room.countdownTimer) {
    clearTimeout(room.countdownTimer);
    room.countdownTimer = null;
  }
  room.countdownEndsAt = null;
  room.startingLock = false;
  if (room.status === "starting") {
    room.status = "open";
    room.lobbyPhase = occupiedCount(room) < 4 ? "WAITING_FOR_PLAYERS" : "WAITING_FOR_REALMS";
  }
}

export type StartMatchCallback = (room: Room) => void;

let onRoomBroadcast: ((room: Room) => void) | null = null;
let onMatchStarted: StartMatchCallback | null = null;

export function setRoomCallbacks(opts: {
  broadcast?: (room: Room) => void;
  matchStarted?: StartMatchCallback;
}): void {
  onRoomBroadcast = opts.broadcast ?? onRoomBroadcast;
  onMatchStarted = opts.matchStarted ?? onMatchStarted;
}

function broadcast(room: Room): void {
  onRoomBroadcast?.(room);
}

export function tryBeginCountdown(room: Room, startMatchNow?: boolean): void {
  if (room.status === "in_progress" || room.status === "completed") return;
  if (occupiedCount(room) < SEATS) {
    room.lobbyPhase = "WAITING_FOR_PLAYERS";
    return;
  }
  autoAssignMissingRealms(room);
  if (!uniqueRealmsComplete(room)) {
    room.lobbyPhase = "WAITING_FOR_REALMS";
    return;
  }
  if (room.startingLock || room.status === "starting") return;

  room.lobbyPhase = "STARTING";
  room.status = "starting";
  room.startingLock = true;
  const ms = startMatchNow ? 0 : runtimeConfig.matchStartCountdownMs;
  room.countdownEndsAt = Date.now() + ms;
  room.stateVersion += 1;
  broadcast(room);

  room.countdownTimer = setTimeout(() => {
    room.countdownTimer = null;
    if (!uniqueRealmsComplete(room) || occupiedCount(room) < SEATS) {
      clearCountdown(room);
      broadcast(room);
      return;
    }
    beginMatch(room);
  }, ms);
}

function beginMatch(room: Room): void {
  if (room.status === "in_progress") return;
  const realms = room.seats.map((s) => s!.realm!) as AnimalRealm[];
  const seed = secureSeed();
  room.game = createInitialState(room.roomId, seed, {
    specialCardsEnabled: runtimeConfig.specialCardsEnabled,
    impact: { ...runtimeConfig.impact },
  }, realms);
  const r = applyAction(room.game, { type: "START_MATCH" }, undefined, new SeededRandom(seed));
  if (!r.ok) {
    clearCountdown(room);
    return;
  }
  room.game = r.state;
  room.status = "in_progress";
  room.lobbyPhase = "IN_MATCH";
  room.countdownEndsAt = null;
  room.startingLock = false;
  room.stateVersion = room.game.stateVersion;
  room.matchRecordId = room.roomId;
  beginMatchRecord(room, seed);
  matchStore.appendAction(room.roomId, {
    at: new Date().toISOString(),
    seat: room.hostSeat ?? 0,
    type: "START_MATCH",
    commandId: randomUUID(),
    summary: { seedHash: hashSeed(seed), realms },
  });
  log("info", "match_started", { matchId: room.roomId, roomId: room.roomId, event: "start" });
  broadcast(room);
  onMatchStarted?.(room);
  scheduleBotTurns(room);
}

function beginMatchRecord(room: Room, seed: number): MatchRecord {
  const createdAt = new Date().toISOString();
  const botSeatCount = room.seats.filter((s) => s?.controllerType === "bot").length;
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
      realm: s!.realm!,
      controllerType: s!.controllerType,
    })),
    seedHash: hashSeed(seed),
    seed,
    scores: { teamTricks: [0, 0], teamHands: [0, 0] },
    result: null,
    rewardStatus: "none",
    createdAt,
    hasBots: botSeatCount > 0,
    botSeatCount,
  });
}

export function joinRoom(
  room: Room,
  identity: Identity,
  opts?: { preferredRealm?: AnimalRealm },
): { seat: number } | { error: string } {
  if (room.status === "completed" || room.status === "expired") return { error: "Room closed" };
  if (Date.now() > room.expiresAt) {
    room.status = "expired";
    return { error: "Room expired" };
  }
  const existing = room.seats.findIndex(
    (s) =>
      s?.identity.sessionId === identity.sessionId ||
      s?.ownerIdentity?.sessionId === identity.sessionId,
  );
  if (existing >= 0) {
    const seat = room.seats[existing]!;
    // Human reclaim at safe boundary
    if (seat.ownerIdentity?.sessionId === identity.sessionId || seat.identity.sessionId === identity.sessionId) {
      if (seat.controllerType === "bot" && seat.ownerIdentity) {
        if (!seat.botActing) {
          seat.controllerType = "human";
          seat.identity = identity;
          seat.ownerIdentity = null;
        }
        // if botActing, reclaim after action (checked in scheduleBotTurns completion)
        else {
          seat.ownerIdentity = { ...identity };
        }
      } else {
        seat.identity = identity;
        seat.controllerType = "human";
      }
      seat.connected = true;
      seat.lastSeenAt = Date.now();
      return { seat: existing };
    }
  }
  if (room.status === "in_progress" || room.status === "starting") {
    return { error: "Match already started" };
  }
  const seat = findEmptySeat(room);
  if (seat === null) return { error: "Room full" };

  let realm: AnimalRealm | null = null;
  if (opts?.preferredRealm && !takenRealms(room).has(opts.preferredRealm)) {
    realm = opts.preferredRealm;
  }

  room.seats[seat] = {
    seat,
    identity,
    controllerType: "human",
    ownerIdentity: null,
    realm,
    connected: true,
    lastSeenAt: Date.now(),
    processedCommandIds: new Set(),
    clientSeq: -1,
    botActing: false,
  };
  if (room.hostSeat === null) room.hostSeat = seat;
  room.stateVersion += 1;
  tryBeginCountdown(room);
  return { seat };
}

export function addBotToSeat(room: Room, targetSeat?: number): { ok: boolean; error?: string } {
  if (room.status === "in_progress" || room.status === "completed") {
    return { ok: false, error: "Match in progress" };
  }
  const seat = targetSeat ?? findEmptySeat(room);
  if (seat === null || room.seats[seat]) return { ok: false, error: "No empty seat" };
  const free = ALL_ANIMAL_REALMS.filter((r) => !takenRealms(room).has(r));
  room.seats[seat] = {
    seat,
    identity: botIdentity(seat),
    controllerType: "bot",
    ownerIdentity: null,
    realm: free[0] ?? null,
    connected: true,
    lastSeenAt: Date.now(),
    processedCommandIds: new Set(),
    clientSeq: -1,
    botActing: false,
  };
  if (room.hostSeat === null) room.hostSeat = seat;
  room.stateVersion += 1;
  tryBeginCountdown(room);
  return { ok: true };
}

export function fillEmptySeatsWithBots(room: Room): void {
  while (findEmptySeat(room) !== null) {
    const r = addBotToSeat(room);
    if (!r.ok) break;
  }
}

export function removeBot(room: Room, targetSeat: number): { ok: boolean; error?: string } {
  if (room.status === "starting" || room.status === "in_progress") {
    return { ok: false, error: "Cannot remove during start/match" };
  }
  const s = room.seats[targetSeat];
  if (!s || s.controllerType !== "bot") return { ok: false, error: "Not a bot seat" };
  clearCountdown(room);
  room.seats[targetSeat] = null;
  room.stateVersion += 1;
  return { ok: true };
}

export function selectRealm(room: Room, seat: number, realm: AnimalRealm): { ok: boolean; error?: string } {
  if (room.status === "starting" || room.status === "in_progress") {
    return { ok: false, error: "Realms locked" };
  }
  const s = room.seats[seat];
  if (!s) return { ok: false, error: "Not seated" };
  if (s.controllerType !== "human") return { ok: false, error: "Bot realm auto-managed" };
  const taken = takenRealms(room);
  if (s.realm) taken.delete(s.realm);
  if (taken.has(realm)) return { ok: false, error: "Realm taken" };
  s.realm = realm;
  room.stateVersion += 1;
  tryBeginCountdown(room);
  return { ok: true };
}

export function handleDisconnect(room: Room, sessionId: string): void {
  const seat = room.seats.findIndex(
    (s) => s?.identity.sessionId === sessionId || s?.ownerIdentity?.sessionId === sessionId,
  );
  if (seat < 0) return;
  const s = room.seats[seat]!;
  s.connected = false;
  s.lastSeenAt = Date.now();

  if (room.status === "starting") {
    if (s.controllerType === "human") {
      clearCountdown(room);
      room.seats[seat] = null;
      room.stateVersion += 1;
      broadcast(room);
    }
    return;
  }

  if (room.status === "open") {
    // leave seat; QM may refill
    room.seats[seat] = null;
    room.stateVersion += 1;
    clearCountdown(room);
    broadcast(room);
  }
}

export function maybeBotTakeover(room: Room): void {
  if (room.status !== "in_progress" || !room.game) return;
  const grace = runtimeConfig.reconnectGraceMs;
  const now = Date.now();
  for (const s of room.seats) {
    if (!s || s.controllerType !== "human") continue;
    if (s.connected) continue;
    if (now - s.lastSeenAt < grace) continue;
    s.ownerIdentity = s.identity;
    s.controllerType = "bot";
    s.identity = { ...botIdentity(s.seat), displayName: `${s.ownerIdentity.displayName} (ربات)` };
    s.connected = true;
    room.stateVersion += 1;
  }
}

export function applyQuickMatchBotFill(room: Room): void {
  if (room.mode !== "quick") return;
  if (room.status !== "open") return;
  if (!room.quickMatchBotFillAt || Date.now() < room.quickMatchBotFillAt) return;
  fillEmptySeatsWithBots(room);
  room.quickMatchBotFillAt = null;
  tryBeginCountdown(room);
  broadcast(room);
}

export function roomLobbyView(room: Room) {
  const botFillIn =
    room.mode === "quick" && room.quickMatchBotFillAt
      ? Math.max(0, room.quickMatchBotFillAt - Date.now())
      : null;
  return {
    roomId: room.roomId,
    code: room.code,
    mode: room.mode,
    status: room.status,
    lobbyPhase: room.lobbyPhase,
    countdownEndsAt: room.countdownEndsAt,
    countdownMsRemaining: room.countdownEndsAt ? Math.max(0, room.countdownEndsAt - Date.now()) : null,
    quickMatchBotFillMsRemaining: botFillIn,
    availableRealms: ALL_ANIMAL_REALMS.filter((r) => !takenRealms(room).has(r)),
    seats: room.seats.map((s, seat) =>
      s
        ? {
            seat,
            displayName: s.identity.displayName,
            team: TEAM_BY_SEAT[seat],
            connected: s.connected,
            kind: s.identity.kind,
            controllerType: s.controllerType,
            realm: s.realm,
          }
        : null,
    ),
    hostSeat: room.hostSeat,
  };
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
  assignment.clientSeq = clientSeq;
  assignment.processedCommandIds.add(commandId);
  if (assignment.processedCommandIds.size > 500) {
    assignment.processedCommandIds = new Set([...assignment.processedCommandIds].slice(-200));
  }
  assignment.lastSeenAt = Date.now();
  room.lastCommandAt = Date.now();

  if (action.type === "SELECT_REALM") {
    const r = selectRealm(room, seat, action.realm);
    return { ok: r.ok, error: r.error, room };
  }
  if (action.type === "ADD_BOT") {
    if (room.hostSeat !== seat) return { ok: false, error: "Host only", room };
    const r = addBotToSeat(room, action.targetSeat);
    return { ok: r.ok, error: r.error, room };
  }
  if (action.type === "FILL_BOTS") {
    if (room.hostSeat !== seat) return { ok: false, error: "Host only", room };
    fillEmptySeatsWithBots(room);
    return { ok: true, room };
  }
  if (action.type === "REMOVE_BOT") {
    if (room.hostSeat !== seat) return { ok: false, error: "Host only", room };
    const r = removeBot(room, action.targetSeat);
    return { ok: r.ok, error: r.error, room };
  }
  if (action.type === "READY" || action.type === "START_MATCH") {
    return { ok: false, error: "V2 uses auto-start (Ready removed)", room };
  }

  if (!room.game) return { ok: false, error: "Match not started", room };
  if (assignment.controllerType === "bot" && !assignment.botActing) {
    return { ok: false, error: "Seat controlled by bot", room };
  }
  if ("seat" in action && action.seat !== seat) {
    return { ok: false, error: "Seat mismatch", room };
  }

  const r = applyAction(room.game, action as GameAction);
  if (!r.ok) return { ok: false, error: r.error, room };
  room.game = r.state;
  room.stateVersion = room.game.stateVersion;
  persistProgress(room, seat, commandId, action, r.events);

  if (room.game.phase === "resolving_trick") {
    scheduleTrickResolve(room);
    return { ok: true, room };
  }

  if (room.game.phase === "match_complete") {
    finalizeMatch(room);
  } else {
    scheduleBotTurns(room);
  }
  return { ok: true, room };
}

function persistProgress(
  room: Room,
  seat: number,
  commandId: string,
  action: RoomCommand,
  events: { type: string; winnerSeat?: number; team?: number; nextHunterRealm?: string }[] | undefined,
): void {
  if (!room.matchRecordId || !room.game) return;
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
  for (const ev of events ?? []) {
    if (ev.type === "trick_won" && ev.winnerSeat !== undefined) {
      matchStore.appendTrick(room.matchRecordId, {
        winnerSeat: ev.winnerSeat,
        team: ev.team ?? 0,
        hunterRealmAfter: ev.nextHunterRealm ?? room.game.hunterRealm,
        /** @deprecated historical field — do not treat as Hunter Realm for V1 records */
        superiorAfter: null,
      });
    }
  }
}

function finalizeMatch(room: Room): void {
  room.status = "completed";
  room.lobbyPhase = "COMPLETED";
  if (!room.matchRecordId || !room.game) return;
  const controllers = room.seats.map((s) => s?.controllerType ?? "human") as Array<"human" | "bot">;
  const botSeatCount = controllers.filter((c) => c === "bot").length;
  const participants = buildMatchParticipants(room.game, controllers);
  matchStore.complete(
    room.matchRecordId,
    {
      winnerTeam: room.game.matchWinnerTeam,
      surrender: room.game.surrenderTeam !== null,
      mvpParticipantIds: room.game.mvpParticipantIds,
      participants,
      hasBots: botSeatCount > 0,
      botSeatCount,
    },
    botSeatCount > 0 ? "skipped_guest" : "pending",
  );
}

function sanitizeActionSummary(action: RoomCommand): Record<string, unknown> {
  if (action.type === "PLAY_CARD") {
    return { cardInstanceId: action.cardInstanceId };
  }
  if (action.type === "SELECT_REALM") return { realm: action.realm };
  return { type: action.type };
}

const botTimers = new Map<string, ReturnType<typeof setTimeout>>();
const trickResolveTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleTrickResolve(room: Room): void {
  if (!room.game || room.game.phase !== "resolving_trick") return;
  const existing = trickResolveTimers.get(room.roomId);
  if (existing) clearTimeout(existing);
  const delay = runtimeConfig.trickResolveDelayMs;
  const run = () => {
    trickResolveTimers.delete(room.roomId);
    if (!room.game || room.game.phase !== "resolving_trick") return;
    const r = applyAction(room.game, { type: "RESOLVE_TRICK" });
    if (!r.ok) return;
    room.game = r.state;
    room.stateVersion = room.game.stateVersion;
    if (room.matchRecordId) {
      persistProgress(room, room.game.lastTrickWinner ?? 0, `resolve-${room.stateVersion}`, { type: "RESOLVE_TRICK" } as RoomCommand, r.events);
    }
    if (room.game.phase === "match_complete") {
      finalizeMatch(room);
    } else {
      // Let clients finish the collect animation before bots lead the next trick.
      const botPause = Math.max(runtimeConfig.botActionDelayMs, 900);
      setTimeout(() => scheduleBotTurns(room), botPause);
    }
    broadcast(room);
  };
  if (delay <= 0) {
    run();
    return;
  }
  trickResolveTimers.set(room.roomId, setTimeout(run, delay));
}

export function scheduleBotTurns(room: Room): void {
  if (!room.game || room.game.phase !== "playing") return;
  maybeBotTakeover(room);
  const seat = room.game.currentPlayer;
  const assignment = room.seats[seat];
  if (!assignment || assignment.controllerType !== "bot") return;
  if (assignment.botActing) return;

  const key = `${room.roomId}:${seat}:${room.game.stateVersion}`;
  if (botTimers.has(key)) return;

  assignment.botActing = true;
  const delay = runtimeConfig.botActionDelayMs;
  const t = setTimeout(() => {
    botTimers.delete(key);
    runBotAction(room, seat);
  }, delay);
  botTimers.set(key, t);
}

function runBotAction(room: Room, seat: number): void {
  const assignment = room.seats[seat];
  if (!assignment || !room.game) {
    if (assignment) assignment.botActing = false;
    return;
  }
  if (room.game.currentPlayer !== seat || room.game.phase !== "playing") {
    assignment.botActing = false;
    // pending human reclaim
    if (assignment.ownerIdentity && assignment.controllerType === "bot") {
      assignment.controllerType = "human";
      assignment.identity = assignment.ownerIdentity;
      assignment.ownerIdentity = null;
    }
    return;
  }

  const view = projectForSeat(room.game, seat);
  const intent = balancedStrategy.chooseAction(view, () => Math.random());
  assignment.botActing = false;

  if (assignment.ownerIdentity) {
    // reclaim after this decision submitted — apply action first as bot then switch
  }

  if (!intent) return;
  const commandId = randomUUID();
  let action: GameAction;
  if (intent.type === "PLAY_CARD") {
    action = { type: "PLAY_CARD", seat, cardInstanceId: intent.cardInstanceId };
  } else if (intent.type === "PASS_SPECIAL") {
    action = { type: "PASS_SPECIAL", seat };
  } else {
    action = { type: "SURRENDER", seat };
  }

  assignment.botActing = true;
  const r = applyAction(room.game, action);
  assignment.botActing = false;
  if (!r.ok) {
    // fallback: pass special or lowest card already chosen — try first legal
    const legal = view.legalCardIds;
    if (legal[0]) {
      const r2 = applyAction(room.game, { type: "PLAY_CARD", seat, cardInstanceId: legal[0] });
      if (r2.ok) {
        room.game = r2.state;
        room.stateVersion = room.game.stateVersion;
        persistProgress(room, seat, commandId, action, r2.events);
      }
    }
  } else {
    room.game = r.state;
    room.stateVersion = room.game.stateVersion;
    persistProgress(room, seat, commandId, action, r.events);
  }

  if (assignment.ownerIdentity) {
    assignment.controllerType = "human";
    assignment.identity = assignment.ownerIdentity;
    assignment.ownerIdentity = null;
  }

  if (room.game.phase === "match_complete") {
    finalizeMatch(room);
  } else if (room.game.phase === "resolving_trick") {
    scheduleTrickResolve(room);
  } else {
    scheduleBotTurns(room);
  }
  broadcast(room);
}

/** Headless: 4 bots complete a match (regression). */
export function runFourBotMatch(seed = 42): GameState {
  setRoomRuntimeConfig({ botActionDelayMs: 0, matchStartCountdownMs: 0, trickResolveDelayMs: 0 });
  const room = createRoom("bots");
  for (let i = 0; i < 4; i++) addBotToSeat(room);
  autoAssignMissingRealms(room);
  const realms = room.seats.map((s) => s!.realm!) as AnimalRealm[];
  let game = createInitialState(room.roomId, seed, { specialCardsEnabled: false }, realms);
  let r = applyAction(game, { type: "START_MATCH" }, undefined, new SeededRandom(seed));
  game = r.state;
  let safety = 5000;
  while (game.phase !== "match_complete" && safety-- > 0) {
    if (game.phase === "resolving_trick") {
      r = applyAction(game, { type: "RESOLVE_TRICK" });
      if (!r.ok) break;
      game = r.state;
      continue;
    }
    if (game.phase !== "playing") break;
    const seat = game.currentPlayer;
    const view = projectForSeat(game, seat);
    const intent = balancedStrategy.chooseAction(view, () => {
      return ((game.stateVersion * 17 + seat * 13) % 1000) / 1000;
    });
    if (!intent || intent.type !== "PLAY_CARD") {
      if (intent?.type === "PASS_SPECIAL") {
        r = applyAction(game, { type: "PASS_SPECIAL", seat });
      } else break;
    } else {
      r = applyAction(game, { type: "PLAY_CARD", seat, cardInstanceId: intent.cardInstanceId });
    }
    if (!r.ok) {
      const legal = view.legalCardIds[0];
      if (!legal) break;
      r = applyAction(game, { type: "PLAY_CARD", seat, cardInstanceId: legal });
    }
    game = r.state;
  }
  return game;
}

export function projectRoomForSeat(room: Room, seat: number) {
  const lobby = roomLobbyView(room);
  if (!room.game) {
    return { lobby, game: null, matchResult: null };
  }
  const controllers = room.seats.map((s) => s?.controllerType ?? "human") as Array<"human" | "bot">;
  const matchResult =
    room.game.phase === "match_complete"
      ? {
          winningTeamId: room.game.matchWinnerTeam,
          participants: buildMatchParticipants(room.game, controllers),
          mvpParticipantIds: room.game.mvpParticipantIds,
          hasBots: controllers.some((c) => c === "bot"),
          botSeatCount: controllers.filter((c) => c === "bot").length,
        }
      : null;
  return {
    lobby,
    game: {
      ...projectForSeat(room.game, seat),
      controllers,
    },
    matchResult,
  };
}

export function expireStaleRooms(rooms: Map<string, Room>, graceMs: number): void {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (now > room.expiresAt && room.status === "open") room.status = "expired";
    for (const s of room.seats) {
      if (s && !s.connected && now - s.lastSeenAt > graceMs && room.status === "open") {
        room.seats[s.seat] = null;
      }
    }
    applyQuickMatchBotFill(room);
    maybeBotTakeover(room);
  }
}

export function createPlayVsBotsRoom(identity: Identity, preferredRealm?: AnimalRealm): { room: Room; seat: number } {
  const room = createRoom("bots");
  const joined = joinRoom(room, identity, { preferredRealm });
  if ("error" in joined) throw new Error(joined.error);
  fillEmptySeatsWithBots(room);
  autoAssignMissingRealms(room);
  tryBeginCountdown(room);
  return { room, seat: joined.seat };
}
