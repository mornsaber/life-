/**
 * The Intelligence Community: polygraph, cover, stations, operations,
 * insider threat and the path out to cleared contracting.
 *
 *   node tests/intel.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { clearanceHiringBonus } from '../src/modules/career/ClearedWork.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function setup(seed = 3, age = 25) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Intel', lastName: 'Test' });
  state.character.age = age;
  Object.assign(state.stats, { smarts: 85, health: 90, stress: 20 });
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'politicalScience', year: 22 });
  const ctx = engine.context();
  ctx.emit('clearance:grant', { level: 'topSecret', concealed: false });
  return { engine, state, ctx };
}
const join = (t, professionId, levelId) => {
  const p = getProfession(professionId);
  hire(t.ctx, { professionId, levelId, employer: createEmployer(t.engine.rng, t.state, p, t.state.character.regionId) });
  return t.state.career.job;
};
const pick = (engine, type, option) => { const p = engine.state.prompts.find((x) => x.type === type); assert.ok(p, type); engine.resolvePrompt(p.id, option); };

const tests = {
  'CIA: polygraph, the Farm, cover, a station and operations'() {
    const t = setup(4);
    const job = join(t, 'caseOfficer', 'trainee');
    t.state.prompts = [];
    t.engine.ageUp();
    if (!t.state.career.job) return; // rare: offer rescinded
    const poly = t.state.prompts.find((p) => p.type === 'intel.polygraph');
    assert.ok(poly, 'polygraph in the first year');
    t.state.prompts = [poly];
    t.engine.resolvePrompt(poly.id, 'truth');
    if (!t.state.career.job) return;
    assert.ok(job.poly);
    job.levelId = 'officer';
    t.state.prompts = [];
    t.engine.ageUp();
    pick(t.engine, 'intel.cover', 'noc');
    assert.equal(job.cover, 'noc');
    assert.equal(job.payAdjust, 1.2, 'non-official cover pays more');
    t.state.prompts = [];
    t.engine.ageUp();
    const st = t.state.prompts.find((p) => p.type === 'intel.station');
    assert.ok(st, 'station assignment');
    t.engine.resolvePrompt(st.id, st.options[0].id);
    assert.ok(job.posting?.station);
    assert.equal(job.posting.immunity, false, 'no immunity under non-official cover');
    let ops = 0;
    for (let i = 0; i < 16 && t.state.career.job && ops < 2; i++) {
      t.state.prompts = [];
      t.engine.ageUp();
      if (t.state.prompts.some((p) => p.type === 'intel.event')) ops += 1;
      for (let k = 0; k < 10 && t.state.prompts.length; k++) { const p = t.state.prompts[0]; t.engine.resolvePrompt(p.id, (p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0]).id); }
    }
    if (t.state.career.job) assert.ok(ops >= 2, `operations events: ${ops}`);
  },

  'clandestine hiring stops at 35; IC veterans are prime contractor recruits'() {
    const t = setup(5, 40);
    assert.equal(getProfession('caseOfficer').eligible(t.state).ok, false);
    assert.ok(clearanceHiringBonus(t.state, getProfession('sigint')) > 0.1, 'a TS/SCI holder has a head start');
  },

  'insider threat: selling secrets is espionage'() {
    const t = setup(6);
    join(t, 'sigint', 'analyst');
    t.state.career.job.poly = true;
    t.state.prompts = [];
    t.ctx.prompt({ type: 'intel.event', icon: '', title: 'x', text: 'x', options: [{ id: 'report', label: 'r' }, { id: 'sell', label: 's' }], data: { pool: 'approach', id: 'approach' } });
    const cash = t.state.finances.cash;
    pick(t.engine, 'intel.event', 'sell');
    assert.ok(t.state.finances.cash > cash + 50000);
    assert.ok(t.state.legal.investigations.some((i) => i.offenseId === 'espionage') || t.state.legal.record.some((r) => r.offenseId === 'espionage'), 'an espionage case exists');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 5).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} intel test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} intelligence tests passed`);
