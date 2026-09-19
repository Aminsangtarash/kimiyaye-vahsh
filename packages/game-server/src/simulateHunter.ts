/**
 * Headless simulation: 1000 bot rounds with fixed Hunter Realm.
 * Run: pnpm --filter @kv/game-server exec tsx src/simulateHunter.ts
 */
import { ALL_ANIMAL_REALMS, type AnimalRealm } from "@kv/contracts";
import {
  applyAction,
  chooseHunterRealm,
  createInitialState,
  legalAnimalPlays,
  projectForSeat,
  resetInstanceCounter,
  SeededRandom,
} from "@kv/game-core";
import { balancedStrategy } from "./bot/balanced.js";

function playRound(seed: number): {
  ok: boolean;
  hunter: string | null;
  tricks: number;
  error?: string;
} {
  resetInstanceCounter();
  const realms = [...ALL_ANIMAL_REALMS] as AnimalRealm[];
  let state = createInitialState(`sim-${seed}`, seed, { specialCardsEnabled: false }, realms);
  let r = applyAction(state, { type: "START_MATCH", firstLeader: seed % 4 }, undefined, new SeededRandom(seed));
  if (!r.ok) return { ok: false, hunter: null, tricks: 0, error: r.error };
  state = r.state;

  let hunterFixed: string | null = null;
  let tricks = 0;
  let safety = 4000;

  while (state.phase !== "hand_complete" && state.phase !== "match_complete" && safety-- > 0) {
    if (state.phase === "hunter_selection") {
      const seat = state.hunterSelectorSeat;
      const realm = chooseHunterRealm(state.hands[seat], () => new SeededRandom(seed + seat).next());
      r = applyAction(state, { type: "SELECT_HUNTER_REALM", seat, realm, source: "bot" });
      if (!r.ok) return { ok: false, hunter: null, tricks, error: r.error };
      state = r.state;
      hunterFixed = state.hunterRealm;
      // verify deal integrity
      const all = state.hands.flat();
      if (all.length !== 52 || new Set(all.map((c) => c.instanceId)).size !== 52) {
        return { ok: false, hunter: hunterFixed, tricks, error: "card duplication" };
      }
      continue;
    }
    if (state.phase === "resolving_trick") {
      const before = state.hunterRealm;
      r = applyAction(state, { type: "RESOLVE_TRICK" });
      if (!r.ok) return { ok: false, hunter: hunterFixed, tricks, error: r.error };
      state = r.state;
      tricks += 1;
      if (state.hunterRealm !== before && state.phase !== "hunter_selection") {
        return { ok: false, hunter: before, tricks, error: "hunter changed mid-round" };
      }
      continue;
    }
    if (state.phase !== "playing") break;
    if (state.hunterRealm !== hunterFixed) {
      return { ok: false, hunter: hunterFixed, tricks, error: "hunter drift" };
    }
    const seat = state.currentPlayer;
    const view = projectForSeat(state, seat);
    const intent = balancedStrategy.chooseAction(view, () => ((state.stateVersion * 17 + seat) % 1000) / 1000);
    if (!intent || intent.type !== "PLAY_CARD") {
      const legal = legalAnimalPlays(state, seat);
      if (!legal[0]) return { ok: false, hunter: hunterFixed, tricks, error: "no legal" };
      r = applyAction(state, { type: "PLAY_CARD", seat, cardInstanceId: legal[0].instanceId });
    } else {
      r = applyAction(state, { type: "PLAY_CARD", seat, cardInstanceId: intent.cardInstanceId });
    }
    if (!r.ok) return { ok: false, hunter: hunterFixed, tricks, error: r.error };
    state = r.state;
  }

  return {
    ok: state.phase === "hand_complete" || state.phase === "match_complete" || state.phase === "hunter_selection",
    hunter: hunterFixed,
    tricks,
  };
}

const N = Number(process.env.SIM_ROUNDS ?? 1000);
let ok = 0;
let fail = 0;
for (let i = 0; i < N; i++) {
  const res = playRound(1000 + i);
  if (res.ok) ok += 1;
  else {
    fail += 1;
    console.error("fail", i, res);
    if (fail > 5) break;
  }
}
console.log(JSON.stringify({ rounds: N, ok, fail }));
if (fail > 0) process.exit(1);
