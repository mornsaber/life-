/**
 * Things you can do at work during the year, plus the promotion review and
 * quit-confirmation resolvers. Repeating an action within a year has
 * diminishing returns.
 */
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { promotionStatus, openPromotionReview, promote, leaveJob, retire } from './CareerEngine.js';

const DIMINISH = [1, 0.6, 0.3, 0];

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
  { id: 'socialize', label: 'Bond with Coworkers', icon: '☕', desc: '+Boss, +Happiness' },
  { id: 'slackOff', label: 'Slack Off', icon: '😴', desc: '−Stress, −Performance' },
  { id: 'askRaise', label: 'Negotiate Raise', icon: '💵', desc: 'Once per year' },
  { id: 'requestPromotion', label: 'Request Promotion', icon: '🪜', desc: 'Once per year' },
];

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
        { w: 50, text: 'You quietly took credit in the right meeting. Your boss noticed.', boss: 10, perf: 3, kind: 'good' },
        { w: 30, text: 'You formed an alliance with the right people.', boss: 4, perf: 0, kind: 'info' },
        { w: 20, text: 'You got caught gossiping about your boss.', boss: -12, perf: -3, kind: 'bad' },
      ], (o) => o.w);
      adjustJob(job, 'boss', roll.boss);
      adjustJob(job, 'performance', roll.perf);
      ctx.log(roll.text, '🗣️', roll.kind);
      ctx.toast(roll.text, roll.kind);
    },

    socialize(ctx) {
      const job = withJob(ctx);
      if (!job) return;
      const n = bumpYearly(ctx.state, 'career.socialize') - 1;
      const factor = DIMINISH[Math.min(n, DIMINISH.length - 1)];
      if (!factor) return ctx.toast('Your coworkers need a break from you.', 'warn');
      adjustJob(job, 'boss', 4 * factor);
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

    askRaise(ctx) {
      const { state, rng } = ctx;
      const job = withJob(ctx);
      if (!job) return;
      if (yearlyCount(state, 'career.askRaise')) return ctx.toast('You already asked this year.', 'warn');
      if (job.lastRaiseAge === state.character.age) return ctx.toast('Too soon since your last raise.', 'warn');
      bumpYearly(state, 'career.askRaise');
      const chance = clamp(0.1 + job.performance / 200 + job.boss / 250, 0.05, 0.9);
      if (rng.chance(chance)) {
        const pct = rng.int(4, 12);
        job.salary = Math.round(job.salary * (1 + pct / 100));
        job.lastRaiseAge = state.character.age;
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
      if (yearlyCount(state, 'career.requestPromotion')) return ctx.toast('You already asked this year.', 'warn');
      bumpYearly(state, 'career.requestPromotion');
      const status = promotionStatus(state);
      if (!status.eligible) {
        adjustJob(job, 'boss', -4);
        ctx.log(`You asked for a promotion, but you're not eligible (${status.reason}).`, '🪜', 'warn');
        return ctx.toast(status.reason, 'warn');
      }
      openPromotionReview(ctx, true);
    },

    quit(ctx) {
      const job = withJob(ctx);
      if (!job) return;
      ctx.prompt({
        type: 'career.confirmQuit',
        icon: '🚪',
        title: 'Quit your job?',
        text: `Walk away from your role as ${job.title} at ${job.company}?`,
        options: [
          { id: 'quit', label: '🚪 Quit' },
          { id: 'stay', label: 'Never mind' },
        ],
      });
    },

    retire(ctx) {
      if (!withJob(ctx)) return;
      if (ctx.state.character.age < 55) return ctx.toast('You can retire at 55.', 'warn');
      retire(ctx);
    },
  },

  resolvers: {
    promotionReview(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!job || !promotionStatus(state).eligible) return;
      const perf = job.performance / 100;
      let chance;
      if (optionId === 'results') chance = 0.2 + perf * 0.45 + (state.stats.smarts - 50) / 200;
      else if (optionId === 'team') chance = 0.2 + perf * 0.35 + job.boss / 250;
      else chance = job.performance >= 90 ? 0.85 : 0.2;
      if (data.initiatedByPlayer) chance -= 0.1;
      chance -= job.tier * 0.035; // the air gets thinner near the top

      if (rng.chance(clamp(chance, 0.05, 0.95))) {
        promote(ctx);
        return;
      }
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

    confirmQuit(ctx, _data, optionId) {
      if (optionId === 'quit') {
        leaveJob(ctx, 'Quit');
        ctx.stat('stress', -10);
      }
    },
  },
};
