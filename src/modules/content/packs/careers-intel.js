/**
 * The Intelligence Community's operational careers (analysts live in
 * FederalAgencies as `intelligence`).
 *
 * Real-world rules worth knowing:
 *   - Every job needs a TS/SCI clearance and, at CIA and NSA, a full-scope
 *     polygraph. Conditional offers are rescinded for failing either.
 *   - CIA operations officers train at "the Farm", then serve overseas under
 *     official cover (diplomatic immunity) or non-official cover (a business
 *     identity: better pay, no immunity if caught).
 *   - New clandestine officers are usually hired in their twenties or early
 *     thirties.
 *   - NSA cryptologists, language analysts and SIGINT developers come in
 *     through development programs; technical directors are the senior
 *     experts.
 */
import { L } from '../../career/Ladder.js';

export const CLANDESTINE_MAX_AGE = 35;

export const clandestineGate = (state) => (state.character.age > CLANDESTINE_MAX_AGE && !state.career.job?.professionId?.startsWith('caseOfficer')
  ? { ok: false, reason: `The Clandestine Service hires officers by age ${CLANDESTINE_MAX_AGE}` }
  : { ok: true });


export const IC_PROFESSIONS = ['caseOfficer', 'sigint', 'intelligence'];

const FED = { sizes: { large: 1, enterprise: 1 } };

const careers = {
  caseOfficer: {
    ...FED, id: 'caseOfficer', name: 'Clandestine Service (CIA Operations)', icon: '🕶️', sector: 'federal', payMultiplier: 1.12, minAge: 22, background: 'strict',
    employers: ['Central Intelligence Agency — Directorate of Operations'],
    entry: { education: { level: 'bachelor' }, smarts: 60 },
    eligible: clandestineGate,
    valued: ['languageProficiency'],
    ladder: [
      ['trainee', 'Clandestine Service Trainee (The Farm)', 5, { years: 1, req: { clearance: 'topSecret' }, abilities: ['classified'] }],
      ['officer', 'Operations Officer', 7, { abilities: ['classified'] }],
      ['senior', 'Senior Operations Officer', 8, { track: 'ic', abilities: ['classified'] }],
      ['dcos', 'Deputy Chief of Station', 8, { track: 'mgmt', abilities: ['classified', 'supervise'], reports: 10 }],
      ['cos', 'Chief of Station', 9, { track: 'mgmt', abilities: ['classified', 'supervise', 'hire', 'budget'], reports: 40 }],
      ['divisionChief', 'Chief, Operations Division', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['classified', 'supervise', 'budget', 'delegate', 'policy'], reports: 600 }],
    ],
  },
  sigint: {
    ...FED, id: 'sigint', name: 'Signals Intelligence (NSA)', icon: '📡', sector: 'federal', payMultiplier: 1.08, minAge: 21, background: 'strict',
    employers: ['National Security Agency — Signals Intelligence Directorate', 'National Security Agency — Cybersecurity Directorate'],
    entry: { education: { level: 'bachelor' }, smarts: 60 },
    valued: ['cissp', 'securityPlus', 'languageProficiency'],
    ladder: [
      ['intern', 'SIGINT Development Program Intern', 5, { years: 1, req: { clearance: 'topSecret' }, abilities: ['classified'] }],
      ['analyst', 'Signals Intelligence Analyst', 6, { abilities: ['classified'] }],
      ['senior', 'Senior SIGINT Analyst', 7, { abilities: ['classified'] }],
      ['technicalDirector', 'Technical Director', 9, { track: 'ic', abilities: ['classified', 'policy'] }],
      ['branchChief', 'Branch Chief', 8, { track: 'mgmt', abilities: ['classified', 'supervise', 'hire'], reports: 25 }],
      ['deputyChief', 'Deputy Chief, Operations', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['classified', 'supervise', 'budget', 'delegate'], reports: 400 }],
      ['director', 'Director of Operations', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['classified', 'supervise', 'budget', 'delegate', 'exec', 'policy'], reports: 4000 }],
    ],
  },
};

export default { id: 'careers-intel', version: 1, careers };
