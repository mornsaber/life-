/**
 * Work as it was lived, by era (pay and bars: EraPay.js; hours and unions elsewhere). Small moments,
 * each once a life, while you hold a job:
 *
 *   The works   the hooter at half past seven, clocking on, a quarter-hour docked for being a minute
 *               late; piece work; the Saturday morning shift; the works outing to the seaside; the
 *               first paid holiday (Britain's Holidays with Pay Act, 1938; France's congés payés,
 *               1936); the three-day week (Britain, 1974); the closures of the 1980s.
 *   The office  the typing pool; the bowler hat and the 8.12; luncheon vouchers; smoking at your desk;
 *               the first computer terminal; the fax machine.
 *   Everyone    the pay packet in a brown envelope on a Friday, counted at the kitchen table.
 *
 * state.workDay = { seen: {...} }
 */
import { Random } from '../../core/Random.js';
import { yearNow, PRESENT } from '../world/Eras.js';
import { getProfession } from './JobTrees.js';

const cc = (state) => state.character.countryId ?? 'US';
const sideRng = (state) => new Random((((state.world?.seed ?? 1) * 7121) ^ (state.character.age * 311 + 0x2e9)) >>> 0);
const WORKS = /factory|machin|mill|mine|miner|weld|assembl|labou?r|construct|dock|warehouse|plant|steel|textile|operat|mechanic|electric|plumb|carpent|foundry|shipyard|railway|trades|manufactur|workforce/i;
const OFFICE = /clerk|account|bank|insur|admin|office|secretar|civil|analyst|typist|teller|actuar|bookkeep|government|finance/i;

/** 'works', 'office' or null for the job you hold. */
export function workKind(state) {
  const job = state.career?.job;
  if (!job) return null;
  const p = getProfession(job.professionId);
  const key = `${p?.id ?? ''} ${p?.name ?? ''} ${job.title ?? ''}`;
  return WORKS.test(key) ? 'works' : OFFICE.test(key) ? 'office' : null;
}

/** [id, kind ('works' | 'office' | null for any), when(state, y, c), text, icon, stats] */
export const MOMENTS = [
  ['hooter', 'works', (s, y) => y < 1980, 'The works hooter goes at half past seven. You clock on with your card; a minute late and they dock you a quarter of an hour.', '⏱️', {}],
  ['piecework', 'works', (s, y) => y < 1975, 'You\'re on piece work: paid by the hundred, so you learn every short cut, and the rate-fixer with his stopwatch watches you do it.', '🔩', { stress: 2 }],
  ['saturday', 'works', (s, y) => y < 1960, 'Saturday is a half-day: the works shuts at noon, and the whole town goes to the match.', '⚽', { happiness: 1 }],
  ['outing', 'works', (s, y, c) => y >= 1890 && y < 1970 && ['GB', 'IE', 'US', 'AU', 'NZ', 'CA', 'DE', 'NL', 'BE'].includes(c), 'The works outing: three charabancs to the seaside, a crate of beer, and the foreman singing on the way home.', '🚌', { happiness: 3 }],
  ['paidHoliday', null, (s, y, c) => (c === 'GB' && y >= 1938 && y <= 1940) || (c === 'FR' && y >= 1936 && y <= 1938), 'For the first time in your life you have a holiday with pay: a whole week, and you\'re still paid for it.', '🏖️', { happiness: 4 }],
  ['threeDay', null, (s, y, c) => c === 'GB' && y === 1974, 'The three-day week: power for industry three days out of five, offices by candlelight, and your pay cut to match.', '🕯️', { happiness: -2, stress: 3 }],
  ['closure', 'works', (s, y, c) => y >= 1979 && y <= 1990 && ['GB', 'US', 'BE', 'FR', 'DE'].includes(c), 'Rumours all year, then the notice on the gate: the works is closing. Men who\'ve been there forty years stand around in the yard.', '🏭', { stress: 5, happiness: -3 }],
  ['typingPool', 'office', (s, y) => y >= 1915 && y < 1980 && s.character.gender === 'female', 'You work in the typing pool: forty women and forty typewriters, and a supervisor at the front who can tell from the sound when someone stops.', '⌨️', {}],
  ['bowler', 'office', (s, y, c) => c === 'GB' && y < 1965 && s.character.gender === 'male', 'Bowler hat, rolled umbrella and the 8.12 to town: in your office, a man without a hat is not quite a man.', '🎩', {}],
  ['luncheon', 'office', (s, y, c) => c === 'GB' && y >= 1955 && y < 1990, 'Your firm gives luncheon vouchers: a paper voucher a day toward a pie and a cup of tea.', '🎫', {}],
  ['smoking', 'office', (s, y) => y >= 1920 && y < 1990, 'Everyone smokes at their desk; the ashtray is emptied twice a day and the ceiling is yellow.', '🚬', { health: -1 }],
  ['terminal', 'office', (s, y) => y >= 1975 && y < 1992, 'A computer terminal arrived on your desk: green letters on a black screen, and a thick manual nobody reads.', '🖥️', { smarts: 1 }],
  ['fax', 'office', (s, y) => y >= 1983 && y < 1995, 'The office has a fax machine. People gather round to watch the first page come out, warm and curling.', '📠', {}],
  ['payPacket', null, (s, y) => y < 1975, 'Friday is pay day: a brown envelope with your name on it, counted out on the kitchen table, so much for the rent and so much for the week.', '✉️', { happiness: 1 }],
];

export const WorkOfTheDayModule = {
  id: 'workDay',
  order: 22.7,
  onAgeUp(ctx) {
    const { state } = ctx;
    const y = yearNow(state);
    if (!state.era || y >= PRESENT || !state.career?.job || state.character.age < 14) return;
    const rng = sideRng(state);
    const c = cc(state);
    const kind = workKind(state);
    const seen = ((state.workDay ??= { seen: {} }).seen);
    const fits = MOMENTS.filter(([id, k, when]) => !seen[id] && (k === null || k === kind) && when(state, y, c));
    const dated = fits.filter(([id]) => ['paidHoliday', 'threeDay'].includes(id));
    const pick = dated[0] ?? (fits.length && rng.chance(0.3) ? rng.pick(fits) : null);
    if (!pick) return;
    const [id, , , text, icon, stats] = pick;
    seen[id] = y;
    ctx.log(text, icon, 'info');
    for (const [k, v] of Object.entries(stats)) ctx.stat(k, v);
  },
};
