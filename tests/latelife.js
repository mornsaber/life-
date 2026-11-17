/**
 * The last chapter (people/LateLife.js): grandchildren, and wills with wishes.
 *
 *   node tests/latelife.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { heirShares, willContested, applyWishes } from '../src/modules/people/Legacy.js';
import { grandchildrenOf, grandparentRights } from '../src/modules/people/LateLife.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
let nextId = 9000;
function life(countryId = 'US', seed = 3) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId, startYear: 1950 });
  state.world.seed = seed;
  state.character.age = 70;
  state.finances.cash = 500000;
  state.people.list = state.people.list.filter((p) => p.relation !== 'child');
  for (const name of ['Ann', 'Ben', 'Cal']) {
    state.people.list.push({ id: `p${nextId++}`, firstName: name, lastName: 'X', relation: 'child', gender: 'female', alive: true, relationship: 70, birthAge: 25, kids: [{ firstName: `${name}-kid`, gender: 'male', bornAge: 60 }] });
  }
  return { engine, state };
}
const kids = (state) => state.people.list.filter((p) => p.relation === 'child');

const tests = {
  'cutting a child out and favouring another change the shares, and the will is contested'() {
    const { engine, state } = life();
    engine.dispatch('people.writeWill', 'children');
    const [a, b, c] = kids(state);
    const even = heirShares(state);
    assert.ok(!willContested(state));
    engine.dispatch('lateLife.cutOut', a.id);
    engine.dispatch('lateLife.favour', b.id);
    const after = heirShares(state);
    const share = (sh, id) => sh.filter((s) => s.to === id).reduce((n, s) => n + s.share, 0);
    assert.equal(share(after, a.id), 0, 'cut out');
    assert.ok(share(after, b.id) > share(after, c.id), 'favoured gets more');
    assert.ok(Math.abs(after.reduce((n, s) => n + s.share, 0) - even.reduce((n, s) => n + s.share, 0)) < 1e-6, 'the whole estate still goes somewhere');
    assert.ok(willContested(state));
    assert.ok(a.relationship < 70, 'the cut child knows');
    engine.dispatch('lateLife.evenWill');
    assert.ok(!willContested(state));
  },
  'forced heirship still protects a cut-out child in France'() {
    const { engine, state } = life('FR');
    engine.dispatch('people.writeWill', 'children');
    const [a] = kids(state);
    engine.dispatch('lateLife.cutOut', a.id);
    assert.ok(heirShares(state).some((s) => s.to === a.id && s.share > 0), 'the réserve héréditaire');
  },
  'applyWishes leaves an even will alone'() {
    const shares = [{ to: 'x', share: 0.5 }, { to: 'y', share: 0.5 }];
    assert.equal(applyWishes({ people: {} }, shares), shares);
  },
  'grandparents see the grandchildren, the moments come, and the law decides rights'() {
    let seen = new Set();
    for (let seed = 1; seed < 40; seed++) {
      const { engine, state } = life('US', seed);
      assert.equal(grandchildrenOf(state).length, 3);
      for (let y = 0; y < 6; y++) { state.prompts = []; engine.ageUp(); for (const p of state.prompts) if (p.type.startsWith('lateLife.')) { seen.add(p.type); engine.resolvePrompt(p.id, p.options[0].id); } }
      assert.ok(!state.people.list.some((p) => p.kids?.some((k) => k.bond != null && (k.bond < 0 || k.bond > 100))));
    }
    assert.ok(seen.has('lateLife.childcare') || seen.has('lateLife.fees') || seen.has('lateLife.milestone'), `moments: ${[...seen]}`);
    assert.equal(grandparentRights({ character: { countryId: 'US', birthYear: 1890, age: 60 } }), false);
    assert.equal(grandparentRights({ character: { countryId: 'GB', birthYear: 1930, age: 65 } }), true);
  },
  'a child who falls out keeps the grandchildren away'() {
    for (let seed = 1; seed < 30; seed++) {
      const { engine, state } = life('US', seed);
      for (const k of kids(state)) k.relationship = 10;
      for (let y = 0; y < 5; y++) { state.prompts = []; engine.ageUp(); const p = state.prompts.find((q) => q.type === 'lateLife.barred'); if (p) { assert.ok(p.options.some((o) => o.id === 'court')); return; } }
    }
    assert.fail('never kept away');
  },
  'the People view shows grandchildren and wishes'() {
    const { engine, state } = life();
    engine.dispatch('people.writeWill', 'children');
    state.prompts = [];
    const html = VIEWS.people(state);
    assert.match(html, /Grandchildren/);
    assert.match(html, /Your wishes/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
