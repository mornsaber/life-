/**
 * Country packs (world/packs/Sketch.js and sketches/): every UN member is playable, and each
 * sketched country holds together in every era — a flag, names, cities of its own, a government
 * (or foreign rule) in every year from 1800, its own life expectancy and wealth, and screens that
 * render.
 *
 *   node tests/countrypacks.js
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { COUNTRIES } from '../src/modules/world/Countries.js';
import { SKETCHES } from '../src/modules/world/packs/sketches/index.js';
import { PACKS } from '../src/modules/world/packs/index.js';
import { eraLayer, periodCountryName, rulerName, COLONIES } from '../src/modules/world/Eras.js';
import { demographyAt } from '../src/modules/world/HistoricalData.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const UN = 'AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CR CI HR CU CY CZ KP CD DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KW KG LA LV LB LS LR LY LI LT LU MG MW MY MV ML MT MH MR MU MX FM MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK NO OM PK PW PA PG PY PE PH PL PT QA KR MD RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA SS ES LK SD SR SE CH SY TJ TH TL TG TT TN TR TM TV UG UA AE GB TZ US UY UZ VU VE VN YE ZM ZW'.split(' ');
const ERAS = [1820, 1880, 1925, 1955, 1985, 2010, 2026];
const clean = (html, where) => { const m = String(html).match(/.{0,40}(undefined|NaN|\[object Object\]).{0,30}/); assert.ok(!m, `${where}: ${m?.[0]}`); };

const tests = {
  'every UN member state is playable'() {
    const missing = UN.filter((cc) => !COUNTRIES[cc]);
    assert.deepEqual(missing, []);
  },
  'each sketch is whole: flag, names, cities of its own, history'() {
    const cityOwner = {};
    for (const p of PACKS) for (const id of Object.keys(p.country.cities ?? {})) (cityOwner[id] ??= []).push(p.id);
    for (const p of SKETCHES) {
      const c = COUNTRIES[p.id];
      assert.ok(existsSync(new URL(`../icons/flags/${p.id.toLowerCase()}.svg`, import.meta.url)), `${p.id} flag`);
      for (const k of ['male', 'female', 'last']) assert.ok(c.names[k].length >= 8, `${p.id} ${k} names`);
      for (const id of Object.keys(c.cities)) assert.deepEqual(cityOwner[id], [p.id], `${p.id}: city id ${id} is shared`);
      assert.ok(c.currency.perUsd > 0, `${p.id} currency`);
      const d = p.history.demography;
      for (const k of ['life', 'gdp', 'pop']) assert.equal(d[k].length, 45, `${p.id} ${k}`);
      assert.ok(demographyAt(p.id, 1850).life < demographyAt(p.id, 2015).life, `${p.id} lives lengthen`);
      for (const [ruler] of p.history.ruled) assert.notEqual(rulerName(ruler), ruler, `${p.id}: ruler ${ruler} has a name`);
      const r = p.history.regimes ?? [];
      for (let i = 1; i < r.length; i++) assert.ok(r[i][0] > r[i - 1][0], `${p.id} regimes in order`);
    }
  },
  'a government (or foreign rule) in every era'() {
    for (const p of SKETCHES) {
      for (const year of ERAS.slice(0, -2)) {
        const engine = new Engine({ store: new Store(memory()), rng: new Random(2), modules: MODULES });
        const state = engine.newLife({ countryId: p.id, startYear: year });
        assert.ok(eraLayer(state)[p.id], `${p.id} ${year}: who governs?`);
        assert.ok(periodCountryName(state, p.id, COUNTRIES[p.id].name), `${p.id} ${year} name`);
      }
    }
  },
  'colonies are ruled until independence, and free after'() {
    const at = (cc, year) => { const e = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES }); return e.newLife({ countryId: cc, startYear: year }); };
    assert.equal(eraLayer(at('ZM', 1930)).ZM.colony, 'GB');
    assert.match(periodCountryName(at('ZM', 1930), 'ZM', 'Zambia'), /Northern Rhodesia/);
    assert.equal(eraLayer(at('ZM', 2000)).ZM?.colony, undefined, 'independent');
    assert.match(periodCountryName(at('KZ', 1960), 'KZ', 'Kazakhstan'), /Soviet/);
    assert.ok(COLONIES.BI.length === 2 && COLONIES.BI[1].ruler === 'BE');
  },
  'lives run and every screen renders, in every era'() {
    SKETCHES.forEach((p, i) => {
      const year = ERAS[i % ERAS.length];
      const engine = new Engine({ store: new Store(memory()), rng: new Random(i + 1), modules: MODULES });
      const state = engine.newLife({ countryId: p.id, startYear: year });
      for (let y = 0; y < 4 && state.character.alive; y++) {
        for (let g = 0; g < 20 && state.prompts.length; g++) engine.resolvePrompt(state.prompts[0].id, (state.prompts[0].options.find((o) => !o.disabled) ?? state.prompts[0].options[0]).id);
        engine.ageUp();
      }
      assert.equal(state.character.countryId, p.id);
      for (const [k, v] of Object.entries(VIEWS)) clean(v(state, {}), `${p.id} ${year} ${k}`);
    });
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
