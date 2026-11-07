/**
 * Reputation by circle: what people think of you depends on which people.
 *
 *   work           colleagues and the trade: hiring and promotion odds
 *   neighbourhood  the street and the town: local elections and civic roles
 *   online         strangers on the internet: audience careers and pile-ons
 *   underworld     the people who don't use their real names: an outfit's trust
 *   family         the relatives: who visits, who helps, who contests the will
 *
 * Each runs 0–100 and drifts back toward 50. A scandal in one circle can spill into the
 * others; the more famous you are, the further it travels.
 *
 * state.reputation = { work, neighbourhood, online, underworld, family, history: [...] }
 */
import { Random } from '../../core/Random.js';
import { fameScore } from './Fame.js';

export const CIRCLES = {
  work: { label: 'Work', icon: '💼' },
  neighbourhood: { label: 'Neighbourhood', icon: '🏘️' },
  online: { label: 'Online', icon: '📱' },
  underworld: { label: 'Underworld', icon: '🕶️' },
  family: { label: 'Family', icon: '👪' },
};
const START = { work: 50, neighbourhood: 50, online: 50, underworld: 30, family: 60 };
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const sideRng = (state, salt) => new Random(((state.world?.seed ?? 1) * 60317 + state.character.age * 911 + salt) >>> 0);

/** Read-only for views: the reputation, or the starting values. */
export const reputationOf = (state) => state.reputation ?? { ...START, history: [] };
export const repIn = (state, circle) => reputationOf(state)[circle] ?? START[circle] ?? 50;

function ensure(state) {
  state.reputation ??= { ...START, history: [] };
  return state.reputation;
}

/** Move a circle's reputation; the reason is kept for the Life tab. */
export function rep(ctx, circle, delta, why = '') {
  if (!CIRCLES[circle] || !delta) return;
  const r = ensure(ctx.state);
  r[circle] = clamp(r[circle] + delta);
  if (why && Math.abs(delta) >= 5) {
    r.history.push({ age: ctx.state.character.age, circle, delta: Math.round(delta), why });
    if (r.history.length > 30) r.history.shift();
  }
}

/** A scandal starts in one circle and may spill into others: further for the famous. */
export function spreadScandal(ctx, origin, size, why) {
  rep(ctx, origin, -size, why);
  const r = ensure(ctx.state);
  r.scandals = (r.scandals ?? 0) + 1;
  const rng = sideRng(ctx.state, size * 7 + origin.length + r.scandals * 131);
  const reach = 0.15 + fameScore(ctx.state) / 140;
  for (const c of Object.keys(CIRCLES)) {
    if (c === origin || c === 'underworld') continue;
    if (rng.chance(reach)) rep(ctx, c, -Math.round(size * 0.5), `${why} (word got around)`);
  }
}

/** Hiring odds: a good name in your trade opens doors. */
export const workRepBonus = (state) => (repIn(state, 'work') - 50) / 500;
/** Local elections: neighbours vote for people they know well of. */
export const neighbourhoodVoteBonus = (state) => (repIn(state, 'neighbourhood') - 50) / 400;

export const ReputationModule = {
  id: 'reputation',
  order: 88.5,

  setup(engine) {
    engine.bus.on('fame:scandal', ({ ctx, severity, headline }) => spreadScandal(ctx, 'online', Math.round((severity ?? 8) * 1.2), headline ?? 'A scandal'));
    engine.bus.on('legal:convicted', ({ ctx, severity }) => {
      const felony = severity === 'felony';
      rep(ctx, 'work', felony ? -15 : -5, 'A criminal conviction');
      rep(ctx, 'neighbourhood', felony ? -12 : -4, 'A criminal conviction');
      rep(ctx, 'underworld', felony ? 10 : 3, 'Did time without talking');
    });
    engine.bus.on('career:hired', ({ ctx }) => rep(ctx, 'work', 2));
    engine.bus.on('career:resign', ({ ctx, reason }) => { if (/fired|dismiss|terminat/i.test(reason ?? '')) rep(ctx, 'work', -8, 'Fired'); });
  },

  onAgeUp(ctx) {
    const { state } = ctx;
    if (state.character.age < 12) return;
    const r = ensure(state);
    // Memories fade: every circle drifts back toward where it started.
    for (const c of Object.keys(CIRCLES)) r[c] = clamp(r[c] + (START[c] - r[c]) * 0.08);
    // Steady signals from the life you lead.
    const job = state.career.job;
    if (job) rep(ctx, 'work', (job.performance ?? 50) >= 75 ? 2 : (job.performance ?? 50) <= 30 ? -2 : 0);
    if (state.civic?.neighbors?.length) rep(ctx, 'neighbourhood', 1);
    if (state.underworld?.me && !state.underworld.me.left) rep(ctx, 'underworld', 2);
  },
};
