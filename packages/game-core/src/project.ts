import type { AnimalRealm, SpecialSlug, Suit } from "@kv/contracts";
import { TEAM_BY_SEAT } from "@kv/contracts";
import type { AnimalInstance, GameState, SpecialInstance } from "./types.js";
import { legalAnimalPlays } from "./engine.js";
import { canRequestSpecialDraw, resolveTrickPipeline, SPECIAL_META } from "./specials/index.js";
import type { TrickResolutionResult } from "./specials/resolve.js";

export interface PublicTrickPlay {
  seat: number;
  card: Omit<AnimalInstance, "instanceId"> & { instanceId: string };
  chameleon: boolean;
  transformedByChameleon: boolean;
  effectiveSuit: Suit;
  specials: SpecialSlug[];
  strengthDelta: number;
}

export interface PublicSpecialInfo {
  instanceId: string;
  slug: SpecialSlug;
  fa: string;
  shortFa: string;
}

export interface PlayerGameView {
  matchId: string;
  phase: GameState["phase"];
  stateVersion: number;
  rulesVersion: number;
  seat: number;
  team: 0 | 1;
  yourRealm: AnimalRealm;
  playerRealms: AnimalRealm[];
  yourHand: AnimalInstance[];
  yourSpecials: SpecialInstance[];
  specialInventory: PublicSpecialInfo[];
  legalCardIds: string[];
  currentPlayer: number;
  currentLeader: number | null;
  hunterRealm: AnimalRealm | null;
  hunterSelectorSeat: number;
  hunterSelectionSource: GameState["hunterSelectionSource"];
  selectionStartedAt: number | null;
  isHunterSelector: boolean;
  lastTrickWinner: number | null;
  lastHandWinnerTeam: number | null;
  handScore: GameState["handScore"];
  matchScore: GameState["matchScore"];
  currentTrick: {
    leader: number;
    ledSuit: Suit | null;
    plays: PublicTrickPlay[];
    silence: boolean;
  } | null;
  /** Live preview of special resolution for the current trick (partial or full). */
  trickPreview: TrickResolutionResult | null;
  opponentHandSizes: number[];
  opponentSpecialCounts: number[];
  pendingSpecial: boolean;
  specialDrawAttemptedThisTurn: boolean;
  canRequestSpecialDraw: boolean;
  pendingSpecialDiscard: GameState["pendingSpecialDiscard"];
  specialMaxInventory: number;
  specialDrawChance: number;
  matchWinnerTeam: number | null;
  seatStats: GameState["seatStats"];
  mvpParticipantIds: string[];
  specialCardsEnabled: boolean;
  specialRulesVersion: number;
  tricksPlayedThisHand: number;
}

/** Player-safe projection — never includes opponent hands or remaining deck. */
export function projectForSeat(state: GameState, seat: number): PlayerGameView {
  const legal = legalAnimalPlays(state, seat);
  const isSelector = seat === state.hunterSelectorSeat;
  const yourHand =
    state.phase === "hunter_selection" && !isSelector
      ? []
      : state.hands[seat].map((c) => ({ ...c }));

  const yourSpecials = state.specialHands[seat].map((s) => ({ ...s }));
  const drawGate = canRequestSpecialDraw(state, seat);

  let trickPreview: TrickResolutionResult | null = null;
  if (state.currentTrick && state.currentTrick.plays.length > 0 && state.hunterRealm) {
    try {
      trickPreview = resolveTrickPipeline(
        state.currentTrick,
        state.hunterRealm,
        state.tricksPlayedThisHand,
      );
    } catch {
      trickPreview = null;
    }
  }

  return {
    matchId: state.matchId,
    phase: state.phase,
    stateVersion: state.stateVersion,
    rulesVersion: state.rulesVersion,
    seat,
    team: TEAM_BY_SEAT[seat] as 0 | 1,
    yourRealm: state.playerRealms[seat],
    playerRealms: [...state.playerRealms],
    yourHand,
    yourSpecials,
    specialInventory: yourSpecials.map((s) => ({
      instanceId: s.instanceId,
      slug: s.slug,
      fa: SPECIAL_META[s.slug]?.fa ?? s.slug,
      shortFa: SPECIAL_META[s.slug]?.shortFa ?? "",
    })),
    legalCardIds: legal.map((c) => c.instanceId),
    currentPlayer: state.currentPlayer,
    currentLeader: state.currentTrick?.leader ?? state.firstLeaderThisHand,
    hunterRealm: state.hunterRealm,
    hunterSelectorSeat: state.hunterSelectorSeat,
    hunterSelectionSource: state.hunterSelectionSource,
    selectionStartedAt: state.selectionStartedAt,
    isHunterSelector: isSelector,
    lastTrickWinner: state.lastTrickWinner,
    lastHandWinnerTeam: state.lastHandWinnerTeam,
    handScore: { ...state.handScore, teamTricks: [...state.handScore.teamTricks] as [number, number] },
    matchScore: { ...state.matchScore, teamHands: [...state.matchScore.teamHands] as [number, number] },
    currentTrick: state.currentTrick
      ? {
          leader: state.currentTrick.leader,
          ledSuit: state.currentTrick.ledSuit,
          plays: state.currentTrick.plays.map((p) => ({
            seat: p.seat,
            card: { ...p.card },
            chameleon: p.transformedByChameleon,
            transformedByChameleon: p.transformedByChameleon,
            effectiveSuit: p.effectiveSuit,
            specials: [...p.specials],
            strengthDelta: p.strengthDelta,
          })),
          silence: state.currentTrick.silence,
        }
      : null,
    trickPreview,
    opponentHandSizes: state.hands.map((h, i) =>
      state.phase === "hunter_selection" ? (i === state.hunterSelectorSeat ? 5 : 0) : h.length,
    ),
    opponentSpecialCounts: state.specialHands.map((h, i) => (i === seat ? h.length : 0)),
    pendingSpecial: false,
    specialDrawAttemptedThisTurn: state.specialDrawAttemptedThisTurn && state.currentPlayer === seat,
    canRequestSpecialDraw: drawGate.ok,
    pendingSpecialDiscard:
      state.pendingSpecialDiscard?.seat === seat ? state.pendingSpecialDiscard : null,
    specialMaxInventory: state.config.specialMaxInventory,
    specialDrawChance: state.config.specialDrawChance,
    matchWinnerTeam: state.matchWinnerTeam,
    seatStats: state.seatStats.map((s) => ({ ...s })),
    mvpParticipantIds: [...state.mvpParticipantIds],
    specialCardsEnabled: state.config.specialCardsEnabled,
    specialRulesVersion: state.config.specialRulesVersion,
    tricksPlayedThisHand: state.tricksPlayedThisHand,
  };
}
