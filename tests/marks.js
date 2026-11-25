/**
 * Your mark on the world: gifts named after you change the town, honours come to the famous, and
 * the marks outlast you into your heir's world.
 *
 *   node tests/marks.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { sync } from '../src/modules/world/History.js';
import { giftCheck, marksHere, MarksModule } from '../src/modules/life/Marks.js';
import { cityOf } from '../src/modules/life/Cities.js';
import { buildHeirState } from '../src/modules/people/Legacy.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc, year, age = 45) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(6), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age, firstName: 'Ada', lastName: 'Penrose', gender: 'female' });
  state.character.age = age; state.prompts = []; sync(state); state.finances.cash = 5e7;
  return { engine, state };
};

const tests = {
  'a gift of its day, named after you, changes the town'() {
    const { engine, state } = life('GB', 1895);
    const mood = cityOf(state).mood ?? 50;
    engine.dispatch('marks.give', 'library');
    const m = marksHere(state)[0];
    assert.equal(m?.title, 'the Penrose Library');
    assert.ok((cityOf(state).mood ?? 50) > mood);
    assert.match(giftCheck(state, 'library'), /already/);
    assert.match(giftCheck(state, 'fountain') ?? 'ok', /ok|cash/, 'a fountain in 1895 is of its day');
    assert.match(VIEWS.community(state, {}), /Penrose Library/);
  },
  'gifts of their day: no drinking fountains in 2000, no museums before 1850'() {
    assert.equal(giftCheck(life('GB', 2000).state, 'fountain'), 'Not of its day');
    assert.equal(giftCheck(life('GB', 1845, 30).state, 'museum'), 'Not of its day');
  },
  'the famous are offered a street and a statue'() {
    const { engine, state } = life('GB', 1900, 60);
    engine.dispatch('marks.give', 'school');
    engine.dispatch('marks.give', 'park');
    MarksModule.resolvers.honour(engine.context(), { kind: 'street' }, 'accept');
    assert.ok(marksHere(state).some((m) => m.kind === 'street' && /Penrose Street/.test(m.title)));
  },
  'the marks outlast you: an heir finds the family library in the town'() {
    const { engine, state } = life('GB', 1895, 50);
    engine.dispatch('marks.give', 'library');
    const kid = state.people.list.find((p) => p.relation === 'child') ?? (() => { const p = { id: 'kid1', firstName: 'Tom', lastName: 'Penrose', gender: 'male', relation: 'child', ageOffset: -25, alive: true, relationship: 70 }; state.people.list.push(p); return p; })();
    state.character.alive = false;
    const heir = buildHeirState(new Random(2), state, kid.id);
    assert.ok(heir, 'an heir');
    assert.ok((heir.era?.marks ?? []).some((m) => m.title === 'the Penrose Library'));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) process.exit(1);
