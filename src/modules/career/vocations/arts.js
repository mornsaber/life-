/**
 * Arts, media and sport: drama school and the conservatoire, coaching badges and the journalists'
 * certificate; tours, foreign bureaux and seasons abroad; the great prizes in their years (the
 * Pulitzer from 1917, the Oscars from 1929, the Grammys from 1959, the Olympic Games from 1896);
 * the press council, the sport's anti-doping tribunal; the academies and the laureateship.
 */
import { yearNow } from '../../world/Eras.js';
import { UNION, WORKPLACE_COMPLAINTS, regulatorFrom, COMMONWEALTH } from './blocks.js';

const y = (s) => yearNow(s);
const cc = (s) => s.character.countryId ?? 'US';
const prof = (s) => s.career?.job?.professionId;
const is = (...ids) => (s) => ids.includes(prof(s));

export const ARTS = {
  id: 'arts',
  name: 'Arts, Media & Sport',
  professions: ['acting', 'music', 'athletics', 'design', 'contentCreator', 'journalism', 'interpreter'],
  use: [UNION],
  specialtyAt: 3,
  specialtyTitle: 'Your Line of Work',
  specialties: [
    { id: 'stage', name: 'The stage', icon: '🎭', professions: ['acting'] },
    { id: 'screen', name: (s) => (y(s) < 1950 ? 'The pictures' : 'Film and television'), icon: '🎬', from: 1910, professions: ['acting'] },
    { id: 'classical', name: 'Classical music', icon: '🎻', professions: ['music'] },
    { id: 'popular', name: (s) => (y(s) < 1955 ? 'Dance bands and the music hall' : 'Popular music'), icon: '🎸', professions: ['music'] },
    { id: 'investigative', name: 'Investigative reporting', icon: '🔎', professions: ['journalism'] },
    { id: 'political', name: 'Politics and Parliament', icon: '🏛️', professions: ['journalism'] },
    { id: 'foreign', name: 'Foreign news', icon: '🌍', professions: ['journalism'] },
    { id: 'conference', name: 'Conference interpreting', icon: '🎧', from: 1945, professions: ['interpreter'] },
    { id: 'literary', name: 'Literary translation', icon: '📚', professions: ['interpreter'] },
    { id: 'fashion', name: 'Fashion', icon: '👗', professions: ['design'] },
    { id: 'graphic', name: (s) => (y(s) < 1960 ? 'Commercial art' : 'Graphic design'), icon: '🎨', professions: ['design'] },
  ],
  courses: [
    { id: 'dramaSchool', name: (s) => (cc(s) === 'GB' && y(s) >= 1904 ? 'RADA\'s acting course' : 'drama school'), icon: '🎭', from: 1880, professions: ['acting'], minGrade: 1, cost: 15000, years: 2, perf: 8 },
    { id: 'conservatoire', name: 'a conservatoire', icon: '🎼', professions: ['music'], minGrade: 1, cost: 18000, years: 2, perf: 8 },
    { id: 'coaching', name: (s) => (y(s) < 1960 ? 'a coaching certificate' : 'a coaching licence (badges)'), icon: '📋', from: 1930, professions: ['athletics'], minGrade: 6, cost: 3000, perf: 2 },
    { id: 'nctj', name: (s) => (COMMONWEALTH.includes(cc(s)) && y(s) >= 1951 ? 'the National Council for the Training of Journalists certificate' : 'a journalism school course'), icon: '📰', from: 1908, professions: ['journalism'], minGrade: 1, cost: 4000, perf: 5 },
    { id: 'shorthand', name: 'shorthand at 100 words a minute', icon: '✍️', until: 1990, professions: ['journalism', 'interpreter'], minGrade: 1, cost: 300, perf: 3 },
    { id: 'hostile', name: 'a hostile-environment course', icon: '🦺', from: 1993, professions: ['journalism'], minGrade: 3, cost: 3000, perf: 2 },
    { id: 'interpreting', name: (s) => (y(s) < 1960 ? 'the interpreters\' school in Geneva' : 'a postgraduate conference interpreting diploma'), icon: '🎧', from: 1941, professions: ['interpreter'], minGrade: 2, cost: 12000, years: 1, perf: 6 },
  ],
  postingOdds: 0.1,
  postings: [
    { id: 'tour', name: (s) => (prof(s) === 'music' ? 'A Tour' : 'A Touring Production'), icon: '🚌', professions: ['acting', 'music'], minGrade: 2, years: 1, places: ['US', 'GB', 'DE', 'JP', 'AU', 'FR', 'CA'], happiness: 5, stress: 4,
      text: (s) => (prof(s) === 'music' ? 'The agent has a tour abroad: a different city every night for a year.' : 'A touring production wants you: a year of digs, trains and stage doors.'), end: () => 'The tour ended. You slept for a week.' },
    { id: 'bureau', name: 'A Foreign Bureau', icon: '🌍', professions: ['journalism'], minGrade: 3, years: 3, places: ['US', 'GB', 'FR', 'RU', 'CN', 'JP', 'EG', 'IL', 'ZA', 'BR', 'IN', 'DE'], happiness: 4, stress: 5,
      text: 'The paper wants you as its correspondent abroad for three years.', end: () => 'Your years as a foreign correspondent ended. The best stories were the ones the desk spiked.' },
    { id: 'warZone', name: 'Covering a War', icon: '🪖', professions: ['journalism'], minGrade: 3, years: 1, places: ['UA', 'SY', 'IQ', 'AF', 'VN', 'KR', 'ES', 'BA'], stress: 12, happiness: 2,
      text: 'There\'s a war, and the desk wants someone there.', end: () => 'You came back from the war with notebooks you can\'t bring yourself to reread.' },
    { id: 'seasonAbroad', name: 'A Season Abroad', icon: '⚽', professions: ['athletics'], minGrade: 6, years: 2, places: ['ES', 'IT', 'GB', 'DE', 'US', 'FR', 'JP', 'AU'], happiness: 4, stress: 3,
      text: 'A club abroad wants you for two seasons.' },
    { id: 'residency', name: 'An Artist\'s Residency', icon: '🏡', professions: ['design', 'music', 'acting', 'contentCreator'], minGrade: 3, years: 1, happiness: 6, stress: -2,
      text: 'A foundation offers a year\'s residency: a studio, a stipend and no deadlines.' },
  ],
  awards: [
    { id: 'pulitzer', name: 'the Pulitzer Prize', icon: '🏆', from: 1917, countries: ['US'], professions: ['journalism'], minGrade: 4, minYears: 6, minPerformance: 85, chance: 0.015, prestige: 5, text: 'Your reporting won the Pulitzer Prize.' },
    { id: 'pressAward', name: (s) => (y(s) < 1960 ? 'the newspaper proprietors\' prize' : 'a national press award'), icon: '📰', professions: ['journalism'], minGrade: 3, minPerformance: 78, chance: 0.05, prestige: 2, text: 'Your story won a national press award.' },
    { id: 'oscar', name: (s) => (cc(s) === 'US' || y(s) < 1947 ? 'an Academy Award' : 'a national film award'), icon: '🏆', from: 1929, professions: ['acting'], minGrade: 7, minYears: 8, minPerformance: 88, chance: 0.01, prestige: 6, text: 'Your name was in the envelope.' },
    { id: 'stageAward', name: (s) => (cc(s) === 'US' ? 'a Tony Award' : cc(s) === 'GB' ? 'an Olivier Award' : 'a national theatre prize'), icon: '🎭', from: 1947, professions: ['acting'], minGrade: 5, minPerformance: 82, chance: 0.03, prestige: 3, when: (s) => cc(s) !== 'GB' || y(s) >= 1976 },
    { id: 'grammy', name: 'a Grammy Award', icon: '🎵', from: 1959, professions: ['music'], minGrade: 6, minPerformance: 85, chance: 0.015, prestige: 4, text: 'You won a Grammy.' },
    { id: 'olympic', name: 'an Olympic medal', icon: '🥇', from: 1896, professions: ['athletics'], minGrade: 7, minPerformance: 85, chance: 0.03, prestige: 5, text: 'You stood on the Olympic podium with a medal round your neck.' },
    { id: 'designPrize', name: 'a national design award', icon: '🏆', from: 1950, professions: ['design'], minGrade: 5, minPerformance: 82, chance: 0.04, prestige: 2 },
  ],
  regulator: (s) => {
    const p = prof(s);
    if (p === 'journalism') return regulatorFrom({ GB: [y(s) < 1991 ? 'the Press Council' : y(s) < 2014 ? 'the Press Complaints Commission' : 'IPSO', 1953], '*': ['the press council', 1970] })(s);
    if (p === 'athletics') return regulatorFrom({ '*': [y(s) < 2000 ? 'the sport\'s governing body' : 'the anti-doping tribunal', 1920] })(s);
    return regulatorFrom({})(s);
  },
  complaintOdds: 0.014,
  complaints: [
    { id: 'libel', short: 'a libel', severity: 2, weight: is('journalism', 'contentCreator'), founded: 0.45, text: 'A businessman says your story about him was false and ruinous.' },
    { id: 'intrusion', short: 'intrusion', severity: 1, weight: is('journalism'), founded: 0.5, text: 'A grieving family says you doorstepped them the day their son died.' },
    { id: 'doping', short: 'a failed test', severity: 3, weight: (s) => (prof(s) === 'athletics' ? 1.5 : 0), founded: 0.55, from: 1968, text: 'Your sample came back positive.' },
    { id: 'plagiarism', short: 'plagiarism', severity: 2, weight: is('design', 'contentCreator', 'journalism', 'music'), founded: 0.45, text: 'Someone says your best-known work is theirs.' },
    ...WORKPLACE_COMPLAINTS.filter((c) => c.id === 'conduct'),
  ],
  eliteOdds: 0.04,
  elite: [
    { id: 'academy', name: (s) => (prof(s) === 'acting' ? 'Membership of the Academy of Motion Picture Arts and Sciences' : prof(s) === 'music' ? 'A professorship at the conservatoire' : prof(s) === 'design' ? 'Royal Designer for Industry' : 'An honorary fellowship of the academy'), icon: '🎓', minGrade: 7, minYears: 15, minAwards: 1, prestige: 3, when: (s) => prof(s) !== 'acting' || y(s) >= 1927, text: 'Your peers have elected you to their academy.' },
    { id: 'laureate', name: (s) => (cc(s) === 'GB' ? 'Poet Laureate' : 'National Poet Laureate'), icon: '📜', professions: ['journalism', 'contentCreator', 'interpreter'], minGrade: 6, minYears: 20, minAwards: 1, years: 10, prestige: 6, stipend: 6000, when: (s) => cc(s) === 'GB' || (cc(s) === 'US' && y(s) >= 1986), text: 'The Crown has appointed you Poet Laureate: a cask of sherry, and every state occasion wants a poem.' },
    { id: 'captain', name: 'Captain of the national team', icon: '🎖️', professions: ['athletics'], minGrade: 7, minYears: 6, years: 4, prestige: 4, text: 'The national coach has made you captain.' },
    { id: 'editor', name: 'Editor of a national newspaper', icon: '🗞️', professions: ['journalism'], minGrade: 7, minYears: 18, years: 6, prestige: 4, stipend: 40000, text: 'The proprietor wants you in the editor\'s chair.' },
    { id: 'master', name: (s) => (cc(s) === 'GB' ? 'Master of the King\'s Music' : 'Music director of the national orchestra'), icon: '🎼', professions: ['music'], minGrade: 7, minYears: 20, minAwards: 1, years: 10, prestige: 5, stipend: 15000, text: 'You have been asked to lead the nation\'s music.' },
  ],
};
