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
import { REQUIRED_BY, CREDENTIALS } from '../credentials/CredentialRegistry.js';
import { MUNICIPAL_PROFESSIONS } from '../publicservice/MunicipalGov.js';
import { FEDERAL_PROFESSIONS } from '../publicservice/FederalAgencies.js';
import { STATE_PROFESSIONS } from '../publicservice/StateAgencies.js';
import { TRADITIONS, clergyEligibility } from '../community/Religions.js';
import { TRANSPORT_PROFESSIONS } from './TransportProfessions.js';
import { JUSTICE_PROFESSIONS } from './JusticeCareers.js';
import { MORE_PROFESSIONS } from './MoreProfessions.js';
import { TRANSIT_PROFESSIONS } from '../transit/TransitCareers.js';
import { GOV_PROFESSIONS } from './GovCareers.js';
import { HEALTH_SCIENCE_PROFESSIONS } from './HealthScience.js';
import { TRADE_PROFESSIONS } from './TradeCareers.js';
import { WORKFORCE_PROFESSIONS } from './WorkforceCareers.js';
import { CONTRACTOR_PROFESSIONS } from './Contractors.js';
import { INTEL_PROFESSIONS } from './IntelCareers.js';
import { ALLIED_PROFESSIONS } from './AlliedCareers.js';
import { ACADEMIC_PROFESSIONS } from './AcademicCareers.js';

/** Traditions whose clergy follow the Catholic hierarchy (diocese, bishops, cardinals). */
const HIERARCHICAL = ['catholic', 'tradCatholic'];

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
      L('sous', 'Sous Chef', 3, { track: 'mgmt', req: { credentials: ['servSafe'] }, abilities: ['supervise'], reports: 6 }),
      L('cdc', 'Chef de Cuisine', 4, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 12 }),
      L('exec', 'Executive Chef', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 25 }),
      L('director', 'Culinary Director', 7, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign'], reports: 120 }),
    ],
  },
  trades: {
    id: 'trades', name: 'Electrical Trades', icon: '⚡', sector: 'private', payMultiplier: 0.86, promotionOdds: 0.7, minAge: 18, sizes: { small: 4, medium: 3, large: 1 }, background: 'lenient',
    union: { chance: 0.45, name: 'IBEW Local 98', strike: true },
    benefits: { unionPension: 'union' },
    employers: ['Volt Brothers Electric', 'Keystone Builders', 'Ironline Contracting', 'Summit Electrical'],
    valued: ['oshaSafety', 'driverLicense'],
    levels: [
      L('apprentice', 'Apprentice Electrician', 2, { req: { education: { level: 'highschool' } }, years: 4 }),
      L('journeyman', 'Journeyman Electrician', 4, { entry: true, req: { credentials: ['journeymanElectrician'] }, years: 5 }),
      L('master', 'Master Electrician', 5, { track: 'ic', req: { credentials: ['masterElectrician'] } }),
      L('estimator', 'Senior Estimator', 6, { track: 'ic', minSize: 'medium' }),
      L('foreman', 'Foreman', 5, { track: 'mgmt', req: { credentials: ['journeymanElectrician'] }, abilities: ['supervise'], reports: 8, years: 4 }),
      L('super', 'Site Superintendent', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'inspect'], reports: 25 }),
      L('pm', 'Construction Project Manager', 7, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'budget', 'sign'], reports: 60 }),
      L('owner', 'Owner / President', 8, { track: 'mgmt', req: { credentials: ['masterElectrician'] }, abilities: ['supervise', 'hire', 'budget', 'sign', 'delegate', 'exec'], reports: 80 }),
    ],
  },
  trucking: {
    id: 'trucking', name: 'Trucking & Logistics', icon: '🚛', sector: 'private', payMultiplier: 0.85, minAge: 21, sizes: { small: 2, medium: 3, large: 3, enterprise: 1 }, background: 'standard',
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
    id: 'accounting', name: 'Accounting', icon: '🧮', sector: 'private', payMultiplier: 1.0, promotionOdds: 0.75, minAge: 21, sizes: ALL_SIZES, background: 'strict',
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
    id: 'engineering', name: 'Civil Engineering', icon: '🏗️', sector: 'private', payMultiplier: 1.04, minAge: 21, sizes: ALL_SIZES, background: 'standard',
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
    id: 'medical', name: 'Medicine', icon: '⚕️', sector: 'private', payMultiplier: 1.8, minAge: 25, sizes: { medium: 2, large: 3, enterprise: 1 }, background: 'strict',
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
    id: 'nursing', name: 'Nursing', icon: '🩺', sector: 'private', payMultiplier: 0.98, promotionOdds: 0.85, minAge: 18, sizes: { small: 1, medium: 3, large: 3, enterprise: 1 }, background: 'strict',
    union: { chance: 0.25, name: 'National Nurses United', strike: true },
    employers: ['St. Brigid Medical Center', 'Mercy General', 'Sunrise Care Homes', 'Lakeshore University Hospital'],
    levels: [
      L('cna', 'Certified Nursing Assistant', 1, { req: { credentials: ['cna'] } }),
      L('rn', 'Registered Nurse', 4, { entry: true, req: { credentials: ['rn'] } }),
      L('seniorRn', 'Senior Staff Nurse', 5, { req: { credentials: ['rn'] } }),
      L('icu', 'ICU Nurse', 6, { track: 'ic', req: { credentials: ['ccrn'] } }),
      L('flightNurse', 'Flight Nurse', 7, { track: 'ic', minSize: 'large', req: { credentials: ['ccrn'] }, airMedical: true }),
      L('cns', 'Clinical Nurse Specialist', 6, { track: 'ic', req: { education: { level: 'bachelor', majors: ['nursing'] } } }),
      L('np', 'Nurse Practitioner', 7, { track: 'ic', entry: true, req: { credentials: ['np'] }, abilities: ['prescribe'] }),
      L('crna', 'Certified Registered Nurse Anesthetist', 9, { track: 'ic', entry: true, req: { credentials: ['crnaLicense'] }, abilities: ['prescribe'] }),
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
    id: 'law', name: 'Law', icon: '⚖️', sector: 'private', payMultiplier: 1.15, minAge: 24, sizes: ALL_SIZES, background: 'strict',
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
    id: 'education', name: 'K-12 Education', icon: '🍎', sector: 'municipal', employerName: (city) => `${city} Public Schools`, payMultiplier: 0.88, minAge: 21, sizes: { small: 2, medium: 3, large: 2 }, background: 'strict',
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
      L('chair', 'Department Chair', 5, { track: 'mgmt', abilities: ['supervise'], reports: 8 }),
      L('ap', 'Assistant Principal', 6, { track: 'mgmt', req: { credentials: ['adminCert'] }, abilities: ['supervise', 'hire'], reports: 30 }),
      L('principal', 'Principal', 7, { track: 'mgmt', req: { credentials: ['adminCert'] }, abilities: ['supervise', 'hire', 'budget', 'sign'], reports: 70 }),
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
    levels: [
      L('cfi', 'Flight Instructor', 3, { req: { credentials: ['cfi'] }, flying: true }),
      L('fo', 'Regional First Officer', 4, { entry: true, req: { credentials: ['atp'] }, flying: true, part121: true }),
      L('captain', 'Regional Captain', 6, { req: { credentials: ['atp', 'typeRating'] }, flying: true, part121: true }),
      L('majorFo', 'Major Airline First Officer', 7, { track: 'ic', minSize: 'large', flying: true, part121: true }),
      L('majorCaptain', 'Major Airline Captain', 8, { track: 'ic', minSize: 'large', req: { credentials: ['atp', 'typeRating'] }, flying: true, part121: true }),
      L('widebodyCaptain', 'International Widebody Captain', 9, { track: 'ic', minSize: 'enterprise', req: { credentials: ['atp', 'typeRating'] }, flying: true, part121: true }),
      L('checkAirman', 'Check Airman / Simulator Instructor', 7, { track: 'mgmt', abilities: ['supervise'], reports: 20 }),
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

Object.assign(PRIVATE_PROFESSIONS, {
  cosmetology: {
    id: 'cosmetology', name: 'Cosmetology & Salon', icon: '💇', sector: 'private', payMultiplier: 0.85, minAge: 18, sizes: { small: 5, medium: 2, large: 1 }, background: 'lenient',
    employers: ['Mane Street Salon', 'Glow Studio', 'Shear Genius', 'Luxe Day Spa'],
    entry: { credentials: ['cosmetologyLicense'] },
    levels: [
      L('stylist', 'Junior Stylist', 2),
      L('senior', 'Senior Stylist', 3),
      L('master', 'Master Stylist', 4, { track: 'ic' }),
      L('educator', 'Platform Artist & Educator', 5, { track: 'ic', minSize: 'medium' }),
      L('manager', 'Salon Manager', 4, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 8 }),
      L('owner', 'Salon Owner', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'sign', 'exec'], reports: 20 }),
    ],
  },
  plumbing: {
    id: 'plumbing', name: 'Plumbing & Pipefitting', icon: '🚰', sector: 'private', payMultiplier: 0.85, promotionOdds: 0.7, minAge: 18, sizes: { small: 4, medium: 3, large: 1 }, background: 'lenient',
    union: { chance: 0.4, name: 'UA Plumbers & Pipefitters Local 130', strike: true },
    benefits: { unionPension: 'union' },
    employers: ['Flow Masters Plumbing', 'Riverside Mechanical', 'Keystone Pipe & Steam'],
    valued: ['oshaSafety', 'driverLicense'],
    levels: [
      L('apprentice', 'Apprentice Plumber', 2, { req: { education: { level: 'highschool' } }, years: 4 }),
      L('journeyman', 'Journeyman Plumber', 4, { entry: true, req: { credentials: ['journeymanPlumber'] }, years: 5 }),
      L('master', 'Master Plumber', 5, { track: 'ic', req: { credentials: ['masterPlumber'] }, abilities: ['sign'] }),
      L('inspector', 'Plumbing Inspector', 6, { track: 'ic', req: { credentials: ['masterPlumber'] }, abilities: ['inspect'] }),
      L('foreman', 'Plumbing Foreman', 5, { track: 'mgmt', abilities: ['supervise'], reports: 8 }),
      L('owner', 'Plumbing Contractor (Owner)', 8, { track: 'mgmt', req: { credentials: ['masterPlumber'] }, abilities: ['supervise', 'hire', 'budget', 'sign', 'exec'], reports: 40 }),
    ],
  },
  socialWork: {
    id: 'socialWork', name: 'Social Work & Counseling', icon: '🤝', sector: 'private', payMultiplier: 0.9, minAge: 21, sizes: { small: 3, medium: 3, large: 1 }, background: 'strict',
    union: { chance: 0.2, name: 'SEIU Healthcare', strike: true },
    employers: ['Harbor Family Services', 'Lakeshore Behavioral Health', 'Hope Community Center'],
    entry: { education: { level: 'bachelor' } },
    valued: ['lcsw', 'cit'],
    levels: [
      L('caseManager', 'Case Manager', 3),
      L('socialWorker', 'Social Worker', 4, { entry: true, req: { education: { program: 'msw' } } }),
      L('clinician', 'Licensed Clinical Social Worker', 6, { track: 'ic', entry: true, req: { credentials: ['lcsw'] } }),
      L('therapist', 'Psychotherapist (Private Practice)', 7, { track: 'ic', req: { credentials: ['lcsw'] } }),
      L('supervisor', 'Clinical Supervisor', 6, { track: 'mgmt', req: { credentials: ['lcsw'] }, abilities: ['supervise'], reports: 10 }),
      L('director', 'Program Director', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 50 }),
    ],
  },
  pharmacy: {
    id: 'pharmacy', name: 'Pharmacy', icon: '💊', sector: 'private', payMultiplier: 1.25, minAge: 18, sizes: { small: 2, medium: 2, large: 3, enterprise: 2 }, background: 'strict',
    employers: ['CornerCare Pharmacy', 'Mercy General Pharmacy', 'ValuMart Pharmacy'],
    levels: [
      L('tech', 'Pharmacy Technician', 1),
      L('intern', 'Pharmacy Intern', 3, { req: { education: { program: 'pharmd' } } }),
      L('pharmacist', 'Staff Pharmacist', 7, { entry: true, req: { credentials: ['pharmacistLicense'] }, abilities: ['prescribe'] }),
      L('clinical', 'Clinical Pharmacist Specialist', 8, { track: 'ic', abilities: ['prescribe'] }),
      L('pic', 'Pharmacist in Charge', 7, { track: 'mgmt', abilities: ['prescribe', 'supervise', 'sign'], reports: 8 }),
      L('director', 'Director of Pharmacy', 8, { track: 'mgmt', minSize: 'large', abilities: ['prescribe', 'supervise', 'budget', 'delegate'], reports: 60 }),
    ],
  },
  insurance: {
    id: 'insurance', name: 'Insurance', icon: '🛡️', sector: 'private', payMultiplier: 1.0, minAge: 18, sizes: ALL_SIZES, background: 'standard',
    employers: ['Shieldwell Insurance', 'Prairie Mutual', 'Guardian Point Agency'],
    valued: ['insuranceProducer', 'cpa'],
    levels: [
      L('csr', 'Customer Service Rep', 2),
      L('agent', 'Insurance Agent', 3, { entry: true, req: { credentials: ['insuranceProducer'] }, abilities: ['sign'] }),
      L('underwriter', 'Underwriter', 4, { req: { education: { level: 'bachelor' } }, abilities: ['sign'] }),
      L('actuary', 'Actuary', 6, { track: 'ic', req: { smarts: 70 } }),
      L('chiefActuary', 'Chief Actuary', 8, { track: 'ic', minSize: 'large', req: { smarts: 75 } }),
      L('claimsManager', 'Claims Manager', 5, { track: 'mgmt', abilities: ['supervise', 'sign'], reports: 15 }),
      L('vp', 'VP of Underwriting', 7, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'budget', 'delegate', 'sign'], reports: 80 }),
      L('ceo', 'Insurance CEO', 10, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 3000 }),
    ],
  },
  propertyManagement: {
    id: 'propertyManagement', name: 'Property Management', icon: '🔑', sector: 'private', payMultiplier: 0.95, minAge: 18, sizes: { small: 3, medium: 3, large: 2 }, background: 'standard',
    employers: ['Keystone Property Group', 'Urban Nest Management', 'Lakeside Residential'],
    valued: ['realEstate', 'brokerLicense'],
    levels: [
      L('leasing', 'Leasing Agent', 2),
      L('assistant', 'Assistant Property Manager', 3),
      L('manager', 'Property Manager', 4, { req: { credentials: ['realEstate'] }, abilities: ['supervise', 'sign'], reports: 5 }),
      L('portfolio', 'Portfolio Manager', 6, { track: 'ic', abilities: ['sign', 'budget'] }),
      L('regional', 'Regional Property Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 30 }),
      L('vp', 'VP of Property Operations', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 200 }),
    ],
  },
  journalism: {
    id: 'journalism', name: 'Journalism & Media', icon: '📰', sector: 'private', payMultiplier: 0.9, minAge: 21, sizes: ALL_SIZES, background: 'lenient', remote: true,
    union: { chance: 0.3, name: 'NewsGuild', strike: true },
    employers: ['The Daily Ledger', 'Metro Public Radio', 'Channel 7 News', 'The Capitol Dispatch'],
    entry: { education: { level: 'bachelor' } },
    levels: [
      L('reporter', 'Staff Reporter', 3),
      L('senior', 'Senior Reporter', 4),
      L('investigative', 'Investigative Reporter', 5, { track: 'ic' }),
      L('columnist', 'Columnist / Anchor', 7, { track: 'ic', minSize: 'medium' }),
      L('editor', 'Section Editor', 5, { track: 'mgmt', abilities: ['supervise'], reports: 8 }),
      L('managing', 'Managing Editor', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 40 }),
      L('editorInChief', 'Editor-in-Chief', 8, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 150 }),
    ],
  },
  clergy: {
    id: 'clergy', name: 'Clergy & Ministry', icon: '🙏', sector: 'private', payMultiplier: 0.75, minAge: 18, sizes: { small: 6, medium: 3, large: 1 }, background: 'standard', promotionOdds: 0.5,
    employers: ['Community Congregation'],
    // Ordination depends on your tradition; titles come from it too (Parish Priest, Rabbi, Imam…).
    // Catholic priests are ordained through a diocese (see catholicClergy).
    eligible: (state) => (HIERARCHICAL.includes(state.community?.faith?.traditionId) ? { ok: false, reason: 'Catholic priests are ordained through a diocese — see Catholic Priesthood' } : clergyEligibility(state)),
    prepare: (state, job) => {
      const t = TRADITIONS[state.community?.faith?.traditionId];
      if (t) {
        job.tradition = state.community.faith.traditionId;
        job.titleMap = t.clergy.titles;
      }
    },
    levels: [
      L('seminarian', 'Seminarian', 1, { years: 2 }),
      L('associate', 'Associate Minister', 3, { entry: true, req: { education: { program: 'seminary' } } }),
      L('minister', 'Minister', 4),
      L('chaplain', 'Chaplain', 5, { track: 'ic', req: { education: { program: 'seminary' } } }),
      L('senior', 'Senior Minister', 6, { track: 'mgmt', req: { education: { program: 'seminary' } }, abilities: ['supervise', 'hire', 'budget'], reports: 6 }),
      L('regional', 'Regional Leader', 8, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 40 }),
    ],
  },
  catholicClergy: {
    id: 'catholicClergy', name: 'Catholic Priesthood', icon: '✝️', sector: 'private', payMultiplier: 0.4, minAge: 18, sizes: { small: 3, medium: 3, large: 2, enterprise: 1 }, background: 'strict', promotionOdds: 0.35,
    // A diocese (archdiocese for the biggest sees) employs and assigns its priests.
    employerName: (city, _rng, _state) => `Diocese of ${city}`,
    eligible: (state) => (HIERARCHICAL.includes(state.community?.faith?.traditionId) ? clergyEligibility(state) : { ok: false, reason: 'Belong to the Catholic Church' }),
    prepare: (state, job) => {
      job.tradition = state.community?.faith?.traditionId ?? 'catholic';
      if (job.employer.size === 'enterprise') job.employer.name = job.employer.name.replace('Diocese', 'Archdiocese');
    },
    levels: [
      L('seminarian', 'Seminarian', 1, { years: 5 }),
      L('deacon', 'Transitional Deacon', 2, { years: 1 }),
      L('vicar', 'Parochial Vicar', 3, { years: 3 }),
      L('pastor', 'Pastor', 4, { abilities: ['supervise'], reports: 6 }),
      L('monsignor', 'Monsignor', 5, { track: 'ic' }),
      L('vicarGeneral', 'Vicar General', 6, { track: 'mgmt', abilities: ['supervise', 'budget'], reports: 40 }),
      L('auxBishop', 'Auxiliary Bishop', 7, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate'], reports: 120 }),
      L('bishop', 'Bishop', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 300 }),
      L('archbishop', 'Archbishop', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 900 }),
      L('cardinal', 'Cardinal', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'budget', 'delegate', 'policy', 'exec'], reports: 900 }),
    ],
  },
  hospitality: {
    id: 'hospitality', name: 'Hotels & Hospitality', icon: '🏨', sector: 'private', payMultiplier: 0.68, promotionOdds: 0.4, minAge: 16, sizes: ALL_SIZES, background: 'lenient',
    union: { chance: 0.15, name: 'UNITE HERE Local 11', strike: true },
    employers: ['Meridian Hotel Group', 'Harborview Resort', 'Grand Plaza Hotel', 'Summit Lodge'],
    levels: [
      L('frontDesk', 'Front Desk Agent', 1),
      L('supervisor', 'Front Office Supervisor', 2, { abilities: ['supervise'], reports: 4 }),
      L('revenue', 'Revenue Manager', 5, { track: 'ic', req: { education: { level: 'bachelor' } } }),
      L('sales', 'Director of Sales', 6, { track: 'ic', minSize: 'medium' }),
      L('frontManager', 'Front Office Manager', 4, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 15 }),
      L('gm', 'General Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'sign'], reports: 120 }),
      L('regional', 'Regional VP of Operations', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 1500 }),
    ],
  },
});

Object.assign(PRIVATE_PROFESSIONS, TRANSPORT_PROFESSIONS, JUSTICE_PROFESSIONS, MORE_PROFESSIONS, TRANSIT_PROFESSIONS, GOV_PROFESSIONS, HEALTH_SCIENCE_PROFESSIONS, TRADE_PROFESSIONS, WORKFORCE_PROFESSIONS, CONTRACTOR_PROFESSIONS, INTEL_PROFESSIONS, ALLIED_PROFESSIONS, ACADEMIC_PROFESSIONS);

export const PROFESSIONS = { ...PRIVATE_PROFESSIONS, ...MUNICIPAL_PROFESSIONS, ...STATE_PROFESSIONS, ...FEDERAL_PROFESSIONS };
export const PROFESSION_LIST = Object.values(PROFESSIONS);

// Index which careers require which credentials (employers fund what their own ladders demand).
for (const p of PROFESSION_LIST) {
  for (const l of p.levels) for (const c of l.req?.credentials ?? []) (REQUIRED_BY[c] ??= new Set()).add(p.id);
}
// A course your own ladder requires is always open to you: add the career to any membership gate.
const openTo = (req, id) => {
  if (!req) return;
  if (req.anyOf) return req.anyOf.forEach((r) => openTo(r, id));
  if (req.affiliation && !req.affiliation.includes(id)) req.affiliation.push(id);
};
for (const [credId, careers] of Object.entries(REQUIRED_BY)) for (const id of careers) openTo(CREDENTIALS[credId]?.requires, id);

/** Career fields for the job board (every profession appears in exactly one). */
export const JOB_FIELDS = {
  service: { label: 'Service & Retail', icon: '🛍️', ids: ['retail', 'culinary', 'hospitality', 'cosmetology', 'cruise', 'funeral'] },
  arts: { label: 'Arts, Sports & Fitness', icon: '🎭', ids: ['acting', 'music', 'athletics', 'fitness', 'design', 'contentCreator'] },
  trades: { label: 'Trades & Transport', icon: '🔧', ids: ['trades', 'plumbing', 'hvac', 'welding', 'automotive', 'lineworker', 'trucking', 'publicWorks', 'forester', 'manufacturing', 'logistics', 'waterUtility'] },
  construction: { label: 'Construction, Energy & Land', icon: '🏗️', ids: ['carpentry', 'ironworking', 'craneOperator', 'oilGas', 'fishing', 'agriculture', 'renewableEnergy'] },
  travel: { label: 'Air, Sea & Rail', icon: '✈️', ids: ['aviation', 'charterAviation', 'flightAttendant', 'airTrafficControl', 'merchantMarine', 'railroad'] },
  transit: { label: 'Public Transit & Driving', icon: '🚌', ids: ['transit', 'transitMaintenance', 'transitPolice', 'schoolBus', 'paratransit'] },
  business: { label: 'Business & Finance', icon: '📈', ids: ['corporate', 'marketing', 'sales', 'humanResources', 'finance', 'accounting', 'actuary', 'insurance', 'realestate', 'propertyManagement', 'revenue', 'regulatory', 'nonprofit'] },
  tech: { label: 'Tech, Science & Engineering', icon: '💻', ids: ['tech', 'cybersecurity', 'dataScience', 'research', 'nationalLab', 'engineering', 'architecture', 'dot', 'planning', 'environmental', 'meteorology', 'surveying', 'gameDevelopment'] },
  health: { label: 'Health & Social Care', icon: '🩺', ids: ['medical', 'nursing', 'travelNursing', 'physicianAssistant', 'dentistry', 'physicalTherapy', 'pharmacy', 'veterinary', 'ems', 'privateEms', 'publicHealth', 'socialWork', 'cps', 'caregiving', 'childcare'] },
  therapy: { label: 'Therapy, Mental & Allied Health', icon: '🧠', ids: ['counseling', 'psychology', 'dietitian', 'imaging', 'respiratoryTherapy', 'dentalHygiene', 'occupationalTherapy', 'speechPathology', 'optometry', 'chiropractic'] },
  safety: { label: 'Public Safety & Security', icon: '🚓', ids: ['police', 'sheriff', 'statePolice', 'privatePolice', 'fire', 'dispatch', 'gameWarden', 'parkService', 'tsa', 'privateSecurity', 'privateMilitary', 'animalControl'] },
  corrections: { label: 'Corrections & Investigations', icon: '🔐', ids: ['corrections', 'jail', 'federalPrisons', 'privatePrisons', 'probation', 'forensics', 'privateInvestigator', 'bailBonds'] },
  law: { label: 'Law & Justice', icon: '⚖️', ids: ['legalSupport', 'law', 'courts', 'prosecution', 'publicDefender', 'oig'] },
  education: { label: 'Education, Media & Ministry', icon: '🍎', ids: ['education', 'university', 'college', 'communityCollege', 'library', 'journalism', 'clergy', 'catholicClergy', 'interpreter'] },
  government: { label: 'Government & Diplomacy', icon: '🏛️', ids: ['municipalAdmin', 'legislativeStaff', 'postal', 'benefitsClaims', 'foreignService'] },
  intel: { label: 'Intelligence Community', icon: '🕶️', ids: ['intelligence', 'caseOfficer', 'sigint'] },
  federalLE: { label: 'Federal Law Enforcement', icon: '🦅', ids: ['fbi', 'dea', 'atf', 'usms', 'usss', 'borderPatrol'] },
};

export const SECTOR_LABEL = { private: 'Private sector', municipal: 'Local government & schools', state: 'State government', federal: 'Federal government' };

export function getProfession(id) {
  const profession = PROFESSIONS[id];
  if (!profession) throw new Error(`Unknown profession: ${id}`);
  return profession;
}
