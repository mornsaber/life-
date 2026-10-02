/**
 * Military core: branch router (rank tables, schools, theaters per branch),
 * pay, enlistment/commissioning, evaluations, promotion boards and discharge
 * with pension calculation. ActiveDuty.js and Reserves.js build the yearly
 * service loop on top of these helpers.
 *
 * state.military.service = {
 *   branch, track: 'enlisted'|'officer', component: 'active'|'reserve',
 *   specialty, grade (0-based: E-1 = 0, O-1 = 0), yearsInGrade, yearsOfService,
 *   contractYearsLeft, eval (0–100), deployments, combatTours, wounds,
 *   disciplinary, deployedThisYear, deploymentRequested, joinedAge, isNew
 * }
 */
import { meetsEducation, prestige, addLog, hasFelony } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { pensionMultiplier, careerEndAwards, militaryHonors, MOH_ANNUAL_PENSION } from './MedalEngine.js';

const ARMY_OFFICERS = ['Second Lieutenant', 'First Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier General', 'Major General', 'Lieutenant General', 'General'];
const NAVAL_OFFICERS = ['Ensign', 'Lieutenant (j.g.)', 'Lieutenant', 'Lieutenant Commander', 'Commander', 'Captain', 'Rear Admiral (LH)', 'Rear Admiral', 'Vice Admiral', 'Admiral'];
const NAVAL_ENLISTED = ['Seaman Recruit', 'Seaman Apprentice', 'Seaman', 'Petty Officer 3rd Class', 'Petty Officer 2nd Class', 'Petty Officer 1st Class', 'Chief Petty Officer', 'Senior Chief Petty Officer', 'Master Chief Petty Officer'];

export const BRANCHES = {
  army: {
    id: 'army', name: 'U.S. Army', icon: '🪖', motto: 'This We\'ll Defend', theater: 'ground',
    basic: 'Basic Combat Training at Fort Jackson', officerSchool: 'Officer Candidate School at Fort Moore',
    enlisted: ['Private (PV1)', 'Private (PV2)', 'Private First Class', 'Specialist', 'Sergeant', 'Staff Sergeant', 'Sergeant First Class', 'Master Sergeant', 'Sergeant Major'],
    officer: ARMY_OFFICERS,
  },
  marines: {
    id: 'marines', name: 'U.S. Marine Corps', icon: '🦅', motto: 'Semper Fidelis', theater: 'ground',
    basic: 'Recruit Training at MCRD Parris Island', officerSchool: 'Officer Candidates School at Quantico',
    enlisted: ['Private', 'Private First Class', 'Lance Corporal', 'Corporal', 'Sergeant', 'Staff Sergeant', 'Gunnery Sergeant', 'Master Sergeant', 'Sergeant Major'],
    officer: ARMY_OFFICERS,
  },
  navy: {
    id: 'navy', name: 'U.S. Navy', icon: '⚓', motto: 'Semper Fortis', theater: 'naval',
    basic: 'Recruit Training Command at Great Lakes', officerSchool: 'Officer Candidate School at Newport',
    enlisted: NAVAL_ENLISTED,
    officer: NAVAL_OFFICERS,
  },
  airforce: {
    id: 'airforce', name: 'U.S. Air Force', icon: '✈️', motto: 'Aim High… Fly-Fight-Win', theater: 'air',
    basic: 'Basic Military Training at JBSA-Lackland', officerSchool: 'Officer Training School at Maxwell AFB',
    enlisted: ['Airman Basic', 'Airman', 'Airman First Class', 'Senior Airman', 'Staff Sergeant', 'Technical Sergeant', 'Master Sergeant', 'Senior Master Sergeant', 'Chief Master Sergeant'],
    officer: ARMY_OFFICERS,
  },
  guard: {
    id: 'guard', name: 'Army National Guard', icon: '🛡️', motto: 'Always Ready, Always There', theater: 'ground', reserveOnly: true,
    basic: 'Basic Combat Training at Fort Jackson', officerSchool: 'State Officer Candidate School',
    enlisted: ['Private (PV1)', 'Private (PV2)', 'Private First Class', 'Specialist', 'Sergeant', 'Staff Sergeant', 'Sergeant First Class', 'Master Sergeant', 'Sergeant Major'],
    officer: ARMY_OFFICERS,
  },
  coastguard: {
    id: 'coastguard', name: 'U.S. Coast Guard', icon: '🛟', motto: 'Semper Paratus', theater: 'maritime',
    basic: 'Recruit Training at Cape May', officerSchool: 'Officer Candidate School at New London',
    enlisted: NAVAL_ENLISTED,
    officer: NAVAL_OFFICERS,
  },
};

export const SPECIALTIES = {
  infantry: { name: 'Combat Arms', icon: '🎯', exposure: 1.6, names: { navy: 'Special Warfare', airforce: 'Security Forces', coastguard: 'Maritime Enforcement' }, desc: 'Highest combat exposure and valor opportunities.' },
  medic: { name: 'Combat Medic', icon: '⛑️', exposure: 1.2, names: { navy: 'Hospital Corpsman', marines: 'Hospital Corpsman (FMF)', coastguard: 'Health Services Technician' }, desc: 'Unlocks life-saving combat choices.' },
  engineer: { name: 'Combat Engineer', icon: '🧨', exposure: 1.0, names: { navy: 'Seabee', airforce: 'Civil Engineer', coastguard: 'Damage Controlman' }, desc: 'Breaching, demolition, construction.' },
  aviation: { name: 'Aviation', icon: '🚁', exposure: 0.9, names: { airforce: 'Aircrew', coastguard: 'Aviation Survival Technician' }, desc: 'Air operations and rescue.' },
  intel: { name: 'Intelligence', icon: '🛰️', exposure: 0.6, minSmarts: 55, names: {}, desc: 'Low exposure, strong evaluations. Needs 55+ smarts.' },
  logistics: { name: 'Logistics', icon: '📦', exposure: 0.5, names: { navy: 'Logistics Specialist' }, desc: 'Keeps the force supplied. Lowest exposure.' },
};

/** Approximate monthly base pay at <2 years of service. */
const PAY = {
  enlisted: [2100, 2350, 2480, 2750, 3000, 3300, 3800, 5400, 6600],
  officer: [3950, 4550, 5250, 5980, 6930, 8320, 10970, 12470, 15900, 18000],
};
/** Minimum years in grade before eligibility for the next grade. */
const TIME_IN_GRADE = {
  enlisted: [1, 1, 1, 2, 3, 4, 3, 3, 0],
  officer: [2, 2, 4, 4, 4, 4, 3, 3, 3, 0],
};
/** Minimum evaluation score to be competitive for the next grade. */
const BOARD_THRESHOLD = {
  enlisted: [35, 40, 45, 60, 66, 72, 78, 85, 0],
  officer: [40, 45, 65, 70, 76, 82, 88, 90, 94, 0],
};

export const ENLIST_CONTRACT = { active: 4, reserve: 6 };
export const RETIREMENT_YEARS = 20;

export const branchOf = (svc) => BRANCHES[svc.branch];

export function rankTitles(svc) {
  return branchOf(svc)[svc.track];
}

export function rankOf(svc) {
  const titles = rankTitles(svc);
  const prefix = svc.track === 'officer' ? 'O' : 'E';
  return { code: `${prefix}-${svc.grade + 1}`, title: titles[svc.grade], grade: svc.grade, max: titles.length - 1 };
}

export function specialtyName(svc) {
  const s = SPECIALTIES[svc.specialty];
  return s.names[svc.branch] ?? s.name;
}

export function monthlyBasePay(svc) {
  const longevity = 1 + Math.min(svc.yearsOfService, 26) * 0.025;
  return Math.round(PAY[svc.track][svc.grade] * longevity);
}

export function annualActivePay(svc) {
  return monthlyBasePay(svc) * 12;
}

export function timeInGradeRequired(svc) {
  const years = TIME_IN_GRADE[svc.track][svc.grade];
  return svc.component === 'reserve' ? Math.ceil(years * 1.5) : years;
}

/* ------------------------------------------------------------------ */
/* Enlistment                                                          */
/* ------------------------------------------------------------------ */

export function enlistmentEligibility(state, branchId, track, component = 'reserve') {
  const age = state.character.age;
  if (!BRANCHES[branchId]) return { ok: false, reason: 'Unknown branch' };
  if (BRANCHES[branchId].reserveOnly && component === 'active') return { ok: false, reason: 'The Guard is a part-time state force' };
  if (state.military.service) return { ok: false, reason: 'Already serving' };
  if (state.military.history.some((h) => h.discharge === 'dishonorable' || h.discharge === 'oth')) return { ok: false, reason: 'Barred: prior bad-conduct discharge' };
  if (hasFelony(state)) return { ok: false, reason: 'Barred: felony record' };
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  if (track === 'officer') {
    if (age < 19 || age > 39) return { ok: false, reason: 'Officers: age 19–39' };
    if (!meetsEducation(state, { level: 'bachelor' })) return { ok: false, reason: "Officers need a bachelor's" };
  } else {
    if (age < 17 || age > 39) return { ok: false, reason: 'Enlistment: age 17–39' };
    if (age >= 18 && !meetsEducation(state, { level: 'highschool' })) return { ok: false, reason: 'Needs diploma' };
  }
  if (state.stats.health < 40) return { ok: false, reason: 'Fails MEPS medical (health)' };
  if (state.stats.fitness < 30) return { ok: false, reason: 'Fails fitness test' };
  return { ok: true };
}

export function enlist(ctx, { branch, track, component, specialty }) {
  const { state } = ctx;
  const b = BRANCHES[branch];
  // College grads who enlist start a few grades up.
  const startGrade = track === 'enlisted' && meetsEducation(state, { level: 'bachelor' }) ? (branch === 'army' ? 3 : 2) : 0;
  const svc = {
    branch,
    track,
    component,
    specialty,
    grade: startGrade,
    yearsInGrade: 0,
    yearsOfService: 0,
    contractYearsLeft: track === 'officer' ? ENLIST_CONTRACT[component] + (component === 'active' ? 0 : 2) : ENLIST_CONTRACT[component],
    eval: 60,
    deployments: 0,
    combatTours: 0,
    wounds: 0,
    disciplinary: 0,
    deployedThisYear: false,
    deploymentRequested: false,
    joinedAge: state.character.age,
    isNew: true,
  };
  state.military.service = svc;

  if (component === 'active') {
    if (state.career.job) ctx.emit('career:militaryLeave', { reason: `active duty with the ${b.name}` });
  }
  const verb = track === 'officer' ? 'accepted a commission' : 'enlisted';
  const comp = component === 'active' ? 'active duty' : 'the Reserve';
  ctx.log(`You ${verb} in the ${b.name} (${comp}) as a ${rankOf(svc).title}, ${specialtyName(svc)}. ${b.motto}!`, b.icon, 'milestone');
  ctx.toast(`Joined the ${b.name}`, 'good');
}

/* ------------------------------------------------------------------ */
/* Evaluation & promotion                                              */
/* ------------------------------------------------------------------ */

export function updateEvaluation(ctx, svc) {
  const { state, rng } = ctx;
  const effort = Math.min(svc.ptSessions ?? 0, 2) * 5 + (svc.extraDuty ? 6 : 0);
  svc.ptSessions = 0;
  svc.extraDuty = false;
  const smartsWeight = svc.specialty === 'intel' ? 0.25 : 0.15;
  const target = 30 + state.stats.fitness * 0.25 + state.stats.smarts * smartsWeight + effort + rng.int(-8, 8)
    - Math.max(0, state.stats.stress - 65) * 0.3 - svc.disciplinary * 4;
  svc.eval = Math.round(clamp(svc.eval * 0.5 + target * 0.5, 0, 100));
}

export function promotionOutlook(svc) {
  const max = rankTitles(svc).length - 1;
  if (svc.grade >= max) return { eligible: false, reason: 'Highest grade' };
  const tig = timeInGradeRequired(svc);
  if (svc.yearsInGrade < tig) return { eligible: false, reason: `${tig - svc.yearsInGrade} yr time-in-grade` };
  const threshold = BOARD_THRESHOLD[svc.track][svc.grade];
  if (svc.eval < threshold) return { eligible: false, reason: `Eval ${svc.eval}/${threshold}` };
  return { eligible: true };
}

export function tryPromotion(ctx, svc) {
  const outlook = promotionOutlook(svc);
  if (!outlook.eligible) return false;
  const flagBoard = svc.track === 'officer' && svc.grade >= 5;
  if (flagBoard && (svc.flagPassovers ?? 0) >= 3) return false;
  let chance = 0.55 + (svc.eval - BOARD_THRESHOLD[svc.track][svc.grade]) / 50;
  // General/flag officer and senior NCO boards are brutally selective.
  if (flagBoard) chance = 0.03 + Math.min(0.05, prestige(ctx.state) / 4000) + Math.max(0, svc.eval - 90) / 200;
  if (svc.track === 'enlisted' && svc.grade >= 7) chance *= 0.6;
  if (!ctx.rng.chance(clamp(chance, 0.02, 0.95))) {
    if (flagBoard) svc.flagPassovers = (svc.flagPassovers ?? 0) + 1;
    ctx.log(`The promotion board passed you over for ${rankTitles(svc)[svc.grade + 1]}.${flagBoard && svc.flagPassovers >= 3 ? ' You will not be considered again.' : ''}`, '📋', 'warn');
    return false;
  }
  svc.grade += 1;
  svc.yearsInGrade = 0;
  svc.flagPassovers = 0;
  const rank = rankOf(svc);
  ctx.log(`Promoted to ${rank.title} (${rank.code})!`, '⬆️', 'good');
  ctx.toast(`Promoted: ${rank.title}`, 'good');
  ctx.stat('happiness', 8);
  return true;
}

export function commission(ctx, svc) {
  svc.track = 'officer';
  svc.grade = 0;
  svc.yearsInGrade = 0;
  svc.contractYearsLeft = Math.max(svc.contractYearsLeft, svc.component === 'active' ? 4 : 6);
  ctx.log(`You graduated from ${branchOf(svc).officerSchool} and were commissioned a ${rankOf(svc).title}!`, '🎓', 'milestone');
  ctx.toast('Commissioned as an officer!', 'good');
}

/* ------------------------------------------------------------------ */
/* Discharge & benefits                                                */
/* ------------------------------------------------------------------ */

export const DISCHARGE_LABEL = {
  honorable: 'Honorable',
  general: 'General (Under Honorable Conditions)',
  medical: 'Medical',
  retired: 'Retired',
  oth: 'Other Than Honorable',
  dishonorable: 'Dishonorable',
  kia: 'Killed in Action',
};

export function discharge(ctx, type, reason) {
  const { state } = ctx;
  const svc = state.military.service;
  if (!svc) return;
  const rank = rankOf(svc);

  if (type === 'retired' || type === 'medical') careerEndAwards(ctx, svc);

  state.military.history.push({
    branch: svc.branch,
    track: svc.track,
    component: svc.component,
    specialty: svc.specialty,
    rankCode: rank.code,
    rankTitle: rank.title,
    yearsOfService: svc.yearsOfService,
    deployments: svc.deployments,
    combatTours: svc.combatTours,
    startAge: svc.joinedAge,
    endAge: state.character.age,
    discharge: type,
    reason,
  });
  state.military.service = null;

  if (type === 'kia') return;

  const multiplier = pensionMultiplier(state);
  const basePay = annualActivePay(svc);
  if (type === 'retired') {
    const reserve = svc.component === 'reserve';
    const annual = Math.round(basePay * 0.025 * svc.yearsOfService * (reserve ? 0.35 : 1) * multiplier);
    const startAge = reserve ? Math.max(60, state.character.age) : state.character.age;
    ctx.emit('retirement:addPension', { pension: { id: 'military', label: `${BRANCHES[svc.branch].name} retired pay`, annual, startAge, source: 'military', cola: 0.025 } });
    addLog(state, `Retirement pay: $${annual.toLocaleString()}/yr${reserve ? ' starting at age 60' : ''} (×${multiplier.toFixed(2)} decoration multiplier).`, '🏦', 'finance');
  }
  if (militaryHonors(state).some((h) => h.id === 'moh') && !state.retirement.pensions.some((p) => p.id === 'moh')) {
    ctx.emit('retirement:addPension', { pension: { id: 'moh', label: 'Medal of Honor special pension', annual: MOH_ANNUAL_PENSION, startAge: state.character.age, source: 'military', cola: 0.025 } });
  }

  ctx.log(`You were discharged from the ${BRANCHES[svc.branch].name} as a ${rank.title} — ${DISCHARGE_LABEL[type]}. ${reason}`, '🎗️', 'milestone');
  ctx.toast(`Discharged: ${DISCHARGE_LABEL[type]}`, type === 'dishonorable' ? 'bad' : 'info');
  // The VA rates service-connected conditions (health module).
  ctx.emit('military:discharged', { type, wounds: svc.wounds });
}

export const isVeteran = (state) => state.military.history.some((h) => h.discharge !== 'dishonorable');
