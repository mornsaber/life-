/**
 * Engineering disciplines, national-agency employer names, and wartime call-up ages.
 *
 *   node tests/engineering.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession, JOB_FIELDS } from '../src/modules/career/JobTrees.js';
import { ENGINEERING_IDS } from '../src/modules/career/EngineeringCareers.js';
import { PROJECT_CAREERS } from '../src/modules/career/engines/Projects.js';
import { callUp } from '../src/modules/world/War.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId = 'US', seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  state.character.age = 26;
  state.prompts = [];
  state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'engineering', year: 22 });
  return { engine, state, ctx: engine.context() };
}

const tests = {
  'every engineering discipline is on the job board, hires, and has project work'() {
    for (const id of ENGINEERING_IDS) {
      assert.ok(JOB_FIELDS.tech.ids.includes(id), `${id} listed`);
      assert.ok(PROJECT_CAREERS[id]?.deck?.length >= 2, `${id} deck`);
      const { engine, state, ctx } = life('US', 3);
      const p = getProfession(id);
      hire(ctx, { professionId: id, levelId: 'eng1', employer: createEmployer(new Random(1), state, p, state.character.regionId) });
      assert.equal(state.career.job?.professionId, id);
      for (let y = 0; y < 4; y++) {
        while (state.prompts.length) engine.resolvePrompt(state.prompts[0].id, (state.prompts[0].options.find((o) => !o.disabled) ?? state.prompts[0].options[0]).id);
        state.stats.health = 90;
        engine.ageUp();
      }
      assert.ok(VIEWS.career(state, {}).length > 100);
    }
    assert.ok(PROJECT_CAREERS.engineering.deck.length >= 5, 'civil engineers have more to do');
  },
  'a national agency is the employer and its listing is the site: not "SIS — Vauxhall Cross"'() {
    const { state } = life('GB', 4);
    const p = getProfession('gb_caseOfficer');
    const e = createEmployer(new Random(2), state, p, state.character.regionId);
    assert.equal(e.name, 'Secret Intelligence Service (MI6)');
    assert.equal(e.site, 'Vauxhall Cross');
  },
  'call-up ages grow with the war: a draft takes the young, total war reaches further, never 60-year-olds'() {
    assert.deepEqual(callUp({ intensity: 3, mobilized: false }).ages, [18, 25]);
    assert.deepEqual(callUp({ intensity: 3, mobilized: true }).ages, [18, 45]);
    assert.deepEqual(callUp({ intensity: 4, mobilized: true }).ages, [18, 55]);
    const total = callUp({ intensity: 4, mobilized: true });
    assert.equal(total.odds(60), 0);
    assert.ok(total.odds(22) > total.odds(50));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} engineering test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} engineering tests passed`);
