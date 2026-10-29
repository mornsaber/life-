/**
 * The crime system: visible cases and counterplay, the youth court, corruption, the drug supply
 * chain, violence and guilt, gangs, crimes against you, justice-career casework and the Legal views.
 *
 *   node tests/crimesystem.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS, SECTIONS } from '../src/ui/Renderer.js';
import { OFFENSES } from '../src/modules/legal/Offenses.js';
import { commitOffense } from '../src/modules/legal/JusticeSystem.js';
import { drugsOf, PRODUCTS, priceHere } from '../src/modules/crime/Drugs.js';
import { corruptionOf, drugLawOf, CORRUPTION } from '../src/modules/crime/CrimeWorld.js';
import { COUNTRIES } from '../src/modules/world/Countries.js';
import { outfitsHere, meOf } from '../src/modules/legal/Underworld.js';
import { gangsTick } from '../src/modules/crime/Gangs.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life({ seed = 3, age = 25, countryId } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife(countryId ? { countryId } : {});
  state.character.age = age;
  state.prompts = [];
  state.legal.record = [];
  state.finances.cash = 2_000_000;
  return { engine, state, ctx: engine.context() };
}
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };
const rig = (engine, value, fn) => { const c = engine.rng.chance; engine.rng.chance = () => value; try { return fn(); } finally { engine.rng.chance = c; } };
const answer = (engine, state, type, option) => { const p = state.prompts.find((x) => x.type === type); assert.ok(p, `prompt ${type} (have ${state.prompts.map((x) => x.type).join(', ')})`); engine.resolvePrompt(p.id, option); };
const mod = MODULES.find((m) => m.id === 'crime');

const tests = {
  'every country has corruption and drug laws; new offences are well-formed'() {
    for (const cc of Object.keys(COUNTRIES)) {
      const c = corruptionOf(cc);
      assert.ok(c > 0 && c < 1, `${cc} corruption ${c}`);
      assert.ok(drugLawOf(cc).mult > 0, cc);
    }
    assert.ok(CORRUPTION.DK < CORRUPTION.MX && drugLawOf('SG').death && !drugLawOf('PT').death);
    for (const id of ['murder', 'firstDegreeMurder', 'manslaughter', 'kidnapping', 'rape', 'sexualAssault', 'childSexualAbuse', 'drugTrafficking', 'drugImportation', 'witnessIntimidation', 'obstruction', 'briberyOfficer', 'joyriding']) assert.ok(OFFENSES[id], id);
    for (const o of Object.values(OFFENSES)) if (o.sexual) assert.ok(o.registry && o.noSeal && o.violent, o.name);
  },

  'Legal has Status, Cases, Crime and Underworld tabs, and they render'() {
    const legal = SECTIONS.find((s) => s.id === 'legal');
    assert.deepEqual(legal.tabs.map((t) => t.id), ['legal', 'cases', 'crime', 'underworld']);
    const { state } = life({ age: 15 });
    for (const v of ['legal', 'cases', 'crime', 'underworld', 'activities']) clean(VIEWS[v](state, {}));
    assert.match(VIEWS.crime(state, {}), /Growing up wrong/);
    assert.doesNotMatch(VIEWS.activities(state, {}), /Risky Business/);
  },

  'an offence opens a visible case with an agency, a lead and evidence; counterplay changes it'() {
    const { engine, state, ctx } = life();
    state.people.list.push({ id: 'f1', firstName: 'Sam', lastName: 'Lee', relation: 'friend', alive: true, relationship: 100, birthYear: 1990 });
    commitOffense(ctx, { offenseId: 'burglary', discovery: 0.2, evidence: 0.8, context: 'doorbell camera footage' });
    const inv = state.legal.investigations[0];
    assert.ok(inv.id && inv.agency && inv.lead && inv.items.length >= 2, JSON.stringify(inv));
    assert.match(inv.agency, /police/);
    const before = inv.evidence;
    rig(engine, false, () => engine.dispatch('crime.destroyEvidence', inv.id));
    assert.ok(inv.evidence < before, `${inv.evidence} < ${before}`);
    rig(engine, true, () => engine.dispatch('crime.alibi', inv.id));
    assert.equal(inv.alibi, 'Sam');
    engine.dispatch('crime.lawyerUp', inv.id);
    assert.ok(inv.lawyer);
    clean(VIEWS.cases(state, {}));
    assert.match(VIEWS.cases(state, {}), /Residential Burglary/);
    // A federal crime goes to the national agency; tax to the tax authority.
    commitOffense(ctx, { offenseId: 'taxEvasion', discovery: 0.1, evidence: 0.7 });
    assert.match(state.legal.investigations.at(-1).agency, /IRS/);
    // At the warrant stage you hear about it.
    inv.discovery = 0.5;
    rig(engine, false, () => mod.onAgeUp({ ...ctx, crimeRng: engine.rng }));
    answer(engine, state, 'crime.warrant', 'surrender');
    assert.ok(!state.legal.investigations.includes(inv));
    assert.ok(state.prompts.some((p) => p.type === 'legal.court'));
  },

  'children go to youth court: diversion for a first offence, records sealed at 18'() {
    const { engine, state, ctx } = life({ age: 14 });
    commitOffense(ctx, { offenseId: 'shoplifting', caught: true, evidence: 0.9 });
    answer(engine, state, 'legal.juvenile', 'admit');
    assert.equal(state.legal.record.length, 0, 'diversion: no record');
    commitOffense(ctx, { offenseId: 'burglary', caught: true, evidence: 0.9 });
    rig(engine, true, () => answer(engine, state, 'legal.juvenile', 'deny'));
    assert.ok(state.legal.record[0]?.juvenile, JSON.stringify(state.legal.record));
    state.legal.incarceration = null;
    state.character.age = 18;
    mod.onAgeUp({ ...ctx, crimeRng: engine.rng });
    assert.ok(state.legal.record[0].sealed, 'sealed at 18');
    // At 17 a killing can go to adult court.
    const b = life({ age: 17, seed: 9 });
    rig(b.engine, true, () => commitOffense(b.ctx, { offenseId: 'murder', caught: true, evidence: 0.9 }));
    assert.ok(b.state.prompts.some((p) => p.type === 'legal.court'), 'waived to adult court');
  },

  'corruption: a roadside bribe where police take money; nothing to offer where they don\'t'() {
    const mx = life({ countryId: 'MX' });
    commitOffense(mx.ctx, { offenseId: 'drugPossession', caught: true, evidence: 0.8 });
    rig(mx.engine, true, () => answer(mx.engine, mx.state, 'crime.roadside', 'pay'));
    assert.ok(!mx.state.prompts.some((p) => p.type === 'legal.court'), 'paid off');
    const dk = life({ countryId: 'DK' });
    commitOffense(dk.ctx, { offenseId: 'drugPossession', caught: true, evidence: 0.8 });
    assert.ok(!dk.state.prompts.some((p) => p.type === 'crime.roadside'));
    // A detective on the payroll slows your cases.
    const { engine, state, ctx } = life({ countryId: 'MX' });
    state.legal.crime = { heat: 30, skill: {}, earned: 0, layingLow: false };
    rig(engine, true, () => engine.dispatch('crime.payrollCop'));
    assert.ok(state.legal.crime.cop);
    commitOffense(ctx, { offenseId: 'burglary', discovery: 0.4, evidence: 0.8 });
    rig(engine, false, () => mod.onAgeUp({ ...ctx, crimeRng: engine.rng }));
    assert.ok(state.legal.investigations[0].discovery < 0.4);
  },

  'the drug supply chain: buy, cut, sell, runners, labs and imports'() {
    const { engine, state, ctx } = life();
    assert.ok(priceHere(state, 'cocaine', 'retail') > priceHere(state, 'cocaine'));
    assert.ok(priceHere({ character: { countryId: 'CO' } }, 'cocaine') < priceHere({ character: { countryId: 'AU' } }, 'cocaine'));
    engine.dispatch('crime.drugBuy', 'cocaine:kilo');
    assert.equal(drugsOf(state).stash, 0, 'needs rep for a kilo');
    engine.dispatch('crime.drugBuy', 'cocaine:ounce');
    const d = drugsOf(state);
    assert.equal(d.product, 'cocaine');
    engine.dispatch('crime.drugCut', 'cut');
    assert.ok(d.stash > 0.25 && d.purity < 0.85);
    rig(engine, false, () => engine.dispatch('crime.drugSell', 'street'));
    assert.ok(d.sold > 0 && state.legal.crime.dirty > 0);
    state.legal.crime.rep = 60;
    engine.dispatch('crime.drugBuy', 'cocaine:weight');
    state.yearly = {};
    engine.dispatch('crime.drugRunners', 4);
    assert.equal(d.runners, 4);
    const sold = d.sold;
    rig(engine, false, () => mod.onAgeUp({ ...ctx, crimeRng: engine.rng }));
    assert.ok(d.sold > sold, 'runners sold');
    engine.dispatch('crime.drugImport', 'cocaine');
    assert.ok(d.shipment);
    const stash = d.stash;
    rig(engine, false, () => mod.onAgeUp({ ...ctx, crimeRng: engine.rng }));
    assert.ok(d.stash > stash, 'shipment landed');
    // Caught with weight: trafficking.
    state.yearly = {};
    rig(engine, true, () => engine.dispatch('crime.drugSell', 'street'));
    const court = state.prompts.find((p) => p.type === 'legal.court');
    assert.equal(court?.data.offenseId, 'drugTrafficking');
    clean(VIEWS.crime(state, {}));
    // A lab produces.
    const b = life({ seed: 11 });
    b.engine.dispatch('crime.drugLab', 'grow');
    rig(b.engine, false, () => mod.onAgeUp({ ...b.ctx, crimeRng: b.engine.rng }));
    assert.ok(drugsOf(b.state).stash >= 10);
    for (const id of Object.keys(PRODUCTS)) assert.ok(priceHere(b.state, id) > 0, id);
  },

  'violence: confrontations can kill, and guilt follows'() {
    const { engine, state } = life();
    state.legal.crime = { heat: 0, skill: {}, earned: 0, layingLow: false, armed: 'gun' };
    state.prompts.push({ id: 'pc', type: 'crime.confrontation', icon: '⚠️', title: 'x', text: 'x', options: [{ id: 'walk', label: 'w' }, { id: 'fight', label: 'f' }, { id: 'weapon', label: 'g' }], data: {} });
    const next = engine.rng.next;
    engine.rng.next = () => 0.99;
    engine.resolvePrompt('pc', 'weapon');
    engine.rng.next = next;
    assert.ok(state.legal.crime.guilt >= 30);
    answer(engine, state, 'crime.aftermath', 'run');
    assert.equal(state.legal.investigations.at(-1).offenseId, 'murder');
    clean(VIEWS.crime(state, {}));
  },

  'gangs recruit children; outfits tax your corners'() {
    const { engine, state, ctx } = life({ age: 13 });
    outfitsHere(state, engine.rng);
    rig(engine, true, () => gangsTick(ctx));
    answer(engine, state, 'crime.recruit', 'yes');
    assert.ok(state.legal.crime.youthGang);
    state.character.age = 16;
    state.legal.crime.youthGang.outfitId = outfitsHere(state)[0].id;
    state.prompts = [];
    rig(engine, false, () => mod.onAgeUp({ ...ctx, crimeRng: engine.rng }));
    answer(engine, state, 'crime.jumpIn', 'yes');
    assert.ok(meOf(state), 'a member at 16');
  },

  'crimes against you, including sexual assault, are handled as a victim'() {
    for (const [id, option] of [['sexualAssault', 'report'], ['sexualAssault', 'support'], ['burglary', 'report'], ['mugging', 'ignore']]) {
      const { engine, state } = life();
      state.prompts.push({ id: 'v', type: 'crime.victim', icon: '🚨', title: 'x', text: 'x', options: [{ id: option, label: option }], data: { id, offender: 'A Person', loss: 500 } });
      engine.resolvePrompt('v', option);
      assert.ok(!state.prompts.some((p) => p.id === 'v'));
      assert.ok(!state.legal.record.length, 'never the player\'s record');
    }
  },

  'domestic abuse: control and assault cost the relationship, open cases, and drive partners away'() {
    const { engine, state } = life({ countryId: 'GB' });
    state.people.list.push({ id: 'p1', firstName: 'Alex', lastName: 'Reed', relation: 'spouse', alive: true, relationship: 80, ageOffset: 0 });
    rig(engine, false, () => engine.dispatch('crime.abusePartner', 'control'));
    const alex = state.people.list.find((p) => p.id === 'p1');
    assert.ok(alex.relationship < 80);
    assert.ok(state.legal.investigations.some((i) => i.offenseId === 'domesticAbuse'), 'coercive control is a crime in England');
    rig(engine, false, () => engine.dispatch('crime.abusePartner', 'assault'));
    assert.equal(state.legal.crime.abuse.incidents, 2);
    assert.ok(state.legal.crime.guilt > 0);
    clean(VIEWS.crime(state, {}));
    assert.match(VIEWS.crime(state, {}), /perpetrator programme/);
    engine.dispatch('crime.abuseProgramme');
    assert.equal(state.legal.crime.abuse.programme, 1);
    // Enough of it and they leave, with a protective order.
    state.yearly = {};
    rig(engine, true, () => engine.dispatch('crime.abusePartner', 'assault'));
    assert.notEqual(alex.relation, 'spouse');
    assert.ok(state.legal.flags.protectiveOrder != null);
  },

  'going straight: convictions become spent after crime-free years; weak cases are dropped; cases go cold'() {
    const { engine, state, ctx } = life({ countryId: 'GB' });
    state.legal.record.push({ offenseId: 'burglary', name: 'Residential Burglary', severity: 'felony', age: 24, sentence: '2 yr prison' });
    state.legal.record.push({ offenseId: 'assault', name: 'Assault', severity: 'misdemeanor', age: 23, sentence: 'fine' });
    state.character.age = 25;
    engine.dispatch('crime.goStraight');
    assert.equal(state.legal.crime.straightSince, 25);
    state.character.age = 29;
    MODULES.find((m) => m.id === 'legal').onAgeUp({ ...ctx });
    assert.ok(!state.legal.record[0].spent, 'a felony needs 7 crime-free years');
    state.character.age = 31;
    state.legal.incarceration = null;
    MODULES.find((m) => m.id === 'legal').onAgeUp({ ...ctx });
    assert.ok(state.legal.record[0].spent, 'spent');
    assert.ok(!state.legal.record[1].spent, 'violence is never spent');
    clean(VIEWS.legal(state, {}));
    // A thin case usually never reaches court.
    let dropped = 0;
    for (let i = 0; i < 40; i++) { state.prompts = []; commitOffense(ctx, { offenseId: 'vandalism', caught: true, evidence: 0.3 }); if (!state.prompts.length) dropped += 1; }
    assert.ok(dropped >= 8, `dropped ${dropped}/40`);
    // An unsolved case mostly stays unsolved.
    let solved = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const b = life({ seed });
      commitOffense(b.ctx, { offenseId: 'burglary', discovery: 0.12, evidence: 0.75 });
      for (let y = 0; y < 8; y++) { b.state.prompts = []; MODULES.find((m) => m.id === 'legal').onAgeUp(b.ctx); if (!b.state.legal.investigations.length) break; }
      if (b.state.legal.record.length || b.state.prompts.some((p) => /legal\./.test(p.type))) solved += 1;
    }
    assert.ok(solved <= 20, `solved ${solved}/60`);
  },

  'justice careers get hard cases'() {
    const { engine, state, ctx } = life();
    state.career.job = { professionId: 'prosecution', levelId: 'x', employer: { name: 'DA' }, abilities: [], grade: 2 };
    rig(engine, true, () => mod.onAgeUp({ ...ctx, crimeRng: engine.rng }));
    const p = state.prompts.find((x) => x.type === 'crime.casework');
    assert.ok(p, state.prompts.map((x) => x.type).join(','));
    engine.resolvePrompt(p.id, p.options[0].id);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} crime-system test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} crime-system tests passed`);
