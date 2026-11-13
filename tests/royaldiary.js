/**
 * The Royal Diary (world/RoyalDiary.js): one planner for the year's public life, with the
 * likely effects shown, a budget of days, and the papers counting a light year.
 *
 *   node tests/royaldiary.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { diaryOptions, diaryBudget, daysUsed, project, parsePlan } from '../src/modules/world/RoyalDiary.js';
import { courtView } from '../src/ui/views/CrownCard.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const adultRoyal = (level = 'child', seed = 1, age = 25) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'GB', royalLevel: level, gender: 'female' });
  for (let i = 0; i < age && state.character.alive; i++) { state.prompts = []; state.stats.health = 95; engine.ageUp(); }
  state.prompts = [];
  state.royal.working = true;
  state.yearly = {};
  return { engine, state };
};

const tests = {
  'the plan is parsed and projected before you commit'() {
    assert.deepEqual(parsePlan('engagement=2:tour=1:headline=gala'), { engagement: 2, tour: 1, headline: 'gala' });
    const { state } = adultRoyal();
    const p = project(state, { engagement: 2, headline: 'gala' });
    assert.equal(p.days, 5);
    assert.ok(p.pop[1] > 0 && p.stress > 0 && p.risk > 0);
  },
  'setting the diary carries out each engagement and spends the days'() {
    const { engine, state } = adultRoyal();
    const before = state.royal.popularity;
    engine.dispatch('royalDiary.plan', 'engagement=3:patronage=1');
    assert.equal(state.yearly['crown.engagement'], 3);
    assert.equal(daysUsed(state), 4);
    assert.ok(state.royal.popularity > before);
    assert.equal(diaryOptions(state).items.find((x) => x.id === 'engagement').remaining, 0);
  },
  'you cannot give more days than you have'() {
    const { engine, state } = adultRoyal();
    engine.dispatch('royalDiary.plan', 'engagement=3:rest=3:patronage=1:headline=banquet');
    assert.equal(daysUsed(state), 10);
    engine.dispatch('royalDiary.plan', 'rest=1');
    assert.equal(daysUsed(state), diaryBudget(state), 'full');
  },
  'a light year and the papers count your engagements'() {
    const { engine, state } = adultRoyal('child', 2, 24);
    engine.dispatch('royalDiary.plan', 'rest=1');
    const before = state.royal.popularity;
    state.stats.health = 95;
    engine.ageUp();
    const text = state.log.at(-1).entries.map((e) => e.text).join(' ');
    assert.match(text, /counted your engagements/);
    assert.ok(state.royal.popularity <= before);
  },
  'the Court tab shows the planner with each line\'s likely effect'() {
    const { state } = adultRoyal();
    const html = courtView(state);
    assert.match(html, /The Royal Diary/);
    assert.match(html, /royalDiary\.plan/);
    assert.match(html, /📰 \+1/);
    assert.ok(!/crown\.engagement/.test(html), 'no loose duty buttons');
  },
  'a sovereign plans investitures and the heir\'s preparation'() {
    const { engine, state } = adultRoyal('heir', 4, 40);
    state.royal.reigning = true;
    const ids = diaryOptions(state).items.map((x) => x.id);
    assert.ok(ids.includes('investiture') && ids.includes('mentor'));
    engine.dispatch('royalDiary.plan', 'mentor=1:investiture=1');
    assert.equal(daysUsed(state), 4);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
