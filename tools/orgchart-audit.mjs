// Audit: workplace org charts across careers, countries, eras and rungs. Flags charts where you
// appear other than once, someone below your grade sits above you, someone above your grade sits
// below you, the organisation's head isn't at the top, or a firm's own name shows as a unit.
//
//   node tools/orgchart-audit.mjs [--strict] [--quick]
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { professionsFor, getProfession } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { ladderFor } from '../src/modules/career/Ladder.js';
import { workplaceChart } from '../src/modules/org/OrgChart.js';
import { deptCeiling } from '../src/modules/org/Organizations.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const quick = process.argv.includes('--quick');
const CELLS = quick
  ? [['US', 1960], ['GB', 2010], ['TW', 1960], ['DE', 1990]]
  : [['US', 1900], ['US', 1960], ['US', 2015], ['GB', 1925], ['GB', 1970], ['GB', 2010], ['TW', 1960], ['TW', 2010], ['DE', 1990], ['FR', 1965], ['IN', 1990], ['JP', 1980], ['NG', 2000], ['AU', 1950], ['BR', 2005]];
const flat = (n) => [n, ...(n.children ?? []).flatMap(flat)];
const pathTo = (n, acc = []) => (n.you ? [...acc, n] : (n.children ?? []).map((c) => pathTo(c, [...acc, n])).find(Boolean));
const findings = new Map();
const flag = (id, ex) => { const f = findings.get(id) ?? { n: 0, ex: [] }; f.n++; if (f.ex.length < 5) f.ex.push(ex); findings.set(id, f); };
let charts = 0;

for (const [cc, year] of CELLS) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(year + cc.charCodeAt(0)), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - 45 });
  state.prompts = [];
  state.character.age = 45;
  for (const p of professionsFor(state)) {
    for (let k = 0; k < 2; k++) {
      let emp;
      try { emp = createEmployer(engine.rng, state, p, state.character.regionId); } catch { continue; }
      const ladder = ladderFor(p, emp.size);
      if (!ladder.length) continue;
      const topGrade = Math.max(...ladder.map((l) => l.grade ?? 0));
      const picks = [...new Set([ladder[0], ladder[Math.floor(ladder.length / 2)], ladder.at(-2), ladder.find((l) => l.grade === topGrade)].filter(Boolean))];
      for (const level of picks) {
        let chart, j;
        try {
          state.career.job = null;
          hire(engine.context(), { professionId: p.id, levelId: level.id, employer: emp });
          j = state.career.job;
          if (!j) continue;
          chart = workplaceChart(state, j);
        } catch (e) { flag('chart throws', `${cc} ${year} ${p.id}/${level.id}: ${e.message}`); continue; }
        if (!chart) continue;
        charts++;
        const where = `${cc} ${year} ${p.id}/${level.id} "${j.title}" at ${j.employer?.name} (${j.employer.size})`;
        const all = flat(chart);
        const yous = all.filter((n) => n.you);
        if (yous.length !== 1) { flag('you appear other than once', `${where}: ${yous.length}`); continue; }
        const up = pathTo(chart);
        const you = up.at(-1);
        const gradeOf = (n) => (n.levelId ? ladder.find((l) => l.id === n.levelId)?.grade : null);
        const mine = level.grade ?? 0;
        const lowerAbove = up.slice(0, -1).filter((n) => n.kind === 'rank' && gradeOf(n) != null && gradeOf(n) < mine);
        if (lowerAbove.length) flag('a lower grade above you', `${where}: ${up.map((n) => n.title).join(' > ')}`);
        const higherBelow = flat(you).slice(1).filter((n) => n.kind === 'rank' && gradeOf(n) != null && gradeOf(n) > mine);
        if (higherBelow.length) flag('a higher grade below you', `${where}: ${higherBelow.map((n) => n.title).join(', ')}`);
        const org = state.orgs?.byId?.[j.employer.orgId];
        if (org && j.employer.deptId) {
          const prof = getProfession(j.professionId);
          const rungs = ladderFor(prof, j.employer.size);
          const dc = deptCeiling(org, j.employer.deptId, prof, j.employer.size);
          const idx = rungs.findIndex((l) => l.id === level.id);
          if (idx >= dc.orgTop && up.length > 2) flag('the head of the organisation is not at the top', `${where}: ${up.map((n) => n.title).join(' > ')}`);
        }
        if ((org?.business || org?.sector === 'private') && all.some((n) => n.kind === 'unit' && n !== chart && n.title === j.employer.name && n.title !== org?.name)) flag('a firm\'s own name as a unit', where);
      }
    }
  }
}
for (const [id, f] of findings) { console.log(`✘ ${id}: ${f.n}`); for (const e of f.ex) console.log(`    ${e}`); }
console.log(`\n${charts} charts looked at, ${[...findings.values()].reduce((a, f) => a + f.n, 0)} flags.`);
if (process.argv.includes('--strict') && findings.size) process.exit(1);
