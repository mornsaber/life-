/**
 * Farming, fishing, forestry and the old trades of the land: agricultural college, the
 * skipper's ticket, the forester's diploma; a season abroad, the shearing circuit, the fleet in
 * distant waters; show prizes, the Nuffield scholarship (1947); the fisheries inspector; the
 * county agricultural society and the farmers' union.
 */
import { yearNow } from '../../world/Eras.js';
import { UNION, regulatorFrom, COMMONWEALTH } from './blocks.js';

const y = (s) => yearNow(s);
const cc = (s) => s.character.countryId ?? 'US';
const prof = (s) => s.career?.job?.professionId;
const FARM = ['agriculture', 'plantation'];
const SEA = ['fishing', 'whaling'];

export const LAND = {
  id: 'land',
  name: 'The Land & the Sea',
  professions: [...FARM, ...SEA, 'forester'],
  use: [UNION],
  specialtyAt: 3,
  specialties: [
    { id: 'dairy', name: 'Dairy', icon: '🐄', professions: FARM },
    { id: 'arable', name: 'Arable', icon: '🌾', professions: FARM },
    { id: 'sheep', name: 'Sheep', icon: '🐑', professions: FARM },
    { id: 'orchard', name: 'Fruit and orchards', icon: '🍎', professions: FARM },
    { id: 'inshore', name: 'Inshore', icon: '🦞', professions: SEA },
    { id: 'distant', name: 'Distant water', icon: '🌊', professions: SEA },
    { id: 'plantation', name: 'Plantation forestry', icon: '🌲', professions: ['forester'] },
    { id: 'woodland', name: 'Ancient woodland', icon: '🌳', professions: ['forester'] },
  ],
  courses: [
    { id: 'agCollege', name: (s) => (y(s) < 1900 ? 'a course at the Royal Agricultural College' : 'agricultural college'), icon: '🌾', from: 1845, professions: FARM, minGrade: 1, cost: 4000, years: 1, perf: 7 },
    { id: 'skipper', name: (s) => (y(s) < 1960 ? 'the skipper\'s certificate' : 'a fishing skipper\'s ticket'), icon: '⚓', from: 1883, professions: SEA, minGrade: 2, cost: 800, passRate: 0.75, perf: 4 },
    { id: 'foresterDip', name: (s) => (y(s) < 1950 ? 'the forestry school' : 'a forestry diploma'), icon: '🌲', from: 1880, professions: ['forester'], minGrade: 2, cost: 3000, years: 1, perf: 6 },
    { id: 'chainsaw', name: 'a chainsaw certificate', icon: '🪚', from: 1960, professions: ['forester', 'agriculture'], minGrade: 1, cost: 300, renew: 5, perf: 2 },
    { id: 'pesticide', name: 'a spraying certificate', icon: '🧪', from: 1986, professions: FARM, minGrade: 2, cost: 300, renew: 5, perf: 2 },
  ],
  postingOdds: 0.07,
  postings: [
    { id: 'harvestAbroad', name: 'A Harvest Season Abroad', icon: '🌾', professions: FARM, minGrade: 1, years: 1, places: ['AU', 'NZ', 'CA', 'US', 'GB', 'FR'], happiness: 5, stress: 3, text: 'The harvest is short of hands on the other side of the world.' },
    { id: 'shearing', name: 'The Shearing Circuit', icon: '🐑', professions: ['agriculture'], minGrade: 2, years: 1, places: ['AU', 'NZ'], happiness: 4, stress: 4, text: 'A shearing gang is going round the stations for the season.' },
    { id: 'distantWater', name: 'A Distant-Water Trip', icon: '🧊', professions: SEA, minGrade: 2, years: 1, places: ['IS', 'NO', 'GL', 'CA'], stress: 8, happiness: 2, text: 'A trawler is going north to the Arctic grounds for the long trip.' },
    { id: 'colonialForest', name: 'The Colonial Forest Service', icon: '🌴', until: 1965, professions: ['forester'], minGrade: 3, years: 3, places: ['IN', 'MM', 'KE', 'MY', 'NG', 'GH'], happiness: 3, stress: 4, when: (s) => COMMONWEALTH.includes(cc(s)), text: 'The colonial forest service wants trained foresters in the tropics.' },
  ],
  awards: [
    { id: 'show', name: (s) => (cc(s) === 'GB' ? 'a first at the Royal Show' : 'a first at the state fair'), icon: '🎀', from: 1839, professions: FARM, minYears: 3, minPerformance: 75, chance: 0.06, prestige: 1, text: 'Your beasts took first prize at the show.' },
    { id: 'nuffield', name: 'a Nuffield Farming Scholarship', icon: '🎓', from: 1947, countries: COMMONWEALTH, professions: FARM, minGrade: 4, minPerformance: 80, chance: 0.04, prestige: 2 },
    { id: 'conservationFarm', name: 'a farm conservation award', icon: '🦉', from: 1970, professions: [...FARM, 'forester'], minGrade: 3, minPerformance: 75, chance: 0.04, prestige: 1 },
  ],
  regulator: (s) => (SEA.includes(prof(s)) ? regulatorFrom({ GB: ['the fisheries inspectorate', 1890], US: ['the fisheries service', 1871], '*': ['the fisheries authority', 1950] })(s) : regulatorFrom({ '*': ['the agricultural inspectorate', 1920] })(s)),
  complaintOdds: 0.012,
  complaints: [
    { id: 'quota', short: 'over-fishing your quota', severity: 2, weight: (s) => (SEA.includes(prof(s)) && y(s) >= 1977 ? 3 : 0), founded: 0.5, text: 'Inspectors say your landings were well over your quota.' },
    { id: 'welfare', short: 'animal welfare', severity: 2, weight: (s) => (FARM.includes(prof(s)) ? 2 : 0), founded: 0.45, text: 'A vet reported the state of your animals to the inspector.' },
    { id: 'pollution', short: 'pollution of a river', severity: 2, weight: 1, founded: 0.5, text: 'Slurry from your land killed the fish in the river.' },
    { id: 'felling', short: 'illegal felling', severity: 1, weight: (s) => (prof(s) === 'forester' ? 2 : 0), founded: 0.5, text: 'Trees protected by order came down on land you managed.' },
  ],
  eliteOdds: 0.035,
  elite: [
    { id: 'society', name: (s) => (cc(s) === 'GB' ? 'President of the county agricultural society' : 'President of the state farm bureau'), icon: '🏛️', professions: FARM, minGrade: 4, minYears: 18, years: 2, prestige: 2, text: 'The society has elected you its president.' },
    { id: 'nfu', name: (s) => (cc(s) === 'GB' ? 'President of the National Farmers\' Union' : 'President of the farmers\' union'), icon: '✊', from: 1908, professions: FARM, minGrade: 5, minYears: 22, minAwards: 1, years: 4, prestige: 4, stipend: 15000, text: 'The farmers have elected you their national president.' },
    { id: 'harbourMaster', name: 'Harbour master of a fishing port', icon: '⚓', professions: SEA, minGrade: 4, minYears: 18, years: 8, prestige: 2, stipend: 8000, text: 'The port wants you as its harbour master.' },
  ],
};
