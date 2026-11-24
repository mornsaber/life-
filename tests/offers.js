/**
 * Offers tell the truth: a job offer quotes what the job will pay once taken (in the money of the
 * day too), executive posts show their pay, and executive searches only list bodies that exist.
 *
 *   node tests/offers.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { previewPay } from '../src/modules/career/SeniorMoves.js';
import { refreshExecutiveSearch, postPay } from '../src/modules/org/Executives.js';
import { ORG_TYPE_FROM } from '../src/modules/org/Organizations.js';
import { sync } from '../src/modules/world/History.js';
import { yearlyPay } from '../src/modules/world/Eras.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc, year, age = 45, seed = 5) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age });
  state.character.age = age;
  sync(state);
  return { engine, state };
};

const tests = {
  'an 1830 offer quotes the pay the job will have'() {
    const { engine, state } = life('US', 1830, 25);
    const p = getProfession('blacksmith') ?? getProfession('manufacturing');
    const employer = createEmployer(engine.rng, state, p, state.character.regionId);
    const quoted = previewPay(state, { professionId: p.id, levelId: p.levels[0].id, employer, step: 1 });
    const job = hire(engine.context(), { professionId: p.id, levelId: p.levels[0].id, employer });
    assert.ok(job, 'hired');
    assert.ok(Math.abs(job.salary - quoted) <= Math.max(50, quoted * 0.02), `offer ${quoted} vs job ${job.salary}`);
    assert.ok(quoted < 40000, `an 1830 wage stays an 1830 wage (${quoted})`);
    assert.match(yearlyPay(state, quoted), /in 1830 money/);
  },
  'executive listings exist in their era and carry their pay'() {
    for (const [cc, year] of [['US', 1870], ['GB', 1900], ['US', 1990]]) {
      const { state } = life(cc, year);
      refreshExecutiveSearch(state);
      const listings = state.career.execSearch?.listings ?? [];
      for (const l of listings) {
        const typeId = state.orgs.byId[l.orgId]?.typeId;
        assert.ok(!(ORG_TYPE_FROM[typeId] > year), `${typeId} listed in ${year}`);
        assert.ok(l.salary > 0, `${l.title} at ${l.orgName} has pay`);
      }
    }
  },
  'a head post pays the head premium'() {
    const { state } = life('US', 1990);
    refreshExecutiveSearch(state);
    const l = state.career.execSearch.listings[0];
    const level = postPay(state, { professionId: l.professionId, levelId: l.levelId, orgId: l.orgId, deptId: l.deptId, occupations: l.deptId ? l.occupations : null });
    assert.equal(level, l.salary);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack?.split('\n').slice(0, 3).join('\n  ')}`); }
}
if (failed) process.exit(1);
