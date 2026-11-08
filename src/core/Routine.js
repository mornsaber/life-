/**
 * "Auto-resolve routine decisions": prompts with one obviously safe answer
 * that players answer the same way every time. Anything with a real
 * trade-off (careers, crime you might want, combat, campaigns) is never
 * routine. A prompt with a single available option is always routine.
 */
export const ROUTINE = {
  'health.acute': 'treat',
  'health.driveDrunk': 'ride',
  'investing.meme': 'pass',
  'investing.pump': 'pass',
  'legal.temptation': 'decline',
  'campus.leakedExam': 'ignore',
  'housing.repair': 'contractor',
  'career.cbaVote': 'ratify',
  'politics.donorFavor': 'legal',
  'retirement.rollover': 'rollover',
  'k12.dropoutRisk': 'stay',
};

/** The option to pick automatically, or null when the player should decide. */
export function routineChoice(prompt) {
  const enabled = prompt.options.filter((o) => !o.disabled);
  if (enabled.length === 1) return enabled[0].id;
  const id = ROUTINE[prompt.type];
  return id && enabled.some((o) => o.id === id) ? id : null;
}

/**
 * Low-stakes moments: social and civic decisions that colour a year but rarely change a life
 * (a ballot, a neighbour's favour, a rival's jab, a reunion). When a year brings more decisions
 * than the player's chosen limit, these are the ones answered quietly, with the safe default.
 * Anything with real stakes — work, money at risk, health, the law, family crises — always asks.
 */
export const MINOR = new Set(['familyFeuds.reunion', 'disasterSeason.season', 'bonds.moment', 'civic.neighbor', 'party.ballot', 'civic.ballot', 'rivals.cross', 'neighbourhood.event', 'friends.reunion', 'world.refugees', 'rural.moment', 'stocks.ipo', 'investing.meme', 'investing.pump']);
/** Where the safe answer isn't the obvious 'skip' (skipping a family reunion costs you with the family). */
const PREFER = { 'familyFeuds.reunion': 'go', 'disasterSeason.season': 'kit' };
const QUIET = ['skip', 'pass', 'no', 'shrug', 'quiet', 'live', 'wait', 'concede', 'phone', 'brake', 'earplugs', 'ignore', 'delete', 'decline'];

/** The quiet answer to a low-stakes prompt (null when it isn't one, or has no safe answer). */
export function quietChoice(prompt) {
  if (!MINOR.has(prompt.type)) return null;
  const enabled = prompt.options.filter((o) => !o.disabled && o.tone !== 'danger' && !o.illegal);
  return [PREFER[prompt.type], ...QUIET].map((id) => enabled.find((o) => o.id === id)).find(Boolean)?.id ?? null;
}

/** Decisions per year the player wants to see: every one, or a cap with low-stakes ones handled quietly. */
export const DECISION_LEVELS = {
  all: { label: 'Every decision', budget: Infinity },
  focused: { label: 'Focused (up to 3 a year)', budget: 3 },
  light: { label: 'Light (up to 2 a year)', budget: 2 },
};
