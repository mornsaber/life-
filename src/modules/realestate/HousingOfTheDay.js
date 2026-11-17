/**
 * Renting and buying in their day (names of homes and slum clearance: HomesOfTheDay.js).
 *
 *   Lodgers      a room in someone's house, board included, was how most single people lived
 *                before the 1960s; and a householder who took one in had a little rent coming in.
 *   Rent control Britain's Rent Acts (rents frozen from 1915, decontrolled 1957, "fair rents" and
 *                protected tenancies 1965–88), New York's rent control (1943), France's 1948 law,
 *                Germany's tenant protection: a controlled rent can't be put up (in real terms it
 *                falls), and the tenant can't easily be put out.
 *   New towns    Britain, 1946–75: families on the council list offered a house in Stevenage,
 *                Harlow, Crawley, Basildon, later Milton Keynes.
 *   Mortgages    in America after the war a conventional loan wanted 20% down; the 5% loan came
 *                with mortgage insurance from the 1980s.
 */
import { Random } from '../../core/Random.js';
import { yearNow, PRESENT } from '../world/Eras.js';
import { RENT_CONTROL } from './HousingEngine.js';
import { REGIONS } from '../life/Regions.js';

const cc = (state) => state.character.countryId ?? 'US';
const sideRng = (state) => new Random((((state.world?.seed ?? 1) * 4409) ^ (state.character.age * 263 + 0x77d)) >>> 0);
const BRIT = ['GB', 'IE'];

/** Is a private tenancy here protected by rent control this year? */
export function rentControlled(state) {
  const y = yearNow(state);
  if (y >= PRESENT) return false;
  const c = cc(state);
  if (c === 'GB' || c === 'IE') return (y >= 1915 && y < 1957) || (c === 'GB' && y >= 1965 && y < 1989);
  if (c === 'FR') return y >= 1948 && y < 1986;
  if (c === 'DE') return y >= 1917 && y < 1960;
  if (c === 'US') return y >= 1943 && /new york/i.test(REGIONS[state.character.regionId]?.name ?? '');
  return false;
}
RENT_CONTROL.fn = (state, rental, renewed) => {
  if (!rentControlled(state) || !rental || rental.posted) return renewed;
  // Frozen in money terms: in real terms (the game's money) a controlled rent falls a little each year.
  return Math.min(renewed, Math.round(rental.rent * 0.98));
};

export const NEW_TOWNS = [['Stevenage', 1946], ['Harlow', 1947], ['Crawley', 1947], ['Basildon', 1949], ['Corby', 1950], ['Skelmersdale', 1961], ['Runcorn', 1964], ['Redditch', 1964], ['Milton Keynes', 1967], ['Telford', 1968]];

export const HousingOfTheDayModule = {
  id: 'housingDay',
  order: 31.6,
  onAgeUp(ctx) {
    const { state } = ctx;
    const h = state.housing;
    if (!h || state.character.age < 18) return;
    const y = yearNow(state);
    const rng = sideRng(state);
    const d = (state.housingDay ??= {});
    // Rent control: said once, when it first protects you.
    if (h.rental && !h.rental.posted && rentControlled(state) && !d.controlNoted) {
      d.controlNoted = y;
      ctx.log(cc(state) === 'US' ? 'Your apartment is rent-controlled: the landlord can\'t raise the rent beyond the city\'s allowance.' : BRIT.includes(cc(state)) ? 'Your tenancy is protected by the Rent Acts: the landlord can\'t put the rent up, or easily put you out.' : 'Your lease is protected by the rent laws: the rent is fixed, and you can\'t easily be put out.', '📜', 'info');
    }
    // A lodger's rent.
    if (d.lodger) {
      const owns = h.properties.some((p) => p.use === 'primary');
      if (!owns && !(h.rental && h.rental.tier === 'house')) { d.lodger = null; ctx.log('With no spare room any more, your lodger found other digs.', '🧳', 'info'); }
      else {
        ctx.earn(d.lodger.rent, `Rent from your lodger, ${d.lodger.name}`);
        ctx.stat('stress', 1);
        if (rng.chance(0.15)) { ctx.log(rng.pick([`${d.lodger.name} left owing two weeks' rent and a suitcase.`, `${d.lodger.name} got married and moved out, with a wedding cake for the household.`, `${d.lodger.name} took a job in another town.`]), '🧳', 'info'); d.lodger = null; }
      }
    }
    // Britain's new towns: the council offers a house.
    if (BRIT.includes(cc(state)) && cc(state) === 'GB' && y >= 1946 && y < 1976 && h.rental && ['roommates', 'apartment'].includes(h.rental.tier) && !d.newTownOffered && rng.chance(0.06)) {
      const towns = NEW_TOWNS.filter(([, from]) => y >= from);
      const [town] = rng.pick(towns);
      d.newTownOffered = y;
      ctx.prompt({
        type: 'housingDay.newTown', icon: '🏘️', title: `A House in ${town}`,
        text: `You've reached the top of the council list. The council offers you a new house in ${town} New Town: a garden front and back, an indoor bathroom, factories hiring, and a long way from everyone you know.`,
        options: [{ id: 'go', label: `🏘️ Take the house in ${town}`, hint: 'Cheap rent, clean air, a new start' }, { id: 'stay', label: '🏙️ Stay where you are', hint: 'Your street, your people' }],
        data: { town },
      });
    }
  },
  actions: {
    /** Take in a lodger (or let them go). */
    lodger(ctx) {
      const { state } = ctx;
      const h = state.housing;
      const d = (state.housingDay ??= {});
      if (d.lodger) { const n = d.lodger.name; d.lodger = null; return ctx.log(`You gave ${n} notice; the spare room is yours again.`, '🧳', 'info'); }
      const owns = h.properties.some((p) => p.use === 'primary');
      if (!owns && !(h.rental && h.rental.tier === 'house')) return ctx.toast('You need a house with a spare room', 'warn');
      const rng = sideRng(state);
      const name = rng.pick(['Mr Price', 'Miss Holloway', 'young Kowalski', 'Mrs Abernethy', 'Mr Okafor', 'the student, Patel']);
      d.lodger = { name, rent: Math.round(2400 * ((REGIONS[state.character.regionId]?.col ?? 1))) };
      ctx.log(`You took in a lodger, ${name}: a room, breakfast and the evening meal, and rent on Fridays.`, '🧳', 'good');
    },
  },
  resolvers: {
    newTown(ctx, data, optionId) {
      const { state } = ctx;
      if (optionId !== 'go') return ctx.log('You stayed put. Half the street went to the new towns that decade.', '🏙️', 'info');
      const r = state.housing.rental;
      if (r) { r.tier = 'subsidized'; r.rent = Math.round(r.rent * 0.7); r.newTown = data.town; }
      ctx.stat('health', 3);
      ctx.stat('happiness', 2);
      ctx.log(`You moved into a new council house in ${data.town}: a garden, a bathroom with hot water, and mud everywhere while they finished the next street.`, '🏘️', 'good');
    },
  },
};
