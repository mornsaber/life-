/**
 * Leaving school early: bound apprentice to a master and out of your time as a journeyman; night
 * school for a school certificate; and work that needs reading closed to those who can't.
 *
 *   node tests/earlyleavers.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { eraWorkBlock } from '../src/modules/world/Eras.js';
import { nightSchoolOpen, nightSchoolName } from '../src/modules/education/SchoolingOfTheDay.js';
import { schoolingCard } from '../src/ui/views/SchoolingCard.js';
import { childWorkAge } from '../src/modules/world/ChildLabour.js';
import { minimumAge } from '../src/modules/career/CareerEngine.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc = 'GB', year = 1880, gender = 'male') => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year, gender });
  return { engine, state };
};
const grow = (engine, age) => { const s = engine.state; while (s.character.age < age && s.character.alive !== false) { s.prompts = []; s.stats.health = 90; engine.ageUp(); } s.prompts = []; };
const said = (s) => (s.log ?? []).flatMap((b) => (b.entries ?? []).map((e) => e.text)).join('\n');

const tests = {
  'an apprentice is bound for seven years and comes out a journeyman'() {
    const { engine, state } = life();
    grow(engine, 12);
    (state.k12 ??= {}).leftEarly = true;
    state.career.job = null;
    const ctx = engine.context();
    MODULES.find((m) => m.id === 'history').resolvers.firstWork(ctx, {}, 'blacksmith');
    assert.equal(state.career.job?.levelId, 'apprentice', 'starts as an apprentice');
    assert.equal(state.schooling.indenture?.until, 19);
    for (let i = 0; i < 8 && state.schooling.indenture; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
    assert.equal(state.schooling.indenture, null, 'indenture over');
    if (state.career.job?.professionId === 'blacksmith') {
      const p = getProfession('blacksmith');
      assert.ok(p.levels.findIndex((l) => l.id === state.career.job.levelId) >= p.levels.findIndex((l) => l.id === 'journeyman'), 'journeyman');
      assert.ok(state.education.degrees.some((d) => d.apprenticeship), 'a trade on record');
    } else assert.match(said(state), /broke your indenture|journeyman/);
  },
  'night school gives an early leaver a school certificate'() {
    const { engine, state } = life('GB', 1930);
    grow(engine, 20);
    state.education.degrees = state.education.degrees.filter((d) => d.type !== 'highschool');
    Object.assign((state.k12 ??= {}), { leftEarly: true, dropout: true });
    state.schooling.literate = true;
    state.stats.smarts = 80;
    state.finances.cash = 5000;
    assert.ok(nightSchoolOpen(state));
    assert.equal(nightSchoolName(state), 'evening-class certificates');
    assert.match(schoolingCard(state), /schooling\.nightSchool/);
    engine.dispatch('schooling.nightSchool');
    assert.ok(state.schooling.nightSchool, 'enrolled');
    for (let i = 0; i < 3; i++) { state.prompts = []; state.stats.health = 90; state.stats.smarts = 80; engine.ageUp(); }
    assert.ok(state.education.degrees.some((d) => d.nightSchool), 'certificate earned');
    assert.ok(!nightSchoolOpen(state));
  },
  'America has the GED instead from 1942'() {
    const { engine, state } = life('US', 1950);
    grow(engine, 20);
    state.education.degrees = state.education.degrees.filter((d) => d.type !== 'highschool');
    Object.assign((state.k12 ??= {}), { dropout: true });
    assert.ok(!nightSchoolOpen(state));
  },
  'child labour laws: the Factory Acts and the Mines Act by year'() {
    const { engine, state } = life('GB', 1830);
    grow(engine, 12);
    // 1842: the Mines Act; 1844 is the year now.
    assert.equal(childWorkAge(state, 'coalMining'), 10);
    assert.equal(childWorkAge(state, 'agriculture'), 10, 'the land had no law, but nobody works before ten');
    (state.k12 ??= {}).leftEarly = true;
    assert.ok(minimumAge(state, getProfession('millWork')) <= 12);
    const later = life('GB', 1895);
    grow(later.engine, 12);
    (later.state.k12 ??= {}).leftEarly = true;
    assert.equal(childWorkAge(later.state, 'millWork'), 12, 'twelve from 1901');
    assert.equal(childWorkAge(later.state, 'coalMining'), 13);
  },
  'a child who leaves school before ten helps at home until ten'() {
    const { engine, state } = life('ES', 1862);
    grow(engine, 9);
    const ctx = engine.context();
    (state.k12 ??= {}).leftEarly = true;
    state.prompts = [];
    state.k12.done = false; state.k12.leftEarly = false;
    MODULES.find((m) => m.id === 'history').resolvers.leaveSchool(ctx, {}, 'leave');
    assert.equal(state.k12.workAt, 10);
    assert.ok(!state.prompts.some((p) => p.type === 'history.firstWork'), 'no work at nine');
    state.prompts = []; state.stats.health = 90; engine.ageUp();
    assert.ok(state.prompts.some((p) => p.type === 'history.firstWork'), 'asked at ten');
  },
  'work that needs reading is closed to those who can\'t'() {
    const { engine, state } = life('GB', 1860);
    grow(engine, 20);
    state.schooling.literate = false;
    assert.match(eraWorkBlock(state, getProfession('accounting')) ?? '', /can't read/);
    assert.ok(!/can't read/.test(eraWorkBlock(state, getProfession('agriculture')) ?? ''), 'the land needs no reading');
    state.schooling.literate = true;
    assert.ok(!/can't read/.test(eraWorkBlock(state, getProfession('accounting')) ?? ''));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed++; console.log(`  ✘ ${name}\n    ${e.message}`); }
}
console.log(failed ? `✘ ${failed} early-leaver test(s) failed` : `✔ All ${Object.keys(tests).length} early-leaver tests passed`);
process.exit(failed ? 1 : 0);
