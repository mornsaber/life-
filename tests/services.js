/**
 * Emergency services as institutions: pensions by country and service, fleets bought
 * by headquarters, governments merging forces, and volunteers bridging into careers
 * (with national service counting where it's served in a fire station).
 *
 *   node tests/services.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { PENSION_PLANS, localPlanId, annuityFor } from '../src/modules/retirement/PensionPlans.js';
import { contextOf } from '../src/modules/equipment/Equipment.js';
import { equipmentCard } from '../src/ui/views/EquipmentView.js';
import { mergeService, mergedService, MERGERS } from '../src/modules/politics/ServiceMergers.js';
import { orgOf } from '../src/modules/org/Organizations.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { sesReadiness } from '../src/modules/publicservice/SeniorExecutive.js';
import { pursueEligibility } from '../src/modules/credentials/LicensingEngine.js';
import { directEntryEligibility } from '../src/modules/career/DirectEntry.js';
import { discharge, enlist } from '../src/modules/military/MilitaryEngine.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId, regionId, { age = 40, seed = 3, gender } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId, ...(gender ? { gender } : {}) });
  if (regionId) state.character.regionId = regionId;
  state.character.age = age;
  Object.assign(state.stats, { fitness: 80, smarts: 80, health: 90, happiness: 70 });
  state.legal.record = [];
  state.prompts = [];
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 });
  state.credentials.held.driverLicense = { earnedAge: 18, status: 'active' };
  return { engine, state, ctx: engine.context() };
}
function worker(countryId, regionId, professionId, levelId, opts) {
  const l = life(countryId, regionId, opts);
  const job = hire(l.ctx, { professionId, levelId, employer: createEmployer(new Random(2), l.state, getProfession(professionId), l.state.character.regionId) });
  assert.ok(job, `hired ${professionId}.${levelId} in ${countryId}`);
  job.yearsAtEmployer = 12;
  l.state.prompts = [];
  return { ...l, job };
}
const answer = (engine, state, type, option) => {
  const p = state.prompts.find((x) => x.type === type);
  assert.ok(p, `a ${type} prompt (${state.prompts.map((x) => x.type)})`);
  engine.resolvePrompt(p.id, option);
};

const tests = {
  'pensions: each country has its own scheme, and a UK firefighter gets far less than a US one'() {
    assert.equal(localPlanId('GB', 'publicSafety'), 'GB:publicSafety');
    assert.equal(localPlanId('AU', 'publicSafety'), null, 'Australia: super, not a defined-benefit plan');
    assert.equal(localPlanId('US', 'publicSafety'), 'publicSafety');
    const plan = { years: 30, salaries: Array.from({ length: 30 }, (_, i) => 40000 + i * 1500) };
    const us = annuityFor('publicSafety', plan, 55);
    const gb = annuityFor('GB:publicSafety', plan, 60);
    assert.ok(gb < us * 0.75, `GB ${gb} vs US ${us}`);
    assert.equal(PENSION_PLANS['DE:publicSafety'].ssCovered, false, 'Beamte are outside the statutory scheme');
    const { job } = worker('GB', 'manchester', 'fire', 'firefighter');
    assert.equal(job.employer.benefits.pension, 'GB:publicSafety');
    const au = worker('AU', 'sydney', 'fire', 'firefighter');
    assert.equal(au.job.employer.benefits.pension, null);
    assert.ok(au.job.employer.benefits.match >= 0.15, 'the employer pays super instead');
  },
  'HQ fleet: a station officer in a big service asks headquarters; the chief sets the fleet policy'() {
    const { state, engine } = worker('GB', 'manchester', 'fire', 'captain');
    const c = contextOf(state, 'job');
    assert.ok(c.hq, 'bought centrally');
    assert.match(equipmentCard(state, 'job'), /Ask .* for/);
    engine.dispatch('deptEquip.requisition', `job|${Object.keys(c.groups ?? {})[0] ?? 'apparatus'}`);
    const chief = worker('GB', 'manchester', 'fire', 'chief', { seed: 4 });
    const cc = contextOf(chief.state, 'job');
    assert.ok(cc.fleetHead && cc.manager, 'the chief runs the fleet');
    chief.engine.dispatch('deptEquip.fleetPolicy', 'job|premium');
    assert.equal(cc.fleetHead.fleetPolicy, 'premium');
  },
  'mergers: Manchester\'s fire service joins a regional one; rank and seniority carry over'() {
    const { engine, state, ctx, job } = worker('GB', 'manchester', 'fire', 'captain');
    const title = job.title;
    const name = mergeService(ctx, 'fire');
    assert.equal(name, 'North West Fire and Rescue Service');
    answer(engine, state, 'serviceMergers.transfer', 'transfer');
    const j = state.career.job;
    assert.equal(j.employer.name, name);
    assert.equal(orgOf(state, j.employer).name, name, 'a new organization');
    assert.equal(j.title, title);
    assert.equal(j.yearsAtEmployer, 12);
    assert.equal(j.employer.division, 'Manchester Area');
    assert.equal(j.mergedFrom, 'Greater Manchester Fire and Rescue Service');
    assert.equal(mergedService(state, 'manchester', 'fire'), name);
    const hire2 = createEmployer(new Random(9), state, getProfession('fire'), 'manchester');
    assert.equal(hire2.name, name, 'new recruits join the merged service');
    assert.equal(mergeService(ctx, 'fire'), null, 'merged once');
  },
  'mergers: the old chiefs compete for one job; the loser keeps their pay'() {
    const { engine, state, ctx, job } = worker('GB', 'manchester', 'police', 'chief');
    const salary = job.salary;
    mergeService(ctx, 'police');
    answer(engine, state, 'serviceMergers.transfer', 'deputy');
    const j = state.career.job;
    assert.equal(j.employer.name, 'North West Police');
    assert.notEqual(j.levelId, 'chief');
    assert.ok(j.salary >= salary);
  },
  'mergers: voluntary redundancy pays more for long service'() {
    const { engine, state, ctx } = worker('US', null, 'police', 'officer');
    const cash = state.finances.cash;
    mergeService(ctx, 'police');
    answer(engine, state, 'serviceMergers.transfer', 'redundancy');
    assert.equal(state.career.job, null);
    assert.ok(state.finances.cash > cash);
  },
  'mergers: services that are already one body are left alone'() {
    for (const [cc, region, svc] of [['GB', 'edinburgh', 'police'], ['NZ', null, 'fire'], ['AU', 'sydney', 'fire']]) {
      const { ctx, state } = worker(cc, region, svc, svc === 'police' ? 'officer' : 'firefighter');
      assert.equal(mergeService(ctx, svc), null, `${cc} ${svc}: ${state.career.job.employer.name}`);
    }
    assert.ok(Object.values(MERGERS).every((m) => m.precedent));
  },
  'bridge: an on-call firefighter goes wholetime in the same service with full seniority'() {
    const { engine, state, ctx } = life('GB', 'manchester', { age: 26, seed: 5 });
    engine.dispatch('emergency.join', 'fire');
    const m = state.emergency.fire;
    m.years = 6; m.rankIndex = 2;
    assert.ok(state.orgs.byId[m.orgId].parent, 'an on-call unit of the FRS');
    for (let i = 0; i < 20 && !state.prompts.length; i++) { state.yearly = {}; engine.dispatch('emergency.applyCareer', 'fire'); }
    const p = state.prompts.find((x) => x.type === 'emergency.jobOffer');
    assert.ok(p, 'an offer');
    assert.equal(p.title, 'A Wholetime Post');
    engine.resolvePrompt(p.id, 'accept');
    const job = state.career.job;
    assert.equal(job.professionId, 'fire');
    assert.ok(job.priorService.same);
    assert.equal(job.yearsAtEmployer, 6, 'seniority counts');
    assert.ok(job.step >= 4, `step ${job.step}`);
    assert.equal(state.emergency.fire, null, 'the on-call contract ends');
    assert.match(state.emergency.history.at(-1).reason, /full-time/);
    void ctx;
  },
  'bridge: a US volunteer hired by a career department gets partial credit and stays a volunteer'() {
    const { engine, state } = life('US', null, { age: 25, seed: 6 });
    engine.dispatch('emergency.join', 'fire');
    const m = state.emergency.fire;
    m.years = 8;
    const job = hire(engine.context(), { professionId: 'fire', levelId: 'firefighter', employer: createEmployer(new Random(2), state, getProfession('fire'), state.character.regionId) });
    assert.equal(job.priorService.credit, 4);
    assert.ok(job.step >= 3);
    assert.ok(state.emergency.fire, 'still on the volunteer roll');
    assert.ok(!/undefined|NaN/.test(VIEWS.service?.(state) ?? ''));
  },
  'a fire, ambulance or control-room service is headed by its own chief, not a Chief Constable'() {
    for (const prof of ['fire', 'ems', 'dispatch']) {
      const { state, job } = worker('GB', 'edinburgh', prof, getProfession(prof).levels[0].id);
      const org = orgOf(state, job.employer);
      assert.equal(org.people[org.head].title, org.posts.org.title, prof);
      assert.ok(!/Constable/.test(org.people[org.head].title), `${prof}: ${org.people[org.head].title}`);
    }
  },
  'SES abroad: years in a national agency count as civil service'() {
    const { state, ctx } = life('GB', 'london', { age: 45 });
    state.career.history.push({ professionId: 'gb_fbi', levelId: 'ssa', title: 'Detective Inspector', startAge: 30, endAge: 40 });
    const job = hire(ctx, { professionId: 'gb_fbi', levelId: 'asac', employer: createEmployer(new Random(2), state, getProfession('gb_fbi'), 'london') });
    job.performance = 85; job.yearsInLevel = 3;
    const row = sesReadiness(state).checks.find(([label]) => /civil service/.test(label));
    assert.ok(row[1], 'ten years at the NCA count');
  },
  'a random life can be born in any country'() {
    const seen = new Set();
    for (let i = 0; i < 40; i++) seen.add(life('random', null, { seed: i }).state.character.countryId ?? 'US');
    assert.ok(seen.size >= 8, [...seen].join(','));
  },
  'national services are national: FENZ is one body, not Christchurch\'s'() {
    const a = worker('NZ', 'christchurch', 'fire', 'firefighter');
    const org = orgOf(a.state, a.job.employer);
    assert.ok(org.national && org.size === 'mega' && org.regionId === null);
    assert.match(a.job.employer.division, /Christchurch/);
    assert.match(VIEWS.career(a.state), /National public service/);
  },
  'paramedics need a degree in the UK, Australia and New Zealand'() {
    for (const cc of ['GB', 'AU', 'NZ']) {
      const { state } = life(cc, null, { age: 22 });
      state.credentials.held.emt = { earnedAge: 20, status: 'active' };
      assert.equal(pursueEligibility(state, 'paramedic').ok, false, cc);
      state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'paramedicine', country: cc, year: 22 });
      assert.ok(pursueEligibility(state, 'paramedic').ok, cc);
    }
    const us = life('US', null, { age: 22 });
    us.state.credentials.held.emt = { earnedAge: 20, status: 'active' };
    us.state.finances.cash = 50000;
    assert.ok(pursueEligibility(us.state, 'paramedic').ok, 'the US keeps the one-year course');
  },
  'military pensions follow each country: preserved in Australia, immediate in Canada after 25'() {
    const run = (cc, years, track = 'enlisted') => {
      const { state, ctx } = life(cc, null, { age: 20 + years, gender: 'male' });
      state.character.citizenships = [cc];
      enlist(ctx, { branch: 'army', track, component: 'active', specialty: 'logistics' });
      const svc = state.military.service;
      svc.yearsOfService = years;
      discharge(ctx, 'retired', 'test');
      return state.retirement.pensions.find((p) => p.source === 'military');
    };
    const au = run('AU', 22);
    assert.equal(au.startAge, 60, 'ADF Super is preserved to 60');
    const ca = run('CA', 25);
    assert.equal(ca.startAge, 45, 'immediate after 25 years');
    const ca2 = run('CA', 12);
    assert.equal(ca2.startAge, 60, 'deferred before 25');
    assert.equal(run('IN', 10), undefined, 'India: nothing before 15 years');
  },
  'direct entry: India\'s IPS and Sub-Inspector exams start graduates above constable'() {
    const { state, engine } = life('IN', null, { age: 23, seed: 9 });
    state.character.citizenships = ['IN'];
    state.stats.smarts = 95;
    state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'economics', gpa: 3.8, year: 22, country: 'IN' });
    assert.ok(directEntryEligibility(state, 'statePolice', 'ips').ok);
    for (let i = 0; i < 10 && !state.career.job; i++) { state.yearly = {}; engine.dispatch('directEntry.apply', 'statePolice|si'); }
    assert.equal(state.career.job?.title, 'Sub-Inspector');
    assert.ok(state.career.job.fastTrack);
    assert.equal(directEntryEligibility(state, 'police', 'dei').ok, false, 'no UK routes in India');
  },
  'Korea: a career soldier is not conscripted after retiring'() {
    const { state, ctx } = life('KR', null, { age: 46, gender: 'male' });
    state.character.citizenships = ['KR'];
    state.military.history.push({ branch: 'army', nation: 'KR', yearsOfService: 24, discharge: 'retired', startAge: 22, endAge: 46 });
    state.military.conscription = { status: 'pending' };
    MODULES.find((x) => x.id === 'conscription').onAgeUp(ctx);
    assert.equal(state.military.conscription.status, 'served');
  },
  'national service is compulsory: Singapore and Israel call up at 18 (women too in Israel); Nigeria\'s NYSC for graduates'() {
    const call = (cc, gender, setup) => {
      const { state, ctx } = life(cc, null, { age: 18, gender });
      state.character.citizenships = [cc];
      state.military.conscription = { status: 'pending' };
      setup?.(state);
      MODULES.find((x) => x.id === 'conscription').onAgeUp(ctx);
      return state.prompts.find((p) => p.type.startsWith('conscription.'));
    };
    assert.equal(call('SG', 'male')?.type, 'conscription.universal');
    assert.equal(call('SG', 'female'), undefined, 'Singapore: men only');
    const il = call('IL', 'female');
    assert.equal(il?.type, 'conscription.universal');
    assert.ok(il.options.some((o) => o.id === 'alternative'), 'Sherut Leumi as the alternative');
    const ng = call('NG', 'female', (st) => { st.character.age = 23; st.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 }); });
    assert.equal(ng?.type, 'conscription.graduate');
  },
  'new countries: China\'s NPC keeps a Communist Party supermajority'() {
    const { state, engine } = life('CN', null, { age: 30 });
    for (let i = 0; i < 6; i++) { state.prompts = []; engine.ageUp(); }
    const bodies = Object.values(state.politics?.legislatures ?? state.legislatures ?? {}).filter((b) => b?.level === 'federal');
    for (const b of bodies) assert.ok(b.labor / b.seats >= 0.65, `${b.name}: ${b.labor}/${b.seats}`);
  },
  'national service: Korea\'s 119 social service and Germany\'s Feuerwehr commitment count'() {
    const kr = life('KR', null, { age: 20, seed: 7, gender: 'male' });
    kr.state.stats.health = 50;
    kr.state.military.conscription = { status: 'pending' };
    kr.state.character.citizenships = ['KR'];
    MODULES.find((x) => x.id === 'conscription').resolvers.korea(kr.ctx, {}, 'social119');
    assert.equal(kr.state.military.conscription.post, 'fire');
    kr.state.character.age = 22;
    MODULES.find((x) => x.id === 'conscription').onAgeUp(kr.ctx);
    assert.ok(kr.state.emergency.history.some((h) => h.nationalService && h.serviceId === 'fire'));
    const job = hire(kr.ctx, { professionId: 'fire', levelId: 'firefighter', employer: createEmployer(new Random(2), kr.state, getProfession('fire'), kr.state.character.regionId) });
    assert.equal(job.priorService.years, 2);
    const de = life('DE', null, { age: 18, seed: 8, gender: 'male' });
    MODULES.find((x) => x.id === 'conscription').resolvers.germany(de.ctx, {}, 'feuerwehr');
    assert.equal(de.state.military.conscription.alternative, 'feuerwehr');
    assert.ok(de.state.emergency.fire, 'joined the Freiwillige Feuerwehr');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} service test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} service tests passed`);
