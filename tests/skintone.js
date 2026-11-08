/**
 * Skin tone on the people emoji: drawn from where you're born (or chosen), shared by blood
 * relatives, steady for everyone else, and applied only to emoji that take a tone.
 *
 *   node tests/skintone.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { toneFrom, toned, skinToneOf, personTone, TONES } from '../src/modules/people/SkinTone.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (opts = {}, seed = 3) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  return { engine, state: engine.newLife(opts) };
};
const mean = (cc) => { let s = 0; for (let i = 0; i < 400; i++) s += toneFrom(cc, `k${i}`); return s / 400; };

const tests = {
  'tones follow where people are from, and any tone can occur'() {
    assert.ok(mean('NG') > 4, `Nigeria ${mean('NG')}`);
    assert.ok(mean('NO') < 2, `Norway ${mean('NO')}`);
    assert.ok(mean('IN') > 3 && mean('IN') < 4, `India ${mean('IN')}`);
    assert.ok(mean('JP') < 2.2, `Japan ${mean('JP')}`);
    const us = new Set(Array.from({ length: 400 }, (_, i) => toneFrom('US', `u${i}`)));
    assert.equal(us.size, 5, 'every tone in the US');
    assert.equal(toneFrom('BR', 'same'), toneFrom('BR', 'same'), 'steady for the same person');
  },
  'a chosen tone is kept; family share it; the avatar and People tab show it'() {
    const { state } = life({ countryId: 'NO', skinTone: 5 });
    assert.equal(skinToneOf(state), 5);
    const mum = state.people.list.find((p) => p.relation === 'mother');
    assert.equal(personTone(state, mum), 5, 'your mother shares your tone');
    state.character.age = 30;
    assert.ok(VIEWS.people(state, {}).includes(TONES[5]), 'People tab faces are toned');
  },
  'tones go only on people emoji, after the first character of a sequence'() {
    assert.equal(toned('👩', 3), '👩🏽');
    assert.equal(toned('🧑‍⚕️', 2), '🧑🏼‍⚕️');
    assert.equal(toned('💑', 4), '💑', 'not on couples');
    assert.equal(toned('🕯️', 4), '🕯️');
    assert.equal(toned('👴🏻', 5), '👴🏿', 'replaces an existing tone');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} skin-tone test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} skin-tone tests passed`);
