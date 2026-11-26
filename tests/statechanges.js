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
import { periodFlag, periodCountryName, autonomyOf, yearNow } from '../src/modules/world/Eras.js';
import { sovereignIn } from '../src/modules/world/HistoricalData.js';
import { secedeProvince, mergeCountry, transferProvince, reintegrate, changeQuestions, recognise } from '../src/modules/world/StateChanges.js';
import { questionsHere } from '../src/modules/politics/Referendums.js';
import { causesNow } from '../src/modules/civic/Activism.js';
import { PLACE_EPISODES } from '../src/modules/world/PlaceEpisodes.js';
import { professionsFor } from '../src/modules/career/JobTrees.js';
import { COUNTRIES } from '../src/modules/world/Countries.js';
import { bornIn, settleIn } from '../src/modules/world/Habitation.js';
import { honoursSystem } from '../src/modules/world/HonoursOfTheDay.js';

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
  assert.equal(state.character.countryId, 'XS', 'a citizen of the new country, living in it');
  assert.equal(state.character.regionId, 'xs_edinburgh');
  assert.ok(state.character.citizenships.includes('XS') && state.character.citizenships.includes('GB'));
  assert.equal(periodFlag(state, 'XS').img, 'XS');
  assert.equal(COUNTRIES.XS.name, 'Scotland');
  assert.ok(said(state, /Independence Day/));
  assert.ok(bornIn('XS', 2100) && settleIn('XS', 2100), 'others can move there now');
  assert.ok(sovereignIn('XS', 2100), 'a sovereign state');
  assert.match(honoursSystem(state)[0].via, /GB|XS/);
  state.character.countryId = 'GB';
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
  assert.ok(!bornIn('XS', 2100) && !settleIn('XS', 2100), 'Scotland is not a state in this world');
  assert.doesNotMatch(regimeHere(state).name ?? '', /Republic of Scotland/);
});
t('a war\'s end can redraw the map', () => {
  const tw = life('TW', 'taipei');
  tw.ctx.emit('world:peace', { war: { id: 'taiwan' }, outcome: 'ended in defeat and lost territory' });
  assert.match(regimeHere(tw.state).name, /People's Republic/);
  assert.equal(periodFlag(tw.state, 'TW').img, 'CN');
  assert.equal(sovereignIn('TW', 2200), false);
  assert.ok(said(tw.state, /The war is lost/));
  const kr = life('KR', 'seoul');
  kr.ctx.emit('world:peace', { war: { id: 'koreanWar' }, outcome: 'ended in a clear victory' });
  assert.ok(kr.state.world.stateChanges.some((c) => c.id === 'union:KP'), 'victory reunifies Korea');
  const ph = life('PH', 'davao');
  ph.ctx.emit('world:peace', { war: { id: 'mindanao' }, outcome: 'ended in a deal that left armed groups in control of territory' });
  assert.match(regimeHere(ph.state).name, /rebel-held/);
  const gb = life('GB', 'london');
  gb.ctx.emit('world:peace', { war: { id: 'natoEast' }, outcome: 'ended in a clear victory' });
  assert.equal(gb.state.world.stateChanges.length, 0, 'a victory far away changes nothing');
});
t('the world can recognise a state: Somaliland, the Sahrawi Republic', () => {
  const so = life('SO', 'hargeisa');
  recognise(so.ctx, 'somaliland');
  live(so.engine, so.state, 1);
  assert.match(regimeHere(so.state).name, /recognised/);
  const eh = life('EH', 'eh_laayoune');
  recognise(eh.ctx, 'sahrawi');
  live(eh.engine, eh.state, 1);
  assert.match(regimeHere(eh.state).name, /Sahrawi/);
  assert.ok(sovereignIn('EH', 2200));
  const bh = life('BH', 'manama');
  assert.ok(questionsHere(bh.state).some((x) => x.q === 'union:BH'));
  assert.ok(questionsHere(life('PG', 'arawa').state).some((x) => x.q === 'secession:PG-NSB'));
});
t('a Puerto Rico Congress admits is a state, not a territory', () => {
  const pr = life('PR', null);
  (pr.state.world.statehood ??= {}).PR = yearNow(pr.state);
  const a = autonomyOf(pr.state, 'PR');
  assert.match(a.name, /State of Puerto Rico/);
  assert.ok(a.statehood);
});
t('you can lead a breakaway movement and force the question', () => {
  const { engine, state } = life('GB', 'edinburgh');
  assert.ok(causesNow(state, 2020).some(([id]) => id === 'independence'), 'the cause is open in Edinburgh');
  assert.ok(!causesNow(life('GB', 'london').state, 2020).some(([id]) => id === 'independence'), 'not in London');
  (state.civic ??= {}).activism = { cause: 'independence', influence: 60 };
  engine.dispatch('movements.found');
  const m = state.civic.movement;
  assert.equal(m.breakaway, 'secession:GB-SCT');
  assert.match(m.name, /Scotland Independence Movement/);
  m.strength = 90; m.members = 600000;
  let forced = false;
  for (let i = 0; i < 12 && !forced; i++) {
    state.prompts = []; state.stats.health = 95; engine.ageUp();
    for (const p of [...state.prompts]) {
      if (p.type === 'movements.breakaway') { engine.resolvePrompt(p.id, 'referendum'); forced = true; }
      else engine.resolvePrompt(p.id, p.options.find((o) => !o.disabled)?.id ?? p.options[0].id);
    }
    m.strength = Math.max(m.strength, 90);
  }
  assert.ok(forced, 'the moment came');
  assert.ok(said(state, /referendum you forced/));
});
t('moments and work that belong to one place', () => {
  const byId = Object.fromEntries(PLACE_EPISODES.map((e) => [e.id, e]));
  const at = (cc, region, year, age = 30) => ({ character: { countryId: cc, regionId: region, age }, era: { events: {} } });
  assert.ok(byId['nl.confederation'].when(at('CA', 'ca_stjohns'), 1948));
  assert.ok(!byId['nl.confederation'].when(at('CA', 'toronto'), 1948), 'not in Toronto');
  assert.ok(byId['hi.statehood'].when(at('US', 'honolulu'), 1959));
  assert.ok(byId['tx.revolution'].when(at('US', 'sanantonio'), 1836));
  assert.ok(byId['ti.uprising'].when(at('CN', 'lhasa'), 1959));
  assert.ok(byId['hy.polo'].when(at('IN', 'hyderabad'), 1948));
  assert.ok(byId['re.chik'].when(at('RE', 're_stdenis'), 2006));
  assert.ok(byId['gu.organic'].when(at('GU', 'gu_hagatna'), 1950));
  const jobs = (cc, region) => { const l = life(cc, region); return professionsFor(l.state).map((p) => p.id); };
  assert.ok(!jobs('CA', 'toronto').includes('hudsonsBay'), 'the fur trade posts were sold in 1987');
  assert.ok(jobs('US', 'honolulu').includes('hawaiiSugar') === false, 'the last mill closed in 2016');
  assert.ok(jobs('GB', 'london').includes('antarctic'));
  assert.ok(!jobs('IN', 'hyderabad').includes('nizamService'), 'gone with the Nizam');
  const then = (cc, region, birthYear) => {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(1), modules: MODULES });
    const state = engine.newLife({ countryId: cc, startYear: birthYear, gender: 'male' });
    state.character.regionId = region; state.character.age = 25;
    engine.hydrate(state);
    return professionsFor(state).map((p) => p.id);
  };
  assert.ok(then('CA', 'ca_stjohns', 1880).includes('hudsonsBay'));
  assert.ok(!then('GB', 'london', 1880).includes('hudsonsBay'));
  assert.ok(then('US', 'honolulu', 1900).includes('hawaiiSugar'));
  assert.ok(!then('US', 'nyc', 1900).includes('hawaiiSugar'));
  assert.ok(then('IN', 'hyderabad', 1900).includes('nizamService'));
  assert.ok(!then('IN', 'mumbai', 1900).includes('nizamService'));
  assert.ok(!then('IN', 'hyderabad', 1940).includes('antarctic'), 'India wintered from 1983');
});
console.log(`statechanges: ${n} passed`);
