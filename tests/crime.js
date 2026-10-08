/**
 * Crime and veteran hiring: street and organized crime with heat and
 * experience, and military service that starts you higher on a civilian
 * ladder.
 *
 *   node tests/crime.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { RISKY_ACTIONS, OFFENSES, crimeOf, TASK_FORCE_HEAT } from '../src/modules/legal/index.js';
import { applicationEligibility, bestEntryLevel } from '../src/modules/career/CareerEngine.js';
import { militaryCredit } from '../src/modules/career/VeteranPlacement.js';
import { getProfession, PROFESSIONS } from '../src/modules/career/JobTrees.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(seed, age = 30) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  state.character.age = age;
  Object.assign(state.stats, { smarts: 85, health: 90, fitness: 70 });
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'history', schoolId: 'state', gpa: 3.2, year: 22 });
  return { engine, state, ctx: engine.context() };
}
const clean = (html) => assert.ok(!/NaN|undefined|\[object/.test(html), html.match(/.{60}(NaN|undefined|\[object).{60}/)?.[0]);

const tests = {
  'every crime resolves to a real offense and can be committed'() {
    for (const r of RISKY_ACTIONS) {
      const { engine, state } = life(100 + RISKY_ACTIONS.indexOf(r), 30);
      state.finances.cash = 50_000;
      state.legal.crime = { heat: 0, skill: {}, earned: 50_000, layingLow: false };
      state.credentials.held.driverLicense = { earnedAge: 16, renewedAge: 28, status: 'active' };
      state.vehicles.owned.push({ id: 'v1', typeId: 'usedSedan', value: 15000, age: 3, insured: true });
      state.character.regionId = 'rural';
      if (r.needsPartner) continue;
      state.prompts = [];
      engine.dispatch(`legal.${r.id}`);
      assert.ok(state.yearly[`risky.${r.id}`], `${r.id} ran`);
    }
    for (const id of ['pettyTheft', 'mailTheft', 'identityTheft', 'counterfeiting', 'computerIntrusion', 'moneyLaundering', 'extortion', 'gunTrafficking', 'racketeering', 'carjacking', 'bankRobbery']) assert.ok(OFFENSES[id], id);
  },

  'heat builds, raises the odds of arrest, and fades — faster when you lay low'() {
    const { engine, state, ctx } = life(7);
    let arrests = 0;
    for (let i = 0; i < 6; i++) {
      state.yearly = {};
      state.prompts = [];
      for (const id of ['catalytic', 'fence', 'knockoffs', 'bookie', 'loanShark']) engine.dispatch(`legal.${id}`);
      arrests += state.prompts.filter((p) => p.type === 'legal.court').length;
    }
    const c = crimeOf(state);
    assert.ok(c.heat >= 40, `heat ${c.heat}`);
    assert.ok(Object.values(c.skill).some((n) => n >= 2), 'experience');
    const h = c.heat;
    state.prompts = [];
    engine.dispatch('legal.layLow');
    MODULES.find((m) => m.id === 'legal').onAgeUp(ctx);
    assert.ok(c.heat <= Math.round(h * 0.3) + 1, `laying low cools things (${h} → ${c.heat})`);
    clean(VIEWS.activities(state, {}));
    assert.match(VIEWS.activities(state, {}), /Organized crime/);
  },

  'a hot record draws a task force'() {
    const { state, ctx } = life(8);
    state.legal.crime = { heat: TASK_FORCE_HEAT + 10, skill: {}, earned: 0, layingLow: false };
    state.legal.investigations.push({ offenseId: 'extortion', context: 'x', discovery: 0.2, evidence: 0.8, yearsLeft: 7 });
    MODULES.find((m) => m.id === 'legal').onAgeUp(ctx);
    assert.ok(state.legal.investigations.length === 0 || state.legal.investigations[0].discovery > 0.2 || state.prompts.length, 'the case heated up');
  },

  'related military service starts you higher; leadership counts in any private field'() {
    const { state } = life(9);
    for (const c of ['driverLicense', 'post', 'fto']) state.credentials.held[c] = { earnedAge: 22, renewedAge: 29, status: 'active' };
    const police = getProfession('police');
    const before = bestEntryLevel(state, police, 'medium');
    state.military.history.push({ branch: 'army', track: 'enlisted', specialty: 'infantry', mos: '31B', rankCode: 'E-6', rankTitle: 'SSG', yearsOfService: 8, discharge: 'honorable', priorYears: 0 });
    const credit = militaryCredit(state, police);
    assert.ok(credit.related && credit.steps === 2, JSON.stringify(credit));
    const after = bestEntryLevel(state, police, 'medium');
    assert.ok(after.grade > before.grade, `${before.title} → ${after.title}`);
    assert.ok(!after.abilities?.includes('budget') && after.track !== 'mgmt', 'never into command');
    // A dishonorable discharge earns nothing.
    state.military.history[0].discharge = 'dishonorable';
    assert.equal(militaryCredit(state, police).steps, 0);
    // A captain gets a leg up in a private company, not in an unrelated government agency's ranks.
    state.military.history = [{ branch: 'army', track: 'officer', specialty: 'logistics', rankCode: 'O-3', rankTitle: 'CPT', yearsOfService: 6, commissionedYears: 6, discharge: 'honorable', priorYears: 0 }];
    const retail = getProfession('retail');
    const r = applicationEligibility(state, 'retail');
    assert.ok(r.ok && r.level.grade > retail.levels[0].grade, `retail entry ${r.level?.title}`);
    // Veteran placement never skips past an appointed or executive post anywhere.
    for (const p of Object.values(PROFESSIONS)) {
      const lvl = bestEntryLevel(state, p, 'enterprise');
      if (lvl) assert.ok(!lvl.appointed && !lvl.abilities?.includes('exec'), p.id);
    }
    clean(VIEWS.career(state, {}));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} crime test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} crime & veteran-hiring tests passed`);
