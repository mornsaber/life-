/**
 * States that no longer exist, and some that exist only in fact: each city's state in its years,
 * offered on the start screen of its day, with its own flag, rulers and money; and today's
 * breakaway states in a modern life.
 *
 *   node tests/historicstates.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { regionStateAt } from '../src/modules/world/HistoricalData.js';
import { startCountries } from '../src/modules/world/StartCountries.js';
import { regimeHere } from '../src/modules/world/Regimes.js';
import { periodFlag } from '../src/modules/world/Eras.js';
import { REGIONS } from '../src/modules/life/Regions.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
let n = 0;
const t = (name, fn) => { fn(); n += 1; console.log(`  ✔ ${name}`); };

t('each state holds its city in its years, and not outside them', () => {
  for (const [city, y, re] of [['ca_stjohns', 1920, /Dominion of Newfoundland/], ['houston', 1840, /Republic of Texas/], ['honolulu', 1880, /Kingdom of Hawaii/], ['zanzibar', 1900, /Zanzibar/], ['enugu', 1968, /Biafra/],
    ['lhasa', 1930, /Tibet/], ['changchun', 1935, /Manchukuo/], ['hyderabad', 1930, /Hyderabad/], ['gangtok', 1960, /Sikkim/], ['okinawa', 1960, /United States administration/], ['turin', 1850, /Sardinia/],
    ['florence', 1850, /Tuscany/], ['hanover', 1850, /Hanover/], ['kiel', 1850, /Holstein/], ['heraklion', 1905, /Cretan State/], ['lubumbashi', 1961, /Katanga/], ['hargeisa', 2000, /Somaliland/],
    ['tiraspol', 2000, /Transnistria/], ['sukhumi', 2000, /Abkhazia/], ['kyrenia', 2000, /Northern Cyprus/], ['stepanakert', 2000, /Artsakh/], ['simferopol', 2020, /Crimea/]]) {
    assert.ok(REGIONS[city], `${city} is a city`);
    assert.match(regionStateAt(city, y)?.name ?? '', re, `${city} ${y}`);
  }
  assert.equal(regionStateAt('ca_stjohns', 1960), null, 'Newfoundland joined Canada in 1949');
  assert.equal(regionStateAt('houston', 1900), null, 'Texas joined the Union');
  assert.equal(regionStateAt('gangtok', 1980), null, 'Sikkim joined India in 1975');
  assert.equal(regionStateAt('stepanakert', 2024), null, 'Artsakh dissolved in 2023');
});
t('the start screen offers them in their years', () => {
  const names = (y) => startCountries(y).map((e) => e.name).join(' | ');
  for (const re of [/Texas|Hawaii/, /Sardinia/, /Hanover/, /Tuscany/]) assert.match(names(1840), re);
  assert.match(names(1925), /Dominion of Newfoundland/);
  assert.match(names(1940), /Manchukuo/);
  assert.match(names(1968), /Biafra/);
  assert.doesNotMatch(names(1968), /Manchukuo|Newfoundland/);
});
t('a modern life in a breakaway state lives under it, and flies its flag', () => {
  const e = new Engine({ store: new Store(memory()), rng: new Random(1), modules: MODULES });
  const s = e.newLife({ countryId: 'MD', firstName: 'Ion', lastName: 'Rusu', gender: 'male' });
  s.character.regionId = 'tiraspol';
  assert.match(regimeHere(s).name, /Transnistria/);
  assert.equal(periodFlag(s, 'MD').id, 'transnistria');
  s.character.regionId = 'chisinau';
  assert.doesNotMatch(regimeHere(s).name ?? '', /Transnistria/);
});
console.log(`historicstates: ${n} passed`);
