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
  community: { name: 'Riverside Community College', icon: '🏫', type: 'Community college', tuition: 4200, admission: 0, prestige: 0 },
  technical: { name: 'Metro Technical Institute', icon: '🛠️', type: 'Trade school', tuition: 9000, admission: 0, prestige: 0 },
  online: { name: 'Summit Online University', icon: '💻', type: 'Online university', tuition: 9500, admission: 20, prestige: -1, onlineOnly: true },
  state: { name: 'State University', icon: '🎓', type: 'Public university', tuition: 11500, admission: 40, prestige: 1 },
  private: { name: 'Whitmore College', icon: '🏛️', type: 'Private college', tuition: 39000, admission: 58, prestige: 2 },
  elite: { name: 'Ivy Crest University', icon: '🦉', type: 'Elite university', tuition: 62000, admission: 80, prestige: 3, needBasedAid: true },
};

/**
 * fields: career fields the major prepares you for (hiring/performance bonus).
 * levels: degree types the major is offered at.
 */
export const MAJORS = {
  computerScience: { name: 'Computer Science', icon: '💻', fields: ['tech', 'intelligence'], levels: ['associate', 'bachelor', 'master'] },
  engineering: { name: 'Engineering', icon: '📐', fields: ['engineering', 'publicWorks', 'tech', 'aviation'], levels: ['bachelor', 'master'], science: true },
  nursing: { name: 'Nursing', icon: '🩺', fields: ['nursing', 'medical', 'ems'], levels: ['associate', 'bachelor', 'master'], science: true },
  biology: { name: 'Biology / Pre-Med', icon: '🧬', fields: ['medical', 'nursing', 'parkService'], levels: ['bachelor', 'master'], science: true },
  business: { name: 'Business Administration', icon: '📈', fields: ['corporate', 'finance', 'retail', 'realestate', 'accounting', 'trucking'], levels: ['associate', 'bachelor'] },
  accounting: { name: 'Accounting', icon: '🧮', fields: ['accounting', 'finance', 'oig', 'regulatory'], levels: ['associate', 'bachelor'] },
  economics: { name: 'Economics', icon: '💹', fields: ['finance', 'corporate', 'regulatory', 'foreignService'], levels: ['bachelor', 'master'] },
  politicalScience: { name: 'Political Science', icon: '🗳️', fields: ['law', 'legalSupport', 'foreignService', 'municipalAdmin', 'regulatory'], levels: ['bachelor'] },
  internationalRelations: { name: 'International Relations', icon: '🌐', fields: ['foreignService', 'intelligence'], levels: ['bachelor', 'master'] },
  criminalJustice: { name: 'Criminal Justice', icon: '🚓', fields: ['police', 'oig', 'legalSupport', 'intelligence', 'parkService'], levels: ['associate', 'bachelor', 'master'] },
  education: { name: 'Education', icon: '🍎', fields: ['education'], levels: ['bachelor', 'master'] },
  publicAdministration: { name: 'Public Administration', icon: '🏛️', fields: ['municipalAdmin', 'publicWorks', 'planning', 'regulatory', 'fire', 'police'], levels: ['bachelor'] },
  environmentalScience: { name: 'Environmental Science', icon: '🌲', fields: ['parkService', 'planning', 'regulatory'], levels: ['bachelor', 'master'], science: true },
  urbanStudies: { name: 'Urban Studies & Planning', icon: '🗺️', fields: ['planning', 'municipalAdmin', 'realestate'], levels: ['bachelor', 'master'] },
  fireScience: { name: 'Fire Science / EMS', icon: '🚒', fields: ['fire', 'ems'], levels: ['associate', 'bachelor'] },
  aviation: { name: 'Aviation / Aeronautics', icon: '✈️', fields: ['aviation'], levels: ['associate', 'bachelor'] },
  communications: { name: 'Communications', icon: '📣', fields: ['corporate', 'retail', 'foreignService', 'municipalAdmin'], levels: ['bachelor'] },
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
  culinaryArts: { name: 'Culinary Arts Diploma', type: 'vocational', years: 1, requires: { level: 'highschool' }, schools: ['technical'], costFactor: 1, fields: ['culinary'] },
  associate: { name: "Associate's Degree", type: 'associate', years: 2, requires: { level: 'highschool' }, major: 'choose', schools: ['community', 'online'], costFactor: 1 },
  bachelor: { name: "Bachelor's Degree", type: 'bachelor', years: 4, requires: { level: 'highschool' }, major: 'choose', schools: ['online', 'state', 'private', 'elite'], costFactor: 1 },
  master: { name: "Master's Degree", type: 'master', years: 2, requires: { level: 'bachelor' }, major: 'choose', schools: ['online', 'state', 'private', 'elite'], costFactor: 1.1, minSmarts: 45, minGpa: 2.8 },
  mba: { name: 'Master of Business Administration', type: 'master', years: 2, requires: { level: 'bachelor' }, major: 'business', schools: ['online', 'state', 'private', 'elite'], costFactor: 1.4, minSmarts: 50, minGpa: 2.8, fields: ['corporate', 'finance'] },
  mpa: { name: 'Master of Public Administration', type: 'master', years: 2, requires: { level: 'bachelor' }, major: 'publicAdministration', schools: ['online', 'state', 'elite'], costFactor: 1.1, minSmarts: 45, minGpa: 2.8, fields: ['municipalAdmin', 'regulatory', 'publicWorks', 'planning'] },
  msAccounting: { name: 'M.S. Accounting', type: 'master', years: 1, requires: { level: 'bachelor' }, major: 'accounting', schools: ['state', 'private'], costFactor: 1.1, minSmarts: 50, fields: ['accounting'] },
  jd: { name: 'Juris Doctor (Law School)', type: 'professional', years: 3, requires: { level: 'bachelor' }, major: null, schools: ['state', 'private', 'elite'], costFactor: 1.5, minSmarts: 60, minGpa: 3.0, fields: ['law'] },
  md: { name: 'Doctor of Medicine (Medical School)', type: 'professional', years: 4, requires: { anyOf: [{ level: 'bachelor', majors: SCIENCE_MAJORS }, { program: 'premedPostbacc' }] }, major: null, schools: ['state', 'private', 'elite'], costFactor: 1.6, minSmarts: 70, minGpa: 3.3, fields: ['medical'] },
  phd: { name: 'Doctor of Philosophy (Ph.D.)', type: 'doctorate', years: 5, requires: { level: 'bachelor' }, major: 'choose', majorLevel: 'master', schools: ['state', 'elite'], costFactor: 0, stipend: 32000, minSmarts: 75, minGpa: 3.4 },
};

export const PROGRAM_GROUPS = [
  { label: 'Certificates & Trade Diplomas', ids: ['paralegal', 'electricalTech', 'culinaryArts', 'teacherPrep', 'premedPostbacc'] },
  { label: 'Undergraduate Degrees', ids: ['associate', 'bachelor'] },
  { label: 'Graduate & Professional School', ids: ['master', 'mba', 'mpa', 'msAccounting', 'jd', 'md', 'phd'] },
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
  const name = degree.type === 'highschool' ? 'High School Diploma' : degree.type === 'ged' ? 'GED' : program?.name ?? degree.type;
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
