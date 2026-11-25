/**
 * Colonial services at independence: kept-on officers move into the new state's own civil service
 * or police (its ranks, its name), keep rank and seniority, and lose the colonial courses and the
 * road to Governor; nothing colonial is left in the career screen.
 *
 *   node tests/colonialhandover.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { sync } from '../src/modules/world/History.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { packFor } from '../src/modules/career/vocations/registry.js';
import { periodText } from '../src/modules/world/Eras.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function through(cc, y0, prof, level, seed) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: y0 - 25, firstName: 'Ada', lastName: 'Okoth', gender: 'male' });
  state.character.age = 25; state.prompts = []; sync(state);
  Object.assign(state.stats, { smarts: 85, health: 95 });
  const ctx = engine.context();
  hire(ctx, { professionId: prof, levelId: level, employer: createEmployer(ctx.rng, state, getProfession(prof), state.character.regionId) });
  for (let i = 0; i < 14 && state.character.alive && !state.career.job?.nationalized; i += 1) {
    for (let k = 0; k < 10 && state.prompts.length; k += 1) { const q = state.prompts[0]; engine.resolvePrompt(q.id, (q.options.find((o) => /report|refuse|decline|loyal|stay|keep|serve/i.test(`${o.id} ${o.label}`)) ?? q.options.at(-1)).id); }
    state.prompts = []; state.stats.health = 95;
    engine.ageUp();
  }
  return { state };
}
const tests = {
  'a kept-on district officer joins the national civil service with the new state\'s ranks'() {
    let found = null;
    for (let seed = 1; seed < 30 && !found; seed += 1) {
      const { state } = through('KE', 1956, 'colonialService', 'cadet', seed);
      if (state.career.job?.nationalized && /ministry$/.test(state.career.job.professionId)) found = state;
    }
    assert.ok(found, 'some seed keeps the officer on');
    const job = found.career.job;
    assert.match(job.title, /Administrative Officer|District|Assistant Secretary/);
    assert.match(job.employer.name, /Kenya/);
    assert.ok(!/^colonial/.test(packFor(found)?.id ?? ''));
    const html = periodText(VIEWS.career(found, {}));
    const bad = html.match(/.{80}(Colonial Secretary|Governor|GS-\d|U\.S\. Department).{40}/g); assert.equal(bad, null, (bad ?? []).slice(0, 4).join('\n'));
    assert.ok(found.career.history.some((h) => h.transferred), 'a transfer, not a resignation');
  },
  'a kept-on police officer joins the country\'s own force'() {
    let found = null;
    for (let seed = 1; seed < 30 && !found; seed += 1) {
      const { state } = through('GH', 1950, 'colonialPolice', 'subInspector', seed);
      if (state.career.job?.nationalized && state.career.job.professionId === 'police') found = state;
    }
    assert.ok(found);
    assert.match(found.career.job.employer.name, /Ghana Police/);
    assert.doesNotMatch(found.career.job.title, /Police Officer|Patrol/);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) process.exit(1);
