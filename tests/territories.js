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
console.log(`territories: ${n} passed`);
