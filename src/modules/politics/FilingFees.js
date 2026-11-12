/**
 * What it costs to get your name on the ballot, by office, country and year. Most of the world
 * charges little or nothing: a deposit you get back if you poll enough, or a petition.
 *
 *   United States  state filing fees for state and federal offices (Texas: $3,125 for the
 *                  House, $5,000 for the Senate; Florida: 6% of the salary); a presidential
 *                  run pays ballot-access fees state by state, not a fortune. Before primaries
 *                  (about 1910), parties nominated and nobody filed.
 *   Britain        a deposit for the Commons: £150 from 1918, £500 from 1985, returned with
 *                  12.5% of the vote (5% from 1985).
 *   Australia      $1,000 for the House, $2,000 from 2019, returned with 4%.
 *   Canada         $1,000, returned when you file your accounts, until 2017; none since.
 *   New Zealand    NZ$300, returned with 5%.
 *   Japan          ¥3 million for a lower-house seat, forfeit under 10%.
 *   India          ₹25,000 for the Lok Sabha, forfeit under a sixth of the vote.
 *   Elsewhere      signatures on nomination papers, no fee.
 *
 * filingFor(state, officeId) → { fee, deposit, refundAt, label }  (dollars of today)
 */
import { OFFICES } from './Offices.js';
import { LEGISLATURES } from './NationalOffices.js';
import { yearNow } from '../world/Eras.js';

const US_FEES = { schoolBoard: 50, cityCouncil: 100, countyCommissioner: 750, sheriff: 1200, districtAttorney: 1200, mayor: 500, stateRep: 750, stateSenator: 1250, judge: 1500, usRep: 3125, governor: 3750, usSenator: 5000, president: 25000 };

/** Deposits for a seat in the national lower house: [from, until, dollars, refund share]. */
const DEPOSITS = {
  GB: [[1918, 1985, 650, 0.125], [1985, 9999, 650, 0.05]],
  AU: [[1902, 2019, 1000, 0.04], [2019, 9999, 2000, 0.04]],
  CA: [[1874, 2017, 1000, 0]],
  NZ: [[1890, 9999, 300, 0.05]],
  JP: [[1925, 9999, 20000, 0.1]],
  IN: [[1951, 9999, 300, 1 / 6]],
};

export function filingFor(state, officeId) {
  const o = OFFICES[officeId];
  const none = { fee: 0, deposit: 0, refundAt: 0, label: 'Nomination papers signed by local voters' };
  if (!o || o.appointedBy || o.selection === 'appointed' || o.selection === 'parliament') return none;
  const cc = state.character.countryId ?? 'US';
  const y = yearNow(state);
  if (cc === 'US' && !o.country) {
    if (y < 1910) return { ...none, label: 'Your party nominates its candidates at a convention' };
    const fee = US_FEES[officeId] ?? Math.min(5000, Math.round((o.salary ?? 0) * 0.02));
    return { fee, deposit: 0, refundAt: 0, label: officeId === 'president' ? 'Ballot-access fees, state by state' : 'Filing fee to the state' };
  }
  const lower = LEGISLATURES[cc]?.lower?.office === officeId;
  const row = lower && (DEPOSITS[cc] ?? []).find(([a, b]) => y >= a && y < b);
  if (!row) return none;
  const [, , deposit, refundAt] = row;
  return { fee: 0, deposit, refundAt, label: refundAt ? `A deposit, returned with ${Math.round(refundAt * 1000) / 10}% of the vote` : 'A deposit, returned when you file your accounts' };
}

/** After the vote: the deposit comes back, or it's lost. */
export function settleDeposit(ctx, c, share) {
  if (!c?.deposit) return;
  if (share >= (c.refundAt ?? 0)) { ctx.earn(c.deposit, 'Election deposit returned'); return; }
  ctx.log(`You polled under ${Math.round(c.refundAt * 1000) / 10}% and lost your $${c.deposit.toLocaleString()} deposit.`, '💸', 'bad');
}
