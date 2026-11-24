/**
 * Holding several titles at once: the highest style leads, the rest follow in the letters after the
 * name, address follows the title in use, and the coat of arms shows every title that carries arms.
 *
 *   node tests/titlestack.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { styledName, postNominals } from '../src/modules/world/Honours.js';
import { addressOf } from '../src/modules/world/Titles.js';
import { inheritTitles, knightStyle, outrankedBy } from '../src/modules/world/BoughtTitles.js';
import { armsOf, bearsArms } from '../src/modules/world/Heraldry.js';
import { armsSvg } from '../src/ui/Arms.js';
import { sync } from '../src/modules/world/History.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const grown = (gender = 'male', year = 1990, age = 55) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES });
  const state = engine.newLife({ countryId: 'GB', startYear: year - age, gender, firstName: 'Tom', lastName: 'Hale' });
  state.character.age = age; state.prompts = []; sync(state);
  return { engine, state };
};
const peer = (s) => { s.character.peerage = { cc: 'GB', rank: 'baron', place: null, kind: 'life', created: 50, number: 1 }; s.character.style = { prefix: 'Lord', peerage: 'Baron Hale' }; };
const general = (s) => s.military.history.push({ branch: 'army', track: 'officer', grade: 8, rankTitle: 'Lieutenant General', startAge: 22, endAge: 49, discharge: 'retired', rankCode: 'OF-8' });

const tests = {
  'a peer stays Lord, whatever else is conferred or inherited'() {
    const { state } = grown();
    peer(state);
    assert.equal(knightStyle(state, false), false, 'a knighthood does not replace Lord');
    assert.equal(state.character.style.prefix, 'Lord');
    // An heir who inherits a peerage and a baronetcy: the baronetcy must not turn Lord into Sir.
    const old = { character: { gender: 'male', baronetcy: { number: 2 } } };
    const heir = { character: { style: { prefix: 'Lord' }, peerage: { rank: 'baron' } } };
    inheritTitles(old, heir, { id: 'k' }, { id: 'k' }, [{ id: 'k' }], () => {});
    assert.equal(heir.character.style.prefix, 'Lord');
    assert.equal(heir.character.baronetcy.number, 3);
  },
  'a peer is addressed as Lord, and keeps a military rank in front'() {
    const { state } = grown();
    peer(state); general(state);
    state.character.baronetcy = { number: 3 };
    assert.equal(addressOf(state), 'Lord Hale');
    assert.match(styledName(state), /^Lieutenant General Lord Hale/);
    assert.match(postNominals(state), /^Bt/);
  },
  'a bought title in use is how you are addressed, unless a real one outranks it'() {
    const { state } = grown();
    state.boughtTitles = [{ id: 'p', kind: 'papal', place: null, paid: 1, value: 1, year: 1950, used: true }];
    assert.match(styledName(state), /^Count Tom Hale/);
    assert.equal(addressOf(state), 'Count Hale');
    state.character.style = { prefix: 'Sir' };
    assert.equal(outrankedBy(state), 'your knighthood');
    assert.match(styledName(state), /^Sir Tom Hale/);
  },
  'the arms show a baronetcy, a feudal barony and a papal countship'() {
    const { state } = grown();
    state.character.baronetcy = { number: 1 };
    state.character.style = { prefix: 'Sir' };
    state.boughtTitles = [{ id: 'f', kind: 'feudal', place: 'Kilbride', paid: 1, value: 1, year: 1990 }];
    assert.equal(bearsArms(state).why, 'your baronetcy');
    const a = armsOf(state);
    assert.ok(a.baronet && a.chapeau && a.helm === 'knight');
    assert.match(a.legend.join(' '), /red hand of Ulster/);
    assert.match(armsSvg(a), /✋/);
    const { state: count } = grown();
    count.boughtTitles = [{ id: 'p', kind: 'papal', paid: 1, value: 1, year: 1950 }];
    const b = armsOf(count);
    assert.equal(b.coronet, 'earl');
    assert.ok(b.continental, 'a papal count wears a continental coronet of nine pearls');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack?.split('\n').slice(0, 3).join('\n  ')}`); }
}
if (failed) process.exit(1);
