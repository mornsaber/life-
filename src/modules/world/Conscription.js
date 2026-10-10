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

/** Months of service by branch (Korea, 2025). */
export const KOREA_MONTHS = { army: 18, marines: 18, navy: 20, airforce: 21 };

const kind = (state) => (isAbroad(state) ? FORCES[countryOf(state).id]?.conscription ?? null : null);
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
      ? [{ id: 'social', label: '🏢 Report for social service', hint: '21 months, live at home' }, { id: 'refuse', label: '🙅 Refuse to serve', hint: 'A crime: prison', tone: 'danger' }]
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
    text: 'Every Mexican man registers at 18. A lottery decides who trains: a white ball means you\'re on reserve; a black ball means a year of Saturday training. Registering earns your cartilla.',
    options: [
      { id: 'register', label: '📝 Register and draw', hint: 'Half train on Saturdays for a year' },
      { id: 'skip', label: '🙈 Don\'t register', hint: 'No cartilla: some government jobs ask for it' },
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
      { id: 'decline', label: '📨 Not interested', hint: 'Answer the form and move on' },
    ],
    data: {},
  });
}

export const ConscriptionModule = {
  id: 'conscription',
  order: 41.6,

  onAgeUp(ctx) {
    const { state } = ctx;
    const k = kind(state);
    if (!k || state.character.gender !== 'male' || !isCitizen(state, countryOf(state).id)) return;
    if (state.legal.incarceration || state.military.service) return;
    const age = state.character.age;
    const c = record(state);
    if (k === 'korea') {
      if (['alternative', 'social'].includes(c.status) && age >= c.until) {
        ctx.log(c.status === 'social' ? 'You finished your social service. Duty done.' : 'You finished 36 months of alternative service. Duty done.', '✅', 'good');
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
    }
  },

  resolvers: {
    korea(ctx, _data, optionId) {
      const { state } = ctx;
      const c = record(state);
      const age = state.character.age;
      if (optionId === 'defer') {
        c.status = 'deferred';
        return ctx.log('You deferred your military service while you study.', '🎓');
      }
      if (optionId === 'social') {
        Object.assign(c, { status: 'social', until: age + 2 });
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
