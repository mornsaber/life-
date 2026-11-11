/**
 * The vocation packs, composed and indexed (career/Vocations.js runs them). A leaf: it imports
 * nothing that imports careers or people, so both can read the packs without a cycle.
 */
import { PACKS } from './index.js';
import { getProfession } from '../JobTrees.js';

const LISTS = ['courses', 'postings', 'awards', 'complaints', 'elite', 'specialties'];
/**
 * A pack with its shared blocks (`use`) folded in: their courses, postings, awards, complaints
 * and posts are added to the pack's own (the pack's own come first; an id the pack already has wins).
 */
export function compose(pack) {
  const out = { ...pack };
  for (const k of LISTS) {
    const own = pack[k] ?? [];
    const ids = new Set(own.map((x) => x.id));
    out[k] = [...own, ...(pack.use ?? []).flatMap((b) => b[k] ?? []).filter((x) => !ids.has(x.id) && ids.add(x.id))];
  }
  return out;
}
/** Every pack, by id. Add new families in career/vocations/index.js. */
export const VOCATIONS = Object.fromEntries(PACKS.map((p) => [p.id, compose(p)]));
const BY_PROFESSION = {};
for (const pack of Object.values(VOCATIONS)) for (const id of pack.professions) BY_PROFESSION[id] = pack;

let ENABLED = true;
/** Tests compare careers with and without the packs. */
export const setVocationsEnabled = (on) => { ENABLED = on; };
/** The pack for your job (or a profession id), or null. */
export function packFor(state, professionId = state.career?.job?.professionId) {
  if (!professionId || !ENABLED) return null;
  return BY_PROFESSION[professionId] ?? BY_PROFESSION[getProfession(professionId)?.template] ?? null;
}
/** The record, for reading (views, eligibility): never creates one, so rendering leaves the state alone. */
export const peekVocation = (state, pack) => state.vocation?.[pack.id] ?? { courses: {}, inCourse: null, postings: [], awards: [], record: [], conditionsUntil: null, elite: null, history: [] };
export const vocationOf = (state, pack) => {
  state.vocation ??= {};
  return (state.vocation[pack.id] ??= { courses: {}, inCourse: null, postings: [], awards: [], record: [], conditionsUntil: null, elite: null, history: [] });
};

