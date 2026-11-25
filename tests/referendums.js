/**
 * Referendums: history's are counted, not scripted (either result can happen, and it does what it
 * says); laws put to the people are set by the result; a head of government can call one, and a
 * territory can vote itself independent.
 *
 *   node tests/referendums.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { sync } from '../src/modules/world/History.js';
import { statuteIn } from '../src/modules/politics/StatuteBook.js';
import { questionsHere, HISTORIC } from '../src/modules/politics/Referendums.js';
import { autonomyHere, presidencyInEra } from '../src/modules/world/Eras.js';
import { euMemberIn } from '../src/modules/world/EuMembership.js';
import { REGIONAL_EPISODES } from '../src/modules/world/RegionalEpisodes.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function at(cc, year, seed, vote = 'abstain') {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - 30, firstName: 'Ada', lastName: 'Vale', gender: 'male' });
  state.character.age = 29; state.prompts = []; sync(state);
  for (let i = 0; i < 2; i++) {
    state.stats.health = 95;
    engine.ageUp();
    for (let k = 0; k < 10 && state.prompts.length; k++) { const q = state.prompts[0]; engine.resolvePrompt(q.id, q.type === 'referendum.vote' ? vote : q.options.at(-1).id); }
    state.prompts = [];
  }
  return { engine, state };
}
let n = 0;
const t = (name, fn) => { fn(); n += 1; console.log(`  ✔ ${name}`); };

t('no scripted referendum episodes are left', () => {
  for (const id of ['fo.referendum', 'bm.referendum', 'gi.referendum', 'gl.ec', 'cl.no', 'no.ec72', 'ca.ref95']) assert.ok(!REGIONAL_EPISODES.some((e) => e.id === id), id);
  assert.ok(HISTORIC.length >= 18);
});
t('a close vote can go either way (Ireland 1995), and Norway 1972 does what it says', () => {
  const results = [];
  for (let seed = 1; seed <= 10; seed++) {
    const { state } = at('IE', 1995, seed);
    const r = state.world.referendums.held.ie1995;
    assert.ok(r, `held (seed ${seed})`);
    results.push(r.yes > 50);
    assert.equal(statuteIn(state, 'divorce', 'IE'), r.yes > 50, 'the law follows the vote');
  }
  for (let seed = 1; seed <= 3; seed++) {
    const { state } = at('NO', 1972, seed);
    const r = state.world.referendums.held.no1972;
    assert.equal(euMemberIn('NO', 1980), r.yes > 50, 'membership follows the vote');
  }
  assert.ok(results.includes(true) && results.includes(false), `both results happen: ${results}`);
});
t('a head of government can put a question; a territory can vote itself free', () => {
  const { engine, state } = at('BM', 2005, 3);
  state.politics.office = { id: 'bm_pm', since: state.character.age, approval: 60 };
  const qs = questionsHere(state).map((x) => x.q);
  assert.ok(qs.includes('independence') && qs.some((q) => q.startsWith('law:')));
  // Independence, until it wins.
  for (let i = 0; i < 25 && autonomyHere(state); i++) {
    state.yearly = {};
    engine.dispatch('referendum.call', 'independence');
    state.stats.health = 95; engine.ageUp();
    for (let k = 0; k < 10 && state.prompts.length; k++) { const q = state.prompts[0]; engine.resolvePrompt(q.id, q.type === 'referendum.vote' ? 'campaignYes' : q.options.at(-1).id); }
    state.prompts = [];
  }
  assert.ok(Object.keys(state.world.referendums.held).some((k) => k.startsWith('independence.')), 'held');
  if (!autonomyHere(state)) {
    assert.ok(state.world.independent.BM);
    assert.equal(presidencyInEra(state, 'BM'), true);
  }
});
console.log(`referendums: ${n} passed`);
