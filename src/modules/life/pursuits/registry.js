/**
 * Pursuits: hobbies and sports as packs (life/pursuits/*.js), lived through life/Hobbies.js.
 *
 * A pack is { id: def }. A def (all but label/icon/kind/cost/stat/minAge optional):
 *
 *   label, icon, kind            'sport' | 'music' | 'art' | 'mind' | 'craft' | 'outdoor'
 *   cost, stat, minAge, risk     a year's lessons and kit (today's money), the stat it trains
 *   from, until                  the years it was taken up (cycling from the safety bicycle)
 *   places                       countries where it's played at all (cricket, baseball)
 *   women                        the year women could compete in it at all; before that they
 *                                play among friends only (tier 0). womenBan: [from, to, [countries]]
 *                                for an outright ban (the FA's on women's football, 1921–71)
 *   tiers                        six names for the ladder (default Beginner … Elite)
 *   events                       [[fromYear, [five events by tier]], …]: the latest that has begun
 *   body                         [[fromYear, name, [countries] | '*'], …]: who runs it here then
 *   club                         { names: […], fee } — sport and mind need a club for tier 2 up
 *   honours                      [{ id, label, skill, odds, from, olympic, icon, honor }]: the
 *                                selections that come at a level (county colours, a cap, Olympics)
 *   amateurUntil                 before this year winners take a cup, never prize money
 *   pro                          [professionId, levelId, fromYear]: the career an elite one can become
 *
 * Keep this file a leaf: it imports only the packs and world/Eras.js.
 */
import { yearNow } from '../../world/Eras.js';
import { SPORTS } from './sport.js';
import { ARTS } from './arts.js';
import { MINDS } from './mind.js';

const compose = (...packs) => Object.assign({}, ...packs);
export const PURSUITS = compose(ARTS, MINDS, SPORTS);

export const DEFAULT_TIERS = ['Beginner', 'Amateur', 'Club', 'Competitive', 'Semi-pro', 'Elite'];
export const TIER_MINS = [0, 20, 40, 60, 75, 90];
export const tierIndex = (skill) => TIER_MINS.filter((m) => skill >= m).length - 1;
export const tierName = (def, skill) => (def?.tiers ?? DEFAULT_TIERS)[tierIndex(skill)];

const cc = (state) => state.character?.countryId ?? 'US';
const female = (state) => state.character?.gender === 'female';

/** Can you take it up here, this year? (null, or the reason not.) */
export function pursuitBlock(state, def) {
  const y = yearNow(state);
  if (def.from && y < def.from) return `not until ${def.from}`;
  if (def.until && y >= def.until) return 'nobody does it any more';
  if (def.places && !def.places.includes(cc(state))) return 'not played here';
  return null;
}
/** The highest tier you may compete at as a woman in your day (5 when nothing stops you). */
export function womenCap(state, def) {
  if (!female(state)) return 5;
  const y = yearNow(state);
  const ban = def.womenBan;
  if (ban && y >= ban[0] && y < ban[1] && (!ban[2] || ban[2].includes(cc(state)))) return 0;
  return def.women && y < def.women ? 0 : 5;
}
/** The five events by tier, as they were in your year. */
export function eventsFor(state, def, fallback) {
  const y = yearNow(state);
  const row = (def.events ?? []).filter(([from]) => y >= from).at(-1);
  return row?.[1] ?? fallback;
}
/** Who runs it here, now (null before anybody did). */
export function bodyFor(state, def) {
  const y = yearNow(state);
  const row = (def.body ?? []).filter(([from, , where]) => y >= from && (!where || where === '*' || where.includes(cc(state)))).at(-1);
  return row?.[1] ?? null;
}
/** Olympic years (none in the war years). */
export const olympicYear = (y) => y >= 1896 && y % 4 === 0 && ![1916, 1940, 1944].includes(y);
export const needsClub = (def) => def.club && ['sport', 'mind'].includes(def.kind);
export const amateurDays = (state, def) => def.amateurUntil && yearNow(state) < def.amateurUntil;
