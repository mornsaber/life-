/**
 * Missions and mandates (international organisations, the Holy See's guards, the Gurkha
 * Contingent, clergy), the trades board for ironworkers and transit maintenance, and the longer
 * ladders for allied health.
 *
 *   node tests/missions.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { MISSION_CAREERS } from '../src/modules/career/engines/Missions.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function worker(professionId, { seed = 5, countryId = 'US', level = null } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  state.legal.record = [];
  state.character.age = 30;
  state.prompts = [];
  const ctx = engine.context();
  const p = getProfession(professionId);
  const levelId = level ?? (p.levels.find((l) => l.entry) ?? p.levels[0]).id;
  hire(ctx, { professionId, levelId, employer: createEmployer(ctx.rng, state, p, state.character.regionId) });
  state.prompts = [];
  return { engine, state };
}
const years = (engine, state, n) => {
  const seen = new Set();
  for (let i = 0; i < n && state.character.alive; i++) {
    for (let k = 0; k < 12 && state.prompts.length; k++) {
      const q = state.prompts[0];
      seen.add(q.type);
      engine.resolvePrompt(q.id, (q.options.find((o) => !o.disabled && o.tone !== 'danger') ?? q.options[0]).id);
    }
    state.prompts = [];
    state.stats.health = 95;
    engine.ageUp();
    for (const q of state.prompts) seen.add(q.type);
  }
  return seen;
};

const tests = {
  'every mission career resolves to a real profession with a deck'() {
    for (const [id, cfg] of Object.entries(MISSION_CAREERS)) {
      assert.ok(getProfession(id), id);
      assert.ok(cfg.deck.length >= 1, `${id} deck`);
    }
  },
  'a UN agency officer gets field files and a reputation'() {
    const { engine, state } = worker('unAgencies', { seed: 3 });
    const seen = years(engine, state, 6);
    if (state.career.job?.professionId === 'unAgencies') {
      assert.ok(seen.has('missions.event'), 'a field file');
      assert.ok(state.careerLife.missions.files >= 1);
      assert.match(VIEWS.career(state, {}), /In the Field/);
    }
  },
  'an international prosecutor carries a case to verdict'() {
    const { engine, state } = worker('intlJustice', { seed: 4 });
    years(engine, state, 12);
    const rec = state.careerLife?.missions;
    if (state.career.job?.professionId === 'intlJustice') assert.ok((rec.cases ?? 0) >= 1 || rec.arc, 'a case under way or decided');
  },
  'a pastor\'s congregation has a size that moves with their reputation'() {
    const { engine, state } = worker('clergy', { seed: 5 });
    years(engine, state, 4);
    if (state.career.job?.professionId === 'clergy') assert.ok(state.careerLife.missions.flock > 0);
  },
  'Swiss Guards and Gurkha constables get their own duty'() {
    for (const id of ['swissGuard', 'vaticanGendarmerie', 'gurkhaContingent']) {
      const { engine, state } = worker(id, { seed: 6 });
      const seen = years(engine, state, 4);
      if (state.career.job?.professionId === id) assert.ok(seen.has('missions.event') || state.careerLife.missions.files >= 3, id);
    }
  },
  'ironworkers and transit mechanics work the trades board'() {
    for (const id of ['ironworking', 'transitMaintenance']) {
      const { engine, state } = worker(id, { seed: 7 });
      years(engine, state, 2);
      if (state.career.job?.professionId === id) assert.ok(state.careerLife?.tradeWork, `${id} board`);
    }
  },
  'allied health ladders reach a director or owner'() {
    for (const [id, top] of [['optometry', 'owner'], ['chiropractic', 'owner'], ['dentistry', 'groupDirector'], ['dentalHygiene', 'regional'], ['respiratoryTherapy', 'director'], ['occupationalTherapy', 'director']]) {
      assert.ok(getProfession(id).levels.some((l) => l.id === top), `${id}.${top}`);
    }
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} missions test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} missions tests passed`);
