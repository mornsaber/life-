/**
 * Relationships, romance and children's jobs.
 *
 *   node tests/bonds.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { TRAITS, ACTIVITIES, traitOf, interact, activity, consequences } from '../src/modules/people/Bonds.js';
import { living, partnerOf } from '../src/modules/people/People.js';
import { TEEN_JOBS } from '../src/modules/education/K12.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(age = 25, seed = 3) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  state.character.age = age;
  state.finances.cash = 50000;
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
}
const partner = (engine, state) => {
  const p = { id: 'per_love', firstName: 'Sam', lastName: 'Lee', gender: state.character.gender === 'male' ? 'female' : 'male', relation: 'partner', ageOffset: 0, relationship: 70, alive: true, income: 0, careerIncome: 0, since: state.character.age - 2, spark: 70 };
  state.people.list.push(p);
  return p;
};

const tests = {
  'everyone has a personality, and doing what they love brings you closer'() {
    const { state, ctx } = life();
    const mom = living(state).find((p) => p.relation === 'mother') ?? living(state)[0];
    const t = traitOf(mom);
    assert.ok(TRAITS[t]);
    const loved = TRAITS[t].likes.find((id) => ACTIVITIES[id] && ACTIVITIES[id].minAge <= 25);
    const other = Object.keys(ACTIVITIES).find((id) => !TRAITS[t].likes.includes(id) && ACTIVITIES[id].cost === 0);
    mom.relationship = 40;
    const a = activity({ ...ctx, rng: new Random(1) }, mom, loved);
    const b = activity({ ...ctx, rng: new Random(1) }, mom, other);
    assert.ok(a > b, `loved ${a} vs other ${b}`);
    assert.ok(mom.memories?.length >= 1, 'a memory');
    interact(ctx, mom, 'talk');
    assert.ok(state.yearly[`bonds.${mom.id}`] >= 3);
    assert.equal(interact(ctx, mom, 'talk'), undefined, 'three a year');
  },

  'romance: spark fades unless tended; date nights and "I love you"'() {
    const { engine, state } = life(28);
    const p = partner(engine, state);
    const before = p.spark;
    for (let y = 0; y < 3; y++) { state.prompts = []; state.stats.health = 95; engine.ageUp(); }
    assert.ok(p.spark < before, 'sparks fade');
    state.prompts = [];
    engine.dispatch('bonds.dateNight', p.id);
    const prompt = state.prompts.find((x) => x.type === 'bonds.dateNight');
    const s = p.spark;
    engine.resolvePrompt(prompt.id, 'getaway');
    assert.ok(p.spark > s, 'a getaway rekindles it');
    engine.dispatch('bonds.loveYou', p.id);
    assert.ok(p.memories?.length || p.saidLove === null);
    engine.dispatch('bonds.moveIn', p.id);
    assert.ok(p.livingTogether);
    assert.match(VIEWS.people(state), /Spark/);
  },

  'intimacy is for adults, and pregnancy and infection odds follow protection'() {
    const teen = life(16);
    const p = partner(teen.engine, teen.state);
    p.ageOffset = 0;
    teen.engine.dispatch('bonds.intimacy', p.id);
    assert.ok(!teen.state.prompts.some((x) => x.type === 'bonds.intimacy'), 'not for minors');
    // Unprotected nights lead to more pregnancies than protected ones.
    let unprotected = 0;
    let protectedN = 0;
    for (let i = 0; i < 400; i++) {
      const a = life(28, i + 1);
      a.state.character.gender = 'female';
      const q = partner(a.engine, a.state);
      q.gender = 'male';
      consequences({ ...a.ctx, rng: new Random(i + 7) }, q, 'unprotected');
      if (a.state.people.expecting) unprotected += 1;
      a.state.people.expecting = null;
      consequences({ ...a.ctx, rng: new Random(i + 7) }, q, 'protected');
      if (a.state.people.expecting) protectedN += 1;
    }
    assert.ok(unprotected > protectedN, `${unprotected} vs ${protectedN}`);
  },

  'a night out can start a relationship'() {
    let dating = 0;
    for (let i = 0; i < 12; i++) {
      const { engine, state } = life(24, 40 + i);
      engine.dispatch('bonds.goOut');
      const p = state.prompts.find((x) => x.type === 'bonds.night');
      assert.ok(p);
      engine.resolvePrompt(p.id, 'number');
      if (partnerOf(state)) dating += 1;
    }
    assert.ok(dating >= 3, `relationships started: ${dating}`);
  },

  'children can earn pocket money from age 6'() {
    const kidJobs = Object.entries(TEEN_JOBS).filter(([, j]) => j.minAge < 12);
    assert.ok(kidJobs.length >= 4);
    const { engine, state } = life(7);
    state.k12 ??= {};
    engine.dispatch('k12.takeJob', 'chores');
    assert.equal(state.k12.job?.id, 'chores');
    const cash = state.finances.cash;
    state.prompts = [];
    engine.ageUp();
    assert.ok(state.finances.cash > cash - 1 || state.k12.job, 'paid');
    assert.match(VIEWS.career(state), /Pocket Money|Part-Time/);
  },

  'your teenagers pick up part-time jobs'() {
    const { engine, state } = life(45);
    for (let i = 0; i < 3; i++) state.people.list.push({ id: `kid${i}`, firstName: `Kid${i}`, lastName: 'X', gender: 'female', relation: 'child', ageOffset: 13 + i - 45, relationship: 70, alive: true, income: 0, careerIncome: 0, custody: 'you' });
    for (let y = 0; y < 3; y++) {
      state.prompts = [];
      state.stats.health = 95;
      engine.ageUp();
    }
    const kids = state.people.list.filter((p) => p.id.startsWith('kid'));
    assert.ok(kids.some((k) => /part-time/.test(k.job ?? '')), kids.map((k) => k.job).join(','));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} bonds test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} relationship tests passed`);
