/**
 * Kenya, built on the Philippines: a presidential republic with 47 devolved
 * counties (each with a governor and assembly running health, fire and
 * ambulance services), one National Police Service, teachers employed
 * nationally by the Teachers Service Commission, NSSF savings and the new
 * Social Health Authority, a very large informal economy, and the Kenya
 * Defence Forces on the African Union mission in Somalia.
 *
 * Amounts are shillings converted at 2023 PPP (KSh47 per US$), 2025 rates.
 * See docs/ADDING-A-COUNTRY.md for the shape of a pack.
 */

const KES = 47;
const ppp = (local) => Math.round(local / KES);
const cmd = (top, steps, head) => ({ ...Object.fromEntries(steps.map((t, i) => [`${top}_cmd${i + 1}`, t])), [top]: head });
const sf = (name, course, unitName, badge, desc, deployments) => ({ name, course, unitName, badge, desc, deployments });
const R = (...colors) => colors.map((c) => [c, 1]);
const county = (name, extra = {}) => ({ name, incomeTax: [], propertyTax: 0.01, salesTax: 0.16, rightToWork: false, cannabis: false, dui: { fineMult: 1, suspendYears: 1 }, minWage: ppp(16000 * 12 / 2080), population: 'medium', disasters: { flood: 0.05 }, ...extra });
const ENLISTED = ['Private', 'Lance Corporal', 'Corporal', 'Sergeant', 'Senior Sergeant', 'Warrant Officer II', 'Warrant Officer I', 'Regimental Sergeant Major', 'Chief Warrant Officer (KDF)'];
const OFFICERS = ['Second Lieutenant', 'Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier', 'Major General', 'Lieutenant General', 'General'];
const town = (c) => c.split(',')[0];
const only = (mine) => (b) => ({ ...Object.fromEntries(Object.keys(b ?? {}).map((k) => [k, null])), ...mine });

export const KE = {
  id: 'KE',
  basedOn: 'PH',
  groups: ['COMMON_LAW'],
  agreements: [],
  licenceExchange: [],
  peers: [],
  country: {
    name: 'Kenya',
    flag: '🇰🇪',
    demonym: 'Kenyan',
    capital: 'Nairobi',
    currency: { code: 'KES', symbol: 'KSh', perUsd: KES },
    languages: ['English', 'Swahili'],
    emergency: '999 / 112',
    retirementAge: 60,
    informality: 0.83,
    tax: {
      // PAYE 2025: personal relief cancels the 10% band on the first KSh288,000; then 25%, 30%, 32.5% and 35%.
      allowance: ppp(288000),
      brackets: [[ppp(100000), 0.25], [ppp(5612000), 0.3], [ppp(3600000), 0.325], [Infinity, 0.35]],
      contributions: [{ name: 'NSSF', rate: 0.06, from: 0, to: ppp(864000) }, { name: 'SHIF', rate: 0.0275, from: 0, to: Infinity }, { name: 'Affordable Housing Levy', rate: 0.015, from: 0, to: Infinity }],
      label: 'Kenya Revenue Authority',
    },
    // NSSF: 6% + 6% into your fund account, paid out from 60.
    pension: { kind: 'account', name: 'NSSF pension', rate: 0.12, growth: 0.05, cap: ppp(864000), annuity: 15, flat: 0, ages: [50, 60] },
    health: { name: 'the Social Health Authority (SHA)', short: 'SHA', deductible: 0, coinsurance: 0.3, oopMax: ppp(250000) },
    childBenefit: { amount: 0, phaseOutFrom: Infinity, name: 'no child benefit' },
    terms: {
      'Federal government': 'National Government', 'State government': 'County Government', 'Federal income tax': 'PAYE', 'State income tax': 'PAYE',
      'Social Security': 'NSSF', '401(k)': 'occupational pension scheme', IRA: 'individual pension plan', IRS: 'KRA', Medicaid: 'SHA', Medicare: 'SHA', 'GI Bill': 'KDF education support',
      'SSS pension': 'NSSF pension', SSS: 'NSSF', PhilHealth: 'SHA', 'Pag-IBIG': 'Housing Levy',
    },
    names: {
      male: ['Brian', 'Kevin', 'Dennis', 'Collins', 'Victor', 'Ian', 'Felix', 'Samuel', 'Joseph', 'Peter', 'Hassan', 'Omar', 'Kiprotich', 'Otieno', 'Kamau', 'Wekesa'],
      female: ['Faith', 'Mercy', 'Sharon', 'Esther', 'Grace', 'Joy', 'Purity', 'Cynthia', 'Wanjiru', 'Akinyi', 'Achieng', 'Njeri', 'Amina', 'Halima', 'Nafula', 'Wairimu'],
      last: ['Kamau', 'Otieno', 'Mwangi', 'Odhiambo', 'Kipchumba', 'Wanjiku', 'Ochieng', 'Kiprop', 'Njoroge', 'Mutua', 'Omondi', 'Kariuki', 'Chebet', 'Wafula', 'Hassan', 'Mohamed'],
    },
    provinces: {
      'KE-NBI': county('Nairobi City County', { population: 'enterprise', disasters: { flood: 0.06 } }),
      'KE-MBA': county('Mombasa County', { population: 'large', disasters: { flood: 0.05 } }),
      'KE-KSM': county('Kisumu County', { disasters: { flood: 0.08 } }),
      'KE-NKU': county('Nakuru County', { population: 'large' }),
      'KE-UGI': county('Uasin Gishu County'),
      'KE-KBU': county('Kiambu County', { population: 'large' }),
    },
    cities: {
      nairobi: { name: 'Nairobi', icon: '🌆', type: 'High-cost metro', state: 'KE-NBI', col: 0.8, market: 0.6, locality: 0.16, transit: 30, fare: ppp(36000), walkable: false, size: 'enterprise', population: [4400000, 6500000] },
      mombasa: { name: 'Mombasa', icon: '🏝️', type: 'Coastal metro', state: 'KE-MBA', col: 0.65, market: 0.45, locality: 0.13, transit: 20, fare: ppp(30000), walkable: true, size: 'large', population: [1200000, 1300000] },
      kisumu: { name: 'Kisumu', icon: '🐟', type: 'Mid-size city', state: 'KE-KSM', col: 0.55, market: 0.4, locality: 0.12, transit: 10, fare: ppp(24000), walkable: true, size: 'medium', population: [600000, 1150000] },
      nakuru: { name: 'Nakuru', icon: '🦩', type: 'Mid-size city', state: 'KE-NKU', col: 0.55, market: 0.4, locality: 0.12, transit: 10, fare: ppp(24000), walkable: true, size: 'medium', population: [570000, 2200000] },
      eldoret: { name: 'Eldoret', icon: '🏃', type: 'Mid-size city', state: 'KE-UGI', col: 0.52, market: 0.38, locality: 0.12, transit: 8, fare: ppp(22000), walkable: true, size: 'medium', population: [475000, 1160000] },
      thika: { name: 'Thika', icon: '🍍', type: 'Small city', state: 'KE-KBU', col: 0.55, market: 0.4, locality: 0.12, transit: 15, fare: ppp(24000), walkable: true, size: 'small', population: [250000, 2400000] },
    },
    hometowns: ['nairobi', 'nairobi', 'nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret', 'thika'],
    population: { 'KE-NBI': 4.4e6, 'KE-MBA': 1.2e6, 'KE-KSM': 1.15e6, 'KE-NKU': 2.2e6, 'KE-UGI': 1.16e6, 'KE-KBU': 2.4e6 },
  },
  offices: {
    ke_mca: { country: 'KE', name: 'Member of County Assembly (MCA)', icon: '🏛️', level: 3, term: 5, termLimit: 0, salary: 30000, minAge: 18, residency: 1, cost: 40000, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    ke_governor: { country: 'KE', name: 'County Governor', icon: '⭐', level: 4, term: 5, termLimit: 2, salary: 60000, minAge: 35, residency: 1, cost: 1500000, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true },
    ke_mp: { country: 'KE', name: 'Member of the National Assembly', icon: '🏛️', level: 4, term: 5, termLimit: 0, salary: 75000, minAge: 18, residency: 1, cost: 400000, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    ke_senator: { country: 'KE', name: 'Senator', icon: '🏛️', level: 4, term: 5, termLimit: 0, salary: 75000, minAge: 18, residency: 1, cost: 800000, statewide: true, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    ke_president: { country: 'KE', name: 'President of Kenya', icon: '🇰🇪', level: 5, term: 5, termLimit: 2, salary: 110000, minAge: 35, residency: 1, cost: 20000000, statewide: true, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true },
  },
  tables: {
    /* Law and money */
    JUSTICE: { trial: 'bench', sentence: 0.9, jail: (c) => `${town(c)} remand prison`, prison: 'a Kenya Prisons Service prison', legalAid: 'a National Legal Aid Service advocate', privatePrisons: 0 },
    INSOLVENCY: { liquidation: { name: 'Bankruptcy (Insolvency Act 2015)', wait: 3 }, plan: { name: 'No-asset procedure / voluntary arrangement', years: 3, wait: 2 }, homestead: 0, wildcard: ppp(100000), creditYears: 5 },
    INHERITANCE: { name: 'no inheritance tax', exemption: Infinity, brackets: [[Infinity, 0]] },
    UNEMPLOYMENT: { name: 'no unemployment benefit', flat: 0, years: 0 },
    SEVERANCE: { perYear: 15 / 365, base: 0 },
    DISABILITY: { name: 'NSSF invalidity benefit', rate: 0.3, floor: ppp(60000), cap: ppp(600000), minYears: 3, odds: 0.7, stages: ['Medical board', 'Review', 'Employment and Labour Relations Court'] },
    SELF_EMPLOYED: { name: 'NSSF voluntary contributions', rate: 0.06, cap: ppp(864000) },
    CREDIT: { name: 'credit report (Credit Reference Bureau)' },
    SMALL_BIZ_LOAN: 'Hustler Fund / SME bank loan',
    VETERANS: { orgs: ['Kenya Armed Forces Old Comrades Association'], care: 'the Defence Forces Memorial Hospital' },
    STOCK_INDEX: 'NSE 20 Share Index',
    MORTGAGES: { closing: 0.04, stress: 0.03, products: { kmrc: { name: 'KMRC-backed mortgage (25-yr)', years: 25, rateAdj: 0.03, minDown: 0.1, minScore: 550, maxDti: 0.33 }, bank: { name: 'Commercial mortgage (20-yr)', years: 20, rateAdj: 0.06, minDown: 0.2, minScore: 620, maxDti: 0.33 } } },
    UNIONS: { police: null, fire: 'Kenya County Government Workers Union (fire)', ems: 'Kenya County Government Workers Union', health: 'Kenya National Union of Nurses', education: 'Kenya National Union of Teachers', public: 'Union of Kenya Civil Servants', prisons: null, transport: 'Transport Workers Union of Kenya', rail: 'Railway Workers Union', aviation: 'Kenya Aviation Workers Union', pilots: 'Kenya Airline Pilots Association', trades: 'Kenya Building, Construction, Timber and Furniture Industries Employees Union', industry: 'Central Organization of Trade Unions (COTU)', retail: 'Kenya Union of Commercial, Food and Allied Workers', hospitality: 'Kenya Union of Domestic, Hotels, Educational Institutions and Hospitals Workers', services: 'COTU', media: 'Kenya Union of Journalists', tech: 'COTU', arts: null, postal: 'Communication Workers Union' },
    CADETS: { jrotc: 'Kenya Scouts / National Youth Service cadets', seaCadets: null },
    FOREIGN_SERVICE_EXAM: 'Public Service Commission (foreign service) recruitment',
    PROSECUTORS: ['Office of the Director of Public Prosecutions (ODPP)', 'National Legal Aid Service', 'Probation and Aftercare Service'],
    VOLUNTEER_SERVICES: { fire: 'County fire volunteers', police: 'Police Reservist', sar: 'Kenya Red Cross search and rescue', ambulance: 'St John Ambulance Kenya', wildland: 'Kenya Forest Service community scouts', auxiliary: null, cap: null, cert: 'Nyumba Kumi community safety', redcross: 'Kenya Red Cross Society', skiPatrol: null, mrc: null },
    VOLUNTEER_PARENTS: { police: { name: 'the National Police Service', level: 'national', funds: 0.6, grant: null } },
    NATIONAL_SERVICE: { overseas: null, domestic: 'National Youth Service (NYS)' },
    ACCOUNTS: { dc: 'Occupational pension scheme', roth: { name: 'Money market fund / stocks', limit: ppp(5000000) }, traditional: { name: 'Individual pension plan', limit: ppp(360000), share: 0.3 } },
    REFERENDUMS: {},
    ENTRANCE_EXAMS: { name: 'KCSE (KUCCPS placement)', prep: { name: 'tuition and revision camps', cost: ppp(40000) }, weight: 0.9 },
    AVIATION_AUTHORITY: 'Kenya Civil Aviation Authority',
    COUNTY: 'County',
    LONG_TERM_CARE: { name: 'family care (no public long-term care)', covers: 0, safetyNet: 'Inua Jamii cash transfers' },
    WORKPLACE: { equality: 'the Employment and Labour Relations Court', reservist: 'Employment Act job protection', labourBoard: 'the Employment and Labour Relations Court' },
    EQUIPMENT: { 'Digital radio + body camera kit': 'Police radio', 'Patrol sedan': 'Patrol car (Subaru)', 'Police SUV': 'Police Land Cruiser', 'Pumper engine': 'Fire engine', '100-ft aerial ladder truck': 'Turntable ladder', HMMWV: 'Land Cruiser (KDF)', JLTV: 'Puma M26 MRAP', 'M2 Bradley': 'Ratel', Stryker: 'Panhard AML', 'M1A2 Abrams': 'Vickers Mk 3', 'F-16': 'F-5E Tiger II', 'F-35A': 'F-5E Tiger II', 'C-130J': 'C-27J Spartan', 'MH-60R Seahawk': 'AW139', 'F/A-18E/F Super Hornet': 'F-5E Tiger II' },
    LOCAL_ENTITIES: { sole: 'Business name (BRS)', llc: 'Private limited company', ccorp: 'Public limited company (Plc)' },
    PRIVATE_TITLES: { 'Chief Executive Officer': 'Managing Director' },

    /* Schools and credentials */
    EDUCATION: {
      tuition: { community: ppp(30000), technical: ppp(50000), online: ppp(40000), state: ppp(80000), private: ppp(300000), elite: ppp(80000) },
      schools: { community: 'Technical and Vocational College (TVET)', technical: 'Technical University of Kenya', online: 'Open University of Kenya', state: 'Kenyatta University', private: 'Strathmore University', elite: 'University of Nairobi', academy: 'the Kenya Military Academy, Lanet' },
      words: { 'High School': 'Secondary School', 'high-school diploma': 'KCSE certificate', 'high school': 'secondary school', GED: 'KCSE (private candidate)' },
      licenses: {
        'State Bar License': 'Advocate of the High Court of Kenya (Kenya School of Law)', 'Medical License (MD)': 'KMPDC registration', 'Board Certification': 'Specialist registration (KMPDC)', 'Certified Public Accountant (CPA)': 'CPA (ICPAK)',
        'Peace Officer (POST Basic Academy)': 'National Police College, Kiganjo', 'Registered Nurse (RN)': 'Registered nurse (Nursing Council of Kenya)', 'Commercial Driver License (Class A)': 'Driving licence class CE', 'Commercial Driver License (Class B)': 'Driving licence class C', 'Driver\'s License (Class D)': 'Driving licence class B', 'Learner\'s Permit': 'Provisional driving licence',
        'Professional Engineer (PE)': 'Professional Engineer (Engineers Board of Kenya)', 'EMT (NREMT)': 'Emergency Medical Technician', 'Paramedic (NRP)': 'Paramedic (Clinical Officers Council)', 'Pharmacist License (NAPLEX + MPJE)': 'Pharmacist (Pharmacy and Poisons Board)',
      },
    },
    SHORT_CYCLE: 'Diploma (TVET)',
    CREDENTIAL_LOCAL: { 'Driving licence (car)': 'Driving licence class B', 'Heavy goods vehicle licence (articulated)': 'Driving licence class CE', 'Heavy goods vehicle licence (rigid)': 'Driving licence class C', 'Bus & coach licence': 'Driving licence class D (PSV)', 'Security licence': 'Private Security Regulatory Authority licence', 'Construction site safety card': 'NCA construction worker card', 'Learner licence': 'Provisional driving licence' },
    PROFESSIONAL_DEGREES: { jd: 'LL.B. + Kenya School of Law', md: 'MBChB (six years)' },
    UNDERGRAD_ENTRY: { jd: 4, md: 6 },
    APPRENTICESHIP_SYSTEMS: { name: 'NITA apprenticeship', years: 2, pay: ppp(240000), exam: 'NITA trade test' },

    /* Moving here */
    WORKING_HOLIDAY: null,
    IMMIGRATION: {
      visas: {
        work: { name: 'Class D work permit', odds: 0.5, years: 2, degree: true, fee: 2000 },
        transfer: { name: 'Class D work permit (intra-company)', odds: 0.7, years: 2, fee: 2000 },
        student: { name: 'Student pass', odds: 0.85, years: 4, postStudy: 0, fee: 100 },
        family: { name: 'Dependant pass (spouse of a citizen)', odds: 0.8, years: 2, fee: 100 },
      },
      pr: { name: 'Permanent residence (Directorate of Immigration)', years: 7, fee: 2000 },
      nat: { years: 7, married: 7, needsPR: true, fromArrival: true, prMin: 0, fee: 1000 },
      dualIn: true, dualOut: true, birthright: false, prLapse: 5,
      intlTuition: { mult: 1.5 },
    },
    ASYLUM: { name: 'Refugee status (Department of Refugee Services)', odds: 0.6, decision: 2, workAfter: 2, prYears: 0, support: 0 },
    LICENCE_EXCHANGE: [],
    PEERS: [],
    OVERSTAY_BAN: 5,
    BIRTH_REGISTRATION: { name: 'Registration of a birth abroad (Kenyan mission)', fee: 10, deadline: false },
    PARENT_VISAS: { name: 'Dependant pass (parent)', needs: 'resident', odds: 0.7, wait: 1, fee: 100 },
    DIASPORA: { share: 0.02, from: [['IN', 2], ['westAfrican', 1], ['chinese', 1]] },

    /* Government and politics */
    LEGISLATURES: {
      prov: { name: (p) => `${p} Assembly`, seats: 50, presiding: 'Speaker of the County Assembly', office: 'ke_mca', exec: 'Governor', execOffice: 'ke_governor', veto: true },
      lower: { name: 'National Assembly', seats: 349, presiding: 'Speaker of the National Assembly', office: 'ke_mp' },
      upper: { name: 'Senate', seats: 67, presiding: 'Speaker of the Senate', office: 'ke_senator' },
      exec: 'President of Kenya', execOffice: 'ke_president', veto: true,
    },
    PARTY_NAMES: { labor: 'Orange Democratic Movement (ODM)', business: 'United Democratic Alliance (UDA)' },
    CORPORATE_RATE: 0.3,
    HEALTH_SYSTEMS: { wait: 6, waitName: 'public hospital queue', private: { name: 'Private medical cover (AAR, Jubilee)', premium: ppp(80000), skipsWait: true } },
    PUBLIC_LABOUR: { noStrike: ['police', 'military'], association: [] },
    AGENCIES: only({
      fbi: { name: 'Directorate of Criminal Investigations (DCI)', employers: ['DCI Headquarters — Kiambu Road', 'DCI — Mombasa'], titles: { trainee: 'Detective Constable (probation)', agent: 'Detective Constable', senior: 'Detective Corporal', bau: 'Forensic analyst', ssa: 'Detective Inspector', asac: 'Superintendent (DCI)', sac_cmd1: 'Senior Superintendent', sac_cmd2: 'Assistant Inspector-General', sac_cmd3: 'Senior Assistant Inspector-General', sac: 'Director of Criminal Investigations' } },
      usss: { name: 'Presidential Escort Unit', employers: ['State House — Nairobi'] },
      borderPatrol: { name: 'Department of Immigration Services / Border Police Unit', employers: ['JKIA immigration', 'Namanga border post'] },
      federalPrisons: { name: 'Kenya Prisons Service', employers: ['Kamiti Maximum Security Prison', 'Shimo La Tewa Prison'] },
      postal: { name: 'Posta Kenya', employers: ['Posta Kenya — Nairobi GPO'] },
      benefitsClaims: { name: 'NSSF', employers: ['NSSF — Social Security House'] },
      caseOfficer: { name: 'National Intelligence Service', employers: ['NIS — Nairobi'] },
      intelligence: { name: 'National Intelligence Service', employers: ['NIS — Nairobi'] },
      meteorology: { name: 'Kenya Meteorological Department', employers: ['KMD — Dagoretti'] },
      regulatory: { name: 'Financial Regulation (CBK · CMA · KRA)', employers: ['Central Bank of Kenya', 'Capital Markets Authority'] },
      foreignService: { name: 'Ministry of Foreign and Diaspora Affairs', employers: ['MFA — Nairobi'] },
      parkService: { name: 'Kenya Wildlife Service', employers: ['Maasai Mara (KWS)', 'Tsavo East National Park', 'Nairobi National Park'] },
      airTrafficControl: { name: 'KCAA air navigation services', employers: ['JKIA area control centre'] },
      nationalLab: { name: 'Kenya Medical Research Institute (KEMRI)', employers: ['KEMRI — Nairobi'] },
      oig: { name: 'Office of the Auditor-General', employers: ['OAG — Nairobi'] },
    }),
    LOCAL_AGENCIES: (b) => ({
      ...b,
      jail: null, statePolice: null, transitPolice: null, corrections: null,
      education: { name: 'Teachers Service Commission', employer: (c) => `TSC — public school in ${town(c)}`, titles: { sub: 'Intern Teacher', teacher: 'Teacher (C1)', senior: 'Senior Teacher', coach: 'Curriculum Support Officer', specialist: 'Head of Department', chair: 'Senior Master', ap: 'Deputy Principal', principal: 'Principal', director: 'Sub-County Director of Education', assistantSuper: 'County Director of Education', ...cmd('superintendent', ['Deputy Commission Secretary'], 'TSC Chief Executive') } },
      municipalAdmin: { name: 'County Government', employer: (c, s, sn) => `${sn} Government`, titles: { clerk: 'Clerical Officer', deputyClerk: 'Administrative Officer', cityClerk: 'Clerk of the County Assembly', analyst: 'Accountant', seniorAnalyst: 'Senior Accountant', financeDirector: 'Chief Officer, Finance', manager: 'Director', acm: 'Chief Officer', ...cmd('cityManager', ['County Executive Committee Member'], 'County Secretary') } },
      police: {
        name: 'National Police Service', employer: (c) => `Kenya Police Service — ${town(c)} Police Division`,
        titles: { recruit: 'Police Recruit (Kiganjo)', officer: 'Police Constable', senior: 'Corporal', detective: 'Detective Constable', seniorDetective: 'Detective Corporal', detSergeant: 'Detective Sergeant', detLieutenant: 'Inspector (CID)', detCaptain: 'Superintendent (CID)', sergeant: 'Sergeant', lieutenant: 'Inspector', captain: 'Chief Inspector (OCS)', deputyChief: 'Superintendent (OCPD)', ...cmd('chief', ['Senior Superintendent', 'Assistant Inspector-General', 'Senior Assistant Inspector-General', 'Deputy Inspector-General'], 'Inspector-General of Police') },
      },
      fire: {
        name: 'County Fire and Rescue Services', employer: (c, s, sn) => `${sn} Fire and Rescue Services`,
        titles: { recruit: 'Fireman (recruit)', firefighter: 'Fireman', engineer: 'Leading Fireman (driver)', inspector: 'Fire Safety Inspector', investigator: 'Fire Investigator', lieutenant: 'Sub-Officer', captain: 'Station Officer', battalion: 'Divisional Officer', deputyChief: 'Deputy Chief Fire Officer', ...cmd('chief', ['Assistant Director'], 'Chief Fire Officer') },
      },
      ems: {
        name: 'County Emergency Medical Services', employer: (c, s, sn) => `${sn} Emergency Medical Services`,
        titles: { emt: 'Emergency Medical Technician', paramedic: 'Paramedic', criticalCare: 'Critical Care Paramedic', flight: 'Flight paramedic (AMREF)', fto: 'EMS Trainer', supervisor: 'Shift Supervisor', captain: 'Station Coordinator', deputy: 'Deputy Director', ...cmd('chief', ['Director of Health Services'], 'County Director of Emergency Services') },
      },
      dispatch: { name: '999 / 112 Command Centre', employer: (c) => `National Police Command Centre — ${town(c)}`, titles: { trainee: 'Call handler (trainee)', telecommunicator: '999 Call Handler', senior: 'Senior Call Handler', training: 'Trainer', supervisor: 'Duty Officer', ...cmd('director', ['Centre Manager'], 'Commandant, Command Centre') } },
      prosecution: { name: 'Office of the Director of Public Prosecutions', employer: (c) => `ODPP — ${town(c)}`, titles: { clerk: 'Legal Clerk', ada: 'Prosecution Counsel', senior: 'Senior Prosecution Counsel', trial: 'Principal Prosecution Counsel', chiefDeputy: 'Deputy Director of Public Prosecutions', ...cmd('first', ['Secretary, Public Prosecutions'], 'Director of Public Prosecutions') } },
    }),
    NATIONAL_SERVICES: ['police'],
    POLICE_UNITS: { k9: 'Police Canine Unit', swat: 'Recce Company (GSU)', traffic: 'Traffic Police', narcotics: 'Anti-Narcotics Unit', gang: 'Special Service Unit', negotiator: 'Hostage negotiation team', sro: 'Community policing (Nyumba Kumi)', instructor: 'National Police College', ia: 'Internal Affairs Unit', protection: 'VIP Protection Unit' },
    POLICE_BUREAUS: { homicide: 'DCI Homicide Unit', svu: 'Gender and Children\'s Desk', property: 'DCI Property Crimes', robbery: 'Flying Squad', cyber: 'DCI Cybercrime Unit' },
    VOLUNTEER_MEDAL: 'Volunteer service award',

    /* The Kenya Defence Forces */
    FORCES: {
      pay: 0.4, exposure: 0.6,
      conscription: null,
      branches: {
        army: { name: 'Kenya Army', icon: '🇰🇪', motto: 'Pamoja Tuna Jenga', basic: 'recruit training at the Recruits Training School, Eldoret', officerSchool: 'the Kenya Military Academy, Lanet', enlisted: ENLISTED, officer: OFFICERS },
        navy: { name: 'Kenya Navy', icon: '⚓', motto: 'Tutalinda', basic: 'Recruits Training School, Eldoret', officerSchool: 'the Kenya Military Academy (naval cadets)', enlisted: ['Seaman', 'Able Seaman', 'Leading Seaman', 'Petty Officer', 'Chief Petty Officer', 'Warrant Officer II', 'Warrant Officer I', 'Command Warrant Officer', 'Chief Warrant Officer (KDF)'], officer: ['Sub-Lieutenant', 'Lieutenant', 'Lieutenant Commander', 'Commander', 'Captain', 'Commodore', 'Rear Admiral', 'Major General (Navy)', 'Lieutenant General (Navy)', 'General (Navy)'] },
        airforce: { name: 'Kenya Air Force', icon: '✈️', motto: 'Tuko Imara Angani', basic: 'Recruits Training School, Eldoret', officerSchool: 'the Kenya Military Academy (air cadets)', enlisted: ENLISTED, officer: OFFICERS },
        guard: { name: 'Kenya Defence Forces Reserve', icon: '🛡️', motto: 'Pamoja Tuna Jenga', basic: 'reserve training', officerSchool: 'the Kenya Military Academy', enlisted: ENLISTED, officer: OFFICERS },
      },
      bases: {
        army: [['nairobi', 'Defence Headquarters (Ulinzi House)'], ['nakuru', 'Lanet Barracks'], ['eldoret', 'Moi Barracks'], ['mombasa', 'Mtongwe']],
        navy: [['mombasa', 'Mtongwe Naval Base']],
        airforce: [['nairobi', 'Moi Air Base, Eastleigh'], ['nakuru', 'Laikipia Air Base']],
      },
      overseas: {
        army: [['Somalia', 'African Union mission (AUSSOM)', 1, false], ['Democratic Republic of the Congo', 'EAC regional force', 1, false]],
        navy: [['Indian Ocean', 'Counter-piracy patrol', 1, false]],
        airforce: [['Somalia', 'AU mission air support', 1, false]],
      },
    },
    MIL_SPECIAL: { drill: { names: 'Recruit instructor, Recruits Training School' }, recruiter: { names: 'KDF recruitment officer' }, honorGuard: { names: 'Kenya Army Guard of Honour', desc: 'State House ceremonies and national holidays.' }, rotc: { names: 'Instructor, Kenya Military Academy' }, joint: { names: 'Staff officer, Defence Headquarters' }, fellow: { names: 'Fellow, National Defence University – Kenya' }, commissioning: 'officer cadet course from the ranks', chiefs: { army: 'Commander, Kenya Army', navy: 'Commander, Kenya Navy', airforce: 'Commander, Kenya Air Force' }, chairman: 'Chief of the Defence Forces' },
    PME: { enlisted: ['Junior NCO course', 'Senior NCO course', 'Warrant officers\' course', 'RSM course', 'Chief warrant officers\' course'], officer: ['Young officers\' course', 'Defence Staff College, Karen', 'National Defence College'] },
    QUALS: { airborne: 'Airborne course', rangerSchool: 'Ranger course', jumpmaster: 'Jumpmaster course', pathfinder: 'Reconnaissance course', combatDiver: 'Combat diver course', dli: 'Language course', instructor: 'Instructors\' course', sere: 'Survival course', expertBadge: 'Counter-IED course' },
    SOF: {
      ranger: sf('Kenya Army Rangers / Special Operations Regiment', 'the Special Operations selection course', 'Special Operations Regiment, Gilgil', 'ranger tab', 'Counter-terrorism and raids against al-Shabaab.', ['a raid in the Boni forest', 'a counter-terrorism standby in Nairobi']),
      seal: sf('Kenya Navy Special Boat Unit', 'the Special Boat Unit course', 'Special Boat Unit, Mtongwe', 'SBU badge', 'Maritime special operations off the coast.', ['an anti-piracy boarding']),
    },
    MIL_UNITS: { ground: ['1st Kenya Rifles', '7th Kenya Rifles', '20th Parachute Battalion', '78th Tank Battalion'], naval: ['KNS Jasiri', 'KNS Shujaa', 'KNS Umoja'], air: ['Laikipia Air Base squadron', 'Moi Air Base transport squadron'] },
    MIL_SUMMARY: 'a summary trial before your commanding officer (Kenya Defence Forces Act)',
    SERVICE_TERMS: { maxYears: { enlisted: 30, officer: 35 }, ages: { enlisted: 50, officer: 55, flag: 62 }, name: 'engagement' },
    MILITARY_JUSTICE: { code: 'the Kenya Defence Forces Act', court: 'a court martial', prison: 'military detention', counsel: 'Defending officer' },
    VETTING: { form: 'NIS security vetting', publicTrust: 'Restricted', secret: 'Secret', topSecret: 'Top Secret' },
    CAMPUS: null,
    ACADEMY_NAMES: { army: 'the Kenya Military Academy, Lanet', navy: 'the Kenya Military Academy', airforce: 'the Kenya Military Academy' },
    THEATERS: [
      { id: 'somalia', name: 'operations against al-Shabaab in Somalia', adversary: 'al-Shabaab', intensity: 1, home: 0, weight: 40 },
      { id: 'border', name: 'counter-terror operations on the Somali border', adversary: 'al-Shabaab', intensity: 1, home: 0.3, weight: 20, internal: true },
    ],
    WAR_START_CHANCE: 0.01,
    MEDALS: {
      moh: { name: 'Distinguished Conduct Order', ribbon: R('#000000', '#bb0000', '#006600') }, serviceCross: { name: 'Order of the Grand Warrior of Kenya (OGW)' }, silverStar: { name: 'Silver Star of Kenya' },
      dsm: { name: 'Distinguished Service Medal' }, legionOfMerit: { name: 'Meritorious Service Medal' }, bronzeStar: { name: 'Head of State Commendation (Military)' },
      purpleHeart: null, msm: { name: 'Long Service and Good Conduct Medal' }, commendation: { name: 'Chief of Defence Forces commendation' }, achievement: { name: 'Commander\'s commendation' },
      combatAction: null, goodConduct: { name: 'Good Conduct Medal' }, humanitarian: null, expeditionary: { name: 'African Union Service Medal (Somalia)' }, ndsm: null,
    },
    // The Order of the Burning Spear and the Order of the Golden Heart.
    ORDERS: {
      minAge: 35,
      tiers: [
        { id: 'HSC', name: 'Head of State Commendation (HSC)', min: 40, ribbon: R('#000000', '#bb0000', '#006600') },
        { id: 'MBS', name: 'Moran of the Order of the Burning Spear (MBS)', min: 80, ribbon: R('#bb0000', '#ffffff', '#bb0000') },
        { id: 'EBS', name: 'Elder of the Order of the Burning Spear (EBS)', min: 130, ribbon: R('#bb0000', '#ffffff', '#bb0000') },
        { id: 'CBS', name: 'Chief of the Order of the Burning Spear (CBS)', min: 190, ribbon: R('#bb0000', '#ffd700', '#bb0000') },
        { id: 'EGH', name: 'Elder of the Order of the Golden Heart (EGH)', min: 260, ribbon: R('#ffd700', '#006600', '#ffd700') },
      ],
    },
    PARDON: 'the President (Power of Mercy Advisory Committee)',
    COMBAT_TEMPO: 0.4,
    MIL_PENSIONS: { name: 'Armed Forces pension', rate: 0.025, cap: 0.8, vest: 10, immediate: { enlisted: 21, officer: 20 }, deferredAge: 60 },
    DIRECT_ENTRY: {
      police: [{ id: 'cadetInspector', name: 'Cadet Inspector (graduate entry)', levelId: 'lieutenant', education: 'bachelor', maxAge: 30, odds: 0.1, school: 'the National Police College, Kiganjo' }],
    },
    BENCHES: {
      route: 'appointed', appointedBy: 'the Judicial Service Commission', retire: 70,
      lay: { id: 'kadhi', name: 'Kadhi\'s Court assessor', icon: '🤝', allowance: 0, minAge: 30, maxAge: 70, noLaw: true, desc: 'Assist the Kadhi\'s courts on Muslim family law and succession.' },
      ladder: [
        { id: 'magistrate', name: 'Resident Magistrate', icon: '🔨', salary: 30000, minYears: 3, entry: true },
        { id: 'high', name: 'Judge of the High Court', icon: '⚖️', salary: 60000, minYears: 10, entry: true },
        { id: 'appeal', name: 'Judge of the Court of Appeal', icon: '📜', salary: 70000, minYears: 15 },
        { id: 'supreme', name: 'Justice of the Supreme Court of Kenya', icon: '🏛️', salary: 85000, minYears: 15 },
      ],
    },
  },
};
