/**
 * Business balance benchmark: owners who start each type of business with
 * modest savings and run it sensibly (inject savings while they can afford
 * it, draw on a credit line once, otherwise close), checked against
 * real-world bands:
 *   • ≈half of small businesses survive five years (BLS Business Employment Dynamics)
 *   • most venture-backed startups fail within five years; a few exit big
 *
 *   node tests/business.js [ownersPerType=40] [startups=250]
 */
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { BUSINESS_TYPES } from '../src/modules/business/BusinessTypes.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
};
const PER_TYPE = Number(process.argv[2] ?? 40);
const STARTUPS = Number(process.argv[3] ?? 250);

function owner(seed, typeId, cash) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const s = engine.newLife({});
  const t = BUSINESS_TYPES[typeId];
  s.character.age = t.startup ? 27 : 32;
  s.stats.smarts = 55 + (seed % 40);
  s.stats.health = 90;
  s.finances.cash = cash;
  s.housing.credit.score = 700;
  for (const c of t.credentials) s.credentials.held[c] = { earnedAge: 25, renewedAge: 30, status: 'active' };
  if (t.minExperience) s.career.history.push({ professionId: t.professions[0], title: 'Cook', levelId: 'line', employerName: 'Diner', sector: 'private', peakGrade: 3, startAge: 25, endAge: 31, reason: 'Left' });
  engine.dispatch('business.start', `${typeId}:cash:${t.startup ? 'ccorp' : 'llc'}`);
  return { engine, s, t };
}

function runYears(engine, s, t, years, { injectCap, startup }) {
  let injected = 0;
  let loc = 0;
  let alive5 = false;
  for (let y = 0; y < years && s.character.alive; y++) {
    if (startup && s.business.current) engine.dispatch('business.raise');
    engine.ageUp();
    for (let g = 0; g < 20 && s.prompts.length; g++) {
      const p = s.prompts[0];
      const ok = p.options.filter((o) => !o.disabled);
      let id;
      if (p.type === 'business.cashCrunch') {
        const inject = s.finances.cash - p.data.need >= (startup ? 10000 : 20000) && injected + p.data.need <= injectCap;
        id = ((inject && ok.find((o) => o.id === 'inject')) || ok.find((o) => o.id === 'bridge') || (!loc && ok.find((o) => o.id === 'loc')) || ok.find((o) => o.id === 'close')).id;
        if (id === 'inject') injected += p.data.need;
        if (id === 'loc') loc += 1;
      } else if (p.type === 'business.offer') id = p.data.price * (s.business.current?.ownerPct ?? 1) > 2000000 ? 'accept' : 'decline';
      else if (p.type === 'business.ipo') id = 'ipo';
      else if (p.type === 'business.temptation') id = 'honest';
      else id = ok[Math.floor(engine.rng.next() * ok.length)].id;
      engine.resolvePrompt(p.id, id);
    }
    if (y === 4) alive5 = Boolean(s.business.current);
  }
  return alive5;
}

const rows = {};
let smallAlive = 0;
let smallN = 0;
for (const typeId of Object.keys(BUSINESS_TYPES).filter((id) => !BUSINESS_TYPES[id].startup)) {
  let alive = 0;
  for (let i = 0; i < PER_TYPE; i++) {
    const { engine, s, t } = owner(1000 + i, typeId, BUSINESS_TYPES[typeId].cost + 40000);
    if (runYears(engine, s, t, 5, { injectCap: t.cost * 0.5 })) alive += 1;
  }
  rows[typeId] = (alive / PER_TYPE).toFixed(2);
  smallAlive += alive;
  smallN += PER_TYPE;
}

let startupAlive = 0;
let bigExits = 0;
for (let i = 0; i < STARTUPS; i++) {
  const { engine, s, t } = owner(5000 + i, 'techStartup', 60000);
  if (runYears(engine, s, t, 10, { injectCap: 40000, startup: true })) startupAlive += 1;
  const last = s.business.history.at(-1);
  if (last && /Sold|IPO/.test(last.outcome) && last.proceeds >= 10000000) bigExits += 1;
}

const checks = [
  ['small-business 5-yr survival', smallAlive / smallN, [0.4, 0.8], '≈50% of small businesses survive five years'],
  ['restaurant 5-yr survival', Number(rows.restaurant), [0.25, 0.7], 'restaurants fail more often than most'],
  ['startup 5-yr survival', startupAlive / STARTUPS, [0.15, 0.5], 'most startups fail within five years'],
  ['startup big exits ($10M+ to founder)', bigExits / STARTUPS, [0.005, 0.08], 'a few exit big'],
];
console.log('5-year survival by type:', rows);
let bad = 0;
for (const [name, v, [lo, hi], ref] of checks) {
  const ok = v >= lo && v <= hi;
  if (!ok) bad += 1;
  console.log(`  ${ok ? '✔' : '✘'} ${name.padEnd(38)} ${(v * 100).toFixed(1)}%  band ${lo * 100}%–${hi * 100}%  ${ref}`);
}
console.log(bad ? `\n${bad} business metric(s) outside their band` : '\n✔ Business outcomes within real-world bands');
process.exit(bad ? 1 : 0);
