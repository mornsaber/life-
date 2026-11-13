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
  suffrage: { name: 'Votes for women', icon: '🗳️', allies: ['editorial'], from: 1848, until: 1929 },
  eightHours: { name: 'The eight-hour day', icon: '⏰', allies: ['labor'], from: 1866, until: 1938 },
  homeRule: { name: 'Irish Home Rule', icon: '☘️', allies: ['party'], from: 1870, until: 1922, where: ['IE', 'GB'] },
  civilRights: { name: 'Civil rights', icon: '✊🏿', allies: ['editorial'], from: 1954, until: 1969, where: ['US'] },
  disarmament: { name: 'Ban the Bomb', icon: '☮️', allies: ['editorial'], from: 1957, until: 1992 },
  antiApartheid: { name: 'Anti-apartheid', icon: '✊', allies: ['editorial'], from: 1959, until: 1995 },
  gayRights: { name: 'Gay liberation', icon: '🏳️‍🌈', allies: ['editorial'], from: 1969 },
};
/** The causes of the year and the country. */
export const causesNow = (state, y, war) => Object.entries(CAUSES).filter(([, c]) => (!c.warOnly || war) && !(c.from > y) && !(c.until <= y) && (!c.where || c.where.includes(state.character.countryId ?? 'US')));

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
