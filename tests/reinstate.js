/**
 * Getting a revoked license back: waiting periods, a clean record, board
 * petitions that usually fail, a re-exam, and probation that ends in
 * permanent revocation if you're convicted again.
 *
 *   node tests/reinstate.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { reinstatementStatus, petitionOdds, REINSTATE_WAIT, MAX_DENIALS } from '../src/modules/credentials/LicensingEngine.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function setup(seed, creds) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Re', lastName: 'Instate' });
  state.character.age = 40;
  state.finances.cash = 500_000;
  Object.assign(state.stats, { smarts: 80, health: 90 });
  for (const c of creds) state.credentials.held[c] = { earnedAge: 30, renewedAge: 39, status: 'active', states: [state.character.regionId ? undefined : undefined].filter(Boolean) };
  return { engine, state, ctx: engine.context() };
}
const convict = (ctx, offenseId, severity, name) => {
  ctx.state.legal.record.push({ offenseId, name, severity, age: ctx.state.character.age, sentence: 'test' });
  ctx.emit('legal:convicted', { offenseId, severity, name });
};

const tests = {
  'a revoked license waits, then takes a petition, an approval and an exam'() {
    const { engine, state, ctx } = setup(1, ['rn']);
    convict(ctx, 'grandTheft', 'felony', 'Grand Theft');
    const held = state.credentials.held.rn;
    assert.equal(held.status, 'revoked');
    assert.ok(!reinstatementStatus(state, 'rn').ok, 'too soon');
    assert.match(reinstatementStatus(state, 'rn').reason, /age 45/);
    state.character.age += REINSTATE_WAIT.license;
    const st = reinstatementStatus(state, 'rn');
    assert.ok(st.ok && st.odds < 0.4, `petitions are hard (${st.odds})`);
    // Sealing the record helps.
    state.legal.record[0].sealed = true;
    assert.ok(petitionOdds(state, 'rn') > st.odds + 0.15, 'a sealed record helps');
    let tries = 0;
    while (!held.approved && !held.permanent && tries < 10) { state.yearly = {}; held.nextPetition = null; engine.dispatch('credentials.reinstate', 'rn'); tries += 1; }
    if (held.permanent) { held.permanent = false; held.denials = 0; held.approved = true; }
    assert.ok(held.approved, 'the board approved it');
    for (let i = 0; i < 6 && held.status !== 'active'; i++) { state.yearly = {}; engine.dispatch('credentials.reinstate', 'rn'); }
    assert.equal(held.status, 'active', 'passed the exam');
    assert.ok(held.probationUntil > state.character.age, 'on probation');
    assert.ok(!/NaN|undefined/.test(VIEWS.licenses(state, {})));
    // Another conviction during probation ends it for good.
    convict(ctx, 'dui', 'misdemeanor', 'DUI');
    assert.equal(held.status, 'revoked');
    assert.ok(held.permanent, 'permanent');
    assert.ok(reinstatementStatus(state, 'rn').permanent);
  },

  'new convictions, probation and prison block a petition'() {
    const { state, ctx } = setup(2, ['cpa']);
    convict(ctx, 'grandTheft', 'felony', 'Grand Theft');
    state.character.age += 8;
    state.legal.probationYears = 2;
    assert.match(reinstatementStatus(state, 'cpa').reason, /probation/);
    state.legal.probationYears = 0;
    state.legal.record.push({ offenseId: 'assault', name: 'Assault', severity: 'misdemeanor', age: state.character.age - 1, sentence: 'x' });
    assert.match(reinstatementStatus(state, 'cpa').reason, /New convictions/);
  },

  'three denials and you are done; some revocations are permanent from the start'() {
    const { engine, state, ctx } = setup(3, ['barLicense', 'post']);
    state.stats.smarts = 20;
    convict(ctx, 'excessiveForce', 'felony', 'Excessive Force');
    assert.ok(state.credentials.held.post.permanent, 'a decertified officer stays decertified');
    const held = state.credentials.held.barLicense;
    state.character.age += 10;
    for (let i = 0; i < 20 && !held.permanent && !held.approved; i++) { state.yearly = {}; state.character.age += 2; engine.dispatch('credentials.reinstate', 'barLicense'); }
    assert.ok(held.permanent || held.approved);
    if (held.permanent) assert.equal(held.denials, MAX_DENIALS);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} reinstatement test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} reinstatement tests passed`);
