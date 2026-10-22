/**
 * Elections and platforms: the calendar and filing window, electorates that lean,
 * named opponents and incumbents, primaries then generals, the platform and its
 * credibility, re-election as a real race, and votes that go on the record.
 *
 *   node tests/elections.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store, currentYear } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { electorateOf, nextElectionYear, generalShare, primaryShare, makeOpponent, FILING_WINDOW } from '../src/modules/politics/Elections.js';
import { platformOf, credibility, recordVote, ideology } from '../src/modules/politics/Platform.js';
import { executiveOf } from '../src/modules/politics/Legislature.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life({ seed = 5, regionId = 'midcity', age = 35, bloc = 'labor' } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US' });
  state.character.regionId = regionId;
  state.character.age = age;
  state.legal.record = [];
  state.prompts = [];
  state.finances.cash = 500000;
  Object.assign(state.stats, { smarts: 75, health: 95, happiness: 70, looks: 70 });
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'economics', year: 22 });
  if (bloc) engine.dispatch('party.join', bloc);
  return { engine, state };
}
const drain = (engine, state, pick = () => null) => {
  for (let i = 0; i < 15 && state.prompts.length; i++) {
    const q = state.prompts[0];
    const o = q.options.find((x) => x.id === pick(q)) ?? q.options.find((x) => !x.disabled && x.tone !== 'danger') ?? q.options[0];
    engine.resolvePrompt(q.id, o.id);
  }
};
/** Declare for an office in the first year its filing window is open. */
function declare(engine, state, officeId) {
  for (let i = 0; i < 6 && !state.politics.campaign; i++) {
    drain(engine, state);
    engine.dispatch('politics.run', officeId);
    if (!state.politics.campaign) { state.prompts = []; state.stats.health = 95; engine.ageUp(); }
  }
  drain(engine, state);
  return state.politics.campaign;
}

const tests = {
  'the calendar: the House every even year, presidents every four, city races in odd years; file a year out'() {
    const { state } = life();
    const y = currentYear(state);
    assert.equal(nextElectionYear(state, 'stateRep') % 2, 0);
    assert.equal(nextElectionYear(state, 'president') % 4, 0);
    assert.equal(nextElectionYear(state, 'mayor') % 2, 1);
    assert.ok(nextElectionYear(state, 'stateRep') > y);
    assert.equal(FILING_WINDOW('stateRep'), 1);
    assert.equal(FILING_WINDOW('governor'), 2);
  },
  'electorates lean: a big city leans left, a rural county right; a sheriff\'s voters care about crime'() {
    const city = electorateOf(life({ regionId: 'chicago' }).state, 'stateRep');
    const rural = electorateOf(life({ regionId: 'rural' }).state, 'stateRep');
    assert.ok(city.lean < -0.05 && rural.lean > 0.05, `${city.lean} / ${rural.lean}`);
    assert.ok(rural.median.guns > city.median.guns);
    const sheriff = electorateOf(life({ regionId: 'rural' }).state, 'sheriff');
    assert.ok(sheriff.salience.crime > sheriff.salience.environment * 3);
  },
  'party and place: a Democrat does better in Chicago than in rural Montana, a Republican the reverse'() {
    const share = (regionId, bloc) => { const { state } = life({ regionId, bloc }); return generalShare(state, 'stateRep', { funds: 50000, endorsements: [], opponent: makeOpponent(state, 'stateRep', new Random(1)) }).share; };
    assert.ok(share('chicago', 'labor') > share('rural', 'labor') + 0.1);
    assert.ok(share('rural', 'business') > share('chicago', 'business') + 0.1);
  },
  'a race: a named opponent, a primary for the base, then the general on the calendar'() {
    const { engine, state } = life({ seed: 9 });
    const c = declare(engine, state, 'stateRep');
    assert.ok(c, 'declared');
    assert.ok(c.opponent?.name && c.opponent.bloc === 'business', 'a Republican opponent');
    assert.equal(c.electionYear % 2, 0);
    for (let i = 0; i < 3 && state.politics.campaign; i++) {
      for (const a of ['fundraise', 'canvass']) engine.dispatch(`politics.${a}`);
      drain(engine, state);
      state.prompts = [];
      state.stats.health = 95;
      engine.ageUp();
      drain(engine, state, (q) => (q.type === 'politics.general' ? 'positive' : null));
    }
    assert.ok(!state.politics.campaign, 'decided');
    const results = state.politics.results ?? [];
    assert.ok(results.length >= 1 && results.every((r) => r.year % 2 === 0), JSON.stringify(results));
    if (c.rivals.length) assert.equal(results[0].stage, 'primary');
  },
  'primaries reward the base; generals reward the middle'() {
    const { engine, state } = life({ seed: 11 });
    const c = declare(engine, state, 'stateSenator');
    assert.ok(c);
    c.rivals = c.rivals.length ? c.rivals : [{ name: 'Rival', quality: 45, platform: Object.fromEntries(Object.keys(platformOf(state)).map((k) => [k, -1])), funds: 0 }];
    c.stage = 'primary';
    const pf = platformOf(state);
    for (const k of Object.keys(pf)) pf[k] = -2;
    const baseP = primaryShare(state, c.officeId, c);
    const baseG = generalShare(state, c.officeId, c).share;
    for (const k of Object.keys(pf)) pf[k] = 0;
    assert.ok(primaryShare(state, c.officeId, c) < baseP, 'moderates do worse in the primary');
    assert.ok(generalShare(state, c.officeId, c).share > baseG, 'and better in the general');
  },
  'platform: stances start at the party line; a big swing mid-campaign is a flip-flop that costs credibility'() {
    const { engine, state } = life({ bloc: 'business' });
    assert.equal(platformOf(state).taxes, 1);
    assert.ok(ideology(state) > 0);
    declare(engine, state, 'stateRep');
    const before = credibility(state);
    engine.dispatch('politics.stance', 'taxes|-1');
    assert.equal(platformOf(state).taxes, -1);
    assert.ok(credibility(state) < before, 'flip-flop');
    assert.equal((state.politics.flipflops ?? []).length, 1);
  },
  'votes go on the record: against your own platform costs credibility'() {
    const { state } = life({ bloc: 'labor' });
    platformOf(state);
    const c0 = credibility(state);
    recordVote(state, 'minWage', 1); // the right's side of a minimum-wage bill
    assert.ok(credibility(state) < c0);
    assert.ok(state.politics.record.labor.votes === 1);
  },
  'a governor\'s race is against the sitting governor (or a primary, in your own party)'() {
    const { engine, state } = life({ seed: 13, age: 45 });
    state.politics.recognition = 70;
    state.politics.history.push({ officeId: 'stateSenator', startAge: 37, endAge: 45, terms: 2, reason: 'Retired' });
    state.prompts = [];
    engine.ageUp();
    const gov = executiveOf(state, 'state');
    assert.ok(gov?.name);
    const c = declare(engine, state, 'governor');
    assert.ok(c, 'declared for governor');
    const names = [c.opponent.name, ...c.rivals.map((r) => r.name)];
    if (!c.openSeat) assert.ok(names.includes(gov.name), `${gov.name} in ${names}`);
  },
  're-election is a real race: you keep the office until the count'() {
    const { engine, state } = life({ seed: 17, regionId: 'chicago' });
    engine.context().emit('politics:take', { officeId: 'stateRep' });
    const o = state.politics.office;
    o.termYearsLeft = 2; // the decision comes a year before the term ends
    for (let i = 0; i < 5 && state.politics.office?.terms === 1; i++) {
      state.prompts = [];
      state.stats.health = 95;
      engine.ageUp();
      drain(engine, state, (q) => (q.type === 'politics.reelection' ? 'run' : q.type === 'politics.general' ? 'positive' : null));
      if (state.politics.campaign) assert.equal(state.politics.office?.id, 'stateRep', 'still in office while campaigning');
    }
    assert.ok((state.politics.results ?? []).some((r) => r.officeId === 'stateRep'), 'an election was held');
  },
  'the Politics tab shows the platform, the race and the calendar'() {
    const { engine, state } = life();
    declare(engine, state, 'stateRep');
    const html = VIEWS.politics(state);
    assert.match(html, /Where You Stand/);
    assert.match(html, /Projected vote share|Primary projection/);
    assert.match(html, /election (in|this year)/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} election test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} election tests passed`);
