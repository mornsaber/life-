/**
 * The app shell: the bar, the story, the four menus, every screen behind them and the dock
 * render for a new life, a life in the past, a royal life and saves from every past version.
 *
 *   node tests/appshell.js
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { Renderer, GROUPS, VIEWS, YOUR_LIFE } from '../src/ui/Renderer.js';

const memory = (seed = {}) => { const m = new Map(Object.entries(seed)); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const fixture = (name) => fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const LEGACY = { 'save-v1.json': 'lifesim.save.v1', 'save-v3.json': 'lifesim.save.v3', 'save-v4-early.json': 'lifesim.save.v4' };
const clean = (html, label) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, `${label}: ${html.slice(Math.max(0, i - 60), i + 40)}`); };

/** Render home, every menu and every screen a menu lists. */
function walk(engine, label) {
  const r = new Renderer({ root: null, toastRoot: null, engine });
  const s = engine.state;
  s.prompts = [];
  r.tab = 'life';
  const home = r.html(s);
  clean(home, `${label} home`);
  assert.match(home, /class="dock"/);
  assert.match(home, /age-orb/);
  assert.match(home, /stat-bars/);
  for (const [gid, g] of Object.entries(GROUPS)) {
    r.ui.menu = gid;
    const menu = r.html(s);
    clean(menu, `${label} ${gid} menu`);
    assert.match(menu, /menu-row/);
    r.ui.menu = null;
    for (const item of g.items) {
      if (!VIEWS[item.tab] || (item.when && !item.when(s))) continue;
      r.tab = item.tab;
      const page = r.html(s);
      clean(page, `${label} ${item.tab}`);
      assert.match(page, /page-head/, `${label}: ${item.tab} has a back button`);
    }
  }
}

const tests = {
  'a new life, a life in 1890 and a teenager'() {
    for (const [opts, age] of [[{}, 30], [{ countryId: 'GB', startYear: 1860 }, 30], [{ countryId: 'FR' }, 14]]) {
      const engine = new Engine({ store: new Store(memory()), rng: new Random(5), modules: MODULES });
      const s = engine.newLife(opts);
      s.character.age = age;
      walk(engine, JSON.stringify(opts));
    }
  },
  'looking at a screen never changes the save'() {
    for (const [opts, age] of [[{}, 40], [{ countryId: 'GB', startYear: 1880 }, 40]]) {
      const engine = new Engine({ store: new Store(memory()), rng: new Random(7), modules: MODULES });
      const s = engine.newLife(opts);
      for (let i = 0; i < age && s.character.alive; i++) { s.prompts = []; engine.ageUp(); }
      s.prompts = [];
      const before = JSON.stringify(engine.state);
      const r = new Renderer({ root: null, toastRoot: null, engine });
      for (const tab of Object.keys(VIEWS)) { r.tab = tab; r.html(engine.state); }
      for (const gid of Object.keys(GROUPS)) { r.ui.menu = gid; r.html(engine.state); }
      const after = JSON.stringify(engine.state);
      if (before !== after) {
        const a = JSON.parse(before); const b = JSON.parse(after);
        const changed = Object.keys({ ...a, ...b }).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
        assert.fail(`rendering changed: ${changed.join(', ')}`);
      }
    }
  },
  'every screen is reachable from a menu'() {
    const reachable = new Set([...Object.values(GROUPS).flatMap((g) => g.items.map((i) => i.tab)), ...YOUR_LIFE.map((i) => i.tab)]);
    const extra = ['life', 'conditions', 'cover', 'wellbeing', 'chamber', 'party', 'campaign', 'succession', 'household', 'estates', 'cases', 'underworld'];
    for (const id of Object.keys(VIEWS)) assert.ok(reachable.has(id) || extra.includes(id), `${id} is in a menu or a section switcher`);
  },
  'menus are grouped, and a child sees only what a child can do'() {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(3), modules: MODULES });
    const s = engine.newLife({});
    const r = new Renderer({ root: null, toastRoot: null, engine });
    s.prompts = [];
    s.character.age = 6;
    r.ui.menu = 'occupation';
    const kid = r.html(s);
    assert.match(kid, /Education/);
    assert.doesNotMatch(kid, /Business|Politics|Military|Licences/);
    s.character.age = 30;
    const adult = r.html(s);
    for (const h of ['Study &amp; work', 'Service &amp; public life']) assert.match(adult, new RegExp(`menu-head">${h}<`));
    r.ui.menu = 'relationships';
    const rel = r.html(s);
    assert.doesNotMatch(rel, /Honours|Achievements/, 'your record is on the story page, not with people');
    const mum = s.people.list.find((p) => p.relation === 'mother' && p.alive);
    if (mum) assert.match(rel, new RegExp(`person=${mum.id}`), 'your mother is listed, and opens');
  },
  'saves from past versions open in the new shell'() {
    for (const [file, key] of Object.entries(LEGACY)) {
      const engine = new Engine({ store: new Store(memory({ [key]: fixture(file) })), rng: new Random(9), modules: MODULES });
      assert.ok(engine.boot(), file);
      walk(engine, file);
    }
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
