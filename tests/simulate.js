/**
 * Headless smoke test: plays hundreds of complete lives with a random-but-
 * plausible player (applies for jobs, enlists, volunteers, certifies, picks
 * random prompt options) and asserts the state stays valid throughout.
 *
 *   node tests/simulate.js [lives=300] [seed=1]
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store, STAT_KEYS } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { PROFESSION_LIST } from '../src/modules/career/JobTrees.js';
import { BRANCHES } from '../src/modules/military/MilitaryEngine.js';
import { SERVICES } from '../src/modules/emergency/EmergencyEngine.js';
import { MAJORS } from '../src/modules/education/EducationEngine.js';

const LIVES = Number(process.argv[2] ?? 300);
const SEED = Number(process.argv[3] ?? 1);

const memoryStorage = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
};

const rng = new Random(SEED);
const player = new Random(SEED + 99);
const engine = new Engine({ store: new Store(memoryStorage()), rng, modules: MODULES });

const toasts = [];
engine.bus.on('toast', (t) => toasts.push(t));

const totals = { years: 0, deaths: {}, medals: {}, peakTiers: 0, officers: 0, kia: 0, jobs: 0, emergency: 0, prompts: 0, maxAge: 0 };

function checkInvariants(state) {
  for (const key of STAT_KEYS) {
    assert.ok(Number.isInteger(state.stats[key]) && state.stats[key] >= 0 && state.stats[key] <= 100, `stat ${key}=${state.stats[key]}`);
  }
  assert.ok(Number.isFinite(state.finances.cash), 'cash finite');
  assert.ok(Number.isFinite(state.finances.loans) && state.finances.loans >= 0, 'loans');
  const job = state.career.job;
  if (job) {
    assert.ok(job.tier >= 0 && job.tier < 7, 'tier range');
    assert.ok(job.performance >= 0 && job.performance <= 100, 'perf range');
    assert.ok(job.salary > 0, 'salary');
  }
  const svc = state.military.service;
  if (svc) {
    assert.ok(BRANCHES[svc.branch][svc.track][svc.grade], `rank exists ${svc.track} ${svc.grade}`);
    assert.ok(svc.eval >= 0 && svc.eval <= 100, 'eval range');
  }
  for (const id of Object.keys(SERVICES)) {
    const m = state.emergency[id];
    if (m) assert.ok(SERVICES[id].ranks[m.rankIndex], 'emergency rank exists');
  }
  JSON.parse(JSON.stringify(state)); // must stay serializable
}

function randomActions(state) {
  const age = state.character.age;
  const tries = [];
  if (age >= 16) tries.push(() => engine.dispatch('career.apply', player.pick(PROFESSION_LIST).id));
  if (state.career.job) {
    tries.push(() => engine.dispatch(`career.${player.pick(['workHarder', 'officePolitics', 'socialize', 'slackOff', 'askRaise', 'requestPromotion'])}`));
    if (player.chance(0.02)) tries.push(() => engine.dispatch('career.quit'));
    if (age > 62) tries.push(() => engine.dispatch('career.retire'));
  }
  if (age >= 17 && age < 40 && !state.military.service && player.chance(0.15)) {
    const branch = player.pick(Object.keys(BRANCHES));
    tries.push(() => engine.dispatch('military.enlist', `${branch}:${player.pick(['enlisted', 'officer'])}:${player.pick(['active', 'reserve'])}`));
  }
  if (state.military.service) {
    tries.push(() => engine.dispatch(`military.${player.pick(['pt', 'extraDuty', 'requestDeployment', 'applyOCS', 'switchComponent', 'retire'])}`));
  }
  for (const id of Object.keys(SERVICES)) {
    if (!state.emergency[id] && player.chance(0.1)) tries.push(() => engine.dispatch('emergency.join', id));
    if (state.emergency[id]) {
      const cert = player.pick(SERVICES[id].certifications);
      tries.push(() => engine.dispatch('emergency.certify', `${id}:${cert.id}`));
      tries.push(() => engine.dispatch(`emergency.${player.pick(['train', 'shift'])}`, id));
    }
  }
  if (age >= 18 && !state.education.enrolled && player.chance(0.2)) {
    const program = player.pick(['bachelor', 'bachelor', 'mba', 'jd', 'md']);
    tries.push(() => engine.dispatch('education.enroll', program === 'bachelor' ? `bachelor:${player.pick(Object.keys(MAJORS))}` : program));
  }
  if (state.education.enrolled) tries.push(() => engine.dispatch('education.study'));
  tries.push(() => engine.dispatch('activities.do', player.pick(['gym', 'library', 'meditate', 'doctor', 'vacation', 'salon'])));

  for (const t of player.shuffle(tries).slice(0, 4)) {
    if (!state.character.alive) return;
    resolveAllPrompts(state);
    t();
    checkInvariants(state);
  }
}

function resolveAllPrompts(state) {
  let guard = 0;
  while (state.prompts.length && state.character.alive) {
    assert.ok(guard++ < 50, 'prompt loop');
    const prompt = state.prompts[0];
    const options = prompt.options.filter((o) => !o.disabled);
    assert.ok(options.length > 0, `prompt ${prompt.type} has no options`);
    totals.prompts += 1;
    assert.ok(engine.resolvePrompt(prompt.id, player.pick(options).id), `resolve ${prompt.type}`);
    checkInvariants(state);
  }
}

for (let life = 0; life < LIVES; life++) {
  const state = engine.newLife();
  let years = 0;
  while (state.character.alive) {
    randomActions(state);
    resolveAllPrompts(state);
    if (!state.character.alive) break;
    assert.ok(engine.ageUp(), 'ageUp should succeed when no prompts pending');
    checkInvariants(state);
    years += 1;
    assert.ok(years < 130, 'life should end');
  }
  totals.years += years;
  totals.maxAge = Math.max(totals.maxAge, state.character.age);
  const cause = state.character.causeOfDeath.split(' — ')[0];
  totals.deaths[cause] = (totals.deaths[cause] ?? 0) + 1;
  for (const h of state.honors) totals.medals[h.name] = (totals.medals[h.name] ?? 0) + 1;
  const peak = Math.max(-1, ...state.career.history.map((h) => h.peakTier));
  if (peak >= 6) totals.peakTiers += 1;
  if (state.military.history.some((h) => h.track === 'officer')) totals.officers += 1;
  if (state.military.history.some((h) => h.discharge === 'kia')) totals.kia += 1;
  if (state.career.history.length) totals.jobs += 1;
  if (state.emergency.history.length || Object.keys(SERVICES).some((k) => state.emergency[k])) totals.emergency += 1;

  // Round-trip through storage must reproduce the same state.
  const restored = new Store(engine.store.storage).load();
  assert.deepEqual(restored, state);
}

console.log(`✔ Simulated ${LIVES} lives (${totals.years} years, ${totals.prompts} decisions) without errors.`);
console.log(`  avg lifespan ${(totals.years / LIVES).toFixed(1)}, max age ${totals.maxAge}`);
console.log(`  lives with jobs ${totals.jobs}, reached tier 7 ${totals.peakTiers}, officers ${totals.officers}, KIA ${totals.kia}, responders ${totals.emergency}`);
console.log('  causes of death:', totals.deaths);
console.log('  honors awarded:', Object.entries(totals.medals).sort((a, b) => b[1] - a[1]).slice(0, 12));
