/**
 * South Africa, built on Australia: nine provinces with premiers and
 * legislatures, a National Assembly that elects the President, one national
 * police service (SAPS) alongside metro police in the big cities, municipal
 * fire services and provincial EMS, paramedics trained through a degree
 * (Bachelor of Emergency Medical Care), means-tested social grants instead of
 * a contributory state pension, the GEPF for public servants, and the SANDF
 * on peace missions in the region.
 *
 * Amounts are rand converted at 2023 PPP (R7.4 per US$), 2025/26 rates.
 * See docs/ADDING-A-COUNTRY.md for the shape of a pack.
 */

const ZAR = 7.4;
const ppp = (local) => Math.round(local / ZAR);
const cmd = (top, steps, head) => ({ ...Object.fromEntries(steps.map((t, i) => [`${top}_cmd${i + 1}`, t])), [top]: head });
const sf = (name, course, unitName, badge, desc, deployments) => ({ name, course, unitName, badge, desc, deployments });
const R = (...colors) => colors.map((c) => [c, 1]);
const province = (name, extra = {}) => ({ name, incomeTax: [], propertyTax: 0.008, salesTax: 0.15, rightToWork: false, cannabis: true, dui: { fineMult: 1.2, suspendYears: 1 }, minWage: ppp(28.79), population: 'large', disasters: { flood: 0.03, wildfire: 0.03 }, ...extra });
const ENLISTED = ['Private', 'Lance Corporal', 'Corporal', 'Sergeant', 'Staff Sergeant', 'Warrant Officer Class 2', 'Warrant Officer Class 1', 'Senior Chief Warrant Officer', 'Master Chief Warrant Officer'];
const OFFICERS = ['Second Lieutenant', 'Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier General', 'Major General', 'Lieutenant General', 'General'];
const town = (c) => c.split(',')[0];
const only = (mine) => (b) => ({ ...Object.fromEntries(Object.keys(b ?? {}).map((k) => [k, null])), ...mine });
/** The metropolitan municipality and its own police and fire service. */
const METRO = { Johannesburg: 'City of Johannesburg', Pretoria: 'City of Tshwane', 'Cape Town': 'City of Cape Town', Durban: 'eThekwini', Gqeberha: 'Nelson Mandela Bay', Bloemfontein: 'Mangaung' };
const metro = (c) => METRO[town(c)] ?? `${town(c)} Local Municipality`;

export const ZA = {
  id: 'ZA',
  basedOn: 'AU',
  groups: ['COMMON_LAW'],
  agreements: [],
  licenceExchange: [],
  peers: [],
  country: {
    name: 'South Africa',
    flag: '🇿🇦',
    demonym: 'South African',
    capital: 'Pretoria',
    currency: { code: 'ZAR', symbol: 'R', perUsd: ZAR },
    languages: ['English', 'isiZulu', 'isiXhosa', 'Afrikaans'],
    emergency: '10111 / 10177 / 112',
    retirementAge: 60,
    informality: 0.3,
    tax: {
      // 2025/26: the primary rebate makes the first R95,750 tax-free; then 18% to 45%.
      allowance: ppp(95750),
      brackets: [[ppp(141350), 0.18], [ppp(133400), 0.26], [ppp(142300), 0.31], [ppp(160200), 0.36], [ppp(184900), 0.39], [ppp(959100), 0.41], [Infinity, 0.45]],
      contributions: [{ name: 'UIF', rate: 0.01, from: 0, to: ppp(212544) }],
      label: 'SARS',
    },
    // The Older Person's Grant (means-tested, from 60): about R2,315 a month.
    pension: { kind: 'flat', name: 'Older Person\'s Grant (SASSA)', full: ppp(27780), years: 1, minYears: 0, ages: [60, 60] },
    health: { name: 'the public health system', short: 'public health', deductible: 0, coinsurance: 0.05, oopMax: ppp(5000) },
    childBenefit: { amount: ppp(6720), phaseOutFrom: ppp(63600), name: 'Child Support Grant (SASSA)' },
    terms: {
      'Federal government': 'National Government', 'State government': 'Provincial Government', 'Federal income tax': 'Income tax', 'State income tax': 'Income tax',
      'Social Security': 'SASSA', '401(k)': 'retirement fund', IRA: 'retirement annuity', IRS: 'SARS', Medicaid: 'the public health system', Medicare: 'the public health system', 'GI Bill': 'Military Skills Development support',
      'Age Pension': 'Older Person\'s Grant', Centrelink: 'SASSA', ATO: 'SARS', superannuation: 'retirement fund', Superannuation: 'Retirement fund', super: 'retirement fund',
    },
    names: {
      male: ['Thabo', 'Sipho', 'Lwazi', 'Bongani', 'Mandla', 'Kagiso', 'Tshepo', 'Johan', 'Pieter', 'Liam', 'Ethan', 'Mohammed', 'Junaid', 'Themba', 'Lethabo', 'Musa'],
      female: ['Thandiwe', 'Nomvula', 'Lerato', 'Zanele', 'Ayanda', 'Palesa', 'Naledi', 'Karabo', 'Anika', 'Chantelle', 'Megan', 'Fatima', 'Precious', 'Nokuthula', 'Busisiwe', 'Amahle'],
      last: ['Dlamini', 'Nkosi', 'Ndlovu', 'Khumalo', 'Mokoena', 'Mahlangu', 'Botha', 'van der Merwe', 'Pretorius', 'Naidoo', 'Pillay', 'Smith', 'Mthembu', 'Zulu', 'Sithole', 'Molefe'],
    },
    provinces: {
      'ZA-GP': province('Gauteng', { population: 'mega' }),
      'ZA-WC': province('Western Cape', { population: 'enterprise', disasters: { wildfire: 0.06, flood: 0.03 } }),
      'ZA-KZN': province('KwaZulu-Natal', { population: 'enterprise', disasters: { flood: 0.07 } }),
      'ZA-EC': province('Eastern Cape', { disasters: { flood: 0.04, wildfire: 0.03 } }),
      'ZA-FS': province('Free State', { population: 'medium' }),
    },
    cities: {
      johannesburg: { name: 'Johannesburg', icon: '🏙️', type: 'Major metro', state: 'ZA-GP', col: 0.85, market: 0.65, locality: 0.16, transit: 30, fare: ppp(12000), walkable: false, size: 'enterprise', population: [5600000, 10000000] },
      pretoria: { name: 'Pretoria', icon: '🏛️', type: 'Capital region', state: 'ZA-GP', col: 0.8, market: 0.6, locality: 0.15, transit: 20, fare: ppp(10000), walkable: false, size: 'enterprise', population: [3300000, 3300000] },
      capetown: { name: 'Cape Town', icon: '⛰️', type: 'High-cost metro', state: 'ZA-WC', col: 0.95, market: 0.8, locality: 0.18, transit: 30, fare: ppp(12000), walkable: true, size: 'enterprise', population: [4800000, 4800000] },
      durban: { name: 'Durban', icon: '🏖️', type: 'Coastal metro', state: 'ZA-KZN', col: 0.75, market: 0.55, locality: 0.14, transit: 20, fare: ppp(9000), walkable: true, size: 'large', population: [4000000, 4000000] },
      gqeberha: { name: 'Gqeberha', icon: '🌊', type: 'Coastal metro', state: 'ZA-EC', col: 0.65, market: 0.45, locality: 0.12, transit: 15, fare: ppp(8000), walkable: false, size: 'large', population: [1200000, 1200000] },
      bloemfontein: { name: 'Bloemfontein', icon: '🌹', type: 'Mid-size city', state: 'ZA-FS', col: 0.6, market: 0.42, locality: 0.12, transit: 10, fare: ppp(7000), walkable: false, size: 'medium', population: [800000, 800000] },
    },
    hometowns: ['johannesburg', 'johannesburg', 'pretoria', 'capetown', 'capetown', 'durban', 'durban', 'gqeberha', 'bloemfontein'],
    population: { 'ZA-GP': 16e6, 'ZA-WC': 7.4e6, 'ZA-KZN': 12.4e6, 'ZA-EC': 7.2e6, 'ZA-FS': 2.9e6 },
  },
  offices: {
    za_mpl: { country: 'ZA', name: 'Member of the Provincial Legislature', icon: '🏛️', level: 3, term: 5, termLimit: 0, salary: 160000, minAge: 18, residency: 0, cost: 30000, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    za_premier: { country: 'ZA', name: 'Premier', icon: '⭐', level: 4, term: 5, termLimit: 2, salary: 260000, minAge: 18, residency: 0, cost: 300000, requires: ['za_mpl'], leader: true, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true },
    za_mp: { country: 'ZA', name: 'Member of the National Assembly', icon: '🏛️', level: 4, term: 5, termLimit: 0, salary: 180000, minAge: 18, residency: 0, cost: 60000, statewide: true, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    za_ncop: { country: 'ZA', name: 'Delegate to the National Council of Provinces', icon: '🏛️', level: 4, term: 5, termLimit: 0, salary: 180000, minAge: 18, residency: 0, cost: 60000, requires: ['za_mpl'], fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    za_president: { country: 'ZA', name: 'President of South Africa', icon: '🇿🇦', level: 5, term: 5, termLimit: 2, salary: 450000, minAge: 18, residency: 0, cost: 2000000, requires: ['za_mp'], leader: true, statewide: true, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true },
  },
  tables: {
    /* Law and money */
    JUSTICE: { trial: 'bench', sentence: 1, jail: (c) => `${town(c)} Correctional Centre (remand)`, prison: 'a correctional centre (Department of Correctional Services)', legalAid: 'a Legal Aid South Africa attorney', privatePrisons: 0.05 },
    INSOLVENCY: { liquidation: { name: 'Sequestration (Insolvency Act)', wait: 4 }, plan: { name: 'Debt review (National Credit Act)', years: 5, wait: 2 }, homestead: 0, wildcard: ppp(50000), creditYears: 5 },
    // Estate duty: 20% above the R3.5 million abatement (25% above R30 million).
    INHERITANCE: { name: 'Estate duty (SARS)', exemption: ppp(3500000), brackets: [[ppp(26500000), 0.2], [Infinity, 0.25]] },
    UNEMPLOYMENT: { name: 'UIF unemployment benefit', rate: 0.5, cap: ppp(110000), years: 0.6 },
    SEVERANCE: { perYear: 1 / 52, base: 0 },
    DISABILITY: { name: 'Disability Grant (SASSA)', rate: 0, floor: ppp(27780), cap: ppp(27780), minYears: 0, odds: 0.9, stages: ['SASSA medical assessment', 'Reconsideration', 'Independent Tribunal'] },
    SELF_EMPLOYED: { name: 'Provisional tax (no UIF)', rate: 0, cap: 0 },
    CREDIT: { name: 'credit score (TransUnion / Experian SA)' },
    SMALL_BIZ_LOAN: 'SEFA small business loan',
    VETERANS: { orgs: ['South African Legion', 'Military Veterans Association'], care: 'the Department of Military Veterans' },
    STOCK_INDEX: 'JSE All Share Index',
    MORTGAGES: { closing: 0.06, stress: 0.02, products: { bond: { name: 'Home loan (bond, 20-yr prime-linked)', years: 20, rateAdj: 0.02, minDown: 0.1, minScore: 620, maxDti: 0.3, arm: true, reset: 1 }, flisp: { name: 'FLISP-subsidised home loan', years: 20, rateAdj: 0.015, minDown: 0.05, minScore: 580, maxDti: 0.3 } } },
    UNIONS: { police: 'Police and Prisons Civil Rights Union (POPCRU)', fire: 'South African Municipal Workers\' Union (fire)', ems: 'NEHAWU (EMS)', health: 'Democratic Nursing Organisation of South Africa (DENOSA)', education: 'South African Democratic Teachers Union (SADTU)', public: 'Public Servants Association (PSA)', prisons: 'POPCRU', transport: 'SATAWU', rail: 'United National Transport Union', aviation: 'SATAWU (aviation)', pilots: 'Airline Pilots\' Association of South Africa', trades: 'Building Construction and Allied Workers Union', industry: 'National Union of Metalworkers (NUMSA)', retail: 'SACCAWU', hospitality: 'SACCAWU', services: 'COSATU', media: 'Media Workers Association', tech: 'Solidarity', arts: 'Creative Workers Union', postal: 'Communication Workers Union' },
    CADETS: { jrotc: 'SANDF Military Skills Development System (youth)', seaCadets: 'SA Sea Cadets' },
    FOREIGN_SERVICE_EXAM: 'DIRCO cadet diplomat programme',
    PROSECUTORS: ['National Prosecuting Authority', 'Legal Aid South Africa', 'Community Corrections'],
    VOLUNTEER_SERVICES: { fire: 'Volunteer Wildfire Services', police: 'SAPS Reservist', sar: 'Mountain Club search and rescue', ambulance: 'St John Ambulance South Africa', wildland: 'Working on Fire', auxiliary: 'NSRI (National Sea Rescue Institute)', cap: null, cert: 'Community Policing Forum', redcross: 'South African Red Cross Society', skiPatrol: null, mrc: null },
    VOLUNTEER_PARENTS: {
      police: { name: 'the South African Police Service', level: 'national', funds: 1, grant: null },
      auxiliary: { name: 'the NSRI', level: 'national', funds: 0.6, grant: 'an NSRI donor grant' },
      wildland: { name: 'Working on Fire', level: 'national', funds: 1, grant: null },
    },
    NATIONAL_SERVICE: { overseas: null, domestic: 'National Youth Service (NYDA)' },
    ACCOUNTS: { dc: 'Retirement fund (pension/provident fund)', roth: { name: 'Tax-free savings account', limit: ppp(36000) }, traditional: { name: 'Retirement annuity', limit: ppp(350000), share: 0.275 } },
    REFERENDUMS: {},
    ENTRANCE_EXAMS: { name: 'National Senior Certificate (matric)', prep: { name: 'matric extra lessons', cost: ppp(12000) }, weight: 0.85 },
    AVIATION_AUTHORITY: 'South African Civil Aviation Authority',
    COUNTY: 'Municipality',
    LONG_TERM_CARE: { name: 'family care and subsidised old-age homes', covers: 0.2, safetyNet: 'SASSA' },
    WORKPLACE: { equality: 'the CCMA', reservist: 'Defence Act job protection', labourBoard: 'the CCMA' },
    EQUIPMENT: { 'Digital radio + body camera kit': 'SAPS radio + body camera', 'Patrol sedan': 'SAPS patrol car (VW Polo)', 'Police SUV': 'SAPS bakkie (Toyota Hilux)', 'Pumper engine': 'Fire engine (Rosenbauer)', '100-ft aerial ladder truck': 'Aerial ladder platform', HMMWV: 'Mamba APC', JLTV: 'RG-31 Nyala', 'M2 Bradley': 'Ratel IFV', Stryker: 'Ratel IFV', 'M1A2 Abrams': 'Olifant Mk2', 'F-16': 'JAS 39 Gripen', 'F-35A': 'JAS 39 Gripen', 'C-130J': 'C-130BZ', 'MH-60R Seahawk': 'AW159 Super Lynx', 'F/A-18E/F Super Hornet': 'JAS 39 Gripen' },
    LOCAL_ENTITIES: { sole: 'Sole proprietor', llc: 'Private company ((Pty) Ltd)', ccorp: 'Public company (Ltd)' },
    PRIVATE_TITLES: { 'Chief Executive Officer': 'Chief Executive Officer' },

    /* Schools and credentials */
    EDUCATION: (b) => ({
      ...b,
      tuition: { community: ppp(15000), technical: ppp(45000), online: ppp(30000), state: ppp(60000), private: ppp(90000), elite: ppp(70000) },
      freeIn: undefined, loans: undefined, loanThreshold: undefined, writeOffAge: undefined,
      schools: { community: 'TVET college', technical: 'Tshwane University of Technology', online: 'UNISA', state: 'University of Johannesburg', private: 'Varsity College', elite: 'University of Cape Town', academy: 'the South African Military Academy, Saldanha' },
      words: { 'High School': 'High School', 'high-school diploma': 'National Senior Certificate (matric)', GED: 'Amended Senior Certificate' },
      licenses: {
        ...b.licenses,
        'State Bar License': 'Admission as an attorney / advocate (LPC)', 'Medical License (MD)': 'HPCSA registration (medical practitioner)', 'Board Certification': 'Specialist registration (CMSA fellowship)', 'Certified Public Accountant (CPA)': 'Chartered Accountant CA(SA)',
        'Peace Officer (POST Basic Academy)': 'SAPS Basic Police Development Learning Programme', 'Registered Nurse (RN)': 'SANC professional nurse', 'Commercial Driver License (Class A)': 'Code EC driving licence', 'Commercial Driver License (Class B)': 'Code C1 driving licence', 'Driver\'s License (Class D)': 'Code B driving licence', 'Learner\'s Permit': 'Learner\'s licence',
        'Professional Engineer (PE)': 'Professional Engineer (ECSA)', 'EMT (NREMT)': 'Emergency Care Assistant', 'Paramedic (NRP)': 'Emergency Care Practitioner (HPCSA)', 'Pharmacist License (NAPLEX + MPJE)': 'Pharmacist (SAPC)',
      },
    }),
    SHORT_CYCLE: 'Higher Certificate',
    CREDENTIAL_LOCAL: { 'Driving licence (car)': 'Code B driving licence', 'Heavy goods vehicle licence (articulated)': 'Code EC driving licence', 'Heavy goods vehicle licence (rigid)': 'Code C1 driving licence', 'Bus & coach licence': 'Professional Driving Permit (passengers)', 'Security licence': 'PSIRA registration', 'Construction site safety card': 'Construction induction certificate', 'Learner licence': 'Learner\'s licence' },
    PROFESSIONAL_DEGREES: { jd: 'LLB + articles / pupillage', md: 'MBChB (six years)' },
    UNDERGRAD_ENTRY: { jd: 4, md: 6 },
    APPRENTICESHIP_SYSTEMS: { name: 'SETA learnership / artisan apprenticeship', years: 3, pay: ppp(90000), exam: 'trade test (QCTO)' },
    LOCAL_CREDENTIAL_RULES: { paramedic: { requires: { education: { level: 'bachelor', majors: ['paramedicine'] } }, trainingYears: 0, cost: 400, degreeRoute: true } },

    /* Moving here */
    WORKING_HOLIDAY: null,
    IMMIGRATION: (b) => ({
      ...b,
      visas: {
        work: { name: 'Critical Skills Work Visa', odds: 0.6, years: 3, degree: true, fee: 150 },
        transfer: { name: 'Intra-Company Transfer Work Visa', odds: 0.8, years: 4, fee: 150 },
        student: { name: 'Study visa', odds: 0.85, years: 4, postStudy: 1, fee: 100 },
        family: { name: 'Relative\'s visa (spouse of a citizen)', odds: 0.8, years: 2, fee: 100 },
        retiree: { name: 'Retired person\'s visa', odds: 0.85, amount: ppp(444000), minAge: 50, permanent: false, fee: 150 },
      },
      pr: { name: 'Permanent residence permit', years: 5, fee: 150 },
      nat: { years: 5, married: 5, needsPR: true, fromArrival: false, prMin: 5, fee: 100 },
      dualIn: true, dualOut: true, birthright: false, prLapse: 3,
      intlTuition: { mult: 1.5 },
    }),
    ASYLUM: { name: 'Asylum (Refugee Reception Office)', odds: 0.2, decision: 3, workAfter: 1, prYears: 10, support: 0 },
    LICENCE_EXCHANGE: [],
    PEERS: [],
    OVERSTAY_BAN: 5,
    BIRTH_REGISTRATION: { name: 'Registration of birth abroad (DHA)', fee: 0, deadline: false },
    PARENT_VISAS: { name: 'Relative\'s visa (parent)', needs: 'resident', odds: 0.6, wait: 1, fee: 100 },
    DIASPORA: { share: 0.06, from: [['westAfrican', 2], ['IN', 1], ['GB', 1], ['chinese', 1]] },

    /* Government and politics */
    LEGISLATURES: {
      prov: { name: (p) => `${p} Provincial Legislature`, seats: 80, presiding: 'Speaker', office: 'za_mpl', exec: 'Premier', execOffice: 'za_premier', veto: false },
      lower: { name: 'National Assembly', seats: 400, presiding: 'Speaker of the National Assembly', office: 'za_mp' },
      upper: { name: 'National Council of Provinces', seats: 90, presiding: 'Chairperson of the NCOP', office: 'za_ncop' },
      exec: 'President', execOffice: 'za_president', veto: false,
    },
    PARTY_NAMES: { labor: 'African National Congress (ANC)', business: 'Democratic Alliance (DA)' },
    CORPORATE_RATE: 0.27,
    HEALTH_SYSTEMS: { wait: 10, waitName: 'public hospital waiting list', private: { name: 'Medical aid (Discovery, Bonitas)', premium: ppp(36000), skipsWait: true } },
    PUBLIC_LABOUR: { noStrike: ['police', 'military', 'ems', 'prisons'], association: [] },
    AGENCIES: only({
      fbi: { name: 'Directorate for Priority Crime Investigation (the Hawks)', employers: ['DPCI — Pretoria', 'DPCI — Cape Town'], titles: { trainee: 'Detective Constable (Hawks)', agent: 'Detective Sergeant', senior: 'Detective Warrant Officer', bau: 'Investigative psychologist', ssa: 'Lieutenant Colonel (Hawks)', asac: 'Colonel (Hawks)', sac_cmd1: 'Brigadier (Provincial Head)', sac_cmd2: 'Major General', sac_cmd3: 'Deputy National Head', sac: 'National Head of the DPCI' } },
      usss: { name: 'SAPS Presidential Protection Service', employers: ['Presidential Protection Service — Union Buildings'] },
      borderPatrol: { name: 'Border Management Authority', employers: ['BMA — O.R. Tambo International', 'BMA — Beitbridge'] },
      tsa: { name: 'ACSA aviation security', employers: ['O.R. Tambo International Airport security'] },
      federalPrisons: { name: 'Department of Correctional Services', employers: ['Johannesburg Correctional Centre', 'Pollsmoor Correctional Centre'] },
      postal: { name: 'South African Post Office', employers: ['SAPO — Witspos'] },
      benefitsClaims: { name: 'SASSA', employers: ['SASSA local office'] },
      caseOfficer: { name: 'State Security Agency (foreign branch)', employers: ['SSA — Pretoria'] },
      intelligence: { name: 'State Security Agency', employers: ['SSA — Pretoria'] },
      meteorology: { name: 'South African Weather Service', employers: ['SAWS — Pretoria'] },
      regulatory: { name: 'Financial Regulation (SARB · FSCA · SARS)', employers: ['South African Reserve Bank', 'Financial Sector Conduct Authority', 'SARS'] },
      foreignService: { name: 'DIRCO (International Relations and Cooperation)', employers: ['DIRCO — Pretoria'] },
      parkService: { name: 'SANParks ranger', employers: ['Kruger National Park', 'Table Mountain National Park'] },
      airTrafficControl: { name: 'ATNS air traffic control', employers: ['Johannesburg ACC', 'Cape Town ACC'] },
      nationalLab: { name: 'CSIR', employers: ['CSIR — Pretoria'] },
      oig: { name: 'Auditor-General of South Africa', employers: ['AGSA — Pretoria'] },
    }),
    LOCAL_AGENCIES: (b) => ({
      ...b,
      jail: null, revenue: null, stateFire: null, corrections: null, transitPolice: null,
      gameWarden: { name: 'Provincial nature conservation', employer: (c, s, sn) => (s === 'ZA-WC' ? 'CapeNature' : `${sn} nature conservation authority`), titles: { cadet: 'Field ranger (trainee)', warden: 'Field Ranger', investigator: 'Environmental Management Inspector', pilot: 'Ranger pilot', sergeant: 'Section Ranger', captain: 'Conservation Manager', chief: 'Chief Executive (Conservation)' } },
      education: { name: 'Provincial Department of Education', employer: (c, s, sn) => `${sn} Department of Education — school in ${town(c)}`, titles: { sub: 'Substitute Educator', teacher: 'Educator (PL1)', senior: 'Senior Educator', coach: 'Subject Advisor', specialist: 'Head of Department (PL2)', chair: 'Senior Head of Department', ap: 'Deputy Principal', principal: 'Principal', director: 'Circuit Manager', assistantSuper: 'District Director', ...cmd('superintendent', ['Deputy Director-General'], 'Head of Department (Provincial Education)') } },
      municipalAdmin: { name: 'Municipality', employer: (c) => `${metro(c)} Metropolitan Municipality`, titles: { clerk: 'Administrative Clerk', deputyClerk: 'Administrative Officer', cityClerk: 'Council Secretariat Manager', analyst: 'Accountant', seniorAnalyst: 'Senior Accountant', financeDirector: 'Chief Financial Officer', manager: 'Director', acm: 'Executive Director', ...cmd('cityManager', ['Deputy City Manager'], 'City Manager') } },
      statePolice: {
        name: 'South African Police Service', employer: (c) => `SAPS — ${town(c)} Police Station`,
        titles: { cadet: 'Trainee Constable', trooper: 'Constable', senior: 'Sergeant', investigator: 'Detective Constable', majorCrimes: 'Detective Sergeant (Serious and Violent Crimes)', detSergeant: 'Detective Warrant Officer', detLieutenant: 'Detective Lieutenant', detCaptain: 'Detective Captain (Branch Commander)', sergeant: 'Warrant Officer', lieutenant: 'Lieutenant', captain: 'Captain (Station Commander)', major: 'Lieutenant Colonel', ...cmd('superintendent', ['Colonel', 'Brigadier', 'Major General (Provincial Commissioner)', 'Lieutenant General (Deputy National Commissioner)'], 'General (National Commissioner)') },
      },
      police: {
        name: 'Metro Police', employer: (c) => `${metro(c)} Metropolitan Police Department`,
        titles: { recruit: 'Metro Police trainee', officer: 'Metro Police Constable', senior: 'Senior Constable', detective: 'By-law investigator', seniorDetective: 'Senior investigator', detSergeant: 'Sergeant (investigations)', detLieutenant: 'Inspector (investigations)', detCaptain: 'Superintendent (investigations)', sergeant: 'Sergeant', lieutenant: 'Inspector', captain: 'Superintendent', deputyChief: 'Director', ...cmd('chief', ['Senior Director', 'Deputy Chief of Police'], 'Chief of Police (Metro)') },
      },
      fire: {
        name: 'Municipal Fire and Rescue', employer: (c) => `${metro(c)} Fire and Rescue Service`,
        titles: { recruit: 'Learner Firefighter', firefighter: 'Firefighter', engineer: 'Senior Firefighter (driver)', inspector: 'Fire Safety Officer', investigator: 'Fire Investigator', lieutenant: 'Platoon Commander', captain: 'Station Commander', battalion: 'Divisional Commander', deputyChief: 'Deputy Chief Fire Officer', ...cmd('chief', ['Senior Divisional Chief'], 'Chief Fire Officer') },
      },
      ems: {
        name: 'Provincial EMS', employer: (c, s, sn) => `${sn} Emergency Medical Services`,
        titles: { emt: 'Basic Ambulance Assistant', paramedic: 'Emergency Care Practitioner', criticalCare: 'Emergency Care Practitioner (advanced life support)', flight: 'Flight paramedic (Air Mercy Service)', fto: 'EMS College lecturer', supervisor: 'Shift Leader', captain: 'Station Manager', deputy: 'District EMS Manager', ...cmd('chief', ['Deputy Director, EMS'], 'Director, Provincial EMS') },
      },
      dispatch: { name: '10111 / 10177 emergency centre', employer: (c, s, sn) => `${sn} Emergency Communications Centre`, titles: { trainee: 'Call taker (trainee)', telecommunicator: 'Call taker', senior: 'Dispatcher', training: 'Trainer', supervisor: 'Shift Supervisor', ...cmd('director', ['Centre Manager'], 'Director, Emergency Communications') } },
      prosecution: { name: 'National Prosecuting Authority', employer: (c) => `NPA — ${town(c)} cluster`, titles: { clerk: 'Legal Clerk', ada: 'District Court Prosecutor', senior: 'Regional Court Prosecutor', trial: 'Senior State Advocate', chiefDeputy: 'Director of Public Prosecutions', ...cmd('first', ['Deputy National Director of Public Prosecutions'], 'National Director of Public Prosecutions') } },
    }),
    NATIONAL_SERVICES: [],
    POLICE_UNITS: { k9: 'SAPS K9 Unit', swat: 'Special Task Force', traffic: 'Metro traffic unit', narcotics: 'SAPS narcotics (SANEB)', gang: 'Anti-Gang Unit', negotiator: 'SAPS Negotiation Unit', sro: 'Community Policing Forum', instructor: 'SAPS Academy (Tshwane)', ia: 'IPID (Independent Police Investigative Directorate)', protection: 'Presidential Protection Service' },
    POLICE_BUREAUS: { homicide: 'Serious and Violent Crimes unit', svu: 'Family Violence, Child Protection and Sexual Offences unit', property: 'Property-related crimes', robbery: 'Tracking Task Team', cyber: 'Cybercrime unit (Hawks)' },
    VOLUNTEER_MEDAL: 'Volunteer service award',

    /* The South African National Defence Force */
    FORCES: {
      pay: 0.5, exposure: 0.4,
      conscription: null,
      branches: {
        army: { name: 'South African Army', icon: '🇿🇦', motto: 'Ubuntu', basic: 'basic military training at an infantry battalion', officerSchool: 'the South African Military Academy, Saldanha', enlisted: ENLISTED, officer: OFFICERS },
        navy: { name: 'South African Navy', icon: '⚓', motto: 'Ubuntu', basic: 'SAS Saldanha naval training base', officerSchool: 'the South African Naval College, Gordon\'s Bay', enlisted: ['Able Seaman', 'Leading Seaman', 'Petty Officer', 'Chief Petty Officer', 'Warrant Officer Class 2', 'Warrant Officer Class 1', 'Senior Chief Warrant Officer', 'Master Chief Warrant Officer', 'Sea Power Warrant Officer'], officer: ['Ensign', 'Sub-Lieutenant', 'Lieutenant', 'Lieutenant Commander', 'Commander', 'Captain', 'Rear Admiral (Junior Grade)', 'Rear Admiral', 'Vice Admiral', 'Admiral'] },
        airforce: { name: 'South African Air Force', icon: '✈️', motto: 'Per aspera ad astra', basic: 'Air Force Gymnasium, Hoedspruit', officerSchool: 'the Air Force College', enlisted: ENLISTED, officer: OFFICERS },
        guard: { name: 'SANDF Reserve Force', icon: '🛡️', motto: 'Ubuntu', basic: 'reserve training', officerSchool: 'the reserve officers\' course', enlisted: ENLISTED, officer: OFFICERS },
      },
      bases: {
        army: [['pretoria', 'Thaba Tshwane'], ['bloemfontein', 'Tempe Military Base'], ['durban', '121 SA Infantry Battalion'], ['capetown', 'Wynberg Military Base']],
        navy: [['capetown', 'Simon\'s Town Naval Base'], ['durban', 'Naval Station Durban']],
        airforce: [['pretoria', 'AFB Waterkloof'], ['bloemfontein', 'AFB Bloemspruit'], ['gqeberha', 'AFS Port Elizabeth']],
      },
      overseas: {
        army: [['Democratic Republic of the Congo', 'MONUSCO Force Intervention Brigade', 1, false], ['Mozambique', 'SADC mission (Cabo Delgado)', 1, false]],
        navy: [['Mozambique Channel', 'Operation Copper (anti-piracy)', 1, false]],
        airforce: [['Democratic Republic of the Congo', 'MONUSCO air wing', 1, false]],
      },
    },
    MIL_SPECIAL: { drill: { names: 'Basic training instructor' }, recruiter: { names: 'SANDF recruitment officer' }, honorGuard: { names: 'SANDF Ceremonial Guard', desc: 'State events at the Union Buildings.' }, rotc: { names: 'Lecturer, South African Military Academy' }, joint: { names: 'Joint Operations staff officer' }, fellow: { names: 'Fellow, Defence College' }, commissioning: 'officer formative course from the ranks', chiefs: { army: 'Chief of the Army', navy: 'Chief of the Navy', airforce: 'Chief of the Air Force' }, chairman: 'Chief of the SANDF' },
    PME: { enlisted: ['Junior Leader course', 'Senior NCO course', 'Warrant officers\' course', 'Senior warrant officers\' course', 'Master warrant officers\' course'], officer: ['Junior Command and Staff Duties', 'Senior Command and Staff Programme', 'Executive National Security Programme'] },
    QUALS: { airborne: 'Parachute course (44 Parachute Regiment)', rangerSchool: 'Special Forces selection', jumpmaster: 'Jumpmaster course', pathfinder: 'Pathfinder course', combatDiver: 'Combat diving course', dli: 'Language course', instructor: 'Instructors\' course', sere: 'Survival course', expertBadge: 'Infantry proficiency badge' },
    SOF: {
      ranger: sf('South African Special Forces (Recces)', 'Recce selection', '4 / 5 Special Forces Regiment', 'Recce badge', 'Long-range reconnaissance, raids and hostage rescue.', ['a reconnaissance mission in the eastern DRC', 'a hostage-rescue standby']),
      seal: sf('Maritime Reaction Squadron', 'the MRS selection course', 'Maritime Reaction Squadron, Simon\'s Town', 'MRS badge', 'Naval infantry and boarding teams.', ['an anti-piracy boarding in the Mozambique Channel']),
    },
    MIL_UNITS: { ground: ['44 Parachute Regiment', '1 SA Infantry Battalion', '1 Special Service Battalion', '121 SA Infantry Battalion'], naval: ['SAS Amatola', 'SAS Isandlwana', 'SAS Manthatisi (submarine)'], air: ['2 Squadron (Gripen)', '28 Squadron (C-130)', '15 Squadron (rescue helicopters)'] },
    MIL_SUMMARY: 'a summary trial (Military Discipline Supplementary Measures Act)',
    SERVICE_TERMS: { maxYears: { enlisted: 40, officer: 40 }, ages: { enlisted: 60, officer: 60, flag: 65 }, name: 'service contract' },
    MILITARY_JUSTICE: { code: 'the Military Discipline Code', court: 'a military court (Military Judges)', prison: 'a military detention barracks', counsel: 'Military legal defence counsel' },
    VETTING: { form: 'Defence Intelligence security clearance', publicTrust: 'Confidential', secret: 'Secret', topSecret: 'Top Secret' },
    CAMPUS: { army: 'University Reserve Training Unit', navy: null, airforce: null, obligation: false },
    ACADEMY_NAMES: { army: 'the South African Military Academy, Saldanha', navy: 'the South African Naval College', airforce: 'the Air Force College' },
    THEATERS: [
      { id: 'drc', name: 'combat with armed groups in the eastern DRC', adversary: 'armed groups', intensity: 1, home: 0, weight: 30 },
      { id: 'mozambique', name: 'counter-insurgency in Cabo Delgado', adversary: 'insurgents', intensity: 1, home: 0, weight: 20 },
    ],
    WAR_START_CHANCE: 0.006,
    MEDALS: {
      moh: { name: 'Nkwe ya Gauta (Golden Leopard)', ribbon: R('#007a4d', '#ffb612', '#de3831') }, serviceCross: { name: 'Nkwe ya Selefera (Silver Leopard)' }, silverStar: { name: 'Nkwe ya Boronse (Bronze Leopard)' },
      dsm: { name: 'Ikhwezi' }, legionOfMerit: { name: 'Military Merit Medal' }, bronzeStar: { name: 'Chief of the SANDF Commendation' },
      purpleHeart: null, msm: { name: 'Service Medal in Bronze' }, commendation: { name: 'Chief of Service Commendation' }, achievement: { name: 'Commander\'s commendation' },
      combatAction: null, goodConduct: { name: 'Good Service Medal' }, humanitarian: { name: 'Operational Service Medal (humanitarian)' }, expeditionary: { name: 'Operational Service Medal (peace support)' }, ndsm: null,
    },
    // The National Orders: the Order of the Baobab (service) and the Order of Mapungubwe (achievement).
    ORDERS: {
      minAge: 35,
      tiers: [
        { id: 'baobabBronze', name: 'Order of the Baobab (Bronze)', min: 50, ribbon: R('#007a4d', '#ffb612', '#007a4d') },
        { id: 'baobabSilver', name: 'Order of the Baobab (Silver)', min: 100, ribbon: R('#007a4d', '#ffb612', '#007a4d') },
        { id: 'baobabGold', name: 'Order of the Baobab (Gold)', min: 160, ribbon: R('#007a4d', '#ffb612', '#007a4d') },
        { id: 'mapungubweSilver', name: 'Order of Mapungubwe (Silver)', min: 210, ribbon: R('#000000', '#ffb612', '#000000') },
        { id: 'mapungubwePlatinum', name: 'Order of Mapungubwe (Platinum)', min: 270, ribbon: R('#000000', '#ffb612', '#000000') },
      ],
    },
    PARDON: 'the President (presidential pardon)',
    COMBAT_TEMPO: 0.2,
    MIL_PENSIONS: { name: 'Government Employees Pension Fund (GEPF)', rate: 1 / 55, cap: 0.8, vest: 10, immediate: { enlisted: 20, officer: 20 }, minAge: 50, deferredAge: 60, lumpSum: 0.05 },
    DIRECT_ENTRY: {
      statePolice: [{ id: 'sapsOfficer', name: 'SAPS graduate officer entry (Lieutenant)', levelId: 'lieutenant', education: 'bachelor', maxAge: 30, odds: 0.1, school: 'the SAPS Academy' }],
    },
    BENCHES: {
      route: 'appointed', appointedBy: 'the President, on the Judicial Service Commission\'s advice', retire: 70,
      lay: { id: 'assessor', name: 'Lay assessor (Magistrates\' Court)', icon: '🤝', allowance: 1200, minAge: 25, maxAge: 70, noLaw: true, desc: 'Sit with a magistrate as one of two lay assessors in serious criminal trials.' },
      ladder: [
        { id: 'district', name: 'District Court Magistrate', icon: '🔨', salary: 70000, minYears: 5, entry: true },
        { id: 'regional', name: 'Regional Court Magistrate', icon: '⚖️', salary: 95000, minYears: 7, entry: true },
        { id: 'high', name: 'Judge of the High Court', icon: '📜', salary: 160000, minYears: 10, entry: true },
        { id: 'sca', name: 'Judge of the Supreme Court of Appeal', icon: '🏛️', salary: 180000, minYears: 15 },
        { id: 'concourt', name: 'Justice of the Constitutional Court', icon: '🏛️', salary: 190000, minYears: 15 },
      ],
    },
  },
};
