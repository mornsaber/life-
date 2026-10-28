/**
 * Official residences, a sovereign's life (no army, no job, tutors), ministers, state visits
 * and diplomatic passports for life.
 *
 *   node tests/officialdom.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { housingStatus } from '../src/modules/realestate/HousingEngine.js';
import { officialResidence } from '../src/modules/world/Residences.js';
import { servicePassports } from '../src/modules/world/Passports.js';
import { enlist } from '../src/modules/military/MilitaryEngine.js';
import { invitations } from '../src/modules/politics/StateVisits.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(opts = {}, seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'GB', gender: 'female', ...opts });
  state.character.age = 30;
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
}

const tests = {
  'a reigning monarch lives at the palace, leaves the army, studies with tutors'() {
    const { engine, state, ctx } = life({ royalLevel: 'heir' });
    enlist(ctx, { branch: 'army', track: 'officer', component: 'active', specialty: 'infantry' });
    state.royal.reigning = true;
    assert.equal(housingStatus(state), 'official');
    assert.match(officialResidence(state).name, /Palace/);
    engine.ageUp();
    state.prompts = [];
    assert.equal(state.military.service, null, 'released from service');
    const school = VIEWS.school(state, {});
    assert.match(school, /Sovereign/);
    assert.doesNotMatch(school, /Apprenticeship|Early Decision|BS\/MD/);
    engine.dispatch('royalLife.tutor');
    assert.ok(state.yearly['royalLife.tutor']);
    assert.ok(servicePassports(state).some((p) => p.kind === 'diplomatic'));
  },
  'a prime minister lives at Number 10 and keeps a diplomatic passport for life'() {
    const { state } = life();
    state.politics.office = { id: 'gb_pm', approval: 55, termYearsLeft: 3, terms: 1, startAge: 50 };
    assert.match(officialResidence(state).name, /Downing Street/);
    state.politics.office = null;
    state.politics.history.push({ officeId: 'gb_pm', startAge: 50, endAge: 55 });
    assert.ok(servicePassports(state).some((p) => p.kind === 'diplomatic' && /for life/.test(p.why)));
    assert.equal(officialResidence(state), null);
  },
  'an MP whose party governs can become a minister; a foreign secretary makes visits'() {
    const { engine, state, ctx } = life({}, 7);
    state.politics.office = { id: 'gb_mp', approval: 55, termYearsLeft: 3, terms: 1, startAge: 40 };
    state.politics.ministry = { dept: 'foreign', title: 'Foreign Secretary', rank: 'cabinet', since: 30, residence: 'Chevening House' };
    assert.match(officialResidence(state).name, /Chevening/);
    const cc = invitations(state)[0];
    engine.dispatch('stateVisits.go', cc);
    assert.equal(state.diplomacy.visits.length, 1);
    assert.match(VIEWS.politics(state, {}), /Foreign Secretary/);
    engine.dispatch('ministers.resign');
    assert.equal(state.politics.ministry, null);
    assert.ok(servicePassports(state).some((p) => /foreign minister/.test(p.why)));
    void ctx;
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} officialdom test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} officialdom tests passed`);
