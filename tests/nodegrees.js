/**
 * Before 1900 no job asked for a degree: lawyers read law, doctors apprenticed, officers were
 * commissioned by nomination. From 1900 the requirements return.
 *
 *   node tests/nodegrees.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { applicationEligibility } from '../src/modules/career/CareerEngine.js';
import { PROFESSIONS } from '../src/modules/career/JobTrees.js';
import { checkRequirements } from '../src/modules/credentials/LicensingEngine.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (year) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(1), modules: MODULES });
  const state = engine.newLife({ countryId: 'US', startYear: year - 30 });
  state.character.age = 30;
  state.prompts = [];
  Object.assign(state.stats, { smarts: 90, fitness: 90, health: 90 });
  return state;
};
const degreeBlocked = (state) => Object.keys(PROFESSIONS).filter((id) => {
  const e = applicationEligibility(state, id, { anywhere: true });
  return !e.ok && /bachelor|master|doctorate|J\.D\.|M\.D\.|degree|program/i.test(e.reason);
});

const tests = {
  'in 1880 no job is closed for want of a degree'() {
    assert.deepEqual(degreeBlocked(life(1880)), []);
  },
  'in 1950 degree jobs want degrees again'() {
    const blocked = degreeBlocked(life(1950));
    assert.ok(blocked.includes('law') && blocked.includes('medical'), blocked.join(', '));
  },
  'the waiver is for education only: experience and smarts still count'() {
    const state = life(1880);
    state.stats.smarts = 40;
    const r = checkRequirements(state, { education: { level: 'bachelor' }, smarts: 70 });
    assert.deepEqual(r.missing, ['70+ smarts']);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 5).join('\n    ')}`); }
}
if (failed) process.exit(1);
