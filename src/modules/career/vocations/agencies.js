/**
 * Federal law enforcement and intelligence: the academies are credentials already; this adds the
 * specialised training, field-office and overseas rotations (legal attachés, liaison posts), the
 * agencies' own medals and the intelligence stars, the inspector general and the security review,
 * and the director's and attaché's chairs.
 */
import { yearNow } from '../../world/Eras.js';
import { PUBLIC_SERVICE, regulatorFrom } from './blocks.js';

const y = (s) => yearNow(s);
const cc = (s) => s.character.countryId ?? 'US';
const prof = (s) => s.career?.job?.professionId;
const AGENTS = ['fbi', 'dea', 'atf', 'usms', 'usss', 'borderPatrol'];
const SPIES = ['intelligence', 'caseOfficer', 'sigint'];

export const AGENCIES = {
  id: 'agencies',
  name: 'The Agency',
  professions: [...AGENTS, ...SPIES],
  use: [PUBLIC_SERVICE],
  specialtyAt: 6,
  specialtyTitle: 'Your Squad',
  specialties: [
    { id: 'violent', name: 'Violent crime', icon: '🔫', professions: AGENTS },
    { id: 'organised', name: 'Organised crime', icon: '🕴️', professions: AGENTS },
    { id: 'counterterror', name: (s) => (y(s) < 1970 ? 'Subversion' : 'Counterterrorism'), icon: '💣', professions: [...AGENTS, ...SPIES] },
    { id: 'counterintel', name: 'Counterintelligence', icon: '🕵️', professions: [...AGENTS, ...SPIES] },
    { id: 'financial', name: 'Financial crime', icon: '💵', professions: AGENTS },
    { id: 'cyber', name: 'Cyber', icon: '💻', from: 1998, professions: [...AGENTS, ...SPIES] },
    { id: 'region', name: 'A region of the world', icon: '🗺️', professions: SPIES },
  ],
  courses: [
    { id: 'language', name: 'a hard-language course (Arabic, Russian, Mandarin)', icon: '🗣️', from: 1946, minGrade: 5, cost: 0, years: 1, perf: 5 },
    { id: 'undercover', name: 'undercover certification', icon: '🎭', from: 1970, professions: AGENTS, minGrade: 6, cost: 0, perf: 4 },
    { id: 'tradecraft', name: (s) => (y(s) < 1950 ? 'the special training school' : 'advanced tradecraft at the Farm'), icon: '🗝️', from: 1941, professions: SPIES, minGrade: 5, cost: 0, perf: 4 },
    { id: 'polygraph', name: 'the periodic reinvestigation', icon: '📋', from: 1950, professions: SPIES, minGrade: 5, cost: 0, renew: 5, perf: 0 },
  ],
  postingOdds: 0.09,
  postings: [
    { id: 'legat', name: (s) => (prof(s) === 'fbi' ? 'A Legal Attaché Post' : SPIES.includes(prof(s)) ? 'A Station Abroad' : 'An Overseas Liaison Post'), icon: '🌍', minGrade: 7, years: 3, places: ['GB', 'FR', 'DE', 'MX', 'CO', 'TH', 'PK', 'JO', 'TR', 'JP', 'IT', 'AF'], happiness: 3, stress: 5,
      text: 'The agency wants you abroad for three years, working with the local services.', end: () => 'You came home from your posting abroad. Half of what you did there you can never mention.' },
    { id: 'taskForce', name: 'A Joint Task Force', icon: '🤝', from: 1970, professions: AGENTS, minGrade: 6, years: 2, happiness: 1, stress: 5, performance: 5, text: 'A joint task force against a cartel wants you on loan for two years.' },
    { id: 'hq', name: 'A Headquarters Tour', icon: '🏛️', minGrade: 7, years: 2, happiness: 0, stress: 2, text: 'Headquarters needs you on the policy staff for two years.' },
  ],
  awards: [
    { id: 'starHonour', name: (s) => (cc(s) === 'US' ? (SPIES.includes(prof(s)) ? 'the Intelligence Star' : 'the Director\'s Award for Excellence') : 'the agency\'s medal for distinguished service'), icon: '⭐', from: 1950, minGrade: 6, minPerformance: 88, chance: 0.04, prestige: 3, text: 'The director presented you with the agency\'s award, behind closed doors.' },
    { id: 'shield', name: (s) => (cc(s) === 'US' && prof(s) === 'fbi' ? 'the FBI Shield of Bravery' : 'a medal for bravery'), icon: '🛡️', from: 1950, professions: AGENTS, minGrade: 5, minPerformance: 85, chance: 0.02, prestige: 3 },
    { id: 'distinguishedIntel', name: 'the Distinguished Intelligence Medal', icon: '🏅', from: 1950, countries: ['US'], professions: SPIES, minGrade: 8, minYears: 15, minPerformance: 90, chance: 0.02, prestige: 5, awards: ['starHonour'] },
  ],
  regulator: (s) => regulatorFrom({ US: [y(s) < 1989 ? 'the Office of Professional Responsibility' : 'the Inspector General', 1975], GB: ['the Investigatory Powers Commissioner', 2017], '*': ['the agency\'s inspectorate', 1970] })(s),
  erasureWord: 'had you fired and your clearance pulled',
  complaintOdds: 0.016,
  complaints: [
    { id: 'informant', short: 'an informant', severity: 2, weight: (s) => (AGENTS.includes(prof(s)) ? 2 : 0.5), founded: 0.45, text: 'An informant you ran has been charged with crimes committed while working for you.' },
    { id: 'spillage', short: 'mishandling classified material', severity: 2, weight: 2, founded: 0.5, from: 1940, text: 'A classified document was found in your car.' },
    { id: 'contact', short: 'an unreported foreign contact', severity: 2, weight: (s) => (SPIES.includes(prof(s)) ? 2 : 0.5), founded: 0.45, text: 'Your relationship with a foreign national came up in your reinvestigation.' },
    { id: 'forceAgent', short: 'a shooting', severity: 2, weight: (s) => (AGENTS.includes(prof(s)) ? 1 : 0), founded: 0.35, text: 'You fired your weapon during an arrest. The review is mandatory.' },
  ],
  eliteOdds: 0.035,
  elite: [
    { id: 'sac', name: (s) => (SPIES.includes(prof(s)) ? 'Chief of Station in a major capital' : (s.character?.countryId ?? 'US') === 'US' ? 'Special Agent in Charge of a major field office' : 'Head of a regional investigations bureau'), icon: '🏢', minGrade: 8, minYears: 18, years: 4, prestige: 3, stipend: 10000, text: 'The director wants you running one of the agency\'s most important offices.' },
    { id: 'director', name: (s) => (SPIES.includes(prof(s)) ? 'Deputy Director of the agency' : 'Deputy Director of the bureau'), icon: '🏛️', minGrade: 9, minYears: 24, minAwards: 1, years: 4, prestige: 5, stipend: 20000, text: 'You\'ve been chosen as the agency\'s deputy director.' },
  ],
};
