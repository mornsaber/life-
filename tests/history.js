/**
 * Historical starts and loose history (world/Eras.js, world/History.js).
 *
 *   node tests/history.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { applicationEligibility } from '../src/modules/career/CareerEngine.js';
import { gigEligibility } from '../src/modules/career/GigWork.js';
import { regimeHere, regimeOf } from '../src/modules/world/Regimes.js';
import { yearNow, eraLayer, colonyHere, colonyStage, hasTech, PRESENT } from '../src/modules/world/Eras.js';
import { EVENTS, jimCrowHere, segregatedFrom } from '../src/modules/world/History.js';
import { universitiesIn } from '../src/modules/education/Universities.js';
import { crownOf } from '../src/modules/world/Crown.js';
import { automationRisk, longevityFactor, priceIndex, periodDollars } from '../src/modules/world/Eras.js';
import { professionsFor } from '../src/modules/career/JobTrees.js';
import { governsHere, reformsOpen } from '../src/modules/world/Reforms.js';
import { LEGISLATURES } from '../src/modules/politics/NationalOffices.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { routesTo } from '../src/modules/world/Migration.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { fitsEra } from '../src/modules/world/Eras.js';
import { eligible } from '../src/core/Pools.js';
import { LIFE_EVENTS } from '../src/modules/life/LifeEvents.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (opts, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ gender: 'male', ...opts });
  return { engine, state };
};
/** Age up `years`, answering every decision with its first non-dangerous option. */
function live(engine, state, years) {
  for (let y = 0; y < years && state.character.alive; y++) {
    for (let g = 0; g < 40 && state.prompts.length; g++) {
      const p = state.prompts[0];
      const o = p.options.filter((x) => !x.disabled);
      engine.resolvePrompt(p.id, (o.find((x) => x.tone !== 'danger') ?? o[0]).id);
    }
    engine.ageUp();
  }
}
const allText = (state) => state.log.flatMap((b) => b.entries.map((e) => e.text));

const tests = {
  'a life started today has all of history behind it and nothing changes'() {
    const { engine, state } = life({ countryId: 'RU' });
    assert.equal(state.character.birthYear, PRESENT);
    assert.ok(Object.keys(EVENTS).filter((id) => !EVENTS[id].future).every((id) => state.era.events[id]), 'every past event is behind it');
    assert.ok(Object.keys(EVENTS).filter((id) => EVENTS[id].future).every((id) => !state.era.events[id]), 'the future is ahead');
    assert.deepEqual(eraLayer(state), {});
    assert.doesNotMatch(regimeHere(state).name ?? '', /Soviet|Tsar/);
    state.character.age = 30;
    engine.hydrate(state);
    assert.ok(applicationEligibility(state, 'dataScience').reason !== "Doesn't exist yet (from about 2010)");
    assert.ok(hasTech(state, 'crypto'));
  },
  'a 1930 start: the past is seeded, the Depression still ahead'() {
    const { state } = life({ countryId: 'US', startYear: 1930 });
    assert.equal(yearNow(state), 1930);
    assert.ok(state.era.events.ww1?.ended, 'the Great War is over');
    assert.ok(state.era.events.fascismIT, 'Mussolini is in power');
    assert.equal(state.era.events.depression, undefined, 'the crash can still come');
    assert.equal(state.log[0].year, 1930);
  },
  'jobs open by year, some closed to women'() {
    const { engine, state } = life({ countryId: 'US', startYear: 1930, gender: 'female' });
    state.character.age = 22;
    engine.hydrate(state);
    assert.match(applicationEligibility(state, 'tech').reason, /Doesn't exist yet/);
    assert.match(applicationEligibility(state, 'ems').reason, /Doesn't exist yet/);
    assert.match(applicationEligibility(state, 'fire').reason, /Closed to women/);
    assert.equal(gigEligibility(state, 'rideshare').ok, false);
    assert.equal(hasTech(state, 'internet'), false);
    assert.ok(hasTech(state, 'radio'));
  },
  'Russia before and after the revolution; the Soviet layer over Ukraine'() {
    const { engine, state } = life({ countryId: 'RU', startYear: 1910 });
    assert.match(regimeHere(state).name, /Tsar/);
    live(engine, state, 30);
    assert.ok(state.era.events.russianRevolution, 'the revolution came');
    const y = state.era.events.russianRevolution.year;
    assert.ok(y >= EVENTS.russianRevolution.window[0] && y <= EVENTS.russianRevolution.window[1]);
    assert.match(regimeHere(state).name, /Soviet/);
    assert.equal(regimeHere(state).jobs, 'assigned');
    assert.match(regimeOf('UA').name, /Soviet republic/);
  },
  'a colony: foreign rule, then independence within its window'() {
    const { engine, state } = life({ countryId: 'KE', startYear: 1950 });
    assert.match(regimeHere(state).name, /Kenya Colony, ruled from London/);
    assert.equal(colonyHere(state).ruler, 'GB');
    live(engine, state, 17);
    assert.equal(colonyHere(state), null, 'independent by 1967');
    const since = state.era.colonies.KE.since;
    assert.ok(since >= 1959 && since <= 1966, `independence in ${since}`);
    assert.ok(allText(state).some((t) => /Independence!/.test(t)));
    assert.doesNotMatch(regimeHere(state).name ?? '', /Colony/);
  },
  'joining the movement earns the independence medal'() {
    const { engine, state } = life({ countryId: 'GH', startYear: 1930 }, 2);
    live(engine, state, 20);
    state.era.colonies.GH = { ...(state.era.colonies.GH ?? { done: [] }), joined: true, pressure: 4 };
    live(engine, state, 12);
    if (state.character.alive) assert.ok(state.honors.some((h) => h.id === 'independence.GH'), 'medal for the movement');
  },
  'every event fires inside its window, and a long life reads cleanly'() {
    for (const seed of [1, 2, 3]) {
      const { engine, state } = life({ countryId: 'GB', startYear: 1910 }, seed);
      live(engine, state, 75);
      for (const [id, e] of Object.entries(state.era.events)) {
        if (e.past) continue;
        const [a, b] = EVENTS[id].window;
        assert.ok(e.year >= a && e.year <= b, `${id} in ${e.year}`);
      }
      for (const t of allText(state)) assert.doesNotMatch(t, /undefined|NaN|\[object/, t);
      const html = VIEWS.life(state, {});
      if (yearNow(state) <= PRESENT) assert.match(html, /The World in/);
    }
  },
  'the world wars come with drafts, and end'() {
    const { engine, state } = life({ countryId: 'GB', startYear: 1930 }, 4);
    live(engine, state, 25);
    const w = state.era.events.ww2;
    if (w) {
      assert.ok(w.ended, 'the war ended');
      assert.ok(state.world.history.some((h) => /Second World War/.test(h.name)), 'Britain fought it');
      assert.equal(Object.values(state.world.wars).filter((x) => x.id === 'ww2').length, 0, 'every front closed');
    } else assert.ok(state.era.skipped.includes('ww2') || !state.era.events.fascismDE);
  },
  'a colonial subject may settle in Britain until 1962'() {
    const { engine, state } = life({ countryId: 'KE', startYear: 1930 });
    state.character.age = 25;
    engine.hydrate(state);
    assert.ok(routesTo(state, 'GB').some((r) => r.kind === 'freeMovement' && /British subject/.test(r.label)), 'British subject');
    assert.ok(!routesTo(state, 'FR').some((r) => r.kind === 'freeMovement'), 'not French');
    state.character.age = 40; // 1970
    assert.ok(!routesTo(state, 'GB').some((r) => r.kind === 'freeMovement'), 'the door closed in 1962');
  },
  'the colonial service: open in a colony, wound up at independence'() {
    const { engine, state } = life({ countryId: 'KE', startYear: 1930 }, 3);
    live(engine, state, 22);
    const ctx = engine.context();
    if (!colonyHere(state)) return; // independence came very early in this world
    assert.ok(applicationEligibility(state, 'colonialService').ok || /Needs/.test(applicationEligibility(state, 'colonialService').reason));
    const p = getProfession('colonialService');
    hire(ctx, { professionId: 'colonialService', levelId: 'clerk', employer: createEmployer(ctx.rng, state, p, state.character.regionId) });
    assert.equal(state.career.job?.professionId, 'colonialService');
    live(engine, state, 40);
    if (!state.character.alive) return;
    assert.notEqual(state.career.job?.professionId, 'colonialService', 'no colonial service after independence');
    assert.ok(allText(state).some((t) => /loss of career/.test(t)) || state.career.history.some((h) => h.professionId === 'colonialService'));
    const today = life({ countryId: 'KE' });
    today.state.character.age = 30;
    assert.equal(applicationEligibility(today.state, 'colonialService').ok, false);
  },
  'modern content waits for its technology'() {
    const { state } = life({ countryId: 'US', startYear: 1950 });
    state.character.age = 30;
    assert.equal(fitsEra(state, { text: 'A match on a dating app wants to meet.' }), false);
    assert.equal(fitsEra(state, { text: 'Your neighbour asks you to water the plants.' }), true);
    assert.equal(fitsEra(state, { text: 'You watched the game on TV.' }), true, 'TV by 1980');
    const pool = eligible(LIFE_EVENTS, state).map((e) => e.id);
    assert.ok(!pool.includes('datingApp') && !pool.includes('cryptoTip'));
    const now = life({ countryId: 'US' });
    now.state.character.age = 30;
    assert.equal(fitsEra(now.state, { text: 'A match on a dating app wants to meet.' }), true);
  },
  'Jim Crow: segregation in the South until the Civil Rights Act'() {
    const { engine, state } = life({ countryId: 'US', startYear: 1950, skinTone: 5 });
    state.character.regionId = 'atlanta';
    state.character.age = 10; // 1960
    engine.hydrate(state);
    assert.ok(jimCrowHere(state));
    state.character.age = 21;
    if (!state.era.events.civilRights) {
      assert.match(applicationEligibility(state, 'police').reason, /Jim Crow/);
      const ga = universitiesIn('US').find((u) => u.region === 'atlanta' && u.type !== 'online' && u.type !== 'community');
      if (ga) assert.ok(segregatedFrom(state, ga));
    }
    const white = life({ countryId: 'US', startYear: 1950, skinTone: 1 });
    white.state.character.regionId = 'atlanta';
    white.state.character.age = 21;
    assert.equal(jimCrowHere(white.state), false);
    live(engine, state, 25); // into the 1980s
    assert.ok(state.era.events.civilRights, 'the Civil Rights Act came');
    assert.equal(jimCrowHere(state), false);
  },
  'the old thrones stand in 1910 and fall with history'() {
    const { engine, state } = life({ countryId: 'RU', startYear: 1910, housePlace: 'heir' }, 4);
    assert.equal(state.royal?.crownId, 'RU', 'born a Romanov heir under a reigning Tsar');
    assert.equal(crownOf(state, 'RU'), 'RU');
    live(engine, state, 15);
    assert.equal(crownOf(state, 'RU'), null, 'the revolution ended the monarchy');
    assert.equal(state.royal, null);
    assert.equal(state.house?.cc, 'RU', 'a former ruling house now');
    const today = life({ countryId: 'DE' });
    assert.equal(crownOf(today.state, 'DE'), null, 'no Kaiser today');
  },
  'loose futures: after today, the future comes in its windows, and some never does'() {
    const seen = new Set();
    const skipped = new Set();
    for (const seed of [1, 2, 3, 4]) {
      const { engine, state } = life({ countryId: 'US' }, seed);
      assert.match(applicationEligibility(state, 'aiOps').reason ?? '', /Doesn't exist yet|Must be/);
      live(engine, state, 60);
      for (const [id, e] of Object.entries(state.era.events)) {
        if (!EVENTS[id].future) continue;
        seen.add(id);
        if (!e.quiet) assert.ok(e.year >= EVENTS[id].window[0] && e.year <= EVENTS[id].window[1], `${id} in ${e.year}`);
      }
      for (const id of state.era.skipped ?? []) skipped.add(id);
      for (const t of allText(state)) assert.doesNotMatch(t, /undefined|NaN|\[object/, t);
    }
    assert.ok(seen.has('aiWave'), 'the AI wave always comes');
    assert.ok(seen.size >= 6, `${seen.size} futures`);
    assert.ok(skipped.size >= 1, 'some futures never come');
  },
  'the future changes jobs, money and lifespans'() {
    const { state } = life({ countryId: 'FI' });
    state.character.age = 30;
    assert.equal(automationRisk(state, 'trucking'), 0);
    state.era.events.aiWave = { year: 2030 };
    state.era.events.selfDriving = { year: 2034 };
    assert.ok(automationRisk(state, 'trucking') > 0.05, 'robotaxis');
    assert.ok(automationRisk(state, 'legalSupport') > 0, 'AI');
    assert.equal(automationRisk(state, 'nursing'), 0);
    assert.equal(gigEligibility(state, 'rideshare').ok, false);
    assert.equal(applicationEligibility(state, 'aiOps').reason !== "Doesn't exist yet", true);
    assert.equal(longevityFactor(state, 70), 1);
    state.era.events.longevity = { year: 2040 };
    assert.ok(longevityFactor(state, 70) < 1);
  },
  'early eras have their own work, their own decade and their own money'() {
    const { engine, state } = life({ countryId: 'GB', startYear: 1910 });
    state.character.age = 18; // 1928
    engine.hydrate(state);
    const board = professionsFor(state).map((p) => p.id);
    assert.ok(board.includes('coalMining') && board.includes('domesticService'), 'period jobs on the board');
    assert.ok(!board.includes('dataScience') && !board.includes('aiOps'), 'no future jobs');
    assert.ok(['millWork', 'coalMining', 'domesticService', 'docks', 'milkRound', 'steamRailway'].some((id) => applicationEligibility(state, id).ok), 'a period job is hiring');
    const today = life({ countryId: 'GB' });
    today.state.character.age = 18;
    assert.ok(!professionsFor(today.state).some((p) => ['coalMining', 'lamplighter', 'colonialService'].includes(p.id)), 'none of it today');
    const ids = eligible(LIFE_EVENTS, state).map((e) => e.id);
    assert.ok(ids.some((id) => id.startsWith('dec.')), 'a decade event can happen in 1928');
    assert.ok(!eligible(LIFE_EVENTS, today.state).some((e) => e.id.startsWith('dec.')), 'not today');
    assert.ok(priceIndex(1930) > 0.03 && priceIndex(1930) < 0.07);
    assert.equal(periodDollars(today.state, 1000), null);
    assert.ok(periodDollars(state, 50000) < 5000);
  },
  'a dying trade lays you off'() {
    const { engine, state } = life({ countryId: 'GB', startYear: 1910 }, 2);
    state.character.age = 20;
    engine.hydrate(state);
    const ctx = engine.context();
    const p = getProfession('lamplighter');
    hire(ctx, { professionId: 'lamplighter', levelId: 'lamplighter', employer: createEmployer(ctx.rng, state, p, state.character.regionId) });
    live(engine, state, 15); // to 1945
    if (state.character.alive) assert.notEqual(state.career.job?.professionId, 'lamplighter');
  },
  'lead the movement, and lead the country when it wins'() {
    const { engine, state } = life({ countryId: 'KE', startYear: 1930 }, 5);
    live(engine, state, 26); // 1956
    if (!colonyHere(state)) return;
    state.era.colonies.KE = { ...(state.era.colonies.KE ?? { done: [] }), joined: true, leader: true, pressure: 8 };
    state.legal.incarceration = null;
    for (let i = 0; i < 12 && colonyHere(state) && state.character.alive; i++) { live(engine, state, 1); state.legal.incarceration = null; }
    if (!state.character.alive) return;
    assert.equal(colonyHere(state), null);
    assert.equal(state.politics.office?.id, 'ke_president', 'the first President of independent Kenya');
    assert.ok(state.honors.some((h) => h.id === 'founder.KE'));
  },
  'a head of government rewrites the rules'() {
    const { engine, state } = life({ countryId: 'RU', startYear: 1950 }, 6);
    state.character.age = 50;
    engine.hydrate(state);
    assert.equal(regimeHere(state).business, 'state');
    engine.context().emit('politics:take', { officeId: LEGISLATURES.RU.execOffice, appointed: true });
    assert.ok(governsHere(state), 'in charge');
    assert.ok(reformsOpen(state).some((r) => r.id === 'freeElections'));
    state.prompts = [];
    engine.dispatch('reforms.enact', 'marketReform');
    assert.equal(regimeHere(state).business, 'free', 'private enterprise is legal');
    engine.dispatch('reforms.enact', 'freeElections');
    assert.notEqual(regimeHere(state).elections, 'free', 'one reform a year');
    state.yearly = {};
    engine.dispatch('reforms.enact', 'freeElections');
    state.yearly = {};
    engine.dispatch('reforms.enact', 'freePress');
    assert.equal(regimeHere(state).kind, 'democracy', 'free elections and a free press: a democracy');
    assert.match(VIEWS.politics(state, {}), /Change the rules/);
  },
  'loose history is still deterministic for a seed'() {
    const a = life({ countryId: 'FR', startYear: 1910 }, 7);
    const b = life({ countryId: 'FR', startYear: 1910 }, 7);
    live(a.engine, a.state, 50);
    live(b.engine, b.state, 50);
    assert.deepEqual(a.state.era.events, b.state.era.events);
    assert.deepEqual(colonyStage(a.state, 'DZ'), colonyStage(b.state, 'DZ'));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} history test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} history tests passed`);
