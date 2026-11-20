/**
 * History-following features: real sovereigns for lives outside the royal family, party vote
 * shares through history, no war announced that ended by your birth, today's death rates by
 * country, and local names for firms and business groups abroad.
 *
 *   node tests/historyfeatures.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { monarchName, crownOf } from '../src/modules/world/Crown.js';
import { allocateSeats } from '../src/modules/politics/PartySystem.js';
import { presentGap } from '../src/modules/world/HistoricalData.js';
import { rivalGroups } from '../src/modules/business/RivalGroups.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const born = (cc, y, seed = 4) => { const e = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES }); const s = e.newLife({ countryId: cc, startYear: y }); return { engine: e, state: s }; };
const age = (engine, state, n) => { for (let i = 0; i < n && state.character.alive; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); } };

const tests = {
  'the real sovereigns, and their successions'() {
    const { engine, state } = born('GB', 1830);
    age(engine, state, 9);
    assert.equal(monarchName(state, crownOf(state)), 'Queen Victoria');
    assert.ok(state.log.some((b) => b.entries.some((e) => /William IV died .* Queen Victoria accedes/.test(e.text))));
    const fr = born('FR', 1840);
    age(fr.engine, fr.state, 1);
    assert.match(monarchName(fr.state, 'FR'), /Louis-Philippe, King of the French/);
  },
  'elections follow the vote shares of their day'() {
    const seats = (y) => (born('DE', y), Object.fromEntries(allocateSeats({ level: 'federal', where: 'DE', seats: 400, labor: 180, kind: 'lower_DE', id: 'x' }, y).map((p) => [p.id, p.seats])));
    assert.ok(!(seats(1920).nsdap > 5), 'no Nazi landslide in 1920');
    assert.ok(seats(1932).nsdap > seats(1932).spd, 'the largest party in 1932');
  },
  'a war over by your birth year isn\'t announced'() {
    const { engine, state } = born('JP', 1945);
    age(engine, state, 2);
    assert.ok(!state.log.some((b) => b.entries.some((e) => /went to war: the Second World War/.test(e.text))));
  },
  'today\'s death rates by country'() {
    assert.ok(presentGap('NG') > 2, 'Nigeria');
    assert.ok(presentGap('JP') < 1, 'Japan');
  },
  'business groups abroad carry local names'() {
    const { state } = born('FR', 1980);
    assert.match(rivalGroups(state)[0].name, /^Groupe /);
    assert.equal(rivalGroups(born('US', 1980).state)[0].name, 'Summit Capital Partners');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack?.split('\n').slice(0, 3).join('\n  ')}`); }
}
if (failed) process.exit(1);
