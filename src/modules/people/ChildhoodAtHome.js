/**
 * Childhood at home, as it was in its day (school: education/SchoolDays.js; choices and scrapes:
 * content/packs/life-childhood.js). Small moments, each once a life, by year and place:
 *
 *   Chores     water from the pump, coal up from the cellar, Monday washday with the mangle;
 *              the tin bath in front of the fire on a Friday; the privy at the end of the yard.
 *   Wartime    the blackout, collecting shrapnel, sweets on the ration (Britain, until 1953),
 *              the telegram boy in the street.
 *   Fear       the polio summers (America and Europe, 1916–1955): the swimming baths closed, a
 *              classmate in an iron lung; then the Salk vaccine in a sugar lump or a jab.
 *   Wonder     the wireless serial after tea; Saturday morning pictures; the street crowded round
 *              one television for the Coronation (1953) or the Moon landing (1969).
 *
 * state.childhoodHome = { seen: {...} }
 */
import { Random } from '../../core/Random.js';
import { yearNow, PRESENT } from '../world/Eras.js';
import { demographyAt } from '../world/HistoricalData.js';

const cc = (state) => state.character.countryId ?? 'US';
const sideRng = (state) => new Random((((state.world?.seed ?? 1) * 6113) ^ (state.character.age * 409 + 0x3a7)) >>> 0);
const EUROPE_US = ['GB', 'IE', 'US', 'CA', 'AU', 'NZ', 'FR', 'DE', 'AT', 'NL', 'BE', 'SE', 'NO', 'DK', 'FI', 'IT', 'CH'];
const ANGLO = ['GB', 'IE', 'AU', 'NZ', 'CA'];
const poorish = (state) => state.people?.wealth !== 'upper';
const atWar = (state) => Object.keys(state.world?.wars ?? {}).includes(cc(state));

/** [id, from age, to age, when(state, y, c), text, icon, stats] */
export const MOMENTS = [
  ['pump', 5, 12, (s, y, c) => y < 1920 && poorish(s), 'Your job is the water: two buckets from the pump at the end of the street before school, and two after.', '🪣', { health: 1 }],
  ['coal', 6, 13, (s, y, c) => y < 1960 && ANGLO.concat(['US', 'DE', 'FR', 'BE', 'NL']).includes(c) && poorish(s), 'Every evening you carry the coal scuttle up from the cellar and lay the fire for the morning.', '🪨', {}],
  ['washday', 6, 12, (s, y, c) => y < 1960 && poorish(s), 'Monday is washday: the copper boiling since dawn, and you turn the mangle until your arms ache.', '🧺', {}],
  ['tinbath', 3, 9, (s, y, c) => y < 1960 && ANGLO.includes(c) && poorish(s), 'Friday night is bath night: the tin bath in front of the fire, youngest first, the same water for everyone.', '🛁', { happiness: 1 }],
  ['privy', 4, 10, (s, y, c) => y < 1955 && poorish(s) && EUROPE_US.includes(c), 'The toilet is a privy at the end of the yard, with squares of newspaper on a nail. You don\'t go at night.', '🚽', {}],
  ['blackout', 5, 15, (s, y, c) => atWar(s) && y >= 1939 && y <= 1945 && ['GB', 'DE', 'FR', 'NL', 'BE', 'IT', 'JP'].includes(c), 'Blackout every night: thick curtains, no street lamps, and the warden shouting "Put that light out!"', '🌑', { stress: 2 }],
  ['shrapnel', 7, 14, (s, y, c) => y >= 1940 && y <= 1944 && ['GB', 'DE'].includes(c), 'The morning after a raid, you and your friends hunt the streets for shrapnel. The jagged piece you found is the best in the class.', '💥', { happiness: 1 }],
  ['sweets', 4, 12, (s, y, c) => c === 'GB' && y >= 1942 && y <= 1953, 'Sweets are on the ration: twelve ounces a month, chosen with great care at the corner shop.', '🍬', {}],
  ['sweetsEnd', 4, 15, (s, y, c) => c === 'GB' && y === 1953, 'Sweets came off the ration in February. The queue at the sweet shop went round the corner, and you spent everything you had.', '🍭', { happiness: 3 }],
  ['telegram', 6, 15, (s, y, c) => atWar(s) && y < 1950, 'The telegram boy came down your street today. Every mother watched to see which door he stopped at.', '✉️', { stress: 3 }],
  ['polio', 4, 13, (s, y, c) => y >= 1916 && y <= 1955 && EUROPE_US.includes(c), 'A polio summer: the swimming baths are shut, you\'re kept away from crowds, and a boy from your class is in an iron lung.', '🫁', { stress: 3 }],
  ['salk', 5, 14, (s, y, c) => y >= 1955 && y <= 1962 && EUROPE_US.includes(c), 'The polio vaccine arrived: the whole school lined up for it, and your mother cried with relief.', '💉', { happiness: 2 }],
  ['wireless', 6, 14, (s, y, c) => y >= 1925 && y < 1955 && EUROPE_US.includes(c), 'After tea the family gathers round the wireless for the serial; you aren\'t allowed to talk until it\'s over.', '📻', { happiness: 2 }],
  ['matinee', 7, 13, (s, y, c) => y >= 1925 && y < 1965 && EUROPE_US.concat(['IN', 'JP', 'AR', 'BR', 'MX']).includes(c), 'Saturday morning pictures: a few coins, a cowboy serial, a cartoon, and three hundred children shouting at the screen.', '🎞️', { happiness: 2 }],
  ['coronation', 3, 15, (s, y, c) => y === 1953 && ['GB', 'AU', 'NZ', 'CA'].includes(c), 'The Coronation: the whole street crowded into the one front room with a television to watch it, in grey and white, and then a party with trestle tables in the road.', '👑', { happiness: 3 }],
  ['moon', 4, 16, (s, y, c) => y === 1969 && (demographyAt(c, y)?.gdp ?? 0) > 4000, 'You were let up in the middle of the night to watch a man step onto the Moon, on a flickering television.', '🌕', { happiness: 3, smarts: 1 }],
  ['sundayschool', 5, 11, (s, y, c) => y < 1965 && ANGLO.concat(['US']).includes(c), 'Sunday school every week in your best clothes: a text to learn by heart and a picture stamp when you do.', '⛪', {}],
  ['games', 5, 11, (s, y, c) => y < 1975, 'Out in the street until dark: hopscotch, marbles, skipping ropes, kick-the-can, and your name called from a doorway at bedtime.', '🪀', { happiness: 2, fitness: 1 }],
  ['handmedowns', 4, 12, (s, y, c) => y < 1970 && poorish(s), 'Everything you wear was your older cousin\'s first, darned at the elbows and taken up at the hem.', '🧥', {}],
];

export const ChildhoodAtHomeModule = {
  id: 'childhoodHome',
  order: 9.3,
  onAgeUp(ctx) {
    const { state } = ctx;
    const age = state.character.age;
    const y = yearNow(state);
    if (!state.era || y >= PRESENT || age < 3 || age > 16) return;
    const rng = sideRng(state);
    const c = cc(state);
    const seen = ((state.childhoodHome ??= { seen: {} }).seen);
    const fits = MOMENTS.filter(([id, a, b, when]) => !seen[id] && age >= a && age <= b && when(state, y, c));
    // Datable moments (one year only) always come; others now and then.
    const dated = fits.filter(([id]) => ['sweetsEnd', 'coronation', 'moon', 'salk'].includes(id));
    const pick = dated[0] ?? (fits.length && rng.chance(0.45) ? rng.pick(fits) : null);
    if (!pick) return;
    const [id, , , , text, icon, stats] = pick;
    seen[id] = y;
    ctx.log(text, icon, 'info');
    for (const [k, v] of Object.entries(stats)) ctx.stat(k, v);
  },
};
