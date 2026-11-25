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
import { questionsHere, HISTORIC, becomeIndependent, historicReferendum } from '../src/modules/politics/Referendums.js';
import { autonomyHere, presidencyInEra } from '../src/modules/world/Eras.js';
import { euMemberIn } from '../src/modules/world/EuMembership.js';
import { REGIONAL_EPISODES } from '../src/modules/world/RegionalEpisodes.js';

import { sovereignIn } from '../src/modules/world/HistoricalData.js';
import { orgMember } from '../src/modules/content/packs/careers-intl-orgs.js';
import { honoursSystem } from '../src/modules/world/HonoursOfTheDay.js';
import { periodFlag } from '../src/modules/world/Eras.js';
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function at(cc, year, seed, vote = 'abstain', region = null) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - 30, firstName: 'Ada', lastName: 'Vale', gender: 'male' });
  state.character.age = 29; state.prompts = []; sync(state);
  if (region) state.character.regionId = region;
  for (let i = 0; i < 2; i++) {
    state.stats.health = 95;
    engine.ageUp();
    for (let k = 0; k < 10 && state.prompts.length; k++) { const q = state.prompts[0]; engine.resolvePrompt(q.id, q.type === 'referendum.vote' ? vote : q.options.at(-1).id); }
    state.prompts = [];
  }
  return { engine, state };
}
const said = (state, re) => (state.log ?? []).some((y) => (y.entries ?? []).some((e) => re.test(e.text)));
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
t('Brexit can go either way, and membership follows it', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 12; seed++) {
    const { state } = at('GB', 2016, seed);
    const r = state.world.referendums.held.gb2016;
    if (!r) { assert.ok(!euMemberIn('GB', 2016), 'skipped only if Britain had already left in 1976'); continue; }
    seen.add(r.yes > 50);
    assert.equal(euMemberIn('GB', 2025), r.yes <= 50, `in the EU in 2025 iff Remain (seed ${seed}, ${r.yes})`);
  }
  assert.equal(seen.size, 2, 'both results happen');
});
t('a regional vote asks only the region; the rest of the country just hears the result', () => {
  const ed = at('GB', 2014, 4, 'yes', 'edinburgh');
  const ln = at('GB', 2014, 4, 'yes', 'london');
  assert.ok(ed.state.world.referendums.held.sc2014 && ln.state.world.referendums.held.sc2014, 'counted for both');
  assert.ok(said(ed.state, /Scottish independence.*You were on the (winning|losing) side/), 'a Scot votes');
  assert.ok(!said(ln.state, /Scottish independence.*You were on/) && said(ln.state, /Scottish independence/), 'a Londoner does not');
});
t('the 40 per cent rule: a narrow yes in 1979 is not enough', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const { state } = at('GB', 1979, seed, 'abstain', 'edinburgh');
    const r = state.world.referendums.held.sc1979;
    if (r.yes > 50 && r.yes < 63) assert.ok(said(state, /short of the 40 per cent bar/));
  }
});
t('a territory that votes itself free is a state: sovereign, in the Commonwealth, its own honours in time', () => {
  const { engine, state } = at('BM', 2005, 3);
  const ctx = { state, rng: new Random(1), log: () => {}, emit: () => {} };
  becomeIndependent(ctx, 'BM');
  assert.ok(sovereignIn('BM', 2006) && orgMember('commonwealth', 'BM', 2006) && orgMember('un', 'BM', 2007));
  assert.equal(honoursSystem(state)[0].via, 'GB', 'the British list for the first years');
  state.character.birthYear += 10;
  assert.equal(honoursSystem(state)[0].via, 'BM', 'then an order of its own');
  assert.match(honoursSystem(state)[0].ladder.tiers[0].name, /Order of Bermuda/);
  engine.newLife({ countryId: 'BM', startYear: 1980, firstName: 'Ada', lastName: 'Vale', gender: 'male' });
  assert.ok(!sovereignIn('BM', 2006), 'a new life starts from history again');
});
t('Australia can vote itself a republic; New Zealand can change its flag', () => {
  const au = at('AU', 1999, 1).state;
  historicReferendum('au1999').onYes({ state: au, rng: new Random(1), log: () => {}, emit: () => {}, stat: () => {}, prompt: () => {} });
  assert.ok(au.world.republics?.AU, 'a republic');
  const nz = at('NZ', 2016, 1).state;
  historicReferendum('nz2016').onYes({ state: nz, rng: new Random(1), log: () => {}, emit: () => {} });
  assert.equal(periodFlag(nz, 'NZ').id, 'nzFern');
});
t('after the present, governments call referendums of their own', () => {
  const { engine, state } = at('GB', 2035, 2, 'abstain', 'edinburgh');
  for (let i = 0; i < 40; i++) {
    state.stats.health = 95; engine.ageUp();
    for (let k = 0; k < 10 && state.prompts.length; k++) { const q = state.prompts[0]; engine.resolvePrompt(q.id, q.options.at(-1).id); }
    state.prompts = [];
  }
  assert.ok(Object.keys(state.world.referendums.held).length >= 1, 'at least one in forty years');
});
console.log(`referendums: ${n} passed`);
