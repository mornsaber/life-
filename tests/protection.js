/**
 * Household staff with perks, and protection for anyone worth guarding.
 *
 *   node tests/protection.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { coverOf, threatOf, kidnapFactor, stateCover } from '../src/modules/life/Protection.js';
import { chauffeured, PERKS, STAFF } from '../src/modules/life/Property.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc, year, age = 40) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(3), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age });
  state.character.age = age; state.prompts = []; state.finances.cash = 5e7;
  return { engine, state };
};

const tests = {
  'every post has a perk, and staff have skill and loyalty'() {
    for (const role of Object.keys(STAFF)) assert.ok(PERKS[role], role);
    const { engine, state } = life('GB', 1905);
    engine.dispatch('property.hire', 'chauffeur|agency');
    const s = state.property.staff[0];
    assert.ok(s.skill >= 50 && s.loyalty > 0);
    assert.ok(chauffeured(state), 'driven by your chauffeur');
    const before = s.loyalty;
    engine.dispatch('property.reward', s.id);
    assert.ok(s.loyalty > before);
    assert.match(VIEWS.property(state, {}), /no drink-driving/);
  },
  'a secretary helps at work; a butler raises your standing'() {
    const { engine, state } = life('GB', 1900);
    for (const role of ['maid', 'cook', 'housekeeper', 'butler', 'secretary']) engine.dispatch('property.hire', role);
    assert.ok(state.property.staff.some((x) => x.role === 'butler'));
    const standing = state.society?.standing ?? 0;
    state.prompts = []; engine.ageUp();
    assert.ok((state.society?.standing ?? 0) > standing);
  },
  'cover adds up: your team, a bodyguard, an armoured car; posture scales it'() {
    const { engine, state } = life('IT', 1976);
    assert.equal(coverOf(state).cover, 0);
    assert.ok(threatOf(state).kidnap > threatOf(state).threat, 'kidnapping was an industry in 1970s Italy');
    engine.dispatch('protection.firm', 2);
    engine.dispatch('protection.armour');
    engine.dispatch('property.hire', 'bodyguard');
    const c = coverOf(state).cover;
    assert.ok(c >= 40, `cover ${c}`);
    engine.dispatch('protection.posture', 'low');
    assert.ok(coverOf(state).cover < c);
    assert.match(VIEWS.property(state, {}), /Protection/);
  },
  'no armoured cars before 1930; kidnap hot spots by place and year'() {
    const { engine, state } = life('GB', 1900);
    engine.dispatch('protection.armour');
    assert.ok(!state.protection.armoured);
    assert.equal(kidnapFactor('IT', 1960), 1);
    assert.ok(kidnapFactor('CO', 1995) > 1);
  },
  'heads of government get the state\'s detail, and can turn it down'() {
    const { engine, state } = life('US', 2000, 55);
    state.politics.office = { id: 'president', approval: 50, termYearsLeft: 4 };
    assert.match(stateCover(state)?.agency ?? '', /Secret Service/);
    engine.dispatch('protection.decline');
    assert.equal(stateCover(state), null);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) process.exit(1);
