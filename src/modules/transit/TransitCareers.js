/**
 * Working in transportation: city transit agencies (bus and rail operators,
 * controllers, mechanics), transit police, freight and passenger railroads
 * (conductors and locomotive engineers under FRA certification), and school
 * bus drivers.
 */
import { L } from '../career/Ladder.js';

export const TRANSIT_PROFESSIONS = {
  transit: {
    id: 'transit', name: 'Public Transit Operations', icon: '🚌', sector: 'municipal', exam: 'municipal', background: 'standard', payMultiplier: 0.95, minAge: 21,
    sizes: { medium: 2, large: 3, enterprise: 2 },
    union: { chance: 0.85, name: 'Amalgamated Transit Union Local 241', strike: true },
    benefits: { pension: 'municipal' },
    employerName: (city) => `${city} Regional Transit Authority`,
    entry: { credentials: ['driverLicense'] },
    levels: [
      L('trainee', 'Bus Operator Trainee', 2, { years: 1 }),
      L('operator', 'Bus Operator', 3, { req: { credentials: ['cdlB', 'passengerEndorsement'] } }),
      L('senior', 'Senior Bus Operator', 4),
      L('rail', 'Train Operator (Subway / Light Rail)', 5, { track: 'ic', minSize: 'large', req: { credentials: ['railOperatorCert'] } }),
      L('controller', 'Rail Traffic Controller', 6, { track: 'ic', minSize: 'large', req: { credentials: ['railOperatorCert'] }, abilities: ['command'] }),
      L('streetSupervisor', 'Street Supervisor', 5, { track: 'mgmt', abilities: ['supervise', 'command'], reports: 30 }),
      L('superintendent', 'Division Superintendent', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 400 }),
      L('gm', 'Transit General Manager', 9, { track: 'mgmt', minSize: 'large', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 8000 }),
    ],
  },
  transitMaintenance: {
    id: 'transitMaintenance', name: 'Transit Maintenance', icon: '🛠️', sector: 'municipal', exam: 'municipal', background: 'standard', payMultiplier: 0.95, minAge: 18,
    sizes: { medium: 2, large: 3, enterprise: 2 },
    union: { chance: 0.85, name: 'Transport Workers Union Local 100', strike: true },
    benefits: { pension: 'municipal' },
    employerName: (city) => `${city} Regional Transit Authority — Maintenance`,
    levels: [
      L('helper', 'Maintenance Helper', 2),
      L('mechanic', 'Transit Bus Mechanic', 4, { req: { credentials: ['ase'] } }),
      L('railTech', 'Rail Car Technician', 5, { track: 'ic', minSize: 'large' }),
      L('signals', 'Signal Maintainer', 6, { track: 'ic', minSize: 'large', req: { credentials: ['journeymanElectrician'] } }),
      L('foreman', 'Maintenance Foreman', 5, { track: 'mgmt', abilities: ['supervise'], reports: 15 }),
      L('superintendent', 'Superintendent of Maintenance', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 300 }),
    ],
  },
  transitPolice: {
    id: 'transitPolice', name: 'Transit Police', icon: '🚇', sector: 'municipal', exam: 'publicSafety', background: 'strict', payMultiplier: 1.0, minAge: 21,
    sizes: { large: 2, enterprise: 2 },
    union: { chance: 0.85, name: 'Transit Police Benevolent Association', strike: false },
    benefits: { pension: 'publicSafety', ssCovered: false },
    employerName: (city) => `${city} Transit Police Department`,
    entry: { education: { level: 'highschool' }, credentials: ['driverLicense'], fitness: 45 },
    valued: ['cit', 'emt'],
    levels: [
      L('recruit', 'Transit Police Recruit', 3, { years: 1 }),
      L('officer', 'Transit Police Officer', 4, { req: { credentials: ['post'] }, abilities: ['arrest'] }),
      L('senior', 'Senior Transit Officer', 5, { abilities: ['arrest'] }),
      L('detective', 'Transit Detective', 6, { track: 'ic', abilities: ['arrest', 'audit'] }),
      L('sergeant', 'Transit Police Sergeant', 5, { track: 'mgmt', abilities: ['arrest', 'supervise'], reports: 10 }),
      L('lieutenant', 'Transit Police Lieutenant', 6, { track: 'mgmt', abilities: ['arrest', 'supervise', 'command'], reports: 30 }),
      L('chief', 'Chief of Transit Police', 8, { track: 'mgmt', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'delegate', 'policy'], reports: 600 }),
    ],
  },
  railroad: {
    id: 'railroad', name: 'Railroads (Freight & Passenger)', icon: '🚂', sector: 'private', background: 'strict', payMultiplier: 1.12, minAge: 18,
    sizes: { large: 2, enterprise: 3 },
    union: { chance: 0.9, name: 'SMART Transportation Division', strike: false },
    benefits: { unionPension: 'union' },
    employers: ['Union Continental Railroad', 'Great Plains & Pacific', 'Atlantic Coast Line', 'National Passenger Rail'],
    entry: { education: { level: 'highschool' } },
    rotation: { label: 'on call for trains', away: 0.3 },
    levels: [
      L('trainee', 'Conductor Trainee', 3, { years: 1 }),
      L('conductor', 'Conductor', 5, { req: { credentials: ['conductorCert'] } }),
      L('engineer', 'Locomotive Engineer', 6, { req: { credentials: ['locomotiveEngineer'] } }),
      L('senior', 'Senior Locomotive Engineer', 7, { track: 'ic' }),
      L('trainmaster', 'Trainmaster', 6, { track: 'mgmt', abilities: ['supervise', 'command'], reports: 60 }),
      L('roadForeman', 'Road Foreman of Engines', 7, { track: 'mgmt', req: { credentials: ['locomotiveEngineer'] }, abilities: ['supervise', 'hire'], reports: 120 }),
      L('superintendent', 'Division Superintendent', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 1500 }),
    ],
  },
  schoolBus: {
    id: 'schoolBus', name: 'School Transportation', icon: '🚸', sector: 'municipal', exam: null, background: 'strict', payMultiplier: 0.85, minAge: 21,
    sizes: { small: 2, medium: 3, large: 2 },
    union: { chance: 0.5, name: 'School Bus Drivers Local', strike: true },
    benefits: { pension: 'municipal' },
    employerName: (city) => `${city} Public Schools — Transportation`,
    entry: { credentials: ['driverLicense'] },
    levels: [
      L('trainee', 'School Bus Driver Trainee', 1, { years: 1 }),
      L('driver', 'School Bus Driver', 2, { req: { credentials: ['schoolBusEndorsement'] } }),
      L('lead', 'Lead Driver & Trainer', 3, { track: 'ic' }),
      L('router', 'Routing Coordinator', 4, { track: 'ic' }),
      L('supervisor', 'Transportation Supervisor', 4, { track: 'mgmt', abilities: ['supervise'], reports: 25 }),
      L('director', 'Director of Student Transportation', 6, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'hire', 'budget'], reports: 150 }),
    ],
  },
};
