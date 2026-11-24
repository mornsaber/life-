/**
 * How promotion actually happens, beyond the review with your boss.
 *
 *   Calibration      at organizations of any size above a handful, managers rank everyone at a
 *                    level against each other each year, onto a curve. Your record counts, and so
 *                    do your boss, your mentor's word, a finished signature project and being at
 *                    head office. Top of the curve helps your next promotion case; the bottom
 *                    twice in a row starts an improvement plan.
 *   Improvement plan accept it and turn things round in a year (or be dismissed), negotiate an
 *                    exit with a settlement, or (with a union or in public service) file a grievance.
 *   Acting up        the post above you falls vacant: cover it, with an acting allowance, and you
 *                    may be confirmed in it, or go back down when they appoint someone else.
 *   Up or out        law firms, accountancies and banks decide once: partner (or managing
 *                    director), or you leave, or stay on as counsel with no further rise.
 *   Graduate schemes graduates joining big employers and the public service can join a fast
 *                    stream: rotations and a quicker rise for their first three years.
 *   Assessment centres senior public-service posts are filled through one: pass it to compete.
 *
 * job.calibration = { rating: 'top' | 'meets' | 'bottom', age }, job.bottoms, job.pip = { until },
 * job.acting = { levelId, title, until }, job.upOrOut = 'partner' | 'counsel' | 'out',
 * job.scheme = { name, until }, job.assessedAge
 */
import { clamp, Random } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { skill as skillOf, practise } from '../life/Skills.js';
import { showResult } from '../life/ResultCards.js';
import { yearNow } from '../world/Eras.js';
import { getProfession } from './JobTrees.js';
import { nextLevels, levelById } from './Ladder.js';
import { PROMO_GATES, PROMO_FACTORS, promote, leaveJob, levelCheck, PLATEAU_AFTER } from './CareerEngine.js';
import { EXAM_RANKS } from '../publicsafety/CivilService.js';
import { atHeadOffice } from './CompanyLife.js';

const money = (n) => `$${Math.round(n).toLocaleString()}`;
const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 3301 + state.character.age * 457 + 0xad7) >>> 0);
const isPublic = (job) => ['municipal', 'state', 'federal', 'public'].includes(job?.sector);
const sizeable = (job) => ['medium', 'large', 'enterprise', 'mega'].includes(job?.employer?.size);
const isBigEmployer = (job) => ['large', 'enterprise', 'mega'].includes(job?.employer?.size);
const protectedJob = (job) => Boolean(job?.tenured || job?.abilities?.includes('tenure') || getProfession(job?.professionId)?.church);

/* ------------------------------------------------------------------ */
/* Calibration                                                         */
/* ------------------------------------------------------------------ */

export const RATINGS = { top: { label: 'Top of the curve', icon: '🌟', factor: 1.15 }, meets: { label: 'Meets expectations', icon: '✔️', factor: 1 }, bottom: { label: 'Bottom of the curve', icon: '🔻', factor: 0.75 } };

function calibrate(ctx, job, rng) {
  const { state } = ctx;
  const done = (state.career.projectsDone ?? []).some((p) => p.age >= (job.startAge ?? 0) && state.character.age - p.age <= 2);
  const score = (job.performance ?? 55) + ((job.boss ?? 50) - 50) / 2 + ((job.mentor?.bond ?? 0) >= 70 ? 6 : 0) + (done ? 6 : 0) + (atHeadOffice(state, job) ? 0 : -3) + rng.int(-8, 8);
  const rating = score >= 80 ? 'top' : score < 45 ? 'bottom' : 'meets';
  job.calibration = { rating, age: state.character.age };
  job.bottoms = rating === 'bottom' ? (job.bottoms ?? 0) + 1 : 0;
  const modern = yearNow(ctx.state) >= 1975;
  if (rating === 'top') ctx.log(modern ? 'The calibration committee put you at the top of the curve for your level.' : 'Word came down that the partners think highly of you: first in line when there\'s a step up.', '🌟', 'good');
  else if (rating === 'bottom') ctx.log(!modern ? 'The manager had you in to say you\'d been noticed, and not in a good way.' : `The calibration committee put you at the bottom of the curve. Your manager couldn't hold the line for you.`, '🔻', 'warn');
}
PROMO_FACTORS.push((state, job) => RATINGS[job.calibration?.rating]?.factor ?? 1);

/* ------------------------------------------------------------------ */
/* Improvement plans                                                   */
/* ------------------------------------------------------------------ */

const settlement = (job) => Math.round((job.salary ?? 0) * (0.25 + Math.min(0.5, (job.yearsAtEmployer ?? 0) * 0.03)));
const canGrieve = (job) => Boolean(job.unionMember || isPublic(job));

function maybePlan(ctx, job) {
  const { state } = ctx;
  if (job.pip || protectedJob(job) || state.prompts.some((p) => p.type === 'advancement.pip')) return;
  if ((job.bottoms ?? 0) < 2 && (job.performance ?? 55) >= 32) return;
  ctx.prompt({ type: 'advancement.pip', icon: '📋', title: 'An Improvement Plan', text: `Your manager has put you on a formal improvement plan: targets to meet within the year, or your employment at ${job.employer.name} ends.`,
    options: [
      { id: 'accept', label: '💪 Accept it and turn things round', hint: 'Grind this year: you need a record of 50+' },
      { id: 'exit', label: `🤝 Negotiate an exit (${money(settlement(job))})`, hint: 'A settlement and an agreed reference' },
      ...(canGrieve(job) ? [{ id: 'grieve', label: `⚖️ File a grievance (${Math.round(grievanceOdds(job) * 100)}%)`, hint: job.unionMember ? 'Your union rep goes in with you' : 'Public-service rules on fair process' }] : []),
    ], data: {} });
}
export const grievanceOdds = (job) => clamp(0.3 + (job.unionMember ? 0.15 : 0) + ((job.yearsAtEmployer ?? 0) >= 5 ? 0.1 : 0), 0.1, 0.7);

function planYear(ctx, job) {
  if (!job.pip || ctx.state.character.age < job.pip.until) return;
  job.pip = null;
  if ((job.performance ?? 55) >= 50) {
    job.bottoms = 0;
    return ctx.log('You met the improvement plan\'s targets. It came off your file.', '✅', 'good');
  }
  ctx.log('You didn\'t meet the improvement plan\'s targets, and were dismissed.', '📋', 'bad');
  leaveJob(ctx, 'Dismissed at the end of an improvement plan', { fired: true });
  ctx.stat('happiness', -8);
}

/* ------------------------------------------------------------------ */
/* Acting up                                                           */
/* ------------------------------------------------------------------ */

function nextRung(state, job) {
  const p = getProfession(job.professionId);
  return p ? nextLevels(p, job.employer.size, job.levelId).find((l) => !l.appointed && levelCheck(state, l).ok) ?? null : null;
}
export const confirmOdds = (job) => clamp(0.3 + ((job.performance ?? 55) - 60) / 90 + ((job.boss ?? 50) - 50) / 200, 0.1, 0.85);

function actingYear(ctx, job, rng) {
  const { state } = ctx;
  if (job.acting) {
    ctx.earn(Math.round((job.salary ?? 0) * 0.1), 'Acting allowance', { wage: true });
    ctx.stat('stress', 3);
    if (state.character.age < job.acting.until) return;
    const a = job.acting;
    job.acting = null;
    if (rng.chance(confirmOdds(job))) {
      ctx.log(`You were confirmed as ${a.title}. No more "acting".`, '🪪', 'milestone');
      return promote(ctx, a.levelId);
    }
    ctx.stat('happiness', -4);
    job.nextInLine = { levelId: a.levelId, age: state.character.age };
    return ctx.log(`They appointed someone else as ${a.title}, and you went back to your old job. You're first in line next time.`, '🪪', 'warn');
  }
  if ((job.grade ?? 1) < 2 || (job.performance ?? 55) < 65 || !sizeable(job) || state.prompts.some((p) => p.type === 'advancement.acting')) return;
  if (!rng.chance(0.06)) return;
  const next = nextRung(state, job);
  if (!next) return;
  ctx.prompt({ type: 'advancement.acting', icon: '🪪', title: 'Acting Up', text: `The ${next.title} post above you is vacant while they recruit. Your manager asks you to cover it, with an acting allowance, for a year or two.`,
    options: [
      { id: 'accept', label: `🪪 Act up as ${next.title}`, hint: `${Math.round(confirmOdds(job) * 100)}% to be confirmed in it, on today's record` },
      { id: 'decline', label: '🙅 Stay in your own job' },
    ], data: { levelId: next.id, title: next.title } });
}

/* ------------------------------------------------------------------ */
/* Up or out                                                           */
/* ------------------------------------------------------------------ */

const PARTNER_LEVELS = ['partner', 'md'];
function partnerRung(job) {
  const p = getProfession(job.professionId);
  if (!p || job.sector !== 'private') return null;
  return nextLevels(p, job.employer.size, job.levelId).find((l) => PARTNER_LEVELS.includes(l.id)) ?? null;
}
export const partnerOdds = (state, job) => clamp(0.2 + ((job.performance ?? 55) - 55) / 100 + ((job.boss ?? 50) - 50) / 250 + ((job.mentor?.bond ?? 0) >= 70 ? 0.1 : 0) + (job.calibration?.rating === 'top' ? 0.1 : 0) + skillOf(state, 'negotiation') / 400, 0.08, 0.85);
/** Years to the up-or-out decision, or null. */
export function upOrOutIn(state, job = state.career?.job) {
  if (!job || job.upOrOut || !partnerRung(job)) return null;
  return Math.max(0, 7 - (job.yearsAtEmployer ?? 0));
}

function upOrOutYear(ctx, job) {
  const { state } = ctx;
  const left = upOrOutIn(state, job);
  if (left == null || left > 0 || state.prompts.some((p) => p.type === 'advancement.partner')) return;
  const rung = partnerRung(job);
  const p = getProfession(job.professionId);
  const counsel = levelById(p, 'counsel');
  ctx.prompt({ type: 'advancement.partner', icon: '🏛️', title: `${rung.title}, or Out`, text: `You've been at ${job.employer.name} long enough. This year the ${rung.id === 'md' ? 'firm' : 'partnership'} decides: ${rung.title.toLowerCase()}, or it's time to go.`,
    options: [
      { id: 'pitch', label: `🏛️ Make your case (${Math.round(partnerOdds(state, job) * 100)}%)`, hint: 'Your record, your sponsors, your clients' },
      ...(counsel ? [{ id: 'counsel', label: `📚 Ask to stay on as ${counsel.title}`, hint: 'No partnership, no further rise, but a job' }] : []),
      { id: 'leave', label: '🚪 Leave on your own terms', hint: 'A client or a rival firm will have you' },
    ], data: { levelId: rung.id, title: rung.title, counsel: counsel?.id ?? null } });
}

/* ------------------------------------------------------------------ */
/* Graduate schemes and assessment centres                             */
/* ------------------------------------------------------------------ */

export function schemeName(state, job) {
  const cc = state.character.countryId ?? 'US';
  if (isPublic(job)) return { GB: 'the Civil Service Fast Stream', FR: 'the grands corps track', IN: 'the probationers\' batch', JP: 'the career-track intake', SG: 'the Public Service Leadership Programme' }[cc] ?? 'the public service graduate programme';
  return { GB: 'the graduate scheme', IE: 'the graduate programme', AU: 'the graduate programme', DE: 'the Trainee-Programm', JP: 'the new-graduate intake' }[cc] ?? 'the leadership development program';
}
const degreeHolder = (state) => (state.education?.degrees ?? []).some((d) => ['bachelor', 'master', 'professional', 'doctorate'].includes(d.type));
function offerScheme(ctx, job) {
  const { state } = ctx;
  if (job.scheme || yearNow(state) < 1950 || state.character.age > 27 || (job.grade ?? 1) > 4 || !degreeHolder(state)) return;
  if (!(isBigEmployer(job) || (isPublic(job) && sizeable(job)))) return;
  if (EXAM_RANKS[job.professionId] || job.fastTrack) return;
  const name = schemeName(state, job);
  ctx.prompt({ type: 'advancement.scheme', icon: '🚀', title: 'A Graduate Scheme', text: `${job.employer.name} has places on ${name}: three years of rotations through different parts of the organization, and a faster rise if you do well.`,
    options: [
      { id: 'join', label: `🚀 Join ${name}`, hint: 'Faster promotion for three years; more stress' },
      { id: 'no', label: '🙅 Start in the ordinary way' },
    ], data: { name } });
}
function schemeYear(ctx, job) {
  const s = job.scheme;
  if (!s) return;
  if (ctx.state.character.age >= s.until && !s.done) {
    s.done = true;
    if (!s.keptFastTrack) job.fastTrack = false;
    ctx.log(`You finished ${s.name}.`, '🚀', 'good');
  } else if (!s.done) {
    ctx.stat('stress', 2);
    practise(ctx.state, 'leadership', 2);
  }
}

/**
 * The first senior public-service post is filled through an assessment centre (the Senior Civil
 * Service, the SES): once, on the way into the senior grades, not for every promotion after.
 */
const SENIOR = 8;
const needsAssessment = (state, job, level) => !(!isPublic(job) || EXAM_RANKS[job.professionId] || yearNow(state) < 1945 || job.military)
  && (level.grade ?? 0) >= SENIOR && (job.grade ?? 0) < SENIOR;
export const assessed = (state, job) => job.assessedAge != null && state.character.age - job.assessedAge <= 4;
export const assessmentOdds = (state, job) => clamp(0.25 + (state.stats.smarts - 50) / 200 + ((job.performance ?? 55) - 55) / 200 + skillOf(state, 'leadership') / 300, 0.1, 0.9);
PROMO_GATES.push((state, job, level) => (needsAssessment(state, job, level) && !assessed(state, job) ? `Pass the senior assessment centre to compete for ${level.title}` : null));
export const wantsAssessment = (state, job = state.career?.job) => Boolean(job && isPublic(job) && !EXAM_RANKS[job.professionId] && !assessed(state, job) && nextLevels(getProfession(job.professionId), job.employer.size, job.levelId).some((l) => needsAssessment(state, job, l)));

/* ------------------------------------------------------------------ */
/* The module                                                          */
/* ------------------------------------------------------------------ */

export const AdvancementModule = {
  id: 'advancement',
  // After the career engine's year (30): this year's record is in.
  order: 30.5,
  setup(engine) {
    engine.bus.on('career:hired', ({ ctx }) => { const job = ctx?.state.career.job; if (job) offerScheme(ctx, job); });
    engine.bus.on('career:promoted', ({ ctx, job }) => { if (job) { job.acting = null; job.bottoms = 0; } });
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    const job = state.career?.job;
    if (!job || state.character.age < 16) return;
    const rng = sideRng(state);
    if (sizeable(job) && !protectedJob(job) && (job.yearsAtEmployer ?? 0) >= 1) calibrate(ctx, job, rng);
    planYear(ctx, job);
    if (state.career.job !== job) return;
    maybePlan(ctx, job);
    actingYear(ctx, job, rng);
    if (state.career.job !== job) return;
    upOrOutYear(ctx, job);
    schemeYear(ctx, job);
  },
  actions: {
    /** Sit the senior assessment centre (once a year). */
    assessment(ctx) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!wantsAssessment(state, job)) return ctx.toast('No assessment centre to sit.', 'info');
      if (yearlyCount(state, 'advancement.assessment')) return ctx.toast('Once a year.', 'warn');
      bumpYearly(state, 'advancement.assessment');
      practise(state, 'leadership', 3);
      if (rng.chance(assessmentOdds(state, job))) {
        job.assessedAge = state.character.age;
        return ctx.log('You passed the assessment centre: the in-tray exercise, the role-play, the panel. You can compete for senior posts.', '🎯', 'good');
      }
      ctx.stat('stress', 4);
      ctx.log('You didn\'t pass the assessment centre this time. The feedback was fair, and stung.', '🎯', 'warn');
    },
  },
  resolvers: {
    pip(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!job) return;
      if (optionId === 'exit') {
        const pay = settlement(job);
        leaveJob(ctx, 'Left with a settlement after an improvement plan');
        ctx.earn(pay, 'Settlement agreement', { wage: true });
        return ctx.log(`You negotiated an exit: ${money(pay)} and an agreed reference.`, '🤝', 'info');
      }
      if (optionId === 'grieve' && rng.chance(grievanceOdds(job))) {
        job.boss = Math.round(clamp((job.boss ?? 50) - 10, 0, 100));
        job.bottoms = 0;
        return ctx.log('Your grievance was upheld: the plan was withdrawn for want of fair process. Your manager will not forget it.', '⚖️', 'good');
      }
      if (optionId === 'grieve') ctx.log('Your grievance was dismissed. The plan stands.', '⚖️', 'warn');
      job.pip = { until: state.character.age + 1 };
      state.career.plan = 'grind';
      ctx.log('You accepted the plan. Twelve months to turn it round.', '📋', 'warn');
    },
    acting(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!job || optionId !== 'accept') return;
      job.acting = { levelId: data.levelId, title: data.title, until: state.character.age + rng.int(1, 2) };
      ctx.log(`You're acting ${data.title} while they recruit.`, '🪪', 'good');
    },
    partner(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!job) return;
      if (optionId === 'pitch' && rng.chance(partnerOdds(state, job))) {
        job.upOrOut = 'partner';
        promote(ctx, data.levelId);
        ctx.log(`You made ${data.title}. Your name goes on the letterhead.`, '🏛️', 'milestone');
        return showResult(ctx, { icon: '🏛️', title: 'Up, not out', big: data.title, sub: job.employer.name, tone: 'good', popup: true });
      }
      if (optionId === 'counsel' && data.counsel) {
        job.upOrOut = 'counsel';
        promote(ctx, data.counsel);
        job.passovers = PLATEAU_AFTER;
        job.plateauUntil = Infinity;
        return ctx.log('You stayed on as counsel: a good job, and the end of the climb at this firm.', '📚', 'info');
      }
      job.upOrOut = 'out';
      if (optionId === 'pitch') ctx.log(`The ${data.levelId === 'md' ? 'firm' : 'partnership'} didn't vote you in. You have a year to find something else; most people go to a client.`, '🏛️', 'bad');
      ctx.stat('happiness', optionId === 'pitch' ? -8 : -2);
      const pay = settlement(job);
      leaveJob(ctx, optionId === 'pitch' ? `Not made ${data.title}` : 'Left before the partnership vote');
      ctx.earn(pay, 'Settlement agreement', { wage: true });
    },
    scheme(ctx, data, optionId) {
      const { state } = ctx;
      const job = state.career.job;
      if (!job || optionId !== 'join') return;
      job.scheme = { name: data.name, until: state.character.age + 3, keptFastTrack: Boolean(job.fastTrack) };
      job.fastTrack = true;
      ctx.log(`You joined ${data.name}: rotations through the organization, and a faster rise.`, '🚀', 'good');
    },
  },
};
