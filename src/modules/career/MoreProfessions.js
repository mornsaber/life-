/**
 * More careers: health professions with their own doctoral and master's
 * programs (dentistry, physical therapy, physician assistants, veterinary
 * medicine), skilled trades with apprenticeships and certifications (HVAC,
 * welding, automotive, power lineworkers), and a few specialists (air
 * traffic control, actuarial science, the state crime lab).
 *
 * Real-world rules worth knowing:
 *   - FAA air traffic controllers must be hired before age 31 and retire at 56.
 *   - Actuaries qualify by passing a long series of Society of Actuaries exams.
 *   - Lineworkers top out after a 3–4 year apprenticeship (journeyman lineman).
 */
import { L } from './Ladder.js';

export const ATC_MAX_ENTRY_AGE = 30;

export const MORE_PROFESSIONS = {
  dentistry: {
    id: 'dentistry', name: 'Dentistry', icon: '🦷', sector: 'private', payMultiplier: 1.6, minAge: 25, sizes: { small: 4, medium: 3, large: 1 }, background: 'strict',
    employers: ['Bright Smile Dental', 'Family Dental Partners', 'Aspen Dental Group', 'Lakeside Oral Surgery'],
    entry: { education: { program: 'dds' } },
    levels: [
      L('associate', 'Associate Dentist', 7, { req: { credentials: ['dentalLicense'] }, abilities: ['prescribe'] }),
      L('dentist', 'Dentist', 8, { abilities: ['prescribe'] }),
      L('specialist', 'Dental Specialist (Orthodontics / Oral Surgery)', 9, { track: 'ic', minSize: 'medium', req: { credentials: ['dentalLicense'], experience: { professions: ['dentistry'], years: 4 } }, abilities: ['prescribe'] }),
      L('partner', 'Practice Partner', 9, { track: 'mgmt', abilities: ['prescribe', 'supervise', 'hire', 'budget', 'sign'], reports: 15 }),
    ],
  },
  physicalTherapy: {
    id: 'physicalTherapy', name: 'Physical Therapy', icon: '🦵', sector: 'private', payMultiplier: 1.0, minAge: 18, sizes: { small: 3, medium: 3, large: 2 }, background: 'standard',
    employers: ['Motion Physical Therapy', 'Peak Performance Rehab', 'Regional Medical Center Rehab', 'SportsCare PT'],
    levels: [
      L('aide', 'Physical Therapy Aide', 1),
      L('pt', 'Physical Therapist', 5, { entry: true, req: { credentials: ['ptLicense'] } }),
      L('senior', 'Senior Physical Therapist', 6),
      L('specialist', 'Board-Certified Clinical Specialist', 7, { track: 'ic' }),
      L('director', 'Clinic Director', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 12 }),
      L('regional', 'Regional Director of Rehab', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 120 }),
    ],
  },
  physicianAssistant: {
    id: 'physicianAssistant', name: 'Physician Assistant', icon: '🩻', sector: 'private', payMultiplier: 1.08, minAge: 22, sizes: { medium: 2, large: 3, enterprise: 2 }, background: 'strict',
    employers: ['Valley Health System', 'Riverside Urgent Care', 'St. Mercy Medical Group', 'Summit Orthopedics'],
    entry: { education: { program: 'paMaster' } },
    levels: [
      L('pa', 'Physician Assistant', 6, { req: { credentials: ['paLicense'] }, abilities: ['prescribe'] }),
      L('senior', 'Senior Physician Assistant', 7, { abilities: ['prescribe'] }),
      L('surgical', 'Surgical Physician Assistant', 8, { track: 'ic', minSize: 'large', abilities: ['prescribe'] }),
      L('lead', 'Lead APP', 8, { track: 'mgmt', abilities: ['prescribe', 'supervise'], reports: 10 }),
      L('director', 'Director of Advanced Practice', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 150 }),
    ],
  },
  veterinary: {
    id: 'veterinary', name: 'Veterinary Medicine', icon: '🐾', sector: 'private', payMultiplier: 1.0, minAge: 18, sizes: { small: 4, medium: 3, large: 1 }, background: 'standard',
    employers: ['Paws & Claws Animal Hospital', 'Countryside Large Animal Vets', 'PetWell Clinic', 'Metro Emergency Vet'],
    levels: [
      L('tech', 'Veterinary Technician', 2),
      L('associate', 'Associate Veterinarian', 6, { entry: true, req: { credentials: ['vetLicense'] }, abilities: ['prescribe'] }),
      L('vet', 'Veterinarian', 7, { abilities: ['prescribe'] }),
      L('specialist', 'Board-Certified Veterinary Specialist', 9, { track: 'ic', minSize: 'medium', req: { experience: { professions: ['veterinary'], years: 4 } }, abilities: ['prescribe'] }),
      L('medicalDirector', 'Medical Director', 8, { track: 'mgmt', abilities: ['prescribe', 'supervise', 'hire', 'budget'], reports: 20 }),
    ],
  },
  hvac: {
    id: 'hvac', name: 'HVAC & Refrigeration', icon: '❄️', sector: 'private', payMultiplier: 0.88, promotionOdds: 0.7, minAge: 18, sizes: { small: 4, medium: 3, large: 1 }, background: 'lenient',
    union: { chance: 0.3, name: 'United Association (UA) Local 597', strike: true },
    benefits: { unionPension: 'union' },
    employers: ['Comfort Air Heating & Cooling', 'Polar Mechanical', 'Reliable HVAC Services', 'Metro Refrigeration'],
    levels: [
      L('apprentice', 'HVAC Apprentice', 1, { years: 2 }),
      L('tech', 'HVAC Technician', 3, { req: { credentials: ['epa608'] } }),
      L('senior', 'Senior Service Technician', 4),
      L('commercial', 'Commercial Refrigeration Technician', 5, { track: 'ic' }),
      L('foreman', 'Install Foreman', 4, { track: 'mgmt', abilities: ['supervise'], reports: 6 }),
      L('serviceManager', 'Service Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 30 }),
    ],
  },
  welding: {
    id: 'welding', name: 'Welding & Fabrication', icon: '🔥', sector: 'private', payMultiplier: 0.85, promotionOdds: 0.7, minAge: 18, sizes: { small: 3, medium: 3, large: 2 }, background: 'lenient',
    union: { chance: 0.35, name: 'International Brotherhood of Boilermakers', strike: true },
    benefits: { unionPension: 'union' },
    employers: ['Ironworks Fabrication', 'Gulf Pipeline Constructors', 'Precision Metalworks', 'Harbor Shipyard'],
    levels: [
      L('helper', 'Welder\'s Helper', 1, { years: 1 }),
      L('welder', 'Certified Welder', 3, { req: { credentials: ['awsWelder'] } }),
      L('pipe', 'Pipeline Welder', 5, { track: 'ic', minSize: 'medium' }),
      L('inspector', 'Certified Welding Inspector', 6, { track: 'ic', req: { experience: { professions: ['welding'], years: 5 } }, abilities: ['inspect'] }),
      L('foreman', 'Welding Foreman', 5, { track: 'mgmt', abilities: ['supervise'], reports: 10 }),
      L('superintendent', 'Fabrication Superintendent', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 60 }),
    ],
  },
  automotive: {
    id: 'automotive', name: 'Automotive Service', icon: '🔧', sector: 'private', payMultiplier: 0.8, minAge: 16, sizes: { small: 4, medium: 3, large: 2 }, background: 'lenient',
    employers: ['Main Street Auto Repair', 'Heartland Ford Service', 'QuickLube Express', 'Diesel Pro Truck Service'],
    levels: [
      L('lube', 'Lube Technician', 1),
      L('tech', 'Automotive Technician', 2),
      L('master', 'ASE Master Technician', 4, { req: { credentials: ['ase'] } }),
      L('diesel', 'Diesel Technician', 5, { track: 'ic', req: { credentials: ['ase'] } }),
      L('advisor', 'Service Advisor', 3, { track: 'mgmt', abilities: ['supervise'], reports: 4 }),
      L('serviceManager', 'Service Manager', 5, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 20 }),
      L('fixedOps', 'Fixed Operations Director', 7, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 120 }),
    ],
  },
  lineworker: {
    id: 'lineworker', name: 'Power Lineworker', icon: '⚡', sector: 'private', payMultiplier: 1.1, promotionOdds: 0.7, minAge: 18, sizes: { medium: 2, large: 3, enterprise: 2 }, background: 'standard',
    union: { chance: 0.7, name: 'IBEW Outside Local 1245', strike: true },
    benefits: { unionPension: 'union' },
    employers: ['Prairie Electric Cooperative', 'Metro Power & Light', 'Western Grid Utilities', 'Storm Restoration Contractors'],
    entry: { credentials: ['cdlA'] },
    levels: [
      L('apprentice', 'Apprentice Lineworker', 3, { years: 3 }),
      L('journeyman', 'Journeyman Lineworker', 5, { req: { credentials: ['journeymanLineman'] } }),
      L('troubleman', 'Troubleman', 6, { track: 'ic' }),
      L('foreman', 'Line Foreman', 6, { track: 'mgmt', abilities: ['supervise'], reports: 8 }),
      L('generalForeman', 'General Foreman', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'command'], reports: 40 }),
      L('superintendent', 'Line Superintendent', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 200 }),
    ],
  },
  airTrafficControl: {
    id: 'airTrafficControl', name: 'Air Traffic Control (FAA)', icon: '🗼', sector: 'federal', sizes: { large: 1, enterprise: 1 }, payMultiplier: 1.35, minAge: 18, background: 'strict', exam: 'federal',
    union: { chance: 1, name: 'National Air Traffic Controllers Association', strike: false },
    benefits: { pension: 'fers' },
    mandatoryRetirement: 56,
    employers: ['FAA — Airport Traffic Control Tower', 'FAA — Approach Control (TRACON)', 'FAA — Air Route Traffic Control Center'],
    eligible: (state) => (state.character.age > ATC_MAX_ENTRY_AGE ? { ok: false, reason: `The FAA only hires new controllers before age ${ATC_MAX_ENTRY_AGE + 1}` } : { ok: true }),
    entry: { education: { level: 'highschool' } },
    levels: [
      L('trainee', 'Developmental Controller', 4, { years: 2, req: { clearance: 'publicTrust' } }),
      L('cpc', 'Certified Professional Controller', 7, { req: { credentials: ['atcCert'] } }),
      L('center', 'En Route Center Controller', 8, { track: 'ic', minSize: 'enterprise' }),
      L('supervisor', 'Operations Supervisor', 8, { track: 'mgmt', abilities: ['supervise', 'command'], reports: 15 }),
      L('manager', 'Air Traffic Manager', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 300 }),
    ],
  },
  actuary: {
    id: 'actuary', name: 'Actuarial Science', icon: '📐', sector: 'private', payMultiplier: 1.3, minAge: 21, sizes: { medium: 1, large: 3, enterprise: 3 }, background: 'standard', remote: true,
    employers: ['Mutual Life Assurance', 'Great Lakes Re', 'Hartwell Actuarial Consulting', 'Keystone Health Plans'],
    entry: { education: { level: 'bachelor' } },
    levels: [
      L('analyst', 'Actuarial Analyst', 4),
      L('associate', 'Associate Actuary (ASA)', 6, { req: { credentials: ['soaASA'] } }),
      L('fellow', 'Actuary (FSA)', 7, { req: { credentials: ['soaFSA'] } }),
      L('consulting', 'Consulting Actuary', 8, { track: 'ic', minSize: 'large' }),
      L('manager', 'Actuarial Manager', 8, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 10 }),
      L('chief', 'Chief Actuary', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 200 }),
    ],
  },
  forensics: {
    sector: 'state', stateAgency: true, exam: 'state', background: 'strict',
    id: 'forensics', name: 'State Crime Laboratory', icon: '🧬', payMultiplier: 0.95, minAge: 21,
    employerName: (_city, _rng, stateName) => `${stateName} Crime Laboratory`,
    entry: { education: { level: 'bachelor' } },
    valued: ['forensicCert'],
    levels: [
      L('tech', 'Forensic Technician', 3),
      L('scientist', 'Forensic Scientist', 5, { req: { education: { level: 'bachelor', majors: ['forensicScience', 'biology', 'environmentalScience'] } } }),
      L('dna', 'DNA Analyst', 6, { track: 'ic', req: { credentials: ['forensicCert'] } }),
      L('csi', 'Crime Scene Investigator', 6, { track: 'ic', abilities: ['audit'] }),
      L('supervisor', 'Forensic Unit Supervisor', 7, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 12 }),
      L('director', 'Laboratory Director', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate', 'sign'], reports: 120 }),
    ],
  },
};
