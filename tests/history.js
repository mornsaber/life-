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
    assert.ok(Object.keys(EVENTS).every((id) => state.era.events[id]), 'every event is in the past');
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
