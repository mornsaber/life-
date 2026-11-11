/**
 * Law and crime of their day (legal/LawOfTheDay.js): the gallows by year, transportation,
 * debtors' prisons, Prohibition, the law of your private life, period prisons and famous trials.
 *
 *   node tests/lawday.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { deathPenaltyThen, transportationHere, prohibitionHere, divorceBarred, sexBetweenMenCriminal, sameSexMarriageLegal } from '../src/modules/legal/LawOfTheDay.js';
import { deathPenaltyHere, assignFacility } from '../src/modules/legal/JusticeSystem.js';
import { OFFENSES } from '../src/modules/legal/Offenses.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const grown = (cc, year, age, opts = {}, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age, gender: 'male', ...opts });
  state.character.age = age;
  return { engine, state };
};
const guarded = (engine, state, id) => engine.modules.map((m) => m.guard?.(state, id)).find(Boolean) ?? null;
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };
const lover = (state, gender, relation = 'partner') => {
  const p = { id: 'l1', firstName: 'Sam', lastName: 'Lee', gender, relation, ageOffset: 0, relationship: 80, alive: true, since: state.character.age - 2, compatibility: 90, nationality: state.character.countryId };
  state.people.list.push(p);
  return p;
};

const tests = {
  'the gallows, the guillotine and the electric chair, by year'() {
    const gb = grown('GB', 1850, 30).state;
    assert.equal(deathPenaltyThen(gb).method, 'hanging');
    assert.equal(deathPenaltyThen(gb).status, 'routine');
    assert.equal(deathPenaltyHere(gb).status, 'routine', 'the justice system reads the year');
    assert.equal(deathPenaltyThen(grown('GB', 1950, 30).state).status, 'active');
    assert.equal(deathPenaltyHere(grown('GB', 1980, 30).state), null, 'abolished 1965');
    assert.equal(deathPenaltyThen(grown('FR', 1930, 30).state).method, 'the guillotine');
    assert.equal(deathPenaltyThen(grown('US', 1930, 30).state).method, 'the electric chair');
    assert.equal(deathPenaltyThen(grown('US', 1974, 30).state), null, 'Furman: no executions 1972–76');
    assert.equal(deathPenaltyThen(grown('US', 2010, 30).state), undefined, 'today\'s law');
  },
  'transportation to the colonies, and a ticket of leave'() {
    const { engine, state } = grown('GB', 1830, 25);
    assert.equal(transportationHere(state), true);
    const f = assignFacility(state, engine.rng, { ...OFFENSES.burglary ?? { severity: 'felony' }, severity: 'felony' }, 7);
    assert.match(f.facility, /convict ship to New South Wales/);
    state.lawDay.transported = { where: 'New South Wales', age: 18 };
    state.legal.incarceration = null;
    state.prompts = [];
    engine.ageUp();
    const p = state.prompts.find((x) => x.type === 'lawDay.freed');
    assert.ok(p, 'freed');
    engine.resolvePrompt(p.id, 'stay');
    assert.equal(state.character.countryId, 'AU');
    assert.equal(transportationHere(grown('GB', 1870, 25).state), false);
  },
  'period prisons: Newgate, Sing Sing, Alcatraz'() {
    const { engine, state } = grown('GB', 1860, 30);
    assert.match(assignFacility(state, engine.rng, { severity: 'misdemeanor' }, 1).facility, /gaol/);
    const us = grown('US', 1950, 30);
    assert.equal(assignFacility(us.state, us.engine.rng, { severity: 'felony' }, 15).facility, 'Alcatraz');
    const now = grown('US', 2010, 30);
    assert.doesNotMatch(assignFacility(now.state, now.engine.rng, { severity: 'felony' }, 15).facility, /Alcatraz/);
  },
  'debtors\' prison for unpaid debts'() {
    let jailed = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const { engine, state } = grown('GB', 1840, 35, {}, seed);
      state.finances.cash = -20000;
      for (let i = 0; i < 4 && !state.legal.incarceration; i++) { state.prompts = []; state.finances.cash = Math.min(state.finances.cash, -20000); engine.ageUp(); }
      if (state.legal.incarceration?.debtors || state.lawDay.debtors) jailed++;
    }
    assert.ok(jailed >= 3, `${jailed}/8`);
  },
  'Prohibition: the bars shut and bootleggers profit'() {
    const { engine, state } = grown('US', 1925, 30);
    assert.equal(prohibitionHere(state), true);
    state.prompts = [];
    const cash = state.finances.cash;
    engine.dispatch('lawDay.bootleg');
    assert.ok(state.finances.cash > cash || state.legal.record.length, 'money, or a raid');
    const after = grown('US', 1935, 30);
    assert.match(guarded(after.engine, after.state, 'lawDay.bootleg'), /legal/);
  },
  'the law of your private life: marriage, divorce and the crime of being gay'() {
    const { engine, state } = grown('GB', 1955, 30);
    assert.equal(sexBetweenMenCriminal(state), true);
    lover(state, 'male');
    assert.match(guarded(engine, state, 'people.propose'), /men can't marry here until 2014/);
    assert.equal(sexBetweenMenCriminal(grown('GB', 1970, 30).state), false);
    const later = grown('GB', 2016, 30);
    lover(later.state, 'male');
    assert.equal(guarded(later.engine, later.state, 'people.propose'), null);
    assert.equal(sameSexMarriageLegal(grown('IN', 2010, 30).state), false);
    const ie = grown('IE', 1980, 30);
    lover(ie.state, 'female', 'spouse');
    assert.match(guarded(ie.engine, ie.state, 'people.fileForDivorce'), /1996/);
    assert.equal(divorceBarred(grown('IE', 2000, 30).state), null);
    assert.equal(divorceBarred(grown('US', 1900, 30).state), null);
  },
  'famous trials reach the papers'() {
    const { engine, state } = grown('FR', 1893, 30);
    state.prompts = [];
    engine.ageUp();
    assert.ok(state.log.flatMap((b) => b.entries ?? []).some((l) => /Dreyfus/.test(l.text)));
  },
  'the Legal tab shows the law of the year'() {
    const { state } = grown('GB', 1835, 30);
    const html = VIEWS.legal(state, {});
    assert.match(html, /The Law in 1835/);
    assert.match(html, /hanging/);
    assert.match(html, /transported/);
    clean(html);
    const us = grown('US', 1925, 30).state;
    assert.match(VIEWS.legal(us, {}), /speakeasies/);
    assert.doesNotMatch(VIEWS.legal(grown('US', 2015, 30).state, {}), /The Law in/);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
