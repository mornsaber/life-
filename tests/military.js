/**
 * The military on the organization system: units, billets, command boards,
 * leadership powers (and, as later phases land, special operations, UCMJ,
 * overseas tours, boards and retirement).
 *
 *   node tests/military.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { unitView, unitTick, billetFor, syncUnit, PLAYER } from '../src/modules/org/MilitaryUnits.js';
import { ranksOf, annualActivePay, exposureOf } from '../src/modules/military/MilitaryEngine.js';
import { PIPELINES, selectionEligibility, courseOdds } from '../src/modules/military/SpecialOps.js';
import { reportMisconduct, preferCharges } from '../src/modules/military/UCMJ.js';
import { pcsOrders, serviceLifeTick, belowZone, giBillTransferEligibility } from '../src/modules/military/MilitaryLife.js';
import { tryPromotion, discharge } from '../src/modules/military/MilitaryEngine.js';
import { buildHeirState } from '../src/modules/people/Legacy.js';
import { promotionOutlook } from '../src/modules/military/MilitaryEngine.js';
import { qualBoardBonus } from '../src/modules/military/Schools.js';
import { giBillEligible } from '../src/modules/education/EducationEngine.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function setup(seed = 7, age = 22) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Mil', lastName: 'Test' });
  state.character.age = age;
  Object.assign(state.stats, { smarts: 80, fitness: 85, health: 95, happiness: 70 });
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', major: null, year: 18 });
  return { engine, state, ctx: engine.context() };
}
function enlist(engine, arg = 'army:enlisted:active') {
  engine.dispatch('military.enlist', arg);
  const p = engine.state.prompts.find((x) => x.type === 'military.chooseSpecialty');
  assert.ok(p, 'specialty prompt');
  engine.resolvePrompt(p.id, p.options.find((o) => !o.disabled).id);
  return engine.state.military.service;
}
const year = (engine) => {
  engine.state.prompts = [];
  engine.ageUp();
  for (let i = 0; i < 10 && engine.state.prompts.length; i++) {
    const p = engine.state.prompts[0];
    engine.resolvePrompt(p.id, (p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0]).id);
  }
};

const tests = {
  'a new soldier joins a unit with a named chain of command'() {
    const { engine, state } = setup(1);
    const svc = enlist(engine);
    year(engine);
    if (!state.military.service) return; // separated (rare)
    const v = unitView(state, svc);
    assert.ok(v, 'unit view');
    assert.equal(v.billet, 'member');
    const labels = v.chain.map((c) => c.label);
    for (const l of ['Squad Leader', 'Platoon Sergeant', 'Platoon Leader', 'First Sergeant', 'Company Commander', 'Battalion Commander']) assert.ok(labels.includes(l), `chain has ${l}: ${labels.join(', ')}`);
    assert.ok(v.team.length >= 3, 'squad mates');
  },

  'rank sets the billet; a squad leader leads named soldiers and can act on them'() {
    const { engine, state, ctx } = setup(2);
    const svc = enlist(engine);
    svc.isNew = false;
    svc.grade = 5; // E-6
    syncUnit(state, svc, ranksOf(svc));
    const v = unitView(state, svc);
    assert.equal(v.billet, 'squadLeader');
    assert.equal(v.dept.platoon.squads[0].leader, PLAYER);
    assert.ok(v.team.length >= 4, 'your squad');
    const s = v.team[0];
    const rel = s.rel;
    engine.dispatch('military.counsel', s.id);
    assert.ok(s.rel > rel, 'counseling builds trust');
    // NCOs recommend Article 15s; the commander decides.
    s.performance = 20;
    s.discipline = 1;
    state.yearly = {};
    let punished = false;
    for (let i = 0; i < 10 && !punished; i++) { state.yearly = {}; const d = s.discipline; engine.dispatch('military.njp', s.id); punished = s.discipline > d; }
    assert.ok(punished, 'the commander eventually approves a justified Article 15');
    assert.ok(unitTick(ctx, svc, ranksOf(svc)) !== undefined);
  },

  'officers: platoon leader, then a selection board for company command; commanders impose NJP; command helps promotion'() {
    const { engine, state, ctx } = setup(3, 23);
    state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 });
    const svc = enlist(engine, 'army:officer:active');
    svc.isNew = false;
    assert.equal(billetFor(svc), 'platoonLeader');
    svc.grade = 2; // O-3
    svc.yearsInGrade = 2;
    svc.eval = 95;
    let offer = null;
    for (let i = 0; i < 20 && !offer; i++) { state.prompts = []; unitTick(ctx, svc, ranksOf(svc)); offer = state.prompts.find((p) => p.type === 'military.commandOffer'); }
    assert.ok(offer, 'selected for command');
    engine.resolvePrompt(offer.id, 'accept');
    syncUnit(state, svc, ranksOf(svc));
    const v = unitView(state, svc);
    assert.equal(v.billet, 'companyCommander');
    assert.equal(v.dept.head, PLAYER, 'you command the company');
    assert.ok(!v.chain.some((c) => c.label === 'Company Commander'), 'no NPC commander above you');
    const target = v.team[0];
    target.performance = 20;
    const d = target.discipline;
    state.yearly = {};
    engine.dispatch('military.njp', target.id);
    assert.ok(target.discipline > d, 'commanders impose Article 15s directly');
    // The tour ends; you move to staff and keep the credit.
    state.character.age = svc.unit.commandUntil;
    unitTick(ctx, svc, ranksOf(svc));
    assert.equal(svc.unit.commanded.companyCommander, true);
    assert.notEqual(unitView(state, svc).billet, 'companyCommander');
  },

  'PCS moves you to a new unit'() {
    const { engine, state } = setup(4);
    const svc = enlist(engine);
    year(engine);
    if (!state.military.service) return;
    const first = svc.unit.orgId;
    for (let i = 0; i < 4 && state.military.service; i++) year(engine);
    if (!state.military.service) return;
    assert.notEqual(state.military.service.unit.orgId, first, 'a new unit after PCS');
  },

  'special operations: eligibility, phase-by-phase selection, washouts, and life on a team'() {
    const { engine, state } = setup(5);
    const svc = enlist(engine);
    assert.equal(selectionEligibility(state, 'ranger').ok, false, 'not during initial training');
    svc.isNew = false;
    assert.equal(selectionEligibility(state, 'seal').ok, false, 'SEALs are Navy');
    assert.ok(selectionEligibility(state, 'ranger').ok, selectionEligibility(state, 'ranger').reason);
    // Many candidates: most wash out, some graduate.
    let grads = 0;
    let quits = 0;
    const N = 60;
    for (let i = 0; i < N; i++) {
      const t = setup(100 + i);
      const s = enlist(t.engine);
      s.isNew = false;
      t.engine.dispatch('military.volunteerSelection', 'ranger');
      for (let k = 0; k < 6; k++) {
        const p = t.state.prompts.find((x) => x.type === 'military.selectionPhase');
        if (!p) break;
        t.engine.resolvePrompt(p.id, i % 10 === 0 ? 'quit' : 'all');
      }
      assert.equal(t.state.military.selection, null, 'the course ends');
      if (s.sof) grads += 1;
      if (i % 10 === 0) { quits += 1; assert.ok(!s.sof, 'quitters wash out'); }
    }
    assert.ok(grads > N * 0.1 && grads < N * 0.8, `some graduate, most don't: ${grads}/${N}`);
    // A graduate: own unit, special pay, more exposure, team missions.
    const t = setup(7);
    const s = enlist(t.engine);
    s.isNew = false;
    const pay = annualActivePay(s);
    for (let tries = 0; tries < 30 && !s.sof; tries++) {
      t.state.yearly = {};
      s.selectionAttempts = {};
      t.engine.dispatch('military.volunteerSelection', 'ranger');
      for (let k = 0; k < 6; k++) { const p = t.state.prompts.find((x) => x.type === 'military.selectionPhase'); if (!p) break; t.engine.resolvePrompt(p.id, 'all'); }
      t.state.prompts = [];
    }
    assert.ok(s.sof, 'eventually someone makes it');
    assert.equal(s.sof.unitName, PIPELINES.ranger.unitName);
    assert.ok(annualActivePay(s) > pay, 'special pay');
    assert.ok(exposureOf(s) >= 1.9);
    Object.assign(t.state.stats, { fitness: 85, health: 95 });
    year(t.engine);
    if (t.state.military.service) assert.equal(unitView(t.state, s).org.name, PIPELINES.ranger.unitName, 'serves in the Ranger Regiment');
    // Two tries per course.
    const u = setup(8);
    const s2 = enlist(u.engine);
    s2.isNew = false;
    s2.selectionAttempts = { ranger: 2 };
    assert.equal(selectionEligibility(u.state, 'ranger').ok, false);
  },

  'Space Force: a branch with its own ranks and a mind-first assessment'() {
    const { engine, state } = setup(9);
    Object.assign(state.stats, { smarts: 90, fitness: 50 });
    const svc = enlist(engine, 'spaceforce:enlisted:active');
    assert.equal(svc.branch, 'spaceforce');
    svc.isNew = false;
    svc.grade = 3;
    state.clearances = state.clearances ?? {};
    const odds = courseOdds(state, 'orbitalWarfare');
    Object.assign(state.stats, { smarts: 40 });
    assert.ok(courseOdds(state, 'orbitalWarfare') < odds, 'smarts matter more than fitness');
    year(engine);
    assert.ok(state.military.service, 'serves');
  },

  'UCMJ: Article 15s reduce rank; refusing one means a court-martial; convictions go on the record and can mean the brig'() {
    const { engine, state, ctx } = setup(11);
    const svc = enlist(engine);
    svc.isNew = false;
    svc.grade = 3;
    svc.eval = 50;
    reportMisconduct(ctx, 'disobey');
    let p = state.prompts.find((x) => x.type === 'military.njpOffer');
    assert.ok(p, 'NJP offered');
    engine.resolvePrompt(p.id, 'accept');
    assert.equal(svc.disciplinary, 1);
    assert.equal(svc.njp.length, 1);
    assert.equal(state.legal.record.length, 0, 'an Article 15 is not a conviction');
    // Refuse the next one: special court-martial.
    reportMisconduct(ctx, 'dui');
    p = state.prompts.find((x) => x.type === 'military.njpOffer');
    engine.resolvePrompt(p.id, 'refuse');
    p = state.prompts.find((x) => x.type === 'military.courtMartial');
    assert.ok(p, 'court-martial');
    assert.equal(p.data.court, 'special');
    engine.resolvePrompt(p.id, 'plead');
    assert.ok(state.legal.record.some((r) => r.court === 'court-martial' && r.offenseId === 'ucmjDui'), 'federal record');
    // General court-martial for a serious offense: often a dishonorable discharge and the brig.
    let dd = 0;
    let brig = 0;
    for (let i = 0; i < 20; i++) {
      const t = setup(200 + i);
      const s = enlist(t.engine);
      s.isNew = false;
      s.grade = 4;
      preferCharges(t.ctx, 'assault');
      const q = t.state.prompts.find((x) => x.type === 'military.courtMartial');
      t.engine.resolvePrompt(q.id, 'tds');
      const h = t.state.military.history.at(-1);
      if (h?.discharge === 'dishonorable') dd += 1;
      if (t.state.legal.incarceration?.kind === 'brig') brig += 1;
      if (h) assert.ok(!t.state.military.service, 'separated');
    }
    assert.ok(dd >= 5, `dishonorable discharges: ${dd}`);
    assert.ok(brig >= 3, `confined: ${brig}`);
  },

  'overseas tours: family or alone, a spouse\'s job, and coming home'() {
    let sawOrders = false;
    let lostJob = 0;
    for (let i = 0; i < 30; i++) {
      const { engine, state, ctx } = setup(300 + i);
      state.people.list.push({ id: 'sp', firstName: 'Ana', lastName: 'Case', gender: 'female', relation: 'spouse', ageOffset: 0, relationship: 80, alive: true, income: 50000, careerIncome: 50000, job: 'Nurse', sector: 'private', nationality: 'US', since: 20 });
      const svc = enlist(engine);
      svc.isNew = false;
      state.prompts = [];
      pcsOrders(ctx, svc);
      const p = state.prompts.find((x) => x.type === 'military.overseasOrders');
      if (p) {
        sawOrders = true;
        engine.resolvePrompt(p.id, i % 2 ? 'family' : 'alone');
        assert.ok(svc.overseas, 'serving abroad');
        assert.equal(svc.overseas.accompanied, Boolean(i % 2));
        const rel = state.people.list.find((x) => x.id === 'sp').relationship;
        serviceLifeTick(ctx, svc);
        if (!svc.overseas.accompanied) assert.ok(state.people.list.find((x) => x.id === 'sp').relationship < rel, 'unaccompanied tours strain a marriage');
        const region = state.character.regionId;
        pcsOrders(ctx, svc);
        assert.equal(svc.overseas, null, 'home again');
        assert.ok(svc.station, region);
      }
      if (!state.people.list.find((x) => x.id === 'sp').job) lostJob += 1;
    }
    assert.ok(sawOrders, 'some orders go overseas');
    assert.ok(lostJob > 0, 'military spouses lose jobs to moves');
  },

  'boards: fitness reports, below-the-zone promotion; BRS; GI Bill to your kids'() {
    const { engine, state, ctx } = setup(12);
    const svc = enlist(engine);
    svc.isNew = false;
    svc.grade = 3;
    svc.yearsInGrade = 1; // E-4 needs 2 years: in the BTZ window
    svc.eval = 95;
    svc.reports = [{ age: 20, score: 95, block: 'Most Qualified' }, { age: 21, score: 96, block: 'Most Qualified' }];
    svc.schools.pme1 = 21;
    assert.ok(belowZone(svc, 2, 60), 'eligible below the zone');
    let early = false;
    for (let i = 0; i < 30 && !early; i++) { svc.grade = 3; svc.yearsInGrade = 1; early = tryPromotion(ctx, svc); }
    assert.ok(early, 'promoted early');
    // BRS at year 2.
    svc.yearsOfService = 2;
    state.prompts = [];
    serviceLifeTick(ctx, svc);
    const brs = state.prompts.find((x) => x.type === 'military.brs');
    assert.ok(brs, 'BRS choice');
    engine.resolvePrompt(brs.id, 'brs');
    const dc = state.retirement.dc;
    serviceLifeTick(ctx, svc);
    assert.ok(state.retirement.dc > dc, 'TSP match');
    // GI Bill transfer: six years, a child, four more years.
    assert.equal(giBillTransferEligibility(state).ok, false);
    svc.yearsOfService = 7;
    state.people.list.push({ id: 'kid1', firstName: 'Sam', lastName: 'Case', gender: 'male', relation: 'child', ageOffset: -20, relationship: 80, alive: true, income: 0, careerIncome: 0, nationality: 'US', otherParentId: null, custody: 'you' });
    engine.dispatch('military.transferGiBill');
    assert.ok(svc.giBillTransferred);
    assert.ok(state.people.list.find((p) => p.id === 'kid1').giBill >= 1);
    discharge(ctx, 'honorable', 'test');
    state.character.age += 1;
    const heir = buildHeirState(engine.rng, state, 'kid1');
    assert.ok(heir && giBillEligible(heir), 'your child can use it');
  },

  'schools: PME gates promotion; qualifications add board points and pay'() {
    const { engine, state } = setup(13);
    const svc = enlist(engine);
    svc.isNew = false;
    Object.assign(svc, { grade: 3, yearsInGrade: 3, eval: 90 });
    assert.match(promotionOutlook(svc).reason, /Basic Leader Course/, 'sergeant needs BLC');
    let passed = false;
    for (let i = 0; i < 10 && !passed; i++) { state.yearly = {}; engine.dispatch('military.attendSchool', 'pme1'); passed = Boolean(svc.schools.pme1); }
    assert.ok(passed);
    assert.equal(promotionOutlook(svc).eligible, true);
    const pay = annualActivePay(svc);
    for (let i = 0; i < 20 && !svc.schools.airborne; i++) { state.yearly = {}; engine.dispatch('military.attendSchool', 'airborne'); }
    assert.ok(svc.schools.airborne, 'jump wings');
    assert.ok(annualActivePay(svc) > pay, 'jump pay');
    assert.ok(qualBoardBonus(svc) > 0);
    state.yearly = {};
    engine.dispatch('military.attendSchool', 'freefall');
    assert.ok(!svc.schools.freefall, 'freefall is for special operators');
  },

  'prior service and academy years count toward retirement'() {
    const { engine, state, ctx } = setup(14, 30);
    let svc = enlist(engine);
    svc.isNew = false;
    Object.assign(svc, { yearsOfService: 8, grade: 4 });
    discharge(ctx, 'honorable', 'test');
    svc = enlist(engine);
    assert.equal(svc.yearsOfService, 8, 'eight prior years');
    assert.ok(svc.grade >= 3, 'back near the old grade');
    Object.assign(svc, { yearsOfService: 20, isNew: false });
    discharge(ctx, 'retired', 'test');
    assert.ok(state.retirement.pensions.some((p) => p.id === 'military'), 'retired with prior service');
    // An academy graduate starts with four years.
    const t = setup(15, 22);
    t.state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 });
    t.state.military.academyCredit = 4;
    const o = enlist(t.engine, 'army:officer:active');
    assert.equal(o.yearsOfService, 4);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.message.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} military test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} military tests passed`);
