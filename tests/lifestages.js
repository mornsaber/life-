/**
 * Raising children, your own old age, best friends and friend groups, hobbies that go somewhere.
 *
 *   node tests/lifestages.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { makePerson } from '../src/modules/people/PeopleEngine.js';
import { parentingTick, parentingOf } from '../src/modules/people/Parenting.js';
import { laterLifeTick, laterLifeOf } from '../src/modules/people/LaterLife.js';
import { friendGroupsTick, bestFriend, groupsOf } from '../src/modules/people/FriendGroups.js';
import { hobbiesOf, tierOf, hobbiesTick } from '../src/modules/life/Hobbies.js';
import { addCondition } from '../src/modules/health/HealthEngine.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(seed = 3, age = 35) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US' });
  state.character.age = age;
  state.prompts = [];
  state.finances.cash = 200_000;
  return { engine, state, ctx: engine.context() };
}
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };
const kid = (ctx, age) => { const c = makePerson(ctx, { relation: 'child', age, relationship: 80, custody: 'you' }); ctx.state.people.list.push(c); return c; };

const tests = {
  'parenting: an approach, a school at five, lessons, wellbeing, and the teenage years'() {
    const { engine, state, ctx } = life();
    const c = kid(ctx, 4);
    engine.dispatch('parenting.style', 'authoritative');
    assert.equal(state.parentingStyle.id, 'authoritative');
    engine.dispatch('parenting.lessons', `${c.id}:music`);
    state.character.age += 1; // the child is now five
    parentingTick(ctx);
    const pick = state.prompts.find((p) => p.type === 'parenting.schoolChoice');
    assert.ok(pick, 'a school choice at five');
    engine.resolvePrompt(pick.id, 'private');
    assert.equal(parentingOf(c).school, 'private');
    clean(VIEWS.people(state, {}));
    assert.match(VIEWS.people(state, {}), /Parenting/);
    const cash = state.finances.cash;
    parentingTick(ctx);
    assert.ok(state.finances.cash < cash, 'fees are paid');
    let trouble = 0;
    for (let y = 0; y < 12; y++) {
      state.character.age += 1;
      state.prompts = [];
      parentingOf(c).wellbeing = 30;
      parentingTick(ctx);
      const p = state.prompts.find((x) => ['parenting.trouble', 'parenting.mind'].includes(x.type));
      if (p) { trouble += 1; engine.resolvePrompt(p.id, p.options[0].id); }
    }
    assert.ok(trouble >= 1, 'the teenage years bring trouble');
  },
  'later life: power of attorney, the car keys, and what happens without one'() {
    const a = life(4, 60);
    const child = makePerson(a.ctx, { relation: 'child', age: 32, relationship: 75 });
    a.state.people.list.push(child);
    a.engine.dispatch('laterLife.poa', child.id);
    assert.equal(laterLifeOf(a.state).poa, child.id);
    clean(VIEWS.people(a.state, {}));
    assert.match(VIEWS.people(a.state, {}), /Later Life/);
    const b = life(5, 82);
    addCondition(b.ctx, 'dementia', { quiet: true });
    const cash = b.state.finances.cash;
    laterLifeTick(b.ctx);
    assert.ok(laterLifeOf(b.state).guardian, 'a court guardian');
    assert.ok(b.state.finances.cash < cash);
    b.engine.dispatch('laterLife.poa', 'professional');
    assert.ok(!laterLifeOf(b.state).poa, 'too late to sign once capacity is gone');
    const c = life(6, 79);
    let seen = 0;
    for (let y = 0; y < 8; y++) { c.state.character.age += 1; c.state.prompts = []; laterLifeTick(c.ctx); const p = c.state.prompts.find((x) => x.type === 'laterLife.event'); if (p) { seen += 1; c.engine.resolvePrompt(p.id, p.options[0].id); } }
    assert.ok(seen >= 1);
  },
  'friends: a best friend with an arc, and groups that do things together'() {
    const { engine, state, ctx } = life(7, 30);
    const fs = [0, 1, 2].map(() => { const f = makePerson(ctx, { relation: 'friend', age: 30, relationship: 70, circle: 'college' }); state.people.list.push(f); return f; });
    engine.dispatch('friendGroups.best', fs[0].id);
    assert.equal(bestFriend(state).id, fs[0].id);
    assert.equal(groupsOf(state).length, 1);
    clean(VIEWS.people(state, {}));
    assert.match(VIEWS.people(state, {}), /Best friend/);
    let arcs = 0; let groups = 0;
    for (let y = 0; y < 25; y++) {
      state.character.age += 1;
      state.prompts = [];
      friendGroupsTick(ctx);
      for (const p of [...state.prompts]) {
        if (p.type === 'friendGroups.arc') arcs += 1;
        if (p.type === 'friendGroups.group') groups += 1;
        if (p.type.startsWith('friendGroups.')) engine.resolvePrompt(p.id, p.options[0].id);
      }
    }
    assert.ok(arcs >= 2, `arc steps ${arcs}`);
    assert.ok(groups >= 2, `group events ${groups}`);
  },
  'hobbies: practice climbs the tiers, events pay at the top, and sport fades with age'() {
    const { engine, state, ctx } = life(8, 16);
    engine.dispatch('hobbies.take', 'guitar');
    engine.dispatch('hobbies.take', 'running');
    const g = hobbiesOf(state).guitar;
    ctx.rng.chance = () => true;
    for (let y = 0; y < 18; y++) {
      state.yearly = {};
      engine.dispatch('hobbies.practise', 'guitar');
      engine.dispatch('hobbies.practise', 'running');
      engine.dispatch('hobbies.compete', 'guitar');
      hobbiesTick(ctx);
      state.character.age += 1;
    }
    assert.ok(g.skill >= 75, `guitar ${g.skill} (${tierOf(g.skill).label})`);
    assert.ok(g.wins >= 3 && g.earned > 0, 'semi-pro: wins and gigs');
    clean(VIEWS.activities(state, {}));
    assert.match(VIEWS.activities(state, {}), /Hobbies/);
    state.character.age = 60;
    hobbiesTick(ctx);
    assert.ok(hobbiesOf(state).running.skill <= 30, 'a 60-year-old runner has a lower ceiling');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} life-stage test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} life-stage tests passed`);
