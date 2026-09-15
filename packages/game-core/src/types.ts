import type { GamePhase, SpecialSlug, Suit } from "@kv/contracts";

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

export interface GameConfig {
  tricksToWinHand: number;
  handsToWinMatch: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  tricksToWinHand: 7,
  handsToWinMatch: 3,
};

export interface GameState {
  matchId: string;
  phase: GamePhase;
  config: GameConfig;
  seed: number;
  stateVersion: number;
  hands: AnimalInstance[][];
  specialHands: SpecialInstance[][];
  currentTrick: CurrentTrick | null;
  superiorSuit: Suit | null;
  superiorLockRemaining: number;
  pendingAnchorSeat: number | null;
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
  | { type: "SURRENDER"; seat: number };

export interface ActionResult {
  ok: boolean;
  error?: string;
  state: GameState;
  events?: EngineEvent[];
}

export type EngineEvent =
  | { type: "trick_won"; winnerSeat: number; team: number }
  | { type: "hand_won"; team: number }
  | { type: "match_won"; team: number }
  | { type: "scout_result"; seat: number; opponent: number; suit: Suit; count: number };
