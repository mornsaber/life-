/**
 * Looking for another job in public service: a state, federal or national agency is one
 * employer (the search turns up transfers that keep your rank and seniority); a city's
 * departments, counties' prosecutors and charities are each their own. Real agency names.
 *
 *   node tests/jobsearch.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { createEmployer, campusRegions } from '../src/modules/career/Employers.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { searchOffers, acceptOffer } from '../src/modules/career/JobMarket.js';
import { REGIONS } from '../src/modules/life/Regions.js';
import { prosecutorName } from '../src/modules/publicservice/USAgencyNames.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function at(professionId, { cc = 'US', regionId = 'philadelphia', seed = 3 } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc });
  state.character.age = 35;
  if (regionId) state.character.regionId = regionId;
  state.prompts = [];
  const ctx = engine.context();
  const p = getProfession(professionId);
  hire(ctx, { professionId, levelId: p.levels[1]?.id ?? p.levels[0].id, employer: createEmployer(ctx.rng, state, p, state.character.regionId) });
  return { engine, state, ctx };
}
const many = (ctx) => { const out = []; for (let i = 0; i < 6; i++) out.push(...searchOffers(ctx, 3, 1)); return out; };

const tests = {
  'a state trooper is offered transfers within the force, and one other state at most'() {
    const { state, ctx } = at('statePolice');
    assert.equal(state.career.job.employer.name, 'Pennsylvania State Police');
    const offers = searchOffers(ctx, 3, 1);
    const transfers = many(ctx).filter((o) => o.transfer);
    assert.ok(transfers.length >= 1, 'transfers offered');
    for (const t of transfers) { assert.equal(t.employer.orgId, state.career.job.employer.orgId); assert.equal(REGIONS[t.regionId].state, 'PA'); assert.equal(t.levelId, state.career.job.levelId); }
    assert.ok(offers.filter((o) => !o.transfer).length <= 1, 'at most one lateral to another state');
  },
  'taking a transfer keeps the job, rank and seniority'() {
    const { state, ctx } = at('statePolice');
    const job = state.career.job;
    job.yearsAtEmployer = 7;
    const before = { id: job.employer.orgId, level: job.levelId, start: job.startAge };
    const t = many(ctx).find((o) => o.transfer);
    acceptOffer(ctx, t);
    const now = state.career.job;
    assert.equal(state.character.regionId, t.regionId);
    assert.equal(now.employer.orgId, before.id);
    assert.equal(now.levelId, before.level);
    assert.equal(now.startAge, before.start);
    assert.equal(now.yearsAtEmployer, 7);
  },
  'a federal agent gets postings, not other employers'() {
    const { ctx } = at('fbi');
    const offers = many(ctx);
    assert.ok(offers.length && offers.every((o) => o.transfer), 'all transfers');
  },
  'city police and county prosecutors are separate employers'() {
    const { ctx, state } = at('police');
    assert.ok(many(ctx).every((o) => !o.transfer && o.employer.orgId !== state.career.job.employer.orgId));
    assert.equal(prosecutorName('pittsburgh', 'PA', 'Pittsburgh'), 'Allegheny County District Attorney');
    assert.equal(prosecutorName('seattle', 'WA', 'Seattle'), 'King County Prosecuting Attorney');
    assert.equal(prosecutorName('neworleans', 'LA', 'New Orleans'), 'Orleans Parish District Attorney');
  },
  'charities are named for their city and never repeat across cities'() {
    const { ctx } = at('nonprofit');
    for (let i = 0; i < 6; i++) {
      const names = searchOffers(ctx, 3, 1).map((o) => o.employer.name);
      assert.equal(names.length, new Set(names).size, names.join(' | '));
      assert.ok(names.every((n) => !/Greater Good|Hope Community|Riverbend/.test(n)), names.join(' | '));
    }
  },
  'maritime academy jobs are only where academies are'() {
    const { state, ctx } = at('maritimeFaculty', { regionId: 'pittsburgh' });
    const campuses = campusRegions('pittsburgh');
    assert.ok(campuses.includes('boston') && !campuses.includes('lasvegas'));
    for (const o of many(ctx)) if (o.regionId) assert.ok(campuses.includes(o.regionId), o.regionId);
    assert.ok(state.career.job);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed++; console.log(`  ✘ ${name}\n    ${e.message}`); }
}
if (failed) { console.log(`✘ ${failed} job search test(s) failed`); process.exit(1); }
console.log(`✔ All ${Object.keys(tests).length} job search tests passed`);
