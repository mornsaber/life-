/**
 * A woman's life in its day: the moments the law and the times made (the rules themselves:
 * legal/Rights.js, career/EraPay.js). Each once a life:
 *
 *   The first vote     the year you were first allowed to vote, and walked to the polling station.
 *   Her husband's name the bank or the hire-purchase shop wanting your husband's signature, until the
 *                      equal-credit laws (America 1974, Britain 1975, France 1965, West Germany 1958).
 *   The pill           available on prescription: America 1960 (married women everywhere from 1965),
 *                      Britain 1961 (unmarried women from 1974), France 1967, Ireland 1979, Japan 1999.
 *   Divorce            the divorce reforms (Britain 1969, Italy 1970, Spain 1981, Ireland 1996).
 *   Trousers           and the small freedoms: a woman alone in a pub, the first woman in the office.
 */
import { yearNow, PRESENT } from '../world/Eras.js';
import { voteHere, creditInHusbandsName } from '../legal/Rights.js';

const cc = (state) => state.character.countryId ?? 'US';
const once = (state, id) => { const w = (state.womenDay ??= { seen: {} }); if (w.seen[id]) return false; w.seen[id] = true; return true; };
const married = (state) => (state.people?.list ?? []).some((p) => p.alive && p.relation === 'spouse');

const PILL_FROM = { US: 1960, GB: 1961, AU: 1961, NZ: 1961, CA: 1960, DE: 1961, FR: 1967, NL: 1962, SE: 1964, IT: 1971, ES: 1978, IE: 1979, JP: 1999, BR: 1962, MX: 1962, IN: 1960, PL: 1966 };
const DIVORCE_REFORM = { GB: [1969, 'The Divorce Reform Act: a marriage that has broken down can now be ended without proving adultery or cruelty.'], IT: [1970, 'Divorce is legal in Italy at last, after a hundred years of argument; the Church fought it to a referendum in 1974 and lost.'], ES: [1981, 'Divorce is legal in Spain again, for the first time since the Republic.'], IE: [1996, 'By the narrowest of referendums, Ireland allows divorce.'], US: [1970, 'California\'s no-fault divorce law: no one has to be blamed any more. Other states follow.'], FR: [1975, 'Divorce by mutual consent: no more staged evidence of adultery.'], AU: [1975, 'The Family Law Act: no-fault divorce after a year apart.'], DE: [1977, 'The new marriage law: no-fault divorce, and housework counts as work.'] };

function womanYear(ctx) {
  const { state } = ctx;
  const age = state.character.age;
  const y = yearNow(state);
  const c = cc(state);

  // The first vote: the first year the law lets you, as an adult.
  if (age >= 18 && !state.womenDay?.votedAt) {
    const v = voteHere(state);
    if (v.ok) {
      (state.womenDay ??= { seen: {} }).votedAt = y;
      // Only a moment worth telling where women had once been shut out.
      if (y < 1980) ctx.log(age > 30 ? `For the first time in your life you voted: ${age} years old, in your best hat, with the other women of the street.` : 'You voted for the first time, in the school hall, with your mother beside you; she remembered when women couldn\'t.', '🗳️', 'milestone');
    }
  }
  // The bank wants your husband.
  if (married(state) && age >= 21 && creditInHusbandsName(state) && once(state, 'husbandSig')) {
    ctx.log('The bank manager asked for your husband\'s signature before he would open the account. The hire-purchase shop wanted it too, for the washing machine.', '✍️', 'warn');
    ctx.stat('happiness', -2);
  }
  // The pill.
  const pill = PILL_FROM[c];
  if (pill && y >= pill && y < pill + 8 && age >= 18 && age <= 40 && (married(state) || y >= pill + 4) && once(state, 'pill')) {
    ctx.log(married(state) ? 'Your doctor prescribed the pill. For the first time, you and your husband decide when, and whether, to have a child.' : 'The family planning clinic will see unmarried women now. You came out with the pill and a different idea of your future.', '💊', 'info');
  }
  // Divorce reform.
  const d = DIVORCE_REFORM[c];
  if (d && y === d[0] && age >= 18 && once(state, 'divorceLaw')) ctx.log(d[1], '⚖️', 'info');
  // Small freedoms.
  if (age >= 18 && age <= 35 && y >= 1960 && y < 1975 && ['GB', 'US', 'FR', 'DE', 'AU', 'NZ', 'CA', 'NL', 'SE'].includes(c) && once(state, 'trousers')) ctx.log('You wore trousers to work for the first time. Nobody sent you home.', '👖', 'info');
}

export const WomenOfTheDayModule = {
  id: 'womenDay',
  order: 9.7,
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.era || yearNow(state) >= PRESENT || state.character.gender !== 'female' || state.character.age < 16) return;
    womanYear(ctx);
  },
};
