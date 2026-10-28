/**
 * Nobility stays in its own country; titles from former ruling houses are granted, shown,
 * revoked and awarded.
 *
 *   node tests/dynastic.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { styledName } from '../src/modules/world/Honours.js';
import { peerChamber } from '../src/modules/politics/Legislature.js';
import { grantPeerage } from '../src/modules/world/Peerage.js';
import { dynasticTitles } from '../src/modules/world/DynasticTitles.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId, seed = 5, flags = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId, gender: 'male', ...flags });
  state.character.age = 40;
  state.prompts = [];
  state.finances.cash = 500000;
  return { engine, state, ctx: engine.context() };
}
const always = (engine, fn) => { const c = engine.rng.chance; engine.rng.chance = () => true; try { return fn(); } finally { engine.rng.chance = c; } };

const tests = {
  'a British peer who moves to Spain keeps a British title and no Spanish seat'() {
    const { state, ctx } = life('GB');
    grantPeerage(ctx, { rank: 'baron', place: 'Ashby', kind: 'life', seat: true });
    assert.equal(state.character.peerage.cc, 'GB');
    assert.equal(peerChamber(state), 'upper_GB');
    state.character.countryId = 'ES';
    assert.equal(peerChamber(state), null, 'no seat while abroad');
    state.character.countryId = 'GB';
    assert.equal(peerChamber(state), 'upper_GB');
  },
  'an Italian monarchist can be created a count by the House of Savoy, shown and revoked'() {
    const { engine, state } = life('IT', 7);
    engine.dispatch('dynastic.support');
    assert.equal(state.dynastic.favour.IT, 1);
    state.dynastic.favour.IT = 4;
    for (let y = 0; y < 25 && state.character.alive; y++) {
      state.stats.health = 95;
      engine.ageUp();
      const offer = state.prompts.find((p) => p.type === 'dynastic.offer');
      if (offer) engine.resolvePrompt(offer.id, 'accept');
      state.prompts = [];
      if (dynasticTitles(state).length) break;
    }
    const t = dynasticTitles(state)[0];
    assert.ok(t, 'a title');
    assert.match(styledName(state), /Barone|Conte/);
    assert.match(VIEWS.politics(state, {}), /Your titles/);
    engine.dispatch('dynastic.returnTitle', 'IT');
    assert.equal(dynasticTitles(state).length, 0);
  },
  'campaigning against the restoration costs you the house\'s title'() {
    const { engine, state, ctx } = life('IT', 9);
    state.dynastic = { favour: {}, titles: [{ cc: 'IT', house: 'Savoy', rank: 'count', place: 'Valdora', age: 30, revoked: false, returned: false }] };
    ctx.prompt({ type: 'houses.referendum', icon: '🗳️', title: 'x', text: 'x', options: [{ id: 'campaignNo', label: 'no' }], data: { cc: 'IT', kind: 'restore', called: false } });
    engine.resolvePrompt(state.prompts.at(-1).id, 'campaignNo');
    assert.equal(dynasticTitles(state).length, 0);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} dynastic test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} dynastic tests passed`);
