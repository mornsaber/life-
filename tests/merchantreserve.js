/**
 * The merchant marine as a wartime reserve, and the maritime academies' faculty.
 *
 *   node tests/merchantreserve.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { reserveStanding, ssoEligibility, isSso, SSO_MOS } from '../src/modules/military/MerchantReserve.js';
import { commutes } from '../src/modules/transit/Transit.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { UNIVERSITIES } from '../src/modules/education/Universities.js';
import { jobInsignia } from '../src/ui/Insignia.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(cc = 'US', seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, gender: 'female' });
  state.character.age = 40;
  state.prompts = [];
  return { engine, state };
}
function job(engine, state, professionId, levelId) {
  const ctx = engine.context();
  const p = getProfession(professionId);
  hire(ctx, { professionId, levelId, employer: createEmployer(ctx.rng, state, p, state.character.regionId) });
}
const war = (state, cc, extra = {}) => { state.world.wars = { [cc]: { operation: 'Operation Atlantic Shield', phase: 'active', intensity: 3, mobilized: true, ...extra } }; };

const tests = {
  'an ordinary life is not in the reserve'() {
    const { state } = life();
    assert.equal(reserveStanding(state), null);
  },
  'academy staff hold an active commission in peacetime; seafarers are inactive'() {
    const { engine, state } = life();
    job(engine, state, 'maritimeFaculty', 'superintendent');
    const s = reserveStanding(state);
    assert.equal(s.rank.title, 'Rear Admiral');
    assert.equal(s.name, 'U.S. Maritime Service');
    assert.ok(s.active);
    const b = life('US', 6);
    job(b.engine, b.state, 'merchantMarine', 'able');
    const t = reserveStanding(b.state);
    assert.ok(t && !t.active, 'a seafarer is on the books but inactive');
  },
  'in war a 74-year-old master is called up, sails, and is stood down with a medal'() {
    const { engine, state } = life('GB');
    state.character.age = 74;
    state.stats.health = 90;
    job(engine, state, 'merchantMarine', 'able');
    war(state, 'GB');
    let p = null;
    for (let i = 0; i < 20 && !p; i++) { engine.ageUp(); state.world.wars.GB.phase = 'active'; p = state.prompts.find((x) => x.type === 'merchantReserve.callup'); if (!p) state.prompts = []; if (!state.character.alive) return; }
    assert.ok(p, 'the call-up came');
    assert.match(p.text, /no age limit/);
    state.prompts = [p];
    engine.resolvePrompt(p.id, 'sail');
    assert.ok(state.merchantReserve.mobilized);
    state.prompts = [];
    engine.ageUp();
    if (!state.character.alive) return;
    assert.ok(state.merchantReserve.mobilized.voyages >= 1);
    delete state.world.wars.GB;
    state.prompts = [];
    engine.ageUp();
    if (!state.character.alive) return;
    assert.equal(state.merchantReserve.mobilized, null);
    assert.ok(state.honors.some((h) => /Merchant Navy War Service Medal/.test(h.name)));
  },
  'peace brings no call-up'() {
    const { engine, state } = life();
    job(engine, state, 'merchantMarine', 'able');
    for (let i = 0; i < 10; i++) engine.ageUp();
    assert.ok(!state.prompts.some((x) => x.type === 'merchantReserve.callup'));
  },
  'maritime academies are named, faculty sit in academia, and the views render'() {
    for (const id of ['usmma', 'warsash', 'kmou', 'pmma', 'makarov']) assert.ok(UNIVERSITIES[id], id);
    const { engine, state } = life();
    job(engine, state, 'maritimeFaculty', 'commandant');
    assert.ok(jobInsignia(state.career.job, getProfession('maritimeFaculty'), 'US'));
    war(state, 'US');
    for (const v of ['career', 'military', 'academia']) if (VIEWS[v]) assert.match(VIEWS[v](state), /./);
    assert.match(VIEWS.career(state), /Merchant Marine Reserve/);
  },
  'a licensed mariner takes a Navy Reserve commission as a Strategic Sealift Officer, and keeps sailing'() {
    const { engine, state } = life('US', 7);
    state.character.age = 34;
    for (const id of ['twic', 'mmc', 'stcw', 'mateLicense', 'chiefMateLicense']) state.credentials.held[id] = { earnedAge: 25, renewedAge: 33, status: 'active' };
    job(engine, state, 'merchantMarine', 'chiefMate');
    assert.ok(ssoEligibility(state).ok, JSON.stringify(ssoEligibility(state)));
    state.prompts = [];
    MODULES.find((m) => m.id === 'merchantReserve').onAgeUp(engine.context());
    const q = state.prompts.find((p) => p.type === 'merchantReserve.sso');
    assert.ok(q, 'offered a commission');
    engine.resolvePrompt(q.id, 'accept');
    const svc = state.military.service;
    assert.equal(svc?.mos, SSO_MOS);
    assert.equal(svc.component, 'reserve');
    assert.ok(svc.grade >= 2, `a chief mate comes in as a lieutenant (grade ${svc.grade})`);
    assert.equal(state.career.job?.professionId, 'merchantMarine', 'still sailing');
    assert.ok(isSso(state) && reserveStanding(state).sso);
    assert.ok(!commutes(state), 'seafarers do not commute');
    // The military reserve runs the year: sealift drills, not land navigation.
    state.prompts = [];
    engine.ageUp();
    assert.ok(state.military.service, 'still in the reserve');
    const html = VIEWS.military(state, {});
    assert.match(html, /Strategic Sealift Officer/);
    assert.doesNotMatch(html, /NaN|undefined/);
    // No second, civilian call-up runs alongside the Navy's.
    war(state, 'US');
    state.prompts = [];
    MODULES.find((m) => m.id === 'merchantReserve').onAgeUp(engine.context());
    assert.ok(!state.prompts.some((p) => p.type === 'merchantReserve.callup'));
  },
  'no commission without a licence or an academy degree; and only up to 42'() {
    const { engine, state } = life('US', 8);
    state.character.age = 30;
    for (const id of ['twic', 'mmc', 'stcw']) state.credentials.held[id] = { earnedAge: 22, renewedAge: 29, status: 'active' };
    job(engine, state, 'merchantMarine', 'able');
    assert.ok(!ssoEligibility(state).ok);
    state.credentials.held.mateLicense = { earnedAge: 29, renewedAge: 29, status: 'active' };
    assert.ok(ssoEligibility(state).ok);
    state.character.age = 45;
    assert.ok(!ssoEligibility(state).ok);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed++; console.log(`  ✘ ${name}\n    ${e.stack}`); }
}
if (failed) { console.log(`✘ ${failed} merchant reserve test(s) failed`); process.exit(1); }
console.log(`✔ All ${Object.keys(tests).length} merchant reserve tests passed`);
