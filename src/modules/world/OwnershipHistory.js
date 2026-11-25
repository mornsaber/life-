/**
 * Who owned each sector of the economy, by country and year: the share of its employers that
 * were the state's (1 all, 0.5 half, 0 none). Planned economies own everything (see PLANNED);
 * these are the market economies' nationalisations and privatisations.
 *
 *   Britain   the Attlee nationalisations (coal 1947, rail and power 1948, the NHS 1948, gas
 *             1949), BOAC and BEA, the Post Office telephones; Thatcher's sales (BT 1984,
 *             British Airways 1987, British Steel 1988, the power industry 1990) and rail (1994–97).
 *   France    the Liberation (Charbonnages, EDF, Air France, the deposit banks) and Mitterrand's
 *             1982 banks; the sales from 1986.
 *   India     the railways, coal (1973), the banks (1969, 1980), Air India; liberalisation from 1991.
 *   Elsewhere state railways, posts and telegraphs, airlines and power boards, mostly sold in the 1990s.
 *
 * rows: [from, until, share]. No data data: '*' for the utilities, none (private) otherwise.
 */
/** The sectors that can be nationalised: professions working in them, and the statute's words. */
export const SECTORS = {
  coal: { label: 'the coal mines', icon: '⛏️', professions: ['coalMining'], from: 1900 },
  rail: { label: 'the railways', icon: '🚂', professions: ['railroad', 'steamRailway'], from: 1840 },
  power: { label: 'electricity supply', icon: '⚡', professions: ['lineworker'], from: 1900 },
  telecom: { label: 'the telephone service', icon: '☎️', professions: ['switchboard'], from: 1880 },
  airline: { label: 'the national airline', icon: '✈️', professions: ['aviation', 'flightAttendant'], from: 1925 },
  banking: { label: 'the banks', icon: '🏦', professions: ['finance'], from: 1900 },
  health: { label: 'the hospitals', icon: '🏥', professions: ['medical', 'nursing', 'imaging', 'respiratoryTherapy', 'physicianAssistant', 'physicalTherapy', 'occupationalTherapy', 'speechPathology', 'dietitian'], from: 1900 },
  industry: { label: 'manufacturing industry', icon: '🏭', professions: ['manufacturing', 'millWork', 'mechanicalEng', 'chemicalEng', 'electricalEng', 'aerospaceEng', 'petroleumEng', 'oilGas', 'docks', 'merchantMarine', 'trucking', 'logistics', 'craneOperator', 'welding'], from: 1900 },
  smallTrade: { label: 'shops, restaurants and small trades', icon: '🏪', professions: ['retail', 'culinary', 'hospitality', 'cosmetology', 'milkRound', 'trades', 'plumbing', 'carpentry', 'hvac', 'automotive', 'blacksmith', 'pharmacy', 'dentistry', 'optometry', 'veterinary', 'funeral', 'fitness', 'childcare', 'caregiving'], from: 1900 },
  farming: { label: 'the land (collective farms)', icon: '🌾', professions: ['agriculture'], from: 1900 },
};

/** Planned economies: everything the state's. [from, until]. */
export const PLANNED = {
  RU: [1918, 1991], UA: [1920, 1991], BY: [1920, 1991], GE: [1921, 1991], AM: [1921, 1991], AZ: [1921, 1991], KZ: [1920, 1991], UZ: [1924, 1991], KG: [1924, 1991], TJ: [1924, 1991], TM: [1924, 1991],
  MD: [1940, 1991], EE: [1940, 1991], LV: [1940, 1991], LT: [1940, 1991],
  PL: [1948, 1989], CZ: [1948, 1989], SK: [1948, 1989], HU: [1949, 1989], RO: [1948, 1989], BG: [1947, 1989], AL: [1946, 1991], MN: [1924, 1990],
  RS: [1945, 1989], HR: [1945, 1990], SI: [1945, 1990], BA: [1945, 1991], MK: [1945, 1991], ME: [1945, 1991],
  CN: [1956, 1978], KP: [1948, 9999], VN: [1976, 1986], LA: [1975, 1986], CU: [1961, 9999], KH: [1975, 1989], AF: [1978, 1992], ET: [1975, 1991], MZ: [1975, 1990], AO: [1975, 1990],
};
/** Where a planned economy left a sector partly private: Poland's and Yugoslavia's peasant farms, Hungary's small traders after 1982. */
export const PLANNED_EXCEPTIONS = {
  PL: { farming: [[0, 9999, 0.25]], smallTrade: [[1980, 9999, 0.85]] },
  RS: { farming: [[1953, 9999, 0.15]], smallTrade: [[1965, 9999, 0.9]] }, HR: { farming: [[1953, 9999, 0.15]] }, SI: { farming: [[1953, 9999, 0.15]] }, BA: { farming: [[1953, 9999, 0.15]] }, MK: { farming: [[1953, 9999, 0.15]] }, ME: { farming: [[1953, 9999, 0.15]] },
  HU: { smallTrade: [[1982, 9999, 0.8]] },
  CN: { farming: [[0, 1953, 0.3]] },
};

export const OWNERSHIP = {
  coal: { GB: [[1947, 1994, 1]], FR: [[1946, 2004, 1]], IN: [[1973, 9999, 0.9]], JP: [], DE: [], US: [], IT: [[1935, 9999, 1]], ES: [[1967, 2000, 0.5]], BE: [], AU: [], ZA: [] },
  rail: {
    GB: [[1948, 1997, 1]], FR: [[1938, 9999, 1]], DE: [[1920, 9999, 1]], IT: [[1905, 9999, 1]], JP: [[1906, 1987, 1], [1987, 9999, 0.2]], IN: [[1925, 1951, 0.6], [1951, 9999, 1]],
    US: [[1971, 9999, 0.15]], CA: [[1919, 1995, 0.5]], AU: [[1880, 1995, 1], [1995, 9999, 0.4]], NZ: [[1880, 1993, 1], [2008, 9999, 1]], ES: [[1941, 9999, 1]], BE: [[1926, 9999, 1]], NL: [[1938, 9999, 1]],
    AT: [[1919, 9999, 1]], CH: [[1902, 9999, 1]], SE: [[1939, 9999, 0.9]], IE: [[1950, 9999, 1]], ZA: [[1910, 9999, 1]], AR: [[1948, 1993, 1]], MX: [[1937, 1995, 1]], BR: [[1957, 1996, 1]],
    '*': [[1945, 9999, 0.9]],
  },
  power: {
    GB: [[1948, 1990, 1]], FR: [[1946, 9999, 1]], IT: [[1962, 1999, 1]], IN: [[1948, 9999, 0.9]], NZ: [[1945, 1999, 1]], AU: [[1950, 1995, 1]], IE: [[1927, 9999, 1]], MX: [[1960, 9999, 1]],
    US: [[1933, 9999, 0.1]], CA: [[1906, 9999, 0.8]], DE: [], JP: [], ES: [], '*': [[1950, 1995, 0.8]],
  },
  telecom: {
    GB: [[1912, 1984, 1]], FR: [[1889, 1998, 1]], DE: [[1877, 1996, 1]], JP: [[1890, 1985, 1]], IT: [[1964, 1997, 1]], IN: [[1947, 1994, 1], [1994, 9999, 0.4]], AU: [[1901, 1997, 1]], NZ: [[1880, 1990, 1]],
    US: [], CA: [], ES: [[1945, 1997, 0.6]], '*': [[1920, 1995, 0.9]],
  },
  airline: {
    GB: [[1939, 1987, 0.85]], FR: [[1948, 2004, 1]], IT: [[1946, 2008, 1]], DE: [[1953, 1997, 1]], JP: [[1953, 1987, 0.6]], IN: [[1953, 1994, 1], [1994, 2022, 0.4]], AU: [[1946, 1995, 0.6]], NZ: [[1947, 1989, 1]],
    CA: [[1937, 1989, 0.7]], ES: [[1943, 2001, 1]], NL: [[1929, 1998, 0.6]], US: [], '*': [[1950, 1995, 0.8]],
  },
  banking: { FR: [[1945, 1982, 0.4], [1982, 1987, 0.8], [1987, 1997, 0.3]], IN: [[1969, 1980, 0.85], [1980, 1994, 0.92], [1994, 9999, 0.7]], MX: [[1982, 1991, 1]], PT: [[1975, 1989, 1]], IT: [[1933, 1993, 0.6]] },
  health: { GB: [[1948, 9999, 0.92]], NZ: [[1938, 9999, 0.8]], IT: [[1978, 9999, 0.8]], ES: [[1986, 9999, 0.8]], SE: [[1960, 9999, 0.9]], NO: [[1970, 9999, 0.9]], DK: [[1970, 9999, 0.9]], FI: [[1972, 9999, 0.9]], PT: [[1979, 9999, 0.75]], IE: [[1970, 9999, 0.6]] },
  industry: {}, smallTrade: {}, farming: {},
};

const rowAt = (rows, y) => rows?.find(([a, b]) => y >= a && y < b);
const planned = (cc, y) => { const p = PLANNED[cc]; return Boolean(p && y >= p[0] && y < p[1]); };

/** History's share of a sector the state owned in a country and year (0–1). */
export function historyShare(sector, cc, y) {
  if (planned(cc, y)) {
    const ex = rowAt(PLANNED_EXCEPTIONS[cc]?.[sector], y);
    return ex ? ex[2] : 1;
  }
  const t = OWNERSHIP[sector] ?? {};
  const rows = t[cc] ?? t['*'];
  return rowAt(rows, y)?.[2] ?? 0;
}
export const plannedEconomy = planned;
