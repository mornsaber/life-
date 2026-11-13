/**
 * Life at court (world/CourtLife.js): protection and threats, the press office, consent to
 * marry, and what stepping back costs and pays.
 *
 *   node tests/courtlife.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { protectionOf, consentNeeded } from '../src/modules/world/CourtLife.js';
import { householdView, estatesView } from '../src/ui/views/CrownCard.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const royal = (cc, level, gender = 'male', seed = 1, age = 26) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, royalLevel: level, gender });
  for (let i = 0; i < age && state.character.alive; i++) { state.prompts = []; state.stats.health = 95; engine.ageUp(); }
  state.prompts = [];
  state.yearly = {};
  return { engine, state };
};
const engage = (state) => {
  for (const p of state.people.list) if (['partner', 'fiance', 'spouse'].includes(p.relation)) p.relation = 'ex';
  const f = { id: 'fi1', firstName: 'Robin', lastName: 'Ash', gender: 'female', relation: 'fiance', ageOffset: 0, alive: true, relationship: 80, income: 0, since: state.character.age - 2 };
  state.people.list.push(f);
  return f;
};

const tests = {
  'the state protects working royals near the throne; stepping back loses it'() {
    const { engine, state } = royal('GB', 'child');
    state.royal.working = true;
    assert.equal(protectionOf(state), 'state');
    engine.dispatch('crown.stepBack');
    assert.equal(protectionOf(state), 'none');
    state.finances.cash = 5e6;
    engine.dispatch('courtLife.protection', 'private');
    assert.equal(protectionOf(state), 'private');
    assert.match(householdView(state), /Protection/);
  },
  'near the throne you need consent to marry; refusing leaves you a choice'() {
    const { engine, state } = royal('GB', 'child', 'male', 2);
    if (state.royal.line == null || state.royal.line > 6) return;
    const f = engage(state);
    assert.ok(consentNeeded(state));
    engine.dispatch('people.wed', 'courthouse');
    assert.equal(f.relation, 'fiance', 'the wedding waits on consent');
    assert.match(householdView(state), /Consent to Marry/);
    f.suitability = 1;
    const chance = engine.rng.chance; engine.rng.chance = () => false;
    engine.dispatch('courtLife.askConsent');
    engine.rng.chance = chance;
    assert.equal(f.royalConsent, 'refused');
    engine.dispatch('courtLife.marryWithout');
    assert.equal(state.royal.line, null, 'out of the line');
    state.finances.cash = 1e5;
    engine.dispatch('people.wed', 'courthouse');
    assert.equal(f.relation, 'spouse');
  },
  'a Japanese princess who marries leaves the imperial family'() {
    const { engine, state } = royal('JP', 'child', 'female', 3);
    engage(state);
    state.finances.cash = 1e5;
    engine.dispatch('people.wed', 'courthouse');
    assert.equal(state.royal, null);
    assert.ok(state.character.formerRoyal?.married);
  },
  'after stepping back: the deals pay, and the family pays too'() {
    const { engine, state } = royal('GB', 'child', 'male', 4);
    state.royal.working = true;
    engine.dispatch('crown.stepBack');
    assert.match(estatesView(state), /Life After Duty/);
    const cash = state.finances.cash;
    const mum = state.people.list.find((p) => p.relation === 'mother' && p.alive !== false);
    const before = mum?.relationship;
    engine.dispatch('courtLife.deal', 'memoir');
    assert.ok(state.finances.cash > cash + 1e7);
    if (mum) assert.ok(mum.relationship < before);
  },
  'the press office line is set and kept'() {
    const { engine, state } = royal('NL', 'heir', 'female', 5);
    state.royal.working = true;
    engine.dispatch('courtLife.pressOffice', 'cultivate');
    assert.equal(state.royal.pressOffice, 'cultivate');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 5).join('\n  ')}`); }
}
if (failed) process.exit(1);
