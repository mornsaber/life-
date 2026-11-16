/**
 * The first-life tour and the shareable life story (ui/FirstLife.js).
 *
 *   node tests/firstlife.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { STEPS, markStep, firstLifeDone, firstLifeCard, lifeStoryText } from '../src/ui/FirstLife.js';
import { Renderer } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(years = 30) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(12), modules: MODULES });
  const state = engine.newLife({});
  for (let i = 0; i < years && state.character.alive; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  return { engine, state };
}

const tests = {
  'each step ticks off once, from the click that teaches it'() {
    let s = { tips: true };
    assert.equal(markStep(s, 'ui.tab', 'career'), null, 'unrelated clicks change nothing');
    s = markStep(s, 'engine.ageUp');
    assert.deepEqual(s.firstLife, ['age']);
    assert.equal(markStep(s, 'engine.ageUp'), null, 'only once');
    for (const [a, arg] of [['engine.resolve'], ['ui.menu', 'relationships'], ['ui.menu', 'activities'], ['ui.menu', 'occupation'], ['ui.menu', 'assets']]) s = markStep(s, a, arg) ?? s;
    assert.equal(s.firstLife.length, STEPS.length);
    assert.ok(firstLifeDone(s));
  },
  'the card shows progress, and goes when done or when tips are off'() {
    const { state } = life(3);
    assert.match(firstLifeCard(state, { tips: true, firstLife: ['age'] }), /Your First Life \(1\/6\)/);
    assert.equal(firstLifeCard(state, { tips: false }), '');
    assert.equal(firstLifeCard(state, { tips: true, firstLife: STEPS.map((x) => x.id) }), '');
  },
  'the story page shows the tour until it is done, then the tips'() {
    const { engine, state } = life(3);
    const r = new Renderer({ root: null, engine });
    r.settings = { tips: true };
    assert.match(r.homeHtml(state), /Your First Life/);
    r.settings = { tips: true, firstLife: STEPS.map((x) => x.id) };
    assert.doesNotMatch(r.homeHtml(state), /Your First Life/);
    assert.match(r.homeHtml(state), /How to Play/);
  },
  'a finished life has a share button and a plain-text story'() {
    const { engine, state } = life(60);
    state.character.alive = false;
    state.character.causeOfDeath = 'Died peacefully at home';
    const r = new Renderer({ root: null, engine });
    r.settings = { tips: true };
    assert.match(r.html(state), /data-action="ui\.share"/);
    const text = lifeStoryText(state, r.obituary(state));
    assert.match(text, new RegExp(state.character.firstName));
    assert.match(text, /aged \d+/);
    assert.doesNotMatch(text, /<[a-z]/i, 'no markup');
    assert.ok(text.split('\n').length >= 3);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
