/**
 * Ireland, built on the United Kingdom: common law, Leaving Cert instead of
 * A-levels, one national police service (An Garda Síochána), local-authority
 * fire brigades, a small neutral Defence Forces, EU membership, and no state
 * honours at all (the Constitution forbids titles of nobility).
 *
 * Amounts are euros converted at OECD 2023 PPP (€0.79 per US$), 2025 rates.
 * See docs/ADDING-A-COUNTRY.md for the shape of a pack.
 */

const EUR = 0.79;
const ppp = (local) => Math.round(local / EUR);
const cmd = (top, steps, head) => ({ ...Object.fromEntries(steps.map((t, i) => [`${top}_cmd${i + 1}`, t])), [top]: head });
const sf = (name, course, unitName, badge, desc, deployments) => ({ name, course, unitName, badge, desc, deployments });
const province = (name, extra = {}) => ({ name, incomeTax: [], propertyTax: 0.0018, salesTax: 0.23, rightToWork: false, cannabis: false, dui: { fineMult: 1.2, suspendYears: 1 }, minWage: ppp(13.5), population: 'medium', disasters: { flood: 0.04 }, ...extra });
const ARMY_OFFICERS = ['Second Lieutenant', 'Lieutenant', 'Captain', 'Commandant', 'Lieutenant Colonel', 'Colonel', 'Brigadier General', 'Major General', 'Lieutenant General', 'General'];
const ARMY_ENLISTED = ['Private (2 Star)', 'Private (3 Star)', 'Corporal', 'Sergeant', 'Company Quartermaster Sergeant', 'Company Sergeant', 'Battalion Quartermaster Sergeant', 'Regimental Sergeant Major', 'Command Sergeant Major'];
const ireland = (city) => city.split(',')[0];
/** Each city's local authority, which also runs its fire brigade. */
const COUNCIL = { Dublin: 'Dublin City Council', Cork: 'Cork City Council', Galway: 'Galway City Council', Limerick: 'Limerick City and County Council', Waterford: 'Waterford City and County Council', Letterkenny: 'Donegal County Council' };
const FIRE = { Dublin: 'Dublin Fire Brigade', Cork: 'Cork City Fire Brigade', Galway: 'Galway County Fire and Rescue Service', Limerick: 'Limerick City and County Fire and Rescue Service', Waterford: 'Waterford City and County Fire and Rescue Service', Letterkenny: 'Donegal County Fire Service' };

export const IE = {
  id: 'IE',
  basedOn: 'GB',
  groups: ['EU', 'COMMON_LAW', 'RICH_SYSTEMS'],
  agreements: ['US', 'CA', 'GB', 'AU', 'NZ', 'DE', 'FR', 'IT', 'JP', 'KR'],
  licenceExchange: ['GB', 'AU', 'NZ', 'CA', 'JP', 'KR', 'DE', 'FR', 'IT'],
  peers: ['GB', 'AU', 'NZ', 'CA'],
  // The Common Travel Area with the UK, and EU free movement.
  freeMovement: ['GB', 'DE', 'FR', 'IT'],
  country: {
    name: 'Ireland',
    flag: '🇮🇪',
    demonym: 'Irish',
    capital: 'Dublin',
    currency: { code: 'EUR', symbol: '€', perUsd: EUR },
    languages: ['English', 'Irish'],
    emergency: '112',
    retirementAge: 66,
    tax: {
      // 2025: 20% on the first €44,000, 40% above, less €4,000 of personal and employee tax credits
      // (the same as a €20,000 allowance at 20%).
      allowance: ppp(20000),
      brackets: [[ppp(24000), 0.2], [Infinity, 0.4]],
      // Universal Social Charge (0.5% / 2% / 3% / 8%) and PRSI (4.1%) on earnings.
      contributions: [
        { name: 'USC', rate: 0.005, from: 0, to: ppp(12012) },
        { name: 'USC', rate: 0.02, from: ppp(12012), to: ppp(27382) },
        { name: 'USC', rate: 0.03, from: ppp(27382), to: ppp(70044) },
        { name: 'USC', rate: 0.08, from: ppp(70044), to: Infinity },
        { name: 'PRSI', rate: 0.041, from: 0, to: Infinity },
      ],
      label: 'Revenue',
    },
    // State Pension (Contributory) 2025: €289.30 a week (€15,044/yr) at 66, full with 40 years of contributions; 10 years minimum.
    pension: { kind: 'flat', name: 'State Pension (Contributory)', full: ppp(15044), years: 40, minYears: 10, ages: [66, 66] },
    // Auto-enrolment (My Future Fund) from 2026: employers match 1.5%, rising.
    employerSuper: 0.015,
    // GP visits about €60 without a medical card; €80 a night in a public hospital (capped); the Drug Payment Scheme caps prescriptions.
    health: { name: 'the HSE', short: 'HSE', deductible: 0, coinsurance: 0.15, oopMax: ppp(2000) },
    // Child Benefit: €140 a month a child, for everyone.
    childBenefit: { amount: ppp(1680), phaseOutFrom: Infinity, name: 'Child Benefit' },
    terms: {
      'Federal government': 'Government', 'Federal income tax': 'Income tax', 'State income tax': 'USC', 'Social Security': 'State Pension',
      '401(k)': 'occupational pension', IRA: 'PRSA', IRS: 'Revenue', Medicaid: 'the medical card', Medicare: 'the HSE', 'GI Bill': 'Defence Forces education support',
      'high school': 'secondary school', 'High School': 'Secondary School', deductible: 'excess', Deductible: 'Excess',
      HMRC: 'Revenue', 'the NHS': 'the HSE', NHS: 'HSE', ISA: 'PRSA', 'workplace pension': 'occupational pension', 'National government': 'Government', 'Scottish income tax': 'USC',
    },
    names: {
      male: ['Jack', 'Noah', 'James', 'Rían', 'Oisín', 'Cillian', 'Fionn', 'Conor', 'Seán', 'Darragh', 'Tadhg', 'Daniel', 'Liam', 'Cian', 'Patrick', 'Michael'],
      female: ['Grace', 'Emily', 'Fiadh', 'Sophie', 'Aoife', 'Saoirse', 'Ella', 'Éabha', 'Caoimhe', 'Róisín', 'Niamh', 'Sadhbh', 'Ciara', 'Lucy', 'Siobhán', 'Mary'],
      last: ['Murphy', 'Kelly', 'O\'Sullivan', 'Walsh', 'Smith', 'O\'Brien', 'Byrne', 'Ryan', 'O\'Connor', 'O\'Neill', 'O\'Reilly', 'Doyle', 'McCarthy', 'Gallagher', 'Doherty', 'Kennedy'],
    },
    provinces: {
      'IE-L': province('Leinster', { population: 'large', disasters: { flood: 0.04, blizzard: 0.01 } }),
      'IE-M': province('Munster', { disasters: { flood: 0.05 } }),
      'IE-C': province('Connacht', { population: 'small', disasters: { flood: 0.05 } }),
      'IE-U': province('Ulster (Donegal, Cavan, Monaghan)', { population: 'small', disasters: { flood: 0.04, blizzard: 0.02 } }),
    },
    cities: {
      dublin: { name: 'Dublin', icon: '🍀', type: 'High-cost metro', state: 'IE-L', col: 1.4, market: 1.05, locality: 0.25, transit: 65, fare: ppp(150), walkable: true, size: 'large', population: [592000, 1460000] },
      cork: { name: 'Cork', icon: '⛵', type: 'Mid-size city', state: 'IE-M', col: 1.1, market: 0.92, locality: 0.2, transit: 40, fare: ppp(100), walkable: true, size: 'medium', population: [225000, 225000] },
      galway: { name: 'Galway', icon: '🎻', type: 'Mid-size city', state: 'IE-C', col: 1.08, market: 0.85, locality: 0.19, transit: 25, fare: ppp(90), walkable: true, size: 'medium', population: [86000, 86000] },
      limerick: { name: 'Limerick', icon: '🏉', type: 'Mid-size city', state: 'IE-M', col: 1.0, market: 0.84, locality: 0.18, transit: 25, fare: ppp(90), walkable: true, size: 'medium', population: [103000, 103000] },
      waterford: { name: 'Waterford', icon: '💎', type: 'Coastal metro', state: 'IE-M', col: 0.95, market: 0.8, locality: 0.17, transit: 20, fare: ppp(80), walkable: true, size: 'small', population: [60000, 60000] },
      letterkenny: { name: 'Letterkenny, Donegal', icon: '⛰️', type: 'Small town', state: 'IE-U', col: 0.88, market: 0.76, locality: 0.16, transit: 10, fare: ppp(70), walkable: false, size: 'small', population: [22000, 167000] },
    },
    hometowns: ['dublin', 'dublin', 'dublin', 'cork', 'cork', 'galway', 'limerick', 'waterford', 'letterkenny'],
    population: { 'IE-L': 2.9e6, 'IE-M': 1.4e6, 'IE-C': 0.6e6, 'IE-U': 0.32e6 },
  },
  offices: {
    ie_td: { country: 'IE', name: 'Teachta Dála (TD)', icon: '🏛️', level: 4, term: 5, termLimit: 0, salary: 140000, minAge: 21, residency: 0, cost: 60000, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    // The Seanad is chosen by councillors, TDs and university graduates: hold a council or Dáil seat first.
    ie_senator: { country: 'IE', name: 'Senator (Seanad Éireann)', icon: '🏛️', level: 4, term: 5, termLimit: 0, salary: 98000, minAge: 21, residency: 0, cost: 30000, requires: ['cityCouncil', 'mayor', 'ie_td'], fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    ie_taoiseach: { country: 'IE', name: 'Taoiseach', icon: '🇮🇪', level: 5, term: 5, termLimit: 0, salary: 280000, minAge: 21, residency: 0, cost: 1000000, requires: ['ie_td'], leader: true, statewide: true, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true },
  },
  tables: {
    /* Law and money */
    JUSTICE: (b) => ({ ...b, jurorPay: 0, jail: (city) => ({ Dublin: 'Cloverhill Prison (remand)', Cork: 'Cork Prison', Limerick: 'Limerick Prison' }[ireland(city)] ?? 'Castlerea Prison'), prison: 'a closed prison (Mountjoy)', legalAid: 'criminal legal aid solicitor', privatePrisons: 0 }),
    INSOLVENCY: { liquidation: { name: 'Bankruptcy (Insolvency Service of Ireland)', wait: 1, plan: 3 }, plan: { name: 'Personal Insolvency Arrangement', years: 6, wait: 2 }, homestead: ppp(15000), wildcard: ppp(6000), creditYears: 5 },
    // Capital Acquisitions Tax: 33% above the €400,000 group A threshold (children).
    INHERITANCE: { name: 'Capital Acquisitions Tax', exemption: ppp(400000), brackets: [[Infinity, 0.33]] },
    UNEMPLOYMENT: { name: 'Jobseeker\'s Benefit (pay-related)', flat: ppp(23000), years: 0.5 },
    SEVERANCE: { perYear: 0.46, base: 0.23 },
    DISABILITY: (b) => ({ name: 'Invalidity Pension', rate: 0, floor: ppp(13000), cap: ppp(13000), minYears: 5, odds: 1.1, stages: ['Medical assessment', 'Review', 'Social Welfare Appeals Office'] }),
    SELF_EMPLOYED: { name: 'Class S PRSI', rate: 0.041, floor: ppp(5000) },
    CREDIT: { name: 'credit history (Central Credit Register)' },
    SMALL_BIZ_LOAN: 'Microfinance Ireland loan',
    VETERANS: { orgs: ['Organisation of National Ex-Service Personnel (ONE)', 'IUNVA (UN veterans)'], care: 'the Department of Defence' },
    STOCK_INDEX: 'ISEQ 20',
    MORTGAGES: {
      // Central Bank rules: 90% loan-to-value for first-time buyers, 4× income.
      closing: 0.03, stress: 0.02,
      products: {
        fix3: { name: '3-yr fixed (30-yr)', years: 30, rateAdj: -0.004, minDown: 0.1, minScore: 600, maxDti: 0.35, arm: true, reset: 3 },
        fix5: { name: '5-yr fixed (30-yr)', years: 30, rateAdj: -0.005, minDown: 0.1, minScore: 600, maxDti: 0.35, arm: true, reset: 5 },
        variable: { name: 'Variable rate (30-yr)', years: 30, rateAdj: 0.002, minDown: 0.1, minScore: 600, maxDti: 0.35, arm: true, reset: 1 },
      },
    },
    UNIONS: { police: 'Garda Representative Association', fire: 'SIPTU (fire services)', ems: 'SIPTU (ambulance)', health: 'Irish Nurses and Midwives Organisation', education: 'INTO / ASTI / TUI', public: 'Fórsa', prisons: 'Prison Officers\' Association', transport: 'SIPTU (transport)', rail: 'National Bus and Rail Union', aviation: 'Fórsa (aviation)', pilots: 'Irish Air Line Pilots\' Association', trades: 'Connect Trade Union', industry: 'SIPTU', retail: 'Mandate', hospitality: 'SIPTU (hospitality)', services: 'SIPTU', media: 'NUJ Ireland', tech: 'Financial Services Union', arts: 'Irish Equity', postal: 'Communications Workers\' Union' },
    CADETS: { jrotc: 'Army Reserve cadet programme', seaCadets: 'Irish Sea Cadets' },
    FOREIGN_SERVICE_EXAM: 'Third Secretary competition (publicjobs.ie)',
    PROSECUTORS: ['Office of the Director of Public Prosecutions', 'Criminal Legal Aid', 'Probation Service'],
    VOLUNTEER_RANKS: { fire: ['Recruit Retained Firefighter', 'Retained Firefighter', 'Senior Retained Firefighter', 'Firefighter (Driver/Mechanic)', 'Sub-Station Officer', 'Station Officer', 'Assistant Chief Fire Officer'], police: ['Trainee Reserve Garda', 'Reserve Garda', 'Reserve Garda (experienced)', 'Reserve Garda (mentor)', 'Reserve Coordinator', 'Reserve Liaison Sergeant', 'Reserve Liaison Inspector'], ambulance: ['Cadet', 'Occupational First Aider', 'Emergency First Responder', 'Ambulance Crew Lead', 'Unit Officer', 'Unit Commander', 'Regional Commander'] },
    VOLUNTEER_SERVICES: { fire: 'Retained Firefighter', police: 'Garda Reserve', sar: 'Mountain Rescue Ireland', ambulance: 'Order of Malta Ambulance Corps', wildland: null, auxiliary: 'RNLI Lifeboat Crew', cap: null, cert: 'Civil Defence', redcross: 'Irish Red Cross', skiPatrol: null, mrc: null },
    NATIONAL_SERVICE: { overseas: 'Irish Aid volunteering (Comhlámh)', domestic: null },
    ACCOUNTS: { dc: 'Occupational pension', roth: { name: 'Exchange-traded fund (exit tax)', limit: ppp(50000) }, traditional: { name: 'PRSA', limit: ppp(30000), share: 1 } },
    REFERENDUMS: {
      constitution: { name: 'Constitutional referendum', icon: '📜', support: 0.5, effects: { services: 1 }, pitch: 'Amend Bunreacht na hÉireann: only the people can change it.' },
      directMayor: { name: 'Plebiscite on a directly elected mayor', icon: '🏛️', support: 0.48, effects: { services: 2 }, pitch: 'Give the city a mayor elected by everyone, with real powers.' },
    },
    ENTRANCE_EXAMS: { name: 'Leaving Certificate (CAO points)', prep: { name: 'grinds', cost: ppp(3000) }, weight: 0.8 },
    AVIATION_AUTHORITY: 'Irish Aviation Authority',
    COUNTY: 'County',
    LONG_TERM_CARE: { name: 'the Fair Deal nursing home scheme', covers: 0.6, safetyNet: 'the HSE' },
    WORKPLACE: { equality: 'Workplace Relations Commission', reservist: 'the Defence (Amendment) Act', labourBoard: 'the Labour Court' },
    EQUIPMENT: (b) => ({
      ...b,
      'Digital radio + body camera kit': 'TETRA radio + body-worn camera', 'Patrol sedan': 'Garda patrol car (Skoda Octavia)', 'Police SUV': 'Armed Support Unit vehicle (Audi Q7)', 'Pumper engine': 'Class B fire appliance', '100-ft aerial ladder truck': 'Turntable ladder',
      HMMWV: 'Mowag Piranha (scout)', JLTV: 'RG-32M', 'M2 Bradley': 'Mowag Piranha IIIH', Stryker: 'Mowag Piranha IIIH', 'M1A2 Abrams': null, 'F-16': 'PC-12 (ISTAR)', 'F-35A': null, 'C-130J': 'C-295W', 'MH-60R Seahawk': 'AW139', 'F/A-18E/F Super Hornet': 'AW139',
    }),
    LOCAL_ENTITIES: { sole: 'Sole trader', llc: null, ccorp: 'Private company limited by shares (LTD)' },
    PRIVATE_TITLES: { 'Vice President': 'Director', 'Senior Director': 'Head of', 'Chief Executive Officer': 'Chief Executive' },

    /* Schools and credentials */
    EDUCATION: (b) => ({
      ...b,
      // The €2,000-€3,000 student contribution (often grant-covered); SUSI grants, no loan scheme.
      tuition: { community: 0, technical: ppp(2500), online: ppp(3000), state: ppp(2500), private: ppp(9000), elite: ppp(2500) },
      freeIn: undefined, loans: undefined, loanThreshold: undefined, writeOffAge: undefined,
      schools: { community: 'Education and Training Board (PLC college)', technical: 'Technological University Dublin', online: 'DCU Online', state: 'University of Galway', private: 'Griffith College', elite: 'Trinity College Dublin', academy: 'the Cadet School, Military College (Curragh)' },
      words: { 'High School': 'Secondary School', 'high-school diploma': 'Leaving Certificate', 'high school': 'secondary school', GED: 'QQI Level 5 Certificate (access)' },
      licenses: {
        ...b.licenses,
        'State Bar License': 'Solicitor (Law Society of Ireland) or Barrister (King\'s Inns)', 'Medical License (MD)': 'Medical Council registration', 'Board Certification': 'Specialist registration (Medical Council)',
        'Certified Public Accountant (CPA)': 'Chartered Accountant (CAI)', 'Peace Officer (POST Basic Academy)': 'Garda Trainee programme (Templemore)', 'Registered Nurse (RN)': 'NMBI registered nurse',
        'Commercial Driver License (Class A)': 'Category C+E licence', 'Commercial Driver License (Class B)': 'Category C licence', 'Driver\'s License (Class D)': 'Full driving licence (Category B)', 'Learner\'s Permit': 'Learner permit (L plates)',
        'Professional Engineer (PE)': 'Chartered Engineer (Engineers Ireland)', 'EMT (NREMT)': 'Emergency Medical Technician (PHECC)', 'Paramedic (NRP)': 'PHECC registered paramedic', 'Pharmacist License (NAPLEX + MPJE)': 'PSI registered pharmacist',
      },
    }),
    SHORT_CYCLE: 'Higher Certificate (Level 6)',
    CREDENTIAL_LOCAL: { 'Driving licence (car)': 'Full driving licence (Category B)', 'Heavy goods vehicle licence (articulated)': 'Category C+E licence', 'Heavy goods vehicle licence (rigid)': 'Category C licence', 'Bus & coach licence': 'Category D licence', 'Security licence': 'PSA licence', 'Construction site safety card': 'Safe Pass card', 'Learner licence': 'Learner permit', 'Certified vehicle technician': 'SIMI-accredited technician' },
    PROFESSIONAL_DEGREES: { jd: 'BCL (Bachelor of Civil Law)', md: 'MB BCh BAO (Medicine)' },
    UNDERGRAD_ENTRY: { jd: 4, md: 6 },
    APPRENTICESHIP_SYSTEMS: { name: 'SOLAS apprenticeship', years: 4, pay: ppp(26000), exam: 'QQI Advanced Certificate (craft)' },

    /* Moving here */
    WORKING_HOLIDAY: { name: 'Working Holiday Authorisation', odds: 0.9, years: 1, fee: 300, once: true, partners: { AU: 30, NZ: 30, CA: 35, JP: 30, KR: 30, US: 30 } },
    IMMIGRATION: (b) => ({
      ...b,
      visas: {
        work: { name: 'Critical Skills Employment Permit', odds: 0.8, years: 2, degree: true, fee: 1000 },
        transfer: { name: 'Intra-Company Transfer Employment Permit', odds: 0.9, years: 5, fee: 1000 },
        student: { name: 'Stamp 2 student permission', odds: 0.85, years: 4, postStudy: 1, fee: 300 },
        family: { name: 'Join family (spouse of an Irish citizen)', odds: 0.85, years: 3, fee: 300 },
      },
      pr: { name: 'Stamp 4 (long-term residence)', years: 5, fee: 500 },
      // Five years' reckonable residence out of the last nine (three if married to a citizen).
      nat: { years: 5, married: 3, needsPR: false, fromArrival: true, prMin: 0, fee: 1100 },
      dualIn: true, dualOut: true,
      // Born in Ireland: a citizen if a parent is a citizen or has lived here three of the last four years.
      birthright: { parentPR: true },
      prLapse: 1, surcharge: 0,
      intlTuition: { mult: 1, floor: ppp(18000) },
    }),
    ASYLUM: { name: 'International protection application (IPO)', odds: 0.4, decision: 2, workAfter: 0.5, prYears: 0, support: ppp(2000) },
    LICENCE_EXCHANGE: ['GB', 'AU', 'NZ', 'CA', 'JP', 'KR', 'DE', 'FR', 'IT'],
    PEERS: ['GB', 'AU', 'NZ', 'CA'],
    OVERSTAY_BAN: 5,
    BIRTH_REGISTRATION: { name: 'Foreign Births Register', fee: 280, deadline: false },
    PARENT_VISAS: { name: 'Join family (dependent parent, non-EEA)', needs: 'resident', odds: 0.1, wait: 2, fee: 300 },
    DIASPORA: { share: 0.2, from: [['polish', 3], ['GB', 3], ['IN', 2], ['romanian', 1], ['westAfrican', 1], ['chinese', 1], ['IT', 1], ['FR', 1]] },

    /* Government and politics */
    LEGISLATURES: {
      lower: { name: 'Dáil Éireann', seats: 174, presiding: 'Ceann Comhairle', office: 'ie_td' },
      upper: { name: 'Seanad Éireann', seats: 60, presiding: 'Cathaoirleach', office: 'ie_senator' },
      exec: 'Taoiseach', execOffice: 'ie_taoiseach', veto: false,
    },
    // Ireland's two big parties are both centre-right; Sinn Féin leads the left.
    PARTY_NAMES: { labor: 'Sinn Féin', business: 'Fine Gael' },
    CORPORATE_RATE: 0.125,
    HEALTH_SYSTEMS: { wait: 18, waitName: 'public hospital waiting list', private: { name: 'Private health insurance (VHI, Laya, Irish Life)', premium: ppp(1800), skipsWait: true } },
    PUBLIC_LABOUR: { noStrike: ['police', 'military'], association: ['police'] },
    AGENCIES: {
      fbi: { name: 'Garda National Bureau of Criminal Investigation', employers: ['GNBCI — Harcourt Square', 'Garda National Drugs and Organised Crime Bureau'], titles: { trainee: 'Detective Garda (probation)', agent: 'Detective Garda', senior: 'Detective Garda (senior)', ssa: 'Detective Sergeant', asac: 'Detective Inspector', sac: 'Detective Chief Superintendent' } },
      usss: { name: 'Garda Special Detective Unit', employers: ['SDU — Harcourt Square'] },
      borderPatrol: { name: 'Border Management Unit / Revenue Customs', employers: ['Dublin Airport — Border Management Unit', 'Revenue Customs — Dublin Port'] },
      tsa: { name: 'Airport Police & Security (daa)', employers: ['Dublin Airport Security'] },
      postal: { name: 'An Post', employers: ['An Post — Delivery Service Unit'] },
      benefitsClaims: { name: 'Department of Social Protection (Intreo)', employers: ['Intreo Centre'] },
      caseOfficer: null,
      sigint: { name: 'National Cyber Security Centre', employers: ['NCSC — Dublin'] },
      intelligence: { name: 'Military Intelligence (J2)', employers: ['Defence Forces J2 — McKee Barracks'] },
      meteorology: { name: 'Met Éireann', employers: ['Met Éireann — Glasnevin'] },
      regulatory: { name: 'Financial Regulation (Central Bank · Revenue)', employers: ['Central Bank of Ireland', 'Revenue Commissioners'] },
      foreignService: { name: 'Department of Foreign Affairs', employers: ['DFA — Iveagh House'] },
      parkService: { name: 'National Parks and Wildlife Service Ranger', employers: ['Killarney National Park', 'Wicklow Mountains National Park'] },
      airTrafficControl: { name: 'AirNav Ireland ATC', employers: ['AirNav — Dublin ACC', 'AirNav — Shannon ACC'] },
      nationalLab: { name: 'Science Foundation Ireland research centres', employers: ['Tyndall National Institute'] },
      oig: { name: 'Office of the Comptroller and Auditor General', employers: ['Comptroller and Auditor General'] },
      federalPrisons: { name: 'Irish Prison Service', employers: ['Mountjoy Prison', 'Wheatfield Place of Detention'] },
    },
    LOCAL_AGENCIES: (b) => ({
      ...b,
      education: { name: 'Schools', employer: (city) => `${ireland(city)} national and secondary schools`, titles: { sub: 'Substitute Teacher', teacher: 'Teacher', senior: 'Assistant Principal II', coach: 'Teaching Principal (small school)', specialist: 'Assistant Principal I', chair: 'Year Head', ap: 'Deputy Principal', principal: 'Principal', director: 'Schools Inspector', assistantSuper: 'Assistant Chief Inspector', ...cmd('superintendent', ['Chief Inspector', 'Assistant Secretary General'], 'Secretary General, Department of Education') } },
      municipalAdmin: { name: 'Local Authority', employer: (city) => COUNCIL[ireland(city)] ?? `${ireland(city)} County Council`, titles: { clerk: 'Clerical Officer', deputyClerk: 'Staff Officer', cityClerk: 'Meetings Administrator', analyst: 'Assistant Staff Officer (Finance)', seniorAnalyst: 'Administrative Officer', financeDirector: 'Head of Finance', manager: 'Senior Executive Officer', acm: 'Director of Services', ...cmd('cityManager', ['Senior Director of Services', 'Deputy Chief Executive', 'Assistant Chief Executive'], 'Chief Executive') } },
      probation: { name: 'The Probation Service', employer: (city) => `Probation Service — ${ireland(city)}`, titles: { trainee: 'Probation Officer (probation)', officer: 'Probation Officer', senior: 'Senior Probation Officer', specialized: 'Probation Officer (Sex Offender Risk Assessment)', supervisor: 'Assistant Principal Probation Officer', chief: 'Director of the Probation Service' } },
      police: null, transitPolice: null,
      statePolice: {
        name: 'An Garda Síochána', employer: () => 'An Garda Síochána',
        titles: { cadet: 'Garda Trainee (Templemore)', trooper: 'Garda', senior: 'Garda (Tutor)', investigator: 'Detective Garda', majorCrimes: 'Detective Garda (Serious Crime)', detSergeant: 'Detective Sergeant', detLieutenant: 'Detective Inspector', detCaptain: 'Detective Superintendent', sergeant: 'Sergeant', lieutenant: 'Inspector', captain: 'Superintendent', major: 'Chief Superintendent', ...cmd('superintendent', ['Assistant Commissioner', 'Assistant Commissioner (Dublin Region)', 'Deputy Commissioner', 'Deputy Commissioner (Policing and Security)'], 'Garda Commissioner') },
      },
      corrections: { name: 'Irish Prison Service', employer: (city) => ({ Dublin: 'Mountjoy Prison', Cork: 'Cork Prison', Limerick: 'Limerick Prison' }[ireland(city)] ?? 'Castlerea Prison') },
      fire: {
        name: 'Fire and Rescue Service', employer: (city) => FIRE[ireland(city)] ?? `${ireland(city)} County Fire Service`,
        titles: { recruit: 'Recruit Firefighter', firefighter: 'Firefighter', engineer: 'Firefighter (Driver/Mechanic)', inspector: 'Fire Prevention Officer', investigator: 'Fire Investigation Officer', lieutenant: 'Sub-Station Officer', captain: 'Station Officer', battalion: 'District Officer', deputyChief: 'Assistant Chief Fire Officer', ...cmd('chief', ['Senior Assistant Chief Fire Officer', 'Deputy Chief Fire Officer'], 'Chief Fire Officer') },
      },
      ems: {
        name: 'National Ambulance Service', employer: (city) => (ireland(city) === 'Dublin' ? 'Dublin Fire Brigade (Emergency Ambulance)' : 'HSE National Ambulance Service'),
        titles: { emt: 'Emergency Medical Technician', paramedic: 'Paramedic', criticalCare: 'Advanced Paramedic', flight: 'Advanced Paramedic (Emergency Aeromedical Service)', fto: 'Paramedic Tutor', supervisor: 'Station Officer', captain: 'Area Operations Manager', deputy: 'Chief Ambulance Officer', ...cmd('chief', ['Assistant Director of Operations', 'Director of Operations', 'Deputy Director'], 'Director, National Ambulance Service') },
      },
      dispatch: { name: '112/999 Emergency Call Answering', employer: (city) => (ireland(city) === 'Dublin' ? 'Dublin Fire Brigade East Region Communications Centre' : 'National Emergency Operations Centre (Tallaght)'), titles: { trainee: 'Trainee Call Taker', telecommunicator: '112/999 Call Taker', senior: 'Emergency Dispatcher', training: 'Control Trainer', supervisor: 'Control Supervisor', ...cmd('director', ['Control Manager', 'Head of Control'], 'Director of Emergency Communications') } },
      prosecution: { name: 'Office of the Director of Public Prosecutions', employer: (city) => (ireland(city) === 'Dublin' ? 'Office of the DPP' : `State Solicitor's Office, ${ireland(city)}`), titles: { clerk: 'Legal Executive', ada: 'State Solicitor', senior: 'Senior Solicitor (DPP)', trial: 'Prosecuting Counsel', chiefDeputy: 'Deputy Director of Public Prosecutions', ...cmd('first', ['Head of Prosecution Policy', 'Chief Prosecution Solicitor'], 'Director of Public Prosecutions') } },
    }),
    POLICE_UNITS: { k9: 'Garda Dog Unit', swat: 'Emergency Response Unit', traffic: 'Roads Policing Unit', narcotics: 'Divisional Drugs Unit', gang: 'Armed Support Unit', negotiator: 'Garda Negotiation Unit', sro: 'Garda Schools Programme', instructor: 'Garda College, Templemore', ia: 'Garda Professional Standards Unit', protection: 'Special Detective Unit (protection)' },
    POLICE_BUREAUS: { homicide: 'Divisional murder investigation team', svu: 'Garda National Protective Services Bureau', property: 'Divisional Crime Task Force', robbery: 'Garda National Drugs and Organised Crime Bureau', cyber: 'Garda National Cyber Crime Bureau' },
    VOLUNTEER_MEDAL: 'Volunteer Ireland Award',

    /* The Defence Forces (Óglaigh na hÉireann) */
    FORCES: {
      pay: 0.72, exposure: 0.25,
      branches: {
        army: { name: 'Irish Army', icon: '☘️', motto: 'Óglaigh na hÉireann', basic: 'recruit training at the Defence Forces Training Centre, Curragh Camp', officerSchool: 'the Cadet School, Military College (Curragh)', enlisted: ARMY_ENLISTED, officer: ARMY_OFFICERS },
        navy: { name: 'Irish Naval Service', icon: '⚓', motto: 'Óglaigh na hÉireann', basic: 'recruit training at Naval Base Haulbowline', officerSchool: 'the Naval College, Haulbowline',
          enlisted: ['Ordinary Seaman', 'Able Seaman', 'Leading Seaman', 'Petty Officer', 'Chief Petty Officer', 'Senior Chief Petty Officer', 'Warrant Officer', 'Senior Warrant Officer', 'Command Chief Petty Officer'],
          officer: ['Cadet', 'Ensign', 'Sub-Lieutenant', 'Lieutenant', 'Lieutenant Commander', 'Commander', 'Captain', 'Commodore', 'Rear Admiral', 'Vice Admiral'] },
        airforce: { name: 'Irish Air Corps', icon: '✈️', motto: 'Óglaigh na hÉireann', basic: 'recruit training at Casement Aerodrome, Baldonnel', officerSchool: 'the Flying Training School, Baldonnel',
          enlisted: ['Airman (2 Star)', 'Airman (3 Star)', 'Corporal', 'Sergeant', 'Flight Sergeant', 'Flight Quartermaster Sergeant', 'Warrant Officer', 'Senior Warrant Officer', 'Command Sergeant Major'], officer: ARMY_OFFICERS },
        guard: { name: 'Army Reserve (Reserve Defence Force)', icon: '🛡️', motto: 'Óglaigh na hÉireann', basic: 'Reserve recruit training', officerSchool: 'the Reserve Potential Officers Course', enlisted: ARMY_ENLISTED, officer: ARMY_OFFICERS },
      },
      bases: {
        army: [['dublin', 'Cathal Brugha Barracks'], ['dublin', 'McKee Barracks'], ['cork', 'Collins Barracks, Cork'], ['galway', 'Dún Uí Mhaoilíosa (Renmore)'], ['limerick', 'Sarsfield Barracks'], ['letterkenny', 'Finner Camp']],
        navy: [['cork', 'Naval Base Haulbowline']],
        airforce: [['dublin', 'Casement Aerodrome, Baldonnel']],
      },
      overseas: {
        army: [['Lebanon', 'UNIFIL (Irish battalion)', 1, false], ['Syria (Golan Heights)', 'UNDOF', 1, false], ['Kosovo', 'KFOR', 1, false], ['Bosnia and Herzegovina', 'EUFOR Althea', 1, false]],
        navy: [['Mediterranean', 'Operation Irini', 1, false]],
        airforce: [['Lebanon', 'UNIFIL air support', 1, false]],
      },
    },
    MIL_SPECIAL: (b) => ({
      ...b,
      drill: { names: { army: 'Recruit Platoon NCO', navy: 'Recruit Instructor', airforce: 'Recruit Instructor' }, places: { army: 'the Defence Forces Training Centre, Curragh', navy: 'Naval Base Haulbowline', airforce: 'Casement Aerodrome' } },
      recruiter: { names: 'Defence Forces Recruitment Office NCO' },
      honorGuard: { names: { army: 'the Cavalry Corps Mounted Escort / 2nd Brigade Guard of Honour', navy: 'Naval Service Guard of Honour', airforce: 'Air Corps Guard of Honour' }, desc: 'State visits at Áras an Uachtaráin, the 1916 commemoration and the National Day of Commemoration.' },
      rotc: { names: { army: 'Instructor, Cadet School' }, desc: 'Train officer cadets at the Military College.' },
      joint: { names: 'Staff Officer, Defence Forces Headquarters (McKee Barracks)' },
      fellow: { names: 'Defence Forces scholar, Maynooth University' },
      commissioning: 'the Potential Officers Course from the ranks',
      chiefs: { army: 'Deputy Chief of Staff (Operations)', navy: 'Flag Officer Commanding the Naval Service', airforce: 'General Officer Commanding the Air Corps' },
      chairman: 'Chief of Defence',
    }),
    PME: { enlisted: ['Standard NCO Course', 'Potential NCO Course', 'Senior NCO Course', 'Senior NCO Course (Advanced)', 'Command Sergeant Major Course'], officer: ['Young Officers\' Course', 'Junior Command and Staff Course', 'Senior Command and Staff Course (Military College)'] },
    QUALS: { airborne: null, rangerSchool: 'Army Ranger Wing selection course', jumpmaster: 'Parachute Jumpmaster course', pathfinder: 'Reconnaissance course', dli: 'Defence Forces language course', instructor: 'Instructors\' course (Military College)', sere: 'Survival, evasion and resistance course' },
    SOF: {
      ranger: sf('Army Ranger Wing', 'the Army Ranger Wing selection course', 'Army Ranger Wing (Sciathán Fiannóglaigh an Airm), Curragh', 'Ranger tab', 'Ireland\'s special operations unit: counter-terrorism at home, reconnaissance on UN missions.', ['a counter-terrorism standby in Dublin', 'a special reconnaissance task with an EU battlegroup', 'an evacuation of Irish citizens overseas']),
      seal: sf('Naval Service Diving Section', 'the naval diving course at Haulbowline', 'Naval Service Diving Section', 'naval diver badge', 'Search, salvage and explosive ordnance disposal at sea.', ['a search-and-recovery dive off the west coast', 'a port-security standby']),
    },
    BILLETS: (b) => ({ ground: { ...b.ground, firstSergeant: 'Company Sergeant', seniorStaffNco: 'Company Quartermaster Sergeant', csm: 'Battalion Sergeant Major', companyCommander: 'Officer Commanding (Commandant)' }, naval: b.naval, air: b.air }),
    MIL_UNITS: { ground: ['1st Infantry Battalion', '3rd Infantry Battalion', '7th Infantry Battalion', '12th Infantry Battalion', '1st Armoured Cavalry Squadron'], naval: ['LÉ William Butler Yeats', 'LÉ George Bernard Shaw', 'LÉ Samuel Beckett', 'LÉ James Joyce'], air: ['No. 3 Operations Wing', 'No. 1 Operations Wing', 'Flying Training School'] },
    MIL_SUMMARY: 'a summary investigation by your commanding officer',
    SERVICE_TERMS: { maxYears: { enlisted: 21, officer: 40 }, ages: { enlisted: 50, officer: 58, flag: 60 }, name: 'term of service' },
    MILITARY_JUSTICE: { code: 'the Defence Act 1954', court: 'Court-martial (Defence Forces)', prison: 'the Defence Forces Detention Barracks, Curragh', counsel: 'Defending officer' },
    VETTING: { form: 'Garda vetting and Defence Forces security clearance', publicTrust: 'Garda vetting', secret: 'Defence Forces Secret clearance', topSecret: 'Top Secret clearance' },
    CAMPUS: null,
    ACADEMY_NAMES: { army: 'the Cadet School, Military College (Curragh)', navy: 'the Naval College, Haulbowline', airforce: 'the Cadet School, Military College (Air Corps)' },
    // A neutral country: UN peacekeeping is the war it fights.
    THEATERS: [
      { id: 'peacekeeping', name: 'a UN peacekeeping mission in Lebanon that turned into combat', adversary: 'militias', intensity: 1, home: 0, weight: 30 },
      { id: 'euMission', name: 'an EU stabilisation mission in Africa', adversary: 'armed groups', intensity: 1, home: 0, weight: 12 },
    ],
    WAR_START_CHANCE: 0.004,
    MEDALS: {
      moh: { name: 'Military Medal for Gallantry', ribbon: [['#169b62', 1], ['#fff', 1], ['#ff883e', 1]] }, serviceCross: { name: 'Military Medal for Gallantry (with Distinction)' }, silverStar: { name: 'Distinguished Service Medal (with Honour)' },
      dsm: { name: 'Distinguished Service Medal (with Distinction)' }, legionOfMerit: { name: 'Distinguished Service Medal' }, bronzeStar: { name: 'Distinguished Service Medal' },
      purpleHeart: null, msm: { name: 'Distinguished Service Medal (with Merit)' }, commendation: { name: 'Chief of Staff\'s Commendation' }, achievement: { name: 'General Officer Commanding\'s Commendation' },
      combatAction: null, goodConduct: { name: 'Service Medal' }, humanitarian: { name: 'Humanitarian Operations Medal' }, expeditionary: { name: 'International Operational Service Medal' }, ndsm: null,
    },
    // Article 40.2: the state confers no titles of nobility or honour.
    ORDERS: null,
  },
};
