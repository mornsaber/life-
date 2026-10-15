/**
 * Moving settles what you leave behind: volunteer units transfer (or end
 * where the service doesn't exist), local roles end, a congregation and a
 * school are new, and a move abroad ends memberships that only exist in the
 * country you left.
 *
 *   node tests/moving.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { arrive, routesTo } from '../src/modules/world/Migration.js';
import { residencyOf } from '../src/modules/world/Immigration.js';
import { changeRegion, REGIONS, regionsIn } from '../src/modules/life/Regions.js';
import { SERVICES } from '../src/modules/emergency/EmergencyEngine.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function adult(seed = 4, countryId) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife(countryId ? { countryId } : undefined);
  state.character.age = 30;
  Object.assign(state.stats, { fitness: 80, smarts: 70, health: 90 });
  state.legal.record = [];
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
}
const logText = (state) => state.log.flatMap((y) => y.entries ?? []).map((e) => e.text).join('\n');

const tests = {
  'a volunteer firefighter transfers to the local brigade abroad, losing an officer seat but not their training'() {
    const { engine, state, ctx } = adult();
    engine.dispatch('emergency.join', 'fire');
    const m = state.emergency.fire;
    assert.ok(m, 'joined');
    m.rankIndex = 5; // a captain
    m.xp = 900;
    arrive(ctx, 'GB', { visa: 'work' });
    assert.ok(state.emergency.fire, 'still a volunteer');
    assert.match(state.emergency.fire.unit, /On-Call \(Retained\) Fire Service — /);
    assert.ok(state.emergency.fire.rankIndex < 4, 'officer posts stay with the old unit');
    assert.equal(state.emergency.fire.xp, 900, 'experience kept');
    assert.equal(SERVICES.fire.ranks[state.emergency.fire.rankIndex].title.includes('Firefighter'), true, 'British ranks');
  },
  'a service that doesn\'t exist in the new country ends'() {
    const { engine, state, ctx } = adult(5);
    engine.dispatch('emergency.join', 'cap');
    assert.ok(state.emergency.cap, 'joined Civil Air Patrol');
    arrive(ctx, 'JP', { visa: 'work' });
    assert.equal(state.emergency.cap, null);
    assert.ok(state.emergency.history.some((h) => h.serviceId === 'cap'));
  },
  'a move across town in the same country transfers to the new town\'s unit'() {
    const { engine, state, ctx } = adult(6, 'AU');
    engine.dispatch('emergency.join', 'fire');
    const before = state.emergency.fire.unit;
    const next = regionsIn('AU').find((r) => r.id !== state.character.regionId);
    changeRegion(ctx, next.id, 'Test move.', { voluntary: true });
    assert.notEqual(state.emergency.fire.unit, before);
    assert.match(state.emergency.fire.unit, new RegExp(REGIONS[next.id].name.split(',')[0]));
  },
  'local roles end, the congregation is new, a child changes school'() {
    const { state, ctx } = adult(7);
    state.civic.pta = { years: 1 };
    state.civic.watch = { years: 2 };
    state.civic.neighbors = [{ name: 'Old Neighbor' }];
    state.community.faith = { ...(state.community.faith ?? {}), traditionId: state.community.faith?.traditionId ?? 'catholic', congregation: 'St Old Parish', role: 'Lay Leader' };
    arrive(ctx, 'CA', { visa: 'work' });
    assert.equal(state.civic.pta, null);
    assert.equal(state.civic.watch, null);
    assert.equal(state.civic.neighbors.length, 0);
    assert.notEqual(state.community.faith.congregation, 'St Old Parish');
    assert.equal(state.community.faith.role, null);
    const kid = adult(8);
    kid.state.character.age = 12;
    kid.state.k12 = { ...(kid.state.k12 ?? {}), type: 'charter' };
    const next = regionsIn('US').find((r) => r.id !== kid.state.character.regionId);
    changeRegion(kid.ctx, next.id, 'Family move.', { voluntary: true });
    assert.equal(kid.state.k12.type, 'public');
  },
  'moving abroad ends US-only service and lapses party membership'() {
    const { state, ctx } = adult(9);
    state.service.teams.fema = { rankIndex: 1, years: 2, deployments: 1, declined: 0 };
    state.civic.party = { bloc: 'labor', since: 25, role: 'member', canvassed: 0 };
    arrive(ctx, 'DE', { visa: 'work' });
    assert.equal(state.service.teams.fema, null);
    assert.equal(state.civic.party, null);
    assert.match(logText(state), /party membership/);
  },
  'free movement: the UK and Ireland, the EU, Australia and New Zealand'() {
    const gb = adult(10, 'GB');
    const route = routesTo(gb.state, 'IE');
    assert.equal(route[0].kind, 'freeMovement');
    assert.match(route[0].label, /Common Travel Area/);
    assert.ok(!routesTo(gb.state, 'FR').some((r) => r.kind === 'freeMovement'), 'Britain left the EU');
    gb.state.finances.cash = 50000;
    gb.engine.dispatch('migration.emigrate', 'IE:freeMovement');
    for (const p of [...gb.state.prompts]) if (p.type === 'migration.home') gb.engine.resolvePrompt(p.id, 'sell');
    assert.equal(gb.state.character.countryId, 'IE');
    assert.equal(residencyOf(gb.state).status, 'permanent');
    assert.equal(residencyOf(gb.state).visa, 'freeMovement');
    const es = adult(11, 'ES');
    assert.match(routesTo(es.state, 'DE')[0].label, /EU free movement/);
    const au = adult(12, 'AU');
    assert.match(routesTo(au.state, 'NZ')[0].label, /Trans-Tasman/);
    const us = adult(13);
    assert.ok(!routesTo(us.state, 'IE').some((r) => r.kind === 'freeMovement'));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} moving test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} moving tests passed`);
