/**
 * Getting through higher education faster, cheaper and with more on your CV.
 *
 *   Acceleration   AP / dual-enrollment credit in high school (up to a year
 *                  off a bachelor's), course overloads (a three-year
 *                  bachelor's), 4+1 BS/MS programs, master's credit toward a
 *                  Ph.D., and going up early for tenure.
 *   Combined       MD/PhD (the Medical Scientist Training Program: tuition-
 *                  free, a stipend, eight years), JD/MBA (four years instead
 *                  of five), an MPH year inside medical school, and BS/MD
 *                  programs that admit high-school seniors to both.
 *   Admissions     Early Decision (binding, better odds), the GRE, research
 *                  experience and letters for graduate school.
 *   Undergrad jobs Federal Work-Study, dining hall, library, Resident
 *                  Advisor (free room and board), tutor/grader and lab
 *                  research assistant.
 *   Honors         Senior theses and the big fellowships: Rhodes, Marshall,
 *                  Gates Cambridge, Fulbright.
 *   Teaching       Graduate assistantships (a tuition waiver and a stipend)
 *                  and adjunct teaching on the side, paid by the course.
 *   Offers         Outside offers can be turned into retention packages.
 *
 * state.higherEd = { campusJob, ugResearch, letters, thesis, gre, edUsed, edBoost, bsmd, fellowships, fulbrightAge, adjunctYears, adjunctCourses }
 * state.education.apCredit (years of AP / dual-enrollment credit), apCreditUsed
 */
import { clamp } from '../../core/Random.js';
import { addHonor, yearlyCount, bumpYearly } from '../../core/State.js';
import { PROGRAMS, MAJORS, SCHOOLS } from '../education/Catalog.js';
import { ADMISSION_HOOKS, YEAR_HOOKS, EducationEngine } from '../education/EducationEngine.js';
import { ROOM_AND_BOARD } from '../campus/HousingDorms.js';
import { TENURE_CLOCK } from './Academia.js';

export const AP_CREDIT_PER_YEAR = 0.34;
export const MAX_AP_CREDIT = 1;
export const OVERLOAD_PROGRESS = 0.25;
export const ADJUNCT_PAY = { masters: 3500, doctorate: 5000 };
export const ASSISTANTSHIP_STIPEND = 16000;

export const CAMPUS_JOBS = {
  workStudy: { name: 'Federal Work-Study', icon: '🧾', pay: 3500, stress: 2, desc: 'A need-based campus job; your hours fit around classes.' },
  dining: { name: 'Dining hall', icon: '🍽️', pay: 6000, stress: 5, desc: 'Early shifts, free meals, the best gossip on campus.' },
  library: { name: 'Library desk', icon: '📚', pay: 5000, stress: 1, desc: 'Quiet hours — you study between patrons.' },
  ra: { name: 'Resident Advisor', icon: '🛏️', pay: 0, stress: 4, minYear: 1, gpa: 2.5, residential: true, desc: 'Free room and board for policing your hall at 2 a.m.' },
  tutor: { name: 'Tutor / grader', icon: '✏️', pay: 4500, stress: 3, smarts: 65, gpa: 3.3, desc: 'Grade problem sets for a professor who will later write your letter.' },
  lab: { name: 'Research assistant in a lab', icon: '🔬', pay: 2500, stress: 3, gpa: 3.0, desc: 'Low pay, real research experience — what Ph.D. and MD/PhD committees want.' },
};

export const FELLOWSHIPS = {
  rhodes: { name: 'Rhodes Scholarship', icon: '🏛️', odds: 0.02, minGpa: 3.8, prestige: 30, boost: 0.25, desc: 'Graduate study at Oxford — the most famous scholarship in the world.' },
  marshall: { name: 'Marshall Scholarship', icon: '🇬🇧', odds: 0.04, minGpa: 3.7, prestige: 22, boost: 0.2, desc: 'Graduate study at any British university.' },
  gates: { name: 'Gates Cambridge Scholarship', icon: '🎓', odds: 0.04, minGpa: 3.7, prestige: 20, boost: 0.2, desc: 'A full ride to Cambridge.' },
  fulbright: { name: 'Fulbright Fellowship', icon: '🌍', odds: 0.24, minGpa: 3.4, prestige: 8, boost: 0.08, desc: 'A year abroad teaching English or doing research.' },
};

const he = (state) => state.higherEd;
const enrolled = (state) => state.education.enrolled;
const isUndergrad = (e) => e && ['bachelor', 'associate'].includes(PROGRAMS[e.programId]?.type);
const hasDegree = (state, types) => state.education.degrees.some((d) => types.includes(d.type));
const finalYear = (e) => e && e.totalYears < 99 && e.totalYears - e.progress <= 1;

/* ------------------------------------------------------------------ */
/* Acceleration                                                        */
/* ------------------------------------------------------------------ */

export function apEligibility(state) {
  const k = state.k12;
  if (!k || k.done || k.dropout || k.expelled || state.character.age < 14 || state.character.age > 18) return { ok: false, reason: 'High-school students only' };
  if ((state.education.apCredit ?? 0) >= MAX_AP_CREDIT) return { ok: false, reason: 'A full year of credit already' };
  if (state.stats.smarts < 55) return { ok: false, reason: 'Needs 55+ smarts' };
  if (yearlyCount(state, 'higherEd.ap')) return { ok: false, reason: 'Once a year' };
  return { ok: true };
}

/** A year of AP exams or dual-enrollment classes at the community college. arg: 'ap' | 'dual' */
function apCourses(ctx, kind = 'ap') {
  const { state, rng } = ctx;
  const check = apEligibility(state);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  bumpYearly(state, 'higherEd.ap');
  const passed = rng.chance(clamp(0.45 + (state.stats.smarts - 60) / 60, 0.2, 0.95));
  ctx.spend(kind === 'ap' ? 300 : 150, kind === 'ap' ? 'AP exam fees' : 'Dual-enrollment fees', { allowDebt: true });
  ctx.stat('stress', 4);
  if (!passed) return ctx.log(kind === 'ap' ? 'You took three AP exams and scored 2s. No college credit this year.' : 'Your dual-enrollment class was harder than expected; the credit didn\'t transfer.', '📝', 'warn');
  state.education.apCredit = Math.min(MAX_AP_CREDIT, (state.education.apCredit ?? 0) + AP_CREDIT_PER_YEAR);
  ctx.log(kind === 'ap' ? 'You scored 4s and 5s on your AP exams: college credit before you get there.' : 'You took college classes at the community college while still in high school, and the credits count.', '🎯', 'good');
}

/** Years off a first bachelor's (or associate's) from AP / dual-enrollment credit, in half-year steps. */
YEAR_HOOKS.push((state, programId) => {
  if (!['bachelor', 'associate'].includes(programId) || state.education.apCreditUsed) return 0;
  if (state.education.degrees.some((d) => ['bachelor', 'associate'].includes(d.type))) return 0;
  return Math.floor((state.education.apCredit ?? 0) * 2 + 1e-9) / 2;
});
/** A master's in your field cuts a year of Ph.D. coursework (handled by the Ph.D. module). */

export function overloadEligibility(state) {
  const e = enrolled(state);
  if (!e || e.totalYears >= 99 || !['bachelor', 'associate', 'master'].includes(PROGRAMS[e.programId]?.type)) return { ok: false, reason: 'Undergraduate or master\'s students' };
  if (e.pace !== 'full') return { ok: false, reason: 'Full-time students only' };
  if (e.yearsAttended && e.gpa < 3.0) return { ok: false, reason: 'Needs a 3.0 GPA' };
  return { ok: true };
}

/** 4+1: add a master's in your major for one extra year. */
export function fourPlusOneEligibility(state) {
  const e = enrolled(state);
  if (!e || e.programId !== 'bachelor') return { ok: false, reason: 'Bachelor\'s students' };
  if (e.fourPlusOne) return { ok: false, reason: 'Already in the 4+1' };
  if (e.progress < 2) return { ok: false, reason: 'Apply in junior year' };
  if (e.gpa < 3.3) return { ok: false, reason: 'Needs a 3.3 GPA' };
  if (!MAJORS[e.major]?.levels.includes('master')) return { ok: false, reason: 'No master\'s in your major' };
  return { ok: true };
}

/** MD/MPH: a public-health year inside medical school. */
export function mphEligibility(state) {
  const e = enrolled(state);
  if (e?.programId !== 'md') return { ok: false, reason: 'Medical students' };
  if ((e.extraGrants ?? []).includes('mph')) return { ok: false, reason: 'Already added' };
  if (e.progress < 2 || e.progress >= e.totalYears - 1) return { ok: false, reason: 'Between M2 and M4' };
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Admissions                                                          */
/* ------------------------------------------------------------------ */

export function edEligibility(state, schoolId) {
  if (he(state).edUsed) return { ok: false, reason: 'Early Decision is once' };
  if (hasDegree(state, ['bachelor', 'master', 'doctorate', 'professional'])) return { ok: false, reason: 'For first-time college applicants' };
  if (!SCHOOLS[schoolId] || !['private', 'elite', 'state'].includes(schoolId)) return { ok: false, reason: 'Selective colleges only' };
  return { ok: true };
}

/** Early Decision: apply early to one school, binding if admitted. arg: 'bachelor:schoolId:major' */
function earlyDecision(ctx, arg) {
  const { state } = ctx;
  const [programId, schoolId, major] = String(arg).split(':');
  if (programId !== 'bachelor') return ctx.toast('Early Decision is for bachelor\'s programs', 'warn');
  const check = edEligibility(state, schoolId);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  he(state).edUsed = true;
  he(state).edBoost = true;
  EducationEngine.actions.enroll(ctx, `${programId}:${schoolId}:${major ?? ''}:full`);
  he(state).edBoost = false;
  if (enrolled(state)?.schoolId === schoolId) ctx.log('Admitted Early Decision in December. Binding: you withdrew every other application.', '💌', 'good');
}

/** BS/MD: a high-school senior admitted to college and medical school at once (7 years). arg: schoolId */
function applyBsmd(ctx, schoolId = 'state') {
  const { state, rng } = ctx;
  const k = state.k12;
  if (hasDegree(state, ['bachelor', 'associate']) || enrolled(state)) return ctx.toast('For high-school seniors', 'warn');
  if (!k?.done || state.character.age > 19) return ctx.toast('Apply as you finish high school', 'warn');
  if (he(state).bsmdTried) return ctx.toast('One application', 'warn');
  he(state).bsmdTried = true;
  const hsGpa = k.gpa ?? state.education.degrees.find((d) => d.type === 'highschool')?.gpa ?? 3;
  const odds = clamp(0.08 + (state.stats.smarts - 88) / 40 + (hsGpa - 3.8) * 0.5 + Math.min(0.08, (k.resume ?? 0) * 0.01), 0.01, 0.5);
  if (!rng.chance(odds)) return ctx.log('The BS/MD program interviewed you, then waitlisted you. You\'ll apply to medical school the usual way.', '📭', 'warn');
  he(state).bsmd = { schoolId, guaranteed: false };
  EducationEngine.actions.enroll(ctx, `bachelor:${schoolId}:biology:full`);
  const e = enrolled(state);
  if (!e) return;
  e.totalYears = 3;
  e.bsmd = true;
  ctx.log('Admitted to a seven-year BS/MD program: three years of college, then a guaranteed seat in medical school if you keep a 3.5 GPA. No MCAT.', '🩺', 'milestone');
}

export function greTake(ctx) {
  const { state, rng } = ctx;
  if (state.character.age < 19 || !(hasDegree(state, ['bachelor']) || enrolled(state)?.programId === 'bachelor')) return ctx.toast('College students and graduates', 'warn');
  if (yearlyCount(state, 'higherEd.gre')) return ctx.toast('Once a year', 'warn');
  bumpYearly(state, 'higherEd.gre');
  ctx.spend(220, 'GRE registration', { allowDebt: true });
  const score = Math.round(clamp(305 + (state.stats.smarts - 70) * 0.8 + rng.int(-6, 6), 260, 340));
  he(state).gre = Math.max(score, he(state).gre ?? 0);
  ctx.log(`You scored ${score} on the GRE (verbal + quantitative).`, '📝', score >= 320 ? 'good' : 'info');
}

/** Graduate admissions read research, letters, theses, fellowships and the GRE. */
ADMISSION_HOOKS.push({
  boost(state, programId, schoolId) {
    const h = he(state);
    if (!h) return 0;
    let b = 0;
    if (programId === 'bachelor' && h.edBoost) b += SCHOOLS[schoolId]?.prestige >= 2 ? 0.14 : 0.06;
    const grad = ['phd', 'mdphd', 'master'].includes(programId) || PROGRAMS[programId]?.type === 'master';
    if (!grad) return b;
    b += Math.min(0.18, (h.ugResearch ?? 0) * 0.06) + (h.thesis ? 0.04 : 0) + Math.min(0.06, (h.letters ?? 0) * 0.02) + (h.gre ? (h.gre - 312) / 100 : 0);
    b += Math.max(0, ...Object.keys(h.fellowships ?? {}).map((id) => FELLOWSHIPS[id]?.boost ?? 0));
    if (programId === 'phd' && !(h.ugResearch > 0) && !(state.science?.papers > 0) && SCHOOLS[schoolId]?.prestige >= 3) b -= 0.1;
    return b;
  },
});

/* ------------------------------------------------------------------ */
/* Campus jobs, theses, fellowships, assistantships                    */
/* ------------------------------------------------------------------ */

export function campusJobEligibility(state, id) {
  const j = CAMPUS_JOBS[id];
  const e = enrolled(state);
  if (!j) return { ok: false, reason: 'Unknown job' };
  if (!isUndergrad(e)) return { ok: false, reason: 'Undergraduates only' };
  if (j.minYear && e.progress < j.minYear) return { ok: false, reason: 'Sophomores and up' };
  if (j.gpa && e.yearsAttended && e.gpa < j.gpa) return { ok: false, reason: `Needs a ${j.gpa.toFixed(1)} GPA` };
  if (j.smarts && state.stats.smarts < j.smarts) return { ok: false, reason: `Needs ${j.smarts}+ smarts` };
  if (j.residential && !ROOM_AND_BOARD[e.schoolId]) return { ok: false, reason: 'Residential campuses only' };
  if (id === 'workStudy' && state.people?.wealth === 'high') return { ok: false, reason: 'Need-based: your family earns too much' };
  return { ok: true };
}

function campusJobTick(ctx) {
  const { state, rng } = ctx;
  const h = he(state);
  const e = enrolled(state);
  if (!h.campusJob) return;
  if (!isUndergrad(e)) { h.campusJob = null; return; }
  const j = CAMPUS_JOBS[h.campusJob];
  if (j.pay) ctx.earn(j.pay, `${j.name} (campus job)`, { wage: true });
  ctx.stat('stress', j.stress);
  if (h.campusJob === 'ra') ctx.earn(ROOM_AND_BOARD[e.schoolId] ?? 12000, 'Resident Advisor room and board');
  if (h.campusJob === 'tutor') h.letters = Math.min(3, (h.letters ?? 0) + 1);
  if (h.campusJob === 'lab') {
    h.ugResearch = (h.ugResearch ?? 0) + 1;
    h.letters = Math.min(3, (h.letters ?? 0) + 1);
    const p = state.medicine?.premed;
    if (p && p.research < 3) p.research += 1;
    if (rng.chance(0.18)) {
      state.science.papers += 1;
      ctx.log('Your lab put your name on a paper — as an undergraduate.', '🔬', 'good');
    }
  }
}

/** The big postgraduate fellowships, applied for in senior year. */
function applyFellowship(ctx, id) {
  const { state, rng } = ctx;
  const f = FELLOWSHIPS[id];
  const e = enrolled(state);
  if (!f) return;
  if (e?.programId !== 'bachelor' || !finalYear(e)) return ctx.toast('Seniors only', 'warn');
  if (yearlyCount(state, `higherEd.fellowship.${id}`)) return ctx.toast('Already applied', 'warn');
  if (e.gpa < f.minGpa) return ctx.toast(`Needs a ${f.minGpa} GPA`, 'warn');
  bumpYearly(state, `higherEd.fellowship.${id}`);
  const odds = clamp(f.odds + (state.stats.smarts - 85) / 300 + (SCHOOLS[e.schoolId].prestige - 1) * 0.01 + (he(state).ugResearch ?? 0) * 0.01 + (he(state).thesis ? 0.01 : 0), 0.005, 0.5);
  ctx.stat('stress', 4);
  if (!rng.chance(odds)) return ctx.log(`You were a finalist for the ${f.name}, but not selected.`, '📭', 'warn');
  (he(state).fellowships ??= {})[id] = state.character.age;
  addHonor(state, { id: `fellowship.${id}`, source: 'civil', name: f.name, icon: f.icon, prestige: f.prestige, precedence: 30, citation: f.desc });
  if (id === 'fulbright') he(state).fulbrightAge = state.character.age + 1;
  ctx.log(`You won the ${f.name}! ${f.desc}`, f.icon, 'honor');
  ctx.stat('happiness', 12);
}

/** Adjunct teaching on the side: by the course, no benefits. arg: number of courses (1–3) */
export function adjunctEligibility(state) {
  if (!hasDegree(state, ['master', 'doctorate', 'professional'])) return { ok: false, reason: 'Needs a graduate degree' };
  if (state.character.age > 80) return { ok: false, reason: 'Retired from teaching' };
  if (state.military.service?.component === 'active') return { ok: false, reason: 'Not on active duty' };
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  if (yearlyCount(state, 'higherEd.adjunct')) return { ok: false, reason: 'One teaching contract a year' };
  return { ok: true };
}
function teachAdjunct(ctx, n) {
  const { state, rng } = ctx;
  const check = adjunctEligibility(state);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  bumpYearly(state, 'higherEd.adjunct');
  const courses = clamp(Number(n) || 1, 1, 3);
  const rate = hasDegree(state, ['doctorate']) ? ADJUNCT_PAY.doctorate : ADJUNCT_PAY.masters;
  const h = he(state);
  h.adjunctYears = (h.adjunctYears ?? 0) + 1;
  h.adjunctCourses = (h.adjunctCourses ?? 0) + courses;
  ctx.earn(rate * courses, `Adjunct teaching (${courses} course${courses > 1 ? 's' : ''})`, { wage: true });
  ctx.stat('stress', 3 * courses);
  ctx.log(`${rng.pick(['You taught night sections at the community college.', 'You taught an evening course at the state university.', 'You taught online sections for a regional college.'])} ${courses} course${courses > 1 ? 's' : ''} at $${rate.toLocaleString()} each — no office, no benefits, and students who email at midnight.`, '🧑‍🏫');
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

const init = (state) => {
  state.higherEd ??= { campusJob: null, ugResearch: 0, letters: 0, thesis: false, gre: null, edUsed: false, edBoost: false, bsmd: null, fellowships: {}, fulbrightAge: null, adjunctYears: 0, adjunctCourses: 0 };
  state.education.apCredit ??= 0;
  state.science ??= { grant: null, papers: 0, unfunded: 0, scooped: 0 };
};

/** Grant every degree a combined program confers. */
function grantCombined(ctx, degree) {
  const { state } = ctx;
  const program = PROGRAMS[degree.programId];
  const grants = [...(program?.grants ?? []), ...(degree.extraGrants ?? [])];
  if (!grants.length) return;
  const field = state.education.degrees.find((d) => d.type === 'bachelor')?.major ?? 'biology';
  for (const id of grants) {
    if (state.education.degrees.some((d) => d.programId === id && d.year === degree.year)) continue;
    const p = PROGRAMS[id];
    state.education.degrees.push({ type: id === 'master' ? 'master' : p.type, programId: id, major: id === 'phd' || id === 'master' ? degree.major ?? field : null, schoolId: degree.schoolId, gpa: degree.gpa, year: degree.year, combined: degree.programId });
  }
  if (degree.programId === 'mdphd') {
    const s = state.medicine?.schoolRecord;
    state.academia.phdRecord = { advisorFame: 70, schoolId: degree.schoolId, papers: s?.pubs ?? 0, firstAuthor: Math.ceil((s?.pubs ?? 0) / 2), conference: 1, field };
  }
  ctx.log(`Your diploma reads: ${grants.map((id) => PROGRAMS[id]?.name ?? id).join(' and ')}.`, '🎓', 'milestone');
}

export const HigherEdModule = {
  id: 'higherEd',
  order: 9.8, // before the education module, so overloads count this year
  init,
  setup(engine) {
    engine.bus.on('education:enrolled', ({ ctx, programId }) => {
      const { state } = ctx;
      if (['bachelor', 'associate'].includes(programId) && state.education.apCredit > 0 && !state.education.apCreditUsed) {
        state.education.apCreditUsed = true;
        ctx.log(`Your AP and dual-enrollment credit shortened your degree.`, '🎯', 'good');
      }
      // Graduate assistantships at public universities.
      const e = state.education.enrolled;
      if (e && PROGRAMS[programId]?.type === 'master' && SCHOOLS[e.schoolId]?.public && ctx.rng.chance(0.35)) {
        e.tuitionWaiver = true;
        e.assistantship = true;
        ctx.log('The department offered you a graduate assistantship: tuition waived and a stipend for teaching sections.', '🧑‍🏫', 'good');
      }
    });
    engine.bus.on('education:graduated', ({ ctx, degree }) => {
      const { state } = ctx;
      const h = he(state);
      // Combined and 4+1 degrees.
      grantCombined(ctx, degree);
      // BS/MD: straight into medical school.
      if (h.bsmd && degree.type === 'bachelor') {
        if (degree.gpa >= 3.5) {
          h.bsmd.guaranteed = true;
          EducationEngine.actions.enroll(ctx, `md:${h.bsmd.schoolId}::full`);
          if (state.education.enrolled?.programId === 'md') ctx.log('As promised, the BS/MD program moved you straight into medical school.', '🩺', 'milestone');
        } else ctx.log('Your GPA fell below the 3.5 the BS/MD program required. You lost your guaranteed seat in medical school.', '🩺', 'bad');
        h.bsmd = null;
      }
      if (h.campusJob && !isUndergrad(state.education.enrolled)) h.campusJob = null;
    });
    engine.bus.on('education:left', ({ ctx }) => {
      const h = he(ctx.state);
      if (h.campusJob && !isUndergrad(ctx.state.education.enrolled)) h.campusJob = null;
      if (h.bsmd) h.bsmd = null;
    });
  },
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const h = he(state);
    const e = enrolled(state);
    if (e?.overload && e.pace === 'full') {
      e.progress = Math.min(e.totalYears, e.progress + OVERLOAD_PROGRESS);
      ctx.stat('stress', 6);
    }
    if (e?.assistantship) {
      ctx.earn(ASSISTANTSHIP_STIPEND, 'Graduate assistantship stipend', { wage: true });
      ctx.stat('stress', 2);
    }
    campusJobTick(ctx);
    if (h.fulbrightAge === state.character.age) {
      ctx.earn(25000, 'Fulbright stipend');
      ctx.stat('happiness', 8);
      ctx.log(rng.pick(['Your Fulbright year: teaching English in a mountain town in Taiwan.', 'Your Fulbright year: research in an archive in Lisbon.', 'Your Fulbright year: teaching in a secondary school in Senegal.']), '🌍', 'good');
    }
  },
  actions: {
    apCourses: (ctx, kind) => apCourses(ctx, kind),
    overload(ctx) {
      const check = overloadEligibility(ctx.state);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      const e = enrolled(ctx.state);
      e.overload = !e.overload;
      ctx.log(e.overload ? 'You loaded up on 21 credits a semester plus summer classes to graduate early.' : 'You went back to a normal course load.', '📚');
    },
    fourPlusOne(ctx) {
      const check = fourPlusOneEligibility(ctx.state);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      const e = enrolled(ctx.state);
      e.fourPlusOne = true;
      e.totalYears += 1;
      (e.extraGrants ??= []).push('master');
      ctx.log(`You were admitted to the 4+1 program: one more year and you'll graduate with a bachelor's and a master's in ${MAJORS[e.major].name}.`, '🎓', 'good');
    },
    addMph(ctx) {
      const check = mphEligibility(ctx.state);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      const e = enrolled(ctx.state);
      e.totalYears += 1;
      (e.extraGrants ??= []).push('mph');
      ctx.log('You added a year for a Master of Public Health. You\'ll graduate MD/MPH.', '🏥', 'good');
    },
    earlyDecision: (ctx, arg) => earlyDecision(ctx, arg),
    applyBsmd: (ctx, schoolId) => applyBsmd(ctx, schoolId),
    gre: (ctx) => greTake(ctx),
    campusJob(ctx, id) {
      const h = he(ctx.state);
      if (id === 'quit') {
        h.campusJob = null;
        return ctx.log('You quit your campus job.', '🚪');
      }
      const check = campusJobEligibility(ctx.state, id);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      h.campusJob = id;
      ctx.log(`You started a campus job: ${CAMPUS_JOBS[id].name}. ${CAMPUS_JOBS[id].desc}`, CAMPUS_JOBS[id].icon, 'good');
    },
    thesis(ctx) {
      const { state, rng } = ctx;
      const e = enrolled(state);
      const h = he(state);
      if (e?.programId !== 'bachelor' || !finalYear(e)) return ctx.toast('Seniors only', 'warn');
      if (h.thesis) return ctx.toast('Already written', 'warn');
      if (e.gpa < 3.3) return ctx.toast('Needs a 3.3 GPA', 'warn');
      h.thesis = true;
      h.letters = Math.min(3, (h.letters ?? 0) + 1);
      ctx.stat('stress', 8);
      if (rng.chance(0.2)) state.science.papers += 1;
      ctx.log('You wrote a senior honors thesis — eighty pages, a defense, and graduation with honors in the major.', '📜', 'good');
    },
    fellowship: (ctx, id) => applyFellowship(ctx, id),
    adjunct: (ctx, n) => teachAdjunct(ctx, n),
    earlyTenure(ctx) {
      const { state } = ctx;
      const job = state.career.job;
      if (!job?.tenureClock || job.levelId !== 'assistant') return ctx.toast('Tenure-track faculty only', 'warn');
      if (job.yearsInLevel < 3 || job.yearsInLevel >= TENURE_CLOCK - 1) return ctx.toast('Between years 3 and 4 of the clock', 'warn');
      if (job.tenureClock.early) return ctx.toast('Already going up early', 'warn');
      job.tenureClock.early = true;
      ctx.log('You put your case up for tenure early. The bar is higher — and a denial still counts.', '📁', 'warn');
    },
  },
};
