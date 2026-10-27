/**
 * Royal life with choices: the year's defining engagement, consent to family marriages, the
 * press, the estates, preparing the heir, and one House card for reigning and former houses.
 *
 *   node tests/royallife.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(opts = {}, seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'GB', ...opts });
  state.legal.record = [];
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
}
const year = (engine, state, n = 1) => {
  for (let i = 0; i < n && state.character.alive; i++) {
    for (let k = 0; k < 12 && state.prompts.length; k++) { const q = state.prompts[0]; engine.resolvePrompt(q.id, (q.options.find((o) => !o.disabled && o.tone !== 'danger') ?? q.options[0]).id); }
    state.prompts = [];
    state.stats.health = 95;
    engine.ageUp();
  }
};
const mod = MODULES.find((m) => m.id === 'royalLife');

const tests = {
  'a working royal gets the year\'s diary: choose the engagement that defines it'() {
    const { engine, state } = life({ royalLevel: 'child' }, 3);
    year(engine, state, 25);
    state.royal.working = true;
    state.prompts = [];
    state.yearly = {};
    mod.onAgeUp(engine.context());
    const q = state.prompts.find((p) => p.type === 'royalLife.diary');
    assert.ok(q, 'the diary');
    assert.equal(q.options.length, 3);
    const before = state.royal.popularity;
    engine.resolvePrompt(q.id, q.options[0].id);
    assert.notEqual(state.royal.popularity, before, 'it mattered');
  },
  'the sovereign gives or refuses consent; a refused relative may leave the line'() {
    const { engine, state, ctx } = life({ royalLevel: 'heir' }, 4);
    state.character.age = 50;
    state.royal.reigning = true;
    state.people.list.push({ id: 'n1', firstName: 'Ned', lastName: 'X', gender: 'male', relation: 'child', ageOffset: -22, alive: true, relationship: 80, income: 0 });
    ctx.prompt({ type: 'royalLife.consent', title: 'x', text: 'x', options: [{ id: 'no', label: 'no' }], data: { kin: 'n1', partner: 'Kim Y', unsuitable: true } });
    const c = ctx.rng.chance; ctx.rng.chance = () => true;
    engine.resolvePrompt(state.prompts.at(-1).id, 'no');
    ctx.rng.chance = c;
    const ned = state.people.list.find((p) => p.id === 'n1');
    assert.ok(ned.excluded, 'out of the line');
    assert.ok(ned.relationship < 80);
  },
  'the estates pay the monarch, and their course can be set; preparing the heir'() {
    const { engine, state } = life({ royalLevel: 'heir' }, 5);
    year(engine, state, 30);
    state.royal.reigning = true;
    const html = VIEWS.politics(state, {});
    assert.match(html, /The House of /);
    assert.match(html, /Estate/);
    state.prompts = [];
    engine.dispatch('royalLife.estate', 'green');
    assert.equal(state.royal.estate.mode, 'green');
    engine.dispatch('royalLife.mentorHeir');
    assert.ok(state.royal.heirReady > 30);
    const cash = state.finances.cash;
    mod.onAgeUp(engine.context());
    assert.ok(state.finances.cash > cash || state.finances.ledger.income.some((i) => /net income/.test(i.source)), 'estate income');
  },
  'the head of a former house gathers the family at the old seat'() {
    const { engine, state } = life({ countryId: 'IT', housePlace: 'heir', gender: 'male' }, 3);
    year(engine, state, 25);
    state.house.rank = 'head';
    state.finances.cash = 1e6;
    state.prompts = [];
    const before = state.world.monarchists?.IT ?? 0;
    engine.dispatch('royalLife.gathering');
    assert.ok((state.world.monarchists?.IT ?? 0) >= before);
    assert.match(VIEWS.politics(state, {}), /Gather the house/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} royal life test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} royal life tests passed`);
