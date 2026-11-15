/**
 * Scenarios (a fixed start, the same world for everyone), the sandbox, and the classic look.
 *
 *   node tests/scenarios.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { scenarioOptions } from '../src/modules/life/Scenarios.js';
import { CHALLENGES } from '../src/modules/life/Achievements.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { newLifeForm } from '../src/ui/Components.js';
import { settingsPanel } from '../src/ui/views/SystemViews.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const start = (opts, seed = 3) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife(opts);
  return { engine, state };
};

const tests = {
  'a scenario fixes the start: the place, the year, a poor family, the same world'() {
    const a = start({ challenge: 'ragsToRiches', ...scenarioOptions('ragsToRiches') }, 3);
    const b = start({ challenge: 'ragsToRiches', ...scenarioOptions('ragsToRiches') }, 99);
    for (const { state } of [a, b]) {
      assert.equal(state.character.countryId, 'GB');
      assert.equal(state.character.birthYear, 1850);
      assert.equal(state.character.regionId, 'manchester');
      assert.equal(state.finances.cash, 0);
    }
    assert.equal(a.state.world.seed, b.state.world.seed, 'the same world for everyone');
    assert.match(VIEWS.goals(a.state), /Scenario: Rags to Riches/);
  },
  'every scenario starts cleanly and its goal can be checked'() {
    for (const [id, c] of Object.entries(CHALLENGES).filter(([, x]) => x.scenario)) {
      const { engine, state } = start({ challenge: id, ...scenarioOptions(id) });
      for (let i = 0; i < 5; i++) { state.prompts = []; engine.ageUp(); }
      assert.equal(typeof c.won(state), 'boolean', id);
    }
  },
  'the start form offers scenarios and a sandbox; settings offer the classic look'() {
    const html = newLifeForm({ firstName: 'A', lastName: 'B' });
    assert.match(html, /Scenarios/);
    assert.match(html, /name="sandbox"/);
    assert.match(settingsPanel({ theme: 'auto', look: 'classic' }), /value="classic" data-setting="look" checked/);
  },
  'a sandbox life can be edited, and only a sandbox life'() {
    const { engine, state } = start({ sandbox: true });
    state.character.age = 30;
    const cash = state.finances.cash;
    engine.dispatch('scenarios.sandbox', 'money');
    assert.ok(state.finances.cash > cash);
    assert.match(VIEWS.goals(state), /Sandbox/);
    const plain = start({});
    const c2 = plain.state.finances.cash;
    plain.engine.dispatch('scenarios.sandbox', 'money');
    assert.equal(plain.state.finances.cash, c2);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
