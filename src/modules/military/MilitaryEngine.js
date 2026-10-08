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
import { releaseUnit } from '../org/MilitaryUnits.js';
import { MOS_PIPELINE, sofRecord } from './SpecialOpsCatalog.js';
import { belowZone, boardScore } from './MilitaryLife.js';
import { pmeBlock, schoolName, qualBoardBonus, qualPay, PME } from './Schools.js';
import { offerBranchDetail } from './CareerFields.js';
import { meetsEducation, prestige, addLog, hasFelony } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { pensionMultiplier, careerEndAwards, militaryHonors, MOH_ANNUAL_PENSION } from './MedalEngine.js';
import { hasClearance, adjudicate, CLEARANCES } from '../publicservice/PublicServiceEngine.js';
import { MOS, mosOf, defaultMos, directGrade, enlistedStartGrade, equivalentMos, DIRECT_COMMISSIONS } from './MOS.js';
import { grantCredential } from '../credentials/LicensingEngine.js';

const ARMY_OFFICERS = ['Second Lieutenant', 'First Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier General', 'Major General', 'Lieutenant General', 'General'];
const NAVAL_OFFICERS = ['Ensign', 'Lieutenant (j.g.)', 'Lieutenant', 'Lieutenant Commander', 'Commander', 'Captain', 'Rear Admiral (LH)', 'Rear Admiral', 'Vice Admiral', 'Admiral'];
const WARRANT_RANKS = ['Warrant Officer 1', 'Chief Warrant Officer 2', 'Chief Warrant Officer 3', 'Chief Warrant Officer 4', 'Chief Warrant Officer 5'];
const NAVAL_ENLISTED = ['Seaman Recruit', 'Seaman Apprentice', 'Seaman', 'Petty Officer 3rd Class', 'Petty Officer 2nd Class', 'Petty Officer 1st Class', 'Chief Petty Officer', 'Senior Chief Petty Officer', 'Master Chief Petty Officer'];

export const BRANCHES = {
  army: {
    id: 'army', name: 'U.S. Army', icon: '🪖', motto: 'This We\'ll Defend', theater: 'ground',
    basic: 'Basic Combat Training at Fort Jackson', officerSchool: 'Officer Candidate School at Fort Moore',
    enlisted: ['Private (PV1)', 'Private (PV2)', 'Private First Class', 'Specialist', 'Sergeant', 'Staff Sergeant', 'Sergeant First Class', 'Master Sergeant', 'Sergeant Major'],
    officer: ARMY_OFFICERS,
    warrant: WARRANT_RANKS,
  },
  marines: {
    id: 'marines', name: 'U.S. Marine Corps', icon: '🦅', motto: 'Semper Fidelis', theater: 'ground',
    basic: 'Recruit Training at MCRD Parris Island', officerSchool: 'Officer Candidates School at Quantico',
    enlisted: ['Private', 'Private First Class', 'Lance Corporal', 'Corporal', 'Sergeant', 'Staff Sergeant', 'Gunnery Sergeant', 'Master Sergeant', 'Sergeant Major'],
    officer: ARMY_OFFICERS,
    warrant: WARRANT_RANKS,
  },
  navy: {
    id: 'navy', name: 'U.S. Navy', icon: '⚓', motto: 'Semper Fortis', theater: 'naval',
    basic: 'Recruit Training Command at Great Lakes', officerSchool: 'Officer Candidate School at Newport',
    enlisted: NAVAL_ENLISTED,
    officer: NAVAL_OFFICERS,
    warrant: WARRANT_RANKS,
  },
  airforce: {
    id: 'airforce', name: 'U.S. Air Force', icon: '✈️', motto: 'Aim High… Fly-Fight-Win', theater: 'air',
    basic: 'Basic Military Training at JBSA-Lackland', officerSchool: 'Officer Training School at Maxwell AFB',
    enlisted: ['Airman Basic', 'Airman', 'Airman First Class', 'Senior Airman', 'Staff Sergeant', 'Technical Sergeant', 'Master Sergeant', 'Senior Master Sergeant', 'Chief Master Sergeant'],
    officer: ARMY_OFFICERS,
    warrant: WARRANT_RANKS,
  },
  guard: {
    id: 'guard', name: 'Army National Guard', icon: '🛡️', motto: 'Always Ready, Always There', theater: 'ground', reserveOnly: true,
    basic: 'Basic Combat Training at Fort Jackson', officerSchool: 'State Officer Candidate School',
    enlisted: ['Private (PV1)', 'Private (PV2)', 'Private First Class', 'Specialist', 'Sergeant', 'Staff Sergeant', 'Sergeant First Class', 'Master Sergeant', 'Sergeant Major'],
    officer: ARMY_OFFICERS,
    warrant: WARRANT_RANKS,
  },
  spaceforce: {
    id: 'spaceforce', name: 'U.S. Space Force', icon: '🛰️', motto: 'Semper Supra', theater: 'air', activeOnly: true,
    basic: 'Basic Military Training at JBSA-Lackland', officerSchool: 'Officer Training School at Maxwell AFB',
    enlisted: ['Specialist 1', 'Specialist 2', 'Specialist 3', 'Specialist 4', 'Sergeant', 'Technical Sergeant', 'Master Sergeant', 'Senior Master Sergeant', 'Chief Master Sergeant'],
    officer: ARMY_OFFICERS,
    warrant: [],
    desc: 'Guardians: satellite operations, missile warning, space domain awareness, orbital warfare and cyber. Few deployments; high entry standards.',
  },
  coastguard: {
    id: 'coastguard', name: 'U.S. Coast Guard', icon: '🛟', motto: 'Semper Paratus', theater: 'maritime',
    basic: 'Recruit Training at Cape May', officerSchool: 'Officer Candidate School at New London',
    enlisted: NAVAL_ENLISTED,
    officer: NAVAL_OFFICERS,
    warrant: WARRANT_RANKS,
  },
};

/**
 * The two non-military uniformed services: officer-only commissioned corps,
 * paid on the military scale with military-style retirement, but they
 * deploy to public-health emergencies and research missions rather than war.
 */
BRANCHES.usphs = {
  id: 'usphs', name: 'U.S. Public Health Service Commissioned Corps', icon: '⚕️', motto: 'In Officio Salutis', theater: 'publicHealth',
  officerOnly: true, activeOnly: true, nonCombat: true, maxAge: 44,
  basic: 'Officer Basic Course', officerSchool: 'the USPHS Officer Basic Course in Rockville',
  enlisted: [], warrant: [], officer: ['Ensign', 'Lieutenant (j.g.)', 'Lieutenant', 'Lieutenant Commander', 'Commander', 'Captain', 'Rear Admiral (LH)', 'Rear Admiral', 'Vice Admiral (Surgeon General)', 'Admiral (Assistant Secretary for Health)'],
};
BRANCHES.noaa = {
  id: 'noaa', name: 'NOAA Commissioned Officer Corps', icon: '🌊', motto: 'Science, Service, Stewardship', theater: 'science',
  officerOnly: true, activeOnly: true, nonCombat: true, maxAge: 42,
  basic: 'Basic Officer Training Class', officerSchool: 'Basic Officer Training Class at the Coast Guard Academy',
  enlisted: [], warrant: [], officer: NAVAL_OFFICERS.slice(0, 9).map((t, i) => (i === 8 ? 'Vice Admiral (NOAA Corps Director)' : t)),
};
export const isNonCombat = (branchId) => Boolean(BRANCHES[branchId]?.nonCombat);

export const SPECIALTIES = {
  infantry: { name: 'Combat Arms', icon: '🎯', exposure: 1.6, clearance: 'secret', names: { navy: 'Special Warfare', airforce: 'Security Forces', coastguard: 'Maritime Enforcement' }, desc: 'Highest combat exposure and valor opportunities.' },
  medic: { name: 'Combat Medic', icon: '⛑️', exposure: 1.2, names: { navy: 'Hospital Corpsman', marines: 'Hospital Corpsman (FMF)', coastguard: 'Health Services Technician' }, desc: 'Unlocks life-saving combat choices.' },
  engineer: { name: 'Combat Engineer', icon: '🧨', exposure: 1.0, clearance: 'secret', names: { navy: 'Seabee', airforce: 'Civil Engineer', coastguard: 'Damage Controlman' }, desc: 'Breaching, demolition, construction.' },
  aviation: { name: 'Aviation', icon: '🚁', exposure: 0.9, clearance: 'secret', names: { airforce: 'Aircrew', coastguard: 'Aviation Survival Technician' }, desc: 'Air operations and rescue.' },
  intel: { name: 'Intelligence', icon: '🛰️', exposure: 0.6, minSmarts: 55, clearance: 'topSecret', names: {}, desc: 'Low exposure, strong evaluations. Needs 55+ smarts and a TS/SCI clearance.' },
  cyber: { name: 'Cyber Operations', icon: '💻', exposure: 0.4, minSmarts: 60, clearance: 'topSecret', names: { army: 'Cyber Operations Specialist', navy: 'Cryptologic Technician (Networks)', airforce: 'Cyber Warfare Operations', marines: 'Cyber Network Operator', coastguard: 'Cyber Mission Specialist' }, desc: 'Offensive and defensive network operations. Needs 60+ smarts and TS/SCI; the clearance is gold in civilian life.' },
  logistics: { name: 'Logistics', icon: '📦', exposure: 0.5, names: { navy: 'Logistics Specialist' }, desc: 'Keeps the force supplied. Lowest exposure.' },
  legal: { name: 'Legal', icon: '⚖️', exposure: 0.3, names: {}, desc: 'Courts-martial, legal assistance, operational law.' },
  medical: { name: 'Medical Corps', icon: '🩺', exposure: 0.6, names: {}, desc: 'Physicians, nurses and pharmacists in uniform.' },
  chaplain: { name: 'Chaplain Corps', icon: '✝️', exposure: 0.5, names: {}, desc: 'Noncombatant ministry to the troops.' },
  publicHealth: { name: 'Public Health', icon: '🧪', exposure: 0, names: {}, desc: 'Disease control, environmental health and regulatory science.' },
  science: { name: 'Ocean & Atmospheric Science', icon: '🌊', exposure: 0, names: {}, desc: 'Ships, survey launches and hurricane-hunter aircraft.' },
};

/** Approximate monthly base pay at <2 years of service. */
const PAY = {
  enlisted: [2100, 2350, 2480, 2750, 3000, 3300, 3800, 5400, 6600],
  officer: [3950, 4550, 5250, 5980, 6930, 8320, 10970, 12470, 15900, 18000],
  warrant: [4100, 4650, 5300, 6000, 7600],
};
/** Minimum years in grade before eligibility for the next grade. */
const TIME_IN_GRADE = {
  // Typical pin-on: E-5 ≈ 5 yrs, E-6 ≈ 9, E-7 ≈ 14, E-8 ≈ 18, E-9 ≈ 22.
  enlisted: [1, 1, 1, 2, 4, 5, 4, 4, 0],
  // O-3 ≈ 4 yrs, O-4 ≈ 10, O-5 ≈ 16, O-6 ≈ 22.
  officer: [2, 2, 6, 6, 6, 4, 3, 3, 3, 0],
  // W-2 ≈ 2 yrs, W-3 ≈ 8, W-4 ≈ 14, W-5 ≈ 20.
  warrant: [2, 6, 6, 6, 0],
};
/** Minimum evaluation score to be competitive for the next grade. */
const BOARD_THRESHOLD = {
  enlisted: [35, 40, 45, 60, 66, 72, 78, 85, 0],
  officer: [40, 45, 65, 70, 76, 82, 88, 90, 94, 0],
  warrant: [45, 60, 70, 80, 0],
};

export const ENLIST_CONTRACT = { active: 4, reserve: 6 };

/** Years served in one stint, without the prior service it was credited with. */
export const ownServiceYears = (h) => (h?.yearsOfService ?? 0) - (h?.priorYears ?? 0);

/**
 * Prior service that counts toward retirement (and pay) when you come back:
 * earlier honorable stints plus years at a service academy. Retired stints
 * already earned their pension.
 */
export function priorServiceCredit(state) {
  const years = state.military.history.filter((h) => ['honorable', 'general', 'medical'].includes(h.discharge)).reduce((s, h) => s + ownServiceYears(h), 0);
  return years + (state.military.academyCredit ?? 0);
}
export const RETIREMENT_YEARS = 20;

export const branchOf = (svc) => BRANCHES[svc.branch];

/** Rank tables for a service member's branch (both tracks). */
export const ranksOf = (svc) => ({ enlisted: BRANCHES[svc.branch].enlisted, officer: BRANCHES[svc.branch].officer, warrant: BRANCHES[svc.branch].warrant ?? [] });

/** Officers and warrant officers (as opposed to enlisted). */
export const commissioned = (svc) => svc.track !== 'enlisted';

export function rankTitles(svc) {
  return branchOf(svc)[svc.track];
}

export function rankOf(svc) {
  const titles = rankTitles(svc);
  const prefix = svc.track === 'officer' ? 'O' : svc.track === 'warrant' ? 'W' : 'E';
  return { code: `${prefix}-${svc.grade + 1}`, title: titles[svc.grade], grade: svc.grade, max: titles.length - 1 };
}

export function specialtyName(svc) {
  const m = mosOf(svc);
  if (m) return `${m.code} ${m.title}`;
  const s = SPECIALTIES[svc.specialty];
  return s.names[svc.branch] ?? s.name;
}

/** Combat exposure: the job's own, else its broad specialty's. */
export function exposureOf(svc) {
  return svc.sof?.exposure ?? mosOf(svc)?.exposure ?? SPECIALTIES[svc.specialty].exposure;
}

/** Flight hours logged per year (pilots and aircrew only; old saves: any aviation). */
export function flightHoursOf(svc) {
  const m = mosOf(svc);
  const flies = m ? m.pilot : svc.specialty === 'aviation';
  if (!flies) return 0;
  return svc.component === 'active' ? 250 : 60;
}

/** Medics and the Medical Corps can take the life-saving combat choices. */
export const isMedical = (svc) => svc.specialty === 'medic' || svc.specialty === 'medical';

/** Finished initial training: civilian credentials the job carries. */
export function completeTraining(ctx, svc) {
  let m = mosOf(svc);
  if (!m) return;
  // Assessment pipelines (Special Forces, SEALs, PJs) wash out most candidates.
  if (m.selection) {
    const odds = Math.max(0.05, Math.min(0.85, m.selection + (ctx.state.stats.fitness - 65) / 150 + (ctx.state.stats.smarts - 50) / 400));
    if (!ctx.rng.chance(odds)) {
      const fallback = defaultMos(svc.branch, svc.track, svc.specialty);
      svc.mos = fallback?.id ?? null;
      ctx.log(`You washed out of ${m.title} selection and were reassigned as ${specialtyName(svc)}.`, '🥾', 'warn');
      ctx.stat('happiness', -6);
      m = fallback;
      if (!m) return;
    } else {
      ctx.log(`You survived selection and earned your place as ${m.title}. Fewer than half make it.`, '🗡️', 'milestone');
      if (MOS_PIPELINE[m.id] && !svc.sof) svc.sof = sofRecord(MOS_PIPELINE[m.id], ctx.state.character.age);
      ctx.stat('happiness', 8);
      svc.eval = Math.min(100, svc.eval + 10);
    }
  }
  if (!m.grants && !m.pilot) return;
  const earned = [];
  for (const id of m.grants ?? []) {
    if (ctx.state.credentials.held[id]?.status === 'active') continue;
    grantCredential(ctx, id, { sponsor: 'military', silent: true });
    earned.push(id);
  }
  if (m.pilot && svc.track !== 'enlisted') ctx.emit('logbook:add', { hours: 200 });
  if (earned.length) ctx.log(`Your ${m.title} training carried over to civilian life: ${earned.length} credential${earned.length > 1 ? 's' : ''} earned.`, '📜', 'good');
}

export function monthlyBasePay(svc) {
  const longevity = 1 + Math.min(svc.yearsOfService, 26) * 0.025;
  return Math.round(PAY[svc.track][svc.grade] * longevity);
}

/** Base pay alone: what retired pay and separation pay are computed from. */
export const annualBasePay = (svc) => monthlyBasePay(svc) * 12;

export function annualActivePay(svc) {
  // Special operators draw special-duty pay; jumpers, divers, drill sergeants and linguists draw incentive pay.
  return monthlyBasePay(svc) * 12 + ((svc.sof?.specialPay ?? 0) + qualPay(svc)) * (svc.component === 'active' ? 1 : 0.2);
}

export function timeInGradeRequired(svc) {
  const years = TIME_IN_GRADE[svc.track][svc.grade];
  return svc.component === 'reserve' ? Math.ceil(years * 1.25) : years;
}

/* ------------------------------------------------------------------ */
/* Enlistment                                                          */
/* ------------------------------------------------------------------ */

export function enlistmentEligibility(state, branchId, track, component = 'reserve', { maxOfficerAge = 39 } = {}) {
  const age = state.character.age;
  if (!BRANCHES[branchId]) return { ok: false, reason: 'Unknown branch' };
  const b = BRANCHES[branchId];
  if (b.reserveOnly && component === 'active') return { ok: false, reason: 'The Guard is a part-time state force' };
  if (b.officerOnly && track !== 'officer') return { ok: false, reason: 'Commissioned officers only' };
  if (b.activeOnly && component !== 'active') return { ok: false, reason: 'Active duty only' };
  if (b.maxAge) maxOfficerAge = Math.max(maxOfficerAge, b.maxAge);
  if (state.military.service) return { ok: false, reason: 'Already serving' };
  if (state.military.history.some((h) => ['dishonorable', 'bcd', 'oth'].includes(h.discharge))) return { ok: false, reason: 'Barred: prior bad-conduct discharge' };
  if (hasFelony(state)) return { ok: false, reason: 'Barred: felony record' };
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  if (track === 'warrant') {
    if (!b.warrant?.length) return { ok: false, reason: 'No warrant officers' };
    if (branchId !== 'army' && branchId !== 'guard') return { ok: false, reason: 'Warrant officers come from the enlisted ranks' };
    if (age < 18 || age > 32) return { ok: false, reason: 'Flight school: age 18–32' };
    if (!meetsEducation(state, { level: 'highschool' })) return { ok: false, reason: 'Needs diploma' };
  } else if (track === 'officer') {
    if (age < 19 || age > maxOfficerAge) return { ok: false, reason: `Officers: age 19–${maxOfficerAge}` };
    if (!meetsEducation(state, { level: 'bachelor' })) return { ok: false, reason: "Officers need a bachelor's" };
  } else {
    if (age < 17 || age > 39) return { ok: false, reason: 'Enlistment: age 17–39' };
    if (age >= 18 && !meetsEducation(state, { level: 'highschool' })) return { ok: false, reason: 'Needs diploma' };
  }
  if (state.stats.health < 40) return { ok: false, reason: 'Fails MEPS medical (health)' };
  if (state.stats.fitness < 30) return { ok: false, reason: 'Fails fitness test' };
  return { ok: true };
}

/** Clearance a service member needs: their specialty's, and at least Secret for any officer. */
export function requiredClearance(svc) {
  const m = svc.mos ? MOS[svc.mos] : null;
  if (isNonCombat(svc.branch ?? m?.branch)) return m?.clearance ?? null;
  const s = m?.clearance ?? SPECIALTIES[svc.specialty]?.clearance ?? null;
  if (svc.track === 'enlisted') return s;
  return s && CLEARANCES[s].rank > CLEARANCES.secret.rank ? s : 'secret';
}

/**
 * The background investigation at entry. A clean candidate is simply
 * investigated; `cleared` means the SF-86 prompt already ran. Returns the
 * specialty to serve in, or null if the commission is withdrawn.
 */
function entryClearance(ctx, { track, specialty, mos, cleared }) {
  const { state, rng } = ctx;
  const level = requiredClearance({ track, specialty, mos });
  if (!level || hasClearance(state, level) || cleared) return specialty;
  const r = adjudicate(state, level, true, rng);
  if (r.granted) {
    ctx.emit('clearance:grant', { level, concealed: false });
    return specialty;
  }
  return clearanceDenied(ctx, track, level);
}

export function clearanceDenied(ctx, track, level) {
  if (track === 'officer') {
    ctx.log(`Your ${CLEARANCES[level].name} clearance was denied, and with it your commission.`, '🚫', 'bad');
    return null;
  }
  ctx.log(`Your ${CLEARANCES[level].name} clearance was denied. The recruiter reclassified you into Logistics.`, '🚫', 'warn');
  return 'logistics';
}

/**
 * Join up. `mos` picks the job (its broad specialty follows); a bare
 * `specialty` picks that specialty's first job. Direct-commission jobs start
 * at the grade the candidate's civilian experience earns; enlisted recruits
 * with a degree or a matching civilian credential start a few grades up.
 */
export function enlist(ctx, { branch, track, component, specialty: wanted, mos: wantedMos = null, cleared = false }) {
  const { state } = ctx;
  const b = BRANCHES[branch];
  let job = wantedMos ? MOS[wantedMos] : defaultMos(branch, track, wanted);
  const specialty = entryClearance(ctx, { track, specialty: job?.specialty ?? wanted, mos: job?.id, cleared });
  if (!specialty) return false;
  if (job && specialty !== job.specialty) job = defaultMos(branch, track, specialty);
  const direct = track === 'officer' ? directGrade(state, job) : null;
  let startGrade = track === 'enlisted' ? enlistedStartGrade(state, branch, job) : direct ?? 0;
  // Coming back: prior service counts toward retirement, and you return near your old grade.
  const prior = priorServiceCredit(state);
  const last = [...state.military.history].reverse().find((h) => ['honorable', 'general', 'medical'].includes(h.discharge));
  if (last && last.track === track) startGrade = Math.min(BRANCHES[branch][track].length - 1, Math.max(startGrade, Number(last.rankCode.slice(2)) - 1 - (track === 'enlisted' ? 1 : 0)));
  const svc = {
    branch,
    track,
    component,
    specialty,
    mos: job?.id ?? null,
    grade: startGrade,
    yearsInGrade: 0,
    yearsOfService: prior,
    priorYears: prior,
    contractYearsLeft: track === 'warrant' ? 6 : track === 'officer' ? ENLIST_CONTRACT[component] + (component === 'active' ? 0 : 2) : ENLIST_CONTRACT[component],
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
  const level = requiredClearance(svc);
  svc.clearance = level && hasClearance(state, level) ? level : null;
  // Schools and qualifications from earlier service carry over; PME up to your entry grade is credited.
  svc.schools = Object.assign({}, ...state.military.history.map((h) => h.schools ?? {}));
  for (const p of PME[track] ?? []) if (p.forGrade <= startGrade) svc.schools[p.id] ??= state.character.age;
  state.military.service = svc;
  state.military.academyCredit = 0;
  if (prior) ctx.log(`${prior} year${prior > 1 ? 's' : ''} of prior service (earlier enlistments and academy years) count toward your retirement.`, '📜', 'good');

  if (component === 'active') {
    if (state.career.job) ctx.emit('career:militaryLeave', { reason: `active duty with the ${b.name}` });
  }
  if (direct != null) {
    const dc = DIRECT_COMMISSIONS[job.direct];
    svc.direct = job.direct;
    if (dc.bonus) ctx.earn(dc.bonus, `${dc.name} accession bonus`);
  }
  const verb = direct != null ? `received a direct commission into the ${DIRECT_COMMISSIONS[job.direct].name}` : track === 'officer' ? 'accepted a commission' : track === 'warrant' ? 'were accepted for warrant officer flight training' : 'enlisted';
  const comp = component === 'active' ? 'active duty' : 'the Reserve';
  ctx.log(`You ${verb} in the ${b.name} (${comp}) as a ${rankOf(svc).title}, ${specialtyName(svc)}. ${b.motto}!`, b.icon, 'milestone');
  ctx.toast(`Joined the ${b.name}`, 'good');
  offerBranchDetail(ctx, svc);
  return true;
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
  const school = pmeBlock(svc);
  if (school) return { eligible: false, school: true, reason: `Needs ${schoolName(svc, school.id)}` };
  const threshold = BOARD_THRESHOLD[svc.track][svc.grade];
  if (svc.eval < threshold) return { eligible: false, reason: `Eval ${svc.eval}/${threshold}` };
  return { eligible: true };
}

/** Officer grades where two non-selections end a career (O-2→O-3, O-3→O-4, O-4→O-5). */
const UP_OR_OUT = [1, 2, 3];

function notSelected(ctx, svc) {
  if (svc.track !== 'officer' || !UP_OR_OUT.includes(svc.grade)) return;
  // Capped: officers in the retirement sanctuary can keep being passed over without it mattering.
  svc.passovers = Math.min(2, (svc.passovers ?? 0) + 1);
  if (svc.passovers < 2) ctx.log(`Not selected for ${rankTitles(svc)[svc.grade + 1]} (1/2). A second non-selection means separation.`, '📋', 'warn');
}

export function tryPromotion(ctx, svc) {
  // Top performers can be picked up a year early.
  if (svc.track && !pmeBlock(svc) && belowZone(svc, timeInGradeRequired(svc), BOARD_THRESHOLD[svc.track][svc.grade]) && ctx.rng.chance(0.25)) {
    svc.grade += 1;
    svc.yearsInGrade = 0;
    svc.passovers = 0;
    const rank = rankOf(svc);
    ctx.log(`Selected below the zone: promoted to ${rank.title} (${rank.code}) a year ahead of your peers!`, '🚀', 'good');
    ctx.toast(`Promoted early: ${rank.title}`, 'good');
    ctx.stat('happiness', 10);
    return true;
  }
  const outlook = promotionOutlook(svc);
  if (!outlook.eligible) {
    // In the zone but not competitive: the board still meets, and passes you over.
    if (svc.grade < rankTitles(svc).length - 1 && svc.yearsInGrade >= timeInGradeRequired(svc)) notSelected(ctx, svc);
    return false;
  }
  const flagBoard = svc.track === 'officer' && svc.grade >= 5;
  if (flagBoard && (svc.flagPassovers ?? 0) >= 3) return false;
  let chance = 0.55 + (boardScore(svc) - BOARD_THRESHOLD[svc.track][svc.grade]) / 50;
  // Boards promote people who have commanded (or served as first sergeant) at their grade.
  if (Object.keys(svc.unit?.commanded ?? {}).length || svc.unit?.commandUntil) chance += 0.12;
  // An officer's reprimand (or any Article 15 for a senior NCO) sits in the file the board reads.
  if (svc.reprimand) chance -= 0.35;
  chance += qualBoardBonus(svc);
  if (svc.track === 'enlisted' && svc.grade >= 5) chance -= 0.1 * (svc.njp ?? []).filter((n) => n.age >= svc.joinedAge + svc.yearsOfService - 5).length;
  // General/flag officer and senior NCO boards are brutally selective.
  if (flagBoard) chance = 0.03 + Math.min(0.05, prestige(ctx.state) / 4000) + Math.max(0, svc.eval - 90) / 200;
  // Senior boards select a fraction of those eligible: about 45% for O-6, 40% for E-8, 20% for E-9.
  if (svc.track === 'officer' && svc.grade === 4) chance *= 0.65;
  if (svc.track === 'enlisted' && svc.grade === 6) chance *= 0.6;
  if (svc.track === 'enlisted' && svc.grade >= 7) chance *= 0.4;
  if (svc.track === 'warrant' && svc.grade >= 3) chance *= 0.6;
  if (!ctx.rng.chance(clamp(chance, 0.02, 0.95))) {
    if (flagBoard) svc.flagPassovers = (svc.flagPassovers ?? 0) + 1;
    notSelected(ctx, svc);
    ctx.log(`The promotion board passed you over for ${rankTitles(svc)[svc.grade + 1]}.${flagBoard && svc.flagPassovers >= 3 ? ' You will not be considered again.' : ''}`, '📋', 'warn');
    return false;
  }
  svc.grade += 1;
  svc.yearsInGrade = 0;
  svc.flagPassovers = 0;
  svc.passovers = 0;
  const rank = rankOf(svc);
  ctx.log(`Promoted to ${rank.title} (${rank.code})!`, '⬆️', 'good');
  ctx.toast(`Promoted: ${rank.title}`, 'good');
  ctx.stat('happiness', 8);
  return true;
}

export function commission(ctx, svc) {
  svc.mos = equivalentMos(svc, svc.branch, 'officer')?.id ?? null;
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
  bcd: 'Bad-Conduct',
  dishonorable: 'Dishonorable',
  kia: 'Killed in Action',
};

export function discharge(ctx, type, reason) {
  if (ctx.state.military.service?.unit?.orgId) releaseUnit(ctx.state, ctx.state.military.service.unit.orgId);
  ctx.state.military.selection = null;
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
    mos: svc.mos ?? null,
    sof: svc.sof?.pipeline ?? svc.sofFormer ?? null,
    schools: svc.schools ?? {},
    priorYears: svc.priorYears ?? 0,
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
  const basePay = annualBasePay(svc);
  if (type === 'retired') {
    const reserve = svc.component === 'reserve';
    const annual = Math.round(basePay * (svc.retirementPlan === 'brs' ? 0.02 : 0.025) * svc.yearsOfService * (reserve ? 0.35 : 1) * multiplier);
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
  ctx.emit('military:discharged', { type, wounds: svc.wounds, svc });
}

export const isVeteran = (state) => state.military.history.some((h) => h.discharge !== 'dishonorable');

/** Name of the school a new member just finished. */
export function entrySchool(svc) {
  if (svc.direct) return DIRECT_COMMISSIONS[svc.direct].school;
  if (svc.track === 'warrant') return `${branchOf(svc).basic}, then Warrant Officer Candidate School`;
  return svc.track === 'officer' ? branchOf(svc).officerSchool : branchOf(svc).basic;
}
