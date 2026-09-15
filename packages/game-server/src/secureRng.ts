import { createHash, randomBytes } from "node:crypto";
import type { RandomSource } from "@kv/game-core";

/**
 * Server-controlled RNG. Seed is never chosen by clients.
 */
export class SecureRandom implements RandomSource {
  next(): number {
    const buf = randomBytes(4);
    return buf.readUInt32BE(0) / 0x100000000;
  }
}

export function secureSeed(): number {
  return randomBytes(4).readUInt32BE(0);
}

export function auditSeedFingerprint(seed: number): string {
  return createHash("sha256").update(`kv-seed:${seed}`).digest("hex");
}
