import { createHmac, randomUUID } from "node:crypto";
import type { RewardEvent } from "@kv/contracts";

export interface RewardProvider {
  submit(event: RewardEvent): Promise<{ ok: boolean; duplicate?: boolean }>;
}

/** In-memory idempotency for local dev */
export class MockRewardProvider implements RewardProvider {
  private seen = new Set<string>();

  async submit(event: RewardEvent): Promise<{ ok: boolean; duplicate?: boolean }> {
    if (this.seen.has(event.eventId)) return { ok: true, duplicate: true };
    this.seen.add(event.eventId);
    return { ok: true };
  }
}

export function buildRewardEvent(
  matchId: string,
  userId: string,
  teamResult: "win" | "loss",
  secret: string,
): RewardEvent {
  const event: RewardEvent = {
    eventId: randomUUID(),
    matchId,
    userId,
    teamResult,
    createdAt: new Date().toISOString(),
  };
  const body = `${event.eventId}|${event.matchId}|${event.userId}|${event.teamResult}|${event.createdAt}`;
  event.signature = createHmac("sha256", secret).update(body).digest("hex");
  return event;
}
