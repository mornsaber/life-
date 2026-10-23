/**
 * Education engine: admissions, enrollment (full- or part-time), tuition
 * funding (employer tuition assistance, GI Bill, need-based aid, loans),
 * GPA, graduation and multiple degrees.
 *
 * state.education = {
 *   degrees:  [{ type, programId, major, schoolId, gpa, year, honors }],
 *   enrolled: { programId, schoolId, major, pace: 'full'|'part', progress, gpa, yearsAttended, studiedThisYear } | null,
 *   giBillYearsUsed,
 * }
 */
import { studyBlock } from '../world/Regimes.js';
import { yellowRibbon } from '../military/Transition.js';
import { meetsEducation, netWorth, yearlyCount, bumpYearly, highestDegree, hasFelony } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { SCHOOLS, MAJORS, PROGRAMS, majorsFor, degreeLabel } from './Catalog.js';
import { residencyYears } from '../life/Regions.js';
import { campusGpaAdjustment } from '../campus/Network.js';
import { prepBonus, inK12 } from './K12.js';
import { localTuition, undergradEntryYears, shortCycleOffered } from '../world/Education.js';

/** A program's entry requirement where you live (law and medicine are first degrees in most countries). */
export const requiresFor = (state, programId, cc = state?.character?.countryId) => (undergradEntryYears(cc === 'US' ? undefined : cc, programId) ? { level: 'highschool' } : PROGRAMS[programId].requires);
import { stateIdOf } from '../life/Regions.js';
import { internationalTuition, onTemporaryVisa, visaEligibility, IMMIGRATION, freeMovementTo } from '../world/Immigration.js';
import { COUNTRIES, localizeTerms, isCitizen, citizenshipsOf } from '../world/Countries.js';
import { universityOf, defaultUniversity, offers, placeOf } from './Universities.js';
import { REGIONS, changeRegion } from '../life/Regions.js';
import { arrive, bannedFrom } from '../world/Migration.js';

/** A university by id, or the local stand-in for one of the old school-type ids ('state', 'elite'…). */
export function resolveSchool(state, id, programId = null, major = null) {
  return universityOf(id) ?? (SCHOOLS[id] && state ? defaultUniversity(state, id, programId, major) : null);
}
const homeCountry = (state) => state.character.countryId ?? 'US';
/** Whether studying there means moving: another city (or country); online and offshore programs don't. */
export const movesYou = (state, uni) => Boolean(uni?.region) && (uni.region !== state.character.regionId);
/** The right to study in the university's country without a student visa. */
const mayStudyIn = (state, cc) => cc === homeCountry(state) || isCitizen(state, cc) || Boolean(freeMovementTo(citizenshipsOf(state), cc));

export const GI_BILL = { maxYears: 4, annualCap: 28000, minService: 3 };
const APPLICATIONS_PER_YEAR = 4;

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

export function lastGpa(state) {
  const graded = state.education.degrees.filter((d) => d.gpa);
  return graded.length ? graded[graded.length - 1].gpa : 3.0;
}

/** Military Tuition Assistance cap per year. */
export const MILITARY_TA = 4500;

export function giBillEligible(state) {
  // (US service, used in the US.)
  const honorable = state.military.history.filter((h) => ['honorable', 'retired', 'medical'].includes(h.discharge) && (h.nation ?? 'US') === 'US' && (state.character.countryId ?? 'US') === 'US');
  const years = honorable.reduce((sum, h) => sum + h.yearsOfService - (h.priorYears ?? 0), 0);
  const used = state.education.giBillYearsUsed ?? 0;
  // Benefits transferred by a parent who served.
  if (used < (state.education.giBillTransferred ?? 0)) return true;
  return years >= GI_BILL.minService && used < GI_BILL.maxYears;
}

/**
 * Partial credit from programs you left without finishing (dropped out,
 * dismissed, expelled, incarcerated): courses passed with a C or better
 * transfer. Bachelor's programs accept up to 3 years from another
 * bachelor's or 2 from an associate's; credit older than 10 years counts half.
 */
const TRANSFER_RULES = {
  bachelor: { bachelor: 3, associate: 2 },
  associate: { associate: 1.5, bachelor: 1.5 },
};

export function transferCredit(state, programId) {
  const program = PROGRAMS[programId];
  const rules = TRANSFER_RULES[program.type] ?? { [program.type]: program.years - 0.5 };
  let best = { years: 0, credit: null };
  for (const c of state.education.credits ?? []) {
    const cap = c.programId === programId ? Math.max(rules[c.type] ?? 0, program.years - 1) : rules[c.type];
    if (!cap) continue;
    const decay = state.character.age - c.age > 10 ? 0.5 : 1;
    const years = Math.min(cap, Math.floor(c.years * decay * 2) / 2);
    if (years > best.years) best = { years, credit: c };
  }
  return best;
}

/** Years a program will take for this student (transfer credit, second degrees). */
/** Degree lengths that differ from the US: three-year bachelor's under the Bologna system and its cousins, the one-year English master's. */
const BACHELOR_YEARS = { GB: 3, DE: 3, FR: 3, IT: 3, NL: 3, SE: 3, CH: 3, AT: 3, BE: 3, DK: 3, NO: 3, PL: 3, AU: 3, NZ: 3, IN: 3, ZA: 3, IL: 3, MT: 3 };
const MASTER_YEARS = { GB: 1, IE: 1, AU: 1.5 };
const degreeYears = (cc, programId, p) => (programId === 'bachelor' ? BACHELOR_YEARS[cc] : ['master', 'mba'].includes(programId) ? MASTER_YEARS[cc] : null) ?? p.years;

export function programYears(state, programId, major, uni = null) {
  const p = PROGRAMS[programId];
  const cc = uni?.country ?? state.character.countryId ?? 'US';
  // Scotland's bachelor's degrees run four years.
  const scottish = cc === 'GB' && REGIONS[uni?.region]?.state === 'GB-SCT';
  let years = undergradEntryYears(cc === 'US' ? undefined : cc, programId) ?? (scottish ? p.years : degreeYears(cc, programId, p));
  if (programId === 'bachelor') {
    if (state.education.degrees.some((d) => d.type === 'bachelor')) years = 2; // second bachelor's
    else if (state.education.degrees.some((d) => d.type === 'associate')) years = 2; // transfer credit
  }
  const extra = YEAR_HOOKS.reduce((sum, h) => sum + (h(state, programId, major) ?? 0), 0);
  return Math.max(Math.min(1, years), years - transferCredit(state, programId).years - extra);
}

/** Other modules can shorten programs (AP credit, master's credit…): (state, programId, major) → years off. */
export const YEAR_HOOKS = [];

/** Leaving a program early banks the credit you earned (half if your GPA was below 2.0). */
function bankCredit(state, e) {
  if (!e || e.progress <= 0) return;
  const program = PROGRAMS[e.programId];
  const years = Math.floor(e.progress * (e.gpa >= 2 ? 1 : 0.5) * 2) / 2;
  if (years <= 0) return;
  const credits = (state.education.credits ??= []);
  const existing = credits.find((c) => c.programId === e.programId);
  if (existing && existing.years >= years) return;
  if (existing) credits.splice(credits.indexOf(existing), 1);
  credits.push({ programId: e.programId, type: program.type, years, gpa: e.gpa, schoolId: e.schoolId, age: state.character.age });
}

/** Applications sent this year, and how many a system allows (UCAS: five choices; elsewhere a handful). */
export const applicationsThisCycle = (state) => (state.education.applications ?? []).filter((a) => a.age === state.character.age).length;
export const applicationCap = (state, programId) => (homeCountry(state) === 'GB' && PROGRAMS[programId]?.type === 'bachelor' ? 5 : homeCountry(state) === 'US' ? 10 : 6);
export const APPLICATION_FEE = 75;

/** A university record for an id or type, even where no real one exists (an ad-hoc stand-in). */
export function uniOrType(state, id, programId, major = null) {
  const uni = resolveSchool(state, id, programId, major);
  if (uni) return uni;
  const s = SCHOOLS[id];
  return s ? { id, name: s.name, type: id, region: null, prestige: s.prestige ?? 1, country: homeCountry(state), pro: [] } : null;
}

/**
 * Getting there: a move to the university's city, and abroad a student visa first.
 * Returns false if you can't go (the visa was refused).
 */
function attend(ctx, uni) {
  const { state, rng } = ctx;
  if (!movesYou(state, uni)) return true;
  const place = placeOf(uni);
  if (uni.country !== homeCountry(state)) {
    let visa = null;
    if (!isCitizen(state, uni.country)) {
      if (freeMovementTo(citizenshipsOf(state), uni.country)) visa = 'freeMovement';
      else {
        const v = visaEligibility(state, uni.country, 'student');
        if (!v.ok) { ctx.toast(`Student visa: ${v.reason}`, 'warn'); return false; }
        ctx.spend(v.fee, 'Student visa application', { allowDebt: true });
        if (!rng.chance(v.odds)) {
          ctx.log(`${COUNTRIES[uni.country].name} refused your student visa. Your place at ${uni.name} lapsed.`, '🛂', 'bad');
          return false;
        }
        visa = 'student';
      }
    }
    arrive(ctx, uni.country, { visa, reason: `You moved to ${place} to study at ${uni.name}.` });
    if (state.character.regionId !== uni.region) changeRegion(ctx, uni.region, '', { voluntary: true, crossBorder: true });
    return true;
  }
  const job = state.career.job;
  if (job && !job.remote) ctx.emit('career:resign', { reason: `Moved to ${place} for university` });
  if (state.housing?.properties?.some((p) => p.use === 'primary')) ctx.emit('housing:leavingPrimary', { decision: 'rent' });
  ctx.spend(1500, 'Moving to university', { allowDebt: true });
  changeRegion(ctx, uni.region, `You packed up and moved to ${place} for university.`, { voluntary: true });
  return true;
}

/** Start a program at a university (after an offer, or straight in at an open-admission college). */
export function startEnrollment(ctx, { programId, uni, major, pace }) {
  const { state } = ctx;
  if (!attend(ctx, uni)) return false;
  const program = PROGRAMS[programId];
  const totalYears = programYears(state, programId, major, uni);
  const transfer = transferCredit(state, programId);
  if (transfer.credit) state.education.credits = state.education.credits.filter((c) => c !== transfer.credit);
  state.education.enrolled = { programId, schoolId: uni.type, universityId: uni.id, prestige: uni.prestige, major, pace: pace === 'part' ? 'part' : 'full', progress: 0, totalYears, gpa: 0, yearsAttended: 0, studiedThisYear: false };
  const label = degreeLabel({ programId, major, type: program.type });
  ctx.log(`You enrolled at ${uni.name}${uni.region ? ` (${placeOf(uni)})` : ''}, ${pace === 'part' ? 'part-time' : 'full-time'}: ${label}.${transfer.years ? ` ${transfer.years} yr of transfer credit applied.` : ''}`, SCHOOLS[uni.type]?.icon ?? '🎓', 'milestone');
  ctx.emit('education:enrolled', { programId, schoolId: uni.type, universityId: uni.id, major });
  ctx.toast(`Enrolled: ${label}`, 'good');
  return true;
}

/**
 * Admissions add-ons from other modules (the MCAT for medical school, …):
 * { eligibility(state, programId) → reason | null, boost(state, programId, schoolId) → Δ odds }.
 */
export const ADMISSION_HOOKS = [];

export function enrollmentEligibility(state, programId, schoolId, major, { applying = false } = {}) {
  const p = PROGRAMS[programId];
  const uni = resolveSchool(state, schoolId, programId, major);
  const typeId = uni?.type ?? schoolId;
  const school = SCHOOLS[typeId];
  if (!p || !school || (uni ? !offers(uni, programId, major) : !p.schools.includes(typeId))) return { ok: false, reason: 'Not offered there' };
  if (!applying && uni && uni.country !== homeCountry(state) && !uni.offshore && !mayStudyIn(state, uni.country)) {
    if (bannedFrom(state, uni.country)) return { ok: false, reason: `Barred from ${COUNTRIES[uni.country]?.name}` };
    const v = visaEligibility(state, uni.country, 'student');
    if (!v.ok) return { ok: false, reason: `Student visa: ${v.reason}` };
  }
  if (uni && movesYou(state, uni) && state.military.service?.component === 'active') return { ok: false, reason: 'On active duty: study online or near your base' };
  if (programId === 'associate' && !shortCycleOffered(state.character.countryId)) return { ok: false, reason: 'Not offered in this country' };
  if (p.usOnly && (state.character.countryId ?? 'US') !== 'US') return { ok: false, reason: 'Not offered in this country' };
  if (state.character.age < (applying ? 16 : 17)) return { ok: false, reason: 'Too young' };
  const cur = state.education.enrolled;
  // Applying for next year is allowed in your final year.
  if (cur && !(applying && cur.totalYears - cur.progress <= 1)) return { ok: false, reason: 'Already enrolled' };
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  const closed = p.type !== 'vocational' && p.type !== 'certificate' ? studyBlock(state, uni?.country) : null;
  if (closed) return { ok: false, reason: closed };
  // High-school seniors apply in their final year.
  const senior = applying && requiresFor(state, programId, uni?.country).level === 'highschool' && inK12(state) && state.character.age >= 16;
  if (!senior && !meetsEducation(state, requiresFor(state, programId, uni?.country))) return { ok: false, reason: ['md', 'do'].includes(programId) ? 'Needs science major or pre-med post-bacc' : `Needs ${p.requires.level === 'bachelor' ? "a bachelor's" : 'a diploma'}` };
  if (!majorsFor(programId).includes(major ?? null)) return { ok: false, reason: 'Pick a major' };
  if (state.education.degrees.some((d) => d.programId === programId && (d.major ?? null) === (major ?? null))) return { ok: false, reason: 'Already earned' };
  if (p.minSmarts && state.stats.smarts < p.minSmarts) return { ok: false, reason: `Needs ${p.minSmarts}+ smarts` };
  if (p.minGpa && lastGpa(state) < p.minGpa) return { ok: false, reason: `Needs ${p.minGpa.toFixed(1)}+ GPA` };
  if (school.academy) {
    if (state.character.age > 23) return { ok: false, reason: 'Academies admit ages 17–23' };
    if (hasFelony(state) || state.education.degrees.some((d) => d.type === 'bachelor')) return { ok: false, reason: 'Not eligible for an academy appointment' };
    if (state.stats.fitness < 55 || state.stats.health < 50) return { ok: false, reason: 'Fails the candidate fitness assessment' };
    if (!state.campus?.nomination) return { ok: false, reason: 'Needs a congressional nomination' };
  }
  for (const h of ADMISSION_HOOKS) {
    const reason = h.eligibility?.(state, programId, schoolId);
    if (reason) return { ok: false, reason };
  }
  if (!applying && yearlyCount(state, 'education.apply') >= APPLICATIONS_PER_YEAR) return { ok: false, reason: 'Application limit this year' };
  if (applying && applicationsThisCycle(state) >= applicationCap(state, programId)) return { ok: false, reason: `${applicationCap(state, programId)} applications a year${homeCountry(state) === 'GB' ? ' (UCAS)' : ''}` };
  if (applying && (state.education.applications ?? []).some((a) => a.programId === programId && a.universityId === uni?.id)) return { ok: false, reason: 'Already applied there' };
  return { ok: true };
}

/** Admission odds (0–1) at a given school. */
/** Graduate admission rates by program type, scaled by how selective the university is (prestige 0–3). */
const GRAD_RATE = { master: 0.45, doctorate: 0.15, professional: 0.12, certificate: 0.7 };
const PRESTIGE_RATE = [1.8, 1.3, 1, 0.55];

/** How strong an applicant you are, 0–100: ability, grades and (abroad) the school-leaving exam. */
export function applicantStrength(state, programId) {
  const college = state.education.degrees.some((d) => ['associate', 'bachelor', 'master'].includes(d.type));
  const gpa = college ? lastGpa(state) : state.k12?.gpa ?? lastGpa(state);
  return clamp(state.stats.smarts * 0.55 + gpa * 11, 0, 100);
}

export function admissionChance(state, programId, schoolId) {
  // A real university uses its own selectivity; a bare school type ('state', 'elite') the type's bar.
  const uni = universityOf(schoolId);
  if (uni?.accept != null) return universityChance(state, programId, uni);
  const school = SCHOOLS[schoolId];
  const p = PROGRAMS[programId];
  const bar = Math.max(school.admission, p.minSmarts ?? 0) + (school.prestige >= 3 && p.type !== 'certificate' ? 8 : 0);
  const score = state.stats.smarts + (lastGpa(state) - 3) * 12;
  const expelled = state.campus?.expelledAge != null ? 0.25 : 0;
  const prep = state.education.degrees.some((d) => ['bachelor', 'associate', 'master'].includes(d.type)) ? 0 : prepBonus(state);
  const extra = ADMISSION_HOOKS.reduce((sum, h) => sum + (h.boost?.(state, programId, schoolId) ?? 0), 0);
  return clamp(0.5 + (score - bar) / 25 - expelled + prep + extra, school.admission === 0 ? 1 : 0.03, 0.98);
}

/**
 * Odds of an offer from a real university: its acceptance rate shifted by how your
 * application compares with its typical applicant. An average student is a coin toss at a
 * 50% school; a top student gets into a 4% school about four times in ten.
 */
function universityChance(state, programId, uni) {
  const p = PROGRAMS[programId];
  const type = uni.type;
  const firstDegree = ['bachelor', 'associate'].includes(p.type) || Boolean(undergradEntryYears(uni.country, programId));
  if (uni.accept >= 1 && firstDegree && !p.minSmarts) return 1;
  if (['community', 'technical', 'online'].includes(type) && !p.minSmarts) return 1;
  const rate = firstDegree ? uni.accept : clamp((GRAD_RATE[p.type] ?? 0.4) * PRESTIGE_RATE[uni.prestige ?? 1], 0.02, 0.9);
  const center = 62 + (p.minSmarts ? Math.max(0, p.minSmarts - 55) / 2 : 0) + (firstDegree ? 0 : 6);
  const odds = (rate / (1 - Math.min(0.97, rate))) * Math.exp((applicantStrength(state, programId) - center) / 10);
  const expelled = state.campus?.expelledAge != null ? 0.25 : 0;
  const prep = firstDegree && !state.education.degrees.some((d) => ['bachelor', 'associate', 'master'].includes(d.type)) ? prepBonus(state) : 0;
  const extra = ADMISSION_HOOKS.reduce((sum, h) => sum + (h.boost?.(state, programId, type) ?? 0), 0);
  return clamp(odds / (1 + odds) - expelled + prep + extra * 0.6, 0.005, 0.97);
}

export const OUT_OF_STATE_MULTIPLIER = 2.5;

/** Public schools charge out-of-state tuition until you've lived in the state a year. */
export function isInState(state) {
  return residencyYears(state) >= 1;
}

export function annualTuition(programId, schoolId, state = null) {
  const uni = universityOf(schoolId);
  if (uni && state) return universityTuition(state, programId, uni);
  const school = SCHOOLS[uni?.type ?? schoolId];
  schoolId = uni?.type ?? schoolId;
  // Abroad: the country's own fees (free in Germany, Scotland and Philippine state universities).
  const local = state?.character?.countryId ? localTuition(state.character.countryId, stateIdOf(state), schoolId) : null;
  // International students on a visa pay more (or the out-of-state rate in the US).
  if (local != null) return internationalTuition(state, Math.round(local * PROGRAMS[programId].costFactor), PROGRAMS[programId].costFactor);
  const outOfState = state && school.public && (!isInState(state) || onTemporaryVisa(state));
  return Math.round(school.tuition * PROGRAMS[programId].costFactor * (outOfState ? OUT_OF_STATE_MULTIPLIER : 1));
}

/** A real university's yearly fees: US sticker prices (in-state or not), elsewhere the country's own fees. */
function universityTuition(state, programId, uni) {
  const p = PROGRAMS[programId];
  const cc = uni.country;
  const local = cc !== 'US' ? localTuition(cc, REGIONS[uni.region]?.state ?? null, uni.type) : null;
  const foreigner = !mayStudyIn(state, cc) || onTemporaryVisa(state);
  if (local != null) {
    const price = Math.round(local * p.costFactor);
    if (!foreigner) return price;
    const rule = IMMIGRATION[cc]?.intlTuition ?? {};
    return Math.round(Math.max(price * (rule.mult ?? 1), (rule.floor ?? 0) * p.costFactor));
  }
  const base = uni.t ?? SCHOOLS[uni.type]?.tuition ?? 0;
  const publicUni = SCHOOLS[uni.type]?.public || uni.oos;
  const inState = !foreigner && REGIONS[uni.region]?.state === stateIdOf(state) && isInState(state);
  const price = publicUni && uni.region && !inState ? uni.oos ?? base * OUT_OF_STATE_MULTIPLIER : base;
  return Math.round(price * p.costFactor);
}

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

function fundTuition(ctx, e) {
  const { state } = ctx;
  const program = PROGRAMS[e.programId];
  let due = Math.round(annualTuition(e.programId, e.universityId ?? e.schoolId, state) * (e.pace === 'part' ? 0.5 : 1));
  const notes = [];
  e.giBillThisYear = false;
  if (!due) return notes;
  // Graduate assistantships waive tuition.
  if (e.tuitionWaiver) return ['tuition waived (graduate assistantship)'];

  if (SCHOOLS[e.schoolId].needBasedAid && netWorth(state) < 150000) {
    const aid = Math.round(due * 0.6);
    due -= aid;
    notes.push(`$${aid.toLocaleString()} need-based aid`);
  }
  // A 529 college fund (from a parent) pays first.
  if (state.education.fund529 > 0) {
    const covered = Math.min(due, state.education.fund529);
    state.education.fund529 -= covered;
    due -= covered;
    notes.push(`$${covered.toLocaleString()} from your 529 plan`);
  }
  // Merit, athletic, honors and ROTC scholarships (campus module) — some need a minimum GPA.
  for (const s of state.campus?.scholarships ?? []) {
    if (due <= 0) break;
    const covered = Math.min(due, s.full ? due : s.annual);
    due -= covered;
    s.received = (s.received ?? 0) + covered;
    notes.push(`$${covered.toLocaleString()} ${s.name}`);
  }
  if (giBillEligible(state)) {
    const covered = Math.min(due, GI_BILL.annualCap + yellowRibbon(state));
    due -= covered;
    state.education.giBillYearsUsed = (state.education.giBillYearsUsed ?? 0) + 1;
    e.giBillThisYear = true;
    notes.push(`$${covered.toLocaleString()} GI Bill`);
  }
  // An AmeriCorps Segal Education Award you saved.
  if (due > 0 && state.education.segalAward > 0) {
    const covered = Math.min(due, state.education.segalAward);
    due -= covered;
    state.education.segalAward -= covered;
    notes.push(`$${covered.toLocaleString()} Segal Education Award`);
  }
  // Military Tuition Assistance: up to $4,500 a year while you serve (part-time study).
  const svc = state.military.service;
  if (due > 0 && svc && !svc.isNew) {
    const covered = Math.min(due, MILITARY_TA);
    due -= covered;
    state.military.taUsed = (state.military.taUsed ?? 0) + covered;
    notes.push(`$${covered.toLocaleString()} military Tuition Assistance`);
  }
  const job = state.career.job;
  const benefit = job?.employer.benefits.tuition ?? 0;
  if (due > 0 && benefit > 0 && program.type !== 'vocational') {
    const covered = Math.min(due, benefit, job.employer.budget.left);
    if (covered > 0) {
      ctx.emit('budget:charge', { sponsor: { type: 'employer', label: job.employer.name }, amount: covered, reason: 'Tuition assistance' });
      due -= covered;
      notes.push(`$${covered.toLocaleString()} from ${job.employer.name} tuition assistance`);
    } else {
      notes.push(`${job.employer.name}'s tuition budget was spent`);
    }
  }
  if (due > 0) {
    state.finances.loans += due;
    notes.push(`$${due.toLocaleString()} in student loans`);
  }
  return notes;
}

/** Degrees keep the school and country that granted them (a US degree stays a US degree abroad). */
export function stampDegrees(state) {
  const cc = state.character.countryId ?? 'US';
  for (const d of state.education.degrees) {
    if (d.country) continue;
    d.country = cc;
    if (d.schoolName) continue;
    if (d.schoolId && SCHOOLS[d.schoolId]) d.schoolName = localizeTerms(SCHOOLS[d.schoolId].name, COUNTRIES[cc]);
  }
}

export const EducationEngine = {
  id: 'education',
  order: 10,

  init(state) {
    state.education ??= { degrees: [], enrolled: null };
    state.education.credits ??= [];
    state.education.giBillYearsUsed ??= 0;
  },

  setup(engine) {
    engine.bus.on('education:grantDiploma', ({ ctx, type, note }) => {
      if (ctx.state.education.degrees.some((d) => d.type === 'highschool' || d.type === 'ged')) return;
      ctx.state.education.degrees.push({ type: 'highschool', programId: type, major: null, year: ctx.state.character.age });
      ctx.log(note, '🎓', 'milestone');
    });
    engine.bus.on('education:left', ({ ctx, enrollment }) => bankCredit(ctx.state, enrollment));
    engine.bus.on('legal:incarcerated', ({ ctx }) => {
      const enrollment = ctx.state.education.enrolled;
      if (enrollment) {
        ctx.state.education.enrolled = null;
        ctx.log('Your school withdrew your enrollment.', '🏫', 'bad');
        ctx.emit('education:left', { reason: 'incarcerated', enrollment });
      }
    });
  },

  onAgeUp(ctx) {
    stampDegrees(ctx.state);
    const { state, rng } = ctx;
    const e = state.education.enrolled;
    if (!e) return;
    const program = PROGRAMS[e.programId];

    const notes = fundTuition(ctx, e);
    if (program.stipend && e.pace === 'full') ctx.earn(program.stipend, 'Graduate research stipend');

    const studied = e.studiedThisYear ? 0.45 : 0;
    const yearGpa = clamp(0.6 + state.stats.smarts / 33 + studied + rng.float(-0.45, 0.35) - Math.max(0, state.stats.stress - 60) / 60 + campusGpaAdjustment(state), 0, 4);
    e.gpa = Math.round(((e.gpa * e.yearsAttended + yearGpa) / (e.yearsAttended + 1)) * 100) / 100;
    // Campus: academic probation, dismissal, scholarship GPA floors.
    ctx.emit('education:term', { yearGpa, gpa: e.gpa });
    if (state.education.enrolled !== e) return;
    e.yearsAttended += 1;
    e.progress += e.pace === 'part' ? 0.5 : 1;
    e.studiedThisYear = false;
    ctx.stat('smarts', rng.int(1, 3));
    if (!program.stipend) ctx.stat('stress', 2);

    const label = degreeLabel({ programId: e.programId, major: e.major, type: program.type });
    if (e.progress >= e.totalYears) {
      state.education.enrolled = null;
      if (e.gpa >= 2.0) {
        const honors = e.gpa >= 3.9 ? 'summa cum laude' : e.gpa >= 3.7 ? 'magna cum laude' : e.gpa >= 3.5 ? 'cum laude' : null;
        const uni = e.universityId ? universityOf(e.universityId) : null;
        const degree = { type: program.type, programId: e.programId, major: e.major, schoolId: e.schoolId, gpa: e.gpa, year: state.character.age, honors, ...(uni ? { universityId: uni.id, schoolName: uni.name, prestige: uni.prestige, country: uni.country } : {}) };
        // Combined programs (4+1, MD/MPH) confer more than one degree; see academia/HigherEd.js.
        if (e.extraGrants?.length) degree.extraGrants = [...e.extraGrants];
        state.education.degrees.push(degree);
        ctx.log(`You graduated from ${uni?.name ?? SCHOOLS[e.schoolId].name}: ${label} (GPA ${e.gpa.toFixed(2)}${honors ? `, ${honors}` : ''})! 🎓`, '🎓', 'milestone');
        ctx.toast(`Graduated: ${label}`, 'good');
        ctx.stat('happiness', 10);
        ctx.emit('education:graduated', { degree });
      } else {
        ctx.log(`Your GPA of ${e.gpa.toFixed(2)} was too low to graduate from the ${label} program.`, '📉', 'bad');
        ctx.stat('happiness', -12);
        ctx.emit('education:left', { reason: 'failed', enrollment: e });
      }
    } else {
      ctx.log(`${label}: finished a ${e.pace === 'part' ? 'part-time ' : ''}year (${e.totalYears >= 99 ? `year ${e.progress}` : `${e.progress}/${e.totalYears}`}) with a ${yearGpa.toFixed(2)} GPA. Tuition: ${notes.join(', ') || 'none'}.`, '📘');
    }
  },

  /** Decision day: last year's applications come back, and you choose among the offers. */
  onYearEnd(ctx) {
    const { state, rng } = ctx;
    const apps = state.education.applications ?? [];
    const due = apps.filter((a) => a.age < state.character.age);
    if (!due.length || !state.character.alive) return;
    state.education.applications = apps.filter((a) => a.age >= state.character.age);
    const offers = [];
    const no = [];
    for (const a of due) {
      const uni = universityOf(a.universityId);
      if (!uni) continue;
      (rng.chance(admissionChance(state, a.programId, uni.id)) ? offers : no).push(a);
    }
    const names = (list) => list.map((a) => universityOf(a.universityId).name).join(', ');
    ctx.log(`Decisions are in. ${offers.length ? `Offers: ${names(offers)}.` : 'No offers this year.'}${no.length ? ` Rejected: ${names(no)}.` : ''}`, offers.length ? '📬' : '📭', offers.length ? 'good' : 'bad');
    if (!offers.length || state.education.enrolled) return;
    ctx.prompt({
      type: 'education.offers', icon: '📬', title: 'Your Offers',
      text: 'Choose where to go — or turn them all down and try again next year.',
      options: [
        ...offers.map((a, i) => {
          const uni = universityOf(a.universityId);
          const label = degreeLabel({ programId: a.programId, major: a.major, type: PROGRAMS[a.programId].type });
          return { id: `accept:${i}`, label: `🎓 ${uni.name} — ${label}`, hint: `${placeOf(uni)}${movesYou(state, uni) ? (uni.country !== homeCountry(state) ? ` ${COUNTRIES[uni.country]?.flag ?? ''} · moving abroad` : ' · moving') : ''} · $${annualTuition(a.programId, uni.id, state).toLocaleString()}/yr` };
        }),
        { id: 'decline', label: '🚫 Turn them all down' },
      ],
      data: { offers },
    });
  },

  resolvers: {
    offers(ctx, data, optionId) {
      if (!String(optionId).startsWith('accept:')) return ctx.log('You turned down every offer.', '🚫');
      const a = data.offers[Number(optionId.split(':')[1])];
      const uni = a && universityOf(a.universityId);
      if (!uni) return undefined;
      const check = enrollmentEligibility(ctx.state, a.programId, uni.id, a.major, { applying: true });
      if (!check.ok && !/applications a year|Already applied/.test(check.reason)) return ctx.toast(check.reason, 'warn');
      return startEnrollment(ctx, { programId: a.programId, uni, major: a.major, pace: a.pace });
    },
  },

  actions: {
    /** arg: 'programId:schoolId:major:pace' (major may be empty). */
    enroll(ctx, arg) {
      const { state, rng } = ctx;
      const [programId, schoolId, rawMajor, pace = 'full'] = String(arg).split(':');
      const major = rawMajor || null;
      const check = enrollmentEligibility(state, programId, schoolId, major);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      if (state.military.service?.component === 'active' && pace === 'full') return ctx.toast('Active duty members can only study part-time.', 'warn');
      bumpYearly(state, 'education.apply');

      const program = PROGRAMS[programId];
      const uni = uniOrType(state, schoolId, programId, major);
      if (!rng.chance(admissionChance(state, programId, schoolId))) {
        ctx.log(`${uni.name} rejected your application to the ${program.name} program.`, '📭', 'bad');
        return ctx.toast(`Rejected by ${uni.name}`, 'bad');
      }
      startEnrollment(ctx, { programId, uni, major, pace });
    },

    /**
     * Apply for next year (arg: 'programId:universityId:major:pace'). Decisions arrive with
     * the new year; open-admission colleges take you straight away.
     */
    apply(ctx, arg) {
      const { state } = ctx;
      const [programId, schoolId, rawMajor, pace = 'full'] = String(arg).split(':');
      const major = rawMajor || null;
      const uni = uniOrType(state, schoolId, programId, major);
      if (!uni) return undefined;
      const open = admissionChance(state, programId, uni.id) >= 1 && !state.education.enrolled;
      if (open) return EducationEngine.actions.enroll(ctx, `${programId}:${uni.id}:${major ?? ''}:${pace}`);
      const check = enrollmentEligibility(state, programId, uni.id, major, { applying: true });
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      if (!ctx.spend(APPLICATION_FEE, `Application fee — ${uni.name}`, { credit: true })) return ctx.toast('You can\'t cover the application fee.', 'warn');
      (state.education.applications ??= []).push({ programId, universityId: uni.id, major, pace, age: state.character.age });
      ctx.log(`You applied to ${uni.name} for ${degreeLabel({ programId, major, type: PROGRAMS[programId].type })}. Decisions come next year.`, '✉️');
      return undefined;
    },

    withdrawApplication(ctx, index) {
      const apps = ctx.state.education.applications ?? [];
      const a = apps[Number(index)];
      if (!a) return undefined;
      apps.splice(Number(index), 1);
      return ctx.log(`You withdrew your application to ${universityOf(a.universityId)?.name ?? 'the university'}.`, '✉️');
    },

    study(ctx) {
      const e = ctx.state.education.enrolled;
      if (!e) return;
      if (yearlyCount(ctx.state, 'education.study')) return ctx.toast('Already hit the books hard this year.', 'warn');
      bumpYearly(ctx.state, 'education.study');
      e.studiedThisYear = true;
      ctx.stat('smarts', 2);
      ctx.stat('stress', 6);
      ctx.log('You pulled all-nighters and lived in the library.', '📖');
    },

    switchPace(ctx) {
      const e = ctx.state.education.enrolled;
      if (!e) return;
      if (e.pace === 'part' && ctx.state.military.service?.component === 'active') return ctx.toast('Active duty: part-time only.', 'warn');
      if (SCHOOLS[e.schoolId].academy) return ctx.toast('Academy cadets and midshipmen study full-time.', 'warn');
      e.pace = e.pace === 'part' ? 'full' : 'part';
      ctx.toast(`Now studying ${e.pace === 'part' ? 'part-time' : 'full-time'}`, 'info');
    },

    dropOut(ctx) {
      const e = ctx.state.education.enrolled;
      if (!e) return;
      ctx.state.education.enrolled = null;
      ctx.log(`You dropped out of ${PROGRAMS[e.programId].name}.`, '🚪', 'bad');
      ctx.emit('education:left', { reason: 'dropout', enrollment: e });
      ctx.stat('happiness', -5);
    },
  },
};

export { SCHOOLS, MAJORS, PROGRAMS, majorsFor, degreeLabel, highestDegree };
