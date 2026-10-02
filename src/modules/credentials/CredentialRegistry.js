/**
 * The single registry of every license, certification, endorsement and
 * internal (employer) credential in the game. Careers, volunteer services,
 * the military and the UI all reference these ids — nothing defines its own
 * copy — so an EMT card earned volunteering counts for a paramedic career,
 * and a DUI suspends the same driver's license a trucking job requires.
 *
 * Credential fields:
 *   kind:       'license' | 'certification' | 'endorsement' | 'internal'
 *   requires:   requirement object (see LicensingEngine.checkRequirements)
 *   cost:       course + exam fees (paid by a sponsor's training budget when possible)
 *   trainingYears: 0 = exam this year; >0 = enrolled in training first
 *   exam:       { stat, difficulty 0–1 }
 *   renewYears / renewCost: continuing-education renewal cycle
 *   implies:    credentials this one also satisfies
 *   sponsors:   { professions: [...], services: [...], anyEmployer: bool }
 *   sponsoredOnly: cannot be self-funded (e.g. FINRA exams, police academy)
 *   academy:    professions whose employers run this as a funded academy for
 *               their own hires (outside the discretionary training budget)
 *   revokeOn:   offense severities/ids that revoke it
 *   suspendOn:  { offenseId: years } temporary suspensions
 */

const D = (stat, difficulty) => ({ stat, difficulty });

export const CATEGORIES = {
  driving: { name: 'Driving', icon: '🚗' },
  aviation: { name: 'Aviation', icon: '✈️' },
  health: { name: 'Healthcare & EMS', icon: '🩺' },
  publicSafety: { name: 'Fire & Law Enforcement', icon: '🚒' },
  rescue: { name: 'Search & Rescue', icon: '🧗' },
  professional: { name: 'Professional Licenses', icon: '⚖️' },
  trades: { name: 'Trades', icon: '🔧' },
  corporate: { name: 'Corporate & Internal', icon: '🏢' },
  government: { name: 'Government', icon: '🏛️' },
};

export const CREDENTIALS = {
  /* ---------------- Driving ---------------- */
  learnerPermit: { name: "Learner's Permit", icon: '🚦', category: 'driving', kind: 'license', requires: { age: 15 }, cost: 40, exam: D('smarts', 0.05), suspendOn: { dui: 1 } },
  driverLicense: { name: "Driver's License (Class D)", icon: '🚗', category: 'driving', kind: 'license', requires: { age: 16, credentials: ['learnerPermit'] }, cost: 60, exam: D('smarts', 0.1), renewYears: 8, renewCost: 40, implies: ['learnerPermit'], suspendOn: { dui: 1, reckless: 1 } },
  motorcycle: { name: 'Motorcycle Endorsement', icon: '🏍️', category: 'driving', kind: 'endorsement', requires: { age: 16, credentials: ['driverLicense'] }, cost: 180, exam: D('fitness', 0.15), suspendOn: { dui: 1 } },
  cdlA: { name: 'Commercial Driver License (Class A)', icon: '🚛', category: 'driving', kind: 'license', requires: { age: 21, credentials: ['driverLicense'] }, cost: 5500, exam: D('smarts', 0.2), renewYears: 5, renewCost: 120, academy: ['trucking'], sponsors: { professions: ['trucking'] }, suspendOn: { dui: 1, reckless: 1 } },
  hazmatEndorsement: { name: 'HazMat Endorsement (H)', icon: '☣️', category: 'driving', kind: 'endorsement', requires: { credentials: ['cdlA'], noFelony: true }, cost: 300, exam: D('smarts', 0.2), sponsors: { professions: ['trucking'] }, revokeOn: ['felony'] },

  /* ---------------- Aviation ---------------- */
  studentPilot: { name: 'Student Pilot Certificate', icon: '🛩️', category: 'aviation', kind: 'certification', requires: { age: 16 }, cost: 175, exam: D('health', 0.05), suspendOn: { dui: 1 } },
  privatePilot: { name: 'Private Pilot (PPL)', icon: '🛩️', category: 'aviation', kind: 'license', requires: { age: 17, credentials: ['studentPilot'], flightHours: 40 }, cost: 1500, exam: D('smarts', 0.25), implies: ['studentPilot'], suspendOn: { dui: 1 } },
  instrumentRating: { name: 'Instrument Rating (IFR)', icon: '🌫️', category: 'aviation', kind: 'endorsement', requires: { credentials: ['privatePilot'], flightHours: 100 }, cost: 1200, exam: D('smarts', 0.3) },
  commercialPilot: { name: 'Commercial Pilot (CPL)', icon: '✈️', category: 'aviation', kind: 'license', requires: { age: 18, credentials: ['instrumentRating'], flightHours: 250 }, cost: 1500, exam: D('smarts', 0.3), implies: ['privatePilot'], suspendOn: { dui: 2 } },
  cfi: { name: 'Certified Flight Instructor (CFI)', icon: '🧑‍✈️', category: 'aviation', kind: 'certification', requires: { credentials: ['commercialPilot'] }, cost: 1500, exam: D('smarts', 0.3), renewYears: 2, renewCost: 150 },
  atp: { name: 'Airline Transport Pilot (ATP)', icon: '🛫', category: 'aviation', kind: 'license', requires: { age: 23, credentials: ['commercialPilot'], flightHours: 1500 }, cost: 6000, exam: D('smarts', 0.35), implies: ['commercialPilot'], sponsors: { professions: ['aviation'] }, suspendOn: { dui: 3 }, revokeOn: ['felony'] },

  /* ---------------- Healthcare & EMS ---------------- */
  cna: { name: 'Certified Nursing Assistant (CNA)', icon: '🧑‍⚕️', category: 'health', kind: 'certification', requires: { age: 18 }, cost: 1500, exam: D('smarts', 0.1), renewYears: 2, renewCost: 50, academy: ['nursing'], sponsors: { professions: ['nursing'] }, revokeOn: ['felony'] },
  emt: { name: 'EMT (NREMT)', icon: '🚑', category: 'health', kind: 'certification', requires: { age: 18 }, cost: 1400, exam: D('smarts', 0.2), renewYears: 2, renewCost: 200, academy: ['fire', 'ems'], sponsors: { professions: ['fire', 'ems'], services: ['fire'] }, revokeOn: ['felony'] },
  paramedic: { name: 'Paramedic (NRP)', icon: '💉', category: 'health', kind: 'certification', requires: { credentials: ['emt'] }, trainingYears: 1, cost: 12000, exam: D('smarts', 0.35), renewYears: 2, renewCost: 350, implies: ['emt'], academy: ['ems'], sponsors: { professions: ['ems', 'fire'] }, revokeOn: ['felony'] },
  rn: { name: 'Registered Nurse (RN)', icon: '🩺', category: 'health', kind: 'license', requires: { education: { level: 'associate', majors: ['nursing'] } }, cost: 400, exam: D('smarts', 0.3), renewYears: 2, renewCost: 150, implies: ['cna'], sponsors: { professions: ['nursing'] }, revokeOn: ['felony'] },
  np: { name: 'Nurse Practitioner (APRN)', icon: '👩‍⚕️', category: 'health', kind: 'license', requires: { credentials: ['rn'], education: { level: 'master', majors: ['nursing'] } }, cost: 600, exam: D('smarts', 0.3), renewYears: 2, renewCost: 250, implies: ['rn'], sponsors: { professions: ['nursing'] }, revokeOn: ['felony'] },
  medicalLicense: { name: 'Medical License (MD)', icon: '⚕️', category: 'health', kind: 'license', requires: { education: { program: 'md' }, experience: { professions: ['medical'], years: 1 }, noFelony: true }, cost: 3000, exam: D('smarts', 0.35), renewYears: 2, renewCost: 500, sponsors: { professions: ['medical'] }, revokeOn: ['felony', 'prescriptionFraud'] },
  boardCertified: { name: 'Board Certification', icon: '🏅', category: 'health', kind: 'certification', requires: { credentials: ['medicalLicense'], experience: { professions: ['medical'], years: 3 } }, cost: 2500, exam: D('smarts', 0.4), renewYears: 10, renewCost: 1500, sponsors: { professions: ['medical'] }, revokeOn: ['felony', 'prescriptionFraud'] },

  /* ---------------- Fire & law enforcement ---------------- */
  ff1: { name: 'Firefighter I', icon: '🧑‍🚒', category: 'publicSafety', kind: 'certification', requires: { age: 16 }, cost: 900, exam: D('fitness', 0.15), academy: ['fire'], sponsors: { professions: ['fire'], services: ['fire'] } },
  ff2: { name: 'Firefighter II', icon: '🔥', category: 'publicSafety', kind: 'certification', requires: { credentials: ['ff1'] }, cost: 900, exam: D('fitness', 0.2), implies: ['ff1'], academy: ['fire'], sponsors: { professions: ['fire'], services: ['fire'] } },
  hazmatOps: { name: 'HazMat Operations', icon: '☣️', category: 'publicSafety', kind: 'certification', requires: { age: 18 }, cost: 300, exam: D('smarts', 0.15), sponsors: { professions: ['fire', 'ems', 'police', 'publicWorks'], services: ['fire'] } },
  driverOperator: { name: 'Driver/Operator (Pumper)', icon: '🚒', category: 'publicSafety', kind: 'certification', requires: { credentials: ['ff2', 'driverLicense'] }, cost: 600, exam: D('smarts', 0.2), sponsors: { professions: ['fire'], services: ['fire'] }, suspendOn: { dui: 1 } },
  fireOfficer1: { name: 'Fire Officer I', icon: '🎖️', category: 'publicSafety', kind: 'certification', requires: { credentials: ['driverOperator'] }, cost: 800, exam: D('smarts', 0.25), sponsors: { professions: ['fire'], services: ['fire'] } },
  fireOfficer2: { name: 'Fire Officer II', icon: '⭐', category: 'publicSafety', kind: 'certification', requires: { credentials: ['fireOfficer1'] }, cost: 900, exam: D('smarts', 0.3), implies: ['fireOfficer1'], sponsors: { professions: ['fire'], services: ['fire'] } },
  fireInspector: { name: 'Fire Inspector I', icon: '🔎', category: 'publicSafety', kind: 'certification', requires: { credentials: ['ff2'] }, cost: 500, exam: D('smarts', 0.25), sponsors: { professions: ['fire', 'publicWorks'] } },
  postReserve: { name: 'Reserve Peace Officer (POST Level II)', icon: '🎓', category: 'publicSafety', kind: 'certification', requires: { age: 21, noFelony: true }, cost: 1200, exam: D('smarts', 0.25), sponsors: { professions: ['police'], services: ['police'] }, revokeOn: ['felony', 'excessiveForce'] },
  post: { name: 'Peace Officer (POST Basic Academy)', icon: '🚓', category: 'publicSafety', kind: 'license', requires: { age: 21, noFelony: true, credentials: ['driverLicense'] }, trainingYears: 1, cost: 9000, exam: D('fitness', 0.2), implies: ['postReserve'], sponsoredOnly: true, academy: ['police'], sponsors: { professions: ['police'] }, revokeOn: ['felony', 'excessiveForce'] },
  fto: { name: 'Field Training Officer Program', icon: '🚔', category: 'publicSafety', kind: 'certification', requires: { credentials: ['postReserve'] }, cost: 300, exam: D('smarts', 0.2), sponsors: { professions: ['police'], services: ['police'] } },
  cit: { name: 'Crisis Intervention Team (CIT)', icon: '🧠', category: 'publicSafety', kind: 'certification', requires: { credentials: ['postReserve'] }, cost: 200, exam: D('smarts', 0.15), sponsors: { professions: ['police', 'ems'], services: ['police'] } },
  trafficEnforcement: { name: 'Traffic Enforcement & DUI', icon: '🚦', category: 'publicSafety', kind: 'certification', requires: { credentials: ['postReserve'] }, cost: 150, exam: D('smarts', 0.15), sponsors: { professions: ['police'], services: ['police'] } },
  firearmsInstructor: { name: 'Firearms Instructor', icon: '🎯', category: 'publicSafety', kind: 'certification', requires: { credentials: ['fto'] }, cost: 400, exam: D('fitness', 0.25), sponsors: { professions: ['police', 'oig', 'parkService'], services: ['police'] } },
  supervisorCourse: { name: 'Law Enforcement Supervisory Course', icon: '📋', category: 'publicSafety', kind: 'certification', requires: { credentials: ['fto'] }, cost: 300, exam: D('smarts', 0.2), sponsors: { professions: ['police'], services: ['police'] } },
  commandCollege: { name: 'Command College', icon: '⭐', category: 'publicSafety', kind: 'certification', requires: { credentials: ['supervisorCourse'], education: { level: 'bachelor' } }, cost: 900, exam: D('smarts', 0.3), sponsors: { professions: ['police'], services: ['police'] } },
  fletc: { name: 'Federal Law Enforcement Training (FLETC)', icon: '🦅', category: 'government', kind: 'certification', requires: { age: 21, noFelony: true }, cost: 15000, exam: D('fitness', 0.25), implies: ['postReserve'], sponsoredOnly: true, academy: ['oig', 'parkService'], sponsors: { professions: ['oig', 'parkService'] }, revokeOn: ['felony'] },

  /* ---------------- Search & rescue ---------------- */
  wfr: { name: 'Wilderness First Responder', icon: '🩹', category: 'rescue', kind: 'certification', requires: { age: 16 }, cost: 700, exam: D('smarts', 0.15), renewYears: 3, renewCost: 250, sponsors: { services: ['sar'], professions: ['parkService'] } },
  landNav: { name: 'Land Navigation', icon: '🧭', category: 'rescue', kind: 'certification', requires: { age: 16 }, cost: 150, exam: D('smarts', 0.15), sponsors: { services: ['sar'], professions: ['parkService'] } },
  ropeRescue: { name: 'Rope Rescue Technician', icon: '🪢', category: 'rescue', kind: 'certification', requires: { credentials: ['landNav'] }, cost: 600, exam: D('fitness', 0.25), sponsors: { services: ['sar', 'fire'], professions: ['fire', 'parkService'] } },
  swiftwater: { name: 'Swiftwater Rescue Technician', icon: '🌊', category: 'rescue', kind: 'certification', requires: { age: 18 }, cost: 500, exam: D('fitness', 0.25), sponsors: { services: ['sar', 'fire'], professions: ['fire', 'parkService'] } },
  k9Handler: { name: 'K9 Handler', icon: '🐕', category: 'rescue', kind: 'certification', requires: { credentials: ['landNav'] }, cost: 2500, exam: D('smarts', 0.2), sponsors: { services: ['sar'] }, onEarn: 'k9' },
  avalanche: { name: 'Avalanche Rescue', icon: '🏔️', category: 'rescue', kind: 'certification', requires: { credentials: ['ropeRescue'] }, cost: 450, exam: D('fitness', 0.25), sponsors: { services: ['sar'], professions: ['parkService'] } },
  ics300: { name: 'Incident Command (ICS-300)', icon: '📡', category: 'rescue', kind: 'certification', requires: { age: 18 }, cost: 200, exam: D('smarts', 0.15), sponsors: { services: ['sar', 'fire'], professions: ['fire', 'ems', 'police', 'municipalAdmin', 'publicWorks', 'parkService'] } },

  /* ---------------- Professional licenses ---------------- */
  barLicense: { name: 'State Bar License', icon: '⚖️', category: 'professional', kind: 'license', requires: { education: { program: 'jd' }, noFelony: true }, cost: 2000, exam: D('smarts', 0.45), renewYears: 3, renewCost: 450, sponsors: { professions: ['law'] }, revokeOn: ['felony'] },
  paralegalCP: { name: 'Certified Paralegal (CP)', icon: '📑', category: 'professional', kind: 'certification', requires: { education: { anyOf: [{ program: 'paralegal' }, { level: 'bachelor' }] } }, cost: 300, exam: D('smarts', 0.2), renewYears: 5, renewCost: 100, sponsors: { professions: ['legalSupport'] } },
  cpa: { name: 'Certified Public Accountant (CPA)', icon: '🧮', category: 'professional', kind: 'license', requires: { education: { anyOf: [{ level: 'bachelor', majors: ['accounting', 'business', 'economics'] }, { program: 'msAccounting' }] }, noFelony: true }, cost: 3500, exam: D('smarts', 0.5), renewYears: 3, renewCost: 400, sponsors: { professions: ['accounting', 'oig'] }, revokeOn: ['felony'] },
  fe: { name: 'Engineer in Training (FE exam)', icon: '📐', category: 'professional', kind: 'certification', requires: { education: { level: 'bachelor', majors: ['engineering'] } }, cost: 225, exam: D('smarts', 0.35), sponsors: { professions: ['engineering', 'publicWorks'] } },
  pe: { name: 'Professional Engineer (PE)', icon: '🏗️', category: 'professional', kind: 'license', requires: { credentials: ['fe'], experience: { professions: ['engineering', 'publicWorks'], years: 4 } }, cost: 400, exam: D('smarts', 0.45), renewYears: 2, renewCost: 200, implies: ['fe'], sponsors: { professions: ['engineering', 'publicWorks'] }, revokeOn: ['felony', 'falsifiedInspection'] },
  teachingCert: { name: 'State Teaching Certificate', icon: '🍎', category: 'professional', kind: 'license', requires: { education: { anyOf: [{ level: 'bachelor', majors: ['education'] }, { program: 'teacherPrep' }] }, noFelony: true }, cost: 300, exam: D('smarts', 0.25), renewYears: 5, renewCost: 150, sponsors: { professions: ['education'] }, revokeOn: ['felony'] },
  realEstate: { name: 'Real Estate Salesperson License', icon: '🏠', category: 'professional', kind: 'license', requires: { age: 18 }, cost: 900, exam: D('smarts', 0.2), renewYears: 2, renewCost: 150, revokeOn: ['felony'] },
  brokerLicense: { name: 'Real Estate Broker License', icon: '🏘️', category: 'professional', kind: 'license', requires: { credentials: ['realEstate'], experience: { professions: ['realestate'], years: 3 } }, cost: 1200, exam: D('smarts', 0.3), renewYears: 2, renewCost: 200, implies: ['realEstate'], revokeOn: ['felony'] },

  /* ---------------- Trades ---------------- */
  journeymanElectrician: { name: 'Journeyman Electrician License', icon: '⚡', category: 'trades', kind: 'license', requires: { anyOf: [{ experience: { professions: ['trades'], years: 4 } }, { education: { program: 'electricalTech' }, experience: { professions: ['trades'], years: 2 } }] }, cost: 250, exam: D('smarts', 0.3), renewYears: 3, renewCost: 100, sponsors: { professions: ['trades'] } },
  masterElectrician: { name: 'Master Electrician License', icon: '🔌', category: 'trades', kind: 'license', requires: { credentials: ['journeymanElectrician'], experience: { professions: ['trades'], years: 6 } }, cost: 400, exam: D('smarts', 0.4), renewYears: 3, renewCost: 150, implies: ['journeymanElectrician'], sponsors: { professions: ['trades'] } },
  oshaSafety: { name: 'OSHA 30 Construction Safety', icon: '🦺', category: 'trades', kind: 'certification', requires: { age: 18 }, cost: 200, exam: D('smarts', 0.05), sponsors: { professions: ['trades', 'publicWorks', 'engineering'] } },

  /* ---------------- Corporate & internal ---------------- */
  series7: { name: 'FINRA Series 7', icon: '📈', category: 'corporate', kind: 'license', requires: { age: 18 }, cost: 300, exam: D('smarts', 0.35), sponsoredOnly: true, sponsors: { professions: ['finance'] }, revokeOn: ['felony', 'insiderTrading'] },
  series66: { name: 'FINRA Series 66', icon: '📊', category: 'corporate', kind: 'license', requires: { credentials: ['series7'] }, cost: 200, exam: D('smarts', 0.3), sponsoredOnly: true, sponsors: { professions: ['finance'] }, revokeOn: ['felony', 'insiderTrading'] },
  pmp: { name: 'Project Management Professional (PMP)', icon: '📋', category: 'corporate', kind: 'certification', requires: { workYears: 3 }, cost: 900, exam: D('smarts', 0.3), renewYears: 3, renewCost: 150, sponsors: { anyEmployer: true } },
  sixSigmaGreen: { name: 'Lean Six Sigma Green Belt', icon: '🟩', category: 'corporate', kind: 'internal', requires: { workYears: 1 }, cost: 2000, exam: D('smarts', 0.2), sponsoredOnly: true, sponsors: { anyEmployer: true } },
  sixSigmaBlack: { name: 'Lean Six Sigma Black Belt', icon: '⬛', category: 'corporate', kind: 'internal', requires: { credentials: ['sixSigmaGreen'], workYears: 3 }, cost: 4500, exam: D('smarts', 0.3), sponsoredOnly: true, implies: ['sixSigmaGreen'], sponsors: { anyEmployer: true } },
  leadershipProgram: { name: 'Leadership Development Program', icon: '🧭', category: 'corporate', kind: 'internal', requires: { tenure: 2 }, cost: 6000, exam: D('smarts', 0.1), sponsoredOnly: true, sponsors: { anyEmployer: true } },
  awsCert: { name: 'Cloud Architect Certification', icon: '☁️', category: 'corporate', kind: 'certification', requires: { age: 18 }, cost: 300, exam: D('smarts', 0.3), renewYears: 3, renewCost: 150, sponsors: { professions: ['tech', 'intelligence'] } },
  cissp: { name: 'CISSP (Information Security)', icon: '🔐', category: 'corporate', kind: 'certification', requires: { experience: { professions: ['tech', 'intelligence', 'oig'], years: 5 } }, cost: 750, exam: D('smarts', 0.45), renewYears: 3, renewCost: 125, sponsors: { professions: ['tech', 'intelligence', 'oig'] }, revokeOn: ['felony'] },

  /* ---------------- Government ---------------- */
  languageProficiency: { name: 'Foreign Language Proficiency (FSI 3/3)', icon: '🗣️', category: 'government', kind: 'internal', requires: { age: 18 }, trainingYears: 1, cost: 20000, exam: D('smarts', 0.35), sponsoredOnly: true, academy: ['foreignService', 'intelligence'], sponsors: { professions: ['foreignService', 'intelligence'] } },
  cgfm: { name: 'Certified Government Financial Manager', icon: '🏛️', category: 'government', kind: 'certification', requires: { education: { level: 'bachelor' }, workYears: 2 }, cost: 600, exam: D('smarts', 0.3), renewYears: 3, renewCost: 100, sponsors: { professions: ['municipalAdmin', 'oig', 'regulatory'] } },
  aicp: { name: 'Certified Planner (AICP)', icon: '🗺️', category: 'government', kind: 'certification', requires: { education: { level: 'bachelor' }, experience: { professions: ['planning'], years: 2 } }, cost: 700, exam: D('smarts', 0.35), renewYears: 2, renewCost: 150, sponsors: { professions: ['planning'] } },
  buildingInspector: { name: 'ICC Building Inspector', icon: '🏚️', category: 'government', kind: 'certification', requires: { age: 18 }, cost: 450, exam: D('smarts', 0.25), renewYears: 3, renewCost: 120, sponsors: { professions: ['publicWorks'] }, revokeOn: ['felony', 'falsifiedInspection'] },
};

export const CREDENTIAL_LIST = Object.entries(CREDENTIALS).map(([id, c]) => ({ id, ...c }));

export function getCredential(id) {
  const c = CREDENTIALS[id];
  if (!c) throw new Error(`Unknown credential: ${id}`);
  return { id, ...c };
}

export const credentialName = (id) => CREDENTIALS[id]?.name ?? id;

/** Flight time: renting an aircraft builds hours toward pilot ratings. */
export const FLIGHT_BLOCK = { hours: 50, cost: 9000 };
