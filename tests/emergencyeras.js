/**
 * Volunteer emergency services in their day: no rank waits on a certification that doesn't
 * exist yet, titles are those of the day, and certifications not yet invented aren't offered.
 *
 *   node tests/emergencyeras.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { SERVICES, nextRankStatus } from '../src/modules/emergency/EmergencyEngine.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (year) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(7), modules: MODULES });
  const state = engine.newLife({ countryId: 'US', startYear: year - 25 });
  state.character.age = 25;
  state.prompts = [];
  Object.assign(state.stats, { fitness: 90, health: 95, smarts: 85 });
  return { engine, state };
};

const tests = {
  'an 1880 fireman is not held back by Firefighter I (1975)'() {
    const { engine, state } = life(1880);
    engine.dispatch('emergency.join', 'fire');
    const m = state.emergency.fire;
    m.xp = 60;
    assert.equal(nextRankStatus(state, 'fire', m).ready, true, nextRankStatus(state, 'fire', m).reason);
  },
  'titles of the day'() {
    const { state } = life(1880);
    assert.equal(SERVICES.fire.ranks[0].title, 'Probationary Fireman');
    assert.equal(SERVICES.fire.ranks[6].title, 'Chief Engineer');
    life(1950);
    assert.equal(SERVICES.fire.ranks[6].title, 'Fire Chief');
    assert.equal(SERVICES.redcross.name, 'Red Cross Disaster Relief');
    life(2020);
    assert.equal(SERVICES.fire.ranks[1].title, 'Firefighter I');
    assert.ok(state);
  },
  'certifications not yet invented are not offered'() {
    const { engine, state } = life(1880);
    engine.dispatch('emergency.join', 'fire');
    const h = VIEWS.emergency(state, {});
    assert.ok(!/Doesn.t exist yet/.test(h));
    assert.match(h, /learn on the job/);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 5).join('\n    ')}`); }
}
if (failed) process.exit(1);
