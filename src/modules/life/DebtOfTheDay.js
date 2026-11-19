/**
 * Being short of money as it was, by country and era: the cards, collectors and Chapter 7 of today's
 * America (life/CreditCards.js, life/Bankruptcy.js) were never the whole world's story.
 *
 *   The pawnshop    "uncle's" in Britain (the Sunday suit in on Monday, out on Saturday), the
 *                   Mont-de-Piété in France ("ma tante"), the shichiya in Japan; gold to the
 *                   sahukar in India.
 *   The moneylender cash now, ruinous interest later: the loan shark, the sahukar's ledger (and
 *                   bonded labour when you can't pay), Japan's sarakin (1960s–2006), the payday
 *                   lender in America from the 1990s.
 *   The tally man   Britain's weekly-payment man (1880s–1960s): goods on tick, a shilling a week.
 *   Relief          the parish, the relieving officer and the means test in Britain until 1948;
 *                   the county poor fund in America until the New Deal; France's bureau de
 *                   bienfaisance; the mutual-aid fund at a Soviet workplace.
 *
 * When you're in debt, now and then: a prompt with the ways out that existed where and when you
 * live. Also the words for the collectors and for medical bills by country (used by Finances and
 * HealthEngine). state.debtDay = { seen, lender: { owed, due, kind } }
 */
import { Random } from '../../core/Random.js';
import { yearNow, PRESENT, hasTech } from '../world/Eras.js';
import { priceLevel } from '../world/Countries.js';

const cc = (state) => state.character?.countryId ?? 'US';
const historic = (state) => Boolean(state?.era) && yearNow(state) < PRESENT;
const BRIT = ['GB', 'IE', 'AU', 'NZ', 'CA'];
const SOVIET = ['RU', 'UA', 'BY', 'KZ', 'GE', 'AM', 'AZ', 'UZ', 'KG', 'TJ', 'TM', 'MD', 'EE', 'LV', 'LT'];
const SOUTH_ASIA = ['IN', 'PK', 'BD', 'NP', 'LK'];
const drng = (state) => new Random((((state.world?.seed ?? 1) * 7333) ^ (state.character.age * 911 + 0x5d3)) >>> 0);

/** Who comes for an unpaid debt, in a sentence. */
export function collectorsLine(state, owe, word) {
  const y = yearNow(state);
  const c = cc(state);
  const amount = `$${owe.toLocaleString()} ${word}`;
  if (c === 'US' && y >= 1955) return `Debt collectors keep calling. You owe ${amount}.`;
  if (SOVIET.includes(c) && y >= 1930 && y < 1992) return `You owe ${amount}: to colleagues, to the neighbours, to the woman in the next flat. Everyone knows.`;
  if (SOUTH_ASIA.includes(c)) return `The moneylender's man sits on your step every morning. You owe ${amount}, and the interest is written in his ledger, not yours.`;
  if (y < 1950) return BRIT.includes(c) ? `Your creditors keep sending round: the grocer has stopped your tick, and the landlord's man knocks on Mondays. You owe ${amount}.` : `Your creditors keep sending round. You owe ${amount}.`;
  if (hasTech(state, 'telephone') && y >= 1970) return `Debt collectors keep calling. You owe ${amount}.`;
  return `The bailiffs' letters keep coming. You owe ${amount}.`;
}

/** What happens to unpaid doctor's and hospital bills here (a sentence), and who might forgive them. */
export function medicalDebtWords(state) {
  const y = yearNow(state);
  const c = cc(state);
  if (c === 'US') {
    if (y < 1950) return { collections: 'The doctor\'s bills went unpaid; his collector came round, then stopped coming.', charity: 'The county hospital wrote off what you owed: you were on the charity ward.' };
    return { collections: null, charity: null };
  }
  if (BRIT.includes(c) && y < 1948) return { collections: 'The doctor\'s bill went unpaid. His collector called on Fridays, when the wages came in.', charity: 'The hospital almoner assessed you: the bill was cut to what she judged you could pay.' };
  if (c === 'FR' && y < 1945) return { collections: 'The doctor\'s fees went unpaid; the huissier sent a letter.', charity: 'The bureau de bienfaisance paid the doctor: free medical assistance for the poor (1893).' };
  if (y < 1950) return { collections: 'The doctor\'s bill went unpaid, and the next time you were ill you didn\'t send for him.', charity: 'The sisters at the charity hospital asked for nothing.' };
  return { collections: 'The hospital bills went to a debt-collection agency.', charity: 'The hospital\'s social worker got most of the bill waived.' };
}

/** The ways out of a money crisis that existed here and now: [{ id, label, hint }]. */
export function waysOut(state) {
  const y = yearNow(state);
  const c = cc(state);
  const out = [];
  // The pawnshop: everywhere, and everyone's in the old days.
  if (y < 2000 || c !== 'US') {
    const shop = c === 'FR' ? 'the Mont-de-Piété ("ma tante")' : c === 'JP' ? 'the shichiya' : SOUTH_ASIA.includes(c) ? 'the sahukar (your wife\'s gold)' : BRIT.includes(c) && y < 1960 ? 'uncle\'s (the pawnbroker)' : 'the pawnshop';
    out.push({ id: 'pawn', label: `🏷️ Pawn something at ${shop}`, hint: y < 1950 ? 'The Sunday clothes, the clock, the wedding ring' : 'A ring, a watch, the good camera' });
  }
  // The moneylender.
  const lender = SOUTH_ASIA.includes(c) ? 'the village moneylender' : c === 'JP' && y >= 1960 && y < 2006 ? 'a sarakin consumer lender' : c === 'US' && y >= 1990 ? 'a payday lender' : SOVIET.includes(c) && y >= 1930 && y < 1992 ? null : y < 1970 ? 'a moneylender' : null;
  if (lender) out.push({ id: 'lender', label: `💰 Borrow from ${lender}`, hint: 'Cash now; much more to pay back in two years', tone: 'danger' });
  // Goods on tick.
  if (BRIT.includes(c) && y >= 1880 && y < 1965) out.push({ id: 'tally', label: '📒 Buy on tick from the tally man', hint: 'A shilling a week, for ever' });
  // Relief.
  const relief = BRIT.includes(c) && y < 1948 ? (y >= 1931 ? 'the means test at the Public Assistance office' : 'the relieving officer (parish relief)')
    : c === 'US' && y < 1935 ? 'the county poor fund'
      : c === 'FR' && y < 1945 ? 'the bureau de bienfaisance'
        : SOVIET.includes(c) && y >= 1930 && y < 1992 ? 'the mutual-aid fund at work (kassa vzaimopomoshchi)'
          : null;
  if (relief) out.push({ id: 'relief', label: `🏛️ Apply to ${relief}`, hint: SOVIET.includes(c) ? 'An interest-free loan, repaid from your wages' : 'A little help, and everyone in the street knowing' });
  out.push({ id: 'tighten', label: '🍞 Tighten your belt', hint: 'Bread and dripping until it\'s paid' });
  return out;
}

const owed = (state) => Math.max(0, -(state.finances?.cash ?? 0));
const scale = (state) => Math.max(1, Math.round((state.finances?.lastYear?.gross ?? 0) * 0.15)) || Math.round(800 * priceLevel(state));

export const DebtOfTheDayModule = {
  id: 'debtDay',
  order: 63.5,
  init(state) { state.debtDay ??= { seen: {} }; },
  onAgeUp(ctx) {
    const { state } = ctx;
    const d = (state.debtDay ??= { seen: {} });
    const age = state.character.age;
    const c = cc(state);
    // Old-style help is for the past and for other countries; today's America has its cards and courts.
    if (!historic(state) && c === 'US') return;
    if (age < 18 || state.legal?.incarceration) return;
    // The moneylender's due date.
    if (d.lender && age >= d.lender.due) {
      const due = d.lender.owed;
      if ((state.finances.cash ?? 0) >= due) {
        ctx.spend(due, 'Moneylender repaid');
        ctx.log('You paid off the moneylender, every anna and every penny of his interest.'.replace('every anna and every penny', SOUTH_ASIA.includes(c) ? 'every anna' : 'every penny'), '💰', 'info');
      } else if (SOUTH_ASIA.includes(c)) {
        ctx.spend(due, 'Moneylender (unpaid)', { allowDebt: true });
        ctx.log('You couldn\'t pay the moneylender. Now you work his fields for nothing to pay the interest: bonded, like your father before you.', '⛓️', 'bad');
        ctx.stat('happiness', -10);
      } else {
        ctx.spend(due, 'Moneylender (unpaid)', { allowDebt: true });
        ctx.log(c === 'JP' ? 'The sarakin\'s men called at your work and your parents\' house, and rang all night.' : 'You couldn\'t pay the moneylender. His men came to see you.', '👊', 'bad');
        ctx.stat('health', -3);
        ctx.stat('happiness', -8);
      }
      delete d.lender;
      return;
    }
    // In debt beyond a couple of months' wages: now and then, a choice.
    const debt = owed(state);
    if (debt < scale(state) || d.lender) return;
    if (d.lastAsked != null && age - d.lastAsked < 3) return;
    if (state.prompts?.some((p) => p.type === 'finances.debtCrisis' || p.type === 'debtDay.short')) return;
    if (!drng(state).chance(0.5)) return;
    d.lastAsked = age;
    ctx.prompt({
      type: 'debtDay.short', icon: '🪙', title: 'Short of Money',
      text: `You owe $${debt.toLocaleString()}, and the rent is due on Friday.`,
      data: { debt },
      options: waysOut(state),
    });
  },
  resolvers: {
    short(ctx, data, optionId) {
      const { state } = ctx;
      const rng = drng(state);
      const c = cc(state);
      const d = (state.debtDay ??= { seen: {} });
      const debt = data?.debt ?? owed(state);
      if (optionId === 'pawn') {
        const got = Math.round(Math.min(debt, scale(state)) * rng.float(0.3, 0.6));
        ctx.earn(got, 'Pawned');
        ctx.log(`You pawned ${yearNow(state) < 1950 ? 'your Sunday clothes and the clock' : 'your watch'} for $${got.toLocaleString()}.${rng.chance(0.5) ? ' You never redeemed the ticket.' : ''}`, '🏷️', 'info');
        ctx.stat('happiness', -2);
      } else if (optionId === 'lender') {
        const got = Math.round(debt * 0.8);
        ctx.earn(got, 'Moneylender loan');
        d.lender = { owed: Math.round(got * (SOUTH_ASIA.includes(c) ? 2.2 : 1.8)), due: state.character.age + 2, kind: c };
        ctx.log(`The moneylender counted out $${got.toLocaleString()}. In two years you'll owe him $${d.lender.owed.toLocaleString()}.`, '💰', 'warn');
      } else if (optionId === 'tally') {
        ctx.log('The tally man called with a coat for the winter and his little book: a shilling a week, every week, for as long as anyone can remember.', '📒', 'info');
        ctx.stat('stress', -3);
        ctx.spend(Math.round(scale(state) * 0.1), 'The tally man');
      } else if (optionId === 'relief') {
        const got = Math.round(Math.min(debt, scale(state)) * 0.5);
        ctx.earn(got, 'Relief');
        ctx.log(SOVIET.includes(c) ? `The mutual-aid fund at work lent you $${got.toLocaleString()}, to be taken from your wages.` : `Relief, after a man came to see what you could sell first: $${got.toLocaleString()}, and the neighbours knowing.`, '🏛️', 'info');
        if (!SOVIET.includes(c)) ctx.stat('happiness', -5);
      } else {
        ctx.log('You cut back to nothing: no meat, no coal after nine, and the shoes mended again.', '🍞', 'info');
        ctx.stat('stress', 4);
        ctx.stat('health', -1);
      }
    },
  },
};
