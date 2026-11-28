// Phone-width playtest of the industry cards: a Cardiff collier in 1900 who also owns a colliery.
// Screenshots the Industry & Trade card (World) and Industrial Concerns (Business), checks overflow.
//
//   PORT=8765 node server.js &
//   node tools/playtest-industry.mjs <outdir>
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { mkdirSync } from 'node:fs';
const pw = await import('/opt/node-tools/node_modules/playwright/index.js');
const chromium = pw.chromium ?? pw.default.chromium;

const OUT = process.argv[2] ?? 'playtest';
mkdirSync(OUT, { recursive: true });
const storage = new Map();
const mem = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: (k) => storage.delete(k) };
const engine = new Engine({ store: new Store(mem), rng: new Random(4), modules: MODULES });
const s = engine.newLife({ countryId: 'GB', startYear: 1870, firstName: 'Evan', lastName: 'Davies', gender: 'male' });
s.character.regionId = 'cardiff';
while (s.character.age < 30) { s.prompts = []; Object.assign(s.stats, { health: 90 }); engine.ageUp(); }
const st = engine.state;
st.prompts = [];
const ctx = engine.context();
const p = getProfession('coalMining');
hire(ctx, { professionId: p.id, levelId: p.levels[0].id, employer: createEmployer(ctx.rng, st, p, st.character.regionId) });
st.finances.cash = 5e6;
engine.dispatch('concerns.found', { kind: 'coal' });
st.prompts = [];
engine.store.save();
const saved = Object.fromEntries(storage);

const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await c.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await c.addInitScript((data) => { for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v); }, saved);
await page.goto('http://localhost:8765/', { waitUntil: 'networkidle' });
for (const [group, tab, title] of [['home', 'world', 'Industry & Trade'], ['occupation', 'business', 'Industrial Concerns']]) {
  if (group === 'home') await page.click('[data-action="ui.home"]').catch(() => {});
  else await page.click(`[data-action="ui.menu"][data-arg="${group}"]`).catch(() => {});
  await page.waitForTimeout(200);
  const row = page.locator(`[data-action="ui.tab"][data-arg="${tab}"]`).first();
  if (await row.count()) await row.click().catch(() => {});
  else console.log('no row for', tab, 'in', group);
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const el = page.locator('.card', { has: page.locator('h2, h3, .card-title', { hasText: title }) }).first();
  const found = await el.count();
  if (found) await el.screenshot({ path: `${OUT}/${tab}-industry.png` }).catch((e) => console.log(e.message));
  const wide = found ? await el.evaluate((n) => [...n.querySelectorAll('*')].filter((x) => x.getBoundingClientRect().right > window.innerWidth + 1).map((x) => x.tagName + '.' + x.className).slice(0, 5)) : [];
  console.log(tab, 'overflow', overflow, 'card', found ? 'found' : 'MISSING', 'too wide:', wide.join(' '));
}
console.log('errors:', errors.slice(0, 5));
await b.close();
