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
import { meetsEducation, netWorth, yearlyCount, bumpYearly, highestDegree, hasFelony } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { SCHOOLS, MAJORS, PROGRAMS, majorsFor, degreeLabel } from './Catalog.js';
import { residencyYears } from '../life/Regions.js';
import { campusGpaAdjustment } from '../campus/Network.js';

export const GI_BILL = { maxYears: 4, annualCap: 28000, minService: 3 };
const APPLICATIONS_PER_YEAR = 4;

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

export function lastGpa(state) {
  const graded = state.education.degrees.filter((d) => d.gpa);
  return graded.length ? graded[graded.length - 1].gpa : 3.0;
}

export function giBillEligible(state) {
  const honorable = state.military.history.filter((h) => ['honorable', 'retired', 'medical'].includes(h.discharge));
  const years = honorable.reduce((sum, h) => sum + h.yearsOfService, 0);
  return years >= GI_BILL.minService && (state.education.giBillYearsUsed ?? 0) < GI_BILL.maxYears;
}

/** Years a program will take for this student (transfer credit, second degrees). */
export function programYears(state, programId, major) {
  const p = PROGRAMS[programId];
  let years = p.years;
  if (programId === 'bachelor') {
    if (state.education.degrees.some((d) => d.type === 'bachelor')) years = 2; // second bachelor's
    else if (state.education.degrees.some((d) => d.type === 'associate')) years = 2; // transfer credit
  }
  return years;
}

export function enrollmentEligibility(state, programId, schoolId, major) {
  const p = PROGRAMS[programId];
  const school = SCHOOLS[schoolId];
  if (!p || !school || !p.schools.includes(schoolId)) return { ok: false, reason: 'Not offered there' };
  if (state.character.age < 17) return { ok: false, reason: 'Too young' };
  if (state.education.enrolled) return { ok: false, reason: 'Already enrolled' };
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  if (!meetsEducation(state, p.requires)) return { ok: false, reason: programId === 'md' ? 'Needs science major or pre-med post-bacc' : `Needs ${p.requires.level === 'bachelor' ? "a bachelor's" : 'a diploma'}` };
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
  if (yearlyCount(state, 'education.apply') >= APPLICATIONS_PER_YEAR) return { ok: false, reason: 'Application limit this year' };
  return { ok: true };
}

/** Admission odds (0–1) at a given school. */
export function admissionChance(state, programId, schoolId) {
  const school = SCHOOLS[schoolId];
  const p = PROGRAMS[programId];
  const bar = Math.max(school.admission, p.minSmarts ?? 0) + (school.prestige >= 3 && p.type !== 'certificate' ? 8 : 0);
  const score = state.stats.smarts + (lastGpa(state) - 3) * 12;
  const expelled = state.campus?.expelledAge != null ? 0.25 : 0;
  return clamp(0.5 + (score - bar) / 25 - expelled, school.admission === 0 ? 1 : 0.03, 0.98);
}

export const OUT_OF_STATE_MULTIPLIER = 2.5;

/** Public schools charge out-of-state tuition until you've lived in the state a year. */
export function isInState(state) {
  return residencyYears(state) >= 1;
}

export function annualTuition(programId, schoolId, state = null) {
  const school = SCHOOLS[schoolId];
  const outOfState = state && school.public && !isInState(state);
  return Math.round(school.tuition * PROGRAMS[programId].costFactor * (outOfState ? OUT_OF_STATE_MULTIPLIER : 1));
}

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

function fundTuition(ctx, e) {
  const { state } = ctx;
  const program = PROGRAMS[e.programId];
  let due = Math.round(annualTuition(e.programId, e.schoolId, state) * (e.pace === 'part' ? 0.5 : 1));
  const notes = [];
  e.giBillThisYear = false;
  if (!due) return notes;

  if (SCHOOLS[e.schoolId].needBasedAid && netWorth(state) < 150000) {
    const aid = Math.round(due * 0.6);
    due -= aid;
    notes.push(`$${aid.toLocaleString()} need-based aid`);
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
    const covered = Math.min(due, GI_BILL.annualCap);
    due -= covered;
    state.education.giBillYearsUsed = (state.education.giBillYearsUsed ?? 0) + 1;
    e.giBillThisYear = true;
    notes.push(`$${covered.toLocaleString()} GI Bill`);
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

export const EducationEngine = {
  id: 'education',
  order: 10,

  init(state) {
    state.education ??= { degrees: [], enrolled: null };
    state.education.giBillYearsUsed ??= 0;
  },

  setup(engine) {
    engine.bus.on('education:grantDiploma', ({ ctx, type, note }) => {
      if (ctx.state.education.degrees.some((d) => d.type === 'highschool' || d.type === 'ged')) return;
      ctx.state.education.degrees.push({ type: 'highschool', programId: type, major: null, year: ctx.state.character.age });
      ctx.log(note, '🎓', 'milestone');
    });
    engine.bus.on('legal:incarcerated', ({ ctx }) => {
      if (ctx.state.education.enrolled) {
        ctx.state.education.enrolled = null;
        ctx.log('Your school withdrew your enrollment.', '🏫', 'bad');
        ctx.emit('education:left', { reason: 'incarcerated' });
      }
    });
  },

  onAgeUp(ctx) {
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
        const degree = { type: program.type, programId: e.programId, major: e.major, schoolId: e.schoolId, gpa: e.gpa, year: state.character.age, honors };
        state.education.degrees.push(degree);
        ctx.log(`You graduated from ${SCHOOLS[e.schoolId].name}: ${label} (GPA ${e.gpa.toFixed(2)}${honors ? `, ${honors}` : ''})! 🎓`, '🎓', 'milestone');
        ctx.toast(`Graduated: ${label}`, 'good');
        ctx.stat('happiness', 10);
        ctx.emit('education:graduated', { degree });
      } else {
        ctx.log(`Your GPA of ${e.gpa.toFixed(2)} was too low to graduate from the ${label} program.`, '📉', 'bad');
        ctx.stat('happiness', -12);
        ctx.emit('education:left', { reason: 'failed' });
      }
    } else {
      ctx.log(`${label}: finished a ${e.pace === 'part' ? 'part-time ' : ''}year (${e.progress}/${e.totalYears}) with a ${yearGpa.toFixed(2)} GPA. Tuition: ${notes.join(', ') || 'none'}.`, '📘');
    }
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
      const school = SCHOOLS[schoolId];
      if (!rng.chance(admissionChance(state, programId, schoolId))) {
        ctx.log(`${school.name} rejected your application to the ${program.name} program.`, '📭', 'bad');
        return ctx.toast(`Rejected by ${school.name}`, 'bad');
      }
      const totalYears = programYears(state, programId, major);
      state.education.enrolled = { programId, schoolId, major, pace: pace === 'part' ? 'part' : 'full', progress: 0, totalYears, gpa: 0, yearsAttended: 0, studiedThisYear: false };
      const label = degreeLabel({ programId, major, type: program.type });
      ctx.log(`You were admitted to ${school.name} and enrolled ${pace === 'part' ? 'part-time' : 'full-time'}: ${label}.`, school.icon, 'milestone');
      ctx.emit('education:enrolled', { programId, schoolId, major });
      ctx.toast(`Enrolled: ${label}`, 'good');
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
      ctx.emit('education:left', { reason: 'dropout' });
      ctx.stat('happiness', -5);
    },
  },
};

export { SCHOOLS, MAJORS, PROGRAMS, majorsFor, degreeLabel, highestDegree };
