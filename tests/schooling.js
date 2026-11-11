/**
 * Schooling of its day (education/SchoolingOfTheDay.js): leaving ages by country and year,
 * children who never went to school, the exam at eleven, and who got to university.
 *
 *   node tests/schooling.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { leavingAgeHere, enrolment, trackHere, womenAtUniversity } from '../src/modules/education/SchoolingOfTheDay.js';
import { enrollmentEligibility } from '../src/modules/education/EducationEngine.js';
import { eraStudyBlock, leavingAge } from '../src/modules/world/Eras.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const at = (cc, year, opts = {}, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year, gender: 'male', ...opts });
  return { engine, state };
};
const grow = (engine, state, years) => { for (let i = 0; i < years && state.character.alive; i++) { state.prompts = []; engine.ageUp(); } };

const tests = {
  'leaving ages by country and year'() {
    const gb = (y) => { const { state } = at('GB', y - 10); state.character.age = 10; return leavingAgeHere(state); };
    assert.equal(gb(1875), 10);
    assert.equal(gb(1930), 14);
    assert.equal(gb(1960), 15);
    assert.equal(gb(1990), null);
    const fr = at('FR', 1900).state; fr.character.age = 20;
    assert.equal(leavingAgeHere(fr), 13);
    assert.equal(leavingAge(fr), 13, 'History reads the place\'s law');
  },
  'in poor places and early years, many never went to school'() {
    const early = at('IN', 1850).state; early.character.age = 6;
    const modern = at('GB', 1950).state; modern.character.age = 6;
    assert.ok(enrolment(early) < 0.6, `${enrolment(early)}`);
    assert.ok(enrolment(modern) > 0.95);
    let unschooled = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const { engine, state } = at('IN', 1850, {}, seed);
      grow(engine, state, 7);
      if (state.schooling.unschooled) {
        unschooled++;
        assert.equal(state.schooling.literate, false);
      }
    }
    assert.ok(unschooled >= 3, `${unschooled}/12`);
  },
  'evening classes teach a grown-up to read'() {
    const { engine, state } = at('IN', 1880);
    state.character.age = 25;
    state.schooling.literate = false;
    state.schooling.unschooled = true;
    state.finances.cash = 1000;
    state.prompts = [];
    engine.dispatch('schooling.literacy');
    assert.equal(state.schooling.literate, true);
  },
  'the exam at eleven sorts children into schools'() {
    const t = trackHere((() => { const s = at('GB', 1950).state; s.character.age = 11; return s; })());
    assert.equal(t.academic, 'grammar school');
    let academic = 0, general = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const { engine, state } = at('GB', 1945, {}, seed);
      grow(engine, state, 12);
      if (state.schooling.track === 'academic') academic++;
      if (state.schooling.track === 'general') general++;
    }
    assert.ok(academic + general >= 9, `${academic} + ${general}`);
  },
  'women at university from their country\'s date; before 1945 for the few'() {
    const de = at('DE', 1880, { gender: 'female' }).state; de.character.age = 20;
    assert.equal(womenAtUniversity(de), false);
    assert.match(eraStudyBlock(de, { uni: { type: 'state' } }) ?? '', /women/);
    const ch = at('CH', 1880, { gender: 'female' }).state; ch.character.age = 20;
    assert.equal(eraStudyBlock(ch, { uni: { type: 'state' } }), null, 'Zurich admitted women from 1867');
    const poor = at('US', 1900).state;
    poor.character.age = 18;
    poor.people.wealth = 'low';
    poor.stats.smarts = 60;
    poor.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18, gpa: 3 });
    const r = enrollmentEligibility(poor, 'bachelor', 'state', 'business', { applying: true });
    assert.equal(r.ok, false);
    assert.match(r.reason, /scholarship|money|academic/);
  },
  'the School tab shows the schooling of its year'() {
    const { state } = at('GB', 1930);
    state.character.age = 12;
    const html = VIEWS.school(state, {});
    assert.match(html, /Schooling in 1942/);
    assert.doesNotMatch(html, /undefined|NaN/);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
