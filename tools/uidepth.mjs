// UI depth audit: how many navigation clicks from the story screen before each game action is
// visible (phone size). Common decisions should be within 2 clicks, everything within 3.
//
//   PORT=8765 node server.js &      (the game, served)
//   LIFE=35 MAXD=4 node tools/uidepth.mjs > ud35.json
//
// LIFE=12|35|70 picks the life (built in Node, loaded into the browser's storage). Output:
// JSON { age, best: { 'action|arg': { depth, label, path } } }. Needs Playwright's Chromium.
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { professionsFor } from '../src/modules/career/JobTrees.js';
import { applicationEligibility } from '../src/modules/career/CareerEngine.js';
const pw = await import('/opt/node-tools/node_modules/playwright/index.js');
const chromium = pw.chromium ?? pw.default.chromium;

const AGE = Number(process.env.LIFE ?? 35);
const MAXD = Number(process.env.MAXD ?? 4);
const storage = new Map();
const mem = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: (k) => storage.delete(k) };
const engine = new Engine({ store: new Store(mem), rng: new Random(11), modules: MODULES });
const s = engine.newLife({ countryId: 'US', firstName: 'Ui', lastName: 'Audit' });
const solve = () => { for (let g = 0; g < 40 && s.prompts.length; g++) { const p = s.prompts[0]; const o = p.options.find((x) => !x.disabled && x.tone !== 'danger') ?? p.options[0]; engine.resolvePrompt(p.id, o.id); if (s.prompts[0] === p) s.prompts.shift(); } };
while (s.character.age < AGE && s.character.alive) {
  solve();
  const a = s.character.age;
  if (a >= 22 && !s.career.job && !s.retirement.retired) { for (const p of professionsFor(s).filter((x) => applicationEligibility(s, x.id).ok).slice(0, 5)) { engine.dispatch('career.apply', p.id); solve(); if (s.career.job) break; } }
  if (a >= 24 && a < 40 && !s.people.list.some((x) => x.alive && ['partner', 'spouse'].includes(x.relation))) { engine.dispatch('people.date'); solve(); }
  if (a === 66) { engine.dispatch('retirement.retire'); solve(); }
  // The audit needs the life alive at the target age: keep it well.
  Object.assign(s.stats, { health: Math.max(s.stats.health, 85), happiness: Math.max(s.stats.happiness, 70) });
  for (const c of s.health?.conditions ?? []) { c.remission = true; c.treated = false; }
  engine.ageUp();
}
if (!s.character.alive) throw new Error(`died at ${s.character.age}`);
s.prompts = [];
engine.store.save();
const saved = Object.fromEntries(storage);

let b = await chromium.launch();
let ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript((data) => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } }, saved);
let page = await ctx.newPage();
const relaunch = async () => { try { await b.close(); } catch {} b = await chromium.launch(); ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); page = await ctx.newPage(); await page.goto('http://localhost:8765/', { waitUntil: 'networkidle' }); };
await page.goto('http://localhost:8765/', { waitUntil: 'networkidle' });
const snapshot = JSON.stringify(saved);

/** Visible navigation controls and game actions on the current screen. */
const scan = () => page.evaluate(() => {
  const vis = (e) => e.offsetParent !== null || e.getClientRects().length > 0;
  const nav = [];
  const acts = [];
  for (const e of document.querySelectorAll('[data-action]')) {
    if (!vis(e) || e.disabled) continue;
    const a = e.dataset.action;
    const arg = e.dataset.arg ?? '';
    const label = (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 50);
    if (e.tagName === 'SELECT') { for (const o of e.options) nav.push({ kind: 'select', action: a, name: e.name, value: o.value, label: `${label.slice(0, 20)}=${o.text.slice(0, 30)}` }); continue; }
    if (a.startsWith('ui.')) { if (!['ui.home', 'ui.hideTips', 'ui.logMore', 'ui.closePanel'].includes(a)) nav.push({ kind: 'click', action: a, arg, label }); }
    else acts.push({ action: a, arg, label });
  }
  for (const sm of document.querySelectorAll('details:not([open]) > summary')) if (vis(sm)) nav.push({ kind: 'summary', label: sm.innerText.trim().slice(0, 50) });
  const sig = acts.map((x) => `${x.action}|${x.arg}`).sort().join(',') + '#' + nav.map((x) => `${x.action ?? ''}|${x.arg ?? x.label}`).sort().join(',');
  return { nav, acts, sig };
});
const reset = async () => {
  await page.evaluate((data) => { localStorage.clear(); for (const [k, v] of Object.entries(JSON.parse(data))) localStorage.setItem(k, v); }, snapshot);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.dock, .appbar', { timeout: 5000 }).catch(() => {});
};
const step = async (n) => {
  if (n.kind === 'click') {
    const sel = `[data-action="${n.action}"]${n.arg ? `[data-arg="${n.arg.replace(/"/g, '\\"')}"]` : ':not([data-arg])'}`;
    const els = await page.$$(sel);
    for (const el of els) if (await el.isVisible()) { await el.click({ timeout: 1500 }).catch(() => {}); break; }
  } else if (n.kind === 'summary') {
    await page.locator('details:not([open]) > summary', { hasText: n.label }).first().click({ timeout: 1500 }).catch(() => {});
  } else if (n.kind === 'select') {
    await page.selectOption(`select[data-action="${n.action}"]${n.name ? `[name="${n.name}"]` : ''}`, n.value, { timeout: 1500 }).catch(() => {});
  }
  await page.waitForTimeout(25);
};

const best = {};
const seen = new Set();
const expanded = new Set();
let frontier = [[]];
let visits = 0;
for (let d = 0; d <= MAXD && frontier.length; d++) {
  const next = [];
  for (const path of frontier) {
    let got = null;
    for (let tries = 0; tries < 2 && !got; tries++) {
      try { await reset(); for (const n of path) await step(n); got = await scan(); } catch (e) { console.error(`retry after: ${e.message.split('\n')[0]}`); await relaunch(); }
    }
    if (!got) continue;
    const { nav, acts, sig } = got;
    visits += 1;
    if (seen.has(sig)) continue;
    seen.add(sig);
    for (const a of acts) {
      const key = `${a.action}|${a.arg}`;
      if (!best[key] || best[key].depth > d) best[key] = { depth: d, label: a.label, path: path.map((p) => p.label || p.arg || p.action) };
    }
    // Tabs, menus and go-to links land on the same screen from anywhere: follow each once.
    if (d < MAXD) for (const n of nav) {
      const absolute = n.kind === 'click' && ['ui.tab', 'ui.menu', 'ui.go'].includes(n.action);
      const key = `${n.action}|${n.arg ?? n.label}`;
      if (absolute) { if (expanded.has(key)) continue; expanded.add(key); }
      next.push([...path, n]);
    }
  }
  frontier = next;
  console.error(`depth ${d}: ${visits} visits, ${seen.size} screens, ${Object.keys(best).length} actions, next ${next.length}`);
}
await b.close();
console.log(JSON.stringify({ age: AGE, best }));
