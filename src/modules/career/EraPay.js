/**
 * Women's work of its day (a leaf: Compensation.js reads the pay rate from here).
 *
 * - Before an equal pay law, women were paid "the women's rate" for the same job, roughly three
 *   quarters of the men's. After it, the gap closed over the next twenty years or so.
 * - Marriage bars: in public services (and teaching) a woman had to resign when she married,
 *   and married women weren't taken on, until the bar was lifted.
 * - Japan and Korea's big firms expected women to retire on marriage, without a law saying so.
 */
import { yearNow } from '../world/Eras.js';

/** Year an equal pay law came in (loosely: the act in force). */
export const EQUAL_PAY = {
  US: 1963, GB: 1975, IE: 1974, AU: 1972, NZ: 1972, CA: 1971, FR: 1972, DE: 1980, IT: 1977, ES: 1980, PT: 1979,
  NL: 1975, BE: 1975, SE: 1980, NO: 1978, DK: 1976, FI: 1987, AT: 1979, CH: 1981, GR: 1984, JP: 1986, KR: 1988,
  IN: 1976, CN: 1950, RU: 1918, MX: 1974, BR: 1988, AR: 1974, ZA: 1998, SG: 2000, PH: 1989, IL: 1964, TR: 1971,
};
/** Public services that paid women the men's rate earlier than the rest of the country. */
const PUBLIC_EQUAL_PAY = { US: 1923, GB: 1961, NZ: 1960, AU: 1969, CA: 1956 };
const LOW_RATE = { JP: 0.7, KR: 0.7 };
const PUBLIC = ['municipal', 'state', 'federal', 'public'];

/** The year your job paid women the men's rate. */
export function equalPayYear(state, job) {
  const cc = state.character.countryId;
  const law = EQUAL_PAY[cc] ?? 1975;
  return PUBLIC.includes(job?.sector) ? Math.min(law, PUBLIC_EQUAL_PAY[cc] ?? law) : law;
}

/** Share of the men's pay a woman got for this job this year (1 = equal). */
export function womensRate(state, job) {
  if (state.character.gender !== 'female' || !job) return 1;
  const y = yearNow(state);
  const act = equalPayYear(state, job);
  if (y < act) return LOW_RATE[state.character.countryId] ?? 0.75;
  // The law closed most of it at once; the rest went over a generation.
  return y - act >= 20 ? 1 : Math.round((0.9 + 0.1 * ((y - act) / 20)) * 100) / 100;
}

/** Marriage bars by country: which work, and until when. */
const BARS = {
  GB: [{ sectors: ['federal'], until: 1946, what: 'the civil service' }, { ids: ['gb_foreignService'], until: 1973, what: 'the Diplomatic Service' }, { ids: ['education'], until: 1944, what: 'teaching' }],
  IE: [{ sectors: PUBLIC, until: 1973, what: 'the public service' }, { ids: ['education'], until: 1958, what: 'teaching' }],
  US: [{ ids: ['education'], from: 1880, until: 1950, what: 'teaching' }, { sectors: ['federal'], from: 1932, until: 1937, what: 'federal service' }],
  AU: [{ sectors: ['federal'], until: 1966, what: 'the Commonwealth public service' }, { ids: ['education'], until: 1966, what: 'teaching' }],
  CA: [{ sectors: ['federal'], until: 1955, what: 'the federal public service' }],
  NL: [{ sectors: ['federal'], until: 1957, what: 'the civil service' }, { ids: ['education'], until: 1957, what: 'teaching' }],
  DE: [{ sectors: ['federal'], until: 1951, what: 'the civil service' }],
};
/** Big firms' unwritten rule: retire when you marry. */
const CUSTOM_UNTIL = { JP: 1986, KR: 1988 };

const idOf = (p) => p?.template ?? p?.id;

/** The marriage bar on this work for a woman here this year, or null. */
export function marriageBar(state, profession) {
  if (!profession) return null;
  const y = yearNow(state);
  for (const b of BARS[state.character.countryId] ?? []) {
    if (y >= b.until || (b.from && y < b.from)) continue;
    if (b.ids?.includes(profession.id) || b.ids?.includes(idOf(profession)) || b.sectors?.includes(profession.sector)) return b;
  }
  return null;
}

/** Japan and Korea's big firms: expected to retire on marriage (until the equal opportunity laws). */
export function retireOnMarriageCustom(state, job) {
  const until = CUSTOM_UNTIL[state.character.countryId];
  return Boolean(until && yearNow(state) < until && job?.sector === 'private' && ['large', 'enterprise', 'mega'].includes(job.employer?.size));
}

/** The glass ceiling: senior posts went to men, more so before the law. */
export function ceilingFactor(state, job, grade) {
  if (state.character.gender !== 'female' || (grade ?? 0) < 5) return 1;
  const y = yearNow(state);
  const act = equalPayYear(state, job);
  if (job?.stayedOnMarried) return 0.6;
  return y < act ? 0.75 : y < act + 20 ? 0.9 : 1;
}
