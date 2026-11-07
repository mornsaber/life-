/**
 * Municipal government: city-employed professions (public safety, city
 * administration, public works, planning), the city's budget and approval
 * rating, and municipal workplace events.
 *
 * state.publicService.city = { name, approval, fiscalHealth } while you work
 * for a city. Department heads and the City Manager make annual budget
 * choices; everyone experiences the consequences through training budgets,
 * staffing and community approval.
 */
import { L, detectiveRanks } from '../../career/Ladder.js';

export const PD = (city) => `${city} Police Department`;

const careers = {
  police: {
    id: 'police', name: 'Police Department', icon: '🚓', sector: 'municipal', payMultiplier: 0.9, minAge: 21, background: 'strict', exam: 'publicSafety',
    union: { chance: 0.85, name: 'Fraternal Order of Police Lodge 7', strike: false },
    benefits: { pension: 'publicSafety', ssCovered: false },
    employerName: PD,
    entry: { education: { level: 'highschool' }, credentials: ['driverLicense'], fitness: 45 },
    valued: ['postReserve', 'cit', 'emt', 'fto'],
    levels: [
      L('recruit', 'Police Recruit', 3, { years: 1 }),
      L('officer', 'Police Officer', 4, { entry: true, req: { credentials: ['post'] }, abilities: ['arrest'], years: 3 }),
      L('senior', 'Senior Patrol Officer', 5, { req: { credentials: ['post'] }, abilities: ['arrest'] }),
      L('detective', 'Detective', 5, { track: 'ic', abilities: ['arrest', 'audit'] }),
      L('seniorDetective', 'Senior Detective', 6, { track: 'ic', minSize: 'medium', abilities: ['arrest', 'audit'] }),
      ...detectiveRanks([['detSergeant', 'Detective Sergeant', 6, 'medium', 8], ['detLieutenant', 'Detective Lieutenant', 7, 'large', 30], ['detCaptain', 'Detective Captain (Detective Bureau)', 8, 'enterprise', 120]]),
      L('sergeant', 'Sergeant', 5, { track: 'mgmt', req: { credentials: ['fto'] }, abilities: ['arrest', 'supervise'], reports: 8 }),
      L('lieutenant', 'Lieutenant', 6, { track: 'mgmt', req: { credentials: ['supervisorCourse'] }, abilities: ['arrest', 'supervise', 'command'], reports: 25 }),
      L('captain', 'Captain', 7, { track: 'mgmt', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'command'], reports: 70 }),
      L('deputyChief', 'Deputy Chief', 8, { track: 'mgmt', minSize: 'large', req: { credentials: ['commandCollege'] }, abilities: ['supervise', 'budget', 'delegate', 'command'], reports: 300 }),
      L('chief', 'Chief of Police', 9, { track: 'mgmt', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'policy'], reports: 600 }),
    ],
  },
  fire: {
    id: 'fire', name: 'Fire Department', icon: '🚒', sector: 'municipal', payMultiplier: 0.98, minAge: 18, background: 'strict', exam: 'publicSafety',
    union: { chance: 0.9, name: 'IAFF Local 22', strike: false },
    benefits: { pension: 'publicSafety', ssCovered: false },
    employerName: (city) => `${city} Fire Department`,
    entry: { education: { level: 'highschool' }, credentials: ['driverLicense'], fitness: 50 },
    valued: ['ff1', 'ff2', 'emt', 'hazmatOps', 'paramedic'],
    ladder: [
      ['recruit', 'Firefighter Recruit', 3, { years: 1 }],
      ['firefighter', 'Firefighter', 4, { entry: true, req: { credentials: ['ff2', 'emt'] } }],
      ['engineer', 'Driver/Engineer', 4, { req: { credentials: ['driverOperator'] } }],
      ['inspector', 'Fire Inspector', 5, { track: 'ic', req: { credentials: ['fireInspector'] }, abilities: ['inspect'] }],
      ['investigator', 'Fire Investigator', 6, { track: 'ic', minSize: 'medium', abilities: ['inspect', 'arrest'] }],
      ['lieutenant', 'Fire Lieutenant', 5, { track: 'mgmt', req: { credentials: ['fireOfficer1'] }, abilities: ['supervise', 'command'], reports: 4 }],
      ['captain', 'Fire Captain', 6, { track: 'mgmt', req: { credentials: ['fireOfficer2'] }, abilities: ['supervise', 'command'], reports: 12 }],
      ['battalion', 'Battalion Chief', 7, { track: 'mgmt', req: { credentials: ['ics300'] }, abilities: ['supervise', 'budget', 'command'], reports: 45 }],
      ['deputyChief', 'Deputy Fire Chief', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'command'], reports: 200 }],
      ['chief', 'Fire Chief', 9, { track: 'mgmt', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'policy', 'command'], reports: 400 }],
    ],
  },
  ems: {
    id: 'ems', name: 'Public EMS (City / County)', icon: '🚑', sector: 'municipal', payMultiplier: 0.95, minAge: 18, background: 'strict', exam: 'publicSafety',
    union: { chance: 0.5, name: 'AFSCME EMS Local 2507', strike: false },
    benefits: { pension: 'municipal' },
    employerName: (city) => `${city} EMS`,
    entry: { credentials: ['driverLicense'] },
    valued: ['paramedic', 'hazmatOps', 'cit', 'acls', 'ccp'],
    ladder: [
      ['emt', 'EMT', 2, { req: { credentials: ['emt'] } }],
      ['paramedic', 'Paramedic', 4, { entry: true, req: { credentials: ['paramedic'] }, abilities: ['prescribe'] }],
      ['criticalCare', 'Critical Care Paramedic', 5, { track: 'ic', req: { credentials: ['ccp'] }, abilities: ['prescribe'] }],
      ['flight', 'Flight Paramedic', 6, { track: 'ic', minSize: 'large', req: { credentials: ['flightParamedic'] }, abilities: ['prescribe'], airMedical: true }],
      ['fto', 'Field Training Officer', 5, { track: 'mgmt', abilities: ['supervise'], reports: 4 }],
      ['supervisor', 'EMS Supervisor', 5, { track: 'mgmt', abilities: ['supervise', 'command'], reports: 18 }],
      ['captain', 'EMS Captain', 6, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'budget', 'command'], reports: 50 }],
      ['deputy', 'Deputy EMS Chief', 7, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'budget', 'command', 'delegate'], reports: 150 }],
      ['chief', 'EMS Chief', 8, { track: 'mgmt', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'policy'], reports: 200 }],
    ],
  },
  municipalAdmin: {
    id: 'municipalAdmin', name: 'City Administration', icon: '🏛️', sector: 'municipal', payMultiplier: 0.95, minAge: 18, background: 'standard', exam: 'municipal',
    union: { chance: 0.5, name: 'AFSCME Council 31', strike: true },
    benefits: { pension: 'municipal' },
    employerName: (city) => `City of ${city}`,
    entry: { education: { level: 'highschool' } },
    valued: ['cgfm', 'pmp'],
    ladder: [
      ['clerk', 'Records Clerk', 2],
      ['deputyClerk', 'Deputy City Clerk', 3],
      ['cityClerk', 'City Clerk', 5, { abilities: ['sign'] }],
      ['analyst', 'Budget Analyst', 5, { track: 'ic', entry: true, req: { education: { level: 'bachelor' } }, abilities: ['audit'] }],
      ['seniorAnalyst', 'Senior Budget Analyst', 6, { track: 'ic', abilities: ['audit', 'budget'] }],
      ['financeDirector', 'Finance Director', 7, { track: 'ic', minSize: 'medium', req: { credentials: ['cgfm'] }, abilities: ['budget', 'sign'] }],
      ['manager', 'Department Manager', 6, { track: 'mgmt', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget'], reports: 15 }],
      ['acm', 'Assistant City Manager', 7, { track: 'mgmt', minSize: 'medium', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'budget', 'delegate', 'sign'], reports: 120 }],
      ['cityManager', 'City Manager', 9, { track: 'mgmt', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 900 }],
    ],
  },
  publicWorks: {
    id: 'publicWorks', name: 'Public Works', icon: '🚧', sector: 'municipal', payMultiplier: 0.97, minAge: 18, background: 'standard', exam: 'municipal',
    union: { chance: 0.6, name: 'AFSCME Local 1001', strike: true },
    benefits: { pension: 'municipal' },
    employerName: (city) => `${city} Department of Public Works`,
    entry: { education: { level: 'highschool' }, credentials: ['driverLicense'] },
    valued: ['oshaSafety', 'buildingInspector', 'cdlA', 'pe'],
    ladder: [
      ['maintenance', 'Maintenance Worker', 2],
      ['operator', 'Heavy Equipment Operator', 3],
      ['inspector', 'Public Works Inspector', 4, { entry: true, req: { credentials: ['buildingInspector'] }, abilities: ['inspect'] }],
      ['seniorInspector', 'Senior Inspector', 5, { track: 'ic', abilities: ['inspect'] }],
      ['cbo', 'Chief Building Official', 6, { track: 'ic', minSize: 'medium', abilities: ['inspect', 'sign'] }],
      ['cityEngineer', 'City Engineer', 7, { track: 'ic', entry: true, req: { credentials: ['pe'] }, abilities: ['inspect', 'sign'] }],
      ['supervisor', 'Public Works Supervisor', 5, { track: 'mgmt', abilities: ['supervise'], reports: 12 }],
      ['superintendent', 'Public Works Superintendent', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 40 }],
      ['director', 'Director of Public Works', 8, { track: 'mgmt', minSize: 'medium', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 250 }],
    ],
  },
  /**
   * Council inspectors: building inspection, code enforcement and environmental health —
   * the people who sign off a new house, close a filthy kitchen and chase an illegal
   * extension. Abroad: building control surveyors, environmental health officers,
   * the Ordnungsamt, a council's compliance team.
   */
  councilInspector: {
    id: 'councilInspector', name: 'Inspections & Code Enforcement', icon: '📋', sector: 'municipal', payMultiplier: 0.95, minAge: 19, background: 'standard', exam: 'municipal',
    benefits: { pension: 'municipal' },
    employerName: (city) => `${city} Department of Code Enforcement & Inspections`,
    entry: { education: { level: 'highschool' }, credentials: ['driverLicense'] },
    valued: ['buildingInspector', 'fireInspector', 'oshaSafety'],
    ladder: [
      ['codeOfficer', 'Code Enforcement Officer', 3, { entry: true, abilities: ['inspect'] }],
      ['inspector', 'Building Inspector', 4, { entry: true, req: { credentials: ['buildingInspector'] }, abilities: ['inspect'] }],
      ['senior', 'Senior Inspector', 5, { track: 'ic', abilities: ['inspect', 'sign'] }],
      ['plansExaminer', 'Plans Examiner', 6, { track: 'ic', minSize: 'medium', abilities: ['inspect', 'sign'] }],
      ['supervisor', 'Inspections Supervisor', 5, { track: 'mgmt', abilities: ['inspect', 'supervise'], reports: 8 }],
      ['manager', 'Code Enforcement Manager', 6, { track: 'mgmt', minSize: 'medium', abilities: ['inspect', 'supervise', 'hire', 'budget'], reports: 20 }],
      ['buildingOfficial', 'Building Official', 7, { track: 'mgmt', req: { credentials: ['buildingInspector'] }, abilities: ['inspect', 'supervise', 'hire', 'budget', 'delegate', 'sign', 'policy'], reports: 45 }],
    ],
  },
  planning: {
    id: 'planning', name: 'Urban Planning', icon: '🗺️', sector: 'municipal', payMultiplier: 1.0, minAge: 21, background: 'standard', exam: 'municipal',
    benefits: { pension: 'municipal' },
    employerName: (city) => `${city} Planning Department`,
    entry: { education: { level: 'associate' } },
    valued: ['aicp'],
    ladder: [
      ['tech', 'Planning Technician', 3],
      ['planner1', 'Planner I', 4, { entry: true, req: { education: { level: 'bachelor' } } }],
      ['planner2', 'Planner II', 5],
      ['senior', 'Senior Planner', 6, { track: 'ic' }],
      ['principal', 'Principal Planner', 7, { track: 'ic', minSize: 'large', req: { credentials: ['aicp'] } }],
      ['manager', 'Planning Manager', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'sign'], reports: 10 }],
      ['director', 'Planning Director', 8, { track: 'mgmt', minSize: 'medium', req: { credentials: ['aicp'] }, abilities: ['supervise', 'budget', 'delegate', 'sign', 'policy'], reports: 40 }],
    ],
  },
};

export default { id: 'careers-municipal', version: 1, careers };
