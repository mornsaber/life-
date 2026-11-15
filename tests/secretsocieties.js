/**
 * Secret societies: who can join, the degrees, invitations, bans and exposure.
 *
 *   node tests/secretsocieties.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { SecretSocietiesModule, societiesOpen, masonsBanned, masonDegree } from '../src/modules/civic/SecretSocieties.js';
import { secretSocietiesCard } from '../src/ui/views/SecretSocietiesView.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc = 'GB', year = 1950, age = 35, gender = 'male') => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(year), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age, gender });
  state.character.age = age;
  state.character.gender = gender;
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
};

const tests = {
  'what is open, and to whom'() {
    const open = (s) => societiesOpen(s).filter((x) => x.ok).map((x) => x.id);
    assert.ok(open(life().state).includes('masons'));
    assert.ok(!open(life('GB', 1950, 35, 'female').state).includes('masons'), 'mainstream lodges are men only');
    assert.ok(!societiesOpen(life('IT', 1990).state).some((x) => x.id === 'p2'), 'P2 was exposed and dissolved in 1981');
  },
  'Freemasonry banned under the Nazis, Franco and the Communists'() {
    assert.equal(masonsBanned('DE', 1940), true);
    assert.equal(masonsBanned('DE', 1960), false);
    assert.equal(masonsBanned('ES', 1960), true);
    assert.equal(masonsBanned('GB', 1940), false);
  },
  'joining the lodge, and being raised through the degrees'() {
    let m = null;
    for (let i = 0; i < 10 && !m?.state.secretSocieties?.masons; i++) { m = life('GB', 1950 + i); SecretSocietiesModule.actions.petition(m.ctx, 'masons'); }
    assert.ok(m.state.secretSocieties.masons);
    for (let i = 0; i < 6; i++) { m.state.prompts = []; m.state.character.age += 1; SecretSocietiesModule.onAgeUp(m.ctx); }
    assert.notEqual(masonDegree(m.state), 'Entered Apprentice');
    assert.match(secretSocietiesCard(m.state), /Freemasons/);
  },
  'P2 members are exposed in 1981'() {
    const m = life('IT', 1980, 50);
    m.state.secretSocieties = { p2: { since: 45, degree: 0, exposed: false } };
    m.state.character.age += 1;
    SecretSocietiesModule.onAgeUp(m.ctx);
    assert.equal(m.state.secretSocieties.p2.exposed, true);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
