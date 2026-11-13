/**
 * Measures what each kind of business really pays its owner, by playing it: for every type,
 * a few lives found one (standard size, cash, owner-operator, autopilot) at 30 and run it five
 * years through the real engine. Writes src/modules/business/Outcomes.js — the founding plan
 * shows these instead of a guess.
 *
 *   node tools/business-outcomes.mjs [seeds=5]
 */
import fs from 'node:fs';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { BUSINESS_TYPES } from '../src/modules/business/BusinessTypes.js';
import { grantCredential } from '../src/modules/credentials/LicensingEngine.js';

const SEEDS = Number(process.argv[2] ?? 5);
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

// One adult life per seed, saved once and reloaded for every type (so each type gets the same people).
const bases = [];
for (let seed = 1; seed <= SEEDS; seed++) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed * 101), modules: MODULES });
  const state = engine.newLife({ countryId: 'US', startYear: 2000 });
  for (let i = 0; i < 30 && state.character.alive; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  bases.push({ seed, text: engine.exportLife() });
}

const out = {};
const t0 = Date.now();
for (const [id, t] of Object.entries(BUSINESS_TYPES)) {
  if (t.startup) continue;
  const takes = [];
  let failed = 0;
  for (const b of bases) {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(b.seed * 7 + id.length), modules: MODULES });
    engine.importLife(b.text);
    const state = engine.state;
    state.prompts = [];
    state.finances.cash = t.cost * 3 + 200000;
    const ctx = engine.context();
    for (const c of t.credentials ?? []) { try { grantCredential(ctx, c, { silent: true }); } catch { /* not a credential here */ } }
    for (const p of t.professions ?? []) state.career.history.push({ professionId: p, startAge: state.character.age - 12, endAge: state.character.age - 1 });
    engine.dispatch('business.start', `${id}:cash:llc:standard:`);
    const biz = state.business.current;
    if (!biz || biz.typeId !== id) continue;
    let sum = 0; let n = 0;
    for (let y = 1; y <= 5; y++) {
      state.prompts = [];
      state.stats.health = 90;
      engine.ageUp();
      const now = state.business.current;
      if (!now || now.id !== biz.id) { failed++; break; }
      if (y >= 3) { sum += (now.lastYear?.netIncome ?? 0) + (now.lastYear?.ownerSalary ?? 0); n++; }
    }
    if (n) takes.push(Math.round(sum / n));
  }
  if (!takes.length) continue;
  takes.sort((a, b) => a - b);
  const q = (p) => takes[Math.min(takes.length - 1, Math.floor(p * takes.length))];
  out[id] = { median: q(0.5), low: takes[0], high: takes.at(-1), loss: Math.round(((takes.filter((x) => x < 0).length + failed) / (takes.length + failed)) * 100) / 100, n: takes.length + failed };
  process.stdout.write(`${id} ${JSON.stringify(out[id])}\n`);
}

const body = `/**
 * What each kind of business pays its owner once established (average of years 3–5, owner's
 * salary plus profit), measured by tools/business-outcomes.mjs: real lives founding a
 * standard-size business with cash at 30 and running it five years. US dollars, 2000s.
 * \`loss\` is the share that lost money or closed. Generated: do not edit by hand.
 */
export const OUTCOMES = ${JSON.stringify(out, null, 0).replace(/},"/g, '},\n  "').replace(/^{/, '{\n  ').replace(/}$/, '\n}')};
`;
fs.writeFileSync(new URL('../src/modules/business/Outcomes.js', import.meta.url), body);
console.log(`wrote ${Object.keys(out).length} types in ${Math.round((Date.now() - t0) / 1000)}s`);
