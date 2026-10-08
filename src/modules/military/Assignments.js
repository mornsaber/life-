/**
 * Careers in uniform beyond your unit:
 *
 *   Special duty   Broadening tours away from your career field: drill
 *                  sergeant, recruiter, Marine Security Guard at an embassy,
 *                  ceremonial honor guards; for officers, ROTC cadre, academy
 *                  faculty (with a funded master's), aide-de-camp, the Joint
 *                  Staff at the Pentagon and congressional fellowships. They
 *                  pay special-duty pay, count with promotion boards and keep
 *                  you home (no deployments). The Army also *selects* NCOs
 *                  for drill and recruiting duty whether they volunteer or not.
 *   Joint duty     A Joint Staff tour is the joint qualification general and
 *                  flag officer boards look for.
 *   Commissioning  Enlisted members can go to college on full pay and
 *                  commission at graduation (Green to Gold, STA-21, MECEP…).
 *   Top posts      The service's senior enlisted leader, and for four-stars,
 *                  service chief or Chairman of the Joint Chiefs: a Senate
 *                  confirmation, a four-year term, and retirement after.
 *
 * svc.assignment = { id, yearsLeft, startAge, name }
 * svc.broadened = { [assignmentId]: gradeWhenDone }
 * svc.joint = true once joint-qualified
 * svc.commissioning = { program, yearsLeft }
 * svc.topPost = { id, title, yearsLeft }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { isMarried } from '../people/People.js';
import { awardMedal } from './MedalEngine.js';
import { rankOf, commission, discharge } from './MilitaryEngine.js';

const BY_BRANCH = (army, navy, airforce, marines, coastguard, extra = {}) => ({ army, guard: army, navy, airforce, spaceforce: airforce, marines, coastguard, ...extra });

export const ASSIGNMENTS = {
  drill: {
    track: 'enlisted', grades: [4, 6], years: 2, pay: 5000, board: 0.12, stress: 8, eval: 4, fitness: 65, icon: '🎩',
    names: BY_BRANCH('Drill Sergeant', 'Recruit Division Commander', 'Military Training Instructor', 'Drill Instructor', 'Company Commander (recruit training)'),
    places: BY_BRANCH('Fort Jackson', 'Recruit Training Command, Great Lakes', 'JBSA-Lackland', 'Parris Island', 'Training Center Cape May'),
    desc: 'Turn civilians into service members. Brutal hours; boards love it.',
    flavor: ['Your platoon graduated. A mother hugged you and thanked you for her son.', 'Another cycle of recruits, another 4 a.m. wake-up. Your voice is permanently hoarse.', 'A recruit who almost quit in week two finished as the honor graduate.'],
  },
  recruiter: {
    track: 'enlisted', grades: [4, 6], years: 3, pay: 5000, board: 0.08, stress: 10, eval: 0, icon: '📋',
    names: BY_BRANCH('Recruiter', 'Navy Recruiter', 'Air Force Recruiter', 'Marine Corps Recruiter', 'Coast Guard Recruiter'),
    desc: 'Make mission every month in a strip-mall recruiting station. High pressure.',
    flavor: ['You spent a Friday night at a high school football game handing out water bottles and business cards.', 'A kid you recruited two years ago sent you a photo from his first duty station.', 'Parents yelled at you in their kitchen, then signed the consent form anyway.'],
  },
  msg: {
    track: 'enlisted', grades: [2, 5], years: 3, pay: 3000, board: 0.06, stress: 4, eval: 3, branches: ['marines'], single: true, icon: '🏛️',
    names: { marines: 'Marine Security Guard' },
    desc: 'Guard a U.S. embassy overseas. Sergeants and below must be unmarried.',
    flavor: ['You stood post at the embassy during a protest outside the gates.', 'The Marine Corps Ball at the ambassador\'s residence was the best night of the year.', 'You trained the embassy staff on the emergency action plan.'],
  },
  honorGuard: {
    track: 'enlisted', grades: [1, 5], years: 3, pay: 1500, board: 0.04, stress: 3, eval: 3, fitness: 60, icon: '🎖️',
    names: BY_BRANCH('The Old Guard (3d U.S. Infantry Regiment)', 'U.S. Navy Ceremonial Guard', 'U.S. Air Force Honor Guard', 'Marine Barracks Washington (8th & I)', 'Coast Guard Ceremonial Honor Guard'),
    desc: 'Arlington funerals, state ceremonies and the Tomb of the Unknown Soldier.',
    flavor: ['You carried a flag-draped casket at Arlington. The family\'s faces stay with you.', 'You marched in an inaugural parade.', 'Hours of drill on a parade field until every movement was perfect.'],
  },
  rotc: {
    track: 'officer', grades: [2, 3], years: 3, pay: 0, board: 0.03, stress: -4, eval: 2, icon: '🎓',
    names: BY_BRANCH('ROTC Assistant Professor of Military Science', 'NROTC Instructor', 'AFROTC Assistant Professor of Aerospace Studies', 'NROTC Marine Officer Instructor', 'Coast Guard Academy Company Officer'),
    desc: 'Teach and mentor cadets on a college campus. Regular hours, family time.',
    flavor: ['One of your cadets commissioned and asked you to administer the oath.', 'You ran a field training exercise for sixty cadets in the rain.', 'Football Saturdays and a normal schedule. Your family noticed.'],
  },
  academy: {
    track: 'officer', grades: [2, 3], years: 3, pay: 0, board: 0.05, stress: -2, eval: 3, smarts: 65, degree: 'master', icon: '🏫',
    names: BY_BRANCH('Instructor at West Point', 'Instructor at the Naval Academy', 'Instructor at the Air Force Academy', 'Instructor at the Naval Academy', 'Instructor at the Coast Guard Academy'),
    desc: 'The service pays for a master\'s degree, then you teach at a service academy.',
    flavor: ['You taught your first class of plebes. Half of them were smarter than you were at their age.', 'A cadet came to office hours just to ask how you handled your first platoon.', 'You graded fifty papers on the history of the profession of arms.'],
  },
  aide: {
    track: 'officer', grades: [1, 2], years: 1, pay: 0, board: 0.1, stress: 8, eval: 5, icon: '🧳',
    names: BY_BRANCH('Aide-de-Camp to a General', 'Flag Aide to an Admiral', 'Aide-de-Camp to a General', 'Aide-de-Camp to a General', 'Flag Aide to an Admiral'),
    desc: 'A year carrying a general\'s schedule. You see how decisions are really made.',
    flavor: ['You were in the room when the general made a call that changed the brigade. You learned more than in any school.', 'Eighteen-hour days, a phone that never stops, and a general who now knows your name.'],
  },
  joint: {
    track: 'officer', grades: [3, 5], years: 3, pay: 0, board: 0.06, stress: 6, eval: 3, smarts: 55, joint: true, icon: '🏢',
    names: BY_BRANCH('Joint Staff Officer, the Pentagon', 'Joint Staff Officer, the Pentagon', 'Joint Staff Officer, the Pentagon', 'Joint Staff Officer, the Pentagon', 'Joint Staff Officer, the Pentagon'),
    desc: 'Three years on the Joint Staff. The joint qualification general officer boards require.',
    flavor: ['Your briefing went all the way to the Chairman.', 'You learned to speak Navy, Air Force and Army, and to write a decision memo in one page.', 'An all-nighter in the National Military Command Center during a crisis overseas.'],
  },
  fellow: {
    track: 'officer', grades: [3, 4], years: 1, pay: 0, board: 0.04, stress: 2, eval: 3, smarts: 60, icon: '🏛️',
    names: BY_BRANCH('Congressional Fellow', 'Legislative Fellow', 'Legislative Fellow', 'Congressional Fellow', 'Congressional Fellow'),
    desc: 'A year working on Capitol Hill for a member of Congress.',
    flavor: ['You drafted the defense provisions of a bill that actually passed.', 'A year of watching how Congress really works. Some of it was inspiring.'],
  },
};

/** Commissioning programs for enlisted members going to college on full pay. */
export const COMMISSIONING = BY_BRANCH('Green to Gold (Active Duty Option)', 'STA-21 (Seaman to Admiral)', 'SOAR / Airman Scholarship and Commissioning Program', 'MECEP (Marine Enlisted Commissioning Education Program)', 'Pre-commissioning Program for Enlisted Personnel');

/** The top post a service member can reach. */
export const TOP_ENLISTED = BY_BRANCH('Sergeant Major of the Army', 'Master Chief Petty Officer of the Navy', 'Chief Master Sergeant of the Air Force', 'Sergeant Major of the Marine Corps', 'Master Chief Petty Officer of the Coast Guard', { guard: 'Senior Enlisted Advisor to the Chief, National Guard Bureau', spaceforce: 'Chief Master Sergeant of the Space Force' });
export const SERVICE_CHIEF = BY_BRANCH('Chief of Staff of the Army', 'Chief of Naval Operations', 'Chief of Staff of the Air Force', 'Commandant of the Marine Corps', 'Commandant of the Coast Guard', { guard: 'Chief of the National Guard Bureau', spaceforce: 'Chief of Space Operations' });
export const CHAIRMAN = 'Chairman of the Joint Chiefs of Staff';
const TOP_TERM = 4;
const TOP_PAY = { enlisted: 30000, officer: 40000 };

const pickName = (a, svc) => a.names[svc.branch] ?? Object.values(a.names)[0];
export const assignmentName = (svc, id) => pickName(ASSIGNMENTS[id], svc);
const FIELDS = { infantry: 'politicalScience', engineer: 'engineering', intel: 'internationalRelations', cyber: 'computerScience', medic: 'nursing', logistics: 'business', aviation: 'aviation', legal: 'criminalJustice' };

export function assignmentEligibility(state, id) {
  const svc = state.military.service;
  const a = ASSIGNMENTS[id];
  if (!a) return { ok: false, reason: 'Unknown assignment' };
  if (!svc) return { ok: false, reason: 'Not serving' };
  if (svc.component !== 'active') return { ok: false, reason: 'Active duty only' };
  if (a.branches && !a.branches.includes(svc.branch)) return { ok: false, reason: 'Not in your branch' };
  if (!a.names[svc.branch]) return { ok: false, reason: 'Not in your branch' };
  if (svc.track !== a.track) return { ok: false, reason: a.track === 'officer' ? 'Officers only' : 'Enlisted only' };
  if (svc.grade < a.grades[0] || svc.grade > a.grades[1]) return { ok: false, reason: `${rankOf({ ...svc, grade: a.grades[0] }).title} to ${rankOf({ ...svc, grade: a.grades[1] }).title}` };
  if (svc.assignment) return { ok: false, reason: `Already on a ${svc.assignment.name} tour` };
  if (svc.commissioning || svc.topPost) return { ok: false, reason: 'Not available right now' };
  if (svc.sof) return { ok: false, reason: 'Leave special operations first' };
  if (svc.isNew || svc.yearsOfService < 3) return { ok: false, reason: 'Needs 3 years of service' };
  if (svc.broadened?.[id] != null) return { ok: false, reason: 'Already served this tour' };
  if (a.fitness && state.stats.fitness < a.fitness) return { ok: false, reason: `Needs fitness ${a.fitness}` };
  if (a.smarts && state.stats.smarts < a.smarts) return { ok: false, reason: `Needs smarts ${a.smarts}` };
  if (a.single && svc.grade <= 4 && isMarried(state)) return { ok: false, reason: 'Sergeants and below must be unmarried' };
  if ((svc.njp ?? []).some((n) => n.age >= state.character.age - 3) || svc.reprimand) return { ok: false, reason: 'Recent discipline on your record' };
  if (yearlyCount(state, 'military.assignment')) return { ok: false, reason: 'One application a year' };
  return { ok: true };
}

/** Volunteer for a special-duty or broadening tour. */
export function applyAssignment(ctx, id) {
  const { state, rng } = ctx;
  const check = assignmentEligibility(state, id);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  bumpYearly(state, 'military.assignment');
  const svc = state.military.service;
  const chance = clamp(0.35 + (svc.eval - 60) / 60, 0.1, 0.9);
  if (!rng.chance(chance)) {
    ctx.log(`Your packet for ${assignmentName(svc, id)} wasn't selected this year.`, ASSIGNMENTS[id].icon, 'warn');
    return ctx.toast('Not selected', 'warn');
  }
  startAssignment(ctx, svc, id);
}

export function startAssignment(ctx, svc, id) {
  const a = ASSIGNMENTS[id];
  const name = pickName(a, svc);
  svc.assignment = { id, name, yearsLeft: a.years + (a.degree ? 2 : 0), startAge: ctx.state.character.age, schoolLeft: a.degree ? 2 : 0 };
  // The tour is your station (no PCS until it ends), and you extend to finish it.
  svc.contractYearsLeft = Math.max(svc.contractYearsLeft, svc.assignment.yearsLeft + 1);
  svc.stationYears = 0;
  svc.tourLength = svc.assignment.yearsLeft;
  const where = a.places?.[svc.branch];
  ctx.log(a.degree
    ? `You were selected to teach at a service academy. First, two years of fully funded graduate school.`
    : `You reported for duty as a ${name}${where ? ` at ${where}` : ''}. A ${a.years}-year tour.`, a.icon, 'milestone');
}

function finishAssignment(ctx, svc) {
  const { id, name } = svc.assignment;
  const a = ASSIGNMENTS[id];
  svc.broadened = { ...(svc.broadened ?? {}), [id]: svc.grade };
  svc.assignment = null;
  if (a.joint) svc.joint = true;
  svc.stationYears = 99;
  svc.tourLength = 3;
  awardMedal(ctx, svc.track === 'officer' && svc.grade >= 3 ? 'msm' : 'commendation', { branch: svc.branch, citation: `${name} tour` });
  ctx.log(`You finished your tour as a ${name}${a.joint ? ' and are now joint-qualified' : ''}. Back to your career field.`, a.icon, 'milestone');
}

/** Board credit for broadening tours done at your current or previous grade. */
export function assignmentBoardBonus(svc) {
  return Object.entries(svc.broadened ?? {}).reduce((sum, [id, g]) => sum + (svc.grade - g <= 1 ? ASSIGNMENTS[id]?.board ?? 0 : 0), 0);
}

/** Flag boards want joint officers. */
export const jointFactor = (svc) => (svc.joint ? 1 : 0.5);

/** True when the year should skip deployments (on a stateside tour, in college, or at the top). */
export const keepsHome = (svc) => Boolean((svc.assignment && svc.assignment.id !== 'msg') || svc.commissioning || svc.topPost);

/* ------------------------------------------------------------------ */
/* Commissioning programs                                              */
/* ------------------------------------------------------------------ */

export function commissioningEligibility(state) {
  const svc = state.military.service;
  if (!svc) return { ok: false, reason: 'Not serving' };
  if (svc.track !== 'enlisted') return { ok: false, reason: 'Enlisted only' };
  if (svc.component !== 'active') return { ok: false, reason: 'Active duty only' };
  if (!COMMISSIONING[svc.branch]) return { ok: false, reason: 'Not in your branch' };
  if (svc.commissioning) return { ok: false, reason: 'Already in the program' };
  if (svc.assignment || svc.sof) return { ok: false, reason: 'Finish your current assignment first' };
  if (state.education.degrees.some((d) => ['bachelor', 'master', 'mba', 'jd', 'md', 'phd'].includes(d.type))) return { ok: false, reason: 'You have a degree: apply to OCS' };
  if (svc.yearsOfService < 2) return { ok: false, reason: 'Needs 2 years of service' };
  if (state.character.age > 29) return { ok: false, reason: 'Must commission by 31' };
  if (state.stats.smarts < 55) return { ok: false, reason: 'Needs smarts 55' };
  if (svc.eval < 65) return { ok: false, reason: `Eval ${svc.eval}/65` };
  if (yearlyCount(state, 'military.commissioning')) return { ok: false, reason: 'One application a year' };
  return { ok: true };
}

export function applyCommissioning(ctx) {
  const { state, rng } = ctx;
  const check = commissioningEligibility(state);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  bumpYearly(state, 'military.commissioning');
  const svc = state.military.service;
  const program = COMMISSIONING[svc.branch];
  if (!rng.chance(clamp(0.3 + (svc.eval - 65) / 60 + (state.stats.smarts - 55) / 150, 0.1, 0.8))) {
    ctx.log(`The ${program} board didn't select your packet this year.`, '🎓', 'warn');
    return ctx.toast('Not selected', 'warn');
  }
  const someCollege = state.education.degrees.some((d) => d.type === 'associate');
  svc.commissioning = { program, yearsLeft: someCollege ? 2 : 3 };
  svc.stationYears = 0;
  svc.tourLength = svc.commissioning.yearsLeft + 1;
  svc.contractYearsLeft = Math.max(svc.contractYearsLeft, svc.commissioning.yearsLeft + 1);
  ctx.log(`You were selected for ${program}: college full-time, on full pay, then a commission.`, '🎓', 'milestone');
}

function commissioningTick(ctx, svc) {
  const { state, rng } = ctx;
  const c = svc.commissioning;
  c.yearsLeft -= 1;
  ctx.stat('smarts', rng.int(2, 4));
  if (c.yearsLeft > 0) return ctx.log(`Another year of college through ${c.program}. Still drawing full pay.`, '🎓');
  const field = FIELDS[svc.specialty] ?? 'business';
  const gpa = Math.round(clamp(2.6 + (state.stats.smarts - 50) / 60 + rng.float(-0.2, 0.3), 2.2, 4) * 100) / 100;
  state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: field, schoolId: 'state', gpa, year: state.character.age });
  svc.commissioning = null;
  svc.stationYears = 99;
  svc.tourLength = 3;
  ctx.log(`You graduated with a bachelor's degree (GPA ${gpa.toFixed(2)}).`, '🎓', 'milestone');
  commission(ctx, svc);
}

/* ------------------------------------------------------------------ */
/* Yearly                                                              */
/* ------------------------------------------------------------------ */

function assignmentTick(ctx, svc) {
  const { rng } = ctx;
  const t = svc.assignment;
  const a = ASSIGNMENTS[t.id];
  // Academy instructors spend the first two years in graduate school.
  if (t.schoolLeft > 0) {
    t.schoolLeft -= 1;
    t.yearsLeft -= 1;
    ctx.stat('smarts', rng.int(2, 4));
    if (t.schoolLeft === 0) {
      ctx.state.education.degrees.push({ type: 'master', programId: 'master', major: rng.pick(['engineering', 'internationalRelations', 'mathematics', 'computerScience']), schoolId: 'state', gpa: Math.round(rng.float(3.3, 3.95) * 100) / 100, year: ctx.state.character.age });
      ctx.log('You finished your master\'s degree on the service\'s dime and reported to the academy to teach.', '🎓', 'milestone');
    } else ctx.log('Graduate school, paid for by the service. A strange luxury after years in the field.', '🎓');
    return;
  }
  t.yearsLeft -= 1;
  if (a.pay) ctx.earn(a.pay, `Special duty assignment pay (${t.name})`, { wage: true });
  ctx.stat('stress', a.stress);
  svc.eval = Math.round(clamp(svc.eval + a.eval, 0, 100));
  if (t.id === 'recruiter') {
    // Make mission or hear about it.
    const made = rng.chance(clamp(0.45 + (ctx.state.stats.smarts - 50) / 150 + ((ctx.state.stats.looks ?? 50) - 50) / 200, 0.2, 0.85));
    svc.eval = Math.round(clamp(svc.eval + (made ? 6 : -5), 0, 100));
    ctx.log(made ? 'You made mission every month this year. Your station commander noticed.' : 'You missed mission three months running. The phone calls from battalion were not friendly.', '📋', made ? 'good' : 'warn');
  } else ctx.log(rng.pick(a.flavor), a.icon);
  if (t.yearsLeft <= 0) finishAssignment(ctx, svc);
}

/** The Army picks NCOs for drill sergeant and recruiting duty whether they volunteer or not. */
function involuntarySelection(ctx, svc) {
  const { state, rng } = ctx;
  if (!['army', 'marines'].includes(svc.branch) || svc.track !== 'enlisted' || svc.grade < 4 || svc.grade > 6) return;
  if (svc.assignment || svc.sof || svc.commissioning || svc.broadened?.drill != null || svc.broadened?.recruiter != null || svc.yearsOfService < 4) return;
  if (state.prompts.some((p) => p.type === 'military.dutySelection') || !rng.chance(0.06)) return;
  ctx.prompt({
    type: 'military.dutySelection',
    icon: '📨',
    title: svc.branch === 'army' ? 'DA Selected' : 'Special Duty Assignment Screening',
    text: `Headquarters selected you for special duty: drill sergeant or recruiter. You can state a preference, but you are going.`,
    options: [
      { id: 'drill', label: `🎩 ${ASSIGNMENTS.drill.names[svc.branch]}`, hint: '2 years, boards love it' },
      { id: 'recruiter', label: `📋 ${ASSIGNMENTS.recruiter.names[svc.branch]}`, hint: '3 years, make mission or else' },
    ],
  });
}

/** Senior leaders: the service's top enlisted post, service chief, Chairman. */
function topPostTick(ctx, svc) {
  const { state, rng } = ctx;
  if (svc.topPost) {
    svc.topPost.yearsLeft -= 1;
    ctx.earn(TOP_PAY[svc.track] ?? 0, `Senior leader personal money and special pay (${svc.topPost.title})`, { wage: true });
    ctx.stat('stress', 6);
    ctx.log(rng.pick([`As ${svc.topPost.title} you testified before Congress on the state of the force.`, `You visited troops on four continents this year as ${svc.topPost.title}.`, `As ${svc.topPost.title} you sat across from the Secretary of Defense every week.`]), '⭐');
    if (svc.topPost.yearsLeft <= 0) {
      const title = svc.topPost.title;
      awardMedal(ctx, 'dsm', { branch: svc.branch, citation: title });
      svc.topPost = null;
      discharge(ctx, 'retired', `Retired after serving as ${title}.`);
    }
    return;
  }
  if (state.prompts.some((p) => p.type === 'military.topPost')) return;
  const max = rankOf(svc).max;
  let title = null;
  if (svc.track === 'enlisted' && svc.grade === max && svc.eval >= 88 && svc.yearsOfService >= 22 && TOP_ENLISTED[svc.branch] && rng.chance(0.04)) title = TOP_ENLISTED[svc.branch];
  else if (svc.track === 'officer' && svc.grade >= max - 1 && svc.eval >= 85 && SERVICE_CHIEF[svc.branch]) {
    if (svc.joint && svc.branch !== 'coastguard' && rng.chance(0.05)) title = CHAIRMAN;
    else if (rng.chance(0.15)) title = SERVICE_CHIEF[svc.branch];
  }
  if (!title) return;
  ctx.prompt({
    type: 'military.topPost',
    icon: '⭐',
    title: 'Nominated',
    text: svc.track === 'officer'
      ? `The President nominated you to be ${title}. The Senate Armed Services Committee will hold a confirmation hearing.`
      : `You were selected as ${title}, the senior enlisted leader of the whole service. It is a four-year post, and the last of your career.`,
    options: [
      { id: 'accept', label: '⭐ Accept' },
      { id: 'decline', label: '🙅 Decline and stay in your post' },
    ],
    data: { title },
  });
}

export function assignmentsTick(ctx, svc) {
  if (svc.component !== 'active') return;
  if (svc.commissioning) commissioningTick(ctx, svc);
  else if (svc.assignment) assignmentTick(ctx, svc);
  else involuntarySelection(ctx, svc);
  if (ctx.state.military.service === svc && !svc.commissioning) topPostTick(ctx, svc);
}

export const AssignmentActions = {
  applyAssignment: (ctx, id) => applyAssignment(ctx, id),
  applyCommissioning: (ctx) => applyCommissioning(ctx),
};

export const AssignmentResolvers = {
  dutySelection(ctx, _data, optionId) {
    const svc = ctx.state.military.service;
    if (!svc || svc.assignment || !ASSIGNMENTS[optionId]) return;
    startAssignment(ctx, svc, optionId);
  },
  topPost(ctx, data, optionId) {
    const { state, rng } = ctx;
    const svc = state.military.service;
    if (!svc || svc.topPost) return;
    if (optionId !== 'accept') return ctx.log(`You declined the nomination as ${data.title}.`, '⭐');
    if (svc.track === 'officer' && (svc.reprimand || !rng.chance(0.85))) {
      ctx.log(`Your confirmation as ${data.title} stalled in the Senate and the nomination was withdrawn.`, '🏛️', 'bad');
      return;
    }
    svc.topPost = { title: data.title, yearsLeft: TOP_TERM };
    svc.assignment = null;
    // Service chiefs and the Chairman wear four stars.
    if (svc.track === 'officer') svc.grade = rankOf(svc).max;
    ctx.stat('happiness', 15);
    ctx.log(svc.track === 'officer' ? `The Senate confirmed you. You were sworn in as ${data.title}.` : `You were sworn in as ${data.title}.`, '⭐', 'milestone');
  },
};
