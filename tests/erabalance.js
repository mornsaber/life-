/**
 * Era balance: plays sensible lives (school, a job that's open to you, working hard, asking
 * for promotion, saving, a home, a family) in each country and start year, and reports what
 * they come to in today's money: how long they live, whether they work, what they earn at 40,
 * what they're worth at 65 (median and the luckiest tenth), how many reach the top of a
 * career, own a home or hold a degree. Then checks each against the reference band for its
 * era (history's figures, loosely: a nineteenth-century wage bought far less than today's).
 *
 *   node tests/erabalance.js [livesPerCell=24] [cells=US:1850,GB:1900,…]
 *
 * Exit code is non-zero when a metric lands outside its band.
 */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import os from 'node:os';
import { countryWageFactor } from '../src/modules/economy/EraEconomy.js';
import { fileURLToPath } from 'node:url';

const PER = Number(process.argv[2] ?? 32);
const CELLS = (process.argv[3] ?? 'US:1850,US:1900,US:1950,US:2000,GB:1850,GB:1900,GB:1950,GB:2000,FR:1880,FR:1960,IN:1900,IN:1990,JP:1880,JP:1970,BR:1920,BR:1990,NG:1960,NG:2000').split(',').map((c) => { const [cc, y] = c.split(':'); return { cc, year: Number(y) }; });

/**
 * Reference bands by era (start year), for lives that reach 20. Real pay and wealth in today's
 * dollars rise with how rich the world was: GDP per head in the US was about a tenth of today's in
 * 1850, a fifth in 1900, a third in 1950 (Maddison). The game need not match history exactly,
 * but an early life should be poorer, shorter and less schooled, and still able to get somewhere.
 */
const eraOf = (y) => (y < 1880 ? 'c19' : y < 1930 ? 'early' : y < 1980 ? 'mid' : 'now');
/** Each metric judged by the era it's measured in: pay at 40 by the year you're 40, and so on. */
export function bands(year, cc = 'US', factor = 1) {
  const at = (offset) => BANDS[eraOf(year + offset)];
  const b = BANDS[eraOf(year)];
  // Real pay and wealth follow how rich the country is (economy/EraEconomy.countryWageFactor).
  const k = (r) => r.map((x) => x * factor);
  return { lifespan20: b.lifespan20, degree: b.degree, peakGrade: b.peakGrade, employed40: at(40).employed40, pay40: k(at(40).pay40), home45: at(45).home45, nw65: k(at(65).nw65), top10nw65: k(at(65).top10nw65) };
}
/**
 * Known gaps, reported but not failed: the game models them differently from history.
 *   Degrees where universities were few: the era's places follow the rich world's.
 */
const KNOWN = {
  degree: { NG: 'Nigeria had a few thousand university places in the 1960s, well under 1% of young people' },
};
const BANDS = {
    // Degrees: a few percent at most before 1930, so a cell of a dozen lives often shows none.
    c19: { lifespan20: [50, 70], employed40: [0.75, 1], pay40: [3000, 25000], nw65: [0, 400000], top10nw65: [20000, 3000000], degree: [0, 0.12], home45: [0.1, 0.7], peakGrade: [3, 8] },
    // A median of about twenty adults moves a few years between runs: the bands allow for it. Born in
    // the 1920s, an adult of twenty lives into the 2000s and its medicine, so the top runs to 80.
    early: { lifespan20: [48, 80], employed40: [0.75, 1], pay40: [6000, 35000], nw65: [2000, 400000], top10nw65: [40000, 12000000], degree: [0, 0.2], home45: [0.2, 0.75], peakGrade: [3, 8] },
    // Born after 1950, you reach the game's future medicine (2040 on): longer than history's.
    mid: { lifespan20: [62, 88], employed40: [0.8, 1], pay40: [15000, 70000], nw65: [20000, 1000000], top10nw65: [150000, 12000000], degree: [0.05, 0.6], home45: [0.15, 0.85], peakGrade: [3, 9] },
    // The persona saves hard (half of them invest every spare dollar), so wealth sits above the median household's.
    now: { lifespan20: [68, 90], employed40: [0.8, 1], pay40: [20000, 95000], nw65: [40000, 1300000], top10nw65: [300000, 12000000], degree: [0.15, 0.7], home45: [0.25, 0.85], peakGrade: [3, 9] },
};

async function playCell({ cc, year, per, seed }) {
  const { Engine } = await import('../src/core/Engine.js');
  const { Store, netWorth } = await import('../src/core/State.js');
  const { Random } = await import('../src/core/Random.js');
  const { MODULES } = await import('../src/modules/registry.js');
  const { professionsFor, PROFESSIONS } = await import('../src/modules/career/JobTrees.js');
  const { applicationEligibility } = await import('../src/modules/career/CareerEngine.js');
  const { QUESTIONS } = await import('../src/modules/career/InterviewSystem.js');
  const { countryPriceLevel } = await import('../src/modules/world/Countries.js');
  const { routineChoice } = await import('../src/core/Routine.js');
  const { CONDITIONS } = await import('../src/modules/health/index.js');
  const { isResidential } = await import('../src/modules/realestate/PropertyMarket.js');
  const { selfBuildHere, selfBuilds, plotPrice } = await import('../src/modules/realestate/SelfBuilt.js');
  const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
  const out = [];
  for (let i = 0; i < per; i++) {
    const rng = new Random(seed * 1009 + i * 17 + year);
    const choose = new Random(seed * 31 + i * 7 + year);
    const engine = new Engine({ store: new Store(memory()), rng, modules: MODULES });
    const s = engine.newLife({ countryId: cc, startYear: year });
    const persona = { study: choose.chance(0.5), saver: choose.chance(0.5), marry: choose.chance(0.85), owner: choose.chance(0.8), retireAt: choose.int(60, 70) };
    const r = { died: null, employed40: false, pay40: null, nw65: null, degree: false, home45: false, peakGrade: 0, errors: 0 };
    const solve = () => {
      for (let g = 0; g < 60 && s.prompts.length && s.character.alive; g++) {
        const p = s.prompts[0];
        const options = p.options.filter((o) => !o.disabled);
        let id = routineChoice(p);
        if (p.type === 'career.interview') {
          const q = QUESTIONS.find((x) => x.id === p.data.questions[p.data.q ?? 0]);
          id = q ? [...q.options].sort((a, b) => b.score - a.score)[0].id : null;
        } else if (p.type === 'housing.financing') id = (options.find((o) => !['cash', 'cancel', 'fraud'].includes(o.id)) ?? options.find((o) => o.id === 'cash') ?? options[0])?.id;
        else if (p.type === 'people.meetCute') id = persona.marry ? 'ask' : null;
        if (!id || !options.some((o) => o.id === id)) {
          const safe = options.filter((o) => o.tone !== 'danger');
          id = choose.pick(safe.length ? safe : options.length ? options : p.options).id;
        }
        const before = s.prompts.length;
        try { engine.resolvePrompt(p.id, id); } catch { r.errors += 1; s.prompts.shift(); }
        if (s.prompts[0] === p && s.prompts.length === before) s.prompts.shift();
      }
    };
    const act = (a, arg) => { try { engine.dispatch(a, arg); } catch { r.errors += 1; } solve(); };
    /** A job that's open to you: the best-paid of a few you could apply for. */
    const seek = () => {
      const open = professionsFor(s).filter((p) => { try { return applicationEligibility(s, p.id).ok; } catch { return false; } });
      if (!open.length) return;
      const picks = choose.shuffle(open).slice(0, 4).sort((a, b) => (PROFESSIONS[b.id]?.levels?.[0]?.salary ?? 0) - (PROFESSIONS[a.id]?.levels?.[0]?.salary ?? 0));
      for (const p of picks) { act('career.apply', p.id); if (s.career.job) break; }
    };
    while (s.character.alive && s.character.age < 100) {
      const age = s.character.age;
      solve();
      if (age === 18 && persona.study && s.stats.smarts >= 55 && !s.education.enrolled) {
        act('education.enroll', 'bachelor:state:business:full');
        if (!s.education.enrolled) act('education.enroll', 'bachelor:online:business:full');
      }
      const studying = s.education.enrolled?.pace === 'full';
      if (age >= 15 && !s.retirement.retired && !studying && !s.military.service) {
        if (!s.career.job) seek();
        if (s.career.job) {
          if (choose.chance(0.6)) act('career.workHarder');
          if (choose.chance(0.5)) act('career.requestPromotion');
        }
      }
      const housed = s.housing.rental || s.housing.properties.some((p) => p.use === 'primary');
      if (age >= 21 && s.career.job && !housed && !s.housing.withParents) act('housing.rent', 'roommates');
      // Where homes are self-built, would-be owners buy a plot and build a stage a year (or put up a room on unclaimed land).
      if (persona.owner && age >= 22 && age <= 55 && selfBuildHere(s)) {
        const going = selfBuilds(s)[0];
        if (going) act('selfBuild.stage', going.id);
        else if (!s.housing.properties.some((p) => p.use === 'primary')) act(s.finances.cash >= plotPrice(s) ? 'selfBuild.buyPlot' : age >= 26 && choose.chance(0.3) ? 'selfBuild.shack' : 'selfBuild.buyPlot');
      }
      if (persona.owner && age >= 24 && age <= 55 && s.career.job && !s.housing.properties.some((p) => p.use === 'primary') && s.housing.listings?.length && choose.chance(0.5)) {
        const l = [...s.housing.listings].filter((x) => isResidential(x.type)).sort((a, b) => a.price - b.price)[0];
        if (l) act('housing.buy', l.id);
      }
      if (persona.marry && age >= 20 && age <= 45) {
        const partner = s.people.list.find((x) => x.alive && ['partner', 'fiance', 'spouse'].includes(x.relation));
        if (!partner && choose.chance(0.5)) act('people.date');
        else if (partner?.relation === 'partner' && choose.chance(0.4)) act('people.propose', partner.id);
        else if (partner?.relation === 'fiance') act('people.wed', 'courthouse');
        if (partner?.relation === 'spouse' && age <= 40 && s.people.list.filter((x) => x.relation === 'child').length < 2 && choose.chance(0.4)) act('people.tryForBaby');
      }
      // Health habits: a checkup every other year, and treatment for what's found.
      if (age >= 30 && age % 2 === 0) act('health.checkup');
      for (const c of s.health.conditions) if (c.diagnosed && !c.remission && !c.treated) act(CONDITIONS[c.id]?.kind === 'addiction' ? 'health.rehab' : 'health.treat', c.id);
      // Would-be owners save a deposit in cash first, and invest once they own (or give up at 45).
      const ownsHome = s.housing.properties.some((p) => p.use === 'primary');
      if (persona.saver && age >= 25 && (ownsHome || !persona.owner || age >= 45) && s.investing?.auto && !s.investing.auto.enabled) act('investing.toggleAuto');
      if (!s.retirement.retired && age >= persona.retireAt) act('retirement.retire');
      if (age >= 62) act('retirement.claimSocialSecurity');
      try { engine.ageUp(); } catch { r.errors += 1; break; }
      if (process.env.ERA_DEBUG) { const k0 = countryPriceLevel(s) || 1; for (const x of s.finances.lastLedger?.expenses ?? []) { const key = `−${String(x.reason).replace(/[—:(].*$/, '').replace(/\d+/g, '#').trim().slice(0, 34)}`; (r.out ??= {})[key] = (r.out[key] ?? 0) + x.amount / k0; } for (const x of s.finances.lastLedger?.income ?? []) { const key = String(x.source).replace(/[—:(].*$/, '').replace(/\d+/g, '#').trim().slice(0, 40); (r.src ??= {})[key] = (r.src[key] ?? 0) + x.amount / k0; } }
      const a = s.character.age;
      const k = countryPriceLevel(s) || 1;
      if (s.career.job) r.peakGrade = Math.max(r.peakGrade, s.career.job.grade ?? 0);
      if (a === 40) { r.employed40 = Boolean(s.career.job || s.military.service || s.business?.current); r.pay40 = s.career.job ? s.career.job.salary / k : null; }
      if (a === 45) r.home45 = s.housing.properties.some((p) => p.use === 'primary');
      if (a === 45 && process.env.ERA_DEBUG) r.h45 = { owner: persona.owner, cash: Math.round(s.finances.cash / k), props: s.housing.properties.map((p) => `${p.type}/${p.use}/${p.selfBuild?.stage ?? '-'}${p.regionId === s.character.regionId ? '' : '@away'}`).join(' '), rent: s.housing.rental?.tier ?? (s.housing.withParents ? 'parents' : '-'), job: Boolean(s.career.job) };
      if (a === 65) r.nw65 = netWorth(s) / k;
      if (a === 65 && process.env.ERA_DEBUG) r.dbg = ({ spent: Object.entries(r.out ?? {}).sort((x, y) => y[1] - x[1]).slice(0, 10).map(([k2, v]) => `${k2}=${Math.round(v / 1000)}k`).join(' | '), top: Object.entries(r.src ?? {}).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k2, v]) => `${k2}=${Math.round(v / 1000)}k`).join(' | '), cell: `${cc}:${year}`, nw: Math.round(netWorth(s) / k), cash: Math.round(s.finances.cash / k), homes: Math.round(s.housing.properties.reduce((t, p) => t + p.value - (p.mortgage?.balance ?? 0), 0) / k), invest: Math.round(Object.values(s.investing?.holdings ?? {}).reduce((t, h) => t + (h.value ?? 0), 0) / k), dc: Math.round(Object.values(s.retirement?.dc ?? {}).reduce((t, v) => t + (typeof v === 'number' ? v : v?.balance ?? 0), 0) / k), pay: Math.round((s.career.job?.salary ?? 0) / k), inherited: Math.round((s.finances.ledger?.income ?? []).filter((x) => /inherit|estate|bequest|will/i.test(x.reason)).reduce((t, x) => t + x.amount, 0) / k) });
    }
    r.died = s.character.age;
    r.degree = s.education.degrees.some((d) => ['bachelor', 'master', 'doctorate', 'md', 'jd', 'phd'].includes(d.type));
    out.push(r);
  }
  return out;
}

const med = (xs) => { const v = xs.filter((x) => x != null).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
const p90 = (xs) => { const v = xs.filter((x) => x != null).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length * 0.9)] : null; };
const share = (xs) => (xs.length ? xs.filter(Boolean).length / xs.length : null);

export function summarize(lives) {
  const adults = lives.filter((l) => l.died >= 20);
  const at40 = lives.filter((l) => l.died > 40);
  const at45 = lives.filter((l) => l.died > 45);
  const at65 = lives.filter((l) => l.died > 65);
  return {
    n: lives.length,
    n65: at65.length,
    lifespan20: med(adults.map((l) => l.died)),
    employed40: share(at40.map((l) => l.employed40)),
    pay40: med(at40.map((l) => l.pay40)),
    nw65: med(at65.map((l) => l.nw65)),
    top10nw65: p90(at65.map((l) => l.nw65)),
    degree: share(adults.map((l) => l.degree)),
    home45: share(at45.map((l) => l.home45)),
    peakGrade: med(adults.map((l) => l.peakGrade)),
    errors: lives.reduce((t, l) => t + l.errors, 0),
  };
}

if (!isMainThread) {
  playCell(workerData).then((r) => parentPort.postMessage(r));
} else {
  const file = fileURLToPath(import.meta.url);
  const threads = Math.max(1, Math.min(CELLS.length, os.cpus().length));
  // Each cell's seed follows the cell itself, so a run of a few cells repeats the full run's lives.
  const queue = CELLS.map((c) => ({ ...c, per: PER, seed: [...c.cc].reduce((t, ch) => t * 31 + ch.charCodeAt(0), 7) % 997 + c.year }));
  const results = [];
  const run = () => new Promise((done) => {
    const next = () => {
      const job = queue.shift();
      if (!job) return done();
      const w = new Worker(file, { workerData: job });
      w.on('message', (lives) => { results.push({ ...job, s: summarize(lives), lives }); w.terminate(); next(); });
      w.on('error', (e) => { results.push({ ...job, error: e.message }); next(); });
    };
    next();
  });
  await Promise.all(Array.from({ length: threads }, run));
  if (process.env.ERA_DEBUG) for (const r of results) { console.log(r.cc, r.year, 'lives', r.s?.n, 'at 65', r.s?.n65); for (const l of (r.lives ?? []).filter((x) => x.h45)) console.log('  45:', JSON.stringify(l.h45));
      for (const l of (r.lives ?? []).filter((x) => x.dbg).sort((a, b) => a.dbg.nw - b.dbg.nw)) console.log(' ', JSON.stringify(l.dbg)); }
  results.sort((a, b) => CELLS.findIndex((c) => c.cc === a.cc && c.year === a.year) - CELLS.findIndex((c) => c.cc === b.cc && c.year === b.year));
  const fmt = { lifespan20: (x) => x?.toFixed(0), employed40: (x) => (x == null ? '–' : `${Math.round(x * 100)}%`), pay40: (x) => (x == null ? '–' : `$${Math.round(x / 1000)}k`), nw65: (x) => (x == null ? '–' : `$${Math.round(x / 1000)}k`), top10nw65: (x) => (x == null ? '–' : `$${Math.round(x / 1000)}k`), degree: (x) => (x == null ? '–' : `${Math.round(x * 100)}%`), home45: (x) => (x == null ? '–' : `${Math.round(x * 100)}%`), peakGrade: (x) => x ?? '–' };
  const keys = Object.keys(fmt);
  console.log(['cell', ...keys, 'errors'].join('\t'));
  const off = [];
  const notes = [];
  for (const r of results) {
    if (r.error) { console.log(`${r.cc}:${r.year}\tERROR ${r.error}`); off.push(`${r.cc}:${r.year} crashed`); continue; }
    const b = bands(r.year, r.cc, countryWageFactor({ character: { countryId: r.cc } }));
    console.log([`${r.cc}:${r.year}`, ...keys.map((k) => { const v = r.s[k]; const bad = v != null && b[k] && (v < b[k][0] || v > b[k][1]); const known = bad && KNOWN[k]?.[r.cc]; if (known) notes.push(`${r.cc}:${r.year} ${k} ${fmt[k](v)}: ${known}`); else if (bad) off.push(`${r.cc}:${r.year} ${k} ${fmt[k](v)} outside [${b[k].map((x) => fmt[k](x)).join(', ')}]`); return `${fmt[k](v)}${bad ? '✘' : ''}`; }), r.s.errors].join('\t'));
  }
  if (notes.length) console.log(`\n⚠ Known gaps (not failures):\n  ${[...new Set(notes)].join('\n  ')}`);
  if (off.length) { console.log(`\n✘ ${off.length} outside their band:\n  ${off.join('\n  ')}`); process.exit(1); }
  console.log('\n✔ every era within its bands');
}
