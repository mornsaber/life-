/**
 * National service where it exists.
 *
 *  - South Korea: every able-bodied man serves 18–21 months between 18 and
 *    28 (Army and Marines 18, Navy 20, Air Force 21). University students
 *    can defer until 28. A weak physical grade means social service instead;
 *    conscientious objectors do 36 months of alternative service in prisons
 *    (since 2020). Refusing is a crime under the Military Service Act.
 *  - Mexico: men register for the Servicio Militar Nacional at 18 and draw a
 *    ball: one in two trains on Saturdays for a year. Registration earns the
 *    cartilla, which many government jobs and a passport still ask for.
 *  - Germany: since 2026 every 18-year-old man gets a questionnaire about
 *    serving (women may answer); volunteers serve at least six months, paid
 *    about €2,600 a month.
 *
 * state.military.conscription = { status: 'pending'|'deferred'|'serving'|'served'|'social'|'alternative'|'exempt'|'evaded', grade, until }
 */
import { isAbroad, countryOf, isCitizen } from './Countries.js';
import { FORCES } from './NationalForces.js';
import { recordNationalService, cityOf } from '../emergency/PaidOpportunities.js';

/** Months of service by branch (Korea, 2025). */
export const KOREA_MONTHS = { army: 18, marines: 18, navy: 20, airforce: 21 };

/** The age after which an unserved obligation lapses (Korea: 37; Mexico registers at 18). */
const CONSCRIPTION_AGE_LIMIT = { korea: 37, smn: 40, questionnaire: 25, universal: 30, lottery: 30, graduate: 30 };
const conscriptionOf = (state) => (isAbroad(state) ? FORCES[countryOf(state).id]?.conscription ?? null : null);
/** The kind of national service: 'korea', 'smn', 'questionnaire', or a declared scheme's kind ('universal', 'lottery'). */
const kind = (state) => { const c = conscriptionOf(state); return typeof c === 'string' ? c : c?.kind ?? null; };
const record = (state) => (state.military.conscription ??= { status: 'pending' });

/** Physical grade (1–7) from health and fitness: 1–3 active duty, 4 social service, 5–6 exempt in peacetime. */
export function physicalGrade(state) {
  const h = state.stats.health;
  const f = state.stats.fitness;
  if (h < 30) return 6;
  if (h < 45) return 5;
  if (h < 60 || f < 30) return 4;
  return h + f >= 150 ? 1 : h + f >= 120 ? 2 : 3;
}

function koreaPrompt(ctx) {
  const { state } = ctx;
  const age = state.character.age;
  const c = record(state);
  const grade = (c.grade ??= physicalGrade(state));
  if (grade >= 5) {
    c.status = 'exempt';
    ctx.log(`Your conscription physical came back grade ${grade}: exempt from service in peacetime.`, '🩺', 'info');
    return;
  }
  const student = Boolean(state.education.enrolled) && age < 28;
  const enlist = (id, label) => ({ id, label: `${FORCES.KR.branches[id].icon} ${label}`, hint: `${KOREA_MONTHS[id]} months` });
  ctx.prompt({
    type: 'conscription.korea',
    icon: '🇰🇷',
    title: grade === 4 ? 'Conscription: Social Service' : 'Conscription Notice',
    text: grade === 4
      ? `Your physical came back grade 4. You'll serve 21 months as a social service agent (public offices, welfare centers, subway stations) instead of in uniform.`
      : `Physical grade ${grade}. Every able-bodied man serves before he turns 28.${student ? ' As a university student you can put it off.' : age >= 27 ? ' This is your last year to defer.' : ''}`,
    options: grade === 4
      ? [{ id: 'social', label: '🏢 Report for social service', hint: '21 months, live at home' }, { id: 'social119', label: '🚒 Social service at a 119 safety center', hint: '21 months alongside firefighters: counts if you join the fire service' }, { id: 'refuse', label: '🙅 Refuse to serve', hint: 'A crime: prison', tone: 'danger' }]
      : [
          enlist('army', 'Army'),
          enlist('navy', 'Navy'),
          enlist('airforce', 'Air Force'),
          ...(state.stats.fitness >= 60 ? [enlist('marines', 'Marine Corps')] : []),
          ...(student ? [{ id: 'defer', label: '🎓 Defer while you study', hint: 'Until 28 at the latest' }] : []),
          { id: 'alternative', label: '🕊️ Conscientious objection', hint: '36 months of alternative service in prisons' },
          { id: 'refuse', label: '🙅 Refuse to serve', hint: 'A crime: about 18 months in prison', tone: 'danger' },
        ],
    data: {},
  });
}

function mexicoPrompt(ctx) {
  ctx.prompt({
    type: 'conscription.mexico',
    icon: '🇲🇽',
    title: 'Servicio Militar Nacional',
    text: 'Every Mexican man must register at 18 — it\'s compulsory under the Ley del Servicio Militar. A lottery decides who trains: a white ball means you\'re on reserve; a black ball means a year of Saturday training. Registering earns your cartilla.',
    options: [
      { id: 'register', label: '📝 Register and draw', hint: 'Half train on Saturdays for a year' },
      { id: 'skip', label: '🙈 Dodge registration', hint: 'Illegal: no cartilla, barred from government jobs and a passport until you regularise', tone: 'danger' },
    ],
    data: {},
  });
}

function germanyPrompt(ctx) {
  ctx.prompt({
    type: 'conscription.germany',
    icon: '🇩🇪',
    title: 'Wehrdienst Questionnaire',
    text: 'At 18 you get the Bundeswehr\'s questionnaire about serving. Volunteers do at least six months (a year here), paid about €2,600 a month, with the option to stay on.',
    options: [
      { id: 'volunteer', label: '🪖 Volunteer for a year of service', hint: 'Heer, Marine or Luftwaffe' },
      { id: 'feuerwehr', label: '🚒 Commit to the Freiwillige Feuerwehr instead', hint: 'Civil protection service: counts toward a career with the Berufsfeuerwehr' },
      { id: 'decline', label: '📨 Not interested', hint: 'Answer the form and move on' },
    ],
    data: {},
  });
}

/**
 * A country's own universal national service (Israel, Singapore, Egypt, Vietnam…): every
 * citizen of the listed genders serves at 18 for `months` (by gender), with deferment for
 * study where allowed, alternative civilian service where it exists, and prison for refusal.
 *   { kind: 'universal', age, months: { male, female }, genders, branches, defer, alternative: { label, months, desc }, name }
 * A ballot draft (Brazil, Thailand…) calls up only a share of those who register:
 *   { kind: 'lottery', age, months, share, name }
 */
function universalPrompt(ctx, scheme) {
  const { state } = ctx;
  const c = record(state);
  const months = scheme.months?.[state.character.gender] ?? scheme.months?.male ?? 24;
  const student = scheme.defer && Boolean(state.education.enrolled) && state.character.age < (scheme.deferUntil ?? 25);
  const forces = FORCES[countryOf(state).id];
  const branches = (scheme.branches ?? Object.keys(forces?.branches ?? { army: 1 }).filter((b) => b !== 'guard')).filter((b) => forces?.branches?.[b]);
  ctx.prompt({
    type: 'conscription.universal', icon: countryOf(state).flag ?? '🪖', title: scheme.name ?? 'National Service',
    text: `${scheme.text ?? `National service is compulsory: ${Math.round(months / 12 * 10) / 10} years for you, starting now.`}${student ? ' You can defer while you study.' : ''}`,
    options: [
      ...branches.map((b) => ({ id: `serve:${b}`, label: `${forces.branches[b].icon ?? '🪖'} Serve in the ${forces.branches[b].name}`, hint: `${months} months` })),
      ...(student ? [{ id: 'defer', label: '🎓 Defer while you study' }] : []),
      ...(scheme.alternative ? [{ id: 'alternative', label: `🕊️ ${scheme.alternative.label}`, hint: scheme.alternative.desc ?? `${scheme.alternative.months} months` }] : []),
      { id: 'refuse', label: '🙅 Refuse to serve', hint: 'A crime: prison', tone: 'danger' },
    ],
    data: { months },
  });
  c.grade ??= physicalGrade(state);
}

function lotteryPrompt(ctx, scheme) {
  ctx.prompt({
    type: 'conscription.lottery', icon: countryOf(ctx.state).flag ?? '🪖', title: scheme.name ?? 'Military Registration',
    text: scheme.text ?? `Registering at ${scheme.age ?? 18} is compulsory. Only some of those registered are called up to serve.`,
    options: [{ id: 'register', label: '📝 Register', hint: `About ${Math.round((scheme.share ?? 0.1) * 100)}% are called up` }, { id: 'skip', label: '🙈 Dodge registration', hint: 'Illegal: barred from public jobs, fines', tone: 'danger' }],
    data: {},
  });
}

export const ConscriptionModule = {
  id: 'conscription',
  order: 41.6,

  onAgeUp(ctx) {
    const { state } = ctx;
    const k = kind(state);
    const scheme = conscriptionOf(state);
    const genders = scheme && typeof scheme === 'object' ? scheme.genders ?? ['male'] : ['male'];
    if (!k || !genders.includes(state.character.gender) || !isCitizen(state, countryOf(state).id)) return;
    if (state.legal.incarceration || state.military.service) return;
    const age = state.character.age;
    const c = record(state);
    // A career in the country's own forces discharges the duty; past the age limit it lapses.
    if (['pending', 'deferred'].includes(c.status) && state.military.history.some((h) => (h.nation ?? 'US') === countryOf(state).id && (h.yearsOfService ?? 0) >= 1)) {
      c.status = 'served';
      return;
    }
    if (['pending', 'deferred'].includes(c.status) && age > (CONSCRIPTION_AGE_LIMIT[k] ?? 30)) {
      c.status = 'exempt';
      return ctx.log('You aged out of the national service obligation.', '📜', 'info');
    }
    if (k === 'korea') {
      if (['alternative', 'social'].includes(c.status) && age >= c.until) {
        ctx.log(c.status === 'social' ? 'You finished your social service. Duty done.' : 'You finished 36 months of alternative service. Duty done.', '✅', 'good');
        if (c.post === 'fire') recordNationalService(state, { serviceId: 'fire', unit: c.unit, rankTitle: 'Social Service Agent (119)', years: 2, startAge: c.startAge ?? age - 2 });
        c.status = 'served';
        return;
      }
      if (!['pending', 'deferred'].includes(c.status) || age < 19) return;
      if (c.status === 'deferred' && age < 28 && state.education.enrolled) return;
      koreaPrompt(ctx);
    } else if (k === 'smn' && age === 18 && c.status === 'pending') {
      mexicoPrompt(ctx);
    } else if (k === 'questionnaire' && age === 18 && c.status === 'pending') {
      germanyPrompt(ctx);
    } else if (k === 'universal') {
      if (['alternative', 'social'].includes(c.status) && age >= c.until) {
        c.status = 'served';
        return ctx.log('You finished your alternative national service. Duty done.', '✅', 'good');
      }
      if (!['pending', 'deferred'].includes(c.status) || age < (scheme.age ?? 18)) return;
      if (c.status === 'deferred' && state.education.enrolled && age < (scheme.deferUntil ?? 25)) return;
      universalPrompt(ctx, scheme);
    } else if (k === 'lottery' && age === (scheme.age ?? 18) && c.status === 'pending') {
      lotteryPrompt(ctx, scheme);
    } else if (k === 'graduate') {
      // A year of civilian national service for every graduate (Nigeria's NYSC).
      if (c.status === 'social' && age >= c.until) {
        c.status = 'served';
        return ctx.log(`You completed your ${scheme.name ?? 'national service'} year and collected your discharge certificate.`, '✅', 'good');
      }
      const graduated = state.education.degrees.some((d) => ['bachelor', 'master', 'doctorate', 'professional'].includes(d.type));
      if (c.status !== 'pending' || !graduated || state.education.enrolled) return;
      ctx.prompt({
        type: 'conscription.graduate', icon: countryOf(state).flag ?? '🎓', title: scheme.name ?? 'National Youth Service',
        text: scheme.text ?? 'Every graduate under 30 serves a compulsory year of national service.',
        options: [{ id: 'serve', label: `🎓 Report for your service year`, hint: `${scheme.months ?? 12} months, a monthly allowance` }, { id: 'skip', label: '🙈 Don\'t report', hint: 'No discharge certificate: barred from public jobs', tone: 'danger' }],
        data: {},
      });
    }
  },

  resolvers: {
    graduate(ctx, _data, optionId) {
      const { state } = ctx;
      const c = record(state);
      const scheme = conscriptionOf(state);
      if (optionId === 'skip') {
        c.status = 'evaded';
        return ctx.log(`You didn't report for ${scheme?.name ?? 'national service'}. Without the discharge certificate, government employers won't hire you.`, '🙈', 'warn');
      }
      Object.assign(c, { status: 'social', until: state.character.age + Math.max(1, Math.round((scheme?.months ?? 12) / 12)) });
      if (scheme?.allowance) ctx.earn(scheme.allowance, `${scheme.name} allowance`, { wage: true });
      return ctx.log(`You began your ${scheme?.name ?? 'national service'} year${scheme?.posting ? `: ${scheme.posting}` : ''}.`, '🎓', 'milestone');
    },
    universal(ctx, data, optionId) {
      const { state } = ctx;
      const c = record(state);
      const scheme = conscriptionOf(state);
      if (optionId === 'defer') {
        c.status = 'deferred';
        return ctx.log('You deferred your national service while you study.', '🎓');
      }
      if (optionId === 'alternative') {
        Object.assign(c, { status: 'alternative', until: state.character.age + Math.max(1, Math.round((scheme.alternative?.months ?? data.months) / 12)) });
        return ctx.log(`You began ${scheme.alternative?.label?.toLowerCase() ?? 'alternative service'}.`, '🕊️');
      }
      if (optionId === 'refuse') {
        c.status = 'evaded';
        ctx.emit('legal:offense', { offenseId: 'serviceRefusal', context: 'refusing national service', caught: true });
        return undefined;
      }
      const branch = String(optionId).split(':')[1] ?? 'army';
      ctx.emit('conscription:enlist', { branch, months: data.months });
      c.status = 'serving';
      return undefined;
    },
    lottery(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const c = record(state);
      const scheme = conscriptionOf(state);
      if (optionId === 'skip') {
        c.status = 'evaded';
        return ctx.log('You never registered for military service. Public-sector employers will ask for proof.', '🙈', 'warn');
      }
      if (rng.chance(scheme.share ?? 0.1)) {
        ctx.log(`You were called up: ${scheme.months ?? 12} months of service.`, '📨', 'military');
        ctx.emit('conscription:enlist', { branch: scheme.branch ?? 'army', months: scheme.months ?? 12 });
        c.status = 'serving';
        return undefined;
      }
      c.status = 'exempt';
      return ctx.log('You registered and weren\'t called up: excess contingent, on the reserve list.', '📋', 'good');
    },
    korea(ctx, _data, optionId) {
      const { state } = ctx;
      const c = record(state);
      const age = state.character.age;
      if (optionId === 'defer') {
        c.status = 'deferred';
        return ctx.log('You deferred your military service while you study.', '🎓');
      }
      if (optionId === 'social' || optionId === 'social119') {
        Object.assign(c, { status: 'social', until: age + 2, ...(optionId === 'social119' ? { post: 'fire', unit: `${cityOf(state)} 119 Safety Center`, startAge: age } : {}) });
        if (optionId === 'social119') {
          ctx.stat('stress', 3);
          return ctx.log(`You started 21 months as a social service agent at the ${c.unit}: admin, equipment checks and ride-alongs with the crews.`, '🚒');
        }
        ctx.stat('stress', 3);
        return ctx.log('You started 21 months as a social service agent at a district office.', '🏢');
      }
      if (optionId === 'alternative') {
        Object.assign(c, { status: 'alternative', until: age + 3 });
        ctx.stat('happiness', -6);
        return ctx.log('You were recognized as a conscientious objector: 36 months of alternative service, living and working in a correctional facility.', '🕊️', 'warn');
      }
      if (optionId === 'refuse') {
        c.status = 'evaded';
        ctx.emit('legal:offense', { offenseId: 'serviceRefusal', context: 'refusing conscription', caught: true });
        return undefined;
      }
      ctx.emit('conscription:enlist', { branch: optionId, months: KOREA_MONTHS[optionId] });
      c.status = 'serving';
      return undefined;
    },
    mexico(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const c = record(state);
      if (optionId === 'skip') {
        c.status = 'evaded';
        return ctx.log('You never registered for the Servicio Militar Nacional. No cartilla.', '🙈', 'warn');
      }
      state.military.cartilla = true;
      if (rng.chance(0.5)) {
        c.status = 'served';
        ctx.stat('fitness', 3);
        ctx.stat('stress', 2);
        return ctx.log('You drew a black ball: a year of Saturday drill. Your cartilla was released at the end.', '⚫', 'military');
      }
      c.status = 'exempt';
      return ctx.log('You drew a white ball: on reserve, no training. Your cartilla came in the mail.', '⚪', 'good');
    },
    germany(ctx, _data, optionId) {
      const c = record(ctx.state);
      if (optionId === 'feuerwehr') {
        Object.assign(c, { status: 'served', alternative: 'feuerwehr' });
        ctx.log('You answered the questionnaire with a commitment to the Freiwillige Feuerwehr: civil protection in place of military service.', '🚒', 'milestone');
        ctx.emit('emergency:enrol', { serviceId: 'fire' });
        return undefined;
      }
      if (optionId === 'decline') {
        c.status = 'exempt';
        return ctx.log('You sent back the Bundeswehr questionnaire: not interested.', '📨');
      }
      ctx.emit('conscription:enlist', { branch: 'army', months: 12 });
      c.status = 'serving';
      return undefined;
    },
  },
};
