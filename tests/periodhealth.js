/**
 * Health and medicine of their day (health/PeriodHealth.js): treatments arrive on their dates and
 * later in poorer countries, children die at the rates of their day, the diseases and epidemics of
 * the time, conditions deadlier before their cure, and the Health tab says what medicine can do.
 *
 *   node tests/periodhealth.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { available, medicineLag, childMortality, maternalRisk, conditionEraFactor, treatedAcuteDeath, epidemicsNow, vaccinesOpen, threat, DISEASES } from '../src/modules/health/PeriodHealth.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (opts, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ gender: 'female', ...opts });
  return { engine, state, ctx: engine.context() };
};

const tests = {
  'treatments arrive on their dates, later in poorer countries'() {
    assert.equal(available(life({ countryId: 'GB', startYear: 1930 }).state, 'antibiotics'), false);
    assert.equal(available(life({ countryId: 'GB', startYear: 1950 }).state, 'antibiotics'), true);
    const ng = life({ countryId: 'NG', startYear: 1950 }).state;
    assert.ok(medicineLag(ng) > 10, `lag ${medicineLag(ng)}`);
    assert.equal(available(ng, 'antibiotics'), false);
    assert.equal(medicineLag(life({ countryId: 'US', startYear: 1950 }).state), 0);
  },
  'children and mothers die at the rates of their day'() {
    const old = life({ countryId: 'US', startYear: 1880 }).state, now = life({ countryId: 'US', startYear: 2000 }).state;
    assert.ok(childMortality(old, 0) > 10 * childMortality(now, 0));
    assert.ok(maternalRisk(old) > 20 * maternalRisk(now));
  },
  'conditions are deadlier before their cure'() {
    assert.ok(conditionEraFactor(life({ countryId: 'US', startYear: 1910 }).state, 'diabetes') > 2);
    assert.equal(conditionEraFactor(life({ countryId: 'US', startYear: 1990 }).state, 'diabetes'), 1);
    assert.ok(treatedAcuteDeath(life({ countryId: 'GB', startYear: 1850 }).state, 'appendicitis') > treatedAcuteDeath(life({ countryId: 'GB', startYear: 1990 }).state, 'appendicitis'));
  },
  'the diseases and epidemics of the time'() {
    const gb = life({ countryId: 'GB', startYear: 1880 }).state;
    assert.equal(threat(gb, DISEASES.tuberculosis), 1);
    assert.equal(threat(life({ countryId: 'GB', startYear: 2000 }).state, DISEASES.smallpox), 0);
    assert.deepEqual(epidemicsNow(life({ countryId: 'FR', startYear: 1918 }).state).map((e) => e.id), ['spanishFlu']);
    assert.ok(vaccinesOpen(life({ countryId: 'US', startYear: 1960 }).state).some((v) => v.id === 'polio'));
  },
  'a life in 1880 meets the diseases of 1880; one in 2000 mostly does not'() {
    const count = (year) => {
      let hits = 0;
      for (let seed = 1; seed <= 10; seed++) {
        const { engine, state } = life({ countryId: 'GB', startYear: year }, seed);
        for (let i = 0; i < 40 && state.character.alive; i++) { state.prompts = []; engine.ageUp(); }
        hits += Object.keys(state.periodHealth.had).length;
      }
      return hits;
    };
    const old = count(1880), now = count(2000);
    assert.ok(old > now + 3, `1880: ${old}, 2000: ${now}`);
  },
  'vaccination costs a little and protects you'() {
    const { engine, state } = life({ countryId: 'US', startYear: 1960 });
    state.character.age = 30;
    state.periodHealth.vaccinated = {};
    engine.dispatch('periodHealth.vaccinate', 'polio');
    assert.ok(state.periodHealth.vaccinated.polio != null);
    assert.ok(!vaccinesOpen(state).some((v) => v.id === 'polio'));
  },
  'the Health tab says what medicine can do'() {
    const { state } = life({ countryId: 'GB', startYear: 1918 });
    const html = VIEWS.health(state, {});
    assert.match(html, /Medicine of 1918/);
    assert.match(html, /Spanish flu/);
    assert.doesNotMatch(html, /undefined|NaN/);
    assert.doesNotMatch(VIEWS.health(life({ countryId: 'GB', startYear: 2020 }).state, {}), /Medicine of/);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
