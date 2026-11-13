/**
 * Health has its own section: Overview (your doctor says, the body, next steps), Conditions,
 * Cover and Lifestyle; Money is only money.
 *
 *   node tests/healthsection.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS, SECTIONS } from '../src/ui/Renderer.js';
import { CONDITIONS } from '../src/modules/health/index.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (age = 50) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(2), modules: MODULES });
  const state = engine.newLife({ countryId: 'US' });
  for (let i = 0; i < age && state.character.alive; i++) { state.prompts = []; state.stats.health = Math.max(60, state.stats.health); engine.ageUp(); }
  state.prompts = [];
  return { engine, state };
};

const tests = {
  'Health is its own section; Money holds only money'() {
    const h = SECTIONS.find((s) => s.id === 'health');
    assert.deepEqual(h.tabs.map((t) => t.id), ['health', 'conditions', 'cover', 'wellbeing']);
    assert.ok(!SECTIONS.find((s) => s.id === 'money').tabs.some((t) => t.id === 'health'));
  },
  'the doctor names an untreated condition and offers to treat it'() {
    const { state } = life();
    const id = Object.keys(CONDITIONS).find((k) => /hypert/i.test(k));
    state.health.conditions.push({ id, diagnosed: true, onsetAge: 45, severity: 40, treated: false });
    const h = VIEWS.health(state, {});
    assert.match(h, /Your Doctor Says/);
    assert.match(h, /Heart (&amp;|&) blood: /);
    assert.match(h, new RegExp(`data-action="health\\.treat" data-arg="${id}"|health\\.treat`));
  },
  'each tab carries its own cards'() {
    const { state } = life();
    assert.match(VIEWS.conditions(state, {}), /Conditions/);
    assert.match(VIEWS.cover(state, {}), /Coverage/);
    assert.match(VIEWS.wellbeing(state, {}), /Lifestyle/);
    assert.ok(!/Coverage/.test(VIEWS.conditions(state, {})));
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 5).join('\n  ')}`); }
}
if (failed) process.exit(1);
