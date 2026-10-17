/**
 * Palestine (the State of Palestine, as run by the Palestinian Authority),
 * built on Mexico: a presidential system with a prime minister, a Legislative
 * Council that hasn't sat since 2007, one national Civil Police, Civil
 * Defence and the Palestine Red Crescent's ambulances, the National Security
 * Forces (no conscription), a large informal economy, the shekel as currency,
 * and borders, crossings and residency largely outside the Authority's control.
 *
 * Amounts are shekels converted at 2023 PPP (₪2.1 per international $), 2025 rates.
 * See docs/ADDING-A-COUNTRY.md for the shape of a pack.
 */

const ILS = 2.1;
const ppp = (local) => Math.round(local / ILS);
const cmd = (top, steps, head) => ({ ...Object.fromEntries(steps.map((t, i) => [`${top}_cmd${i + 1}`, t])), [top]: head });
const R = (...colors) => colors.map((c) => [c, 1]);
const gov = (name, extra = {}) => ({ name, incomeTax: [], propertyTax: 0.01, salesTax: 0.16, rightToWork: false, cannabis: false, dui: { fineMult: 1, suspendYears: 1 }, minWage: ppp(9.6), population: 'medium', disasters: { flood: 0.02 }, ...extra });
const ENLISTED = ['Jundi (Private)', 'Areef (Corporal)', 'Raqib (Sergeant)', 'Raqib Awwal (Staff Sergeant)', 'Musa\'id (Warrant Officer)', 'Musa\'id Awwal (Chief Warrant Officer)', 'Musa\'id Awwal (Battalion)', 'Musa\'id Awwal (Brigade)', 'Musa\'id Awwal (Forces)'];
const OFFICERS = ['Mulazim (Second Lieutenant)', 'Mulazim Awwal (Lieutenant)', 'Naqib (Captain)', 'Ra\'id (Major)', 'Muqaddam (Lieutenant Colonel)', 'Aqid (Colonel)', 'Amid (Brigadier)', 'Liwa (Major General)', 'Fariq (Lieutenant General)', 'Fariq Awwal (General)'];
const town = (c) => c.split(',')[0];
/** Tables a pack built on Mexico must not inherit: the base's own agencies are switched off, then ours added. */
const only = (mine) => (b) => ({ ...Object.fromEntries(Object.keys(b ?? {}).map((k) => [k, null])), ...mine });

export const PS = {
  id: 'PS',
  basedOn: 'MX',
  groups: [],
  agreements: [],
  licenceExchange: [],
  peers: [],
  country: {
    name: 'Palestine',
    flag: '🇵🇸',
    demonym: 'Palestinian',
    capital: 'Ramallah (seat of government)',
    currency: { code: 'ILS', symbol: '₪', perUsd: ILS },
    languages: ['Arabic'],
    emergency: '100 / 101 / 102',
    retirementAge: 60,
    informality: 0.55,
    tax: {
      // Income Tax Law: a personal exemption of about ₪36,000, then 5%, 10% and 15%.
      allowance: ppp(36000),
      brackets: [[ppp(39000), 0.05], [ppp(75000), 0.1], [Infinity, 0.15]],
      contributions: [],
      label: 'Ministry of Finance (Income Tax Department)',
    },
    // No national pension for the private sector (an end-of-service gratuity instead); social assistance in old age.
    pension: { kind: 'flat', name: 'social assistance in old age (Ministry of Social Development)', full: ppp(3000), years: 1, minYears: 0, ages: [60, 60] },
    health: { name: 'government health insurance (Ministry of Health)', short: 'government health insurance', deductible: 0, coinsurance: 0.25, oopMax: ppp(4000) },
    childBenefit: { amount: ppp(700), phaseOutFrom: ppp(12000), name: 'National Cash Transfer Programme' },
    terms: {
      'Federal government': 'Palestinian Authority', 'State government': 'Governorate', 'Federal income tax': 'Income tax', 'State income tax': 'Income tax',
      'Social Security': 'social assistance', '401(k)': 'provident fund', IRA: 'savings account', IRS: 'Income Tax Department', Medicaid: 'government health insurance', Medicare: 'government health insurance', 'GI Bill': 'security forces education support',
      'high school': 'secondary school', 'High School': 'Secondary School', IMSS: 'government health insurance', ISSSTE: 'General Pension Authority', SAT: 'Income Tax Department', AFORE: 'provident fund', Infonavit: 'housing loan', Fiscalía: 'Public Prosecution',
    },
    names: {
      male: ['Mohammed', 'Ahmad', 'Omar', 'Yousef', 'Khaled', 'Mahmoud', 'Ali', 'Ibrahim', 'Hamza', 'Adam', 'Kareem', 'Tamer', 'Issa', 'Elias', 'Fadi', 'Saleh'],
      female: ['Mariam', 'Lana', 'Sara', 'Layan', 'Rahaf', 'Nour', 'Hala', 'Rania', 'Dima', 'Reem', 'Jana', 'Yasmin', 'Salma', 'Aya', 'Maya', 'Lina'],
      last: ['Abu Ali', 'Khalil', 'Haddad', 'Barghouti', 'Nasser', 'Saleh', 'Odeh', 'Hamdan', 'Khoury', 'Qasem', 'Shaheen', 'Jaber', 'Darwish', 'Masri', 'Ayyad', 'Zayed'],
    },
    provinces: {
      'PS-RBH': gov('Ramallah and al-Bireh'),
      'PS-NBS': gov('Nablus'),
      'PS-HBN': gov('Hebron', { population: 'large' }),
      'PS-BTH': gov('Bethlehem', { population: 'small' }),
      'PS-JEN': gov('Jenin'),
      'PS-GZA': gov('Gaza', { population: 'large', disasters: { flood: 0.04 } }),
    },
    cities: {
      ramallah: { name: 'Ramallah', icon: '🏛️', type: 'Capital region', state: 'PS-RBH', col: 0.9, market: 0.7, locality: 0.15, transit: 15, fare: ppp(600), walkable: true, size: 'medium', population: [40000, 380000] },
      nablus: { name: 'Nablus', icon: '🧼', type: 'Mid-size city', state: 'PS-NBS', col: 0.75, market: 0.55, locality: 0.12, transit: 10, fare: ppp(500), walkable: true, size: 'medium', population: [160000, 420000] },
      hebron: { name: 'Hebron', icon: '🍇', type: 'Mid-size city', state: 'PS-HBN', col: 0.72, market: 0.52, locality: 0.12, transit: 10, fare: ppp(500), walkable: true, size: 'medium', population: [230000, 800000] },
      bethlehem: { name: 'Bethlehem', icon: '⭐', type: 'Small city', state: 'PS-BTH', col: 0.8, market: 0.6, locality: 0.13, transit: 10, fare: ppp(500), walkable: true, size: 'small', population: [30000, 230000] },
      jenin: { name: 'Jenin', icon: '🌾', type: 'Small city', state: 'PS-JEN', col: 0.65, market: 0.45, locality: 0.1, transit: 5, fare: ppp(450), walkable: true, size: 'small', population: [50000, 340000] },
      gazacity: { name: 'Gaza City', icon: '🌊', type: 'Coastal metro', state: 'PS-GZA', col: 0.6, market: 0.35, locality: 0.08, transit: 5, fare: ppp(400), walkable: true, size: 'large', population: [600000, 2100000] },
    },
    hometowns: ['ramallah', 'nablus', 'hebron', 'hebron', 'bethlehem', 'jenin', 'gazacity', 'gazacity'],
    population: { 'PS-RBH': 0.38e6, 'PS-NBS': 0.42e6, 'PS-HBN': 0.8e6, 'PS-BTH': 0.23e6, 'PS-JEN': 0.34e6, 'PS-GZA': 2.1e6 },
  },
  offices: {
    ps_plc: { country: 'PS', name: 'Member of the Palestinian Legislative Council', icon: '🏛️', level: 4, term: 4, termLimit: 0, salary: 40000, minAge: 28, residency: 0, cost: 40000, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    ps_president: { country: 'PS', name: 'President of the State of Palestine', icon: '🇵🇸', level: 5, term: 4, termLimit: 2, salary: 60000, minAge: 35, residency: 0, cost: 2000000, statewide: true, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true },
  },
  tables: {
    /* Law and money */
    JUSTICE: { trial: 'bench', sentence: 0.8, jail: (c) => `${town(c)} police detention centre`, prison: 'a correction and rehabilitation centre', legalAid: 'a legal aid lawyer (Bar Association)', privatePrisons: 0 },
    INSOLVENCY: { liquidation: { name: 'Bankruptcy (Courts of First Instance)', wait: 5 }, plan: { name: 'Court-supervised settlement', years: 3, wait: 2 }, homestead: 0, wildcard: ppp(3000), creditYears: 5 },
    INHERITANCE: { name: 'no inheritance tax (sharia and church courts divide estates)', exemption: Infinity, brackets: [[Infinity, 0]] },
    UNEMPLOYMENT: { name: 'no unemployment insurance (cash transfer programme)', flat: ppp(2400), years: 0.25 },
    SEVERANCE: { perYear: 1 / 12, base: 0 },
    DISABILITY: { name: 'Disability assistance (Ministry of Social Development)', rate: 0, floor: ppp(3600), cap: ppp(3600), minYears: 0, odds: 0.8, stages: ['Assessment', 'Review'] },
    SELF_EMPLOYED: { name: 'Self-employed income tax', rate: 0, cap: 0 },
    CREDIT: { name: 'credit record (Palestine Monetary Authority)' },
    SMALL_BIZ_LOAN: 'microfinance loan',
    VETERANS: { orgs: ['General Commission for the Affairs of Retired Military Personnel'], care: 'the Military Medical Services' },
    STOCK_INDEX: 'Al-Quds Index (Palestine Exchange)',
    MORTGAGES: { closing: 0.04, stress: 0.03, products: { bank: { name: 'Bank housing loan (20-yr)', years: 20, rateAdj: 0.02, minDown: 0.3, minScore: 600, maxDti: 0.4 } } },
    UNIONS: { police: null, fire: null, ems: 'General Union of Health Workers', health: 'Palestinian Nursing and Midwifery Association', education: 'General Union of Palestinian Teachers', public: 'Union of Public Employees', prisons: null, transport: 'General Union of Transport Workers', rail: null, aviation: null, pilots: null, trades: 'Palestine General Federation of Trade Unions (construction)', industry: 'Palestine General Federation of Trade Unions', retail: 'Palestine General Federation of Trade Unions', hospitality: 'Palestine General Federation of Trade Unions', services: 'Palestine General Federation of Trade Unions', media: 'Palestinian Journalists Syndicate', tech: null, arts: null, postal: null },
    CADETS: { jrotc: 'Palestinian Scouts', seaCadets: null },
    FOREIGN_SERVICE_EXAM: 'Ministry of Foreign Affairs and Expatriates diplomatic exam',
    PROSECUTORS: ['Public Prosecution (Attorney General)', 'Bar Association legal aid', 'Family Protection Units'],
    VOLUNTEER_SERVICES: { fire: 'Civil Defence volunteers', police: null, sar: 'Civil Defence search and rescue volunteers', ambulance: 'Palestine Red Crescent volunteer', wildland: null, auxiliary: null, cap: null, cert: 'Emergency committee volunteers', redcross: 'Palestine Red Crescent Society', skiPatrol: null, mrc: null },
    VOLUNTEER_PARENTS: {
      fire: { name: 'the Palestinian Civil Defence', level: 'national', funds: 1, grant: null },
      ambulance: { name: 'the Palestine Red Crescent Society', level: 'national', funds: 0.8, grant: 'a Red Crescent donor appeal allocation' },
      cert: { name: 'the Palestinian Civil Defence', level: 'national', funds: 0.8, grant: null },
    },
    NATIONAL_SERVICE: { overseas: null, domestic: null },
    ACCOUNTS: { dc: 'Provident fund', roth: { name: 'Savings account', limit: ppp(50000) }, traditional: null },
    REFERENDUMS: {},
    ENTRANCE_EXAMS: { name: 'Tawjihi (General Secondary Examination)', prep: { name: 'Tawjihi tutoring', cost: ppp(2000) }, weight: 0.9 },
    AVIATION_AUTHORITY: 'Palestinian Civil Aviation Authority',
    COUNTY: 'Governorate',
    LONG_TERM_CARE: { name: 'family care (no public long-term care)', covers: 0, safetyNet: 'the Ministry of Social Development' },
    WORKPLACE: { equality: 'the Ministry of Labour', reservist: 'Labour Law job protection', labourBoard: 'the Ministry of Labour' },
    EQUIPMENT: { 'Patrol sedan': 'Police patrol car (Hyundai)', 'Police SUV': 'Police jeep (Toyota Land Cruiser)', 'Pumper engine': 'Civil Defence fire engine', '100-ft aerial ladder truck': 'Aerial ladder', HMMWV: 'Toyota Land Cruiser (security forces)', JLTV: 'Armoured Land Cruiser', 'M2 Bradley': null, Stryker: null, 'M1A2 Abrams': null, 'F-16': null, 'F-35A': null, 'C-130J': null, 'MH-60R Seahawk': null, 'F/A-18E/F Super Hornet': null },
    LOCAL_ENTITIES: { sole: 'Sole proprietorship (Ministry of National Economy)', llc: 'Private shareholding company', ccorp: 'Public shareholding company' },
    PRIVATE_TITLES: { 'Chief Executive Officer': 'General Manager' },

    /* Schools and credentials */
    EDUCATION: {
      tuition: { community: ppp(1500), technical: ppp(2000), online: ppp(1200), state: ppp(3000), private: ppp(6000), elite: ppp(5000) },
      schools: { community: 'Community college', technical: 'Palestine Technical University – Kadoorie', online: 'Al-Quds Open University', state: 'An-Najah National University', private: 'Arab American University', elite: 'Birzeit University', academy: 'Al-Istiqlal University (security sciences)' },
      words: { 'High School': 'Secondary School', 'high-school diploma': 'Tawjihi certificate', 'high school': 'secondary school', GED: 'Tawjihi (external candidate)' },
      licenses: {
        'State Bar License': 'Palestinian Bar Association licence', 'Medical License (MD)': 'Palestinian Medical Council licence', 'Board Certification': 'Palestinian Board specialty certificate', 'Certified Public Accountant (CPA)': 'Certified accountant (Palestinian Association of Certified Public Accountants)',
        'Peace Officer (POST Basic Academy)': 'Police training (Jericho)', 'Registered Nurse (RN)': 'Registered nurse (Ministry of Health)', 'Commercial Driver License (Class A)': 'Heavy truck licence', 'Commercial Driver License (Class B)': 'Truck licence', 'Driver\'s License (Class D)': 'Private car licence', 'Learner\'s Permit': 'Learner licence',
        'Professional Engineer (PE)': 'Engineers Association membership', 'EMT (NREMT)': 'EMT (Red Crescent)', 'Paramedic (NRP)': 'Paramedic (Red Crescent)', 'Pharmacist License (NAPLEX + MPJE)': 'Pharmacist licence (Ministry of Health)',
      },
    },
    SHORT_CYCLE: 'Intermediate diploma (two years)',
    CREDENTIAL_LOCAL: { 'Driving licence (car)': 'Private car licence', 'Heavy goods vehicle licence (articulated)': 'Heavy truck licence', 'Heavy goods vehicle licence (rigid)': 'Truck licence', 'Bus & coach licence': 'Public transport licence', 'Security licence': 'Security guard permit', 'Construction site safety card': 'Occupational safety certificate' },
    PROFESSIONAL_DEGREES: { jd: 'LL.B. + Bar Association training', md: 'M.D. (six years)' },
    UNDERGRAD_ENTRY: { jd: 4, md: 6 },
    APPRENTICESHIP_SYSTEMS: { name: 'Vocational training centre (Ministry of Labour)', years: 2, pay: ppp(18000), exam: 'vocational certificate' },

    /* Moving here */
    WORKING_HOLIDAY: null,
    IMMIGRATION: {
      visas: {
        work: { name: 'Work and residence permit (subject to Israeli entry rules)', odds: 0.2, years: 1, degree: true, fee: 200 },
        transfer: { name: 'NGO / company assignment permit', odds: 0.4, years: 1, fee: 200 },
        student: { name: 'Student permit (Birzeit and An-Najah programmes)', odds: 0.4, years: 4, postStudy: 0, fee: 100 },
        family: { name: 'Family reunification', odds: 0.1, years: 1, fee: 100 },
      },
      pr: { name: 'Residency registration (Palestinian ID)', years: 10, fee: 200 },
      nat: { years: 15, married: 10, needsPR: true, fromArrival: true, prMin: 5, fee: 200 },
      dualIn: true, dualOut: true, birthright: false, prLapse: 7,
      intlTuition: { mult: 1.5 },
    },
    ASYLUM: { name: 'no asylum system', odds: 0, decision: 1, workAfter: 99, prYears: 0, support: 0 },
    LICENCE_EXCHANGE: [],
    PEERS: [],
    OVERSTAY_BAN: 5,
    BIRTH_REGISTRATION: { name: 'Registration of a child born abroad (Ministry of Interior)', fee: 50, deadline: false },
    PARENT_VISAS: { name: 'Family reunification (parent)', needs: 'citizen', odds: 0.05, wait: 3, fee: 100 },
    DIASPORA: { share: 0, from: [] },

    /* Government and politics */
    LEGISLATURES: {
      lower: { name: 'Palestinian Legislative Council', seats: 132, presiding: 'Speaker of the Council', office: 'ps_plc' },
      exec: 'President', execOffice: 'ps_president', veto: true,
    },
    PARTY_NAMES: { labor: 'Fatah', business: 'Palestinian National Initiative' },
    CORPORATE_RATE: 0.15,
    HEALTH_SYSTEMS: { wait: 10, waitName: 'referral waiting list', private: { name: 'Private clinic and hospital fees', premium: ppp(2500), skipsWait: true } },
    PUBLIC_LABOUR: { noStrike: ['police', 'military'], association: [] },
    AGENCIES: only({
      fbi: { name: 'Criminal Investigation Department (Civil Police)', employers: ['CID — Ramallah', 'CID — Nablus'], titles: { trainee: 'Investigator (trainee)', agent: 'Investigator', senior: 'Senior Investigator', ssa: 'Head of Investigations Section', asac: 'Director of Investigations (governorate)', sac: 'Director-General, Criminal Investigation' } },
      borderPatrol: { name: 'General Administration of Crossings and Borders', employers: ['Al-Karama (Allenby) crossing', 'Rafah crossing'] },
      usss: { name: 'Presidential Guard', employers: ['Presidential Guard — Ramallah'] },
      postal: { name: 'Palestine Post', employers: ['Palestine Post — Ramallah'] },
      benefitsClaims: { name: 'Ministry of Social Development', employers: ['Ministry of Social Development — Ramallah'] },
      intelligence: { name: 'General Intelligence Service', employers: ['General Intelligence — Ramallah'] },
      meteorology: { name: 'Palestinian Meteorological Department', employers: ['Meteorological Department — Ramallah'] },
      regulatory: { name: 'Financial Regulation (Monetary Authority · Capital Market Authority)', employers: ['Palestine Monetary Authority', 'Capital Market Authority'] },
      foreignService: { name: 'Ministry of Foreign Affairs and Expatriates', employers: ['MOFAE — Ramallah'] },
      oig: { name: 'State Audit and Administrative Control Bureau', employers: ['SAACB — Ramallah'] },
    }),
    LOCAL_AGENCIES: (b) => ({
      ...b,
      education: { name: 'Public schools', employer: (c) => `Directorate of Education — ${town(c)}`, titles: { sub: 'Substitute Teacher', teacher: 'Teacher', senior: 'Senior Teacher', coach: 'Educational Supervisor', specialist: 'Subject Supervisor', chair: 'Head Teacher', ap: 'Deputy Principal', principal: 'Principal', director: 'Director of Education (directorate)', assistantSuper: 'Assistant Deputy Minister', ...cmd('superintendent', ['Deputy Minister'], 'Minister of Education') } },
      municipalAdmin: { name: 'Municipality', employer: (c) => `${town(c)} Municipality`, titles: { clerk: 'Clerk', deputyClerk: 'Administrative Officer', cityClerk: 'Council Secretary', analyst: 'Accountant', seniorAnalyst: 'Senior Accountant', financeDirector: 'Head of Finance', manager: 'Department Director', acm: 'Municipal Director', ...cmd('cityManager', ['Deputy Mayor\'s Office Director'], 'Municipal Director-General') } },
      police: null, transitPolice: null, jail: null, revenue: null, probation: null,
      statePolice: {
        name: 'Palestinian Civil Police', employer: (c) => `Palestinian Civil Police — ${town(c)} directorate`,
        titles: { cadet: 'Police recruit (Jericho)', trooper: 'Shurti (Constable)', senior: 'Areef (Corporal)', investigator: 'Investigator', majorCrimes: 'Investigator (CID)', detSergeant: 'Raqib (Investigations)', detLieutenant: 'Mulazim Awwal (Investigations)', detCaptain: 'Ra\'id (Head of Investigations)', sergeant: 'Raqib (Sergeant)', lieutenant: 'Mulazim (Lieutenant)', captain: 'Naqib (Captain)', major: 'Ra\'id (Major)', ...cmd('superintendent', ['Muqaddam (Lieutenant Colonel)', 'Aqid (Colonel, governorate director)', 'Amid (Brigadier)', 'Liwa (Deputy Director-General)'], 'Director-General of the Palestinian Civil Police') },
      },
      corrections: { name: 'Correction and Rehabilitation Centres', employer: (c) => `${town(c)} Correction and Rehabilitation Centre` },
      fire: {
        name: 'Palestinian Civil Defence', employer: (c) => `Civil Defence — ${town(c)} directorate`,
        titles: { recruit: 'Civil Defence recruit', firefighter: 'Firefighter', engineer: 'Firefighter (driver)', inspector: 'Prevention and safety inspector', investigator: 'Fire investigator', lieutenant: 'Mulazim (station officer)', captain: 'Naqib (station commander)', battalion: 'Ra\'id (directorate operations)', deputyChief: 'Aqid (governorate director)', ...cmd('chief', ['Amid (deputy director-general)'], 'Director-General of Civil Defence') },
      },
      ems: {
        name: 'Palestine Red Crescent Society (EMS)', employer: (c) => `Palestine Red Crescent — ${town(c)} EMS station`,
        titles: { emt: 'EMT', paramedic: 'Paramedic', criticalCare: 'Senior Paramedic', flight: 'Paramedic (field hospital)', fto: 'EMS trainer', supervisor: 'Shift Leader', captain: 'Station Director', deputy: 'Director of EMS (branch)', ...cmd('chief', ['Deputy Director of EMS'], 'Director of Emergency Medical Services') },
      },
      dispatch: { name: '101 / 102 operations', employer: (c) => `Emergency operations room — ${town(c)}`, titles: { trainee: 'Dispatcher (trainee)', telecommunicator: 'Dispatcher', senior: 'Senior Dispatcher', training: 'Trainer', supervisor: 'Operations Room Supervisor', ...cmd('director', ['Operations Manager'], 'Director of Operations') } },
      prosecution: { name: 'Public Prosecution', employer: (c) => `Public Prosecution — ${town(c)}`, titles: { clerk: 'Legal Assistant', ada: 'Assistant Prosecutor', senior: 'Prosecutor', trial: 'Chief Prosecutor (governorate)', chiefDeputy: 'Assistant Attorney General', ...cmd('first', ['Deputy Attorney General'], 'Attorney General') } },
    }),
    NATIONAL_SERVICES: ['fire', 'ems'],
    POLICE_UNITS: { k9: 'Police K9 unit', swat: 'Special Police Force', traffic: 'Traffic Police', narcotics: 'Anti-Narcotics Department', gang: 'Special Police Force', negotiator: 'Negotiation unit', sro: 'Community police', instructor: 'Police training academy (Jericho)', ia: 'Inspector General\'s office', protection: 'Presidential Guard liaison' },
    POLICE_BUREAUS: { homicide: 'Criminal Investigation Department', svu: 'Family Protection Unit', property: 'Property crimes section', robbery: 'Criminal Investigation Department', cyber: 'Cybercrime unit' },
    VOLUNTEER_MEDAL: 'Volunteer recognition certificate',

    /* The National Security Forces */
    FORCES: {
      pay: 0.35, exposure: 0.3,
      conscription: null,
      branches: {
        army: { name: 'Palestinian National Security Forces', icon: '🇵🇸', motto: 'For the homeland', basic: 'recruit training at the Jericho training centre', officerSchool: 'Al-Istiqlal University (security sciences)', enlisted: ENLISTED, officer: OFFICERS },
      },
      bases: {
        army: [['ramallah', 'National Security Forces headquarters'], ['jenin', 'Jenin battalion'], ['nablus', 'Nablus battalion'], ['hebron', 'Hebron battalion']],
      },
      overseas: {
        army: [['Jordan', 'Jordan International Police Training Center', 1, false]],
      },
    },
    MIL_SPECIAL: { drill: { names: 'Recruit instructor' }, recruiter: { names: 'Recruitment directorate officer' }, honorGuard: { names: 'Presidential Guard honour company', desc: 'State ceremonies at the Muqata\'a in Ramallah.' }, rotc: { names: 'Instructor, Al-Istiqlal University' }, joint: { names: 'Staff officer, security forces headquarters' }, fellow: { names: 'Fellow, Palestinian security studies' }, commissioning: 'officer course from the ranks', chiefs: { army: 'Commander of the National Security Forces' }, chairman: 'Commander of the National Security Forces' },
    PME: { enlisted: ['NCO course', 'Senior NCO course'], officer: ['Officers\' course', 'Command and staff course'] },
    QUALS: { airborne: null, rangerSchool: 'Special forces course', jumpmaster: null, pathfinder: null, combatDiver: null, dli: 'Language course', instructor: 'Instructors\' course', sere: null, expertBadge: null },
    SOF: {},
    MIL_UNITS: { ground: ['1st Battalion', '2nd Battalion', 'Special Forces battalion'] },
    MIL_SUMMARY: 'a disciplinary hearing before your commander',
    SERVICE_TERMS: { maxYears: { enlisted: 30, officer: 35 }, ages: { enlisted: 55, officer: 58, flag: 60 }, join: { enlisted: [18, 30], officer: [18, 30] }, name: 'term of service' },
    MILITARY_JUSTICE: { code: 'the Revolutionary Penal Code', court: 'a military court', prison: 'a military detention facility', counsel: 'Military defence lawyer' },
    VETTING: { form: 'security vetting', publicTrust: 'Basic vetting', secret: 'Secret', topSecret: 'Top Secret' },
    CAMPUS: null,
    ACADEMY_NAMES: { army: 'Al-Istiqlal University (security sciences)' },
    THEATERS: [
      { id: 'unrest', name: 'armed clashes during incursions', adversary: 'armed forces', intensity: 1, home: 0.7, weight: 30, internal: true },
    ],
    WAR_START_CHANCE: 0.01,
    MEDALS: {
      moh: { name: 'Star of Honour (Najmat al-Sharaf)', ribbon: R('#000000', '#ffffff', '#007a3d') }, serviceCross: { name: 'Medal of Courage' }, silverStar: { name: 'Medal of Military Merit' },
      dsm: { name: 'Order of Merit and Excellence' }, legionOfMerit: { name: 'Medal of Distinguished Service' }, bronzeStar: { name: 'Commander\'s Medal' },
      purpleHeart: { name: 'Wound Medal' }, msm: { name: 'Long Service Medal' }, commendation: { name: 'Commander\'s commendation' }, achievement: { name: 'Unit commendation' },
      combatAction: null, goodConduct: { name: 'Good Conduct Medal' }, humanitarian: null, expeditionary: null, ndsm: null,
    },
    ORDERS: {
      minAge: 35,
      tiers: [
        { id: 'meritExcellence', name: 'Order of Merit and Excellence', min: 60, ribbon: R('#000000', '#ffffff', '#007a3d') },
        { id: 'jerusalemStar', name: 'Star of Jerusalem (Najmat al-Quds)', min: 120, ribbon: R('#ce1126', '#ffffff', '#007a3d') },
        { id: 'starOfHonour', name: 'Grand Star of Honour', min: 180, ribbon: R('#ce1126', '#ffd700', '#007a3d') },
        { id: 'grandCollar', name: 'Grand Collar of the State of Palestine', min: 260, ribbon: R('#ce1126', '#ffd700', '#007a3d') },
      ],
    },
    PARDON: 'the President',
    COMBAT_TEMPO: 0.2,
    MIL_PENSIONS: { name: 'General Pension Authority (security forces)', rate: 0.02, cap: 0.7, vest: 15, immediate: { enlisted: 20, officer: 20 }, deferredAge: 60 },
    BENCHES: {
      route: 'appointed', appointedBy: 'the President, on the High Judicial Council\'s nomination', retire: 70,
      ladder: [
        { id: 'conciliation', name: 'Magistrate (Conciliation Court)', icon: '🔨', salary: 30000, minYears: 3, entry: true },
        { id: 'firstInstance', name: 'Judge of the Court of First Instance', icon: '⚖️', salary: 38000, minYears: 6, entry: true },
        { id: 'appeal', name: 'Judge of the Court of Appeal', icon: '📜', salary: 46000, minYears: 10 },
        { id: 'supreme', name: 'Judge of the High Court of Justice', icon: '🏛️', salary: 55000, minYears: 15 },
      ],
    },
  },
};
