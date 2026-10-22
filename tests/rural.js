/**
 * Rural life: fewer jobs in small places, commuting from small towns,
 * distance to hospital, and the rural year.
 *
 *   node tests/rural.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { professionsFor } from '../src/modules/career/JobTrees.js';
import { applicationEligibility } from '../src/modules/career/CareerEngine.js';
import { remoteness, ruralHiring, commuteOf, ruralRisk, nearestCity, RuralLifeModule } from '../src/modules/life/RuralLife.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(regionId, countryId = 'US', seed = 3) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  Object.assign(state.character, { regionId, age: 30 });
  state.education.degrees.push({ type: 'bachelor', major: 'business', programId: 'bachelor' });
  return { engine, state };
}
const open = (state) => professionsFor(state).filter((p) => applicationEligibility(state, p.id).ok).length;

const tests = {
  'small places are rural; cities are not'() {
    assert.equal(remoteness(life('chicago').state), null);
    assert.equal(remoteness(life('asheville').state), 'town');
    assert.equal(remoteness(life('elko').state), 'remote');
    assert.equal(remoteness(life('longreach', 'AU').state), 'remote');
  },
  'fewer jobs the further out you live'() {
    for (const [cc, city, town, remote] of [['US', 'chicago', 'asheville', 'elko'], ['AU', 'sydney', 'dubbo', 'longreach']]) {
      const c = open(life(city, cc).state);
      const t = open(life(town, cc).state);
      const r = open(life(remote, cc).state);
      assert.ok(c > t && t > r, `${cc}: city ${c} > town ${t} > remote ${r}`);
    }
  },
  'staples always hire; city careers mean commuting or moving'() {
    const { state } = life('elko');
    for (const id of ['agriculture', 'nursing', 'education', 'retail', 'trucking']) assert.ok(ruralHiring(state, id).ok, id);
    assert.equal(ruralHiring(state, 'aviation').ok, false, 'no airline pilots in the outback');
    const town = life('asheville').state;
    const fin = ruralHiring(town, 'finance');
    assert.ok(fin.ok && fin.commute?.to, 'a small town commutes to the city for banking');
    assert.equal(fin.commute.regionId, nearestCity(town).id);
  },
  'commuting costs you every year, unless you work remotely'() {
    const { engine, state } = life('asheville');
    state.stats.health = 95;
    const id = professionsFor(state).find((p) => applicationEligibility(state, p.id).commute)?.id;
    assert.ok(id, 'a commutable job exists');
    state.prompts = [];
    engine.dispatch('career.apply', id);
    for (let g = 0; g < 10 && state.prompts.length; g++) { const p = state.prompts[0]; engine.resolvePrompt(p.id, (p.options.find((o) => /accept|yes|take/i.test(o.id)) ?? p.options.find((o) => !o.disabled)).id); }
    if (!state.career.job) return; // interview went badly: nothing to check
    assert.ok(commuteOf(state) > 0, 'the job is in the city');
    state.prompts = [];
    RuralLifeModule.onAgeUp(engine.context());
    assert.ok(state.finances.ledger.expenses.some((x) => /Commuting to/.test(x.reason)), 'commuting cost money');
    state.career.job.workMode = 'remote';
    assert.equal(commuteOf(state), 0, 'remote work ends the commute');
    assert.match(VIEWS.career(state, {}), /This Year at Work|Job Board/);
  },
  'hospitals are far away out here'() {
    assert.equal(ruralRisk(life('chicago').state), 0);
    assert.ok(ruralRisk(life('elko').state) > ruralRisk(life('asheville').state));
  },
  'the rural year has its moments, and the job board explains itself'() {
    const { engine, state } = life('stornoway', 'GB', 8);
    let moments = 0;
    for (let y = 0; y < 12; y++) {
      state.prompts = [];
      state.stats.health = 95;
      engine.ageUp();
      const p = state.prompts.find((x) => x.type === 'rural.moment');
      if (p) { moments += 1; engine.resolvePrompt(p.id, p.options[0].id); }
    }
    assert.ok(moments > 0, 'rural moments happen');
    state.career.job = null;
    assert.match(VIEWS.career(state, {}), /remote rural area: fewer employers/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 5).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} rural test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} rural tests passed`);
