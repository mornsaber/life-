/**
 * Licences that come with the job, and learning to drive.
 *
 *   node tests/joblicensing.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { hasCredential } from '../src/modules/credentials/LicensingEngine.js';
import { RISKY_ACTIONS } from '../src/modules/legal/Misconduct.js';
import { stateIdOf } from '../src/modules/life/Regions.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(age = 30, seed = 3) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  state.character.age = age;
  state.prompts = [];
  Object.assign(state.stats, { smarts: 85, fitness: 85, health: 95 });
  state.legal.record = [];
  return { engine, state };
}
const work = (engine, state, professionId) => {
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 });
  state.credentials.held.learnerPermit = { earnedAge: 16, renewedAge: 16, status: 'active', states: [stateIdOf(state)] };
  state.credentials.held.driverLicense = { earnedAge: 18, renewedAge: 18, status: 'active', states: [stateIdOf(state)] };
  const p = getProfession(professionId);
  return hire(engine.context(), { professionId, levelId: p.levels.find((l) => l.entry)?.id ?? p.levels[0].id, employer: createEmployer(new Random(2), state, p, state.character.regionId) });
};
const year = (engine) => {
  engine.state.prompts = [];
  engine.state.stats.health = 95;
  engine.ageUp();
  for (let j = 0; j < 10 && engine.state.prompts.length; j++) {
    const p = engine.state.prompts[0];
    engine.resolvePrompt(p.id, (p.options.find((o) => o.id === 'yes') ?? p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0]).id);
  }
};

const tests = {
  'employers put their people through the licences the job needs, at their cost'() {
    for (const [id, cred] of [['trucking', 'cdlA'], ['fire', 'ff1'], ['ems', 'emt'], ['police', 'post']]) {
      const { engine, state } = life();
      assert.ok(work(engine, state, id), id);
      const cash = state.finances.cash;
      for (let i = 0; i < 4 && !hasCredential(state, cred); i++) year(engine);
      assert.ok(hasCredential(state, cred) || state.credentials.training.some((t) => t.id === cred), `${id}: ${cred}`);
      assert.ok(state.credentials.held[cred]?.sponsor || state.credentials.training.some((t) => t.id === cred && t.sponsor), `${id}: the employer paid`);
      assert.ok(state.finances.cash > cash - 50000);
    }
  },

  'at the permit age you are asked to learn to drive, then to take the test'() {
    const { engine, state } = life(14);
    const seen = [];
    for (let i = 0; i < 4 && !hasCredential(state, 'driverLicense'); i++) {
      state.prompts = [];
      engine.ageUp();
      for (const p of state.prompts.filter((x) => x.type === 'jobLicensing.driving')) seen.push(p.data.id);
      for (let j = 0; j < 10 && state.prompts.length; j++) {
        const p = state.prompts[0];
        engine.resolvePrompt(p.id, (p.options.find((o) => o.id === 'yes') ?? p.options[0]).id);
      }
    }
    assert.ok(seen.includes('learnerPermit'), `asked for a permit (${seen})`);
    assert.ok(seen.includes('driverLicense'), `then the test (${seen})`);
  },

  'saying not yet means you are not asked again for a few years'() {
    const { engine, state } = life(15);
    let asked = 0;
    for (let i = 0; i < 2; i++) {
      state.prompts = [];
      engine.ageUp();
      asked += state.prompts.filter((p) => p.type === 'jobLicensing.driving').length;
      for (const p of [...state.prompts]) engine.resolvePrompt(p.id, (p.options.find((o) => o.id === 'no') ?? p.options[0]).id);
    }
    assert.equal(asked, 1);
  },

  'driving yourself takes a vehicle'() {
    const { state } = life(25);
    state.vehicles = { owned: [] };
    for (const id of ['speed', 'driveDrunk']) assert.ok(RISKY_ACTIONS.find((r) => r.id === id).needs(state), id);
    state.vehicles.owned.push({ typeId: 'beater' });
    for (const id of ['speed', 'driveDrunk']) assert.equal(RISKY_ACTIONS.find((r) => r.id === id).needs(state), null, id);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} job-licensing test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} job-licensing tests passed`);
