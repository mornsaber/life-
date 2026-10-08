/**
 * Fleet and crew businesses: equipment, crews, capacity, contracts, spot
 * work, equipment loans, breakdowns, and the new career-born businesses.
 *
 *   node tests/fleet.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { BUSINESS_TYPES, BUSINESS_GROUPS } from '../src/modules/business/BusinessTypes.js';
import { startEligibility, yearFinancials, newBusiness } from '../src/modules/business/Business.js';
import { OPERATIONS, capacity, contracted } from '../src/modules/business/Operations.js';
import { opsTick } from '../src/modules/business/FleetActions.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function setup(seed, { profession = 'trucking', creds = ['cdlA', 'driverLicense'] } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Fleet', lastName: 'Owner' });
  state.character.age = 38;
  Object.assign(state.stats, { health: 90, smarts: 70, happiness: 70 });
  state.finances.cash = 4000000;
  state.housing.credit.score = 760;
  state.legal.record = [];
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 });
  state.career.history.push({ professionId: profession, title: 'Veteran', levelId: 'x', employerName: 'Old Co', sector: 'private', peakGrade: 5, startAge: 25, endAge: 38, reason: 'Left' });
  for (const c of creds) state.credentials.held[c] = { earnedAge: 25, renewedAge: 36, status: 'active' };
  return { engine, state, ctx: engine.context() };
}
const year = (engine) => {
  engine.state.prompts = [];
  engine.ageUp();
  for (let i = 0; i < 12 && engine.state.prompts.length; i++) {
    const p = engine.state.prompts[0];
    engine.resolvePrompt(p.id, (p.options.find((o) => !o.disabled && o.tone !== 'danger' && !/sell|close|bankrupt/i.test(o.label)) ?? p.options[0]).id);
  }
};

const tests = {
  'every fleet type is a real business, every type is grouped, and the books balance'() {
    for (const id of Object.keys(OPERATIONS)) assert.ok(BUSINESS_TYPES[id], id);
    const grouped = Object.values(BUSINESS_GROUPS).flatMap((g) => g.ids);
    for (const id of Object.keys(BUSINESS_TYPES)) assert.ok(grouped.includes(id), `${id} grouped`);
    const { state } = setup(1);
    const MEAN = { float: (a, b) => (a + b) / 2, int: (a, b) => Math.round((a + b) / 2), chance: () => false, pick: (xs) => xs[0], id: () => `p${Math.random()}` };
    for (const id of Object.keys(OPERATIONS)) {
      const b = newBusiness(MEAN, state, id, { years: 3, quality: 55, reputation: 50, fit: 1 });
      b.role = 'operator';
      const c = capacity(b);
      assert.ok(c.capacity >= 1, `${id} can work on day one`);
      b.ops.contracts = [{ id: 'k', client: 'x', units: c.capacity, rate: 1.05, years: 2, yearsLeft: 2 }];
      const ly = yearFinancials(state, b, MEAN);
      assert.ok(ly.netIncome + ly.ownerSalary > 0, `${id} is profitable fully contracted (${ly.netIncome})`);
    }
  },

  'a trucking company: buy trucks, hire drivers, sign contracts, finance equipment'() {
    const { engine, state, ctx } = setup(2);
    assert.ok(startEligibility(state, 'trucking', 'cash').ok);
    engine.dispatch('business.start', 'trucking:cash:llc:standard:Owner Freight');
    const biz = state.business.current;
    assert.equal(biz.ops.units.length, 3, 'three trucks to start');
    assert.ok(biz.ops.offers.length >= 2, 'contract offers on day one');
    biz.cash = 400000;
    engine.dispatch('business.buyUnit', 'used');
    engine.dispatch('business.buyUnit', 'new:loan');
    assert.equal(biz.ops.units.length, 5);
    assert.ok(biz.ops.loan?.balance > 100000, 'equipment loan');
    const before = capacity(biz);
    assert.ok(before.crews < before.units || state.business.current.role === 'operator', 'trucks need drivers');
    engine.dispatch('business.hireCrew');
    engine.dispatch('business.hireCrew');
    assert.ok(capacity(biz).capacity > before.capacity, 'drivers add capacity');
    const offer = biz.ops.offers.find((k) => !k.needs && !k.minRep && !k.minUnits) ?? biz.ops.offers[0];
    biz.reputation = 70;
    state.credentials.held.hazmatEndorsement = { earnedAge: 30, status: 'active' };
    engine.dispatch('business.acceptContract', offer.id);
    assert.equal(biz.ops.contracts.length, 1);
    for (let i = 0; i < 4 && state.business.current; i++) year(engine);
    assert.ok(state.business.current, 'still in business');
    assert.ok(biz.lastYear.revenue > 300000, `revenue ${biz.lastYear.revenue}`);
    assert.ok(biz.ops.units.every((u) => u.age >= 4), 'trucks aged');
    const n = biz.ops.units.length;
    engine.dispatch('business.sellUnit');
    assert.equal(biz.ops.units.length, n - 1, 'sold one');
    const html = VIEWS.business(state, {});
    assert.match(html, /Fleet &amp; Contracts|Fleet & Contracts/);
    assert.ok(!/NaN|undefined/.test(html), 'renders cleanly');
  },

  'overcommitting costs penalties and clients'() {
    const { state, ctx, engine } = setup(3);
    engine.dispatch('business.start', 'trucking:cash:llc:standard:');
    const biz = state.business.current;
    biz.ops.contracts = [{ id: 'big', client: 'Big Box', units: 8, rate: 1.1, years: 3, yearsLeft: 3 }];
    const MEAN = { float: (a, b) => (a + b) / 2, int: (a, b) => Math.round((a + b) / 2), chance: () => false, pick: (xs) => xs[0], id: () => 'x' };
    const ly = yearFinancials(state, biz, MEAN);
    assert.ok(ly.penalties > 0 && ly.ops.shortfall > 0, 'penalties for uncovered work');
    const rep = biz.reputation;
    opsTick(ctx, biz, ly);
    assert.ok(biz.reputation < rep, 'reputation hit');
  },

  'staff-only contracts: a security company signs guard posts'() {
    const { engine, state } = setup(4, { profession: 'privateSecurity', creds: ['guardCard'] });
    state.business.current = null;
    engine.dispatch('business.start', 'securityCompany:cash:llc:standard:');
    const biz = state.business.current;
    assert.ok(biz, state.log.slice(-3).map((l) => l.text).join(' / '));
    assert.equal(biz.ops.units.length, 0);
    assert.ok(capacity(biz).capacity >= 14);
    engine.dispatch('business.hireCrew', '3');
    assert.ok(capacity(biz).capacity >= 17);
  },

  'career-born businesses need the right credentials'() {
    const { state } = setup(5, { profession: 'privateEms', creds: ['driverLicense'] });
    assert.match(startEligibility(state, 'ambulanceService', 'cash').reason, /EMT|Paramedic/);
    state.credentials.held.emt = { earnedAge: 30, status: 'active' };
    assert.ok(startEligibility(state, 'ambulanceService', 'cash').ok, startEligibility(state, 'ambulanceService', 'cash').reason);
    assert.match(startEligibility(state, 'flightSchool', 'cash').reason, /Instructor|CFI/i);
  },

  'older saves: a fleet business without operations gets a fleet'() {
    const { engine, state } = setup(6);
    engine.dispatch('business.start', 'trucking:cash:llc:standard:');
    const biz = state.business.current;
    delete biz.ops;
    year(engine);
    assert.ok(state.business.current.ops?.units.length >= 1);
  },

  'ordinary businesses: staffing changes output'() {
    const { engine, state } = setup(7, { profession: 'retail', creds: [] });
    engine.dispatch('business.start', 'retail:cash:llc:standard:');
    const biz = state.business.current;
    const MEAN = { float: (a, b) => (a + b) / 2, int: (a, b) => Math.round((a + b) / 2), chance: () => false, pick: (xs) => xs[0], id: () => 'x' };
    const full = yearFinancials(state, biz, MEAN).revenue;
    engine.dispatch('business.letGo');
    engine.dispatch('business.letGo');
    engine.dispatch('business.letGo');
    assert.ok(yearFinancials(state, biz, MEAN).revenue < full, 'short-staffed sells less');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} fleet test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} fleet tests passed`);
