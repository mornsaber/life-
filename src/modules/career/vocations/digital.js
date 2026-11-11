/**
 * Technology and computing, and the old offices before them (the typing pool, the switchboard,
 * the telegraph). Certifications in their years, conference talks, a stint at the Valley or in a
 * startup abroad, the Turing Award (1966) and the ACM/IEEE fellowships; the data protection
 * regulator; the CTO's chair and the standards bodies. The old offices get their own small
 * pages: speed certificates, the Post Office's long-service medal, the senior operator's chair.
 */
import { yearNow } from '../../world/Eras.js';
import { MANAGEMENT, UNION, regulatorFrom, WORKPLACE_COMPLAINTS } from './blocks.js';

const y = (s) => yearNow(s);
const cc = (s) => s.character.countryId ?? 'US';
const prof = (s) => s.career?.job?.professionId;
const TECH = ['tech', 'cybersecurity', 'dataScience', 'aiOps', 'gameDevelopment'];
const OLD = ['typingPool', 'switchboard', 'telegraph'];

export const DIGITAL = {
  id: 'digital',
  name: 'Technology',
  professions: TECH,
  use: [MANAGEMENT],
  specialtyAt: 3,
  specialties: [
    { from: 1965, id: 'backend', name: (s) => (y(s) < 1990 ? 'Systems programming' : 'Back-end systems'), icon: '🗄️', professions: ['tech', 'gameDevelopment'] },
    { from: 1965, id: 'frontend', name: (s) => (y(s) < 1995 ? 'User interfaces' : 'Front end'), icon: '🖼️', professions: ['tech', 'gameDevelopment'] },
    { from: 1965, id: 'infra', name: (s) => (y(s) < 2008 ? 'Infrastructure' : 'Cloud infrastructure'), icon: '🏗️', professions: ['tech', 'aiOps', 'cybersecurity'] },
    { from: 1965, id: 'redTeam', name: 'Offensive security (red team)', icon: '🗡️', professions: ['cybersecurity'] },
    { from: 1965, id: 'ml', name: 'Machine learning', icon: '🧠', professions: ['dataScience', 'aiOps', 'tech'] },
    { from: 1965, id: 'engine', name: 'Game engines', icon: '🎮', professions: ['gameDevelopment'] },
  ],
  courses: [
    { from: 1965, id: 'cloudCert', name: (s) => (y(s) < 2008 ? 'a vendor systems certification' : 'a cloud architect certification'), icon: '☁️', professions: ['tech', 'aiOps', 'cybersecurity'], minGrade: 2, cost: 300, renew: 3, perf: 3 },
    { id: 'oscp', name: 'an offensive security certification (OSCP)', icon: '🗡️', from: 2006, professions: ['cybersecurity'], minGrade: 3, cost: 1600, passRate: 0.5, perf: 5 },
    { id: 'mlCourse', name: 'a machine learning course', icon: '🧠', from: 2012, professions: ['dataScience', 'aiOps', 'tech'], minGrade: 2, cost: 2000, perf: 4 },
    { from: 1965, id: 'architect', name: 'a software architecture course', icon: '🏛️', professions: TECH, minGrade: 4, cost: 3000, perf: 3 },
  ],
  postingOdds: 0.08,
  postings: [
    { from: 1965, id: 'valley', name: 'A Stint in Silicon Valley', icon: '🌉', professions: TECH, minGrade: 3, years: 2, places: ['US'], happiness: 4, stress: 4, when: (s) => cc(s) !== 'US', text: 'Your company wants you at its California office for two years.' },
    { from: 1965, id: 'conference', name: 'The Conference Circuit', icon: '🎤', professions: TECH, minGrade: 4, years: 1, happiness: 4, stress: 2, performance: 3, text: 'Your talk was accepted at the big conference, and invitations followed for a year of keynotes.' },
    { from: 1965, id: 'incident', name: 'A Breach Response', icon: '🚨', professions: ['cybersecurity'], minGrade: 3, years: 1, stress: 7, happiness: 1, performance: 5, text: 'A national-scale breach: the response team wants you, for as long as it takes.' },
  ],
  awards: [
    { id: 'turing', name: 'the Turing Award', icon: '🏆', from: 1966, professions: ['tech', 'dataScience', 'aiOps'], minGrade: 9, minYears: 20, minPerformance: 92, chance: 0.003, prestige: 9, text: 'The ACM gave you the Turing Award, computing\'s Nobel.' },
    { id: 'acmFellow', name: (s) => (y(s) < 1993 ? 'Fellowship of the IEEE' : 'Fellowship of the ACM'), icon: '🎓', from: 1964, professions: TECH, minGrade: 7, minYears: 15, minPerformance: 85, chance: 0.04, prestige: 3 },
    { id: 'gameAward', name: (s) => (y(s) < 2000 ? 'a Game of the Year award' : 'a BAFTA Games Award'), icon: '🎮', from: 1980, professions: ['gameDevelopment'], minGrade: 5, minPerformance: 85, chance: 0.03, prestige: 2 },
    { id: 'bugBounty', name: 'a record bug bounty', icon: '🐞', from: 2010, professions: ['cybersecurity'], minGrade: 3, minPerformance: 85, chance: 0.05, prestige: 1 },
  ],
  licence: (s) => (prof(s) === 'cybersecurity' ? 'cissp' : null),
  regulator: (s) => regulatorFrom({ GB: [y(s) < 2002 ? 'the Data Protection Registrar' : 'the Information Commissioner', 1984], DE: ['the data protection commissioner', 1978], FR: ['the CNIL', 1978], '*': ['the data protection authority', 2000] })(s),
  complaintOdds: 0.013,
  complaints: [
    { id: 'dataBreach', short: 'a data breach', severity: 2, weight: 2, founded: 0.45, from: 1984, text: 'A database you were responsible for leaked a million customers\' details.' },
    { from: 1965, id: 'outage', short: 'an outage', severity: 1, weight: 3, founded: 0.55, text: 'A change you pushed took the service down for a day.' },
    { from: 1965, id: 'ipTheft', short: 'taking code to a rival', severity: 2, weight: 1, founded: 0.45, text: 'Your old employer says code you wrote for them turned up in your new product.' },
    ...WORKPLACE_COMPLAINTS.filter((c) => c.id === 'conduct'),
  ],
  eliteOdds: 0.035,
  elite: [
    { from: 1965, id: 'standards', name: (s) => (y(s) < 1994 ? 'Chair of a computing standards committee' : 'Chair of a web standards working group'), icon: '📐', professions: TECH, minGrade: 6, minYears: 12, years: 3, prestige: 2, text: 'The standards body asks you to chair the working group that will define the next version.' },
    { id: 'govCto', name: (s) => (cc(s) === 'US' ? 'U.S. Chief Technology Officer' : 'Government chief digital officer'), icon: '🏛️', from: 2009, professions: TECH, minGrade: 8, minYears: 18, minAwards: 1, years: 4, prestige: 4, stipend: 20000, text: 'The government wants you to modernise its systems.' },
  ],
};

export const OFFICE = {
  id: 'office',
  name: 'The Office',
  professions: OLD,
  use: [UNION],
  courses: [
    { id: 'speed', name: (s) => (prof(s) === 'telegraph' ? 'the first-class telegraphist\'s examination' : prof(s) === 'switchboard' ? 'the supervisor\'s operating course' : 'the Pitman speed certificate'), icon: '⏱️', minGrade: 1, cost: 50, passRate: 0.8, perf: 5 },
  ],
  postingOdds: 0.05,
  postings: [
    { id: 'cableStation', name: 'A Cable Station Abroad', icon: '🌊', professions: ['telegraph'], minGrade: 2, years: 2, places: ['PT', 'MT', 'EG', 'IN', 'SG', 'AU', 'GI', 'BM'], happiness: 3, stress: 3, text: 'The cable company needs operators at a relay station abroad.' },
    { id: 'warOffice', name: (s) => (y(s) < 1920 ? 'The War Office Typing Pool' : 'A Secret Typing Pool'), icon: '🗂️', professions: ['typingPool', 'switchboard'], minGrade: 1, years: 2, happiness: 2, stress: 4, when: (s) => (y(s) >= 1914 && y(s) < 1919) || (y(s) >= 1939 && y(s) < 1946), text: 'The ministry is recruiting reliable typists and operators for war work. You must sign the Official Secrets Act.' },
  ],
  awards: [
    { id: 'postOfficeService', name: (s) => (cc(s) === 'GB' ? 'the Imperial Service Medal' : 'a long-service medal'), icon: '🎖️', from: 1902, minYears: 25, chance: 0.5, prestige: 1 },
  ],
  regulator: (s) => regulatorFrom({})(s),
  complaintOdds: 0.01,
  complaints: [
    { id: 'eavesdrop', short: 'listening in to calls', severity: 2, weight: (s) => (prof(s) === 'switchboard' ? 2 : 0), founded: 0.5, text: 'A subscriber says the whole village knows what she said on the telephone.' },
    { id: 'garbled', short: 'a garbled message', severity: 1, weight: (s) => (prof(s) === 'telegraph' ? 2 : 0), founded: 0.55, text: 'A telegram you sent arrived saying the opposite of what the customer wrote.' },
    ...WORKPLACE_COMPLAINTS.filter((c) => c.id === 'timekeeping'),
  ],
  elite: [
    { id: 'supervisor', name: (s) => (prof(s) === 'typingPool' ? 'Head of the typing pool' : 'Chief supervisor of the exchange'), icon: '🗂️', minGrade: 3, minYears: 12, years: 8, prestige: 1, stipend: 800, text: 'You\'ve been made the supervisor everyone answers to.' },
  ],
};
