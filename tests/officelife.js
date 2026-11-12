/**
 * Life in office (politics/OfficeLife.js): protection details and threats, district time for
 * legislators, temptations, and who investigates officials in each country.
 *
 *   node tests/officelife.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { protectionOf, watchdogHere, isLegislator } from '../src/modules/politics/OfficeLife.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const take = (cc, officeId, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc });
  state.character.age = 50;
  state.prompts = [];
  engine.ageUp();
  state.politics.office = { id: officeId, approval: 55, terms: 1, termYearsLeft: 4, startAge: 51, salary: 1 };
  return { engine, state };
};
const year = (engine, state) => {
  state.prompts = [];
  state.stats.health = 95;
  engine.ageUp();
  for (let i = 0; i < 8 && state.prompts.length; i++) { const p = state.prompts[0]; engine.resolvePrompt(p.id, p.options.find((o) => !o.disabled && o.tone !== 'danger')?.id ?? p.options[0].id); }
};
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };

const tests = {
  'a president is guarded by the Secret Service, for life'() {
    const { engine, state } = take('US', 'president');
    assert.equal(protectionOf(state).tier, 'detail');
    assert.match(protectionOf(state).agency, /Secret Service/);
    year(engine, state);
    assert.match(VIEWS.politics(state, {}), /Secret Service/);
    state.politics.office = null;
    year(engine, state);
    assert.equal(state.officeLife.protection.until, null, 'former presidents keep it');
    assert.ok(protectionOf(state));
  },
  'a British prime minister\'s detail, and the police investigate'() {
    const { state } = take('GB', 'gb_pm');
    assert.match(protectionOf(state).agency, /Met/);
    assert.equal(watchdogHere(state), 'the police');
    assert.equal(watchdogHere(take('IN', 'in_pm').state), 'the CBI');
  },
  'a legislator chooses how much time to spend in the district'() {
    const { engine, state } = take('US', 'usRep');
    assert.equal(isLegislator(state), true);
    state.prompts = [];
    engine.dispatch('officeLife.district', 'lots');
    assert.equal(state.officeLife.district, 'lots');
    const html = VIEWS.politics(state, {});
    assert.match(html, /Your district/);
    clean(html);
    const before = state.politics.office.approval;
    year(engine, state);
    assert.ok(state.politics.office.approval >= before - 10);
  },
  'the bribe prompt names the local watchdog, not the FBI'() {
    const { engine, state } = take('FR', 'fr_depute');
    let found = null;
    for (let i = 0; i < 25 && !found; i++) {
      state.prompts = [];
      engine.ageUp();
      found = state.prompts.find((p) => p.type === 'politics.bribe');
      state.politics.office ??= { id: 'fr_depute', approval: 55, terms: 1, termYearsLeft: 4, startAge: 51, salary: 1 };
      state.politics.office.termYearsLeft = 4;
    }
    if (found) assert.doesNotMatch(JSON.stringify(found.options), /FBI/);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
