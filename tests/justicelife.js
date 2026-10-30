/**
 * Prison as a place people live, life after release, the victim's side, and white-collar schemes.
 *
 *   node tests/justicelife.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { insideTick, reentryTick } from '../src/modules/crime/PrisonLife.js';
import { victimJustice } from '../src/modules/crime/VictimJustice.js';
import { whiteCollarTick, schemesOf } from '../src/modules/crime/WhiteCollar.js';
import { startReentry } from '../src/modules/legal/Prison.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { hire } from '../src/modules/career/CareerEngine.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(seed = 3, age = 30) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US' });
  state.character.age = age;
  state.prompts = [];
  state.legal.record = [];
  state.finances.cash = 50_000;
  return { engine, state, ctx: engine.context() };
}
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };
const take = (state, type) => state.prompts.find((x) => x.type === type);
const logText = (state) => state.log.flatMap((y) => y.entries).map((e) => e.text).join('\n');

const tests = {
  'a prison job builds seniority and trust; life inside throws up choices; the hearing weighs your plan'() {
    const { engine, state, ctx } = life();
    state.legal.incarceration = { yearsLeft: 6, total: 6, served: 0, facility: 'a state prison', kind: 'state', goodBehavior: 4 };
    for (let y = 0; y < 2; y++) { state.yearly = {}; engine.dispatch('legal.prisonWork', 'industries'); }
    const inc = state.legal.incarceration;
    assert.equal(inc.job, 'industries');
    assert.equal(inc.jobYears, 2);
    assert.ok(inc.trusty, 'two clean years make a trusty');
    clean(VIEWS.legal(state, {}));
    assert.match(VIEWS.legal(state, {}), /Trusty/);
    ctx.rng.chance = () => true;
    insideTick(ctx);
    const p = take(state, 'crime.inside');
    assert.ok(p);
    engine.resolvePrompt(p.id, p.options.at(-1).id);
    inc.served = 2;
    state.yearly = {};
    engine.dispatch('legal.prisonParole');
    const hearing = state.prompts.find((x) => x.type === 'legal.paroleHearing');
    assert.match(hearing.text, /Release plan/);
    engine.resolvePrompt(hearing.id, 'plan');
    assert.equal(state.legal.incarceration, null);
    assert.ok(state.legal.reentry);
  },
  'three years of reentry, with the old crew and the box on the application'() {
    const { engine, state, ctx } = life(5);
    startReentry(state, 4);
    for (let y = 0; y < 4; y++) {
      reentryTick(ctx);
      const p = state.prompts.find((x) => x.type === 'crime.reentry');
      if (p) engine.resolvePrompt(p.id, p.options[0].id);
      state.prompts = [];
    }
    assert.equal(state.legal.reentry, null, 'reentry ends after three years');
    assert.match(logText(state), /Three years out/);
  },
  'victims: impact statement, restorative justice, a civil suit and compensation, one after another'() {
    const { engine, state, ctx } = life(7);
    ctx.rng.chance = () => true;
    victimJustice(ctx, { id: 'assault', offender: 'Dale Hughes', outcome: 'convicted' });
    const before = state.finances.cash;
    for (let i = 0; i < 6; i++) {
      const p = state.prompts.find((x) => x.type === 'crime.victimCourt');
      if (!p) break;
      engine.resolvePrompt(p.id, p.options[0].id);
    }
    const text = logText(state);
    assert.match(text, /statement/);
    assert.match(text, /sat across from/);
    assert.match(text, /judgment/);
    assert.match(text, /victim compensation fund/);
    assert.ok(state.finances.cash > before);
    assert.equal(state.legal.victimOf.length, 1);
    victimJustice(ctx, { id: 'sexualAssault', offender: 'X', outcome: 'convicted' });
    const sa = state.prompts.find((x) => x.type === 'crime.victimCourt' && /X was/.test(x.text));
    assert.ok(!sa.options.some((o) => o.id === 'restorative'), 'no restorative meeting for sexual violence');
  },
  'white-collar: a scheme pays, grows hot, and comes apart in a conviction; self-reporting is an option'() {
    const { engine, state, ctx } = life(9, 40);
    hire(ctx, { professionId: 'finance', levelId: 'vp', employer: createEmployer(ctx.rng, state, getProfession('finance'), state.character.regionId) });
    ctx.rng.chance = () => true;
    whiteCollarTick(ctx);
    const offer = take(state, 'crime.whiteCollar');
    assert.ok(offer, 'an offer');
    engine.resolvePrompt(offer.id, 'start');
    assert.equal(schemesOf(state).length, 1);
    clean(VIEWS.crime(state, {}));
    assert.match(VIEWS.crime(state, {}), /White-Collar Schemes/);
    ctx.rng.chance = () => false;
    let years = 0;
    while (schemesOf(state).length && years < 20) { state.prompts = []; whiteCollarTick(ctx); years += 1; }
    assert.ok(years < 20, 'it comes apart');
    assert.match(logText(state), /charged you/);
    const court = state.prompts.find((p) => p.type === 'legal.court');
    assert.ok(court, 'into court');
    ctx.rng.chance = () => true;
    engine.resolvePrompt(court.id, court.options[0].id);
    assert.ok(state.legal.record.some((r) => ['accountingFraud', 'sanctionsEvasion', 'ponziScheme'].includes(r.offenseId)), state.legal.record.map((r) => r.offenseId).join());
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} justice-life test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} justice-life tests passed`);
