/**
 * The job board shows your odds and your best bets; your job shows what stands between you
 * and the next rung.
 *
 *   node tests/careerodds.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const adult = (age = 24) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES });
  const state = engine.newLife({ countryId: 'US' });
  for (let i = 0; i < age; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  return { engine, state };
};

const tests = {
  'unemployed: best bets first, each with its odds'() {
    const { engine, state } = adult();
    if (state.career.job) engine.dispatch('career.quit');
    const h = VIEWS.career(state, {});
    assert.match(h, /Best bets for you/);
    assert.match(h, /≈\d+% offer/);
  },
  async 'in a job: a promotion checklist and the road after'() {
    const { state, engine } = adult(32);
    if (!state.career.job) {
      const { hire } = await import('../src/modules/career/CareerEngine.js');
      const { getProfession } = await import('../src/modules/career/JobTrees.js');
      const { createEmployer } = await import('../src/modules/career/Employers.js');
      const p = getProfession('retail');
      hire(engine.context(), { professionId: 'retail', levelId: p.levels[0].id, employer: createEmployer(engine.rng, state, p, state.character.regionId) });
    }
    assert.ok(state.career.job, 'employed');
    const h = VIEWS.career(state, {});
    assert.match(h, /A strong review: 70%\+ performance/);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { await fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 5).join('\n  ')}`); }
}
if (failed) process.exit(1);
