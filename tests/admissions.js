/**
 * Admissions, planned: pick a programme, get a suggested shortlist (reach, matches, safety) with
 * the chance of at least one offer, and send it in one go.
 *
 *   node tests/admissions.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const senior = () => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(3), modules: MODULES });
  const state = engine.newLife({ countryId: 'US' });
  for (let i = 0; i < 18; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  state.finances.cash = 5000;
  return { engine, state };
};

const tests = {
  'no catalogue wall: a programme picker first'() {
    const { state } = senior();
    const h = VIEWS.school(state, {});
    assert.match(h, /data-ui-set="admProgram"/);
    assert.ok(!/education\.applyMany/.test(h));
  },
  'a shortlist with reach, match and safety, and the odds of an offer'() {
    const { state } = senior();
    const h = VIEWS.school(state, { admProgram: 'bachelor' });
    assert.match(h, /Suggested shortlist/);
    assert.match(h, /Safety/);
    assert.match(h, /Chance of at least one offer: <b>\d+%<\/b>/);
    assert.ok(!/ 1% · /.test(h.slice(h.indexOf('Suggested shortlist'), h.indexOf('Chance of at least'))), 'no long shots padding the list');
  },
  'sending the shortlist sends each application'() {
    const { engine, state } = senior();
    const h = VIEWS.school(state, { admProgram: 'bachelor' });
    const ids = [...h.matchAll(/data-part="u\d"[^>]*>[\s\S]*?<option value="([^"]+)" selected/g)].map((m) => m[1]);
    assert.ok(ids.length >= 2, `${ids.length} picked`);
    const block = h.slice(h.indexOf('Suggested shortlist'));
    const major = block.match(/data-part="major" value="([^"]*)"/)[1];
    engine.dispatch('education.applyMany', `bachelor:${major}:full:${ids.join(':')}`);
    assert.equal((state.education.applications ?? []).length, ids.length);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 5).join('\n  ')}`); }
}
if (failed) process.exit(1);
