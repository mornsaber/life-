/**
 * The news: a front page every year, world, national and local.
 *
 *   Stories   modules raise them with `news:story` ({ tier, headline, weight, icon }); the
 *             news also notices the world changing on its own — a new war, a coup, the
 *             economy turning — and fills the quiet corners with sport and celebrity.
 *   You       when you're newsworthy (fame, office, a scandal, a conviction), you're on it.
 *   Reactions a rival has something to say when you make the paper; a crash on the front page
 *             asks what you'll do with your shares.
 *
 * state.news = { current: [stories], pages: [{ age, year, stories }], seen: { wars, juntas, phase } }
 */
import { Random } from '../../core/Random.js';
import { COUNTRIES } from '../world/Countries.js';
import { REGIONS } from './Regions.js';
import { fameScore } from './Fame.js';
import { rivalsOf } from '../people/Rivals.js';
import { portfolioValue, sell } from '../investing/Brokerage.js';

export const TIERS = { world: { label: 'World', icon: '🌍' }, national: { label: 'National', icon: '🏛️' }, local: { label: 'Local', icon: '🏘️' } };
const MAX_PAGES = 30;
const sideRng = (state, salt) => new Random(((state.world?.seed ?? 1) * 81611 + state.character.age * 389 + salt) >>> 0);

const SPORT = ['{city} win the championship in extra time', 'Underdogs {city} stun the league leaders', 'Star striker signs record deal', 'Marathon record falls by four seconds', 'Veteran captain announces retirement', 'National team crashes out on penalties'];
const CELEB = ['Pop star\'s surprise wedding breaks the internet', 'Film franchise\'s ninth instalment tops the box office', 'Reality star launches a political party', 'Chef\'s restaurant loses its stars', 'Celebrity couple announce split after nine years'];
const LOCAL = ['New bypass opens three years late', 'Council approves {city} riverside housing', 'Beloved bakery closes after 60 years', 'Fire guts empty warehouse; nobody hurt', 'Schools rated above average in new report', 'Potholes: residents demand action'];

function ensure(state) {
  state.news ??= { current: [], pages: [], seen: {} };
  return state.news;
}
export const latestPage = (state) => state.news?.pages?.at(-1) ?? null;

/** Add a story to this year's paper (any module, via the bus or directly). */
export function addStory(state, { tier = 'national', headline, weight = 1, icon = '📰', you = false }) {
  if (!headline || !TIERS[tier]) return;
  const n = ensure(state);
  if (n.current.some((s) => s.headline === headline)) return;
  n.current.push({ tier, headline, weight, icon, you });
}

/** What changed in the world since last year, seen by the newsroom. */
function worldWatch(state) {
  const n = ensure(state);
  const seen = n.seen;
  const wars = Object.keys(state.world?.wars ?? {});
  for (const cc of wars) if (!(seen.wars ?? []).includes(cc)) addStory(state, { tier: cc === (state.character.countryId ?? 'US') ? 'national' : 'world', headline: `War breaks out in ${COUNTRIES[cc]?.name ?? cc}`, weight: 8, icon: '⚔️' });
  for (const cc of seen.wars ?? []) if (!wars.includes(cc)) addStory(state, { tier: 'world', headline: `Ceasefire holds in ${COUNTRIES[cc]?.name ?? cc}`, weight: 5, icon: '🕊️' });
  seen.wars = wars;
  const juntas = Object.keys(state.world?.juntas ?? {});
  for (const cc of juntas) if (!(seen.juntas ?? []).includes(cc)) addStory(state, { tier: cc === (state.character.countryId ?? 'US') ? 'national' : 'world', headline: state.world.juntas[cc]?.revolution ? `Revolution topples the government of ${COUNTRIES[cc]?.name ?? cc}` : `Military seizes power in ${COUNTRIES[cc]?.name ?? cc}`, weight: 7, icon: '🪖' });
  seen.juntas = juntas;
  const phase = state.economy?.phase;
  if (seen.phase && phase !== seen.phase) {
    const h = { recession: ['Recession confirmed as markets slump', 9, '📉'], recovery: ['Economy returns to growth', 5, '🌱'], peak: ['Boom times: jobs, prices and rates all up', 5, '🔥'], expansion: ['Economy expanding steadily', 3, '📈'] }[phase];
    if (h) addStory(state, { tier: 'national', headline: h[0], weight: h[1], icon: h[2] });
  }
  seen.phase = phase;
}

/** Fill the quiet corners so every section has something on it. */
function filler(state, rng) {
  const city = REGIONS[state.character.regionId]?.name?.split(',')[0] ?? 'Local';
  const n = ensure(state);
  const fill = (tier, pool, icon) => { if (!n.current.some((s) => s.tier === tier)) addStory(state, { tier, headline: rng.pick(pool).replace('{city}', city), weight: 1, icon }); };
  fill('local', LOCAL, '🏘️');
  fill('national', [...SPORT, ...CELEB], rng.chance(0.5) ? '⚽' : '🎬');
  fill('world', ['Climate summit ends without a deal', 'Trade talks resume after a year of tariffs', 'Record heat across three continents', 'Space probe sends back first images', 'Global markets steady after a volatile week'], '🌍');
}

/** Close this year's paper: the front page is the heaviest stories in each tier. */
export function printPaper(ctx) {
  const { state } = ctx;
  const rng = sideRng(state, 0x0e);
  worldWatch(state);
  filler(state, rng);
  const n = ensure(state);
  const stories = Object.keys(TIERS).flatMap((t) => n.current.filter((s) => s.tier === t).sort((a, b) => b.weight - a.weight).slice(0, 3));
  n.pages.push({ age: state.character.age, year: (state.character.birthYear ?? 0) + state.character.age, stories });
  if (n.pages.length > MAX_PAGES) n.pages.shift();
  n.current = [];
  // You made the paper: a rival has something to say.
  const mine = stories.find((s) => s.you);
  const rival = rivalsOf(state).find((r) => !r.friend);
  if (mine && rival && rng.chance(0.5)) ctx.log(`${rival.name} sent you the clipping — "${mine.headline}" — with a single raised-eyebrow emoji.`, '📰', 'info');
  // A crash on the front page: what about your shares?
  if (stories.some((s) => /Recession confirmed/.test(s.headline)) && state.investing && portfolioValue(state).brokerage >= 5000 && !state.prompts.some((p) => p.type === 'news.crash')) {
    ctx.prompt({
      type: 'news.crash', icon: '📉', title: 'Markets in Freefall',
      text: 'The front page is all red. Your brokerage account is down, and every expert has a different view.',
      options: [
        { id: 'hold', label: '🧘 Hold and ride it out' },
        { id: 'sell', label: '🏃 Sell before it gets worse', hint: 'Locks in the losses' },
        { id: 'buy', label: '🛒 Buy the dip', hint: 'Puts 20% of your cash into the index' },
      ],
      data: {},
    });
  }
}

export const NewsModule = {
  id: 'news',
  order: 98,

  setup(engine) {
    engine.bus.on('news:story', ({ ctx, ...story }) => addStory(ctx.state, story));
    engine.bus.on('disaster:struck', ({ ctx, disaster }) => addStory(ctx.state, { tier: 'local', headline: `${disaster?.name ?? 'Disaster'} strikes ${REGIONS[ctx.state.character.regionId]?.name?.split(',')[0] ?? 'the region'}`, weight: 7, icon: '🌪️' }));
    engine.bus.on('fame:scandal', ({ ctx, headline }) => { if (fameScore(ctx.state) >= 15) addStory(ctx.state, { tier: fameScore(ctx.state) >= 50 ? 'national' : 'local', headline: `${ctx.state.character.firstName} ${ctx.state.character.lastName} in ${headline ?? 'scandal'}`.slice(0, 120), weight: 6, icon: '🗞️', you: true }); });
    engine.bus.on('politics:officeChanged', ({ ctx, officeId }) => { if (officeId) addStory(ctx.state, { tier: 'local', headline: `${ctx.state.character.firstName} ${ctx.state.character.lastName} takes office`, weight: 4, icon: '🏛️', you: true }); });
    engine.bus.on('legal:convicted', ({ ctx, severity }) => { if (severity === 'felony' && fameScore(ctx.state) >= 10) addStory(ctx.state, { tier: 'local', headline: `${ctx.state.character.firstName} ${ctx.state.character.lastName} convicted`, weight: 6, icon: '⚖️', you: true }); });
  },

  onAgeUp(ctx) {
    if (ctx.state.character.age >= 6) printPaper(ctx);
  },

  resolvers: {
    crash(ctx, _data, optionId) {
      const { state } = ctx;
      if (optionId === 'hold') return ctx.log('You held your nerve and didn\'t look at your account for months.', '🧘', 'info');
      if (optionId === 'sell') {
        let total = 0;
        for (const asset of Object.keys(state.investing.holdings)) total += sell(ctx, asset, 1);
        return ctx.log(`You sold everything at the bottom: $${total.toLocaleString()} back in cash.`, '🏃', 'warn');
      }
      const amount = Math.round(Math.max(0, state.finances.cash) * 0.2);
      if (amount < 500) return ctx.log('You didn\'t have the cash to buy the dip.', '🛒', 'muted');
      const h = (state.investing.holdings.index ??= { value: 0, basis: 0, lastBuyAge: state.character.age });
      h.value += amount; h.basis += amount; h.lastBuyAge = state.character.age;
      state.finances.cash -= amount;
      ctx.log(`You bought $${amount.toLocaleString()} of index funds while everyone else was selling.`, '🛒', 'good');
    },
  },
};
