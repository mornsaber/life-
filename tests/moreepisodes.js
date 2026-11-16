/**
 * More moments of history (world/MoreEpisodes.js): forty more countries' own moments, each
 * offered on its date and every choice resolving; and follow-ups that come back years later
 * to the choice you made, and only to that choice.
 *
 *   node tests/moreepisodes.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { LivingHistoryModule, ALL_EPISODES } from '../src/modules/world/LivingHistory.js';
import { MORE_EPISODES, FOLLOW_UPS } from '../src/modules/world/MoreEpisodes.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const WARS = { ww1: 1914, ww2: 1939, koreanWar: 1950 };
const life = (year, cc, ageNow, gender = 'male') => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - ageNow, gender });
  state.character.age = ageNow;
  state.character.gender = gender;
  state.prompts = [];
  state.military = { ...(state.military ?? {}), service: null };
  for (const [id, y] of Object.entries(WARS)) if (y <= year) state.era.events[id] = { year: y, past: true };
  return { engine, state, ctx: engine.context() };
};
const offered = (state) => state.prompts.filter((p) => p.type === 'livingHistory.episode').map((p) => p.data.id);
/** Everything else already lived, so only this one can come up. */
const only = (state, id, extra = []) => { state.lived = [...ALL_EPISODES.filter((e) => e.id !== id && !extra.some((x) => x.id === e.id)).map((e) => ({ id: e.id })), ...extra]; };
/** The first year, age and sex at which an episode can come up (the world's wars having happened). */
function whenFor(ep) {
  const events = new Proxy({}, { get: () => true });
  const cc = ep.id.startsWith('sau.') ? 'SA' : ep.id.split('.')[0].toUpperCase();
  for (let y = 1800; y <= 2030; y++) for (const a of [30, 20, 45, 16, 60, 10]) for (const g of ['male', 'female']) {
    if (ep.when({ character: { countryId: cc, age: a, gender: g }, era: { events } }, y)) return { y, a, g, cc };
  }
  return null;
}

const tests = {
  'forty countries, two or three moments each'() {
    const by = {};
    for (const e of MORE_EPISODES) by[e.id.split('.')[0]] = (by[e.id.split('.')[0]] ?? 0) + 1;
    assert.equal(Object.keys(by).length, 40);
    for (const [k, n] of Object.entries(by)) assert.ok(n >= 2 && n <= 3, `${k}: ${n}`);
    const ids = ALL_EPISODES.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  },
  'each comes on its date, in its country, and every choice resolves and is remembered'() {
    for (const ep of MORE_EPISODES) {
      const w = whenFor(ep);
      assert.ok(w, `${ep.id} can happen`);
      for (const o of ep.options) {
        const { engine, state, ctx } = life(w.y, w.cc, w.a, w.g);
        only(state, ep.id);
        LivingHistoryModule.onAgeUp(ctx);
        assert.deepEqual(offered(state), [ep.id], `${ep.id} in ${w.cc} ${w.y}`);
        const p = state.prompts.find((x) => x.data?.id === ep.id);
        engine.resolvePrompt(p.id, o.id);
        const rec = state.lived.find((l) => l.id === ep.id && l.year === w.y);
        assert.ok(rec, `${ep.id}/${o.id} remembered`);
        assert.equal(rec.option, o.id, `${ep.id}/${o.id} keeps the choice`);
        assert.ok(Number.isFinite(state.finances.cash), `${ep.id}/${o.id} cash`);
        if (o.effect.emigrate && state.character.alive) assert.equal(state.character.countryId ?? 'US', o.effect.emigrate, `${ep.id}/${o.id} moves you`);
      }
      // Not in a neighbouring country.
      const other = life(w.y, w.cc === 'KE' ? 'TZ' : 'KE', w.a, w.g);
      only(other.state, ep.id);
      LivingHistoryModule.onAgeUp(other.ctx);
      assert.ok(!offered(other.state).includes(ep.id), `${ep.id} not abroad`);
    }
  },
  'follow-ups: the key kept from 1948'() {
    const source = (option) => [{ id: 'ps.1948', year: 1948, option }];
    const a = life(1985, 'JO', 52);
    only(a.state, 'fu.ps.key', source('leave'));
    LivingHistoryModule.onAgeUp(a.ctx);
    assert.deepEqual(offered(a.state), ['fu.ps.key']);
    const b = life(1985, 'JO', 52);
    only(b.state, 'fu.ps.key', source('stay'));
    LivingHistoryModule.onAgeUp(b.ctx);
    assert.deepEqual(offered(b.state), [], 'not if you stayed');
    const c = life(1960, 'JO', 27);
    only(c.state, 'fu.ps.key', source('leave'));
    LivingHistoryModule.onAgeUp(c.ctx);
    assert.deepEqual(offered(c.state), [], 'not yet: years have to pass');
  },
  'follow-ups: the brother in America, the Stasi file, the grandmothers'() {
    const cases = [
      ['fu.it.brother', 'it.emigrate', 'stay', 1900, 1912, 'IT', 34],
      ['fu.de.file', 'eb.wall', 'cross', 1989, 1993, 'DE', 40],
      ['fu.ar.grandchild', 'ar.disappeared', 'mothers', 1977, 2004, 'AR', 60],
      ['fu.tr.retire', 'tr.gastarbeiter', 'go', 1965, 1995, 'DE', 58],
      ['fu.mx.fund', 'mx.bracero', 'go', 1950, 2008, 'MX', 78],
    ];
    for (const [fu, src, opt, then, now, cc, ageNow] of cases) {
      const { engine, state, ctx } = life(now, cc, ageNow);
      only(state, fu, [{ id: src, year: then, option: opt }]);
      LivingHistoryModule.onAgeUp(ctx);
      assert.deepEqual(offered(state), [fu], fu);
      const p = state.prompts.find((x) => x.data?.id === fu);
      engine.resolvePrompt(p.id, p.options[0].id);
      assert.ok(state.lived.some((l) => l.id === fu), `${fu} remembered`);
    }
  },
  'every follow-up points at a real episode and choice'() {
    const ids = new Set(ALL_EPISODES.map((e) => e.id));
    for (const fu of FOLLOW_UPS) {
      const [src, opt] = fu.from ?? [];
      assert.ok(ids.has(src), `${fu.id} → ${src}`);
      if (opt) assert.ok(ALL_EPISODES.find((e) => e.id === src).options.some((o) => o.id === opt), `${fu.id} → ${src}/${opt}`);
      // Built with F(), or reading the source by name.
      assert.ok(String(fu.when).includes(src) || String(fu.when).includes('chose(s, id, option)'), `${fu.id} reads ${src}`);
    }
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
