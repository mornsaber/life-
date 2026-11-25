/**
 * The fame roadmap: fame of its day (media, reach), paths to fame (works, prizes, oratory),
 * using fame (persona, team, causes, foundation) and press law by country.
 *
 *   node tests/fameroadmap.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { sync } from '../src/modules/world/History.js';
import { mediaNow, reachOf, tierLine, brandsNow, scandalsNow, showOfTheDay } from '../src/modules/life/FameOfTheDay.js';
import { fameScore, fameSources } from '../src/modules/life/Fame.js';
import { WorksModule, kindsNow } from '../src/modules/life/Works.js';
import { scandalWeight, pressLawOdds } from '../src/modules/life/FameUse.js';
import { obituaryPlacement, copyrightUntil, familyNameFame, FameAfterModule } from '../src/modules/life/FameAfter.js';
import { buildHeirState } from '../src/modules/people/Legacy.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc, year, age = 40, seed = 6) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age, firstName: 'Ada', lastName: 'Penrose', gender: 'female' });
  state.character.age = age; state.prompts = []; sync(state); state.finances.cash = 5e7;
  return { engine, state };
};

const tests = {
  'media and reach of their day: no global fame in 1850, no TV in 1930'() {
    const { state } = life('GB', 1850);
    assert.ok(!mediaNow(state).some((m) => m.id === 'tv' || m.id === 'radio'));
    assert.notEqual(reachOf(state, 95), 'global');
    const s2 = life('US', 1995).state;
    assert.equal(reachOf(s2, 95), 'global');
    assert.ok(!mediaNow(life('US', 1930).state).some((m) => m.id === 'tv'));
    assert.doesNotMatch(tierLine(state, 3), /selfie|autograph/);
  },
  'brands, scandals and shows of their day'() {
    assert.ok(!brandsNow(1880).some((b) => /phone|crypto|sportswear|fast-food/.test(b)));
    assert.ok(!scandalsNow(1880).some(([h]) => /video|chat|tax/.test(h)));
    assert.equal(showOfTheDay(life('GB', 1880).state).title, 'A Lecture Tour');
    assert.equal(showOfTheDay(life('GB', 1935).state).title, 'On the Wireless');
  },
  'works: judged, practised, and counted as fame; no screenplays before 1915'() {
    const { engine, state } = life('FR', 1890, 28);
    assert.ok(!kindsNow(state).some((k) => k.id === 'screenplay'));
    state.stats.smarts = 95;
    for (let i = 0; i < 6; i += 1) { state.yearly = {}; engine.dispatch('works.create', 'painting'); }
    assert.equal(state.works.list.length, 6);
    assert.ok(state.works.practice.painting === 6);
    assert.ok(fameSources(state).some((s) => s.id === 'works'), 'works count as a fame source');
    assert.match(VIEWS.activities(state, {}), /Works &amp; Words|Works & Words/);
  },
  'oratory builds a following'() {
    const { engine, state } = life('US', 1880, 35);
    for (let i = 0; i < 5; i += 1) { state.yearly = {}; engine.dispatch('works.speak'); }
    assert.ok(state.works.oratory > 5);
    assert.ok(fameScore(state) > 0);
  },
  'persona and publicist soften what fits; break the image and it hurts more'() {
    const { engine, state } = life('GB', 1990);
    engine.dispatch('fameUse.persona', 'rebel');
    assert.ok(scandalWeight(state, 'photographs from a party you\'d rather forget') < 1);
    engine.dispatch('fameUse.persona', 'family');
    assert.ok(scandalWeight(state, 'an ex wrote a tell-all') > 1);
    const before = scandalWeight(state, 'x');
    engine.dispatch('fameUse.hire', 'publicist');
    assert.ok(scandalWeight(state, 'x') < before);
  },
  'press law by country and era'() {
    assert.ok(pressLawOdds(life('GB', 1990).state, 'libel') > pressLawOdds(life('US', 1990).state, 'libel'), 'British libel law favours the claimant');
    assert.ok(pressLawOdds(life('US', 1950).state, 'libel') > pressLawOdds(life('US', 1990).state, 'libel'), 'before and after Sullivan');
    assert.ok(pressLawOdds(life('FR', 1990).state, 'privacy') > pressLawOdds(life('US', 1990).state, 'privacy'));
  },
  'spending fame: a cause, a foundation'() {
    const { engine, state } = life('GB', 1990, 45);
    state.fame.buzz = 60; state.works = { list: [], practice: {}, prizes: [], oratory: 80 };
    state.civic ??= {}; state.civic.activism = { cause: 'environment', influence: 5 };
    engine.dispatch('fameUse.lend', 'cause');
    assert.ok(state.civic.activism.influence > 5);
    engine.dispatch('fameUse.foundation');
    assert.match(state.fame.foundation?.name ?? '', /Penrose Foundation/);
    assert.match(VIEWS.activities(state, {}), /Using Your Name/);
  },
  'years of fame run cleanly'() {
    const { engine, state } = life('US', 1960, 30, 3);
    state.fame.buzz = 60; state.works = { list: [], practice: {}, prizes: [], oratory: 90 };
    engine.dispatch('fameUse.hire', 'manager');
    for (let i = 0; i < 15 && state.character.alive; i += 1) { state.prompts = []; engine.ageUp(); }
    assert.ok(state.character.age > 30);
  },
  'after death: the obituary, the family name, royalties in copyright'() {
    const { engine, state } = life('GB', 1950, 60);
    state.fame.buzz = 60; state.fame.peak = 75;
    state.works = { list: [{ year: 1940, kind: 'novel', title: 'The Long Winter', verdict: 'a masterpiece', q: 92 }, { year: 1945, kind: 'novel', title: 'Iron and Salt', verdict: 'acclaimed', q: 75 }], practice: {}, prizes: ['nobelLit'], oratory: 0 };
    assert.match(obituaryPlacement(state), /front page/);
    assert.match(obituaryPlacement(life('GB', 1950, 60, 4).state), /local paper/);
    const kid = { id: 'kid1', firstName: 'Tom', lastName: 'Penrose', gender: 'male', relation: 'child', ageOffset: -30, alive: true, relationship: 70 };
    state.people.list.push(kid);
    state.character.alive = false;
    const heir = buildHeirState(new Random(2), state, kid.id);
    const rec = heir.lineage.ancestors.at(-1).fameAfter;
    assert.ok(rec && rec.acclaimed === 2 && rec.titles.includes('The Long Winter'));
    assert.ok(familyNameFame(heir) > 5, 'the family name carries');
    let earned = 0;
    const ctx = { state: heir, earn: (n) => { earned += n; }, log: () => {} };
    heir.character.alive = true; heir.character.age = 31; sync(heir);
    FameAfterModule.onAgeUp(ctx);
    assert.ok(earned > 0, 'royalties while in copyright');
    assert.equal(copyrightUntil(1850, 'GB', 1860), 1878);
    assert.equal(copyrightUntil(1950, 'FR', 2000), 2020);
    assert.equal(copyrightUntil(1950, 'US', 1990), 2000);
    assert.match(VIEWS.people(heir, {}) ?? '', /The Long Winter|Family Tree/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) process.exit(1);
