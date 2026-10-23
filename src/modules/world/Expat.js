/**
 * Living abroad without emigrating for good.
 *
 *  - Expat assignments: large employers send seasoned staff abroad for three
 *    years on an intra-company transfer, with a housing allowance and a pay
 *    uplift; at the end you come home, localize (stay on as a local hire) or quit.
 *  - Gap years: a year off between school and whatever comes next — travel,
 *    volunteer abroad or work and save.
 *
 * state.migration.assignment = { home, to, endsAt, uplift }
 * state.migration.gapYear = { age, kind }
 */
import { COUNTRIES } from './Countries.js';
import { IMMIGRATION, localLanguage, speaks, LANGUAGE_FLUENT, nativeLanguages, birthCountryOf } from './Immigration.js';
import { arrive, departureBlock, ensureMigration } from './Migration.js';
import { REGIONS, regionsIn } from '../life/Regions.js';
import { severancePay, unemploymentBenefit } from './CountryLaw.js';
import { warIn } from './War.js';
import { bodyOfJob } from '../org/Bodies.js';
import { INTL_ORG_PROFESSIONS } from '../career/IntlOrgCareers.js';

/** International organisations post their own staff (IntlOrgs duty stations): no company assignments or moves. */
const intlStaff = (job) => Boolean(job && INTL_ORG_PROFESSIONS[job.professionId]);

export const ASSIGNMENT_YEARS = 3;
export const ASSIGNMENT_UPLIFT = 0.15;
export const GAP_YEAR = {
  travel: { label: '🎒 Backpack around the world', cost: 7000, desc: 'A year on the road: hostels, trains, a new language' },
  volunteer: { label: '🌍 Volunteer abroad', cost: 3500, desc: 'Teaching, conservation or building projects' },
  work: { label: '💼 Work and save', cost: 0, desc: 'A year of full-time shifts before school' },
};

const here = (state) => state.character.countryId ?? 'US';
export const onAssignment = (state) => Boolean(state.migration?.assignment);

/** Whether you can take a gap year now (and why not). */
export function gapYearCheck(state) {
  const age = state.character.age;
  if (age < 17 || age > 26) return { ok: false, reason: 'Ages 17–26' };
  if (state.migration?.gapYear) return { ok: false, reason: 'You already took one' };
  if (state.education.enrolled) return { ok: false, reason: 'Not while enrolled' };
  if (state.career.job) return { ok: false, reason: 'Leave your job first' };
  if (state.legal.incarceration || state.military.service) return { ok: false, reason: 'Not now' };
  return { ok: true };
}

function offerAssignment(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  const cc = here(state);
  if (!job || job.sector !== 'private' || job.remote || intlStaff(job) || !['large', 'enterprise'].includes(job.employer?.size)) return;
  if ((job.yearsAtEmployer ?? 0) < 2 || (job.grade ?? 0) < 4 || onAssignment(state) || departureBlock(state)) return;
  if (state.character.age < 25 || state.character.age > 58 || !rng.chance(0.07)) return;
  // Somewhere the company has an office and that isn't at war.
  const within = bodyOfJob(job)?.countries;
  const options = Object.keys(COUNTRIES).filter((c) => c !== cc && IMMIGRATION[c].visas.transfer && !(warIn(state, c)?.homeFront >= 0.2) && (!within || within.includes(c)));
  const to = rng.pick(options);
  if (!to) return;
  // A priest serves abroad in the diocese there, lent by the home bishop — not in a branch office.
  const body = bodyOfJob(job);
  if (body?.overseas) {
    if (job.headOf) return;
    const city = regionsIn(to)[0];
    const unit = body.unitName(to, city?.name ?? COUNTRIES[to].name, 'medium');
    return ctx.prompt({
      type: 'expat.offer', icon: '✝️', title: body.overseas.title,
      text: `${body.overseas.text(job.employer.name, unit, COUNTRIES[to].name)}${speaks(state, localLanguage(to)) ? '' : ` You don't speak ${localLanguage(to)}.`}`,
      options: [
        { id: 'accept', label: `${COUNTRIES[to].flag} ${body.overseas.accept}`, hint: `${unit}, ${ASSIGNMENT_YEARS} years` },
        { id: 'decline', label: '🏠 Stay in your diocese' },
      ],
      data: { to, body: body.id },
    });
  }
  ctx.prompt({
    type: 'expat.offer', icon: '🌐', title: 'An Overseas Assignment',
    text: `${job.employer.name} wants you to run part of its ${COUNTRIES[to].name} office for ${ASSIGNMENT_YEARS} years: same job, a ${Math.round(ASSIGNMENT_UPLIFT * 100)}% overseas allowance, housing paid, and your return guaranteed.${speaks(state, localLanguage(to)) ? '' : ` You don't speak ${localLanguage(to)}.`}`,
    options: [
      { id: 'accept', label: `${COUNTRIES[to].flag} Take the assignment`, hint: `${COUNTRIES[to].name}, ${ASSIGNMENT_YEARS} years` },
      { id: 'decline', label: '🏠 Stay home', hint: 'No hard feelings — mostly' },
    ],
    data: { to },
  });
}

function assignmentYear(ctx) {
  const { state } = ctx;
  const a = state.migration.assignment;
  const job = state.career.job;
  if (!job) {
    state.migration.assignment = null;
    return ctx.log('Without the job, your overseas assignment ended.', '🌐', 'warn');
  }
  ctx.earn(Math.round(job.salary * a.uplift), 'Overseas assignment allowance', { wage: true });
  if (state.character.age >= a.endsAt && !state.prompts.some((p) => p.type === 'expat.end')) {
    ctx.prompt({
      type: 'expat.end', icon: '🌐', title: 'Your Assignment Is Ending',
      text: `Your ${ASSIGNMENT_YEARS} years in ${COUNTRIES[a.to].name} are up.`,
      options: [
        { id: 'home', label: `${COUNTRIES[a.home].flag} Go home with your job`, hint: 'Back to your old office' },
        { id: 'localize', label: '📍 Stay as a local hire', hint: 'No allowance or housing; stay on a work visa' },
        { id: 'quit', label: '🚪 Quit and stay', hint: 'You\'ll need another visa' },
      ],
      data: {},
    });
  }
}

/**
 * Forced relocation: the biggest employers move whole teams — to headquarters, a cheaper city
 * or another country's office. Go with the job, or take the package.
 */
function forcedRelocation(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  const cc = here(state);
  if (!job || job.sector !== 'private' || job.remote || intlStaff(job) || !['enterprise', 'mega'].includes(job.employer?.size) || onAssignment(state) || bodyOfJob(job)) return;
  if (state.prompts.some((p) => p.type === 'expat.relocation') || !rng.chance(job.employer.size === 'mega' ? 0.05 : 0.03)) return;
  // A third of the moves cross a border.
  const abroad = rng.chance(0.33) && !departureBlock(state);
  const to = abroad ? rng.pick(Object.keys(COUNTRIES).filter((c) => c !== cc && IMMIGRATION[c].visas.transfer && !(warIn(state, c)?.homeFront >= 0.2))) : cc;
  const city = rng.pick(regionsIn(to).filter((r) => r.id !== state.character.regionId));
  if (!city) return;
  const severance = severancePay(state.character.countryId, job.salary, job.yearsAtEmployer ?? 1);
  ctx.prompt({
    type: 'expat.relocation', icon: '📦', title: 'Your Job Is Moving',
    text: `${job.employer.name} is consolidating your team in ${city.name}${to !== cc ? `, ${COUNTRIES[to].name}` : ''}. Everyone on it can move with the job — or leave with a package.`,
    options: [
      { id: 'move', label: `📦 Move to ${city.name}`, hint: to !== cc ? 'The company sponsors your visa and pays the move' : 'Relocation paid' },
      { id: 'leave', label: '🏠 Stay and take the package', hint: severance ? `≈$${severance.toLocaleString()} severance` : 'No severance required here' },
    ],
    data: { to, regionId: city.id },
  });
}

export const ExpatModule = {
  id: 'expat',
  order: 43,

  onAgeUp(ctx) {
    const { state } = ctx;
    if (state.character.age < 18) return;
    if (onAssignment(state)) assignmentYear(ctx);
    else offerAssignment(ctx);
    forcedRelocation(ctx);
  },

  actions: {
    /** A gap year: 'travel' | 'volunteer' | 'work'. */
    gapYear(ctx, kind) {
      const { state, rng } = ctx;
      const g = GAP_YEAR[kind];
      const check = gapYearCheck(state);
      if (!g || !check.ok) return ctx.toast(check.reason ?? 'Not now', 'warn');
      if (g.cost && !ctx.spend(g.cost, 'Gap year', { credit: true })) return ctx.toast(`A gap year like that costs about $${g.cost.toLocaleString()}.`, 'warn');
      const m = ensureMigration(state);
      m.gapYear = { age: state.character.age, kind };
      if (kind === 'work') {
        ctx.earn(18000, 'Gap-year job', { wage: true });
        ctx.stat('stress', 3);
        return ctx.log('You took a year off school to work full time and save up.', '💼', 'good');
      }
      // A language picked up on the road.
      const langs = [...new Set(Object.values(COUNTRIES).map((c) => c.languages[0]))].filter((l) => !nativeLanguages(birthCountryOf(state)).includes(l));
      const lang = rng.pick(langs);
      m.languages[lang] = Math.min(LANGUAGE_FLUENT, (m.languages[lang] ?? 0) + (kind === 'travel' ? 35 : 25));
      ctx.stat('happiness', kind === 'travel' ? 12 : 9);
      ctx.stat('smarts', 2);
      ctx.log(kind === 'travel'
        ? `You spent a year backpacking: night trains, hostel friends, and enough ${lang} to get by.`
        : `You spent a year volunteering abroad and came back with stories and some ${lang}.`, kind === 'travel' ? '🎒' : '🌍', 'milestone');
    },
  },

  resolvers: {
    relocation(ctx, data, optionId) {
      const { state } = ctx;
      const job = state.career.job;
      if (!job) return;
      if (optionId === 'leave') {
        const severance = severancePay(state.character.countryId, job.salary, job.yearsAtEmployer ?? 1);
        const ui = unemploymentBenefit(state.character.countryId, job.salary);
        ctx.emit('career:resign', { reason: `Declined to relocate with ${job.employer.name}` });
        if (severance) ctx.earn(severance, 'Severance pay', { wage: true });
        ctx.earn(ui.amount, ui.name);
        return ctx.log(`You stayed behind and took the package from ${job.employer.name}.`, '📦', 'warn');
      }
      if (data.to !== here(state)) {
        arrive(ctx, data.to, { visa: 'transfer', keepJob: true, reason: `${job.employer.name} moved your job to ${COUNTRIES[data.to].name}.` });
        if (data.regionId !== state.character.regionId) ctx.emit('region:relocate', { regionId: data.regionId, reason: `${job.employer.name} placed you in its ${REGIONS[data.regionId].name} office.` });
      } else ctx.emit('region:relocate', { regionId: data.regionId, reason: `${job.employer.name} moved your team to ${REGIONS[data.regionId].name}.` });
      ctx.stat('stress', 6);
    },
    offer(ctx, data, optionId) {
      const { state } = ctx;
      if (optionId !== 'accept') {
        if (state.career.job) state.career.job.performance = Math.max(0, (state.career.job.performance ?? 50) - 2);
        return ctx.log('You turned down the overseas assignment.', '🏠');
      }
      const from = here(state);
      arrive(ctx, data.to, { visa: 'transfer', keepJob: true, reason: `${state.career.job?.employer.name ?? 'Your employer'} moved you to ${COUNTRIES[data.to].name} on assignment.` });
      if ((state.character.countryId ?? 'US') !== data.to) return;
      // A priest on loan has no overseas allowance: the diocese there houses and pays them.
      ensureMigration(state).assignment = { home: from, to: data.to, endsAt: state.character.age + ASSIGNMENT_YEARS, uplift: data.body ? 0 : ASSIGNMENT_UPLIFT };
      ctx.stat('happiness', 4);
    },
    end(ctx, _data, optionId) {
      const { state } = ctx;
      const a = state.migration?.assignment;
      if (!a) return;
      state.migration.assignment = null;
      if (optionId === 'home') {
        arrive(ctx, a.home, { keepJob: true, reason: 'Your assignment ended and you came home.' });
        return;
      }
      if (optionId === 'quit') ctx.emit('career:resign', { reason: 'Quit at the end of an overseas assignment' });
      else ctx.log('You stayed on as a local hire: no more allowance or company flat.', '📍');
      const res = state.migration.residences[a.to];
      // Localizing moves you onto an ordinary work permit with the same employer.
      if (res?.status === 'visa' && optionId === 'localize' && IMMIGRATION[a.to].visas.work) Object.assign(res, { visa: 'work', expires: state.character.age + (IMMIGRATION[a.to].visas.work.years ?? 2) });
    },
  },
};
