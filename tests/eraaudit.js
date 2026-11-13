/**
 * Era audit: every screen, in the past, through the same period-text pass the app uses, must
 * not mention things that didn't exist yet. (Long suite: it renders every view many times.)
 *
 *   node tests/eraaudit.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { periodText } from '../src/modules/world/Eras.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
/** [pattern, the year it existed from]. A note saying when something comes ("from about", "not yet") is fine. */
const WORDS = [
  [/smartphone/i, 2007], [/\binternet\b/i, 1991], [/\bonline\b/i, 1995], [/\bwebsite/i, 1994], [/\bSWIFT\b/, 1973],
  [/\b401\(k\)/, 1978], [/\bIVF\b/, 1978], [/\bSSDI\b/, 1956], [/Homeland Security/, 2003], [/\bNATO\b/, 1949],
  [/World Bank/, 1945], [/Young Professionals/, 1963], [/Film, TV/, 1950], [/\bCIA\b/, 1947], [/credit score/i, 1989],
  [/Kisan Credit/, 1998], [/same-sex/i, 1990], [/Europe et des Affaires/, 2017], [/withheld from pay/, 1944], [/\bairports?\b/i, 1950],
];
const OK = /not yet|from about|until|comes in|arrives|first|begins|before|no [a-z]+ yet|\(from \d{4}\)/i;
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

const tests = {
  'no screen mentions what had not been invented'() {
    const found = [];
    for (const year of [1835, 1890, 1925, 1955]) for (const cc of ['US', 'GB', 'FR']) {
      const engine = new Engine({ store: new Store(memory()), rng: new Random(year), modules: MODULES });
      const state = engine.newLife({ countryId: cc, startYear: year - 30 });
      state.character.age = 30;
      state.prompts = [];
      state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'history', year: 22 });
      for (const [tab, view] of Object.entries(VIEWS)) {
        const text = strip(periodText(String(view(state, {}) ?? '')));
        for (const [re, from] of WORDS) {
          if (year >= from) continue;
          const m = re.exec(text);
          if (!m) continue;
          const around = text.slice(Math.max(0, m.index - 60), m.index + 60);
          if (OK.test(around)) continue;
          found.push(`${year} ${cc} ${tab}: …${around}…`);
        }
      }
    }
    assert.deepEqual(found, []);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.message.split('\n').slice(0, 30).join('\n    ')}`); }
}
if (failed) process.exit(1);
