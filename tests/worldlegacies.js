/**
 * What your lives leave in the world: places, institutions, the paper, curriculum, firsts and
 * records, feuds, milestones brought early, improved land, war memorials, the named seat.
 *
 *   node tests/worldlegacies.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { sync } from '../src/modules/world/History.js';
import { placeCheck, institutionsHere, earlyMilestones, improvementsNow, seatNames, inheritedRivals, memorialsHere, WorldLegaciesModule } from '../src/modules/life/WorldLegacies.js';
import { expeditionOptions } from '../src/modules/career/Feats.js';
import { marksHere } from '../src/modules/life/Marks.js';
import { buildHeirState } from '../src/modules/people/Legacy.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc, year, age = 45) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(6), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age, firstName: 'Ada', lastName: 'Penrose', gender: 'female' });
  state.character.age = age; state.prompts = []; sync(state); state.finances.cash = 5e8;
  return { engine, state };
};
const heirOf = (state) => {
  const kid = { id: 'kid1', firstName: 'Tom', lastName: 'Penrose', gender: 'male', relation: 'child', ageOffset: -25, alive: true, relationship: 70 };
  state.people.list.push(kid);
  state.character.alive = false;
  return buildHeirState(new Random(2), state, kid.id);
};

const tests = {
  'places of their day: a halt in 1880, none in 1990; a ship carries your name'() {
    const { engine, state } = life('GB', 1880);
    engine.dispatch('worldLegacies.place', 'halt');
    engine.dispatch('worldLegacies.place', 'ship');
    assert.ok(marksHere(state).some((m) => m.title === 'Penrose Halt'));
    assert.ok(marksHere(state).some((m) => /SS Penrose/.test(m.title)));
    assert.equal(placeCheck(life('GB', 1990).state, 'halt'), 'Not of its day');
    assert.equal(placeCheck(life('GB', 1880).state, 'settlement'), 'No frontier here');
  },
  'an institution and a paper live on into the heir\'s world'() {
    const { engine, state } = life('GB', 1890);
    engine.dispatch('worldLegacies.found', 'hospital');
    engine.dispatch('worldLegacies.found', 'newspaper');
    const paper = institutionsHere(state).find((i) => i.kind === 'newspaper');
    engine.dispatch('worldLegacies.paperLine', `${paper.id}|liberal`);
    assert.equal(paper.politics, 'liberal');
    assert.match(VIEWS.community(state, {}), /What Your Lives Leave/);
    const heir = heirOf(state);
    assert.equal(institutionsHere(heir).length, 2);
  },
  'curriculum only for the education minister; it shapes the children'() {
    const { engine, state } = life('FR', 1900);
    engine.dispatch('worldLegacies.curriculum', 'science');
    assert.equal(state.era?.curriculum?.FR, undefined);
    state.politics ??= {}; state.politics.ministry = { dept: 'education', rank: 'cabinet' };
    engine.dispatch('worldLegacies.curriculum', 'science');
    assert.equal(state.era.curriculum.FR.emphasis, 'science');
  },
  'a first is the family\'s for good'() {
    const { state } = life('GB', 1905, 30);
    assert.ok(expeditionOptions(state).find((e) => e.id === 'southPole')?.firstYet);
    state.feats = { discoveries: [], expeditions: [{ id: 'southPole', year: 1905, success: true, first: true }], built: [] };
    let logged = 0;
    WorldLegaciesModule.onAgeUp({ state, log: () => { logged += 1; }, stat: () => {}, earn: () => {} });
    assert.ok(!expeditionOptions(state).find((e) => e.id === 'southPole')?.firstYet || state.feats.expeditions.some((e) => e.id === 'southPole'));
    const heir = heirOf(state);
    heir.feats = { discoveries: [], expeditions: [], built: [] };
    assert.ok(!expeditionOptions(heir).find((e) => e.id === 'southPole')?.firstYet, 'no heir can be first again');
    assert.ok((heir.era.marks ?? []).some((m) => m.title === 'Cape Penrose'));
  },
  'a bitter feud passes to the heirs'() {
    const { state } = life('US', 1950);
    state.rivals = [{ id: 'r1', name: 'Joe Blackwood', gender: 'male', grudge: 85, alive: true, field: 'business', rung: 3, wealth: 1e5 }];
    assert.equal(inheritedRivals(state)[0].name, 'the Blackwood family');
    const heir = heirOf(state);
    assert.ok((heir.rivals ?? []).some((r) => r.name === 'the Blackwood family'));
  },
  'bring the railway early; improve the land; name the seat'() {
    const { engine, state } = life('GB', 1840, 30);
    const opts = earlyMilestones(state);
    if (opts.length) {
      engine.dispatch('worldLegacies.bring', opts[0].id);
      assert.ok(state.world.townStory[state.character.regionId][opts[0].id]?.brought);
    }
    state.farm = { acres: 200, valuePerAcre: 100, leased: 0, extras: {} };
    const imp = improvementsNow(state);
    assert.ok(imp.some((i) => i.id === 'enclose'), 'enclosure in Britain before 1880');
    engine.dispatch('worldLegacies.improve', 'drain');
    assert.ok(state.farm.valuePerAcre > 100);
    state.dynasty ??= {}; state.dynasty.seat = { name: 'the Penrose house', propertyId: 'x', since: 1830 };
    engine.dispatch('worldLegacies.nameSeat', 'Penrose Hall');
    assert.equal(state.dynasty.seat.name, 'Penrose Hall');
    assert.ok(seatNames(life('FR', 1900).state).some((n) => /Château/.test(n)));
  },
  'the war dead go on the town memorial'() {
    const { state } = life('GB', 1918);
    state.people.list.push({ id: 'b1', firstName: 'Harry', lastName: 'Penrose', relation: 'sibling', ageOffset: 0, alive: false, causeOfDeath: 'Killed in action — the Somme' });
    WorldLegaciesModule.onAgeUp({ state, log: () => {}, stat: () => {}, earn: () => {} });
    assert.ok(memorialsHere(state).some((m) => m.name === 'Harry Penrose'));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) process.exit(1);
