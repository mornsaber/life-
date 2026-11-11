/**
 * Prisons, probation, investigation and security: the academy and specialist courses,
 * secondments, long-service and bravery awards, the prisons inspectorate and the licensing
 * authority, the governor's and the warden's chair. Security, parks, wardens and animal control
 * come here too.
 */
import { yearNow } from '../../world/Eras.js';
import { MANAGEMENT, UNION, PUBLIC_SERVICE, regulatorFrom } from './blocks.js';

const y = (s) => yearNow(s);
const cc = (s) => s.character.countryId ?? 'US';
const prof = (s) => s.career?.job?.professionId;
const PRISONS = ['corrections', 'jail', 'federalPrisons', 'privatePrisons', 'probation'];
const PRIVATE = ['privateInvestigator', 'bailBonds', 'privateSecurity', 'privateMilitary'];
const WARDENS = ['gameWarden', 'parkService', 'animalControl'];

export const JUSTICE = {
  id: 'justice',
  name: 'Custody, Security & Wardens',
  professions: [...PRISONS, 'forensics', ...PRIVATE, 'tsa', ...WARDENS],
  use: [MANAGEMENT, UNION],
  specialtyAt: 3,
  specialties: [
    { id: 'highSecurity', name: 'High-security wings', icon: '🔒', professions: PRISONS },
    { id: 'rehab', name: 'Rehabilitation and education', icon: '📚', professions: PRISONS },
    { id: 'youth', name: 'Young offenders', icon: '🧒', professions: PRISONS },
    { id: 'dna', name: 'DNA', icon: '🧬', from: 1987, professions: ['forensics'] },
    { id: 'ballistics', name: 'Firearms and ballistics', icon: '🎯', professions: ['forensics'] },
    { id: 'closeProtection', name: 'Close protection', icon: '🕶️', professions: ['privateSecurity', 'privateMilitary'] },
    { id: 'poaching', name: 'Anti-poaching', icon: '🦌', professions: ['gameWarden', 'parkService'] },
    { id: 'interpretation', name: 'Interpretation and guiding', icon: '🧭', professions: ['parkService'] },
  ],
  courses: [
    { id: 'controlRestraint', name: (s) => (y(s) < 1980 ? 'a restraint course' : 'control and restraint'), icon: '🛡️', from: 1950, professions: PRISONS, minGrade: 1, cost: 0, renew: 3, perf: 2 },
    { id: 'hostage', name: 'hostage incident response', icon: '☎️', from: 1975, professions: PRISONS, minGrade: 4, cost: 0, perf: 3 },
    { id: 'forensicCourt', name: 'expert witness training', icon: '⚖️', from: 1950, professions: ['forensics', 'privateInvestigator'], minGrade: 3, cost: 1500, perf: 4 },
    { id: 'siaLicence', name: (s) => (cc(s) === 'GB' && y(s) >= 2003 ? 'an SIA licence course' : 'a security officer\'s course'), icon: '🪪', from: 1960, professions: ['privateSecurity', 'privateMilitary', 'tsa'], minGrade: 1, cost: 300, renew: 3, perf: 2 },
    { id: 'wildlife', name: 'a wildlife crime course', icon: '🦌', from: 1970, professions: WARDENS, minGrade: 2, cost: 0, perf: 3 },
  ],
  postingOdds: 0.07,
  postings: [
    { id: 'prisonAbroad', name: 'Advising a Prison Service Abroad', icon: '🌍', from: 1990, professions: PRISONS, minGrade: 5, years: 1, places: ['IQ', 'AF', 'XK', 'SL', 'UA', 'KE', 'JM'], happiness: 3, stress: 5, text: 'An overseas aid programme wants experienced prison staff to help rebuild a prison service.' },
    { id: 'contract', name: 'A Security Contract Abroad', icon: '🛡️', from: 1970, professions: ['privateSecurity', 'privateMilitary'], minGrade: 3, years: 1, places: ['IQ', 'AF', 'NG', 'SO', 'LY', 'AE', 'SA'], happiness: 1, stress: 8, text: 'A contract abroad pays three times your wage. The risks are the reason.' },
    { id: 'nationalPark', name: 'A Season in a Remote Park', icon: '🏔️', professions: WARDENS, minGrade: 2, years: 1, happiness: 6, stress: 1, text: 'A remote national park needs a warden for the season.' },
  ],
  awards: [
    { id: 'prisonMedal', name: (s) => (cc(s) === 'GB' ? 'the Prison Service Long Service Medal' : 'a corrections long-service award'), icon: '🎖️', from: 2010, professions: PRISONS, minYears: 20, chance: 0.5, prestige: 1 },
    { id: 'braveryCustody', name: 'a bravery award for a riot', icon: '🏅', from: 1970, professions: PRISONS, minYears: 2, minPerformance: 85, chance: 0.02, prestige: 2, text: 'You were decorated for your conduct during a riot.' },
    { id: 'conservation', name: 'a conservation award', icon: '🌿', from: 1960, professions: WARDENS, minYears: 8, minPerformance: 80, chance: 0.05, prestige: 2 },
    ...PUBLIC_SERVICE.awards.filter((a) => a.id === 'longService'),
  ],
  licence: (s) => ({ privateInvestigator: 'piLicense', bailBonds: 'bailAgent', privateSecurity: 'guardCard', probation: 'probationCert', forensics: 'forensicCert' })[prof(s)] ?? null,
  regulator: (s) => (PRISONS.includes(prof(s))
    ? regulatorFrom({ GB: ['the Prisons and Probation Ombudsman', 1994], US: ['the department\'s internal affairs unit', 1960], '*': ['the prisons inspectorate', 1970] })(s)
    : ['privateSecurity', 'privateInvestigator', 'bailBonds'].includes(prof(s)) ? regulatorFrom({ GB: ['the Security Industry Authority', 2003], US: ['the state licensing bureau', 1960] })(s) : regulatorFrom({})(s)),
  complaintOdds: 0.018,
  complaints: [
    { id: 'contraband', short: 'smuggling contraband', severity: 3, weight: (s) => (PRISONS.includes(prof(s)) ? 1.5 : 0), founded: 0.45, text: 'A phone found in a cell has your number in it.' },
    { id: 'forcePrison', short: 'excessive force on a prisoner', severity: 2, weight: (s) => (PRISONS.includes(prof(s)) ? 2 : 0.3), founded: 0.4, text: 'A prisoner\'s injuries don\'t match your report.' },
    { id: 'contamination', short: 'contaminated evidence', severity: 2, weight: (s) => (prof(s) === 'forensics' ? 3 : 0), founded: 0.45, text: 'A defence expert says your lab contaminated the key sample.' },
    { id: 'trespass', short: 'unlawful surveillance', severity: 2, weight: (s) => (prof(s) === 'privateInvestigator' ? 2 : 0), founded: 0.45, text: 'A man you followed says you bugged his car.' },
    { id: 'sleeping', short: 'sleeping on duty', severity: 1, weight: 2, founded: 0.6, text: 'A supervisor found you asleep on a night shift.' },
  ],
  eliteOdds: 0.035,
  elite: [
    { id: 'governor', name: (s) => (cc(s) === 'GB' ? 'Governor of a high-security prison' : 'Warden of a maximum-security prison'), icon: '🏰', professions: PRISONS, minGrade: 6, minYears: 18, years: 6, prestige: 3, stipend: 8000, text: 'The prison service wants you running one of its most difficult jails.' },
    { id: 'chiefInspector', name: (s) => (cc(s) === 'GB' ? 'HM Chief Inspector of Prisons' : 'Inspector of prisons'), icon: '📋', from: 1981, professions: PRISONS, minGrade: 7, minYears: 22, minAwards: 1, years: 5, prestige: 4, stipend: 20000, text: 'The government asks you to inspect the country\'s prisons.' },
    { id: 'parkChief', name: 'Superintendent of a great national park', icon: '🏞️', professions: ['parkService', 'gameWarden'], minGrade: 6, minYears: 18, years: 8, prestige: 3, stipend: 6000, text: 'You\'ve been chosen to run one of the country\'s great parks.' },
  ],
};
