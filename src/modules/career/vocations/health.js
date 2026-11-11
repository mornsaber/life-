/**
 * Nursing, ambulance and the allied health professions (everyone in health and therapy but the
 * doctors, who have career/vocations/medicine.js): life support and specialist courses in their
 * years, nurse prescribing, the dental and pharmacy fellowships; missions, Red Cross, rural and
 * reserve service; the Florence Nightingale Medal (1912); the nursing council and the boards;
 * the Chief Nursing Officer and the college presidencies.
 */
import { yearNow } from '../../world/Eras.js';
import { MANAGEMENT, UNION, regulatorFrom, COMMONWEALTH } from './blocks.js';

const y = (s) => yearNow(s);
const cc = (s) => s.character.countryId ?? 'US';
const prof = (s) => s.career?.job?.professionId;
const NURSES = ['nursing', 'travelNursing'];
const AMBULANCE = ['ems', 'privateEms'];

export const HEALTH = {
  id: 'health',
  name: 'Nursing & Health',
  professions: ['nursing', 'travelNursing', 'physicianAssistant', 'dentistry', 'pharmacy', 'veterinary', 'ems', 'privateEms', 'counseling', 'psychology', 'physicalTherapy', 'occupationalTherapy', 'speechPathology', 'respiratoryTherapy', 'imaging', 'dentalHygiene', 'dietitian', 'optometry', 'chiropractic'],
  use: [MANAGEMENT, UNION],
  courses: [
    { id: 'bls', name: (s) => (y(s) < 1974 ? 'a resuscitation course' : 'Basic Life Support (BLS)'), icon: '🫀', from: 1960, professions: [...NURSES, ...AMBULANCE, 'physicianAssistant', 'dentistry', 'respiratoryTherapy', 'dentalHygiene', 'physicalTherapy', 'imaging'], cost: 100, renew: 2, perf: 1 },
    { id: 'acls', name: 'Advanced Cardiac Life Support (ACLS)', icon: '❤️', from: 1974, professions: [...NURSES, ...AMBULANCE, 'physicianAssistant', 'respiratoryTherapy'], minGrade: 2, cost: 350, renew: 2, perf: 3 },
    { id: 'phtls', name: (s) => (y(s) < 1983 ? 'a trauma care course' : 'Prehospital Trauma Life Support (PHTLS)'), icon: '🚑', from: 1970, professions: AMBULANCE, minGrade: 2, cost: 400, renew: 4, perf: 3 },
    { id: 'midwifery', name: (s) => (y(s) < 1950 ? 'the Central Midwives Board certificate' : 'a midwifery qualification'), icon: '🤰', from: 1902, professions: NURSES, minGrade: 3, cost: 3000, years: 1, perf: 4 },
    { id: 'prescribing', name: 'a nurse prescribing qualification', icon: '💊', from: 1994, professions: NURSES, minGrade: 5, cost: 2000, perf: 4 },
    { id: 'tropicalNursing', name: 'a tropical nursing course', icon: '🦟', from: 1899, professions: NURSES, minGrade: 3, cost: 1500, perf: 2 },
    { id: 'ward', name: (s) => (y(s) < 1970 ? 'the ward sister\'s course' : 'a ward leadership programme'), icon: '🧭', from: 1920, professions: NURSES, minGrade: 4, cost: 1500, perf: 3, gateMgmt: true },
    { id: 'pharmacyFellow', name: 'membership of the pharmaceutical society', icon: '⚗️', professions: ['pharmacy'], minGrade: 3, cost: 800, perf: 3 },
    { id: 'dentalFellow', name: (s) => (COMMONWEALTH.includes(cc(s)) ? 'Fellowship in Dental Surgery (FDS)' : 'a dental specialty residency'), icon: '🦷', from: 1947, professions: ['dentistry'], minGrade: 7, cost: 8000, years: 2, perf: 5 },
    { id: 'cbt', name: 'training in cognitive behavioural therapy', icon: '🧠', from: 1970, professions: ['counseling', 'psychology', 'occupationalTherapy'], minGrade: 2, cost: 3000, perf: 4 },
  ],
  postingOdds: 0.09,
  postings: [
    { id: 'msf', name: 'A Mission with Médecins Sans Frontières', icon: '⛑️', from: 1971, professions: [...NURSES, ...AMBULANCE, 'physicianAssistant', 'pharmacy', 'psychology', 'counseling'], minGrade: 3, years: 1, places: ['SS', 'CD', 'AF', 'YE', 'HT', 'SO', 'CF', 'SY', 'SL', 'LR'], stress: 10, happiness: 6,
      text: 'MSF needs you in a field hospital for nine months.', end: () => 'You came home from the mission. Nothing at home felt urgent for a long time.' },
    { id: 'redCross', name: 'A Red Cross Hospital', icon: '➕', from: 1864, until: 1971, professions: NURSES, minGrade: 2, years: 1, places: ['FR', 'BE', 'IT', 'RS', 'GR', 'TR', 'ET', 'KR'], stress: 10, happiness: 5,
      text: 'The Red Cross is sending nurses to a war abroad.', end: () => 'You came home from the Red Cross hospital, older than the year it had been.' },
    { id: 'rural', name: (s) => (y(s) < 1950 ? 'A District Nursing Round' : 'A Rural Health Post'), icon: '🌾', minGrade: 2, years: 1, happiness: 4, stress: 2, performance: 3, text: 'A remote district has no one. A year, a bicycle or a car, and everyone\'s ailments.' },
    { id: 'flyingDoctor', name: 'The Flying Doctor Service', icon: '🛩️', from: 1928, countries: ['AU'], professions: [...NURSES, ...AMBULANCE], minGrade: 3, years: 2, happiness: 5, stress: 4, text: 'The Royal Flying Doctor Service needs a flight nurse in the outback.' },
    { id: 'wardFar', name: 'A Nursing Post Abroad', icon: '🌍', professions: NURSES, minGrade: 3, years: 2, places: ['US', 'GB', 'AU', 'CA', 'SA', 'AE', 'NZ', 'IE'], happiness: 3, stress: 3, text: 'A hospital abroad is recruiting nurses on two-year contracts.' },
  ],
  awards: [
    { id: 'nightingale', name: 'the Florence Nightingale Medal', icon: '🏅', from: 1912, professions: NURSES, minYears: 10, minPerformance: 85, chance: 0.01, prestige: 4, text: 'The International Committee of the Red Cross awarded you the Florence Nightingale Medal.' },
    { id: 'rrc', name: 'the Royal Red Cross', icon: '➕', from: 1883, countries: ['GB'], professions: NURSES, posting: 'redCross', chance: 0.3, prestige: 3, post: 'RRC', text: 'The King awarded you the Royal Red Cross for your nursing in the war.' },
    { id: 'nurseYear', name: (s) => (y(s) < 1980 ? 'a hospital prize for nursing' : 'Nurse of the Year'), icon: '🏆', professions: NURSES, minGrade: 4, minPerformance: 85, chance: 0.04, prestige: 1 },
    { id: 'collegeFellow', name: (s) => (NURSES.includes(prof(s)) ? 'Fellowship of the Royal College of Nursing' : 'a fellowship of your professional college'), icon: '🎓', from: 1916, minGrade: 6, minYears: 15, minPerformance: 70, chance: 0.08, prestige: 2 },
    { id: 'ambulanceMedal', name: (s) => (cc(s) === 'GB' ? 'the Queen\'s Ambulance Service Medal' : 'an ambulance service medal'), icon: '🚑', from: 2012, professions: AMBULANCE, minYears: 12, minPerformance: 80, chance: 0.06, prestige: 2 },
  ],
  licence: (s) => ({ nursing: 'rn', travelNursing: 'rn', physicianAssistant: 'paLicense', dentistry: 'dentalLicense', pharmacy: 'pharmacistLicense', veterinary: 'vetLicense', ems: 'emt', privateEms: 'emt', counseling: 'lpc', psychology: 'psychLicense', physicalTherapy: 'ptLicense', occupationalTherapy: 'otLicense', speechPathology: 'cccSlp', respiratoryTherapy: 'rrt', imaging: 'arrt', dentalHygiene: 'rdh', dietitian: 'rdn', optometry: 'odLicense', chiropractic: 'dcLicense' })[prof(s)] ?? null,
  regulator: (s) => {
    const p = prof(s);
    if (NURSES.includes(p)) return regulatorFrom({ GB: [y(s) < 1983 ? 'the General Nursing Council' : y(s) < 2002 ? 'the UKCC' : 'the Nursing and Midwifery Council', 1919], US: ['the state board of nursing', 1903], AU: ['the nurses\' board', 1920], IE: ['the Nursing Board', 1919], '*': ['the nursing council', 1950] })(s);
    if (p === 'dentistry' || p === 'dentalHygiene') return regulatorFrom({ GB: ['the General Dental Council', 1956], US: ['the state dental board', 1868], '*': ['the dental council', 1950] })(s);
    if (p === 'pharmacy') return regulatorFrom({ GB: [y(s) < 2010 ? 'the Pharmaceutical Society' : 'the General Pharmaceutical Council', 1868], US: ['the state board of pharmacy', 1870], '*': ['the pharmacy board', 1950] })(s);
    if (p === 'veterinary') return regulatorFrom({ GB: ['the Royal College of Veterinary Surgeons', 1881], '*': ['the veterinary board', 1920] })(s);
    if (AMBULANCE.includes(p)) return regulatorFrom({ GB: ['the Health and Care Professions Council', 2002], US: ['the state EMS office', 1973] })(s);
    return regulatorFrom({ GB: ['the Health and Care Professions Council', 2002], US: ['the state licensing board', 1950], '*': ['the health professions council', 1970] })(s);
  },
  complaintOdds: 0.017,
  complaints: [
    { id: 'medication', short: 'a medication error', severity: 1, weight: 4, founded: 0.55, text: 'A patient was given the wrong dose on your shift.' },
    { id: 'documentation', short: 'your records', severity: 1, weight: 2, founded: 0.6, text: 'An audit found observations recorded that were never taken.' },
    { id: 'diversion', short: 'missing controlled drugs', severity: 3, weight: (s) => (s.stats.stress > 70 ? 1.5 : 0.4), founded: 0.45, from: 1920, text: 'The controlled drugs count is short, and the shifts point to you.' },
    { id: 'attitude', short: 'how you treated a patient', severity: 0, weight: 3, founded: 0.5, text: 'A patient\'s daughter says you were rough and rude with her mother.' },
    { id: 'boundary', short: 'a boundary violation', severity: 3, weight: 0.3, founded: 0.4, text: 'A former patient alleges an improper relationship.' },
  ],
  eliteOdds: 0.04,
  elite: [
    { id: 'cno', name: (s) => (NURSES.includes(prof(s)) ? 'Chief Nursing Officer' : 'Chief Allied Health Professions Officer'), icon: '🏛️', from: 1941, minGrade: 7, minYears: 20, minAwards: 1, years: 5, prestige: 5, stipend: 20000, text: 'The health ministry has asked you to become the nation\'s chief officer for your profession.' },
    { id: 'collegePresident', name: (s) => (NURSES.includes(prof(s)) ? (COMMONWEALTH.includes(cc(s)) ? 'President of the Royal College of Nursing' : 'President of the nurses\' association') : prof(s) === 'veterinary' ? 'President of the veterinary college' : 'President of your professional college'), icon: '🎓', minGrade: 7, minYears: 18, years: 2, prestige: 3, text: 'Your college has elected you its president.' },
    { id: 'matron', name: (s) => (y(s) < 1974 ? 'Matron of a great teaching hospital' : 'Director of Nursing at a teaching hospital'), icon: '🏥', professions: NURSES, minGrade: 7, minYears: 15, years: 8, prestige: 3, stipend: 15000, text: 'A famous teaching hospital wants you to lead its nurses.' },
  ],
};
