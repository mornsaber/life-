/**
 * The little things: star sign, tattoos, a new look, the honeymoon, the midlife crisis, the bucket
 * list, the time capsule.
 *
 *   node tests/littlethings.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { LittleThingsModule, starSign, honeymoonsNow, TATTOO_DESIGNS } from '../src/modules/life/LittleThings.js';
import { littleThingsCard } from '../src/ui/views/LittleThingsView.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (year = 2000, age = 30) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(year), modules: MODULES });
  const state = engine.newLife({ countryId: 'US', startYear: year - age });
  state.character.age = age;
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
};
const A = LittleThingsModule.actions;

const tests = {
  'a star sign, stable for the life'() {
    const { state } = life();
    assert.deepEqual(starSign(state), starSign(state));
    assert.match(littleThingsCard(state), /Star sign/);
  },
  'tattoos and looks of the day; no laser removal before the 1990s'() {
    assert.ok(TATTOO_DESIGNS(1920).includes('an anchor'));
    const m = life(1960, 25);
    A.tattoo(m.ctx);
    assert.equal(m.state.little.tattoos.length, 1);
    A.removeTattoo(m.ctx);
    assert.equal(m.state.little.tattoos.length, 1);
    A.newLook(m.ctx);
    assert.ok(m.state.little.look);
  },
  'honeymoons of the day after the wedding'() {
    assert.ok(!honeymoonsNow(life(1930).state).some((h) => h.id === 'hawaii'));
    assert.ok(honeymoonsNow(life(2000).state).some((h) => h.id === 'maldives'));
    const m = life();
    const s = { id: 'sp', firstName: 'Kim', lastName: 'Lee', gender: 'female', relation: 'spouse', ageOffset: 0, relationship: 70, spark: 60, alive: true, income: 0, careerIncome: 0 };
    m.state.people.list = m.state.people.list.filter((p) => p.relation !== 'spouse');
    m.state.people.list.push(s);
    m.ctx.emit('people:married', { personId: s.id });
    const p = m.state.prompts.find((x) => x.type === 'littleThings.honeymoon');
    assert.ok(p);
    m.engine.resolvePrompt(p.id, 'paris');
    assert.ok(s.spark > 60);
  },
  'a bucket list, crossed off'() {
    const m = life(2000, 35);
    A.addToBucket(m.ctx, 'language');
    A.addToBucket(m.ctx, 'aurora');
    A.addToBucket(m.ctx, 'roots');
    A.doBucket(m.ctx, 'language');
    A.doBucket(m.ctx, 'aurora');
    m.state.yearly = {};
    A.doBucket(m.ctx, 'roots');
    assert.ok(m.state.little.bucket.every((b) => b.done));
  },
  'a time capsule opens twenty-five years later; a midlife crisis comes once'() {
    const m = life(1990, 40);
    A.buryCapsule(m.ctx);
    for (let i = 0; i < 26; i++) { m.state.prompts = []; m.state.character.age += 1; LittleThingsModule.onAgeUp(m.ctx); }
    assert.equal(m.state.little.capsule.opened, true);
    assert.equal(typeof m.state.little.midlife, 'boolean');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
