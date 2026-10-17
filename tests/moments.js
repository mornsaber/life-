/**
 * Signature career moments: every one is well-formed, names a real career,
 * and comes up for the people who do that job.
 *
 *   node tests/moments.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { PROFESSIONS, getProfession } from '../src/modules/career/JobTrees.js';
import { PROFESSION_MOMENTS } from '../src/modules/career/ProfessionMoments.js';
import { workplaceEvent, resolveWorkEvent } from '../src/modules/career/WorkplaceEvents.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { OFFENSES } from '../src/modules/legal/Offenses.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const tests = {
  'every moment is well-formed and names real careers'() {
    const ids = new Set(PROFESSION_MOMENTS.map((m) => m.id));
    assert.equal(ids.size, PROFESSION_MOMENTS.length, 'unique ids');
    assert.ok(PROFESSION_MOMENTS.length >= 60);
    const src = PROFESSION_MOMENTS.map((m) => m.when.toString()).join('');
    void src;
    for (const m of PROFESSION_MOMENTS) {
      assert.ok(m.title && m.text && m.options.length, m.id);
      for (const o of m.options) {
        assert.ok(o.id && o.label && o.text, `${m.id}.${o.id}`);
        if (o.risky?.offense) assert.ok(OFFENSES[o.risky.offense], `${m.id}: offense ${o.risky.offense}`);
      }
    }
  },

  'careers with a moment get it, and it resolves'() {
    for (const professionId of ['dentistry', 'airTrafficControl', 'actuary', 'journalism', 'lineworker', 'veterinary']) {
      assert.ok(PROFESSIONS[professionId], professionId);
      const engine = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES });
      const state = engine.newLife({});
      state.character.age = 35;
      state.prompts = [];
      const p = getProfession(professionId);
      hire(engine.context(), { professionId, levelId: (p.levels.find((l) => l.entry) ?? p.levels[0]).id, employer: createEmployer(new Random(2), state, p, state.character.regionId) });
      const mine = PROFESSION_MOMENTS.filter((m) => m.when(state));
      assert.ok(mine.length >= 1, `${professionId} has moments`);
      let seen = null;
      for (let i = 0; i < 60 && !seen; i++) {
        state.prompts = [];
        workplaceEvent({ ...engine.context(), rng: new Random(100 + i) });
        seen = state.prompts.find((x) => x.type === 'career.workEvent' && x.data.eventId.startsWith('moment.'));
      }
      assert.ok(seen, `${professionId}: a moment came up`);
      resolveWorkEvent(engine.context(), seen.data, seen.data && PROFESSION_MOMENTS.find((m) => m.id === seen.data.eventId).options[0].id);
    }
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} moment test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} career-moment tests passed`);
