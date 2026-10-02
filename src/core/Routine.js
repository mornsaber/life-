/**
 * "Auto-resolve routine decisions": prompts with one obviously safe answer
 * that players answer the same way every time. Anything with a real
 * trade-off (careers, crime you might want, combat, campaigns) is never
 * routine. A prompt with a single available option is always routine.
 */
export const ROUTINE = {
  'health.acute': 'treat',
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
