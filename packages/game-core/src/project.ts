import type { AnimalRealm, Suit } from "@kv/contracts";
import { TEAM_BY_SEAT } from "@kv/contracts";
import type { AnimalInstance, GameState, SpecialInstance } from "./types.js";
import { legalAnimalPlays } from "./engine.js";

export interface PublicTrickPlay {
  seat: number;
  card: Omit<AnimalInstance, "instanceId"> & { instanceId: string };
  chameleon: boolean;
  strengthDelta: number;
}

export interface PlayerGameView {
  matchId: string;
  phase: GameState["phase"];
  stateVersion: number;
  seat: number;
  team: 0 | 1;
  yourRealm: AnimalRealm;
  playerRealms: AnimalRealm[];
  yourHand: AnimalInstance[];
  yourSpecials: SpecialInstance[];
  legalCardIds: string[];
  currentPlayer: number;
  currentLeader: number | null;
  /** Current trick trump = leader's realm */
  hunterRealm: AnimalRealm | null;
  lastTrickWinner: number | null;
  handScore: GameState["handScore"];
  matchScore: GameState["matchScore"];
  currentTrick: {
    leader: number;
    ledSuit: Suit | null;
    plays: PublicTrickPlay[];
    silence: boolean;
  } | null;
  opponentHandSizes: number[];
  pendingSpecial: boolean;
  matchWinnerTeam: number | null;
  seatStats: GameState["seatStats"];
  mvpParticipantIds: string[];
  specialCardsEnabled: boolean;
}

/** Player-safe projection — never includes opponent hands or deck. Safe for bots. */
export function projectForSeat(state: GameState, seat: number): PlayerGameView {
  const legal = legalAnimalPlays(state, seat);
  return {
    matchId: state.matchId,
    phase: state.phase,
    stateVersion: state.stateVersion,
    seat,
    team: TEAM_BY_SEAT[seat] as 0 | 1,
    yourRealm: state.playerRealms[seat],
    playerRealms: [...state.playerRealms],
    yourHand: state.hands[seat].map((c) => ({ ...c })),
    yourSpecials: state.specialHands[seat].map((s) => ({ ...s })),
    legalCardIds: legal.map((c) => c.instanceId),
    currentPlayer: state.currentPlayer,
    currentLeader: state.currentTrick?.leader ?? state.lastTrickWinner,
    hunterRealm: state.hunterRealm,
    lastTrickWinner: state.lastTrickWinner,
    handScore: { ...state.handScore, teamTricks: [...state.handScore.teamTricks] as [number, number] },
    matchScore: { ...state.matchScore, teamHands: [...state.matchScore.teamHands] as [number, number] },
    currentTrick: state.currentTrick
      ? {
          leader: state.currentTrick.leader,
          ledSuit: state.currentTrick.ledSuit,
          plays: state.currentTrick.plays.map((p) => ({
            seat: p.seat,
            card: { ...p.card },
            chameleon: p.chameleon,
            strengthDelta: p.strengthDelta,
          })),
          silence: state.currentTrick.silence,
        }
      : null,
    opponentHandSizes: state.hands.map((h) => h.length),
    pendingSpecial: state.pendingSpecial?.seat === seat,
    matchWinnerTeam: state.matchWinnerTeam,
    seatStats: state.seatStats.map((s) => ({ ...s })),
    mvpParticipantIds: [...state.mvpParticipantIds],
    specialCardsEnabled: state.config.specialCardsEnabled,
  };
}
