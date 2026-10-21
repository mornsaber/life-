/**
 * New Zealand, built on Australia: the same Westminster parliament (with
 * one chamber), the same kind of ladders and licences, but one national
 * police force, one national fire service, no states and no armed jets.
 *
 * Amounts are NZ dollars converted at OECD 2023 PPP (NZ$1.45 per US$),
 * 2025–26 rates. See docs/ADDING-A-COUNTRY.md for the shape of a pack.
 */

const NZD = 1.45;
const ppp = (local) => Math.round(local / NZD);
const cmd = (top, steps, head) => ({ ...Object.fromEntries(steps.map((t, i) => [`${top}_cmd${i + 1}`, t])), [top]: head });
const sf = (name, course, unitName, badge, desc, deployments) => ({ name, course, unitName, badge, desc, deployments });
const region = (name, extra = {}) => ({ name, incomeTax: [], propertyTax: 0.004, salesTax: 0.15, rightToWork: false, cannabis: false, dui: { fineMult: 1.1, suspendYears: 0.5 }, minWage: ppp(23.5), population: 'medium', disasters: { earthquake: 0.02, flood: 0.03 }, ...extra });
const ARMY_OFFICERS = ['Second Lieutenant', 'Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier', 'Major General', 'Lieutenant General', 'General'];
const ARMY_ENLISTED = ['Private', 'Lance Corporal', 'Corporal', 'Sergeant', 'Staff Sergeant', 'Warrant Officer Class 2', 'Warrant Officer Class 1', 'Warrant Officer Class 1 (RSM)', 'Sergeant Major of the New Zealand Army'];

export const NZ = {
  id: 'NZ',
  basedOn: 'AU',
  groups: ['COMMON_LAW', 'RICH_SYSTEMS'],
  // Social-security agreements in force.
  agreements: ['AU', 'GB', 'CA', 'IE', 'IT', 'DE', 'KR'],
  // Licences exchanged without a test, both ways.
  licenceExchange: ['AU', 'GB', 'IE', 'CA', 'US', 'DE', 'FR', 'IT', 'JP', 'KR'],
  // Professional systems close enough to recognise each other (the trans-Tasman agreement and the old Commonwealth).
  peers: ['AU', 'GB', 'IE', 'CA'],
  // Countries whose citizens may live and work here without a visa (the Trans-Tasman Travel Arrangement).
  freeMovement: ['AU'],
  country: {
    name: 'New Zealand',
    flag: '🇳🇿',
    demonym: 'New Zealander',
    capital: 'Wellington',
    currency: { code: 'NZD', symbol: 'NZ$', perUsd: NZD },
    languages: ['English', 'Māori'],
    emergency: '111',
    retirementAge: 65,
    tax: {
      // 2025–26: 10.5% to NZ$15,600; 17.5% to NZ$53,500; 30% to NZ$78,100; 33% to NZ$180,000; 39% above. No tax-free allowance.
      allowance: 0,
      brackets: [[ppp(15600), 0.105], [ppp(53500), 0.175], [ppp(78100), 0.3], [ppp(180000), 0.33], [Infinity, 0.39]],
      // The ACC earners' levy (accident cover), 1.67% up to NZ$156,641.
      contributions: [{ name: 'ACC earners\' levy', rate: 0.0167, from: 0, to: ppp(156641) }],
      label: 'Inland Revenue (IRD)',
    },
    // NZ Super: about NZ$29,500 a year for a single person living alone, at 65, after 10 years' residence. Not means-tested.
    pension: { kind: 'flat', name: 'NZ Super', full: ppp(29500), years: 10, minYears: 10, ages: [65, 65] },
    // KiwiSaver: employers add 3% of wages for members.
    employerSuper: 0.03,
    health: { name: 'the public health system (Health NZ)', short: 'Health NZ', deductible: 0, coinsurance: 0.08, oopMax: ppp(1200) },
    // Working for Families: the Family Tax Credit, about NZ$7,000 for the eldest child, abated from NZ$42,700.
    childBenefit: { amount: ppp(7000), phaseOutFrom: ppp(42700), name: 'Working for Families' },
    terms: {
      'Federal government': 'Government', 'Federal income tax': 'Income tax', 'State income tax': 'Regional tax', 'Social Security': 'NZ Super',
      '401(k)': 'KiwiSaver', IRA: 'KiwiSaver', IRS: 'IRD', Medicaid: 'Health NZ', Medicare: 'Health NZ', 'GI Bill': 'Veterans\' Affairs education support',
      deductible: 'excess', Deductible: 'Excess', 'high school': 'secondary school', 'High School': 'Secondary School',
      'Commonwealth government': 'Government', 'Age Pension': 'NZ Super', super: 'KiwiSaver', ATO: 'IRD',
    },
    names: {
      male: ['Oliver', 'Noah', 'Jack', 'Leo', 'George', 'Luca', 'Arlo', 'Hunter', 'Nikau', 'Ari', 'Mason', 'Tama', 'Wiremu', 'Thomas', 'Lachlan', 'Sione'],
      female: ['Isla', 'Charlotte', 'Amelia', 'Olivia', 'Mia', 'Aria', 'Maia', 'Willow', 'Ivy', 'Harper', 'Manaia', 'Mere', 'Aroha', 'Grace', 'Ruby', 'Lupe'],
      last: ['Smith', 'Wilson', 'Williams', 'Brown', 'Taylor', 'Jones', 'Singh', 'Ngata', 'Walker', 'Thompson', 'Te Whare', 'Parata', 'Campbell', 'Tuilagi', 'Robinson', 'Wang'],
    },
    provinces: {
      'NZ-AUK': region('Auckland', { population: 'large', disasters: { flood: 0.05, hurricane: 0.03 } }),
      'NZ-WGN': region('Wellington', { disasters: { earthquake: 0.05, flood: 0.02 } }),
      'NZ-CAN': region('Canterbury', { disasters: { earthquake: 0.05, flood: 0.03, wildfire: 0.02 } }),
      'NZ-WKO': region('Waikato', { disasters: { flood: 0.04, earthquake: 0.02 } }),
      'NZ-OTA': region('Otago', { population: 'small', disasters: { flood: 0.03, blizzard: 0.03, earthquake: 0.02 } }),
      'NZ-GIS': region('Gisborne', { population: 'small', disasters: { flood: 0.06, earthquake: 0.02 } }),
      'NZ-WTC': region('West Coast', { population: 'small', disasters: { flood: 0.06, earthquake: 0.03 } }),
      'NZ-STL': region('Southland', { population: 'small', disasters: { flood: 0.04, blizzard: 0.03 } }),
      'NZ-MWT': region('Manawatū-Whanganui', { population: 'small', disasters: { flood: 0.05 } }),
      'NZ-BOP': region('Bay of Plenty', { population: 'small', disasters: { flood: 0.04, hurricane: 0.03, earthquake: 0.03 } }),
    },
    cities: {
      auckland: { name: 'Auckland', icon: '🗼', type: 'High-cost metro', state: 'NZ-AUK', col: 1.2, market: 0.88, locality: 0.22, transit: 50, fare: ppp(200), walkable: false, size: 'enterprise', population: [1700000, 1700000] },
      wellington: { name: 'Wellington', icon: '🏛️', type: 'Capital region', state: 'NZ-WGN', col: 1.1, market: 0.9, locality: 0.22, transit: 65, fare: ppp(180), walkable: true, size: 'medium', population: [215000, 440000] },
      christchurch: { name: 'Christchurch', icon: '⛪', type: 'Mid-size city', state: 'NZ-CAN', col: 1.0, market: 0.82, locality: 0.19, transit: 35, fare: ppp(120), walkable: false, size: 'large', population: [400000, 400000] },
      hamilton: { name: 'Hamilton, Waikato', icon: '🐄', type: 'Mid-size city', state: 'NZ-WKO', col: 0.95, market: 0.8, locality: 0.18, transit: 25, fare: ppp(100), walkable: false, size: 'medium', population: [185000, 185000] },
      tauranga: { name: 'Tauranga', icon: '🥝', type: 'Coastal metro', state: 'NZ-BOP', col: 1.05, market: 0.8, locality: 0.18, transit: 20, fare: ppp(100), walkable: false, size: 'medium', population: [160000, 160000] },
      dunedin: { name: 'Dunedin', icon: '🎓', type: 'Mid-size city', state: 'NZ-OTA', col: 0.92, market: 0.78, locality: 0.17, transit: 25, fare: ppp(90), walkable: true, size: 'medium', population: [135000, 135000] },
      queenstown: { name: 'Queenstown', icon: '⛷️', type: 'Small town', state: 'NZ-OTA', col: 1.25, market: 0.8, locality: 0.18, transit: 15, fare: ppp(80), walkable: true, size: 'small', population: [30000, 30000] },
      gisborne: { name: 'Gisborne', icon: '🌅', type: 'Rural', state: 'NZ-GIS', col: 0.85, market: 0.78, locality: 0.17, transit: 3, fare: 0, walkable: false, size: 'small', population: [38000, 52000] },
      westport: { name: 'Westport, West Coast', icon: '⛏️', type: 'Rural', state: 'NZ-WTC', col: 0.8, market: 0.78, locality: 0.17, transit: 0, fare: 0, walkable: true, size: 'small', population: [4700, 32000] },
      invercargill: { name: 'Invercargill', icon: '🐑', type: 'Small town', state: 'NZ-STL', col: 0.85, market: 0.8, locality: 0.17, transit: 8, fare: ppp(60), walkable: false, size: 'small', population: [57000, 103000] },
      whanganui: { name: 'Whanganui', icon: '🛶', type: 'Small town', state: 'NZ-MWT', col: 0.82, market: 0.78, locality: 0.17, transit: 8, fare: ppp(60), walkable: false, size: 'small', population: [48000, 48000] },
    },
    hometowns: ['auckland', 'auckland', 'auckland', 'wellington', 'christchurch', 'christchurch', 'hamilton', 'tauranga', 'dunedin', 'queenstown'],
    population: { 'NZ-AUK': 1.8e6, 'NZ-WGN': 0.55e6, 'NZ-CAN': 0.68e6, 'NZ-WKO': 0.52e6, 'NZ-OTA': 0.25e6, 'NZ-BOP': 0.35e6, 'NZ-GIS': 0.052e6, 'NZ-WTC': 0.032e6, 'NZ-STL': 0.1e6, 'NZ-MWT': 0.26e6 },
  },
  /** Elected offices (same shape as NationalOffices.js). */
  offices: {
    nz_mp: { country: 'NZ', name: 'Member of Parliament', icon: '🏛️', level: 4, term: 3, termLimit: 0, salary: 120000, minAge: 18, residency: 0, cost: 60000, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    nz_pm: { country: 'NZ', name: 'Prime Minister of New Zealand', icon: '🇳🇿', level: 5, term: 3, termLimit: 0, salary: 330000, minAge: 18, residency: 0, cost: 800000, requires: ['nz_mp'], leader: true, statewide: true, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true },
  },
  /** Names for people with immigrant-background names (see Diaspora.js). */
  communities: {
    pasifika: { male: ['Sione', 'Tevita', 'Ioane', 'Losa', 'Viliami', 'Fetu', 'Malakai'], female: ['Mele', 'Losana', 'Ana', 'Salote', 'Fiapaipai', 'Leilani', 'Sina'], last: ['Tuilagi', 'Fifita', 'Taufa', 'Leota', 'Faleolo', 'Vaifale', 'Tupou'] },
  },
  tables: {
    /* Law and money (CountryLaw.js) */
    JUSTICE: (b) => ({ ...b, jurorPay: ppp(62), jail: (city) => ({ Auckland: 'Mount Eden Corrections Facility', Wellington: 'Rimutaka Prison (remand)', Christchurch: 'Christchurch Men\'s Prison' }[city] ?? `${city} remand prison`), prison: 'a Corrections prison', legalAid: 'Public Defence Service lawyer', privatePrisons: 0.05 }),
    INSOLVENCY: (b) => ({ ...b, liquidation: { name: 'Bankruptcy (Insolvency and Trustee Service)', wait: 3, plan: 3 }, plan: { name: 'Debt Repayment Order', years: 3, wait: 2 }, creditYears: 4 }),
    INHERITANCE: { none: 'New Zealand has no inheritance, estate or gift tax.' },
    UNEMPLOYMENT: { name: 'Jobseeker Support', flat: ppp(19000), years: 1 },
    SEVERANCE: { perYear: 0 },
    DISABILITY: (b) => ({ ...b, name: 'Supported Living Payment', floor: ppp(22000), cap: ppp(22000) }),
    SELF_EMPLOYED: { name: 'ACC levy (self-employed)', rate: 0.0167 },
    CREDIT: { name: 'credit score (Centrix)' },
    SMALL_BIZ_LOAN: 'bank business loan (with a Regional Business Partner grant)',
    VETERANS: { orgs: ['Royal New Zealand Returned and Services\' Association (RSA)', 'No Duff Charitable Trust'], care: 'Veterans\' Affairs New Zealand' },
    STOCK_INDEX: 'NZX 50',
    MORTGAGES: {
      // No stamp duty; banks lend to 80% (LVR rules) except Kāinga Ora's First Home Loans.
      closing: 0.01, stress: 0.02,
      products: {
        fix1: { name: '1-yr fixed (30-yr)', years: 30, rateAdj: -0.004, minDown: 0.2, minScore: 600, maxDti: 0.4, arm: true, reset: 1 },
        fix2: { name: '2-yr fixed (30-yr)', years: 30, rateAdj: -0.005, minDown: 0.2, minScore: 600, maxDti: 0.4, arm: true, reset: 2 },
        firstHome: { name: 'First Home Loan (Kāinga Ora, 5% deposit)', years: 30, rateAdj: 0, minDown: 0.05, minScore: 580, maxDti: 0.4, arm: true, reset: 1 },
      },
    },
    UNIONS: { police: 'NZ Police Association', fire: 'NZ Professional Firefighters Union', ems: 'First Union (ambulance)', health: 'NZ Nurses Organisation', education: 'NZEI Te Riu Roa', public: 'Public Service Association (PSA)', prisons: 'Corrections Association of NZ', transport: 'First Union (transport)', rail: 'Rail and Maritime Transport Union', aviation: 'E tū (aviation)', pilots: 'NZ Air Line Pilots\' Association', trades: 'E tū (construction)', industry: 'E tū', retail: 'First Union', hospitality: 'Unite Union', services: 'E tū', media: 'E tū (media)', tech: 'PSA (technology)', arts: 'Equity New Zealand', postal: 'E tū (postal)' },
    CADETS: { jrotc: 'New Zealand Cadet Corps', seaCadets: 'Sea Cadet Corps' },
    FOREIGN_SERVICE_EXAM: 'MFAT Graduate Policy Programme assessment',
    PROSECUTORS: ['Crown Solicitor\'s Office', 'Public Defence Service', 'Community Probation'],
    VOLUNTEER_RANKS: { fire: ['Recruit Firefighter (Volunteer)', 'Firefighter', 'Qualified Firefighter', 'Senior Firefighter', 'Station Officer', 'Deputy Chief Fire Officer', 'Chief Fire Officer'], sar: ['Trainee', 'Field Team Member', 'Senior Field Member', 'Team Leader', 'Deputy Group Leader', 'Group Leader', 'Regional Coordinator'], auxiliary: ['Trainee Crew', 'Crew Member', 'Skipper', 'Unit President', 'Regional Operations Manager'] },
    VOLUNTEER_SERVICES: { fire: 'Volunteer Fire Brigade (FENZ)', police: null, sar: 'LandSAR', ambulance: 'Hato Hone St John volunteer crew', wildland: 'FENZ rural fire crew', auxiliary: 'Coastguard New Zealand', cap: null, cert: 'Civil Defence Emergency Management', redcross: 'New Zealand Red Cross', skiPatrol: 'Ski Patrol', mrc: null },
    NATIONAL_SERVICE: { overseas: 'Volunteer Service Abroad (VSA)', domestic: null },
    ACCOUNTS: { dc: 'KiwiSaver', roth: { name: 'Managed fund (PIE)', limit: ppp(60000) }, traditional: { name: 'KiwiSaver (voluntary contributions)', limit: ppp(20000) } },
    REFERENDUMS: {
      fourYearTerm: { name: 'Referendum on a four-year parliamentary term', icon: '📜', support: 0.45, effects: { services: 1 }, pitch: 'Elect Parliament every four years instead of three.' },
      maoriWards: { name: 'Poll on Māori wards for the council', icon: '🏛️', support: 0.45, effects: { services: 1 }, pitch: 'Keep (or create) council seats elected from the Māori roll.' },
    },
    ENTRANCE_EXAMS: { name: 'NCEA Level 3 (University Entrance)', prep: { name: 'private tutoring', cost: ppp(2500) }, weight: 0.6 },
    AVIATION_AUTHORITY: 'CAA NZ',
    COUNTY: 'District',
    LONG_TERM_CARE: { name: 'subsidised residential care (asset-tested)', covers: 0.6, safetyNet: 'Health NZ' },
    WORKPLACE: { equality: 'Human Rights Commission (then the Human Rights Review Tribunal)', reservist: 'the Volunteers Employment Protection Act', labourBoard: 'the Employment Relations Authority' },
    EQUIPMENT: (b) => ({ ...b, HMMWV: 'Pinzgauer', JLTV: 'Bushmaster', 'M2 Bradley': 'NZLAV', Stryker: 'NZLAV', 'F-16': 'P-8A Poseidon', 'C-130J': 'C-130J-30 Hercules' }),
    LOCAL_ENTITIES: { sole: 'Sole trader', llc: null, ccorp: 'Limited company (Ltd)' },
    PRIVATE_TITLES: { 'Vice President': 'General Manager', 'Senior Director': 'Head of' },

    /* Schools and credentials (Education.js) */
    EDUCATION: (b) => ({
      ...b,
      // Domestic degree fees about NZ$8,000 a year (the first year free); interest-free student loans repaid at 12% over NZ$24,128.
      tuition: { community: ppp(5000), technical: ppp(5000), online: ppp(6000), state: ppp(8000), private: ppp(20000), elite: ppp(9000) },
      loanThreshold: ppp(24128), loanRate: 0.12,
      schools: { community: 'Te Pūkenga polytechnic', technical: 'Unitec Institute of Technology', online: 'Open Polytechnic', state: 'University of Waikato', private: 'a private training establishment', elite: 'University of Auckland', academy: 'Officer Cadet School, Waiouru' },
      words: { 'high-school diploma': 'NCEA Level 3', GED: 'New Zealand Certificate in Study and Career Preparation' },
      licenses: {
        ...b.licenses,
        'State Bar License': 'Admission as a Barrister and Solicitor of the High Court', 'Medical License (MD)': 'Medical Council of NZ registration', 'Board Certification': 'Vocational registration (FRACP/FRACS)',
        'Peace Officer (POST Basic Academy)': 'Royal New Zealand Police College recruit wing', 'Registered Nurse (RN)': 'Nursing Council registered nurse',
        'Commercial Driver License (Class A)': 'Class 5 heavy combination licence', 'Commercial Driver License (Class B)': 'Class 4 heavy rigid licence', 'Driver\'s License (Class D)': 'Full licence (Class 1)', 'Learner\'s Permit': 'Learner licence (L plates)',
        'EMT (NREMT)': 'Emergency Medical Technician (Hato Hone St John)', 'Paramedic (NRP)': 'Paramedic Council registered paramedic', 'Pharmacist License (NAPLEX + MPJE)': 'Pharmacy Council registered pharmacist',
      },
    }),
    SHORT_CYCLE: 'New Zealand Diploma (Level 5–6)',
    CREDENTIAL_LOCAL: { 'Driving licence (car)': 'Full driver licence (Class 1)', 'Heavy goods vehicle licence (articulated)': 'Class 5 licence', 'Heavy goods vehicle licence (rigid)': 'Class 4 licence', 'Construction site safety card': 'Site Safe passport', 'Responsible alcohol service certificate': 'Licensed Controller Qualification', 'Forklift operator licence': 'F endorsement (forklift)' },
    PROFESSIONAL_DEGREES: { jd: 'LLB (Bachelor of Laws)', md: 'MB ChB (Bachelor of Medicine and Surgery)' },
    UNDERGRAD_ENTRY: { jd: 4, md: 6 },
    APPRENTICESHIP_SYSTEMS: { name: 'New Zealand Apprenticeship', years: 4, pay: ppp(48000), exam: 'New Zealand Certificate (Level 4) in the trade' },

    /* Moving here (Immigration.js, Migration.js, Nationality.js, FamilyAbroad.js) */
    WORKING_HOLIDAY: { name: 'Working Holiday Visa', odds: 0.92, years: 1, fee: 300, once: true, partners: { GB: 35, IE: 30, CA: 35, FR: 30, IT: 30, DE: 30, JP: 30, KR: 30, US: 30 } },
    IMMIGRATION: (b) => ({
      ...b,
      visas: {
        work: { name: 'Accredited Employer Work Visa', odds: 0.75, years: 5, degree: true, fee: 1100 },
        transfer: { name: 'Specific Purpose Work Visa (intra-company)', odds: 0.9, years: 3, fee: 1100 },
        student: { name: 'Fee Paying Student Visa', odds: 0.8, years: 4, postStudy: 3, fee: 520 },
        family: { name: 'Partner of a New Zealander Resident Visa', odds: 0.85, years: 2, fee: 2000 },
      },
      pr: { name: 'Resident Visa (Skilled Migrant Category)', years: 2, fee: 3000 },
      nat: { years: 5, needsPR: true, fromArrival: false, prMin: 5, fee: 330 },
      prLapse: 10,
      intlTuition: { mult: 3.5 },
    }),
    ASYLUM: { name: 'Refugee and protection status claim', odds: 0.45, decision: 2, workAfter: 0.5, prYears: 0, support: 0 },
    LICENCE_EXCHANGE: ['AU', 'GB', 'IE', 'CA', 'US', 'DE', 'FR', 'IT', 'JP', 'KR'],
    PEERS: ['AU', 'GB', 'IE', 'CA'],
    OVERSTAY_BAN: 5,
    BIRTH_REGISTRATION: { name: 'citizenship by descent registration', fee: 150, deadline: false, oneGeneration: true },
    PARENT_VISAS: { name: 'Parent Resident Visa (ballot)', needs: 'resident', odds: 0.3, wait: 3, fee: 4000 },
    DIASPORA: { share: 0.29, from: [['GB', 3], ['pasifika', 3], ['chinese', 2], ['IN', 2], ['PH', 1], ['AU', 1]] },

    /* Government and politics */
    LEGISLATURES: {
      lower: { name: 'House of Representatives', seats: 123, presiding: 'Speaker of the House', office: 'nz_mp' },
      exec: 'Prime Minister', execOffice: 'nz_pm', veto: false,
    },
    PARTY_NAMES: { labor: 'New Zealand Labour Party', business: 'New Zealand National Party' },
    CORPORATE_RATE: 0.28,
    HEALTH_SYSTEMS: { wait: 8, waitName: 'public hospital waiting list', private: { name: 'Private health insurance (Southern Cross)', premium: ppp(2200), skipsWait: true } },
    PUBLIC_LABOUR: { noStrike: ['police'], association: [] },
    AGENCIES: {
      fbi: { name: 'National Organised Crime Group (NZ Police)', employers: ['NOCG — Auckland', 'NOCG — Wellington'], titles: { trainee: 'Detective (probationary)', agent: 'Detective', senior: 'Detective Sergeant', ssa: 'Detective Senior Sergeant', asac: 'Detective Inspector', sac: 'Detective Superintendent' } },
      usss: { name: 'Diplomatic Protection Squad', employers: ['NZ Police — Diplomatic Protection Squad'] },
      borderPatrol: { name: 'New Zealand Customs Service', employers: ['Customs — Auckland Airport', 'Customs — Ports of Auckland'] },
      tsa: { name: 'Aviation Security Service (AvSec)', employers: ['AvSec — Auckland Airport'] },
      postal: { name: 'NZ Post', employers: ['NZ Post — Delivery Branch'] },
      benefitsClaims: { name: 'Work and Income (MSD)', employers: ['Work and Income Service Centre'] },
      caseOfficer: null,
      sigint: { name: 'Government Communications Security Bureau (GCSB)', employers: ['GCSB — Pipitea House'] },
      intelligence: { name: 'NZ Security Intelligence Service (NZSIS)', employers: ['NZSIS — Pipitea House'] },
      meteorology: { name: 'MetService', employers: ['MetService — Wellington'] },
      regulatory: { name: 'Financial Regulation (FMA · Reserve Bank · IRD)', employers: ['Financial Markets Authority', 'Reserve Bank of New Zealand', 'Inland Revenue'] },
      foreignService: { name: 'Ministry of Foreign Affairs and Trade', employers: ['MFAT — Wellington'] },
      parkService: { name: 'Department of Conservation Ranger', employers: ['Fiordland National Park', 'Tongariro National Park'] },
      airTrafficControl: { name: 'Airways New Zealand ATC', employers: ['Airways — Christchurch Radar Centre'] },
      nationalLab: { name: 'Crown Research Institutes', employers: ['GNS Science', 'NIWA'] },
      oig: { name: 'Office of the Auditor-General', employers: ['Office of the Auditor-General'] },
    },
    LOCAL_AGENCIES: (b) => ({
      ...b,
      education: { name: 'State Schools', employer: (city) => `${city} state school (Board of Trustees)`, titles: { sub: 'Relief Teacher', teacher: 'Teacher', senior: 'Experienced Classroom Teacher', coach: 'Specialist Classroom Teacher', specialist: 'Kāhui Ako Teacher', chair: 'Head of Department', ap: 'Deputy Principal', principal: 'Principal', director: 'Education Review Officer', assistantSuper: 'Regional Director of Education', ...cmd('superintendent', ['Deputy Secretary for Education', 'Chief Review Officer'], 'Secretary for Education') } },
      municipalAdmin: { ...b.municipalAdmin, employer: (city) => (city === 'Auckland' ? 'Auckland Council' : `${city.split(',')[0]} City Council`) },
      revenue: null, stateFire: null,
      gameWarden: { name: 'Fishery Officers', employer: () => 'Fisheries New Zealand', titles: { cadet: 'Trainee Fishery Officer', warden: 'Fishery Officer', investigator: 'Fisheries Investigator', chief: 'Director of Compliance' } },
      statePolice: {
        name: 'New Zealand Police', citizensOnly: false, employer: () => 'New Zealand Police',
        titles: { cadet: 'Recruit (Royal New Zealand Police College)', trooper: 'Constable', senior: 'Senior Constable', investigator: 'Detective Constable', majorCrimes: 'Detective', detSergeant: 'Detective Sergeant', detLieutenant: 'Detective Senior Sergeant', detCaptain: 'Detective Inspector', sergeant: 'Sergeant', lieutenant: 'Senior Sergeant', captain: 'Inspector', major: 'Superintendent', ...cmd('superintendent', ['District Commander', 'Assistant Commissioner', 'Deputy Commissioner', 'Deputy Commissioner (Operations)'], 'Commissioner of Police') },
      },
      corrections: { name: 'Department of Corrections', employer: () => 'Ara Poutama Aotearoa (Department of Corrections)' },
      fire: {
        name: 'Fire and Emergency New Zealand', employer: () => 'Fire and Emergency New Zealand',
        titles: { recruit: 'Recruit Firefighter', firefighter: 'Firefighter', engineer: 'Qualified Firefighter', inspector: 'Fire Risk Management Officer', investigator: 'Fire Investigator', lieutenant: 'Senior Firefighter', captain: 'Station Officer', battalion: 'Senior Station Officer', deputyChief: 'District Manager', ...cmd('chief', ['Region Manager', 'Deputy National Commander', 'National Commander'], 'Chief Executive, FENZ') },
      },
      ems: {
        ...b.ems, name: 'Ambulance Service', employer: (city) => (city === 'Wellington' ? 'Wellington Free Ambulance' : 'Hato Hone St John'),
        titles: { emt: 'Emergency Medical Technician', paramedic: 'Paramedic', criticalCare: 'Intensive Care Paramedic', flight: 'Flight Intensive Care Paramedic', fto: 'Clinical Support Officer', supervisor: 'Station Manager', captain: 'Area Operations Manager', deputy: 'District Operations Manager', ...cmd('chief', ['Regional Operations Manager', 'Deputy Chief Executive, Operations', 'Director of Ambulance Operations'], 'Chief Executive') },
      },
      dispatch: { name: '111 Communications Centre', employer: (city) => `${['Auckland', 'Wellington'].includes(city) ? city : 'Southern'} 111 Communications Centre`, titles: { trainee: 'Trainee Communicator', telecommunicator: '111 Call Taker', senior: 'Dispatcher', training: 'Communications Trainer', supervisor: 'Shift Commander', director: 'National Manager, Emergency Communications' } },
      prosecution: { name: 'Crown Prosecution', employer: (city) => `Crown Solicitor's Office, ${city.split(',')[0]}`, titles: { clerk: 'Law Clerk', ada: 'Crown Counsel', senior: 'Senior Crown Counsel', trial: 'Crown Prosecutor', chiefDeputy: 'Deputy Solicitor-General', first: 'Solicitor-General' } },
    }),
    POLICE_UNITS: { swat: 'Armed Offenders Squad', k9: 'Police Dog Section', traffic: 'Road Policing', ia: 'Professional Conduct', protection: 'Diplomatic Protection Squad', negotiator: 'Police Negotiation Team' },
    POLICE_BUREAUS: { homicide: 'Criminal Investigation Branch (homicide)', svu: 'Child Protection & Adult Sexual Assault Team', property: 'Tactical Crime Unit', robbery: 'Organised Crime Unit', cyber: 'National Cybercrime Unit' },
    VOLUNTEER_MEDAL: 'Volunteer Service Award (Volunteering New Zealand)',

    /* Armed forces (NationalForces.js, MilitaryLocal.js, War.js, Honours.js) */
    FORCES: {
      pay: 0.82, exposure: 0.4,
      branches: {
        army: { name: 'New Zealand Army', icon: '🥝', motto: 'Ngāti Tūmatauenga', basic: 'the Army Depot, Waiouru Military Camp', officerSchool: 'Officer Cadet School, Waiouru', enlisted: ARMY_ENLISTED, officer: ARMY_OFFICERS },
        navy: { name: 'Royal New Zealand Navy', icon: '⚓', motto: 'Ready to serve', basic: 'Basic Common Training at HMNZS Philomel, Devonport', officerSchool: 'Junior Officer Common Training, HMNZS Philomel',
          enlisted: ['Ordinary Rate', 'Able Rate', 'Leading Rate', 'Petty Officer', 'Chief Petty Officer', 'Warrant Officer', 'Warrant Officer (Command)', 'Warrant Officer (Fleet)', 'Warrant Officer of the Navy'],
          officer: ['Midshipman', 'Ensign', 'Sub-Lieutenant', 'Lieutenant', 'Lieutenant Commander', 'Commander', 'Captain', 'Commodore', 'Rear Admiral', 'Vice Admiral'] },
        airforce: { name: 'Royal New Zealand Air Force', icon: '✈️', motto: 'Per ardua ad astra', basic: 'the Recruit Course at RNZAF Base Woodbourne', officerSchool: 'Command and Recruit Training Squadron, RNZAF Base Woodbourne',
          enlisted: ['Aircraftman', 'Leading Aircraftman', 'Corporal', 'Sergeant', 'Flight Sergeant', 'Warrant Officer', 'Warrant Officer (Base)', 'Warrant Officer (Command)', 'Warrant Officer of the Air Force'],
          officer: ['Pilot Officer', 'Flying Officer', 'Flight Lieutenant', 'Squadron Leader', 'Wing Commander', 'Group Captain', 'Air Commodore', 'Air Vice-Marshal', 'Air Marshal', 'Air Chief Marshal'] },
        guard: { name: 'Army Reserve', icon: '🛡️', motto: 'Ngāti Tūmatauenga', basic: 'Reserve recruit training at Waiouru', officerSchool: 'Officer Cadet School (Reserve)', enlisted: ARMY_ENLISTED, officer: ARMY_OFFICERS },
      },
      bases: {
        army: [['christchurch', 'Burnham Military Camp'], ['wellington', 'Trentham Military Camp'], ['auckland', 'Papakura Military Camp'], ['hamilton', 'Waiouru Military Camp'], ['whanganui', 'Linton Military Camp'], ['invercargill', 'Tekapo Military Training Area']],
        navy: [['auckland', 'Devonport Naval Base (HMNZS Philomel)']],
        airforce: [['auckland', 'RNZAF Base Auckland (Whenuapai)'], ['wellington', 'RNZAF Base Ohakea']],
      },
      overseas: {
        army: [['Egypt (Sinai)', 'Multinational Force and Observers', 1, false], ['Middle East', 'UN Truce Supervision Organization', 1, false], ['South Korea', 'UN Command', 1, false]],
        navy: [['Middle East', 'Combined Maritime Forces', 1, false], ['Antarctica', 'Operation Antarctica support', 1, false]],
        airforce: [['Middle East', 'Maritime patrol detachment', 1, false], ['Antarctica', 'Operation Antarctica airlift', 1, false]],
      },
    },
    MIL_SPECIAL: (b) => ({
      ...b,
      drill: { names: { army: 'Section Commander, Army Depot', navy: 'Recruit Instructor', airforce: 'Recruit Instructor' }, places: { army: 'Waiouru Military Camp', navy: 'HMNZS Philomel', airforce: 'RNZAF Base Woodbourne' } },
      recruiter: { names: 'Defence Force Recruiting military adviser' },
      honorGuard: { names: 'the New Zealand Defence Force Guard of Honour', desc: 'State occasions, Anzac Day at Pukeahu and the welcome of visiting leaders.' },
      rotc: { names: { army: 'Instructor, Officer Cadet School' }, desc: 'Train officer cadets.' },
      joint: { names: 'Staff Officer, Headquarters Joint Forces New Zealand (Trentham)' },
      fellow: { names: 'Defence Fellow, Victoria University of Wellington' },
      commissioning: 'Commissioning from the ranks',
      chiefs: { army: 'Chief of Army', navy: 'Chief of Navy', airforce: 'Chief of Air Force' },
      chairman: 'Chief of Defence Force',
    }),
    PME: { enlisted: ['Junior NCO Course', 'Senior NCO Course', 'Warrant Officer Course', 'RSM Designate Course', 'Senior Leadership Course'], officer: ['Junior Staff Course', 'Command and Staff College (Trentham)', 'Australian Defence and Strategic Studies Course'] },
    QUALS: { airborne: 'Basic Parachute Course (RNZAF Whenuapai)', rangerSchool: 'Combat Leadership Course', dli: 'Defence language training' },
    SOF: {
      ranger: sf('1st New Zealand Special Air Service Regiment', 'NZSAS selection', '1 NZSAS Regiment, Rennie Lines (Papakura)', 'sand beret', 'New Zealand\'s special forces: counter-terrorism at home, reconnaissance abroad.', ['a counter-terrorism standby in Auckland', 'a special operations task group in the Middle East']),
      seal: sf('Navy Diver', 'the Navy Diver course at HMNZS Philomel', 'Littoral Warfare Unit, Devonport', 'Navy diver badge', 'Mine clearance, salvage and maritime special operations.', ['a mine-clearance task overseas', 'a Pacific disaster-relief dive team']),
    },
    MIL_UNITS: { ground: ['1st Battalion, Royal New Zealand Infantry Regiment', '2nd/1st Battalion, Royal New Zealand Infantry Regiment', 'Queen Alexandra\'s Mounted Rifles', '2nd Combat Engineer Regiment'], naval: ['HMNZS Te Kaha', 'HMNZS Te Mana', 'HMNZS Canterbury', 'HMNZS Aotearoa'], air: ['No. 5 Squadron', 'No. 40 Squadron', 'No. 3 Squadron'] },
    MIL_SUMMARY: 'a summary trial',
    SERVICE_TERMS: { maxYears: { enlisted: 40, officer: 40 }, ages: { enlisted: 60, officer: 60, flag: 60 }, join: { enlisted: [17, 49], officer: [17, 49] }, name: 'period of service' },
    MILITARY_JUSTICE: { code: 'the Armed Forces Discipline Act 1971', court: 'Court Martial of New Zealand', prison: 'the Services Corrective Establishment, Burnham', counsel: 'Defence legal officer' },
    VETTING: { form: 'NZSIS security vetting questionnaire', publicTrust: 'Confidential clearance', secret: 'Secret clearance', topSecret: 'Top Secret Special clearance' },
    CAMPUS: { army: 'Defence Force Scholarship (Army)', navy: 'Defence Force Scholarship (Navy)', airforce: 'Defence Force Scholarship (Air Force)', obligation: true },
    ACADEMY_NAMES: { army: 'Officer Cadet School, Waiouru', navy: 'Junior Officer Common Training (HMNZS Philomel)', airforce: 'Officer Training (RNZAF Base Woodbourne)' },
    THEATERS: [
      { id: 'peacekeeping', name: 'a UN peacekeeping mission that turned into combat', adversary: 'militias', intensity: 1, home: 0, weight: 22 },
      { id: 'coalitionAir', name: 'a coalition mission in the Middle East', adversary: 'an armed movement', intensity: 1, home: 0, weight: 18 },
      { id: 'pacific', name: 'a Pacific stabilisation mission', adversary: 'armed factions', intensity: 1, home: 0, weight: 20 },
    ],
    WAR_START_CHANCE: 0.006,
    MEDALS: {
      moh: { name: 'Victoria Cross for New Zealand', ribbon: [['#8b0a1d', 1]] }, serviceCross: { name: 'New Zealand Gallantry Star' }, silverStar: { name: 'New Zealand Gallantry Decoration' },
      dsm: { name: 'New Zealand Distinguished Service Decoration' }, legionOfMerit: { name: 'Member of the New Zealand Order of Merit (Military)' }, bronzeStar: { name: 'New Zealand Gallantry Medal' },
      purpleHeart: null, msm: { name: 'New Zealand Meritorious Service Medal' }, commendation: { name: 'Chief of Defence Force Commendation' }, achievement: { name: 'Commander\'s Commendation' },
      combatAction: null, goodConduct: { name: 'New Zealand Armed Forces Award' }, humanitarian: { name: 'New Zealand Special Service Medal' }, expeditionary: { name: 'New Zealand Operational Service Medal' }, ndsm: { name: 'New Zealand Defence Service Medal' },
    },
    ORDERS: {
      minAge: 30,
      tiers: [
        { id: 'qsm', name: 'King\'s Service Medal (KSM)', min: 30, ribbon: [['#b5272d', 1], ['#fff', 1], ['#b5272d', 1]] },
        { id: 'mnzm', name: 'Member of the New Zealand Order of Merit (MNZM)', min: 45, ribbon: [['#b5272d', 1]] },
        { id: 'onzm', name: 'Officer of the New Zealand Order of Merit (ONZM)', min: 75, ribbon: [['#b5272d', 1]] },
        { id: 'cnzm', name: 'Companion of the New Zealand Order of Merit (CNZM)', min: 115, ribbon: [['#b5272d', 1]] },
        { id: 'knzm', name: { male: 'Knight Companion of the New Zealand Order of Merit (KNZM)', female: 'Dame Companion of the New Zealand Order of Merit (DNZM)' }, prefix: { male: 'Sir', female: 'Dame' }, min: 165, ribbon: [['#b5272d', 1], ['#ffd100', 1], ['#b5272d', 1]] },
        { id: 'onz', name: 'Member of the Order of New Zealand (ONZ)', min: 230, ribbon: [['#b5272d', 1], ['#fff', 1], ['#ffd100', 1]] },
      ],
    },
  },
};
