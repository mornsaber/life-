/**
 * The family as the thing you play (people/FamilyLegacy.js): prestige across generations,
 * heirlooms that pass down, the family seat, arranged matches.
 *
 *   node tests/dynasty.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store, addHonor } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { settleEstate, buildHeirState } from '../src/modules/people/index.js';
import { makePerson } from '../src/modules/people/PeopleEngine.js';
import { FamilyLegacyModule, familyPrestige, heirloomsFrom, prestigeTier } from '../src/modules/people/FamilyLegacy.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(opts = {}, seed = 3) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US', gender: 'male', ...opts });
  return { engine, state, ctx: engine.context() };
}
function withChild(ctx, state, age = 30) {
  const kid = makePerson(ctx, { relation: 'child', gender: 'female', age, lastName: state.character.lastName });
  state.people.list.push(kid);
  return kid;
}

const tests = {
  'what someone leaves: their medal, their ring, a keepsake'() {
    const { ctx, state } = life();
    state.character.age = 80;
    addHonor(state, { id: 'x', source: 'civil', name: 'Medal of Valor', icon: '🎖️', prestige: 5, precedence: 50, citation: 'For gallantry at the river crossing.' });
    state.people.marriages = 1;
    const looms = heirloomsFrom(state);
    assert.ok(looms.some((h) => /Medal of Valor/.test(h.name)));
    assert.ok(looms.some((h) => /wedding ring/.test(h.name)));
    assert.ok(looms.length >= 3);
    for (const h of looms) assert.ok(h.id && h.icon && h.story && h.since);
  },
  'heirlooms pass down, and the seat can be kept'() {
    const { ctx, state, engine } = life();
    state.character.age = 70;
    const kid = withChild(ctx, state, 40);
    state.dynasty.heirlooms = [{ id: 'old1', name: 'great-grandfather\'s pocket watch', icon: '⌚', story: 'that stopped', value: 400, since: 1950 }];
    state.housing.properties.push({ id: 'home1', typeName: 'House', value: 350000, use: 'primary', regionId: state.character.regionId, purchaseAge: 40, mortgage: null });
    state.dynasty.seat = { name: 'the Test house', propertyId: 'home1', since: 2040 };
    state.character.alive = false;
    settleEstate(state);
    const s = buildHeirState(engine.rng, state, kid.id);
    assert.ok(s.dynasty.heirlooms.some((h) => h.id === 'old1'), 'the old watch came down');
    assert.ok(s.dynasty.heirlooms.length >= 2, 'and something of the parent');
    assert.equal(s.dynasty.seatOffer?.value, 350000);
    // The heir keeps it.
    const e2 = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES });
    e2.store.state = s;
    e2.hydrate(s);
    s.finances.cash = 400000;
    const c2 = e2.context();
    FamilyLegacyModule.resolvers.seat(c2, {}, 'keep');
    assert.ok(s.housing.properties.some((p) => p.use === 'primary' && p.value === 350000), 'moved into the seat');
    assert.equal(s.dynasty.seat.name, 'the Test house');
  },
  'prestige builds generation by generation'() {
    const { state } = life();
    const base = familyPrestige(state);
    state.lineage = { generation: 4, founderYear: 1950, ancestors: [1, 2, 3].map((g) => ({ name: 'A', generation: g, honours: ['Order of Merit', 'Medal'], netWorth: 25_000_000, businesses: ['Acme'], styled: g === 1 ? 'Sir A' : null })) };
    const great = familyPrestige(state);
    assert.ok(great > base + 30, `${base} → ${great}`);
    assert.equal(prestigeTier(great)[1], 'a great dynasty');
    assert.match(VIEWS.people(state, {}), /Family Legacy/);
  },
  'titled families arrange matches'() {
    const { state, ctx, engine } = life();
    state.character.age = 24;
    state.noble = { rank: 'earl', place: 'Testshire' };
    state.prompts = [];
    for (let i = 0; i < 25 && !state.prompts.some((p) => p.type === 'familyLegacy.match'); i++) { state.dynasty.matchAsked = null; state.character.age = 20 + (i % 10); FamilyLegacyModule.onAgeUp(ctx); }
    const p = state.prompts.find((q) => q.type === 'familyLegacy.match');
    assert.ok(p, 'a match');
    engine.resolvePrompt(p.id, 'accept');
    const spouse = state.people.list.find((x) => x.relation === 'spouse');
    assert.ok(spouse?.arranged, 'married by arrangement');
    // An ordinary American today doesn't get matches.
    const plain = life({}, 9);
    plain.state.character.age = 24;
    for (let i = 0; i < 20; i++) { plain.state.dynasty.matchAsked = null; FamilyLegacyModule.onAgeUp(plain.ctx); }
    assert.ok(!plain.state.prompts.some((q) => q.type === 'familyLegacy.match'));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} dynasty test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} dynasty tests passed`);
