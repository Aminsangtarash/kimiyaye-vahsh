#!/usr/bin/env node
/**
 * Validate canonical card / special / artwork data without touching production code.
 * Usage: pnpm --filter @kv/game-server validate-data
 *    or: node --import tsx packages/game-server/src/validateData.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const SUITS = new Set(["carnivore", "herbivore", "bird", "reptile"]);
const RANKS = new Set(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "C", "B", "A"]);
const SUIT_FOLDER: Record<string, string> = {
  carnivore: "carnivores",
  herbivore: "herbivores",
  bird: "birds",
  reptile: "reptiles",
};

interface Issue {
  level: "error" | "warn";
  code: string;
  message: string;
}

function main(): number {
  const issues: Issue[] = [];
  const cards = JSON.parse(readFileSync(join(ROOT, "data/cards.json"), "utf-8")) as {
    cards: Array<{
      id: string;
      slug: string;
      suit: string;
      displayRank: string;
      powerBarFill: number;
      type: string;
    }>;
  };
  const specials = JSON.parse(readFileSync(join(ROOT, "data/special-cards.json"), "utf-8")) as {
    cards: Array<{ id: string; slug: string; persianName?: string; englishName?: string; effect?: string }>;
  };
  const ranks = JSON.parse(readFileSync(join(ROOT, "data/rank-model.json"), "utf-8")) as {
    displayRankToPowerBarFill: Record<string, number>;
  };

  if (cards.cards.length !== 52) {
    issues.push({ level: "error", code: "COUNT", message: `Expected 52 cards, got ${cards.cards.length}` });
  }
  const ids = new Set<string>();
  for (const c of cards.cards) {
    if (ids.has(c.id)) issues.push({ level: "error", code: "DUP_ID", message: c.id });
    ids.add(c.id);
    if (!SUITS.has(c.suit)) issues.push({ level: "error", code: "SUIT", message: `${c.id} suit=${c.suit}` });
    if (!RANKS.has(c.displayRank)) {
      issues.push({ level: "error", code: "RANK", message: `${c.id} rank=${c.displayRank}` });
    }
    const expected = ranks.displayRankToPowerBarFill[c.displayRank];
    if (expected !== c.powerBarFill) {
      issues.push({
        level: "error",
        code: "POWER",
        message: `${c.id} fill ${c.powerBarFill} != ${expected}`,
      });
    }
    const folder = SUIT_FOLDER[c.suit];
    const portrait = join(ROOT, "assets/cards/portraits/final", folder, `${c.slug}.png`);
    if (!existsSync(portrait)) {
      issues.push({ level: "error", code: "ART", message: `Missing portrait ${portrait}` });
    }
    const clean = join(ROOT, "assets/cards/final/clean", `${c.slug}.png`);
    if (!existsSync(clean)) {
      issues.push({ level: "warn", code: "RENDER", message: `Missing clean render ${c.slug}` });
    }
  }

  const specialIds = new Set<string>();
  for (const s of specials.cards) {
    if (specialIds.has(s.id)) issues.push({ level: "error", code: "DUP_SPECIAL", message: s.id });
    specialIds.add(s.id);
    if (!s.persianName || !s.englishName || !s.effect) {
      issues.push({ level: "error", code: "SPECIAL_MALFORMED", message: s.id });
    }
    const art = join(ROOT, "assets/cards/special/portraits", `${s.slug}.png`);
    if (!existsSync(art)) {
      issues.push({ level: "error", code: "SPECIAL_ART", message: `Missing ${s.slug}.png` });
    }
  }

  const errors = issues.filter((i) => i.level === "error");
  const warns = issues.filter((i) => i.level === "warn");
  console.log(JSON.stringify({ ok: errors.length === 0, errors, warns, counts: { cards: cards.cards.length, specials: specials.cards.length } }, null, 2));
  return errors.length === 0 ? 0 : 1;
}

process.exit(main());
