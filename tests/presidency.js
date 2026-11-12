/**
 * Running the country (politics/Presidency.js): forming a cabinet, executive orders the courts can
 * strike down, court vacancies, divided government, and a prime minister's confidence votes.
 *
 *   node tests/presidency.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { runsCountry, presidential, orderOptions } from '../src/modules/politics/Presidency.js';
import { levelValue } from '../src/modules/politics/Laws.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const take = (cc, officeId, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc });
  state.character.age = 50;
  state.prompts = [];
  engine.ageUp();
  state.politics.office = { id: officeId, approval: 55, terms: 1, termYearsLeft: 4, startAge: 51, salary: 1 };
  return { engine, state };
};
const year = (engine, state, pick = {}) => {
  state.prompts = [];
  state.stats.health = 95;
  engine.ageUp();
  for (let i = 0; i < 8 && state.prompts.length; i++) {
    const p = state.prompts[0];
    engine.resolvePrompt(p.id, pick[p.type] ?? p.options.find((o) => !o.disabled && o.tone !== 'danger')?.id ?? p.options[0].id);
  }
};
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };

const tests = {
  'a president forms a cabinet, and signs executive orders'() {
    const { engine, state } = take('US', 'president');
    assert.equal(runsCountry(state), true);
    assert.equal(presidential(state), true);
    year(engine, state, { 'presidency.cabinet': 'technocrats' });
    assert.equal(state.presidency.cabinet?.style, 'technocrats');
    const opt = orderOptions(state)[0];
    assert.ok(opt, 'something to order');
    state.prompts = [];
    engine.dispatch('presidency.order', `${opt.id}|${opt.dir}`);
    assert.equal(state.presidency.orders.length, 1);
    assert.deepEqual(levelValue(state, opt.id, 'federal', 'US'), opt.to);
    const html = VIEWS.politics(state, {});
    assert.match(html, /The Presidency/);
    assert.match(html, /Orders in force/);
    clean(html);
  },
  'the courts strike down some orders over a term'() {
    let struck = 0;
    for (let seed = 1; seed <= 4; seed++) {
      const { engine, state } = take('US', 'president', seed);
      year(engine, state);
      const opt = orderOptions(state)[0];
      state.prompts = [];
      engine.dispatch('presidency.order', `${opt.id}|${opt.dir}`);
      for (let i = 0; i < 4; i++) { state.politics.office.termYearsLeft = 4; year(engine, state); }
      if (!state.presidency.orders.length) struck++;
    }
    assert.ok(struck >= 1, `${struck}/4`);
  },
  'a prime minister has no executive orders, and reshuffles'() {
    const { engine, state } = take('GB', 'gb_pm');
    assert.equal(presidential(state), false);
    year(engine, state);
    state.prompts = [];
    engine.dispatch('presidency.order', 'corporateRate|up');
    assert.equal(state.presidency.orders.length, 0);
    const before = state.politics.office.approval;
    engine.dispatch('presidency.reshuffle');
    assert.ok(state.politics.office.approval >= before);
    const html = VIEWS.politics(state, {});
    assert.match(html, /The Government/);
    clean(html);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
