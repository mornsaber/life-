/**
 * Nobody's chief executive sits under a department manager (org/Organizations.js deptCeiling):
 * across careers and countries, the org chart's department holds no rank that names the head of
 * the whole organisation, and the chain of command never puts a CEO-type boss below a lesser one.
 *
 *   node tests/orgtop.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { professionsFor, getProfession } from '../src/modules/career/JobTrees.js';
import { chainOfCommand } from '../src/modules/org/Organizations.js';
import { workplaceChart } from '../src/modules/org/OrgChart.js';
import { ladderFor } from '../src/modules/career/Ladder.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';

const TOP = /chief executive|\bCEO\b|vice-chancellor|\bowner\b|city manager/i;
const UNDER = /^(?:deputy|vice|assistant|associate)\b(?!-chancellor)/i;
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const bad = [];
const walk = (node, inDept, path) => {
  if (!node) return;
  const here = [...path, node.title];
  if (node.kind === 'rank' && inDept && TOP.test(node.title) && !UNDER.test(node.title)) bad.push(here.join(' > '));
  for (const c of node.children ?? []) walk(c, inDept || node.kind === 'unit', here);
};
let checked = 0;
for (let i = 0; i < 160; i++) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(900 + i), modules: MODULES });
  const state = engine.newLife({ countryId: ['US', 'GB', 'FR', 'DE', 'JP', 'IN', 'BR', 'AU'][i % 8], startYear: 1980 });
  state.character.age = 30;
  state.education.degrees.push({ type: 'highschool', year: 18 }, { type: 'bachelor', major: 'business', year: 22, gpa: 3.5 });
  const profs = professionsFor(state).filter((p) => !p.templateOnly);
  const prof = getProfession(profs[(i * 13) % profs.length].id);
  let ladder; try { ladder = ladderFor(prof, 'large'); } catch { continue; }
  if (!ladder?.length) continue;
  const employer = createEmployer(engine.rng, state, prof, state.character.regionId);
  employer.size = 'large';
  try { hire(engine.context(), { professionId: prof.id, levelId: ladder[(i * 7) % ladder.length].id, employer }); } catch { continue; }
  const job = state.career.job;
  if (!job) continue;
  checked++;
  const c = chainOfCommand(state, job);
  const order = [c?.supervisor, c?.manager, c?.deptHead, c?.orgHead].filter(Boolean).map((x) => x.title ?? '');
  const t = order.findIndex((x) => TOP.test(x) && !UNDER.test(x));
  if (t >= 0 && order.slice(t + 1).some((x) => !TOP.test(x))) bad.push(`${prof.id}: ${order.join(' < ')}`);
  walk(workplaceChart(state, job), false, []);
}
assert.ok(checked > 100, `${checked} jobs checked`);
assert.deepEqual(bad, [], bad.slice(0, 5).join('\n'));
console.log(`✓ no chief executive under a department manager (${checked} jobs)`);
