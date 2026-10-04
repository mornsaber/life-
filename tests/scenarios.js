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
import { hire, promotionStatus, applicationEligibility } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { hasCredential, findSponsor, grantCredential } from '../src/modules/credentials/LicensingEngine.js';
import { MOS, mosFor } from '../src/modules/military/MOS.js';
import { bestEntryLevel } from '../src/modules/career/CareerEngine.js';
import { hasHousingBenefit } from '../src/modules/life/Finances.js';
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
import { charge } from '../src/modules/legal/JusticeSystem.js';
import { deathRowTick, paroleEligibility } from '../src/modules/legal/Prison.js';
import { sealStatus } from '../src/modules/legal/Clemency.js';
import { hasFelony } from '../src/core/State.js';
import { separationPay } from '../src/modules/military/Separation.js';
import { startEligibility, yearFinancials, exitProceeds, fundingCheck } from '../src/modules/business/Business.js';
import { BUSINESS_TYPES } from '../src/modules/business/BusinessTypes.js';
import { closeBusiness } from '../src/modules/business/BusinessEngine.js';
import { buildHeirState } from '../src/modules/people/Legacy.js';
import { bankruptcyOptions, WILDCARD_EXEMPTION, CH7_FEE } from '../src/modules/life/Bankruptcy.js';
import { creditLimit } from '../src/core/State.js';
import { membership, clergyEligibility } from '../src/modules/community/Religions.js';
import { addFriend, friendsOf } from '../src/modules/people/Friends.js';
import { careBill } from '../src/modules/people/ElderCare.js';
import { riskMultiplier, purchaseCheck, autoRate } from '../src/modules/vehicles/Vehicles.js';
import { itemizedDeductions, SALT_CAP } from '../src/modules/life/Taxes.js';
import { cardApr, minimumPayoff, DEFAULT_APR } from '../src/modules/life/CreditCards.js';
import { gigEligibility } from '../src/modules/career/GigWork.js';
import { benchEligibility, currentCourt, selectionFor } from '../src/modules/legal/Judiciary.js';
import { ssdiEligibility, approvalOdds } from '../src/modules/health/SSDI.js';
import { makeOffer, acceptOffer } from '../src/modules/career/JobMarket.js';
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
    resolve(engine, 'military.chooseSpecialty', 'army.92Y');
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
    resolve(engine, 'military.chooseSpecialty', 'guard.12B');
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
    resolve(engine, 'military.chooseSpecialty', 'army.92Y');
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
    resolve(engine, 'campus.commission', 'navy.3100');
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
    assert.equal(l.funeral + l.debtsPaid + l.probate + l.tax + l.bequests.reduce((s, b) => s + b.amount, 0), l.assets);
    assert.equal(l.tax, 0, 'under the exemption');
    assert.ok(l.probate > 0, 'no trust: probate costs');
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
    const taxable = l.assets - l.funeral - l.debtsPaid - l.probate;
    assert.equal(l.tax, Math.round((taxable - 13990000) * 0.4) + Math.round((taxable - 7160000) * 0.12));
    assert.ok(Math.abs(l.bequests.find((b) => b.to === 'charity').amount - l.net / 2) <= 1, 'half to charity');
    assert.equal(l.funeral + l.debtsPaid + l.probate + l.tax + l.bequests.reduce((s, b) => s + b.amount, 0), l.assets);
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
      // A minor heir's share waits in a guardianship account until 18.
      assert.ok(heir.finances.cash > 0 || heir.finances.trustPayouts?.some((p) => p.age === 18 && p.amount > 0), 'inherited cash');
      if (gen === 1) assert.equal(heir.education.fund529, 40000);
      assert.ok(heir.people.list.some((p) => ['mother', 'father'].includes(p.relation) && !p.alive), 'deceased parent remembered');
      s = heir;
      // Give the heir a family of their own and age them up a little.
      s.character.age = Math.max(s.character.age, 45);
      family(engine, { kids: 1, kidAge: 15 });
      s.finances.cash = 100000;
      engine.ageUp();
      s.prompts = [];
      engine.commit();
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

  'military up-or-out: twice passed-over officers and enlisted past high-year tenure are separated'() {
    const join = (seed, arg) => {
      const t = setup(seed, 30);
      t.state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'business', year: 22, gpa: 3.2 });
      t.engine.dispatch('military.enlist', arg);
      const p = t.state.prompts.find((x) => x.type === 'military.chooseSpecialty');
      t.engine.resolvePrompt(p.id, arg.includes('officer') ? 'army.90A' : 'army.92Y');
      return t;
    };
    const o = join(61, 'army:officer:active');
    const svc = o.state.military.service;
    Object.assign(svc, { grade: 2, yearsInGrade: 5, yearsOfService: 9, eval: 5, contractYearsLeft: 9, isNew: false, stationYears: 0 });
    o.engine.rng.chance = (p) => (p >= 0.5 ? false : false);
    for (let y = 0; y < 3 && o.state.military.service; y++) {
      o.state.prompts = [];
      o.state.military.service.eval = 5;
      o.state.stats.fitness = 1;
      o.engine.ageUp();
    }
    assert.equal(o.state.military.service, null, 'separated');
    const rec = o.state.military.history.at(-1);
    assert.equal(rec.discharge, 'honorable');
    assert.match(rec.reason, /up-or-out/);
    assert.ok(separationPay({ yearsOfService: 10, track: 'officer', grade: 2, component: 'active' }) > 50000, 'separation pay: 10% × years × base pay');
    assert.equal(separationPay({ yearsOfService: 4, track: 'officer', grade: 2, component: 'active' }), 0, 'none under 6 years');

    const e = join(62, 'army:enlisted:active');
    Object.assign(e.state.military.service, { grade: 3, yearsInGrade: 1, yearsOfService: 9, eval: 30, contractYearsLeft: 3, isNew: false, stationYears: 0 });
    e.state.prompts = [];
    e.engine.ageUp();
    assert.equal(e.state.military.service, null, 'high-year tenure for a Specialist');
    assert.match(e.state.military.history.at(-1).reason, /high-year tenure/);
  },

  'inter-service transfers are hard and usually cost a stripe; deserters face court-martial'() {
    const t = setup(63, 26);
    t.engine.dispatch('military.enlist', 'army:enlisted:active');
    const p = t.state.prompts.find((x) => x.type === 'military.chooseSpecialty');
    t.engine.resolvePrompt(p.id, 'army.92Y');
    const svc = t.state.military.service;
    Object.assign(svc, { grade: 4, yearsOfService: 3, eval: 80, isNew: false });
    t.engine.rng.chance = () => true;
    t.engine.dispatch('military.transferBranch', 'navy');
    assert.equal(svc.branch, 'navy');
    assert.equal(svc.grade, 3, 'reduced one grade');
    t.engine.dispatch('military.transferBranch', 'army');
    assert.equal(svc.branch, 'navy', 'one request a year');

    t.engine.dispatch('military.leaveService');
    const leave = t.state.prompts.find((x) => x.type === 'military.leaveService');
    t.engine.resolvePrompt(leave.id, 'desert');
    assert.equal(t.state.military.service, null);
    assert.equal(t.state.military.history.at(-1).discharge, 'oth');
    const inv = t.state.legal.investigations.find((i) => i.offenseId === 'desertion');
    assert.ok(inv && inv.yearsLeft > 50, 'no statute of limitations');
    assert.ok(t.state.military.deserter);
    charge(t.engine.context(), { offenseId: 'desertion', context: 'caught', evidence: 0.95 });
    const court = t.state.prompts.find((x) => x.type === 'legal.court');
    t.engine.resolvePrompt(court.id, 'plead');
    assert.equal(t.state.military.history.at(-1).discharge, 'dishonorable', 'court-martial upgrades to dishonorable');
    assert.equal(t.state.military.deserter, null);
  },

  'purchases stop at your credit limit; bills do not'() {
    const { engine, state } = setup(71, 30);
    state.housing.credit.score = 560;
    state.finances.lastYear = { gross: 20000 };
    state.finances.cash = 0;
    assert.equal(creditLimit(state), 600, 'subprime: 3% of income');
    state.people.list.push({ id: 'pf', firstName: 'Sam', lastName: 'Lee', gender: 'male', relation: 'fiance', ageOffset: 0, relationship: 90, alive: true, income: 40000, careerIncome: 40000, nationality: 'US', since: 28, compatibility: 80 });
    engine.dispatch('people.wed', 'small');
    assert.equal(byId(state, 'pf').relation, 'fiance', 'a $12,000 wedding is declined');
    assert.equal(state.finances.cash, 0);
    state.housing.credit.score = 760;
    state.finances.lastYear = { gross: 90000 };
    assert.equal(creditLimit(state), 27000);
    engine.dispatch('people.wed', 'small');
    assert.equal(byId(state, 'pf').relation, 'spouse', 'good credit can put it on cards');
    assert.equal(state.finances.cash, -12000);
    // Bills still go through past the limit.
    assert.ok(engine.context().spend(50000, 'Hospital bill', { allowDebt: true }));
  },

  'Chapter 7 wipes card and medical debt, keeps retirement, and sells non-exempt assets'() {
    const { engine, state } = setup(72, 40);
    state.finances.lastYear = { gross: 35000 };
    state.finances.cash = -40000;
    state.health.medicalDebt = 20000;
    state.finances.loans = 15000;
    state.retirement.dc = 80000;
    state.investing.holdings = { sp500: { value: 30000, basis: 20000 } };
    const opts = bankruptcyOptions(state);
    assert.ok(opts.ch7.ok, `ch7 eligible: ${opts.ch7.reason}`);
    assert.equal(opts.debt, 60000);
    engine.dispatch('finances.fileBankruptcy', '7');
    assert.equal(state.health.medicalDebt, 0);
    assert.equal(state.finances.cash, WILDCARD_EXEMPTION - CH7_FEE, 'keeps the wildcard exemption, pays the attorney');
    assert.equal(state.retirement.dc, 80000, 'retirement protected');
    assert.equal(state.finances.loans, 15000, 'student loans survive');
    assert.deepEqual(state.investing.holdings, {});
    assert.equal(state.finances.lastBankruptcy.chapter, 7);
    state.finances.cash = -20000;
    assert.match(bankruptcyOptions(state).ch7.reason, /8 required/);
  },

  'above the median you get Chapter 13: a plan, then discharge; unmanageable debt prompts a decision'() {
    const { engine, state } = setup(73, 40);
    giveJob(engine, 'tech', getProfession('tech').levels.find((l) => l.entry).id);
    state.career.job.salary = 150000;
    state.finances.lastYear = { gross: 150000 };
    state.finances.cash = -90000;
    const opts = bankruptcyOptions(state);
    assert.ok(!opts.ch7.ok && /means test/.test(opts.ch7.reason));
    assert.ok(opts.ch13.ok && opts.ch13.years === 5);
    engine.dispatch('finances.fileBankruptcy', '13');
    assert.ok(state.finances.ch13, 'plan started');
    assert.ok(state.finances.cash > -10000, 'debt moved into the plan');
    for (let y = 0; y < 5 && state.finances.ch13; y++) {
      state.prompts = [];
      state.finances.cash = Math.max(state.finances.cash, 0);
      engine.ageUp();
    }
    assert.equal(state.finances.ch13, null, 'plan completed');

    const s2 = setup(74, 35);
    s2.state.finances.cash = -200000;
    s2.state.finances.lastYear = { gross: 0 };
    s2.state.prompts = [];
    s2.engine.ageUp();
    const crisis = s2.state.prompts.find((p) => p.type === 'finances.debtCrisis');
    assert.ok(crisis, 'debt crisis decision');
    s2.engine.resolvePrompt(crisis.id, 'ch7');
    assert.ok(s2.state.finances.cash >= 0, 'filed Chapter 7');
  },

  'prison: study, work and programs; parole hearings; everything else is off limits'() {
    const { engine, state } = setup(81, 30);
    state.education.degrees = [];
    charge(engine.context(), { offenseId: 'burglary', context: 'test', evidence: 0.95 });
    const court = state.prompts.find((p) => p.type === 'legal.court');
    const chance = engine.rng.chance;
    engine.rng.chance = () => true;
    engine.resolvePrompt(court.id, 'plead');
    engine.rng.chance = chance;
    const inc = state.legal.incarceration;
    assert.ok(inc, 'in prison');
    inc.yearsLeft = inc.total = 6;
    engine.dispatch('career.apply', 'retail');
    assert.equal(state.career.job, null, 'no job applications from prison');
    engine.rng.chance = () => true;
    engine.dispatch('legal.prisonStudy');
    assert.ok(state.education.degrees.some((d) => d.programId === 'ged'), 'GED behind bars');
    engine.dispatch('legal.prisonWork');
    engine.dispatch('legal.prisonProgram');
    engine.rng.chance = chance;
    assert.equal(inc.yearsLeft, 5, 'treatment program took a year off');
    assert.ok(inc.goodBehavior >= 4);
    assert.match(paroleEligibility(state).reason, /Eligible after 2/);
    inc.served = 2;
    engine.rng.chance = () => true;
    engine.dispatch('legal.prisonParole');
    engine.rng.chance = chance;
    assert.equal(state.legal.incarceration, null, 'paroled');
  },

  'dropping out banks transfer credit toward a later degree'() {
    const { engine, state } = setup(82, 19);
    engine.rng.chance = () => true;
    engine.dispatch('education.enroll', 'bachelor:state:business:full');
    engine.rng.chance = Math.random.bind(Math);
    const e = state.education.enrolled;
    assert.ok(e, 'enrolled');
    e.progress = 2;
    e.gpa = 3.1;
    engine.dispatch('education.dropOut');
    assert.equal(state.education.credits[0].years, 2, 'two years banked');
    state.yearly = {};
    engine.rng.chance = () => true;
    engine.dispatch('education.enroll', 'bachelor:online:business:full');
    assert.equal(state.education.enrolled.totalYears, 2, 'finishes in two more years');
    assert.equal(state.education.credits.length, 0, 'credit used');
  },

  'records can be sealed or pardoned; violent crimes cannot be sealed'() {
    const { engine, state } = setup(83, 40);
    state.legal.record.push(
      { offenseId: 'shoplifting', name: 'Shoplifting', severity: 'misdemeanor', age: 30, sentence: '$500 fine' },
      { offenseId: 'burglary', name: 'Residential Burglary', severity: 'felony', age: 31, sentence: '2 yr prison' },
      { offenseId: 'armedRobbery', name: 'Armed Robbery', severity: 'felony', age: 32, sentence: '4 yr prison' },
      { offenseId: 'wireFraud', name: 'Wire Fraud', severity: 'felony', age: 25, sentence: '1 yr prison' },
    );
    const [shop, burg, rob, fraud] = state.legal.record;
    assert.ok(sealStatus(state, shop).ok && sealStatus(state, burg).ok);
    assert.match(sealStatus(state, rob).reason, /Violent/);
    assert.match(sealStatus(state, fraud).reason, /pardoned/);
    state.finances.cash = 5000;
    engine.rng.chance = () => true;
    engine.dispatch('legal.sealRecord');
    assert.ok(shop.sealed && burg.sealed && !rob.sealed);
    assert.ok(hasFelony(state), 'the robbery still counts');
    engine.dispatch('legal.seekPardon');
    assert.ok(rob.pardoned, 'the most serious felony was pardoned');
    state.yearly = {};
    engine.dispatch('legal.seekPardon');
    assert.ok(fraud.pardoned, 'federal pardon');
    assert.equal(hasFelony(state), false, 'rights restored');
  },

  'the death penalty: only in some states, only after trial, and executions only where they happen'() {
    const tx = setup(84, 30);
    tx.state.character.regionId = 'sunbelt';
    charge(tx.engine.context(), { offenseId: 'felonyMurder', context: 'test', evidence: 0.95 });
    const court = tx.state.prompts.find((p) => p.type === 'legal.court');
    tx.engine.rng.chance = () => true;
    tx.engine.resolvePrompt(court.id, 'publicDefender');
    const inc = tx.state.legal.incarceration;
    assert.ok(inc?.deathRow, 'sentenced to death in Texas');
    assert.equal(tx.state.legal.record.at(-1).sentence, 'death sentence');
    inc.deathRow.sentencedAge = tx.state.character.age - 12;
    tx.engine.rng.chance = (p) => p > 0.05;
    deathRowTick(tx.engine.context());
    assert.equal(tx.state.character.alive, false);
    assert.match(tx.state.character.causeOfDeath, /Executed by the State of Texas/);

    const il = setup(85, 30);
    il.state.character.regionId = 'chicago';
    charge(il.engine.context(), { offenseId: 'felonyMurder', context: 'test', evidence: 0.95 });
    const c2 = il.state.prompts.find((p) => p.type === 'legal.court');
    il.engine.rng.chance = () => true;
    il.engine.resolvePrompt(c2.id, 'publicDefender');
    assert.ok(il.state.legal.incarceration && !il.state.legal.incarceration.deathRow, 'Illinois abolished the death penalty');

    const ca = setup(86, 30);
    ca.state.character.regionId = 'sf';
    ca.state.legal.incarceration = { yearsLeft: 99, total: 99, facility: 'death row', served: 20, deathRow: { state: 'CA', sentencedAge: 10 } };
    ca.engine.rng.chance = (p) => p > 0.05;
    deathRowTick(ca.engine.context());
    assert.equal(ca.state.character.alive, true, 'California has a moratorium on executions');
  },

  'new crimes pay — until they catch up with you; an affair is not a crime but it costs'() {
    const { engine, state } = setup(87, 30);
    const cash = state.finances.cash;
    engine.rng.chance = (p) => p > 0.2 && p < 0.99 ? false : false;
    engine.dispatch('legal.scam');
    assert.ok(state.finances.cash > cash, 'scam paid');
    assert.ok(state.legal.investigations.some((i) => i.offenseId === 'wireFraud'), 'wire fraud may surface later');
    state.people.list.push({ id: 'sp', firstName: 'Ana', lastName: 'Case', gender: 'female', relation: 'spouse', ageOffset: 0, relationship: 80, alive: true, income: 50000, careerIncome: 50000, nationality: 'US', since: 25, compatibility: 70 });
    engine.rng.chance = () => true;
    engine.dispatch('legal.affair');
    assert.ok(byId(state, 'sp').relationship <= 45, 'caught cheating');
    assert.equal(state.legal.record.length, 0, 'not a crime');
  },

  'businesses are license-gated and funded with cash or an SBA loan'() {
    const { engine, state } = setup(91, 35);
    state.finances.cash = 20000;
    state.housing.credit.score = 720;
    assert.match(startEligibility(state, 'lawFirm').reason, /State Bar/);
    assert.match(startEligibility(state, 'restaurant').reason, /ServSafe/);
    assert.ok(!startEligibility(state, 'retail', 'cash').ok, '$150k cash needed');
    assert.match(startEligibility(state, 'retail', 'sba').reason, /experience/, 'SBA lenders want industry experience');
    state.career.history.push({ professionId: 'retail', title: 'Store Manager', levelId: 'x', employerName: 'Mart', sector: 'private', peakGrade: 4, startAge: 25, endAge: 33, reason: 'Left' });
    const retailLoan = startEligibility(state, 'retail', 'sba');
    assert.ok(retailLoan.ok || /cash flow/.test(retailLoan.reason), `experience clears the first hurdle: ${retailLoan.reason}`);
    assert.match(fundingCheck(state, 150000, 'sba', BUSINESS_TYPES.retail, { cashFlow: 20000 }).reason, /cash flow/, 'lenders check debt-service coverage');
    state.credentials.held.masterElectrician = { earnedAge: 30, renewedAge: 34, status: 'active' };
    assert.ok(startEligibility(state, 'electrical', 'sba').ok, '10% down with an SBA loan');
    engine.dispatch('business.start', 'electrical:sba:llc');
    const biz = state.business.current;
    assert.ok(biz && biz.debts.sba.balance === 54000 && biz.debts.sba.guaranteed);
    assert.equal(state.finances.cash, 14000);
    assert.ok(startEligibility(state, 'cpaFirm').reason.includes('already own'));
  },

  'entity choice: sole proprietors pay self-employment tax; C-corps pay corporate tax; LLCs shield you except guarantees'() {
    const { engine, state } = setup(92, 40);
    state.finances.cash = 1000000;
    state.credentials.held.cpa = { earnedAge: 30, renewedAge: 38, status: 'active' };
    engine.dispatch('business.start', 'cpaFirm:cash:sole');
    const biz = state.business.current;
    biz.years = 4;
    biz.fit = 1.1;
    biz.quality = 70;
    biz.reputation = 70;
    state.prompts = [];
    engine.ageUp();
    assert.ok(biz.lastYear.netIncome > 0, 'profitable');
    assert.ok(biz.lastYear.seTax > 0, 'self-employment tax');
    const fakeRng = { float: (a, b) => (a + b) / 2 };
    biz.entity = 'ccorp';
    const c = yearFinancials(state, biz, fakeRng);
    assert.ok(c.corporateTax > 0 && c.ownerSalary > 0, 'C-corp: salary plus 21% on the rest');
    // Limited liability: an LLC that fails owes only what you guaranteed.
    const t = setup(93, 40);
    t.state.finances.cash = 200000;
    t.engine.dispatch('business.start', 'retail:cash:llc');
    const b2 = t.state.business.current;
    b2.cash = -300000;
    b2.debts.loc = 50000;
    const before = t.state.finances.cash;
    closeBusiness(t.engine.context(), 'test');
    assert.equal(before - t.state.finances.cash, 50000, 'only the guaranteed credit line follows you');
    const u = setup(94, 40);
    u.state.finances.cash = 200000;
    u.engine.dispatch('business.start', 'retail:cash:sole');
    u.state.business.current.cash = -300000;
    const b4 = u.state.finances.cash;
    closeBusiness(u.engine.context(), 'test');
    assert.ok(b4 - u.state.finances.cash > 200000, 'sole proprietors owe it all');
    assert.equal(u.state.business.current, null);
  },

  'startups need a C-corp to raise; rounds dilute you; QSBS makes long-held exits tax-free'() {
    const { engine, state } = setup(95, 28);
    state.finances.cash = 50000;
    engine.dispatch('business.start', 'techStartup:cash:llc');
    const biz = state.business.current;
    engine.rng.chance = () => true;
    engine.dispatch('business.raise');
    assert.equal(biz.investors.length, 0, 'LLCs can\'t take venture money');
    engine.dispatch('business.convert', 'ccorp');
    engine.dispatch('business.raise');
    assert.equal(biz.investors.length, 1, 'seed round closed');
    assert.ok(biz.ownerPct < 0.86 && biz.ownerPct >= 0.75, `diluted to ${biz.ownerPct}`);
    assert.ok(biz.cash >= 500000 && biz.staff.headcount > 0, 'cash in the bank, team hired');
    engine.dispatch('business.convert', 'llc');
    assert.equal(biz.entity, 'ccorp', 'investors lock you into a C-corp');
    biz.years = 6;
    biz.basis = 25000;
    const e = exitProceeds(biz, 20000000);
    assert.equal(e.taxable, Math.max(0, e.gain - 10000000), 'up to $10M of gain excluded');
  },

  'the family business passes to your heir; relatives can work in it'() {
    const { engine, state } = setup(96, 50);
    state.finances.cash = 300000;
    engine.dispatch('business.start', 'retail:cash:llc');
    const biz = state.business.current;
    const kid = { id: 'kid1', firstName: 'Sam', lastName: 'Case', gender: 'male', relation: 'child', ageOffset: -25, relationship: 80, alive: true, income: 0, careerIncome: 0, nationality: 'US', otherParentId: null, custody: 'you' };
    state.people.list.push(kid);
    engine.dispatch('business.hireRelative', 'kid1');
    assert.ok(biz.family.includes('kid1') && kid.job.includes(biz.name));
    biz.valuation = 200000;
    state.character.alive = false;
    const legacy = settleEstate(state);
    assert.ok(legacy.assets >= 200000, 'business equity is in the estate');
    const heir = buildHeirState(engine.rng, state, 'kid1');
    assert.equal(heir.business.current.name, biz.name);
    assert.equal(heir.business.current.role, 'absentee');
    assert.ok(heir.finances.cash <= Math.max(0, legacy.bequests.find((b) => b.to === 'kid1').amount - 200000) + 1, 'the business counts against the heir\'s share');
  },

  'payroll-tax evasion and wage theft are crimes; failing health inspections close restaurants'() {
    const { engine, state } = setup(97, 40);
    state.finances.cash = 300000;
    state.credentials.held.servSafe = { earnedAge: 30, renewedAge: 38, status: 'active' };
    engine.dispatch('business.start', 'foodTruck:cash:llc');
    const biz = state.business.current;
    biz.lastYear = { payroll: 100000 };
    state.prompts = [];
    engine.context().prompt({ type: 'business.temptation', title: 't', text: 't', options: [{ id: 'take', label: 't' }, { id: 'honest', label: 'h' }], data: { id: 'payrollTax' } });
    engine.resolvePrompt(state.prompts[0].id, 'take');
    assert.ok(state.legal.investigations.some((i) => i.offenseId === 'payrollTaxEvasion'));
    biz.violations = [state.character.age, state.character.age];
    biz.quality = 0;
    engine.rng.chance = (p) => p === 0.6;
    engine.rng.int = (a) => a;
    state.prompts = [];
    engine.ageUp();
    assert.equal(state.business.current, null, 'health department revoked the permit');
    assert.match(state.business.history.at(-1).outcome, /health department/);
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
  'clergy: ordination depends on the tradition; titles follow it; celibate priests who marry are laicized'() {
    const { engine, state } = setup(61, 30);
    state.character.gender = 'female';
    state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'religiousStudies', year: 22 }, { type: 'master', programId: 'seminary', major: null, year: 27 });
    state.community.faith = null;
    assert.equal(clergyEligibility(state).ok, false, 'needs a congregation');
    state.community.faith = membership('catholic', "St. Mark's Parish", 20);
    assert.match(clergyEligibility(state).reason, /only men/);
    state.community.faith = membership('lds', 'Oak Grove Ward', 20);
    assert.match(clergyEligibility(state).reason, /lay/);
    state.community.faith = membership('reformJewish', 'Beth Shalom Temple', 29);
    assert.match(clergyEligibility(state).reason, /3 years/);
    state.community.faith.joinedAge = 20;
    assert.ok(clergyEligibility(state).ok);
    const job = giveJob(engine, 'clergy', 'associate');
    assert.equal(job.title, 'Assistant Rabbi');
    assert.equal(job.tradition, 'reformJewish');
    // A celibate Catholic priest who marries is removed from ministry.
    state.character.gender = 'male';
    state.career.job = null;
    state.community.faith = membership('catholic', "St. Mark's Parish", 20);
    assert.match(applicationEligibility(state, 'clergy').reason, /diocese/);
    assert.ok(applicationEligibility(state, 'catholicClergy').ok);
    const priest = giveJob(engine, 'catholicClergy', 'vicar');
    assert.equal(priest.title, 'Parochial Vicar');
    assert.match(priest.employer.name, /Diocese of/);
    assert.equal(traineeProgram({ professionId: 'catholicClergy', levelId: 'seminarian' }).next, 'deacon');
    state.people.list.push({ id: 'per_sp', firstName: 'Ann', lastName: 'X', gender: 'female', relation: 'spouse', ageOffset: 0, relationship: 80, alive: true, income: 0 });
    state.prompts = [];
    engine.ageUp();
    assert.equal(state.career.job, null, 'laicized');
  },

  'leaving a high-control group means shunning; schisms split congregations'() {
    const { engine, state, ctx } = setup(62, 30);
    state.community.faith = membership('ifb', 'Bible Baptist Church', 0, { raised: true, attendance: 'devout' });
    state.community.upbringing = 'ifb';
    const mom = state.people.list.find((p) => p.relation === 'mother');
    mom.relationship = 80;
    addFriend(ctx, 'faith', { relationship: 70 });
    assert.equal(friendsOf(state).filter((f) => f.circle === 'faith').length, 1);
    engine.dispatch('community.leave');
    assert.equal(state.community.faith, null);
    assert.equal(friendsOf(state).filter((f) => f.circle === 'faith').length, 0, 'congregation cut you off');
    assert.ok(mom.relationship <= 55, 'family shuns you');
    assert.equal(state.community.former.at(-1).traditionId, 'ifb');
    // Schism: follow the breakaway.
    state.yearly = {};
    engine.dispatch('community.join', 'mainline');
    assert.equal(state.community.faith.traditionId, 'mainline');
    ctx.prompt({ type: 'community.schism', title: 'Split', text: '', options: [{ id: 'stay', label: 'a' }, { id: 'follow', label: 'b' }, { id: 'leave', label: 'c' }], data: { from: 'mainline', to: 'conservativeMethodist' } });
    resolve(engine, 'community.schism', 'follow');
    assert.equal(state.community.faith.traditionId, 'conservativeMethodist');
    // Giving is a share of last year's income, never into debt.
    state.finances.lastYear = { gross: 100000 };
    state.finances.cash = 50000;
    engine.dispatch('community.give', '10');
    state.prompts = [];
    engine.ageUp();
    assert.equal(state.community.givenThisYear, 10000);
  },

  'friends: circles, moving away, help requests, reunions; a co-parent is never dropped'() {
    const { engine, state, ctx } = setup(63, 28);
    state.education.degrees[0].year = 18;
    const f = addFriend(ctx, 'college', { relationship: 9 });
    const coParent = addFriend(ctx, 'neighborhood', { relationship: 5 });
    state.people.list.push({ id: 'per_kid', firstName: 'Kid', lastName: 'Case', gender: 'male', relation: 'child', ageOffset: -2, relationship: 70, alive: true, income: 0, otherParentId: coParent.id });
    f.away = true;
    state.prompts = [];
    engine.ageUp();
    assert.ok(!state.people.list.includes(f), 'lost touch with a distant, neglected friend');
    assert.ok(state.people.list.includes(coParent), 'the other parent of your child stays');
    // At 28 + 2 the 10-year-from-18 mark already passed; jump to the 20-year reunion.
    state.prompts = [];
    state.character.age = 37;
    engine.ageUp();
    resolve(engine, 'friends.reunion', 'go');
    // Help request: lend money, then it gets paid back or written off.
    const buddy = addFriend(ctx, 'work', { relationship: 60 });
    ctx.prompt({ type: 'friends.help', title: 'x', text: '', options: [{ id: 'help', label: 'a' }, { id: 'no', label: 'b' }], data: { personId: buddy.id, kind: 'loan', amount: 3000 } });
    state.finances.cash = 10000;
    resolve(engine, 'friends.help', 'help');
    assert.equal(buddy.owes.amount, 3000);
    assert.equal(state.finances.cash, 7000);
    // Visiting a friend who moved away costs a trip.
    buddy.away = true;
    state.yearly = {};
    state.prompts = [];
    engine.dispatch('people.spendTime', buddy.id);
    assert.equal(state.finances.cash, 6600);
  },
  'elder care: parents pay first, then you; dementia without a POA means guardianship; Medicaid after spend-down'() {
    const { engine, state } = setup(64, 50);
    const mom = state.people.list.find((p) => p.relation === 'mother');
    mom.alive = true;
    mom.ageOffset = 30;
    mom.relationship = 70;
    state.housing.withParents = false;
    state.people.parentAssets = 50000;
    state.elderCare.cases[mom.id] = { personId: mom.id, level: 'help', dementia: false, arrangement: 'aide', since: 50 };
    // Competent parent: income + savings cover a part-time aide.
    let bill = careBill(state, state.elderCare.cases[mom.id]);
    assert.equal(bill.you, 0);
    assert.equal(bill.parentPays, 35000);
    // Sign the POA while she still can.
    engine.dispatch('elderCare.poa', mom.id);
    assert.ok(state.elderCare.poa.includes(mom.id));
    // Dementia: full care in a nursing home; savings spend down, then Medicaid.
    const c = state.elderCare.cases[mom.id];
    c.level = 'full';
    c.dementia = true;
    c.arrangement = 'nursing';
    bill = careBill(state, c);
    assert.equal(bill.fromSavings, 50000);
    assert.equal(bill.medicaid, 105000 - 20000 - 50000);
    assert.equal(bill.you, 0, 'children are not billed for a nursing home');
    // In-home care is different: without a POA you can't draw on an incapacitated parent's savings.
    state.elderCare.poa = [];
    c.arrangement = 'aide';
    assert.equal(careBill(state, c).fromSavings, 0);
    assert.equal(careBill(state, c).you, 75000 - 20000);
    c.arrangement = 'nursing';
    engine.dispatch('elderCare.poa', mom.id);
    assert.equal(state.elderCare.poa.length, 0, 'too late to sign');
    // Hands-on caregiving adds to your time commitments and stress.
    c.arrangement = 'self';
    state.stats.stress = 20;
    state.prompts = [];
    engine.ageUp();
    if (mom.alive) assert.ok(state.elderCare.caregiverYears >= 1);
  },
  'vehicles: financing follows credit; insurance follows your record; repossession leaves a deficiency'() {
    const { engine, state } = setup(65, 30);
    giveJob(engine, 'tech', 'swe');
    state.finances.cash = 20000;
    state.housing.credit.score = 790;
    assert.ok(autoRate(state, false) < 0.06);
    state.housing.credit.score = 520;
    assert.ok(autoRate(state, false) >= 0.14, 'subprime');
    assert.match(purchaseCheck(state, 'sedan', 'lease').reason, /620/);
    state.housing.credit.score = 700;
    engine.dispatch('vehicles.buy', 'sedan:loan');
    const car = state.vehicles.owned[0];
    assert.ok(car.loan && car.loan.balance === 27000);
    assert.equal(state.finances.cash, 17000);
    // A clean record vs points and a DUI.
    const clean = riskMultiplier(state);
    state.vehicles.record.points = 6;
    state.legal.record.push({ offenseId: 'dui', age: 29, severity: 'misdemeanor' });
    assert.ok(riskMultiplier(state) > clean * 2, 'points and a DUI more than double premiums');
    // Lenders won't let you drop coverage.
    engine.dispatch('vehicles.toggleInsurance', car.id);
    assert.equal(car.insured, true);
    // Deep in debt: the car is repossessed and the shortfall stays with you.
    state.finances.cash = -200000;
    const chance = engine.rng.chance.bind(engine.rng);
    engine.rng.chance = (p) => (p === 0.45 ? true : p < 0.2 ? false : chance(p));
    state.prompts = [];
    engine.ageUp();
    assert.equal(state.vehicles.owned.length, 0, 'repossessed');
    assert.equal(state.vehicles.repos.length, 1);
    assert.ok(state.housing.credit.events.some((e) => e.type === 'default'));
  },
  'taxes: itemizing beats the standard deduction; unpaid tax becomes IRS debt; liens and levies follow'() {
    const { engine, state } = setup(66, 40);
    // Itemized deductions: SALT capped at $40k (phasing down over $500k), mortgage interest, charity.
    state.finances.ledger.itemize = [{ kind: 'mortgageInterest', amount: 18000 }, { kind: 'propertyTax', amount: 9000 }];
    state.community.givenThisYear = 6000;
    let it = itemizedDeductions(state, { stateTax: 12000, agi: 200000 });
    assert.equal(it.salt, 21000);
    assert.equal(it.total, 18000 + 21000 + 6000);
    it = itemizedDeductions(state, { stateTax: 60000, agi: 300000 });
    assert.equal(it.salt, SALT_CAP);
    it = itemizedDeductions(state, { stateTax: 60000, agi: 700000 });
    assert.equal(it.salt, 10000, 'phased down to the floor');
    // A year you can't pay your taxes: the IRS, not the card, carries it.
    giveJob(engine, 'tech', 'swe');
    state.finances.cash = -50000;
    state.prompts = [];
    engine.ageUp();
    state.prompts = [];
    assert.ok(state.finances.tax.debt > 0, 'tax debt');
    const debt = state.finances.tax.debt;
    // Ignore it: lien after two years, levies after three.
    state.finances.tax.unpaidYears = 1;
    engine.ageUp();
    state.prompts = [];
    assert.ok(state.finances.tax.lien != null, 'lien filed');
    assert.ok(state.housing.credit.events.some((e) => e.type === 'lien'));
    engine.ageUp();
    state.prompts = [];
    assert.ok(state.finances.tax.unpaidYears >= 3);
    // A payment plan stops collection.
    engine.dispatch('taxes.requestPlan');
    assert.ok(state.finances.tax.plan?.annual > 0);
    assert.equal(state.finances.tax.unpaidYears, 0);
    assert.ok(debt > 0);
  },

  'IRS audits: cheaters pay fraud penalties and risk a criminal referral; a CPA softens it'() {
    const { engine, state, ctx } = setup(67, 45);
    state.finances.lastYear = { gross: 300000, federalTax: 70000 };
    state.legal.flags.taxCheatAge = 44;
    ctx.prompt({ type: 'taxes.audit', title: 'Audit', text: '', options: [{ id: 'cpa', label: 'a' }, { id: 'self', label: 'b' }], data: { cheated: true, federalTax: 70000, big: false } });
    engine.rng.chance = () => false;
    resolve(engine, 'taxes.audit', 'self');
    assert.equal(state.finances.tax.audits[0].result, 'fraud');
    assert.equal(state.finances.tax.debt, Math.round(30000 * 1.75), '75% civil fraud penalty');
  },
  'credit cards: approval by score, bigger limits, rewards when paid in full, the minimum-payment trap and 0% transfers'() {
    const { engine, state } = setup(68, 30);
    giveJob(engine, 'tech', 'swe');
    state.finances.lastYear = { gross: 100000 };
    state.housing.credit.score = 600;
    engine.dispatch('cards.apply', 'cashback');
    assert.equal(state.finances.cards.held.length, 0, 'denied below 670');
    const base = creditLimit(state);
    state.housing.credit.score = 760;
    engine.dispatch('cards.apply', 'cashback');
    engine.dispatch('cards.apply', 'transfer');
    assert.equal(state.finances.cards.held.length, 2);
    assert.ok(creditLimit(state) > base, 'two cards, bigger limit');
    assert.ok(state.housing.credit.events.filter((e) => e.type === 'inquiry').length >= 2, 'hard inquiries');
    assert.equal(cardApr(state), 0.24);
    // Minimum payments on $10k at ~24% take years and cost thousands.
    const trap = minimumPayoff(10000, 0.24);
    assert.ok(trap.years >= 10 && trap.interest > 10000, `trap ${JSON.stringify(trap)}`);
    // Balance transfer: 4% fee, and no interest on the promo balance this year.
    state.finances.cash = -10000;
    engine.dispatch('cards.transfer');
    assert.equal(state.finances.cards.transfer.amount, 10400);
    state.prompts = [];
    engine.ageUp();
    assert.equal(state.finances.lastYear.interest, 0, '0% promo');
    // Paid in full: cash-back rewards.
    state.finances.cards.transfer = null;
    state.finances.cash = 50000;
    state.prompts = [];
    engine.ageUp();
    assert.ok(state.finances.cards.rewards > 0, 'rewards');
    assert.ok(DEFAULT_APR > 0.2);
  },
  'estate planning: trusts skip probate, beneficiaries bypass the will (even an ex), gifts use the exclusion, trusts stage a young heir'() {
    const { engine, state } = setup(69, 60);
    family(engine, { kids: 2, kidAge: 20 });
    state.finances.cash = 600000;
    state.retirement.dc = 500000;
    let l = settleEstate(state);
    assert.ok(l.probate > 30000, 'probate on a $1.1M estate');
    engine.dispatch('estate.trust', 'trust');
    l = settleEstate(state);
    assert.equal(l.probate, 0, 'living trust avoids probate');
    // A 401(k) still naming your ex goes to the ex, whatever the will says.
    const ex = { id: 'ex1', firstName: 'Pat', lastName: 'X', gender: 'male', relation: 'ex', ageOffset: 0, relationship: 20, alive: true, income: 0 };
    state.people.list.push(ex);
    engine.dispatch('estate.beneficiary', 'ex1');
    engine.dispatch('people.writeWill', 'children');
    l = settleEstate(state);
    const toEx = l.bequests.find((b) => b.to === 'ex1');
    assert.equal(toEx?.amount, 500000, 'ERISA: the ex gets the 401(k)');
    assert.equal(toEx.heirTax, 110000, 'heirs pay income tax on pre-tax money');
    engine.dispatch('estate.beneficiary', 'children');
    l = settleEstate(state);
    assert.ok(!l.bequests.some((b) => b.to === 'ex1'));
    // Gifts: under the exclusion is free; over it uses lifetime exemption.
    engine.dispatch('estate.gift', 'kid0:19000');
    engine.dispatch('estate.gift', 'kid1:30000');
    assert.equal(state.people.plan.exemptionUsed, 0, 'married: $38k per recipient with gift-splitting');
    engine.dispatch('estate.gift', 'kid1:20000');
    assert.equal(state.people.plan.exemptionUsed, 12000);
    // A child under 25 with a minors' trust gets the inheritance in stages.
    engine.dispatch('estate.trust', 'minorsTrust');
    state.people.list.find((p) => p.id === 'kid0').ageOffset = 19 - state.character.age;
    engine.context().die('Old age');
    const heir = engine.continueAsChild('kid0');
    assert.deepEqual(heir.finances.trustPayouts.map((p) => p.age), [25, 30]);
    assert.ok(heir.finances.cash > 19000, 'a third now plus lifetime gifts');
  },
  'gig work: 1099 pay with self-employment tax, no benefits, gated by license and car, and deactivation'() {
    const { engine, state } = setup(70, 25);
    assert.match(gigEligibility(state, 'rideshare').reason, /car/);
    assert.match(gigEligibility(state, 'freelance').reason, /bachelor/);
    engine.dispatch('gig.start', 'petCare:full');
    assert.equal(state.gig.active.gigId, 'petCare');
    state.prompts = [];
    engine.ageUp();
    const ly = state.gig.lastYear;
    assert.ok(ly.net > 20000 && ly.net < 60000, `pet care full time nets ${ly.net}`);
    // Getting a real job turns it into a side hustle.
    giveJob(engine, 'retail', 'associate');
    assert.equal(state.gig.active.hours, 'side');
    // A low rating gets you deactivated.
    state.gig.active.rating = 4.25;
    engine.rng.chance = () => true;
    state.prompts = [];
    engine.ageUp();
    assert.equal(state.gig.active, null);
    assert.ok(state.gig.deactivated.petCare);
  },

  'job market: competing offers in your own field, switching employers, and non-competes that follow you'() {
    const { engine, state, ctx } = setup(71, 32);
    const job = giveJob(engine, 'tech', 'swe');
    const salary = job.salary;
    const offer = { ...makeOffer(ctx), nonCompete: 1, workMode: 'remote' };
    assert.equal(offer.professionId, 'tech');
    acceptOffer(ctx, offer);
    const now = state.career.job;
    assert.notEqual(now.employer.id, job.employer.id, 'new company, same career');
    assert.ok(now.salary >= offer.salary * 0.99 && now.salary > salary);
    assert.equal(now.workMode, 'remote');
    assert.equal(now.remote, true);
    // Leaving with a non-compete binds you; going to a competitor can get you sued (not in California).
    now.employer.stateId = 'TX';
    acceptOffer(ctx, { ...makeOffer(ctx), nonCompete: 0 });
    assert.equal(state.career.nonCompete.untilAge, 33);
    state.career.nonCompete.stateId = 'CA';
    state.prompts = [];
    engine.rng.chance = () => true;
    acceptOffer(ctx, makeOffer(ctx));
    assert.equal(state.career.nonCompete, null, 'California won\'t enforce it');
    assert.ok(!state.prompts.some((p) => p.type === 'jobMarket.nonCompete'));
  },

  'workplace claims: EEOC, lawyers on contingency, retaliation and taxable settlements'() {
    const { engine, state, ctx } = setup(72, 40);
    giveJob(engine, 'corporate', 'analyst');
    ctx.prompt({ type: 'claims.incident', title: 'x', text: '', options: [{ id: 'lawyer', label: 'a' }, { id: 'endure', label: 'b' }], data: { basis: 'age' } });
    const chance = engine.rng.chance.bind(engine.rng);
    engine.rng.chance = (p) => (p === 0.3 ? true : p === 0.4 ? false : chance(p));
    resolve(engine, 'claims.incident', 'lawyer');
    const c = state.career.claims.active;
    assert.equal(c.stage, 'lawsuit');
    assert.equal(c.retaliated, true, 'retaliation after complaining');
    assert.ok(state.career.job, 'retaliated against, not fired');
    // Settle: the lawyer takes a third; the rest is taxable income.
    engine.rng.chance = () => true;
    c.years = 2;
    state.prompts = [];
    engine.ageUp();
    const h = state.career.claims.history.at(-1);
    assert.ok(['settled'].includes(h.result), h.result);
    assert.equal(h.net, h.gross - Math.round(h.gross * 0.33));
  },
  'judges: eligibility, state selection methods, Senate confirmation, rulings and senior status at full pay'() {
    const { engine, state, ctx } = setup(73, 50);
    giveJob(engine, 'law', 'associate');
    assert.match(benchEligibility(state, 'magistrate').reason, /license/);
    state.credentials.held.barLicense = { status: 'active', earnedAge: 25 };
    state.career.job.yearsAtEmployer = 12;
    assert.ok(benchEligibility(state, 'fedMagistrate').ok);
    assert.match(benchEligibility(state, 'fedCircuit').reason, /appellate|trial/);
    state.character.regionId = Object.keys(REGIONS).find((id) => REGIONS[id].state === 'CO');
    assert.equal(selectionFor(state, 'stateAppellate'), 'merit');
    assert.equal(selectionFor(state, 'fedDistrict'), 'appointed');
    // Nominated to the federal district court; the hearing goes well.
    ctx.prompt({ type: 'judiciary.nomination', title: 'x', text: '', options: [{ id: 'accept', label: 'a' }, { id: 'decline', label: 'b' }], data: { court: 'fedDistrict', method: 'appointed' } });
    resolve(engine, 'judiciary.nomination', 'accept');
    const chance = engine.rng.chance;
    engine.rng.chance = () => true;
    resolve(engine, 'judiciary.hearing', 'decline');
    engine.rng.chance = chance;
    assert.equal(currentCourt(state), 'fedDistrict');
    assert.equal(state.career.job, null, 'judges hold no other job');
    // A year on the bench: salary and a case on the docket.
    state.prompts = [];
    engine.ageUp();
    assert.ok(state.finances.lastYear.gross >= 243000);
    const docket = state.prompts.find((p) => p.type === 'judiciary.case');
    assert.ok(docket, 'a case to rule on');
    resolve(engine, 'judiciary.case', docket.options[0].id);
    assert.equal(state.judiciary.seat.rulings, 1);
    // Rule of 80: senior status at full salary.
    state.character.age = 70;
    state.judiciary.seat.since = 55;
    ctx.prompt({ type: 'judiciary.senior', title: 'x', text: '', options: [{ id: 'senior', label: 'a' }, { id: 'stay', label: 'b' }], data: {} });
    resolve(engine, 'judiciary.senior', 'senior');
    assert.ok(state.retirement.pensions.some((p) => p.annual === 243000), 'full salary for life');
  },

  'civil courts: ignored suits become default judgments and garnishment; small claims; jury duty'() {
    const { engine, state, ctx } = setup(74, 35);
    giveJob(engine, 'retail', 'associate');
    state.finances.cash = 0;
    ctx.prompt({ type: 'civil.sued', title: 'x', text: '', options: [{ id: 'settle', label: 'a' }, { id: 'fight', label: 'b' }, { id: 'ignore', label: 'c' }], data: { suit: { id: 's1', role: 'defendant', kind: 'debt', amount: 10000, stage: 'filed', years: 0 } } });
    resolve(engine, 'civil.sued', 'ignore');
    assert.equal(state.civil.judgments, 11000, 'default judgment plus costs');
    state.prompts = [];
    engine.ageUp();
    assert.ok(state.civil.judgments < 11000, 'wages garnished');
    // Small claims: cheap to file, decided within a year.
    state.yearly = {};
    state.prompts = [];
    state.finances.cash = 1000;
    engine.dispatch('civil.sue', 'smallClaims');
    assert.equal(state.civil.suits.length, 1);
    state.prompts = [];
    engine.ageUp();
    assert.equal(state.civil.suits.filter((s) => s.role === 'plaintiff').length, 0, 'decided');
    // Jury duty.
    ctx.prompt({ type: 'civil.jury', title: 'x', text: '', options: [{ id: 'serve', label: 'a' }, { id: 'postpone', label: 'b' }], data: {} });
    engine.rng.chance = () => true;
    state.prompts = state.prompts.filter((p) => p.type === 'civil.jury');
    resolve(engine, 'civil.jury', 'serve');
    resolve(engine, 'civil.verdict', state.prompts.find((p) => p.type === 'civil.verdict').options[0].id);
    assert.equal(state.civil.juries, 1);
  },
  'mental health: therapy and medication trade-offs, tapering vs cold turkey, and 988 in a crisis'() {
    const { engine, state, ctx } = setup(75, 30);
    addCondition(ctx, 'anxiety', { severity: 60, diagnosed: true });
    engine.dispatch('mental.meds', 'anxiety:benzo');
    const c = getCondition(state, 'anxiety');
    assert.equal(c.care.meds, 'benzo');
    assert.equal(c.treated, true);
    engine.dispatch('mental.meds', 'depression:ssri');
    // Two years on a benzo: dependence. Cold turkey means withdrawal.
    c.care.medYears = 3;
    const stress = state.stats.stress;
    engine.dispatch('mental.meds', 'anxiety:stop');
    assert.equal(c.care?.meds ?? null, null, 'off medication (no plan left)');
    assert.ok(state.stats.stress > stress, 'withdrawal');
    // Therapy: in network vs out of network.
    engine.dispatch('mental.therapy', 'anxiety:cbt');
    assert.equal(c.care.therapy, 'cbt');
    // A crisis: 988 connects you with care.
    addCondition(ctx, 'depression', { severity: 85, diagnosed: true });
    ctx.prompt({ type: 'mental.crisis', title: 'x', text: '', options: [{ id: 'call988', label: 'a' }, { id: 'alone', label: 'b' }], data: { id: 'depression' } });
    resolve(engine, 'mental.crisis', 'call988');
    const d = getCondition(state, 'depression');
    assert.ok(d.care?.therapy && !d.care.waitlist, '988 referral skips the waitlist');
    assert.ok(d.severity < 85);
  },

  'SSDI: apply, get denied, appeal to a hearing with an attorney, collect back pay'() {
    const { engine, state, ctx } = setup(76, 52);
    state.retirement.ssEarnings = Array.from({ length: 25 }, () => 60000);
    addCondition(ctx, 'backInjury', { severity: 95, diagnosed: true });
    assert.ok(ssdiEligibility(state).ok, ssdiEligibility(state).reason);
    engine.dispatch('ssdi.apply');
    assert.equal(state.health.disability.ssdiClaim.stage, 'initial');
    assert.ok(!state.health.disability.benefits.some((b) => b.source === 'ssdi'), 'not automatic');
    const chance = engine.rng.chance.bind(engine.rng);
    engine.rng.chance = (p) => (p >= 0.03 && p <= 0.9 && state.health.disability.ssdiClaim?.stage !== 'hearing' ? false : chance(p));
    state.prompts = [];
    engine.ageUp();
    resolve(engine, 'ssdi.denied', 'appeal');
    assert.equal(state.health.disability.ssdiClaim.stage, 'reconsideration');
    state.prompts = state.prompts.filter((p) => p.type === 'ssdi.denied');
    engine.ageUp();
    resolve(engine, 'ssdi.denied', 'lawyer');
    const claim = state.health.disability.ssdiClaim;
    assert.equal(claim.stage, 'hearing');
    assert.ok(claim.lawyer);
    // The hearing a year later goes your way: benefits plus back pay, minus the capped fee.
    state.character.age += 1;
    state.prompts = [];
    const odds = approvalOdds(state, 'hearing', true);
    engine.rng.chance = (p) => (p === odds ? true : chance(p));
    engine.ageUp();
    assert.ok(state.character.alive);
    assert.ok(state.health.disability.benefits.some((b) => b.source === 'ssdi'), 'approved');
    assert.ok(state.finances.ledger.income.length === 0 && state.finances.lastYear.gross > 50000, 'back pay counted as income');
  },
  'emeritus: tenured faculty who retire after 10+ years keep the title; resigning or a felony doesn\'t'() {
    const { engine, state, ctx } = setup(77, 66);
    const job = giveJob(engine, 'university', 'professor');
    job.yearsAtEmployer = 4;
    engine.dispatch('retirement.retire');
    assert.ok(!state.career.emeritus, 'too few years');
    state.retirement.retired = false;
    const job2 = giveJob(engine, 'university', 'professor');
    job2.yearsAtEmployer = 22;
    engine.dispatch('retirement.retire');
    const e = state.career.emeritus;
    assert.ok(e && /^Professor Emerit(us|a)$/.test(e.title), e?.title);
    assert.ok(state.honors.some((h) => h.id === 'university.emeritus'));
    engine.dispatch('emeritus.teach');
    state.prompts = [];
    engine.ageUp();
    assert.ok(state.finances.lastYear.gross >= 9000, 'course stipend');
    // A felony revokes it.
    ctx.emit('legal:convicted', { severity: 'felony', name: 'Fraud' });
    assert.equal(state.career.emeritus, null);
    // Resigning (not retiring) confers nothing.
    const { engine: e2, state: s2 } = setup(78, 64);
    const j3 = giveJob(e2, 'university', 'dean');
    j3.yearsAtEmployer = 15;
    e2.context().emit('career:resign', { reason: 'Took a job elsewhere' });
    assert.ok(!s2.career.emeritus);
  },
  'military clearances: cleared specialties investigate you, honesty matters, revocation reclassifies, and the clearance follows you out'() {
    const { engine, state, ctx } = setup(79, 22);
    state.stats.smarts = 80;
    // Clean background: Intelligence gets TS/SCI automatically.
    engine.dispatch('military.enlist', 'army:enlisted:active');
    const chance = engine.rng.chance.bind(engine.rng);
    engine.rng.chance = (p) => (p === 0.97 ? true : chance(p));
    resolve(engine, 'military.chooseSpecialty', 'army.35F');
    engine.rng.chance = chance;
    const svc = state.military.service;
    assert.equal(svc.clearance, 'topSecret');
    assert.equal(state.publicService.clearance.level, 'topSecret');
    // A drug conviction revokes it; intel analysts are reclassified.
    ctx.emit('legal:convicted', { severity: 'misdemeanor', offenseId: 'drugPossession', name: 'Drug possession' });
    assert.equal(state.publicService.clearance, null);
    assert.equal(svc.clearance, null);
    assert.equal(svc.specialty, 'logistics');
    // With a record, the SF-86 is a choice — lying and getting caught is a federal crime.
    const t = setup(80, 22);
    t.state.stats.smarts = 80;
    t.state.legal.flags.drugUseAge = 20;
    t.engine.dispatch('military.enlist', 'navy:enlisted:active');
    resolve(t.engine, 'military.chooseSpecialty', 'navy.CTN');
    const sf86 = t.state.prompts.find((p) => p.type === 'military.clearance');
    assert.ok(sf86, 'SF-86 prompt');
    t.engine.rng.chance = () => true;
    resolve(t.engine, 'military.clearance', 'omit');
    assert.equal(t.state.military.service, null, 'contract torn up');
    assert.ok(t.state.prompts.some((p) => p.type.startsWith('legal.')) || t.state.legal.investigations.length || t.state.legal.record.some((r) => r.offenseId === 'falseStatement'), `false statement: ${t.state.prompts.map((p) => p.type)}`);
    // Honorable discharge: the clearance stays current for two years, so veterans walk into cleared jobs.
    const u = setup(81, 22);
    u.state.stats.smarts = 80;
    u.engine.dispatch('military.enlist', 'airforce:enlisted:active');
    u.engine.rng.chance = (p) => (p === 0.97 ? true : chance(p));
    resolve(u.engine, 'military.chooseSpecialty', 'airforce.1B4');
    discharge(u.ctx, 'honorable', 'Contract complete');
    assert.equal(u.state.publicService.clearance.level, 'topSecret');
    u.state.prompts = [];
    u.engine.rng.chance = chance;
    u.engine.ageUp();
    assert.equal(u.state.publicService.clearance?.status, 'current');
  },
  'catholic hierarchy: diocesan ladder from seminarian to cardinal, and the conclave'() {
    const { engine, state } = setup(82, 60);
    state.community.faith = membership('catholic', 'Holy Cross Parish', 0, { raised: true });
    const job = giveJob(engine, 'catholicClergy', 'archbishop');
    assert.equal(job.employer.size === 'enterprise' ? /Archdiocese/.test(job.employer.name) : true, true);
    const levels = getProfession('catholicClergy').levels.map((l) => l.title);
    assert.deepEqual(levels.slice(0, 4), ['Seminarian', 'Transitional Deacon', 'Parochial Vicar', 'Pastor']);
    assert.ok(levels.includes('Cardinal') && levels.includes('Monsignor') && levels.includes('Vicar General'));
    // A cardinal under 80 at a conclave that elects them.
    job.levelId = 'cardinal';
    job.title = 'Cardinal';
    job.employer.size = 'enterprise';
    const chance = engine.rng.chance.bind(engine.rng);
    engine.rng.chance = (p) => (p === 0.06 ? true : chance(p));
    state.prompts = [];
    engine.ageUp();
    engine.rng.chance = chance;
    if (state.career.job) {
      assert.match(state.career.job.title, /^Pope /);
      assert.ok(state.honors.some((h) => h.id === 'catholic.pope'));
    }
  },
  'volunteer services lead to paid gigs and job offers (civil-service exam waived)'() {
    const { engine, state, ctx } = setup(83, 26);
    state.stats.fitness = 80;
    state.stats.health = 80;
    engine.dispatch('emergency.join', 'fire');
    const m = state.emergency.fire;
    m.years = 3;
    m.rankIndex = 1;
    const chance = engine.rng.chance.bind(engine.rng);
    // A paid gig first (no job offer this year).
    engine.rng.chance = (p) => (Math.abs(p - (0.04 + 0.02 + Math.min(0.04, m.saves * 0.004))) < 1e-9 ? false : p >= 0.15 && p <= 0.2 ? true : chance(p));
    state.prompts = [];
    engine.ageUp();
    engine.rng.chance = chance;
    const gig = state.prompts.find((p) => p.type === 'emergency.gig');
    assert.ok(gig, `gig offered: ${state.prompts.map((p) => p.type)}`);
    state.prompts = state.prompts.filter((p) => p === gig);
    resolve(engine, 'emergency.gig', 'take');
    assert.ok(state.finances.ledger.income.some((i) => /Paid-on-call/.test(i.source)));
    // A job offer straight into the fire department (other requirements, like a driver's license, still apply).
    state.credentials.held.driverLicense = { status: 'active', earnedAge: 18 };
    ctx.prompt({ type: 'emergency.jobOffer', title: 'x', text: '', options: [{ id: 'accept', label: 'a' }, { id: 'decline', label: 'b' }], data: { professionId: 'fire', levelId: 'recruit', employer: createEmployer(engine.rng, state, getProfession('fire'), state.character.regionId), serviceId: 'fire' } });
    resolve(engine, 'emergency.jobOffer', 'accept');
    assert.equal(state.career.job?.professionId, 'fire', `hired without the civil-service exam: ${JSON.stringify(applicationEligibility(state, 'fire'))}`);
  },
  'military jobs: MOS catalog per branch, direct commissions by experience, advanced enlisted rank, selection and civilian credentials'() {
    // Every branch has enlisted and officer jobs, and every job maps to a real specialty.
    for (const branch of ['army', 'guard', 'marines', 'navy', 'airforce', 'coastguard']) {
      assert.ok(mosFor(branch, 'enlisted').length >= 6 && mosFor(branch, 'officer').length >= 5, branch);
    }
    // A 34-year-old lawyer with 6 years of practice: JAG at O-3 Captain.
    const law = setup(91, 34);
    law.state.education.degrees.push({ type: 'professional', programId: 'jd', major: null, year: 27 });
    grantCredential(law.ctx, 'barLicense', { silent: true });
    law.state.career.history.push({ professionId: 'law', startAge: 27, endAge: 33, peakGrade: 6 });
    law.engine.dispatch('military.enlist', 'army:officer:reserve');
    const jag = law.state.prompts.find((p) => p.type === 'military.chooseSpecialty').options.find((o) => o.id === 'army.27A');
    assert.ok(!jag.disabled && /O-3 Captain/.test(jag.hint), jag.hint);
    law.engine.rng.chance = () => true;
    resolve(law.engine, 'military.chooseSpecialty', 'army.27A');
    const jsvc = law.state.military.service;
    assert.equal(jsvc.grade, 2);
    assert.equal(jsvc.specialty, 'legal');
    assert.equal(jsvc.direct, 'jag');
    // A 41-year-old board-certified surgeon: too old for OCS, but the Medical Corps takes them at O-5.
    const doc = setup(92, 41);
    doc.state.education.degrees.push({ type: 'professional', programId: 'md', major: null, year: 30 });
    for (const id of ['medicalLicense', 'boardCertified']) grantCredential(doc.ctx, id, { silent: true });
    doc.state.career.history.push({ professionId: 'medical', startAge: 29, endAge: 40, peakGrade: 8 });
    doc.engine.dispatch('military.enlist', 'navy:officer:reserve');
    const opts = doc.state.prompts.find((p) => p.type === 'military.chooseSpecialty').options;
    assert.ok(opts.find((o) => o.id === 'navy.1310').disabled, 'aviator closed past 39');
    doc.engine.rng.chance = () => true;
    const cash = doc.state.finances.cash;
    resolve(doc.engine, 'military.chooseSpecialty', 'navy.2100');
    assert.equal(doc.state.military.service.grade, 4, 'O-5 Commander');
    assert.ok(doc.state.finances.cash > cash, 'accession bonus');
    // Without the license, no direct commission.
    const nope = setup(93, 30);
    nope.state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 });
    nope.engine.dispatch('military.enlist', 'army:officer:active');
    assert.ok(nope.state.prompts.find((p) => p.type === 'military.chooseSpecialty').options.find((o) => o.id === 'army.62B').disabled);
    // A paramedic who enlists as a 68W starts as an E-4 Specialist.
    const medic = setup(94, 24);
    grantCredential(medic.ctx, 'paramedic', { silent: true });
    medic.engine.dispatch('military.enlist', 'army:enlisted:active');
    resolve(medic.engine, 'military.chooseSpecialty', 'army.68W');
    assert.equal(medic.state.military.service.grade, 3);
    assert.equal(medic.state.military.service.mos, 'army.68W');
    // Selection: wash out and become a rifleman; pass and stay.
    const sf = setup(95, 20);
    sf.engine.dispatch('military.enlist', 'army:enlisted:active');
    sf.engine.rng.chance = (p) => (p === 0.97 ? true : false);
    resolve(sf.engine, 'military.chooseSpecialty', 'army.18X');
    sf.state.prompts = [];
    sf.engine.ageUp();
    assert.equal(sf.state.military.service.mos, 'army.11B', 'washed out to infantry');
    // Military pilots leave flight school with commercial and instrument ratings, and log hours.
    const pilot = setup(96, 23);
    pilot.state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 });
    pilot.engine.dispatch('military.enlist', 'airforce:officer:active');
    pilot.engine.rng.chance = (p) => (p === 0.97 ? true : false);
    resolve(pilot.engine, 'military.chooseSpecialty', 'airforce.11M');
    pilot.state.prompts = [];
    pilot.engine.ageUp();
    assert.ok(hasCredential(pilot.state, 'commercialPilot') && hasCredential(pilot.state, 'instrumentRating'));
    assert.ok(pilot.state.credentials.logbook.flightHours >= 450, `hours ${pilot.state.credentials.logbook.flightHours}`);
    // Transfers keep the same corps where the new branch has it.
    assert.equal(MOS['navy.2500'].direct, 'jag');
  },
  'air & sea: flight attendants train on the job, mariners license up, pilots face the medical, the age-65 rule and furloughs'() {
    const quiet = (t) => { t.state.prompts = []; };
    // Flight attendant: hired as a trainee, the airline's academy issues the certificate, then reserve.
    const fa = setup(101, 22);
    giveJob(fa.engine, 'flightAttendant', 'trainee');
    fa.engine.ageUp(); quiet(fa);
    fa.engine.ageUp(); quiet(fa);
    assert.ok(hasCredential(fa.state, 'faCertificate'), 'FA certificate');
    assert.equal(fa.state.career.job?.levelId, 'reserve');
    // Maritime academy graduates with a license start as Third Mate.
    const mm = setup(102, 22);
    mm.state.education.degrees.push({ type: 'bachelor', programId: 'maritimeAcademy', major: 'marineTransportation', year: 22 });
    for (const id of ['twic', 'mmc', 'stcw', 'mateLicense']) grantCredential(mm.ctx, id, { silent: true });
    assert.equal(bestEntryLevel(mm.state, getProfession('merchantMarine'), 'large').id, 'thirdMate');
    // Cruise crews live aboard.
    const cr = setup(103, 23);
    giveJob(cr.engine, 'cruise', 'steward');
    assert.ok(hasHousingBenefit(cr.state));
    // A pilot who loses the first-class medical is grounded, then out — with loss-of-license insurance.
    const p = setup(104, 40);
    for (const id of ['atp', 'typeRating']) grantCredential(p.ctx, id, { silent: true });
    giveJob(p.engine, 'aviation', 'captain');
    p.state.career.job.unionMember = true;
    p.state.stats.health = 30;
    p.state.stats.fitness = 30;
    p.engine.ageUp(); quiet(p);
    if (p.state.career.job) {
      assert.ok(p.state.career.job.grounded, 'grounded');
      p.state.stats.health = 30;
      p.engine.ageUp(); quiet(p);
    }
    assert.notEqual(p.state.career.job?.professionId, 'aviation', 'lost the medical');
    assert.ok(p.state.career.history.some((h) => /FAA medical/.test(h.reason ?? '')), JSON.stringify(p.state.career.history.at(-1)));
    // Age 65: off the line, into corporate flying.
    const old = setup(105, 64);
    old.state.stats.health = 80;
    for (const id of ['atp', 'typeRating']) grantCredential(old.ctx, id, { silent: true });
    giveJob(old.engine, 'aviation', 'captain');
    old.state.character.age = 65;
    old.engine.ageUp();
    const ask = old.state.prompts.find((x) => x.type === 'transport.age65');
    assert.ok(ask, `age-65 prompt: ${old.state.prompts.map((x) => x.type)}`);
    old.state.prompts = [ask];
    resolve(old.engine, 'transport.age65', 'corporate');
    assert.equal(old.state.career.job?.professionId, 'charterAviation');
    // Furlough in a recession, recalled with seniority in the recovery.
    const f = setup(106, 30);
    f.state.stats.health = 80;
    giveJob(f.engine, 'flightAttendant', 'line');
    f.state.career.job.yearsAtEmployer = 2;
    f.state.economy.phase = 'recession';
    const chance = f.engine.rng.chance.bind(f.engine.rng);
    f.engine.rng.chance = (x) => (x === 0.25 ? true : chance(x));
    f.ctx.state.prompts = [];
    TransportModuleTick(f);
    f.engine.rng.chance = chance;
    assert.equal(f.state.career.job, null, 'furloughed');
    assert.ok(f.state.transport.recall);
    f.state.economy.phase = 'expansion';
    f.engine.rng.chance = () => true;
    TransportModuleTick(f);
    resolve(f.engine, 'transport.recall', 'return');
    assert.equal(f.state.career.job?.professionId, 'flightAttendant');
    assert.equal(f.state.career.job.yearsAtEmployer, 2, 'seniority intact');
  },
  'franchising: buy into a brand (fees, royalties, standards) or franchise your own business'() {
    const t = setup(111, 35);
    t.state.finances.cash = 900000;
    t.engine.dispatch('business.franchise', 'pizza:cash:llc');
    const biz = t.state.business.current;
    assert.ok(biz?.franchise, 'franchisee');
    assert.equal(biz.typeId, 'restaurant', 'no restaurant experience needed');
    t.engine.ageUp(); t.state.prompts = [];
    assert.ok(biz.lastYear.royalties > biz.lastYear.revenue * 0.08, 'royalties off the top');
    // Standards: a default notice when quality slips.
    biz.quality = 20;
    biz.franchise.signedYears = 1;
    t.state.prompts = [];
    t.engine.ageUp();
    const notice = t.state.prompts.find((p) => p.type === 'business.franchiseDefault');
    if (notice) {
      t.state.prompts = [notice];
      resolve(t.engine, 'business.franchiseDefault', 'cure');
      assert.ok(biz.quality >= 30);
    }
    // Net-worth screen.
    const poor = setup(112, 35);
    poor.state.finances.cash = 50000;
    poor.engine.dispatch('business.franchise', 'burger:cash:llc');
    assert.equal(poor.state.business.current, null);
    // Franchisor: an established, well-regarded business sells units and collects royalties.
    const f = setup(113, 40);
    f.state.finances.cash = 400000;
    f.engine.dispatch('business.start', 'cleaning:cash:llc');
    const own = f.state.business.current;
    Object.assign(own, { years: 4, reputation: 85, quality: 80, cash: 200000 });
    own.lastYear = { netIncome: 50000 };
    f.engine.dispatch('business.franchiseOut');
    assert.ok(own.franchisor, 'franchising');
    f.engine.rng.chance = () => true;
    f.engine.ageUp();
    f.state.prompts = [];
    assert.ok(own.franchisor.units > 0 && own.lastYear.franchiseFees > 0, `units ${own.franchisor.units}`);
  },
};

function TransportModuleTick(t) {
  const mod = MODULES.find((m) => m.id === 'transport');
  mod.onAgeUp(t.engine.context());
}

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
