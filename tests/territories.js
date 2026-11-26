/**
 * Hong Kong and Macau: Qing county, Crown colony (occupied 1941–45), handed back on the treaty's
 * date as a Special Administrative Region with its own police, courts, money and honours, but no
 * army, diplomats or president.
 *
 *   node tests/territories.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { sync } from '../src/modules/world/History.js';
import { regimeHere, workBlock } from '../src/modules/world/Regimes.js';
import { colonyHere, autonomyHere, presidencyInEra, periodText } from '../src/modules/world/Eras.js';
import { honoursSystem } from '../src/modules/world/HonoursOfTheDay.js';
import { enlistmentEligibility } from '../src/modules/military/MilitaryEngine.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { COUNTRIES } from '../src/modules/world/Countries.js';
import { regionRegimeAt } from '../src/modules/world/Eras.js';
import { mandateKind } from '../src/modules/world/Mandates.js';
import { insigniaNation } from '../src/ui/Insignia.js';
import { existsSync } from 'node:fs';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(cc, y, lived = 20) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: y - 30, firstName: 'Ka', lastName: 'Chan', gender: 'male' });
  state.character.age = 30 - lived; state.prompts = []; sync(state);
  for (let i = 0; i < lived; i++) { state.prompts = []; state.stats.health = 95; engine.ageUp(); }
  state.prompts = [];
  return { state, ctx: engine.context() };
}
const entries = (s) => s.log.flatMap((l) => l.entries ?? []).map((e) => e.text ?? '');
let n = 0;
const t = (name, fn) => { fn(); n += 1; console.log(`  ✔ ${name}`); };

t('playable, with its own money', () => {
  assert.equal(COUNTRIES.HK.currency.code, 'HKD');
  assert.equal(COUNTRIES.MO.currency.code, 'MOP');
});
t('a Crown colony, with British honours, until 1997', () => {
  const { state } = life('HK', 1970);
  assert.match(colonyHere(state).name, /Crown Colony/);
  assert.equal(honoursSystem(state)[0]?.via, 'GB');
  assert.equal(presidencyInEra(state, 'HK'), false);
});
t('occupied by Japan, 1941–45: no Japanese honours', () => {
  const { state } = life('HK', 1943);
  assert.match(colonyHere(state).name, /Japanese-occupied/);
  assert.equal(honoursSystem(state).length, 0);
});
t('handed back on the treaty\'s date, not years either side', () => {
  const { state } = life('HK', 2000, 8);
  assert.equal(colonyHere(state), null);
  assert.ok(autonomyHere(state));
  const at = state.log.find((y) => (y.entries ?? []).some((e) => /The handover/.test(e.text ?? '')));
  assert.equal(at?.year, 1997);
  assert.match(regimeHere(state).name, /one country, two systems/);
});
t('after the handover: its own police and honours; no army, diplomats or president', () => {
  const { state, ctx } = life('HK', 2015);
  assert.equal(honoursSystem(state)[0]?.via, 'HK');
  assert.ok(honoursSystem(state)[0].ladder.tiers.some((x) => /Bauhinia/.test(x.name)));
  assert.match(enlistmentEligibility(state, 'army', 'enlisted', 'active').reason, /no armed forces/);
  assert.ok(workBlock(state, getProfession('foreignService')));
  assert.equal(presidencyInEra(state, 'HK'), false);
  assert.match(periodText(createEmployer(ctx.rng, state, getProfession('police'), state.character.regionId).name), /^Hong Kong Police Force/);
});
t('the Royal Hong Kong Police, 1969–97', () => {
  const { state, ctx } = life('HK', 1985);
  assert.match(periodText(createEmployer(ctx.rng, state, getProfession('police'), state.character.regionId).name), /^Royal Hong Kong Police Force/);
});
t('the National Security Law after 2020', () => {
  assert.match(regimeHere(life('HK', 2024).state).name, /National Security Law/);
});
t('Macau: Portuguese until 1999, then the Macao SAR', () => {
  assert.match(colonyHere(life('MO', 1990).state).name, /Portuguese Macau/);
  const { state } = life('MO', 2005);
  assert.equal(autonomyHere(state)?.of, 'CN');
  assert.ok(entries(state).some((x) => /Portuguese flag came down/.test(x)));
});
function hebrides(side) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES });
  const s = engine.newLife({ countryId: 'VU', startYear: 1930, firstName: 'Ka', lastName: 'Tari', gender: 'male' });
  for (let i = 0; i < 40 && s.character.alive; i++) {
    for (let k = 0; k < 10 && s.prompts.length; k++) { const q = s.prompts[0]; engine.resolvePrompt(q.id, q.type === 'condominium.school' ? side : q.options.at(-1).id); }
    s.stats.health = 95; engine.ageUp();
  }
  s.prompts = [];
  return s;
}
t('the New Hebrides: two rulers, and the side your school put you on', () => {
  for (const side of ['GB', 'FR']) {
    const s = hebrides(side);
    assert.equal(s.condominium.VU, side);
    assert.equal(colonyHere(s).ruler, side);
    assert.match(regimeHere(s).name, /London and Paris/);
    assert.equal(honoursSystem(s)[0]?.via, side);
  }
});
t('the Anglo-Egyptian Sudan: a condominium in name, British in practice', () => {
  const { state } = life('SD', 1930);
  assert.equal(colonyHere(state).ruler, 'GB');
  assert.match(regimeHere(state).name, /London and Cairo/);
});
t('treaty ports, leased territories and international cities', () => {
  assert.match(regionRegimeAt('shanghai', 1930).name, /International Settlement/);
  assert.match(regionRegimeAt('qingdao', 1905).name, /German leased territory/);
  assert.match(regionRegimeAt('weihai', 1920).name, /British leased territory/);
  assert.match(regionRegimeAt('dalian', 1930).name, /Kwantung/);
  assert.match(regionRegimeAt('zhanjiang', 1930).name, /French leased territory/);
  assert.match(regionRegimeAt('tangier', 1950).name, /International Zone/);
  assert.match(regionRegimeAt('klaipeda', 1921).name, /Memel Territory/);
  assert.match(regionRegimeAt('rijeka', 1922).name, /Free State of Fiume/);
  assert.equal(regionRegimeAt('shanghai', 1960), null);
});
t('self-governing territories: whose honours and forces', () => {
  const pr = life('PR', 1970).state;
  assert.ok(autonomyHere(pr)); assert.equal(honoursSystem(pr)[0]?.via, 'US');
  assert.equal(enlistmentEligibility(pr, 'army', 'enlisted', 'active').reason?.includes('no armed forces') ?? false, false);
  assert.match(colonyHere(life('PR', 1930).state).name, /Porto Rico/);
  const gl = life('GL', 1995).state;
  assert.deepEqual(honoursSystem(gl).map((x) => x.via), ['GL', 'DK']);
  for (const cc of ['GI', 'BM', 'KY', 'JE', 'GG', 'IM']) {
    const s = life(cc, 1990).state;
    assert.ok(autonomyHere(s), cc); assert.equal(honoursSystem(s)[0]?.via, 'GB', cc); assert.equal(presidencyInEra(s, cc), false, cc);
    assert.ok(workBlock(s, getProfession('foreignService')), cc);
  }
  assert.match(colonyHere(life('JE', 1942).state).name, /German-occupied Jersey/);
  assert.equal(honoursSystem(life('JE', 1942).state).length, 0);
  assert.match(colonyHere(life('GI', 1950).state).name, /Crown Colony of Gibraltar/);
  for (const cc of ['PR', 'GL', 'FO', 'GI', 'BM', 'KY', 'JE', 'GG', 'IM']) assert.ok(COUNTRIES[cc], cc);
});
t('zones: the Canal Zone, Trieste, the Saar, Åland', () => {
  assert.match(regionRegimeAt('balboa', 1950).name, /Canal Zone/);
  assert.match(regionRegimeAt('trieste', 1950).name, /Free Territory of Trieste/);
  assert.match(regionRegimeAt('saarbruecken', 1925).name, /League of Nations/);
  assert.match(regionRegimeAt('saarbruecken', 1950).name, /Saar Protectorate/);
  assert.match(regionRegimeAt('mariehamn', 1980).name, /Åland/);
});
t('mandates: answerable to Geneva, then to New York', () => {
  assert.equal(mandateKind(life('TZ', 1935).state), 'league');
  const tz = life('TZ', 1955).state;
  assert.equal(mandateKind(tz), 'trust');
  assert.match(colonyHere(tz).name, /trust territory/);
  assert.equal(mandateKind(life('NA', 1975).state), 'revoked');
  assert.equal(mandateKind(life('KE', 1950).state), null);
});
t('the rest of the world\'s territories: history, government, honours, flags and insignia', () => {
  const name = (s) => colonyHere(s)?.name ?? autonomyHere(s)?.name ?? regimeHere(s).name;
  assert.match(name(life('FK', 1982, 1).state), /Argentine-occupied|Crown Colony/);
  assert.match(name(life('FK', 2000).state), /self-governing British/);
  assert.match(name(life('GU', 1943).state), /Japanese-occupied Guam/);
  assert.match(name(life('MP', 1960).state), /Trust Territory of the Pacific/);
  assert.match(name(life('NC', 2000).state), /Matignon/);
  assert.match(name(life('MQ', 1970).state), /overseas department/);
  assert.match(name(life('CW', 1970).state), /Kingdom of the Netherlands/);
  assert.match(name(life('EH', 1990).state), /Moroccan administration/);
  assert.match(name(life('VI', 1900).state), /Danish West Indies/);
  for (const [cc, via] of [['AI', 'GB'], ['GU', 'US'], ['GP', 'FR'], ['AW', 'NL'], ['CK', 'NZ']]) {
    const s = life(cc, 2000).state;
    assert.ok(autonomyHere(s), cc);
    assert.equal(presidencyInEra(s, cc), false, cc);
    assert.ok(workBlock(s, getProfession('foreignService')), cc);
    if (via !== 'NZ') assert.equal(honoursSystem(s)[0]?.via, via, cc);
  }
  for (const [cc, pattern] of [['FK', 'GB'], ['GU', 'US'], ['NC', 'FR'], ['CW', 'NL'], ['GL', 'DK'], ['EH', 'MA']]) assert.equal(insigniaNation(cc), pattern, cc);
  assert.equal(insigniaNation('HK', { police: true }), 'GB');
  for (const cc of ['AI', 'VG', 'TC', 'MS', 'FK', 'SH', 'GU', 'VI', 'AS', 'MP', 'GF', 'GP', 'MQ', 'RE', 'YT', 'NC', 'PF', 'AW', 'CW', 'SX', 'CK', 'EH']) assert.ok(COUNTRIES[cc] && existsSync(`icons/flags/${cc.toLowerCase()}.svg`), cc);
});
console.log(`territories: ${n} passed`);
