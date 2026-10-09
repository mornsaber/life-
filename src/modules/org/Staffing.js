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
import { PROVINCE_POPULATION } from '../world/Countries.js';

/** City-proper and county populations for each region. */
export const POPULATION = {
  rural: [4000, 25000], smalltown: [41000, 131000], midcity: [905000, 1320000], sunbelt: [975000, 1330000], chicago: [2665000, 5100000],
  dc: [680000, 680000], nyc: [8260000, 8260000], sf: [810000, 810000], miami: [450000, 2700000], seattle: [750000, 2270000],
  denver: [715000, 715000], gunnison: [6900, 17000], atlanta: [500000, 1070000], charlotte: [900000, 1160000], raleigh: [480000, 1180000],
  asheville: [95000, 270000], norfolk: [455000, 455000], philadelphia: [1550000, 1550000], pittsburgh: [303000, 1230000], boston: [650000, 770000],
  detroit: [633000, 1770000], minneapolis: [425000, 1260000], nashville: [690000, 715000], neworleans: [365000, 365000], phoenix: [1650000, 4500000],
  lasvegas: [660000, 2300000], elko: [20000, 54000], saltlake: [210000, 1190000], portland: [635000, 795000], bend: [103000, 205000],
  anchorage: [290000, 290000], fairbanks: [32000, 95000], honolulu: [1000000, 1000000], appalachia: [16500, 73000], amarillo: [200000, 255000],
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
  cityGov: { base: 'city', publicSafety: 4.6, publicWorks: 1.6, planning: 0.15, administration: 0.8, library: 0.35, utilities: 0.7 },
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

export const STAFFING_VERSION = 1;

/** Headcount for one department of a government organization, or null for types that keep their size bucket. */
export function staffingFor(org, deptId) {
  const r = RATIOS[org.typeId];
  if (!r) return null;
  if (r.fixed) return r.fixed[deptId] ?? null;
  const per = r[deptId];
  if (typeof per !== 'number') return null;
  const pop = r.base === 'state' ? statePopulation(org.stateId) : r.base === 'county' ? countyPopulation(org.regionId) : cityPopulation(org.regionId);
  // Transit scales with how much transit the city actually runs.
  const transit = r.transit ? Math.max(0.1, (REGIONS[org.regionId]?.transit ?? 30) / 50) : 1;
  return Math.max(3, Math.round((pop / 1000) * per * transit));
}

/** Set every department to the staffing its population calls for (new orgs, and older saves once). */
export function applyStaffing(org) {
  if (!org || org.business || org.closed) return org;
  if (!RATIOS[org.typeId]) return org;
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
  if (!r || r.fixed) return null;
  return r.base === 'state' ? statePopulation(org.stateId) : r.base === 'county' ? countyPopulation(org.regionId) : cityPopulation(org.regionId);
}
