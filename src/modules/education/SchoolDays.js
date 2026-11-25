/**
 * School as it was lived, year by year (who went and for how long: SchoolingOfTheDay.js).
 *
 *   Before school   Britain's dame schools: an old woman's front room, the alphabet and knitting.
 *   The classroom   slates and chalk, copybooks and dip pens, chanting tables; the one-room
 *                   schoolhouse of rural America; streaming and the school certificate.
 *   Punishment      the cane in English schools (state schools until 1987), the strap, the paddle;
 *                   banned in France in 1887, Sweden 1958, Japan 1947, West Germany 1973.
 *   The left hand   tied or rapped until you wrote with your right, into the 1960s.
 *   Moments         school milk in Britain (1946–71, "Thatcher, milk snatcher"); evacuation in
 *                   1939; duck-and-cover drills (America, 1951–63); the Young Pioneers' red scarf;
 *                   segregated schools in the American South until Brown (1954) and long after.
 *   Exams at the end  the School Certificate (1918–51), O-levels (1951–87), GCSEs; the Abitur;
 *                   the bac; Japan's "examination hell" and the juku.
 *
 * state.schoolDays = { seen: {...} }
 */
import { Random } from '../../core/Random.js';
import { yearNow, PRESENT } from '../world/Eras.js';
import { REGIONS } from '../life/Regions.js';
import { skinToneOf } from '../people/SkinTone.js';
import { statuteIn, statuteOverride, CANE_UNTIL } from '../politics/StatuteBook.js';

const cc = (state) => state.character.countryId ?? 'US';
const sideRng = (state) => new Random((((state.world?.seed ?? 1) * 5807) ^ (state.character.age * 389 + 0x5c1)) >>> 0);
const once = (state, id) => { const s = (state.schoolDays ??= { seen: {} }); if (s.seen[id]) return false; s.seen[id] = true; return true; };
const SOUTH = ['AL', 'AR', 'FL', 'GA', 'LA', 'MS', 'NC', 'SC', 'TN', 'TX', 'VA', 'KY', 'OK', 'WV', 'MD', 'DE', 'MO'];
const BLOC = ['RU', 'UA', 'BY', 'PL', 'CZ', 'HU', 'RO', 'BG', 'DD', 'CN', 'VN', 'CU', 'KP'];

/** The year corporal punishment ended in schools here (before it, the cane/strap was ordinary). */
const IMPLEMENT = { GB: 'the cane', IE: 'the leather strap', US: 'the paddle', AU: 'the cane', NZ: 'the strap', CA: 'the strap', ZA: 'the cane', IN: 'the ruler', DE: 'the Rohrstock', AT: 'the Rohrstock', JP: 'the teacher\'s fist' };
export const caneHere = (state) => statuteIn(state, 'schoolCane');

/** The exams you sat at the end of school, here and now. */
export function leavingExam(state) {
  const y = yearNow(state);
  const c = cc(state);
  if (c === 'GB') return y >= 1988 ? 'GCSEs' : y >= 1951 ? 'O-levels' : y >= 1918 ? 'the School Certificate' : null;
  if (c === 'IE') return y >= 1925 ? 'the Intermediate Certificate' : null;
  if (c === 'FR') return y >= 1808 ? 'the baccalauréat' : null;
  if (['DE', 'AT'].includes(c)) return 'the Abitur';
  if (c === 'JP') return y >= 1979 ? 'the university entrance exams' : y >= 1947 ? 'the entrance exams' : null;
  if (c === 'US') return y >= 1926 ? 'the SAT' : null;
  if (c === 'IN' || c === 'PK' || c === 'BD') return y >= 1975 ? 'the Class 10 board exams' : y >= 1860 ? 'the Matriculation' : null;
  if (['RU', 'UA', 'BY'].includes(c)) return y >= 2009 ? 'the EGE (unified state exam)' : y >= 1918 ? 'the school-leaving exams (attestat)' : null;
  if (c === 'PL') return y >= 1918 ? 'the matura' : null;
  if (c === 'CZ') return y >= 1918 ? 'the maturita' : null;
  if (c === 'HU') return y >= 1851 ? 'the érettségi' : null;
  if (['RO', 'BG'].includes(c)) return y >= 1925 ? 'the baccalaureate' : null;
  if (c === 'CN') return (y >= 1952 && y < 1966) || y >= 1977 ? 'the gaokao' : null;
  if (c === 'KR') return y >= 1994 ? 'the suneung' : y >= 1969 ? 'the college entrance exam' : null;
  if (c === 'BR') return y >= 1911 ? 'the vestibular' : null;
  if (c === 'IT') return y >= 1923 ? 'the maturità' : null;
  if (c === 'ES') return y >= 1857 ? 'the bachillerato' : null;
  if (['NG', 'GH', 'SL', 'GM'].includes(c)) return y >= 1952 ? 'the West African School Certificate' : null;
  return null;
}

function inSchool(state) {
  const k = state.k12;
  const s = state.schooling ?? {};
  return k && !k.done && !k.dropout && !k.expelled && !s.unschooled;
}

function schoolYear(ctx, rng) {
  const { state } = ctx;
  const age = state.character.age;
  const y = yearNow(state);
  const c = cc(state);
  const region = REGIONS[state.character.regionId];
  const brit = c === 'GB' || c === 'IE';

  // Before school: a dame school (England, before the Education Act).
  if (brit && y < 1880 && age === 4 && state.people?.wealth !== 'upper' && once(state, 'dame')) {
    ctx.log('Your mother sends you to the dame school: an old woman\'s front room, a penny a week, the alphabet off a card, and knitting.', '🧶', 'info');
  }
  if (!inSchool(state) || age < 5) return;

  // First day: what the classroom looked like.
  // Soviet children start on 1 September at seven, Japanese children with their randoseru at six: those are told below.
  const ownFirstDay = (['RU', 'UA', 'BY'].includes(c) && y >= 1937 && y < 1993) || (c === 'JP' && y >= 1954);
  // At six, once it's settled whether there's a school for you at all (education/SchoolingOfTheDay.js).
  if (age === 6 && !state.schooling?.unschooled && !ownFirstDay && once(state, 'first')) {
    const rural = /rural/i.test(region?.type ?? '') && c === 'US';
    ctx.log(y < 1900 ? 'Your first day at school: a slate and a slate pencil, the whole class chanting the alphabet, the master with his cane on the desk.'
      : rural && y < 1945 ? 'Your first day at the one-room schoolhouse: eight grades and one teacher, a stove in the corner, and you carry in the wood.'
      : y < 1950 ? 'Your first day at school: rows of desks bolted to the floor, inkwells, and a picture of the King on the wall.'.replace('the King', c === 'US' ? 'President Washington' : brit ? 'the King' : 'the head of state')
      : y < 1980 ? 'Your first day at school: a satchel, a name tag, and milk at break time.'
      : 'Your first day at school: a new lunchbox, a new teacher, a new peg with your name on it.', '🏫', 'info');
  }
  // The left hand.
  if (age === 6 && y < 1965 && rng.chance(0.1) && once(state, 'lefty')) {
    ctx.log('You\'re left-handed, and the teacher won\'t have it: your left hand is tied behind your back until you write with your right.', '✍️', 'warn');
    ctx.stat('happiness', -3);
  }
  // School milk.
  if (c === 'GB' && y >= 1946 && y < 1971 && age === 5 && once(state, 'milk')) ctx.log('A third of a pint of milk every morning at break, free from the government: warm in summer, frozen in winter.', '🥛', 'info');
  if (c === 'GB' && y === 1971 && age >= 7 && age <= 11 && once(state, 'snatcher')) ctx.log('No more free milk for over-sevens: the Education Secretary, Margaret Thatcher, is "the milk snatcher" in the playground.', '🥛', 'info');
  // Evacuation, September 1939.
  if (c === 'GB' && y === 1939 && age >= 5 && age <= 14 && state.people?.wealth !== 'upper' && rng.chance(0.6) && once(state, 'evac')) {
    ctx.log('With a label on your coat and a gas mask in a cardboard box, you were evacuated with your school to the country: a strange family, a strange school.', '🏷️', 'warn');
    ctx.stat('happiness', -5);
    ctx.stat('stress', 6);
  }
  // Duck and cover.
  if (c === 'US' && y >= 1951 && y <= 1963 && once(state, 'duck')) ctx.log('A siren in the corridor: the drill. Under your desk, hands over your neck, while the teacher watches the windows.', '☢️', 'info');
  // Segregated schools in the South.
  if (c === 'US' && SOUTH.includes(region?.state) && skinToneOf(state) >= 4 && y < 1970 && once(state, 'jimcrow')) {
    ctx.log(y < 1954 ? 'Your school is the "colored" school: hand-me-down books from the white school, with their names still inside.' : 'The Supreme Court ruled segregated schools unlawful in 1954, but yours is still the Black school: the county is in no hurry.', '📚', 'warn');
  }
  if (c === 'US' && y >= 1971 && y <= 1980 && age >= 8 && rng.chance(0.15) && once(state, 'busing')) ctx.log('The court-ordered busing has reached your district: an hour each way across town to a new school, and the protests at the gate.', '🚌', 'info');
  // The red scarf.
  if (BLOC.includes(c) && y >= 1922 && y < 1991 && age === 9 && once(state, 'pioneer')) {
    ctx.log(c === 'CN' ? 'You were given the red scarf of the Young Pioneers: "always prepared" for the cause of communism.' : 'You were sworn in as a Young Pioneer: the red scarf, the salute, and "Be prepared!", "Always prepared!"', '🧣', 'info');
  }
  // The cane, the strap, the paddle.
  if (caneHere(state) && age >= 7 && age <= 15 && rng.chance(0.08 + Math.max(0, 50 - state.stats.smarts) / 400)) {
    ctx.log(`You got ${IMPLEMENT[c] ?? 'the cane'} for ${rng.pick(['talking in class', 'being late', 'cheek', 'a fight in the yard', 'blots in your copybook', 'something you didn\'t do'])}. ${rng.pick(['It stung for a day.', 'You didn\'t cry in front of them.', 'Your father gave you the same again at home.'])}`, '🪵', 'warn');
    ctx.stat('happiness', -2);
  }
  // School days elsewhere.
  if (['RU', 'UA', 'BY'].includes(c) && y >= 1935 && y < 1991 && age === 7 && once(state, 'sept1')) ctx.log('The first of September: your first day of school, in a brown uniform and white apron, carrying a bunch of gladioli for the teacher.', '💐', 'info');
  if (c === 'JP' && y >= 1947 && age >= 7 && age <= 12 && once(state, 'souji')) ctx.log('After lunch, which you served to your classmates in white caps, the whole class cleans the school: desks pushed back, floors wiped by hand.', '🧹', 'info');
  if (['IN', 'PK', 'BD', 'LK'].includes(c) && y >= 1900 && age >= 6 && age <= 12 && once(state, 'assembly')) ctx.log('Morning assembly in the yard: the prayer, the pledge, and the headmaster\'s announcements in the sun.', '🙏', 'info');
  if (['BR', 'MX', 'AR', 'CO', 'PE'].includes(c) && y >= 1950 && y < 2010 && age >= 7 && age <= 13 && once(state, 'turno')) ctx.log('The school runs in shifts: you go in the afternoon, after the morning children leave, and the building is never quiet.', '🏫', 'info');
  // Japan's exam hell.
  if (c === 'JP' && y >= 1960 && y < PRESENT && age === 17 && once(state, 'juku')) {
    ctx.log('Juku every evening after school, cramming until midnight: "four hours\' sleep, pass; five hours, fail", they say.', '📝', 'info');
    ctx.stat('stress', 8);
    ctx.stat('smarts', 2);
  }
  // The leaving exams.
  const exam = leavingExam(state);
  const academic = state.schooling?.track !== 'general';
  // (Sat in the final school year: school here ends at 18, and the year it ends you've already left.)
  const examAge = c === 'GB' || ['IN', 'PK', 'BD', 'NG', 'GH', 'SL', 'GM'].includes(c) ? 16 : c === 'IE' ? 15 : 17;
  if (exam && age === examAge && (academic || c === 'US' || c === 'GB' && y >= 1965) && once(state, 'exam')) {
    const score = state.stats.smarts + rng.int(-15, 15);
    const pass = score >= 50;
    (state.schoolDays.exams ??= []).push({ name: exam, year: y, pass });
    ctx.log(pass ? `You sat ${exam} and passed${score >= 80 ? ', with distinction' : ''}.` : `You sat ${exam}. The results came in the post: not enough.`, pass ? '🎓' : '📉', pass ? 'good' : 'bad');
    ctx.stat('happiness', pass ? 3 : -4);
  }
}

export const SchoolDaysModule = {
  id: 'schoolDays',
  order: 9.1,
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.era || yearNow(state) >= PRESENT || state.character.age > 19) return;
    schoolYear(ctx, sideRng(state));
  },
};
