/**
 * Two ways out of school that other countries do their own way.
 *
 *  - University entrance exams. Korea's suneung, Japan's common test, India's
 *    JEE/CUET, the A-levels, the Abitur, the bac, Australia's ATAR: one score
 *    that decides where you can study. You sit it in your last school year;
 *    cram schools (hagwon, juku, coaching centres) raise the score and the
 *    stress, and in Korea and Japan many re-sit a year later. The score feeds
 *    university admission odds (an ADMISSION_HOOK).
 *  - Apprenticeships. Germany's dual system (and the UK's, Canada's Red Seal,
 *    Australia's, France's apprentissage, Italy's apprendistato, India's NAPS):
 *    a paid three-year training contract with an employer and a trade school,
 *    ending in a journeyman's exam that counts as the trade qualification.
 *
 * state.education.entrance = { exam, score, age, sittings }
 * state.apprenticeship = { trade, yearsLeft, pay, employer } | null
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { ADMISSION_HOOKS } from '../education/EducationEngine.js';
import { inK12, hasDiploma } from '../education/K12.js';
import { ENTRANCE_EXAMS } from './CountryLaw.js';

const ppp = (local, rate) => Math.round(local / rate);

export { ENTRANCE_EXAMS };

/** Countries with formal apprenticeship systems: name, years, pay a year (PPP) and the exam at the end. */
export const APPRENTICESHIP_SYSTEMS = {
  DE: { name: 'Ausbildung (dual system)', years: 3, pay: ppp(12500, 0.72), exam: 'Gesellenprüfung' },
  GB: { name: 'Apprenticeship', years: 3, pay: ppp(15000, 0.68), exam: 'end-point assessment' },
  CA: { name: 'Red Seal apprenticeship', years: 4, pay: ppp(38000, 1.2), exam: 'Red Seal exam' },
  AU: { name: 'Australian Apprenticeship', years: 4, pay: ppp(32000, 1.45), exam: 'trade certificate (Cert III)' },
  FR: { name: 'Apprentissage (CAP/BP)', years: 2, pay: ppp(11000, 0.71), exam: 'CAP' },
  IT: { name: 'Apprendistato', years: 3, pay: ppp(16000, 0.64), exam: 'qualifica professionale' },
  IN: { name: 'National Apprenticeship (NAPS)', years: 2, pay: ppp(108000, 22), exam: 'All India Trade Test' },
};

/** The trades you can learn: the diploma it counts as, and the license it earns where one applies. */
export const TRADES = {
  electrician: { name: 'Electrician', icon: '⚡', programId: 'electricalTech', credential: 'journeymanElectrician' },
  plumber: { name: 'Plumber', icon: '🚰', programId: 'plumbingTech', credential: 'journeymanPlumber' },
  hvac: { name: 'Heating & ventilation fitter', icon: '❄️', programId: 'hvacTech' },
  welder: { name: 'Welder / metalworker', icon: '🔥', programId: 'weldingTech' },
  mechanic: { name: 'Motor mechanic', icon: '🔧', programId: 'autoTech' },
  machinist: { name: 'Industrial mechanic (CNC)', icon: '⚙️', programId: 'machinistTech' },
  chef: { name: 'Chef', icon: '👨‍🍳', programId: 'culinaryArts' },
  hairdresser: { name: 'Hairdresser', icon: '💇', programId: 'cosmetologySchool', credential: 'cosmetologyLicense' },
};

const examHere = (state) => ENTRANCE_EXAMS[state.character.countryId] ?? null;
export const apprenticeshipHere = (state) => APPRENTICESHIP_SYSTEMS[state.character.countryId] ?? null;

/** Your expected entrance score (0–100) from smarts, grades and prep. */
export function expectedScore(state, prepped = false) {
  const gpa = state.k12?.gpa ?? 2.8;
  return Math.round(clamp(state.stats.smarts * 0.6 + (gpa - 2) * 15 + (prepped ? 9 : 0), 5, 99));
}

function sitPrompt(ctx, resit = false) {
  const { state } = ctx;
  const e = examHere(state);
  ctx.prompt({
    type: 'schoolPaths.exam',
    icon: '📝',
    title: resit ? `Re-sit the ${e.name}?` : `The ${e.name}`,
    text: resit
      ? `Your score was ${state.education.entrance.score}. Many students spend a year studying full-time and sit again${e.resit ? ` (${e.resit})` : ''}.`
      : `Your last school year: one exam decides which universities will take you. Expected score about ${expectedScore(state)}/100 (${expectedScore(state, true)} with ${e.prep.name}).`,
    options: [
      { id: 'cram', label: `📚 ${e.prep.name[0].toUpperCase()}${e.prep.name.slice(1)} every evening`, hint: `$${e.prep.cost.toLocaleString()} · +stress · a better score` },
      { id: 'study', label: '📖 Study on your own', hint: 'Free' },
      ...(resit ? [{ id: 'accept', label: '✅ Keep the score you have' }] : [{ id: 'skip', label: '🙅 Don\'t bother', hint: 'No score: universities will be hard to get into' }]),
    ],
    data: { resit },
  });
}

/* Admission: the entrance score matters as much as the country says it does. */
ADMISSION_HOOKS.push({
  boost(state, programId, schoolId) {
    const e = examHere(state);
    const ent = state.education.entrance;
    if (!e || !['bachelor'].includes(programId) || !['state', 'private', 'elite'].includes(schoolId)) return 0;
    if (!ent) return -0.25 * e.weight;
    const scale = schoolId === 'elite' ? 1.4 : 1;
    return ((ent.score - 60) / 100) * e.weight * scale;
  },
});

export const SchoolPathsModule = {
  id: 'schoolPaths',
  order: 11,

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const age = state.character.age;
    const e = examHere(state);
    // The exam comes in your last school year.
    if (e && age === 17 && inK12(state) && !state.education.entrance && !state.prompts.some((p) => p.type === 'schoolPaths.exam')) sitPrompt(ctx);

    const a = state.apprenticeship;
    if (!a) return;
    const sys = APPRENTICESHIP_SYSTEMS[a.country] ?? apprenticeshipHere(state);
    if (!sys || state.legal.incarceration || (state.character.countryId ?? 'US') !== a.country) {
      state.apprenticeship = null;
      return ctx.log('Your apprenticeship ended without a qualification.', '🔧', 'warn');
    }
    ctx.earn(a.pay, `${sys.name} — ${a.employer}`, { wage: true });
    a.yearsLeft -= 1;
    if (a.yearsLeft > 0) return;
    const trade = TRADES[a.trade];
    const pass = rng.chance(clamp(0.7 + (state.stats.smarts - 50) / 200 + (a.effort ?? 0), 0.4, 0.97));
    if (!pass) {
      a.yearsLeft = 1;
      return ctx.log(`You failed the ${sys.exam}. Your employer kept you on for another year to re-sit it.`, '📝', 'bad');
    }
    state.apprenticeship = null;
    state.education.degrees.push({ type: 'vocational', programId: trade.programId, major: null, schoolId: 'technical', year: age, apprenticeship: true });
    if (trade.credential) ctx.emit('credential:grant', { id: trade.credential, silent: true });
    ctx.stat('happiness', 8);
    ctx.log(`You passed the ${sys.exam}: a qualified ${trade.name.toLowerCase()}${trade.credential ? ', licensed to work on your own' : ''}. 🎓`, trade.icon, 'milestone');
  },

  actions: {
    /** Start an apprenticeship. arg: trade id */
    apprentice(ctx, tradeId) {
      const { state, rng } = ctx;
      const sys = apprenticeshipHere(state);
      const trade = TRADES[tradeId];
      const check = apprenticeEligibility(state);
      if (!sys || !trade) return;
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      if (yearlyCount(state, 'schoolPaths.apprentice')) return ctx.toast('One application round a year.', 'warn');
      bumpYearly(state, 'schoolPaths.apprentice');
      if (!rng.chance(clamp(0.55 + (state.stats.smarts - 50) / 150 + (state.k12?.resume ?? 0) * 0.02, 0.2, 0.92))) return ctx.log(`No ${trade.name.toLowerCase()} apprenticeship offer this year. Try again next year.`, '🔧', 'warn');
      const employer = rng.pick(['a family firm', 'a mid-sized contractor', 'a local workshop', 'an industrial employer', 'the city works department']);
      state.apprenticeship = { trade: tradeId, yearsLeft: sys.years, pay: sys.pay, employer, country: state.character.countryId, startAge: state.character.age };
      ctx.log(`You signed a ${sys.years}-year ${sys.name} contract as a trainee ${trade.name.toLowerCase()} with ${employer}: paid $${sys.pay.toLocaleString()} a year while you learn.`, trade.icon, 'milestone');
    },
    quitApprenticeship(ctx) {
      if (!ctx.state.apprenticeship) return;
      ctx.state.apprenticeship = null;
      ctx.log('You quit your apprenticeship.', '🚪', 'warn');
    },
  },

  resolvers: {
    exam(ctx, data, optionId) {
      const { state, rng } = ctx;
      const e = examHere(state);
      if (!e) return;
      if (optionId === 'accept') return;
      if (optionId === 'skip') return ctx.log(`You skipped the ${e.name}.`, '📝', 'warn');
      const cram = optionId === 'cram';
      if (cram) {
        ctx.spend(e.prep.cost, e.prep.name, { allowDebt: true });
        ctx.stat('stress', 12);
        ctx.stat('happiness', -4);
      }
      const score = Math.round(clamp(expectedScore(state, cram) + rng.int(-10, 10), 1, 100));
      const prev = state.education.entrance;
      const best = Math.max(score, prev?.score ?? 0);
      state.education.entrance = { exam: e.name, score: best, age: state.character.age, sittings: (prev?.sittings ?? 0) + 1 };
      ctx.log(`You scored ${score}/100 on the ${e.name}${prev ? ` (your best: ${best})` : ''}.`, '📝', score >= 75 ? 'good' : score < 45 ? 'bad' : 'info');
      // A disappointing score: re-sit next year (Korea, Japan, India, Mexico).
      if (e.resit && score < 65 && !data.resit) state.education.entrance.resitAt = state.character.age + 1;
    },
  },
};

/** Can you start an apprenticeship? */
export function apprenticeEligibility(state) {
  const sys = apprenticeshipHere(state);
  const age = state.character.age;
  if (!sys) return { ok: false, reason: 'No apprenticeship system here' };
  if (state.apprenticeship) return { ok: false, reason: 'Already an apprentice' };
  if (age < 16 || age > 35) return { ok: false, reason: 'Ages 16–35' };
  if (age < 18 && inK12(state)) return { ok: false, reason: 'Finish school first' };
  if (!hasDiploma(state) && age >= 18) return { ok: false, reason: 'Needs a school-leaving certificate' };
  if (state.career.job) return { ok: false, reason: 'Leave your job first' };
  if (state.education.enrolled) return { ok: false, reason: 'Already in school' };
  return { ok: true };
}

/** A re-sit offered the year after a disappointing score. */
export function resitTick(ctx) {
  const ent = ctx.state.education.entrance;
  if (ent?.resitAt === ctx.state.character.age && !ctx.state.education.enrolled) {
    delete ent.resitAt;
    sitPrompt(ctx, true);
  }
}
SchoolPathsModule.onYearEnd = (ctx) => resitTick(ctx);

export const examName = (countryId) => ENTRANCE_EXAMS[countryId]?.name ?? null;
