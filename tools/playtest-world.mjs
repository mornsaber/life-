// Phone-width playtest of the life-in-its-world screens: a well-off Briton born in 1880, with
// servants, a villa, collections, gadgets in the house, a club, letters from abroad and the map;
// then the same screens in French; then the epilogue after death. Screenshots each.
//
//   PORT=8765 node server.js &
//   node tools/playtest-world.mjs <outdir>
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { mkdirSync } from 'node:fs';
const pw = await import('/opt/node-tools/node_modules/playwright/index.js');
const chromium = pw.chromium ?? pw.default.chromium;

const OUT = process.argv[2] ?? 'playtest';
mkdirSync(OUT, { recursive: true });
const storage = new Map();
const mem = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: (k) => storage.delete(k) };
let engine; let s;
// A life that reaches 44 (an accident can still end one early: try the next seed).
for (let seed = 11; seed < 40; seed++) {
  storage.clear();
  engine = new Engine({ store: new Store(mem), rng: new Random(seed), modules: MODULES });
  s = engine.newLife({ countryId: 'GB', startYear: 1880, firstName: 'Edith', lastName: 'Ashworth', gender: 'female' });
  while (s.character.alive !== false && s.character.age < 44) { engine.autoResolve(); s.prompts = []; Object.assign(s.stats, { health: 90 }); if (s.character.age === 20) s.finances.cash += 3e6; engine.ageUp(); }
  if (s.character.alive !== false) break;
}
console.log('life ready at', s.character.age);
const st = engine.state;
st.prompts = [];
st.finances.cash = 5e6;
if (!st.housing.rental && !st.housing.properties.length) engine.dispatch('housing.rent', 'house');
for (const r of ['maid', 'cook', 'nanny', 'gardener', 'chauffeur', 'ladysMaid']) engine.dispatch('property.hire', r);
engine.dispatch('estate.villa', 'riviera');
engine.dispatch('estate.collect', 'stamps');
engine.dispatch('estate.collect', 'wine');
engine.dispatch('fandom.follow');
const brother = st.people.list.find((p) => p.relation === 'sibling' && p.alive);
if (brother) brother.livesIn = 'AU';
for (let i = 0; i < 3; i++) { engine.autoResolve(); st.prompts = []; engine.ageUp(); }
st.prompts = [];
engine.store.save();
const saved = Object.fromEntries(storage);

const b = await chromium.launch();
const errors = [];
async function tour(lang, tabs) {
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await c.newPage();
  page.setDefaultTimeout(3000);
  page.on('pageerror', (e) => errors.push(`${lang}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${lang}: ${m.text()}`); });
  await c.addInitScript(([data, l]) => { for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v); localStorage.setItem('lifesim.settings', JSON.stringify({ lang: l, tips: false })); }, [saved, lang]);
  await page.goto('http://localhost:8765/', { waitUntil: 'networkidle' });
  for (const [group, tab] of tabs) {
    await page.click(`[data-action="ui.menu"][data-arg="${group}"]`).catch(() => {});
    await page.waitForTimeout(150);
    if (tab === 'menu') { await page.screenshot({ path: `${OUT}/${lang}-${group}-menu.png` }); continue; }
    await page.locator(`[data-action="ui.tab"][data-arg="${tab}"]`).first().click().catch(() => {});
    await page.waitForTimeout(250);
    // Open folded cards so their bodies render.
    for (const d of await page.locator('details.card-fold:not([open])').all()) await d.locator('summary').click().catch(() => {});
    await page.waitForTimeout(150);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (wide) errors.push(`${lang}/${tab}: horizontal scroll at phone width`);
    await page.screenshot({ path: `${OUT}/${lang}-${tab}.png`, fullPage: true });
    console.log('shot', lang, tab);
  }
  await c.close();
}
await tour('en', [['assets', 'property'], ['assets', 'money'], ['assets', 'home'], ['relationships', 'people'], ['activities', 'activities'], ['activities', 'move']]);
await tour('fr', [['assets', 'menu'], ['assets', 'property']]);
await b.close();
console.log(errors.length ? errors.join('\n') : 'no errors');
