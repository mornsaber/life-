/**
 * Military service as it was in the year being played: the decorations that existed then (a
 * Certificate of Merit before the Medal of Honor, the Citation Star before the Silver Star, the
 * Iron Cross, the British awards Canadians and Australians wore before their own), the special
 * duties and senior posts that had been created, where peacetime forces deployed (the frontier,
 * the Yangtze Patrol, the Fulda Gap, Bosnia, Afghanistan), the overseas garrisons, and the
 * names of the bases at home (Fort Hood before Fort Cavazos, the navy yards before the naval
 * stations).
 *
 * Each rule returns undefined (as today), null (didn't exist), or a replacement.
 */
import { PRESENT, eraYear } from '../world/Eras.js';

const R = (...c) => c.map((x) => (Array.isArray(x) ? x : [x, 1]));
const PAPER = { icon: '📜', ribbon: null };
const mention = (name = 'Mentioned in general orders') => ({ name, ...PAPER });
const cap = (n, s) => ({ name: n, ribbon: s });

/* ------------------------------------------------------------------ */
/* Decorations                                                         */
/* ------------------------------------------------------------------ */

/** United States: each award as it stood in a year (branch-aware). */
const US = {
  moh: (y, b) => (y >= (b === 'navy' || b === 'marines' ? 1861 : 1862) ? undefined : b === 'army' && y >= 1847 ? cap('Certificate of Merit', R('#fff', '#c8102e', '#fff', '#002868', '#fff')) : mention('Brevet promotion for gallantry')),
  serviceCross: (y, b) => {
    if (b === 'airforce' && y < 1960) return y >= 1918 ? cap('Distinguished Service Cross', R('#c8102e', '#fff', '#002868', '#fff', '#c8102e')) : null;
    if (b === 'coastguard' && y < 2010) return y >= 1919 ? cap('Navy Cross', R('#002868', '#fff', '#002868')) : mention();
    if (y >= (b === 'army' ? 1918 : 1919)) return undefined;
    return b === 'army' && y >= 1847 ? cap('Certificate of Merit', R('#fff', '#c8102e', '#fff', '#002868', '#fff')) : mention();
  },
  dsm: (y) => (y >= 1918 ? undefined : mention('Thanks of Congress')),
  silverStar: (y) => (y >= 1932 ? undefined : y >= 1918 ? { name: 'Citation Star', icon: '⭐', ribbon: R('#ffd100', '#fff', '#c8102e', '#fff', '#ffd100') } : mention()),
  legionOfMerit: (y) => (y >= 1942 ? undefined : null),
  bronzeStar: (y) => (y >= 1944 ? undefined : y >= 1918 ? mention('Mentioned in division orders') : null),
  purpleHeart: (y) => (y >= 1932 ? undefined : y >= 1917 ? { name: 'Wound Chevron', icon: '🪖', ribbon: null } : null),
  msm: (y) => (y >= 1969 ? undefined : null),
  commendation: (y) => (y >= 1960 ? undefined : y >= 1944 ? { name: 'Commendation Ribbon' } : mention('Letter of commendation')),
  achievement: (y, b) => (y >= (b === 'army' ? 1981 : b === 'airforce' ? 1980 : 1961) ? undefined : null),
  combatAction: (y, b) => {
    if (b === 'army' || b === 'guard') return y >= 2005 ? undefined : y >= 1943 ? { name: 'Combat Infantryman Badge', icon: '🎖️', ribbon: R('#1f5fbf') } : null;
    if (b === 'airforce') return y >= 2007 ? undefined : null;
    return y >= 1969 ? undefined : null;
  },
  goodConduct: (y, b) => {
    const from = { navy: 1869, marines: 1896, coastguard: 1923, army: 1941, guard: 1941, airforce: 1941 }[b] ?? 1941;
    if (y < from) return null;
    return b === 'airforce' && y < 1963 ? { name: 'Army Good Conduct Medal' } : undefined;
  },
  humanitarian: (y) => (y >= 1977 ? undefined : null),
  expeditionary: (y, b) => {
    if (y >= 2003) return undefined;
    if (y >= 1961) return { name: 'Armed Forces Expeditionary Medal', ribbon: R('#002868', '#ffd100', '#c8102e', '#000', '#fff', '#000', '#c8102e', '#ffd100', '#002868') };
    if ((b === 'navy' || b === 'marines') && y >= 1919) return { name: b === 'navy' ? 'Navy Expeditionary Medal' : 'Marine Corps Expeditionary Medal', ribbon: R('#ffd100', '#002868', '#ffd100') };
    return null;
  },
  ndsm: (y) => {
    if ((y >= 1950 && y < 1955) || (y >= 1961 && y < 1975) || (y >= 1990 && y < 1996) || (y >= 2001 && y < 2023)) return undefined;
    if (y >= 1939 && y < 1942) return { name: 'American Defense Service Medal', ribbon: R('#ffd100', '#fff', '#002868', '#fff', '#c8102e', '#fff', '#002868', '#fff', '#ffd100') };
    if (y >= 1942 && y < 1947) return { name: 'American Campaign Medal', ribbon: R('#002868', '#fff', '#c8102e', '#fff', '#000', '#fff', '#c8102e', '#fff', '#002868') };
    return null;
  },
};

/** Britain: the VC from 1856, the DSO from 1886, the MC from 1914, the OBE from 1917; before, despatches and the Bath. */
const GB = {
  moh: (y) => (y >= 1856 ? undefined : { ...mention('Mentioned in Despatches'), post: null }),
  serviceCross: (y, b) => (y >= 1993 ? undefined : y >= (b === 'navy' ? 1874 : 1854) ? { name: b === 'navy' ? 'Conspicuous Gallantry Medal' : 'Distinguished Conduct Medal', post: b === 'navy' ? 'CGM' : 'DCM', ribbon: b === 'navy' ? R('#fff', '#002868', '#fff') : R('#8b0a1d', '#002868', '#8b0a1d') } : mention('Mentioned in Despatches')),
  dsm: (y) => (y >= 1886 ? undefined : y >= 1815 ? { name: 'Companion of the Order of the Bath (Military)', post: 'CB', order: 'Order of the Bath', grade: 0, ribbon: R('#c8102e') } : null),
  silverStar: (y, b) => (y >= (b === 'airforce' ? 1918 : 1914) ? undefined : b === 'navy' && y >= 1901 ? { name: 'Conspicuous Service Cross', post: 'CSC' } : mention('Mentioned in Despatches')),
  legionOfMerit: (y) => (y >= 1917 ? undefined : y >= 1815 ? { name: 'Companion of the Order of the Bath (Military)', post: 'CB', order: 'Order of the Bath', grade: 0, ribbon: R('#c8102e') } : null),
  msm: (y) => (y >= 1845 ? undefined : null),
  commendation: (y) => (y >= 1939 ? undefined : null),
  achievement: (y) => (y >= 1939 ? undefined : null),
  goodConduct: (y, b) => (y >= (b === 'navy' ? 1831 : 1830) ? undefined : null),
  humanitarian: (y) => (y >= 1990 ? undefined : null),
  expeditionary: (y, b) => (y >= 1999 ? undefined : y >= (b === 'navy' ? 1915 : 1918) ? { name: b === 'navy' ? 'Naval General Service Medal' : 'General Service Medal', ribbon: R('#8b0a1d', '#1f6f43', '#8b0a1d') } : null),
};

/** Germany: Prussia's Pour le Mérite and the Iron Cross in its wars; the Bundeswehr's crosses from 1980. */
const IRON = R('#000', '#fff', '#000');
const DE = {
  moh: (y) => (y >= 1980 ? undefined : y >= 1956 ? null : y >= 1939 && y < 1946 ? { name: 'Knight\'s Cross of the Iron Cross', ribbon: R('#000', '#fff', '#dd0000', '#fff', '#000') } : y < 1918 ? { name: 'Pour le Mérite', ribbon: R('#000', '#fff', '#000') } : null),
  serviceCross: (y) => (y >= 1980 ? undefined : y >= 1946 ? null : { name: 'Iron Cross, 1st Class', ribbon: IRON }),
  silverStar: (y) => (y >= 1980 ? undefined : y >= 1946 ? null : { name: 'Iron Cross, 2nd Class', ribbon: IRON }),
  bronzeStar: (y) => (y >= 1980 ? undefined : y >= 1939 && y < 1946 ? { name: 'War Merit Cross with Swords', ribbon: R('#dd0000', '#fff', '#000', '#fff', '#dd0000') } : y < 1946 ? mention('Mentioned in the army report') : null),
  purpleHeart: (y) => (y >= 1980 ? undefined : y >= 1918 && y < 1946 ? { name: 'Wound Badge', icon: '🪖', ribbon: null } : null),
  legionOfMerit: (y) => (y >= 1980 ? undefined : y < 1918 ? { name: 'Order of the Red Eagle (Military)', ribbon: R('#fff', '#ff9900', '#fff') } : null),
  msm: (y) => (y >= 1980 ? undefined : null),
  combatAction: (y) => (y >= 2010 ? undefined : null),
  expeditionary: (y) => (y >= 1995 ? undefined : null),
  humanitarian: (y) => (y >= 2002 ? undefined : null),
  commendation: (y) => (y >= 1956 ? undefined : null),
  achievement: (y) => (y >= 1956 ? undefined : null),
  goodConduct: (y) => (y >= 1956 ? undefined : y < 1918 ? { name: 'Long Service Decoration (Dienstauszeichnung)' } : null),
};

/** France: the Légion d'honneur (1802) and Médaille militaire (1852) stand; the Croix de guerre and later medals came with their wars. */
const FR = {
  serviceCross: (y) => (y >= 1852 ? undefined : mention('Cited in the order of the army')),
  silverStar: (y) => (y >= 1915 ? undefined : mention('Cited in the order of the army')),
  bronzeStar: (y) => (y >= 1915 ? undefined : null),
  combatAction: (y) => (y >= 1930 ? undefined : null),
  dsm: (y) => (y >= 1963 ? undefined : null),
  legionOfMerit: (y) => (y >= 1963 ? undefined : null),
  msm: (y) => (y >= 1982 ? undefined : null),
  goodConduct: (y) => (y >= 1982 ? undefined : null),
  expeditionary: (y) => (y >= 1995 ? undefined : null),
  humanitarian: (y) => (y >= 1990 ? undefined : null),
};

/** Japan's Self-Defense Forces from 1954; the Imperial forces' Order of the Golden Kite (1890–1947) before. */
const JP = (y, id) => {
  if (y >= 1954) return undefined;
  if (y >= 1945) return null;
  if (id === 'moh' || id === 'serviceCross') return y >= 1890 ? { name: 'Order of the Golden Kite', ribbon: R('#1f6f43', '#fff', '#1f6f43') } : null;
  if (id === 'silverStar' || id === 'bronzeStar' || id === 'dsm') return y >= 1875 ? { name: 'Order of the Rising Sun (Military)', ribbon: R('#fff', '#c8102e', '#fff') } : null;
  return null;
};

/** Forces that wore Britain's awards before their own: Canada (to 1993), Australia (to 1991), New Zealand, India (to 1950). */
const BORROW = { CA: 1993, AU: 1991, NZ: 1999, IN: 1950, PK: 1957, ZA: 1952, IE: 1922, JM: 1969 };
/** Forces whose own awards start late: before, there is nothing of theirs to give. */
const OWN_FROM = { KR: 1950, PH: 1935, MX: 1926, IT: 1793 };

/**
 * The award `medalId` as it stood for `nation`'s forces in year `y`: undefined (as today), null
 * (nothing of the kind yet), or { name, ribbon?, post?, order?, grade?, icon? }. `borrowed` names
 * the country whose modern medal table applies (the GB table for Canada before 1993).
 */
export function historicMedal(nation, medalId, branch, y = eraYear()) {
  if (y >= PRESENT) return undefined;
  const n = nation ?? 'US';
  if (BORROW[n] && y < BORROW[n]) {
    const r = GB[medalId]?.(y, branch);
    return r === undefined ? { borrowed: 'GB' } : r;
  }
  if (n === 'JP') return JP(y, medalId);
  if (OWN_FROM[n] && y < OWN_FROM[n]) return ['moh', 'serviceCross', 'silverStar'].includes(medalId) ? mention('Mentioned in despatches') : null;
  const table = { US, GB, DE, FR }[n];
  return table?.[medalId]?.(y, branch);
}

/** "King's" or "Queen's", by who was on the British throne. */
export const sovereignWord = (y = eraYear()) => ((y >= 1837 && y < 1901) || (y >= 1952 && y < 2022) ? 'Queen\'s' : 'King\'s');

/* ------------------------------------------------------------------ */
/* Special duties and senior posts                                     */
/* ------------------------------------------------------------------ */

/** When each special duty began, by branch where it differs. */
const DUTY_FROM = {
  msg: 1949, fellow: 1961,
  honorGuard: { army: 1948, navy: 1931, airforce: 1948, marines: 1934, coastguard: 1962, _: 1948 },
  rotc: { army: 1916, navy: 1926, airforce: 1946, marines: 1926, coastguard: 1915, _: 1916 },
  academy: { army: 1802, navy: 1845, marines: 1845, airforce: 1955, coastguard: 1876, _: 1802 },
  joint: 1903,
};
/** Older names of the duties: [until, name] by branch. */
const DUTY_OLD = {
  drill: { army: [[1964, 'Drill Instructor (recruit depot cadre)']], marines: [[1915, 'Drill Instructor, Recruit Depot Port Royal']] },
  recruiter: { army: [[1950, 'Recruiting Sergeant']], marines: [[1950, 'Recruiting Sergeant']], navy: [[1950, 'Recruiting Petty Officer']] },
  joint: { army: [[1947, 'War Department General Staff officer']], navy: [[1947, 'Officer in the Office of the Chief of Naval Operations']], marines: [[1947, 'Headquarters Marine Corps staff officer']], airforce: [[1947, null]], coastguard: [[1947, null]] },
  academy: { airforce: [[1955, null]] },
};
const DUTY_PLACE_OLD = {
  drill: { army: [[1917, 'Columbus Barracks, Ohio'], [1950, 'Fort Dix']], navy: [[1911, 'Naval Training Station Newport']], airforce: [[1942, null]], marines: [[1915, 'Port Royal, South Carolina']] },
};
const pickOld = (table, b, y) => {
  const rows = table?.[b];
  if (!rows) return undefined;
  const hit = rows.find(([until]) => y < until);
  return hit ? hit[1] : undefined;
};

/** A duty in year `y` for a branch: null (not yet), or { name?, place? } overrides. */
export function historicDuty(id, branch, y = eraYear()) {
  if (y >= PRESENT) return {};
  const from = DUTY_FROM[id];
  const start = typeof from === 'object' ? from[branch] ?? from._ : from;
  if (start && y < start) return null;
  const name = pickOld(DUTY_OLD[id], branch, y);
  if (name === null) return null;
  const place = pickOld(DUTY_PLACE_OLD[id], branch, y);
  return { ...(name ? { name } : {}), ...(place !== undefined ? { place } : {}) };
}

/** The service's senior posts as they stood: null where the post hadn't been created. */
export function historicTopTitle(kind, branch, title, y = eraYear()) {
  if (y >= PRESENT || !title) return title;
  if (kind === 'enlisted') {
    const from = { army: 1966, navy: 1967, airforce: 1967, marines: 1957, coastguard: 1969, spaceforce: 2020, guard: 1998 }[branch];
    return from && y < from ? null : title;
  }
  if (kind === 'chief') {
    if (branch === 'army') return y < 1903 ? 'Commanding General of the United States Army' : title;
    if (branch === 'navy') return y < 1915 ? 'Senior Admiral of the Navy (Aide for Operations)' : title;
    if (branch === 'airforce') return y < 1947 ? (y >= 1941 ? 'Commanding General, Army Air Forces' : null) : title;
    if (branch === 'coastguard') return y < 1915 ? 'Captain-Commandant of the Revenue Cutter Service' : title;
    if (branch === 'spaceforce') return y < 2019 ? null : title;
    if (branch === 'guard') return y < 1908 ? null : title;
    return title;
  }
  if (kind === 'chairman') return y < 1942 ? null : y < 1949 ? 'Chief of Staff to the Commander in Chief' : title;
  return title;
}
/** Commissioning from the ranks: officer candidate schools from 1941; the named programmes later. */
export function historicCommissioning(program, y = eraYear()) {
  if (y >= PRESENT) return program;
  if (y < 1941) return null;
  if (y < 1973) return 'Officer Candidate School (from the ranks)';
  return program;
}

/* ------------------------------------------------------------------ */
/* Deployments and garrisons                                           */
/* ------------------------------------------------------------------ */

/** Where America's peacetime forces went, by era and by kind of service. */
const US_THEATERS = [
  [1898, { ground: ['the Western frontier', 'Indian Territory', 'the Rio Grande border', 'the Dakota Territory forts'], naval: ['the Africa Squadron (the slave-trade patrol)', 'the Mediterranean Squadron', 'the East India Squadron', 'the Brazil Station', 'the Pacific Squadron'], air: ['the Western frontier', 'the Rio Grande border'], maritime: ['the Florida Straits', 'the Alaska revenue patrol', 'the New England fisheries', 'the Gulf coast'] }],
  [1941, { ground: ['the Philippines', 'the Mexican border', 'the Panama Canal Zone', 'Tientsin, China', 'Haiti', 'Nicaragua'], naval: ['the Yangtze Patrol', 'the Asiatic Fleet', 'the Caribbean', 'the Special Service Squadron, Central America'], air: ['the Panama Canal Zone', 'Hawaii', 'the Philippines'], maritime: ['the International Ice Patrol', 'the Bering Sea Patrol', 'Rum Row (Prohibition)', 'the Caribbean'] }],
  [1991, { ground: ['West Germany (the Fulda Gap)', 'the Korean DMZ', 'Lebanon', 'the Dominican Republic', 'the Panama Canal Zone', 'the Sinai (Multinational Force)'], naval: ['the Sixth Fleet in the Mediterranean', 'the Seventh Fleet in the Taiwan Strait', 'the GIUK gap (submarine hunting)', 'the Persian Gulf tanker escorts'], air: ['Wheelus Air Base, Libya', 'Clark Air Base, the Philippines', 'Thule Air Base, Greenland', 'RAF Upper Heyford'], maritime: ['the Caribbean', 'the Bering Sea', 'Ocean Station Bravo', 'the Florida Straits'] }],
  [2001, { ground: ['Bosnia', 'Kosovo', 'Somalia', 'Haiti', 'Kuwait', 'the Korean DMZ'], naval: ['the Persian Gulf', 'the Adriatic', 'the Taiwan Strait', 'the Arabian Sea'], air: ['Prince Sultan Air Base, Saudi Arabia', 'Aviano Air Base, Italy', 'Incirlik Air Base, Türkiye'], maritime: ['the Caribbean', 'the Bering Sea', 'the Persian Gulf', 'the Florida Straits'] }],
  [2021, { ground: ['Afghanistan', 'Iraq', 'the Horn of Africa', 'Kuwait', 'the southern Philippines'], naval: ['the Persian Gulf', 'the Arabian Sea', 'the Gulf of Aden (counter-piracy)', 'the South China Sea'], air: ['Al Udeid Air Base, Qatar', 'Bagram Air Base, Afghanistan', 'Camp Lemonnier, Djibouti', 'Kandahar Airfield'], maritime: ['the Persian Gulf', 'the Caribbean', 'the Bering Sea', 'the Eastern Pacific'] }],
];
/** Other countries' peacetime missions, by era: the Empire's garrisons, the Rhine Army, then UN missions. */
const NATIONAL_THEATERS_BY_ERA = {
  GB: [[1947, ['India', 'Egypt', 'Malta', 'Gibraltar', 'Hong Kong', 'the North-West Frontier', 'Ireland', 'the Cape']], [1990, ['the British Army of the Rhine', 'Northern Ireland', 'Cyprus', 'Aden', 'Malaya', 'Hong Kong', 'Belize']], [2014, ['Bosnia', 'Kosovo', 'Sierra Leone', 'Iraq', 'Afghanistan']]],
  FR: [[1962, ['Algeria', 'Indochina', 'Morocco', 'Senegal', 'Madagascar']], [1990, ['Chad', 'Djibouti', 'the Central African Republic', 'West Berlin', 'Lebanon (UNIFIL)']]],
  DE: [[1918, ['Kiautschou (Tsingtao)', 'German South-West Africa', 'German East Africa']], [1946, ['the Rhineland garrisons']], [1990, ['NATO exercises in Bavaria']]],
};
const GENERIC_EARLY = ['a frontier garrison', 'a coastal fortress', 'a naval station abroad'];
const UN_FROM = { UNIFIL: 1978, UNMISS: 2011, UNDOF: 1974 };

/** Peacetime deployments for a US branch theatre in `y`, or undefined for today's. */
export function historicTheaters(theater, y = eraYear()) {
  if (y >= PRESENT) return undefined;
  const row = US_THEATERS.find(([until]) => y < until);
  return row ? row[1][theater] ?? row[1].ground : undefined;
}
/** Another country's peacetime missions in `y` (falls back to today's list filtered by date). */
export function historicNationalTheaters(nation, list, y = eraYear()) {
  if (y >= PRESENT) return list;
  const row = NATIONAL_THEATERS_BY_ERA[nation]?.find(([until]) => y < until);
  if (row) return row[1];
  const dated = list.filter((t) => !Object.entries(UN_FROM).some(([k, from]) => t.includes(k) && y < from));
  return y < 1945 ? GENERIC_EARLY : dated.length ? dated : GENERIC_EARLY;
}

/** America's overseas garrisons before the Second World War (and none before 1898). */
const US_OVERSEAS_EARLY = {
  army: [['the Philippines', 'Fort William McKinley, Manila', 2, true], ['Hawaii', 'Schofield Barracks', 2, true], ['the Panama Canal Zone', 'Fort Clayton', 2, true], ['China', 'the 15th Infantry, Tientsin', 2, false]],
  navy: [['the Philippines', 'Cavite Navy Yard', 2, true], ['China', 'the Yangtze Patrol, Shanghai', 2, false], ['Guam', 'Naval Station Guam', 2, true]],
  marines: [['China', 'the 4th Marines, Shanghai', 2, false], ['Nicaragua', 'the Guardia Nacional mission', 2, false], ['Haiti', 'the Gendarmerie d\'Haïti, Port-au-Prince', 2, false]],
};
/** When today's overseas bases opened (and what they were called before). */
const BASE_FROM = {
  'Caserma Del Din, Vicenza': [2013, [[2013, 'Caserma Ederle, Vicenza']], 1955], 'Camp Humphreys': [1951], 'U.S. Army Garrison Bavaria (Grafenwöhr)': [1945], 'U.S. Army Garrison Stuttgart': [1945], 'Camp Zama': [1945],
  'Camp Butler, Okinawa': [1958], 'MCAS Iwakuni': [1962], 'Camp Mujuk': [1997], 'Fleet Activities Yokosuka': [1945], 'NSA Bahrain': [1971, [[1971, null]], 1949], 'NSA Naples': [1951], 'Naval Station Rota': [1955], 'Naval Base Guam': [1899],
  'Ramstein Air Base': [1953], 'Kadena Air Base, Okinawa': [1945], 'Osan Air Base': [1951], 'RAF Lakenheath': [1948], 'Aviano Air Base': [1954], 'RAF Fylingdales': [2019], 'Pituffik Space Base': [2023, [[2023, 'Thule Air Base']], 1951], 'Yokota Air Base': [2019],
  'Activities Far East, Tokyo': [1947], 'Patrol Forces Southwest Asia': [2002],
};
/** America's overseas postings in `y`: [country, base, years, accompanied]. */
export function historicOverseas(branch, list, y = eraYear()) {
  if (y >= PRESENT) return list;
  if (y < 1898) return [];
  if (y < 1941) return US_OVERSEAS_EARLY[branch] ?? [];
  return list.map(([c, base, yrs, acc]) => {
    const f = BASE_FROM[base];
    if (!f) return [c, base, yrs, acc];
    const [from, old, first] = f;
    if (y >= from) return [c, base, yrs, acc];
    const was = old?.find(([until]) => y < until)?.[1];
    return was && y >= (first ?? 0) ? [c, was, yrs, acc] : null;
  }).filter(Boolean);
}

/**
 * Bases at home under their names of the day (Fort Hood until 2023, Fort Lewis until 2010), and
 * not before they opened: [opened, [[until, old name]...]].
 */
const HOME_BASES = {
  'Fort Cavazos': [1942, [[2023, 'Fort Hood']]], 'Fort Carson': [1942], 'Joint Base Lewis-McChord': [1917, [[2010, 'Fort Lewis']]], 'Fort Myer': [1863, [[1881, 'Fort Whipple']]], 'Fort Bragg': [1918, [[1922, 'Camp Bragg']]],
  'Schofield Barracks': [1908], 'Fort Wainwright': [1939, [[1961, 'Ladd Field']]], 'Fort Moore': [1918, [[2023, 'Fort Benning']]], 'Fort Campbell': [1942], 'Fort Drum': [1908, [[1951, 'Pine Camp']]], 'Fort Johnson': [1941, [[2023, 'Fort Polk']]],
  'Fort Sam Houston': [1876, [[1890, 'Post of San Antonio']]], 'JB Elmendorf-Richardson (Army)': [1940, [[2010, 'Fort Richardson']]],
  'Camp Pendleton': [1942], 'MCAS Miramar': [1947, [[1997, 'NAS Miramar']]], 'Marine Barracks Washington': [1801], 'Camp Lejeune': [1941], 'MCB Hawaii': [1952, [[1994, 'MCAS Kaneohe Bay']]], 'MCAS Yuma': [1959], 'MCAGCC Twentynine Palms': [1952], 'MCB Quantico': [1917], 'MCAS New River': [1944],
  'NAS Jacksonville': [1940], 'Naval Station Mayport': [1942], 'Naval Base Kitsap': [1891, [[2004, 'Puget Sound Naval Shipyard']]], 'Naval Base San Diego': [1922], 'Naval Support Activity Washington': [1799, [[1998, 'the Washington Navy Yard']]],
  'Naval Station Norfolk': [1801, [[1862, 'Gosport Navy Yard'], [1917, 'Norfolk Navy Yard']]], 'Joint Base Pearl Harbor-Hickam': [1908, [[2010, 'Naval Station Pearl Harbor']]], 'NAS Pensacola': [1826, [[1914, 'Pensacola Navy Yard']]], 'NAS Fallon': [1942], 'NAS Whidbey Island': [1942], 'NAS North Island': [1917],
  'Malmstrom AFB': [1942], 'Buckley SFB': [1942, [[2021, 'Buckley Air Force Base']]], 'JBSA-Lackland': [1942, [[2010, 'Lackland Air Force Base']]], 'Joint Base Andrews': [1942, [[2009, 'Andrews Air Force Base']]], 'Nellis AFB': [1941], 'Luke AFB': [1941], 'Hill AFB': [1940],
  'JB Elmendorf-Richardson': [1940, [[2010, 'Elmendorf Air Force Base']]], 'JB Langley-Eustis': [1916, [[1948, 'Langley Field'], [2010, 'Langley Air Force Base']]], 'Wright-Patterson AFB': [1917, [[1948, 'Wright Field']]], 'Moody AFB': [1941], 'Eglin AFB': [1935], 'MacDill AFB': [1939], 'Eielson AFB': [1944], 'JB Lewis-McChord (McChord Field)': [1938, [[2010, 'McChord Air Force Base']]],
};
/** Bases before the twentieth-century ones: the navy yards, the old forts and the Revenue Cutter stations. */
const OLD_HOME_BASES = {
  army: [['dc', 'the Washington Arsenal', 1794, 1881], ['nyc', 'Governors Island (Fort Columbus)', 1794, 1966], ['philadelphia', 'Frankford Arsenal', 1816, 1977], ['sf', 'the Presidio of San Francisco', 1847, 1994], ['sanantonio', 'the San Antonio quartermaster depot', 1845, 1876], ['denver', 'Fort Logan', 1887, 1946]],
  navy: [['boston', 'Charlestown Navy Yard', 1801, 1974], ['nyc', 'the Brooklyn Navy Yard', 1801, 1966], ['philadelphia', 'the Philadelphia Navy Yard', 1801, 1995], ['sf', 'Mare Island Navy Yard', 1854, 1996]],
  marines: [['philadelphia', 'Marine Barracks Philadelphia', 1801, 1940], ['nyc', 'Marine Barracks Brooklyn', 1801, 1966], ['norfolk', 'Marine Barracks Norfolk', 1801, 1950]],
  coastguard: [['boston', 'the Revenue Cutter station, Boston', 1800, 1915], ['nyc', 'the Revenue Cutter station, New York', 1800, 1915], ['norfolk', 'the Revenue Cutter station, Norfolk', 1800, 1915], ['neworleans', 'the Revenue Cutter station, New Orleans', 1803, 1915], ['sf', 'the Revenue Cutter station, San Francisco', 1849, 1915]],
};
/** America's home bases in `y`: today's under their names of the day, plus the old yards and forts. */
export function historicHomeBases(branch, list, y = eraYear()) {
  if (y >= PRESENT) return list;
  const named = list.map(([region, base]) => {
    const f = HOME_BASES[base];
    if (!f) {
      // Coast Guard sectors (2004) were groups before, and revenue stations before 1915; Space Force bases didn't exist.
      if (branch === 'spaceforce') return y >= 2019 ? [region, base] : null;
      if (branch === 'coastguard' && base.startsWith('Sector ')) return y >= 2004 ? [region, base] : y >= 1915 ? [region, base.replace('Sector', 'Coast Guard Group')] : null;
      return [region, base];
    }
    const [from, old] = f;
    if (y < from) return null;
    return [region, old?.find(([until]) => y < until)?.[1] ?? base];
  }).filter(Boolean);
  const extra = (OLD_HOME_BASES[branch] ?? []).filter(([, , from, until]) => y >= from && y < until).map(([region, base]) => [region, base]);
  return [...named, ...extra];
}
