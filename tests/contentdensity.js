/**
 * Content density: no life runs thin. The random event pool has enough for every age in every
 * era and country; every country has moments of its own history; the new packs (childhood,
 * the nineteenth century, later life, local colour) are valid and reachable.
 *
 *   node tests/contentdensity.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { LIFE_EVENTS } from '../src/modules/life/LifeEvents.js';
import { PACK_PROBLEMS, CONTENT_PACKS } from '../src/modules/content/index.js';
import { eligible } from '../src/core/Pools.js';
import { setEraYear } from '../src/modules/world/Eras.js';
import { ALL_EPISODES } from '../src/modules/world/LivingHistory.js';
import { COUNTRIES } from '../src/modules/world/Countries.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
/** A life of this age, in this country, in this year. */
const lifeAt = (cc, year, age, seed = 7) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: Math.max(1800, year - age) });
  state.character.age = age;
  state.character.birthYear = year - age;
  setEraYear(year);
  return state;
};
/** The fewest random events a life may have to choose from, by age. */
const FLOOR = { 3: 6, 8: 15, 15: 15, 25: 20, 45: 20, 70: 20, 85: 15 };

const tests = {
  'the packs are valid'() {
    assert.deepEqual(PACK_PROBLEMS, []);
    for (const id of ['life-childhood', 'life-victorian', 'life-later', 'life-local']) assert.ok(CONTENT_PACKS.some((p) => p.id === id), id);
  },
  'every age in every era and country has enough to happen'() {
    const thin = [];
    for (const cc of ['US', 'GB', 'IN', 'NG', 'BR', 'JP', 'FR', 'MX']) {
      for (const year of [1830, 1870, 1905, 1935, 1965, 1995, 2020]) {
        for (const [age, floor] of Object.entries(FLOOR)) {
          const n = eligible(LIFE_EVENTS, lifeAt(cc, year, Number(age))).length;
          if (n < floor) thin.push(`${cc} ${year} age ${age}: ${n} < ${floor}`);
        }
      }
    }
    setEraYear(null);
    assert.deepEqual(thin, []);
  },
  'toddlers only get toddler things'() {
    const s = lifeAt('GB', 1990, 3);
    const ids = eligible(LIFE_EVENTS, s).map((e) => e.id);
    setEraYear(null);
    const grownUp = ids.filter((id) => /^(vic|old|tc)\./.test(id));
    assert.deepEqual(grownUp, []);
  },
  'every country has moments of its own history'() {
    const missing = [];
    for (const cc of Object.keys(COUNTRIES)) {
      let found = false;
      for (let y = 1800; y <= 2060 && !found; y += 1) {
        for (const a of [10, 20, 30, 45]) {
          // Every timeline event "happened" the year before, so each moment can be reached.
          const s = { character: { countryId: cc, age: a, gender: 'male', birthYear: y - a }, era: { events: new Proxy({}, { get: () => ({ year: y - 1 }) }) }, military: {}, community: {} };
          if (ALL_EPISODES.some((e) => { try { return e.when(s, y); } catch { return false; } })) { found = true; break; }
        }
      }
      if (!found) missing.push(cc);
    }
    assert.deepEqual(missing, []);
  },
  'history moments have unique ids and at least one choice'() {
    const ids = new Set();
    for (const e of ALL_EPISODES) {
      assert.ok(!ids.has(e.id), `duplicate ${e.id}`);
      ids.add(e.id);
      assert.ok(e.options?.length >= 1 && e.options.every((o) => o.effect?.log), e.id);
    }
  },
  'a nineteenth-century life and a modern one see their own decades'() {
    const old = eligible(LIFE_EVENTS, lifeAt('GB', 1850, 30)).map((e) => e.id);
    const now = eligible(LIFE_EVENTS, lifeAt('GB', 2015, 30)).map((e) => e.id);
    setEraYear(null);
    assert.ok(old.some((id) => id.startsWith('vic.')), 'Victorian events in 1850');
    assert.ok(!now.some((id) => id.startsWith('vic.')), 'none in 2015');
    assert.ok(!old.includes('datingApp'), 'no dating apps in 1850');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 8).join('\n    ')}`); }
}
if (failed) process.exit(1);
