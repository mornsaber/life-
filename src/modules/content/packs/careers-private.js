/**
 * Private-sector professions, merged with the municipal and federal
 * professions defined by the public-service module into one catalog.
 *
 * Profession fields:
 *   id/field          id doubles as the career field majors map to
 *   sector            'private' | 'municipal' | 'state' | 'federal'
 *   payMultiplier     market premium over the G-scale
 *   sizes             employer-size weights when generating an employer
 *   union             { chance, name, strike } — chance the employer is unionized
 *   benefits          overrides on the sector's default benefits package
 *   background        'strict' | 'standard' | 'lenient' criminal-record screening
 *   exam              civil-service exam required to apply (public sector)
 *   valued            credentials that improve hiring odds
 *   remote            job survives relocation
 *   flightHoursPerYear logs pilot time while employed
 *   levels            the ladder (see Ladder.js)
 */
import { L } from '../../career/Ladder.js';
import { TRADITIONS, clergyEligibility } from '../../community/Religions.js';
import { currentCountry } from '../../../core/Locale.js';
import { REGIONS } from '../../life/Regions.js';
import { dioceseName, anglicanDioceseName } from '../../community/Dioceses.js';

const HIERARCHICAL = ['catholic', 'tradCatholic'];
const ALL_SIZES = { small: 4, medium: 3, large: 2, enterprise: 1 };

const careers = {
  retail: {
    id: 'retail', name: 'Retail', icon: '🛍️', sector: 'private', payMultiplier: 0.78, minAge: 16, sizes: ALL_SIZES, background: 'lenient',
    union: { chance: 0.1, name: 'UFCW Local 400', strike: true },
    employers: ['Bayside Market', 'Northgate Outfitters', 'Target Point', 'Corner Hardware Co.'],
    ladder: [
      ['associate', 'Sales Associate', 1],
      ['seniorAssociate', 'Senior Sales Associate', 2, { minSize: 'medium' }],
      ['merch', 'Visual Merchandiser', 3, { track: 'ic' }],
      ['buyer', 'Buyer', 5, { track: 'ic', minSize: 'large', req: { education: { level: 'bachelor' } }, abilities: ['budget', 'sign'] }],
      ['shiftLead', 'Shift Lead', 2, { track: 'mgmt', abilities: ['supervise'], reports: 4 }],
      ['asm', 'Assistant Store Manager', 3, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 8 }],
      ['storeManager', 'Store Manager', 4, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 20 }],
      ['districtManager', 'District Manager', 6, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 60 }],
      ['regionalDirector', 'Regional Director', 7, { track: 'mgmt', minSize: 'large', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'budget', 'delegate', 'sign'], reports: 250 }],
      ['vpOps', 'VP of Retail Operations', 9, { track: 'mgmt', minSize: 'enterprise', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 2000 }],
    ],
  },
  culinary: {
    id: 'culinary', name: 'Culinary', icon: '👨‍🍳', sector: 'private', payMultiplier: 0.82, minAge: 16, sizes: { small: 5, medium: 3, large: 1 }, background: 'lenient',
    union: { chance: 0.08, name: 'UNITE HERE Local 1', strike: true },
    employers: ['The Copper Pot', 'Harvest Table', 'Saltwater Grill', 'Meridian Hotel Group'],
    ladder: [
      ['prep', 'Prep Cook', 1],
      ['line', 'Line Cook', 2, { entry: true, req: { education: { program: 'culinaryArts' } } }],
      ['partie', 'Chef de Partie', 3, { track: 'ic' }],
      ['pastry', 'Pastry Chef', 4, { track: 'ic' }],
      ['masterChef', 'Master Chef', 6, { track: 'ic', minSize: 'medium' }],
      ['sous', 'Sous Chef', 3, { track: 'mgmt', req: { credentials: ['servSafe'] }, abilities: ['supervise'], reports: 6 }],
      ['cdc', 'Chef de Cuisine', 4, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 12 }],
      ['exec', 'Executive Chef', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 25 }],
      ['director', 'Culinary Director', 7, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign'], reports: 120 }],
    ],
  },
  trades: {
    id: 'trades', name: 'Electrical Trades', icon: '⚡', sector: 'private', payMultiplier: 0.86, promotionOdds: 0.7, minAge: 18, sizes: { small: 4, medium: 3, large: 1 }, background: 'lenient',
    union: { chance: 0.45, name: 'IBEW Local 98', strike: true },
    benefits: { unionPension: 'union' },
    employers: ['Volt Brothers Electric', 'Keystone Builders', 'Ironline Contracting', 'Summit Electrical'],
    valued: ['oshaSafety', 'driverLicense'],
    ladder: [
      ['apprentice', 'Apprentice Electrician', 2, { req: { education: { level: 'highschool' } }, years: 4 }],
      ['journeyman', 'Journeyman Electrician', 4, { entry: true, req: { credentials: ['journeymanElectrician'] }, years: 5 }],
      ['master', 'Master Electrician', 5, { track: 'ic', req: { credentials: ['masterElectrician'] } }],
      ['estimator', 'Senior Estimator', 6, { track: 'ic', minSize: 'medium' }],
      ['foreman', 'Foreman', 5, { track: 'mgmt', req: { credentials: ['journeymanElectrician'] }, abilities: ['supervise'], reports: 8, years: 4 }],
      ['super', 'Site Superintendent', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'inspect'], reports: 25 }],
      ['pm', 'Construction Project Manager', 7, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'budget', 'sign'], reports: 60 }],
      ['owner', 'Owner / President', 8, { founder: true, track: 'mgmt', req: { credentials: ['masterElectrician'] }, abilities: ['supervise', 'hire', 'budget', 'sign', 'delegate', 'exec'], reports: 80 }],
    ],
  },
  trucking: {
    id: 'trucking', name: 'Trucking & Logistics', icon: '🚛', sector: 'private', payMultiplier: 0.85, minAge: 21, sizes: { small: 2, medium: 3, large: 3, enterprise: 1 }, background: 'standard',
    union: { chance: 0.3, name: 'Teamsters Local 710', strike: true },
    benefits: { unionPension: 'union' },
    employers: ['Interstate Freight Lines', 'Prairie Haulers', 'BlueLine Logistics', 'Apex Carriers'],
    entry: { credentials: ['driverLicense'] },
    ladder: [
      ['trainee', 'CDL Driver Trainee', 1, { req: { credentials: ['driverLicense'] } }],
      ['driver', 'Company Driver', 3, { entry: true, req: { credentials: ['cdlA'] } }],
      ['senior', 'Senior Linehaul Driver', 4, { track: 'ic', req: { credentials: ['cdlA'] } }],
      ['tanker', 'HazMat Tanker Driver', 5, { track: 'ic', req: { credentials: ['hazmatEndorsement'] } }],
      ['dispatcher', 'Dispatcher', 3, { track: 'mgmt', abilities: ['supervise'], reports: 15 }],
      ['fleet', 'Fleet Manager', 5, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 40 }],
      ['terminal', 'Terminal Manager', 6, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 120 }],
      ['vpOps', 'VP of Operations', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 900 }],
    ],
  },
  tech: {
    id: 'tech', name: 'Technology', icon: '💻', sector: 'private', payMultiplier: 1.3, minAge: 18, sizes: ALL_SIZES, background: 'standard', remote: true,
    union: { chance: 0.03, name: 'Tech Workers Union', strike: true },
    employers: ['Nimbus Labs', 'ByteForge', 'Quantal Systems', 'Pixelridge', 'Orbital Software'],
    valued: ['awsCert', 'cissp'],
    entry: { smarts: 45 },
    ladder: [
      ['qa', 'QA Tester', 2],
      ['junior', 'Junior Developer', 3, { entry: true, req: { anyOf: [{ education: { level: 'bachelor', majors: ['computerScience', 'engineering'] } }, { education: { level: 'associate', majors: ['computerScience'] } }] } }],
      ['swe', 'Software Engineer', 4, { req: { smarts: 55 } }],
      ['senior', 'Senior Engineer', 5, { track: 'ic', req: { smarts: 60 } }],
      ['staff', 'Staff Engineer', 6, { track: 'ic', minSize: 'medium' }],
      ['principal', 'Principal Engineer', 7, { track: 'ic', minSize: 'large' }],
      ['distinguished', 'Distinguished Engineer', 8, { track: 'ic', minSize: 'enterprise' }],
      ['lead', 'Tech Lead', 5, { track: 'mgmt', abilities: ['supervise'], reports: 5 }],
      ['em', 'Engineering Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 9 }],
      ['director', 'Director of Engineering', 7, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 45 }],
      ['vp', 'VP of Engineering', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign'], reports: 200 }],
      ['cto', 'Chief Technology Officer', 10, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 400 }],
    ],
  },
  corporate: {
    id: 'corporate', name: 'Corporate Business', icon: '🏢', sector: 'private', payMultiplier: 1.05, minAge: 21, sizes: ALL_SIZES, background: 'standard',
    employers: ['Sterling & Rowe', 'Meridian Holdings', 'Apex Consolidated', 'Harbor Point Group'],
    valued: ['pmp', 'sixSigmaGreen', 'leadershipProgram'],
    entry: { education: { level: 'bachelor' } },
    ladder: [
      ['jrAnalyst', 'Junior Analyst', 2],
      ['analyst', 'Analyst', 3],
      ['srAnalyst', 'Senior Analyst', 4],
      ['specialist', 'Senior Specialist', 5, { track: 'ic' }],
      ['principal', 'Principal Consultant', 6, { track: 'ic', minSize: 'medium' }],
      ['fellow', 'Distinguished Fellow', 8, { track: 'ic', minSize: 'large' }],
      ['teamLead', 'Team Supervisor', 5, { track: 'mgmt', abilities: ['supervise'], reports: 6 }],
      ['opsManager', 'Operations Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 14 }],
      ['director', 'Director', 7, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget', 'delegate', 'sign'], reports: 50 }],
      ['seniorDirector', 'Senior Director', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign'], reports: 140 }],
      ['vp', 'Vice President', 9, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 300 }],
      ['ceo', 'Chief Executive Officer', 10, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 1000 }],
    ],
  },
  finance: {
    id: 'finance', name: 'Investment Banking', icon: '💹', sector: 'private', payMultiplier: 1.45, minAge: 21, sizes: { medium: 2, large: 3, enterprise: 2 }, background: 'strict',
    employers: ['Goldbridge Partners', 'Harrow Capital', 'Whitlock Securities'],
    valued: ['series7', 'series66', 'cpa'],
    entry: { education: { level: 'bachelor' }, smarts: 55 },
    ladder: [
      ['analyst', 'IB Analyst', 4, { abilities: ['trade'] }],
      ['associate', 'IB Associate', 5, { req: { credentials: ['series7'] }, abilities: ['trade'] }],
      ['vp', 'Vice President', 6, { req: { credentials: ['series7'] }, abilities: ['trade', 'sign'] }],
      ['pm', 'Portfolio Manager', 7, { track: 'ic', req: { credentials: ['series66'] }, abilities: ['trade', 'sign'] }],
      ['cio', 'Chief Investment Officer', 9, { track: 'ic', minSize: 'large', abilities: ['trade', 'sign', 'policy'] }],
      ['director', 'Director', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'trade', 'sign'], reports: 10 }],
      ['md', 'Managing Director', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'trade', 'sign', 'delegate'], reports: 35 }],
      ['groupHead', 'Group Head', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 120 }],
    ],
  },
  accounting: {
    id: 'accounting', name: 'Accounting', icon: '🧮', sector: 'private', payMultiplier: 1.0, promotionOdds: 0.75, minAge: 21, sizes: ALL_SIZES, background: 'strict',
    employers: ['Carver & Lin CPAs', 'Northfield Advisory', 'Big Four Partners LLP'],
    valued: ['cpa', 'cgfm'],
    entry: { education: { level: 'bachelor' } },
    ladder: [
      ['staff', 'Staff Accountant', 3, { abilities: ['audit'] }],
      ['senior', 'Senior Accountant', 4, { abilities: ['audit'] }],
      ['tax', 'Tax Specialist', 5, { track: 'ic', abilities: ['audit'] }],
      ['forensic', 'Forensic Accountant', 6, { track: 'ic', req: { credentials: ['cpa'] }, abilities: ['audit'] }],
      ['auditManager', 'Audit Manager', 6, { track: 'mgmt', req: { credentials: ['cpa'] }, abilities: ['supervise', 'audit', 'sign'], reports: 8 }],
      ['seniorManager', 'Senior Manager', 7, { track: 'mgmt', minSize: 'large', req: { credentials: ['cpa'] }, abilities: ['supervise', 'hire', 'audit', 'sign'], reports: 20 }],
      ['partner', 'Partner', 8, { track: 'mgmt', req: { credentials: ['cpa'] }, abilities: ['supervise', 'hire', 'budget', 'sign', 'delegate'], reports: 40 }],
      ['managingPartner', 'Managing Partner', 10, { track: 'mgmt', minSize: 'large', req: { credentials: ['cpa'] }, abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 400 }],
    ],
  },
  engineering: {
    id: 'engineering', name: 'Civil Engineering', icon: '🏗️', sector: 'private', payMultiplier: 1.04, minAge: 21, sizes: ALL_SIZES, background: 'standard',
    employers: ['Granite & Steel Engineering', 'Riverbend Consulting', 'Atlas Infrastructure'],
    valued: ['fe', 'pe', 'pmp', 'oshaSafety'],
    entry: { education: { level: 'bachelor', majors: ['engineering'] } },
    ladder: [
      ['eng1', 'Engineer I', 4],
      ['eng2', 'Engineer II', 5, { req: { credentials: ['fe'] } }],
      ['project', 'Project Engineer', 6, { req: { credentials: ['pe'] }, abilities: ['sign', 'inspect'] }],
      ['senior', 'Senior Engineer', 7, { track: 'ic', req: { credentials: ['pe'] }, abilities: ['sign', 'inspect'] }],
      ['principal', 'Principal Engineer', 8, { track: 'ic', minSize: 'medium', abilities: ['sign', 'inspect'] }],
      ['manager', 'Engineering Manager', 7, { track: 'mgmt', req: { credentials: ['pe'] }, abilities: ['supervise', 'hire', 'sign'], reports: 12 }],
      ['pic', 'Principal-in-Charge', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 90 }],
    ],
  },
  medical: {
    id: 'medical', name: 'Medicine', icon: '⚕️', sector: 'private', payMultiplier: 2.1, minAge: 25, sizes: { medium: 2, large: 3, enterprise: 1 }, background: 'strict',
    employers: ['St. Brigid Medical Center', 'Mercy General', 'Lakeshore University Hospital'],
    valued: ['boardCertified'],
    entry: { education: { program: 'md' } },
    levels: [
      L('resident', 'Medical Resident', 4, { years: 3, abilities: ['prescribe'], rankPay: 0.39 }), // a resident's stipend, not a doctor's salary
      L('chiefResident', 'Chief Resident', 5, { req: { credentials: ['medicalLicense'] }, abilities: ['prescribe'], rankPay: 0.37 }),
      L('attending', 'Attending Physician', 7, { entry: true, req: { credentials: ['boardCertified'] }, abilities: ['prescribe', 'sign'] }),
      L('senior', 'Senior Attending', 8, { track: 'ic', abilities: ['prescribe', 'sign'] }),
      L('renowned', 'Renowned Specialist', 9, { track: 'ic', minSize: 'large', abilities: ['prescribe', 'sign'] }),
      L('head', 'Department Head', 9, { track: 'mgmt', abilities: ['prescribe', 'supervise', 'hire', 'budget', 'delegate'], reports: 40 }),
      L('chief', 'Chief of Medicine', 10, { track: 'mgmt', minSize: 'large', abilities: ['prescribe', 'supervise', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 300 }),
    ],
  },
  nursing: {
    id: 'nursing', name: 'Nursing', icon: '🩺', sector: 'private', payMultiplier: 0.98, promotionOdds: 0.85, minAge: 18, sizes: { small: 1, medium: 3, large: 3, enterprise: 1 }, background: 'strict',
    union: { chance: 0.25, name: 'National Nurses United', strike: true },
    employers: ['St. Brigid Medical Center', 'Mercy General', 'Sunrise Care Homes', 'Lakeshore University Hospital'],
    ladder: [
      ['cna', 'Certified Nursing Assistant', 1, { req: { credentials: ['cna'] } }],
      ['rn', 'Registered Nurse', 4, { entry: true, req: { credentials: ['rn'] } }],
      ['seniorRn', 'Senior Staff Nurse', 5, { req: { credentials: ['rn'] } }],
      ['icu', 'ICU Nurse', 6, { track: 'ic', req: { credentials: ['ccrn'] } }],
      ['flightNurse', 'Flight Nurse', 7, { track: 'ic', minSize: 'large', req: { credentials: ['ccrn'] }, airMedical: true }],
      ['cns', 'Clinical Nurse Specialist', 6, { track: 'ic', req: { education: { level: 'bachelor', majors: ['nursing'] } } }],
      ['np', 'Nurse Practitioner', 7, { track: 'ic', entry: true, req: { credentials: ['np'] }, abilities: ['prescribe'] }],
      ['crna', 'Certified Registered Nurse Anesthetist', 9, { track: 'ic', entry: true, req: { credentials: ['crnaLicense'] }, abilities: ['prescribe'] }],
      ['charge', 'Charge Nurse', 5, { track: 'mgmt', abilities: ['supervise'], reports: 10 }],
      ['manager', 'Nurse Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 30 }],
      ['director', 'Director of Nursing', 7, { track: 'mgmt', minSize: 'medium', req: { education: { level: 'bachelor', majors: ['nursing'] } }, abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 120 }],
      ['cno', 'Chief Nursing Officer', 9, { track: 'mgmt', minSize: 'large', req: { education: { level: 'master' } }, abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 800 }],
    ],
  },
  legalSupport: {
    id: 'legalSupport', name: 'Paralegal & Legal Support', icon: '📑', sector: 'private', payMultiplier: 0.95, minAge: 18, sizes: ALL_SIZES, background: 'standard',
    employers: ['Crane, Abbott & Vance LLP', 'Okoro Whitfield LLP', 'Hale & Marsh'],
    valued: ['paralegalCP'],
    ladder: [
      ['assistant', 'Legal Assistant', 2, { req: { education: { level: 'highschool' } } }],
      ['paralegal', 'Paralegal', 3, { entry: true, req: { education: { anyOf: [{ program: 'paralegal' }, { level: 'bachelor' }] } } }],
      ['senior', 'Senior Paralegal', 4, { track: 'ic', req: { credentials: ['paralegalCP'] } }],
      ['litigation', 'Litigation Support Specialist', 5, { track: 'ic', minSize: 'medium' }],
      ['manager', 'Paralegal Manager', 5, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire'], reports: 8 }],
      ['director', 'Director of Legal Operations', 7, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 40 }],
    ],
  },
  law: {
    id: 'law', name: 'Law', icon: '⚖️', sector: 'private', payMultiplier: 1.15, minAge: 24, sizes: ALL_SIZES, background: 'strict',
    employers: ['Crane, Abbott & Vance LLP', 'Okoro Whitfield LLP', 'Hale & Marsh', 'Sullivan Reyes LLP'],
    entry: { education: { program: 'jd' } },
    ladder: [
      ['clerk', 'Law Clerk', 4],
      ['associate', 'Associate', 6, { entry: true, req: { credentials: ['barLicense'] }, abilities: ['represent'] }],
      ['senior', 'Senior Associate', 7, { req: { credentials: ['barLicense'] }, abilities: ['represent'] }],
      ['counsel', 'Of Counsel', 8, { track: 'ic', abilities: ['represent', 'sign'] }],
      ['partner', 'Partner', 8, { track: 'mgmt', abilities: ['represent', 'supervise', 'hire', 'sign'], reports: 10 }],
      ['seniorPartner', 'Senior Partner', 9, { track: 'mgmt', minSize: 'medium', abilities: ['represent', 'supervise', 'budget', 'sign', 'delegate'], reports: 40 }],
      ['managingPartner', 'Managing Partner', 10, { track: 'mgmt', minSize: 'medium', abilities: ['represent', 'supervise', 'budget', 'sign', 'delegate', 'exec', 'policy'], reports: 300 }],
    ],
  },
  education: {
    id: 'education', name: 'K-12 Education', icon: '🍎', sector: 'municipal', employerName: (city) => `${city} Public Schools`, payMultiplier: 1.0, minAge: 21, sizes: { small: 2, medium: 3, large: 2 }, background: 'strict',
    union: { chance: 0.7, name: 'State Education Association', strike: true },
    benefits: { pension: 'teachers', dcPlan: '403(b)', match: 0 },
    employers: ['Lincoln Unified School District', 'Riverside School District', 'Westbrook ISD'],
    entry: { education: { level: 'bachelor' } },
    levels: [
      L('sub', 'Substitute Teacher', 2),
      L('teacher', 'Teacher', 3, { entry: true, req: { credentials: ['teachingCert'] } }),
      L('senior', 'Senior Teacher', 4, { req: { credentials: ['teachingCert'] } }),
      L('coach', 'Instructional Coach', 5, { track: 'ic', req: { education: { level: 'master' } } }),
      L('specialist', 'Curriculum Specialist', 6, { track: 'ic', minSize: 'medium', req: { education: { level: 'master' } } }),
      L('chair', 'Department Chair', 5, { track: 'mgmt', abilities: ['supervise'], reports: 8, rankPay: 0.86 }), // a teacher with a stipend
      L('ap', 'Assistant Principal', 6, { track: 'mgmt', req: { credentials: ['adminCert'] }, abilities: ['supervise', 'hire'], reports: 30, rankPay: 0.88 }),
      L('principal', 'Principal', 7, { track: 'mgmt', req: { credentials: ['adminCert'] }, abilities: ['supervise', 'hire', 'budget', 'sign'], reports: 70, rankPay: 0.88 }),
      L('director', 'District Director of Curriculum', 8, { track: 'mgmt', minSize: 'medium', req: { credentials: ['adminCert'] }, abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 40 }),
      L('assistantSuper', 'Assistant Superintendent', 8, { track: 'mgmt', minSize: 'large', req: { credentials: ['adminCert'] }, abilities: ['supervise', 'hire', 'budget', 'delegate', 'policy'], reports: 300 }),
      L('superintendent', 'Superintendent', 9, { track: 'mgmt', minSize: 'medium', req: { credentials: ['adminCert'] }, abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 900 }),
    ],
  },
  aviation: {
    id: 'aviation', name: 'Airline Pilot', icon: '🛫', sector: 'private', payMultiplier: 1.2, minAge: 18, sizes: { small: 2, medium: 3, large: 2, enterprise: 2 }, background: 'strict',
    union: { chance: 0.6, name: 'Air Line Pilots Association', strike: true },
    employers: ['SkyBridge Regional', 'Horizon Flight Academy', 'TransAmerica Airways', 'Pacific Crest Air', 'Bluewing Airlines'],
    flightHoursPerYear: 700, seniority: true, furlough: true, rotation: { label: 'on trips', away: 0.4 },
    ladder: [
      ['cfi', 'Flight Instructor', 3, { req: { credentials: ['cfi'] }, flying: true }],
      ['fo', 'Regional First Officer', 4, { entry: true, req: { credentials: ['atp'] }, flying: true, part121: true }],
      ['captain', 'Regional Captain', 6, { req: { credentials: ['atp', 'typeRating'] }, flying: true, part121: true }],
      ['majorFo', 'Major Airline First Officer', 7, { track: 'ic', minSize: 'large', flying: true, part121: true }],
      ['majorCaptain', 'Major Airline Captain', 8, { track: 'ic', minSize: 'large', req: { credentials: ['atp', 'typeRating'] }, flying: true, part121: true }],
      ['widebodyCaptain', 'International Widebody Captain', 9, { track: 'ic', minSize: 'enterprise', req: { credentials: ['atp', 'typeRating'] }, flying: true, part121: true }],
      ['checkAirman', 'Check Airman / Simulator Instructor', 7, { track: 'mgmt', abilities: ['supervise'], reports: 20 }],
      ['chiefPilot', 'Chief Pilot', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 300 }],
      ['dfo', 'Director of Flight Operations', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 2000 }],
    ],
  },
  realestate: {
    id: 'realestate', name: 'Real Estate', icon: '🏠', sector: 'private', payMultiplier: 1.0, minAge: 18, sizes: { small: 4, medium: 3, large: 1 }, background: 'standard', commission: true,
    employers: ['Keystone Realty', 'Blue Door Homes', 'Summit Sotheby\'s', 'Lakeside Properties'],
    entry: { credentials: ['realEstate'] },
    ladder: [
      ['agent', 'Real Estate Agent', 3, { req: { credentials: ['realEstate'] }, abilities: ['represent'] }],
      ['senior', 'Senior Agent', 4, { abilities: ['represent'] }],
      ['luxury', 'Luxury Property Specialist', 6, { track: 'ic', abilities: ['represent'] }],
      ['team', 'Team Leader', 5, { track: 'mgmt', abilities: ['supervise', 'represent'], reports: 6 }],
      ['broker', 'Managing Broker', 6, { track: 'mgmt', req: { credentials: ['brokerLicense'] }, abilities: ['supervise', 'hire', 'sign'], reports: 25 }],
      ['owner', 'Brokerage Owner', 7, { founder: true, track: 'mgmt', req: { credentials: ['brokerLicense'] }, abilities: ['supervise', 'hire', 'budget', 'sign', 'delegate', 'exec'], reports: 60 }],
    ],
  },
  cosmetology: {
    id: 'cosmetology', name: 'Cosmetology & Salon', icon: '💇', sector: 'private', payMultiplier: 0.85, minAge: 18, sizes: { small: 5, medium: 2, large: 1 }, background: 'lenient',
    employers: ['Mane Street Salon', 'Glow Studio', 'Shear Genius', 'Luxe Day Spa'],
    entry: { credentials: ['cosmetologyLicense'] },
    ladder: [
      ['stylist', 'Junior Stylist', 2],
      ['senior', 'Senior Stylist', 3],
      ['master', 'Master Stylist', 4, { track: 'ic' }],
      ['educator', 'Platform Artist & Educator', 5, { track: 'ic', minSize: 'medium' }],
      ['manager', 'Salon Manager', 4, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 8 }],
      ['owner', 'Salon Owner', 6, { founder: true, track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'sign', 'exec'], reports: 20 }],
    ],
  },
  plumbing: {
    id: 'plumbing', name: 'Plumbing & Pipefitting', icon: '🚰', sector: 'private', payMultiplier: 0.85, promotionOdds: 0.7, minAge: 18, sizes: { small: 4, medium: 3, large: 1 }, background: 'lenient',
    union: { chance: 0.4, name: 'UA Plumbers & Pipefitters Local 130', strike: true },
    benefits: { unionPension: 'union' },
    employers: ['Flow Masters Plumbing', 'Riverside Mechanical', 'Keystone Pipe & Steam'],
    valued: ['oshaSafety', 'driverLicense'],
    ladder: [
      ['apprentice', 'Apprentice Plumber', 2, { req: { education: { level: 'highschool' } }, years: 4 }],
      ['journeyman', 'Journeyman Plumber', 4, { entry: true, req: { credentials: ['journeymanPlumber'] }, years: 5 }],
      ['master', 'Master Plumber', 5, { track: 'ic', req: { credentials: ['masterPlumber'] }, abilities: ['sign'] }],
      ['inspector', 'Plumbing Inspector', 6, { track: 'ic', req: { credentials: ['masterPlumber'] }, abilities: ['inspect'] }],
      ['foreman', 'Plumbing Foreman', 5, { track: 'mgmt', abilities: ['supervise'], reports: 8 }],
      ['owner', 'Plumbing Contractor (Owner)', 8, { founder: true, track: 'mgmt', req: { credentials: ['masterPlumber'] }, abilities: ['supervise', 'hire', 'budget', 'sign', 'exec'], reports: 40 }],
    ],
  },
  socialWork: {
    id: 'socialWork', name: 'Social Work & Counseling', icon: '🤝', sector: 'private', payMultiplier: 0.9, minAge: 21, sizes: { small: 3, medium: 3, large: 1 }, background: 'strict',
    union: { chance: 0.2, name: 'SEIU Healthcare', strike: true },
    employers: ['Harbor Family Services', 'Lakeshore Behavioral Health', 'Hope Community Center'],
    entry: { education: { level: 'bachelor' } },
    valued: ['lcsw', 'cit'],
    ladder: [
      ['caseManager', 'Case Manager', 3],
      ['socialWorker', 'Social Worker', 4, { entry: true, req: { education: { program: 'msw' } } }],
      ['clinician', 'Licensed Clinical Social Worker', 6, { track: 'ic', entry: true, req: { credentials: ['lcsw'] } }],
      ['therapist', 'Psychotherapist (Private Practice)', 7, { track: 'ic', req: { credentials: ['lcsw'] } }],
      ['supervisor', 'Clinical Supervisor', 6, { track: 'mgmt', req: { credentials: ['lcsw'] }, abilities: ['supervise'], reports: 10 }],
      ['director', 'Program Director', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 50 }],
    ],
  },
  pharmacy: {
    id: 'pharmacy', name: 'Pharmacy', icon: '💊', sector: 'private', payMultiplier: 1.25, minAge: 18, sizes: { small: 2, medium: 2, large: 3, enterprise: 2 }, background: 'strict',
    employers: ['CornerCare Pharmacy', 'Mercy General Pharmacy', 'ValuMart Pharmacy'],
    ladder: [
      ['tech', 'Pharmacy Technician', 1],
      ['intern', 'Pharmacy Intern', 3, { req: { education: { program: 'pharmd' } } }],
      ['pharmacist', 'Staff Pharmacist', 7, { entry: true, req: { credentials: ['pharmacistLicense'] }, abilities: ['prescribe'] }],
      ['clinical', 'Clinical Pharmacist Specialist', 8, { track: 'ic', abilities: ['prescribe'] }],
      ['pic', 'Pharmacist in Charge', 7, { track: 'mgmt', abilities: ['prescribe', 'supervise', 'sign'], reports: 8 }],
      ['director', 'Director of Pharmacy', 8, { track: 'mgmt', minSize: 'large', abilities: ['prescribe', 'supervise', 'budget', 'delegate'], reports: 60 }],
    ],
  },
  insurance: {
    id: 'insurance', name: 'Insurance', icon: '🛡️', sector: 'private', payMultiplier: 1.0, minAge: 18, sizes: ALL_SIZES, background: 'standard',
    employers: ['Shieldwell Insurance', 'Prairie Mutual', 'Guardian Point Agency'],
    valued: ['insuranceProducer', 'cpa'],
    ladder: [
      ['csr', 'Customer Service Rep', 2],
      ['agent', 'Insurance Agent', 3, { entry: true, req: { credentials: ['insuranceProducer'] }, abilities: ['sign'] }],
      ['underwriter', 'Underwriter', 4, { req: { education: { level: 'bachelor' } }, abilities: ['sign'] }],
      ['actuary', 'Actuary', 6, { track: 'ic', req: { smarts: 70 } }],
      ['chiefActuary', 'Chief Actuary', 8, { track: 'ic', minSize: 'large', req: { smarts: 75 } }],
      ['claimsManager', 'Claims Manager', 5, { track: 'mgmt', abilities: ['supervise', 'sign'], reports: 15 }],
      ['vp', 'VP of Underwriting', 7, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'budget', 'delegate', 'sign'], reports: 80 }],
      ['ceo', 'Insurance CEO', 10, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 3000 }],
    ],
  },
  propertyManagement: {
    id: 'propertyManagement', name: 'Property Management', icon: '🔑', sector: 'private', payMultiplier: 0.95, minAge: 18, sizes: { small: 3, medium: 3, large: 2 }, background: 'standard',
    employers: ['Keystone Property Group', 'Urban Nest Management', 'Lakeside Residential'],
    valued: ['realEstate', 'brokerLicense'],
    ladder: [
      ['leasing', 'Leasing Agent', 2],
      ['assistant', 'Assistant Property Manager', 3],
      ['manager', 'Property Manager', 4, { req: { credentials: ['realEstate'] }, abilities: ['supervise', 'sign'], reports: 5 }],
      ['portfolio', 'Portfolio Manager', 6, { track: 'ic', abilities: ['sign', 'budget'] }],
      ['regional', 'Regional Property Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 30 }],
      ['vp', 'VP of Property Operations', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 200 }],
    ],
  },
  journalism: {
    id: 'journalism', name: 'Journalism & Media', icon: '📰', sector: 'private', payMultiplier: 0.9, minAge: 21, sizes: ALL_SIZES, background: 'lenient', remote: true,
    union: { chance: 0.3, name: 'NewsGuild', strike: true },
    employers: ['The Daily Ledger', 'Metro Public Radio', 'Channel 7 News', 'The Capitol Dispatch'],
    entry: { education: { level: 'bachelor' } },
    ladder: [
      ['reporter', 'Staff Reporter', 3],
      ['senior', 'Senior Reporter', 4],
      ['investigative', 'Investigative Reporter', 5, { track: 'ic' }],
      ['columnist', 'Columnist / Anchor', 7, { track: 'ic', minSize: 'medium' }],
      ['editor', 'Section Editor', 5, { track: 'mgmt', abilities: ['supervise'], reports: 8 }],
      ['managing', 'Managing Editor', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 40 }],
      ['editorInChief', 'Editor-in-Chief', 8, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 150 }],
    ],
  },
  clergy: {
    id: 'clergy', name: 'Clergy & Ministry', icon: '🙏', sector: 'private', payMultiplier: 0.75, minAge: 18, sizes: { small: 6, medium: 3, large: 1 }, background: 'standard', promotionOdds: 0.5,
    // Congregations don't run layoffs: a small one can close, and a small faith's seminary can fold.
    church: true,
    layoffRate: (state, job) => {
      const small = (TRADITIONS[job.tradition ?? state.community?.faith?.traditionId]?.weight ?? 1) < 1;
      return job.levelId === 'seminarian' ? (small ? 0.03 : 0.003) : (small ? 0.015 : 0.004);
    },
    employers: ['Community Congregation'],
    // Ordination depends on your tradition; titles come from it too (Parish Priest, Rabbi, Imam…).
    // Catholic priests are ordained through a diocese (see catholicClergy).
    eligible: (state) => (HIERARCHICAL.includes(state.community?.faith?.traditionId) ? { ok: false, reason: 'Catholic priests are ordained through a diocese — see Catholic Priesthood' }
      : state.community?.faith?.traditionId === 'anglican' ? { ok: false, reason: 'Anglican clergy are selected and ordained through a diocese — see Anglican Holy Orders' } : clergyEligibility(state)),
    prepare: (state, job) => {
      const t = TRADITIONS[state.community?.faith?.traditionId];
      if (t) {
        job.tradition = state.community.faith.traditionId;
        job.titleMap = t.clergy.titles;
      }
    },
    ladder: [
      ['seminarian', 'Seminarian', 1, { years: 2 }],
      ['associate', 'Associate Minister', 3, { entry: true, req: { education: { program: 'seminary' } } }],
      ['minister', 'Minister', 4],
      ['chaplain', 'Chaplain', 5, { track: 'ic', req: { education: { program: 'seminary' } } }],
      ['senior', 'Senior Minister', 6, { track: 'mgmt', req: { education: { program: 'seminary' } }, abilities: ['supervise', 'hire', 'budget'], reports: 6 }],
      ['regional', 'Regional Leader', 8, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 40 }],
    ],
  },
  catholicClergy: {
    id: 'catholicClergy', name: 'Catholic Priesthood', icon: '✝️', sector: 'private', payMultiplier: 0.4, minAge: 18, sizes: { small: 3, medium: 3, large: 2, enterprise: 1 }, background: 'strict', promotionOdds: 0.35,
    // A diocese reassigns its clergy; it never lays them off.
    church: true, layoffRate: 0,
    // A diocese (archdiocese for the biggest sees) is the unit of the Church that ordains and assigns its priests.
    body: 'catholic',
    employerName: (city) => dioceseName(currentCountry() ?? 'US', city),
    eligible: (state) => (HIERARCHICAL.includes(state.community?.faith?.traditionId) ? clergyEligibility(state) : { ok: false, reason: 'Belong to the Catholic Church' }),
    prepare: (state, job) => {
      job.tradition = state.community?.faith?.traditionId ?? 'catholic';
      if (job.employer.size === 'enterprise') job.employer.name = dioceseName(state.character.countryId ?? 'US', REGIONS[state.character.regionId]?.name ?? job.employer.name, true);
    },
    ladder: [
      ['seminarian', 'Seminarian', 1, { years: 5 }],
      ['deacon', 'Transitional Deacon', 2, { years: 1 }],
      ['vicar', 'Parochial Vicar', 3, { years: 3 }],
      ['pastor', 'Pastor', 4, { abilities: ['supervise'], reports: 6 }],
      ['monsignor', 'Monsignor', 5, { track: 'ic' }],
      ['vicarGeneral', 'Vicar General', 6, { track: 'mgmt', abilities: ['supervise', 'budget'], reports: 40 }],
      ['auxBishop', 'Auxiliary Bishop', 7, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate'], reports: 120 }],
      ['bishop', 'Bishop', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 300 }],
      ['archbishop', 'Archbishop', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 900 }],
      ['cardinal', 'Cardinal', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 900 }],
    ],
  },
  anglicanClergy: {
    id: 'anglicanClergy', name: 'Anglican Holy Orders', icon: '⛪', sector: 'private', payMultiplier: 0.55, minAge: 18, sizes: { small: 3, medium: 3, large: 2, enterprise: 1 }, background: 'strict', promotionOdds: 0.35,
    // A diocese reassigns its clergy; it never lays them off.
    church: true, layoffRate: 0,
    // The Church of England and the rest of the Anglican Communion: a diocese selects, trains and
    // licenses its clergy. Women are ordained (bishops too) and clergy may marry.
    body: 'anglican',
    employerName: (city) => anglicanDioceseName(currentCountry() ?? 'US', city),
    eligible: (state) => (state.community?.faith?.traditionId === 'anglican' ? clergyEligibility(state) : { ok: false, reason: 'Belong to an Anglican church (the Church of England and its sister churches)' }),
    prepare: (state, job) => {
      job.tradition = 'anglican';
      if (job.employer.size === 'enterprise') job.employer.name = anglicanDioceseName(state.character.countryId ?? 'US', REGIONS[state.character.regionId]?.name ?? job.employer.name, true);
    },
    ladder: [
      ['ordinand', 'Ordinand', 1, { years: 3 }],
      ['deacon', 'Deacon (Curate)', 2, { years: 1 }],
      ['curate', 'Assistant Curate', 3, { years: 2 }],
      ['vicar', 'Vicar', 4, { abilities: ['supervise'], reports: 4 }],
      ['canon', 'Canon', 5, { track: 'ic' }],
      ['ruralDean', 'Rural Dean', 5, { track: 'mgmt', abilities: ['supervise'], reports: 15 }],
      ['archdeacon', 'Archdeacon', 6, { track: 'mgmt', abilities: ['supervise', 'budget'], reports: 60 }],
      ['dean', 'Dean of the Cathedral', 7, { track: 'ic', minSize: 'large' }],
      ['suffragan', 'Suffragan Bishop', 7, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate'], reports: 150 }],
      ['bishop', 'Diocesan Bishop', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 300 }],
      ['archbishop', 'Archbishop', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 900 }],
    ],
  },
  hospitality: {
    id: 'hospitality', name: 'Hotels & Hospitality', icon: '🏨', sector: 'private', payMultiplier: 0.68, promotionOdds: 0.4, minAge: 16, sizes: ALL_SIZES, background: 'lenient',
    union: { chance: 0.15, name: 'UNITE HERE Local 11', strike: true },
    employers: ['Meridian Hotel Group', 'Harborview Resort', 'Grand Plaza Hotel', 'Summit Lodge'],
    ladder: [
      ['frontDesk', 'Front Desk Agent', 1],
      ['supervisor', 'Front Office Supervisor', 2, { abilities: ['supervise'], reports: 4 }],
      ['revenue', 'Revenue Manager', 5, { track: 'ic', req: { education: { level: 'bachelor' } } }],
      ['sales', 'Director of Sales', 6, { track: 'ic', minSize: 'medium' }],
      ['frontManager', 'Front Office Manager', 4, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 15 }],
      ['gm', 'General Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'sign'], reports: 120 }],
      ['regional', 'Regional VP of Operations', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 1500 }],
    ],
  },
};

export default { id: 'careers-private', version: 1, careers };
