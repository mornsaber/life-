/**
 * Policing and firefighting of their day (publicsafety/ServiceEras.js).
 *
 *   node tests/serviceeras.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { ServiceErasModule, MOMENTS, eraNote } from '../src/modules/publicsafety/ServiceEras.js';
import { wearOf } from '../src/modules/publicsafety/ServiceWear.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function officer(professionId, countryId, birthYear) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(17), modules: MODULES });
  const state = engine.newLife({ countryId, startYear: birthYear });
  for (let i = 0; i < 24; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  const ctx = engine.context();
  const profession = getProfession(professionId);
  hire(ctx, { professionId, levelId: profession.levels[1].id, employer: createEmployer(new Random(17), state, profession, state.character.regionId) });
  state.prompts = [];
  return { engine, state, ctx };
}
/** Moments that come up over n years (the calendar fixed at this year). */
function moments(state, ctx, n = 40) {
  const got = [];
  for (let i = 0; i < n; i++) {
    state.world.seed = (state.world.seed ?? 1) + 1;
    ServiceErasModule.onAgeUp(ctx);
    const p = state.prompts.find((x) => x.type === 'serviceEras.moment');
    if (p) { got.push(p.data.id); state.prompts = []; }
  }
  return got;
}

const tests = {
  'an American officer in the 1920s meets Prohibition; a British one in 1984 the miners\' strike'() {
    const us = officer('police', 'US', 1900);
    assert.ok(moments(us.state, us.ctx).includes('prohibition'));
    const gb = officer('police', 'GB', 1960);
    const got = moments(gb.state, gb.ctx);
    assert.ok(got.includes('miners'), got.join(','));
    assert.ok(!got.includes('prohibition'), 'no Prohibition in Britain');
  },
  'each moment comes once in a career'() {
    const { state, ctx } = officer('police', 'US', 1900);
    const got = moments(state, ctx, 60);
    assert.equal(new Set(got).size, got.length);
  },
  'refusing breathing apparatus means more smoke for years after'() {
    const { engine, state, ctx } = officer('fire', 'US', 1938);
    let p = null;
    for (let i = 0; i < 40 && !p; i++) { state.world.seed += 1; ServiceErasModule.onAgeUp(ctx); p = state.prompts.find((x) => x.type === 'serviceEras.moment' && x.data.id === 'breathing'); if (!p) state.prompts = []; }
    assert.ok(p, 'the breathing apparatus moment');
    engine.resolvePrompt(p.id, 'refuse');
    assert.equal(wearOf(state).mask, false);
    assert.ok(wearOf(state).smoke >= 40);
  },
  'the job reads differently by era'() {
    const notes = [1910, 1950, 1975, 2000, 2020].map((y) => eraNote({ character: { birthYear: y - 30, age: 30, countryId: 'US' } }, 'police'));
    assert.equal(new Set(notes).size, notes.length);
  },
  'every moment is well formed'() {
    for (const m of MOMENTS) {
      assert.ok(m.from < m.until && m.options.length >= 2 && ['police', 'fire'].includes(m.service), m.id);
      for (const o of m.options) assert.ok(o.id && o.label, `${m.id}.${o.id}`);
    }
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
