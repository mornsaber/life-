/**
 * Industry at the top: your own industrial concern — a colliery, a mill, a steelworks, a shipyard,
 * an oil company, a motor works, an airline, a bank.
 *
 *   found      where the industry is (or be the first, once the know-how and the ground are there);
 *              half on credit if you like. In a colony, a concession: cheap to get, rich to work,
 *              and at risk when the colony goes free.
 *   the year   profits follow the industry's health in the model; a cartel lifts prices (and draws
 *              the trust-busters where antitrust is aggressive); subsidies help; strikes, disasters
 *              and depletion hurt
 *   owners' choices  expand, cut wages (and risk a strike), join a cartel, lobby the government
 *              (the model's government weighs it when deciding tariffs and support), or sell
 *   the state  a nationalisation law takes your concern for government compensation; a colony's
 *              independence may take it for nothing
 *
 * state.concerns = [{ id, industry, name, capital, debt, value, workers, since, cartel, colonial, lastProfit }]
 */
import { Random, clamp } from '../../core/Random.js';
import { yearNow, colonialHere } from '../world/Eras.js';
import { priceLevel } from '../world/Countries.js';
import { REGIONS } from '../life/Regions.js';
import { netWorth } from '../../core/State.js';
import { INDUSTRIES, industryHealth, industryHere, industryShare, emergent, techKnown } from './IndustryEngine.js';
import { endowment } from './IndustryData.js';
import { unionsLawful } from './Sync.js';
import { stateShare } from '../world/Ownership.js';
import { levelValue } from '../politics/Laws.js';

/** What you can found, by industry: its name, what it costs (today's money) and how many it employs per million. */
export const CONCERN_KINDS = {
  coal: { name: 'a colliery', cost: 2e6 }, metalMining: { name: 'a mining company', cost: 3e6 }, textiles: { name: 'a cotton mill', cost: 1e6 },
  ironSteel: { name: 'an ironworks', later: ['steel', 'a steelworks'], cost: 5e6 }, engineering: { name: 'an engineering works', cost: 2e6 }, shipbuilding: { name: 'a shipyard', cost: 4e6 },
  shipping: { name: 'a shipping line', cost: 3e6 }, whaling: { name: 'a whaling fleet', cost: 6e5 }, fishing: { name: 'a trawler fleet', cost: 8e5 }, timber: { name: 'a timber concern', cost: 8e5 },
  oilGas: { name: 'an oil company', cost: 6e6 }, chemicals: { name: 'a chemical works', cost: 4e6 }, pharma: { name: 'a drug company', cost: 5e6 }, automobile: { name: 'a motor works', cost: 8e6 },
  aerospace: { name: 'an aircraft company', cost: 1.2e7 }, electronics: { name: 'an electrical company', cost: 4e6 }, software: { name: 'a software company', cost: 1e6 },
  railways: { name: 'a railway company', cost: 1e7 }, airlines: { name: 'an airline', cost: 1.2e7 }, power: { name: 'an electricity company', cost: 6e6 }, telecom: { name: 'a telephone company', cost: 5e6 },
  plantation: { name: 'a plantation company', cost: 5e5 }, renewables: { name: 'a wind and solar developer', cost: 3e6 }, media: { name: 'a newspaper and film company', cost: 2e6 },
  retail: { name: 'a department store chain', cost: 2e6 }, tourism: { name: 'a hotel group', cost: 2e6 }, banking: { name: 'a bank', cost: 3e6 },
};
const cc = (state) => state.character?.countryId ?? 'US';
/** What the firm is called: the founder's name, the way such firms were named. */
const FIRM = {
  coal: (n) => `${n} Collieries`, metalMining: (n) => `${n} Mining`, textiles: (n) => `${n} Mills`, ironSteel: (n, s) => `${n} ${s.steel ? 'Steel' : 'Iron Works'}`, engineering: (n) => `${n} Engineering`,
  shipbuilding: (n) => `${n} & Co., Shipbuilders`, shipping: (n) => `the ${n} Line`, whaling: (n) => `${n} Whaling`, fishing: (n) => `${n} Trawlers`, timber: (n) => `${n} Timber`,
  oilGas: (n) => `${n} Petroleum`, chemicals: (n) => `${n} Chemicals`, pharma: (n) => `${n} Laboratories`, automobile: (n) => `${n} Motors`, aerospace: (n) => `${n} Aircraft`,
  electronics: (n) => `${n} Electric`, software: (n) => `${n} Software`, railways: (n, s) => `the ${s.town} Railway`, airlines: (n) => `${n} Airways`, power: (n, s) => `the ${s.town} Electric Light Company`,
  telecom: (n, s) => `the ${s.town} Telephone Company`, plantation: (n) => `the ${n} Estates`, renewables: (n) => `${n} Renewables`, media: (n, s) => `the ${s.town} Herald Company`,
  retail: (n) => `${n}'s`, tourism: (n) => `${n} Hotels`, banking: (n) => `${n}'s Bank`,
};
const town = (state) => (REGIONS[state.character.regionId]?.name ?? 'the town').split(',')[0];
const rngOf = (state, salt = 0) => new Random(((state.world?.seed ?? 1) * 7349 + state.character.age * 211 + salt) >>> 0);
const concerns = (state) => (state.concerns ??= []);
// Heavy industry is capital-hungry: a colliery for seven hundred men cost a fortune in its day.
const SCALE = 5;
const costOf = (state, id) => Math.round(CONCERN_KINDS[id].cost * SCALE * Math.min(2, priceLevel(state)));
const kindName = (state, id) => { const k = CONCERN_KINDS[id]; return k.later && techKnown(state, k.later[0]) ? k.later[1] : k.name; };

/** What you could found here and now: [id, cost, pioneer?]. */
export function foundable(state) {
  if (!emergent(state) || !state.industry?.c?.[cc(state)] || state.character.age < 21) return [];
  return Object.keys(CONCERN_KINDS).filter((id) => {
    const I = INDUSTRIES[id];
    if (I.resource && endowment(cc(state), I.resource) <= 0) return false;
    if (!I.tech.every((t) => techKnown(state, t))) return false;
    return true;
  }).map((id) => [id, costOf(state, id), !industryHere(state, id) || industryShare(state, id) < 0.004]);
}
const SECTOR = (id) => INDUSTRIES[id].sector;

export const ConcernsModule = {
  id: 'concerns',
  order: 31.5,
  onAgeUp(ctx) {
    const { state } = ctx;
    const list = state.concerns;
    if (!list?.length) return;
    const rng = rngOf(state, 0xc0);
    const y = yearNow(state);
    for (const c of [...list]) {
      const I = INDUSTRIES[c.industry];
      // Nationalised: taken for government compensation.
      if (SECTOR(c.industry) && stateShare(state, SECTOR(c.industry)) >= 1) {
        const pay = Math.round(Math.max(0, c.value - c.debt) * 0.8);
        if (pay > 0) ctx.earn(pay, 'Compensation for nationalisation', {});
        state.concerns = state.concerns.filter((x) => x !== c);
        ctx.log(`${c.name} was nationalised. You were paid in government stock: about four-fifths of what it was worth.`, '🏛️', 'warn');
        continue;
      }
      // A concession in a colony that has gone free.
      if (c.colonial && !colonialHere(state)) {
        c.colonial = false;
        if (rng.chance(0.5)) { state.concerns = state.concerns.filter((x) => x !== c); ctx.log(`The new government took over ${c.name}, the concession and everything on it, without a penny.`, '🏳️', 'bad'); continue; }
        ctx.log(`The new government let you keep ${c.name}, on new terms and new taxes.`, '🏳️', 'info');
      }
      // The year: the industry's health, a cartel, a subsidy, the wage bill.
      const h = industryHealth(state, c.industry);
      const subsidised = state.industry?.c?.[cc(state)]?.subsidies?.[c.industry];
      const margin = 0.08 + 0.22 * h + (c.cartel ? 0.05 : 0) + (subsidised ? 0.03 : 0) + (c.colonial ? 0.06 : 0) + (c.wageCut === y - 1 ? 0.02 : 0) - (unionsLawful(state) ? I.union * 0.015 : 0);
      const profit = Math.round(c.capital * margin * rng.float(0.7, 1.3));
      const interest = Math.round(c.debt * 0.06);
      const net = profit - interest;
      c.lastProfit = net;
      if (net >= 0) ctx.earn(net, `${c.name} profits`, {}); else state.finances.cash += net;
      c.value = Math.max(0, Math.round(c.capital * (1 + h * 0.6 + (c.cartel ? 0.1 : 0))));
      // The trust-busters.
      if (c.cartel && levelValue(state, 'antitrust', 'federal', cc(state) === 'US' ? null : cc(state)) === 'aggressive' && rng.chance(0.3)) {
        c.cartel = false;
        const fine = Math.round(c.capital * 0.05);
        state.finances.cash -= fine;
        ctx.log(`The competition authorities broke up the ${I.name.toLowerCase()} cartel and fined ${c.name}.`, '⚖️', 'warn');
      }
      // A strike at your works.
      if (unionsLawful(state) && I.union >= 0.5 && (h < -0.2 || c.wageCut === y - 1) && rng.chance(0.2) && !state.prompts.some((p) => p.type === 'concerns.strike')) {
        ctx.prompt({ type: 'concerns.strike', icon: '✊', title: `A Strike at ${c.name}`, text: `${c.workers.toLocaleString()} of your workers have come out${c.wageCut === y - 1 ? ' against the wage cut' : ''}. The pickets are at the gate.`, data: { id: c.id }, options: [
          { id: 'concede', label: '🤝 Meet their demands', hint: 'Dearer wages; back to work' },
          { id: 'lockout', label: '🔒 Lock them out', hint: 'Starve them back; lose a season' },
          { id: 'blacklegs', label: '🚂 Bring in blacklegs', hint: 'Trouble at the gates' },
        ] });
      }
      // Depletion and decline: worth little in a dying trade.
      if (h < -0.6 && rng.chance(0.15)) ctx.log(`${c.name} is losing money in a dying trade. Its value is falling every year.`, '📉', 'warn');
    }
  },
  actions: {
    /** Found a concern. */
    found(ctx, arg) {
      const { state } = ctx;
      const id = typeof arg === 'object' ? arg?.kind : arg;
      const row = foundable(state).find(([k]) => k === id);
      if (!row) return ctx.toast('Not here, not now.', 'warn');
      const [, cost, pioneer] = row;
      const colonial = Boolean(colonialHere(state)) && INDUSTRIES[id].kind === 'extract';
      const price = Math.round(cost * (colonial ? 0.5 : 1));
      const debt = Math.max(0, Math.round(price - state.finances.cash * 0.9));
      if (debt > price * 0.5) return ctx.toast('You need at least half the money: the banks lend the rest.', 'warn');
      state.finances.cash -= price - debt;
      const surname = state.character.lastName ?? state.character.firstName;
      const name = (FIRM[id] ?? ((n) => `${n} & Co.`))(surname, { town: town(state), steel: techKnown(state, 'steel') });
      const c = { id: `c${yearNow(state)}${concerns(state).length}`, industry: id, name, capital: price, debt, value: price, workers: Math.max(8, Math.round((CONCERN_KINDS[id].cost / 1e6) * 350 * (0.3 + INDUSTRIES[id].labor))), since: yearNow(state), cartel: false, colonial, pioneer, lastProfit: 0 };
      concerns(state).push(c);
      ctx.log(`You founded ${kindName(state, id)}: ${c.name}${pioneer ? ', the first of its kind in the country' : ''}${colonial ? ', on a concession from the colonial government' : ''}. ${c.workers.toLocaleString()} people work for you${debt ? `, and you owe the bank ${Math.round(debt / 1000).toLocaleString()} thousand` : ''}.`, '🏭', 'milestone');
    },
    /** Expand: a quarter more capacity, paid in cash. */
    expand(ctx, id) {
      const { state } = ctx;
      const c = concerns(state).find((x) => x.id === id);
      if (!c) return;
      const add = Math.round(c.capital * 0.25);
      if (state.finances.cash < add) return ctx.toast('Not enough money to expand.', 'warn');
      state.finances.cash -= add; c.capital += add; c.workers = Math.round(c.workers * 1.25);
      ctx.log(`You expanded ${c.name}: new plant, ${c.workers.toLocaleString()} on the books.`, '🏗️', 'good');
    },
    /** Cut wages: profits now, trouble later. */
    cutWages(ctx, id) {
      const { state } = ctx;
      const c = concerns(state).find((x) => x.id === id);
      if (!c) return;
      c.wageCut = yearNow(state);
      ctx.log(`You cut wages at ${c.name} by a tenth.`, '✂️', 'warn');
    },
    /** Join (or leave) the trade's cartel. */
    cartel(ctx, id) {
      const { state } = ctx;
      const c = concerns(state).find((x) => x.id === id);
      if (!c) return;
      c.cartel = !c.cartel;
      const ind = state.industry?.c?.[cc(state)];
      if (ind) ind.cartels = concerns(state).filter((x) => x.cartel).length;
      ctx.log(c.cartel ? `You agreed prices and quotas with the other ${INDUSTRIES[c.industry].name.toLowerCase()} firms over dinner. Nothing was written down.` : `You left the cartel and cut your prices.`, c.cartel ? '🤝' : '📉', 'info');
    },
    /** Lobby the government for your trade: tariffs and support (the model's government weighs it). */
    lobby(ctx, id) {
      const { state } = ctx;
      const c = concerns(state).find((x) => x.id === id);
      if (!c || state.yearly?.['concerns.lobby']) return ctx.toast('You have lobbied this year.', 'warn');
      (state.yearly ??= {})['concerns.lobby'] = 1;
      const cost = Math.round(c.capital * 0.01);
      state.finances.cash -= cost;
      const ind = state.industry?.c?.[cc(state)];
      if (ind) ind.lobby = { industry: c.industry, year: yearNow(state) };
      ctx.log(`You took ministers to dinner and paid for a pamphlet on the ruin of the ${INDUSTRIES[c.industry].name.toLowerCase()} trade. The government is listening.`, '🎩', 'info');
    },
    /** Sell the concern. */
    sell(ctx, id) {
      const { state } = ctx;
      const c = concerns(state).find((x) => x.id === id);
      if (!c) return;
      const net = Math.max(0, c.value - c.debt);
      ctx.earn(net, `Sale of ${c.name}`, {});
      state.concerns = state.concerns.filter((x) => x !== c);
      ctx.log(`You sold ${c.name}.`, '🤝', 'info');
    },
  },
  resolvers: {
    strike(ctx, data, optionId) {
      const { state } = ctx;
      const c = concerns(state).find((x) => x.id === data.id);
      if (!c) return;
      const rng = rngOf(state, 0x57);
      if (optionId === 'concede') { c.capital = Math.round(c.capital * 0.97); return ctx.log(`You met the strikers' terms at ${c.name}. The works reopened on Monday.`, '🤝', 'info'); }
      if (optionId === 'lockout') {
        const lost = Math.round(Math.max(0, c.lastProfit) * 0.5);
        state.finances.cash -= lost;
        return ctx.log(rng.chance(0.6) ? `You locked them out for three months. Hunger sent them back on your terms.` : `You locked them out; they held out longer than you, and you settled in the end.`, '🔒', 'warn');
      }
      ctx.stat('stress', 6);
      ctx.log(rng.chance(0.4) ? `The blacklegs came in under police escort. There was a riot at the gates and a man was killed; the newspapers called it a massacre.` : `The blacklegs broke the strike. The town will hate your name for a generation.`, '🚂', 'bad');
    },
  },
};
export const concernsEquity = (state) => (state.concerns ?? []).reduce((s, c) => s + Math.max(0, (c.value ?? 0) - (c.debt ?? 0)), 0);
export { netWorth, clamp };
