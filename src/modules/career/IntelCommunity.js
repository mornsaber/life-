/**
 * Life inside the Intelligence Community.
 *
 *   Polygraph   CIA and NSA hires take a full-scope polygraph in their
 *               first year. Telling the truth about your past usually gets
 *               you through; trying to beat it is a gamble with a federal
 *               crime attached.
 *   Cover       Operations officers choose official cover (embassy job,
 *               diplomatic immunity) or non-official cover (a business
 *               identity: more pay, no immunity if you're blown).
 *   Stations    Three-year tours at overseas stations, with hardship and
 *               danger pay.
 *   Operations  Spotting and recruiting assets, walk-ins and double agents,
 *               surveillance, and the moral weight of people who trust you.
 *   SIGINT      Breakthroughs, compliance lines (FISA) and the temptation to
 *               leak.
 *   Insider     Foreign services pitch cleared officers. Reporting it is
 *   threat      rewarded; accepting is espionage.
 *
 * job.poly, job.cover ('official' | 'noc'), job.assets
 */
import { addHonor } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { pickFresh } from '../../core/Pools.js';
import { IC_PROFESSIONS } from './IntelCareers.js';
import { recalcSalary } from './Compensation.js';
import { backgroundIssues } from '../publicservice/PublicServiceEngine.js';

export const NOC_PAY = 1.2;

export const STATIONS = [
  { city: 'Vienna', country: 'Austria', hardship: 0, danger: 0, flavor: '🎻' },
  { city: 'Berlin', country: 'Germany', hardship: 0, danger: 0, flavor: '🧱' },
  { city: 'Istanbul', country: 'Türkiye', hardship: 0.1, danger: 0.05, flavor: '🕌' },
  { city: 'Moscow', country: 'Russia', hardship: 0.25, danger: 0.15, flavor: '❄️' },
  { city: 'Beijing', country: 'China', hardship: 0.2, danger: 0.1, flavor: '🏯' },
  { city: 'Islamabad', country: 'Pakistan', hardship: 0.3, danger: 0.25, flavor: '🏔️' },
  { city: 'Baghdad', country: 'Iraq', hardship: 0.35, danger: 0.35, flavor: '🛡️' },
  { city: 'Caracas', country: 'Venezuela', hardship: 0.25, danger: 0.2, flavor: '🌴' },
  { city: 'Nairobi', country: 'Kenya', hardship: 0.2, danger: 0.1, flavor: '🦒' },
  { city: 'Kyiv', country: 'Ukraine', hardship: 0.3, danger: 0.3, flavor: '🌻' },
];

const AWARDS = {
  careerMedal: { name: 'Career Intelligence Medal', icon: '🎖️', prestige: 20, ribbon: [['#1b2a49', 2], ['#c9a227', 1], ['#1b2a49', 2]] },
  intelStar: { name: 'Intelligence Star', icon: '⭐', prestige: 35, ribbon: [['#1b2a49', 2], ['#ffffff', 1], ['#c8102e', 1], ['#ffffff', 1], ['#1b2a49', 2]] },
  dic: { name: 'Distinguished Intelligence Cross', icon: '✠', prestige: 60, ribbon: [['#c8102e', 3], ['#c9a227', 1], ['#c8102e', 3]] },
  nsaMeritorious: { name: 'NSA Meritorious Civilian Service Award', icon: '🏅', prestige: 18, ribbon: [['#003366', 2], ['#c9a227', 3], ['#003366', 2]] },
};

function award(ctx, id, citation) {
  const a = AWARDS[id];
  addHonor(ctx.state, { id: `ic.${id}`, source: 'civil', name: a.name, icon: a.icon, ribbon: a.ribbon, prestige: a.prestige, precedence: 28, citation });
  ctx.log(`Awarded the ${a.name} (in a ceremony nobody outside the building will ever hear about). ${citation}`, a.icon, 'honor');
}

const isIC = (job) => job && IC_PROFESSIONS.includes(job.professionId);
const needsPoly = (job) => job && ['caseOfficer', 'sigint'].includes(job.professionId);

/* ------------------------------------------------------------------ */
/* Polygraph, cover and stations                                       */
/* ------------------------------------------------------------------ */

function polygraphPrompt(ctx) {
  const issues = backgroundIssues(ctx.state).filter((i) => !i.hidden);
  ctx.prompt({
    type: 'intel.polygraph',
    icon: '📈',
    title: 'Full-Scope Polygraph',
    text: `Counterintelligence and lifestyle questions, four hours in a cold room. ${issues.length ? `Your background includes: ${issues.map((i) => i.label).join('; ')}.` : 'Your background is clean.'}${ctx.state.publicService.clearance?.concealed ? '\nYou left something off your SF-86.' : ''}`,
    options: [
      { id: 'truth', label: '🗣️ Answer everything truthfully', hint: 'Candor is usually survivable' },
      { id: 'beat', label: '🧊 Try to beat the machine', hint: 'Lying here is a federal crime', tone: 'danger' },
    ],
  });
}

function coverPrompt(ctx) {
  ctx.prompt({
    type: 'intel.cover',
    icon: '🕶️',
    title: 'Choose Your Cover',
    text: 'You graduated from the Farm. How will you work overseas?',
    options: [
      { id: 'official', label: '🏛️ Official cover (an embassy job)', hint: 'Diplomatic immunity if things go wrong' },
      { id: 'noc', label: '💼 Non-official cover (a business identity)', hint: `${Math.round((NOC_PAY - 1) * 100)}% more pay, deeper access, no immunity` },
    ],
  });
}

function stationPrompt(ctx, reason) {
  const choices = ctx.rng.shuffle(STATIONS).slice(0, 3);
  ctx.prompt({
    type: 'intel.station',
    icon: '🌍',
    title: 'Station Assignment',
    text: `${reason}\nHard targets and war zones pay differentials and make careers.`,
    options: [
      ...choices.map((p) => ({ id: p.city, label: `${p.flavor} ${p.city}, ${p.country}`, hint: p.hardship || p.danger ? `+${Math.round(p.hardship * 100)}% hardship${p.danger ? ` · +${Math.round(p.danger * 100)}% danger` : ''}` : 'Comfortable station', tone: p.danger >= 0.2 ? 'danger' : undefined })),
      { id: 'hq', label: '🏢 A headquarters tour at Langley' },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

/**
 * Option fields: perf, boss, stress, danger (injury odds), award, check (stat),
 * asset (+1 recruited asset), blown (chance cover is blown), offense.
 */
export const IC_EVENTS = {
  caseOfficer: [
    { id: 'spot', title: 'A Promising Contact', text: 'A mid-level official at a foreign ministry keeps showing up at the same receptions. He is in debt and angry at his boss.', options: [
      { id: 'develop', label: '🍷 Develop him slowly over months', check: 'smarts', perf: 6, asset: 1 },
      { id: 'pitch', label: '💵 Pitch him now', perf: 8, asset: 1, blown: 0.15 },
      { id: 'pass', label: '🚶 Too risky; walk away', perf: 0 },
    ] },
    { id: 'walkIn', title: 'A Walk-In', text: 'A nervous man at the embassy gate says he is an intelligence officer and has documents to sell.', options: [
      { id: 'vet', label: '🔍 Vet him carefully before believing anything', check: 'smarts', perf: 6, award: 'careerMedal' },
      { id: 'run', label: '🏃 Grab the documents and run with it', perf: 4, blown: 0.1 },
    ] },
    { id: 'surveillance', title: 'Surveillance', text: 'On the way to a meeting with your best asset, you spot the same car for the third time.', options: [
      { id: 'abort', label: '🛑 Abort the meeting', perf: 1 },
      { id: 'sdr', label: '🌀 Run a long surveillance detection route and go ahead', check: 'smarts', perf: 5, blown: 0.12 },
    ] },
    { id: 'assetDanger', title: 'An Asset in Danger', text: 'Your agent signals that his service is closing in on him. He has a wife and two kids.', options: [
      { id: 'exfil', label: '🚨 Push headquarters for an exfiltration', perf: 8, stress: 10, danger: 0.08, award: 'intelStar' },
      { id: 'one', label: '📁 Ask him for one last delivery first', perf: 4, stress: 6, guilt: true },
    ] },
    { id: 'double', title: 'Double Agent?', text: 'Your newest asset\'s reporting is too good, and it always arrives just when you need it.', options: [
      { id: 'test', label: '🧪 Test him with a canary trap', check: 'smarts', perf: 7, award: 'careerMedal' },
      { id: 'trust', label: '🤝 Trust him; the reporting is gold', perf: 3, blown: 0.2 },
    ] },
    { id: 'honeytrap', title: 'An Interesting Stranger', text: 'A charming local keeps finding reasons to meet you after hours.', options: [
      { id: 'report', label: '📋 Report the contact to security', perf: 3 },
      { id: 'play', label: '😏 See where it goes', perf: 0, blown: 0.3, stress: 4 },
    ] },
    { id: 'coup', title: 'Coup Warning', text: 'An asset tells you the army will move against the president within days.', options: [
      { id: 'cable', label: '📨 Send a flash cable to Washington', check: 'smarts', perf: 9, award: 'intelStar' },
      { id: 'confirm', label: '⏳ Wait for a second source', perf: 3 },
    ] },
  ],
  sigint: [
    { id: 'breakthrough', title: 'Breakthrough', text: 'After months on an adversary\'s new encryption, your team sees a pattern in the traffic.', options: [
      { id: 'push', label: '🧮 Push through the holiday to crack it', check: 'smarts', perf: 9, stress: 8, award: 'nsaMeritorious' },
      { id: 'pace', label: '📆 Document it and pace the team', perf: 4 },
    ] },
    { id: 'usPerson', title: 'A U.S. Person', text: 'Your target is talking with an American. Collection rules say you must minimize it.', options: [
      { id: 'minimize', label: '⚖️ Minimize and log it for compliance', perf: 3 },
      { id: 'keep', label: '👂 Keep listening: the intel is too good', perf: 5, blown: 0.15, compliance: true },
    ] },
    { id: 'zeroDay', title: 'The Zero-Day', text: 'You found a hole in software Americans use too. Exploiting it helps the mission; disclosing it protects everyone.', options: [
      { id: 'disclose', label: '🛡️ Push for disclosure through the equities process', perf: 3, boss: -2 },
      { id: 'exploit', label: '🗡️ Keep it for operations', perf: 6 },
    ] },
    { id: 'leakUrge', title: 'What You\'ve Seen', text: 'A program you work on seems to cross a line you can\'t stop thinking about. A journalist would kill for it.', options: [
      { id: 'channels', label: '📑 Report it to the Inspector General', perf: 1, boss: -4 },
      { id: 'leak', label: '📰 Hand it to the journalist', perf: 0, offense: 'leak' },
      { id: 'drop', label: '🤐 Let it go', perf: 0, stress: 6 },
    ] },
  ],
};

/** A foreign service pitches you: report it or sell out. */
const APPROACH = { id: 'approach', title: 'The Pitch', text: 'At a conference abroad, a "consultant" makes it clear his government would pay well for what you know.', options: [
  { id: 'report', label: '📋 Report the approach to counterintelligence', perf: 5, award: 'careerMedal' },
  { id: 'sell', label: '💰 Take the money', perf: 0, espionage: true },
] };

function eventPrompt(ctx, job, approachOnly = false) {
  const { state, rng } = ctx;
  const pool = approachOnly || rng.chance(0.08) ? [APPROACH] : IC_EVENTS[job.professionId];
  if (!pool?.length) return;
  const e = pool.length === 1 ? pool[0] : pickFresh(rng, state, `ic.${job.professionId}`, pool);
  ctx.prompt({
    type: 'intel.event',
    icon: job.professionId === 'sigint' ? '📡' : '🕶️',
    title: e.title,
    text: `${job.posting ? `${job.posting.city} station · ` : ''}${e.text}`,
    options: e.options.map((o) => ({ id: o.id, label: o.label, tone: o.offense || o.espionage || o.blown >= 0.2 ? 'danger' : undefined })),
    data: { pool: pool === IC_EVENTS[job.professionId] ? job.professionId : 'approach', id: e.id },
  });
}

function blownCover(ctx, job) {
  const { state, rng } = ctx;
  if (job.cover === 'noc') {
    ctx.log(`Your cover was blown. With no diplomatic immunity, you spent ${rng.int(2, 9)} months in a foreign jail before a prisoner swap brought you home.`, '⛓️', 'bad');
    ctx.stat('health', -rng.int(8, 20));
    ctx.emit('health:trauma', { amount: 35, source: 'detention' });
  } else {
    ctx.log('Your cover was blown. The host government declared you persona non grata and expelled you within 48 hours.', '🛂', 'bad');
    ctx.emit('health:trauma', { amount: 10, source: 'work' });
  }
  ctx.emit('career:adjust', { performance: -10, boss: -6 });
  ctx.emit('career:posting', { posting: null });
  job.cover = null;
  job.coverBlown = true;
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export const IntelCommunityModule = {
  id: 'intel',
  order: 30.98,

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    if (!isIC(job) || state.legal.incarceration) return;
    if (needsPoly(job) && !job.poly) return void polygraphPrompt(ctx);
    if (job.professionId === 'caseOfficer') {
      job.postingYears = (job.postingYears ?? 0) + 1;
      if (job.levelId !== 'trainee' && !job.cover && !job.coverBlown) return void coverPrompt(ctx);
      if (job.cover && (!job.posting || job.postingYears >= 3) && !['divisionChief'].includes(job.levelId)) return void stationPrompt(ctx, job.posting ? 'Your tour is ending. Where next?' : 'Headquarters has a station for you.');
      // (Hardship and danger pay for any federal posting are paid by FederalAgencies.)
      if (job.posting) {
        if (rng.chance(job.posting.danger * 0.15)) {
          ctx.stat('health', -rng.int(10, 25));
          ctx.log(`A car bomb went off outside the station in ${job.posting.city}. You were hurt.`, '💥', 'bad');
          if (rng.chance(0.03)) { ctx.log('Your star was carved into the Memorial Wall at Langley, with no name beside it.', '⭐', 'death'); ctx.die(`Killed in the line of duty, ${job.posting.city} station`); return; }
        }
      }
    }
    // Analysts get the agency's events from FederalAgencies; everyone in the IC can be pitched.
    if (job.professionId === 'intelligence') { if (rng.chance(0.06)) eventPrompt(ctx, job, true); return; }
    if (job.levelId !== 'trainee' && job.levelId !== 'intern' && rng.chance(0.55)) eventPrompt(ctx, job);
  },

  resolvers: {
    polygraph(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!job) return;
      const c = state.publicService.clearance;
      const weight = state.publicService && backgroundIssues(state).filter((i) => !i.hidden).reduce((s, i) => s + i.weight, 0);
      if (optionId === 'beat') {
        if (rng.chance(clamp(0.45 + (state.stats.stress - 40) / 200, 0.25, 0.8))) {
          ctx.log('The examiner called you back three times. Then security walked you out of the building.', '📈', 'bad');
          ctx.emit('career:resign', { reason: 'Conditional offer rescinded after the polygraph', fired: true });
          if (c?.concealed || weight > 20) ctx.emit('legal:offense', { offenseId: 'falseStatement', context: 'lying during a federal polygraph', caught: true, evidence: 0.6 });
          return;
        }
      } else if (rng.chance(clamp(0.05 + weight / 150 + (c?.concealed ? 0.25 : 0), 0.03, 0.8))) {
        ctx.log('You told the truth, and it wasn\'t enough: adjudicators rescinded your conditional offer.', '📈', 'bad');
        if (c) c.concealed = false;
        ctx.emit('career:resign', { reason: 'Conditional offer rescinded after the polygraph', fired: true });
        return;
      }
      job.poly = true;
      if (c) { c.poly = true; if (optionId === 'truth') c.concealed = false; }
      ctx.log('You passed the full-scope polygraph.', '📈', 'good');
    },

    cover(ctx, _data, optionId) {
      const job = ctx.state.career.job;
      if (!job) return;
      job.cover = optionId === 'noc' ? 'noc' : 'official';
      job.payAdjust = optionId === 'noc' ? NOC_PAY : 1;
      recalcSalary(ctx.state, job);
      ctx.log(optionId === 'noc' ? 'You took non-official cover: a consulting firm, a new business card and a life you can\'t talk about.' : 'You took official cover: on paper you are a second secretary at the embassy.', '🕶️', 'milestone');
    },

    station(ctx, _data, optionId) {
      const job = ctx.state.career.job;
      if (!job) return;
      job.postingYears = 0;
      if (optionId === 'hq') {
        ctx.emit('career:posting', { posting: null });
        ctx.emit('region:relocate', { regionId: 'dc', reason: 'You took a headquarters tour at Langley.' });
        return;
      }
      const s = STATIONS.find((x) => x.city === optionId);
      if (!s) return;
      ctx.emit('career:posting', { posting: { city: s.city, country: s.country, hardship: s.hardship, danger: s.danger, immunity: job.cover === 'official', housing: true, station: true } });
      job.postingYears = 0;
      ctx.log(`You arrived at ${s.city} station${job.cover === 'noc' ? ' under non-official cover' : ''}. ${s.flavor}`, '🌍', 'milestone');
    },

    event(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      const e = data.pool === 'approach' ? APPROACH : IC_EVENTS[data.pool]?.find((x) => x.id === data.id);
      const o = e?.options.find((x) => x.id === optionId);
      if (!job || !o) return;
      let perf = o.perf ?? 0;
      if (o.check && state.stats[o.check] < 55 + rng.int(-12, 12)) {
        perf = -3;
        ctx.log(`${e.title}: it didn't go your way.`, '😬', 'warn');
      } else if (o.award && rng.chance(0.3)) award(ctx, o.award, `${e.title}.`);
      if (o.asset) {
        job.assets = (job.assets ?? 0) + o.asset;
        ctx.log(`You recruited a new asset (${job.assets} so far in your career).`, '🤝', 'good');
      }
      if (o.stress) ctx.stat('stress', o.stress);
      if (o.guilt) ctx.emit('health:trauma', { amount: 12, source: 'work' });
      if (o.danger && rng.chance(o.danger)) { ctx.stat('health', -rng.int(8, 20)); ctx.log('It turned violent before you got out.', '🩹', 'bad'); }
      if (o.compliance && rng.chance(0.4)) { perf -= 10; ctx.log('A compliance audit flagged your collection. You were pulled off the target.', '⚖️', 'bad'); }
      if (o.offense) ctx.emit('legal:offense', { offenseId: o.offense, context: 'leaking classified documents to a journalist', caught: rng.chance(0.5), discovery: 0.5, evidence: 0.8 });
      if (o.espionage) {
        ctx.earn(rng.int(10, 40) * 10000, 'Cash from a foreign intelligence service', { ssCovered: false });
        ctx.emit('legal:offense', { offenseId: 'espionage', context: 'selling secrets to a foreign intelligence service', caught: false, discovery: 0.2, evidence: 0.85 });
        ctx.stat('stress', 15);
        ctx.log('You took the money. Every knock on the door will sound different now.', '💰', 'bad');
      }
      ctx.emit('career:adjust', { performance: perf, boss: o.boss ?? 0 });
      if (o.blown && job.professionId === 'caseOfficer' && rng.chance(o.blown)) blownCover(ctx, job);
    },
  },
};
