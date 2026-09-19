import { TEAM_BY_SEAT, RULES_VERSION, type AnimalRealm, type SpecialSlug, type Suit } from "@kv/contracts";
import { loadCatalog, type AnimalCatalogEntry, type GameCatalog } from "./catalog.js";
import {
  applyHumanTimeoutImpact,
  applyLegendaryCounterImpact,
  applySuccessfulSpecialImpact,
  applyTrickWonImpact,
  selectMvpParticipantIds,
} from "./impact.js";
import { chooseHunterRealm } from "./hunterSelect.js";
import { randomInt, SeededRandom, shuffle, type RandomSource } from "./rng.js";
import {
  canRequestSpecialDraw,
  chameleonEffectiveSuit,
  pickWeightedSpecial,
  resolveTrickPipeline,
  validateAttachedSpecials,
} from "./specials/index.js";
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

function mergeConfig(config: Partial<GameConfig> = {}): GameConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    specialPoolWeights: {
      ...DEFAULT_CONFIG.specialPoolWeights,
      ...(config.specialPoolWeights ?? {}),
    },
    impact: { ...DEFAULT_CONFIG.impact, ...(config.impact ?? {}) },
  };
}

export function createInitialState(
  matchId: string,
  seed: number,
  config: Partial<GameConfig> = {},
  playerRealms: AnimalRealm[] = defaultRealmsBySeat(),
): GameState {
  const merged = mergeConfig(config);
  if (playerRealms.length !== 4 || new Set(playerRealms).size !== 4) {
    throw new Error("playerRealms must be four unique AnimalRealm values");
  }
  return {
    matchId,
    phase: "waiting",
    config: merged,
    seed,
    stateVersion: 0,
    rulesVersion: RULES_VERSION,
    playerRealms: [...playerRealms],
    hands: [[], [], [], []],
    specialHands: [[], [], [], []],
    remainingDeck: [],
    currentTrick: null,
    hunterRealm: null,
    hunterSelectorSeat: 0,
    hunterSelectedAt: null,
    hunterSelectionSource: null,
    selectionStartedAt: null,
    currentPlayer: 0,
    tricksPlayedThisHand: 0,
    handScore: { teamTricks: [0, 0] },
    matchScore: { teamHands: [0, 0] },
    lastTrickWinner: null,
    lastHandWinnerTeam: null,
    firstLeaderThisHand: 0,
    specialDrawAttemptedThisTurn: false,
    pendingSpecialDiscard: null,
    pendingSpecial: null,
    scoutInfo: { 0: [], 1: [], 2: [], 3: [] },
    surrenderTeam: null,
    matchWinnerTeam: null,
    seatStats: [0, 1, 2, 3].map(() => emptySeatStats()),
    mvpParticipantIds: [],
  };
}

/** Start a new trick — Hunter Realm stays fixed unless Hunt Command succeeded previously. */
function startTrick(state: GameState, leader: number): GameState {
  if (!state.hunterRealm) {
    throw new Error("Cannot start trick without fixed hunterRealm");
  }
  return {
    ...state,
    currentTrick: {
      leader,
      ledSuit: null,
      plays: [],
      silence: false,
      specialsUsedThisTrick: [false, false, false, false],
    },
    currentPlayer: leader,
    pendingSpecial: null,
    specialDrawAttemptedThisTurn: false,
    pendingSpecialDiscard: null,
  };
}

/**
 * Shuffle once, deal first 5 to Hunter Selector only; hold remainder for after selection.
 * Specials are NOT dealt — V1 uses per-turn draw.
 */
function beginRoundDeal(state: GameState, catalog: GameCatalog, rng: RandomSource): GameState {
  const animals = catalog.animals.map(animalFromCatalog);
  const shuffled = shuffle(animals, rng);
  const leader =
    state.lastTrickWinner ?? state.firstLeaderThisHand ?? randomInt(rng, 0, 3);

  const hands: AnimalInstance[][] = [[], [], [], []];
  const firstFive = shuffled.slice(0, 5);
  const remaining = shuffled.slice(5);
  hands[leader] = firstFive;

  return {
    ...state,
    phase: "hunter_selection",
    hands,
    specialHands: [[], [], [], []],
    remainingDeck: remaining,
    currentTrick: null,
    hunterRealm: null,
    hunterSelectorSeat: leader,
    hunterSelectedAt: null,
    hunterSelectionSource: null,
    selectionStartedAt: Date.now(),
    currentPlayer: leader,
    tricksPlayedThisHand: 0,
    handScore: { teamTricks: [0, 0] },
    pendingSpecial: null,
    specialDrawAttemptedThisTurn: false,
    pendingSpecialDiscard: null,
    firstLeaderThisHand: leader,
    lastTrickWinner: null,
    lastHandWinnerTeam: null,
  };
}

function dealRemainderAndStart(state: GameState): GameState {
  const selector = state.hunterSelectorSeat;
  const deck = [...state.remainingDeck];
  if (deck.length !== 47) {
    throw new Error(`Expected 47 remaining cards, got ${deck.length}`);
  }
  const hands = state.hands.map((h) => [...h]) as AnimalInstance[][];
  for (let i = 0; i < 8; i++) {
    hands[selector].push(deck.shift()!);
  }
  for (let offset = 1; offset <= 3; offset++) {
    const seat = (selector + offset) % 4;
    for (let i = 0; i < 13; i++) {
      hands[seat].push(deck.shift()!);
    }
  }
  for (let s = 0; s < 4; s++) {
    if (hands[s].length !== 13) {
      throw new Error(`Seat ${s} has ${hands[s].length} cards`);
    }
  }

  let next: GameState = {
    ...state,
    phase: "playing",
    hands,
    remainingDeck: [],
    currentPlayer: selector,
    specialDrawAttemptedThisTurn: false,
    pendingSpecialDiscard: null,
  };
  next = startTrick(next, selector);
  return next;
}

function bump(state: GameState): GameState {
  return { ...state, stateVersion: state.stateVersion + 1 };
}

function hasSuit(hand: AnimalInstance[], suit: Suit): boolean {
  return hand.some((c) => c.suit === suit);
}

export function legalAnimalPlays(state: GameState, seat: number): AnimalInstance[] {
  if (state.phase !== "playing") return [];
  if (state.pendingSpecialDiscard) return [];
  if (state.currentPlayer !== seat) return [];
  const hand = state.hands[seat];
  if (!state.currentTrick || state.currentTrick.plays.length === 0) {
    return [...hand];
  }
  const led = state.currentTrick.ledSuit!;
  const same = hand.filter((c) => c.suit === led);
  return same.length > 0 ? same : [...hand];
}

/** @deprecated V1 uses chameleon special card */
export function canDeclareChameleon(state: GameState, seat: number, card: AnimalInstance): boolean {
  if (!state.config.specialCardsEnabled) return false;
  const trick = state.currentTrick;
  if (!trick || trick.plays.length === 0) return false;
  const led = trick.ledSuit!;
  if (hasSuit(state.hands[seat], led)) return false;
  return card.suit !== led;
}

function applySelectHunterRealm(
  state: GameState,
  seat: number,
  realm: AnimalRealm,
  source: "manual" | "auto_timeout" | "bot" = "manual",
): ActionResult {
  if (state.phase !== "hunter_selection") {
    return { ok: false, error: "Not in hunter selection", state };
  }
  if (seat !== state.hunterSelectorSeat) {
    return { ok: false, error: "Only Hunter Selector may choose", state };
  }
  if (!["carnivore", "herbivore", "bird", "reptile"].includes(realm)) {
    return { ok: false, error: "Invalid realm", state };
  }

  const selected: GameState = {
    ...state,
    phase: "dealing_remainder",
    hunterRealm: realm,
    hunterSelectedAt: Date.now(),
    hunterSelectionSource: source,
  };
  const playing = dealRemainderAndStart(selected);
  const autoSelected = source === "auto_timeout" || source === "bot";
  const events: EngineEvent[] = [
    {
      type: "hunter_realm_selected",
      selectorSeat: seat,
      hunterRealm: realm,
      autoSelected,
      source,
    },
    { type: "remainder_dealt" },
    {
      type: "trick_started",
      leaderSeat: playing.currentTrick!.leader,
      hunterRealm: playing.hunterRealm!,
    },
  ];
  return { ok: true, state: bump(playing), events };
}

function finishTrick(state: GameState): { state: GameState; events: EngineEvent[] } {
  const trick = state.currentTrick!;
  const hunter = state.hunterRealm!;
  const pipeline = resolveTrickPipeline(trick, hunter, state.tricksPlayedThisHand);
  const winnerSeat = pipeline.winnerSeat;
  const team = pipeline.winningTeam;
  const events: EngineEvent[] = [
    ...pipeline.events,
    { type: "trick_won", winnerSeat, team },
  ];

  let next = applyTrickWonImpact(state, winnerSeat);
  events.push({
    type: "impact",
    seat: winnerSeat,
    reason: "TRICK_WON",
    delta: state.config.impact.trickWon,
  });

  // Successful specials + Armageddon legendary counter
  const rewarded = new Set<string>();
  for (const s of pipeline.successfulSpecials) {
    const key = `${s.seat}:${s.slug}`;
    if (rewarded.has(key)) continue;
    rewarded.add(key);
    if (s.slug === "null") continue;
    next = applySuccessfulSpecialImpact(next, s.seat);
    events.push({
      type: "impact",
      seat: s.seat,
      reason: "SUCCESSFUL_SPECIAL",
      delta: state.config.impact.successfulSpecial,
    });
    if (s.slug === "armageddon") {
      next = applyLegendaryCounterImpact(next, s.seat);
      events.push({
        type: "impact",
        seat: s.seat,
        reason: "LEGENDARY_COUNTER",
        delta: state.config.impact.legendaryCounter,
      });
    }
  }

  const handScore = {
    ...next.handScore,
    teamTricks: [...next.handScore.teamTricks] as [number, number],
  };
  handScore.teamTricks[team] += 1;

  let hunterRealm = next.hunterRealm;
  if (pipeline.huntCommand?.succeeded && pipeline.huntCommand.newHunter) {
    hunterRealm = pipeline.huntCommand.newHunter;
  }

  next = {
    ...next,
    phase: "playing",
    currentTrick: null,
    handScore,
    tricksPlayedThisHand: next.tricksPlayedThisHand + 1,
    lastTrickWinner: winnerSeat,
    currentPlayer: winnerSeat,
    pendingSpecial: null,
    specialDrawAttemptedThisTurn: false,
    pendingSpecialDiscard: null,
    hunterRealm,
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
      lastHandWinnerTeam: handWinner,
      currentTrick: null,
    };
    if (matchDone) {
      next = { ...next, mvpParticipantIds: selectMvpParticipantIds(next) };
      events.push({ type: "match_won", team: handWinner });
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
  specialInstanceIds?: string[],
): ActionResult {
  if (state.pendingSpecialDiscard) {
    return { ok: false, error: "Must discard a special first", state };
  }
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

  let trick = state.currentTrick;
  if (!trick) {
    return { ok: false, error: "No active trick", state };
  }

  const ids = specialInstanceIds ?? [];
  const attached: SpecialInstance[] = [];
  for (const id of ids) {
    const spec = state.specialHands[seat].find((s) => s.instanceId === id);
    if (!spec) return { ok: false, error: "Special not in hand", state };
    if (attached.some((a) => a.instanceId === id)) {
      return { ok: false, error: "Duplicate special", state };
    }
    attached.push(spec);
  }

  const legality = validateAttachedSpecials(state, seat, card, attached);
  if (!legality.ok) {
    return { ok: false, error: legality.reasonFa ?? legality.reason ?? "Illegal specials", state };
  }

  const useChameleon = attached.some((s) => s.slug === "chameleon");
  // When attaching chameleon, card may be off-suit while void — already legal via legalAnimalPlays
  const suitSnap = chameleonEffectiveSuit(trick, state.hunterRealm, card.suit, useChameleon);

  const ledSuit = trick.plays.length === 0 ? card.suit : trick.ledSuit!;
  if (trick.plays.length > 0 && hasSuit(state.hands[seat], ledSuit) && card.suit !== ledSuit) {
    return { ok: false, error: "Must follow suit", state };
  }

  const newHand = state.hands[seat].filter((c) => c.instanceId !== cardInstanceId);
  const hands = state.hands.map((h, i) => (i === seat ? newHand : h)) as AnimalInstance[][];
  const removeIds = new Set(attached.map((s) => s.instanceId));
  const specialHands = state.specialHands.map((h, i) =>
    i === seat ? h.filter((s) => !removeIds.has(s.instanceId)) : h,
  ) as SpecialInstance[][];

  const play = {
    seat,
    card,
    specials: attached.map((s) => s.slug) as SpecialSlug[],
    effectiveSuit: suitSnap.effectiveSuit,
    transformedByChameleon: suitSnap.transformedByChameleon,
    strengthDelta: 0,
    chameleon: suitSnap.transformedByChameleon,
  };
  const plays = [...trick.plays, play];
  const used = [...trick.specialsUsedThisTrick] as boolean[];
  if (attached.length > 0) used[seat] = true;

  const nextTrick: CurrentTrick = {
    ...trick,
    ledSuit: trick.plays.length === 0 ? card.suit : trick.ledSuit,
    plays,
    specialsUsedThisTrick: used,
  };

  const events: EngineEvent[] = [];
  for (const s of attached) {
    events.push({
      type: "SPECIAL_PLAYED",
      seat,
      slug: s.slug,
      instanceId: s.instanceId,
    });
  }

  if (plays.length >= 4) {
    return {
      ok: true,
      state: bump({
        ...state,
        hands,
        specialHands,
        currentTrick: nextTrick,
        phase: "resolving_trick",
        pendingSpecial: null,
        specialDrawAttemptedThisTurn: false,
      }),
      events: [...events, { type: "trick_awaiting_resolve" }],
    };
  }

  const nextPlayer = (trick.leader + plays.length) % 4;
  return {
    ok: true,
    state: bump({
      ...state,
      hands,
      specialHands,
      currentTrick: nextTrick,
      currentPlayer: nextPlayer,
      pendingSpecial: null,
      specialDrawAttemptedThisTurn: false,
    }),
    events,
  };
}

function applyRequestSpecialDraw(
  state: GameState,
  seat: number,
  rng: RandomSource,
): ActionResult {
  const gate = canRequestSpecialDraw(state, seat);
  if (!gate.ok) {
    return { ok: false, error: gate.reasonFa ?? gate.reason ?? "Cannot draw", state };
  }

  const events: EngineEvent[] = [{ type: "SPECIAL_DRAW_ATTEMPTED", seat }];
  const roll = rng.next();
  if (roll >= state.config.specialDrawChance) {
    return {
      ok: true,
      state: bump({ ...state, specialDrawAttemptedThisTurn: true }),
      events: [...events, { type: "SPECIAL_DRAW_FAILED", seat }],
    };
  }

  const slug = pickWeightedSpecial(rng, state.config.specialPoolWeights);
  const drawn: SpecialInstance = {
    instanceId: nextInstanceId("sp"),
    slug,
  };
  const hand = [...state.specialHands[seat], drawn];
  const specialHands = state.specialHands.map((h, i) => (i === seat ? hand : h)) as SpecialInstance[][];
  const overflow = hand.length > state.config.specialMaxInventory;

  return {
    ok: true,
    state: bump({
      ...state,
      specialHands,
      specialDrawAttemptedThisTurn: true,
      pendingSpecialDiscard: overflow ? { seat, drawnInstanceId: drawn.instanceId } : null,
    }),
    events: [
      ...events,
      { type: "SPECIAL_DRAW_SUCCEEDED", seat, slug, instanceId: drawn.instanceId },
    ],
  };
}

function applyDiscardSpecial(
  state: GameState,
  seat: number,
  specialInstanceId: string,
): ActionResult {
  if (!state.pendingSpecialDiscard || state.pendingSpecialDiscard.seat !== seat) {
    return { ok: false, error: "No pending special discard", state };
  }
  const spec = state.specialHands[seat].find((s) => s.instanceId === specialInstanceId);
  if (!spec) return { ok: false, error: "Special not in hand", state };

  const nextHand = state.specialHands[seat].filter((s) => s.instanceId !== specialInstanceId);
  if (nextHand.length > state.config.specialMaxInventory) {
    return { ok: false, error: "Must discard down to max inventory", state };
  }
  const specialHands = state.specialHands.map((h, i) => (i === seat ? nextHand : h)) as SpecialInstance[][];

  return {
    ok: true,
    state: bump({
      ...state,
      specialHands,
      pendingSpecialDiscard: null,
    }),
    events: [{ type: "SPECIAL_DISCARDED", seat, slug: spec.slug, instanceId: spec.instanceId }],
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
      const dealt = beginRoundDeal(
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
        { type: "round_started", leaderSeat: dealt.hunterSelectorSeat },
        { type: "initial_five_dealt", selectorSeat: dealt.hunterSelectorSeat },
        { type: "hunter_selection_started", selectorSeat: dealt.hunterSelectorSeat },
      ];
      return { ok: true, state: bump(dealt), events };
    }
    case "SELECT_HUNTER_REALM":
      return applySelectHunterRealm(
        state,
        action.seat,
        action.realm,
        action.source ?? "manual",
      );
    case "CONTINUE_HAND": {
      if (state.phase !== "hand_complete") {
        return { ok: false, error: "No hand to continue", state };
      }
      const r = rng ?? new SeededRandom(state.seed + state.stateVersion);
      const leader = state.lastTrickWinner ?? state.firstLeaderThisHand ?? randomInt(r, 0, 3);
      const dealt = beginRoundDeal(
        {
          ...state,
          lastTrickWinner: leader,
          firstLeaderThisHand: leader,
        },
        catalog,
        r,
      );
      const events: EngineEvent[] = [
        { type: "round_started", leaderSeat: dealt.hunterSelectorSeat },
        { type: "initial_five_dealt", selectorSeat: dealt.hunterSelectorSeat },
        { type: "hunter_selection_started", selectorSeat: dealt.hunterSelectorSeat },
      ];
      return { ok: true, state: bump(dealt), events };
    }
    case "REQUEST_SPECIAL_DRAW": {
      const r = rng ?? new SeededRandom(state.seed + state.stateVersion * 1009 + action.seat * 17);
      return applyRequestSpecialDraw(state, action.seat, r);
    }
    case "DISCARD_SPECIAL":
      return applyDiscardSpecial(state, action.seat, action.specialInstanceId);
    case "PLAY_CARD":
      return applyPlayCard(state, action.seat, action.cardInstanceId, action.specialInstanceIds);
    case "RESOLVE_TRICK": {
      if (state.phase !== "resolving_trick" || !state.currentTrick || state.currentTrick.plays.length < 4) {
        return { ok: false, error: "No trick to resolve", state };
      }
      const { state: resolved, events } = finishTrick(state);
      return { ok: true, state: resolved, events };
    }
    case "PLAY_SPECIAL":
      return { ok: false, error: "Legacy PLAY_SPECIAL disabled — attach specials on PLAY_CARD", state };
    case "PASS_SPECIAL":
      return { ok: false, error: "Legacy PASS_SPECIAL disabled", state };
    case "HUMAN_TIMEOUT": {
      if (state.phase === "hunter_selection" && action.seat === state.hunterSelectorSeat) {
        const r = rng ?? new SeededRandom(state.seed + state.stateVersion);
        const realm = chooseHunterRealm(state.hands[action.seat], () => r.next());
        return applySelectHunterRealm(state, action.seat, realm, "auto_timeout");
      }
      let s = applyHumanTimeoutImpact(state, action.seat);
      if (s.pendingSpecialDiscard?.seat === action.seat) {
        // Auto-discard Null if present, else the newly drawn card
        const hand = s.specialHands[action.seat];
        const nullCard = hand.find((x) => x.slug === "null");
        const target =
          nullCard ??
          hand.find((x) => x.instanceId === s.pendingSpecialDiscard!.drawnInstanceId) ??
          hand[hand.length - 1];
        if (target) {
          return applyDiscardSpecial(s, action.seat, target.instanceId);
        }
      }
      if (s.currentPlayer !== action.seat || s.phase !== "playing") {
        return { ok: true, state: bump(s) };
      }
      const legal = legalAnimalPlays(s, action.seat);
      if (legal.length === 0) return { ok: true, state: bump(s) };
      const lowest = [...legal].sort((a, b) => a.strength - b.strength)[0];
      return applyPlayCard(s, action.seat, lowest.instanceId);
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
