/**
 * Work by era, for women (rules in career/EraPay.js): the marriage bar, the women's rate and
 * the day equal pay came in, the glass ceiling, and the big-firm custom of retiring on marriage.
 */
import { addEraWorkRule, yearNow, colonyHere } from '../world/Eras.js';
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

/**
 * When women were first admitted to each profession, by country (a province or colony follows its
 * ruler: Bessarabia, Russia's). Law: admission to the bar; medicine: to the medical register or
 * the medical courses; police: the first sworn policewomen; fire: career firefighters.
 */
const WOMEN_ADMITTED = {
  law: { US: 1869, CA: 1897, NZ: 1897, SE: 1897, FR: 1900, NL: 1903, NO: 1904, AU: 1905, DK: 1906, RU: 1917, AT: 1919, IT: 1919, IE: 1921, GB: 1922, DE: 1922, BE: 1922, IN: 1923, ES: 1925, JP: 1940, default: 1920 },
  medicine: { US: 1849, CH: 1867, SE: 1870, FR: 1875, GB: 1876, RU: 1876, IT: 1877, JP: 1885, IN: 1886, AT: 1897, DE: 1900, default: 1890 },
  police: { US: 1910, GB: 1915, SE: 1908, DE: 1926, AU: 1915, CA: 1912, default: 1930 },
  fire: { US: 1974, GB: 1982, default: 1975 },
  engineering: { US: 1876, default: 1900 },
  architecture: { US: 1878, default: 1890 },
  diplomacy: { US: 1922, NO: 1921, SE: 1925, FR: 1930, GB: 1946, default: 1935 },
  judges: { US: 1870, default: 1925 },
};
const WOMEN_FIELD = [
  [/^(law|prosecution|publicDefender)$/, 'law'], [/^courts$/, 'judges'],
  [/^(medical|dentistry|pharmacy|veterinary|colonialMedical|physicianAssistant)$/, 'medicine'],
  [/police|^sheriff$/i, 'police'], [/fire$|^fire/i, 'fire'],
  [/^(engineering|mechanicalEng|electricalEng|chemicalEng|aerospaceEng|petroleumEng|nuclearEng|structuralEng)$/, 'engineering'], [/^architecture$/, 'architecture'],
  [/^(foreignService)$/, 'diplomacy'],
];
export function womenAdmitted(state, profession) {
  const id = profession?.template ?? profession?.id ?? '';
  const field = WOMEN_FIELD.find(([re]) => re.test(id))?.[1];
  if (!field) return null;
  const home = state.character.countryId ?? 'US';
  const cc = colonyHere(state)?.ruler ?? home;
  const t = WOMEN_ADMITTED[field];
  return t[cc] ?? t[home] ?? t.default;
}
addEraWorkRule((state, profession) => {
  if (state.character.gender !== 'female') return null;
  const from = womenAdmitted(state, profession);
  return from && yearNow(state) < from ? `Women aren't admitted to this work yet (from about ${from})` : null;
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
    ctx.log(job.salary > before ? `Equal pay came in: the women's rate is gone. Your pay rose from ${money(before)} to ${money(job.salary)}. The men's jobs still pay more.` : 'Equal pay came in: the women\'s rate is gone, on paper. The men\'s jobs still pay more.', '⚖️', 'good');
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
