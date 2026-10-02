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
import { promptModal } from '../src/ui/Components.js';

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

const totals = { years: 0, deaths: {}, prompts: 0, maxAge: 0, peakGrade: {}, convictions: 0, prison: 0, credentials: 0, degrees: 0, pensions: 0, managers: 0, unions: 0, clearances: 0, fso: 0, immunity: 0 };
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
  if (age >= 18 && player.chance(0.03)) tries.push(() => act('region.move', player.pick(Object.keys(REGIONS))));
  if (age >= 17 && age < 40 && !state.military.service && player.chance(0.06)) {
    tries.push(() => act('military.enlist', `${player.pick(Object.keys(BRANCHES))}:${player.pick(['enlisted', 'officer'])}:${player.pick(['active', 'reserve'])}`));
  }
  if (state.military.service) tries.push(() => act(`military.${player.pick(['pt', 'extraDuty', 'requestDeployment', 'applyOCS', 'switchComponent', 'retire'])}`));
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

for (let life = 0; life < LIVES; life++) {
  const state = engine.newLife();
  let years = 0;
  let managed = false;
  while (state.character.alive) {
    randomActions(state);
    resolveAllPrompts(state);
    if (!state.character.alive) break;
    assert.ok(engine.ageUp(), 'ageUp should succeed when no prompts pending');
    checkInvariants(state);
    if (state.career.job?.department) managed = true;
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
  if (state.publicService.clearance || state.career.history.some((h) => ['foreignService', 'intelligence', 'oig', 'regulatory'].includes(h.professionId))) totals.clearances += 1;

  renderer.obituary(state);
  renderAll(state);
  const restored = new Store(engine.store.storage).load();
  assert.deepEqual(restored, state);
}

console.log(`✔ Simulated ${LIVES} lives (${totals.years} years, ${totals.prompts} decisions) without errors.`);
console.log(`  avg lifespan ${(totals.years / LIVES).toFixed(1)}, max age ${totals.maxAge}`);
console.log(`  avg credentials ${(totals.credentials / LIVES).toFixed(1)}, avg degrees ${(totals.degrees / LIVES).toFixed(1)}, lives w/ pensions ${totals.pensions}, managers ${totals.managers}, cleared ${totals.clearances}`);
console.log(`  convictions ${totals.convictions}, lives with prison ${totals.prison}, immunity prompts ${totals.immunity}, FSO-years ${totals.fso}`);
console.log('  peak grade:', totals.peakGrade);
console.log('  causes of death:', totals.deaths);
console.log(`  prompt types seen (${promptTypes.size}):`, [...promptTypes].sort().join(', '));
