/**
 * Conversations: topics by who they are, replies that matter, temperament, promises, grudges,
 * letters before the telephone, a child coming out.
 *
 *   node tests/conversations.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { ConversationsModule, topicsFor, howYouTalk, temperamentOf, TOPICS } from '../src/modules/people/Conversations.js';
import { interact } from '../src/modules/people/Bonds.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (year = 2020, age = 30, seed = 4) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US', startYear: year - age });
  state.character.age = age;
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
};
const person = (state, relation, age, extra = {}) => {
  const p = { id: `p_${relation}_${age}`, firstName: relation === 'mother' ? 'Ruth' : 'Alex', lastName: 'Doe', gender: 'female', relation, ageOffset: age - state.character.age, relationship: 65, alive: true, income: 50000, careerIncome: 50000, ...extra };
  state.people.list.push(p);
  return p;
};

const tests = {
  'topics depend on who they are and how old you are'() {
    const m = life(2020, 30);
    const mum = person(m.state, 'mother', 60);
    const kid = person(m.state, 'child', 9);
    const ids = (p) => topicsFor(m.state, p).map((t) => t.id);
    assert.ok(ids(mum).includes('theirStory') && ids(mum).includes('askMoney'));
    assert.ok(ids(kid).includes('school') && !ids(kid).includes('politics'));
    const young = life(2020, 8);
    assert.ok(!topicsFor(young.state, person(young.state, 'mother', 35)).some((t) => t.id === 'askMoney'));
  },
  'a conversation runs topic → reply → outcome, and uses one of the year\'s times'() {
    const m = life();
    const mum = person(m.state, 'mother', 60);
    const before = mum.relationship;
    ConversationsModule.actions.start(m.ctx, mum.id);
    const t = m.state.prompts.at(-1);
    const topic = t.options.find((o) => o.id === 'theirStory') ? 'theirStory' : t.options[0].id;
    m.engine.resolvePrompt(t.id, topic);
    if (topic !== 'none') m.engine.resolvePrompt(m.state.prompts.at(-1).id, m.state.prompts.at(-1).options[0].id);
    assert.equal(m.state.yearly[`bonds.${mum.id}`], 1);
    assert.notEqual(mum.relationship, before);
  },
  'everyone has a temperament, and far away means a letter before the telephone'() {
    const m = life(1890, 30);
    const sis = person(m.state, 'sibling', 32, { livesIn: 'IE' });
    assert.ok(temperamentOf(sis));
    assert.match(howYouTalk(m.state, sis).verb, /letter/);
    const n = life(1990, 30);
    assert.match(howYouTalk(n.state, person(n.state, 'sibling', 32, { livesIn: 'IE' })).verb, /telephoned/);
  },
  'a promise comes due a year later; breaking it leaves a grudge an apology can clear'() {
    const m = life();
    const friend = person(m.state, 'friend', 30);
    // Find the favour topic deterministically.
    m.state.prompts = [];
    m.ctx.prompt({ type: 'conversations.reply', title: 'x', text: 'x', data: { personId: friend.id, topic: 'favour' }, options: TOPICS.favour.replies.map((r) => ({ id: r.id, label: r.label })) });
    m.engine.resolvePrompt(m.state.prompts.at(-1).id, 'yes');
    assert.equal(m.state.people.promises.length, 1);
    m.state.character.age += 1;
    m.state.prompts = [];
    ConversationsModule.onAgeUp(m.ctx);
    const p = m.state.prompts.find((x) => x.type === 'conversations.promise');
    assert.ok(p, 'the promise comes due');
    m.engine.resolvePrompt(p.id, 'break');
    assert.ok(friend.grudge);
    for (let i = 0; i < 6 && friend.grudge; i++) { m.state.yearly = {}; m.state.world.seed = i + 3; interact(m.ctx, friend, 'apologize'); }
    assert.equal(friend.grudge, null, 'an apology clears it eventually');
  },
  'a grown child may come out to you, and how you answer stays with them'() {
    const m = life(2015, 45);
    const kid = person(m.state, 'child', 17, { queer: true });
    let asked = null;
    for (let i = 0; i < 30 && !asked; i++) { m.state.prompts = []; m.state.world.seed = i; ConversationsModule.onAgeUp(m.ctx); asked = m.state.prompts.find((x) => x.data?.topic === 'childComesOut'); }
    assert.ok(asked);
    const before = kid.relationship;
    m.engine.resolvePrompt(asked.id, 'hug');
    assert.ok(kid.relationship > before + 10 && kid.outToYou);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
