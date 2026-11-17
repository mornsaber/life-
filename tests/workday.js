/**
 * Work as it was lived (career/WorkOfTheDay.js).
 *
 *   node tests/workday.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { workKind } from '../src/modules/career/WorkOfTheDay.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function worker(cc, birth, age, professionId, years) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(6), modules: MODULES });
  engine.newLife({ countryId: cc, startYear: birth });
  for (let i = 0; i < age; i++) { engine.state.prompts = []; engine.state.stats.health = 90; engine.ageUp(); }
  const ctx = engine.context();
  const prof = getProfession(professionId);
  hire(ctx, { professionId: prof.id, levelId: prof.levels[0].id, employer: createEmployer(ctx.rng, engine.state, prof, engine.state.character.regionId) });
  for (let i = 0; i < years; i++) { engine.state.prompts = []; engine.state.stats.health = 90; if (!engine.state.career.job) hire(ctx, { professionId: prof.id, levelId: prof.levels[0].id, employer: createEmployer(ctx.rng, engine.state, prof, engine.state.character.regionId) }); engine.ageUp(); }
  return engine.state;
}

const tests = {
  'a mill hand is in the works'() {
    const s = worker('GB', 1900, 16, 'millWork', 0);
    assert.equal(workKind(s), 'works');
  },
  'a British worker in 1938 gets a holiday with pay'() {
    const s = worker('GB', 1900, 37, 'millWork', 2);
    assert.ok(s.workDay?.seen?.paidHoliday, JSON.stringify(s.workDay));
  },
  'a mill hand of 1920 sees the works moments over ten years'() {
    const s = worker('GB', 1900, 20, 'millWork', 12);
    assert.ok(Object.keys(s.workDay?.seen ?? {}).length >= 1, JSON.stringify(s.workDay));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
