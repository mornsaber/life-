/**
 * Icons of their day: no 🚗 before motor cars, no 📱 before mobiles, no ✈️ before airliners.
 *
 *   node tests/periodicons.js
 */
import assert from 'node:assert/strict';
import { periodIcons } from '../src/ui/PeriodIcons.js';
import { flagEmojiInPage } from '../src/ui/Components.js';
import { setEraYear, PRESENT } from '../src/modules/world/Eras.js';

const tests = {
  'swapped by year'() {
    assert.equal(periodIcons('🚗 Drive', 1880), '🐎 Drive');
    assert.equal(periodIcons('🚗 Drive', 1950), '🚗 Drive');
    assert.equal(periodIcons('📱 Call', 1870), '✉️ Call');
    assert.equal(periodIcons('📱 Call', 1960), '☎️ Call');
    assert.equal(periodIcons('✈️ Fly', 1900), '🚢 Fly');
    assert.equal(periodIcons('💳 Card', 1950), '💰 Card');
    assert.equal(periodIcons('📺 TV', 1930), '📻 TV');
    assert.equal(periodIcons('📺 TV', 1900), '📰 TV');
  },
  'present untouched'() {
    assert.equal(periodIcons('🚗 📱 ✈️ 💳', PRESENT), '🚗 📱 ✈️ 💳');
  },
  'page text and options, not textareas'() {
    setEraYear(1870);
    const html = flagEmojiInPage('<option>📱 call</option><b title="📱">🚗 drive</b><textarea>📱</textarea>');
    assert.match(html, /<option>✉️ call<\/option>/);
    assert.match(html, /<b title="📱">🐎 drive<\/b>/);
    assert.match(html, /<textarea>📱<\/textarea>/);
    setEraYear(PRESENT);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
