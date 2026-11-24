// Audit: degree gates before 1900. For each country and year, a 25-year-old with no schooling
// beyond the basics: which careers, rungs and other doors say "you need a degree"?
//
//   node tools/degree-gates.mjs [CC ...] [--years=1820,1860,1890]
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
const years = (args.find((a) => a.startsWith('--years='))?.slice(8) ?? '1830,1860,1890').split(',').map(Number);
const DEGREE = /degree|bachelor|master'?s|doctorate|diploma|university|college|graduate|\bJD\b|\bMD\b|law school|medical school|MBA|PhD/i;
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

export function degreeGates(countries, yrs = years) {
  const flags = new Set();
  for (const cc of countries) for (const y of yrs) {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(9), modules: MODULES });
    const state = engine.newLife({ countryId: cc, startYear: y - 25 });
    state.character.age = 25; state.prompts = []; sync(state);
    Object.assign(state.stats, { smarts: 90, health: 90, looks: 70, fitness: 80 });
    state.education.degrees = [];
    for (const p of professionsFor(state)) {
      const e = applicationEligibility(state, p.id);
      if (!e.ok && DEGREE.test(e.reason ?? '') && !/the way up before degrees/.test(e.reason)) flags.add(`${cc} ${y} apply ${p.id}: ${e.reason}`);
      for (const l of p.levels ?? []) {
        const c = levelCheck(state, l);
        const why = (c.missing ?? []).filter((m) => DEGREE.test(m) && !/the way up before degrees/.test(m)).join('; ');
        if (!c.ok && why) flags.add(`${cc} ${y} rung ${p.id}/${l.id}: ${why}`);
      }
    }
    setCurrentCountry('US');
  }
  return [...flags];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const flags = degreeGates(ccs.length ? ccs : ['US', 'GB', 'FR', 'DE', 'RU', 'IN']);
  for (const f of flags) console.log(f);
  console.log(`\n${flags.length} flags.`);
  if (args.includes('--strict') && flags.length) process.exit(1);
}

/** Every screen, as the player sees it: hints and reasons that ask for a degree or a diploma. */
export async function degreeText(countries, yrs = [1850, 1890]) {
  const { VIEWS } = await import('../src/ui/Renderer.js');
  const ASK = /(Needs?|requires?|Pass|Finish|need)[^<"]{0,60}(degree|bachelor|master|diploma|high school|GED|JD|MD\b|law school|medical school)[^<"]{0,40}/gi;
  const out = new Set();
  for (const cc of countries) for (const y of yrs) {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(9), modules: MODULES });
    const state = engine.newLife({ countryId: cc, startYear: y - 25 });
    state.character.age = 25; state.prompts = []; sync(state);
    state.education.degrees = [];
    state.finances.cash = 1e6;
    for (const [id, view] of Object.entries(VIEWS)) {
      let html = '';
      try { html = view(state, {}) ?? ''; } catch { continue; }
      for (const m of html.matchAll(ASK)) out.add(`${cc} ${y} [${id}] ${m[0].replace(/\s+/g, ' ').trim()}`);
    }
    setCurrentCountry('US');
  }
  return [...out];
}
if (import.meta.url === `file://${process.argv[1]}` && args.includes('--screens')) {
  const t = await degreeText(ccs.length ? ccs : ['US', 'GB', 'FR', 'RU']);
  for (const f of t) console.log(f);
  console.log(`\n${t.length} on screen.`);
}
