/**
 * Housing: where you sleep and what it costs.
 *
 * Status is derived, in priority order:
 *   incarcerated → military (barracks/base housing) → employerProvided
 *   (park quarters, embassy housing) → owner (a primary home in your
 *   region) → renting → parents → homeless
 *
 * Rent and owning costs are charged here (Finances covers everything else).
 * Missed rent → eviction → back to your parents if you're young, otherwise
 * homelessness, which hurts health, happiness and job performance until you
 * can scrape together a deposit.
 *
 * state.housing = { withParents, rental, properties[], listings[], credit,
 *                   market, cycle, rates, homelessYears, manager }
 */
import { isOnActiveDuty, yearlyCount, bumpYearly } from '../../core/State.js';
import { REGIONS, regionOf } from '../life/Regions.js';
import { STATES } from '../life/States.js';
import { hasHousingBenefit } from '../life/Finances.js';
import { PROPERTY_TYPES, RENT_TIERS, priceOf, tierRent, sellingCostRate, generateListings, marketTick } from './PropertyMarket.js';
import { LOAN_TYPES, quote, originate, serviceDebt, computeCreditScore, recordCreditEvent, refinance, drawHeloc, repayHeloc, canCover } from './MortgageSystem.js';
import { maintenanceTick, resolveRepair, renovate } from './Maintenance.js';
import { landlordTick, resolveLateRent } from './Landlording.js';

export const STATUS_LABEL = {
  incarcerated: { label: 'Incarcerated', icon: '🔒' },
  military: { label: 'Military housing', icon: '🪖' },
  employerProvided: { label: 'Employer-provided housing', icon: '🏕️' },
  owner: { label: 'Homeowner', icon: '🏡' },
  renting: { label: 'Renting', icon: '🔑' },
  parents: { label: 'Living with parents', icon: '🛋️' },
  homeless: { label: 'Homeless', icon: '🥶' },
};

export function primaryHome(state) {
  return state.housing.properties.find((p) => p.use === 'primary' && p.regionId === state.character.regionId) ?? null;
}

export function housingStatus(state) {
  if (state.legal.incarceration) return 'incarcerated';
  if (isOnActiveDuty(state)) return 'military';
  if (hasHousingBenefit(state)) return 'employerProvided';
  if (primaryHome(state)) return 'owner';
  if (state.housing.rental) return 'renting';
  if (state.housing.withParents || state.character.age < 18) return 'parents';
  return 'homeless';
}

const isFirstHome = (state) => !state.housing.everOwned;

function endLease(ctx, reason, { fee = true } = {}) {
  const r = ctx.state.housing.rental;
  if (!r) return;
  if (fee && r.leaseYearsLeft > 0) ctx.spend(r.rent, 'Lease break fee', { allowDebt: true });
  ctx.state.housing.rental = null;
  if (reason) ctx.log(reason, '🔑');
}

function startRental(ctx, tier, { auto = false } = {}) {
  const { state } = ctx;
  const rent = tierRent(state, tier, state.character.regionId);
  if (!RENT_TIERS[tier].subsidized) ctx.spend(rent * 2, 'Security deposit + first month', { allowDebt: true });
  state.housing.rental = { tier, rent, leaseYearsLeft: 1, regionId: state.character.regionId };
  state.housing.withParents = false;
  state.housing.homelessYears = 0;
  ctx.log(`${auto ? 'You found a place: ' : 'You signed a lease: '}${RENT_TIERS[tier].name} in ${regionOf(state).name} for $${rent.toLocaleString()}/mo.`, RENT_TIERS[tier].icon);
}

function sellProperty(ctx, property, { forced = false } = {}) {
  const { state } = ctx;
  const gross = property.value;
  const costs = Math.round(gross * sellingCostRate(state));
  const owed = (property.mortgage?.balance ?? 0) + (property.heloc?.balance ?? 0);
  const proceeds = gross - costs - owed;
  if (proceeds < 0 && !forced && state.finances.cash < -proceeds) {
    ctx.toast(`You're underwater — closing needs $${(-proceeds).toLocaleString()} you don't have.`, 'warn');
    return false;
  }
  const gain = gross - costs - property.purchasePrice;
  const heldYears = state.character.age - property.purchaseAge;
  const excluded = property.use === 'primary' && heldYears >= 2 ? 250000 : 0;
  const taxable = Math.max(0, gain - excluded);
  state.finances.cash += proceeds - taxable;
  if (taxable > 0) ctx.earn(taxable, 'Capital gains (real estate)');
  state.housing.properties = state.housing.properties.filter((p) => p !== property);
  ctx.log(`You sold your ${property.typeName} for $${gross.toLocaleString()} (${costs ? `$${costs.toLocaleString()} in commissions/closing, ` : ''}${owed ? `$${owed.toLocaleString()} to the bank, ` : ''}net $${proceeds.toLocaleString()}).${gain > 0 ? ` Profit: $${gain.toLocaleString()}${excluded && gain <= excluded ? ' (tax-free home sale)' : ''}.` : ''}`, '🪧', proceeds >= 0 ? 'good' : 'warn');
  return true;
}

function financingPrompt(ctx, listing) {
  const { state } = ctx;
  const quotes = Object.keys(LOAN_TYPES).map((id) => [id, quote(state, listing.price, id)]);
  const options = quotes.map(([id, q]) => ({
    id,
    label: `🏦 ${LOAN_TYPES[id].name} @ ${(q.rate * 100).toFixed(2)}%`,
    hint: q.ok ? `$${q.cashNeeded.toLocaleString()} down+closing · $${Math.round((q.payment + q.mip) / 12).toLocaleString()}/mo` : q.reason,
    disabled: !q.ok,
  }));
  const cashNeeded = Math.round(listing.price * 1.03);
  options.push({ id: 'cash', label: `💵 Pay cash ($${cashNeeded.toLocaleString()})`, disabled: state.finances.cash < cashNeeded, hint: state.finances.cash < cashNeeded ? 'Not enough cash' : 'No mortgage' });
  const dtiOnly = quotes.find(([, q]) => q.dtiFail && state.housing.credit.score >= LOAN_TYPES.conv30.minScore);
  if (dtiOnly && !options.some((o) => !o.disabled)) {
    const fq = quote(state, listing.price, 'conv30', { inflateIncome: true });
    if (fq.ok) options.push({ id: 'fraud', label: '📝 "Adjust" the income on your application', hint: 'Mortgage fraud is a federal felony', tone: 'danger' });
  }
  options.push({ id: 'cancel', label: '↩️ Walk away' });
  ctx.prompt({
    type: 'housing.financing',
    icon: PROPERTY_TYPES[listing.type].icon,
    title: `Financing: ${PROPERTY_TYPES[listing.type].name}`,
    text: `$${listing.price.toLocaleString()} in ${REGIONS[listing.regionId].name}. Credit score ${state.housing.credit.score}. Base rate ${(state.housing.rates.base * 100).toFixed(2)}%.`,
    options,
    data: { listing },
  });
}

function completePurchase(ctx, listing, loanType, q) {
  const { state } = ctx;
  const def = PROPERTY_TYPES[listing.type];
  const canLiveHere = !primaryHome(state) && !isOnActiveDuty(state) && !hasHousingBenefit(state);
  const property = {
    id: ctx.rng.id('prop_'),
    type: listing.type,
    typeName: def.name,
    regionId: listing.regionId,
    value: listing.price,
    valueAdj: Math.round((listing.price / priceOf(state, listing.type, listing.regionId)) * 1000) / 1000,
    purchasePrice: listing.price,
    purchaseAge: state.character.age,
    condition: listing.condition,
    use: canLiveHere ? 'primary' : 'rental',
    mortgage: null,
    heloc: null,
    tenants: [],
    insured: true,
    floodInsured: false,
  };
  if (q) {
    ctx.spend(q.cashNeeded, 'Down payment + closing costs');
    originate(property, loanType, q);
  } else ctx.spend(Math.round(listing.price * 1.03), 'Cash home purchase');
  state.housing.properties.push(property);
  state.housing.listings = state.housing.listings.filter((l) => l.id !== listing.id);
  if (property.use === 'primary') {
    endLease(ctx, null);
    state.housing.withParents = false;
  }
  const first = isFirstHome(state);
  state.housing.everOwned = true;
  ctx.log(`${first ? 'You bought your first home! ' : 'You bought '}${first ? '' : 'a '}${def.name} in ${REGIONS[listing.regionId].name} for $${listing.price.toLocaleString()}${q ? ` with a ${LOAN_TYPES[loanType].name} at ${(q.rate * 100).toFixed(2)}%` : ' in cash'}. ${property.use === 'primary' ? 'You moved in.' : 'It\'ll be a rental.'}`, def.icon, 'milestone');
  ctx.toast(`🏡 Bought: ${def.name}`, 'good');
  ctx.stat('happiness', first ? 12 : 5);
}

/* ------------------------------------------------------------------ */
/* Disasters                                                           */
/* ------------------------------------------------------------------ */

const COVERAGE = { hurricane: 0.75, wildfire: 0.9, blizzard: 0.9, flood: 0, earthquake: 0 };

function disasterDamage(ctx, { type, severity, stateId, name }) {
  const { state, rng } = ctx;
  for (const regionId of Object.keys(REGIONS).filter((r) => REGIONS[r].state === stateId)) {
    state.housing.market[regionId] = Math.round((state.housing.market[regionId] ?? 1) * (1 - severity * 0.03) * 1000) / 1000;
  }
  for (const p of state.housing.properties) {
    if (REGIONS[p.regionId].state !== stateId || !rng.chance(0.5)) continue;
    const damage = Math.round(p.value * severity * rng.float(0.03, 0.08));
    const coverage = type === 'flood' && p.floodInsured ? 0.9 : COVERAGE[type];
    const paid = p.insured ? Math.max(0, Math.round(damage * coverage - p.value * 0.02)) : 0;
    ctx.spend(damage - paid, `${name} damage`, { allowDebt: true });
    p.condition = Math.max(0, p.condition - severity * 10);
    ctx.log(`The ${name.toLowerCase()} damaged your ${p.typeName}: $${damage.toLocaleString()} in damage, insurance paid $${paid.toLocaleString()}${coverage === 0 ? ` (standard policies exclude ${type}s)` : ''}.`, '🏚️', 'bad');
  }
  const status = housingStatus(state);
  if (status === 'renting' || status === 'homeless') {
    const cost = rng.int(500, 3000) * severity;
    ctx.spend(cost, 'Disaster displacement', { allowDebt: true });
    ctx.log(`You were displaced for weeks and lost belongings ($${cost.toLocaleString()}).`, '🧳', 'warn');
  }
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export const HousingEngine = {
  id: 'housing',
  order: 45,

  init(state) {
    const h = state.housing;
    h.withParents ??= true;
    h.cycle ??= { phase: 'normal', years: 0 };
    h.credit.score = computeCreditScore(state);
  },

  setup(engine) {
    const bus = engine.bus;
    bus.on('credit:event', ({ ctx, type }) => recordCreditEvent(ctx.state, type));
    bus.on('housing:leavingPrimary', ({ ctx, decision }) => {
      const home = ctx.state.housing.properties.find((p) => p.use === 'primary');
      if (!home) return;
      if (decision === 'sell') sellProperty(ctx, home, { forced: true });
      else home.use = decision === 'rent' ? 'rental' : 'vacant';
    });
    bus.on('region:changed', ({ ctx, to, voluntary }) => {
      const { state } = ctx;
      // A home left behind on an involuntary move (PCS, duty station) becomes a managed rental.
      for (const p of state.housing.properties) {
        if (p.use === 'primary' && p.regionId !== to) {
          p.use = 'rental';
          state.housing.manager = true;
          ctx.log(`You hired a property manager to rent out your ${p.typeName} while you're away.`, '🔑');
        }
      }
      const tier = state.housing.rental?.tier ?? 'apartment';
      if (state.housing.rental) endLease(ctx, null, { fee: true });
      if (!isOnActiveDuty(state) && !hasHousingBenefit(state) && !primaryHome(state) && state.character.age >= 18 && (voluntary || !state.housing.withParents)) startRental(ctx, tier, { auto: true });
      generateListings(ctx);
    });
    bus.on('legal:incarcerated', ({ ctx }) => {
      endLease(ctx, 'Your landlord terminated your lease while you were incarcerated.', { fee: false });
      ctx.state.housing.withParents = false;
    });
    bus.on('disaster:struck', ({ ctx, disaster }) => disasterDamage(ctx, disaster));
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const h = state.housing;
    const age = state.character.age;
    marketTick(ctx);
    if (age >= 16) generateListings(ctx);

    // Housing provided by the military or an employer replaces your lease.
    const status = housingStatus(state);
    if (h.rental && (status === 'military' || status === 'employerProvided')) endLease(ctx, 'You gave up your lease for provided housing.', { fee: false });

    // Rent
    if (h.rental && status === 'renting') {
      if (RENT_TIERS[h.rental.tier].subsidized) h.rental.rent = tierRent(state, 'subsidized', state.character.regionId);
      const annual = h.rental.rent * 12;
      if (canCover(state, annual)) {
        ctx.spend(annual, 'Rent', { allowDebt: true });
        h.credit.onTime += 1;
        h.rental.leaseYearsLeft = 1;
        if (!RENT_TIERS[h.rental.tier].subsidized) h.rental.rent = Math.round(h.rental.rent * (1 + rng.float(0.02, 0.05)));
      } else {
        recordCreditEvent(state, 'eviction');
        h.rental = null;
        ctx.log('You fell months behind on rent and were evicted.', '📦', 'bad');
        ctx.toast('Evicted!', 'bad');
        ctx.stat('happiness', -15);
        h.withParents = age < 45 && rng.chance(0.75);
        if (h.withParents) ctx.log('Your parents took you back in. Your childhood bedroom still has the posters.', '🛋️', 'warn');
      }
    }

    // Owned properties
    for (const p of [...h.properties]) {
      if (!serviceDebt(ctx, p)) continue;
      maintenanceTick(ctx, p);
      landlordTick(ctx, p);
    }

    // Life consequences of where you live
    const now = housingStatus(state);
    if (now === 'homeless') {
      h.homelessYears += 1;
      ctx.stat('health', -4);
      ctx.stat('happiness', -10);
      ctx.emit('career:adjust', { performance: -15 });
      const deposit = tierRent(state, 'roommates', state.character.regionId) * 2;
      if (state.finances.cash >= deposit) startRental(ctx, 'roommates', { auto: true });
      else if (state.career.job || rng.chance(0.5)) {
        ctx.log('A caseworker got you a housing voucher.', '🏘️', 'good');
        startRental(ctx, 'subsidized', { auto: true });
      } else ctx.log('You spent the year couch-surfing and in shelters.', '🥶', 'bad');
    } else if (now === 'parents' && age >= 26) {
      ctx.stat('happiness', -2);
    }

    h.credit.score = computeCreditScore(state);
  },

  actions: {
    rent(ctx, tier) {
      const { state } = ctx;
      if (!RENT_TIERS[tier] || RENT_TIERS[tier].subsidized) return;
      if (state.character.age < 18) return ctx.toast('You need to be 18 to sign a lease.', 'warn');
      if (primaryHome(state)) return ctx.toast('You own a home here.', 'warn');
      if (['military', 'employerProvided', 'incarcerated'].includes(housingStatus(state))) return ctx.toast('Your housing is provided.', 'warn');
      const recentEviction = state.housing.credit.events.some((e) => e.type === 'eviction' && state.character.age - e.age < 3);
      if (recentEviction && ctx.rng.chance(0.6)) return ctx.toast('The landlord saw your eviction record and passed.', 'bad');
      if (state.housing.credit.score < 560 && tier === 'house') return ctx.toast('Landlords want a 560+ credit score for a house.', 'warn');
      if (state.housing.rental) endLease(ctx, null);
      startRental(ctx, tier);
    },
    moveInWithParents(ctx) {
      const { state } = ctx;
      if (state.character.age >= 45) return ctx.toast('Your parents have downsized to a one-bedroom condo.', 'warn');
      if (primaryHome(state)) return ctx.toast('You own a home.', 'warn');
      endLease(ctx, 'You moved back in with your parents.');
      state.housing.withParents = true;
    },
    buy(ctx, listingId) {
      const { state } = ctx;
      const listing = state.housing.listings.find((l) => l.id === listingId);
      if (!listing) return;
      if (state.character.age < 18) return ctx.toast('Too young to buy property.', 'warn');
      if (yearlyCount(state, 'housing.buy') >= 2) return ctx.toast('Two purchases a year is plenty.', 'warn');
      financingPrompt(ctx, listing);
    },
    sell(ctx, propertyId) {
      const p = ctx.state.housing.properties.find((x) => x.id === propertyId);
      if (p) sellProperty(ctx, p);
    },
    /** arg 'propertyId:use' — primary | rental | vacant */
    setUse(ctx, arg) {
      const { state } = ctx;
      const [id, use] = String(arg).split(':');
      const p = state.housing.properties.find((x) => x.id === id);
      if (!p || !['primary', 'rental', 'vacant'].includes(use)) return;
      if (use === 'primary') {
        if (p.regionId !== state.character.regionId) return ctx.toast('You can only live in a home in your region.', 'warn');
        const current = primaryHome(state);
        if (current) current.use = 'rental';
        endLease(ctx, null);
        p.tenants = [];
      }
      p.use = use;
      ctx.log(`Your ${p.typeName} is now ${use === 'primary' ? 'your home' : use === 'rental' ? 'a rental' : 'vacant'}.`, '🏡');
    },
    refinance(ctx, propertyId) {
      const p = ctx.state.housing.properties.find((x) => x.id === propertyId);
      if (p) refinance(ctx, p);
    },
    heloc(ctx, propertyId) {
      const p = ctx.state.housing.properties.find((x) => x.id === propertyId);
      if (p) drawHeloc(ctx, p);
    },
    repayHeloc(ctx, propertyId) {
      const p = ctx.state.housing.properties.find((x) => x.id === propertyId);
      if (p) repayHeloc(ctx, p);
    },
    /** arg 'propertyId:kind' */
    renovate(ctx, arg) {
      const [id, kind] = String(arg).split(':');
      const p = ctx.state.housing.properties.find((x) => x.id === id);
      if (!p) return;
      if (yearlyCount(ctx.state, `housing.reno.${id}`)) return ctx.toast('One project per property per year.', 'warn');
      bumpYearly(ctx.state, `housing.reno.${id}`);
      renovate(ctx, p, kind);
    },
    floodInsurance(ctx, propertyId) {
      const p = ctx.state.housing.properties.find((x) => x.id === propertyId);
      if (!p) return;
      p.floodInsured = !p.floodInsured;
      ctx.toast(p.floodInsured ? 'Flood insurance added' : 'Flood insurance dropped', 'info');
    },
    toggleManager(ctx) {
      ctx.state.housing.manager = !ctx.state.housing.manager;
      ctx.toast(ctx.state.housing.manager ? 'Property manager hired (10% of rents)' : 'You\'re self-managing your rentals', 'info');
    },
    /** Insurance arson: misconduct with a property. */
    arson(ctx, propertyId) {
      const { state } = ctx;
      const p = state.housing.properties.find((x) => x.id === propertyId);
      if (!p) return;
      const payout = p.insured ? Math.round(p.value * 0.85) : 0;
      const owed = (p.mortgage?.balance ?? 0) + (p.heloc?.balance ?? 0);
      state.housing.properties = state.housing.properties.filter((x) => x !== p);
      state.finances.cash += payout - owed;
      ctx.log(`Your ${p.typeName} "accidentally" burned down. Insurance paid $${payout.toLocaleString()}.`, '🔥', 'warn');
      ctx.emit('legal:offense', { offenseId: 'arson', context: `insurance fire at your ${p.typeName.toLowerCase()}`, discovery: 0.35, evidence: 0.75 });
    },
  },

  resolvers: {
    financing(ctx, data, optionId) {
      const { state } = ctx;
      const listing = data.listing;
      if (optionId === 'cancel') return;
      bumpYearly(state, 'housing.buy');
      if (optionId === 'cash') {
        if (state.finances.cash < listing.price * 1.03) return;
        return completePurchase(ctx, listing, null, null);
      }
      if (optionId === 'fraud') {
        const q = quote(state, listing.price, 'conv30', { inflateIncome: true });
        if (!q.ok) return;
        completePurchase(ctx, listing, 'conv30', q);
        ctx.emit('legal:offense', { offenseId: 'mortgageFraud', context: 'inflated income on a mortgage application', discovery: 0.08, evidence: 0.8 });
        return;
      }
      const q = quote(state, listing.price, optionId);
      if (!q.ok) return ctx.toast(q.reason, 'warn');
      completePurchase(ctx, listing, optionId, q);
    },
    repair: resolveRepair,
    lateRent: resolveLateRent,
  },
};

export { STATES };
