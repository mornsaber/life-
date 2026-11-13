/**
 * Start menu defaults to any year; organisation flags (UN, EU, Holy See) exist as images;
 * an appointed UN Secretary-General is never shown as an Assistant Secretary-General.
 *
 *   node tests/startflags.js
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { newLifeForm, flagEmojiToImg } from '../src/ui/Components.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

const tests = {
  'the start menu defaults to any year, not today'() {
    const html = newLifeForm({ firstName: 'A', lastName: 'B' });
    assert.match(html, /<option value="random" selected>🎲 Any year/);
    assert.ok(!/<option value="today" selected>/.test(html));
  },
  'every flag emoji in the game has an image'() {
    const codes = new Set();
    const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = `${d}/${f.name}`; if (f.isDirectory()) walk(p); else if (p.endsWith('.js')) for (const m of fs.readFileSync(p, 'utf8').matchAll(/([\u{1F1E6}-\u{1F1FF}])([\u{1F1E6}-\u{1F1FF}])/gu)) codes.add(String.fromCharCode(m[1].codePointAt(0) - 0x1f1e6 + 97, m[2].codePointAt(0) - 0x1f1e6 + 97)); } };
    walk('src');
    const missing = [...codes].filter((c) => !fs.existsSync(`icons/flags/${c}.svg`));
    assert.deepEqual(missing, []);
    assert.match(flagEmojiToImg('🇺🇳'), /flags\/un\.svg/);
  },
  'the UN Secretary-General is appointed as Secretary-General'() {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(5), modules: MODULES });
    const state = engine.newLife({ countryId: 'NO' });
    for (let i = 0; i < 45 && state.character.alive; i++) { state.prompts = []; state.stats.health = 95; engine.ageUp(); }
    state.prompts = [];
    engine.context().prompt({ type: 'intlOrgs.appointment', title: 'x', text: 'x', options: [{ id: 'accept', label: 'a' }], data: { post: 'unSG', employer: 'United Nations Secretariat (New York)' } });
    const q = state.prompts.at(-1);
    const chance = engine.rng.chance; engine.rng.chance = () => true;
    engine.resolvePrompt(q.id, 'accept');
    engine.rng.chance = chance;
    assert.equal(state.career.job.title, 'Secretary-General of the United Nations');
    const text = state.log.at(-1).entries.map((e) => e.text).join(' ');
    assert.ok(!/Assistant Secretary-General/.test(text), text);
    state.prompts = []; state.stats.health = 95; engine.ageUp();
    assert.equal(state.career.job.title, 'Secretary-General of the United Nations');
    const html = Object.values(VIEWS).map((v) => { try { return v(state, {}); } catch { return ''; } }).join('');
    assert.ok(!/Assistant Secretary-General/.test(html));
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 5).join('\n  ')}`); }
}
if (failed) process.exit(1);
