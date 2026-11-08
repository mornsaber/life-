/**
 * The small toolkit business events are written with (content/packs/business-events.js): a
 * skill roll, a windfall, a cost charged to the books, a nudge to a 0–100 score, money text.
 */
import { clamp } from '../../core/Random.js';
import { charge } from './TaxBook.js';
import { regionOf } from '../life/Regions.js';

export { charge };
export const money = (x) => `$${Math.round(x).toLocaleString()}`;
export const bump = (obj, key, d) => {
  obj[key] = Math.round(clamp((obj[key] ?? 50) + d, 0, 100));
};
export const revenueOf = (b) => Math.max(40000, b.lastYear?.revenue ?? 0);
/** A one-off sale outside the usual books (a catering job, a contract, a rush). */
export const windfall = (b, pct) => {
  const amount = Math.round(revenueOf(b) * pct);
  b.cash += amount;
  return amount;
};
export const cost = (b, pct, floor = 1000) => {
  const amount = Math.max(floor, Math.round(revenueOf(b) * pct));
  charge(b, amount);
  return amount;
};
/** Your own touch: smarts and the business's quality, plus luck. */
export const roll = (ctx, b, bar = 60) => ctx.state.stats.smarts * 0.4 + (b.quality ?? 50) * 0.6 + ctx.rng.int(-20, 20) >= bar;
export const cityOf = (state) => regionOf(state).name.split(/[,–]/)[0].trim();
export const stars = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
