/**
 * Coats of arms: the family's shield, and how titles, orders, high command and the Church change
 * the achievement around it.
 *
 *   node tests/heraldry.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { armsOf, familyShield, blazonOf } from '../src/modules/world/Heraldry.js';
import { armsSvg } from '../src/ui/Arms.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (seed = 3) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'GB', lastName: 'Ashdown', gender: 'male' });
  state.character.age = 50;
  state.prompts = [];
  return { engine, state };
};
const wellFormed = (svg) => /^<svg class="arms-svg"/.test(svg) && svg.endsWith('</svg>') && !/undefined|NaN|null/.test(svg);

const tests = {
  'the shield is the family\'s, and its blazon reads properly'() {
    assert.deepEqual(familyShield('Ashdown'), familyShield('Ashdown'));
    const seen = new Set();
    for (const n of ['Smith', 'Patel', 'Okafor', 'García', 'Müller', 'Tanaka', 'Nguyen', 'Kowalski', 'Haddad', 'Silva', 'Ivanov', 'Kim']) {
      const s = familyShield(n);
      const b = blazonOf(s);
      seen.add(b);
      assert.match(b, /^[A-Z]/);
      assert.doesNotMatch(b, /\ba [aeiou]|between an? |undefined/, `${n}: ${b}`);
      assert.ok(wellFormed(armsSvg({ ...s, helm: 'esquire', badges: [] })), n);
    }
    assert.ok(seen.size >= 10, 'families differ');
  },
  'a commoner bears the family arms; a knight\'s helm opens'() {
    const { state } = life();
    const plain = armsOf(state);
    assert.equal(plain.helm, 'esquire');
    assert.ok(!plain.coronet && !plain.circlet && !plain.supporters);
    state.character.style = { ...(state.character.style ?? {}), prefix: 'Sir' };
    assert.equal(armsOf(state).helm, 'knight');
  },
  'a peerage brings a coronet and supporters; the Garter its circlet and motto; lesser orders hang below'() {
    const { state } = life();
    state.character.peerage = { rank: 'earl', place: 'Ashby', kind: 'hereditary' };
    let a = armsOf(state);
    assert.equal(a.coronet, 'earl');
    assert.equal(a.helm, 'peer');
    assert.ok(a.supporters);
    state.honors.push({ id: 'garter', name: 'Knight Companion of the Order of the Garter (KG)', order: 'Order of the Garter', prefix: { male: 'Sir' }, ribbon: [['#1f3f8f', 1]] });
    state.honors.push({ id: 'obe_cbe', name: 'Commander of the Order of the British Empire (CBE)', order: 'Order of the British Empire', grade: 2, ribbon: [['#e0218a', 1]] });
    a = armsOf(state);
    assert.equal(a.circlet.colour, '#1f3f8f');
    assert.match(a.circlet.motto, /HONI SOIT/);
    assert.equal(a.badges.length, 1);
    assert.ok(wellFormed(armsSvg(a)));
  },
  'high command, and the Church'() {
    const { state } = life();
    state.military.history.push({ branch: 'army', track: 'officer', grade: 7 });
    assert.equal(armsOf(state).behind, 'swords');
    state.military.history.push({ branch: 'navy', track: 'officer', grade: 8 });
    assert.equal(armsOf(state).behind, 'anchors');
    state.military.history.push({ branch: 'army', track: 'officer', grade: 9 });
    assert.equal(armsOf(state).behind, 'batons');
    state.community.orders = { tradition: 'catholic', grade: 'bishop' };
    assert.equal(armsOf(state).hat, 'bishop');
    state.holySee = { cardinal: { since: 60 }, pope: null };
    assert.equal(armsOf(state).hat, 'cardinal');
    state.holySee.pope = { name: 'Leo XV', since: 70 };
    const a = armsOf(state);
    assert.equal(a.hat, 'tiara');
    assert.ok(wellFormed(armsSvg(a)));
  },
  'the Honors tab shows the arms without changing anything'() {
    const { state } = life();
    state.character.peerage = { rank: 'baron', place: 'Ashby', kind: 'life' };
    const before = JSON.stringify(state);
    const html = VIEWS.honors(state, {});
    assert.equal(JSON.stringify(state), before);
    assert.match(html, /Coat of Arms/);
    assert.match(html, /arms-svg/);
    assert.match(html, /coronet of a Baron/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} heraldry test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} heraldry tests passed`);
