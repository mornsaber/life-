/**
 * Things you can do at work during the year, plus the promotion review,
 * track-choice and quit-confirmation resolvers. Repeating an action within a
 * year has diminishing returns.
 */
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { REGIONS } from '../life/Regions.js';
import { getProfession } from './JobTrees.js';
import { lateralLevel, levelById, TRACK_LABEL } from './Ladder.js';
import { MAX_STEP } from './PayGrades.js';
import { promotionStatus, openPromotionReview, promote, leaveJob, levelCheck, recalcSalary } from './CareerEngine.js';

const DIMINISH = [1, 0.6, 0.3, 0];
/** Promotion odds multiplier by the grade being competed for. */
const COMPETITION = { 6: 0.85, 7: 0.65, 8: 0.45, 9: 0.28, 10: 0.15 };

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
      if (!(job.remote || job.sector === 'federal' || ['large', 'enterprise'].includes(job.employer.size))) return ctx.toast(`${job.employer.name} has no office there.`, 'warn');
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
      if (status.options.some((o) => o.abilities.includes('supervise')) && state.credentials.held.leadershipProgram?.status === 'active') chance += 0.08;

      if (rng.chance(clamp(chance, 0.05, 0.95))) {
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
        ctx.log('"Not this cycle." The promotion went to someone else.', '😞', 'warn');
      }
      ctx.stat('happiness', -4);
      ctx.toast('Promotion denied', 'bad');
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
