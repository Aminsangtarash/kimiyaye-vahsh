import type { SpecialSlug } from "@kv/contracts";

export const SPECIAL_RULES_VERSION = 1 as const;

export const SPECIAL_DRAW_CHANCE_DEFAULT = 0.1;
export const SPECIAL_MAX_INVENTORY = 3;
export const DOPING_DELTA = 2.5;
export const TRAP_DELTA = -2.5;
export const FUSION_POWER_CAP = 12.5;
/** Visual threshold: dedicated Fusion Beast card only when final Team Bond power exceeds this. */
export const FUSION_BEAST_VISUAL_THRESHOLD = 10;
export const A_POWER_FLOOR = 13;
export const NORMAL_POWER_FLOOR = 0;

/** Centralized weighted pool (total 64). */
export const DEFAULT_SPECIAL_POOL_WEIGHTS: Record<SpecialSlug, number> = {
  doping: 10,
  trap: 10,
  chameleon: 10,
  inversion: 10,
  team_bond: 10,
  null: 10,
  hunt_command: 3,
  armageddon: 1,
};

export const V1_SPECIAL_SLUGS: readonly SpecialSlug[] = [
  "doping",
  "trap",
  "chameleon",
  "inversion",
  "team_bond",
  "null",
  "hunt_command",
  "armageddon",
] as const;

export const SPECIAL_META: Record<
  SpecialSlug,
  { fa: string; en: string; shortFa: string }
> = {
  doping: { fa: "دوپینگ", en: "Doping", shortFa: "+۲٫۵ قدرت" },
  trap: { fa: "تله", en: "Trap", shortFa: "−۲٫۵ به حریف" },
  chameleon: { fa: "نیرنگ آفتاب‌پرست", en: "Chameleon", shortFa: "تغییر دسته" },
  inversion: { fa: "نفرین وارونگی", en: "Inversion", shortFa: "وارونگی رتبه" },
  team_bond: { fa: "همتازی", en: "Team Bond", shortFa: "هیولای ترکیبی" },
  null: { fa: "پوچ", en: "Null", shortFa: "بدون اثر" },
  hunt_command: { fa: "فرمان شکار", en: "Hunt Command", shortFa: "تغییر شکارچی" },
  armageddon: { fa: "آرماگدون", en: "Armageddon", shortFa: "نابودی A حریف" },
};

export function isLegendaryRank(displayRank: string, strength: number): boolean {
  return displayRank === "A" || displayRank === "B" || displayRank === "C" || strength >= 11;
}

export function isAceCard(displayRank: string, strength: number): boolean {
  return displayRank === "A" || strength === 13;
}
