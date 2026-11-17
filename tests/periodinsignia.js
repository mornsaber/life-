/**
 * Badges of rank that changed with the times (ui/Insignia.js periodInsignia).
 *
 *   node tests/periodinsignia.js
 */
import assert from 'node:assert/strict';
import { militaryInsignia } from '../src/ui/Insignia.js';
import { setEraYear, PRESENT } from '../src/modules/world/Eras.js';

const at = (y, code, cc, branch = 'army') => { setEraYear(y); const out = militaryInsignia(code, cc, { branch }); setEraYear(PRESENT); return out; };

const tests = {
  'a German captain: the Kaiser\'s and the Wehrmacht\'s strap, then the Bundeswehr\'s'() {
    const kaiser = at(1914, 'OF-3', 'DE');
    assert.equal(kaiser, at(1940, 'OF-3', 'DE'), 'the same strap from 1866 to 1945');
    assert.notEqual(kaiser, at(1990, 'OF-3', 'DE'));
    assert.match(kaiser, /#5b6248/);
  },
  'Imperial Japan\'s red collar patches, then the Self-Defense Forces\' plates'() {
    assert.match(at(1940, 'OF-2', 'JP'), /#b3202a/);
    assert.doesNotMatch(at(1990, 'OF-2', 'JP'), /#b3202a/);
  },
  'China: Nationalist triangles, the PLA without ranks 1965-88, ranks again after'() {
    assert.match(at(1940, 'OF-2', 'CN'), /path/);
    const rankless = at(1975, 'OF-6', 'CN');
    assert.equal(rankless, at(1975, 'OR-3', 'CN'), 'a colonel looks like a private');
    assert.notEqual(at(1995, 'OF-6', 'CN'), at(1995, 'OR-3', 'CN'));
  },
  'Austria-Hungary\'s collar stars before 1918'() {
    assert.match(at(1910, 'OF-2', 'AT'), /✶/);
  },
  'the crown, not the republic\'s emblem, before a Commonwealth country became a republic'() {
    assert.match(at(1950, 'OF-4', 'PK'), /♛/);
    assert.match(at(1990, 'OF-4', 'PK'), /☪/);
    assert.doesNotMatch(at(1940, 'OF-4', 'IN'), /☸/, 'no Ashoka lion before 1950');
    assert.match(at(1990, 'OF-4', 'IN'), /☸/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
