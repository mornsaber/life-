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
  climate: { name: 'Climate action', icon: '🌍', allies: ['editorial'] },
  labor: { name: 'Workers\' rights', icon: '✊', allies: ['labor'] },
  taxpayers: { name: 'Lower taxes', icon: '💸', allies: ['party'] },
  gunRights: { name: 'Gun rights', icon: '🎯', allies: ['party'] },
  gunSafety: { name: 'Gun safety', icon: '🕊️', allies: ['editorial'] },
  policeReform: { name: 'Police reform', icon: '⚖️', allies: ['editorial'] },
  backTheBlue: { name: 'Back the Blue', icon: '🚓', allies: ['lawEnforcement'] },
  housing: { name: 'More housing (YIMBY)', icon: '🏗️', allies: ['editorial'] },
  neighborhood: { name: 'Protect our neighborhood (NIMBY)', icon: '🏡', allies: ['party'] },
  veterans: { name: 'Veterans\' care', icon: '🎖️', allies: ['veterans'] },
  antiwar: { name: 'End the war', icon: '☮️', allies: ['editorial'], warOnly: true },
};

/**
 * Protest tactics. arrest: chance of arrest; influence: what it builds;
 * minInfluence: organizing needs a following first.
 */
export const TACTICS = {
  march: { label: '🪧 Join a permitted march', arrest: 0.01, influence: 4, stress: 1, desc: 'Safe; adds your voice' },
  rally: { label: '📣 Speak at a rally', arrest: 0.02, influence: 7, minInfluence: 15, stress: 2, desc: 'Needs a following (15+)' },
  canvass: { label: '🚪 Door-knock for the cause', arrest: 0, influence: 5, stress: 2, desc: 'Slow, durable influence' },
  sitIn: { label: '✋ Civil disobedience: sit-in', arrest: 0.55, influence: 12, stress: 6, desc: 'Headlines — and handcuffs' },
  organize: { label: '🗺️ Organize a city-wide action', arrest: 0.1, influence: 14, minInfluence: 40, cost: 2000, stress: 6, desc: 'Needs a movement (40+)' },
};

export const influenceVoteBonus = (state) => Math.min(0.05, (state.civic?.activism?.influence ?? 0) * 0.0006);
