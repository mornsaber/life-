/**
 * Women's services, the uniform, badges of rank held, qualification badges, civilian badges of their
 * day, and badges that match their period titles.
 *
 *   node tests/uniform.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { rankOf, branchOf, enlistmentEligibility } from '../src/modules/military/MilitaryEngine.js';
import { womenMayServe } from '../src/modules/military/WomensServices.js';
import { uniformSvg, uniformCard, insigniaHistoryCard, qualBadges } from '../src/ui/Uniform.js';
import { militaryInsignia, jobInsignia } from '../src/ui/Insignia.js';
import { PROFESSIONS } from '../src/modules/career/JobTrees.js';
import { setEraYear } from '../src/modules/world/Eras.js';
import { sync } from '../src/modules/world/History.js';
import { auditInsignia } from '../tools/insignia-audit.mjs';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc, year, age, gender) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(7), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age, gender });
  state.character.age = age; state.prompts = []; sync(state);
  return state;
};
const at = (y, fn) => { setEraYear(y); try { return fn(); } finally { setEraYear(null); } };

const tests = {
  "women serve when and where they could, in their corps' titles"() {
    assert.equal(womenMayServe('US', 'army', 1930), false);
    assert.equal(womenMayServe('US', 'army', 1943), true);
    assert.equal(womenMayServe('GB', 'army', 1930), false, 'no women\'s corps between the wars');
    assert.equal(womenMayServe('GB', 'navy', 1918), true);
    assert.equal(womenMayServe('US', 'army', 1990), true, 'integrated');
    const s = life('US', 1930, 22, 'female');
    assert.match(enlistmentEligibility(s, 'army', 'enlisted', 'active').reason ?? '', /Women/);
    at(1942, () => {
      const wren = { nation: 'GB', branch: 'navy', track: 'enlisted', grade: 2, female: true };
      assert.equal(rankOf(wren).title, 'Leading Wren');
      assert.match(branchOf(wren).name, /Women's Royal Naval Service/);
      assert.equal(rankOf({ nation: 'GB', branch: 'army', track: 'officer', grade: 2, female: true }).title, 'Junior Commander');
    });
    at(2000, () => assert.equal(rankOf({ nation: 'GB', branch: 'army', track: 'officer', grade: 2, female: true }).title, 'Captain'));
  },
  'period titles wear their own badges'() {
    at(1850, () => assert.equal(militaryInsignia('E-1', null, { branch: 'navy', title: 'Landsman' }), ''));
    at(1960, () => assert.match(militaryInsignia('OR-5', 'IN', { branch: 'army', title: 'Jemadar' }), /✦/));
    at(1916, () => assert.notEqual(militaryInsignia('OF-7', 'GB', { branch: 'army', title: 'Brigadier-General' }), militaryInsignia('OF-7', 'GB', { branch: 'army' })));
    at(1960, () => assert.match(militaryInsignia('E-2', null, { branch: 'airforce', title: 'Airman Third Class' }), /★/));
  },
  'civilian badges of their day'() {
    const P = PROFESSIONS.police;
    const then = at(1880, () => jobInsignia({ levelId: 'captain' }, P, 'US'));
    const now = at(1990, () => jobInsignia({ levelId: 'captain' }, P, 'US'));
    assert.ok(then && now && then !== now, 'a breast shield before collar bars');
    assert.notEqual(at(1900, () => jobInsignia({ levelId: 'captain' }, P, 'GB')), at(1990, () => jobInsignia({ levelId: 'captain' }, P, 'GB')), 'cuff braid before pips');
  },
  'the uniform, the badges held, and the qualification badges'() {
    const s = life('US', 1965, 30, 'male');
    s.military.service = { branch: 'army', track: 'enlisted', grade: 4, component: 'active', joinedAge: 19, specialty: 'infantry', combatTours: 1, schools: { airborne: 20, rangerSchool: 24 },
      ranks: [{ title: 'Private', age: 19, code: 'E-1', branch: 'army' }, { title: 'Corporal', age: 22, code: 'E-4', branch: 'army' }, { title: 'Sergeant', age: 26, code: 'E-5', branch: 'army' }] };
    assert.match(uniformSvg(s), /<svg class="uniform-svg"/);
    assert.match(uniformCard(s), /Uniform/);
    const q = qualBadges(s).map((b) => b.label).join(' ');
    assert.match(q, /Parachutist/); assert.match(q, /Ranger/); assert.match(q, /Combat Infantryman/);
    const h = insigniaHistoryCard(s);
    assert.match(h, /Badges of Rank/); assert.match(h, /Corporal/); assert.match(h, /1961/);
    // No parachutist's badge before there were parachutists.
    const old = life('US', 1930, 30, 'male');
    old.military.service = { branch: 'army', track: 'enlisted', grade: 2, joinedAge: 20, schools: { airborne: 25 } };
    assert.equal(qualBadges(old).length, 0);
    // A woman in a corps wears a skirt.
    const w = life('GB', 1943, 22, 'female');
    w.military.service = { nation: 'GB', branch: 'army', track: 'enlisted', grade: 1, female: true, joinedAge: 20 };
    assert.match(uniformSvg(w), /L80 134/);
  },
  'the audit runs and finds no period title wearing a badge from the wrong grade in the US Army'() {
    const flags = auditInsignia(['US'], [1900, 1940]).filter((f) => /US army enlisted/.test(f) && /wears/.test(f));
    assert.deepEqual(flags.filter((f) => !/Technical Sergeant/.test(f)), []);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack?.split('\n').slice(0, 3).join('\n  ')}`); }
}
if (failed) process.exit(1);
