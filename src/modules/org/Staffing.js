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
import { demographyAt } from '../world/HistoricalData.js';
import { eraYear } from '../world/Eras.js';

/** A country's people in the year being played (the demography series, in thousands; at least a few dozen). */
export const peopleIn = (cc) => Math.max(40, Math.round((demographyAt(cc, Math.min(eraYear(), 2025))?.pop ?? 1000) * 1000));
/**
 * No employer outgrows its country: one national body employs at most ~2% of the people, a firm
 * at most ~1% (Pitcairn's post office is one person, not fifty thousand). International bodies
 * (the UN, NATO, the Jesuits) keep their size: their staff are everywhere.
 */
/**
 * International bodies are the size they really are (roughly, staff of recent decades): the
 * Swiss Guard is about 135 men, not tens of thousands.
 */
const KNOWN_STAFF = [
  [/Grand Magistry/i, 100], [/Economic and Social Commission|ESCAP|ESCWA/i, 600], [/International Energy Agency/i, 300], [/GATT Secretariat/i, 300],
  [/OAU General Secretariat/i, 600], [/Inter-American Commission on Human Rights/i, 80], [/Inter-American Court/i, 60], [/European Court of Human Rights/i, 650], [/Nuclear Energy Agency/i, 100],
  [/Swiss Guard/i, 135], [/Gendarmerie Corps of Vatican/i, 130], [/International Court of Justice/i, 120], [/International Criminal Court/i, 900],
  [/Diplomatic Service of the Holy See|Secretariat of State/i, 400], [/Roman Curia|Congregation|Dicaster|Pontifical Council/i, 300],
  [/International Monetary Fund/i, 3100], [/World Bank/i, 16000], [/Bank for International Settlements/i, 600], [/OECD/i, 3300], [/World Trade Organization|\bWTO\b/i, 620], [/Interpol/i, 1000],
  [/World Health Organization/i, 8000], [/UNESCO/i, 2300], [/Food and Agriculture/i, 11000], [/UNICEF/i, 17000], [/UNHCR|High Commissioner for Refugees/i, 18000], [/World Food Programme/i, 20000],
  [/International Labour/i, 3300], [/\bUNDP\b|Development Programme/i, 17000], [/Economic Commission/i, 600], [/United Nations Office at/i, 1500], [/UN Headquarters|Secretariat \(New York\)/i, 6000],
  [/Supreme Headquarters Allied Powers|SHAPE/i, 3000], [/NATO Support and Procurement/i, 1300], [/NATO Headquarters|International Staff/i, 1500], [/NATO Communications/i, 3500],
  [/Commission of the European|European Commission/i, 32000], [/European Parliament/i, 8000], [/Court of Justice of the European/i, 2200], [/Council of the European|Council of the EU/i, 3000], [/European Central Bank/i, 3500],
  [/Council of Europe/i, 2200], [/Commonwealth Secretariat/i, 300], [/African Union Commission|African Union/i, 1700], [/ASEAN Secretariat/i, 400], [/Organization of American States/i, 600],
  [/Red Cross|ICRC/i, 22000], [/Missionaries of Charity/i, 5000], [/Society of Jesus/i, 15000], [/Order of Malta/i, 4000],
];
/** How the big ones grew (or shrank): [year, staff], read between the points. */
const STAFF_SERIES = [
  [/Commission of the European|European Commission/i, [[1958, 1000], [1970, 5000], [1980, 11000], [1995, 16000], [2005, 25000], [2015, 32000]]],
  [/European Parliament/i, [[1958, 100], [1979, 1500], [1995, 3500], [2010, 6000], [2020, 8000]]],
  [/Red Cross|ICRC/i, [[1950, 300], [1970, 700], [1990, 5000], [2005, 12000], [2020, 22000]]],
  [/World Bank/i, [[1946, 100], [1960, 700], [1975, 5000], [1995, 10000], [2020, 16000]]],
  [/International Monetary Fund/i, [[1946, 200], [1960, 600], [1980, 1700], [2000, 2700], [2020, 3100]]],
  [/World Health Organization/i, [[1948, 300], [1960, 2000], [1980, 5000], [2020, 8000]]],
  [/UNHCR|High Commissioner for Refugees/i, [[1951, 100], [1970, 500], [1990, 2500], [2005, 6000], [2020, 18000]]],
  [/UNICEF/i, [[1946, 100], [1965, 1000], [1990, 6000], [2020, 17000]]],
  [/World Food Programme/i, [[1961, 100], [1980, 2000], [2000, 8000], [2020, 20000]]],
  [/Society of Jesus/i, [[1850, 5000], [1900, 15000], [1965, 36000], [1990, 24000], [2020, 15000]]],
  [/Missionaries of Charity/i, [[1950, 12], [1970, 600], [1990, 3000], [2020, 5000]]],
];
const between = (pts, y) => {
  if (y <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (y <= pts[i][0]) { const [y0, a] = pts[i - 1]; const [y1, b] = pts[i]; return Math.round(a + ((b - a) * (y - y0)) / (y1 - y0)); }
  return pts.at(-1)[1];
};
/** The staff a known body had in the year (today's figure when there's no series). */
export const knownStaff = (name, year = eraYear()) => {
  const series = STAFF_SERIES.find(([re]) => re.test(name ?? ''))?.[1];
  if (series && year) return between(series, Math.min(year, 2025));
  return KNOWN_STAFF.find(([re]) => re.test(name ?? ''))?.[1] ?? null;
};

export function capToPlace(org, cc) {
  if (org?.international && org.departments) {
    const real = knownStaff(org.name);
    const depts = Object.values(org.departments);
    const total = depts.reduce((n, d) => n + (d.headcount ?? 0), 0);
    // A body not on the list: an international secretariat of its kind, not a ministry of tens of thousands.
    const target = real ?? Math.min(total, 2000);
    if (total > 0 && target !== total) for (const d of depts) d.headcount = Math.max(1, Math.round(((d.headcount ?? 0) / total) * target));
    return org;
  }
  if (!org || !cc || !org.departments) return org;
  const people = peopleIn(cc);
  // A national body abroad is America's, scaled to the people it serves (smaller states run
  // relatively bigger governments: three times the per-head staffing at most).
  if (org.typeId?.startsWith('body:') && cc !== 'US' && !RATIOS[org.typeId] && serviceStaffing(org) == null) {
    const f = Math.min(1, (3 * people) / 335e6);
    for (const d of Object.values(org.departments)) d.headcount = Math.max(1, Math.round((d.headcount ?? 0) * f));
  }
  const cap = Math.max(1, Math.round(people * (org.business || org.sector === 'private' ? 0.01 : 0.02)));
  const depts = Object.values(org.departments);
  const total = depts.reduce((n, d) => n + (d.headcount ?? 0), 0);
  if (total <= cap) return org;
  for (const d of depts) d.headcount = Math.max(1, Math.round(((d.headcount ?? 0) / total) * cap));
  org.placeCapped = true;
  return org;
}
/** The largest employer size a country of this many people can hold. */
export function sizeForPlace(cc, size) {
  const ORDER = ['micro', 'small', 'medium', 'large', 'enterprise', 'mega'];
  const people = peopleIn(cc);
  const max = people < 5000 ? 'micro' : people < 100000 ? 'small' : people < 1e6 ? 'medium' : people < 1e7 ? 'large' : 'mega';
  return ORDER.indexOf(size) > ORDER.indexOf(max) ? max : size;
}

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
  anglicanDiocese: { base: 'county', parishes: 0.12 },
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
    // Never more than the country's real people (Pitcairn's one province is not 50,000 strong).
    COUNTRY_POPULATION[cc] = Math.min(COUNTRY_POPULATION[cc], peopleIn(cc));
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
  return Math.max(1, Math.round((servicePopulation(org) / 1000) * per * transit * scaleOf(org, null)));
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
