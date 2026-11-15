/**
 * Result cards: the big moments pop up as a card, and stay on the year in review.
 *
 *   node tests/resultcards.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { showResult, resultsThisYear } from '../src/modules/life/ResultCards.js';
import { promptModal } from '../src/ui/Components.js';
import { ClubOwnershipModule } from '../src/modules/business/ClubOwnership.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = () => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(2), modules: MODULES });
  const state = engine.newLife({ countryId: 'GB', startYear: 1970 });
  state.character.age = 45;
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
};

const tests = {
  'a result pops up once, renders big, and is kept for the year'() {
    const m = life();
    showResult(m.ctx, { icon: '🗳️', title: 'Member of Parliament', big: 'Elected', sub: '52% of the vote', tone: 'good' });
    showResult(m.ctx, { icon: '🎓', title: 'Oxford', big: 'Graduated', tone: 'good' });
    assert.equal(m.state.prompts.filter((p) => p.type === 'results.card').length, 1, 'one pop-up at a time');
    const html = promptModal(m.state.prompts[0], 1);
    assert.match(html, /result-big">Elected/);
    m.engine.resolvePrompt(m.state.prompts[0].id, 'ok');
    assert.equal(resultsThisYear(m.state).length, 2);
  },
  'a club season leaves a result; the big ones pop up'() {
    const m = life();
    m.state.finances.cash = 1e11;
    ClubOwnershipModule.actions.buy(m.ctx, 'football:2');
    m.state.character.age += 1;
    ClubOwnershipModule.onAgeUp(m.ctx);
    assert.ok(resultsThisYear(m.state).some((r) => /\d+(st|nd|rd|th)/.test(r.big)));
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
