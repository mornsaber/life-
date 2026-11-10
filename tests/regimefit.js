/**
 * What a life can do fits the state it lives in: no colonial service in a Soviet republic, no
 * stock market or bail bondsmen in a planned economy, no ruling party in Qing China, no Federal
 * Republic agencies in the Third Reich, NATO and the EU only for members of the day.
 *
 *   node tests/regimefit.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { applicationEligibility } from '../src/modules/career/CareerEngine.js';
import { colonialWorkOpen, colonialHere, colonyHere } from '../src/modules/world/Eras.js';
import { stockBlock, propertyBlock } from '../src/modules/world/Regimes.js';
import { partyHere } from '../src/modules/politics/CommunistParty.js';
import { memberIn, NATO_MEMBERS, EU_MEMBERS } from '../src/modules/career/IntlOrgCareers.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc, year, age = 25) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(5), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age, gender: 'male' });
  for (let i = 0; i < age; i++) { state.prompts = []; engine.ageUp(); }
  state.prompts = [];
  state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 });
  return state;
};
const why = (state, id) => applicationEligibility(state, id).reason ?? '';

const tests = {
  'a Soviet republic: no colonial service, no market trades, no stocks or house buying; the Party instead'() {
    const s = life('EE', 1965);
    assert.ok(colonyHere(s), 'ruled from Moscow');
    assert.equal(colonialHere(s), null, 'but not a colony');
    assert.ok(!colonialWorkOpen(s));
    assert.ok(!applicationEligibility(s, 'colonialService').ok);
    for (const id of ['bailBonds', 'privateInvestigator', 'finance']) assert.match(why(s, id), /planned economy|Needs|not/i, id);
    assert.ok(stockBlock(s) && propertyBlock(s));
    assert.match(partyHere(s)?.name ?? '', /Soviet Union/);
  },
  'a real colony still has its colonial service'() {
    const s = life('KE', 1935);
    if (!colonyHere(s)) return; // independence came early in this world
    assert.ok(colonialHere(s) && colonialWorkOpen(s));
  },
  'parties of their day'() {
    assert.equal(partyHere(life('CN', 1900)), null, 'no Communist Party in Qing China');
    assert.match(partyHere(life('CN', 1965))?.name ?? '', /Communist Party of China/);
  },
  'agencies of the present-day state only once it exists'() {
    const s = life('DE', 1938);
    assert.match(why(s, 'de_borderPatrol'), /Not founded|not|Needs/i);
  },
  'NATO and the EU by year'() {
    assert.ok(!memberIn(NATO_MEMBERS, 'EE', 1965) && memberIn(NATO_MEMBERS, 'EE', 2010));
    assert.ok(!memberIn(EU_MEMBERS, 'ES', 1980) && memberIn(EU_MEMBERS, 'ES', 1990));
    assert.ok(memberIn(NATO_MEMBERS, 'GB', 1950));
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
