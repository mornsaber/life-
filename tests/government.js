/**
 * Government: budgets (revenue from tax laws and the economy, debt, ratings), the
 * executive (president, governor, mayor: budgets, crises, agenda), heads of state,
 * public services (contracting out, privatizing, abolishing), and the laws on private
 * police, ambulances, prisons and fire.
 *
 *   node tests/government.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession, professionsFor } from '../src/modules/career/JobTrees.js';
import { runEligibility } from '../src/modules/politics/Campaigns.js';
import { OFFICES } from '../src/modules/politics/Offices.js';
import { budgetAt, closeBooks, revenue, jobFunding, executiveLevel, myBudget } from '../src/modules/politics/Budgets.js';
import { enact } from '../src/modules/politics/Laws.js';
import { arrangementOf, changeService, serviceBlock, executiveChoice } from '../src/modules/politics/PublicServices.js';
import { executiveOf, executiveIsYou } from '../src/modules/politics/Legislature.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { joinBlock, cpcLevel } from '../src/modules/politics/CommunistParty.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life({ countryId = 'US', age = 45, seed = 5, regionId = null } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  if (regionId) state.character.regionId = regionId;
  state.character.age = age;
  state.legal.record = [];
  state.prompts = [];
  Object.assign(state.stats, { smarts: 75, health: 95, happiness: 70 });
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'economics', schoolId: 'state', gpa: 3.4, year: 22 });
  return { engine, state, ctx: engine.context() };
}
const year = (engine, state, n = 1) => { for (let i = 0; i < n; i++) { state.prompts = []; state.stats.health = 95; engine.ageUp(); } };
const take = (ctx, officeId) => ctx.emit('politics:take', { officeId });

const tests = {
  'the presidency: natural-born, 35+, two terms; a president is the national executive'() {
    const { state, ctx } = life();
    assert.ok(OFFICES.president && OFFICES.president.termLimit === 2);
    state.character.age = 34;
    assert.match(runEligibility(state, 'president').reason, /35/);
    state.character.age = 50;
    state.migration = { naturalized: ['US'] };
    assert.match(runEligibility(state, 'president').reason, /Natural-born/);
    state.migration = { naturalized: [] };
    assert.match(runEligibility(state, 'vicePresident').reason, /running mate/);
    take(ctx, 'president');
    assert.equal(state.politics.office.id, 'president');
    assert.equal(executiveLevel('president'), 'national');
    assert.ok(executiveIsYou(state, 'federal'));
    assert.equal(myBudget(state).level, 'national');
  },
  'budgets: taxes raise revenue, recessions cut it, deficits build debt and cost the rating'() {
    const { state } = life();
    const b = budgetAt(state, 'state');
    const base = revenue(state, b);
    enact(state, { level: 'state', where: b.where, lawId: 'stateIncomeTax', value: 'hike', age: 45 });
    assert.ok(revenue(state, b) > base, 'a tax hike raises revenue');
    state.economy.phase = 'recession';
    assert.ok(revenue(state, b) < base * 1.02, 'a recession takes it back');
    for (const id of Object.keys(b.funding)) b.funding[id] = 1.3;
    const rating = b.rating;
    for (let i = 0; i < 6; i++) closeBooks(state, b);
    assert.ok(b.balance < 0 && b.health < 40, `deficits: balance ${b.balance}, health ${b.health}`);
    assert.notEqual(b.rating, rating);
  },
  'a mayor writes the budget: asks pass at year end and fund the police'() {
    const { engine, state, ctx } = life();
    take(ctx, 'mayor');
    year(engine, state);
    const b = myBudget(state);
    const before = b.funding.police;
    state.prompts = [];
    engine.dispatch('budgets.fund', 'police|up');
    engine.dispatch('budgets.fund', 'police|up');
    assert.ok(b.ask.police > before);
    year(engine, state);
    assert.ok(b.funding.police > before, `police ${before} → ${b.funding.police}`);
  },
  'an executive\'s crisis changes the budget, not just approval'() {
    const { engine, state, ctx } = life();
    take(ctx, 'governor');
    for (let i = 0; i < 8 && !state.prompts.some((p) => p.type === 'executive.issue'); i++) { state.prompts = []; engine.ageUp(); }
    const p = state.prompts.find((x) => x.type === 'executive.issue');
    assert.ok(p, 'a crisis');
    const b = budgetAt(state, 'state');
    const snapshot = JSON.stringify([b.funding, b.levy, b.debt]);
    const approval = state.politics.office.approval;
    engine.resolvePrompt(p.id, p.options[0].id);
    assert.ok(JSON.stringify([b.funding, b.levy, b.debt]) !== snapshot || state.politics.office.approval !== approval);
  },
  'NPC executives win and lose elections; the legislature has a real executive'() {
    const { engine, state } = life({ age: 30 });
    year(engine, state);
    const ex = executiveOf(state, 'state');
    assert.ok(ex?.name && ex.caucus);
    const names = new Set();
    for (let i = 0; i < 16; i++) { year(engine, state); names.add(executiveOf(state, 'state').name); }
    assert.ok(names.size >= 2, 'governors come and go');
  },
  'services: a library abolished closes library jobs; the staff are laid off or transfer'() {
    const { state, ctx } = life();
    const job = hire(ctx, { professionId: 'library', levelId: getProfession('library').levels.find((l) => l.entry).id, employer: createEmployer(new Random(2), state, getProfession('library'), state.character.regionId) });
    assert.ok(job);
    state.prompts = [];
    changeService(ctx, 'library', 'abolished');
    assert.equal(arrangementOf(state, 'library'), 'abolished');
    assert.ok(state.prompts.some((p) => p.type === 'cityServices.transfer'));
    assert.ok(!professionsFor(state).some((p) => p.id === 'library'), 'no library jobs here now');
  },
  'services: privatizing needs the law; banning private police closes the career'() {
    const { state, ctx } = life();
    take(ctx, 'mayor');
    const c = executiveChoice(state, 'police');
    assert.equal(c.options.find((o) => o.to === 'private').ok, false, 'contract policing not allowed by default');
    const st = state.gov ? budgetAt(state, 'state').where : null;
    enact(state, { level: 'state', where: st, lawId: 'privatePolicing', value: 'contracting', age: 45 });
    assert.equal(executiveChoice(state, 'police').options.find((o) => o.to === 'private').ok, true);
    enact(state, { level: 'state', where: st, lawId: 'privatePolicing', value: 'banned', age: 45 });
    assert.match(serviceBlock(state, 'privatePolice'), /banned/);
    enact(state, { level: 'state', where: st, lawId: 'privateEms', value: 'public', age: 45 });
    assert.ok(!professionsFor(state).some((p) => p.id === 'privateEms'));
  },
  'public employees feel their area\'s funding'() {
    const { state, ctx } = life();
    const job = hire(ctx, { professionId: 'fire', levelId: 'firefighter', employer: createEmployer(new Random(2), state, getProfession('fire'), state.character.regionId) });
    assert.ok(job);
    const b = budgetAt(state, 'city');
    b.funding.fire = 0.7;
    assert.equal(jobFunding(state, job), 0.7);
  },
  'agencies grow with their population and their funding — and gain ranks'() {
    const { engine, state, ctx } = life({ regionId: 'smalltown', age: 30 });
    state.credentials.held.post = { status: 'active', earnedAge: 22, renewedAge: 29 };
    state.credentials.held.driverLicense = { status: 'active', earnedAge: 16, renewedAge: 29 };
    const job = hire(ctx, { professionId: 'police', levelId: 'officer', employer: createEmployer(new Random(2), state, getProfession('police'), 'smalltown') });
    assert.ok(job);
    const org = state.orgs.byId[job.employer.orgId];
    const dept = org.departments[job.employer.deptId];
    const before = { headcount: dept.headcount, size: job.employer.size };
    year(engine, state);
    state.world.pop.smalltown = 2.4;
    budgetAt(state, 'city').funding.police = 1.4;
    for (let i = 0; i < 4; i++) year(engine, state);
    const now = state.career.job;
    assert.ok(dept.headcount > before.headcount * 2, `headcount ${before.headcount} → ${dept.headcount}`);
    if (now?.professionId === 'police') assert.notEqual(now.employer.size, before.size, `size ${before.size} → ${now.employer.size}`);
  },
  'heads of state: a ceremonial president needs standing; a Governor-General is appointed'() {
    const de = life({ countryId: 'DE' });
    assert.ok(OFFICES.de_praesident);
    assert.match(runEligibility(de.state, 'de_praesident').reason, /standing|Citizens/);
    const ca = life({ countryId: 'CA' });
    assert.match(runEligibility(ca.state, 'ca_gg').reason, /Appointed/);
    take(ca.ctx, 'ca_gg');
    assert.equal(ca.state.politics.office.id, 'ca_gg');
    year(ca.engine, ca.state);
    assert.ok(ca.state.politics.office, 'serves on');
  },
  'China: join the Party, rise through its posts; a city Party secretary writes the budget; graft gets you expelled'() {
    const { engine, state } = life({ countryId: 'CN', age: 22 });
    state.community.faith = null;
    assert.equal(joinBlock(state), null);
    engine.dispatch('cpc.apply');
    assert.equal(state.cpc.status, 'applicant');
    for (let i = 0; i < 4 && state.cpc.status !== 'member'; i++) year(engine, state);
    assert.equal(state.cpc.status, 'member');
    assert.match(runEligibility(state, 'cn_premier').reason, /Politburo/);
    state.cpc.rank = 4;
    assert.equal(cpcLevel(state), 'city');
    assert.equal(myBudget(state).level, 'city', 'a city Party secretary writes the city budget');
    state.cpc.graft = 6;
    for (let i = 0; i < 6 && state.cpc.status === 'member'; i++) {
      state.prompts = [];
      engine.ageUp();
      const p = state.prompts.find((x) => x.type === 'cpc.investigation');
      if (p) engine.resolvePrompt(p.id, 'confess');
    }
    assert.equal(state.cpc.status, 'expelled');
    const r = life({ countryId: 'CN', age: 22, seed: 6 });
    r.state.community.faith = 'christianity';
    assert.match(joinBlock(r.state), /atheists/);
  },
  'the Politics tab shows the government, the budget and an executive console'() {
    const { engine, state, ctx } = life();
    take(ctx, 'president');
    year(engine, state);
    const html = VIEWS.politics(state);
    assert.match(html, /Your Government/);
    assert.match(html, /legislative agenda/);
    assert.match(html, /Public Services/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} government test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} government tests passed`);
