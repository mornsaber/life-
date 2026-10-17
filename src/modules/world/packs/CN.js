/**
 * China, built on South Korea: a unitary one-party state. Police are each
 * city's Public Security Bureau under the Ministry of Public Security; China
 * Fire and Rescue has been one national service since 2018; cities run the
 * 120 emergency centres. The PLA has a draft registration but fills its ranks
 * mostly with volunteers. Social insurance and the housing provident fund come
 * out of every payslip; the gaokao decides university.
 *
 * Amounts are yuan converted at 2023 PPP (¥3.6 per US$), 2025 rates.
 * See docs/ADDING-A-COUNTRY.md for the shape of a pack.
 */

const CNY = 3.6;
const ppp = (local) => Math.round(local / CNY);
const cmd = (top, steps, head) => ({ ...Object.fromEntries(steps.map((t, i) => [`${top}_cmd${i + 1}`, t])), [top]: head });
const sf = (name, course, unitName, badge, desc, deployments) => ({ name, course, unitName, badge, desc, deployments });
const R = (...colors) => colors.map((c) => [c, 1]);
const prov = (name, extra = {}) => ({ name, incomeTax: [], propertyTax: 0, salesTax: 0.13, rightToWork: false, cannabis: false, dui: { fineMult: 2, suspendYears: 5 }, minWage: ppp(22), population: 'enterprise', disasters: { flood: 0.05 }, ...extra });
const ENLISTED = ['Private (Liebing)', 'Private First Class (Shangdengbing)', 'Corporal (Xiashi)', 'Sergeant (Zhongshi)', 'Sergeant First Class (Shangshi)', 'Master Sergeant Class 4', 'Master Sergeant Class 3', 'Master Sergeant Class 2', 'Master Sergeant Class 1'];
const OFFICERS = ['Second Lieutenant (Shaowei)', 'First Lieutenant (Zhongwei)', 'Captain (Shangwei)', 'Major (Shaoxiao)', 'Lieutenant Colonel (Zhongxiao)', 'Colonel (Shangxiao)', 'Senior Colonel (Daxiao)', 'Major General (Shaojiang)', 'Lieutenant General (Zhongjiang)', 'General (Shangjiang)'];
const town = (c) => c.split(',')[0];
const only = (mine) => (b) => ({ ...Object.fromEntries(Object.keys(b ?? {}).map((k) => [k, null])), ...mine });

export const CN = {
  id: 'CN',
  basedOn: 'KR',
  groups: [],
  agreements: ['KR', 'JP', 'DE', 'FR', 'NL', 'ES', 'CA'],
  licenceExchange: [],
  peers: [],
  country: {
    name: 'China',
    flag: '🇨🇳',
    demonym: 'Chinese',
    capital: 'Beijing',
    currency: { code: 'CNY', symbol: '¥', perUsd: CNY },
    languages: ['Mandarin'],
    emergency: '110 / 119 / 120',
    retirementAge: 63,
    informality: 0.25,
    tax: {
      // Individual Income Tax (comprehensive income): ¥60,000 deduction, then 3% to 45%.
      allowance: ppp(60000),
      brackets: [[ppp(36000), 0.03], [ppp(108000), 0.1], [ppp(156000), 0.2], [ppp(120000), 0.25], [ppp(240000), 0.3], [ppp(300000), 0.35], [Infinity, 0.45]],
      // Pension 8%, medical 2%, unemployment 0.5%, and the housing provident fund (about 7%), up to three times the average wage.
      contributions: [{ name: 'Social insurance', rate: 0.105, from: 0, to: ppp(420000) }, { name: 'Housing Provident Fund', rate: 0.07, from: 0, to: ppp(420000) }],
      label: 'State Taxation Administration',
    },
    // Basic pension (about 1% of the local average wage per year) plus the individual account; retirement ages rising to 63 (men) and 58 (women).
    pension: { kind: 'tiered', name: 'Basic old-age insurance pension', basic: ppp(36000), years: 35, cap: ppp(420000), accrual: 0.006, ages: [58, 63] },
    employerSuper: 0.16,
    health: { name: 'Basic Medical Insurance (urban employees)', short: 'medical insurance', deductible: ppp(1800), coinsurance: 0.25, oopMax: ppp(20000) },
    childBenefit: { amount: ppp(3600), phaseOutFrom: Infinity, name: 'Childcare subsidy (under 3)' },
    terms: {
      'Federal government': 'Central government', 'State government': 'Provincial government', 'Federal income tax': 'Individual income tax', 'State income tax': 'Individual income tax',
      'Social Security': 'social insurance', '401(k)': 'enterprise annuity', IRA: 'private pension account', IRS: 'State Taxation Administration', Medicaid: 'medical assistance', Medicare: 'Basic Medical Insurance', 'GI Bill': 'veterans\' education support',
      'National Pension': 'basic pension', 'National Health Insurance': 'Basic Medical Insurance', 'National Assembly': 'National People\'s Congress',
    },
    names: {
      male: ['Wei', 'Hao', 'Jun', 'Yi', 'Hao Yu', 'Zi Xuan', 'Yu Hang', 'Ming', 'Jian', 'Lei', 'Bo', 'Tao', 'Chen', 'Yang', 'Rui', 'Kai'],
      female: ['Xin Yi', 'Yu Tong', 'Zi Han', 'Mei', 'Li', 'Jing', 'Yan', 'Hui', 'Lin', 'Xiao', 'Ying', 'Fang', 'Na', 'Xue', 'Qian', 'Ting'],
      last: ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou', 'Xu', 'Sun', 'Ma', 'Zhu', 'Hu', 'Guo'],
    },
    provinces: {
      'CN-BJ': prov('Beijing', { disasters: { flood: 0.02, blizzard: 0.02 } }),
      'CN-SH': prov('Shanghai', { disasters: { flood: 0.03, hurricane: 0.03 } }),
      'CN-GD': prov('Guangdong', { population: 'mega', disasters: { hurricane: 0.08, flood: 0.06 } }),
      'CN-SC': prov('Sichuan', { population: 'mega', disasters: { earthquake: 0.03, flood: 0.04 } }),
      'CN-HB': prov('Hubei', { disasters: { flood: 0.07 } }),
      'CN-ZJ': prov('Zhejiang', { disasters: { hurricane: 0.06, flood: 0.04 } }),
    },
    cities: {
      beijing: { name: 'Beijing', icon: '🏯', type: 'Capital region', state: 'CN-BJ', col: 1.2, market: 1.1, locality: 0.25, transit: 85, fare: ppp(1500), walkable: true, size: 'mega', population: [21800000, 21800000] },
      shanghai: { name: 'Shanghai', icon: '🌆', type: 'High-cost metro', state: 'CN-SH', col: 1.25, market: 1.15, locality: 0.26, transit: 90, fare: ppp(1500), walkable: true, size: 'mega', population: [24800000, 24800000] },
      guangzhou: { name: 'Guangzhou', icon: '🏙️', type: 'Major metro', state: 'CN-GD', col: 1.0, market: 0.95, locality: 0.22, transit: 80, fare: ppp(1300), walkable: true, size: 'mega', population: [18800000, 18800000] },
      shenzhen: { name: 'Shenzhen', icon: '💻', type: 'High-cost metro', state: 'CN-GD', col: 1.15, market: 1.15, locality: 0.25, transit: 80, fare: ppp(1300), walkable: true, size: 'mega', population: [17800000, 17800000] },
      chengdu: { name: 'Chengdu', icon: '🐼', type: 'Major metro', state: 'CN-SC', col: 0.85, market: 0.8, locality: 0.18, transit: 70, fare: ppp(1100), walkable: true, size: 'mega', population: [21400000, 21400000] },
      wuhan: { name: 'Wuhan', icon: '🌉', type: 'Major metro', state: 'CN-HB', col: 0.85, market: 0.8, locality: 0.18, transit: 70, fare: ppp(1100), walkable: true, size: 'enterprise', population: [13700000, 13700000] },
      hangzhou: { name: 'Hangzhou', icon: '🍵', type: 'Major metro', state: 'CN-ZJ', col: 1.0, market: 1.0, locality: 0.22, transit: 70, fare: ppp(1200), walkable: true, size: 'enterprise', population: [12500000, 12500000] },
    },
    hometowns: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chengdu', 'wuhan', 'hangzhou'],
    population: { 'CN-BJ': 21.8e6, 'CN-SH': 24.8e6, 'CN-GD': 127e6, 'CN-SC': 83.7e6, 'CN-HB': 58.3e6, 'CN-ZJ': 66.3e6 },
  },
  offices: {
    cn_deputy: { country: 'CN', name: 'Deputy to the National People\'s Congress', icon: '🏛️', level: 4, term: 5, termLimit: 0, salary: 0, minAge: 18, residency: 0, cost: 20000, requires: ['cityCouncil', 'mayor'], fullTime: false, pension: 'electedOfficials', kind: 'legislative' },
    cn_premier: { country: 'CN', name: 'Premier of the State Council', icon: '🇨🇳', level: 5, term: 5, termLimit: 2, salary: 30000, minAge: 45, residency: 0, cost: 500000, requires: ['cn_deputy'], leader: true, statewide: true, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true },
  },
  tables: {
    /* Law and money */
    JUSTICE: { trial: 'bench', sentence: 1.4, jail: (c) => `${town(c)} Municipal Detention Centre`, prison: 'a provincial prison', legalAid: 'a legal aid lawyer (Legal Aid Centre)', privatePrisons: 0 },
    INSOLVENCY: { liquidation: { name: 'Enterprise bankruptcy (no personal bankruptcy outside Shenzhen)', wait: 10 }, plan: { name: 'Personal bankruptcy (Shenzhen pilot)', years: 3, wait: 2 }, homestead: 0, wildcard: ppp(10000), creditYears: 5 },
    INHERITANCE: { name: 'no inheritance tax', exemption: Infinity, brackets: [[Infinity, 0]] },
    UNEMPLOYMENT: { name: 'Unemployment insurance benefit', flat: ppp(24000), years: 1 },
    SEVERANCE: { perYear: 1 / 12, base: 0 },
    DISABILITY: { name: 'Disability pension (basic old-age insurance)', rate: 0.4, floor: ppp(18000), cap: ppp(120000), minYears: 15, odds: 0.9, stages: ['Labour capacity appraisal', 'Re-appraisal', 'Administrative review'] },
    SELF_EMPLOYED: { name: 'Flexible-employment social insurance', rate: 0.2, cap: ppp(420000) },
    CREDIT: { name: 'credit report (PBOC Credit Reference Center)' },
    SMALL_BIZ_LOAN: 'Inclusive-finance small business loan',
    VETERANS: { orgs: ['Ministry of Veterans Affairs service stations'], care: 'the Ministry of Veterans Affairs' },
    STOCK_INDEX: 'CSI 300',
    MORTGAGES: {
      closing: 0.03, stress: 0.02,
      products: {
        commercial: { name: 'Commercial mortgage (30-yr, LPR-linked)', years: 30, rateAdj: -0.003, minDown: 0.15, minScore: 600, maxDti: 0.5, arm: true, reset: 1 },
        hpf: { name: 'Housing Provident Fund loan', years: 30, rateAdj: -0.012, minDown: 0.15, minScore: 600, maxDti: 0.5 },
      },
    },
    UNIONS: { police: null, fire: null, ems: 'All-China Federation of Trade Unions (health)', health: 'All-China Federation of Trade Unions (health)', education: 'China Education Trade Union', public: 'All-China Federation of Trade Unions', prisons: null, transport: 'ACFTU (transport)', rail: 'China Railway Trade Union', aviation: 'ACFTU (civil aviation)', pilots: 'ACFTU (civil aviation)', trades: 'ACFTU (construction)', industry: 'ACFTU (machinery and metallurgy)', retail: 'ACFTU (commerce)', hospitality: 'ACFTU (commerce)', services: 'ACFTU', media: 'All-China Journalists Association', tech: 'ACFTU', arts: 'China Federation of Literary and Art Circles', postal: 'ACFTU (postal)' },
    CADETS: { jrotc: 'Young Pioneers / school military training', seaCadets: null },
    FOREIGN_SERVICE_EXAM: 'National civil service exam (Ministry of Foreign Affairs posts)',
    PROSECUTORS: ['People\'s Procuratorate', 'Legal Aid Centre', 'Community Corrections Office'],
    VOLUNTEER_SERVICES: { fire: 'Community micro fire station volunteer', police: 'Public security volunteer (Chaoyang masses)', sar: 'Blue Sky Rescue', ambulance: null, wildland: 'Forest firefighting volunteer', auxiliary: null, cap: null, cert: 'Community emergency volunteer', redcross: 'Red Cross Society of China', skiPatrol: null, mrc: null },
    VOLUNTEER_PARENTS: {
      fire: { name: 'China Fire and Rescue', level: 'national', funds: 0.6, grant: null },
      police: { name: 'the local Public Security Bureau', level: 'municipal', funds: 0.5, grant: null },
    },
    NATIONAL_SERVICE: { overseas: null, domestic: 'Western China volunteer programme' },
    ACCOUNTS: { dc: 'Enterprise annuity', roth: { name: 'Brokerage account', limit: ppp(500000) }, traditional: { name: 'Private pension account', limit: ppp(12000), share: 1 } },
    REFERENDUMS: {},
    ENTRANCE_EXAMS: { name: 'gaokao', prep: { name: 'gaokao cram school', cost: ppp(20000) }, weight: 0.95 },
    AVIATION_AUTHORITY: 'Civil Aviation Administration of China',
    COUNTY: 'District',
    LONG_TERM_CARE: { name: 'Long-term care insurance (pilot cities)', covers: 0.3, safetyNet: 'the Civil Affairs Bureau' },
    WORKPLACE: { equality: 'the labour dispute arbitration committee', reservist: 'Military Service Law job protection', labourBoard: 'the labour dispute arbitration committee' },
    EQUIPMENT: {
      'Digital radio + body camera kit': 'Police radio + body camera', 'Patrol sedan': 'Patrol car (BYD)', 'Police SUV': 'Police SUV (Toyota / Haval)', 'Pumper engine': 'Water tender fire engine', '100-ft aerial ladder truck': 'Aerial ladder truck (XCMG)',
      HMMWV: 'Dongfeng Mengshi', JLTV: 'Dongfeng Mengshi (armoured)', 'M2 Bradley': 'ZBD-04A', Stryker: 'ZBL-08', 'M1A2 Abrams': 'Type 99A', 'F-16': 'J-10C', 'F-35A': 'J-20', 'C-130J': 'Y-20', 'MH-60R Seahawk': 'Z-20', 'F/A-18E/F Super Hornet': 'J-15', 'AAV-7 amphibious assault vehicle': 'ZBD-05', 'MV-22 Osprey': 'Z-8',
    },
    LOCAL_ENTITIES: { sole: 'Individual business (getihu)', llc: 'Limited liability company (youxian gongsi)', ccorp: 'Joint-stock company (gufen gongsi)' },
    PRIVATE_TITLES: { 'Chief Executive Officer': 'General Manager' },

    /* Schools and credentials */
    EDUCATION: {
      tuition: { community: ppp(5000), technical: ppp(6000), online: ppp(4000), state: ppp(5500), private: ppp(30000), elite: ppp(6000) },
      schools: { community: 'Vocational college (zhiye xueyuan)', technical: 'Shenzhen Polytechnic University', online: 'Open University of China', state: 'Wuhan University', private: 'Xi\'an Jiaotong-Liverpool University', elite: 'Tsinghua University', academy: 'the PLA National Defence University' },
      words: { 'High School': 'Senior Middle School', 'high-school diploma': 'senior middle school diploma', 'high school': 'senior middle school', GED: 'adult higher-education entrance exam' },
      licenses: {
        'State Bar License': 'Legal Professional Qualification (national judicial exam)', 'Medical License (MD)': 'Licensed physician (national medical exam)', 'Board Certification': 'Standardised residency certificate', 'Certified Public Accountant (CPA)': 'CICPA certified public accountant',
        'Peace Officer (POST Basic Academy)': 'People\'s police academy training', 'Registered Nurse (RN)': 'Registered nurse (national nursing exam)', 'Commercial Driver License (Class A)': 'A2 driving licence (tractor-trailer)', 'Commercial Driver License (Class B)': 'B2 driving licence (heavy truck)', 'Driver\'s License (Class D)': 'C1 driving licence', 'Learner\'s Permit': 'Learner driving permit',
        'Professional Engineer (PE)': 'Registered engineer', 'EMT (NREMT)': 'Pre-hospital emergency technician', 'Paramedic (NRP)': 'Emergency physician (120 centre)', 'Pharmacist License (NAPLEX + MPJE)': 'Licensed pharmacist',
      },
    },
    SHORT_CYCLE: 'Higher vocational diploma (dazhuan)',
    CREDENTIAL_LOCAL: { 'Driving licence (car)': 'C1 driving licence', 'Heavy goods vehicle licence (articulated)': 'A2 driving licence', 'Heavy goods vehicle licence (rigid)': 'B2 driving licence', 'Bus & coach licence': 'A1 driving licence', 'Security licence': 'Security guard certificate', 'Construction site safety card': 'Construction safety certificate' },
    PROFESSIONAL_DEGREES: { jd: 'LL.B. + Legal Professional Qualification', md: 'Clinical medicine (five-year bachelor\'s)' },
    UNDERGRAD_ENTRY: { jd: 4, md: 5 },
    APPRENTICESHIP_SYSTEMS: { name: 'Modern apprenticeship (vocational school)', years: 3, pay: ppp(40000), exam: 'vocational skills certificate' },

    /* Moving here */
    WORKING_HOLIDAY: null,
    IMMIGRATION: {
      visas: {
        work: { name: 'Z visa and Foreigner\'s Work Permit', odds: 0.6, years: 2, degree: true, fee: 150 },
        transfer: { name: 'Z visa (intra-company)', odds: 0.8, years: 2, fee: 150 },
        student: { name: 'X1 student visa', odds: 0.85, years: 4, postStudy: 0, fee: 150 },
        family: { name: 'Q1 family reunion visa', odds: 0.7, years: 3, fee: 150 },
      },
      pr: { name: 'Foreigner\'s Permanent Residence (five-star card)', years: 5, fee: 200, odds: 0.05 },
      nat: { years: 10, married: 5, needsPR: true, fromArrival: false, prMin: 5, fee: 200, odds: 0.05 },
      dualIn: false, dualOut: false, birthright: false, prLapse: 2,
      intlTuition: { mult: 3 },
    },
    ASYLUM: { name: 'Refugee status (UNHCR mandate)', odds: 0.05, decision: 3, workAfter: 99, prYears: 0, support: 0 },
    LICENCE_EXCHANGE: [],
    PEERS: [],
    OVERSTAY_BAN: 10,
    BIRTH_REGISTRATION: { name: 'Travel document for a child born abroad (embassy)', fee: 30, deadline: true },
    PARENT_VISAS: { name: 'Q1 visa (parent)', needs: 'resident', odds: 0.5, wait: 1, fee: 150 },
    DIASPORA: { share: 0.005, from: [['KR', 1], ['vietnamese', 1]] },

    /* Government and politics */
    LEGISLATURES: {
      lower: { name: 'National People\'s Congress', seats: 2977, presiding: 'Chairman of the NPC Standing Committee', office: 'cn_deputy' },
      exec: 'Premier', execOffice: 'cn_premier', veto: false,
    },
    // A one-party state: the Communist Party holds about 70% of NPC seats; eight allied minor parties and independents the rest.
    PARTY_NAMES: { labor: 'Communist Party of China', business: 'the allied minor parties', dominant: { bloc: 'labor', share: 0.7 } },
    CORPORATE_RATE: 0.25,
    HEALTH_SYSTEMS: { wait: 2, waitName: 'hospital queue (guahao)', private: { name: 'Commercial health insurance (international wing)', premium: ppp(8000), skipsWait: true } },
    PUBLIC_LABOUR: { noStrike: ['police', 'military', 'fire', 'prisons', 'public'], association: [] },
    AGENCIES: only({
      fbi: { name: 'Criminal Investigation Bureau (Ministry of Public Security)', employers: ['MPS Criminal Investigation Bureau — Beijing', 'Economic Crime Investigation Bureau'], titles: { trainee: 'Police Officer (probation)', agent: 'Criminal Investigator', senior: 'Senior Criminal Investigator', bau: 'Criminal psychologist', ssa: 'Section Chief', asac: 'Deputy Division Director', sac_cmd1: 'Division Director', sac_cmd2: 'Deputy Director-General', sac_cmd3: 'Director-General (Bureau)', sac: 'Vice Minister of Public Security' } },
      usss: { name: 'Central Security Bureau', employers: ['Central Security Bureau — Beijing'] },
      borderPatrol: { name: 'National Immigration Administration (border inspection)', employers: ['Beijing Capital Airport Border Inspection', 'Luohu Port Border Inspection, Shenzhen'] },
      postal: { name: 'China Post', employers: ['China Post — city branch'] },
      benefitsClaims: { name: 'Social Insurance Administration', employers: ['City social insurance bureau'] },
      caseOfficer: { name: 'Ministry of State Security', employers: ['MSS — Beijing'] },
      intelligence: { name: 'Ministry of State Security', employers: ['MSS — Beijing'] },
      meteorology: { name: 'China Meteorological Administration', employers: ['CMA — Beijing'] },
      regulatory: { name: 'Financial Regulation (PBOC · CSRC · NFRA)', employers: ['People\'s Bank of China', 'China Securities Regulatory Commission'] },
      foreignService: { name: 'Ministry of Foreign Affairs', employers: ['MFA — Beijing'] },
      parkService: { name: 'National Forestry and Grassland Administration (national parks)', employers: ['Giant Panda National Park', 'Sanjiangyuan National Park'] },
      airTrafficControl: { name: 'CAAC Air Traffic Management Bureau', employers: ['North China ATMB — Beijing', 'East China ATMB — Shanghai'] },
      nationalLab: { name: 'Chinese Academy of Sciences', employers: ['CAS — Beijing', 'CAS — Shanghai'] },
      oig: { name: 'National Audit Office', employers: ['National Audit Office — Beijing'] },
    }),
    LOCAL_AGENCIES: (b) => ({
      ...b,
      revenue: null, jail: null, corrections: { name: 'Provincial Prison Administration Bureau', employer: (c, s, sn) => `${sn} Prison Administration Bureau` },
      education: { name: 'Public schools', employer: (c) => `${town(c)} Education Bureau — public school`, titles: { sub: 'Substitute Teacher', teacher: 'Teacher (Level 2)', senior: 'Teacher (Level 1)', coach: 'Senior Teacher', specialist: 'Teaching and Research Group Leader', chair: 'Grade Director', ap: 'Vice Principal', principal: 'Principal', director: 'Section Chief, Education Bureau', assistantSuper: 'Deputy Director, Education Bureau', ...cmd('superintendent', ['Director, Education Bureau'], 'Director, Provincial Department of Education') } },
      municipalAdmin: { name: 'Municipal People\'s Government', employer: (c) => `${town(c)} Municipal People's Government`, titles: { clerk: 'Clerk (keyuan)', deputyClerk: 'Senior Clerk', cityClerk: 'Deputy Section Chief', analyst: 'Section Member (Finance Bureau)', seniorAnalyst: 'Principal Section Member', financeDirector: 'Director, Finance Bureau', manager: 'Division Chief (chuzhang)', acm: 'Deputy Secretary-General', ...cmd('cityManager', ['Secretary-General', 'Vice Mayor'], 'Executive Vice Mayor') } },
      statePolice: null, transitPolice: null,
      police: {
        name: 'Public Security Bureau', employer: (c) => `${town(c)} Public Security Bureau`,
        titles: { recruit: 'Police trainee', officer: 'Police Officer Second Class', senior: 'Police Officer First Class', detective: 'Criminal Police Officer', seniorDetective: 'Senior Criminal Investigator', detSergeant: 'Police Supervisor (Criminal Investigation)', detLieutenant: 'Deputy Chief, Criminal Investigation Brigade', detCaptain: 'Chief, Criminal Investigation Brigade', sergeant: 'Police Supervisor Third Class', lieutenant: 'Police Supervisor First Class', captain: 'Police Inspector Third Class (Station Chief)', deputyChief: 'Police Inspector First Class', ...cmd('chief', ['Police Commissioner Third Class', 'Deputy Director, PSB', 'Executive Deputy Director, PSB', 'Political Commissar, PSB'], 'Director, Public Security Bureau') },
      },
      fire: {
        name: 'China Fire and Rescue', employer: (c) => `${town(c)} Fire and Rescue Detachment`,
        titles: { recruit: 'Firefighter (recruit)', firefighter: 'Firefighter', engineer: 'Senior Firefighter (driver)', inspector: 'Fire Supervision Officer', investigator: 'Fire Investigation Officer', lieutenant: 'Deputy Station Chief', captain: 'Station Chief', battalion: 'Battalion Commander', deputyChief: 'Detachment Commander', ...cmd('chief', ['Provincial Corps Commander', 'Deputy Director-General'], 'Director-General, National Fire and Rescue Administration') },
      },
      ems: {
        name: '120 Emergency Medical Centre', employer: (c) => `${town(c)} 120 Emergency Medical Centre`,
        titles: { emt: 'Emergency medical technician', paramedic: 'Emergency physician', criticalCare: 'Senior emergency physician', flight: 'Air medical physician', fto: 'Emergency medicine trainer', supervisor: 'Station Chief', captain: 'Department Director', deputy: 'Deputy Director, 120 Centre', ...cmd('chief', ['Executive Deputy Director'], 'Director, 120 Emergency Medical Centre') },
      },
      dispatch: { name: '110 Command Centre', employer: (c) => `${town(c)} PSB 110 Command Centre`, titles: { trainee: 'Call taker (trainee)', telecommunicator: '110 Call Taker', senior: 'Senior Dispatcher', training: 'Trainer', supervisor: 'Duty Commander', ...cmd('director', ['Deputy Director, Command Centre'], 'Director, 110 Command Centre') } },
      prosecution: { name: 'People\'s Procuratorate', employer: (c) => `${town(c)} People's Procuratorate`, titles: { clerk: 'Procuratorial Assistant', ada: 'Prosecutor (Level 4)', senior: 'Prosecutor (Level 2)', trial: 'Senior Prosecutor', chiefDeputy: 'Deputy Chief Procurator', ...cmd('first', ['Chief Procurator (municipal)', 'Deputy Procurator-General'], 'Procurator-General') } },
    }),
    NATIONAL_SERVICES: ['fire'],
    POLICE_UNITS: { k9: 'Police dog unit', swat: 'SWAT team (tejing)', traffic: 'Traffic Police', narcotics: 'Narcotics Control Division', gang: 'Organised crime unit', negotiator: 'Crisis negotiation team', sro: 'Community police station', instructor: 'Police academy', ia: 'Police supervision office', protection: 'Security guard division' },
    POLICE_BUREAUS: { homicide: 'Criminal Investigation Brigade (major cases)', svu: 'Family violence unit', property: 'Property crimes squad', robbery: 'Criminal Investigation Brigade', cyber: 'Cyber Security Division' },
    VOLUNTEER_MEDAL: 'Outstanding Volunteer award',

    /* The People's Liberation Army */
    FORCES: {
      pay: 0.4, exposure: 0.2,
      // Military Service Law: men register at 18; recruits are drawn mostly from volunteers, two years for conscripts.
      conscription: { kind: 'lottery', age: 18, months: 24, share: 0.03, branch: 'army', name: 'Military service registration', text: 'Every man registers for military service in the year he turns 18. Most of the PLA\'s two-year conscripts are volunteers; a few are called up.' },
      branches: {
        army: { name: 'PLA Ground Force', icon: '🇨🇳', motto: 'Serve the People', basic: 'recruit training at a training regiment', officerSchool: 'the Army Command College', enlisted: ENLISTED, officer: OFFICERS },
        navy: { name: 'PLA Navy', icon: '⚓', motto: 'Serve the People', basic: 'recruit training at a naval training base', officerSchool: 'the Dalian Naval Academy', enlisted: ENLISTED, officer: OFFICERS },
        airforce: { name: 'PLA Air Force', icon: '✈️', motto: 'Serve the People', basic: 'recruit training at an air force training base', officerSchool: 'the Air Force Aviation University', enlisted: ENLISTED, officer: OFFICERS },
        marines: { name: 'PLA Navy Marine Corps', icon: '⚓', motto: 'Serve the People', basic: 'marine recruit training', officerSchool: 'the Naval Command College', enlisted: ENLISTED, officer: OFFICERS },
        guard: { name: 'PLA Reserve Force', icon: '🛡️', motto: 'Serve the People', basic: 'reserve training', officerSchool: 'the reserve officers\' course', enlisted: ENLISTED, officer: OFFICERS },
      },
      bases: {
        army: [['beijing', 'Central Theatre Command'], ['chengdu', 'Western Theatre Command'], ['guangzhou', 'Southern Theatre Command'], ['wuhan', 'Central Theatre (Wuhan)']],
        navy: [['shanghai', 'East Sea Fleet'], ['shenzhen', 'South Sea Fleet (Hong Kong garrison detachment)']],
        airforce: [['beijing', 'Nanyuan Air Base'], ['chengdu', 'Chengdu Air Base'], ['guangzhou', 'Foshan Air Base']],
        marines: [['guangzhou', 'Marine Corps brigade (Zhanjiang)']],
      },
      overseas: {
        army: [['Djibouti', 'PLA Support Base, Djibouti', 2, true], ['South Sudan', 'UNMISS peacekeeping', 1, false], ['Lebanon', 'UNIFIL engineers', 1, false]],
        navy: [['Gulf of Aden', 'Naval escort task force', 1, false]],
        airforce: [['Russia', 'Joint exercise detachment', 1, false]],
        marines: [['Djibouti', 'PLA Support Base, Djibouti', 2, true]],
      },
    },
    MIL_SPECIAL: { drill: { names: 'Recruit squad leader' }, recruiter: { names: 'People\'s Armed Forces Department officer' }, honorGuard: { names: 'PLA Honour Guard Battalion', desc: 'State welcome ceremonies at the Great Hall of the People.' }, rotc: { names: 'Instructor, national defence students programme' }, joint: { names: 'Staff officer, Central Military Commission Joint Staff Department' }, fellow: { names: 'Fellow, Academy of Military Science' }, commissioning: 'military academy entrance from the ranks', chiefs: { army: 'Commander of the PLA Ground Force', navy: 'Commander of the PLA Navy', airforce: 'Commander of the PLA Air Force', marines: 'Commander of the PLA Navy Marine Corps' }, chairman: 'Vice Chairman of the Central Military Commission' },
    PME: { enlisted: ['Squad leader training', 'NCO school', 'Senior NCO course', 'Master sergeant course', 'Command master sergeant course'], officer: ['Junior officer course', 'Command college', 'National Defence University'] },
    QUALS: { airborne: 'Airborne Corps parachute course', rangerSchool: 'Special operations course', jumpmaster: 'Jumpmaster course', pathfinder: 'Reconnaissance course', combatDiver: 'Frogman course', dli: 'Foreign language course (Luoyang)', instructor: 'Instructor course', sere: 'Survival course', expertBadge: 'Reconnaissance badge' },
    SOF: {
      ranger: sf('PLA special operations brigade', 'special operations selection', 'a theatre special operations brigade', 'special forces badge', 'Theatre command special forces: reconnaissance, raids and counter-terrorism.', ['a counter-terrorism exercise in Xinjiang', 'an international special forces competition']),
      seal: sf('Jiaolong commando unit', 'Jiaolong selection', 'Jiaolong Commando Unit (Navy Marine Corps)', 'Jiaolong badge', 'Naval commandos: maritime counter-terrorism and evacuation.', ['an escort mission in the Gulf of Aden', 'an evacuation of citizens from a war zone']),
    },
    MIL_UNITS: { ground: ['82nd Group Army', '13th Group Army', '77th Group Army', '15th Airborne Corps'], naval: ['Liaoning (aircraft carrier)', 'Shandong (aircraft carrier)', 'Nanchang (Type 055 destroyer)'], air: ['1st Air Brigade (J-20)', '4th Transport Division (Y-20)', 'August 1st Aerobatics Team'], marines: ['1st Marine Brigade', '2nd Marine Brigade'] },
    MIL_SUMMARY: 'a disciplinary sanction under the PLA Discipline Regulations',
    SERVICE_TERMS: { maxYears: { enlisted: 30, officer: 35 }, ages: { enlisted: 55, officer: 55, flag: 63 }, join: { enlisted: [17, 22], officer: [17, 24] }, name: 'term of service' },
    MILITARY_JUSTICE: { code: 'the PLA Discipline Regulations and Criminal Law', court: 'a military court', prison: 'a military prison', counsel: 'Military defence counsel' },
    VETTING: { form: 'political review (zhengshen)', publicTrust: 'Political review', secret: 'Secret (jimi)', topSecret: 'Top Secret (juemi)' },
    CAMPUS: { army: 'National defence students programme', navy: null, airforce: null, obligation: true },
    ACADEMY_NAMES: { army: 'the Army Command College', navy: 'the Dalian Naval Academy', airforce: 'the Air Force Aviation University' },
    THEATERS: [
      { id: 'border', name: 'a border clash in the Himalayas', adversary: 'border troops', intensity: 1, home: 0, weight: 20 },
      { id: 'maritime', name: 'a maritime confrontation in the South China Sea', adversary: 'naval forces', intensity: 1, home: 0, weight: 15 },
    ],
    WAR_START_CHANCE: 0.003,
    MEDALS: {
      moh: { name: 'Order of August First', ribbon: R('#de2910', '#ffde00', '#de2910') }, serviceCross: { name: 'First-Class Merit Citation' }, silverStar: { name: 'Second-Class Merit Citation' },
      dsm: { name: 'Order of Military Merit' }, legionOfMerit: { name: 'Second-Class Merit Citation (staff)' }, bronzeStar: { name: 'Third-Class Merit Citation' },
      purpleHeart: null, msm: { name: 'Third-Class Merit Citation (service)' }, commendation: { name: 'Commendation (jiajiang)' }, achievement: { name: 'Outstanding Soldier' },
      combatAction: null, goodConduct: { name: 'Long-service commemorative medal' }, humanitarian: { name: 'Disaster relief commemorative medal' }, expeditionary: { name: 'UN Peacekeeping Medal' }, ndsm: null,
    },
    ORDERS: {
      minAge: 35,
      tiers: [
        { id: 'modelWorker', name: 'National Model Worker', min: 60, ribbon: R('#de2910', '#ffde00', '#de2910') },
        { id: 'mayDay', name: 'National May Day Labour Medal', min: 100, ribbon: R('#de2910', '#ffde00', '#de2910') },
        { id: 'honoraryTitle', name: 'National Honorary Title', min: 180, ribbon: R('#de2910', '#ffde00', '#de2910') },
        { id: 'republicMedal', name: 'Medal of the Republic', min: 270, ribbon: R('#de2910', '#ffde00', '#de2910') },
      ],
    },
    PARDON: 'the President, on the NPC Standing Committee\'s decision (special amnesty)',
    COMBAT_TEMPO: 0.02,
    MIL_PENSIONS: { name: 'PLA retirement pay', rate: 0.025, cap: 0.85, vest: 12, immediate: { enlisted: 30, officer: 30 }, deferredAge: 60, lumpSum: 0.1 },
    DIRECT_ENTRY: {
      police: [{ id: 'ppsu', name: 'People\'s Public Security University graduate entry', levelId: 'sergeant', education: 'bachelor', maxAge: 30, odds: 0.15, school: 'the People\'s Public Security University of China' }],
    },
    BENCHES: {
      route: 'career', appointedBy: 'the People\'s Congress standing committee', retire: 63,
      school: { name: 'the National Judges College', exam: 'National Unified Legal Professional Qualification Examination + judges\' selection', years: 1, maxAge: 35, practiceInstead: 0, stipend: 20000, minSmarts: 60 },
      ladder: [
        { id: 'assistant', name: 'Judicial Assistant (Basic People\'s Court)', icon: '📋', salary: 25000, entry: true },
        { id: 'basic', name: 'Judge of the Basic People\'s Court', icon: '⚖️', salary: 35000, after: 3 },
        { id: 'intermediate', name: 'Judge of the Intermediate People\'s Court', icon: '🔨', salary: 45000, after: 8 },
        { id: 'higher', name: 'Judge of the Higher People\'s Court', icon: '📜', salary: 55000, after: 15 },
        { id: 'supreme', name: 'Judge of the Supreme People\'s Court', icon: '🏛️', salary: 65000, pick: 'nominated', minYears: 20, appointedBy: 'the NPC Standing Committee' },
      ],
    },
  },
};
