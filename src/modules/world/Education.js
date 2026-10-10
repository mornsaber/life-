/**
 * Schools, fees and licenses abroad.
 *
 *   tuition   yearly tuition by school type (PPP dollars, 2025 domestic fees)
 *   schools   what each school type is called there
 *   freeIn    provinces where public university is free for residents (Scotland)
 *   loans     'icr': income-contingent repayment (the UK: 9% of income over the threshold,
 *             written off after 40 years); otherwise the standard amortizing loan
 *   words     school stages and exams (high school → A-levels, Abitur, Maturità…)
 *   licenses  US credential names → the country's own licensing (bar, medical, accounting, driving…)
 */

export const EDUCATION = {
  CA: {
    tuition: { community: 3300, technical: 4500, online: 5500, state: 6100, private: 9000, elite: 7000 },
    schools: { community: 'Seneca Polytechnic', technical: 'Northern Alberta Institute of Technology', online: 'Athabasca University', state: 'Provincial University', private: 'Trinity Western University', elite: 'University of Toronto', academy: 'Royal Military College of Canada' },
    words: { GED: 'GED (adult high school diploma)' },
    licenses: { 'State Bar License': 'Law Society licence (bar admission)', 'Medical License (MD)': 'Medical licence (MCCQE)', 'Certified Public Accountant (CPA)': 'Chartered Professional Accountant (CPA Canada)', 'Peace Officer (POST Basic Academy)': 'Police College (Basic Constable Training)', 'Commercial Driver License (Class A)': 'Class 1 commercial licence', 'Commercial Driver License (Class B)': 'Class 3 commercial licence', "Driver's License (Class D)": "Driver's licence (Class G/5)", 'Professional Engineer (PE)': 'Professional Engineer (P.Eng.)', 'Engineer in Training (FE exam)': 'Engineer-in-Training (EIT)', 'EMT (NREMT)': 'Primary Care Paramedic (PCP)', 'Paramedic (NRP)': 'Advanced Care Paramedic (ACP)', 'Pharmacist License (NAPLEX + MPJE)': 'Pharmacist licence (PEBC)' },
  },
  GB: {
    tuition: { community: 0, technical: 0, online: 7400, state: 14000, private: 18000, elite: 14000 },
    freeIn: ['GB-SCT'],
    loans: 'icr',
    // Plan 5 (2023+): 9% of income above £25,000, written off after 40 years.
    loanThreshold: 36760,
    schools: { community: 'City College (Further Education)', technical: 'Technical College', online: 'The Open University', state: 'Redbrick University', private: 'University of Buckingham', elite: 'Oxbridge', academy: 'Royal Military Academy Sandhurst' },
    words: { 'High School': 'Secondary School', 'high-school diploma': 'A-levels', 'high school': 'secondary school', GED: 'Access to HE Diploma' },
    licenses: { 'State Bar License': 'Solicitor qualification (SQE)', 'Medical License (MD)': 'GMC registration (MBBS)', 'Board Certification': 'Specialist registration (CCT)', 'Certified Public Accountant (CPA)': 'Chartered Accountant (ACA)', 'Peace Officer (POST Basic Academy)': 'Police Constable Degree Apprenticeship', 'Registered Nurse (RN)': 'NMC registered nurse', 'Commercial Driver License (Class A)': 'HGV Class 1 (C+E) licence', 'Commercial Driver License (Class B)': 'HGV Class 2 (C) licence', "Driver's License (Class D)": 'Full UK driving licence', "Learner's Permit": 'Provisional driving licence', 'Professional Engineer (PE)': 'Chartered Engineer (CEng)', 'Engineer in Training (FE exam)': 'Incorporated Engineer (IEng)', 'EMT (NREMT)': 'Emergency Care Assistant', 'Paramedic (NRP)': 'HCPC registered paramedic', 'Pharmacist License (NAPLEX + MPJE)': 'GPhC registered pharmacist', 'Licensed Clinical Social Worker (LCSW)': 'Social Work England registration' },
  },
  DE: {
    // Public universities charge only a semester fee (≈€300); apprenticeships pay a wage.
    tuition: { community: 0, technical: 0, online: 2500, state: 830, private: 14000, elite: 830 },
    schools: { community: 'Volkshochschule', technical: 'Berufsschule (dual apprenticeship)', online: 'FernUniversität in Hagen', state: 'Universität', private: 'Private Hochschule', elite: 'TU München', academy: 'Universität der Bundeswehr' },
    words: { 'High School': 'Gymnasium', 'high-school diploma': 'Abitur', 'high school': 'Gymnasium', GED: 'Abitur at an Abendgymnasium' },
    licenses: { 'State Bar License': 'Zweites Staatsexamen (Volljurist)', 'Medical License (MD)': 'Approbation als Arzt', 'Board Certification': 'Facharzt', 'Certified Public Accountant (CPA)': 'Steuerberater / Wirtschaftsprüfer', 'Peace Officer (POST Basic Academy)': 'Polizeiausbildung (Landespolizei)', 'Registered Nurse (RN)': 'Pflegefachfrau / Pflegefachmann', 'Commercial Driver License (Class A)': 'Führerschein Klasse CE', 'Commercial Driver License (Class B)': 'Führerschein Klasse C', "Driver's License (Class D)": 'Führerschein Klasse B', "Learner's Permit": 'Begleitetes Fahren ab 17', 'Professional Engineer (PE)': 'Beratender Ingenieur', 'EMT (NREMT)': 'Rettungssanitäter', 'Paramedic (NRP)': 'Notfallsanitäter', 'Pharmacist License (NAPLEX + MPJE)': 'Approbation als Apotheker' },
  },
  JP: {
    tuition: { community: 4000, technical: 8000, online: 2500, state: 5600, private: 10400, elite: 5600 },
    schools: { community: 'Junior college (tanki daigaku)', technical: 'Senmon gakkō (vocational school)', online: 'The Open University of Japan', state: 'National university', private: 'Private university', elite: 'University of Tokyo', academy: 'National Defense Academy' },
    words: { GED: 'Kōsotsu Nintei (high school equivalency exam)' },
    licenses: { 'State Bar License': 'Bengoshi (bar exam + Legal Training)', 'Medical License (MD)': 'National Medical Licensing Exam', 'Certified Public Accountant (CPA)': 'CPA (Kōnin Kaikeishi)', 'Peace Officer (POST Basic Academy)': 'Prefectural Police Academy', 'Registered Nurse (RN)': 'Kangoshi (national nursing license)', 'Commercial Driver License (Class A)': 'Ōgata menkyo (large vehicle license)', "Driver's License (Class D)": 'Futsū menkyo (ordinary license)', 'Professional Engineer (PE)': 'Gijutsushi (Professional Engineer)', 'EMT (NREMT)': 'Fire department EMT', 'Paramedic (NRP)': 'Kyūkyū kyūmei-shi (paramedic)', 'Pharmacist License (NAPLEX + MPJE)': 'Yakuzaishi (pharmacist license)' },
  },
  KR: {
    tuition: { community: 3500, technical: 3000, online: 900, state: 5100, private: 9600, elite: 7300 },
    schools: { community: 'Junior college', technical: 'Meister polytechnic', online: 'Korea National Open University', state: 'National university', private: 'Private university', elite: 'Seoul National University', academy: 'Korea Military Academy' },
    words: { GED: 'Geomjeong-gosi (high school equivalency exam)' },
    licenses: { 'State Bar License': 'Byeonhosa (bar exam after law school)', 'Medical License (MD)': 'Korean Medical Licensing Examination', 'Certified Public Accountant (CPA)': 'KICPA', 'Peace Officer (POST Basic Academy)': 'Central Police Academy', 'Registered Nurse (RN)': 'Ganhosa (registered nurse)', 'Commercial Driver License (Class A)': 'Class 1 large vehicle license', "Driver's License (Class D)": 'Class 2 ordinary license', 'Pharmacist License (NAPLEX + MPJE)': 'Yaksa (pharmacist license)' },
  },
  IT: {
    tuition: { community: 0, technical: 0, online: 4000, state: 2300, private: 23000, elite: 6000 },
    schools: { community: 'ITS Academy', technical: 'Istituto Tecnico Superiore', online: 'Università telematica', state: 'Università statale', private: 'Università privata', elite: 'Politecnico di Milano', academy: 'Accademia Militare di Modena' },
    words: { 'High School': 'Liceo', 'high-school diploma': 'Maturità', 'high school': 'liceo', GED: 'Maturità (as a privatista)' },
    licenses: { 'State Bar License': 'Abilitazione forense (avvocato)', 'Medical License (MD)': 'Abilitazione medica (Ordine dei Medici)', 'Board Certification': 'Scuola di specializzazione', 'Certified Public Accountant (CPA)': 'Dottore Commercialista', 'Peace Officer (POST Basic Academy)': 'Scuola Allievi Agenti', 'Registered Nurse (RN)': 'Infermiere (OPI)', 'Commercial Driver License (Class A)': 'Patente CE + CQC', "Driver's License (Class D)": 'Patente B', 'Professional Engineer (PE)': 'Ingegnere iscritto all\'Albo', 'Pharmacist License (NAPLEX + MPJE)': 'Abilitazione farmacista' },
  },
  MX: {
    tuition: { community: 500, technical: 300, online: 0, state: 500, private: 28500, elite: 500 },
    schools: { community: 'Universidad Tecnológica', technical: 'CONALEP', online: 'Universidad Abierta y a Distancia', state: 'Universidad estatal', private: 'Universidad privada', elite: 'UNAM', academy: 'Heroico Colegio Militar' },
    words: { 'High School': 'Preparatoria', 'high-school diploma': 'bachillerato certificate', 'high school': 'prepa', GED: 'Prepa Abierta' },
    licenses: { 'State Bar License': 'Cédula profesional (Licenciado en Derecho)', 'Medical License (MD)': 'Cédula profesional de médico', 'Board Certification': 'Especialidad (ENARM + residency)', 'Certified Public Accountant (CPA)': 'Contador Público Certificado', 'Peace Officer (POST Basic Academy)': 'Police academy (formación inicial)', 'Registered Nurse (RN)': 'Licenciatura en Enfermería', 'Commercial Driver License (Class A)': 'Licencia federal de conductor', "Driver's License (Class D)": 'Licencia de conducir tipo A', 'Professional Engineer (PE)': 'Cédula de ingeniero' },
  },
  PH: {
    // State universities and colleges are tuition-free (RA 10931).
    tuition: { community: 0, technical: 0, online: 1500, state: 0, private: 4100, elite: 0 },
    schools: { community: 'TESDA training center', technical: 'Polytechnic college', online: 'UP Open University', state: 'State university (SUC)', private: 'Private university', elite: 'University of the Philippines Diliman', academy: 'Philippine Military Academy' },
    words: { 'High School': 'Senior High School', GED: 'ALS Accreditation & Equivalency exam' },
    licenses: { 'State Bar License': 'Philippine Bar Examination', 'Medical License (MD)': 'PRC Physician Licensure Exam', 'Certified Public Accountant (CPA)': 'CPA (PRC Board of Accountancy)', 'Peace Officer (POST Basic Academy)': 'PNP Academy', 'Registered Nurse (RN)': 'PRC Nurse Licensure Exam', 'Commercial Driver License (Class A)': 'LTO professional license', "Driver's License (Class D)": 'LTO non-professional license', 'Professional Engineer (PE)': 'PRC Engineer Licensure' },
  },
  IN: {
    tuition: { community: 900, technical: 300, online: 600, state: 900, private: 11000, elite: 9100 },
    schools: { community: 'Polytechnic', technical: 'Industrial Training Institute (ITI)', online: 'IGNOU', state: 'State university', private: 'Private university', elite: 'IIT', academy: 'National Defence Academy' },
    words: { 'High School': 'Senior Secondary School', 'high-school diploma': 'Class XII certificate', 'high school': 'senior secondary school', GED: 'NIOS Class XII' },
    licenses: { 'State Bar License': 'Bar Council enrolment (AIBE)', 'Medical License (MD)': 'MBBS + State Medical Council registration', 'Board Certification': 'MD/MS specialization (NEET-PG)', 'Certified Public Accountant (CPA)': 'Chartered Accountant (ICAI)', 'Peace Officer (POST Basic Academy)': 'Police Training Academy', 'Registered Nurse (RN)': 'B.Sc. Nursing + Nursing Council registration', 'Commercial Driver License (Class A)': 'Transport vehicle licence (HMV)', "Driver's License (Class D)": 'Driving licence (LMV)', 'Professional Engineer (PE)': 'Chartered Engineer (IEI)' },
  },
};

/** The US catalog's school names (education/Catalog.js), swapped for local ones on screen. */
export const US_SCHOOL_NAMES = { community: 'Riverside Community College', technical: 'Metro Technical Institute', online: 'Summit Online University', state: 'State University', private: 'Whitmore College', academy: 'U.S. Service Academy', elite: 'Ivy Crest University' };

/** Display swaps for a country: school names, school stages and license names. */
export function educationTerms(countryId) {
  const e = EDUCATION[countryId];
  if (!e) return {};
  const schools = Object.fromEntries(Object.entries(e.schools).map(([k, v]) => [US_SCHOOL_NAMES[k], v]).filter(([k]) => k));
  return { ...schools, ...(e.words ?? {}), ...(e.licenses ?? {}) };
}

/** Tuition at a school type where you live, or null to use the US price. */
export function localTuition(countryId, provinceId, schoolId) {
  const e = EDUCATION[countryId];
  if (!e) return null;
  if (e.freeIn?.includes(provinceId) && ['state', 'elite', 'community', 'technical'].includes(schoolId)) return 0;
  return e.tuition[schoolId] ?? null;
}
