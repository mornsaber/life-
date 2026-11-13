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
import { activeAthlete, rating, AMATEUR_UNTIL } from './Sport.js';
import { yearNow } from '../world/Eras.js';
import { skinToneOf } from '../people/SkinTone.js';
import { getProfession } from './JobTrees.js';
import { createEmployer } from './Employers.js';
import { hire } from './CareerEngine.js';
import { priceLevel } from '../world/Countries.js';

const PLACES = ['Northbridge', 'Ashford', 'Kingsport', 'Riverside', 'Westvale', 'Portmore', 'Eastham', 'Highcliffe', 'Millbrook', 'Stonebridge'];
const SUFFIX = { football: ['City', 'United', 'Athletic', 'Rovers'], basketball: ['Hawks', 'Kings', 'Storm'], rugby: ['Warriors', 'Saints', 'RFC'], cricket: ['County CC', 'Strikers'], default: ['Athletic Club', 'Track Club', 'Racing'] };
const TIERS = ['a lower-league club', 'a mid-table club', 'a top-flight club', 'one of the biggest clubs in the world'];
const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 77417 + state.character.age * 353 + 0x5c1) >>> 0);
const clubName = (rng, discipline, state = null) => (state && colourLine(state) ? `the ${rng.pick(PLACES)} ${rng.pick(['Monarchs', 'Black Barons', 'Grays', 'Eagles', 'Crawfords'])} of the Negro leagues` : `${rng.pick(PLACES)} ${rng.pick(SUFFIX[discipline] ?? SUFFIX.default)}`);
/**
 * Wages of their day (in today's money): small before television, capped in English football
 * until 1961 (the maximum wage, £20 a week), and only expenses while the sport was amateur.
 */
const eraWage = (state) => { const y = yearNow(state); return y < 1920 ? 0.04 : y < 1960 ? 0.08 : y < 1980 ? 0.25 : y < 1995 ? 0.55 : 1; };
const amateur = (state) => yearNow(state) < (AMATEUR_UNTIL[state.sport?.discipline] ?? 0);
const wageFor = (state, tier) => {
  if (amateur(state)) return Math.round(4000 * priceLevel(state));
  let w = [60000, 250000, 1200000, 6000000][tier] * eraWage(state);
  if ((state.character.countryId ?? 'US') === 'GB' && state.sport?.discipline === 'football' && yearNow(state) < 1961) w = Math.min(w, 40000);
  return Math.round(w * priceLevel(state));
};
/** The reserve clause (US, until free agency in 1976) and retain-and-transfer (England, until 1963): the club owns you. */
const reserved = (state) => { const y = yearNow(state); const cc = state.character.countryId ?? 'US'; return (cc === 'US' && y < 1976) || (cc === 'GB' && y < 1963); };
/** America's colour line in professional sport, until 1946–47: the Negro leagues instead. */
const colourLine = (state) => (state.character.countryId ?? 'US') === 'US' && yearNow(state) < 1947 && skinToneOf(state) >= 4;
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
    s.club = { name: clubName(rng, s.discipline, state), tier: 1, years: 3, wage: wageFor(state, 1) };
    if (colourLine(state)) return main.log(`The major leagues won't sign a Black player. You signed for ${s.club.name}: barnstorming tours, segregated hotels, and some of the best players in the country.`, '✍️', 'milestone');
    if (amateur(state)) return main.log(`You joined ${s.club.name}. The sport is amateur: expenses, and a job at a club member's firm.`, '✍️', 'milestone');
    return main.log(`You signed for ${s.club.name}: three years, ${TIERS[1]}.`, '✍️', 'milestone');
  }
  const c = s.club;
  c.years -= 1;
  main.earn(Math.round(c.wage * 0.15), `${c.name}: appearance and win bonuses`, { wage: true });
  const r = rating(state);
  // The body.
  if (age >= 33 && rng.chance(0.15 + (age - 33) * 0.12)) return retirePrompt(ctx, c, 'Your body is telling you it\'s time.');
  // Transfers.
  if (r >= 75 && c.tier < (colourLine(state) ? 1 : 3) && rng.chance(0.35)) {
    const name = clubName(rng, s.discipline, state);
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
      { id: 'resign', label: '✍️ Re-sign for three years' }, reserved(state) ? { id: 'market', label: '🧳 Test the market', disabled: true, hint: (state.character.countryId ?? 'US') === 'US' ? 'The reserve clause: the club owns your rights (free agency comes in 1976)' : 'Retain-and-transfer: the club holds your registration (until 1963)' } : { id: 'market', label: '🧳 Test the market', hint: r >= 60 ? 'Clubs are interested' : 'A risk' }, { id: 'retire', label: '👋 Retire' },
    ] });
  }
}

function retirePrompt(ctx, c, why) {
  ctx.prompt({ type: 'sportClubs.after', icon: '🎽', title: 'Hanging Up Your Boots', text: `${why} After your years at ${c.name}, what next?`, data: {}, options: [
    { id: 'coach', label: '📋 Coaching badges and a coaching job' }, yearNow(ctx.state) >= 1950 ? { id: 'pundit', label: '🎙️ Television punditry', hint: 'Fame helps' } : { id: 'pundit', label: '📰 A column in the sporting papers' }, yearNow(ctx.state) < 1960 ? { id: 'pub', label: '🍺 Take on a pub', hint: 'What retired players did' } : null, { id: 'quiet', label: '🌅 A quiet life' },
  ].filter(Boolean).concat([
  ]) });
}

export const SportClubResolvers = {
  transfer(ctx, data, optionId) {
    const c = clubOf(ctx.state);
    if (!c) return;
    if (optionId === 'go') { Object.assign(c, { name: data.name, tier: data.tier, years: 4, wage: wageFor(ctx.state, data.tier) }); ctx.emit('fame:buzz', { amount: 4 }); return ctx.log(`You signed for ${data.name}. ${yearNow(ctx.state) >= 1975 ? 'A shirt with your name on it sold out in an hour.' : 'The papers called it the transfer of the season.'}`, '✈️', 'milestone'); }
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
    if (rng.chance(clamp(r / 100, 0.15, 0.85))) { const tier = clamp(c.tier + (r >= 75 ? 1 : 0), 0, colourLine(state) ? 1 : 3); Object.assign(c, { name: clubName(rng, state.sport.discipline, state), tier, years: 3, wage: wageFor(state, tier) }); return ctx.log(`A free transfer to ${c.name}, ${TIERS[tier]}.`, '🧳', 'good'); }
    c.tier = Math.max(0, c.tier - 1); c.years = 2; c.wage = wageFor(state, c.tier); c.name = clubName(rng, state.sport.discipline, state);
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
    if (optionId === 'pub') { ctx.spend(Math.round(15000 * priceLevel(state)), 'The pub', { allowDebt: true }); return ctx.log('You took on a pub near the ground. Fans came in for a pint and a word with you for twenty years.', '🍺', 'milestone'); }
    if (optionId === 'pundit' && yearNow(state) < 1950) { ctx.earn(Math.round(3000 * priceLevel(state)), 'Newspaper column'); return ctx.log('You wrote a column for the sporting papers, a few hundred words on Saturday\'s match.', '📰', 'info'); }
    if (optionId === 'pundit') {
      const prof = getProfession('contentCreator');
      hire(ctx, { professionId: 'contentCreator', levelId: (state.fame?.score ?? 0) >= 45 ? 'established' : 'fullTime', employer: createEmployer(rng, state, prof, state.character.regionId) });
      return ctx.log('You took a seat in a television studio, explaining the game you used to play.', '🎙️', 'milestone');
    }
    ctx.log('You retired, and for the first time in twenty years, slept in on a Saturday.', '🌅', 'info');
  },
};

export const SportClubsModule = { id: 'sportClubs', order: 31.7, onAgeUp: clubTick, resolvers: SportClubResolvers };
