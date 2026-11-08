/**
 * The year in review: each birthday leaves a summary of what changed, and the Life tab shows it.
 *
 *   node tests/yearreview.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { snapshot, review } from '../src/core/YearReview.js';
import { nextSteps } from '../src/modules/life/Guide.js';
import { TABS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (seed = 3) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  return { engine, state };
};
const play = (engine) => {
  const s = engine.state;
  for (let i = 0; i < 20 && s.prompts.length; i++) { const p = s.prompts[0]; engine.resolvePrompt(p.id, (p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0]).id); }
  engine.ageUp();
};

const tests = {
  'every birthday leaves a review, and the Life tab shows it without changing anything'() {
    const { engine, state } = life();
    for (let y = 0; y < 30 && state.character.alive; y++) {
      play(engine);
      assert.equal(state.lastYear.age, state.character.age);
      const before = JSON.stringify(state);
      const html = VIEWS.life(state, {});
      assert.equal(JSON.stringify(state), before, 'rendering changes nothing');
      assert.match(html, new RegExp(`Age ${state.character.age}: The Year in Review`));
      assert.doesNotMatch(html.slice(0, html.indexOf('Life Story')), /undefined|NaN|\[object/);
    }
  },
  'it notices a new job, stat swings and money'() {
    const { engine, state } = life(5);
    state.character.age = 25;
    const before = snapshot(state);
    state.stats.happiness = Math.max(0, state.stats.happiness - 10);
    state.finances.cash += 5000;
    state.career.job = { professionId: 'retail', levelId: 'associate', title: 'Sales Associate', employer: { name: 'Bayside Market' }, salary: 30000 };
    const r = review(before, state);
    assert.ok(r.stats.happiness <= -3, 'happiness drop');
    assert.equal(r.cash, 5000);
    assert.match(r.job.text, /Started as Sales Associate at Bayside Market/);
    engine.store.state.lastYear = r;
  },
  'this year: suggestions point at real tabs, change nothing, and fit the life'() {
    const tabs = new Set(TABS.map((t) => t.id));
    for (const seed of [1, 2, 3, 4]) {
      const { engine, state } = life(seed);
      for (let y = 0; y < 70 && state.character.alive; y++) {
        play(engine);
        const before = JSON.stringify(state);
        const steps = nextSteps(state);
        assert.equal(JSON.stringify(state), before, 'pure');
        for (const x of steps) assert.ok(tabs.has(x.tab), `${x.text} → ${x.tab}`);
        if (state.character.age === 19 && !state.prompts.length && !state.legal.incarceration && !state.career.job && !state.education.enrolled) assert.ok(steps.length, 'a 19-year-old with nothing on gets ideas');
      }
    }
  },
  'the tips show for new players and hide when turned off'() {
    const { engine, state } = life(2);
    play(engine);
    assert.match(VIEWS.life(state, { tips: true }), /How to Play/);
    assert.doesNotMatch(VIEWS.life(state, { tips: false }), /How to Play/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} year-review test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} year-review tests passed`);
