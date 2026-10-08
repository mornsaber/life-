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
  retail: { name: 'Retail Store', icon: '🛍️', credentials: [], cost: 150000, revenue: 700000, cogs: 0.53, staff: 6, wage: 30000, rent: 60000, insurance: 8000, cyclical: 0.8, inspection: null, professions: ['retail'] },
  electrical: { name: 'Electrical Contractor', icon: '⚡', credentials: ['masterElectrician'], cost: 60000, revenue: 1150000, cogs: 0.4, staff: 6, wage: 65000, rent: 30000, insurance: 30000, cyclical: 0.8, inspection: 'board', professions: ['trades'] },
  plumbing: { name: 'Plumbing Contractor', icon: '🚰', credentials: ['masterPlumber'], cost: 60000, revenue: 1050000, cogs: 0.38, staff: 6, wage: 62000, rent: 28000, insurance: 28000, cyclical: 0.6, inspection: 'board', professions: ['plumbing'] },
  trucking: { name: 'Trucking Company', icon: '🚛', credentials: ['cdlA'], cost: 220000, revenue: 600000, cogs: 0.38, staff: 3, wage: 60000, rent: 15000, insurance: 40000, cyclical: 0.9, inspection: null, professions: ['trucking'] },
  lawFirm: { staffing: { attorneys: { name: 'Attorneys', occupations: ['law'], head: 'Managing Partner' }, support: { name: 'Paralegals & Legal Support', occupations: ['legalSupport'], head: 'Office Administrator', minStaff: 3 } }, name: 'Law Firm', icon: '⚖️', credentials: ['barLicense'], cost: 50000, revenue: 600000, cogs: 0.05, staff: 4, wage: 70000, rent: 60000, insurance: 15000, cyclical: 0.3, inspection: 'board', professions: ['law', 'prosecution', 'publicDefender'] },
  practice: { staffing: { clinical: { name: 'Physicians & PAs', occupations: ['medical', 'physicianAssistant'], head: 'Medical Director' }, nursing: { name: 'Nursing', occupations: ['nursing'], head: 'Nurse Manager', minStaff: 4 }, office: { name: 'Practice Office', occupations: ['corporate'], head: 'Practice Manager', minStaff: 6 } }, name: 'Private Medical Practice', icon: '🩺', credentials: ['medicalLicense', 'np'], cost: 300000, revenue: 1200000, cogs: 0.1, staff: 9, wage: 55000, rent: 100000, insurance: 60000, cyclical: 0.2, inspection: 'board', professions: ['medical', 'nursing'] },
  cpaFirm: { staffing: { audit: { name: 'Audit & Tax', occupations: ['accounting'], head: 'Managing Partner' }, office: { name: 'Front Office', occupations: ['corporate'], head: 'Office Manager', minStaff: 6 } }, name: 'CPA Firm', icon: '🧮', credentials: ['cpa'], cost: 30000, revenue: 500000, cogs: 0.05, staff: 4, wage: 60000, rent: 40000, insurance: 12000, cyclical: 0.3, inspection: 'board', professions: ['accounting'] },
  brokerage: { name: 'Real Estate Brokerage', icon: '🏘️', credentials: ['brokerLicense'], cost: 40000, revenue: 700000, cogs: 0.55, staff: 3, wage: 45000, rent: 40000, insurance: 10000, cyclical: 1.0, inspection: 'board', professions: ['realestate'] },
  propertyMgmt: { name: 'Property Management Company', icon: '🏢', credentials: ['realEstate'], cost: 20000, revenue: 300000, cogs: 0.1, staff: 3, wage: 45000, rent: 24000, insurance: 8000, cyclical: 0.3, inspection: null, professions: ['propertyManagement', 'realestate'] },
  dentalPractice: { staffing: { clinical: { name: 'Dentists & Hygienists', occupations: ['dentistry', 'dentalHygiene'], head: 'Clinical Director' }, office: { name: 'Front Office', occupations: ['corporate'], head: 'Office Manager', minStaff: 4 } }, sizes: ['standard', 'large'], name: 'Dental Practice', icon: '🦷', credentials: ['dentalLicense'], cost: 500000, revenue: 1100000, cogs: 0.07, staff: 7, wage: 55000, rent: 70000, insurance: 25000, cyclical: 0.3, inspection: 'board', professions: ['dentistry'] },
  vetClinic: { sizes: ['standard', 'large'], name: 'Veterinary Clinic', icon: '🐾', credentials: ['vetLicense'], cost: 350000, revenue: 900000, cogs: 0.25, staff: 7, wage: 40000, rent: 50000, insurance: 15000, cyclical: 0.4, inspection: 'board', professions: ['veterinary'] },
  hvacContractor: { name: 'HVAC Contractor', icon: '❄️', credentials: ['epa608'], minExperience: 4, cost: 70000, revenue: 1050000, cogs: 0.42, staff: 6, wage: 55000, rent: 25000, insurance: 25000, cyclical: 0.6, inspection: null, professions: ['hvac'] },
  autoShop: { name: 'Auto Repair Shop', icon: '🔧', credentials: ['ase'], cost: 150000, revenue: 650000, cogs: 0.45, staff: 4, wage: 48000, rent: 45000, insurance: 12000, cyclical: 0.4, inspection: null, professions: ['automotive'] },
  gym: { sizes: ['standard', 'large'], staffing: { floor: { name: 'Training Floor', occupations: ['fitness'], head: 'Fitness Manager' }, front: { name: 'Front Desk & Sales', occupations: ['sales'], head: 'Membership Manager', minStaff: 6 } }, name: 'Fitness Gym', icon: '🏋️', credentials: [], cost: 350000, revenue: 650000, cogs: 0.05, staff: 9, wage: 32000, rent: 140000, insurance: 15000, cyclical: 0.6, inspection: null, professions: ['fitness', 'hospitality', 'retail'] },
  cleaning: { name: 'Cleaning Service', icon: '🧽', credentials: [], cost: 25000, revenue: 340000, cogs: 0.08, staff: 6, wage: 30000, rent: 6000, insurance: 10000, cyclical: 0.5, inspection: null, professions: ['hospitality', 'propertyManagement'] },
  tutoring: { name: 'Tutoring Center', icon: '📚', credentials: [], cost: 80000, revenue: 320000, cogs: 0.05, staff: 5, wage: 34000, rent: 36000, insurance: 5000, cyclical: 0.3, inspection: null, professions: ['education', 'university'] },
  techStartup: { staffing: { engineering: { name: 'Engineering', occupations: ['tech'], head: 'VP of Engineering' }, product: { name: 'Product & Design', occupations: ['corporate'], head: 'Head of Product', minStaff: 8 }, office: { name: 'Operations', occupations: ['corporate'], head: 'Head of Operations', minStaff: 15 } }, sizes: ['standard'], name: 'Tech Startup', icon: '🚀', credentials: [], cost: 25000, revenue: 0, cogs: 0.2, staff: 0, wage: 140000, rent: 6000, insurance: 2000, cyclical: 0.6, inspection: null, professions: ['tech', 'engineering'], startup: true },
  // Businesses grown out of other careers.
  securityCompany: { name: 'Security Company', icon: '🛡️', credentials: ['guardCard'], cost: 40000, revenue: 900000, cogs: 0.05, staff: 14, wage: 38000, rent: 20000, insurance: 40000, cyclical: 0.4, inspection: 'board', professions: ['privateSecurity', 'privatePolice', 'privateMilitary', 'police', 'sheriff', 'jail', 'corrections'],
    staffing: { field: { name: 'Security Operations', occupations: ['privateSecurity'], head: 'Operations Manager' }, office: { name: 'Front Office', occupations: ['corporate'], head: 'Office Manager', minStaff: 8 } } },
  homeHealth: { name: 'Home Health Agency', icon: '🏠', credentials: ['rn', 'np'], cost: 80000, revenue: 1100000, cogs: 0.05, staff: 15, wage: 45000, rent: 24000, insurance: 30000, cyclical: 0.1, inspection: 'board', professions: ['nursing', 'travelNursing', 'ems'],
    staffing: { clinical: { name: 'Clinical Services', occupations: ['nursing'], head: 'Director of Nursing' }, office: { name: 'Intake & Billing', occupations: ['corporate'], head: 'Administrator', minStaff: 6 } } },
  counselingPractice: { name: 'Counseling Practice', icon: '🛋️', credentials: ['lcsw', 'lpc', 'psychLicense'], cost: 15000, revenue: 350000, cogs: 0.05, staff: 3, wage: 65000, rent: 30000, insurance: 6000, cyclical: 0.2, inspection: 'board', professions: ['socialWork', 'cps', 'counseling', 'psychology'] },
  ptClinic: { name: 'Physical Therapy Clinic', icon: '🦵', credentials: ['ptLicense', 'otLicense', 'cccSlp'], cost: 200000, revenue: 900000, cogs: 0.05, staff: 7, wage: 70000, rent: 60000, insurance: 20000, cyclical: 0.2, inspection: 'board', professions: ['physicalTherapy', 'occupationalTherapy', 'speechPathology'] },
  pharmacyStore: { name: 'Independent Pharmacy', icon: '💊', credentials: ['pharmacistLicense'], cost: 450000, revenue: 3000000, cogs: 0.71, staff: 8, wage: 60000, rent: 70000, insurance: 20000, cyclical: 0.2, inspection: 'board', professions: ['pharmacy'], sizes: ['standard', 'large'],
    staffing: { pharmacy: { name: 'Pharmacy', occupations: ['pharmacy'], head: 'Pharmacist in Charge' }, front: { name: 'Front Store', occupations: ['retail'], head: 'Store Manager', minStaff: 5 } } },
  consulting: { name: 'Consulting Firm', icon: '📊', credentials: [], cost: 15000, revenue: 450000, cogs: 0.08, staff: 2, wage: 95000, rent: 18000, insurance: 6000, cyclical: 0.6, inspection: null, professions: ['corporate', 'actuary', 'finance', 'insurance', 'legislativeStaff', 'municipalAdmin', 'regulatory', 'dataScience', 'humanResources', 'marketing'] },
  engineeringFirm: { name: 'Engineering Firm', icon: '📐', credentials: ['pe'], cost: 60000, revenue: 1400000, cogs: 0.1, staff: 8, wage: 95000, rent: 50000, insurance: 30000, cyclical: 0.7, inspection: 'board', professions: ['engineering', 'dot', 'publicWorks', 'planning'] },
  softwareShop: { name: 'Software Consultancy', icon: '💻', credentials: [], cost: 20000, revenue: 1060000, cogs: 0.08, staff: 5, wage: 120000, rent: 30000, insurance: 8000, cyclical: 0.6, inspection: null, professions: ['tech', 'intelligence'],
    staffing: { engineering: { name: 'Engineering', occupations: ['tech'], head: 'Engineering Manager' }, office: { name: 'Sales & Operations', occupations: ['corporate'], head: 'Operations Manager', minStaff: 8 } } },
  courier: { name: 'Courier & Logistics Company', icon: '📦', credentials: ['driverLicense'], cost: 60000, revenue: 500000, cogs: 0.25, staff: 6, wage: 38000, rent: 15000, insurance: 25000, cyclical: 0.7, inspection: null, professions: ['trucking', 'paratransit', 'transit', 'postal', 'schoolBus'],
    staffing: { drivers: { name: 'Drivers & Dispatch', occupations: ['paratransit', 'trucking'], head: 'Operations Manager' }, office: { name: 'Front Office', occupations: ['corporate'], head: 'Office Manager', minStaff: 8 } } },
  privateTutoring: { name: 'Private Tutoring', icon: '✏️', credentials: [], cost: 2000, revenue: 70000, cogs: 0.05, staff: 0, wage: 35000, rent: 0, insurance: 1000, cyclical: 0.3, inspection: null, professions: ['education', 'university'], sizes: ['solo', 'standard'] },
  testPrep: { name: 'Test Prep Company', icon: '📝', credentials: [], cost: 10000, revenue: 180000, cogs: 0.05, staff: 2, wage: 40000, rent: 12000, insurance: 3000, cyclical: 0.3, inspection: null, professions: ['education', 'university'] },
  privateSchool: { name: 'Private School', icon: '🏫', credentials: ['teachingCert'], minExperience: 5, cost: 2500000, revenue: 4600000, cogs: 0.1, staff: 42, wage: 58000, rent: 400000, insurance: 60000, cyclical: 0.4, inspection: 'board', professions: ['education', 'university'], sizes: ['standard'],
    staffing: { instruction: { name: 'Faculty', occupations: ['education'], head: 'Academic Dean' }, studentServices: { name: 'Counseling & Student Services', occupations: ['socialWork'], head: 'Director of Student Services', minStaff: 20 }, office: { name: 'Business Office', occupations: ['corporate'], head: 'Business Manager' } } },
  constructionCo: { name: 'Construction Company', icon: '🏗️', credentials: ['oshaSafety'], minExperience: 4, cost: 150000, revenue: 2400000, cogs: 0.4, staff: 14, wage: 62000, rent: 40000, insurance: 70000, cyclical: 1.0, inspection: null, professions: ['carpentry', 'ironworking', 'craneOperator', 'welding', 'trades', 'engineering'],
    staffing: { field: { name: 'Field Crews', occupations: ['carpentry', 'welding', 'ironworking'], head: 'Superintendent' }, engineering: { name: 'Estimating & Project Management', occupations: ['engineering'], head: 'Director of Projects', minStaff: 10 }, office: { name: 'Front Office', occupations: ['corporate'], head: 'Office Manager', minStaff: 8 } } },
  piAgency: { name: 'Private Investigation Agency', icon: '🕵️', credentials: ['piLicense'], cost: 15000, revenue: 300000, cogs: 0.05, staff: 2, wage: 55000, rent: 15000, insurance: 10000, cyclical: 0.3, inspection: 'board', professions: ['privateInvestigator', 'police', 'sheriff', 'fbi', 'oig'] },
  insuranceAgency: { name: 'Insurance Agency', icon: '📄', credentials: ['insuranceProducer'], cost: 25000, revenue: 400000, cogs: 0.05, staff: 3, wage: 45000, rent: 24000, insurance: 8000, cyclical: 0.3, inspection: 'board', professions: ['insurance', 'realestate', 'finance'] },
  catering: { name: 'Catering Company', icon: '🥘', credentials: ['servSafe'], cost: 60000, revenue: 450000, cogs: 0.35, staff: 5, wage: 32000, rent: 20000, insurance: 8000, cyclical: 0.7, inspection: 'health', professions: ['culinary', 'hospitality', 'cruise'] },
  charterOperator: { name: 'Air Charter Operator', icon: '🛩️', credentials: ['commercialPilot'], minExperience: 5, cost: 2500000, revenue: 2200000, cogs: 0.45, staff: 6, wage: 90000, rent: 120000, insurance: 150000, cyclical: 0.9, inspection: 'board', professions: ['charterAviation', 'aviation'], sizes: ['standard'] },
  // Arts, business services, care and industry (WorkforceCareers).
  productionCompany: { name: 'Production Company', icon: '🎬', credentials: [], cost: 80000, revenue: 950000, cogs: 0.35, staff: 5, wage: 60000, rent: 40000, insurance: 20000, cyclical: 0.7, inspection: null, professions: ['acting', 'design', 'music'],
    staffing: { productions: { name: 'Productions', occupations: ['acting'], head: 'Head of Production' }, creative: { name: 'Art & Post-Production', occupations: ['design'], head: 'Post-Production Supervisor', minStaff: 4 } } },
  recordingStudio: { name: 'Recording Studio & Label', icon: '🎙️', credentials: [], cost: 60000, revenue: 290000, cogs: 0.15, staff: 2, wage: 50000, rent: 30000, insurance: 6000, cyclical: 0.6, inspection: null, professions: ['music'] },
  personalTraining: { name: 'Personal Training Studio', icon: '🏋️', credentials: ['cpt'], cost: 40000, revenue: 280000, cogs: 0.05, staff: 3, wage: 42000, rent: 36000, insurance: 6000, cyclical: 0.6, inspection: null, professions: ['fitness', 'athletics'] },
  marketingAgency: { name: 'Marketing Agency', icon: '📣', credentials: [], cost: 25000, revenue: 850000, cogs: 0.15, staff: 5, wage: 75000, rent: 40000, insurance: 8000, cyclical: 0.8, inspection: null, professions: ['marketing', 'design', 'sales'],
    staffing: { accounts: { name: 'Accounts & Strategy', occupations: ['marketing'], head: 'Account Director' }, creative: { name: 'Creative', occupations: ['design'], head: 'Creative Director', minStaff: 3 } } },
  staffingAgency: { name: 'Staffing Agency', icon: '🧑‍💼', credentials: [], cost: 30000, revenue: 1500000, cogs: 0.72, staff: 4, wage: 55000, rent: 24000, insurance: 15000, cyclical: 1.0, inspection: null, professions: ['humanResources', 'sales'] },
  architecturePractice: { name: 'Architecture Practice', icon: '🏛️', credentials: ['architectLicense'], cost: 50000, revenue: 1150000, cogs: 0.08, staff: 7, wage: 85000, rent: 50000, insurance: 25000, cyclical: 0.9, inspection: 'board', professions: ['architecture'] },
  opticalShop: { name: 'Optometry Practice', icon: '👓', credentials: ['odLicense'], cost: 250000, revenue: 950000, cogs: 0.3, staff: 5, wage: 45000, rent: 50000, insurance: 12000, cyclical: 0.3, inspection: 'board', professions: ['optometry'] },
  chiroClinic: { name: 'Chiropractic Clinic', icon: '🦴', credentials: ['dcLicense'], cost: 90000, revenue: 450000, cogs: 0.05, staff: 3, wage: 38000, rent: 36000, insurance: 10000, cyclical: 0.4, inspection: 'board', professions: ['chiropractic'] },
  nutritionPractice: { name: 'Nutrition Counseling Practice', icon: '🥗', credentials: ['rdn'], cost: 12000, revenue: 220000, cogs: 0.05, staff: 1, wage: 50000, rent: 18000, insurance: 3000, cyclical: 0.4, inspection: null, professions: ['dietitian'] },
  solarInstaller: { name: 'Solar Installation Company', icon: '☀️', credentials: ['nabcep', 'journeymanElectrician', 'masterElectrician'], cost: 120000, revenue: 1300000, cogs: 0.5, staff: 8, wage: 52000, rent: 24000, insurance: 30000, cyclical: 0.7, inspection: 'board', professions: ['renewableEnergy', 'trades'] },
  surveyFirm: { name: 'Land Surveying Firm', icon: '📏', credentials: ['pls'], cost: 60000, revenue: 650000, cogs: 0.08, staff: 5, wage: 58000, rent: 24000, insurance: 12000, cyclical: 0.8, inspection: 'board', professions: ['surveying'] },
  translationAgency: { name: 'Translation & Interpreting Agency', icon: '🈺', credentials: [], cost: 15000, revenue: 380000, cogs: 0.45, staff: 3, wage: 48000, rent: 15000, insurance: 4000, cyclical: 0.5, inspection: null, professions: ['interpreter'] },
  indieGameStudio: { name: 'Indie Game Studio', icon: '🎮', credentials: [], cost: 40000, revenue: 300000, cogs: 0.3, staff: 4, wage: 70000, rent: 18000, insurance: 4000, cyclical: 0.4, inspection: null, professions: ['gameDevelopment', 'tech'] },
  designStudio: { name: 'Design Studio', icon: '🎨', credentials: [], cost: 10000, revenue: 400000, cogs: 0.05, staff: 3, wage: 70000, rent: 18000, insurance: 4000, cyclical: 0.7, inspection: null, professions: ['design', 'marketing'] },
  itSecurityFirm: { name: 'Managed IT & Security Firm', icon: '🛡️', credentials: [], cost: 40000, revenue: 1100000, cogs: 0.12, staff: 6, wage: 95000, rent: 30000, insurance: 15000, cyclical: 0.4, inspection: null, professions: ['cybersecurity', 'tech', 'dataScience'] },
  daycare: { name: 'Childcare Center', icon: '🧸', credentials: ['cda'], cost: 200000, revenue: 900000, cogs: 0.1, staff: 14, wage: 34000, rent: 90000, insurance: 20000, cyclical: 0.3, inspection: 'board', professions: ['childcare', 'education'] },
  funeralHome: { name: 'Funeral Home', icon: '⚱️', credentials: ['funeralDirectorLicense'], cost: 600000, revenue: 900000, cogs: 0.36, staff: 5, wage: 50000, rent: 40000, insurance: 15000, cyclical: 0.05, inspection: 'board', professions: ['funeral'], sizes: ['standard', 'large'] },
  machineShop: { name: 'Machine Shop', icon: '🏭', credentials: [], minExperience: 4, cost: 250000, revenue: 1200000, cogs: 0.36, staff: 8, wage: 55000, rent: 50000, insurance: 20000, cyclical: 1.0, inspection: null, professions: ['manufacturing', 'welding'] },
  homeCareAgency: { name: 'Home Care Agency (Non-Medical)', icon: '🤲', credentials: [], cost: 50000, revenue: 1000000, cogs: 0.05, staff: 18, wage: 33000, rent: 20000, insurance: 25000, cyclical: 0.1, inspection: 'board', professions: ['caregiving', 'nursing'] },
  warehouse3pl: { name: 'Third-Party Logistics Warehouse', icon: '📦', credentials: ['forklift'], minExperience: 3, cost: 300000, revenue: 1600000, cogs: 0.35, staff: 15, wage: 40000, rent: 150000, insurance: 30000, cyclical: 0.9, inspection: null, professions: ['logistics', 'trucking'] },
  fishingBoat: { name: 'Fishing Vessel', icon: '🎣', credentials: ['fishingMaster'], minExperience: 3, cost: 600000, revenue: 700000, cogs: 0.3, staff: 4, wage: 50000, rent: 20000, insurance: 40000, cyclical: 0.4, inspection: null, professions: ['fishing', 'merchantMarine'], sizes: ['standard'] },
  // Fleet and crew businesses grown out of driving, EMS, trades, aviation, marine and public-safety careers (see Operations).
  ambulanceService: { name: 'Private Ambulance Company', icon: '🚑', credentials: ['emt', 'paramedic'], minExperience: 3, cost: 900000, revenue: 900000, cogs: 0.12, staff: 7, wage: 48000, rent: 40000, insurance: 70000, cyclical: 0.1, inspection: 'board', professions: ['privateEms', 'ems', 'fire'], sizes: ['standard', 'large'],
    staffing: { field: { name: 'Field Operations', occupations: ['privateEms'], head: 'Operations Manager' }, office: { name: 'Billing & Dispatch', occupations: ['corporate'], head: 'Office Manager', minStaff: 10 } } },
  nemt: { name: 'Medical Transportation (NEMT)', icon: '♿', credentials: ['driverLicense'], cost: 400000, revenue: 475000, cogs: 0.18, staff: 6, wage: 36000, rent: 15000, insurance: 30000, cyclical: 0.1, inspection: 'board', professions: ['paratransit', 'privateEms', 'caregiving', 'schoolBus'] },
  towing: { name: 'Towing & Recovery', icon: '🛻', credentials: ['cdlB', 'cdlA'], minExperience: 2, cost: 400000, revenue: 420000, cogs: 0.2, staff: 4, wage: 45000, rent: 30000, insurance: 30000, cyclical: 0.4, inspection: null, professions: ['automotive', 'trucking'] },
  busCharter: { name: 'Charter Bus Company', icon: '🚌', credentials: ['passengerEndorsement'], minExperience: 3, cost: 1000000, revenue: 960000, cogs: 0.3, staff: 5, wage: 52000, rent: 40000, insurance: 60000, cyclical: 0.8, inspection: null, professions: ['transit', 'schoolBus', 'paratransit'], startUsed: true, sizes: ['standard'] },
  movingCompany: { name: 'Moving Company', icon: '📦', credentials: ['driverLicense'], cost: 300000, revenue: 690000, cogs: 0.12, staff: 10, wage: 38000, rent: 30000, insurance: 25000, cyclical: 0.8, inspection: null, professions: ['trucking', 'logistics', 'retail'] },
  landscaping: { name: 'Landscaping & Snow Removal', icon: '🌿', credentials: [], cost: 140000, revenue: 380000, cogs: 0.15, staff: 6, wage: 36000, rent: 12000, insurance: 10000, cyclical: 0.5, inspection: null, professions: ['agriculture', 'publicWorks', 'parkService', 'forester'] },
  excavation: { name: 'Excavation Contractor', icon: '🚜', credentials: ['oshaSafety'], minExperience: 3, cost: 800000, revenue: 900000, cogs: 0.25, staff: 5, wage: 65000, rent: 25000, insurance: 45000, cyclical: 1.0, inspection: null, professions: ['craneOperator', 'oilGas', 'publicWorks', 'carpentry', 'dot'], startUsed: true },
  craneRental: { name: 'Crane Rental & Rigging', icon: '🏗️', credentials: ['nccco'], minExperience: 4, cost: 1000000, revenue: 700000, cogs: 0.15, staff: 3, wage: 85000, rent: 30000, insurance: 60000, cyclical: 1.0, inspection: null, professions: ['craneOperator', 'ironworking'], sizes: ['standard'] },
  roofing: { name: 'Roofing Contractor', icon: '🏠', credentials: ['oshaSafety'], minExperience: 2, cost: 260000, revenue: 1200000, cogs: 0.3, staff: 13, wage: 42000, rent: 20000, insurance: 50000, cyclical: 0.6, inspection: 'board', professions: ['carpentry', 'ironworking'] },
  wasteHauling: { name: 'Waste Hauling Company', icon: '🗑️', credentials: ['cdlB', 'cdlA'], cost: 900000, revenue: 780000, cogs: 0.3, staff: 4, wage: 55000, rent: 40000, insurance: 40000, cyclical: 0.3, inspection: null, professions: ['publicWorks', 'trucking', 'waterUtility'], startUsed: true },
  flightSchool: { name: 'Flight School', icon: '🛩️', credentials: ['cfi'], cost: 700000, revenue: 630000, cogs: 0.25, staff: 5, wage: 48000, rent: 50000, insurance: 40000, cyclical: 0.6, inspection: 'board', professions: ['aviation', 'charterAviation', 'airTrafficControl'], startUsed: true },
  cdlSchool: { name: 'CDL Truck Driving School', icon: '🚛', credentials: ['cdlA'], minExperience: 3, cost: 350000, revenue: 570000, cogs: 0.15, staff: 4, wage: 55000, rent: 40000, insurance: 25000, cyclical: 0.5, inspection: 'board', professions: ['trucking', 'schoolBus', 'transit'], startUsed: true },
  tourBoat: { name: 'Harbor Tour & Charter Boat', icon: '⛴️', credentials: ['mmc', 'fishingMaster', 'masterLicense'], cost: 600000, revenue: 400000, cogs: 0.2, staff: 4, wage: 42000, rent: 30000, insurance: 35000, cyclical: 0.8, inspection: 'board', professions: ['merchantMarine', 'cruise', 'fishing'], startUsed: true },
  pestControl: { name: 'Pest Control Company', icon: '🐜', credentials: [], cost: 150000, revenue: 330000, cogs: 0.15, staff: 4, wage: 42000, rent: 15000, insurance: 12000, cyclical: 0.2, inspection: 'board', professions: ['animalControl', 'agriculture', 'environmental'] },
  fireProtection: { name: 'Fire Protection & Inspection', icon: '🧯', credentials: ['fireInspector', 'ff1'], minExperience: 3, cost: 200000, revenue: 600000, cogs: 0.2, staff: 4, wage: 60000, rent: 20000, insurance: 20000, cyclical: 0.3, inspection: 'board', professions: ['fire', 'municipalAdmin', 'dot'] },
  // Office businesses grown out of other careers.
  medicalBilling: { name: 'Medical Billing Company', icon: '🧾', credentials: [], cost: 25000, revenue: 500000, cogs: 0.05, staff: 6, wage: 45000, rent: 24000, insurance: 8000, cyclical: 0.2, inspection: null, professions: ['benefitsClaims', 'insurance', 'accounting', 'nursing'] },
  answeringService: { name: 'Answering & Dispatch Service', icon: '📞', credentials: [], cost: 60000, revenue: 450000, cogs: 0.05, staff: 7, wage: 38000, rent: 24000, insurance: 6000, cyclical: 0.3, inspection: null, professions: ['dispatch', 'paratransit'] },
  bailBondsAgency: { name: 'Bail Bonds Agency', icon: '🔓', credentials: ['bailAgent'], cost: 50000, revenue: 350000, cogs: 0.2, staff: 2, wage: 45000, rent: 18000, insurance: 15000, cyclical: 0.1, inspection: 'board', professions: ['bailBonds', 'privateInvestigator', 'police', 'sheriff'] },
  homeInspection: { name: 'Home Inspection Company', icon: '🔍', credentials: ['buildingInspector'], cost: 15000, revenue: 220000, cogs: 0.05, staff: 1, wage: 55000, rent: 6000, insurance: 6000, cyclical: 0.9, inspection: null, professions: ['planning', 'carpentry', 'realestate', 'publicWorks'], sizes: ['solo', 'standard'] },
  shootingRange: { name: 'Shooting Range & Training Center', icon: '🎯', credentials: ['firearmsInstructor'], minExperience: 3, cost: 1200000, revenue: 950000, cogs: 0.3, staff: 8, wage: 40000, rent: 60000, insurance: 50000, cyclical: 0.5, inspection: null, professions: ['police', 'sheriff', 'privateSecurity', 'privateMilitary', 'statePolice'], sizes: ['standard'] },
  kennel: { name: 'Boarding Kennel & Grooming', icon: '🐕', credentials: [], cost: 250000, revenue: 420000, cogs: 0.15, staff: 6, wage: 32000, rent: 40000, insurance: 10000, cyclical: 0.5, inspection: 'board', professions: ['animalControl', 'veterinary'] },
};

/** How the Start a Business list is grouped. */
export const BUSINESS_GROUPS = {
  transport: { label: 'Trucks, Fleets & Transportation', icon: '🚛', ids: ['trucking', 'courier', 'movingCompany', 'towing', 'busCharter', 'nemt', 'ambulanceService', 'wasteHauling', 'warehouse3pl', 'cdlSchool', 'charterOperator', 'flightSchool', 'fishingBoat', 'tourBoat'] },
  trades: { label: 'Trades & Construction', icon: '🔨', ids: ['electrical', 'plumbing', 'hvacContractor', 'constructionCo', 'roofing', 'excavation', 'craneRental', 'solarInstaller', 'machineShop', 'autoShop', 'landscaping', 'pestControl', 'cleaning', 'homeInspection', 'fireProtection'] },
  health: { label: 'Health Care', icon: '🩺', ids: ['practice', 'dentalPractice', 'ptClinic', 'pharmacyStore', 'homeHealth', 'counselingPractice', 'opticalShop', 'chiroClinic', 'nutritionPractice', 'vetClinic', 'medicalBilling'] },
  safety: { label: 'Security & Public Safety', icon: '🛡️', ids: ['securityCompany', 'piAgency', 'bailBondsAgency', 'shootingRange', 'answeringService', 'itSecurityFirm'] },
  professional: { label: 'Professional Services', icon: '💼', ids: ['lawFirm', 'cpaFirm', 'consulting', 'engineeringFirm', 'architecturePractice', 'surveyFirm', 'insuranceAgency', 'brokerage', 'propertyMgmt', 'staffingAgency', 'marketingAgency', 'translationAgency'] },
  food: { label: 'Food, Retail & Personal Services', icon: '🛍️', ids: ['foodTruck', 'restaurant', 'catering', 'retail', 'salon', 'gym', 'personalTraining', 'kennel', 'funeralHome'] },
  education: { label: 'Education & Care', icon: '🏫', ids: ['tutoring', 'privateTutoring', 'testPrep', 'privateSchool', 'daycare', 'homeCareAgency'] },
  creative: { label: 'Tech & Creative', icon: '💡', ids: ['techStartup', 'softwareShop', 'indieGameStudio', 'designStudio', 'productionCompany', 'recordingStudio'] },
};
export const groupOf = (typeId) => Object.keys(BUSINESS_GROUPS).find((g) => BUSINESS_GROUPS[g].ids.includes(typeId)) ?? 'professional';

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
