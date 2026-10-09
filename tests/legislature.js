/**
 * Legislatures and laws: city council, state house and senate, Congress;
 * bills that change the law; serving in a chamber (sponsoring, leadership,
 * staff, the deciding vote); signing and vetoing as an executive; lobbying.
 *
 *   node tests/legislature.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { bodiesHere, mySeat, myBody, ensureBodies } from '../src/modules/politics/Legislature.js';
import { lawValue, levelValue, LAWS, enact } from '../src/modules/politics/Laws.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const clean = (html) => assert.ok(!/NaN|undefined|\[object/.test(html), html.match(/.{60}(NaN|undefined|\[object).{60}/)?.[0]);
function life(seed = 1) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  state.character.age = 35;
  state.character.regionId = 'chicago';
  Object.assign(state.stats, { smarts: 80, looks: 70, health: 95 });
  return { engine, state };
}
function seat(engine, officeId, terms = 1) {
  const { state } = engine;
  state.politics.office = { id: officeId, termYearsLeft: 30, terms, approval: 60, startAge: 30, fullTime: false };
  engine.context().emit('politics:officeChanged', { officeId });
}
const year = (engine, choose = ['decline', 'wait', 'none', 'yes', 'sign']) => {
  engine.state.prompts = [];
  engine.state.stats.health = 95;
  engine.state.character.age = Math.min(engine.state.character.age, 60);
  engine.ageUp();
  for (let j = 0; j < 10 && engine.state.prompts.length; j++) {
    const p = engine.state.prompts[0];
    engine.resolvePrompt(p.id, (p.options.find((o) => choose.includes(o.id)) ?? p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0]).id);
  }
};

const tests = {
  'city, state and federal legislatures exist and pass laws on their own'() {
    const { engine, state } = life(1);
    year(engine);
    const bodies = bodiesHere(state);
    assert.equal(bodies.length, 5, 'council, house, senate, U.S. House, U.S. Senate');
    for (const b of bodies) {
      assert.ok(b.seats > 0 && b.labor >= 0 && b.labor <= b.seats, b.name);
      assert.ok(b.leaders.presiding.name && b.leaders.majority.name && b.staffCount > 0);
    }
    for (let i = 0; i < 25; i++) year(engine);
    assert.ok(state.laws.enacted.length > 0, 'some bills became law over 25 years');
    const html = VIEWS.politics(state);
    clean(html);
    assert.ok(html.includes('Laws in Force') && html.includes('Legislatures'));
  },

  'a state representative sponsors bills, climbs leadership and hires staff'() {
    const { engine, state } = life(2);
    ensureBodies(state);
    seat(engine, 'stateRep', 3);
    const s = mySeat(state);
    assert.ok(s, 'a seat in the chamber');
    assert.equal(myBody(state).kind, 'house');
    // Make the caucus the majority so leadership is open.
    const body = myBody(state);
    body.labor = s.caucus === 'labor' ? 70 : 30;
    engine.dispatch('legislature.hireStaff', 'legislativeDirector');
    engine.dispatch('legislature.hireStaff', 'chiefOfStaff');
    assert.equal(s.staff.length, 2);
    const html = VIEWS.politics(state);
    clean(html);
    assert.ok(html.includes('Introduce a bill'));
    // Sponsor a labor bill and a business bill.
    const before = lawValue(state, 'minWage');
    engine.dispatch('legislature.sponsor', 'minWage|up');
    engine.dispatch('legislature.sponsor', 'smallBizCredit|up');
    assert.equal(body.bills.filter((b) => b.sponsor === 'you').length, 2);
    // Run for leadership until a post comes (one try a year).
    for (let i = 0; i < 10 && !s.post; i++) {
      state.yearly = {};
      state.prompts = [];
      engine.dispatch('legislature.runPost', 'chair');
      if (!s.post) year(engine);
      body.labor = s.caucus === 'labor' ? 70 : 30;
    }
    assert.ok(s.post, 'won a leadership post');
    year(engine);
    const mine = Object.values(state.legislature.bodies).flatMap((b) => b.bills).filter((b) => b.sponsor === 'you');
    assert.ok(mine.every((b) => b.stage !== 'introduced'), 'your bills got a vote');
    assert.ok(s.record.length >= 2, 'a legislative record');
    if (mine.some((b) => b.lawId === 'minWage' && b.stage === 'law')) assert.ok(lawValue(state, 'minWage') > before);
  },

  'in a close vote yours decides; a governor signs or vetoes'() {
    const { engine, state } = life(3);
    ensureBodies(state);
    seat(engine, 'stateSenator', 1);
    const body = myBody(state);
    // A dead-even chamber: the bill comes down to you.
    body.labor = 20;
    let decided = false;
    for (let i = 0; i < 12 && !decided; i++) {
      state.yearly = {};
      state.prompts = [];
      engine.dispatch('legislature.sponsor', 'paidLeave|up');
      engine.dispatch('legislature.sponsor', 'cardCheck|up');
      state.prompts = [];
      engine.ageUp();
      const p = state.prompts.find((x) => x.type === 'legislature.vote');
      if (p) {
        engine.resolvePrompt(p.id, 'yes');
        decided = true;
      }
      body.labor = 20;
    }
    assert.ok(decided, 'a close vote came to you');
    // Governor: bills land on your desk.
    const g = life(4);
    ensureBodies(g.state);
    g.state.politics.office = { id: 'governor', termYearsLeft: 4, terms: 1, approval: 60, startAge: 30, fullTime: true };
    let signed = false;
    for (let i = 0; i < 15 && !signed; i++) {
      g.state.prompts = [];
      g.engine.ageUp();
      const p = g.state.prompts.find((x) => x.type === 'legislature.sign');
      if (p) { g.engine.resolvePrompt(p.id, 'sign'); signed = true; }
    }
    assert.ok(signed, 'a bill reached the governor');
    assert.ok(g.state.laws.enacted.some((e) => e.sponsor !== 'you' && e.level === 'state'), 'the signed bill is law');
  },

  'chambers have named members and committee chairs; members vote on the record'() {
    const { engine, state } = life(6);
    ensureBodies(state);
    for (const b of bodiesHere(state)) {
      assert.ok(b.members.length === Math.min(b.seats, 15), `${b.name}: ${b.members.length} named`);
      assert.ok(Object.keys(b.chairs).length >= 4, 'committee chairs');
    }
    seat(engine, 'cityCouncil', 1);
    const body = myBody(state);
    assert.ok(body.members.some((m) => m.you), 'you are on the roster');
    let recorded = false;
    for (let i = 0; i < 6 && !recorded; i++) {
      state.prompts = [];
      engine.ageUp();
      const p = state.prompts.find((x) => x.type === 'legislature.recordVote' || x.type === 'legislature.vote');
      if (p) { engine.resolvePrompt(p.id, 'no'); recorded = true; }
    }
    assert.ok(recorded, 'a vote on the record');
    assert.ok(mySeat(state).record.length > 0);
    clean(VIEWS.politics(state));
    assert.ok(VIEWS.politics(state).includes('Chairs:'));
  },

  'every named legislator has a profile, a voting record, and can be worked'() {
    const { engine, state } = life(8);
    ensureBodies(state);
    for (const b of bodiesHere(state)) for (const m of b.members) {
      assert.ok(m.id && m.age && m.background && m.focus && m.committee && Number.isFinite(m.lean) && Number.isFinite(m.rel), `${m.name} profile`);
    }
    seat(engine, 'stateRep', 2);
    for (let i = 0; i < 3; i++) { state.prompts = []; engine.ageUp(); }
    const body = myBody(state);
    assert.ok(body.members.some((m) => m.votes.length), 'members have voting records');
    assert.ok(body.members.some((m) => m.sponsored.length), 'members sponsor bills');
    const other = body.members.find((m) => !m.you);
    const rel = other.rel;
    state.yearly = {};
    state.prompts = [];
    engine.dispatch('legislature.meet', other.id);
    assert.notEqual(other.rel, rel, 'a meeting moves the relationship');
    engine.dispatch('legislature.sponsor', 'minWage|up');
    let pledged = false;
    for (const m of body.members.filter((x) => !x.you)) { engine.dispatch('legislature.askSupport', m.id); }
    pledged = Object.values(state.legislature.bodies).some((b) => b.bills.some((x) => x.sponsor === 'you' && (x.pledges ?? []).length));
    assert.ok(pledged, 'some colleagues co-sponsor');
    const html = VIEWS.politics(state);
    clean(html);
    assert.ok(html.includes('Signature issue') && html.includes('Recent votes'));
  },

  'the new laws change the game: taxes, cannabis, non-competes, public unions'() {
    const { state } = life(7);
    ensureBodies(state);
    enact(state, { level: 'state', where: 'IL', lawId: 'nonCompeteBan', value: true, age: 35 });
    assert.equal(lawValue(state, 'nonCompeteBan', 'IL'), true);
    enact(state, { level: 'state', where: 'IL', lawId: 'cannabis', value: false, age: 35 });
    assert.equal(lawValue(state, 'cannabis'), false);
    enact(state, { level: 'state', where: 'IL', lawId: 'stateIncomeTax', value: 'hike', age: 35 });
    assert.equal(lawValue(state, 'stateIncomeTax'), 'hike');
    enact(state, { level: 'city', where: 'chicago', lawId: 'zoning', value: 'upzoned', age: 35 });
    assert.equal(lawValue(state, 'zoning'), 'upzoned');
    assert.ok(Object.keys(LAWS).length >= 19);
    clean(VIEWS.politics(state));
  },

  'business owners and union officers can lobby'() {
    const { engine, state } = life(5);
    state.finances.cash = 5_000_000;
    state.career.history.push({ professionId: 'corporate', title: 'Analyst', levelId: 'x', employerName: 'Prior', sector: 'private', peakGrade: 4, startAge: 22, endAge: 34, reason: 'Left' });
    engine.dispatch('business.start', 'consulting:cash:llc');
    assert.ok(state.business.current, 'a business');
    year(engine);
    const st = 'IL';
    const before = levelValue(state, 'smallBizCredit', 'state', st);
    for (let i = 0; i < 6 && !levelValue(state, 'smallBizCredit', 'state', st); i++) {
      state.yearly = {};
      state.prompts = [];
      engine.dispatch('legislature.lobby', 'smallBizCredit|up|state');
      year(engine);
    }
    assert.ok(state.legislature.bodies['house:IL'].bills.some((b) => b.sponsor === 'lobby'), 'a lobbied bill');
    assert.ok(before === false);
    assert.ok(LAWS.smallBizCredit);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} legislature test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} legislature tests passed`);
