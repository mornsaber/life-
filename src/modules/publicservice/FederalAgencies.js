/**
 * Federal service: agencies, political stability, shutdowns and furloughs,
 * bureaucratic event popups, senior policy decisions, Foreign Service
 * postings (hardship/danger pay, embassy housing, diplomatic immunity) and
 * National Park Service duty stations (rural, housing provided).
 *
 * state.publicService.federal = { stability: 0–100, shutdown: bool }
 */
import { L } from '../career/Ladder.js';
import { addHonor } from '../../core/State.js';
import { clamp } from '../../core/Random.js';

const FED = { sizes: { large: 1, enterprise: 1 } };

export const FEDERAL_PROFESSIONS = {
  regulatory: {
    ...FED, id: 'regulatory', name: 'Federal Regulatory Agency', icon: '📊', sector: 'federal', payMultiplier: 1.0, minAge: 21, background: 'strict', exam: 'federal',
    union: { chance: 0.4, name: 'National Treasury Employees Union', strike: false },
    employers: ['Office of the Comptroller of the Currency', 'Securities and Exchange Commission', 'Environmental Protection Agency', 'Federal Trade Commission'],
    entry: { education: { level: 'bachelor' } },
    valued: ['cpa', 'cgfm'],
    levels: [
      L('trainee', 'Examiner Trainee', 3, { req: { clearance: 'publicTrust' }, abilities: ['inspect'] }),
      L('examiner', 'Regulatory Examiner', 4, { req: { clearance: 'publicTrust' }, abilities: ['inspect', 'audit'] }),
      L('senior', 'Senior Examiner', 5, { abilities: ['inspect', 'audit'] }),
      L('commissioned', 'Commissioned Examiner', 6, { track: 'ic', abilities: ['inspect', 'audit', 'sign'] }),
      L('expert', 'Senior Policy Expert', 7, { track: 'ic', minSize: 'enterprise', abilities: ['audit', 'policy'] }),
      L('supervisory', 'Supervisory Examiner', 6, { track: 'mgmt', abilities: ['supervise', 'inspect', 'sign'], reports: 8 }),
      L('branchChief', 'Branch Chief', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 30 }),
      L('deputy', 'Deputy Administrator', 8, { track: 'mgmt', req: { clearance: 'secret' }, abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 400 }),
      L('administrator', 'Department Administrator', 9, { track: 'mgmt', minSize: 'enterprise', req: { clearance: 'secret' }, abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 3000 }),
    ],
  },
  foreignService: {
    ...FED, id: 'foreignService', name: 'U.S. Foreign Service', icon: '🌐', sector: 'federal', payMultiplier: 1.0, minAge: 21, background: 'strict', exam: 'foreignService',
    benefits: { pension: 'fersSpecial' },
    employers: ['U.S. Department of State'],
    entry: { education: { level: 'bachelor' } },
    valued: ['languageProficiency'],
    postings: true,
    levels: [
      L('fs6', 'Foreign Service Officer (FS-6)', 4, { req: { clearance: 'topSecret' }, abilities: ['diplomatic', 'classified'] }),
      L('fs4', 'Second Secretary (FS-4)', 5, { abilities: ['diplomatic', 'classified'] }),
      L('fs3', 'First Secretary (FS-3)', 6, { abilities: ['diplomatic', 'classified', 'sign'] }),
      L('fs2', 'Political Counselor (FS-2)', 7, { track: 'ic', req: { credentials: ['languageProficiency'] }, abilities: ['diplomatic', 'classified', 'policy'] }),
      L('fs1', 'Minister-Counselor (FS-1)', 8, { track: 'ic', abilities: ['diplomatic', 'classified', 'policy'] }),
      L('consul', 'Consul General', 7, { track: 'mgmt', abilities: ['diplomatic', 'classified', 'supervise', 'sign'], reports: 25 }),
      L('dcm', 'Deputy Chief of Mission', 8, { track: 'mgmt', abilities: ['diplomatic', 'classified', 'supervise', 'budget', 'delegate'], reports: 150 }),
      L('ambassador', 'Ambassador', 9, { track: 'mgmt', abilities: ['diplomatic', 'classified', 'supervise', 'budget', 'delegate', 'exec', 'policy'], reports: 400 }),
    ],
  },
  oig: {
    ...FED, id: 'oig', name: 'Office of Inspector General', icon: '🔍', sector: 'federal', payMultiplier: 1.0, minAge: 21, background: 'strict', exam: 'federal',
    employers: ['Department of Defense OIG', 'Department of Health & Human Services OIG', 'Department of Homeland Security OIG'],
    entry: { education: { level: 'bachelor' } },
    valued: ['cpa', 'cissp', 'cgfm'],
    levels: [
      L('auditor', 'Auditor', 4, { req: { clearance: 'secret' }, abilities: ['audit', 'classified'] }),
      L('senior', 'Senior Auditor', 5, { abilities: ['audit', 'classified'] }),
      L('investigator', 'Criminal Investigator', 5, { track: 'ic', req: { credentials: ['fletc'] }, abilities: ['audit', 'arrest', 'classified'] }),
      L('specialAgent', 'Senior Special Agent', 6, { track: 'ic', abilities: ['audit', 'arrest', 'classified'] }),
      L('supervisory', 'Supervisory Auditor', 6, { track: 'mgmt', abilities: ['audit', 'supervise', 'classified'], reports: 10 }),
      L('aig', 'Assistant Inspector General', 8, { track: 'mgmt', req: { clearance: 'topSecret' }, abilities: ['audit', 'supervise', 'budget', 'delegate', 'policy', 'classified'], reports: 150 }),
      L('ig', 'Inspector General', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['audit', 'supervise', 'budget', 'delegate', 'exec', 'policy', 'classified'], reports: 1500 }),
    ],
  },
  parkService: {
    ...FED, id: 'parkService', name: 'National Park Service', icon: '🌲', sector: 'federal', payMultiplier: 0.92, minAge: 18, background: 'standard', exam: 'federal',
    benefits: { housing: true },
    dutyStation: 'rural',
    employers: ['Glacier National Park', 'Yellowstone National Park', 'Olympic National Park', 'Rocky Mountain National Park'],
    entry: {},
    valued: ['wfr', 'landNav', 'ropeRescue', 'swiftwater', 'emt'],
    levels: [
      L('seasonal', 'Seasonal Park Ranger', 2),
      L('ranger', 'Park Ranger', 4, { entry: true, req: { education: { level: 'bachelor' } } }),
      L('interp', 'Lead Interpretive Ranger', 5, { track: 'ic' }),
      L('leRanger', 'Law Enforcement Ranger', 5, { track: 'ic', req: { credentials: ['fletc'] }, abilities: ['arrest'] }),
      L('isb', 'Special Agent (ISB)', 6, { track: 'ic', abilities: ['arrest', 'audit'] }),
      L('district', 'District Ranger', 6, { track: 'mgmt', abilities: ['supervise', 'command'], reports: 15 }),
      L('chief', 'Chief Ranger', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'command'], reports: 50 }),
      L('superintendent', 'Park Superintendent', 8, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 300 }),
    ],
  },
  intelligence: {
    ...FED, id: 'intelligence', name: 'Civil Intelligence Agency', icon: '🛰️', sector: 'federal', payMultiplier: 1.05, minAge: 21, background: 'strict', exam: 'federal',
    employers: ['Office of the Director of National Intelligence', 'Bureau of Intelligence and Research', 'National Counterterrorism Center'],
    entry: { education: { level: 'bachelor' }, smarts: 55 },
    valued: ['languageProficiency', 'cissp', 'awsCert'],
    levels: [
      L('analyst', 'Intelligence Analyst', 5, { req: { clearance: 'topSecret' }, abilities: ['classified'] }),
      L('senior', 'Senior Analyst', 6, { abilities: ['classified'] }),
      L('sio', 'Senior Intelligence Officer', 7, { track: 'ic', abilities: ['classified', 'policy'] }),
      L('nio', 'National Intelligence Officer', 8, { track: 'ic', minSize: 'enterprise', abilities: ['classified', 'policy'] }),
      L('branchChief', 'Branch Chief', 7, { track: 'mgmt', abilities: ['classified', 'supervise', 'hire'], reports: 12 }),
      L('divisionChief', 'Division Chief', 8, { track: 'mgmt', abilities: ['classified', 'supervise', 'budget', 'delegate'], reports: 90 }),
      L('deputyDirector', 'Deputy Director', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['classified', 'supervise', 'budget', 'delegate', 'exec', 'policy'], reports: 1200 }),
    ],
  },
};

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

function postingPrompt(ctx, reason) {
  const choices = ctx.rng.shuffle(POSTS).slice(0, 3);
  ctx.prompt({
    type: 'federal.posting',
    icon: '🌐',
    title: 'Foreign Service Bid List',
    text: `${reason}\nHardship and danger posts pay differentials and earn promotion credit; embassy housing is provided overseas, and you'll carry diplomatic immunity.`,
    options: [
      ...choices.map((p) => ({ id: p.city, label: `${p.flavor} ${p.city}, ${p.country}`, hint: p.hardship || p.danger ? `+${Math.round(p.hardship * 100)}% hardship${p.danger ? ` · +${Math.round(p.danger * 100)}% danger` : ''}` : 'Comfortable post', tone: p.danger ? 'danger' : undefined })),
      { id: 'domestic', label: '🏛️ Domestic tour in Washington, D.C.', hint: 'No immunity, no differentials' },
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

const AGENCY_EVENTS = {
  regulatory: [
    { id: 'hearing', title: 'Congressional Hearing', text: 'You\'ve been called to testify before a House oversight subcommittee about a bank failure your team examined.', options: [
      { id: 'prepare', label: '📚 Prepare exhaustively and testify candidly', check: 'smarts', perf: 8, award: 'superiorHonor', stability: 2 },
      { id: 'script', label: '📄 Stick to the agency talking points', perf: 2, boss: 4 },
    ] },
    { id: 'reorg', title: 'Agency Reorganization', text: 'Leadership is merging two divisions and asking for volunteers to stand up the new office.', options: [
      { id: 'volunteer', label: '🙋 Volunteer to build the new office', perf: 6, stress: 8, boss: 4 },
      { id: 'stay', label: '🪑 Stay where you are', perf: 0 },
    ] },
  ],
  foreignService: [
    { id: 'evacuation', title: 'Embassy Evacuation', text: 'Unrest is spreading through the capital. Hundreds of American citizens need to get out before the airport closes.', options: [
      { id: 'stay', label: '🛂 Stay behind to run the evacuation', perf: 10, danger: 0.2, award: 'heroism' },
      { id: 'leave', label: '✈️ Leave on the first flight with non-essential staff', perf: -4 },
    ] },
    { id: 'demarche', title: 'Delivering a Démarche', text: 'You must deliver a stern diplomatic protest to a hostile foreign ministry.', options: [
      { id: 'firm', label: '🧊 Firm, precise and by the book', check: 'smarts', perf: 6 },
      { id: 'improvise', label: '🎭 Soften it to preserve the relationship', perf: -2, boss: -6, stability: 1 },
    ] },
  ],
  oig: [
    { id: 'appointee', title: 'Investigating an Appointee', text: 'Your audit points to a politically connected appointee steering contracts to a donor.', options: [
      { id: 'pursue', label: '🔍 Pursue it to the end', perf: 8, stability: -4, boss: -4, award: 'distinguished', risk: 0.3 },
      { id: 'close', label: '📁 Close it as "insufficient evidence"', perf: -6, boss: 6 },
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
  ],
  intelligence: [
    { id: 'dissent', title: 'Analytic Dissent', text: 'Senior leadership wants your assessment rewritten to support a policy they\'ve already announced.', options: [
      { id: 'stand', label: '📑 Stand by your analysis', perf: 2, boss: -10, award: 'superiorHonor', stability: 2 },
      { id: 'rewrite', label: '✏️ Soften the conclusions', perf: 0, boss: 8, stability: -4 },
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
    engine.bus.on('career:hired', ({ ctx, job }) => {
      if (job.professionId === 'foreignService') postingPrompt(ctx, 'Welcome to the Foreign Service! Time to bid on your first tour.');
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
    fed.shutdown = fed.stability < 35 && rng.chance(0.55);

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
    if (job.professionId === 'foreignService' && (job.postingYears ?? 0) >= 3) {
      postingPrompt(ctx, 'Your tour is ending. Bid on your next assignment.');
      return;
    }

    if (job.abilities.includes('policy') && rng.chance(0.5)) {
      ctx.prompt({ type: 'federal.policy', icon: '📜', title: POLICY_DECISION.title, text: `Political stability: ${fed.stability}/100.\n${POLICY_DECISION.text}`, options: POLICY_DECISION.options.map((o) => ({ id: o.id, label: o.label })) });
    } else if (AGENCY_EVENTS[job.professionId] && rng.chance(0.4)) {
      const event = rng.pick(AGENCY_EVENTS[job.professionId]);
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
        ctx.emit('region:relocate', { regionId: 'dc', reason: 'You took a domestic tour at Main State.' });
        return;
      }
      const post = POSTS.find((p) => p.city === optionId);
      ctx.emit('career:posting', { posting: { city: post.city, country: post.country, hardship: post.hardship, danger: post.danger, immunity: true, housing: true } });
      ctx.log(`You were posted to the U.S. Embassy in ${post.city}, ${post.country}. ${post.flavor}`, '🌐', 'milestone');
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
