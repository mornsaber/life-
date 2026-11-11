/**
 * Business, finance and property: the professional exams (chartered accountancy, actuarial
 * fellowship, the CFA), the MBA (Harvard's from 1908), the overseas office, the institute's
 * fellowship and presidency, and the regulators who strike off accountants and ban brokers.
 */
import { yearNow } from '../../world/Eras.js';
import { MANAGEMENT, WORKPLACE_COMPLAINTS, SECONDMENT, regulatorFrom, COMMONWEALTH } from './blocks.js';

const y = (s) => yearNow(s);
const cc = (s) => s.character.countryId ?? 'US';
const prof = (s) => s.career?.job?.professionId;
const chartered = (s) => COMMONWEALTH.includes(cc(s));

export const BUSINESS = {
  id: 'business',
  name: 'Business & Finance',
  professions: ['corporate', 'marketing', 'sales', 'humanResources', 'finance', 'accounting', 'actuary', 'insurance', 'realestate', 'propertyManagement', 'tradingCompany'],
  use: [MANAGEMENT],
  specialtyAt: 4,
  specialtyTitle: 'Where You Make Your Name',
  specialties: [
    { id: 'strategy', name: 'Strategy and planning', icon: '♟️', hint: 'The board\'s ear' },
    { id: 'operations', name: 'Operations', icon: '⚙️', hint: 'Making things actually happen' },
    { id: 'deals', name: 'Mergers and deals', icon: '🤝', from: 1890, hint: 'Long nights, big fees', professions: ['corporate', 'finance', 'accounting'] },
    { id: 'markets', name: 'Markets and trading', icon: '📈', hint: 'The floor, then the screen', professions: ['finance', 'actuary', 'insurance'] },
    { id: 'tax', name: 'Tax', icon: '🧾', from: 1913, hint: 'Every rule has a loophole', professions: ['accounting', 'finance', 'corporate'] },
    { id: 'brand', name: 'Brands and advertising', icon: '📣', from: 1880, hint: 'Slogans and campaigns', professions: ['marketing', 'sales', 'corporate'] },
    { id: 'people', name: 'People and organisation', icon: '👥', hint: 'Restructures and talent', professions: ['humanResources', 'corporate'] },
    { id: 'commercial', name: 'Commercial property', icon: '🏢', hint: 'Offices and shopping centres', professions: ['realestate', 'propertyManagement'] },
  ],
  courses: [
    { id: 'charteredAccountant', name: (s) => (chartered(s) ? 'the chartered accountancy examinations (ACA)' : 'the certified public accountant examination'), icon: '🧮', from: 1880, professions: ['accounting'], minGrade: 3, cost: 3000, passRate: 0.55, perf: 4, gateGrade: 6, post: null },
    { id: 'actuarialFellow', name: (s) => (chartered(s) ? 'fellowship of the Institute of Actuaries (FIA)' : 'fellowship of the Society of Actuaries (FSA)'), icon: '📊', from: 1848, professions: ['actuary'], minGrade: 5, cost: 4000, passRate: 0.5, perf: 3 },
    { id: 'cfa', name: 'the Chartered Financial Analyst examinations (CFA)', icon: '💹', from: 1963, professions: ['finance', 'insurance'], minGrade: 4, cost: 3500, passRate: 0.45, perf: 5 },
    { id: 'insuranceInstitute', name: (s) => (chartered(s) ? 'the Chartered Insurance Institute diploma' : 'the Chartered Property Casualty Underwriter designation'), icon: '🛡️', from: 1897, professions: ['insurance'], minGrade: 3, cost: 1500, passRate: 0.7, perf: 3 },
    { id: 'surveyor', name: 'membership of the Royal Institution of Chartered Surveyors', icon: '📏', from: 1881, countries: COMMONWEALTH, professions: ['realestate', 'propertyManagement'], minGrade: 3, cost: 2000, passRate: 0.7, perf: 3 },
    { id: 'personnel', name: (s) => (y(s) < 1990 ? 'the Institute of Personnel Management diploma' : 'a CIPD qualification'), icon: '👥', from: 1946, professions: ['humanResources'], minGrade: 3, cost: 2500, perf: 4 },
    { id: 'mba', name: (s) => (y(s) < 1960 ? 'a Master of Business Administration' : 'an MBA'), icon: '🎓', from: 1908, minGrade: 5, cost: 60000, years: 2, perf: 6 },
    { id: 'executive', name: 'an executive programme at a business school', icon: '🏛️', from: 1945, minGrade: 7, cost: 25000, perf: 3, gateGrade: 9 },
  ],
  postingOdds: 0.08,
  postings: [
    { ...SECONDMENT({ text: 'Head office wants you on the turnaround team at a struggling division for two years.' }), id: 'turnaround', name: 'The Turnaround Team', icon: '🔄', performance: 5 },
    { id: 'overseas', name: (s) => (y(s) < 1950 ? 'A Posting to the Firm\'s Overseas Agency' : 'The Overseas Office'), icon: '🌍', minGrade: 4, years: 3, places: ['GB', 'US', 'HK', 'SG', 'JP', 'DE', 'FR', 'AE', 'AU', 'BR', 'IN', 'AR'], happiness: 4, stress: 4,
      text: (s) => (y(s) < 1950 ? 'The firm needs a trusted man at its agency abroad for three years.' : 'The firm wants you to run part of its office abroad for three years.'), end: () => 'You came home from the overseas office with a better title and a taste for the expatriate life.' },
    { id: 'government', name: 'A Secondment to Government', icon: '🏛️', from: 1914, minGrade: 6, years: 1, happiness: 2, stress: 3,
      text: (s) => (y(s) < 1946 ? 'The ministry is borrowing businessmen to run war production. Will you serve for a year?' : 'A government department wants an executive from business for a year on a reform project.') },
  ],
  awards: [
    { id: 'fellowship', name: (s) => ({ accounting: chartered(s) ? 'Fellowship of the Institute of Chartered Accountants (FCA)' : 'a state society award for distinguished service', actuary: 'an honorary fellowship of the actuarial profession', insurance: 'Fellowship of the Chartered Insurance Institute', humanResources: 'Chartered Fellowship of the personnel institute', marketing: 'Fellowship of the Chartered Institute of Marketing' })[prof(s)] ?? 'a fellowship of your professional institute', icon: '🎓', minGrade: 6, minYears: 10, minPerformance: 65, chance: 0.15, prestige: 1 },
    { id: 'rising', name: (s) => (y(s) < 1990 ? 'a place on the "young executives to watch" list' : 'a "40 under 40" award'), icon: '⭐', from: 1950, minGrade: 5, minPerformance: 85, chance: 0.05, prestige: 1, when: (s) => s.character.age < 40, text: 'A business magazine named you one to watch.' },
    { id: 'industry', name: 'an industry lifetime achievement award', icon: '🏆', minGrade: 8, minYears: 25, minPerformance: 75, chance: 0.04, prestige: 3 },
  ],
  licence: (s) => ({ accounting: 'cpa', finance: 'series7', insurance: 'insuranceProducer', realestate: 'realEstate', propertyManagement: 'realEstate', actuary: 'soaFSA' })[prof(s)] ?? null,
  regulator: (s) => {
    const p = prof(s);
    if (p === 'finance') return regulatorFrom({ US: ['the Securities and Exchange Commission', 1934], GB: ['the Financial Conduct Authority', 2013], '*': ['the securities regulator', 1970] })(s).from > y(s) ? null : regulatorFrom({ US: [y(s) < 2007 ? 'the NASD' : 'FINRA', 1939], GB: [y(s) < 1986 ? 'the Stock Exchange council' : y(s) < 2001 ? 'the Securities and Investments Board' : y(s) < 2013 ? 'the Financial Services Authority' : 'the Financial Conduct Authority', 1900], '*': ['the securities regulator', 1970] })(s);
    if (p === 'accounting') return regulatorFrom({ GB: ['the Institute of Chartered Accountants', 1880], US: ['the state board of accountancy', 1896], '*': ['the accountancy institute', 1920] })(s);
    if (p === 'realestate' || p === 'propertyManagement') return regulatorFrom({ US: ['the state real estate commission', 1917], '*': ['the estate agents\' ombudsman', 1990] })(s);
    if (p === 'insurance') return regulatorFrom({ US: ['the state insurance department', 1859], '*': ['the insurance regulator', 1950] })(s);
    return regulatorFrom({})(s);
  },
  complaintOdds: 0.016,
  complaints: [
    { id: 'misselling', short: 'mis-selling', severity: 2, weight: (s) => (['finance', 'insurance', 'sales'].includes(prof(s)) ? 3 : 0.3), founded: 0.5, text: 'Clients say you sold them products they didn\'t need and couldn\'t understand.' },
    { id: 'accounts', short: 'the accounts you signed', severity: 2, weight: (s) => (prof(s) === 'accounting' ? 3 : 0.3), founded: 0.45, text: 'A company whose accounts you signed off has collapsed, and the creditors want to know why you didn\'t see it.' },
    { id: 'insider', short: 'insider dealing', severity: 3, weight: (s) => (prof(s) === 'finance' ? 0.6 : 0.1), founded: 0.4, from: 1934, text: 'Trades in your family\'s account came days before a takeover you worked on.' },
    { id: 'deposit', short: 'a client\'s deposit', severity: 2, weight: (s) => (['realestate', 'propertyManagement'].includes(prof(s)) ? 2 : 0.1), founded: 0.5, text: 'A tenant says their deposit vanished into your firm\'s account.' },
    ...WORKPLACE_COMPLAINTS,
  ],
  eliteOdds: 0.05,
  elite: [
    { id: 'institutePresident', name: (s) => ({ accounting: chartered(s) ? 'President of the Institute of Chartered Accountants' : 'Chair of the American Institute of CPAs', actuary: chartered(s) ? 'President of the Institute of Actuaries' : 'President of the Society of Actuaries', insurance: 'President of the insurance institute', humanResources: 'President of the personnel institute', marketing: 'President of the marketing institute' })[prof(s)] ?? 'President of your professional institute', icon: '🏛️', minGrade: 8, minYears: 20, minAwards: 1, years: 1, prestige: 4, stipend: 10000, text: 'The members have elected you president for the year: dinners, speeches and the ear of the regulator.' },
    { id: 'board', name: 'A seat on a listed company\'s board', icon: '🪑', minGrade: 8, minYears: 18, years: 6, prestige: 3, stipend: 60000, text: 'A listed company has asked you to join its board as a non-executive director.' },
    { id: 'lloyds', name: 'Membership of Lloyd\'s', icon: '⚓', countries: ['GB'], professions: ['insurance', 'finance'], minGrade: 7, minYears: 15, prestige: 2, text: 'You have been elected a member of Lloyd\'s of London. Unlimited liability: the reward is large, and so is the risk.' },
    { id: 'centralBank', name: (s) => (cc(s) === 'GB' ? 'A seat on the Court of the Bank of England' : 'A seat on the central bank\'s board'), icon: '🏦', professions: ['finance', 'corporate'], minGrade: 9, minYears: 25, minAwards: 1, years: 4, prestige: 5, stipend: 20000, text: 'The government has appointed you to the central bank\'s board.' },
  ],
};
