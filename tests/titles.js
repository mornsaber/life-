/**
 * Titles of profession, learning and rank by country (world/Titles.js), and how they sit on a name.
 *
 *   node tests/titles.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { styledName } from '../src/modules/world/Honours.js';
import { addressOf } from '../src/modules/world/Titles.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const who = (cc, gender, job, degs = [], extra = () => {}) => {
  const e = new Engine({ store: new Store(memory()), rng: new Random(3), modules: MODULES });
  const s = e.newLife({ countryId: cc, startYear: 1960, gender, firstName: 'Ann', lastName: 'Lee' });
  s.character.age = 50;
  s.education.degrees = degs.map((type) => ({ type }));
  if (job) s.career.job = { professionId: job[0], title: job[1], grade: job[2] ?? 3 };
  extra(s);
  return { name: styledName(s), says: addressOf(s) };
};

const tests = {
  'learning: Prof. Dr. in Germany, Dott.ssa in Italy, Lic. in Mexico, only full professors in Britain'() {
    assert.equal(who('DE', 'female', ['university', 'Professor'], ['phd']).name, 'Prof. Dr. Ann Lee');
    assert.equal(who('DE', 'female', ['university', 'Professor'], ['phd']).says, 'Frau Professor Lee');
    assert.equal(who('IT', 'female', ['medical', 'Attending Physician'], ['md']).name, 'Dott.ssa Ann Lee');
    assert.equal(who('MX', 'male', ['corporate', 'Manager'], ['bachelor']).name, 'Lic. Ann Lee');
    assert.equal(who('GB', 'male', ['university', 'Associate Professor', 2], ['phd']).name, 'Dr Ann Lee');
    assert.equal(who('GB', 'male', ['university', 'Professor', 3], ['phd']).name, 'Professor Ann Lee');
  },
  'professions: Avv., Maître, Esq., Er., Dra. by courtesy in Brazil; nothing in Sweden'() {
    assert.equal(who('IT', 'male', ['law', 'Partner'], ['bachelor']).name, 'Avv. Ann Lee');
    assert.equal(who('FR', 'female', ['law', 'Partner'], ['bachelor']).says, 'Maître');
    assert.equal(who('US', 'female', ['law', 'Partner'], ['jd']).name, 'Ann Lee, Esq.');
    assert.equal(who('IN', 'male', ['electricalEng', 'Senior Engineer'], ['bachelor']).name, 'Er. Ann Lee');
    assert.equal(who('BR', 'female', ['law', 'Partner'], ['bachelor']).name, 'Dra. Ann Lee');
    assert.equal(who('SE', 'male', ['medical', 'Attending Physician'], ['md']).name, 'Ann Lee');
    assert.equal(who('JP', 'male', ['education', 'Teacher', 1], ['bachelor']).says, 'Lee-sensei');
  },
  'rank: serving and retired, by country; a dame drops Dr'() {
    const retired = (s, rank) => { s.military.history = [{ track: 'officer', grade: 5, rankTitle: rank, discharge: 'retired' }]; };
    assert.equal(who('US', 'male', null, [], (s) => retired(s, 'Colonel')).name, 'Colonel Ann Lee (Ret.)');
    assert.equal(who('DE', 'male', null, [], (s) => retired(s, 'Oberst')).name, 'Oberst a. D. Ann Lee');
    const dame = who('GB', 'female', ['medical', 'Attending Physician'], ['md'], (s) => { s.character.style = { prefix: 'Dame' }; });
    assert.equal(dame.name, 'Dame Ann Lee');
    assert.equal(dame.says, 'Dame Ann');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack?.split('\n').slice(0, 3).join('\n  ')}`); }
}
if (failed) process.exit(1);
