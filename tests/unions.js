/**
 * Unions as organizations: the labor movement of a state, membership,
 * leadership and elections, officer powers, bargaining power, unions in the
 * businesses you own — and the laws that shape them.
 *
 *   node tests/unions.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { PROFESSIONS } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { BUSINESS_TYPES } from '../src/modules/business/BusinessTypes.js';
import { currentBusiness, yearFinancials } from '../src/modules/business/Business.js';
import { unionsInState, myUnion, unionPower, contractOffer, businessUnionYear, unionFor } from '../src/modules/career/LaborUnions.js';
import { enact, lawValue } from '../src/modules/politics/Laws.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const clean = (html) => assert.ok(!/NaN|undefined|\[object/.test(html), html.match(/.{60}(NaN|undefined|\[object).{60}/)?.[0]);
function life(seed = 1) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  state.character.age = 30;
  Object.assign(state.stats, { smarts: 80, looks: 70, health: 95 });
  state.character.regionId = 'chicago';
  return { engine, state };
}
/** A union teaching job in Illinois. */
function teacher(seed = 1) {
  const { engine, state } = life(seed);
  const prof = PROFESSIONS.education;
  const employer = createEmployer(new Random(seed), state, prof, state.character.regionId);
  employer.union ??= { name: prof.union.name, strike: prof.union.strike, duesRate: 0.013, agencyFee: true, contractYearsLeft: 3 };
  hire(engine.context(), { professionId: 'education', levelId: prof.levels[0].id, employer });
  state.career.job.abilities = state.career.job.abilities.filter((a) => a !== 'supervise');
  return { engine, state };
}
const year = (engine, choose = ['decline', 'wait', 'none', 'settle', 'ratify', 'picket']) => {
  engine.state.prompts = [];
  engine.state.stats.health = 95;
  engine.ageUp();
  for (let j = 0; j < 8 && engine.state.prompts.length; j++) {
    const p = engine.state.prompts[0];
    engine.resolvePrompt(p.id, (p.options.find((o) => choose.includes(o.id)) ?? p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0]).id);
  }
};

const syncMembershipFor = (engine) => engine.context().emit('unions:sync', {});
const tests = {
  'every union in the state is a visible organization'() {
    const { engine, state } = teacher();
    const list = unionsInState(state);
    assert.ok(list.length >= 15, `${list.length} unions`);
    for (const u of list) {
      assert.ok(u.members > 0 && u.president.name && u.treasury >= 0, u.name);
      assert.ok(unionPower(u) >= 0 && unionPower(u) <= 100);
    }
    const html = VIEWS.career(state);
    clean(html);
    assert.ok(html.includes('Labor in Illinois'), 'the labor movement card');
    year(engine);
    assert.ok(unionsInState(state).some((u) => u.lastSettlement), 'unions settle contracts each year');
  },

  'join, become a steward, run for president and lead'() {
    const { engine, state } = teacher(2);
    engine.dispatch('career.joinUnion');
    assert.ok(myUnion(state), 'a member of a real union');
    assert.equal(state.unions.mine.role, 'member');
    year(engine);
    engine.dispatch('unions.run', 'steward');
    assert.equal(state.unions.mine.role, 'steward');
    state.unions.mine.standing = 90;
    engine.dispatch('unions.run', 'president');
    assert.equal(state.unions.mine.candidacy, 'president');
    const u = myUnion(state);
    // Run until an election is held (it may take a few tries).
    for (let i = 0; i < 12 && state.unions.mine.role !== 'president'; i++) {
      if (!state.unions.mine.candidacy && state.unions.mine.role !== 'president') { state.unions.mine.standing = 95; engine.dispatch('unions.run', state.unions.mine.role === 'steward' ? 'officer' : 'president'); }
      year(engine);
      if (!state.career.job) break;
    }
    assert.equal(state.unions.mine.role, 'president', 'elected president');
    assert.ok(u.president.player, 'you head the union');
    const html = VIEWS.career(state);
    clean(html);
    assert.ok(html.includes('Organize a new shop'), 'officer actions');
    // Officer powers.
    state.yearly = {};
    u.treasury = 5_000_000;
    const members = u.members;
    const militancy = u.militancy;
    engine.dispatch('unions.mobilize');
    assert.ok(u.militancy > militancy);
    engine.dispatch('unions.strikeFund');
    engine.dispatch('unions.organize');
    assert.ok(u.members >= members);
    engine.dispatch('unions.organize');
    assert.equal(state.yearly['unions.act'], 3, 'three actions a year');
    engine.dispatch('unions.dues', 'high');
    assert.equal(u.duesRate, 0.018);
  },

  'a powerful union wins bigger contracts'() {
    const { state } = teacher(3);
    const u = myUnion(state) ?? unionFor(state, state.career.job.employer.union);
    const avg = (fn) => { let s = 0; for (let i = 0; i < 200; i++) s += fn(new Random(i)); return s / 200; };
    Object.assign(u, { density: 0.1, strikeFund: 0, militancy: 10, clout: 0 });
    const weak = avg((r) => contractOffer(state, u, r));
    Object.assign(u, { density: 0.9, strikeFund: u.members * 2000, militancy: 90, clout: 80 });
    const strong = avg((r) => contractOffer(state, u, r));
    assert.ok(strong >= weak + 2, `weak ${weak} vs strong ${strong}`);
  },

  'a unionized business bargains a contract; strikes cost revenue'() {
    const { engine, state } = life(4);
    state.finances.cash = 5_000_000;
    const t = BUSINESS_TYPES.restaurant;
    for (const c of t.credentials) state.credentials.held[c] = { earnedAge: 25, renewedAge: 29, status: 'active' };
    state.career.history.push({ professionId: 'culinary', title: 'Chef', levelId: 'x', employerName: 'Prior', sector: 'private', peakGrade: 4, startAge: 20, endAge: 29, reason: 'Left' });
    engine.dispatch('business.start', 'restaurant:cash:llc');
    const biz = currentBusiness(state);
    Object.assign(biz, { years: 4 });
    biz.staff.headcount = 20;
    biz.staff.unionized = true;
    const ctx = engine.context();
    businessUnionYear(ctx, biz);
    assert.ok(biz.union?.unionId, 'linked to a union local');
    assert.ok(state.unions.byId[biz.union.unionId], 'the local exists');
    biz.union.contractYearsLeft = 1;
    const premium = biz.staff.costPremium;
    businessUnionYear(ctx, biz, { decide: true });
    const p = state.prompts.find((x) => x.type === 'unions.bizContract');
    assert.ok(p, 'the owner gets the contract call');
    engine.resolvePrompt(p.id, 'accept');
    assert.ok(biz.staff.costPremium > premium, 'a raise becomes a labor-cost premium');
    assert.equal(biz.union.contractYearsLeft, 3);
    const rng = () => ({ float: () => 1, int: (a) => a, chance: () => false, pick: (l) => l[0] });
    const normal = yearFinancials(state, biz, rng());
    biz.strike = { weeks: 10 };
    const struck = yearFinancials(state, biz, rng());
    assert.ok(struck.revenue < normal.revenue * 0.9, `${normal.revenue} → ${struck.revenue}`);
    assert.equal(struck.strikeWeeks, 10);
    delete biz.strike;
    clean(VIEWS.business(state));
  },

  'an employee can organize a non-union workplace and win'() {
    const { engine, state } = teacher(6);
    const job = state.career.job;
    job.employer.union = null;
    job.unionMember = false;
    job.yearsAtEmployer = 3;
    job.coworkers = 80;
    syncMembershipFor(engine);
    const html = VIEWS.career(state);
    clean(html);
    assert.ok(html.includes('Start organizing your workplace'));
    engine.dispatch('unions.startDrive');
    const d = state.unions.drive;
    assert.ok(d && d.support > 0, 'a drive');
    for (let i = 0; i < 6 && d.support < 60; i++) { state.yearly = {}; engine.dispatch('unions.signCards'); engine.dispatch('unions.signCards'); }
    assert.ok(d.support >= 30, `support ${d.support}`);
    clean(VIEWS.career(state));
    engine.dispatch('unions.fileElection');
    assert.ok(d.filed);
    // Run elections until the union is in (a lost vote allows another try later).
    for (let i = 0; i < 12 && !state.career.job?.employer.union; i++) {
      if (!state.unions.drive && state.career.job) {
        state.unions.driveCooldownUntil = 0;
        state.yearly = {};
        engine.dispatch('unions.startDrive');
        for (let k = 0; k < 4; k++) { state.yearly = {}; engine.dispatch('unions.signCards'); }
        engine.dispatch('unions.fileElection');
      }
      year(engine, ['charge', 'settle', 'ratify', 'picket', 'decline', 'wait', 'none']);
      if (!state.career.job) break;
    }
    assert.ok(state.career.job?.employer.union, 'the workplace has a union');
    assert.ok(state.career.job.unionMember);
    assert.equal(state.unions.mine.role, 'steward', 'a founding steward');
    assert.ok(state.unions.mine.founder);
  },

  'the job tab lists the licenses that matter for the job'() {
    const { state } = teacher(8);
    const html = VIEWS.career(state);
    clean(html);
    assert.ok(html.includes('Licenses for Your Job'), 'a job licenses card');
    assert.ok(/credentials\.pursue|cert done/.test(html), 'with status or a way to pursue each');
  },

  'card check recognizes a signed majority without an election'() {
    const { engine, state } = teacher(7);
    enact(state, { level: 'state', where: 'IL', lawId: 'cardCheck', value: true, age: 30 });
    const job = state.career.job;
    job.employer.union = null;
    job.unionMember = false;
    job.yearsAtEmployer = 3;
    job.coworkers = 90;
    engine.dispatch('unions.startDrive');
    for (let i = 0; i < 10 && !job.employer.union; i++) { state.yearly = {}; engine.dispatch('unions.signCards'); }
    assert.ok(job.employer.union, 'recognized by card check');
  },

  'laws shape pay and unions'() {
    const { engine, state } = teacher(5);
    const st = 'IL';
    assert.equal(lawValue(state, 'rightToWork', st), false);
    enact(state, { level: 'state', where: st, lawId: 'rightToWork', value: true, age: 30 });
    assert.equal(lawValue(state, 'rightToWork', st), true);
    // A city minimum wage above the state's applies in that city.
    const before = lawValue(state, 'minWage');
    enact(state, { level: 'city', where: 'chicago', lawId: 'minWage', value: before + 3, age: 30 });
    assert.equal(lawValue(state, 'minWage'), before + 3);
    // A public-pay raise reaches government workers at that level.
    const pay = state.career.job.salary;
    enact(state, { level: 'state', where: st, lawId: 'publicPay', value: 0.06, age: 30 });
    enact(state, { level: 'city', where: 'chicago', lawId: 'publicPay', value: 0.06, age: 30 });
    year(engine);
    assert.ok(state.career.job, 'still employed');
    assert.ok(state.career.job.salary >= pay * 1.05, `public pay raise: ${pay} → ${state.career.job.salary}`);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} union test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} union tests passed`);
