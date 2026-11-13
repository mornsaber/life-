/**
 * The line of succession (world/RoyalLine.js): read from the royal family by each crown's law,
 * moving only when the family does — births, deaths, renunciations, marrying out.
 *
 *   node tests/royalline.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { lawFor, lineOf, placeOf, refreshLine, lineView } from '../src/modules/world/RoyalLine.js';
import { currentYear } from '../src/core/State.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const royal = (cc, royalLevel, gender, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, royalLevel, gender });
  return { engine, state };
};
const node = (state, o) => { const t = state.royal.tree; const id = `t${Object.keys(t.nodes).length}`; t.nodes[id] = { id, died: null, ...o }; return t.nodes[id]; };

const tests = {
  'the laws: equal primogeniture by its date, male preference, the male line'() {
    assert.equal(lawFor('GB', 2015, 2026), 'absolute');
    assert.equal(lawFor('GB', 2000, 2026), 'malePreference', 'born before 2011');
    assert.equal(lawFor('SE', 1960, 1975), 'malePreference');
    assert.equal(lawFor('SE', 1960, 1985), 'absolute');
    assert.equal(lawFor('ES', 2010, 2026), 'malePreference');
    assert.equal(lawFor('JP', 2010, 2026), 'agnatic');
  },
  'a child of the monarch stands behind the heir, a real brother or sister'() {
    const { state } = royal('GB', 'child', 'male');
    const order = lineOf(state);
    assert.ok(order.length >= 2);
    assert.ok(placeOf(state) >= 2 && placeOf(state) <= 5, `${placeOf(state)}`);
    assert.ok(order[0].personId, 'the heir is a person in your life');
    assert.equal(state.world.crowns.GB.heir.personId, order[0].personId);
  },
  'births ahead of you push you down; deaths bring you up'() {
    const { state } = royal('GB', 'child', 'male', 3);
    const heirNode = lineOf(state)[0];
    node(state, { name: 'Baby', gender: 'female', born: currentYear(state), parent: heirNode.id });
    refreshLine(state);
    assert.equal(state.royal.line, 3, 'the heir\'s child comes before you');
    const person = state.people.list.find((p) => p.id === heirNode.personId);
    person.alive = false;
    heirNode.died = currentYear(state);
    refreshLine(state);
    assert.equal(state.royal.line, 2, 'the heir\'s daughter now leads; you are next');
  },
  'the male line only: no daughters, and none of their children'() {
    const { state } = royal('JP', 'child', 'male', 4);
    for (const n of lineOf(state)) assert.equal(n.gender, 'male');
    const sister = node(state, { name: 'Kiyoko', gender: 'female', born: currentYear(state) - 30, parent: state.royal.tree.monarchId });
    node(state, { name: 'Son of a princess', gender: 'male', born: currentYear(state), parent: sister.id });
    refreshLine(state);
    assert.ok(!lineOf(state).some((n) => n.name === 'Son of a princess'));
  },
  'male preference: a younger brother outranks an older sister'() {
    const { state } = royal('ES', 'grandchild', 'female', 5);
    const t = state.royal.tree;
    const parent = node(state, { name: 'Prince', gender: 'male', born: currentYear(state) - 40, parent: t.monarchId });
    const sis = node(state, { name: 'Elder sister', gender: 'female', born: currentYear(state) - 12, parent: parent.id });
    const bro = node(state, { name: 'Younger brother', gender: 'male', born: currentYear(state) - 8, parent: parent.id });
    const order = lineOf(state);
    assert.ok(order.indexOf(bro) < order.indexOf(sis));
  },
  'renouncing takes your descendants out of the line too'() {
    const { state } = royal('GB', 'grandchild', 'male', 6);
    node(state, { name: 'Your son', gender: 'male', born: currentYear(state), parent: 'you' });
    refreshLine(state);
    assert.ok(state.royal.line);
    state.royal.tree.nodes.you.out = 'renounced';
    refreshLine(state);
    assert.equal(state.royal.line, null);
    assert.ok(!lineOf(state).some((n) => n.name === 'Your son'));
  },
  'a distant royal is far down, past the rest of the family'() {
    const { state } = royal('SE', 'distant', 'female', 7);
    assert.ok(state.royal.line >= 15, `${state.royal.line}`);
    assert.ok(lineOf(state).some((x) => x.block), 'the far reaches as one entry');
    assert.ok(lineView(state, 6).some((x) => x.node.you), 'and you');
  },
  'over a life, the line moves only with the family'() {
    const { engine, state } = royal('NL', 'grandchild', 'male', 8);
    let moves = 0;
    let last = state.royal.line;
    for (let i = 0; i < 40 && state.character.alive && !state.royal?.reigning; i++) {
      state.prompts = [];
      state.stats.health = 90;
      engine.ageUp();
      if (state.royal && state.royal.line !== last) { moves++; last = state.royal.line; }
      if (state.royal) assert.equal(state.royal.line, placeOf(state), 'the line is the family');
    }
    assert.ok(moves >= 1);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
