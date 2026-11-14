/**
 * Laws by country (politics/LawsByCountry.js) and the one place to change them (Change a Law):
 * local names, laws that exist from their country's own date, and how each vote looks today.
 *
 *   node tests/lawshere.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { LAWS } from '../src/modules/politics/Laws.js';
import { lawHere, projectBill, whereFor } from '../src/modules/politics/Legislature.js';
import { lawExistsHere } from '../src/modules/politics/LawsByCountry.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc, year = null, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, ...(year ? { startYear: year - 45 } : {}) });
  state.character.age = 45;
  state.prompts = [];
  engine.ageUp();
  state.prompts = [];
  return { engine, state };
};
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };

const tests = {
  'laws take their local names'() {
    life('GB');
    assert.equal(LAWS.corporateRate.name, 'Corporation Tax');
    assert.equal(LAWS.propertyTax.name, 'Council Tax');
    life('DE');
    assert.match(LAWS.minWage.name, /Mindestlohn/);
    life('US');
    assert.equal(LAWS.corporateRate.name, 'Federal corporate tax rate');
  },
  'a minimum wage on the books from its country\'s date (never in Sweden) — but you may bring one in'() {
    assert.equal(lawExistsHere('minWage', 'GB', 1980), false);
    assert.equal(lawExistsHere('minWage', 'GB', 2005), true);
    assert.equal(lawExistsHere('minWage', 'SE', 2020), false);
    assert.equal(lawExistsHere('cannabis', 'FR', 2020), false);
    life('SE');
    // History never gave Sweden one, and the background majority won't; a member can still table the bill.
    assert.equal(lawHere('minWage', 'federal', 'SE'), true);
  },
  'a prime minister sends bills from one card, with the vote projected'() {
    const { engine, state } = life('GB');
    state.politics.office = { id: 'gb_pm', approval: 55, terms: 1, termYearsLeft: 4, startAge: 44, salary: 1 };
    void engine;
    const html = VIEWS.chamber(state, {});
    assert.match(html, /Change a Law/);
    assert.match(html, /Corporation Tax/);
    assert.doesNotMatch(html, /Right-to-work|Card-check|Private policing/);
    assert.match(html, /Passes|Fails/);
    clean(html);
    const p = projectBill(state, 'federal', whereFor(state, 'federal'), 'corporateRate', 'up');
    assert.ok(p && p.rows.length >= 1 && p.rows[0].byParty.length >= 2);
  },
  'a business owner lobbies from the same card'() {
    const { engine, state } = life('US');
    engine.dispatch('business.start', 'consulting');
    if (!state.business.current) state.business.current = { id: 'b', typeId: 'consulting', name: 'Acme', reputation: 50, family: [], staff: { headcount: 0, morale: 60, costPremium: 1 } };
    const html = VIEWS.chamber(state, {});
    assert.match(html, /Change a Law/);
    assert.match(html, /legislature\.lobby/);
    clean(html);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
