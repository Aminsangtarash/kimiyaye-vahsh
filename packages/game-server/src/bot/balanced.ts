import type { PlayerGameView } from "@kv/game-core";
import type { AnimalInstance, SpecialInstance } from "@kv/game-core";
import { SPECIAL_META } from "@kv/game-core";

export type BotActionIntent =
  | { type: "PLAY_CARD"; cardInstanceId: string; specialInstanceIds?: string[] }
  | { type: "REQUEST_SPECIAL_DRAW" }
  | { type: "DISCARD_SPECIAL"; specialInstanceId: string }
  | { type: "SURRENDER" };

export interface BotStrategy {
  readonly id: string;
  chooseAction(view: PlayerGameView, rng: () => number): BotActionIntent | null;
}

/**
 * BALANCED v1 + Special Cards V1 heuristics (player-safe view only).
 */
export class BalancedStrategy implements BotStrategy {
  readonly id = "balanced";

  chooseAction(view: PlayerGameView, rng: () => number): BotActionIntent | null {
    if (view.phase !== "playing") return null;
    if (view.currentPlayer !== view.seat) return null;

    if (view.pendingSpecialDiscard) {
      return this.chooseDiscard(view, rng);
    }

    if (view.canRequestSpecialDraw && view.specialCardsEnabled) {
      // Attempt draw often enough to exercise specials; still deterministic via rng.
      if (rng() < 0.55) return { type: "REQUEST_SPECIAL_DRAW" };
    }

    const legal = view.yourHand.filter((c) => view.legalCardIds.includes(c.instanceId));
    if (legal.length === 0) return null;

    const pick = this.pickCard(view, legal, rng);
    const specials = this.pickSpecials(view, pick, rng);
    return {
      type: "PLAY_CARD",
      cardInstanceId: pick.instanceId,
      specialInstanceIds: specials.length ? specials : undefined,
    };
  }

  private chooseDiscard(view: PlayerGameView, rng: () => number): BotActionIntent {
    const inv = view.yourSpecials;
    const nullCard = inv.find((s) => s.slug === "null");
    if (nullCard) return { type: "DISCARD_SPECIAL", specialInstanceId: nullCard.instanceId };
    // Prefer discarding newly drawn if it's low-value, else weakest heuristic: null-like / random low
    const drawnId = view.pendingSpecialDiscard?.drawnInstanceId;
    const drawn = inv.find((s) => s.instanceId === drawnId);
    if (drawn && (drawn.slug === "null" || rng() < 0.4)) {
      return { type: "DISCARD_SPECIAL", specialInstanceId: drawn.instanceId };
    }
    const sorted = [...inv].sort((a, b) => this.keepScore(a) - this.keepScore(b));
    return { type: "DISCARD_SPECIAL", specialInstanceId: sorted[0].instanceId };
  }

  private keepScore(s: SpecialInstance): number {
    switch (s.slug) {
      case "armageddon":
        return 100;
      case "hunt_command":
        return 80;
      case "team_bond":
        return 60;
      case "inversion":
        return 50;
      case "doping":
      case "trap":
        return 40;
      case "chameleon":
        return 35;
      case "null":
        return 0;
      default:
        return 10;
    }
  }

  private pickSpecials(view: PlayerGameView, card: AnimalInstance, rng: () => number): string[] {
    if (!view.specialCardsEnabled || view.yourSpecials.length === 0) return [];
    const trick = view.currentTrick;
    const isLeader = !trick || trick.plays.length === 0;
    const chosen: SpecialInstance[] = [];

    const chameleon = view.yourSpecials.find((s) => s.slug === "chameleon");
    const canChameleon =
      chameleon &&
      trick &&
      trick.plays.length > 0 &&
      trick.ledSuit &&
      !view.yourHand.some((c) => c.suit === trick.ledSuit);

    if (canChameleon && rng() < 0.7) chosen.push(chameleon!);

    const others = view.yourSpecials.filter((s) => s.slug !== "chameleon");
    for (const s of others) {
      if (chosen.some((c) => c.slug !== "chameleon") && !chosen.some((c) => c.slug === "chameleon")) {
        break;
      }
      if (chosen.filter((c) => c.slug !== "chameleon").length >= 1) break;
      if (!this.wantSpecial(view, card, s, isLeader, rng)) continue;
      // Armageddon illegal with own A
      if (s.slug === "armageddon" && (card.displayRank === "A" || card.strength === 13)) continue;
      if (s.slug === "hunt_command") {
        if (!isLeader) continue;
        if (view.tricksPlayedThisHand === 0) continue;
        if (view.hunterRealm && card.suit === view.hunterRealm) continue;
        if (chosen.some((c) => c.slug === "chameleon")) continue;
      }
      chosen.push(s);
      break;
    }

    // Max: chameleon + one other, or one alone
    const nonCh = chosen.filter((c) => c.slug !== "chameleon");
    const ch = chosen.filter((c) => c.slug === "chameleon");
    const final = [...ch.slice(0, 1), ...nonCh.slice(0, 1)];
    return final.map((s) => s.instanceId);
  }

  private wantSpecial(
    view: PlayerGameView,
    card: AnimalInstance,
    s: SpecialInstance,
    isLeader: boolean,
    rng: () => number,
  ): boolean {
    const trick = view.currentTrick;
    switch (s.slug) {
      case "null":
        return view.yourSpecials.length >= 3 && rng() < 0.15;
      case "doping":
        return card.strength >= 6 && rng() < 0.45;
      case "trap":
        return Boolean(trick && trick.plays.length >= 1 && rng() < 0.4);
      case "inversion":
        return card.strength <= 5 && rng() < 0.35;
      case "team_bond":
        return card.strength >= 4 && rng() < 0.35;
      case "armageddon": {
        const oppA = trick?.plays.some(
          (p) =>
            p.seat % 2 !== view.seat % 2 &&
            (p.card.displayRank === "A" || p.card.strength === 13),
        );
        return Boolean(oppA) || rng() < 0.08;
      }
      case "hunt_command":
        return isLeader && rng() < 0.25;
      default:
        return false;
    }
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
      return [...legal].sort((a, b) => a.strength - b.strength)[0];
    }

    if (winning) {
      const beaters = legal.filter((c) =>
        this.beats(c, winning.card, led, hunter, c.suit === led || c.suit === hunter),
      );
      if (beaters.length > 0) {
        const nonLegend = beaters.filter((c) => c.strength < 11);
        const pool = nonLegend.length > 0 ? nonLegend : beaters;
        return [...pool].sort((a, b) => a.strength - b.strength)[0];
      }
    }

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
      effSuit: p.effectiveSuit ?? (p.chameleon ? led : p.card.suit),
      eff: p.card.strength + p.strengthDelta,
    }));
    const hunterPlays = hunter ? plays.filter((p) => p.effSuit === hunter) : [];
    const ledPlays = plays.filter((p) => p.effSuit === led);
    const candidates = hunterPlays.length > 0 ? hunterPlays : ledPlays.length > 0 ? ledPlays : plays;
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

void SPECIAL_META;
