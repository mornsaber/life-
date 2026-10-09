/**
 * Running the fleet and the contract book (see Operations): the yearly tick
 * and the owner's actions — buy, finance and sell equipment, hire and cut
 * crews, accept, bid for and walk away from contracts.
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { REGIONS } from '../life/Regions.js';
import { currentBusiness, annualPayment } from './Business.js';
import { syncBusinessOrg } from '../org/Businesses.js';
import { OPERATIONS, opsOf, newOps, capacity, contracted, makeOffers, offerEligibility, resaleValue, EQUIPMENT_LOAN, growthTier, ACCOUNT_TIERS } from './Operations.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;
const MAX_HEADCOUNT = 400;
const plural = (o, n) => (n === 1 ? o.unit.name : o.unit.plural);

/** Older saves: fleet businesses opened before operations existed get a fleet sized to their scale. */
export function ensureOps(rng, biz) {
  if (!biz.ops && OPERATIONS[biz.typeId]) biz.ops = newOps(rng, biz.typeId, biz.scale ?? 1, biz.years ?? 0);
  return opsOf(biz);
}

/** Principal on the equipment loan (interest is in the P&L). */
export function payEquipmentLoan(biz) {
  const loan = biz.ops?.loan;
  if (!loan) return;
  const principal = Math.max(0, Math.min(loan.balance, loan.annual - Math.round(loan.balance * loan.rate)));
  loan.balance -= principal;
  biz.cash -= principal;
  if (loan.balance <= 0) biz.ops.loan = null;
}

/** A year of operations, after the books close. */
export function opsTick(ctx, biz, ly) {
  const { rng } = ctx;
  const o = ensureOps(rng, biz);
  if (!o) return;
  const ops = biz.ops;
  ops.lastUtil = ly?.ops ? Math.round(ly.ops.util * 100) / 100 : null;
  // Equipment ages and breaks.
  if (o.unit) {
    let broke = 0;
    let repairs = 0;
    for (const u of ops.units) {
      u.age += 1;
      if (rng.chance(clamp(0.04 + Math.max(0, u.age - o.unit.life * 0.6) * 0.05 + (u.used ? 0.03 : 0), 0, 0.6))) {
        broke += 1;
        repairs += Math.round(o.upkeep * rng.float(0.3, 1.2));
      }
    }
    if (broke) {
      biz.cash -= repairs;
      ops.breakdowns = (ops.breakdowns ?? 0) + broke;
      ctx.log(`${broke} of ${biz.name}'s ${o.unit.plural} broke down this year: ${money(repairs)} in repairs and lost days.`, '🔧', 'warn');
    }
    const worn = ops.units.filter((u) => u.age >= o.unit.life).length;
    if (worn) ctx.log(`${worn} ${plural(o, worn)} ${worn === 1 ? 'is' : 'are'} past ${o.unit.life} years old — replacing ${worn === 1 ? 'it' : 'them'} would cut repair bills.`, '🛠️');
  }
  // Contracts: shortfalls cost you clients; terms run down.
  const cap = capacity(biz).capacity;
  if (ly?.ops?.shortfall) {
    biz.reputation = Math.max(0, biz.reputation - 5);
    ctx.log(`${biz.name} couldn't cover ${ly.ops.shortfall} ${o.unit ? plural(o, ly.ops.shortfall) : `${o.crewName} post${ly.ops.shortfall > 1 ? 's' : ''}`} of contracted work: ${money(ly.penalties)} in penalties.`, '⚠️', 'bad');
    if (rng.chance(0.5)) {
      const lost = [...ops.contracts].sort((a, b) => b.units - a.units)[0];
      ops.contracts = ops.contracts.filter((c) => c !== lost);
      ctx.log(`${lost.client} canceled its contract.`, '📉', 'bad');
    }
  }
  const renewals = [];
  for (const c of ops.contracts) c.yearsLeft -= 1;
  for (const c of ops.contracts.filter((x) => x.yearsLeft <= 0)) {
    if (biz.reputation >= 50 && rng.chance(0.6)) {
      // A client whose contractor has outgrown the old deal gives it more of the work.
      const upsize = growthTier(biz) > (c.tier ?? 0);
      renewals.push({ ...c, id: rng.id('k_'), years: rng.int(2, 4), rate: Math.round(c.rate * 1.03 * 100) / 100, renewal: true, units: upsize ? Math.round(c.units * 1.5) + 1 : c.units, tier: upsize ? (c.tier ?? 0) + 1 : c.tier ?? 0, client: upsize ? `${c.client.replace(/ — .* account$/, '')} — ${ACCOUNT_TIERS[(c.tier ?? 0) + 1].label} account` : c.client });
    }
    ctx.log(`${biz.name}'s contract with ${c.client} ended.${renewals.at(-1)?.client === c.client ? ' They want to renew.' : ''}`, '📄');
  }
  ops.contracts = ops.contracts.filter((c) => c.yearsLeft > 0);
  ops.offers = [...renewals, ...makeOffers(rng, biz)];
  // A manager running the place takes work that fits.
  if (biz.autopilot || biz.role !== 'operator') {
    for (const k of [...ops.offers]) {
      if (contracted(biz) + k.units <= cap && offerEligibility(ctx.state, biz, k).ok) accept(biz, k);
    }
  }
}

function accept(biz, k) {
  biz.ops.contracts.push({ id: k.id, client: k.client, units: k.units, rate: k.rate, years: k.years, yearsLeft: k.years, tier: k.tier ?? 0 });
  biz.ops.offers = biz.ops.offers.filter((x) => x.id !== k.id);
}

const withOps = (ctx) => {
  const biz = currentBusiness(ctx.state);
  if (!biz) { ctx.toast('You don\'t own a business.', 'warn'); return {}; }
  const o = ensureOps(ctx.rng, biz);
  if (!o) { ctx.toast('This business doesn\'t run a fleet or crews.', 'warn'); return {}; }
  return { biz, o };
};

/**
 * Airport crash-fire-rescue tenders (private fire contractors). Airports put
 * their ARFF station out to bid: you price it, and the authority weighs
 * your price against your reputation and size.
 */
export const BID_LEVELS = {
  low: { label: 'Low bid', rate: 0.95, odds: 0.65, hint: 'Likely to win, thin margins' },
  market: { label: 'Market price', rate: 1.1, odds: 0.45, hint: 'A fair price' },
  premium: { label: 'Premium bid', rate: 1.25, odds: 0.25, hint: 'Win only on reputation' },
};
export const AIRPORT_BID_COST = 15000;
const AIRPORT_UNITS = { small: 1, medium: 2, large: 3, enterprise: 4 };
export function airportTender(state, biz) {
  const region = REGIONS[state.orgs?.byId?.[biz.orgId]?.regionId ?? state.character.regionId] ?? REGIONS.midcity;
  const units = AIRPORT_UNITS[region.size ?? 'medium'] ?? 2;
  return { airport: `${region.name.split(',')[0]} Airport`, units, years: 5 };
}
export function airportBidEligibility(state, biz) {
  if (biz.typeId !== 'privateFireService') return { ok: false, reason: 'Fire & rescue contractors only' };
  if (yearlyCount(state, 'business.airportBid')) return { ok: false, reason: 'One airport tender a year' };
  if ((biz.ops?.contracts ?? []).some((c) => c.airport)) return { ok: false, reason: 'You already run the airport\'s station' };
  if (biz.reputation < 45) return { ok: false, reason: 'Airports want a reputation of 45+' };
  if (biz.cash < AIRPORT_BID_COST) return { ok: false, reason: `A proposal costs $${AIRPORT_BID_COST.toLocaleString()}` };
  return { ok: true };
}
export const winOdds = (biz, level) => clamp(BID_LEVELS[level].odds + (biz.reputation - 55) / 200 + growthTier(biz) * 0.05, 0.05, 0.9);

export const FleetResolvers = {
  airportBid(ctx, data, optionId) {
    const { state, rng } = ctx;
    const biz = currentBusiness(state);
    const level = BID_LEVELS[optionId];
    if (!biz || !level) return;
    biz.cash -= AIRPORT_BID_COST;
    if (!rng.chance(winOdds(biz, optionId))) return ctx.log(`${data.airport} awarded its ARFF contract to a rival. Your ${level.label.toLowerCase()} lost.`, '✈️', 'warn');
    biz.ops.contracts.push({ id: rng.id('k_'), client: `${data.airport} — ARFF station contract`, units: data.units, rate: level.rate, years: data.years, yearsLeft: data.years, tier: Math.min(3, data.units - 1), airport: true });
    biz.reputation = Math.min(100, biz.reputation + 4);
    const cap = capacity(biz);
    ctx.log(`${biz.name} won the ${data.airport} ARFF contract: ${data.units} crash-rescue station${data.units > 1 ? 's' : ''} for ${data.years} years.${cap.capacity < contracted(biz) ? ' You need more apparatus and crews to cover it — shortfalls draw penalties.' : ''}`, '✈️', 'milestone');
  },
};

export const FleetActions = {
  /** Bid on the local airport's crash-fire-rescue station (fire contractors). */
  airportBid(ctx) {
    const { state } = ctx;
    const biz = currentBusiness(state);
    if (!biz) return;
    const ok = airportBidEligibility(state, biz);
    if (!ok.ok) return ctx.toast(ok.reason, 'warn');
    bumpYearly(state, 'business.airportBid');
    const t = airportTender(state, biz);
    const value = Math.round(t.units * OPERATIONS.privateFireService.perUnit);
    ctx.prompt({
      type: 'business.airportBid', icon: '✈️', title: `${t.airport}: ARFF Tender`,
      text: `${t.airport} is contracting out its aircraft rescue & firefighting: ${t.units} station${t.units > 1 ? 's' : ''} with crash trucks staffed around the clock, for ${t.years} years (about $${value.toLocaleString()} a year at market rates). Your crews need ARFF certification. How do you price it?`,
      options: Object.entries(BID_LEVELS).map(([id, l]) => ({ id, label: `${l.label} · ${Math.round(l.rate * 100)}% of market`, hint: `${Math.round(winOdds(biz, id) * 100)}% odds · ${l.hint}` })),
      data: t,
    });
  },
  /** arg: 'new' | 'used', optionally ':loan' — buy a unit from the business account or with equipment financing. */
  buyUnit(ctx, arg = 'new') {
    const { biz, o } = withOps(ctx);
    if (!biz || !o.unit) return;
    const [kind, how] = String(arg).split(':');
    const used = kind === 'used';
    const price = used ? o.unit.usedCost : o.unit.newCost;
    if (biz.ops.units.length >= 60) return ctx.toast('That\'s as big a fleet as a small business can run.', 'warn');
    if (how === 'loan') {
      if (ctx.state.housing.credit.score < 600) return ctx.toast('Equipment lenders want a 600+ credit score.', 'warn');
      const down = Math.round(price * EQUIPMENT_LOAN.down);
      if (biz.cash < down) return ctx.toast(`Needs ${money(down)} down from the business account.`, 'warn');
      biz.cash -= down;
      const balance = (biz.ops.loan?.balance ?? 0) + price - down;
      biz.ops.loan = { balance, rate: EQUIPMENT_LOAN.rate, annual: annualPayment(balance, EQUIPMENT_LOAN.rate, EQUIPMENT_LOAN.years) };
    } else {
      if (biz.cash < price) return ctx.toast(`Costs ${money(price)} from the business account (or finance it).`, 'warn');
      biz.cash -= price;
    }
    biz.ops.units.push({ id: ctx.rng.id('u_'), age: used ? ctx.rng.int(4, Math.max(5, Math.floor(o.unit.life * 0.6))) : 0, used });
    biz.assets += Math.round(price * 0.8);
    const c = capacity(biz);
    ctx.log(`${biz.name} bought a ${used ? 'used' : 'new'} ${o.unit.name} for ${money(price)}${how === 'loan' ? ' on equipment financing' : ''}. Fleet: ${c.units}.${c.crews < c.units ? ` You need ${c.staffNeeded - biz.staff.headcount} more ${o.crewName}${c.staffNeeded - biz.staff.headcount > 1 ? 's' : ''} to run it all.` : ''}`, o.unit.icon, 'good');
  },
  /** Sell the oldest unit (or arg = unit id). */
  sellUnit(ctx, id) {
    const { biz, o } = withOps(ctx);
    if (!biz || !o.unit) return;
    const units = biz.ops.units;
    if (units.length <= 1) return ctx.toast(`You need at least one ${o.unit.name}.`, 'warn');
    const u = units.find((x) => x.id === id) ?? [...units].sort((a, b) => b.age - a.age)[0];
    const value = resaleValue(o, u);
    biz.ops.units = units.filter((x) => x !== u);
    biz.cash += value;
    biz.assets = Math.max(0, biz.assets - value);
    ctx.log(`${biz.name} sold a ${u.age}-year-old ${o.unit.name} for ${money(value)}.`, o.unit.icon);
  },
  /** Hire one crew's worth of people (arg: number of crews, default 1). */
  hireCrew(ctx, n = 1) {
    const { biz, o } = withOps(ctx);
    if (!biz) return;
    const add = o.crew * Math.max(1, Number(n) || 1);
    biz.staff.headcount = Math.min(MAX_HEADCOUNT, biz.staff.headcount + add);
    ctx.log(`${biz.name} hired ${add === 1 ? `a ${o.crewName}` : `${add} ${o.crewName}s`} (${biz.staff.headcount} on staff).`, '🤝');
    syncBusinessOrg(ctx.state, biz);
  },
  cutCrew(ctx) {
    const { biz, o } = withOps(ctx);
    if (!biz || biz.staff.headcount < o.crew) return;
    biz.staff.headcount -= o.crew;
    biz.staff.morale = Math.max(0, biz.staff.morale - 5);
    ctx.log(`${biz.name} let ${o.crew === 1 ? `a ${o.crewName}` : `a crew of ${o.crew}`} go.`, '✂️', 'warn');
    syncBusinessOrg(ctx.state, biz);
  },
  acceptContract(ctx, id) {
    const { biz } = withOps(ctx);
    if (!biz) return;
    const k = biz.ops.offers.find((x) => x.id === id);
    if (!k) return ctx.toast('That offer is gone.', 'warn');
    const ok = offerEligibility(ctx.state, biz, k);
    if (!ok.ok) return ctx.toast(ok.reason, 'warn');
    accept(biz, k);
    const short = contracted(biz) - capacity(biz).capacity;
    ctx.log(`${biz.name} signed a ${k.years}-year contract with ${k.client}.${short > 0 ? ` You're ${short} short of covering everything you've committed to — add equipment or crews before year's end.` : ''}`, '✍️', short > 0 ? 'warn' : 'good');
  },
  dropContract(ctx, id) {
    const { biz, o } = withOps(ctx);
    if (!biz) return;
    const c = biz.ops.contracts.find((x) => x.id === id);
    if (!c) return;
    const fee = Math.round(c.units * o.perUnit * c.rate * 0.15);
    biz.cash -= fee;
    biz.reputation = Math.max(0, biz.reputation - 4);
    biz.ops.contracts = biz.ops.contracts.filter((x) => x !== c);
    ctx.log(`${biz.name} walked away from its contract with ${c.client}: a ${money(fee)} early-termination fee.`, '📉', 'warn');
  },
  /** Chase more work: proposals, bid bonds and a sales push. */
  bid(ctx) {
    const { biz } = withOps(ctx);
    if (!biz) return;
    if (yearlyCount(ctx.state, 'business.bid')) return ctx.toast('One bidding push a year.', 'warn');
    const cost = 5000 + Math.round(capacity(biz).units * 500);
    if (biz.cash < cost) return ctx.toast(`Bidding costs ${money(cost)} from the business account.`, 'warn');
    bumpYearly(ctx.state, 'business.bid');
    biz.cash -= cost;
    biz.ops.offers.push(...makeOffers(ctx.rng, biz, 2));
    ctx.log(`${biz.name} put out proposals (${money(cost)}). Two more clients want quotes.`, '📨');
  },
};
