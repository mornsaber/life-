/**
 * Police and fire: assignments, units and teams, calls, shootings and the
 * Brady list, cancer exposure, and civil-service promotional lists.
 *
 *   node tests/publicsafety.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire, promotionStatus } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { PoliceLifeModule, unitEligibility } from '../src/modules/publicsafety/PoliceLife.js';
import { FireLifeModule, teamEligibility } from '../src/modules/publicsafety/FireLife.js';
import { scopeOfType } from '../src/core/PromptScope.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function sworn(seed, professionId, levelId, creds, years = 6) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Pub', lastName: 'Safety', gender: 'female' });
  state.character.age = 30;
  Object.assign(state.stats, { smarts: 75, fitness: 75, health: 90, happiness: 65, stress: 20 });
  state.legal.record = [];
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 });
  for (const c of creds) state.credentials.held[c] = { earnedAge: 22, renewedAge: 28, status: 'active' };
  const ctx = engine.context();
  const job = hire(ctx, { professionId, levelId, employer: createEmployer(ctx.rng, state, getProfession(professionId), state.character.regionId) });
  assert.ok(job, `hired ${professionId}.${levelId}`);
  Object.assign(job, { yearsAtEmployer: years, yearsInLevel: years, performance: 80 });
  state.prompts = [];
  return { engine, state, ctx, job };
}
const tick = (ctx, state, mod) => { const j = state.career.job; if (j) { j.paidThisYear = true; j.yearsAtEmployer += 1; j.yearsInLevel += 1; } state.character.age += 1; state.yearly = {}; mod.onAgeUp(ctx); };
const resolve = (engine, state, type, pick = 0) => { const p = state.prompts.find((x) => x.type === type); if (p) engine.resolvePrompt(p.id, p.options[Math.min(pick, p.options.length - 1)].id); return p; };

const tests = {
  'police: a year on patrol, a unit, details, and the card'() {
    const { engine, state, ctx } = sworn(1, 'police', 'officer', ['post', 'driverLicense']);
    assert.equal(state.police.area, 'downtown');
    assert.equal(scopeOfType('police.call'), 'job');
    engine.dispatch('police.shift', 'midnights');
    assert.equal(state.police.shift, 'midnights');
    for (let i = 0; i < 12 && !state.police.unit; i++) { state.yearly = {}; engine.dispatch('police.unit', 'k9'); }
    assert.equal(state.police.unit, 'k9', 'selected for K-9');
    const cash = state.finances.cash;
    engine.dispatch('police.details');
    for (let i = 0; i < 4; i++) { state.prompts = []; tick(ctx, state, PoliceLifeModule); resolve(engine, state, 'police.call'); }
    assert.ok(state.police.calls > 2000 && state.police.arrests > 50);
    assert.ok(state.finances.cash > cash, 'details and court overtime');
    const html = VIEWS.career(state, {});
    assert.match(html, /On the Street/);
    assert.ok(!/NaN|undefined/.test(html));
  },

  'police: units have requirements; lying in a report can land you on the Brady list'() {
    const { engine, state, ctx } = sworn(2, 'police', 'officer', ['post', 'driverLicense'], 1);
    assert.match(unitEligibility(state, 'swat').reason, /years/);
    let brady = false;
    for (let i = 0; i < 60 && !brady; i++) {
      state.prompts = [];
      ctx.prompt({ type: 'police.call', title: 'x', text: 'x', options: [{ id: 'embellish', label: 'x' }], data: { callId: 'report' } });
      engine.resolvePrompt(state.prompts.at(-1).id, 'embellish');
      brady = state.police.brady;
    }
    assert.ok(brady, 'Brady list');
    assert.match(unitEligibility(state, 'narcotics').reason, /Brady/);
  },

  'police: an officer-involved shooting goes to review'() {
    const { engine, state } = sworn(3, 'police', 'officer', ['post', 'driverLicense']);
    ctx_shoot: {
      const ctx = engine.context();
      ctx.prompt({ type: 'police.call', title: 'x', text: 'x', options: [{ id: 'fire', label: 'x' }], data: { callId: 'gun' } });
      engine.resolvePrompt(state.prompts.at(-1).id, 'fire');
    }
    assert.equal(state.police.ois, 1);
    assert.ok(state.health.trauma >= 18);
  },

  'civil service: the exam puts you on a list; you are promoted when it reaches you'() {
    const { engine, state, ctx } = sworn(4, 'police', 'senior', ['post', 'driverLicense', 'fto'], 8);
    const before = promotionStatus(state);
    assert.ok(!(before.options ?? []).some((l) => l.id === 'sergeant'), 'sergeant is held back without the exam');
    engine.dispatch('police.exam', 'prep');
    const entry = state.career.job.promoList?.sergeant;
    assert.ok(entry, 'on the sergeant\'s list');
    let promoted = false;
    for (let i = 0; i < 20 && !promoted; i++) {
      state.prompts = [];
      tick(ctx, state, PoliceLifeModule);
      if (!state.career.job.promoList?.sergeant && state.career.job.levelId !== 'sergeant') { state.yearly = {}; engine.dispatch('police.exam', 'prep'); }
      promoted = state.career.job.levelId === 'sergeant';
    }
    assert.ok(promoted, 'promoted to sergeant off the list');
  },

  'fire: stations, teams, strike-team overtime, exposure and the card'() {
    const { engine, state, ctx } = sworn(5, 'fire', 'firefighter', ['ff1', 'ff2', 'emt', 'driverLicense', 'hazmatOps']);
    assert.equal(state.fireLife.station, 'engine');
    assert.match(teamEligibility(state, 'medic').reason, /paramedic/);
    engine.dispatch('fireLife.team', 'strike');
    engine.dispatch('fireLife.team', 'hazmat');
    assert.equal(Object.keys(state.fireLife.teams).length, 2);
    assert.match(teamEligibility(state, 'dive').reason, /at most/);
    engine.dispatch('fireLife.station', 'hazmat');
    engine.dispatch('fireLife.sideJob');
    for (let i = 0; i < 5; i++) { state.prompts = []; tick(ctx, state, FireLifeModule); resolve(engine, state, 'fireLife.call'); }
    assert.ok(state.fireLife.runs > 3000 && state.fireLife.exposure > 0);
    assert.ok(state.fireLife.strikeTeams >= 1, 'deployed with the strike team');
    const html = VIEWS.career(state, {});
    assert.match(html, /The Firehouse/);
    assert.ok(!/NaN|undefined/.test(html));
  },

  'fire: decon and screening lower cancer risk; years of exposure can catch up'() {
    let cancers = 0;
    for (let seed = 10; seed < 40; seed++) {
      const { state, ctx } = sworn(seed, 'fire', 'firefighter', ['ff1', 'ff2', 'emt', 'driverLicense']);
      state.character.age = 45;
      state.fireLife.exposure = 40;
      for (let i = 0; i < 10; i++) { state.prompts = []; tick(ctx, state, FireLifeModule); }
      if (state.health.conditions?.some?.((c) => c.id === 'cancer') || Object.keys(state.health.conditions ?? {}).includes('cancer')) cancers += 1;
    }
    assert.ok(cancers >= 1, `some heavily exposed firefighters got cancer (${cancers}/30)`);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} public-safety test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} public-safety tests passed`);
