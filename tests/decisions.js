/**
 * Decisions per year: over the player's limit, low-stakes moments are answered quietly with a
 * safe choice and noted; anything that matters still asks.
 *
 *   node tests/decisions.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { MINOR, quietChoice } from '../src/core/Routine.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (seed, budget) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  engine.promptBudget = budget;
  engine.newLife({});
  return engine;
};
const answer = (engine) => {
  const s = engine.state;
  for (let i = 0; i < 30 && s.prompts.length; i++) { const p = s.prompts[0]; const o = p.options.filter((x) => !x.disabled); engine.resolvePrompt(p.id, (o.find((x) => x.tone !== 'danger') ?? o[0] ?? p.options[0]).id); }
};

const tests = {
  'over the limit, only important decisions are left, and the quiet ones are noted'() {
    let trimmed = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const engine = life(seed, 2);
      const s = engine.state;
      for (let y = 0; y < 70 && s.character.alive; y++) {
        answer(engine);
        engine.ageUp();
        if (s.prompts.length > 2) assert.ok(!s.prompts.some((p) => quietChoice(p)), `seed ${seed} age ${s.character.age}: a low-stakes decision left over the limit`);
        trimmed += (s.log.at(-1)?.entries ?? []).filter((e) => e.icon === '🫥').length;
      }
    }
    assert.ok(trimmed > 0, 'some busy years were trimmed');
  },
  'every decision still asks when the limit is off'() {
    const engine = life(3, Infinity);
    const s = engine.state;
    for (let y = 0; y < 60 && s.character.alive; y++) { answer(engine); engine.ageUp(); assert.ok(!(s.log.at(-1)?.entries ?? []).some((e) => e.icon === '🫥')); }
  },
  'quiet answers are safe: never illegal, never the risky option'() {
    for (const type of MINOR) {
      const p = { type, options: [{ id: 'drive', label: 'x', tone: 'danger' }, { id: 'skip', label: 'y' }, { id: 'go', label: 'z' }, { id: 'kit', label: 'k' }] };
      const id = quietChoice(p);
      assert.ok(id && id !== 'drive', `${type}: ${id}`);
    }
    assert.equal(quietChoice({ type: 'career.interview', options: [{ id: 'skip', label: 'x' }] }), null, 'work decisions are never quiet');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} decision test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} decision tests passed`);
