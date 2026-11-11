/**
 * Vocations (career/Vocations.js) with the medicine pack: courses gate promotion and lapse,
 * everything keeps its dates, the regulator disciplines through the licence, elite posts and
 * awards come with a record.
 *
 *   node tests/vocations.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire, levelCheck } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { VOCATIONS, packFor, vocationOf, courseOptions, regulatorOf, applies } from '../src/modules/career/Vocations.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const MED = VOCATIONS.medicine;

function doctor({ cc = 'US', year = 2010, specialty = 'generalSurgery', level = 'fellow', seed = 1 } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ gender: 'female', countryId: cc, startYear: year - 36 });
  state.character.age = 36; state.prompts = []; engine.ageUp(); state.prompts = [];
  const ctx = engine.context();
  state.credentials.held.medicalLicense = { earnedAge: 30, status: 'active' };
  state.credentials.held.boardCertified = { earnedAge: 32, status: 'active' };
  state.medicine = { ...(state.medicine ?? {}), specialty, practice: 'academic', claims: [] };
  const p = getProfession('medical');
  hire(ctx, { professionId: 'medical', levelId: level, employer: createEmployer(ctx.rng, state, p, state.character.regionId) });
  return { engine, state, ctx, p };
}

const tests = {
  'a surgeon needs ACLS and ATLS before attending, one course a year, and ACLS lapses'() {
    const { engine, state, p } = doctor();
    assert.equal(packFor(state), MED);
    const att = p.levels.find((l) => l.id === 'attending');
    assert.deepEqual(levelCheck(state, att).missing, ['Advanced Cardiac Life Support (ACLS)', 'Advanced Trauma Life Support (ATLS)']);
    engine.dispatch('vocation.course', 'medicine:acls');
    engine.dispatch('vocation.course', 'medicine:atls');
    assert.ok(vocationOf(state, MED).courses.acls != null, 'one course a year');
    assert.equal(vocationOf(state, MED).courses.atls, undefined, 'one course a year');
    state.prompts = []; engine.ageUp(); state.prompts = [];
    engine.dispatch('vocation.course', 'medicine:atls');
    assert.ok(levelCheck(state, att).ok, 'both done');
    state.character.age += 3;
    assert.ok(!levelCheck(state, att).ok, 'ACLS lapses after two years');
  },
  'courses and postings keep their dates'() {
    const { state } = doctor({ year: 1950 });
    const ids = courseOptions(state, MED).map((o) => o.course.id);
    assert.ok(!ids.includes('acls') && !ids.includes('atls'), 'no ACLS before 1974');
    assert.ok(!applies(state, MED, MED.postings.find((x) => x.id === 'msf')), 'no MSF before 1971');
    assert.ok(applies(state, MED, MED.postings.find((x) => x.id === 'redCross')), 'a Red Cross field hospital instead');
    assert.ok(!applies(doctor({ year: 1940 }).state, MED, MED.awards.find((x) => x.id === 'lasker')), 'no Lasker before 1945');
  },
  'a British doctor sits the Royal College; the GMC is the regulator from 1858'() {
    const { state, p } = doctor({ cc: 'GB', year: 1990, specialty: 'internalMedicine' });
    const att = p.levels.find((l) => l.id === 'attending');
    assert.ok(levelCheck(state, att).missing.some((m) => /MRCP/.test(m)));
    assert.equal(regulatorOf(state, MED).name, 'the General Medical Council');
    const early = doctor({ cc: 'GB', year: 1850 });
    assert.equal(regulatorOf(early.state, MED), null, 'no GMC before 1858');
  },
  'a complaint that ends in erasure revokes the licence; conditions block promotion'() {
    const { engine, state, ctx, p } = doctor({ level: 'attending' });
    vocationOf(state, MED);
    ctx.prompt({ type: 'vocation.complaint', icon: '⚖️', title: 't', text: 't', options: [{ id: 'contest', label: 'c' }], data: { pack: 'medicine', kind: 'boundary', severity: 3, fee: 1, guilty: true } });
    const q = state.prompts.at(-1);
    engine.resolvePrompt(q.id, 'contest');
    assert.equal(vocationOf(state, MED).record.at(-1).outcome, 'erasure');
    assert.equal(state.credentials.held.medicalLicense.status, 'revoked');
    const other = doctor({ level: 'attending', seed: 2 });
    vocationOf(other.state, MED).conditionsUntil = other.state.character.age + 3;
    const senior = p.levels.find((l) => l.id === 'senior');
    assert.ok(levelCheck(other.state, senior).missing.some((m) => /conditions/.test(m)));
  },
  'a career brings postings, awards or posts, and the Work tab shows them'() {
    let seen = 0;
    for (let seed = 1; seed <= 4; seed++) {
      const { engine, state } = doctor({ cc: 'GB', year: 1985, specialty: 'internalMedicine', level: 'attending', seed });
      state.career.job.levelId = 'senior';
      for (let i = 0; i < 20 && state.career.job; i++) {
        for (const q of [...state.prompts]) engine.resolvePrompt(q.id, (q.options.find((o) => ['go', 'accept', 'cooperate'].includes(o.id)) ?? q.options[0]).id);
        state.career.job.performance = 85;
        state.stats.health = 90;
        engine.ageUp();
      }
      const v = vocationOf(state, MED);
      seen += v.postings.length + v.awards.length + (v.elite ? 1 : 0);
      if (state.career.job) assert.match(VIEWS.career(state, {}), /Training &amp; Distinctions|Training & Distinctions/);
    }
    assert.ok(seen >= 3, `${seen} postings, awards and posts in four careers`);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
