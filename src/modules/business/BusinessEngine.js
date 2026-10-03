/**
 * Business & entrepreneurship: start, buy, inherit, run and exit a business.
 *
 * Operations reuse the career systems: the staff block is a department
 * (WORKFORCE_MODES from ContractingSystem, delegation DUTIES from the
 * ManagementEngine, morale-driven union risk as in UnionsAndLabor), and the
 * business acts as an Employer — you choose its benefits. Money flows through
 * the ledger: salaries and draws via ctx.earn, pass-through profit kept in the
 * business as `retained` (taxed, no cash), C-corp dividends as LTCG.
 *
 * Runs after the career module (order 31) so a year's work is in the ledger
 * before Finances settles taxes.
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, canAfford } from '../../core/State.js';
import { setWorkforce, WORKFORCE_MODES } from '../career/ContractingSystem.js';
import { DUTIES } from '../career/ManagementEngine.js';
import { BUSINESS_TYPES, ENTITIES, ROUNDS, SBA, MARKETING } from './BusinessTypes.js';
import {
  currentBusiness, typeOf, holdsLicense, startEligibility, fundingCheck, ownerSkill, debtBalance, guaranteedDebt,
  yearFinancials, valuation, newBusiness, exitProceeds, annualPayment, businessName, SS_WAGE_CAP, LICENSEE_ONLY,
} from './Business.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;
const PHASE_STARTUP = { expansion: 0.1, peak: 0.15, recession: -0.25, recovery: 0 };
const FAMILY_RELATIONS = ['spouse', 'partner', 'fiance', 'child', 'sibling', 'mother', 'father'];
const MAX_HEADCOUNT = 400;

/* ------------------------------------------------------------------ */
/* Yearly operations                                                   */
/* ------------------------------------------------------------------ */

function staffTick(ctx, biz) {
  const { rng, state } = ctx;
  const s = biz.staff;
  if (!s.headcount) return;
  const mode = WORKFORCE_MODES[s.workforce];
  const delegated = s.headcount >= 8 ? Object.keys(DUTIES).filter((d) => s.delegation[d]) : [];
  if (mode.fixedQuality === null) {
    const target = 50 + (biz.benefits.health ? 6 : 0) + biz.benefits.match * 100 + (s.unionized ? 4 : 0) - (biz.family.length > 2 ? 3 : 0);
    s.morale = Math.round(clamp(s.morale + (target - s.morale) * 0.25 + delegated.length + rng.int(-6, 6), 0, 100));
  }
  const quality = mode.fixedQuality ?? 38 + s.morale * 0.35;
  s.productivity = Math.round(clamp(quality + state.stats.smarts * 0.08 + (biz.role === 'operator' ? 3 : 0) + rng.int(-8, 8), 0, 100));
  if (mode.strikes && !s.unionized && s.headcount >= 5) s.unionRisk = Math.round(clamp(s.unionRisk + (s.morale < 45 ? (45 - s.morale) / 2 : -4), 0, 100));
  if (biz.role === 'operator') ctx.stat('stress', 2 + (s.headcount >= 8 ? 3 - delegated.length : 1));
}

/** Startups: launch a product, then grow (or shrink) annual recurring revenue. */
function startupGrowth(ctx, biz) {
  const { state, rng } = ctx;
  if (!biz.arr) {
    biz.growth = 0;
    if (rng.chance(clamp(0.3 + biz.quality / 120 + biz.staff.headcount * 0.05, 0.2, 0.95))) {
      biz.arr = Math.round(rng.int(20000, 150000) * (0.5 + biz.quality / 100));
      ctx.log(`${biz.name} launched its product. First customers: ${money(biz.arr)} in annual recurring revenue.`, '🚀', 'milestone');
    } else ctx.log(`${biz.name} is still building its product.`, '🛠️');
    return;
  }
  const scaleDrag = biz.arr > 20000000 ? 0.25 : biz.arr > 5000000 ? 0.1 : 0;
  const g = clamp(-0.45 + ((biz.fit ?? 1) - 1) * 0.8 + biz.quality / 65 + Math.min(biz.staff.headcount, 60) * 0.012 + (biz.marketing - 1) * 0.12 + (PHASE_STARTUP[state.economy.phase] ?? 0) + rng.float(-0.55, 0.6) - scaleDrag, -0.6, 3);
  biz.arr = Math.max(0, Math.round(biz.arr * (1 + g)));
  biz.growth = Math.round(g * 100) / 100;
}

function payDebts(biz) {
  const sba = biz.debts.sba;
  if (sba) {
    const principal = Math.max(0, Math.min(sba.balance, sba.annual - Math.round(sba.balance * sba.rate)));
    sba.balance -= principal;
    biz.cash -= principal;
    if (sba.balance <= 0) biz.debts.sba = null;
  }
  if (biz.debts.payables) {
    biz.cash -= biz.debts.payables;
    biz.debts.payables = 0;
  }
}

/** Salaries, draws, dividends and pass-through taxes. Returns what reached you. */
function payOwner(ctx, biz, ly) {
  const entity = ENTITIES[biz.entity];
  let ownerPay = 0;
  if (ly.ownerSalary) {
    ctx.earn(ly.ownerSalary, `Salary — ${biz.name}`, { wage: true });
    ctx.spend(ly.payrollTax, 'Payroll tax (FICA)', { allowDebt: true });
    ownerPay += ly.ownerSalary;
  }
  const dist = Math.round(Math.max(0, Math.min(ly.netIncome, biz.cash)) * biz.drawPct);
  biz.cash -= dist;
  const mine = Math.round(dist * biz.ownerPct);
  if (entity.passThrough) {
    if (mine) ctx.earn(mine, `Owner draw — ${biz.name}`, { wage: !entity.payroll });
    const retained = Math.round(Math.max(0, ly.netIncome - dist) * biz.ownerPct);
    if (retained) ctx.earn(retained, `Retained profit — ${biz.name}`, { retained: true, wage: !entity.payroll });
    if (!entity.payroll && ly.netIncome > 0) {
      ly.seTax = Math.round(Math.min(ly.netIncome * biz.ownerPct * 0.9235, SS_WAGE_CAP) * 0.153);
      ctx.spend(ly.seTax, 'Self-employment tax', { allowDebt: true });
    }
  } else if (mine) ctx.earn(mine, `Dividends — ${biz.name}`, { ltcg: true });
  ly.distributions = dist;
  return ownerPay + mine;
}

function inspectionTick(ctx, biz, type) {
  const { state, rng } = ctx;
  const age = state.character.age;
  if (type.inspection === 'health' && rng.chance(0.6)) {
    const score = biz.quality * 0.7 + 15 + rng.int(-25, 25);
    if (score >= 40) return;
    biz.violations = [...biz.violations.filter((a) => age - a < 5), age];
    const fine = rng.int(2000, 10000);
    biz.cash -= fine;
    biz.reputation = Math.max(0, biz.reputation - 8);
    if (biz.violations.length >= 3) {
      ctx.log(`The health department revoked ${biz.name}'s permit after a third failed inspection.`, '🚫', 'bad');
      closeBusiness(ctx, 'Shut down by the health department', { liquidation: 0.4 });
      return;
    }
    ctx.log(`${biz.name} failed a health inspection (${biz.violations.length}/3 in five years): ${money(fine)} fine and a bad grade in the window.`, '🧪', 'bad');
  } else if (type.inspection === 'board' && rng.chance(0.04) && biz.quality < 45 && rng.chance(0.5)) {
    const held = type.credentials.filter((c) => state.credentials.held[c]?.status === 'active');
    ctx.emit('credential:suspend', { ids: held, years: 1, reason: `licensing-board complaint against ${biz.name}` });
    biz.reputation = Math.max(0, biz.reputation - 10);
  }
}

function businessTick(ctx, biz) {
  const { state, rng } = ctx;
  const type = typeOf(biz);
  biz.years += 1;
  if (biz.role === 'operator' && (state.legal.incarceration || state.career.job)) biz.role = 'absentee';

  // You need the license to run it. Law firms, practices and CPA firms must be owned by a licensee.
  if (!holdsLicense(state, type)) {
    if (LICENSEE_ONLY.includes(biz.typeId)) {
      ctx.log(`Without your ${type.name.toLowerCase()} license you can't own ${biz.name}. You had to sell it fast.`, '🪪', 'bad');
      exitBusiness(ctx, Math.round(biz.valuation * 0.7), 'Forced sale (license lost)');
      return;
    }
    if (!biz.licensedManager) ctx.log(`You hired a licensed manager to keep ${biz.name} legal.`, '🪪', 'warn');
    biz.licensedManager = true;
  } else biz.licensedManager = false;

  staffTick(ctx, biz);
  const skill = biz.role === 'operator' ? ownerSkill(state, type) : 10;
  const target = biz.staff.productivity * 0.55 + skill * 0.6 + 12 + (biz.licensedManager ? -5 : 0);
  biz.quality = Math.round(clamp(biz.quality + (target - biz.quality) * 0.35 + rng.int(-4, 4), 0, 100));
  biz.reputation = Math.round(clamp(biz.reputation + (biz.quality - biz.reputation) * 0.25 + rng.int(-3, 3), 0, 100));
  biz.fit = Math.round(clamp((biz.fit ?? 1) + rng.float(-0.05, 0.05), 0.5, 1.4) * 100) / 100;
  if (type.startup) startupGrowth(ctx, biz);

  const ly = yearFinancials(state, biz, rng);
  biz.cash += ly.netIncome;
  payDebts(biz);
  biz.assets = Math.round(biz.assets * 0.9);
  ly.ownerPay = payOwner(ctx, biz, ly);
  biz.lastYear = ly;
  biz.valuation = valuation(biz, ly);
  ctx.log(`${biz.name}: ${money(ly.revenue)} revenue, ${ly.netIncome >= 0 ? `${money(ly.netIncome)} profit` : `${money(-ly.netIncome)} loss`}${ly.ownerPay ? `; you took ${money(ly.ownerPay)}` : ''}. Valued at ${money(biz.valuation)}.`, type.icon, ly.netIncome >= 0 ? 'finance' : 'warn');

  inspectionTick(ctx, biz, type);
  if (state.business.current !== biz) return;
  if (biz.staff.unionRisk >= 100 && !biz.staff.unionized) unionDrive(ctx, biz);
  else if (rng.chance(0.35)) eventPrompt(ctx, biz);
  if (rng.chance(0.08)) temptationPrompt(ctx, biz);
  offerTick(ctx, biz);
  if (biz.cash < 0) cashCrunch(ctx, biz);
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

const bump = (obj, key, d) => {
  obj[key] = Math.round(clamp(obj[key] + d, 0, 100));
};

export const BUSINESS_EVENTS = [
  { id: 'bigClient', title: 'A Big Contract', text: 'A large client wants to sign a contract that would stretch your capacity to the limit.', options: [
    { id: 'accept', label: '✍️ Sign it', apply: (ctx, b) => { b.cash += Math.round((b.lastYear?.revenue ?? 50000) * 0.12); bump(b, 'quality', -5); bump(b.staff, 'morale', -6); return 'You signed. The money is great; the team is exhausted.'; } },
    { id: 'decline', label: '🙅 Stay the size you are', apply: (ctx, b) => { bump(b.staff, 'morale', 3); return 'You passed. The team appreciated it.'; } },
  ] },
  { id: 'poached', title: 'Poaching Attempt', text: 'A competitor offered your best employee a raise to jump ship.', minStaff: 2, options: [
    { id: 'match', label: '💵 Match the offer', apply: (ctx, b) => { b.staff.costPremium = Math.round((b.staff.costPremium + 0.02) * 100) / 100; bump(b.staff, 'morale', 4); return 'You matched it. Your best person stayed.'; } },
    { id: 'let', label: '👋 Let them go', apply: (ctx, b) => { bump(b.staff, 'productivity', -8); bump(b, 'quality', -4); return 'They left — and took a couple of clients.'; } },
  ] },
  { id: 'lawsuit', title: 'Served With a Lawsuit', text: 'A customer is suing over an injury on your premises.', options: [
    { id: 'settle', label: '🤝 Settle', apply: (ctx, b) => { const c = ctx.rng.int(15000, 60000); b.cash -= c; return `You settled for ${money(c)}.`; } },
    { id: 'fight', label: '⚖️ Fight it in court', apply: (ctx, b) => { if (ctx.rng.chance(0.6)) { b.cash -= 20000; return 'You won, after $20,000 in legal fees.'; } const c = ctx.rng.int(60000, 200000); b.cash -= c; bump(b, 'reputation', -6); return `You lost: a ${money(c)} judgment, and it made the local news.`; } },
  ] },
  { id: 'competitor', title: 'New Competition', text: 'A well-funded competitor opened nearby.', options: [
    { id: 'price', label: '🏷️ Cut prices', apply: (ctx, b) => { b.cash -= Math.round((b.lastYear?.revenue ?? 50000) * 0.05); bump(b, 'reputation', 3); return 'You cut prices and kept your customers — at a cost.'; } },
    { id: 'quality', label: '✨ Out-serve them', apply: (ctx, b) => { if (ctx.state.stats.smarts + ctx.rng.int(-20, 20) > 60) { bump(b, 'quality', 6); return 'You doubled down on quality and customers noticed.'; } bump(b, 'reputation', -4); return 'You tried to out-serve them. They outspent you.'; } },
    { id: 'ignore', label: '🙈 Ignore them', apply: (ctx, b) => { bump(b, 'reputation', -6); return 'You ignored them. Some regulars drifted away.'; } },
  ] },
  { id: 'supplier', title: 'Supplier Price Hike', text: 'Your main supplier raised prices 15%.', notStartup: true, options: [
    { id: 'absorb', label: '🧾 Absorb it', apply: (ctx, b) => { b.cash -= Math.round((b.lastYear?.cogs ?? 20000) * 0.15); return 'You absorbed the increase.'; } },
    { id: 'switch', label: '🔄 Find a cheaper supplier', apply: (ctx, b) => { bump(b, 'quality', -5); return 'The new supplier is cheaper — and worse.'; } },
    { id: 'raise', label: '📈 Raise your prices', apply: (ctx, b) => { bump(b, 'reputation', -3); return 'You passed it on to customers. Some grumbled.'; } },
  ] },
  { id: 'hiring', title: 'Hiring Decision', text: 'You have one open position and three finalists.', minStaff: 3, duty: 'hiring', options: [
    { id: 'veteran', label: '🧓 The seasoned pro who wants top dollar', apply: (ctx, b) => { bump(b.staff, 'productivity', 5); b.staff.costPremium = Math.round((b.staff.costPremium + 0.01) * 100) / 100; return 'You hired the seasoned pro.'; } },
    { id: 'promising', label: '🌱 The promising new grad', apply: (ctx, b) => { bump(b.staff, 'productivity', 2); bump(b.staff, 'morale', 2); return 'You took a chance on the new grad.'; } },
    { id: 'friend', label: '👔 A friend who needs a job', apply: (ctx, b) => { bump(b.staff, 'productivity', -4); ctx.stat('happiness', 2); return 'You hired your friend. It\'s… fine.'; } },
  ] },
  { id: 'underperformer', title: 'Underperformer', text: 'One of your people has missed every target this year.', minStaff: 3, duty: 'reviews', options: [
    { id: 'coach', label: '🧑‍🏫 Coach them', apply: (ctx, b) => { if (ctx.state.stats.smarts + ctx.rng.int(-15, 15) >= 50) { bump(b.staff, 'productivity', 4); return 'Your coaching turned them around.'; } ctx.stat('stress', 4); return 'Hours of coaching went nowhere.'; } },
    { id: 'fire', label: '🚪 Let them go', apply: (ctx, b) => { bump(b.staff, 'productivity', 4); bump(b.staff, 'morale', -6); b.staff.unionRisk = Math.min(100, b.staff.unionRisk + 6); return 'You let them go. The team is rattled.'; } },
  ] },
];

function eventPrompt(ctx, biz) {
  const { rng } = ctx;
  const type = typeOf(biz);
  const delegated = biz.staff.headcount >= 8 ? Object.keys(DUTIES).filter((d) => biz.staff.delegation[d]) : [];
  const pool = BUSINESS_EVENTS.filter((e) => (!e.minStaff || biz.staff.headcount >= e.minStaff) && !(e.notStartup && type.startup) && !(e.duty && delegated.includes(e.duty)));
  const event = rng.pick(pool);
  if (!event) return;
  ctx.prompt({ type: 'business.event', icon: type.icon, title: `${biz.name}: ${event.title}`, text: event.text, options: event.options.map(({ id, label }) => ({ id, label })), data: { eventId: event.id } });
}

function unionDrive(ctx, biz) {
  ctx.prompt({
    type: 'business.union',
    icon: '✊',
    title: `${biz.name}: Union Drive`,
    text: 'Your employees filed for a union election with the NLRB.',
    options: [
      { id: 'recognize', label: '🤝 Recognize the union', hint: 'Higher labor costs, better morale' },
      { id: 'campaign', label: '📣 Campaign against it (legally)', hint: 'Captive-audience meetings; may still lose' },
      { id: 'bust', label: '🔥 Fire the organizers', hint: 'Illegal — NLRB charges likely', tone: 'danger' },
    ],
  });
}

/** Ways to cheat that pay now and may surface later. */
const TEMPTATIONS = {
  payrollTax: { title: 'Payroll Taxes Due', text: 'Cash is tight. You could quietly skip remitting the payroll taxes you withheld from your employees this quarter.', take: '💸 Skip the payroll tax deposit', offenseId: 'payrollTaxEvasion', discovery: 0.35, when: (b) => b.staff.headcount >= 2, gain: (b) => Math.round((b.lastYear?.payroll ?? 50000) * 0.15) },
  wageTheft: { title: 'Overtime', text: 'Your staff worked a lot of overtime. You could pay them straight time and call them "salaried."', take: '⏱️ Skip the overtime pay', offenseId: 'wageTheft', discovery: 0.25, when: (b) => b.staff.headcount >= 3, gain: (b) => Math.round((b.lastYear?.payroll ?? 50000) * 0.08) },
  cookBooks: { title: 'The Board Meeting', text: 'Investors expect growth you didn\'t hit. You could count signed-but-unpaid deals as revenue.', take: '📊 Book the revenue anyway', offenseId: 'securitiesFraud', discovery: 0.25, when: (b) => b.investors.length > 0, gain: () => 0 },
  arson: { title: 'Insurance Policy', text: 'The business is going under. A fire would pay out the insurance policy in full.', take: '🔥 Arrange a "kitchen fire"', offenseId: 'arson', discovery: 0.4, when: (b) => (b.lastYear?.netIncome ?? 0) < 0 && b.assets > 10000, gain: (b) => Math.round(b.assets * 1.3) },
};

function temptationPrompt(ctx, biz) {
  const options = Object.entries(TEMPTATIONS).filter(([, t]) => t.when(biz));
  if (!options.length) return;
  const [id, t] = ctx.rng.pick(options);
  ctx.prompt({
    type: 'business.temptation',
    icon: '😈',
    title: `${biz.name}: ${t.title}`,
    text: t.text,
    options: [
      { id: 'take', label: t.take, tone: 'danger' },
      { id: 'honest', label: '🙂 Do it by the book' },
    ],
    data: { id },
  });
}

/** Buyers come calling: acquisition offers and (rarely) an IPO. */
function offerTick(ctx, biz) {
  const { state, rng } = ctx;
  const type = typeOf(biz);
  if (type.startup && biz.arr >= 100000000 && biz.growth >= 0.3 && ['expansion', 'peak'].includes(state.economy.phase) && biz.entity === 'ccorp' && rng.chance(0.35)) {
    const price = Math.round(biz.arr * rng.float(8, 15));
    ctx.prompt({ type: 'business.ipo', icon: '🔔', title: `${biz.name}: IPO`, text: `Bankers think ${biz.name} could go public at a ${money(price)} valuation. Your ${Math.round(biz.ownerPct * 100)}% stake would be worth ${money(price * biz.ownerPct)}.`, options: [{ id: 'ipo', label: '🔔 Ring the bell' }, { id: 'wait', label: '⏳ Stay private for now' }], data: { price } });
    return;
  }
  const chance = type.startup ? (biz.arr >= 2000000 ? 0.06 + Math.max(0, biz.growth) * 0.03 : 0) : (biz.lastYear?.netIncome ?? 0) > 0 && biz.years >= 3 ? 0.05 : 0;
  if (!chance || !rng.chance(chance)) return;
  const price = Math.round(biz.valuation * rng.float(type.startup ? 0.6 : 0.85, type.startup ? 1.3 : 1.25));
  if (price <= 0) return;
  ctx.prompt({ type: 'business.offer', icon: '🤝', title: `${biz.name}: Acquisition Offer`, text: `${rng.pick(['A private-equity firm', 'A larger competitor', 'A strategic buyer', 'A family office'])} offered ${money(price)} for the whole business. Your share: ${money(price * biz.ownerPct)}.`, options: [{ id: 'accept', label: '✍️ Sell' }, { id: 'decline', label: '🙅 Not for sale' }], data: { price } });
}

function cashCrunch(ctx, biz) {
  const { state } = ctx;
  if (state.prompts.some((p) => p.type === 'business.cashCrunch')) return;
  const need = Math.round(-biz.cash + 10000);
  const revenue = biz.lastYear?.revenue ?? 0;
  const canLoc = state.housing.credit.score >= 600 && !typeOf(biz).startup && (biz.debts.loc ?? 0) < Math.max(50000, revenue * 0.4);
  ctx.prompt({
    type: 'business.cashCrunch',
    icon: '🏦',
    title: `${biz.name}: Out of Cash`,
    text: `The business account is ${money(-biz.cash)} in the red. Payroll and vendors are due.`,
    options: [
      { id: 'inject', label: `💰 Put in ${money(need)} of your own money`, disabled: !canAfford(state, need) },
      { id: 'loc', label: '🏦 Draw on a business credit line', hint: 'Personal guarantee, 12% interest', disabled: !canLoc },
      { id: 'bridge', label: '🌉 Ask your investors for a bridge round', hint: 'Heavy dilution, maybe', disabled: !biz.investors.length },
      { id: 'cut', label: '✂️ Lay off a third of the staff', hint: 'Vendors wait a year', disabled: biz.staff.headcount < 3 },
      { id: 'close', label: '🔒 Close the business', tone: 'danger' },
      { id: 'bankrupt', label: '⚖️ File business bankruptcy', hint: ENTITIES[biz.entity].liability ? 'Limited liability — except debts you guaranteed' : 'Sole proprietors are personally liable', tone: 'danger' },
    ],
    data: { need },
  });
}

/* ------------------------------------------------------------------ */
/* Exits                                                               */
/* ------------------------------------------------------------------ */

function releaseFamily(state, biz) {
  for (const id of biz.family) {
    const p = state.people?.list.find((x) => x.id === id);
    if (p && p.job?.includes(biz.name)) p.job = null;
  }
}

function retire(state, biz, outcome, proceeds) {
  releaseFamily(state, biz);
  state.business.history.push({ name: biz.name, typeId: biz.typeId, startAge: biz.foundedAge, endAge: state.character.age, years: biz.years, outcome, proceeds: Math.round(proceeds) });
  if (state.business.history.length > 20) state.business.history.shift();
  state.business.current = null;
}

/** Sell your stake for `price` (whole-company equity value). */
export function exitBusiness(ctx, price, outcome) {
  const { state } = ctx;
  const biz = currentBusiness(state);
  const e = exitProceeds(biz, price);
  state.finances.cash += e.basisBack + e.qsbs;
  if (e.taxable) ctx.earn(e.taxable, `Capital gain — sale of ${biz.name}`, { ltcg: true });
  ctx.log(`${outcome}: you received ${money(e.proceeds)} for your ${Math.round(biz.ownerPct * 100)}% of ${biz.name}${e.qsbs ? ` (${money(e.qsbs)} of the gain tax-free as qualified small business stock)` : ''}.`, '💰', 'milestone');
  retire(state, biz, outcome, e.proceeds);
}

/**
 * Wind the business down: assets sold at a discount pay creditors. LLCs and
 * corporations shield you from what's left — except debts you personally
 * guaranteed; sole proprietors owe all of it.
 */
export function closeBusiness(ctx, outcome, { liquidation = 0.5, bankruptcy = false } = {}) {
  const { state } = ctx;
  const biz = currentBusiness(state);
  const debts = debtBalance(biz) + Math.max(0, -biz.cash);
  const raised = Math.round(biz.assets * liquidation) + Math.max(0, biz.cash);
  const net = raised - debts;
  let personal = 0;
  if (net >= 0) {
    const share = Math.round(net * biz.ownerPct);
    state.finances.cash += share;
    ctx.log(`${biz.name} closed. After paying its debts, ${money(share)} came back to you.`, '🔒', 'warn');
  } else {
    const shortfall = -net;
    personal = ENTITIES[biz.entity].liability ? Math.min(shortfall, guaranteedDebt(biz)) : shortfall;
    if (personal) {
      state.finances.cash -= personal;
      if (bankruptcy) ctx.emit('credit:event', { type: 'default' });
    }
    ctx.log(`${biz.name} ${bankruptcy ? 'went through bankruptcy' : 'closed'} owing ${money(shortfall)}.${personal ? ` You're personally on the hook for ${money(personal)}${ENTITIES[biz.entity].liability ? ' you guaranteed' : ' (sole proprietors have no shield)'}.` : ' Your LLC/corporation shielded your personal assets.'}`, bankruptcy ? '⚖️' : '🔒', 'bad');
  }
  ctx.stat('happiness', -10);
  retire(state, biz, outcome, Math.max(0, net));
}

/* ------------------------------------------------------------------ */
/* Starting and buying                                                 */
/* ------------------------------------------------------------------ */

function fund(ctx, price, check) {
  const { state } = ctx;
  state.finances.cash -= check.down;
  return { sbaLoan: check.loan, basis: check.down };
}

function startBusiness(ctx, typeId, funding, entity) {
  const { state, rng } = ctx;
  const check = startEligibility(state, typeId, funding);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  const type = BUSINESS_TYPES[typeId];
  const { sbaLoan, basis } = fund(ctx, type.cost, check);
  const biz = newBusiness(rng, state, typeId, { entity: ENTITIES[entity] ? entity : 'llc', cash: Math.round(type.cost * 0.4), assets: Math.round(type.cost * 0.6), sbaLoan, basis, quality: Math.round(clamp(35 + ownerSkill(state, type) * 0.6, 20, 75)) });
  state.business.current = biz;
  ctx.log(`You founded ${biz.name} (${ENTITIES[biz.entity].name})${sbaLoan ? ` with a ${money(sbaLoan)} SBA loan you personally guaranteed` : ''}.`, type.icon, 'milestone');
  ctx.toast(`Founded ${biz.name}`, 'good');
  ctx.stat('stress', 6);
  ctx.emit('business:started', { biz });
  return undefined;
}

/** A couple of established businesses come up for sale each year. */
function listingsTick(ctx) {
  const { state, rng } = ctx;
  if (state.character.age < 21) {
    state.business.listings = [];
    return;
  }
  const ids = Object.keys(BUSINESS_TYPES).filter((id) => !BUSINESS_TYPES[id].startup);
  state.business.listings = Array.from({ length: 2 }, () => {
    const typeId = rng.pick(ids);
    const probe = newBusiness(rng, state, typeId, { name: businessName(rng, state, BUSINESS_TYPES[typeId], { seller: true }), years: rng.int(3, 20), scale: rng.pick([1, 1, 2]), quality: rng.int(45, 75), reputation: rng.int(40, 75), assets: Math.round(BUSINESS_TYPES[typeId].cost * 0.4), fit: Math.round(rng.float(0.9, 1.2) * 100) / 100 });
    probe.role = 'absentee';
    const ly = yearFinancials(state, probe, rng);
    probe.lastYear = ly;
    const price = Math.max(20000, Math.round(valuation(probe, ly) * rng.float(0.95, 1.25)));
    return { id: rng.id('lst_'), typeId, name: probe.name, years: probe.years, scale: probe.scale, quality: probe.quality, reputation: probe.reputation, fit: probe.fit, revenue: ly.revenue, profit: ly.netIncome + ly.management, price };
  }).filter((l) => l.profit > 0);
}

function buyBusiness(ctx, listingId, funding) {
  const { state, rng } = ctx;
  const listing = state.business.listings.find((l) => l.id === listingId);
  if (!listing) return;
  const type = BUSINESS_TYPES[listing.typeId];
  if (currentBusiness(state)) return ctx.toast('You already own a business.', 'warn');
  if (LICENSEE_ONLY.includes(listing.typeId) && !holdsLicense(state, type)) return ctx.toast(`Only a licensee can own a ${type.name.toLowerCase()}.`, 'warn');
  const check = fundingCheck(state, listing.price, funding, type, { cashFlow: listing.profit });
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  const { sbaLoan, basis } = fund(ctx, listing.price, check);
  const biz = newBusiness(rng, state, listing.typeId, { name: listing.name, years: listing.years, scale: listing.scale, quality: listing.quality, reputation: listing.reputation, fit: listing.fit, cash: Math.round(listing.price * 0.1), assets: Math.round(listing.price * 0.4), sbaLoan, basis });
  state.business.current = biz;
  state.business.listings = state.business.listings.filter((l) => l !== listing);
  biz.valuation = Math.max(0, listing.price - sbaLoan);
  ctx.log(`You bought ${biz.name} for ${money(listing.price)}${sbaLoan ? ` (${money(sbaLoan)} SBA loan, personally guaranteed)` : ''}.`, type.icon, 'milestone');
  ctx.toast(`Bought ${biz.name}`, 'good');
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

const withBiz = (ctx) => {
  const biz = currentBusiness(ctx.state);
  if (!biz) ctx.toast('You don\'t own a business.', 'warn');
  return biz;
};

/** The staff block looks like a department to the shared workforce code. */
const asDepartment = (biz) => ({ department: biz.staff, coworkers: 50 });

export const BusinessEngine = {
  id: 'business',
  order: 31,

  init(state) {
    state.business ??= { current: null, history: [], listings: [] };
  },

  setup(engine) {
    engine.bus.on('career:hired', ({ ctx }) => {
      const biz = currentBusiness(ctx.state);
      if (biz?.role === 'operator') {
        biz.role = 'absentee';
        ctx.log(`You took a job, so a general manager now runs ${biz.name} day to day.`, '🏪');
      }
    });
  },

  onAgeUp(ctx) {
    listingsTick(ctx);
    const biz = currentBusiness(ctx.state);
    if (biz) businessTick(ctx, biz);
  },

  actions: {
    /** arg: 'typeId:cash|sba:entity' */
    start(ctx, arg) {
      const [typeId, funding = 'cash', entity = 'llc'] = String(arg).split(':');
      startBusiness(ctx, typeId, funding, entity);
    },
    /** arg: 'listingId:cash|sba' */
    buy(ctx, arg) {
      const [listingId, funding = 'cash'] = String(arg).split(':');
      buyBusiness(ctx, listingId, funding);
    },
    setRole(ctx, role) {
      const biz = withBiz(ctx);
      if (!biz || !['operator', 'absentee'].includes(role)) return;
      if (role === 'operator' && ctx.state.career.job) return ctx.toast('Quit your job to run the business full-time.', 'warn');
      if (role === 'operator' && ctx.state.legal.incarceration) return;
      biz.role = role;
      ctx.toast(role === 'operator' ? 'You run it yourself' : 'A general manager runs it', 'info');
    },
    setMarketing(ctx, level) {
      const biz = withBiz(ctx);
      const n = Number(level);
      if (biz && MARKETING[n]) biz.marketing = n;
    },
    setDraw(ctx, pct) {
      const biz = withBiz(ctx);
      const n = Number(pct);
      if (biz && [0, 0.5, 1].includes(n)) biz.drawPct = n;
    },
    setWorkforce(ctx, mode) {
      const biz = withBiz(ctx);
      if (!biz || !WORKFORCE_MODES[mode] || !biz.staff.headcount) return;
      setWorkforce(ctx, asDepartment(biz), mode);
      if (mode === 'contracted') biz.staff.unionized = false;
    },
    toggleDelegation(ctx, duty) {
      const biz = withBiz(ctx);
      if (!biz || !DUTIES[duty]) return;
      if (biz.staff.headcount < 8) return ctx.toast('Hire managers once you have 8+ staff.', 'warn');
      biz.staff.delegation[duty] = !biz.staff.delegation[duty];
    },
    toggleHealth(ctx) {
      const biz = withBiz(ctx);
      if (biz) biz.benefits.health = !biz.benefits.health;
    },
    setMatch(ctx, pct) {
      const biz = withBiz(ctx);
      const n = Number(pct);
      if (biz && [0, 0.03, 0.05].includes(n)) biz.benefits.match = n;
    },
    /** Startups: grow or shrink the team. */
    hire(ctx, n) {
      const biz = withBiz(ctx);
      if (!biz) return;
      const add = Math.max(1, Number(n) || 1);
      biz.staff.headcount = Math.min(MAX_HEADCOUNT, biz.staff.headcount + add);
      ctx.log(`${biz.name} hired ${add} more ${add === 1 ? 'person' : 'people'} (${biz.staff.headcount} on staff).`, '🤝');
    },
    layoff(ctx) {
      const biz = withBiz(ctx);
      if (!biz || !biz.staff.headcount) return;
      const cut = Math.max(1, Math.round(biz.staff.headcount * 0.3));
      biz.staff.headcount -= cut;
      bump(biz.staff, 'morale', -15);
      biz.staff.unionRisk = Math.min(100, biz.staff.unionRisk + 10);
      ctx.log(`${biz.name} laid off ${cut} people.`, '✂️', 'warn');
    },
    expand(ctx, funding = 'cash') {
      const { state } = ctx;
      const biz = withBiz(ctx);
      if (!biz) return;
      const type = typeOf(biz);
      if (type.startup) return ctx.toast('Startups grow by hiring and raising money.', 'warn');
      if (biz.scale >= 5) return ctx.toast('You\'re as big as a small business gets.', 'warn');
      if (biz.years < 2) return ctx.toast('Get through two years first.', 'warn');
      if (yearlyCount(state, 'business.expand')) return ctx.toast('One expansion a year.', 'warn');
      const cost = Math.round(type.cost * 0.8);
      if (funding === 'sba') {
        if (state.housing.credit.score < SBA.minScore) return ctx.toast(`SBA lenders want a ${SBA.minScore}+ credit score.`, 'warn');
        if (biz.cash < cost * SBA.downPayment) return ctx.toast(`The business needs ${money(cost * SBA.downPayment)} for the down payment.`, 'warn');
        biz.cash -= Math.round(cost * SBA.downPayment);
        const loan = Math.round(cost * (1 - SBA.downPayment)) + (biz.debts.sba?.balance ?? 0);
        biz.debts.sba = { balance: loan, rate: SBA.rate, annual: annualPayment(loan, SBA.rate, SBA.years), guaranteed: true };
      } else {
        if (biz.cash < cost) return ctx.toast(`Opening another location costs ${money(cost)} from the business account.`, 'warn');
        biz.cash -= cost;
      }
      bumpYearly(state, 'business.expand');
      biz.scale += 1;
      biz.assets += Math.round(cost * 0.6);
      biz.staff.headcount = Math.round(type.staff * biz.scale) + biz.family.length;
      bump(biz, 'quality', -5);
      ctx.log(`${biz.name} opened location #${biz.scale}.`, type.icon, 'milestone');
    },
    /** SBA working-capital loan for an established, profitable business. */
    loan(ctx) {
      const { state } = ctx;
      const biz = withBiz(ctx);
      if (!biz) return;
      if (typeOf(biz).startup) return ctx.toast('Banks don\'t lend to startups — raise from investors.', 'warn');
      if (biz.years < 2 || (biz.lastYear?.netIncome ?? 0) <= 0) return ctx.toast('Lenders want two years of profits.', 'warn');
      if (state.housing.credit.score < SBA.minScore) return ctx.toast(`SBA lenders want a ${SBA.minScore}+ credit score.`, 'warn');
      if (yearlyCount(state, 'business.loan')) return ctx.toast('One application a year.', 'warn');
      bumpYearly(state, 'business.loan');
      const amount = Math.round(Math.min(SBA.max, (biz.lastYear?.revenue ?? 0) * 0.25));
      const balance = amount + (biz.debts.sba?.balance ?? 0);
      biz.debts.sba = { balance, rate: SBA.rate, annual: annualPayment(balance, SBA.rate, SBA.years), guaranteed: true };
      biz.cash += amount;
      ctx.log(`${biz.name} borrowed ${money(amount)} through an SBA 7(a) loan. You signed a personal guarantee.`, '🏦', 'finance');
    },
    /** Startups: raise the next round from angels and VCs. */
    raise(ctx) {
      const { state, rng } = ctx;
      const biz = withBiz(ctx);
      if (!biz) return;
      if (biz.entity !== 'ccorp') return ctx.toast('Venture investors only buy C-corporation stock. Convert first.', 'warn');
      const round = ROUNDS[biz.roundsRaised ?? 0];
      if (!round) return ctx.toast('You\'re past venture rounds — the next step is an acquisition or an IPO.', 'warn');
      if (yearlyCount(state, 'business.raise')) return ctx.toast('One fundraise a year.', 'warn');
      if (biz.arr < round.minArr || biz.growth < round.minGrowth) return ctx.toast(`${round.name} investors want ${money(round.minArr)}+ ARR growing ${Math.round(round.minGrowth * 100)}%+.`, 'warn');
      bumpYearly(state, 'business.raise');
      const phase = PHASE_STARTUP[state.economy.phase] ?? 0;
      const chance = clamp(0.25 + (biz.quality - 50) / 100 + (biz.growth - round.minGrowth) * 0.25 + ownerSkill(state, typeOf(biz)) / 300 + phase, 0.05, 0.8);
      if (!rng.chance(chance)) {
        ctx.log(`Investors passed on ${biz.name}'s ${round.name.toLowerCase()}.`, '📭', 'warn');
        return ctx.toast('Investors passed', 'bad');
      }
      const raised = rng.int(...round.raise);
      const dilution = Math.round(rng.float(...round.dilution) * 100) / 100;
      biz.ownerPct = Math.round(biz.ownerPct * (1 - dilution) * 10000) / 10000;
      biz.investors.push({ round: round.id, pct: dilution, invested: raised });
      biz.roundsRaised = (biz.roundsRaised ?? 0) + 1;
      biz.cash += raised;
      biz.lastRound = { id: round.id, post: Math.round(raised / dilution), year: biz.years };
      biz.staff.headcount = Math.min(MAX_HEADCOUNT, Math.max(biz.staff.headcount, Math.round(raised / (typeOf(biz).wage * 2.2))));
      biz.valuation = valuation(biz);
      ctx.log(`${biz.name} closed a ${money(raised)} ${round.name.toLowerCase()} at a ${money(biz.lastRound.post)} valuation. You own ${Math.round(biz.ownerPct * 100)}% now; the team grew to ${biz.staff.headcount}.`, '💸', 'milestone');
      ctx.toast(`Raised ${money(raised)}`, 'good');
      return undefined;
    },
    /** arg: entity id. Conversions cost legal fees; investors lock you into a C-corp. */
    convert(ctx, entity) {
      const biz = withBiz(ctx);
      if (!biz || !ENTITIES[entity] || biz.entity === entity) return;
      if (biz.investors.length && entity !== 'ccorp') return ctx.toast('Your investors hold C-corp stock — you can\'t convert away.', 'warn');
      if (!ctx.spend(1500, 'Business conversion legal fees', { credit: true })) return ctx.toast('The attorney wants $1,500.', 'warn');
      biz.entity = entity;
      ctx.log(`${biz.name} is now a${entity === 'llc' ? 'n' : ''} ${ENTITIES[entity].name}.`, ENTITIES[entity].icon);
    },
    hireRelative(ctx, personId) {
      const { state } = ctx;
      const biz = withBiz(ctx);
      if (!biz) return;
      const p = state.people?.list.find((x) => x.id === personId);
      if (!p || !p.alive || !FAMILY_RELATIONS.includes(p.relation)) return;
      if (state.character.age + p.ageOffset < 16) return ctx.toast('They\'re too young to work.', 'warn');
      if (biz.family.includes(p.id)) return;
      if (biz.family.length >= 5) return ctx.toast('That\'s enough family on the payroll.', 'warn');
      biz.family.push(p.id);
      biz.staff.headcount += 1;
      p.job = `${biz.name} (family business)`;
      p.relationship = Math.min(100, p.relationship + 8);
      ctx.log(`${p.firstName} came to work at ${biz.name}.`, '👨‍👩‍👧', 'good');
    },
    sell(ctx) {
      const { state, rng } = ctx;
      const biz = withBiz(ctx);
      if (!biz) return;
      if (yearlyCount(state, 'business.sell')) return ctx.toast('You already had it on the market this year.', 'warn');
      bumpYearly(state, 'business.sell');
      const price = Math.round(biz.valuation * rng.float(0.8, 1.1));
      if (price <= 0) return ctx.toast('Nobody will buy a business with no value — close it instead.', 'warn');
      ctx.prompt({ type: 'business.offer', icon: '🪧', title: `Selling ${biz.name}`, text: `The best offer from a broker's buyers: ${money(price)}. Your share: ${money(price * biz.ownerPct)}.`, options: [{ id: 'accept', label: '✍️ Sell' }, { id: 'decline', label: '🙅 Keep it' }], data: { price } });
    },
    close(ctx) {
      if (!withBiz(ctx)) return;
      closeBusiness(ctx, 'Closed by the owner');
    },
    bankrupt(ctx) {
      if (!withBiz(ctx)) return;
      closeBusiness(ctx, 'Business bankruptcy', { liquidation: 0.35, bankruptcy: true });
    },
  },

  resolvers: {
    event(ctx, data, optionId) {
      const biz = currentBusiness(ctx.state);
      const event = BUSINESS_EVENTS.find((e) => e.id === data.eventId);
      const option = event?.options.find((o) => o.id === optionId);
      if (!biz || !option) return;
      ctx.log(option.apply(ctx, biz), typeOf(biz).icon);
    },
    union(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const biz = currentBusiness(state);
      if (!biz) return;
      const s = biz.staff;
      if (optionId === 'recognize' || (optionId === 'campaign' && rng.chance(0.45))) {
        s.unionized = true;
        s.costPremium = Math.round((s.costPremium + 0.08) * 100) / 100;
        bump(s, 'morale', 12);
        ctx.log(optionId === 'recognize' ? `You recognized the union at ${biz.name}.` : `Your staff voted the union in despite your campaign.`, '✊', 'warn');
      } else if (optionId === 'campaign') {
        bump(s, 'morale', -6);
        ctx.log('The union lost the election. Some staff are bitter.', '📣');
      } else {
        bump(s, 'morale', -18);
        if (rng.chance(0.5)) {
          const fine = rng.int(10000, 60000);
          biz.cash -= fine;
          s.unionized = true;
          state.legal.record.push({ offenseId: 'unfairLaborPractice', name: 'Unfair Labor Practice (NLRB)', severity: 'civil', age: state.character.age, sentence: `$${fine.toLocaleString()} back pay; union recognized` });
          ctx.log(`The NLRB ruled you fired the organizers illegally: ${money(fine)} in back pay, reinstatement, and a union anyway.`, '⚖️', 'bad');
        } else ctx.log('You fired the organizers. The drive collapsed — for now.', '🔥', 'warn');
      }
      s.unionRisk = 0;
    },
    temptation(ctx, data, optionId) {
      const biz = currentBusiness(ctx.state);
      const t = TEMPTATIONS[data.id];
      if (!biz || !t) return;
      if (optionId !== 'take') {
        bump(biz, 'reputation', 2);
        return ctx.log('You did it by the book.', '🙂');
      }
      const gain = t.gain(biz);
      biz.cash += gain;
      if (data.id === 'arson') {
        ctx.log(`${biz.name} burned down. The insurance company paid ${money(gain)}… and opened an investigation.`, '🔥', 'bad');
        ctx.emit('legal:offense', { offenseId: t.offenseId, context: `fire at ${biz.name}`, discovery: t.discovery, evidence: 0.8 });
        closeBusiness(ctx, 'Destroyed by fire', { liquidation: 0 });
        return;
      }
      ctx.log(`${t.take.slice(2).trim()}: ${gain ? `${money(gain)} stayed in the business` : 'the numbers look great'}.`, '😈', 'warn');
      ctx.emit('legal:offense', { offenseId: t.offenseId, context: biz.name, discovery: t.discovery, evidence: 0.8 });
    },
    offer(ctx, data, optionId) {
      if (optionId !== 'accept' || !currentBusiness(ctx.state)) return;
      exitBusiness(ctx, data.price, 'Sold');
    },
    ipo(ctx, data, optionId) {
      const { state } = ctx;
      const biz = currentBusiness(state);
      if (!biz || optionId !== 'ipo') return;
      // Founders sell a slice at the IPO; the rest is stock that rides the market after the lockup.
      const stake = Math.round(data.price * biz.ownerPct);
      const sold = Math.round(stake * 0.15);
      const e = exitProceeds({ ...biz, ownerPct: 1 }, sold);
      state.finances.cash += e.basisBack + e.qsbs;
      if (e.taxable) ctx.earn(e.taxable, `IPO share sale — ${biz.name}`, { ltcg: true });
      ctx.emit('investing:windfall', { asset: 'tech', amount: stake - sold });
      ctx.log(`${biz.name} went public at a ${money(data.price)} valuation! You sold ${money(sold)} of stock; the rest of your stake (${money(stake - sold)}) is now in your brokerage account.`, '🔔', 'milestone');
      ctx.toast('IPO!', 'good');
      ctx.stat('happiness', 20);
      retire(state, biz, 'IPO', stake);
    },
    cashCrunch(ctx, data, optionId) {
      const { state, rng } = ctx;
      const biz = currentBusiness(state);
      if (!biz) return;
      const need = data.need;
      if (optionId === 'inject') {
        if (!ctx.spend(need, `Capital injection — ${biz.name}`, { credit: true })) {
          ctx.toast('You don\'t have that much cash or credit.', 'warn');
          return cashCrunch(ctx, biz);
        }
        biz.cash += need;
        biz.basis += need;
        ctx.log(`You put ${money(need)} of your own money into ${biz.name}.`, '💰', 'warn');
      } else if (optionId === 'loc') {
        biz.debts.loc = (biz.debts.loc ?? 0) + need;
        biz.cash += need;
        ctx.log(`${biz.name} drew ${money(need)} on a credit line you personally guaranteed.`, '🏦', 'warn');
      } else if (optionId === 'bridge' && biz.investors.length && rng.chance(0.5)) {
        const raised = need * 2;
        biz.cash += raised;
        biz.ownerPct = Math.round(biz.ownerPct * 0.8 * 10000) / 10000;
        biz.investors.push({ round: 'bridge', pct: 0.2, invested: raised });
        ctx.log(`Your investors put in a ${money(raised)} bridge round. You gave up a fifth of your stake.`, '🌉', 'warn');
      } else if (optionId === 'cut' && biz.staff.headcount >= 3) {
        const cut = Math.round(biz.staff.headcount / 3);
        biz.staff.headcount -= cut;
        bump(biz.staff, 'morale', -15);
        biz.debts.payables = (biz.debts.payables ?? 0) + Math.round(-biz.cash);
        biz.cash = 0;
        ctx.log(`You laid off ${cut} people at ${biz.name}; vendors agreed to wait a year.`, '✂️', 'warn');
      } else if (optionId === 'bankrupt') {
        closeBusiness(ctx, 'Business bankruptcy', { liquidation: 0.35, bankruptcy: true });
      } else {
        closeBusiness(ctx, optionId === 'bridge' ? 'Closed after investors passed on a bridge' : 'Closed (out of cash)');
      }
    },
  },
};
