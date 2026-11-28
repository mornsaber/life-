/**
 * Your life in the news (life/News.js): the year's big story and where you were.
 *
 *   node tests/newsthread.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { whereYouWere } from '../src/modules/life/News.js';
import { newsThreadCard } from '../src/ui/views/CirclesView.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(cc, birth, age, seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  engine.newLife({ countryId: cc, startYear: birth, economy: 'historical' });
  for (let i = 0; i < age; i++) { engine.state.prompts = []; engine.state.stats.health = 90; engine.ageUp(); }
  return { engine, state: engine.state };
}

const tests = {
  'a child born in 1905 has a thread through the world wars'() {
    const { state } = life('GB', 1905, 45);
    const t = state.news.thread ?? [];
    assert.ok(t.length >= 3, `thread has ${t.length}`);
    assert.ok(t.every((x) => /; (you were|the year) /.test(x.text)));
    assert.ok(t.every((x) => x.year >= 1911 && x.year <= 1950));
    assert.match(newsThreadCard(state), /Your Life in the News/);
  },
  'the year you married someone is the year you married them'() {
    const { engine, state } = life('GB', 1905, 33);
    state.people.list.push({ id: 'per_tom', firstName: 'Tom', relation: 'spouse', gender: 'male', alive: true, ageOffset: 0 });
    engine.context().emit('people:married', { personId: 'per_tom' });
    assert.match(state.news.mine.text, /the year you married Tom/);
    const before = state.news.thread.length;
    state.prompts = [];
    engine.ageUp();
    if (state.news.thread.length > before) assert.match(state.news.thread.at(-1).text, /married Tom/);
    assert.equal(state.news.mine, undefined);
  },
  'a married woman in 1930 keeps house'() {
    const { state } = life('GB', 1900, 30);
    state.character.gender = 'female';
    state.career.job = null;
    state.people.list = state.people.list.filter((p) => p.relation !== 'child');
    state.people.list.push({ id: 'per_h', firstName: 'Bill', relation: 'spouse', gender: 'male', alive: true, ageOffset: 2 });
    assert.match(whereYouWere(state), /keeping house/);
  },
  'where you were: at school as a child'() {
    const { state } = life('US', 1950, 10);
    assert.match(whereYouWere(state), /you were 10/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
