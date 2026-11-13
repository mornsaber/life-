/**
 * The Move tab, one place at a time: compare one city with yours; pick one country and see a
 * trip, the routes to move there and retiring there, in one panel.
 *
 *   node tests/movepanel.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { IMMIGRATION } from '../src/modules/world/Immigration.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc = 'US', age = 30) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(1), modules: MODULES });
  const state = engine.newLife({ countryId: cc });
  state.character.age = age;
  return state;
};
const buttons = (h) => (h.match(/data-action=/g) ?? []).length;

const tests = {
  'no wall of buttons: under 40 until you pick a country'() {
    const h = VIEWS.move(life(), {});
    assert.ok(buttons(h) < 40, `${buttons(h)} buttons`);
    assert.match(h, /data-ui-set="place"/);
    assert.ok(!/migration\.emigrate/.test(h), 'no routes until a country is chosen');
  },
  'a chosen country: facts compared with home, a trip, the routes'() {
    const h = VIEWS.move(life(), { place: 'DE' });
    assert.match(h, /Cost of living[\s\S]*?vs home/);
    assert.match(h, /travel\.plan/);
    assert.match(h, /migration\.emigrate/);
    assert.ok(buttons(h) < 50);
  },
  'retiring there shows for the over-50s where there is a retiree visa'() {
    const cc = Object.keys(IMMIGRATION).find((c) => c !== 'US' && IMMIGRATION[c].visas.retiree);
    assert.match(VIEWS.move(life('US', 60), { place: cc }), /Retire there/);
    assert.ok(!/Retire there/.test(VIEWS.move(life('US', 30), { place: cc })));
  },
  'a city to compare with, beside yours'() {
    const state = life();
    const h = VIEWS.move(state, { moveRegion: 'sunbelt' });
    assert.match(h, /You live here/);
    assert.match(h, /region\.move/);
  },
  'abroad works too'() {
    const h = VIEWS.move(life('DE'), { place: 'FR' });
    assert.match(h, /Move within/);
    assert.match(h, /migration\.emigrate|Move home/);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 5).join('\n  ')}`); }
}
if (failed) process.exit(1);
