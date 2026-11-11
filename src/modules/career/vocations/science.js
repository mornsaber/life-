/**
 * Science and engineering: chartered and professional engineer, the architects' institute;
 * Antarctic stations, CERN (1954), sites abroad; the Royal Society and the national academies,
 * the Nobel Prize, the Pritzker (1979); the engineering council and the ethics board; the
 * presidency of the institution, chief scientific adviser.
 */
import { yearNow } from '../../world/Eras.js';
import { MANAGEMENT, regulatorFrom, COMMONWEALTH } from './blocks.js';

const y = (s) => yearNow(s);
const cc = (s) => s.character.countryId ?? 'US';
const prof = (s) => s.career?.job?.professionId;
const ENGINEERS = ['engineering', 'structuralEng', 'mechanicalEng', 'electricalEng', 'chemicalEng', 'aerospaceEng', 'petroleumEng', 'nuclearEng', 'surveying'];
const SCIENTISTS = ['research', 'nationalLab', 'environmental', 'meteorology'];
/** The engineering institution for each branch. */
const INSTITUTION = { engineering: 'the Institution of Civil Engineers', structuralEng: 'the Institution of Structural Engineers', mechanicalEng: 'the Institution of Mechanical Engineers', electricalEng: 'the Institution of Electrical Engineers', chemicalEng: 'the Institution of Chemical Engineers', aerospaceEng: 'the Royal Aeronautical Society', petroleumEng: 'the Energy Institute', nuclearEng: 'the Nuclear Institute', surveying: 'the Royal Institution of Chartered Surveyors', architecture: 'the Royal Institute of British Architects' };

export const SCIENCE = {
  id: 'science',
  name: 'Science & Engineering',
  professions: [...ENGINEERS, ...SCIENTISTS, 'architecture'],
  use: [MANAGEMENT],
  specialtyAt: 4,
  specialties: [
    { id: 'design', name: 'Design', icon: '📐', professions: [...ENGINEERS, 'architecture'] },
    { id: 'construction', name: 'Construction and sites', icon: '🏗️', professions: [...ENGINEERS, 'architecture'] },
    { id: 'research', name: 'Research and development', icon: '🔬', professions: [...ENGINEERS, ...SCIENTISTS] },
    { id: 'safety', name: 'Safety and assurance', icon: '🦺', professions: ENGINEERS },
    { id: 'theory', name: 'Theory', icon: '🧮', professions: SCIENTISTS },
    { id: 'field', name: 'Fieldwork', icon: '🗺️', professions: SCIENTISTS },
    { id: 'conservation', name: 'Conservation', icon: '🏛️', professions: ['architecture'] },
  ],
  courses: [
    { id: 'chartered', name: (s) => (COMMONWEALTH.includes(cc(s)) ? `chartered membership of ${INSTITUTION[prof(s)] ?? 'your engineering institution'}` : 'the Professional Engineer licence examination'), icon: '📜', from: 1880, professions: ENGINEERS, minGrade: 4, minYears: 4, cost: 1500, passRate: 0.65, perf: 4, gateGrade: 8, when: (s) => COMMONWEALTH.includes(cc(s)) || y(s) >= 1907 },
    { id: 'riba', name: (s) => (COMMONWEALTH.includes(cc(s)) ? 'membership of the Royal Institute of British Architects' : 'the architect registration examination'), icon: '🏛️', from: 1834, professions: ['architecture'], minGrade: 4, cost: 2000, passRate: 0.6, perf: 4 },
    { id: 'phd', name: (s) => (y(s) < 1920 ? 'a doctorate abroad (in Germany, where science is)' : 'a doctorate'), icon: '🎓', professions: SCIENTISTS, minGrade: 4, cost: 0, years: 3, perf: 7 },
    { id: 'safetyCase', name: 'a nuclear safety case course', icon: '☢️', from: 1957, professions: ['nuclearEng'], minGrade: 4, cost: 4000, perf: 3, gateMgmt: true },
    { id: 'projectMgmt', name: (s) => (y(s) < 1990 ? 'a project management course' : 'a project management qualification'), icon: '📊', from: 1960, professions: [...ENGINEERS, 'architecture'], minGrade: 4, cost: 2500, perf: 3 },
  ],
  postingOdds: 0.08,
  postings: [
    { id: 'antarctic', name: 'A Winter in the Antarctic', icon: '🧊', from: 1945, professions: [...SCIENTISTS, 'electricalEng', 'mechanicalEng'], minGrade: 4, years: 1, stress: 5, happiness: 6, text: 'The polar survey needs you at its station through the winter: six months of darkness and data.', end: () => 'You came back from the ice with a beard (or wishing for one) and a decade of data.' },
    { id: 'cern', name: 'A Fellowship at CERN', icon: '⚛️', from: 1955, professions: ['research', 'nationalLab', 'electricalEng', 'nuclearEng'], minGrade: 5, years: 2, places: ['CH'], happiness: 5, stress: 2, text: 'CERN has offered you a two-year fellowship in Geneva.' },
    { id: 'siteAbroad', name: (s) => (y(s) < 1950 ? 'A Railway or Harbour Abroad' : 'A Project Abroad'), icon: '🌍', professions: [...ENGINEERS, 'architecture'], minGrade: 4, years: 2, places: ['IN', 'EG', 'AR', 'AE', 'SA', 'CN', 'BR', 'NG', 'AU', 'CA', 'KE', 'MY'], happiness: 4, stress: 5,
      text: (s) => (y(s) < 1950 ? 'A contractor is building a railway and harbour abroad and needs a resident engineer.' : 'The firm needs you on a major project abroad for two years.') },
    { id: 'expedition', name: 'A Scientific Expedition', icon: '🗺️', professions: SCIENTISTS, minGrade: 3, years: 1, once: true, places: ['BR', 'ID', 'GL', 'MN', 'PE', 'KE', 'AQ'], stress: 5, happiness: 7, text: 'An expedition is going where nobody has measured anything, and wants you.' },
    { id: 'warWork', name: 'War Work', icon: '⚙️', from: 1914, until: 1946, professions: [...ENGINEERS, ...SCIENTISTS], minGrade: 3, years: 2, happiness: 2, stress: 6, when: (s) => (y(s) >= 1914 && y(s) < 1919) || (y(s) >= 1939 && y(s) < 1946), text: 'The ministry has requisitioned you for war research. You can\'t tell anyone what it is.' },
  ],
  awards: [
    { id: 'royalSociety', name: (s) => (COMMONWEALTH.includes(cc(s)) ? 'Fellowship of the Royal Society (FRS)' : cc(s) === 'US' ? 'election to the National Academy of Sciences' : 'election to the national academy of sciences'), icon: '🏛️', professions: [...SCIENTISTS, ...ENGINEERS], minGrade: 8, minYears: 18, minPerformance: 85, chance: 0.03, prestige: 4, post: null },
    { id: 'fellowEng', name: (s) => (COMMONWEALTH.includes(cc(s)) ? 'Fellowship of the Royal Academy of Engineering' : 'election to the National Academy of Engineering'), icon: '⚙️', from: 1964, professions: ENGINEERS, minGrade: 8, minYears: 18, minPerformance: 85, chance: 0.04, prestige: 3 },
    { id: 'nobel', name: (s) => (prof(s) === 'research' && s.vocation?.science?.specialty === 'theory' ? 'the Nobel Prize in Physics' : 'the Nobel Prize in Chemistry'), icon: '🏅', from: 1901, professions: ['research', 'nationalLab'], minGrade: 9, minYears: 20, minPerformance: 92, chance: 0.002, prestige: 12, precedence: 10, awards: ['royalSociety'], text: 'Stockholm called: the Nobel Prize.' },
    { id: 'pritzker', name: (s) => (y(s) >= 1979 ? 'the Pritzker Prize' : 'the Royal Gold Medal for architecture'), icon: '🏆', from: 1848, professions: ['architecture'], minGrade: 8, minYears: 20, minPerformance: 90, chance: 0.008, prestige: 6 },
    { id: 'medal', name: (s) => `a gold medal of ${INSTITUTION[prof(s)] ?? 'your institution'}`, icon: '🥇', professions: [...ENGINEERS, 'architecture'], minGrade: 7, minYears: 15, minPerformance: 85, chance: 0.04, prestige: 2 },
    { id: 'paper', name: 'a best paper prize', icon: '📄', professions: SCIENTISTS, minGrade: 4, minPerformance: 80, chance: 0.05, prestige: 1 },
  ],
  licence: (s) => (ENGINEERS.includes(prof(s)) && prof(s) !== 'surveying' ? 'pe' : prof(s) === 'architecture' ? 'architectLicense' : prof(s) === 'surveying' ? 'pls' : null),
  regulator: (s) => (SCIENTISTS.includes(prof(s)) ? regulatorFrom({ '*': ['the research integrity board', 1990] }, null)(s) ?? regulatorFrom({})(s) : regulatorFrom({ GB: [prof(s) === 'architecture' ? 'the Architects Registration Board' : 'the Engineering Council', prof(s) === 'architecture' ? 1931 : 1981], US: ['the state board of professional engineers', 1907], '*': ['the engineering council', 1950] })(s)),
  complaintOdds: 0.013,
  complaints: [
    { id: 'collapse', short: 'a structural failure', severity: 3, weight: (s) => (['engineering', 'structuralEng', 'architecture'].includes(prof(s)) ? 1 : 0.3), founded: 0.4, text: 'Part of a structure you signed off has failed. Nobody died, this time.' },
    { id: 'falsified', short: 'falsified data', severity: 3, weight: (s) => (SCIENTISTS.includes(prof(s)) ? 1.2 : 0.3), founded: 0.4, text: 'A student says the key figure in your famous paper was doctored.' },
    { id: 'cutCorners', short: 'cutting corners on a test', severity: 2, weight: 2, founded: 0.5, text: 'A whistleblower says you approved a component that failed its tests.' },
    { id: 'credit', short: 'taking credit for others\' work', severity: 1, weight: 2, founded: 0.5, text: 'A junior colleague says you put your name on their design.' },
  ],
  eliteOdds: 0.04,
  elite: [
    { id: 'institutionPresident', name: (s) => `President of ${INSTITUTION[prof(s)] ?? (SCIENTISTS.includes(prof(s)) ? 'the national scientific society' : 'your institution')}`, icon: '🏛️', minGrade: 8, minYears: 22, minAwards: 1, years: 1, prestige: 4, text: 'Your institution has elected you its president for the year.' },
    { id: 'chiefScientist', name: (s) => (COMMONWEALTH.includes(cc(s)) ? 'Government Chief Scientific Adviser' : cc(s) === 'US' ? 'Science Adviser to the President' : 'Chief scientific adviser to the government'), icon: '🔬', from: 1939, professions: [...SCIENTISTS, ...ENGINEERS], minGrade: 9, minYears: 25, minAwards: 1, years: 5, prestige: 6, stipend: 30000, text: 'The head of government wants you as chief scientific adviser.' },
    { id: 'labDirector', name: 'Director of a national laboratory', icon: '🧪', professions: ['nationalLab', 'research', 'nuclearEng'], minGrade: 9, minYears: 20, years: 8, prestige: 4, stipend: 40000, text: 'The government asks you to run a national laboratory.' },
  ],
};
