import type { Suit } from "@kv/contracts";
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
  yourHand: AnimalInstance[];
  yourSpecials: SpecialInstance[];
  legalCardIds: string[];
  currentPlayer: number;
  superiorSuit: Suit | null;
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
}

export function projectForSeat(state: GameState, seat: number): PlayerGameView {
  const legal = legalAnimalPlays(state, seat);
  return {
    matchId: state.matchId,
    phase: state.phase,
    stateVersion: state.stateVersion,
    seat,
    team: seat % 2 === 0 ? 0 : 1,
    yourHand: state.hands[seat].map((c) => ({ ...c })),
    yourSpecials: state.specialHands[seat].map((s) => ({ ...s })),
    legalCardIds: legal.map((c) => c.instanceId),
    currentPlayer: state.currentPlayer,
    superiorSuit: state.superiorSuit,
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
    opponentHandSizes: state.hands.map((h, i) => (i === seat ? h.length : h.length)),
    pendingSpecial: state.pendingSpecial?.seat === seat,
    matchWinnerTeam: state.matchWinnerTeam,
  };
}
