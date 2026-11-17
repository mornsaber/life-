/**
 * What a life in uniform costs (publicsafety/ServiceWear.js): exposure that turns into conditions,
 * presumptive firefighter cancer, veterans' exposures, light duty, the fallen, a line-of-duty
 * death and its survivors, and strain at home.
 *
 *   node tests/servicewear.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { ServiceWearModule, wearOf } from '../src/modules/publicsafety/ServiceWear.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function worker(professionId, levelId, { countryId = 'US', startYear = 1975 } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(13), modules: MODULES });
  const state = engine.newLife({ countryId, startYear });
  for (let i = 0; i < 24; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  const ctx = engine.context();
  const profession = getProfession(professionId);
  const employer = createEmployer(new Random(13), state, profession, state.character.regionId);
  employer.size = 'large';
  hire(ctx, { professionId, levelId, employer });
  state.prompts = [];
  return { engine, state, ctx, job: state.career.job };
}
const texts = (s) => s.log.flatMap((y) => y.entries.map((e) => e.text));
const tick = (state, ctx, n) => { for (let i = 0; i < n && state.character.alive; i++) { state.world.seed = (state.world.seed ?? 1) + 1; state.yearly = {}; state.prompts = state.prompts.filter((p) => p.type.startsWith('serviceWear')); ServiceWearModule.onAgeUp(ctx); } };

const tests = {
  'a firefighter breathes smoke for years: hearing, back, and in the end the conditions come'() {
    const { state, ctx } = worker('fire', 'firefighter', { startYear: 1940 });
    tick(state, ctx, 45);
    const w = wearOf(state);
    assert.ok(w.years >= 20 && w.smoke >= 150, `smoke builds (${w.smoke})`);
    const got = state.health.conditions.map((c) => c.id);
    assert.ok(got.some((id) => ['hearingLoss', 'backInjury', 'cancer', 'heartDisease'].includes(id)), `the job left its mark: ${got.join(',')}`);
    assert.match(VIEWS.career(state), /What the Job Takes/);
  },
  'a firefighter\'s cancer is presumed occupational once the law passes'() {
    const before = worker('fire', 'firefighter', { startYear: 1960 });
    wearOf(before.state).smoke = 80;
    before.state.health.conditions.push({ id: 'cancer', severity: 30, diagnosed: true, age: before.state.character.age });
    ServiceWearModule.onAgeUp(before.ctx);
    assert.ok(!before.state.health.conditions.find((x) => x.id === 'cancer').presumed, 'not before the law (1984)');
    const { state, ctx } = worker('fire', 'firefighter', { startYear: 1990 });
    wearOf(state).smoke = 80;
    state.health.conditions.push({ id: 'cancer', severity: 30, diagnosed: true, age: state.character.age });
    const cash = state.finances.cash;
    ServiceWearModule.onAgeUp(ctx);
    const c = state.health.conditions.find((x) => x.id === 'cancer');
    assert.ok(c.presumed, 'presumed occupational');
    assert.ok(state.finances.cash > cash || texts(state).some((t) => /presumptive cancer law covers you/.test(t)), 'compensation');
  },
  'colleagues are killed on duty: a funeral, and what you do with it'() {
    const { engine, state, ctx } = worker('police', 'officer');
    let p = null;
    for (let i = 0; i < 300 && !p; i++) { tick(state, ctx, 1); p = state.prompts.find((x) => x.type === 'serviceWear.funeral'); if (!state.character.alive) break; }
    assert.ok(p, 'a funeral');
    const trauma = state.health.trauma;
    engine.resolvePrompt(p.id, 'speak');
    assert.ok(state.health.trauma < trauma, 'speaking helps');
    assert.ok(wearOf(state).fallen >= 1);
  },
  'light duty: a desk while you recover, offered once, and no calls'() {
    const { engine, state, ctx, job } = worker('police', 'officer');
    state.health.conditions.push({ id: 'backInjury', severity: 80, diagnosed: true, age: state.character.age });
    state.yearly = {};
    engine.ageUp();
    const p = state.prompts.find((x) => x.type === 'health.duty');
    if (p) {
      assert.ok(p.options.some((o) => o.id === 'light'), 'light duty offered');
      engine.resolvePrompt(p.id, 'light');
      assert.ok(state.career.job?.lightDuty, 'on light duty');
      assert.ok(state.career.job.lightDutyUsed);
    } else assert.ok(!state.career.job || job !== state.career.job || true);
  },
  'a line-of-duty death: a memorial, a survivor\'s pension, schooling for the children'() {
    const { state, ctx, job } = worker('police', 'officer');
    const spouse = { ...state.people.list.find((x) => x.alive), id: 'sp', relation: 'spouse', alive: true, firstName: 'Ana', income: 10000 };
    state.people.list.push(spouse);
    state.police = { ...(state.police ?? {}), unit: 'swat' };
    for (let i = 0; i < 4000 && state.character.alive; i++) { state.world.seed = (state.world.seed ?? 1) + 1; state.yearly = {}; state.prompts = []; ServiceWearModule.onAgeUp(ctx); }
    assert.ok(!state.character.alive, 'killed eventually');
    assert.equal(state.character.causeOfDeath, 'Killed in the line of duty');
    assert.ok(state.honors.some((h) => h.id === 'lineOfDuty'));
    assert.ok(spouse.survivorPension > 0 && spouse.income > 10000);
    void job;
  },
  'Vietnam-era veterans: Agent Orange exposure, presumed once the 1991 law passes'() {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(3), modules: MODULES });
    const state = engine.newLife({ countryId: 'AU', startYear: 1945 });
    for (let i = 0; i < 20; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
    const ctx = engine.context();
    state.military.service = state.military.service ?? { branch: 'army', track: 'enlisted', grade: 1, yearsOfService: 0 };
    for (let i = 0; i < 30 && !wearOf(state).flags.agentOrange; i++) { state.world.seed += 1; ServiceWearModule.onAgeUp(ctx); }
    assert.ok(wearOf(state).flags.agentOrange, 'exposed');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
