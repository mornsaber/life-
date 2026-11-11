/**
 * The light-touch packs for careers already deep elsewhere: the Empire (postings and colonial
 * life live in world/History.js and world/ColonialLife.js), the international organisations
 * (world/IntlOrgs.js) and the Church (community/HolyOrders.js). These add their courses, awards,
 * discipline and posts at the top.
 */
import { yearNow } from '../../world/Eras.js';
import { PUBLIC_SERVICE, regulatorFrom } from './blocks.js';

const y = (s) => yearNow(s);
const cc = (s) => s.character.countryId ?? 'US';
const prof = (s) => s.career?.job?.professionId;
const home = (s) => s.character.posting?.home?.countryId ?? cc(s);

export const EMPIRE = {
  id: 'empire',
  name: 'The Colonial Service',
  professions: ['colonialService', 'colonialPolice', 'colonialTroops', 'colonialMedical', 'gurkhaContingent'],
  courses: [
    { id: 'devonshire', name: (s) => (home(s) === 'GB' ? (y(s) < 1926 ? 'the probationers\' course at Oxford' : 'the Devonshire course at Oxford or Cambridge') : home(s) === 'FR' ? 'the École coloniale' : 'the colonial school'), icon: '🎓', from: 1889, until: 1965, professions: ['colonialService'], minGrade: 2, cost: 0, years: 1, perf: 6 },
    { id: 'language', name: (s) => (y(s) < 1920 ? 'the language examination (Hindustani, Swahili or Malay)' : 'the colonial language examination'), icon: '🗣️', professions: ['colonialService', 'colonialPolice', 'colonialMedical'], minGrade: 2, cost: 0, passRate: 0.7, perf: 5 },
    { id: 'tropicalMed', name: 'the Diploma in Tropical Medicine', icon: '🦟', from: 1899, professions: ['colonialMedical'], minGrade: 2, cost: 0, perf: 5 },
  ],
  awards: [
    { id: 'cmg', name: (s) => (home(s) === 'GB' ? 'the CMG (Companion of St Michael and St George)' : 'the Order of Colonial Merit'), icon: '🎗️', professions: ['colonialService', 'colonialMedical'], minGrade: 6, minYears: 15, minPerformance: 75, chance: 0.08, prestige: 4 },
    { id: 'colonialPolice', name: (s) => (home(s) === 'GB' ? 'the Colonial Police Medal' : 'a colonial police medal'), icon: '🏅', from: 1938, professions: ['colonialPolice'], minYears: 6, minPerformance: 80, chance: 0.06, prestige: 2 },
  ],
  regulator: (s) => regulatorFrom({ '*': [(home(s) === 'GB' ? 'the Colonial Office' : 'the colonial ministry'), 0] })(s),
  complaints: [
    { id: 'harshness', short: 'harshness in your district', severity: 2, weight: 2, founded: 0.45, text: 'A petition to the Governor says you had villagers flogged.' },
    { id: 'corruption', short: 'gifts from a chief', severity: 2, weight: 1, founded: 0.45, text: 'An inquiry says you took gifts from a chief you favoured in a land dispute.' },
  ],
  complaintOdds: 0.015,
  elite: [
    { id: 'legislative', name: 'A seat on the colony\'s Legislative Council', icon: '🏛️', professions: ['colonialService'], minGrade: 6, minYears: 15, years: 4, prestige: 3, text: 'The Governor has appointed you to the Legislative Council.' },
  ],
};

export const INTL = {
  id: 'intl',
  name: 'International Service',
  professions: ['unSecretariat', 'unAgencies', 'euInstitutions', 'nato', 'intlFinance', 'intlJustice', 'icrc', 'maltaRelief', 'maltaDiplomacy'],
  use: [{ courses: PUBLIC_SERVICE.courses }],
  courses: [
    { id: 'unLanguage', name: 'a UN language proficiency examination', icon: '🗣️', from: 1946, minGrade: 3, cost: 0, passRate: 0.7, perf: 4 },
    { id: 'hostileUN', name: 'safe and secure approaches in field environments', icon: '🦺', from: 2000, professions: ['unAgencies', 'icrc', 'maltaRelief'], minGrade: 2, cost: 0, renew: 3, perf: 2 },
  ],
  awards: [
    { id: 'unMedal', name: (s) => (y(s) < 1946 ? 'the League of Nations\' thanks' : 'a UN service medal'), icon: '🇺🇳', from: 1920, minYears: 3, chance: 0.15, prestige: 1 },
    { id: 'nobelPeace', name: 'a share in the Nobel Peace Prize awarded to your organisation', icon: '🕊️', from: 1917, professions: ['unAgencies', 'icrc', 'unSecretariat', 'intlJustice'], minYears: 5, minPerformance: 85, chance: 0.01, prestige: 3, text: 'Your organisation won the Nobel Peace Prize. You were in the hall in Oslo.' },
  ],
  regulator: (s) => regulatorFrom({ '*': ['the internal oversight office', 1994] })(s),
  complaints: [
    { id: 'abuse', short: 'misconduct in the field', severity: 3, weight: 0.4, founded: 0.4, text: 'An oversight investigation names you in a report on misconduct at a field office.' },
    { id: 'procurement', short: 'a procurement irregularity', severity: 2, weight: 1.5, founded: 0.45, text: 'A contract you signed went to a company with no track record.' },
  ],
  complaintOdds: 0.012,
  elite: [
    { id: 'specialRep', name: 'Special Representative of the Secretary-General', icon: '🌐', from: 1950, professions: ['unSecretariat', 'unAgencies'], minGrade: 8, minYears: 20, years: 3, prestige: 5, stipend: 20000, text: 'The Secretary-General wants you to lead a mission.' },
  ],
};

export const FAITH = {
  id: 'faith',
  name: 'The Church',
  professions: ['clergy', 'catholicClergy', 'anglicanClergy', 'jesuits', 'moc', 'romanCuria', 'holySeeDiplomacy', 'swissGuard', 'vaticanGendarmerie'],
  courses: [
    { id: 'pastoral', name: (s) => (y(s) < 1960 ? 'a course in pastoral theology' : 'clinical pastoral education'), icon: '🙏', professions: ['clergy', 'catholicClergy', 'anglicanClergy', 'jesuits'], minGrade: 2, cost: 0, perf: 4 },
    { id: 'canonLaw', name: 'a licentiate in canon law', icon: '📜', professions: ['catholicClergy', 'romanCuria', 'holySeeDiplomacy', 'jesuits'], minGrade: 3, cost: 0, years: 2, perf: 4 },
    { id: 'academy', name: 'the Pontifical Ecclesiastical Academy', icon: '🎓', from: 1701, professions: ['holySeeDiplomacy'], minGrade: 2, cost: 0, years: 2, perf: 5 },
  ],
  postingOdds: 0.06,
  postings: [
    { id: 'mission', name: (s) => (y(s) < 1960 ? 'The Missions' : 'A Mission Parish Abroad'), icon: '⛪', professions: ['clergy', 'catholicClergy', 'anglicanClergy', 'jesuits', 'moc'], minGrade: 2, years: 3, places: ['IN', 'KE', 'NG', 'BR', 'PH', 'PE', 'CN', 'JP', 'CD', 'PG'], happiness: 5, stress: 5, text: 'Your bishop or superior is sending you to the missions abroad.' },
  ],
  awards: [
    { id: 'proEcclesia', name: 'the Pro Ecclesia et Pontifice cross', icon: '✝️', from: 1888, professions: ['catholicClergy', 'romanCuria', 'holySeeDiplomacy', 'jesuits', 'swissGuard', 'vaticanGendarmerie'], minYears: 15, minPerformance: 75, chance: 0.06, prestige: 2 },
    { id: 'lambeth', name: 'a Lambeth degree', icon: '🎓', from: 1533, professions: ['anglicanClergy'], minYears: 15, minPerformance: 75, chance: 0.04, prestige: 2 },
  ],
  regulator: (s) => regulatorFrom({ '*': [prof(s) === 'anglicanClergy' ? 'the consistory court' : prof(s) === 'clergy' ? 'the church\'s disciplinary panel' : 'the bishop\'s tribunal', 0] })(s),
  erasureWord: 'removed you from ministry',
  complaints: [
    { id: 'safeguarding', short: 'a safeguarding failure', severity: 3, weight: 0.6, founded: 0.45, from: 1990, text: 'A safeguarding review says you failed to report a colleague.' },
    { id: 'heterodoxy', short: 'your preaching', severity: 1, weight: 2, founded: 0.5, text: 'Parishioners have complained to the bishop about your sermons.' },
    { id: 'parishFunds', short: 'the parish accounts', severity: 2, weight: 1, founded: 0.45, text: 'The parish accounts don\'t balance.' },
  ],
  complaintOdds: 0.01,
  elite: [
    { id: 'chaplain', name: (s) => (cc(s) === 'GB' ? 'Chaplain to the King' : 'Chaplain to a royal or presidential household'), icon: '👑', professions: ['anglicanClergy', 'clergy', 'catholicClergy'], minGrade: 4, minYears: 15, years: 10, prestige: 3, text: 'You have been appointed a chaplain to the household.' },
  ],
};
