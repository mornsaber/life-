/**
 * First-time homebuyer help. (The life events that used to live here are now the
 * life-stages content pack: src/modules/content/packs/life-stages.js.)
 */
import { isIncarcerated } from '../../core/State.js';

const working = (s) => !isIncarcerated(s) && Boolean(s.career.job);

/**
 * State housing agencies' first-time homebuyer programs: working renters
 * 25–40 have a steady chance each year of qualifying for down-payment help
 * (once in a life).
 */
export function downPaymentAssistance(ctx) {
  const s = ctx.state;
  const age = s.character.age;
  if (s.flags?.dpa || age < 25 || age > 40 || !working(s) || s.housing.properties.length || !ctx.rng.chance(0.12)) return false;
  s.flags = { ...s.flags, dpa: true };
  const n = ctx.rng.int(8, 15) * 1000;
  s.finances.cash += n;
  ctx.log(`You qualified for your state housing agency's first-time homebuyer program: $${n.toLocaleString()} in down-payment assistance toward a home.`, '🏡', 'good');
  return true;
}
