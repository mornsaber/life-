/**
 * Things that belong to later years stay out of earlier lives: coding and flying skills, an
 * online circle, rideshare, rockets on the stock market, ETIAS and e-visas, digital-nomad visas,
 * crisis lines and 21st-century causes.
 *
 *   node tests/anachronisms.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { skillInEra } from '../src/modules/life/Skills.js';
import { circlesNow } from '../src/modules/life/Reputation.js';
import { MODES } from '../src/modules/transit/Transit.js';
import { COMPANIES } from '../src/modules/investing/StockMarket.js';
import { bestEntry } from '../src/modules/world/Travel.js';
import { routesTo } from '../src/modules/world/Migration.js';
import { volunteerInEra } from '../src/modules/community/Community.js';
import { CAUSES } from '../src/modules/civic/Activism.js';
import { yearNow } from '../src/modules/world/Eras.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc, year, age = 30) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(9), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age, gender: 'male' });
  for (let i = 0; i < age; i++) { state.prompts = []; engine.ageUp(); }
  state.prompts = [];
  return state;
};

const tests = {
  'an 1860 life has no modern skills, circles, cabs or companies'() {
    const s = life('GB', 1860);
    for (const id of ['coding', 'data', 'driving', 'piloting']) assert.ok(!skillInEra(s, id), id);
    assert.ok(!circlesNow(s).some(([id]) => id === 'online'));
    assert.equal(MODES.rideshare.label, 'Hackney cabs');
    assert.match(COMPANIES.brightline.name, /Typewriter/);
    assert.ok(!volunteerInEra(s, 'crisisLine'));
    assert.ok(CAUSES.backTheBlue.from > yearNow(s));
  },
  'travel and visas of the day'() {
    const s = life('GB', 1900);
    assert.equal(bestEntry(s, 'FR').note, 'no passport needed');
    const t = life('GB', 1990);
    assert.notEqual(bestEntry(t, 'US').note, 'ESTA');
    assert.ok(!routesTo(t, 'IT').some((r) => r.kind === 'nomad'), 'no digital nomad visas in 1990');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
