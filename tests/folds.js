/**
 * Lazy folds (ui/Components.js): on screen, a closed fold's body is left out until it's opened, so
 * the Move tab's 195 countries and the School catalogue cost nothing until you look inside.
 *
 *   node tests/folds.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { disclosure, card, setFolds } from '../src/ui/Components.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

const tests = {
  'a closed fold waits; an open one is built; tests and the server build everything'() {
    let built = 0;
    const body = () => { built++; return '<p>inside</p>'; };
    try {
      setFolds({});
      assert.doesNotMatch(disclosure('x', 'X', body), /inside/);
      assert.match(disclosure('x', 'X', body), /data-lazy/);
      assert.equal(built, 0, 'a closed fold never builds its body');
      assert.match(disclosure('x', 'X', body, { open: true }), /inside/);
      setFolds({ x: true });
      assert.match(disclosure('x', 'X', body), /inside/);
      setFolds({ 'card.shop': false });
      assert.doesNotMatch(card('Shop', '<p>wares</p>'), /wares/, 'a card you folded');
    } finally { setFolds(null); }
    assert.match(disclosure('x', 'X', body), /inside/);
    assert.match(card('Shop', '<p>wares</p>'), /wares/);
  },
  'the Move tab is small until you open a country'() {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(1), modules: MODULES });
    const state = engine.newLife({ countryId: 'US' });
    state.character.age = 30;
    try {
      setFolds({});
      const closed = VIEWS.move(state, {});
      setFolds({ 'abroad.group.Europe': true, 'abroad.FR': true });
      const open = VIEWS.move(state, {});
      assert.ok(closed.length < 60000, `${Math.round(closed.length / 1024)} KB folded`);
      assert.ok(open.length > closed.length);
      assert.match(open, /migration\.emigrate/);
    } finally { setFolds(null); }
    assert.ok(VIEWS.move(state, {}).length > 200000, 'without a screen, everything is there');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
