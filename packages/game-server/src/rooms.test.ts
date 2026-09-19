import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  addBotToSeat,
  applyRoomCommand,
  createPlayVsBotsRoom,
  createRoom,
  fillEmptySeatsWithBots,
  joinRoom,
  projectRoomForSeat,
  runFourBotMatch,
  selectRealm,
  setRoomRuntimeConfig,
  uniqueRealmsComplete,
  type Room,
} from "./rooms.js";
import { randomUUID } from "node:crypto";
import type { Identity } from "@kv/contracts";

function guest(name: string): Identity {
  return { kind: "guest", displayName: name, sessionId: randomUUID() };
}

function cmd(room: Room, seat: number, action: Parameters<typeof applyRoomCommand>[4]) {
  return applyRoomCommand(room, seat, randomUUID(), Date.now(), action);
}

beforeEach(() => {
  setRoomRuntimeConfig({
    matchStartCountdownMs: 0,
    botActionDelayMs: 0,
    trickResolveDelayMs: 0,
    hunterSelectionTimeoutMs: 0,
    quickMatchBotFillAfterMs: 50,
    specialCardsEnabled: false,
  });
  vi.useRealTimers();
});

describe("lobby V2", () => {
  it("four humans + four realms auto-starts without Ready", async () => {
    const room = createRoom("private");
    for (let i = 0; i < 4; i++) {
      const j = joinRoom(room, guest(`P${i}`));
      expect("seat" in j).toBe(true);
      if ("seat" in j) {
        selectRealm(room, j.seat, ["carnivore", "herbivore", "bird", "reptile"][i] as never);
      }
    }
    expect(uniqueRealmsComplete(room)).toBe(true);
    await new Promise((r) => setTimeout(r, 30));
    expect(room.status).toBe("in_progress");
    // With hunterSelectionTimeoutMs=0, auto-select runs on next tick
    await new Promise((r) => setTimeout(r, 30));
    expect(room.game?.phase === "playing" || room.game?.hunterRealm).toBeTruthy();
    if (room.game?.phase === "playing") {
      expect(room.game.hunterRealm).toBeTruthy();
    }
  });

  it("rejects duplicate realm", () => {
    const room = createRoom("private");
    joinRoom(room, guest("A"));
    joinRoom(room, guest("B"));
    expect(selectRealm(room, 0, "bird").ok).toBe(true);
    expect(selectRealm(room, 1, "bird").ok).toBe(false);
  });

  it("auto-assigns missing realms when fourth joins", async () => {
    const room = createRoom("private");
    joinRoom(room, guest("A"), { preferredRealm: "carnivore" });
    joinRoom(room, guest("B"), { preferredRealm: "herbivore" });
    joinRoom(room, guest("C"));
    joinRoom(room, guest("D"));
    expect(uniqueRealmsComplete(room)).toBe(true);
    await new Promise((r) => setTimeout(r, 20));
    expect(room.status).toBe("in_progress");
  });

  it("Ready is rejected", () => {
    const room = createRoom("private");
    joinRoom(room, guest("A"));
    const r = cmd(room, 0, { type: "READY", seat: 0 } as never);
    expect(r.ok).toBe(false);
  });
});

describe("bots", () => {
  it("Play with Bots creates 1 human + 3 bots", async () => {
    const { room, seat } = createPlayVsBotsRoom(guest("Human"), "bird");
    expect(seat).toBe(0);
    expect(room.seats.filter((s) => s?.controllerType === "bot")).toHaveLength(3);
    expect(room.seats.filter((s) => s?.controllerType === "human")).toHaveLength(1);
    expect(uniqueRealmsComplete(room)).toBe(true);
    await new Promise((r) => setTimeout(r, 30));
    expect(room.status).toBe("in_progress");
  });

  it("private host fill bots", async () => {
    const room = createRoom("private");
    joinRoom(room, guest("Host"));
    fillEmptySeatsWithBots(room);
    expect(room.seats.filter(Boolean)).toHaveLength(4);
    await new Promise((r) => setTimeout(r, 30));
    expect(room.status).toBe("in_progress");
  });

  it("add bot to empty seat", () => {
    const room = createRoom("private");
    joinRoom(room, guest("Host"));
    expect(addBotToSeat(room, 2).ok).toBe(true);
    expect(room.seats[2]?.controllerType).toBe("bot");
  });

  it("bot projection never includes opponent card ids from other hands", async () => {
    const { room } = createPlayVsBotsRoom(guest("H"), "reptile");
    await new Promise((r) => setTimeout(r, 30));
    const view = projectRoomForSeat(room, 0);
    expect(view.game).toBeTruthy();
    const handIds = new Set(view.game!.yourHand.map((c) => c.instanceId));
    for (const id of view.game!.legalCardIds) {
      expect(handIds.has(id)).toBe(true);
    }
  });

  it("four-bot match completes", () => {
    const game = runFourBotMatch(99);
    expect(game.phase).toBe("match_complete");
    expect(game.matchWinnerTeam).not.toBeNull();
    expect(game.mvpParticipantIds.length).toBeGreaterThanOrEqual(1);
    const tricks = game.seatStats.reduce((a, s) => a + s.tricksWon, 0);
    expect(tricks).toBeGreaterThanOrEqual(7);
  });
});
