// Phone-width playtest of the newer cards: a British detective sergeant in 1975 with grown children,
// grandchildren, a will, board invitations and the Rights card. Screenshots each tab.
//
//   PORT=8765 node server.js &
//   node tools/playtest-new.mjs <outdir>
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { getProfession, PROFESSION_LIST } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { mkdirSync } from 'node:fs';
const pw = await import('/opt/node-tools/node_modules/playwright/index.js');
const chromium = pw.chromium ?? pw.default.chromium;

const OUT = process.argv[2] ?? 'playtest';
mkdirSync(OUT, { recursive: true });
const storage = new Map();
const mem = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: (k) => storage.delete(k) };
const engine = new Engine({ store: new Store(mem), rng: new Random(5), modules: MODULES });
const s = engine.newLife({ countryId: 'GB', startYear: 1920, firstName: 'Ada', lastName: 'Thornbury', gender: 'female' });
while (s.character.age < 55) { s.prompts = []; Object.assign(s.stats, { health: 90 }); engine.ageUp(); }
const st = engine.state;
st.prompts = [];
const ctx = engine.context();
const prof = PROFESSION_LIST.find((p) => (p.template ?? p.id) === 'police' && p.country === 'GB') ?? getProfession('police');
const emp = createEmployer(ctx.rng, st, prof, st.character.regionId);
emp.size = 'large';
hire(ctx, { professionId: prof.id, levelId: 'sergeant', employer: emp });
Object.assign(st.career.job, { yearsAtEmployer: 12, performance: 90, boss: 90 });
st.career.job.assignment = { id: 'cid', since: 50 };
engine.dispatch('assignments.request', 'traffic');
st.career.job.assignment = { id: 'cid', since: 50 };
delete st.career.job.baseTitle;
for (const m of MODULES) if (m.id === 'assignments') m.onAgeUp(engine.context());
for (const n of ['Mary', 'John']) st.people.list.push({ id: `kid_${n}`, firstName: n, lastName: 'Thornbury', relation: 'child', gender: n === 'Mary' ? 'female' : 'male', alive: true, relationship: 70, ageOffset: -27, kids: [{ firstName: `${n}'s boy`, gender: 'male', bornAge: 48, bond: 60 }, { firstName: `${n}'s girl`, gender: 'female', bornAge: 52, bond: 40 }] });
st.finances.cash = 40000;
engine.dispatch('people.writeWill', 'children');
engine.dispatch('lateLife.favour', 'kid_Mary');
st.career.history.push({ professionId: prof.id, levelId: 'sergeant', peakGrade: 9, startAge: 22, endAge: 50 });
st.career.boardOffers = [{ kind: 'charity', name: 'the Police Widows\' Fund', fee: 0, role: 'a trustee', until: 56 }, { kind: 'company', name: 'Harbour Security Holdings', fee: 30000, role: 'a director', until: 56 }];
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
for (const [group, tab] of [['occupation', 'career'], ['occupation', 'sidework'], ['relationships', 'people'], ['activities', 'legal'], ['home', 'world'], ['assets', 'home']]) {
  // As a player does it: open the group from the dock, then tap the row.
  if (group === 'home') await page.click('[data-action="ui.home"]').catch(() => {});
  else await page.click(`[data-action="ui.menu"][data-arg="${group}"]`).catch(() => {});
  await page.waitForTimeout(200);
  const row = page.locator(`[data-action="ui.tab"][data-arg="${tab}"]`).first();
  if (await row.count()) await row.click().catch(() => {});
  else console.log('no row for', tab, 'in', group);
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.screenshot({ path: `${OUT}/${tab}.png`, fullPage: true });
  // Close-ups of the newer cards.
  for (const title of ['Postings', 'Grandchildren', 'Your Rights', 'Legacy', 'Boards']) {
    const el = page.locator('.card', { has: page.locator('h2, h3, .card-title', { hasText: title }) }).first();
    if (await el.count()) await el.screenshot({ path: `${OUT}/${tab}-${title.replace(/\s/g, '')}.png` }).catch(() => {});
  }
  await page.screenshot({ path: `${OUT}/${tab}-top.png` });
  const text = await page.evaluate(() => document.body.innerText);
  console.log(tab, 'overflow', overflow, '| has:', ['Postings', 'Grandchildren', 'Your wishes', 'Your Rights', 'Invitations', 'Detective'].filter((w) => text.includes(w)).join(', '));
}
console.log('errors:', errors.slice(0, 5));
await b.close();
