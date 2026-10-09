/**
 * Headless smoke test: plays hundreds of complete lives with a random-but-
 * plausible player (school, licenses, exams, jobs, management, unions,
 * military, volunteering, crime, retirement) choosing random prompt options,
 * and asserts the state stays valid throughout.
 *
 *   node tests/simulate.js [lives=300] [seed=1]
 */
import { PROPERTY_TYPES } from '../src/modules/realestate/PropertyMarket.js';
import { CAUSES, TACTICS } from '../src/modules/civic/Activism.js';
import { FRANCHISE_BRANDS } from '../src/modules/business/Franchising.js';
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
import { STATES } from '../src/modules/life/States.js';
import { DUTIES } from '../src/modules/career/ManagementEngine.js';
import { Renderer, VIEWS } from '../src/ui/Renderer.js';
import { OFFICES } from '../src/modules/politics/index.js';
import { RENT_TIERS, RENOVATIONS, housingStatus } from '../src/modules/realestate/index.js';
import { promptModal } from '../src/ui/Components.js';
import { ASSETS, PROFILES, DC_FUNDS } from '../src/modules/investing/index.js';
import { netWorth } from '../src/core/State.js';
import { TRADITIONS, VOLUNTEER_ORGS, ATTENDANCE } from '../src/modules/community/Community.js';
import { CIRCLES, FRIEND_CAP, friendsOf, circleFriends } from '../src/modules/people/Friends.js';
import { ARRANGEMENTS } from '../src/modules/people/ElderCare.js';
import { VEHICLE_TYPES } from '../src/modules/vehicles/Vehicles.js';
import { CARD_TYPES } from '../src/modules/life/CreditCards.js';
import { GIGS } from '../src/modules/career/GigWork.js';
import { WORK_MODES } from '../src/modules/career/JobMarket.js';
import { BASES } from '../src/modules/career/WorkplaceClaims.js';
import { CLAIMS } from '../src/modules/legal/CivilCourts.js';
import { COURTS } from '../src/modules/legal/Judiciary.js';
import { THERAPIES, MEDS } from '../src/modules/health/MentalHealth.js';
import { hasFelony as hasFelonyNow } from '../src/core/State.js';
const BASES_OK = Object.keys(BASES);
import { CONDITIONS } from '../src/modules/health/index.js';
import { SCHOOL_TYPES, ACTIVITIES, TEEN_JOBS, MAX_ACTIVITIES } from '../src/modules/education/K12.js';
import { BUSINESS_TYPES, ENTITIES } from '../src/modules/business/BusinessTypes.js';
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

const totals = { recessions: 0, econYears: 0, layoffs: 0, homeowners: 0, foreclosures: 0, ranForOffice: 0, governors: 0, officeHolders: 0, homeless: 0, years: 0, deaths: {}, prompts: 0, maxAge: 0, peakGrade: {}, convictions: 0, prison: 0, credentials: 0, degrees: 0, pensions: 0, managers: 0, unions: 0, clearances: 0, fso: 0, immunity: 0, generations: 0, maxGeneration: 1, married: 0, divorced: 0, parents: 0, estates: 0, investors: 0, investorMillionaires: 0, millionaires: 0, speculators: 0, ptsd: { combat: [0, 0], responder: [0, 0], other: [0, 0] }, medicalBankrupt: 0, onDisability: 0, vaRated: 0, rehab: 0, interns: 0, returnHires: 0, mentored: 0, rotcOfficers: 0, academyGrads: 0, expelled: 0, greek: 0, honorsCollege: 0, abroad: 0, owners: 0, bizExits: 0, bizFailures: 0, dropouts: 0, geds: 0, privateSchool: 0, teenWorkers: 0, gpaSum: 0, gpaN: 0 };
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
  const inc = state.legal.incarceration;
  if (inc?.deathRow) assert.ok(['active', 'moratorium', 'rare'].includes(STATES[inc.deathRow.state]?.deathPenalty), `death row in ${inc.deathRow.state}`);
  assert.ok(!(inc && state.legal.fugitive), 'fugitive in prison');
  assert.ok((state.education.credits ?? []).every((c) => PROGRAMS[c.programId] && c.years > 0), 'transfer credits');
  const b = state.business.current;
  if (b) {
    assert.ok(BUSINESS_TYPES[b.typeId] && ENTITIES[b.entity], 'business type/entity');
    for (const k of ['cash', 'assets', 'valuation', 'arr', 'quality', 'reputation']) assert.ok(Number.isFinite(b[k]), `business ${k} finite`);
    assert.ok(b.valuation >= 0 && b.assets >= 0 && b.arr >= 0, 'business values non-negative');
    assert.ok(b.ownerPct > 0 && b.ownerPct <= 1, `owner stake ${b.ownerPct}`);
    assert.ok(Number.isInteger(b.staff.headcount) && b.staff.headcount >= 0, 'headcount');
    assert.ok(b.staff.morale >= 0 && b.staff.morale <= 100 && b.staff.unionRisk >= 0 && b.staff.unionRisk <= 100, 'staff meters');
    assert.ok(debtOk(b), `business debts ${JSON.stringify(b.debts)}`);
    assert.ok(b.family.every((id) => state.people.list.some((p) => p.id === id)), 'family employees exist');
    assert.ok(!(b.franchise && b.franchisor), 'franchisee and franchisor at once');
    if (b.franchise) assert.ok(FRANCHISE_BRANDS[b.franchise.brandId] && b.franchise.signedYears >= 0, 'franchise agreement');
    if (b.franchisor) assert.ok(Number.isInteger(b.franchisor.units) && b.franchisor.units >= 0, 'franchise units');
    // Franchise units can be a smaller format (a 0.6-size pizza unit), so scale isn't always whole.
    assert.ok(b.scale > 0 && (Number.isInteger(b.scale) || b.franchise), `business scale ${b.scale}`);
    assert.ok(Number.isFinite(b.staff.costPremium) && b.staff.costPremium > -0.5 && b.staff.costPremium < 3, `labor cost premium ${b.staff.costPremium}`);
    if (b.union) assert.ok(b.staff.unionized && state.unions.byId[b.union.unionId], 'business union local');
  }
  for (const h of state.business.holdings ?? []) assert.ok(Number.isFinite(h.cash) && Number.isFinite(h.valuation) && h.ownerPct > 0 && h.ownerPct <= 1 && h.scale > 0, `holding ${h.name}`);
  for (const u of Object.values(state.unions?.byId ?? {})) assert.ok(u.members > 0 && u.treasury >= 0 && u.strikeFund >= 0 && u.density > 0 && u.density <= 1 && Number.isFinite(u.militancy), `union ${u.name}`);
  if (state.unions?.mine) assert.ok(state.career.job?.unionMember && state.unions.byId[state.unions.mine.unionId], 'union membership follows the job');
  for (const body of Object.values(state.legislature?.bodies ?? {})) assert.ok(body.labor >= 0 && body.labor <= body.seats && body.leaders?.presiding?.name, `legislature ${body.name}`);
  if (state.legislature?.seat) assert.ok(state.politics.office && state.legislature.bodies[state.legislature.seat.bodyId], 'legislative seat follows the office');
  if (state.farm?.acres) assert.ok(state.farm.valuePerAcre > 0 && (!state.farm.loan || state.farm.loan.balance >= 0), 'farm');
  const civ = state.civic;
  assert.ok(civ && Array.isArray(civ.neighbors) && civ.neighbors.every((n) => n.rel >= 0 && n.rel <= 100), 'neighbors');
  if (civ.activism) assert.ok(civ.activism.influence >= 0 && civ.activism.influence <= 100 && (!civ.activism.cause || CAUSES[civ.activism.cause]), 'activism');
  if (civ.hoa) assert.ok(civ.hoa.fines >= 0 && civ.hoa.name, 'hoa');
  for (const l of Object.values(civ.local)) assert.ok(l.taxMult >= 0.7 && l.taxMult <= 1.6 && l.levy >= 0 && l.services >= 0 && l.services <= 100, 'local policy');
  if (state.world.war) assert.ok(state.world.war.intensity >= 1 && state.world.war.intensity <= 3 && state.world.war.yearsLeft > 0, 'war');
  const cm = state.community;
  assert.ok(cm && Array.isArray(cm.volunteering) && cm.volunteering.length <= 2 && cm.volunteering.every((v) => VOLUNTEER_ORGS[v]), 'volunteering');
  assert.ok(!cm.faith || (TRADITIONS[cm.faith.traditionId] && ATTENDANCE[cm.faith.attendance] && cm.faith.congregation), 'faith membership');
  assert.ok([0, 2, 5, 10].includes(cm.giving) && cm.givenThisYear >= 0, 'giving');
  assert.ok(circleFriends(state).length <= FRIEND_CAP, 'friend cap');
  assert.ok(friendsOf(state).every((f) => !f.circle || CIRCLES[f.circle]), 'friend circles');
  if (state.career.job?.professionId === 'clergy') assert.ok(cm.faith || !state.character.alive, `clergy belong to a faith (age ${state.character.age}, job since ${state.career.job.startAge}, former ${JSON.stringify(cm.former)}, log: ${state.log.at(-1).entries.map((e) => e.text).join(' | ')})`);
  for (const v of state.vehicles.owned) {
    assert.ok(VEHICLE_TYPES[v.typeId] && Number.isFinite(v.value) && v.value > 0, 'vehicle value');
    assert.ok(!(v.loan && v.lease), 'loan and lease at once');
    assert.ok(!v.loan || (v.loan.balance > 0 && v.loan.yearsLeft > 0 && v.loan.payment > 0), `vehicle loan ${JSON.stringify(v.loan)}`);
    assert.ok(!v.lease || v.lease.yearsLeft >= 0, 'lease term');
  }
  const g = state.gig.active;
  assert.ok(!g || (GIGS[g.gigId] && g.rating >= 4.2 && g.rating <= 5 && !(g.hours === 'full' && state.career.job)), 'gig');
  if (state.career.job) assert.ok(WORK_MODES[state.career.job.workMode ?? 'onsite'] && Boolean(state.career.job.remote) === (state.career.job.workMode === 'remote' || (!state.career.job.workMode && Boolean(state.career.job.remote))), `work mode ${state.career.job.workMode}/${state.career.job.remote}`);
  const cl = state.career.claims;
  assert.ok(cl && (!cl.active || BASES_OK.includes(cl.active.basis)) && cl.history.every((h) => h.net >= 0), 'claims');
  for (const c of state.health.conditions) {
    if (!c.care) continue;
    assert.ok((!c.care.therapy || THERAPIES[c.care.therapy]) && (!c.care.meds || MEDS[c.care.meds]), 'care plan');
    if (!c.remission) assert.equal(c.treated, Boolean((c.care.therapy && !c.care.waitlist) || c.care.meds || (c.care.waitlist && c.treated)), `treated mirrors care ${JSON.stringify(c.care)}`);
  }
  const claim = state.health.disability.ssdiClaim;
  assert.ok(!claim || (['initial', 'reconsideration', 'hearing', 'council'].includes(claim.stage) && !state.health.disability.benefits.some((b) => b.source === 'ssdi')), 'ssdi claim');
  const msvc = state.military.service;
  if (msvc?.clearance) assert.ok(['secret', 'topSecret'].includes(msvc.clearance) && state.publicService.clearance && ['secret', 'topSecret'].includes(state.publicService.clearance.level), `military clearance ${msvc.clearance}/${JSON.stringify(state.publicService.clearance)}`);
  const em = state.career.emeritus;
  assert.ok(!em || (/Emerit(us|a)$/.test(em.title) && em.publications >= 0 && !hasFelonyNow(state)), 'emeritus');
  const jd = state.judiciary;
  assert.ok(!jd.seat || (COURTS[jd.seat.court] && jd.seat.reputation >= 0 && jd.seat.reputation <= 100 && !(state.politics.office?.id === 'judge')), 'bench seat');
  assert.ok(!(jd.seat && state.career.job), 'judge with a job');
  const cv = state.civil;
  assert.ok(cv.judgments >= 0 && cv.suits.every((s) => s.amount > 0 && ['plaintiff', 'defendant'].includes(s.role)), 'civil suits');
  const ep = state.people.plan;
  assert.ok(ep && ep.exemptionUsed >= 0 && Object.values(ep.gifts).every((g) => g >= 0), 'estate plan');
  assert.ok((state.finances.trustPayouts ?? []).every((p) => p.amount >= 0 && p.age > state.character.age - 1), 'trust payouts');
  const cc = state.finances.cards;
  assert.ok(cc.held.length <= 5 && cc.held.every((c) => CARD_TYPES[c.typeId]) && ['payoff', 'minimum'].includes(cc.strategy) && (!cc.transfer || cc.transfer.amount >= 0), 'cards');
  const tx = state.finances.tax;
  assert.ok(Number.isFinite(tx.debt) && tx.debt >= 0 && (!tx.plan || tx.plan.annual > 0), `tax debt ${JSON.stringify(tx)}`);
  assert.ok(state.vehicles.owned.length <= 6 && state.vehicles.record.points >= 0, 'garage');
  for (const [id, c] of Object.entries(state.elderCare.cases)) {
    assert.ok(['help', 'full'].includes(c.level) && (!c.arrangement || ARRANGEMENTS[c.arrangement]) && c.personId === id, 'care case');
    assert.ok(!(c.arrangement === 'assisted' && c.level === 'full'), 'assisted living is for help-level care');
  }
  assert.ok(state.people.parentAssets == null || state.people.parentAssets >= 0, 'parent assets');
  const plan = state.finances.ch13;
  assert.ok(!plan || (plan.yearsLeft > 0 && plan.annual > 0), 'chapter 13 plan');
  assert.ok(Number.isFinite(state.finances.cash), 'cash finite');
  assert.ok(!state.career.leave || state.career.leave.job?.employer, 'military leave holds a job');
  assert.ok(!state.career.job || state.career.job.probationLeft == null || state.career.job.probationLeft >= 0, 'probation');
  assert.ok(state.yearly['cred.attempts'] == null || state.yearly['cred.attempts'] <= 2, 'credential attempts per year');
  assert.ok(state.credentials.training.length <= 2, 'training programs');
  assert.ok(Object.values(state.credentials.failures).every((n) => Number.isInteger(n) && n > 0), 'failure counts');
  assert.ok(hl.trauma >= 0 && [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].includes(hl.va.rating), 'trauma / VA rating');
}

function debtOk(b) {
  const sba = b.debts.sba;
  return (!sba || (sba.balance > 0 && Number.isFinite(sba.annual))) && (b.debts.loc ?? 0) >= 0 && (b.debts.payables ?? 0) >= 0;
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
  if (state.legal.incarceration) {
    for (const id of ['prisonStudy', 'prisonWork', 'prisonProgram', 'prisonVisit', 'prisonWorkout', 'prisonParole']) if (player.chance(0.5)) tries.push(() => act(`legal.${id}`));
    if (player.chance(0.1)) tries.push(() => act('legal.prisonAppeal', player.pick(['lawyer', 'proSe'])));
    if (player.chance(0.05)) tries.push(() => act(player.pick(['legal.prisonGang', 'legal.prisonEscape', 'legal.seekPardon'])));
  }
  if (state.legal.record.length && player.chance(0.1)) tries.push(() => act(player.pick(['legal.sealRecord', 'legal.seekPardon'])));
  if (age >= 15) tries.push(() => act('credentials.pursue', player.pick(CRED_IDS)));
  // Business
  const biz = state.business.current;
  if (!biz && age >= 18 && player.chance(0.05)) tries.push(() => act('business.start', `${player.pick(Object.keys(BUSINESS_TYPES))}:${player.pick(['cash', 'sba'])}:${player.pick(Object.keys(ENTITIES))}`));
  // Unions and legislatures
  if (state.career.job?.employer?.union && player.chance(0.2)) tries.push(() => act(player.pick(['career.joinUnion', 'career.leaveUnion'])));
  if (state.unions?.mine && player.chance(0.3)) tries.push(() => act('unions.run', player.pick(['steward', 'officer', 'president'])), () => act(player.pick(['unions.organize', 'unions.mobilize', 'unions.strikeFund', 'unions.endorse', 'unions.stepDown'])), () => act('unions.dues', player.pick(['low', 'standard', 'high'])));
  if (state.legislature?.seat && player.chance(0.4)) tries.push(() => act('legislature.sponsor', `${player.pick(['minWage', 'rightToWork', 'cardCheck', 'paidLeave', 'businessTax', 'corporateRate', 'smallBizCredit', 'licensing', 'antitrust', 'rentControl', 'infrastructure', 'publicPay'])}|${player.pick(['up', 'down'])}`), () => act('legislature.runPost', player.pick(['chair', 'whip', 'majority', 'presiding'])), () => act('legislature.hireStaff', player.pick(['chiefOfStaff', 'legislativeDirector', 'communications', 'caseworker'])), () => act('legislature.committee', player.pick(['labor', 'commerce', 'appropriations'])));
  if (age >= 25 && !state.politics.office && !state.politics.campaign && player.chance(0.02)) tries.push(() => act('politics.run', player.pick(['cityCouncil', 'stateRep', 'stateSenator', 'usRep'])));
  if (state.career.job?.professionId === 'education' && player.chance(0.2)) tries.push(() => act('teaching.summer', player.pick(['rest', 'summerSchool', 'camp', 'tutoring', 'seasonal', 'curriculum'])));
  if (age >= 16 && player.chance(0.05)) tries.push(() => act('transit.setMode', player.pick(['auto', 'drive', 'transit', 'bike', 'walk', 'rideshare'])));
  if (age >= 25 && player.chance(0.02)) tries.push(() => act('civic.transitBoard'), () => act('politics.applyAppointed', 'cityManager'));
  if (age >= 18 && player.chance(0.02)) tries.push(() => act('farm.buy', `${player.pick([80, 160, 320])}:${player.pick(['loan', 'cash'])}`));
  if (state.farm?.acres && player.chance(0.2)) tries.push(() => act('farm.setCrop', player.pick(['corn', 'soybeans', 'wheat', 'hay', 'cattle'])), () => act('farm.insurance', player.pick(['0', '0.7', '0.85'])), () => act('farm.setMode', player.pick(['operate', 'rent'])), () => act('farm.sell'));
  const cv = state.civic;
  if (age >= 14 && player.chance(0.04)) tries.push(() => act('civic.joinCause', player.pick(Object.keys(CAUSES))));
  if (cv.activism && player.chance(0.3)) tries.push(() => act('civic.protest', player.pick(Object.keys(TACTICS))));
  if (cv.hoa && player.chance(0.15)) tries.push(() => act('civic.hoaRun'), () => act('civic.hoaFight', player.pick(['pay', 'sue', 'recall'])));
  if (player.chance(0.05)) tries.push(() => act('civic.ptaJoin'), () => act('civic.ptaRun'), () => act('civic.watchJoin'));
  if (cv.neighbors.length && player.chance(0.1)) tries.push(() => act('civic.visitNeighbor', player.pick(cv.neighbors).id));
  if (!biz && age >= 21 && player.chance(0.03)) tries.push(() => act('business.franchise', `${player.pick(Object.keys(FRANCHISE_BRANDS))}:${player.pick(['cash', 'sba'])}:llc`));
  if (biz && player.chance(0.05)) tries.push(() => act('business.franchiseOut'));
  if (!biz && state.business.listings.length && player.chance(0.05)) tries.push(() => act('business.buy', `${player.pick(state.business.listings).id}:${player.pick(['cash', 'sba'])}`));
  // Start a business you can afford (and are qualified for) — so business paths get exercised.
  if (!biz && age >= 22 && age <= 60 && player.chance(0.06)) {
    const affordable = Object.entries(BUSINESS_TYPES).filter(([, t]) => !t.startup && t.cost <= Math.max(0, state.finances.cash) * 0.8);
    if (affordable.length) tries.push(() => act('business.start', `${player.pick(affordable)[0]}:${player.pick(['cash', 'sba'])}:${player.pick(['llc', 'scorp', 'ccorp'])}`));
  }
  if (biz) {
    if (player.chance(0.3)) tries.push(() => act(`business.${player.pick(['setRole', 'setMarketing', 'setDraw', 'setWorkforce', 'toggleDelegation', 'toggleHealth', 'setMatch'])}`, player.pick(['operator', 'absentee', '0', '1', '2', '3', '0.5', 'direct', 'mixed', 'contracted', 'hiring', 'reviews', '0.03', '0.05'])));
    if (player.chance(0.3)) tries.push(() => act(`business.${player.pick(['raise', 'hire', 'layoff', 'expand', 'loan'])}`, player.pick(['5', 'cash', 'sba'])));
    if (player.chance(0.05)) tries.push(() => act('business.convert', player.pick(Object.keys(ENTITIES))));
    if (player.chance(0.1)) tries.push(() => act('business.hireRelative', player.pick(state.people.list)?.id));
    if (player.chance(0.03)) tries.push(() => act(`business.${player.pick(['sell', 'close', 'bankrupt'])}`));
    // Growth, governance and capital.
    if (player.chance(0.25)) tries.push(() => act(player.pick(['business.handOff', 'business.makePassive', 'business.leavePost', 'business.saleLeaseback'])));
    if (player.chance(0.25)) tries.push(() => act('business.setPlan', player.pick(['steady', 'aggressive', 'harvest', 'off'])), () => act('business.expand', `${player.pick(['cash', 'sba'])}:${player.int(1, 3)}`));
    if (player.chance(0.2)) tries.push(() => act('business.takePost', player.pick(['ceo', 'president', 'chair'])), () => act('business.setFocus', player.pick(['growth', 'efficiency', 'quality', 'people', 'brand'])), () => act('business.execMove', player.pick(['townHall', 'bigClient', 'restructure', 'innovation', 'investorDay'])), () => act('business.setPay', player.pick(['modest', 'market', 'top'])));
    if (player.chance(0.15)) tries.push(() => act('business.appointDirector', player.pick(['operator', 'finance', 'marketing', 'people', 'governance'])), () => act('business.buyPremises', player.pick(['cash', 'loan'])));
    if (player.chance(0.15)) tries.push(() => act('business.capitalIn', `${biz.id}:${player.pick([25000, 100000])}`), () => act('business.capitalOut', `${biz.id}:max`), () => act('business.buyBack', `${biz.id}:0.1:${player.pick(['you', 'company'])}`));
    if (player.chance(0.1)) tries.push(() => act('business.toggleInitiative', player.pick(['loyalty', 'salesTeam', 'telematics', 'training', 'energy'])), () => act('business.promote', player.pick(['sale', 'sponsor', 'tradeShow', 'webinar', 'rfpBlitz'])));
    if (player.chance(0.08)) tries.push(() => act('business.formConglomerate'));
    if (player.chance(0.15)) tries.push(() => act('business.setDesign', player.pick(['functional', 'regional', 'lean'])), () => act('business.toggleDivision', player.pick(['bizdev', 'rnd', 'compliance', 'people', 'procurement'])), () => act('business.spinOff', player.pick(['denver', 'chicago', 'miami', 'atlanta', 'phoenix'])));
    if (player.chance(0.1)) tries.push(() => act(player.pick(['business.goPublic', 'business.sellShares', 'business.buyback', 'business.takePrivate'])));
    if (player.chance(0.05)) tries.push(() => act('legislature.lobby', `${player.pick(['minWage', 'rightToWork', 'smallBizCredit', 'antitrust', 'businessTax', 'paidLeave'])}|${player.pick(['up', 'down'])}|${player.pick(['city', 'state', 'federal'])}`));
  }
  const groupsNow = state.business.rivalGroups ?? [];
  if (state.business.conglomerate && groupsNow.length && player.chance(0.03)) tries.push(() => act('business.bidForGroup', player.pick(groupsNow).name));
  if (state.business.conglomerate && player.chance(0.1)) tries.push(() => act('business.hireExec', player.pick(['president', 'cfo', 'coo', 'cmo'])), () => act('business.hqOffice', player.pick(['virtual', 'suite', 'floor'])));
  for (const h of state.business.holdings ?? []) if (player.chance(0.05)) tries.push(() => act('business.focus', h.id));
  // Mental health & SSDI
  const mental = state.health.conditions.filter((c) => ['depression', 'anxiety', 'ptsd'].includes(c.id) && !c.remission && c.diagnosed);
  if (mental.length && player.chance(0.3)) {
    const cid = player.pick(mental).id;
    tries.push(() => act(player.chance(0.5) ? 'mental.therapy' : 'mental.meds', `${cid}:${player.pick([...Object.keys(THERAPIES), ...Object.keys(MEDS), 'none', 'stop', 'taper'])}`));
  }
  if (player.chance(0.05)) tries.push(() => act('ssdi.apply'));
  // Emeritus faculty
  if (state.career.emeritus && player.chance(0.2)) tries.push(() => act(`emeritus.${player.pick(['teach', 'research', 'lecture'])}`));
  // Courts
  if (age >= 18 && player.chance(0.04)) tries.push(() => act('civil.sue', player.pick(Object.keys(CLAIMS))));
  if (state.judiciary.seat && player.chance(0.02)) tries.push(() => act('judiciary.resign'));
  // Job market, gig work
  if (state.career.job && player.chance(0.15)) tries.push(() => act('jobMarket.search'));
  if (state.career.job && player.chance(0.1)) tries.push(() => act(player.pick(['career.chiefSearch', 'career.fedTransfer', 'career.execRecruiter'])));
  if (state.career.job && player.chance(0.05)) tries.push(() => act('jobMarket.workMode', player.pick(Object.keys(WORK_MODES))));
  if (age >= 16 && player.chance(0.06)) tries.push(() => act('gig.start', `${player.pick(Object.keys(GIGS))}:${player.pick(['side', 'full'])}`));
  if (state.gig.active && player.chance(0.05)) tries.push(() => act(player.chance(0.5) ? 'gig.stop' : 'gig.hours', player.pick(['side', 'full'])));
  // Estate planning
  if (age >= 25 && player.chance(0.03)) tries.push(() => act('estate.trust', player.pick(['trust', 'ilit', 'minorsTrust'])));
  if (age >= 25 && player.chance(0.03)) tries.push(() => act('estate.beneficiary', player.pick(['none', 'children', ...state.people.list.map((p) => p.id)])));
  if (age >= 25 && state.finances.cash > 20000 && player.chance(0.05)) tries.push(() => act('estate.gift', `${player.pick(state.people.list)?.id}:${player.pick([5000, 19000, 50000])}`));
  // Credit cards
  if (age >= 18 && player.chance(0.06)) tries.push(() => act('cards.apply', player.pick(Object.keys(CARD_TYPES))));
  if (state.finances.cards.held.length && player.chance(0.03)) {
    const cid = player.pick(state.finances.cards.held).id;
    tries.push(() => act('cards.close', cid));
  }
  if (player.chance(0.05)) tries.push(() => act('cards.strategy', player.pick(['payoff', 'minimum'])));
  if (state.finances.cash < 0 && player.chance(0.1)) tries.push(() => act('cards.transfer'));
  // Taxes
  if (state.finances.tax.debt && player.chance(0.2)) tries.push(() => act(player.pick(['taxes.payDebt', 'taxes.requestPlan'])));
  if (age >= 18 && player.chance(0.01)) tries.push(() => act('legal.taxCheat'));
  // Vehicles
  if (age >= 16 && player.chance(0.08)) tries.push(() => act('vehicles.buy', `${player.pick(Object.keys(VEHICLE_TYPES))}:${player.pick(['cash', 'loan', 'lease'])}`));
  if (state.vehicles.owned.length && player.chance(0.1)) {
    const vid = player.pick(state.vehicles.owned).id;
    tries.push(() => act(`vehicles.${player.pick(['sell', 'toggleInsurance', 'payoff'])}`, vid));
  }
  if (player.chance(0.05)) tries.push(() => act('vehicles.trafficSchool'));
  // Elder care
  for (const id of Object.keys(state.elderCare.cases)) if (player.chance(0.2)) tries.push(() => act('elderCare.arrange', `${id}:${player.pick(Object.keys(ARRANGEMENTS))}`));
  if (player.chance(0.05)) tries.push(() => act(player.pick(['elderCare.poa', 'elderCare.guardianship']), player.pick(state.people.list)?.id));
  if (player.chance(0.05)) tries.push(() => act('elderCare.respite'));
  // Community
  if (age >= 16 && player.chance(0.04)) tries.push(() => act('community.join', player.pick(Object.keys(TRADITIONS))));
  if (state.community.faith && player.chance(0.03)) tries.push(() => act('community.leave'));
  if (state.community.faith && player.chance(0.1)) tries.push(() => act('community.attendance', player.pick(Object.keys(ATTENDANCE))));
  if (player.chance(0.05)) tries.push(() => act('community.give', player.pick(['0', '2', '5', '10'])));
  if (age >= 12 && player.chance(0.08)) tries.push(() => act('community.volunteer', player.pick(Object.keys(VOLUNTEER_ORGS))));
  if (age >= 21 && player.chance(0.04)) tries.push(() => act('community.mentor'));
  if (player.chance(0.02)) tries.push(() => act('community.stepDown'));
  if (age >= 18 && state.community.faith && player.chance(0.05)) tries.push(() => act('career.apply', 'clergy'));
  if (age >= 18 && player.chance(0.2)) tries.push(() => act('people.makeFriend'));
  if (age >= 18 && player.chance(0.02)) tries.push(() => act('finances.fileBankruptcy', player.pick(['7', '13'])));
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
    const folks = state.people?.list.filter((x) => x.alive && x.life) ?? [];
    if (folks.length && player.chance(0.05)) tries.push(() => act(player.pick(['npcLives.helpBuy', 'npcLives.payTuition']), player.pick(folks).id));
    if (folks.length && h.properties.length && player.chance(0.05)) tries.push(() => act('npcLives.offerHome', `${player.pick(folks).id}:${player.pick(h.properties).id}`));
    for (const v of state.vehicles?.owned ?? []) if (player.chance(0.05)) tries.push(() => act('vehicles.charter', v.id));
    for (const p of h.properties) {
      if (player.chance(0.15)) tries.push(() => act(player.pick(['housing.refinance', 'housing.heloc', 'housing.repayHeloc', 'housing.floodInsurance']), p.id));
      if (player.chance(0.1)) tries.push(() => act('housing.renovate', `${p.id}:${player.pick(Object.keys(RENOVATIONS))}`));
      if (player.chance(0.06)) tries.push(() => act('housing.setUse', `${p.id}:${player.pick(['primary', 'rental', 'vacant', 'vacation'])}`));
      if (player.chance(0.15)) tries.push(() => act('housing.build', `${p.id}:${player.pick(Object.keys(PROPERTY_TYPES))}:${player.pick(['gc', 'own', 'diy'])}:${player.pick(['cash', 'loan'])}`));
      if (player.chance(0.03)) tries.push(() => act(player.pick(['housing.demolish', 'housing.subdivide', 'housing.rezone']), p.id));
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
  const out = l.funeral + l.debtsPaid + l.probate + l.tax + l.bequests.reduce((s, b) => s + b.amount, 0);
  assert.equal(out, l.assets, `estate conserves assets (${l.assets} → ${out})`);
  assert.ok(l.bequests.every((b) => b.amount >= 0 && (b.heirTax ?? 0) <= b.amount) && l.probate >= 0 && l.tax >= 0 && l.debtsPaid <= l.debts, 'estate amounts sane');
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
  const bh = state.business.history;
  if (bh.length || state.business.current) totals.owners += 1;
  totals.bizExits += bh.filter((h) => /Sold|IPO/.test(h.outcome)).length;
  totals.bizFailures += bh.filter((h) => /Closed|bankruptcy|Shut|fire|Forced/i.test(h.outcome)).length;
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
console.log(`  business: ${totals.owners} owners · ${totals.bizExits} sold or went public · ${totals.bizFailures} closed or failed`);
console.log(`  k12: ${totals.privateSchool} attended private/religious/boarding/military schools · ${totals.teenWorkers} held teen jobs · ${totals.dropouts} dropped out (${totals.geds} earned a GED) · mean high-school GPA ${(totals.gpaSum / Math.max(1, totals.gpaN)).toFixed(2)}`);
console.log(`  people: ${totals.married} ever married, ${totals.divorced} divorced, ${totals.parents} parents · ${totals.generations} heirs continued, deepest line ${totals.maxGeneration} generations · ${totals.estates} estates settled and balanced`);
console.log(`  homeowners ${totals.homeowners}, foreclosures ${totals.foreclosures}, ever homeless ${totals.homeless}, ran for office ${totals.ranForOffice}, held office ${totals.officeHolders}, governors ${totals.governors}`);
console.log('  peak grade:', totals.peakGrade);
console.log('  causes of death:', totals.deaths);
console.log(`  prompt types seen (${promptTypes.size}):`, [...promptTypes].sort().join(', '));
