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
import { L } from './Ladder.js';
import { MUNICIPAL_PROFESSIONS } from '../publicservice/MunicipalGov.js';
import { FEDERAL_PROFESSIONS } from '../publicservice/FederalAgencies.js';

const ALL_SIZES = { small: 4, medium: 3, large: 2, enterprise: 1 };

export const PRIVATE_PROFESSIONS = {
  retail: {
    id: 'retail', name: 'Retail', icon: '🛍️', sector: 'private', payMultiplier: 0.78, minAge: 16, sizes: ALL_SIZES, background: 'lenient',
    union: { chance: 0.1, name: 'UFCW Local 400', strike: true },
    employers: ['Bayside Market', 'Northgate Outfitters', 'Target Point', 'Corner Hardware Co.'],
    levels: [
      L('associate', 'Sales Associate', 1),
      L('seniorAssociate', 'Senior Sales Associate', 2, { minSize: 'medium' }),
      L('merch', 'Visual Merchandiser', 3, { track: 'ic' }),
      L('buyer', 'Buyer', 5, { track: 'ic', minSize: 'large', req: { education: { level: 'bachelor' } }, abilities: ['budget', 'sign'] }),
      L('shiftLead', 'Shift Lead', 2, { track: 'mgmt', abilities: ['supervise'], reports: 4 }),
      L('asm', 'Assistant Store Manager', 3, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 8 }),
      L('storeManager', 'Store Manager', 4, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 20 }),
      L('districtManager', 'District Manager', 6, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 60 }),
      L('regionalDirector', 'Regional Director', 7, { track: 'mgmt', minSize: 'large', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'budget', 'delegate', 'sign'], reports: 250 }),
      L('vpOps', 'VP of Retail Operations', 9, { track: 'mgmt', minSize: 'enterprise', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 2000 }),
    ],
  },
  culinary: {
    id: 'culinary', name: 'Culinary', icon: '👨‍🍳', sector: 'private', payMultiplier: 0.82, minAge: 16, sizes: { small: 5, medium: 3, large: 1 }, background: 'lenient',
    union: { chance: 0.08, name: 'UNITE HERE Local 1', strike: true },
    employers: ['The Copper Pot', 'Harvest Table', 'Saltwater Grill', 'Meridian Hotel Group'],
    levels: [
      L('prep', 'Prep Cook', 1),
      L('line', 'Line Cook', 2, { entry: true, req: { education: { program: 'culinaryArts' } } }),
      L('partie', 'Chef de Partie', 3, { track: 'ic' }),
      L('pastry', 'Pastry Chef', 4, { track: 'ic' }),
      L('masterChef', 'Master Chef', 6, { track: 'ic', minSize: 'medium' }),
      L('sous', 'Sous Chef', 3, { track: 'mgmt', abilities: ['supervise'], reports: 6 }),
      L('cdc', 'Chef de Cuisine', 4, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 12 }),
      L('exec', 'Executive Chef', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 25 }),
      L('director', 'Culinary Director', 7, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign'], reports: 120 }),
    ],
  },
  trades: {
    id: 'trades', name: 'Electrical Trades', icon: '⚡', sector: 'private', payMultiplier: 1.05, minAge: 18, sizes: { small: 4, medium: 3, large: 1 }, background: 'lenient',
    union: { chance: 0.45, name: 'IBEW Local 98', strike: true },
    benefits: { unionPension: 'union' },
    employers: ['Volt Brothers Electric', 'Keystone Builders', 'Ironline Contracting', 'Summit Electrical'],
    valued: ['oshaSafety', 'driverLicense'],
    levels: [
      L('apprentice', 'Apprentice Electrician', 2, { req: { education: { level: 'highschool' } }, years: 4 }),
      L('journeyman', 'Journeyman Electrician', 4, { entry: true, req: { credentials: ['journeymanElectrician'] } }),
      L('master', 'Master Electrician', 5, { track: 'ic', req: { credentials: ['masterElectrician'] } }),
      L('estimator', 'Senior Estimator', 6, { track: 'ic', minSize: 'medium' }),
      L('foreman', 'Foreman', 5, { track: 'mgmt', req: { credentials: ['journeymanElectrician'] }, abilities: ['supervise'], reports: 8 }),
      L('super', 'Site Superintendent', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'inspect'], reports: 25 }),
      L('pm', 'Construction Project Manager', 7, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'budget', 'sign'], reports: 60 }),
      L('owner', 'Owner / President', 8, { track: 'mgmt', req: { credentials: ['masterElectrician'] }, abilities: ['supervise', 'hire', 'budget', 'sign', 'delegate', 'exec'], reports: 80 }),
    ],
  },
  trucking: {
    id: 'trucking', name: 'Trucking & Logistics', icon: '🚛', sector: 'private', payMultiplier: 0.95, minAge: 21, sizes: { small: 2, medium: 3, large: 3, enterprise: 1 }, background: 'standard',
    union: { chance: 0.3, name: 'Teamsters Local 710', strike: true },
    benefits: { unionPension: 'union' },
    employers: ['Interstate Freight Lines', 'Prairie Haulers', 'BlueLine Logistics', 'Apex Carriers'],
    entry: { credentials: ['driverLicense'] },
    levels: [
      L('trainee', 'CDL Driver Trainee', 1, { req: { credentials: ['driverLicense'] } }),
      L('driver', 'Company Driver', 3, { entry: true, req: { credentials: ['cdlA'] } }),
      L('senior', 'Senior Linehaul Driver', 4, { track: 'ic', req: { credentials: ['cdlA'] } }),
      L('tanker', 'HazMat Tanker Driver', 5, { track: 'ic', req: { credentials: ['hazmatEndorsement'] } }),
      L('dispatcher', 'Dispatcher', 3, { track: 'mgmt', abilities: ['supervise'], reports: 15 }),
      L('fleet', 'Fleet Manager', 5, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 40 }),
      L('terminal', 'Terminal Manager', 6, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 120 }),
      L('vpOps', 'VP of Operations', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 900 }),
    ],
  },
  tech: {
    id: 'tech', name: 'Technology', icon: '💻', sector: 'private', payMultiplier: 1.3, minAge: 18, sizes: ALL_SIZES, background: 'standard', remote: true,
    union: { chance: 0.03, name: 'Tech Workers Union', strike: true },
    employers: ['Nimbus Labs', 'ByteForge', 'Quantal Systems', 'Pixelridge', 'Orbital Software'],
    valued: ['awsCert', 'cissp'],
    entry: { smarts: 45 },
    levels: [
      L('qa', 'QA Tester', 2),
      L('junior', 'Junior Developer', 3, { entry: true, req: { anyOf: [{ education: { level: 'bachelor', majors: ['computerScience', 'engineering'] } }, { education: { level: 'associate', majors: ['computerScience'] } }] } }),
      L('swe', 'Software Engineer', 4, { req: { smarts: 55 } }),
      L('senior', 'Senior Engineer', 5, { track: 'ic', req: { smarts: 60 } }),
      L('staff', 'Staff Engineer', 6, { track: 'ic', minSize: 'medium' }),
      L('principal', 'Principal Engineer', 7, { track: 'ic', minSize: 'large' }),
      L('distinguished', 'Distinguished Engineer', 8, { track: 'ic', minSize: 'enterprise' }),
      L('lead', 'Tech Lead', 5, { track: 'mgmt', abilities: ['supervise'], reports: 5 }),
      L('em', 'Engineering Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 9 }),
      L('director', 'Director of Engineering', 7, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 45 }),
      L('vp', 'VP of Engineering', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign'], reports: 200 }),
      L('cto', 'Chief Technology Officer', 10, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 400 }),
    ],
  },
  corporate: {
    id: 'corporate', name: 'Corporate Business', icon: '🏢', sector: 'private', payMultiplier: 1.05, minAge: 21, sizes: ALL_SIZES, background: 'standard',
    employers: ['Sterling & Rowe', 'Meridian Holdings', 'Apex Consolidated', 'Harbor Point Group'],
    valued: ['pmp', 'sixSigmaGreen', 'leadershipProgram'],
    entry: { education: { level: 'bachelor' } },
    levels: [
      L('jrAnalyst', 'Junior Analyst', 2),
      L('analyst', 'Analyst', 3),
      L('srAnalyst', 'Senior Analyst', 4),
      L('specialist', 'Senior Specialist', 5, { track: 'ic' }),
      L('principal', 'Principal Consultant', 6, { track: 'ic', minSize: 'medium' }),
      L('fellow', 'Distinguished Fellow', 8, { track: 'ic', minSize: 'large' }),
      L('teamLead', 'Team Supervisor', 5, { track: 'mgmt', abilities: ['supervise'], reports: 6 }),
      L('opsManager', 'Operations Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 14 }),
      L('director', 'Director', 7, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget', 'delegate', 'sign'], reports: 50 }),
      L('seniorDirector', 'Senior Director', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign'], reports: 140 }),
      L('vp', 'Vice President', 9, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 300 }),
      L('ceo', 'Chief Executive Officer', 10, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 1000 }),
    ],
  },
  finance: {
    id: 'finance', name: 'Investment Banking', icon: '💹', sector: 'private', payMultiplier: 1.45, minAge: 21, sizes: { medium: 2, large: 3, enterprise: 2 }, background: 'strict',
    employers: ['Goldbridge Partners', 'Harrow Capital', 'Whitlock Securities'],
    valued: ['series7', 'series66', 'cpa'],
    entry: { education: { level: 'bachelor' }, smarts: 55 },
    levels: [
      L('analyst', 'IB Analyst', 4, { abilities: ['trade'] }),
      L('associate', 'IB Associate', 5, { req: { credentials: ['series7'] }, abilities: ['trade'] }),
      L('vp', 'Vice President', 6, { req: { credentials: ['series7'] }, abilities: ['trade', 'sign'] }),
      L('pm', 'Portfolio Manager', 7, { track: 'ic', req: { credentials: ['series66'] }, abilities: ['trade', 'sign'] }),
      L('cio', 'Chief Investment Officer', 9, { track: 'ic', minSize: 'large', abilities: ['trade', 'sign', 'policy'] }),
      L('director', 'Director', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'trade', 'sign'], reports: 10 }),
      L('md', 'Managing Director', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'trade', 'sign', 'delegate'], reports: 35 }),
      L('groupHead', 'Group Head', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 120 }),
    ],
  },
  accounting: {
    id: 'accounting', name: 'Accounting', icon: '🧮', sector: 'private', payMultiplier: 1.08, minAge: 21, sizes: ALL_SIZES, background: 'strict',
    employers: ['Carver & Lin CPAs', 'Northfield Advisory', 'Big Four Partners LLP'],
    valued: ['cpa', 'cgfm'],
    entry: { education: { level: 'bachelor' } },
    levels: [
      L('staff', 'Staff Accountant', 3, { abilities: ['audit'] }),
      L('senior', 'Senior Accountant', 4, { abilities: ['audit'] }),
      L('tax', 'Tax Specialist', 5, { track: 'ic', abilities: ['audit'] }),
      L('forensic', 'Forensic Accountant', 6, { track: 'ic', req: { credentials: ['cpa'] }, abilities: ['audit'] }),
      L('auditManager', 'Audit Manager', 6, { track: 'mgmt', req: { credentials: ['cpa'] }, abilities: ['supervise', 'audit', 'sign'], reports: 8 }),
      L('seniorManager', 'Senior Manager', 7, { track: 'mgmt', minSize: 'large', req: { credentials: ['cpa'] }, abilities: ['supervise', 'hire', 'audit', 'sign'], reports: 20 }),
      L('partner', 'Partner', 8, { track: 'mgmt', req: { credentials: ['cpa'] }, abilities: ['supervise', 'hire', 'budget', 'sign', 'delegate'], reports: 40 }),
      L('managingPartner', 'Managing Partner', 10, { track: 'mgmt', minSize: 'large', req: { credentials: ['cpa'] }, abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 400 }),
    ],
  },
  engineering: {
    id: 'engineering', name: 'Civil Engineering', icon: '🏗️', sector: 'private', payMultiplier: 1.12, minAge: 21, sizes: ALL_SIZES, background: 'standard',
    employers: ['Granite & Steel Engineering', 'Riverbend Consulting', 'Atlas Infrastructure'],
    valued: ['fe', 'pe', 'pmp', 'oshaSafety'],
    entry: { education: { level: 'bachelor', majors: ['engineering'] } },
    levels: [
      L('eng1', 'Engineer I', 4),
      L('eng2', 'Engineer II', 5, { req: { credentials: ['fe'] } }),
      L('project', 'Project Engineer', 6, { req: { credentials: ['pe'] }, abilities: ['sign', 'inspect'] }),
      L('senior', 'Senior Engineer', 7, { track: 'ic', req: { credentials: ['pe'] }, abilities: ['sign', 'inspect'] }),
      L('principal', 'Principal Engineer', 8, { track: 'ic', minSize: 'medium', abilities: ['sign', 'inspect'] }),
      L('manager', 'Engineering Manager', 7, { track: 'mgmt', req: { credentials: ['pe'] }, abilities: ['supervise', 'hire', 'sign'], reports: 12 }),
      L('pic', 'Principal-in-Charge', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 90 }),
    ],
  },
  medical: {
    id: 'medical', name: 'Medicine', icon: '⚕️', sector: 'private', payMultiplier: 1.55, minAge: 25, sizes: { medium: 2, large: 3, enterprise: 1 }, background: 'strict',
    employers: ['St. Brigid Medical Center', 'Mercy General', 'Lakeshore University Hospital'],
    valued: ['boardCertified'],
    entry: { education: { program: 'md' } },
    levels: [
      L('resident', 'Medical Resident', 4, { years: 3, abilities: ['prescribe'] }),
      L('chiefResident', 'Chief Resident', 5, { req: { credentials: ['medicalLicense'] }, abilities: ['prescribe'] }),
      L('attending', 'Attending Physician', 7, { entry: true, req: { credentials: ['boardCertified'] }, abilities: ['prescribe', 'sign'] }),
      L('senior', 'Senior Attending', 8, { track: 'ic', abilities: ['prescribe', 'sign'] }),
      L('renowned', 'Renowned Specialist', 9, { track: 'ic', minSize: 'large', abilities: ['prescribe', 'sign'] }),
      L('head', 'Department Head', 9, { track: 'mgmt', abilities: ['prescribe', 'supervise', 'hire', 'budget', 'delegate'], reports: 40 }),
      L('chief', 'Chief of Medicine', 10, { track: 'mgmt', minSize: 'large', abilities: ['prescribe', 'supervise', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 300 }),
    ],
  },
  nursing: {
    id: 'nursing', name: 'Nursing', icon: '🩺', sector: 'private', payMultiplier: 1.08, minAge: 18, sizes: { small: 1, medium: 3, large: 3, enterprise: 1 }, background: 'strict',
    union: { chance: 0.25, name: 'National Nurses United', strike: true },
    employers: ['St. Brigid Medical Center', 'Mercy General', 'Sunrise Care Homes', 'Lakeshore University Hospital'],
    levels: [
      L('cna', 'Certified Nursing Assistant', 1, { req: { credentials: ['cna'] } }),
      L('rn', 'Registered Nurse', 4, { entry: true, req: { credentials: ['rn'] } }),
      L('seniorRn', 'Senior Staff Nurse', 5, { req: { credentials: ['rn'] } }),
      L('cns', 'Clinical Nurse Specialist', 6, { track: 'ic', req: { education: { level: 'bachelor', majors: ['nursing'] } } }),
      L('np', 'Nurse Practitioner', 7, { track: 'ic', entry: true, req: { credentials: ['np'] }, abilities: ['prescribe'] }),
      L('charge', 'Charge Nurse', 5, { track: 'mgmt', abilities: ['supervise'], reports: 10 }),
      L('manager', 'Nurse Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 30 }),
      L('director', 'Director of Nursing', 7, { track: 'mgmt', minSize: 'medium', req: { education: { level: 'bachelor', majors: ['nursing'] } }, abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 120 }),
      L('cno', 'Chief Nursing Officer', 9, { track: 'mgmt', minSize: 'large', req: { education: { level: 'master' } }, abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 800 }),
    ],
  },
  legalSupport: {
    id: 'legalSupport', name: 'Paralegal & Legal Support', icon: '📑', sector: 'private', payMultiplier: 0.95, minAge: 18, sizes: ALL_SIZES, background: 'standard',
    employers: ['Crane, Abbott & Vance LLP', 'Okoro Whitfield LLP', 'Hale & Marsh'],
    valued: ['paralegalCP'],
    levels: [
      L('assistant', 'Legal Assistant', 2, { req: { education: { level: 'highschool' } } }),
      L('paralegal', 'Paralegal', 3, { entry: true, req: { education: { anyOf: [{ program: 'paralegal' }, { level: 'bachelor' }] } } }),
      L('senior', 'Senior Paralegal', 4, { track: 'ic', req: { credentials: ['paralegalCP'] } }),
      L('litigation', 'Litigation Support Specialist', 5, { track: 'ic', minSize: 'medium' }),
      L('manager', 'Paralegal Manager', 5, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire'], reports: 8 }),
      L('director', 'Director of Legal Operations', 7, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 40 }),
    ],
  },
  law: {
    id: 'law', name: 'Law', icon: '⚖️', sector: 'private', payMultiplier: 1.35, minAge: 24, sizes: ALL_SIZES, background: 'strict',
    employers: ['Crane, Abbott & Vance LLP', 'Okoro Whitfield LLP', 'Hale & Marsh', 'Sullivan Reyes LLP'],
    entry: { education: { program: 'jd' } },
    levels: [
      L('clerk', 'Law Clerk', 4),
      L('associate', 'Associate', 6, { entry: true, req: { credentials: ['barLicense'] }, abilities: ['represent'] }),
      L('senior', 'Senior Associate', 7, { req: { credentials: ['barLicense'] }, abilities: ['represent'] }),
      L('counsel', 'Of Counsel', 8, { track: 'ic', abilities: ['represent', 'sign'] }),
      L('partner', 'Partner', 8, { track: 'mgmt', abilities: ['represent', 'supervise', 'hire', 'sign'], reports: 10 }),
      L('seniorPartner', 'Senior Partner', 9, { track: 'mgmt', minSize: 'medium', abilities: ['represent', 'supervise', 'budget', 'sign', 'delegate'], reports: 40 }),
      L('managingPartner', 'Managing Partner', 10, { track: 'mgmt', minSize: 'medium', abilities: ['represent', 'supervise', 'budget', 'sign', 'delegate', 'exec', 'policy'], reports: 300 }),
    ],
  },
  education: {
    id: 'education', name: 'K-12 Education', icon: '🍎', sector: 'state', payMultiplier: 0.92, minAge: 21, sizes: { small: 2, medium: 3, large: 2 }, background: 'strict',
    union: { chance: 0.7, name: 'State Education Association', strike: true },
    benefits: { pension: 'teachers', dcPlan: '403(b)', match: 0 },
    employers: ['Lincoln Unified School District', 'Riverside School District', 'Westbrook ISD'],
    entry: { education: { level: 'bachelor' } },
    levels: [
      L('sub', 'Substitute Teacher', 2),
      L('teacher', 'Teacher', 3, { entry: true, req: { credentials: ['teachingCert'] } }),
      L('senior', 'Senior Teacher', 4, { req: { credentials: ['teachingCert'] } }),
      L('coach', 'Instructional Coach', 5, { track: 'ic', req: { education: { level: 'master' } } }),
      L('chair', 'Department Chair', 5, { track: 'mgmt', abilities: ['supervise'], reports: 8 }),
      L('ap', 'Assistant Principal', 6, { track: 'mgmt', req: { education: { level: 'master' } }, abilities: ['supervise', 'hire'], reports: 30 }),
      L('principal', 'Principal', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'sign'], reports: 70 }),
      L('superintendent', 'Superintendent', 9, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 900 }),
    ],
  },
  aviation: {
    id: 'aviation', name: 'Aviation', icon: '🛫', sector: 'private', payMultiplier: 1.2, minAge: 18, sizes: { small: 2, medium: 3, large: 2, enterprise: 2 }, background: 'strict',
    union: { chance: 0.6, name: 'Air Line Pilots Association', strike: true },
    employers: ['SkyBridge Regional', 'Horizon Flight Academy', 'TransAmerica Airways', 'Pacific Crest Air'],
    flightHoursPerYear: 700,
    levels: [
      L('cfi', 'Flight Instructor', 3, { req: { credentials: ['cfi'] } }),
      L('fo', 'Regional First Officer', 4, { entry: true, req: { credentials: ['atp'] } }),
      L('captain', 'Regional Captain', 6, { req: { credentials: ['atp'] } }),
      L('majorFo', 'Major Airline First Officer', 7, { track: 'ic', minSize: 'large' }),
      L('majorCaptain', 'Major Airline Captain', 8, { track: 'ic', minSize: 'large' }),
      L('checkAirman', 'Check Airman', 7, { track: 'mgmt', abilities: ['supervise'], reports: 20 }),
      L('chiefPilot', 'Chief Pilot', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 300 }),
      L('dfo', 'Director of Flight Operations', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 2000 }),
    ],
  },
  realestate: {
    id: 'realestate', name: 'Real Estate', icon: '🏠', sector: 'private', payMultiplier: 1.0, minAge: 18, sizes: { small: 4, medium: 3, large: 1 }, background: 'standard', commission: true,
    employers: ['Keystone Realty', 'Blue Door Homes', 'Summit Sotheby\'s', 'Lakeside Properties'],
    entry: { credentials: ['realEstate'] },
    levels: [
      L('agent', 'Real Estate Agent', 3, { req: { credentials: ['realEstate'] }, abilities: ['represent'] }),
      L('senior', 'Senior Agent', 4, { abilities: ['represent'] }),
      L('luxury', 'Luxury Property Specialist', 6, { track: 'ic', abilities: ['represent'] }),
      L('team', 'Team Leader', 5, { track: 'mgmt', abilities: ['supervise', 'represent'], reports: 6 }),
      L('broker', 'Managing Broker', 6, { track: 'mgmt', req: { credentials: ['brokerLicense'] }, abilities: ['supervise', 'hire', 'sign'], reports: 25 }),
      L('owner', 'Brokerage Owner', 7, { track: 'mgmt', req: { credentials: ['brokerLicense'] }, abilities: ['supervise', 'hire', 'budget', 'sign', 'delegate', 'exec'], reports: 60 }),
    ],
  },
};

export const PROFESSIONS = { ...PRIVATE_PROFESSIONS, ...MUNICIPAL_PROFESSIONS, ...FEDERAL_PROFESSIONS };
export const PROFESSION_LIST = Object.values(PROFESSIONS);

export const SECTOR_LABEL = { private: 'Private sector', municipal: 'Municipal government', state: 'State / school district', federal: 'Federal government' };

export function getProfession(id) {
  const profession = PROFESSIONS[id];
  if (!profession) throw new Error(`Unknown profession: ${id}`);
  return profession;
}
