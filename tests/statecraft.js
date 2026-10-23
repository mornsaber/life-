/**
 * Styles of address, commemorative medals for past service, political ambassadors, staff
 * offices that grow with leadership (and a chief of staff who hires), non-royal nobility,
 * and Early Decision with the major you chose.
 *
 *   node tests/statecraft.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { styledName, postNominals } from '../src/modules/world/Honours.js';
import { officialStyle } from '../src/modules/world/Styles.js';
import { appointeeKind, offer } from '../src/modules/politics/Appointees.js';
import { staffBudget, positions } from '../src/modules/politics/Staffers.js';
import { mySeat, executiveOf } from '../src/modules/politics/Legislature.js';
import { estateOf } from '../src/modules/world/Nobility.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(opts = {}, seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US', ...opts });
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
const take = (state, ctx, cc, officeId) => {
  state.character.age = 50;
  state.character.citizenships = [cc];
  ctx.emit('politics:take', { officeId, appointed: true });
};

const tests = {
  'styles of address: the Rt Hon. for life, the Hon. in office, Excellency while serving, MP after the name'() {
    const ca = life({ countryId: 'CA' });
    take(ca.state, ca.ctx, 'CA', 'ca_gg');
    assert.match(styledName(ca.state), /^(His|Her) Excellency the Rt Hon\./);
    ca.ctx.emit('politics:leave', { reason: 'Retired' });
    assert.match(styledName(ca.state), /^The Rt Hon\./, 'for life');
    const au = life({ countryId: 'AU' });
    take(au.state, au.ctx, 'AU', 'au_mp');
    assert.match(styledName(au.state), /^The Hon\./);
    assert.match(postNominals(au.state), /\bMP\b/);
    const gb = life({ countryId: 'GB' });
    take(gb.state, gb.ctx, 'GB', 'gb_pm');
    assert.doesNotMatch(styledName(gb.state), /Excellency/, 'a Westminster prime minister is not "Excellency"');
    const us = life();
    take(us.state, us.ctx, 'US', 'usSenator');
    us.ctx.emit('politics:leave', { reason: 'Retired' });
    assert.match(styledName(us.state), /^The Honorable/);
    assert.ok(officialStyle(us.state).why.startsWith('former'));
  },
  'coronation and jubilee medals reach former office-holders'() {
    const { engine, state, ctx } = life({ countryId: 'CA' }, 3);
    year(engine, state, 2);
    take(state, ctx, 'CA', 'ca_lg');
    ctx.emit('politics:leave', { reason: 'Term ended' });
    state.career.job = null;
    const crown = state.world.crowns.GB;
    crown.crowned = false;
    crown.since = state.character.birthYear + state.character.age; // a coronation next year
    year(engine, state, 1);
    assert.ok(state.honors.some((h) => /Coronation Medal/.test(h.name) && /past service/.test(h.citation)), 'a former lieutenant governor is on the list');
  },
  'political ambassadors: donors of the governing party get offers; the job ends with the president'() {
    const { engine, state } = life({}, 9);
    year(engine, state, 45);
    state.finances.cash = 5e6;
    state.civic ??= {};
    state.civic.party = { bloc: executiveOf(state, 'national').caucus, role: 'member' };
    state.military.service = null;
    state.career.job = null;
    const kind = appointeeKind(state);
    assert.equal(kind, 'donor');
    // Force an offer and accept it.
    const ctx = engine.context();
    state.prompts = [];
    offer(ctx, { force: true });
    const q = state.prompts.find((p) => p.type === 'appointees.ambassador');
    ctx.rng.chance = () => true; // the Senate confirms
    assert.ok(q, 'an offer');
    {
      state.prompts = [q];
      engine.resolvePrompt(q.id, 'accept');
      assert.match(state.career.job?.title ?? '', /Ambassador|High Commissioner/);
      assert.ok(state.career.job.political);
      assert.match(styledName(state), /Excellency|Honorable/);
      state.career.job.political.under = 'Someone Else';
      state.prompts = [];
      engine.ageUp();
      assert.ok(!state.career.job?.political, 'a new president: the political ambassador resigns');
    }
  },
  'leadership posts bring a bigger office; a chief of staff can run hiring'() {
    const { engine, state, ctx } = life({ countryId: 'GB' }, 4);
    take(state, ctx, 'GB', 'gb_mp');
    const seat = mySeat(state);
    assert.ok(seat);
    const base = staffBudget(seat);
    seat.post = 'presiding';
    assert.ok(staffBudget(seat) > base);
    assert.ok(positions(seat).some((p) => p.role === 'parliamentarian'));
    seat.staff.push({ id: 'cos', role: 'chiefOfStaff', name: 'Pat Chief', skill: 85, bg: 'apparatchik', loyalty: 60, salary: 70000, years: 2 });
    state.prompts = [];
    engine.dispatch('staffers.delegate');
    assert.ok(seat.delegateHiring);
    assert.equal(seat.staff.length, staffBudget(seat), 'every funded post filled');
    // Losing the post shrinks the office.
    seat.post = null;
    year(engine, state, 1);
    assert.ok(seat.staff.length <= staffBudget(seat));
  },
  'a noble family: allowance, then the estate and its tax on succession'() {
    const { engine, state } = life({ countryId: 'GB', nobleRank: 'earl', nobleHeir: 'heir' }, 3);
    year(engine, state, 20);
    assert.ok(estateOf(state));
    const before = state.finances.lifetimeEarnings;
    year(engine, state, 1);
    assert.ok(state.finances.lifetimeEarnings > before, 'the family trust pays an allowance');
    const holder = state.people.list.find((p) => p.id === state.noble.holderId);
    holder.alive = false;
    state.prompts = [];
    engine.ageUp();
    const q = state.prompts.find((p) => p.type === 'nobility.succession');
    assert.ok(q, 'inheritance tax falls due');
    engine.resolvePrompt(q.id, 'exempt');
    assert.equal(estateOf(state).owner, 'you');
    assert.equal(estateOf(state).strategy, 'open');
    state.prompts = [];
    engine.dispatch('nobility.shoot');
    assert.match(VIEWS.politics(state, {}), /How the estate is run/);
  },
  'Early Decision uses the school and major you picked'() {
    const { engine, state } = life({}, 2);
    year(engine, state, 18);
    if (!state.education.degrees.some((d) => d.type === 'highschool')) state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18, gpa: 3.9 });
    state.education.enrolled = null;
    state.stats.smarts = 95;
    const ctx = engine.context();
    ctx.rng.chance = () => true;
    state.prompts = [];
    engine.dispatch('higherEd.earlyDecision', 'bachelor:state:history:full');
    assert.equal(state.education.enrolled?.major, 'history');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} statecraft test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} statecraft tests passed`);
