// Audit: military rank ladders and uniformed civilian ladders as they read in each year.
//   node tools/ranks.mjs [CC ...] [--years=1850,1900,...] [--civil]
import { setEraYear, periodTitle } from '../src/modules/world/Eras.js';
import { branchOf, rankOf } from '../src/modules/military/MilitaryEngine.js';
import '../src/modules/registry.js';
import { PROFESSIONS } from '../src/modules/career/JobTrees.js';

const args = process.argv.slice(2);
const ccs = args.filter((a) => !a.startsWith('--'));
const years = (args.find((a) => a.startsWith('--years='))?.slice(8) ?? '1820,1860,1900,1916,1940,1960,1990,2020').split(',').map(Number);
const civil = args.includes('--civil');
export function ladder(nation, branch, track, year) {
  setEraYear(year);
  try {
    const svc = { nation: nation === 'US' ? undefined : nation, branch, track, grade: 0 };
    const titles = branchOf(svc)?.[track] ?? [];
    return titles.map((_, grade) => rankOf({ ...svc, grade }).title);
  } catch { return []; } finally { setEraYear(null); }
}
if (!civil) for (const cc of ccs.length ? ccs : ['US', 'GB', 'DE', 'FR', 'RU', 'JP', 'IT', 'IN', 'CA', 'AU']) for (const b of ['army', 'navy', 'airforce', 'marines']) for (const t of ['enlisted', 'officer']) {
  let prev = null;
  for (const y of years) { const l = ladder(cc, b, t, y).join(' · '); if (l && l !== prev) console.log(`${cc} ${b} ${t} ${y}: ${l}`); prev = l; }
}
if (civil) for (const id of ccs.length ? ccs : ['police', 'fire', 'corrections', 'sheriff', 'statePolice', 'gb_police', 'gb_fire', 'usms', 'jail', 'publicWorks']) {
  const p = PROFESSIONS[id]; if (!p) continue;
  let prev = null;
  for (const y of years) { setEraYear(y); const l = p.levels.map((v) => periodTitle(v.title)).join(' · '); setEraYear(null); if (l !== prev) console.log(`${id} ${y}: ${l}`); prev = l; }
}
