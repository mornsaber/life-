/**
 * Courts abroad: each country's own bench — appointed from senior lawyers (England,
 * Scotland, Ireland, Australia…), a career entered by exam and a judges' school (France's
 * ENM, Germany, Italy, Spain, Japan…), or elected (Mexico) — plus lay benches.
 *
 *   node tests/courts.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { courtsHere, courtDef, courtTitle, benchEligibility, examEligibility, layEligibility, currentCourt } from '../src/modules/legal/Judiciary.js';
import { ABROAD_COURTS, BENCHES } from '../src/modules/legal/CourtsAbroad.js';
import { COUNTRIES } from '../src/modules/world/Countries.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { localizeHtml } from '../src/modules/world/Countries.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function lawyer(countryId, { age = 30, seed = 3, practice = 0, regionId } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  if (regionId) state.character.regionId = regionId;
  state.character.age = age;
  Object.assign(state.stats, { smarts: 95, health: 90, happiness: 70 });
  state.legal.record = [];
  state.prompts = [];
  state.education.degrees.push({ type: 'professional', programId: 'jd', level: 'professional', country: countryId });
  state.credentials.held.barLicense = { status: 'active', earnedAge: age - practice };
  if (practice) state.career.history.push({ professionId: 'law', startAge: age - practice, endAge: age, title: 'Lawyer' });
  return { engine, state, ctx: engine.context() };
}
const years = (engine, state, n) => { for (let i = 0; i < n; i++) { state.prompts = []; engine.ageUp(); } };

const tests = {
  'every country abroad has its own ladder; no US courts'() {
    for (const cc of Object.keys(COUNTRIES).filter((c) => c !== 'US')) {
      const { state } = lawyer(cc);
      const ids = courtsHere(state);
      assert.ok(ids.length >= 3, cc);
      assert.ok(ids.every((id) => courtDef(id)?.system === 'national'), `${cc}: ${ids}`);
    }
    const us = lawyer('US');
    assert.ok(courtsHere(us.state).includes('scotus'));
  },
  'France: the ENM concours, three years at Bordeaux, then a seat — and seniority after'() {
    const { engine, state } = lawyer('FR', { age: 25 });
    assert.ok(examEligibility(state).ok);
    for (let i = 0; i < 20 && !state.judiciary.school; i++) { state.yearly = {}; engine.dispatch('judiciary.sitExam'); }
    assert.ok(state.judiciary.school, 'admitted to the ENM');
    assert.match(state.judiciary.school.name, /École nationale de la magistrature/);
    years(engine, state, 3);
    assert.equal(currentCourt(state), 'FR.juge', 'first post');
    years(engine, state, 12);
    assert.ok(courtDef(currentCourt(state)).rank >= 2, 'promoted by seniority');
    const old = lawyer('FR', { age: 40, seed: 4 });
    assert.equal(examEligibility(old.state).ok, false, 'too old without practice');
    const second = lawyer('FR', { age: 40, seed: 5, practice: 6 });
    assert.ok(examEligibility(second.state).ok, 'the second concours, after years of practice');
  },
  'Germany: straight onto the bench as Richter auf Probe, then Amtsgericht'() {
    const { engine, state } = lawyer('DE', { age: 27, seed: 6 });
    for (let i = 0; i < 20 && !currentCourt(state); i++) { state.yearly = {}; engine.dispatch('judiciary.sitExam'); }
    assert.equal(currentCourt(state), 'DE.probe');
    years(engine, state, 6);
    assert.ok(['DE.amtsgericht', 'DE.landgericht'].includes(currentCourt(state)), currentCourt(state));
    assert.equal(benchEligibility(state, 'DE.bgh').ok, false, 'the BGH is elected by the Richterwahlausschuss after long service');
  },
  'England: Recorder alongside practice; the High Court brings a knighthood'() {
    const { ctx, state, engine } = lawyer('GB', { age: 45, seed: 7, practice: 15, regionId: 'london' });
    assert.ok(benchEligibility(state, 'GB.recorder').ok);
    assert.equal(benchEligibility(state, 'GB.high').ok, false, 'not straight to the High Court');
    void ctx;
    state.judiciary.seat = { court: 'GB.circuit', since: 40, termLeft: 0, reputation: 80, approval: 60, rulings: 0, reversals: 0 };
    assert.ok(benchEligibility(state, 'GB.high').ok);
    engine.resolvePrompt?.call; // (no-op)
    const r = MODULES.find((m) => m.id === 'judiciary').resolvers.nomination;
    for (let i = 0; i < 20 && currentCourt(state) !== 'GB.high'; i++) r(engine.context(), { court: 'GB.high', method: 'appointed' }, 'accept');
    assert.equal(currentCourt(state), 'GB.high');
    assert.ok(state.honors.some((h) => /Knight Bachelor|Dame Commander/.test(h.name)));
    assert.ok(['Sir', 'Dame'].includes(state.character.style.prefix));
    assert.match(courtTitle(state, 'GB.appeal'), /Lord|Lady/);
  },
  'Scotland has sheriffs, not district judges'() {
    const { state } = lawyer('GB', { regionId: 'edinburgh', practice: 12, age: 45 });
    assert.ok(courtsHere(state).includes('GB-SCT.sheriff'));
    assert.ok(!courtsHere(state).includes('GB.districtJudge'));
  },
  'lay benches: a magistrate keeps the day job; no law degree needed'() {
    const { engine, state } = lawyer('GB', { age: 35, seed: 9, regionId: 'manchester' });
    delete state.credentials.held.barLicense;
    state.education.degrees = [];
    assert.ok(layEligibility(state).ok);
    for (let i = 0; i < 20 && !state.judiciary.lay; i++) { state.yearly = {}; engine.dispatch('judiciary.applyLay'); }
    assert.ok(state.judiciary.lay);
    years(engine, state, 1);
    assert.ok(state.judiciary.lay.sittings >= 13);
    const html = localizeHtml(VIEWS.legal?.(state) ?? '', COUNTRIES.GB);
    assert.ok(typeof html === 'string');
  },
  'judges must be citizens'() {
    const { state } = lawyer('GB', { age: 45, practice: 15 });
    state.character.citizenships = ['US'];
    assert.equal(benchEligibility(state, 'GB.recorder').ok, false);
  },
  'every ladder is well formed'() {
    for (const [id, c] of Object.entries(ABROAD_COURTS)) {
      assert.ok(c.salary >= 0 && c.icon && c.name, id);
      if (c.next) assert.ok(ABROAD_COURTS[c.next], `${id} → ${c.next}`);
      if (c.pick === 'seniority') assert.ok(c.after > 0, id);
    }
    for (const [cc, b] of Object.entries(BENCHES)) if (b.route === 'career') assert.ok(b.school, cc);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} court test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} court tests passed`);
