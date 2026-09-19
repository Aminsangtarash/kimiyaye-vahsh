import { ALL_ANIMAL_REALMS, type AnimalRealm } from "@kv/contracts";
import type { AnimalInstance } from "./types.js";

/** Configurable weights for bot / auto-timeout Hunter selection. */
export const HUNTER_SELECT_WEIGHTS = {
  cardCount: 14,
  totalStrength: 1,
  highCardBonus: 5, // strength >= 10
  legendaryBonus: 9, // strength >= 11 (C/B/A)
} as const;

export function scoreRealmForHunter(cards: AnimalInstance[], realm: AnimalRealm): number {
  const of = cards.filter((c) => c.suit === realm);
  if (of.length === 0) return 0;
  const count = of.length;
  const total = of.reduce((s, c) => s + c.strength, 0);
  const high = of.filter((c) => c.strength >= 10).length;
  const legend = of.filter((c) => c.strength >= 11).length;
  return (
    count * HUNTER_SELECT_WEIGHTS.cardCount +
    total * HUNTER_SELECT_WEIGHTS.totalStrength +
    high * HUNTER_SELECT_WEIGHTS.highCardBonus +
    legend * HUNTER_SELECT_WEIGHTS.legendaryBonus
  );
}

/**
 * Choose Hunter Realm from the selector's first five cards only.
 * Tie-break: realm containing the highest card among tied scores; then RNG.
 */
export function chooseHunterRealm(
  fiveCards: AnimalInstance[],
  rng: () => number = Math.random,
): AnimalRealm {
  const ranked = ALL_ANIMAL_REALMS.map((realm) => {
    const of = fiveCards.filter((c) => c.suit === realm);
    return {
      realm,
      score: scoreRealmForHunter(fiveCards, realm),
      maxInRealm: of.length ? Math.max(...of.map((c) => c.strength)) : -1,
    };
  });
  ranked.sort((a, b) => b.score - a.score || b.maxInRealm - a.maxInRealm);
  const top = ranked[0];
  const tied = ranked.filter((r) => r.score === top.score && r.maxInRealm === top.maxInRealm);
  if (tied.length === 1) return tied[0].realm;
  const i = Math.min(tied.length - 1, Math.floor(rng() * tied.length));
  return tied[i].realm;
}
