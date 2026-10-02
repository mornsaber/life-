/**
 * Headless smoke test: plays hundreds of complete lives with a random-but-
 * plausible player (school, licenses, exams, jobs, management, unions,
 * military, volunteering, crime, retirement) choosing random prompt options,
 * and asserts the state stays valid throughout.
 *
 *   node tests/simulate.js [lives=300] [seed=1]
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store, STAT_KEYS } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { PROFESSION_LIST, getProfession } from '../src/modules/career/JobTrees.js';
import { levelById } from '../src/modules/career/Ladder.js';
import { BRANCHES } from '../src/modules/military/MilitaryEngine.js';
import { SERVICES } from '../src/modules/emergency/EmergencyEngine.js';
import { PROGRAMS, majorsFor } from '../src/modules/education/Catalog.js';
import { CREDENTIALS } from '../src/modules/credentials/CredentialRegistry.js';
import { EXAMS } from '../src/modules/publicservice/PublicServiceEngine.js';
import { RISKY_ACTIONS } from '../src/modules/legal/index.js';
import { REGIONS } from '../src/modules/life/Regions.js';
import { DUTIES } from '../src/modules/career/ManagementEngine.js';
import { Renderer, VIEWS } from '../src/ui/Renderer.js';
import { OFFICES } from '../src/modules/politics/index.js';
import { RENT_TIERS, RENOVATIONS, housingStatus } from '../src/modules/realestate/index.js';
import { promptModal } from '../src/ui/Components.js';
import { ASSETS, PROFILES, DC_FUNDS } from '../src/modules/investing/index.js';
import { netWorth } from '../src/core/State.js';
import { CONDITIONS } from '../src/modules/health/index.js';
import { SCHOOL_TYPES, ACTIVITIES, TEEN_JOBS, MAX_ACTIVITIES } from '../src/modules/education/K12.js';
import { CLUBS, ROTC_BRANCHES } from '../src/modules/campus/index.js';
import { living, livingChildren, partnerOf, spouseOf, WEDDINGS, WILL_PLANS } from '../src/modules/people/index.js';

const LIVES = Number(process.argv[2] ?? 300);
const SEED = Number(process.argv[3] ?? 1);

const memoryStorage = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
};

const rng = new Random(SEED);
const player = new Random(SEED + 99);
const engine = new Engine({ store: new Store(memoryStorage()), rng, modules: MODULES });
const CRED_IDS = Object.keys(CREDENTIALS);
const SCHOOLS_FOR = (pid) => PROGRAMS[pid].schools;

const renderer = new Renderer({ root: null, toastRoot: null, engine });

/** Every tab must render for every reachable state (views are pure HTML-string functions). */
function renderAll(state) {
  for (const [tab, view] of Object.entries(VIEWS)) {
    try {
      assert.equal(typeof view(state), 'string');
    } catch (e) {
      throw new Error(`render ${tab} at age ${state.character.age}: ${e.stack}`);
    }
  }
  renderer.sidebar(state);
  renderer.topbar(state);
  for (const p of state.prompts) promptModal(p, 1);
}

const totals = { recessions: 0, econYears: 0, layoffs: 0, homeowners: 0, foreclosures: 0, ranForOffice: 0, governors: 0, officeHolders: 0, homeless: 0, years: 0, deaths: {}, prompts: 0, maxAge: 0, peakGrade: {}, convictions: 0, prison: 0, credentials: 0, degrees: 0, pensions: 0, managers: 0, unions: 0, clearances: 0, fso: 0, immunity: 0, generations: 0, maxGeneration: 1, married: 0, divorced: 0, parents: 0, estates: 0, investors: 0, investorMillionaires: 0, millionaires: 0, speculators: 0, ptsd: { combat: [0, 0], responder: [0, 0], other: [0, 0] }, medicalBankrupt: 0, onDisability: 0, vaRated: 0, rehab: 0, interns: 0, returnHires: 0, mentored: 0, rotcOfficers: 0, academyGrads: 0, expelled: 0, greek: 0, honorsCollege: 0, abroad: 0, dropouts: 0, geds: 0, privateSchool: 0, teenWorkers: 0, gpaSum: 0, gpaN: 0 };
const promptTypes = new Set();

function checkInvariants(state) {
  for (const key of STAT_KEYS) assert.ok(Number.isInteger(state.stats[key]) && state.stats[key] >= 0 && state.stats[key] <= 100, `stat ${key}=${state.stats[key]}`);
  assert.ok(Number.isFinite(state.finances.cash), 'cash finite');
  assert.ok(Number.isFinite(state.retirement.dc) && state.retirement.dc >= 0, 'dc');
  assert.ok(state.finances.loans >= 0, 'loans');
  const job = state.career.job;
  if (job) {
    const level = levelById(getProfession(job.professionId), job.levelId);
    assert.ok(level, `level exists ${job.professionId}/${job.levelId}`);
    assert.ok(job.grade >= 1 && job.grade <= 10, 'grade');
    assert.ok(job.step >= 1 && job.step <= 10, 'step');
    assert.ok(job.salary > 0 && Number.isFinite(job.salary), 'salary');
    assert.ok(job.performance >= 0 && job.performance <= 100, 'perf');
    assert.ok(job.employer.budget.left >= 0, 'budget');
    if (job.department) assert.ok(job.department.headcount >= 2, 'headcount');
    assert.ok(!state.legal.incarceration, 'no job in prison');
  }
  for (const [id, h] of Object.entries(state.credentials.held)) assert.ok(CREDENTIALS[id] && ['active', 'suspended', 'expired', 'revoked'].includes(h.status), `credential ${id}`);
  const svc = state.military.service;
  if (svc) assert.ok(BRANCHES[svc.branch][svc.track][svc.grade], 'rank exists');
  for (const id of Object.keys(SERVICES)) {
    const m = state.emergency[id];
    if (m) assert.ok(SERVICES[id].ranks[m.rankIndex] && m.budget.left >= 0, 'emergency member');
  }
  for (const p of state.retirement.pensions) assert.ok(p.annual >= 0 && Number.isFinite(p.annual), 'pension');
  const credit = state.housing.credit.score;
  assert.ok(Number.isInteger(credit) && credit >= 300 && credit <= 850, `credit ${credit}`);
  for (const p of state.housing.properties) {
    assert.ok(Number.isFinite(p.value) && p.value > 0, 'property value');
    if (p.mortgage) assert.ok(p.mortgage.balance >= 0 && Number.isFinite(p.mortgage.payment), 'mortgage');
    if (p.heloc) assert.ok(p.heloc.balance >= 0, 'heloc');
  }
  assert.ok(state.housing.properties.filter((p) => p.use === 'primary' && p.regionId === state.character.regionId).length <= 1, 'one primary home here');
  for (const [id, h] of Object.entries(state.credentials.held)) {
    assert.ok(['state', 'national'].includes(CREDENTIALS[id].jurisdiction), `jurisdiction ${id}`);
    if (CREDENTIALS[id].jurisdiction === 'state') assert.ok(Array.isArray(h.states) && h.states.length > 0, `states for ${id}`);
  }
  if (state.politics.office) assert.ok(OFFICES[state.politics.office.id], 'office');
  const e = state.economy;
  assert.ok(['expansion', 'peak', 'recession', 'recovery'].includes(e.phase), 'economy phase');
  for (const k of ['gdpGrowth', 'unemployment', 'inflation', 'interestRate', 'marketIndex', 'cpi']) assert.ok(Number.isFinite(e[k]), `economy ${k}`);
  assert.ok(e.marketIndex > 0 && e.unemployment > 0, 'economy ranges');
  for (const k of ['index', 'bonds', 'treasuries', 'crypto']) assert.ok(Number.isFinite(e.returns[k]), `return ${k}`);
  const inv = state.investing;
  for (const [id, h] of Object.entries(inv.holdings)) {
    assert.ok(ASSETS[id], `asset ${id}`);
    assert.ok(Number.isFinite(h.value) && h.value >= 0 && Number.isFinite(h.basis), `holding ${id} finite`);
  }
  for (const p of inv.speculative) assert.ok(Number.isFinite(p.value) && p.value >= 0, 'speculative finite');
  for (const a of [inv.ira.roth.value, inv.ira.roth.basis, inv.ira.traditional.value, state.retirement.dc]) assert.ok(Number.isFinite(a) && a >= 0, 'retirement accounts finite');
  assert.ok(PROFILES[inv.auto.profile] && DC_FUNDS[state.retirement.dcFund], 'profiles');
  assert.ok(Number.isFinite(netWorth(state)), 'net worth finite');
  const pp = state.people;
  const ids = new Set(pp.list.map((p) => p.id));
  assert.equal(ids.size, pp.list.length, 'unique person ids');
  for (const p of pp.list) {
    assert.ok(Number.isInteger(p.relationship) && p.relationship >= 0 && p.relationship <= 100, `relationship 0–100 (${p.relationship})`);
    if (p.otherParentId) assert.ok(ids.has(p.otherParentId), 'child.otherParentId refers to a known person');
    if (p.custody) assert.ok(['you', 'joint', 'ex'].includes(p.custody) && p.relation === 'child', 'custody only on children');
  }
  assert.ok(living(state).filter((p) => ['partner', 'fiance', 'spouse'].includes(p.relation)).length <= 1, 'at most one partner');
  for (const [id, bal] of Object.entries(pp.fund529)) assert.ok(ids.has(id) && Number.isFinite(bal) && bal >= 0, '529 refs/finite');
  assert.ok(Number.isFinite(pp.arrears) && pp.arrears >= 0, 'arrears');
  const cp = state.campus;
  assert.ok(cp.housing === null || cp.housing === 'dorm', 'campus housing');
  if (!state.education.enrolled) {
    assert.ok(!cp.greek && !cp.sport && !cp.studentGov && cp.clubs.length === 0, 'campus memberships end with school');
  }
  assert.ok(cp.clubs.every((id) => CLUBS[id]) && cp.clubs.length <= 2, 'clubs');
  for (const o of cp.offers) assert.ok(getProfession(o.professionId) && o.employer?.name, 'offer refs');
  for (const m of cp.mentors) assert.ok(getProfession(m.professionId), 'mentor refs');
  assert.ok(!(cp.rotc && cp.academy), 'one officer pipeline');
  assert.ok(Number.isFinite(state.finances.loans) && state.finances.loans >= 0, 'loans');
  const hl = state.health;
  const seen = new Set();
  for (const c of hl.conditions) {
    assert.ok(CONDITIONS[c.id], `condition ${c.id}`);
    assert.ok(!seen.has(c.id), `duplicate condition ${c.id}`);
    seen.add(c.id);
    assert.ok(Number.isInteger(c.severity) && c.severity >= 0 && c.severity <= 100, `severity ${c.id}`);
    assert.ok(!(c.treated && c.remission), `treated+remission ${c.id}`);
    assert.ok(!(c.treated && !c.diagnosed), `treated but undiagnosed ${c.id}`);
  }
  assert.ok(Number.isFinite(hl.medicalDebt) && hl.medicalDebt >= 0, 'medical debt');
  const k = state.k12;
  assert.ok(SCHOOL_TYPES[k.type], `k12 type ${k.type}`);
  assert.ok(k.activities.length <= MAX_ACTIVITIES && k.activities.every((a) => ACTIVITIES[a]) && new Set(k.activities).size === k.activities.length, 'k12 activities');
  assert.ok(k.gpa == null || (k.gpa >= 0 && k.gpa <= 4), `k12 gpa ${k.gpa}`);
  assert.ok(!k.job || (TEEN_JOBS[k.job.id] && state.character.age < 18), 'teen job');
  assert.ok(!(k.dropout && state.education.degrees.some((d) => d.type === 'highschool' && d.programId !== 'ged')), 'dropout with a diploma');
  assert.ok(state.education.degrees.filter((d) => d.type === 'highschool' || d.type === 'ged').length <= 1, 'one diploma');
  const svcNow = state.military.service;
  if (svcNow) {
    assert.ok(BRANCHES[svcNow.branch] && Number.isInteger(svcNow.grade) && svcNow.grade >= 0 && svcNow.grade < BRANCHES[svcNow.branch][svcNow.track].length, 'military grade');
    assert.ok(!(BRANCHES[svcNow.branch].reserveOnly && svcNow.component === 'active'), 'active Guard');
    assert.ok((svcNow.passovers ?? 0) >= 0 && (svcNow.passovers ?? 0) <= 2, 'passovers');
  }
  assert.ok(!(state.military.deserter && svcNow), 'deserter still serving');
  assert.ok(!(state.career.leave && state.career.job), 'military leave and a job at once');
  assert.ok(!state.career.leave || state.career.leave.job?.employer, 'military leave holds a job');
  assert.ok(!state.career.job || state.career.job.probationLeft == null || state.career.job.probationLeft >= 0, 'probation');
  assert.ok(state.yearly['cred.attempts'] == null || state.yearly['cred.attempts'] <= 2, 'credential attempts per year');
  assert.ok(state.credentials.training.length <= 2, 'training programs');
  assert.ok(Object.values(state.credentials.failures).every((n) => Number.isInteger(n) && n > 0), 'failure counts');
  assert.ok(hl.trauma >= 0 && [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].includes(hl.va.rating), 'trauma / VA rating');
}

function act(id, arg) {
  try {
    engine.dispatch(id, arg);
  } catch (e) {
    throw new Error(`${id}(${arg}): ${e.stack}`);
  }
}

function randomActions(state) {
  const age = state.character.age;
  const tries = [];
  const job = state.career.job;
  if (age >= 15) tries.push(() => act('credentials.pursue', player.pick(CRED_IDS)));
  if (state.career.leave && player.chance(0.3)) tries.push(() => act(player.chance(0.8) ? 'career.returnFromLeave' : 'career.resignFromLeave'));
  if (state.career.job && player.chance(0.03)) tries.push(() => act('career.transfer', player.pick(Object.keys(REGIONS))));
  if (age >= 15 && player.chance(0.1)) tries.push(() => act('credentials.prep', player.pick(CRED_IDS)));
  if (age >= 15 && player.chance(0.3)) tries.push(() => act('credentials.pursue', player.pick(['learnerPermit', 'driverLicense', 'emt', 'realEstate', 'cdlA'])));
  if (age >= 16 && player.chance(0.05)) tries.push(() => act('credentials.fly'));
  if (age >= 18 && player.chance(0.25)) tries.push(() => act('publicservice.takeExam', player.pick(Object.keys(EXAMS))));
  if (age >= 16) tries.push(() => act('career.apply', player.pick(PROFESSION_LIST).id));
  if (job) {
    tries.push(() => act(`career.${player.pick(['workHarder', 'workHarder', 'officePolitics', 'socialize', 'slackOff', 'askRaise', 'requestPromotion', 'switchTrack', 'joinUnion'])}`));
    if (job.department) tries.push(() => act(player.pick(['career.toggleDelegation', 'career.teamBuilding', 'career.setWorkforce']), player.pick([...Object.keys(DUTIES), 'direct', 'mixed', 'contracted'])));
    if (player.chance(0.03)) tries.push(() => act('career.quit'));
    if (player.chance(0.05)) tries.push(() => act('career.transfer', player.pick(Object.keys(REGIONS))));
  }
  if (age > 55 && player.chance(0.15)) tries.push(() => act('retirement.retire'));
  if (age >= 62) tries.push(() => act('retirement.claimSocialSecurity'));
  if (player.chance(0.02)) tries.push(() => act('retirement.withdraw'));
  if (age >= 18 && player.chance(0.04)) tries.push(() => act('region.move', player.pick(Object.keys(REGIONS))));
  // Housing
  if (age >= 18) {
    const h = state.housing;
    if (player.chance(0.2)) tries.push(() => act('housing.rent', player.pick(Object.keys(RENT_TIERS))));
    if (h.listings.length && player.chance(0.2)) tries.push(() => act('housing.buy', player.pick(h.listings).id));
    if (player.chance(0.02)) tries.push(() => act('housing.moveInWithParents'));
    for (const p of h.properties) {
      if (player.chance(0.15)) tries.push(() => act(player.pick(['housing.refinance', 'housing.heloc', 'housing.repayHeloc', 'housing.floodInsurance']), p.id));
      if (player.chance(0.1)) tries.push(() => act('housing.renovate', `${p.id}:${player.pick(Object.keys(RENOVATIONS))}`));
      if (player.chance(0.06)) tries.push(() => act('housing.setUse', `${p.id}:${player.pick(['primary', 'rental', 'vacant'])}`));
      if (player.chance(0.04)) tries.push(() => act('housing.sell', p.id));
      if (player.chance(0.005)) tries.push(() => act('housing.arson', p.id));
    }
    if (h.properties.length && player.chance(0.05)) tries.push(() => act('housing.toggleManager'));
  }
  // License transfers after moving
  for (const [id, h] of Object.entries(state.credentials.held)) {
    if (h.status === 'active' && CREDENTIALS[id].jurisdiction === 'state' && player.chance(0.3)) tries.push(() => act('credentials.transfer', id));
  }
  // Politics
  if (age >= 18 && !state.politics.campaign && player.chance(0.04)) tries.push(() => act('politics.run', player.pick(Object.keys(OFFICES))));
  if (state.politics.campaign) tries.push(() => act(`politics.${player.pick(['fundraise', 'selfFund', 'canvass', 'debate'])}`), () => act('politics.endorse', player.pick(['labor', 'veterans', 'lawEnforcement', 'party', 'editorial', 'bar'])));
  if (age >= 17 && age < 40 && !state.military.service && player.chance(0.06)) {
    tries.push(() => act('military.enlist', `${player.pick(Object.keys(BRANCHES))}:${player.pick(['enlisted', 'officer'])}:${player.pick(['active', 'reserve'])}`));
  }
  if (state.military.service) tries.push(() => act(`military.${player.pick(['pt', 'extraDuty', 'requestDeployment', 'applyOCS', 'switchComponent', 'retire'])}`));
  if (state.military.service && player.chance(0.05)) tries.push(() => act('military.transferBranch', player.pick(Object.keys(BRANCHES))));
  if (state.military.service && player.chance(0.02)) tries.push(() => act('military.leaveService'));
  for (const id of Object.keys(SERVICES)) {
    if (!state.emergency[id] && player.chance(0.06)) tries.push(() => act('emergency.join', id));
    if (state.emergency[id]) {
      tries.push(() => act('credentials.pursue', player.pick(SERVICES[id].credentials)));
      tries.push(() => act(`emergency.${player.pick(['train', 'shift'])}`, id));
    }
  }
  if (age >= 17 && !state.education.enrolled && player.chance(0.25)) {
    const pid = player.pick(Object.keys(PROGRAMS));
    const major = player.pick(majorsFor(pid)) ?? '';
    tries.push(() => act('education.enroll', `${pid}:${player.pick(SCHOOLS_FOR(pid))}:${major}:${player.pick(['full', 'part'])}`));
  }
  if (state.education.enrolled) tries.push(() => act(player.pick(['education.study', 'education.study', 'education.switchPace'])));
  if (player.chance(0.06)) tries.push(() => act(`legal.${player.pick(RISKY_ACTIONS).id}`));
  // People
  if (state.people) {
    const folks = living(state).filter((p) => state.character.age + p.ageOffset >= 0);
    if (folks.length && player.chance(0.4)) tries.push(() => act(`people.${player.pick(['spendTime', 'spendTime', 'gift', 'argue'])}`, player.pick(folks).id));
    const partner = partnerOf(state);
    if (!partner && age >= 16 && player.chance(0.3)) tries.push(() => act('people.date'));
    if (partner?.relation === 'partner' && player.chance(0.3)) tries.push(() => act(player.chance(0.8) ? 'people.propose' : 'people.breakUp', partner.id));
    if (partner?.relation === 'fiance' && player.chance(0.5)) tries.push(() => act('people.wed', player.pick(Object.keys(WEDDINGS))));
    if (partner && player.chance(0.25)) tries.push(() => act('people.tryForBaby'));
    if (spouseOf(state) && player.chance(0.01)) tries.push(() => act('people.fileForDivorce'));
    if (age >= 18 && player.chance(0.04)) tries.push(() => act('people.writeWill', player.pick(Object.keys(WILL_PLANS))));
    if (age >= 18 && player.chance(0.03)) tries.push(() => act('people.lifeInsurance', `${player.pick(['self', 'spouse'])}:${player.pick([0, 250000, 500000])}`));
    const kids = livingChildren(state);
    if (kids.length && player.chance(0.1)) tries.push(() => act('people.contribute529', `${player.pick(kids).id}:${player.pick([1000, 5000])}`));
    if (state.people.arrears && player.chance(0.5)) tries.push(() => act('people.payArrears'));
    if (player.chance(0.03)) tries.push(() => act(player.pick(['people.makeFriend', 'people.adopt', 'people.askForMoney']), player.pick(folks)?.id));
  }
  // K-12
  if (age >= 5 && age < 18) {
    if (player.chance(0.08)) tries.push(() => act('k12.transfer', player.pick(Object.keys(SCHOOL_TYPES))));
    if (player.chance(0.4)) tries.push(() => act('k12.study'));
    if (player.chance(0.1)) tries.push(() => act('k12.skip'));
    if (player.chance(0.2)) tries.push(() => act('k12.toggleActivity', player.pick(Object.keys(ACTIVITIES))));
    if (age >= 12 && player.chance(0.2)) tries.push(() => act(state.k12.job && player.chance(0.3) ? 'k12.quitJob' : 'k12.takeJob', player.pick(Object.keys(TEEN_JOBS))));
    if (age >= 16 && player.chance(0.02)) tries.push(() => act('k12.dropOut'));
    if (state.k12.dropout && player.chance(0.3)) tries.push(() => act('k12.reenroll'));
  }
  if (age >= 16 && state.k12.dropout && player.chance(0.4)) tries.push(() => act('k12.ged'));
  // Campus
  if (state.education.enrolled) {
    if (player.chance(0.3)) tries.push(() => act(`campus.${player.pick(['rush', 'runForStudentGov', 'tryOut', 'party', 'party', 'studyAbroad', 'moveIntoDorm', 'moveOffCampus'])}`));
    if (player.chance(0.2)) tries.push(() => act('campus.club', player.pick(Object.keys(CLUBS))));
    if (!state.campus.greek && player.chance(0.25)) tries.push(() => act('campus.rush'));
    if (player.chance(0.3)) tries.push(() => act('campus.applyInternship', player.pick(PROFESSION_LIST).id));
    if (player.chance(0.06)) tries.push(() => act('campus.joinRotc', player.pick(ROTC_BRANCHES)));
    if (player.chance(0.03)) tries.push(() => act(player.pick(['campus.cheat', 'campus.quitRotc', 'campus.leaveGreek', 'campus.quitTeam'])));
  }
  if (age >= 16 && age <= 22 && player.chance(0.05)) tries.push(() => act('campus.seekNomination'));
  if (state.campus.nomination && !state.education.enrolled && player.chance(0.5)) tries.push(() => act('education.enroll', `bachelor:academy:${player.pick(majorsFor('bachelor'))}:full`));
  // Health
  if (player.chance(0.15)) tries.push(() => act('health.checkup'));
  for (const c of state.health.conditions) {
    if (!c.remission && c.diagnosed && !c.treated && player.chance(0.25)) tries.push(() => act(CONDITIONS[c.id].kind === 'addiction' ? 'health.rehab' : 'health.treat', c.id));
  }
  if (player.chance(0.02)) tries.push(() => act(player.pick(['health.toggleMarketplace', 'health.toggleDisabilityPolicy', 'health.claimDisability', 'health.payMedicalDebt', 'health.vaClaim'])));
  // Investing
  if (age >= 18) {
    if (player.chance(0.12)) tries.push(() => act('investing.buy', `${player.pick(Object.keys(ASSETS))}:${player.pick([500, 1000, 5000, 20000])}`));
    const held = Object.keys(state.investing.holdings);
    if (held.length && player.chance(0.06)) tries.push(() => act('investing.sell', player.pick(held)));
    if (player.chance(0.03)) tries.push(() => act(player.pick(['investing.rebalance', 'investing.toggleAuto', 'investing.iraWithdraw'])));
    if (player.chance(0.04)) tries.push(() => act('investing.setProfile', player.pick(Object.keys(PROFILES))));
    if (player.chance(0.04)) tries.push(() => act('retirement.setDcFund', player.pick(Object.keys(DC_FUNDS))));
    if (player.chance(0.1)) tries.push(() => act('investing.iraContribute', player.pick(['roth', 'traditional'])));
  }
  tries.push(() => act('activities.do', player.pick(['gym', 'library', 'meditate', 'doctor', 'vacation', 'salon'])));

  for (const t of player.shuffle(tries).slice(0, 5)) {
    if (!state.character.alive) return;
    resolveAllPrompts(state);
    t();
    checkInvariants(state);
  }
}

function resolveAllPrompts(state) {
  let guard = 0;
  while (state.prompts.length && state.character.alive) {
    assert.ok(guard++ < 60, 'prompt loop');
    const prompt = state.prompts[0];
    promptTypes.add(prompt.type);
    if (prompt.type === 'legal.immunity') totals.immunity += 1;
    const options = prompt.options.filter((o) => !o.disabled);
    assert.ok(options.length > 0, `prompt ${prompt.type} has no options`);
    totals.prompts += 1;
    const pick = player.pick(options).id;
    try {
      assert.ok(engine.resolvePrompt(prompt.id, pick), `resolve ${prompt.type}`);
    } catch (e) {
      throw new Error(`${prompt.type}/${pick}: ${e.stack}`);
    }
    checkInvariants(state);
  }
}

/** Estate conservation: gross estate = funeral + debts paid + estate tax + bequests. */
function checkEstate(state) {
  const l = state.legacy;
  assert.ok(l, 'estate settled at death');
  const out = l.funeral + l.debtsPaid + l.tax + l.bequests.reduce((s, b) => s + b.amount, 0);
  assert.equal(out, l.assets, `estate conserves assets (${l.assets} → ${out})`);
  assert.ok(l.bequests.every((b) => b.amount >= 0) && l.tax >= 0 && l.debtsPaid <= l.debts, 'estate amounts sane');
}

for (let life = 0; life < LIVES; life++) {
  let state = engine.newLife();
  let generation = 1;
  for (;;) {
  let years = 0;
  let managed = false;
  let autoYears = 0;
  let peakNetWorth = 0;
  // A third of lives play as disciplined investors: auto-invest on from the first job, Roth every year.
  const investor = life % 3 === 0;
  let combat = false;
  let responder = false;
  while (state.character.alive) {
    randomActions(state);
    if (investor && state.career.job && state.character.age >= 18) {
      if (!state.investing.auto.enabled) act('investing.toggleAuto');
      act('investing.iraContribute', 'roth');
    }
    resolveAllPrompts(state);
    if (!state.character.alive) break;
    assert.ok(engine.ageUp(), 'ageUp should succeed when no prompts pending');
    checkInvariants(state);
    if (state.career.job?.department) managed = true;
    if (state.investing.auto.enabled) autoYears += 1;
    if (state.military.service?.combatTours) combat = true;
    if (['police', 'statePolice', 'fire', 'ems', 'corrections'].includes(state.career.job?.professionId) || Object.values(state.emergency).some((m) => m?.calls >= 10)) responder = true;
    peakNetWorth = Math.max(peakNetWorth, netWorth(state));
    if (years % 7 === 0 || state.prompts.length) renderAll(state);
    if (state.career.job?.professionId === 'foreignService') totals.fso += 1;
    years += 1;
    assert.ok(years < 130, 'life should end');
  }
  totals.years += years;
  totals.maxAge = Math.max(totals.maxAge, state.character.age);
  const cause = state.character.causeOfDeath.split(' — ')[0];
  totals.deaths[cause] = (totals.deaths[cause] ?? 0) + 1;
  const peak = Math.max(0, ...state.career.history.map((h) => h.peakGrade), state.career.job?.peakGrade ?? 0);
  totals.peakGrade[`G${peak}`] = (totals.peakGrade[`G${peak}`] ?? 0) + 1;
  totals.convictions += state.legal.record.filter((r) => r.severity !== 'infraction').length;
  if (state.legal.record.some((r) => /prison/.test(r.sentence))) totals.prison += 1;
  totals.credentials += Object.keys(state.credentials.held).length;
  totals.degrees += state.education.degrees.filter((d) => d.type !== 'highschool').length;
  if (state.retirement.pensions.length) totals.pensions += 1;
  if (managed) totals.managers += 1;
  if (state.housing.everOwned) totals.homeowners += 1;
  if (state.housing.credit.events.some((e) => e.type === 'foreclosure')) totals.foreclosures += 1;
  if (state.politics.everRan) totals.ranForOffice += 1;
  if (state.politics.history.length || state.politics.office) totals.officeHolders += 1;
  if ([...state.politics.history.map((h) => h.officeId), state.politics.office?.id].includes('governor')) totals.governors += 1;
  if (state.housing.homelessYears) totals.homeless += 1;
  if (peakNetWorth >= 1e6) totals.millionaires += 1;
  const group = totals.ptsd[combat ? 'combat' : responder ? 'responder' : 'other'];
  group[1] += 1;
  if (state.health.conditions.some((c) => c.id === 'ptsd')) group[0] += 1;
  if (state.health.history.some((e) => /disability/.test(e.text))) totals.onDisability += 1;
  if (state.health.va.rating) totals.vaRated += 1;
  if (state.health.rehabs) totals.rehab += 1;
  if (state.campus.internships.length) totals.interns += 1;
  if (state.campus.mentors.length) totals.mentored += 1;
  if (state.campus.expelledAge != null) totals.expelled += 1;
  if (state.campus.greekAlumni) totals.greek += 1;
  if (state.campus.abroad.length) totals.abroad += 1;
  if (state.education.degrees.some((d) => d.honorsCollege)) totals.honorsCollege += 1;
  if (state.campus.returnHire) totals.returnHires += 1;
  if (state.campus.commissionedVia === 'academy') totals.academyGrads += 1;
  if (state.campus.commissionedVia === 'rotc') totals.rotcOfficers += 1;
  if (investor && autoYears >= 20) {
    totals.investors += 1;
    if (peakNetWorth >= 1e6) totals.investorMillionaires += 1;
  }
  const hist = state.economy.history;
  totals.econYears += hist.length;
  totals.recessions += hist.filter((h, i) => h.phase === 'recession' && hist[i - 1]?.phase !== 'recession').length;
  totals.layoffs += state.career.history.filter((h) => /Laid off/.test(h.reason)).length;
  if (state.publicService.clearance || state.career.history.some((h) => ['foreignService', 'intelligence', 'oig', 'regulatory'].includes(h.professionId))) totals.clearances += 1;

  renderer.obituary(state);
  renderAll(state);
  const restored = new Store(engine.store.storage).load();
  assert.deepEqual(restored, state);
  checkEstate(state);
  totals.estates += 1;
  if (state.k12.history.length || state.k12.type !== 'public') totals.privateSchool += state.k12.history.some((h) => ['private', 'boarding', 'religious', 'militaryPrep'].includes(h.type)) || ['private', 'boarding', 'religious', 'militaryPrep'].includes(state.k12.type) ? 1 : 0;
  if (state.k12.jobYears) totals.teenWorkers += 1;
  if (state.k12.dropout || state.education.degrees.some((d) => d.programId === 'ged')) totals.dropouts += 1;
  if (state.education.degrees.some((d) => d.programId === 'ged')) totals.geds += 1;
  const hsDiploma = state.education.degrees.find((d) => d.type === 'highschool' && d.programId === 'highschool');
  if (hsDiploma?.gpa != null) { totals.gpaSum += hsDiploma.gpa; totals.gpaN += 1; }
  if (state.people.marriages) totals.married += 1;
  if (state.people.divorces) totals.divorced += 1;
  if (state.people.list.some((p) => p.relation === 'child')) totals.parents += 1;
  // Continue as a child (up to four generations).
  const heirs = livingChildren(state);
  if (generation >= 4 || !heirs.length || !player.chance(0.6)) break;
  const heir = player.pick(heirs);
  state = engine.continueAsChild(heir.id);
  assert.ok(state?.character.alive, 'heir is alive');
  assert.equal(state.lineage.generation, generation + 1, 'lineage generation');
  assert.equal(state.character.firstName, heir.firstName);
  checkInvariants(state);
  generation += 1;
  totals.generations += 1;
  totals.maxGeneration = Math.max(totals.maxGeneration, generation);
  }
}

console.log(`✔ Simulated ${LIVES} lives (${totals.years} years, ${totals.prompts} decisions) without errors.`);
console.log(`  avg lifespan ${(totals.years / LIVES).toFixed(1)}, max age ${totals.maxAge}`);
console.log(`  avg credentials ${(totals.credentials / LIVES).toFixed(1)}, avg degrees ${(totals.degrees / LIVES).toFixed(1)}, lives w/ pensions ${totals.pensions}, managers ${totals.managers}, cleared ${totals.clearances}`);
console.log(`  convictions ${totals.convictions}, lives with prison ${totals.prison}, immunity prompts ${totals.immunity}, FSO-years ${totals.fso}`);
console.log(`  economy: a recession every ${(totals.econYears / Math.max(1, totals.recessions)).toFixed(1)} yrs, ${totals.layoffs} layoffs`);
console.log(`  investing: ${totals.millionaires} lives peaked as millionaires (${((totals.millionaires / LIVES) * 100).toFixed(0)}%); disciplined investors ${totals.investorMillionaires}/${totals.investors} (${((totals.investorMillionaires / Math.max(1, totals.investors)) * 100).toFixed(0)}%)`);
const rate = ([n, d]) => `${n}/${d} (${((n / Math.max(1, d)) * 100).toFixed(0)}%)`;
console.log(`  health: PTSD combat ${rate(totals.ptsd.combat)}, first responders ${rate(totals.ptsd.responder)}, others ${rate(totals.ptsd.other)}; disability ${totals.onDisability}, VA-rated ${totals.vaRated}, rehab ${totals.rehab}`);
console.log(`  campus: interned ${totals.interns}, return-offer hires ${totals.returnHires}, mentored ${totals.mentored}, Greek alumni ${totals.greek}, honors college ${totals.honorsCollege}, studied abroad ${totals.abroad}, expelled ${totals.expelled}, ROTC officers ${totals.rotcOfficers}, academy grads ${totals.academyGrads}`);
console.log(`  k12: ${totals.privateSchool} attended private/religious/boarding/military schools · ${totals.teenWorkers} held teen jobs · ${totals.dropouts} dropped out (${totals.geds} earned a GED) · mean high-school GPA ${(totals.gpaSum / Math.max(1, totals.gpaN)).toFixed(2)}`);
console.log(`  people: ${totals.married} ever married, ${totals.divorced} divorced, ${totals.parents} parents · ${totals.generations} heirs continued, deepest line ${totals.maxGeneration} generations · ${totals.estates} estates settled and balanced`);
console.log(`  homeowners ${totals.homeowners}, foreclosures ${totals.foreclosures}, ever homeless ${totals.homeless}, ran for office ${totals.ranForOffice}, held office ${totals.officeHolders}, governors ${totals.governors}`);
console.log('  peak grade:', totals.peakGrade);
console.log('  causes of death:', totals.deaths);
console.log(`  prompt types seen (${promptTypes.size}):`, [...promptTypes].sort().join(', '));
