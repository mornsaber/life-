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
