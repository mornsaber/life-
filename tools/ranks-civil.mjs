// Audit: the rank ladders of uniformed careers as a player in each country and year would see them
// (country titles, period titles, renames), only for careers on offer there and then.
//   node tools/ranks-civil.mjs [CC:YEAR ...]
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { professionsFor } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { setEraYear, periodTitle, periodText } from '../src/modules/world/Eras.js';

const UNIFORMED = /police|fire|sheriff|marshal|guard|correct|jail|prison|constab|gendarm|warden|coast|trooper|ranger|ems|ambulance|military|colonial|customs|border/i;
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const cells = process.argv.slice(2).length ? process.argv.slice(2) : ['US:1860', 'US:1910', 'US:1950', 'GB:1860', 'GB:1930', 'GB:1975', 'DE:1900', 'DE:1960', 'FR:1900', 'IN:1925', 'IN:1970', 'JP:1930', 'AU:1950', 'CA:1950'];
for (const cell of cells) {
  const [cc, y] = cell.split(':'); const year = +y;
  const engine = new Engine({ store: new Store(memory()), rng: new Random(year), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - 30 });
  state.character.age = 30;
  for (const p of professionsFor(state).filter((p) => UNIFORMED.test(p.id) || UNIFORMED.test(p.name ?? ''))) {
    try {
      state.career.job = null;
      hire(engine.context(), { professionId: p.id, levelId: p.levels[0].id, employer: createEmployer(engine.rng, state, p, state.character.regionId) });
      const j = state.career.job; if (!j) continue;
      setEraYear(year);
      console.log(`${cc} ${year} ${p.id} [${periodText(j.employer?.name ?? '')}]: ${p.levels.map((l) => periodText(periodTitle(j.titleMap?.[l.id] ?? l.title))).join(' · ')}`);
      setEraYear(null);
    } catch { /* not open here */ }
  }
}
