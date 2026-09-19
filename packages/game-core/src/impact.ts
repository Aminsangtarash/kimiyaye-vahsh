import type { AnimalRealm } from "@kv/contracts";
import { TEAM_BY_SEAT } from "@kv/contracts";
import type { GameState, SeatStats } from "./types.js";

export function participantIdForSeat(seat: number): string {
  return `seat-${seat}`;
}

export function applyTrickWonImpact(state: GameState, winnerSeat: number): GameState {
  const w = state.config.impact.trickWon;
  const seatStats = state.seatStats.map((s, i) => {
    if (i !== winnerSeat) return s;
    return {
      ...s,
      tricksWon: s.tricksWon + 1,
      impactScore: s.impactScore + w,
    };
  });
  return { ...state, seatStats };
}

export function applyHumanTimeoutImpact(state: GameState, seat: number): GameState {
  const d = state.config.impact.humanTimeout;
  const seatStats = state.seatStats.map((s, i) => {
    if (i !== seat) return s;
    return {
      ...s,
      humanTimeouts: s.humanTimeouts + 1,
      impactScore: s.impactScore + d,
    };
  });
  return { ...state, seatStats };
}

export function applySuccessfulSpecialImpact(state: GameState, seat: number): GameState {
  const w = state.config.impact.successfulSpecial;
  const seatStats = state.seatStats.map((s, i) => {
    if (i !== seat) return s;
    return {
      ...s,
      successfulSpecials: s.successfulSpecials + 1,
      impactScore: s.impactScore + w,
    };
  });
  return { ...state, seatStats };
}

export function applyLegendaryCounterImpact(state: GameState, seat: number): GameState {
  const w = state.config.impact.legendaryCounter;
  const seatStats = state.seatStats.map((s, i) => {
    if (i !== seat) return s;
    return {
      ...s,
      legendaryCounters: s.legendaryCounters + 1,
      impactScore: s.impactScore + w,
    };
  });
  return { ...state, seatStats };
}

/**
 * MVP among winning-team seats only.
 * Tie-break: tricksWon → successfulSpecials → fewer humanTimeouts → shared.
 */
export function selectMvpParticipantIds(state: GameState): string[] {
  const team = state.matchWinnerTeam;
  if (team === null) return [];
  const candidates = [0, 1, 2, 3].filter((seat) => TEAM_BY_SEAT[seat] === team);
  if (candidates.length === 0) return [];

  const rank = (seat: number) => {
    const s = state.seatStats[seat];
    return {
      seat,
      impact: s.impactScore,
      tricks: s.tricksWon,
      specs: s.successfulSpecials,
      timeouts: s.humanTimeouts,
    };
  };

  const ranked = candidates.map(rank).sort((a, b) => {
    if (b.impact !== a.impact) return b.impact - a.impact;
    if (b.tricks !== a.tricks) return b.tricks - a.tricks;
    if (b.specs !== a.specs) return b.specs - a.specs;
    if (a.timeouts !== b.timeouts) return a.timeouts - b.timeouts;
    return a.seat - b.seat;
  });

  const best = ranked[0];
  const tied = ranked.filter(
    (r) =>
      r.impact === best.impact &&
      r.tricks === best.tricks &&
      r.specs === best.specs &&
      r.timeouts === best.timeouts,
  );
  return tied.map((r) => participantIdForSeat(r.seat));
}

export function buildMatchParticipants(
  state: GameState,
  controllerTypes: Array<"human" | "bot"> = ["human", "human", "human", "human"],
) {
  return [0, 1, 2, 3].map((seat) => {
    const s: SeatStats = state.seatStats[seat];
    return {
      participantId: participantIdForSeat(seat),
      seat,
      teamId: TEAM_BY_SEAT[seat] as 0 | 1,
      realm: state.playerRealms[seat] as AnimalRealm,
      controllerType: controllerTypes[seat] ?? "human",
      tricksWon: s.tricksWon,
      successfulSpecials: s.successfulSpecials,
      legendaryCounters: s.legendaryCounters,
      teamAssists: s.teamAssists,
      humanTimeouts: s.humanTimeouts,
      impactScore: s.impactScore,
    };
  });
}
