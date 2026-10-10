/**
 * Elected (and appointed) offices.
 *
 *   level      rung on the political ladder (stepping stones help)
 *   term       years per term · termLimit: max terms (0 = none)
 *   fullTime   full-time offices end your civilian job
 *   residency  years living in the state before you can run
 *   cost       what a competitive campaign costs
 *   pension    retirement plan service credit accrues to
 *   req        credentials/experience the law requires of candidates (sheriffs must be
 *              certified peace officers; district attorneys must be practicing lawyers)
 *   appointedBy  not elected: you apply and the body named here hires you; at the end
 *              of each contract it renews you if your approval holds up
 *   kind       decision style in office (legislative, executive, judicial, prosecutor, sheriff)
 */
import { NATIONAL_OFFICES } from './NationalOffices.js';

export const OFFICES = {
  schoolBoard: { name: 'School Board Member', icon: '🏫', level: 1, term: 4, termLimit: 0, salary: 6000, fullTime: false, minAge: 18, residency: 1, cost: 8000, pension: 'electedOfficials' },
  cityCouncil: { name: 'City Council Member', icon: '🏙️', level: 1, term: 4, termLimit: 3, salary: 35000, fullTime: false, minAge: 18, residency: 1, cost: 25000, pension: 'electedOfficials' },
  countyCommissioner: { name: 'County Commissioner', icon: '🏞️', level: 1, term: 4, termLimit: 0, salary: 55000, fullTime: false, minAge: 18, residency: 1, cost: 40000, pension: 'electedOfficials', kind: 'executive' },
  cityManager: { name: 'City Manager', icon: '🏢', level: 2, term: 4, termLimit: 0, salary: 210000, fullTime: true, minAge: 25, residency: 0, cost: 0, pension: 'electedOfficials', kind: 'executive', appointedBy: 'the city council',
    req: { education: { level: 'bachelor' }, experience: { professions: ['municipalAdmin', 'planning', 'publicWorks'], years: 8 } } },
  sheriff: { name: 'County Sheriff', icon: '⭐', level: 2, term: 4, termLimit: 0, salary: 135000, fullTime: true, minAge: 21, residency: 1, cost: 120000, pension: 'electedOfficials', kind: 'sheriff',
    req: { credentials: ['post'], experience: { professions: ['sheriff', 'police', 'statePolice', 'privatePolice', 'jail', 'corrections'], years: 5 } } },
  districtAttorney: { name: 'District Attorney', icon: '👩‍⚖️', level: 2, term: 4, termLimit: 0, salary: 185000, fullTime: true, minAge: 25, residency: 1, cost: 180000, pension: 'electedOfficials', kind: 'prosecutor',
    req: { credentials: ['barLicense'], experience: { professions: ['prosecution', 'law', 'publicDefender'], years: 5 } } },
  mayor: { name: 'Mayor', icon: '🏛️', level: 2, term: 4, termLimit: 2, salary: 140000, fullTime: true, minAge: 21, residency: 2, cost: 250000, pension: 'electedOfficials' },
  stateRep: { name: 'State Representative', icon: '📜', level: 2, term: 2, termLimit: 4, salary: 65000, fullTime: false, minAge: 21, residency: 1, cost: 120000, pension: 'electedOfficials' },
  stateSenator: { name: 'State Senator', icon: '🏛️', level: 3, term: 4, termLimit: 2, salary: 78000, fullTime: false, minAge: 25, residency: 2, cost: 400000, pension: 'electedOfficials' },
  judge: { name: 'State Trial Court Judge', icon: '⚖️', level: 3, term: 6, termLimit: 0, salary: 185000, fullTime: true, minAge: 30, residency: 2, cost: 150000, pension: 'electedOfficials', judicial: true },
  usRep: { name: 'U.S. Representative', icon: '🇺🇸', level: 4, term: 2, termLimit: 0, salary: 174000, fullTime: true, minAge: 25, residency: 1, cost: 2000000, pension: 'fers' },
  governor: { name: 'Governor', icon: '⭐', level: 5, term: 4, termLimit: 2, salary: 190000, fullTime: true, minAge: 30, residency: 5, cost: 9000000, pension: 'electedOfficials', executive: true, statewide: true },
  usSenator: { name: 'U.S. Senator', icon: '🦅', level: 5, term: 6, termLimit: 0, salary: 174000, fullTime: true, minAge: 30, residency: 3, cost: 18000000, pension: 'fers', statewide: true },
};

// Offices abroad resolve by id but stay out of US iteration (Object.keys/values of OFFICES are unchanged).
for (const [id, o] of Object.entries(NATIONAL_OFFICES)) Object.defineProperty(OFFICES, id, { value: o, enumerable: false });

export const OFFICE_ORDER = ['schoolBoard', 'cityCouncil', 'countyCommissioner', 'cityManager', 'sheriff', 'districtAttorney', 'mayor', 'stateRep', 'stateSenator', 'judge', 'usRep', 'governor', 'usSenator'];

export const ENDORSEMENTS = {
  labor: { name: 'Labor unions', icon: '✊' },
  veterans: { name: 'Veterans groups', icon: '🎖️' },
  lawEnforcement: { name: 'Police & firefighter unions', icon: '🚓' },
  party: { name: 'Party establishment', icon: '🐘' },
  editorial: { name: 'Newspaper editorial boards', icon: '📰' },
  bar: { name: 'State Bar Association', icon: '⚖️' },
  parents: { name: 'PTA parents & teachers', icon: '🍎' },
  activists: { name: 'Grassroots activists', icon: '📣' },
};
