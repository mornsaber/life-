/**
 * Public bodies and their units, job searches across cities, volunteer officer
 * appointments and headquarters, specialist equipment calls, and where career
 * fire and ambulance services exist.
 *
 *   node tests/govstructure.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire, applicationEligibility } from '../src/modules/career/CareerEngine.js';
import { createEmployer, careerServiceHere } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { orgOf } from '../src/modules/org/Organizations.js';
import { searchOffers } from '../src/modules/career/JobMarket.js';
import { officers } from '../src/modules/org/VolunteerOrgs.js';
import { neighbourRange } from '../src/modules/org/VolunteerGrowth.js';
import { SERVICES } from '../src/modules/emergency/EmergencyEngine.js';
import { SpecialistCallsModule } from '../src/modules/equipment/SpecialistCalls.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId = 'US', seed = 5, regionId = null) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife(countryId === 'US' ? {} : { countryId });
  if (regionId) state.character.regionId = regionId;
  state.character.age = 30;
  Object.assign(state.stats, { smarts: 85, health: 95, fitness: 80 });
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
}
const employer = (state, professionId, regionId = state.character.regionId, seed = 3) => createEmployer(new Random(seed), state, getProfession(professionId), regionId);

const tests = {
  'an office of a national or provincial body is a unit of it, not an organization of its own'() {
    const nz = life('NZ', 5, 'christchurch');
    const courts = employer(nz.state, 'courts');
    assert.equal(courts.orgName, 'Courts Service');
    assert.match(courts.division, /Christchurch/);
    assert.ok(orgOf(nz.state, courts).national);
    // Every office of the national probation service shares one organization.
    const a = employer(nz.state, 'probation', 'christchurch');
    const b = employer(nz.state, 'probation', 'auckland');
    assert.equal(a.orgId, b.orgId);
    // In a federal country it's the province's: DPCP — Quebec, with Montreal as the office.
    const ca = life('CA', 5, 'montreal');
    const dpcp = employer(ca.state, 'prosecution');
    assert.equal(dpcp.orgName, 'DPCP — Quebec');
    assert.match(dpcp.division, /Montreal/);
    // A national police force's regions are units of it.
    const nl = life('NL', 5, 'amsterdam');
    const pol = employer(nl.state, 'statePolice');
    assert.equal(pol.orgName, 'Nationale Politie');
  },

  'big public bodies are staffed for the area they cover'() {
    const gb = life('GB', 5, 'birmingham');
    const wmp = employer(gb.state, 'police');
    assert.ok(['large', 'enterprise', 'mega'].includes(wmp.size), `West Midlands Police is ${wmp.size}`);
    const au = life('AU', 5, 'sydney');
    const nsw = employer(au.state, 'statePolice');
    assert.ok(orgOf(au.state, nsw).departments.operations.headcount > 10000, 'NSW Police covers the state');
  },

  'with one police department in town, a job search looks in other cities'() {
    const { engine, state, ctx } = life('US', 7, 'midcity');
    hire(ctx, { professionId: 'police', levelId: 'officer', employer: employer(state, 'police') });
    state.career.job.performance = 95;
    const offers = searchOffers(engine.context(), 3, 1);
    assert.ok(offers.length >= 2);
    const orgs = new Set(offers.map((o) => o.employer.orgId));
    assert.equal(orgs.size, offers.length, 'no duplicate employers');
    assert.ok(!orgs.has(state.career.job.employer.orgId), 'not your own department');
    assert.ok(offers.every((o) => o.regionId && o.regionId !== 'midcity'), 'in other cities');
  },

  'volunteer officer seats are filled by the members, not left vacant'() {
    const { engine, state } = life('AU', 8, 'brisbane');
    state.character.age = 22;
    engine.dispatch('emergency.join', 'sar');
    for (let y = 0; y < 12; y++) { state.prompts = []; state.stats.health = 95; engine.ageUp(); }
    const m = state.emergency.sar;
    const org = state.orgs.byId[m.orgId];
    const seats = officers(org, SERVICES.sar.ranks);
    const vacant = seats.filter((o) => !o.person).length;
    assert.ok(vacant <= 1, `${vacant} vacant of ${seats.length}`);
    // The unit belongs to a service with a real headquarters.
    const hq = state.orgs.byId[org.hqId];
    assert.ok(hq, 'headquarters');
    assert.match(hq.name, /SES/);
    assert.ok(hq.head && hq.people[hq.head]);
    const before = JSON.stringify(state);
    assert.match(VIEWS.emergency(state, {}), /headquarters/);
    assert.equal(JSON.stringify(state), before, 'rendering does not change state');
  },

  'the countryside has many volunteer agencies; a big city few'() {
    assert.ok(neighbourRange('rural')[0] > neighbourRange('nyc')[1]);
  },

  'small towns have no career fire department; volunteers cover them'() {
    const { state } = life('US', 3, 'rural');
    assert.equal(careerServiceHere('rural', 'fire'), false);
    const check = applicationEligibility(state, 'fire');
    assert.equal(check.ok, false);
    assert.match(check.reason, /volunteers/);
    assert.ok(careerServiceHere('chicago', 'fire'));
  },

  'specialist kit decides how specialist calls go'() {
    let served = 0;
    let missed = 0;
    for (let i = 0; i < 30; i++) {
      const { engine, state, ctx } = life('US', 40 + i, 'chicago');
      hire(ctx, { professionId: 'police', levelId: 'officer', employer: employer(state, 'police') });
      SpecialistCallsModule.onAgeUp(engine.context());
      const calls = state.deptEquip?.[state.career.job.employer.id]?.calls ?? {};
      for (const c of Object.values(calls)) { served += c.served; missed += c.missed; }
    }
    assert.ok(served + missed >= 5, 'calls happen');
    assert.ok(served > 0, 'a seeded fleet handles some');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} government-structure test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} government-structure tests passed`);
