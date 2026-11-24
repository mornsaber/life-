/**
 * Causes, protests and organizing. Activists build influence — with voters,
 * local media and campaigns — by showing up: marches, sit-ins, door-knocking
 * and organizing. Civil disobedience gets attention and gets you arrested.
 * Influence moves ballot measures, helps the candidates you back, and is a
 * real asset if you run for office yourself.
 *
 * state.civic.activism = { cause, influence (0–100), protests, arrests, years, organizer }
 */
export const CAUSES = {
  climate: { name: 'Climate action', icon: '🌍', allies: ['editorial'], from: 1988 },
  labor: { name: 'Workers\' rights', icon: '✊', allies: ['labor'] },
  taxpayers: { name: 'Lower taxes', icon: '💸', allies: ['party'], from: 1900 },
  gunRights: { name: 'Gun rights', icon: '🎯', allies: ['party'], from: 1970 },
  gunSafety: { name: 'Gun safety', icon: '🕊️', allies: ['editorial'], from: 1990 },
  policeReform: { name: 'Police reform', icon: '⚖️', allies: ['editorial'], from: 1965 },
  backTheBlue: { name: 'Back the Blue', icon: '🚓', allies: ['lawEnforcement'], from: 2014 },
  housing: { name: 'More housing (YIMBY)', icon: '🏗️', allies: ['editorial'], from: 2015 },
  neighborhood: { name: 'Protect our neighborhood (NIMBY)', icon: '🏡', allies: ['party'], from: 1980 },
  veterans: { name: 'Veterans\' care', icon: '🎖️', allies: ['veterans'], from: 1918 },
  antiwar: { name: 'End the war', icon: '☮️', allies: ['editorial'], warOnly: true },
  // The great causes of their day (from–until; where).
  abolition: { name: 'Abolish slavery', icon: '⛓️', allies: ['editorial'], from: 1800, until: 1866, where: ['US', 'GB', 'FR', 'BR'] },
  temperance: { name: 'Temperance', icon: '🚱', allies: ['party'], from: 1826, until: 1934 },
  chartism: { name: 'The People\'s Charter', icon: '📜', allies: ['labor'], from: 1838, until: 1858, where: ['GB'] },
  // From Seneca Falls (1848) in America and Britain; elsewhere when a movement of its own began.
  suffrage: { name: 'Votes for women', icon: '🗳️', allies: ['editorial'], from: 1848, until: 1929, fromHere: { RU: 1905, MD: 1905, UA: 1905, FR: 1876, DE: 1890, IT: 1900, ES: 1918, JP: 1911, IN: 1917, CN: 1911, BR: 1910 } },
  eightHours: { name: 'The eight-hour day', icon: '⏰', allies: ['labor'], from: 1866, until: 1938 },
  homeRule: { name: 'Irish Home Rule', icon: '☘️', allies: ['party'], from: 1870, until: 1922, where: ['IE', 'GB'] },
  civilRights: { name: 'Civil rights', icon: '✊🏿', allies: ['editorial'], from: 1954, until: 1969, where: ['US'] },
  disarmament: { name: 'Ban the Bomb', icon: '☮️', allies: ['editorial'], from: 1957, until: 1992 },
  antiApartheid: { name: 'Anti-apartheid', icon: '✊', allies: ['editorial'], from: 1959, until: 1995 },
  gayRights: { name: 'Gay liberation', icon: '🏳️‍🌈', allies: ['editorial'], from: 1969 },
};
/** When history won the cause, country by country (cause → { cc: year, '*': year }). */
export const VICTORIES = {
  abolition: { GB: 1833, FR: 1848, US: 1865, BR: 1888 },
  suffrage: { NZ: 1893, AU: 1902, FI: 1906, NO: 1913, DK: 1915, RU: 1917, CA: 1918, DE: 1918, AT: 1918, PL: 1918, NL: 1919, SE: 1919, US: 1920, GB: 1928, IE: 1922, ES: 1931, BR: 1932, TR: 1934, FR: 1944, IT: 1946, JP: 1945, IN: 1950, CH: 1971 },
  temperance: { US: 1919, FI: 1919, NO: 1916, IS: 1915, CA: 1918 },
  eightHours: { FR: 1919, DE: 1918, ES: 1919, NL: 1919, US: 1938, GB: 1919, IT: 1923, AU: 1916, NZ: 1936, RU: 1917, MX: 1917 },
  homeRule: { IE: 1922, GB: 1922 },
  civilRights: { US: 1964 },
  disarmament: { '*': 1987 },
};
export const victoryYear = (cause, cc) => VICTORIES[cause]?.[cc] ?? VICTORIES[cause]?.['*'] ?? null;
/** The causes of the year and the country (not one already won here). */
export const causesNow = (state, y, war) => Object.entries(CAUSES).filter(([id, c]) => (!c.warOnly || war) && !((c.fromHere?.[state.character.countryId ?? 'US'] ?? c.from) > y) && !(c.until <= y) && (!c.where || c.where.includes(state.character.countryId ?? 'US')) && !((victoryYear(id, state.character.countryId ?? 'US') ?? 9999) <= y));

/**
 * Protest tactics. arrest: chance of arrest; influence: what it builds;
 * minInfluence: organizing needs a following first.
 */
export const TACTICS = {
  march: { label: '🪧 Join a permitted march', arrest: 0, influence: 4, stress: 1, desc: 'Safe; adds your voice' },
  rally: { label: '📣 Speak at a rally', arrest: 0, influence: 7, minInfluence: 15, stress: 2, desc: 'Needs a following (15+)' },
  canvass: { label: '🚪 Door-knock for the cause', arrest: 0, influence: 5, stress: 2, desc: 'Slow, durable influence' },
  sitIn: { label: '✋ Civil disobedience: sit-in', arrest: 0.55, influence: 12, stress: 6, desc: 'Headlines — and likely arrest (trespass)' },
  organize: { label: '🗺️ Organize a city-wide action', arrest: 0.04, influence: 14, minInfluence: 40, cost: 2000, stress: 6, desc: 'Needs a movement (40+)' },
};

export const influenceVoteBonus = (state) => Math.min(0.05, (state.civic?.activism?.influence ?? 0) * 0.0006);
