/**
 * Leaving the Lords, ceremonial duties for honorary colonels and lieutenancies, political
 * ambassadors who serve past the career service's retirement age, and distinct ribbons.
 *
 *   node tests/ceremony.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store, addHonor } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { grantPeerage } from '../src/modules/world/Peerage.js';
import { peerChamber } from '../src/modules/politics/Legislature.js';
import { ribbonFor, insigniaKind } from '../src/ui/Components.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId = 'GB', seed = 5, age = 60) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  state.legal.record = [];
  state.character.age = age;
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
}

const tests = {
  'a life peer can take leave from the Lords, and retire from it for good'() {
    const { engine, state, ctx } = life();
    grantPeerage(ctx, { rank: 'baron', place: 'Ashby', kind: 'life', seat: true });
    assert.equal(peerChamber(state), 'upper_GB');
    engine.dispatch('peerage.leave');
    assert.equal(peerChamber(state), null, 'on leave');
    engine.dispatch('peerage.leave');
    assert.equal(peerChamber(state), 'upper_GB');
    engine.dispatch('peerage.retireLords');
    assert.equal(peerChamber(state), null);
    assert.ok(state.character.style.peerage, 'keeps the title');
    assert.match(VIEWS.politics(state, {}), /Retired from the House/);
  },
  'a donor ambassador appointed at 58 isn\'t forced into retirement at 65'() {
    const { engine, state, ctx } = life('US', 58, 58);
    const c = engine.rng.chance; engine.rng.chance = () => true;
    ctx.prompt({ type: 'appointees.ambassador', title: 'x', text: 'x', options: [{ id: 'accept', label: 'x' }], data: { to: 'FR', kind: 'donor' } });
    engine.resolvePrompt(state.prompts.at(-1).id, 'accept');
    engine.rng.chance = c;
    assert.ok(state.career.job?.political);
    for (let i = 0; i < 8; i++) { state.prompts = []; state.stats.health = 95; engine.ageUp(); }
    assert.equal(state.retirement.retired, false, 'not retired');
    assert.notEqual(state.career.history.at(-1)?.reason, 'Retired');
  },
  'an honorary colonel gets duties that move their standing with the regiment'() {
    const { engine, state } = life('GB', 6);
    addHonor(state, { id: 'honorary.0.60', source: 'honoraryRank', name: 'Honorary Colonel — the Rifles', icon: '🎖️', prestige: 12, precedence: 7, until: 65 });
    const mod = MODULES.find((m) => m.id === 'ceremonial');
    for (let i = 0; i < 6 && !state.prompts.some((p) => p.type === 'ceremonial.duty'); i++) mod.onAgeUp(engine.context());
    const q = state.prompts.find((p) => p.type === 'ceremonial.duty');
    assert.ok(q, 'a duty');
    const before = state.ceremonial['honorary.0.60'].standing;
    engine.resolvePrompt(q.id, q.options[0].id);
    assert.notEqual(state.ceremonial['honorary.0.60'].standing, before);
    assert.match(VIEWS.honors(state, {}), /Ceremonial Duties/);
  },
  'a Deputy Lieutenant has lieutenancy duties'() {
    const { engine, state } = life('GB', 7);
    state.politics.office = { id: 'gb_deputyLieutenant', startAge: 55, approval: 60, terms: 1 };
    const mod = MODULES.find((m) => m.id === 'ceremonial');
    for (let i = 0; i < 6 && !state.prompts.some((p) => p.type === 'ceremonial.duty'); i++) mod.onAgeUp(engine.context());
    assert.ok(state.prompts.some((p) => p.type === 'ceremonial.duty' && p.data.kind === 'lieutenancy'));
  },
  'awards without a ribbon of their own still get distinct ribbons and insignia shapes'() {
    const a = JSON.stringify(ribbonFor({ name: 'Coronation Medal' }));
    const b = JSON.stringify(ribbonFor({ name: 'United Nations Medal (UNIFIL)' }));
    assert.notEqual(a, b);
    assert.equal(a, JSON.stringify(ribbonFor({ name: 'Coronation Medal' })), 'stable');
    assert.equal(insigniaKind({ order: 'Order of the Bath', name: 'Companion of the Order of the Bath' }), 'order');
    assert.equal(insigniaKind({ sport: true, name: 'Olympic gold medal' }), 'gold');
    assert.equal(insigniaKind({ source: 'military', name: 'Military Cross' }), 'cross');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} ceremony test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} ceremony tests passed`);
