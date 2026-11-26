/**
 * Work that belonged to one place: the fur trade of the Hudson's Bay Company, the sugar
 * plantations of Hawaii, the Nizam's own service in Hyderabad, and the stations of Antarctica.
 * Each is open only where it was (`countries`, `cities`, `provinces`: career/JobTrees.js) and only
 * while it lasted (`fromYear`/`untilYear`).
 */
import { eraYear } from '../../world/Eras.js';

const SUP = (reports, extra = {}) => ({ abilities: ['supervise'], reports, ...extra });
const MGMT = (reports, extra = {}) => ({ track: 'mgmt', abilities: ['supervise', 'budget', 'delegate'], reports, ...extra });

/** Who ran a country's Antarctic stations in the year being played. */
function antarcticProgramme(cc) {
  const y = eraYear();
  switch (cc) {
    case 'GB': return y < 1962 ? 'the Falkland Islands Dependencies Survey' : 'the British Antarctic Survey';
    case 'US': return y < 1971 ? 'Operation Deep Freeze (McMurdo Station)' : 'the US Antarctic Program (McMurdo Station)';
    case 'AU': return 'the Australian Antarctic Division (Mawson Station)';
    case 'NZ': return y < 1996 ? 'the DSIR Antarctic Division (Scott Base)' : 'Antarctica New Zealand (Scott Base)';
    case 'AR': return 'the Argentine Antarctic Institute (Esperanza Base)';
    case 'CL': return 'the Chilean Antarctic Institute (Frei Base)';
    case 'NO': return 'the Norwegian Polar Institute (Troll Station)';
    case 'FR': return y < 1992 ? 'the Expéditions Polaires Françaises (Dumont d\'Urville)' : 'the French Polar Institute (Dumont d\'Urville)';
    case 'RU': return y < 1992 ? 'the Soviet Antarctic Expedition (Vostok Station)' : 'the Russian Antarctic Expedition (Vostok Station)';
    case 'JP': return 'the Japanese Antarctic Research Expedition (Syowa Station)';
    case 'ZA': return 'the South African National Antarctic Programme (SANAE)';
    case 'IN': return 'the Indian Antarctic Programme (Maitri Station)';
    case 'CN': return 'the Chinese Arctic and Antarctic Administration (Great Wall Station)';
    case 'DE': return 'the Alfred Wegener Institute (Neumayer Station)';
    default: return 'the national Antarctic programme';
  }
}
/** Stations, and the year each country first wintered over (Operation Tabarin's huts became FIDS in 1945). */
const ANTARCTIC_FROM = { GB: 1945, AR: 1947, CL: 1947, AU: 1954, US: 1956, RU: 1956, FR: 1956, NZ: 1957, JP: 1957, NO: 1957, ZA: 1960, IN: 1983, CN: 1985, DE: 1981 };

const careers = {
  hudsonsBay: {
    id: 'hudsonsBay', name: 'The Hudson\'s Bay Company', icon: '🦫', sector: 'private', payMultiplier: 0.7, untilYear: 1987, minAge: 14,
    countries: ['CA'], sizes: { small: 2, medium: 3, large: 2, enterprise: 1 }, union: null, entry: {},
    employers: ['the Hudson\'s Bay Company'],
    ladder: [
      ['labourer', 'Labourer (Company Servant)', 1, { years: 2 }],
      ['voyageur', 'Voyageur (York Boat Man)', 1, { years: 2 }],
      ['interpreter', 'Interpreter', 2, { years: 2 }],
      ['apprentice', 'Apprentice Clerk', 2, { years: 3 }],
      ['clerk', 'Clerk', 3, { years: 3 }],
      ['postmaster', 'Postmaster', 4, SUP(8, { years: 3 })],
      ['trader', 'Chief Trader', 5, SUP(25, { years: 4 })],
      ['factor', 'Chief Factor', 7, MGMT(120, { years: 4 })],
      ['commissioner', 'Fur Trade Commissioner', 8, MGMT(800)],
    ],
  },
  hawaiiSugar: {
    id: 'hawaiiSugar', name: 'Sugar Plantation (Hawaii)', icon: '🎋', sector: 'private', payMultiplier: 0.6, fromYear: 1835, untilYear: 2016, minAge: 14,
    provinces: ['HI'], replaces: ['plantation'], sizes: { small: 1, medium: 2, large: 3, enterprise: 2 }, union: { chance: 0.5, name: 'the ILWU', strike: true }, entry: {},
    employers: ['the Kōloa Plantation', 'Castle & Cooke', 'Alexander & Baldwin', 'C. Brewer & Co.', 'American Factors', 'Theo H. Davies & Co.'],
    ladder: [
      ['canecutter', 'Cane Cutter', 1, { years: 2 }],
      ['hapaiko', 'Hāpai Kō (Cane Loader)', 1, { years: 2 }],
      ['ditchman', 'Irrigation Ditchman', 2, { years: 2 }],
      ['millhand', 'Mill Hand (Boiling House)', 2, { years: 3 }],
      ['luna', 'Luna (Field Boss)', 3, SUP(30, { years: 3 })],
      ['headLuna', 'Head Luna', 4, SUP(150, { years: 3 })],
      ['millEngineer', 'Mill Engineer', 5, { years: 3 }],
      ['manager', 'Plantation Manager', 7, MGMT(1200, { years: 4 })],
      ['director', 'Agency Director', 9, MGMT(8000)],
    ],
  },
  nizamService: {
    id: 'nizamService', name: 'The Nizam\'s Service', icon: '🕌', sector: 'state', payMultiplier: 0.8, untilYear: 1948, minAge: 18,
    cities: ['hyderabad'], sizes: { small: 0, medium: 1, large: 2, enterprise: 2 }, union: null, entry: {},
    employers: ['the Nizam\'s Government', 'the Revenue Department, Hyderabad State', 'the Nizam\'s Secretariat'],
    ladder: [
      ['munshi', 'Munshi (Clerk)', 1, { years: 2 }],
      ['peshkar', 'Peshkar', 2, { years: 2 }],
      ['naibTahsildar', 'Naib Tahsildar', 3, { years: 3 }],
      ['tahsildar', 'Tahsildar', 4, SUP(40, { years: 3 })],
      ['taluqdar', 'Taluqdar (District Collector)', 5, SUP(300, { years: 4 })],
      ['subedar', 'Subedar (Divisional Commissioner)', 6, MGMT(1500, { years: 4 })],
      ['secretary', 'Secretary to Government', 7, MGMT(3000, { years: 4 })],
      ['minister', 'Member of the Executive Council', 8, MGMT(10000, { years: 4 })],
      ['diwan', 'Diwan (Prime Minister)', 10, MGMT(40000)],
    ],
  },
  antarctic: {
    id: 'antarctic', name: 'Antarctic Station', icon: '🐧', sector: 'state', payMultiplier: 1.1, fromYear: 1945, minAge: 21,
    countries: Object.keys(ANTARCTIC_FROM), countryFrom: ANTARCTIC_FROM, sizes: { small: 1, medium: 1, large: 1, enterprise: 1 }, union: null, entry: {},
    employers: ['the national Antarctic programme'],
    hooks: { employerName: (_city, _rng, _state, _sid, _rid, cc) => antarcticProgramme(cc) },
    ladder: [
      ['fieldAssistant', 'Field Assistant (General Assistant)', 2, { years: 2 }],
      ['technician', 'Base Technician', 3, { years: 2 }],
      ['observer', 'Meteorological Observer', 3, { years: 2 }],
      ['wintering', 'Wintering Scientist', 4, { years: 3 }],
      ['senior', 'Senior Scientist', 5, { years: 3 }],
      ['baseLeader', 'Base Commander (Station Leader)', 6, SUP(40, { years: 3 })],
      ['operations', 'Operations Manager', 7, MGMT(300, { years: 4 })],
      ['director', 'Programme Director', 8, MGMT(1000)],
    ],
  },
  klondike: {
    id: 'klondike', name: 'The Klondike Gold Rush', icon: '⛏️', sector: 'private', payMultiplier: 0.9, fromYear: 1896, untilYear: 1905, minAge: 16,
    countries: ['CA', 'US'], sizes: { small: 3, medium: 1, large: 0, enterprise: 0 }, union: null, entry: {},
    employers: ['a claim on Bonanza Creek', 'a claim on Eldorado Creek', 'the outfitters at Dawson City'],
    ladder: [
      ['packer', 'Packer (the Chilkoot Pass)', 1, { years: 1 }],
      ['sourdough', 'Placer Miner', 2, { years: 2 }],
      ['claimHolder', 'Claim Holder', 3, { years: 2 }],
      ['layman', 'Layman (Working a Lay on Shares)', 3, { years: 2 }],
      ['foreman', 'Claim Foreman', 4, SUP(20, { years: 2 })],
      ['owner', 'Claim Owner', 5, SUP(60, { years: 3 })],
      ['king', 'Klondike King', 7, MGMT(400)],
    ],
  },
  sheepStation: {
    id: 'sheepStation', name: 'Sheep Station (the Outback)', icon: '🐑', sector: 'private', payMultiplier: 0.8, fromYear: 1820, minAge: 14,
    countries: ['AU', 'NZ'], sizes: { small: 2, medium: 2, large: 1, enterprise: 0 }, union: { chance: 0.5, name: 'the Shearers\' Union', strike: true }, entry: {},
    employers: ['a station on the Darling', 'a station in the Riverina', 'a high-country run'],
    ladder: [
      ['rouseabout', 'Rouseabout', 1, { years: 1 }],
      ['jackaroo', 'Jackaroo', 1, { years: 2 }],
      ['stockman', 'Stockman', 2, { years: 2 }],
      ['shearer', 'Shearer', 2, { years: 3 }],
      ['gunShearer', 'Gun Shearer', 3, { years: 3 }],
      ['overseer', 'Overseer', 4, SUP(20, { years: 3 })],
      ['manager', 'Station Manager', 5, SUP(60, { years: 4 })],
      ['grazier', 'Grazier (Squatter)', 7, MGMT(200)],
    ],
  },
  canalZone: {
    id: 'canalZone', name: 'The Panama Canal Zone', icon: '🚢', sector: 'federal', payMultiplier: 1.1, fromYear: 1904, untilYear: 1999, minAge: 18,
    countries: ['PA', 'US'], sizes: { small: 0, medium: 1, large: 2, enterprise: 2 }, union: { chance: 0.4, name: 'the Canal Zone workers\' union', strike: false }, entry: {},
    employers: ['the Isthmian Canal Commission', 'the Panama Canal Company'],
    ladder: [
      ['laborer', 'Canal Laborer', 1, { years: 2 }],
      ['linehandler', 'Line Handler', 2, { years: 2 }],
      ['lockOperator', 'Lock Operator', 3, { years: 3 }],
      ['towingLoco', 'Towing Locomotive Operator', 3, { years: 2 }],
      ['pilotTrainee', 'Pilot in Training', 4, { years: 3 }],
      ['pilot', 'Canal Pilot', 5, { years: 4 }],
      ['marineDirector', 'Marine Director', 7, MGMT(500, { years: 4 })],
      ['governor', 'Governor of the Canal Zone', 9, MGMT(10000)],
    ],
  },
  svalbardCoal: {
    id: 'svalbardCoal', name: 'Svalbard Coal', icon: '⛏️', sector: 'private', payMultiplier: 1.2, fromYear: 1906, untilYear: 2025, minAge: 18,
    countries: ['NO', 'SJ', 'RU'], sizes: { small: 0, medium: 1, large: 1, enterprise: 0 }, union: { chance: 0.7, name: 'the miners\' union', strike: true }, entry: {},
    employers: { NO: ['Store Norske Spitsbergen Kulkompani (Longyearbyen)'], SJ: ['Store Norske Spitsbergen Kulkompani (Longyearbyen)'], RU: ['Arktikugol (Barentsburg)'], '*': ['Store Norske Spitsbergen Kulkompani (Longyearbyen)'] },
    ladder: [
      ['hewer', 'Mine Worker', 2, { years: 2 }],
      ['shotfirer', 'Shotfirer', 3, { years: 2 }],
      ['machineOp', 'Longwall Machine Operator', 3, { years: 3 }],
      ['shiftLeader', 'Shift Leader', 4, SUP(30, { years: 3 })],
      ['mineManager', 'Mine Manager', 6, MGMT(250, { years: 4 })],
      ['director', 'Managing Director', 8, MGMT(600)],
    ],
  },
};

export default { id: 'careers-places', version: 1, careers };
