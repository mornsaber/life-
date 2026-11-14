/**
 * Law and crime of their day: what the law did to you, by country and year.
 *
 *   The gallows   hanging for murder in Britain until 1965 (and most condemned men hanged within
 *                 weeks before 1900); the guillotine in France until 1981; the electric chair in
 *                 America from 1890, and no executions at all from 1972 to 1976.
 *   Transportation  before 1857 a British felon could be sent to New South Wales or Van Diemen's
 *                 Land; when the sentence ended, you could stay or find your own passage home.
 *   Debtors' prison  unpaid debts put you in the Marshalsea or the Fleet until 1869 (America's
 *                 federal debtors' prisons until 1833, France's until 1867).
 *   Prohibition   America 1920–33, Finland 1919–32, Norway 1916–27, Iceland 1915–35, Russia
 *                 1914–25: the bars shut and bootleggers made fortunes.
 *   The law of your private life  sex between men was a crime until its date (Britain 1967,
 *                 Canada 1969, West Germany 1969, Ireland 1993); marriage between two men or two
 *                 women from its date (the Netherlands 2001 … Britain 2014, America 2015);
 *                 divorce barred until its date (Italy 1970, Spain 1981, Ireland 1996; in Britain
 *                 before 1857 only by private Act of Parliament).
 *   Police        before the first modern forces (London's Metropolitan Police 1829, New York
 *                 1845), crime was a matter for watchmen and thief-takers.
 *   Prisons       Newgate and the treadmill, Sing Sing, Alcatraz, Devil's Island, the Gulag.
 *   Trials        the famous trials of the day reach your newspaper.
 *
 * state.lawDay = { seed, transported, debtors, bootlegged, trials: [id] }
 * Its own random stream: the rest of the year rolls as it always did.
 */
import { Random } from '../../core/Random.js';
import { yearNow, PRESENT } from '../world/Eras.js';
import { setJusticeHooks } from './JusticeSystem.js';
import { OFFENSES } from './Offenses.js';
import { DIVORCE_BAR } from '../people/PeopleEngine.js';
import { partnerOf } from '../people/People.js';
import { arrive } from '../world/Migration.js';
import { COUNTRIES } from '../world/Countries.js';
import { stateOf } from '../life/Regions.js';
import { statuteIn, statuteOverride, ABOLISHED, SUSPENDED, DECRIMINALIZED, SAME_SEX_MARRIAGE, DIVORCE_FROM, DEBTORS_UNTIL, PROHIBITION } from '../politics/StatuteBook.js';

const cc = (state) => state.character?.countryId ?? 'US';
const historic = (state) => Boolean(state?.era) && yearNow(state) < PRESENT;

/* ------------------------------------------------------------------ */
/* The death penalty by year                                           */
/* ------------------------------------------------------------------ */
/** The year capital punishment for murder ended, and the gaps when it was suspended. */
/** When most of the condemned were executed rather than reprieved. */
const ROUTINE_UNTIL = { GB: 1900, IE: 1900, FR: 1900, US: 1900, AU: 1900, CA: 1900, NZ: 1900, DE: 1900, RU: 1960, CN: 2026, JP: 1900, IN: 1950 };
function methodOf(c, y) {
  if (c === 'FR' || (c === 'DE' && y < 1949) || (c === 'BE' && y < 1900)) return 'the guillotine';
  if (c === 'ES' || c === 'PT') return 'the garrotte';
  if (['RU', 'CN', 'IT', 'MX', 'VN', 'KP', 'CU'].includes(c)) return 'firing squad';
  if (c === 'US') return y < 1890 ? 'hanging' : y < 1982 ? 'the electric chair' : 'lethal injection';
  return 'hanging';
}
/** The death penalty in a historic year (undefined: today's law applies). */
export function deathPenaltyThen(state) {
  const y = yearNow(state);
  const c = cc(state);
  const where = c === 'US' ? stateOf(state)?.name ?? 'the state' : COUNTRIES[c]?.name ?? c;
  // A bill in this world abolished it, or brought it back (politics/StatuteBook.js).
  const o = c === 'US' ? undefined : statuteOverride(state, 'deathPenalty', c);
  if (o === false) return null;
  if (o === true) return { status: 'active', method: methodOf(c, y), where };
  if (!historic(state)) return undefined;
  if ((SUSPENDED[c] ?? []).some(([a, b]) => y >= a && y < b)) return null;
  if (ABOLISHED[c] && y >= ABOLISHED[c]) return undefined;
  if (c === 'US' && y >= 1976) return undefined;
  // Before abolition: the gallows (or its local equivalent), and in the early years, little mercy.
  const status = y < (ROUTINE_UNTIL[c] ?? 1900) ? 'routine' : 'active';
  return { status, method: methodOf(c, y), where };
}

/* ------------------------------------------------------------------ */
/* The law of your private life                                        */
/* ------------------------------------------------------------------ */
/** When sex between men stopped being a crime. Unlisted countries: never criminal by statute, or today's law. */
/** When two men or two women could marry. */
/** When divorce became lawful (before: none, or only by Act of Parliament). */

// These follow history's date unless a bill in this world changed the law (politics/StatuteBook.js).
export const sexBetweenMenCriminal = (state) => (statuteOverride(state, 'sodomyLaw') != null || historic(state)) && statuteIn(state, 'sodomyLaw');
export const sameSexMarriageLegal = (state) => (statuteOverride(state, 'sameSexMarriage') == null && !historic(state)) || statuteIn(state, 'sameSexMarriage');
export function divorceBarred(state) {
  const o = statuteOverride(state, 'divorce');
  if (o === true) return null;
  if (o === false) return 'Divorce has been abolished here by law';
  if (!historic(state)) return null;
  const from = DIVORCE_FROM[cc(state)];
  if (!from || yearNow(state) >= from) return null;
  return cc(state) === 'GB' ? 'Before 1857 a divorce took a private Act of Parliament' : `There is no divorce here until ${from}`;
}
DIVORCE_BAR.fn = divorceBarred;

const sameSex = (state, p) => p && p.gender === state.character.gender;

/* ------------------------------------------------------------------ */
/* Transportation, debtors' prisons, Prohibition, police, prisons      */
/* ------------------------------------------------------------------ */
export const transportationHere = (state) => ['GB', 'IE'].includes(cc(state)) && yearNow(state) < 1900 && (statuteOverride(state, 'transportation') != null || historic(state)) && statuteIn(state, 'transportation');
export const debtorsPrisonHere = (state) => (statuteOverride(state, 'debtorsPrison') != null || historic(state)) && statuteIn(state, 'debtorsPrison');
/** Whether sex between men was a crime in a country in a year (for records abroad). */
export const gayCrimeIn = (c, y) => DECRIMINALIZED[c] != null ? y < DECRIMINALIZED[c] : y < PRESENT;
/** Whether a country had Prohibition in a year. */
export const prohibitionIn = (c, y) => { const p = PROHIBITION[c]; return Boolean(p) && y >= p[0] && y < p[1]; };
export const prohibitionHere = (state) => (statuteOverride(state, 'prohibition') != null || historic(state)) && statuteIn(state, 'prohibition');
const POLICE_FROM = { GB: [1829, 'the Metropolitan Police'], IE: [1836, 'the Irish Constabulary'], US: [1845, 'the New York Police Department'], FR: [1800, 'the Prefecture of Police'], DE: [1848, 'the Berlin Schutzmannschaft'], AU: [1862, 'the New South Wales Police'], CA: [1873, 'the North-West Mounted Police'], NZ: [1886, 'the New Zealand Police Force'], JP: [1874, 'the Tokyo Metropolitan Police'], IN: [1861, 'the Indian police'], IT: [1814, 'the Carabinieri'], ES: [1844, 'the Guardia Civil'] };
export const policeHere = (state) => { const p = POLICE_FROM[cc(state)]; return p ? { from: p[0], name: p[1], yet: yearNow(state) >= p[0] } : null; };

/** A prison of its day for a sentence of `years`, or null for today's names. */
function periodPrison(state, years) {
  const y = yearNow(state);
  const c = cc(state);
  if (!historic(state) || y >= 1965) return null;
  if (c === 'GB') return y < 1868 ? (years <= 1 ? 'the county gaol' : 'Newgate Prison') : y < 1900 ? 'Pentonville Prison (the separate system)' : years <= 1 ? 'HM Prison Brixton' : 'HM Prison Wandsworth';
  if (c === 'US') return y >= 1934 && y < 1963 && years >= 10 ? 'Alcatraz' : y < 1930 ? (years <= 1 ? 'the county workhouse' : 'Sing Sing') : null;
  if (c === 'FR') return y < 1953 && years >= 8 ? 'the penal colony in French Guiana (Devil\'s Island)' : 'La Santé';
  if (['RU', 'UA', 'BY', 'KZ', 'GE', 'AM', 'AZ', 'UZ', 'KG', 'TJ', 'TM', 'MD', 'EE', 'LV', 'LT'].includes(c) && y >= 1930 && y < 1960) return years <= 1 ? 'a prison in the city' : 'a Gulag labour camp';
  if (c === 'AU' && y < 1900) return 'Port Arthur';
  return null;
}
const hardLabour = (state) => historic(state) && ['GB', 'IE', 'AU', 'IN', 'NZ'].includes(cc(state)) && yearNow(state) < 1948;

/* ------------------------------------------------------------------ */
/* Famous trials                                                       */
/* ------------------------------------------------------------------ */
/** [year, countries (null = the world's newspapers), text]. */
const TRIALS = [
  [1820, ['GB'], 'The House of Lords tried Queen Caroline for adultery; crowds took her side against the King.'],
  [1859, ['US'], 'John Brown was tried and hanged for the raid on Harpers Ferry.'],
  [1865, ['US'], 'The Lincoln conspirators were tried by a military commission; four were hanged.'],
  [1894, null, 'Captain Alfred Dreyfus was convicted of treason in Paris. The case would split France.'],
  [1895, ['GB', 'IE'], 'Oscar Wilde was sentenced to two years\' hard labour for gross indecency.'],
  [1898, ['FR'], 'Émile Zola published "J\'accuse…!" and was himself put on trial for it.'],
  [1910, ['GB'], 'Dr Crippen was caught by wireless telegraph aboard a liner and hanged for murder.'],
  [1925, ['US'], 'The Scopes "monkey trial" in Tennessee put the teaching of evolution in the dock.'],
  [1927, null, 'Sacco and Vanzetti were executed in Massachusetts after protests around the world.'],
  [1935, ['US'], 'Bruno Hauptmann was tried for the Lindbergh baby kidnapping.'],
  [1936, ['RU'], 'The first of the Moscow show trials: old Bolsheviks confessed to impossible crimes.'],
  [1946, null, 'The Nuremberg tribunal sentenced the leaders of Nazi Germany.'],
  [1951, ['US'], 'Julius and Ethel Rosenberg were sentenced to death for passing atomic secrets.'],
  [1952, ['GB'], 'Alan Turing was convicted of gross indecency and sentenced to chemical castration.'],
  [1960, ['GB'], 'A jury found Lady Chatterley\'s Lover not obscene; Penguin sold 3 million copies.'],
  [1961, null, 'Adolf Eichmann was tried in Jerusalem.'],
  [1964, null, 'Nelson Mandela was sentenced to life imprisonment at the Rivonia trial.'],
  [1969, ['US'], 'The Chicago Seven went on trial for the riots at the Democratic convention.'],
  [1971, ['US'], 'Charles Manson and his followers were sentenced to death (later commuted).'],
  [1989, ['GB'], 'The Guildford Four were freed after fifteen years for bombings they didn\'t commit.'],
  [1995, null, 'O. J. Simpson was acquitted of murder, live on television.'],
];

/* ------------------------------------------------------------------ */
/* The module                                                          */
/* ------------------------------------------------------------------ */
const lrng = (state) => {
  state.lawDay ??= {};
  state.lawDay.seed = ((state.lawDay.seed ?? (((state.world?.seed ?? 7) * 2654435761) >>> 0)) * 1664525 + 1013904223) >>> 0;
  return new Random(state.lawDay.seed);
};

OFFENSES.bootlegging ??= { name: 'Bootlegging (violating Prohibition)', icon: '🥃', severity: 'misdemeanor', fine: [500, 5000], prison: [0, 1], probation: 1 };
OFFENSES.grossIndecency ??= { name: 'Gross Indecency', icon: '⚖️', severity: 'felony', fine: [0, 500], prison: [0, 2], probation: 2 };

/** Where a sentence was served in an earlier year: { facility, kind } or null for today's prisons. */
function facilityThen(state, offense, years) {
  if (!historic(state)) return null;
  if (transportationHere(state) && years >= 2 && offense.severity === 'felony') return { facility: `a convict ship to ${yearNow(state) < 1840 ? 'New South Wales' : 'Van Diemen\'s Land'}`, kind: 'state' };
  const named = periodPrison(state, years);
  return named ? { facility: named, kind: years <= 1 ? 'jail' : 'state' } : null;
}

setJusticeHooks({ deathEra: deathPenaltyThen, facilityEra: facilityThen });

export const LawOfTheDayModule = {
  id: 'lawDay',
  order: 61.5,
  setup(engine) {
    engine.bus.on('legal:incarcerated', ({ ctx, years }) => {
      const { state } = ctx;
      const inc = state.legal?.incarceration;
      if (!inc || inc.deathRow || !historic(state)) return;
      if (/^a convict ship to /.test(inc.facility)) {
        const where = inc.facility.replace('a convict ship to ', '');
        inc.transported = true;
        state.lawDay.transported = { where, age: state.character.age };
        ctx.log(`You were sentenced to ${years >= 10 ? 'transportation for life' : `${years >= 7 ? 'seven' : years} years' transportation`}: four months below decks, then the chain gangs of ${where}.`, '⛓️', 'bad');
        return;
      }
      if (hardLabour(state) && years >= 1) { inc.hardLabour = true; ctx.log('With hard labour: the treadmill, picking oakum, the crank.', '⛓️', 'bad'); }
    });
  },
  init(state) { state.lawDay ??= {}; state.lawDay.trials ??= []; },
  guard(state, actionId) {
    if (actionId === 'people.fileForDivorce') return divorceBarred(state);
    if (['people.propose', 'people.wed'].includes(actionId) && !sameSexMarriageLegal(state) && partnerOf(state) && sameSex(state, partnerOf(state))) {
      const from = SAME_SEX_MARRIAGE[cc(state)];
      return from ? `Two ${state.character.gender === 'female' ? 'women' : 'men'} can't marry here until ${from}` : `Two ${state.character.gender === 'female' ? 'women' : 'men'} can't marry here`;
    }
    if (actionId === 'lawDay.bootleg' && !prohibitionHere(state)) return 'Drink is legal here.';
    return null;
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    const ld = state.lawDay;
    if (!historic(state) || !state.legal) return;
    const rng = lrng(state);
    const y = yearNow(state);
    const age = state.character.age;
    const inc = state.legal.incarceration;
    // Condemned in the years of little mercy: hanged within weeks, or reprieved.
    if (inc?.deathRow?.routine) {
      if (rng.chance(0.7)) return ctx.die(`Executed by ${inc.deathRow.method} in ${inc.deathRow.where}`);
      delete inc.deathRow;
      inc.yearsLeft = inc.total = transportationHere(state) ? 14 : 25;
      inc.facility = transportationHere(state) ? 'a convict ship to New South Wales' : periodPrison(state, 25) ?? 'a convict prison';
      if (transportationHere(state)) { inc.transported = true; ld.transported = { where: 'New South Wales', age }; }
      ctx.log(`Your sentence of death was commuted to ${transportationHere(state) ? 'transportation for life' : 'penal servitude'}.`, '⚖️', 'good');
    }
    // Abolition reaches death row.
    if (inc?.deathRow && deathPenaltyThen(state) == null && ABOLISHED[cc(state)] && y >= ABOLISHED[cc(state)]) {
      delete inc.deathRow;
      inc.yearsLeft = inc.total = 20;
      inc.facility = periodPrison(state, 20) ?? 'a maximum-security prison';
      ctx.log('The death penalty was abolished. Your sentence became life imprisonment.', '⚖️', 'good');
    }
    if (inc?.hardLabour) { ctx.stat('health', -2); ctx.stat('stress', 2); }
    // A transported convict's sentence ends at the far side of the world.
    if (ld.transported && !inc && !ld.transported.freed) {
      ld.transported.freed = age;
      ctx.prompt({
        type: 'lawDay.freed', icon: '🎫', title: 'Ticket of Leave',
        text: `Your sentence is served. You're free in ${ld.transported.where}, half a world from home.`,
        data: {},
        options: [
          { id: 'stay', label: '🇦🇺 Stay and make a life here', hint: 'Land is cheap; the past stays behind' },
          { id: 'home', label: '⛵ Work your passage home', hint: 'Months at sea' },
        ],
      });
    }
    // Debtors' prison.
    if (debtorsPrisonHere(state) && !inc && age >= 21 && (state.finances?.cash ?? 0) < -Math.max(2000, (state.finances.lastYear?.gross ?? 0) * 0.5) && rng.chance(0.3)) {
      const where = cc(state) === 'GB' ? (y < 1842 ? 'the Marshalsea' : 'Whitecross Street debtors\' prison') : cc(state) === 'FR' ? 'Clichy debtors\' prison' : 'the debtors\' prison';
      state.legal.incarceration = { yearsLeft: 1, total: 1, facility: where, kind: 'jail', served: 0, debtors: true };
      ld.debtors = (ld.debtors ?? 0) + 1;
      state.finances.cash = Math.round(state.finances.cash / 2);
      if (state.career?.job) ctx.emit('career:resign', { reason: 'Imprisoned for debt' });
      ctx.log(`Your creditors had you committed to ${where} until your debts are settled. Your family visits; you pay for your own food. After a year they settled for half.`, '🔒', 'bad');
      ctx.stat('happiness', -10);
    }
    // Prohibition.
    if (prohibitionHere(state) && !ld.dry) { ld.dry = y; ctx.log('Prohibition: the saloons are shut. The speakeasies are not.', '🥃', 'info'); }
    // Sex between men, where it was a crime.
    const partner = partnerOf(state);
    if (sexBetweenMenCriminal(state) && state.character.gender === 'male' && sameSex(state, partner) && !inc && age >= 18 && rng.chance(0.03)) {
      ctx.log(`Police came to the flat. You and ${partner.firstName} were charged under the law that makes your love a crime.`, '⚖️', 'bad');
      ctx.emit('legal:offense', { offenseId: 'grossIndecency', context: 'a private relationship with another man', caught: true, evidence: 0.8 });
      ctx.stat('stress', 10);
    }
    // The famous trials of the year.
    if (age >= 12) {
      for (const [year, where, text] of TRIALS) {
        if (year !== y || ld.trials.includes(year) || (where && !where.includes(cc(state)))) continue;
        ld.trials.push(year);
        ctx.log(`In the papers: ${text}`, '📰', 'info');
      }
    }
  },
  actions: {
    /** Run liquor during Prohibition: money, and the chance of a raid. */
    bootleg(ctx) {
      const { state, rng } = ctx;
      if (state.character.age < 18) return ctx.toast('Too young.', 'warn');
      if (state.legal?.incarceration) return ctx.toast('Not from in here.', 'warn');
      const ld = state.lawDay;
      if (ld.bootlegged === yearNow(state)) return ctx.toast('You\'ve run your loads this year.', 'warn');
      ld.bootlegged = yearNow(state);
      const take = rng.int(3000, 12000);
      ctx.earn(take, 'Bootlegging');
      ctx.log(`You ran liquor${cc(state) === 'US' ? ' across from Canada' : ''} to the speakeasies: $${take.toLocaleString()}.`, '🥃', 'good');
      if (rng.chance(0.2)) ctx.emit('legal:offense', { offenseId: 'bootlegging', context: 'a raid on a speakeasy', caught: true, evidence: 0.8 });
    },
  },
  resolvers: {
    freed(ctx, data, optionId) {
      const { state } = ctx;
      if (optionId === 'stay') {
        arrive(ctx, 'AU', { visa: 'freeMovement', reason: 'You stayed on in Australia: a ticket of leave, then a free man\'s life.' });
        ctx.stat('happiness', 4);
      } else {
        ctx.spend(800, 'Passage home', { allowDebt: true });
        ctx.log('You worked your passage home. Almost nobody you knew was waiting.', '⛵', 'info');
        ctx.stat('stress', 4);
      }
      if (state.lawDay.transported) state.lawDay.transported.choice = optionId;
    },
  },
};
