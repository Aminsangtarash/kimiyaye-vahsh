import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { ALL_ANIMAL_REALMS, type AnimalRealm, type Suit } from "@kv/contracts";
import { loadCatalog } from "./catalog.js";
import {
  applyAction,
  createInitialState,
  legalAnimalPlays,
  resetInstanceCounter,
} from "./engine.js";
import { chooseHunterRealm, scoreRealmForHunter } from "./hunterSelect.js";
import { selectMvpParticipantIds } from "./impact.js";
import { resolveTrickWinner } from "./trick.js";
import { SeededRandom } from "./rng.js";
import { projectForSeat } from "./project.js";
import type { AnimalInstance, CurrentTrick, GameState } from "./types.js";

const catalog = loadCatalog();

function startToSelection(
  seed: number,
  realms: AnimalRealm[] = ["carnivore", "herbivore", "bird", "reptile"],
  firstLeader?: number,
): GameState {
  resetInstanceCounter();
  let s = createInitialState(`m-${seed}`, seed, { specialCardsEnabled: false }, realms);
  const r = applyAction(
    s,
    { type: "START_MATCH", firstLeader },
    catalog,
    new SeededRandom(seed),
  );
  expect(r.ok).toBe(true);
  expect(r.state.phase).toBe("hunter_selection");
  return r.state;
}

function selectHunter(state: GameState, realm: AnimalRealm, source: "manual" | "bot" | "auto_timeout" = "manual"): GameState {
  const r = applyAction(
    state,
    {
      type: "SELECT_HUNTER_REALM",
      seat: state.hunterSelectorSeat,
      realm,
      source,
    },
    catalog,
  );
  expect(r.ok).toBe(true);
  expect(r.state.phase).toBe("playing");
  expect(r.state.hunterRealm).toBe(realm);
  return r.state;
}

function startMatch(
  seed: number,
  realms: AnimalRealm[] = ["carnivore", "herbivore", "bird", "reptile"],
  firstLeader?: number,
  hunter?: AnimalRealm,
): GameState {
  const sel = startToSelection(seed, realms, firstLeader);
  const realm = hunter ?? chooseHunterRealm(sel.hands[sel.hunterSelectorSeat], () => 0.1);
  return selectHunter(sel, realm);
}

function flushTrick(state: GameState): GameState {
  if (state.phase !== "resolving_trick") return state;
  const r = applyAction(state, { type: "RESOLVE_TRICK" }, catalog);
  expect(r.ok).toBe(true);
  return r.state;
}

describe("catalog", () => {
  it("loads 52 animals", () => {
    expect(catalog.animals).toHaveLength(52);
  });
});

describe("fixed Hunter Realm (rules v3)", () => {
  it("A: shuffle once — only selector gets first 5; remainingDeck=47", () => {
    const state = startToSelection(11, undefined, 2);
    expect(state.hunterSelectorSeat).toBe(2);
    expect(state.firstLeaderThisHand).toBe(2);
    expect(state.hands[2]).toHaveLength(5);
    expect(state.hands[0]).toHaveLength(0);
    expect(state.hands[1]).toHaveLength(0);
    expect(state.hands[3]).toHaveLength(0);
    expect(state.remainingDeck).toHaveLength(47);
    expect(state.hunterRealm).toBeNull();
  });

  it("B/C: other projections hide first five", () => {
    const state = startToSelection(12, undefined, 1);
    const sel = projectForSeat(state, 1);
    const other = projectForSeat(state, 0);
    expect(sel.yourHand).toHaveLength(5);
    expect(sel.isHunterSelector).toBe(true);
    expect(other.yourHand).toHaveLength(0);
    expect(other.isHunterSelector).toBe(false);
    expect(other.opponentHandSizes[1]).toBe(5);
    expect(other.opponentHandSizes[0]).toBe(0);
  });

  it("D: selector may choose any of four realms", () => {
    const base = startToSelection(13, undefined, 0);
    for (const realm of ALL_ANIMAL_REALMS) {
      const s = startToSelection(13, undefined, 0);
      const next = selectHunter(s, realm);
      expect(next.hunterRealm).toBe(realm);
      expect(base.hands[0].map((c) => c.instanceId)).toEqual(
        startToSelection(13, undefined, 0).hands[0].map((c) => c.instanceId),
      );
    }
  });

  it("E/F/G: Hunter stays fixed; winner leads next without changing Hunter", () => {
    const realms: AnimalRealm[] = ["carnivore", "herbivore", "bird", "reptile"];
    let state = startMatch(20, realms, 2, "bird");
    expect(state.hunterRealm).toBe("bird");
    expect(state.currentTrick?.leader).toBe(2);
    const fixed = state.hunterRealm;

    const trick: CurrentTrick = {
      leader: 2,
      ledSuit: "herbivore",
      plays: [
        mkPlay(2, "herbivore", 3),
        mkPlay(3, "carnivore", 8),
        mkPlay(0, "herbivore", 4),
        mkPlay(1, "herbivore", 5),
      ],
      silence: false,
      specialsUsedThisTrick: [false, false, false, false],
    };
    // Hunter=bird, carnivore from seat 3 is NOT trump → highest herbivore seat1 wins
    // For G: reptile (seat3) wins WITH carnivore when hunter=carnivore
    state = {
      ...state,
      hunterRealm: "carnivore",
      phase: "resolving_trick",
      currentTrick: {
        leader: 0,
        ledSuit: "herbivore",
        plays: [
          mkPlay(0, "herbivore", 3),
          mkPlay(1, "herbivore", 4),
          mkPlay(2, "herbivore", 5),
          mkPlay(3, "carnivore", 2),
        ],
        silence: false,
        specialsUsedThisTrick: [false, false, false, false],
      },
    };
    const beforeHunter = state.hunterRealm;
    state = flushTrick(state);
    expect(state.lastTrickWinner).toBe(3);
    expect(state.currentTrick?.leader).toBe(3);
    expect(state.hunterRealm).toBe(beforeHunter);
    expect(state.hunterRealm).toBe("carnivore");
    expect(state.playerRealms[3]).toBe("reptile");
    void fixed;
    void trick;
  });

  it("H/I/J: after selection hands are 13/13/13/13 and 52 unique cards", () => {
    const sel = startToSelection(30, undefined, 0);
    const firstFiveIds = sel.hands[0].map((c) => c.instanceId);
    const remIds = sel.remainingDeck.map((c) => c.instanceId);
    const state = selectHunter(sel, "herbivore");
    expect(state.hands.every((h) => h.length === 13)).toBe(true);
    expect(state.remainingDeck).toHaveLength(0);
    const all = state.hands.flat();
    expect(all).toHaveLength(52);
    expect(new Set(all.map((c) => c.instanceId)).size).toBe(52);
    // First five preserved in selector hand (no reshuffle)
    for (const id of firstFiveIds) {
      expect(state.hands[0].some((c) => c.instanceId === id)).toBe(true);
    }
    for (const id of remIds) {
      expect(all.some((c) => c.instanceId === id)).toBe(true);
    }
    expect(state.hands[0].length - 5).toBe(8);
  });

  it("K: no reshuffle — remaining order consumed into hands", () => {
    const sel = startToSelection(31, undefined, 1);
    const expectedOrder = sel.remainingDeck.map((c) => c.instanceId);
    const state = selectHunter(sel, "bird");
    // 8 to selector then 13 to seat2, 13 seat3, 13 seat0
    const got: string[] = [];
    const extra = state.hands[1].filter((c) => !sel.hands[1].some((x) => x.instanceId === c.instanceId));
    got.push(...extra.map((c) => c.instanceId));
    got.push(...state.hands[2].map((c) => c.instanceId));
    got.push(...state.hands[3].map((c) => c.instanceId));
    got.push(...state.hands[0].map((c) => c.instanceId));
    expect(got).toEqual(expectedOrder);
  });

  it("L: bot heuristic chooses valid realm from five cards only", () => {
    const cards: AnimalInstance[] = [
      mkCard("bird", 5),
      mkCard("bird", 8),
      mkCard("bird", 3),
      mkCard("carnivore", 12),
      mkCard("reptile", 2),
    ];
    const realm = chooseHunterRealm(cards, () => 0);
    expect(ALL_ANIMAL_REALMS).toContain(realm);
    expect(scoreRealmForHunter(cards, "bird")).toBeGreaterThan(scoreRealmForHunter(cards, "reptile"));
  });

  it("M: HUMAN_TIMEOUT auto-selects hunter", () => {
    const sel = startToSelection(40, undefined, 0);
    const r = applyAction(
      sel,
      { type: "HUMAN_TIMEOUT", seat: 0 },
      catalog,
      new SeededRandom(99),
    );
    expect(r.ok).toBe(true);
    expect(r.state.phase).toBe("playing");
    expect(r.state.hunterRealm).not.toBeNull();
    expect(r.state.hunterSelectionSource).toBe("auto_timeout");
  });

  it("E across many tricks: hunter never changes within a round", () => {
    let state = startMatch(50, undefined, 0, "reptile");
    const hunter = state.hunterRealm;
    let safety = 200;
    while (
      state.phase !== "hand_complete" &&
      state.phase !== "match_complete" &&
      state.phase !== "hunter_selection" &&
      safety-- > 0
    ) {
      if (state.phase === "resolving_trick") {
        state = flushTrick(state);
        if (state.phase === "hunter_selection" || state.phase === "hand_complete" || state.phase === "match_complete") {
          break;
        }
        expect(state.hunterRealm).toBe(hunter);
        continue;
      }
      if (state.phase !== "playing") break;
      const seat = state.currentPlayer;
      const legal = legalAnimalPlays(state, seat);
      if (!legal[0]) break;
      const r = applyAction(state, { type: "PLAY_CARD", seat, cardInstanceId: legal[0].instanceId }, catalog);
      expect(r.ok).toBe(true);
      state = r.state;
      if (state.phase === "playing" || state.phase === "resolving_trick") {
        expect(state.hunterRealm).toBe(hunter);
      }
    }
  });
});

describe("property: follow suit", () => {
  it("never allows voiding when holding led suit", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 200 }), (seed) => {
        let state = startMatch(seed);
        for (let i = 0; i < 8; i++) {
          if (state.phase !== "playing") break;
          const seat = state.currentPlayer;
          const legal = legalAnimalPlays(state, seat);
          const trick = state.currentTrick;
          if (trick && trick.plays.length > 0 && trick.ledSuit) {
            const hand = state.hands[seat];
            const hasLed = hand.some((c) => c.suit === trick.ledSuit);
            if (hasLed) {
              expect(legal.every((c) => c.suit === trick.ledSuit)).toBe(true);
            }
          }
          if (!legal[0]) break;
          const r = applyAction(state, { type: "PLAY_CARD", seat, cardInstanceId: legal[0].instanceId }, catalog);
          if (!r.ok) return false;
          state = flushTrick(r.state);
        }
        return true;
      }),
      { numRuns: 20 },
    );
  });
});

describe("full match", () => {
  it("completes with fixed hunter selections", () => {
    let state = startMatch(77, undefined, 1, "herbivore");
    let safety = 5000;
    while (state.phase !== "match_complete" && safety-- > 0) {
      if (state.phase === "hand_complete") {
        const cont = applyAction(state, { type: "CONTINUE_HAND" }, catalog);
        expect(cont.ok).toBe(true);
        state = cont.state;
        continue;
      }
      if (state.phase === "hunter_selection") {
        state = selectHunter(state, chooseHunterRealm(state.hands[state.hunterSelectorSeat], () => 0.25), "bot");
        continue;
      }
      if (state.phase === "resolving_trick") {
        state = flushTrick(state);
        continue;
      }
      if (state.phase !== "playing") break;
      const seat = state.currentPlayer;
      const legal = legalAnimalPlays(state, seat);
      if (!legal[0]) break;
      const r = applyAction(state, { type: "PLAY_CARD", seat, cardInstanceId: legal[0].instanceId }, catalog);
      expect(r.ok).toBe(true);
      state = r.state;
    }
    expect(state.phase).toBe("match_complete");
    expect(state.matchWinnerTeam).not.toBeNull();
    expect(selectMvpParticipantIds(state).length).toBeGreaterThanOrEqual(1);
  });
});

describe("resolveTrickWinner", () => {
  it("hunter trump beats higher led suit", () => {
    const trick: CurrentTrick = {
      leader: 0,
      ledSuit: "herbivore",
      plays: [
        mkPlay(0, "herbivore", 10),
        mkPlay(1, "bird", 2),
        mkPlay(2, "herbivore", 9),
        mkPlay(3, "herbivore", 8),
      ],
      silence: false,
      specialsUsedThisTrick: [false, false, false, false],
    };
    expect(resolveTrickWinner(trick, "bird").winnerSeat).toBe(1);
  });
});

function mkCard(suit: Suit, strength: number): AnimalInstance {
  return {
    instanceId: `t-${suit}-${strength}-${Math.random()}`,
    catalogId: "x",
    slug: "x",
    suit,
    displayRank: String(strength),
    strength,
  };
}

function mkPlay(seat: number, suit: Suit, strength: number) {
  return {
    seat,
    card: mkCard(suit, strength),
    specials: [] as import("@kv/contracts").SpecialSlug[],
    effectiveSuit: suit,
    transformedByChameleon: false,
    chameleon: false,
    strengthDelta: 0,
  };
}
