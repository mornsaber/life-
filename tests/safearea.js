/**
 * iPhone: the top bars stay clear of the status bar and Dynamic Island. The page is drawn under
 * the status bar (viewport-fit=cover, black-translucent), so every rule that sets a top bar's
 * top padding must add env(safe-area-inset-top), in every look and at every width.
 *
 *   node tests/safearea.js
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../styles/main.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
let failed = 0;
const check = (name, fn) => { try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.message}`); } };

check('the page is drawn under the status bar', () => {
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /black-translucent/);
});
check('every top-bar rule that sets its top padding clears the safe area', () => {
  const bad = [];
  for (const m of css.matchAll(/([^{}]*\.(?:appbar|topbar)\s*)\{([^}]*)\}/g)) {
    const selector = m[1].trim().split('\n').pop();
    // Only the bars themselves (not .appbar-who, .topbar-mid and the like).
    if (!/\.(appbar|topbar)\s*$/.test(selector)) continue;
    const body = m[2];
    const pad = body.match(/padding(-top)?\s*:\s*([^;]+)/);
    if (pad && !/safe-area-inset-top/.test(pad[2])) bad.push(`${selector} { ${pad[0]} }`);
  }
  assert.deepEqual(bad, []);
});
check('the phone app bar sets one at all', () => {
  const rule = css.match(/\n\.appbar\s*\{([^}]*)\}/);
  assert.ok(rule && /safe-area-inset-top/.test(rule[1]), '.appbar has no safe-area padding');
});
if (failed) process.exit(1);
