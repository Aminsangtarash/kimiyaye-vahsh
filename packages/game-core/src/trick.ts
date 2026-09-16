import type { AnimalRealm, Suit } from "@kv/contracts";
import type { CurrentTrick, TrickCardPlay } from "./types.js";

export function effectiveStrength(play: TrickCardPlay): number {
  return play.card.strength + play.strengthDelta;
}

/**
 * Resolve trick winner using Hunter Realm as trump.
 * hunterRealm must be set once a trick has started (leader's represented realm).
 */
export function resolveTrickWinner(
  trick: CurrentTrick,
  hunterRealm: AnimalRealm | Suit | null,
): { winnerSeat: number; winningPlayIndex: number } {
  const led = trick.ledSuit!;
  const plays = trick.plays.map((p, index) => ({
    play: p,
    index,
    effSuit: p.chameleon ? led : p.card.suit,
    effStrength: effectiveStrength(p),
  }));

  const hunterPlays =
    hunterRealm !== null ? plays.filter((p) => p.effSuit === hunterRealm) : [];
  const ledPlays = plays.filter((p) => p.effSuit === led);

  let candidates = hunterPlays.length > 0 ? hunterPlays : ledPlays;
  if (candidates.length === 0) {
    candidates = plays;
  }

  let best = candidates[0];
  for (const c of candidates.slice(1)) {
    if (c.effStrength > best.effStrength) {
      best = c;
    } else if (c.effStrength === best.effStrength && c.index < best.index) {
      best = c;
    }
  }
  return { winnerSeat: best.play.seat, winningPlayIndex: best.index };
}

export function teamForSeat(seat: number): 0 | 1 {
  return (seat % 2 === 0 ? 0 : 1) as 0 | 1;
}
