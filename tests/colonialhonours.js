/**
 * Honours in colonies and after independence: the ruler's honours while a colony (no peerages for
 * colonial subjects), a realm's own list to the Crown until its own order, nothing in a new
 * republic until its first order, and real order names where packs had placeholders.
 *
 *   node tests/colonialhonours.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { sync } from '../src/modules/world/History.js';
import { ordersAt, honoursSystem, honoursNote } from '../src/modules/world/HonoursOfTheDay.js';
import { ORDERS, orderOf } from '../src/modules/world/Honours.js';

let pass = 0;
const t = (name, fn) => { fn(); pass += 1; console.log(`  ✔ ${name}`); };
const ids = (o) => o?.ladder.tiers.map((x) => x.id) ?? [];
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(cc, y, live = 0) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: y - 35, firstName: 'Ada', lastName: 'Okoth', gender: 'male' });
  state.character.age = 35 - live; state.prompts = []; sync(state);
  for (let i = 0; i < live; i++) { state.prompts = []; state.stats.health = 95; engine.ageUp(); }
  return state;
}

t('a realm: British list (knights, no peerages) until its own order', () => {
  const jm = ordersAt('JM', 1965);
  assert.equal(jm.via, 'GB');
  assert.ok(ids(jm).includes('knight') && !ids(jm).some((i) => /peer|baronet/.test(i)));
  assert.equal(ordersAt('JM', 1975).via, 'JM');
  assert.equal(ordersAt('NG', 1961).via, 'GB');
  assert.equal(ordersAt('NG', 1964).via, 'NG');
});
t('a republic gives nothing before its first order', () => {
  for (const [cc, y] of [['KE', 1965], ['LK', 1970], ['MT', 1980], ['CD', 1962], ['ZM', 1965], ['FJ', 1990]]) assert.equal(ordersAt(cc, y), null, `${cc} ${y}`);
  assert.equal(ordersAt('KE', 1966).via, 'KE');
  assert.equal(ordersAt('LK', 1986).via, 'LK');
});
t('real names in place of the placeholder order', () => {
  assert.equal(ORDERS.BB.order, 'Order of Barbados');
  assert.ok(ORDERS.TT.tiers.some((x) => /Trinity Cross/.test(x.name)));
  assert.ok(!Object.entries(ORDERS).filter(([cc]) => ['BB', 'TT', 'GY', 'MU', 'FJ', 'BZ', 'SL', 'ZM', 'CD', 'SR', 'NA'].includes(cc)).some(([, o]) => o.tiers.some((x) => /National Order of Merit/.test(typeof x.name === 'string' ? x.name : x.name.male))));
  // Trinidad: the Trinity Cross gave way to the Order of the Republic in 2008.
  assert.ok(ordersAt('TT', 1990).ladder.tiers.some((x) => x.name === 'Trinity Cross'));
  assert.ok(!ordersAt('TT', 2012).ladder.tiers.some((x) => x.name === 'Trinity Cross'));
  assert.ok(ordersAt('TT', 2012).ladder.tiers.some((x) => /Order of the Republic/.test(x.name)));
});
t('no "order of merit" stand-in: the order comes from the grade name', () => {
  assert.equal(orderOf('MW', { name: 'Order of the Lion (Member)' }, undefined, 'male'), 'Order of the Lion');
  assert.equal(orderOf('NG', { name: 'Member of the Order of the Niger (MON)' }, undefined, 'male'), 'Order of the Niger');
  assert.equal(orderOf('LK', { name: 'Vidya Jyothi' }, undefined, 'male'), null);
});
t('a colonial subject: the ruler\'s honours, never a peerage', () => {
  const s = life('KE', 1950);
  const sys = honoursSystem(s);
  assert.equal(sys[0]?.via, 'GB');
  assert.ok(!ids(sys[0]).some((i) => /peer/.test(i)));
});
t('lived through independence: Kenya, Jamaica, Ceylon', () => {
  assert.equal(honoursSystem(life('KE', 1965, 8)).length, 0);
  assert.match(honoursNote(life('KE', 1965, 8)), /1966/);
  assert.equal(honoursSystem(life('KE', 1980, 20))[0]?.via, 'KE');
  const jm = honoursSystem(life('JM', 1975, 20));
  assert.deepEqual(jm.map((x) => x.via), ['JM', 'GB']);
});
console.log(`colonial honours: ${pass} passed`);
