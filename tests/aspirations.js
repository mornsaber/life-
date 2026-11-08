/**
 * Aspirations: offered at 16, chosen, tracked, fulfilled (a milestone and Hall of Fame points),
 * dropped, and remembered in the obituary.
 *
 *   node tests/aspirations.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS, TABS } from '../src/ui/Renderer.js';
import { ASPIRATIONS, WORK_ON, offers } from '../src/modules/life/Aspirations.js';
import { lifeScore } from '../src/modules/life/Achievements.js';
import { lifeStoryFacts } from '../src/modules/life/LifeStory.js';
import { nextSteps } from '../src/modules/life/Guide.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const teen = (seed = 4) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  state.character.age = 15;
  state.prompts = [];
  engine.ageUp();
  return { engine, state };
};

const tests = {
  'at 16 you are offered three aims that fit your life'() {
    const { state } = teen();
    const p = state.prompts.find((x) => x.type === 'aspirations.choose');
    assert.ok(p, 'an offer at 16');
    const ids = p.options.map((o) => o.id).filter((id) => id !== 'none');
    assert.equal(ids.length, 3);
    for (const id of ids) assert.ok(ASPIRATIONS[id].fits(state));
    assert.deepEqual(ids, offers(state), 'the same three on a reload');
  },
  'a fulfilled aim is a milestone, shows as fulfilled and counts in the Hall of Fame'() {
    const { engine, state } = teen();
    const p = state.prompts.find((x) => x.type === 'aspirations.choose');
    state.prompts = [p];
    engine.resolvePrompt(p.id, 'master' in Object.fromEntries(p.options.map((o) => [o.id, 1])) ? 'master' : p.options[0].id);
    const id = state.aspirations.active[0].id;
    assert.match(VIEWS.life(state, {}), /Aspirations/);
    const before = lifeScore(state);
    // Force it done.
    const orig = ASPIRATIONS[id].progress;
    ASPIRATIONS[id].progress = () => 1;
    try { state.prompts = []; engine.ageUp(); } finally { ASPIRATIONS[id].progress = orig; }
    assert.ok(state.aspirations.done.some((d) => d.id === id), 'fulfilled');
    assert.ok(state.log.at(-1).entries.some((e) => /Aspiration fulfilled/.test(e.text) && e.kind === 'milestone'));
    assert.ok(lifeScore(state) > before, 'worth points');
    assert.ok(lifeStoryFacts(state).some(([k]) => k === 'Dreams fulfilled'));
  },
  'you can let one go, and This Year points you at the tab to work on it'() {
    const { engine, state } = teen(6);
    const p = state.prompts.find((x) => x.type === 'aspirations.choose');
    state.prompts = [p];
    engine.resolvePrompt(p.id, p.options[0].id);
    const id = state.aspirations.active[0].id;
    const tabs = new Set(TABS.map((t) => t.id));
    for (const t of Object.values(WORK_ON)) assert.ok(tabs.has(t), t);
    assert.ok(nextSteps(state).some((x) => x.text === `Work toward: ${ASPIRATIONS[id].name}` && x.tab === WORK_ON[id]));
    engine.dispatch('aspirations.drop', id);
    assert.equal(state.aspirations.active.length, 0);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} aspiration test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} aspiration tests passed`);
