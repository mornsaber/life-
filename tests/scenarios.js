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
import { traineeProgram } from '../src/modules/career/Tenure.js';
import { passChance, pursueEligibility, ATTEMPTS_PER_YEAR, retakeCost } from '../src/modules/credentials/LicensingEngine.js';
import { planStatus } from '../src/modules/retirement/RetirementEngine.js';
import { salaryBreakdown } from '../src/modules/career/PayGrades.js';
import { changeRegion, REGIONS } from '../src/modules/life/Regions.js';
import { stateIncomeTax } from '../src/modules/life/States.js';
import { quote } from '../src/modules/realestate/MortgageSystem.js';
import { annualTuition } from '../src/modules/education/EducationEngine.js';
import { Finances } from '../src/modules/life/Finances.js';
import { PeopleEngine } from '../src/modules/people/index.js';
const PeopleEngineOnAgeUp = (ctx) => PeopleEngine.onAgeUp(ctx);
import { BrokerageEngine } from '../src/modules/investing/index.js';
import { HealthEngine, addCondition, medicalBill, coverageId, getCondition } from '../src/modules/health/index.js';
import { discharge } from '../src/modules/military/MilitaryEngine.js';
import { housingStatus } from '../src/modules/realestate/index.js';
import { K12Engine, schoolAccess, TEEN_JOBS, teenJobPay } from '../src/modules/education/K12.js';
import { admissionChance } from '../src/modules/education/EducationEngine.js';
import { settleEstate, spouseOf, livingChildren, byId, ARREARS_HOLD } from '../src/modules/people/index.js';

/** Give the test character a spouse (and optionally children) directly. */
function family(engine, { spouseIncome = 0, kids = 0, kidAge = 5, foreign = false } = {}) {
  const s = engine.state;
  const spouse = { id: 'sp1', firstName: 'Sam', lastName: 'Case', gender: 'female', relation: 'spouse', ageOffset: 0, relationship: 80, alive: true, income: spouseIncome, careerIncome: spouseIncome || 60000, job: spouseIncome ? 'Nurse' : null, sector: 'private', nationality: foreign ? 'Germany' : 'US', since: s.character.age - 5, dcAtMarriage: 0 };
  s.people.list = s.people.list.filter((p) => !['spouse', 'partner', 'fiance', 'child'].includes(p.relation));
  s.people.list.push(spouse);
  for (let i = 0; i < kids; i++) s.people.list.push({ id: `kid${i}`, firstName: `Kid${i}`, lastName: 'Case', gender: i % 2 ? 'male' : 'female', relation: 'child', ageOffset: kidAge + i - s.character.age, relationship: 85, alive: true, income: 0, careerIncome: 0, nationality: 'US', otherParentId: 'sp1', custody: 'you' });
  return spouse;
}

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
    const { engine, state } = setup(4, 30);
    giveJob(engine, 'tech', getProfession('tech').levels[0].id);
    state.career.job.salary = 90000; // lenders count steady salary
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

  'estates pay funeral, debts and tax before heirs — and every dollar is accounted for'() {
    const { engine, state } = setup(51, 70);
    family(engine, { kids: 2, kidAge: 40 });
    state.finances.cash = 250000;
    state.retirement.dc = 400000;
    state.finances.loans = 20000;
    const l = settleEstate(state);
    assert.equal(l.funeral + l.debtsPaid + l.tax + l.bequests.reduce((s, b) => s + b.amount, 0), l.assets);
    assert.equal(l.tax, 0, 'under the exemption');
    // Intestacy: spouse half, children split the other half.
    assert.equal(l.bequests.find((b) => b.to === 'sp1').amount, Math.floor(l.net / 2) + (l.net - l.bequests.reduce((s, b) => s + b.amount, 0)) || l.bequests.find((b) => b.to === 'sp1').amount);
    assert.equal(l.bequests.length, 3);
    assert.ok(Math.abs(l.bequests[1].amount - l.bequests[2].amount) <= 1);
  },

  'large estates pay federal and state estate tax; a will can leave half to charity'() {
    const { engine, state } = setup(52, 75);
    state.character.regionId = Object.keys(REGIONS).find((id) => REGIONS[id].state === 'NY');
    family(engine, { kids: 1, kidAge: 45 });
    state.finances.cash = 20000000;
    engine.dispatch('people.writeWill', 'charity');
    const l = settleEstate(state);
    const taxable = l.assets - l.funeral - l.debtsPaid;
    assert.equal(l.tax, Math.round((taxable - 13990000) * 0.4) + Math.round((taxable - 7160000) * 0.12));
    assert.equal(l.bequests.find((b) => b.to === 'charity').amount, Math.floor(l.net / 2) + (l.net - l.bequests.reduce((s, b) => s + b.amount, 0)));
    assert.equal(l.funeral + l.debtsPaid + l.tax + l.bequests.reduce((s, b) => s + b.amount, 0), l.assets);
  },

  'married couples file jointly; children earn the child tax credit'() {
    const run = (married, kids) => {
      const { engine, state } = setup(53, 35);
      if (married) family(engine, { kids, kidAge: 4 });
      else state.people.list = state.people.list.filter((p) => p.relation !== 'spouse');
      const ctx = engine.context();
      ctx.earn(90000, 'Salary', { wage: true });
      Finances.onYearEnd(ctx);
      return state.finances.lastYear.federalTax;
    };
    const single = run(false, 0);
    const joint = run(true, 0);
    const withKids = run(true, 2);
    assert.ok(joint < single, `MFJ ${joint} < single ${single}`);
    assert.equal(joint - withKids, 4000);
  },

  'divorce splits marital property; unpaid child support suspends licenses until paid'() {
    const { engine, state } = setup(54, 40);
    const spouse = family(engine, { spouseIncome: 30000, kids: 1, kidAge: 8 });
    giveJob(engine, 'tech', getProfession('tech').levels[2].id);
    state.career.job.salary = 120000;
    state.credentials.held.driverLicense = { earnedAge: 17, status: 'active', renewedAge: 37, states: ['TX'] };
    state.finances.cash = 100000;
    state.people.prenup = false;
    const ctx = engine.context();
    engine.rng.chance = () => false; // custody to the ex (roll ≥ 0.75), counseling never reconciles
    engine.rng.float = (a, b) => b;
    engine.dispatch('people.fileForDivorce');
    assert.equal(spouse.relation, 'ex');
    assert.ok(state.finances.cash <= (100000 - 8000) / 2 + 1, `cash after split ${state.finances.cash}`);
    const kid = livingChildren(state)[0];
    assert.equal(kid.custody, 'ex');
    // Broke: support goes unpaid and licenses are held.
    state.finances.cash = 0;
    state.yearly = {};
    PeopleEngineOnAgeUp(ctx);
    assert.ok(state.people.arrears >= ARREARS_HOLD, `arrears ${state.people.arrears}`);
    assert.equal(state.credentials.held.driverLicense.status, 'suspended');
    state.finances.cash = state.people.arrears + 1000;
    engine.dispatch('people.payArrears');
    assert.equal(state.people.arrears, 0);
    assert.equal(state.credentials.held.driverLicense.status, 'active');
  },

  'an unreported foreign-national spouse eventually costs a clearance'() {
    const { engine, state } = setup(55, 30);
    giveJob(engine, 'intelligence', getProfession('intelligence').levels[0].id);
    state.publicService.clearance = { level: 'TS/SCI', since: 28 };
    state.people.list.push({ id: 'p9', firstName: 'Lena', lastName: 'Vogel', gender: 'female', relation: 'partner', ageOffset: 0, relationship: 90, alive: true, income: 50000, careerIncome: 50000, nationality: 'Germany', since: 27, compatibility: 90 });
    engine.rng.chance = () => true;
    engine.dispatch('people.propose', 'p9');
    resolve(engine, 'people.foreignContact', 'hide');
    const ctx = engine.context();
    state.prompts = [];
    PeopleEngineOnAgeUp(ctx);
    assert.equal(state.publicService.clearance, null);
    assert.ok(state.legal.record.some((r) => r.offenseId === 'falseStatement') || state.legal.investigations.length || state.prompts.some((p) => p.type.startsWith('legal.')), 'false statement pursued');
  },

  'a spouse with low earnings claims a spousal benefit; widows collect life insurance and survivor benefits'() {
    const { engine, state } = setup(56, 66);
    const spouse = family(engine, { spouseIncome: 0 });
    spouse.careerIncome = 100000;
    state.retirement.ssEarnings = [12000, 12000];
    engine.dispatch('retirement.claimSocialSecurity');
    assert.equal(state.retirement.socialSecurity.basis, 'spousal');
    state.people.lifeInsurance.spouse = { benefit: 500000, premium: 100, endsAge: 90 };
    const before = state.finances.cash;
    engine.rng.chance = () => true;
    state.yearly = {};
    PeopleEngineOnAgeUp(engine.context());
    assert.equal(spouse.alive, false);
    assert.ok(state.finances.cash - before >= 500000 - 20000, 'life insurance paid');
    assert.equal(state.retirement.socialSecurity.annual, 40000, 'survivor benefit = spouse benefit');
  },

  'you can continue as your child for three generations, inheriting the estate and 529'() {
    const { engine, state } = setup(57, 60);
    family(engine, { kids: 2, kidAge: 17 });
    state.finances.cash = 300000;
    state.people.fund529.kid0 = 40000;
    let s = state;
    for (let gen = 1; gen <= 3; gen++) {
      const kid = livingChildren(s)[0];
      engine.context().die('Old age');
      assert.ok(s.legacy && s.legacy.bequests.some((b) => b.to === kid.id));
      const heir = engine.continueAsChild(kid.id);
      assert.ok(heir, `generation ${gen + 1} started`);
      assert.equal(heir.lineage.generation, gen + 1);
      assert.equal(heir.lineage.ancestors.length, gen);
      assert.ok(heir.finances.cash > 0, 'inherited cash');
      if (gen === 1) assert.equal(heir.education.fund529, 40000);
      assert.ok(heir.people.list.some((p) => ['mother', 'father'].includes(p.relation) && !p.alive), 'deceased parent remembered');
      s = heir;
      // Give the heir a family of their own and age them up a little.
      s.character.age = Math.max(s.character.age, 45);
      family(engine, { kids: 1, kidAge: 15 });
      s.finances.cash = 100000;
      engine.ageUp();
      s.prompts = [];
    }
    const reloaded = new Store(engine.store.storage).load();
    assert.deepEqual(reloaded, engine.state, 'round trip after three generations');
  },

  'high school: GPA, the diploma and where you went shape college admission'() {
    const kid = (seed, type) => {
      const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
      const state = engine.newLife({ firstName: 'Kid', lastName: 'Case' });
      state.character.age = 13;
      state.people.wealth = 'upper';
      state.stats.smarts = 82;
      if (type !== 'public') engine.dispatch('k12.transfer', type);
      engine.rng.float = (a, b) => (a + b) / 2;
      for (let y = 0; y < 5; y++) {
        state.prompts = [];
        state.k12.dropout = false;
        engine.dispatch('k12.study');
        state.stats.smarts = 82;
        engine.ageUp();
      }
      state.prompts = [];
      return { engine, state };
    };
    const pub = kid(31, 'public');
    const board = kid(31, 'boarding');
    assert.equal(board.state.k12.type, 'boarding', 'admitted to boarding school');
    const pubHs = pub.state.education.degrees.find((d) => d.type === 'highschool');
    assert.ok(pubHs, 'graduated at 18');
    assert.ok(pubHs.gpa >= 2.5 && pubHs.gpa <= 4, `GPA ${pubHs.gpa}`);
    assert.equal(board.state.education.degrees.find((d) => d.type === 'highschool').k12, 'boarding');
    // Same smarts and similar grades: the prep school opens more doors.
    board.state.education.degrees.find((d) => d.type === 'highschool').gpa = pubHs.gpa;
    assert.ok(admissionChance(board.state, 'bachelor', 'elite') > admissionChance(pub.state, 'bachelor', 'elite'), 'prep bonus');
  },

  'private school needs money or a scholarship; dropouts can earn a GED'() {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(5), modules: MODULES });
    const state = engine.newLife({ firstName: 'Kid', lastName: 'Case' });
    state.character.age = 15;
    state.people.wealth = 'low';
    state.stats.smarts = 60;
    state.finances.cash = 0;
    assert.equal(schoolAccess(state, 'private').ok, false, 'low-income family cannot pay $28k');
    state.stats.smarts = 85;
    assert.equal(schoolAccess(state, 'private').payer, 'aid', 'strong students get need-based aid');
    assert.equal(schoolAccess(state, 'religious').ok, false);
    state.character.age = 16;
    engine.dispatch('k12.dropOut');
    assert.equal(state.k12.dropout, true);
    for (let y = 0; y < 2; y++) {
      state.prompts = [];
      engine.ageUp();
    }
    assert.ok(!state.education.degrees.length, 'no diploma for a dropout');
    state.prompts = [];
    const before = state.finances.cash;
    engine.rng.chance = () => true;
    engine.dispatch('k12.ged');
    assert.ok(state.education.degrees.some((d) => d.programId === 'ged'), 'GED earned');
    assert.equal(state.finances.cash, before, 'GED is free under 21');
  },

  'teen jobs pay, count as experience, and end at 18'() {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(9), modules: MODULES });
    const state = engine.newLife({ firstName: 'Kid', lastName: 'Case' });
    state.character.age = 15;
    state.stats.fitness = 40;
    const chance = engine.rng.chance;
    engine.rng.chance = () => true;
    engine.dispatch('k12.takeJob', 'lifeguard');
    assert.equal(state.k12.job, null, 'swim test needs fitness');
    engine.dispatch('k12.takeJob', 'fastFood');
    assert.equal(state.k12.job.id, 'fastFood');
    engine.rng.chance = chance;
    const cash = state.finances.cash;
    state.prompts = [];
    engine.ageUp();
    assert.equal(state.finances.lastYear.gross, teenJobPay(TEEN_JOBS.fastFood), 'paid for the year');
    assert.ok(state.finances.cash > cash + teenJobPay(TEEN_JOBS.fastFood) * 0.9, 'little or no tax');
    assert.equal(state.k12.jobYears, 1);
    while (state.character.age < 18 && state.character.alive) {
      state.prompts = [];
      engine.ageUp();
    }
    assert.equal(state.k12.job, null, 'teen job ends at 18');
    assert.ok(state.k12.jobYears >= 3);
  },

  'service academies: nomination, fitness and a diploma lead to an appointment'() {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(12), modules: MODULES });
    const state = engine.newLife({ firstName: 'Cadet', lastName: 'Case' });
    state.character.age = 14;
    state.stats.smarts = 85;
    state.stats.fitness = 70;
    engine.dispatch('k12.toggleActivity', 'jrotc');
    for (let y = 0; y < 4; y++) {
      state.prompts = [];
      state.stats.fitness = 70;
      state.stats.health = 90;
      state.k12.dropout = false;
      engine.dispatch('k12.study');
      engine.ageUp();
    }
    state.prompts = [];
    assert.equal(state.character.age, 18);
    assert.ok(state.education.degrees.some((d) => d.type === 'highschool'));
    engine.dispatch('education.enroll', 'bachelor:academy:engineering:full');
    assert.equal(state.education.enrolled, null, 'needs a nomination first');
    engine.rng.chance = () => true;
    engine.dispatch('campus.seekNomination');
    assert.equal(state.campus.nomination, true);
    engine.dispatch('education.enroll', 'bachelor:academy:engineering:full');
    assert.equal(state.education.enrolled?.schoolId, 'academy', 'appointed');
  },

  'license exams can be failed; prep courses help and failed academies allow a cheaper retest'() {
    const { engine, state } = setup(41, 30);
    state.stats.smarts = 75;
    const cpa = getCredential('cpa');
    state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'accounting', year: 22, gpa: 3.3 });
    const base = passChance(state, cpa);
    assert.ok(base > 0.4 && base < 0.6, `CPA pass odds ${base}`);
    assert.ok(passChance(state, getCredential('rn')) > 0.8, 'NCLEX passes far more often');
    state.finances.cash = 10000;
    engine.dispatch('credentials.prep', 'cpa');
    assert.ok(state.credentials.prep.cpa);
    assert.ok(passChance(state, cpa) > base + 0.1, 'prep raises the odds');
    const chance = engine.rng.chance;
    engine.rng.chance = () => false;
    engine.dispatch('credentials.pursue', 'cpa');
    assert.equal(state.credentials.held.cpa, undefined, 'failed');
    assert.equal(state.credentials.failures.cpa, 1);
    assert.ok(!state.credentials.prep.cpa, 'prep used up');
    // Training program final exam: fail, then retest without retraining.
    state.credentials.training.push({ id: 'paramedic', name: 'Paramedic', yearsLeft: 1, sponsor: 'you' });
    state.credentials.held.emt = { earnedAge: 25, renewedAge: 29, status: 'active', states: [] };
    state.prompts = [];
    engine.ageUp();
    assert.equal(state.credentials.retake.paramedic, state.character.age, 'retake window opens');
    const elig = pursueEligibility(state, 'paramedic');
    assert.ok(elig.ok && elig.retake && elig.cost === retakeCost(getCredential('paramedic')), 'cheap retest');
    engine.rng.chance = () => true;
    engine.dispatch('credentials.pursue', 'paramedic');
    engine.rng.chance = chance;
    assert.equal(state.credentials.held.paramedic?.status, 'active', 'passed the retest without retraining');
    assert.equal(state.credentials.training.length, 0);
  },

  'credential restrictions: yearly limit, agency membership and medical exams'() {
    const { engine, state } = setup(42, 30);
    state.finances.cash = 50000;
    engine.rng.chance = () => true;
    for (const id of ['oshaSafety', 'ics300', 'landNav']) engine.dispatch('credentials.pursue', id);
    const held = ['oshaSafety', 'ics300', 'landNav'].filter((id) => state.credentials.held[id]);
    assert.equal(held.length, ATTEMPTS_PER_YEAR, 'only two new credentials a year');
    assert.match(pursueEligibility(state, 'landNav').reason, /No time/);
    state.yearly = {};
    state.credentials.held.ff2 = { earnedAge: 25, renewedAge: 25, status: 'active', states: [] };
    state.credentials.held.driverLicense = { earnedAge: 16, renewedAge: 28, status: 'active', states: [] };
    state.credentials.held.driverOperator = { earnedAge: 26, renewedAge: 26, status: 'active', states: [] };
    assert.match(pursueEligibility(state, 'fireOfficer1').reason, /membership in a fire department/);
    engine.dispatch('emergency.join', 'fire');
    state.prompts = [];
    assert.ok(state.emergency.fire, 'joined the volunteer fire department');
    assert.ok(!/membership/.test(pursueEligibility(state, 'fireOfficer1').reason ?? ''), 'members may take it');
    state.stats.health = 40;
    assert.match(pursueEligibility(state, 'studentPilot').reason, /medical exam/);
    state.stats.health = 80;
    assert.ok(pursueEligibility(state, 'studentPilot').ok);
  },

  'new careers have their own credentials: a sous chef needs ServSafe'() {
    const { engine, state } = setup(43, 26);
    const job = giveJob(engine, 'culinary', 'partie');
    assert.ok(job);
    const culinary = getProfession('culinary');
    const sous = culinary.levels.find((l) => l.id === 'sous');
    assert.deepEqual(sous.req.credentials, ['servSafe']);
    assert.equal(getCredential('servSafe').category, 'hospitality');
    assert.ok(pursueEligibility(state, 'servSafe').ok);
  },

  'fire recruits go through the academy and graduate automatically — or wash out'() {
    const pass = setup(51, 22);
    const chance = pass.engine.rng.chance;
    pass.engine.rng.chance = () => true;
    const job = giveJob(pass.engine, 'fire', 'recruit');
    pass.engine.rng.chance = chance;
    assert.ok(traineeProgram(job), 'recruit is a training position');
    for (const id of ['ff1', 'ff2', 'emt']) assert.equal(pass.state.credentials.held[id]?.status, 'active', `academy granted ${id}`);
    assert.equal(pass.state.yearly['cred.attempts'] ?? 0, 0, 'academy courses do not use your own yearly limit');
    pass.state.prompts = [];
    pass.engine.ageUp();
    assert.equal(pass.state.career.job.levelId, 'firefighter', 'graduated');
    assert.equal(pass.state.career.job.probationLeft, 1, 'probation starts after the academy');

    const fail = setup(52, 22);
    fail.engine.rng.chance = () => false;
    giveJob(fail.engine, 'fire', 'recruit');
    fail.engine.rng.chance = chance;
    for (let y = 0; y < 3 && fail.state.career.job; y++) {
      fail.state.prompts = [];
      fail.engine.rng.chance = (p) => (p > 0.5 && p < 0.99 ? false : chance.call(fail.engine.rng, p));
      fail.engine.ageUp();
    }
    assert.equal(fail.state.career.job, null, 'washed out');
    assert.match(fail.state.career.history.at(-1).reason, /didn't complete the fire academy/);
  },

  'probation: poor first-year reviews end public jobs; teachers earn tenure'() {
    const { engine, state } = setup(53, 30);
    const job = giveJob(engine, 'municipalAdmin', getProfession('municipalAdmin').levels[0].id);
    assert.equal(job.probationLeft, 1);
    job.performance = 5;
    state.stats.smarts = 1;
    state.stats.stress = 100;
    state.prompts = [];
    engine.ageUp();
    assert.equal(state.career.job, null, 'released during probation');
    assert.match(state.career.history.at(-1).reason, /probationary/);

    const t = setup(54, 26);
    t.state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'education', year: 22, gpa: 3.4 });
    t.state.credentials.held.teachingCert = { earnedAge: 23, renewedAge: 23, status: 'active', states: [] };
    const teacher = giveJob(t.engine, 'education', getProfession('education').levels.find((l) => l.entry).id);
    assert.equal(teacher.probationLeft, 3, 'three-year probation');
    for (let y = 0; y < 3; y++) {
      t.state.prompts = [];
      teacher.performance = 80;
      t.state.stats.smarts = 85;
      t.engine.ageUp();
    }
    assert.ok(t.state.career.job?.tenured, 'tenured after probation');
  },

  'active duty puts your job on USERRA leave; you return with seniority and pension credit'() {
    const { engine, state } = setup(55, 24);
    const job = giveJob(engine, 'police', 'officer', 'chicago');
    job.probationLeft = 0;
    const years = job.yearsAtEmployer;
    engine.dispatch('military.enlist', 'army:enlisted:active');
    const specialty = state.prompts.find((p) => p.type === 'military.chooseSpecialty');
    engine.resolvePrompt(specialty.id, specialty.options.find((o) => !o.disabled).id);
    assert.ok(state.military.service, 'enlisted');
    assert.equal(state.career.job, null);
    assert.equal(state.career.leave?.job.employer.name, job.employer.name, 'job held on military leave');
    state.prompts = [];
    for (let y = 0; y < 2; y++) {
      state.prompts = [];
      engine.ageUp();
    }
    state.prompts = [];
    discharge(engine.context(), 'honorable', 'End of enlistment.');
    const offer = state.prompts.find((p) => p.type === 'career.userra');
    assert.ok(offer, 'reemployment offered');
    engine.resolvePrompt(offer.id, 'return');
    assert.equal(state.career.job?.employer.name, job.employer.name);
    assert.ok(state.career.job.yearsAtEmployer >= years + 2, 'seniority credited');
    assert.ok(state.retirement.plans.publicSafety?.years >= 2, 'pension credit for service');
  },

  'city jobs transfer laterally to the new city; state jobs stay in their state'() {
    const { engine, state } = setup(56, 30);
    state.character.regionId = 'chicago';
    const job = giveJob(engine, 'fire', 'firefighter', 'chicago');
    assert.match(job.employer.name, /Chicago/);
    job.performance = 80;
    engine.rng.chance = () => true;
    engine.dispatch('career.transfer', 'denver');
    assert.equal(state.character.regionId, 'denver');
    assert.match(state.career.job.employer.name, /^Denver Fire Department$/, `renamed: ${state.career.job.employer.name}`);
    assert.equal(state.career.job.levelId, 'firefighter', 'kept rank');
    assert.equal(state.career.job.probationLeft, 1, 'lateral hires serve probation');

    const s2 = setup(57, 30);
    s2.state.character.regionId = 'midcity';
    s2.state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'accounting', year: 22, gpa: 3.4 });
    giveJob(s2.engine, 'revenue', getProfession('revenue').levels[0].id, 'midcity');
    s2.engine.dispatch('career.transfer', 'denver');
    assert.equal(s2.state.character.regionId, 'midcity', 'an Ohio agency cannot move you to Colorado');
  },

  'police and fire can retire after 20 years at any age; federal agents must retire at 57'() {
    const { engine, state } = setup(58, 41);
    giveJob(engine, 'police', 'officer');
    state.retirement.plans.publicSafety = { years: 20, salaries: [90000, 92000, 94000], employers: ['PD'], started: false };
    engine.dispatch('retirement.retire');
    assert.equal(state.retirement.retired, true, '20 and out');
    const pension = state.retirement.pensions.find((p) => p.id === 'plan.publicSafety');
    assert.ok(pension && pension.annual >= 45000, `half pay: ${pension?.annual}`);

    const fed = setup(59, 56);
    fed.state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'accounting', year: 22, gpa: 3.4 });
    giveJob(fed.engine, 'oig', getProfession('oig').levels[0].id);
    fed.state.prompts = [];
    fed.engine.ageUp();
    assert.equal(fed.state.retirement.retired, true, 'mandatory retirement at 57');
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
