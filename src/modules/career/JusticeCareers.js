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
import { L } from './Ladder.js';
import { stateIdOf } from '../life/Regions.js';

/** Private (special) police with full powers beyond the railroads. */
export const PRIVATE_POLICE_STATES = ['TX', 'IL', 'OH', 'FL', 'NY', 'DC'];
/** States without commercial bail bonds. */
export const NO_BAIL_STATES = ['IL', 'DC'];
/** Share of state prisoners held in privately run prisons. */
export const PRIVATE_PRISON_SHARE = { MT: 0.4, TX: 0.12, FL: 0.12, CO: 0.15, OH: 0.05 };

const LOCAL = { sector: 'municipal', background: 'strict', exam: 'publicSafety' };
const FED = { sector: 'federal', sizes: { large: 1, enterprise: 1 }, background: 'strict', exam: 'federal' };

export const JUSTICE_PROFESSIONS = {
  privateSecurity: {
    id: 'privateSecurity', name: 'Private Security', icon: '🛡️', sector: 'private', payMultiplier: 0.78, minAge: 18, sizes: { small: 2, medium: 3, large: 3, enterprise: 2 }, background: 'standard',
    union: { chance: 0.25, name: 'SEIU Security Officers United', strike: true },
    employers: ['Sentinel Guard Services', 'Ironclad Security', 'Allied Protective Group', 'Keystone Protection'],
    valued: ['postReserve', 'cit', 'emt'],
    levels: [
      L('trainee', 'Security Officer Trainee', 1, { years: 1 }),
      L('officer', 'Security Officer', 1, { req: { credentials: ['guardCard'] } }),
      L('armed', 'Armed Security Officer', 2, { req: { credentials: ['armedGuard'] } }),
      L('lossPrevention', 'Loss Prevention Investigator', 3, { track: 'ic', abilities: ['audit'] }),
      L('executive', 'Executive Protection Agent', 5, { track: 'ic', minSize: 'large', req: { credentials: ['execProtection'] } }),
      L('supervisor', 'Security Shift Supervisor', 2, { track: 'mgmt', abilities: ['supervise'], reports: 12 }),
      L('siteManager', 'Security Site Manager', 4, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 40 }),
      L('director', 'Director of Corporate Security', 7, { track: 'mgmt', minSize: 'large', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 300 }),
      L('cso', 'Chief Security Officer', 9, { track: 'mgmt', minSize: 'enterprise', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 2000 }),
    ],
  },

  privatePolice: {
    id: 'privatePolice', name: 'Private & Special Police', icon: '🚨', sector: 'private', payMultiplier: 0.95, minAge: 21, sizes: { medium: 2, large: 3, enterprise: 2 }, background: 'strict',
    union: { chance: 0.4, name: 'Fraternal Order of Police — Special Police Lodge', strike: false },
    // Railroads everywhere; campus, hospital and company police only where state law allows.
    employerName: (city, rng, stateName) => {
      const railroad = `${rng.pick(['Union Continental', 'Great Plains & Pacific', 'Atlantic Coast Line'])} Railroad Police`;
      if (!PRIVATE_POLICE_STATE_NAMES.includes(stateName) || rng.chance(0.3)) return railroad;
      return rng.pick([`${city} University Police Department`, `${city} Medical Center Police`, `${city} Private Hospital System Police`]);
    },
    entry: { education: { level: 'highschool' }, credentials: ['driverLicense'], fitness: 45 },
    valued: ['postReserve', 'cit', 'emt'],
    levels: [
      L('recruit', 'Special Police Recruit', 3, { years: 1 }),
      L('officer', 'Special Police Officer', 4, { entry: true, req: { credentials: ['post'] }, abilities: ['arrest'] }),
      L('senior', 'Senior Officer', 4, { abilities: ['arrest'] }),
      L('agent', 'Special Agent (Investigations)', 6, { track: 'ic', minSize: 'large', abilities: ['arrest', 'audit'] }),
      L('sergeant', 'Sergeant', 5, { track: 'mgmt', abilities: ['arrest', 'supervise'], reports: 8 }),
      L('lieutenant', 'Lieutenant', 6, { track: 'mgmt', abilities: ['arrest', 'supervise', 'command'], reports: 25 }),
      L('chief', 'Chief of Police', 8, { track: 'mgmt', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'delegate', 'policy'], reports: 120 }),
    ],
  },

  tsa: {
    ...FED, id: 'tsa', name: 'Transportation Security Administration', icon: '🛄', payMultiplier: 0.9, minAge: 18,
    union: { chance: 0.6, name: 'AFGE TSA Council 100', strike: false },
    employers: ['TSA — International Airport', 'TSA — Regional Airport', 'TSA — Federal Air Marshal Service'],
    entry: { education: { level: 'highschool' } },
    levels: [
      L('trainee', 'TSO Trainee', 2, { years: 1, req: { clearance: 'publicTrust' } }),
      L('officer', 'Transportation Security Officer', 3, { req: { credentials: ['tsaCert'] } }),
      L('lead', 'Lead TSO', 4),
      L('bdo', 'Behavior Detection Officer', 5, { track: 'ic' }),
      L('inspector', 'Transportation Security Inspector', 6, { track: 'ic', abilities: ['inspect'] }),
      L('airMarshal', 'Federal Air Marshal', 7, { track: 'ic', minSize: 'enterprise', req: { credentials: ['fletc'], clearance: 'secret' }, abilities: ['arrest'] }),
      L('supervisor', 'Supervisory TSO', 5, { track: 'mgmt', abilities: ['supervise'], reports: 15 }),
      L('manager', 'Transportation Security Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 120 }),
      L('fsd', 'Federal Security Director', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'budget', 'delegate', 'exec'], reports: 1500 }),
    ],
  },

  sheriff: {
    ...LOCAL, id: 'sheriff', name: 'Sheriff\'s Office', icon: '⭐', payMultiplier: 0.97, minAge: 21,
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
    levels: [
      L('trainee', 'Detention Officer Trainee', 2, { years: 1 }),
      L('officer', 'Detention Officer', 3, { req: { credentials: ['correctionsAcademy'] }, abilities: ['custody'] }),
      L('senior', 'Senior Detention Officer', 4, { abilities: ['custody'] }),
      L('classification', 'Classification Specialist', 4, { track: 'ic', abilities: ['custody'] }),
      L('reentry', 'Reentry Program Coordinator', 5, { track: 'ic', req: { education: { level: 'bachelor' } } }),
      L('sergeant', 'Detention Sergeant', 4, { track: 'mgmt', abilities: ['custody', 'supervise'], reports: 12 }),
      L('lieutenant', 'Detention Lieutenant', 5, { track: 'mgmt', abilities: ['custody', 'supervise', 'command'], reports: 40 }),
      L('commander', 'Jail Commander', 7, { track: 'mgmt', abilities: ['custody', 'supervise', 'hire', 'budget'], reports: 150 }),
      L('administrator', 'Jail Administrator', 8, { track: 'mgmt', minSize: 'large', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'delegate', 'sign'], reports: 600 }),
    ],
  },

  federalPrisons: {
    ...FED, id: 'federalPrisons', name: 'Federal Bureau of Prisons', icon: '🦅', payMultiplier: 1.05, minAge: 21,
    union: { chance: 0.8, name: 'AFGE Council of Prison Locals', strike: false },
    benefits: { pension: 'fers' },
    employers: ['FCI Englewood', 'USP Atwater', 'FCI Danbury', 'FMC Fort Worth', 'USP Florence ADMAX'],
    entry: { education: { level: 'highschool' }, fitness: 40 },
    levels: [
      L('trainee', 'Correctional Officer Trainee (BOP)', 4, { years: 1, req: { clearance: 'publicTrust' } }),
      L('officer', 'Correctional Officer (BOP)', 5, { req: { credentials: ['fletc'] }, abilities: ['custody'] }),
      L('senior', 'Senior Officer Specialist', 6, { abilities: ['custody'] }),
      L('caseManager', 'Case Manager', 7, { track: 'ic', req: { education: { level: 'bachelor' } }, abilities: ['custody'] }),
      L('sis', 'Special Investigative Services Technician', 7, { track: 'ic', abilities: ['custody', 'audit'] }),
      L('lieutenant', 'Lieutenant (BOP)', 7, { track: 'mgmt', abilities: ['custody', 'supervise', 'command'], reports: 40 }),
      L('captain', 'Captain (BOP)', 8, { track: 'mgmt', abilities: ['custody', 'supervise', 'budget', 'command'], reports: 200 }),
      L('associateWarden', 'Associate Warden', 8, { track: 'mgmt', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 300 }),
      L('warden', 'Warden', 9, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate', 'sign', 'exec'], reports: 600 }),
      L('regional', 'Regional Director', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'budget', 'delegate', 'exec', 'policy'], reports: 8000 }),
    ],
  },

  privatePrisons: {
    id: 'privatePrisons', name: 'Private Corrections', icon: '🏢', sector: 'private', payMultiplier: 0.78, minAge: 18, sizes: { medium: 2, large: 3, enterprise: 2 }, background: 'standard',
    union: { chance: 0.1, name: 'Correctional Workers United', strike: true },
    employers: ['Corrective Solutions Group', 'Ameri-Detention Corp', 'Liberty Correctional Services', 'Horizon Detention Partners'],
    entry: { education: { level: 'highschool' } },
    levels: [
      L('trainee', 'Correctional Officer Trainee', 1, { years: 1 }),
      L('officer', 'Correctional Officer', 2, { req: { credentials: ['correctionsAcademy'] }, abilities: ['custody'] }),
      L('senior', 'Senior Correctional Officer', 3, { abilities: ['custody'] }),
      L('caseManager', 'Case Manager', 4, { track: 'ic', req: { education: { level: 'bachelor' } } }),
      L('contracts', 'Contract Compliance Manager', 6, { track: 'ic', minSize: 'large', req: { education: { level: 'bachelor' } } }),
      L('sergeant', 'Shift Sergeant', 3, { track: 'mgmt', abilities: ['custody', 'supervise'], reports: 15 }),
      L('chiefOfSecurity', 'Chief of Security', 5, { track: 'mgmt', abilities: ['custody', 'supervise', 'command'], reports: 80 }),
      L('warden', 'Facility Administrator (Warden)', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate', 'sign'], reports: 300 }),
      L('vpOps', 'VP of Facility Operations', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'budget', 'delegate', 'exec', 'policy'], reports: 10000 }),
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
    levels: [
      L('trainee', 'Probation Officer Trainee', 3, { years: 1 }),
      L('officer', 'Probation & Parole Officer', 4, { req: { credentials: ['probationCert'] }, abilities: ['arrest'] }),
      L('senior', 'Senior Probation Officer', 5, { abilities: ['arrest'] }),
      L('specialized', 'Specialized Caseload Officer', 6, { track: 'ic', abilities: ['arrest', 'audit'] }),
      L('supervisor', 'Probation Supervisor', 6, { track: 'mgmt', abilities: ['supervise'], reports: 10 }),
      L('chief', 'Chief Probation Officer', 8, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate', 'policy'], reports: 300 }),
    ],
  },

  dispatch: {
    sector: 'municipal', background: 'strict', exam: 'municipal',
    id: 'dispatch', name: '911 Communications', icon: '📟', payMultiplier: 0.88, minAge: 18,
    union: { chance: 0.6, name: 'Communications Workers Local', strike: false },
    benefits: { pension: 'municipal' },
    employerName: (city) => `${city} Emergency Communications Center`,
    entry: { education: { level: 'highschool' } },
    levels: [
      L('trainee', 'Telecommunicator Trainee', 2, { years: 1 }),
      L('telecommunicator', '911 Telecommunicator', 3, { req: { credentials: ['apco'] } }),
      L('senior', 'Senior Telecommunicator', 4),
      L('training', 'Communications Training Officer', 5, { track: 'ic' }),
      L('supervisor', 'Communications Supervisor', 5, { track: 'mgmt', abilities: ['supervise', 'command'], reports: 12 }),
      L('director', 'Emergency Communications Director', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 80 }),
    ],
  },

  privateInvestigator: {
    id: 'privateInvestigator', name: 'Private Investigation', icon: '🔍', sector: 'private', payMultiplier: 0.95, minAge: 21, sizes: { small: 4, medium: 2, large: 1 }, background: 'standard',
    employers: ['Pinnacle Investigations', 'Blackwell & Associates', 'Truth Seekers Agency', 'Meridian Risk Consulting'],
    entry: { education: { level: 'highschool' } },
    valued: ['post', 'fletc', 'paralegalCP', 'cpa'],
    levels: [
      L('apprentice', 'Investigator Apprentice', 2),
      L('investigator', 'Licensed Private Investigator', 4, { entry: true, req: { credentials: ['piLicense'] } }),
      L('senior', 'Senior Investigator', 5, { track: 'ic' }),
      L('forensic', 'Forensic Financial Investigator', 7, { track: 'ic', minSize: 'medium', req: { credentials: ['cpa'] } }),
      L('manager', 'Investigations Manager', 6, { track: 'mgmt', abilities: ['supervise'], reports: 8 }),
      L('principal', 'Agency Principal', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'sign'], reports: 25 }),
    ],
  },

  bailBonds: {
    id: 'bailBonds', name: 'Bail Bonds & Fugitive Recovery', icon: '⛓️', sector: 'private', payMultiplier: 0.9, minAge: 21, sizes: { small: 5, medium: 2 }, background: 'standard', commission: true,
    employers: ['Freedom Bail Bonds', 'A-1 Bail Bonds', 'Liberty Bonding Co.', 'Second Chance Bail'],
    eligible: (state) => (NO_BAIL_STATES.includes(stateIdOf(state)) ? { ok: false, reason: 'Commercial bail is illegal in this state' } : { ok: true }),
    levels: [
      L('agent', 'Bail Agent', 3, { req: { credentials: ['bailAgent'] } }),
      L('recovery', 'Fugitive Recovery Agent', 4, { track: 'ic', req: { credentials: ['bailAgent'] } }),
      L('manager', 'Office Manager', 5, { track: 'mgmt', abilities: ['supervise', 'sign'], reports: 5 }),
      L('owner', 'Bonding Agency Owner', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget', 'sign'], reports: 15 }),
    ],
  },
};

const PRIVATE_POLICE_STATE_NAMES = ['Texas', 'Illinois', 'Ohio', 'Florida', 'New York', 'District of Columbia'];

/** Yearly incidents for these careers (one pool per profession). */
export const JUSTICE_EVENTS = {
  privateSecurity: [
    { title: 'Shoplifter at the Door', text: 'A man walks out of the store with a TV under his arm.', options: [
      { id: 'detain', label: '✋ Detain him for police', perf: 4, risk: 0.2 },
      { id: 'report', label: '📞 Observe and report — company policy', perf: 2 },
    ] },
    { title: 'Concert Crowd Surge', text: 'The crowd at the stage barrier is crushing people in the front row.', options: [
      { id: 'pull', label: '🙌 Pull people over the barrier', perf: 7, risk: 0.15 },
      { id: 'radio', label: '📻 Call for the show to stop', perf: 5 },
    ] },
  ],
  privatePolice: [
    { title: 'Trespasser on the Tracks', text: 'A teenager is filming on a trestle with a freight train due in four minutes.', options: [
      { id: 'run', label: '🏃 Sprint out and get him off', perf: 8, risk: 0.2 },
      { id: 'stop', label: '📻 Call the dispatcher to stop the train', perf: 5 },
    ] },
    { title: 'Campus Protest', text: 'Students have occupied the administration building.', options: [
      { id: 'talk', label: '🗣️ Negotiate a peaceful exit', perf: 6 },
      { id: 'clear', label: '🚔 Clear the building on the president\'s order', perf: 2, risk: 0.15 },
    ] },
  ],
  tsa: [
    { title: 'Something in the Bag', text: 'The X-ray shows a loaded handgun in a carry-on.', options: [
      { id: 'protocol', label: '🛑 Stop the belt and call police by the book', perf: 6 },
      { id: 'quiet', label: '🤫 Handle it quietly to keep the line moving', perf: -4 },
    ] },
  ],
  sheriff: [
    { title: 'Eviction Notice', text: 'You\'re ordered to serve an eviction on a family with three kids in a snowstorm.', options: [
      { id: 'serve', label: '📜 Serve it today', perf: 3, stress: 6 },
      { id: 'delay', label: '⏳ Find reasons to delay a week and call social services', perf: -2 },
    ] },
    { title: 'Rural Pursuit', text: 'You\'re the only deputy for 40 miles when a burglary-in-progress call comes in.', options: [
      { id: 'go', label: '🚔 Go in alone', perf: 7, risk: 0.25 },
      { id: 'wait', label: '📻 Wait for a trooper', perf: 2 },
    ] },
  ],
  jail: [
    { title: 'Detox Watch', text: 'A new arrestee is shaking and sweating — heroin withdrawal.', options: [
      { id: 'medical', label: '🩺 Push for a medical transfer', perf: 5 },
      { id: 'watch', label: '👀 Put him on 15-minute checks', perf: 2, risk: 0.05 },
    ] },
    { title: 'Overcrowded Pod', text: 'The jail is at 140% capacity; inmates are sleeping on the floor.', options: [
      { id: 'report', label: '📝 Write it up for the jail inspector', perf: 3 },
      { id: 'manage', label: '🤐 Manage it and say nothing', perf: 1, stress: 4 },
    ] },
  ],
  federalPrisons: [
    { title: 'Contraband Drone', text: 'A drone drops a package into the recreation yard.', options: [
      { id: 'secure', label: '🏃 Secure the package before inmates do', perf: 7, risk: 0.15 },
      { id: 'lockdown', label: '🚨 Call a lockdown', perf: 5 },
    ] },
    { title: 'Mandatory Overtime', text: 'Staffing is so short you\'re ordered to work a double — the fourth this week.', options: [
      { id: 'work', label: '😓 Work it', perf: 4, stress: 8 },
      { id: 'refuse', label: '🙅 Refuse and take the write-up', perf: -5 },
    ] },
  ],
  privatePrisons: [
    { title: 'Short-Staffed Shift', text: 'Two officers for a 120-bed unit — the contract says six.', options: [
      { id: 'report', label: '📞 Report it to the state contract monitor', perf: -3, boss: -8 },
      { id: 'cope', label: '😬 Make it through the night', perf: 3, risk: 0.2, stress: 6 },
    ] },
    { title: 'Cutting Corners', text: 'Your boss tells you to log welfare checks that never happened before the auditors arrive.', options: [
      { id: 'refuse', label: '🙅 Refuse to falsify the logs', perf: -4, boss: -10 },
      { id: 'falsify', label: '✍️ Fill in the logs', perf: 4, offense: 'falsifiedRecords' },
    ] },
  ],
  probation: [
    { title: 'Technical Violation', text: 'A parolee who\'s held a job for a year missed a check-in and failed a drug test.', options: [
      { id: 'violate', label: '📝 File a violation — back to prison', perf: 3 },
      { id: 'treatment', label: '🤝 Refer to treatment instead', perf: 4 },
    ] },
  ],
  dispatch: [
    { title: 'CPR Over the Phone', text: 'A panicked caller\'s husband isn\'t breathing. The ambulance is 9 minutes out.', options: [
      { id: 'coach', label: '📞 Coach her through CPR', perf: 8, stress: 6 },
    ] },
  ],
  privateInvestigator: [
    { title: 'Workers\' Comp Surveillance', text: 'The "totally disabled" claimant is roofing his garage.', options: [
      { id: 'film', label: '🎥 Film it from the public road', perf: 6 },
      { id: 'trespass', label: '🚧 Get closer for a better angle (his yard)', perf: 7, offense: 'trespass' },
    ] },
  ],
  bailBonds: [
    { title: 'Skip', text: 'A client who owes $40,000 on his bond missed court and is hiding at his cousin\'s.', options: [
      { id: 'recover', label: '🚪 Go get him', perf: 7, risk: 0.25 },
      { id: 'police', label: '📞 Tip off the police and wait', perf: 3 },
    ] },
  ],
};

/** Plays the yearly incidents above for whoever holds one of these jobs. */
export const JusticeJobs = {
  id: 'justiceJobs',
  order: 30.6,

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    const pool = job && JUSTICE_EVENTS[job.professionId];
    if (!pool || state.legal.incarceration || !job.paidThisYear || !rng.chance(0.35)) return;
    const i = rng.int(0, pool.length - 1);
    const ev = pool[i];
    ctx.prompt({
      type: 'justiceJobs.event', icon: JUSTICE_PROFESSIONS[job.professionId].icon, title: ev.title, text: ev.text,
      options: ev.options.map((o) => ({ id: o.id, label: o.label, hint: o.risk ? 'Risky' : o.offense ? 'Against the law' : undefined, tone: o.offense ? 'danger' : undefined })),
      data: { professionId: job.professionId, index: i },
    });
  },

  resolvers: {
    event(ctx, data, optionId) {
      const { state, rng } = ctx;
      const o = JUSTICE_EVENTS[data.professionId]?.[data.index]?.options.find((x) => x.id === optionId);
      const job = state.career.job;
      if (!o || !job || job.professionId !== data.professionId) return;
      job.performance = Math.round(Math.max(0, Math.min(100, job.performance + (o.perf ?? 0))));
      if (o.boss) job.boss = Math.round(Math.max(0, Math.min(100, job.boss + o.boss)));
      if (o.stress) ctx.stat('stress', o.stress);
      if (o.risk && rng.chance(o.risk)) {
        ctx.stat('health', -rng.int(8, 20));
        if (rng.chance(0.3)) ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(20, 50) });
        ctx.log('You were hurt on the job.', '🩹', 'bad');
      }
      if (o.offense) ctx.emit('legal:offense', { offenseId: o.offense, context: `on the job at ${job.employer.name}`, discovery: 0.25, evidence: 0.6 });
      ctx.log(`${o.label.replace(/^\S+ /, '')}.${o.perf > 0 ? ' Your supervisors noticed.' : ''}`, JUSTICE_PROFESSIONS[data.professionId].icon, o.perf > 0 ? 'good' : 'info');
    },
  },
};
