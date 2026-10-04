/**
 * More of the workforce: the arts and sports (acting, music, professional
 * athletes, fitness), business functions found in every large employer
 * (marketing, sales, HR, data, cybersecurity, design), architecture,
 * warehouses and factories, care work (childcare, home care, funeral
 * services), nonprofits, and local and federal public servants (libraries,
 * water utilities, animal services, the Border Patrol).
 *
 * Real-world rules worth knowing:
 *   - Actors and musicians mostly earn from gigs: pay swings year to year
 *     (commission). SAG-AFTRA membership opens union film and TV work.
 *   - Architects need an accredited degree, years of supervised experience
 *     and the ARE exams to be licensed.
 *   - Water operators, funeral directors and child-care teachers hold state
 *     certifications; Border Patrol agents train at the academy in Artesia
 *     and must be hired before 40.
 *   - Professional athletes need elite fitness and a short window: the
 *     careers that outlast the playing years are coaching and front offices.
 */
import { L } from './Ladder.js';

export const BORDER_PATROL_MAX_AGE = 39;

const fitnessGate = (min, maxAge) => (state) => {
  if (state.stats.fitness < min) return { ok: false, reason: `Needs elite fitness (${min}+)` };
  if (maxAge && state.character.age > maxAge) return { ok: false, reason: `Teams sign players by age ${maxAge}` };
  return { ok: true };
};

export const WORKFORCE_PROFESSIONS = {
  /* ---------------- Arts, entertainment & sports ---------------- */
  acting: {
    id: 'acting', name: 'Acting (Film, TV & Theater)', icon: '🎬', sector: 'private', payMultiplier: 1.0, minAge: 16, sizes: { small: 3, medium: 2, large: 1 }, background: 'lenient', commission: true, promotionOdds: 0.45,
    union: { chance: 0.5, name: 'SAG-AFTRA', strike: true },
    employers: ['Silver Screen Studios', 'Riverside Repertory Theatre', 'Northlight Productions', 'Blue Door Theatre Company'],
    valued: ['sagAftra'],
    levels: [
      L('extra', 'Background Actor', 1),
      L('working', 'Working Actor', 3),
      L('featured', 'Featured Actor', 5, { req: { credentials: ['sagAftra'] } }),
      L('regular', 'Series Regular', 7, { track: 'ic' }),
      L('star', 'Leading Actor', 9, { track: 'ic', minSize: 'medium' }),
      L('director', 'Director', 6, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 25 }),
      L('producer', 'Executive Producer', 8, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget', 'sign'], reports: 80 }),
      L('studioHead', 'Studio Chief', 10, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'sign'], reports: 400 }),
    ],
  },
  music: {
    id: 'music', name: 'Music', icon: '🎵', sector: 'private', payMultiplier: 0.95, minAge: 16, sizes: { small: 3, medium: 2, large: 1 }, background: 'lenient', commission: true, promotionOdds: 0.45,
    union: { chance: 0.3, name: 'American Federation of Musicians', strike: true },
    employers: ['Blue Note Records', 'Harbor Sound Studios', 'Northwind Music Group', 'Velvet Room Entertainment'],
    levels: [
      L('gigging', 'Gigging Musician', 1),
      L('session', 'Session Musician', 3),
      L('touring', 'Touring Musician', 4),
      L('recording', 'Recording Artist', 6, { track: 'ic' }),
      L('headliner', 'Headlining Artist', 9, { track: 'ic', minSize: 'medium' }),
      L('producer', 'Music Producer', 6, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 10 }),
      L('anr', 'A&R Director', 7, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget', 'sign'], reports: 30 }),
      L('labelHead', 'Label President', 10, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'sign'], reports: 200 }),
    ],
  },
  athletics: {
    id: 'athletics', name: 'Professional Sports', icon: '🏆', sector: 'private', payMultiplier: 1.3, minAge: 18, sizes: { medium: 2, large: 2, enterprise: 1 }, background: 'standard', commission: true, promotionOdds: 0.5,
    union: { chance: 0.9, name: 'Players Association', strike: true },
    employers: ['Metro Thunder', 'Harbor City FC', 'River Valley Hawks', 'Summit Ridge Rockets'],
    eligible: fitnessGate(75, 26),
    levels: [
      L('minor', 'Development / Minor-League Player', 2, { years: 2 }),
      L('pro', 'Professional Athlete', 6),
      L('starter', 'Starter', 8, { track: 'ic' }),
      L('allStar', 'All-Star', 10, { track: 'ic', minSize: 'large' }),
      L('assistant', 'Assistant Coach', 5, { track: 'mgmt', abilities: ['supervise'], reports: 15 }),
      L('headCoach', 'Head Coach', 8, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 50 }),
      L('gm', 'Team General Manager', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate', 'sign', 'exec'], reports: 120 }),
    ],
  },
  fitness: {
    id: 'fitness', name: 'Fitness & Personal Training', icon: '🏋️', sector: 'private', payMultiplier: 0.82, minAge: 18, sizes: { small: 3, medium: 3, large: 1 }, background: 'lenient',
    employers: ['Iron Temple Gym', 'PeakFit Clubs', 'Momentum Fitness', 'Core & Cardio Studio'],
    levels: [
      L('frontDesk', 'Gym Front Desk Associate', 1),
      L('trainer', 'Personal Trainer', 3, { entry: true, req: { credentials: ['cpt'] } }),
      L('senior', 'Senior Personal Trainer', 4),
      L('master', 'Master Trainer', 5, { track: 'ic' }),
      L('coach', 'Strength & Conditioning Coach', 6, { track: 'ic', minSize: 'medium' }),
      L('fitnessManager', 'Fitness Manager', 4, { track: 'mgmt', abilities: ['supervise'], reports: 12 }),
      L('clubGm', 'Club General Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 40 }),
      L('regional', 'Regional Director of Clubs', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 300 }),
    ],
  },

  /* ---------------- Business functions ---------------- */
  marketing: {
    id: 'marketing', name: 'Marketing & Advertising', icon: '📣', sector: 'private', payMultiplier: 1.0, minAge: 21, sizes: { small: 2, medium: 3, large: 3, enterprise: 2 }, background: 'lenient', remote: true,
    employers: ['Brightline Marketing', 'Signal & Noise Agency', 'Northstar Brands', 'Clearwater Creative'],
    entry: { education: { level: 'bachelor' } },
    levels: [
      L('coordinator', 'Marketing Coordinator', 2),
      L('specialist', 'Marketing Specialist', 3),
      L('manager', 'Marketing Manager', 5),
      L('strategist', 'Senior Brand Strategist', 6, { track: 'ic' }),
      L('principal', 'Principal Brand Strategist', 8, { track: 'ic', minSize: 'large' }),
      L('director', 'Marketing Director', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 15 }),
      L('vp', 'VP of Marketing', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 60 }),
      L('cmo', 'Chief Marketing Officer', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'sign'], reports: 250 }),
    ],
  },
  sales: {
    id: 'sales', name: 'Sales (B2B)', icon: '🤝', sector: 'private', payMultiplier: 1.05, minAge: 18, sizes: { small: 2, medium: 3, large: 3, enterprise: 2 }, background: 'lenient', commission: true, cyclical: 1.3,
    employers: ['Vector Industrial Supply', 'Apex Software Sales', 'Meridian Medical Devices', 'Keystone Business Solutions'],
    levels: [
      L('sdr', 'Sales Development Representative', 2),
      L('ae', 'Account Executive', 4),
      L('seniorAe', 'Senior Account Executive', 5),
      L('enterprise', 'Enterprise Account Executive', 7, { track: 'ic', minSize: 'medium' }),
      L('strategic', 'Strategic Accounts Director', 8, { track: 'ic', minSize: 'large' }),
      L('salesManager', 'Sales Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 10 }),
      L('director', 'Director of Sales', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 50 }),
      L('vpSales', 'VP of Sales', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 200 }),
      L('cro', 'Chief Revenue Officer', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'sign'], reports: 600 }),
    ],
  },
  humanResources: {
    id: 'humanResources', name: 'Human Resources', icon: '🧑‍💼', sector: 'private', payMultiplier: 0.95, minAge: 21, sizes: { small: 2, medium: 3, large: 3, enterprise: 2 }, background: 'standard',
    employers: ['PeopleFirst HR Services', 'Northbridge Staffing', 'Summit Health Systems', 'Keystone Manufacturing'],
    entry: { education: { level: 'bachelor' } },
    valued: ['shrm'],
    levels: [
      L('assistant', 'HR Assistant', 2),
      L('generalist', 'HR Generalist', 3),
      L('hrbp', 'HR Business Partner', 5),
      L('specialist', 'Compensation & Benefits Specialist', 6, { track: 'ic' }),
      L('principal', 'Principal Talent Strategist', 7, { track: 'ic', minSize: 'large' }),
      L('manager', 'HR Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 8 }),
      L('director', 'HR Director', 8, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget', 'policy'], reports: 30 }),
      L('chro', 'Chief Human Resources Officer', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'policy'], reports: 150 }),
    ],
  },
  design: {
    id: 'design', name: 'Graphic & UX Design', icon: '🎨', sector: 'private', payMultiplier: 0.95, minAge: 18, sizes: { small: 3, medium: 3, large: 2, enterprise: 1 }, background: 'lenient', remote: true,
    employers: ['Pixel & Grain Studio', 'Clearwater Creative', 'Lumen Systems Design', 'Brightline Agency'],
    levels: [
      L('junior', 'Junior Designer', 2),
      L('designer', 'Designer', 4),
      L('senior', 'Senior Designer', 5),
      L('lead', 'Lead Product Designer', 7, { track: 'ic' }),
      L('principal', 'Principal Designer', 8, { track: 'ic', minSize: 'large' }),
      L('artDirector', 'Art Director', 6, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 8 }),
      L('creativeDirector', 'Creative Director', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 30 }),
      L('vpDesign', 'VP of Design', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 120 }),
    ],
  },
  cybersecurity: {
    id: 'cybersecurity', name: 'Cybersecurity & IT', icon: '🛡️', sector: 'private', payMultiplier: 1.1, minAge: 18, sizes: { small: 2, medium: 3, large: 3, enterprise: 2 }, background: 'strict', remote: true,
    employers: ['SecureNet Solutions', 'Ironclad Cyber', 'Granite Capital IT', 'Mercy Health IT Services'],
    valued: ['securityPlus', 'cissp'],
    levels: [
      L('helpdesk', 'IT Help Desk Technician', 2),
      L('sysadmin', 'Systems Administrator', 4),
      L('analyst', 'Security Analyst', 5, { req: { credentials: ['securityPlus'] } }),
      L('engineer', 'Security Engineer', 7, { track: 'ic' }),
      L('architect', 'Security Architect', 8, { track: 'ic', minSize: 'medium', req: { credentials: ['cissp'] } }),
      L('itManager', 'IT Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 10 }),
      L('director', 'Director of Information Security', 8, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget'], reports: 40 }),
      L('ciso', 'Chief Information Security Officer', 10, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'classified'], reports: 150 }),
    ],
  },
  dataScience: {
    id: 'dataScience', name: 'Data Science & Analytics', icon: '📊', sector: 'private', payMultiplier: 1.15, minAge: 21, sizes: { medium: 3, large: 3, enterprise: 2 }, background: 'lenient', remote: true,
    employers: ['Quanta Analytics', 'Lumen Data Labs', 'Harbor Trust Analytics', 'Meridian Insights'],
    entry: { education: { level: 'bachelor', majors: ['mathematics', 'computerScience', 'economics', 'engineering', 'business'] } },
    levels: [
      L('analyst', 'Data Analyst', 4),
      L('scientist', 'Data Scientist', 6),
      L('senior', 'Senior Data Scientist', 7),
      L('ml', 'Machine Learning Engineer', 8, { track: 'ic' }),
      L('principal', 'Principal Data Scientist', 9, { track: 'ic', minSize: 'large' }),
      L('manager', 'Analytics Manager', 7, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 8 }),
      L('head', 'Head of Data', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 60 }),
      L('cdo', 'Chief Data Officer', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec'], reports: 200 }),
    ],
  },
  architecture: {
    id: 'architecture', name: 'Architecture', icon: '🏛️', sector: 'private', payMultiplier: 1.0, minAge: 22, sizes: { small: 3, medium: 3, large: 2 }, background: 'standard', cyclical: 1.2,
    employers: ['Stone & Glass Architects', 'Meridian Design Partners', 'Northgate Architecture', 'Keystone Studio'],
    entry: { education: { level: 'bachelor', majors: ['architecture'] } },
    levels: [
      L('designer', 'Architectural Designer', 4),
      L('architect', 'Architect', 6, { req: { credentials: ['architectLicense'] } }),
      L('project', 'Project Architect', 7),
      L('senior', 'Senior Architect', 8, { track: 'ic' }),
      L('designPrincipal', 'Design Principal', 9, { track: 'ic', minSize: 'large' }),
      L('studio', 'Studio Director', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 20 }),
      L('principal', 'Firm Principal', 9, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget', 'sign'], reports: 60 }),
      L('managing', 'Managing Principal', 10, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'sign'], reports: 200 }),
    ],
  },

  /* ---------------- Warehouses & factories ---------------- */
  logistics: {
    id: 'logistics', name: 'Warehouse & Logistics', icon: '📦', sector: 'private', payMultiplier: 0.85, minAge: 18, sizes: { medium: 2, large: 3, enterprise: 3 }, background: 'lenient', cyclical: 1.2,
    union: { chance: 0.2, name: 'Teamsters', strike: true },
    employers: ['Prime Logistics Center', 'Midwest Distribution Co.', 'Harbor Freight Terminals', 'Swift Fulfillment'],
    levels: [
      L('associate', 'Warehouse Associate', 1),
      L('forklift', 'Forklift Operator', 2, { req: { credentials: ['forklift'] } }),
      L('lead', 'Warehouse Lead', 3),
      L('inventory', 'Inventory Control Specialist', 4, { track: 'ic' }),
      L('planner', 'Supply Chain Planner', 6, { track: 'ic', req: { education: { level: 'bachelor' } } }),
      L('supervisor', 'Shift Supervisor', 4, { track: 'mgmt', abilities: ['supervise'], reports: 25 }),
      L('opsManager', 'Operations Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 120 }),
      L('dcGm', 'Distribution Center General Manager', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 600 }),
      L('vpSupply', 'VP of Supply Chain', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec'], reports: 3000 }),
    ],
  },
  manufacturing: {
    id: 'manufacturing', name: 'Manufacturing', icon: '🏭', sector: 'private', payMultiplier: 0.9, minAge: 18, sizes: { small: 2, medium: 3, large: 3, enterprise: 2 }, background: 'lenient', cyclical: 1.3,
    union: { chance: 0.35, name: 'United Auto Workers (UAW)', strike: true },
    benefits: { unionPension: 'union' },
    employers: ['Keystone Manufacturing', 'Great Lakes Precision', 'Summit Auto Parts', 'Northfield Fabricated Metals'],
    levels: [
      L('assembler', 'Assembler', 1),
      L('operator', 'Machine Operator', 2),
      L('machinist', 'CNC Machinist', 4),
      L('toolmaker', 'Tool & Die Maker', 6, { track: 'ic' }),
      L('quality', 'Quality Engineer', 6, { track: 'ic', req: { education: { level: 'bachelor' } } }),
      L('supervisor', 'Production Supervisor', 4, { track: 'mgmt', abilities: ['supervise'], reports: 25 }),
      L('superintendent', 'Plant Superintendent', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 150 }),
      L('plantManager', 'Plant Manager', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 800 }),
      L('vpMfg', 'VP of Manufacturing', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec'], reports: 4000 }),
    ],
  },

  /* ---------------- Care work ---------------- */
  childcare: {
    id: 'childcare', name: 'Early Childhood Education', icon: '🧸', sector: 'private', payMultiplier: 0.8, minAge: 18, sizes: { small: 4, medium: 2 }, background: 'strict',
    employers: ['Little Sprouts Learning Center', 'Bright Beginnings Preschool', 'KinderCare Academy', 'Sunshine Child Development Center'],
    levels: [
      L('aide', 'Childcare Aide', 1),
      L('teacher', 'Preschool Teacher', 2, { req: { credentials: ['cda'] } }),
      L('lead', 'Lead Teacher', 3),
      L('specialist', 'Early Intervention Specialist', 4, { track: 'ic', req: { education: { level: 'bachelor' } } }),
      L('director', 'Center Director', 5, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 20 }),
      L('regional', 'Regional Director', 7, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 150 }),
    ],
  },
  caregiving: {
    id: 'caregiving', name: 'Home Care & Caregiving', icon: '🤲', sector: 'private', payMultiplier: 0.78, minAge: 18, sizes: { small: 3, medium: 3, large: 1 }, background: 'strict',
    employers: ['Comfort Keepers', 'Home Instead Senior Care', 'Visiting Angels', 'Golden Years Home Care'],
    levels: [
      L('pca', 'Personal Care Aide', 1),
      L('hha', 'Home Health Aide', 2, { req: { credentials: ['cna'] } }),
      L('senior', 'Senior Caregiver', 3),
      L('memoryCare', 'Memory Care Specialist', 4, { track: 'ic' }),
      L('coordinator', 'Care Coordinator', 4, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 15 }),
      L('director', 'Agency Director', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 60 }),
    ],
  },
  funeral: {
    id: 'funeral', name: 'Funeral Services', icon: '⚱️', sector: 'private', payMultiplier: 0.95, minAge: 18, sizes: { small: 4, medium: 2, large: 1 }, background: 'standard',
    employers: ['Evergreen Funeral Home', 'Hillcrest Memorial Chapel', 'Riverside Mortuary', 'Dignity Memorial'],
    levels: [
      L('attendant', 'Funeral Attendant', 1),
      L('apprentice', 'Apprentice Funeral Director', 3, { entry: true, req: { education: { program: 'mortuaryScience' } } }),
      L('director', 'Funeral Director & Embalmer', 5, { req: { credentials: ['funeralDirectorLicense'] } }),
      L('senior', 'Senior Funeral Director', 6, { track: 'ic' }),
      L('manager', 'Funeral Home Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 10 }),
      L('regional', 'Regional Manager', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 80 }),
    ],
  },
  nonprofit: {
    id: 'nonprofit', name: 'Nonprofit & Advocacy', icon: '💚', sector: 'private', payMultiplier: 0.85, minAge: 21, sizes: { small: 3, medium: 3, large: 2 }, background: 'standard',
    employers: ['Hope Community Foundation', 'Greater Good Alliance', 'Riverbend Food Bank', 'Citizens for Clean Water'],
    entry: { education: { level: 'bachelor' } },
    levels: [
      L('assistant', 'Program Assistant', 2),
      L('coordinator', 'Program Coordinator', 3),
      L('manager', 'Program Manager', 4),
      L('development', 'Development Officer', 5, { track: 'ic' }),
      L('majorGifts', 'Director of Major Gifts', 7, { track: 'ic', minSize: 'medium' }),
      L('programDirector', 'Program Director', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 15 }),
      L('ed', 'Executive Director', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate', 'sign', 'policy'], reports: 60 }),
      L('ceo', 'President & CEO', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'sign', 'policy'], reports: 300 }),
    ],
  },

  /* ---------------- Public servants ---------------- */
  library: {
    id: 'library', name: 'Public Libraries', icon: '📚', sector: 'municipal', payMultiplier: 0.9, minAge: 16, sizes: { small: 2, medium: 2, large: 1 }, background: 'standard',
    union: { chance: 0.5, name: 'AFSCME', strike: false },
    employerName: (city) => `${city} Public Library`,
    levels: [
      L('page', 'Library Page', 1),
      L('assistant', 'Library Assistant', 2),
      L('librarian', 'Librarian', 4, { entry: true, req: { education: { program: 'mls' } } }),
      L('senior', 'Senior Librarian', 5),
      L('archivist', 'Archivist & Special Collections Librarian', 6, { track: 'ic' }),
      L('branch', 'Branch Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 15 }),
      L('director', 'Library Director', 8, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget', 'delegate', 'policy'], reports: 120 }),
    ],
  },
  waterUtility: {
    id: 'waterUtility', name: 'Water & Wastewater Utilities', icon: '💧', sector: 'municipal', payMultiplier: 0.95, minAge: 18, sizes: { small: 2, medium: 2, large: 1 }, background: 'standard',
    union: { chance: 0.5, name: 'AFSCME', strike: false },
    employerName: (city) => `${city} Water Department`,
    levels: [
      L('trainee', 'Operator in Training', 2, { years: 1 }),
      L('operator', 'Water Treatment Operator', 3, { req: { credentials: ['waterOperator'] } }),
      L('senior', 'Senior Plant Operator', 4),
      L('lab', 'Water Quality Lab Analyst', 5, { track: 'ic' }),
      L('chief', 'Chief Plant Operator', 5, { track: 'mgmt', abilities: ['supervise'], reports: 12 }),
      L('superintendent', 'Utilities Superintendent', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 60 }),
      L('director', 'Director of Water Utilities', 8, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget', 'delegate', 'policy'], reports: 200 }),
    ],
  },
  animalControl: {
    id: 'animalControl', name: 'Animal Services', icon: '🐕', sector: 'municipal', payMultiplier: 0.85, minAge: 18, sizes: { small: 2, medium: 2, large: 1 }, background: 'standard',
    union: { chance: 0.4, name: 'AFSCME', strike: false },
    employerName: (city) => `${city} Animal Services`,
    entry: { credentials: ['driverLicense'] },
    levels: [
      L('kennel', 'Kennel Attendant', 1),
      L('officer', 'Animal Control Officer', 3, { req: { credentials: ['animalControlCert'] } }),
      L('senior', 'Senior Animal Control Officer', 4),
      L('investigator', 'Humane Investigator', 5, { track: 'ic', abilities: ['inspect'] }),
      L('supervisor', 'Field Supervisor', 4, { track: 'mgmt', abilities: ['supervise'], reports: 10 }),
      L('director', 'Animal Services Director', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'policy'], reports: 50 }),
    ],
  },
  borderPatrol: {
    id: 'borderPatrol', name: 'U.S. Border Patrol', icon: '🛂', sector: 'federal', payMultiplier: 1.0, minAge: 21, sizes: { large: 1, enterprise: 1 }, background: 'strict', exam: 'federal',
    union: { chance: 0.8, name: 'National Border Patrol Council', strike: false },
    benefits: { pension: 'fers' },
    dutyStation: 'stateRural',
    mandatoryRetirement: 57,
    employerName: (city, rng, state) => `U.S. Border Patrol — ${state} Sector`,
    eligible: (state) => (state.character.age > BORDER_PATROL_MAX_AGE ? { ok: false, reason: `New agents must be hired by age ${BORDER_PATROL_MAX_AGE}` } : state.stats.fitness < 45 ? { ok: false, reason: 'Needs fitness 45+ for the academy' } : { ok: true }),
    entry: { credentials: ['driverLicense'] },
    valued: ['languageProficiency'],
    levels: [
      L('trainee', 'Border Patrol Agent Trainee', 5, { years: 1, req: { clearance: 'secret' } }),
      L('agent', 'Border Patrol Agent', 6, { req: { credentials: ['cbpAcademy'] }, abilities: ['arrest'] }),
      L('senior', 'Senior Patrol Agent', 7, { abilities: ['arrest'] }),
      L('bortac', 'BORTAC Tactical Unit Agent', 8, { track: 'ic', minSize: 'enterprise', abilities: ['arrest'] }),
      L('supervisory', 'Supervisory Border Patrol Agent', 8, { track: 'mgmt', abilities: ['arrest', 'supervise'], reports: 15 }),
      L('watch', 'Watch Commander', 9, { track: 'mgmt', abilities: ['arrest', 'supervise', 'hire'], reports: 100 }),
      L('pail', 'Patrol Agent in Charge', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 400 }),
      L('chiefPatrol', 'Chief Patrol Agent', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec'], reports: 2000 }),
    ],
  },
};
