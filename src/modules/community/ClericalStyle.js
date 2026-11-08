/**
 * How the ordained and the vowed are addressed: "Fr. Ignatius Loyola, SJ", "The Revd Jane Smith",
 * "Rabbi Cohen", "Sister Agnes, MC". Holy orders (state.community.orders) give the style, by
 * tradition; membership of a religious order (state.community.religious) gives the post-nominal
 * letters and, for sisters, "Sister".
 */
const ORDER_POST = { jesuits: 'SJ', moc: 'MC' };
const CATHOLIC_LIKE = ['catholic', 'tradCatholic', 'orthodoxChristian'];
const JEWISH = ['reformJewish', 'conservativeJewish', 'orthodoxJewish', 'hasidic'];
const MUSLIM = ['sunni', 'shia', 'salafi'];

const ordersOf = (state) => { const o = state.community?.orders; return o && !o.laicized ? o : null; };
const religiousOf = (state) => { const r = state.community?.religious; return r && !r.left ? r : null; };

/** The prefix your orders give you, or null. */
export function clericalPrefix(state) {
  const o = ordersOf(state);
  const r = religiousOf(state);
  if (!o) return r?.order === 'moc' ? 'Sister' : null;
  const t = o.tradition ?? state.community?.faith?.traditionId;
  if (o.grade === 'bishop') return t === 'anglican' ? 'The Rt Revd' : CATHOLIC_LIKE.includes(t) ? 'The Most Reverend' : 'Bishop';
  if (JEWISH.includes(t)) return 'Rabbi';
  if (MUSLIM.includes(t)) return 'Imam';
  if (t === 'buddhist') return 'Venerable';
  if (t === 'hindu') return 'Pandit';
  if (t === 'sikh') return 'Bhai';
  if (o.grade === 'deacon') return t === 'anglican' ? 'The Revd' : 'Deacon';
  if (o.grade === 'priest') return CATHOLIC_LIKE.includes(t) ? 'Fr.' : t === 'anglican' ? 'The Revd' : 'Rev.';
  return 'Rev.';
}

/** Post-nominal letters of your religious order (SJ, MC), from first vows. */
export function religiousPost(state) {
  const r = religiousOf(state);
  return r && r.stage !== 'novice' && r.stage !== 'postulant' ? ORDER_POST[r.order] ?? null : null;
}
