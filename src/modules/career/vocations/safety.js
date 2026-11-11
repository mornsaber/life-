/**
 * Police, fire and the emergency services. Their courses that promotion waits on (the academy,
 * the supervisor course, command college, fire officer) are credentials already; this adds what
 * the services' careers have beyond them: specialist units, mutual-aid and overseas postings,
 * the gallantry and long-service medals in their years, the complaints authority, and the chief's
 * chair and the inspectorate at the top.
 */
import { yearNow } from '../../world/Eras.js';
import { UNION, regulatorFrom, COMMONWEALTH } from './blocks.js';

const y = (s) => yearNow(s);
const cc = (s) => s.character.countryId ?? 'US';
const prof = (s) => s.career?.job?.professionId;
const POLICE = ['police', 'sheriff', 'statePolice', 'gendarmerie', 'transitPolice', 'universityPolice', 'airportPolice', 'privatePolice'];
const FIRE = ['fire', 'stateFire', 'airportFire', 'privateFire'];
const isPolice = (s) => POLICE.includes(prof(s));
/** The British sovereign's initial for a medal: King's or Queen's by the reign. */
const crownWord = (s) => ((y(s) >= 1837 && y(s) < 1901) || (y(s) >= 1952 && y(s) < 2023) ? 'Queen\'s' : 'King\'s');

export const SAFETY = {
  id: 'safety',
  name: 'The Service',
  professions: [...POLICE, ...FIRE, 'dispatch', 'emergencyManagement'],
  use: [UNION],
  specialtyAt: 4,
  specialtyTitle: 'A Specialist Unit',
  specialtyText: 'Your record has been noticed. The specialist units are recruiting. Which will you try for?',
  specialties: [
    { id: 'traffic', name: 'Traffic', icon: '🚓', from: 1930, professions: POLICE },
    { id: 'mounted', name: 'The mounted branch', icon: '🐎', professions: POLICE },
    { id: 'marine', name: 'The marine unit', icon: '🚤', professions: POLICE },
    { id: 'dogs', name: 'The dog section', icon: '🐕', from: 1946, professions: POLICE },
    { id: 'firearms', name: 'Firearms (armed response)', icon: '🎯', from: 1966, professions: POLICE },
    { id: 'publicOrder', name: 'Public order', icon: '🛡️', from: 1970, professions: POLICE },
    { id: 'rescue', name: 'Technical rescue', icon: '🪢', from: 1960, professions: FIRE },
    { id: 'hazmat', name: 'Hazardous materials', icon: '☣️', from: 1970, professions: FIRE },
    { id: 'fireInvestigation', name: 'Fire investigation', icon: '🔎', professions: FIRE },
    { id: 'wildland', name: 'Wildland firefighting', icon: '🌲', professions: FIRE },
  ],
  courses: [
    { id: 'firstAid', name: (s) => (y(s) < 1960 ? 'the St John Ambulance certificate' : 'an advanced first-aid course'), icon: '⛑️', from: 1880, cost: 100, renew: 3, perf: 2 },
    { id: 'detective', name: (s) => (y(s) < 1960 ? 'the detective training course' : 'the initial detective course'), icon: '🕵️', from: 1902, professions: POLICE, minGrade: 4, cost: 0, perf: 4 },
    { id: 'negotiator', name: 'hostage and crisis negotiation', icon: '☎️', from: 1975, professions: POLICE, minGrade: 5, cost: 0, perf: 3 },
    { id: 'fireStaff', name: (s) => (cc(s) === 'GB' ? 'the Fire Service College command course' : 'the national fire academy executive programme'), icon: '🚒', from: 1941, professions: FIRE, minGrade: 6, cost: 0, perf: 3 },
    { id: 'incidentCommand', name: (s) => (y(s) < 1980 ? 'a major incident command course' : 'gold command (strategic incident command)'), icon: '🧭', from: 1970, professions: [...POLICE, ...FIRE, 'emergencyManagement'], minGrade: 7, cost: 0, perf: 3 },
    { id: 'dispatchCert', name: 'emergency medical dispatch', icon: '📞', from: 1979, professions: ['dispatch'], minGrade: 2, cost: 300, renew: 2, perf: 3 },
  ],
  postingOdds: 0.08,
  postings: [
    { id: 'mutualAid', name: (s) => (FIRE.includes(prof(s)) ? 'Mutual Aid to a Disaster' : 'Mutual Aid to Another Force'), icon: '🚨', minGrade: 3, years: 1, happiness: 2, stress: 5, performance: 3, text: (s) => (FIRE.includes(prof(s)) ? 'A disaster in another region has overwhelmed its brigades. Volunteers are going for months.' : 'Another force needs officers on loan for a year after a crisis.') },
    { id: 'overseas', name: (s) => (y(s) < 1960 ? 'Colonial Police Secondment' : 'A UN Police Mission'), icon: '🌍', professions: POLICE, minGrade: 4, years: 1, places: ['CY', 'BA', 'XK', 'TL', 'SL', 'LR', 'HT', 'AF', 'KE', 'MY', 'PS'], happiness: 3, stress: 6, when: (s) => y(s) < 1960 ? COMMONWEALTH.includes(cc(s)) : y(s) >= 1964,
      text: (s) => (y(s) < 1960 ? 'The Colonial Office wants experienced officers for the police of a colony in trouble.' : 'The UN needs police for a peacekeeping mission: training a new force, a year away.'), end: () => 'You came home from the mission with a medal you don\'t wear and a better sense of what policing is for.' },
    { id: 'wildfireAbroad', name: 'Fighting Wildfires Abroad', icon: '🔥', from: 1990, professions: FIRE, minGrade: 3, years: 1, places: ['AU', 'CA', 'US', 'GR', 'PT', 'TR'], happiness: 3, stress: 6, text: 'Another country\'s fires are out of control, and it has asked for help.' },
    { id: 'royalty', name: (s) => (cc(s) === 'GB' ? 'Royalty Protection' : 'The Protection Squad'), icon: '👑', professions: POLICE, minGrade: 4, years: 3, happiness: 2, stress: 4, text: (s) => (cc(s) === 'GB' ? 'Royalty and Specialist Protection wants you on a royal detail.' : 'The protection squad wants you guarding ministers.') },
    { id: 'training', name: 'An Instructor\'s Post at the Training School', icon: '🏫', minGrade: 4, years: 2, happiness: 3, stress: -1, text: 'The training school wants you to teach recruits for two years.' },
  ],
  awards: [
    { id: 'kpm', name: (s) => (cc(s) === 'GB' || COMMONWEALTH.includes(cc(s)) ? `the ${crownWord(s)} Police Medal` : cc(s) === 'US' ? 'the Medal of Valor' : 'the police medal of honour'), icon: '🏅', from: 1909, professions: POLICE, minYears: 3, minPerformance: 88, chance: 0.02, prestige: 4, post: null, text: 'You were awarded the police\'s highest medal for gallantry.' },
    { id: 'fireMedal', name: (s) => (COMMONWEALTH.includes(cc(s)) ? `the ${crownWord(s)} Fire Service Medal` : 'the fire service\'s medal of valour'), icon: '🏅', from: 1954, professions: FIRE, minYears: 3, minPerformance: 88, chance: 0.02, prestige: 4, text: 'You were decorated for gallantry at a fire.' },
    { id: 'longService', name: (s) => (FIRE.includes(prof(s)) ? (cc(s) === 'GB' ? 'the Fire Brigade Long Service and Good Conduct Medal' : 'a fire service long-service medal') : cc(s) === 'GB' ? 'the Police Long Service and Good Conduct Medal' : 'a police long-service medal'), icon: '🎖️', from: 1951, minYears: 20, chance: 0.5, prestige: 1, when: (s) => !(s.vocation?.safety?.record ?? []).some((r) => ['conditions', 'suspension', 'erasure'].includes(r.outcome)), text: 'Twenty years of service: the long-service medal.' },
    { id: 'commendation', name: (s) => (y(s) < 1950 ? 'a commendation from the Chief Constable' : 'a chief\'s commendation'), icon: '📜', minYears: 2, minPerformance: 80, chance: 0.06, prestige: 1, text: 'The chief commended you for your work.' },
    { id: 'royalHumane', name: 'the Royal Humane Society\'s bronze medal', icon: '🛟', from: 1800, countries: COMMONWEALTH, minPerformance: 80, chance: 0.01, prestige: 2, text: 'The Royal Humane Society awarded you its medal for saving a life.' },
  ],
  licence: (s) => (isPolice(s) ? 'post' : null),
  regulator: (s) => (isPolice(s)
    ? regulatorFrom({ GB: [y(s) < 2004 ? 'the Police Complaints Authority' : y(s) < 2018 ? 'the IPCC' : 'the Independent Office for Police Conduct', 1985], US: ['internal affairs', 1950], AU: ['the police integrity commission', 1990], '*': ['the police inspectorate', 1960] })(s)
    : regulatorFrom({})(s)),
  erasureWord: 'had you dismissed from the force',
  complaintOdds: 0.02,
  complaints: [
    { id: 'force', short: 'excessive force', severity: 2, weight: (s) => (isPolice(s) ? 3 : 0.2), founded: 0.4, text: 'A man you arrested says you beat him in the van.' },
    { id: 'rudeness', short: 'incivility', severity: 0, weight: 3, founded: 0.5, text: 'A member of the public has complained about the way you spoke to them.' },
    { id: 'evidence', short: 'evidence handling', severity: 2, weight: (s) => (isPolice(s) ? 1.5 : 0.3), founded: 0.45, text: 'Seized cash is short, and you signed for it.' },
    { id: 'pursuit', short: 'a pursuit that ended in a crash', severity: 2, weight: (s) => (isPolice(s) && y(s) >= 1930 ? 1 : 0), founded: 0.45, text: 'A car you were chasing hit a pedestrian.' },
    { id: 'bullying', short: 'bullying a recruit', severity: 1, weight: 1.5, founded: 0.5, text: 'A probationer says you made their life hell.' },
    { id: 'leak', short: 'leaking to the press', severity: 2, weight: 0.5, founded: 0.4, text: 'A tabloid printed details only a handful of officers knew.' },
  ],
  eliteOdds: 0.04,
  elite: [
    { id: 'inspectorate', name: (s) => (cc(s) === 'GB' ? `${crownWord(s).replace('\'s', '')}'s Inspector of ${FIRE.includes(prof(s)) ? 'Fire Services' : 'Constabulary'}` : 'Inspector of the national police inspectorate'), icon: '📋', professions: [...POLICE, ...FIRE], minGrade: 7, minYears: 22, minAwards: 1, years: 5, prestige: 4, stipend: 20000, when: (s) => cc(s) !== 'GB' || y(s) >= 1856, text: 'The Home Office wants you as one of its inspectors.' },
    { id: 'federationChair', name: (s) => (FIRE.includes(prof(s)) ? 'General Secretary of the firefighters\' union' : cc(s) === 'GB' ? 'Chair of the Police Federation' : 'President of the police union'), icon: '✊', minGrade: 3, minYears: 15, years: 3, prestige: 2, stipend: 15000, when: (s) => cc(s) !== 'GB' || y(s) >= 1919, text: 'The members have elected you to lead them.' },
    { id: 'interpol', name: 'A Post at Interpol', icon: '🌐', from: 1956, professions: POLICE, minGrade: 6, minYears: 15, years: 3, prestige: 3, stipend: 10000, text: 'Interpol has asked for you on secondment to its headquarters in Lyon.' },
  ],
};
