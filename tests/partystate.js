/**
 * One-party states: the ruling party runs politics and the army. Government posts come from the
 * Party (a Party track or a government track at some promotions), legislatures are people's
 * congresses with no contested elections, officers are Party members, and generals sit on the
 * Central Committee.
 *
 *   node tests/partystate.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { runEligibility } from '../src/modules/politics/Campaigns.js';
import { partyBoardFactor, promotionOdds } from '../src/modules/politics/CommunistParty.js';
import { bodiesHere, ensureBodies } from '../src/modules/politics/Legislature.js';
import { enlist } from '../src/modules/military/MilitaryEngine.js';
import { ORDERS } from '../src/modules/world/Honours.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(opts = {}, seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'CN', ...opts });
  state.legal.record = [];
  if (state.community) state.community.faith = null;
  return { engine, state, ctx: engine.context() };
}
const year = (engine, state, n = 1, pick = null) => {
  for (let i = 0; i < n && state.character.alive; i++) {
    for (let k = 0; k < 12 && state.prompts.length; k++) {
      const q = state.prompts[0];
      engine.resolvePrompt(q.id, (pick?.(q) ?? q.options.find((o) => !o.disabled && o.tone !== 'danger') ?? q.options[0]).id);
    }
    state.prompts = [];
    state.stats.health = 95;
    engine.ageUp();
  }
};
const member = (state, rank = 0) => Object.assign(state.cpc ??= {}, { status: 'member', since: 20, rank, record: 80, network: 80, patron: null, graft: 0, postSince: 0 });
const always = (rng) => { rng.chance = () => true; };

const tests = {
  'no open elections: every post goes through the Party'() {
    for (const cc of ['CN', 'VN', 'KP']) {
      const { state } = life({ countryId: cc });
      state.character.age = 40;
      for (const id of ['schoolBoard', 'cityCouncil', 'mayor']) {
        const r = runEligibility(state, id);
        assert.equal(r.ok, false, `${cc} ${id}`);
        assert.match(r.reason, /Party/, `${cc} ${id}: ${r.reason}`);
      }
    }
    const html = VIEWS.politics(life().state, {});
    assert.match(html, /Posts in the Party-State/);
    assert.doesNotMatch(html, /Run for Office|Where You Stand/);
  },
  'a promotion can put a cadre on the government side: mayor, then governor'() {
    const { engine, state, ctx } = life({}, 3);
    year(engine, state, 35);
    member(state, 3);
    ctx.rng.chance = (p) => p >= 0.2; // the promotion, not the inspectors
    state.prompts = [];
    year(engine, state, 1);
    assert.equal(state.cpc.rank, 4);
    const q = state.prompts.find((x) => x.type === 'cpc.track');
    assert.ok(q, 'the Organization Department asks: Party post or government post?');
    engine.resolvePrompt(q.id, 'gov');
    assert.equal(state.politics.office?.id, 'mayor');
    assert.ok(state.politics.office.viaParty);
    assert.ok(state.politics.office.salary < 50000, 'paid on the cadre scale');
    // No re-election campaign: the Party keeps you there until it moves you.
    state.cpc.postSince = state.character.age;
    state.cpc.record = 0;
    state.politics.office.termYearsLeft = 1;
    year(engine, state, 2);
    assert.equal(state.politics.office?.id, 'mayor');
    assert.ok(!state.politics.campaign);
  },
  'people\'s congresses: one list, near-unanimous votes, no blocs fighting elections'() {
    const { engine, state } = life({}, 4);
    year(engine, state, 30);
    ensureBodies(state);
    const bodies = bodiesHere(state);
    assert.ok(bodies.length);
    for (const b of bodies) {
      assert.ok(b.oneParty, b.name);
      // The NPC: the Party ~70%, its eight allied minor parties the rest; local congresses ~95%.
      assert.ok(b.labor / b.seats >= (b.level === 'federal' ? 0.65 : 0.9), `${b.name}: ${b.labor}/${b.seats}`);
    }
    assert.ok(bodies.some((b) => /People's Congress/.test(b.name)));
    const text = bodies.flatMap((b) => b.history.map((h) => h.text)).join('\n');
    assert.doesNotMatch(text, /lost the election|took the majority/);
    const html = VIEWS.politics(state, {});
    assert.doesNotMatch(html, /Minority leader/);
  },
  'officers join the Party through their unit, and Party standing weighs on promotion boards'() {
    const { engine, state, ctx } = life({ gender: 'male' }, 6);
    year(engine, state, 22);
    state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'engineering', schoolId: 'state', gpa: 3.7, year: 22 });
    enlist(ctx, { branch: 'army', track: 'officer', component: 'active', specialty: 'infantry' });
    assert.ok(state.military.service);
    year(engine, state, 2);
    assert.equal(state.cpc?.status, 'member');
    const svc = state.military.service;
    assert.ok(partyBoardFactor(state, svc) >= 0.7);
    state.cpc.status = null;
    svc.grade = 3;
    assert.ok(partyBoardFactor(state, svc) < 0.5, 'a field-grade officer outside the Party rarely rises');
    state.cpc.status = 'member';
    // Serving officers don't also climb the civilian cadre ladder.
    const rank = state.cpc.rank;
    state.cpc.postSince = 0;
    year(engine, state, 5);
    assert.equal(state.cpc.rank, rank);
  },
  'generals sit on the Central Committee; the top commanders on the Central Military Commission'() {
    const { engine, state, ctx } = life({ gender: 'male' }, 7);
    year(engine, state, 22);
    state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'engineering', schoolId: 'state', gpa: 3.7, year: 22 });
    enlist(ctx, { branch: 'army', track: 'officer', component: 'active', specialty: 'infantry' });
    member(state);
    state.military.service.grade = 8;
    always(ctx.rng);
    year(engine, state, 1);
    assert.ok(['cc', 'cmc', 'cmcVice'].includes(state.cpc.military), state.cpc.military);
    assert.match(VIEWS.politics(state, {}), /Central Committee|Central Military Commission/);
  },
  'cadres reach the top ranks before the age limits'() {
    const { state } = life();
    member(state, 6);
    state.character.age = 55;
    state.cpc.postSince = 51;
    assert.ok(promotionOdds(state) > 0, 'four years as provincial secretary is enough');
  },
  'every country\'s honours have tier ids (no repeat awards)'() {
    for (const [cc, o] of Object.entries(ORDERS)) for (const t of o?.tiers ?? []) assert.ok(t.id, `${cc}: ${t.name}`);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} party-state test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} party-state tests passed`);
