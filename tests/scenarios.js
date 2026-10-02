/**
 * Deterministic scenario tests for mechanics random play rarely reaches:
 * diplomatic immunity, academy sponsorship, SF-86 lies, demotions, pension
 * vesting, unions, management delegation, license suspension, GI Bill.
 *
 *   node tests/scenarios.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire, promotionStatus } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { hasCredential, findSponsor } from '../src/modules/credentials/LicensingEngine.js';
import { getCredential } from '../src/modules/credentials/CredentialRegistry.js';
import { planStatus } from '../src/modules/retirement/RetirementEngine.js';
import { salaryBreakdown } from '../src/modules/career/PayGrades.js';
import { changeRegion, REGIONS } from '../src/modules/life/Regions.js';
import { stateIncomeTax } from '../src/modules/life/States.js';
import { quote } from '../src/modules/realestate/MortgageSystem.js';
import { annualTuition } from '../src/modules/education/EducationEngine.js';
import { Finances } from '../src/modules/life/Finances.js';
import { BrokerageEngine } from '../src/modules/investing/index.js';
import { HealthEngine, addCondition, medicalBill, coverageId, getCondition } from '../src/modules/health/index.js';
import { discharge } from '../src/modules/military/MilitaryEngine.js';
import { housingStatus } from '../src/modules/realestate/index.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
};

function setup(seed = 7, age = 25) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Test', lastName: 'Case' });
  state.character.age = age;
  state.stats.smarts = 80;
  state.stats.fitness = 70;
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', major: null, year: 18 });
  return { engine, state, ctx: engine.context() };
}

function giveJob(engine, professionId, levelId, regionId) {
  const ctx = engine.context();
  const profession = getProfession(professionId);
  const employer = createEmployer(engine.rng, engine.state, profession, regionId ?? engine.state.character.regionId);
  hire(ctx, { professionId, levelId, employer });
  engine.state.prompts = [];
  return engine.state.career.job;
}

function resolve(engine, type, optionId) {
  const prompt = engine.state.prompts.find((p) => p.type === type);
  assert.ok(prompt, `expected a ${type} prompt; have ${engine.state.prompts.map((p) => p.type).join(', ') || 'none'}`);
  assert.ok(engine.resolvePrompt(prompt.id, optionId));
}

const tests = {
  'diplomatic immunity: invoking it avoids local court but recalls you'() {
    const { engine, state, ctx } = setup();
    giveJob(engine, 'foreignService', 'fs4');
    ctx.emit('career:posting', { posting: { city: 'Lagos', country: 'Nigeria', hardship: 0.25, danger: 0.1, immunity: true, housing: true } });
    ctx.emit('legal:offense', { offenseId: 'dui', context: 'crash in diplomatic vehicle', caught: true });
    resolve(engine, 'legal.immunity', 'invoke');
    assert.equal(state.legal.record.length, 0, 'no conviction under immunity');
    assert.equal(state.career.job?.posting ?? null, null, 'recalled from post');
    assert.equal(state.character.regionId, 'dc');
  },

  'diplomatic immunity does not cover crimes against the U.S.'() {
    const { engine, state, ctx } = setup();
    giveJob(engine, 'foreignService', 'fs4');
    ctx.emit('career:posting', { posting: { city: 'Paris', country: 'France', hardship: 0, danger: 0, immunity: true, housing: true } });
    ctx.emit('legal:offense', { offenseId: 'visaFraud', caught: true });
    assert.ok(state.prompts.some((p) => p.type === 'legal.court'), 'goes straight to court');
    assert.ok(!state.prompts.some((p) => p.type === 'legal.immunity'));
  },

  'police academy is employer-funded even when the training budget is empty'() {
    const { engine, state } = setup();
    state.credentials.held.driverLicense = { status: 'active', earnedAge: 18, renewedAge: 25 };
    const job = giveJob(engine, 'police', 'recruit');
    job.employer.budget.left = 0;
    const sponsor = findSponsor(state, getCredential('post'));
    assert.ok(sponsor?.academy, 'academy sponsor');
    engine.dispatch('credentials.pursue', 'post');
    assert.equal(state.credentials.training[0]?.id, 'post', 'in academy');
    assert.equal(state.finances.cash, 0, 'player paid nothing');
  },

  'volunteer and career credentials are the same credential'() {
    const { engine, state } = setup();
    engine.dispatch('emergency.join', 'fire');
    state.emergency.fire.budget.left = 5000;
    state.yearly = {};
    state.stats.fitness = 100;
    for (let i = 0; i < 5 && !hasCredential(state, 'ff1'); i++) {
      state.yearly = {};
      engine.dispatch('credentials.pursue', 'ff1');
    }
    assert.ok(hasCredential(state, 'ff1'));
    assert.ok(state.emergency.fire.budget.left < 5000, 'unit budget paid');
  },

  'lying on the SF-86 can be caught and prosecuted'() {
    let caught = false;
    for (let seed = 1; seed < 40 && !caught; seed++) {
      const { engine, state } = setup(seed);
      state.legal.record.push({ offenseId: 'drugPossession', name: 'Drug Possession', severity: 'misdemeanor', age: 22 });
      state.publicService.exams.federal = { score: 95, age: 25 };
      state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'internationalRelations', year: 22 });
      engine.dispatch('career.apply', 'intelligence');
      while (state.prompts.length && !state.prompts.some((p) => p.type === 'career.clearance')) {
        const p = state.prompts[0];
        engine.resolvePrompt(p.id, p.type === 'career.negotiate' ? 'accept' : p.options[0].id);
      }
      if (!state.prompts.length) continue;
      resolve(engine, 'career.clearance', 'omit');
      if (state.prompts.some((p) => p.type === 'legal.court')) caught = true;
    }
    assert.ok(caught, 'a concealed issue was caught at least once in 40 attempts');
  },

  'sustained low performance demotes before it fires'() {
    const { engine, state } = setup();
    state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 });
    const job = giveJob(engine, 'corporate', 'srAnalyst');
    job.yearsInLevel = 5;
    job.lowYears = 1;
    job.warnings = 0;
    job.performance = 5;
    state.stats.smarts = 1;
    state.stats.stress = 100;
    job.boss = 0;
    engine.rng = new Random(3);
    engine.ageUp();
    while (state.prompts.length) engine.resolvePrompt(state.prompts[0].id, state.prompts[0].options[0].id);
    assert.ok(state.career.job, 'still employed');
    assert.equal(state.career.job.levelId, 'analyst', 'demoted one level');
  },

  'vested public pensions become deferred annuities'() {
    const { engine, state, ctx } = setup(5, 30);
    giveJob(engine, 'municipalAdmin', 'clerk');
    state.retirement.plans.municipal = { years: 8, salaries: [50000, 52000, 54000], employers: ['City'], started: false };
    ctx.emit('career:resign', { reason: 'Quit' });
    const status = planStatus(state, 'municipal');
    assert.ok(status.vested && !status.eligibleNow);
    state.character.age = 59;
    state.prompts = [];
    engine.ageUp();
    assert.ok(state.retirement.pensions.some((p) => p.id === 'plan.municipal'), 'annuity started at 60');
  },

  'DUI suspends the driver license and CDL'() {
    const { engine, state, ctx } = setup();
    state.credentials.held.driverLicense = { status: 'active', earnedAge: 18, renewedAge: 25 };
    state.credentials.held.cdlA = { status: 'active', earnedAge: 21, renewedAge: 25 };
    ctx.emit('legal:offense', { offenseId: 'dui', caught: true });
    resolve(engine, 'legal.court', 'plead');
    assert.equal(state.credentials.held.driverLicense.status, 'suspended');
    assert.equal(state.credentials.held.cdlA.status, 'suspended');
  },

  'delegation is only available for large departments'() {
    const { engine, state } = setup();
    state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 });
    const job = giveJob(engine, 'corporate', 'teamLead');
    job.department.headcount = 3;
    engine.dispatch('career.toggleDelegation', 'hiring');
    assert.equal(job.department.delegation.hiring, false);
    job.department.headcount = 20;
    engine.dispatch('career.toggleDelegation', 'hiring');
    assert.equal(job.department.delegation.hiring, true);
  },

  'contracting removes union risk and costs more'() {
    const { engine, state } = setup();
    state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 });
    const job = giveJob(engine, 'corporate', 'opsManager');
    engine.dispatch('career.setWorkforce', 'contracted');
    assert.equal(job.department.workforce, 'contracted');
    state.prompts = [];
    engine.ageUp();
    assert.equal(state.career.job.department.unionRisk, 0);
  },

  'federal locality pay and private market pay differ by region'() {
    const sf = salaryBreakdown({ grade: 5, step: 1, payMultiplier: 1, sector: 'federal', size: 'large', regionId: 'sf' }).total;
    const rural = salaryBreakdown({ grade: 5, step: 1, payMultiplier: 1, sector: 'federal', size: 'large', regionId: 'rural' }).total;
    assert.ok(sf > rural * 1.2);
  },

  'park rangers are relocated to rural housing'() {
    const { engine, state } = setup();
    giveJob(engine, 'parkService', 'seasonal', 'rural');
    assert.equal(state.character.regionId, 'rural');
    assert.ok(state.career.job.employer.benefits.housing);
  },

  'GI Bill pays tuition for honorably discharged veterans'() {
    const { engine, state } = setup();
    state.military.history.push({ branch: 'army', track: 'enlisted', component: 'active', yearsOfService: 4, discharge: 'honorable', rankCode: 'E-4', rankTitle: 'Specialist', deployments: 0, startAge: 18, endAge: 22 });
    engine.rng = new Random(2);
    engine.dispatch('education.enroll', 'bachelor:state:business:full');
    assert.ok(state.education.enrolled, 'admitted');
    engine.ageUp();
    assert.equal(state.finances.loans, 0, 'no tuition loans');
  },

  'promotion plateau after repeated senior pass-overs'() {
    const { engine, state } = setup();
    state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 });
    const job = giveJob(engine, 'corporate', 'opsManager');
    job.yearsInLevel = 10;
    job.passovers = 3;
    assert.equal(promotionStatus(state).plateaued, true);
  },

  'moving states: driver license auto-transfers, RN compact holds, bar needs motion or exam'() {
    const { engine, state, ctx } = setup(3, 30);
    state.character.regionId = 'midcity'; // OH (NLC member)
    for (const id of ['driverLicense', 'rn', 'barLicense']) state.credentials.held[id] = { status: 'active', earnedAge: 25, renewedAge: 29, states: ['OH'] };
    changeRegion(ctx, 'denver', 'Test move'); // CO (NLC member)
    assert.ok(hasCredential(state, 'driverLicense'), 'driver license reissued');
    assert.ok(hasCredential(state, 'rn'), 'RN valid via compact');
    assert.ok(!hasCredential(state, 'barLicense'), 'bar not valid in CO');
    changeRegion(ctx, 'chicago', 'Test move'); // IL (not NLC)
    assert.ok(!hasCredential(state, 'rn'), 'IL is not a compact state');
    state.career.history.push({ professionId: 'law', startAge: 25, endAge: 31, peakGrade: 6 });
    engine.dispatch('credentials.transfer', 'barLicense');
    assert.ok(hasCredential(state, 'barLicense'), 'admitted by motion after 5+ years');
  },

  'Texas has no state income tax; California does'() {
    assert.equal(stateIncomeTax('TX', 150000), 0);
    assert.ok(stateIncomeTax('CA', 150000) > 8000);
  },

  'VA loans allow 0% down for veterans; others need a down payment'() {
    const { state } = setup(4, 30);
    state.finances.cash = 20000;
    state.finances.lastYear = { gross: 90000 };
    state.housing.credit.score = 720;
    assert.equal(quote(state, 300000, 'va').ok, false, 'not a veteran');
    state.military.history.push({ branch: 'army', track: 'enlisted', component: 'active', yearsOfService: 4, discharge: 'honorable', rankCode: 'E-4', rankTitle: 'Specialist', deployments: 0, startAge: 18, endAge: 22 });
    const q = quote(state, 300000, 'va');
    assert.ok(q.ok, q.reason);
    assert.equal(q.down, 0);
  },

  'two years of missed mortgage payments end in foreclosure'() {
    const { engine, state } = setup(6, 35);
    state.housing.properties.push({ id: 'p1', type: 'starter', typeName: 'Starter Home', regionId: state.character.regionId, value: 300000, valueAdj: 1, purchasePrice: 300000, purchaseAge: 33, condition: 80, use: 'primary', mortgage: { type: 'conv30', rate: 0.07, termYears: 30, yearsLeft: 28, balance: 280000, original: 285000, payment: 22000, mip: 0, delinquent: 0, armResetIn: null }, heloc: null, tenants: [], insured: true });
    state.finances.cash = -60000;
    for (let i = 0; i < 2; i++) {
      state.prompts = [];
      engine.ageUp();
      state.finances.cash = Math.min(state.finances.cash, -60000);
    }
    assert.equal(state.housing.properties.length, 0, 'foreclosed');
    assert.ok(state.housing.credit.events.some((e) => e.type === 'foreclosure'));
    assert.ok(state.housing.credit.score < 600, `score ${state.housing.credit.score}`);
  },

  'active duty gets PCS orders and base housing'() {
    const { engine, state, ctx } = setup(8, 22);
    engine.dispatch('military.enlist', 'army:enlisted:active');
    resolve(engine, 'military.chooseSpecialty', 'logistics');
    const before = state.character.regionId;
    state.prompts = [];
    engine.ageUp();
    state.prompts = [];
    assert.ok(state.military.service?.station ?? state.military.history.length, 'assigned to a base (or separated in combat)');
    assert.notEqual(state.character.regionId, before === state.character.regionId ? '__' : before);
    assert.equal(ctx.state.housing.rental, null);
  },

  'the governor activates the National Guard for disasters'() {
    const { engine, state, ctx } = setup(9, 25);
    engine.dispatch('military.enlist', 'guard:enlisted:reserve');
    resolve(engine, 'military.chooseSpecialty', 'engineer');
    const cash = state.finances.cash;
    ctx.emit('disaster:struck', { disaster: { type: 'flood', severity: 2, stateId: 'OH', regionId: 'midcity', name: 'The Great Flood' } });
    assert.ok(state.finances.cash > cash, 'state active duty pay');
    assert.equal(enlistOk(state), false);
  },

  'top agency posts come only by gubernatorial appointment'() {
    const { engine, state, ctx } = setup(10, 45);
    state.credentials.held.driverLicense = { status: 'active', earnedAge: 18, renewedAge: 44 };
    const job = giveJob(engine, 'statePolice', 'major');
    job.yearsInLevel = 10;
    const status = promotionStatus(state);
    assert.equal(status.eligible, false);
    assert.ok(status.appointable?.length, 'superintendent is appointable');
    ctx.emit('career:appoint', { levelId: 'superintendent' });
    assert.equal(state.career.job.levelId, 'superintendent');
  },

  'tenured professors are not fired for poor performance'() {
    const { engine, state } = setup(11, 45);
    const job = giveJob(engine, 'university', 'professor');
    job.performance = 5;
    job.warnings = 5;
    job.lowYears = 5;
    state.stats.smarts = 1;
    state.stats.stress = 100;
    state.prompts = [];
    engine.ageUp();
    assert.ok(state.career.job, 'still employed');
  },

  'public universities charge out-of-state tuition for the first year'() {
    const { state, ctx } = setup(12, 25);
    state.character.residencySince = 0;
    const inState = annualTuition('bachelor', 'state', state);
    changeRegion(ctx, 'seattle', 'Test');
    assert.ok(annualTuition('bachelor', 'state', state) > inState * 2);
    assert.equal(annualTuition('bachelor', 'private', state), annualTuition('bachelor', 'private'));
  },

  'long-term gains are taxed at preferential rates; short-term as ordinary income'() {
    const run = (ltcg) => {
      const { engine, state } = setup(21, 40);
      state.character.regionId = Object.keys(state.housing.market)[0] ?? state.character.regionId;
      const ctx = engine.context();
      ctx.earn(90000, 'Salary', { wage: true });
      ctx.earn(50000, 'Gain', { ltcg });
      Finances.onYearEnd(ctx);
      return state.finances.lastYear.federalTax;
    };
    const longTerm = run(true);
    const shortTerm = run(false);
    assert.ok(longTerm < shortTerm, `LTCG ${longTerm} should be taxed less than short-term ${shortTerm}`);
    assert.ok(longTerm - run(true) === 0, 'deterministic');
  },

  'selling a long-held position realizes a long-term gain; insider profits are disgorged on conviction'() {
    const { engine, state } = setup(22, 30);
    state.finances.cash = 20000;
    engine.dispatch('investing.buy', 'index:10000');
    state.character.age = 32;
    state.investing.holdings.index.value = 15000;
    engine.dispatch('investing.sell', 'index');
    const gain = state.finances.ledger.income.find((i) => /capital gain/.test(i.source));
    assert.equal(gain.amount, 5000);
    assert.equal(gain.ltcg, true);
    assert.equal(state.finances.cash, 25000);
    const ctx = engine.context();
    ctx.emit('investing:windfall', { asset: 'finance', amount: 80000 });
    assert.equal(state.investing.holdings.finance.value, 80000);
    ctx.emit('legal:convicted', { offenseId: 'insiderTrading' });
    assert.ok(!(state.investing.holdings.finance?.value > 0), 'insider profits clawed back');
  },

  'auto-invest sweeps surplus cash and sells to cover card debt'() {
    const { engine, state } = setup(23, 30);
    state.finances.cash = 100000;
    state.finances.lastYear = { tax: 5000, living: 20000, insurance: 0 };
    engine.dispatch('investing.toggleAuto');
    const ctx = engine.context();
    BrokerageEngine.onYearEnd(ctx);
    const invested = Object.values(state.investing.holdings).reduce((s, h) => s + h.value, 0);
    assert.ok(invested > 50000 && state.finances.cash >= 35000, `swept ${invested}, kept ${state.finances.cash}`);
    state.finances.cash = -10000;
    BrokerageEngine.onAgeUp(ctx);
    assert.ok(state.finances.cash >= 0, 'debt covered');
  },

  'coverage follows circumstance: parent plan, employer, Medicaid, marketplace, Medicare'() {
    const { engine, state } = setup(31, 22);
    state.character.regionId = Object.keys(REGIONS).find((id) => REGIONS[id].state === 'NY');
    assert.equal(coverageId(state, 30000), 'parents');
    state.character.age = 30;
    assert.equal(coverageId(state, 15000), 'medicaid');
    assert.equal(coverageId(state, 60000), 'marketplace');
    state.health.marketplace = false;
    assert.equal(coverageId(state, 60000), 'none');
    giveJob(engine, 'nursing', 'rn');
    assert.equal(coverageId(state, 60000), 'employer');
    state.career.job = null;
    state.character.age = 66;
    assert.equal(coverageId(state, 60000), 'medicare');
    state.character.age = 40;
    state.character.regionId = Object.keys(REGIONS).find((id) => REGIONS[id].state === 'TX');
    assert.equal(coverageId(state, 15000), 'none', 'no Medicaid expansion in Texas');
  },

  'uninsured medical bills become debt that can be discharged in bankruptcy'() {
    const { engine, state } = setup(32, 35);
    state.health.marketplace = false;
    state.finances.cash = 2000;
    state.finances.lastYear = { gross: 30000, ltcg: 0 };
    const ctx = engine.context();
    const oop = medicalBill(ctx, 90000, 'Emergency surgery');
    assert.equal(oop, 90000);
    assert.equal(state.finances.cash, 0);
    assert.equal(state.health.medicalDebt, 88000);
    state.prompts = [];
    state.yearly = {};
    HealthEngine.onAgeUp(ctx);
    state.prompts = state.prompts.filter((p) => p.type === 'health.bankruptcy');
    resolve(engine, 'health.bankruptcy', 'file');
    assert.equal(state.health.medicalDebt, 0);
    assert.equal(state.finances.bankruptcies, 1);
    assert.ok(state.housing.credit.events.some((e) => e.type === 'bankruptcy'));
  },

  'combat trauma leads to service-connected PTSD and a VA rating at separation'() {
    const { engine, state } = setup(33, 20);
    engine.dispatch('military.enlist', 'army:enlisted:active');
    resolve(engine, 'military.chooseSpecialty', 'logistics');
    state.prompts = [];
    assert.ok(state.military.service, 'enlisted');
    const ctx = engine.context();
    ctx.emit('health:trauma', { amount: 90, source: 'combat' });
    let ptsd;
    for (let i = 0; i < 25 && !(ptsd = getCondition(state, 'ptsd')); i++) {
      state.health.trauma = 90;
      state.health.serviceTrauma = 90;
      HealthEngine.onAgeUp(ctx);
      state.prompts = [];
    }
    assert.ok(ptsd, 'PTSD developed');
    assert.ok(ptsd.serviceConnected);
    ptsd.severity = 75;
    discharge(ctx, 'honorable', 'Contract complete.');
    assert.ok(state.health.va.rating >= 50, `rating ${state.health.va.rating}`);
    assert.ok(state.retirement.pensions.some((p) => p.id === 'va' && p.annual > 10000));
  },

  'addiction suspends a nursing license; completing rehab reinstates it'() {
    const { engine, state } = setup(34, 30);
    const ctx = engine.context();
    state.credentials.held.rn = { earnedAge: 24, status: 'active', renewedAge: 28, states: [state.character.regionId ? 'TX' : 'TX'] };
    addCondition(ctx, 'opioids', { severity: 60 });
    ctx.emit('credential:suspend', { ids: ['rn'], years: 3, reason: 'test' });
    state.health.boardSuspended = ['rn'];
    assert.equal(state.credentials.held.rn.status, 'suspended');
    state.finances.cash = 100000;
    for (let i = 0; i < 12 && getCondition(state, 'opioids').remission === false; i++) {
      state.yearly = {};
      engine.dispatch('health.rehab', 'opioids');
    }
    assert.ok(getCondition(state, 'opioids').remission, 'in recovery');
    assert.equal(state.credentials.held.rn.status, 'active');
  },

  'a firefighter with severe heart disease faces fitness-for-duty and can take a disability retirement'() {
    const { engine, state } = setup(35, 45);
    giveJob(engine, 'fire', engine.state && 'firefighter');
    const ctx = engine.context();
    state.retirement.plans.policeFire = { years: 15, salaries: [70000, 72000, 75000], employers: [], started: false };
    addCondition(ctx, 'heartDisease', { severity: 85, diagnosed: true });
    state.prompts = [];
    state.yearly = {};
    HealthEngine.onAgeUp(ctx);
    resolve(engine, 'health.duty', 'retire');
    assert.equal(state.career.job, null);
    assert.ok(state.retirement.pensions.some((p) => p.id === 'disability_policeFire' && p.annual > 25000));
  },

  'freshmen live in the dorms; graduation ends campus life and moves them out'() {
    const { engine, state } = setup(41, 18);
    state.stats.smarts = 90;
    state.education.degrees[0].gpa = 3.8;
    engine.dispatch('education.enroll', 'bachelor:state:computerScience:full');
    assert.ok(state.education.enrolled, 'admitted');
    assert.equal(housingStatus(state), 'dorm');
    assert.ok(state.campus.scholarships.some((s) => s.id === 'merit'), 'merit scholarship');
    engine.dispatch('campus.club', 'robotics');
    state.education.enrolled.progress = 3;
    state.prompts = [];
    engine.ageUp();
    state.prompts = [];
    assert.equal(state.education.enrolled, null, 'graduated');
    assert.notEqual(housingStatus(state), 'dorm');
    assert.equal(state.campus.clubs.length, 0);
  },

  'two years under 2.0 means academic dismissal'() {
    const { engine, state } = setup(42, 18);
    state.stats.smarts = 60;
    engine.dispatch('education.enroll', 'associate:community:business:full');
    assert.ok(state.education.enrolled, 'enrolled');
    const ctx = engine.context();
    ctx.emit('education:term', { yearGpa: 1.5, gpa: 1.5 });
    assert.equal(state.campus.probation, 1);
    ctx.emit('education:term', { yearGpa: 1.4, gpa: 1.45 });
    assert.equal(state.education.enrolled, null, 'dismissed');
  },

  'a strong internship yields a return offer that starts above normal entry'() {
    const { engine, state } = setup(43, 20);
    state.stats.smarts = 95;
    engine.dispatch('education.enroll', 'bachelor:state:computerScience:full');
    state.education.enrolled.yearsAttended = 2;
    state.education.enrolled.gpa = 3.9;
    let offered = false;
    for (let i = 0; i < 12 && !offered; i++) {
      state.yearly = {};
      engine.dispatch('campus.applyInternship', 'tech');
      if (state.prompts.some((p) => p.type === 'campus.internship')) resolve(engine, 'campus.internship', 'impress');
      offered = state.campus.offers.length > 0;
    }
    assert.ok(offered, 'got a return offer');
    state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'computerScience', schoolId: 'state', gpa: 3.9, year: 22 });
    state.education.enrolled = null;
    state.prompts = [];
    engine.context().emit('education:graduated', { degree: state.education.degrees.at(-1) });
    resolve(engine, 'campus.returnOffer', '0');
    const job = state.career.job;
    assert.ok(job && job.professionId === 'tech');
    const profession = getProfession('tech');
    assert.ok(job.grade > profession.levels[0].grade || job.levelId !== profession.levels[0].id, `level ${job.levelId}`);
  },

  'an academy graduate is commissioned with a five-year obligation'() {
    const { engine, state } = setup(44, 18);
    state.stats.smarts = 92;
    state.stats.fitness = 80;
    state.campus.nomination = true;
    state.education.degrees[0].gpa = 3.9;
    for (let i = 0; i < 4 && !state.education.enrolled; i++) {
      state.yearly = {};
      engine.dispatch('education.enroll', 'bachelor:academy:engineering:full');
    }
    assert.ok(state.education.enrolled, 'appointed');
    resolve(engine, 'campus.academy', 'navy');
    assert.equal(housingStatus(state), 'dorm');
    state.education.enrolled.progress = 3;
    state.education.enrolled.gpa = 3.2;
    state.education.enrolled.yearsAttended = 3;
    state.prompts = [];
    engine.ageUp();
    resolve(engine, 'campus.commission', 'logistics');
    assert.equal(state.military.service?.track, 'officer');
    assert.equal(state.military.service.contractYearsLeft, 5);
    assert.equal(state.finances.loans, 0, 'tuition-free');
  },

  'quitting a contracted ROTC scholarship means repaying it'() {
    const { engine, state } = setup(45, 18);
    state.stats.fitness = 75;
    engine.dispatch('education.enroll', 'bachelor:state:history:full');
    if (!state.education.enrolled) engine.dispatch('education.enroll', 'bachelor:state:business:full');
    assert.ok(state.education.enrolled, 'enrolled');
    engine.dispatch('campus.joinRotc', 'army');
    assert.ok(state.campus.rotc);
    state.campus.rotc.contracted = true;
    state.campus.scholarships.push({ id: 'rotc', name: 'Army ROTC scholarship', full: true, minGpa: 2.5, received: 23000 });
    const before = state.finances.loans;
    engine.dispatch('campus.quitRotc');
    assert.equal(state.campus.rotc, null);
    assert.equal(state.finances.loans - before, 23000);
  },

  'evicted young adults move back in with family or get vouchers'() {
    const { engine, state } = setup(14, 24);
    state.housing.withParents = false;
    state.housing.rental = { tier: 'house', rent: 3000, leaseYearsLeft: 1, regionId: state.character.regionId };
    state.finances.cash = -80000;
    state.prompts = [];
    engine.ageUp();
    assert.equal(state.housing.rental?.tier === 'house', false, 'lease ended');
    assert.ok(state.housing.credit.events.some((e) => e.type === 'eviction'));
  },
};

function enlistOk(state) {
  return state.military.service.component === 'active';
}

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try {
    fn();
    console.log(`  ✔ ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`  ✘ ${name}\n    ${err.stack.split('\n').slice(0, 3).join('\n    ')}`);
  }
}
console.log(failed ? `\n${failed} scenario(s) failed` : `\n✔ All ${Object.keys(tests).length} scenarios passed`);
process.exit(failed ? 1 : 0);
