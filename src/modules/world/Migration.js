/**
 * Moving between countries: visas, permanent residence, citizenship,
 * languages, removal, and the passports your children inherit.
 *
 * state.migration = {
 *   birthCountry,
 *   residences: { [country]: { status: 'visa'|'permanent', visa, arrived, expires?, permanentSince?, grace?, leftAt?, removal? } },
 *   languages: { [language]: progress 0–100 },
 *   history: [{ age, from, to, visa }],
 * }
 * state.character.citizenships = ['US', …] once you've lived anywhere but your birth country.
 *
 * Your job, office and home don't come with you (an intra-company transfer
 * keeps the job; a remote private-sector job stays remote). Public-pension
 * records stay with each country and pay out together when you claim.
 */
import { COUNTRIES, isCitizen, citizenshipsOf } from './Countries.js';
import {
  IMMIGRATION, VISA_KINDS, EMIGRATION_COST, visaEligibility, residencyOf, residencesOf, birthCountryOf, prYearsLeft, naturalizationYearsLeft,
  speaksLocal, localLanguage, nativeLanguages, LANGUAGE_FLUENT, nationalityCode,
} from './Immigration.js';
import { REGIONS, regionsIn, changeRegion, countryIdOf } from '../life/Regions.js';
import { NATIONAL_PROFESSIONS } from '../career/JobTrees.js';
import { setNameCountry, yearlyCount, bumpYearly, canAfford, visibleRecord } from '../../core/State.js';
import { clamp } from '../../core/Random.js';

export const LANGUAGE_CLASS_COST = 1200;
const EU = ['DE', 'IT'];

export function ensureMigration(state) {
  state.migration ??= { birthCountry: state.character.countryId ?? 'US', residences: {}, languages: {}, history: [] };
  state.character.citizenships ??= [state.migration.birthCountry];
  return state.migration;
}

/** Why you can't leave the country right now, or null. */
export function departureBlock(state) {
  if (state.character.age < 18) return 'You can move abroad on your own at 18';
  if (state.legal.incarceration) return 'Incarcerated';
  if (state.legal.probationYears > 0) return 'On probation: the court holds your passport';
  if (state.military.service) return 'Finish your military service first';
  if (state.education.enrolled) return 'Finish or withdraw from school first';
  if (state.judiciary?.seat) return 'Resign from the bench first';
  return null;
}

/** Your routes into a country: as a citizen, a returning resident, or by visa. */
export function routesTo(state, to) {
  const here = countryIdOf(state);
  if (to === here) return [];
  if (isCitizen(state, to)) return [{ kind: 'citizen', ok: true, odds: 1, fee: 0, label: `${COUNTRIES[to].flag} Move home (citizen)` }];
  const res = residencesOf(state)[to];
  if (res?.status === 'permanent' && res.leftAt != null && state.character.age - res.leftAt <= IMMIGRATION[to].prLapse) return [{ kind: 'resident', ok: true, odds: 1, fee: 0, label: '🪪 Return as a permanent resident' }];
  return Object.keys(IMMIGRATION[to].visas).map((kind) => ({ kind, ...visaEligibility(state, to, kind), label: `${VISA_KINDS[kind].icon} ${IMMIGRATION[to].visas[kind].name}` }));
}

/** Move your life to another country. */
export function arrive(ctx, to, { visa = null, reason = '', keepJob = false } = {}) {
  const { state } = ctx;
  const m = ensureMigration(state);
  const from = countryIdOf(state);
  const age = state.character.age;
  // Public-pension records stay with the country that kept them.
  const r = state.retirement;
  r.records ??= {};
  if (r.ssEarnings.length) r.records[from] = [...(r.records[from] ?? []), ...r.ssEarnings];
  r.ssEarnings = r.records[to] ?? [];
  delete r.records[to];
  // A permanent residence left behind lapses after a while away.
  if (m.residences[from]) m.residences[from].leftAt = age;
  (m.lastRegion ??= {})[from] = state.character.regionId;
  const job = state.career.job;
  const national = job && (NATIONAL_PROFESSIONS[job.professionId] || job.sector === 'federal');
  const stays = job && !national && job.sector === 'private' && (keepJob || job.remote);
  if (job && !stays) ctx.emit('career:resign', { reason: `Moved to ${COUNTRIES[to].name}` });

  if (to === 'US') delete state.character.countryId;
  else state.character.countryId = to;
  setNameCountry(to);

  if (!isCitizen(state, to)) {
    const old = m.residences[to];
    if (old?.status === 'permanent' && old.leftAt != null && age - old.leftAt <= IMMIGRATION[to].prLapse) delete old.leftAt;
    else {
      const rule = IMMIGRATION[to].visas[visa] ?? {};
      m.residences[to] = { status: rule.permanent ? 'permanent' : 'visa', visa, arrived: age, ...(rule.years ? { expires: age + rule.years } : {}), ...(rule.permanent ? { permanentSince: age } : {}) };
    }
  }
  m.history.push({ age, from, to, visa });
  // Back to where you lived before, or the country's biggest city.
  const city = REGIONS[m.lastRegion?.[to]] ?? regionsIn(to)[0];
  changeRegion(ctx, city.id, reason || `You landed in ${COUNTRIES[to].name} ${COUNTRIES[to].flag}.`, { voluntary: true, crossBorder: true });
  if (stays) ctx.log(`${job.employer.name} kept you on${job.remote ? ' remotely' : ' at its office here'}.`, '💼', 'good');
  if (!speaksLocal(state, to)) ctx.log(`You don't speak ${localLanguage(to)} yet. Living here, you'll pick it up — classes speed it up.`, '🗣️', 'info');
  ctx.stat('stress', 8);
}

/** Sent back to a country whose passport you hold. */
function removal(ctx, why) {
  const { state } = ctx;
  const here = countryIdOf(state);
  const home = citizenshipsOf(state).includes(birthCountryOf(state)) ? birthCountryOf(state) : citizenshipsOf(state)[0];
  delete state.migration.residences[here];
  ctx.log(`${why} You were removed from ${COUNTRIES[here].name} and sent back to ${COUNTRIES[home].name}.`, '🛂', 'bad');
  ctx.stat('happiness', -15);
  ctx.stat('stress', 12);
  arrive(ctx, home, { reason: 'Removed by immigration authorities.' });
}

function finishEmigration(ctx, to, kind) {
  if (!ctx.spend(EMIGRATION_COST, `Move to ${COUNTRIES[to].name}`, { credit: true })) return ctx.toast(`An international move costs $${EMIGRATION_COST.toLocaleString()}.`, 'warn');
  arrive(ctx, to, { visa: ['citizen', 'resident'].includes(kind) ? null : kind, keepJob: kind === 'transfer' });
  ctx.toast(`Moved to ${COUNTRIES[to].name}`, 'good');
}

function stillQualifies(state, res) {
  const here = countryIdOf(state);
  if (['work', 'transfer'].includes(res.visa)) return Boolean(state.career.job);
  if (res.visa === 'student') return Boolean(state.education.enrolled);
  if (res.visa === 'family') return nationalityCode(state.people.list.find((p) => p.alive && p.relation === 'spouse')) === here;
  return true;
}

/** Dual nationality: Japan, Korea and India make dual nationals pick one by 22. */
function dualChoice(ctx) {
  const { state } = ctx;
  const list = citizenshipsOf(state);
  const strict = list.find((c) => !IMMIGRATION[c].dualOut);
  if (!strict || list.length < 2 || state.migration?.dualChosen) return;
  ctx.prompt({
    type: 'migration.dual',
    icon: '🛂',
    title: 'Choose Your Nationality',
    text: `${COUNTRIES[strict].name} doesn't allow dual nationality for adults. By 22 you have to choose.`,
    options: list.map((c) => ({ id: c, label: `${COUNTRIES[c].flag} Keep ${COUNTRIES[c].demonym} nationality`, hint: c === strict ? `Give up the others` : `Give up ${COUNTRIES[strict].demonym} nationality` })),
    data: { strict },
  });
}

export const MigrationModule = {
  id: 'migration',
  order: 42,

  init(state) {
    // Lives born abroad before nationalities were tracked: the people around you are locals.
    if (!state.migration && state.character.countryId) for (const p of state.people?.list ?? []) if (p.nationality === 'US') p.nationality = state.character.countryId;
  },

  setup(engine) {
    // A felony conviction starts removal proceedings for anyone who isn't a citizen.
    engine.bus.on('legal:convicted', ({ ctx, severity }) => {
      const res = residencyOf(ctx.state);
      if (!res || severity !== 'felony' || res.removal) return;
      res.removal = true;
      ctx.log(`Immigration authorities opened removal proceedings: a felony conviction ends your right to live in ${COUNTRIES[countryIdOf(ctx.state)].name}.`, '🛂', 'bad');
    });
  },

  onAgeUp(ctx) {
    const { state } = ctx;
    const m = state.migration;
    if (!m) return;
    const age = state.character.age;
    const here = countryIdOf(state);

    // Immersion: living somewhere teaches you the language.
    const lang = localLanguage(here);
    if (age >= 4 && !speaksLocal(state, here)) {
      const before = m.languages[lang] ?? 0;
      m.languages[lang] = Math.min(LANGUAGE_FLUENT, before + Math.round(10 + state.stats.smarts / 8));
      if (m.languages[lang] >= LANGUAGE_FLUENT) ctx.log(`You're fluent in ${lang} now.`, '🗣️', 'good');
    }

    // Permanent residence elsewhere lapses after too long away.
    for (const [cc, rec] of Object.entries(m.residences)) {
      if (cc === here || rec.leftAt == null || rec.status !== 'permanent') continue;
      if (age - rec.leftAt > IMMIGRATION[cc].prLapse) {
        delete m.residences[cc];
        ctx.log(`Your ${IMMIGRATION[cc].pr?.name ?? 'permanent residence'} in ${COUNTRIES[cc].name} lapsed: you've been away too long.`, '🛂', 'warn');
      }
    }

    if (age === 22) dualChoice(ctx);

    const res = residencyOf(state);
    if (!res) return;
    if (res.removal && !state.legal.incarceration) return removal(ctx, 'After your conviction, a judge ordered your removal.');
    const law = IMMIGRATION[here];
    if (res.status === 'visa') {
      if (law.surcharge) ctx.spend(law.surcharge, 'Immigration Health Surcharge', { allowDebt: true });
      if (res.visa === 'student' && state.education.enrolled) res.studied = true;
      let ok = stillQualifies(state, res);
      // Graduates get a few years of work rights to find a job.
      if (!ok && res.visa === 'student' && res.studied && law.visas.student.postStudy) {
        Object.assign(res, { visa: 'work', expires: age + law.visas.student.postStudy, postStudy: true });
        delete res.grace;
        ctx.log(`Your student visa became a ${law.visas.student.postStudy}-year post-study work permit.`, '🎓', 'good');
        ok = true;
      }
      if (ok) delete res.grace;
      else if (res.grace == null) {
        res.grace = age + 1;
        const need = { work: 'a job', transfer: 'a job', student: 'a school enrollment', family: 'your marriage to a citizen' }[res.visa] ?? 'its conditions';
        ctx.log(`Your ${law.visas[res.visa]?.name ?? 'visa'} depends on ${need}. Sort it out within a year or you'll have to leave.`, '🛂', 'warn');
      } else if (age >= res.grace) return removal(ctx, 'Your visa lapsed.');
      if (ok && res.expires != null && age >= res.expires) {
        const rule = law.visas[res.visa];
        res.expires = age + (rule?.years ?? 2);
        ctx.spend(rule?.fee ?? 0, 'Visa renewal', { allowDebt: true });
        ctx.log(`You renewed your ${rule?.name ?? 'visa'}.`, '🛂');
      }
      if (prYearsLeft(state) === 0 && !res.prNotified) {
        res.prNotified = true;
        ctx.log(`You qualify to apply for ${law.pr.name} (Move tab).`, '🪪', 'good');
      }
    }
    if (naturalizationYearsLeft(state) === 0 && !res.natNotified) {
      res.natNotified = true;
      ctx.log(`You've lived here long enough to apply for ${COUNTRIES[here].demonym} citizenship (Move tab).`, '🛂', 'good');
    }
  },

  actions: {
    /** arg: 'CC:route' (route: a visa kind, 'citizen' or 'resident'). */
    emigrate(ctx, arg) {
      const { state, rng } = ctx;
      const [to, kind] = String(arg).split(':');
      if (!COUNTRIES[to] || to === countryIdOf(state)) return;
      const block = departureBlock(state);
      if (block) return ctx.toast(block, 'warn');
      const route = routesTo(state, to).find((r) => r.kind === kind);
      if (!route?.ok) return ctx.toast(route?.reason ?? 'Not eligible', 'warn');
      if (!canAfford(state, EMIGRATION_COST + route.fee)) return ctx.toast(`You need $${(EMIGRATION_COST + route.fee).toLocaleString()} for the move and the application.`, 'warn');
      ensureMigration(state);
      if (!['citizen', 'resident'].includes(kind)) {
        if (yearlyCount(state, `migration.apply.${to}`)) return ctx.toast(`One application to ${COUNTRIES[to].name} a year.`, 'warn');
        bumpYearly(state, `migration.apply.${to}`);
        ctx.spend(route.fee, `${route.rule.name} application`, { credit: true });
        if (!rng.chance(route.odds)) {
          ctx.stat('happiness', -4);
          ctx.log(`Your ${route.rule.name} application was refused${to === 'US' && kind === 'work' ? ' (not picked in the H-1B lottery)' : ''}. You can try again next year.`, '🛂', 'bad');
          return ctx.toast('Visa refused', 'bad');
        }
        ctx.log(`Approved: ${route.rule.name}.`, '🛂', 'good');
      }
      const home = state.housing.properties.find((p) => p.use === 'primary');
      if (home) {
        ctx.prompt({
          type: 'migration.home',
          icon: '🏡',
          title: 'What About Your Home?',
          text: `You own your home in ${REGIONS[home.regionId]?.name ?? 'town'} (worth ~$${Math.round(home.value).toLocaleString()}).`,
          options: [
            { id: 'sell', label: '🪧 Sell it before you go', hint: 'Agent commission + closing costs' },
            { id: 'rent', label: '🔑 Keep it and rent it out', hint: 'Landlord from abroad' },
            { id: 'vacant', label: '🚪 Keep it empty', hint: 'Pay the carrying costs' },
          ],
          data: { to, kind },
        });
        return;
      }
      finishEmigration(ctx, to, kind);
    },

    /** Switch status without leaving (marrying a citizen, finding a sponsor). */
    adjust(ctx, kind) {
      const { state, rng } = ctx;
      const here = countryIdOf(state);
      const res = residencyOf(state);
      if (!res || res.status !== 'visa' || res.visa === kind) return;
      const elig = visaEligibility(state, here, kind);
      if (!elig.ok) return ctx.toast(elig.reason, 'warn');
      if (['work', 'transfer'].includes(kind) && !state.career.job) return ctx.toast('Find a sponsoring job first.', 'warn');
      if (yearlyCount(state, 'migration.adjust')) return ctx.toast('One application a year.', 'warn');
      bumpYearly(state, 'migration.adjust');
      ctx.spend(elig.fee, `${elig.rule.name} application`, { credit: true });
      if (!rng.chance(elig.odds)) return ctx.log(`Your application to switch to a ${elig.rule.name} was refused.`, '🛂', 'bad');
      Object.assign(res, { visa: kind, ...(elig.rule.years ? { expires: state.character.age + elig.rule.years } : {}) });
      delete res.grace;
      if (elig.rule.permanent) Object.assign(res, { status: 'permanent', permanentSince: state.character.age });
      ctx.log(`Approved: you're now here on a ${elig.rule.name}${elig.rule.permanent ? ' — as a permanent resident' : ''}.`, '🛂', 'good');
    },

    applyPR(ctx) {
      const { state, rng } = ctx;
      const here = countryIdOf(state);
      const res = residencyOf(state);
      const law = IMMIGRATION[here];
      if (prYearsLeft(state) !== 0) return ctx.toast('Not eligible yet.', 'warn');
      if (yearlyCount(state, 'migration.pr')) return ctx.toast('One application a year.', 'warn');
      bumpYearly(state, 'migration.pr');
      ctx.spend(law.pr.fee, `${law.pr.name} application`, { credit: true });
      const odds = clamp(0.88 - visibleRecord(state).filter((r) => r.severity !== 'infraction').length * 0.15, 0.1, 0.95);
      if (!rng.chance(odds)) return ctx.log(`Your ${law.pr.name} application was refused. You can reapply next year.`, '🛂', 'bad');
      Object.assign(res, { status: 'permanent', permanentSince: state.character.age });
      delete res.expires;
      delete res.grace;
      ctx.stat('happiness', 8);
      ctx.log(`You were granted ${law.pr.name}. ${COUNTRIES[here].name} is home now, for as long as you like.`, '🪪', 'milestone');
    },

    naturalize(ctx) {
      const { state, rng } = ctx;
      const here = countryIdOf(state);
      const law = IMMIGRATION[here];
      if (naturalizationYearsLeft(state) !== 0) return ctx.toast('Not eligible yet.', 'warn');
      if (!speaksLocal(state, here)) return ctx.toast(`Needs working ${localLanguage(here)}.`, 'warn');
      if (visibleRecord(state).some((r) => r.severity === 'felony')) return ctx.toast('A felony record bars naturalization.', 'warn');
      if (yearlyCount(state, 'migration.nat')) return ctx.toast('One application a year.', 'warn');
      bumpYearly(state, 'migration.nat');
      ctx.spend(law.nat.fee, 'Naturalization application', { credit: true });
      if (!rng.chance(clamp(0.6 + state.stats.smarts / 250, 0.6, 0.97))) return ctx.log('You failed the citizenship test. You can try again next year.', '📝', 'bad');
      const before = citizenshipsOf(state);
      // Some countries make you give up your old passport; some take theirs back when you take another.
      const lost = law.dualIn === false ? before : before.filter((c) => !IMMIGRATION[c].dualOut);
      state.character.citizenships = [...before.filter((c) => !lost.includes(c)), here];
      delete state.migration.residences[here];
      ctx.stat('happiness', 12);
      ctx.log(`You took the oath and became a ${COUNTRIES[here].demonym} citizen. ${COUNTRIES[here].flag}${lost.length ? ` You gave up your ${lost.map((c) => COUNTRIES[c].demonym).join(' and ')} citizenship.` : ''}`, '🛂', 'milestone');
    },

    renounce(ctx, cc) {
      const { state } = ctx;
      const list = citizenshipsOf(state);
      if (!list.includes(cc) || list.length < 2) return ctx.toast('You can\'t become stateless.', 'warn');
      if (cc === countryIdOf(state)) return ctx.toast('Not while you live there.', 'warn');
      ensureMigration(state);
      ctx.spend(cc === 'US' ? 2350 : 300, 'Renunciation of citizenship', { credit: true });
      state.character.citizenships = list.filter((c) => c !== cc);
      ctx.log(`You renounced your ${COUNTRIES[cc].demonym} citizenship.`, '🛂', 'warn');
    },

    /** A year of language classes. */
    study(ctx, language) {
      const { state } = ctx;
      const m = ensureMigration(state);
      if (!language || nativeLanguages(m.birthCountry).includes(language) || (m.languages[language] ?? 0) >= LANGUAGE_FLUENT) return;
      if (yearlyCount(state, 'migration.study')) return ctx.toast('One course a year.', 'warn');
      if (!ctx.spend(LANGUAGE_CLASS_COST, `${language} classes`)) return ctx.toast(`Classes cost $${LANGUAGE_CLASS_COST.toLocaleString()}.`, 'warn');
      bumpYearly(state, 'migration.study');
      m.languages[language] = Math.min(LANGUAGE_FLUENT, (m.languages[language] ?? 0) + Math.round(15 + state.stats.smarts / 6));
      ctx.log(m.languages[language] >= LANGUAGE_FLUENT ? `You finished your ${language} course — fluent at last.` : `You took a year of ${language} classes (${m.languages[language]}% of the way to fluency).`, '🗣️', m.languages[language] >= LANGUAGE_FLUENT ? 'good' : 'info');
    },
  },

  resolvers: {
    home(ctx, data, optionId) {
      ctx.emit('housing:leavingPrimary', { decision: optionId });
      finishEmigration(ctx, data.to, data.kind);
    },
    dual(ctx, data, keep) {
      const { state } = ctx;
      const m = ensureMigration(state);
      m.dualChosen = true;
      const list = citizenshipsOf(state);
      const lost = keep === data.strict ? list.filter((c) => c !== keep) : [data.strict];
      state.character.citizenships = list.filter((c) => !lost.includes(c));
      ctx.log(`You kept your ${COUNTRIES[keep].demonym} nationality and gave up ${lost.map((c) => COUNTRIES[c].demonym).join(' and ')}.`, '🛂', 'milestone');
      // Living somewhere you're no longer a citizen of: you stay as a permanent resident.
      const here = countryIdOf(state);
      if (!state.character.citizenships.includes(here)) m.residences[here] = { status: 'permanent', visa: 'family', arrived: 0, permanentSince: state.character.age };
    },
  },
};
