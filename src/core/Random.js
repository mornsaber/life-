/**
 * Seedable PRNG (mulberry32) plus the gameplay helpers every module uses.
 * Seeding makes headless simulations reproducible; the browser seeds from time.
 */
export class Random {
  constructor(seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0) {
    this.seed = seed >>> 0;
  }

  next() {
    let t = (this.seed = (this.seed + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  chance(p) {
    return this.next() < p;
  }

  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  float(min, max) {
    return this.next() * (max - min) + min;
  }

  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }

  /** Pick from `items` using `weightOf(item)` as relative weight. */
  weighted(items, weightOf = (item) => item.weight) {
    const total = items.reduce((sum, item) => sum + Math.max(0, weightOf(item)), 0);
    let roll = this.next() * total;
    for (const item of items) {
      roll -= Math.max(0, weightOf(item));
      if (roll < 0) return item;
    }
    return items[items.length - 1];
  }

  shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  id(prefix = '') {
    return prefix + Math.floor(this.next() * 0xffffffff).toString(36);
  }
}

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const round = (value, step = 1) => Math.round(value / step) * step;
