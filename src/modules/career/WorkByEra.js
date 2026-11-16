/**
 * Work by era, for women (rules in career/EraPay.js): the marriage bar, the women's rate and
 * the day equal pay came in, the glass ceiling, and the big-firm custom of retiring on marriage.
 */
import { addEraWorkRule, yearNow } from '../world/Eras.js';
import { isMarried } from '../people/People.js';
import { getProfession } from './JobTrees.js';
import { PROMO_FACTORS, leaveJob } from './CareerEngine.js';
import { recalcSalary } from './Compensation.js';
import { marriageBar, retireOnMarriageCustom, ceilingFactor, womensRate, equalPayYear } from './EraPay.js';

const money = (n) => `$${Math.round(n).toLocaleString()}`;
const GRATUITY = ['GB', 'IE'];

// Married women weren't taken on where a bar stood.
addEraWorkRule((state, profession) => {
  if (state.character.gender !== 'female' || !isMarried(state)) return null;
  const bar = marriageBar(state, profession);
  return bar ? `Married women aren't taken on (marriage bar, until ${bar.until})` : null;
});

PROMO_FACTORS.push((state, job, target) => ceilingFactor(state, job, target?.grade));

/** A married woman's job here: forced out under a bar, or pressed to retire by custom. */
function onMarriage(ctx) {
  const { state } = ctx;
  const job = state.career?.job;
  if (!job || state.character.gender !== 'female') return;
  const bar = marriageBar(state, getProfession(job.professionId));
  if (bar) {
    const years = job.yearsAtEmployer ?? 0;
    // Britain and Ireland paid a marriage gratuity: a month's pay per year of service, up to a year's.
    const gratuity = GRATUITY.includes(state.character.countryId) && years >= 6 ? Math.round((job.salary * Math.min(12, years)) / 12) : 0;
    leaveJob(ctx, `Resigned on marriage: the marriage bar in ${bar.what}`);
    if (gratuity) ctx.earn(gratuity, 'Marriage gratuity', { wage: true });
    ctx.stat('happiness', -6);
    return ctx.log(`Married women can't stay in ${bar.what}, so you had to resign.${gratuity ? ` A marriage gratuity of ${money(gratuity)} for your ${years} years.` : ''} The bar lasts until ${bar.until}.`, '💍', 'bad');
  }
  if (retireOnMarriageCustom(state, job) && !job.stayedOnMarried) {
    ctx.prompt({
      type: 'workByEra.custom',
      icon: '💍',
      title: 'Congratulations, and…',
      text: `Your manager at ${job.employer.name} congratulated you, then asked when you'd be leaving. Women here retire when they marry. Nothing in writing says so.`,
      options: [
        { id: 'retire', label: `🎎 Retire as expected (${money(job.salary / 2)})`, hint: 'A send-off and half a year\'s pay' },
        { id: 'stay', label: '💼 Stay on', hint: 'Legal, but your manager and the firm will hold it against you' },
      ],
    });
  }
}

/** The year equal pay reached your job. */
function equalPayYearEnd(ctx) {
  const { state } = ctx;
  const job = state.career?.job;
  if (!job || state.character.gender !== 'female') return;
  const was = job.rateSeen ?? 1;
  const now = womensRate(state, job);
  if (now < 1) job.rateSeen = now; else delete job.rateSeen;
  if (yearNow(state) === equalPayYear(state, job) && now > was) {
    const before = job.salary;
    recalcSalary(state, job);
    ctx.stat('happiness', 5);
    ctx.log(`Equal pay came in: the women's rate is gone. Your pay rose from ${money(before)} to ${money(job.salary)}. The men's jobs still pay more.`, '⚖️', 'good');
  }
}

export const WorkByEraModule = {
  id: 'workByEra',
  order: 30.6,
  setup(engine) {
    engine.bus.on('people:married', ({ ctx }) => { if (ctx) onMarriage(ctx); });
  },
  onAgeUp(ctx) { equalPayYearEnd(ctx); },
  resolvers: {
    custom(ctx, data, optionId) {
      const { state } = ctx;
      const job = state.career.job;
      if (!job) return;
      if (optionId === 'retire') {
        const pay = Math.round(job.salary / 2);
        leaveJob(ctx, 'Retired on marriage, as the firm expected');
        ctx.earn(pay, 'Retirement on marriage', { wage: true });
        return ctx.log(`You retired on marriage with a send-off and ${money(pay)}.`, '🎎', 'info');
      }
      job.stayedOnMarried = true;
      job.boss = Math.max(0, (job.boss ?? 50) - 25);
      ctx.stat('stress', 6);
      ctx.log('You stayed on. The tea-making fell to you, the good projects stopped coming, and promotion will be hard. But you stayed.', '💼', 'warn');
    },
  },
};
