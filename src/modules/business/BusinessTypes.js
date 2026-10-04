/**
 * Business types. Licensed trades and professions are gated through the
 * credential registry; everything is in today's dollars at "scale 1"
 * (a typical single-location small business).
 *
 *   credentials  anyOf: you must hold one of these
 *   cost         startup cost (equipment, build-out, first-year working capital)
 *   revenue      annual revenue at full ramp, average quality and reputation
 *   cogs         cost of goods / materials / agent splits as a share of revenue
 *   staff, wage  employees and average loaded wage
 *   rent, insurance  annual fixed costs (rent scales with local cost of living)
 *   cyclical     0–1: how hard a recession hits demand
 *   inspection   'health' (food) or 'board' (licensing board) or null
 *   professions  career experience that makes you a better operator
 *   startup      venture-scale tech startup (ARR growth model, VC eligible)
 *   staffing     which careers staff which departments (see org/OrgTypes businessOrgType);
 *                default: operations by the first related career + a front office
 *   sizes        which SIZE_OPTIONS you can open at (default: all; capital-heavy types: standard only)
 *
 * The career → business mapping is derived from `professions` (businessesFor).
 */
export const BUSINESS_TYPES = {
  foodTruck: { name: 'Food Truck', icon: '🚚', credentials: ['servSafe'], cost: 90000, revenue: 260000, cogs: 0.32, staff: 3, wage: 32000, rent: 12000, insurance: 8000, cyclical: 0.7, inspection: 'health', professions: ['culinary', 'hospitality'] },
  restaurant: { staffing: { kitchen: { name: 'Kitchen', occupations: ['culinary'], head: 'Executive Chef' }, front: { name: 'Front of House', occupations: ['hospitality'], head: 'Front of House Manager', minStaff: 6 } }, sizes: ['standard', 'large'], name: 'Restaurant', icon: '🍽️', credentials: ['servSafe'], minExperience: 3, cost: 400000, revenue: 1200000, cogs: 0.32, staff: 18, wage: 30000, rent: 100000, insurance: 20000, cyclical: 0.9, inspection: 'health', professions: ['culinary', 'hospitality'] },
  salon: { name: 'Hair Salon', icon: '💇', credentials: ['cosmetologyLicense'], cost: 70000, revenue: 350000, cogs: 0.12, staff: 5, wage: 35000, rent: 36000, insurance: 6000, cyclical: 0.5, inspection: 'board', professions: ['cosmetology'] },
  retail: { name: 'Retail Store', icon: '🛍️', credentials: [], cost: 150000, revenue: 700000, cogs: 0.55, staff: 6, wage: 30000, rent: 60000, insurance: 8000, cyclical: 0.8, inspection: null, professions: ['retail'] },
  electrical: { name: 'Electrical Contractor', icon: '⚡', credentials: ['masterElectrician'], cost: 60000, revenue: 1150000, cogs: 0.4, staff: 6, wage: 65000, rent: 30000, insurance: 30000, cyclical: 0.8, inspection: 'board', professions: ['trades'] },
  plumbing: { name: 'Plumbing Contractor', icon: '🚰', credentials: ['masterPlumber'], cost: 60000, revenue: 1050000, cogs: 0.38, staff: 6, wage: 62000, rent: 28000, insurance: 28000, cyclical: 0.6, inspection: 'board', professions: ['plumbing'] },
  trucking: { name: 'Trucking Company', icon: '🚛', credentials: ['cdlA'], cost: 220000, revenue: 600000, cogs: 0.38, staff: 3, wage: 60000, rent: 15000, insurance: 40000, cyclical: 0.9, inspection: null, professions: ['trucking'] },
  lawFirm: { staffing: { attorneys: { name: 'Attorneys', occupations: ['law'], head: 'Managing Partner' }, support: { name: 'Paralegals & Legal Support', occupations: ['legalSupport'], head: 'Office Administrator', minStaff: 3 } }, name: 'Law Firm', icon: '⚖️', credentials: ['barLicense'], cost: 50000, revenue: 600000, cogs: 0.05, staff: 4, wage: 70000, rent: 60000, insurance: 15000, cyclical: 0.3, inspection: 'board', professions: ['law', 'prosecution', 'publicDefender'] },
  practice: { staffing: { clinical: { name: 'Physicians & PAs', occupations: ['medical', 'physicianAssistant'], head: 'Medical Director' }, nursing: { name: 'Nursing', occupations: ['nursing'], head: 'Nurse Manager', minStaff: 4 }, office: { name: 'Practice Office', occupations: ['corporate'], head: 'Practice Manager', minStaff: 6 } }, name: 'Private Medical Practice', icon: '🩺', credentials: ['medicalLicense', 'np'], cost: 300000, revenue: 1200000, cogs: 0.1, staff: 9, wage: 55000, rent: 100000, insurance: 60000, cyclical: 0.2, inspection: 'board', professions: ['medical', 'nursing'] },
  cpaFirm: { staffing: { audit: { name: 'Audit & Tax', occupations: ['accounting'], head: 'Managing Partner' }, office: { name: 'Front Office', occupations: ['corporate'], head: 'Office Manager', minStaff: 6 } }, name: 'CPA Firm', icon: '🧮', credentials: ['cpa'], cost: 30000, revenue: 500000, cogs: 0.05, staff: 4, wage: 60000, rent: 40000, insurance: 12000, cyclical: 0.3, inspection: 'board', professions: ['accounting'] },
  brokerage: { name: 'Real Estate Brokerage', icon: '🏘️', credentials: ['brokerLicense'], cost: 40000, revenue: 700000, cogs: 0.55, staff: 3, wage: 45000, rent: 40000, insurance: 10000, cyclical: 1.0, inspection: 'board', professions: ['realestate'] },
  propertyMgmt: { name: 'Property Management Company', icon: '🏢', credentials: ['realEstate'], cost: 20000, revenue: 300000, cogs: 0.1, staff: 3, wage: 45000, rent: 24000, insurance: 8000, cyclical: 0.3, inspection: null, professions: ['propertyManagement', 'realestate'] },
  dentalPractice: { staffing: { clinical: { name: 'Dentists & Hygienists', occupations: ['dentistry'], head: 'Clinical Director' }, office: { name: 'Front Office', occupations: ['corporate'], head: 'Office Manager', minStaff: 4 } }, sizes: ['standard', 'large'], name: 'Dental Practice', icon: '🦷', credentials: ['dentalLicense'], cost: 500000, revenue: 1100000, cogs: 0.07, staff: 7, wage: 55000, rent: 70000, insurance: 25000, cyclical: 0.3, inspection: 'board', professions: ['dentistry'] },
  vetClinic: { sizes: ['standard', 'large'], name: 'Veterinary Clinic', icon: '🐾', credentials: ['vetLicense'], cost: 350000, revenue: 900000, cogs: 0.25, staff: 7, wage: 40000, rent: 50000, insurance: 15000, cyclical: 0.4, inspection: 'board', professions: ['veterinary'] },
  hvacContractor: { name: 'HVAC Contractor', icon: '❄️', credentials: ['epa608'], minExperience: 4, cost: 70000, revenue: 950000, cogs: 0.42, staff: 6, wage: 55000, rent: 25000, insurance: 25000, cyclical: 0.6, inspection: null, professions: ['hvac'] },
  autoShop: { name: 'Auto Repair Shop', icon: '🔧', credentials: ['ase'], cost: 150000, revenue: 650000, cogs: 0.45, staff: 4, wage: 48000, rent: 45000, insurance: 12000, cyclical: 0.4, inspection: null, professions: ['automotive'] },
  gym: { sizes: ['standard', 'large'], name: 'Fitness Gym', icon: '🏋️', credentials: [], cost: 350000, revenue: 650000, cogs: 0.05, staff: 9, wage: 32000, rent: 140000, insurance: 15000, cyclical: 0.6, inspection: null, professions: ['hospitality', 'retail'] },
  cleaning: { name: 'Cleaning Service', icon: '🧽', credentials: [], cost: 25000, revenue: 340000, cogs: 0.08, staff: 6, wage: 30000, rent: 6000, insurance: 10000, cyclical: 0.5, inspection: null, professions: ['hospitality', 'propertyManagement'] },
  tutoring: { name: 'Tutoring Center', icon: '📚', credentials: [], cost: 80000, revenue: 320000, cogs: 0.05, staff: 5, wage: 34000, rent: 36000, insurance: 5000, cyclical: 0.3, inspection: null, professions: ['education', 'university'] },
  techStartup: { staffing: { engineering: { name: 'Engineering', occupations: ['tech'], head: 'VP of Engineering' }, product: { name: 'Product & Design', occupations: ['corporate'], head: 'Head of Product', minStaff: 8 }, office: { name: 'Operations', occupations: ['corporate'], head: 'Head of Operations', minStaff: 15 } }, sizes: ['standard'], name: 'Tech Startup', icon: '🚀', credentials: [], cost: 25000, revenue: 0, cogs: 0.2, staff: 0, wage: 140000, rent: 6000, insurance: 2000, cyclical: 0.6, inspection: null, professions: ['tech', 'engineering'], startup: true },
  // Businesses grown out of other careers.
  securityCompany: { name: 'Security Company', icon: '🛡️', credentials: ['guardCard'], cost: 40000, revenue: 900000, cogs: 0.05, staff: 14, wage: 38000, rent: 20000, insurance: 40000, cyclical: 0.4, inspection: 'board', professions: ['privateSecurity', 'privatePolice', 'police', 'sheriff', 'jail', 'corrections'],
    staffing: { field: { name: 'Security Operations', occupations: ['privateSecurity'], head: 'Operations Manager' }, office: { name: 'Front Office', occupations: ['corporate'], head: 'Office Manager', minStaff: 8 } } },
  homeHealth: { name: 'Home Health Agency', icon: '🏠', credentials: ['rn', 'np'], cost: 80000, revenue: 1100000, cogs: 0.05, staff: 15, wage: 45000, rent: 24000, insurance: 30000, cyclical: 0.1, inspection: 'board', professions: ['nursing', 'travelNursing', 'ems'],
    staffing: { clinical: { name: 'Clinical Services', occupations: ['nursing'], head: 'Director of Nursing' }, office: { name: 'Intake & Billing', occupations: ['corporate'], head: 'Administrator', minStaff: 6 } } },
  counselingPractice: { name: 'Counseling Practice', icon: '🛋️', credentials: ['lcsw'], cost: 15000, revenue: 350000, cogs: 0.05, staff: 3, wage: 65000, rent: 30000, insurance: 6000, cyclical: 0.2, inspection: 'board', professions: ['socialWork', 'cps'] },
  ptClinic: { name: 'Physical Therapy Clinic', icon: '🦵', credentials: ['ptLicense'], cost: 200000, revenue: 900000, cogs: 0.05, staff: 7, wage: 70000, rent: 60000, insurance: 20000, cyclical: 0.2, inspection: 'board', professions: ['physicalTherapy'] },
  pharmacyStore: { name: 'Independent Pharmacy', icon: '💊', credentials: ['pharmacistLicense'], cost: 450000, revenue: 3000000, cogs: 0.75, staff: 8, wage: 60000, rent: 70000, insurance: 20000, cyclical: 0.2, inspection: 'board', professions: ['pharmacy'], sizes: ['standard', 'large'],
    staffing: { pharmacy: { name: 'Pharmacy', occupations: ['pharmacy'], head: 'Pharmacist in Charge' }, front: { name: 'Front Store', occupations: ['retail'], head: 'Store Manager', minStaff: 5 } } },
  consulting: { name: 'Consulting Firm', icon: '📊', credentials: [], cost: 15000, revenue: 450000, cogs: 0.08, staff: 2, wage: 95000, rent: 18000, insurance: 6000, cyclical: 0.6, inspection: null, professions: ['corporate', 'actuary', 'finance', 'insurance', 'legislativeStaff', 'municipalAdmin', 'regulatory'] },
  engineeringFirm: { name: 'Engineering Firm', icon: '📐', credentials: ['pe'], cost: 60000, revenue: 1300000, cogs: 0.1, staff: 8, wage: 95000, rent: 50000, insurance: 30000, cyclical: 0.7, inspection: 'board', professions: ['engineering', 'dot', 'publicWorks', 'planning'] },
  softwareShop: { name: 'Software Consultancy', icon: '💻', credentials: [], cost: 20000, revenue: 900000, cogs: 0.08, staff: 5, wage: 120000, rent: 30000, insurance: 8000, cyclical: 0.6, inspection: null, professions: ['tech', 'intelligence'],
    staffing: { engineering: { name: 'Engineering', occupations: ['tech'], head: 'Engineering Manager' }, office: { name: 'Sales & Operations', occupations: ['corporate'], head: 'Operations Manager', minStaff: 8 } } },
  courier: { name: 'Courier & Logistics Company', icon: '📦', credentials: ['driverLicense'], cost: 60000, revenue: 500000, cogs: 0.25, staff: 6, wage: 38000, rent: 15000, insurance: 25000, cyclical: 0.7, inspection: null, professions: ['trucking', 'paratransit', 'transit', 'postal', 'schoolBus'],
    staffing: { drivers: { name: 'Drivers & Dispatch', occupations: ['paratransit', 'trucking'], head: 'Operations Manager' }, office: { name: 'Front Office', occupations: ['corporate'], head: 'Office Manager', minStaff: 8 } } },
  privateTutoring: { name: 'Private Tutoring', icon: '✏️', credentials: [], cost: 2000, revenue: 70000, cogs: 0.05, staff: 0, wage: 35000, rent: 0, insurance: 1000, cyclical: 0.3, inspection: null, professions: ['education', 'university'], sizes: ['solo', 'standard'] },
  testPrep: { name: 'Test Prep Company', icon: '📝', credentials: [], cost: 10000, revenue: 180000, cogs: 0.05, staff: 2, wage: 40000, rent: 12000, insurance: 3000, cyclical: 0.3, inspection: null, professions: ['education', 'university'] },
  privateSchool: { name: 'Private School', icon: '🏫', credentials: ['teachingCert'], minExperience: 5, cost: 2500000, revenue: 4500000, cogs: 0.1, staff: 45, wage: 58000, rent: 400000, insurance: 60000, cyclical: 0.4, inspection: 'board', professions: ['education', 'university'], sizes: ['standard'],
    staffing: { instruction: { name: 'Faculty', occupations: ['education'], head: 'Academic Dean' }, studentServices: { name: 'Counseling & Student Services', occupations: ['socialWork'], head: 'Director of Student Services', minStaff: 20 }, office: { name: 'Business Office', occupations: ['corporate'], head: 'Business Manager' } } },
  constructionCo: { name: 'Construction Company', icon: '🏗️', credentials: ['oshaSafety'], minExperience: 4, cost: 150000, revenue: 2400000, cogs: 0.45, staff: 14, wage: 62000, rent: 40000, insurance: 70000, cyclical: 1.0, inspection: null, professions: ['carpentry', 'ironworking', 'craneOperator', 'welding', 'trades', 'engineering'],
    staffing: { field: { name: 'Field Crews', occupations: ['carpentry', 'welding', 'ironworking'], head: 'Superintendent' }, engineering: { name: 'Estimating & Project Management', occupations: ['engineering'], head: 'Director of Projects', minStaff: 10 }, office: { name: 'Front Office', occupations: ['corporate'], head: 'Office Manager', minStaff: 8 } } },
  piAgency: { name: 'Private Investigation Agency', icon: '🕵️', credentials: ['piLicense'], cost: 15000, revenue: 300000, cogs: 0.05, staff: 2, wage: 55000, rent: 15000, insurance: 10000, cyclical: 0.3, inspection: 'board', professions: ['privateInvestigator', 'police', 'sheriff', 'fbi', 'oig'] },
  insuranceAgency: { name: 'Insurance Agency', icon: '📄', credentials: ['insuranceProducer'], cost: 25000, revenue: 400000, cogs: 0.05, staff: 3, wage: 45000, rent: 24000, insurance: 8000, cyclical: 0.3, inspection: 'board', professions: ['insurance', 'realestate', 'finance'] },
  catering: { name: 'Catering Company', icon: '🥘', credentials: ['servSafe'], cost: 60000, revenue: 450000, cogs: 0.35, staff: 5, wage: 32000, rent: 20000, insurance: 8000, cyclical: 0.7, inspection: 'health', professions: ['culinary', 'hospitality', 'cruise'] },
  charterOperator: { name: 'Air Charter Operator', icon: '🛩️', credentials: ['commercialPilot'], minExperience: 5, cost: 2500000, revenue: 2200000, cogs: 0.45, staff: 6, wage: 90000, rent: 120000, insurance: 150000, cyclical: 0.9, inspection: 'board', professions: ['charterAviation', 'aviation'], sizes: ['standard'] },
  fishingBoat: { name: 'Fishing Vessel', icon: '🎣', credentials: ['fishingMaster'], minExperience: 3, cost: 600000, revenue: 700000, cogs: 0.3, staff: 4, wage: 50000, rent: 20000, insurance: 40000, cyclical: 0.4, inspection: null, professions: ['fishing', 'merchantMarine'], sizes: ['standard'] },
};

/**
 * Size at opening: a solo/home-based start, a standard shop, or a bigger
 * launch for experienced owners. Scale multiplies staff, rent and revenue
 * (BusinessEngine); cost scales a bit less than proportionally.
 */
export const SIZE_OPTIONS = {
  solo: { label: 'Solo / home-based', scale: 0.35, cost: 0.3 },
  standard: { label: 'Standard', scale: 1, cost: 1 },
  large: { label: 'Large launch', scale: 2, cost: 1.9, minExperience: 5 },
};
export const sizesFor = (type) => type.sizes ?? (type.cost >= 1000000 || type.startup ? ['standard'] : Object.keys(SIZE_OPTIONS));
export const startupCostFor = (type, size = 'standard') => Math.round(type.cost * (SIZE_OPTIONS[size]?.cost ?? 1));

/** Businesses a career leads to (any business that lists it as related experience). */
export const businessesFor = (professionId) => Object.keys(BUSINESS_TYPES).filter((id) => BUSINESS_TYPES[id].professions.includes(professionId));

/** Legal structure: liability protection, taxes and paperwork. */
export const ENTITIES = {
  sole: { name: 'Sole Proprietorship', icon: '🧍', liability: false, admin: 0, passThrough: true, payroll: false, desc: 'No paperwork. Profit is taxed as yours, plus 15.3% self-employment tax. You are personally liable for every debt.' },
  llc: { name: 'LLC', icon: '🛡️', liability: true, admin: 500, passThrough: true, payroll: false, desc: 'Same taxes as a sole proprietor, but your personal assets are shielded from business debts (except ones you personally guarantee).' },
  scorp: { name: 'S Corporation', icon: '📑', liability: true, admin: 2500, passThrough: true, payroll: true, desc: 'You pay yourself a reasonable salary (payroll tax applies); the rest passes through without payroll tax. Investors can\'t buy in.' },
  ccorp: { name: 'C Corporation', icon: '🏛️', liability: true, admin: 4000, passThrough: false, payroll: true, desc: '21% corporate tax, then dividends are taxed again. Required for venture capital and an IPO. Stock held 5+ years may sell tax-free (QSBS).' },
};

/** Startup funding rounds: what traction investors want, how much they put in, and what they take. */
export const ROUNDS = [
  { id: 'seed', name: 'Seed round', minArr: 0, minGrowth: 0, raise: [500000, 2000000], dilution: [0.15, 0.25] },
  { id: 'seriesA', name: 'Series A', minArr: 1000000, minGrowth: 1.0, raise: [5000000, 15000000], dilution: [0.18, 0.25] },
  { id: 'seriesB', name: 'Series B', minArr: 5000000, minGrowth: 0.7, raise: [20000000, 40000000], dilution: [0.15, 0.22] },
  { id: 'seriesC', name: 'Series C', minArr: 20000000, minGrowth: 0.5, raise: [50000000, 120000000], dilution: [0.12, 0.18] },
];

/** SBA 7(a): 10% down, 10-year term, about prime + 2.75%. Personal guarantee required. */
export const SBA = { downPayment: 0.1, years: 10, rate: 0.105, minScore: 650, max: 5000000 };

/** Marketing levels: share of revenue spent and the demand lift it buys. */
export const MARKETING = [
  { label: 'None', share: 0, lift: 0.9 },
  { label: 'Light', share: 0.02, lift: 1.0 },
  { label: 'Steady', share: 0.05, lift: 1.07 },
  { label: 'Aggressive', share: 0.09, lift: 1.12 },
];
