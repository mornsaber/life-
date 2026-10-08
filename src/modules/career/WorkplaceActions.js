/**
 * Things you can do at work during the year, plus the promotion review,
 * track-choice and quit-confirmation resolvers. Repeating an action within a
 * year has diminishing returns.
 */
import { promotionContest, awardToRival } from '../org/Vacancies.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { REGIONS } from '../life/Regions.js';
import { createEmployer, cityName } from './Employers.js';
import { STATES } from '../life/States.js';
import { getProfession } from './JobTrees.js';
import { lateralLevel, levelById, TRACK_LABEL } from './Ladder.js';
import { MAX_STEP } from './PayGrades.js';
import { promotionStatus, openPromotionReview, promote, leaveJob, levelCheck, recalcSalary, hire, stepForAtLeast } from './CareerEngine.js';

const DIMINISH = [1, 0.6, 0.3, 0];
/** Promotion odds multiplier by the grade being competed for. */
// Fewer seats at each rung: calibrated so ~1 in 3 workers ever supervises and mid-career pay lands near real medians.
const COMPETITION = { 3: 0.9, 4: 0.75, 5: 0.6, 6: 0.5, 7: 0.38, 8: 0.26, 9: 0.17, 10: 0.1 };

function withJob(ctx) {
  const job = ctx.state.career.job;
  if (!job) ctx.toast("You don't have a job.", 'warn');
  return job;
}

function adjustJob(job, key, delta) {
  job[key] = Math.round(clamp(job[key] + delta, 0, 100));
}

export const WORKPLACE_ACTIONS = [
  { id: 'workHarder', label: 'Work Harder', icon: '💼', desc: '+Performance, +Stress' },
  { id: 'officePolitics', label: 'Office Politics', icon: '🗣️', desc: 'Gamble on boss favor' },
  { id: 'socialize', label: 'Bond with Coworkers', icon: '☕', desc: '+Boss, +Coworkers' },
  { id: 'slackOff', label: 'Slack Off', icon: '😴', desc: '−Stress, −Performance' },
  { id: 'askRaise', label: 'Negotiate Raise', icon: '💵', desc: 'Merit raise / step increase' },
  { id: 'requestPromotion', label: 'Request Promotion', icon: '🪜', desc: 'Once per year' },
];

function trackPrompt(ctx, options) {
  ctx.prompt({
    type: 'career.chooseTrack',
    icon: '🔀',
    title: 'Choose Your Path',
    text: 'You\'ve reached the fork in the ladder. Stay hands-on as a specialist, or move into management?',
    options: options.map((l) => ({ id: l.id, label: `${l.track === 'mgmt' ? '👥' : '🧠'} ${l.title} [G${l.grade}]`, hint: `${TRACK_LABEL[l.track]} track${l.abilities.length ? ` · ${l.abilities.join(', ')}` : ''}` })),
  });
}

/**
 * Lateral transfer between city departments: a new employer in the new city.
 * You keep your rank but start over on seniority and serve a new probation.
 */
function lateralTransfer(ctx, job, profession, regionId) {
  const { state, rng } = ctx;
  const city = cityName(regionId);
  if (job.performance < 50 || !rng.chance(0.7)) {
    ctx.log(`${city} had no lateral openings for a ${job.title} this year.`, '🔀', 'warn');
    return ctx.toast('No lateral opening this year', 'warn');
  }
  const from = job.employer.name;
  ctx.emit('region:relocate', { regionId, reason: `You made a lateral move from ${from}.` });
  const employer = createEmployer(rng, state, profession, regionId);
  job.employer = employer;
  job.yearsAtEmployer = 0;
  job.probationLeft = 1;
  job.passovers = 0;
  job.step = Math.max(1, job.step - 1);
  job.unionMember = false;
  recalcSalary(state, job);
  ctx.log(`You joined ${employer.name} as ${job.title} (lateral entry): $${job.salary.toLocaleString()}/yr. Seniority starts over with a one-year probation.`, profession.icon, 'milestone');
  ctx.emit('career:hired', { job, returning: true });
  return undefined;
}

export const WorkplaceActions = {
  actions: {
    workHarder(ctx) {
      const job = withJob(ctx);
      if (!job) return;
      const n = bumpYearly(ctx.state, 'career.workHarder') - 1;
      const factor = DIMINISH[Math.min(n, DIMINISH.length - 1)];
      if (!factor) return ctx.toast("You're already running on fumes.", 'warn');
      adjustJob(job, 'performance', ctx.rng.int(5, 9) * factor);
      job.effort += 1;
      ctx.stat('stress', 6);
      ctx.stat('happiness', -2);
      ctx.log(ctx.rng.pick(['You stayed late every night this month.', 'You took on the project nobody wanted.', 'You came in on weekends to close out the backlog.']), '💼');
      ctx.toast('Performance up', 'good');
    },

    officePolitics(ctx) {
      const job = withJob(ctx);
      if (!job) return;
      const n = bumpYearly(ctx.state, 'career.officePolitics');
      if (n > 3) return ctx.toast('People are starting to notice your scheming.', 'warn');
      const roll = ctx.rng.weighted([
        { w: 50, text: 'You quietly took credit in the right meeting. Your boss noticed.', boss: 10, perf: 3, coworkers: -3, kind: 'good' },
        { w: 30, text: 'You formed an alliance with the right people.', boss: 4, perf: 0, coworkers: 2, kind: 'info' },
        { w: 20, text: 'You got caught gossiping about your boss.', boss: -12, perf: -3, coworkers: -4, kind: 'bad' },
      ], (o) => o.w);
      adjustJob(job, 'boss', roll.boss);
      adjustJob(job, 'performance', roll.perf);
      adjustJob(job, 'coworkers', roll.coworkers);
      ctx.log(roll.text, '🗣️', roll.kind);
      ctx.toast(roll.text, roll.kind);
    },

    socialize(ctx) {
      const job = withJob(ctx);
      if (!job) return;
      const n = bumpYearly(ctx.state, 'career.socialize') - 1;
      const factor = DIMINISH[Math.min(n, DIMINISH.length - 1)];
      if (!factor) return ctx.toast('Your coworkers need a break from you.', 'warn');
      adjustJob(job, 'boss', 3 * factor);
      adjustJob(job, 'coworkers', 6 * factor);
      ctx.stat('happiness', 3);
      ctx.stat('stress', -3);
      ctx.log(ctx.rng.pick(['You organized a team happy hour.', 'You grabbed coffee with your manager.', 'You joined the office softball team.']), '☕');
    },

    slackOff(ctx) {
      const job = withJob(ctx);
      if (!job) return;
      bumpYearly(ctx.state, 'career.slackOff');
      adjustJob(job, 'performance', -7);
      ctx.stat('stress', -12);
      ctx.stat('happiness', 4);
      if (ctx.rng.chance(0.18)) {
        adjustJob(job, 'boss', -10);
        job.warnings += 1;
        ctx.log('Your boss caught you watching videos at your desk and wrote you up.', '🫣', 'bad');
        ctx.toast('Caught slacking!', 'bad');
      } else {
        ctx.log('You coasted for a while. Nobody noticed.', '😴');
      }
    },

    /** Private sector: merit raise. Public sector: pay is set by law, so ask for a Quality Step Increase. */
    askRaise(ctx) {
      const { state, rng } = ctx;
      const job = withJob(ctx);
      if (!job) return;
      if (yearlyCount(state, 'career.askRaise')) return ctx.toast('You already asked this year.', 'warn');
      if (job.lastRaiseAge === state.character.age) return ctx.toast('Too soon since your last raise.', 'warn');
      bumpYearly(state, 'career.askRaise');
      if (job.sector !== 'private') {
        if (job.step >= MAX_STEP) return ctx.toast('You\'re at the top step of your grade.', 'warn');
        if (job.performance >= 80 && rng.chance(0.5 + job.boss / 300)) {
          job.step += 1;
          job.lastRaiseAge = state.character.age;
          recalcSalary(state, job);
          ctx.log(`Your supervisor approved a Quality Step Increase to step ${job.step} ($${job.salary.toLocaleString()}).`, '📈', 'good');
          ctx.toast('Quality Step Increase approved', 'good');
        } else {
          ctx.log('"Your pay is set by the GS table." QSI request denied.', '📄', 'warn');
          ctx.toast('QSI denied', 'bad');
        }
        return;
      }
      const chance = clamp(0.1 + job.performance / 200 + job.boss / 250, 0.05, 0.9);
      if (rng.chance(chance)) {
        const pct = rng.int(4, 12);
        job.merit = Math.round((job.merit + pct / 100) * 1000) / 1000;
        job.lastRaiseAge = state.character.age;
        recalcSalary(state, job);
        ctx.log(`You negotiated a ${pct}% raise. New salary: $${job.salary.toLocaleString()}.`, '💵', 'good');
        ctx.toast(`Raise: +${pct}%`, 'good');
        ctx.stat('happiness', 5);
      } else {
        adjustJob(job, 'boss', -6);
        ctx.log('Your boss denied your raise request.', '🙅', 'bad');
        ctx.toast('Raise denied', 'bad');
      }
    },

    requestPromotion(ctx) {
      const { state } = ctx;
      const job = withJob(ctx);
      if (!job) return;
      if (yearlyCount(state, 'career.requestPromotion')) return ctx.toast('Promotions are reviewed once a year.', 'warn');
      bumpYearly(state, 'career.requestPromotion');
      const status = promotionStatus(state);
      if (!status.eligible) {
        adjustJob(job, 'boss', -4);
        ctx.log(`You asked for a promotion, but you're not eligible (${status.reason}).`, '🪜', 'warn');
        return ctx.toast(status.reason, 'warn');
      }
      openPromotionReview(ctx, true);
    },

    /** Lateral move between specialist and management tracks at a similar grade. */
    switchTrack(ctx) {
      const { state } = ctx;
      const job = withJob(ctx);
      if (!job) return;
      const profession = getProfession(job.professionId);
      const target = lateralLevel(profession, job.employer.size, job.levelId);
      if (!target) return ctx.toast(job.track === 'shared' ? 'Climb to the fork first.' : 'No matching role on the other track here.', 'warn');
      if (yearlyCount(state, 'career.switchTrack')) return ctx.toast('One lateral move request per year.', 'warn');
      bumpYearly(state, 'career.switchTrack');
      const check = levelCheck(state, target);
      if (!check.ok) return ctx.toast(`Needs ${check.missing.join(', ')}`, 'warn');
      if (job.boss < 55 || job.performance < 60) {
        adjustJob(job, 'boss', -3);
        ctx.log(`Leadership turned down your request to move to ${target.title}.`, '🔀', 'warn');
        return;
      }
      promote(ctx, target.id);
      ctx.log(`You moved laterally onto the ${TRACK_LABEL[target.track].toLowerCase()} track.`, '🔀');
    },

    /** Large employers and federal agencies can move you without ending the job. */
    transfer(ctx, regionId) {
      const { state } = ctx;
      const job = withJob(ctx);
      if (!job || !REGIONS[regionId] || state.character.regionId === regionId) return;
      const profession = getProfession(job.professionId);
      if (profession.dutyStation || job.posting) return ctx.toast('Your agency assigns your duty station.', 'warn');
      const target = REGIONS[regionId];
      // City departments can't send you elsewhere: you apply laterally to the other city's department.
      if (job.sector === 'municipal' && !job.remote) {
        if (yearlyCount(state, 'career.transfer')) return ctx.toast('One transfer request per year.', 'warn');
        bumpYearly(state, 'career.transfer');
        return lateralTransfer(ctx, job, profession, regionId);
      }
      if (job.sector === 'state' && !job.remote && target.state !== job.employer.stateId) return ctx.toast(`${job.employer.name} only operates in ${STATES[job.employer.stateId].name}. Apply to ${STATES[target.state].name}'s agency instead.`, 'warn');
      if (!(job.remote || job.sector === 'federal' || job.sector === 'state' || ['large', 'enterprise'].includes(job.employer.size))) return ctx.toast(`${job.employer.name} has no office there.`, 'warn');
      if (yearlyCount(state, 'career.transfer')) return ctx.toast('One transfer request per year.', 'warn');
      bumpYearly(state, 'career.transfer');
      ctx.emit('region:relocate', { regionId, reason: `${job.employer.name} approved your transfer.` });
      recalcSalary(state, job);
      ctx.log(`Your pay was adjusted for the new locality: $${job.salary.toLocaleString()}.`, '📍');
    },

    quit(ctx) {
      const job = withJob(ctx);
      if (!job) return;
      ctx.prompt({
        type: 'career.confirmQuit',
        icon: '🚪',
        title: 'Quit your job?',
        text: `Walk away from your role as ${job.title} at ${job.employer.name}?`,
        options: [
          { id: 'quit', label: '🚪 Quit' },
          { id: 'stay', label: 'Never mind' },
        ],
      });
    },
  },

  resolvers: {
    /** Taking a promotion with another employer when there's no opening at yours. */
    outsidePromotion(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!job || optionId !== 'accept') return;
      const profession = getProfession(job.professionId);
      const level = levelById(profession, data.levelId);
      if (!level || !levelCheck(state, level).ok) return;
      const old = job.salary;
      const employer = createEmployer(rng, state, profession, state.character.regionId);
      const now = hire(ctx, { professionId: profession.id, levelId: level.id, employer });
      if (now) {
        stepForAtLeast(state, now, Math.round(old * 1.06));
        recalcSalary(state, now);
        ctx.log(`You moved to ${employer.name} as ${now.title} — the promotion you couldn't get at home. $${now.salary.toLocaleString()}/yr.`, '🪜', 'good');
      }
    },
    promotionReview(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      const status = promotionStatus(state);
      if (!job || !status.eligible) return;
      const perf = job.performance / 100;
      let chance;
      if (optionId === 'results') chance = 0.2 + perf * 0.45 + (state.stats.smarts - 50) / 200;
      else if (optionId === 'team') chance = 0.2 + perf * 0.35 + job.boss / 250;
      else chance = job.performance >= 90 ? 0.85 : 0.2;
      if (data.initiatedByPlayer) chance -= 0.1;
      // The air gets thinner near the top: fewer seats, more rivals.
      const nextGrade = Math.max(...status.options.map((o) => o.grade));
      chance *= COMPETITION[nextGrade] ?? 1;
      // You're up against named rivals for the opening (and outsiders for senior posts).
      const target = status.options.reduce((a, b) => (b.grade > a.grade ? b : a));
      const contest = promotionContest(state, job, target);
      chance *= contest.factor;
      // Some fields have few management seats per worker (hotels, the trades).
      chance *= getProfession(job.professionId).promotionOdds ?? 1;
      if (status.options.some((o) => o.abilities.includes('supervise')) && state.credentials.held.leadershipProgram?.status === 'active') chance += 0.08;

      if (rng.chance(clamp(chance, 0.05, 0.95))) {
        // Big employers often attach a relocation to senior promotions.
        if (job.sector === 'private' && !job.remote && ['large', 'enterprise'].includes(job.employer.size) && nextGrade >= 6 && rng.chance(0.35)) {
          const regionId = rng.pick(Object.keys(REGIONS).filter((r) => r !== state.character.regionId));
          ctx.prompt({
            type: 'career.relocationOffer',
            icon: '📦',
            title: 'Promotion — With a Catch',
            text: `${job.employer.name} approved your promotion, but the role is based in ${REGIONS[regionId].name}. Relocation is paid.`,
            options: [
              { id: 'accept', label: `📦 Accept and move to ${REGIONS[regionId].name}` },
              { id: 'decline', label: '🏠 Decline — stay put and pass on the promotion' },
            ],
            data: { regionId, options: status.options.map((o) => o.id) },
          });
          return;
        }
        if (status.options.length > 1) trackPrompt(ctx, status.options);
        else promote(ctx, status.options[0].id);
        return;
      }
      if (nextGrade >= 7) job.passovers = (job.passovers ?? 0) + 1;
      if (optionId === 'ultimatum') {
        if (rng.chance(0.5)) {
          leaveJob(ctx, 'They called your bluff and accepted your resignation', { fired: true });
          return;
        }
        adjustJob(job, 'boss', -15);
        ctx.log('Your ultimatum fell flat. Your boss will remember that.', '🧊', 'bad');
      } else {
        adjustJob(job, 'boss', -2);
        ctx.log(`"Not this cycle." ${awardToRival(state, job, target, contest.best)}`, '😞', 'warn');
      }
      ctx.stat('happiness', -4);
      ctx.toast('Promotion denied', 'bad');
    },

    relocationOffer(ctx, data, optionId) {
      const job = ctx.state.career.job;
      if (!job) return;
      if (optionId === 'decline') {
        job.passovers = (job.passovers ?? 0) + 1;
        ctx.log('You turned down the promotion to stay where you are.', '🏠');
        return;
      }
      ctx.emit('region:relocate', { regionId: data.regionId, reason: `${job.employer.name} relocated you for the promotion.` });
      const profession = getProfession(job.professionId);
      const options = data.options.map((id) => levelById(profession, id)).filter(Boolean);
      if (options.length > 1) trackPrompt(ctx, options);
      else if (options[0]) promote(ctx, options[0].id);
    },

    chooseTrack(ctx, _data, optionId) {
      const job = ctx.state.career.job;
      if (!job || !levelById(getProfession(job.professionId), optionId)) return;
      promote(ctx, optionId);
    },

    confirmQuit(ctx, _data, optionId) {
      if (optionId === 'quit') {
        leaveJob(ctx, 'Quit');
        ctx.stat('stress', -10);
      }
    },
  },
};
