/**
 * Work a place is too small to have. Pitcairn's forty-odd people have a council, a shop, a school,
 * a nurse, a policeman sent out from New Zealand, the longboats and the land: no law firms, no
 * actuaries, no general hospital. Tuvalu has a hospital and a few lawyers but no stock exchange.
 * Each career needs a country of at least so many people; the international bodies and the
 * worldwide orders are exempt (you join them, then go where they send you).
 */
import { setAvailabilityFilter } from './JobTrees.js';
import { peopleIn } from '../org/Staffing.js';

/** Work every inhabited place has. */
const EVERYWHERE = ['agriculture', 'fishing', 'retail', 'postal', 'municipalAdmin', 'education', 'nursing', 'police', 'clergy', 'catholicClergy', 'anglicanClergy',
  'trades', 'carpentry', 'domesticService', 'caregiving', 'publicWorks', 'docks', 'childcare', 'hospitality', 'culinary', 'plantation', 'whaling', 'blacksmith',
  'merchantMarine', 'cruise', 'colonialService', 'colonialPolice', 'colonialTroops', 'colonialMedical', 'gurkhaContingent', 'tradingCompany', 'lamplighter', 'milkRound', 'coachman', 'forester'];
/** The smallest country (people) each other career needs; unlisted ones need DEFAULT. */
const MIN_PEOPLE = {
  medical: 1000, courts: 1000, prosecution: 1000, revenue: 1000, ministry: 1000, foreignService: 1000, legislativeStaff: 1000, fire: 1000, ems: 1000, dispatch: 1000, waterUtility: 1000, lineworker: 1000,
  automotive: 1000, plumbing: 1000, cosmetology: 1000, funeral: 2000, library: 2000, corrections: 2000, jail: 2000, socialWork: 2000, publicHealth: 2000,
  law: 2000, legalSupport: 2000, pharmacy: 3000, dentistry: 5000, accounting: 5000, veterinary: 5000, journalism: 5000, telegraph: 1000, switchboard: 2000, typingPool: 5000,
  airTrafficControl: 20000, aviation: 100000, charterAviation: 20000, flightAttendant: 100000, airportPolice: 1e6, airportFire: 200000, railroad: 500000, steamRailway: 300000,
  transit: 200000, transitMaintenance: 200000, paratransit: 200000, schoolBus: 20000, transitPolice: 1e6, universityPolice: 1e6, statePolice: 1e6, privatePolice: 1e6,
  physicianAssistant: 50000, physicalTherapy: 20000, occupationalTherapy: 50000, speechPathology: 50000, respiratoryTherapy: 100000, imaging: 50000, dietitian: 50000, optometry: 20000,
  chiropractic: 100000, counseling: 20000, psychology: 50000, dentalHygiene: 20000, travelNursing: 1e6, privateEms: 500000, cps: 20000,
  corporate: 20000, marketing: 50000, sales: 10000, humanResources: 50000, finance: 50000, insurance: 20000, actuary: 1e6, realestate: 5000, propertyManagement: 20000,
  tech: 100000, cybersecurity: 500000, dataScience: 1e6, aiOps: 1e6, gameDevelopment: 1e6, research: 1e6, nationalLab: 5e6, spaceIndustry: 1e7,
  engineering: 20000, structuralEng: 100000, mechanicalEng: 100000, electricalEng: 100000, chemicalEng: 1e6, aerospaceEng: 5e6, petroleumEng: 1e6, nuclearEng: 5e6, architecture: 20000, surveying: 5000, environmental: 100000, meteorology: 100000,
  university: 300000, college: 100000, communityCollege: 200000, maritimeFaculty: 1e6, manufacturing: 20000, millWork: 20000, coalMining: 100000, oilGas: 100000, renewableEnergy: 100000,
  trucking: 5000, logistics: 50000, acting: 100000, music: 5000, athletics: 50000, design: 50000, contentCreator: 5000, interpreter: 10000, fitness: 10000,
  intelligence: 1e6, caseOfficer: 1e6, sigint: 3e6, privateMilitary: 1e6, privateSecurity: 10000, privateInvestigator: 100000, bailBonds: 1e6, forensics: 500000, probation: 50000, privatePrisons: 1e6,
  gendarmerie: 500000, emergencyManagement: 50000, regulatory: 50000, planning: 20000, benefitsClaims: 20000, councilInspector: 10000, dot: 100000, oig: 1e6, publicDefender: 200000,
  gameWarden: 10000, parkService: 20000, animalControl: 20000, tsa: 1e6, welding: 5000, hvac: 20000, ironworking: 100000, craneOperator: 100000, travellingSales: 5000, nonprofit: 5000,
};
const DEFAULT = 2000;

/** The people a career needs in a country (0: anywhere). */
export function minPeopleFor(p) {
  if (p.intl || p.religiousOrder || p.anywhere) return 0;
  const id = String(p.base ?? p.id).replace(/^[a-z]{2}_/, '');
  if (EVERYWHERE.includes(id)) return 0;
  return MIN_PEOPLE[id] ?? DEFAULT;
}
/** Whether a country of `people` can have this career. */
export const placeHas = (p, cc) => peopleIn(cc) >= minPeopleFor(p);

setAvailabilityFilter((state, p) => placeHas(p, state.character?.countryId ?? 'US'));
