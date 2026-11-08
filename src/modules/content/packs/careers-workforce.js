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
import { L } from '../../career/Ladder.js';
import { NONPROFIT_NAMES, BORDER_PATROL_MAX_AGE, fitnessGate } from '../../career/WorkforceCareers.js';

const careers = {
  /* ---------------- Arts, entertainment & sports ---------------- */
  acting: {
    id: 'acting', name: 'Acting (Film, TV & Theater)', icon: '🎬', sector: 'private', payMultiplier: 1.0, minAge: 16, sizes: { small: 3, medium: 2, large: 1 }, background: 'lenient', commission: true, promotionOdds: 0.45,
    union: { chance: 0.5, name: 'SAG-AFTRA', strike: true },
    employers: ['Silver Screen Studios', 'Riverside Repertory Theatre', 'Northlight Productions', 'Blue Door Theatre Company'],
    valued: ['sagAftra'],
    ladder: [
      ['extra', 'Background Actor', 1],
      ['working', 'Working Actor', 3],
      ['featured', 'Featured Actor', 5, { req: { credentials: ['sagAftra'] } }],
      ['regular', 'Series Regular', 7, { track: 'ic' }],
      ['star', 'Leading Actor', 9, { track: 'ic', minSize: 'medium' }],
      ['director', 'Director', 6, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 25 }],
      ['producer', 'Executive Producer', 8, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget', 'sign'], reports: 80 }],
      ['studioHead', 'Studio Chief', 10, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'sign'], reports: 400 }],
    ],
  },
  music: {
    id: 'music', name: 'Music', icon: '🎵', sector: 'private', payMultiplier: 0.95, minAge: 16, sizes: { small: 3, medium: 2, large: 1 }, background: 'lenient', commission: true, promotionOdds: 0.45,
    union: { chance: 0.3, name: 'American Federation of Musicians', strike: true },
    employers: ['Blue Note Records', 'Harbor Sound Studios', 'Northwind Music Group', 'Velvet Room Entertainment'],
    ladder: [
      ['gigging', 'Gigging Musician', 1],
      ['session', 'Session Musician', 3],
      ['touring', 'Touring Musician', 4],
      ['recording', 'Recording Artist', 6, { track: 'ic' }],
      ['headliner', 'Headlining Artist', 9, { track: 'ic', minSize: 'medium' }],
      ['producer', 'Music Producer', 6, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 10 }],
      ['anr', 'A&R Director', 7, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget', 'sign'], reports: 30 }],
      ['labelHead', 'Label President', 10, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'sign'], reports: 200 }],
    ],
  },
  athletics: {
    id: 'athletics', name: 'Professional Sports', icon: '🏆', sector: 'private', payMultiplier: 1.3, minAge: 18, sizes: { medium: 2, large: 2, enterprise: 1 }, background: 'standard', commission: true, promotionOdds: 0.5,
    union: { chance: 0.9, name: 'Players Association', strike: true },
    employers: ['Metro Thunder', 'Harbor City FC', 'River Valley Hawks', 'Summit Ridge Rockets'],
    eligible: fitnessGate(75, 26),
    ladder: [
      ['minor', 'Development / Minor-League Player', 2, { years: 2 }],
      ['pro', 'Professional Athlete', 6],
      ['rotation', 'Rotation Player', 7],
      ['starter', 'Starter', 8, { track: 'ic' }],
      ['allStar', 'All-Star', 10, { track: 'ic', minSize: 'large' }],
      ['assistant', 'Assistant Coach', 5, { track: 'mgmt', abilities: ['supervise'], reports: 15 }],
      ['coordinator', 'Coordinator', 6, { track: 'mgmt', abilities: ['supervise', 'budget'], reports: 15 }],
      ['headCoach', 'Head Coach', 8, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 50 }],
      ['gm', 'Team General Manager', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate', 'sign', 'exec'], reports: 120 }],
      ['president', 'President of Operations', 10, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'exec'], reports: 300 }],
    ],
  },
  fitness: {
    id: 'fitness', name: 'Fitness & Personal Training', icon: '🏋️', sector: 'private', payMultiplier: 0.82, minAge: 18, sizes: { small: 3, medium: 3, large: 1 }, background: 'lenient',
    employers: ['Iron Temple Gym', 'PeakFit Clubs', 'Momentum Fitness', 'Core & Cardio Studio'],
    ladder: [
      ['frontDesk', 'Gym Front Desk Associate', 1],
      ['trainer', 'Personal Trainer', 3, { entry: true, req: { credentials: ['cpt'] } }],
      ['senior', 'Senior Personal Trainer', 4],
      ['master', 'Master Trainer', 5, { track: 'ic' }],
      ['coach', 'Strength & Conditioning Coach', 6, { track: 'ic', minSize: 'medium' }],
      ['fitnessManager', 'Fitness Manager', 4, { track: 'mgmt', abilities: ['supervise'], reports: 12 }],
      ['clubGm', 'Club General Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 40 }],
      ['regional', 'Regional Director of Clubs', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 300 }],
    ],
  },

  /* ---------------- Business functions ---------------- */
  marketing: {
    id: 'marketing', name: 'Marketing & Advertising', icon: '📣', sector: 'private', payMultiplier: 1.0, minAge: 21, sizes: { small: 2, medium: 3, large: 3, enterprise: 2 }, background: 'lenient', remote: true,
    employers: ['Brightline Marketing', 'Signal & Noise Agency', 'Northstar Brands', 'Clearwater Creative'],
    entry: { education: { level: 'bachelor' } },
    ladder: [
      ['coordinator', 'Marketing Coordinator', 2],
      ['specialist', 'Marketing Specialist', 3],
      ['manager', 'Marketing Manager', 5],
      ['strategist', 'Senior Brand Strategist', 6, { track: 'ic' }],
      ['principal', 'Principal Brand Strategist', 8, { track: 'ic', minSize: 'large' }],
      ['director', 'Marketing Director', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 15 }],
      ['vp', 'VP of Marketing', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 60 }],
      ['cmo', 'Chief Marketing Officer', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'sign'], reports: 250 }],
    ],
  },
  sales: {
    id: 'sales', name: 'Sales (B2B)', icon: '🤝', sector: 'private', payMultiplier: 1.05, minAge: 18, sizes: { small: 2, medium: 3, large: 3, enterprise: 2 }, background: 'lenient', commission: true, cyclical: 1.3,
    employers: ['Vector Industrial Supply', 'Apex Software Sales', 'Meridian Medical Devices', 'Keystone Business Solutions'],
    ladder: [
      ['sdr', 'Sales Development Representative', 2],
      ['ae', 'Account Executive', 4],
      ['seniorAe', 'Senior Account Executive', 5],
      ['enterprise', 'Enterprise Account Executive', 7, { track: 'ic', minSize: 'medium' }],
      ['strategic', 'Strategic Accounts Director', 8, { track: 'ic', minSize: 'large' }],
      ['salesManager', 'Sales Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 10 }],
      ['director', 'Director of Sales', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 50 }],
      ['vpSales', 'VP of Sales', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 200 }],
      ['cro', 'Chief Revenue Officer', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'sign'], reports: 600 }],
    ],
  },
  humanResources: {
    id: 'humanResources', name: 'Human Resources', icon: '🧑‍💼', sector: 'private', payMultiplier: 0.95, minAge: 21, sizes: { small: 2, medium: 3, large: 3, enterprise: 2 }, background: 'standard',
    employers: ['PeopleFirst HR Services', 'Northbridge Staffing', 'Summit Health Systems', 'Keystone Manufacturing'],
    entry: { education: { level: 'bachelor' } },
    valued: ['shrm'],
    ladder: [
      ['assistant', 'HR Assistant', 2],
      ['generalist', 'HR Generalist', 3],
      ['hrbp', 'HR Business Partner', 5],
      ['specialist', 'Compensation & Benefits Specialist', 6, { track: 'ic' }],
      ['principal', 'Principal Talent Strategist', 7, { track: 'ic', minSize: 'large' }],
      ['manager', 'HR Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 8 }],
      ['director', 'HR Director', 8, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget', 'policy'], reports: 30 }],
      ['chro', 'Chief Human Resources Officer', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'policy'], reports: 150 }],
    ],
  },
  design: {
    id: 'design', name: 'Graphic & UX Design', icon: '🎨', sector: 'private', payMultiplier: 0.95, minAge: 18, sizes: { small: 3, medium: 3, large: 2, enterprise: 1 }, background: 'lenient', remote: true,
    employers: ['Pixel & Grain Studio', 'Clearwater Creative', 'Lumen Systems Design', 'Brightline Agency'],
    ladder: [
      ['junior', 'Junior Designer', 2],
      ['designer', 'Designer', 4],
      ['senior', 'Senior Designer', 5],
      ['lead', 'Lead Product Designer', 7, { track: 'ic' }],
      ['principal', 'Principal Designer', 8, { track: 'ic', minSize: 'large' }],
      ['artDirector', 'Art Director', 6, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 8 }],
      ['creativeDirector', 'Creative Director', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 30 }],
      ['vpDesign', 'VP of Design', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 120 }],
    ],
  },
  cybersecurity: {
    id: 'cybersecurity', name: 'Cybersecurity & IT', icon: '🛡️', sector: 'private', payMultiplier: 1.1, minAge: 18, sizes: { small: 2, medium: 3, large: 3, enterprise: 2 }, background: 'strict', remote: true,
    employers: ['SecureNet Solutions', 'Ironclad Cyber', 'Granite Capital IT', 'Mercy Health IT Services'],
    valued: ['securityPlus', 'cissp'],
    ladder: [
      ['helpdesk', 'IT Help Desk Technician', 2],
      ['sysadmin', 'Systems Administrator', 4],
      ['analyst', 'Security Analyst', 5, { req: { credentials: ['securityPlus'] } }],
      ['engineer', 'Security Engineer', 7, { track: 'ic' }],
      ['architect', 'Security Architect', 8, { track: 'ic', minSize: 'medium', req: { credentials: ['cissp'] } }],
      ['itManager', 'IT Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 10 }],
      ['director', 'Director of Information Security', 8, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget'], reports: 40 }],
      ['ciso', 'Chief Information Security Officer', 10, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'classified'], reports: 150 }],
    ],
  },
  dataScience: {
    id: 'dataScience', name: 'Data Science & Analytics', icon: '📊', sector: 'private', payMultiplier: 1.15, minAge: 21, sizes: { medium: 3, large: 3, enterprise: 2 }, background: 'lenient', remote: true,
    employers: ['Quanta Analytics', 'Lumen Data Labs', 'Harbor Trust Analytics', 'Meridian Insights'],
    entry: { education: { level: 'bachelor', majors: ['mathematics', 'computerScience', 'economics', 'engineering', 'business'] } },
    ladder: [
      ['analyst', 'Data Analyst', 4],
      ['scientist', 'Data Scientist', 6],
      ['senior', 'Senior Data Scientist', 7],
      ['ml', 'Machine Learning Engineer', 8, { track: 'ic' }],
      ['principal', 'Principal Data Scientist', 9, { track: 'ic', minSize: 'large' }],
      ['manager', 'Analytics Manager', 7, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 8 }],
      ['head', 'Head of Data', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 60 }],
      ['cdo', 'Chief Data Officer', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec'], reports: 200 }],
    ],
  },
  architecture: {
    id: 'architecture', name: 'Architecture', icon: '🏛️', sector: 'private', payMultiplier: 1.0, minAge: 22, sizes: { small: 3, medium: 3, large: 2 }, background: 'standard', cyclical: 1.2,
    employers: ['Stone & Glass Architects', 'Meridian Design Partners', 'Northgate Architecture', 'Keystone Studio'],
    entry: { education: { level: 'bachelor', majors: ['architecture'] } },
    ladder: [
      ['designer', 'Architectural Designer', 4],
      ['architect', 'Architect', 6, { req: { credentials: ['architectLicense'] } }],
      ['project', 'Project Architect', 7],
      ['senior', 'Senior Architect', 8, { track: 'ic' }],
      ['designPrincipal', 'Design Principal', 9, { track: 'ic', minSize: 'large' }],
      ['studio', 'Studio Director', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 20 }],
      ['principal', 'Firm Principal', 9, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget', 'sign'], reports: 60 }],
      ['managing', 'Managing Principal', 10, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'sign'], reports: 200 }],
    ],
  },

  /* ---------------- Warehouses & factories ---------------- */
  logistics: {
    id: 'logistics', name: 'Warehouse & Logistics', icon: '📦', sector: 'private', payMultiplier: 0.85, minAge: 18, sizes: { medium: 2, large: 3, enterprise: 3 }, background: 'lenient', cyclical: 1.2,
    union: { chance: 0.2, name: 'Teamsters', strike: true },
    employers: ['Prime Logistics Center', 'Midwest Distribution Co.', 'Harbor Freight Terminals', 'Swift Fulfillment'],
    ladder: [
      ['associate', 'Warehouse Associate', 1],
      ['forklift', 'Forklift Operator', 2, { req: { credentials: ['forklift'] } }],
      ['lead', 'Warehouse Lead', 3],
      ['inventory', 'Inventory Control Specialist', 4, { track: 'ic' }],
      ['planner', 'Supply Chain Planner', 6, { track: 'ic', req: { education: { level: 'bachelor' } } }],
      ['supervisor', 'Shift Supervisor', 4, { track: 'mgmt', abilities: ['supervise'], reports: 25 }],
      ['opsManager', 'Operations Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 120 }],
      ['dcGm', 'Distribution Center General Manager', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 600 }],
      ['vpSupply', 'VP of Supply Chain', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec'], reports: 3000 }],
    ],
  },
  manufacturing: {
    id: 'manufacturing', name: 'Manufacturing', icon: '🏭', sector: 'private', payMultiplier: 0.9, minAge: 18, sizes: { small: 2, medium: 3, large: 3, enterprise: 2 }, background: 'lenient', cyclical: 1.3,
    union: { chance: 0.35, name: 'United Auto Workers (UAW)', strike: true },
    benefits: { unionPension: 'union' },
    employers: ['Keystone Manufacturing', 'Great Lakes Precision', 'Summit Auto Parts', 'Northfield Fabricated Metals'],
    ladder: [
      ['assembler', 'Assembler', 1],
      ['operator', 'Machine Operator', 2],
      ['machinist', 'CNC Machinist', 4],
      ['toolmaker', 'Tool & Die Maker', 6, { track: 'ic' }],
      ['quality', 'Quality Engineer', 6, { track: 'ic', req: { education: { level: 'bachelor' } } }],
      ['supervisor', 'Production Supervisor', 4, { track: 'mgmt', abilities: ['supervise'], reports: 25 }],
      ['superintendent', 'Plant Superintendent', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 150 }],
      ['plantManager', 'Plant Manager', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 800 }],
      ['vpMfg', 'VP of Manufacturing', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec'], reports: 4000 }],
    ],
  },

  /* ---------------- Care work ---------------- */
  childcare: {
    id: 'childcare', name: 'Early Childhood Education', icon: '🧸', sector: 'private', payMultiplier: 0.8, minAge: 18, sizes: { small: 4, medium: 2 }, background: 'strict',
    employers: ['Little Sprouts Learning Center', 'Bright Beginnings Preschool', 'KinderCare Academy', 'Sunshine Child Development Center'],
    ladder: [
      ['aide', 'Childcare Aide', 1],
      ['teacher', 'Preschool Teacher', 2, { req: { credentials: ['cda'] } }],
      ['teacher2', 'Preschool Teacher II', 3],
      ['lead', 'Lead Teacher', 3],
      ['specialist', 'Early Intervention Specialist', 4, { track: 'ic', req: { education: { level: 'bachelor' } } }],
      ['coach', 'Instructional Coach', 5, { track: 'ic', minSize: 'medium' }],
      ['assistantDirector', 'Assistant Director', 4, { track: 'mgmt', abilities: ['supervise', 'budget'], reports: 12 }],
      ['director', 'Center Director', 5, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 20 }],
      ['regional', 'Regional Director', 7, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 150 }],
      ['area', 'Vice President of Centers', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 400 }],
    ],
  },
  caregiving: {
    id: 'caregiving', name: 'Home Care & Caregiving', icon: '🤲', sector: 'private', payMultiplier: 0.78, minAge: 18, sizes: { small: 3, medium: 3, large: 1 }, background: 'strict',
    employers: ['Comfort Keepers', 'Home Instead Senior Care', 'Visiting Angels', 'Golden Years Home Care'],
    ladder: [
      ['pca', 'Personal Care Aide', 1],
      ['hha', 'Home Health Aide', 2, { req: { credentials: ['cna'] } }],
      ['senior', 'Senior Caregiver', 3],
      ['lead', 'Lead Caregiver', 3],
      ['memoryCare', 'Memory Care Specialist', 4, { track: 'ic' }],
      ['trainer', 'Dementia Care Trainer', 5, { track: 'ic', minSize: 'medium' }],
      ['coordinator', 'Care Coordinator', 4, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 15 }],
      ['supervisor', 'Field Supervisor', 5, { track: 'mgmt', abilities: ['supervise', 'budget'], reports: 30 }],
      ['director', 'Agency Director', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 60 }],
      ['regional', 'Regional Director', 7, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate'], reports: 300 }],
    ],
  },
  funeral: {
    id: 'funeral', name: 'Funeral Services', icon: '⚱️', sector: 'private', payMultiplier: 0.95, minAge: 18, sizes: { small: 4, medium: 2, large: 1 }, background: 'standard',
    employers: ['Evergreen Funeral Home', 'Hillcrest Memorial Chapel', 'Riverside Mortuary', 'Dignity Memorial'],
    ladder: [
      ['attendant', 'Funeral Attendant', 1],
      ['removal', 'Removal Technician', 2],
      ['apprentice', 'Apprentice Funeral Director', 3, { entry: true, req: { education: { program: 'mortuaryScience' } } }],
      ['director', 'Funeral Director & Embalmer', 5, { req: { credentials: ['funeralDirectorLicense'] } }],
      ['senior', 'Senior Funeral Director', 6, { track: 'ic' }],
      ['chiefEmbalmer', 'Chief Embalmer', 7, { track: 'ic', minSize: 'medium' }],
      ['manager', 'Funeral Home Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 10 }],
      ['regional', 'Regional Manager', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 80 }],
      ['vp', 'VP of Operations', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 600 }],
    ],
  },
  nonprofit: {
    id: 'nonprofit', name: 'Nonprofit & Advocacy', icon: '💚', sector: 'private', payMultiplier: 0.85, minAge: 21, sizes: { small: 3, medium: 3, large: 2 }, background: 'standard',
    employers: ['Hope Community Foundation', 'Greater Good Alliance', 'Riverbend Food Bank', 'Citizens for Clean Water'],
    // Local charities carry the city's name, so two cities never share one.
    employerName: (city, rng) => rng.pick(NONPROFIT_NAMES)(city),
    entry: { education: { level: 'bachelor' } },
    ladder: [
      ['assistant', 'Program Assistant', 2],
      ['coordinator', 'Program Coordinator', 3],
      ['manager', 'Program Manager', 4],
      ['development', 'Development Officer', 5, { track: 'ic' }],
      ['majorGifts', 'Director of Major Gifts', 7, { track: 'ic', minSize: 'medium' }],
      ['programDirector', 'Program Director', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 15 }],
      ['ed', 'Executive Director', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate', 'sign', 'policy'], reports: 60 }],
      ['ceo', 'President & CEO', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'sign', 'policy'], reports: 300 }],
    ],
  },

  /* ---------------- Public servants ---------------- */
  library: {
    id: 'library', name: 'Public Libraries', icon: '📚', sector: 'municipal', payMultiplier: 0.9, minAge: 16, sizes: { small: 2, medium: 2, large: 1 }, background: 'standard',
    union: { chance: 0.5, name: 'AFSCME', strike: false },
    employerName: (city) => `${city} Public Library`,
    ladder: [
      ['page', 'Library Page', 1],
      ['assistant', 'Library Assistant', 2],
      ['librarian', 'Librarian', 4, { entry: true, req: { education: { program: 'mls' } } }],
      ['senior', 'Senior Librarian', 5],
      ['archivist', 'Archivist & Special Collections Librarian', 6, { track: 'ic' }],
      ['branch', 'Branch Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 15 }],
      ['director', 'Library Director', 8, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget', 'delegate', 'policy'], reports: 120 }],
    ],
  },
  waterUtility: {
    id: 'waterUtility', name: 'Water & Wastewater Utilities', icon: '💧', sector: 'municipal', payMultiplier: 0.95, minAge: 18, sizes: { small: 2, medium: 2, large: 1 }, background: 'standard',
    union: { chance: 0.5, name: 'AFSCME', strike: false },
    employerName: (city) => `${city} Water Department`,
    ladder: [
      ['trainee', 'Operator in Training', 2, { years: 1 }],
      ['operator', 'Water Treatment Operator', 3, { req: { credentials: ['waterOperator'] } }],
      ['senior', 'Senior Plant Operator', 4],
      ['lab', 'Water Quality Lab Analyst', 5, { track: 'ic' }],
      ['chief', 'Chief Plant Operator', 5, { track: 'mgmt', abilities: ['supervise'], reports: 12 }],
      ['superintendent', 'Utilities Superintendent', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 60 }],
      ['director', 'Director of Water Utilities', 8, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget', 'delegate', 'policy'], reports: 200 }],
    ],
  },
  animalControl: {
    id: 'animalControl', name: 'Animal Services', icon: '🐕', sector: 'municipal', payMultiplier: 0.85, minAge: 18, sizes: { small: 2, medium: 2, large: 1 }, background: 'standard',
    union: { chance: 0.4, name: 'AFSCME', strike: false },
    employerName: (city) => `${city} Animal Services`,
    entry: { credentials: ['driverLicense'] },
    ladder: [
      ['kennel', 'Kennel Attendant', 1],
      ['officer', 'Animal Control Officer', 3, { req: { credentials: ['animalControlCert'] } }],
      ['senior', 'Senior Animal Control Officer', 4],
      ['investigator', 'Humane Investigator', 5, { track: 'ic', abilities: ['inspect'] }],
      ['supervisor', 'Field Supervisor', 4, { track: 'mgmt', abilities: ['supervise'], reports: 10 }],
      ['director', 'Animal Services Director', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'policy'], reports: 50 }],
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
    ladder: [
      ['trainee', 'Border Patrol Agent Trainee', 5, { years: 1, req: { clearance: 'secret' } }],
      ['agent', 'Border Patrol Agent', 6, { req: { credentials: ['cbpAcademy'] }, abilities: ['arrest'] }],
      ['senior', 'Senior Patrol Agent', 7, { abilities: ['arrest'] }],
      ['bortac', 'BORTAC Tactical Unit Agent', 8, { track: 'ic', minSize: 'enterprise', abilities: ['arrest'] }],
      ['supervisory', 'Supervisory Border Patrol Agent', 8, { track: 'mgmt', abilities: ['arrest', 'supervise'], reports: 15 }],
      ['watch', 'Watch Commander', 9, { track: 'mgmt', abilities: ['arrest', 'supervise', 'hire'], reports: 100 }],
      ['pail', 'Patrol Agent in Charge', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 400 }],
      ['chiefPatrol', 'Chief Patrol Agent', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec'], reports: 2000 }],
    ],
  },
};

export default { id: 'careers-workforce', version: 1, careers };
