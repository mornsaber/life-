// Phone-width playtest of the breakaway and new-places screens: an Edinburgh activist who founds
// the Scotland Independence Movement and reaches its moment; a Honolulu plantation worker in
// 1900; a Lhasa life in 1959 with the uprising prompt open; a Soviet Estonia in 2010 where the
// Wall never fell. Screenshots each, and reports errors or horizontal scroll.
//
//   PORT=8765 node server.js &
//   node tools/playtest-states.mjs <outdir>
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { mkdirSync } from 'node:fs';
const pw = await import('/opt/node-tools/node_modules/playwright/index.js');
const chromium = pw.chromium ?? pw.default.chromium;

const OUT = process.argv[2] ?? 'playtest';
mkdirSync(OUT, { recursive: true });

/** Build a life in memory and return its save. */
function build(fn) {
  const storage = new Map();
  const mem = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: (k) => storage.delete(k) };
  const engine = new Engine({ store: new Store(mem), rng: new Random(7), modules: MODULES });
  fn(engine);
  engine.store.save();
  return Object.fromEntries(storage);
}
const grow = (engine, age) => { const s = engine.state; while (s.character.alive !== false && s.character.age < age) { engine.autoResolve(); s.prompts = []; s.stats.health = 90; engine.ageUp(); } s.prompts = []; };

const lives = {
  edinburgh: build((engine) => {
    const s = engine.newLife({ countryId: 'GB', firstName: 'Morag', lastName: 'Ross', gender: 'female' });
    s.character.regionId = 'edinburgh';
    grow(engine, 30);
    (s.civic ??= {}).activism = { cause: 'independence', influence: 70 };
    engine.dispatch('movements.found');
    Object.assign(s.civic.movement, { strength: 85, members: 600000 });
    for (let i = 0; i < 10 && !s.prompts.some((p) => p.type === 'movements.breakaway'); i++) { s.prompts = []; s.stats.health = 90; s.civic.movement.strength = 85; engine.ageUp(); s.prompts = s.prompts.filter((p) => p.type === 'movements.breakaway'); }
  }),
  honolulu: build((engine) => {
    const s = engine.newLife({ countryId: 'US', startYear: 1882, firstName: 'Kalani', lastName: 'Kahale', gender: 'male' });
    s.character.regionId = 'honolulu';
    grow(engine, 20);
  }),
  lhasa: build((engine) => {
    const s = engine.newLife({ countryId: 'CN', startYear: 1934, firstName: 'Tenzin', lastName: 'Dorje', gender: 'male' });
    s.character.regionId = 'lhasa';
    grow(engine, 24);
    s.prompts = [];
    engine.ageUp();
    s.prompts = s.prompts.filter((p) => p.type?.startsWith('livingHistory.'));
  }),
  tallinn: build((engine) => {
    const s = engine.newLife({ countryId: 'EE', startYear: 1975, firstName: 'Kadri', lastName: 'Tamm', gender: 'female' });
    (s.era.skipped ??= []).push('sovietCollapse');
    grow(engine, 35);
  }),
};

const b = await chromium.launch();
const errors = [];
async function tour(name, tabs, { prompt = false } = {}) {
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await c.newPage();
  page.setDefaultTimeout(3000);
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });
  await c.addInitScript((data) => { for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v); localStorage.setItem('lifesim.settings', JSON.stringify({ lang: 'en', tips: false })); }, lives[name]);
  await page.goto('http://localhost:8765/', { waitUntil: 'networkidle' });
  if (prompt) { await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}/${name}-prompt.png` }); console.log('shot', name, 'prompt'); await page.locator('.modal button, [data-action="prompt.choose"]').last().click().catch(() => {}); await page.waitForTimeout(300); }
  for (const [group, tab] of tabs) {
    await page.keyboard.press('Escape').catch(() => {});
    await page.click(`[data-action="ui.menu"][data-arg="${group}"]`).catch(() => {});
    await page.waitForTimeout(150);
    await page.locator(`[data-action="ui.tab"][data-arg="${tab}"]`).first().click().catch(() => {});
    await page.waitForTimeout(250);
    for (const d of await page.locator('details.card-fold:not([open])').all()) await d.locator('summary').click().catch(() => {});
    await page.waitForTimeout(150);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (wide) errors.push(`${name}/${tab}: horizontal scroll at phone width`);
    await page.screenshot({ path: `${OUT}/${name}-${tab}.png`, fullPage: true });
    console.log('shot', name, tab);
  }
  await c.close();
}
await tour('edinburgh', [['relationships', 'community']], { prompt: true });
await tour('honolulu', [['occupation', 'career']]);
await tour('lhasa', [], { prompt: true });
await tour('tallinn', [['assets', 'money'], ['activities', 'move']]);
await b.close();
console.log(errors.length ? errors.join('\n') : 'no errors');
