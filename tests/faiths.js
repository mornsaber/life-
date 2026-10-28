/**
 * Faith institutions: bodies, training, offices, duties, and rites for every tradition.
 *
 *   node tests/faiths.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
const minister = (state, ctx, levelId) => hire(ctx, { professionId: 'clergy', levelId, employer: createEmployer(new Random(1), state, getProfession('clergy'), state.character.regionId) });
import { TRADITIONS } from '../src/modules/community/Religions.js';
import { FAITH_BODIES, DECKS, RITES, COMING_OF_AGE } from '../src/modules/community/FaithBodies.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(opts = {}, seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US', ...opts });
  state.legal.record = [];
  state.character.age = 24;
  state.prompts = [];
  state.people.list = state.people.list.filter((p) => p.relation !== 'spouse');
  return { engine, state, ctx: engine.context() };
}
const faith = (state, traditionId, extra = {}) => { state.community.faith = { traditionId, congregation: 'Test House', attendance: 'devout', devoutYears: 6, joinedAge: 0, raised: true, role: null, ...extra }; };
const year = (engine, state, n = 1) => {
  for (let i = 0; i < n && state.character.alive; i++) {
    for (let k = 0; k < 12 && state.prompts.length; k++) {
      const q = state.prompts[0];
      engine.resolvePrompt(q.id, (q.options.find((o) => !o.disabled) ?? q.options[0]).id);
    }
    state.prompts = [];
    state.stats.health = 95;
    engine.ageUp();
  }
};

const tests = {
  'every tradition has a body or a hierarchy, and every deck and rite is well formed'() {
    for (const id of Object.keys(TRADITIONS)) assert.ok(FAITH_BODIES[id] || ['catholic', 'tradCatholic'].includes(id), `${id} has a body`);
    for (const [id, b] of Object.entries(FAITH_BODIES)) {
      assert.ok(TRADITIONS[id], `${id} is a tradition`);
      if (b.deck) assert.ok(DECKS[b.deck]?.length, `${id} deck ${b.deck}`);
      for (const o of b.offices ?? []) assert.ok(['associate', 'minister', 'senior', 'regional'].includes(o.from), `${id} ${o.id}`);
    }
    for (const r of [...RITES, ...COMING_OF_AGE]) for (const t of r.traditions) assert.ok(TRADITIONS[t], `${r.id} → ${t}`);
    for (const deck of Object.values(DECKS)) for (const d of deck) for (const o of d.options) assert.ok(o.text, `${d.id}.${o.id}`);
  },
  'a rabbinical student is formed at Hebrew Union College and ordained, not stranded'() {
    const { engine, state, ctx } = life({ gender: 'female' }, 7);
    faith(state, 'reformJewish');
    state.education.degrees = state.education.degrees.filter((d) => d.programId !== 'seminary');
    minister(state, ctx, 'seminarian');
    assert.equal(state.career.job.levelId, 'seminarian');
    year(engine, state, 3);
    assert.ok(state.education.degrees.some((d) => d.programId === 'seminary' && /Hebrew Union/.test(d.faithTraining)), 'trained');
    assert.equal(state.career.job?.levelId, 'associate', 'ordained');
  },
  'a senior Baptist pastor meets the convention\'s business and can be elected to its offices'() {
    const { engine, state, ctx } = life({ gender: 'male' }, 9);
    faith(state, 'baptist');
    state.education.degrees.push({ type: 'master', programId: 'seminary', year: 24 });
    minister(state, ctx, 'senior');
    state.community.institution = { traditionId: 'baptist', standing: 95, office: null, history: [] };
    for (let i = 0; i < 12 && !state.community.institution.office; i++) year(engine, state, 1);
    assert.ok(state.community.institution.office, 'elected');
    assert.match(VIEWS.community(state, {}), /Southern Baptist Convention/);
    state.prompts = [];
    engine.dispatch('faithInstitutions.resignOffice');
    assert.equal(state.community.institution.office, null);
    assert.ok(state.community.institution.history.length >= 1);
  },
  'the Hajj makes a hajji, once'() {
    const { engine, state } = life({ gender: 'male' }, 11);
    faith(state, 'sunni');
    state.finances.cash = 50000;
    engine.dispatch('faithInstitutions.rite', 'hajj');
    assert.equal(state.community.honorific, 'Hajji');
    assert.ok(state.community.rites.hajj != null);
    state.yearly = {};
    const cash = state.finances.cash;
    engine.dispatch('faithInstitutions.rite', 'hajj');
    assert.equal(state.finances.cash, cash, 'not twice');
    assert.match(VIEWS.community(state, {}), /The Hajj/);
  },
  'a raised Jewish boy has his bar mitzvah at 13; a Sikh boy his first turban at 12'() {
    for (const [t, age, id] of [['conservativeJewish', 13, 'barMitzvah'], ['sikh', 12, 'dastar']]) {
      const { engine, state } = life({ gender: 'male' }, 13);
      faith(state, t);
      state.character.age = age - 1;
      year(engine, state, 1);
      assert.equal(state.community.rites?.[id], age, `${t} ${id}`);
    }
  },
  'an LDS mission takes two years away from the job market'() {
    const { engine, state } = life({ gender: 'male' }, 15);
    faith(state, 'lds');
    state.character.age = 19;
    state.career.job = null;
    state.education.enrolled = null;
    engine.dispatch('faithInstitutions.rite', 'mission');
    assert.ok(state.community.mission, 'on a mission');
    year(engine, state, 2);
    assert.equal(state.community.mission, null, 'home');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} faith test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} faith tests passed`);
