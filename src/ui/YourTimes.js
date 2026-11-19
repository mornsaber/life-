/**
 * Your times: for a life that starts in the past, a card on the story page for its first years,
 * saying what kind of world you were born into: how long people lived, what hasn't been invented,
 * what work and school were like, who could vote, and what the game will hold back until its year.
 */
import { card, esc } from './Components.js';
import { yearNow, PRESENT, TECH } from '../modules/world/Eras.js';
import { demographyAt } from '../modules/world/HistoricalData.js';
import { COUNTRIES } from '../modules/world/Countries.js';
import { SUFFRAGE_FROM } from '../modules/politics/StatuteBook.js';
import { carShare } from '../modules/vehicles/DrivingOfTheDay.js';

const INVENTIONS = [
  ['railway', 'railways'], ['telegraph', 'the telegraph'], ['telephone', 'the telephone'], ['electricLight', 'electric light at home'],
  ['automobile', 'motor cars'], ['radio', 'radio'], ['antibiotics', 'antibiotics'], ['tv', 'television'], ['airTravel', 'air travel for ordinary people'],
  ['creditCards', 'credit cards'], ['personalComputer', 'home computers'], ['mobilePhone', 'mobile phones'], ['internet', 'the internet'], ['smartphone', 'smartphones'],
];
const PENSION_FROM = { DE: 1891, NZ: 1898, DK: 1891, AU: 1909, GB: 1909, FR: 1910, SE: 1913, IT: 1919, CA: 1927, US: 1940, JP: 1942, RU: 1956, IN: 1995, '*': 1950 };

/** The facts for a life born in `year` in `cc` (also used by tests). */
export function yourTimesFacts(state) {
  const y = yearNow(state);
  const cc = state.character.countryId ?? 'US';
  const female = state.character.gender === 'female';
  const facts = [];
  const life = demographyAt(cc, y)?.life;
  if (life) facts.push(['⏳', `A baby born here can expect to live about ${Math.round(life)} years${life < 50 ? `, mostly because so many die as children: get through childhood and you may well see ${life < 32 ? 'fifty' : 'sixty'}` : ''}.`]);
  const notYet = INVENTIONS.filter(([id]) => TECH[id] > y).slice(0, 4).map(([, name]) => name);
  if (notYet.length) facts.push(['🕰️', `Not invented yet, or not for people like you: ${notYet.join(', ')}. They arrive in their year.`]);
  const schooled = ['US', 'GB', 'IE', 'CA', 'AU', 'NZ', 'FR', 'DE', 'AT', 'NL', 'BE', 'DK', 'SE', 'NO', 'FI', 'CH', 'IS', 'JP'].includes(cc);
  if (!schooled && y < 1950) facts.push(['🌾', 'Most children here never go to school: they work beside their parents from six or seven, in the fields, the workshop or the house.']);
  else if (y < 1900) facts.push(['🏭', 'Most children work by twelve or fourteen: on the land, in service, at the mill. School, if any, ends early.']);
  else if (y < 1950) facts.push(['📚', 'Most children leave school at fourteen and go to work; few go on to secondary school, fewer to university.']);
  if (y < 1945) facts.push(['🩺', 'Doctors can do little for infections: a cut, a fever or childbirth can kill. There are no antibiotics yet.']);
  const vote = SUFFRAGE_FROM[cc] ?? SUFFRAGE_FROM['*'];
  if (female && y + 21 < vote) facts.push(['🗳️', `Women can't vote here yet (not until ${vote}), and a married woman's money and property are largely her husband's.`]);
  const pension = PENSION_FROM[cc] ?? PENSION_FROM['*'];
  if (y + 65 < pension) facts.push(['👴', 'There is no state pension: people work until they can\'t, then live with their children.']);
  if (y >= 1905 && y < 1990 && carShare(state) < 0.2) facts.push(['🚲', 'Few families have a car: you walk, cycle, or take the tram and the train.']);
  return facts;
}

/** The card, for the first years of a life begun in the past. */
export function yourTimesCard(state) {
  if (!state.era || state.character.age > 3) return '';
  const y = yearNow(state) - state.character.age;
  if (y >= PRESENT - 25) return '';
  const facts = yourTimesFacts({ ...state, character: { ...state.character, age: 0 } });
  if (!facts.length) return '';
  const where = COUNTRIES[state.character.countryId ?? 'US']?.name ?? '';
  const rows = facts.map(([i, t]) => `<li><span aria-hidden="true">${i}</span> ${esc(t)}</li>`).join('');
  return card(`Your Times: ${esc(where)}, ${y}`, `<ul class="tips">${rows}</ul><p class="fine">The world changes as you age: new inventions, laws and wars arrive in the year they did.</p>`, { icon: '🗞️', accent: 'blue', fold: false });
}
