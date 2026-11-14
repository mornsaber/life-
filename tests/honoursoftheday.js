/**
 * Honours of their day: British honours by date, the dominions on the British list until their
 * own orders, colonies under their ruler's, and each country's orders from their founding.
 *
 *   node tests/honoursoftheday.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { honoursSystem, chivalryAt, ordersAt } from '../src/modules/world/HonoursOfTheDay.js';
import { honoursList, knighthoodsOn } from '../src/modules/world/Honours.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (year, cc, gender = 'male', ageNow = 50) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(year), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - ageNow, gender });
  state.character.age = ageNow;
  state.character.gender = gender;
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
};
const sys = (year, cc, gender) => honoursSystem(life(year, cc, gender).state).map((x) => `${x.via}:${x.ladder.tiers.map((t) => t.id).join(',')}`);

const tests = {
  'Britain: no Order of the British Empire before 1917, hereditary peers before 1958, baronets until 1964'() {
    assert.deepEqual(sys(1900, 'GB'), ['GB:knight,baronet,peerH']);
    assert.deepEqual(sys(1900, 'GB', 'female'), [], 'no Dames, no peeresses in their own right');
    assert.deepEqual(sys(1930, 'GB', 'female'), ['GB:mbe,obe,cbe,knight']);
    assert.deepEqual(sys(1960, 'GB'), ['GB:mbe,obe,cbe,knight,baronet,peer']);
    assert.deepEqual(sys(1990, 'GB', 'female'), ['GB:mbe,obe,cbe,knight,peer']);
  },
  'Canada: British honours, the Nickle Resolution, Bennett, the war, then the Order of Canada'() {
    assert.deepEqual(sys(1910, 'CA'), ['GB:knight,baronet,peerH']);
    assert.deepEqual(sys(1925, 'CA'), []);
    assert.deepEqual(sys(1934, 'CA'), ['GB:mbe,obe,cbe,knight,baronet,peerH']);
    assert.deepEqual(sys(1944, 'CA'), ['GB:mbe,obe,cbe']);
    assert.deepEqual(sys(1955, 'CA'), []);
    assert.deepEqual(sys(1969, 'CA'), ['CA:cc']);
    assert.deepEqual(sys(1980, 'CA'), ['CA:cm,oc,cc']);
  },
  'Australia and New Zealand on the British list until 1992 and 1996'() {
    assert.deepEqual(sys(1960, 'AU'), ['GB:mbe,obe,cbe,knight,baronet,peer']);
    const both = sys(1980, 'AU');
    assert.equal(both.length, 2);
    assert.match(both[0], /^AU:oam,am,ao,ac,ak$/);
    assert.match(both[1], /^GB:/);
    assert.deepEqual(sys(2000, 'AU').map((x) => x.split(':')[0]), ['AU']);
    assert.deepEqual(sys(1990, 'NZ').map((x) => x.split(':')[0]), ['GB']);
    assert.deepEqual(sys(2000, 'NZ').map((x) => x.split(':')[0]), ['NZ']);
  },
  'knighthoods in the Order of Australia only 1976–86, none in New Zealand 2000–09'() {
    assert.equal(knighthoodsOn(life(1980, 'AU').state, 'AU'), true);
    assert.equal(knighthoodsOn(life(1995, 'AU').state, 'AU'), false);
    assert.equal(knighthoodsOn(life(2005, 'NZ').state, 'NZ'), false);
    assert.equal(knighthoodsOn(life(2015, 'NZ').state, 'NZ'), true);
  },
  'South Africa, Ireland and India'() {
    assert.deepEqual(sys(1920, 'ZA').map((x) => x.split(':')[0]), ['GB']);
    assert.deepEqual(sys(1950, 'ZA'), []);
    assert.deepEqual(sys(1910, 'IE').map((x) => x.split(':')[0]), ['GB']);
    assert.deepEqual(sys(1950, 'IE'), []);
    assert.deepEqual(sys(1950, 'IN'), []);
    assert.match(sys(1960, 'IN')[0], /^IN:padmashri/);
    const raj = chivalryAt(life(1930, 'IN').state).map((o) => o.id);
    assert.ok(raj.includes('starOfIndia') && raj.includes('indianEmpire'), raj.join());
    assert.ok(!chivalryAt(life(1930, 'GB').state).some((o) => o.id === 'starOfIndia'));
  },
  'orders of chivalry from their founding'() {
    const at = (y) => chivalryAt(life(y, 'GB').state).map((o) => o.id);
    assert.ok(!at(1850).includes('rvo') && !at(1850).includes('om'));
    assert.ok(at(1910).includes('rvo') && at(1910).includes('om'));
    assert.equal(chivalryAt(life(1925, 'CA').state), null);
  },
  'other countries: orders from their founding'() {
    assert.equal(ordersAt('DE', 1900).ladder.order, 'Order of the Red Eagle');
    assert.equal(ordersAt('DE', 1930), null);
    assert.match(ordersAt('DE', 1960).ladder.tiers[1].name, /Bundesverdienstkreuz/);
    assert.match(ordersAt('IT', 1900).ladder.tiers[0].name, /Corona d'Italia/);
    assert.equal(ordersAt('IT', 1948), null);
    assert.equal(ordersAt('JP', 1870), null);
    assert.equal(ordersAt('US', 1950), null);
    assert.deepEqual(ordersAt('US', 1965).ladder.tiers.map((t) => t.id), ['freedom']);
    assert.deepEqual(ordersAt('FR', 1950).ladder.tiers.map((t) => t.id).includes('onm'), false);
  },
  'a Canadian magnate of 1910 is knighted from London'() {
    let got = null;
    for (let i = 0; i < 40 && !got; i++) {
      const { state, ctx } = life(1910, 'CA', 'male', 55);
      state.finances.cash = 2e9;
      state.honors.push({ id: 'x', source: 'civil', name: 'Fame', prestige: 400 });
      ctx.rng = new Random(i + 1);
      honoursList(ctx, { offer: false });
      got = state.honors.find((h) => h.source === 'order');
    }
    assert.ok(got, 'honoured');
    assert.equal(got.country, 'GB');
    assert.ok(!/Order of Canada/.test(got.name));
  },
  'an Edwardian peerage is hereditary'() {
    let peer = null;
    for (let i = 0; i < 60 && !peer; i++) {
      const { state, ctx } = life(1905, 'GB', 'male', 60);
      state.finances.cash = 5e9;
      state.honors.push({ id: 'x', source: 'civil', name: 'Fame', prestige: 600 });
      state.politics = { ...(state.politics ?? {}), history: [{ officeId: 'gb_pm' }] };
      state.honors.push({ id: 'order.GB.baronet', source: 'order', country: 'GB', tier: 'baronet', name: 'Baronet' });
      ctx.rng = new Random(i + 7);
      honoursList(ctx, { offer: false });
      peer = state.character.peerage;
    }
    assert.ok(peer, 'ennobled');
    assert.equal(peer.kind, 'hereditary');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
