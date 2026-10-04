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
 *   valuedBy:   professions whose hiring managers value it
 *   jurisdiction / reciprocity: derived below from STATE_ISSUED — state-issued
 *               credentials are valid only in the states that issued them
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
  hospitality: { name: 'Food, Hospitality & Service', icon: '🍽️' },
  maritime: { name: 'Maritime', icon: '⚓' },
};

export const CREDENTIALS = {
  /* ---------------- Driving ---------------- */
  learnerPermit: { name: "Learner's Permit", icon: '🚦', category: 'driving', kind: 'license', requires: { age: 15 }, cost: 40, exam: D('smarts', 0.3), suspendOn: { dui: 1 } },
  driverLicense: { name: "Driver's License (Class D)", icon: '🚗', category: 'driving', kind: 'license', requires: { age: 16, credentials: ['learnerPermit'] }, cost: 60, exam: D('smarts', 0.35), renewYears: 8, renewCost: 40, implies: ['learnerPermit'], suspendOn: { dui: 1, reckless: 1 } },
  motorcycle: { name: 'Motorcycle Endorsement', icon: '🏍️', category: 'driving', kind: 'endorsement', requires: { age: 16, credentials: ['driverLicense'] }, cost: 350, exam: D('fitness', 0.15), suspendOn: { dui: 1 } },
  cdlA: { name: 'Commercial Driver License (Class A)', icon: '🚛', category: 'driving', kind: 'license', requires: { health: 45, age: 21, credentials: ['driverLicense'] }, cost: 6500, exam: D('smarts', 0.35), renewYears: 5, renewCost: 120, academy: ['trucking'], sponsors: { professions: ['trucking'] }, suspendOn: { dui: 1, reckless: 1 } },
  hazmatEndorsement: { name: 'HazMat Endorsement (H)', icon: '☣️', category: 'driving', kind: 'endorsement', requires: { credentials: ['cdlA'], noFelony: true }, cost: 400, exam: D('smarts', 0.2), sponsors: { professions: ['trucking'] }, revokeOn: ['felony'] },

  /* ---------------- Aviation ---------------- */
  studentPilot: { name: 'Student Pilot Certificate', icon: '🛩️', category: 'aviation', kind: 'certification', requires: { health: 55, age: 16 }, cost: 175, exam: D('health', 0.05), suspendOn: { dui: 1 } },
  privatePilot: { name: 'Private Pilot (PPL)', icon: '🛩️', category: 'aviation', kind: 'license', requires: { age: 17, credentials: ['studentPilot'], flightHours: 40 }, cost: 1500, exam: D('smarts', 0.25), implies: ['studentPilot'], suspendOn: { dui: 1 } },
  instrumentRating: { name: 'Instrument Rating (IFR)', icon: '🌫️', category: 'aviation', kind: 'endorsement', requires: { credentials: ['privatePilot'], flightHours: 100 }, cost: 1200, exam: D('smarts', 0.3) },
  commercialPilot: { name: 'Commercial Pilot (CPL)', icon: '✈️', category: 'aviation', kind: 'license', requires: { health: 60, age: 18, credentials: ['instrumentRating'], flightHours: 250 }, cost: 1500, exam: D('smarts', 0.3), implies: ['privatePilot'], suspendOn: { dui: 2 } },
  cfi: { name: 'Certified Flight Instructor (CFI)', icon: '🧑‍✈️', category: 'aviation', kind: 'certification', requires: { credentials: ['commercialPilot'] }, cost: 1500, exam: D('smarts', 0.3), renewYears: 2, renewCost: 150 },
  atp: { name: 'Airline Transport Pilot (ATP)', icon: '🛫', category: 'aviation', kind: 'license', requires: { health: 65, age: 23, credentials: ['commercialPilot'], flightHours: 1500 }, cost: 6000, exam: D('smarts', 0.35), implies: ['commercialPilot'], sponsors: { professions: ['aviation'] }, suspendOn: { dui: 3 }, revokeOn: ['felony'] },

  /* ---------------- Healthcare & EMS ---------------- */
  cna: { name: 'Certified Nursing Assistant (CNA)', icon: '🧑‍⚕️', category: 'health', kind: 'certification', requires: { age: 18 }, cost: 1600, exam: D('smarts', 0.1), renewYears: 2, renewCost: 50, academy: ['nursing'], sponsors: { professions: ['nursing'] }, revokeOn: ['felony'] },
  emr: { name: 'Emergency Medical Responder (EMR)', icon: '🩹', category: 'health', kind: 'certification', requires: { age: 16 }, cost: 900, exam: D('smarts', 0.15), renewYears: 2, renewCost: 80, sponsors: { services: ['ambulance', 'auxiliary', 'cert', 'redcross', 'skiPatrol', 'cap'], professions: ['ems', 'fire', 'police'] } },
  evoc: { name: 'Emergency Vehicle Operations (EVOC)', icon: '🚨', category: 'publicSafety', kind: 'certification', requires: { age: 18, credentials: ['driverLicense'] }, cost: 800, exam: D('smarts', 0.15), sponsors: { services: ['ambulance', 'fire', 'wildland'], professions: ['ems', 'fire', 'police'] }, suspendOn: { dui: 2 } },
  emt: { name: 'EMT (NREMT)', icon: '🚑', category: 'health', kind: 'certification', requires: { age: 18 }, cost: 1800, exam: D('smarts', 0.27), renewYears: 2, renewCost: 200, academy: ['fire', 'ems'], sponsors: { professions: ['fire', 'ems'], services: ['fire', 'ambulance'] }, revokeOn: ['felony'] },
  paramedic: { name: 'Paramedic (NRP)', icon: '💉', category: 'health', kind: 'certification', requires: { credentials: ['emt'] }, trainingYears: 1, cost: 12000, exam: D('smarts', 0.3), renewYears: 2, renewCost: 350, implies: ['emt'], academy: ['ems'], sponsors: { professions: ['ems', 'fire'], services: ['ambulance'] }, revokeOn: ['felony'] },
  rn: { name: 'Registered Nurse (RN)', icon: '🩺', category: 'health', kind: 'license', requires: { education: { level: 'associate', majors: ['nursing'] } }, cost: 400, exam: D('smarts', 0.15), renewYears: 2, renewCost: 150, implies: ['cna'], sponsors: { professions: ['nursing'] }, revokeOn: ['felony'] },
  np: { name: 'Nurse Practitioner (APRN)', icon: '👩‍⚕️', category: 'health', kind: 'license', requires: { credentials: ['rn'], education: { level: 'master', majors: ['nursing'] } }, cost: 600, exam: D('smarts', 0.15), renewYears: 2, renewCost: 250, implies: ['rn'], sponsors: { professions: ['nursing'] }, revokeOn: ['felony'] },
  medicalLicense: { name: 'Medical License (MD)', icon: '⚕️', category: 'health', kind: 'license', requires: { education: { program: 'md' }, experience: { professions: ['medical'], years: 1 }, noFelony: true }, cost: 3000, exam: D('smarts', 0.05), renewYears: 2, renewCost: 500, sponsors: { professions: ['medical'] }, revokeOn: ['felony', 'prescriptionFraud'] },
  boardCertified: { name: 'Board Certification', icon: '🏅', category: 'health', kind: 'certification', requires: { credentials: ['medicalLicense'], experience: { professions: ['medical'], years: 3 } }, cost: 2500, exam: D('smarts', 0.15), renewYears: 10, renewCost: 1500, sponsors: { professions: ['medical'] }, revokeOn: ['felony', 'prescriptionFraud'] },

  /* ---------------- Fire & law enforcement ---------------- */
  ff1: { name: 'Firefighter I', icon: '🧑‍🚒', category: 'publicSafety', kind: 'certification', requires: { fitness: 45, age: 16 }, cost: 2500, exam: D('fitness', 0.15), academy: ['fire'], sponsors: { professions: ['fire'], services: ['fire'] } },
  ff2: { name: 'Firefighter II', icon: '🔥', category: 'publicSafety', kind: 'certification', requires: { credentials: ['ff1'] }, cost: 2000, exam: D('fitness', 0.2), implies: ['ff1'], academy: ['fire'], sponsors: { professions: ['fire'], services: ['fire'] } },
  hazmatOps: { name: 'HazMat Operations', icon: '☣️', category: 'publicSafety', kind: 'certification', requires: { age: 18 }, cost: 900, exam: D('smarts', 0.15), sponsors: { professions: ['fire', 'ems', 'police', 'publicWorks'], services: ['fire', 'ambulance', 'cert', 'mrc'] } },
  driverOperator: { name: 'Driver/Operator (Pumper)', icon: '🚒', category: 'publicSafety', kind: 'certification', requires: { affiliation: ['fire'], credentials: ['ff2', 'driverLicense'] }, cost: 1500, exam: D('smarts', 0.2), sponsors: { professions: ['fire'], services: ['fire'] }, suspendOn: { dui: 1 } },
  fireOfficer1: { name: 'Fire Officer I', icon: '🎖️', category: 'publicSafety', kind: 'certification', requires: { affiliation: ['fire'], credentials: ['driverOperator'] }, cost: 2200, exam: D('smarts', 0.25), sponsors: { professions: ['fire'], services: ['fire'] } },
  fireOfficer2: { name: 'Fire Officer II', icon: '⭐', category: 'publicSafety', kind: 'certification', requires: { affiliation: ['fire'], credentials: ['fireOfficer1'] }, cost: 2600, exam: D('smarts', 0.3), implies: ['fireOfficer1'], sponsors: { professions: ['fire'], services: ['fire'] } },
  fireInspector: { name: 'Fire Inspector I', icon: '🔎', category: 'publicSafety', kind: 'certification', requires: { affiliation: ['fire', 'publicWorks'], credentials: ['ff2'] }, cost: 1400, exam: D('smarts', 0.25), sponsors: { professions: ['fire', 'publicWorks'] } },
  postReserve: { name: 'Reserve Peace Officer (POST Level II)', icon: '🎓', category: 'publicSafety', kind: 'certification', requires: { age: 21, noFelony: true }, cost: 3500, exam: D('smarts', 0.25), sponsors: { professions: ['police'], services: ['police'] }, revokeOn: ['felony', 'excessiveForce'] },
  post: { name: 'Peace Officer (POST Basic Academy)', icon: '🚓', category: 'publicSafety', kind: 'license', requires: { fitness: 45, age: 21, noFelony: true, credentials: ['driverLicense'] }, trainingYears: 1, cost: 9000, exam: D('fitness', 0.2), implies: ['postReserve'], sponsoredOnly: true, academy: ['police', 'statePolice', 'gameWarden'], sponsors: { professions: ['police', 'statePolice', 'gameWarden'] }, revokeOn: ['felony', 'excessiveForce'] },
  correctionsAcademy: { name: 'Corrections Officer Academy', icon: '🔐', category: 'publicSafety', kind: 'certification', requires: { fitness: 40, age: 21, noFelony: true }, cost: 6000, exam: D('fitness', 0.15), sponsoredOnly: true, academy: ['corrections'], sponsors: { professions: ['corrections'] }, revokeOn: ['felony', 'contraband'] },
  fto: { name: 'Field Training Officer Program', icon: '🚔', category: 'publicSafety', kind: 'certification', requires: { affiliation: ['police', 'statePolice', 'gameWarden'], credentials: ['postReserve'] }, cost: 1200, exam: D('smarts', 0.2), sponsors: { professions: ['police'], services: ['police'] } },
  cit: { name: 'Crisis Intervention Team (CIT)', icon: '🧠', category: 'publicSafety', kind: 'certification', requires: { affiliation: ['police', 'statePolice', 'corrections', 'ems', 'socialWork', 'cps'], credentials: ['postReserve'] }, cost: 1100, exam: D('smarts', 0.15), sponsors: { professions: ['police', 'ems'], services: ['police'] } },
  trafficEnforcement: { name: 'Traffic Enforcement & DUI', icon: '🚦', category: 'publicSafety', kind: 'certification', requires: { affiliation: ['police', 'statePolice'], credentials: ['postReserve'] }, cost: 900, exam: D('smarts', 0.15), sponsors: { professions: ['police'], services: ['police'] } },
  firearmsInstructor: { name: 'Firearms Instructor', icon: '🎯', category: 'publicSafety', kind: 'certification', requires: { affiliation: ['police', 'statePolice', 'corrections', 'gameWarden', 'oig', 'parkService'], credentials: ['fto'] }, cost: 1500, exam: D('fitness', 0.25), sponsors: { professions: ['police', 'oig', 'parkService'], services: ['police'] } },
  supervisorCourse: { name: 'Law Enforcement Supervisory Course', icon: '📋', category: 'publicSafety', kind: 'certification', requires: { affiliation: ['police', 'statePolice', 'corrections', 'gameWarden', 'oig', 'parkService'], credentials: ['fto'] }, cost: 1600, exam: D('smarts', 0.2), sponsors: { professions: ['police'], services: ['police'] } },
  commandCollege: { name: 'Command College', icon: '⭐', category: 'publicSafety', kind: 'certification', requires: { affiliation: ['police', 'statePolice', 'corrections', 'gameWarden', 'oig', 'parkService'], credentials: ['supervisorCourse'], education: { level: 'bachelor' } }, cost: 6500, exam: D('smarts', 0.3), sponsors: { professions: ['police'], services: ['police'] } },
  fletc: { name: 'Federal Law Enforcement Training (FLETC)', icon: '🦅', category: 'government', kind: 'certification', requires: { fitness: 50, age: 21, noFelony: true }, cost: 15000, exam: D('fitness', 0.25), implies: ['postReserve'], sponsoredOnly: true, academy: ['oig', 'parkService'], sponsors: { professions: ['oig', 'parkService'] }, revokeOn: ['felony'] },

  /* ---------------- Search & rescue ---------------- */
  wildlandFF2: { name: 'Wildland Firefighter (FFT2, S-130/S-190)', icon: '🌲', category: 'publicSafety', kind: 'certification', requires: { age: 18 }, cost: 900, exam: D('fitness', 0.3), renewYears: 1, renewCost: 60, sponsors: { services: ['wildland'], professions: ['forester', 'parkService', 'fire'] } },
  wildlandFF1: { name: 'Wildland Squad Boss (FFT1)', icon: '🔥', category: 'publicSafety', kind: 'certification', requires: { affiliation: ['wildland', 'forester', 'parkService', 'fire'], credentials: ['wildlandFF2'], age: 19 }, trainingYears: 1, cost: 1800, exam: D('smarts', 0.3), sponsors: { services: ['wildland'], professions: ['forester', 'parkService'] } },
  boatCrew: { name: 'Boat Crew Qualification', icon: '🛥️', category: 'rescue', kind: 'certification', requires: { age: 17 }, cost: 700, exam: D('fitness', 0.2), sponsors: { services: ['auxiliary'], professions: ['gameWarden', 'parkService'] } },
  coxswain: { name: 'Coxswain', icon: '⚓', category: 'rescue', kind: 'certification', requires: { affiliation: ['auxiliary', 'gameWarden', 'parkService'], credentials: ['boatCrew'], age: 18 }, trainingYears: 1, cost: 1600, exam: D('smarts', 0.3), sponsors: { services: ['auxiliary'] } },
  wfr: { name: 'Wilderness First Responder', icon: '🩹', category: 'rescue', kind: 'certification', requires: { age: 16 }, cost: 900, exam: D('smarts', 0.15), renewYears: 3, renewCost: 250, sponsors: { services: ['sar', 'wildland', 'skiPatrol'], professions: ['parkService'] } },
  landNav: { name: 'Land Navigation', icon: '🧭', category: 'rescue', kind: 'certification', requires: { age: 16 }, cost: 450, exam: D('smarts', 0.15), sponsors: { services: ['sar', 'cap', 'cert'], professions: ['parkService'] } },
  ropeRescue: { name: 'Rope Rescue Technician', icon: '🪢', category: 'rescue', kind: 'certification', requires: { credentials: ['landNav'] }, cost: 1500, exam: D('fitness', 0.25), sponsors: { services: ['sar', 'fire', 'skiPatrol'], professions: ['fire', 'parkService'] } },
  swiftwater: { name: 'Swiftwater Rescue Technician', icon: '🌊', category: 'rescue', kind: 'certification', requires: { age: 18 }, cost: 1100, exam: D('fitness', 0.25), sponsors: { services: ['sar', 'fire', 'auxiliary'], professions: ['fire', 'parkService'] } },
  k9Handler: { name: 'K9 Handler', icon: '🐕', category: 'rescue', kind: 'certification', requires: { affiliation: ['sar', 'police', 'statePolice'], credentials: ['landNav'] }, cost: 4000, exam: D('smarts', 0.2), sponsors: { services: ['sar'] }, onEarn: 'k9' },
  avalanche: { name: 'Avalanche Rescue', icon: '🏔️', category: 'rescue', kind: 'certification', requires: { affiliation: ['sar', 'parkService'], credentials: ['ropeRescue'] }, cost: 1100, exam: D('fitness', 0.25), sponsors: { services: ['sar', 'skiPatrol'], professions: ['parkService'] } },
  ics300: { name: 'Incident Command (ICS-300)', icon: '📡', category: 'rescue', kind: 'certification', requires: { age: 18 }, cost: 600, exam: D('smarts', 0.15), sponsors: { services: ['sar', 'fire', 'ambulance', 'wildland', 'auxiliary', 'cap', 'cert', 'redcross', 'skiPatrol', 'mrc'], professions: ['fire', 'ems', 'police', 'municipalAdmin', 'publicWorks', 'parkService'] } },

  /* ---------------- Professional licenses ---------------- */
  barLicense: { name: 'State Bar License', icon: '⚖️', category: 'professional', kind: 'license', requires: { education: { program: 'jd' }, noFelony: true }, cost: 2000, exam: D('smarts', 0.38), renewYears: 3, renewCost: 450, sponsors: { professions: ['law', 'prosecution', 'publicDefender'] }, revokeOn: ['felony', 'prosecutorialMisconduct'] },
  paralegalCP: { name: 'Certified Paralegal (CP)', icon: '📑', category: 'professional', kind: 'certification', requires: { education: { anyOf: [{ program: 'paralegal' }, { level: 'bachelor' }] } }, cost: 600, exam: D('smarts', 0.2), renewYears: 5, renewCost: 100, sponsors: { professions: ['legalSupport'] } },
  cpa: { name: 'Certified Public Accountant (CPA)', icon: '🧮', category: 'professional', kind: 'license', requires: { education: { anyOf: [{ level: 'bachelor', majors: ['accounting', 'business', 'economics'] }, { program: 'msAccounting' }] }, noFelony: true }, cost: 3500, exam: D('smarts', 0.45), renewYears: 3, renewCost: 400, sponsors: { professions: ['accounting', 'oig'] }, revokeOn: ['felony'] },
  fe: { name: 'Engineer in Training (FE exam)', icon: '📐', category: 'professional', kind: 'certification', requires: { education: { level: 'bachelor', majors: ['engineering'] } }, cost: 225, exam: D('smarts', 0.27), sponsors: { professions: ['engineering', 'publicWorks'] } },
  pe: { name: 'Professional Engineer (PE)', icon: '🏗️', category: 'professional', kind: 'license', requires: { credentials: ['fe'], experience: { professions: ['engineering', 'publicWorks'], years: 4 } }, cost: 600, exam: D('smarts', 0.33), renewYears: 2, renewCost: 200, implies: ['fe'], sponsors: { professions: ['engineering', 'publicWorks'] }, revokeOn: ['felony', 'falsifiedInspection'] },
  teachingCert: { name: 'State Teaching Certificate', icon: '🍎', category: 'professional', kind: 'license', requires: { education: { anyOf: [{ level: 'bachelor', majors: ['education'] }, { program: 'teacherPrep' }] }, noFelony: true }, cost: 450, exam: D('smarts', 0.27), renewYears: 5, renewCost: 150, sponsors: { professions: ['education'] }, revokeOn: ['felony'] },
  realEstate: { name: 'Real Estate Salesperson License', icon: '🏠', category: 'professional', kind: 'license', requires: { age: 18 }, cost: 1100, exam: D('smarts', 0.42), renewYears: 2, renewCost: 150, revokeOn: ['felony'] },
  brokerLicense: { name: 'Real Estate Broker License', icon: '🏘️', category: 'professional', kind: 'license', requires: { credentials: ['realEstate'], experience: { professions: ['realestate'], years: 3 } }, cost: 1200, exam: D('smarts', 0.3), renewYears: 2, renewCost: 200, implies: ['realEstate'], revokeOn: ['felony'] },

  lcsw: { name: 'Licensed Clinical Social Worker (LCSW)', icon: '🤝', category: 'professional', kind: 'license', requires: { education: { program: 'msw' }, experience: { professions: ['socialWork', 'cps'], years: 2 } }, cost: 500, exam: D('smarts', 0.3), renewYears: 2, renewCost: 150, sponsors: { professions: ['socialWork', 'cps'] }, revokeOn: ['felony'] },
  pharmacistLicense: { name: 'Pharmacist License (NAPLEX + MPJE)', icon: '💊', category: 'health', kind: 'license', requires: { education: { program: 'pharmd' }, noFelony: true }, cost: 1200, exam: D('smarts', 0.15), renewYears: 2, renewCost: 250, sponsors: { professions: ['pharmacy'] }, revokeOn: ['felony', 'prescriptionFraud'] },
  insuranceProducer: { name: 'Insurance Producer License', icon: '🛡️', category: 'professional', kind: 'license', requires: { age: 18 }, cost: 600, exam: D('smarts', 0.35), renewYears: 2, renewCost: 100, sponsors: { professions: ['insurance'] }, revokeOn: ['felony'] },

  /* ---------------- Trades ---------------- */
  journeymanElectrician: { name: 'Journeyman Electrician License', icon: '⚡', category: 'trades', kind: 'license', requires: { anyOf: [{ experience: { professions: ['trades'], years: 4 } }, { education: { program: 'electricalTech' }, experience: { professions: ['trades'], years: 2 } }] }, cost: 250, exam: D('smarts', 0.3), renewYears: 3, renewCost: 100, sponsors: { professions: ['trades'] } },
  masterElectrician: { name: 'Master Electrician License', icon: '🔌', category: 'trades', kind: 'license', requires: { credentials: ['journeymanElectrician'], experience: { professions: ['trades'], years: 6 } }, cost: 400, exam: D('smarts', 0.4), renewYears: 3, renewCost: 150, implies: ['journeymanElectrician'], sponsors: { professions: ['trades'] } },
  journeymanPlumber: { name: 'Journeyman Plumber License', icon: '🚰', category: 'trades', kind: 'license', requires: { anyOf: [{ experience: { professions: ['plumbing'], years: 4 } }, { education: { program: 'plumbingTech' }, experience: { professions: ['plumbing'], years: 2 } }] }, cost: 250, exam: D('smarts', 0.3), renewYears: 3, renewCost: 100, sponsors: { professions: ['plumbing'] } },
  masterPlumber: { name: 'Master Plumber License', icon: '🛁', category: 'trades', kind: 'license', requires: { credentials: ['journeymanPlumber'], experience: { professions: ['plumbing'], years: 6 } }, cost: 400, exam: D('smarts', 0.4), renewYears: 3, renewCost: 150, implies: ['journeymanPlumber'], sponsors: { professions: ['plumbing'] } },
  cosmetologyLicense: { name: 'Cosmetology License', icon: '💇', category: 'trades', kind: 'license', requires: { education: { program: 'cosmetologySchool' } }, cost: 250, exam: D('smarts', 0.15), renewYears: 2, renewCost: 80 },
  oshaSafety: { name: 'OSHA 30 Construction Safety', icon: '🦺', category: 'trades', kind: 'certification', requires: { age: 18 }, cost: 450, exam: D('smarts', 0.05), sponsors: { professions: ['trades', 'publicWorks', 'engineering'] } },

  /* ---------------- Corporate & internal ---------------- */
  series7: { name: 'FINRA Series 7', icon: '📈', category: 'corporate', kind: 'license', requires: { age: 18 }, cost: 600, exam: D('smarts', 0.35), sponsoredOnly: true, sponsors: { professions: ['finance'] }, revokeOn: ['felony', 'insiderTrading'] },
  series66: { name: 'FINRA Series 66', icon: '📊', category: 'corporate', kind: 'license', requires: { credentials: ['series7'] }, cost: 400, exam: D('smarts', 0.3), sponsoredOnly: true, sponsors: { professions: ['finance'] }, revokeOn: ['felony', 'insiderTrading'] },
  pmp: { name: 'Project Management Professional (PMP)', icon: '📋', category: 'corporate', kind: 'certification', requires: { workYears: 3 }, cost: 1800, exam: D('smarts', 0.3), renewYears: 3, renewCost: 150, sponsors: { anyEmployer: true } },
  sixSigmaGreen: { name: 'Lean Six Sigma Green Belt', icon: '🟩', category: 'corporate', kind: 'internal', requires: { workYears: 1 }, cost: 2500, exam: D('smarts', 0.2), sponsoredOnly: true, sponsors: { anyEmployer: true } },
  sixSigmaBlack: { name: 'Lean Six Sigma Black Belt', icon: '⬛', category: 'corporate', kind: 'internal', requires: { credentials: ['sixSigmaGreen'], workYears: 3 }, cost: 4500, exam: D('smarts', 0.3), sponsoredOnly: true, implies: ['sixSigmaGreen'], sponsors: { anyEmployer: true } },
  leadershipProgram: { name: 'Leadership Development Program', icon: '🧭', category: 'corporate', kind: 'internal', requires: { tenure: 2 }, cost: 6000, exam: D('smarts', 0.1), sponsoredOnly: true, sponsors: { anyEmployer: true } },
  awsCert: { name: 'Cloud Architect Certification', icon: '☁️', category: 'corporate', kind: 'certification', requires: { age: 18 }, cost: 1500, exam: D('smarts', 0.3), renewYears: 3, renewCost: 150, sponsors: { professions: ['tech', 'intelligence'] } },
  cissp: { name: 'CISSP (Information Security)', icon: '🔐', category: 'corporate', kind: 'certification', requires: { experience: { professions: ['tech', 'intelligence', 'oig'], years: 5 } }, cost: 2500, exam: D('smarts', 0.45), renewYears: 3, renewCost: 125, sponsors: { professions: ['tech', 'intelligence', 'oig'] }, revokeOn: ['felony'] },

  /* ---------------- Government ---------------- */
  languageProficiency: { name: 'Foreign Language Proficiency (FSI 3/3)', icon: '🗣️', category: 'government', kind: 'internal', requires: { age: 18 }, trainingYears: 1, cost: 20000, exam: D('smarts', 0.35), sponsoredOnly: true, academy: ['foreignService', 'intelligence'], sponsors: { professions: ['foreignService', 'intelligence'] } },
  cgfm: { name: 'Certified Government Financial Manager', icon: '🏛️', category: 'government', kind: 'certification', requires: { education: { level: 'bachelor' }, workYears: 2 }, cost: 900, exam: D('smarts', 0.3), renewYears: 3, renewCost: 100, sponsors: { professions: ['municipalAdmin', 'oig', 'regulatory'] } },
  aicp: { name: 'Certified Planner (AICP)', icon: '🗺️', category: 'government', kind: 'certification', requires: { education: { level: 'bachelor' }, experience: { professions: ['planning'], years: 2 } }, cost: 1000, exam: D('smarts', 0.35), renewYears: 2, renewCost: 150, sponsors: { professions: ['planning'] } },
  buildingInspector: { name: 'ICC Building Inspector', icon: '🏚️', category: 'government', kind: 'certification', requires: { age: 18 }, cost: 900, exam: D('smarts', 0.25), renewYears: 3, renewCost: 120, sponsors: { professions: ['publicWorks'] }, revokeOn: ['felony', 'falsifiedInspection'] },
  /* ---------------- Airline crew ---------------- */
  firstClassMedical: { name: 'FAA First-Class Medical', icon: '🩺', category: 'aviation', kind: 'certification', requires: { health: 50, age: 18 }, cost: 200, exam: D('health', 0.1), renewYears: 1, renewCost: 200, sponsors: { professions: ['aviation', 'charterAviation'] }, suspendOn: { dui: 1 } },
  typeRating: { name: 'Jet Type Rating', icon: '🛩️', category: 'aviation', kind: 'endorsement', requires: { credentials: ['atp'] }, cost: 30000, exam: D('smarts', 0.3), sponsoredOnly: true, sponsors: { professions: ['aviation', 'charterAviation'] }, academy: ['aviation', 'charterAviation'] },
  faCertificate: { name: 'Flight Attendant Certificate of Demonstrated Proficiency', icon: '🧳', category: 'aviation', kind: 'certification', requires: { age: 18, education: { level: 'highschool' } }, cost: 0, exam: D('fitness', 0.15), sponsoredOnly: true, sponsors: { professions: ['flightAttendant'] }, academy: ['flightAttendant'] },
  /* ---------------- Maritime ---------------- */
  twic: { name: 'TWIC (Transportation Worker ID Card)', icon: '🪪', category: 'maritime', kind: 'certification', requires: { age: 18, noFelony: true }, cost: 125, exam: D('smarts', 0.02), renewYears: 5, renewCost: 125, revokeOn: ['felony'], sponsors: { professions: ['merchantMarine', 'cruise'] }, valuedBy: ['trucking', 'merchantMarine'] },
  stcw: { name: 'STCW Basic Safety Training', icon: '🛟', category: 'maritime', kind: 'certification', requires: { age: 18 }, cost: 1200, exam: D('fitness', 0.15), renewYears: 5, renewCost: 600, sponsors: { professions: ['merchantMarine', 'cruise'] }, academy: ['merchantMarine', 'cruise'], valuedBy: ['cruise'] },
  mmc: { name: 'Merchant Mariner Credential (MMC)', icon: '⚓', category: 'maritime', kind: 'license', requires: { age: 18, health: 45, credentials: ['twic'] }, cost: 300, exam: D('health', 0.1), renewYears: 5, renewCost: 140, sponsors: { professions: ['merchantMarine', 'cruise'] }, academy: ['merchantMarine'], suspendOn: { dui: 1 }, revokeOn: ['felony'] },
  mateLicense: { name: 'Third Mate License (Unlimited Tonnage)', icon: '🧭', category: 'maritime', kind: 'license', requires: { anyOf: [{ education: { program: 'maritimeAcademy' }, credentials: ['mmc', 'stcw'] }, { credentials: ['mmc', 'stcw'], experience: { professions: ['merchantMarine'], years: 3 } }] }, cost: 2500, exam: D('smarts', 0.4), renewYears: 5, renewCost: 300, sponsors: { professions: ['merchantMarine'] }, suspendOn: { dui: 2 }, revokeOn: ['felony'] },
  chiefMateLicense: { name: 'Chief Mate License', icon: '🧭', category: 'maritime', kind: 'license', requires: { credentials: ['mateLicense'], experience: { professions: ['merchantMarine'], years: 5 } }, trainingYears: 1, cost: 4000, exam: D('smarts', 0.45), renewYears: 5, renewCost: 300, implies: ['mateLicense'], sponsors: { professions: ['merchantMarine'] }, suspendOn: { dui: 2 }, revokeOn: ['felony'] },
  masterLicense: { name: 'Master (Captain) License — Unlimited', icon: '👨‍✈️', category: 'maritime', kind: 'license', requires: { credentials: ['chiefMateLicense'], experience: { professions: ['merchantMarine'], years: 8 } }, trainingYears: 1, cost: 5000, exam: D('smarts', 0.5), renewYears: 5, renewCost: 300, implies: ['chiefMateLicense'], sponsors: { professions: ['merchantMarine'] }, suspendOn: { dui: 3 }, revokeOn: ['felony'] },
  engineerLicense: { name: 'Third Assistant Engineer License', icon: '⚙️', category: 'maritime', kind: 'license', requires: { anyOf: [{ education: { program: 'maritimeAcademy' }, credentials: ['mmc', 'stcw'] }, { credentials: ['mmc', 'stcw'], experience: { professions: ['merchantMarine'], years: 3 } }] }, cost: 2500, exam: D('smarts', 0.4), renewYears: 5, renewCost: 300, sponsors: { professions: ['merchantMarine'] }, suspendOn: { dui: 2 }, revokeOn: ['felony'] },
  chiefEngineerLicense: { name: 'Chief Engineer License — Unlimited', icon: '⚙️', category: 'maritime', kind: 'license', requires: { credentials: ['engineerLicense'], experience: { professions: ['merchantMarine'], years: 7 } }, trainingYears: 1, cost: 5000, exam: D('smarts', 0.5), renewYears: 5, renewCost: 300, implies: ['engineerLicense'], sponsors: { professions: ['merchantMarine'] }, suspendOn: { dui: 3 }, revokeOn: ['felony'] },
  /* ---------------- Food, hospitality & service ---------------- */
  servSafe: { name: 'ServSafe Food Protection Manager', icon: '🍳', category: 'hospitality', kind: 'certification', requires: { age: 16 }, cost: 180, exam: D('smarts', 0.25), renewYears: 5, renewCost: 150, sponsors: { professions: ['culinary', 'hospitality', 'retail'] }, valuedBy: ['culinary', 'hospitality', 'retail'] },
  alcoholServer: { name: 'Responsible Alcohol Server (TIPS)', icon: '🍷', category: 'hospitality', kind: 'certification', requires: { age: 18 }, cost: 60, exam: D('smarts', 0.1), renewYears: 3, renewCost: 60, sponsors: { professions: ['hospitality', 'culinary'] }, valuedBy: ['hospitality', 'culinary'] },
  acfChef: { name: 'ACF Certified Executive Chef', icon: '👨‍🍳', category: 'hospitality', kind: 'certification', requires: { credentials: ['servSafe'], experience: { professions: ['culinary'], years: 5 } }, cost: 1600, exam: D('smarts', 0.35), renewYears: 5, renewCost: 300, sponsors: { professions: ['culinary'] }, valuedBy: ['culinary', 'hospitality'] },
  cha: { name: 'Certified Hotel Administrator (CHA)', icon: '🏨', category: 'hospitality', kind: 'certification', requires: { experience: { professions: ['hospitality'], years: 3 } }, cost: 1100, exam: D('smarts', 0.3), renewYears: 5, renewCost: 250, sponsors: { professions: ['hospitality'] }, valuedBy: ['hospitality'] },
  cpm: { name: 'Certified Property Manager (CPM)', icon: '🏢', category: 'professional', kind: 'certification', requires: { experience: { professions: ['propertyManagement', 'realestate'], years: 3 } }, trainingYears: 1, cost: 4000, exam: D('smarts', 0.3), renewYears: 3, renewCost: 400, sponsors: { professions: ['propertyManagement'] }, valuedBy: ['propertyManagement', 'realestate'] },
  enrolledAgent: { name: 'IRS Enrolled Agent (EA)', icon: '🧾', category: 'professional', kind: 'license', requires: { age: 18, noFelony: true }, cost: 800, exam: D('smarts', 0.4), renewYears: 3, renewCost: 200, sponsors: { professions: ['accounting', 'revenue'] }, valuedBy: ['accounting', 'revenue'], revokeOn: ['felony', 'taxEvasion'] },
  nationalBoard: { name: 'National Board Certified Teacher', icon: '🏆', category: 'professional', kind: 'certification', requires: { credentials: ['teachingCert'], experience: { professions: ['education'], years: 3 } }, trainingYears: 1, cost: 1900, exam: D('smarts', 0.35), renewYears: 5, renewCost: 500, sponsors: { professions: ['education'] }, valuedBy: ['education', 'university'] },
  ptoe: { name: 'Professional Traffic Operations Engineer (PTOE)', icon: '🚦', category: 'professional', kind: 'certification', requires: { credentials: ['fe'], experience: { professions: ['dot', 'engineering', 'planning'], years: 4 } }, cost: 900, exam: D('smarts', 0.4), renewYears: 4, renewCost: 250, sponsors: { professions: ['dot', 'engineering'] }, valuedBy: ['dot', 'engineering', 'planning'] },
  cfa: { name: 'CFA Charterholder', icon: '📜', category: 'corporate', kind: 'certification', requires: { education: { level: 'bachelor' }, workYears: 4 }, trainingYears: 2, cost: 4500, exam: D('smarts', 0.55), sponsors: { professions: ['finance', 'insurance'] }, valuedBy: ['finance', 'corporate', 'insurance'], revokeOn: ['felony', 'insiderTrading', 'securitiesFraud'] },
  shrm: { name: 'SHRM Certified Professional (HR)', icon: '🧑‍💼', category: 'corporate', kind: 'certification', requires: { education: { level: 'bachelor' }, workYears: 1 }, cost: 1400, exam: D('smarts', 0.3), renewYears: 3, renewCost: 200, sponsors: { anyEmployer: true }, valuedBy: ['corporate', 'municipalAdmin', 'hospitality', 'legislativeStaff'] },
  securityPlus: { name: 'CompTIA Security+', icon: '🛡️', category: 'corporate', kind: 'certification', requires: { age: 18 }, cost: 1000, exam: D('smarts', 0.3), renewYears: 3, renewCost: 150, sponsors: { professions: ['tech', 'intelligence', 'oig'] }, valuedBy: ['tech', 'intelligence', 'oig', 'regulatory'] },
  acls: { name: 'Advanced Cardiac Life Support (ACLS)', icon: '❤️‍🩹', category: 'health', kind: 'certification', requires: { anyOf: [{ credentials: ['rn'] }, { credentials: ['paramedic'] }, { credentials: ['medicalLicense'] }] }, cost: 350, exam: D('smarts', 0.2), renewYears: 2, renewCost: 200, sponsors: { services: ['mrc'], professions: ['nursing', 'ems', 'medical', 'fire'] }, valuedBy: ['nursing', 'ems', 'fire', 'medical'] },
  hazwoper: { name: 'HAZWOPER 40-Hour', icon: '🧪', category: 'trades', kind: 'certification', requires: { age: 18 }, cost: 700, exam: D('smarts', 0.15), renewYears: 1, renewCost: 150, sponsors: { professions: ['environmental', 'publicWorks', 'fire'] }, valuedBy: ['environmental', 'publicWorks'] },
  flagger: { name: 'Work Zone Flagger', icon: '🚧', category: 'trades', kind: 'certification', requires: { age: 18 }, cost: 150, exam: D('smarts', 0.05), renewYears: 4, renewCost: 80, sponsors: { professions: ['dot', 'publicWorks', 'trades'] }, valuedBy: ['dot', 'publicWorks'] },
  courtManager: { name: 'Certified Court Manager (CCM)', icon: '🏛️', category: 'government', kind: 'certification', requires: { experience: { professions: ['courts', 'legalSupport'], years: 2 } }, trainingYears: 1, cost: 2500, exam: D('smarts', 0.25), sponsors: { professions: ['courts'] }, valuedBy: ['courts', 'legislativeStaff'] },
  drone: { name: 'FAA Remote Pilot (Part 107 Drone)', icon: '🚁', category: 'aviation', kind: 'certification', requires: { age: 16 }, cost: 300, exam: D('smarts', 0.25), renewYears: 2, renewCost: 0, sponsors: { services: ['cap'], professions: ['journalism', 'realestate', 'engineering', 'forester', 'environmental', 'police', 'fire'] }, valuedBy: ['journalism', 'realestate', 'environmental', 'forester'] },
};

/**
 * State-issued credentials and how they cross state lines:
 *   automatic     reissued by the new state for a fee (driver licenses, CPA mobility)
 *   compact       valid in every compact member state (Nurse Licensure Compact)
 *   motion        admission by motion after 5 years of practice, otherwise re-examine (bar)
 *   transferExam  reciprocity exam / jurisprudence test at reduced cost
 *   restart       must be earned again (agency-specific reserve academies)
 * Everything not listed is national (NREMT, FAA, FINRA, NFPA, ICC…).
 */
export const STATE_ISSUED = {
  learnerPermit: 'automatic', driverLicense: 'automatic', motorcycle: 'automatic', cdlA: 'automatic', hazmatEndorsement: 'automatic', cpa: 'automatic', insuranceProducer: 'automatic',
  rn: 'compact',
  barLicense: 'motion',
  teachingCert: 'transferExam', realEstate: 'transferExam', brokerLicense: 'transferExam', journeymanElectrician: 'transferExam', masterElectrician: 'transferExam',
  journeymanPlumber: 'transferExam', masterPlumber: 'transferExam', cosmetologyLicense: 'transferExam', post: 'transferExam', pe: 'transferExam', servSafe: 'automatic', alcoholServer: 'automatic',
  medicalLicense: 'transferExam', np: 'transferExam', cna: 'transferExam', lcsw: 'transferExam', pharmacistLicense: 'transferExam', correctionsAcademy: 'transferExam',
  postReserve: 'restart',
};

for (const [id, c] of Object.entries(CREDENTIALS)) {
  c.jurisdiction = STATE_ISSUED[id] ? 'state' : 'national';
  c.reciprocity = STATE_ISSUED[id] ?? null;
}

export const RECIPROCITY_LABEL = {
  automatic: 'Transfers automatically',
  compact: 'Nurse Licensure Compact',
  motion: 'Admission by motion (5 yrs practice)',
  transferExam: 'Reciprocity exam',
  restart: 'Must re-qualify',
};

export const CREDENTIAL_LIST = Object.entries(CREDENTIALS).map(([id, c]) => ({ id, ...c }));

export function getCredential(id) {
  const c = CREDENTIALS[id];
  if (!c) throw new Error(`Unknown credential: ${id}`);
  return { id, ...c };
}

export const credentialName = (id) => CREDENTIALS[id]?.name ?? id;

/** Credentials that improve hiring odds in a profession (beyond the profession's own `valued` list). */
export const VALUED_BY = {};
for (const [id, c] of Object.entries(CREDENTIALS)) for (const p of c.valuedBy ?? []) (VALUED_BY[p] ??= []).push(id);
export const valuedCredentials = (profession) => [...new Set([...(profession.valued ?? []), ...(VALUED_BY[profession.id] ?? [])])];

/** Flight time: renting an aircraft builds hours toward pilot ratings. */
export const FLIGHT_BLOCK = { hours: 50, cost: 9000 };
