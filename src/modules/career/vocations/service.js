/**
 * Shops, food, hospitality and personal care: food hygiene and culinary school, the hotel school,
 * care and childcare qualifications, embalming; a season abroad or on the ships; the Michelin
 * stars (from 1926), best new chef, the funeral directors' association; the health inspector and
 * the care inspectorate.
 */
import { yearNow } from '../../world/Eras.js';
import { MANAGEMENT, UNION, WORKPLACE_COMPLAINTS, regulatorFrom } from './blocks.js';

const y = (s) => yearNow(s);
const cc = (s) => s.character.countryId ?? 'US';
const prof = (s) => s.career?.job?.professionId;
const is = (...ids) => (s) => (ids.includes(prof(s)) ? 2 : 0.2);

export const SERVICE = {
  id: 'service',
  name: 'Service & Care',
  professions: ['retail', 'culinary', 'hospitality', 'cruise', 'travellingSales', 'milkRound', 'domesticService', 'cosmetology', 'fitness', 'caregiving', 'childcare', 'funeral'],
  use: [MANAGEMENT, UNION],
  specialtyAt: 3,
  specialties: [
    { id: 'pastry', name: 'Pastry', icon: '🥐', professions: ['culinary'] },
    { id: 'fineDining', name: 'Fine dining', icon: '🍽️', professions: ['culinary', 'hospitality'] },
    { id: 'events', name: 'Banqueting and events', icon: '🥂', professions: ['culinary', 'hospitality'] },
    { id: 'frontOfHouse', name: 'Front of house', icon: '🛎️', professions: ['hospitality', 'cruise'] },
    { id: 'buying', name: 'Buying', icon: '🧾', professions: ['retail'] },
    { id: 'visual', name: (s) => (y(s) < 1960 ? 'Window dressing' : 'Visual merchandising'), icon: '🪟', professions: ['retail'] },
    { id: 'colour', name: 'Colour', icon: '🎨', professions: ['cosmetology'] },
    { id: 'barbering', name: 'Barbering', icon: '💈', professions: ['cosmetology'] },
    { id: 'dementia', name: 'Dementia care', icon: '🧠', professions: ['caregiving'] },
    { id: 'earlyYears', name: 'Early years education', icon: '🧸', professions: ['childcare'] },
    { id: 'embalming', name: 'Embalming', icon: '⚱️', professions: ['funeral'] },
  ],
  courses: [
    { id: 'hygiene', name: (s) => (y(s) < 1970 ? 'a food handler\'s course' : 'a food hygiene certificate'), icon: '🧼', from: 1950, professions: ['culinary', 'hospitality', 'cruise', 'retail'], cost: 150, renew: 5, perf: 2 },
    { id: 'culinarySchool', name: (s) => (y(s) < 1946 ? 'a course at a cookery school' : cc(s) === 'FR' ? 'the Institut Paul Bocuse' : 'culinary school'), icon: '👨‍🍳', professions: ['culinary'], minGrade: 1, cost: 20000, years: 1, perf: 8 },
    { id: 'hotelSchool', name: (s) => (cc(s) === 'CH' || y(s) < 1950 ? 'the hotel school at Lausanne' : 'a hotel management diploma'), icon: '🏨', from: 1893, professions: ['hospitality', 'cruise'], minGrade: 3, cost: 25000, years: 1, perf: 6 },
    { id: 'careCert', name: (s) => (y(s) < 1990 ? 'a care assistant\'s certificate' : 'a health and social care qualification'), icon: '🫶', from: 1960, professions: ['caregiving'], minGrade: 1, cost: 800, perf: 5, gateMgmt: true },
    { id: 'nnc', name: (s) => (y(s) < 1946 ? 'a Norland nursery nurse training' : 'a nursery nurse diploma'), icon: '🧸', from: 1892, professions: ['childcare'], minGrade: 1, cost: 4000, years: 1, perf: 6, gateMgmt: true },
    { id: 'embalmer', name: 'the embalmers\' examination', icon: '⚱️', from: 1900, professions: ['funeral'], minGrade: 2, cost: 2500, passRate: 0.75, perf: 4 },
    { id: 'personalTraining', name: 'an advanced personal training qualification', icon: '🏋️', from: 1985, professions: ['fitness'], minGrade: 2, cost: 1500, perf: 4 },
    { id: 'salonCourse', name: (s) => (y(s) < 1960 ? 'a hairdressing academy course' : 'an advanced colour and cutting course'), icon: '✂️', from: 1920, professions: ['cosmetology'], minGrade: 2, cost: 2000, perf: 5 },
  ],
  postingOdds: 0.07,
  postings: [
    { id: 'seasonAbroad', name: (s) => (y(s) < 1950 ? 'A Season at a Grand Hotel Abroad' : 'A Season Abroad'), icon: '🏔️', professions: ['culinary', 'hospitality', 'fitness', 'cosmetology'], minGrade: 2, years: 1, places: ['FR', 'CH', 'IT', 'ES', 'AT', 'US', 'AE'], happiness: 5, stress: 3,
      text: 'A famous hotel abroad wants staff for the season.', end: () => 'The season ended. You came back with a new language and a better palate.' },
    { id: 'stage', name: 'A Stage in a Great Kitchen', icon: '🔪', professions: ['culinary'], minGrade: 3, years: 1, places: ['FR', 'IT', 'ES', 'JP', 'DK', 'US'], happiness: 4, stress: 6, performance: 6,
      text: 'A legendary chef has agreed to take you as a stagiaire for a year. The hours are brutal.', end: () => 'You came home from the great kitchen with burns, notes and a hundred ideas.' },
    { id: 'royalTour', name: 'Catering a State Visit', icon: '👑', professions: ['culinary', 'hospitality'], minGrade: 5, years: 1, happiness: 4, stress: 4, when: (s) => cc(s) === 'GB' || cc(s) === 'FR' || cc(s) === 'US',
      text: 'The government\'s hospitality office wants you for a state banquet season.' },
  ],
  awards: [
    { id: 'michelin', name: 'a Michelin star', icon: '⭐', from: 1926, professions: ['culinary'], minGrade: 6, minYears: 8, minPerformance: 85, chance: 0.04, prestige: 3, when: (s) => ['FR', 'BE', 'IT', 'ES', 'DE', 'GB', 'NL', 'CH', 'JP', 'US', 'AT', 'PT', 'DK', 'SE', 'IE', 'SG', 'HK', 'KR', 'TW', 'TH', 'CN'].includes(cc(s)), text: 'The Michelin inspectors gave your kitchen a star.' },
    { id: 'michelin2', name: 'a second Michelin star', icon: '⭐', from: 1931, professions: ['culinary'], minGrade: 7, minYears: 12, minPerformance: 90, chance: 0.03, prestige: 4, awards: ['michelin'], text: 'Two stars: worth a detour.' },
    { id: 'bestNew', name: (s) => (y(s) < 1980 ? 'the city\'s restaurant of the year' : 'a best new chef award'), icon: '🏆', from: 1950, professions: ['culinary'], minGrade: 5, minPerformance: 82, chance: 0.05, prestige: 2 },
    { id: 'hotelier', name: 'Hotelier of the Year', icon: '🏨', from: 1950, professions: ['hospitality', 'cruise'], minGrade: 7, minPerformance: 82, chance: 0.04, prestige: 2 },
    { id: 'carer', name: 'a care worker of the year award', icon: '🫶', from: 1990, professions: ['caregiving', 'childcare'], minGrade: 2, minPerformance: 82, chance: 0.04, prestige: 1 },
  ],
  licence: (s) => ({ culinary: 'servSafe', caregiving: 'cna', childcare: 'cda', funeral: 'funeralDirectorLicense', fitness: 'cpt' })[prof(s)] ?? null,
  regulator: (s) => {
    const p = prof(s);
    if (['culinary', 'hospitality', 'retail', 'cruise'].includes(p)) return regulatorFrom({ '*': ['the environmental health officer', 1900] })(s);
    if (['caregiving', 'childcare'].includes(p)) return regulatorFrom({ GB: [y(s) < 2009 ? 'the care standards inspectorate' : 'the Care Quality Commission', 1984], US: ['the state licensing agency', 1970], '*': ['the care inspectorate', 1990] })(s);
    if (p === 'funeral') return regulatorFrom({ US: ['the state funeral board', 1900], '*': ['the funeral directors\' association', 1905] })(s);
    return regulatorFrom({})(s);
  },
  complaintOdds: 0.015,
  complaints: [
    { id: 'foodPoisoning', short: 'food poisoning', severity: 2, weight: is('culinary', 'hospitality', 'cruise'), founded: 0.5, text: 'Twelve guests were taken ill after a dinner you cooked.' },
    { id: 'neglect', short: 'neglect of someone in your care', severity: 2, weight: is('caregiving', 'childcare'), founded: 0.45, text: 'A family says their mother was left unwashed and unfed on your shift.' },
    { id: 'burn', short: 'a chemical burn', severity: 1, weight: is('cosmetology'), founded: 0.5, text: 'A client\'s scalp blistered after a treatment you gave.' },
    { id: 'remains', short: 'the handling of remains', severity: 2, weight: is('funeral'), founded: 0.45, text: 'A family says the ashes you gave them aren\'t their father\'s.' },
    { id: 'till', short: 'the till', severity: 1, weight: is('retail', 'milkRound', 'travellingSales'), founded: 0.5, text: 'The takings were short three weeks running on your shifts.' },
    ...WORKPLACE_COMPLAINTS.filter((c) => c.id !== 'expenses'),
  ],
  eliteOdds: 0.035,
  elite: [
    { id: 'royalHousehold', name: (s) => (cc(s) === 'GB' ? 'Royal Chef' : 'Chef to the head of state'), icon: '👑', professions: ['culinary'], minGrade: 7, minYears: 15, minAwards: 1, years: 8, prestige: 4, stipend: 10000, text: 'The household has asked you to run its kitchens.' },
    { id: 'association', name: (s) => ({ funeral: 'President of the funeral directors\' association', culinary: 'President of the chefs\' association', hospitality: 'President of the hotel association', cosmetology: 'President of the hairdressers\' federation' })[prof(s)] ?? 'President of your trade association', icon: '🏛️', minGrade: 6, minYears: 18, years: 2, prestige: 2, text: 'Your trade association has elected you its president.' },
  ],
};
