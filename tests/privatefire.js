/**
 * Private fire & rescue (career and business, airport ARFF tenders) and the
 * staff-count fixes.
 *
 *   node tests/privatefire.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { BUSINESS_TYPES } from '../src/modules/business/BusinessTypes.js';
import { currentBusiness, staffFactor } from '../src/modules/business/Business.js';
import { businessOrg } from '../src/modules/org/Businesses.js';
import { maxScale } from '../src/modules/business/BusinessEngine.js';
import { airportBidEligibility } from '../src/modules/business/FleetActions.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { FireLifeModule, stationsFor } from '../src/modules/publicsafety/FireLife.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(seed) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  state.character.age = 35;
  Object.assign(state.stats, { smarts: 80, fitness: 80, health: 95 });
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 });
  state.finances.cash = 5_000_000;
  state.housing.credit.score = 780;
  return { engine, state, ctx: engine.context() };
}
function owner(seed, typeId) {
  const l = life(seed);
  const t = BUSINESS_TYPES[typeId];
  for (const c of t.credentials) l.state.credentials.held[c] = { earnedAge: 25, renewedAge: 34, status: 'active' };
  l.state.career.history.push({ professionId: t.professions[0], title: 'Pro', levelId: 'x', employerName: 'Prior', sector: 'private', peakGrade: 4, startAge: 22, endAge: 34, reason: 'Left' });
  l.engine.dispatch('business.start', `${typeId}:cash:llc`);
  l.biz = currentBusiness(l.state);
  assert.ok(l.biz, typeId);
  return l;
}
const year = (engine) => {
  engine.state.prompts = [];
  engine.state.stats.health = 95;
  engine.ageUp();
  for (let j = 0; j < 8 && engine.state.prompts.length; j++) {
    const p = engine.state.prompts[0];
    engine.resolvePrompt(p.id, (p.options.find((o) => ['decline', 'wait'].includes(o.id)) ?? p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0]).id);
  }
};
const clean = (html) => assert.ok(!/NaN|undefined|\[object/.test(html), html.match(/.{60}(NaN|undefined|\[object).{60}/)?.[0]);

const tests = {
  'a private firefighter works airports, plants and fire-season contracts'() {
    const { state, ctx } = life(1);
    for (const c of ['driverLicense', 'ff1']) state.credentials.held[c] = { earnedAge: 20, renewedAge: 34, status: 'active' };
    const p = getProfession('privateFire');
    assert.equal(p.sector, 'private');
    const job = hire(ctx, { professionId: 'privateFire', levelId: 'firefighter', employer: createEmployer(ctx.rng, state, p, state.character.regionId) });
    assert.ok(job, 'hired');
    assert.ok(stationsFor('privateFire').includes(state.fireLife.station), `station ${state.fireLife.station}`);
    assert.ok(!stationsFor('fire').includes('industrial'), 'city departments don\'t run plant brigades');
    state.career.job.paidThisYear = true;
    FireLifeModule.onAgeUp(ctx);
    clean(VIEWS.career(state, {}));
  },

  'a fire contractor wins airport ARFF tenders by price and reputation'() {
    const { engine, state, biz } = owner(2, 'privateFireService');
    assert.ok(biz.ops?.units?.length >= 2, 'apparatus');
    biz.reputation = 70;
    let won = false;
    for (let i = 0; i < 10 && !won; i++) {
      state.yearly = {};
      state.prompts = [];
      engine.dispatch('business.airportBid');
      const p = state.prompts.find((x) => x.type === 'business.airportBid');
      assert.ok(p, 'a tender');
      engine.resolvePrompt(p.id, 'low');
      won = biz.ops.contracts.some((c) => c.airport);
    }
    assert.ok(won, 'won an airport contract');
    const k = biz.ops.contracts.find((c) => c.airport);
    assert.ok(k.units >= 1 && k.years === 5 && /ARFF/.test(k.client));
    state.yearly = {};
    assert.match(airportBidEligibility(state, biz).reason, /already run/, 'one airport station at a time');
    year(engine);
    clean(VIEWS.business(state, {}));
  },

  'staff counts stay put: poaching is replaced, the org chart keeps up, heads are part of their teams'() {
    const { engine, state, biz } = owner(3, 'trucking');
    const start = biz.staff.headcount;
    for (let y = 0; y < 6; y++) { biz.cash = Math.max(biz.cash, 500_000); year(engine); }
    assert.ok(biz.staff.headcount >= start, `no silent shrinking (${start} → ${biz.staff.headcount})`);
    const org = businessOrg(state, biz);
    state.yearly = {};
    engine.dispatch('business.hireCrew');
    const total = Object.values(org.departments).reduce((s, d) => s + d.headcount, 0);
    assert.equal(total, biz.staff.headcount, 'departments add up right after hiring');
    const named = Object.values(org.people).filter((p) => p.id !== org.ceo).length;
    assert.ok(named <= biz.staff.headcount, `named staff ${named} within headcount ${biz.staff.headcount}`);
  },

  'management keeps a lean but normal crew, and any business can pass five locations under management'() {
    const { engine, state, biz } = owner(4, 'restaurant');
    biz.years = 4;
    biz.staff.headcount = 18;
    engine.dispatch('business.handOff');
    for (let y = 0; y < 6; y++) { biz.cash = Math.max(biz.cash, 500_000); year(engine); }
    assert.ok(staffFactor(biz) >= 0.84, `no endless trimming (${biz.staff.headcount} staff, ${staffFactor(biz).toFixed(2)})`);
    const c = owner(5, 'consulting');
    c.biz.role = 'absentee';
    assert.equal(maxScale(c.state, c.biz), 12, 'a small-staff firm can grow past five under management');
    c.biz.role = 'operator';
    assert.equal(maxScale(c.state, c.biz), 5);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} private-fire test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} private-fire & staffing tests passed`);
