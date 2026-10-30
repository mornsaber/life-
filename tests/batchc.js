/**
 * Grown children, pandemic choices, businesses in a downturn, hobbies turning professional,
 * and long-term-care insurance.
 *
 *   node tests/batchc.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { makePerson } from '../src/modules/people/PeopleEngine.js';
import { adultChildrenTick } from '../src/modules/people/Parenting.js';
import { shocksTick, businessShock } from '../src/modules/economy/Shocks.js';
import { hobbiesTick } from '../src/modules/life/Hobbies.js';
import { careCost } from '../src/modules/health/EndOfLife.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(seed = 3, age = 50) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US' });
  state.character.age = age;
  state.prompts = [];
  state.finances.cash = 100000;
  return { engine, state, ctx: engine.context() };
}
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };

const tests = {
  'a troubled upbringing comes back as calls at 3 a.m.; a thriving one as Sunday lunch'() {
    const { engine, state, ctx } = life(4, 50);
    const t = makePerson(ctx, { relation: 'child', age: 22, relationship: 60 });
    t.parenting = { outcome: 'troubled', wellbeing: 30, lessons: [] };
    const g = makePerson(ctx, { relation: 'child', age: 24, relationship: 80 });
    g.parenting = { outcome: 'thriving', wellbeing: 80, lessons: [] };
    state.people.list.push(t, g);
    let calls = 0;
    for (let y = 0; y < 15; y++) { state.character.age += 1; state.prompts = []; adultChildrenTick(ctx); const p = state.prompts.find((x) => x.type === 'parenting.grownTrouble'); if (p) { calls += 1; engine.resolvePrompt(p.id, 'tough'); } }
    assert.ok(calls >= 1);
    assert.ok(state.log.flatMap((y) => y.entries).some((e) => e.text.includes(g.firstName)));
  },
  'a pandemic: lockdown and vaccine choices; restaurants suffer and couriers boom'() {
    const { engine, state, ctx } = life(5, 40);
    Object.assign(state.economy, { phase: 'recession', phaseYears: 0, cause: { id: 'pandemic', since: state.character.age } });
    state.world.pandemic = { active: true, since: state.character.age, name: 'a new virus' };
    shocksTick(ctx);
    const lock = state.prompts.find((p) => p.type === 'shocks.lockdown');
    assert.ok(lock);
    engine.resolvePrompt(lock.id, 'strict');
    state.character.age += 1;
    state.prompts = [];
    shocksTick(ctx);
    const vax = state.prompts.find((p) => p.type === 'shocks.vaccine');
    assert.ok(vax);
    engine.resolvePrompt(vax.id, 'yes');
    assert.ok(state.health.vaccinated);
    assert.ok(businessShock(state, 'restaurant') < 0.7 && businessShock(state, 'courier') > 1);
  },
  'an elite hobbyist is offered a professional career; care insurance pays most of the care home'() {
    const { engine, state, ctx } = life(6, 24);
    state.hobbies = { guitar: { skill: 92, since: 12, practised: true, wins: 4, earned: 0 } };
    ctx.rng.chance = () => true;
    hobbiesTick(ctx);
    const pro = state.prompts.find((p) => p.type === 'hobbies.pro');
    assert.ok(pro);
    engine.resolvePrompt(pro.id, 'go');
    assert.equal(state.career.job?.professionId, 'music');
    const old = life(7, 60);
    const before = careCost(old.state, 'facility');
    old.engine.dispatch('laterLife.ltc');
    assert.ok(old.state.laterLife.ltc);
    old.state.character.age = 70;
    assert.ok(careCost(old.state, 'facility') < before * 0.5);
    clean(VIEWS.people(old.state, {}));
    assert.match(VIEWS.people(old.state, {}), /Long-term-care insurance/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} batch-C tests passed`);
