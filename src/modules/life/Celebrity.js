/**
 * Cancelled, and back. A big scandal while you're famous can turn into a cancellation: the
 * brands drop you, the bookings stop, strangers have opinions. Then the long way back — an
 * apology that lands (or doesn't), years out of the light, a comeback project, or doubling down
 * for the fans who stayed. Comebacks are a story the public loves, when they work.
 *
 * state.fame.cancelled = { since, headline, tried }
 */
import { Random, clamp } from '../../core/Random.js';
import { fameScore } from './Fame.js';
import { priceLevel } from '../world/Countries.js';

const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 33503 + state.character.age * 449 + 0xca7) >>> 0);
export const cancelledOf = (state) => state.fame?.cancelled ?? null;

/** A scandal big enough, on someone famous enough, cancels them. */
function maybeCancel(ctx, severity, headline) {
  const { state } = ctx;
  const f = state.fame;
  if (!f || f.cancelled || fameScore(state) < 45 || (severity ?? 0) < 8) return;
  if (!sideRng(state).chance(0.35 + (severity - 8) * 0.08)) return;
  f.cancelled = { since: state.character.age, headline, tried: [] };
  const lost = (f.deals ?? []).length;
  f.deals = [];
  ctx.log(`Cancelled. After ${headline}, the internet turned on you overnight.${lost ? ` ${lost} brand deal${lost === 1 ? '' : 's'} dropped you.` : ''}`, '🚫', 'bad');
  ctx.stat('happiness', -12);
  ctx.emit('health:trauma', { amount: 6, source: 'public shaming' });
}

export function celebrityTick(main) {
  const { state } = main;
  const c = cancelledOf(state);
  if (!c) return;
  const years = state.character.age - c.since;
  if (years < 1) return;
  if (years >= 8) { state.fame.cancelled = null; return main.log('Years later, people have mostly forgotten why they were angry with you.', '🌫️', 'info'); }
  if (state.prompts.some((p) => p.type === 'celebrity.comeback')) return;
  main.prompt({ type: 'celebrity.comeback', icon: '🎬', title: 'The Way Back', text: `It has been ${years} year${years === 1 ? '' : 's'} since ${c.headline}. What now?`, data: {}, options: [
    { id: 'apology', label: '🙇 A long, specific apology — and amends', disabled: c.tried.includes('apology'), hint: 'Only works once, and only if it\'s real' },
    { id: 'project', label: '🎬 A comeback project', hint: `Costs ≈$${Math.round(40000 * priceLevel(state)).toLocaleString()}; a hit forgives a lot` },
    { id: 'quiet', label: '🌲 Stay out of the light another year' },
    { id: 'double', label: '😤 Double down for the fans who stayed', hint: 'A loyal niche; the mainstream stays closed' },
  ] });
}

export const CelebrityResolvers = {
  comeback(ctx, data, optionId) {
    const { state, rng } = ctx;
    const c = cancelledOf(state);
    if (!c) return;
    const years = state.character.age - c.since;
    const back = (text) => { state.fame.cancelled = null; state.fame.comebacks = (state.fame.comebacks ?? 0) + 1; ctx.emit('fame:buzz', { amount: 10 }); ctx.stat('happiness', 10); ctx.log(text, '🌅', 'milestone'); };
    if (optionId === 'apology') {
      c.tried.push('apology');
      if (rng.chance(clamp(0.25 + years * 0.1, 0.25, 0.7))) return back('The apology landed: specific, unhedged, and followed by things you actually did. The comeback had begun.');
      return ctx.log('The apology was picked apart line by line. "Notes app apology," they called it.', '🙇', 'warn');
    }
    if (optionId === 'project') {
      ctx.spend(Math.round(40000 * priceLevel(state)), 'Comeback project', { allowDebt: true });
      if (rng.chance(clamp(0.2 + years * 0.08 + (state.stats.smarts ?? 50) / 400, 0.2, 0.65))) return back('The comeback project was a hit. Reviewers called it "a reckoning". Audiences called it good.');
      return ctx.log('The comeback flopped. "Too soon," said everyone.', '🎬', 'bad');
    }
    if (optionId === 'quiet') { ctx.stat('stress', -6); return ctx.log('Another year out of the public eye. It was, honestly, a relief.', '🌲', 'info'); }
    state.fame.buzz = (state.fame.buzz ?? 0) + 4;
    ctx.log('You doubled down. A smaller, louder audience loves you for it.', '😤', 'warn');
  },
};

export const CelebrityModule = {
  id: 'celebrity',
  order: 60.5,
  setup(engine) { engine.bus.on('fame:afterScandal', ({ ctx, severity, headline }) => maybeCancel(ctx, severity, headline)); },
  onAgeUp: celebrityTick,
  resolvers: CelebrityResolvers,
};
export { maybeCancel };
