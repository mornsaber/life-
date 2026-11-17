/**
 * At the top of a police, fire or ambulance service (publicsafety/ChiefsOffice.js).
 *
 *   node tests/chiefsoffice.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { ChiefsOfficeModule, isServiceHead, masterOf, chiefOf } from '../src/modules/publicsafety/ChiefsOffice.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function chief(professionId = 'police', countryId = 'US', startYear = 1960) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(19), modules: MODULES });
  const state = engine.newLife({ countryId, startYear });
  for (let i = 0; i < 45; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  const ctx = engine.context();
  const profession = getProfession(professionId);
  hire(ctx, { professionId, levelId: profession.levels.at(-1).id, employer: createEmployer(new Random(19), state, profession, state.character.regionId) });
  state.prompts = [];
  return { engine, state, ctx };
}
const nextCall = (state, ctx) => { for (let i = 0; i < 20; i++) { state.world.seed = (state.world.seed ?? 1) + 1; ChiefsOfficeModule.onAgeUp(ctx); const p = state.prompts.find((x) => x.type.startsWith('chiefsOffice.')); if (p) return p; } return null; };

const tests = {
  'the head of a service answers to someone, depending on where and when'() {
    const us = chief('police', 'US', 1960);
    assert.ok(isServiceHead(us.state));
    assert.equal(masterOf(us.state), 'the mayor');
    assert.equal(masterOf(chief('police', 'GB', 1975).state), 'the Police and Crime Commissioner');
    assert.equal(masterOf(chief('police', 'GB', 1940).state), 'the police authority');
    assert.equal(masterOf(chief('fire', 'GB', 1960).state), 'the fire authority');
  },
  'each year brings a hard call that moves the measures; the card shows them'() {
    const { engine, state, ctx } = chief();
    const p = nextCall(state, ctx);
    assert.ok(p, 'a hard call');
    const before = { ...chiefOf(state) };
    engine.resolvePrompt(p.id, p.options[0].id);
    const after = chiefOf(state);
    assert.ok(['confidence', 'union', 'public', 'budget'].some((k) => after[k] !== before[k]), 'something moved');
    assert.match(VIEWS.career(state), /The Chief(&#39;|')s Office/);
  },
  'no bystander videos before the 1990s'() {
    const { state, ctx } = chief('police', 'US', 1920);
    const seen = new Set();
    for (let i = 0; i < 60; i++) { const p = nextCall(state, ctx); if (p) { seen.add(p.data.id); state.prompts = []; state.chief.record = []; } }
    assert.ok(!seen.has('shooting'), [...seen].join(','));
  },
  'lose their confidence and you\'re asked to go'() {
    const { engine, state, ctx } = chief();
    chiefOf(state).confidence = 5;
    ChiefsOfficeModule.onAgeUp(ctx);
    const p = state.prompts.find((x) => x.type === 'chiefsOffice.noConfidence');
    assert.ok(p, 'asked to resign');
    engine.resolvePrompt(p.id, 'resign');
    assert.equal(state.career.job, null);
  },
  'a cover-up can come out later'() {
    const { state, ctx } = chief();
    chiefOf(state).record.push({ age: state.character.age, id: 'corruption', choice: 'quiet', flag: 'coverup' });
    const pub = chiefOf(state).public;
    let out = false;
    for (let i = 0; i < 80 && !out; i++) { state.world.seed += 1; state.prompts = []; chiefOf(state).confidence = 80; ChiefsOfficeModule.onAgeUp(ctx); out = !chiefOf(state).record.some((r) => r.flag); }
    assert.ok(out, 'it came out');
    assert.ok(chiefOf(state).public < pub + 10);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
