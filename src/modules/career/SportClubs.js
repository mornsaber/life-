/**
 * Clubs and contracts for professional athletes (on top of Sport.js and the season engine).
 *
 *   Your club     a named club, a contract with years left and a wage.
 *   Transfers     a strong season brings bids from bigger clubs (more money, harder to get
 *                 into the team); a poor one, a loan move or release.
 *   Renewal       when the contract runs out: re-sign, test the market, or retire.
 *   After         the body says stop (33+, or a bad injury): coaching, punditry, or a quiet life.
 *
 * state.sport.club = { name, tier, years, wage }
 */
import { Random, clamp } from '../../core/Random.js';
import { activeAthlete, rating } from './Sport.js';
import { getProfession } from './JobTrees.js';
import { createEmployer } from './Employers.js';
import { hire } from './CareerEngine.js';
import { priceLevel } from '../world/Countries.js';

const PLACES = ['Northbridge', 'Ashford', 'Kingsport', 'Riverside', 'Westvale', 'Portmore', 'Eastham', 'Highcliffe', 'Millbrook', 'Stonebridge'];
const SUFFIX = { football: ['City', 'United', 'Athletic', 'Rovers'], basketball: ['Hawks', 'Kings', 'Storm'], rugby: ['Warriors', 'Saints', 'RFC'], cricket: ['County CC', 'Strikers'], default: ['Athletic Club', 'Track Club', 'Racing'] };
const TIERS = ['a lower-league club', 'a mid-table club', 'a top-flight club', 'one of the biggest clubs in the world'];
const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 77417 + state.character.age * 353 + 0x5c1) >>> 0);
const clubName = (rng, discipline) => `${rng.pick(PLACES)} ${rng.pick(SUFFIX[discipline] ?? SUFFIX.default)}`;
const wageFor = (state, tier) => Math.round([60000, 250000, 1200000, 6000000][tier] * priceLevel(state));
export const clubOf = (state) => state.sport?.club ?? null;

export function clubTick(main) {
  const { state } = main;
  const rng = sideRng(state);
  const ctx = { ...main, rng };
  const age = state.character.age;
  if (!activeAthlete(state)) {
    if (state.sport?.club && !state.sport.club.retired) state.sport.club = null;
    return;
  }
  const s = (state.sport ??= { discipline: null, caps: 0, captain: false, olympics: [], cups: [], doped: false, banUntil: null, federation: null, ioc: null, fifa: null });
  if (!s.club) {
    s.club = { name: clubName(rng, s.discipline), tier: 1, years: 3, wage: wageFor(state, 1) };
    return main.log(`You signed for ${s.club.name}: three years, ${TIERS[1]}.`, '✍️', 'milestone');
  }
  const c = s.club;
  c.years -= 1;
  main.earn(Math.round(c.wage * 0.15), `${c.name}: appearance and win bonuses`, { wage: true });
  const r = rating(state);
  // The body.
  if (age >= 33 && rng.chance(0.15 + (age - 33) * 0.12)) return retirePrompt(ctx, c, 'Your body is telling you it\'s time.');
  // Transfers.
  if (r >= 75 && c.tier < 3 && rng.chance(0.35)) {
    const name = clubName(rng, s.discipline);
    return ctx.prompt({ type: 'sportClubs.transfer', icon: '🔁', title: 'A Bid', text: `${name}, ${TIERS[c.tier + 1]}, has bid for you. They're offering $${wageFor(state, c.tier + 1).toLocaleString()} a year.`, data: { name, tier: c.tier + 1 }, options: [
      { id: 'go', label: '✈️ Move', hint: 'More money; you\'ll have to win your place' }, { id: 'stay', label: '🏟️ Stay loyal', hint: 'The fans will love you for it' },
    ] });
  }
  if (r < 45 && rng.chance(0.4)) {
    return ctx.prompt({ type: 'sportClubs.dropped', icon: '🪑', title: 'Out of the Team', text: `You haven't played for ${c.name} in months.`, data: {}, options: [
      { id: 'loan', label: '🔁 Go out on loan to a smaller club', hint: 'Play every week' }, { id: 'fight', label: '💪 Stay and fight for your place' },
    ] });
  }
  if (c.years <= 0) {
    return ctx.prompt({ type: 'sportClubs.renew', icon: '📝', title: 'Contract Up', text: `Your contract with ${c.name} has run out. They've offered a new one.`, data: {}, options: [
      { id: 'resign', label: '✍️ Re-sign for three years' }, { id: 'market', label: '🧳 Test the market', hint: r >= 60 ? 'Clubs are interested' : 'A risk' }, { id: 'retire', label: '👋 Retire' },
    ] });
  }
}

function retirePrompt(ctx, c, why) {
  ctx.prompt({ type: 'sportClubs.after', icon: '🎽', title: 'Hanging Up Your Boots', text: `${why} After your years at ${c.name}, what next?`, data: {}, options: [
    { id: 'coach', label: '📋 Coaching badges and a coaching job' }, { id: 'pundit', label: '🎙️ Television punditry', hint: 'Fame helps' }, { id: 'quiet', label: '🌅 A quiet life' },
  ] });
}

export const SportClubResolvers = {
  transfer(ctx, data, optionId) {
    const c = clubOf(ctx.state);
    if (!c) return;
    if (optionId === 'go') { Object.assign(c, { name: data.name, tier: data.tier, years: 4, wage: wageFor(ctx.state, data.tier) }); ctx.emit('fame:buzz', { amount: 4 }); return ctx.log(`You signed for ${data.name}. A shirt with your name on it sold out in an hour.`, '✈️', 'milestone'); }
    ctx.emit('fame:buzz', { amount: 1 });
    ctx.log(`You turned down ${data.name} to stay at ${c.name}. The fans sang your name.`, '🏟️', 'good');
  },
  dropped(ctx, data, optionId) {
    const c = clubOf(ctx.state);
    if (!c) return;
    if (optionId === 'loan') { ctx.stat('fitness', 3); return ctx.log('A season on loan: thirty games, eight goals, and your confidence back.', '🔁', 'good'); }
    if (ctx.rng.chance(0.4)) return ctx.log('You won your place back by Christmas.', '💪', 'good');
    c.years = 0;
    ctx.log(`${c.name} told you they won't keep you.`, '🪑', 'warn');
  },
  renew(ctx, data, optionId) {
    const { state, rng } = ctx;
    const c = clubOf(state);
    if (!c) return;
    if (optionId === 'resign') { c.years = 3; return ctx.log(`You re-signed with ${c.name}.`, '✍️', 'good'); }
    if (optionId === 'retire') return retirePrompt(ctx, c, 'You decided to go out on your own terms.');
    const r = rating(state);
    if (rng.chance(clamp(r / 100, 0.15, 0.85))) { const tier = clamp(c.tier + (r >= 75 ? 1 : 0), 0, 3); Object.assign(c, { name: clubName(rng, state.sport.discipline), tier, years: 3, wage: wageFor(state, tier) }); return ctx.log(`A free transfer to ${c.name}, ${TIERS[tier]}.`, '🧳', 'good'); }
    c.tier = Math.max(0, c.tier - 1); c.years = 2; c.wage = wageFor(state, c.tier); c.name = clubName(rng, state.sport.discipline);
    ctx.log(`Nobody big came in. You signed for ${c.name}, ${TIERS[c.tier]}.`, '🧳', 'warn');
  },
  after(ctx, data, optionId) {
    const { state, rng } = ctx;
    const c = clubOf(state);
    if (c) c.retired = true;
    ctx.emit('career:resign', { reason: 'Retired from professional sport' });
    if (optionId === 'coach') {
      const prof = getProfession('athletics');
      hire(ctx, { professionId: 'athletics', levelId: 'assistant', employer: createEmployer(rng, state, prof, state.character.regionId) });
      return ctx.log('You took your coaching badges and joined a club\'s staff as an assistant coach.', '📋', 'milestone');
    }
    if (optionId === 'pundit') {
      const prof = getProfession('contentCreator');
      hire(ctx, { professionId: 'contentCreator', levelId: (state.fame?.score ?? 0) >= 45 ? 'established' : 'fullTime', employer: createEmployer(rng, state, prof, state.character.regionId) });
      return ctx.log('You took a seat in a television studio, explaining the game you used to play.', '🎙️', 'milestone');
    }
    ctx.log('You retired, and for the first time in twenty years, slept in on a Saturday.', '🌅', 'info');
  },
};

export const SportClubsModule = { id: 'sportClubs', order: 31.7, onAgeUp: clubTick, resolvers: SportClubResolvers };
