/**
 * Education catalog: schools, programs (by level) and majors.
 *
 * Majors map to career *fields*: a related major improves hiring odds and
 * job performance, but most careers accept any major. Hard requirements live
 * only where they exist in real life and are expressed in the credential
 * registry (nursing → RN, engineering → FE/PE, education → teaching cert,
 * pre-med prerequisites → medical school).
 */

export const SCHOOLS = {
  community: { name: 'Riverside Community College', icon: '🏫', type: 'Community college', tuition: 4200, admission: 0, prestige: 0, public: true },
  technical: { name: 'Metro Technical Institute', icon: '🛠️', type: 'Trade school', tuition: 9000, admission: 0, prestige: 0, public: true },
  online: { name: 'Summit Online University', icon: '💻', type: 'Online university', tuition: 9500, admission: 20, prestige: -1, onlineOnly: true },
  state: { name: 'State University', icon: '🎓', type: 'Public university', tuition: 11500, admission: 40, prestige: 1, public: true },
  private: { name: 'Whitmore College', icon: '🏛️', type: 'Private college', tuition: 39000, admission: 58, prestige: 2 },
  academy: { name: 'U.S. Service Academy', icon: '⚓', type: 'Service academy', tuition: 0, admission: 72, prestige: 3, public: true, academy: true },
  elite: { name: 'Ivy Crest University', icon: '🦉', type: 'Elite university', tuition: 62000, admission: 80, prestige: 3, needBasedAid: true },
};

/**
 * fields: career fields the major prepares you for (hiring/performance bonus).
 * levels: degree types the major is offered at.
 */
export const MAJORS = {
  computerScience: { name: 'Computer Science', icon: '💻', fields: ['tech', 'intelligence'], levels: ['associate', 'bachelor', 'master'] },
  engineering: { name: 'Engineering', icon: '📐', fields: ['engineering', 'publicWorks', 'tech', 'aviation', 'dot'], levels: ['bachelor', 'master'], science: true },
  nursing: { name: 'Nursing', icon: '🩺', fields: ['nursing', 'medical', 'ems'], levels: ['associate', 'bachelor', 'master'], science: true },
  biology: { name: 'Biology / Pre-Med', icon: '🧬', fields: ['medical', 'nursing', 'parkService', 'pharmacy', 'environmental'], levels: ['bachelor', 'master'], science: true },
  business: { name: 'Business Administration', icon: '📈', fields: ['corporate', 'finance', 'retail', 'realestate', 'accounting', 'trucking'], levels: ['associate', 'bachelor'] },
  accounting: { name: 'Accounting', icon: '🧮', fields: ['accounting', 'finance', 'oig', 'regulatory', 'revenue', 'insurance'], levels: ['associate', 'bachelor'] },
  economics: { name: 'Economics', icon: '💹', fields: ['finance', 'corporate', 'regulatory', 'foreignService'], levels: ['bachelor', 'master'] },
  politicalScience: { name: 'Political Science', icon: '🗳️', fields: ['law', 'legalSupport', 'foreignService', 'municipalAdmin', 'regulatory', 'legislativeStaff', 'prosecution', 'publicDefender', 'courts'], levels: ['bachelor'] },
  internationalRelations: { name: 'International Relations', icon: '🌐', fields: ['foreignService', 'intelligence'], levels: ['bachelor', 'master'] },
  criminalJustice: { name: 'Criminal Justice', icon: '🚓', fields: ['police', 'statePolice', 'corrections', 'gameWarden', 'courts', 'oig', 'legalSupport', 'intelligence', 'parkService'], levels: ['associate', 'bachelor', 'master'] },
  education: { name: 'Education', icon: '🍎', fields: ['education'], levels: ['bachelor', 'master'] },
  publicAdministration: { name: 'Public Administration', icon: '🏛️', fields: ['municipalAdmin', 'publicWorks', 'planning', 'regulatory', 'fire', 'police'], levels: ['bachelor'] },
  environmentalScience: { name: 'Environmental Science', icon: '🌲', fields: ['parkService', 'planning', 'regulatory', 'environmental', 'forester', 'gameWarden'], levels: ['bachelor', 'master'], science: true },
  urbanStudies: { name: 'Urban Studies & Planning', icon: '🗺️', fields: ['planning', 'municipalAdmin', 'realestate'], levels: ['bachelor', 'master'] },
  fireScience: { name: 'Fire Science / EMS', icon: '🚒', fields: ['fire', 'ems'], levels: ['associate', 'bachelor'] },
  aviation: { name: 'Aviation / Aeronautics', icon: '✈️', fields: ['aviation', 'charterAviation', 'flightAttendant'], levels: ['associate', 'bachelor'] },
  marineTransportation: { name: 'Marine Transportation & Engineering', icon: '⚓', fields: ['merchantMarine', 'cruise'], levels: ['bachelor'] },
  communications: { name: 'Communications & Journalism', icon: '📣', fields: ['journalism', 'corporate', 'retail', 'foreignService', 'municipalAdmin', 'legislativeStaff'], levels: ['bachelor'] },
  socialWork: { name: 'Social Work', icon: '🤝', fields: ['socialWork', 'cps', 'legalSupport'], levels: ['bachelor', 'master'] },
  hospitalityMgmt: { name: 'Hospitality Management', icon: '🏨', fields: ['hospitality', 'culinary', 'retail', 'cruise', 'flightAttendant'], levels: ['associate', 'bachelor'] },
  religiousStudies: { name: 'Religious Studies / Theology', icon: '📜', fields: ['clergy', 'socialWork'], levels: ['bachelor', 'master'] },
  mathematics: { name: 'Mathematics & Statistics', icon: '➗', fields: ['actuary', 'finance', 'tech', 'insurance', 'education'], levels: ['bachelor', 'master'], science: true },
  forensicScience: { name: 'Forensic Science', icon: '🧬', fields: ['forensics', 'police', 'sheriff', 'privateInvestigator'], levels: ['bachelor', 'master'], science: true },
  liberalArts: { name: 'Liberal Arts', icon: '🎭', fields: ['education', 'legalSupport', 'foreignService'], levels: ['associate', 'bachelor'] },
};

export const SCIENCE_MAJORS = Object.entries(MAJORS).filter(([, m]) => m.science).map(([id]) => id);

/**
 * type:      degree rank bucket (see DEGREE_RANK in State.js)
 * years:     full-time duration (part-time takes twice as long)
 * requires:  education requirement to apply
 * major:     fixed major, or 'choose' to pick from MAJORS offered at `type`
 * schools:   which schools offer it
 * costFactor multiplies the school's base tuition; stipend pays instead.
 */
export const PROGRAMS = {
  paralegal: { name: 'Paralegal Certificate', type: 'certificate', years: 1, requires: { level: 'highschool' }, schools: ['community', 'online'], costFactor: 1, fields: ['legalSupport', 'law'] },
  teacherPrep: { name: 'Alternative Teacher Certification', type: 'certificate', years: 1, requires: { level: 'bachelor' }, schools: ['state', 'online'], costFactor: 0.8, fields: ['education'] },
  premedPostbacc: { name: 'Pre-Med Post-Baccalaureate', type: 'certificate', years: 1, requires: { level: 'bachelor' }, schools: ['state', 'private', 'elite'], costFactor: 1, fields: ['medical'] },
  electricalTech: { name: 'Electrical Technology Diploma', type: 'vocational', years: 1, requires: { level: 'highschool' }, schools: ['technical', 'community'], costFactor: 1, fields: ['trades'] },
  cosmetologySchool: { name: 'Cosmetology School', type: 'vocational', years: 1, requires: { level: 'highschool' }, schools: ['technical'], costFactor: 1.2, fields: ['cosmetology'] },
  plumbingTech: { name: 'Plumbing Technology Diploma', type: 'vocational', years: 1, requires: { level: 'highschool' }, schools: ['technical', 'community'], costFactor: 1, fields: ['plumbing'] },
  hvacTech: { name: 'HVAC Technology Diploma', type: 'vocational', years: 1, requires: { level: 'highschool' }, schools: ['technical', 'community'], costFactor: 1, fields: ['hvac'] },
  weldingTech: { name: 'Welding Technology Diploma', type: 'vocational', years: 1, requires: { level: 'highschool' }, schools: ['technical', 'community'], costFactor: 1.1, fields: ['welding'] },
  autoTech: { name: 'Automotive Technology Diploma', type: 'vocational', years: 1, requires: { level: 'highschool' }, schools: ['technical', 'community'], costFactor: 1, fields: ['automotive'] },
  linemanSchool: { name: 'Pre-Apprentice Lineworker School', type: 'certificate', years: 1, requires: { level: 'highschool' }, schools: ['technical'], costFactor: 1.2, fields: ['lineworker'] },
  culinaryArts: { name: 'Culinary Arts Diploma', type: 'vocational', years: 1, requires: { level: 'highschool' }, schools: ['technical'], costFactor: 1, fields: ['culinary'] },
  maritimeAcademy: { name: 'Maritime Academy (B.S. + license track)', type: 'bachelor', years: 4, requires: { level: 'highschool' }, major: 'marineTransportation', schools: ['state'], costFactor: 1.15, minSmarts: 45, fields: ['merchantMarine'] },
  associate: { name: "Associate's Degree", type: 'associate', years: 2, requires: { level: 'highschool' }, major: 'choose', schools: ['community', 'online'], costFactor: 1 },
  bachelor: { name: "Bachelor's Degree", type: 'bachelor', years: 4, requires: { level: 'highschool' }, major: 'choose', schools: ['online', 'state', 'private', 'elite', 'academy'], costFactor: 1 },
  master: { name: "Master's Degree", type: 'master', years: 2, requires: { level: 'bachelor' }, major: 'choose', schools: ['online', 'state', 'private', 'elite'], costFactor: 1.1, minSmarts: 45, minGpa: 2.8 },
  mba: { name: 'Master of Business Administration', type: 'master', years: 2, requires: { level: 'bachelor' }, major: 'business', schools: ['online', 'state', 'private', 'elite'], costFactor: 1.4, minSmarts: 50, minGpa: 2.8, fields: ['corporate', 'finance'] },
  mpa: { name: 'Master of Public Administration', type: 'master', years: 2, requires: { level: 'bachelor' }, major: 'publicAdministration', schools: ['online', 'state', 'elite'], costFactor: 1.1, minSmarts: 45, minGpa: 2.8, fields: ['municipalAdmin', 'regulatory', 'publicWorks', 'planning'] },
  msw: { name: 'Master of Social Work', type: 'master', years: 2, requires: { level: 'bachelor' }, major: 'socialWork', schools: ['online', 'state', 'private'], costFactor: 1.1, minSmarts: 45, minGpa: 2.8, fields: ['socialWork', 'cps'] },
  seminary: { name: 'Master of Divinity (Seminary)', type: 'master', years: 3, requires: { level: 'bachelor' }, major: null, schools: ['online', 'private', 'elite'], costFactor: 0.6, fields: ['clergy'] },
  msAccounting: { name: 'M.S. Accounting', type: 'master', years: 1, requires: { level: 'bachelor' }, major: 'accounting', schools: ['state', 'private'], costFactor: 1.1, minSmarts: 50, fields: ['accounting'] },
  jd: { name: 'Juris Doctor (Law School)', type: 'professional', years: 3, requires: { level: 'bachelor' }, major: null, schools: ['state', 'private', 'elite'], costFactor: 1.5, minSmarts: 60, minGpa: 3.0, fields: ['law'] },
  md: { name: 'Doctor of Medicine (Medical School)', type: 'professional', years: 4, requires: { anyOf: [{ level: 'bachelor', majors: SCIENCE_MAJORS }, { program: 'premedPostbacc' }] }, major: null, schools: ['state', 'private', 'elite'], costFactor: 1.6, minSmarts: 70, minGpa: 3.3, fields: ['medical'] },
  pharmd: { name: 'Doctor of Pharmacy (Pharm.D.)', type: 'professional', years: 4, requires: { anyOf: [{ level: 'bachelor', majors: SCIENCE_MAJORS }, { program: 'premedPostbacc' }] }, major: null, schools: ['state', 'private'], costFactor: 1.4, minSmarts: 62, minGpa: 3.0, fields: ['pharmacy'] },
  dds: { name: 'Doctor of Dental Surgery (Dental School)', type: 'professional', years: 4, requires: { level: 'bachelor', majors: SCIENCE_MAJORS }, major: null, schools: ['state', 'private'], costFactor: 1.6, minSmarts: 65, minGpa: 3.2, fields: ['dentistry'] },
  dpt: { name: 'Doctor of Physical Therapy (DPT)', type: 'professional', years: 3, requires: { level: 'bachelor' }, major: null, schools: ['state', 'private'], costFactor: 1.3, minSmarts: 55, minGpa: 3.0, fields: ['physicalTherapy'] },
  paMaster: { name: 'Master of Physician Assistant Studies', type: 'master', years: 2, requires: { level: 'bachelor', majors: SCIENCE_MAJORS }, major: null, schools: ['state', 'private'], costFactor: 1.4, minSmarts: 60, minGpa: 3.2, fields: ['physicianAssistant', 'medical'] },
  dvm: { name: 'Doctor of Veterinary Medicine (Vet School)', type: 'professional', years: 4, requires: { level: 'bachelor', majors: SCIENCE_MAJORS }, major: null, schools: ['state'], costFactor: 1.5, minSmarts: 65, minGpa: 3.3, fields: ['veterinary'] },
  mph: { name: 'Master of Public Health (MPH)', type: 'master', years: 2, requires: { level: 'bachelor' }, major: null, schools: ['online', 'state', 'private', 'elite'], costFactor: 1.2, minSmarts: 50, minGpa: 3.0, fields: ['publicHealth', 'regulatory'] },
  crnaProgram: { name: 'Doctor of Nurse Anesthesia Practice (CRNA)', type: 'doctorate', years: 3, requires: { level: 'bachelor', majors: ['nursing'] }, major: null, schools: ['state', 'private'], costFactor: 1.5, minSmarts: 65, minGpa: 3.3, fields: ['nursing'] },
  phd: { name: 'Doctor of Philosophy (Ph.D.)', type: 'doctorate', years: 5, requires: { level: 'bachelor' }, major: 'choose', majorLevel: 'master', schools: ['state', 'elite'], costFactor: 0, stipend: 32000, minSmarts: 75, minGpa: 3.4 },
};

export const PROGRAM_GROUPS = [
  { label: 'Certificates & Trade Diplomas', ids: ['paralegal', 'electricalTech', 'plumbingTech', 'hvacTech', 'weldingTech', 'autoTech', 'linemanSchool', 'cosmetologySchool', 'culinaryArts', 'teacherPrep', 'premedPostbacc'] },
  { label: 'Undergraduate Degrees', ids: ['associate', 'bachelor', 'maritimeAcademy'] },
  { label: 'Graduate & Professional School', ids: ['master', 'mba', 'mpa', 'msw', 'msAccounting', 'seminary', 'mph', 'paMaster', 'crnaProgram', 'jd', 'md', 'dds', 'dpt', 'dvm', 'pharmd', 'phd'] },
];

/** Majors offered for a program ('choose' programs list them by level). */
export function majorsFor(programId) {
  const p = PROGRAMS[programId];
  if (p.major === 'choose') {
    const level = p.majorLevel ?? p.type;
    return Object.keys(MAJORS).filter((m) => MAJORS[m].levels.includes(level) || (p.type === 'doctorate' && MAJORS[m].levels.includes('master')));
  }
  return p.major ? [p.major] : [null];
}

export function degreeLabel(degree) {
  const program = PROGRAMS[degree.programId];
  const name = degree.programId === 'ged' || degree.type === 'ged' ? 'GED' : degree.type === 'highschool' ? 'High School Diploma' : program?.name ?? degree.type;
  return `${name}${degree.major && program?.major === 'choose' ? ` — ${MAJORS[degree.major].name}` : ''}`;
}

/** Career fields your education prepares you for. */
export function educationFields(state) {
  const fields = new Set();
  for (const d of state.education.degrees) {
    for (const f of MAJORS[d.major]?.fields ?? []) fields.add(f);
    for (const f of PROGRAMS[d.programId]?.fields ?? []) fields.add(f);
  }
  return fields;
}

/** Best school prestige among your college degrees. */
export function schoolPrestige(state) {
  return state.education.degrees.reduce((best, d) => Math.max(best, SCHOOLS[d.schoolId]?.prestige ?? 0), 0);
}
