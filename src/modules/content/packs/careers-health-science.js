/**
 * Health and science careers outside the hospital ladder: travel nursing,
 * county public health (health inspectors and epidemiologists) and
 * research science — plus the module that runs flight-crew hazards and the
 * research grant cycle.
 *
 *  - Travel nurses earn a premium for 13-week contracts in a different city
 *    every few months: housing is provided, but home life suffers.
 *  - Flight nurses and flight paramedics fly on medical helicopters: hazard
 *    pay and a small but real risk of a crash.
 *  - Researchers live by grants. Principal investigators apply for funding
 *    (about one proposal in five is funded); go too long without it and the
 *    lab closes. Postdocs get five years to move up or out — and anyone can
 *    be scooped.
 *
 * state.science = { grant: { agency, yearsLeft, amount } | null, papers, unfunded, scooped }
 */
import { L } from '../../career/Ladder.js';

const careers = {
  travelNursing: {
    id: 'travelNursing', name: 'Travel Nursing', icon: '🧳', sector: 'private', payMultiplier: 1.3, minAge: 21, sizes: { medium: 3, large: 2 }, background: 'strict',
    employers: ['Nomad Nurse Staffing', 'Wayfarer Healthcare Partners', 'Meridian Clinical Staffing', 'Compass Travel Health'],
    benefits: { housing: true },
    rotation: { label: 'on 13-week assignments', away: 0.6 },
    entry: { credentials: ['rn'], experience: { professions: ['nursing'], years: 2 } },
    ladder: [
      ['travel', 'Travel Nurse', 6, { req: { credentials: ['rn'] } }],
      ['travelIcu', 'Travel ICU Nurse', 7, { track: 'ic', req: { credentials: ['ccrn'] } }],
      ['crisis', 'Crisis & Strike Response Nurse', 8, { track: 'ic' }],
      ['liaison', 'Clinical Liaison', 6, { track: 'mgmt', abilities: ['supervise'], reports: 40 }],
      ['director', 'Director of Clinical Operations', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 400 }],
    ],
  },
  privateEms: {
    id: 'privateEms', name: 'Private Ambulance Service', icon: '🚐', sector: 'private', payMultiplier: 0.86, minAge: 18, sizes: { small: 2, medium: 3, large: 2, enterprise: 1 }, background: 'standard',
    union: { chance: 0.2, name: 'Teamsters EMS Local 1199', strike: true },
    employers: ['MedRide Ambulance', 'Lifeline Medical Transport', 'Apex Ambulance Service', 'Guardian EMS', 'Keystone Critical Care Transport', 'TriCounty Ambulance Co.'],
    entry: { credentials: ['driverLicense'] },
    valued: ['paramedic', 'evoc', 'acls', 'ccp'],
    ladder: [
      ['emt', 'EMT', 2, { entry: true, req: { credentials: ['emt'] } }],
      ['paramedic', 'Paramedic', 4, { entry: true, req: { credentials: ['paramedic'] }, abilities: ['prescribe'] }],
      ['cct', 'Critical Care Transport Paramedic', 5, { track: 'ic', req: { credentials: ['ccp'] }, abilities: ['prescribe'] }],
      ['flight', 'Flight Paramedic', 6, { track: 'ic', minSize: 'large', req: { credentials: ['flightParamedic'] }, abilities: ['prescribe'], airMedical: true }],
      ['fto', 'Field Training Officer', 4, { track: 'mgmt', abilities: ['supervise'], reports: 4 }],
      ['supervisor', 'Operations Supervisor', 5, { track: 'mgmt', abilities: ['supervise', 'command'], reports: 25 }],
      ['manager', 'Operations Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 80 }],
      ['director', 'Regional Director of Operations', 8, { track: 'mgmt', minSize: 'large', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec'], reports: 400 }],
    ],
  },
  publicHealth: {
    id: 'publicHealth', name: 'County Public Health', icon: '🧫', sector: 'municipal', exam: 'municipal', background: 'standard', payMultiplier: 0.95, minAge: 21,
    union: { chance: 0.5, name: 'AFSCME Public Health Local', strike: false },
    benefits: { pension: 'municipal' },
    employerName: (city) => `${city} County Health Department`,
    entry: { education: { level: 'bachelor' } },
    ladder: [
      ['inspector', 'Environmental Health Specialist (Health Inspector)', 4, { abilities: ['inspect'] }],
      ['seniorInspector', 'Senior Health Inspector', 5, { req: { credentials: ['rehs'] }, abilities: ['inspect'] }],
      ['epi', 'Epidemiologist', 6, { track: 'ic', entry: true, req: { education: { program: 'mph' } } }],
      ['seniorEpi', 'Senior Epidemiologist', 7, { track: 'ic', req: { credentials: ['cph'] } }],
      ['supervisor', 'Environmental Health Supervisor', 6, { track: 'mgmt', abilities: ['supervise', 'inspect'], reports: 12 }],
      ['director', 'Director of Public Health', 9, { track: 'mgmt', minSize: 'medium', req: { anyOf: [{ education: { program: 'mph' } }, { education: { program: 'md' } }] }, abilities: ['supervise', 'hire', 'budget', 'delegate', 'policy'], reports: 300 }],
    ],
  },
  research: {
    id: 'research', name: 'Research Science', icon: '🔬', sector: 'private', payMultiplier: 1.0, minAge: 24, sizes: { medium: 2, large: 3, enterprise: 2 }, background: 'standard',
    employers: ['Brightwater Research Institute', 'Helix Biosciences', 'National Laboratory for Applied Physics', 'Coastal Marine Science Center'],
    entry: { education: { program: 'phd' } },
    ladder: [
      ['postdoc', 'Postdoctoral Fellow', 5, { years: 3 }],
      ['staff', 'Staff Scientist', 6],
      ['senior', 'Senior Scientist', 7, { track: 'ic' }],
      ['fellow', 'Distinguished Fellow', 9, { track: 'ic', minSize: 'large' }],
      ['pi', 'Principal Investigator', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 12 }],
      ['director', 'Institute Director', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec'], reports: 400 }],
    ],
  },
};

export default { id: 'careers-health-science', version: 1, careers };
