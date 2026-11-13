/**
 * The sovereign by kind of monarchy (world/Throne.js): executive powers in the Gulf, the
 * Malaysian rotation, Cambodia's throne council.
 *
 *   node tests/throne.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { currentYear } from '../src/core/State.js';
import { throneKind, crownPrinceChoices, MY_STATES } from '../src/modules/world/Throne.js';
import { lineOf } from '../src/modules/world/RoyalLine.js';
import { demise, monarchName } from '../src/modules/world/Crown.js';
import { courtView } from '../src/ui/views/CrownCard.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const royal = (cc, level, gender = 'male', seed = 1, age = 0) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, royalLevel: level, gender });
  for (let i = 0; i < age && state.character.alive; i++) { state.prompts = []; state.stats.health = 95; engine.ageUp(); }
  state.prompts = [];
  return { engine, state };
};
const crownNow = (engine, state) => {
  const ctx = engine.context();
  if (!state.royal.reigning) demise(ctx, state.royal.crownId, 'died');
  state.prompts = [];
  return ctx;
};

const tests = {
  'kinds: constitutional, executive, elective'() {
    assert.equal(throneKind(royal('GB', 'child').state), 'constitutional');
    assert.equal(throneKind(royal('SA', 'child').state), 'executive');
    assert.equal(throneKind(royal('MY', 'child').state), 'elective');
    assert.equal(throneKind(royal('KH', 'child').state), 'elective');
  },
  'an executive monarch appoints the government and sets the budget'() {
    const { engine, state } = royal('SA', 'heir', 'male', 2, 30);
    crownNow(engine, state);
    assert.ok(state.royal.reigning);
    engine.dispatch('throne.appoint', 'reformer');
    assert.equal(state.royal.government.kind, 'reformer');
    engine.dispatch('throne.budget', 'austere');
    assert.equal(state.royal.budget, 'austere');
    assert.match(courtView(state), /You Rule/);
  },
  'an executive monarch names the crown prince, over the eldest if they like'() {
    const { engine, state } = royal('SA', 'heir', 'male', 3, 50);
    crownNow(engine, state);
    const t = state.royal.tree;
    const y = currentYear(state);
    // Two sons, of age.
    t.nodes.s1 = { id: 's1', name: 'Elder', gender: 'male', born: y - 28, parent: 'you', died: null };
    t.nodes.s2 = { id: 's2', name: 'Younger', gender: 'male', born: y - 24, parent: 'you', died: null };
    const choices = crownPrinceChoices(state);
    assert.ok(choices.some((n) => n.id === 's2'));
    engine.dispatch('throne.nameHeir', 's2');
    assert.equal(lineOf(state)[0].id, 's2', 'the named prince leads the line');
    assert.equal(state.world.crowns.SA.heir.name, 'Younger');
  },
  'Malaysia: the rulers rotate the kingship; your turn comes, and you may accept'() {
    const { engine, state } = royal('MY', 'heir', 'male', 4, 30);
    crownNow(engine, state);
    const c = state.world.crowns.MY;
    assert.ok(/of /.test(monarchName(state, 'MY')), monarchName(state, 'MY'));
    const before = MY_STATES[(MY_STATES.indexOf(c.house) + MY_STATES.length - 1) % MY_STATES.length];
    c.agong = { state: before, since: currentYear(state) - 4 };
    let q = null;
    for (let i = 0; i < 2 && !q; i++) { state.prompts = []; state.stats.health = 95; engine.ageUp(); q = state.prompts.find((p) => p.type === 'throne.conference'); }
    assert.ok(q, 'the Conference of Rulers asks');
    engine.resolvePrompt(q.id, 'accept');
    assert.ok(state.royal.agong);
    assert.match(monarchName(state, 'MY'), /Yang di-Pertuan Agong/);
    for (let i = 0; i < 6; i++) { state.prompts = []; state.stats.health = 95; engine.ageUp(); }
    assert.ok(!state.royal.agong, 'five years, then home');
  },
  'Cambodia: the throne council may choose you, or pass you over'() {
    let chosen = 0; let passed = 0;
    for (let s = 1; s <= 12; s++) {
      const { engine, state } = royal('KH', 'heir', 'male', s, 35);
      if (state.royal.line !== 1) continue;
      demise(engine.context(), 'KH', 'died');
      if (state.royal.reigning) chosen++; else passed++;
    }
    assert.ok(chosen >= 1, `chosen ${chosen}`);
    assert.ok(passed >= 1, `passed over ${passed}`);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 5).join('\n  ')}`); }
}
if (failed) process.exit(1);
