/**
 * Working conditions of their day: the hours, the holidays, the danger, and how the pay came.
 *
 *   The week      seventy-two hours in an 1840 mill; Britain's Ten Hours Act (1847), the 54-hour
 *                 week, the 48-hour week after 1919, America's 40 hours (1938/40), France's 40 (1936)
 *                 and 35 (2000). Long weeks wear you down.
 *   Holidays      none paid before the 1930s for most workers; a week, then two, then four (France's
 *                 congés payés of 1936, Britain's Holidays with Pay Act of 1938).
 *   Danger        each trade's own: the pit (explosions, falls of roof, black lung), the mill (the
 *                 machines, cotton dust, deafness), the docks, the railways (brakemen and shunters),
 *                 high steel, the sea; asbestos in shipyards and lagging (1930s–80s) that kills
 *                 thirty years later. Far deadlier before 1900, less each generation.
 *   Compensation  workmen's compensation (Germany 1884, Britain 1897, France 1898, America's states
 *                 from 1911): before it an injured worker was on his own.
 *   Casual work   the docks' "call-on" (taken on by the half-day at the gate until Britain's
 *                 decasualisation of 1967; the shape-up in American ports): weeks without work.
 *   The truck     paid in company scrip, spent at the company store (American coal and timber
 *                 towns into the 1940s; Britain's Truck Acts fought it from 1831).
 *
 * state.conditions = { seen: { [id]: age }, asbestos: years, dust: years, injuries: n }
 */
import { Random } from '../../core/Random.js';
import { yearNow } from '../world/Eras.js';
import { getProfession } from './JobTrees.js';

const cc = (state) => state.character.countryId ?? 'US';
const at = (rows, y) => rows.find(([until]) => y < until)?.[1] ?? rows.at(-1)[1];

const HOURS = {
  GB: [[1847, 72], [1874, 60], [1919, 54], [1947, 48], [1960, 44], [1980, 40], [2000, 39], [9999, 37.5]],
  US: [[1840, 72], [1890, 60], [1920, 55], [1938, 48], [1940, 44], [9999, 40]],
  FR: [[1848, 72], [1919, 60], [1936, 48], [1982, 40], [2000, 39], [9999, 35]],
  DE: [[1890, 66], [1918, 60], [1956, 48], [1967, 45], [1990, 42], [9999, 38]],
  JP: [[1947, 60], [1988, 48], [1997, 44], [9999, 40]],
  '*': [[1870, 72], [1919, 60], [1950, 48], [1980, 44], [9999, 40]],
};
const HOLIDAYS = {
  GB: [[1938, 0], [1960, 7], [1975, 14], [1998, 20], [9999, 28]],
  US: [[1940, 0], [1960, 7], [9999, 10]],
  FR: [[1936, 0], [1956, 12], [1969, 18], [1982, 24], [9999, 30]],
  DE: [[1919, 0], [1963, 12], [1974, 18], [9999, 24]],
  '*': [[1940, 0], [1970, 10], [9999, 20]],
};
/** Standard hours a week for a job here and now (offices and the professions a little shorter). */
export function weekHours(state, job = state.career?.job) {
  if (!job) return 0;
  const base = at(HOURS[cc(state)] ?? HOURS['*'], yearNow(state));
  const office = ['federal', 'state', 'municipal', 'public'].includes(job.sector) || /finance|corporate|law|accounting|insurance|ministry|college|university|education/.test(job.professionId);
  return Math.round(office ? Math.max(35, base - 6) : base);
}
export const paidHolidays = (state) => at(HOLIDAYS[cc(state)] ?? HOLIDAYS['*'], yearNow(state));
export const saturdayWork = (state) => yearNow(state) < (cc(state) === 'US' ? 1940 : 1965);

/** The danger in a trade: [yearly chance of a serious accident, disease id, yearly exposure chance, label]. */
const DANGER = {
  coalMining: [0.05, 'copd', 0.04, 'black lung (pneumoconiosis)'], millWork: [0.03, 'hearingLoss', 0.05, 'mill deafness and cotton dust'],
  docks: [0.04, null, 0, null], steamRailway: [0.035, null, 0, null], railroad: [0.03, null, 0, null], ironworking: [0.04, null, 0, null],
  carpentry: [0.02, null, 0, null], fishing: [0.04, null, 0, null], whaling: [0.06, null, 0, null], merchantMarine: [0.025, null, 0, null],
  blacksmith: [0.02, 'hearingLoss', 0.03, 'a smith\'s deafness'], manufacturing: [0.025, 'hearingLoss', 0.02, 'factory deafness'], oilGas: [0.035, null, 0, null],
  plumbing: [0.015, null, 0, null], trades: [0.02, null, 0, null], lamplighter: [0.01, null, 0, null], agriculture: [0.02, null, 0, null], craneOperator: [0.02, null, 0, null],
};
const ASBESTOS = ['plumbing', 'trades', 'carpentry', 'merchantMarine', 'manufacturing', 'ironworking', 'docks'];
const eraRisk = (y) => (y < 1880 ? 1.3 : y < 1914 ? 1 : y < 1950 ? 0.6 : y < 1980 ? 0.3 : 0.12);
const COMP_FROM = { DE: 1884, GB: 1897, IE: 1897, FR: 1898, IT: 1898, US: 1911, JP: 1911, CA: 1914, AU: 1902, NZ: 1900, '*': 1920 };
export const compensationHere = (state) => yearNow(state) >= (COMP_FROM[cc(state)] ?? COMP_FROM['*']);
const CASUAL_UNTIL = { GB: 1967, IE: 1970, US: 1953, AU: 1967, '*': 1960 };
const TRUCK = (state, job) => cc(state) === 'US' && yearNow(state) < 1945 && ['coalMining', 'agriculture'].includes(job.professionId);

const cw = (state) => (state.conditions ??= { seen: {}, asbestos: 0, dust: 0, injuries: 0 });
const once = (state, id) => { const c = cw(state); if (c.seen[id] != null) return false; c.seen[id] = state.character.age; return true; };
const rngOf = (state) => new Random(((state.world?.seed ?? 7) * 1103515245 + state.character.age * 389 + 0x77) >>> 0);
const tradeOf = (job) => DANGER[job.professionId] ? job.professionId : DANGER[getProfession(job.professionId)?.template] ? getProfession(job.professionId).template : null;

export const WorkingConditionsModule = {
  id: 'workingConditions',
  order: 22.8,
  onAgeUp(ctx) {
    const { state } = ctx;
    const job = state.career?.job;
    if (!state.character.alive) return;
    const c = cw(state);
    const y = yearNow(state);
    const rng = rngOf(state);
    // Asbestos waits thirty years.
    if (c.asbestos >= 5 && !c.seen.mesothelioma && state.character.age >= 50 && rng.chance(Math.min(0.04, c.asbestos * 0.002))) {
      c.seen.mesothelioma = state.character.age;
      ctx.emit('health:injury', { ctx, conditionId: 'cancer', severity: 70 });
      ctx.log('The cough wouldn\'t go. The doctors called it mesothelioma: the asbestos dust you breathed years ago.', '🫁', 'bad');
    }
    if (!job || state.character.age < 12) return;
    // The week.
    const hours = weekHours(state, job);
    if (hours > 48) ctx.stat('stress', Math.round((hours - 48) / 6));
    if (hours >= 60) ctx.stat('health', -1);
    const hol = paidHolidays(state);
    if (hol >= 14) ctx.stat('happiness', 1);
    if (once(state, `hours.${hours}`) && hours >= 54) ctx.log(`Your week: ${hours} hours${saturdayWork(state) ? ', Saturdays included' : ''}${hol ? `, ${hol} days' paid holiday a year` : ', and no paid holiday'}.`, '⏰', 'info');
    if (hol && c.seen.firstHoliday == null && once(state, 'firstHoliday')) ctx.log(`Your first paid holiday: ${hol >= 14 ? 'two weeks' : 'a week'} away from work, and still paid.`, '🏖️', 'good');
    // Danger.
    const trade = tradeOf(job);
    if (trade) {
      const [acc, disease, expo, label] = DANGER[trade];
      if (rng.chance(acc * eraRisk(y))) {
        c.injuries += 1;
        const fatal = rng.chance(0.05 * eraRisk(y));
        if (fatal) {
          ctx.log(trade === 'coalMining' ? 'A fall of roof in the seam you were working.' : 'An accident at work, of the kind that happened every week somewhere.', '⚠️', 'bad');
          return void ctx.die(trade === 'coalMining' ? 'killed underground' : trade === 'fishing' || trade === 'whaling' ? 'lost at sea' : 'killed in an accident at work');
        }
        if (rng.chance(0.5)) ctx.emit('health:acute', { ctx, id: 'brokenBone' }); else ctx.emit('health:injury', { ctx, conditionId: 'backInjury', severity: Math.round(20 + rng.int(0, 40) * eraRisk(y)) });
        if (compensationHere(state)) {
          ctx.earn(Math.round((job.salary ?? 20000) * 0.3), 'Workmen\'s compensation', {});
          ctx.log('Hurt at work. The compensation paid a share of your wages while you mended.', '🩹', 'warn');
        } else {
          ctx.spend(Math.round((job.salary ?? 20000) * 0.25), 'Weeks off work, unpaid', { allowDebt: true });
          ctx.log('Hurt at work. There was no compensation: no work, no wages, until you could go back.', '🩹', 'bad');
        }
      }
      if (disease && rng.chance(expo * eraRisk(y))) {
        c.dust += 1;
        if (c.dust >= 6 && once(state, `disease.${disease}`)) {
          ctx.emit('health:injury', { ctx, conditionId: disease, severity: 40 });
          ctx.log(`The years in the trade have left their mark: ${label}.`, '🫁', 'bad');
        }
      }
    }
    if (ASBESTOS.includes(job.professionId) && y >= 1930 && y < 1985) c.asbestos += 1;
    // Casual hiring at the docks.
    if (job.professionId === 'docks' && y < (CASUAL_UNTIL[cc(state)] ?? CASUAL_UNTIL['*']) && rng.chance(0.5)) {
      ctx.spend(Math.round((job.salary ?? 20000) * rng.float(0.1, 0.3)), 'Days not taken on at the call', { allowDebt: true });
      if (once(state, 'callOn')) ctx.log(cc(state) === 'US' ? 'The shape-up: every morning you stand at the pier and the hiring boss picks his men. Some weeks he doesn\'t pick you.' : 'The call-on: twice a day at the dock gate, and some days the foreman doesn\'t call your name.', '⚓', 'warn');
    }
    // Company scrip.
    if (TRUCK(state, job) && once(state, 'scrip')) {
      ctx.spend(Math.round((job.salary ?? 20000) * 0.08), 'Company-store prices', { allowDebt: true });
      ctx.log('Part of your pay comes in company scrip, good only at the company store, where everything costs more.', '🪙', 'warn');
    }
  },
};
