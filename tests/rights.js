/**
 * Rights by era (legal/Rights.js): credit, custody, who you may marry, the vote, one card.
 *
 *   node tests/rights.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { womenCreditBlock, custodyRule, custodyTilt, mixedMarriageBlock, marriageBlock, sameSexUnion, voteHere, rightsSummary } from '../src/modules/legal/Rights.js';
import { applyCheck } from '../src/modules/life/CreditCards.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId, year, gender = 'female', extra = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES });
  const state = engine.newLife({ countryId, startYear: year - 30, gender, ...extra });
  state.character.age = 30;
  state.character.gender = gender;
  return { engine, state };
}

const tests = {
  'a single woman in 1965 America gets no credit card; by 1980 she does'() {
    const { state } = life('US', 1965);
    state.people.list = state.people.list.filter((p) => p.relation !== 'spouse');
    assert.match(womenCreditBlock(state), /co-sign/);
    assert.equal(applyCheck(state, Object.keys(state.finances?.cards ?? {})[0] ?? 'basic').ok, false);
    const later = life('US', 1980).state;
    assert.equal(womenCreditBlock(later), null);
    assert.equal(womenCreditBlock(life('US', 1965, 'male').state), null);
  },
  'custody follows the law of the day'() {
    assert.equal(custodyRule(life('GB', 1830).state), 'father');
    assert.equal(custodyRule(life('GB', 1900).state), 'tender');
    assert.equal(custodyRule(life('GB', 1990).state), 'best');
    assert.ok(custodyTilt(life('FR', 1950).state) > 0, 'a French mother under the puissance paternelle');
    assert.ok(custodyTilt(life('US', 1950, 'male').state) > 0, 'an American father under the tender years');
  },
  'mixed marriage barred by race laws, and lawful after'() {
    const { state } = life('ZA', 1960, 'male', { skinTone: 1 });
    state.character.skinTone = 1;
    const partner = { id: 'pz', firstName: 'Z', gender: 'female', relation: 'partner', skinTone: 5 };
    assert.match(mixedMarriageBlock(state, partner), /Mixed Marriages/);
    const after = life('ZA', 1990, 'male').state;
    after.character.skinTone = 1;
    assert.equal(mixedMarriageBlock(after, partner), null);
    assert.equal(mixedMarriageBlock(life('GB', 1960, 'male').state, partner), null);
  },
  'two men: nothing, then a partnership, then marriage'() {
    const p = { id: 'pm', firstName: 'M', gender: 'male', relation: 'partner' };
    assert.match(marriageBlock(life('GB', 1980, 'male').state, p), /can't marry/);
    assert.equal(sameSexUnion(life('GB', 2008, 'male').state), 'partnership');
    assert.equal(sameSexUnion(life('NL', 2005, 'male').state), 'marriage');
  },
  'proposing to someone the law forbids you to marry is refused'() {
    const { engine, state } = life('GB', 1960, 'male');
    state.people.list.push({ id: 'pq', firstName: 'Q', lastName: 'R', gender: 'male', relation: 'partner', alive: true, relationship: 95, since: 20, birthAge: 0, ageOffset: 0 });
    engine.dispatch('people.propose', 'pq');
    assert.equal(state.people.list.find((p) => p.id === 'pq').relation, 'partner');
  },
  'the vote'() {
    assert.equal(voteHere(life('GB', 1910).state).ok, false);
    assert.equal(voteHere(life('GB', 1930).state).ok, true);
    assert.equal(voteHere(life('CH', 1965).state).ok, false);
  },
  'one card on the Legal tab says it all'() {
    const { state } = life('IT', 1960);
    const rows = rightsSummary(state);
    assert.ok(rows.some((r) => r.label === 'Divorce' && /No divorce/.test(r.text)));
    state.prompts = [];
    assert.match(VIEWS.legal(state), /Your Rights in 1960/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
