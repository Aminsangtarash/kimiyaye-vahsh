import { describe, expect, it, beforeEach } from "vitest";
import {
  createRoom,
  joinRoom,
  applyRoomCommand,
  projectRoomForSeat,
  selectRealm,
  setRoomRuntimeConfig,
  fillEmptySeatsWithBots,
} from "./rooms.js";
import type { Identity } from "@kv/contracts";
import { RateLimiter } from "./rateLimit.js";
import { MockRewardProvider, buildRewardEvent } from "./rewards.js";
import { verifyGameTicket, signGameTicket } from "./ticket.js";

const guest = (n: string): Identity => ({
  kind: "guest",
  displayName: n,
  sessionId: `sess-${n}-${Math.random()}`,
});

async function startFour(room: ReturnType<typeof createRoom>) {
  setRoomRuntimeConfig({ matchStartCountdownMs: 0, botActionDelayMs: 0, trickResolveDelayMs: 0 });
  const seats: number[] = [];
  const realms = ["carnivore", "herbivore", "bird", "reptile"] as const;
  for (let i = 0; i < 4; i++) {
    const j = joinRoom(room, guest(`P${i}`), { preferredRealm: realms[i] });
    if ("seat" in j) seats.push(j.seat);
  }
  await new Promise((r) => setTimeout(r, 25));
  return seats;
}

beforeEach(() => {
  setRoomRuntimeConfig({ matchStartCountdownMs: 0, botActionDelayMs: 0, trickResolveDelayMs: 0, specialCardsEnabled: false });
});

describe("security & recovery", () => {
  it("rejects out of turn play", async () => {
    const room = createRoom("private");
    await startFour(room);
    expect(room.game).toBeTruthy();
    const current = room.game!.currentPlayer;
    const other = (current + 1) % 4;
    const illegal = room.game!.hands[other][0];
    const r = applyRoomCommand(room, other, "bad-turn", 3, {
      type: "PLAY_CARD",
      seat: other,
      cardInstanceId: illegal.instanceId,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects fake card instance", async () => {
    const room = createRoom("private");
    await startFour(room);
    const seat = room.game!.currentPlayer;
    const r = applyRoomCommand(room, seat, "fake", 3, {
      type: "PLAY_CARD",
      seat,
      cardInstanceId: "totally-fake-id",
    });
    expect(r.ok).toBe(false);
  });

  it("duplicate command id is idempotent", () => {
    const room = createRoom("private");
    const j = joinRoom(room, guest("solo"));
    const seat = "seat" in j ? j.seat : 0;
    const a = applyRoomCommand(room, seat, "same", 1, {
      type: "SELECT_REALM",
      seat,
      realm: "bird",
    });
    const b = applyRoomCommand(room, seat, "same", 2, {
      type: "SELECT_REALM",
      seat,
      realm: "carnivore",
    });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(b.duplicate).toBe(true);
  });

  it("projection never includes opponent hand cards", async () => {
    const room = createRoom("private");
    await startFour(room);
    const view = projectRoomForSeat(room, 0);
    expect(view.game?.yourHand.length).toBe(13);
    expect(JSON.stringify(view)).not.toContain(room.game!.hands[1][0].instanceId);
  });

  it("blocks join after match started for new sessions", async () => {
    const room = createRoom("private");
    await startFour(room);
    const late = joinRoom(room, guest("intruder"));
    expect("error" in late).toBe(true);
  });

  it("reward provider is idempotent", async () => {
    const p = new MockRewardProvider();
    const ev = buildRewardEvent("m1", "u1", "win", "test-secret-key-123456");
    const a = await p.submit(ev);
    const b = await p.submit(ev);
    expect(a.ok).toBe(true);
    expect(b.duplicate).toBe(true);
  });

  it("expired ticket rejected", () => {
    const token = signGameTicket(
      { sub: "u", displayName: "x", exp: Math.floor(Date.now() / 1000) - 10, iat: 1 },
      "test-secret-key-123456",
    );
    expect(verifyGameTicket(token, "test-secret-key-123456")).toBeNull();
  });

  it("rate limiter blocks bursts", () => {
    const lim = new RateLimiter(2, 10);
    expect(lim.allow("k")).toBe(true);
    expect(lim.allow("k")).toBe(true);
    expect(lim.allow("k")).toBe(false);
  });

  it("selectRealm works for uniqueness", () => {
    const room = createRoom("private");
    joinRoom(room, guest("A"));
    joinRoom(room, guest("B"));
    expect(selectRealm(room, 0, "bird").ok).toBe(true);
    expect(selectRealm(room, 1, "bird").ok).toBe(false);
  });

  it("fill bots sets hasBots metadata path", async () => {
    const room = createRoom("private");
    joinRoom(room, guest("Host"));
    fillEmptySeatsWithBots(room);
    await new Promise((r) => setTimeout(r, 30));
    expect(room.status).toBe("in_progress");
    expect(room.seats.filter((s) => s?.controllerType === "bot").length).toBe(3);
  });
});
