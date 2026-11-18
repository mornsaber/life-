/**
 * Old age as it was lived, by era and country (pensions and money: retirement/; late-life family:
 * people/LateLife.js). Moments, each once a life:
 *
 *   The workhouse   before pensions, a poor old person with no family to take them in went to the
 *                   workhouse (Britain to 1930), the poorhouse (America), the parish.
 *   Almshouses      a charity's cottage for the deserving old poor.
 *   First pensions  Germany 1891 (at 70), Britain 1909 ("God bless Lloyd George", five shillings a
 *                   week at 70), America's first Social Security cheque in 1940.
 *   With the family most widowed old people lived with a married child, usually a daughter.
 *   Customs         Japan's kanreki at 60 (the red waistcoat: your life begins again); the
 *                   sovereign's telegram at 100 in Britain (from 1917).
 *   The home        the old people's home from the 1950s, the care home from the 1980s.
 */
import { Random } from '../../core/Random.js';
import { yearNow, PRESENT } from '../world/Eras.js';

const cc = (state) => state.character.countryId ?? 'US';
const sideRng = (state) => new Random((((state.world?.seed ?? 1) * 6907) ^ (state.character.age * 433 + 0x4b1)) >>> 0);
const once = (state, id) => { const o = (state.oldAge ??= { seen: {} }); if (o.seen[id]) return false; o.seen[id] = true; return true; };
const poor = (state) => (state.finances?.cash ?? 0) < 2000 && state.people?.wealth !== 'upper';
const widowed = (state) => !(state.people?.list ?? []).some((p) => p.alive && p.relation === 'spouse');
const childNear = (state) => (state.people?.list ?? []).some((p) => p.alive && p.relation === 'child');
const BRIT = ['GB', 'IE', 'AU', 'NZ', 'CA'];

function oldAgeYear(ctx, rng) {
  const { state } = ctx;
  const age = state.character.age;
  const y = yearNow(state);
  const c = cc(state);
  const crowned = ['GB', 'AU', 'NZ', 'CA'].includes(c);

  // Customs.
  if (c === 'JP' && age === 60 && once(state, 'kanreki')) ctx.log('Kanreki, your sixtieth: the family dressed you in a red waistcoat and hat. The zodiac has come round again, and your life begins anew.', '🧧', 'milestone');
  if (['CN', 'TW', 'KR'].includes(c) && age === 60 && once(state, 'sixty')) ctx.log('Your sixtieth birthday: longevity noodles, the whole family bowing, and a banquet your children could barely afford.', '🍜', 'milestone');
  if (crowned && age === 100 && y >= 1917 && once(state, 'telegram')) ctx.log(y >= 1999 ? 'On your hundredth birthday a card came from the Palace, with the monarch\'s portrait and good wishes.' : 'On your hundredth birthday a telegram came from the Palace: the monarch\'s congratulations. The mayor called, and the local paper.', '💌', 'honor');

  // The first state pensions.
  if (c === 'DE' && y === 1891 && age >= 70 && once(state, 'pension')) ctx.log('Bismarck\'s old-age pension has begun: a few marks a month for workers who reach seventy. Few of your friends lived to see it.', '🏛️', 'milestone');
  if (c === 'GB' && y === 1909 && age >= 70 && once(state, 'pension')) ctx.log('The first old-age pension: five shillings a week at the post office, at seventy. Old women wept at the counter. "God bless Lloyd George."', '📮', 'milestone');
  if (c === 'US' && y === 1940 && age >= 65 && once(state, 'pension')) ctx.log('Your first Social Security check came this year: the government will send one every month for the rest of your life.', '✉️', 'milestone');

  if (age < 65) return;
  // Before pensions, the poor old without family went to the workhouse or the poorhouse.
  if (poor(state) && !childNear(state) && y < (BRIT.includes(c) ? 1930 : c === 'US' ? 1935 : 1920) && rng.chance(0.12) && once(state, 'workhouse')) {
    ctx.log(BRIT.includes(c) ? 'With no work, no savings and no family to take you in, the Guardians sent you to the workhouse: the uniform, the separate wards for men and women, the oakum to pick.' : 'With nothing left and no one to take you in, you went to the poorhouse at the edge of town.', '🏚️', 'bad');
    ctx.stat('happiness', -12);
    ctx.stat('health', -4);
    return;
  }
  if (poor(state) && y < 1960 && ['GB', 'NL', 'BE', 'DE', 'DK'].includes(c) && rng.chance(0.08) && once(state, 'almshouse')) {
    ctx.log('The trustees gave you a place in the almshouses: two rooms round a little courtyard, coal in winter, and chapel on Sundays.', '🏡', 'good');
    ctx.stat('happiness', 4);
    return;
  }
  // With the family.
  if (widowed(state) && childNear(state) && y < 1970 && rng.chance(0.18) && once(state, 'withFamily')) {
    ctx.log('You moved in with your daughter\'s family: the back bedroom, the grandchildren underfoot, and your chair by the fire.', '👵', 'info');
    ctx.stat('happiness', 3);
    return;
  }
  // The old people's home, then the care home.
  if (age >= 80 && y >= 1950 && widowed(state) && rng.chance(0.1) && once(state, 'home')) {
    ctx.log(y < 1980 ? 'You went into an old people\'s home: a room with a view of the garden, tea at four, and bingo on Thursdays.' : 'You moved into a care home: a nurse at night, a room of your own, and visitors on Sundays.', '🛏️', 'info');
  }
}

export const OldAgeOfTheDayModule = {
  id: 'oldAge',
  order: 9.6,
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.era || yearNow(state) >= PRESENT || state.character.age < 60) return;
    oldAgeYear(ctx, sideRng(state));
  },
};
