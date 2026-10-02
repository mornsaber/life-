/**
 * State government: agencies hired through the State Civil Service Exam,
 * on the shared Ladder/PayGrades system, with the State Employees
 * Retirement System (or the police & fire plan for sworn/custody roles).
 *
 * Top posts marked `appointed` (State Police Superintendent, Corrections
 * Director, Revenue Commissioner…) can't be reached by promotion — only by
 * gubernatorial appointment (politics module). Tenured professors can't be
 * fired or demoted for performance.
 */
import { pickFresh } from '../../core/Pools.js';
import { L } from '../career/Ladder.js';
import { clamp } from '../../core/Random.js';

const AGENCY = { sector: 'state', stateAgency: true, exam: 'state', background: 'strict' };
const agency = (suffix) => (_city, _rng, stateName) => `${stateName} ${suffix}`;

export const STATE_PROFESSIONS = {
  statePolice: {
    ...AGENCY, id: 'statePolice', name: 'State Police / Highway Patrol', icon: '🚔', payMultiplier: 1.0, minAge: 21, dutyStation: 'statewide',
    union: { chance: 0.7, name: 'State Troopers Association', strike: false },
    benefits: { pension: 'publicSafety', ssCovered: false },
    employerName: agency('State Patrol'),
    entry: { education: { level: 'highschool' }, credentials: ['driverLicense'], fitness: 50 },
    valued: ['postReserve', 'emt', 'trafficEnforcement'],
    levels: [
      L('cadet', 'Trooper Cadet', 3, { years: 1 }),
      L('trooper', 'State Trooper', 4, { entry: true, req: { credentials: ['post'] }, abilities: ['arrest'] }),
      L('senior', 'Senior Trooper', 5, { abilities: ['arrest'] }),
      L('investigator', 'Criminal Investigator', 6, { track: 'ic', abilities: ['arrest', 'audit'] }),
      L('majorCrimes', 'Major Crimes Investigator', 7, { track: 'ic', abilities: ['arrest', 'audit'] }),
      L('sergeant', 'Sergeant', 5, { track: 'mgmt', req: { credentials: ['fto'] }, abilities: ['arrest', 'supervise'], reports: 10 }),
      L('lieutenant', 'Lieutenant', 6, { track: 'mgmt', req: { credentials: ['supervisorCourse'] }, abilities: ['arrest', 'supervise', 'command'], reports: 30 }),
      L('captain', 'Captain', 7, { track: 'mgmt', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'command'], reports: 90 }),
      L('major', 'Major', 8, { track: 'mgmt', req: { credentials: ['commandCollege'] }, abilities: ['supervise', 'budget', 'delegate', 'command'], reports: 400 }),
      L('superintendent', 'Superintendent', 9, { track: 'mgmt', appointed: true, abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'policy'], reports: 2500 }),
    ],
  },
  corrections: {
    ...AGENCY, id: 'corrections', name: 'Department of Corrections', icon: '🔐', payMultiplier: 0.95, minAge: 21,
    union: { chance: 0.75, name: 'Correctional Peace Officers Association', strike: false },
    benefits: { pension: 'publicSafety', ssCovered: true },
    employerName: agency('Department of Corrections'),
    entry: { education: { level: 'highschool' }, fitness: 40 },
    valued: ['postReserve', 'cit', 'emt'],
    levels: [
      L('officer', 'Correctional Officer', 3, { abilities: ['custody'] }),
      L('senior', 'Senior Correctional Officer', 4, { req: { credentials: ['correctionsAcademy'] }, abilities: ['custody'] }),
      L('investigator', 'Corrections Investigator', 5, { track: 'ic', abilities: ['custody', 'audit', 'arrest'] }),
      L('gang', 'Gang Intelligence Officer', 6, { track: 'ic', abilities: ['custody', 'audit'] }),
      L('sergeant', 'Corrections Sergeant', 4, { track: 'mgmt', abilities: ['custody', 'supervise'], reports: 10 }),
      L('lieutenant', 'Corrections Lieutenant', 5, { track: 'mgmt', abilities: ['custody', 'supervise', 'command'], reports: 30 }),
      L('captain', 'Corrections Captain', 6, { track: 'mgmt', abilities: ['custody', 'supervise', 'budget'], reports: 80 }),
      L('deputyWarden', 'Deputy Warden', 7, { track: 'mgmt', req: { education: { level: 'bachelor' } }, abilities: ['custody', 'supervise', 'hire', 'budget', 'delegate'], reports: 250 }),
      L('warden', 'Warden', 8, { track: 'mgmt', abilities: ['custody', 'supervise', 'hire', 'budget', 'delegate', 'sign'], reports: 500 }),
      L('director', 'Director of Corrections', 9, { track: 'mgmt', appointed: true, abilities: ['supervise', 'budget', 'delegate', 'exec', 'policy'], reports: 8000 }),
    ],
  },
  revenue: {
    ...AGENCY, id: 'revenue', name: 'Department of Revenue', icon: '🧾', payMultiplier: 1.0, minAge: 21,
    employerName: agency('Department of Revenue'),
    entry: { education: { level: 'bachelor' } },
    valued: ['cpa', 'cgfm'],
    levels: [
      L('agent', 'Revenue Agent', 3, { abilities: ['audit'] }),
      L('auditor', 'Tax Auditor', 4, { abilities: ['audit', 'inspect'] }),
      L('senior', 'Senior Auditor', 5, { abilities: ['audit', 'inspect'] }),
      L('fraud', 'Tax Fraud Investigator', 6, { track: 'ic', req: { credentials: ['fletc'] }, abilities: ['audit', 'arrest'] }),
      L('specialist', 'Senior Tax Policy Specialist', 7, { track: 'ic', req: { credentials: ['cpa'] }, abilities: ['audit', 'policy'] }),
      L('supervisor', 'Audit Supervisor', 6, { track: 'mgmt', abilities: ['audit', 'supervise'], reports: 12 }),
      L('deputy', 'Deputy Commissioner', 8, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 400 }),
      L('commissioner', 'Revenue Commissioner', 9, { track: 'mgmt', appointed: true, abilities: ['supervise', 'budget', 'delegate', 'exec', 'policy'], reports: 2000 }),
    ],
  },
  cps: {
    ...AGENCY, id: 'cps', name: 'Child Protective Services', icon: '🧸', payMultiplier: 0.9, minAge: 21,
    union: { chance: 0.55, name: 'SEIU State Workers', strike: true },
    employerName: agency('Department of Children & Family Services'),
    entry: { education: { level: 'bachelor' } },
    valued: ['lcsw', 'cit'],
    levels: [
      L('caseworker', 'Caseworker', 3, { abilities: ['inspect'] }),
      L('senior', 'Senior Caseworker', 4, { abilities: ['inspect'] }),
      L('investigator', 'Child Abuse Investigator', 5, { track: 'ic', abilities: ['inspect', 'audit'] }),
      L('clinical', 'Clinical Specialist', 6, { track: 'ic', req: { credentials: ['lcsw'] } }),
      L('supervisor', 'Casework Supervisor', 5, { track: 'mgmt', abilities: ['supervise'], reports: 8 }),
      L('manager', 'Program Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 40 }),
      L('regional', 'Regional Director', 7, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 200 }),
    ],
  },
  gameWarden: {
    ...AGENCY, id: 'gameWarden', name: 'Game Warden (Fish & Wildlife)', icon: '🦌', payMultiplier: 0.95, minAge: 21, dutyStation: 'stateRural', background: 'strict',
    benefits: { pension: 'publicSafety', ssCovered: true },
    employerName: agency('Fish & Wildlife Department'),
    entry: { education: { level: 'associate' }, credentials: ['driverLicense'], fitness: 50 },
    valued: ['wfr', 'landNav', 'swiftwater', 'environmentalScience'],
    levels: [
      L('cadet', 'Game Warden Cadet', 3, { years: 1 }),
      L('warden', 'Game Warden', 4, { entry: true, req: { credentials: ['post'] }, abilities: ['arrest', 'inspect'] }),
      L('investigator', 'Wildlife Crimes Investigator', 5, { track: 'ic', abilities: ['arrest', 'audit'] }),
      L('pilot', 'Warden Pilot', 6, { track: 'ic', req: { credentials: ['commercialPilot'] }, abilities: ['arrest'] }),
      L('sergeant', 'Warden Sergeant', 5, { track: 'mgmt', abilities: ['arrest', 'supervise'], reports: 8 }),
      L('captain', 'Warden Captain', 6, { track: 'mgmt', abilities: ['supervise', 'budget', 'command'], reports: 30 }),
      L('chief', 'Chief Game Warden', 8, { track: 'mgmt', appointed: true, abilities: ['supervise', 'budget', 'delegate', 'exec', 'policy'], reports: 200 }),
    ],
  },
  environmental: {
    ...AGENCY, id: 'environmental', name: 'Environmental Quality', icon: '🏭', payMultiplier: 1.0, minAge: 21,
    employerName: agency('Department of Environmental Quality'),
    entry: { education: { level: 'bachelor' } },
    valued: ['hazmatOps', 'oshaSafety'],
    levels: [
      L('specialist', 'Environmental Specialist', 3),
      L('inspector', 'Environmental Inspector', 4, { abilities: ['inspect'] }),
      L('senior', 'Senior Inspector', 5, { abilities: ['inspect', 'sign'] }),
      L('scientist', 'Environmental Scientist', 6, { track: 'ic', req: { education: { level: 'master' } } }),
      L('manager', 'Program Manager', 6, { track: 'mgmt', abilities: ['supervise', 'budget'], reports: 20 }),
      L('director', 'Division Director', 8, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 150 }),
    ],
  },
  forester: {
    ...AGENCY, id: 'forester', name: 'State Forestry', icon: '🌲', payMultiplier: 0.92, minAge: 18, dutyStation: 'stateRural', background: 'standard',
    employerName: agency('Division of Forestry'),
    entry: {},
    valued: ['ff1', 'ff2', 'wfr', 'ics300'],
    levels: [
      L('tech', 'Forestry Technician', 2),
      L('forester', 'Forester', 4, { entry: true, req: { education: { level: 'bachelor' } } }),
      L('senior', 'Senior Forester', 5),
      L('fmo', 'Fire Management Officer', 6, { track: 'ic', req: { credentials: ['ff2', 'ics300'] }, abilities: ['command'] }),
      L('district', 'District Forester', 6, { track: 'mgmt', abilities: ['supervise', 'budget'], reports: 25 }),
      L('state', 'State Forester', 8, { track: 'mgmt', appointed: true, abilities: ['supervise', 'budget', 'delegate', 'exec', 'policy'], reports: 300 }),
    ],
  },
  dot: {
    ...AGENCY, id: 'dot', name: 'Department of Transportation', icon: '🛣️', payMultiplier: 0.98, minAge: 18, background: 'standard',
    union: { chance: 0.5, name: 'AFSCME Highway Workers', strike: false },
    employerName: agency('Department of Transportation'),
    entry: { credentials: ['driverLicense'] },
    valued: ['cdlA', 'oshaSafety', 'pe'],
    levels: [
      L('maintenance', 'Highway Maintenance Worker', 2),
      L('operator', 'Equipment Operator', 3, { req: { credentials: ['cdlA'] } }),
      L('engineer', 'Transportation Engineer', 5, { track: 'ic', entry: true, req: { credentials: ['pe'] }, abilities: ['inspect', 'sign'] }),
      L('seniorEngineer', 'Senior Transportation Engineer', 6, { track: 'ic', abilities: ['inspect', 'sign'] }),
      L('crew', 'Crew Supervisor', 4, { track: 'mgmt', abilities: ['supervise'], reports: 12 }),
      L('district', 'District Engineer', 7, { track: 'mgmt', req: { credentials: ['pe'] }, abilities: ['supervise', 'budget', 'sign', 'delegate'], reports: 300 }),
      L('chief', 'Chief Engineer', 8, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 1500 }),
    ],
  },
  courts: {
    ...AGENCY, id: 'courts', name: 'State Courts Administration', icon: '🏛️', payMultiplier: 0.95, minAge: 18, background: 'strict',
    employerName: agency('Judicial Branch'),
    entry: { education: { level: 'highschool' } },
    valued: ['paralegalCP'],
    levels: [
      L('clerk', 'Deputy Court Clerk', 2),
      L('courtClerk', 'Court Clerk', 3),
      L('senior', 'Senior Court Clerk', 4, { abilities: ['sign'] }),
      L('reporter', 'Official Court Reporter', 5, { track: 'ic' }),
      L('staffAttorney', 'Court Staff Attorney', 6, { track: 'ic', entry: true, req: { credentials: ['barLicense'] }, abilities: ['represent'] }),
      L('admin', 'Court Administrator', 6, { track: 'mgmt', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'budget'], reports: 40 }),
      L('stateAdmin', 'State Court Administrator', 8, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 600 }),
    ],
  },
  prosecution: {
    ...AGENCY, id: 'prosecution', name: 'District Attorney\'s Office', icon: '👩‍⚖️', payMultiplier: 1.0, minAge: 24, exam: null,
    employerName: (city) => `${city} County District Attorney`,
    entry: { education: { program: 'jd' } },
    levels: [
      L('clerk', 'Law Clerk (DA)', 4),
      L('ada', 'Assistant District Attorney', 5, { entry: true, req: { credentials: ['barLicense'] }, abilities: ['represent'] }),
      L('senior', 'Senior ADA', 6, { abilities: ['represent'] }),
      L('trial', 'Senior Trial Counsel', 7, { track: 'ic', abilities: ['represent'] }),
      L('chiefDeputy', 'Chief Deputy DA', 7, { track: 'mgmt', abilities: ['represent', 'supervise', 'hire'], reports: 20 }),
      L('first', 'First Assistant DA', 8, { track: 'mgmt', abilities: ['represent', 'supervise', 'budget', 'delegate', 'policy'], reports: 120 }),
    ],
  },
  publicDefender: {
    ...AGENCY, id: 'publicDefender', name: 'Public Defender\'s Office', icon: '🧑‍⚖️', payMultiplier: 0.95, minAge: 24, exam: null,
    union: { chance: 0.4, name: 'Public Defenders Union', strike: false },
    employerName: agency('Office of the Public Defender'),
    entry: { education: { program: 'jd' } },
    levels: [
      L('clerk', 'Law Clerk (PD)', 4),
      L('apd', 'Assistant Public Defender', 5, { entry: true, req: { credentials: ['barLicense'] }, abilities: ['represent'] }),
      L('senior', 'Senior Public Defender', 6, { abilities: ['represent'] }),
      L('trial', 'Senior Trial Attorney', 7, { track: 'ic', abilities: ['represent'] }),
      L('supervising', 'Supervising Public Defender', 7, { track: 'mgmt', abilities: ['represent', 'supervise'], reports: 15 }),
      L('chief', 'Chief Public Defender', 8, { track: 'mgmt', appointed: true, abilities: ['represent', 'supervise', 'budget', 'delegate', 'policy'], reports: 200 }),
    ],
  },
  legislativeStaff: {
    ...AGENCY, id: 'legislativeStaff', name: 'Legislative Staff', icon: '📜', payMultiplier: 0.9, minAge: 21, exam: null, background: 'standard',
    employerName: agency('State Legislature'),
    entry: { education: { level: 'bachelor' } },
    levels: [
      L('aide', 'Legislative Aide', 3, { abilities: ['policy'] }),
      L('analyst', 'Legislative Analyst', 4, { abilities: ['policy'] }),
      L('advisor', 'Senior Policy Advisor', 5, { track: 'ic', abilities: ['policy'] }),
      L('counsel', 'Committee Counsel', 6, { track: 'ic', req: { credentials: ['barLicense'] }, abilities: ['policy', 'represent'] }),
      L('deputyCos', 'Deputy Chief of Staff', 6, { track: 'mgmt', abilities: ['policy', 'supervise'], reports: 6 }),
      L('cos', 'Chief of Staff', 7, { track: 'mgmt', abilities: ['policy', 'supervise', 'hire', 'budget'], reports: 15 }),
    ],
  },
  university: {
    ...AGENCY, id: 'university', name: 'Public University Faculty', icon: '🎓', payMultiplier: 1.05, minAge: 22, exam: null, background: 'standard',
    union: { chance: 0.35, name: 'Faculty Association', strike: true },
    benefits: { pension: 'teachers' },
    employerName: agency('State University'),
    entry: { education: { level: 'master' } },
    levels: [
      L('adjunct', 'Adjunct Instructor', 3),
      L('assistant', 'Assistant Professor', 5, { entry: true, req: { education: { program: 'phd' } }, years: 6 }),
      L('associate', 'Associate Professor', 6, { abilities: ['tenure'] }),
      L('professor', 'Professor', 7, { track: 'ic', abilities: ['tenure'] }),
      L('distinguished', 'Distinguished Professor', 8, { track: 'ic', abilities: ['tenure'] }),
      L('chair', 'Department Chair', 7, { track: 'mgmt', abilities: ['tenure', 'supervise', 'hire'], reports: 25 }),
      L('dean', 'Dean', 8, { track: 'mgmt', abilities: ['tenure', 'supervise', 'budget', 'delegate'], reports: 200 }),
      L('provost', 'Provost', 9, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'policy'], reports: 1500 }),
      L('president', 'University President', 10, { track: 'mgmt', abilities: ['supervise', 'budget', 'delegate', 'exec', 'policy'], reports: 6000 }),
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Agency events                                                       */
/* ------------------------------------------------------------------ */

export const EVENTS = {
  statePolice: { title: 'High-Speed Pursuit', text: 'A stolen car flees at 110 mph toward a school zone.', options: [
    { id: 'pursue', label: '🚔 Stay on him', perf: 6, risk: 0.2 },
    { id: 'terminate', label: '🛑 Terminate the pursuit and track by air', perf: 2 },
  ] },
  corrections: { title: 'Riot on C-Block', text: 'Inmates have taken over a housing unit. An officer is trapped inside.', options: [
    { id: 'enter', label: '🛡️ Go in with the tactical team', perf: 8, risk: 0.3 },
    { id: 'negotiate', label: '🗣️ Negotiate through the door', perf: 5, check: 'smarts' },
    { id: 'wait', label: '⏳ Hold the perimeter for the state response team', perf: -2 },
  ] },
  revenue: { title: 'Audit a Big Donor', text: 'Your audit points to millions in unreported income — from one of the governor\'s biggest donors. Your boss suggests "taking another look."', options: [
    { id: 'pursue', label: '🔍 Finish the audit as written', perf: 6, boss: -8 },
    { id: 'back', label: '🫥 Quietly close the file', perf: -4, boss: 6 },
  ] },
  cps: { title: 'Removal Decision', text: 'A home visit finds a toddler with unexplained bruises. The parents say she fell.', options: [
    { id: 'remove', label: '🚨 Remove the child tonight', perf: 3, outcome: 'removal' },
    { id: 'plan', label: '🤝 Safety plan with in-home services', perf: 3, outcome: 'plan' },
    { id: 'close', label: '📁 Close the case as unsubstantiated', perf: -2, outcome: 'close' },
  ] },
  gameWarden: { title: 'Poachers at Night', text: 'Spotlights in a closed elk unit. Three armed men, one of you.', options: [
    { id: 'contact', label: '🔦 Make contact alone', perf: 7, risk: 0.2 },
    { id: 'backup', label: '📻 Call a trooper and stake out the truck', perf: 4 },
  ] },
  environmental: { title: 'Chemical Plant Violation', text: 'A plant upstream of the city water intake is dumping solvents. It\'s the county\'s largest employer.', options: [
    { id: 'enforce', label: '⚖️ Issue the violation and fines', perf: 6, boss: -4 },
    { id: 'warn', label: '📄 Issue a warning letter', perf: -3, boss: 4 },
  ] },
  forester: { title: 'Prescribed Burn', text: 'Conditions for your planned burn are marginal. Waiting means another fuel-heavy summer.', options: [
    { id: 'burn', label: '🔥 Light it', perf: 6, risk: 0.15 },
    { id: 'wait', label: '🌬️ Postpone', perf: 0 },
  ] },
  dot: { title: 'Bridge Inspection', text: 'The bridge on Route 9 is worse than the last report said. Closing it means a 40-minute detour for 20,000 drivers.', options: [
    { id: 'close', label: '🚧 Close it now', perf: 6, boss: -3 },
    { id: 'weight', label: '⚖️ Post weight limits and reinspect', perf: 3, check: 'smarts' },
  ] },
  courts: { title: 'Docket Crisis', text: 'A clerical error left 40 defendants jailed past their hearing dates.', options: [
    { id: 'fix', label: '📂 Work the weekend to fix every case', perf: 7, stress: 8 },
    { id: 'report', label: '📢 Report it up and request help', perf: 3 },
  ] },
  prosecution: { title: 'The Big Trial', text: 'You\'re lead counsel on a homicide trial that\'s all over the news.', options: [
    { id: 'try', label: '⚖️ Try it yourself', perf: 8, check: 'smarts' },
    { id: 'plea', label: '🤝 Offer manslaughter to lock in a conviction', perf: 3 },
  ] },
  publicDefender: { title: 'Caseload Crisis', text: 'You have 180 open felony cases. A client\'s trial starts Monday and you\'ve barely read the file.', options: [
    { id: 'continuance', label: '⏱️ Ask for a continuance', perf: 2 },
    { id: 'allnighter', label: '🌙 Prepare all weekend', perf: 6, stress: 10 },
  ] },
  legislativeStaff: { title: 'Budget Night', text: 'The budget bill has to be drafted by 6 AM. Your boss is counting on you.', options: [
    { id: 'draft', label: '✍️ Draft it all night', perf: 7, stress: 8 },
    { id: 'delegate', label: '👥 Split it with the committee staff', perf: 3 },
  ] },
  university: { title: 'Grant Deadline', text: 'A major federal grant is due Friday. Tenure review looks at your funding record.', options: [
    { id: 'submit', label: '🧪 Pull it together and submit', perf: 7, check: 'smarts' },
    { id: 'skip', label: '📚 Skip this cycle, focus on teaching', perf: -2 },
  ] },
};

/** More events per agency so careers don't repeat one scenario every year. */
const MORE_EVENTS = {
  statePolice: [
    { id: 'crash', title: 'Interstate Pileup', text: 'Fog caused a 30-car pileup. A minivan is burning in the median.', options: [
      { id: 'van', label: '🔥 Get the family out of the minivan', perf: 8, risk: 0.3, stress: 6 },
      { id: 'scene', label: '🚧 Lock down the scene and stop more crashes', perf: 5 },
    ] },
    { id: 'trooperDui', title: 'A Fellow Trooper', text: 'You stop a weaving car. The driver is an off-duty trooper from your own post, clearly drunk.', options: [
      { id: 'arrest', label: '⚖️ Arrest him like anyone else', perf: 4, boss: -4, stress: 5 },
      { id: 'ride', label: '🚗 Drive him home and say nothing', perf: 0, boss: 3 },
    ] },
  ],
  corrections: [
    { id: 'contraband', title: 'Contraband Ring', text: 'You find phones and drugs hidden in the laundry carts. The trail leads to a coworker.', options: [
      { id: 'report', label: '📋 Report it to internal affairs', perf: 7, boss: 2, stress: 4 },
      { id: 'warn', label: '🤐 Warn your coworker to stop', perf: -2, stress: 6 },
    ] },
    { id: 'suicideWatch', title: 'Suicide Watch', text: 'An inmate on watch hasn\'t moved in his cell for twenty minutes.', options: [
      { id: 'enter', label: '🚪 Enter the cell now, alone', perf: 6, risk: 0.15 },
      { id: 'backup', label: '📻 Call for backup first, per policy', perf: 3 },
    ] },
  ],
  revenue: [
    { id: 'hardship', title: 'Hardship Case', text: 'A widow owes $40,000 in back taxes from her late husband\'s business. She is clearly overwhelmed.', options: [
      { id: 'plan', label: '🤝 Set up an affordable payment plan', perf: 3, boss: -1 },
      { id: 'levy', label: '🏦 Levy her bank account', perf: 5, boss: 3, stress: 4 },
    ] },
  ],
  cps: [
    { id: 'reunify', title: 'Reunification Hearing', text: 'A mother finished rehab and wants her kids back. The foster family wants to adopt.', options: [
      { id: 'reunify', label: '🏠 Recommend reunification', perf: 3, outcome: 'plan' },
      { id: 'adopt', label: '📄 Recommend termination and adoption', perf: 3, outcome: 'removal' },
    ] },
    { id: 'caseload', title: 'Caseload Crisis', text: 'Two caseworkers quit. You now carry 34 families.', options: [
      { id: 'overtime', label: '⏰ Work nights to see every family', perf: 6, stress: 12 },
      { id: 'triage', label: '🗂️ Triage and tell your supervisor what\'s slipping', perf: 2, boss: 2, check: 'smarts' },
    ] },
  ],
  gameWarden: [
    { id: 'poachers', title: 'Night Poachers', text: 'Spotlights in the field after midnight. Three men with rifles and a pickup.', options: [
      { id: 'approach', label: '🔦 Approach and make contact', perf: 7, risk: 0.2 },
      { id: 'plate', label: '📸 Get the plate and arrest them tomorrow', perf: 4, check: 'smarts' },
    ] },
  ],
  environmental: [
    { id: 'spill', title: 'Chemical Spill', text: 'A plant upstream "accidentally" released solvent into the river. Fish are dying for three miles.', options: [
      { id: 'maxfine', label: '⚖️ Push for the maximum penalty', perf: 6, boss: -3 },
      { id: 'consent', label: '🤝 Negotiate a cleanup consent order', perf: 4, check: 'smarts' },
    ] },
  ],
  forester: [
    { id: 'burn', title: 'Prescribed Burn', text: 'Conditions are marginal for a planned burn. Wait and the window may close for a year.', options: [
      { id: 'light', label: '🔥 Light it', perf: 5, risk: 0.15, check: 'smarts' },
      { id: 'scrub', label: '🛑 Scrub the burn', perf: 1 },
    ] },
  ],
  dot: [
    { id: 'bridge', title: 'Bridge Inspection', text: 'Your inspection finds section loss on a bridge carrying 40,000 cars a day. Closing it means gridlock.', options: [
      { id: 'close', label: '🚧 Close it today', perf: 6, boss: -2, stress: 6 },
      { id: 'limit', label: '⚖️ Post a weight limit and monitor it', perf: 3, check: 'smarts' },
    ] },
  ],
  courts: [
    { id: 'evict', title: 'Eviction Docket', text: 'Eighty eviction cases are on today\'s docket. Most tenants have no lawyer.', options: [
      { id: 'mediate', label: '🤝 Push every case to mediation first', perf: 4, stress: 6 },
      { id: 'move', label: '📂 Keep the docket moving', perf: 3, boss: 2 },
    ] },
  ],
  prosecution: [
    { id: 'plea', title: 'Plea Offer', text: 'A teenager is charged with armed robbery. The evidence is solid but he has no record.', options: [
      { id: 'youth', label: '🧑‍⚖️ Offer youthful-offender treatment', perf: 2 },
      { id: 'trial', label: '⚖️ Take it to trial for the full sentence', perf: 6, stress: 6, check: 'smarts' },
    ] },
    { id: 'brady', title: 'Late Evidence', text: 'The night before trial, a detective hands you a report that undermines your key witness.', options: [
      { id: 'disclose', label: '📨 Disclose it to the defense', perf: 1, boss: -2 },
      { id: 'bury', label: '🗄️ Leave it in the file', perf: 6, stress: 8, offense: 'prosecutorialMisconduct' },
    ] },
  ],
  publicDefender: [
    { id: 'innocent', title: 'An Innocent Client', text: 'You are sure your client is innocent, but the DA offers time served if he pleads guilty today.', options: [
      { id: 'trial', label: '⚖️ Advise him to go to trial', perf: 6, stress: 8, check: 'smarts' },
      { id: 'plead', label: '🤝 Advise him to take the deal', perf: 2 },
    ] },
  ],
  legislativeStaff: [
    { id: 'lobbyist', title: 'Lobbyist Lunch', text: 'A lobbyist offers you dinner at the best steakhouse in the capital "to talk about the bill."', options: [
      { id: 'decline', label: '🙅 Decline and meet in the office', perf: 3 },
      { id: 'dinner', label: '🥩 Accept the dinner', perf: 4, boss: 2, stress: 2 },
    ] },
  ],
  university: [
    { id: 'student', title: 'Struggling Student', text: 'A brilliant first-generation student is about to drop out to support her family.', options: [
      { id: 'mentor', label: '🎓 Find her a paid research position', perf: 4, stress: 4 },
      { id: 'refer', label: '📋 Refer her to student services', perf: 1 },
    ] },
  ],
};

export const eventPool = (professionId) => [{ id: 'main', ...EVENTS[professionId] }, ...(MORE_EVENTS[professionId] ?? [])];
const findEvent = (professionId, eventId = 'main') => eventPool(professionId).find((e) => e.id === eventId) ?? eventPool(professionId)[0];

export const StateAgencies = {
  id: 'stateAgencies',
  order: 27,

  onAgeUp(ctx) {
    const job = ctx.state.career.job;
    if (!job || !STATE_PROFESSIONS[job.professionId] || !ctx.rng.chance(0.35)) return;
    if (job.professionId === 'cps') ctx.stat('stress', 6);
    const e = pickFresh(ctx.rng, ctx.state, `agency.${job.professionId}`, eventPool(job.professionId));
    ctx.prompt({
      type: 'stateAgencies.event',
      icon: STATE_PROFESSIONS[job.professionId].icon,
      title: e.title,
      text: `${job.employer.name}\n${e.text}`,
      options: e.options.map((o) => ({ id: o.id, label: o.label, tone: o.risk ? 'danger' : undefined })),
      data: { professionId: job.professionId, eventId: e.id },
    });
  },

  resolvers: {
    event(ctx, data, optionId) {
      const { state, rng } = ctx;
      const event = findEvent(data.professionId, data.eventId);
      const o = event.options.find((x) => x.id === optionId);
      let perf = o.perf ?? 0;
      if (o.check && state.stats[o.check] + rng.int(-15, 15) < 55) {
        perf = -3;
        ctx.log('It didn\'t go the way you planned.', '😬', 'warn');
      }
      if (o.risk && rng.chance(o.risk)) {
        const dmg = rng.int(5, 20);
        ctx.stat('health', -dmg);
        ctx.log(`You were hurt (−${dmg} health).`, '🩹', 'bad');
      }
      if (o.outcome) {
        // CPS calls are judged in hindsight.
        const abused = rng.chance(0.5);
        if (o.outcome === 'close' && abused) {
          perf = -20;
          ctx.log('Two months later the child was hospitalized. The press wants to know who closed the case.', '📰', 'bad');
          ctx.stat('happiness', -12);
        } else if (o.outcome === 'removal' && !abused) {
          perf = -6;
          ctx.log('The bruises really were from a fall. The family is suing the department.', '⚖️', 'warn');
        } else ctx.log('Your judgment held up.', '🧸', 'good');
      }
      if (o.stress) ctx.stat('stress', o.stress);
      if (o.offense) ctx.emit('legal:offense', { offenseId: o.offense, context: event.title.toLowerCase(), discovery: 0.3, evidence: 0.7 });
      ctx.log(`${event.title}: ${o.label.slice(2).trim()}.`, '🏛️');
      ctx.emit('career:adjust', { performance: clamp(perf, -30, 30), boss: o.boss ?? 0 });
    },
  },
};
