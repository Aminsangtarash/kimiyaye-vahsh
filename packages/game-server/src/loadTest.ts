/**
 * Local load smoke: N rooms × 4 bots playing heuristic cards.
 * Not a production capacity claim.
 */
process.env.KV_QUIET = "1";
process.env.KV_PERSIST_DIR = process.env.KV_PERSIST_DIR || ".data/load-tmp";

import { createRoom, joinRoom, applyRoomCommand } from "./rooms.js";
import type { Identity } from "@kv/contracts";
import { legalAnimalPlays } from "@kv/game-core";

const guest = (n: string): Identity => ({
  kind: "guest",
  displayName: n,
  sessionId: `load-${n}`,
});

function playRoom(seedLabel: string): { ok: boolean; ms: number; error?: string } {
  const t0 = Date.now();
  const room = createRoom("private");
  const seats: number[] = [];
  for (let i = 0; i < 4; i++) {
    const j = joinRoom(room, guest(`${seedLabel}-${i}`));
    if ("error" in j) return { ok: false, ms: Date.now() - t0, error: j.error };
    seats.push(j.seat);
  }
  for (const seat of seats) {
    applyRoomCommand(room, seat, `${seedLabel}-rdy-${seat}`, 1, { type: "READY", seat });
  }
  const start = applyRoomCommand(room, seats[0], `${seedLabel}-start`, 2, {
    type: "START_MATCH",
    seat: seats[0],
  });
  if (!start.ok) return { ok: false, ms: Date.now() - t0, error: start.error };

  let seq = 3;
  let safety = 800;
  while (room.game && room.game.phase === "playing" && safety-- > 0) {
    const seat = room.game.currentPlayer;
    if (room.game.pendingSpecial) {
      const r = applyRoomCommand(room, seat, `${seedLabel}-pass-${seq}`, seq++, {
        type: "PASS_SPECIAL",
        seat,
      });
      if (!r.ok) return { ok: false, ms: Date.now() - t0, error: r.error };
      continue;
    }
    const legal = legalAnimalPlays(room.game, seat);
    if (!legal.length) break;
    const r = applyRoomCommand(room, seat, `${seedLabel}-play-${seq}`, seq++, {
      type: "PLAY_CARD",
      seat,
      cardInstanceId: legal[0].instanceId,
    });
    if (!r.ok) return { ok: false, ms: Date.now() - t0, error: r.error };
  }
  return { ok: true, ms: Date.now() - t0 };
}

const ROOMS = Number(process.env.KV_LOAD_ROOMS || 50);
const results: Array<{ ok: boolean; ms: number; error?: string }> = [];
const t0 = Date.now();
for (let i = 0; i < ROOMS; i++) {
  results.push(playRoom(`r${i}`));
}
const totalMs = Date.now() - t0;
const errors = results.filter((r) => !r.ok);
const latencies = results.map((r) => r.ms).sort((a, b) => a - b);
const mem = process.memoryUsage();

console.log(
  JSON.stringify(
    {
      rooms: ROOMS,
      usersSimulated: ROOMS * 4,
      errors: errors.length,
      errorSamples: errors.slice(0, 5),
      totalMs,
      latencyMs: {
        p50: latencies[Math.floor(latencies.length * 0.5)],
        p95: latencies[Math.floor(latencies.length * 0.95)],
        max: latencies[latencies.length - 1],
      },
      memory: {
        rssMB: Math.round(mem.rss / 1024 / 1024),
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      },
      note: "Laptop local benchmark — not production capacity.",
    },
    null,
    2,
  ),
);

process.exit(errors.length ? 1 : 0);
