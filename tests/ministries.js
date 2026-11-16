/**
 * Civil service by country (the `ministry` career, world/NationalAgencies.js, career/Ministries.js):
 * each country's grades, a named minister and reshuffles, private office, the budget round,
 * machinery of government, committee hearings, IAS postings and the revolving door.
 *
 *   node tests/ministries.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { hire, leaveJob } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { MinistriesModule, isMinistry } from '../src/modules/career/Ministries.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function official(cc, levelId, seed = 3) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc });
  for (let i = 0; i < 30; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'politics', year: 22 });
  const ctx = engine.context();
  const id = cc === 'US' ? 'ministry' : `${cc.toLowerCase()}_ministry`;
  const employer = createEmployer(new Random(seed), state, getProfession(id), state.character.regionId);
  employer.size = 'enterprise';
  hire(ctx, { professionId: id, levelId, employer });
  state.prompts = [];
  return { engine, state, ctx, job: state.career.job };
}

const tests = {
  'each country runs its own civil service, with its own grades'() {
    const expect = { gb: 'Permanent Secretary', jp: 'Jimu-jikan (Administrative Vice-Minister)', in: 'Cabinet Secretary', de: 'Staatssekretär', fr: 'Secrétaire général du ministère', au: 'Departmental Secretary', ca: 'Deputy Minister' };
    for (const [cc, top] of Object.entries(expect)) {
      const p = getProfession(`${cc}_ministry`);
      assert.ok(p, `${cc} civil service`);
      assert.equal(p.levels.at(-1).title, top, `${cc} top post`);
      assert.ok(!p.levels.some((l) => /GS-|SES/.test(l.title)), `${cc}: no US grades`);
    }
    assert.ok(!getProfession('ministry').levels.some((l) => /_cmd/.test(l.id)), 'no invented command ranks');
  },
  'a named minister, reshuffled now and then; the budget round for senior officials'() {
    const { engine, state, job } = official('GB', 'chief');
    assert.ok(isMinistry(job));
    MinistriesModule.onAgeUp(engine.context());
    assert.ok(job.ministry.minister.name, 'a minister');
    const first = job.ministry.minister.name;
    let changed = false;
    let review = false;
    for (let y = 0; y < 12; y++) {
      state.character.age += 1;
      state.prompts = [];
      MinistriesModule.onAgeUp(engine.context());
      if (job.ministry.minister.name !== first) changed = true;
      const p = state.prompts.find((x) => x.type === 'ministries.review');
      if (p) { review = true; engine.resolvePrompt(p.id, 'real'); }
    }
    assert.ok(changed, 'a reshuffle in twelve years');
    assert.ok(review, 'a budget round');
    assert.match(VIEWS.career(state), /minister's trust/);
  },
  'private office leads to first in line'() {
    const { engine, state, job } = official('GB', 'senior');
    MinistriesModule.onAgeUp(engine.context());
    MinistriesModule.resolvers.privateOffice(engine.context(), {}, 'yes');
    assert.ok(job.ministry.privateOffice);
    state.character.age = job.ministry.privateOffice.until;
    MinistriesModule.onAgeUp(engine.context());
    assert.equal(job.ministry.privateOffice, null);
    assert.ok(job.nextInLine, 'first in line');
  },
  'the IAS posts its officers to a new district every few years'() {
    const { engine, state, job } = official('IN', 'specialist');
    MinistriesModule.onAgeUp(engine.context());
    const home = state.character.regionId;
    job.ministry.postedAge = state.character.age - 3;
    state.prompts = [];
    MinistriesModule.onAgeUp(engine.context());
    assert.notEqual(state.character.regionId, home, 'transferred');
  },
  'leaving a senior post: the revolving door'() {
    const { engine, state, ctx, job } = official('GB', 'das');
    leaveJob(ctx, 'Left the civil service');
    const p = state.prompts.find((x) => x.type === 'ministries.door');
    assert.ok(p, 'an offer');
    engine.resolvePrompt(p.id, 'take');
    assert.equal(state.career.job?.professionId, 'corporate', 'through the door');
    const b = official('GB', 'analyst', 4);
    leaveJob(b.ctx, 'Left the civil service');
    assert.ok(!b.state.prompts.some((x) => x.type === 'ministries.door'), 'not for junior staff');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
