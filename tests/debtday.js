/**
 * Short of money as it was (life/DebtOfTheDay.js): the pawnshop, the moneylender, the tally man and
 * relief by country and era, and the words for collectors and doctor's bills.
 *
 *   node tests/debtday.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { waysOut, collectorsLine, medicalDebtWords } from '../src/modules/life/DebtOfTheDay.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const grown = (cc, year, age, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age, gender: 'male' });
  state.character.age = age;
  return { engine, state };
};
const ids = (cc, y) => waysOut(grown(cc, y, 30).state).map((o) => o.id);

const tests = {
  'the ways out by place and year'() {
    assert.deepEqual(ids('GB', 1900), ['pawn', 'lender', 'tally', 'relief', 'tighten']);
    assert.ok(!ids('GB', 1970).includes('tally') && !ids('GB', 1970).includes('relief'), 'no tally man or parish after the welfare state');
    assert.ok(ids('RU', 1960).includes('relief') && !ids('RU', 1960).includes('lender'), 'the mutual-aid fund, no moneylender');
    assert.ok(ids('IN', 1990).includes('lender'), 'the village moneylender');
    assert.match(waysOut(grown('FR', 1880, 30).state)[0].label, /Mont-de-Piété/);
    assert.match(waysOut(grown('JP', 1985, 30).state).find((o) => o.id === 'lender').label, /sarakin/);
  },
  'collectors and doctor\'s bills in their words'() {
    assert.match(collectorsLine(grown('GB', 1900, 30).state, 500, 'to moneylenders and shopkeepers'), /tick/);
    assert.match(collectorsLine(grown('US', 1990, 30).state, 500, 'on credit cards'), /keep calling/);
    assert.match(medicalDebtWords(grown('GB', 1920, 30).state).charity, /almoner/);
    assert.equal(medicalDebtWords(grown('US', 1990, 30).state).collections, null, 'today\'s American text');
  },
  'short of money: the prompt, then the moneylender comes back'() {
    let asked = 0, lent = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const { engine, state } = grown('GB', 1890, 30, seed);
      for (let i = 0; i < 4; i++) {
        state.prompts = [];
        state.finances.cash = -5000;
        engine.ageUp();
        const p = state.prompts.find((x) => x.type === 'debtDay.short');
        if (!p) continue;
        asked++;
        engine.resolvePrompt(p.id, 'lender');
        assert.ok(state.debtDay.lender?.owed > 0);
        lent++;
        break;
      }
      if (state.debtDay.lender) {
        const due = state.debtDay.lender.due;
        for (let i = 0; i < 3 && state.debtDay.lender; i++) { state.prompts = []; engine.ageUp(); }
        assert.ok(!state.debtDay.lender && state.character.age >= due, 'the loan came due');
      }
    }
    assert.ok(asked >= 3, `${asked}/6 asked`);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack?.split('\n').slice(0, 3).join('\n  ')}`); }
}
if (failed) process.exit(1);
