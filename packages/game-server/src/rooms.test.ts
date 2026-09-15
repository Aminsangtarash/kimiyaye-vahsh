import { describe, expect, it } from "vitest";
import { createRoom, joinRoom, applyRoomCommand } from "./rooms.js";
import type { Identity } from "@kv/contracts";

const guest = (n: string): Identity => ({
  kind: "guest",
  displayName: n,
  sessionId: `sess-${n}`,
});

describe("room lifecycle", () => {
  it("four players ready and start match", () => {
    const room = createRoom("private");
    const seats: number[] = [];
    for (const name of ["A", "B", "C", "D"]) {
      const j = joinRoom(room, guest(name));
      expect("error" in j).toBe(false);
      if ("seat" in j) seats.push(j.seat);
    }
    for (const seat of seats) {
      const r = applyRoomCommand(room, seat, `cmd-ready-${seat}`, 1, { type: "READY", seat });
      expect(r.ok).toBe(true);
    }
    const start = applyRoomCommand(room, seats[0], "cmd-start", 2, {
      type: "START_MATCH",
      seat: seats[0],
    });
    expect(start.ok).toBe(true);
    expect(start.room.game?.phase).toBe("playing");
    expect(start.room.game?.hands.every((h) => h.length === 13)).toBe(true);
  });

  it("rejects duplicate command id", () => {
    const room = createRoom("private");
    const j = joinRoom(room, guest("A"));
    const seat = "seat" in j ? j.seat : 0;
    applyRoomCommand(room, seat, "dup", 1, { type: "READY", seat });
    const again = applyRoomCommand(room, seat, "dup", 2, { type: "READY", seat });
    expect(again.ok).toBe(true);
  });
});
