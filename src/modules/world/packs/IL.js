/**
 * Israel, built on the United Kingdom (a mixed common-law system with a
 * one-chamber parliament): one national police force, a national Fire and
 * Rescue Authority and Magen David Adom ambulances; compulsory IDF service at
 * 18 for men (32 months) and women (24), with reserve duty after; Bituach
 * Leumi and a mandatory workplace pension; health cover through the kupot
 * holim; a high tempo of military operations.
 *
 * Amounts are shekels converted at 2023 PPP (₪3.7 per US$), 2025 rates.
 * See docs/ADDING-A-COUNTRY.md for the shape of a pack.
 */

const ILS = 3.7;
const ppp = (local) => Math.round(local / ILS);
const cmd = (top, steps, head) => ({ ...Object.fromEntries(steps.map((t, i) => [`${top}_cmd${i + 1}`, t])), [top]: head });
const sf = (name, course, unitName, badge, desc, deployments) => ({ name, course, unitName, badge, desc, deployments });
const R = (...colors) => colors.map((c) => [c, 1]);
const district = (name, extra = {}) => ({ name, incomeTax: [], propertyTax: 0.006, salesTax: 0.18, rightToWork: false, cannabis: false, dui: { fineMult: 2, suspendYears: 2 }, minWage: ppp(32.3), population: 'medium', disasters: { wildfire: 0.03 }, ...extra });
const ENLISTED = ['Turai (Private)', 'Rav-Turai (Corporal)', 'Samal (Sergeant)', 'Samal Rishon (Staff Sergeant)', 'Rav-Samal (Sergeant First Class)', 'Rav-Samal Rishon (Master Sergeant)', 'Rav-Samal Mitkadem (Sergeant Major)', 'Rav-Samal Bakhir (Senior Sergeant Major)', 'Rav-Nagad (Chief Warrant Officer)'];
const OFFICERS = ['Segen-Mishne (Second Lieutenant)', 'Segen (Lieutenant)', 'Seren (Captain)', 'Rav-Seren (Major)', 'Sgan-Aluf (Lieutenant Colonel)', 'Aluf-Mishne (Colonel)', 'Tat-Aluf (Brigadier General)', 'Aluf (Major General)', 'Aluf (General Staff)', 'Rav-Aluf (Chief of the General Staff)'];
const town = (c) => c.split(',')[0];

export const IL = {
  id: 'IL',
  basedOn: 'GB',
  groups: ['RICH_SYSTEMS'],
  agreements: [],
  licenceExchange: ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'IE'],
  peers: [],
  country: {
    name: 'Israel',
    flag: '🇮🇱',
    demonym: 'Israeli',
    capital: 'Jerusalem',
    currency: { code: 'ILS', symbol: '₪', perUsd: ILS },
    languages: ['Hebrew', 'Arabic'],
    emergency: '100 / 101 / 102',
    retirementAge: 67,
    informality: 0.05,
    tax: {
      // 2025: tax credit points cover roughly the first ₪60,000; then 10%, 14%, 20%, 31%, 35%, 47%, and 50% above ₪721,560.
      allowance: ppp(60000),
      brackets: [[ppp(24120), 0.1], [ppp(36600), 0.14], [ppp(73080), 0.2], [ppp(75480), 0.31], [ppp(291000), 0.35], [ppp(161280), 0.47], [Infinity, 0.5]],
      // Bituach Leumi and the health tax, about 7% of pay up to the ceiling; 6% into the mandatory pension fund.
      contributions: [{ name: 'Bituach Leumi & health tax', rate: 0.07, from: 0, to: ppp(608000) }, { name: 'Pension fund (employee)', rate: 0.06, from: 0, to: ppp(608000) }],
      label: 'Israel Tax Authority',
    },
    // Old-age pension from Bituach Leumi (with a seniority increment) plus the mandatory occupational pension.
    pension: { kind: 'tiered', name: 'Old-age pension (Bituach Leumi) + pension fund', basic: ppp(26000), years: 35, cap: ppp(300000), accrual: 0.013, ages: [62, 67] },
    employerSuper: 0.065,
    health: { name: 'National Health Insurance (kupat holim)', short: 'kupat holim', deductible: 0, coinsurance: 0.05, oopMax: ppp(2500) },
    childBenefit: { amount: ppp(2076), phaseOutFrom: Infinity, name: 'Child allowance (Bituach Leumi)' },
    terms: {
      'Federal government': 'Government', 'Federal income tax': 'Income tax', 'State income tax': 'Income tax', 'Social Security': 'Bituach Leumi',
      '401(k)': 'pension fund', IRA: 'keren hishtalmut', IRS: 'Israel Tax Authority', Medicaid: 'National Health Insurance', Medicare: 'National Health Insurance', 'GI Bill': 'discharged soldiers\' grant',
      'high school': 'high school', HMRC: 'Israel Tax Authority', 'the NHS': 'the kupat holim', NHS: 'kupat holim', 'National Insurance': 'Bituach Leumi', 'State Pension': 'old-age pension', ISA: 'keren hishtalmut',
      'workplace pension': 'pension fund', 'National government': 'Government', 'Scottish income tax': 'Income tax', 'council tax': 'arnona', 'Council Tax': 'Arnona',
    },
    names: {
      male: ['Noam', 'Ariel', 'David', 'Yosef', 'Uri', 'Itai', 'Eitan', 'Lior', 'Daniel', 'Amit', 'Omer', 'Yonatan', 'Muhammad', 'Ahmad', 'Yusuf', 'Omar'],
      female: ['Noa', 'Tamar', 'Maya', 'Shira', 'Yael', 'Talia', 'Avigail', 'Michal', 'Adi', 'Noga', 'Hila', 'Rivka', 'Mariam', 'Lina', 'Rania', 'Aya'],
      last: ['Cohen', 'Levi', 'Mizrahi', 'Peretz', 'Biton', 'Dahan', 'Avraham', 'Friedman', 'Katz', 'Azoulay', 'Malka', 'Shapiro', 'Haddad', 'Khoury', 'Masarwa', 'Abu Ahmad'],
    },
    provinces: {
      'IL-JM': district('Jerusalem District', { population: 'large' }),
      'IL-TA': district('Tel Aviv District', { population: 'large' }),
      'IL-HA': district('Haifa District', { disasters: { wildfire: 0.05 } }),
      'IL-M': district('Central District', { population: 'large' }),
      'IL-D': district('Southern District', { disasters: { wildfire: 0.03, flood: 0.02 } }),
      'IL-Z': district('Northern District', { disasters: { wildfire: 0.05 } }),
    },
    cities: {
      jerusalem: { name: 'Jerusalem', icon: '🕍', type: 'Capital region', state: 'IL-JM', col: 1.3, market: 1.1, locality: 0.22, transit: 55, fare: ppp(2700), walkable: true, size: 'large', population: [1000000, 1300000] },
      telaviv: { name: 'Tel Aviv', icon: '🏖️', type: 'High-cost metro', state: 'IL-TA', col: 1.55, market: 1.35, locality: 0.26, transit: 60, fare: ppp(2700), walkable: true, size: 'enterprise', population: [475000, 4100000] },
      haifa: { name: 'Haifa', icon: '⚓', type: 'Coastal metro', state: 'IL-HA', col: 1.15, market: 0.95, locality: 0.2, transit: 45, fare: ppp(2500), walkable: true, size: 'large', population: [290000, 600000] },
      rishonlezion: { name: 'Rishon LeZion', icon: '🍇', type: 'Suburb', state: 'IL-M', col: 1.3, market: 1.15, locality: 0.22, transit: 40, fare: ppp(2500), walkable: true, size: 'medium', population: [260000, 4100000] },
      beersheba: { name: 'Be\'er Sheva', icon: '🏜️', type: 'Mid-size city', state: 'IL-D', col: 1.0, market: 0.8, locality: 0.18, transit: 30, fare: ppp(2400), walkable: true, size: 'medium', population: [215000, 380000] },
      nazareth: { name: 'Nazareth', icon: '⛪', type: 'Mid-size city', state: 'IL-Z', col: 0.95, market: 0.75, locality: 0.17, transit: 20, fare: ppp(2200), walkable: true, size: 'small', population: [78000, 250000] },
    },
    hometowns: ['jerusalem', 'jerusalem', 'telaviv', 'telaviv', 'haifa', 'rishonlezion', 'beersheba', 'nazareth'],
    population: { 'IL-JM': 1.3e6, 'IL-TA': 1.5e6, 'IL-HA': 1.1e6, 'IL-M': 2.4e6, 'IL-D': 1.4e6, 'IL-Z': 1.6e6 },
  },
  offices: {
    il_mk: { country: 'IL', name: 'Member of the Knesset', icon: '🏛️', level: 4, term: 4, termLimit: 0, salary: 210000, minAge: 21, residency: 0, cost: 150000, statewide: true, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    il_pm: { country: 'IL', name: 'Prime Minister of Israel', icon: '🇮🇱', level: 5, term: 4, termLimit: 0, salary: 290000, minAge: 30, residency: 0, cost: 3000000, requires: ['il_mk'], leader: true, statewide: true, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true },
  },
  communities: {
    russian: { male: ['Alexander', 'Dmitri', 'Sergei', 'Mikhail', 'Andrei', 'Ivan', 'Pavel'], female: ['Anna', 'Olga', 'Natalia', 'Irina', 'Elena', 'Svetlana', 'Yulia'], last: ['Ivanov', 'Smirnov', 'Kuznetsov', 'Popov', 'Volkov', 'Sokolov', 'Lebedev'] },
    ethiopian: { male: ['Abebe', 'Yonas', 'Dawit', 'Tesfaye', 'Getachew', 'Avi', 'Moshe'], female: ['Tigist', 'Hanna', 'Meseret', 'Almaz', 'Shira', 'Tsega', 'Rahel'], last: ['Tekle', 'Mekonen', 'Alemu', 'Worku', 'Desta', 'Getahun', 'Zewdu'] },
  },
  tables: {
    /* Law and money */
    JUSTICE: (b) => ({ ...b, trial: 'bench', sentence: 1, jurorPay: 0, jail: (c) => ({ Jerusalem: 'Russian Compound detention centre', 'Tel Aviv': 'Abu Kabir detention facility' }[town(c)] ?? 'a police detention centre'), prison: 'an Israel Prison Service prison (Ayalon)', legalAid: 'the Public Defender\'s Office', privatePrisons: 0 }),
    INSOLVENCY: { liquidation: { name: 'Insolvency proceedings (Insolvency Law 2018)', wait: 4, plan: 4 }, plan: { name: 'Payment plan (debt discharge order)', years: 4, wait: 2 }, homestead: ppp(250000), wildcard: ppp(15000), creditYears: 4 },
    INHERITANCE: { name: 'no inheritance tax', exemption: Infinity, brackets: [[Infinity, 0]] },
    UNEMPLOYMENT: { name: 'Unemployment benefit (Bituach Leumi)', rate: 0.6, cap: ppp(120000), years: 0.5 },
    SEVERANCE: { perYear: 1 / 12, base: 0 },
    DISABILITY: { name: 'General disability pension (Bituach Leumi)', rate: 0, floor: ppp(48000), cap: ppp(48000), minYears: 1, odds: 1, stages: ['Medical committee', 'Appeals committee', 'Labour Court'] },
    SELF_EMPLOYED: { name: 'Bituach Leumi (self-employed)', rate: 0.13, cap: ppp(608000) },
    CREDIT: { name: 'credit rating (Credit Data Law)' },
    SMALL_BIZ_LOAN: 'State-guaranteed small business loan',
    VETERANS: { orgs: ['IDF Disabled Veterans Organization', 'Association for the Wellbeing of Israel\'s Soldiers'], care: 'the Ministry of Defence Rehabilitation Department' },
    STOCK_INDEX: 'TA-35',
    MORTGAGES: {
      closing: 0.02, stress: 0.03,
      products: {
        mix: { name: 'Mortgage mix (prime + fixed, 25-yr)', years: 25, rateAdj: 0, minDown: 0.25, minScore: 600, maxDti: 0.4 },
        prime: { name: 'Prime-linked mortgage (25-yr)', years: 25, rateAdj: -0.003, minDown: 0.25, minScore: 600, maxDti: 0.4, arm: true, reset: 1 },
        dira: { name: 'Mehir Lamishtaken (subsidised first home)', years: 25, rateAdj: -0.005, minDown: 0.1, minScore: 580, maxDti: 0.4 },
      },
    },
    UNIONS: { police: null, fire: 'Firefighters\' Organisation (Histadrut)', ems: 'Magen David Adom workers\' committee (Histadrut)', health: 'National Association of Nurses', education: 'Israel Teachers Union', public: 'Histadrut — civil servants', prisons: null, transport: 'Histadrut — transport workers', rail: 'Israel Railways workers\' committee', aviation: 'El Al workers\' committee', pilots: 'Israeli Pilots Association', trades: 'Histadrut — construction workers', industry: 'Histadrut — metal and electrical workers', retail: 'Histadrut — commerce workers', hospitality: 'Histadrut — hotel workers', services: 'Histadrut', media: 'Journalists\' Organisation', tech: 'Koach LaOvdim', arts: 'Israeli Actors\' Guild', postal: 'Israel Post workers\' committee' },
    CADETS: { jrotc: 'Gadna (youth battalions)', seaCadets: null },
    FOREIGN_SERVICE_EXAM: 'Foreign Ministry cadet course entrance exams',
    PROSECUTORS: ['State Attorney\'s Office', 'Public Defender\'s Office', 'Adult Probation Service'],
    VOLUNTEER_SERVICES: { fire: 'Volunteer firefighters (Fire and Rescue Authority)', police: 'Civil Guard (Mishmar Ezrachi)', sar: 'Police search and rescue volunteers', ambulance: 'Magen David Adom volunteer', wildland: null, auxiliary: null, cap: null, cert: 'Home Front Command community emergency team', redcross: null, skiPatrol: null, mrc: null },
    VOLUNTEER_RANKS: {
      ambulance: ['Youth volunteer (course)', 'Volunteer first responder', 'Volunteer EMT', 'Senior volunteer EMT', 'Volunteer shift leader', 'Volunteer station coordinator', 'Regional volunteer coordinator'],
      police: ['Civil Guard trainee', 'Civil Guard volunteer', 'Senior volunteer', 'Volunteer patrol leader', 'Volunteer station coordinator', 'Civil Guard district officer', 'Civil Guard commander'],
    },
    VOLUNTEER_PARENTS: {
      ambulance: { name: 'Magen David Adom', level: 'national', funds: 1, grant: null },
      police: { name: 'the Israel Police', level: 'national', funds: 1, grant: null },
      fire: { name: 'the Israel Fire and Rescue Authority', level: 'national', funds: 1, grant: null },
      cert: { name: 'the Home Front Command', level: 'national', funds: 1, grant: null },
    },
    NATIONAL_SERVICE: { overseas: null, domestic: 'Sherut Leumi (national civilian service)' },
    ACCOUNTS: { dc: 'Pension fund', roth: { name: 'Keren hishtalmut (study fund)', limit: ppp(20000) }, traditional: { name: 'Provident fund (kupat gemel)', limit: ppp(15000), share: 0.07 } },
    REFERENDUMS: {},
    ENTRANCE_EXAMS: { name: 'Bagrut and the psychometric exam', prep: { name: 'psychometric prep course', cost: ppp(6000) }, weight: 0.85 },
    AVIATION_AUTHORITY: 'Civil Aviation Authority of Israel',
    COUNTY: 'Regional Council',
    LONG_TERM_CARE: { name: 'Long-term care benefit (Bituach Leumi)', covers: 0.5, safetyNet: 'municipal social services' },
    WORKPLACE: { equality: 'the Equal Employment Opportunities Commission', reservist: 'the Reserve Service Law (job protection)', labourBoard: 'the Labour Court' },
    EQUIPMENT: (b) => ({
      ...b,
      'Digital radio + body camera kit': 'Police radio + body camera', 'Patrol sedan': 'Patrol car (Škoda Octavia)', 'Police SUV': 'Patrol jeep (Ford Explorer)', 'Pumper engine': 'Fire engine (Volvo FL)', '100-ft aerial ladder truck': 'Aerial ladder truck',
      HMMWV: 'Hummer (Humvee)', JLTV: 'Eitan APC', 'M2 Bradley': 'Namer heavy APC', Stryker: 'Eitan APC', 'M1A2 Abrams': 'Merkava Mk 4', 'F-16': 'F-16I Sufa', 'F-35A': 'F-35I Adir', 'C-130J': 'C-130J Shimshon', 'MH-60R Seahawk': 'S-70 Yanshuf', 'F/A-18E/F Super Hornet': 'F-15I Ra\'am',
    }),
    LOCAL_ENTITIES: { sole: 'Osek patur / osek murshe (sole trader)', llc: null, ccorp: 'Private company (Ltd., Ba\'am)' },

    /* Schools and credentials */
    EDUCATION: (b) => ({
      ...b,
      tuition: { community: ppp(5000), technical: ppp(8000), online: ppp(6000), state: ppp(10500), private: ppp(30000), elite: ppp(10500) },
      freeIn: undefined, loans: undefined, loanThreshold: undefined, writeOffAge: undefined,
      schools: { community: 'Practical engineering college (handesai)', technical: 'Afeka College of Engineering', online: 'The Open University of Israel', state: 'Ben-Gurion University of the Negev', private: 'Reichman University', elite: 'The Hebrew University of Jerusalem', academy: 'Bahad 1 (IDF Officers\' School)' },
      words: { 'High School': 'High School', 'high-school diploma': 'Bagrut certificate', GED: 'external Bagrut exams' },
      licenses: {
        ...b.licenses,
        'State Bar License': 'Israel Bar Association licence', 'Medical License (MD)': 'Ministry of Health medical licence', 'Board Certification': 'Specialist certification (Scientific Council)',
        'Certified Public Accountant (CPA)': 'CPA (Israel)', 'Peace Officer (POST Basic Academy)': 'Israel Police basic training (Beit Shemesh)', 'Registered Nurse (RN)': 'Registered nurse (Ministry of Health)',
        'Commercial Driver License (Class A)': 'Heavy truck licence (C+E)', 'Commercial Driver License (Class B)': 'Truck licence (C)', 'Driver\'s License (Class D)': 'Driving licence (B)', 'Learner\'s Permit': 'New-driver period with escort',
        'Professional Engineer (PE)': 'Registered engineer', 'EMT (NREMT)': 'EMT (Magen David Adom)', 'Paramedic (NRP)': 'Paramedic (Magen David Adom)', 'Pharmacist License (NAPLEX + MPJE)': 'Pharmacist licence (Ministry of Health)',
      },
    }),
    SHORT_CYCLE: 'Practical engineer diploma',
    CREDENTIAL_LOCAL: { 'Driving licence (car)': 'Driving licence (B)', 'Heavy goods vehicle licence (articulated)': 'Heavy truck licence (C+E)', 'Heavy goods vehicle licence (rigid)': 'Truck licence (C)', 'Bus & coach licence': 'Bus licence (D)', 'Security licence': 'Security guard licence', 'Construction site safety card': 'Work-at-heights certificate', 'Learner licence': 'New-driver licence' },
    PROFESSIONAL_DEGREES: { jd: 'LL.B. + internship and bar exam', md: 'M.D. (six years)' },
    UNDERGRAD_ENTRY: { jd: 4, md: 6 },
    APPRENTICESHIP_SYSTEMS: { name: 'Ministry of Labour vocational training', years: 2, pay: ppp(60000), exam: 'government trade certificate' },

    /* Moving here */
    WORKING_HOLIDAY: { name: 'Working holiday visa', odds: 0.85, years: 1, fee: 50, once: true, partners: { AU: 30, NZ: 30, DE: 30, KR: 30, JP: 30 } },
    IMMIGRATION: (b) => ({
      ...b,
      visas: {
        work: { name: 'B/1 work visa (expert)', odds: 0.6, years: 2, degree: true, fee: 300 },
        transfer: { name: 'B/1 work visa (intra-company)', odds: 0.8, years: 2, fee: 300 },
        student: { name: 'A/2 student visa', odds: 0.85, years: 4, postStudy: 0, fee: 50 },
        family: { name: 'Graduated procedure (spouse of an Israeli)', odds: 0.75, years: 4, fee: 200 },
      },
      pr: { name: 'Permanent residency', years: 5, fee: 200 },
      nat: { years: 5, married: 4, needsPR: true, fromArrival: true, prMin: 0, fee: 200 },
      dualIn: true, dualOut: true, birthright: false, prLapse: 7, surcharge: 0,
      intlTuition: { mult: 2 },
    }),
    ASYLUM: { name: 'Refugee status determination (Population and Immigration Authority)', odds: 0.05, decision: 3, workAfter: 1, prYears: 0, support: 0 },
    LICENCE_EXCHANGE: ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'IE'],
    PEERS: [],
    OVERSTAY_BAN: 5,
    BIRTH_REGISTRATION: { name: 'Registration of a child born abroad (Population Authority)', fee: 0, deadline: false },
    PARENT_VISAS: { name: 'Elderly parent permit', needs: 'citizen', odds: 0.4, wait: 2, fee: 200 },
    DIASPORA: { share: 0.2, from: [['russian', 3], ['ethiopian', 1], ['FR', 1], ['US', 1], ['PH', 1]] },

    /* Government and politics */
    LEGISLATURES: {
      lower: { name: 'the Knesset', seats: 120, presiding: 'Speaker of the Knesset', office: 'il_mk' },
      exec: 'Prime Minister', execOffice: 'il_pm', veto: false,
    },
    PARTY_NAMES: { labor: 'The Democrats (Labor–Meretz)', business: 'Likud' },
    CORPORATE_RATE: 0.23,
    HEALTH_SYSTEMS: { wait: 6, waitName: 'specialist waiting time', private: { name: 'Supplementary insurance (shaban)', premium: ppp(1500), skipsWait: true } },
    PUBLIC_LABOUR: { noStrike: ['police', 'military', 'prisons'], association: ['police'] },
    AGENCIES: {
      fbi: { name: 'Lahav 433 (Israel Police)', employers: ['Lahav 433 — Lod', 'National Fraud Investigation Unit'], titles: { trainee: 'Investigator (trainee)', agent: 'Investigator', senior: 'Senior Investigator', bau: 'Behavioural Analyst', ssa: 'Team Leader (Pakad)', asac: 'Unit Head (Rav-Pakad)', sac_cmd1: 'Deputy Commander', sac_cmd2: 'Commander (Nitzav-Mishne)', sac_cmd3: 'Investigations Division Deputy Head', sac: 'Head of Lahav 433' } },
      usss: { name: 'Shin Bet Protection Unit', employers: ['Shin Bet — VIP Protection'] },
      borderPatrol: { name: 'Population and Immigration Authority (border control)', employers: ['Ben Gurion Airport — Border Control', 'Allenby Crossing'] },
      tsa: { name: 'Airport security (Israel Airports Authority)', employers: ['Ben Gurion Airport Security'] },
      federalPrisons: { name: 'Israel Prison Service', employers: ['Ayalon Prison', 'Nitzan Prison'] },
      postal: { name: 'Israel Post', employers: ['Israel Post — Sorting Centre'] },
      benefitsClaims: { name: 'National Insurance Institute (Bituach Leumi)', employers: ['Bituach Leumi branch office'] },
      caseOfficer: { name: 'Mossad', employers: ['Mossad — Tel Aviv'] },
      sigint: { name: 'National Cyber Directorate', employers: ['National Cyber Directorate — Tel Aviv'] },
      intelligence: { name: 'Shin Bet (Israel Security Agency)', employers: ['Shin Bet — Tel Aviv'] },
      meteorology: { name: 'Israel Meteorological Service', employers: ['IMS — Bet Dagan'] },
      regulatory: { name: 'Financial Regulation (Bank of Israel · Securities Authority · Tax Authority)', employers: ['Bank of Israel', 'Israel Securities Authority', 'Israel Tax Authority'] },
      foreignService: { name: 'Ministry of Foreign Affairs', employers: ['MFA — Jerusalem'] },
      parkService: { name: 'Israel Nature and Parks Authority', employers: ['Ein Gedi Nature Reserve', 'Masada National Park'] },
      airTrafficControl: { name: 'Israel Airports Authority ATC', employers: ['Ben Gurion Area Control Centre'] },
      nationalLab: { name: 'National research institutes', employers: ['Weizmann Institute of Science', 'Soreq Nuclear Research Center'] },
      oig: { name: 'State Comptroller and Ombudsman', employers: ['State Comptroller — Jerusalem'] },
    },
    LOCAL_AGENCIES: (b) => ({
      ...b,
      education: { name: 'State schools', employer: (c) => `Ministry of Education school — ${town(c)}`, titles: { sub: 'Substitute Teacher', teacher: 'Teacher', senior: 'Senior Teacher', coach: 'Pedagogical Coordinator', specialist: 'Subject Coordinator', chair: 'Grade Coordinator', ap: 'Deputy Principal', principal: 'Principal', director: 'Supervisor (Mefakeah)', assistantSuper: 'District Director', ...cmd('superintendent', ['Deputy Director-General', 'Senior Deputy Director-General'], 'Director-General, Ministry of Education') } },
      municipalAdmin: { name: 'Municipality', employer: (c) => `${town(c)} Municipality`, titles: { clerk: 'Clerk', deputyClerk: 'Department Coordinator', cityClerk: 'Council Secretary', analyst: 'Budget Analyst', seniorAnalyst: 'Senior Economist', financeDirector: 'City Treasurer', manager: 'Department Director', acm: 'Deputy Director-General', ...cmd('cityManager', ['Senior Deputy Director-General', 'Chief Operating Officer'], 'Municipal Director-General') } },
      probation: { name: 'Adult Probation Service', employer: (c) => `Adult Probation Service — ${town(c)}`, titles: { trainee: 'Probation Officer (trainee)', officer: 'Probation Officer', senior: 'Senior Probation Officer', specialized: 'Probation Officer (domestic violence)', supervisor: 'District Probation Officer', chief: 'National Chief Probation Officer' } },
      police: null, transitPolice: null,
      statePolice: {
        name: 'Israel Police', employer: (c) => `Israel Police — ${town(c)} station`,
        titles: { cadet: 'Police trainee (Beit Shemesh)', trooper: 'Shoter (Constable)', senior: 'Rav-Shoter (Senior Constable)', investigator: 'Investigator (Bilush)', majorCrimes: 'Investigator (Central Unit)', detSergeant: 'Rav-Samal (Investigations)', detLieutenant: 'Mefakeah (Investigations Officer)', detCaptain: 'Rav-Pakad (Head of Investigations)', sergeant: 'Samal (Sergeant)', lieutenant: 'Mefakeah (Inspector)', captain: 'Pakad (Chief Inspector)', major: 'Rav-Pakad (Superintendent)', ...cmd('superintendent', ['Sgan-Nitzav (Chief Superintendent)', 'Nitzav-Mishne (Commander)', 'Tat-Nitzav (District Commander)', 'Tat-Nitzav (Deputy Commissioner)'], 'Rav-Nitzav (Commissioner of Police)') },
      },
      corrections: { name: 'Israel Prison Service', employer: () => 'Israel Prison Service' },
      fire: {
        name: 'Israel Fire and Rescue Authority', employer: (c) => `Fire and Rescue — ${town(c)} station`,
        titles: { recruit: 'Firefighter (trainee)', firefighter: 'Firefighter', engineer: 'Senior Firefighter (driver)', inspector: 'Fire Safety Inspector', investigator: 'Fire Investigator', lieutenant: 'Shift Commander', captain: 'Station Commander', battalion: 'Deputy District Commander', deputyChief: 'District Commander', ...cmd('chief', ['Deputy Commissioner'], 'Fire and Rescue Commissioner') },
      },
      ems: {
        name: 'Magen David Adom', employer: (c) => `Magen David Adom — ${town(c)} station`,
        titles: { emt: 'EMT (Magen David Adom)', paramedic: 'Paramedic', criticalCare: 'Senior Paramedic (MICU)', flight: 'Paramedic (air ambulance)', fto: 'MDA instructor', supervisor: 'Shift Manager', captain: 'Station Manager', deputy: 'Regional Director', ...cmd('chief', ['Deputy Director-General'], 'Director-General, Magen David Adom') },
      },
      dispatch: { name: 'MDA 101 dispatch', employer: (c) => `MDA 101 regional dispatch — ${town(c)}`, titles: { trainee: 'Dispatcher (trainee)', telecommunicator: '101 Dispatcher', senior: 'Senior Dispatcher', training: 'Dispatch Instructor', supervisor: 'Shift Supervisor', ...cmd('director', ['Dispatch Centre Manager', 'Head of Dispatch'], 'Director of Operations') } },
      prosecution: { name: 'State Attorney\'s Office', employer: (c) => `State Attorney's Office — ${town(c)} District`, titles: { clerk: 'Legal Intern', ada: 'Prosecutor', senior: 'Senior Prosecutor', trial: 'Senior Deputy District Attorney', chiefDeputy: 'District Attorney', ...cmd('first', ['Deputy State Attorney', 'Senior Deputy State Attorney'], 'State Attorney') } },
    }),
    NATIONAL_SERVICES: ['fire', 'ems'],
    POLICE_UNITS: { k9: 'Oketz-trained police dog unit', swat: 'Yamam (counter-terror unit)', traffic: 'National Traffic Police', narcotics: 'Drugs unit (Lahav 433)', gang: 'Central Unit (organised crime)', negotiator: 'Police negotiation team', sro: 'Community policing (City Without Violence)', instructor: 'National Police Academy', ia: 'Police Internal Investigations Department (Ministry of Justice)', protection: 'Dignitary protection' },
    POLICE_BUREAUS: { homicide: 'Central Unit (major crimes)', svu: 'Family and sexual violence unit', property: 'Property crimes unit', robbery: 'Central Unit (robbery)', cyber: 'Cyber unit (Lahav 433)' },
    VOLUNTEER_MEDAL: 'President\'s Volunteer Award',

    /* The Israel Defense Forces */
    FORCES: {
      pay: 0.75, exposure: 1.1,
      conscription: { kind: 'universal', age: 18, months: { male: 32, female: 24 }, genders: ['male', 'female'], branches: ['army', 'navy', 'airforce'], defer: true, deferUntil: 23, name: 'IDF service (Security Service Law)', text: 'Military service is compulsory at 18: 32 months for men, 24 for women, then reserve duty for years after. Students can join the Atuda academic reserve and serve after their degree.', alternative: { label: 'Sherut Leumi (national civilian service)', months: 24, desc: 'Two years in hospitals, schools or welfare (for those exempted from the army)' } },
      branches: {
        army: { name: 'IDF Ground Forces', icon: '🇮🇱', motto: 'Tzahal', basic: 'basic training (tironut) at a brigade training base', officerSchool: 'Bahad 1 (Officers\' School), Mitzpe Ramon', enlisted: ENLISTED, officer: OFFICERS },
        navy: { name: 'Israeli Navy', icon: '⚓', motto: 'Heil HaYam', basic: 'basic training at the Haifa naval training base', officerSchool: 'the Naval Officers\' School, Haifa', enlisted: ENLISTED, officer: OFFICERS },
        airforce: { name: 'Israeli Air Force', icon: '✈️', motto: 'Heil HaAvir', basic: 'basic training at Bahad 4', officerSchool: 'the IAF Flight Academy, Hatzerim', enlisted: ENLISTED, officer: OFFICERS },
        guard: { name: 'IDF Reserves (Miluim)', icon: '🛡️', motto: 'Tzahal', basic: 'reserve refresher training', officerSchool: 'the reserve officers\' course', enlisted: ENLISTED, officer: OFFICERS },
      },
      bases: {
        army: [['telaviv', 'HaKirya (General Staff)'], ['jerusalem', 'Central Command (Camp Rehavam)'], ['haifa', 'Northern Command (Camp Dado)'], ['beersheba', 'Southern Command'], ['nazareth', 'Northern Command (Galilee division)']],
        navy: [['haifa', 'Haifa naval base']],
        airforce: [['beersheba', 'Nevatim Airbase'], ['rishonlezion', 'Palmachim Airbase'], ['haifa', 'Ramat David Airbase']],
      },
      overseas: {
        army: [['Cyprus', 'Joint training exercise', 1, false]],
        navy: [['Red Sea', 'Red Sea patrol (Eilat)', 1, false]],
        airforce: [['United States', 'F-35I training detachment', 3, true]],
      },
    },
    MIL_SPECIAL: (b) => ({
      ...b,
      drill: { names: 'Basic training commander (mefakedet tironut)', places: 'a brigade training base' },
      recruiter: { names: 'Induction centre (Bakum) officer' },
      honorGuard: { names: 'IDF Ceremonial Unit', desc: 'State ceremonies on Mount Herzl and visits of heads of state.' },
      rotc: { names: 'Instructor, Atuda academic reserve' },
      joint: { names: 'General Staff officer (HaKirya)' },
      fellow: { names: 'Fellow, Institute for National Security Studies' },
      commissioning: 'Bahad 1 officers\' course from the ranks',
      chiefs: { army: 'Commander of the Ground Forces', navy: 'Commander of the Navy', airforce: 'Commander of the Air Force' },
      chairman: 'Chief of the General Staff (Ramatkal)',
    }),
    PME: { enlisted: ['Squad commanders\' course', 'Platoon sergeants\' course', 'Senior NCO course', 'Sergeant major course', 'Command sergeant major course'], officer: ['Bahad 1 officers\' course', 'Company commanders\' course', 'IDF Command and Staff College (Pum)', 'National Defense College'] },
    QUALS: { airborne: 'Paratroopers\' jump course', rangerSchool: 'Counter-terrorism school (LOTAR)', jumpmaster: 'Jumpmaster course', pathfinder: 'Reconnaissance course', combatDiver: 'Combat diving course', dli: 'IDF Arabic course', instructor: 'Instructors\' course', sere: 'Captivity resistance course', expertBadge: 'Combat fitness instructor course' },
    SOF: {
      ranger: sf('Sayeret Matkal', 'gibbush (selection) for Sayeret Matkal', 'Sayeret Matkal (General Staff Reconnaissance Unit)', 'unit pin', 'The IDF\'s elite special reconnaissance and hostage-rescue unit.', ['a deep reconnaissance raid', 'a hostage-rescue operation']),
      seal: sf('Shayetet 13', 'the Shayetet 13 selection and 20-month training', 'Shayetet 13, Atlit', 'bat-wings pin', 'Naval commandos: maritime raids and interdiction.', ['a maritime interdiction operation', 'a seaborne raid']),
      pararescue: sf('Unit 669', 'Unit 669 selection', 'Unit 669 (Airborne Rescue and Evacuation)', 'Unit 669 pin', 'The Air Force\'s combat search and rescue unit.', ['a combat evacuation under fire']),
    },
    MIL_UNITS: { ground: ['Golani Brigade', 'Givati Brigade', 'Paratroopers Brigade', '7th Armored Brigade', 'Nahal Brigade'], naval: ['INS Magen (Sa\'ar 6)', 'INS Atzmaut (Sa\'ar 5)', 'INS Drakon (submarine)'], air: ['140 Squadron (F-35I)', '69 Squadron (F-15I)', '115 Squadron (Flying Dragons)'] },
    MIL_SUMMARY: 'a disciplinary trial (shipuṭ) before your commanding officer',
    SERVICE_TERMS: { maxYears: { enlisted: 30, officer: 30 }, ages: { enlisted: 50, officer: 48, flag: 55 }, join: { enlisted: [18, 30], officer: [18, 30] }, name: 'career service' },
    MILITARY_JUSTICE: { code: 'the Military Justice Law', court: 'a military court', prison: 'Military Prison 6 (Atlit)', counsel: 'Military Defender\'s Office' },
    VETTING: { form: 'security clearance (Malmab)', publicTrust: 'Basic clearance', secret: 'Secret', topSecret: 'Top Secret' },
    CAMPUS: { army: 'Atuda (academic reserve)', navy: null, airforce: null, obligation: true },
    ACADEMY_NAMES: { army: 'Bahad 1 (IDF Officers\' School)', navy: 'the Naval Officers\' School', airforce: 'the IAF Flight Academy' },
    THEATERS: [
      { id: 'gaza', name: 'a ground operation in Gaza', adversary: 'Hamas', intensity: 2, home: 0.5, weight: 40 },
      { id: 'lebanon', name: 'a war on the Lebanese border', adversary: 'Hezbollah', intensity: 2, home: 0.5, weight: 30 },
      { id: 'westBank', name: 'counter-terror operations in the West Bank', adversary: 'armed militants', intensity: 1, home: 0.3, weight: 20, internal: true },
    ],
    WAR_START_CHANCE: 0.06,
    MEDALS: {
      moh: { name: 'Medal of Valor (Itur HaGvura)', ribbon: R('#ffd700', '#ffffff', '#ffd700') }, serviceCross: { name: 'Medal of Courage (Itur HaOz)' }, silverStar: { name: 'Medal of Distinguished Service (Itur HaMofet)' },
      dsm: { name: 'Chief of Staff\'s Citation' }, legionOfMerit: { name: 'Major General\'s Citation' }, bronzeStar: { name: 'Commander\'s Citation (Tzalash)' },
      purpleHeart: null, msm: { name: 'Major General\'s Commendation' }, commendation: { name: 'Commander\'s Commendation' }, achievement: { name: 'Unit Commendation' },
      combatAction: { name: 'Campaign ribbon' }, goodConduct: null, humanitarian: { name: 'Humanitarian mission ribbon' }, expeditionary: { name: 'Operation ribbon' }, ndsm: null,
    },
    // No orders of chivalry: the Israel Prize and the Presidential Medal of Honour.
    ORDERS: {
      minAge: 40,
      tiers: [
        { id: 'ilPrize', name: 'Israel Prize', min: 160, ribbon: R('#0038b8', '#ffffff', '#0038b8') },
        { id: 'presMedal', name: 'Presidential Medal of Honour', min: 240, ribbon: R('#0038b8', '#ffd700', '#0038b8') },
      ],
    },
    PARDON: 'the President',
    COMBAT_TEMPO: 1.3,
    MIL_PENSIONS: { name: 'IDF career service pension', rate: 0.02, cap: 0.7, vest: 10, immediate: { enlisted: 20, officer: 20 }, minAge: 42, deferredAge: 67 },
    DIRECT_ENTRY: {
      statePolice: [{ id: 'ilOfficer', name: 'Israel Police officers\' course (academic entry)', levelId: 'lieutenant', education: 'bachelor', maxAge: 35, odds: 0.2, school: 'the National Police Academy, Beit Shemesh' }],
    },
    BENCHES: {
      route: 'appointed', appointedBy: 'the Judicial Selection Committee', retire: 70,
      ladder: [
        { id: 'magistrate', name: 'Judge of the Magistrates\' Court', icon: '🔨', salary: 180000, minYears: 5, entry: true },
        { id: 'district', name: 'Judge of the District Court', icon: '⚖️', salary: 220000, minYears: 6, entry: true },
        { id: 'supreme', name: 'Justice of the Supreme Court', icon: '🏛️', salary: 260000, minYears: 10 },
      ],
    },
  },
};
