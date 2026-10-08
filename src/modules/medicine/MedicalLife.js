/**
 * The road to and through medicine, beyond the Match and malpractice
 * (career/Medicine.js):
 *
 *   Pre-med      The MCAT (472–528; it expires after three years) and the
 *                clinical hours, research and shadowing admissions
 *                committees expect. No MCAT, no application.
 *   Med school   M1–M2 in the classroom (and the anatomy lab), USMLE Step 1
 *                (pass/fail; fail twice and you're dismissed), M3 clerkship
 *                rotations graded for honors, a specialty to aim for, then
 *                Step 2 CK (scored) and away rotations in M4. Program
 *                directors read all of it on Match Day.
 *   Residency    80-hour weeks, an intern year you won't forget, Step 3, and
 *                moonlighting shifts once you're licensed.
 *   Practice     Hospital-employed, private practice (partnership after a
 *                buy-in), academic medicine (a faculty title, research,
 *                teaching residents) or locum tenens. Burnout builds; part-
 *                time hours and leave relieve it. Board recertification every
 *                ten years, private-equity buyout offers, grateful patients,
 *                the diagnosis nobody else caught — and the pill-mill offer
 *                that ends careers.
 *
 * state.medicine gains: mcat, mcatAge, mcatTries, premed { clinical, research, shadow },
 *   school { step1, step1Tries, honors, rotations, step2, step2Tries, interest, pubs, aways } | null,
 *   schoolRecord, practice, practiceAge, partner, partnerOffered, partTime, burnout, mocAge, facultyRank
 */
import { clamp } from '../../core/Random.js';
import { addHonor, yearlyCount, bumpYearly } from '../../core/State.js';
import { ADMISSION_HOOKS } from '../education/EducationEngine.js';
import { leaveJob } from '../career/CareerEngine.js';
import { SPECIALTIES, PRACTICES, TRAINING_LEVELS, applyPhysicianPay, isDoctor } from '../career/Medicine.js';

export const MCAT = { min: 472, max: 528, mean: 501, cost: 335, prepCost: 2500, validYears: 3 };
export const ROTATIONS = 7;
export const STEP2_PASS = 214;
export const MOC_YEARS = 10;
export const BUY_IN = 120000;
export const PREMED_CAP = { clinical: 4, research: 3, shadow: 2 };

const med = (state) => state.medicine;
const isMd = (e) => e?.programId === 'md';
const science = (state) => state.education.degrees.some((d) => ['biology', 'chemistry', 'physics', 'nursing', 'kinesiology', 'nutrition', 'psychology'].includes(d.major));
const inCollege = (state) => state.education.degrees.some((d) => ['bachelor', 'master', 'doctorate'].includes(d.type)) || ['bachelor', 'premedPostbacc'].includes(state.education.enrolled?.programId);

/* ------------------------------------------------------------------ */
/* Pre-med                                                             */
/* ------------------------------------------------------------------ */

export function mcatEligibility(state) {
  if (state.character.age < 19) return { ok: false, reason: 'Age 19+' };
  if (!inCollege(state)) return { ok: false, reason: 'In or after college' };
  if (isMd(state.education.enrolled) || state.education.degrees.some((d) => d.programId === 'md')) return { ok: false, reason: 'Already in medicine' };
  if (yearlyCount(state, 'medLife.mcat')) return { ok: false, reason: 'One sitting a year' };
  if ((med(state).mcatTries ?? 0) >= 7) return { ok: false, reason: 'Lifetime limit of seven attempts' };
  return { ok: true };
}

export function takeMcat(ctx, mode = 'prep') {
  const { state, rng } = ctx;
  const check = mcatEligibility(state);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  bumpYearly(state, 'medLife.mcat');
  const prep = mode === 'prep';
  ctx.spend(MCAT.cost + (prep ? MCAT.prepCost : 0), prep ? 'MCAT and a prep course' : 'MCAT registration', { allowDebt: true });
  const m = med(state);
  m.mcatTries = (m.mcatTries ?? 0) + 1;
  const score = Math.round(clamp(MCAT.mean + (state.stats.smarts - 70) * 0.5 + (prep ? 4 : 0) + (science(state) ? 1 : 0) + rng.int(-6, 6) - Math.max(0, state.stats.stress - 70) / 10, MCAT.min, MCAT.max));
  const best = Math.max(score, m.mcat ?? 0);
  if (score >= (m.mcat ?? 0)) m.mcatAge = state.character.age;
  m.mcat = best;
  ctx.stat('stress', prep ? 8 : 4);
  const pct = Math.round(clamp(50 + (score - MCAT.mean) * 4.2, 1, 100));
  ctx.log(`You scored ${score} on the MCAT (${pct}th percentile).${score < best ? ` Schools will see your best score, ${best}.` : ''}`, '📝', score >= 510 ? 'good' : score < 495 ? 'warn' : 'info');
}

/** Clinical hours, research and shadowing for the application. arg: 'clinical' | 'research' | 'shadow' */
export function premed(ctx, kind) {
  const { state, rng } = ctx;
  if (!PREMED_CAP[kind]) return;
  if (state.character.age < 17 || state.education.degrees.some((d) => d.programId === 'md') || isMd(state.education.enrolled)) return ctx.toast('For pre-meds', 'warn');
  if (yearlyCount(state, 'medLife.premed')) return ctx.toast('One pre-med activity a year', 'warn');
  const p = (med(state).premed ??= { clinical: 0, research: 0, shadow: 0 });
  if (p[kind] >= PREMED_CAP[kind]) return ctx.toast('You have plenty of that already', 'info');
  bumpYearly(state, 'medLife.premed');
  p[kind] += 1;
  ctx.stat('stress', 3);
  const text = {
    clinical: rng.pick(['You worked as an ER scribe: 400 hours of watching doctors think out loud.', 'You volunteered at a free clinic every Saturday.', 'You worked shifts as an EMT. The first cardiac arrest stays with you.']),
    research: rng.pick(['You spent the year pipetting in a cancer biology lab.', 'You ran participants for a psychology study and learned what a p-value is for.']),
    shadow: rng.pick(['You shadowed a surgeon for two weeks and stood for eleven hours straight.', 'You shadowed a rural family doctor who knew every patient by name.']),
  }[kind];
  if (kind === 'research' && rng.chance(0.3)) {
    state.science.papers += 1;
    ctx.log(`${text} Your name made it onto a paper.`, '🔬', 'good');
  } else ctx.log(text, kind === 'clinical' ? '🚑' : kind === 'research' ? '🔬' : '👀', 'good');
}

/** Admissions: the MCAT is required; scores and experiences move the odds. */
ADMISSION_HOOKS.push({
  eligibility(state, programId) {
    if (programId !== 'md') return null;
    const m = med(state);
    if (!m?.mcat) return 'Take the MCAT first';
    if (state.character.age - (m.mcatAge ?? 0) > MCAT.validYears) return 'Your MCAT score expired (3 years)';
    return null;
  },
  boost(state, programId) {
    if (programId !== 'md') return 0;
    const m = med(state);
    const p = m.premed ?? { clinical: 0, research: 0, shadow: 0 };
    const exp = Math.min(0.12, p.clinical * 0.03 + p.research * 0.025 + p.shadow * 0.02);
    return ((m.mcat ?? MCAT.mean) - 508) / 25 + exp - (p.clinical ? 0 : 0.12);
  },
});

/* ------------------------------------------------------------------ */
/* Medical school                                                      */
/* ------------------------------------------------------------------ */

const oneAtATime = (ctx, type, spec) => {
  if (!ctx.state.prompts.some((p) => p.type === type)) ctx.prompt({ type, ...spec });
};

export const step1Odds = (state, dedicated) => clamp(0.88 + (state.stats.smarts - 75) / 120 + (dedicated ? 0.05 : 0) - Math.max(0, state.stats.stress - 75) / 150, 0.5, 0.99);
export const honorsOdds = (state, effort = 0) => clamp(0.22 + (state.stats.smarts - 75) / 120 + effort - Math.max(0, state.stats.stress - 75) / 200, 0.05, 0.75);

const SCHOOL_EVENTS = [
  { id: 'cadaver', icon: '🫀', title: 'The Anatomy Lab', text: 'Your first day in the anatomy lab. Your donor\'s hands still have nail polish on them.', options: [{ id: 'respect', label: '🙏 Write a letter of thanks to the donor\'s family' }, { id: 'joke', label: '😬 Cope with gallows humor' }] },
  { id: 'pimping', icon: '🧑‍⚕️', title: 'Pimped on Rounds', text: 'The attending fires questions at you in front of the whole team: "What are the causes of an anion-gap acidosis?"', options: [{ id: 'answer', label: '🧠 Answer confidently', hint: 'Smarts check' }, { id: 'admit', label: '🙋 "I don\'t know, but I\'ll look it up."' }] },
  { id: 'mistreatment', icon: '😠', title: 'Mistreatment', text: 'A resident keeps humiliating you and another student in front of patients.', options: [{ id: 'report', label: '📋 Report it to the clerkship director' }, { id: 'endure', label: '🤐 Keep your head down for the evaluation' }] },
  { id: 'burnout', icon: '🌧️', title: 'Running on Empty', text: 'You haven\'t seen your friends in months, and you cried in a supply closet after a code.', options: [{ id: 'counseling', label: '🫂 Use the student counseling service' }, { id: 'push', label: '💪 Push through' }] },
  { id: 'patient', icon: '🛏️', title: 'Your Patient', text: 'An elderly patient you have followed all month is going to hospice. She asks you, the student, to explain what that means.', options: [{ id: 'stay', label: '🪑 Pull up a chair and take your time' }, { id: 'resident', label: '🏃 Get the resident' }] },
];

function schoolEvent(ctx) {
  const e = ctx.rng.pick(SCHOOL_EVENTS);
  oneAtATime(ctx, 'medLife.schoolEvent', { icon: e.icon, title: e.title, text: e.text, options: e.options, data: { eventId: e.id } });
}

/** Dismissed from medical school. */
function dismiss(ctx, why) {
  const { state } = ctx;
  const e = state.education.enrolled;
  state.education.enrolled = null;
  med(state).school = null;
  ctx.log(`${why} The medical school dismissed you. Your student loans did not go away.`, '🏫', 'bad');
  ctx.stat('happiness', -20);
  ctx.emit('education:left', { reason: 'dismissed', enrollment: e });
}

function schoolTick(ctx) {
  const { state, rng } = ctx;
  const e = state.education.enrolled;
  const m = med(state);
  if (!isMd(e) || state.legal.incarceration) return;
  const s = (m.school ??= { step1: null, step1Tries: 0, honors: 0, rotations: 0, step2: null, step2Tries: 0, interest: null, pubs: 0, aways: 0 });
  const year = Math.floor(e.progress) + 1;
  ctx.stat('stress', year >= 3 ? 6 : 4);
  if (rng.chance(0.35)) schoolEvent(ctx);
  if (year === 1) return ctx.log('M1: biochemistry, physiology and the anatomy lab. You drink from a fire hose.', '📚');
  if (year === 2 || (year === 3 && s.step1 !== 'pass')) {
    if (s.step1 !== 'pass') oneAtATime(ctx, 'medLife.step1', { icon: '📝', title: 'USMLE Step 1', text: `${s.step1Tries ? 'Your second and final attempt.' : 'The first licensing exam: eight hours on the basic sciences, now scored pass/fail.'} Fail twice and you're out.`, options: [{ id: 'dedicated', label: '📚 Six weeks of dedicated study', hint: `≈${Math.round(step1Odds(state, true) * 100)}% · brutal` }, { id: 'normal', label: '🙂 Study alongside classes', hint: `≈${Math.round(step1Odds(state, false) * 100)}%` }] });
    if (year === 2) return;
  }
  if (s.step1 !== 'pass') return;
  if (s.rotations < ROTATIONS) {
    // M3: clerkships, each graded honors / high pass / pass.
    const done = Math.min(ROTATIONS - s.rotations, ROTATIONS);
    let honors = 0;
    for (let i = 0; i < done; i++) if (rng.chance(honorsOdds(state, s.effort ?? 0))) honors += 1;
    s.rotations += done;
    s.honors += honors;
    s.effort = 0;
    ctx.log(`M3 clerkships: medicine, surgery, pediatrics, OB-GYN, psychiatry, neurology and family medicine. Honors in ${honors} of ${done}.`, '🩺', honors >= 3 ? 'good' : 'info');
    if (!s.interest) oneAtATime(ctx, 'medLife.interest', { icon: '🧭', title: 'What Kind of Doctor?', text: 'Clerkships are over. Which specialty will you apply into? Your letters, away rotations and research will aim there.', options: Object.entries(SPECIALTIES).map(([id, sp]) => ({ id, label: `${sp.icon} ${sp.name}` })) });
    else {
      step2Prompt(ctx);
      awaysPrompt(ctx, s);
    }
    return;
  }
  // M4: Step 2 CK (asked right after clerkships) — a failed score gets one retake before graduation.
  if (s.step2 == null) return step2Prompt(ctx);
  if (s.step2 < STEP2_PASS) {
    s.step2Tries += 1;
    const score = step2Score(state, rng, s, false);
    s.step2 = Math.max(s.step2, score);
    if (score < STEP2_PASS) return dismiss(ctx, `You failed Step 2 CK again (${score}).`);
    ctx.log(`You passed Step 2 CK on your retake (${score}).`, '📝', 'good');
  }
}

function step2Score(state, rng, s, hard) {
  return Math.round(clamp(245 + (state.stats.smarts - 75) * 0.6 + (hard ? 5 : 0) + s.honors * 0.8 + rng.int(-12, 12) - Math.max(0, state.stats.stress - 80) / 5, 190, 280));
}

function step2Prompt(ctx) {
  oneAtATime(ctx, 'medLife.step2', { icon: '📝', title: 'USMLE Step 2 CK', text: 'Clinical knowledge, scored — the number program directors look at first now that Step 1 is pass/fail. The national average is about 248; the passing score is 214.', options: [{ id: 'hard', label: '📚 Study hard', hint: 'Higher score, more stress' }, { id: 'normal', label: '🙂 Study normally' }] });
}

function awaysPrompt(ctx, s) {
  oneAtATime(ctx, 'medLife.aways', { icon: '✈️', title: 'Away Rotations', text: `Students applying into ${SPECIALTIES[s.interest].name} do audition rotations at programs they want — a month of trying to impress strangers.`, options: [{ id: 'two', label: '✈️ Do two away rotations', hint: '$6,000 in travel; two strong letters' }, { id: 'one', label: '🧳 Do one', hint: '$3,000' }, { id: 'none', label: '🏠 Stay home' }] });
}

/* ------------------------------------------------------------------ */
/* Residency and practice                                              */
/* ------------------------------------------------------------------ */

const RESIDENCY_EVENTS = [
  { id: 'code', icon: '❤️‍🩹', title: 'Code Blue', text: 'At 3 a.m. you are the senior doctor in the room when a patient\'s heart stops.', options: [{ id: 'lead', label: '🫡 Run the code', hint: 'Smarts check' }, { id: 'call', label: '📞 Call the attending in' }] },
  { id: 'error', icon: '💊', title: 'Your Mistake', text: 'Thirty hours into a shift, you wrote the wrong dose. The pharmacist caught it. Mostly.', options: [{ id: 'disclose', label: '🙋 Tell the patient and your attending' }, { id: 'quiet', label: '🤫 Fix the order and say nothing', tone: 'danger' }] },
  { id: 'loss', icon: '🕯️', title: 'The Patient You Lost', text: 'A patient your age died on your service. You did everything right, and it didn\'t matter.', options: [{ id: 'debrief', label: '🫂 Go to the team debrief' }, { id: 'next', label: '🚶 Move on to the next patient' }] },
  { id: 'hours', icon: '⏰', title: 'Duty Hours', text: 'Your program director asks you to log 80 hours when you really worked 95.', options: [{ id: 'honest', label: '📋 Log the real hours' }, { id: 'fudge', label: '🙈 Log 80 like everyone else' }] },
];
const PATIENT_EVENTS = [
  { id: 'diagnosis', icon: '🔎', title: 'The Zebra', text: 'Three doctors missed it. Your patient\'s odd mix of symptoms keeps nagging at you.', options: [{ id: 'dig', label: '📚 Stay late and dig', hint: 'Smarts check' }, { id: 'refer', label: '➡️ Refer to a specialist' }] },
  { id: 'grateful', icon: '💐', title: 'A Grateful Patient', text: 'A patient you treated years ago wrote to say she just watched her daughter graduate.', options: [{ id: 'keep', label: '📌 Pin the letter above your desk' }] },
  { id: 'mission', icon: '🌍', title: 'Medical Mission', text: 'Doctors Without Borders needs a physician for six weeks in a field hospital.', options: [{ id: 'go', label: '✈️ Go (unpaid)', hint: 'Meaningful; costs you six weeks of pay' }, { id: 'no', label: '🏠 Not this year' }] },
  { id: 'family', icon: '👪', title: 'The Family Meeting', text: 'A dying patient\'s family wants "everything done." Everything would mean weeks of suffering.', options: [{ id: 'talk', label: '🪑 Sit down and talk about goals of care' }, { id: 'comply', label: '✅ Do what they ask' }] },
];

function residencyTick(ctx, job) {
  const { state, rng } = ctx;
  const m = med(state);
  m.burnout = clamp((m.burnout ?? 10) + 6, 0, 100);
  ctx.stat('stress', 6);
  if (job.levelId === 'resident' && job.yearsInLevel <= 1 && !m.step3) {
    m.step3 = true;
    ctx.log('Intern year: you passed USMLE Step 3, the last licensing exam, somewhere between night shifts.', '📝', 'good');
  }
  if (rng.chance(0.45)) {
    const e = rng.pick(RESIDENCY_EVENTS);
    oneAtATime(ctx, 'medLife.residencyEvent', { icon: e.icon, title: e.title, text: e.text, options: e.options, data: { eventId: e.id } });
  }
}

function practiceTick(ctx, job) {
  const { state, rng } = ctx;
  const m = med(state);
  if (!m.practice) {
    oneAtATime(ctx, 'medLife.practice', { icon: '🏥', title: 'Where Will You Practice?', text: 'Training is over. You are an attending physician — board-eligible and free to choose how you practice.', options: Object.entries(PRACTICES).map(([id, p]) => ({ id, label: `${p.icon} ${p.name}`, hint: p.desc })) });
    return;
  }
  const p = PRACTICES[m.practice];
  m.burnout = clamp((m.burnout ?? 20) + p.burnout + (state.stats.stress > 70 ? 3 : 0) - (m.partTime ? 7 : 0) - (state.stats.happiness > 70 ? 2 : 0), 0, 100);
  // Academic medicine: research, teaching residents and a faculty rank.
  if (m.practice === 'academic') {
    if (rng.chance(0.35)) state.science.papers += 1;
    const years = state.character.age - (m.practiceAge ?? state.character.age);
    const rank = years >= 12 && state.science.papers >= 20 ? 'Professor of Medicine' : years >= 6 ? 'Associate Professor of Medicine' : 'Assistant Professor of Medicine';
    if (rank !== m.facultyRank) {
      if (m.facultyRank) ctx.log(`The medical school promoted you to ${rank}.`, '🎓', 'milestone');
      m.facultyRank = rank;
    }
  }
  // Private practice: a partnership offer after three years.
  if (m.practice === 'private' && !m.partner && !m.partnerOffered && state.character.age - m.practiceAge >= 3) {
    m.partnerOffered = true;
    oneAtATime(ctx, 'medLife.partner', { icon: '🤝', title: 'Partnership', text: `The partners voted to offer you a partnership. The buy-in is $${BUY_IN.toLocaleString()}; after that you share in the practice's profits.`, options: [{ id: 'buy', label: '🤝 Buy in', hint: `$${BUY_IN.toLocaleString()} · partner pay` }, { id: 'decline', label: '🙅 Stay an employee' }] });
  } else if (m.partner && rng.chance(0.05)) {
    oneAtATime(ctx, 'medLife.buyout', { icon: '💼', title: 'A Private-Equity Offer', text: 'A private-equity firm wants to buy your practice. The partners would get a large check now and become employees with production targets.', options: [{ id: 'sell', label: '💰 Sell' }, { id: 'keep', label: '🩺 Stay independent' }] });
  }
  // Board recertification.
  const boards = state.credentials.held.boardCertified;
  if (boards?.status === 'active') {
    m.mocAge ??= boards.earnedAge ?? state.character.age;
    if (state.character.age - m.mocAge >= MOC_YEARS) oneAtATime(ctx, 'medLife.moc', { icon: '🏅', title: 'Board Recertification', text: 'Your board certification is up for renewal: a long exam on a decade of new medicine.', options: [{ id: 'study', label: '📚 Study for it', hint: '≈92%' }, { id: 'wing', label: '🎲 Wing it', hint: '≈75%' }] });
  }
  // Burnout catches up.
  if (m.burnout >= 70 && !state.prompts.some((x) => x.type === 'medLife.burnout') && rng.chance(0.5)) {
    oneAtATime(ctx, 'medLife.burnout', { icon: '🕯️', title: 'Burned Out', text: 'You dread clinic. You chart at midnight. You snapped at a nurse who didn\'t deserve it. Half of American doctors report burnout; you are one of them.', options: [{ id: 'partTime', label: '🕐 Cut back to part-time', hint: '70% pay' }, { id: 'leave', label: '🏖️ Take three months off', hint: 'Unpaid' }, { id: 'push', label: '💪 Push through', hint: 'More errors, more claims' }, { id: 'quit', label: '🚪 Leave clinical medicine', tone: 'danger' }] });
  }
  // Temptation.
  if (m.practice !== 'academic' && rng.chance(0.03)) oneAtATime(ctx, 'medLife.pillMill', { icon: '💊', title: 'An Offer', text: 'A "pain management" clinic offers you $5,000 a week to sign prescriptions for patients you\'ll barely see.', options: [{ id: 'refuse', label: '🚫 Refuse and report them' }, { id: 'accept', label: '✍️ Sign the scripts', hint: 'Prescription fraud', tone: 'danger' }] });
  if (rng.chance(0.25)) {
    const e = rng.pick(PATIENT_EVENTS);
    oneAtATime(ctx, 'medLife.patientEvent', { icon: e.icon, title: e.title, text: e.text, options: e.options, data: { eventId: e.id } });
  }
  // Recognition.
  const years = state.character.age - (m.practiceAge ?? state.character.age);
  if (years >= 8 && job.performance >= 75 && !state.honors.some((h) => h.id === 'medicine.topDoctor') && rng.chance(0.1)) {
    addHonor(state, { id: 'medicine.topDoctor', source: 'civil', name: 'Top Doctors list', icon: '🩺', prestige: 4, precedence: 45, citation: 'Named by your peers as one of the region\'s best physicians.' });
    ctx.log('Your colleagues voted you onto the regional "Top Doctors" list.', '🩺', 'honor');
  }
  if (m.practice === 'academic' && (state.science.hIndex ?? 0) >= 35 && !state.honors.some((h) => h.id === 'medicine.lasker') && rng.chance(0.005)) {
    addHonor(state, { id: 'medicine.lasker', source: 'civil', name: 'Lasker Award', icon: '🏆', prestige: 40, precedence: 25, citation: 'America\'s top prize in medical research.' });
    ctx.earn(250000, 'Lasker Award');
    ctx.log('You won the Lasker Award, often called "America\'s Nobel." Some winners go on to Stockholm.', '🏆', 'honor');
  }
}

/* ------------------------------------------------------------------ */
/* Modules                                                             */
/* ------------------------------------------------------------------ */

const init = (state) => {
  state.medicine ??= { specialty: null, fellowship: null, fellowshipYearsLeft: 0, research: false, claims: [] };
  const m = state.medicine;
  m.premed ??= { clinical: 0, research: 0, shadow: 0 };
  m.burnout ??= 0;
  state.science ??= { grant: null, papers: 0, unfunded: 0, scooped: 0 };
};

/** Runs before the education module: medical school milestones. */
export const MedSchoolModule = {
  id: 'medSchool',
  order: 9.7,
  init,
  setup(engine) {
    engine.bus.on('education:enrolled', ({ ctx, programId }) => {
      if (programId === 'md') med(ctx.state).school = { step1: null, step1Tries: 0, honors: 0, rotations: 0, step2: null, step2Tries: 0, interest: null, pubs: 0, aways: 0 };
    });
    engine.bus.on('education:graduated', ({ ctx, degree }) => {
      const m = med(ctx.state);
      if (degree.programId !== 'md' || !m.school) return;
      m.schoolRecord = { ...m.school };
      m.school = null;
      ctx.log(`You are Dr. ${ctx.state.character.lastName}, M.D. Step 2 CK ${m.schoolRecord.step2 ?? '—'}, honors in ${m.schoolRecord.honors} of ${ROTATIONS} clerkships. Next: the Match.`, '🩺', 'milestone');
    });
    engine.bus.on('education:left', ({ ctx, enrollment }) => {
      if (enrollment?.programId === 'md') med(ctx.state).school = null;
    });
  },
  onAgeUp(ctx) {
    schoolTick(ctx);
  },
};

export const MedLifeModule = {
  id: 'medLife',
  order: 30.8,
  init,
  onAgeUp(ctx) {
    const { state } = ctx;
    const job = state.career.job;
    const m = med(state);
    if (!isDoctor(job)) {
      m.burnout = Math.max(0, (m.burnout ?? 0) - 15);
      return;
    }
    if (!job.paidThisYear || state.legal.incarceration) return;
    if (TRAINING_LEVELS.includes(job.levelId) || m.fellowshipYearsLeft > 0 || m.research) residencyTick(ctx, job);
    else practiceTick(ctx, job);
  },
  actions: {
    takeMcat: (ctx, mode) => takeMcat(ctx, mode),
    premed: (ctx, kind) => premed(ctx, kind),
    research(ctx) {
      const { state, rng } = ctx;
      const s = med(state).school;
      if (!s) return ctx.toast('Medical students only', 'warn');
      if (yearlyCount(state, 'medLife.research')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'medLife.research');
      ctx.stat('stress', 5);
      if (rng.chance(0.55)) {
        s.pubs += 1;
        state.science.papers += 1;
        ctx.log('Your summer research project became a published paper.', '🔬', 'good');
      } else ctx.log('A summer of chart review. The paper is "in preparation."', '🔬');
    },
    studyClerkship(ctx) {
      const s = med(ctx.state).school;
      if (!s || s.step1 !== 'pass' || s.rotations >= ROTATIONS) return ctx.toast('During clerkships', 'warn');
      if (yearlyCount(ctx.state, 'medLife.clerkship')) return ctx.toast('Once a year', 'warn');
      bumpYearly(ctx.state, 'medLife.clerkship');
      s.effort = 0.1;
      ctx.stat('stress', 6);
      ctx.log('You pre-rounded at 4:30 every morning and read every night. Attendings noticed.', '📖');
    },
    moonlight(ctx) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!isDoctor(job) || !TRAINING_LEVELS.includes(job.levelId) || state.credentials.held.medicalLicense?.status !== 'active') return ctx.toast('Licensed residents only', 'warn');
      if (yearlyCount(state, 'medLife.moonlight')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'medLife.moonlight');
      const pay = rng.int(18, 35) * 1000;
      ctx.earn(pay, 'Moonlighting shifts', { wage: true });
      ctx.stat('stress', 6);
      med(state).burnout = clamp(med(state).burnout + 5, 0, 100);
      ctx.log(`You moonlighted on your weekends off: urgent care and overnight admissions for $${pay.toLocaleString()}.`, '🌙', 'good');
    },
    partTime(ctx) {
      const { state } = ctx;
      const job = state.career.job;
      const m = med(state);
      if (!isDoctor(job) || TRAINING_LEVELS.includes(job.levelId) || !m.practice) return ctx.toast('Attendings only', 'warn');
      m.partTime = !m.partTime;
      applyPhysicianPay(state, job);
      ctx.log(m.partTime ? 'You cut back to three days a week.' : 'You went back to full-time practice.', '🕐');
    },
    changePractice(ctx, id) {
      const { state } = ctx;
      const job = state.career.job;
      const m = med(state);
      if (!isDoctor(job) || !m.practice || !PRACTICES[id] || id === m.practice) return;
      if (state.character.age - (m.practiceAge ?? 0) < 3) return ctx.toast('Give it three years', 'warn');
      m.practice = id;
      m.practiceAge = state.character.age;
      m.partner = false;
      m.partnerOffered = false;
      applyPhysicianPay(state, job);
      ctx.log(`You moved into ${PRACTICES[id].name.toLowerCase()}.`, PRACTICES[id].icon, 'milestone');
    },
  },
  resolvers: {
    step1(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const s = med(state).school;
      if (!s || s.step1 === 'pass') return;
      const dedicated = optionId === 'dedicated';
      ctx.stat('stress', dedicated ? 12 : 6);
      s.step1Tries += 1;
      if (rng.chance(step1Odds(state, dedicated))) {
        s.step1 = 'pass';
        ctx.log('You passed USMLE Step 1. On to the wards.', '📝', 'good');
      } else if (s.step1Tries >= 2) dismiss(ctx, 'You failed USMLE Step 1 a second time.');
      else {
        s.step1 = 'fail';
        const e = state.education.enrolled;
        if (e) e.totalYears += 1;
        ctx.log('You failed Step 1. Your clerkships are delayed a year while you retake it.', '📝', 'bad');
        ctx.stat('happiness', -10);
      }
    },
    step2(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const s = med(state).school;
      if (!s || s.step2 != null) return;
      const hard = optionId === 'hard';
      ctx.stat('stress', hard ? 10 : 5);
      s.step2Tries += 1;
      s.step2 = step2Score(state, rng, s, hard);
      if (s.step2 >= STEP2_PASS) ctx.log(`You scored ${s.step2} on Step 2 CK.`, '📝', s.step2 >= 255 ? 'good' : 'info');
      else ctx.log(`You scored ${s.step2} on Step 2 CK — below the passing score of ${STEP2_PASS}. You'll retake it before graduation.`, '📝', 'bad');
    },
    interest(ctx, _data, optionId) {
      const s = med(ctx.state).school;
      if (!s || !SPECIALTIES[optionId]) return;
      s.interest = optionId;
      ctx.log(`You decided to apply into ${SPECIALTIES[optionId].name}.`, SPECIALTIES[optionId].icon);
      step2Prompt(ctx);
      awaysPrompt(ctx, s);
    },
    aways(ctx, _data, optionId) {
      const s = med(ctx.state).school;
      if (!s) return;
      const n = { two: 2, one: 1 }[optionId] ?? 0;
      if (!n) return ctx.log('You skipped away rotations.', '🏠');
      ctx.spend(3000 * n, 'Away rotations', { allowDebt: true });
      s.aways = n;
      ctx.stat('stress', 3 * n);
      ctx.log(`You did ${n} away rotation${n > 1 ? 's' : ''} and came home with strong letters.`, '✈️', 'good');
    },
    schoolEvent(ctx, data, optionId) {
      const { state, rng } = ctx;
      const s = med(state).school;
      switch (`${data.eventId}.${optionId}`) {
        case 'cadaver.respect': ctx.stat('happiness', 2); ctx.log('You wrote to the family. The memorial service at the end of the year was the most moving hour of medical school.', '🙏'); break;
        case 'pimping.answer': if (state.stats.smarts + rng.int(-15, 15) > 80) { if (s) s.effort = (s.effort ?? 0) + 0.05; ctx.log('You rattled off the whole mnemonic. The attending nodded — high praise.', '🧠', 'good'); } else { ctx.stat('happiness', -3); ctx.log('You blanked. The silence lasted forever.', '😶', 'warn'); } break;
        case 'pimping.admit': ctx.log('"Good answer," the attending said. "Look it up and teach us tomorrow."', '🙋'); break;
        case 'mistreatment.report': ctx.stat('stress', -2); ctx.log('The clerkship director moved you to a different team and opened an inquiry.', '📋'); break;
        case 'mistreatment.endure': ctx.stat('stress', 5); ctx.stat('happiness', -4); ctx.log('You got through it. You promised yourself you\'d never be that kind of doctor.', '🤐'); break;
        case 'burnout.counseling': ctx.stat('stress', -8); ctx.log('Counseling helped, and so did learning half your class felt the same way.', '🫂', 'good'); break;
        case 'burnout.push': ctx.stat('stress', 6); ctx.stat('happiness', -5); ctx.log('You kept going on caffeine and stubbornness.', '💪'); break;
        case 'patient.stay': ctx.stat('happiness', 4); ctx.log('You talked for an hour. Her daughter hugged you on the way out.', '🪑', 'good'); break;
        default: ctx.log('You moved on.', '🩺');
      }
    },
    residencyEvent(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      const m = med(state);
      switch (`${data.eventId}.${optionId}`) {
        case 'code.lead': if (state.stats.smarts + rng.int(-15, 15) > 78) { if (job) job.performance = Math.min(100, job.performance + 6); ctx.log('Compressions, epinephrine, a shock — and a pulse. The nurses started calling you "doctor" without irony.', '❤️‍🩹', 'good'); } else { ctx.stat('stress', 6); ctx.log('You froze for ten seconds that felt like ten minutes. The patient survived anyway.', '😰', 'warn'); } break;
        case 'code.call': ctx.log('The attending came in, ran it, and debriefed you after. You learned.', '📞'); break;
        case 'error.disclose': if (job) job.boss = Math.min(100, (job.boss ?? 50) + 4); ctx.log('Your attending thanked you for your honesty. The patient was fine.', '🙋', 'good'); break;
        case 'error.quiet': m.burnout = clamp(m.burnout + 6, 0, 100); if (rng.chance(0.25)) { if (job) job.performance = Math.max(0, job.performance - 15); ctx.log('A safety review traced the error to you. Hiding it was worse than making it.', '⚠️', 'bad'); } else ctx.log('Nobody found out. You think about it more than you\'d like.', '🤫', 'warn'); break;
        case 'loss.debrief': m.burnout = Math.max(0, m.burnout - 5); ctx.log('The debrief helped. So did hearing the attending say it out loud: "This one wasn\'t your fault."', '🫂'); break;
        case 'loss.next': m.burnout = clamp(m.burnout + 5, 0, 100); ctx.log('You saw the next patient. And the next.', '🚶'); break;
        case 'hours.honest': if (job) job.boss = Math.max(0, (job.boss ?? 50) - 3); ctx.log('The program got a warning from the accrediting body. Your program director was not pleased; your co-residents were.', '📋'); break;
        case 'hours.fudge': m.burnout = clamp(m.burnout + 4, 0, 100); ctx.log('You logged 80.', '🙈'); break;
        default: ctx.log('You moved on.', '🩺');
      }
    },
    practice(ctx, _data, optionId) {
      const { state } = ctx;
      const m = med(state);
      const job = state.career.job;
      if (!PRACTICES[optionId] || m.practice || !job) return;
      m.practice = optionId;
      m.practiceAge = state.character.age;
      applyPhysicianPay(state, job);
      ctx.log(`You chose ${PRACTICES[optionId].name.toLowerCase()}. ${PRACTICES[optionId].desc}`, PRACTICES[optionId].icon, 'milestone');
    },
    partner(ctx, _data, optionId) {
      const { state } = ctx;
      const m = med(state);
      if (optionId !== 'buy' || m.practice !== 'private') return ctx.log('You stayed an employed associate.', '🩺');
      if (!ctx.spend(BUY_IN, 'Practice partnership buy-in', { credit: true })) {
        state.finances.loans += BUY_IN;
        ctx.log('You financed the buy-in with a practice loan.', '🏦');
      }
      m.partner = true;
      applyPhysicianPay(state, state.career.job);
      ctx.log('You are a partner now: an owner of the practice, with a share of its profits.', '🤝', 'milestone');
    },
    buyout(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const m = med(state);
      if (optionId !== 'sell' || !m.partner) return ctx.log('You turned down the private-equity money.', '🩺');
      const check = rng.int(6, 18) * 100000;
      ctx.earn(check, 'Sale of your practice share', { ltcg: true });
      m.partner = false;
      m.practice = 'employed';
      applyPhysicianPay(state, state.career.job);
      ctx.log(`You sold your share of the practice for $${check.toLocaleString()} and became an employee of the new owners — with productivity targets.`, '💼', 'good');
    },
    burnout(ctx, _data, optionId) {
      const { state } = ctx;
      const m = med(state);
      const job = state.career.job;
      if (!isDoctor(job)) return;
      if (optionId === 'partTime') {
        m.partTime = true;
        m.burnout = Math.max(0, m.burnout - 25);
        applyPhysicianPay(state, job);
        ctx.log('You cut back to three days a week. You remembered why you went into medicine.', '🕐', 'good');
      } else if (optionId === 'leave') {
        m.burnout = Math.max(0, m.burnout - 35);
        ctx.spend(Math.round(job.salary * 0.25), 'Three months of unpaid leave', { allowDebt: true });
        ctx.stat('happiness', 8);
        ctx.log('You took three months off. You slept. You came back.', '🏖️', 'good');
      } else if (optionId === 'quit') {
        leaveJob(ctx, 'Left clinical medicine (burnout)');
        m.burnout = 20;
        ctx.log('You walked away from clinical medicine. Pharma, consulting and health-tech companies all want doctors.', '🚪', 'warn');
      } else {
        ctx.stat('stress', 8);
        ctx.log('You pushed on.', '💪');
      }
    },
    moc(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const m = med(state);
      m.mocAge = state.character.age;
      if (rng.chance(optionId === 'study' ? 0.92 : 0.75)) return ctx.log('You passed your board recertification exam. Ten more years.', '🏅', 'good');
      m.mocAge = state.character.age - MOC_YEARS + 1;
      ctx.log('You failed the recertification exam. Your certification lapses until you pass.', '🏅', 'bad');
      ctx.emit('credential:suspend', { ids: ['boardCertified'], years: 1, reason: 'Failed board recertification' });
    },
    pillMill(ctx, _data, optionId) {
      const { state, rng } = ctx;
      if (optionId !== 'accept') return ctx.log('You refused, and reported the clinic to the DEA.', '🚫', 'good');
      ctx.earn(rng.int(150, 250) * 1000, 'Pain clinic "consulting"');
      ctx.emit('legal:offense', { offenseId: 'prescriptionFraud', context: 'a pill mill', caught: rng.chance(0.45), evidence: 0.8 });
    },
    patientEvent(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      switch (`${data.eventId}.${optionId}`) {
        case 'diagnosis.dig': if (state.stats.smarts + rng.int(-15, 15) > 80) { if (job) job.performance = Math.min(100, job.performance + 8); ctx.stat('happiness', 6); ctx.log('You found it: a rare disease, treatable. The case report went to a journal.', '🔎', 'good'); state.science.papers += 1; } else ctx.log('You couldn\'t crack it. The specialist did.', '🔎'); break;
        case 'diagnosis.refer': ctx.log('You referred the patient on.', '➡️'); break;
        case 'grateful.keep': ctx.stat('happiness', 6); med(state).burnout = Math.max(0, med(state).burnout - 5); ctx.log('You read it twice.', '💐', 'good'); break;
        case 'mission.go': if (job) ctx.spend(Math.round(job.salary / 9), 'Six weeks unpaid on a medical mission', { allowDebt: true }); ctx.stat('happiness', 10); med(state).burnout = Math.max(0, med(state).burnout - 10); ctx.log('Six weeks in a field hospital. You did more medicine with less than ever before.', '🌍', 'good'); break;
        case 'family.talk': ctx.stat('happiness', 3); ctx.log('An hour of hard conversation. They chose comfort care, and thanked you.', '🪑', 'good'); break;
        case 'family.comply': ctx.stat('stress', 4); ctx.log('You did everything. It was not what the patient would have wanted.', '✅'); break;
        default: ctx.log('Another day in practice.', '🩺');
      }
    },
  },
};
