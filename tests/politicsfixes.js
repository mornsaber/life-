/**
 * Politics fixes: filing fees and deposits of their country and year, the Lord-Lieutenant as a
 * county honour (not a head of state), and US-only laws kept to the US.
 *
 *   node tests/politicsfixes.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { filingFor } from '../src/modules/politics/FilingFees.js';
import { OFFICES } from '../src/modules/politics/Offices.js';
import { lawHere } from '../src/modules/politics/Legislature.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc, year = null, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, ...(year ? { startYear: year - 50 } : {}) });
  state.character.age = 50;
  return { engine, state };
};

const tests = {
  'filing for President costs ballot-access fees, not millions'() {
    const { state } = life('US');
    const f = filingFor(state, 'president');
    assert.ok(f.fee > 0 && f.fee <= 50000, `${f.fee}`);
    assert.equal(filingFor(state, 'usRep').fee, 3125);
    assert.equal(filingFor(life('US', 1880).state, 'usRep').fee, 0, 'conventions nominated');
  },
  'a deposit for the Commons, returned with 5% of the vote'() {
    const { state } = life('GB');
    const f = filingFor(state, 'gb_mp');
    assert.equal(f.deposit, 650);
    assert.equal(f.refundAt, 0.05);
    assert.equal(filingFor(life('GB', 1960).state, 'gb_mp').refundAt, 0.125);
    assert.equal(filingFor(life('DE').state, 'de_mdb').deposit, 0, 'signatures, no deposit');
  },
  'the Lord-Lieutenant is a county honour, not a head of state'() {
    const ll = OFFICES.gb_lordLieutenant;
    assert.equal(ll.kind, 'lieutenancy');
    assert.ok(!ll.headOfState && !ll.ceremonial);
    assert.equal(OFFICES.ca_lg.headOfState, false);
    assert.equal(OFFICES.ca_lg.viceRegal, true);
    assert.equal(OFFICES.de_praesident.headOfState, true);
    const { engine, state } = life('GB');
    state.politics.office = { id: 'gb_lordLieutenant', approval: 60, terms: 1, termYearsLeft: 9, startAge: 49, salary: 0 };
    for (let i = 0; i < 4; i++) {
      state.prompts = [];
      engine.ageUp();
      assert.ok(!state.prompts.some((p) => p.type === 'executive.headDuty'), 'no hung parliaments or laws to sign');
    }
  },
  'American laws stay in America'() {
    assert.equal(lawHere('rightToWork', 'state', 'TX'), true);
    assert.equal(lawHere('rightToWork', 'federal', 'GB'), false);
    assert.equal(lawHere('privatePolicing', 'federal', 'FR'), false);
    assert.equal(lawHere('minWage', 'federal', 'GB'), true);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
