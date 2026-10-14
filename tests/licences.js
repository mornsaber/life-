/**
 * No career is locked out by a licence: in every country, every credential a job
 * on the board asks for (to enter or to be promoted) can actually be earned there —
 * nothing granted only by a US process, no course open only to members of an
 * agency that doesn't exist in that country.
 *
 *   node tests/licences.js
 */
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { professionsFor, PROFESSIONS } from '../src/modules/career/JobTrees.js';
import { CREDENTIALS } from '../src/modules/credentials/CredentialRegistry.js';
import { COUNTRIES } from '../src/modules/world/Countries.js';
import { volunteerServiceHere } from '../src/modules/world/CountryLaw.js';
import { SERVICES } from '../src/modules/emergency/EmergencyEngine.js';
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const issues = new Map();
for (const cc of Object.keys(COUNTRIES)) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(1), modules: MODULES });
  const state = engine.newLife({ countryId: cc });
  const board = professionsFor(state);
  const here = new Set(board.flatMap((p) => [p.id, p.template].filter(Boolean)));
  const vols = Object.keys(SERVICES).filter((s) => volunteerServiceHere(cc, s));
  const reach = (id, via, seen = new Set()) => {
    const c = CREDENTIALS[id];
    if (!c) return `missing credential ${id}`;
    if (seen.has(id)) return null; seen.add(id);
    if (c.grantedBy && cc !== 'US') return `${id} granted by US process`;
    const reqs = c.requires?.anyOf ?? [c.requires ?? {}];
    const errs = [];
    for (const r of reqs) {
      let e = null;
      if (r.affiliation && !r.affiliation.some((a) => a === via || a === PROFESSIONS[via]?.template || here.has(a) || vols.includes(a))) e = `${id} needs affiliation ${r.affiliation.join('/')}`;
      for (const sub of r.credentials ?? []) e ??= reach(sub, via, seen);
      if (!e) return null;
      errs.push(e);
    }
    return errs[0] ?? null;
  };
  for (const p of board) {
    const creds = new Set([...(p.entry?.credentials ?? []), ...p.levels.flatMap((l) => l.req?.credentials ?? [])]);
    for (const cr of creds) { const e = reach(cr, p.id); if (e) { const k = `${p.id}: ${e}`; issues.set(k, [...(issues.get(k) ?? []), cc]); } }
  }
}
for (const [k, v] of issues) console.log(k, '—', v.join(','));
if (issues.size) {
  console.log(`\n${issues.size} lock-out(s)`);
  process.exit(1);
}
console.log(`✔ Licences reachable — every credential every job asks for can be earned in all ${Object.keys(COUNTRIES).length} countries`);
