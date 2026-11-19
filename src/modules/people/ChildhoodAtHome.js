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
  ['washday', 6, 12, (s, y, c) => EUROPE_US.includes(c) && y < 1960 && poorish(s), 'Monday is washday: the copper boiling since dawn, and you turn the mangle until your arms ache.', '🧺', {}],
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
  // India.
  ['jointFamily', 4, 12, (s, y, c) => c === 'IN' && y < 2000, 'Three generations under one roof: your grandmother rules the kitchen, your uncles\' children are your brothers and sisters, and nobody is ever alone.', '🏠', { happiness: 2 }],
  ['monsoon', 5, 13, (s, y, c) => ['IN', 'BD', 'PK', 'LK', 'MM'].includes(c), 'The monsoon broke: the whole street out in the first rain, paper boats in the gutters, and the smell of wet earth.', '🌧️', { happiness: 2 }],
  ['partition', 3, 16, (s, y, c) => ['IN', 'PK', 'BD'].includes(c) && y === 1947, 'Partition: trains came in full of the dead, and families you knew left in the night for the other side of the new border.', '🚂', { stress: 6, happiness: -4 }],
  ['villageSchool', 6, 11, (s, y, c) => ['IN', 'BD', 'PK', 'NG', 'KE', 'GH', 'ET', 'TZ', 'UG'].includes(c) && y < 1990, 'School is under a tree at the edge of the village: slates, chanting the tables, and the teacher\'s cane for the slow.', '🌳', {}],
  // Japan.
  ['ofuro', 3, 10, (s, y, c) => c === 'JP' && y < 1970, 'Every evening to the sentō, the public bath, with your father: a wooden bucket, very hot water and the neighbours.', '♨️', { happiness: 1 }],
  ['jpWar', 6, 15, (s, y, c) => c === 'JP' && y >= 1944 && y <= 1945, 'Your class was evacuated to a temple in the countryside: sweet potato for every meal, and the sky red over the city at night.', '🔥', { stress: 6, health: -2 }],
  ['randoseru', 6, 6, (s, y, c) => c === 'JP' && y >= 1955, 'Your first day of school with a stiff new randoseru on your back, the whole family photographing you at the gate.', '🎒', { happiness: 2 }],
  // China.
  ['hukou', 5, 12, (s, y, c) => c === 'CN' && y >= 1958 && y < 1962, 'The Great Leap Forward: the family\'s pots went to the backyard furnace, and then the hunger came. You ate bark soup and grass.', '🍚', { health: -5, stress: 6 }],
  ['redGuards', 12, 16, (s, y, c) => c === 'CN' && y >= 1966 && y <= 1968, 'The schools have closed for the revolution. Older children in red armbands parade a teacher through the street in a dunce\'s cap.', '📕', { stress: 5 }],
  ['sentDown', 16, 16, (s, y, c) => c === 'CN' && y >= 1968 && y <= 1976, 'Sent down to the countryside to learn from the peasants: a commune far from home, and no idea when you will see your parents again.', '🌾', { happiness: -5, fitness: 2 }],
  // The Soviet bloc.
  ['queue', 5, 13, (s, y, c) => ['RU', 'PL', 'CZ', 'HU', 'RO', 'BG', 'UA', 'BY', 'DD'].includes(c) && y >= 1950 && y < 1990, 'Your mother sends you to stand in the queue whenever something appears in the shops. Oranges at New Year are a triumph.', '🍊', {}],
  ['dacha', 6, 14, (s, y, c) => ['RU', 'UA', 'BY'].includes(c) && y >= 1955 && y < 2000, 'Summers at the dacha: potatoes to dig, mosquitoes, and your grandmother\'s jam on the stove.', '🏡', { happiness: 2, fitness: 1 }],
  ['siege', 3, 15, (s, y, c) => c === 'RU' && y >= 1941 && y <= 1943 && s.character.regionId && /petersburg|leningrad/i.test(String(s.character.regionId)), 'The siege: 125 grams of bread a day, the furniture burned for warmth, and the sleds of the dead in the street.', '🥶', { health: -8, stress: 8 }],
  // Latin America.
  ['futbolStreet', 6, 13, (s, y, c) => ['BR', 'AR', 'UY', 'MX', 'CO', 'CL', 'PE'].includes(c), 'Football in the street until dark with a ball made of rags and string, the goals two stones apart.', '⚽', { happiness: 2, fitness: 2 }],
  ['firstCommunionLA', 7, 9, (s, y, c) => ['MX', 'BR', 'AR', 'CO', 'PE', 'CL', 'PH'].includes(c), 'Your First Communion: white clothes, a candle, a photograph in the studio, and a feast with all your godparents.', '🕯️', { happiness: 2 }],
  ['worldCup70', 6, 16, (s, y, c) => c === 'BR' && y === 1970, 'Brazil won the World Cup in Mexico. The whole street watched Pelé on one television and danced until morning.', '🏆', { happiness: 4 }],
  // Africa.
  ['independenceDay', 4, 16, (s, y, c) => ({ GH: 1957, NG: 1960, KE: 1963, TZ: 1961, UG: 1962, SN: 1960, CI: 1960, ZM: 1964 })[c] === y, 'Independence Day: the new flag went up at midnight, your parents cried, and you were given a little flag and a sweet at school.', '🎉', { happiness: 4 }],
  ['waterWalk', 5, 12, (s, y, c) => ['NG', 'KE', 'ET', 'TZ', 'UG', 'GH', 'SN', 'ML', 'NE'].includes(c) && y < 2000 && poorish(s), 'Before school, the walk to the borehole with a jerrycan on your head, and back again before the sun is high.', '🪣', { fitness: 2 }],
  ['tales', 4, 9, (s, y, c) => ['NG', 'GH', 'KE', 'SN', 'CI', 'ZA'].includes(c), 'In the evenings your grandmother tells stories of the tortoise and the hare by the light of the fire.', '🔥', { happiness: 2, smarts: 1 }],
  ['handmedowns', 4, 12, (s, y, c) => EUROPE_US.includes(c) && y < 1970 && poorish(s), 'Everything you wear was your older cousin\'s first, darned at the elbows and taken up at the hem.', '🧥', {}],
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
    const dated = fits.filter(([id]) => ['sweetsEnd', 'coronation', 'moon', 'salk', 'partition', 'independenceDay', 'worldCup70'].includes(id));
    const pick = dated[0] ?? (fits.length && rng.chance(0.45) ? rng.pick(fits) : null);
    if (!pick) return;
    const [id, , , , text, icon, stats] = pick;
    seen[id] = y;
    ctx.log(text, icon, 'info');
    for (const [k, v] of Object.entries(stats)) ctx.stat(k, v);
  },
};
