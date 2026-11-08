/**
 * Security, policing and corrections beyond the city police department:
 * private security and executive protection, private ("special") police,
 * the TSA, sheriff's offices, county jails, the Federal Bureau of Prisons,
 * private prison companies, probation and parole, 911 dispatch, private
 * investigators and bail agents. The elected Sheriff and District Attorney
 * are offices (politics), reached from these ladders.
 *
 * Where it's real:
 *   - Railroad police are commissioned in every state (federal law).
 *     Private campus, hospital and company police with full arrest powers
 *     exist only in some states (Texas, Illinois, Ohio, Florida, New York,
 *     D.C.); elsewhere the only private police are the railroads'.
 *   - Commercial bail is outlawed in Illinois and D.C., so no bail agents there.
 *   - Private prisons hold a large share of inmates in Montana, and some in
 *     Texas, Florida, Colorado and Ohio.
 */
import { L, detectiveRanks } from '../../career/Ladder.js';
import { currentCountry } from '../../../core/Locale.js';
import { stateIdOf } from '../../life/Regions.js';

/** States without commercial bail bonds. */
export const NO_BAIL_STATES = ['IL', 'DC'];
export const PRIVATE_POLICE_STATE_NAMES = ['Texas', 'Illinois', 'Ohio', 'Florida', 'New York', 'District of Columbia'];

const LOCAL = { sector: 'municipal', background: 'strict', exam: 'publicSafety' };
const FED = { sector: 'federal', sizes: { large: 1, enterprise: 1 }, background: 'strict', exam: 'federal' };

const careers = {
  privateSecurity: {
    id: 'privateSecurity', name: 'Private Security', icon: '🛡️', sector: 'private', payMultiplier: 0.78, minAge: 18, sizes: { small: 2, medium: 3, large: 3, enterprise: 2 }, background: 'standard',
    union: { chance: 0.25, name: 'SEIU Security Officers United', strike: true },
    employers: ['Sentinel Guard Services', 'Ironclad Security', 'Allied Protective Group', 'Keystone Protection'],
    valued: ['postReserve', 'cit', 'emt'],
    ladder: [
      ['trainee', 'Security Officer Trainee', 1, { years: 1 }],
      ['officer', 'Security Officer', 1, { req: { credentials: ['guardCard'] } }],
      ['armed', 'Armed Security Officer', 2, { req: { credentials: ['armedGuard'] } }],
      ['lossPrevention', 'Loss Prevention Investigator', 3, { track: 'ic', abilities: ['audit'] }],
      ['executive', 'Executive Protection Agent', 5, { track: 'ic', minSize: 'large', req: { credentials: ['execProtection'] } }],
      ['lead', 'Lead Security Officer', 2, { req: { credentials: ['guardCard'] } }],
      ['supervisor', 'Security Shift Supervisor', 2, { track: 'mgmt', abilities: ['supervise'], reports: 12 }],
      ['shiftLieutenant', 'Security Lieutenant', 3, { track: 'mgmt', abilities: ['supervise'], reports: 25 }],
      ['siteManager', 'Security Site Manager', 4, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 40 }],
      ['director', 'Director of Corporate Security', 7, { track: 'mgmt', minSize: 'large', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 300 }],
      ['cso', 'Chief Security Officer', 9, { track: 'mgmt', minSize: 'enterprise', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 2000 }],
    ],
  },

  privatePolice: {
    id: 'privatePolice', name: 'Private & Special Police', icon: '🚨', sector: 'private', payMultiplier: 0.95, minAge: 21, sizes: { medium: 2, large: 3, enterprise: 2 }, background: 'strict',
    union: { chance: 0.4, name: 'Fraternal Order of Police — Special Police Lodge', strike: false },
    // Railroads everywhere; campus, hospital and company police only where state law allows.
    employerName: (city, rng, stateName) => {
      // Abroad: port, airport-estate and campus constabularies rather than American railroad police.
      if (currentCountry() !== 'US') return rng.pick([`${city} Port Police`, `${city} University Constabulary`, `${city} Airport Estate Police`, `${city} Parks Police`]);
      const railroad = `${rng.pick(['Union Continental', 'Great Plains & Pacific', 'Atlantic Coast Line'])} Railroad Police`;
      if (!PRIVATE_POLICE_STATE_NAMES.includes(stateName) || rng.chance(0.3)) return railroad;
      return rng.pick([`${city} University Police Department`, `${city} Medical Center Police`, `${city} Private Hospital System Police`]);
    },
    entry: { education: { level: 'highschool' }, credentials: ['driverLicense'], fitness: 45 },
    valued: ['postReserve', 'cit', 'emt'],
    ladder: [
      ['recruit', 'Special Police Recruit', 3, { years: 1 }],
      ['officer', 'Special Police Officer', 4, { entry: true, req: { credentials: ['post'] }, abilities: ['arrest'] }],
      ['senior', 'Senior Officer', 4, { abilities: ['arrest'] }],
      ['corporal', 'Corporal', 4, { abilities: ['arrest'] }],
      ['agent', 'Special Agent (Investigations)', 6, { track: 'ic', minSize: 'large', abilities: ['arrest', 'audit'] }],
      ['sergeant', 'Sergeant', 5, { track: 'mgmt', abilities: ['arrest', 'supervise'], reports: 8 }],
      ['lieutenant', 'Lieutenant', 6, { track: 'mgmt', abilities: ['arrest', 'supervise', 'command'], reports: 25 }],
      ['captain', 'Captain', 7, { track: 'mgmt', abilities: ['supervise', 'budget', 'arrest'], reports: 60 }],
      ['deputyChief', 'Deputy Chief', 7, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'budget', 'delegate', 'arrest'], reports: 150 }],
      ['chief', 'Chief of Police', 8, { track: 'mgmt', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'delegate', 'policy'], reports: 120 }],
    ],
  },

  tsa: {
    ...FED, id: 'tsa', name: 'Transportation Security Administration', icon: '🛄', payMultiplier: 0.9, minAge: 18,
    union: { chance: 0.6, name: 'AFGE TSA Council 100', strike: false },
    employers: ['TSA — International Airport', 'TSA — Regional Airport', 'TSA — Federal Air Marshal Service'],
    entry: { education: { level: 'highschool' } },
    ladder: [
      ['trainee', 'TSO Trainee', 2, { years: 1, req: { clearance: 'publicTrust' } }],
      ['officer', 'Transportation Security Officer', 3, { req: { credentials: ['tsaCert'] } }],
      ['lead', 'Lead TSO', 4],
      ['bdo', 'Behavior Detection Officer', 5, { track: 'ic' }],
      ['inspector', 'Transportation Security Inspector', 6, { track: 'ic', abilities: ['inspect'] }],
      ['airMarshal', 'Federal Air Marshal', 7, { track: 'ic', minSize: 'enterprise', req: { credentials: ['fletc'], clearance: 'secret' }, abilities: ['arrest'] }],
      ['supervisor', 'Supervisory TSO', 5, { track: 'mgmt', abilities: ['supervise'], reports: 15 }],
      ['manager', 'Transportation Security Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 120 }],
      ['fsd', 'Federal Security Director', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'budget', 'delegate', 'exec'], reports: 1500 }],
    ],
  },

  sheriff: {
    ...LOCAL, id: 'sheriff', name: 'Sheriff\'s Office', icon: '⭐', payMultiplier: 0.88, minAge: 21,
    union: { chance: 0.7, name: 'Deputy Sheriffs\' Association', strike: false },
    benefits: { pension: 'publicSafety', ssCovered: false },
    employerName: (city) => `${city} County Sheriff's Office`,
    entry: { education: { level: 'highschool' }, credentials: ['driverLicense'], fitness: 45 },
    valued: ['postReserve', 'correctionsAcademy', 'cit', 'emt'],
    levels: [
      L('recruit', 'Deputy Recruit', 3, { years: 1 }),
      L('deputy', 'Deputy Sheriff', 4, { entry: true, req: { credentials: ['post'] }, abilities: ['arrest', 'custody'], years: 3 }),
      L('court', 'Court Security Deputy', 4, { abilities: ['arrest', 'custody'] }),
      L('investigator', 'Sheriff\'s Investigator', 6, { track: 'ic', abilities: ['arrest', 'audit'] }),
      ...detectiveRanks([['detSergeant', 'Investigations Sergeant', 6, 'medium', 8], ['detLieutenant', 'Investigations Lieutenant', 7, 'large', 30]]),
      L('sergeant', 'Sheriff\'s Sergeant', 5, { track: 'mgmt', req: { credentials: ['fto'] }, abilities: ['arrest', 'supervise'], reports: 10 }),
      L('lieutenant', 'Sheriff\'s Lieutenant', 6, { track: 'mgmt', req: { credentials: ['supervisorCourse'] }, abilities: ['arrest', 'supervise', 'command'], reports: 30 }),
      L('captain', 'Sheriff\'s Captain', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'command'], reports: 90 }),
      L('undersheriff', 'Undersheriff', 8, { track: 'mgmt', minSize: 'medium', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'budget', 'delegate', 'command'], reports: 400 }),
    ],
  },

  jail: {
    ...LOCAL, id: 'jail', name: 'County Jail', icon: '🔒', payMultiplier: 0.88, minAge: 18,
    union: { chance: 0.6, name: 'AFSCME Detention Officers Local', strike: false },
    benefits: { pension: 'publicSafety', ssCovered: true },
    employerName: (city) => `${city} County Detention Center`,
    entry: { education: { level: 'highschool' }, fitness: 35 },
    valued: ['cit', 'emt'],
    ladder: [
      ['trainee', 'Detention Officer Trainee', 2, { years: 1 }],
      ['officer', 'Detention Officer', 3, { req: { credentials: ['correctionsAcademy'] }, abilities: ['custody'] }],
      ['senior', 'Senior Detention Officer', 4, { abilities: ['custody'] }],
      ['classification', 'Classification Specialist', 4, { track: 'ic', abilities: ['custody'] }],
      ['reentry', 'Reentry Program Coordinator', 5, { track: 'ic', req: { education: { level: 'bachelor' } } }],
      ['sergeant', 'Detention Sergeant', 4, { track: 'mgmt', abilities: ['custody', 'supervise'], reports: 12 }],
      ['lieutenant', 'Detention Lieutenant', 5, { track: 'mgmt', abilities: ['custody', 'supervise', 'command'], reports: 40 }],
      ['commander', 'Jail Commander', 7, { track: 'mgmt', abilities: ['custody', 'supervise', 'hire', 'budget'], reports: 150 }],
      ['administrator', 'Jail Administrator', 8, { track: 'mgmt', minSize: 'large', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'delegate', 'sign'], reports: 600 }],
    ],
  },

  federalPrisons: {
    ...FED, id: 'federalPrisons', name: 'Federal Bureau of Prisons', icon: '🦅', payMultiplier: 1.05, minAge: 21,
    union: { chance: 0.8, name: 'AFGE Council of Prison Locals', strike: false },
    benefits: { pension: 'fers' },
    employers: ['FCI Englewood', 'USP Atwater', 'FCI Danbury', 'FMC Fort Worth', 'USP Florence ADMAX'],
    entry: { education: { level: 'highschool' }, fitness: 40 },
    ladder: [
      ['trainee', 'Correctional Officer Trainee (BOP)', 4, { years: 1, req: { clearance: 'publicTrust' } }],
      ['officer', 'Correctional Officer (BOP)', 5, { req: { credentials: ['fletc'] }, abilities: ['custody'] }],
      ['senior', 'Senior Officer Specialist', 6, { abilities: ['custody'] }],
      ['caseManager', 'Case Manager', 7, { track: 'ic', req: { education: { level: 'bachelor' } }, abilities: ['custody'] }],
      ['sis', 'Special Investigative Services Technician', 7, { track: 'ic', abilities: ['custody', 'audit'] }],
      ['lieutenant', 'Lieutenant (BOP)', 7, { track: 'mgmt', abilities: ['custody', 'supervise', 'command'], reports: 40 }],
      ['captain', 'Captain (BOP)', 8, { track: 'mgmt', abilities: ['custody', 'supervise', 'budget', 'command'], reports: 200 }],
      ['associateWarden', 'Associate Warden', 8, { track: 'mgmt', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 300 }],
      ['warden', 'Warden', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate', 'sign', 'exec'], reports: 600 }],
      ['regional', 'Regional Director', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'budget', 'delegate', 'exec', 'policy'], reports: 8000 }],
    ],
  },

  privatePrisons: {
    id: 'privatePrisons', name: 'Private Corrections', icon: '🏢', sector: 'private', payMultiplier: 0.78, minAge: 18, sizes: { medium: 2, large: 3, enterprise: 2 }, background: 'standard',
    union: { chance: 0.1, name: 'Correctional Workers United', strike: true },
    employers: ['Corrective Solutions Group', 'Ameri-Detention Corp', 'Liberty Correctional Services', 'Horizon Detention Partners'],
    entry: { education: { level: 'highschool' } },
    ladder: [
      ['trainee', 'Correctional Officer Trainee', 1, { years: 1 }],
      ['officer', 'Correctional Officer', 2, { req: { credentials: ['correctionsAcademy'] }, abilities: ['custody'] }],
      ['senior', 'Senior Correctional Officer', 3, { abilities: ['custody'] }],
      ['caseManager', 'Case Manager', 4, { track: 'ic', req: { education: { level: 'bachelor' } } }],
      ['contracts', 'Contract Compliance Manager', 6, { track: 'ic', minSize: 'large', req: { education: { level: 'bachelor' } } }],
      ['sergeant', 'Shift Sergeant', 3, { track: 'mgmt', abilities: ['custody', 'supervise'], reports: 15 }],
      ['chiefOfSecurity', 'Chief of Security', 5, { track: 'mgmt', abilities: ['custody', 'supervise', 'command'], reports: 80 }],
      ['warden', 'Facility Administrator (Warden)', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate', 'sign'], reports: 300 }],
      ['vpOps', 'VP of Facility Operations', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'budget', 'delegate', 'exec', 'policy'], reports: 10000 }],
    ],
  },

  probation: {
    sector: 'state', stateAgency: true, exam: 'state', background: 'strict',
    id: 'probation', name: 'Probation & Parole', icon: '📎', payMultiplier: 0.95, minAge: 21,
    union: { chance: 0.6, name: 'Probation & Parole Officers Association', strike: false },
    benefits: { pension: 'publicSafety', ssCovered: true },
    employerName: (_city, _rng, stateName) => `${stateName} Division of Probation & Parole`,
    entry: { education: { level: 'bachelor' } },
    valued: ['cit', 'lcsw'],
    ladder: [
      ['trainee', 'Probation Officer Trainee', 3, { years: 1 }],
      ['officer', 'Probation & Parole Officer', 4, { req: { credentials: ['probationCert'] }, abilities: ['arrest'] }],
      ['senior', 'Senior Probation Officer', 5, { abilities: ['arrest'] }],
      ['specialized', 'Specialized Caseload Officer', 6, { track: 'ic', abilities: ['arrest', 'audit'] }],
      ['supervisor', 'Probation Supervisor', 6, { track: 'mgmt', abilities: ['supervise'], reports: 10 }],
      ['chief', 'Chief Probation Officer', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate', 'policy'], reports: 300 }],
    ],
  },

  dispatch: {
    sector: 'municipal', background: 'strict', exam: 'municipal',
    id: 'dispatch', name: '911 Communications', icon: '📟', payMultiplier: 0.88, minAge: 18,
    union: { chance: 0.6, name: 'Communications Workers Local', strike: false },
    benefits: { pension: 'municipal' },
    employerName: (city) => `${city} Emergency Communications Center`,
    entry: { education: { level: 'highschool' } },
    ladder: [
      ['trainee', 'Telecommunicator Trainee', 2, { years: 1 }],
      ['telecommunicator', '911 Telecommunicator', 3, { req: { credentials: ['apco'] } }],
      ['senior', 'Senior Telecommunicator', 4],
      ['training', 'Communications Training Officer', 5, { track: 'ic' }],
      ['supervisor', 'Communications Supervisor', 5, { track: 'mgmt', abilities: ['supervise', 'command'], reports: 12 }],
      ['director', 'Emergency Communications Director', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 80 }],
    ],
  },

  privateInvestigator: {
    id: 'privateInvestigator', name: 'Private Investigation', icon: '🔍', sector: 'private', payMultiplier: 0.95, minAge: 21, sizes: { small: 4, medium: 2, large: 1 }, background: 'standard',
    employers: ['Pinnacle Investigations', 'Blackwell & Associates', 'Truth Seekers Agency', 'Meridian Risk Consulting'],
    entry: { education: { level: 'highschool' } },
    valued: ['post', 'fletc', 'paralegalCP', 'cpa'],
    ladder: [
      ['apprentice', 'Investigator Apprentice', 2],
      ['investigator', 'Licensed Private Investigator', 4, { entry: true, req: { credentials: ['piLicense'] } }],
      ['lead', 'Lead Case Investigator', 5],
      ['senior', 'Senior Investigator', 5, { track: 'ic' }],
      ['forensic', 'Forensic Financial Investigator', 7, { track: 'ic', minSize: 'medium', req: { credentials: ['cpa'] } }],
      ['expert', 'Expert Witness Investigator', 8, { track: 'ic', minSize: 'large' }],
      ['manager', 'Investigations Manager', 6, { track: 'mgmt', abilities: ['supervise'], reports: 8 }],
      ['director', 'Director of Investigations', 7, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'budget'], reports: 40 }],
      ['principal', 'Agency Principal', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'sign'], reports: 25 }],
    ],
  },

  bailBonds: {
    id: 'bailBonds', name: 'Bail Bonds & Fugitive Recovery', icon: '⛓️', sector: 'private', payMultiplier: 0.9, minAge: 21, sizes: { small: 5, medium: 2 }, background: 'standard', commission: true,
    employers: ['Freedom Bail Bonds', 'A-1 Bail Bonds', 'Liberty Bonding Co.', 'Second Chance Bail'],
    eligible: (state) => (NO_BAIL_STATES.includes(stateIdOf(state)) ? { ok: false, reason: 'Commercial bail is illegal in this state' } : { ok: true }),
    ladder: [
      ['trainee', 'Bail Agent Trainee', 2],
      ['agent', 'Bail Agent', 3, { req: { credentials: ['bailAgent'] } }],
      ['seniorAgent', 'Senior Bail Agent', 4],
      ['recovery', 'Fugitive Recovery Agent', 4, { track: 'ic', req: { credentials: ['bailAgent'] } }],
      ['teamLead', 'Recovery Team Leader', 5, { track: 'ic' }],
      ['manager', 'Office Manager', 5, { track: 'mgmt', abilities: ['supervise', 'sign'], reports: 5 }],
      ['generalAgent', 'General Agent (several offices)', 6, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'budget'], reports: 25 }],
      ['owner', 'Bonding Agency Owner', 6, { founder: true, track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'sign'], reports: 15 }],
    ],
  },
};

export default { id: 'careers-justice', version: 1, careers };
