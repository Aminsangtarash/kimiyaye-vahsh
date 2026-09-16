import type { PlayerGameView } from "@kv/game-core";
import type { AnimalInstance } from "@kv/game-core";
import { TEAM_BY_SEAT } from "@kv/contracts";

export type BotActionIntent =
  | { type: "PLAY_CARD"; cardInstanceId: string }
  | { type: "PASS_SPECIAL" }
  | { type: "SURRENDER" };

export interface BotStrategy {
  readonly id: string;
  chooseAction(view: PlayerGameView, rng: () => number): BotActionIntent | null;
}

/**
 * BALANCED v1 — legal, follow-suit aware, Hunter-aware, no hidden info.
 * Only uses player-safe PlayerGameView.
 */
export class BalancedStrategy implements BotStrategy {
  readonly id = "balanced";

  chooseAction(view: PlayerGameView, rng: () => number): BotActionIntent | null {
    if (view.phase !== "playing") return null;
    if (view.pendingSpecial) return { type: "PASS_SPECIAL" };
    if (view.currentPlayer !== view.seat) return null;

    const legal = view.yourHand.filter((c) => view.legalCardIds.includes(c.instanceId));
    if (legal.length === 0) return null;

    const pick = this.pickCard(view, legal, rng);
    return { type: "PLAY_CARD", cardInstanceId: pick.instanceId };
  }

  private pickCard(
    view: PlayerGameView,
    legal: AnimalInstance[],
    rng: () => number,
  ): AnimalInstance {
    const trick = view.currentTrick;
    const hunter = view.hunterRealm;
    const partner = (view.seat + 2) % 4;

    if (!trick || trick.plays.length === 0) {
      // Lead: prefer medium/low; slight preference for own realm if hunter will be us
      const sorted = [...legal].sort((a, b) => a.strength - b.strength);
      const mid = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.35))];
      if (rng() < 0.15) return sorted[Math.floor(rng() * sorted.length)];
      return mid;
    }

    const winning = this.currentWinner(view);
    const partnerWinning = winning?.seat === partner;
    const led = trick.ledSuit!;
    const following = legal.every((c) => c.suit === led) || legal.some((c) => c.suit === led);

    if (partnerWinning && winning) {
      const safe = [...legal].sort((a, b) => a.strength - b.strength)[0];
      return safe;
    }

    if (winning) {
      const beaters = legal.filter((c) => this.beats(c, winning.card, led, hunter, c.suit === led || c.suit === hunter));
      if (beaters.length > 0) {
        const nonLegend = beaters.filter((c) => c.strength < 11);
        const pool = nonLegend.length > 0 ? nonLegend : beaters;
        return [...pool].sort((a, b) => a.strength - b.strength)[0];
      }
    }

    // Cannot win: dump lowest, prefer non-hunter offsuit discards when void
    if (!following || legal.some((c) => c.suit !== led)) {
      const dumps = [...legal].sort((a, b) => {
        const aH = a.suit === hunter ? 1 : 0;
        const bH = b.suit === hunter ? 1 : 0;
        if (aH !== bH) return aH - bH;
        return a.strength - b.strength;
      });
      return dumps[0];
    }

    return [...legal].sort((a, b) => a.strength - b.strength)[0];
  }

  private currentWinner(view: PlayerGameView): { seat: number; card: AnimalInstance } | null {
    const trick = view.currentTrick;
    if (!trick || trick.plays.length === 0) return null;
    const hunter = view.hunterRealm;
    const led = trick.ledSuit!;
    const plays = trick.plays.map((p, index) => ({
      seat: p.seat,
      card: p.card as AnimalInstance,
      index,
      effSuit: p.chameleon ? led : p.card.suit,
      eff: p.card.strength + p.strengthDelta,
    }));
    const hunterPlays = hunter ? plays.filter((p) => p.effSuit === hunter) : [];
    const ledPlays = plays.filter((p) => p.effSuit === led);
    const candidates = hunterPlays.length > 0 ? hunterPlays : ledPlays;
    let best = candidates[0];
    for (const c of candidates.slice(1)) {
      if (c.eff > best.eff || (c.eff === best.eff && c.index < best.index)) best = c;
    }
    return { seat: best.seat, card: best.card };
  }

  private beats(
    card: AnimalInstance,
    winning: AnimalInstance,
    led: string,
    hunter: string | null,
    _canFollow: boolean,
  ): boolean {
    const winEff = winning.suit;
    const cardEff = card.suit;
    if (hunter && cardEff === hunter && winEff !== hunter) return true;
    if (hunter && cardEff === hunter && winEff === hunter) return card.strength > winning.strength;
    if (hunter && winEff === hunter && cardEff !== hunter) return false;
    if (cardEff === led && winEff === led) return card.strength > winning.strength;
    if (cardEff === led && winEff !== led && winEff !== hunter) return true;
    return false;
  }
}

export const balancedStrategy = new BalancedStrategy();

export function teammateSeat(seat: number): number {
  return (seat + 2) % 4;
}

void TEAM_BY_SEAT;
