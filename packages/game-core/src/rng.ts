/** Injectable RNG for deterministic tests and seeded matches */
export interface RandomSource {
  next(): number;
}

export class SeededRandom implements RandomSource {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 1;
  }

  next(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }
}

export function shuffle<T>(items: T[], rng: RandomSource): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function randomInt(rng: RandomSource, min: number, maxInclusive: number): number {
  return min + Math.floor(rng.next() * (maxInclusive - min + 1));
}
