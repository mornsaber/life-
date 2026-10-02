/**
 * Balance harness: plays thousands of complete lives with *plausible*
 * personas (unlike simulate.js's chaos agent) and compares outcomes with
 * real-world reference bands (U.S. figures, today's dollars).
 *
 *   node tests/balance.js [lives=2000] [seed=1]        (uses all CPU cores)
 *
 * Exit code is non-zero when a metric lands outside its band, so the pass
 * can be re-run after any tuning change.
 */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

/* ------------------------------------------------------------------ */
/* Reference bands                                                     */
/* ------------------------------------------------------------------ */

/** [low, high] acceptable; `ref` is the real-world anchor shown in the report. */
export const TARGETS = {
  lifespan: { band: [72, 82], ref: '≈77 (US life expectancy at birth)', fmt: (x) => x.toFixed(1) },
  salaryAt40: { band: [45000, 85000], ref: '≈$60k median full-time earnings, 35–44', fmt: money },
  employedAt40: { band: [0.9, 0.98], ref: '≈96.8% of 35–44-year-old labor-force participants employed (BLS 2024)', fmt: pct },
  degreeShare: { band: [0.3, 0.5], ref: '≈38% of adults hold a bachelor\'s or higher', fmt: pct },
  ownedBy45: { band: [0.5, 0.75], ref: '≈62% homeownership, householders 35–44', fmt: pct },
  firstHomeAge: { band: [28, 38], ref: '≈35 median first-time buyer age (NAR 2023–24: 35–38)', fmt: (x) => x.toFixed(1) },
  foreclosed: { band: [0.01, 0.1], ref: 'a few percent of owners ever foreclose', fmt: pct },
  homelessEver: { band: [0.01, 0.08], ref: '≈4–6% of adults experience homelessness', fmt: pct },
  felony: { band: [0.03, 0.12], ref: '≈8% of adults have a felony conviction', fmt: pct },
  prison: { band: [0.01, 0.06], ref: '≈3% of adults ever imprisoned', fmt: pct },
  bankruptcy: { band: [0.05, 0.18], ref: '≈10–15% of adults ever file', fmt: pct },
  recessionEvery: { band: [8, 12], ref: 'design target 8–12 yrs (US postwar ≈6–10)', fmt: (x) => `${x.toFixed(1)} yrs` },
  unemployment: { band: [0.035, 0.07], ref: '≈4–6% long-run average', fmt: pct },
  retireAge: { band: [60, 68], ref: '≈62–65 median retirement age', fmt: (x) => x.toFixed(1) },
  dbPension: { band: [0.15, 0.4], ref: '≈25–30% of retirees receive a DB pension', fmt: pct },
  millionaire: { band: [0.08, 0.3], ref: '≈15–20% of households near retirement (peak through 70) worth $1M+', fmt: pct },
  medianNetWorth65: { band: [150000, 650000], ref: '≈$400k median net worth, ages 65–74', fmt: money },
  supervisor: { band: [0.35, 0.6], ref: '≈36% of workers supervise others at any one time; more have at some point', fmt: pct },
  veterans: { band: [0.04, 0.12], ref: '≈6–7% of adults are veterans', fmt: pct },
  ptsdVets: { band: [0.1, 0.35], ref: '≈15–30% of combat veterans', fmt: pct },
  everMarried: { band: [0.6, 0.92], ref: '≈80% of adults have married by 45 (Census ACS)', fmt: pct },
  divorced: { band: [0.25, 0.55], ref: '≈35–45% of first marriages end in divorce', fmt: pct },
  parents: { band: [0.55, 0.9], ref: '≈85% of women 40–44 have had a child (lower for men)', fmt: pct },
  repeatRate: { band: [0, 0.2], ref: 'design target: under 20% repeated story events', fmt: pct },
};

/** Approximate U.S. median pay around age 40 for each persona career (BLS OES/CPS, 2023–24). */
export const PAY_AT_40 = { tech: 120000, accounting: 85000, nursing: 90000, education: 66000, corporate: 85000, engineering: 105000, police: 75000, fire: 68000, trades: 66000, plumbing: 64000, trucking: 58000, retail: 38000, hospitality: 42000, culinary: 38000, medical: 230000, law: 150000 };

function money(x) {
  return `$${Math.round(x).toLocaleString()}`;
}
function pct(x) {
  return `${(x * 100).toFixed(1)}%`;
}

/* ------------------------------------------------------------------ */
/* Worker: play lives                                                  */
/* ------------------------------------------------------------------ */

export async function playLives({ from, to, seed }) {
  const { Engine } = await import('../src/core/Engine.js');
  const { Store, netWorth } = await import('../src/core/State.js');
  const { Random } = await import('../src/core/Random.js');
  const { MODULES } = await import('../src/modules/registry.js');
  const { QUESTIONS } = await import('../src/modules/career/InterviewSystem.js');
  const { hasCredential } = await import('../src/modules/credentials/LicensingEngine.js');
  const { examStatus } = await import('../src/modules/publicservice/PublicServiceEngine.js');
  const { routineChoice } = await import('../src/core/Routine.js');
  const { CONDITIONS } = await import('../src/modules/health/index.js');
  const { RENT_TIERS } = await import('../src/modules/realestate/index.js');

  const memory = () => {
    const m = new Map();
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
  };

  /** Career plans: schooling, credentials and exam per career; personas pick by smarts. */
  const PLANS = {
    tech: { share: 4, minSmarts: 70, edu: [['bachelor', 'state', 'computerScience']], creds: ['learnerPermit', 'driverLicense'] },
    nursing: { share: 3, minSmarts: 60, edu: [['associate', 'community', 'nursing']], creds: ['learnerPermit', 'driverLicense', 'rn'] },
    education: { share: 4, minSmarts: 60, edu: [['bachelor', 'state', 'education']], creds: ['learnerPermit', 'driverLicense', 'teachingCert'] },
    corporate: { share: 6, minSmarts: 65, edu: [['bachelor', 'state', 'business']], creds: ['learnerPermit', 'driverLicense'] },
    accounting: { share: 2, minSmarts: 70, edu: [['bachelor', 'state', 'accounting']], creds: ['learnerPermit', 'driverLicense', 'cpa'] },
    engineering: { share: 2, minSmarts: 78, edu: [['bachelor', 'state', 'engineering']], creds: ['learnerPermit', 'driverLicense', 'fe', 'pe'] },
    police: { share: 2, minSmarts: 45, edu: [], creds: ['learnerPermit', 'driverLicense'], exam: 'publicSafety' },
    fire: { share: 1, minSmarts: 45, edu: [], creds: ['learnerPermit', 'driverLicense', 'emt'], exam: 'publicSafety' },
    trades: { share: 3, minSmarts: 40, edu: [['electricalTech', 'technical', '']], creds: ['learnerPermit', 'driverLicense', 'journeymanElectrician', 'oshaSafety'] },
    plumbing: { share: 2, minSmarts: 40, edu: [['plumbingTech', 'technical', '']], creds: ['learnerPermit', 'driverLicense', 'journeymanPlumber'] },
    trucking: { share: 4, minSmarts: 30, edu: [], creds: ['learnerPermit', 'driverLicense', 'cdlA'] },
    retail: { share: 9, minSmarts: 0, edu: [], creds: ['learnerPermit', 'driverLicense'] },
    hospitality: { share: 4, minSmarts: 0, edu: [], creds: ['learnerPermit', 'driverLicense'] },
    culinary: { share: 5, minSmarts: 0, edu: [], creds: ['learnerPermit', 'driverLicense'] },
    medical: { share: 1, minSmarts: 88, edu: [['bachelor', 'state', 'biology'], ['md', 'state', '']], creds: ['learnerPermit', 'driverLicense', 'medicalLicense', 'boardCertified'] },
    law: { share: 1, minSmarts: 82, edu: [['bachelor', 'state', 'politicalScience'], ['jd', 'state', '']], creds: ['learnerPermit', 'driverLicense', 'barLicense'] },
  };

  const results = [];
  for (let i = from; i < to; i++) {
    const rng = new Random(seed * 100003 + i);
    const choose = new Random(seed * 7919 + i * 31);
    const engine = new Engine({ store: new Store(memory()), rng, modules: MODULES });
    const s = engine.newLife();
    const persona = {
      plan: null,
      saver: choose.chance(0.5),
      risky: choose.chance(0.1),
      military: choose.chance(0.08),
      owner: choose.chance(0.85),
      retireAt: choose.int(60, 68),
      // Family plans: most people marry; ≈85% want children (0–3, mostly 2).
      marry: choose.chance(0.85),
      kids: choose.weighted([{ n: 0, w: 15 }, { n: 1, w: 20 }, { n: 2, w: 40 }, { n: 3, w: 25 }], (x) => x.w).n,
    };
    let eduIdx = 0;
    let stats = { salaryAt40: null, employedAt40: false, firstHomeAge: null, supervised: false, combat: false, everHomeless: false, retiredAge: null, nw65: null, peakNw: 0, storyEvents: 0, storyRepeats: 0 };
    const seen = new Set();

    const solve = () => {
      for (let g = 0; g < 60 && s.prompts.length && s.character.alive; g++) {
        const p = s.prompts[0];
        const options = p.options.filter((o) => !o.disabled);
        let id = routineChoice(p);
        if (p.type === 'career.interview') {
          const q = QUESTIONS.find((x) => x.id === p.data.questions[p.data.step]);
          id = [...q.options].sort((a, b) => b.score - a.score)[0].id;
        } else if (p.type === 'career.negotiate') id = (options.find((o) => o.id === 'step' || o.id === 'modest') ?? options[0]).id;
        else if (p.type === 'housing.financing') id = (options.find((o) => !['cash', 'cancel', 'fraud'].includes(o.id)) ?? options.find((o) => o.id === 'cash') ?? options.find((o) => o.id === 'cancel') ?? options[0]).id;
        else if (p.type === 'health.bankruptcy') id = 'file';
        else if (p.type === 'people.date') id = persona.marry && choose.chance(0.7) ? options.find((o) => o.id === '0')?.id : options.find((o) => !/^\d$/.test(o.id))?.id;
        else if (p.type === 'people.meetCute') id = persona.marry && !s.people.list.some((x) => x.alive && ['partner', 'fiance', 'spouse'].includes(x.relation)) ? 'ask' : options.find((o) => o.id !== 'ask')?.id;
        else if (p.type === 'retirement.rollover') id = choose.chance(p.data.amount < 20000 ? 0.55 : 0.12) ? 'cashout' : 'rollover';
        else if (p.type === 'career.promotionReview') id = options.find((o) => o.id === 'results')?.id ?? options[0].id;
        else if (p.type === 'housing.distress') id = options.find((o) => o.id === (choose.chance(0.5) ? 'modify' : 'sell'))?.id ?? options[0].id;
        else if (p.type === 'career.chooseTrack') id = (choose.chance(0.35) ? options.find((o) => /mgmt|manage/i.test(o.id + o.label)) : options.find((o) => !/mgmt|manage/i.test(o.id + o.label)))?.id ?? options[0].id;
        else if (p.type === 'health.duty' || p.type === 'health.disabling') id = options.find((o) => o.id === 'treat' || o.id === 'claim')?.id ?? options[0].id;
        else if (p.type === 'military.contractEnd') id = choose.chance(0.3) ? options[0].id : (options.find((o) => /separate/.test(o.id)) ?? options[0]).id;
        if (!id || !options.some((o) => o.id === id)) {
          // Plausible people mostly avoid the dangerous / crooked option.
          const safe = options.filter((o) => o.tone !== 'danger');
          const pool = persona.risky || !safe.length ? options : safe;
          id = choose.pick(pool).id;
        }
        const title = p.title;
        if (['lifeEvents.event', 'career.workEvent', 'stateAgencies.event', 'municipal.event', 'federal.event', 'emergency.dispatch', 'military.dutyEvent', 'military.combat'].includes(p.type)) {
          stats.storyEvents += 1;
          if (seen.has(title)) stats.storyRepeats += 1;
          seen.add(title);
        }
        engine.resolvePrompt(p.id, id);
      }
    };

    while (s.character.alive && s.character.age < 115) {
      const age = s.character.age;
      solve();
      if (!s.character.alive) break;
      if (age === 16) {
        const options = Object.entries(PLANS).filter(([, pl]) => s.stats.smarts >= pl.minSmarts);
        // Weighted by real employment shares among the careers you qualify for.
        persona.plan = choose.weighted(options.map(([id, pl]) => ({ id, weight: pl.share }))).id;
        // Many people in non-degree careers still hold a bachelor's (≈25% of retail/hospitality
        // workers; most RNs complete a BSN; many officers have criminal-justice degrees).
        const p = PLANS[persona.plan];
        persona.edu = [...p.edu];
        const extra = { nursing: [0.45, ['bachelor', 'online', 'nursing']], police: [0.25, ['bachelor', 'state', 'criminalJustice']], fire: [0.2, ['bachelor', 'online', 'fireScience']] }[persona.plan];
        if (extra && choose.chance(extra[0])) persona.edu.push(extra[1]);
        else if (!p.edu.some(([prog]) => prog === 'bachelor') && s.stats.smarts >= 55 && choose.chance(0.1)) persona.edu.unshift(['bachelor', 'state', 'business']);
      }
      const plan = PLANS[persona.plan];
      if (plan && age >= 15) {
        for (const c of plan.creds) if (!hasCredential(s, c) && !s.credentials.training.some((t) => t.id === c)) engine.dispatch('credentials.pursue', c);
        solve();
      }
      if (persona.military && age >= 18 && age <= 21 && !s.military.service && !s.military.history.length) {
        engine.dispatch('military.enlist', `${choose.pick(['army', 'navy', 'airforce', 'marines'])}:enlisted:active`);
        solve();
      }
      if (plan && age >= 18 && !s.education.enrolled && eduIdx < persona.edu.length && !s.military.service) {
        const [p, sc, m] = persona.edu[eduIdx];
        engine.dispatch('education.enroll', `${p}:${sc}:${m}:full`);
        // Rejected? Many people apply to a less selective school instead.
        if (!s.education.enrolled && p === 'bachelor') engine.dispatch('education.enroll', `${p}:online:${m}:full`);
        if (s.education.enrolled) eduIdx += 1;
        else if (choose.chance(0.4)) eduIdx += 1;
        solve();
      }
      if (plan?.exam && age >= 19 && !examStatus(s, plan.exam).passed) {
        engine.dispatch('publicservice.takeExam', plan.exam);
        solve();
      }
      const retired = s.retirement.retired;
      if (age >= 16 && !retired && !s.military.service && !(s.education.enrolled?.pace === 'full' && age < 23)) {
        if (!s.career.job || (s.career.job.professionId !== persona.plan && choose.chance(0.4))) {
          engine.dispatch('career.apply', s.career.job || choose.chance(0.75) ? persona.plan : choose.pick(['retail', 'hospitality', 'culinary']));
          solve();
          if (!s.career.job) {
            engine.dispatch('career.apply', choose.pick(['retail', 'hospitality', 'culinary', 'trucking']));
            solve();
          }
        }
        if (s.career.job) {
          if (choose.chance(0.6)) engine.dispatch('career.workHarder');
          if (choose.chance(0.5)) engine.dispatch('career.requestPromotion');
          solve();
          if (s.career.job?.department) stats.supervised = true;
        }
      }
      // Housing: move out once working, buy when the numbers work.
      const housed = s.housing.rental || s.housing.properties.some((p) => p.use === 'primary');
      if (age >= 21 && s.career.job && !housed && (choose.chance(0.6) || !s.housing.withParents)) {
        engine.dispatch('housing.rent', s.career.job.salary > 55000 ? 'apartment' : 'roommates');
        solve();
      }
      if (persona.owner && age >= 23 && age <= 55 && s.career.job && !s.housing.properties.some((p) => p.use === 'primary') && s.housing.listings.length && choose.chance(0.5)) {
        const listing = [...s.housing.listings].sort((a, b) => a.price - b.price)[0];
        engine.dispatch('housing.buy', listing.id);
        solve();
      }
      // Love and family.
      if (persona.marry && age >= 20 && age <= 50) {
        const partner = s.people.list.find((x) => x.alive && ['partner', 'fiance', 'spouse'].includes(x.relation));
        if (!partner && choose.chance(0.5)) engine.dispatch('people.date');
        else if (partner?.relation === 'partner' && age - partner.since >= 2 && choose.chance(0.5)) engine.dispatch('people.propose', partner.id);
        else if (partner?.relation === 'fiance') engine.dispatch('people.wed', s.finances.cash > 30000 ? 'small' : 'courthouse');
        if (partner && (partner.relation === 'spouse' || age >= 27) && age <= 42 && s.people.list.filter((x) => x.relation === 'child').length < persona.kids) engine.dispatch('people.tryForBaby');
        solve();
      }
      // Health & money habits.
      if (age >= 30 && age % 2 === 0) engine.dispatch('health.checkup');
      for (const c of s.health.conditions) if (c.diagnosed && !c.remission && !c.treated) engine.dispatch(CONDITIONS[c.id].kind === 'addiction' ? 'health.rehab' : 'health.treat', c.id);
      if (persona.saver && age >= 25 && !s.investing.auto.enabled) engine.dispatch('investing.toggleAuto');
      if (persona.risky && age >= 16 && choose.chance(0.15)) engine.dispatch(choose.pick(['legal.shoplift', 'legal.speed', 'legal.driveDrunk', 'legal.barFight', 'legal.drugs', 'legal.taxCheat']));
      if (!retired && age >= persona.retireAt) {
        engine.dispatch('retirement.retire');
        if (s.retirement.retired) stats.retiredAge = age;
      }
      if (age >= 62 && (s.retirement.retired || age >= 67)) engine.dispatch('retirement.claimSocialSecurity');
      solve();
      if (!s.character.alive) break;
      engine.ageUp();
      // Yearly observations.
      if (s.character.age === 40) {
        stats.salaryAt40 = s.career.job?.salary ?? null;
        stats.employedAt40 = Boolean(s.career.job || s.military.service);
      }
      if (s.housing.everOwned && stats.firstHomeAge == null) stats.firstHomeAge = s.character.age;
      if (s.housing.homelessYears) stats.everHomeless = true;
      if (s.military.service?.combatTours) stats.combat = true;
      const nw = netWorth(s);
      if (s.character.age <= 70) stats.peakNw = Math.max(stats.peakNw, nw);
      if (s.character.age === 65) stats.nw65 = nw;
      if (process.env.BALANCE_DEBUG === 'wealth' && s.character.age === 65) console.log(JSON.stringify({ plan: persona.plan, saver: persona.saver, cash: Math.round(s.finances.cash), dc: s.retirement.dc, equity: Math.round(s.housing.properties.reduce((t, p) => t + p.value - (p.mortgage?.balance ?? 0), 0)), inv: Math.round(Object.values(s.investing.holdings).reduce((t, h) => t + h.value, 0)), nw }));
      if (process.env.BALANCE_DEBUG === 'grade' && s.character.age === 40 && s.career.job) console.log(JSON.stringify({ plan: persona.plan, prof: s.career.job.professionId, level: s.career.job.levelId, grade: s.career.job.grade, salary: s.career.job.salary, dept: Boolean(s.career.job.department) }));
    }
    if (process.env.BALANCE_DEBUG === 'bankrupt' && s.finances.bankruptcies) {
      const lines = s.log.flatMap((b) => b.entries.map((e) => `${b.age}: ${e.text}`)).filter((t) => /bankrupt|Year-end|Laid off|homeless|Retired|hired|job as/i.test(t));
      console.log(`--- life ${i} plan ${persona.plan}\n${lines.slice(0, 30).join('\n')}`);
    }
    if (process.env.BALANCE_DEBUG === 'homeless' && stats.everHomeless) {
      const lines = s.log.flatMap((b) => b.entries.map((e) => `${b.age}: ${e.text}`)).filter((t) => /homeless|evict|lease|Year-end|Laid off|terminated|left your job|hired|parents|sold|prison|sentenced|foreclos/i.test(t));
      const first = lines.findIndex((t) => /homeless|evict/i.test(t));
      console.log(`--- life ${i} plan ${persona.plan}\n${lines.slice(Math.max(0, first - 6), first + 4).join('\n')}`);
    }
    if (process.env.BALANCE_DEBUG === 'foreclosure' && s.housing.credit.events.some((e) => e.type === 'foreclosure')) {
      const lines = s.log.flatMap((b) => b.entries.map((e) => `${b.age}: ${e.text}`)).filter((t) => /foreclos|mortgage|bought|Year-end|delinquent|laid off|Laid off|terminated|resigned|left your job/i.test(t));
      console.log(`--- life ${i} plan ${persona.plan}\n${lines.slice(0, 40).join('\n')}`);
    }
    const hist = s.economy.history;
    results.push({
      age: s.character.age,
      cause: s.character.causeOfDeath,
      degree: s.education.degrees.some((d) => ['bachelor', 'master', 'doctorate', 'professional'].includes(d.type)),
      felony: s.legal.record.some((r) => r.severity === 'felony'),
      prison: s.legal.record.some((r) => /prison/.test(r.sentence ?? '')),
      bankrupt: s.finances.bankruptcies > 0,
      foreclosed: s.housing.credit.events.some((e) => e.type === 'foreclosure'),
      owner: s.housing.everOwned,
      ownedBy45: stats.firstHomeAge != null && stats.firstHomeAge <= 45,
      dbPension: s.retirement.pensions.some((p) => !['va', 'moh', 'military'].includes(p.id)) || Object.values(s.retirement.plans).some((p) => p.started),
      veteran: s.military.history.length > 0,
      ptsd: s.health.conditions.some((c) => c.id === 'ptsd'),
      peakGrade: Math.max(0, ...s.career.history.map((h) => h.peakGrade ?? 0), s.career.job?.peakGrade ?? 0),
      unemploymentAvg: hist.reduce((a, h) => a + h.unemployment, 0) / Math.max(1, hist.length),
      econYears: hist.length,
      recessions: hist.filter((h, k) => h.phase === 'recession' && hist[k - 1]?.phase !== 'recession').length,
      everMarried: (s.people?.marriages ?? 0) > 0,
      everDivorced: (s.people?.divorces ?? 0) > 0,
      hadKids: (s.people?.list ?? []).some((p) => p.relation === 'child'),
      wealth: s.people?.wealth,
      plan: persona.plan,
      ...stats,
    });
  }
  return results;
}

/* ------------------------------------------------------------------ */
/* Main: fan out, aggregate, report                                    */
/* ------------------------------------------------------------------ */

const median = (xs) => {
  const v = xs.filter((x) => x != null).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : NaN;
};
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const share = (rs, f) => rs.filter(f).length / Math.max(1, rs.length);

export function aggregate(rs) {
  const adults = rs.filter((r) => r.age >= 18);
  const at40 = rs.filter((r) => r.age >= 41);
  const at45 = rs.filter((r) => r.age >= 46);
  const at65 = rs.filter((r) => r.nw65 != null);
  const owners = rs.filter((r) => r.owner);
  const combatVets = rs.filter((r) => r.combat);
  return {
    lifespan: mean(rs.map((r) => r.age)),
    salaryAt40: median(at40.map((r) => r.salaryAt40).filter((x) => x)),
    employedAt40: share(at40, (r) => r.employedAt40),
    degreeShare: share(adults.filter((r) => r.age >= 25), (r) => r.degree),
    ownedBy45: share(at45, (r) => r.ownedBy45),
    firstHomeAge: median(rs.map((r) => r.firstHomeAge)),
    foreclosed: share(owners, (r) => r.foreclosed),
    homelessEver: share(adults, (r) => r.everHomeless),
    felony: share(adults, (r) => r.felony),
    prison: share(adults, (r) => r.prison),
    bankruptcy: share(adults, (r) => r.bankrupt),
    recessionEvery: rs.reduce((a, r) => a + r.econYears, 0) / Math.max(1, rs.reduce((a, r) => a + r.recessions, 0)),
    unemployment: mean(rs.map((r) => r.unemploymentAvg)),
    retireAge: median(rs.map((r) => r.retiredAge)),
    dbPension: share(rs.filter((r) => r.retiredAge != null), (r) => r.dbPension),
    millionaire: share(at65, (r) => r.peakNw >= 1e6),
    medianNetWorth65: median(at65.map((r) => r.nw65)),
    supervisor: share(at40, (r) => r.supervised),
    veterans: share(adults, (r) => r.veteran),
    ptsdVets: combatVets.length ? share(combatVets, (r) => r.ptsd) : NaN,
    everMarried: share(at45, (r) => r.everMarried),
    divorced: share(at45.filter((r) => r.everMarried), (r) => r.everDivorced),
    parents: share(at45, (r) => r.hadKids),
    repeatRate: rs.reduce((a, r) => a + r.storyRepeats, 0) / Math.max(1, rs.reduce((a, r) => a + r.storyEvents, 0)),
  };
}

async function main() {
  const lives = Number(process.argv[2] ?? 2000);
  const seed = Number(process.argv[3] ?? 1);
  const threads = Math.max(1, Math.min(os.cpus().length, 8));
  const per = Math.ceil(lives / threads);
  const started = Date.now();
  const chunks = await Promise.all(
    Array.from({ length: threads }, (_, t) => new Promise((resolve, reject) => {
      const w = new Worker(fileURLToPath(import.meta.url), { workerData: { from: t * per, to: Math.min(lives, (t + 1) * per), seed } });
      w.once('message', resolve);
      w.once('error', reject);
    })),
  );
  const rs = chunks.flat();
  const m = aggregate(rs);
  let failures = 0;
  console.log(`Balance report — ${rs.length} lives, seed ${seed}, ${((Date.now() - started) / 1000).toFixed(0)}s\n`);
  for (const [key, t] of Object.entries(TARGETS)) {
    const v = m[key];
    const ok = Number.isFinite(v) && v >= t.band[0] && v <= t.band[1];
    if (!ok) failures += 1;
    console.log(`  ${ok ? '✔' : '✘'} ${key.padEnd(17)} ${String(Number.isFinite(v) ? t.fmt(v) : 'n/a').padStart(11)}   band ${t.fmt(t.band[0])}–${t.fmt(t.band[1])}   ${t.ref}`);
  }
  const causes = {};
  for (const r of rs) {
    const c = (r.cause ?? 'alive').split(' — ')[0].replace(/ \(untreated\)/, '');
    causes[c] = (causes[c] ?? 0) + 1;
  }
  console.log(`\n  causes of death: ${Object.entries(causes).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([c, n]) => `${c} ${pct(n / rs.length)}`).join(', ')}`);
  const byPlan = {};
  for (const r of rs.filter((x) => x.salaryAt40)) (byPlan[r.plan] ??= []).push(r.salaryAt40);
  console.log('  median salary at 40 vs. real-world median:');
  let payOff = 0;
  for (const [p, xs] of Object.entries(byPlan).sort()) {
    const ratio = median(xs) / PAY_AT_40[p];
    const ok = ratio >= 0.75 && ratio <= 1.3;
    if (!ok) payOff += 1;
    console.log(`    ${ok ? '✔' : '✘'} ${p.padEnd(12)} ${money(median(xs)).padStart(9)}  vs ${money(PAY_AT_40[p]).padStart(9)}  (×${ratio.toFixed(2)}, n=${xs.length})`);
  }
  failures += payOff;
  console.log(failures ? `\n${failures} metric(s) outside their band` : '\n✔ All metrics within real-world bands');
  process.exit(failures ? 1 : 0);
}

const runDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainThread && runDirectly) main();
else if (!isMainThread) playLives(workerData).then((r) => parentPort.postMessage(r));
