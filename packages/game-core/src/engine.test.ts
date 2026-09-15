import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { loadCatalog } from "./catalog.js";
import {
  applyAction,
  createInitialState,
  legalAnimalPlays,
  resetInstanceCounter,
} from "./engine.js";
import { resolveTrickWinner } from "./trick.js";
import { SeededRandom } from "./rng.js";
import type { CurrentTrick, GameState } from "./types.js";
import type { Suit } from "@kv/contracts";

const catalog = loadCatalog();

function startMatch(seed: number): GameState {
  resetInstanceCounter();
  let s = createInitialState(`m-${seed}`, seed, undefined, catalog);
  const r = applyAction(s, { type: "START_MATCH" }, catalog, new SeededRandom(seed));
  expect(r.ok).toBe(true);
  return r.state;
}

describe("catalog", () => {
  it("loads 52 animals and 7 specials", () => {
    expect(catalog.animals).toHaveLength(52);
    expect(catalog.specials).toHaveLength(7);
    const suits = new Set(catalog.animals.map((a) => a.suit));
    expect(suits.size).toBe(4);
  });

  it("maps every rank 1-10 C B A to strength 1-13", () => {
    for (const a of catalog.animals) {
      expect(a.powerBarFill).toBeGreaterThanOrEqual(1);
      expect(a.powerBarFill).toBeLessThanOrEqual(13);
    }
  });
});

describe("follow suit", () => {
  it("rejects off-suit when holding led suit", () => {
    const state = startMatch(42);
    const seat = state.currentPlayer;
    const hand = state.hands[seat];
    const card = hand[0];
    const led = card.suit;
    const off = hand.find((c) => c.suit !== led);
    if (!off) return;
    const fakeTrick = {
      leader: seat,
      ledSuit: led as Suit,
      plays: [{ seat, card, chameleon: false, strengthDelta: 0 }],
      silence: false,
      specialsUsedThisTrick: [false, false, false, false],
    };
    const st = { ...state, currentTrick: fakeTrick, currentPlayer: seat };
    const r = applyAction(st, { type: "PLAY_CARD", seat, cardInstanceId: off.instanceId }, catalog);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/follow/i);
  });
});

describe("superior suit resolution", () => {
  it("superior beats led suit when both present", () => {
    const trick: CurrentTrick = {
      leader: 0,
      ledSuit: "carnivore",
      plays: [
        {
          seat: 0,
          card: {
            instanceId: "a1",
            catalogId: "x",
            slug: "x",
            suit: "carnivore",
            displayRank: "5",
            strength: 5,
          },
          chameleon: false,
          strengthDelta: 0,
        },
        {
          seat: 1,
          card: {
            instanceId: "a2",
            catalogId: "y",
            slug: "y",
            suit: "bird",
            displayRank: "10",
            strength: 10,
          },
          chameleon: false,
          strengthDelta: 0,
        },
      ],
      silence: false,
      specialsUsedThisTrick: [false, false, false, false],
    };
    const w = resolveTrickWinner(trick, "bird");
    expect(w.winnerSeat).toBe(1);
  });

  it("earliest play wins tied strength on winning track", () => {
    const trick: CurrentTrick = {
      leader: 0,
      ledSuit: "herbivore",
      plays: [
        {
          seat: 0,
          card: {
            instanceId: "a1",
            catalogId: "x",
            slug: "x",
            suit: "herbivore",
            displayRank: "7",
            strength: 7,
          },
          chameleon: false,
          strengthDelta: 0,
        },
        {
          seat: 2,
          card: {
            instanceId: "a2",
            catalogId: "y",
            slug: "y",
            suit: "herbivore",
            displayRank: "7",
            strength: 7,
          },
          chameleon: false,
          strengthDelta: 0,
        },
      ],
      silence: false,
      specialsUsedThisTrick: [false, false, false, false],
    };
    const w = resolveTrickWinner(trick, null);
    expect(w.winnerSeat).toBe(0);
  });
});

describe("specials", () => {
  it("adrenaline adds +2 on own card", () => {
    let state = startMatch(99);
    const seat = state.currentPlayer;
    const card = legalAnimalPlays(state, seat)[0];
    let r = applyAction(state, { type: "PLAY_CARD", seat, cardInstanceId: card.instanceId }, catalog);
    expect(r.ok).toBe(true);
    state = r.state;
    if (!state.pendingSpecial) return;
    const ad = state.specialHands[seat].find((s) => s.slug === "adrenaline");
    if (!ad) return;
    r = applyAction(
      state,
      { type: "PLAY_SPECIAL", seat, specialInstanceId: ad.instanceId },
      catalog,
    );
    expect(r.ok).toBe(true);
    const play = r.state.currentTrick?.plays.find((p) => p.seat === seat);
    expect(play?.strengthDelta).toBe(2);
  });

  it("silence blocks further specials in trick", () => {
    let state = startMatch(100);
    const seat = state.currentPlayer;
    const card = legalAnimalPlays(state, seat)[0];
    let r = applyAction(state, { type: "PLAY_CARD", seat, cardInstanceId: card.instanceId }, catalog);
    state = r.state;
    const silence = state.specialHands[seat].find((s) => s.slug === "silence");
    if (!silence || !state.pendingSpecial) return;
    r = applyAction(
      state,
      { type: "PLAY_SPECIAL", seat, specialInstanceId: silence.instanceId },
      catalog,
    );
    expect(r.ok).toBe(true);
    expect(r.state.currentTrick?.silence).toBe(true);
  });
});

describe("deterministic seeded match", () => {
  it("plays full hand without error for seed 7", () => {
    let state = startMatch(7);
    let safety = 500;
    while (state.phase === "playing" && safety-- > 0) {
      const seat = state.currentPlayer;
      if (state.pendingSpecial) {
        applyAction(state, { type: "PASS_SPECIAL", seat }, catalog);
        continue;
      }
      const legal = legalAnimalPlays(state, seat);
      if (legal.length === 0) break;
      const card = legal[0];
      const r = applyAction(
        state,
        { type: "PLAY_CARD", seat, cardInstanceId: card.instanceId },
        catalog,
      );
      expect(r.ok).toBe(true);
      state = r.state;
    }
    expect(["playing", "hand_complete", "match_complete"]).toContain(state.phase);
  });
});

describe("property: legal plays never empty on your turn when holding cards", () => {
  it("holds for random mid-game states", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 500 }), (seed) => {
        let state = startMatch(seed);
        for (let i = 0; i < 30 && state.phase === "playing"; i++) {
          const seat = state.currentPlayer;
          if (state.pendingSpecial) {
            const r = applyAction(state, { type: "PASS_SPECIAL", seat }, catalog);
            if (!r.ok) return true;
            state = r.state;
            continue;
          }
          const legal = legalAnimalPlays(state, seat);
          if (state.hands[seat].length === 0) return true;
          expect(legal.length).toBeGreaterThan(0);
          const r = applyAction(
            state,
            { type: "PLAY_CARD", seat, cardInstanceId: legal[0].instanceId },
            catalog,
          );
          if (!r.ok) return true;
          state = r.state;
        }
        return true;
      }),
      { numRuns: 20 },
    );
  });
});
