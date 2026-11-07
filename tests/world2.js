/**
 * Living cities and the yearly front page.
 *
 *   node tests/world2.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { citiesTick, cityOf, cityCrimeFactor } from '../src/modules/life/Cities.js';
import { printPaper, addStory, latestPage } from '../src/modules/life/News.js';
import { crimeLevelHere } from '../src/modules/crime/CrimeWorld.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId = 'US', seed = 3, age = 30) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  state.character.age = age;
  state.prompts = [];
  state.finances.cash = 100000;
  return { engine, state, ctx: engine.context() };
}
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };

const tests = {
  'a recession costs a city jobs and raises crime, which makes crime likelier to find you'() {
    const { state, ctx } = life('US', 5);
    citiesTick(ctx);
    const start = { ...cityOf(state) };
    state.economy.phase = 'recession';
    const calm = crimeLevelHere(state);
    for (let y = 0; y < 4; y++) { citiesTick(ctx); state.character.age += 1; }
    assert.ok(cityOf(state).jobs < start.jobs, 'jobs fall');
    assert.ok(cityOf(state).crime > start.crime, 'crime rises');
    assert.ok(cityCrimeFactor(state) > 0.6);
    assert.ok(crimeLevelHere(state) >= calm, 'crime level follows the city');
    clean(VIEWS.move(state, {}));
  },
  'your police force brings crime down'() {
    const { state, ctx } = life('US', 6);
    citiesTick(ctx);
    state.institution = { kind: 'police', quality: 80 };
    const before = cityOf(state).crime;
    for (let y = 0; y < 8; y++) { citiesTick(ctx); state.character.age += 1; }
    assert.ok(cityOf(state).crime < before);
  },
  'the front page fills every section, puts you on it, and keeps a bounded archive'() {
    const { state, ctx } = life('US', 7);
    for (let y = 0; y < 40; y++) {
      if (y === 25) addStory(state, { tier: 'local', headline: 'Local hero saves cat', weight: 9, you: true });
      printPaper(ctx);
      state.character.age += 1;
    }
    const page = latestPage(state);
    for (const tier of ['world', 'national', 'local']) assert.ok(page.stories.some((s) => s.tier === tier), `${tier} section`);
    assert.ok(state.news.pages.length <= 30);
    assert.ok(state.news.pages.some((p) => p.stories.some((s) => s.you)), 'you made the paper');
    clean(VIEWS.life(state, {}));
  },
  'a war breaking out makes the news'() {
    const { state, ctx } = life('US', 8);
    printPaper(ctx);
    state.world.wars = { ...(state.world.wars ?? {}), RU: { since: state.character.age } };
    state.character.age += 1;
    printPaper(ctx);
    assert.ok(latestPage(state).stories.some((s) => /War breaks out/.test(s.headline)));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} world tests passed`);
