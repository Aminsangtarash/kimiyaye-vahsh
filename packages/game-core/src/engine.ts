import { TEAM_BY_SEAT, type AnimalRealm, type Suit } from "@kv/contracts";
import {
  buildSpecialDeck,
  loadCatalog,
  type AnimalCatalogEntry,
  type GameCatalog,
} from "./catalog.js";
import { applyHumanTimeoutImpact, applyTrickWonImpact, selectMvpParticipantIds } from "./impact.js";
import { randomInt, SeededRandom, shuffle, type RandomSource } from "./rng.js";
import { resolveTrickWinner, teamForSeat } from "./trick.js";
import {
  DEFAULT_CONFIG,
  defaultRealmsBySeat,
  emptySeatStats,
  type AnimalInstance,
  type CurrentTrick,
  type GameAction,
  type GameConfig,
  type GameState,
  type ActionResult,
  type SpecialInstance,
  type EngineEvent,
} from "./types.js";

let instanceCounter = 0;
function nextInstanceId(prefix: string): string {
  instanceCounter += 1;
  return `${prefix}-${instanceCounter}`;
}

export function resetInstanceCounter(): void {
  instanceCounter = 0;
}

function animalFromCatalog(entry: AnimalCatalogEntry): AnimalInstance {
  return {
    instanceId: nextInstanceId("a"),
    catalogId: entry.id,
    slug: entry.slug,
    suit: entry.suit,
    displayRank: entry.displayRank,
    strength: entry.powerBarFill,
  };
}

export function createInitialState(
  matchId: string,
  seed: number,
  config: Partial<GameConfig> = {},
  playerRealms: AnimalRealm[] = defaultRealmsBySeat(),
): GameState {
  const merged: GameConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    impact: { ...DEFAULT_CONFIG.impact, ...(config.impact ?? {}) },
  };
  if (playerRealms.length !== 4 || new Set(playerRealms).size !== 4) {
    throw new Error("playerRealms must be four unique AnimalRealm values");
  }
  return {
    matchId,
    phase: "waiting",
    config: merged,
    seed,
    stateVersion: 0,
    playerRealms: [...playerRealms],
    hands: [[], [], [], []],
    specialHands: [[], [], [], []],
    currentTrick: null,
    hunterRealm: null,
    currentPlayer: 0,
    tricksPlayedThisHand: 0,
    handScore: { teamTricks: [0, 0] },
    matchScore: { teamHands: [0, 0] },
    lastTrickWinner: null,
    firstLeaderThisHand: 0,
    pendingSpecial: null,
    scoutInfo: { 0: [], 1: [], 2: [], 3: [] },
    surrenderTeam: null,
    matchWinnerTeam: null,
    seatStats: [0, 1, 2, 3].map(() => emptySeatStats()),
    mvpParticipantIds: [],
  };
}

function startTrick(state: GameState, leader: number): GameState {
  const hunterRealm = state.playerRealms[leader];
  return {
    ...state,
    hunterRealm,
    currentTrick: {
      leader,
      ledSuit: null,
      plays: [],
      silence: false,
      specialsUsedThisTrick: [false, false, false, false],
    },
    currentPlayer: leader,
    pendingSpecial: null,
  };
}

function dealHand(state: GameState, catalog: GameCatalog, rng: RandomSource): GameState {
  const animals = catalog.animals.map(animalFromCatalog);
  const shuffled = shuffle(animals, rng);
  const hands: AnimalInstance[][] = [[], [], [], []];
  shuffled.forEach((card, i) => {
    hands[i % 4].push(card);
  });

  let specialHands: SpecialInstance[][] = [[], [], [], []];
  if (state.config.specialCardsEnabled) {
    const specDeck = shuffle(
      buildSpecialDeck(catalog).map((slug) => ({
        instanceId: nextInstanceId("s"),
        slug,
      })),
      rng,
    );
    for (let p = 0; p < 4; p++) {
      specialHands[p].push(specDeck.pop()!, specDeck.pop()!);
    }
  }

  const leader =
    state.lastTrickWinner ?? state.firstLeaderThisHand ?? randomInt(rng, 0, 3);
  let next: GameState = {
    ...state,
    phase: "playing",
    hands,
    specialHands,
    currentTrick: null,
    hunterRealm: null,
    currentPlayer: leader,
    tricksPlayedThisHand: 0,
    handScore: { teamTricks: [0, 0] },
    pendingSpecial: null,
    firstLeaderThisHand: leader,
  };
  next = startTrick(next, leader);
  return next;
}

function bump(state: GameState): GameState {
  return { ...state, stateVersion: state.stateVersion + 1 };
}

function hasSuit(hand: AnimalInstance[], suit: Suit): boolean {
  return hand.some((c) => c.suit === suit);
}

export function legalAnimalPlays(state: GameState, seat: number): AnimalInstance[] {
  if (state.phase !== "playing" || state.pendingSpecial) return [];
  if (state.currentPlayer !== seat) return [];
  const hand = state.hands[seat];
  if (!state.currentTrick || state.currentTrick.plays.length === 0) {
    return [...hand];
  }
  const led = state.currentTrick.ledSuit!;
  const same = hand.filter((c) => c.suit === led);
  return same.length > 0 ? same : [...hand];
}

export function canDeclareChameleon(state: GameState, seat: number, card: AnimalInstance): boolean {
  if (!state.config.specialCardsEnabled) return false;
  const trick = state.currentTrick;
  if (!trick || trick.plays.length === 0) return false;
  const led = trick.ledSuit!;
  if (hasSuit(state.hands[seat], led)) return false;
  return card.suit !== led;
}

function finishTrick(state: GameState): { state: GameState; events: EngineEvent[] } {
  const trick = state.currentTrick!;
  const hunter = state.hunterRealm;
  const { winnerSeat } = resolveTrickWinner(trick, hunter);
  const team = teamForSeat(winnerSeat);
  const nextHunter = state.playerRealms[winnerSeat];
  const events: EngineEvent[] = [
    { type: "trick_won", winnerSeat, team, nextHunterRealm: nextHunter },
  ];

  let next = applyTrickWonImpact(state, winnerSeat);
  events.push({
    type: "impact",
    seat: winnerSeat,
    reason: "TRICK_WON",
    delta: state.config.impact.trickWon,
  });

  const handScore = {
    ...next.handScore,
    teamTricks: [...next.handScore.teamTricks] as [number, number],
  };
  handScore.teamTricks[team] += 1;

  next = {
    ...next,
    phase: "playing",
    currentTrick: null,
    handScore,
    tricksPlayedThisHand: next.tricksPlayedThisHand + 1,
    lastTrickWinner: winnerSeat,
    hunterRealm: nextHunter,
    currentPlayer: winnerSeat,
    pendingSpecial: null,
  };

  if (
    handScore.teamTricks[0] >= next.config.tricksToWinHand ||
    handScore.teamTricks[1] >= next.config.tricksToWinHand
  ) {
    const handWinner = handScore.teamTricks[0] >= next.config.tricksToWinHand ? 0 : 1;
    events.push({ type: "hand_won", team: handWinner });
    const matchScore = {
      ...next.matchScore,
      teamHands: [...next.matchScore.teamHands] as [number, number],
    };
    matchScore.teamHands[handWinner] += 1;
    const matchDone = matchScore.teamHands[handWinner] >= next.config.handsToWinMatch;
    next = {
      ...next,
      phase: matchDone ? "match_complete" : "hand_complete",
      matchScore,
      matchWinnerTeam: matchDone ? handWinner : null,
    };
    if (matchDone) {
      next = { ...next, mvpParticipantIds: selectMvpParticipantIds(next) };
      events.push({ type: "match_won", team: handWinner });
    } else {
      next = dealHand(next, loadCatalog(), new SeededRandom(state.seed + state.stateVersion));
      events.push({
        type: "trick_started",
        leaderSeat: next.currentTrick!.leader,
        hunterRealm: next.hunterRealm!,
      });
    }
    return { state: bump(next), events };
  }

  next = startTrick(next, winnerSeat);
  events.push({
    type: "trick_started",
    leaderSeat: winnerSeat,
    hunterRealm: next.hunterRealm!,
  });
  return { state: bump(next), events };
}

function applyPlayCard(
  state: GameState,
  seat: number,
  cardInstanceId: string,
  declareChameleon?: boolean,
): ActionResult {
  const hand = state.hands[seat];
  const card = hand.find((c) => c.instanceId === cardInstanceId);
  if (!card) return { ok: false, error: "Card not in hand", state };
  const legal = legalAnimalPlays(state, seat);
  if (!legal.some((c) => c.instanceId === cardInstanceId)) {
    const trick = state.currentTrick;
    if (
      trick &&
      trick.plays.length > 0 &&
      trick.ledSuit &&
      hasSuit(hand, trick.ledSuit) &&
      card.suit !== trick.ledSuit
    ) {
      return { ok: false, error: "Must follow suit", state };
    }
    return { ok: false, error: "Illegal card play", state };
  }
  if (declareChameleon && !canDeclareChameleon(state, seat, card)) {
    return { ok: false, error: "Chameleon not legal", state };
  }
  let trick = state.currentTrick;
  if (!trick) {
    return { ok: false, error: "No active trick", state };
  }
  const ledSuit = trick.plays.length === 0 ? card.suit : trick.ledSuit!;
  if (trick.plays.length > 0 && hasSuit(state.hands[seat], ledSuit) && card.suit !== ledSuit) {
    return { ok: false, error: "Must follow suit", state };
  }
  const newHand = state.hands[seat].filter((c) => c.instanceId !== cardInstanceId);
  const hands = state.hands.map((h, i) => (i === seat ? newHand : h)) as AnimalInstance[][];
  const play = {
    seat,
    card,
    chameleon: Boolean(declareChameleon) && state.config.specialCardsEnabled,
    strengthDelta: 0,
  };
  const plays = [...trick.plays, play];
  const nextTrick: CurrentTrick = {
    ...trick,
    ledSuit: trick.plays.length === 0 ? card.suit : trick.ledSuit,
    plays,
  };
  if (plays.length >= 4) {
    // Hold the completed trick on the table; server/UI resolve after a short beat.
    return {
      ok: true,
      state: bump({
        ...state,
        hands,
        currentTrick: nextTrick,
        phase: "resolving_trick",
        pendingSpecial: null,
      }),
      events: [{ type: "trick_awaiting_resolve" }],
    };
  }
  const nextPlayer = (trick.leader + plays.length) % 4;
  let pendingSpecial = null;
  if (
    state.config.specialCardsEnabled &&
    !nextTrick.silence &&
    !nextTrick.specialsUsedThisTrick[seat]
  ) {
    pendingSpecial = { seat, kind: "post_play" as const };
  }
  return {
    ok: true,
    state: bump({
      ...state,
      hands,
      currentTrick: nextTrick,
      currentPlayer: pendingSpecial ? seat : nextPlayer,
      pendingSpecial,
    }),
  };
}

function findSpecial(hand: SpecialInstance[], id: string): SpecialInstance | undefined {
  return hand.find((s) => s.instanceId === id);
}

function advanceAfterSpecial(_state: GameState, _seat: number): null {
  return null;
}

function applySpecial(
  state: GameState,
  seat: number,
  specialInstanceId: string,
  targetSeat?: number,
  targetSuit?: Suit,
  targetPlayIndex?: number,
): ActionResult {
  if (!state.config.specialCardsEnabled) {
    return { ok: false, error: "Special cards disabled in V2 playable mode", state };
  }
  const spec = findSpecial(state.specialHands[seat], specialInstanceId);
  if (!spec) return { ok: false, error: "Special not in hand", state };
  if (state.currentTrick?.specialsUsedThisTrick[seat]) {
    return { ok: false, error: "Special already used this trick", state };
  }
  const removeSpecial = (st: GameState): GameState => ({
    ...st,
    specialHands: st.specialHands.map((h, i) =>
      i === seat ? h.filter((s) => s.instanceId !== specialInstanceId) : h,
    ) as SpecialInstance[][],
  });
  const markUsed = (st: GameState): GameState => {
    if (!st.currentTrick) return st;
    const used = [...st.currentTrick.specialsUsedThisTrick] as boolean[];
    used[seat] = true;
    return { ...st, currentTrick: { ...st.currentTrick, specialsUsedThisTrick: used } };
  };

  const slug = spec.slug;

  if (slug === "scout") {
    if (state.phase !== "playing" || state.currentTrick?.plays.length) {
      return { ok: false, error: "Scout only between tricks on your turn", state };
    }
    if (state.currentPlayer !== seat) return { ok: false, error: "Not your turn", state };
    if (targetSeat === undefined || targetSuit === undefined) {
      return { ok: false, error: "Scout requires target seat and suit", state };
    }
    const count = state.hands[targetSeat].filter((c) => c.suit === targetSuit).length;
    const info = [...(state.scoutInfo[seat] ?? []), { opponent: targetSeat, suit: targetSuit, count }];
    return {
      ok: true,
      state: bump(removeSpecial(markUsed({ ...state, scoutInfo: { ...state.scoutInfo, [seat]: info } }))),
      events: [{ type: "scout_result", seat, opponent: targetSeat, suit: targetSuit, count }],
    };
  }

  /** @deprecated Anchor no longer locks trump under Hunter Realm rules — consume card as no-op for legacy decks */
  if (slug === "anchor") {
    return {
      ok: true,
      state: bump(removeSpecial(markUsed({ ...state, pendingSpecial: null }))),
    };
  }

  const trick = state.currentTrick;
  if (!trick) return { ok: false, error: "No active trick", state };
  if (trick.silence) return { ok: false, error: "Silence active", state };

  if (slug === "silence") {
    return {
      ok: true,
      state: bump(
        removeSpecial(
          markUsed({
            ...state,
            currentTrick: { ...trick, silence: true },
            pendingSpecial: advanceAfterSpecial(state, seat),
          }),
        ),
      ),
    };
  }

  if (slug === "adrenaline") {
    const selfPlay = trick.plays.find((p) => p.seat === seat);
    if (!selfPlay) return { ok: false, error: "Play animal first", state };
    if (selfPlay.strengthDelta >= 2) return { ok: false, error: "Already buffed", state };
    const plays = trick.plays.map((p) =>
      p.seat === seat ? { ...p, strengthDelta: p.strengthDelta + 2 } : p,
    );
    return {
      ok: true,
      state: bump(
        removeSpecial(
          markUsed({
            ...state,
            currentTrick: { ...trick, plays },
            pendingSpecial: advanceAfterSpecial(state, seat),
          }),
        ),
      ),
    };
  }

  if (slug === "poison") {
    if (targetPlayIndex === undefined) return { ok: false, error: "Poison needs target play", state };
    const target = trick.plays[targetPlayIndex];
    if (!target || teamForSeat(target.seat) === teamForSeat(seat)) {
      return { ok: false, error: "Invalid poison target", state };
    }
    if (target.strengthDelta <= -2) return { ok: false, error: "Already poisoned", state };
    const plays = trick.plays.map((p, i) =>
      i === targetPlayIndex ? { ...p, strengthDelta: p.strengthDelta - 2 } : p,
    );
    return {
      ok: true,
      state: bump(
        removeSpecial(
          markUsed({
            ...state,
            currentTrick: { ...trick, plays },
            pendingSpecial: advanceAfterSpecial(state, seat),
          }),
        ),
      ),
    };
  }

  if (slug === "shield") {
    const plays = trick.plays.map((p) => (p.seat === seat ? { ...p, strengthDelta: 0 } : p));
    return {
      ok: true,
      state: bump(
        removeSpecial(
          markUsed({
            ...state,
            currentTrick: { ...trick, plays },
            pendingSpecial: advanceAfterSpecial(state, seat),
          }),
        ),
      ),
    };
  }

  if (slug === "chameleon") {
    return { ok: false, error: "Chameleon is declared with PLAY_CARD", state };
  }

  return { ok: false, error: "Unknown special", state };
}

function passSpecial(state: GameState, seat: number): ActionResult {
  if (!state.pendingSpecial || state.pendingSpecial.seat !== seat) {
    return { ok: false, error: "No special window", state };
  }
  const trick = state.currentTrick!;
  const nextPlayer = (trick.leader + trick.plays.length) % 4;
  return {
    ok: true,
    state: bump({ ...state, pendingSpecial: null, currentPlayer: nextPlayer }),
  };
}

export function applyAction(
  state: GameState,
  action: GameAction,
  catalog: GameCatalog = loadCatalog(),
  rng?: RandomSource,
): ActionResult {
  if (state.phase === "match_complete") {
    return { ok: false, error: "Match complete", state };
  }
  switch (action.type) {
    case "START_MATCH": {
      if (state.phase !== "waiting" && state.phase !== "hand_complete") {
        return { ok: false, error: "Cannot start now", state };
      }
      const r = rng ?? new SeededRandom(state.seed);
      const leader = action.firstLeader ?? randomInt(r, 0, 3);
      const dealt = dealHand(
        {
          ...state,
          firstLeaderThisHand: leader,
          lastTrickWinner: null,
          phase: "dealing",
          seatStats:
            state.phase === "waiting"
              ? [0, 1, 2, 3].map(() => emptySeatStats())
              : state.seatStats,
        },
        catalog,
        r,
      );
      const events: EngineEvent[] = [
        {
          type: "trick_started",
          leaderSeat: dealt.currentTrick!.leader,
          hunterRealm: dealt.hunterRealm!,
        },
      ];
      return { ok: true, state: bump(dealt), events };
    }
    case "PLAY_CARD":
      return applyPlayCard(state, action.seat, action.cardInstanceId, action.declareChameleon);
    case "RESOLVE_TRICK": {
      if (state.phase !== "resolving_trick" || !state.currentTrick || state.currentTrick.plays.length < 4) {
        return { ok: false, error: "No trick to resolve", state };
      }
      const { state: resolved, events } = finishTrick(state);
      return { ok: true, state: resolved, events };
    }
    case "PLAY_SPECIAL":
      return applySpecial(
        state,
        action.seat,
        action.specialInstanceId,
        action.targetSeat,
        action.targetSuit,
        action.targetPlayIndex,
      );
    case "PASS_SPECIAL":
      return passSpecial(state, action.seat);
    case "HUMAN_TIMEOUT": {
      let s = applyHumanTimeoutImpact(state, action.seat);
      if (s.pendingSpecial && s.pendingSpecial.seat === action.seat) {
        return passSpecial(s, action.seat);
      }
      if (s.currentPlayer !== action.seat || s.phase !== "playing") {
        return { ok: true, state: bump(s) };
      }
      const legal = legalAnimalPlays(s, action.seat);
      if (legal.length === 0) return { ok: true, state: bump(s) };
      const lowest = [...legal].sort((a, b) => a.strength - b.strength)[0];
      return applyPlayCard(s, action.seat, lowest.instanceId, false);
    }
    case "SURRENDER": {
      const team = TEAM_BY_SEAT[action.seat] as 0 | 1;
      const winner = team === 0 ? 1 : 0;
      const next = {
        ...state,
        phase: "match_complete" as const,
        surrenderTeam: team,
        matchWinnerTeam: winner,
      };
      return {
        ok: true,
        state: bump({ ...next, mvpParticipantIds: selectMvpParticipantIds(next) }),
        events: [{ type: "match_won", team: winner }],
      };
    }
    default:
      return { ok: false, error: "Unknown action", state };
  }
}
