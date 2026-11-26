/**
 * States this world made that history didn't: a territory that voted itself independent
 * (politics/Referendums.js). No imports, so any module can ask.
 *
 *   { [cc]: { year, of } }   of: the state it left (GB, DK, US…)
 */
let NEW = {};
export const setNewStates = (o = {}) => { NEW = o ?? {}; };
/** The year it became independent in this world, or null. */
export const independentSince = (cc) => NEW[cc]?.year ?? null;
export const newStateOf = (cc) => NEW[cc] ?? null;
/** International bodies a new state joins, and how long after independence. */
export const JOINS = { un: 1, imf: 2, worldBank: 2, wto: 4, commonwealth: 0 };
export function newStateMember(org, cc, y) {
  const n = NEW[cc];
  if (!n || JOINS[org] == null) return false;
  if (org === 'commonwealth' && n.of !== 'GB') return false;
  return y >= n.year + JOINS[org];
}

/**
 * States this world redrew (world/StateChanges.js): rows that apply to a city on top of history's
 * own (HistoricalData.js REGION_STATES). A row with `clear` hands the city back to its country.
 *   { [regionId]: [{ from, to, name, leader, kind, flag, currency } | { from, to, clear: true }] }
 */
let DYN = {};
export const setDynamicRegions = (o = {}) => { DYN = o ?? {}; };
/** undefined: nothing redrawn here; null: handed back (no state of its own); else the row. */
export function dynamicRegionState(regionId, year) {
  const row = (DYN[regionId] ?? []).filter((r) => year >= r.from && (r.to == null || year < r.to)).at(-1);
  if (!row) return undefined;
  return row.clear ? null : row;
}
/** Countries this world dissolved (merged into another): { [cc]: { year, into } }. */
let GONE = {};
export const setDissolved = (o = {}) => { GONE = o ?? {}; };
export const dissolvedInto = (cc, year = 9999) => (GONE[cc] && year >= GONE[cc].year ? GONE[cc].into : null);

/**
 * History's breakups in this world (world/History.js sovietCollapse, yugoslaviaBreakup, velvetDivorce):
 * the year each member state became independent here (Infinity: not yet, or never), against our
 * history's year. Only set for lives begun before our date; otherwise history stands.
 */
export const BREAKUPS = {
  sovietCollapse: { EE: 1991, LV: 1991, LT: 1991, UA: 1991, BY: 1991, MD: 1991, GE: 1991, AM: 1991, AZ: 1991, KZ: 1991, UZ: 1991, TM: 1991, KG: 1991, TJ: 1991 },
  yugoslaviaBreakup: { SI: 1991, HR: 1991, MK: 1991, BA: 1992 },
  velvetDivorce: { CZ: 1993, SK: 1993 },
};
let HELD = {};
let HELD_REGIONS = {};
export const setBreakups = (o = {}, regions = {}) => { HELD = o ?? {}; HELD_REGIONS = regions ?? {}; };
/**
 * The year to read a city's history at (HistoricalData.js regionStateAt): East Berlin stays in the
 * GDR while this world's Wall stands, and leaves it when the Wall falls.
 */
export function regionHistoryYear(regionId, year) {
  const h = HELD_REGIONS[regionId];
  if (!h) return year;
  if (year >= h.ours && year < h.here) return h.ours - 1;
  if (year >= h.here && year < h.ours) return h.ours;
  return year;
}
/** true/false where this world's breakup differs from ours in that year; undefined where it doesn't. */
export function breakupSovereign(cc, year) {
  const h = HELD[cc];
  if (!h) return undefined;
  if (year >= h.ours && year < h.here) return false;
  if (year >= h.here && year < h.ours) return true;
  return undefined;
}

/**
 * How many years later than ours this world let a country join the West's clubs (the EU, NATO):
 * the Baltics only once they had left the Soviet Union, Poland once the bloc fell, Slovenia once
 * Yugoslavia broke up. 0 where history is ours; Infinity while it hasn't happened.
 */
let SHIFT = {};
export const setMembershipShift = (o = {}) => { SHIFT = o ?? {}; };
export const membershipShift = (cc) => Math.max(0, SHIFT[cc] ?? 0);
/** Satellites whose turn west waited on Moscow (History.js sovietCollapse). */
export const SATELLITES = ['PL', 'HU', 'CZ', 'SK', 'BG', 'RO', 'AL'];

/**
 * The year a country's own data should be read at, in this world: a Soviet Estonia keeps 1990's
 * ruble; an Estonia free nine years late reaches the kroon, then the euro, nine years late.
 */
export function historyYear(cc, y) {
  const h = HELD[cc];
  if (h) {
    if (y >= h.ours && y < h.here) return h.ours - 1;
    if (y >= h.here && h.here > h.ours) return Math.max(h.ours, y - (h.here - h.ours));
    return y;
  }
  const d = SHIFT[cc];
  if (d > 0 && y >= 1989) return d === Infinity ? 1988 : Math.max(1989, y - d);
  return y;
}
