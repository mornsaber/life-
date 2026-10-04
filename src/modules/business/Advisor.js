/**
 * The business advisor: a forecast of next year and plain suggestions for
 * what would raise profit, each with an estimated dollar effect and the
 * action that does it. Pure — it simulates "what if" on copies of the
 * business with an average year, so it never changes the game.
 */
import { typeOf, yearFinancials, debtBalance } from './Business.js';
import { MARKETING } from './BusinessTypes.js';
import { BUSINESS_LICENSES, optionalLicenses, licenseEligibility } from './BusinessLicenses.js';

const AVERAGE = { float: (a, b) => (a + b) / 2, int: (a, b) => Math.round((a + b) / 2), chance: () => false, pick: (xs) => xs[0], id: () => 'probe', next: () => 0.5 };
const money = (x) => `$${Math.round(Math.abs(x)).toLocaleString()}`;

/** Next year in an average economy-year for this business as it is now. */
export function forecast(state, biz, changes = {}) {
  const probe = structuredClone(biz);
  probe.years += 1;
  Object.assign(probe, changes.biz ?? {});
  if (changes.staff) Object.assign(probe.staff, changes.staff);
  if (changes.licenses) probe.licenses = { ...probe.licenses, ...changes.licenses };
  const ly = yearFinancials(state, probe, AVERAGE);
  const debtService = probe.debts.sba ? Math.max(0, probe.debts.sba.annual - Math.round(probe.debts.sba.balance * probe.debts.sba.rate)) : 0;
  return { ...ly, cashAfter: Math.round(probe.cash + ly.netIncome - debtService - (probe.debts.payables ?? 0)) };
}

/** What a change would do to next year's profit. */
const delta = (state, biz, changes, base) => forecast(state, biz, changes).netIncome - base.netIncome;

/**
 * Suggestions, best first: [{ icon, text, gain, action, arg, label }].
 * `gain` is the estimated change in yearly profit (when it can be estimated).
 */
export function businessAdvice(state, biz) {
  const type = typeOf(biz);
  const base = forecast(state, biz);
  const out = [];
  const add = (icon, text, gain, action, arg, label) => out.push({ icon, text, gain, action, arg, label });

  // Price point for your quality.
  for (const level of ['premium', 'standard', 'budget']) {
    if ((biz.priceLevel ?? 'standard') === level) continue;
    const g = delta(state, biz, { biz: { priceLevel: level } }, base);
    if (g > Math.max(3000, base.revenue * 0.01)) add('🏷️', `${level === 'premium' ? 'Your quality supports premium prices' : level === 'budget' ? 'Customers aren\'t paying for your current prices — budget pricing wins volume' : 'Market-rate prices would fit your quality better'}: about +${money(g)}/yr.`, g, 'business.setPrice', level, `Switch to ${level}`);
  }
  // Marketing.
  for (let m = 0; m < MARKETING.length; m++) {
    if (m === biz.marketing) continue;
    const g = delta(state, biz, { biz: { marketing: m } }, base);
    if (g > Math.max(3000, base.revenue * 0.01)) add('📣', `${m > biz.marketing ? 'More' : 'Less'} marketing (${MARKETING[m].label}) pays: about +${money(g)}/yr.`, g, 'business.setMarketing', String(m), `${MARKETING[m].label} marketing`);
  }
  // Suppliers.
  for (const sup of ['cheap', 'standard', 'premium']) {
    if ((biz.supplier ?? 'standard') === sup) continue;
    const g = delta(state, biz, { biz: { supplier: sup } }, base);
    if (g > Math.max(3000, base.revenue * 0.01)) add('📦', `${sup === 'cheap' ? 'Cheaper' : sup === 'premium' ? 'Better' : 'Standard'} suppliers: about +${money(g)}/yr${sup === 'cheap' ? ' (quality slips a little)' : ''}.`, g, 'business.setSupplier', sup, `${sup[0].toUpperCase()}${sup.slice(1)} suppliers`);
  }
  // Optional licenses you could get.
  for (const id of optionalLicenses(biz.typeId)) {
    if (biz.licenses?.[id]) continue;
    const l = BUSINESS_LICENSES[id];
    if (!licenseEligibility(state, id, biz.typeId, biz).ok) continue;
    const g = delta(state, biz, { licenses: { [id]: { status: 'active' } } }, base) - l.renewal.fee / l.renewal.years;
    if (g > 0) add(l.icon, `A ${l.name} would add about ${money(g)}/yr after renewals (${money(l.fee)} to get${l.processing ? ', takes a year' : ''}${l.chance ? ', approval not guaranteed' : ''}).`, g, 'business.getLicense', id, `Apply (${money(l.fee)})`);
  }
  // People: morale and pay.
  if (biz.staff.headcount && biz.staff.morale < 45 && (biz.payLevel ?? 'market') !== 'above') add('😟', `Morale is ${biz.staff.morale}% — people are quitting. Paying above market would steady the team.`, null, 'business.setPay', 'above', 'Pay above market');
  if (biz.staff.headcount && biz.staff.morale > 75 && biz.payLevel === 'above') {
    const g = delta(state, biz, { biz: { payLevel: 'market' } }, base);
    if (g > 3000) add('💵', `Morale is high (${biz.staff.morale}%). Market pay would save about ${money(g)}/yr.`, g, 'business.setPay', 'market', 'Pay at market');
  }
  // Quality.
  if (biz.quality < 55 && !state.yearly?.['business.invest.equipment']) {
    const cost = Math.round(type.cost * 0.15 * Math.max(1, biz.scale));
    if (biz.cash >= cost) {
      const g = delta(state, biz, { biz: { quality: Math.min(100, biz.quality + 5) } }, base);
      add('🛠️', `Quality is ${biz.quality}. New equipment (${money(cost)}) would lift it — about +${money(g)}/yr.`, g, 'business.invest', 'equipment', 'Buy equipment');
    }
  }
  // Debt.
  const debt = debtBalance(biz);
  if (biz.debts.sba && biz.cash > biz.debts.sba.balance * 0.3 + 25000) add('🏦', `You're paying ${Math.round(biz.debts.sba.rate * 1000) / 10}% on ${money(biz.debts.sba.balance)}. Paying it down from spare cash saves interest.`, Math.round(Math.min(biz.debts.sba.balance, biz.cash - 25000) * biz.debts.sba.rate), 'business.payDown', null, 'Pay down debt');
  // Who runs it.
  if (biz.role === 'absentee' && !biz.licensedManager && base.netIncome > 0 && !state.career.job && !state.legal?.incarceration) {
    const g = delta(state, biz, { biz: { role: 'operator' } }, base);
    if (g > 10000) add('🧑‍💼', `Running it yourself would save the manager's salary: about +${money(g)}/yr.`, g, 'business.setRole', 'operator', 'Run it yourself');
  }
  // A bad location.
  if (!type.startup && (biz.fit ?? 1) < 0.85 && biz.years >= 1) {
    const cost = Math.round(type.cost * 0.3 * Math.max(1, biz.scale ** 0.5));
    const g = delta(state, biz, { biz: { fit: 1 } }, base);
    if (g > 0) add('📍', `This location is underperforming (customers ${Math.round((1 - biz.fit) * 100)}% below a typical spot). Moving (${money(cost)}) could add about ${money(g)}/yr.`, g, 'business.relocate', null, 'Move the business');
  }
  // Cash warning.
  if (base.cashAfter < 0) add('⚠️', `Forecast: the business runs ${money(base.cashAfter)} short next year${debt ? ' after loan payments' : ''}. Cut costs, raise prices, or line up a credit line now.`, null, null, null, null);
  return out.sort((a, b) => (b.gain ?? -1) - (a.gain ?? -1)).slice(0, 6);
}
