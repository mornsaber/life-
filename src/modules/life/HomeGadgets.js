/**
 * Your home, gadget by gadget. What a house had in it changed more in a lifetime than anything
 * else: water from a pump, then a tap; candles, then gas, then a switch on the wall; a range,
 * then a gas cooker; the wireless, the telephone, the fridge, the television, the washing
 * machine, central heating, the home computer, the internet, the phone in your pocket.
 *
 *   Utilities    piped water, gas and electricity come when your town gets them (TownStory.js)
 *                and you have a home of your own (a landlord does it, or you pay to be connected).
 *   Appliances   each reaches your country on its own date (LAG from TownStory.js: Britain and
 *                America first) and reaches most homes a decade or two after the rich. When it is
 *                within reach you're asked once: buy outright, on hire purchase (from 1920: a deposit
 *                and weekly payments), or wait.
 *   Effects      a washing machine gives a housewife back a day a week; a fridge and clean water
 *                mean fewer stomach upsets; the wireless and the television bring the world in.
 *
 * state.homeGadgets = { owned: { [id]: year }, declined: { [id]: year }, hp: [{ id, left, payment }] }
 */
import { Random } from '../../core/Random.js';
import { yearNow } from '../world/Eras.js';
import { priceLevel } from '../world/Countries.js';
import { LAG } from './TownStory.js';
import { regimeHere } from '../world/Regimes.js';

/** base: when it reached ordinary homes in Britain/America; rich: years earlier for the well-off; price today's dollars. */
export const GADGETS = {
  water: { name: 'Piped water and a tap indoors', icon: '🚰', base: 1880, utility: 'water', price: 800, health: 2, text: 'Water from a tap indoors: no more carrying pails from the pump in the yard.' },
  flush: { name: 'An indoor flush toilet', icon: '🚽', base: 1905, rich: 25, needs: 'water', price: 1500, health: 2, text: 'An indoor lavatory with a chain to pull. No more trips across the yard in the dark.' },
  gas: { name: 'Gas lighting', icon: '🏮', base: 1860, rich: 20, utility: 'gas', price: 600, happy: 2, until: 1930, text: 'Gas mantles in every room: you can read after dark without squinting.' },
  electric: { name: 'Electricity in the house', icon: '💡', base: 1925, rich: 20, utility: 'electric', price: 1200, happy: 3, text: 'The house was wired: a switch on the wall, and light that came on at once.' },
  cooker: { name: 'A gas cooker', icon: '🍳', base: 1910, rich: 15, needs: 'gas', price: 900, happy: 2, until: 1975, text: 'A gas cooker in place of the coal range: no more black-leading the grate.' },
  wireless: { name: 'A wireless set', icon: '📻', base: 1925, rich: 3, needs: 'electric', price: 700, happy: 4, smarts: 1, text: 'A wireless set in the parlour: dance bands, the news, and the whole family hushed for the serial.' },
  telephone: { name: 'A telephone', icon: '☎️', base: 1955, rich: 40, price: 600, happy: 2, text: (y) => (y < 1930 ? 'A telephone on the hall table, and a number of your own. The exchange girl knows everyone\'s business.' : 'The telephone was put in. Your mother rang every Sunday.') },
  vacuum: { name: 'A vacuum cleaner', icon: '🧹', base: 1935, rich: 15, needs: 'electric', price: 600, stress: -2, text: 'A vacuum cleaner. The carpets haven\'t been beaten since.' },
  fridge: { name: 'A refrigerator', icon: '🧊', base: 1950, rich: 15, needs: 'electric', price: 1400, health: 1, text: 'A refrigerator: milk that keeps, and ice in summer.' },
  television: { name: 'A television set', icon: '📺', base: 1955, rich: 6, needs: 'electric', price: 1800, happy: 5, text: (y) => (y < 1965 ? 'A television in the corner: a small grey screen, and the neighbours round to watch.' : 'A new television set.') },
  washer: { name: 'A washing machine', icon: '🫧', base: 1960, rich: 12, needs: 'electric', price: 1500, stress: -4, housework: true, text: 'A washing machine. Monday is no longer wash day: the copper, the mangle and the aching arms are gone.' },
  heating: { name: 'Central heating', icon: '🔥', base: 1970, rich: 25, price: 6000, health: 1, happy: 2, text: 'Central heating: warm in every room, and no more ice on the inside of the windows.' },
  colourTv: { name: 'A colour television', icon: '🌈', base: 1972, rich: 5, needs: 'television', price: 2000, happy: 3, text: 'A colour television. Snooker was suddenly worth watching.' },
  microwave: { name: 'A microwave oven', icon: '♨️', base: 1985, rich: 8, needs: 'electric', price: 500, stress: -1, text: 'A microwave: dinner in four minutes, and a ping.' },
  video: { name: 'A video recorder', icon: '📼', base: 1984, rich: 6, needs: 'television', price: 900, happy: 2, until: 2008, text: 'A video recorder: you can watch the film on Sunday afternoon, if you can set the clock.' },
  computer: { name: 'A home computer', icon: '🖥️', base: 1988, rich: 8, needs: 'electric', price: 2500, smarts: 3, text: (y) => (y < 1990 ? 'A home computer: games loaded from a cassette, and BASIC programs copied from a magazine.' : 'A computer in the spare room.') },
  internet: { name: 'The internet at home', icon: '🌐', base: 1999, rich: 5, needs: 'computer', price: 400, smarts: 2, happy: 2, text: (y) => (y < 2004 ? 'The internet, through a modem that screeched and tied up the phone line.' : 'Broadband at home.') },
  mobile: { name: 'A mobile phone', icon: '📱', base: 2000, rich: 10, price: 400, happy: 2, text: (y) => (y < 2009 ? 'A mobile phone: texts at ten pence each, and a game with a snake.' : 'A smartphone: the whole world in your pocket, and never out of reach.') },
};
export const gadgetsOf = (state) => state.homeGadgets?.owned ?? {};
const cc = (state) => state.character.countryId ?? 'US';
const lag = (state, g) => Math.round((LAG[cc(state)] ?? 50) * (g.base >= 1950 ? 0.4 : 0.7));
/** When ordinary homes here got it, and (rich) when the well-off did. */
export function arrivesAt(state, id) {
  const g = GADGETS[id];
  const base = g.base + lag(state, g);
  return { common: base, rich: base - (g.rich ?? 10) };
}
const rich = (state) => (state.finances?.lastYear?.living ?? 0) > 30000 * priceLevel(state);
const hasHome = (state) => Boolean(state.housing?.rental || (state.housing?.properties ?? []).some((p) => p.use === 'primary'));
const townHas = (state, utility) => Boolean(state.world?.townStory?.[state.character.regionId]?.[utility]) || yearNow(state) >= ({ water: 1900, gas: 1880, electric: 1930 }[utility] ?? 1900) + (LAG[cc(state)] ?? 50);
const sideRng = (state, salt) => new Random(((state.world?.seed ?? 1) * 47123 + state.character.age * 911 + salt) >>> 0);

/** The gadgets you could have this year, but don't. */
export function gadgetsWithin(state, y = yearNow(state)) {
  const owned = gadgetsOf(state);
  return Object.entries(GADGETS).filter(([id, g]) => !owned[id] && !(g.until <= y) && (!g.needs || owned[g.needs]) && (!g.utility || townHas(state, g.utility)) && y >= (rich(state) ? arrivesAt(state, id).rich : arrivesAt(state, id).common)).map(([id, g]) => ({ id, ...g, cost: Math.round(g.price * priceLevel(state)) }));
}

export function gadgetsTick(ctx) {
  const { state } = ctx;
  if (state.character.age < 1) return;
  const hg = (state.homeGadgets ??= { owned: {}, declined: {}, hp: [] });
  const y = yearNow(state);
  // Hire purchase: the weekly payments.
  for (const h of [...hg.hp]) {
    ctx.spend(h.payment, `Hire purchase: ${GADGETS[h.id]?.name.toLowerCase() ?? h.id}`, { allowDebt: true });
    if (--h.left <= 0) hg.hp = hg.hp.filter((x) => x !== h);
  }
  // A child grows up with what the family home has; the gadgets of your parents' house become yours to remember.
  if (state.character.age < 18) {
    for (const x of gadgetsWithin(state, y)) if (x.utility || y >= arrivesAt(state, x.id).common + 5) hg.owned[x.id] = y;
    return;
  }
  if (!hasHome(state)) return;
  const within = gadgetsWithin(state, y);
  // Utilities: the landlord wires the house, or the council lays the main.
  for (const x of within.filter((g) => g.utility)) {
    if (state.housing.rental || y >= arrivesAt(state, x.id).common + 10) {
      hg.owned[x.id] = y;
      ctx.log(x.text, x.icon, 'good');
      if (x.health) ctx.stat('health', x.health);
    }
  }
  // One appliance offered a year.
  const next = within.filter((g) => !g.utility && !(hg.declined[g.id] >= y - 3)).sort((a, b) => arrivesAt(state, a.id).common - arrivesAt(state, b.id).common)[0];
  if (!next || state.prompts.some((p) => p.type === 'homeGadgets.offer')) return;
  const hire = y >= 1920 && regimeHere(state).banking !== 'state';
  ctx.prompt({
    type: 'homeGadgets.offer', icon: next.icon, title: next.name,
    text: `${y < arrivesAt(state, next.id).common ? 'The better-off families have one' : 'Half the street has one now'}. ${next.name} would cost about ${next.cost.toLocaleString()}.`,
    options: [
      { id: 'buy', label: '💰 Buy it outright', disabled: state.finances.cash < next.cost },
      ...(hire ? [{ id: 'hp', label: y < 1975 ? '🗓️ On hire purchase' : '🗓️ On credit', hint: 'A deposit, and payments for three years' }] : []),
      { id: 'wait', label: '⏳ Not yet' },
    ],
    data: { id: next.id, cost: next.cost },
  });
}

function install(ctx, id) {
  const { state } = ctx;
  const g = GADGETS[id];
  const y = yearNow(state);
  state.homeGadgets.owned[id] = y;
  if (g.health) ctx.stat('health', g.health);
  if (g.happy) ctx.stat('happiness', g.happy);
  if (g.stress) ctx.stat('stress', g.stress);
  if (g.smarts) ctx.stat('smarts', g.smarts);
  ctx.log(typeof g.text === 'function' ? g.text(y) : g.text, g.icon, 'good');
  // Before 1970 the housework was hers: a washing machine changed a woman's week most of all.
  if (g.housework && state.character.gender === 'female' && y < 1975) ctx.stat('happiness', 4);
}

export const HomeGadgetsModule = {
  id: 'homeGadgets',
  order: 45.5,
  onAgeUp: gadgetsTick,
  resolvers: {
    offer(ctx, data, optionId) {
      const { state } = ctx;
      const hg = (state.homeGadgets ??= { owned: {}, declined: {}, hp: [] });
      if (!GADGETS[data.id] || hg.owned[data.id]) return;
      if (optionId === 'wait') { hg.declined[data.id] = yearNow(state); return ctx.log(`You decided to manage without ${GADGETS[data.id].name.toLowerCase().replace(/^an? /, 'a ')} for now.`, '⏳', 'muted'); }
      if (optionId === 'buy') {
        if (!ctx.spend(data.cost, GADGETS[data.id].name)) { hg.declined[data.id] = yearNow(state); return ctx.log('You couldn\'t afford it this year.', '⏳', 'muted'); }
        return install(ctx, data.id);
      }
      // Hire purchase: a tenth down and the rest (with interest) over three years.
      const deposit = Math.round(data.cost * 0.1);
      if (!ctx.spend(deposit, `Deposit: ${GADGETS[data.id].name.toLowerCase()}`)) { hg.declined[data.id] = yearNow(state); return ctx.log('You couldn\'t find the deposit this year.', '⏳', 'muted'); }
      hg.hp.push({ id: data.id, left: 3, payment: Math.round((data.cost * 1.25 - deposit) / 3) });
      install(ctx, data.id);
    },
  },
};

/** What the house has, oldest first: [{ id, year, name, icon }]. */
export const homeInventory = (state) => Object.entries(gadgetsOf(state)).filter(([id]) => GADGETS[id]).map(([id, year]) => ({ id, year, name: GADGETS[id].name, icon: GADGETS[id].icon })).sort((a, b) => a.year - b.year);
