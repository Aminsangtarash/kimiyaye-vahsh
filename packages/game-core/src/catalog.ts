import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { DisplayRank, Suit, SpecialSlug } from "@kv/contracts";

export interface AnimalCatalogEntry {
  id: string;
  slug: string;
  suit: Suit;
  displayRank: DisplayRank;
  powerBarFill: number;
  persianName: string;
  englishName: string;
  type: "normal" | "legendary";
}

export interface SpecialCatalogEntry {
  id: string;
  slug: SpecialSlug;
  persianName: string;
  englishName: string;
  effect?: string;
  effectFa?: string;
  rarity?: string;
}

export interface GameCatalog {
  animals: AnimalCatalogEntry[];
  specials: SpecialCatalogEntry[];
}

function repoDataPath(...parts: string[]): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "../../..", "data", ...parts);
}

let cached: GameCatalog | null = null;

export function loadCatalog(fromDir?: string): GameCatalog {
  if (cached && !fromDir) return cached;
  const base = fromDir ?? repoDataPath();
  const cardsDoc = JSON.parse(readFileSync(join(base, "cards.json"), "utf-8")) as {
    cards: Array<{
      id: string;
      slug: string;
      suit: Suit;
      displayRank: DisplayRank;
      powerBarFill: number;
      persianName: string;
      englishName: string;
      type: "normal" | "legendary";
    }>;
  };
  // Prefer Special Cards V1; fall back to legacy file only if v1 missing.
  let specialDoc: {
    cards: Array<{
      id: string;
      slug: SpecialSlug;
      persianName: string;
      englishName: string;
      effect?: string;
      effectFa?: string;
      rarity?: string;
    }>;
  };
  try {
    specialDoc = JSON.parse(readFileSync(join(base, "special-cards.v1.json"), "utf-8"));
  } catch {
    specialDoc = JSON.parse(readFileSync(join(base, "special-cards.json"), "utf-8"));
  }
  const catalog: GameCatalog = {
    animals: cardsDoc.cards.map((c) => ({
      id: c.id,
      slug: c.slug,
      suit: c.suit,
      displayRank: c.displayRank,
      powerBarFill: c.powerBarFill,
      persianName: c.persianName,
      englishName: c.englishName,
      type: c.type,
    })),
    specials: specialDoc.cards.map((c) => ({
      id: c.id,
      slug: c.slug,
      persianName: c.persianName,
      englishName: c.englishName,
      effect: c.effect,
      effectFa: c.effectFa,
      rarity: c.rarity,
    })),
  };
  if (!fromDir) cached = catalog;
  return catalog;
}

/** @deprecated V1 uses weighted draw — no fixed deal deck. */
export function buildSpecialDeck(catalog: GameCatalog): SpecialSlug[] {
  return catalog.specials.map((s) => s.slug);
}
