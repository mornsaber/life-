/**
 * How you'll be remembered: temperament (inherited), epithets, memoirs, things named after you,
 * funerals of their day, and later generations judging the ancestors.
 *
 *   node tests/remembered.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { assignTemperament, epithetOf, funeralOf, rememberedOf, RememberedModule, rememberedRecord } from '../src/modules/people/Remembered.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (year = 2020, cc = 'US', seed = 3) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - 50 });
  state.character.age = 50;
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
};

const tests = {
  'everyone has two traits, and heirs often take after the parent'() {
    let shared = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const { state } = life(2020, 'US', seed);
      state.remembered = null;
      state.lineage = { generation: 2, ancestors: [{ name: 'X', temperament: ['devout', 'stubborn'] }] };
      const t = assignTemperament(state);
      assert.equal(t.length, 2);
      if (t.some((x) => ['devout', 'stubborn'].includes(x))) shared++;
    }
    assert.ok(shared >= 18, `${shared}/40 took after the parent`);
  },
  'the epithet follows the life'() {
    const { state } = life();
    state.legal.record = [1, 2, 3].map((i) => ({ offenseId: 'burglary', severity: 'felony', age: 20 + i, country: 'US' }));
    assert.equal(epithetOf(state), 'the Black Sheep');
  },
  'funerals of their day'() {
    const { state: v } = life(1880, 'GB');
    assert.match(funeralOf(v), /Victorian mourning/);
    const { state: m } = life(2010, 'US');
    m.military.history = [{ rankTitle: 'Sergeant' }];
    assert.match(funeralOf(m), /Taps/);
    const { state: old } = life(1850, 'US');
    old.military.history = [{ rankTitle: 'Sergeant' }];
    assert.ok(!/Taps/.test(funeralOf(old)), 'no Taps before 1891');
  },
  'memoirs: written once, and they pay'() {
    const { engine, state } = life();
    state.fame = { score: 60, buzz: 40, peak: 60 };
    const before = state.finances.cash;
    engine.dispatch('remembered.memoir', 'honest');
    assert.ok(rememberedOf(state).memoir, 'published');
    assert.ok(state.finances.cash > before);
    assert.match(VIEWS.people(state, {}), /How You'll Be Remembered/);
  },
  'no airport named after anyone before 1950'() {
    const { state, ctx } = life(1920);
    state.royal = { level: 'monarch', popularity: 90 };
    for (let i = 0; i < 40; i++) { state.character.age = 50 + (i % 5); RememberedModule.onAgeUp(ctx); }
    assert.ok(!rememberedOf(state).namedAfter.some((n) => n.kind === 'airport'));
  },
  'old age before the pension: the workhouse is a choice in 1900, not in 1950 Britain'() {
    const { state, ctx } = life(1880, 'GB');
    state.character.age = 70; // 1900
    state.career.job = null;
    state.finances.cash = 0;
    RememberedModule.onAgeUp(ctx);
    const p = state.prompts.find((x) => x.type === 'remembered.oldAge');
    assert.ok(p && p.options.some((o) => o.id === 'house'), 'the workhouse in 1900');
    const { state: s2, ctx: c2 } = life(1930, 'GB'); // 70 in 1950
    s2.character.age = 70; s2.career.job = null; s2.finances.cash = 0;
    RememberedModule.onAgeUp(c2);
    assert.ok(!s2.prompts.some((x) => x.type === 'remembered.oldAge'), 'the state pension by 1950');
  },
  'ancestors carry their record, and a colonial statue may come down after 2000'() {
    const { state: old } = life(1930, 'GB');
    old.career.history = [{ professionId: 'colonialService', title: 'District Officer' }];
    rememberedOf(old).namedAfter = [{ kind: 'statue', name: 'a statue of X', year: 1930 }];
    const rec = rememberedRecord(old);
    assert.ok(rec.deeds.includes('colonial'));
    const { state, ctx } = life(2021, 'GB', 9);
    state.lineage = { generation: 2, ancestors: [{ name: 'X Y', gender: 'male', ...rec, namedAfter: rec.namedAfter.map((n) => ({ ...n })) }] };
    for (let i = 0; i < 80 && !state.prompts.length; i++) { state.character.age = 50 + (i % 20); RememberedModule.onAgeUp(ctx); }
    assert.ok(state.prompts.some((p) => p.type === 'remembered.reckoning'));
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
