/**
 * Federal service: agencies, political stability, shutdowns and furloughs,
 * bureaucratic event popups, senior policy decisions, Foreign Service
 * postings (hardship/danger pay, embassy housing, diplomatic immunity) and
 * National Park Service duty stations (rural, housing provided).
 *
 * state.publicService.federal = { stability: 0–100, shutdown: bool }
 */
import { pickFresh } from '../../core/Pools.js';
import { L } from '../career/Ladder.js';
import { addHonor } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { postAbroad, endPosting } from '../world/Posting.js';
import { COUNTRIES } from '../world/Countries.js';


/* The careers themselves (FEDERAL_PROFESSIONS) live in content/packs/careers-federal.js. */

/* ------------------------------------------------------------------ */
/* Foreign Service postings                                            */
/* ------------------------------------------------------------------ */

export const POSTS = [
  { city: 'Paris', country: 'France', hardship: 0, danger: 0, flavor: '🥐' },
  { city: 'Tokyo', country: 'Japan', hardship: 0, danger: 0, flavor: '🗼' },
  { city: 'Ottawa', country: 'Canada', hardship: 0, danger: 0, flavor: '🍁' },
  { city: 'Mexico City', country: 'Mexico', hardship: 0.15, danger: 0, flavor: '🌮' },
  { city: 'Nairobi', country: 'Kenya', hardship: 0.2, danger: 0, flavor: '🦒' },
  { city: 'Lagos', country: 'Nigeria', hardship: 0.25, danger: 0.1, flavor: '🌍' },
  { city: 'Islamabad', country: 'Pakistan', hardship: 0.3, danger: 0.25, flavor: '🏔️' },
  { city: 'Baghdad', country: 'Iraq', hardship: 0.35, danger: 0.35, flavor: '🛡️' },
  { city: 'Kyiv', country: 'Ukraine', hardship: 0.3, danger: 0.3, flavor: '🌻' },
];

const homeName = (state) => COUNTRIES[state.character.countryId ?? 'US']?.name ?? 'United States';
const isDiplomat = (job) => /(^|_)foreignService$/.test(job?.professionId ?? '');

function postingPrompt(ctx, reason) {
  const home = homeName(ctx.state);
  const choices = ctx.rng.shuffle(POSTS.filter((p) => p.country !== home)).slice(0, 3);
  const us = !ctx.state.character.countryId || ctx.state.character.countryId === 'US';
  ctx.prompt({
    type: 'federal.posting',
    icon: '🌐',
    title: us ? 'Foreign Service Bid List' : 'The Postings Round',
    text: `${reason}\nHardship and danger posts pay differentials and earn promotion credit; embassy housing is provided overseas, and you'll carry diplomatic immunity.`,
    options: [
      ...choices.map((p) => ({ id: p.city, label: `${p.flavor} ${p.city}, ${p.country}`, hint: p.hardship || p.danger ? `+${Math.round(p.hardship * 100)}% hardship${p.danger ? ` · +${Math.round(p.danger * 100)}% danger` : ''}` : 'Comfortable post', tone: p.danger ? 'danger' : undefined })),
      { id: 'domestic', label: us ? '🏛️ Domestic tour in Washington, D.C.' : '🏛️ A tour at the ministry at home', hint: 'No immunity, no differentials' },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Agency events                                                       */
/* ------------------------------------------------------------------ */

const AWARDS = {
  superiorHonor: { name: 'Superior Honor Award', icon: '🏅', prestige: 12, ribbon: [['#002868', 2], ['#ffd100', 3], ['#002868', 2]] },
  distinguished: { name: 'Distinguished Service Award', icon: '🎖️', prestige: 25, ribbon: [['#ffd100', 1], ['#002868', 5], ['#ffd100', 1]] },
  valor: { name: 'Department Valor Award', icon: '🦁', prestige: 30, ribbon: [['#c8102e', 2], ['#ffd100', 1], ['#1f6f43', 2], ['#ffd100', 1], ['#c8102e', 2]] },
  heroism: { name: 'Secretary\'s Award for Heroism', icon: '🌟', prestige: 35, ribbon: [['#4b6ea8', 2], ['#fff', 1], ['#c8102e', 3], ['#fff', 1], ['#4b6ea8', 2]] },
};

function awardCivil(ctx, awardId, citation) {
  const a = AWARDS[awardId];
  addHonor(ctx.state, { id: `federal.${awardId}`, source: 'civil', name: a.name, icon: a.icon, ribbon: a.ribbon, prestige: a.prestige, precedence: 30, citation });
  ctx.log(`Awarded the ${a.name}. ${citation}`, a.icon, 'honor');
  ctx.toast(`${a.icon} ${a.name}`, 'honor');
}

export const AGENCY_EVENTS = {
  regulatory: [
    { id: 'hearing', title: 'Congressional Hearing', text: 'You\'ve been called to testify before a House oversight subcommittee about a bank failure your team examined.', options: [
      { id: 'prepare', label: '📚 Prepare exhaustively and testify candidly', check: 'smarts', perf: 8, award: 'superiorHonor', stability: 2 },
      { id: 'script', label: '📄 Stick to the agency talking points', perf: 2, boss: 4 },
    ] },
    { id: 'reorg', title: 'Agency Reorganization', text: 'Leadership is merging two divisions and asking for volunteers to stand up the new office.', options: [
      { id: 'volunteer', label: '🙋 Volunteer to build the new office', perf: 6, stress: 8, boss: 4 },
      { id: 'stay', label: '🪑 Stay where you are', perf: 0 },
    ] },
    { id: 'revolving', title: 'Job Offer from a Bank', text: 'A bank you supervise offers you a senior job at triple your salary — while your exam of them is still open.', options: [
      { id: 'recuse', label: '📋 Recuse yourself and report the offer', perf: 4, boss: 2 },
      { id: 'soften', label: '🤫 Soften the findings and take the job later', perf: 2, stress: 6 },
    ] },
  ],
  foreignService: [
    { id: 'evacuation', title: 'Embassy Evacuation', text: 'Unrest is spreading through the capital. Hundreds of your own citizens need to get out before the airport closes.', options: [
      { id: 'stay', label: '🛂 Stay behind to run the evacuation', perf: 10, danger: 0.2, award: 'heroism' },
      { id: 'leave', label: '✈️ Leave on the first flight with non-essential staff', perf: -4 },
    ] },
    { id: 'demarche', title: 'Delivering a Démarche', text: 'You must deliver a stern diplomatic protest to a hostile foreign ministry.', options: [
      { id: 'firm', label: '🧊 Firm, precise and by the book', check: 'smarts', perf: 6 },
      { id: 'improvise', label: '🎭 Soften it to preserve the relationship', perf: -2, boss: -6, stability: 1 },
    ] },
    { id: 'visa', title: 'Visa Line', text: 'A desperate family asks you to "make an exception" on a visa refusal; a local fixer offers cash.', options: [
      { id: 'rules', label: '📜 Apply the law and refer the bribe attempt', perf: 4 },
      { id: 'review', label: '🔍 Re-interview them fairly', check: 'smarts', perf: 3 },
    ] },
    { id: 'leak', title: 'Your Cable Leaked', text: 'A frank cable you wrote about the host government\'s ministers is on the front page of a local paper.', options: [
      { id: 'own', label: '🙇 Call on the ministers and own it', check: 'smarts', perf: 3, stress: 6 },
      { id: 'deny', label: '🤐 Say nothing and let it blow over', perf: -3, boss: -4 },
    ] },
    { id: 'visitPrep', title: 'The Minister Is Coming', text: 'Your foreign minister lands in nine days. Every meeting, motorcade and photo is yours to arrange.', options: [
      { id: 'grind', label: '🗓️ Nine days without sleep', perf: 7, stress: 8, boss: 4 },
      { id: 'delegate', label: '🤝 Lean on the local staff', check: 'smarts', perf: 4 },
    ] },
    { id: 'kidnap', title: 'Aid Worker Kidnapped', text: 'A citizen working for a charity has been taken by an armed group. The family calls you every hour.', options: [
      { id: 'channels', label: '📞 Work every channel, by the rules', perf: 6, stress: 10, stability: 1 },
      { id: 'ransom', label: '💼 Quietly put them in touch with a ransom negotiator', perf: 2, stress: 6, boss: -6 },
    ] },
    { id: 'detained', title: 'A Citizen Detained', text: 'A student from home was arrested at a protest. Consular access is being delayed.', options: [
      { id: 'press', label: '🏛️ Press the ministry every day', perf: 6, stress: 6, stability: 1 },
      { id: 'quiet', label: '🤝 Work quiet channels', check: 'smarts', perf: 5 },
    ] },
  ],
  oig: [
    { id: 'appointee', title: 'Investigating an Appointee', text: 'Your audit points to a politically connected appointee steering contracts to a donor.', options: [
      { id: 'pursue', label: '🔍 Pursue it to the end', perf: 8, stability: -4, boss: -4, award: 'distinguished', risk: 0.3 },
      { id: 'close', label: '📁 Close it as "insufficient evidence"', perf: -6, boss: 6 },
    ] },
    { id: 'whistle', title: 'Whistleblower', text: 'A frightened employee brings you proof that a program director falsified safety data.', options: [
      { id: 'protect', label: '🛡️ Open a case and shield the whistleblower', perf: 7, award: 'superiorHonor', stress: 6 },
      { id: 'refer', label: '📨 Refer it back to the agency', perf: -3 },
    ] },
  ],
  parkService: [
    { id: 'wildfire', title: 'Wildfire at the Campground', text: 'A wind-driven wildfire is racing toward a crowded campground at dusk.', options: [
      { id: 'evacuate', label: '🔥 Drive into the smoke to evacuate campers', perf: 10, danger: 0.12, award: 'valor' },
      { id: 'roadblock', label: '🚧 Set roadblocks and direct traffic out', perf: 4 },
    ] },
    { id: 'bear', title: 'Bear Encounter', text: 'A grizzly is approaching a family taking selfies on a popular trail.', options: [
      { id: 'haze', label: '📢 Step in and haze the bear away', perf: 6, danger: 0.05, check: 'fitness' },
      { id: 'close', label: '🚫 Close the trail and clear the area', perf: 3 },
    ] },
    { id: 'bearJam', title: 'Bear Jam', text: 'A grizzly and two cubs are on the road; tourists are out of their cars with phones.', options: [
      { id: 'clear', label: '📢 Clear the crowd and move the bears along', perf: 5, danger: 0.05 },
      { id: 'close', label: '🚧 Close the road for the afternoon', perf: 3 },
    ] },
  ],
  intelligence: [
    { id: 'dissent', title: 'Analytic Dissent', text: 'Senior leadership wants your assessment rewritten to support a policy they\'ve already announced.', options: [
      { id: 'stand', label: '📑 Stand by your analysis', perf: 2, boss: -10, award: 'superiorHonor', stability: 2 },
      { id: 'rewrite', label: '✏️ Soften the conclusions', perf: 0, boss: 8, stability: -4 },
    ] },
    { id: 'pdb', title: 'The President\'s Daily Brief', text: 'Your piece made the PDB, and the briefer wants you there to answer questions.', options: [
      { id: 'brief', label: '🎙️ Brief it yourself', check: 'smarts', perf: 9, award: 'superiorHonor' },
      { id: 'notes', label: '📝 Send detailed notes with the briefer', perf: 4 },
    ] },
    { id: 'warning', title: 'Warning Failure?', text: 'An attack happened that your team had flagged as "unlikely" six months ago.', options: [
      { id: 'own', label: '🧭 Own it in the post-mortem', perf: 2, boss: 2 },
      { id: 'deflect', label: '🙈 Point to collection gaps', perf: 0, boss: -2 },
    ] },
    { id: 'source', title: 'Source in Danger', text: 'Your best source thinks she has been discovered and wants out tonight.', options: [
      { id: 'exfil', label: '🚨 Push for an emergency exfiltration', perf: 8, stress: 10, award: 'distinguished' },
      { id: 'calm', label: '🧊 Calm her down and keep her in place', check: 'smarts', perf: 4, stress: 6 },
    ] },
  ],
};

const POLICY_DECISION = {
  title: 'Major Policy Decision', text: 'You must decide the agency\'s direction on a contentious national issue.',
  options: [
    { id: 'bold', label: '⚡ Bold reform', perf: 8, stability: -6, check: 'smarts' },
    { id: 'incremental', label: '🧱 Incremental, consensus-driven change', perf: 4, stability: 3 },
    { id: 'status', label: '🛑 Preserve the status quo', perf: -2, stability: 1 },
  ],
};

function resolveAgencyOption(ctx, option, title) {
  const { state, rng } = ctx;
  const fed = state.publicService.federal;
  let perf = option.perf ?? 0;
  if (option.check && state.stats[option.check] < 50 + rng.int(-10, 10)) {
    perf = -3;
    ctx.log(`${title}: it didn't go well.`, '😬', 'warn');
  } else if (option.award && rng.chance(0.35)) {
    awardCivil(ctx, option.award, `${title}.`);
  }
  if (option.danger && rng.chance(option.danger)) {
    const dmg = rng.int(10, 25);
    ctx.stat('health', -dmg);
    ctx.log(`You were injured in the line of duty (−${dmg} health).`, '🩹', 'bad');
  }
  if (option.risk && rng.chance(option.risk)) {
    perf -= 10;
    ctx.log('Political retaliation followed: you were reassigned to a basement office.', '🗄️', 'bad');
  }
  if (option.stability) fed.stability = Math.round(clamp(fed.stability + option.stability, 0, 100));
  if (option.stress) ctx.stat('stress', option.stress);
  ctx.emit('career:adjust', { performance: perf, boss: option.boss ?? 0 });
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export const FederalAgencies = {
  id: 'federal',
  order: 24,

  setup(engine) {
    engine.bus.on('career:hired', ({ ctx, job, returning }) => {
      if (isDiplomat(job) && !returning && !job.political) postingPrompt(ctx, 'Welcome to the Foreign Service! Time to bid on your first tour.');
    });
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const fed = state.publicService.federal;
    const year = state.character.birthYear + state.character.age;

    // Political stability: random walk with election-year turbulence.
    const election = year % 4 === 0;
    const downturn = state.economy.phase === 'recession' ? -6 : 0;
    fed.stability = Math.round(clamp(fed.stability + (55 - fed.stability) * 0.1 + downturn + rng.int(election ? -15 : -6, election ? 10 : 6), 0, 100));
    // Shutdowns are a US budget phenomenon; other governments keep running on a provisional budget.
    // ...and a deadlocked budget (divided government, a deficit fight) shuts it down too.
    fed.shutdown = !state.character.countryId && ((fed.stability < 35 && rng.chance(0.55)) || Boolean(state.gov?.budgets?.['national:US']?.shutdown));

    const job = state.career.job;
    if (!job || job.sector !== 'federal') return;

    if (fed.shutdown) {
      ctx.log('A government shutdown furloughed you for five weeks. Back pay arrived eventually, but the mortgage didn\'t wait.', '🏚️', 'warn');
      ctx.stat('stress', 8);
      ctx.stat('happiness', -4);
    }

    // Overseas allowances
    if (job.posting) {
      const allowance = Math.round(job.salary * (job.posting.hardship + job.posting.danger));
      if (allowance) ctx.earn(allowance, `Post differential & danger pay — ${job.posting.city}`, { wage: true });
    }
    if (isDiplomat(job) && !job.political && (job.postingYears ?? 0) >= 3) {
      postingPrompt(ctx, 'Your tour is ending. Bid on your next assignment.');
      return;
    }

    if (job.abilities.includes('policy') && rng.chance(0.5)) {
      ctx.prompt({ type: 'federal.policy', icon: '📜', title: POLICY_DECISION.title, text: `Political stability: ${fed.stability}/100.\n${POLICY_DECISION.text}`, options: POLICY_DECISION.options.map((o) => ({ id: o.id, label: o.label })) });
    } else if (AGENCY_EVENTS[job.professionId] && rng.chance(0.4)) {
      const event = pickFresh(rng, state, `federal.${job.professionId}`, AGENCY_EVENTS[job.professionId]);
      ctx.prompt({
        type: 'federal.event',
        icon: '🦅',
        title: event.title,
        text: `${job.employer.name}${job.posting ? ` · ${job.posting.city}` : ''}\n${event.text}`,
        options: event.options.map((o) => ({ id: o.id, label: o.label, tone: o.danger ? 'danger' : undefined })),
        data: { professionId: job.professionId, eventId: event.id },
      });
    }
  },

  resolvers: {
    posting(ctx, _data, optionId) {
      if (optionId === 'domestic') {
        ctx.emit('career:posting', { posting: null });
        endPosting(ctx, 'You came home for a tour at headquarters.');
        if (!ctx.state.character.countryId || ctx.state.character.countryId === 'US') ctx.emit('region:relocate', { regionId: 'dc', reason: 'You took a domestic tour at Main State.' });
        return;
      }
      const post = POSTS.find((p) => p.city === optionId);
      if (!post) return;
      ctx.emit('career:posting', { posting: { city: post.city, country: post.country, hardship: post.hardship, danger: post.danger, immunity: true, housing: true } });
      // You live there for the tour.
      endPosting(ctx);
      postAbroad(ctx, { place: post.city, country: post.country, kind: 'tour', years: 3 });
      ctx.log(`You were posted to your country's embassy in ${post.city}, ${post.country}. ${post.flavor}`, '🌐', 'milestone');
      if (post.hardship >= 0.25) ctx.emit('career:adjust', { performance: 3, boss: 3 });
    },
    event(ctx, data, optionId) {
      const event = AGENCY_EVENTS[data.professionId].find((e) => e.id === data.eventId);
      const option = event.options.find((o) => o.id === optionId);
      ctx.log(`${event.title}: ${option.label.slice(2).trim()}.`, '🦅');
      resolveAgencyOption(ctx, option, event.title);
    },
    policy(ctx, _data, optionId) {
      const option = POLICY_DECISION.options.find((o) => o.id === optionId);
      ctx.log(`Policy decision: ${option.label.slice(2).trim()}.`, '📜');
      resolveAgencyOption(ctx, option, POLICY_DECISION.title);
    },
  },
};
