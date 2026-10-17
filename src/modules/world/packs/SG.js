/**
 * Singapore, built on the United Kingdom: a city-state with common law and a
 * Westminster parliament, one national police force (SPF) and one civil
 * defence force (SCDF) that fights fires and runs the 995 ambulances,
 * compulsory National Service for every male citizen at 18, the CPF instead of
 * a state pension, no jury trials and a strict justice system.
 *
 * Amounts are Singapore dollars converted at 2023 PPP (S$0.84 per US$), 2025 rates.
 * See docs/ADDING-A-COUNTRY.md for the shape of a pack.
 */

const SGD = 0.84;
const ppp = (local) => Math.round(local / SGD);
const cmd = (top, steps, head) => ({ ...Object.fromEntries(steps.map((t, i) => [`${top}_cmd${i + 1}`, t])), [top]: head });
const sf = (name, course, unitName, badge, desc, deployments) => ({ name, course, unitName, badge, desc, deployments });
const R = (...colors) => colors.map((c) => [c, 1]);
const region = (name, extra = {}) => ({ name, incomeTax: [], propertyTax: 0.04, salesTax: 0.09, rightToWork: false, cannabis: false, dui: { fineMult: 3, suspendYears: 2 }, minWage: ppp(9), population: 'medium', disasters: { flood: 0.02 }, ...extra });
const ARMY_OFFICERS = ['Second Lieutenant', 'Lieutenant', 'Captain', 'Major', 'Lieutenant-Colonel', 'Senior Lieutenant-Colonel', 'Colonel', 'Brigadier-General', 'Major-General', 'Lieutenant-General'];
const ARMY_ENLISTED = ['Private', 'Lance Corporal', 'Corporal', 'Third Sergeant', 'Second Sergeant', 'First Sergeant', 'Staff Sergeant', 'Master Sergeant', 'Chief Warrant Officer'];
const SPF = { cadet: 'Police Officer (trainee, Home Team Academy)', trooper: 'Sergeant (Police Officer)', senior: 'Staff Sergeant', investigator: 'Investigation Officer', majorCrimes: 'Investigation Officer (Criminal Investigation Department)', detSergeant: 'Senior Staff Sergeant (CID)', detLieutenant: 'Inspector (CID)', detCaptain: 'Deputy Superintendent (CID)', sergeant: 'Senior Station Inspector', lieutenant: 'Inspector', captain: 'Assistant Superintendent of Police', major: 'Deputy Superintendent of Police', ...cmd('superintendent', ['Superintendent of Police', 'Deputy Assistant Commissioner', 'Assistant Commissioner', 'Senior Assistant Commissioner'], 'Commissioner of Police') };
const SCDF = { recruit: 'Firefighter (trainee, Civil Defence Academy)', firefighter: 'Sergeant (Firefighter)', engineer: 'Staff Sergeant (Pump Operator)', inspector: 'Fire Safety Inspector', investigator: 'Fire Investigation Officer', lieutenant: 'Lieutenant (Rota Commander)', captain: 'Captain (Station Commander)', battalion: 'Major', deputyChief: 'Lieutenant-Colonel (Division Commander)', ...cmd('chief', ['Colonel', 'Senior Assistant Commissioner'], 'Commissioner, SCDF') };
const town = (c) => c.split(',')[0];

export const SG = {
  id: 'SG',
  basedOn: 'GB',
  groups: ['COMMON_LAW', 'RICH_SYSTEMS'],
  agreements: [],
  licenceExchange: ['GB', 'AU', 'NZ', 'CA', 'JP', 'KR', 'DE', 'FR', 'US', 'IE'],
  peers: ['GB', 'AU'],
  country: {
    name: 'Singapore',
    flag: '🇸🇬',
    demonym: 'Singaporean',
    capital: 'Singapore',
    currency: { code: 'SGD', symbol: 'S$', perUsd: SGD },
    languages: ['English', 'Mandarin', 'Malay', 'Tamil'],
    emergency: '999',
    retirementAge: 63,
    informality: 0,
    tax: {
      // YA 2025 resident rates: nothing on the first S$20,000, then 2% up to 24% above S$1 million.
      allowance: ppp(20000),
      brackets: [[ppp(10000), 0.02], [ppp(10000), 0.035], [ppp(40000), 0.07], [ppp(40000), 0.115], [ppp(40000), 0.15], [ppp(40000), 0.18], [ppp(40000), 0.19], [ppp(40000), 0.195], [ppp(40000), 0.2], [ppp(180000), 0.22], [ppp(500000), 0.23], [Infinity, 0.24]],
      // CPF: employees pay 20% of wages up to the S$7,400-a-month ceiling (employers add 17%).
      contributions: [{ name: 'CPF', rate: 0.2, from: 0, to: ppp(88800) }],
      label: 'IRAS',
    },
    // CPF LIFE: savings in your own accounts (growing at 2.5–4%) become a monthly annuity from 65.
    pension: { kind: 'account', name: 'CPF LIFE', rate: 0.3, growth: 0.035, cap: ppp(88800), annuity: 15, flat: 0, ages: [65, 65] },
    employerSuper: 0.17,
    // MediShield Life covers large hospital bills; MediSave pays the deductible and co-insurance.
    health: { name: 'MediShield Life', short: 'MediShield Life', deductible: ppp(1500), coinsurance: 0.1, oopMax: ppp(5000) },
    childBenefit: { amount: ppp(1000), phaseOutFrom: Infinity, name: 'Baby Bonus (Child Development Account)' },
    terms: {
      'Federal government': 'Government', 'Federal income tax': 'Income tax', 'State income tax': 'Income tax', 'Social Security': 'CPF',
      '401(k)': 'CPF', IRA: 'SRS', IRS: 'IRAS', Medicaid: 'MediFund', Medicare: 'MediShield Life', 'GI Bill': 'SAF education awards',
      'high school': 'secondary school', 'High School': 'Secondary School', deductible: 'deductible', HMRC: 'IRAS', 'the NHS': 'the public healthcare system', NHS: 'public healthcare',
      'National Insurance': 'CPF', 'State Pension': 'CPF LIFE', ISA: 'SRS', 'workplace pension': 'CPF', 'National government': 'Government', 'Scottish income tax': 'Income tax', 'council tax': 'property tax', 'Council Tax': 'Property Tax',
    },
    names: {
      male: ['Ethan', 'Lucas', 'Jayden', 'Ryan', 'Wei Jie', 'Jun Hao', 'Zhi Hao', 'Muhammad', 'Haziq', 'Irfan', 'Arjun', 'Rahul', 'Darren', 'Marcus', 'Kai Xuan', 'Aidan'],
      female: ['Chloe', 'Charlotte', 'Sophia', 'Hui Min', 'Xin Yi', 'Jia Hui', 'Nur Aisyah', 'Siti', 'Nurul', 'Priya', 'Kavya', 'Rachel', 'Natalie', 'Zoe', 'Wen Xin', 'Shi Ying'],
      last: ['Tan', 'Lim', 'Lee', 'Ng', 'Ong', 'Wong', 'Goh', 'Chua', 'Chan', 'Koh', 'Teo', 'Ang', 'bin Abdullah', 'binte Ismail', 'Kumar', 'Pillai'],
    },
    provinces: {
      'SG-01': region('Central Singapore', { population: 'large' }),
      'SG-02': region('North East', { population: 'large' }),
      'SG-03': region('North West', { population: 'medium' }),
      'SG-04': region('South East', { population: 'medium' }),
      'SG-05': region('South West', { population: 'medium' }),
    },
    cities: {
      sgcentral: { name: 'Singapore (Central)', icon: '🦁', type: 'High-cost metro', state: 'SG-01', col: 1.5, market: 1.3, locality: 0.25, transit: 95, fare: ppp(1200), walkable: true, size: 'enterprise', population: [930000, 5900000] },
      tampines: { name: 'Tampines', icon: '🏘️', type: 'Suburb', state: 'SG-04', col: 1.25, market: 1.1, locality: 0.22, transit: 90, fare: ppp(1100), walkable: true, size: 'large', population: [270000, 5900000] },
      woodlands: { name: 'Woodlands', icon: '🌳', type: 'Suburb', state: 'SG-03', col: 1.2, market: 1.05, locality: 0.22, transit: 85, fare: ppp(1100), walkable: true, size: 'large', population: [255000, 5900000] },
      jurongwest: { name: 'Jurong West', icon: '🏭', type: 'Suburb', state: 'SG-05', col: 1.2, market: 1.05, locality: 0.22, transit: 85, fare: ppp(1100), walkable: true, size: 'large', population: [260000, 5900000] },
      angmokio: { name: 'Ang Mo Kio', icon: '🏢', type: 'Suburb', state: 'SG-02', col: 1.25, market: 1.08, locality: 0.22, transit: 90, fare: ppp(1100), walkable: true, size: 'medium', population: [160000, 5900000] },
    },
    hometowns: ['sgcentral', 'sgcentral', 'tampines', 'woodlands', 'jurongwest', 'angmokio'],
    population: { 'SG-01': 0.93e6, 'SG-02': 1.4e6, 'SG-03': 1.0e6, 'SG-04': 1.2e6, 'SG-05': 1.3e6 },
  },
  offices: {
    sg_mp: { country: 'SG', name: 'Member of Parliament', icon: '🏛️', level: 4, term: 5, termLimit: 0, salary: 230000, minAge: 21, residency: 10, cost: 80000, fullTime: false, pension: 'electedOfficials', kind: 'legislative' },
    sg_pm: { country: 'SG', name: 'Prime Minister of Singapore', icon: '🇸🇬', level: 5, term: 5, termLimit: 0, salary: 1700000, minAge: 21, residency: 10, cost: 1000000, requires: ['sg_mp'], leader: true, statewide: true, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true },
  },
  communities: {
    malay: { male: ['Muhammad', 'Ahmad', 'Haziq', 'Irfan', 'Hakim', 'Danial', 'Faris'], female: ['Nur Aisyah', 'Siti', 'Nurul', 'Aishah', 'Farah', 'Hidayah', 'Amirah'], last: ['bin Abdullah', 'bin Ahmad', 'bin Ismail', 'binte Rahman', 'bin Osman', 'binte Hassan', 'bin Yusof'] },
  },
  tables: {
    /* Law and money */
    JUSTICE: (b) => ({ ...b, trial: 'bench', sentence: 1.3, jurorPay: 0, jail: () => 'Changi Prison Complex (remand)', prison: 'Changi Prison Complex', legalAid: 'the Public Defender\'s Office', privatePrisons: 0 }),
    INSOLVENCY: { liquidation: { name: 'Bankruptcy (Official Assignee)', wait: 3, plan: 3 }, plan: { name: 'Debt Repayment Scheme', years: 5, wait: 2 }, homestead: ppp(100000), wildcard: ppp(5000), creditYears: 5 },
    // Estate duty was abolished in 2008.
    INHERITANCE: { name: 'no estate duty', exemption: Infinity, brackets: [[Infinity, 0]] },
    UNEMPLOYMENT: { name: 'SkillsFuture Jobseeker Support', flat: ppp(6000), years: 0.5 },
    SEVERANCE: { perYear: 0.06, base: 0 },
    DISABILITY: { name: 'CareShield Life', rate: 0, floor: ppp(7200), cap: ppp(7200), minYears: 1, odds: 0.9, stages: ['Disability assessment', 'Review', 'Appeal to the CPF Board'] },
    SELF_EMPLOYED: { name: 'MediSave contributions (self-employed)', rate: 0.105, cap: ppp(72000) },
    CREDIT: { name: 'Credit Bureau Singapore score' },
    SMALL_BIZ_LOAN: 'Enterprise Financing Scheme loan',
    VETERANS: { orgs: ['SAFRA (SAF Reservist Association)', 'SAF Veterans\' League'], care: 'MINDEF' },
    STOCK_INDEX: 'Straits Times Index',
    MORTGAGES: {
      closing: 0.03, stress: 0.035,
      products: {
        hdb: { name: 'HDB concessionary loan (25-yr)', years: 25, rateAdj: -0.01, minDown: 0.2, minScore: 550, maxDti: 0.3 },
        bank: { name: 'Bank home loan (30-yr, floating)', years: 30, rateAdj: 0, minDown: 0.25, minScore: 650, maxDti: 0.55, arm: true, reset: 2 },
      },
    },
    UNIONS: { police: null, fire: null, ems: 'Healthcare Services Employees\' Union', health: 'Healthcare Services Employees\' Union', education: 'Singapore Teachers\' Union', public: 'Amalgamated Union of Public Employees', prisons: null, transport: 'National Transport Workers\' Union', rail: 'National Transport Workers\' Union', aviation: 'Air Transport Executive Staff Union', pilots: 'Air Line Pilots Association – Singapore', trades: 'Building Construction and Timber Industries Employees\' Union', industry: 'United Workers of Electronics and Electrical Industries', retail: 'Food, Drinks and Allied Workers Union', hospitality: 'Food, Drinks and Allied Workers Union', services: 'Union of Security Employees', media: 'Media Workers\' Union', tech: 'United Workers of Electronics and Electrical Industries', arts: null, postal: 'Union of Telecoms Employees of Singapore' },
    CADETS: { jrotc: 'National Cadet Corps', seaCadets: 'National Cadet Corps (Sea)' },
    FOREIGN_SERVICE_EXAM: 'MFA Foreign Service Officer selection (Public Service Commission)',
    PROSECUTORS: ['Attorney-General\'s Chambers', 'Public Defender\'s Office', 'Probation and Community Rehabilitation Service'],
    VOLUNTEER_SERVICES: { fire: 'SCDF Civil Defence Volunteer', police: 'Volunteer Special Constabulary', sar: null, ambulance: 'St John Singapore', wildland: null, auxiliary: null, cap: null, cert: 'Community Emergency Response Team', redcross: 'Singapore Red Cross', skiPatrol: null, mrc: null },
    VOLUNTEER_RANKS: {
      police: ['VSC Trainee', 'Special Constable', 'Special Corporal', 'Special Sergeant', 'Special Inspector', 'Special Assistant Superintendent', 'Commander, VSC'],
      fire: ['Civil Defence Volunteer (trainee)', 'Civil Defence Volunteer', 'Senior Volunteer', 'Section Leader', 'Volunteer Officer', 'Volunteer Unit Commander', 'Volunteer Division Commander'],
    },
    VOLUNTEER_PARENTS: {
      fire: { name: 'the Singapore Civil Defence Force', level: 'national', funds: 1, grant: null },
      police: { name: 'the Singapore Police Force', level: 'national', funds: 1, grant: null },
      cert: { name: 'the Singapore Civil Defence Force', level: 'national', funds: 1, grant: null },
    },
    NATIONAL_SERVICE: { overseas: 'Youth Corps Singapore (overseas expeditions)', domestic: null },
    ACCOUNTS: { dc: 'CPF', roth: { name: 'Investment account (no capital gains tax)', limit: ppp(100000) }, traditional: { name: 'Supplementary Retirement Scheme (SRS)', limit: ppp(15300), share: 1 } },
    REFERENDUMS: {},
    ENTRANCE_EXAMS: { name: 'GCE A-Level (university admission)', prep: { name: 'tuition centre', cost: ppp(6000) }, weight: 0.85 },
    AVIATION_AUTHORITY: 'Civil Aviation Authority of Singapore',
    COUNTY: 'Town Council',
    LONG_TERM_CARE: { name: 'CareShield Life and ElderFund', covers: 0.4, safetyNet: 'ComCare' },
    WORKPLACE: { equality: 'the Tripartite Alliance (TAFEP)', reservist: 'the Enlistment Act (NS job protection)', labourBoard: 'the Ministry of Manpower' },
    EQUIPMENT: (b) => ({
      ...b,
      'Digital radio + body camera kit': 'Police radio + body-worn camera', 'Patrol sedan': 'Fast Response Car', 'Police SUV': 'Emergency Response Team vehicle', 'Pumper engine': 'Pumper Firefighting Machine', '100-ft aerial ladder truck': 'Combined Platform Ladder',
      HMMWV: 'Belrex protected combat support vehicle', JLTV: 'Hunter armoured fighting vehicle', 'M2 Bradley': 'Bionix II', Stryker: 'Terrex ICV', 'M1A2 Abrams': 'Leopard 2SG', 'F-16': 'F-16C/D Block 52', 'F-35A': 'F-35B', 'C-130J': 'A330 MRTT', 'MH-60R Seahawk': 'S-70B Seahawk', 'F/A-18E/F Super Hornet': 'F-15SG',
    }),
    LOCAL_ENTITIES: { sole: 'Sole proprietorship (ACRA)', llc: 'Limited liability partnership (LLP)', ccorp: 'Private limited company (Pte Ltd)' },
    PRIVATE_TITLES: { 'Vice President': 'Vice President', 'Chief Executive Officer': 'Chief Executive Officer' },

    /* Schools and credentials */
    EDUCATION: (b) => ({
      ...b,
      // Government-subsidised university tuition (Ministry of Education Tuition Grant) for citizens.
      tuition: { community: ppp(3000), technical: ppp(3000), online: ppp(4000), state: ppp(8250), private: ppp(20000), elite: ppp(8250) },
      freeIn: undefined, loans: undefined, loanThreshold: undefined, writeOffAge: undefined,
      schools: { community: 'Institute of Technical Education (ITE)', technical: 'Singapore Polytechnic', online: 'Singapore University of Social Sciences (online)', state: 'Nanyang Technological University (NTU)', private: 'Singapore Management University', elite: 'National University of Singapore (NUS)', academy: 'the SAFTI Military Institute' },
      words: { 'High School': 'Secondary School', 'high-school diploma': 'GCE O-Level certificate', 'high school': 'secondary school', GED: 'GCE O-Level (private candidate)', 'A-levels': 'GCE A-Levels' },
      licenses: {
        ...b.licenses,
        'State Bar License': 'Advocate and Solicitor (Singapore Bar)', 'Medical License (MD)': 'Singapore Medical Council registration', 'Board Certification': 'Specialist accreditation (SAB)',
        'Certified Public Accountant (CPA)': 'Chartered Accountant of Singapore (ISCA)', 'Peace Officer (POST Basic Academy)': 'Home Team Academy basic course', 'Registered Nurse (RN)': 'Singapore Nursing Board registered nurse',
        'Commercial Driver License (Class A)': 'Class 5 driving licence', 'Commercial Driver License (Class B)': 'Class 4 driving licence', 'Driver\'s License (Class D)': 'Class 3 driving licence', 'Learner\'s Permit': 'Provisional driving licence',
        'Professional Engineer (PE)': 'Professional Engineer (PEB Singapore)', 'EMT (NREMT)': 'SCDF Emergency Medical Technician', 'Paramedic (NRP)': 'SCDF Paramedic', 'Pharmacist License (NAPLEX + MPJE)': 'Singapore Pharmacy Council registration',
      },
    }),
    SHORT_CYCLE: 'Polytechnic Diploma',
    CREDENTIAL_LOCAL: { 'Driving licence (car)': 'Class 3 driving licence', 'Heavy goods vehicle licence (articulated)': 'Class 5 driving licence', 'Heavy goods vehicle licence (rigid)': 'Class 4 driving licence', 'Bus & coach licence': 'Omnibus Driver\'s Vocational Licence', 'Security licence': 'Security Officer licence (PLRD)', 'Construction site safety card': 'Building Construction Safety Orientation Course (CSOC)', 'Learner licence': 'Provisional driving licence' },
    PROFESSIONAL_DEGREES: { jd: 'LLB (NUS or SMU) + Part B', md: 'MBBS (NUS Yong Loo Lin)' },
    UNDERGRAD_ENTRY: { jd: 4, md: 5 },
    APPRENTICESHIP_SYSTEMS: { name: 'ITE Work-Study Diploma', years: 2, pay: ppp(26000), exam: 'Work-Study Diploma' },

    /* Moving here */
    WORKING_HOLIDAY: { name: 'Work Holiday Pass', odds: 0.85, years: 0.5, fee: 150, once: true, partners: { AU: 25, NZ: 25, GB: 25, FR: 25, DE: 25, JP: 25, KR: 25, US: 25 } },
    IMMIGRATION: (b) => ({
      ...b,
      visas: {
        work: { name: 'Employment Pass (COMPASS)', odds: 0.7, years: 2, degree: true, fee: 225 },
        transfer: { name: 'Employment Pass (intra-corporate transferee)', odds: 0.85, years: 2, fee: 225 },
        student: { name: 'Student\'s Pass', odds: 0.85, years: 4, postStudy: 1, fee: 90 },
        family: { name: 'Long-Term Visit Pass (spouse of a citizen)', odds: 0.75, years: 2, fee: 120 },
      },
      pr: { name: 'Permanent Residence (ICA)', years: 2, fee: 100, odds: 0.3 },
      nat: { years: 2, married: 2, needsPR: true, fromArrival: false, prMin: 2, fee: 100 },
      // Singapore doesn't allow dual citizenship for adults.
      dualIn: false, dualOut: false,
      birthright: false, prLapse: 5, surcharge: 0,
      intlTuition: { mult: 2 },
    }),
    ASYLUM: { name: 'no asylum process (UNHCR referral)', odds: 0.02, decision: 1, workAfter: 99, prYears: 0, support: 0 },
    LICENCE_EXCHANGE: ['GB', 'AU', 'NZ', 'CA', 'JP', 'KR', 'DE', 'FR', 'US', 'IE'],
    PEERS: ['GB', 'AU'],
    OVERSTAY_BAN: 10,
    BIRTH_REGISTRATION: { name: 'Citizenship by descent (registration at an overseas mission)', fee: 100, deadline: true },
    PARENT_VISAS: { name: 'Long-Term Visit Pass (parent)', needs: 'citizen', odds: 0.3, wait: 1, fee: 120 },
    DIASPORA: { share: 0.3, from: [['chinese', 4], ['IN', 3], ['malay', 2], ['PH', 2], ['GB', 1]] },

    /* Government and politics */
    LEGISLATURES: {
      lower: { name: 'Parliament of Singapore', seats: 97, presiding: 'Speaker of Parliament', office: 'sg_mp' },
      exec: 'Prime Minister', execOffice: 'sg_pm', veto: false,
    },
    PARTY_NAMES: { labor: 'Workers\' Party', business: 'People\'s Action Party' },
    CORPORATE_RATE: 0.17,
    HEALTH_SYSTEMS: { wait: 4, waitName: 'subsidised specialist clinic queue', private: { name: 'Integrated Shield Plan (private wards)', premium: ppp(1500), skipsWait: true } },
    PUBLIC_LABOUR: { noStrike: ['police', 'military', 'fire', 'ems', 'prisons'], association: [] },
    AGENCIES: {
      fbi: { name: 'Criminal Investigation Department (SPF)', employers: ['CID — Police Cantonment Complex', 'Commercial Affairs Department'], titles: { trainee: 'Investigation Officer (trainee)', agent: 'Investigation Officer', senior: 'Senior Investigation Officer', bau: 'Behavioural Sciences Unit psychologist', ssa: 'Inspector (Head, Investigation Team)', asac: 'Deputy Superintendent', sac_cmd1: 'Superintendent', sac_cmd2: 'Deputy Assistant Commissioner', sac_cmd3: 'Assistant Commissioner', sac: 'Director of CID' } },
      dea: { name: 'Central Narcotics Bureau', employers: ['CNB Headquarters'] },
      usss: { name: 'Security Command (SPF)', employers: ['SecCom — Istana'] },
      borderPatrol: { name: 'Immigration & Checkpoints Authority', employers: ['ICA — Woodlands Checkpoint', 'ICA — Changi Airport'] },
      tsa: { name: 'Certis aviation security', employers: ['Changi Airport security'] },
      federalPrisons: { name: 'Singapore Prison Service', employers: ['Changi Prison Complex'] },
      postal: { name: 'SingPost', employers: ['SingPost — Mail Processing Centre'] },
      benefitsClaims: { name: 'CPF Board', employers: ['CPF Board — Service Centre'] },
      caseOfficer: { name: 'Security and Intelligence Division (SID)', employers: ['SID — MINDEF'] },
      sigint: { name: 'Cyber Security Agency of Singapore', employers: ['CSA — Singapore'] },
      intelligence: { name: 'Internal Security Department', employers: ['ISD — Singapore'] },
      meteorology: { name: 'Meteorological Service Singapore', employers: ['MSS — Changi'] },
      regulatory: { name: 'Financial Regulation (MAS · IRAS)', employers: ['Monetary Authority of Singapore', 'IRAS'] },
      foreignService: { name: 'Ministry of Foreign Affairs', employers: ['MFA — Tanglin'] },
      parkService: { name: 'National Parks Board (NParks)', employers: ['Singapore Botanic Gardens', 'Sungei Buloh Wetland Reserve'] },
      airTrafficControl: { name: 'CAAS air traffic control', employers: ['Singapore Air Traffic Control Centre'] },
      nationalLab: { name: 'A*STAR research institutes', employers: ['A*STAR — Biopolis', 'A*STAR — Fusionopolis'] },
      oig: { name: 'Auditor-General\'s Office', employers: ['AGO — Singapore'] },
    },
    LOCAL_AGENCIES: (b) => ({
      ...b,
      education: { name: 'Ministry of Education schools', employer: (c) => `MOE school — ${town(c)}`, titles: { sub: 'Relief Teacher', teacher: 'Education Officer', senior: 'Senior Teacher', coach: 'Lead Teacher', specialist: 'Subject Head', chair: 'Head of Department', ap: 'Vice-Principal', principal: 'Principal', director: 'Cluster Superintendent', assistantSuper: 'Deputy Director (Schools)', ...cmd('superintendent', ['Director of Schools', 'Deputy Director-General of Education'], 'Director-General of Education') } },
      municipalAdmin: { name: 'Town Council', employer: (c) => `${town(c)} Town Council`, titles: { clerk: 'Customer Service Officer', deputyClerk: 'Property Officer', cityClerk: 'Secretary to the Town Council', analyst: 'Finance Executive', seniorAnalyst: 'Senior Finance Executive', financeDirector: 'Finance Manager', manager: 'Property Manager', acm: 'Deputy General Manager', ...cmd('cityManager', ['Senior Deputy General Manager', 'Assistant General Manager'], 'General Manager, Town Council') } },
      probation: { name: 'Probation and Community Rehabilitation Service', employer: () => 'Ministry of Social and Family Development — Probation Service', titles: { trainee: 'Probation Officer (trainee)', officer: 'Probation Officer', senior: 'Senior Probation Officer', specialized: 'Senior Probation Officer (youth)', supervisor: 'Principal Probation Officer', chief: 'Director, Probation and Community Rehabilitation Service' } },
      police: null, transitPolice: null, councilInspector: null,
      statePolice: { name: 'Singapore Police Force', employer: (c) => `Singapore Police Force — ${town(c)} Division`, titles: SPF },
      corrections: { name: 'Singapore Prison Service', employer: () => 'Singapore Prison Service — Changi Prison Complex' },
      fire: { name: 'Singapore Civil Defence Force', employer: (c) => `SCDF — ${town(c)} Fire Station`, titles: SCDF },
      ems: { name: 'SCDF Emergency Medical Services', employer: (c) => `SCDF — ${town(c)} Fire Station (ambulance)`, titles: { emt: 'Emergency Medical Technician', paramedic: 'Paramedic', criticalCare: 'Senior Paramedic', flight: 'Paramedic (Medical Response Team)', fto: 'EMS instructor (Civil Defence Academy)', supervisor: 'Ambulance Team Leader', captain: 'EMS Officer', deputy: 'Head, Emergency Medical Services', ...cmd('chief', ['Deputy Commissioner (EMS)'], 'Chief Medical Officer, SCDF') } },
      dispatch: { name: '995 Operations Centre', employer: () => 'SCDF 995 Operations Centre', titles: { trainee: 'Call Taker (trainee)', telecommunicator: '995 Call Taker', senior: 'Senior Call Taker', training: 'Operations Trainer', supervisor: 'Duty Officer', ...cmd('director', ['Operations Manager', 'Head of Operations Centre'], 'Director, Operations') } },
      prosecution: { name: 'Attorney-General\'s Chambers', employer: () => 'Attorney-General\'s Chambers', titles: { clerk: 'Legal Executive', ada: 'Deputy Public Prosecutor', senior: 'Senior Deputy Public Prosecutor', trial: 'Principal Senior State Counsel', chiefDeputy: 'Chief Prosecutor', ...cmd('first', ['Deputy Chief Prosecutor', 'Chief Prosecutor (Crime)'], 'Attorney-General') } },
    }),
    NATIONAL_SERVICES: ['fire', 'ems', 'statePolice'],
    POLICE_UNITS: { k9: 'Police K-9 Unit', swat: 'Special Tactics and Rescue (STAR)', traffic: 'Traffic Police', narcotics: 'Central Narcotics Bureau', gang: 'Secret Societies Branch', negotiator: 'Crisis Negotiation Unit', sro: 'Neighbourhood Police Post', instructor: 'Home Team Academy', ia: 'Internal Affairs Office', protection: 'Security Command' },
    POLICE_BUREAUS: { homicide: 'Major Crimes Division (CID)', svu: 'Serious Sexual Crime Branch', property: 'Specialised Crime Branch', robbery: 'Criminal Investigation Department', cyber: 'Technology Crime Investigation Branch' },
    VOLUNTEER_MEDAL: 'Home Team Volunteer Award',

    /* The Singapore Armed Forces */
    FORCES: {
      pay: 0.8, exposure: 0.15,
      // National Service: two years for every male citizen and second-generation PR at 18, then reservist (NSman) cycles to 40.
      conscription: { kind: 'universal', age: 18, months: { male: 24 }, genders: ['male'], branches: ['army', 'navy', 'airforce'], defer: false, name: 'National Service (Enlistment Act)', text: 'Every male Singapore citizen enlists for two years of full-time National Service at 18, then serves as an operationally ready NSman until about 40. Most serve in the SAF; some are posted to the Police or the SCDF.', alternative: { label: 'Serve in the Police or SCDF (NS posting)', months: 24, desc: 'Two years as a national serviceman in the Home Team' } },
      branches: {
        army: { name: 'Singapore Army', icon: '🇸🇬', motto: 'Yours to Defend', basic: 'Basic Military Training at Pulau Tekong', officerSchool: 'the Officer Cadet School, SAFTI Military Institute', enlisted: ARMY_ENLISTED, officer: ARMY_OFFICERS },
        navy: { name: 'Republic of Singapore Navy', icon: '⚓', motto: 'Beyond the Horizon', basic: 'Basic Military Training at Pulau Tekong', officerSchool: 'the Officer Cadet School (Naval)', enlisted: ['Seaman', 'Leading Seaman', 'Able Seaman', 'Third Sergeant', 'Second Sergeant', 'First Sergeant', 'Staff Sergeant', 'Master Sergeant', 'Chief Warrant Officer'], officer: ['Second Lieutenant', 'Lieutenant', 'Captain', 'Major', 'Lieutenant-Colonel', 'Senior Lieutenant-Colonel', 'Colonel', 'Rear-Admiral (One Star)', 'Rear-Admiral (Two Star)', 'Vice-Admiral'] },
        airforce: { name: 'Republic of Singapore Air Force', icon: '✈️', motto: 'Above All', basic: 'Basic Military Training at Pulau Tekong', officerSchool: 'the Officer Cadet School (Air)', enlisted: ['Aircraftman', 'Lance Corporal', 'Corporal', 'Third Sergeant', 'Second Sergeant', 'First Sergeant', 'Staff Sergeant', 'Master Sergeant', 'Chief Warrant Officer'], officer: ARMY_OFFICERS },
        guard: { name: 'SAF Reserve (NSmen)', icon: '🛡️', motto: 'Yours to Defend', basic: 'In-Camp Training', officerSchool: 'the Officer Cadet School', enlisted: ARMY_ENLISTED, officer: ARMY_OFFICERS },
      },
      bases: {
        army: [['jurongwest', 'SAFTI Military Institute'], ['woodlands', 'Mandai Hill Camp'], ['angmokio', 'Seletar Camp'], ['sgcentral', 'Gombak Base (MINDEF)']],
        navy: [['tampines', 'Changi Naval Base'], ['woodlands', 'Tuas Naval Base']],
        airforce: [['tampines', 'Changi Air Base'], ['woodlands', 'Sembawang Air Base'], ['jurongwest', 'Tengah Air Base'], ['angmokio', 'Paya Lebar Air Base']],
      },
      overseas: {
        army: [['Taiwan', 'Exercise training detachment', 1, false], ['Australia', 'Exercise Wallaby, Shoalwater Bay', 1, false], ['New Zealand', 'Waiouru training detachment', 1, false]],
        navy: [['Gulf of Aden', 'Combined Task Force 151 (counter-piracy)', 1, false]],
        airforce: [['United States', 'Peace Carvin (Mountain Home AFB)', 3, true], ['France', 'Cazaux training detachment', 3, true], ['Australia', 'RAAF Pearce flying training', 3, true]],
      },
    },
    MIL_SPECIAL: (b) => ({
      ...b,
      drill: { names: 'BMT Section Commander', places: 'Basic Military Training Centre, Pulau Tekong' },
      recruiter: { names: 'CMPB (Central Manpower Base) officer' },
      honorGuard: { names: 'SAF Guard of Honour', desc: 'State visits at the Istana and the National Day Parade.' },
      rotc: { names: 'Instructor, Officer Cadet School' },
      joint: { names: 'Joint Staff Officer, MINDEF (Bukit Gombak)' },
      fellow: { names: 'Fellow, S. Rajaratnam School of International Studies' },
      commissioning: 'Officer Cadet School from the ranks',
      chiefs: { army: 'Chief of Army', navy: 'Chief of Navy', airforce: 'Chief of Air Force' },
      chairman: 'Chief of Defence Force',
    }),
    PME: { enlisted: ['Specialist Cadet School', 'Advanced Specialist Course', 'Senior Specialist Staff Course', 'Warrant Officer Course', 'Chief Warrant Officer Course'], officer: ['Officer Cadet School', 'Company Tactics Course', 'Command and Staff Course (Goh Keng Swee Command and Staff College)'] },
    QUALS: { airborne: 'Basic Airborne Course', rangerSchool: 'Ranger Course (SAF Ranger)', jumpmaster: 'Jumpmaster Course', pathfinder: 'Pathfinder Course', combatDiver: 'Naval Diving Unit course', dli: 'SAF language course', instructor: 'SAF instructor course', sere: 'SAF survival course', expertBadge: 'SAF Ranger Tab' },
    SOF: {
      ranger: sf('Special Operations Task Force (Commandos)', 'the Commando Course', '1st Commando Battalion, Hendon Camp', 'red beret', 'Singapore\'s commandos and Special Operations Force: counter-terrorism and hostage rescue.', ['a counter-terrorism standby at home', 'a hostage-rescue exercise']),
      seal: sf('Naval Diving Unit', 'the Naval Diving Unit combat diver course', 'Naval Diving Unit, Sembawang', 'frogman badge', 'Combat divers, clearance divers and maritime counter-terrorism.', ['a maritime security operation in the Singapore Strait']),
    },
    MIL_UNITS: { ground: ['3rd Division', '1st Commando Battalion', '2nd Singapore Infantry Regiment', '40th Battalion, Singapore Armoured Regiment'], naval: ['RSS Formidable', 'RSS Endurance', 'RSS Invincible (submarine)', 'RSS Independence'], air: ['140 Squadron (F-16)', '149 Squadron (F-15SG)', '121 Squadron', '125 Squadron (helicopters)'] },
    MIL_SUMMARY: 'a summary trial by your commanding officer (SAF Act)',
    SERVICE_TERMS: { maxYears: { enlisted: 35, officer: 35 }, ages: { enlisted: 55, officer: 50, flag: 55 }, join: { enlisted: [18, 35], officer: [18, 30] }, name: 'contract' },
    MILITARY_JUSTICE: { code: 'the Singapore Armed Forces Act', court: 'the Military Court', prison: 'the SAF Detention Barracks', counsel: 'Defending officer' },
    VETTING: { form: 'MINDEF security screening', publicTrust: 'Restricted', secret: 'Secret', topSecret: 'Top Secret' },
    CAMPUS: null,
    ACADEMY_NAMES: { army: 'the SAFTI Military Institute', navy: 'the Officer Cadet School (Naval)', airforce: 'the Officer Cadet School (Air)' },
    THEATERS: [
      { id: 'counterTerror', name: 'a terrorist attack on Singapore', adversary: 'terrorists', intensity: 1, home: 0.6, weight: 30, internal: true },
      { id: 'maritime', name: 'a maritime clash in the South China Sea', adversary: 'hostile naval forces', intensity: 1, home: 0, weight: 10 },
    ],
    WAR_START_CHANCE: 0.002,
    MEDALS: {
      moh: { name: 'Pingat Gagah Perkasa (Conspicuous Gallantry Medal)', ribbon: R('#ed2939', '#fff', '#ed2939') }, serviceCross: { name: 'Pingat Keberanian (Medal of Valour)' }, silverStar: { name: 'Pingat Keberanian' },
      dsm: { name: 'Darjah Utama Bakti Cemerlang (Tentera) (Distinguished Service Order)' }, legionOfMerit: { name: 'Pingat Pentadbiran Awam (Tentera) (Public Administration Medal, Military)' }, bronzeStar: { name: 'Pingat Kepujian (Commendation Medal)' },
      purpleHeart: null, msm: { name: 'Pingat Bakti Setia (Long Service Medal, Military)' }, commendation: { name: 'Chief of Defence Force commendation' }, achievement: { name: 'Commander\'s commendation' },
      combatAction: null, goodConduct: { name: 'SAF Good Service Medal' }, humanitarian: { name: 'SAF Overseas Service Medal (humanitarian)' }, expeditionary: { name: 'SAF Overseas Service Medal' }, ndsm: { name: 'National Service Medal' },
    },
    // Singapore's National Day Awards: no knighthoods or titles.
    ORDERS: {
      minAge: 30,
      tiers: [
        { id: 'pbm', name: 'Pingat Bakti Masyarakat (Public Service Medal)', min: 40, ribbon: R('#ed2939', '#fff', '#ed2939') },
        { id: 'pps', name: 'Pingat Pentadbiran Awam (Public Administration Medal, Silver)', min: 80, ribbon: R('#ed2939', '#fff', '#ed2939') },
        { id: 'bbm', name: 'Bintang Bakti Masyarakat (Public Service Star)', min: 120, ribbon: R('#ed2939', '#ffd700', '#ed2939') },
        { id: 'ppaGold', name: 'Pingat Pentadbiran Awam (Emas) (Public Administration Medal, Gold)', min: 175, ribbon: R('#ed2939', '#ffd700', '#ed2939') },
        { id: 'dut', name: 'Darjah Utama Temasek (Order of Temasek)', min: 240, ribbon: R('#ed2939', '#ffd700', '#ed2939') },
      ],
    },
    PARDON: 'the President, on the Cabinet\'s advice',
    COMBAT_TEMPO: 0.02,
    MIL_PENSIONS: { name: 'SAVER (SAF retirement savings)', rate: 0.012, cap: 0.4, vest: 1, immediate: null, deferredAge: 63, lumpSum: 0.1 },
    DIRECT_ENTRY: {
      statePolice: [{ id: 'spfInspector', name: 'SPF Inspector (graduate entry)', levelId: 'lieutenant', education: 'bachelor', maxAge: 35, odds: 0.2, school: 'the Home Team Academy (Senior Officers\' course)' }],
      fire: [{ id: 'scdfOfficer', name: 'SCDF Rota Commander (graduate entry)', levelId: 'lieutenant', education: 'bachelor', maxAge: 35, odds: 0.2, school: 'the Civil Defence Academy' }],
    },
    BENCHES: {
      route: 'appointed', appointedBy: 'the President, on the Chief Justice\'s and Prime Minister\'s advice', retire: 65,
      ladder: [
        { id: 'districtJudge', name: 'District Judge (State Courts)', icon: '🔨', salary: 160000, minYears: 7, entry: true },
        { id: 'judicialCommissioner', name: 'Judicial Commissioner', icon: '⚖️', salary: 300000, minYears: 10 },
        { id: 'high', name: 'Judge of the High Court', icon: '📜', salary: 400000, minYears: 10 },
        { id: 'appeal', name: 'Justice of the Court of Appeal', icon: '🏛️', salary: 450000, minYears: 15 },
      ],
    },
  },
};
