import { fromPacks, fromPacksNested } from './packs/index.js';
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
    writeOffAge: 61,
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
  AU: {
    // Commonwealth-supported places (≈A$9,000 a year) paid through HECS-HELP: repaid from income over A$67,000.
    tuition: { community: 1400, technical: 1400, online: 6200, state: 6200, private: 27600, elite: 6200 },
    loans: 'icr',
    loanThreshold: 46200,
    loanRate: 0.15,
    schools: { community: 'TAFE NSW', technical: 'TAFE Queensland', online: 'Open Universities Australia', state: 'State university', private: 'Bond University', elite: 'University of Melbourne (Group of Eight)', academy: 'Australian Defence Force Academy (ADFA)' },
    words: { 'high-school diploma': 'Higher School Certificate (HSC)', GED: 'Certificate IV in Tertiary Preparation' },
    licenses: { 'State Bar License': 'Admission as a lawyer (Supreme Court)', 'Medical License (MD)': 'AHPRA medical registration', 'Board Certification': 'Specialist fellowship (FRACP/FRACS)', 'Certified Public Accountant (CPA)': 'Chartered Accountant (CA ANZ)', 'Peace Officer (POST Basic Academy)': 'Police Academy recruit training', 'Registered Nurse (RN)': 'AHPRA registered nurse', 'Commercial Driver License (Class A)': 'Heavy combination (HC) licence', 'Commercial Driver License (Class B)': 'Heavy rigid (HR) licence', "Driver's License (Class D)": 'Driver licence (Class C)', "Learner's Permit": 'Learner licence (L plates)', 'Professional Engineer (PE)': 'Chartered Professional Engineer (CPEng)', 'EMT (NREMT)': 'Ambulance first responder', 'Paramedic (NRP)': 'AHPRA registered paramedic', 'Pharmacist License (NAPLEX + MPJE)': 'AHPRA registered pharmacist' },
  },
  FR: {
    // Public universities: €175 a year; business schools charge far more; grandes écoles select by concours.
    tuition: { community: 250, technical: 0, online: 1000, state: 250, private: 19700, elite: 3000 },
    schools: { community: 'IUT (BUT)', technical: 'Lycée professionnel / CFA', online: 'CNED', state: 'Université publique', private: 'École de commerce', elite: 'Grande école (Polytechnique, ENS)', academy: 'École spéciale militaire de Saint-Cyr' },
    words: { 'High School': 'Lycée', 'high-school diploma': 'baccalauréat', 'high school': 'lycée', GED: 'DAEU' },
    licenses: { 'State Bar License': 'CAPA (avocat)', 'Medical License (MD)': 'Diplôme d\'État de docteur en médecine', 'Board Certification': 'DES (spécialité)', 'Certified Public Accountant (CPA)': 'Expert-comptable (DEC)', 'Peace Officer (POST Basic Academy)': 'École nationale de police', 'Registered Nurse (RN)': 'Diplôme d\'État infirmier', 'Commercial Driver License (Class A)': 'Permis C+E', 'Commercial Driver License (Class B)': 'Permis C', "Driver's License (Class D)": 'Permis B', "Learner's Permit": 'Conduite accompagnée (AAC)', 'Professional Engineer (PE)': 'Diplôme d\'ingénieur (CTI)', 'EMT (NREMT)': 'Diplôme d\'État d\'ambulancier', 'Pharmacist License (NAPLEX + MPJE)': 'Diplôme d\'État de docteur en pharmacie' },
  },
  IN: {
    tuition: { community: 900, technical: 300, online: 600, state: 900, private: 11000, elite: 9100 },
    schools: { community: 'Polytechnic', technical: 'Industrial Training Institute (ITI)', online: 'IGNOU', state: 'State university', private: 'Private university', elite: 'IIT', academy: 'National Defence Academy' },
    words: { 'High School': 'Senior Secondary School', 'high-school diploma': 'Class XII certificate', 'high school': 'senior secondary school', GED: 'NIOS Class XII' },
    licenses: { 'State Bar License': 'Bar Council enrolment (AIBE)', 'Medical License (MD)': 'MBBS + State Medical Council registration', 'Board Certification': 'MD/MS specialization (NEET-PG)', 'Certified Public Accountant (CPA)': 'Chartered Accountant (ICAI)', 'Peace Officer (POST Basic Academy)': 'Police Training Academy', 'Registered Nurse (RN)': 'B.Sc. Nursing + Nursing Council registration', 'Commercial Driver License (Class A)': 'Transport vehicle licence (HMV)', "Driver's License (Class D)": 'Driving licence (LMV)', 'Professional Engineer (PE)': 'Chartered Engineer (IEI)' },
  },
};
fromPacks(EDUCATION, 'EDUCATION');

/** The US catalog's school names (education/Catalog.js), swapped for local ones on screen. */
export const US_SCHOOL_NAMES = { community: 'Riverside Community College', technical: 'Metro Technical Institute', online: 'Summit Online University', state: 'State University', private: 'Whitmore College', academy: 'U.S. Service Academy', elite: 'Ivy Crest University' };

/** Display swaps for a country: school names, school stages and license names. */
/**
 * The two-year post-secondary qualification each country has in place of the
 * US associate's degree (null: none — Germany trains through apprenticeships).
 */
export const SHORT_CYCLE = {
  CA: 'College Diploma', GB: 'Foundation Degree / HND', DE: null, JP: 'Junior College Diploma (Tanki Daigaku)', KR: 'Junior College Diploma',
  IT: 'ITS Academy Diploma', MX: 'Técnico Superior Universitario (TSU)', PH: 'Associate\'s Degree', IN: 'Polytechnic Diploma', AU: 'Advanced Diploma (TAFE)', FR: 'BTS / BUT',
};
fromPacks(SHORT_CYCLE, 'SHORT_CYCLE');
/** Is a US-style two-year degree offered here? */
export const shortCycleOffered = (countryId) => !countryId || countryId === 'US' || SHORT_CYCLE[countryId] !== null;

/** US-branded certifications under neutral names everywhere else. */
const CREDENTIAL_TERMS = {
  'Driver\'s License (Class D)': 'Driving licence (car)', 'Commercial Driver License (Class A)': 'Heavy goods vehicle licence (articulated)', 'Commercial Driver License (Class B)': 'Heavy goods vehicle licence (rigid)',
  'Passenger Endorsement (P)': 'Bus & coach licence', 'School Bus Endorsement (S)': 'School bus driver certificate', 'HazMat Endorsement (H)': 'Dangerous goods (ADR) certificate', 'Learner\'s Permit': 'Learner licence',
  'EMT (NREMT)': 'Emergency Medical Technician', 'Paramedic (NRP)': 'Registered Paramedic', 'Reserve Peace Officer (POST Level II)': 'Reserve police training', 'Federal Law Enforcement Training (FLETC)': 'National police academy',
  'EPA Section 608 Refrigerant Certification': 'F-gas refrigerant certification', 'AWS Certified Welder': 'Certified welder', 'ASE Certified Technician': 'Certified vehicle technician', 'FAA Certified Professional Controller': 'Air traffic controller licence',
  'Senior Executive Service Certification (OPM QRB)': 'Senior civil service assessment', 'Aircraft Rescue & Firefighting (ARFF, FAA Part 139)': 'Aerodrome rescue & firefighting', 'USCG Master License (Fishing Vessels)': 'Fishing vessel skipper certificate',
  'FRA Certified Conductor (Part 242)': 'Train conductor certificate', 'FRA Certified Locomotive Engineer (Part 240)': 'Train driver licence', 'Security Guard License (Guard Card)': 'Security licence', 'TSA Screener Certification': 'Aviation security screener certificate',
  'APCO Public Safety Telecommunicator': 'Emergency call-handler training', 'State Teaching Certificate': 'Teaching qualification', 'Real Estate Salesperson License': 'Estate agent qualification', 'Real Estate Broker License': 'Licensed estate agency principal',
  'Insurance Producer License': 'Insurance adviser qualification', 'OSHA 30 Construction Safety': 'Construction site safety card', 'FINRA Series 7': 'Securities adviser licence', 'FINRA Series 66': 'Investment adviser licence',
  'IRS Enrolled Agent (EA)': 'Registered tax adviser', 'ICC Building Inspector': 'Building control surveyor', 'FAA First-Class Medical': 'Class 1 aviation medical', 'TWIC (Transportation Worker ID Card)': 'Port security pass',
  'Merchant Mariner Credential (MMC)': 'Seafarer\'s discharge book', 'ServSafe Food Protection Manager': 'Food hygiene certificate (supervisor)', 'Responsible Alcohol Server (TIPS)': 'Responsible alcohol service certificate',
  'SAG-AFTRA Membership': 'Actors\' union membership', 'FAA Remote Pilot (Part 107 Drone)': 'Drone operator certificate', 'Forklift Operator Certification (OSHA)': 'Forklift operator licence', 'HAZWOPER 40-Hour': 'Hazardous waste operations training',
  'U.S. Border Patrol Academy (Artesia)': 'Border guard training', 'FBI Academy (Quantico)': 'National investigators\' academy', 'DEA Academy (Quantico)': 'Drug enforcement training', 'NCCCO Certified Crane Operator': 'Certified crane operator',
  'NACA Animal Control Officer Certification': 'Animal welfare officer certificate', 'Foreign Language Proficiency (FSI 3/3)': 'Foreign language proficiency (C1)', 'Child Development Associate (CDA)': 'Early years childcare qualification',
  'Registered Architect (ARE)': 'Registered architect', 'Licensed Clinical Social Worker (LCSW)': 'Registered social worker', 'Pharmacist License (NAPLEX + MPJE)': 'Registered pharmacist', 'Physician Assistant (PA-C, PANCE)': 'Physician associate',
  'Veterinary License (NAVLE)': 'Veterinary registration', 'Dental License (DDS/DMD)': 'Dental registration', 'Certified Nursing Assistant (CNA)': 'Healthcare assistant certificate', 'Incident Command (ICS-300)': 'Incident command training',
  'Wildland Firefighter (FFT2, S-130/S-190)': 'Wildfire firefighter', 'Wildland Squad Boss (FFT1)': 'Wildfire crew leader', 'Journeyman Electrician License': 'Qualified electrician', 'Master Electrician License': 'Master electrician', 'Journeyman Plumber License': 'Qualified plumber', 'Master Plumber License': 'Master plumber',
  'Journeyman Lineman Card': 'Qualified line worker', 'Journeyman Carpenter Card': 'Qualified carpenter', 'Journeyman Ironworker Card': 'Qualified steel erector', 'Water / Wastewater Operator Certification': 'Water treatment operator certificate',
};
/** Where a country's own name is well known. */
const CREDENTIAL_LOCAL = {
  GB: { 'Driving licence (car)': 'Full UK driving licence (Category B)', 'Heavy goods vehicle licence (articulated)': 'LGV licence (Category C+E)', 'Heavy goods vehicle licence (rigid)': 'LGV licence (Category C)', 'Bus & coach licence': 'PCV licence (Category D)', 'Security licence': 'SIA licence', 'Construction site safety card': 'CSCS card', 'Learner licence': 'Provisional driving licence', 'Certified vehicle technician': 'IMI accredited technician' },
  DE: { 'Driving licence (car)': 'Führerschein Klasse B', 'Heavy goods vehicle licence (articulated)': 'Führerschein Klasse CE', 'Heavy goods vehicle licence (rigid)': 'Führerschein Klasse C', 'Bus & coach licence': 'Führerschein Klasse D', 'Qualified electrician': 'Elektroniker (Gesellenbrief)', 'Master electrician': 'Elektrotechnikermeister', 'Qualified plumber': 'Anlagenmechaniker SHK (Gesellenbrief)', 'Master plumber': 'Installateur- und Heizungsbauermeister' },
  AU: { 'Driving licence (car)': 'Driver licence (C class)', 'Heavy goods vehicle licence (articulated)': 'Heavy combination licence (HC)', 'Heavy goods vehicle licence (rigid)': 'Heavy rigid licence (HR)', 'Construction site safety card': 'White Card', 'Responsible alcohol service certificate': 'RSA certificate', 'Forklift operator licence': 'High risk work licence (forklift)' },
  CA: { 'Driving licence (car)': 'Driver\'s licence (Class G/5)', 'Heavy goods vehicle licence (articulated)': 'Commercial licence (Class A/1)', 'Heavy goods vehicle licence (rigid)': 'Commercial licence (Class D/3)' },
  FR: { 'Driving licence (car)': 'Permis B', 'Heavy goods vehicle licence (articulated)': 'Permis CE', 'Heavy goods vehicle licence (rigid)': 'Permis C', 'Bus & coach licence': 'Permis D' },
};
fromPacks(CREDENTIAL_LOCAL, 'CREDENTIAL_LOCAL');

export function educationTerms(countryId) {
  const e = EDUCATION[countryId];
  if (!e) return {};
  const schools = Object.fromEntries(Object.entries(e.schools).map(([k, v]) => [US_SCHOOL_NAMES[k], v]).filter(([k]) => k));
  const pro = PROFESSIONAL_DEGREES[countryId];
  const degrees = pro ? { 'Juris Doctor (Law School)': pro.jd, 'Doctor of Medicine (Medical School)': pro.md } : {};
  const short = SHORT_CYCLE[countryId] ? { 'Associate\'s Degree': SHORT_CYCLE[countryId], 'associate\'s degree': SHORT_CYCLE[countryId], ' (A.A.S.)': '', 'Associate\'s': SHORT_CYCLE[countryId] } : { ' (A.A.S.)': '' };
  // Neutral names first, then the country's own: chained, so 'CDL Class A' → 'HGV (articulated)' → 'LGV Category C+E'.
  const local = CREDENTIAL_LOCAL[countryId] ?? {};
  const creds = Object.fromEntries(Object.entries(CREDENTIAL_TERMS).map(([us, neutral]) => [us, local[neutral] ?? neutral]));
  return { ...creds, ...schools, ...degrees, ...short, ...(e.words ?? {}), ...(e.licenses ?? {}) };
}

/** Tuition at a school type where you live, or null to use the US price. */
export function localTuition(countryId, provinceId, schoolId) {
  const e = EDUCATION[countryId];
  if (!e) return null;
  if (e.freeIn?.includes(provinceId) && ['state', 'elite', 'community', 'technical'].includes(schoolId)) return 0;
  return e.tuition[schoolId] ?? null;
}

/**
 * Where law and medicine are first degrees, entered straight from school (the LLB, the MBBS,
 * the Staatsexamen), with their length; elsewhere (the US, Canada, Korea's law schools, the
 * Philippines) they follow a bachelor's.
 */
export const UNDERGRAD_ENTRY = {
  jd: { GB: 3, IN: 5, AU: 4, DE: 5, FR: 5, IT: 5, JP: 4, MX: 5 },
  md: { GB: 5, IN: 5, AU: 6, DE: 6, FR: 6, IT: 6, JP: 6, KR: 6, MX: 6 },
};
fromPacksNested(UNDERGRAD_ENTRY, 'UNDERGRAD_ENTRY');
export const undergradEntryYears = (countryId, programId) => UNDERGRAD_ENTRY[programId]?.[countryId] ?? null;
/** The local names of the law and medical degrees. */
export const PROFESSIONAL_DEGREES = {
  GB: { jd: 'LLB (Bachelor of Laws)', md: 'MBBS (Bachelor of Medicine)' },
  IN: { jd: 'LLB (5-year integrated)', md: 'MBBS' },
  AU: { jd: 'LLB (Bachelor of Laws)', md: 'MBBS / MD' },
  DE: { jd: 'Rechtswissenschaft (Erstes Staatsexamen)', md: 'Medizin (Staatsexamen)' },
  FR: { jd: 'Master en droit', md: 'Diplôme d\'État de docteur en médecine' },
  IT: { jd: 'Laurea magistrale in Giurisprudenza', md: 'Laurea in Medicina e Chirurgia' },
  JP: { jd: 'Faculty of Law (hōgakubu) and the bar exam', md: 'Faculty of Medicine (6-year)' },
  KR: { jd: 'Law School (JD)', md: 'College of Medicine (6-year)' },
  MX: { jd: 'Licenciatura en Derecho', md: 'Médico Cirujano' },
  PH: { jd: 'Juris Doctor (Law School)', md: 'Doctor of Medicine' },
  CA: { jd: 'Juris Doctor (Law School)', md: 'Doctor of Medicine' },
};
fromPacks(PROFESSIONAL_DEGREES, 'PROFESSIONAL_DEGREES');
