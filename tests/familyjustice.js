/**
 * Relatives in uniform, being falsely accused, the past coming out on the campaign trail, and
 * what the obituary says.
 *
 *   node tests/familyjustice.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS, Renderer } from '../src/ui/Renderer.js';
import { makePerson } from '../src/modules/people/PeopleEngine.js';
import { enlist, relativeServiceTick, serviceLabel } from '../src/modules/people/RelativeService.js';
import { accusationTick } from '../src/modules/crime/FalseAccusation.js';
import { skeletonOf } from '../src/modules/politics/CampaignTrail.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(countryId = 'US', seed = 3, age = 45) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  state.character.age = age;
  state.prompts = [];
  state.legal.record = [];
  state.finances.cash = 100000;
  return { engine, state, ctx: engine.context() };
}
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };
const logText = (state) => state.log.flatMap((y) => y.entries).map((e) => e.text).join('\n');

const tests = {
  'a child joins their own country\'s forces, rises, deploys, and you choose how to carry it'() {
    for (const cc of ['US', 'GB', 'DE']) {
      const { engine, state, ctx } = life(cc);
      const kid = makePerson(ctx, { relation: 'child', age: 20, relationship: 70 });
      state.people.list.push(kid);
      enlist(state, kid, new Random(1));
      assert.ok(kid.service);
      kid.service.term = 30;
      if (cc === 'GB') assert.match(serviceLabel(kid.service), /British Army|Royal Navy|Royal Air Force|Royal Marines/);
      if (cc === 'US') assert.match(serviceLabel(kid.service), /U\.S\.|Marine/);
      let deployed = 0;
      for (let y = 0; y < 15 && kid.service; y++) {
        state.character.age += 1;
        state.prompts = [];
        relativeServiceTick(ctx);
        const p = state.prompts.find((x) => x.type === 'relativeService.deployed');
        if (p) { deployed += 1; engine.resolvePrompt(p.id, 'letters'); }
      }
      if (cc !== 'DE') assert.ok(deployed >= 1, `${cc} deployments`);
      const html = VIEWS.people(state, {});
      clean(html);
    }
  },
  'falsely accused: the investigation, a trial, a wrongful conviction, and exoneration on appeal'() {
    const { engine, state, ctx } = life('US', 4, 35);
    state.people.list.push(makePerson(ctx, { relation: 'ex', age: 35, relationship: 10 }));
    let found = false;
    for (let y = 0; y < 400 && !found; y++) { state.character.age = 35 + (y % 20); accusationTick(ctx); found = Boolean(state.legal.accused); }
    assert.ok(found, 'an accusation comes eventually');
    const p = state.prompts.find((x) => x.type === 'crime.accused');
    engine.resolvePrompt(p.id, 'silent');
    clean(VIEWS.cases(state, {}));
    assert.match(VIEWS.cases(state, {}), /Falsely Accused/);
    // Force the hard road: charged, then convicted.
    let charged = null;
    for (let y = 0; y < 60 && !charged; y++) {
      state.prompts = [];
      state.legal.accused = { ...(state.legal.accused ?? { kind: 'assault', accuser: 'Sam', since: state.character.age }), stage: 'investigation', strength: 0.5 };
      state.character.age += 1;
      accusationTick(ctx);
      charged = state.prompts.find((x) => x.type === 'crime.charged');
    }
    ctx.rng.chance = () => false;
    assert.ok(charged);
    engine.resolvePrompt(charged.id, 'trial');
    assert.ok(state.legal.flags.wronglyConvicted);
    const court = state.prompts.find((x) => x.type === 'legal.court');
    if (court) { ctx.rng.chance = () => true; engine.resolvePrompt(court.id, court.options.find((o) => /trial/i.test(o.id)) ? court.options.find((o) => /trial/i.test(o.id)).id : court.options[0].id); }
    if (!state.legal.incarceration) state.legal.incarceration = { yearsLeft: 4, total: 4, served: 2, facility: 'a state prison', kind: 'state' };
    state.yearly = {};
    ctx.rng.chance = () => true;
    engine.dispatch('legal.prisonAppeal', 'lawyer');
    assert.equal(state.legal.incarceration, null);
    assert.match(logText(state), /Exonerated/);
  },
  'the campaign trail can dig up your past; the obituary has a headline'() {
    const { state } = life('GB', 5, 70);
    assert.equal(skeletonOf(state), null);
    state.legal.yearsInside = 3;
    assert.match(skeletonOf(state), /prison/);
    const o = Renderer.prototype.obituary.call({ ui: {} }, state);
    assert.match(o.headline, /dies at 70/);
    assert.ok(o.facts.some((f) => f && f[0] === 'Years inside'));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} family & justice tests passed`);
