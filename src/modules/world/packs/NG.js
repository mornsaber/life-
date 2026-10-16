/**
 * Nigeria, built on the Philippines: a federal presidential republic with
 * 36 states, one national police force (the Nigeria Police Force), state fire
 * and ambulance services, a large informal economy, retirement savings
 * accounts under the Contributory Pension Scheme, and a compulsory year of
 * National Youth Service (NYSC) for every graduate under 30. The armed forces
 * fight an insurgency in the North East.
 *
 * Amounts are naira converted at 2025 PPP (₦230 per US$), 2026 rates.
 * See docs/ADDING-A-COUNTRY.md for the shape of a pack.
 */

const NGN = 230;
const ppp = (local) => Math.round(local / NGN);
const cmd = (top, steps, head) => ({ ...Object.fromEntries(steps.map((t, i) => [`${top}_cmd${i + 1}`, t])), [top]: head });
const sf = (name, course, unitName, badge, desc, deployments) => ({ name, course, unitName, badge, desc, deployments });
const R = (...colors) => colors.map((c) => [c, 1]);
const state = (name, extra = {}) => ({ name, incomeTax: [], propertyTax: 0.005, salesTax: 0.075, rightToWork: false, cannabis: false, dui: { fineMult: 1, suspendYears: 1 }, minWage: ppp(70000 * 12 / 2080), population: 'large', disasters: { flood: 0.06 }, ...extra });
const ENLISTED = ['Private', 'Lance Corporal', 'Corporal', 'Sergeant', 'Staff Sergeant', 'Warrant Officer', 'Master Warrant Officer', 'Army Warrant Officer', 'Command Sergeant Major'];
const OFFICERS = ['Second Lieutenant', 'Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier General', 'Major General', 'Lieutenant General', 'General'];
const town = (c) => c.split(',')[0];
const only = (mine) => (b) => ({ ...Object.fromEntries(Object.keys(b ?? {}).map((k) => [k, null])), ...mine });

export const NG = {
  id: 'NG',
  basedOn: 'PH',
  groups: ['COMMON_LAW'],
  agreements: [],
  licenceExchange: [],
  peers: [],
  country: {
    name: 'Nigeria',
    flag: '🇳🇬',
    demonym: 'Nigerian',
    capital: 'Abuja',
    currency: { code: 'NGN', symbol: '₦', perUsd: NGN },
    languages: ['English', 'Hausa', 'Yoruba', 'Igbo'],
    emergency: '112',
    retirementAge: 60,
    informality: 0.8,
    tax: {
      // Nigeria Tax Act 2025: the first ₦800,000 tax-free, then 15%, 18%, 21%, 23% and 25% above ₦50 million.
      allowance: ppp(800000),
      brackets: [[ppp(2200000), 0.15], [ppp(9000000), 0.18], [ppp(13000000), 0.21], [ppp(25000000), 0.23], [Infinity, 0.25]],
      contributions: [{ name: 'Pension (RSA, 8%)', rate: 0.08, from: 0, to: Infinity }, { name: 'National Housing Fund', rate: 0.025, from: 0, to: Infinity }],
      label: 'Nigeria Revenue Service',
    },
    // The Contributory Pension Scheme: 18% of pay into your Retirement Savings Account, drawn as an annuity or programmed withdrawal.
    pension: { kind: 'account', name: 'Retirement Savings Account (PenCom)', rate: 0.18, growth: 0.04, cap: ppp(100000000), annuity: 15, flat: 0, ages: [50, 60] },
    employerSuper: 0.1,
    health: { name: 'National Health Insurance Authority (NHIA)', short: 'NHIA', deductible: 0, coinsurance: 0.45, oopMax: ppp(1200000) },
    childBenefit: { amount: 0, phaseOutFrom: Infinity, name: 'no child benefit' },
    terms: {
      'Federal government': 'Federal Government', 'State government': 'State Government', 'Federal income tax': 'Personal income tax', 'State income tax': 'Personal income tax (state)',
      'Social Security': 'Contributory Pension Scheme', '401(k)': 'Retirement Savings Account', IRA: 'voluntary pension contribution', IRS: 'Nigeria Revenue Service', Medicaid: 'NHIA', Medicare: 'NHIA', 'GI Bill': 'veterans\' education support',
      'SSS pension': 'Retirement Savings Account', SSS: 'PenCom', PhilHealth: 'NHIA', 'Pag-IBIG': 'National Housing Fund',
    },
    names: {
      male: ['Chinedu', 'Emeka', 'Oluwaseun', 'Tunde', 'Ibrahim', 'Musa', 'Abdullahi', 'Chukwuemeka', 'Babatunde', 'Femi', 'Uche', 'Yusuf', 'Segun', 'Obinna', 'Aliyu', 'David'],
      female: ['Ngozi', 'Chioma', 'Aisha', 'Fatima', 'Funmilayo', 'Adaeze', 'Amina', 'Blessing', 'Yetunde', 'Nkechi', 'Zainab', 'Folake', 'Ifeoma', 'Hauwa', 'Grace', 'Temitope'],
      last: ['Okafor', 'Adeyemi', 'Ibrahim', 'Bello', 'Okonkwo', 'Mohammed', 'Ogunleye', 'Eze', 'Abubakar', 'Nwosu', 'Balogun', 'Usman', 'Adebayo', 'Obi', 'Yusuf', 'Chukwu'],
    },
    provinces: {
      'NG-LA': state('Lagos', { population: 'mega', disasters: { flood: 0.08 } }),
      'NG-FC': state('Federal Capital Territory', { population: 'medium' }),
      'NG-KN': state('Kano', { population: 'enterprise', disasters: { flood: 0.04 } }),
      'NG-RI': state('Rivers', { disasters: { flood: 0.08 } }),
      'NG-OY': state('Oyo', { population: 'enterprise' }),
      'NG-EN': state('Enugu', { disasters: { flood: 0.04 } }),
    },
    cities: {
      lagos: { name: 'Lagos', icon: '🌆', type: 'High-cost metro', state: 'NG-LA', col: 0.75, market: 0.55, locality: 0.15, transit: 25, fare: ppp(240000), walkable: false, size: 'mega', population: [15000000, 21000000] },
      abuja: { name: 'Abuja', icon: '🏛️', type: 'Capital region', state: 'NG-FC', col: 0.8, market: 0.6, locality: 0.16, transit: 15, fare: ppp(200000), walkable: false, size: 'enterprise', population: [3800000, 3800000] },
      kano: { name: 'Kano', icon: '🕌', type: 'Major metro', state: 'NG-KN', col: 0.55, market: 0.4, locality: 0.12, transit: 10, fare: ppp(150000), walkable: true, size: 'enterprise', population: [4300000, 4300000] },
      portharcourt: { name: 'Port Harcourt', icon: '🛢️', type: 'Major metro', state: 'NG-RI', col: 0.7, market: 0.5, locality: 0.14, transit: 10, fare: ppp(180000), walkable: false, size: 'large', population: [3500000, 3500000] },
      ibadan: { name: 'Ibadan', icon: '🏘️', type: 'Major metro', state: 'NG-OY', col: 0.55, market: 0.4, locality: 0.12, transit: 10, fare: ppp(150000), walkable: true, size: 'enterprise', population: [3900000, 3900000] },
      enugu: { name: 'Enugu', icon: '⛏️', type: 'Mid-size city', state: 'NG-EN', col: 0.55, market: 0.4, locality: 0.12, transit: 8, fare: ppp(140000), walkable: true, size: 'medium', population: [900000, 1100000] },
    },
    hometowns: ['lagos', 'lagos', 'lagos', 'abuja', 'kano', 'kano', 'portharcourt', 'ibadan', 'ibadan', 'enugu'],
    population: { 'NG-LA': 16e6, 'NG-FC': 3.8e6, 'NG-KN': 16e6, 'NG-RI': 8e6, 'NG-OY': 8.5e6, 'NG-EN': 4.7e6 },
  },
  offices: {
    ng_assembly: { country: 'NG', name: 'Member of the State House of Assembly', icon: '🏛️', level: 3, term: 4, termLimit: 0, salary: 40000, minAge: 25, residency: 1, cost: 150000, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    ng_governor: { country: 'NG', name: 'State Governor', icon: '⭐', level: 4, term: 4, termLimit: 2, salary: 60000, minAge: 35, residency: 1, cost: 4000000, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true },
    ng_rep: { country: 'NG', name: 'Member, House of Representatives', icon: '🏛️', level: 4, term: 4, termLimit: 0, salary: 75000, minAge: 25, residency: 1, cost: 500000, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    ng_senator: { country: 'NG', name: 'Senator', icon: '🏛️', level: 4, term: 4, termLimit: 0, salary: 90000, minAge: 35, residency: 1, cost: 1500000, fullTime: true, pension: 'electedOfficials', kind: 'legislative' },
    ng_president: { country: 'NG', name: 'President of Nigeria', icon: '🇳🇬', level: 5, term: 4, termLimit: 2, salary: 100000, minAge: 35, residency: 1, cost: 30000000, statewide: true, fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true },
  },
  tables: {
    /* Law and money */
    JUSTICE: { trial: 'bench', sentence: 1, jail: (c) => `${town(c)} custodial centre (awaiting trial)`, prison: 'a medium-security custodial centre (Nigerian Correctional Service)', legalAid: 'a Legal Aid Council lawyer', privatePrisons: 0 },
    INSOLVENCY: { liquidation: { name: 'Bankruptcy (Bankruptcy Act)', wait: 5 }, plan: { name: 'Composition with creditors', years: 3, wait: 2 }, homestead: 0, wildcard: ppp(500000), creditYears: 5 },
    INHERITANCE: { name: 'no inheritance tax', exemption: Infinity, brackets: [[Infinity, 0]] },
    UNEMPLOYMENT: { name: 'Employment Compensation Scheme (no unemployment benefit)', flat: 0, years: 0 },
    SEVERANCE: { perYear: 0.04, base: 0 },
    DISABILITY: { name: 'Employees\' Compensation Scheme (NSITF)', rate: 0.5, floor: ppp(400000), cap: ppp(4000000), minYears: 1, odds: 0.7, stages: ['NSITF assessment', 'Medical board', 'National Industrial Court'] },
    SELF_EMPLOYED: { name: 'Micro Pension Plan (voluntary)', rate: 0, cap: 0 },
    CREDIT: { name: 'credit report (CRC Credit Bureau)' },
    SMALL_BIZ_LOAN: 'Bank of Industry SME loan',
    VETERANS: { orgs: ['Nigerian Legion', 'Retired Military Officers Association'], care: 'the Military Pensions Board' },
    STOCK_INDEX: 'NGX All-Share Index',
    MORTGAGES: { closing: 0.08, stress: 0.03, products: { nhf: { name: 'National Housing Fund mortgage (30-yr)', years: 30, rateAdj: -0.01, minDown: 0.1, minScore: 550, maxDti: 0.33 }, bank: { name: 'Commercial mortgage (15-yr)', years: 15, rateAdj: 0.08, minDown: 0.3, minScore: 650, maxDti: 0.33 } } },
    UNIONS: { police: null, fire: 'Amalgamated Union of Public Corporations (fire services)', ems: 'Medical and Health Workers\' Union', health: 'National Association of Nigeria Nurses and Midwives', education: 'Nigeria Union of Teachers', public: 'Nigeria Labour Congress (civil service)', prisons: null, transport: 'National Union of Road Transport Workers', rail: 'Nigeria Union of Railwaymen', aviation: 'National Union of Air Transport Employees', pilots: 'National Association of Aircraft Pilots and Engineers', trades: 'Construction and Civil Engineering Workers\' Union', industry: 'Steel and Engineering Workers\' Union', retail: 'Trade Union Congress (commerce)', hospitality: 'National Union of Hotels and Personal Services Workers', services: 'Trade Union Congress', media: 'Nigeria Union of Journalists', tech: 'Trade Union Congress', arts: null, postal: 'Nigeria Union of Postal Workers' },
    CADETS: { jrotc: 'Man O\'War Nigeria (school cadets)', seaCadets: null },
    FOREIGN_SERVICE_EXAM: 'Federal Civil Service Commission (foreign service) exam',
    PROSECUTORS: ['Directorate of Public Prosecutions (state Ministry of Justice)', 'Legal Aid Council', 'Nigerian Correctional Service (non-custodial)'],
    VOLUNTEER_SERVICES: { fire: 'Community fire volunteers', police: 'Special Constabulary', sar: 'NEMA emergency volunteers', ambulance: 'St John Ambulance Nigeria', wildland: null, auxiliary: null, cap: null, cert: 'Neighbourhood safety corps', redcross: 'Nigerian Red Cross Society', skiPatrol: null, mrc: null },
    VOLUNTEER_PARENTS: { police: { name: 'the Nigeria Police Force', level: 'national', funds: 0.5, grant: null }, cert: { name: 'NEMA (National Emergency Management Agency)', level: 'national', funds: 0.5, grant: null } },
    NATIONAL_SERVICE: { overseas: null, domestic: 'National Youth Service Corps (NYSC)' },
    ACCOUNTS: { dc: 'Retirement Savings Account', roth: { name: 'Mutual fund / stock account', limit: ppp(50000000) }, traditional: { name: 'Voluntary pension contribution', limit: ppp(10000000), share: 0.3 } },
    REFERENDUMS: {},
    ENTRANCE_EXAMS: { name: 'UTME (JAMB) and WASSCE', prep: { name: 'JAMB tutorial centre', cost: ppp(150000) }, weight: 0.85 },
    AVIATION_AUTHORITY: 'Nigerian Civil Aviation Authority',
    COUNTY: 'Local Government Area',
    LONG_TERM_CARE: { name: 'family care (no public long-term care)', covers: 0, safetyNet: 'the National Social Investment Programme' },
    WORKPLACE: { equality: 'the National Industrial Court', reservist: 'Labour Act job protection', labourBoard: 'the National Industrial Court' },
    EQUIPMENT: { 'Digital radio + body camera kit': 'Police radio', 'Patrol sedan': 'Patrol car (Toyota Corolla)', 'Police SUV': 'Police Hilux', 'Pumper engine': 'Fire tender', '100-ft aerial ladder truck': 'Turntable ladder', HMMWV: 'Toyota Hilux (military)', JLTV: 'Innoson IVM armoured vehicle', 'M2 Bradley': 'VN-1 IFV', Stryker: 'Panhard VCR', 'M1A2 Abrams': 'VT-4', 'F-16': 'JF-17 Thunder', 'F-35A': 'JF-17 Thunder', 'C-130J': 'C-130H', 'MH-60R Seahawk': 'AW109', 'F/A-18E/F Super Hornet': 'A-29 Super Tucano' },
    LOCAL_ENTITIES: { sole: 'Business name (CAC)', llc: 'Private company limited by shares (Ltd)', ccorp: 'Public limited company (Plc)' },
    PRIVATE_TITLES: { 'Chief Executive Officer': 'Managing Director/CEO' },

    /* Schools and credentials */
    EDUCATION: {
      tuition: { community: ppp(200000), technical: ppp(300000), online: ppp(150000), state: ppp(250000), private: ppp(3000000), elite: ppp(250000) },
      schools: { community: 'Federal College of Education', technical: 'Yaba College of Technology', online: 'National Open University of Nigeria', state: 'University of Lagos', private: 'Covenant University', elite: 'University of Ibadan', academy: 'the Nigerian Defence Academy, Kaduna' },
      words: { 'High School': 'Senior Secondary School', 'high-school diploma': 'WASSCE certificate', 'high school': 'senior secondary school', GED: 'NECO GCE' },
      licenses: {
        'State Bar License': 'Call to the Nigerian Bar (Nigerian Law School)', 'Medical License (MD)': 'MDCN full registration', 'Board Certification': 'Fellowship (National Postgraduate Medical College)', 'Certified Public Accountant (CPA)': 'Chartered Accountant (ICAN)',
        'Peace Officer (POST Basic Academy)': 'Police Training School', 'Registered Nurse (RN)': 'Registered Nurse (NMCN)', 'Commercial Driver License (Class A)': 'Class E driver\'s licence (articulated)', 'Commercial Driver License (Class B)': 'Class C driver\'s licence (truck)', 'Driver\'s License (Class D)': 'Class B driver\'s licence', 'Learner\'s Permit': 'Learner\'s permit',
        'Professional Engineer (PE)': 'COREN registered engineer', 'EMT (NREMT)': 'Emergency Medical Technician', 'Paramedic (NRP)': 'Paramedic', 'Pharmacist License (NAPLEX + MPJE)': 'PCN registered pharmacist',
      },
    },
    SHORT_CYCLE: 'National Diploma (ND)',
    CREDENTIAL_LOCAL: { 'Driving licence (car)': 'Class B driver\'s licence', 'Heavy goods vehicle licence (articulated)': 'Class E driver\'s licence', 'Heavy goods vehicle licence (rigid)': 'Class C driver\'s licence', 'Bus & coach licence': 'Class D driver\'s licence', 'Security licence': 'NSCDC private guard licence', 'Construction site safety card': 'HSE certificate', 'Learner licence': 'Learner\'s permit' },
    PROFESSIONAL_DEGREES: { jd: 'LL.B. + Nigerian Law School (BL)', md: 'MBBS (six years)' },
    UNDERGRAD_ENTRY: { jd: 5, md: 6 },
    APPRENTICESHIP_SYSTEMS: { name: 'Industrial Training Fund apprenticeship', years: 3, pay: ppp(1200000), exam: 'Trade test certificate' },

    /* Moving here */
    WORKING_HOLIDAY: null,
    IMMIGRATION: {
      visas: {
        work: { name: 'Subject to Regularisation visa + CERPAC', odds: 0.5, years: 2, degree: true, fee: 300 },
        transfer: { name: 'Temporary Work Permit (expatriate quota)', odds: 0.75, years: 2, fee: 300 },
        student: { name: 'Student visa', odds: 0.8, years: 4, postStudy: 0, fee: 100 },
        family: { name: 'Residence permit (spouse of a citizen)', odds: 0.8, years: 2, fee: 150 },
      },
      pr: { name: 'Permanent residence (Nigeria Immigration Service)', years: 10, fee: 500 },
      nat: { years: 15, married: 5, needsPR: true, fromArrival: true, prMin: 0, fee: 500 },
      dualIn: true, dualOut: true, birthright: false, prLapse: 5,
      intlTuition: { mult: 2 },
    },
    ASYLUM: { name: 'Refugee status (National Commission for Refugees)', odds: 0.5, decision: 2, workAfter: 1, prYears: 0, support: 0 },
    LICENCE_EXCHANGE: [],
    PEERS: [],
    OVERSTAY_BAN: 5,
    BIRTH_REGISTRATION: { name: 'Birth registration at a Nigerian mission', fee: 20, deadline: false },
    PARENT_VISAS: { name: 'Residence permit (parent)', needs: 'resident', odds: 0.6, wait: 1, fee: 150 },
    DIASPORA: { share: 0.01, from: [['westAfrican', 3], ['chinese', 1]] },

    /* Government and politics */
    LEGISLATURES: {
      prov: { name: (p) => `${p} State House of Assembly`, seats: 40, presiding: 'Speaker', office: 'ng_assembly', exec: 'Governor', execOffice: 'ng_governor', veto: true },
      lower: { name: 'House of Representatives', seats: 360, presiding: 'Speaker of the House', office: 'ng_rep' },
      upper: { name: 'Senate', seats: 109, presiding: 'President of the Senate', office: 'ng_senator' },
      exec: 'President of Nigeria', execOffice: 'ng_president', veto: true,
    },
    PARTY_NAMES: { labor: 'Peoples Democratic Party (PDP)', business: 'All Progressives Congress (APC)' },
    CORPORATE_RATE: 0.3,
    HEALTH_SYSTEMS: { wait: 6, waitName: 'public hospital queue', private: { name: 'Private HMO plan', premium: ppp(600000), skipsWait: true } },
    PUBLIC_LABOUR: { noStrike: ['police', 'military'], association: ['police'] },
    AGENCIES: only({
      fbi: { name: 'Economic and Financial Crimes Commission (EFCC)', employers: ['EFCC — Abuja', 'EFCC — Lagos zonal command'], titles: { trainee: 'Detective cadet (EFCC Academy)', agent: 'Detective Inspector', senior: 'Detective Superintendent', bau: 'Forensic analyst', ssa: 'Team Lead', asac: 'Zonal Head', sac_cmd1: 'Director of Operations', sac_cmd2: 'Secretary to the Commission', sac_cmd3: 'Acting Chairman', sac: 'Chairman of the EFCC' } },
      dea: { name: 'National Drug Law Enforcement Agency (NDLEA)', employers: ['NDLEA — Lagos airport command', 'NDLEA — Abuja'] },
      usss: { name: 'Department of State Services (VIP protection)', employers: ['DSS — Aso Rock'] },
      borderPatrol: { name: 'Nigeria Immigration Service', employers: ['NIS — Murtala Muhammed Airport', 'NIS — Seme border'] },
      federalPrisons: { name: 'Nigerian Correctional Service', employers: ['Kirikiri Custodial Centre', 'Kuje Custodial Centre'] },
      postal: { name: 'Nigerian Postal Service (NIPOST)', employers: ['NIPOST — sorting centre'] },
      benefitsClaims: { name: 'National Pension Commission (PenCom)', employers: ['PenCom — Abuja'] },
      caseOfficer: { name: 'National Intelligence Agency', employers: ['NIA — Abuja'] },
      intelligence: { name: 'Department of State Services (DSS)', employers: ['DSS — Abuja'] },
      meteorology: { name: 'Nigerian Meteorological Agency (NiMet)', employers: ['NiMet — Abuja'] },
      regulatory: { name: 'Financial Regulation (CBN · SEC · Revenue Service)', employers: ['Central Bank of Nigeria', 'Securities and Exchange Commission'] },
      foreignService: { name: 'Ministry of Foreign Affairs', employers: ['MFA — Abuja'] },
      parkService: { name: 'National Park Service', employers: ['Yankari National Park', 'Cross River National Park'] },
      airTrafficControl: { name: 'NAMA air traffic control', employers: ['Lagos Area Control Centre', 'Kano Area Control Centre'] },
      oig: { name: 'Office of the Auditor-General for the Federation', employers: ['OAuGF — Abuja'] },
    }),
    LOCAL_AGENCIES: (b) => ({
      ...b,
      jail: null, statePolice: null, transitPolice: null, corrections: null,
      education: { name: 'Public schools', employer: (c, s, sn) => `${sn} State Ministry of Education — school in ${town(c)}`, titles: { sub: 'Volunteer Teacher (N-Power)', teacher: 'Teacher (GL 08)', senior: 'Senior Teacher', coach: 'Education Officer', specialist: 'Head of Department', chair: 'Senior Master', ap: 'Vice Principal', principal: 'Principal', director: 'Zonal Director of Education', assistantSuper: 'Director, Ministry of Education', ...cmd('superintendent', ['Permanent Secretary'], 'Commissioner for Education') } },
      municipalAdmin: { name: 'Local Government Council', employer: (c) => `${town(c)} Local Government Council`, titles: { clerk: 'Clerical Officer', deputyClerk: 'Executive Officer', cityClerk: 'Clerk of the Legislative Council', analyst: 'Accountant', seniorAnalyst: 'Principal Accountant', financeDirector: 'Treasurer', manager: 'Head of Department', acm: 'Director of Administration', ...cmd('cityManager', ['Head of Local Government Administration'], 'Head of Service (Local Government)') } },
      police: {
        name: 'Nigeria Police Force', employer: (c) => `Nigeria Police Force — ${town(c)} Division`,
        titles: { recruit: 'Recruit Constable (Police Training School)', officer: 'Police Constable', senior: 'Corporal', detective: 'Detective Constable (CID)', seniorDetective: 'Detective Corporal (State CID)', detSergeant: 'Detective Inspector', detLieutenant: 'Assistant Superintendent (CID)', detCaptain: 'Superintendent (State CID)', sergeant: 'Sergeant', lieutenant: 'Inspector', captain: 'Assistant Superintendent of Police (DPO)', deputyChief: 'Superintendent of Police', ...cmd('chief', ['Chief Superintendent of Police', 'Assistant Commissioner of Police', 'Deputy Commissioner of Police', 'Commissioner of Police (state command)'], 'Inspector-General of Police') },
      },
      fire: {
        name: 'State Fire Service', employer: (c, s, sn) => (s === 'NG-LA' ? 'Lagos State Fire and Rescue Service' : `${sn} State Fire Service`),
        titles: { recruit: 'Fireman (recruit)', firefighter: 'Fireman', engineer: 'Leading Fireman (driver)', inspector: 'Fire Safety Inspector', investigator: 'Fire Investigator', lieutenant: 'Sub-Officer', captain: 'Station Officer', battalion: 'Divisional Officer', deputyChief: 'Deputy Chief Fire Officer', ...cmd('chief', ['Assistant Controller'], 'Director (Chief Fire Officer)') },
      },
      ems: {
        name: 'State Ambulance Service', employer: (c, s, sn) => (s === 'NG-LA' ? 'Lagos State Ambulance Service (LASAMBUS)' : `${sn} State Emergency Medical Service`),
        titles: { emt: 'Emergency Medical Technician', paramedic: 'Paramedic', criticalCare: 'Senior Paramedic', flight: 'Paramedic (air ambulance)', fto: 'Training Officer', supervisor: 'Shift Supervisor', captain: 'Station Manager', deputy: 'Deputy Director', ...cmd('chief', ['Director of Operations'], 'Director, State Ambulance Service') },
      },
      dispatch: { name: '112 Emergency Communication Centre', employer: (c, s, sn) => `${sn} State 112 Emergency Centre`, titles: { trainee: 'Call Agent (trainee)', telecommunicator: '112 Call Agent', senior: 'Senior Call Agent', training: 'Trainer', supervisor: 'Shift Supervisor', ...cmd('director', ['Centre Manager'], 'Director, Emergency Communications') } },
      prosecution: { name: 'Directorate of Public Prosecutions', employer: (c, s, sn) => `${sn} State Ministry of Justice — DPP`, titles: { clerk: 'Legal Assistant', ada: 'State Counsel', senior: 'Senior State Counsel', trial: 'Principal State Counsel', chiefDeputy: 'Director of Public Prosecutions', ...cmd('first', ['Solicitor-General'], 'Attorney-General and Commissioner for Justice') } },
    }),
    NATIONAL_SERVICES: ['police'],
    POLICE_UNITS: { k9: 'Police K9 Section', swat: 'Police Mobile Force', traffic: 'Federal Road Safety Corps liaison', narcotics: 'Narcotics unit (State CID)', gang: 'Anti-Kidnapping Unit', negotiator: 'Hostage negotiation team', sro: 'Community policing', instructor: 'Police Training School', ia: 'X-Squad (anti-corruption)', protection: 'Special Protection Unit' },
    POLICE_BUREAUS: { homicide: 'State CID (homicide)', svu: 'Gender desk', property: 'State CID (property)', robbery: 'Tactical squad', cyber: 'NPF National Cybercrime Centre' },
    VOLUNTEER_MEDAL: 'Volunteer service award',

    /* The Nigerian Armed Forces */
    FORCES: {
      pay: 0.35, exposure: 0.9,
      // NYSC: a compulsory year of civilian service for graduates under 30 (no military draft).
      conscription: { kind: 'graduate', months: 12, genders: ['male', 'female'], name: 'National Youth Service Corps (NYSC)', text: 'Every Nigerian graduate under 30 serves a compulsory year in the National Youth Service Corps: three weeks of orientation camp, then a year posted to a school, hospital or office in another state. You need the discharge certificate for most jobs.', allowance: ppp(1000000), posting: 'orientation camp, then a primary assignment in another state' },
      branches: {
        army: { name: 'Nigerian Army', icon: '🇳🇬', motto: 'Victory is from God alone', basic: 'recruit training at the Depot Nigerian Army, Zaria', officerSchool: 'the Nigerian Defence Academy, Kaduna', enlisted: ENLISTED, officer: OFFICERS },
        navy: { name: 'Nigerian Navy', icon: '⚓', motto: 'Onward together', basic: 'Basic Training School, Onne', officerSchool: 'the Nigerian Defence Academy (naval cadets)', enlisted: ['Ordinary Seaman', 'Able Seaman', 'Leading Seaman', 'Petty Officer', 'Chief Petty Officer', 'Warrant Chief Petty Officer', 'Master Warrant Officer', 'Navy Warrant Officer', 'Command Warrant Officer'], officer: ['Sub-Lieutenant', 'Lieutenant', 'Lieutenant Commander', 'Commander', 'Captain', 'Commodore', 'Rear Admiral', 'Vice Admiral', 'Vice Admiral (Chief of Naval Staff)', 'Admiral'] },
        airforce: { name: 'Nigerian Air Force', icon: '✈️', motto: 'Willing, Able, Ready', basic: 'Military Training Centre, Kaduna', officerSchool: 'the Nigerian Defence Academy (air cadets)', enlisted: ['Aircraftman', 'Lance Corporal', 'Corporal', 'Sergeant', 'Flight Sergeant', 'Warrant Officer', 'Master Warrant Officer', 'Air Warrant Officer', 'Command Warrant Officer'], officer: ['Pilot Officer', 'Flying Officer', 'Flight Lieutenant', 'Squadron Leader', 'Wing Commander', 'Group Captain', 'Air Commodore', 'Air Vice Marshal', 'Air Marshal', 'Air Chief Marshal'] },
        guard: { name: 'Nigerian Army Reserve', icon: '🛡️', motto: 'Victory is from God alone', basic: 'reserve training', officerSchool: 'the Nigerian Army School of Infantry', enlisted: ENLISTED, officer: OFFICERS },
      },
      bases: {
        army: [['abuja', 'Defence Headquarters, Abuja'], ['lagos', '81 Division, Lagos'], ['kano', '3 Brigade, Kano'], ['portharcourt', '6 Division, Port Harcourt'], ['enugu', '82 Division, Enugu'], ['ibadan', '2 Division, Ibadan']],
        navy: [['lagos', 'Western Naval Command, Apapa'], ['portharcourt', 'NNS Pathfinder, Port Harcourt']],
        airforce: [['abuja', 'NAF Base Abuja'], ['kano', 'NAF Base Kano'], ['portharcourt', 'NAF Base Port Harcourt']],
      },
      overseas: {
        army: [['Gambia', 'ECOWAS Mission in The Gambia (ECOMIG)', 1, false], ['Guinea-Bissau', 'ECOWAS stabilisation force', 1, false], ['Lebanon', 'UNIFIL', 1, false]],
        navy: [['Gulf of Guinea', 'Operation Prosperity (anti-piracy)', 1, false]],
        airforce: [['Chad', 'Multinational Joint Task Force air component', 1, false]],
      },
    },
    MIL_SPECIAL: { drill: { names: 'Recruit instructor, Depot NA' }, recruiter: { names: 'Army recruitment officer' }, honorGuard: { names: 'Guards Brigade', desc: 'The Presidential Villa and Armed Forces Remembrance Day.' }, rotc: { names: 'Instructor, Nigerian Defence Academy' }, joint: { names: 'Staff officer, Defence Headquarters' }, fellow: { names: 'Fellow, National Institute for Policy and Strategic Studies (Kuru)' }, commissioning: 'Short Service Combatant course from the ranks', chiefs: { army: 'Chief of Army Staff', navy: 'Chief of the Naval Staff', airforce: 'Chief of the Air Staff' }, chairman: 'Chief of Defence Staff' },
    PME: { enlisted: ['Junior NCO course', 'Senior NCO course', 'Warrant officers\' course', 'Regimental Sergeant Major course', 'Command warrant officers\' course'], officer: ['Young Officers\' course', 'Armed Forces Command and Staff College, Jaji', 'National Defence College'] },
    QUALS: { airborne: 'Airborne course', rangerSchool: 'Special Forces course', jumpmaster: 'Jumpmaster course', pathfinder: 'Reconnaissance course', combatDiver: 'Special Boat Service course', dli: 'Language course', instructor: 'Instructors\' course', sere: 'Survival course', expertBadge: 'Counter-insurgency course' },
    SOF: {
      ranger: sf('Nigerian Army Special Forces', 'the Special Forces selection course', 'Special Forces Command, Buni Yadi', 'special forces badge', 'Counter-insurgency raids in the North East.', ['a raid on an insurgent camp in Sambisa Forest', 'a hostage rescue in the North West']),
      seal: sf('Nigerian Navy Special Boat Service', 'the SBS selection course', 'Special Boat Service, Lagos', 'SBS badge', 'Maritime special operations in the Niger Delta and the Gulf of Guinea.', ['an anti-piracy boarding in the Gulf of Guinea']),
    },
    MIL_UNITS: { ground: ['7 Division (Maiduguri)', '1 Division (Kaduna)', '82 Division', 'Guards Brigade'], naval: ['NNS Aradu', 'NNS Unity', 'NNS Centenary'], air: ['Tactical Air Command', 'Mobility Command'] },
    MIL_SUMMARY: 'a summary trial before your commanding officer (Armed Forces Act)',
    SERVICE_TERMS: { maxYears: { enlisted: 35, officer: 35 }, ages: { enlisted: 56, officer: 60, flag: 60 }, name: 'engagement' },
    MILITARY_JUSTICE: { code: 'the Armed Forces Act', court: 'a General Court-Martial', prison: 'a military detention centre', counsel: 'Defending officer' },
    VETTING: { form: 'DSS security vetting', publicTrust: 'Restricted', secret: 'Secret', topSecret: 'Top Secret' },
    CAMPUS: null,
    ACADEMY_NAMES: { army: 'the Nigerian Defence Academy, Kaduna', navy: 'the Nigerian Defence Academy', airforce: 'the Nigerian Defence Academy' },
    THEATERS: [
      { id: 'northEast', name: 'counter-insurgency operations in the North East (Operation Hadin Kai)', adversary: 'insurgents', intensity: 2, home: 0.4, weight: 40, internal: true },
      { id: 'northWest', name: 'operations against armed bandits in the North West', adversary: 'armed bandits', intensity: 1, home: 0.4, weight: 25, internal: true },
      { id: 'delta', name: 'operations against militants in the Niger Delta', adversary: 'militants', intensity: 1, home: 0.3, weight: 15, internal: true },
    ],
    WAR_START_CHANCE: 0.02,
    MEDALS: {
      moh: { name: 'Distinguished Gallantry Medal', ribbon: R('#008751', '#ffffff', '#008751') }, serviceCross: { name: 'Field Command Medal of Honour' }, silverStar: { name: 'Distinguished Service Star' },
      dsm: { name: 'Grand Service Star' }, legionOfMerit: { name: 'Meritorious Service Star' }, bronzeStar: { name: 'Commendation for Gallantry' },
      purpleHeart: null, msm: { name: 'Defence Service Medal' }, commendation: { name: 'Chief of Army Staff commendation' }, achievement: { name: 'Commander\'s commendation' },
      combatAction: null, goodConduct: { name: 'Long Service and Good Conduct Medal' }, humanitarian: null, expeditionary: { name: 'Operation Hadin Kai campaign medal' }, ndsm: { name: 'National Service Medal' },
    },
    // The National Honours: the Order of the Niger and the Order of the Federal Republic.
    ORDERS: {
      minAge: 35,
      tiers: [
        { id: 'MON', name: 'Member of the Order of the Niger (MON)', min: 40, ribbon: R('#008751', '#ffffff', '#008751') },
        { id: 'OON', name: 'Officer of the Order of the Niger (OON)', min: 80, ribbon: R('#008751', '#ffffff', '#008751') },
        { id: 'CON', name: 'Commander of the Order of the Niger (CON)', min: 130, ribbon: R('#008751', '#ffd700', '#008751') },
        { id: 'CFR', name: 'Commander of the Order of the Federal Republic (CFR)', min: 190, ribbon: R('#008751', '#ffd700', '#008751') },
        { id: 'GCON', name: 'Grand Commander of the Order of the Niger (GCON)', min: 260, ribbon: R('#008751', '#ffd700', '#008751') },
      ],
    },
    PARDON: 'the President (prerogative of mercy)',
    COMBAT_TEMPO: 0.6,
    MIL_PENSIONS: { name: 'Military Pensions Board pension', rate: 0.025, cap: 0.8, vest: 15, immediate: { enlisted: 15, officer: 15 }, deferredAge: 60 },
    DIRECT_ENTRY: {
      police: [
        { id: 'asp', name: 'Cadet Assistant Superintendent of Police (graduate entry)', levelId: 'captain', education: 'bachelor', maxAge: 28, odds: 0.08, school: 'the Police Academy, Wudil' },
        { id: 'inspector', name: 'Cadet Inspector (direct entry)', levelId: 'lieutenant', education: 'highschool', maxAge: 25, odds: 0.15, school: 'a Police College' },
      ],
    },
    BENCHES: {
      route: 'appointed', appointedBy: 'the National Judicial Council', retire: 70,
      lay: { id: 'customary', name: 'Customary Court member', icon: '🤝', allowance: 0, minAge: 30, maxAge: 70, noLaw: true, desc: 'Lay members of customary and area courts hear family and land matters under customary law.' },
      ladder: [
        { id: 'magistrate', name: 'Magistrate', icon: '🔨', salary: 15000, minYears: 5, entry: true },
        { id: 'high', name: 'Judge of the State High Court', icon: '⚖️', salary: 30000, minYears: 10, entry: true },
        { id: 'appeal', name: 'Justice of the Court of Appeal', icon: '📜', salary: 40000, minYears: 12 },
        { id: 'supreme', name: 'Justice of the Supreme Court of Nigeria', icon: '🏛️', salary: 55000, minYears: 15 },
      ],
    },
  },
};
