/**
 * When the monarchy falls, the government changes with it: a President of the Republic at the
 * top (chosen by parliament in a former parliamentary monarchy, elected where the crown ruled),
 * the Crown's own posts gone, and — where the crown ruled — free elections.
 *
 *   node tests/republic.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { abolish, restore } from '../src/modules/world/Houses.js';
import { demise } from '../src/modules/world/Crown.js';
import { governmentChart } from '../src/modules/org/OrgChart.js';
import { officeOrderFor, NATIONAL_OFFICES } from '../src/modules/politics/NationalOffices.js';
import { runEligibility } from '../src/modules/politics/Campaigns.js';
import { regimeOf } from '../src/modules/world/Regimes.js';
import { stateIdOf } from '../src/modules/life/Regions.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const monarch = (cc) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(2), modules: MODULES });
  const state = engine.newLife({ countryId: cc, royalLevel: 'heir', gender: 'male' });
  for (let i = 0; i < 40; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  if (!state.royal?.reigning) demise(engine.context(), state.royal.crownId, 'died');
  return { engine, state };
};
const offices = (state, cc) => officeOrderFor(cc, stateIdOf(state), [], state);

const tests = {
  'a parliamentary monarchy becomes a parliamentary republic'() {
    const { engine, state } = monarch('GB');
    assert.match(governmentChart(state).title, /King|Queen/);
    assert.ok(!offices(state, 'GB').includes('gb_republicPresident'));
    abolish(engine.context(), 'GB');
    assert.equal(governmentChart(state).title, 'President of the Republic');
    assert.ok(offices(state, 'GB').includes('gb_republicPresident'));
    assert.ok(!offices(state, 'GB').some((id) => /lieutenant/i.test(id)), 'the lieutenancies go with the Crown');
    assert.equal(NATIONAL_OFFICES.gb_republicPresident.selection, 'parliament');
    assert.notEqual(runEligibility(state, 'gb_lordLieutenant').reason, undefined);
    assert.equal(state.royal, null, 'you are no longer a reigning monarch');
  },
  'where the crown ruled, the republic holds free elections for an elected president'() {
    const { engine, state } = monarch('SA');
    assert.notEqual(regimeOf('SA').kind, 'democracy');
    abolish(engine.context(), 'SA');
    assert.equal(regimeOf('SA').elections, 'free');
    assert.equal(governmentChart(state).title, 'President of the Republic');
    assert.ok(NATIONAL_OFFICES.sa_republicPresident.executive);
    assert.ok(runEligibility(state, 'sa_republicPresident').ok, JSON.stringify(runEligibility(state, 'sa_republicPresident')));
  },
  'a restored throne takes the republic away again'() {
    const { engine, state } = monarch('SA');
    abolish(engine.context(), 'SA');
    restore(engine.context(), 'SA');
    assert.ok(!state.world.juntas?.SA, 'the republic\'s government is gone');
    assert.ok(!offices(state, 'SA').includes('sa_republicPresident'));
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 5).join('\n  ')}`); }
}
if (failed) process.exit(1);
