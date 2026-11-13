/**
 * Leisure of its day: what people did with an evening or a week off, from the coffee house to
 * the discotheque.
 *
 *   Evenings     the theatre (always); the music hall and vaudeville (1850–1960); the picture
 *                house (from 1910, talkies 1927); the dance hall (1920–70); the saloon, the
 *                speakeasy under Prohibition (America 1920–33, raids and all), the pub; the
 *                drive-in (America 1933–85); bingo (Britain from 1961); the discotheque
 *                (1965–90); the video arcade (1975–95); a night in front of the television
 *                (from 1950).
 *   Days out     the football terraces (from 1880); a railway excursion to the seaside (from
 *                1845); the fairground.
 *   Holidays     the holiday camp (Britain, Butlin's 1936–1985); a package holiday in the sun
 *                (from 1955, for northern Europeans); a road trip (America, from 1925).
 *
 * Once a year each. Each has a cost and an effect; a few have a risk.
 */
import { yearNow } from '../world/Eras.js';
import { priceLevel } from '../world/Countries.js';
import { prohibitionHere } from '../legal/LawOfTheDay.js';

const cc = (state) => state.character.countryId ?? 'US';
const NORTH_EUROPE = ['GB', 'IE', 'DE', 'NL', 'BE', 'DK', 'SE', 'NO', 'FI'];

/** id: { label, icon, from, until, where?, minAge, cost, stats, text, risk? } */
export const LEISURE = {
  coffeeHouse: { label: 'An evening at the coffee house', icon: '☕', from: 1800, until: 1860, minAge: 16, cost: 5, stats: { smarts: 2, happiness: 2 }, text: 'Newspapers on poles, pipe smoke, and arguments about Reform.' },
  theatre: { label: 'A night at the theatre', icon: '🎭', from: 1800, until: 9999, minAge: 8, cost: 60, stats: { happiness: 4, smarts: 1 }, text: (y) => (y < 1900 ? 'Melodrama in the gods: villains hissed, heroines cheered.' : 'A play in a red-velvet theatre.') },
  musicHall: { label: 'The music hall', icon: '🎩', from: 1850, until: 1960, minAge: 10, cost: 10, stats: { happiness: 5 }, text: (y, s) => (cc(s) === 'US' ? 'A vaudeville bill: jugglers, a comic, a singer, a dog act.' : 'A night at the music hall: a comic, a lion comique, and everyone singing the chorus.') },
  pictures: { label: 'The pictures', icon: '🎞️', from: 1910, until: 9999, minAge: 6, cost: 12, stats: { happiness: 4 }, text: (y) => (y < 1927 ? 'A silent picture, the pianist racing the chase scene.' : y < 1960 ? 'The picture palace: the newsreel, the B-picture and the main feature, all for a shilling.' : 'A film at the cinema.') },
  danceHall: { label: 'The dance hall', icon: '💃', from: 1920, until: 1970, minAge: 15, cost: 8, stats: { happiness: 6, fitness: 1 }, text: (y) => (y < 1940 ? 'The foxtrot and the Charleston at the Palais.' : 'A big band, a glitterball, and someone who asked you to dance.') },
  speakeasy: { label: 'A speakeasy', icon: '🥃', from: 1920, until: 1933, where: (s) => prohibitionHere(s), minAge: 18, cost: 30, stats: { happiness: 7 }, text: 'A password at an unmarked door, bathtub gin, and jazz.', risk: [0.15, 'The police raided the speakeasy. You went out the back way, minus your hat.', { stress: 4 }] },
  driveIn: { label: 'The drive-in', icon: '🚗', from: 1933, until: 1985, where: (s) => cc(s) === 'US', minAge: 14, cost: 10, stats: { happiness: 5 }, text: 'A double feature through the windscreen, the speaker hooked on the window.' },
  television: { label: 'A night in front of the television', icon: '📺', from: 1950, until: 9999, minAge: 4, cost: 0, stats: { happiness: 2, stress: -3 }, text: (y) => (y < 1970 ? 'The whole family round a small grey screen.' : 'A night in with the television.') },
  bingo: { label: 'Bingo', icon: '🎱', from: 1961, until: 9999, where: (s) => ['GB', 'IE'].includes(cc(s)), minAge: 18, cost: 15, stats: { happiness: 4 }, text: '"Two fat ladies, eighty-eight!" A full house, nearly.' },
  disco: { label: 'The discotheque', icon: '🪩', from: 1965, until: 1990, minAge: 16, cost: 25, stats: { happiness: 7, fitness: 1 }, text: 'A dancefloor lit from beneath, and a song you will hear for the rest of your life.' },
  arcade: { label: 'The video arcade', icon: '🕹️', from: 1975, until: 1995, minAge: 8, cost: 10, stats: { happiness: 4 }, text: 'A pocketful of coins and your initials on the high-score table.' },
  terraces: { label: 'The match, from the terraces', icon: '⚽', from: 1880, until: 9999, minAge: 8, cost: 20, stats: { happiness: 5 }, text: (y) => (y < 1990 ? 'Standing on the terraces in the crush, swaying with ten thousand others.' : 'The match: all-seater now, the singing still there.') },
  seaside: { label: 'A day at the seaside', icon: '🏖️', from: 1845, until: 9999, minAge: 4, cost: 40, stats: { happiness: 6, stress: -4 }, text: (y) => (y < 1950 ? 'A railway excursion to the sea: donkeys, a pier, fish and chips in paper.' : 'A day at the beach.') },
  holidayCamp: { label: 'A week at a holiday camp', icon: '🎡', from: 1936, until: 1985, where: (s) => cc(s) === 'GB', minAge: 4, cost: 300, stats: { happiness: 8, stress: -6 }, text: 'A chalet, the Redcoats, knobbly-knees contests and a talent show.' },
  package: { label: 'A package holiday in the sun', icon: '✈️', from: 1955, until: 9999, where: (s) => NORTH_EUROPE.includes(cc(s)), minAge: 2, cost: 900, stats: { happiness: 9, stress: -8 }, text: (y) => (y < 1975 ? 'A fortnight on the Costa Brava: sunburn, sangria, and a plane trip like a film star.' : 'A week of sun, a pool and a paperback.') },
  roadTrip: { label: 'A road trip', icon: '🛣️', from: 1925, until: 9999, where: (s) => ['US', 'CA', 'AU'].includes(cc(s)), minAge: 4, cost: 600, stats: { happiness: 8, stress: -6 }, text: (y) => (y < 1960 ? 'Route 66 in the family car: motor courts and diners.' : 'A road trip: motels, diners and a lot of sky.') },
};

export function leisureNow(state) {
  const y = yearNow(state);
  return Object.entries(LEISURE).filter(([, l]) => y >= l.from && y < l.until && (!l.where || l.where(state))).map(([id, l]) => ({ id, ...l }));
}
export const leisureCost = (state, l) => Math.round(l.cost * priceLevel(state));

function go(ctx, id) {
  const { state, rng } = ctx;
  const l = leisureNow(state).find((x) => x.id === id);
  if (!l) return ctx.toast('Not in this day', 'warn');
  if (state.character.age < l.minAge) return ctx.toast(`Age ${l.minAge}+`, 'warn');
  if (state.yearly[`leisure.${id}`]) return ctx.toast('Once a year', 'warn');
  state.yearly[`leisure.${id}`] = 1;
  if (l.cost) ctx.spend(leisureCost(state, l), l.label, { allowDebt: false });
  for (const [k, v] of Object.entries(l.stats)) ctx.stat(k, v);
  ctx.log(typeof l.text === 'function' ? l.text(yearNow(state), state) : l.text, l.icon, 'good');
  if (l.risk && rng.chance(l.risk[0])) { for (const [k, v] of Object.entries(l.risk[2] ?? {})) ctx.stat(k, v); ctx.log(l.risk[1], '🚓', 'warn'); }
}

/** The six everyday activities, in the words of the day. */
export function activityLabel(state, a) {
  const y = yearNow(state);
  if (a.id === 'gym' && y < 1950) return y < 1880 ? 'Take a constitutional walk' : 'Physical culture at the gymnasium';
  if (a.id === 'meditate' && y < 1965) return 'Quiet prayer and reflection';
  if (a.id === 'salon' && y < 1950) return y < 1900 ? 'The barber and the bathhouse' : 'The hairdresser';
  if (a.id === 'library' && y < 1850) return 'The circulating library';
  return a.label;
}

export const LeisureModule = { id: 'leisure', order: 13.5, actions: { go } };
