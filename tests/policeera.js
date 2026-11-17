/**
 * Police and fire services of their day: entry schemes by date, and Britain's old names.
 *
 *   node tests/policeera.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { directEntryInEra, DIRECT_ENTRY } from '../src/modules/career/DirectEntry.js';
import { periodText, setEraYear, PRESENT } from '../src/modules/world/Eras.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { ladderFor } from '../src/modules/career/Ladder.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const at = (cc, year) => new Engine({ store: new Store(memory()), rng: new Random(1), modules: MODULES }).newLife({ countryId: cc, startYear: year });

const tests = {
  'Hendon, 1934-39; Direct Entry Inspector only from 2014'() {
    assert.ok(directEntryInEra(at('GB', 1936), 'hendon'));
    assert.ok(!directEntryInEra(at('GB', 1950), 'hendon'));
    assert.ok(!directEntryInEra(at('GB', 1990), 'dei'));
    assert.ok(!directEntryInEra(at('FR', 1980), 'lieutenant'), 'the corps des officiers dates from 1995');
  },
  'every direct-entry route lands on a rung of the ladder'() {
    for (const [cc, byProf] of Object.entries(DIRECT_ENTRY)) for (const [pid, routes] of Object.entries(byProf)) {
      let p;
      try { p = getProfession(pid); } catch { continue; }
      const ids = ladderFor(p, 'mega').map((l) => l.id);
      for (const r of routes) assert.ok(ids.includes(r.levelId), `${cc} ${pid} ${r.id} → ${r.levelId}`);
    }
  },
  'British fire brigades and their ranks before 2004-06'() {
    setEraYear(1975);
    assert.equal(periodText('Kent Fire and Rescue Service · Watch Manager'), 'Kent Fire Brigade · Sub-Officer');
    setEraYear(PRESENT);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
