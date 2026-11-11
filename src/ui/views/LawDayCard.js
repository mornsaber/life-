/**
 * Legal tab: "The Law in <year>" — the gallows, transportation, debtors' prisons, Prohibition,
 * the police, and the law of your private life (legal/LawOfTheDay.js).
 */
import { card, button, esc } from '../Components.js';
import { yearNow, PRESENT } from '../../modules/world/Eras.js';
import { deathPenaltyThen, transportationHere, debtorsPrisonHere, prohibitionHere, policeHere, sexBetweenMenCriminal, sameSexMarriageLegal, divorceBarred } from '../../modules/legal/LawOfTheDay.js';

export function lawDayCard(state) {
  const y = yearNow(state);
  if (!state.era || y >= PRESENT || !state.legal) return '';
  const dp = deathPenaltyThen(state);
  const police = policeHere(state);
  const lines = [
    dp ? `Murder is punished by ${dp.method}${dp.status === 'routine' ? ', and few of the condemned are reprieved' : ''}.` : dp === null ? 'There are no executions now.' : '',
    transportationHere(state) ? 'A felon can be transported to the Australian colonies for seven years, fourteen, or life.' : '',
    debtorsPrisonHere(state) ? 'Run up debts you can\'t pay, and your creditors can have you locked in a debtors\' prison.' : '',
    prohibitionHere(state) ? 'Prohibition: making and selling drink is a crime.' : '',
    police && !police.yet ? `There's no police force yet (${police.name} is founded in ${police.from}): parish constables, watchmen and thief-takers.` : '',
    sexBetweenMenCriminal(state) ? 'Sex between men is a crime.' : '',
    !sameSexMarriageLegal(state) && y >= 1990 ? 'Two men or two women can\'t marry.' : '',
    divorceBarred(state) ? `${divorceBarred(state)}.` : '',
  ].filter(Boolean);
  const bootleg = prohibitionHere(state) && state.character.age >= 18 && !state.legal.incarceration
    ? `<div class="toggle-row">${button('🥃 Run liquor to the speakeasies', 'lawDay.bootleg', { variant: 'small danger', hint: 'Good money; raids happen' })}</div>` : '';
  if (!lines.length && !bootleg) return '';
  return card(`The Law in ${y}`, `<p>${esc(lines.join(' '))}</p>${bootleg}`, { icon: '⚖️' });
}
