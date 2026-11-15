/**
 * The economy of the era: how far money went. Amounts in the game are in today's dollars; a
 * life lived in 1850 earns, spends and saves far fewer of them, because the world was poorer.
 * Each kind of money follows how rich the place was (GDP per head against today, from
 * HistoricalData) by its own elasticity, the same curve MoneyOfTheDay's price basket uses:
 *
 *   wage    a year's pay (0.55: a US wage in 1850 about a fifth of today's, in 1950 a half)
 *   living  everyday costs, services, fines, fees (0.5)
 *   house   a house (0.85: far cheaper then, though not against a wage)
 *   rent    a month's rent (0.7)
 *
 * Today (2018 on) everything is 1, so present-day lives and their tests are unchanged.
 */
import { yearNow } from '../world/Eras.js';
import { demographyAt } from '../world/HistoricalData.js';

export const ERA_ELASTICITY = { wage: 0.55, living: 0.5, house: 0.85, rent: 0.7 };
const BASE_YEAR = 2018;

/** GDP per head now against BASE_YEAR, for this place (1 today, about 0.05 for the US in 1850). */
export function eraRichness(state, country = state?.character?.countryId ?? 'US') {
  if (!state?.character) return 1;
  const y = yearNow(state);
  if (y >= BASE_YEAR) return 1;
  const then = demographyAt(country, y)?.gdp;
  const now = demographyAt(country, BASE_YEAR)?.gdp;
  if (!then || !now) return 1;
  return Math.min(1, Math.max(0.02, then / now));
}

/** How far this kind of money was scaled in this life's year and place. */
export function eraScale(state, kind = 'living') {
  const r = eraRichness(state);
  return r >= 1 ? 1 : r ** (ERA_ELASTICITY[kind] ?? 0.5);
}
