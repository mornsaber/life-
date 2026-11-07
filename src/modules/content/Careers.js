/**
 * Careers as data: a pack's `careers` entries compiled into the profession objects the
 * career engine plays (see career/JobTrees.js for every field it reads).
 *
 *   ladder     [[id, title, grade, opts?], ...] — opts as Ladder.L() takes them
 *              (track, years, req, abilities, minSize, reports, entry...)
 *   employers  ['Name', ...] or { US: [...], GB: [...], '*': [...] }; names may use {city}
 *              and {state} (the province or region abroad). Per country, '*' is the fallback.
 *   hooks      functions for the few careers that need logic (eligible, ...), merged in as-is.
 *   anything else (sector, payMultiplier, sizes, union, benefits, background, exam, entry,
 *   valued, remote, minAge...) passes straight through.
 */
import { L } from '../career/Ladder.js';

export const SECTORS = ['private', 'municipal', 'state', 'federal'];
const SIZES = ['small', 'medium', 'large', 'enterprise'];
const TRACKS = ['shared', 'ic', 'mgmt'];

const fill = (t, city, state) => t.replace(/\{city\}/g, city ?? '').replace(/\{state\}/g, state ?? city ?? '').replace(/\s+/g, ' ').trim();

export function compileCareer(id, def) {
  const { ladder, employers, hooks, ...rest } = def;
  const p = { ...rest, id, ...(hooks ?? {}) };
  p.levels = ladder.map(([lid, title, grade, opts]) => L(lid, title, grade, opts ?? {}));
  if (employers) {
    const byCountry = Array.isArray(employers) ? { '*': employers } : employers;
    const templated = !Array.isArray(employers) || employers.some((e) => e.includes('{'));
    const fallback = byCountry['*'] ?? byCountry.US ?? Object.values(byCountry)[0];
    if (templated) {
      p.employerName = (city, rng, stateName, _stateId, _regionId, cc) => fill(rng.pick(byCountry[cc] ?? fallback), city, stateName);
      p.employers = fallback.filter((e) => !e.includes('{'));
      if (!p.employers.length) p.employers = fallback.map((e) => fill(e, 'City', 'State'));
    } else p.employers = employers;
  }
  return p;
}

/** Problems with a pack career (empty when valid). `known` holds ids already taken; `credentials` the credential registry. */
export function validateCareer(id, def, { known = new Set(), credentials = null } = {}) {
  const p = [];
  if (known.has(id)) p.push(`duplicate career ${id}`);
  if (!def.name) p.push(`${id}: missing name`);
  if (!SECTORS.includes(def.sector)) p.push(`${id}: unknown sector ${def.sector}`);
  if (!Array.isArray(def.ladder) || !def.ladder.length) p.push(`${id}: needs a ladder`);
  if (!def.employers && !def.hooks?.employerName && !def.campus) p.push(`${id}: needs employers`);
  for (const k of Object.keys(def.sizes ?? {})) if (!SIZES.includes(k)) p.push(`${id}: unknown size ${k}`);
  const ids = new Set();
  for (const step of def.ladder ?? []) {
    const [lid, title, grade, opts = {}] = step;
    if (!lid || !title || typeof grade !== 'number') { p.push(`${id}: bad ladder step ${JSON.stringify(step)}`); continue; }
    if (ids.has(lid)) p.push(`${id}: duplicate level ${lid}`);
    ids.add(lid);
    if (opts.track && !TRACKS.includes(opts.track)) p.push(`${id}.${lid}: unknown track ${opts.track}`);
    if (opts.minSize && !SIZES.includes(opts.minSize)) p.push(`${id}.${lid}: unknown size ${opts.minSize}`);
    if (credentials) for (const c of opts.req?.credentials ?? []) if (!credentials[c]) p.push(`${id}.${lid}: unknown credential ${c}`);
  }
  if (credentials) for (const c of [...(def.entry?.credentials ?? []), ...(def.valued ?? [])]) if (!credentials[c]) p.push(`${id}: unknown credential ${c}`);
  for (const [k, v] of Object.entries(def.hooks ?? {})) if (typeof v !== 'function') p.push(`${id}: hook ${k} isn't a function`);
  return p;
}
