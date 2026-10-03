/**
 * Civil-service machinery shared by municipal and federal employment:
 *
 *   • Civil Service Exams — scored from smarts (and fitness for public
 *     safety), education and veterans' preference. Scores are valid for 4
 *     years; 70 passes, and higher scores rank you higher on hiring lists.
 *   • Security clearances — Public Trust, Secret, Top Secret/SCI. Granted
 *     through an SF-86 background investigation where *honesty matters*:
 *     disclosed problems are mitigated; concealed ones can surface at a
 *     polygraph or periodic reinvestigation and become a federal crime
 *     (false statements).
 *
 * state.publicService = {
 *   exams: { [examId]: { score, age } },
 *   clearance: { level, status: 'active'|'current', sinceAge, grantedAge, lastInvestigationAge, concealed } | null,
 *   federal: { stability, shutdown },   // FederalAgencies
 *   city: { name, approval, fiscalHealth } | null,   // MunicipalGov
 * }
 */
import { highestDegree, DEGREE_RANK, hasFelony, yearlyCount, bumpYearly } from '../../core/State.js';
import { clamp } from '../../core/Random.js';

export const PASSING_SCORE = 70;
export const EXAM_VALID_YEARS = 4;

export const EXAMS = {
  municipal: { name: 'Municipal Civil Service Exam', icon: '📝', cost: 25, minAge: 18, desc: 'Clerical, public works and planning jobs.' },
  publicSafety: { name: 'Public Safety Entrance Exam', icon: '🚓', cost: 40, minAge: 18, desc: 'Written + physical ability test for police, fire and EMS.' },
  state: { name: 'State Civil Service Exam', icon: '🏛️', cost: 30, minAge: 18, desc: 'State agencies: police, corrections, revenue, CPS, natural resources, DOT, courts.' },
  federal: { name: 'Federal Occupational Assessment', icon: '🦅', cost: 0, minAge: 18, desc: 'USA Hire assessment for federal agencies.' },
  foreignService: { name: 'Foreign Service Officer Test (FSOT)', icon: '🌐', cost: 0, minAge: 20, desc: 'Followed by an oral assessment. Notoriously hard.' },
};

export const CLEARANCES = {
  publicTrust: { rank: 1, name: 'Public Trust', icon: '🪪', threshold: 40, discovery: 0.2, reinvestYears: 10 },
  secret: { rank: 2, name: 'Secret', icon: '🔒', threshold: 55, discovery: 0.35, reinvestYears: 10 },
  topSecret: { rank: 3, name: 'Top Secret / SCI', icon: '🔐', threshold: 65, discovery: 0.6, reinvestYears: 5, polygraph: true },
};

export const CLEARANCE_GRACE_YEARS = 2;

/* ------------------------------------------------------------------ */
/* Exams                                                               */
/* ------------------------------------------------------------------ */

/** Veterans' preference points: 5 for honorable service, 10 with a service-connected disability. */
export function veteranPreference(state) {
  const honorable = state.military.history.some((h) => ['honorable', 'retired', 'medical'].includes(h.discharge));
  if (!honorable) return 0;
  return state.retirement.pensions.some((p) => p.id === 'va') ? 10 : 5;
}

export function rawExamScore(state, examId, rng) {
  const s = state.stats;
  const degree = highestDegree(state);
  const eduBonus = degree ? DEGREE_RANK[degree.type] * 2.5 : 0;
  let score = 28 + s.smarts * 0.45 + eduBonus + rng.int(-8, 8);
  if (examId === 'publicSafety') score = 22 + s.smarts * 0.3 + s.fitness * 0.3 + eduBonus + rng.int(-8, 8);
  if (examId === 'foreignService') score -= 14;
  return Math.round(clamp(score, 0, 100));
}

export function examStatus(state, examId) {
  const e = state.publicService.exams[examId];
  if (!e) return { taken: false, valid: false, passed: false, score: null };
  const valid = state.character.age - e.age < EXAM_VALID_YEARS;
  return { taken: true, valid, passed: valid && e.score >= PASSING_SCORE, score: e.score, rankedScore: e.score + veteranPreference(state), expiresAge: e.age + EXAM_VALID_YEARS };
}

/* ------------------------------------------------------------------ */
/* Clearances                                                          */
/* ------------------------------------------------------------------ */

export function hasClearance(state, level) {
  if (!level) return true;
  const c = state.publicService.clearance;
  return Boolean(c && CLEARANCES[c.level].rank >= CLEARANCES[level].rank);
}

/** Things an investigator will find. */
export function backgroundIssues(state) {
  const age = state.character.age;
  const issues = [];
  const record = state.legal.record;
  if (hasFelony(state)) issues.push({ id: 'felony', label: 'Felony conviction', weight: 60 });
  const misd = record.filter((r) => r.severity === 'misdemeanor' && age - r.age <= 10).length;
  if (misd) issues.push({ id: 'misdemeanor', label: `${misd} recent misdemeanor${misd > 1 ? 's' : ''}`, weight: misd * 10 });
  if (state.legal.flags.drugUseAge != null && age - state.legal.flags.drugUseAge <= 7) issues.push({ id: 'drugs', label: 'Illegal drug use in the last 7 years', weight: 18 });
  if (state.finances.cash < -15000) issues.push({ id: 'debt', label: 'Delinquent debt', weight: 15 });
  if (state.finances.bankruptcies) issues.push({ id: 'bankruptcy', label: 'Bankruptcy', weight: 10 });
  const recentCredit = state.housing.credit.events.filter((e) => ['foreclosure', 'eviction', 'default'].includes(e.type) && age - e.age <= 7);
  if (recentCredit.length) issues.push({ id: 'credit', label: `${recentCredit.length} foreclosure/eviction/default${recentCredit.length > 1 ? 's' : ''} in 7 years`, weight: recentCredit.length * 8 });
  if (state.legal.investigations.length) issues.push({ id: 'pending', label: 'Undisclosed misconduct', weight: 0, hidden: true });
  return issues;
}

/**
 * Run an SF-86 investigation. `honest` = disclosed everything.
 * Returns { granted, concealed, caught, issues, reason }.
 */
export function adjudicate(state, level, honest, rng) {
  const def = CLEARANCES[level];
  const issues = backgroundIssues(state).filter((i) => !i.hidden);
  const penalty = issues.reduce((s, i) => s + i.weight, 0);
  if (!issues.length) {
    return { granted: rng.chance(0.97), concealed: false, caught: false, issues, reason: 'Clean background' };
  }
  if (honest) {
    const score = 88 - penalty * 0.6 + rng.int(-10, 10);
    return { granted: score >= def.threshold, concealed: false, caught: false, issues, reason: score >= def.threshold ? 'Issues mitigated by candor' : 'Denied after adjudication' };
  }
  if (rng.chance(def.discovery)) {
    return { granted: false, concealed: true, caught: true, issues, reason: def.polygraph ? 'The polygraph caught the omission' : 'Investigators found what you left off the form' };
  }
  return { granted: true, concealed: true, caught: false, issues, reason: 'Investigators missed it — for now' };
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export const PublicServiceEngine = {
  id: 'publicservice',
  order: 25,

  init(state) {
    state.publicService ??= { exams: {}, clearance: null, federal: { stability: 60, shutdown: false }, city: null };
    state.publicService.city ??= null;
  },

  setup(engine) {
    engine.bus.on('clearance:grant', ({ ctx, level, concealed }) => {
      const age = ctx.state.character.age;
      ctx.state.publicService.clearance = { level, status: 'active', sinceAge: age, grantedAge: age, lastInvestigationAge: age, concealed };
      ctx.log(`You were granted a ${CLEARANCES[level].name} security clearance.`, CLEARANCES[level].icon, 'good');
    });
    engine.bus.on('military:discharged', ({ ctx, type }) => {
      const c = ctx.state.publicService.clearance;
      if (!c || !['oth', 'dishonorable'].includes(type)) return;
      ctx.state.publicService.clearance = null;
      ctx.log(`Your ${CLEARANCES[c.level].name} clearance was revoked with your ${type === 'oth' ? 'Other Than Honorable' : 'Dishonorable'} discharge.`, '🚫', 'bad');
    });
    engine.bus.on('legal:convicted', ({ ctx, severity, offenseId, name }) => {
      const c = ctx.state.publicService.clearance;
      if (!c) return;
      if (severity === 'felony' || ['drugPossession', 'falseStatement', 'leak'].includes(offenseId)) {
        ctx.state.publicService.clearance = null;
        ctx.log(`Your ${CLEARANCES[c.level].name} clearance was revoked (${name}).`, '🚫', 'bad');
        ctx.emit('career:clearanceRevoked', {});
      }
    });
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const c = state.publicService.clearance;
    if (!c) return;
    const age = state.character.age;
    // Cleared civilian jobs and cleared military service both keep a clearance active.
    const needsIt = Boolean(state.career.job?.clearance) || Boolean(state.military?.service?.clearance);

    if (needsIt) {
      if (c.status !== 'active') c.status = 'active';
      c.sinceAge = age;
      const def = CLEARANCES[c.level];
      if (age - c.lastInvestigationAge >= def.reinvestYears) {
        c.lastInvestigationAge = age;
        if (c.concealed && rng.chance(0.45)) {
          state.publicService.clearance = null;
          ctx.log('Your periodic reinvestigation uncovered information you concealed on your SF-86. Your clearance was revoked and the case was referred to prosecutors.', '🕵️', 'bad');
          ctx.emit('legal:offense', { offenseId: 'falseStatement', context: 'SF-86 concealment', caught: true });
          ctx.emit('career:clearanceRevoked', {});
        } else {
          ctx.log(`You passed your periodic ${def.name} reinvestigation.`, def.icon);
        }
      }
    } else if (c.status === 'active') {
      c.status = 'current';
      c.sinceAge = age;
    } else if (age - c.sinceAge > CLEARANCE_GRACE_YEARS) {
      state.publicService.clearance = null;
      ctx.log(`Your ${CLEARANCES[c.level].name} clearance lapsed after ${CLEARANCE_GRACE_YEARS} years out of a cleared job.`, '⌛', 'muted');
    }
  },

  actions: {
    takeExam(ctx, examId) {
      const { state, rng } = ctx;
      const exam = EXAMS[examId];
      if (!exam) return;
      if (state.character.age < exam.minAge) return ctx.toast(`Must be ${exam.minAge}+.`, 'warn');
      if (state.legal.incarceration) return ctx.toast('Not from prison.', 'warn');
      if (yearlyCount(state, `exam.${examId}`)) return ctx.toast('You can retake it next year.', 'warn');
      if (exam.cost && !ctx.spend(exam.cost, exam.name, { credit: true })) return ctx.toast(`The exam fee is $${exam.cost} — card declined.`, 'warn');
      bumpYearly(state, `exam.${examId}`);
      const score = rawExamScore(state, examId, rng);

      if (examId === 'foreignService' && score >= PASSING_SCORE) {
        ctx.prompt({
          type: 'publicservice.oralAssessment',
          icon: '🌐',
          title: 'FSOT — Oral Assessment',
          text: `You passed the written FSOT (${score}). In the group exercise, your team must allocate an embassy's limited budget among competing projects. A colleague is dominating the discussion.`,
          options: [
            { id: 'facilitate', label: '🤝 Draw quieter members in and build consensus' },
            { id: 'argue', label: '🗣️ Forcefully argue for your own project' },
            { id: 'defer', label: '🙊 Stay quiet and let it play out' },
          ],
          data: { score },
        });
        return;
      }
      state.publicService.exams[examId] = { score, age: state.character.age };
      const pass = score >= PASSING_SCORE;
      ctx.log(`You scored ${score} on the ${exam.name}${pass ? ' — you made the eligibility list.' : '. Not a passing score.'}`, exam.icon, pass ? 'good' : 'bad');
      ctx.toast(`${exam.name}: ${score}`, pass ? 'good' : 'bad');
    },
  },

  resolvers: {
    oralAssessment(ctx, data, optionId) {
      const { state, rng } = ctx;
      const bonus = { facilitate: 12, argue: -4, defer: -12 }[optionId];
      const final = Math.round(clamp(data.score + bonus + rng.int(-5, 5), 0, 100));
      state.publicService.exams.foreignService = { score: final, age: state.character.age };
      const pass = final >= PASSING_SCORE;
      ctx.log(`Foreign Service oral assessment: ${final}. ${pass ? 'You are on the register for appointment!' : 'The panel did not recommend you.'}`, '🌐', pass ? 'good' : 'bad');
      ctx.toast(pass ? 'Passed the FSOA!' : 'Did not pass the FSOA', pass ? 'good' : 'bad');
    },
  },
};
