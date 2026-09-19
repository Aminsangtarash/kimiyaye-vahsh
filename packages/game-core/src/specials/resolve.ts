import type { AnimalRealm, SpecialSlug, Suit } from "@kv/contracts";
import { TEAM_BY_SEAT } from "@kv/contracts";
import type { AnimalInstance, CurrentTrick, EngineEvent, TrickCardPlay } from "../types.js";
import {
  A_POWER_FLOOR,
  DOPING_DELTA,
  FUSION_POWER_CAP,
  isAceCard,
  isLegendaryRank,
  NORMAL_POWER_FLOOR,
  TRAP_DELTA,
} from "./constants.js";
import { participantIdForSeat } from "../impact.js";
import { teamForSeat } from "../trick.js";

export interface PowerModifier {
  source: string;
  delta?: number;
  note: string;
}

export interface ResolvedCard {
  seat: number;
  teamId: 0 | 1;
  playIndex: number;
  originalCard: AnimalInstance;
  baseRank: number;
  effectiveRank: number;
  effectivePower: number;
  printedSuit: Suit;
  effectiveSuit: Suit;
  transformedByChameleon: boolean;
  destroyedByArmageddon: boolean;
  isLegendary: boolean;
  isAce: boolean;
  modifiers: PowerModifier[];
  specials: SpecialSlug[];
}

export interface FusionResolved {
  teamId: 0 | 1;
  seats: [number, number];
  playIndexes: [number, number];
  effectiveSuit: Suit;
  fusionPower: number;
  componentPowers: [number, number];
  winnerSeat: number;
  legendaryCount: number;
  sumBaseRanks: number;
  naturalSuitAdvantage: number;
  bondPlayOrder: number;
  cards: [ResolvedCard, ResolvedCard];
  /**
   * Visual/state only: dedicated Fusion Beast card when final power > 10.
   * Team Bond gameplay (combined power) is always active when this fusion exists.
   */
  showsFusionBeast: boolean;
}

export interface HuntCommandOutcome {
  initiatorSeat: number;
  proposedHunter: AnimalRealm;
  succeeded: boolean;
  previousHunter: AnimalRealm;
  newHunter: AnimalRealm | null;
  failReason?: string;
}

export interface TrickResolutionResult {
  resolved: ResolvedCard[];
  fusions: FusionResolved[];
  winnerSeat: number;
  winningTeam: 0 | 1;
  inversionActive: boolean;
  inversionCancelled: boolean;
  huntCommand: HuntCommandOutcome | null;
  events: EngineEvent[];
  successfulSpecials: { seat: number; slug: SpecialSlug }[];
}

function baseRankOf(card: AnimalInstance): number {
  return card.strength;
}

export function invertRank(baseRank: number): number {
  if (baseRank === 13) return 13;
  return 13 - baseRank;
}

export function applyPowerFloors(power: number, isAce: boolean): number {
  if (isAce) return Math.max(A_POWER_FLOOR, power);
  return Math.max(NORMAL_POWER_FLOOR, power);
}

/** Snapshot effective suit for a Chameleon play at the moment of play. */
export function chameleonEffectiveSuit(
  trick: CurrentTrick,
  hunterRealm: AnimalRealm | null,
  cardPrintedSuit: Suit,
  useChameleon: boolean,
): { effectiveSuit: Suit; transformedByChameleon: boolean } {
  if (!useChameleon) {
    return { effectiveSuit: cardPrintedSuit, transformedByChameleon: false };
  }
  const led = trick.ledSuit;
  if (!led) {
    return { effectiveSuit: cardPrintedSuit, transformedByChameleon: false };
  }
  const priorHunter =
    hunterRealm !== null &&
    trick.plays.some((p) => p.effectiveSuit === hunterRealm);
  if (priorHunter) {
    return { effectiveSuit: hunterRealm!, transformedByChameleon: true };
  }
  return { effectiveSuit: led, transformedByChameleon: true };
}

function trickIsCutBeforeIndex(
  plays: TrickCardPlay[],
  hunterRealm: AnimalRealm | null,
  ledSuit: Suit,
  beforeIndex: number,
): boolean {
  if (!hunterRealm || hunterRealm === ledSuit) return false;
  return plays.some(
    (p, i) => i < beforeIndex && p.effectiveSuit === hunterRealm,
  );
}

function pickBondInternalWinner(a: ResolvedCard, b: ResolvedCard): number {
  if (a.effectivePower !== b.effectivePower) {
    return a.effectivePower > b.effectivePower ? a.seat : b.seat;
  }
  const aLeg = a.isLegendary ? 1 : 0;
  const bLeg = b.isLegendary ? 1 : 0;
  if (aLeg !== bLeg) return aLeg > bLeg ? a.seat : b.seat;
  if (a.baseRank !== b.baseRank) return a.baseRank > b.baseRank ? a.seat : b.seat;
  const aNat = a.transformedByChameleon ? 0 : 1;
  const bNat = b.transformedByChameleon ? 0 : 1;
  if (aNat !== bNat) return aNat > bNat ? a.seat : b.seat;
  return a.playIndex <= b.playIndex ? a.seat : b.seat;
}

type Contender =
  | { kind: "single"; card: ResolvedCard; power: number; suit: Suit }
  | { kind: "fusion"; fusion: FusionResolved; power: number; suit: Suit };

function contenderPriority(
  c: Contender,
  hunter: AnimalRealm | null,
  led: Suit,
): number {
  if (hunter && c.suit === hunter) return 2;
  if (c.suit === led) return 1;
  return 0;
}

function compareContenders(
  a: Contender,
  b: Contender,
  hunter: AnimalRealm | null,
  led: Suit,
): number {
  const pa = contenderPriority(a, hunter, led);
  const pb = contenderPriority(b, hunter, led);
  if (pa !== pb) return pa - pb;
  if (a.power !== b.power) return a.power - b.power;

  // Exact power tie
  if (a.kind === "fusion" && b.kind === "single") {
    if (a.fusion.legendaryCount > 0) return 1;
  }
  if (b.kind === "fusion" && a.kind === "single") {
    if (b.fusion.legendaryCount > 0) return -1;
  }
  if (a.kind === "fusion" && b.kind === "fusion") {
    if (a.fusion.legendaryCount !== b.fusion.legendaryCount) {
      return a.fusion.legendaryCount - b.fusion.legendaryCount;
    }
    if (a.fusion.sumBaseRanks !== b.fusion.sumBaseRanks) {
      return a.fusion.sumBaseRanks - b.fusion.sumBaseRanks;
    }
    if (a.fusion.naturalSuitAdvantage !== b.fusion.naturalSuitAdvantage) {
      return a.fusion.naturalSuitAdvantage - b.fusion.naturalSuitAdvantage;
    }
    return b.fusion.bondPlayOrder - a.fusion.bondPlayOrder; // earlier bond wins → lower index better → invert for compare: return positive if a better
  }

  if (a.kind === "single" && b.kind === "single") {
    const aNat = a.card.transformedByChameleon ? 0 : 1;
    const bNat = b.card.transformedByChameleon ? 0 : 1;
    if (aNat !== bNat) return aNat - bNat;
    if (a.card.baseRank !== b.card.baseRank) return a.card.baseRank - b.card.baseRank;
    return b.card.playIndex - a.card.playIndex; // earlier play wins
  }

  // mixed without legendary fusion advantage — fall through to play order
  const aIdx = a.kind === "single" ? a.card.playIndex : a.fusion.bondPlayOrder;
  const bIdx = b.kind === "single" ? b.card.playIndex : b.fusion.bondPlayOrder;
  return bIdx - aIdx;
}

function winnerSeatOf(c: Contender): number {
  return c.kind === "single" ? c.card.seat : c.fusion.winnerSeat;
}

export function resolveTrickPipeline(
  trick: CurrentTrick,
  hunterRealm: AnimalRealm,
  tricksPlayedThisHand: number,
): TrickResolutionResult {
  const led = trick.ledSuit!;
  const events: EngineEvent[] = [];
  const successfulSpecials: { seat: number; slug: SpecialSlug }[] = [];

  // 1. Prepare resolved cards (Chameleon already snapshotted)
  let resolved: ResolvedCard[] = trick.plays.map((p, playIndex) => {
    const baseRank = baseRankOf(p.card);
    if (p.transformedByChameleon) {
      events.push({ type: "CHAMELEON_APPLIED", seat: p.seat, effectiveSuit: p.effectiveSuit });
      successfulSpecials.push({ seat: p.seat, slug: "chameleon" });
    }
    for (const slug of p.specials) {
      events.push({
        type: "SPECIAL_PLAYED",
        seat: p.seat,
        slug,
        instanceId: `${p.seat}-${slug}-${playIndex}`,
      });
    }
    return {
      seat: p.seat,
      teamId: teamForSeat(p.seat),
      playIndex,
      originalCard: p.card,
      baseRank,
      effectiveRank: baseRank,
      effectivePower: baseRank,
      printedSuit: p.card.suit,
      effectiveSuit: p.effectiveSuit,
      transformedByChameleon: p.transformedByChameleon,
      destroyedByArmageddon: false,
      isLegendary: isLegendaryRank(p.card.displayRank, p.card.strength),
      isAce: isAceCard(p.card.displayRank, p.card.strength),
      modifiers: [] as PowerModifier[],
      specials: [...p.specials],
    };
  });

  // 2. Armageddon — destroy opponent A
  for (const card of resolved) {
    if (!card.specials.includes("armageddon")) continue;
    let destroyed = false;
    for (const target of resolved) {
      if (target.teamId === card.teamId) continue;
      if (!target.isAce) continue;
      target.destroyedByArmageddon = true;
      target.modifiers.push({ source: "armageddon", note: "destroyed" });
      events.push({ type: "ARMAGEDDON_DESTROYED_A", seat: card.seat, targetSeat: target.seat });
      destroyed = true;
    }
    if (destroyed) {
      successfulSpecials.push({ seat: card.seat, slug: "armageddon" });
      events.push({ type: "SPECIAL_RESOLVED", seat: card.seat, slug: "armageddon", success: true });
    } else {
      events.push({ type: "SPECIAL_RESOLVED", seat: card.seat, slug: "armageddon", success: false });
      events.push({ type: "SPECIAL_FAILED", seat: card.seat, slug: "armageddon", reason: "no_opponent_a" });
    }
  }

  // 3. Inversion
  const inversionCasters = resolved.filter((c) => c.specials.includes("inversion"));
  let inversionActive = inversionCasters.length > 0;
  let inversionCancelled = false;
  if (inversionActive) {
    const canceller = resolved.find(
      (c) =>
        c.isAce &&
        !c.destroyedByArmageddon &&
        c.effectiveSuit === led,
    );
    if (canceller) {
      inversionCancelled = true;
      inversionActive = false;
      events.push({ type: "INVERSION_CANCELLED_BY_A", seat: canceller.seat });
      for (const caster of inversionCasters) {
        events.push({ type: "SPECIAL_RESOLVED", seat: caster.seat, slug: "inversion", success: false });
        events.push({
          type: "SPECIAL_FAILED",
          seat: caster.seat,
          slug: "inversion",
          reason: "cancelled_by_a",
        });
      }
    } else {
      events.push({ type: "INVERSION_APPLIED" });
      for (const c of resolved) {
        if (c.destroyedByArmageddon) continue;
        const inv = invertRank(c.baseRank);
        c.effectiveRank = inv;
        c.modifiers.push({
          source: "inversion",
          note: `${c.baseRank} → ${inv}`,
        });
      }
      for (const caster of inversionCasters) {
        successfulSpecials.push({ seat: caster.seat, slug: "inversion" });
        events.push({ type: "SPECIAL_RESOLVED", seat: caster.seat, slug: "inversion", success: true });
      }
    }
  }

  // 4. Doping / Trap + floors
  const trapCountByTeam: [number, number] = [0, 0];
  for (const c of resolved) {
    if (c.specials.includes("trap")) {
      trapCountByTeam[c.teamId] += 1;
    }
  }

  for (const c of resolved) {
    if (c.destroyedByArmageddon) {
      c.effectivePower = 0;
      continue;
    }
    let power = c.effectiveRank;
    if (c.specials.includes("doping")) {
      power += DOPING_DELTA;
      c.modifiers.push({ source: "doping", delta: DOPING_DELTA, note: `+${DOPING_DELTA}` });
      events.push({ type: "DOPING_APPLIED", seat: c.seat, delta: DOPING_DELTA });
      successfulSpecials.push({ seat: c.seat, slug: "doping" });
      events.push({ type: "SPECIAL_RESOLVED", seat: c.seat, slug: "doping", success: true });
    }
    const enemyTeam = (1 - c.teamId) as 0 | 1;
    const traps = trapCountByTeam[enemyTeam];
    if (traps > 0) {
      const delta = TRAP_DELTA * traps;
      power += delta;
      c.modifiers.push({ source: "trap", delta, note: `${delta} (${traps}×)` });
    }
    const beforeFloor = power;
    power = applyPowerFloors(power, c.isAce);
    if (power !== beforeFloor) {
      c.modifiers.push({ source: "floor", note: `floor → ${power}` });
    }
    c.effectivePower = power;
  }

  for (const c of resolved) {
    if (c.specials.includes("trap")) {
      events.push({ type: "TRAP_APPLIED", seat: c.seat, delta: TRAP_DELTA });
      successfulSpecials.push({ seat: c.seat, slug: "trap" });
      events.push({ type: "SPECIAL_RESOLVED", seat: c.seat, slug: "trap", success: true });
    }
    if (c.specials.includes("null")) {
      events.push({ type: "SPECIAL_RESOLVED", seat: c.seat, slug: "null", success: false });
    }
  }

  // 5. Team Bond
  const fusions: FusionResolved[] = [];
  const fusedSeats = new Set<number>();

  for (const teamId of [0, 1] as const) {
    const bondPlay = resolved.find(
      (c) => c.teamId === teamId && c.specials.includes("team_bond") && !c.destroyedByArmageddon,
    );
    if (!bondPlay) continue;

    const mates = resolved.filter((c) => c.teamId === teamId && !c.destroyedByArmageddon);
    if (mates.length < 2) {
      events.push({
        type: "TEAM_BOND_FAILED",
        seat: bondPlay.seat,
        reason: "missing_teammate_card",
      });
      events.push({ type: "SPECIAL_FAILED", seat: bondPlay.seat, slug: "team_bond", reason: "missing_teammate_card" });
      events.push({ type: "SPECIAL_RESOLVED", seat: bondPlay.seat, slug: "team_bond", success: false });
      continue;
    }
    const [a, b] = mates;
    if (a.effectiveSuit !== b.effectiveSuit) {
      events.push({
        type: "TEAM_BOND_FAILED",
        seat: bondPlay.seat,
        reason: "suit_mismatch",
      });
      events.push({ type: "SPECIAL_FAILED", seat: bondPlay.seat, slug: "team_bond", reason: "suit_mismatch" });
      events.push({ type: "SPECIAL_RESOLVED", seat: bondPlay.seat, slug: "team_bond", success: false });
      continue;
    }
    const completeIndex = Math.max(a.playIndex, b.playIndex);
    if (trickIsCutBeforeIndex(trick.plays, hunterRealm, led, completeIndex)) {
      events.push({
        type: "TEAM_BOND_FAILED",
        seat: bondPlay.seat,
        reason: "trick_already_cut",
      });
      events.push({ type: "SPECIAL_FAILED", seat: bondPlay.seat, slug: "team_bond", reason: "trick_already_cut" });
      events.push({ type: "SPECIAL_RESOLVED", seat: bondPlay.seat, slug: "team_bond", success: false });
      continue;
    }

    const raw = a.effectivePower + b.effectivePower;
    const fusionPower = Math.min(FUSION_POWER_CAP, raw);
    const winnerSeat = pickBondInternalWinner(a, b);
    const fusion: FusionResolved = {
      teamId,
      seats: [a.seat, b.seat],
      playIndexes: [a.playIndex, b.playIndex],
      effectiveSuit: a.effectiveSuit,
      fusionPower,
      componentPowers: [a.effectivePower, b.effectivePower],
      winnerSeat,
      legendaryCount: (a.isLegendary ? 1 : 0) + (b.isLegendary ? 1 : 0),
      sumBaseRanks: a.baseRank + b.baseRank,
      naturalSuitAdvantage:
        (a.transformedByChameleon ? 0 : 1) + (b.transformedByChameleon ? 0 : 1),
      bondPlayOrder: bondPlay.playIndex,
      cards: [a, b],
      showsFusionBeast: fusionPower > 10,
    };
    fusions.push(fusion);
    fusedSeats.add(a.seat);
    fusedSeats.add(b.seat);
    events.push({
      type: "TEAM_BOND_CREATED",
      team: teamId,
      seats: fusion.seats,
      fusionPower,
      effectiveSuit: fusion.effectiveSuit,
      showsFusionBeast: fusion.showsFusionBeast,
    });
    successfulSpecials.push({ seat: bondPlay.seat, slug: "team_bond" });
    events.push({ type: "SPECIAL_RESOLVED", seat: bondPlay.seat, slug: "team_bond", success: true });
  }

  // 6. Determine winner
  const contenders: Contender[] = [];
  for (const f of fusions) {
    contenders.push({ kind: "fusion", fusion: f, power: f.fusionPower, suit: f.effectiveSuit });
  }
  for (const c of resolved) {
    if (c.destroyedByArmageddon) continue;
    if (fusedSeats.has(c.seat)) continue;
    contenders.push({ kind: "single", card: c, power: c.effectivePower, suit: c.effectiveSuit });
  }

  if (contenders.length === 0) {
    // All destroyed edge case — first play wins by seat order
    const fallback = resolved[0];
    return {
      resolved,
      fusions,
      winnerSeat: fallback.seat,
      winningTeam: fallback.teamId,
      inversionActive,
      inversionCancelled,
      huntCommand: null,
      events,
      successfulSpecials,
    };
  }

  let best = contenders[0];
  for (const c of contenders.slice(1)) {
    if (compareContenders(c, best, hunterRealm, led) > 0) best = c;
  }
  const winnerSeat = winnerSeatOf(best);
  const winningTeam = teamForSeat(winnerSeat);

  // 7. Hunt Command
  let huntCommand: HuntCommandOutcome | null = null;
  const huntPlay = resolved.find((c) => c.specials.includes("hunt_command"));
  if (huntPlay) {
    const proposed = huntPlay.effectiveSuit as AnimalRealm;
    events.push({
      type: "HUNT_COMMAND_PENDING",
      seat: huntPlay.seat,
      proposedHunter: proposed,
    });
    let failReason: string | undefined;
    if (huntPlay.seat !== trick.leader) failReason = "not_leader";
    else if (tricksPlayedThisHand === 0) failReason = "trick_1";
    else if (proposed === hunterRealm) failReason = "same_as_hunter";
    else {
      const mate = resolved.find((c) => c.teamId === huntPlay.teamId && c.seat !== huntPlay.seat);
      if (!mate || mate.effectiveSuit !== proposed) failReason = "no_teammate_support";
      else if (winningTeam !== huntPlay.teamId) failReason = "team_lost_trick";
    }

    if (failReason) {
      huntCommand = {
        initiatorSeat: huntPlay.seat,
        proposedHunter: proposed,
        succeeded: false,
        previousHunter: hunterRealm,
        newHunter: null,
        failReason,
      };
      events.push({ type: "HUNT_COMMAND_FAILED", seat: huntPlay.seat, reason: failReason });
      events.push({ type: "SPECIAL_RESOLVED", seat: huntPlay.seat, slug: "hunt_command", success: false });
      events.push({ type: "SPECIAL_FAILED", seat: huntPlay.seat, slug: "hunt_command", reason: failReason });
    } else {
      huntCommand = {
        initiatorSeat: huntPlay.seat,
        proposedHunter: proposed,
        succeeded: true,
        previousHunter: hunterRealm,
        newHunter: proposed,
      };
      events.push({
        type: "HUNT_COMMAND_SUCCEEDED",
        previousHunterRealm: hunterRealm,
        newHunterRealm: proposed,
        initiatorParticipantId: participantIdForSeat(huntPlay.seat),
      });
      successfulSpecials.push({ seat: huntPlay.seat, slug: "hunt_command" });
      events.push({ type: "SPECIAL_RESOLVED", seat: huntPlay.seat, slug: "hunt_command", success: true });
    }
  }

  return {
    resolved,
    fusions,
    winnerSeat,
    winningTeam,
    inversionActive,
    inversionCancelled,
    huntCommand,
    events,
    successfulSpecials,
  };
}

void TEAM_BY_SEAT;
