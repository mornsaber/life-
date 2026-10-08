/**
 * Airport public safety: the airport authority's own police department and
 * its Aircraft Rescue & Firefighting (ARFF) department. ARFF crews sit
 * three minutes from any point on the runways in crash trucks that spray
 * foam on the move; airport police handle terminals, curbs, cargo and
 * everything that goes wrong between the TSA checkpoint and the gate.
 */
import { L } from './Ladder.js';

const AIRPORT = (city) => `${city} International Airport`;

export const AIRPORT_PROFESSIONS = {
  airportPolice: {
    id: 'airportPolice', name: 'Airport Police', icon: '🛂', sector: 'municipal', payMultiplier: 1.02, minAge: 21, background: 'strict', exam: 'publicSafety',
    sizes: { large: 2, enterprise: 2 },
    union: { chance: 0.8, name: 'Airport Police Officers Association', strike: false },
    benefits: { pension: 'publicSafety', ssCovered: false },
    employerName: (city) => `${AIRPORT(city)} Police Department`,
    entry: { education: { level: 'highschool' }, credentials: ['driverLicense'], fitness: 45 },
    valued: ['cit', 'emt', 'fto'],
    levels: [
      L('recruit', 'Airport Police Recruit', 3, { years: 1 }),
      L('officer', 'Airport Police Officer', 4, { entry: true, req: { credentials: ['post'] }, abilities: ['arrest'], years: 3 }),
      L('senior', 'Senior Airport Police Officer', 5, { abilities: ['arrest'] }),
      L('detective', 'Airport Police Detective', 6, { track: 'ic', abilities: ['arrest', 'audit'] }),
      L('sergeant', 'Airport Police Sergeant', 5, { track: 'mgmt', req: { credentials: ['fto'] }, abilities: ['arrest', 'supervise'], reports: 10 }),
      L('lieutenant', 'Airport Police Lieutenant', 6, { track: 'mgmt', req: { credentials: ['supervisorCourse'] }, abilities: ['arrest', 'supervise', 'command'], reports: 30 }),
      L('captain', 'Airport Police Captain', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'command'], reports: 80 }),
      L('chief', 'Chief of Airport Police', 8, { track: 'mgmt', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'policy'], reports: 250 }),
    ],
  },
  airportFire: {
    id: 'airportFire', name: 'Airport Fire Department (ARFF)', icon: '✈️', sector: 'municipal', payMultiplier: 1.0, minAge: 18, background: 'strict', exam: 'publicSafety',
    sizes: { large: 2, enterprise: 2 },
    union: { chance: 0.85, name: 'IAFF Airport Firefighters Local', strike: false },
    benefits: { pension: 'publicSafety', ssCovered: false },
    employerName: (city) => `${AIRPORT(city)} Fire Department`,
    entry: { education: { level: 'highschool' }, credentials: ['driverLicense'], fitness: 50 },
    valued: ['ff2', 'emt', 'hazmatOps', 'paramedic', 'driverOperator'],
    levels: [
      L('recruit', 'ARFF Recruit', 3, { years: 1 }),
      L('firefighter', 'ARFF Firefighter', 4, { entry: true, req: { credentials: ['ff2', 'arff'] } }),
      L('driver', 'ARFF Crash Truck Driver/Operator', 5, { req: { credentials: ['driverOperator'] } }),
      L('lieutenant', 'ARFF Lieutenant', 5, { track: 'mgmt', req: { credentials: ['fireOfficer1'] }, abilities: ['supervise', 'command'], reports: 5 }),
      L('captain', 'ARFF Captain', 6, { track: 'mgmt', req: { credentials: ['fireOfficer2'] }, abilities: ['supervise', 'command'], reports: 15 }),
      L('battalion', 'ARFF Battalion Chief', 7, { track: 'mgmt', req: { credentials: ['ics300'] }, abilities: ['supervise', 'budget', 'command'], reports: 45 }),
      L('chief', 'Airport Fire Chief', 8, { track: 'mgmt', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'policy', 'command'], reports: 120 }),
    ],
  },
};
