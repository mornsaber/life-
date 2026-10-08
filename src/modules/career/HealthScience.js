/**
 * Health and science careers outside the hospital ladder: travel nursing,
 * county public health (health inspectors and epidemiologists) and
 * research science — plus the module that runs flight-crew hazards and the
 * research grant cycle.
 *
 *  - Travel nurses earn a premium for 13-week contracts in a different city
 *    every few months: housing is provided, but home life suffers.
 *  - Flight nurses and flight paramedics fly on medical helicopters: hazard
 *    pay and a small but real risk of a crash.
 *  - Researchers live by grants. Principal investigators apply for funding
 *    (about one proposal in five is funded); go too long without it and the
 *    lab closes. Postdocs get five years to move up or out — and anyone can
 *    be scooped.
 *
 * state.science = { grant: { agency, yearsLeft, amount } | null, papers, unfunded, scooped }
 */
import { L } from './Ladder.js';
import { leaveJob } from './CareerEngine.js';
import { currentLevel } from './Transport.js';
import { JUSTICE_EVENTS, INCIDENT_ICONS } from './JusticeCareers.js';

export const HEALTH_SCIENCE_PROFESSIONS = {
  travelNursing: {
    id: 'travelNursing', name: 'Travel Nursing', icon: '🧳', sector: 'private', payMultiplier: 1.3, minAge: 21, sizes: { medium: 3, large: 2 }, background: 'strict',
    employers: ['Nomad Nurse Staffing', 'Wayfarer Healthcare Partners', 'Meridian Clinical Staffing', 'Compass Travel Health'],
    benefits: { housing: true },
    rotation: { label: 'on 13-week assignments', away: 0.6 },
    entry: { credentials: ['rn'], experience: { professions: ['nursing'], years: 2 } },
    levels: [
      L('travel', 'Travel Nurse', 6, { req: { credentials: ['rn'] } }),
      L('travelIcu', 'Travel ICU Nurse', 7, { track: 'ic', req: { credentials: ['ccrn'] } }),
      L('crisis', 'Crisis & Strike Response Nurse', 8, { track: 'ic' }),
      L('liaison', 'Clinical Liaison', 6, { track: 'mgmt', abilities: ['supervise'], reports: 40 }),
      L('director', 'Director of Clinical Operations', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 400 }),
    ],
  },
  publicHealth: {
    id: 'publicHealth', name: 'County Public Health', icon: '🧫', sector: 'municipal', exam: 'municipal', background: 'standard', payMultiplier: 0.95, minAge: 21,
    union: { chance: 0.5, name: 'AFSCME Public Health Local', strike: false },
    benefits: { pension: 'municipal' },
    employerName: (city) => `${city} County Health Department`,
    entry: { education: { level: 'bachelor' } },
    levels: [
      L('inspector', 'Environmental Health Specialist (Health Inspector)', 4, { abilities: ['inspect'] }),
      L('seniorInspector', 'Senior Health Inspector', 5, { req: { credentials: ['rehs'] }, abilities: ['inspect'] }),
      L('epi', 'Epidemiologist', 6, { track: 'ic', entry: true, req: { education: { program: 'mph' } } }),
      L('seniorEpi', 'Senior Epidemiologist', 7, { track: 'ic', req: { credentials: ['cph'] } }),
      L('supervisor', 'Environmental Health Supervisor', 6, { track: 'mgmt', abilities: ['supervise', 'inspect'], reports: 12 }),
      L('director', 'Director of Public Health', 9, { track: 'mgmt', minSize: 'medium', req: { anyOf: [{ education: { program: 'mph' } }, { education: { program: 'md' } }] }, abilities: ['supervise', 'hire', 'budget', 'delegate', 'policy'], reports: 300 }),
    ],
  },
  research: {
    id: 'research', name: 'Research Science', icon: '🔬', sector: 'private', payMultiplier: 1.0, minAge: 24, sizes: { medium: 2, large: 3, enterprise: 2 }, background: 'standard',
    employers: ['Brightwater Research Institute', 'Helix Biosciences', 'National Laboratory for Applied Physics', 'Coastal Marine Science Center'],
    entry: { education: { program: 'phd' } },
    levels: [
      L('postdoc', 'Postdoctoral Fellow', 5, { years: 3 }),
      L('staff', 'Staff Scientist', 6),
      L('senior', 'Senior Scientist', 7, { track: 'ic' }),
      L('fellow', 'Distinguished Fellow', 9, { track: 'ic', minSize: 'large' }),
      L('pi', 'Principal Investigator', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 12 }),
      L('director', 'Institute Director', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec'], reports: 400 }),
    ],
  },
};

export const POSTDOC_LIMIT = 5;
export const GRANT_ODDS = 0.2;
const AGENCIES = ['NIH R01', 'NSF', 'DOE Office of Science', 'a private foundation', 'DARPA', 'NIH K99/R00'];
/** Levels that live on grants. */
const GRANT_LEVELS = { research: ['pi', 'director', 'senior', 'fellow'], university: ['assistant', 'associate', 'professor', 'distinguished'], college: ['assistant', 'associate', 'professor', 'endowed', 'university'], nationalLab: ['group', 'division', 'senior', 'distinguished'] };

export const HEALTH_EVENTS = {
  publicHealth: [
    { title: 'Restaurant Inspection', text: 'A popular restaurant owned by a city councilman has rodent droppings in the kitchen.', options: [
      { id: 'close', label: '🚫 Close it until it\'s fixed', perf: 6, boss: -4 },
      { id: 'warn', label: '📝 Write it up and reinspect next week', perf: 1 },
    ] },
    { title: 'Outbreak Investigation', text: 'Thirty people with food poisoning after a church picnic.', options: [
      { id: 'trace', label: '🔍 Interview every attendee and trace the source', perf: 8, stress: 5 },
      { id: 'notice', label: '📣 Issue a general advisory', perf: 2 },
    ] },
  ],
  travelNursing: [
    { title: 'New Assignment', text: 'Your agency has three offers: a rural critical-access hospital, a big-city trauma center, or a strike contract at double pay.', options: [
      { id: 'rural', label: '🌾 The rural hospital', perf: 3 },
      { id: 'trauma', label: '🚑 The trauma center', perf: 5, stress: 4 },
      { id: 'strike', label: '💰 The strike contract', perf: 4, boss: 5, stress: 3 },
    ] },
  ],
  research: [
    { title: 'Promising Result', text: 'Your experiment produced a striking result — but you\'ve only replicated it once.', options: [
      { id: 'replicate', label: '🔁 Replicate it properly first', perf: 3 },
      { id: 'publish', label: '📰 Rush it to a top journal', perf: 6, risk: 0 },
    ] },
  ],
};

Object.assign(JUSTICE_EVENTS, HEALTH_EVENTS);
for (const [id, p] of Object.entries(HEALTH_SCIENCE_PROFESSIONS)) INCIDENT_ICONS[id] = p.icon;

function airMedicalTick(ctx, job) {
  const { rng } = ctx;
  ctx.earn(6000, 'Flight crew hazard differential', { wage: true });
  ctx.stat('stress', 2);
  if (rng.chance(0.4)) ctx.log(rng.pick(['A night scene flight to a rollover on the interstate.', 'You flew a premature baby 200 miles to the NICU.', 'Icing forced your helicopter down in a farm field; you finished the transport by ambulance.']), '🚁');
  if (rng.chance(0.003)) {
    if (rng.chance(0.5)) {
      ctx.log('Your medical helicopter went down in fog on the way to a scene.', '🕯️', 'death');
      ctx.die('Medical helicopter crash');
      return;
    }
    ctx.stat('health', -rng.int(20, 40));
    ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(40, 70) });
    ctx.log('Your helicopter crashed on approach. You survived — the pilot pulled you from the wreck.', '🚁', 'bad');
    job.performance = Math.max(0, job.performance - 10);
  }
}

function researchTick(ctx, job) {
  const { state, rng } = ctx;
  const sci = state.science;
  // Publications.
  const papers = rng.chance(0.3 + state.stats.smarts / 300 + job.performance / 400) ? rng.int(1, 3) : 0;
  sci.papers += papers;
  // Getting scooped.
  if (rng.chance(0.08) && !state.prompts.some((p) => p.type === 'healthScience.scooped')) {
    ctx.prompt({
      type: 'healthScience.scooped', icon: '😱', title: 'Scooped?',
      text: 'A rival lab just posted a preprint that looks a lot like the project you\'ve spent two years on.',
      options: [
        { id: 'rush', label: '🏃 Post your own preprint this week', hint: 'Partial credit; a rushed paper' },
        { id: 'pivot', label: '🔄 Pivot to a new angle', hint: 'A year lost, but a better paper' },
        { id: 'collab', label: '🤝 Email them and propose joint publication', hint: 'Smarts and luck' },
      ],
    });
  }
  // Postdoc term limit.
  if (job.levelId === 'postdoc' && job.yearsInLevel >= POSTDOC_LIMIT) {
    leaveJob(ctx, `Your postdoc hit the ${POSTDOC_LIMIT}-year limit without a permanent position`);
    ctx.log('Like most postdocs, you aged out of the academic pipeline.', '🧪', 'warn');
    return;
  }
  // Grants.
  if (!(GRANT_LEVELS[job.professionId] ?? []).includes(job.levelId)) return;
  if (sci.grant) {
    sci.grant.yearsLeft -= 1;
    job.performance = Math.min(100, job.performance + 3);
    if (sci.grant.yearsLeft <= 0) {
      ctx.log(`Your ${sci.grant.agency} grant ended. Time to renew.`, '📄');
      sci.grant = null;
    }
    return;
  }
  sci.unfunded += 1;
  if (!state.prompts.some((p) => p.type === 'healthScience.grant')) {
    ctx.prompt({
      type: 'healthScience.grant', icon: '📄', title: 'Grant Deadline',
      text: `${sci.unfunded > 1 ? `Your lab has gone ${sci.unfunded} years without major funding. ` : ''}A funding cycle is closing. About one proposal in five gets funded.`,
      options: [
        { id: 'big', label: '🏛️ Write a major proposal (NIH/NSF)', hint: `≈${Math.round(grantOdds(state, 'big') * 100)}% · 5 years of funding` },
        { id: 'small', label: '📝 Apply for a small foundation grant', hint: `≈${Math.round(grantOdds(state, 'small') * 100)}% · 2 years` },
        { id: 'skip', label: '⏭️ Skip this cycle' },
      ],
    });
  }
  if (sci.unfunded >= 3 && job.professionId === 'research') {
    leaveJob(ctx, 'Your lab ran out of grant money and closed', { fired: true });
    sci.unfunded = 0;
  }
}

export function grantOdds(state, size) {
  const base = size === 'big' ? GRANT_ODDS : 0.4;
  return Math.max(0.05, Math.min(0.6, base + (state.stats.smarts - 70) / 250 + Math.min(0.15, state.science.papers / 100)));
}

export const HealthScienceModule = {
  id: 'healthScience',
  order: 30.9,

  init(state) {
    state.science ??= { grant: null, papers: 0, unfunded: 0, scooped: 0 };
  },

  onAgeUp(ctx) {
    const job = ctx.state.career.job;
    if (!job?.paidThisYear || ctx.state.legal.incarceration) return;
    const level = currentLevel(job);
    if (level?.airMedical) airMedicalTick(ctx, job);
    if (!ctx.state.character.alive) return;
    if (['research', 'nationalLab'].includes(job.professionId) || (['university', 'college'].includes(job.professionId) && !['adjunct', 'lecturer'].includes(job.levelId))) researchTick(ctx, job);
  },

  resolvers: {
    grant(ctx, _data, optionId) {
      const { state, rng } = ctx;
      if (optionId === 'skip') return ctx.log('You sat out the funding cycle.', '⏭️');
      const job = state.career.job;
      ctx.stat('stress', optionId === 'big' ? 8 : 4);
      if (rng.chance(grantOdds(state, optionId))) {
        const amount = optionId === 'big' ? rng.int(250, 500) * 1000 : rng.int(50, 150) * 1000;
        state.science.grant = { agency: optionId === 'big' ? rng.pick(AGENCIES) : 'a private foundation', yearsLeft: optionId === 'big' ? 5 : 2, amount };
        state.science.unfunded = 0;
        if (job) job.performance = Math.min(100, job.performance + 10);
        ctx.log(`Funded! ${state.science.grant.agency} awarded your lab $${amount.toLocaleString()} a year.`, '🎉', 'good');
        ctx.stat('happiness', 8);
      } else {
        ctx.log('The study section scored your proposal just outside the payline. Not funded.', '📭', 'warn');
        ctx.stat('happiness', -4);
      }
    },
    scooped(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      state.science.scooped += 1;
      if (optionId === 'rush') {
        state.science.papers += 1;
        if (job) job.performance = Math.max(0, job.performance - 3);
        return ctx.log('You posted a rushed preprint. Reviewers called it "concurrent work." Partial credit.', '📰');
      }
      if (optionId === 'pivot') {
        if (job) job.performance = Math.max(0, job.performance - 6);
        return ctx.log('You pivoted. A year lost — but the new angle is better.', '🔄');
      }
      if (rng.chance(0.3 + state.stats.smarts / 300)) {
        state.science.papers += 2;
        return ctx.log('They agreed: a joint paper in a top journal, with you as co-first author.', '🤝', 'good');
      }
      if (job) job.performance = Math.max(0, job.performance - 8);
      ctx.log('They never replied. Their paper came out first.', '😱', 'bad');
    },
  },
};
