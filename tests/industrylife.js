/**
 * Working in industry and owning it: disasters and strikes in your trade, jobs only where the
 * industry is, your own concern from founding to nationalisation.
 *
 *   node tests/industrylife.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { getProfession, professionsFor } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { enact } from '../src/modules/politics/Laws.js';
import { foundable } from '../src/modules/industry/Concerns.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc, startYear, years, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear, gender: 'male' });
  for (let i = 0; i < years && state.character.alive; i++) { engine.autoResolve(); state.prompts = []; state.stats.health = 100; engine.ageUp(); }
  engine.autoResolve(); state.prompts = [];
  return { engine, state };
};
const work = (engine, state, prof) => { const ctx = engine.context(); const p = getProfession(prof); hire(ctx, { professionId: prof, levelId: p.levels[0].id, employer: createEmployer(ctx.rng, state, p, state.character.regionId) }); };

const tests = {
  'no pits in Switzerland, no whalers in Bolivia'() {
    const ch = life('CH', 1900, 25);
    assert.ok(!professionsFor(ch.state).some((p) => p.id === 'coalMining'), 'no coal');
    const gb = life('GB', 1900, 25);
    assert.ok(professionsFor(gb.state).some((p) => p.id === 'coalMining'), 'British pits');
  },
  'a miner\'s working life brings its trade\'s troubles'() {
    const seen = new Set();
    for (const seed of [1, 2, 3, 4]) {
      const { engine, state } = life('GB', 1860, 18, seed);
      work(engine, state, 'coalMining');
      for (let i = 0; i < 40 && state.character.alive; i++) {
        for (const p of state.prompts) if (p.type.startsWith('industrialLife.')) { seen.add(p.type); engine.resolvePrompt(p.id, p.options[0].id); }
        engine.autoResolve(); state.prompts = []; state.stats.health = 100;
        if (!state.career.job) work(engine, state, 'coalMining');
        engine.ageUp();
      }
    }
    assert.ok(seen.size >= 2, [...seen].join(','));
  },
  'found a colliery, run it, and lose it to nationalisation with compensation'() {
    const { engine, state } = life('GB', 1880, 30, 2);
    state.finances.cash = 5e6;
    assert.ok(foundable(state).some(([id]) => id === 'coal'));
    engine.dispatch('concerns.found', { kind: 'coal' });
    assert.equal(state.concerns.length, 1);
    assert.match(state.concerns[0].name, /Collieries/);
    assert.match(VIEWS.business(state, {}), /Industrial Concerns/);
    state.prompts = []; engine.ageUp(); engine.autoResolve(); state.prompts = [];
    assert.ok(state.concerns[0].lastProfit !== undefined);
    enact(state, { level: 'federal', where: 'GB', lawId: 'ownership_coal', value: true, sponsor: 'you', age: 30 });
    const cash = state.finances.cash;
    engine.ageUp();
    assert.equal(state.concerns.length, 0, 'nationalised');
    assert.ok(state.finances.cash > cash, 'compensated');
  },
  'a strike at your works resolves'() {
    const { engine, state } = life('GB', 1900, 30, 3);
    state.finances.cash = 5e6;
    engine.dispatch('concerns.found', { kind: 'textiles' });
    const c = state.concerns[0];
    state.prompts.push({ id: 'k1', type: 'concerns.strike', data: { id: c.id }, options: [{ id: 'concede' }, { id: 'lockout' }, { id: 'blacklegs' }] });
    engine.resolvePrompt('k1', 'lockout');
    assert.ok(state.concerns.length === 1);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed++; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 3).join('\n    ')}`); }
}
process.exit(failed ? 1 : 0);
