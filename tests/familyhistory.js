/**
 * Your family in history (people/FamilyInHistory.js): relatives called up in the total wars,
 * savings lost to hyperinflation, revolutions and Partition, the great emigrations, and
 * grandparents' memories.
 *
 *   node tests/familyhistory.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { familyHistory } from '../src/modules/people/FamilyInHistory.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const grown = (cc, year, age, opts = {}, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age, gender: 'male', ...opts });
  state.character.age = age;
  return { engine, state };
};
let n = 0;
const kin = (state, relation, ageOffset, extra = {}) => {
  const p = { id: `k${++n}`, firstName: `Kin${n}`, lastName: 'Ash', gender: 'male', relation, ageOffset, relationship: 70, alive: true, nationality: state.character.countryId, life: { netWorth: 50000, edu: 'highschool' }, ...extra };
  state.people.list.push(p);
  return p;
};
const year = (engine, state) => { state.prompts = []; state.stats.health = 90; engine.ageUp(); for (let j = 0; j < 6 && state.prompts.length; j++) { const p = state.prompts[0]; engine.resolvePrompt(p.id, p.options.find((o) => !o.disabled && o.tone !== 'danger')?.id ?? p.options[0].id); } };
const logText = (state) => state.log.flatMap((b) => b.entries ?? []).map((e) => e.text).join('\n');

const tests = {
  'the total wars call up the men of the family'() {
    let called = 0;
    for (let seed = 1; seed <= 5; seed++) {
      const { engine, state } = grown('GB', 1913, 45, {}, seed);
      const sons = [kin(state, 'child', -24), kin(state, 'child', -22), kin(state, 'sibling', -6)];
      for (let i = 0; i < 4; i++) year(engine, state);
      called += sons.filter((s) => s.service || s.veteran || !s.alive).length;
    }
    assert.ok(called >= 6, `${called}/15 called up`);
  },
  'a hyperinflation wipes out the family\'s savings'() {
    const { engine, state } = grown('DE', 1921, 30);
    const mum = kin(state, 'mother', 26, { gender: 'female' });
    for (let i = 0; i < 2; i++) year(engine, state);
    assert.ok(mum.life.netWorth < 20000, `${mum.life.netWorth}`);
    assert.match(logText(state), /savings were wiped out/);
  },
  'the great emigrations take brothers and sisters abroad'() {
    let gone = 0;
    for (let seed = 1; seed <= 4; seed++) {
      const { engine, state } = grown('IE', 1850, 20, {}, seed);
      const sibs = [kin(state, 'sibling', 1), kin(state, 'sibling', 3), kin(state, 'sibling', -2)];
      for (let i = 0; i < 8; i++) year(engine, state);
      gone += sibs.filter((s) => s.livesIn && s.livesIn !== 'IE').length;
    }
    assert.ok(gone >= 3, `${gone}/12 emigrated`);
  },
  'Partition sends relatives across the new border'() {
    let crossed = 0;
    for (let seed = 1; seed <= 4; seed++) {
      const { engine, state } = grown('IN', 1946, 30, {}, seed);
      state.community.upbringing = 'sunni';
      if (state.community.faith) state.community.faith.traditionId = 'sunni';
      const fam = [kin(state, 'sibling', 2), kin(state, 'sibling', -3), kin(state, 'mother', 24, { gender: 'female' })];
      year(engine, state);
      crossed += fam.filter((p) => p.livesIn === 'PK').length;
    }
    assert.ok(crossed >= 2, `${crossed}/12`);
  },
  'grandparents tell you what they lived through'() {
    const { engine, state } = grown('GB', 1965, 8);
    year(engine, state);
    assert.match(logText(state), /grand(mother|father) told you about/);
    assert.ok(familyHistory(state).length >= 1);
    const html = VIEWS.people(state, {});
    assert.match(html, /Your Family in History/);
    assert.doesNotMatch(html, /NaN|undefined/);
  },
  'today\'s lives are left alone'() {
    const { engine, state } = grown('IE', 2034, 8);
    year(engine, state);
    assert.equal(familyHistory(state).length, 0);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
