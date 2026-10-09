/**
 * The job market for people who already have a career: headhunters, a
 * yearly search that turns up competing offers in your own field (switching
 * companies without changing careers), counteroffers, remote/hybrid/on-site
 * trade-offs, return-to-office mandates and non-compete agreements.
 *
 * job.workMode: 'onsite' | 'hybrid' | 'remote'  (job.remote mirrors 'remote')
 * job.nonCompete: { years } — signed with this employer
 * state.career.nonCompete: { professionId, untilAge, employer, stateId } — binding you after you leave
 */
import { clamp } from '../../core/Random.js';
import { lawValue } from '../politics/Laws.js';
import { yearlyCount, bumpYearly, prestige } from '../../core/State.js';
import { getProfession } from './JobTrees.js';
import { levelById, nextLevels } from './Ladder.js';
import { createEmployer } from './Employers.js';
import { hire, stepForAtLeast, levelCheck } from './CareerEngine.js';
import { recalcSalary } from './Compensation.js';
import { candidateScore } from '../org/Vacancies.js';
import { RANK_SECTORS, lateralEntryLevel, lateralStep, previewPay, execRecruiterTick } from './SeniorMoves.js';

export const WORK_MODES = {
  onsite: { label: 'On-site', icon: '🏢', desc: 'Full commute; best visibility for promotions.' },
  hybrid: { label: 'Hybrid', icon: '🔀', desc: 'Three days in; some of both worlds.' },
  remote: { label: 'Remote', icon: '🏠', desc: 'No commute, live anywhere — but out of sight, out of mind.' },
};
/** States that refuse to enforce employee non-competes (the 2024 FTC ban was struck down). */
export const NONCOMPETE_BANS = ['CA', 'MN', 'ND', 'OK'];

const canGoRemote = (profession) => Boolean(profession.remote);
const canGoHybrid = (profession, employer) => canGoRemote(profession) || (profession.sector === 'private' && ['large', 'enterprise'].includes(employer.size) && !['retail', 'culinary', 'trades', 'plumbing', 'trucking', 'cosmetology', 'hospitality', 'medical', 'nursing'].includes(profession.id));

export const workModeOf = (job) => job?.workMode ?? (job?.remote ? 'remote' : 'onsite');

/** A competing offer in your current field. */
export function makeOffer(ctx, { raise = [0.08, 0.22], headhunter = false } = {}) {
  const { state, rng } = ctx;
  const job = state.career.job;
  const profession = getProfession(job.professionId);
  const employer = createEmployer(rng, state, profession, state.character.regionId);
  // Police, fire and other ranked public jobs: a lateral comes in at the working rank with pay steps for experience.
  if (RANK_SECTORS.includes(profession.sector)) {
    const level = lateralEntryLevel(state, profession, employer.size) ?? levelById(profession, job.levelId);
    const step = lateralStep(state, profession) ?? 1;
    const salary = previewPay(state, { professionId: profession.id, levelId: level.id, employer, step });
    return { professionId: job.professionId, levelId: level.id, title: level.title, employer, salary, workMode: 'onsite', nonCompete: 0, signing: 0, step, lateral: level.id !== job.levelId };
  }
  // Sometimes the new title is a step up.
  const up = nextLevels(profession, employer.size, job.levelId).filter((l) => !l.appointed && levelCheck(state, l).ok && !levelCheck(state, l).clearanceNeeded);
  // Outside hiring for a step up weighs your record: performance, references, tenure, credentials.
  const record = clamp(candidateScore(state, job) / 55, 0.5, 1.5);
  const level = up.length && rng.chance((headhunter ? 0.45 : 0.25) * record) ? rng.pick(up) : levelById(profession, job.levelId) ?? profession.levels[0];
  const modes = ['onsite', ...(canGoHybrid(profession, employer) ? ['hybrid'] : []), ...(canGoRemote(profession) ? ['remote'] : [])];
  const workMode = rng.pick(modes);
  const salary = Math.round(job.salary * (1 + rng.float(...raise)) * (workMode === 'remote' ? 0.95 : 1));
  const nonCompete = profession.sector === 'private' && rng.chance(['tech', 'finance', 'corporate', 'medical', 'insurance', 'realestate'].includes(profession.id) ? 0.45 : 0.15) ? rng.int(1, 2) : 0;
  const signing = profession.sector === 'private' && rng.chance(headhunter ? 0.6 : 0.3) ? Math.round(salary * rng.float(0.05, 0.15) / 1000) * 1000 : 0;
  return { professionId: job.professionId, levelId: level.id, title: level.title, employer, salary, workMode, nonCompete, signing };
}

export const offerSummary = (o) => `${o.employer.name} (${o.employer.size}) · ${o.title}${o.lateral ? ' (lateral: rank is earned again there)' : ''}${o.step ? ` · step ${o.step}` : ''} · $${o.salary.toLocaleString()}/yr · ${WORK_MODES[o.workMode].icon} ${WORK_MODES[o.workMode].label}${o.signing ? ` · $${o.signing.toLocaleString()} signing bonus` : ''}${o.employer.benefits.health ? '' : ' · no health plan'}${o.employer.benefits.match ? ` · ${Math.round(o.employer.benefits.match * 100)}% 401(k) match` : ' · no 401(k) match'}${o.nonCompete ? ` · ${o.nonCompete}-yr non-compete` : ''}`;

/** Take an offer: a new employer in the same field (resigning the old job). */
export function acceptOffer(ctx, offer) {
  const { state } = ctx;
  if (state.legal.incarceration) return ctx.log(`${offer.employer.name} withdrew its offer.`, '📭', 'bad');
  const job = hire(ctx, { professionId: offer.professionId, levelId: offer.levelId, employer: offer.employer });
  if (!job) return undefined;
  if (offer.step) job.step = offer.step;
  else stepForAtLeast(state, job, offer.salary);
  recalcSalary(state, job);
  job.workMode = offer.workMode;
  job.remote = offer.workMode === 'remote';
  if (offer.nonCompete) job.nonCompete = { years: offer.nonCompete };
  if (offer.signing) ctx.earn(offer.signing, 'Signing bonus', { wage: true });
  // An old non-compete is checked by the career:hired listener.
}

/** Starting a competing job while an old non-compete still binds you. */
function nonCompeteCheck(ctx) {
  const { state, rng } = ctx;
  const nc = state.career.nonCompete;
  const job = state.career.job;
  if (!nc || !job || nc.professionId !== job.professionId || state.character.age >= nc.untilAge) return;
  if (lawValue(state, 'nonCompeteBan', nc.stateId) || lawValue(state, 'nonCompeteBan', job.employer.stateId)) {
    ctx.log(`${nc.employer} grumbled about your non-compete, but courts here won't enforce it.`, '📜');
    state.career.nonCompete = null;
    return;
  }
  if (!rng.chance(0.4)) return;
  ctx.prompt({
    type: 'jobMarket.nonCompete', icon: '⚖️', title: 'Sued Over Your Non-Compete',
    text: `${nc.employer} filed suit to stop you working for ${job.employer.name} until you're ${nc.untilAge}.`,
    options: [
      { id: 'fight', label: '⚖️ Fight it in court', hint: '≈$25,000 in legal fees; judges often narrow these' },
      { id: 'settle', label: '🤝 Have your new employer settle', hint: 'They may pay it — or let you go' },
      { id: 'resign', label: '🚪 Resign from the new job' },
    ],
    data: {},
  });
}

function headhunterTick(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  if (!job || job.sector !== 'private' || job.probationLeft > 0 || state.prompts.some((p) => p.type === 'jobMarket.headhunter')) return;
  const odds = clamp(0.02 + (job.performance - 60) / 400 + job.grade * 0.008 + prestige(state) / 4000 - (state.economy.phase === 'recession' ? 0.04 : 0), 0, 0.25);
  if (!rng.chance(odds)) return;
  const offer = makeOffer(ctx, { raise: [0.12, 0.3], headhunter: true });
  ctx.prompt({
    type: 'jobMarket.headhunter', icon: '📞', title: 'A Recruiter Calls',
    text: `A headhunter wants you: ${offerSummary(offer)}.`,
    options: [
      { id: 'accept', label: '✅ Take it' },
      { id: 'counter', label: `🃏 Take it to your boss for a counteroffer`, hint: 'They may match — and remember you shopped around' },
      { id: 'decline', label: '🙅 Not interested' },
    ],
    data: { offer },
  });
}

/** Remote and hybrid work: calmer days, slower careers; companies may call people back. */
function workModeTick(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  if (!job) return;
  const mode = workModeOf(job);
  if (mode === 'onsite') return;
  ctx.stat('stress', mode === 'remote' ? -3 : -1);
  ctx.stat('happiness', 1);
  if (mode === 'remote') {
    job.boss = Math.max(0, job.boss - 1);
    job.coworkers = Math.max(0, job.coworkers - 2);
  }
  // Return-to-office mandates.
  if (rng.chance(mode === 'remote' ? 0.06 : 0.03) && !state.prompts.some((p) => p.type === 'jobMarket.rto')) {
    ctx.prompt({
      type: 'jobMarket.rto', icon: '🏢', title: 'Return-to-Office Mandate',
      text: `${job.employer.name} announced everyone is back in the office ${mode === 'remote' ? 'at least three days a week' : 'five days a week'}.`,
      options: [{ id: 'comply', label: '🏢 Go back in' }, { id: 'quit', label: '🚪 Quit instead' }, { id: 'ignore', label: '🙈 Keep working from home', hint: 'Some get away with it; some get fired', tone: 'danger' }],
      data: {},
    });
  }
}

export const JobMarket = {
  id: 'jobMarket',
  order: 32,

  setup(engine) {
    // A non-compete follows you out the door.
    engine.bus.on('career:separated', ({ ctx, job }) => {
      if (job.nonCompete) ctx.state.career.nonCompete = { professionId: job.professionId, untilAge: ctx.state.character.age + job.nonCompete.years, employer: job.employer.name, stateId: job.employer.stateId };
    });
    engine.bus.on('career:hired', ({ ctx, job }) => {
      job.workMode ??= job.remote ? 'remote' : 'onsite';
      // Applying through the job board into your old field still trips an old non-compete.
      if (ctx.state.career.nonCompete?.professionId === job.professionId) nonCompeteCheck(ctx);
    });
  },

  onAgeUp(ctx) {
    const { state } = ctx;
    if (state.career.nonCompete && state.character.age >= state.career.nonCompete.untilAge) state.career.nonCompete = null;
    headhunterTick(ctx);
    execRecruiterTick(ctx);
    workModeTick(ctx);
  },

  actions: {
    /** Look for a new employer in your current field: up to three offers to weigh. */
    search(ctx) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!job) return ctx.toast('Use the job board to find a job.', 'warn');
      if (yearlyCount(state, 'jobMarket.search')) return ctx.toast('You already shopped around this year.', 'warn');
      bumpYearly(state, 'jobMarket.search');
      const odds = clamp(0.35 + (job.performance - 50) / 150 + (state.stats.smarts - 50) / 300 - (state.economy.unemployment - 0.045) * 4, 0.1, 0.9);
      const offers = [0, 1, 2].filter(() => rng.chance(odds)).map(() => makeOffer(ctx));
      if (!offers.length) {
        ctx.log('You sent out résumés and took calls. Nothing came of it this year.', '📭', 'warn');
        return;
      }
      ctx.prompt({
        type: 'jobMarket.offers', icon: '📨', title: `${offers.length} Offer${offers.length > 1 ? 's' : ''} on the Table`,
        text: `You're ${job.title} at ${job.employer.name} ($${job.salary.toLocaleString()}/yr, ${WORK_MODES[workModeOf(job)].label.toLowerCase()}).\n${offers.map((o, i) => `${i + 1}. ${offerSummary(o)}`).join('\n')}`,
        options: [...offers.map((o, i) => ({ id: String(i), label: `${i + 1}. Join ${o.employer.name}`, hint: `$${o.salary.toLocaleString()} · ${WORK_MODES[o.workMode].label}` })), { id: 'counter', label: '🃏 Use the best offer to ask for a raise' }, { id: 'stay', label: '🏠 Stay where you are' }],
        data: { offers },
      });
    },
    /** arg: onsite | hybrid | remote */
    workMode(ctx, mode) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!job || !WORK_MODES[mode] || workModeOf(job) === mode) return;
      const profession = getProfession(job.professionId);
      if (mode === 'remote' && !canGoRemote(profession)) return ctx.toast('This job can\'t be done remotely.', 'warn');
      if (mode === 'hybrid' && !canGoHybrid(profession, job.employer)) return ctx.toast(`${job.employer.name} doesn't do hybrid for this role.`, 'warn');
      if (yearlyCount(state, 'jobMarket.mode')) return ctx.toast('You already asked this year.', 'warn');
      bumpYearly(state, 'jobMarket.mode');
      if (mode !== 'onsite' && !rng.chance(clamp(0.3 + (job.performance - 50) / 100 + (job.boss - 50) / 200, 0.1, 0.85))) return ctx.log(`Your request to go ${WORK_MODES[mode].label.toLowerCase()} was denied.`, '🙅', 'warn');
      job.workMode = mode;
      job.remote = mode === 'remote';
      ctx.log(`You're now working ${WORK_MODES[mode].label.toLowerCase()}.`, WORK_MODES[mode].icon, 'good');
    },
  },

  resolvers: {
    offers(ctx, data, optionId) {
      if (optionId === 'stay') return ctx.log('You stayed put.', '🏠');
      if (optionId === 'counter') {
        const best = [...data.offers].sort((a, b) => b.salary - a.salary)[0];
        return counter(ctx, best);
      }
      const offer = data.offers[Number(optionId)];
      if (offer) acceptOffer(ctx, offer);
    },
    headhunter(ctx, data, optionId) {
      if (optionId === 'accept') return acceptOffer(ctx, data.offer);
      if (optionId === 'counter') return counter(ctx, data.offer);
      ctx.log('You told the recruiter you\'re happy where you are.', '📞');
    },
    nonCompete(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (optionId === 'resign') {
        ctx.emit('career:resign', { reason: 'Resigned over a non-compete lawsuit' });
        state.career.nonCompete = null;
        return;
      }
      if (optionId === 'settle') {
        if (rng.chance(0.55)) {
          ctx.log(`${job?.employer.name ?? 'Your new employer'} paid to settle the non-compete. You're free.`, '🤝', 'good');
          state.career.nonCompete = null;
        } else {
          ctx.log(`${job?.employer.name ?? 'Your new employer'} decided you weren't worth the fight and let you go.`, '📦', 'bad');
          ctx.emit('career:resign', { reason: 'Let go over a non-compete dispute', fired: true });
        }
        return;
      }
      ctx.spend(25000, 'Attorney — non-compete defense', { allowDebt: true });
      if (rng.chance(0.55)) {
        ctx.log('The judge found the non-compete overbroad and refused to enforce it.', '⚖️', 'good');
        state.career.nonCompete = null;
      } else {
        ctx.log('The court enforced your non-compete. You had to leave the new job.', '⚖️', 'bad');
        ctx.emit('career:resign', { reason: 'Court enforced a non-compete', fired: true });
      }
    },
    rto(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!job) return;
      if (optionId === 'comply') {
        job.workMode = workModeOf(job) === 'remote' ? 'hybrid' : 'onsite';
        job.remote = false;
        ctx.stat('stress', 5);
        return ctx.log('You dusted off your commute.', '🚗');
      }
      if (optionId === 'quit') return ctx.emit('career:resign', { reason: 'Quit over a return-to-office mandate' });
      if (rng.chance(0.35)) return ctx.emit('career:resign', { reason: 'Fired for ignoring the return-to-office mandate', fired: true });
      job.boss = Math.max(0, job.boss - 10);
      ctx.log('Nobody enforced it — yet. Your boss noticed.', '🙈', 'warn');
    },
  },
};

/** Ask your employer to match. Matches come with a cost: you're a flight risk now. */
function counter(ctx, offer) {
  const { state, rng } = ctx;
  const job = state.career.job;
  if (!job) return;
  const odds = clamp(0.35 + (job.performance - 60) / 100 + (job.boss - 50) / 200, 0.1, 0.8);
  if (job.sector === 'private' && rng.chance(odds)) {
    stepForAtLeast(state, job, offer.salary);
    recalcSalary(state, job);
    job.boss = Math.max(0, job.boss - 6);
    ctx.log(`${job.employer.name} matched: $${job.salary.toLocaleString()}/yr. Your boss shook your hand a little too firmly.`, '🃏', 'good');
    return;
  }
  ctx.log(`${job.employer.name} wouldn't match.`, '🃏', 'warn');
  ctx.prompt({
    type: 'jobMarket.headhunter', icon: '📞', title: 'The Offer Still Stands',
    text: `${offerSummary(offer)}.`,
    options: [{ id: 'accept', label: '✅ Take it' }, { id: 'decline', label: '🙅 Stay anyway' }],
    data: { offer },
  });
}
