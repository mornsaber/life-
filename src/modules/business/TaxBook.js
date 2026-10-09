/**
 * Spending outside the yearly books. It comes out of the business account
 * now and is deducted from next year's taxable profit: ordinary expenses
 * (legal settlements, fees, repairs, bids) in full, and capital purchases
 * (locations, vehicles, equipment) through 100% bonus depreciation. Fines
 * and penalties paid to a government aren't deductible — don't use this for
 * them. `financed`: the part of a capital purchase paid with a loan (still
 * depreciable, but no cash leaves now).
 */
export function charge(biz, amount, kind = 'expense', financed = 0) {
  const a = Math.round(amount);
  biz.cash -= a;
  const book = (biz.taxBook ??= { expense: 0, capex: 0 });
  book[kind === 'capex' ? 'capex' : 'expense'] += a + Math.round(financed);
}
