/**
 * The purchase of commissions: until the Army Regulation Act of 1871 (the Cardwell reforms), a
 * British Army officer of the cavalry, the Guards or the infantry bought his commission, and each
 * step up to lieutenant-colonel, when a vacancy came up and he had served his time. He could sell
 * it again when he left; at abolition the government bought the commissions back.
 *
 *   Regulation prices (1821, infantry of the line): ensign £450, lieutenant £700, captain £1,800,
 *   major £3,200, lieutenant-colonel £4,500; the Guards and the cavalry cost more, and most
 *   steps changed hands "over regulation" for half as much again. The artillery and the
 *   engineers (trained at Woolwich) never sold commissions; vacancies left by officers killed in
 *   action went without purchase, by seniority.
 *
 * Money is in today's dollars (about $160 to the pound of the 1850s).
 */
import { yearNow } from '../world/Eras.js';

export const PURCHASE_ABOLISHED = 1871;
/** Regulation price of each officer grade (second lieutenant/ensign … lieutenant-colonel), in pounds. */
const REGULATION = [450, 700, 1800, 3200, 4500];
const POUND = 160;
const OVER_REGULATION = 1.5;
/** The corps that never sold commissions (engineers; the medical, legal and chaplains' departments). */
const NOT_PURCHASED = ['engineer', 'medical', 'legal', 'chaplain', 'medic', 'science', 'publicHealth', 'cyber', 'intel'];
/** Minimum service in a grade before buying the next step (two years a subaltern, then three). */
const SERVE_FIRST = [2, 2, 3, 3];

/** Commissions are bought in this army, in the year being played. */
export function purchaseEra(state, { nation, branch, track, specialty } = {}) {
  return (nation ?? state.character.countryId) === 'GB' && branch === 'army' && track === 'officer' && yearNow(state) < PURCHASE_ABOLISHED && !NOT_PURCHASED.includes(specialty);
}
/** What a grade's commission cost (today's dollars, over regulation as usual). Null above lieutenant-colonel. */
export function commissionPrice(grade, specialty = 'infantry') {
  const base = REGULATION[grade];
  if (base == null) return null;
  const mult = specialty === 'aviation' ? 1 : specialty === 'armor' || specialty === 'cavalry' ? 1.4 : 1;
  return Math.round((base * mult * POUND * OVER_REGULATION) / 1000) * 1000;
}
export const ENSIGN_PRICE = commissionPrice(0);
/** The next step can be bought this year: in the purchase era, below lieutenant-colonel, time served. */
export function stepForSale(state, svc) {
  return purchaseEra(state, { nation: svc.nation, branch: svc.branch, track: svc.track, specialty: svc.specialty })
    && svc.grade < REGULATION.length - 1 && svc.yearsInGrade >= SERVE_FIRST[svc.grade];
}

/**
 * A year's promotion in a purchase regiment: a vacancy may come up for sale (a prompt to buy the
 * step), or one left by a death goes to the senior officer without purchase. Returns true when it
 * decided the year (the usual board doesn't sit).
 */
export function purchaseYear(ctx, svc) {
  const { state, rng } = ctx;
  if (!stepForSale(state, svc)) return false;
  // A vacancy without purchase: an officer killed or dead of fever (likelier in wartime).
  if (rng.chance(svc.wartime ? 0.3 : 0.08)) {
    svc.grade += 1;
    svc.yearsInGrade = 0;
    svc.acting = null;
    ctx.log(`A vacancy without purchase: the officer above you ${svc.wartime ? 'fell in action' : 'died of fever'}, and the step went to you by seniority.`, '⬆️', 'military');
    return true;
  }
  if (!rng.chance(0.6)) return true;
  const cost = commissionPrice(svc.grade + 1, svc.specialty) - commissionPrice(svc.grade, svc.specialty);
  ctx.prompt({
    type: 'military.purchaseStep', icon: '💷', title: 'A Step for Sale',
    text: `An officer above you is selling out. His commission can be yours, if you can pay the difference between your rank and his: $${cost.toLocaleString()} (regulation price and the usual sum over regulation, to the regimental agents).`,
    options: [
      { id: 'buy', label: `💷 Buy the step ($${cost.toLocaleString()})`, disabled: state.finances.cash < cost, hint: state.finances.cash < cost ? 'You can\'t raise the money' : '' },
      { id: 'pass', label: '🙅 Let a richer man buy it' },
    ],
    data: { cost, grade: svc.grade },
  });
  return true;
}

/** Leaving the army: sell your commission (before 1871), or the government's compensation for it (after). */
export function sellOut(ctx, svc) {
  if (!svc?.purchased) return;
  const value = commissionPrice(Math.min(svc.grade, REGULATION.length - 1), svc.specialty);
  if (!value) return;
  const before = yearNow(ctx.state) < PURCHASE_ABOLISHED;
  ctx.earn(value, before ? 'Sale of your commission' : 'Compensation for your purchased commission');
  ctx.log(before ? `You sold your commission for $${value.toLocaleString()}.` : `Under the Army Regulation Act the government paid you $${value.toLocaleString()} for the commission you bought.`, '💷', 'good');
}
