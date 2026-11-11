/**
 * Faith and community of their day (community/FaithOfTheDay.js): who was raised in a faith,
 * established churches and their bars, official atheism, persecution, the emptying pews,
 * and clubs and societies.
 *
 *   node tests/faithday.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { faithBar, officialAtheism, persecutedAsJew, clubEligibility, clubsHere, unbeliefScale } from '../src/modules/community/FaithOfTheDay.js';
import { enrollmentEligibility } from '../src/modules/education/EducationEngine.js';
import { newCommunity } from '../src/modules/community/Religions.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const at = (cc, year, opts = {}, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year, gender: 'male', ...opts });
  return { engine, state };
};
const grown = (cc, year, age, opts = {}, seed = 1) => { const r = at(cc, year - age, opts, seed); r.state.character.age = age; return r; };
const setFaith = (state, t) => { Object.assign(state.community, newCommunity(t, 'St Mary', 0)); state.community.faith.attendance = 'regular'; };
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };

const tests = {
  'before the 1960s nearly everyone was raised in a faith'() {
    assert.ok(unbeliefScale(at('GB', 1880).state) < 0.1);
    let none = 0, noneNow = 0;
    for (let seed = 1; seed <= 30; seed++) {
      if (!at('GB', 1880, {}, seed).state.community.upbringing) none++;
      if (!at('GB', 2010, {}, seed).state.community.upbringing) noneNow++;
    }
    assert.ok(none <= 3, `${none}/30 unchurched in 1880`);
    assert.ok(noneNow >= 6, `${noneNow}/30 unchurched in 2010`);
  },
  'the established church barred others from office and the universities'() {
    const { engine, state } = grown('GB', 1825, 20);
    setFaith(state, 'catholic');
    assert.match(faithBar(state, 'office'), /Catholics until 1829/);
    assert.match(faithBar(state, 'university'), /1871/);
    state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18, gpa: 3.8 });
    state.stats.smarts = 95;
    state.people.wealth = 'upper';
    const r = enrollmentEligibility(state, 'bachelor', 'state', 'history', { applying: true });
    assert.equal(r.ok, false);
    assert.match(r.reason, /established|Church of England|Anglican/);
    const blocked = engine.modules.map((m) => m.guard?.(state, 'politics.run')).find(Boolean);
    assert.match(blocked ?? '', /Catholics/);
    setFaith(state, 'anglican');
    assert.equal(faithBar(state, 'office'), null);
    const later = grown('GB', 1880, 30).state;
    setFaith(later, 'catholic');
    assert.equal(faithBar(later, 'office'), null, 'emancipated');
  },
  'an atheist state asks what you will do with your faith'() {
    const { engine, state } = grown('RU', 1960, 30);
    assert.equal(officialAtheism(state), true);
    setFaith(state, 'orthodoxChristian');
    state.prompts = [];
    engine.ageUp();
    const p = state.prompts.find((x) => x.type === 'faithDay.atheism');
    assert.ok(p, 'asked');
    engine.resolvePrompt(p.id, 'quiet');
    assert.equal(state.community.faith.attendance, 'occasional');
    assert.equal(officialAtheism(grown('RU', 1995, 30).state), false);
  },
  'Jews under Nazi rule: the racial laws, and the choice to flee'() {
    const { engine, state } = grown('DE', 1936, 30);
    setFaith(state, 'reformJewish');
    assert.equal(persecutedAsJew(state), true);
    state.prompts = [];
    engine.ageUp();
    assert.ok(state.faithDay.persecuted);
    let fled = false;
    for (let i = 0; i < 6 && !fled && state.character.alive; i++) {
      const p = state.prompts.find((x) => x.type === 'faithDay.flee');
      if (p) engine.resolvePrompt(p.id, 'GB');
      fled = Boolean(state.faithDay.fled);
      if (!fled) { state.prompts = []; engine.ageUp(); }
    }
    if (fled) assert.equal(state.character.countryId, 'GB');
    assert.ok(fled || !state.character.alive || state.faithDay.refused, 'fled, refused, or lost');
    assert.equal(persecutedAsJew(grown('DE', 1950, 30).state), false);
  },
  'the pews empty after 1965'() {
    let lapsed = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const { engine, state } = grown('GB', 1966, 30, {}, seed);
      setFaith(state, 'anglican');
      for (let i = 0; i < 25 && state.character.alive; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
      if (state.community.faith?.attendance === 'occasional') lapsed++;
    }
    assert.ok(lapsed >= 2, `${lapsed}/6`);
  },
  'clubs and societies of their day'() {
    const old = grown('GB', 1890, 30).state;
    assert.ok(clubEligibility(old, 'friendly').ok);
    assert.ok(clubEligibility(old, 'wmc').ok);
    assert.match(clubEligibility(old, 'rotary').reason, /1905/);
    const woman = grown('GB', 1950, 30, { gender: 'female' }).state;
    woman.character.gender = 'female';
    assert.match(clubEligibility(woman, 'rotary').reason, /Men only/);
    assert.ok(clubEligibility(woman, 'wi').ok);
    assert.ok(!clubsHere(grown('GB', 1990, 30).state).includes('friendly'), 'the welfare state ended them');
    const { engine, state } = grown('GB', 1900, 30);
    state.finances.cash = 1000;
    engine.dispatch('faithDay.join', 'friendly');
    assert.equal(state.faithDay.clubs.length, 1);
    state.stats.health = 30;
    const cash = state.finances.cash;
    state.prompts = [];
    engine.ageUp();
    assert.ok(state.log.flatMap((b) => b.entries ?? []).some((l) => /sick pay/.test(l.text)), 'sick pay drawn');
    state.prompts = [];
    engine.dispatch('faithDay.leave', 'friendly');
    assert.equal(state.faithDay.clubs.length, 0);
  },
  'the Community tab shows the faith and societies of the year'() {
    const { state } = grown('GB', 1825, 20);
    setFaith(state, 'catholic');
    const html = VIEWS.community(state, {});
    assert.match(html, /Faith (&amp;|&) Societies in 1825/);
    assert.match(html, /Catholics/);
    clean(html);
    clean(VIEWS.community(at('US', 2010).state, {}));
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
