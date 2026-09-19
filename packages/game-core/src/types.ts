import type { AnimalRealm, GamePhase, SpecialSlug, Suit } from "@kv/contracts";
import { ALL_ANIMAL_REALMS } from "@kv/contracts";
import {
  DEFAULT_SPECIAL_POOL_WEIGHTS,
  SPECIAL_DRAW_CHANCE_DEFAULT,
  SPECIAL_MAX_INVENTORY,
  SPECIAL_RULES_VERSION,
} from "./specials/constants.js";

export interface AnimalInstance {
  instanceId: string;
  catalogId: string;
  slug: string;
  suit: Suit;
  displayRank: string;
  strength: number;
}

export interface SpecialInstance {
  instanceId: string;
  slug: SpecialSlug;
}

export interface TrickCardPlay {
  seat: number;
  card: AnimalInstance;
  /** Specials attached when this animal was played (public). */
  specials: SpecialSlug[];
  /** Effective suit snapshot at play time (Chameleon applied then). */
  effectiveSuit: Suit;
  transformedByChameleon: boolean;
  /**
   * @deprecated legacy field — kept 0 under V1; resolution computes power.
   */
  strengthDelta: number;
  /** @deprecated use transformedByChameleon */
  chameleon: boolean;
}

export interface PendingSpecialDiscard {
  seat: number;
  /** Instance that forced the overflow (may be discarded or kept). */
  drawnInstanceId: string;
}

/** @deprecated legacy post-play window — unused under specialRulesVersion=1 */
export interface PendingSpecialWindow {
  seat: number;
  kind: "post_play" | "reaction_poison" | "between_tricks";
  targetPlayIndex?: number;
}

export interface CurrentTrick {
  leader: number;
  ledSuit: Suit | null;
  plays: TrickCardPlay[];
  /** @deprecated unused in V1 */
  silence: boolean;
  /** True once the seat has attached any special this trick. */
  specialsUsedThisTrick: boolean[];
}

export interface HandScore {
  teamTricks: [number, number];
}

export interface MatchScore {
  teamHands: [number, number];
}

export interface ImpactWeights {
  trickWon: number;
  successfulSpecial: number;
  legendaryCounter: number;
  teamAssist: number;
  humanTimeout: number;
}

export interface SeatStats {
  tricksWon: number;
  successfulSpecials: number;
  legendaryCounters: number;
  teamAssists: number;
  humanTimeouts: number;
  impactScore: number;
}

export interface GameConfig {
  tricksToWinHand: number;
  handsToWinMatch: number;
  /** Special Cards V1 enabled */
  specialCardsEnabled: boolean;
  specialRulesVersion: number;
  specialDrawChance: number;
  specialMaxInventory: number;
  specialPoolWeights: Record<SpecialSlug, number>;
  impact: ImpactWeights;
}

export const DEFAULT_IMPACT: ImpactWeights = {
  trickWon: 10,
  successfulSpecial: 10,
  legendaryCounter: 20,
  teamAssist: 10,
  humanTimeout: -5,
};

export const DEFAULT_CONFIG: GameConfig = {
  tricksToWinHand: 7,
  handsToWinMatch: 3,
  specialCardsEnabled: true,
  specialRulesVersion: SPECIAL_RULES_VERSION,
  specialDrawChance: SPECIAL_DRAW_CHANCE_DEFAULT,
  specialMaxInventory: SPECIAL_MAX_INVENTORY,
  specialPoolWeights: { ...DEFAULT_SPECIAL_POOL_WEIGHTS },
  impact: { ...DEFAULT_IMPACT },
};

export function emptySeatStats(): SeatStats {
  return {
    tricksWon: 0,
    successfulSpecials: 0,
    legendaryCounters: 0,
    teamAssists: 0,
    humanTimeouts: 0,
    impactScore: 0,
  };
}

/** Temporary deterministic seat→realm until lobby assigns (tests / fallback). */
export function defaultRealmsBySeat(): AnimalRealm[] {
  return [...ALL_ANIMAL_REALMS];
}

export interface GameState {
  matchId: string;
  phase: GamePhase;
  config: GameConfig;
  seed: number;
  stateVersion: number;
  /** Ruleset: 3 = fixed Hunter selected once per round (Hokm-inspired). */
  rulesVersion: number;
  /** Exactly one of each realm; public identity — NOT Hunter. */
  playerRealms: AnimalRealm[];
  hands: AnimalInstance[][];
  specialHands: SpecialInstance[][];
  /** Undealt cards after first-five to selector; emptied after remainder deal. */
  remainingDeck: AnimalInstance[];
  currentTrick: CurrentTrick | null;
  /** Fixed trump for the entire round (mutable only via successful Hunt Command). */
  hunterRealm: AnimalRealm | null;
  /** Seat that chooses Hunter and leads Trick 1 (= initial leader). */
  hunterSelectorSeat: number;
  hunterSelectedAt: number | null;
  hunterSelectionSource: "manual" | "auto_timeout" | "bot" | null;
  selectionStartedAt: number | null;
  currentPlayer: number;
  tricksPlayedThisHand: number;
  handScore: HandScore;
  matchScore: MatchScore;
  lastTrickWinner: number | null;
  /** Team that won the most recently completed hand (0/1); for result UI. */
  lastHandWinnerTeam: number | null;
  firstLeaderThisHand: number;
  /** One Special draw attempt allowed before the animal play on this turn. */
  specialDrawAttemptedThisTurn: boolean;
  /** Forced discard when inventory exceeds max after a successful draw. */
  pendingSpecialDiscard: PendingSpecialDiscard | null;
  /** @deprecated unused under V1 */
  pendingSpecial: PendingSpecialWindow | null;
  /** @deprecated legacy scout */
  scoutInfo: Record<number, { opponent: number; suit: Suit; count: number }[]>;
  surrenderTeam: number | null;
  matchWinnerTeam: number | null;
  seatStats: SeatStats[];
  mvpParticipantIds: string[];
}

export type GameAction =
  | { type: "START_MATCH"; firstLeader?: number }
  | {
      type: "SELECT_HUNTER_REALM";
      seat: number;
      realm: AnimalRealm;
      source?: "manual" | "auto_timeout" | "bot";
    }
  | {
      type: "PLAY_CARD";
      seat: number;
      cardInstanceId: string;
      specialInstanceIds?: string[];
      declareChameleon?: boolean;
    }
  | { type: "REQUEST_SPECIAL_DRAW"; seat: number }
  | { type: "DISCARD_SPECIAL"; seat: number; specialInstanceId: string }
  | {
      type: "PLAY_SPECIAL";
      seat: number;
      specialInstanceId: string;
      targetSeat?: number;
      targetSuit?: Suit;
      targetPlayIndex?: number;
    }
  | { type: "PASS_SPECIAL"; seat: number }
  | { type: "SURRENDER"; seat: number }
  | { type: "HUMAN_TIMEOUT"; seat: number }
  | { type: "RESOLVE_TRICK" }
  | { type: "CONTINUE_HAND" };

export interface ActionResult {
  ok: boolean;
  error?: string;
  state: GameState;
  events?: EngineEvent[];
}

export type EngineEvent =
  | { type: "round_started"; leaderSeat: number }
  | { type: "initial_five_dealt"; selectorSeat: number }
  | { type: "hunter_selection_started"; selectorSeat: number }
  | {
      type: "hunter_realm_selected";
      selectorSeat: number;
      hunterRealm: AnimalRealm;
      autoSelected: boolean;
      source: "manual" | "auto_timeout" | "bot";
    }
  | { type: "remainder_dealt" }
  | { type: "trick_started"; leaderSeat: number; hunterRealm: AnimalRealm }
  | { type: "trick_awaiting_resolve" }
  | { type: "trick_won"; winnerSeat: number; team: number }
  | { type: "hand_won"; team: number }
  | { type: "match_won"; team: number }
  | { type: "SPECIAL_DRAW_ATTEMPTED"; seat: number }
  | { type: "SPECIAL_DRAW_FAILED"; seat: number }
  | { type: "SPECIAL_DRAW_SUCCEEDED"; seat: number; slug: SpecialSlug; instanceId: string }
  | { type: "SPECIAL_DISCARDED"; seat: number; slug: SpecialSlug; instanceId: string }
  | { type: "SPECIAL_PLAYED"; seat: number; slug: SpecialSlug; instanceId: string }
  | { type: "SPECIAL_RESOLVED"; seat: number; slug: SpecialSlug; success: boolean }
  | { type: "SPECIAL_FAILED"; seat: number; slug: SpecialSlug; reason: string }
  | { type: "CHAMELEON_APPLIED"; seat: number; effectiveSuit: Suit }
  | { type: "ARMAGEDDON_DESTROYED_A"; seat: number; targetSeat: number }
  | { type: "INVERSION_APPLIED" }
  | { type: "INVERSION_CANCELLED_BY_A"; seat: number }
  | { type: "DOPING_APPLIED"; seat: number; delta: number }
  | { type: "TRAP_APPLIED"; seat: number; delta: number }
  | {
      type: "TEAM_BOND_CREATED";
      team: number;
      seats: [number, number];
      fusionPower: number;
      effectiveSuit: Suit;
      showsFusionBeast: boolean;
    }
  | { type: "TEAM_BOND_FAILED"; seat: number; reason: string }
  | {
      type: "HUNT_COMMAND_PENDING";
      seat: number;
      proposedHunter: AnimalRealm;
    }
  | {
      type: "HUNT_COMMAND_SUCCEEDED";
      previousHunterRealm: AnimalRealm;
      newHunterRealm: AnimalRealm;
      initiatorParticipantId: string;
    }
  | { type: "HUNT_COMMAND_FAILED"; seat: number; reason: string }
  | { type: "scout_result"; seat: number; opponent: number; suit: Suit; count: number }
  | { type: "impact"; seat: number; reason: string; delta: number };
