/**
 * High society: who gets in, the calendar of the day, clubs, toys, giving, the gossip columns.
 *
 *   node tests/highsociety.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { HighSocietyModule, inSociety, eventsNow, clubsNow } from '../src/modules/life/HighSociety.js';
import { societyView } from '../src/ui/views/SocietyView.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc = 'GB', year = 1900, { cash = 1e9, gender = 'male', age = 40 } = {}) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(year), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age, gender });
  state.character.age = age;
  state.character.gender = gender;
  state.prompts = [];
  state.finances.cash = cash;
  return { engine, state, ctx: engine.context() };
};
const ids = (state) => eventsNow(state).map((e) => e.id);

const tests = {
  'a fortune or a title gets you in'() {
    assert.equal(inSociety(life('GB', 1900, { cash: 1000 }).state), false);
    assert.equal(inSociety(life('GB', 1900).state), true);
  },
  'the calendar of the day and the place'() {
    const ed = ids(life('GB', 1900).state);
    assert.ok(ed.includes('season') && ed.includes('ascot'));
    assert.ok(!ed.includes('glyndebourne') && !ed.includes('metGala') && !ed.includes('davos'));
    const debutante = ids(life('GB', 1900, { gender: 'female', age: 18 }).state);
    assert.ok(debutante.includes('presentation'));
    assert.ok(!ids(life('GB', 1970, { gender: 'female', age: 18 }).state).includes('presentation'), 'no presentations after 1958');
    const gilded = ids(life('US', 1890).state);
    assert.ok(gilded.includes('astorBall') && gilded.includes('newport') && !gilded.includes('metGala'));
    assert.ok(ids(life('US', 2000).state).includes('metGala'));
  },
  'attending raises standing; new money is sometimes snubbed'() {
    const m = life('GB', 1900);
    HighSocietyModule.actions.attend(m.ctx, 'ascot');
    assert.ok(m.state.society.standing > 30);
    const cash = m.state.finances.cash;
    HighSocietyModule.actions.attend(m.ctx, 'ascot');
    assert.equal(m.state.finances.cash, cash, 'once a year');
    assert.match(societyView(m.state), /Royal Ascot/);
  },
  'clubs: men only, women only, and a blackball'() {
    const woman = life('GB', 1950, { gender: 'female' }).state;
    const clubs = clubsNow(woman);
    assert.equal(clubs.find((c) => c.id === 'whites').closed, true);
    assert.equal(clubs.find((c) => c.id === 'reform').closed, true, 'women admitted only from 1981');
    assert.equal(clubs.find((c) => c.id === 'uwc').closed, false);
    assert.equal(clubsNow(life('GB', 1990, { gender: 'female' }).state).find((c) => c.id === 'reform').closed, false);
    let elected = false;
    for (let i = 0; i < 12 && !elected; i++) {
      const m = life('GB', 1950 + i);
      m.state.society = { standing: 90, oldMoney: true, attended: {}, clubs: [], yacht: 0, jet: 0, horses: 0, art: [], foundation: null, rival: null };
      HighSocietyModule.actions.joinClub(m.ctx, 'athenaeum');
      elected = m.state.society.clubs.includes('athenaeum');
    }
    assert.ok(elected);
  },
  'toys of their day, upkeep and the big race'() {
    const m = life('GB', 1950);
    HighSocietyModule.actions.buy(m.ctx, 'jet');
    assert.equal(m.state.society?.jet ?? 0, 0, 'no private jets before the 1960s');
    HighSocietyModule.actions.buy(m.ctx, 'yacht');
    HighSocietyModule.actions.buy(m.ctx, 'horse');
    HighSocietyModule.actions.buy(m.ctx, 'art');
    assert.equal(m.state.society.yacht, 1);
    const cash = m.state.finances.cash;
    for (let i = 0; i < 10; i++) { m.state.prompts = []; m.state.character.age += 1; HighSocietyModule.onAgeUp(m.ctx); }
    assert.ok(m.state.finances.cash !== cash);
    HighSocietyModule.actions.sellArt(m.ctx);
    assert.equal(m.state.society.art.length, 0);
  },
  'a big gift names a hospital wing'() {
    const m = life('US', 2000);
    HighSocietyModule.actions.foundation(m.ctx);
    assert.ok(m.state.society.foundation);
    assert.ok(m.state.honors.some((h) => /Wing/.test(h.name)));
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
