import { describe, expect, it } from "vitest";
import type { SpecialSlug, Suit } from "@kv/contracts";
import {
  applyAction,
  createInitialState,
  invertRank,
  applyPowerFloors,
  pickWeightedSpecial,
  specialPoolTotal,
  specialWeightBoundaries,
  resolveTrickPipeline,
  validateAttachedSpecials,
  canRequestSpecialDraw,
  FUSION_POWER_CAP,
  DEFAULT_SPECIAL_POOL_WEIGHTS,
  resetInstanceCounter,
  SeededRandom,
  type AnimalInstance,
  type CurrentTrick,
  type GameState,
  type SpecialInstance,
  type TrickCardPlay,
} from "../index.js";

function card(
  seatHint: string,
  suit: Suit,
  strength: number,
  displayRank?: string,
): AnimalInstance {
  const rank =
    displayRank ??
    (strength === 13 ? "A" : strength === 12 ? "B" : strength === 11 ? "C" : String(strength));
  return {
    instanceId: `a-${seatHint}-${suit}-${strength}`,
    catalogId: `c-${seatHint}`,
    slug: `slug-${seatHint}`,
    suit,
    displayRank: rank,
    strength,
  };
}

function play(
  seat: number,
  c: AnimalInstance,
  opts: {
    specials?: SpecialSlug[];
    effectiveSuit?: Suit;
    chameleon?: boolean;
  } = {},
): TrickCardPlay {
  const transformed = Boolean(opts.chameleon);
  return {
    seat,
    card: c,
    specials: opts.specials ?? [],
    effectiveSuit: opts.effectiveSuit ?? c.suit,
    transformedByChameleon: transformed,
    chameleon: transformed,
    strengthDelta: 0,
  };
}

function trickOf(plays: TrickCardPlay[], leader = 0, ledSuit?: Suit): CurrentTrick {
  return {
    leader,
    ledSuit: ledSuit ?? plays[0]?.effectiveSuit ?? plays[0]?.card.suit ?? "bird",
    plays,
    silence: false,
    specialsUsedThisTrick: [false, false, false, false],
  };
}

describe("special pool weights", () => {
  it("totals 64 with centralized weights", () => {
    expect(specialPoolTotal()).toBe(64);
    expect(DEFAULT_SPECIAL_POOL_WEIGHTS.null).toBe(10);
    expect(DEFAULT_SPECIAL_POOL_WEIGHTS.hunt_command).toBe(3);
    expect(DEFAULT_SPECIAL_POOL_WEIGHTS.armageddon).toBe(1);
  });

  it("picks by deterministic injected RNG boundaries", () => {
    const bounds = specialWeightBoundaries();
    for (const b of bounds) {
      const mid = (b.start + b.end) / 2 / 64;
      const rng = { next: () => mid };
      expect(pickWeightedSpecial(rng)).toBe(b.slug);
    }
  });
});

describe("draw / inventory", () => {
  function playingState(seed = 1): GameState {
    resetInstanceCounter();
    let s = createInitialState(`m-${seed}`, seed, { specialCardsEnabled: true, specialDrawChance: 1 });
    const start = applyAction(s, { type: "START_MATCH", firstLeader: 0 }, undefined, new SeededRandom(seed));
    s = start.state;
    const hunt = applyAction(s, {
      type: "SELECT_HUNTER_REALM",
      seat: s.hunterSelectorSeat,
      realm: "bird",
      source: "bot",
    });
    return hunt.state;
  }

  it("allows one draw attempt per turn before play", () => {
    let s = playingState(2);
    const seat = s.currentPlayer;
    expect(canRequestSpecialDraw(s, seat).ok).toBe(true);
    const r1 = applyAction(s, { type: "REQUEST_SPECIAL_DRAW", seat }, undefined, {
      next: () => 0, // success then pick doping
    });
    expect(r1.ok).toBe(true);
    s = r1.state;
    expect(s.specialDrawAttemptedThisTurn).toBe(true);
    expect(canRequestSpecialDraw(s, seat).ok).toBe(false);
    const r2 = applyAction(s, { type: "REQUEST_SPECIAL_DRAW", seat }, undefined, {
      next: () => 0,
    });
    expect(r2.ok).toBe(false);
  });

  it("respects 10% draw chance via injected RNG", () => {
    let s = playingState(3);
    s = { ...s, config: { ...s.config, specialDrawChance: 0.1 } };
    const seat = s.currentPlayer;
    const fail = applyAction(s, { type: "REQUEST_SPECIAL_DRAW", seat }, undefined, {
      next: () => 0.5,
    });
    expect(fail.ok).toBe(true);
    expect(fail.events?.some((e) => e.type === "SPECIAL_DRAW_FAILED")).toBe(true);
    expect(fail.state.specialHands[seat]).toHaveLength(0);

    s = playingState(4);
    s = { ...s, config: { ...s.config, specialDrawChance: 0.1 } };
    const ok = applyAction(s, { type: "REQUEST_SPECIAL_DRAW", seat: s.currentPlayer }, undefined, {
      next: () => 0.05,
    });
    expect(ok.events?.some((e) => e.type === "SPECIAL_DRAW_SUCCEEDED")).toBe(true);
  });

  it("forces discard at 4 cards; may discard new or old", () => {
    let s = playingState(5);
    const seat = s.currentPlayer;
    const mk = (slug: SpecialSlug, id: string): SpecialInstance => ({ instanceId: id, slug });
    s = {
      ...s,
      specialHands: s.specialHands.map((h, i) =>
        i === seat ? [mk("doping", "old1"), mk("trap", "old2"), mk("null", "old3")] : h,
      ) as SpecialInstance[][],
    };
    const draw = applyAction(s, { type: "REQUEST_SPECIAL_DRAW", seat }, undefined, {
      next: () => 0,
    });
    expect(draw.ok).toBe(true);
    s = draw.state;
    expect(s.specialHands[seat]).toHaveLength(4);
    expect(s.pendingSpecialDiscard?.seat).toBe(seat);

    const discardNew = applyAction(s, {
      type: "DISCARD_SPECIAL",
      seat,
      specialInstanceId: s.pendingSpecialDiscard!.drawnInstanceId,
    });
    expect(discardNew.ok).toBe(true);
    expect(discardNew.state.specialHands[seat]).toHaveLength(3);
    expect(discardNew.state.pendingSpecialDiscard).toBeNull();

    // again discard old
    s = {
      ...draw.state,
    };
    const discardOld = applyAction(s, {
      type: "DISCARD_SPECIAL",
      seat,
      specialInstanceId: "old1",
    });
    expect(discardOld.ok).toBe(true);
    expect(discardOld.state.specialHands[seat].some((x) => x.instanceId === "old1")).toBe(false);
    expect(discardOld.state.specialHands[seat]).toHaveLength(3);
  });
});

describe("power helpers", () => {
  it("inversion mapping", () => {
    expect(invertRank(1)).toBe(12);
    expect(invertRank(12)).toBe(1);
    expect(invertRank(11)).toBe(2);
    expect(invertRank(13)).toBe(13);
  });

  it("floors", () => {
    expect(applyPowerFloors(-1.5, false)).toBe(0);
    expect(applyPowerFloors(10.5, true)).toBe(13);
    expect(applyPowerFloors(15.5, true)).toBe(15.5);
  });
});

describe("doping / trap", () => {
  it("4+doping=6.5; A+doping=15.5; floors and A floor", () => {
    const t = trickOf([
      play(0, card("0", "bird", 4), { specials: ["doping"] }),
      play(1, card("1", "bird", 13, "A")),
      play(2, card("2", "bird", 5), { specials: ["trap"] }),
      play(3, card("3", "bird", 13, "A"), { specials: ["doping"] }),
    ]);
    // Wait - seat 3 A with doping, seat 2 trap hits opponents of team 0? team: 0,1,0,1
    // trap from seat 2 (team 0) hits team 1 → seats 1 and 3
    const r = resolveTrickPipeline(t, "reptile", 2);
    const p0 = r.resolved.find((x) => x.seat === 0)!;
    expect(p0.effectivePower).toBe(6.5);
    const p3 = r.resolved.find((x) => x.seat === 3)!;
    // 13 + 2.5 - 2.5 trap = 13, A floor 13
    expect(p3.effectivePower).toBe(13);

    const t2 = trickOf([
      play(0, card("0", "bird", 12, "B")),
      play(1, card("1", "bird", 3), { specials: ["trap"] }),
      play(2, card("2", "bird", 2)),
      play(3, card("3", "bird", 4), { specials: ["trap"] }),
    ]);
    // traps from team 1 (seats 1,3) → 2 traps on team 0
    const r2 = resolveTrickPipeline(t2, "reptile", 2);
    // 12 + (-2.5*2) = 7
    expect(r2.resolved.find((x) => x.seat === 0)!.effectivePower).toBe(7);

    const t3 = trickOf([
      play(0, card("0", "bird", 1)),
      play(1, card("1", "bird", 3), { specials: ["trap"] }),
      play(2, card("2", "bird", 2)),
      play(3, card("3", "bird", 4), { specials: ["trap"] }),
    ]);
    // under inversion would be different; without inversion: 1-5 = floor 0
    const r3 = resolveTrickPipeline(t3, "reptile", 2);
    expect(r3.resolved.find((x) => x.seat === 0)!.effectivePower).toBe(0);
  });

  it("A 13+trap stays 13; A 15.5+trap floors to 13; two traps on buffed A stay 13", () => {
    const t = trickOf([
      play(0, card("0", "bird", 13, "A"), { specials: ["doping"] }),
      play(1, card("1", "bird", 5), { specials: ["trap"] }),
      play(2, card("2", "bird", 4)),
      play(3, card("3", "bird", 6), { specials: ["trap"] }),
    ]);
    const r = resolveTrickPipeline(t, "reptile", 2);
    expect(r.resolved.find((x) => x.seat === 0)!.effectivePower).toBe(13);
  });
});

describe("chameleon", () => {
  it("illegal if has lead suit; legal if void", () => {
    resetInstanceCounter();
    let s = createInitialState("ch", 1, { specialCardsEnabled: true });
    s = {
      ...s,
      phase: "playing",
      hunterRealm: "reptile",
      currentPlayer: 1,
      hands: [
        [card("0", "bird", 5)],
        [card("1a", "carnivore", 4), card("1b", "bird", 3)],
        [card("2", "bird", 6)],
        [card("3", "herbivore", 7)],
      ],
      specialHands: [[], [{ instanceId: "sp1", slug: "chameleon" }], [], []],
      currentTrick: trickOf([play(0, card("0", "bird", 5))], 0, "bird"),
    };
    // seat 1 has bird — illegal
    expect(
      validateAttachedSpecials(s, 1, s.hands[1][0], [{ instanceId: "sp1", slug: "chameleon" }]).ok,
    ).toBe(false);

    s = {
      ...s,
      hands: [
        [card("0", "bird", 5)],
        [card("1a", "carnivore", 4)],
        [card("2", "bird", 6)],
        [card("3", "herbivore", 7)],
      ],
    };
    expect(
      validateAttachedSpecials(s, 1, s.hands[1][0], [{ instanceId: "sp1", slug: "chameleon" }]).ok,
    ).toBe(true);
  });

  it("no prior hunter → lead; prior hunter → hunter; later hunter does not change", () => {
    const t = trickOf(
      [
        play(0, card("0", "bird", 5)),
        play(1, card("1", "carnivore", 4), {
          specials: ["chameleon"],
          chameleon: true,
          effectiveSuit: "bird",
        }),
        play(2, card("2", "reptile", 8), { effectiveSuit: "reptile" }),
        play(3, card("3", "bird", 6)),
      ],
      0,
      "bird",
    );
    const r = resolveTrickPipeline(t, "reptile", 2);
    expect(r.resolved.find((x) => x.seat === 1)!.effectiveSuit).toBe("bird");
  });

  it("natural wins exact tie vs chameleon", () => {
    const t = trickOf(
      [
        play(0, card("0", "bird", 7)),
        play(1, card("1", "carnivore", 7), {
          specials: ["chameleon"],
          chameleon: true,
          effectiveSuit: "bird",
        }),
        play(2, card("2", "herbivore", 2)),
        play(3, card("3", "herbivore", 3)),
      ],
      0,
      "bird",
    );
    const r = resolveTrickPipeline(t, "reptile", 2);
    expect(r.winnerSeat).toBe(0);
  });
});

describe("inversion", () => {
  it("applies and A on lead cancels; off-lead A does not; no double invert", () => {
    const base = trickOf([
      play(0, card("0", "bird", 1), { specials: ["inversion"] }),
      play(1, card("1", "bird", 12, "B")),
      play(2, card("2", "bird", 11, "C")),
      play(3, card("3", "carnivore", 13, "A")),
    ]);
    const r = resolveTrickPipeline(base, "reptile", 2);
    expect(r.inversionActive).toBe(true);
    expect(r.resolved.find((x) => x.seat === 0)!.effectiveRank).toBe(12);
    expect(r.resolved.find((x) => x.seat === 1)!.effectiveRank).toBe(1);
    expect(r.resolved.find((x) => x.seat === 2)!.effectiveRank).toBe(2);
    expect(r.resolved.find((x) => x.seat === 3)!.effectiveRank).toBe(13);

    const cancel = trickOf([
      play(0, card("0", "bird", 4), { specials: ["inversion"] }),
      play(1, card("1", "bird", 13, "A")),
      play(2, card("2", "bird", 5)),
      play(3, card("3", "bird", 6)),
    ]);
    const rc = resolveTrickPipeline(cancel, "reptile", 2);
    expect(rc.inversionCancelled).toBe(true);
    expect(rc.resolved.find((x) => x.seat === 0)!.effectiveRank).toBe(4);

    const double = trickOf([
      play(0, card("0", "bird", 3), { specials: ["inversion"] }),
      play(1, card("1", "bird", 5), { specials: ["inversion"] }),
      play(2, card("2", "bird", 4)),
      play(3, card("3", "bird", 6)),
    ]);
    const rd = resolveTrickPipeline(double, "reptile", 2);
    expect(rd.resolved.find((x) => x.seat === 0)!.effectiveRank).toBe(10); // not double
  });
});

describe("armageddon", () => {
  it("destroys opponent A only; illegal with own A checked by legality; destroyed A cannot cancel inversion", () => {
    const t = trickOf([
      play(0, card("0", "bird", 5), { specials: ["armageddon", "inversion"] }),
      play(1, card("1", "bird", 13, "A")),
      play(2, card("2", "bird", 13, "A")),
      play(3, card("3", "bird", 8)),
    ]);
    const r = resolveTrickPipeline(t, "reptile", 2);
    expect(r.resolved.find((x) => x.seat === 1)!.destroyedByArmageddon).toBe(true);
    expect(r.resolved.find((x) => x.seat === 2)!.destroyedByArmageddon).toBe(false);
    // teammate A (seat 2) cancels inversion
    expect(r.inversionCancelled).toBe(true);

    const t2 = trickOf([
      play(0, card("0", "bird", 5), { specials: ["armageddon", "inversion"] }),
      play(1, card("1", "bird", 13, "A")),
      play(2, card("2", "bird", 6)),
      play(3, card("3", "bird", 8)),
    ]);
    const r2 = resolveTrickPipeline(t2, "reptile", 2);
    expect(r2.resolved.find((x) => x.seat === 1)!.destroyedByArmageddon).toBe(true);
    expect(r2.inversionActive).toBe(true);
  });
});

describe("team bond + fusion beast threshold", () => {
  it("4+3=7 bond without fusion beast; 6+4=10 no beast; 6+5=11 beast; 7+6→12.5 beast", () => {
    const low = trickOf([
      play(0, card("0", "bird", 4), { specials: ["team_bond"] }),
      play(1, card("1", "bird", 9)),
      play(2, card("2", "bird", 3)),
      play(3, card("3", "bird", 2)),
    ]);
    const r1 = resolveTrickPipeline(low, "reptile", 2);
    expect(r1.fusions).toHaveLength(1);
    expect(r1.fusions[0].fusionPower).toBe(7);
    expect(r1.fusions[0].showsFusionBeast).toBe(false);

    const ten = trickOf([
      play(0, card("0", "bird", 6), { specials: ["team_bond"] }),
      play(1, card("1", "bird", 9)),
      play(2, card("2", "bird", 4)),
      play(3, card("3", "bird", 2)),
    ]);
    const r2 = resolveTrickPipeline(ten, "reptile", 2);
    expect(r2.fusions[0].fusionPower).toBe(10);
    expect(r2.fusions[0].showsFusionBeast).toBe(false);

    const eleven = trickOf([
      play(0, card("0", "bird", 6), { specials: ["team_bond"] }),
      play(1, card("1", "bird", 9)),
      play(2, card("2", "bird", 5)),
      play(3, card("3", "bird", 2)),
    ]);
    const r3 = resolveTrickPipeline(eleven, "reptile", 2);
    expect(r3.fusions[0].fusionPower).toBe(11);
    expect(r3.fusions[0].showsFusionBeast).toBe(true);

    const cap = trickOf([
      play(0, card("0", "bird", 7), { specials: ["team_bond"] }),
      play(1, card("1", "bird", 9)),
      play(2, card("2", "bird", 6)),
      play(3, card("3", "bird", 2)),
    ]);
    const r4 = resolveTrickPipeline(cap, "reptile", 2);
    expect(r4.fusions[0].fusionPower).toBe(FUSION_POWER_CAP);
    expect(r4.fusions[0].showsFusionBeast).toBe(true);
  });

  it("fails on suit mismatch and already-cut trick", () => {
    const mismatch = trickOf([
      play(0, card("0", "bird", 6), { specials: ["team_bond"] }),
      play(1, card("1", "bird", 5)),
      play(2, card("2", "carnivore", 7), { effectiveSuit: "carnivore" }),
      play(3, card("3", "bird", 4)),
    ]);
    expect(resolveTrickPipeline(mismatch, "reptile", 2).fusions).toHaveLength(0);

    const cut = trickOf(
      [
        play(0, card("0", "bird", 5)),
        play(1, card("1", "reptile", 4), { effectiveSuit: "reptile" }),
        play(2, card("2", "bird", 6), { specials: ["team_bond"] }),
        play(3, card("3", "herbivore", 3)),
      ],
      0,
      "bird",
    );
    // seats 0 and 2 are teammates — wait team 0 is seats 0,2. Bond on 2, mate is 0 both bird.
    // cut by hunter reptile at index 1 before complete at index 2
    const rc = resolveTrickPipeline(cut, "reptile", 2);
    expect(rc.fusions).toHaveLength(0);
    expect(rc.events.some((e) => e.type === "TEAM_BOND_FAILED")).toBe(true);
  });

  it("A=13 beats fusion 12.5 on same suit priority", () => {
    const t = trickOf([
      play(0, card("0", "bird", 8), { specials: ["team_bond"] }),
      play(1, card("1", "bird", 13, "A")),
      play(2, card("2", "bird", 8)),
      play(3, card("3", "bird", 2)),
    ]);
    const r = resolveTrickPipeline(t, "reptile", 2);
    expect(r.fusions[0].fusionPower).toBe(12.5);
    expect(r.winnerSeat).toBe(1);
  });
});

describe("hunt command", () => {
  it("succeeds only with leader, not trick1, support, team win; changes hunter next", () => {
    // Lead carnivore; hunter=bird. Seat0 hunt_command + seat2 support carnivore.
    // No bird (hunter) plays → lead suit wins; team 0 has 8+6 vs team1 5+4 → team0 wins.
    const t = trickOf(
      [
        play(0, card("0", "carnivore", 8), { specials: ["hunt_command"], effectiveSuit: "carnivore" }),
        play(1, card("1", "herbivore", 5), { effectiveSuit: "herbivore" }),
        play(2, card("2", "carnivore", 6), { effectiveSuit: "carnivore" }),
        play(3, card("3", "herbivore", 4), { effectiveSuit: "herbivore" }),
      ],
      0,
      "carnivore",
    );
    const r = resolveTrickPipeline(t, "bird", 2);
    expect(r.winningTeam).toBe(0);
    expect(r.huntCommand?.succeeded).toBe(true);
    expect(r.huntCommand?.newHunter).toBe("carnivore");

    const fail = trickOf(
      [
        play(0, card("0", "carnivore", 8), { specials: ["hunt_command"] }),
        play(1, card("1", "bird", 9), { effectiveSuit: "bird" }),
        play(2, card("2", "herbivore", 3)),
        play(3, card("3", "bird", 10), { effectiveSuit: "bird" }),
      ],
      0,
      "carnivore",
    );
    const rf = resolveTrickPipeline(fail, "bird", 2);
    expect(rf.huntCommand?.succeeded).toBe(false);
  });

  it("trick 1 illegal path via fail reason", () => {
    const t = trickOf(
      [
        play(0, card("0", "carnivore", 8), { specials: ["hunt_command"] }),
        play(1, card("1", "carnivore", 5)),
        play(2, card("2", "carnivore", 6)),
        play(3, card("3", "carnivore", 4)),
      ],
      0,
      "carnivore",
    );
    const r = resolveTrickPipeline(t, "bird", 0);
    expect(r.huntCommand?.succeeded).toBe(false);
    expect(r.huntCommand?.failReason).toBe("trick_1");
  });
});

describe("null", () => {
  it("produces no effect and no successful special", () => {
    const t = trickOf([
      play(0, card("0", "bird", 5), { specials: ["null"] }),
      play(1, card("1", "bird", 6)),
      play(2, card("2", "bird", 4)),
      play(3, card("3", "bird", 3)),
    ]);
    const r = resolveTrickPipeline(t, "reptile", 2);
    expect(r.successfulSpecials.filter((s) => s.slug === "null")).toHaveLength(0);
    expect(r.winnerSeat).toBe(1);
  });
});

describe("interactions", () => {
  it("inversion + doping; chameleon + doping; two traps + doping", () => {
    const t = trickOf([
      play(0, card("0", "bird", 4), { specials: ["inversion", "doping"] }),
      play(1, card("1", "bird", 10)),
      play(2, card("2", "bird", 5)),
      play(3, card("3", "bird", 6)),
    ]);
    // wait can't attach two non-chameleon - but pipeline still processes if present
    // 4 → invert 9 + 2.5 = 11.5
    const r = resolveTrickPipeline(t, "reptile", 2);
    expect(r.resolved.find((x) => x.seat === 0)!.effectivePower).toBe(11.5);

    const t2 = trickOf([
      play(0, card("0", "bird", 5)),
      play(1, card("1", "carnivore", 4), {
        specials: ["chameleon", "doping"],
        chameleon: true,
        effectiveSuit: "bird",
      }),
      play(2, card("2", "bird", 3)),
      play(3, card("3", "bird", 2)),
    ]);
    const r2 = resolveTrickPipeline(t2, "reptile", 2);
    expect(r2.resolved.find((x) => x.seat === 1)!.effectivePower).toBe(6.5);
  });
});
