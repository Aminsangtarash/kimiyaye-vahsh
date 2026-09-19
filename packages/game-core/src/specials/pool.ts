import type { SpecialSlug } from "@kv/contracts";
import type { RandomSource } from "../rng.js";
import { DEFAULT_SPECIAL_POOL_WEIGHTS, V1_SPECIAL_SLUGS } from "./constants.js";

export function specialPoolTotal(weights: Record<SpecialSlug, number> = DEFAULT_SPECIAL_POOL_WEIGHTS): number {
  return V1_SPECIAL_SLUGS.reduce((sum, slug) => sum + (weights[slug] ?? 0), 0);
}

/**
 * Weighted pick. Inject RNG for deterministic boundary tests.
 * roll in [0, 1) maps onto [0, total).
 */
export function pickWeightedSpecial(
  rng: RandomSource,
  weights: Record<SpecialSlug, number> = DEFAULT_SPECIAL_POOL_WEIGHTS,
): SpecialSlug {
  const total = specialPoolTotal(weights);
  if (total <= 0) throw new Error("Special pool weights sum to 0");
  let roll = rng.next() * total;
  for (const slug of V1_SPECIAL_SLUGS) {
    const w = weights[slug] ?? 0;
    roll -= w;
    if (roll < 0) return slug;
  }
  return V1_SPECIAL_SLUGS[V1_SPECIAL_SLUGS.length - 1];
}

/** Cumulative upper bounds for tests: doping ends at 10, ..., armageddon at 64. */
export function specialWeightBoundaries(
  weights: Record<SpecialSlug, number> = DEFAULT_SPECIAL_POOL_WEIGHTS,
): { slug: SpecialSlug; start: number; end: number }[] {
  let cursor = 0;
  return V1_SPECIAL_SLUGS.map((slug) => {
    const start = cursor;
    cursor += weights[slug] ?? 0;
    return { slug, start, end: cursor };
  });
}
