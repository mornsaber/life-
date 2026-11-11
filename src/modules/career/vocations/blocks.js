/**
 * Shared pieces for vocation packs (career/Vocations.js): a pack lists the blocks it `use`s and
 * gets their courses, postings, awards, complaints and posts after its own.
 *
 * Gates are kept gentle on purpose: a block's courses gate management (`gateMgmt`) or a high
 * grade, never the first rungs, and an employer sends you on most of them itself.
 */
import { yearNow } from '../../world/Eras.js';

const y = (s) => yearNow(s);
const cc = (s) => s.character.countryId ?? 'US';
const job = (s) => s.career?.job;
/** Britain, the realms and the old Empire. */
export const COMMONWEALTH = ['GB', 'IE', 'AU', 'NZ', 'CA', 'IN', 'ZA', 'PK', 'MY', 'SG', 'HK', 'NG', 'GH', 'KE', 'JM', 'LK', 'BD', 'TT', 'MT', 'CY'];

/** Discipline where there's no licensing body: the employer's own panel. */
export const employerPanel = (s) => ({ name: `${job(s)?.employer?.name ?? 'your employer'}'s disciplinary panel`, from: 0 });
/** A regulator from a table of { country: [name, from] }, else the employer's panel. */
export const regulatorFrom = (table, fallback = employerPanel) => (s) => {
  const r = table[cc(s)] ?? table['*'];
  if (r && y(s) >= r[1]) return { name: r[0], from: r[1] };
  return fallback ? fallback(s) : null;
};

/** The complaints any workplace hears. */
export const WORKPLACE_COMPLAINTS = [
  { id: 'conduct', short: 'your conduct with a colleague', severity: 1, weight: 3, founded: 0.5, text: 'A colleague has made a formal complaint about the way you spoke to them in front of the team.' },
  { id: 'timekeeping', short: 'timekeeping', severity: 0, weight: 3, founded: 0.6, text: 'Your timesheets don\'t match the door-entry records.' },
  { id: 'safety', short: 'a safety breach', severity: 1, weight: 2, founded: 0.5, text: 'An incident report names you for skipping a safety procedure.' },
  { id: 'expenses', short: 'your expenses', severity: 2, weight: 1, founded: 0.45, text: 'An audit has queried a year of your expense claims.' },
];

/** Management, everywhere: a course before the management rungs. */
export const MANAGEMENT = {
  courses: [
    { id: 'management', name: (s) => (y(s) < 1960 ? 'a foremen\'s and supervisors\' course' : y(s) < 1990 ? 'a management course' : 'a leadership and management programme'), icon: '🧭', from: 1920, cost: 3000, gateMgmt: true, minGrade: 1 },
  ],
};

/** Unions: the branch and the national executive, from the year unions were lawful. */
const UNION_FROM = { GB: 1871, US: 1890, FR: 1884, DE: 1869, AU: 1880, NZ: 1894, CA: 1872, IE: 1871, SE: 1890, IT: 1890, JP: 1945, IN: 1926 };
export const UNION = {
  elite: [
    { id: 'unionBranch', name: 'Branch Secretary of your union', icon: '✊', when: (s) => y(s) >= (UNION_FROM[cc(s)] ?? 1945), minGrade: 2, minYears: 6, years: 4, prestige: 1, stipend: 1500,
      text: 'The branch has nominated you as its secretary: grievances, negotiations, the meeting in the back room every month.' },
    { id: 'unionNational', name: 'General Secretary of your union', icon: '✊', when: (s) => y(s) >= (UNION_FROM[cc(s)] ?? 1945), minGrade: 3, minYears: 18, minAwards: 0, years: 5, prestige: 4, stipend: 30000,
      text: 'The members have elected you General Secretary of the national union: ministers return your calls now.' },
  ],
};

/** Guilds and apprenticeship: indentures before the modern qualifications. */
export const GUILD = {
  courses: [
    { id: 'indentures', name: (s) => (y(s) < 1900 ? 'your indentures (a guild apprenticeship)' : 'an indentured apprenticeship'), icon: '📜', until: 1965, cost: 0, perf: 5 },
  ],
  awards: [
    { id: 'freedom', name: (s) => (y(s) < 1900 ? 'the freedom of your guild' : 'the freedom of your livery company'), icon: '🗝️', countries: ['GB'], minGrade: 3, minYears: 7, chance: 0.08, prestige: 1, text: 'You were made free of your trade\'s livery company in the City: a scroll, a dinner and the right to drive sheep over London Bridge.' },
  ],
  elite: [
    { id: 'master', name: (s) => (y(s) < 1900 ? 'Master of your guild' : 'Master of your livery company'), icon: '🏛️', countries: ['GB'], minGrade: 4, minYears: 20, minAwards: 1, years: 1, prestige: 3,
      text: 'The court of your livery company has elected you its Master for the year: gowns, banquets and the charity\'s accounts.' },
  ],
};

/** The public service everywhere: an exam in (from its year), a senior course, honours for long service. */
const CIVIL_EXAM_FROM = { GB: 1870, US: 1883, IN: 1855, FR: 1945, JP: 1894, DE: 1873, CA: 1908, AU: 1902, NZ: 1912, IE: 1923 };
export const PUBLIC_SERVICE = {
  courses: [
    { id: 'seniorCourse', name: (s) => (cc(s) === 'GB' && y(s) >= 1970 ? 'the Civil Service College senior course' : cc(s) === 'US' && y(s) >= 1968 ? 'the Federal Executive Institute' : cc(s) === 'FR' && y(s) >= 1945 ? 'the École nationale d\'administration' : 'the senior administrators\' course'), icon: '🏛️', from: 1945, cost: 6000, gateMgmt: true, minGrade: 5 },
  ],
  awards: [
    { id: 'longService', name: (s) => (cc(s) === 'GB' ? 'the Imperial Service Medal' : 'a long-service award'), icon: '🎖️', from: 1902, minYears: 25, chance: 0.4, prestige: 1, text: (s) => (cc(s) === 'GB' ? 'You were awarded the Imperial Service Medal for twenty-five years in the public service.' : 'Twenty-five years: the agency presented your long-service award.') },
    { id: 'meritorious', name: (s) => (cc(s) === 'US' ? 'a Distinguished Service Award' : 'a commendation for public service'), icon: '🏅', minGrade: 5, minYears: 12, minPerformance: 85, chance: 0.08, prestige: 2, text: 'The agency recognised your service with its highest civilian award.' },
  ],
  complaints: [
    { id: 'leak', short: 'an unauthorised disclosure', severity: 2, weight: 0.6, founded: 0.4, text: 'An internal investigation suspects you of leaking a draft to the press.' },
    { id: 'favour', short: 'a conflict of interest', severity: 1, weight: 1, founded: 0.45, text: 'A contractor you oversaw turns out to employ your cousin.' },
  ],
  exam: (s) => (y(s) >= (CIVIL_EXAM_FROM[cc(s)] ?? 1950) ? 'the civil service examination' : null),
};

/** Postings any field can offer: a secondment, a stint abroad. */
export const SECONDMENT = (o = {}) => ({ id: 'secondment', name: 'A Secondment', icon: '🔁', minGrade: 4, years: 2, happiness: 2, stress: 2, performance: 3, text: o.text ?? 'Head office wants you seconded to another division for two years: a new team, a wider view.', ...o });
export const ABROAD = (places, o = {}) => ({ id: 'abroad', name: 'A Posting Abroad', icon: '🌍', minGrade: 4, years: 2, places, happiness: 4, stress: 4, text: o.text ?? 'The firm needs someone it trusts in its office abroad, for two years.', ...o });
