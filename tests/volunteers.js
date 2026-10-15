/**
 * Volunteer agencies as organizations, and the fixes around them: one pot of
 * money (funds = the equipment fund), grants through one round, mergers that
 * bring apparatus, standards that grow with the agency, officer seats that
 * scale, incorporation when the agency takes on payroll, units abroad under a
 * national or state service — plus honours that keep their country, national
 * agencies' full chain of command, and premium equipment that earns its price.
 *
 *   node tests/volunteers.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { contextOf, recordOf, needOf, countOf, GROUPS, upkeepDelta, readiness } from '../src/modules/equipment/Equipment.js';
import { growthCheck } from '../src/modules/org/VolunteerGrowth.js';
import { seatTargets } from '../src/modules/org/VolunteerOrgs.js';
import { arrive } from '../src/modules/world/Migration.js';
import { addHonor } from '../src/core/State.js';
import { medalCase } from '../src/ui/Components.js';
import { localizeHtml, COUNTRIES } from '../src/modules/world/Countries.js';
import { PROFESSION_LIST } from '../src/modules/career/JobTrees.js';
import { ladderFor } from '../src/modules/career/Ladder.js';
import { equipmentCard } from '../src/ui/views/EquipmentView.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function chief(countryId = 'US', seed = 3) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  state.character.age = 35;
  Object.assign(state.stats, { fitness: 80, smarts: 95, health: 90 });
  state.legal.record = [];
  state.prompts = [];
  engine.dispatch('emergency.join', 'fire');
  const m = state.emergency.fire;
  const org = state.orgs.byId[m.orgId];
  // Make the player the head of the unit.
  m.rankIndex = 6; m.xp = 2000; m.years = 12;
  for (const seats of Object.values(org.seats)) { const i = seats.indexOf('PLAYER'); if (i >= 0) seats[i] = null; }
  org.seats[6][0] = 'PLAYER';
  org.readiness = 90;
  const ctx = engine.context();
  const fresh = () => { state.yearly = {}; state.prompts = []; };
  const year = () => { state.prompts = []; assert.ok(engine.ageUp()); for (const seats of Object.values(org.seats)) { const i = seats.indexOf('PLAYER'); if (i >= 0) seats[i] = null; } org.seats[6][0] = 'PLAYER'; m.rankIndex = 6; };
  return { engine, state, ctx, m, org, fresh, year };
}
const logText = (state) => state.log.flatMap((y) => y.entries ?? []).map((e) => e.text).join('\n');
const engines = (state) => {
  const c = contextOf(state, 'vol.fire');
  const d = recordOf(state, c, { peek: true });
  return { have: countOf(GROUPS.volFire.categories.engine, d.units.engine), need: needOf(GROUPS.volFire.categories.engine, c), c, d };
};

const tests = {
  'the equipment fund is the agency\'s funds: money raised or granted can buy apparatus'() {
    const { state, org, engine, fresh } = chief();
    const c = contextOf(state, 'vol.fire');
    assert.equal(recordOf(state, c).budget, org.funds);
    org.funds += 100000;
    assert.equal(recordOf(state, c).budget, org.funds, 'one pot');
    fresh();
    engine.dispatch('deptEquip.buy', 'vol.fire|scba:scba');
    assert.equal(recordOf(state, c).budget, org.funds, 'spending comes out of the funds');
  },
  'one grant round a year, shared by the leader\'s grant and the equipment screen; a won grant buys equipment'() {
    const { state, org, engine, fresh } = chief('US', 5);
    let won = false;
    for (let t = 0; t < 12 && !won; t++) {
      fresh();
      const before = org.funds;
      engine.dispatch('emergency.grant', 'fire');
      won = org.funds > before;
      engine.dispatch('deptEquip.grant', 'vol.fire|engine:pumper'); // same round: refused
      assert.ok(state.yearly['equip.grant.vol.fire'] === 1, 'shared yearly round');
    }
    assert.ok(won, 'a grant came through');
    assert.match(logText(state), /Assistance to Firefighters Grant/);
  },
  'a merger brings the neighbour\'s apparatus, and the standard grows with stations and members'() {
    const { state, org, engine, fresh, year } = chief();
    year();
    const before = engines(state);
    const n = org.district.neighbors[0];
    Object.assign(n, { members: 4, readiness: 20, funds: 1000, stations: 2 });
    org.readiness = 95;
    for (let t = 0; t < 10 && org.district.neighbors.includes(n); t++) { fresh(); engine.dispatch('emergency.mergeAgency', `fire:${n.id}`); }
    assert.ok(!org.district.neighbors.includes(n), 'merged');
    const after = engines(state);
    assert.ok(after.need > before.need, `standard grew (${before.need} → ${after.need})`);
    assert.ok(after.have > before.have, `their engines came too (${before.have} → ${after.have})`);
    assert.match(logText(state), /apparatus and gear joined/);
  },
  'officer seats scale with the organization'() {
    const { org } = chief();
    const big = seatTargets('fire', { people: Object.fromEntries(Array.from({ length: 70 }, (_, i) => [i, {}])), district: { stations: 4 } });
    const tiny = seatTargets('fire', { people: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i, {}])), district: { stations: 1 } });
    assert.ok(big[4] > tiny[4] && big[5] >= 4, `big: ${JSON.stringify(big)}`);
    assert.equal(tiny[5], 0, 'a tiny unit has no captain');
    assert.equal(big[6], 1, 'one chief');
    assert.ok(org.seats[6].length === 1);
  },
  'hiring paid staff incorporates the agency: a board, staff on the roster, payroll with on-costs'() {
    const { state, org, engine, fresh, year } = chief();
    year();
    org.funds = 400000; org.readiness = 90;
    fresh();
    engine.dispatch('emergency.hireStaff', 'fire:ff');
    assert.ok(org.corp, 'incorporated');
    assert.match(org.corp.kind, /501\(c\)\(3\)/);
    assert.equal(org.corp.board.length, 5);
    const paid = org.district.paid[0];
    assert.ok(org.people[paid.personId]?.paid, 'a named staff member');
    const funds = org.funds;
    year();
    assert.ok(org.funds < funds, 'payroll paid');
  },
  'abroad a unit belongs to its national service: no contracts, appointed officers, issued equipment'() {
    const { state, org } = chief('NZ');
    assert.match(org.parent.name, /Fire and Emergency New Zealand/);
    const c = contextOf(state, 'vol.fire');
    assert.ok(c.issued, 'FENZ equips its brigades');
    org.district ??= { stations: 1, contracts: [], paid: [], neighbors: [] };
    assert.equal(growthCheck(state, org, 'contract', 'countyFire').ok, false);
    assert.equal(growthCheck(state, org, 'paidChief').ok, false);
    assert.match(equipmentCard(state, 'vol.fire'), /Fire and Emergency New Zealand/);
    const gb = chief('GB', 8);
    assert.ok(gb.org.parent, 'GB on-call firefighters belong to a fire and rescue service');
  },
  'honours keep the country that awarded them'() {
    const { state, ctx } = chief('GB');
    addHonor(state, { id: 'x', source: 'civil', name: 'Lasker Award', icon: '🏆', prestige: 1, citation: 'America\'s top prize in medical research.' });
    const h = state.honors.at(-1);
    assert.equal(h.country, 'GB');
    assert.equal(h.name, 'National Medical Research Prize');
    arrive(ctx, 'US', { visa: 'work' });
    const html = localizeHtml(medalCase(state.honors), COUNTRIES[state.character.countryId]);
    assert.match(html, /National Medical Research Prize/);
    assert.match(html, /🇬🇧/);
    const us = chief('US', 9);
    addHonor(us.state, { id: 'y', source: 'civil', name: 'Fire Department Medal of Valor', icon: '🔥', prestige: 1 });
    arrive(us.ctx, 'GB', { visa: 'work' });
    assert.match(localizeHtml(medalCase(us.state.honors), COUNTRIES.GB), /<span data-raw>Fire Department Medal of Valor<\/span>/, 'not relabelled after the move');
  },
  'a national agency\'s whole chain of command is on its ladder'() {
    for (const p of PROFESSION_LIST.filter((x) => x.sector === 'federal')) {
      for (const size of ['large', 'enterprise']) assert.equal(ladderFor(p, size).length, p.levels.length, `${p.id}@${size}`);
    }
  },
  'dearer equipment earns its price: capacity, running costs, quality'() {
    const { state } = chief();
    const c = { kind: 'job', ref: 'x', key: 'x', group: 'transit', size: 'medium', money: 'budget', manager: true };
    const cat = GROUPS.transit.categories.bus;
    const base = { group: 'transit', units: { bus: [{ model: 'diesel', age: 1 }] }, budget: 0, reserve: 0, pending: [] };
    const electric = { ...base, units: { bus: [{ model: 'electric', age: 1 }] } };
    assert.equal(upkeepDelta(c, base), 0);
    assert.ok(upkeepDelta(c, electric) < -20000, 'an electric bus saves on running costs');
    const vans = GROUPS.corrections.categories.vans;
    assert.equal(countOf(vans, [{ model: 'bus' }]), 4, 'a prison bus does the work of four vans');
    assert.ok(GROUPS.fire.categories.engine.models.quint.why && cat.models.electric.why, 'each premium says why');
    void readiness;
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} volunteer test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} volunteer tests passed`);
