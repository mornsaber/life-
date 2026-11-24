/**
 * Women in the services, as it was. Before the women's corps, a woman served (outside the nursing
 * services) not at all; in the corps she held their titles — a Wren, not a seaman; a Junior Commander
 * of the ATS, not a captain — and served in their name; after integration she held the service's own
 * ranks. Britain's corps came and went (the WAAC of 1917–21, nothing between the wars, the ATS from
 * 1938), America's came in 1942 and folded into the services in the 1970s.
 *
 * Windows: [from, until, corps name, enlisted titles | null, officer titles | null]. Titles line up
 * with the branch's ladder by grade (the last one repeats for any grade above it). null: the
 * service's own ranks, under the corps' name.
 */
import { eraYear } from '../world/Eras.js';

const QMAAC_E = ['Worker', 'Worker', 'Assistant Forewoman', 'Forewoman', 'Forewoman', 'Forewoman'];
const QMAAC_O = ['Assistant Administrator', 'Assistant Administrator', 'Deputy Administrator', 'Administrator', 'Unit Administrator', 'Area Controller', 'Chief Controller'];
const ATS_E = ['Private', 'Lance Corporal', 'Corporal', 'Sergeant', 'Staff Sergeant', 'Company Quartermaster Sergeant', 'Warrant Officer Class 2', 'Warrant Officer Class 1'];
const ATS_O = ['Second Subaltern', 'Subaltern', 'Junior Commander', 'Senior Commander', 'Chief Commander', 'Controller', 'Chief Controller', 'Senior Controller'];
const WRNS_E = ['Wren', 'Wren', 'Leading Wren', 'Petty Officer Wren', 'Chief Wren', 'Chief Wren', 'Fleet Chief Wren'];
const WRNS_O = ['Third Officer', 'Third Officer', 'Second Officer', 'First Officer', 'Chief Officer', 'Superintendent', 'Commandant'];
const WAAF_E = ['Aircraftwoman 2nd Class', 'Aircraftwoman 1st Class', 'Leading Aircraftwoman', 'Corporal', 'Sergeant', 'Flight Sergeant', 'Warrant Officer'];
const WAAF_O = ['Assistant Section Officer', 'Section Officer', 'Flight Officer', 'Squadron Officer', 'Wing Officer', 'Group Officer', 'Air Commandant', 'Air Chief Commandant'];
const WRAF_E = ['Aircraftwoman', 'Leading Aircraftwoman', 'Senior Aircraftwoman', 'Corporal', 'Sergeant', 'Flight Sergeant', 'Warrant Officer'];
const WAAC_E = ['Auxiliary', 'Auxiliary', 'Junior Leader', 'Leader', 'Staff Leader', 'Technical Leader', 'First Leader', 'Chief Leader'];
const WAAC_O = ['Third Officer', 'Second Officer', 'First Officer', 'Field Director', 'Assistant Director', 'Director'];

export const WOMENS_SERVICES = {
  GB: {
    army: [[1917, 1921, "Queen Mary's Army Auxiliary Corps", QMAAC_E, QMAAC_O], [1938, 1949, 'Auxiliary Territorial Service', ATS_E, ATS_O], [1949, 1992, "Women's Royal Army Corps", null, null]],
    navy: [[1917, 1919, "Women's Royal Naval Service", WRNS_E, WRNS_O], [1939, 1990, "Women's Royal Naval Service", WRNS_E, WRNS_O], [1990, 1993, "Women's Royal Naval Service", WRNS_E, null]],
    airforce: [[1918, 1920, "Women's Royal Air Force", WAAF_E, WAAF_O], [1939, 1949, "Women's Auxiliary Air Force", WAAF_E, WAAF_O], [1949, 1994, "Women's Royal Air Force", WRAF_E, null]],
  },
  US: {
    army: [[1942, 1943, "Women's Army Auxiliary Corps", WAAC_E, WAAC_O], [1943, 1978, "Women's Army Corps", null, null]],
    navy: [[1942, 1948, 'WAVES (Women Accepted for Volunteer Emergency Service)', null, null]],
    marines: [[1943, 1948, "Marine Corps Women's Reserve", null, null], [1948, 1977, 'Women Marines', null, null]],
    airforce: [[1948, 1976, 'Women in the Air Force (WAF)', null, null]],
    coastguard: [[1942, 1946, 'SPARS (Coast Guard Women\'s Reserve)', null, null]],
  },
  CA: {
    army: [[1941, 1946, "Canadian Women's Army Corps", ATS_E, ATS_O]],
    navy: [[1942, 1946, "Women's Royal Canadian Naval Service", WRNS_E, WRNS_O]],
    airforce: [[1941, 1946, "RCAF Women's Division", WAAF_E, WAAF_O]],
  },
  AU: {
    army: [[1941, 1947, "Australian Women's Army Service", ATS_E, ATS_O], [1951, 1984, "Women's Royal Australian Army Corps", null, null]],
    navy: [[1942, 1985, "Women's Royal Australian Naval Service", WRNS_E, WRNS_O]],
    airforce: [[1941, 1947, "Women's Auxiliary Australian Air Force", WAAF_E, WAAF_O], [1951, 1977, "Women's Royal Australian Air Force", null, null]],
  },
  NZ: {
    army: [[1941, 1946, "New Zealand Women's Army Auxiliary Corps", ATS_E, ATS_O]],
    navy: [[1942, 1946, "Women's Royal New Zealand Naval Service", WRNS_E, WRNS_O]],
    airforce: [[1941, 1947, "Women's Auxiliary Air Force (NZ)", WAAF_E, WAAF_O]],
  },
};
/** Elsewhere: women first enlisted (outside nursing) about this year. */
const WOMEN_FROM = { RU: 1941, IL: 1948, FR: 1940, DE: 1975, IT: 2000, JP: 1967, IN: 1992, CN: 1949, KR: 1950, ES: 1988 };

const windowsOf = (cc, branch) => WOMENS_SERVICES[cc ?? 'US']?.[branch] ?? null;
/** The women's corps of this branch in the year, or null (none, or long since integrated). */
export function womensService(cc, branch, year = eraYear()) {
  const w = windowsOf(cc, branch)?.find(([from, until]) => year >= from && year < until);
  return w ? { name: w[2], enlisted: w[3], officer: w[4] } : null;
}
/** Could a woman join this branch in this year? Then: in a corps, or after integration. */
export function womenMayServe(cc, branch, year = eraYear()) {
  const w = windowsOf(cc, branch);
  if (w) return w.some(([from, until]) => year >= from && year < until) || year >= Math.max(...w.map((x) => x[1]));
  if (WOMENS_SERVICES[cc ?? 'US']) return year >= 1975; // a branch with no corps: open late
  return year >= (WOMEN_FROM[cc] ?? 1945);
}
/** A woman's title in the corps' own words, or null to use the service's rank. */
export function womensTitle(cc, branch, track, grade, year = eraYear()) {
  const s = womensService(cc, branch, year);
  const list = s?.[track === 'enlisted' ? 'enlisted' : track === 'officer' ? 'officer' : null];
  return list ? list[Math.min(grade, list.length - 1)] : null;
}
