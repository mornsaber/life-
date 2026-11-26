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
import { styledName, award, ORDERS, postNominals } from '../src/modules/world/Honours.js';
import { addressOf } from '../src/modules/world/Titles.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const who = (cc, gender, job, degs = [], extra = () => {}) => {
  const e = new Engine({ store: new Store(memory()), rng: new Random(3), modules: MODULES });
  const s = e.newLife({ countryId: cc, startYear: 1960, gender, firstName: 'Ann', lastName: 'Lee' });
  s.character.age = 50;
  // The years in between, as our history had them.
  Object.assign(s.era.events, { sovietCollapse: { year: 1991 }, yugoslaviaBreakup: { year: 1991 }, velvetDivorce: { year: 1993 } });
  e.hydrate(s);
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
    const retired = (s, rank, nation) => { s.military.history = [{ track: 'officer', grade: 5, rankTitle: rank, discharge: 'retired', ...(nation ? { nation } : {}) }]; };
    assert.equal(who('US', 'male', null, [], (s) => retired(s, 'Colonel')).name, 'Colonel Ann Lee (Ret.)');
    assert.equal(who('DE', 'male', null, [], (s) => retired(s, 'Oberst', 'DE')).name, 'Oberst a. D. Ann Lee');
    const dame = who('GB', 'female', ['medical', 'Attending Physician'], ['md'], (s) => { s.character.style = { prefix: 'Dame' }; });
    assert.equal(dame.name, 'Dame Ann Lee');
    assert.equal(dame.says, 'Dame Ann');
  },
  'titles are the country\'s: a British major is Major in London and Toronto, not in Ohio; Sir only where there are knights; no title from an honorary knighthood'() {
    const major = (s) => { s.military.history = [{ track: 'officer', grade: 3, rankTitle: 'Major', discharge: 'retired', nation: 'GB' }]; };
    assert.equal(who('GB', 'male', null, [], major).name, 'Major Ann Lee');
    assert.equal(who('CA', 'male', null, [], major).name, 'Major Ann Lee');
    assert.equal(who('US', 'male', null, [], major).name, 'Ann Lee', 'British custom, not used in America');
    const usSergeant = (s) => { s.military.history = [{ track: 'enlisted', grade: 6, rankTitle: 'Master Sergeant', discharge: 'retired' }]; };
    assert.equal(who('US', 'male', null, [], usSergeant).name, 'Master Sergeant Ann Lee (Ret.)');
    assert.equal(who('GB', 'male', null, [], usSergeant).name, 'Ann Lee', 'an American retiree is plain Mr in London');
    const sir = (s) => { s.character.style = { prefix: 'Sir' }; };
    assert.equal(who('GB', 'male', null, [], sir).name, 'Sir Ann Lee');
    assert.equal(who('US', 'male', null, [], sir).name, 'Ann Lee', 'no knights in America');
    assert.equal(who('US', 'male', null, [], sir).says, 'Mr. Lee');
    // An honorary knighthood for an American: no Sir, no letters.
    const e = new Engine({ store: new Store(memory()), rng: new Random(3), modules: MODULES });
    const st = e.newLife({ countryId: 'US', gender: 'male', firstName: 'Ann', lastName: 'Lee' });
    award(e.context(), 'GB', ORDERS.GB.tiers.find((t) => t.id === 'knight'));
    assert.ok(!st.character.style?.prefix, 'no Sir');
    assert.equal(postNominals(st), '');
  },
  'names of their era: a surgeon is Mr in London, Mrs John Lee in 1950, Ms from the 1970s in America, Comrade in Moscow, Hofrat in Vienna'() {
    const surgeon = (s) => { s.medicine = { specialty: 'generalSurgery' }; };
    assert.equal(who('GB', 'male', ['medical', 'Attending Physician'], ['md'], surgeon).name, 'Ann Lee');
    assert.equal(who('GB', 'male', ['medical', 'Attending Physician'], ['md'], surgeon).says, 'Mr Lee');
    assert.equal(who('US', 'male', ['medical', 'Attending Physician'], ['md'], surgeon).name, 'Dr. Ann Lee', 'an American surgeon is Dr');
    const wife = (year) => (s) => { s.character.birthYear = year - 50; s.people.list.push({ id: 'h', relation: 'spouse', alive: true, gender: 'male', firstName: 'John', lastName: 'Lee' }); };
    const at = (cc, gender, year, extra) => { const e = new Engine({ store: new Store(memory()), rng: new Random(3), modules: MODULES }); const s = e.newLife({ countryId: cc, startYear: year - 40, gender, firstName: 'Ann', lastName: 'Lee' }); s.character.age = 40; Object.assign(s.era.events, { sovietCollapse: { year: 1991 } }); extra?.(s); e.hydrate(s); return addressOf(s); };
    assert.equal(at('US', 'female', 1950, (s) => s.people.list.push({ id: 'h', relation: 'spouse', alive: true, gender: 'male', firstName: 'John', lastName: 'Lee' })), 'Mrs. John Lee');
    assert.equal(at('US', 'female', 1990, (s) => s.people.list.push({ id: 'h', relation: 'spouse', alive: true, gender: 'male', firstName: 'John', lastName: 'Lee' })), 'Mrs. Lee');
    assert.equal(at('US', 'female', 1960), 'Miss Lee');
    assert.equal(at('US', 'female', 1990), 'Ms. Lee');
    assert.equal(at('GB', 'female', 1978), 'Miss Lee', 'Ms came later in Britain');
    const moscow = at('RU', 'male', 1970, (s) => { delete s.era.events.sovietCollapse; });
    assert.equal(moscow, 'Comrade Lee');
    const vienna = who('AT', 'male', ['meteorology', 'Director', 8], ['master']);
    assert.match(vienna.name, /^Hofrat /);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack?.split('\n').slice(0, 3).join('\n  ')}`); }
}
if (failed) process.exit(1);
