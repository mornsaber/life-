/**
 * Family history and screening, children's education, and life as an expat.
 *
 *   node tests/personal.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { geneFactor, geneticsTick } from '../src/modules/health/Genetics.js';
import { childEducationTick } from '../src/modules/people/ChildEducation.js';
import { makePerson } from '../src/modules/people/PeopleEngine.js';
import { arrive } from '../src/modules/world/Migration.js';
import { ExpatLifeModule, expatOf } from '../src/modules/world/ExpatLife.js';
import { partnerOf } from '../src/modules/people/People.js';
import { grantCredential, pursueEligibility, hasCredential } from '../src/modules/credentials/LicensingEngine.js';
import { stateIdOf } from '../src/modules/life/Regions.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId = 'US', seed = 3, age = 30) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  state.character.age = age;
  state.prompts = [];
  state.legal.record = [];
  state.finances.cash = 200000;
  return { engine, state, ctx: engine.context() };
}
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };
const answer = (engine, state, type, opt) => { const p = state.prompts.find((x) => x.type === type); if (p) engine.resolvePrompt(p.id, opt ?? p.options[0].id); return p; };

const tests = {
  'a genetic test reveals a family history, and prevention cuts the risk'() {
    const { engine, state, ctx } = life('US', 4, 35);
    geneticsTick(ctx);
    state.health.genes.cancer = 2.4;
    state.health.genes.heart = 1;
    assert.equal(geneFactor(state, 'cancer'), 2.4);
    engine.dispatch('health.prevent', 'cancer');
    assert.ok(!state.health.genes.prevention.cancer, 'no prevention before a test');
    engine.dispatch('health.geneticTest');
    assert.ok(state.health.genes.known);
    engine.dispatch('health.prevent', 'cancer');
    assert.ok(Math.abs(geneFactor(state, 'cancer') - 2.4 * 0.35) < 1e-9);
    clean(VIEWS.health(state, {}));
  },
  'a child sits exams with tutors, then goes to university on your money'() {
    const { engine, state, ctx } = life('GB', 7, 45);
    const kid = makePerson(ctx, { relation: 'child', age: 15, lastName: state.character.lastName, relationship: 80 });
    state.people.list.push(kid);
    childEducationTick(ctx);
    assert.ok(answer(engine, state, 'childEducation.exams', 'tutor'));
    state.character.age += 2;
    childEducationTick(ctx);
    assert.ok(answer(engine, state, 'childEducation.next', 'uniPay'));
    assert.ok(kid.uni?.paidByYou);
    const before = state.finances.cash;
    state.character.age += 1;
    childEducationTick(ctx);
    assert.ok(state.finances.cash < before, 'fees are charged');
  },
  'an expat finds their feet, meets someone local and decides where home is'() {
    let met = 0; let settled = 0;
    for (let seed = 1; seed <= 12 && (!met || !settled); seed++) {
      const { engine, state, ctx } = life('US', seed, 26);
      state.people.list = state.people.list.filter((p) => !['partner', 'spouse', 'fiance'].includes(p.relation));
      arrive(ctx, 'DE', { visa: 'work' });
      for (let y = 0; y < 12; y++) {
        state.prompts = [];
        ExpatLifeModule.onAgeUp(ctx);
        answer(engine, state, 'expatLife.circle', 'local');
        answer(engine, state, 'expatLife.homesick', 'call');
        if (answer(engine, state, 'expatLife.meet', 'date')) { met += 1; assert.equal(partnerOf(state).nationality, 'DE'); }
        if (answer(engine, state, 'expatLife.settle', 'stay')) { settled += 1; assert.ok(expatOf(state).settled); }
        state.character.age += 1;
      }
      assert.ok(expatOf(state).belonging > 40, `belonging ${expatOf(state).belonging}`);
      clean(VIEWS.move(state, {}));
    }
    assert.ok(met >= 1 && settled >= 1, `met ${met}, settled ${settled}`);
  },
  'a police officer who moves abroad retrains at the local academy'() {
    const { engine, state, ctx } = life('US', 4, 28);
    state.stats.fitness = 80;
    grantCredential(ctx, 'driverLicense', { silent: true });
    grantCredential(ctx, 'post', { silent: true });
    state.character.citizenships = ['US', 'GB'];
    arrive(ctx, 'GB', {});
    assert.ok(!hasCredential(state, 'post'), 'a US police certificate is not valid in the UK');
    state.credentials.held.driverLicense.states.push(stateIdOf(state));
    assert.doesNotMatch(pursueEligibility(state, 'post', { academy: true }).reason ?? '', /Held in/, 'the foreign certificate does not block retraining');
    hire(ctx, { professionId: 'privatePolice', levelId: 'recruit', employer: createEmployer(engine.rng, state, getProfession('privatePolice'), state.character.regionId) });
    assert.ok(state.credentials.training.some((t) => t.id === 'post'), 'the force puts you through its academy');
    for (let y = 0; y < 2; y++) { state.prompts = []; engine.ageUp(); }
    assert.ok(hasCredential(state, 'post'), 'certified here after the academy');
    assert.ok(state.credentials.held.post.states.length >= 2, 'the home certificate is kept too');
  },
  'going home after years abroad'() {
    const { engine, state, ctx } = life('US', 9, 28);
    arrive(ctx, 'FR', { visa: 'work' });
    for (let y = 0; y < 8; y++) {
      state.prompts = [];
      ExpatLifeModule.onAgeUp(ctx);
      answer(engine, state, 'expatLife.circle', 'expat');
      if (answer(engine, state, 'expatLife.settle', 'home')) break;
      state.character.age += 1;
    }
    assert.equal(state.character.countryId ?? 'US', 'US');
    state.character.age += 1;
    ExpatLifeModule.onAgeUp(ctx);
    assert.ok(expatOf(state).returnedAt != null);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} personal tests passed`);
