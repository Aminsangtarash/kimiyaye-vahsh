/** Simple token-bucket rate limiter per key (session / IP). */
export class RateLimiter {
  private buckets = new Map<string, { tokens: number; updatedAt: number }>();

  constructor(
    private readonly maxTokens: number,
    private readonly refillPerSec: number,
  ) {}

  allow(key: string): boolean {
    const now = Date.now();
    let b = this.buckets.get(key);
    if (!b) {
      b = { tokens: this.maxTokens, updatedAt: now };
      this.buckets.set(key, b);
    }
    const elapsed = (now - b.updatedAt) / 1000;
    b.tokens = Math.min(this.maxTokens, b.tokens + elapsed * this.refillPerSec);
    b.updatedAt = now;
    if (b.tokens < 1) return false;
    b.tokens -= 1;
    return true;
  }

  prune(maxAgeMs = 600_000): void {
    const now = Date.now();
    for (const [k, b] of this.buckets) {
      if (now - b.updatedAt > maxAgeMs) this.buckets.delete(k);
    }
  }
}

export const MAX_PAYLOAD_BYTES = 16_384;
