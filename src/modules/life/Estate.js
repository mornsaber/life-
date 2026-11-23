/**
 * Estates, villas abroad and collections: what the well-off owned beyond the house they lived in.
 *
 *   The estate      a great house (an estate mansion you own) comes with tenant farms. Their rents
 *                   are an income (cut by the agricultural depression of 1873–96 and by death and war
 *                   after 1914); a land agent collects more and spares you the trouble. In the season,
 *                   a shooting party (from 1850) or the hunt meeting at your door (to 2004 in Britain);
 *                   after 1945, when the rents no longer keep the roof on, open the house to the public.
 *   Villas abroad   a villa on the Riviera (from 1860), a bungalow in the hills of India (1850–1947),
 *                   a chalet in the Alps (from 1900), a house in Tuscany (from 1970), on the Algarve
 *                   (from 1980) or in the Caribbean (from 1960): a holiday every year, and an asset.
 *   Collections     wine, stamps, coins, antiques, first editions, watches, comics: each with its own
 *                   market by decade (stamps boomed in the 1970s and crashed; fine wine rose from the
 *                   1980s). A lot bought may be fake. Sell at auction, less the auctioneer's commission.
 *   Provenance      a painting that passed through Europe in 1933–45 may be claimed by the heirs of
 *                   the family it was taken from, once the Washington Principles (1998) are agreed.
 *
 * state.estate = { agent, opened, villas: [{ id, place, value, since }], collection: [{ kind, paid, value, year, fake }], claims: {} }
 */
import { Random } from '../../core/Random.js';
import { yearNow } from '../world/Eras.js';
import { priceLevel } from '../world/Countries.js';

const cc = (state) => state.character.countryId ?? 'US';
const local = (state, n) => Math.round(n * priceLevel(state));
const sideRng = (state, salt) => new Random(((state.world?.seed ?? 1) * 28657 + state.character.age * 1597 + salt) >>> 0);
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
export const estateOf = (state) => state.estate ?? { villas: [], collection: [], claims: {} };
const ensure = (state) => (state.estate ??= { villas: [], collection: [], claims: {} });
/** The great house: an estate mansion you own. */
export const greatHouse = (state) => (state.housing?.properties ?? []).find((p) => p.type === 'mansion');

export const VILLAS = {
  riviera: { place: 'a villa on the Riviera', icon: '🌴', from: 1860, price: 2500000 },
  hills: { place: 'a bungalow in the hills (Simla)', icon: '⛰️', from: 1850, until: 1947, where: ['GB', 'IN'], price: 300000 },
  chalet: { place: 'a chalet in the Alps', icon: '🏔️', from: 1900, price: 1500000 },
  tuscany: { place: 'a farmhouse in Tuscany', icon: '🍇', from: 1970, price: 1200000 },
  algarve: { place: 'a villa on the Algarve', icon: '☀️', from: 1980, price: 700000 },
  caribbean: { place: 'a house in the Caribbean', icon: '🏝️', from: 1960, price: 3000000 },
};
export const villasNow = (state, y = yearNow(state)) => Object.entries(VILLAS).filter(([, v]) => y >= v.from && !(v.until <= y) && (!v.where || v.where.includes(cc(state)))).map(([id, v]) => ({ id, ...v, cost: local(state, v.price) }));

/** Each kind: from, and its market (a yearly drift) by period. */
export const COLLECTABLES = {
  wine: { label: 'Fine wine', icon: '🍷', from: 1800, drift: (y) => (y < 1980 ? 0.01 : y < 2012 ? 0.08 : 0.02) },
  stamps: { label: 'Stamps', icon: '📮', from: 1860, drift: (y) => (y < 1970 ? 0.03 : y < 1980 ? 0.15 : y < 1990 ? -0.1 : 0.01) },
  coins: { label: 'Coins', icon: '🪙', from: 1800, drift: (y) => (y < 1975 ? 0.02 : y < 1981 ? 0.12 : 0.02) },
  antiques: { label: 'Antiques', icon: '🏺', from: 1880, drift: (y) => (y < 2000 ? 0.04 : -0.03) },
  books: { label: 'First editions', icon: '📚', from: 1900, drift: () => 0.03 },
  watches: { label: 'Vintage watches', icon: '⌚', from: 1980, drift: (y) => (y < 2015 ? 0.07 : 0.03) },
  comics: { label: 'Comic books', icon: '💥', from: 1975, drift: (y) => (y < 1993 ? 0.1 : y < 2000 ? -0.08 : 0.06) },
};
export const collectablesNow = (state, y = yearNow(state)) => Object.entries(COLLECTABLES).filter(([, c]) => y >= c.from).map(([id, c]) => ({ id, ...c }));
export const LOT = 20000;
export const collectionValue = (state) => estateOf(state).collection.reduce((s, x) => s + x.value, 0);

export function estateTick(ctx) {
  const { state } = ctx;
  const es = state.estate;
  const y = yearNow(state);
  const rng = sideRng(state, 0xe57);
  const house = greatHouse(state);
  if (house && state.character.age >= 18) {
    const e = ensure(state);
    // Tenant farms: the rents, in their day.
    const era = y < 1873 ? 1 : y < 1896 ? 0.7 : y < 1914 ? 0.85 : y < 1945 ? 0.6 : 0.4;
    const rents = local(state, 180000 * era * (e.agent ? 1.15 : 1) * rng.float(0.85, 1.1));
    ctx.earn(rents, 'Rents from the tenant farms');
    if (e.agent) ctx.spend(local(state, 45000), 'The land agent\'s salary', { allowDebt: true });
    else ctx.stat('stress', 2);
    if (e.opened) {
      ctx.earn(local(state, (y < 1966 ? 60000 : 140000) * rng.float(0.8, 1.2)), 'Visitors to the house');
      if (!e.openedNoted) { e.openedNoted = true; }
    }
    // The season: a shooting party or the hunt.
    if (!state.prompts.some((p) => p.type === 'estate.season') && rng.chance(0.5)) {
      const hunt = cc(state) === 'GB' && y < 2005;
      ctx.prompt({
        type: 'estate.season', icon: '🎯', title: 'The Season',
        text: y < 1914 ? 'The grouse are up and the house is full of guests\' letters. Will you have them?' : 'Friends are asking whether there will be a shoot this year.',
        options: [
          { id: 'shoot', label: '🎯 A shooting party', hint: `≈${local(state, 30000).toLocaleString()}; your standing rises` },
          ...(hunt ? [{ id: 'hunt', label: '🐎 The hunt meets at the house', hint: 'Stirrup cups on the gravel' }] : []),
          ...(!e.opened && y >= 1946 ? [{ id: 'open', label: '🎟️ Open the house to the public', hint: 'Visitors, a tea room; your privacy' }] : []),
          { id: 'quiet', label: '🏠 A quiet year' },
        ],
        data: {},
      });
    }
  }
  if (!es) return;
  // Villas: the holiday, and the upkeep.
  for (const v of es.villas) {
    ctx.spend(Math.round(v.value * 0.02), `Upkeep: ${v.place}`, { allowDebt: true });
    ctx.stat('happiness', 3);
    ctx.stat('stress', -3);
    v.value = Math.round(v.value * (1 + rng.float(-0.02, 0.06)));
  }
  // Collections: the market moves; a fake comes to light.
  for (const lot of es.collection) {
    const d = COLLECTABLES[lot.kind]?.drift(y) ?? 0;
    lot.value = Math.max(0, Math.round(lot.value * (1 + d + rng.float(-0.05, 0.05))));
    if (lot.fake && !lot.exposed && rng.chance(0.15)) {
      lot.exposed = true;
      lot.value = Math.round(lot.paid * 0.05);
      ctx.stat('happiness', -5);
      ctx.log(`An expert looked at your ${COLLECTABLES[lot.kind].label.toLowerCase()} and said, gently, that they were fakes.`, '🕵️', 'bad');
    }
  }
  // Provenance: art that passed through Europe in 1933–45, claimed after 1998.
  for (const a of state.society?.art ?? []) {
    if (a.prov == null) a.prov = Boolean((a.year ?? y) >= 1946 && /master|Impressionist|Dutch/.test(a.name ?? '') && hash(`${a.name}${a.year}`) % 6 === 0);
    if (a.prov && y >= 1998 && !(es.claims ??= {})[a.name] && rng.chance(0.2) && !state.prompts.some((p) => p.type === 'estate.claim')) {
      es.claims[a.name] = y;
      ctx.prompt({
        type: 'estate.claim', icon: '⚖️', title: 'A Claim on a Painting',
        text: `The heirs of a family dispossessed in 1938 say ${a.name.toLowerCase()} was taken from them. The provenance has a gap from 1933 to 1945.`,
        options: [{ id: 'return', label: '🤝 Return it', hint: 'Lose the painting; gain a reputation' }, { id: 'settle', label: '💰 Settle: pay them and keep it', hint: 'About 40% of its value' }, { id: 'fight', label: '⚖️ Fight it in court' }],
        data: { name: a.name },
      });
    }
  }
}

export const EstateModule = {
  id: 'estate',
  order: 89.6,
  onAgeUp: estateTick,
  actions: {
    agent(ctx) {
      const e = ensure(ctx.state);
      e.agent = !e.agent;
      ctx.log(e.agent ? 'You took on a land agent to deal with the tenants and the rents.' : 'You let the land agent go and dealt with the tenants yourself.', '📒', 'info');
    },
    villa(ctx, id) {
      const { state } = ctx;
      const v = villasNow(state).find((x) => x.id === id);
      if (!v) return ctx.toast('Not in this day', 'warn');
      if (state.character.age < 21) return ctx.toast('21+', 'warn');
      const e = ensure(state);
      if (e.villas.some((x) => x.id === id)) return ctx.toast('You have one there already', 'info');
      if (!ctx.spend(v.cost, `Buying ${v.place}`)) return ctx.toast(`It costs ${v.cost.toLocaleString()}`, 'warn');
      e.villas.push({ id, place: v.place, value: v.cost, since: yearNow(state) });
      ctx.log(`You bought ${v.place}. Every summer from now on.`, v.icon, 'milestone');
    },
    sellVilla(ctx, id) {
      const e = ensure(ctx.state);
      const v = e.villas.find((x) => x.id === id);
      if (!v) return;
      e.villas = e.villas.filter((x) => x !== v);
      ctx.earn(Math.round(v.value * 0.94), `Sale of ${v.place}`);
      ctx.log(`You sold ${v.place}.`, '🏷️', 'info');
    },
    collect(ctx, kind) {
      const { state } = ctx;
      const c = collectablesNow(state).find((x) => x.id === kind);
      if (!c) return ctx.toast('Not in this day', 'warn');
      const cost = local(state, LOT);
      if (!ctx.spend(cost, `${c.label} at auction`)) return ctx.toast(`A good lot costs about ${cost.toLocaleString()}`, 'warn');
      const rng = sideRng(state, ensure(state).collection.length + 0xc0);
      ensure(state).collection.push({ kind, paid: cost, value: cost, year: yearNow(state), fake: rng.chance(0.08) });
      ctx.log(`You bought a lot of ${c.label.toLowerCase()} at auction.`, c.icon, 'good');
    },
    sellCollection(ctx, kind) {
      const e = ensure(ctx.state);
      const lots = e.collection.filter((x) => x.kind === kind);
      if (!lots.length) return;
      const gross = lots.reduce((s, x) => s + x.value, 0);
      e.collection = e.collection.filter((x) => x.kind !== kind);
      ctx.earn(Math.round(gross * 0.8), `Auction: ${COLLECTABLES[kind].label.toLowerCase()}`);
      ctx.log(`Your ${COLLECTABLES[kind].label.toLowerCase()} went under the hammer for ${Math.round(gross * 0.8).toLocaleString()} after the auctioneer's commission.`, '🔨', 'info');
    },
  },
  resolvers: {
    season(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const e = ensure(state);
      if (optionId === 'shoot') {
        ctx.spend(local(state, 30000), 'The shooting party', { allowDebt: true });
        if (state.society) state.society.standing = Math.min(100, (state.society.standing ?? 30) + 3);
        ctx.stat('happiness', 4);
        return ctx.log(rng.chance(0.1) ? 'The shooting party went well until a guest peppered the beaters. Lawyers were mentioned.' : 'Twelve guns, two hundred brace, and a dinner that went on until two.', '🎯', 'good');
      }
      if (optionId === 'hunt') { ctx.stat('happiness', 3); if (state.society) state.society.standing = Math.min(100, (state.society.standing ?? 30) + 2); return ctx.log('The hunt met on your gravel: hounds, scarlet coats and a stirrup cup for every rider.', '🐎', 'good'); }
      if (optionId === 'open') { e.opened = yearNow(state); ctx.stat('happiness', -2); return ctx.log('You opened the house to the public: a ticket office in the stables, a tea room in the old laundry, and coach parties in the long gallery.', '🎟️', 'milestone'); }
      ctx.log('A quiet year at the house.', '🏠', 'muted');
    },
    claim(ctx, data, optionId) {
      const { state, rng } = ctx;
      const art = state.society?.art ?? [];
      const a = art.find((x) => x.name === data.name);
      if (!a) return;
      if (optionId === 'return') { state.society.art = art.filter((x) => x !== a); ctx.emit('fame:buzz', { amount: 5 }); ctx.stat('happiness', 3); return ctx.log(`You returned ${a.name.toLowerCase()} to the family it was taken from. The granddaughter wept at the handover.`, '🤝', 'milestone'); }
      if (optionId === 'settle') { ctx.spend(Math.round((a.value ?? 0) * 0.4), 'Restitution settlement', { allowDebt: true }); return ctx.log('You paid the family a settlement and kept the painting, with a new label telling its story.', '💰', 'info'); }
      ctx.spend(local(state, 120000), 'Restitution case', { allowDebt: true });
      if (rng.chance(0.35)) return ctx.log('The court found the claim unproven. You kept the painting, and the newspapers kept the story.', '⚖️', 'warn');
      state.society.art = art.filter((x) => x !== a);
      ctx.log(`You lost: ${a.name.toLowerCase()} went back to the heirs, and the costs were yours.`, '⚖️', 'bad');
    },
  },
};
