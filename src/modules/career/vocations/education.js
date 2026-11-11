/**
 * Teaching, libraries and the universities: the normal school and teacher training, the
 * headship qualification, tenure; exchange years, colonial and overseas teaching, the Fulbright
 * (1946), sabbaticals; teacher of the year, named chairs, the learned academies; the teaching
 * council and the tenure hearing; the head of a great school, a vice-chancellorship.
 */
import { yearNow } from '../../world/Eras.js';
import { MANAGEMENT, UNION, regulatorFrom, COMMONWEALTH } from './blocks.js';

const y = (s) => yearNow(s);
const cc = (s) => s.character.countryId ?? 'US';
const prof = (s) => s.career?.job?.professionId;
const SCHOOL = ['education'];
const ACADEMIC = ['university', 'college', 'communityCollege', 'maritimeFaculty'];

export const EDUCATION = {
  id: 'education',
  name: 'Teaching & Scholarship',
  professions: ['education', 'university', 'college', 'communityCollege', 'maritimeFaculty', 'library'],
  use: [UNION, MANAGEMENT],
  specialtyAt: 2,
  specialtyTitle: 'What You Teach',
  specialties: [
    { id: 'primary', name: (s) => (y(s) < 1945 ? 'The elementary school' : 'Primary school'), icon: '🧒', professions: SCHOOL },
    { id: 'sciences', name: 'Sciences', icon: '🔬', professions: [...SCHOOL, ...ACADEMIC] },
    { id: 'humanities', name: 'Humanities', icon: '📚', professions: [...SCHOOL, ...ACADEMIC] },
    { id: 'languages', name: 'Languages', icon: '🗣️', professions: [...SCHOOL, ...ACADEMIC] },
    { id: 'special', name: (s) => (y(s) < 1970 ? 'Remedial teaching' : 'Special educational needs'), icon: '🧩', from: 1900, professions: SCHOOL },
    { id: 'archives', name: 'Archives and special collections', icon: '🗃️', professions: ['library'] },
    { id: 'children', name: 'Children\'s libraries', icon: '🧸', professions: ['library'] },
  ],
  courses: [
    { id: 'teacherTraining', name: (s) => (y(s) < 1920 ? 'the normal school (teacher training college)' : y(s) < 1990 ? 'a teacher training certificate' : 'a postgraduate certificate in education'), icon: '🍎', from: 1840, professions: SCHOOL, minGrade: 1, cost: 5000, years: 1, perf: 8 },
    { id: 'headship', name: (s) => (cc(s) === 'GB' && y(s) >= 1997 ? 'the National Professional Qualification for Headship' : 'a school leadership qualification'), icon: '🏫', from: 1960, professions: SCHOOL, minGrade: 4, cost: 3000, perf: 3, gateMgmt: true },
    { id: 'phdSupervision', name: 'a course in supervising doctoral students', icon: '🎓', from: 1970, professions: ACADEMIC, minGrade: 4, cost: 0, perf: 2 },
    { id: 'librarianship', name: (s) => (y(s) < 1960 ? 'the Library Association examinations' : 'a master\'s in library science'), icon: '📚', from: 1885, professions: ['library'], minGrade: 1, cost: 8000, years: 1, perf: 6, gateGrade: 6 },
    { id: 'pgCert', name: 'a certificate in university teaching', icon: '🧑‍🏫', from: 1990, professions: ACADEMIC, minGrade: 3, cost: 1500, perf: 3 },
  ],
  postingOdds: 0.08,
  postings: [
    { id: 'exchange', name: (s) => (y(s) < 1946 ? 'A Teaching Exchange' : 'A Fulbright Year'), icon: '🌍', minGrade: 3, years: 1, places: ['US', 'GB', 'FR', 'DE', 'JP', 'AU', 'CA', 'IT', 'ES', 'NL'], happiness: 5, stress: 2,
      text: (s) => (y(s) < 1946 ? 'An exchange scheme offers a year teaching abroad, swapping posts with a teacher there.' : 'You\'ve won a Fulbright: a year teaching and researching abroad.'), end: () => 'Your year abroad ended. Your lessons came home with new examples.' },
    { id: 'colonial', name: 'Teaching in the Colonies', icon: '🌴', until: 1965, professions: SCHOOL, minGrade: 2, years: 3, places: ['IN', 'KE', 'NG', 'GH', 'MY', 'SG', 'UG', 'TZ', 'JM'], happiness: 3, stress: 4, when: (s) => ['GB', 'FR', 'NL', 'BE', 'PT'].includes(cc(s)),
      text: 'The colonial education service needs teachers for a mission school abroad.' },
    { id: 'vso', name: 'Volunteer Teaching Abroad', icon: '🤝', from: 1958, professions: SCHOOL, minGrade: 1, years: 2, places: ['KE', 'TZ', 'MW', 'NP', 'GH', 'ZM', 'PG', 'SL'], happiness: 6, stress: 3,
      text: (s) => (cc(s) === 'US' ? 'The Peace Corps wants teachers for two years.' : 'A volunteer service wants teachers for two years in a village school.') },
    { id: 'sabbatical', name: 'A Sabbatical', icon: '📖', professions: ACADEMIC, minGrade: 4, years: 1, happiness: 6, stress: -3, performance: 4, text: 'Seven years of teaching have earned you a sabbatical year to write.' },
    { id: 'visiting', name: 'A Visiting Fellowship', icon: '🏛️', professions: ACADEMIC, minGrade: 5, years: 1, places: ['US', 'GB', 'DE', 'FR', 'CH', 'JP'], happiness: 5, stress: 2, text: 'A great university abroad invites you for a year as a visiting fellow.' },
  ],
  awards: [
    { id: 'teacherYear', name: (s) => (y(s) < 1952 ? 'a teaching prize' : 'Teacher of the Year'), icon: '🍎', professions: SCHOOL, minGrade: 3, minYears: 5, minPerformance: 85, chance: 0.04, prestige: 1 },
    { id: 'chair', name: 'a named chair', icon: '🪑', professions: ACADEMIC, minGrade: 8, minYears: 15, minPerformance: 80, chance: 0.08, prestige: 3, text: 'The university has given you a named chair.' },
    { id: 'academy', name: (s) => (cc(s) === 'GB' ? 'Fellowship of the British Academy (FBA)' : cc(s) === 'US' ? 'election to the American Academy of Arts and Sciences' : 'election to the national academy'), icon: '🏛️', professions: ACADEMIC, minGrade: 8, minYears: 18, minPerformance: 85, chance: 0.03, prestige: 4, when: (s) => cc(s) !== 'GB' || y(s) >= 1902 },
    { id: 'bookPrize', name: 'a prize for your book', icon: '📘', professions: [...ACADEMIC, 'library'], minGrade: 5, minPerformance: 80, chance: 0.04, prestige: 2 },
  ],
  licence: (s) => (prof(s) === 'education' ? 'teachingCert' : null),
  regulator: (s) => (prof(s) === 'education' ? regulatorFrom({ GB: [y(s) < 2012 ? 'the General Teaching Council' : 'the Teaching Regulation Agency', 2000], US: ['the state board of education', 1900], IE: ['the Teaching Council', 2006], '*': ['the school board', 1900] })(s) : regulatorFrom({ '*': [y(s) < 1960 ? 'the university\'s council' : 'the university\'s disciplinary panel', 0] })(s)),
  complaintOdds: 0.014,
  complaints: [
    { id: 'discipline', short: 'discipline in your classroom', severity: 1, weight: (s) => (prof(s) === 'education' ? 3 : 0.2), founded: 0.5, text: (s) => (y(s) < 1987 ? 'A parent says you caned their son far too hard.' : 'A parent says you grabbed their son by the arm.') },
    { id: 'grades', short: 'grading', severity: 1, weight: 2, founded: 0.45, text: 'Students say you marked them down for disagreeing with you.' },
    { id: 'plagiarism', short: 'plagiarism in your work', severity: 2, weight: (s) => (ACADEMIC.includes(prof(s)) ? 2 : 0.1), founded: 0.4, text: 'A rival has found whole pages of your book in someone else\'s thesis.' },
    { id: 'misconduct', short: 'misconduct with a student', severity: 3, weight: 0.3, founded: 0.4, text: 'A student has made an allegation against you.' },
  ],
  eliteOdds: 0.04,
  elite: [
    { id: 'head', name: (s) => (y(s) < 1950 ? 'Headmaster of a great school' : 'Head of a leading school'), icon: '🏫', professions: SCHOOL, minGrade: 6, minYears: 18, years: 10, prestige: 3, stipend: 10000, text: 'The governors of a famous school want you as their head.' },
    { id: 'inspector', name: (s) => (cc(s) === 'GB' ? 'His Majesty\'s Inspector of Schools' : 'Inspector of schools'), icon: '📋', professions: SCHOOL, minGrade: 5, minYears: 15, years: 6, prestige: 2, stipend: 8000, when: (s) => cc(s) !== 'GB' || (y(s) >= 1839 && y(s) < 1992), text: 'The ministry asks you to join the inspectorate.' },
    { id: 'vc', name: (s) => (COMMONWEALTH.includes(cc(s)) ? 'Vice-Chancellor of a university' : 'President of a university'), icon: '🎓', professions: ACADEMIC, minGrade: 9, minYears: 22, minAwards: 1, years: 8, prestige: 5, stipend: 60000, text: 'A university council has chosen you to lead the university.' },
    { id: 'nationalLibrarian', name: (s) => (cc(s) === 'US' ? 'Librarian of Congress' : 'National Librarian'), icon: '📚', professions: ['library'], minGrade: 7, minYears: 20, years: 10, prestige: 5, stipend: 25000, text: 'The government has asked you to lead the national library.' },
  ],
};
