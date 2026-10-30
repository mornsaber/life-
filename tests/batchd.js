/**
 * Recovery from addiction, immigrant families, neighbourhoods, cancellation and comebacks,
 * family courts, and climate migration.
 *
 *   node tests/batchd.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { makePerson } from '../src/modules/people/PeopleEngine.js';
import { recoveryTick } from '../src/modules/health/Recovery.js';
import { heritageOf, immigrantFamilyTick } from '../src/modules/people/ImmigrantFamily.js';
import { neighbourhoodTick, neighbourhoodOf } from '../src/modules/life/Neighbourhood.js';
import { celebrityTick } from '../src/modules/life/Celebrity.js';
import { climateTick } from '../src/modules/life/ClimateMigration.js';
import { stateIdOf } from '../src/modules/life/Regions.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(seed = 3, age = 35, countryId = 'US') {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  state.character.age = age;
  state.prompts = [];
  state.finances.cash = 200000;
  return { engine, state, ctx: engine.context() };
}
const home = (state) => { const p = { id: 'home', type: 'starter', typeName: 'Starter Home', regionId: state.character.regionId, value: 400000, valueAdj: 1, purchasePrice: 300000, purchaseAge: 30, condition: 80, use: 'primary', mortgage: null, heloc: null, tenants: [], insured: true }; state.housing.properties.push(p); return p; };
const take = (engine, state, type, opt) => { const p = state.prompts.find((x) => x.type === type); assert.ok(p, `prompt ${type} (have ${state.prompts.map((x) => x.type).join(', ')})`); engine.resolvePrompt(p.id, opt ?? p.options[0].id); return p; };
const logText = (state) => state.log.flatMap((y) => y.entries).map((e) => e.text).join('\n');

const tests = {
  'recovery: the path after rehab, milestones, and relapse resetting the clock'() {
    const { engine, state, ctx } = life();
    state.health.conditions.push({ id: 'alcohol', severity: 10, remission: true, diagnosed: true });
    recoveryTick(ctx);
    take(engine, state, 'health.recoveryPath', 'sponsor');
    let relapsed = false;
    for (let y = 0; y < 12; y++) { state.character.age += 1; state.prompts = []; recoveryTick(ctx); if (!state.health.conditions[state.health.conditions.length - 1].remission) { relapsed = true; break; } }
    assert.ok(relapsed || /One year clean/.test(logText(state)));
  },
  'an immigrant family: the other country, language and visits'() {
    const { engine, state, ctx } = life(4, 30, 'GB');
    state.migration = { birthCountry: 'IN', residences: {}, languages: {}, history: [] };
    assert.equal(heritageOf(state).cc, 'IN');
    let seen = 0;
    for (let y = 0; y < 20; y++) { state.character.age += 1; state.prompts = []; immigrantFamilyTick(ctx); const p = state.prompts.find((x) => x.type === 'immigrantFamily.event'); if (p) { seen += 1; engine.resolvePrompt(p.id, p.options[0].id); } }
    assert.ok(seen >= 2);
  },
  'the neighbourhood drifts, and the residents\' association has a voice'() {
    const { engine, state, ctx } = life(5);
    home(state);
    let events = 0;
    for (let y = 0; y < 25; y++) { state.character.age += 1; state.prompts = []; neighbourhoodTick(ctx); const p = state.prompts.find((x) => x.type === 'neighbourhood.event'); if (p) { events += 1; engine.resolvePrompt(p.id, p.options[0].id); } }
    assert.ok(events >= 3);
    assert.ok(Number.isFinite(neighbourhoodOf(state).trend));
  },
  'cancelled after a big scandal, and a comeback'() {
    const { engine, state, ctx } = life(6);
    state.fame.buzz = 100;
    state.fame.score = 80;
    for (let i = 0; i < 10 && !state.fame.cancelled; i++) { ctx.emit('fame:afterScandal', { severity: 12, headline: 'a leaked video' }); state.character.age += 1; }
    assert.ok(state.fame.cancelled, 'cancelled');
    clean(VIEWS.activities(state, {}));
    ctx.rng.chance = () => true;
    state.character.age += 2;
    celebrityTick(ctx);
    take(engine, state, 'celebrity.comeback', 'project');
    assert.equal(state.fame.cancelled, null);
  },
  'family courts: a custody petition, a contested will and an adoption home study'() {
    const { engine, state, ctx } = life(7, 40);
    const kid = makePerson(ctx, { relation: 'child', age: 8, relationship: 80, custody: 'ex' });
    state.people.list.push(kid);
    assert.match(VIEWS.people(state, {}), /Petition for custody/);
    engine.dispatch('familyCourt.petition', kid.id);
    ctx.rng.chance = () => true;
    take(engine, state, 'familyCourt.custody', 'court');
    assert.equal(kid.custody, 'joint');
    const sib = makePerson(ctx, { relation: 'sibling', age: 42, relationship: 20 });
    state.people.list.push(sib);
    for (let i = 0; i < 20 && !state.prompts.some((p) => p.type === 'familyCourt.will'); i++) { ctx.emit('people:estateShare', { share: 100000 }); state.character.age += 1; }
    take(engine, state, 'familyCourt.will', 'settle');
    state.people.expecting = { since: state.character.age, adopted: true, due: state.character.age + 1 };
    const fc = MODULES.find((m) => m.id === 'familyCourt');
    fc.onAgeUp(ctx);
    take(engine, state, 'familyCourt.homeStudy', 'prepare');
    assert.equal(state.people.expecting.homeStudy, 'approved');
  },
  'climate migration: repeated disasters, sagging prices, and a buyout'() {
    const { engine, state, ctx } = life(8, 45);
    const h = home(state);
    const st = stateIdOf(state);
    ctx.emit('disaster:struck', { disaster: { type: 'flood', severity: 2, stateId: st, name: 'Flood 1' } });
    state.prompts = [];
    state.character.age += 3;
    ctx.emit('disaster:struck', { disaster: { type: 'flood', severity: 3, stateId: st, name: 'Flood 2' } });
    state.prompts = [];
    climateTick(ctx);
    const value = h.value;
    take(engine, state, 'climateMigration.decide', 'buyout');
    assert.ok(!state.housing.properties.includes(h), 'sold to the buyout');
    assert.ok(value > 0);
  },
};
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} batch-D tests passed`);
