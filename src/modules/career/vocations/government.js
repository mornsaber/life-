/**
 * The civil service and diplomacy: the senior course and the honours of the public service
 * (the CMG and its knighthoods come with prestige, through world/Honours.js), language and staff
 * college; secondments, postings abroad, the Cabinet Office; the civil service commission's
 * discipline; the permanent secretary's chair and the ambassador's residence.
 */
import { yearNow } from '../../world/Eras.js';
import { PUBLIC_SERVICE, UNION, SECONDMENT, regulatorFrom, COMMONWEALTH } from './blocks.js';

const y = (s) => yearNow(s);
const cc = (s) => s.character.countryId ?? 'US';
const prof = (s) => s.career?.job?.professionId;
const DIPLOMATS = ['foreignService'];

export const GOVERNMENT = {
  id: 'government',
  name: 'The Public Service',
  professions: ['municipalAdmin', 'councilInspector', 'legislativeStaff', 'benefitsClaims', 'revenue', 'regulatory', 'dot', 'planning', 'foreignService', 'postal'],
  use: [PUBLIC_SERVICE, UNION],
  specialtyAt: 4,
  specialties: [
    { id: 'policy', name: 'Policy', icon: '📜' },
    { id: 'operations', name: 'Operations and delivery', icon: '⚙️' },
    { id: 'finance', name: 'Finance', icon: '💰' },
    { id: 'political', name: 'Political work', icon: '🏛️', professions: DIPLOMATS },
    { id: 'economic', name: 'Economic and trade', icon: '📈', professions: DIPLOMATS },
    { id: 'consular', name: 'Consular work', icon: '🛂', professions: DIPLOMATS },
  ],
  courses: [
    { id: 'staffCollege', name: (s) => (cc(s) === 'GB' && y(s) >= 1970 ? 'a course at the Civil Service College' : 'the administrative staff college'), icon: '🏛️', from: 1946, minGrade: 4, cost: 0, perf: 3 },
    { id: 'diplomaticLanguage', name: 'a hard-language course for diplomats', icon: '🗣️', from: 1946, professions: DIPLOMATS, minGrade: 4, cost: 0, years: 1, perf: 5 },
    { id: 'economics', name: 'a course in economics for officials', icon: '📊', from: 1945, minGrade: 4, cost: 0, perf: 3 },
    { id: 'planningCert', name: (s) => (y(s) < 1970 ? 'the Town Planning Institute examinations' : 'chartered membership of the planning institute'), icon: '🗺️', from: 1914, professions: ['planning'], minGrade: 3, cost: 1500, passRate: 0.7, perf: 4 },
  ],
  postingOdds: 0.08,
  postings: [
    { ...SECONDMENT({ text: 'The central policy unit wants you on loan for two years.' }), id: 'centre', name: (s) => (cc(s) === 'GB' ? 'A Secondment to the Cabinet Office' : 'A Secondment to the Head of Government\'s Office'), icon: '🏛️', minGrade: 6, performance: 5 },
    { id: 'privateOffice', name: 'The Minister\'s Private Office', icon: '🗂️', minGrade: 5, years: 2, happiness: 2, stress: 6, performance: 5, text: 'The minister needs a private secretary: every red box, every crisis, every weekend.' },
    { id: 'international', name: (s) => (y(s) < 1945 ? 'A Post at the League of Nations' : 'A Secondment to an International Organisation'), icon: '🌐', from: 1920, minGrade: 6, years: 2, places: ['CH', 'BE', 'FR', 'US', 'AT', 'IT'], happiness: 4, stress: 3, text: 'An international organisation wants a national expert on secondment.' },
  ],
  awards: [
    { id: 'iso', name: (s) => (COMMONWEALTH.includes(cc(s)) ? 'the Imperial Service Order (ISO)' : 'a public service order'), icon: '🎗️', from: 1902, until: 1995, minGrade: 6, minYears: 20, minPerformance: 70, chance: 0.08, prestige: 2, post: null },
    { id: 'diplomaticMedal', name: (s) => (cc(s) === 'US' ? 'the Secretary\'s Distinguished Service Award' : 'a foreign ministry commendation'), icon: '🏅', professions: DIPLOMATS, minGrade: 7, minPerformance: 85, chance: 0.05, prestige: 3 },
  ],
  regulator: (s) => regulatorFrom({ GB: ['the Civil Service Commission', 1855], US: ['the Merit Systems Protection Board', 1979], FR: ['the conseil de discipline', 1946], '*': ['the civil service commission', 1950] })(s),
  complaintOdds: 0.014,
  complaints: [
    { id: 'favouritism', short: 'favouritism in a contract', severity: 2, weight: 2, founded: 0.45, text: 'A rival bidder says you steered a contract to a friend\'s firm.' },
    { id: 'bribe', short: 'accepting a gift', severity: 2, weight: 1, founded: 0.45, text: 'A developer\'s gift to you came to light weeks before a planning decision.' },
    { id: 'misconductVisa', short: 'issuing a visa improperly', severity: 2, weight: (s) => (DIPLOMATS.includes(prof(s)) ? 2 : 0), founded: 0.45, text: 'A visa you issued went to a man on a watch list.' },
  ],
  eliteOdds: 0.04,
  elite: [
    { id: 'permSec', name: (s) => (COMMONWEALTH.includes(cc(s)) ? 'Permanent Secretary of a department' : 'Head of a government department\'s civil service'), icon: '🏛️', professions: ['municipalAdmin', 'regulatory', 'revenue', 'benefitsClaims', 'planning', 'dot'], minGrade: 8, minYears: 25, minAwards: 0, years: 6, prestige: 6, stipend: 30000, text: 'You\'ve been chosen as the department\'s most senior civil servant.' },
    { id: 'ambassador', name: 'Ambassador to a great power', icon: '🌍', professions: DIPLOMATS, minGrade: 8, minYears: 22, years: 4, prestige: 6, stipend: 20000, text: 'The foreign ministry proposes you as ambassador to one of the great capitals.' },
    { id: 'clerk', name: (s) => (cc(s) === 'GB' ? 'Clerk of the House' : 'Chief clerk of the legislature'), icon: '📜', professions: ['legislativeStaff'], minGrade: 7, minYears: 25, years: 8, prestige: 5, stipend: 15000, text: 'The legislature wants you as its chief clerk: keeper of its procedure and its precedents.' },
    { id: 'postmaster', name: (s) => (cc(s) === 'GB' ? 'Director of a national postal region' : 'Regional postmaster general'), icon: '📮', professions: ['postal'], minGrade: 7, minYears: 22, years: 6, prestige: 3, stipend: 8000, text: 'The post office wants you running one of its regions.' },
  ],
};
