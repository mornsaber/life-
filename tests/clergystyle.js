/**
 * The ordained and the vowed are addressed as such: a Jesuit priest is "Fr. … SJ", an Anglican
 * priest "The Revd", a rabbi "Rabbi", a Missionary of Charity "Sister … MC".
 *
 *   node tests/clergystyle.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { styledName, postNominals } from '../src/modules/world/Honours.js';
import { isClergy } from '../src/modules/community/Community.js';
import { getProfession } from '../src/modules/career/JobTrees.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (gender = 'male') => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(5), modules: MODULES });
  const state = engine.newLife({ countryId: 'US', gender, firstName: 'Ignatius', lastName: 'Loyola' });
  state.character.age = 40;
  return state;
};

const tests = {
  'a Jesuit priest is Fr. … SJ, counts as clergy, and stays a priest after final vows'() {
    const s = life();
    s.community.religious = { order: 'jesuits', stage: 'professed', since: 22, stageSince: 34 };
    s.community.orders = { tradition: 'catholic', grade: 'priest', since: 32, diocese: 'Society of Jesus', laicized: false };
    s.career.job = { professionId: 'jesuits', levelId: 'professed', title: 'Jesuit Priest (Professed)', employer: { name: 'Society of Jesus' } };
    assert.equal(styledName(s), 'Fr. Ignatius Loyola');
    assert.match(postNominals(s), /\bSJ\b/);
    assert.ok(isClergy(s));
    assert.match(getProfession('jesuits').levels.find((l) => l.id === 'professed').title, /Priest/);
  },
  'other traditions and grades'() {
    const s = life();
    const as = (tradition, grade) => { s.community.orders = { tradition, grade, since: 30, laicized: false }; return styledName(s); };
    assert.equal(as('anglican', 'priest'), 'The Revd Ignatius Loyola');
    assert.equal(as('catholic', 'deacon'), 'Deacon Ignatius Loyola');
    assert.equal(as('reformJewish', 'minister'), 'Rabbi Ignatius Loyola');
    assert.equal(as('sunni', 'minister'), 'Imam Ignatius Loyola');
    assert.equal(as('baptist', 'minister'), 'Rev. Ignatius Loyola');
    s.community.orders.laicized = true;
    assert.equal(styledName(s), 'Ignatius Loyola', 'laicized: no style');
  },
  'a Missionary of Charity is Sister … MC (a novice has no letters yet)'() {
    const s = life('female');
    s.community.religious = { order: 'moc', stage: 'professed', since: 20, stageSince: 28 };
    assert.equal(styledName(s), 'Sister Ignatius Loyola');
    assert.match(postNominals(s), /\bMC\b/);
    s.community.religious.stage = 'postulant';
    assert.doesNotMatch(postNominals(s), /\bMC\b/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} clergy-style test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} clergy-style tests passed`);
