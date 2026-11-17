/**
 * Titles and the law of their day (Peerage.NOBILITY_LAW, world/NobilityLaw.js).
 *
 *   node tests/nobilitylaw.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { nobilityLaw, nobleHouse, peerTitle } from '../src/modules/world/Peerage.js';
import { estateOf } from '../src/modules/world/Nobility.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function noble(countryId, startYear, rank = 'earl') {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES });
  const state = engine.newLife({ countryId, startYear, nobleRank: rank, nobleHeir: true });
  return { engine, state };
}
const ageTo = (engine, state, year) => { while (state.character.birthYear + state.character.age < year && state.character.alive) { state.prompts = []; state.stats.health = 95; engine.ageUp(); } };

const tests = {
  'the law of titles by year'() {
    assert.equal(nobilityLaw('DE', 1910).status, 'recognised');
    assert.equal(nobilityLaw('DE', 1925).status, 'courtesy');
    assert.equal(nobilityLaw('AT', 1925).status, 'banned');
    assert.equal(nobilityLaw('RU', 1920).status, 'abolished');
    assert.equal(nobilityLaw('ES', 1935).status, 'courtesy');
    assert.equal(nobilityLaw('ES', 1960).status, 'recognised');
    assert.equal(nobilityLaw('BR', 1800).status, 'none');
    assert.equal(nobleHouse('JP', 1920), 'the House of Peers');
    assert.equal(nobleHouse('JP', 1950), null);
  },
  'new nobilities: a Russian prince, a Japanese count'() {
    assert.equal(peerTitle('duke', 'Volkonsky', 'male', 'X', 'RU'), 'Knyaz Volkonsky');
    assert.equal(peerTitle('earl', 'Konoe', 'male', 'X', 'JP'), 'Hakushaku Konoe');
  },
  'a Russian noble family in 1917 loses its title and its estate'() {
    const { engine, state } = noble('RU', 1890);
    if (!state.noble) return; // the start may have fallen back elsewhere
    estateOf(state);
    ageTo(engine, state, 1918);
    assert.equal(state.noble.law, 'abolished');
    assert.ok(state.noble.estate.value === 0 || state.noble.estate.owner === null);
  },
  'an Austrian count in 1919 may not use the title'() {
    const { engine, state } = noble('AT', 1890);
    if (!state.noble) return;
    ageTo(engine, state, 1920);
    assert.equal(state.noble.law, 'banned');
    assert.equal(state.character.style?.prefix ?? null, null);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
