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
