/**
 * The Order of St John: St John Ambulance service and the Service Medal, nomination and
 * promotion (letters, no "Sir"), the Governor-General as Prior, royals and the Sovereign
 * Head, gifts to the Eye Hospital, and the Protestant Alliance orders.
 *
 *   node tests/stjohn.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { styledName, postNominals } from '../src/modules/world/Honours.js';
import { prioryOf, gradeName, allianceCheck } from '../src/modules/world/StJohn.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(opts = {}, seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'GB', ...opts });
  state.legal.record = [];
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
const mod = MODULES.find((m) => m.id === 'stJohn');

const tests = {
  'St John Ambulance: the Service Medal at ten years, then nomination to the Order'() {
    const { engine, state } = life({ gender: 'female' }, 4);
    year(engine, state, 30);
    state.prompts = [];
    engine.dispatch('emergency.join', 'ambulance');
    const amb = state.emergency.ambulance;
    assert.ok(amb, 'joined St John Ambulance');
    Object.assign(amb, { years: 9, rankIndex: 3 });
    for (let i = 0; i < 25 && !state.stJohn; i++) { year(engine, state, 1); state.legal.record = []; }
    assert.ok(state.honors.some((h) => h.id === 'stJohn.serviceMedal'), 'the Service Medal');
    assert.ok(state.stJohn, 'nominated to the Order');
    assert.match(postNominals(state), /[MOC]StJ/);
    assert.match(VIEWS.civic(state, {}), /Order of St John/);
  },
  'a Dame of St John writes DStJ but is not styled Dame'() {
    const { state, ctx } = life({ gender: 'female' }, 6);
    state.character.age = 50;
    state.stJohn = { order: 'venerable', grade: 'commander', since: 30, priory: prioryOf(state), office: null };
    state.flags.stJohnGiving = 1e6;
    for (let i = 0; i < 40 && state.stJohn.grade !== 'knight'; i++) { state.character.birthYear -= 1; mod.onAgeUp(ctx); }
    assert.equal(state.stJohn.grade, 'knight');
    assert.match(gradeName(state), /^Dame of (Grace|Justice) of the Order of St John$/);
    assert.match(postNominals(state), /DStJ/);
    assert.doesNotMatch(styledName(state), /^Dame /);
  },
  'Scotland has its own priory'() {
    const { state } = life({}, 3);
    state.character.regionId = 'edinburgh';
    assert.equal(prioryOf(state), 'the Priory of Scotland');
  },
  'the Governor-General of Australia is Prior, and stops being Prior with the term'() {
    const { state, ctx } = life({ countryId: 'AU', gender: 'male' }, 7);
    state.character.age = 60;
    state.world.viceRegal = { au_gg: { postId: 'au_gg', you: true } };
    mod.onAgeUp(ctx);
    assert.equal(state.stJohn?.office, 'prior');
    assert.equal(state.stJohn.priory, 'the Priory of Australia');
    assert.match(gradeName(state), /Knight of Justice/);
    state.world.viceRegal.au_gg.you = false;
    mod.onAgeUp(ctx);
    assert.equal(state.stJohn.office, null);
    assert.equal(state.stJohn.grade, 'knight', 'keeps the grade');
  },
  'royals are Knights of Justice; the monarch is Sovereign Head'() {
    const { engine, state, ctx } = life({ royalLevel: 'child', gender: 'male' }, 4);
    year(engine, state, 22);
    assert.ok(state.royal);
    assert.match(gradeName(state) ?? '', /Knight of Justice/);
    state.royal.reigning = true;
    mod.onAgeUp(ctx);
    assert.equal(state.stJohn.office, 'sovereign');
    assert.ok(state.honors.some((h) => h.id === 'stJohn.office.sovereign'));
    assert.equal(postNominals(state), '', 'a monarch uses no letters');
  },
  'gifts to the Eye Hospital lead to an invitation'() {
    const { engine, state } = life({}, 8);
    year(engine, state, 40);
    state.stJohn = null;
    state.finances.cash = 1e6;
    for (let i = 0; i < 5; i++) { state.prompts = []; engine.dispatch('stJohn.give', 10000); year(engine, state, 1); state.finances.cash = 1e6; state.legal.record = []; }
    assert.ok(state.flags.stJohnGiving >= 25000);
    for (let i = 0; i < 10 && !state.stJohn; i++) { year(engine, state, 1); state.legal.record = []; }
    assert.ok(state.stJohn, 'admitted');
    assert.ok(['officer', 'commander'].includes(state.stJohn.grade));
  },
  'the Johanniterorden: Protestant men, Ehrenritter then Rechtsritter; Sweden asks for noble birth'() {
    const { engine, state, ctx } = life({ countryId: 'DE', gender: 'male' }, 9);
    year(engine, state, 35);
    state.community.faith = { traditionId: 'lutheran', congregation: 'St. Marien', attendance: 'regular', joinedAge: 0, raised: true };
    state.stJohn = null;
    const check = allianceCheck(state);
    assert.ok(check.ok, check.reason);
    const chance = ctx.rng.chance;
    ctx.rng.chance = () => true;
    state.prompts = [];
    engine.dispatch('stJohn.joinAlliance');
    ctx.rng.chance = chance;
    assert.equal(state.stJohn?.order, 'DE');
    assert.equal(gradeName(state), 'Ehrenritter des Johanniterordens');
    for (let i = 0; i < 20 && state.stJohn.grade === 'honour'; i++) year(engine, state, 1);
    assert.equal(state.stJohn.grade, 'justice');
    const se = life({ countryId: 'SE', gender: 'male' }, 9);
    se.state.character.age = 35;
    se.state.community.faith = { traditionId: 'lutheran', congregation: 'Storkyrkan', attendance: 'regular', joinedAge: 0, raised: true };
    assert.equal(allianceCheck(se.state).reason, 'Of noble birth');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} Order of St John test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} Order of St John tests passed`);
