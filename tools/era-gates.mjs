// Audit: requirements of their day. For each country and year, a capable 30-year-old with nothing
// but the basics: every requirement each career and rung asks for, so modern gates stand out.
//
//   node tools/era-gates.mjs [CC ...] [--years=1850,1900,1930,1960] [--by=profession]
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { applicationEligibility, levelCheck } from '../src/modules/career/CareerEngine.js';
import { professionsFor } from '../src/modules/career/JobTrees.js';
import { sync } from '../src/modules/world/History.js';
import { setCurrentCountry } from '../src/core/Locale.js';

const args = process.argv.slice(2);
const ccs = args.filter((a) => !a.startsWith('--'));
const years = (args.find((a) => a.startsWith('--years='))?.slice(8) ?? '1850,1900,1930,1960').split(',').map(Number);
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
// What every era asks for and is fine: years in the job, age, stats, citizenship, a clean record.
const ORDINARY = /yrs? (in|as|at)|years? (in|as|at)|experience|^age |\bage \d|smarts|health|fitness|looks|citizen|record|clearance|performance|^\d+ yrs|rank|grade|served|tenure|Must be|men only|women|reputation/i;

export function eraGates(countries, yrs = years) {
  const seen = new Map();
  for (const cc of countries) for (const y of yrs) {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(9), modules: MODULES });
    const state = engine.newLife({ countryId: cc, startYear: y - 30 });
    state.character.age = 30; state.prompts = []; sync(state);
    Object.assign(state.stats, { smarts: 90, health: 90, looks: 70, fitness: 80 });
    state.education.degrees = [];
    for (const p of professionsFor(state)) {
      const e = applicationEligibility(state, p.id);
      const reasons = [];
      if (!e.ok && e.reason && !/exist yet|disappeared|Closed to|Not in this era|Only in a colony/.test(e.reason)) reasons.push(['apply', e.reason]);
      for (const l of p.levels ?? []) for (const m of levelCheck(state, l).missing ?? []) if (!ORDINARY.test(m)) reasons.push([l.id, m]);
      for (const [where, why] of reasons) {
        const key = `${y} ${why}`;
        const v = seen.get(key) ?? { y, why, n: 0, eg: new Set() };
        v.n += 1; v.eg.add(`${cc}:${p.id}/${where}`);
        seen.set(key, v);
      }
    }
    setCurrentCountry('US');
  }
  return [...seen.values()].sort((a, b) => a.y - b.y || b.n - a.n);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = eraGates(ccs.length ? ccs : ['US', 'GB', 'FR', 'DE', 'IN']);
  for (const r of rows) console.log(`${r.y} ×${r.n}  ${r.why}   e.g. ${[...r.eg].slice(0, 3).join(', ')}`);
  console.log(`\n${rows.length} distinct requirements.`);
}
