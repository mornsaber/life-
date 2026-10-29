/**
 * Health: lifestyle risk, new conditions, screenings and vaccines, injuries other systems
 * inflict, drug use from the drug trade, long-term care and hospice, and the Health tab.
 *
 *   node tests/healthlife.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { CONDITIONS, DEATH_CAUSE, getCondition } from '../src/modules/health/index.js';
import { addCondition, screeningsFor } from '../src/modules/health/HealthEngine.js';
import { lifestyleOf, lifestyleRisk } from '../src/modules/health/Lifestyle.js';
import { careSystemHere, careCost } from '../src/modules/health/EndOfLife.js';
import { drugsOf } from '../src/modules/crime/Drugs.js';
import { COUNTRIES } from '../src/modules/world/Countries.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life({ seed = 4, age = 40, countryId } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife(countryId ? { countryId } : {});
  state.character.age = age;
  state.prompts = [];
  state.finances.cash = 500_000;
  return { engine, state, ctx: engine.context() };
}
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };
const rig = (engine, value, fn) => { const c = engine.rng.chance; engine.rng.chance = () => value; try { return fn(); } finally { engine.rng.chance = c; } };
const answer = (engine, state, type, option) => { const p = state.prompts.find((x) => x.type === type); assert.ok(p, `prompt ${type} (have ${state.prompts.map((x) => x.type).join(', ')})`); engine.resolvePrompt(p.id, option); };

const tests = {
  'new conditions have causes of death; every country has long-term care'() {
    for (const id of ['copd', 'stroke', 'dementia', 'kidneyDisease', 'liverDisease', 'hiv', 'hepatitisC', 'stimulants']) {
      assert.ok(CONDITIONS[id], id);
      assert.ok(DEATH_CAUSE[id], `${id} cause of death`);
    }
    for (const cc of Object.keys(COUNTRIES)) assert.ok(careSystemHere({ character: { countryId: cc } }).name, cc);
  },

  'habits change the odds: smoking, weight, drink, exercise, needles'() {
    const { state } = life();
    const l = lifestyleOf(state);
    assert.equal(lifestyleRisk(state, 'copd'), 1);
    l.smoking = 'current';
    l.packYears = 30;
    assert.ok(lifestyleRisk(state, 'copd') > 10 && lifestyleRisk(state, 'cancer') > 1.5);
    l.smoking = 'former';
    l.quitAge = state.character.age - 10;
    assert.ok(lifestyleRisk(state, 'copd') < 15);
    l.bmi = 33;
    assert.ok(lifestyleRisk(state, 'diabetes') > 2);
    l.exercise = 'active';
    assert.ok(lifestyleRisk(state, 'depression') < 1);
    l.drinking = 'heavy';
    assert.ok(lifestyleRisk(state, 'liverDisease') > 10);
    l.injecting = true;
    assert.ok(lifestyleRisk(state, 'hepatitisC') > 30);
  },

  'quitting smoking, habit changes and the first cigarette'() {
    const { engine, state, ctx } = life({ age: 15 });
    const l = lifestyleOf(state);
    for (let i = 0; i < 40 && !state.prompts.some((p) => p.type === 'health.firstCig'); i++) { state.yearly = {}; MODULES.find((m) => m.id === 'health').onAgeUp(ctx); state.character.age = 15; state.prompts = state.prompts.filter((p) => p.type === 'health.firstCig'); }
    rig(engine, true, () => answer(engine, state, 'health.firstCig', 'try'));
    assert.equal(l.smoking, 'current');
    state.character.age = 30;
    rig(engine, true, () => engine.dispatch('health.quitSmoking', 'rx'));
    assert.equal(l.smoking, 'former');
    engine.dispatch('health.habit', 'exercise:active');
    engine.dispatch('health.habit', 'diet:good');
    assert.equal(l.exercise, 'active');
    assert.equal(l.diet, 'good');
  },

  'checkups screen by age and catch disease earlier; the flu jab'() {
    const { engine, state, ctx } = life({ age: 56 });
    state.character.gender = 'male';
    assert.ok(screeningsFor(state).some((s) => s.id === 'psa'));
    assert.ok(screeningsFor(state).some((s) => s.id === 'colon'));
    addCondition(ctx, 'cancer', { severity: 40, diagnosed: false });
    rig(engine, true, () => engine.dispatch('health.checkup'));
    const c = getCondition(state, 'cancer');
    assert.ok(c.diagnosed && c.severity < 40, JSON.stringify(c));
    engine.dispatch('health.fluShot');
    assert.equal(state.health.vaccinatedAge, 56);
  },

  'injuries other systems inflict are billed and treated'() {
    const { engine, state, ctx } = life();
    const h = state.stats.health;
    rig(engine, false, () => ctx.emit('health:acute', { id: 'stabWound' }));
    assert.ok(state.character.alive && state.stats.health < h);
    assert.ok(state.health.trauma > 0);
  },

  'dealers who use their own product get addicted; injecting carries hepatitis risk'() {
    const { engine, state } = life();
    state.legal.crime = { heat: 0, skill: {}, earned: 0, layingLow: false, rep: 60 };
    engine.dispatch('crime.drugBuy', 'heroin:kilo');
    const d = drugsOf(state);
    assert.ok(d.stash > 1);
    const crime = MODULES.find((m) => m.id === 'crime');
    rig(engine, true, () => crime.onAgeUp({ ...engine.context(), crimeRng: engine.rng }));
    assert.ok(d.using && getCondition(state, 'opioids'), 'using');
    assert.ok(state.health.lifestyle.injecting);
  },

  'long-term care when dementia advances; hospice for a terminal illness'() {
    const { engine, state, ctx } = life({ age: 82, countryId: 'DE' });
    addCondition(ctx, 'dementia', { severity: 70, diagnosed: true });
    rig(engine, false, () => MODULES.find((m) => m.id === 'health').onAgeUp(ctx));
    answer(engine, state, 'health.care', 'facility');
    assert.equal(state.health.care.kind, 'facility');
    assert.ok(careCost(state, 'facility') < careCost({ ...state, character: { ...state.character, countryId: 'US' }, finances: { cash: 1e6 } }, 'facility'), 'German care insurance pays half');
    addCondition(ctx, 'cancer', { severity: 95, diagnosed: true }).treated = false;
    state.prompts = [];
    rig(engine, false, () => MODULES.find((m) => m.id === 'health').onAgeUp(ctx));
    if (state.character.alive) {
      answer(engine, state, 'health.hospice', 'hospice');
      assert.ok(getCondition(state, 'cancer').hospice);
    }
    engine.dispatch('health.directive');
  },

  'the Health tab shows lifestyle, prevention and care'() {
    const { state, ctx } = life({ age: 70 });
    lifestyleOf(state).smoking = 'current';
    addCondition(ctx, 'copd', { severity: 40, diagnosed: true });
    const html = VIEWS.health(state, {});
    clean(html);
    assert.match(html, /Lifestyle/);
    assert.match(html, /Prevention &amp; Planning|Prevention & Planning/);
    assert.match(html, /COPD/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} health test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} health & lifestyle tests passed`);
