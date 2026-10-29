/**
 * A private police company: sworn officers on contract (campuses, hospitals, railroads,
 * gated communities, transit, a whole town's policing), where state law licenses them.
 *
 *   node tests/privatepolice.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { startEligibility, currentBusiness } from '../src/modules/business/Business.js';
import { offerEligibility, OPERATIONS } from '../src/modules/business/Operations.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function founder(cc = 'US') {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(9), modules: MODULES });
  const state = engine.newLife({ countryId: cc });
  state.character.age = 40;
  state.finances.cash = 3_000_000;
  state.credentials.held.post = { earnedAge: 22, renewedAge: 38, status: 'active' };
  state.career.history.push({ professionId: 'police', title: 'Police Sergeant', levelId: 'sergeant', employerName: 'City PD', sector: 'municipal', peakGrade: 5, startAge: 22, endAge: 39, reason: 'Left' });
  state.prompts = [];
  return { engine, state };
}

const tests = {
  'a veteran officer can found one where the state licenses private police'() {
    const { engine, state } = founder();
    assert.ok(startEligibility(state, 'privatePoliceAgency').ok, startEligibility(state, 'privatePoliceAgency').reason);
    engine.dispatch('business.start', 'privatePoliceAgency:cash:llc');
    const biz = currentBusiness(state);
    assert.ok(biz && biz.typeId === 'privatePoliceAgency');
    for (let i = 0; i < 3; i++) { state.prompts = []; engine.ageUp(); }
    const html = VIEWS.business(state, {});
    assert.ok(!/NaN|undefined/.test(html.replace(/<[^>]+>/g, ' ')));
  },
  'abroad (and where banned) there are no private police to found'() {
    const { state } = founder('GB');
    assert.ok(!startEligibility(state, 'privatePoliceAgency').ok);
  },
  'a town\'s whole police contract needs the state to allow contracting'() {
    const { engine, state } = founder();
    engine.dispatch('business.start', 'privatePoliceAgency:cash:llc');
    const biz = currentBusiness(state);
    const [client, units, rate, opts] = OPERATIONS.privatePoliceAgency.clients.find((c) => c[3]?.law);
    const offer = { id: 'k', client, units, rate, years: 3, minUnits: 0, minRep: 0, law: opts.law };
    assert.ok(!offerEligibility(state, biz, offer).ok, 'licensed only: no town contracts');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed++; console.log(`  ✘ ${name}\n    ${e.message}`); }
}
if (failed) { console.log(`✘ ${failed} private police test(s) failed`); process.exit(1); }
console.log(`✔ All ${Object.keys(tests).length} private police tests passed`);
