/**
 * The map can change: a nation can leave its state (Scotland), a province can join another
 * (Northern Ireland), a country can dissolve into another (Korea), a breakaway state can end
 * (Transnistria); by referendum, or after the present, on their own.
 *
 *   node tests/statechanges.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { regimeHere } from '../src/modules/world/Regimes.js';
import { periodFlag, periodCountryName } from '../src/modules/world/Eras.js';
import { sovereignIn } from '../src/modules/world/HistoricalData.js';
import { secedeProvince, mergeCountry, transferProvince, reintegrate, changeQuestions } from '../src/modules/world/StateChanges.js';
import { questionsHere } from '../src/modules/politics/Referendums.js';
import { COUNTRIES } from '../src/modules/world/Countries.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (countryId, regionId, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId, firstName: 'Ada', lastName: 'Vale', gender: 'female' });
  state.character.regionId = regionId; state.character.age = 30; state.prompts = [];
  return { engine, state, ctx: engine.context() };
};
const live = (engine, state, n) => { for (let i = 0; i < n; i++) { state.prompts = []; state.stats.health = 95; engine.ageUp(); } state.prompts = []; };
const said = (state, re) => (state.log ?? []).some((y) => (y.entries ?? []).some((e) => re.test(e.text)));
let n = 0;
const t = (name, fn) => { fn(); n += 1; console.log(`  ✔ ${name}`); };

t('Scotland leaves: two years on, Edinburgh is a new state with its own flag and rulers; London is not', () => {
  const { engine, state, ctx } = life('GB', 'edinburgh');
  secedeProvince(ctx, 'GB-SCT');
  assert.doesNotMatch(regimeHere(state).name ?? '', /Scotland/, 'not yet');
  live(engine, state, 2);
  assert.match(regimeHere(state).name, /Republic of Scotland/);
  assert.equal(periodFlag(state, 'GB').id, 'scotland');
  assert.match(periodCountryName(state, 'GB', COUNTRIES.GB.baseName), /Scotland/);
  assert.ok(said(state, /Independence Day/));
  state.character.regionId = 'london';
  assert.doesNotMatch(regimeHere(state).name ?? '', /Scotland/);
});
t('Korea reunified: the North is gone, its people citizens of the South', () => {
  const { engine, state, ctx } = life('KP', 'pyongyang');
  mergeCountry(ctx, 'KP');
  live(engine, state, 2);
  assert.match(regimeHere(state).name, /reunified/);
  assert.equal(periodFlag(state, 'KP').img, 'KR');
  assert.ok(state.character.citizenships.includes('KR'));
  assert.equal(sovereignIn('KP', 2200), false);
  assert.equal(sovereignIn('KP', 2000), true, 'history is untouched');
});
t('Northern Ireland joins Ireland; Transnistria comes back to Moldova', () => {
  const a = life('GB', 'belfast');
  transferProvince(a.ctx, 'GB-NIR');
  live(a.engine, a.state, 2);
  assert.equal(periodFlag(a.state, 'GB').img, 'IE');
  assert.ok(a.state.character.citizenships.includes('IE'));
  const b = life('MD', 'tiraspol');
  assert.match(regimeHere(b.state).name, /Transnistria/);
  reintegrate(b.ctx, 'transnistria');
  live(b.engine, b.state, 1);
  assert.doesNotMatch(regimeHere(b.state).name ?? '', /Transnistria/);
});
t('a head of government can put it to the people', () => {
  const { state } = life('ES', 'barcelona');
  assert.ok(changeQuestions(state).some((x) => x.q === 'secession:ES-CT'));
  assert.ok(questionsHere(state).some((x) => x.q === 'secession:ES-CT'));
  const kr = life('KR', 'seoul').state;
  assert.ok(questionsHere(kr).some((x) => x.q === 'union:KP'));
});
t('a new life starts from history\'s map again', () => {
  const { state } = life('GB', 'edinburgh');
  assert.doesNotMatch(regimeHere(state).name ?? '', /Republic of Scotland/);
});
console.log(`statechanges: ${n} passed`);
