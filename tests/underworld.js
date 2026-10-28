/**
 * Organised crime: outfits by country, joining, rackets and tribute, skimming, crews, laundering,
 * wars, the task force and witness protection, running the outfit, walking away.
 *
 *   node tests/underworld.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { outfitsHere, meOf, OUTFIT_TYPES } from '../src/modules/legal/Underworld.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function hood(countryId = 'US', seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  state.legal.record = [];
  state.character.age = 22;
  state.prompts = [];
  state.legal.crime = { heat: 10, skill: { pettyTheft: 3 }, earned: 2000, layingLow: false };
  outfitsHere(state, engine.rng);
  return { engine, state, ctx: engine.context() };
}
const always = (engine, fn) => { const c = engine.rng.chance; engine.rng.chance = () => true; try { return fn(); } finally { engine.rng.chance = c; } };
const never = (engine, fn) => { const c = engine.rng.chance; engine.rng.chance = () => false; try { return fn(); } finally { engine.rng.chance = c; } };
const join = (engine, state) => { const o = outfitsHere(state)[0]; always(engine, () => engine.dispatch('underworld.approach', o.id)); return o; };
const mod = MODULES.find((m) => m.id === 'underworld');

const tests = {
  'every country gets its own kind of underworld'() {
    for (const [cc, type] of [['JP', 'yakuza'], ['IT', 'clan'], ['GB', 'firm'], ['MX', 'cartel'], ['RU', 'bratva']]) {
      const { state } = hood(cc, 3);
      assert.ok(outfitsHere(state).some((o) => o.type === type), `${cc} has a ${type}`);
      assert.equal(outfitsHere(state).reduce((s, o) => s + o.territory, 0), 100);
    }
  },
  'a nobody with no name on the street can\'t get in; someone with a record can'() {
    const { engine, state } = hood('US', 4);
    state.legal.crime = null;
    const o = outfitsHere(state)[0];
    engine.dispatch('underworld.approach', o.id);
    assert.equal(meOf(state), null);
    state.legal.crime = { heat: 0, skill: { burglary: 2 }, earned: 0 };
    join(engine, state);
    assert.equal(meOf(state).rank, 0);
    assert.match(VIEWS.activities(state, {}), /The Underworld/);
  },
  'members run rackets, kick up tribute, and earn dirty money that needs laundering'() {
    const { engine, state, ctx } = hood('US', 5);
    join(engine, state);
    const me = meOf(state);
    me.rank = 2; me.trust = 90;
    engine.dispatch('underworld.racket', 'numbers');
    engine.dispatch('underworld.racket', 'drugs');
    assert.deepEqual(me.rackets, ['numbers', 'drugs']);
    const cash = state.finances.cash;
    never(engine, () => mod.onAgeUp(ctx));
    assert.ok(me.dirty > 0 && state.finances.cash > cash, 'paid');
    engine.dispatch('underworld.recruit');
    assert.equal(me.crew.length, 1);
  },
  'skimming gets noticed; a thief loses the boss\'s trust'() {
    const { engine, state, ctx } = hood('US', 6);
    join(engine, state);
    const me = meOf(state);
    me.rank = 1; me.trust = 60;
    engine.dispatch('underworld.racket', 'loans');
    engine.dispatch('underworld.skim', '25');
    const c = engine.rng.chance; engine.rng.chance = (p) => p === 0.25; try { mod.onAgeUp(ctx); } finally { engine.rng.chance = c; }
    assert.ok(me.trust < 60);
  },
  'indicted: cooperate and enter witness protection with a new name in a new city'() {
    const { engine, state, ctx } = hood('US', 7);
    join(engine, state);
    const me = meOf(state);
    me.rank = 3;
    const name = state.character.lastName;
    const city = state.character.regionId;
    ctx.prompt({ type: 'underworld.indicted', title: 'x', text: 'x', options: [{ id: 'cooperate', label: 'x' }] });
    engine.resolvePrompt(state.prompts.at(-1).id, 'cooperate');
    assert.ok(me.witsec && me.marked);
    assert.ok(state.character.lastName !== name || state.character.regionId !== city);
    assert.match(VIEWS.activities(state, {}), /Witness Protection/);
  },
  'the boss sets policy and pays off officials'() {
    const { engine, state } = hood('US', 8);
    const o = join(engine, state);
    const me = meOf(state);
    me.rank = 4;
    state.finances.cash = 500000;
    engine.dispatch('underworld.policy', 'legit');
    assert.equal(o.policy, 'legit');
    const heat = o.heat = 60;
    never(engine, () => engine.dispatch('underworld.corrupt'));
    assert.ok(o.heat < heat);
  },
  'a sworn member who walks away is marked'() {
    const { engine, state } = hood('US', 9);
    join(engine, state);
    meOf(state).rank = 2;
    never(engine, () => engine.dispatch('underworld.leave'));
    assert.ok(meOf(state).marked);
  },
  'a detective builds a case against an outfit, or goes on the pad'() {
    const { engine, state, ctx } = hood('US', 12);
    state.career.job = { professionId: 'police', title: 'Detective', performance: 60, employer: { name: 'PD', benefits: {} }, salary: 70000 };
    const o = outfitsHere(state)[0];
    for (let i = 0; i < 3; i++) {
      ctx.prompt({ type: 'underworld.case', title: 'x', text: 'x', options: [{ id: 'build', label: 'x' }], data: { outfitId: o.id } });
      engine.resolvePrompt(state.prompts.at(-1).id, 'build');
    }
    assert.ok(o.strength < 100 && !o.task, 'indicted');
  },
  'a mobster\'s child is known to the family'() {
    const { engine, state } = hood('US', 13);
    const o = join(engine, state);
    meOf(state).rank = 3;
    state.character.age = 60;
    state.people.list.push({ id: 'kid', firstName: 'Vito', lastName: state.character.lastName, gender: 'male', relation: 'child', ageOffset: -30, alive: true, relationship: 80, income: 0 });
    engine.context().die('Old age');
    const heir = engine.continueAsChild('kid');
    assert.equal(heir.underworld.family.outfitId, o.id);
  },
  'years in the life play out without errors'() {
    for (const cc of ['US', 'JP', 'GB', 'MX']) {
      const { engine, state } = hood(cc, 11);
      join(engine, state);
      meOf(state).rank = 1;
      engine.dispatch('underworld.racket', 'protection');
      for (let i = 0; i < 15 && state.character.alive; i++) {
        for (let k = 0; k < 12 && state.prompts.length; k++) { const q = state.prompts[0]; engine.resolvePrompt(q.id, (q.options.find((o) => !o.disabled && o.tone !== 'danger') ?? q.options[0]).id); }
        state.prompts = [];
        state.stats.health = 90;
        engine.ageUp();
        VIEWS.activities(state, {});
      }
      assert.ok(OUTFIT_TYPES[outfitsHere(state)[0].type]);
    }
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} underworld test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} underworld tests passed`);
