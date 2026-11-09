/**
 * Organisation charts: workplace reporting trees, a unit's chain of command, how a country is governed.
 *
 *   node tests/orgcharts.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { workplaceChart, unitChart, governmentChart } from '../src/modules/org/OrgChart.js';
import { orgTree } from '../src/ui/Components.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (opts, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ gender: 'male', ...opts });
  state.character.age = 30;
  return { engine, state };
};
const walk = (n, f, depth = 0) => { f(n, depth); for (const k of n.children ?? []) walk(k, f, depth + 1); };
const flat = (n) => { const out = []; walk(n, (x, d) => out.push({ ...x, depth: d })); return out; };
const show = process.env.SHOW ? (n) => walk(n, (x, d) => console.log(`${'  '.repeat(d)}${x.you ? '★ ' : ''}${x.title}${x.name ? ` — ${x.name}` : ''}${x.note ? ` (${x.note})` : ''}`)) : () => {};

const tests = {
  'a workplace chart is a reporting tree with you on the path from the top'() {
    for (const [prof, level] of [['nursing', null], ['police', null], ['law', null], ['catholicClergy', null], ['colonialService', null]]) {
      const p = getProfession(prof);
      if (!p) continue;
      const { engine, state } = life({ countryId: 'US' });
      const ctx = engine.context();
      const lv = level ?? p.levels[Math.min(2, p.levels.length - 1)].id;
      hire(ctx, { professionId: prof, levelId: lv, employer: createEmployer(ctx.rng, state, p, state.character.regionId) });
      const chart = workplaceChart(state, state.career.job);
      show(chart);
      const nodes = flat(chart);
      assert.ok(nodes.filter((n) => n.you).length === 1, `${prof}: exactly one "you"`);
      assert.ok(nodes.find((n) => n.you).depth >= 1, `${prof}: you answer to someone`);
      assert.ok(orgTree(chart).includes('<'), 'renders');
    }
  },
  'a unit chart climbs to the commander-in-chief'() {
    const { engine, state } = life({ countryId: 'US' });
    engine.dispatch('military.enlist', 'army:enlisted:active');
    if (!state.military?.service) return;
    const chart = unitChart(state, state.military.service);
    show(chart);
    const nodes = flat(chart);
    assert.ok(/Commander|President/.test(nodes[0].title + (nodes[0].name ?? '')), nodes[0].title);
    assert.ok(nodes.some((n) => n.you), 'you are in it');
    assert.ok(orgTree(chart).includes('<'));
  },
  'how the country is governed, by place and era'() {
    for (const [cc, y] of [['US', null], ['GB', null], ['DE', null], ['DE', 1938], ['KE', 1930], ['RU', 1960], ['ES', 1950], ['JP', null]]) {
      const { state } = life({ countryId: cc, ...(y ? { startYear: y } : {}) });
      const chart = governmentChart(state);
      if (process.env.SHOW) console.log(`--- ${cc} ${y ?? 'today'}`);
      show(chart);
      assert.ok(chart?.title, `${cc} ${y}: a root`);
      assert.ok(flat(chart).length >= 3, `${cc} ${y}: more than a stub`);
      assert.ok(orgTree(chart).includes('<'));
    }
  },
  'the politics tab shows the chart'() {
    const { state } = life({ countryId: 'GB' });
    const v = VIEWS.politics ?? Object.values(VIEWS).find((x) => x.id === 'politics');
    const html = typeof v === 'function' ? v(state) : v?.render?.(state) ?? '';
    if (html) assert.ok(html.includes('Who answers to whom'));
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
