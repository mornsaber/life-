/**
 * Royal fixes: a daughter can't be the heir where only men inherit; Japan's is "the Imperial
 * House"; royal families stay fictional (no living royals' names); the diary isn't every year.
 *
 *   node tests/royalfixes.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { CROWNS } from '../src/modules/world/Crown.js';
import { houseTitle } from '../src/modules/world/Houses.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const royal = (cc, royalLevel, gender, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, royalLevel, gender });
  return { engine, state };
};

const tests = {
  'a daughter can\'t be the heir where only men inherit'() {
    for (const cc of ['SA', 'JP', 'TH']) {
      const { state } = royal(cc, 'heir', 'female');
      assert.equal(state.royal.level, 'child', cc);
      assert.equal(state.royal.line, null, cc);
    }
    const gb = royal('GB', 'heir', 'female').state;
    assert.equal(gb.royal.line, 1, 'equal primogeniture');
  },
  'Japan\'s is the Imperial House'() {
    assert.equal(houseTitle('the Imperial House'), 'the Imperial House');
    assert.equal(houseTitle('Windsor'), 'the House of Windsor');
  },
  'royal families are fictional: no living royals\' names'() {
    const living = ['Vajiralongkorn', 'Sirindhorn', 'Haakon', 'Sihamoni', 'Hassanal', 'Bajrakitiyabha', 'Leonor', 'Mako', 'Tamim', 'Tahnoun'];
    for (const [id, c] of Object.entries(CROWNS)) {
      const names = [...(c.names?.male ?? []), ...(c.names?.female ?? [])];
      for (const n of living) assert.ok(!names.includes(n), `${id} uses ${n}`);
    }
  },
  'no yearly diary prompt: the year is planned in the Royal Diary'() {
    const { engine, state } = royal('GB', 'child', 'male');
    for (let i = 0; i < 30 && state.character.alive; i++) {
      state.stats.health = 90;
      state.prompts = [];
      engine.ageUp();
      assert.ok(!state.prompts.some((p) => p.type === 'royalLife.diary'));
    }
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
