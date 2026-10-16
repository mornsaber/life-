/**
 * Direct entry: in many countries graduates can join a police force (or another ranked
 * service) above the bottom rung through a competitive exam, instead of starting as a
 * constable and working up.
 *
 *   India     a Sub-Inspector straight from the state recruitment board; the Indian Police
 *             Service through the UPSC Civil Services Exam (a few hundred places for about
 *             a million candidates), trained at the national police academy in Hyderabad.
 *   UK        Direct Entry Inspector, and the Met's Direct Entry Superintendent for proven
 *             leaders from outside policing.
 *   France    the external concours for lieutenant and for commissaire (ENSP).
 *   Germany   the gehobener Dienst: a three-year police bachelor's, then Polizeikommissar.
 *   Italy, Spain, Korea, Japan, the Philippines: their officer-entry exams and academies.
 *
 * Direct entrants are on an accelerated track: they qualify for promotion sooner.
 *
 * DIRECT_ENTRY[country][professionId] = [{ id, name, levelId, education, maxAge, workYears, odds, attempts, school }]
 */
import { yearlyCount, bumpYearly, meetsEducation } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { getProfession } from './JobTrees.js';
import { levelById } from './Ladder.js';
import { createEmployer } from './Employers.js';
import { hire, backgroundCheck } from './CareerEngine.js';
import { isCitizen } from '../world/Countries.js';
import { totalWorkYears } from '../credentials/LicensingEngine.js';
import { PACKS } from '../world/packs/index.js';

const route = (id, name, levelId, opts) => ({ id, name, levelId, education: 'bachelor', maxAge: 35, odds: 0.2, ...opts });

export const DIRECT_ENTRY = {
  IN: {
    statePolice: [
      route('si', 'Direct-entry Sub-Inspector (state police recruitment board)', 'sergeant', { maxAge: 28, odds: 0.18, school: 'the state police academy' }),
      route('dsp', 'Deputy Superintendent of Police (State Public Service Commission)', 'captain', { maxAge: 35, odds: 0.05, school: 'the state police academy' }),
      route('ips', 'Indian Police Service (UPSC Civil Services Exam)', 'captain', { maxAge: 32, odds: 0.02, attempts: 6, smarts: 80, school: 'the Sardar Vallabhbhai Patel National Police Academy, Hyderabad' }),
    ],
  },
  GB: {
    police: [
      route('dei', 'Direct Entry Inspector', 'lieutenant', { odds: 0.15, school: 'a two-year direct-entry programme' }),
      route('des', 'Direct Entry Superintendent (Metropolitan Police)', 'deputyChief', { education: 'bachelor', workYears: 8, maxAge: 55, odds: 0.06, leadership: true, school: 'an 18-month direct-entry programme' }),
    ],
  },
  FR: {
    statePolice: [
      route('lieutenant', 'Concours externe de lieutenant de police', 'lieutenant', { odds: 0.12, school: 'the École nationale supérieure de la police (ENSP)' }),
      route('commissaire', 'Concours externe de commissaire de police', 'detCaptain', { education: 'master', odds: 0.04, smarts: 75, school: 'the ENSP, Saint-Cyr-au-Mont-d\'Or' }),
    ],
  },
  DE: { statePolice: [route('gehoben', 'Gehobener Polizeivollzugsdienst (Bachelor, Hochschule der Polizei)', 'lieutenant', { education: 'highschool', maxAge: 32, odds: 0.3, school: 'three years at the Hochschule der Polizei' })] },
  IT: {
    statePolice: [
      route('ispettore', 'Concorso per vice ispettore (Polizia di Stato)', 'sergeant', { education: 'highschool', maxAge: 28, odds: 0.15, school: 'the Scuola per ispettori, Nettuno' }),
      route('commissario', 'Concorso per commissario (Polizia di Stato)', 'captain', { education: 'master', maxAge: 30, odds: 0.05, school: 'the Scuola Superiore di Polizia, Rome' }),
    ],
  },
  ES: { statePolice: [route('inspector', 'Oposición a Inspector (Escala Ejecutiva, Policía Nacional)', 'lieutenant', { odds: 0.08, school: 'the Escuela Nacional de Policía, Ávila' })] },
  KR: { statePolice: [route('gyeongwi', 'Police officer candidate exam (Gyeongwi, 간부후보생)', 'sergeant', { maxAge: 40, odds: 0.06, school: 'the Korean National Police University' })] },
  JP: { statePolice: [route('class1', 'National Public Service Exam, Class I (NPA career track)', 'sergeant', { maxAge: 30, odds: 0.04, smarts: 80, school: 'the National Police Academy, Tokyo' })] },
  PH: { police: [route('pnpa', 'Philippine National Police Academy (cadetship)', 'lieutenant', { education: 'highschool', maxAge: 22, odds: 0.1, school: 'four years at the PNPA, Silang' }), route('lateral', 'Lateral entry for professionals (lawyers, doctors, engineers)', 'captain', { education: 'professional', maxAge: 46, odds: 0.2 })] },
};
// Routes are a country's own: a pack declares them (it never inherits its base country's).
for (const p of PACKS) if (p.tables?.DIRECT_ENTRY) DIRECT_ENTRY[p.id] = p.tables.DIRECT_ENTRY;

const countryOf = (state) => state.character.countryId ?? 'US';
export const directEntryRoutes = (state, professionId) => DIRECT_ENTRY[countryOf(state)]?.[professionId] ?? [];

const EDU = { highschool: { level: 'highschool' }, bachelor: { level: 'bachelor' }, master: { level: 'master' }, professional: { level: 'professional' } };
const attempts = (state, id) => state.career.directEntry?.[id] ?? 0;

/** Can you sit this route's exam this year? */
export function directEntryEligibility(state, professionId, routeId) {
  const r = directEntryRoutes(state, professionId).find((x) => x.id === routeId);
  if (!r) return { ok: false, reason: 'No such route here' };
  const age = state.character.age;
  if (!isCitizen(state, countryOf(state))) return { ok: false, reason: 'Citizens only' };
  if (age < 18 || age > r.maxAge) return { ok: false, reason: `Ages 18–${r.maxAge}` };
  if (!meetsEducation(state, EDU[r.education] ?? EDU.bachelor)) return { ok: false, reason: `Needs a ${r.education === 'highschool' ? 'school-leaving qualification' : r.education === 'professional' ? 'professional degree' : `${r.education}'s degree`}` };
  if (r.workYears && totalWorkYears(state) < r.workYears) return { ok: false, reason: `${r.workYears}+ years' work experience` };
  if (r.leadership && !(state.career.history.some((h) => h.title && /manager|director|head|chief|lead/i.test(h.title)) || state.career.job?.abilities?.includes('supervise'))) return { ok: false, reason: 'Proven leadership experience' };
  if (r.attempts && attempts(state, r.id) >= r.attempts) return { ok: false, reason: `All ${r.attempts} attempts used` };
  if (yearlyCount(state, `directEntry.${r.id}`)) return { ok: false, reason: 'Once a year' };
  if (state.career.job?.professionId === professionId && (levelById(getProfession(professionId), state.career.job.levelId)?.grade ?? 0) >= (levelById(getProfession(professionId), r.levelId)?.grade ?? 0)) return { ok: false, reason: 'You already hold that rank' };
  const bg = backgroundCheck(state, getProfession(professionId));
  if (!bg.ok) return { ok: false, reason: bg.reason };
  return { ok: true, route: r, odds: passOdds(state, r) };
}

/** The exam is the gate: smarts, a good degree and luck. */
export function passOdds(state, r) {
  const smarts = state.stats.smarts;
  const gpa = Math.max(0, ...state.education.degrees.map((d) => d.gpa ?? 0));
  return clamp(r.odds * (0.4 + Math.max(0, smarts - (r.smarts ?? 55)) / 25 + Math.max(0, gpa - 3) * 0.6), 0.005, 0.6);
}

export const DirectEntryActions = {
  /** Sit a direct-entry exam: arg = 'professionId|routeId'. */
  apply(ctx, arg) {
    const { state, rng } = ctx;
    const [professionId, routeId] = String(arg).split('|');
    const check = directEntryEligibility(state, professionId, routeId);
    if (!check.ok) return ctx.toast(check.reason, 'warn');
    const r = check.route;
    bumpYearly(state, `directEntry.${r.id}`);
    state.career.directEntry = { ...(state.career.directEntry ?? {}), [r.id]: attempts(state, r.id) + 1 };
    ctx.stat('stress', 6);
    if (!rng.chance(check.odds)) {
      return ctx.log(`You sat the ${r.name} and didn't make the merit list this year.${r.attempts ? ` (${r.attempts - attempts(state, r.id)} attempt${r.attempts - attempts(state, r.id) === 1 ? '' : 's'} left.)` : ''}`, '📝', 'warn');
    }
    const profession = getProfession(professionId);
    const employer = createEmployer(rng, state, profession, state.character.regionId);
    const job = hire(ctx, { professionId, levelId: r.levelId, employer });
    if (!job) return ctx.log(`You passed the ${r.name}, but the posting fell through.`, '📭', 'warn');
    job.directEntry = { id: r.id, name: r.name };
    job.fastTrack = true;
    ctx.stat('happiness', 10);
    ctx.log(`You passed the ${r.name}${r.school ? ` and trained at ${r.school}` : ''}. You start as ${job.title} at ${employer.name} — on the accelerated track.`, '🎓', 'milestone');
    return undefined;
  },
};

export const DirectEntryModule = {
  id: 'directEntry',
  order: 30.6,
  actions: DirectEntryActions,
};
