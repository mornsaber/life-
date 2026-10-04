/**
 * Military occupational specialties: the actual jobs (Army/Guard MOS, Marine
 * MOS, Navy ratings and designators, Air Force AFSCs, Coast Guard ratings).
 * Each maps onto one of the broad SPECIALTIES (which drive combat exposure,
 * clearances and combat-scenario bonuses) and can add its own exposure,
 * entry standards, civilian credentials earned in training, and — for the
 * professional corps — a direct commission at a rank that reflects civilian
 * experience.
 *
 * svc.mos holds the catalog id ('army.68W'); old saves without one fall back
 * to the broad specialty.
 *
 * MOS fields:
 *   specialty   broad category in SPECIALTIES
 *   exposure    overrides the specialty's combat exposure
 *   minSmarts / minFitness  entry standards (ASVAB line scores, PT test)
 *   selection   pass chance for an assessment pipeline (Special Forces, SEALs)
 *   grants      credentials earned on finishing training
 *   skill       { credentials, grade } — civilian credentials that earn an advanced enlisted rank
 *   pilot       logs flight hours toward FAA ratings
 *   direct      officer: a direct-commission program (DIRECT_COMMISSIONS)
 *   civilian    the civilian career this job leads to (shown as a hint)
 */
import { hasCredential } from '../credentials/LicensingEngine.js';
import { yearsInProfession, meetsEducation } from '../../core/State.js';

const M = (code, title, specialty, extra = {}) => ({ code, title, specialty, ...extra });

const ARMY = {
  enlisted: [
    M('11B', 'Infantryman', 'infantry', { minFitness: 45, civilian: 'police' }),
    M('18X', 'Special Forces Candidate', 'infantry', { exposure: 2.0, minFitness: 65, minSmarts: 50, selection: 0.35, clearance: 'secret', desc: 'Green Beret pipeline: brutal selection, the most dangerous deployments.' }),
    M('13B', 'Cannon Crewmember', 'infantry', { exposure: 1.2 }),
    M('19D', 'Cavalry Scout', 'infantry', { exposure: 1.5, minFitness: 40 }),
    M('12B', 'Combat Engineer', 'engineer'),
    M('68W', 'Combat Medic Specialist', 'medic', { grants: ['emt'], skill: { credentials: ['paramedic'], grade: 3 }, civilian: 'ems' }),
    M('15T', 'UH-60 Helicopter Repairer', 'aviation', { exposure: 0.6, civilian: 'aviation' }),
    M('35F', 'Intelligence Analyst', 'intel'),
    M('35P', 'Cryptologic Linguist', 'intel', { grants: ['languageProficiency'], minSmarts: 60 }),
    M('17C', 'Cyber Operations Specialist', 'cyber', { grants: ['securityPlus'], skill: { credentials: ['cissp'], grade: 3 }, civilian: 'tech' }),
    M('25B', 'Information Technology Specialist', 'logistics', { exposure: 0.4, grants: ['securityPlus'], skill: { credentials: ['securityPlus', 'awsCert'], grade: 2 }, civilian: 'tech' }),
    M('31B', 'Military Police', 'infantry', { exposure: 0.9, civilian: 'police' }),
    M('88M', 'Motor Transport Operator', 'logistics', { exposure: 0.8, grants: ['cdlA'], skill: { credentials: ['cdlA'], grade: 2 }, civilian: 'trucking' }),
    M('92Y', 'Unit Supply Specialist', 'logistics'),
    M('27D', 'Paralegal Specialist', 'legal', { skill: { credentials: ['paralegalCP'], grade: 2 }, civilian: 'legalSupport' }),
    M('56M', 'Religious Affairs Specialist', 'chaplain'),
  ],
  officer: [
    M('11A', 'Infantry Officer', 'infantry', { minFitness: 45 }),
    M('18A', 'Special Forces Officer', 'infantry', { exposure: 2.0, minFitness: 65, selection: 0.4, desc: 'Lead a Green Beret A-team.' }),
    M('12A', 'Engineer Officer', 'engineer', { civilian: 'engineering' }),
    M('15A', 'Aviator (Helicopter Pilot)', 'aviation', { pilot: true, grants: ['commercialPilot', 'instrumentRating'], civilian: 'aviation' }),
    M('35D', 'Military Intelligence Officer', 'intel'),
    M('17A', 'Cyber Operations Officer', 'cyber', { civilian: 'tech' }),
    M('90A', 'Logistics Officer', 'logistics', { civilian: 'corporate' }),
    M('31A', 'Military Police Officer', 'infantry', { exposure: 0.9, civilian: 'police' }),
    M('70B', 'Medical Service Officer', 'medic', { exposure: 0.8 }),
    M('17D', 'Cyber Direct Commission', 'cyber', { direct: 'cyber' }),
    M('27A', 'Judge Advocate', 'legal', { direct: 'jag', civilian: 'law' }),
    M('61N', 'Flight Surgeon', 'medical', { direct: 'medical', civilian: 'medical' }),
    M('62B', 'Field Surgeon / Physician', 'medical', { direct: 'medical', civilian: 'medical' }),
    M('66H', 'Medical-Surgical Nurse', 'medical', { direct: 'nurse', civilian: 'nursing' }),
    M('67E', 'Pharmacist', 'medical', { direct: 'pharmacy', exposure: 0.3, civilian: 'pharmacy' }),
    M('56A', 'Chaplain', 'chaplain', { direct: 'chaplain', civilian: 'clergy' }),
  ],
};

const MARINES = {
  enlisted: [
    M('0311', 'Rifleman', 'infantry', { minFitness: 50, civilian: 'police' }),
    M('0331', 'Machine Gunner', 'infantry', { minFitness: 50 }),
    M('0321', 'Reconnaissance Marine', 'infantry', { exposure: 1.9, minFitness: 65, selection: 0.4 }),
    M('0372', 'Critical Skills Operator (MARSOC)', 'infantry', { exposure: 2.0, minFitness: 70, minSmarts: 50, selection: 0.3, clearance: 'secret' }),
    M('1371', 'Combat Engineer', 'engineer'),
    M('6046', 'Aircraft Maintenance Admin', 'aviation', { exposure: 0.5 }),
    M('0231', 'Intelligence Specialist', 'intel'),
    M('1721', 'Cyberspace Warfare Operator', 'cyber', { grants: ['securityPlus'], civilian: 'tech' }),
    M('3531', 'Motor Vehicle Operator', 'logistics', { exposure: 0.8, grants: ['cdlA'], skill: { credentials: ['cdlA'], grade: 2 }, civilian: 'trucking' }),
    M('3043', 'Supply Administration', 'logistics'),
    M('5811', 'Military Police', 'infantry', { exposure: 0.9, civilian: 'police' }),
    M('4421', 'Legal Services Specialist', 'legal', { civilian: 'legalSupport' }),
  ],
  officer: [
    M('0302', 'Infantry Officer', 'infantry', { minFitness: 55 }),
    M('7599', 'Student Naval Aviator (Marine Pilot)', 'aviation', { pilot: true, minSmarts: 55, grants: ['commercialPilot', 'instrumentRating'], civilian: 'aviation' }),
    M('1302', 'Combat Engineer Officer', 'engineer'),
    M('0202', 'Intelligence Officer', 'intel'),
    M('1702', 'Cyberspace Officer', 'cyber'),
    M('0402', 'Logistics Officer', 'logistics'),
    M('4402', 'Judge Advocate', 'legal', { direct: 'jag', civilian: 'law' }),
  ],
};

const NAVY = {
  enlisted: [
    M('SO', 'Special Warfare Operator (SEAL)', 'infantry', { exposure: 2.0, minFitness: 70, selection: 0.25, clearance: 'secret' }),
    M('HM', 'Hospital Corpsman', 'medic', { grants: ['emt'], skill: { credentials: ['paramedic'], grade: 3 }, civilian: 'ems' }),
    M('CE', 'Construction Electrician (Seabee)', 'engineer', { grants: ['journeymanElectrician'], civilian: 'trades' }),
    M('UT', 'Utilitiesman (Seabee)', 'engineer', { grants: ['journeymanPlumber'], civilian: 'plumbing' }),
    M('AD', 'Aviation Machinist\'s Mate', 'aviation', { exposure: 0.6, civilian: 'aviation' }),
    M('AW', 'Naval Aircrewman', 'aviation', { pilot: true }),
    M('IS', 'Intelligence Specialist', 'intel'),
    M('CTN', 'Cryptologic Technician (Networks)', 'cyber', { grants: ['securityPlus'], civilian: 'tech' }),
    M('ET', 'Electronics Technician (Nuclear)', 'engineer', { exposure: 0.5, minSmarts: 65, desc: 'Nuclear power school; elite reactor operators.' }),
    M('BM', 'Boatswain\'s Mate', 'logistics', { exposure: 0.8, grants: ['coxswain'], civilian: 'merchantMarine' }),
    M('LS', 'Logistics Specialist', 'logistics'),
    M('MA', 'Master-at-Arms', 'infantry', { exposure: 0.8, civilian: 'police' }),
    M('CS', 'Culinary Specialist', 'logistics', { exposure: 0.4, grants: ['servSafe'], civilian: 'culinary' }),
    M('LN', 'Legalman', 'legal', { civilian: 'legalSupport' }),
  ],
  officer: [
    M('1130', 'Special Warfare Officer (SEAL)', 'infantry', { exposure: 2.0, minFitness: 70, selection: 0.3 }),
    M('1110', 'Surface Warfare Officer', 'logistics', { exposure: 0.8, civilian: 'merchantMarine' }),
    M('1120', 'Submarine Officer', 'engineer', { exposure: 0.4, minSmarts: 65, desc: 'Nuclear-trained; months under the sea.' }),
    M('1310', 'Naval Aviator', 'aviation', { pilot: true, minSmarts: 55, grants: ['commercialPilot', 'instrumentRating'], civilian: 'aviation' }),
    M('1830', 'Intelligence Officer', 'intel'),
    M('1840', 'Cyber Warfare Engineer', 'cyber'),
    M('3100', 'Supply Corps Officer', 'logistics', { civilian: 'corporate' }),
    M('2500', 'Judge Advocate', 'legal', { direct: 'jag', civilian: 'law' }),
    M('2100', 'Medical Corps Physician', 'medical', { direct: 'medical', civilian: 'medical' }),
    M('2900', 'Nurse Corps Officer', 'medical', { direct: 'nurse', civilian: 'nursing' }),
    M('2300', 'Medical Service Corps (Pharmacist)', 'medical', { direct: 'pharmacy', exposure: 0.3, civilian: 'pharmacy' }),
    M('4100', 'Chaplain Corps', 'chaplain', { direct: 'chaplain', civilian: 'clergy' }),
  ],
};

const AIRFORCE = {
  enlisted: [
    M('1Z2', 'Pararescue', 'aviation', { exposure: 2.0, minFitness: 70, selection: 0.25, grants: ['paramedic'], desc: 'PJs: combat rescue, trained to paramedic level.' }),
    M('1Z1', 'Tactical Air Control Party', 'infantry', { exposure: 1.6, minFitness: 55 }),
    M('3P0', 'Security Forces', 'infantry', { exposure: 0.9, civilian: 'police' }),
    M('4N0', 'Aerospace Medical Technician', 'medic', { grants: ['emt'], civilian: 'ems' }),
    M('3E7', 'Fire Protection', 'engineer', { exposure: 0.7, grants: ['ff1', 'ff2', 'hazmatOps'], skill: { credentials: ['ff2'], grade: 2 }, civilian: 'fire' }),
    M('3E0', 'Electrical Systems', 'engineer', { exposure: 0.6, grants: ['journeymanElectrician'], civilian: 'trades' }),
    M('2A5', 'Aircraft Maintenance', 'aviation', { exposure: 0.5, civilian: 'aviation' }),
    M('1A1', 'Flight Engineer', 'aviation', { pilot: true }),
    M('1C1', 'Air Traffic Control', 'aviation', { exposure: 0.3, minSmarts: 55 }),
    M('1N0', 'All-Source Intelligence Analyst', 'intel'),
    M('1B4', 'Cyber Warfare Operations', 'cyber', { grants: ['securityPlus'], skill: { credentials: ['cissp'], grade: 3 }, civilian: 'tech' }),
    M('2T1', 'Vehicle Operations', 'logistics', { grants: ['cdlA'], skill: { credentials: ['cdlA'], grade: 2 }, civilian: 'trucking' }),
    M('2S0', 'Materiel Management', 'logistics'),
    M('5J0', 'Paralegal', 'legal', { civilian: 'legalSupport' }),
  ],
  officer: [
    M('11F', 'Fighter Pilot', 'aviation', { exposure: 1.1, pilot: true, minSmarts: 60, minFitness: 50, grants: ['commercialPilot', 'instrumentRating'], civilian: 'aviation' }),
    M('11M', 'Mobility Pilot (Airlift/Tanker)', 'aviation', { exposure: 0.6, pilot: true, minSmarts: 55, grants: ['commercialPilot', 'instrumentRating'], civilian: 'aviation' }),
    M('13N', 'Nuclear and Missile Operations', 'intel', { exposure: 0.2 }),
    M('14N', 'Intelligence Officer', 'intel'),
    M('17D', 'Cyberspace Operations Officer', 'cyber'),
    M('17S', 'Cyber Direct Commission', 'cyber', { direct: 'cyber' }),
    M('32E', 'Civil Engineer', 'engineer', { civilian: 'engineering' }),
    M('21R', 'Logistics Readiness Officer', 'logistics'),
    M('31P', 'Security Forces Officer', 'infantry', { exposure: 0.9 }),
    M('51J', 'Judge Advocate', 'legal', { direct: 'jag', civilian: 'law' }),
    M('44M', 'Internist / Physician', 'medical', { direct: 'medical', civilian: 'medical' }),
    M('46N', 'Clinical Nurse', 'medical', { direct: 'nurse', civilian: 'nursing' }),
    M('43P', 'Pharmacist', 'medical', { direct: 'pharmacy', exposure: 0.3, civilian: 'pharmacy' }),
    M('52R', 'Chaplain', 'chaplain', { direct: 'chaplain', civilian: 'clergy' }),
  ],
};

const COASTGUARD = {
  enlisted: [
    M('BM', 'Boatswain\'s Mate', 'infantry', { exposure: 0.8, grants: ['boatCrew', 'coxswain'], civilian: 'merchantMarine' }),
    M('ME', 'Maritime Enforcement Specialist', 'infantry', { exposure: 1.1, civilian: 'police' }),
    M('AST', 'Aviation Survival Technician (Rescue Swimmer)', 'aviation', { exposure: 1.3, minFitness: 70, selection: 0.4, grants: ['emt'] }),
    M('AMT', 'Aviation Maintenance Technician', 'aviation', { exposure: 0.6, civilian: 'aviation' }),
    M('HS', 'Health Services Technician', 'medic', { grants: ['emt'], civilian: 'ems' }),
    M('DC', 'Damage Controlman', 'engineer', { grants: ['ff1', 'hazmatOps'], civilian: 'fire' }),
    M('MK', 'Machinery Technician', 'engineer', { civilian: 'merchantMarine' }),
    M('IS', 'Intelligence Specialist', 'intel'),
    M('CMS', 'Cyber Mission Specialist', 'cyber', { civilian: 'tech' }),
    M('SK', 'Storekeeper', 'logistics'),
  ],
  officer: [
    M('DECK', 'Cutterman (Deck Watch Officer)', 'logistics', { exposure: 0.8, civilian: 'merchantMarine' }),
    M('AVI', 'Coast Guard Aviator', 'aviation', { pilot: true, minSmarts: 55, grants: ['commercialPilot', 'instrumentRating'], civilian: 'aviation' }),
    M('RESP', 'Response Officer (Law Enforcement)', 'infantry', { exposure: 1.0 }),
    M('INTEL', 'Intelligence Officer', 'intel'),
    M('ENG', 'Naval Engineer', 'engineer'),
    M('JAG', 'Judge Advocate', 'legal', { direct: 'jag', civilian: 'law' }),
  ],
};

const RAW = { army: ARMY, guard: ARMY, marines: MARINES, navy: NAVY, airforce: AIRFORCE, coastguard: COASTGUARD };

/** Flat lookup: 'army.68W' → MOS entry (with id, branch, track). */
export const MOS = {};
for (const [branch, tracks] of Object.entries(RAW)) {
  for (const [track, list] of Object.entries(tracks)) {
    for (const m of list) {
      const id = `${branch}.${m.code}`;
      MOS[id] = { ...m, id, branch, track };
    }
  }
}

export const mosFor = (branch, track) => Object.values(MOS).filter((m) => m.branch === branch && m.track === track);
export const mosOf = (svc) => (svc?.mos ? MOS[svc.mos] ?? null : null);

/** The first job in a broad specialty — used for old saves and specialty-only requests. */
export function defaultMos(branch, track, specialty) {
  const list = mosFor(branch, track).filter((m) => !m.direct && !m.selection);
  return list.find((m) => m.specialty === specialty) ?? null;
}

/* ------------------------------------------------------------------ */
/* Direct commissions: professionals enter at a rank that reflects     */
/* their civilian experience (constructive service credit).            */
/* ------------------------------------------------------------------ */

/** grade(state) returns a 0-based officer grade (O-1 = 0) or null if not qualified. */
export const DIRECT_COMMISSIONS = {
  jag: {
    name: 'Judge Advocate General\'s Corps', school: 'the Direct Commission Course and JAG School', maxAge: 42,
    needs: 'A law degree and an active bar license',
    grade(state) {
      if (!hasCredential(state, 'barLicense')) return null;
      const yrs = yearsInProfession(state, ['law']);
      return yrs >= 4 ? 2 : 1;
    },
  },
  medical: {
    name: 'Medical Corps', school: 'the Direct Commission Course and Officer Basic', maxAge: 42,
    needs: 'An MD and a state medical license',
    grade(state) {
      if (!hasCredential(state, 'medicalLicense')) return null;
      if (!hasCredential(state, 'boardCertified')) return 2;
      return yearsInProfession(state, ['medical']) >= 10 ? 4 : 3;
    },
    bonus: 120000,
  },
  nurse: {
    name: 'Nurse Corps', school: 'the Direct Commission Course and Officer Basic', maxAge: 42,
    needs: 'A BSN and an RN license',
    grade(state) {
      if (!hasCredential(state, 'rn') || !meetsEducation(state, { level: 'bachelor' })) return null;
      if (hasCredential(state, 'np')) return 2;
      return yearsInProfession(state, ['nursing']) >= 3 ? 1 : 0;
    },
    bonus: 30000,
  },
  pharmacy: {
    name: 'Medical Service Corps (Pharmacy)', school: 'the Direct Commission Course', maxAge: 42,
    needs: 'A Pharm.D. and a pharmacist license',
    grade(state) {
      if (!hasCredential(state, 'pharmacistLicense')) return null;
      return yearsInProfession(state, ['pharmacy']) >= 5 ? 2 : 1;
    },
  },
  chaplain: {
    name: 'Chaplain Corps', school: 'the Chaplain Basic Officer Leader Course', maxAge: 42,
    needs: 'A Master of Divinity and two years of ordained ministry',
    grade(state) {
      if (!state.education.degrees.some((d) => d.programId === 'seminary')) return null;
      const yrs = yearsInProfession(state, ['clergy', 'catholicClergy']);
      if (yrs < 2) return null;
      return yrs >= 8 ? 2 : 1;
    },
  },
  cyber: {
    name: 'Cyber Direct Commission', school: 'the Direct Commission Course and Cyber School', maxAge: 39,
    needs: 'Four years in tech and a security certification (Security+, CISSP or cloud)',
    grade(state) {
      const yrs = yearsInProfession(state, ['tech']);
      const cert = ['cissp', 'securityPlus', 'awsCert'].some((c) => hasCredential(state, c));
      if (yrs < 4 || !cert) return null;
      return yrs >= 10 && hasCredential(state, 'cissp') ? 3 : yrs >= 7 ? 2 : 1;
    },
  },
};

export function directGrade(state, mos) {
  return mos?.direct ? DIRECT_COMMISSIONS[mos.direct].grade(state) : null;
}

/** Starting enlisted grade from education and civilian credentials (0-based; E-1 = 0). */
export function enlistedStartGrade(state, branch, mos) {
  let grade = 0;
  if (meetsEducation(state, { level: 'bachelor' })) grade = branch === 'army' || branch === 'guard' ? 3 : 2;
  else if (meetsEducation(state, { level: 'associate' })) grade = 2;
  const skill = mos?.skill;
  if (skill && skill.credentials.some((c) => hasCredential(state, c))) grade = Math.max(grade, skill.grade);
  return grade;
}

/** Can this person take this job? Returns { ok, reason }. */
export function mosEligibility(state, mos, { smartsFloor = 0 } = {}) {
  const smarts = Math.max(mos.minSmarts ?? 0, smartsFloor);
  if (smarts && state.stats.smarts < smarts) return { ok: false, reason: `Needs ${smarts}+ smarts` };
  if (mos.minFitness && state.stats.fitness < mos.minFitness) return { ok: false, reason: `Needs ${mos.minFitness}+ fitness` };
  if (mos.direct) {
    const dc = DIRECT_COMMISSIONS[mos.direct];
    if (state.character.age > dc.maxAge) return { ok: false, reason: `Direct commissions: age ${dc.maxAge} or under` };
    if (directGrade(state, mos) == null) return { ok: false, reason: dc.needs };
  } else if (mos.track === 'officer' && state.character.age > 39) {
    return { ok: false, reason: 'Officers: age 19–39' };
  }
  return { ok: true };
}

/** Is anyone over 39 eligible for some direct commission in this branch? */
export function hasDirectPath(state, branch) {
  return mosFor(branch, 'officer').some((m) => m.direct && mosEligibility(state, m).ok);
}

/** The closest job in another branch or track (same corps, else same specialty). */
export function equivalentMos(svc, branch, track = svc.track) {
  const old = mosOf(svc);
  const list = mosFor(branch, track);
  return (old && list.find((m) => m.title === old.title))
    ?? (old?.direct && list.find((m) => m.direct === old.direct))
    ?? list.find((m) => m.specialty === svc.specialty && !m.direct && !m.selection)
    ?? null;
}
