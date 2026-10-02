/**
 * Education — Step 1 preview.
 *
 * A minimal but functional degree pipeline so that degree-gated careers
 * (medicine, law, officer commissions) are reachable now. The full system
 * (UniversityLife, HousingDorms, Internships) arrives in Step 2 and will
 * replace this file's internals while keeping the same state slice:
 *   state.education = { degrees: [{ type, major, gpa, year }], enrolled: {...} | null }
 */
import { hasDegree, yearlyCount, bumpYearly } from '../../core/State.js';
import { clamp } from '../../core/Random.js';

export const MAJORS = {
  stem: { name: 'STEM', icon: '🔬' },
  business: { name: 'Business', icon: '📈' },
  prelaw: { name: 'Pre-Law', icon: '⚖️' },
  premed: { name: 'Pre-Med', icon: '🩺' },
  criminaljustice: { name: 'Criminal Justice', icon: '🚓' },
  liberalarts: { name: 'Liberal Arts', icon: '🎭' },
};

export const PROGRAMS = {
  bachelor: { name: "Bachelor's Degree", short: 'B.A./B.S.', years: 4, tuition: 11000, requires: 'highschool', minSmarts: 25, majors: Object.keys(MAJORS) },
  mba: { name: 'Master of Business Administration', short: 'MBA', years: 2, tuition: 38000, requires: 'bachelor', minSmarts: 50 },
  jd: { name: 'Law School (J.D.)', short: 'J.D.', years: 3, tuition: 42000, requires: 'bachelor', minSmarts: 60 },
  md: { name: 'Medical School (M.D.)', short: 'M.D.', years: 4, tuition: 48000, requires: 'bachelor', requiresMajors: ['stem', 'premed'], minSmarts: 70 },
};

export function programEligibility(state, programId) {
  const program = PROGRAMS[programId];
  if (state.character.age < 17) return { ok: false, reason: 'Too young' };
  if (state.education.enrolled) return { ok: false, reason: 'Already enrolled' };
  if (state.education.degrees.some((d) => d.type === programId)) return { ok: false, reason: 'Already earned' };
  if (!hasDegree(state, program.requires, program.requiresMajors)) {
    return { ok: false, reason: program.requiresMajors ? 'Needs STEM/Pre-Med bachelor' : `Needs ${program.requires === 'highschool' ? 'diploma' : "bachelor's"}` };
  }
  if (state.stats.smarts < program.minSmarts) return { ok: false, reason: `Needs ${program.minSmarts}+ smarts` };
  if (state.military.service?.component === 'active') return { ok: false, reason: 'On active duty' };
  return { ok: true };
}

export const EducationEngine = {
  id: 'education',
  order: 10,

  init(state) {
    state.education ??= { degrees: [], enrolled: null };
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const e = state.education.enrolled;
    if (!e) return;
    const program = PROGRAMS[e.program];

    state.finances.loans += program.tuition;
    const studied = e.studiedThisYear ? 0.45 : 0;
    const yearGpa = clamp(0.6 + state.stats.smarts / 33 + studied + rng.float(-0.45, 0.35) - Math.max(0, state.stats.stress - 60) / 60, 0, 4);
    e.gpa = Math.round(((e.gpa * e.yearsCompleted + yearGpa) / (e.yearsCompleted + 1)) * 100) / 100;
    e.yearsCompleted += 1;
    e.studiedThisYear = false;
    ctx.stat('smarts', rng.int(1, 3));

    if (e.yearsCompleted >= program.years) {
      state.education.enrolled = null;
      if (e.gpa >= 2.0) {
        state.education.degrees.push({ type: e.program, major: e.major, gpa: e.gpa, year: state.character.age });
        const majorText = e.major ? ` in ${MAJORS[e.major].name}` : '';
        ctx.log(`You graduated with your ${program.name}${majorText} (GPA ${e.gpa.toFixed(2)})! 🎓`, '🎓', 'milestone');
        ctx.toast(`Graduated: ${program.short}${majorText}`, 'good');
        ctx.stat('happiness', 10);
      } else {
        ctx.log(`Your GPA of ${e.gpa.toFixed(2)} was too low to graduate. You left without a degree.`, '📉', 'bad');
        ctx.stat('happiness', -12);
      }
    } else {
      ctx.log(`Finished year ${e.yearsCompleted} of ${program.short} with a ${yearGpa.toFixed(2)} GPA.`, '📘');
    }
  },

  actions: {
    enroll(ctx, arg) {
      const [programId, major = null] = String(arg).split(':');
      const program = PROGRAMS[programId];
      if (!program) return;
      const check = programEligibility(ctx.state, programId);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      if (programId === 'bachelor' && !MAJORS[major]) return ctx.toast('Pick a major.', 'warn');
      ctx.state.education.enrolled = { program: programId, major: programId === 'bachelor' ? major : null, yearsCompleted: 0, gpa: 0, studiedThisYear: false };
      ctx.log(`You enrolled in a ${program.name}${major && MAJORS[major] ? ` majoring in ${MAJORS[major].name}` : ''}.`, '🏛️', 'milestone');
      ctx.toast(`Enrolled: ${program.short}`, 'good');
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
    dropOut(ctx) {
      const e = ctx.state.education.enrolled;
      if (!e) return;
      ctx.state.education.enrolled = null;
      ctx.log(`You dropped out of ${PROGRAMS[e.program].name}.`, '🚪', 'bad');
      ctx.stat('happiness', -5);
    },
  },
};
