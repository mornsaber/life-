/**
 * Every country the game mentions is playable: deployments, missions and wars
 * name real countries, and a posting moves you to one of its cities for its
 * duration. New countries start lives, have religions, monarchies and farms.
 *
 *   node tests/nations.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { COUNTRIES, FOREIGN_CITIES } from '../src/modules/world/Countries.js';
import { WORLD, placeCountry, postAbroad, endPosting, whereNow, postingLabel, countryIdOfName } from '../src/modules/world/Posting.js';
import { FORCES } from '../src/modules/world/NationalForces.js';
import { RELIGION_MIX } from '../src/modules/community/Religions.js';
import { MONARCHIES } from '../src/modules/politics/NationalOffices.js';
import { NATIONS } from '../src/modules/world/packs/nations/index.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (countryId, seed = 3) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  return { engine, state, ctx: engine.context() };
};

const tests = {
  'every country a posting can name is playable (territories count as their country)'() {
    for (const name of Object.keys(WORLD)) assert.ok(COUNTRIES[countryIdOfName(name)], `${name} is playable`);
    for (const [cc, f] of Object.entries(FORCES)) for (const list of Object.values(f.overseas ?? {})) for (const [where] of list) {
      if (/Ocean|Sea|Gulf|Pacific|Atlantic|Strait|Caribbean|Mediterranean|Arctic|Sahel|Indo-Pacific|Coast|aboard|Channel|Middle East|Antarctica/i.test(where)) continue;
      assert.ok(countryIdOfName(where) || placeCountry(where).countryId, `${cc} deploys to ${where}: a playable country`);
    }
  },
  'Peace Corps and UN postings name playable countries too'() {
    for (const name of ['Senegal', 'Peru', 'Malawi', 'Guatemala', 'Vanuatu', 'Costa Rica', 'Mozambique', 'Gambia', 'Guinea-Bissau', 'Côte d\'Ivoire', 'North Korea', 'New Caledonia', 'Curaçao']) assert.ok(COUNTRIES[countryIdOfName(name)], name);
  },
  'a deployment moves you to a city in that country, and back home after'() {
    const { state, ctx } = life('US');
    const p = postAbroad(ctx, { place: 'Camp Arifjan, Kuwait', years: 1 });
    assert.equal(p.countryId, 'KW');
    assert.equal(FOREIGN_CITIES[p.regionId]?.country, 'KW');
    assert.deepEqual(whereNow(state), { countryId: 'KW', regionId: p.regionId, posted: true });
    assert.match(postingLabel(p), /🇰🇼/);
    assert.equal(state.character.countryId ?? 'US', 'US', 'home stays home');
    endPosting(ctx);
    assert.equal(whereNow(state).countryId, 'US');
    const g = postAbroad(ctx, { place: 'Pituffik Space Base, Greenland' });
    assert.equal(g.countryId, 'DK');
    assert.equal(g.regionId, 'nuuk');
  },
  'new countries: lives start and run, with a religion mix and their own institutions'() {
    for (const n of NATIONS) {
      assert.ok(RELIGION_MIX[n.id], `${n.id} religion`);
      assert.ok(Object.keys(COUNTRIES[n.id].cities).length >= 2, `${n.id} cities`);
    }
    for (const cc of ['SA', 'UA', 'NO', 'SO', 'TW', 'AR']) {
      const { engine, state } = life(cc);
      for (let i = 0; i < 20 && state.character.alive; i++) { state.prompts = []; engine.ageUp(); }
      assert.equal(state.character.countryId, cc);
      assert.ok(VIEWS.career(state).length > 0);
    }
  },
  'kingdoms are monarchies; Norway is born-royal-free but has a crown on the books'() {
    for (const cc of ['SA', 'NO', 'DK', 'BE', 'TH', 'MY', 'JO', 'MA', 'BN', 'KH', 'BH', 'QA', 'KW', 'AE']) assert.ok(MONARCHIES.includes(cc), cc);
    assert.ok(!MONARCHIES.includes('UA'));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} nation test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} nation tests passed`);
