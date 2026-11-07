/**
 * Federal service: agencies, political stability, shutdowns and furloughs,
 * bureaucratic event popups, senior policy decisions, Foreign Service
 * postings (hardship/danger pay, embassy housing, diplomatic immunity) and
 * National Park Service duty stations (rural, housing provided).
 *
 * state.publicService.federal = { stability: 0–100, shutdown: bool }
 */
import { L } from '../../career/Ladder.js';

const FED = { sizes: { large: 1, enterprise: 1 } };

const careers = {
  regulatory: {
    ...FED, id: 'regulatory', name: 'Federal Regulatory Agency', icon: '📊', sector: 'federal', payMultiplier: 1.0, minAge: 21, background: 'strict', exam: 'federal',
    union: { chance: 0.4, name: 'National Treasury Employees Union', strike: false },
    employers: ['Office of the Comptroller of the Currency', 'Securities and Exchange Commission', 'Environmental Protection Agency', 'Federal Trade Commission'],
    entry: { education: { level: 'bachelor' } },
    valued: ['cpa', 'cgfm'],
    ladder: [
      ['trainee', 'Examiner Trainee', 3, { req: { clearance: 'publicTrust' }, abilities: ['inspect'] }],
      ['examiner', 'Regulatory Examiner', 4, { req: { clearance: 'publicTrust' }, abilities: ['inspect', 'audit'] }],
      ['senior', 'Senior Examiner', 5, { abilities: ['inspect', 'audit'] }],
      ['commissioned', 'Commissioned Examiner', 6, { track: 'ic', abilities: ['inspect', 'audit', 'sign'] }],
      ['expert', 'Senior Policy Expert', 7, { track: 'ic', minSize: 'enterprise', abilities: ['audit', 'policy'] }],
      ['supervisory', 'Supervisory Examiner', 6, { track: 'mgmt', abilities: ['supervise', 'inspect', 'sign'], reports: 8 }],
      ['branchChief', 'Branch Chief', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 30 }],
      ['deputy', 'Deputy Administrator', 8, { track: 'mgmt', req: { clearance: 'secret' }, abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 400 }],
      ['administrator', 'Department Administrator', 9, { track: 'mgmt', minSize: 'enterprise', req: { clearance: 'secret' }, abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 3000 }],
    ],
  },
  foreignService: {
    ...FED, id: 'foreignService', name: 'U.S. Foreign Service', icon: '🌐', sector: 'federal', payMultiplier: 1.0, minAge: 21, background: 'strict', exam: 'foreignService',
    benefits: { pension: 'fersSpecial' },
    mandatoryRetirement: 65,
    employers: ['U.S. Department of State'],
    entry: { education: { level: 'bachelor' } },
    valued: ['languageProficiency'],
    postings: true,
    ladder: [
      ['fs6', 'Foreign Service Officer (FS-6)', 4, { req: { clearance: 'topSecret' }, abilities: ['diplomatic', 'classified'] }],
      ['fs4', 'Second Secretary (FS-4)', 5, { abilities: ['diplomatic', 'classified'] }],
      ['fs3', 'First Secretary (FS-3)', 6, { abilities: ['diplomatic', 'classified', 'sign'] }],
      ['fs2', 'Political Counselor (FS-2)', 7, { track: 'ic', req: { credentials: ['languageProficiency'] }, abilities: ['diplomatic', 'classified', 'policy'] }],
      ['fs1', 'Minister-Counselor (FS-1)', 8, { track: 'ic', abilities: ['diplomatic', 'classified', 'policy'] }],
      ['consul', 'Consul General', 7, { track: 'mgmt', abilities: ['diplomatic', 'classified', 'supervise', 'sign'], reports: 25 }],
      ['dcm', 'Deputy Chief of Mission', 8, { track: 'mgmt', abilities: ['diplomatic', 'classified', 'supervise', 'budget', 'delegate'], reports: 150 }],
      ['ambassador', 'Ambassador', 9, { track: 'mgmt', abilities: ['diplomatic', 'classified', 'supervise', 'budget', 'delegate', 'exec', 'policy'], reports: 400 }],
    ],
  },
  oig: {
    ...FED, id: 'oig', name: 'Office of Inspector General', icon: '🔍', sector: 'federal', payMultiplier: 1.0, minAge: 21, background: 'strict', exam: 'federal',
    // Criminal investigators are federal law-enforcement officers: LEO retirement, mandatory at 57.
    benefits: { pension: 'fersSpecial' },
    mandatoryRetirement: 57,
    employers: ['Department of Defense OIG', 'Department of Health & Human Services OIG', 'Department of Homeland Security OIG'],
    entry: { education: { level: 'bachelor' } },
    valued: ['cpa', 'cissp', 'cgfm'],
    ladder: [
      ['auditor', 'Auditor', 4, { req: { clearance: 'secret' }, abilities: ['audit', 'classified'] }],
      ['senior', 'Senior Auditor', 5, { abilities: ['audit', 'classified'] }],
      ['investigator', 'Criminal Investigator', 5, { track: 'ic', req: { credentials: ['fletc'] }, abilities: ['audit', 'arrest', 'classified'] }],
      ['specialAgent', 'Senior Special Agent', 6, { track: 'ic', abilities: ['audit', 'arrest', 'classified'] }],
      ['supervisory', 'Supervisory Auditor', 6, { track: 'mgmt', abilities: ['audit', 'supervise', 'classified'], reports: 10 }],
      ['aig', 'Assistant Inspector General', 8, { track: 'mgmt', req: { clearance: 'topSecret' }, abilities: ['audit', 'supervise', 'budget', 'delegate', 'policy', 'classified'], reports: 150 }],
      ['ig', 'Inspector General', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['audit', 'supervise', 'budget', 'delegate', 'exec', 'policy', 'classified'], reports: 1500 }],
    ],
  },
  parkService: {
    ...FED, id: 'parkService', name: 'National Park Service', icon: '🌲', sector: 'federal', payMultiplier: 0.92, minAge: 18, background: 'standard', exam: 'federal',
    benefits: { housing: true },
    dutyStation: 'rural',
    employers: ['Glacier National Park', 'Yellowstone National Park', 'Olympic National Park', 'Rocky Mountain National Park'],
    entry: {},
    valued: ['wfr', 'landNav', 'ropeRescue', 'swiftwater', 'emt'],
    ladder: [
      ['seasonal', 'Seasonal Park Ranger', 2],
      ['ranger', 'Park Ranger', 4, { entry: true, req: { education: { level: 'bachelor' } } }],
      ['interp', 'Lead Interpretive Ranger', 5, { track: 'ic' }],
      ['leRanger', 'Law Enforcement Ranger', 5, { track: 'ic', req: { credentials: ['fletc'] }, abilities: ['arrest'] }],
      ['isb', 'Special Agent (ISB)', 6, { track: 'ic', abilities: ['arrest', 'audit'] }],
      ['district', 'District Ranger', 6, { track: 'mgmt', abilities: ['supervise', 'command'], reports: 15 }],
      ['chief', 'Chief Ranger', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'command'], reports: 50 }],
      ['superintendent', 'Park Superintendent', 8, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 300 }],
    ],
  },
  intelligence: {
    ...FED, id: 'intelligence', name: 'Intelligence Analysis (CIA · DIA · NGA)', icon: '🛰️', sector: 'federal', payMultiplier: 1.05, minAge: 21, background: 'strict', exam: 'federal',
    employers: ['Central Intelligence Agency — Directorate of Analysis', 'Defense Intelligence Agency', 'National Geospatial-Intelligence Agency', 'National Counterterrorism Center'],
    entry: { education: { level: 'bachelor' }, smarts: 55 },
    valued: ['languageProficiency', 'cissp', 'awsCert'],
    ladder: [
      ['analyst', 'Intelligence Analyst', 5, { req: { clearance: 'topSecret' }, abilities: ['classified'] }],
      ['senior', 'Senior Analyst', 6, { abilities: ['classified'] }],
      ['sio', 'Senior Intelligence Officer', 7, { track: 'ic', abilities: ['classified', 'policy'] }],
      ['nio', 'National Intelligence Officer', 8, { track: 'ic', minSize: 'enterprise', abilities: ['classified', 'policy'] }],
      ['branchChief', 'Branch Chief', 7, { track: 'mgmt', abilities: ['classified', 'supervise', 'hire'], reports: 12 }],
      ['divisionChief', 'Division Chief', 8, { track: 'mgmt', abilities: ['classified', 'supervise', 'budget', 'delegate'], reports: 90 }],
      ['deputyDirector', 'Deputy Director', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['classified', 'supervise', 'budget', 'delegate', 'exec', 'policy'], reports: 1200 }],
    ],
  },
};

export default { id: 'careers-federal', version: 1, careers };
