/**
 * Honours as orders: knighthoods offered in confidence (accept, a lesser grade, decline),
 * grades of one order replacing each other across civil and military lists, separate orders
 * kept side by side, letters after the name, handing an honour back, and the Orders card.
 *
 *   node tests/honours.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store, addHonor } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { honoursList, award, ORDERS, styledName, postNominals } from '../src/modules/world/Honours.js';
import { awardMedal } from '../src/modules/military/MedalEngine.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(opts = {}, seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'GB', gender: 'male', ...opts });
  state.legal.record = [];
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
}
const always = (ctx) => ({ ...ctx, rng: Object.assign(Object.create(Object.getPrototypeOf(ctx.rng)), ctx.rng, { chance: () => true }) });
const grandee = (state) => {
  state.character.age = 60;
  state.politics.history.push({ officeId: 'gb_mp', startAge: 40, endAge: 55, terms: 3 }, { officeId: 'gb_pm', startAge: 50, endAge: 54, terms: 1 });
};
const tier = (cc, id) => ORDERS[cc].tiers.find((t) => t.id === id);

const tests = {
  'a knighthood is offered first; declining it leaves you plain Mr, and it isn\'t offered again for years'() {
    const { engine, state, ctx } = life();
    grandee(state);
    award(ctx, 'GB', tier('GB', 'cbe'));
    const got = honoursList(always(ctx), { offer: true });
    assert.equal(got?.id, 'knight');
    const q = state.prompts.find((p) => p.type === 'honours.offer');
    assert.ok(q, 'an offer in confidence');
    assert.ok(q.options.some((o) => o.id === 'decline'));
    engine.resolvePrompt(q.id, 'decline');
    assert.ok(!state.honors.some((h) => h.tier === 'knight'));
    assert.doesNotMatch(styledName(state), /\bSir /);
    assert.equal(state.honoursDeclined.length, 1);
    state.prompts = [];
    assert.equal(honoursList(always(ctx), { offer: true }), null, 'not asked again so soon');
  },
  'accepting makes you Sir; asking for a lesser grade gives letters, no title'() {
    const a = life({}, 6);
    grandee(a.state);
    honoursList(always(a.ctx), { offer: true });
    const q = a.state.prompts.find((p) => p.type === 'honours.offer');
    a.engine.resolvePrompt(q.id, 'accept');
    assert.match(styledName(a.state), /\bSir /);
    const b = life({}, 7);
    grandee(b.state);
    honoursList(always(b.ctx), { offer: true });
    const q2 = b.state.prompts.find((p) => p.type === 'honours.offer');
    assert.ok(q2.options.some((o) => o.id === 'lesser'), q2.options.map((o) => o.id).join(','));
    b.engine.resolvePrompt(q2.id, 'lesser');
    assert.doesNotMatch(styledName(b.state), /\bSir /);
    assert.match(postNominals(b.state), /CBE/);
  },
  'a military OBE and a civil CBE are one order: the CBE replaces the OBE; the DSO stands apart, and the letters follow'() {
    const { state, ctx } = life({}, 8);
    state.military.history.push({ nation: 'GB', branch: 'army' });
    awardMedal(ctx, 'legionOfMerit', { branch: 'army', citation: 'Staff work.' });
    awardMedal(ctx, 'dsm', { branch: 'army', citation: 'Command in action.' });
    assert.ok(state.honors.some((h) => h.order === 'Order of the British Empire' && h.grade === 1));
    state.character.age = 50;
    award(ctx, 'GB', tier('GB', 'cbe'));
    const obe = state.honors.filter((h) => h.order === 'Order of the British Empire');
    assert.equal(obe.length, 1, 'one grade of the order');
    assert.equal(obe[0].tier, 'cbe');
    assert.match(postNominals(state), /CBE.*DSO/);
    // A lower grade isn't added beside a higher one.
    assert.equal(addHonor(state, { id: 'x', source: 'military', name: 'MBE (Military)', order: 'Order of the British Empire', grade: 0 }), false);
  },
  'France: the Ordre national du Mérite and the Légion d\'honneur are separate orders, both kept'() {
    const { state, ctx } = life({ countryId: 'FR' }, 9);
    state.character.age = 50;
    award(ctx, 'FR', tier('FR', 'onm'));
    award(ctx, 'FR', tier('FR', 'lhc'));
    assert.ok(state.honors.some((h) => h.tier === 'onm'), 'the ONM stays');
    award(ctx, 'FR', tier('FR', 'lho'));
    assert.ok(!state.honors.some((h) => h.tier === 'lhc'), 'promoted within the Légion');
    assert.ok(state.honors.some((h) => h.tier === 'lho'));
  },
  'returning a knighthood drops "Sir"; the Orders card lists orders apart from medals'() {
    const { engine, state, ctx } = life({}, 10);
    state.character.age = 60;
    award(ctx, 'GB', tier('GB', 'knight'));
    assert.match(styledName(state), /\bSir /);
    const html = VIEWS.honors(state, {});
    assert.match(html, /class="order-row"/);
    assert.match(html, /Order of the British Empire/);
    state.prompts = [];
    engine.dispatch('honours.renounce', 'order.GB.knight');
    assert.doesNotMatch(styledName(state), /\bSir /);
    assert.match(VIEWS.honors(state, {}), /Returned/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} honours test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} honours tests passed`);
