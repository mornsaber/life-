/**
 * How many people a government organization employs, from the population it
 * serves — so a police department in New York City is tens of thousands of
 * people and one in Cedar Falls is a few dozen.
 *
 *   city / county / school district / transit / airport   per 1,000 residents of the city or county
 *   state agencies                                         per 1,000 residents of the state
 *   federal departments                                    their real nationwide headcount
 *
 * Ratios follow typical U.S. staffing: about 2.5 police and 1.5 firefighters
 * per 1,000 residents, one teacher or aide for every ~80 residents, and so on.
 * Organizations of other kinds (companies) keep their size buckets.
 */
import { REGIONS } from '../life/Regions.js';
import { PROVINCE_POPULATION, FOREIGN_CITIES } from '../world/Countries.js';

/** City-proper and county populations for each region. */
export const POPULATION = {
  rural: [4000, 25000], smalltown: [41000, 131000], midcity: [905000, 1320000], sunbelt: [975000, 1330000], chicago: [2665000, 5100000],
  dc: [680000, 680000], nyc: [8260000, 8260000], sf: [810000, 810000], miami: [450000, 2700000], seattle: [750000, 2270000],
  denver: [715000, 715000], gunnison: [6900, 17000], atlanta: [500000, 1070000], charlotte: [900000, 1160000], raleigh: [480000, 1180000],
  asheville: [95000, 270000], norfolk: [455000, 455000], philadelphia: [1550000, 1550000], pittsburgh: [303000, 1230000], boston: [650000, 770000],
  detroit: [633000, 1770000], minneapolis: [425000, 1260000], nashville: [690000, 715000], neworleans: [365000, 365000], phoenix: [1650000, 4500000],
  lasvegas: [660000, 2300000], elko: [20000, 54000], saltlake: [210000, 1190000], portland: [635000, 795000], bend: [103000, 205000],
  anchorage: [290000, 290000], fairbanks: [32000, 95000], honolulu: [1000000, 1000000], appalachia: [16500, 73000], amarillo: [200000, 255000],
  losangeles: [3820000, 9700000], sandiego: [1390000, 3290000], houston: [2300000, 4800000], dallas: [1300000, 2600000], sanantonio: [1450000, 2010000],
  jacksonvillefl: [985000, 1000000], tampa: [400000, 1500000], coloradosprings: [490000, 740000], tacoma: [220000, 930000], dayton: [137000, 535000],
  columbusga: [200000, 200000], fayetteville: [208000, 335000], killeen: [156000, 370000], clarksville: [180000, 230000], jacksonvillenc: [72000, 205000],
  pensacola: [54000, 320000], ogden: [87000, 270000], yuma: [98000, 210000], valdosta: [56000, 120000], greatfalls: [60000, 84000], watertown: [24000, 116000],
  stafford: [160000, 160000], fallon: [9500, 26000], twentyninepalms: [28000, 100000], leesville: [5600, 48000], kodiak: [5500, 13000], marfa: [1800, 4400],
  eureka: [26000, 136000], flagstaff: [77000, 145000], moab: [5400, 9700], burns: [2700, 7500], houghton: [8000, 36000], ely: [3200, 10000], decorah: [7500, 20000],
  galena: [3200, 22000], wellsboro: [3200, 41000], elkins: [7000, 28000], boone: [20000, 56000], natchitoches: [17000, 37000], waycross: [13000, 36000],
  hilo: [45000, 200000], nantucket: [14000, 14000], athens: [25000, 62000], cookeville: [35000, 80000],
};
export const STATE_POPULATION = {
  MT: 1.13e6, IA: 3.2e6, OH: 11.8e6, TX: 30.5e6, IL: 12.5e6, DC: 0.68e6, NY: 19.6e6, CA: 39.0e6, FL: 22.6e6, WA: 7.8e6, CO: 5.9e6, GA: 11.0e6, NC: 10.8e6, VA: 8.7e6,
  PA: 13.0e6, MA: 7.0e6, MI: 10.0e6, MN: 5.7e6, TN: 7.1e6, LA: 4.6e6, AZ: 7.4e6, NV: 3.2e6, UT: 3.4e6, OR: 4.2e6, AK: 0.73e6, HI: 1.44e6, WV: 1.77e6,
};
export const cityPopulation = (regionId) => POPULATION[regionId]?.[0] ?? REGIONS[regionId]?.population?.[0] ?? 250000;
export const countyPopulation = (regionId) => POPULATION[regionId]?.[1] ?? REGIONS[regionId]?.population?.[1] ?? 400000;
export const statePopulation = (stateId) => STATE_POPULATION[stateId] ?? PROVINCE_POPULATION[stateId] ?? 5e6;

/**
 * Staff per 1,000 residents, by organization type and department. `base` picks the population:
 * 'city', 'county' or 'state'. A number per department, or `fixed` headcounts for nationwide bodies.
 */
const RATIOS = {
  cityGov: { base: 'city', publicSafety: 4.6, publicWorks: 1.6, planning: 0.15, inspections: 0.2, administration: 0.8, library: 0.35, utilities: 0.7, schools: 12, socialCare: 0.6, health: 0.3 },
  countyGov: { base: 'county', sheriff: 1.1, health: 0.3, da: 0.12, animalServices: 0.05 },
  schoolDistrict: { base: 'city', instruction: 12, transportation: 0.7, health: 0.15, studentServices: 0.6, earlyChildhood: 0.5 },
  transitAuthority: { base: 'county', transit: true, operations: 0.8, maintenance: 0.35, police: 0.05 },
  airportAuthority: { base: 'county', police: 0.06, arff: 0.05, admin: 0.25 },
  communityCollegeDistrict: { base: 'county', instruction: 0.9 },
  diocese: { base: 'county', parishes: 0.15 },
  statePublicSafety: { base: 'state', statePolice: 0.16, crimeLab: 0.015 },
  stateCorrections: { base: 'state', institutions: 1.0, community: 0.25 },
  stateJustice: { base: 'state', courts: 0.6, publicDefender: 0.08 },
  stateRevenue: { base: 'state', revenue: 0.15 },
  stateSocialServices: { base: 'state', cps: 0.6 },
  stateNaturalResources: { base: 'state', wildlife: 0.06, forestry: 0.05, fireProtection: 0.08, environment: 0.08 },
  stateTransportation: { base: 'state', highways: 0.6 },
  stateLegislature: { base: 'state', staff: 0.08 },
  stateUniversity: { base: 'state', academic: 1.4, police: 0.01 },
  // Nationwide: real headcounts.
  doj: { fixed: { fbi: 37000, dea: 10000, atf: 5500, usms: 5400, bop: 35000, oig: 500 } },
  dhs: { fixed: { tsa: 60000, cbp: 65000, usss: 8000 } },
  usdot: { fixed: { faa: 45000 } },
  interior: { fixed: { nps: 20000 } },
  stateDept: { fixed: { fs: 76000 } },
  intelCommunity: { fixed: { intel: 100000 } },
  cia: { fixed: { operations: 7000, analysis: 6000, scitech: 4000, digital: 4000 } },
  nsa: { fixed: { sid: 14000, cyber: 10000, research: 8000 } },
  benefitsAgencies: { fixed: { claims: 470000 } },
  postalService: { fixed: { retail: 640000 } },
  nationalLaboratory: { fixed: { science: 4500 } },
  weatherService: { fixed: { forecast: 4000 } },
};

/**
 * Public bodies abroad (a police force, an ambulance trust, a prison service, the courts) and
 * emergency services: staff per 1,000 people in the area they cover — the nation, a province, or
 * the metro area around their city (West Midlands Police covers far more than Birmingham).
 */
const SERVICE_RATIOS = {
  police: 3.2, fire: 0.9, ems: 0.7, dispatch: 0.08, statePolice: 0.55, transitPolice: 0.04,
  corrections: 0.5, probation: 0.1, courts: 0.35, prosecution: 0.08, publicDefender: 0.04, cps: 0.35,
  forensics: 0.02, forester: 0.05, stateFire: 0.06, dot: 0.25, environmental: 0.06, publicHealth: 0.25,
  revenue: 0.4, gameWarden: 0.02, emergencyManagement: 0.03, transit: 1.0, transitMaintenance: 0.4, schoolBus: 0.3, education: 12,
};
/** Countries whose police (the "statePolice" career) is one national force. */
export const NATIONAL_POLICE = ['NZ', 'IE', 'SG', 'IL', 'PS', 'FR', 'ES', 'NL', 'SE', 'KR', 'KE', 'NG', 'ID', 'PH'];
const COUNTRY_POPULATION = {};
/** A country's population from its provinces (or its cities' metro areas where provinces aren't listed). */
export function countryPopulation(cc) {
  if (COUNTRY_POPULATION[cc] == null) {
    const provinces = Object.entries(PROVINCE_POPULATION).filter(([id]) => id.startsWith(`${cc}-`)).reduce((s, [, n]) => s + n, 0);
    const cities = Object.values(FOREIGN_CITIES).filter((r) => r.country === cc).reduce((s, r) => s + (r.population?.[1] ?? r.population?.[0] ?? 0), 0);
    COUNTRY_POPULATION[cc] = Math.max(provinces, cities, 1e6);
  }
  return COUNTRY_POPULATION[cc];
}
/** Whom a public body serves: the nation, its province, or its metro area. */
function servicePopulation(org) {
  if (org.national) return countryPopulation(org.countryId ?? REGIONS[org.regionId]?.country ?? 'US');
  if (org.servedBy === 'province') return statePopulation(org.stateId);
  return countyPopulation(org.regionId);
}
function serviceStaffing(org) {
  if (!org || !(org.typeId === 'emergencyService' || org.typeId?.startsWith('body:'))) return null;
  // The country's (or prefecture's) only police are staffed as a whole police service.
  const per = org.serviceId === 'statePolice' && org.primaryPolice ? SERVICE_RATIOS.police * 0.8 : SERVICE_RATIOS[org.serviceId];
  if (per == null) return null;
  const transit = org.serviceId === 'transit' || org.serviceId === 'transitMaintenance' ? Math.max(0.1, (REGIONS[org.regionId]?.transit ?? 30) / 50) : 1;
  return Math.max(12, Math.round((servicePopulation(org) / 1000) * per * transit * scaleOf(org, null)));
}
/**
 * How much bigger (or smaller) than its base an organization is now: the population it serves
 * has grown or shrunk (Population), and its government funds the department more or less (Budgets).
 */
const scaleOf = (org, deptId) => (org.popFactor ?? 1) * ((deptId ? org.departments?.[deptId]?.fundingFactor : org.fundingFactor) ?? 1);

export const STAFFING_VERSION = 2;

/** Headcount for one department of a government organization, or null for types that keep their size bucket. */
export function staffingFor(org, deptId) {
  const r = RATIOS[org.typeId];
  if (!r) return serviceStaffing(org);
  if (r.fixed) return r.fixed[deptId] ?? null;
  const per = r[deptId];
  if (typeof per !== 'number') return null;
  const pop = r.base === 'state' ? statePopulation(org.stateId) : r.base === 'county' ? countyPopulation(org.regionId) : cityPopulation(org.regionId);
  // Transit scales with how much transit the city actually runs.
  const transit = r.transit ? Math.max(0.1, (REGIONS[org.regionId]?.transit ?? 30) / 50) : 1;
  return Math.max(3, Math.round((pop / 1000) * per * transit * scaleOf(org, deptId)));
}

/** Set every department to the staffing its population calls for (new orgs, and older saves once). */
export function applyStaffing(org) {
  if (!org || org.business || org.closed) return org;
  if (!RATIOS[org.typeId] && serviceStaffing(org) == null) return org;
  for (const d of Object.values(org.departments)) {
    const n = staffingFor(org, d.id);
    if (n != null) d.headcount = n;
  }
  org.staffing = STAFFING_VERSION;
  return org;
}

/** The population an organization serves, for display. */
export function servedPopulation(org) {
  const r = RATIOS[org?.typeId];
  if (!r && SERVICE_RATIOS[org?.serviceId]) return Math.round(servicePopulation(org) * (org.popFactor ?? 1));
  if (!r || r.fixed) return null;
  return Math.round((r.base === 'state' ? statePopulation(org.stateId) : r.base === 'county' ? countyPopulation(org.regionId) : cityPopulation(org.regionId)) * (org.popFactor ?? 1));
}
