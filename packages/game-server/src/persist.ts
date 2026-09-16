import { appendFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

export interface MatchAuditAction {
  at: string;
  seat: number;
  type: string;
  commandId: string;
  summary: Record<string, unknown>;
}

export interface MatchRecord {
  matchId: string;
  roomId: string;
  roomCode: string;
  mode: string;
  participants: Array<{
    seat: number;
    team: number;
    kind: string;
    sessionIdHash: string;
    userId?: string;
    displayName: string;
    realm?: string;
    controllerType?: string;
  }>;
  seedHash: string;
  seed?: number;
  actions: MatchAuditAction[];
  tricks: Array<{
    winnerSeat: number;
    team: number;
    hunterRealmAfter?: string | null;
    /** @deprecated V1 Superior Suit — never interpret as Hunter Realm */
    superiorAfter?: string | null;
  }>;
  scores: { teamTricks: [number, number]; teamHands: [number, number] };
  result: {
    winnerTeam: number | null;
    surrender: boolean;
    mvpParticipantIds?: string[];
    participants?: unknown[];
    hasBots?: boolean;
    botSeatCount?: number;
  } | null;
  rewardStatus: "none" | "pending" | "submitted" | "skipped_guest";
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  hasBots?: boolean;
  botSeatCount?: number;
}

function dataDir(): string {
  const dir = process.env.KV_PERSIST_DIR || join(process.cwd(), ".data", "matches");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function hashSession(sessionId: string): string {
  return createHash("sha256").update(sessionId).digest("hex").slice(0, 16);
}

export function hashSeed(seed: number): string {
  return createHash("sha256").update(String(seed)).digest("hex");
}

export class MatchStore {
  private cache = new Map<string, MatchRecord>();

  create(partial: Omit<MatchRecord, "actions" | "tricks" | "updatedAt">): MatchRecord {
    const rec: MatchRecord = {
      ...partial,
      actions: [],
      tricks: [],
      updatedAt: partial.createdAt,
    };
    this.cache.set(rec.matchId, rec);
    this.flush(rec);
    return rec;
  }

  get(matchId: string): MatchRecord | undefined {
    if (this.cache.has(matchId)) return this.cache.get(matchId);
    const path = join(dataDir(), `${matchId}.json`);
    if (!existsSync(path)) return undefined;
    const rec = JSON.parse(readFileSync(path, "utf-8")) as MatchRecord;
    delete rec.seed;
    this.cache.set(matchId, rec);
    return rec;
  }

  appendAction(matchId: string, action: MatchAuditAction): void {
    const rec = this.cache.get(matchId);
    if (!rec) return;
    rec.actions.push(action);
    rec.updatedAt = action.at;
    this.flush(rec);
    this.appendLog(matchId, { kind: "action", ...action });
  }

  appendTrick(
    matchId: string,
    trick: {
      winnerSeat: number;
      team: number;
      hunterRealmAfter?: string | null;
      superiorAfter?: string | null;
    },
  ): void {
    const rec = this.cache.get(matchId);
    if (!rec) return;
    rec.tricks.push(trick);
    rec.updatedAt = new Date().toISOString();
    this.flush(rec);
  }

  updateScores(matchId: string, scores: MatchRecord["scores"]): void {
    const rec = this.cache.get(matchId);
    if (!rec) return;
    rec.scores = scores;
    rec.updatedAt = new Date().toISOString();
    this.flush(rec);
  }

  complete(
    matchId: string,
    result: MatchRecord["result"],
    rewardStatus: MatchRecord["rewardStatus"],
  ): void {
    const rec = this.cache.get(matchId);
    if (!rec) return;
    rec.result = result;
    rec.rewardStatus = rewardStatus;
    if (result?.hasBots !== undefined) rec.hasBots = result.hasBots;
    if (result?.botSeatCount !== undefined) rec.botSeatCount = result.botSeatCount;
    rec.completedAt = new Date().toISOString();
    rec.updatedAt = rec.completedAt;
    delete rec.seed;
    this.flush(rec);
  }

  private flush(rec: MatchRecord): void {
    writeFileSync(join(dataDir(), `${rec.matchId}.json`), JSON.stringify(rec, null, 2));
  }

  private appendLog(matchId: string, row: Record<string, unknown>): void {
    appendFileSync(join(dataDir(), `${matchId}.ndjson`), `${JSON.stringify(row)}\n`);
  }
}
