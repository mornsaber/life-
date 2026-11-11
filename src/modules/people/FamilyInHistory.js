/**
 * Your family in history: the people around you live through their times too.
 *
 *   Called up      in the total wars (the Napoleonic Wars, the American Civil War, the two world
 *                  wars, Korea, Vietnam, Spain's civil war) conscription takes the men of the
 *                  family between 18 and 41; RelativeService.js carries them to the front.
 *   Swept away     a hyperinflation wipes out your relatives' savings; a revolution confiscates
 *                  the family's property and sends some of them to the camps; Partition sends
 *                  them across a new border.
 *   Emigrants      in the great emigrations (Ireland after the Famine, Italy, Scandinavia, Germany,
 *                  Poland, Britain to the Dominions, the Windrush, the Gastarbeiter), brothers,
 *                  sisters and grown children sail away to live abroad.
 *   Memories       your grandparents tell you about what they lived through: the Famine, the
 *                  Blitz, Partition, the day the Wall went up.
 *
 * state.familyHist = { seed, events: [{ year, text, icon }], kinds: { [cc]: regimeKind }, hyper, partition, told: [ages], waves: { [id]: year } }
 * Its own random stream: the rest of the year rolls as it always did.
 */
import { Random } from '../../core/Random.js';
import { yearNow, PRESENT } from '../world/Eras.js';
import { warIn } from '../world/War.js';
import { regimeOf } from '../world/Regimes.js';
import { hyperHere } from '../economy/MoneyOfTheDay.js';
import { COUNTRIES } from '../world/Countries.js';
import { TRADITIONS } from '../community/Religions.js';
import { living, ageOf } from './People.js';
import { personDies } from './PeopleEngine.js';
import { enlist } from './RelativeService.js';

const cc = (state) => state.character?.countryId ?? 'US';
const historic = (state) => Boolean(state?.era) && yearNow(state) < PRESENT;
const FAMILY = ['child', 'sibling', 'spouse', 'partner', 'fiance'];
const KIN = ['mother', 'father', 'sibling', 'child', 'spouse', 'grandmother', 'grandfather', 'aunt', 'uncle', 'cousin'];
const nameOf = (c) => COUNTRIES[c]?.name ?? c;

/** Wars that took a generation of men. */
const TOTAL_WARS = { ww1: [18, 41], ww2: [18, 45], usCivilWar: [18, 40], napoleonicWars: [18, 40], spanishCivilWar: [18, 40], koreanWar: [18, 40], vietnamWar: [18, 35], francoPrussianWar: [20, 32] };

/** The great emigrations: [id, from, [years], destinations, yearly chance per young adult, a line]. */
const WAVES = [
  ['irishFamine', ['IE'], [1845, 1914], ['US', 'US', 'US', 'GB', 'CA', 'AU'], 0.06, 'like half the parish'],
  ['italian', ['IT'], [1880, 1915], ['US', 'US', 'AR', 'AR', 'BR'], 0.04, 'on a ship from Naples'],
  ['german', ['DE'], [1845, 1893], ['US', 'US', 'US', 'BR'], 0.03, 'from Bremen'],
  ['scandinavian', ['SE', 'NO', 'DK', 'FI'], [1865, 1914], ['US'], 0.035, 'to the farms of Minnesota'],
  ['polish', ['PL'], [1880, 1914], ['US', 'US', 'DE'], 0.035, 'to the mills and the mines'],
  ['jewish', ['RU', 'UA', 'BY', 'LT', 'PL'], [1881, 1914], ['US', 'US', 'GB', 'AR'], 0.02, 'fleeing the pogroms'],
  ['british', ['GB'], [1850, 1914], ['US', 'CA', 'AU', 'NZ', 'ZA'], 0.015, 'to start again'],
  ['tenPound', ['GB'], [1947, 1972], ['AU', 'AU', 'NZ', 'CA'], 0.015, 'on an assisted passage'],
  ['windrush', ['JM', 'TT', 'BB', 'GY'], [1948, 1971], ['GB'], 0.04, 'answering the call for workers'],
  ['southAsia', ['IN', 'PK', 'BD'], [1955, 1980], ['GB', 'GB', 'CA'], 0.01, 'to the mills and the hospitals'],
  ['gastarbeiter', ['TR', 'GR', 'YU', 'RS', 'IT'], [1961, 1973], ['DE', 'DE', 'NL', 'BE'], 0.03, 'as a guest worker'],
  ['portuguese', ['PT'], [1958, 1975], ['FR', 'FR', 'BR', 'CA'], 0.03, 'over the Pyrenees'],
  ['bracero', ['MX'], [1942, 1964], ['US'], 0.03, 'as a bracero in the fields'],
  ['chinese', ['CN'], [1849, 1882], ['US', 'AU', 'CA'], 0.01, 'to the gold fields'],
  ['filipino', ['PH'], [1970, 2010], ['US', 'US', 'SA', 'AE', 'GB'], 0.03, 'as a nurse abroad'],
  ['eastEU', ['PL', 'LT', 'LV', 'RO', 'BG'], [2004, 2016], ['GB', 'DE', 'IE'], 0.03, 'once the borders opened'],
];

/** What grandparents remembered: [year, countries (null: everyone), the memory]. */
const MEMORIES = [
  [1798, ['IE'], 'the rising of 1798, and the redcoats burning the thatch'],
  [1812, ['RU'], 'Napoleon\'s army in Moscow, and the city burning'],
  [1815, ['GB', 'FR', 'BE', 'NL', 'DE'], 'Waterloo, and the men who came home from it'],
  [1816, null, 'the year without a summer, when the crops failed everywhere'],
  [1832, ['GB'], 'the fight for the Reform Act'],
  [1847, ['IE'], 'the Great Famine: the blight, the soup kitchens and the coffin ships'],
  [1848, ['DE', 'FR', 'AT', 'HU', 'IT', 'CZ'], 'the revolutions of 1848, and the barricades in the streets'],
  [1851, ['GB'], 'the Great Exhibition at the Crystal Palace'],
  [1861, ['RU'], 'the day the serfs were freed'],
  [1861, ['IT'], 'Garibaldi and the making of Italy'],
  [1863, ['US'], 'the Civil War, and the brothers who never came back from it'],
  [1868, ['JP'], 'the Meiji Restoration, when the samurai lost their swords'],
  [1870, ['FR'], 'the siege of Paris, when they ate the animals from the zoo'],
  [1871, ['DE'], 'the founding of the Reich in the Hall of Mirrors'],
  [1901, ['GB', 'AU', 'NZ', 'CA', 'IE', 'IN'], 'the old Queen\'s funeral'],
  [1906, ['US'], 'the San Francisco earthquake'],
  [1912, null, 'the sinking of the Titanic'],
  [1916, ['GB', 'FR', 'DE', 'AT', 'IT', 'RU', 'CA', 'AU', 'NZ', 'BE', 'TR', 'IN', 'IE', 'US', 'RS', 'HU'], 'the Great War: the telegrams, and the boys who never came home'],
  [1916, ['IE'], 'the Easter Rising'],
  [1917, ['RU', 'UA', 'BY'], 'the Revolution, and the civil war after it'],
  [1918, null, 'the Spanish flu, which took whole families in a week'],
  [1923, ['DE'], 'the inflation, when a wheelbarrow of notes wouldn\'t buy bread'],
  [1932, null, 'the Depression: soup lines, and men selling apples on street corners'],
  [1933, ['UA'], 'the Holodomor, the famine nobody was allowed to name'],
  [1937, ['ES'], 'the Civil War'],
  [1940, ['GB'], 'the Blitz, and nights in the Underground'],
  [1942, ['PL', 'FR', 'NL', 'BE', 'NO', 'DK', 'GR', 'RS', 'CZ', 'RU', 'UA', 'BY', 'LT', 'LV', 'EE'], 'the war and the occupation'],
  [1942, ['US', 'CA', 'AU', 'NZ'], 'the war: rationing, and the boys overseas'],
  [1945, ['JP'], 'the bombing, and the Emperor\'s voice on the radio'],
  [1945, ['DE', 'AT'], 'the end of the war, the bombed cities and the long walk west'],
  [1947, ['IN', 'PK', 'BD'], 'Partition: the burning trains, the walking, the friends left behind'],
  [1951, ['KR'], 'the war, and fleeing south with nothing'],
  [1960, ['CN'], 'the famine after the Great Leap Forward'],
  [1961, ['DE'], 'the night the Wall went up'],
  [1967, ['CN'], 'the Cultural Revolution'],
  [1969, null, 'watching men walk on the Moon'],
  [1976, ['KH'], 'the Khmer Rouge years'],
  [1975, ['VN'], 'the end of the war'],
  [1989, ['DE', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG'], 'the autumn of 1989, when the Wall came down'],
  [1991, ['RU', 'UA', 'BY', 'KZ', 'GE', 'AM', 'AZ', 'LT', 'LV', 'EE', 'MD', 'UZ'], 'the end of the Soviet Union'],
];

const frng = (state) => {
  state.familyHist ??= {};
  state.familyHist.seed = ((state.familyHist.seed ?? (((state.world?.seed ?? 11) * 1103515245) >>> 0)) * 1664525 + 1013904223) >>> 0;
  return new Random(state.familyHist.seed);
};
const remember = (state, text, icon) => { const fh = state.familyHist; fh.events.push({ year: yearNow(state), text, icon }); if (fh.events.length > 30) fh.events.shift(); };
const atHome = (state, p) => !p.livesIn || p.livesIn === cc(state);

export const familyHistory = (state) => state.familyHist?.events ?? [];

function callUp(ctx, rng) {
  const { state } = ctx;
  const war = warIn(state, cc(state));
  if (!war || war.phase === 'ceasefire' || !TOTAL_WARS[war.id]) return;
  const [lo, hi] = TOTAL_WARS[war.id];
  for (const p of living(state)) {
    if (!FAMILY.includes(p.relation) || p.gender !== 'male' || p.service || p.veteran || !atHome(state, p)) continue;
    const age = ageOf(state, p);
    if (age < lo || age > hi || !rng.chance(0.4)) continue;
    if (!enlist(state, p, rng)) continue;
    const line = `${p.firstName} was called up for ${war.name ?? 'the war'}.`;
    ctx.log(line, '📨', 'warn');
    remember(state, line, '📨');
    ctx.stat('stress', 4);
  }
}

function hyperinflation(ctx) {
  const { state } = ctx;
  const h = hyperHere(state);
  const fh = state.familyHist;
  if (!h || fh.hyper === h.id) return;
  fh.hyper = h.id;
  const hit = living(state).filter((p) => KIN.includes(p.relation) && atHome(state, p) && (p.life?.netWorth ?? 0) > 0);
  for (const p of hit) p.life.netWorth = Math.round(p.life.netWorth * 0.05);
  const parents = hit.filter((p) => ['mother', 'father'].includes(p.relation));
  if (!hit.length) return;
  const line = parents.length ? `Your parents' life savings were wiped out by the inflation. ${parents[0].firstName} still keeps the worthless bank book.` : `The inflation wiped out what your family had saved: ${hit.map((p) => p.firstName).slice(0, 3).join(', ')}.`;
  ctx.log(line, '💸', 'bad');
  remember(state, line, '💸');
}

function revolution(ctx, rng) {
  const { state } = ctx;
  const fh = state.familyHist;
  const countries = [...new Set([cc(state), ...living(state).filter((p) => p.livesIn).map((p) => p.livesIn)])];
  for (const c of countries) {
    const kind = regimeOf(c)?.kind;
    const before = fh.kinds[c];
    fh.kinds[c] = kind;
    if (!before || before === kind || !['totalitarian', 'oneParty'].includes(kind) || ['totalitarian', 'oneParty'].includes(before)) continue;
    const kin = living(state).filter((p) => KIN.includes(p.relation) && (c === cc(state) ? atHome(state, p) : p.livesIn === c) && ageOf(state, p) >= 18);
    if (!kin.length) continue;
    const wealthy = state.people?.wealth === 'upper';
    for (const p of kin) {
      if (wealthy && p.life) { p.life.netWorth = Math.round((p.life.netWorth ?? 0) * 0.15); if (p.life.home?.kind === 'own') p.life.home = { kind: 'rent' }; }
      if (kind === 'totalitarian' && rng.chance(wealthy ? 0.2 : 0.06)) {
        const line = `${p.firstName} was arrested by the new regime's police${c !== cc(state) ? ` in ${nameOf(c)}` : ''}.`;
        ctx.log(line, '⛓️', 'bad');
        remember(state, line, '⛓️');
        ctx.stat('stress', 8);
        if (rng.chance(0.35)) personDies(ctx, p, 'died in a labour camp');
      }
    }
    if (wealthy) {
      const line = `The new regime${c !== cc(state) ? ` in ${nameOf(c)}` : ''} confiscated the family's land and houses. Your relatives are "former people" now.`;
      ctx.log(line, '🏚️', 'bad');
      remember(state, line, '🏚️');
    }
  }
}

function partition(ctx, rng) {
  const { state } = ctx;
  const fh = state.familyHist;
  const here = cc(state);
  if (fh.partition || yearNow(state) !== 1947 || !['IN', 'PK'].includes(here)) return;
  fh.partition = true;
  const group = TRADITIONS[state.community?.faith?.traditionId ?? state.community?.upbringing]?.group;
  const minority = (here === 'IN' && group === 'Muslim') || (here === 'PK' && ['Hindu', 'Sikh'].includes(group));
  const other = here === 'IN' ? 'PK' : 'IN';
  for (const p of living(state).filter((x) => KIN.includes(x.relation) && atHome(state, x) && x.relation !== 'spouse')) {
    if (!rng.chance(minority ? 0.5 : 0.08)) continue;
    p.livesIn = other;
    const line = `${p.firstName} fled across the new border to ${nameOf(other)} in the Partition.`;
    ctx.log(line, '🚂', 'bad');
    remember(state, line, '🚂');
  }
}

function emigrations(ctx, rng) {
  const { state } = ctx;
  const y = yearNow(state);
  const fh = state.familyHist;
  for (const [id, from, [a, b], to, rate, how] of WAVES) {
    if (!from.includes(cc(state)) || y < a || y >= b) continue;
    for (const p of living(state)) {
      if (!['sibling', 'child'].includes(p.relation) || !atHome(state, p) || p.service || p.custody === 'you') continue;
      const age = ageOf(state, p);
      if (age < 17 || age > 35 || !rng.chance(rate)) continue;
      const dest = rng.pick(to);
      p.livesIn = dest;
      const line = `${p.firstName} emigrated to ${nameOf(dest)}, ${how}.`;
      ctx.log(line, '🚢', 'info');
      remember(state, line, '🚢');
      ctx.stat('happiness', -3);
    }
    // The cousins and neighbours who went (no one you'll see again).
    if (!fh.waves[id] && state.character.age >= 8 && rng.chance(0.25)) {
      fh.waves[id] = y;
      ctx.log(`Your cousin left for ${nameOf(rng.pick(to))}, ${how}. The whole street came out to see them off.`, '👋', 'info');
    }
  }
}

function memories(ctx, rng) {
  const { state } = ctx;
  const age = state.character.age;
  const fh = state.familyHist;
  if (![9, 15].includes(age) || fh.told.includes(age)) return;
  const y = yearNow(state);
  const fit = MEMORIES.filter(([year, where]) => year >= y - 75 && year <= y - 35 && (!where || where.includes(cc(state))));
  if (!fit.length) return;
  fh.told.push(age);
  const [, , text] = rng.pick(fit);
  const line = `Your ${rng.pick(['grandmother', 'grandfather'])} told you about ${text}.`;
  ctx.log(line, '👵', 'info');
  remember(state, line, '👵');
}

export const FamilyInHistoryModule = {
  id: 'familyHist',
  order: 13.3,
  init(state) {
    state.familyHist ??= {};
    const fh = state.familyHist;
    fh.events ??= [];
    fh.kinds ??= {};
    fh.told ??= [];
    fh.waves ??= {};
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!historic(state) || !state.people) return;
    const rng = frng(state);
    callUp(ctx, rng);
    hyperinflation(ctx);
    revolution(ctx, rng);
    partition(ctx, rng);
    emigrations(ctx, rng);
    memories(ctx, rng);
  },
};
