import { TEAM_BY_SEAT } from "@kv/contracts";
import type { Suit } from "@kv/contracts";
import type { CurrentTrick, TrickCardPlay } from "./types.js";

export function effectiveSuit(play: TrickCardPlay): Suit {
  if (play.chameleon && play.card.suit !== play.card.suit) {
    /* chameleon sets effective to led — caller passes led into compare */
  }
  return play.chameleon ? (play as TrickCardPlay & { _led?: Suit })._led ?? play.card.suit : play.card.suit;
}

export function effectiveStrength(play: TrickCardPlay): number {
  return play.card.strength + play.strengthDelta;
}

export function resolveTrickWinner(
  trick: CurrentTrick,
  superiorSuit: Suit | null,
): { winnerSeat: number; winningPlayIndex: number } {
  const led = trick.ledSuit!;
  const plays = trick.plays.map((p, index) => ({
    play: p,
    index,
    effSuit: p.chameleon ? led : p.card.suit,
    effStrength: effectiveStrength(p),
  }));

  const hasSuperior = superiorSuit !== null;
  const superiorPlays = hasSuperior
    ? plays.filter((p) => p.effSuit === superiorSuit)
    : [];
  const ledPlays = plays.filter((p) => p.effSuit === led);

  let candidates = superiorPlays.length > 0 ? superiorPlays : ledPlays;
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
  return TEAM_BY_SEAT[seat] as 0 | 1;
}
