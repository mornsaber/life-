// Audit: the departments, divisions and units a job sits in, across careers, countries and eras.
// Flags names that didn't exist yet (HR before personnel became "human resources", cybercrime
// before computers…).
//
//   node tools/orgunits.mjs [--all]
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { PROFESSION_LIST, professionsFor } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { periodText, setEraYear } from '../src/modules/world/Eras.js';

/** [word, first year it makes sense] */
export const UNIT_WORDS = [
  [/\bHuman Resources\b|\bHR\b/, 1975], [/\bPersonnel\b/, 1910], [/\bInformation Technology\b|\bIT\b(?! )|\bIT (Department|Services|Division)/, 1980], [/\bData Processing\b/, 1955],
  [/Cyber/, 1995], [/Digital/, 1980], [/Compliance/, 1985], [/Diversity|Inclusion/, 1990], [/Sustainab/, 1995], [/Social Media/, 2008], [/Customer Experience|\bCX\b/, 2000],
  [/Analytics|Data Science/, 2005], [/\bData\b/, 1965], [/Software/, 1965], [/Computer|Computing/, 1955], [/Risk Management/, 1970], [/Public Relations|\bPR\b/, 1920], [/Marketing/, 1920],
  [/\bSWAT\b|Tactical Response|Special Weapons/, 1968], [/\bK-?9\b|Canine|Dog Unit/, 1946], [/Air Support|Aviation Unit|Helicopter/, 1950], [/Counter-?Terror/, 1972], [/Hazmat|Hazardous Materials/, 1975],
  [/Paramedic|Emergency Medical|\bEMS\b/, 1966], [/\b911\b|Communications Center|Emergency Communications/, 1968], [/Narcotics|Drug/, 1914], [/Traffic(?! Department)/, 1905], [/Motor(ised|ized)? (Patrol|Unit|Division)|Motorcycle/, 1905],
  [/Radio/, 1920], [/Crime Scene|Forensic/, 1910], [/Intelligence/, 1880], [/Fraud/, 1850], [/Domestic Violence|Family Liaison|Victim/, 1975], [/Sex Offen|Sexual Offen/, 1980], [/Child Protection|Child Abuse/, 1962],
  [/Internal Affairs|Professional Standards/, 1950], [/Community (Policing|Relations|Engagement)/, 1965], [/Quality|QA\b/, 1950], [/Procurement/, 1950], [/Logistics/, 1950], [/Operations Research/, 1945],
  [/Telemetry|Telehealth|Telemedicine/, 1990], [/Emergency Department|\bA&E\b/, 1950], [/Intensive Care|\bICU\b|Critical Care/, 1955], [/Oncology/, 1950], [/Radiology|Imaging/, 1900], [/Anaesthe|Anesthe/, 1850],
  [/Neonatal|NICU/, 1960], [/Physiotherapy|Physical Therapy/, 1915], [/Psychiatr/, 1850], [/Cardiology/, 1920], [/Dialysis|Nephrology/, 1960], [/Pharmacy/, 1850],
  [/Environmental/, 1970], [/Climate/, 2000], [/Renewable|Solar|Wind Energy/, 1990], [/Nuclear/, 1932], [/Aerospace|Space/, 1958], [/Aviation|Aircraft|Air /, 1910], [/Electronics/, 1930], [/Electric/, 1880],
  [/Television|\bTV\b/, 1940], [/Mobile|Wireless(?! Telegraph)/, 1990], [/Online|Internet|Web/, 1995], [/E-?commerce/, 1997], [/Call Centre|Call Center|Contact Cent/, 1985], [/Helpdesk|Help Desk/, 1985],
  [/Freeway|Interstate/, 1956], [/Container/, 1960], [/Credit Card/, 1958], [/Wealth Management/, 1990], [/Private Equity/, 1980], [/Hedge Fund/, 1970], [/Derivatives/, 1980], [/Mortgage-Backed|Securiti[sz]ation/, 1980],
];
export const unitTooEarly = (text, year) => UNIT_WORDS.filter(([re, from]) => year < from && re.test(text)).map(([re, from]) => `${String(re).slice(1, 30)} (<${from})`);

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const CELLS = [['US', 1850], ['US', 1905], ['US', 1935], ['US', 1965], ['GB', 1860], ['GB', 1925], ['GB', 1960], ['DE', 1890], ['FR', 1900], ['IN', 1920], ['JP', 1930], ['US', 2020]];
const all = process.argv.includes('--all');
const seen = new Map();
let rows = 0;
for (const [cc, year] of CELLS) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(year), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - 30 });
  state.character.age = 30;
  for (const p of professionsFor(state)) {
    for (const level of [p.levels[0], p.levels[Math.floor(p.levels.length / 2)], p.levels.at(-2)].filter(Boolean)) {
      try {
        const ctx = engine.context();
        state.career.job = null;
        hire(ctx, { professionId: p.id, levelId: level.id, employer: createEmployer(engine.rng, state, p, state.character.regionId) });
        const j = state.career.job;
        if (!j) continue;
        const names = [j.employer?.deptName, j.employer?.division, j.department?.name, j.department?.unit?.name, j.department?.unit?.within?.name, j.department?.unit?.within?.within?.name].filter(Boolean);
        rows++;
        setEraYear(year);
        for (const n of names.map(periodText)) {
          const bad = unitTooEarly(n, year);
          const key = `${n}`;
          if (bad.length && !seen.has(`${key}|${year}`)) { seen.set(`${key}|${year}`, 1); console.log(`${cc} ${year} ${p.id}/${level.id}: "${n}" — ${bad.join(', ')}`); }
          else if (all && !seen.has(key)) { seen.set(key, 1); console.log(`  ${cc} ${year} ${p.id}: ${n}`); }
        }
      } catch (e) { /* a job that can't be had here */ }
    }
  }
}
setEraYear(null);
console.log(`\n${rows} jobs looked at.`);
if (process.argv.includes('--strict') && [...seen.keys()].some((k) => k.includes('|'))) process.exit(1);
