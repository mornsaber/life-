/**
 * Result cards: the big moments that resolve — an election night, a verdict, an offer letter,
 * an Olympic final, the end of a season, a fund's year — pop up as a card of their own, and are
 * kept on the year in review.
 *
 *   showResult(ctx, { icon, title, big, sub, tone })   big: the headline ("Elected", "1st",
 *                                                     "+34%"); tone: 'good' | 'bad' | 'info'
 *
 * state.results = [{ age, icon, title, big, sub, tone }]   (the last 12)
 */
export function showResult(ctx, { icon = '🏁', title, big, sub = '', tone = 'info', popup = true }) {
  const { state } = ctx;
  const r = { age: state.character.age, icon, title, big: String(big), sub, tone };
  state.results = [...(state.results ?? []).slice(-11), r];
  // One pop-up at a time: a second result in the same year waits in the year in review.
  if (popup && !state.prompts.some((p) => p.type === 'results.card')) {
    ctx.prompt({ type: 'results.card', icon, title, text: `${big}${sub ? ` — ${sub}` : ''}`, data: { card: r }, options: [{ id: 'ok', label: 'Continue' }] });
  }
  return r;
}
export const resultsThisYear = (state) => (state.results ?? []).filter((r) => r.age === state.character.age);

export const ResultCardsModule = {
  id: 'results',
  order: 0.5,
  resolvers: { card() { return undefined; } },
};
