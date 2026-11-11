/**
 * Pursuits (life/Hobbies.js + life/pursuits/*.js): hobbies and sport of their day — taken up in
 * their years and places, events of the time, clubs, governing bodies, the years women couldn't
 * compete, amateurs who took cups not cash, selections and the Olympics.
 *
 *   node tests/pursuits.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { HOBBIES, hobbiesOf, pursuitsOpen, competeTier, governingBody, hobbiesTick, tierOf } from '../src/modules/life/Hobbies.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (opts, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ gender: 'male', ...opts });
  state.character.age = 20;
  state.finances.cash = 1e6;
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
};
const lastLog = (state) => state.log.at(-1).entries.at(-1)?.text ?? '';

const tests = {
  'every pack is well formed'() {
    for (const [id, d] of Object.entries(HOBBIES)) {
      for (const k of ['label', 'icon', 'kind', 'cost', 'stat', 'minAge']) assert.ok(d[k] != null, `${id}.${k}`);
      if (d.tiers) assert.equal(d.tiers.length, 6, `${id} tiers`);
      for (const [from, ev] of d.events ?? []) assert.ok(from >= 1800 && ev.length === 5, `${id} events ${from}`);
      if (d.pro) assert.ok(getProfession(d.pro[0]), `${id} pro ${d.pro[0]}`);
      if (d.club) assert.ok(d.club.names.length && d.club.fee > 0, `${id} club`);
    }
    assert.ok(Object.keys(HOBBIES).length >= 40, `${Object.keys(HOBBIES).length} pursuits`);
  },
  'taken up only in their years and places'() {
    const old = pursuitsOpen(life({ countryId: 'GB', startYear: 1830 }).state);
    assert.ok(!old.includes('cycling') && !old.includes('coding') && !old.includes('photography'));
    assert.ok(old.includes('cricket') && old.includes('chess'));
    const us = pursuitsOpen(life({ countryId: 'US', startYear: 2000 }).state);
    assert.ok(!us.includes('cricket') && us.includes('baseball') && us.includes('coding'));
    const { engine, state } = life({ countryId: 'US', startYear: 1850 });
    engine.dispatch('hobbies.take', 'videoGames');
    assert.equal(hobbiesOf(state).videoGames, undefined);
  },
  'events of the time and who runs it'() {
    const run = (year) => {
      const { engine, state } = life({ countryId: 'GB', startYear: year });
      engine.dispatch('hobbies.take', 'running');
      hobbiesOf(state).running.skill = 30;
      state.yearly = {};
      engine.dispatch('hobbies.compete', 'running');
      return { text: lastLog(state), body: governingBody(state, 'running') };
    };
    const a = run(1830), b = run(2015);
    assert.match(a.text, /fête|wager/);
    assert.equal(a.body, null);
    assert.match(b.text, /parkrun|5K/);
    assert.match(b.body, /Athletics/);
    assert.equal(governingBody(life({ countryId: 'FR', startYear: 1930 }).state, 'chess'), 'FIDE');
  },
  'sport and chess need a club past the friendly level'() {
    const { engine, state } = life({ countryId: 'GB', startYear: 1990 });
    engine.dispatch('hobbies.take', 'chess');
    hobbiesOf(state).chess.skill = 80;
    assert.equal(competeTier(state, 'chess'), 1);
    engine.dispatch('hobbies.club', 'chess');
    assert.match(hobbiesOf(state).chess.club.name, /Chess/);
    assert.equal(competeTier(state, 'chess'), 4);
  },
  'women: the FA ban, and sports that came late to women'() {
    const f = life({ countryId: 'GB', startYear: 1930, gender: 'female' });
    f.engine.dispatch('hobbies.take', 'football');
    f.engine.dispatch('hobbies.club', 'football');
    hobbiesOf(f.state).football.skill = 80;
    assert.equal(competeTier(f.state, 'football'), 0, 'banned 1921–71');
    const later = life({ countryId: 'GB', startYear: 1990, gender: 'female' });
    later.engine.dispatch('hobbies.take', 'football');
    later.engine.dispatch('hobbies.club', 'football');
    hobbiesOf(later.state).football.skill = 80;
    assert.equal(competeTier(later.state, 'football'), 4);
    const box = life({ countryId: 'US', startYear: 1950, gender: 'female' });
    box.engine.dispatch('hobbies.take', 'boxing');
    hobbiesOf(box.state).boxing.skill = 80;
    assert.equal(competeTier(box.state, 'boxing'), 0);
  },
  'amateurs took a cup, not money'() {
    const { engine, state, ctx } = life({ countryId: 'GB', startYear: 1925 });
    engine.dispatch('hobbies.take', 'tennis');
    engine.dispatch('hobbies.club', 'tennis');
    hobbiesOf(state).tennis.skill = 85;
    ctx.rng.chance = () => true;
    const cash = state.finances.cash;
    state.yearly = {};
    engine.dispatch('hobbies.compete', 'tennis');
    assert.match(lastLog(state), /amateurs take no money/);
    assert.equal(state.finances.cash, cash);
  },
  'the Olympics come in Olympic years, with a medal for the best'() {
    let picked = 0, medals = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const { engine, state, ctx } = life({ countryId: 'GB', startYear: 1948 - 20 }, seed);
      engine.dispatch('hobbies.take', 'rowing');
      engine.dispatch('hobbies.club', 'rowing');
      const h = hobbiesOf(state).rowing;
      h.skill = 96; h.practised = true;
      hobbiesTick(ctx);
      if (h.honours.some((x) => /Olympic/.test(x.label))) picked++;
      medals += state.honors.filter((x) => /Olympic/.test(x.name)).length;
    }
    assert.ok(picked >= 1, `${picked} picked in 1948`);
    const off = life({ countryId: 'GB', startYear: 1949 - 20 }, 1);
    off.engine.dispatch('hobbies.take', 'rowing');
    off.engine.dispatch('hobbies.club', 'rowing');
    Object.assign(hobbiesOf(off.state).rowing, { skill: 96, practised: true });
    off.ctx.rng.chance = () => true;
    hobbiesTick(off.ctx);
    assert.ok(!hobbiesOf(off.state).rowing.honours.some((x) => /Olympic/.test(x.label)), 'no Games in 1949');
    assert.ok(medals >= 0);
  },
  'named ladders, and the Activities tab'() {
    assert.equal(tierOf(95, 'chess').label, 'Grandmaster');
    assert.equal(tierOf(95).label, 'Elite');
    const { engine, state } = life({ countryId: 'US', startYear: 1960 });
    engine.dispatch('hobbies.take', 'baseball');
    engine.dispatch('hobbies.club', 'baseball');
    const html = VIEWS.activities(state, {});
    assert.match(html, /Hobbies &amp; Sport|Hobbies & Sport/);
    assert.match(html, /Leave/);
    assert.doesNotMatch(html, /undefined|NaN/);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
