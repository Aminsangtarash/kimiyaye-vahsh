import { describe, expect, it } from "vitest";
import { createRoom, joinRoom, applyRoomCommand, projectRoomForSeat } from "./rooms.js";
import type { Identity } from "@kv/contracts";
import { RateLimiter } from "./rateLimit.js";
import { MockRewardProvider, buildRewardEvent } from "./rewards.js";
import { verifyGameTicket, signGameTicket } from "./ticket.js";

const guest = (n: string): Identity => ({
  kind: "guest",
  displayName: n,
  sessionId: `sess-${n}-${Math.random()}`,
});

describe("security & recovery", () => {
  it("rejects unauthorized seat mismatch / out of turn via engine", () => {
    const room = createRoom("private");
    const seats: number[] = [];
    for (const name of ["A", "B", "C", "D"]) {
      const j = joinRoom(room, guest(name));
      if ("seat" in j) seats.push(j.seat);
    }
    for (const seat of seats) {
      applyRoomCommand(room, seat, `r-${seat}`, 1, { type: "READY", seat });
    }
    applyRoomCommand(room, seats[0], "start", 2, { type: "START_MATCH", seat: seats[0] });
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

  it("rejects fake card instance / illegal card", () => {
    const room = createRoom("private");
    const seats: number[] = [];
    for (const name of ["A", "B", "C", "D"]) {
      const j = joinRoom(room, guest(name));
      if ("seat" in j) seats.push(j.seat);
    }
    for (const seat of seats) applyRoomCommand(room, seat, `rdy-${seat}`, 1, { type: "READY", seat });
    applyRoomCommand(room, seats[0], "st", 2, { type: "START_MATCH", seat: seats[0] });
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
    const a = applyRoomCommand(room, seat, "same", 1, { type: "READY", seat });
    const b = applyRoomCommand(room, seat, "same", 2, { type: "READY", seat });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(b.duplicate).toBe(true);
  });

  it("projection never includes opponent hand cards", () => {
    const room = createRoom("private");
    const seats: number[] = [];
    for (const name of ["A", "B", "C", "D"]) {
      const j = joinRoom(room, guest(name));
      if ("seat" in j) seats.push(j.seat);
    }
    for (const seat of seats) applyRoomCommand(room, seat, `x-${seat}`, 1, { type: "READY", seat });
    applyRoomCommand(room, seats[0], "go", 2, { type: "START_MATCH", seat: seats[0] });
    const view = projectRoomForSeat(room, 0);
    expect(view.game?.yourHand.length).toBe(13);
    expect(JSON.stringify(view)).not.toContain(room.game!.hands[1][0].instanceId);
  });

  it("blocks join after match started for new sessions", () => {
    const room = createRoom("private");
    const seats: number[] = [];
    for (const name of ["A", "B", "C", "D"]) {
      const j = joinRoom(room, guest(name));
      if ("seat" in j) seats.push(j.seat);
    }
    for (const seat of seats) applyRoomCommand(room, seat, `y-${seat}`, 1, { type: "READY", seat });
    applyRoomCommand(room, seats[0], "go2", 2, { type: "START_MATCH", seat: seats[0] });
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

  it("rejects expired tickets", () => {
    const token = signGameTicket(
      { sub: "u", displayName: "U", iat: 1, exp: 2 },
      "test-secret-key-123456",
    );
    expect(verifyGameTicket(token, "test-secret-key-123456")).toBeNull();
  });

  it("rate limiter eventually blocks", () => {
    const lim = new RateLimiter(3, 0);
    expect(lim.allow("k")).toBe(true);
    expect(lim.allow("k")).toBe(true);
    expect(lim.allow("k")).toBe(true);
    expect(lim.allow("k")).toBe(false);
  });
});
