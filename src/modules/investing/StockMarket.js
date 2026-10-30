/**
 * A stock market of named (fictional) companies, priced off the shared
 * economy: each stock moves with its sector's return, its own luck and its
 * earnings. On top of that:
 *
 *  - Earnings seasons: companies you hold or short report beats and misses.
 *  - Bubbles: in a boom a sector can catch a mania — prices run for a few
 *    years, then crash when it pops or the recession comes.
 *  - IPOs: new companies list; you can ask for an allocation at the offer price.
 *  - Collapses: now and then a company fails and is delisted.
 *  - Short-selling (borrow fee, margin calls) and one-year call and put options.
 *
 * Prices are in today's money (real returns), like the rest of the portfolio.
 *
 * state.stocks = {
 *   companies: { [id]: { price, eps, listedAge, delisted } },
 *   positions: { [id]: { shares, basis, boughtAge } },
 *   shorts: { [id]: { shares, entry } },
 *   options: [{ id, companyId, kind: 'call'|'put', strike, shares, premium, expires }],
 *   bubble: { sector, years, peak } | null, ipos: [ids already listed]
 * }
 */
import { Random } from '../../core/Random.js';
import { SECTORS } from '../economy/EconomyEngine.js';
import { realReturn } from './Assets.js';
import { COUNTRIES } from '../world/Countries.js';
import { STOCK_INDEX } from '../world/CountryLaw.js';

export const COMPANIES = {
  novaq: { name: 'Novaq Systems', ticker: 'NVQ', sector: 'tech', vol: 0.35, div: 0, price: 180 },
  brightline: { name: 'Brightline Software', ticker: 'BRL', sector: 'tech', vol: 0.3, div: 0.004, price: 95 },
  halcyon: { name: 'Halcyon Chips', ticker: 'HLC', sector: 'tech', vol: 0.4, div: 0, price: 60 },
  meridian: { name: 'Meridian Bank', ticker: 'MRB', sector: 'finance', vol: 0.22, div: 0.03, price: 48 },
  ironclad: { name: 'Ironclad Insurance', ticker: 'ICI', sector: 'finance', vol: 0.18, div: 0.025, price: 72 },
  terrapin: { name: 'Terrapin Energy', ticker: 'TRP', sector: 'energy', vol: 0.28, div: 0.045, price: 55 },
  solace: { name: 'Solace Renewables', ticker: 'SLC', sector: 'energy', vol: 0.38, div: 0, price: 34 },
  vitalis: { name: 'Vitalis Pharma', ticker: 'VTL', sector: 'health', vol: 0.3, div: 0.02, price: 120 },
  carewell: { name: 'Carewell Health', ticker: 'CWH', sector: 'health', vol: 0.16, div: 0.015, price: 210 },
  hearth: { name: 'Hearth & Home Foods', ticker: 'HHF', sector: 'consumer', vol: 0.12, div: 0.032, price: 64 },
  pellucid: { name: 'Pellucid Beverages', ticker: 'PLB', sector: 'consumer', vol: 0.14, div: 0.03, price: 58 },
  orbitail: { name: 'Orbitail Retail', ticker: 'ORB', sector: 'consumer', vol: 0.25, div: 0.012, price: 41 },
};
/** Companies that come to market later, one at a time. */
export const IPO_POOL = {
  quillon: { name: 'Quillon AI', ticker: 'QAI', sector: 'tech', vol: 0.55, div: 0, price: 40 },
  stratus: { name: 'Stratus Rockets', ticker: 'STR', sector: 'tech', vol: 0.6, div: 0, price: 25 },
  genomix: { name: 'Genomix Therapeutics', ticker: 'GNX', sector: 'health', vol: 0.6, div: 0, price: 18 },
  ferro: { name: 'Ferro Batteries', ticker: 'FRB', sector: 'energy', vol: 0.5, div: 0, price: 30 },
  ledgerly: { name: 'Ledgerly Pay', ticker: 'LDG', sector: 'finance', vol: 0.45, div: 0, price: 32 },
  sprout: { name: 'Sprout Grocery Delivery', ticker: 'SPR', sector: 'consumer', vol: 0.5, div: 0, price: 22 },
};
export const ALL_COMPANIES = { ...COMPANIES, ...IPO_POOL };
/** Each country's own blue chips, listed on its exchange: a bank, a utility and a retailer. */
const LOCAL_KINDS = {
  bank: { suffix: 'National Bank', ticker: 'BNK', sector: 'finance', vol: 0.2, div: 0.035, price: 40 },
  power: { suffix: 'Power & Gas', ticker: 'PWR', sector: 'energy', vol: 0.18, div: 0.045, price: 30 },
  retail: { suffix: 'Retail Group', ticker: 'RTL', sector: 'consumer', vol: 0.15, div: 0.03, price: 25 },
};
export const localIds = (cc) => (cc && cc !== 'US' ? Object.keys(LOCAL_KINDS).map((k) => `local_${cc}_${k}`) : []);
/** A company's listing details, named or local (local_<CC>_<kind>). */
export function companyDef(id) {
  if (ALL_COMPANIES[id]) return ALL_COMPANIES[id];
  const m = /^local_([A-Z]{2})_(\w+)$/.exec(id);
  const k = m && LOCAL_KINDS[m[2]];
  if (!k || !COUNTRIES[m[1]]) return null;
  return { ...k, name: `${COUNTRIES[m[1]].name} ${k.suffix}`, ticker: `${m[1]}.${k.ticker}`, local: m[1] };
}
/** The exchange where you live. */
export const exchangeName = (state) => (STOCK_INDEX[state.character.countryId ?? 'US'] ? `${STOCK_INDEX[state.character.countryId ?? 'US']} exchange` : `${COUNTRIES[state.character.countryId ?? 'US']?.name ?? 'Local'} stock exchange`);
export const SHORT_FEE = 0.03;
/** An option premium as a share of the stock price (one year, at the money). */
export const premiumRate = (id) => Math.round((0.06 + companyDef(id).vol * 0.3) * 1000) / 1000;

const sideRng = (state, salt) => new Random(((state.world?.seed ?? 1) * 92821 + state.character.age * 3343 + salt) >>> 0);
const round2 = (n) => Math.round(n * 100) / 100;

export function ensureStocks(state) {
  state.stocks ??= { companies: Object.fromEntries(Object.entries(COMPANIES).map(([id, c]) => [id, { price: c.price, eps: round2(c.price / 20), listedAge: 0 }])), positions: {}, shorts: {}, options: [], bubble: null, ipos: [] };
  return state.stocks;
}
/** What trades where you live: the global names, this country's blue chips, and anything you still hold from elsewhere. */
export const listed = (state) => Object.entries(state.stocks?.companies ?? {}).filter(([id, c]) => !c.delisted && (!id.startsWith('local_') || localIds(state.character.countryId).includes(id) || state.stocks.positions[id] || state.stocks.shorts[id] || state.stocks.options.some((o) => o.companyId === id)));
export const priceOf = (state, id) => state.stocks?.companies?.[id]?.price ?? 0;

export function stockValue(state) {
  const s = state.stocks;
  if (!s) return { long: 0, short: 0, options: 0, total: 0 };
  const long = Object.entries(s.positions).reduce((t, [id, p]) => t + p.shares * priceOf(state, id), 0);
  const short = Object.entries(s.shorts).reduce((t, [id, p]) => t + (p.entry - priceOf(state, id)) * p.shares, 0);
  const options = s.options.reduce((t, o) => t + optionValue(state, o), 0);
  return { long: Math.round(long), short: Math.round(short), options: Math.round(options), total: Math.round(long + short + options) };
}
export function optionValue(state, o) {
  const p = priceOf(state, o.companyId);
  return Math.max(0, (o.kind === 'call' ? p - o.strike : o.strike - p) * o.shares);
}

/** Realise a gain or loss for tax. */
function realise(ctx, proceeds, basis, label, longTerm) {
  const gain = Math.round(proceeds - basis);
  if (gain > 0) {
    ctx.state.finances.cash += Math.round(basis);
    ctx.earn(gain, `${longTerm ? 'Long' : 'Short'}-term capital gain — ${label}`, { ltcg: longTerm });
  } else {
    ctx.state.finances.cash += Math.max(0, Math.round(proceeds));
    if (gain < 0) ctx.deduct(Math.min(3000, -gain), 'Capital loss', { nonCash: true });
  }
}

function sellPosition(ctx, id) {
  const { state } = ctx;
  const p = state.stocks.positions[id];
  if (!p) return 0;
  const proceeds = p.shares * priceOf(state, id);
  realise(ctx, proceeds, p.basis, companyDef(id).name, state.character.age - p.boughtAge >= 1);
  delete state.stocks.positions[id];
  return Math.round(proceeds);
}
function coverShort(ctx, id, forced = false) {
  const { state } = ctx;
  const s = state.stocks.shorts[id];
  if (!s) return 0;
  const pnl = Math.round((s.entry - priceOf(state, id)) * s.shares);
  // The collateral held against the short comes back, plus or minus the result.
  state.finances.cash += Math.round(s.entry * s.shares);
  if (pnl > 0) {
    state.finances.cash -= pnl;
    ctx.earn(pnl, `Short-sale gain — ${companyDef(id).name}`);
  } else {
    state.finances.cash += pnl;
    ctx.deduct(Math.min(3000, -pnl), 'Capital loss', { nonCash: true });
  }
  delete state.stocks.shorts[id];
  ctx.log(forced ? `Margin call: your broker bought back your ${companyDef(id).ticker} short at a loss of $${(-pnl).toLocaleString()}.` : `You covered your ${companyDef(id).ticker} short: ${pnl >= 0 ? `+$${pnl.toLocaleString()}` : `-$${(-pnl).toLocaleString()}`}.`, '📉', pnl >= 0 ? 'good' : 'bad');
  return pnl;
}

/** The year on the exchange: bubbles, prices, earnings, collapses and IPOs. */
export function stocksTick(ctx) {
  const { state } = ctx;
  const s = ensureStocks(state);
  const e = state.economy;
  const rng = sideRng(state, 0x570c);
  const held = (id) => s.positions[id] || s.shorts[id] || s.options.some((o) => o.companyId === id);

  // Your country's own exchange lists its blue chips.
  for (const id of localIds(state.character.countryId)) s.companies[id] ??= { price: companyDef(id).price, eps: round2(companyDef(id).price / 15), listedAge: state.character.age };

  // Manias start in good times and end badly.
  let bubbleMove = null;
  if (!s.bubble && ['expansion', 'peak'].includes(e.phase) && rng.chance(0.07)) {
    const sector = rng.chance(0.55) ? 'tech' : rng.pick(Object.keys(SECTORS));
    s.bubble = { sector, years: 0 };
    ctx.log(`📈 ${SECTORS[sector].name} mania: every ${SECTORS[sector].name.toLowerCase()} stock is "the next big thing", and valuations have stopped making sense.`, '🫧', 'warn');
  }
  if (s.bubble) {
    s.bubble.years += 1;
    if (e.phase === 'recession' || s.bubble.years > 4 || (s.bubble.years >= 2 && rng.chance(0.35))) {
      bubbleMove = { sector: s.bubble.sector, ret: -rng.float(0.45, 0.7) };
      ctx.log(`💥 The ${SECTORS[s.bubble.sector].name.toLowerCase()} bubble burst. Paper fortunes vanished in weeks.`, '💥', 'bad');
      s.bubble = null;
    } else bubbleMove = { sector: s.bubble.sector, ret: rng.float(0.25, 0.7) };
  }

  for (const [id, c] of listed(state)) {
    const def = companyDef(id);
    const sector = e.returns?.sectors?.[def.sector] ?? e.returns?.index ?? 0.05;
    // Earnings: a beat or a miss moves the stock more than the market does.
    const surprise = rng.float(-1, 1) * def.vol;
    let ret = sector + surprise * 0.8 + (bubbleMove?.sector === def.sector ? bubbleMove.ret : 0);
    c.eps = round2(Math.max(0.01, c.eps * (1 + sector * 0.5 + surprise * 0.6)));
    // A collapse: fraud, a failed drug, a debt spiral.
    const collapse = rng.chance(def.vol >= 0.45 ? 0.025 : 0.006);
    if (collapse) ret = -0.97;
    c.price = round2(Math.max(0.05, c.price * (1 + realReturn(e, Math.max(-0.97, ret)))));
    if (held(id)) {
      if (collapse) ctx.log(`💀 ${def.name} (${def.ticker}) collapsed after an accounting scandal and was delisted.`, '💀', 'bad');
      else if (Math.abs(surprise) > def.vol * 0.5) ctx.log(`${def.ticker} earnings ${surprise > 0 ? 'beat' : 'missed'} expectations: the stock ${ret >= 0 ? 'rose' : 'fell'} ${Math.abs(Math.round(ret * 100))}% to $${c.price.toLocaleString()}.`, surprise > 0 ? '📈' : '📉', surprise > 0 ? 'good' : 'warn');
    }
    if (collapse) c.delisted = true;
  }

  // Dividends on what you hold.
  const div = Object.entries(s.positions).reduce((t, [id, p]) => t + p.shares * priceOf(state, id) * companyDef(id).div, 0);
  if (div >= 1) ctx.earn(Math.round(div), 'Qualified dividends', { ltcg: true });
  // A delisted stock is worth nothing: the loss is realised.
  for (const id of Object.keys(s.positions)) if (s.companies[id]?.delisted) { realise(ctx, 0, s.positions[id].basis, companyDef(id).name, true); delete s.positions[id]; }
  for (const id of Object.keys(s.shorts)) if (s.companies[id]?.delisted) { s.companies[id].price = 0; coverShort(ctx, id); }

  // Shorts: the borrow fee, and a margin call if the loss passes the collateral.
  for (const [id, sh] of Object.entries(s.shorts)) {
    ctx.spend(Math.round(sh.entry * sh.shares * SHORT_FEE), `Stock borrow fee — ${companyDef(id).ticker}`, { allowDebt: true });
    if (priceOf(state, id) >= sh.entry * 2) coverShort(ctx, id, true);
  }
  // Options expire after a year: in the money pays out, out of the money is worth nothing.
  for (const o of [...s.options]) {
    if (state.character.age < o.expires) continue;
    const payout = Math.round(optionValue(state, o));
    const label = `${companyDef(o.companyId).ticker} ${o.kind}`;
    realise(ctx, payout, o.premium, `${label} option`, false);
    ctx.log(payout > 0 ? `Your ${label} options expired in the money: $${payout.toLocaleString()} on $${o.premium.toLocaleString()} paid.` : `Your ${label} options expired worthless.`, '🎟️', payout > o.premium ? 'good' : 'bad');
    s.options = s.options.filter((x) => x !== o);
  }

  // A new listing.
  const next = Object.keys(IPO_POOL).find((id) => !s.ipos.includes(id));
  const failed = Object.keys(COMPANIES).filter((id) => s.companies[id]?.delisted).length;
  if (next && rng.chance(['expansion', 'peak'].includes(e.phase) ? 0.2 + failed * 0.05 : 0.05)) {
    s.ipos.push(next);
    const def = IPO_POOL[next];
    const pop = rng.float(-0.25, 0.9) + (s.bubble?.sector === def.sector ? 0.5 : 0);
    s.companies[next] = { price: round2(def.price * (1 + pop)), eps: round2(def.price / 60), listedAge: state.character.age };
    if (state.character.age >= 18 && state.finances.cash >= 5000 && !state.legal?.incarceration) {
      ctx.prompt({
        type: 'stocks.ipo', icon: '🔔', title: `IPO: ${def.name}`,
        text: `${def.name} (${def.ticker}) is going public at $${def.price} a share. Your broker can get you a small allocation at the offer price before it starts trading.`,
        options: [
          { id: 'small', label: '🎟️ Ask for $5,000 worth' },
          { id: 'big', label: '🔔 Ask for $25,000 worth', disabled: state.finances.cash < 25000 },
          { id: 'pass', label: '🙅 Pass' },
        ],
        data: { id: next, offer: def.price, pop: round2(pop) },
      });
    } else ctx.log(`🔔 ${def.name} (${def.ticker}) went public and ${pop >= 0 ? 'rose' : 'fell'} ${Math.abs(Math.round(pop * 100))}% on its first day.`, '🔔', 'info');
  }
}

const parse = (arg) => { const [id, a, b] = String(arg).split(':'); return { id, a, b }; };

export const StockMarketModule = {
  id: 'stocks',
  order: 86.5,

  init(state) { ensureStocks(state); },

  onAgeUp(ctx) {
    if (ctx.state.investing) stocksTick(ctx);
  },

  actions: {
    /** arg 'companyId:amount' */
    buy(ctx, arg) {
      const { state } = ctx;
      const { id, a } = parse(arg);
      const amount = Math.round(Number(a));
      const s = ensureStocks(state);
      const c = s.companies[id];
      if (!c || c.delisted || !(amount > 0)) return;
      if (state.character.age < 18) return ctx.toast('You need to be 18 to trade.', 'warn');
      if (state.finances.cash < amount) return ctx.toast(`You need $${amount.toLocaleString()} in cash.`, 'warn');
      const shares = amount / c.price;
      const p = (s.positions[id] ??= { shares: 0, basis: 0, boughtAge: state.character.age });
      p.shares += shares;
      p.basis += amount;
      p.boughtAge = state.character.age;
      state.finances.cash -= amount;
      ctx.log(`You bought $${amount.toLocaleString()} of ${companyDef(id).name} (${companyDef(id).ticker}) at $${c.price.toLocaleString()}.`, '📈');
    },
    sell(ctx, id) {
      const proceeds = sellPosition(ctx, id);
      if (proceeds) ctx.log(`You sold your ${companyDef(id).ticker} shares for $${proceeds.toLocaleString()}.`, '💵');
    },
    /** arg 'companyId:amount' — sell borrowed shares; the proceeds are held as collateral. */
    short(ctx, arg) {
      const { state } = ctx;
      const { id, a } = parse(arg);
      const amount = Math.round(Number(a));
      const s = ensureStocks(state);
      const c = s.companies[id];
      if (!c || c.delisted || !(amount > 0) || s.shorts[id]) return;
      if (state.character.age < 18) return ctx.toast('You need to be 18 to trade.', 'warn');
      // Margin: you need cash equal to the position.
      if (state.finances.cash < amount) return ctx.toast(`Shorting $${amount.toLocaleString()} needs that much cash as margin.`, 'warn');
      s.shorts[id] = { shares: amount / c.price, entry: c.price };
      state.finances.cash -= amount;
      ctx.log(`You shorted $${amount.toLocaleString()} of ${companyDef(id).ticker} at $${c.price.toLocaleString()}: you win if it falls.`, '📉', 'warn');
    },
    cover(ctx, id) { coverShort(ctx, id); },
    /** arg 'companyId:call|put:premium' — one-year, at-the-money options. */
    option(ctx, arg) {
      const { state, rng } = ctx;
      const { id, a: kind, b } = parse(arg);
      const premium = Math.round(Number(b));
      const s = ensureStocks(state);
      const c = s.companies[id];
      if (!c || c.delisted || !['call', 'put'].includes(kind) || !(premium > 0)) return;
      if (state.character.age < 18) return ctx.toast('You need to be 18 to trade.', 'warn');
      if (state.finances.cash < premium) return ctx.toast(`You need $${premium.toLocaleString()} in cash.`, 'warn');
      const shares = premium / (c.price * premiumRate(id));
      s.options.push({ id: rng.id('opt_'), companyId: id, kind, strike: c.price, shares, premium, expires: state.character.age + 1 });
      state.finances.cash -= premium;
      ctx.log(`You bought $${premium.toLocaleString()} of one-year ${companyDef(id).ticker} ${kind}s at a $${c.price.toLocaleString()} strike.`, '🎟️', 'warn');
    },
  },

  resolvers: {
    ipo(ctx, data, optionId) {
      const { state } = ctx;
      if (optionId === 'pass') return ctx.log(`You passed on the ${IPO_POOL[data.id].name} IPO. It ${data.pop >= 0 ? 'rose' : 'fell'} ${Math.abs(Math.round(data.pop * 100))}% on day one.`, '🔔');
      const want = optionId === 'big' ? 25000 : 5000;
      // Hot deals are oversubscribed: you get less than you asked for.
      const amount = Math.min(Math.floor(state.finances.cash), Math.round(want * (data.pop > 0.3 ? 0.4 : 1)));
      if (amount < 100) return;
      const s = ensureStocks(state);
      const p = (s.positions[data.id] ??= { shares: 0, basis: 0, boughtAge: state.character.age });
      p.shares += amount / data.offer;
      p.basis += amount;
      state.finances.cash -= amount;
      ctx.log(`You got $${amount.toLocaleString()} of ${IPO_POOL[data.id].ticker} at the offer price${amount < want ? ' (the deal was oversubscribed)' : ''}. It ${data.pop >= 0 ? 'popped' : 'slid'} ${Math.abs(Math.round(data.pop * 100))}% on its first day.`, '🔔', data.pop >= 0 ? 'good' : 'warn');
    },
  },
};
