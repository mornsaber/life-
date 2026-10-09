/**
 * Levers for businesses that don't run on contracts: ongoing initiatives,
 * yearly promotions and key accounts.
 *
 *   initiatives  switch on for a one-time setup cost; each moves revenue,
 *                costs, reputation or staff in a known direction (the
 *                Advisor's forecast shows what each is worth to you)
 *   promotions   once a year: a sale, a community sponsorship
 *   key accounts recurring clients — a hospital system's catering, a
 *                corporate wellness deal, a property manager's retainer —
 *                offered each year like contracts. They add steady revenue
 *                but walk if quality slips.
 *
 * biz.initiatives = { [id]: sinceAge }, biz.accounts = [{ id, client, value, years, yearsLeft }],
 * biz.accountOffers = [...], biz.promo = { id, age }
 */
import { clamp } from '../../core/Random.js';
import { BUSINESS_TYPES } from './BusinessTypes.js';
import { OPERATIONS } from './Operations.js';
import { charge } from './TaxBook.js';

/**
 * Which levers make sense depends on who the customers are:
 *   consumer  shops, restaurants, clinics, salons — walk-in customers
 *   b2b       professional and business services — clients on engagements
 *   field     crews, fleets and industrial work — jobs, sites and contracts
 */
const B2B = ['lawFirm', 'cpaFirm', 'brokerage', 'propertyMgmt', 'consulting', 'engineeringFirm', 'softwareShop', 'developer', 'piAgency', 'insuranceAgency', 'productionCompany', 'recordingStudio', 'marketingAgency', 'staffingAgency', 'architecturePractice', 'surveyFirm', 'translationAgency', 'indieGameStudio', 'designStudio', 'itSecurityFirm', 'medicalBilling', 'answeringService', 'homeInspection', 'bailBondsAgency'];
const FIELD = ['electrical', 'plumbing', 'trucking', 'hvacContractor', 'cleaning', 'securityCompany', 'courier', 'constructionCo', 'demolitionCo', 'homeBuilder', 'catering', 'charterOperator', 'solarInstaller', 'machineShop', 'warehouse3pl', 'fishingBoat', 'ambulanceService', 'privateFireService', 'nemt', 'towing', 'busCharter', 'movingCompany', 'landscaping', 'excavation', 'craneRental', 'roofing', 'wasteHauling', 'tourBoat', 'pestControl', 'fireProtection', 'homeCareAgency', 'homeHealth'];
export const leverFamily = (typeId) => (B2B.includes(typeId) ? 'b2b' : FIELD.includes(typeId) ? 'field' : 'consumer');

/**
 * fx: revenue (×), cogs (×), payroll (×), rent (×), insurance (×), share
 * (cost as a share of revenue), fixed (cost per location per year); yearly:
 * drift applied in the tick. setup: one-time cost per location. for: the
 * lever families it fits.
 */
export const INITIATIVES = {
  // Consumer-facing businesses.
  loyalty: { for: ['consumer'], name: 'Loyalty program', icon: '💳', setup: 5000, fx: { revenue: 1.04, share: 0.015 }, yearly: { reputation: 1 }, desc: 'Repeat customers come back more often. Costs about 1.5% of revenue in rewards.' },
  online: { for: ['consumer'], name: 'Online booking & ordering', icon: '🛒', setup: 15000, fx: { revenue: 1.06, share: 0.03 }, desc: 'A new channel for customers. The platform takes about 3% of revenue.' },
  extendedHours: { for: ['consumer'], name: 'Extended hours', icon: '🌙', setup: 0, fx: { revenue: 1.08, payroll: 1.07 }, yearly: { morale: -1 }, desc: 'Open earlier and later: more sales, more payroll, tired staff.' },
  premiumLine: { for: ['consumer'], name: 'Premium services line', icon: '💎', setup: 20000, fx: { revenue: 1.05, cogs: 1.02 }, minQuality: 60, desc: 'Higher-end offerings for customers who\'ll pay. Needs quality 60+ to sell.' },
  reviews: { for: ['consumer'], name: 'Reviews & reputation management', icon: '⭐', setup: 2000, fx: { fixed: 6000 }, yearly: { reputation: 2 }, desc: 'Ask happy customers for reviews and answer the unhappy ones. $6,000 a year per location.' },
  // Business-to-business services.
  salesTeam: { for: ['b2b'], name: 'Business development team & CRM', icon: '📇', setup: 12000, fx: { revenue: 1.07, share: 0.025 }, desc: 'Account executives and a CRM chase leads and cross-sell existing clients. About 2.5% of revenue in commissions and software.' },
  retainers: { for: ['b2b'], name: 'Retainer & subscription pricing', icon: '🔁', setup: 4000, fx: { revenue: 1.03, cogs: 0.98 }, yearly: { reputation: 1 }, desc: 'Clients pay monthly for ongoing work instead of one-off projects: steadier revenue, less time spent selling.' },
  certification: { for: ['b2b', 'field'], name: 'Industry certifications (ISO / SOC 2)', icon: '📜', setup: 25000, fx: { revenue: 1.05, fixed: 8000 }, minQuality: 55, desc: 'Audited quality and security standards that big clients require in their vendors. Needs quality 55+ to pass the audit.' },
  utilization: { for: ['b2b'], name: 'Utilization & time tracking', icon: '⏱️', setup: 6000, fx: { payroll: 0.95 }, yearly: { morale: -1 }, desc: 'Every hour billed and every project priced right: about 5% less payroll for the same work, and staff feel watched.' },
  remoteOps: { for: ['b2b'], name: 'Remote & hybrid work', icon: '🏠', setup: 8000, fx: { rent: 0.7 }, yearly: { morale: 1 }, desc: 'Give up most of the office: about 30% less rent, and people like it.' },
  thoughtLeadership: { for: ['b2b'], name: 'Thought leadership & speaking', icon: '🎤', setup: 3000, fx: { fixed: 9000 }, yearly: { reputation: 2 }, desc: 'Articles, conference talks and a newsletter: your firm becomes the name clients know. $9,000 a year per office.' },
  // Crews, fleets and industrial work.
  telematics: { for: ['field'], name: 'Telematics & route optimization', icon: '🛰️', setup: 10000, fx: { cogs: 0.95, fixed: 3000 }, desc: 'GPS dispatch and routing cut fuel, overtime and wasted trips — about 5% off direct costs.' },
  safety: { for: ['field'], name: 'Safety program & training', icon: '🦺', setup: 7000, fx: { insurance: 0.82, payroll: 1.01 }, yearly: { morale: 1 }, desc: 'Fewer injuries and claims: insurers cut your premiums about 18%.' },
  maintenance: { for: ['field'], name: 'Preventive maintenance', icon: '🔧', setup: 5000, fx: { cogs: 0.98, fixed: 4000 }, yearly: { quality: 1 }, desc: 'Scheduled service before things break: fewer breakdowns and callbacks.' },
  estimating: { for: ['field'], name: 'Estimating & bid software', icon: '📐', setup: 9000, fx: { revenue: 1.04, share: 0.008 }, desc: 'Faster, sharper bids win more jobs and stop you underpricing them.' },
  // Anyone.
  leanInventory: { for: ['consumer', 'field'], name: 'Inventory & waste control', icon: '📦', setup: 8000, fx: { cogs: 0.96 }, yearly: { quality: -1 }, desc: 'Tighter ordering cuts cost of goods about 4%; shortages nibble at quality.' },
  energy: { for: ['consumer', 'field'], name: 'Energy-efficiency retrofit', icon: '💡', setup: 30000, fx: { rent: 0.92 }, desc: 'LED lighting, HVAC and controls cut occupancy costs about 8% for good.' },
  training: { for: ['consumer', 'b2b', 'field'], name: 'Staff training program', icon: '🎓', setup: 6000, fx: { payroll: 1.02 }, yearly: { productivity: 3, morale: 2 }, desc: 'Better-trained staff work better and stay longer. About 2% more payroll.' },
};
export const PROMOTIONS = {
  sale: { for: ['consumer'], name: 'Run a seasonal sale', icon: '🏷️', desc: 'More customers this year at thinner margins; a little goodwill.' },
  sponsor: { for: ['consumer', 'field'], name: 'Sponsor a community event', icon: '🎪', desc: 'Local goodwill and visibility.', cost: 4000 },
  tradeShow: { for: ['b2b', 'field'], name: 'Exhibit at a trade show', icon: '🏟️', desc: 'A booth where buyers shop for vendors: a few new clients and some name recognition.', cost: 12000 },
  webinar: { for: ['b2b'], name: 'Webinar & white-paper campaign', icon: '🖥️', desc: 'Useful content that brings in leads.', cost: 5000 },
  rfpBlitz: { for: ['field'], name: 'Bid on public work', icon: '🏛️', desc: 'A push on city, county and school-district bids: more work this year at government rates.', cost: 6000 },
};
export const initiativesFor = (biz) => Object.fromEntries(Object.entries(INITIATIVES).filter(([, i]) => i.for.includes(leverFamily(biz.typeId))));
export const promotionsFor = (biz) => Object.fromEntries(Object.entries(PROMOTIONS).filter(([, p]) => p.for.includes(leverFamily(biz.typeId))));
const PROMO_EFFECT = {
  sale: { revenue: 1.07, cogs: 1.05, rep: 1, text: (n) => `${n} is running a seasonal sale this year: more customers, thinner margins.` },
  sponsor: { revenue: 1, rep: 4, text: (n) => `${n} sponsored a community festival. People noticed.` },
  tradeShow: { revenue: 1.04, rep: 3, text: (n) => `${n} had a booth at the industry trade show and came home with a stack of leads.` },
  webinar: { revenue: 1.025, rep: 2, text: (n) => `${n}'s webinar series and white paper brought in new leads.` },
  rfpBlitz: { revenue: 1.05, cogs: 1.02, rep: 1, text: (n) => `${n} won a round of public bids — more work at government rates.` },
};

const ACCOUNT_CLIENTS = ['A hospital system', 'The state university', 'A corporate campus', 'The county government', 'A regional property manager', 'A hotel group', 'The school district', 'A senior-living chain', 'An insurance carrier', 'A tech company\'s local office'];

/** Businesses that don't run on contracts get key accounts. */
export const usesAccounts = (biz) => !OPERATIONS[biz.typeId] && !BUSINESS_TYPES[biz.typeId]?.startup;
export const initiativeCost = (biz, id) => Math.round(INITIATIVES[id].setup * (biz.scale ?? 1));

/** Multipliers and costs for the P&L (Business.yearFinancials). */
export function initiativeEffects(biz, age) {
  const out = { revenue: 1, cogs: 1, payroll: 1, rent: 1, insurance: 1, share: 0, fixed: 0, accounts: 0 };
  for (const id of Object.keys(biz.initiatives ?? {})) {
    const i = INITIATIVES[id];
    if (!i) continue;
    const fx = i.fx;
    const works = !i.minQuality || biz.quality >= i.minQuality;
    if (fx.revenue) out.revenue *= works ? fx.revenue : 1 + (fx.revenue - 1) / 4;
    if (fx.cogs) out.cogs *= fx.cogs;
    if (fx.payroll) out.payroll *= fx.payroll;
    if (fx.rent) out.rent *= fx.rent;
    if (fx.insurance) out.insurance *= fx.insurance;
    if (fx.share) out.share += fx.share;
    if (fx.fixed) out.fixed += fx.fixed * (biz.scale ?? 1);
  }
  const promo = biz.promo?.age === age ? PROMO_EFFECT[biz.promo.id] : null;
  if (promo) {
    out.revenue *= promo.revenue ?? 1;
    out.cogs *= promo.cogs ?? 1;
  }
  out.accounts = (biz.accounts ?? []).reduce((s, a) => s + a.value, 0);
  return out;
}

/** "a" or "an" for a name. */
export const article = (name) => (/^[aeiou]/i.test(name) ? 'an' : 'a');

function accountOffer(rng, biz, type) {
  const value = Math.round(type.revenue * (biz.scale ?? 1) * rng.float(0.04, 0.12) / 1000) * 1000;
  // A client you already serve (or already have an offer from) doesn't come twice.
  const taken = new Set([...(biz.accounts ?? []), ...(biz.accountOffers ?? [])].map((a) => a.client));
  const fresh = ACCOUNT_CLIENTS.filter((c) => !taken.has(c));
  return { id: rng.id('ka_'), client: rng.pick(fresh.length ? fresh : ACCOUNT_CLIENTS), value, years: rng.int(1, 3), minQuality: rng.pick([0, 50, 60]) };
}

/** The year: drifts from initiatives, key accounts renew or walk, new offers arrive. */
export function initiativesTick(ctx, biz) {
  const { rng } = ctx;
  const type = BUSINESS_TYPES[biz.typeId];
  // Programs that don't fit this kind of business (from older saves) wind down.
  for (const id of Object.keys(biz.initiatives ?? {})) {
    if (INITIATIVES[id] && !INITIATIVES[id].for.includes(leverFamily(biz.typeId))) {
      delete biz.initiatives[id];
      ctx.log(`${biz.name} wound down its ${INITIATIVES[id].name.toLowerCase()} — it doesn't fit a ${leverFamily(biz.typeId) === 'b2b' ? 'business-to-business firm' : 'field-services company'}.`, INITIATIVES[id].icon);
    }
  }
  for (const id of Object.keys(biz.initiatives ?? {})) {
    const y = INITIATIVES[id]?.yearly;
    if (!y) continue;
    if (y.reputation) biz.reputation = Math.round(clamp(biz.reputation + y.reputation, 0, 100));
    if (y.quality) biz.quality = Math.round(clamp(biz.quality + y.quality, 0, 100));
    if (y.productivity) biz.staff.productivity = Math.round(clamp(biz.staff.productivity + y.productivity, 0, 100));
    if (y.morale) biz.staff.morale = Math.round(clamp(biz.staff.morale + y.morale, 0, 100));
  }
  if (!usesAccounts(biz)) return;
  biz.accounts ??= [];
  for (const a of biz.accounts) a.yearsLeft -= 1;
  const renewing = [];
  for (const a of biz.accounts.filter((x) => x.yearsLeft <= 0)) {
    if (biz.quality >= 55 && rng.chance(0.6)) renewing.push({ ...a, id: rng.id('ka_'), years: rng.int(1, 3), value: Math.round(a.value * 1.05), renewal: true });
    else ctx.log(`${biz.name}'s account with ${a.client.toLowerCase()} ended.`, '📄');
  }
  biz.accounts = biz.accounts.filter((a) => a.yearsLeft > 0);
  // Slipping quality loses accounts mid-term.
  if (biz.quality < 45 && biz.accounts.length && rng.chance(0.4)) {
    const lost = rng.pick(biz.accounts);
    biz.accounts = biz.accounts.filter((a) => a !== lost);
    ctx.log(`${lost.client} dropped ${biz.name} over slipping quality.`, '📉', 'bad');
  }
  biz.accountOffers = [...renewing, ...Array.from({ length: rng.int(1, 2) }, () => accountOffer(rng, biz, type))];
}

/** Accounts and the staffing they need: about one person per slice of a location's revenue. */
export function accountEligibility(biz, offer) {
  if (offer.minQuality && biz.quality < offer.minQuality) return { ok: false, reason: `Wants quality ${offer.minQuality}+` };
  const type = BUSINESS_TYPES[biz.typeId];
  const booked = (biz.accounts ?? []).reduce((s, a) => s + a.value, 0);
  if (booked + offer.value > type.revenue * (biz.scale ?? 1) * 0.35) return { ok: false, reason: 'More account work than you can take on — open another location' };
  return { ok: true };
}

export const InitiativeActions = {
  /** arg: initiative id — switch it on (paying setup) or off. */
  toggleInitiative(ctx, id) {
    const biz = ctx.state.business.current;
    const i = INITIATIVES[id];
    if (!biz || !i || BUSINESS_TYPES[biz.typeId].startup) return;
    biz.initiatives ??= {};
    if (biz.initiatives[id] == null && !i.for.includes(leverFamily(biz.typeId))) return ctx.toast(`${i.name} doesn't fit this kind of business.`, 'warn');
    if (biz.initiatives[id] != null) {
      delete biz.initiatives[id];
      return ctx.log(`${biz.name} ended its ${i.name.toLowerCase()}.`, i.icon);
    }
    const cost = initiativeCost(biz, id);
    if (biz.cash < cost) return ctx.toast(`Setup costs ${`$${cost.toLocaleString()}`} from the business account.`, 'warn');
    charge(biz, cost);
    biz.initiatives[id] = ctx.state.character.age;
    ctx.log(`${biz.name} launched ${article(i.name)} ${i.name.toLowerCase()}${cost ? ` ($${cost.toLocaleString()} to set up)` : ''}.`, i.icon, 'good');
  },
  /** arg: promotion id — once a year. */
  promote(ctx, id) {
    const { state } = ctx;
    const biz = state.business.current;
    const p = PROMOTIONS[id];
    if (!biz || !p) return;
    if (!p.for.includes(leverFamily(biz.typeId))) return ctx.toast(`${p.name} doesn't fit this kind of business.`, 'warn');
    if (biz.promo?.age === state.character.age) return ctx.toast('One promotion a year.', 'warn');
    const cost = Math.round((p.cost ?? 0) * (biz.scale ?? 1));
    if (cost && biz.cash < cost) return ctx.toast(`Costs $${cost.toLocaleString()}.`, 'warn');
    charge(biz, cost);
    biz.promo = { id, age: state.character.age };
    biz.reputation = Math.round(clamp(biz.reputation + PROMO_EFFECT[id].rep, 0, 100));
    ctx.log(PROMO_EFFECT[id].text(biz.name), p.icon, 'good');
  },
  /** arg: offer id. */
  signAccount(ctx, id) {
    const biz = ctx.state.business.current;
    const offer = biz?.accountOffers?.find((k) => k.id === id);
    if (!offer) return;
    const ok = accountEligibility(biz, offer);
    if (!ok.ok) return ctx.toast(ok.reason, 'warn');
    signAccount(biz, offer);
    ctx.log(`${biz.name} signed ${offer.client.toLowerCase()} as a key account: about $${offer.value.toLocaleString()} a year for ${offer.years} year${offer.years > 1 ? 's' : ''}.`, '🤝', 'good');
  },
  /** arg: account id — walk away (with a reputation cost). */
  dropAccount(ctx, id) {
    const biz = ctx.state.business.current;
    const a = biz?.accounts?.find((x) => x.id === id);
    if (!a) return;
    biz.accounts = biz.accounts.filter((x) => x !== a);
    biz.reputation = Math.max(0, biz.reputation - 3);
    ctx.log(`${biz.name} walked away from ${a.client.toLowerCase()}.`, '📄', 'warn');
  },
};

export function signAccount(biz, offer) {
  biz.accounts ??= [];
  biz.accounts.push({ id: offer.id, client: offer.client, value: offer.value, years: offer.years, yearsLeft: offer.years });
  biz.accountOffers = (biz.accountOffers ?? []).filter((k) => k.id !== offer.id);
}
