// Are the systems in step? Plays lives where the economy runs itself and checks that every system
// tells the same story as the industry model:
//   recessions     every recession the economy has is a crisis the model had (or a pandemic)
//   ownership      your employer is the state's exactly when the law book says the sector is
//   laws           every "the government acts" line matches a law in the book
//   bank runs      a run on the banks comes only in a banking crisis
//   towns          no "hiring boom" headline for a town whose trade is closing
//   jobs           no job in an industry the country doesn't have
// and lists the economic rules still running on history's dates.
//
//   node tools/sync-audit.mjs [--quick] [--strict]
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { crisisHere, industryOfProfession, industryHere, INDUSTRIES } from '../src/modules/industry/IndustryEngine.js';
import { townTrade } from '../src/modules/industry/Sync.js';
import { stateShare, sectorOf } from '../src/modules/world/Ownership.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { STATUTES, REACTIVE } from '../src/modules/politics/StatuteBook.js';
import { endowment } from '../src/modules/industry/IndustryData.js';

const quick = process.argv.includes('--quick');
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const CELLS = quick ? [['GB', 1880], ['US', 1920], ['DE', 1950]] : [['GB', 1840], ['GB', 1900], ['US', 1880], ['US', 1950], ['DE', 1900], ['FR', 1920], ['JP', 1930], ['IN', 1950], ['KE', 1950], ['BR', 1960], ['GB', 1990]];
const SEEDS = quick ? [1, 2] : [1, 2, 3, 4];
const flags = {};
const flag = (kind, msg) => { (flags[kind] ??= []).push(msg); };

for (const [cc, born] of CELLS) for (const seed of SEEDS) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed * 131 + born), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: born });
  let wasRecession = state.economy.phase === 'recession';
  for (let i = 0; i < 70 && state.character.alive; i++) {
    engine.autoResolve(); state.prompts = []; state.stats.health = Math.max(state.stats.health, 70);
    engine.ageUp();
    const y = state.character.birthYear + state.character.age;
    const where = `${cc} ${born} #${seed} ${y}`;
    if (state.character.countryId !== cc) break;
    const entries = state.log.at(-1)?.entries ?? [];
    // A recession begins with a model crisis behind it (or a pandemic, which the model doesn't make).
    const rec = state.economy.phase === 'recession';
    if (rec && !wasRecession && !crisisHere(state) && !state.world?.pandemic?.active && state.economy.cause?.id !== 'pandemic') flag('recessions', `${where}: a recession with no crisis behind it (${state.economy.cause?.id ?? 'no cause'})`);
    wasRecession = rec;
    // Your employer's owner matches the law book.
    const job = state.career?.job;
    if (job?.employer && job.sector === 'private') {
      let p; try { p = getProfession(job.professionId); } catch { p = null; }
      const sec = p && sectorOf(p);
      const share = sec ? stateShare(state, sec) : 0;
      if (sec && share >= 1 && job.employer.ownership !== 'state' && job.yearsAtEmployer >= 1) flag('ownership', `${where}: ${job.employer.name} is private in a nationalised sector (${sec})`);
      if (sec && share <= 0 && job.employer.ownership === 'state' && job.yearsAtEmployer >= 1) flag('ownership', `${where}: ${job.employer.name} is the state's in a private sector (${sec})`);
      // A job in an industry the country hasn't got.
      const ind = industryOfProfession(job.professionId, state);
      if (ind && INDUSTRIES[ind].resource && endowment(cc, INDUSTRIES[ind].resource) <= 0) flag('jobs', `${where}: a ${p?.name} job with no ${INDUSTRIES[ind].resource} in the ground`);
      if (ind && INDUSTRIES[ind].kind === 'extract' && !industryHere(state, ind) && job.yearsAtEmployer === 0) flag('jobs', `${where}: hired as ${p?.name} where there is no ${INDUSTRIES[ind].name.toLowerCase()}`);
    }
    // Bank runs come in banking crises only.
    if (entries.some((e) => /queues outside the banks|A Run on the Bank/.test(e.text ?? '')) && crisisHere(state)?.cause !== 'financial') flag('bank runs', `${where}: a bank run with no banking crisis`);
    // The papers don't call a closing town a boom town.
    const t = townTrade(state);
    const stories = (state.news?.stories ?? []).filter((s) => s.year === y || s.age === state.character.age);
    if (t && t.jobs < -0.3 && stories.some((s) => /hiring boom/.test(s.headline ?? ''))) flag('towns', `${where}: a hiring boom headline while ${t.name.toLowerCase()} closes`);
  }
  // Every law the government announced is in the book.
  const book = cc === 'US' ? state.laws?.federal : state.laws?.nations?.[cc];
  for (const r of (state.laws?.enacted ?? []).filter((x) => x.sponsor === 'the government')) if (book && book[r.lawId] === undefined) flag('laws', `${cc} ${born} #${seed}: ${r.lawId} announced but not in the book`);
}

// What still runs on history's dates.
const DATED_ECON = ['workmensCompensation', 'fortyEightHourWeek', 'holidaysWithPay', 'dockDecasualisation', 'nationalInsurance', 'statePension', 'incomeTax'];
const dated = DATED_ECON.filter((id) => STATUTES[id] && !REACTIVE.has(id));
let total = 0;
for (const [kind, list] of Object.entries(flags)) {
  console.log(`\n## ${kind} (${list.length})`);
  for (const m of list.slice(0, 12)) console.log(`  ${m}`);
  total += list.length;
}
if (dated.length) console.log(`\nStill on history's dates (labour and welfare law): ${dated.join(', ')}`);
console.log(`\n${total} flags.`);
if (process.argv.includes('--strict') && total) process.exit(1);
