import type { AnimalRealm, GamePhase, SpecialSlug, Suit } from "@kv/contracts";
import { ALL_ANIMAL_REALMS } from "@kv/contracts";

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
  chameleon: boolean;
  strengthDelta: number;
}

export interface PendingSpecialWindow {
  seat: number;
  kind: "post_play" | "reaction_poison" | "between_tricks";
  targetPlayIndex?: number;
}

export interface CurrentTrick {
  leader: number;
  ledSuit: Suit | null;
  plays: TrickCardPlay[];
  silence: boolean;
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
  /** Legacy specials — V2 playable default false */
  specialCardsEnabled: boolean;
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
  specialCardsEnabled: false,
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
  /** Exactly one of each realm; public */
  playerRealms: AnimalRealm[];
  hands: AnimalInstance[][];
  specialHands: SpecialInstance[][];
  currentTrick: CurrentTrick | null;
  /** Trump for the current/next trick = leader's represented realm */
  hunterRealm: AnimalRealm | null;
  currentPlayer: number;
  tricksPlayedThisHand: number;
  handScore: HandScore;
  matchScore: MatchScore;
  lastTrickWinner: number | null;
  firstLeaderThisHand: number;
  pendingSpecial: PendingSpecialWindow | null;
  scoutInfo: Record<number, { opponent: number; suit: Suit; count: number }[]>;
  surrenderTeam: number | null;
  matchWinnerTeam: number | null;
  seatStats: SeatStats[];
  mvpParticipantIds: string[];
}

export type GameAction =
  | { type: "START_MATCH"; firstLeader?: number }
  | { type: "PLAY_CARD"; seat: number; cardInstanceId: string; declareChameleon?: boolean }
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
  | { type: "RESOLVE_TRICK" };

export interface ActionResult {
  ok: boolean;
  error?: string;
  state: GameState;
  events?: EngineEvent[];
}

export type EngineEvent =
  | { type: "trick_started"; leaderSeat: number; hunterRealm: AnimalRealm }
  | { type: "trick_awaiting_resolve" }
  | { type: "trick_won"; winnerSeat: number; team: number; nextHunterRealm: AnimalRealm }
  | { type: "hand_won"; team: number }
  | { type: "match_won"; team: number }
  | { type: "scout_result"; seat: number; opponent: number; suit: Suit; count: number }
  | { type: "impact"; seat: number; reason: string; delta: number };
