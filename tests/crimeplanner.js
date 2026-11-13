/**
 * The Crime tab: one picker, one panel — what it pays, the odds, the charge in this country's
 * words, the sentence, and whether it follows you abroad.
 *
 *   node tests/crimeplanner.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { RISKY_ACTIONS, OFFENSES } from '../src/modules/legal/index.js';
import { crimePlan } from '../src/modules/legal/CrimePlan.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc = 'US') => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(3), modules: MODULES });
  const state = engine.newLife({ countryId: cc });
  state.character.age = 30;
  state.prompts = [];
  return { engine, state };
};
const byId = (id) => RISKY_ACTIONS.find((r) => r.id === id);

const tests = {
  'every crime has a plan whose charge is a real offence'() {
    const { state } = life();
    for (const r of RISKY_ACTIONS) {
      const p = crimePlan(state, r);
      if (r.id === 'affair') { assert.equal(p.charge, null); continue; }
      assert.ok(p.charge, `${r.id} has a charge`);
      assert.ok(OFFENSES[p.charge.id], `${r.id}: ${p.charge.id}`);
    }
  },
  'the tab is a picker, not a wall of buttons'() {
    const { state } = life();
    const h = VIEWS.crime(state, {});
    assert.match(h, /data-ui-set="crimePick"/);
    assert.ok(!/data-action="legal\.burglary"/.test(h), 'no button until a crime is picked');
  },
  'picking a crime shows the take, the odds, the charge and the sentence'() {
    const { state } = life();
    const h = VIEWS.crime(state, { crimePick: 'burglary' });
    assert.match(h, /Typical take/);
    assert.match(h, /Caught in the act/);
    assert.match(h, /Residential Burglary/);
    assert.match(h, /Felony/);
    assert.match(h, /1–4 years in prison/);
    assert.match(h, /legal\.burglary/);
  },
  'charged in the words of the country you are in'() {
    const { state } = life('GB');
    const p = crimePlan(state, byId('driveDrunk'));
    assert.equal(p.charge.name, 'Drink-Driving');
    const h = VIEWS.crime(state, { crimePick: 'burglary' });
    assert.match(h, /Indictable offence/);
  },
  'violent crimes follow you everywhere; a ticket stays put'() {
    const { state } = life();
    assert.match(crimePlan(state, byId('armedRobbery')).charge.abroad, /Everywhere/);
    assert.match(crimePlan(state, byId('speed')).charge.abroad, /stays/);
  },
  'possession is no crime where it is decriminalised'() {
    const { state } = life('PT');
    assert.equal(crimePlan(state, byId('drugs')).charge.legalHere, false);
  },
  'heat raises the odds of being caught; practice lowers them'() {
    const { state } = life();
    const cold = crimePlan(state, byId('burglary')).caught;
    state.legal.crime = { heat: 80, skill: {} };
    const hot = crimePlan(state, byId('burglary')).caught;
    state.legal.crime = { heat: 0, skill: { burglary: 5 } };
    const skilled = crimePlan(state, byId('burglary')).caught;
    assert.ok(hot > cold && skilled < cold);
  },
  'done this year: the button is locked and says why'() {
    const { state } = life();
    state.yearly['risky.burglary'] = 1;
    const h = VIEWS.crime(state, { crimePick: 'burglary' });
    assert.match(h, /lay low/);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 5).join('\n  ')}`); }
}
if (failed) process.exit(1);
