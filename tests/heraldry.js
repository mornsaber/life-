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
import { armsOf, familyShield, blazonOf, bearsArms, applicationFor } from '../src/modules/world/Heraldry.js';
import { armsSvg } from '../src/ui/Arms.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (seed = 3, countryId = 'GB') => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId, lastName: 'Ashdown', gender: 'male' });
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
  'a commoner in Britain applies: only with standing, for a fee, and the grant comes a year later'() {
    const { engine, state } = life(4);
    state.finances.cash = 50000;
    assert.equal(bearsArms(state).yes, false);
    assert.match(VIEWS.honors(state, {}), /You don't bear arms/);
    assert.equal(applicationFor(state).ok, false, 'no standing yet');
    state.honors.push({ id: 'obe_mbe', name: 'Member of the Order of the British Empire (MBE)', order: 'Order of the British Empire', grade: 0, ribbon: [['#e0218a', 1]] });
    const app = applicationFor(state);
    assert.ok(app.ok && /honours/.test(app.reason) && app.how === 'grant');
    const cash = state.finances.cash;
    engine.dispatch('heraldry.apply');
    assert.ok(state.finances.cash < cash, 'fees paid');
    assert.ok(state.arms.pending && !bearsArms(state).yes, 'petition pending');
    state.prompts = [];
    engine.ageUp();
    assert.ok(bearsArms(state).yes, 'granted');
    assert.ok(state.log.at(-1).entries.some((e) => /Letters patent/.test(e.text)));
    assert.match(VIEWS.honors(state, {}), /You bear arms by arms granted by the College of Arms/);
  },
  'a commission qualifies an officer of any rank; decorations hang below whatever the rank'() {
    const { state } = life(5);
    state.military.history.push({ branch: 'army', track: 'officer', grade: 1 });
    assert.match(applicationFor(state).reason, /commission/);
    state.arms = { granted: { age: 30, authority: 'the College of Arms', how: 'grant' } };
    state.honors.push({ id: 'mc', name: 'Military Cross', source: 'military', ribbon: [['#fff', 1]] });
    state.honors.push({ id: 'campaign', name: 'Operational Service Medal', source: 'military' });
    const a = armsOf(state);
    assert.deepEqual(a.badges.map((b) => b.name), ['Military Cross']);
    assert.equal(a.behind, null, 'rank below flag rank is not shown');
  },
  'vice-regal office: supporters, and the governor-general\'s badge'() {
    const { state } = life(6, 'CA');
    state.arms = { granted: { age: 40, authority: 'the Canadian Heraldic Authority', how: 'grant' } };
    state.politics.history.push({ officeId: 'ca_lg' });
    let a = armsOf(state);
    assert.ok(a.supporters && !a.badges.some((b) => b.viceRegal), 'a lieutenant-governor: supporters');
    state.politics.history.push({ officeId: 'ca_gg' });
    a = armsOf(state);
    assert.ok(a.badges.some((b) => b.viceRegal), 'the governor-general: the badge');
    assert.ok(/vice-regal badge/.test(a.legend.join(' ')));
  },
  'each country has its own way: Canada, the US, Germany, Japan; nobles abroad wear their own coronets'() {
    const ca = life(7, 'CA').state;
    assert.match(applicationFor(ca).authority, /Canadian Heraldic Authority/);
    const us = life(8, 'US').state;
    us.character.age = 30;
    assert.equal(applicationFor(us).how, 'assume');
    assert.ok(applicationFor(us).ok, 'anyone may adopt arms in the US');
    const de = life(9, 'DE').state;
    assert.equal(applicationFor(de).how, 'roll');
    const jp = life(10, 'JP').state;
    assert.ok(bearsArms(jp).yes && armsOf(jp).mon, 'a Japanese family has its kamon');
    assert.match(VIEWS.honors(jp, {}), /kamon/);
    const fr = life(11, 'FR').state;
    fr.noble = { rank: 'earl', place: 'Valrose', heir: false };
    assert.ok(armsOf(fr).continental, 'a French count wears a continental coronet');
  },
  'granted arms pass to an heir who carries the name'() {
    const { engine, state } = life(12);
    state.arms = { granted: { age: 40, authority: 'the College of Arms', how: 'grant' } };
    state.character.age = 40;
    const kid = { id: 'kid1', firstName: 'Ann', lastName: state.character.lastName, relation: 'child', alive: true, relationship: 70, ageOffset: -30, gender: 'female' };
    state.people.list.push(kid);
    engine.context().die('Old age');
    const heir = engine.continueAsChild('kid1');
    assert.ok(heir, 'an heir');
    assert.ok(heir.arms?.granted?.inherited, 'arms inherited');
    assert.ok(bearsArms(heir).yes);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} heraldry test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} heraldry tests passed`);
