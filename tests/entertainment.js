/**
 * Music and film of their day: a band, a record label, a film studio.
 *
 *   node tests/entertainment.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { EntertainmentModule, genreOf, formatOf, budgetsNow } from '../src/modules/business/Entertainment.js';
import { entertainmentCard } from '../src/ui/views/EntertainmentView.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (year = 2000, age = 25, cc = 'US') => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(year), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age });
  state.character.age = age;
  state.prompts = [];
  state.finances.cash = 1e10;
  return { engine, state, ctx: engine.context() };
};
const A = EntertainmentModule.actions;

const tests = {
  'the music and formats of the day'() {
    assert.match(genreOf(1958, 'GB'), /skiffle|rock/);
    assert.equal(genreOf(1958, 'US'), "rock'n'roll");
    assert.match(formatOf(1930), /78/);
    assert.match(formatOf(1995), /CD/);
    assert.match(formatOf(2020), /streaming/);
  },
  'a band: gigs grow a following, a record charts, the card shows it'() {
    const m = life(1965, 18);
    A.formBand(m.ctx);
    assert.equal(m.state.band.genre, 'rock');
    const f = m.state.band.following;
    A.gig(m.ctx);
    assert.ok(m.state.band.following > f);
    A.record(m.ctx);
    assert.equal(m.state.band.records.length, 1);
    assert.match(entertainmentCard(m.state), /Play a gig/);
  },
  'a label and a studio make money (or don\'t) by their era'() {
    const m = life(1990, 40);
    A.startLabel(m.ctx);
    A.signAct(m.ctx);
    A.signAct(m.ctx);
    A.startStudio(m.ctx);
    A.makeFilm(m.ctx, 'mid');
    assert.equal(m.state.studio.films.length, 1);
    for (let i = 0; i < 5; i++) { m.state.prompts = []; m.state.character.age += 1; EntertainmentModule.onAgeUp(m.ctx); }
    assert.ok(Number.isFinite(m.state.finances.cash));
    assert.ok(!budgetsNow(life(1960, 40).state).some((b) => b.id === 'blockbuster'), 'no blockbusters before 1975');
    const early = life(1905, 40);
    A.startStudio(early.ctx);
    assert.equal(early.state.studio ?? null, null, 'no film industry before 1910');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
