/**
 * What now? Help after the year's big moments: each event brings next steps that point somewhere real.
 *
 *   node tests/whatnow.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { eventHelp } from '../src/modules/life/Guide.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { whatNowCard } from '../src/ui/views/YearReviewView.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const engine = new Engine({ store: new Store(memory()), rng: new Random(3), modules: MODULES });
const state = engine.newLife({ countryId: 'US', startYear: 1950 });
state.character.age = 30;
const kid = { id: 'p_kid', firstName: 'Ada', lastName: 'X', relation: 'child', alive: true, ageOffset: -30 };
const partner = { id: 'p_love', firstName: 'Sam', lastName: 'Y', relation: 'partner', alive: true, ageOffset: 0 };
state.people.list.push(kid, partner);
state.lastYear = { age: 30, people: [{ kind: 'born', pid: 'p_kid' }, { kind: 'met', pid: 'p_love' }], expecting: true };

const tests = {
  'events bring next steps'() {
    const h = eventHelp(state);
    assert.ok(h.length >= 2 && h.length <= 3);
    assert.match(h[0].title, /Ada/);
    assert.ok(h[0].steps.some((s) => s.arg === 'people|person=p_kid'), 'straight to the baby');
    assert.ok(h.some((x) => /Sam/.test(x.title)));
  },
  'every step goes to a real tab'() {
    for (const h of eventHelp(state)) for (const s of h.steps) assert.ok(VIEWS[s.arg.split('|')[0]], s.arg);
  },
  'the card draws, and waits while a decision is open'() {
    assert.match(whatNowCard(state), /What Now\?/);
    state.prompts.push({ id: 'x', options: [] });
    assert.equal(whatNowCard(state), '');
    state.prompts.pop();
  },
  'a quiet year asks nothing'() {
    const quiet = { ...state, lastYear: { age: 30, people: [] } };
    assert.equal(eventHelp(quiet).length, 0);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack?.split('\n').slice(0, 3).join('\n  ')}`); }
}
if (failed) process.exit(1);
