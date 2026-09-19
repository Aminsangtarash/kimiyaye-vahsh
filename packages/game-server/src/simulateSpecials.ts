/**
 * Headless Special Cards V1 bot simulation + light telemetry.
 * Run: pnpm --filter @kv/game-server exec tsx src/simulateSpecials.ts
 */
import { ALL_ANIMAL_REALMS, type AnimalRealm } from "@kv/contracts";
import {
  applyAction,
  chooseHunterRealm,
  createInitialState,
  projectForSeat,
  resetInstanceCounter,
  SeededRandom,
} from "@kv/game-core";
import { balancedStrategy } from "./bot/balanced.js";

type Stats = {
  rounds: number;
  completed: number;
  errors: number;
  draws: number;
  drawFails: number;
  drawSuccess: number;
  plays: Record<string, number>;
  successes: Record<string, number>;
  bondOk: number;
  bondFail: number;
  fusionBeast: number;
  armaDestroys: number;
  huntOk: number;
  huntFail: number;
  hunterChanges: number;
};

function emptyStats(): Stats {
  return {
    rounds: 0,
    completed: 0,
    errors: 0,
    draws: 0,
    drawFails: 0,
    drawSuccess: 0,
    plays: {},
    successes: {},
    bondOk: 0,
    bondFail: 0,
    fusionBeast: 0,
    armaDestroys: 0,
    huntOk: 0,
    huntFail: 0,
    hunterChanges: 0,
  };
}

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

function playRound(seed: number, stats: Stats): boolean {
  resetInstanceCounter();
  const realms = [...ALL_ANIMAL_REALMS] as AnimalRealm[];
  let state = createInitialState(`sim-sp-${seed}`, seed, {
    specialCardsEnabled: true,
    specialDrawChance: 0.1,
  }, realms);
  let r = applyAction(state, { type: "START_MATCH", firstLeader: seed % 4 }, undefined, new SeededRandom(seed));
  if (!r.ok) {
    stats.errors += 1;
    return false;
  }
  state = r.state;
  let safety = 6000;
  let hunterAtRoundStart: string | null = null;

  while (state.phase !== "hand_complete" && state.phase !== "match_complete" && safety-- > 0) {
    if (state.phase === "hunter_selection") {
      const seat = state.hunterSelectorSeat;
      const realm = chooseHunterRealm(state.hands[seat], () => new SeededRandom(seed + seat).next());
      r = applyAction(state, { type: "SELECT_HUNTER_REALM", seat, realm, source: "bot" });
      if (!r.ok) {
        stats.errors += 1;
        return false;
      }
      state = r.state;
      hunterAtRoundStart = state.hunterRealm;
      continue;
    }
    if (state.phase === "resolving_trick") {
      const before = state.hunterRealm;
      r = applyAction(state, { type: "RESOLVE_TRICK" });
      if (!r.ok) {
        stats.errors += 1;
        return false;
      }
      for (const e of r.events ?? []) {
        if (e.type === "SPECIAL_PLAYED") bump(stats.plays, e.slug);
        if (e.type === "SPECIAL_RESOLVED" && e.success) bump(stats.successes, e.slug);
        if (e.type === "TEAM_BOND_CREATED") {
          stats.bondOk += 1;
          if (e.showsFusionBeast) stats.fusionBeast += 1;
        }
        if (e.type === "TEAM_BOND_FAILED") stats.bondFail += 1;
        if (e.type === "ARMAGEDDON_DESTROYED_A") stats.armaDestroys += 1;
        if (e.type === "HUNT_COMMAND_SUCCEEDED") {
          stats.huntOk += 1;
          stats.hunterChanges += 1;
        }
        if (e.type === "HUNT_COMMAND_FAILED") stats.huntFail += 1;
      }
      state = r.state;
      if (before && state.hunterRealm && before !== state.hunterRealm && hunterAtRoundStart) {
        // counted via event
      }
      continue;
    }
    if (state.phase !== "playing") break;
    if (state.specialHands.some((h) => h.length > state.config.specialMaxInventory + 1)) {
      stats.errors += 1;
      return false;
    }
    const seat = state.currentPlayer;
    const view = projectForSeat(state, seat);
    const botRng = new SeededRandom(state.seed + state.stateVersion * 99991 + seat * 17 + 12345);
    const intent = balancedStrategy.chooseAction(view, () => botRng.next());
    if (!intent) {
      stats.errors += 1;
      return false;
    }
    if (intent.type === "REQUEST_SPECIAL_DRAW") {
      stats.draws += 1;
      const drawRng = new SeededRandom(state.seed + state.stateVersion * 7919 + seat * 104729 + 7);
      r = applyAction(state, { type: "REQUEST_SPECIAL_DRAW", seat }, undefined, drawRng);
      if (r.events?.some((e) => e.type === "SPECIAL_DRAW_FAILED")) stats.drawFails += 1;
      if (r.events?.some((e) => e.type === "SPECIAL_DRAW_SUCCEEDED")) stats.drawSuccess += 1;
    } else if (intent.type === "DISCARD_SPECIAL") {
      r = applyAction(state, { type: "DISCARD_SPECIAL", seat, specialInstanceId: intent.specialInstanceId });
    } else if (intent.type === "PLAY_CARD") {
      r = applyAction(state, {
        type: "PLAY_CARD",
        seat,
        cardInstanceId: intent.cardInstanceId,
        specialInstanceIds: intent.specialInstanceIds,
      });
    } else {
      stats.errors += 1;
      return false;
    }
    if (!r.ok) {
      const legal = view.legalCardIds[0];
      if (!legal) {
        stats.errors += 1;
        return false;
      }
      r = applyAction(state, { type: "PLAY_CARD", seat, cardInstanceId: legal });
      if (!r.ok) {
        stats.errors += 1;
        return false;
      }
    }
    state = r.state;
  }

  const ok = state.phase === "hand_complete" || state.phase === "match_complete";
  if (ok) stats.completed += 1;
  else stats.errors += 1;
  return ok;
}

const N = Number(process.env.SPECIAL_SIM_ROUNDS ?? 2000);
const stats = emptyStats();
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  stats.rounds += 1;
  playRound(10_000 + i, stats);
}
const ms = Date.now() - t0;
console.log(
  JSON.stringify(
    {
      ok: stats.errors === 0 && stats.completed === N,
      ms,
      roundsRequested: N,
      ...stats,
      note: "FusionBeast visual only when TeamBond power > 10; gameplay bond always when valid.",
    },
    null,
    2,
  ),
);
process.exit(stats.errors === 0 && stats.completed === N ? 0 : 1);
