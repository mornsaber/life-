/**
 * Organization types: what kinds of employers exist and how they're built.
 *
 * An organization contains departments; each department employs one or more
 * occupations (the career ladders in career/JobTrees.js). A position is an
 * occupation + level inside a department inside an organization.
 *
 * Fields:
 *   name(ctx)     the organization's name ({ city, state, rng })
 *   scope         'region' (one per city/county), 'state', 'nation' (one each)
 *                 or 'market' (several competing private employers per region)
 *   sector        'private' | 'municipal' | 'state' | 'federal'
 *   head          the top position: { title, selection, occupation?, levelId? }
 *                 selection: 'appointed' (by `appointedBy`), 'elected' (an office
 *                 in politics/Offices.js), 'board' (hired by a board), 'internal'
 *   departments   [{ id, name, occupations: [professionId], head: { title, selection, appointedBy? } }]
 *
 * Every profession must appear in at least one organization type; anything
 * not listed gets a generated single-department type (see orgTypesFor).
 */

import { BUSINESS_TYPES } from '../business/BusinessTypes.js';

const city = (c) => c.city;

export const ORG_TYPES = {
  /* ---------------- Local government ---------------- */
  cityGov: {
    name: (c) => `City of ${city(c)}`, scope: 'region', sector: 'municipal',
    head: { title: 'City Manager', selection: 'appointed', appointedBy: 'the city council', office: 'cityManager' },
    departments: [
      { id: 'publicSafety', name: 'Department of Public Safety', occupations: ['police', 'fire', 'ems', 'dispatch'], head: { title: 'Public Safety Commissioner', selection: 'appointed', appointedBy: 'the mayor' },
        divisions: { police: 'Police Division', fire: 'Fire Division', ems: 'Emergency Medical Services', dispatch: 'Emergency Communications' } },
      { id: 'publicWorks', name: 'Department of Public Works', occupations: ['publicWorks'], head: { title: 'Director of Public Works', selection: 'appointed', appointedBy: 'the city manager' } },
      { id: 'planning', name: 'Department of Planning & Development', occupations: ['planning'], head: { title: 'Planning Director', selection: 'appointed', appointedBy: 'the city manager' } },
      { id: 'administration', name: 'City Administration', occupations: ['municipalAdmin'], head: { title: 'Assistant City Manager', selection: 'appointed', appointedBy: 'the city manager' } },
    ],
  },
  countyGov: {
    name: (c) => `${city(c)} County`, scope: 'region', sector: 'municipal',
    head: { title: 'Chair of the County Commission', selection: 'elected', office: 'countyCommissioner' },
    departments: [
      { id: 'sheriff', name: 'Sheriff\'s Office', occupations: ['sheriff', 'jail'], head: { title: 'Sheriff', selection: 'elected', office: 'sheriff' },
        divisions: { sheriff: 'Patrol & Investigations', jail: 'Detention Division' } },
      { id: 'health', name: 'County Health Department', occupations: ['publicHealth'], head: { title: 'Director of Public Health', selection: 'appointed', appointedBy: 'the county commission' } },
      { id: 'da', name: 'District Attorney\'s Office', occupations: ['prosecution'], head: { title: 'District Attorney', selection: 'elected', office: 'districtAttorney' } },
    ],
  },
  schoolDistrict: {
    name: (c) => `${city(c)} Public Schools`, scope: 'region', sector: 'municipal',
    head: { title: 'Superintendent', selection: 'board', appointedBy: 'the school board', occupation: 'education', levelId: 'superintendent' },
    departments: [
      { id: 'instruction', name: 'Schools & Instruction', occupations: ['education'], head: { title: 'Deputy Superintendent for Instruction', selection: 'internal', occupation: 'education', levelId: 'assistantSuper' } },
      { id: 'transportation', name: 'Student Transportation', occupations: ['schoolBus'], head: { title: 'Director of Student Transportation', selection: 'internal', occupation: 'schoolBus', levelId: 'director' } },
      { id: 'health', name: 'Health Services', occupations: ['nursing'], head: { title: 'Director of Health Services', selection: 'internal' } },
      { id: 'studentServices', name: 'Student Services (Counselors & Psychologists)', occupations: ['socialWork'], head: { title: 'Director of Student Services', selection: 'internal' } },
    ],
  },
  transitAuthority: {
    name: (c) => `${city(c)} Regional Transit Authority`, scope: 'region', sector: 'municipal',
    head: { title: 'General Manager', selection: 'board', appointedBy: 'the transit board', occupation: 'transit', levelId: 'gm' },
    departments: [
      { id: 'operations', name: 'Bus & Rail Operations', occupations: ['transit'], head: { title: 'Chief Operating Officer', selection: 'internal' } },
      { id: 'maintenance', name: 'Maintenance', occupations: ['transitMaintenance'], head: { title: 'Chief of Maintenance', selection: 'internal' } },
      { id: 'police', name: 'Transit Police', occupations: ['transitPolice'], head: { title: 'Chief of Transit Police', selection: 'appointed', appointedBy: 'the general manager' } },
    ],
  },

  /* ---------------- State government ---------------- */
  statePublicSafety: {
    name: (c) => `${c.state} Department of Public Safety`, scope: 'state', sector: 'state',
    head: { title: 'Secretary of Public Safety', selection: 'appointed', appointedBy: 'the governor' },
    departments: [
      { id: 'statePolice', name: 'State Police', occupations: ['statePolice'], head: { title: 'Superintendent of State Police', selection: 'appointed', appointedBy: 'the governor' } },
      { id: 'crimeLab', name: 'State Crime Laboratory', occupations: ['forensics'], head: { title: 'Laboratory Director', selection: 'internal' } },
    ],
  },
  stateCorrections: {
    name: (c) => `${c.state} Department of Corrections`, scope: 'state', sector: 'state',
    head: { title: 'Secretary of Corrections', selection: 'appointed', appointedBy: 'the governor' },
    departments: [
      { id: 'institutions', name: 'Division of Institutions', occupations: ['corrections'], head: { title: 'Director of Institutions', selection: 'internal' } },
      { id: 'community', name: 'Division of Probation & Parole', occupations: ['probation'], head: { title: 'Director of Community Supervision', selection: 'internal' } },
    ],
  },
  stateJustice: {
    name: (c) => `${c.state} Judicial & Legal Agencies`, scope: 'state', sector: 'state',
    head: { title: 'State Court Administrator', selection: 'appointed', appointedBy: 'the state supreme court' },
    departments: [
      { id: 'courts', name: 'Administrative Office of the Courts', occupations: ['courts'], head: { title: 'Court Administrator', selection: 'internal' } },
      { id: 'publicDefender', name: 'Office of the Public Defender', occupations: ['publicDefender'], head: { title: 'State Public Defender', selection: 'appointed', appointedBy: 'the governor' } },
    ],
  },
  stateRevenue: { name: (c) => `${c.state} Department of Revenue`, scope: 'state', sector: 'state', head: { title: 'Commissioner of Revenue', selection: 'appointed', appointedBy: 'the governor' },
    departments: [{ id: 'revenue', name: 'Tax Administration', occupations: ['revenue'], head: { title: 'Director of Tax Administration', selection: 'internal' } }] },
  stateSocialServices: { name: (c) => `${c.state} Department of Social Services`, scope: 'state', sector: 'state', head: { title: 'Secretary of Social Services', selection: 'appointed', appointedBy: 'the governor' },
    departments: [{ id: 'cps', name: 'Child Protective Services', occupations: ['cps'], head: { title: 'Director of Child Welfare', selection: 'internal' } }] },
  stateNaturalResources: {
    name: (c) => `${c.state} Department of Natural Resources`, scope: 'state', sector: 'state',
    head: { title: 'Director of Natural Resources', selection: 'appointed', appointedBy: 'the governor' },
    departments: [
      { id: 'wildlife', name: 'Fish & Wildlife Division', occupations: ['gameWarden'], head: { title: 'Chief Game Warden', selection: 'internal' } },
      { id: 'forestry', name: 'State Forestry', occupations: ['forester'], head: { title: 'State Forester', selection: 'internal' } },
      { id: 'environment', name: 'Environmental Protection Division', occupations: ['environmental'], head: { title: 'Director of Environmental Protection', selection: 'appointed', appointedBy: 'the governor' } },
    ],
  },
  stateTransportation: { name: (c) => `${c.state} Department of Transportation`, scope: 'state', sector: 'state', head: { title: 'Secretary of Transportation', selection: 'appointed', appointedBy: 'the governor' },
    departments: [{ id: 'highways', name: 'Highways & Engineering', occupations: ['dot'], head: { title: 'Chief Engineer', selection: 'internal' } }] },
  stateLegislature: { name: (c) => `${c.state} Legislature`, scope: 'state', sector: 'state', head: { title: 'Speaker of the House', selection: 'elected', office: 'stateRep' },
    departments: [{ id: 'staff', name: 'Legislative Staff', occupations: ['legislativeStaff'], head: { title: 'Chief Clerk', selection: 'internal' } }] },
  stateUniversity: { name: (c) => `${c.state} State University`, scope: 'state', sector: 'state', head: { title: 'University President', selection: 'board', appointedBy: 'the board of regents', occupation: 'university', levelId: 'president' },
    departments: [{ id: 'academic', name: 'Academic Affairs', occupations: ['university'], head: { title: 'Provost', selection: 'internal', occupation: 'university', levelId: 'provost' } }] },

  /* ---------------- Federal government ---------------- */
  doj: {
    name: () => 'U.S. Department of Justice', scope: 'nation', sector: 'federal',
    head: { title: 'Attorney General', selection: 'appointed', appointedBy: 'the President, with Senate confirmation' },
    departments: [
      { id: 'fbi', name: 'Federal Bureau of Investigation', occupations: ['fbi'], head: { title: 'FBI Director', selection: 'appointed', appointedBy: 'the President' } },
      { id: 'dea', name: 'Drug Enforcement Administration', occupations: ['dea'], head: { title: 'DEA Administrator', selection: 'appointed', appointedBy: 'the President' } },
      { id: 'atf', name: 'Bureau of Alcohol, Tobacco, Firearms and Explosives', occupations: ['atf'], head: { title: 'ATF Director', selection: 'appointed', appointedBy: 'the President' } },
      { id: 'usms', name: 'U.S. Marshals Service', occupations: ['usms'], head: { title: 'Director of the Marshals Service', selection: 'appointed', appointedBy: 'the President' } },
      { id: 'bop', name: 'Federal Bureau of Prisons', occupations: ['federalPrisons'], head: { title: 'BOP Director', selection: 'appointed', appointedBy: 'the Attorney General' } },
      { id: 'oig', name: 'Office of the Inspector General', occupations: ['oig'], head: { title: 'Inspector General', selection: 'appointed', appointedBy: 'the President' } },
    ],
  },
  dhs: {
    name: () => 'U.S. Department of Homeland Security', scope: 'nation', sector: 'federal',
    head: { title: 'Secretary of Homeland Security', selection: 'appointed', appointedBy: 'the President, with Senate confirmation' },
    departments: [
      { id: 'tsa', name: 'Transportation Security Administration', occupations: ['tsa'], head: { title: 'TSA Administrator', selection: 'appointed', appointedBy: 'the President' } },
      { id: 'usss', name: 'U.S. Secret Service', occupations: ['usss'], head: { title: 'Director of the Secret Service', selection: 'appointed', appointedBy: 'the President' } },
    ],
  },
  usdot: { name: () => 'U.S. Department of Transportation', scope: 'nation', sector: 'federal', head: { title: 'Secretary of Transportation', selection: 'appointed', appointedBy: 'the President' },
    departments: [{ id: 'faa', name: 'Federal Aviation Administration — Air Traffic Organization', occupations: ['airTrafficControl'], head: { title: 'FAA Administrator', selection: 'appointed', appointedBy: 'the President' } }] },
  interior: { name: () => 'U.S. Department of the Interior', scope: 'nation', sector: 'federal', head: { title: 'Secretary of the Interior', selection: 'appointed', appointedBy: 'the President' },
    departments: [{ id: 'nps', name: 'National Park Service', occupations: ['parkService'], head: { title: 'Director of the National Park Service', selection: 'appointed', appointedBy: 'the President' } }] },
  stateDept: { name: () => 'U.S. Department of State', scope: 'nation', sector: 'federal', head: { title: 'Secretary of State', selection: 'appointed', appointedBy: 'the President' },
    departments: [{ id: 'fs', name: 'Foreign Service', occupations: ['foreignService'], head: { title: 'Director General of the Foreign Service', selection: 'appointed', appointedBy: 'the President' } }] },
  intelCommunity: { name: () => 'U.S. Intelligence Community', scope: 'nation', sector: 'federal', head: { title: 'Director of National Intelligence', selection: 'appointed', appointedBy: 'the President' },
    departments: [{ id: 'intel', name: 'Intelligence Directorate', occupations: ['intelligence'], head: { title: 'Deputy Director for Operations', selection: 'internal' } }] },
  benefitsAgencies: {
    name: () => 'Social Security Administration & Department of Veterans Affairs', scope: 'nation', sector: 'federal',
    head: { title: 'Commissioner of Social Security', selection: 'appointed', appointedBy: 'the President' },
    departments: [{ id: 'claims', name: 'Field Operations & Claims', occupations: ['benefitsClaims'], head: { title: 'Deputy Commissioner for Operations', selection: 'internal' } }],
  },
  postalService: { name: () => 'U.S. Postal Service', scope: 'nation', sector: 'federal', head: { title: 'Postmaster General', selection: 'board', appointedBy: 'the Board of Governors' },
    departments: [{ id: 'retail', name: 'Retail & Delivery Operations', occupations: ['postal'], head: { title: 'Chief Retail & Delivery Officer', selection: 'internal' } }] },
  regulators: { name: () => 'Federal Financial Regulators', scope: 'nation', sector: 'federal', head: { title: 'Agency Chair', selection: 'appointed', appointedBy: 'the President' },
    departments: [{ id: 'exam', name: 'Supervision & Examination', occupations: ['regulatory'], head: { title: 'Chief Examiner', selection: 'internal' } }] },

  /* ---------------- Private sector (competing employers) ---------------- */
  hospitalSystem: {
    name: (c) => c.rng.pick([`${city(c)} Health`, `St. Brigid Health System`, `Mercy Regional Health`, `Lakeshore University Health`]), scope: 'market', sector: 'private',
    head: { title: 'Chief Executive Officer', selection: 'board', appointedBy: 'the board of trustees' },
    departments: [
      { id: 'medicine', name: 'Medical Staff', occupations: ['medical', 'physicianAssistant'], head: { title: 'Chief Medical Officer', selection: 'internal', occupation: 'medical', levelId: 'chief' } },
      { id: 'nursing', name: 'Nursing Services', occupations: ['nursing'], head: { title: 'Chief Nursing Officer', selection: 'internal', occupation: 'nursing', levelId: 'cno' } },
      { id: 'pharmacy', name: 'Pharmacy', occupations: ['pharmacy'], head: { title: 'Director of Pharmacy', selection: 'internal' } },
      { id: 'rehab', name: 'Rehabilitation Services', occupations: ['physicalTherapy'], head: { title: 'Director of Rehabilitation', selection: 'internal' } },
      { id: 'social', name: 'Care Management & Social Work', occupations: ['socialWork'], head: { title: 'Director of Care Management', selection: 'internal' } },
      { id: 'security', name: 'Hospital Police & Security', occupations: ['privateSecurity', 'privatePolice'], head: { title: 'Director of Security', selection: 'internal' } },
    ],
  },
  corporation: {
    name: (c) => c.rng.pick(['Meridian Holdings', 'Apex Global Industries', 'Keystone Corporation', 'Summit Brands Inc.', 'Northwind Group']), scope: 'market', sector: 'private',
    head: { title: 'Chief Executive Officer', selection: 'board', appointedBy: 'the board of directors' },
    departments: [
      { id: 'operations', name: 'Operations', occupations: ['corporate'], head: { title: 'Chief Operating Officer', selection: 'internal', occupation: 'corporate', levelId: 'ceo' } },
      { id: 'finance', name: 'Finance', occupations: ['accounting', 'finance', 'actuary'], head: { title: 'Chief Financial Officer', selection: 'board' } },
      { id: 'technology', name: 'Technology', occupations: ['tech'], head: { title: 'Chief Technology Officer', selection: 'board' } },
      { id: 'legal', name: 'Legal Department', occupations: ['law', 'legalSupport'], head: { title: 'General Counsel', selection: 'board' } },
      { id: 'security', name: 'Corporate Security', occupations: ['privateSecurity', 'privateInvestigator'], head: { title: 'Chief Security Officer', selection: 'internal' } },
    ],
  },
  techCompany: {
    name: (c) => c.rng.pick(['Lumen Systems', 'Quanta Software', 'Nimbus Cloud', 'Vertex Labs', 'Parallax Technologies']), scope: 'market', sector: 'private',
    head: { title: 'Chief Executive Officer', selection: 'board', appointedBy: 'the board of directors' },
    departments: [
      { id: 'engineering', name: 'Engineering', occupations: ['tech'], head: { title: 'Chief Technology Officer', selection: 'internal', occupation: 'tech', levelId: 'cto' } },
      { id: 'business', name: 'Product, Sales & Operations', occupations: ['corporate'], head: { title: 'Chief Operating Officer', selection: 'board' } },
      { id: 'finance', name: 'Finance', occupations: ['accounting'], head: { title: 'Chief Financial Officer', selection: 'board' } },
    ],
  },
  bank: {
    name: (c) => c.rng.pick(['First Continental Bank', 'Harbor Trust', 'Granite Capital', 'Lakeside Savings']), scope: 'market', sector: 'private',
    head: { title: 'Chief Executive Officer', selection: 'board', appointedBy: 'the board of directors' },
    departments: [
      { id: 'investment', name: 'Investment Banking', occupations: ['finance'], head: { title: 'Head of Investment Banking', selection: 'internal' } },
      { id: 'finance', name: 'Finance & Controllership', occupations: ['accounting'], head: { title: 'Chief Financial Officer', selection: 'board' } },
      { id: 'operations', name: 'Operations', occupations: ['corporate'], head: { title: 'Chief Operating Officer', selection: 'board' } },
    ],
  },
  insurer: {
    name: (c) => c.rng.pick(['Mutual Life Assurance', 'Keystone Insurance Group', 'Great Lakes Re', 'Shield Casualty']), scope: 'market', sector: 'private',
    head: { title: 'Chief Executive Officer', selection: 'board', appointedBy: 'the board of directors' },
    departments: [
      { id: 'underwriting', name: 'Underwriting & Claims', occupations: ['insurance'], head: { title: 'Chief Underwriting Officer', selection: 'internal' } },
      { id: 'actuarial', name: 'Actuarial', occupations: ['actuary'], head: { title: 'Chief Actuary', selection: 'internal', occupation: 'actuary', levelId: 'chief' } },
    ],
  },
  lawFirm: {
    name: (c) => `${c.rng.pick(['Whitman', 'Hale', 'Sterling', 'Brennan', 'Okafor'])}, ${c.rng.pick(['Cole', 'Price', 'Vance', 'Morales'])} & ${c.rng.pick(['Reed', 'Lowe', 'Hart', 'Nash'])} LLP`, scope: 'market', sector: 'private',
    head: { title: 'Managing Partner', selection: 'internal', occupation: 'law' },
    departments: [{ id: 'practice', name: 'Legal Practice', occupations: ['law', 'legalSupport'], head: { title: 'Managing Partner', selection: 'internal' } }],
  },
  airline: {
    name: (c) => c.rng.pick(['TransAmerica Airways', 'Pacific Crest Air', 'Bluewing Airlines', 'SkyBridge Regional']), scope: 'market', sector: 'private',
    head: { title: 'Chief Executive Officer', selection: 'board', appointedBy: 'the board of directors' },
    departments: [
      { id: 'flightOps', name: 'Flight Operations', occupations: ['aviation'], head: { title: 'Senior VP of Flight Operations', selection: 'internal', occupation: 'aviation', levelId: 'dfo' } },
      { id: 'inflight', name: 'Inflight Services', occupations: ['flightAttendant'], head: { title: 'VP of Inflight', selection: 'internal' } },
      { id: 'corporate', name: 'Corporate Office', occupations: ['corporate'], head: { title: 'Chief Operating Officer', selection: 'board' } },
    ],
  },
  railroadCo: {
    name: (c) => c.rng.pick(['Union Continental Railroad', 'Great Plains & Pacific', 'Atlantic Coast Line', 'National Passenger Rail']), scope: 'market', sector: 'private',
    head: { title: 'Chief Executive Officer', selection: 'board', appointedBy: 'the board of directors' },
    departments: [
      { id: 'transportation', name: 'Train Operations', occupations: ['railroad'], head: { title: 'VP of Transportation', selection: 'internal' } },
      { id: 'police', name: 'Railroad Police', occupations: ['privatePolice'], head: { title: 'Chief of Railroad Police', selection: 'internal' } },
      { id: 'engineering', name: 'Engineering & Track', occupations: ['engineering', 'welding'], head: { title: 'Chief Engineer', selection: 'internal' } },
    ],
  },
  cruiseLine: {
    name: (c) => c.rng.pick(['Azure Horizon Cruises', 'Coral Crown Line', 'Northstar Voyages', 'Meridian Seas Cruise Co.']), scope: 'market', sector: 'private',
    head: { title: 'Chief Executive Officer', selection: 'board', appointedBy: 'the board of directors' },
    departments: [
      { id: 'hotel', name: 'Hotel Operations', occupations: ['cruise', 'culinary'], head: { title: 'VP of Hotel Operations', selection: 'internal' } },
      { id: 'marine', name: 'Marine Operations', occupations: ['merchantMarine'], head: { title: 'VP of Marine Operations', selection: 'internal' } },
    ],
  },
  hotelGroup: {
    name: (c) => c.rng.pick(['Meridian Hotel Group', 'Harborview Resorts', 'Grand Plaza Hotels', 'Summit Lodge Co.']), scope: 'market', sector: 'private',
    head: { title: 'Chief Executive Officer', selection: 'board', appointedBy: 'the board of directors' },
    departments: [
      { id: 'rooms', name: 'Rooms & Guest Services', occupations: ['hospitality'], head: { title: 'VP of Operations', selection: 'internal' } },
      { id: 'food', name: 'Food & Beverage', occupations: ['culinary'], head: { title: 'Director of Food & Beverage', selection: 'internal' } },
      { id: 'security', name: 'Security', occupations: ['privateSecurity'], head: { title: 'Director of Security', selection: 'internal' } },
    ],
  },
  retailChain: {
    name: (c) => c.rng.pick(['ValueMart', 'Northgate Stores', 'Brightway Retail', 'HomePlus Supercenters']), scope: 'market', sector: 'private',
    head: { title: 'Chief Executive Officer', selection: 'board', appointedBy: 'the board of directors' },
    departments: [
      { id: 'stores', name: 'Store Operations', occupations: ['retail'], head: { title: 'VP of Store Operations', selection: 'internal' } },
      { id: 'logistics', name: 'Distribution & Logistics', occupations: ['trucking'], head: { title: 'VP of Logistics', selection: 'internal' } },
      { id: 'lossPrevention', name: 'Asset Protection', occupations: ['privateSecurity'], head: { title: 'Director of Asset Protection', selection: 'internal' } },
    ],
  },
  contractor: {
    name: (c) => c.rng.pick(['Summit Builders', 'Keystone General Contractors', 'Riverbend Construction', 'Granite & Steel Co.']), scope: 'market', sector: 'private',
    head: { title: 'President', selection: 'board', appointedBy: 'the owners' },
    departments: [
      { id: 'engineering', name: 'Engineering & Project Management', occupations: ['engineering'], head: { title: 'VP of Engineering', selection: 'internal' } },
      { id: 'field', name: 'Field Operations', occupations: ['carpentry', 'ironworking', 'craneOperator', 'welding'], head: { title: 'VP of Field Operations', selection: 'internal' } },
      { id: 'mep', name: 'Mechanical, Electrical & Plumbing', occupations: ['trades', 'plumbing', 'hvac'], head: { title: 'MEP Director', selection: 'internal' } },
    ],
  },
  utility: {
    name: (c) => c.rng.pick(['Metro Power & Light', 'Prairie Electric Cooperative', 'Western Grid Utilities']), scope: 'market', sector: 'private',
    head: { title: 'Chief Executive Officer', selection: 'board', appointedBy: 'the board of directors' },
    departments: [
      { id: 'lines', name: 'Transmission & Distribution', occupations: ['lineworker'], head: { title: 'VP of Operations', selection: 'internal' } },
      { id: 'engineering', name: 'Engineering', occupations: ['engineering', 'trades'], head: { title: 'Chief Engineer', selection: 'internal' } },
    ],
  },
  energyCompany: {
    name: (c) => c.rng.pick(['Permian Energy Partners', 'Bakken Resources', 'Gulf Offshore Energy', 'High Plains Petroleum']), scope: 'market', sector: 'private',
    head: { title: 'Chief Executive Officer', selection: 'board', appointedBy: 'the board of directors' },
    departments: [
      { id: 'drilling', name: 'Drilling Operations', occupations: ['oilGas'], head: { title: 'VP of Drilling', selection: 'internal' } },
      { id: 'engineering', name: 'Petroleum Engineering', occupations: ['engineering'], head: { title: 'Chief Engineer', selection: 'internal' } },
    ],
  },
  mediaCompany: {
    name: (c) => c.rng.pick([`${city(c)} Tribune Media`, 'Metro News Group', 'Channel 7 Broadcasting', 'Lakeside Public Media']), scope: 'market', sector: 'private',
    head: { title: 'Publisher & CEO', selection: 'board', appointedBy: 'the owners' },
    departments: [{ id: 'newsroom', name: 'Newsroom', occupations: ['journalism'], head: { title: 'Executive Editor', selection: 'internal' } }],
  },
  diocese: {
    name: (c) => `Diocese of ${city(c)}`, scope: 'region', sector: 'private',
    head: { title: 'Bishop', selection: 'appointed', appointedBy: 'the Pope', occupation: 'catholicClergy', levelId: 'bishop' },
    departments: [{ id: 'parishes', name: 'Parishes', occupations: ['catholicClergy'], head: { title: 'Vicar General', selection: 'internal' } }],
  },
  researchInstitute: {
    name: (c) => c.rng.pick(['Brightwater Research Institute', 'Helix Biosciences', 'National Laboratory for Applied Physics']), scope: 'market', sector: 'private',
    head: { title: 'Institute Director', selection: 'board', appointedBy: 'the board of trustees', occupation: 'research', levelId: 'director' },
    departments: [{ id: 'labs', name: 'Research Labs', occupations: ['research'], head: { title: 'Scientific Director', selection: 'internal' } }],
  },
};

/** Organization types that employ this occupation. */
export function orgTypesFor(professionId) {
  const types = Object.entries(ORG_TYPES).filter(([, t]) => t.departments.some((d) => d.occupations.includes(professionId))).map(([id]) => id);
  return types.length ? types : [`solo:${professionId}`];
}

/**
 * A generated single-department organization type for occupations that
 * don't belong to a larger employer type (salons, PI agencies, farms…).
 */
export function soloType(profession) {
  return {
    name: null, scope: profession.sector === 'private' ? 'market' : profession.sector === 'federal' ? 'nation' : profession.sector === 'state' ? 'state' : 'region',
    sector: profession.sector,
    head: { title: 'Owner / Chief Executive', selection: profession.sector === 'private' ? 'internal' : 'appointed', appointedBy: 'the agency\'s oversight board' },
    departments: [{ id: 'main', name: profession.name, occupations: [profession.id], head: { title: 'Department Head', selection: 'internal' } }],
    solo: true,
  };
}

/**
 * Businesses are organizations too. A business type's `staffing` config says
 * which careers staff which departments; departments that only appear as a
 * company grows (finance, HR, sales) are listed with `minStaff`.
 *   staffing: { deptId: { name, occupations: [professionId], head, minStaff? } }
 * Without one, operations are staffed by the type's first related career and
 * a small front office by corporate staff.
 */
export const GROWTH_DEPARTMENTS = {
  finance: { name: 'Finance & Accounting', occupations: ['accounting'], head: 'Chief Financial Officer', minStaff: 50 },
  hr: { name: 'Human Resources', occupations: ['corporate'], head: 'HR Director', minStaff: 50 },
  sales: { name: 'Sales & Marketing', occupations: ['corporate'], head: 'VP of Sales & Marketing', minStaff: 120 },
};

export function businessOrgType(typeId) {
  const t = BUSINESS_TYPES[typeId];
  if (!t) return null;
  const staffing = t.staffing ?? {
    operations: { name: 'Operations', occupations: [t.professions[0] ?? 'corporate'], head: 'Operations Manager' },
    office: { name: 'Front Office & Administration', occupations: ['corporate'], head: 'Office Manager', minStaff: 4 },
  };
  const all = { ...staffing, ...Object.fromEntries(Object.entries(GROWTH_DEPARTMENTS).filter(([id]) => !staffing[id])) };
  return {
    name: null, scope: 'market', sector: 'private', business: true,
    head: { title: 'Owner', selection: 'owner' },
    departments: Object.entries(all).map(([id, d]) => ({ id, name: d.name, occupations: d.occupations, minStaff: d.minStaff ?? 0, head: { title: d.head ?? `${d.name} Manager`, selection: 'internal' } })),
  };
}
