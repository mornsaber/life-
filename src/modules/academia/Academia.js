/**
 * Academic life: the Ph.D., the academic job market, tenure, and a research
 * career measured in papers, citations, grants and students.
 *
 *   The Ph.D.     Pick an advisor (fame, support and money pull in different
 *                 directions); TA, RA or a fellowship (NSF GRFP); coursework,
 *                 qualifying exams (fail twice and you "master out"), the
 *                 proposal and candidacy (ABD), years of research, then the
 *                 defense when your committee thinks you have a dissertation.
 *                 Time to degree varies: most take 5–7 years; programs cut
 *                 you loose after 8. Leaving after quals earns a master's.
 *   The market    Tenure-track jobs are scarce. Offers depend on first-author
 *                 papers, your h-index, your advisor's name, your Ph.D.
 *                 school and postdoc years — and on the field: computer
 *                 science and engineering hire; the humanities barely do.
 *   Tenure        Six years on the clock; the dossier is reviewed on
 *                 research (judged by the kind of school), teaching and
 *                 grants. Denied tenure means one terminal year.
 *   The record    Papers keep being cited; the h-index follows. Professors
 *                 graduate their own Ph.D. students, take sabbaticals every
 *                 seventh year and collect honors: NSF CAREER awards,
 *                 society fellowships, the National Academy, a MacArthur
 *                 "genius grant" — and, very rarely, a Nobel Prize.
 *   Misconduct    Fabricated data tends to surface. Retractions end careers.
 *
 * state.academia = { phd, phdRecord, debarredUntil, fabricated, lastSabbaticalAge, grantSeen }
 * state.science gains citations, hIndex, firstAuthor, students, grantsWon, retractions.
 */
import { clamp } from '../../core/Random.js';
import { randomName, addHonor, yearlyCount, bumpYearly } from '../../core/State.js';
import { getProfession } from '../career/JobTrees.js';
import { hire, promote, leaveJob, bestEntryLevel, levelCheck, stepForAtLeast } from '../career/CareerEngine.js';
import { recalcSalary } from '../career/Compensation.js';
import { createEmployer } from '../career/Employers.js';
import { levelById, ladderFor } from '../career/Ladder.js';
import { SCHOOLS, MAJORS } from '../education/Catalog.js';

export const ACADEMIC_JOBS = ['university', 'college', 'communityCollege', 'research', 'nationalLab'];
const TENURE_TRACK = ['university', 'college'];
const HUMANITIES = ['history', 'english', 'arts', 'languages', 'religiousStudies', 'liberalArts', 'politicalScience', 'communications'];
const HOT_FIELDS = ['computerScience', 'engineering', 'mathematics', 'economics', 'physics', 'dataScience'];
export const PHD_TIME_LIMIT = 8;
export const TENURE_CLOCK = 6;
export const SABBATICAL_EVERY = 7;
export const GRFP = { odds: 0.16, bonus: 5000, years: 3 };

const sci = (state) => state.science;
const isPhd = (e) => e?.programId === 'phd';
const hasPhd = (state) => state.education.degrees.some((d) => d.programId === 'phd');
const fieldOf = (state) => state.education.degrees.find((d) => d.programId === 'phd')?.major ?? state.academia.phd?.field ?? null;

/** The h-index from citations (Hirsch's rule of thumb: h ≈ 0.54·√citations), never above papers. */
export const hIndexOf = (s) => Math.min(s.papers ?? 0, Math.round(0.54 * Math.sqrt(s.citations ?? 0)));

/* ------------------------------------------------------------------ */
/* The Ph.D.                                                           */
/* ------------------------------------------------------------------ */

export const ADVISOR_STYLES = {
  famous: { label: 'A famous professor with a huge lab', hint: 'Big name on your CV, money for an RA — but you\'ll see them twice a year', fame: [75, 95], support: [20, 40], ra: true },
  rising: { label: 'A rising-star assistant professor', hint: 'Hands-on and demanding: racing for tenure, and you\'re the engine', fame: [45, 65], support: [60, 80], ra: true, pressure: true },
  kind: { label: 'A kind mid-career professor', hint: 'Supportive and humane — but little grant money, so you\'ll TA', fame: [30, 50], support: [80, 95], ra: false },
};

function startPhd(ctx, e) {
  const { state, rng } = ctx;
  state.academia.phd = { field: e.major, schoolId: e.schoolId, advisor: null, funding: 'ta', grfp: 0, qualsTries: 0, quals: false, candidacy: false, papers: 0, firstAuthor: 0, conference: 0, internship: false, defended: false, advisorChanged: false };
  // Open-ended: the defense, not the calendar, ends a doctorate.
  e.totalYears = 99;
  // A master's in the field counts for the first year of coursework.
  if (state.education.degrees.some((d) => d.type === 'master' && d.major === e.major)) {
    e.progress = 1;
    state.academia.phd.mastersCredit = true;
    ctx.log('Your master\'s degree counted for the first year of Ph.D. coursework.', '🎯', 'good');
  }
  const candidates = Object.entries(ADVISOR_STYLES).map(([style, a]) => {
    const g = rng.pick(['male', 'female']);
    const n = randomName(rng, g);
    return { style, name: `Prof. ${n.firstName} ${n.lastName}`, fame: rng.int(...a.fame), support: rng.int(...a.support) };
  });
  ctx.prompt({
    type: 'academia.advisor',
    icon: '🧑‍🏫',
    title: 'Choose Your Advisor',
    text: `Rotations are over. Three ${MAJORS[e.major]?.name ?? ''} faculty have room in their labs. Your advisor shapes everything: your project, your funding, your sanity and your job prospects.`,
    options: candidates.map((c) => ({ id: c.style, label: `${c.name}: ${ADVISOR_STYLES[c.style].label}`, hint: ADVISOR_STYLES[c.style].hint })),
    data: { candidates },
  });
}

function phdPrompt(ctx, type, spec) {
  if (ctx.state.prompts.some((p) => p.type === type)) return;
  ctx.prompt({ type, ...spec });
}

/** Leave the program with a master's degree "en route" (if you passed quals). */
function masterOut(ctx, why) {
  const { state } = ctx;
  const e = state.education.enrolled;
  const phd = state.academia.phd;
  state.education.enrolled = null;
  if (!state.education.degrees.some((d) => d.type === 'master' && d.major === phd.field)) {
    state.education.degrees.push({ type: 'master', programId: 'master', major: phd.field, schoolId: e.schoolId, gpa: e.gpa, year: state.character.age, enRoute: true });
  }
  state.academia.phd = null;
  ctx.log(`${why} You left the Ph.D. program with a master's degree.`, '🎓', 'warn');
  ctx.stat('happiness', -8);
  ctx.emit('education:left', { reason: 'masteredOut', enrollment: e });
}

function paperYear(ctx, phd, effort = 0) {
  const { state, rng } = ctx;
  const a = phd.advisor;
  const p = clamp(0.3 + (state.stats.smarts - 70) / 150 + (a?.support ?? 50) / 400 + (a?.fame ?? 50) / 500 + effort - Math.max(0, state.stats.stress - 70) / 200, 0.05, 0.85);
  let n = 0;
  if (rng.chance(p)) n += 1;
  if (rng.chance(p / 3)) n += 1;
  if (!n) return 0;
  phd.papers += n;
  const first = rng.chance(0.75) ? 1 : 0;
  phd.firstAuthor += Math.min(n, first + (n > 1 && rng.chance(0.3) ? 1 : 0));
  const s = sci(state);
  s.papers += n;
  s.firstAuthor = (s.firstAuthor ?? 0) + Math.min(n, first);
  ctx.log(n > 1 ? `Two papers out of the lab this year, ${first ? 'one with you as first author' : 'you\'re a middle author on both'}.` : `${first ? 'Your first-author paper' : 'A paper with your name on it'} was accepted${rng.chance(0.25) ? ' after a brutal round with Reviewer 2' : ''}.`, '📄', 'good');
  return n;
}

function phdTick(ctx) {
  const { state, rng } = ctx;
  const e = state.education.enrolled;
  const phd = state.academia.phd;
  if (!isPhd(e) || !phd || state.legal.incarceration) return;
  const year = Math.floor(e.progress) + 1; // the year you are in now
  // Funding.
  if (phd.grfp > 0) {
    phd.grfp -= 1;
    ctx.earn(GRFP.bonus, 'NSF Graduate Research Fellowship (above the base stipend)');
  }
  if (phd.funding === 'ta') ctx.stat('stress', 4);
  ctx.stat('stress', phd.advisor?.style === 'rising' ? 4 : 2);
  if (!phd.advisor) return; // still choosing
  if (year === 1) {
    ctx.log('Coursework, rotations and your first taste of research.', '📚');
    if (!phd.grfpTried) phdPrompt(ctx, 'academia.grfp', { icon: '🏅', title: 'NSF Graduate Research Fellowship', text: 'The NSF GRFP pays three years of stipend and lets you work on what you like. About one applicant in six wins.', options: [{ id: 'apply', label: '✍️ Apply', hint: `≈${Math.round(grfpOdds(state) * 100)}%` }, { id: 'skip', label: '⏭️ Skip it' }] });
    return;
  }
  if (!phd.quals) {
    phdPrompt(ctx, 'academia.quals', { icon: '📝', title: 'Qualifying Exams', text: `${phd.qualsTries ? 'Your second and final attempt at quals.' : 'Quals: a written exam on the whole field and an oral grilling by four professors.'} Fail twice and you leave with a master's.`, options: [{ id: 'cram', label: '📚 Cram for months', hint: `≈${Math.round(qualsOdds(state, true) * 100)}% · stressful` }, { id: 'normal', label: '🙂 Prepare normally', hint: `≈${Math.round(qualsOdds(state, false) * 100)}%` }] });
    return;
  }
  if (!phd.candidacy) {
    phd.candidacy = true;
    ctx.log('You defended your dissertation proposal and advanced to candidacy. You are officially ABD — all but dissertation.', '🎓', 'milestone');
  }
  if (year > PHD_TIME_LIMIT) return masterOut(ctx, `You hit the program's ${PHD_TIME_LIMIT}-year limit without defending.`);
  paperYear(ctx, phd, phd.internship ? -0.05 : 0);
  phd.internship = false;
  // Life in the lab.
  if (rng.chance(0.35)) phdEvent(ctx, phd);
  // Ready to defend?
  const ready = phd.firstAuthor >= 3 || (phd.firstAuthor >= 2 && year >= 5) || (phd.papers >= 1 && year >= 6) || year >= 7;
  if (ready && !phd.defended) phdPrompt(ctx, 'academia.defense', { icon: '🎓', title: 'Your Committee Says You\'re Ready', text: `${phd.papers} paper${phd.papers === 1 ? '' : 's'} (${phd.firstAuthor} first-author) in year ${year}. You could write up and defend this year, or stay another year for one more paper — which helps on the job market.`, options: [{ id: 'defend', label: '🎓 Write up and defend' }, { id: 'stay', label: '🔬 One more year, one more paper' }] });
}

export const grfpOdds = (state) => clamp(GRFP.odds + (state.stats.smarts - 75) / 150 + (state.academia.phd?.schoolId === 'elite' ? 0.04 : 0), 0.05, 0.4);
export const qualsOdds = (state, cram) => clamp(0.66 + (state.stats.smarts - 75) / 70 + (cram ? 0.12 : 0) - Math.max(0, state.stats.stress - 70) / 150, 0.2, 0.97);

const PHD_EVENTS = [
  { id: 'reviewer2', icon: '📮', title: 'Reviewer 2', text: 'Reviewer 2 wants six new experiments and a different paper entirely.', options: [{ id: 'comply', label: '🧪 Do the experiments', hint: 'Slower, stronger paper' }, { id: 'rebut', label: '✍️ Write a sharp rebuttal', hint: 'Smarts check' }, { id: 'elsewhere', label: '📨 Send it to another journal' }] },
  { id: 'advisorMoves', icon: '🚚', title: 'Your Advisor Is Leaving', text: 'Your advisor accepted an offer at another university and is taking the lab.', options: [{ id: 'follow', label: '🚚 Follow them (transfer)', hint: 'Lose some momentum, keep your project' }, { id: 'switch', label: '🔄 Find a new advisor here', hint: 'A fresh start, a slower one' }, { id: 'remote', label: '💻 Stay, advised remotely', hint: 'Less support' }] },
  { id: 'internship', icon: '🏢', title: 'Industry Internship', text: 'A tech company offered you a paid summer research internship.', options: [{ id: 'accept', label: '✅ Take it', hint: '$30,000 for the summer; a slower research year' }, { id: 'decline', label: '🙅 Stay in the lab' }] },
  { id: 'imposter', icon: '🌧️', title: 'Imposter Syndrome', text: 'Everyone in your cohort seems smarter than you. Some mornings you can\'t open your laptop.', options: [{ id: 'counseling', label: '🫂 See the campus counseling center' }, { id: 'push', label: '💪 Push through' }] },
  { id: 'conference', icon: '🎤', title: 'Conference Talk', text: 'Your abstract was accepted for a talk at the field\'s biggest conference.', options: [{ id: 'go', label: '✈️ Give the talk', hint: 'Faculty who hire will see you' }, { id: 'skip', label: '🏠 Skip it' }] },
  { id: 'data', icon: '📉', title: 'The Data Don\'t Cooperate', text: 'Two years in, your results don\'t support the hypothesis your advisor promised the funding agency. A few outliers are the problem.', options: [{ id: 'honest', label: '📊 Report what you found' }, { id: 'massage', label: '✂️ Quietly drop the inconvenient points', hint: 'Research misconduct', tone: 'danger' }] },
  { id: 'teaching', icon: '🧑‍🏫', title: 'Teaching Overload', text: 'The department needs another TA for a 300-student intro course.', options: [{ id: 'take', label: '🙋 Take it ($4,000 extra)', hint: 'Less research' }, { id: 'refuse', label: '🙅 Protect your research time' }] },
];

function phdEvent(ctx, phd) {
  const e = ctx.rng.pick(PHD_EVENTS.filter((x) => x.id !== 'advisorMoves' || !phd.advisorChanged));
  phdPrompt(ctx, 'academia.phdEvent', { icon: e.icon, title: e.title, text: e.text, options: e.options, data: { eventId: e.id } });
}

/* ------------------------------------------------------------------ */
/* Research careers                                                    */
/* ------------------------------------------------------------------ */

function citationsTick(ctx) {
  const { state, rng } = ctx;
  const s = sci(state);
  s.citations ??= 0;
  const impact = 1 + (state.stats.smarts - 60) / 60 + (state.academia.phdRecord?.advisorFame ?? 50) / 200;
  s.citations += Math.round(s.papers * rng.float(1.5, 4) * Math.max(0.3, impact));
  const before = s.hIndex ?? 0;
  s.hIndex = hIndexOf(s);
  if (s.hIndex >= 10 && Math.floor(s.hIndex / 10) > Math.floor(before / 10)) ctx.log(`Your h-index reached ${s.hIndex}: ${s.hIndex} of your papers have been cited at least ${s.hIndex} times each.`, '📈', 'good');
  // A new grant since last year counts toward tenure and honors.
  if (s.grant && state.academia.grantSeen !== s.grant.agency + s.grant.amount) {
    state.academia.grantSeen = s.grant.agency + s.grant.amount;
    s.grantsWon = (s.grantsWon ?? 0) + 1;
  }
}

/** Ph.D. students you advise finish now and then. */
function studentsTick(ctx, job) {
  const { state, rng } = ctx;
  if (!['associate', 'professor', 'endowed', 'university', 'distinguished', 'chair', 'assistant', 'pi', 'senior', 'fellow', 'group'].includes(job.levelId) || job.professionId === 'communityCollege') return;
  if (!rng.chance(job.levelId === 'assistant' ? 0.12 : 0.28)) return;
  const s = sci(state);
  s.students = (s.students ?? 0) + 1;
  const n = randomName(rng, rng.pick(['male', 'female']));
  s.papers += 1;
  ctx.log(`${n.firstName} ${n.lastName}, your ${s.students === 1 ? 'first ' : ''}Ph.D. student, defended. ${rng.pick(['They\'re off to a postdoc.', 'They took a job in industry at twice your salary.', 'They got a tenure-track job — you couldn\'t be prouder.'])}`, '🎓', 'good');
}

/** Teaching: evaluations matter for tenure and at teaching-focused schools. */
function teachingTick(ctx, job) {
  const { state, rng } = ctx;
  job.teaching = Math.round(clamp((job.teaching ?? 60) * 0.6 + (45 + state.stats.smarts * 0.2 + state.stats.happiness * 0.15 + rng.int(-10, 10)) * 0.4, 0, 100));
}

/** The tenure clock: a dossier in year five, the decision in year six. */
function tenureTick(ctx, job) {
  const { state, rng } = ctx;
  if (!TENURE_TRACK.includes(job.professionId) || job.levelId !== 'assistant') return;
  const s = sci(state);
  job.tenureClock ??= { papers: s.papers, grants: s.grantsWon ?? 0, focus: null };
  if (job.terminal) {
    leaveJob(ctx, 'Denied tenure (terminal year ended)');
    return;
  }
  if (job.yearsInLevel === TENURE_CLOCK - 1 && !job.tenureClock.focus) {
    phdPrompt(ctx, 'academia.dossier', { icon: '📁', title: 'Tenure Dossier', text: `Your tenure case goes up next year. ${tenureSummary(state, job)}`, options: [{ id: 'research', label: '🔬 Push out one more paper', hint: 'Stressful' }, { id: 'teaching', label: '🧑‍🏫 Polish your teaching portfolio' }, { id: 'service', label: '🤝 Take on committee service' }] });
  }
  if (job.yearsInLevel < TENURE_CLOCK && !job.tenureClock.early) return;
  const p = tenureOdds(state, job);
  if (rng.chance(p)) {
    promote(ctx, 'associate');
    if (state.career.job) state.career.job.tenured = true;
    ctx.log(`Tenure! The board of ${job.employer.name} promoted you to Associate Professor with tenure. A job for life — if you want it.`, '🎉', 'milestone');
    ctx.stat('happiness', 15);
    ctx.stat('stress', -15);
  } else {
    job.terminal = true;
    ctx.log(`${job.employer.name} denied your tenure case. You have one terminal year to find another job.`, '📁', 'bad');
    ctx.stat('happiness', -20);
  }
}

/** What a school expects: research universities want papers and grants; teaching colleges, teaching. */
export function tenureBar(job) {
  const r1 = job.professionId === 'university' || job.employer.size === 'large';
  const teachingSchool = job.professionId === 'college' && job.employer.size === 'small';
  return { papers: r1 ? 10 : teachingSchool ? 3 : 6, grant: r1, teachingWeight: teachingSchool ? 2 : 1 };
}

export function tenureSummary(state, job) {
  const c = job.tenureClock ?? { papers: sci(state).papers, grants: sci(state).grantsWon ?? 0 };
  const bar = tenureBar(job);
  return `Since you were hired: ${sci(state).papers - c.papers} papers (the bar here is about ${bar.papers}), ${(sci(state).grantsWon ?? 0) - c.grants} grant${(sci(state).grantsWon ?? 0) - c.grants === 1 ? '' : 's'}${bar.grant ? ' (expected)' : ''}, teaching evaluations ${job.teaching ?? 60}/100.`;
}

export function tenureOdds(state, job) {
  const c = job.tenureClock ?? { papers: 0, grants: 0, focus: null };
  const bar = { ...tenureBar(job) };
  // Going up early: the committee expects a case strong enough for year six, now.
  if (c.early) bar.papers = Math.ceil(bar.papers * 1.25);
  const papers = sci(state).papers - c.papers;
  const grants = (sci(state).grantsWon ?? 0) - c.grants;
  let p = 0.55 + clamp((papers - bar.papers) / bar.papers, -1, 1) * 0.3 + ((job.teaching ?? 60) - 60) / 200 * bar.teachingWeight + (job.performance - 60) / 250;
  if (bar.grant) p += grants ? 0.12 : -0.2;
  if (c.focus === 'teaching') p += 0.04 * bar.teachingWeight;
  if (c.focus === 'service') p += 0.03;
  if (state.academia.fabricated) p -= 0.1;
  p -= 0.05 * (sci(state).predatory ?? 0);
  return clamp(p, 0.05, 0.95);
}

function sabbaticalAvailable(state, job) {
  if (!job || !TENURE_TRACK.includes(job.professionId) && job.professionId !== 'communityCollege') return { ok: false, reason: 'Faculty only' };
  if (!job.tenured && !job.abilities.includes('tenure')) return { ok: false, reason: 'Tenured faculty only' };
  const since = state.character.age - (state.academia.lastSabbaticalAge ?? job.startAge ?? state.character.age);
  if (since < SABBATICAL_EVERY) return { ok: false, reason: `Every ${SABBATICAL_EVERY} years (${SABBATICAL_EVERY - since} to go)` };
  return { ok: true };
}
export { sabbaticalAvailable };

/** Honors that come to well-cited researchers. */
const PRIZES = {
  biology: 'Nobel Prize in Physiology or Medicine', chemistry: 'Nobel Prize in Chemistry', physics: 'Nobel Prize in Physics', economics: 'Nobel Memorial Prize in Economic Sciences',
  engineering: 'Nobel Prize in Physics', environmentalScience: 'Nobel Prize in Chemistry', atmosphericScience: 'Nobel Prize in Physics', english: 'Nobel Prize in Literature',
  computerScience: 'Turing Award', mathematics: 'Abel Prize',
};
function honorsTick(ctx, job) {
  const { state, rng } = ctx;
  const s = sci(state);
  const a = state.academia;
  const field = fieldOf(state);
  const has = (id) => state.honors.some((h) => h.id === id);
  const give = (id, name, icon, prestige, citation, cash = 0) => {
    addHonor(state, { id, source: 'civil', name, icon, prestige, precedence: 30, citation });
    if (cash) ctx.earn(cash, name);
    ctx.log(`${name}! ${citation}`, icon, 'honor');
    ctx.stat('happiness', 10);
  };
  const age = state.character.age;
  if (job.levelId === 'assistant' && !has('academia.career') && s.grant && rng.chance(0.12)) give('academia.career', 'NSF CAREER Award', '🌱', 6, 'The NSF\'s most prestigious award for early-career faculty: five years of funding.', 0);
  if (s.hIndex >= 22 && !has('academia.fellow') && rng.chance(0.08)) give('academia.fellow', 'Fellow of the American Association for the Advancement of Science', '🎖️', 10, 'Elected by your peers for distinguished contributions to your field.');
  if (HUMANITIES.includes(field) && job.levelId !== 'assistant' && !has('academia.guggenheim') && s.papers >= 12 && rng.chance(0.04)) give('academia.guggenheim', 'Guggenheim Fellowship', '📜', 10, 'A year to write, funded by the Guggenheim Foundation.', 50000);
  if (s.hIndex >= 18 && age < 55 && !has('academia.macarthur') && rng.chance(0.004)) {
    give('academia.macarthur', 'MacArthur Fellowship', '💡', 25, 'The "genius grant": $800,000 over five years, no strings attached.');
    a.macarthurYears = 5;
  }
  if (a.macarthurYears > 0) {
    a.macarthurYears -= 1;
    ctx.earn(160000, 'MacArthur Fellowship stipend');
  }
  if (s.hIndex >= 40 && !has('academia.nas') && rng.chance(0.04)) give('academia.nas', 'Member of the National Academy of Sciences', '🏛️', 30, 'One of the highest honors in American science.');
  if (field === 'mathematics' && age < 40 && s.hIndex >= 12 && !has('academia.fields') && rng.chance(0.01)) give('academia.fields', 'Fields Medal', '🥇', 60, 'Mathematics\' highest honor, awarded only to those under forty.', 15000);
  const prize = PRIZES[field];
  if (prize && has('academia.nas') && s.hIndex >= 55 && !has('academia.nobel') && rng.chance(0.006)) give('academia.nobel', prize, '🏅', 120, `Stockholm called at 5 a.m. Your life's work changed how the world understands ${MAJORS[field]?.name.toLowerCase() ?? 'your field'}.`, prize.startsWith('Nobel') ? 400000 : 1000000);
}

/** Fabricated data tends to come out. */
function misconductTick(ctx) {
  const { state, rng } = ctx;
  const a = state.academia;
  if (!a.fabricated || !rng.chance(0.1)) return;
  a.fabricated = false;
  const s = sci(state);
  const n = Math.min(s.papers, rng.int(1, 3));
  s.papers -= n;
  s.retractions = (s.retractions ?? 0) + n;
  s.citations = Math.round((s.citations ?? 0) * 0.85);
  s.hIndex = hIndexOf(s);
  a.debarredUntil = state.character.age + 5;
  ctx.log(`A sleuth on PubPeer spotted manipulated data in your old figures. After an investigation, ${n} paper${n > 1 ? 's were' : ' was'} retracted and you were barred from federal research funding for five years.`, '🔍', 'bad');
  ctx.stat('happiness', -20);
  const job = state.career.job;
  if (job && ACADEMIC_JOBS.includes(job.professionId)) leaveJob(ctx, 'Dismissed for research misconduct', { fired: true });
}

/* ------------------------------------------------------------------ */
/* The academic job market                                             */
/* ------------------------------------------------------------------ */

/** How competitive you are: papers, citations, pedigree, postdoc years and field. */
export function competitiveness(state) {
  const s = sci(state);
  const rec = state.academia.phdRecord ?? {};
  const field = fieldOf(state);
  const postdocYears = state.career.history.filter((h) => h.levelId === 'postdoc').reduce((sum, h) => sum + (h.endAge - h.startAge), 0) + (state.career.job?.levelId === 'postdoc' ? state.career.job.yearsInLevel : 0);
  return (s.firstAuthor ?? 0) * 4 + (s.hIndex ?? 0) * 2 + (rec.advisorFame ?? 40) / 8 + (SCHOOLS[rec.schoolId]?.prestige ?? 1) * 3 + Math.min(3, postdocYears) * 3 + (rec.conference ?? 0) * 2
    + (HOT_FIELDS.includes(field) ? 6 : HUMANITIES.includes(field) ? -8 : 0) + (state.stats.smarts - 70) / 4
    + Math.min(4, state.higherEd?.adjunctYears ?? 0) + (s.topPapers ?? 0) * 4 + (s.books ?? 0) * (HUMANITIES.includes(field) ? 6 : 2) - (s.predatory ?? 0) * 3
    + Object.keys(state.higherEd?.fellowships ?? {}).length * 3;
}

export const MARKET_TIERS = {
  r1: { label: 'Tenure-track at a research university', icon: '🏛️', professionId: 'college', levelId: 'assistant', size: 'large', odds: (c) => clamp((c - 35) / 70, 0.02, 0.45) },
  stateU: { label: 'Tenure-track at a state university', icon: '🎓', professionId: 'university', levelId: 'assistant', odds: (c) => clamp((c - 28) / 70, 0.03, 0.5) },
  college: { label: 'Tenure-track at a teaching college', icon: '🏫', professionId: 'college', levelId: 'assistant', size: 'small', odds: (c) => clamp((c - 18) / 60, 0.05, 0.6) },
  postdoc: { label: 'Postdoctoral fellowship', icon: '🧪', professionId: 'research', levelId: 'postdoc', odds: (c) => clamp(0.45 + c / 120, 0.3, 0.9) },
  labPostdoc: { label: 'Postdoc at a national laboratory', icon: '⚛️', professionId: 'nationalLab', levelId: 'postdoc', stem: true, odds: (c) => clamp(0.25 + c / 150, 0.15, 0.7) },
  visiting: { label: 'Visiting assistant professor (2 years)', icon: '🧳', professionId: 'college', levelId: 'visiting', odds: () => 0.45 },
  industry: { label: 'Industry research scientist', icon: '🏢', professionId: 'research', levelId: 'staff', stem: true, odds: (c) => clamp(0.3 + c / 150, 0.2, 0.75) },
  cc: { label: 'Community college instructor', icon: '🏫', professionId: 'communityCollege', levelId: 'instructor', masters: true, odds: () => 0.45 },
  adjunct: { label: 'Adjunct instructor (by the course)', icon: '📚', professionId: 'communityCollege', levelId: 'adjunct', masters: true, odds: () => 0.95 },
};

export function marketEligibility(state) {
  if (!hasPhd(state) && !state.education.degrees.some((d) => d.type === 'master')) return { ok: false, reason: 'Needs a Ph.D. (or a master\'s for community colleges)' };
  if (state.academia.debarredUntil && state.character.age < state.academia.debarredUntil) return { ok: false, reason: 'Barred after research misconduct' };
  if (state.education.enrolled) return { ok: false, reason: 'Finish your degree first' };
  if (state.military.service?.component === 'active') return { ok: false, reason: 'Not while on active duty' };
  if (yearlyCount(state, 'academia.market')) return { ok: false, reason: 'One hiring season a year' };
  return { ok: true };
}

/** One hiring season: applications go out in the fall, offers come in spring. */
export function goOnMarket(ctx) {
  const { state, rng } = ctx;
  const check = marketEligibility(state);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  bumpYearly(state, 'academia.market');
  const c = competitiveness(state);
  const phd = hasPhd(state);
  const stem = !HUMANITIES.includes(fieldOf(state));
  const offers = Object.entries(MARKET_TIERS)
    .filter(([, t]) => (t.masters || phd) && (!t.stem || stem))
    .filter(([, t]) => levelCheck(state, levelById(getProfession(t.professionId), t.levelId)).ok)
    .filter(([, t]) => rng.chance(t.odds(c)))
    .map(([id]) => id);
  ctx.stat('stress', 6);
  if (!offers.length) {
    ctx.log('You sent out 80 applications this hiring season. Two phone interviews, no campus visits, no offers.', '📭', 'bad');
    return ctx.toast('No offers this year', 'bad');
  }
  ctx.prompt({
    type: 'academia.offers',
    icon: '📬',
    title: 'Academic Job Offers',
    text: `After ${rng.int(40, 120)} applications, ${offers.length === 1 ? 'one offer came through' : `${offers.length} offers came through`}.${state.career.job ? `\nAccepting means leaving your job as ${state.career.job.title}.` : ''}`,
    options: [
      ...offers.map((id) => ({ id, label: `${MARKET_TIERS[id].icon} ${MARKET_TIERS[id].label}` })),
      ...(state.career.job && TENURE_TRACK.includes(state.career.job.professionId) && !state.career.job.terminal ? [{ id: 'leverage', label: '💼 Take it to your dean for a retention offer', hint: 'A raise if they want to keep you' }] : []),
      { id: 'none', label: '🙅 Turn them all down' },
    ],
    data: { offers },
  });
}

/** An outside offer in hand: the dean may counter to keep you. */
function retentionOffer(ctx, offerCount) {
  const { state, rng } = ctx;
  const job = state.career.job;
  if (!job) return;
  const valued = clamp(0.45 + (job.performance - 60) / 100 + (sci(state).hIndex ?? 0) / 100 + (offerCount - 1) * 0.1, 0.1, 0.9);
  if (!rng.chance(valued)) return ctx.log('Your dean congratulated you on the offer and wished you well. No counteroffer. You stayed, slightly embarrassed.', '💼', 'warn');
  const raise = rng.int(8, 18) / 100;
  stepForAtLeast(state, job, Math.round(job.salary * (1 + raise)));
  recalcSalary(state, job);
  if (job.tenureClock && job.levelId === 'assistant') job.tenureClock.papers -= 1; // a lighter teaching load
  ctx.log(`Your dean countered: a ${Math.round(raise * 100)}% raise, a research budget and a lighter teaching load to keep you.`, '💼', 'good');
}

function acceptOffer(ctx, tierId) {
  const { state, rng } = ctx;
  const t = MARKET_TIERS[tierId];
  const profession = getProfession(t.professionId);
  let employer = null;
  for (let i = 0; i < 12; i++) {
    const e = createEmployer(rng, state, profession, state.character.regionId);
    if (!t.size || e.size === t.size) { employer = e; break; }
    employer = e;
  }
  const level = ladderFor(profession, employer.size).find((l) => l.id === t.levelId) ?? bestEntryLevel(state, profession, employer.size);
  if (!level) return ctx.toast('The offer fell through.', 'warn');
  const job = hire(ctx, { professionId: profession.id, levelId: level.id, employer, step: 2 });
  if (job && level.tenureReview) job.tenureClock = { papers: sci(state).papers, grants: sci(state).grantsWon ?? 0, focus: null };
}

/* ------------------------------------------------------------------ */
/* Modules                                                             */
/* ------------------------------------------------------------------ */

const init = (state) => {
  state.academia ??= { phd: null, phdRecord: null, debarredUntil: null, fabricated: false, lastSabbaticalAge: null, grantSeen: null, macarthurYears: 0 };
  state.science ??= { grant: null, papers: 0, unfunded: 0, scooped: 0 };
  const s = state.science;
  s.citations ??= 0;
  s.hIndex ??= 0;
  s.firstAuthor ??= 0;
  s.students ??= 0;
  s.grantsWon ??= 0;
  s.retractions ??= 0;
};

/** Runs before the education module so a defense this year graduates you this year. */
export const AcademiaPhdModule = {
  id: 'academiaPhd',
  order: 9.6,
  init,
  setup(engine) {
    engine.bus.on('education:enrolled', ({ ctx, programId }) => {
      const e = ctx.state.education.enrolled;
      if (programId === 'phd' && e) startPhd(ctx, e);
    });
    engine.bus.on('education:graduated', ({ ctx, degree }) => {
      const phd = ctx.state.academia.phd;
      if (degree.programId !== 'phd' || !phd) return;
      ctx.state.academia.phdRecord = { advisorFame: phd.advisor?.fame ?? 40, advisorName: phd.advisor?.name ?? null, schoolId: phd.schoolId, papers: phd.papers, firstAuthor: phd.firstAuthor, conference: phd.conference, field: phd.field };
      ctx.state.academia.phd = null;
      ctx.log(`Dr. ${ctx.state.character.lastName}. ${phd.papers} paper${phd.papers === 1 ? '' : 's'} and a dissertation nobody outside your committee will read in full — and you are a doctor of philosophy.`, '🎓', 'milestone');
    });
    engine.bus.on('education:left', ({ ctx, enrollment, reason }) => {
      const phd = ctx.state.academia.phd;
      if (!phd || enrollment?.programId !== 'phd' || reason === 'masteredOut') return;
      // Leaving after quals: most programs award a master's on the way out.
      if (phd.quals && !ctx.state.education.degrees.some((d) => d.type === 'master' && d.major === phd.field)) {
        ctx.state.education.degrees.push({ type: 'master', programId: 'master', major: phd.field, schoolId: enrollment.schoolId, gpa: enrollment.gpa, year: ctx.state.character.age, enRoute: true });
        ctx.log('You left the Ph.D. program with a master\'s degree earned along the way.', '🎓');
      }
      ctx.state.academia.phd = null;
    });
  },
  onAgeUp(ctx) {
    phdTick(ctx);
  },
};

/** Runs after careers: the research record, tenure, students and honors. */
export const AcademiaModule = {
  id: 'academia',
  order: 31.3,
  init,
  onAgeUp(ctx) {
    const { state } = ctx;
    if (state.legal.incarceration) return;
    misconductTick(ctx);
    const job = state.career.job;
    const academic = job && ACADEMIC_JOBS.includes(job.professionId);
    // Published papers keep being cited, whatever you do now.
    if (sci(state).papers > 0) citationsTick(ctx);
    if (!academic || !job.paidThisYear) return;
    if (['university', 'college', 'communityCollege'].includes(job.professionId)) teachingTick(ctx, job);
    tenureTick(ctx, job);
    if (!state.career.job) return;
    studentsTick(ctx, job);
    if (job.professionId !== 'communityCollege') honorsTick(ctx, job);
  },
  actions: {
    goOnMarket: (ctx) => goOnMarket(ctx),
    sabbatical(ctx) {
      const { state, rng } = ctx;
      const job = state.career.job;
      const check = sabbaticalAvailable(state, job);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      state.academia.lastSabbaticalAge = state.character.age;
      const n = rng.int(1, 3);
      sci(state).papers += n;
      ctx.stat('stress', -15);
      ctx.stat('happiness', 8);
      job.performance = Math.min(100, job.performance + 5);
      ctx.log(`Sabbatical: a year ${rng.pick(['in Kyoto', 'at Oxford', 'at a research institute in Berlin', 'writing at home', 'at a field station in Costa Rica'])}, free of teaching and committees. ${n} paper${n > 1 ? 's' : ''} came out of it.`, '🌍', 'good');
    },
  },
  resolvers: {
    advisor(ctx, data, optionId) {
      const phd = ctx.state.academia.phd;
      const c = data.candidates.find((x) => x.style === optionId);
      if (!phd || !c) return;
      phd.advisor = c;
      phd.funding = ADVISOR_STYLES[c.style].ra ? 'ra' : 'ta';
      ctx.log(`You joined the lab of ${c.name}. ${phd.funding === 'ra' ? 'Their grant pays your stipend as a research assistant.' : 'You\'ll teach sections to pay your stipend.'}`, '🧑‍🏫', 'milestone');
    },
    grfp(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const phd = state.academia.phd;
      if (!phd) return;
      phd.grfpTried = true;
      if (optionId !== 'apply') return;
      if (rng.chance(grfpOdds(state))) {
        phd.grfp = GRFP.years;
        phd.funding = 'fellowship';
        addHonor(state, { id: 'academia.grfp', source: 'civil', name: 'NSF Graduate Research Fellow', icon: '🏅', prestige: 4, precedence: 40, citation: 'Three years of fellowship support.' });
        ctx.log('You won an NSF Graduate Research Fellowship: three years of funding and the freedom to choose your project.', '🏅', 'good');
      } else ctx.log('The NSF GRFP reviewers rated your application "Very Good." Not good enough.', '📭', 'warn');
    },
    quals(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const phd = state.academia.phd;
      if (!phd || phd.quals) return;
      const cram = optionId === 'cram';
      if (cram) ctx.stat('stress', 12);
      phd.qualsTries += 1;
      if (rng.chance(qualsOdds(state, cram))) {
        phd.quals = true;
        ctx.log('You passed your qualifying exams. The committee shook your hand like a colleague for the first time.', '📝', 'good');
        ctx.stat('happiness', 8);
      } else if (phd.qualsTries >= 2) masterOut(ctx, 'You failed your qualifying exams a second time.');
      else ctx.log('You failed quals. The committee will let you try once more next year.', '📝', 'bad');
    },
    defense(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const e = state.education.enrolled;
      const phd = state.academia.phd;
      if (!phd || !isPhd(e)) return;
      if (optionId !== 'defend') return ctx.log('You decided to stay one more year for one more paper.', '🔬');
      if (rng.chance(0.93)) {
        phd.defended = true;
        // The education module confers the degree at the end of this year.
        e.totalYears = e.progress + (e.pace === 'part' ? 0.5 : 1);
        ctx.log('You defended your dissertation. "Congratulations, Doctor." Revisions are due before commencement.', '🎓', 'milestone');
        ctx.stat('happiness', 15);
      } else {
        ctx.log('Your committee sent you back for major revisions. You\'ll defend again next year.', '📁', 'bad');
        ctx.stat('happiness', -8);
      }
    },
    phdEvent(ctx, data, optionId) {
      const { state, rng } = ctx;
      const phd = state.academia.phd;
      if (!phd) return;
      const s = sci(state);
      switch (`${data.eventId}.${optionId}`) {
        case 'reviewer2.comply': ctx.stat('stress', 5); s.citations += 15; ctx.log('Eight months of new experiments. The paper is much better for it, which annoys you.', '🧪'); break;
        case 'reviewer2.rebut': if (state.stats.smarts + rng.int(-15, 15) > 80) { ctx.log('Your rebuttal was devastating. The editor overruled Reviewer 2.', '✍️', 'good'); s.citations += 10; } else { ctx.log('The editor sided with Reviewer 2. Rejected.', '📮', 'bad'); ctx.stat('happiness', -4); } break;
        case 'reviewer2.elsewhere': ctx.log('You sent it to another journal. It was accepted with minor revisions.', '📨'); break;
        case 'advisorMoves.follow': phd.advisorChanged = true; ctx.stat('stress', 6); ctx.log(`You followed ${phd.advisor.name} to their new university. The move cost you a semester.`, '🚚'); break;
        case 'advisorMoves.switch': phd.advisorChanged = true; phd.advisor = { ...phd.advisor, name: `Prof. ${randomName(rng, rng.pick(['male', 'female'])).lastName}`, fame: rng.int(35, 70), support: rng.int(50, 85) }; ctx.log(`You joined ${phd.advisor.name}'s lab and started a new project.`, '🔄', 'warn'); break;
        case 'advisorMoves.remote': phd.advisorChanged = true; phd.advisor.support = Math.max(10, phd.advisor.support - 25); ctx.log('Your advisor now exists as a Zoom window and a slow email reply.', '💻', 'warn'); break;
        case 'internship.accept': phd.internship = true; ctx.earn(30000, 'Research internship'); ctx.log('A summer of industry research: real money, free lunch, and a standing job offer.', '🏢', 'good'); break;
        case 'imposter.counseling': ctx.stat('stress', -8); ctx.stat('happiness', 4); ctx.log('The counselor said half the students she sees are Ph.D. students. It helped to hear.', '🫂', 'good'); break;
        case 'imposter.push': ctx.stat('stress', 6); ctx.stat('happiness', -4); ctx.log('You kept going. Some days were worse than others.', '🌧️'); break;
        case 'conference.go': phd.conference += 1; ctx.stat('happiness', 4); ctx.log('Your talk went well, and a professor from another school asked for your CV.', '🎤', 'good'); break;
        case 'data.honest': ctx.log('You reported the null result. Your advisor was disappointed, then helped you find a better question.', '📊'); break;
        case 'data.massage': state.academia.fabricated = true; phd.papers += 1; s.papers += 1; phd.firstAuthor += 1; s.firstAuthor += 1; ctx.log('The cleaned-up figure looked great. The paper was accepted.', '✂️', 'warn'); break;
        case 'teaching.take': ctx.earn(4000, 'Extra teaching assistantship'); ctx.stat('stress', 5); ctx.log('Three hundred undergraduates and their email.', '🧑‍🏫'); break;
        default: ctx.log('You moved on.', '🔬');
      }
    },
    offers(ctx, data, optionId) {
      if (optionId === 'leverage') return retentionOffer(ctx, data.offers.length);
      if (optionId === 'none' || !data.offers.includes(optionId)) return ctx.log('You turned down every offer.', '🙅');
      acceptOffer(ctx, optionId);
    },
    dossier(ctx, _data, optionId) {
      const job = ctx.state.career.job;
      if (!job?.tenureClock) return;
      job.tenureClock.focus = optionId;
      if (optionId === 'research') {
        ctx.stat('stress', 10);
        if (ctx.rng.chance(0.6)) {
          sci(ctx.state).papers += 1;
          ctx.log('You got one more paper accepted just before the dossier went in.', '📄', 'good');
        }
      } else if (optionId === 'teaching') job.teaching = Math.min(100, (job.teaching ?? 60) + 10);
      else job.performance = Math.min(100, job.performance + 5);
    },
  },
};
