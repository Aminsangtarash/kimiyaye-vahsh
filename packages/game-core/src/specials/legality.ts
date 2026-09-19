import type { SpecialSlug, Suit } from "@kv/contracts";
import type { AnimalInstance, GameState, SpecialInstance } from "../types.js";
import { isAceCard } from "./constants.js";
import { teamForSeat } from "../trick.js";

export interface SpecialLegality {
  ok: boolean;
  reason?: string;
  reasonFa?: string;
}

export function hasLeadSuitInHand(hand: AnimalInstance[], ledSuit: Suit): boolean {
  return hand.some((c) => c.suit === ledSuit);
}

export function validateAttachedSpecials(
  state: GameState,
  seat: number,
  card: AnimalInstance,
  specials: SpecialInstance[],
): SpecialLegality {
  if (specials.length === 0) return { ok: true };
  if (!state.config.specialCardsEnabled) {
    return { ok: false, reason: "specials_disabled", reasonFa: "کارت مکمل غیرفعال است" };
  }
  if (state.pendingSpecialDiscard) {
    return { ok: false, reason: "pending_discard", reasonFa: "ابتدا یک کارت مکمل را دور بیندازید" };
  }

  const slugs = specials.map((s) => s.slug);
  const chameleonCount = slugs.filter((s) => s === "chameleon").length;
  const nonChameleon = slugs.filter((s) => s !== "chameleon");

  if (chameleonCount > 1) {
    return { ok: false, reason: "multi_chameleon", reasonFa: "فقط یک آفتاب‌پرست مجاز است" };
  }
  if (nonChameleon.length > 1) {
    return {
      ok: false,
      reason: "multi_non_chameleon",
      reasonFa: "بیش از یک مکمل غیرآفتاب‌پرست مجاز نیست",
    };
  }
  if (slugs.length > 2) {
    return { ok: false, reason: "too_many", reasonFa: "حداکثر دو مکمل در یک تریک" };
  }
  if (slugs.length === 2 && chameleonCount !== 1) {
    return {
      ok: false,
      reason: "need_chameleon_pair",
      reasonFa: "ترکیب دو مکمل فقط با آفتاب‌پرست مجاز است",
    };
  }

  for (const spec of specials) {
    const one = validateSingleSpecial(state, seat, card, spec.slug, slugs);
    if (!one.ok) return one;
  }
  return { ok: true };
}

export function validateSingleSpecial(
  state: GameState,
  seat: number,
  card: AnimalInstance,
  slug: SpecialSlug,
  allSlugs: SpecialSlug[],
): SpecialLegality {
  const trick = state.currentTrick;
  if (!trick) return { ok: false, reason: "no_trick", reasonFa: "تریک فعال نیست" };

  switch (slug) {
    case "chameleon": {
      if (trick.plays.length === 0 || seat === trick.leader) {
        return {
          ok: false,
          reason: "chameleon_leader",
          reasonFa: "آغازگر تریک نمی‌تواند آفتاب‌پرست بازی کند",
        };
      }
      const led = trick.ledSuit!;
      if (hasLeadSuitInHand(state.hands[seat], led)) {
        return {
          ok: false,
          reason: "has_lead_suit",
          reasonFa: "کارت هم‌دسته در دست دارید",
        };
      }
      return { ok: true };
    }
    case "armageddon": {
      if (isAceCard(card.displayRank, card.strength)) {
        return {
          ok: false,
          reason: "arma_with_own_a",
          reasonFa: "همراه کارت A قابل استفاده نیست",
        };
      }
      return { ok: true };
    }
    case "hunt_command": {
      if (seat !== trick.leader || trick.plays.length > 0) {
        return {
          ok: false,
          reason: "hunt_not_leader",
          reasonFa: "فقط آغازکننده تریک",
        };
      }
      if (state.tricksPlayedThisHand === 0) {
        return {
          ok: false,
          reason: "hunt_trick_1",
          reasonFa: "در تریک اول مجاز نیست",
        };
      }
      if (allSlugs.includes("chameleon")) {
        return {
          ok: false,
          reason: "hunt_with_chameleon",
          reasonFa: "فرمان شکار با آفتاب‌پرست ترکیب نمی‌شود",
        };
      }
      // Proposed hunter = card printed suit (leader can't use chameleon)
      if (state.hunterRealm && card.suit === state.hunterRealm) {
        return {
          ok: false,
          reason: "hunt_same_hunter",
          reasonFa: "باید دسته‌ای غیر از شکارچی فعلی باشد",
        };
      }
      return { ok: true };
    }
    case "doping":
    case "trap":
    case "inversion":
    case "team_bond":
    case "null":
      return { ok: true };
    default:
      return { ok: false, reason: "unknown", reasonFa: "مکمل ناشناخته" };
  }
}

export function legalityReasonsForInventory(
  state: GameState,
  seat: number,
  card: AnimalInstance | null,
): Record<string, SpecialLegality> {
  const out: Record<string, SpecialLegality> = {};
  for (const spec of state.specialHands[seat]) {
    if (!card) {
      out[spec.instanceId] = {
        ok: false,
        reason: "pick_animal_first",
        reasonFa: "ابتدا کارت حیوان را انتخاب کنید",
      };
      continue;
    }
    out[spec.instanceId] = validateSingleSpecial(state, seat, card, spec.slug, [spec.slug]);
  }
  return out;
}

export function canRequestSpecialDraw(state: GameState, seat: number): SpecialLegality {
  if (!state.config.specialCardsEnabled) {
    return { ok: false, reason: "disabled", reasonFa: "غیرفعال" };
  }
  if (state.phase !== "playing") {
    return { ok: false, reason: "phase", reasonFa: "نوبت بازی نیست" };
  }
  if (state.currentPlayer !== seat) {
    return { ok: false, reason: "not_turn", reasonFa: "نوبت شما نیست" };
  }
  if (state.pendingSpecialDiscard) {
    return { ok: false, reason: "pending_discard", reasonFa: "دور انداختن در انتظار است" };
  }
  if (state.specialDrawAttemptedThisTurn) {
    return { ok: false, reason: "already_attempted", reasonFa: "این نوبت امتحان شده" };
  }
  const trick = state.currentTrick;
  if (trick && trick.plays.some((p) => p.seat === seat)) {
    return { ok: false, reason: "already_played", reasonFa: "پس از بازی کارت مجاز نیست" };
  }
  return { ok: true };
}

void teamForSeat;
