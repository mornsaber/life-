/**
 * Law and the courts: articles and pupillage (the training contract), silk (Queen's or King's
 * Counsel, by the reigning monarch) or the board-certified specialist, the international
 * tribunals; the bar's disciplinary tribunal and the state bar; the bench as the elite post.
 */
import { yearNow } from '../../world/Eras.js';
import { MANAGEMENT, regulatorFrom, COMMONWEALTH } from './blocks.js';

const y = (s) => yearNow(s);
const cc = (s) => s.character.countryId ?? 'US';
const prof = (s) => s.career?.job?.professionId;
const commonLaw = (s) => COMMONWEALTH.includes(cc(s));
/** QC under a queen, KC under a king: Victoria to 1901, Elizabeth II 1952–2022. */
const silk = (s) => ((y(s) >= 1837 && y(s) < 1901) || (y(s) >= 1952 && y(s) < 2022) ? 'Queen\'s Counsel (QC)' : 'King\'s Counsel (KC)');

export const LAW = {
  id: 'law',
  name: 'The Law',
  professions: ['legalSupport', 'law', 'courts', 'prosecution', 'publicDefender', 'oig'],
  use: [MANAGEMENT],
  specialtyAt: 4,
  specialtyTitle: 'Your Practice Area',
  specialties: [
    { id: 'criminal', name: 'Criminal law', icon: '⚖️' },
    { id: 'commercial', name: 'Commercial and company law', icon: '🏢', professions: ['law', 'legalSupport'] },
    { id: 'family', name: 'Family law', icon: '👪', professions: ['law', 'legalSupport', 'courts'] },
    { id: 'property', name: 'Property and conveyancing', icon: '🏠', professions: ['law', 'legalSupport'] },
    { id: 'tax', name: 'Tax', icon: '🧾', from: 1913, professions: ['law'] },
    { id: 'humanRights', name: (s) => (y(s) < 1950 ? 'Civil liberties' : 'Human rights'), icon: '🕊️', professions: ['law', 'publicDefender'] },
    { id: 'appellate', name: 'Appeals', icon: '📜', professions: ['law', 'prosecution', 'publicDefender', 'courts'] },
    { id: 'fraud', name: 'Fraud and corruption', icon: '🔎', professions: ['prosecution', 'oig'] },
  ],
  courses: [
    { id: 'pupillage', name: (s) => (commonLaw(s) ? (y(s) < 1990 ? 'pupillage in chambers (or articles of clerkship)' : 'pupillage or a training contract') : 'a clerkship with a judge'), icon: '📜', professions: ['law', 'prosecution', 'publicDefender'], minGrade: 1, cost: 0, years: 1, perf: 6 },
    { id: 'advocacy', name: (s) => (y(s) < 1970 ? 'a course in advocacy at the Inns' : 'an advanced advocacy course'), icon: '🎙️', professions: ['law', 'prosecution', 'publicDefender'], minGrade: 4, cost: 2500, perf: 4 },
    { id: 'silk', name: (s) => (commonLaw(s) ? `appointment as ${silk(s)}` : 'board certification as a specialist'), icon: '🎗️', professions: ['law'], minGrade: 7, minYears: 12, cost: 4000, passRate: 0.4, perf: 5, gateGrade: 10, post: null },
    { id: 'paralegal', name: (s) => (y(s) < 1975 ? 'a legal executive\'s certificate' : 'a paralegal certificate'), icon: '📑', from: 1963, professions: ['legalSupport'], minGrade: 1, cost: 2000, perf: 6 },
    { id: 'judicialCollege', name: (s) => (cc(s) === 'GB' && y(s) >= 2011 ? 'the Judicial College induction' : 'judicial education'), icon: '👨‍⚖️', from: 1960, professions: ['courts'], minGrade: 3, cost: 0, perf: 3 },
    { id: 'investigation', name: 'a certified fraud examiner course', icon: '🔎', from: 1988, professions: ['oig', 'prosecution'], minGrade: 3, cost: 1500, perf: 4 },
  ],
  postingOdds: 0.06,
  postings: [
    { id: 'tribunal', name: (s) => (y(s) < 1993 ? 'The War Crimes Trials' : 'An International Tribunal'), icon: '🌐', from: 1945, professions: ['law', 'prosecution', 'publicDefender'], minGrade: 5, years: 2, places: ['NL', 'DE', 'JP', 'TZ', 'SL'], happiness: 3, stress: 5,
      text: (s) => (y(s) < 1950 ? 'The Allies need lawyers for the war crimes trials at Nuremberg and Tokyo.' : y(s) < 1993 ? 'An international commission wants lawyers to document war crimes.' : 'An international criminal tribunal is recruiting lawyers for two years.'), end: () => 'You came home from the tribunal. You still think about the witnesses.' },
    { id: 'ministry', name: 'A Secondment to the Ministry of Justice', icon: '🏛️', minGrade: 5, years: 2, happiness: 2, stress: 3, text: 'The government wants a practising lawyer to help draft a new criminal justice bill.' },
    { id: 'legalAid', name: (s) => (y(s) < 1950 ? 'The Poor Man\'s Lawyer Clinic' : 'A Year at a Legal Aid Centre'), icon: '🤝', professions: ['law', 'legalSupport'], minGrade: 3, years: 1, happiness: 5, stress: 4, text: 'A legal aid centre is desperate for a lawyer for a year, at a fraction of your rate.' },
  ],
  awards: [
    { id: 'lawyerYear', name: (s) => (y(s) < 1980 ? 'a mention in the legal directories as a leading counsel' : 'Lawyer of the Year'), icon: '🏆', professions: ['law', 'prosecution', 'publicDefender'], minGrade: 6, minPerformance: 85, chance: 0.04, prestige: 2 },
    { id: 'proBono', name: 'a pro bono award', icon: '🤝', from: 1960, professions: ['law', 'legalSupport'], posting: 'legalAid', chance: 0.4, prestige: 1 },
    { id: 'bencher', name: 'election as a Bencher of your Inn', icon: '🏛️', countries: ['GB', 'IE'], professions: ['law', 'courts'], minGrade: 8, minYears: 18, chance: 0.1, prestige: 2 },
  ],
  licence: (s) => (prof(s) === 'legalSupport' ? 'paralegalCP' : prof(s) === 'oig' ? null : 'barLicense'),
  regulator: (s) => (prof(s) === 'oig' ? regulatorFrom({})(s) : regulatorFrom({ GB: [y(s) < 2007 ? 'the Bar Council' : 'the Bar Standards Board', 1894], US: ['the state bar\'s disciplinary board', 1900], IE: ['the Bar Council of Ireland', 1897], AU: ['the legal services commissioner', 1990], CA: ['the law society', 1797], IN: ['the Bar Council of India', 1961], '*': ['the bar association', 1920] })(s)),
  erasureWord: 'disbarred you',
  complaintOdds: 0.017,
  complaints: [
    { id: 'conflict', short: 'a conflict of interest', severity: 2, weight: 2, founded: 0.45, text: 'A former client says you took a case against them using what they told you in confidence.' },
    { id: 'clientMoney', short: 'client money', severity: 3, weight: (s) => (prof(s) === 'law' ? 1 : 0.2), founded: 0.4, text: 'A client\'s money went through your office account instead of the client account.' },
    { id: 'misleading', short: 'misleading the court', severity: 2, weight: 1.5, founded: 0.45, text: 'A judge has referred you for misleading the court about a witness.' },
    { id: 'delay', short: 'neglect of a case', severity: 1, weight: 3, founded: 0.55, text: 'A client\'s claim was struck out because you missed the deadline.' },
    { id: 'disclosure', short: 'withholding evidence', severity: 3, weight: (s) => (prof(s) === 'prosecution' ? 2 : 0.1), founded: 0.4, text: 'The defence has found evidence your office never disclosed.' },
  ],
  eliteOdds: 0.05,
  elite: [
    { id: 'bench', name: (s) => (commonLaw(s) ? 'A seat as a Recorder (part-time judge)' : 'A part-time judicial appointment'), icon: '👨‍⚖️', professions: ['law', 'prosecution', 'publicDefender'], minGrade: 7, minYears: 15, years: 5, prestige: 3, stipend: 15000, text: 'The Lord Chancellor\'s office invites you to sit as a part-time judge.' },
    { id: 'barChair', name: (s) => (commonLaw(s) ? 'Chair of the Bar' : 'President of the state bar'), icon: '🏛️', professions: ['law'], minGrade: 8, minYears: 20, minAwards: 1, years: 1, prestige: 4, text: 'Your colleagues have elected you to lead the bar for a year.' },
    { id: 'lawCommission', name: 'A Law Commissioner', icon: '📚', from: 1965, professions: ['law', 'courts', 'prosecution'], minGrade: 8, minYears: 20, years: 5, prestige: 4, stipend: 25000, text: 'The government has appointed you to the Law Commission, to reform the law itself.' },
  ],
};
