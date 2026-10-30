/**
 * The non-military uniformed services (USPHS, NOAA Corps) and their equivalents abroad,
 * transfers across the line, and reserve service outside the US.
 *
 *   node tests/uniformed.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { transferEligibility, transferBranch } from '../src/modules/military/Separation.js';
import { branchOf, branchFor, enlistmentEligibility, reserveName } from '../src/modules/military/MilitaryEngine.js';
import { annualReview } from '../src/modules/military/MedalEngine.js';
import { nationalBranchIds, armyReserveIsGuard } from '../src/modules/world/NationalForces.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId = 'US', age = 32) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(2), modules: MODULES });
  const state = engine.newLife({ countryId, gender: 'female' });
  state.character.age = age;
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
}
const serving = (state, svc) => {
  state.military.service = { component: 'active', grade: 2, yearsOfService: 6, yearsInGrade: 2, eval: 80, disciplinary: 0, contractYearsLeft: 1, deployments: 0, combatTours: 0, ...svc };
  return state.military.service;
};
const sure = (ctx) => { ctx.rng.chance = () => true; return ctx; };

const tests = {
  'officers cross between the armed forces and the PHS / NOAA Corps into a matching specialty'() {
    const a = life();
    serving(a.state, { branch: 'navy', track: 'officer', mos: 'navy.2100' });
    transferBranch(sure(a.ctx), 'usphs');
    assert.equal(a.state.military.service.branch, 'usphs');
    assert.equal(a.state.military.service.mos, 'usphs.MO');
    const b = life();
    serving(b.state, { branch: 'noaa', track: 'officer', mos: 'noaa.AVI' });
    transferBranch(sure(b.ctx), 'coastguard');
    assert.equal(b.state.military.service.mos, 'coastguard.AVI', 'a hurricane hunter becomes a Coast Guard aviator');
    const c = life();
    serving(c.state, { branch: 'army', track: 'officer', mos: 'army.11A' });
    assert.match(transferEligibility(c.state, 'usphs').reason, /health professionals/);
    serving(c.state, { branch: 'army', track: 'enlisted', mos: 'army.68W' });
    assert.match(transferEligibility(c.state, 'usphs').reason, /officers only/);
    serving(c.state, { branch: 'navy', track: 'officer', mos: 'navy.1110' });
    assert.match(transferEligibility(c.state, 'noaa').reason, /degree/);
    c.state.education.degrees.push({ type: 'bachelor', major: 'engineering', year: 2040 });
    assert.ok(transferEligibility(c.state, 'noaa').ok);
  },
  'abroad: health corps and ocean services where they exist, and transfers into them'() {
    assert.ok(nationalBranchIds('GB').includes('usphs') && nationalBranchIds('CA').includes('noaa') && nationalBranchIds('DE').includes('usphs'));
    assert.ok(!nationalBranchIds('NG').includes('noaa'));
    const ca = life('CA', 24);
    assert.equal(branchFor(ca.state, 'noaa').name, 'Canadian Coast Guard');
    assert.equal(branchFor(ca.state, 'usphs').name, 'Canadian Forces Health Services');
    const html = VIEWS.military(ca.state, {});
    assert.match(html, /Canadian Coast Guard/);
    assert.doesNotMatch(html, /GI Bill/);
    const de = life('DE');
    serving(de.state, { branch: 'army', track: 'officer', mos: 'army.62B', nation: 'DE' });
    transferBranch(sure(de.ctx), 'usphs');
    assert.equal(branchOf(de.state.military.service).name, 'Sanitätsdienst der Bundeswehr');
  },
  'reservists abroad: one Army Reserve, local reserve names, a real long-service medal and modest bonuses'() {
    assert.ok(armyReserveIsGuard('GB') && !armyReserveIsGuard('SE'));
    const gb = life('GB', 22);
    assert.match(enlistmentEligibility(gb.state, 'army', 'enlisted', 'reserve').reason ?? '', /Army Reserve/);
    assert.equal(reserveName(branchFor(gb.state, 'navy')), 'Royal Navy Reserve');
    const svc = serving(gb.state, { branch: 'navy', track: 'enlisted', component: 'reserve', nation: 'GB', yearsOfService: 3 });
    const medals = () => gb.state.honors.filter((h) => h.id === 'goodConduct').length;
    for (let y = 3; y <= 9; y++) { svc.yearsOfService = y; annualReview(gb.ctx, svc); }
    assert.equal(medals(), 0, 'no long-service medal before ten years in the reserve');
    svc.yearsOfService = 10;
    annualReview(gb.ctx, svc);
    assert.equal(medals(), 1);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} uniformed-service test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} uniformed-service tests passed`);
