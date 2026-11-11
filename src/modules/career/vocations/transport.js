/**
 * Air, sea, rail, road and space. Licences (ATP, master's ticket, CDL, locomotive engineer) stay
 * credentials; this adds the type ratings and safety courses, foreign routes and ships, the
 * medals of the sea and the air, the accident investigator as discipline, and the chief pilot's,
 * commodore's, astronaut's and union's chairs.
 */
import { yearNow } from '../../world/Eras.js';
import { MANAGEMENT, UNION, regulatorFrom, COMMONWEALTH } from './blocks.js';

const y = (s) => yearNow(s);
const cc = (s) => s.character.countryId ?? 'US';
const prof = (s) => s.career?.job?.professionId;
const AIR = ['aviation', 'charterAviation', 'flightAttendant', 'airTrafficControl'];
const SEA = ['merchantMarine'];
const RAIL = ['railroad', 'steamRailway', 'transit', 'transitMaintenance'];
const ROAD = ['trucking', 'logistics', 'docks', 'coachman', 'schoolBus', 'paratransit'];

export const TRANSPORT = {
  id: 'transport',
  name: 'Transport',
  professions: [...AIR, ...SEA, ...RAIL, ...ROAD, 'spaceIndustry'],
  use: [MANAGEMENT, UNION],
  specialtyAt: 3,
  specialties: [
    { id: 'longHaul', name: 'Long haul', icon: '🌍', from: 1950, professions: ['aviation', 'flightAttendant', 'trucking'] },
    { id: 'shortHaul', name: 'Short haul', icon: '🗺️', from: 1950, professions: ['aviation', 'flightAttendant', 'trucking'] },
    { id: 'tankers', name: 'Tankers', icon: '🛢️', from: 1920, professions: SEA },
    { id: 'liners', name: (s) => (y(s) < 1960 ? 'Passenger liners' : 'Container ships'), icon: '🚢', professions: SEA },
    { id: 'freight', name: 'Freight', icon: '🚂', professions: ['railroad', 'steamRailway'] },
    { id: 'passenger', name: 'Passenger services', icon: '🚆', professions: ['railroad', 'steamRailway', 'transit'] },
    { id: 'hazmat', name: 'Hazardous loads', icon: '☣️', from: 1960, professions: ['trucking'] },
    { id: 'approach', name: 'Approach and radar', icon: '📡', professions: ['airTrafficControl'] },
  ],
  courses: [
    { id: 'typeRating', name: (s) => (y(s) < 1958 ? 'conversion onto a new airliner type' : 'a type rating on a new jet'), icon: '✈️', from: 1930, professions: ['aviation', 'charterAviation'], minGrade: 3, cost: 0, perf: 4 },
    { id: 'crm', name: 'crew resource management', icon: '🤝', from: 1981, professions: ['aviation', 'charterAviation', 'flightAttendant'], minGrade: 2, cost: 0, renew: 3, perf: 3 },
    { id: 'seaSurvival', name: (s) => (y(s) < 1978 ? 'a lifeboatman\'s certificate' : 'STCW basic safety training'), icon: '🛟', from: 1914, professions: SEA, minGrade: 1, cost: 600, renew: 5, perf: 2 },
    { id: 'radar', name: 'a radar observer\'s course', icon: '📡', from: 1950, professions: SEA, minGrade: 3, cost: 500, perf: 3 },
    { id: 'defensiveDriving', name: (s) => (y(s) < 1970 ? 'an advanced driving test' : 'defensive driving'), icon: '🚛', from: 1930, professions: ROAD, minGrade: 1, cost: 200, perf: 3 },
    { id: 'route', name: 'route knowledge for a new line', icon: '🛤️', professions: RAIL, minGrade: 2, cost: 0, perf: 3 },
    { id: 'astronaut', name: 'astronaut candidate training', icon: '🚀', from: 1959, professions: ['spaceIndustry', 'aviation'], minGrade: 6, cost: 0, years: 2, perf: 4 },
  ],
  postingOdds: 0.08,
  postings: [
    { id: 'foreignBase', name: 'Flying from a Foreign Base', icon: '🌴', from: 1950, professions: ['aviation', 'flightAttendant', 'charterAviation'], minGrade: 3, years: 2, places: ['AE', 'HK', 'SG', 'QA', 'GB', 'US', 'AU'], happiness: 4, stress: 3, text: 'An airline abroad is hiring crews for two years, tax-free.' },
    { id: 'convoy', name: 'The Convoys', icon: '⚓', from: 1939, until: 1946, professions: SEA, minGrade: 1, years: 2, stress: 12, happiness: 1, when: (s) => y(s) >= 1939, text: 'The shipping ministry is putting your ship into the Atlantic convoys.', end: () => 'You came through the convoys. Many of your shipmates didn\'t.' },
    { id: 'lineAbroad', name: (s) => (y(s) < 1950 ? 'Building a Railway Abroad' : 'Running a Railway Abroad'), icon: '🚂', professions: ['railroad', 'steamRailway'], minGrade: 4, years: 2, places: ['IN', 'AR', 'KE', 'SA', 'CN', 'TR', 'BR', 'MY'], happiness: 3, stress: 4, text: 'A railway company abroad needs experienced railwaymen for two years.' },
    { id: 'antarcticFlying', name: 'Flying in the Antarctic', icon: '🧊', from: 1955, professions: ['aviation', 'charterAviation'], minGrade: 4, years: 1, places: ['AQ'], stress: 6, happiness: 6, text: 'The polar programme needs pilots for a season on the ice.' },
    { id: 'highway', name: 'A Long-Distance Run', icon: '🛣️', from: 1930, professions: ['trucking'], minGrade: 2, years: 1, places: ['CA', 'MX', 'DE', 'FR', 'ES', 'PL', 'TR'], happiness: 2, stress: 4, text: 'A haulier wants you on international runs for a year.' },
  ],
  awards: [
    { id: 'seaGallantry', name: (s) => (COMMONWEALTH.includes(cc(s)) ? 'the Sea Gallantry Medal' : 'a medal for gallantry at sea'), icon: '🏅', from: 1855, professions: SEA, minPerformance: 85, chance: 0.02, prestige: 3, text: 'You were decorated for a rescue at sea.' },
    { id: 'airmanship', name: (s) => (y(s) < 1960 ? 'an airmanship award' : 'a flight safety award'), icon: '🛩️', from: 1930, professions: ['aviation', 'charterAviation'], minPerformance: 88, chance: 0.02, prestige: 2, text: 'You were honoured for getting a crippled aircraft down safely.' },
    { id: 'millionMiles', name: (s) => (prof(s) === 'aviation' ? 'twenty thousand flying hours' : 'a million accident-free miles'), icon: '🎖️', from: 1940, professions: ['aviation', 'trucking', 'schoolBus'], minYears: 20, chance: 0.4, prestige: 1 },
    { id: 'spaceflight', name: 'a spaceflight', icon: '🚀', from: 1961, professions: ['spaceIndustry', 'aviation'], course: 'astronaut', minPerformance: 85, chance: 0.15, prestige: 6, text: 'You flew in space.' },
  ],
  licence: (s) => ({ aviation: 'atp', charterAviation: 'commercialPilot', flightAttendant: 'faCertificate', airTrafficControl: 'atcCert', merchantMarine: 'mmc', railroad: 'locomotiveEngineer', trucking: 'cdlA', schoolBus: 'schoolBusEndorsement', transit: 'cdlB' })[prof(s)] ?? null,
  regulator: (s) => {
    const p = prof(s);
    if (AIR.includes(p)) return regulatorFrom({ US: [y(s) < 1958 ? 'the Civil Aeronautics Board' : 'the FAA', 1938], GB: [y(s) < 1972 ? 'the Air Registration Board' : 'the Civil Aviation Authority', 1937], '*': ['the civil aviation authority', 1945] })(s);
    if (SEA.includes(p)) return regulatorFrom({ GB: [y(s) < 1980 ? 'the Board of Trade' : 'the Maritime and Coastguard Agency', 1850], US: [y(s) < 1946 ? 'the Steamboat Inspection Service' : 'the Coast Guard', 1871], '*': ['the maritime authority', 1900] })(s);
    if (['railroad', 'steamRailway'].includes(p)) return regulatorFrom({ GB: ['the Railway Inspectorate', 1840], US: [y(s) < 1966 ? 'the Interstate Commerce Commission' : 'the Federal Railroad Administration', 1887], '*': ['the railway inspectorate', 1900] })(s);
    if (ROAD.includes(p)) return regulatorFrom({ GB: ['the Traffic Commissioner', 1930], US: ['the state motor carrier office', 1935] })(s);
    return regulatorFrom({})(s);
  },
  complaintOdds: 0.016,
  complaints: [
    { id: 'incident', short: 'a safety incident', severity: 2, weight: 3, founded: 0.45, text: (s) => (AIR.includes(prof(s)) ? 'An aircraft you were flying came closer to another than it should have.' : SEA.includes(prof(s)) ? 'Your ship grounded on a sandbar on your watch.' : 'A signal or a junction was passed on your watch.') },
    { id: 'hours', short: 'hours rules', severity: 1, weight: (s) => (ROAD.includes(prof(s)) ? 3 : 1), founded: 0.55, text: 'Your logbook shows more hours than the rules allow.' },
    { id: 'drink', short: 'drinking on duty', severity: 3, weight: 0.6, founded: 0.5, text: 'You were breath-tested before a shift and the result was over the limit.' },
    { id: 'cargo', short: 'a lost load', severity: 1, weight: (s) => (ROAD.includes(prof(s)) || SEA.includes(prof(s)) ? 2 : 0), founded: 0.5, text: 'A load went missing between depots on your run.' },
  ],
  eliteOdds: 0.035,
  elite: [
    { id: 'chiefPilot', name: (s) => (SEA.includes(prof(s)) ? 'Commodore of the line' : AIR.includes(prof(s)) ? 'Chief pilot of the airline' : 'Chief operating officer of the railway'), icon: '🎖️', professions: [...AIR, ...SEA, 'railroad', 'steamRailway'], minGrade: 7, minYears: 20, years: 6, prestige: 4, stipend: 15000, text: 'The company wants you as its senior officer.' },
    { id: 'brotherhood', name: (s) => (AIR.includes(prof(s)) ? 'President of the pilots\' association' : SEA.includes(prof(s)) ? 'General Secretary of the seafarers\' union' : 'President of the engineers\' brotherhood'), icon: '✊', minGrade: 3, minYears: 15, years: 4, prestige: 2, stipend: 12000, text: 'The members have elected you to lead them.' },
    { id: 'accidentBoard', name: (s) => (cc(s) === 'US' ? 'A member of the National Transportation Safety Board' : 'Chief inspector of accidents'), icon: '🔍', from: 1967, minGrade: 7, minYears: 22, years: 5, prestige: 4, stipend: 20000, text: 'The government asks you to investigate the worst accidents.' },
  ],
};
