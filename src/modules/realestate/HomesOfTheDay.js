/**
 * Homes of their day: what a house was called and what happened to the street it stood on.
 *
 *   Names        a starter home is a back-to-back in 1890s Leeds, a bungalow in 1920s Chicago, a
 *                ranch house in 1960s Phoenix, a state-allocated flat in 1970s Kiev.
 *   Clearance    from the 1930s to the 1970s whole streets of old rented housing were condemned:
 *                the tenants went to new estates and housing projects, glad or not.
 *   Gentrifying  from the 1990s, rented rooms in a big city get dearer as the neighbourhood turns.
 *   Servants     a well-off household before the Second World War kept a maid and a cook.
 *
 * Its own random stream, so the rest of the year rolls as it always did.
 */
import { Random } from '../../core/Random.js';
import { yearNow, PRESENT, setRentNames } from '../world/Eras.js';
import { REGIONS } from '../life/Regions.js';

const cc = (state) => state.character?.countryId ?? 'US';
const BRIT = ['GB', 'IE', 'AU', 'NZ', 'CA', 'ZA'];
const BLOC = ['RU', 'UA', 'BY', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'AL', 'EE', 'LV', 'LT', 'MD', 'GE', 'AM', 'AZ', 'KZ', 'KG', 'TJ', 'TM', 'UZ', 'RS', 'HR', 'SI', 'BA', 'ME', 'MK', 'MN', 'CN', 'VN', 'KP', 'CU'];
const blocYears = (c, y) => (['RU', 'UA', 'BY', 'MD', 'GE', 'AM', 'AZ', 'KZ', 'KG', 'TJ', 'TM', 'UZ', 'EE', 'LV', 'LT'].includes(c) ? y >= 1930 && y < 1992 : y >= 1950 && y < 1990);

/** A kind of home by its name in the year and place you live. */
export function periodHomeName(state, type, name) {
  const y = yearNow(state);
  if (!state?.era || y >= PRESENT - 15) return name;
  const c = cc(state);
  if (BLOC.includes(c) && blocYears(c, y) && ['condo', 'starter', 'townhouse', 'family'].includes(type)) return y < 1960 ? 'Room in a communal flat' : type === 'family' ? 'Co-operative flat' : 'State flat (khrushchyovka)';
  if (BRIT.includes(c)) {
    if (type === 'starter') return y < 1900 ? 'Back-to-back terrace' : y < 1945 ? 'Two-up two-down terrace' : 'Terraced house';
    if (type === 'family') return y < 1914 ? 'Victorian villa' : 'Semi-detached house';
    if (type === 'townhouse') return y < 1914 ? 'Town house' : name;
    if (type === 'mansion') return y < 1945 ? 'Country house and estate' : 'Stately home';
    if (type === 'rural') return 'Farmhouse and land';
    if (type === 'fixer') return 'Tumbledown cottage';
    if (type === 'condo') return 'Flat';
  }
  if (c === 'US') {
    if (type === 'starter') return y < 1910 ? 'Workers\' cottage' : y < 1945 ? 'Bungalow' : y < 1975 ? 'Ranch house' : name;
    if (type === 'family') return y < 1915 ? 'Victorian house' : y < 1945 ? 'Craftsman house' : y < 1975 ? 'Split-level' : name;
    if (type === 'townhouse') return y < 1950 ? 'Brownstone row house' : name;
    if (type === 'mansion') return y < 1930 ? 'Gilded Age mansion' : name;
    if (type === 'rural') return 'Farmstead';
  }
  if (['FR', 'BE', 'LU', 'CH', 'IT', 'ES', 'PT', 'DE', 'AT', 'NL'].includes(c)) {
    if (type === 'condo' || type === 'starter') return y < 1950 ? 'Rooms in a tenement building' : 'Apartment';
    if (type === 'mansion') return y < 1945 ? 'Château and estate' : name;
    if (type === 'rural') return 'Farmhouse and land';
  }
  return name;
}
/** Rented homes by their names in the year and place. */
export function periodRentNameHere(state, id, name) {
  const y = yearNow(state);
  if (!state?.era || y >= PRESENT - 15) return name;
  const c = cc(state);
  if (BLOC.includes(c) && blocYears(c, y)) return { roommates: 'A bed in a workers\' hostel', apartment: 'A state flat, allocated by your workplace', house: 'A room in a communal flat', subsidized: 'A state flat' }[id] ?? name;
  if (id === 'subsidized' && BRIT.includes(c)) return y < 1919 ? 'Model dwellings (a charity\'s flat)' : 'A council house';
  if (id === 'subsidized' && c !== 'US') return y < 1945 ? 'A charity\'s model dwelling' : 'Social housing';
  return null;
}

setRentNames(periodRentNameHere);

const hrng = (state) => {
  state.homesDay ??= {};
  state.homesDay.seed = ((state.homesDay.seed ?? (((state.world?.seed ?? 5) * 2246822519) >>> 0)) * 1664525 + 1013904223) >>> 0;
  return new Random(state.homesDay.seed);
};

export const HomesOfTheDayModule = {
  id: 'homesDay',
  order: 31.5,
  init(state) { state.homesDay ??= {}; },
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.era || !state.housing || state.character.age < 18) return;
    const y = yearNow(state);
    if (y >= PRESENT) return;
    const rng = hrng(state);
    const hd = state.homesDay;
    const rental = state.housing.rental;
    const region = REGIONS[state.character.regionId];
    const city = region && region.type !== 'Rural';
    // Slum clearance: the old rented streets come down.
    if (rental && ['roommates', 'apartment'].includes(rental.tier) && city && y >= 1930 && y < 1976 && !hd.cleared && rng.chance(0.03)) {
      hd.cleared = y;
      const estate = BRIT.includes(cc(state)) ? 'a new council estate' : cc(state) === 'US' ? 'a new housing project' : 'a new estate on the edge of town';
      ctx.log(`Your street was condemned as a slum and pulled down. You were rehoused in ${estate}: an indoor bathroom at last, and none of your old neighbours.`, '🏗️', 'warn');
      ctx.stat('happiness', rng.chance(0.5) ? 3 : -3);
      ctx.stat('health', 2);
    }
    // Gentrification: a big city's old quarter turns, and the rent goes with it.
    if (rental && city && region.size !== 'small' && y >= 1990 && !hd.gentrified && rng.chance(0.04)) {
      hd.gentrified = y;
      rental.rent = Math.round((rental.rent ?? 0) * 1.12);
      ctx.log('Your neighbourhood is turning: coffee bars where the laundrette was, and your landlord raised the rent 12%.', '☕', 'warn');
    }
    // A well-off household kept servants before the war.
    if (state.people?.wealth === 'upper' && state.housing.properties.some((p) => p.use === 'primary') && y < 1940) {
      const cost = Math.round((state.finances.lastYear?.gross ?? 40000) * 0.04);
      if (cost > 0) ctx.spend(cost, 'Servants\' wages (a maid and a cook)', { allowDebt: true });
      if (!hd.servants) { hd.servants = y; ctx.log('You keep a maid and a cook, as a household like yours does.', '🧹', 'info'); }
      ctx.stat('stress', -1);
    }
  },
};
