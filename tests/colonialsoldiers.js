/**
 * A colonial soldier's life (military/ColonialSoldiers.js).
 *
 *   node tests/colonialsoldiers.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { enlistmentEligibility, enlist } from '../src/modules/military/MilitaryEngine.js';
import { campaignsFor } from '../src/modules/military/Campaigns.js';
import { commissionBlock } from '../src/modules/military/ColonialSoldiers.js';
import { setEraState } from '../src/modules/world/Eras.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId, year, age = 20, seed = 1) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const s = engine.newLife({ countryId, startYear: year - age, gender: 'male', economy: 'historical' });
  s.world.seed = seed;
  for (let i = 0; i < age; i++) { s.prompts = []; s.stats.health = 90; engine.ageUp(); }
  const state = engine.state;
  Object.assign(state.stats, { fitness: 80, health: 90, smarts: 70 });
  state.prompts = [];
  setEraState(state);
  return { engine, state, ctx: engine.context() };
}

const tests = {
  'a colonial subject can\'t hold a commission until his day came'() {
    assert.match(commissionBlock(life('KE', 1925).state), /British officers/);
    assert.equal(enlistmentEligibility(life('KE', 1925).state, 'army', 'officer', 'active').ok, false);
    assert.equal(commissionBlock(life('IN', 1930).state), null, 'the King\'s commission open to Indians from 1918');
    assert.match(commissionBlock(life('CD', 1955).state), /European/);
  },
  'colonial units fight their own campaigns'() {
    const ww1 = { id: 'ww1' };
    assert.ok(campaignsFor(life('KE', 1916).state, { nation: 'KE', branch: 'army' }, ww1).some((c) => c.id === 'eastAfrica1'));
    assert.ok(campaignsFor(life('SN', 1917).state, { nation: 'SN', branch: 'army' }, ww1).some((c) => c.id === 'cheminDesDames'));
    assert.ok(campaignsFor(life('IN', 1916).state, { nation: 'IN', branch: 'army' }, ww1).some((c) => c.id === 'mesopotamia'));
    assert.ok(campaignsFor(life('NG', 1944).state, { nation: 'NG', branch: 'army' }, { id: 'ww2' }).some((c) => c.id === 'arakan'));
  },
  'in a world war the recruiters come to a colony'() {
    let seen = false;
    for (let seed = 1; seed < 12 && !seen; seed++) {
      const { engine, state } = life('SN', 1913, 16, seed);
      for (let y = 0; y < 8 && !seen; y++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); seen = state.prompts.some((p) => p.type === 'colonialSoldiers.recruit'); }
    }
    assert.ok(seen);
  },
  'Thiaroye, 1944, for a tirailleur home from the war'() {
    const { engine, state, ctx } = life('SN', 1943, 22);
    enlist(ctx, { branch: 'army', track: 'enlisted', component: 'active', specialty: 'infantry', conscript: true });
    state.prompts = [];
    assert.ok(state.military.service, 'enlisted');
    for (let y = 0; y < 2; y++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); if (state.prompts.some((p) => p.data?.id === 'thiaroye')) return; }
    assert.fail('no Thiaroye');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
