/**
 * Offices and appointments: who advises on the Crown's representatives (a
 * premier on the state governor, the prime minister on the Governor-General),
 * official and diplomatic passports, honorary military appointments, and
 * political staff (shortlists, scandals, and a staffer's boss losing their seat).
 *
 *   node tests/officials.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { servicePassports, passportsOf } from '../src/modules/world/Passports.js';
import { staffTitle, staffBudget, positions } from '../src/modules/politics/Staffers.js';
import { honourPowers, nominees } from '../src/modules/politics/Patronage.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { hire } from '../src/modules/career/CareerEngine.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (countryId = 'US', seed = 3) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  state.character.age = 45;
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
};
const years = (engine, state, n, until = () => false) => {
  for (let i = 0; i < n && !until(); i++) { state.prompts = state.prompts.filter((p) => until.keep?.(p)); state.stats.health = 95; engine.ageUp(); }
};

const tests = {
  'a state premier advises on the governor; a Canadian premier does not'() {
    const au = life('AU');
    au.ctx.emit('politics:take', { officeId: 'au_premier' });
    let q = null;
    for (let i = 0; i < 8 && !q; i++) { au.state.prompts = []; au.state.stats.health = 95; au.engine.ageUp(); q = au.state.prompts.find((p) => p.type === 'viceRegal.advise'); }
    assert.ok(q, 'the shortlist came to the premier');
    au.engine.resolvePrompt(q.id, 'pick0');
    const gov = Object.entries(au.state.world.viceRegal).find(([k]) => k.startsWith('au_governor'))[1];
    assert.equal(gov.name, q.data.shortlist[0].name);
    const ca = life('CA');
    ca.ctx.emit('politics:take', { officeId: 'ca_premier' });
    for (let i = 0; i < 8; i++) { ca.state.prompts = []; ca.state.stats.health = 95; ca.engine.ageUp(); assert.ok(!ca.state.prompts.some((p) => p.type === 'viceRegal.advise'), 'the federal PM advises on lieutenant governors'); }
  },
  'passports: a diplomat holds a diplomatic one, a legislator an official one, and they go back'() {
    const { state, ctx, engine } = life('US');
    const prof = getProfession('foreignService');
    hire(ctx, { professionId: 'foreignService', levelId: prof.levels.find((l) => l.entry)?.id ?? prof.levels[0].id, employer: createEmployer(new Random(2), state, prof, state.character.regionId) });
    assert.equal(servicePassports(state)[0]?.kind, 'diplomatic');
    assert.equal(passportsOf(state)[0].kind, 'ordinary');
    state.prompts = [];
    engine.ageUp();
    assert.ok(state.character.servicePassports.includes('diplomatic:US'), String(state.character.servicePassports));
    state.career.job = null;
    state.prompts = [];
    engine.ageUp();
    assert.deepEqual(state.character.servicePassports, []);
    assert.match(VIEWS.move(state), /Passports/);
  },
  'honorary appointments: a retired general becomes Colonel of the Regiment'() {
    const { state, engine } = life('GB', 9);
    state.military.history.push({ track: 'officer', grade: 8, nation: 'GB', branch: 'army', startAge: 22, endAge: 55, discharge: 'honorable' });
    state.character.age = 60;
    engine.rng.chance = () => true;
    MODULES.find((m) => m.id === 'honoraryRanks').onAgeUp(engine.context());
    assert.ok(state.honors.some((h) => h.source === 'honoraryRank' && /Colonel of the Regiment/.test(h.name)));
  },
  'political staff: Westminster titles, a shortlist, no budget in the Lords; a staffer works for a named member'() {
    const { state, engine, ctx } = life('GB');
    assert.equal(staffTitle('caseworker', state), 'Constituency Caseworker');
    ctx.emit('politics:take', { officeId: 'gb_mp' });
    engine.ageUp();
    state.prompts = [];
    engine.dispatch('staffers.shortlist', 'caseworker');
    const q = state.prompts.find((p) => p.type === 'staffers.hire');
    assert.ok(q && q.options.length === 4);
    engine.resolvePrompt(q.id, 'c0');
    assert.equal(state.legislature.seat.staff.length, 1);
    assert.ok(state.legislature.seat.staff[0].salary > 0);
    assert.equal(staffBudget({ peer: true, bodyId: 'upper_GB:GB' }), 0);
    const us = life('US', 5);
    const prof = getProfession('legislativeStaff');
    us.state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'politicalScience', year: 22 });
    hire(us.ctx, { professionId: 'legislativeStaff', levelId: 'aide', employer: createEmployer(new Random(2), us.state, prof, us.state.character.regionId) });
    assert.ok(us.state.career.job.principal?.name, 'a named member');
    assert.match(us.state.career.job.employer.name, /^Office of /);
    us.engine.rng.chance = () => true;
    us.state.prompts = [];
    MODULES.find((m) => m.id === 'staffers').onAgeUp(us.engine.context());
    const closed = us.state.prompts.find((p) => p.type === 'staffers.officeClosed');
    assert.ok(closed, 'the member lost their seat');
    us.engine.resolvePrompt(closed.id, 'another');
    assert.ok(us.state.career.job.principal);
  },
  'staff offices have real structures: a congressional office has more posts than its budget'() {
    const { state, ctx, engine } = life('US', 8);
    ctx.emit('politics:take', { officeId: 'usRep' });
    state.prompts = [];
    engine.ageUp();
    const seat = state.legislature.seat;
    const pos = positions(seat);
    assert.ok(pos.length >= 10 && pos.reduce((n, p) => n + p.max, 0) > staffBudget(seat), 'more posts than money');
    for (let i = 0; i < 6; i++) seat.staff.push({ id: `s${i}`, role: 'caseworker', name: `C${i}`, skill: 70 });
    state.prompts = [];
    engine.dispatch('staffers.shortlist', 'caseworker');
    assert.ok(!state.prompts.some((p) => p.type === 'staffers.hire'), 'no fifth caseworker post');
  },
  'patronage: a prime minister submits names; leaving office brings honours and a resignation list'() {
    const { state, ctx, engine } = life('GB', 11);
    ctx.emit('politics:take', { officeId: 'gb_pm' });
    state.prompts = [];
    engine.ageUp();
    const powers = honourPowers(state);
    assert.equal(powers?.kind, 'list');
    assert.ok(powers.peers);
    const n = nominees(state).find((x) => x.kind === 'worthy');
    assert.ok(n);
    state.prompts = [];
    engine.dispatch('patronage.nominate', n.id);
    assert.equal(state.yearly['patronage.nominate'], 1);
    state.character.age += 6;
    state.politics.office.startAge = state.character.age - 6;
    engine.rng.chance = () => true;
    state.prompts = [];
    engine.dispatch('politics.resign');
    assert.ok(state.honors.some((h) => h.source === 'order'), 'resignation honours');
    assert.equal(honourPowers(state)?.kind, 'resignation');
  },
  'appointees and governors recommend too; mayors give the key to the city'() {
    const au = life('AU', 4);
    au.ctx.emit('politics:take', { officeId: 'au_gg', appointed: true });
    assert.equal(honourPowers(au.state)?.kind, 'viceRegal');
    const us = life('US', 4);
    us.ctx.emit('politics:take', { officeId: 'mayor' });
    assert.match(honourPowers(us.state)?.civic ?? '', /key to the city/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 5).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} officials test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} officials tests passed`);
void years;
