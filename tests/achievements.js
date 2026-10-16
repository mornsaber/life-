/**
 * Achievements, challenges and the Hall of Fame.
 *
 *   node tests/achievements.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { ACHIEVEMENTS, CHALLENGES, hallOfFame, trophies, lifeScore } from '../src/modules/life/Achievements.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { newLifeForm } from '../src/ui/Components.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const clean = (html) => assert.ok(!/NaN|undefined|\[object/.test(html), html.match(/.{60}(NaN|undefined|\[object).{60}/)?.[0]);
function life(options = {}, storage = memory()) {
  const engine = new Engine({ store: new Store(storage), rng: new Random(5), modules: MODULES });
  const state = engine.newLife(options);
  return { engine, state };
}
const year = (engine) => {
  engine.state.prompts = [];
  engine.ageUp();
  for (let j = 0; j < 10 && engine.state.prompts.length; j++) {
    const p = engine.state.prompts[0];
    engine.resolvePrompt(p.id, (p.options.find((o) => !o.disabled && o.tone !== 'danger') ?? p.options[0]).id);
  }
};

const tests = {
  'every achievement and challenge is well-formed and safe on a newborn'() {
    const { state } = life();
    for (const [id, a] of Object.entries(ACHIEVEMENTS)) {
      assert.ok(a.name && a.icon && a.desc && ['bronze', 'silver', 'gold'].includes(a.tier), id);
      assert.equal(typeof a.test(state), 'boolean', `${id} returns a boolean`);
      assert.equal(a.test(state), false, `${id} isn't unlocked at birth`);
    }
    for (const [id, c] of Object.entries(CHALLENGES)) {
      assert.ok(c.name && c.desc, id);
      assert.equal(c.won(state), false, `${id} isn't won at birth`);
    }
  },

  'achievements unlock during a life, once, and go in the all-time cabinet'() {
    const storage = memory();
    const { engine, state } = life({}, storage);
    state.character.age = 30;
    state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'history', year: 22 });
    state.finances.cash = 2_000_000;
    year(engine);
    assert.ok(state.achievements.graduate != null, 'graduate');
    assert.ok(state.achievements.millionaire != null, 'millionaire');
    const first = state.achievements.graduate;
    year(engine);
    assert.equal(state.achievements.graduate, first, 'unlocked once');
    assert.ok(trophies().graduate.count >= 1);
    assert.ok(state.log.some((y) => y.entries.some((e) => /Achievement unlocked/.test(e.text))));
  },

  'a challenge is won when its goal is met, and lost when it no longer can be'() {
    const won = life({ challenge: 'selfMade' });
    won.state.character.age = 35;
    won.state.finances.cash = 1_500_000;
    year(won.engine);
    assert.equal(won.state.challenge.status, 'won');
    const lost = life({ challenge: 'cleanHands' });
    lost.state.character.age = 30;
    lost.state.legal.record.push({ offenseId: 'theft', name: 'Theft', severity: 'misdemeanor', age: 30 });
    year(lost.engine);
    assert.equal(lost.state.challenge.status, 'failed');
    assert.match(lost.state.challenge.reason, /Convicted/);
    const late = life({ challenge: 'selfMade' });
    late.state.character.age = 51;
    year(late.engine);
    assert.equal(late.state.challenge.status, 'failed', 'past 50 without a million');
  },

  'a finished life is enshrined in the Hall of Fame, ranked by score, and shown on the tombstone'() {
    const storage = memory();
    const a = life({ challenge: 'centenarian' }, storage);
    a.state.character.age = 60;
    a.state.finances.cash = 5_000_000;
    year(a.engine);
    a.engine.context().die('Old age');
    assert.ok(a.state.hallOfFame?.rank === 1);
    assert.equal(a.state.challenge.status, 'failed', 'an unmet challenge fails at death');
    const b = life({}, storage);
    b.state.character.age = 40;
    b.engine.context().die('Accident');
    const hof = hallOfFame();
    assert.equal(hof.length, 2);
    assert.ok(hof[0].score >= hof[1].score);
    assert.equal(hof[0].name, `${a.state.character.firstName} ${a.state.character.lastName}`);
    assert.ok(lifeScore(a.state) > lifeScore(b.state));
    const html = VIEWS.achievements(b.state);
    clean(html);
    assert.match(html, /Hall of Fame · 2 lives/);
    assert.match(html, /Achievements · \d+\//);
  },

  'the start screen offers the challenges'() {
    const html = newLifeForm({ firstName: 'A', lastName: 'B' });
    for (const c of Object.values(CHALLENGES)) assert.ok(html.includes(c.name), c.name);
  },

  'a whole simulated life runs with achievements on and renders cleanly'() {
    const { engine, state } = life({ challenge: 'globetrotter' });
    for (let i = 0; i < 40 && state.character.alive; i++) year(engine);
    clean(VIEWS.achievements(state));
    assert.equal(typeof state.achievements, 'object');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} achievement test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} achievement tests passed`);
