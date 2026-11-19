/**
 * Driving by country and era: when the driving test began, the age you could drive, and how many
 * households had a car (so whether anyone in the family would teach you, or expect you to learn).
 *
 *   The test     Germany from 1909, France's permis de conduire from 1922 (a certificat since
 *                1893), Britain from 1935 (licences bought over the counter before), Ireland only
 *                from 1964, Belgium not until 1977. Before the test, a licence was a form and a fee.
 *   The age      16 in America and Canada, 15 in New Zealand until 1999, 17 in Britain, Ireland and
 *                Australia, 18 in most of Europe, Japan, India and Latin America.
 *   The car      most American families had one by 1930; Britain by 1970; France and Germany in
 *                the 1960s; Japan in the 1970s; India, China and Africa still few.
 *
 *   drivingAge(state), drivingTestHere(state), carShare(state)
 */
import { yearNow } from '../world/Eras.js';

const cc = (state) => state.character?.countryId ?? 'US';

/** [test from, age, [[year, share of households with a car], …]] */
const D = {
  US: [1935, 16, [[1905, 0], [1915, 0.1], [1920, 0.26], [1930, 0.6], [1945, 0.55], [1960, 0.78], [1980, 0.87], [2000, 0.92]]],
  CA: [1927, 16, [[1910, 0], [1920, 0.15], [1930, 0.45], [1950, 0.55], [1970, 0.8], [2000, 0.88]]],
  GB: [1935, 17, [[1905, 0], [1920, 0.02], [1939, 0.1], [1950, 0.14], [1960, 0.31], [1970, 0.52], [1990, 0.67], [2010, 0.75]]],
  IE: [1964, 17, [[1920, 0.01], [1950, 0.08], [1970, 0.4], [1990, 0.65], [2010, 0.8]]],
  AU: [1930, 17, [[1910, 0], [1930, 0.15], [1950, 0.3], [1970, 0.75], [2000, 0.9]]],
  NZ: [1925, 15, [[1910, 0], [1930, 0.2], [1950, 0.35], [1970, 0.75], [2000, 0.9]]],
  FR: [1922, 18, [[1905, 0], [1930, 0.04], [1950, 0.15], [1960, 0.3], [1970, 0.58], [1990, 0.77], [2010, 0.81]]],
  DE: [1909, 18, [[1905, 0], [1930, 0.03], [1950, 0.05], [1960, 0.27], [1970, 0.5], [1990, 0.72], [2010, 0.78]]],
  AT: [1910, 18, [[1930, 0.02], [1960, 0.15], [1980, 0.6], [2010, 0.78]]],
  NL: [1906, 18, [[1930, 0.03], [1960, 0.15], [1970, 0.5], [1990, 0.7], [2010, 0.75]]],
  BE: [1977, 18, [[1930, 0.03], [1960, 0.25], [1980, 0.7], [2010, 0.8]]],
  IT: [1912, 18, [[1930, 0.01], [1950, 0.03], [1960, 0.15], [1970, 0.5], [1990, 0.8]]],
  ES: [1934, 18, [[1950, 0.01], [1960, 0.05], [1970, 0.3], [1990, 0.65], [2010, 0.75]]],
  SE: [1916, 18, [[1930, 0.05], [1960, 0.4], [1980, 0.7]]],
  JP: [1919, 18, [[1930, 0], [1960, 0.03], [1970, 0.22], [1980, 0.57], [1990, 0.77], [2010, 0.8]]],
  KR: [1950, 18, [[1980, 0.03], [1990, 0.3], [2010, 0.7]]],
  CN: [1950, 18, [[1990, 0.005], [2005, 0.05], [2015, 0.25], [2020, 0.4]]],
  IN: [1939, 18, [[1950, 0.002], [1990, 0.02], [2010, 0.06], [2020, 0.08]]],
  RU: [1920, 18, [[1950, 0.005], [1970, 0.05], [1985, 0.15], [2000, 0.3], [2020, 0.5]]],
  BR: [1941, 18, [[1950, 0.02], [1980, 0.25], [2000, 0.35], [2020, 0.5]]],
  MX: [1940, 18, [[1950, 0.03], [1980, 0.25], [2000, 0.4], [2020, 0.5]]],
  AR: [1945, 18, [[1950, 0.05], [1980, 0.3], [2010, 0.5]]],
  ZA: [1940, 18, [[1950, 0.08], [2000, 0.25], [2020, 0.3]]],
};
const FALLBACK = [1940, 18, [[1950, 0.01], [1980, 0.05], [2000, 0.15], [2020, 0.3]]];
const SOVIET = ['UA', 'BY', 'KZ', 'GE', 'AM', 'AZ', 'UZ', 'KG', 'TJ', 'TM', 'MD', 'EE', 'LV', 'LT'];
const rowOf = (c) => D[c] ?? (SOVIET.includes(c) ? D.RU : FALLBACK);

const along = (curve, y) => {
  if (y <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++) {
    const [y1, v1] = curve[i];
    const [y0, v0] = curve[i - 1];
    if (y <= y1) return v0 + ((v1 - v0) * (y - y0)) / (y1 - y0);
  }
  return curve.at(-1)[1];
};

/** The age you could drive here. */
export const drivingAge = (state) => (cc(state) === 'NZ' && yearNow(state) >= 1999 ? 16 : rowOf(cc(state))[1]);
/** Whether there was a driving test here yet (before it, a licence was a form and a fee). */
export const drivingTestHere = (state) => yearNow(state) >= rowOf(cc(state))[0];
/** The share of households with a car, here and now (richer families more, poorer fewer). */
export function carShare(state) {
  const base = along(rowOf(cc(state))[2], yearNow(state));
  const w = state.people?.wealth;
  return Math.min(1, base * (w === 'upper' ? 3 : w === 'lower' ? 0.6 : 1));
}
/** Is there a car in your life (the family's, or one you've owned)? A stable roll per life. */
export function carInTheFamily(state) {
  if ((state.vehicles?.owned ?? []).length) return true;
  let h = Math.imul((state.world?.seed ?? 1) ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  const roll = ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  return roll < carShare(state);
}
