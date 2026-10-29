/**
 * Juvenile justice: a child charged with a crime goes to a juvenile (youth) court, which is
 * meant to rehabilitate rather than punish.
 *
 *   Diversion     A first, minor offence admitted: a youth caution, a restorative-justice meeting
 *                 with the victim and community service. No record.
 *   Adjudication  Denied, it goes to a hearing before a judge (no jury). Found responsible, the
 *                 court "adjudicates you delinquent" — not a conviction, but a juvenile record.
 *   Disposition   Probation, or for serious and repeat offending, a youth detention centre.
 *   Waiver        At 16–17, prosecutors can move a serious violent case to adult court, where the
 *                 sentence is an adult one (but never death, and rarely life).
 *   Sealing       At 18, a juvenile record is sealed — except for serious violence.
 */
import { clamp } from '../../core/Random.js';
import { OFFENSES } from './Offenses.js';
import { regionOf } from '../life/Regions.js';
import { priceLevel } from '../world/Countries.js';

/** Offences serious enough to be waived to adult court at 16 or 17. */
const WAIVABLE = new Set(['murder', 'firstDegreeMurder', 'felonyMurder', 'manslaughter', 'armedRobbery', 'carjacking', 'kidnapping', 'rape', 'sexualAssault', 'aggravatedAssault', 'bankRobbery', 'drugTrafficking']);
const juvenileRecord = (state) => state.legal.record.filter((r) => r.juvenile);

/**
 * Called by charge() for anyone under 18. Returns true when the youth court handles it, false
 * when prosecutors have moved the case to adult court.
 */
export function juvenileCourt(ctx, { offenseId, context, evidence }) {
  const { state, rng } = ctx;
  const offense = OFFENSES[offenseId];
  const age = state.character.age;
  if (age >= 16 && WAIVABLE.has(offenseId) && rng.chance(offenseId.includes('urder') || offenseId === 'rape' ? 0.8 : 0.4)) {
    state.legal.flags.tryAsAdult = true;
    ctx.log(`Prosecutors moved your case to adult court. At ${Math.floor(age)}, you will be tried — and sentenced — as an adult.`, '⚖️', 'bad');
    return false;
  }
  const first = !juvenileRecord(state).length && !state.legal.record.some((r) => r.severity !== 'infraction');
  const divertable = first && !(offense.violent && offense.severity === 'felony');
  const fee = Math.round(3500 * priceLevel(state));
  ctx.prompt({
    type: 'legal.juvenile',
    icon: '🧒',
    title: 'Youth Court',
    text: `${context ? `${context[0].toUpperCase()}${context.slice(1)}. ` : ''}You're ${Math.floor(age)}, so the charge of ${offense.name.toLowerCase()} goes to the youth court. Your ${state.people?.list?.some((p) => p.alive && ['mother', 'father'].includes(p.relation)) ? 'parents sit' : 'social worker sits'} beside you.${divertable ? ' Because it\'s a first offence, the prosecutor will offer diversion if you admit it.' : ''}`,
    options: [
      { id: 'admit', label: divertable ? '🙇 Admit it and take diversion' : '🙇 Admit it', hint: divertable ? 'Community service and a meeting with the victim; no record' : 'A lighter disposition' },
      { id: 'deny', label: '🙅 Deny it: a hearing before the judge', hint: 'The court must prove it' },
      { id: 'lawyer', label: `👔 Parents hire a lawyer ($${fee.toLocaleString()})`, hint: 'Better odds at the hearing' },
    ],
    data: { offenseId, context, evidence, divertable, fee },
  });
  return true;
}

/** How the youth court disposes of a case it has found proven. */
function dispose(ctx, data, { admitted }) {
  const { state, rng } = ctx;
  const offense = OFFENSES[data.offenseId];
  const priors = juvenileRecord(state).length;
  const serious = offense.severity === 'felony' && (offense.violent || priors >= 2 || (offense.prison?.[1] ?? 0) >= 8);
  const rec = { offenseId: data.offenseId, name: offense.name, severity: offense.severity, age: state.character.age, juvenile: true };
  if (serious && rng.chance(admitted ? 0.5 : 0.75)) {
    const years = clamp(Math.round(rng.int(1, 3) + priors * 0.5), 1, Math.max(1, 21 - Math.floor(state.character.age)));
    const city = regionOf(state).name.split(',')[0];
    rec.sentence = `${years} yr youth detention`;
    state.legal.record.push(rec);
    state.legal.incarceration = { yearsLeft: years, total: years, facility: `${city} Youth Detention Centre`, kind: 'juvenile', served: 0 };
    ctx.log(`The judge committed you to the ${city} Youth Detention Centre for ${years} year${years === 1 ? '' : 's'}.`, '🔒', 'death');
    ctx.stat('happiness', -18);
    ctx.emit('health:trauma', { amount: 8, source: 'youth detention' });
    ctx.emit('legal:incarcerated', { years, juvenile: true });
    return;
  }
  const probation = offense.severity === 'felony' ? 2 : 1;
  rec.sentence = `${probation} yr juvenile probation`;
  state.legal.record.push(rec);
  state.legal.probationYears = Math.max(state.legal.probationYears, probation);
  ctx.log(`Adjudicated delinquent: ${offense.name}. ${probation} year${probation === 1 ? '' : 's'} of juvenile probation — curfew, school every day, a probation officer who calls your parents.`, '🧒', 'bad');
  ctx.stat('happiness', -8);
}

export const JuvenileResolvers = {
  juvenile(ctx, data, optionId) {
    const { state, rng } = ctx;
    if (optionId === 'admit' && data.divertable) {
      state.legal.flags.diversions = (state.legal.flags.diversions ?? 0) + 1;
      ctx.log('You admitted it. Diversion: sixty hours of community service and a restorative-justice meeting where you had to look the victim in the eye. No record.', '🧹', 'warn');
      ctx.stat('happiness', -3);
      return;
    }
    if (optionId === 'admit') return dispose(ctx, data, { admitted: true });
    if (optionId === 'lawyer') ctx.spend(data.fee, 'Juvenile defence lawyer', { allowDebt: true });
    const proven = rng.chance(clamp(data.evidence * (optionId === 'lawyer' ? 0.65 : 0.85), 0.05, 0.95));
    if (!proven) {
      ctx.log('The judge found the case against you not proven. Dismissed.', '🧑‍⚖️', 'good');
      ctx.stat('happiness', 6);
      return;
    }
    return dispose(ctx, data, { admitted: false });
  },
};

/** At 18: the juvenile record is sealed, except for serious violence. */
export function sealJuvenileRecords(ctx) {
  const { state } = ctx;
  if (Math.floor(state.character.age) !== 18 || state.legal.flags.juvenileSealed) return;
  state.legal.flags.juvenileSealed = true;
  const list = juvenileRecord(state).filter((r) => !r.sealed && !(OFFENSES[r.offenseId]?.violent && r.severity === 'felony'));
  for (const r of list) r.sealed = true;
  if (list.length) ctx.log(`You turned 18 and your juvenile record (${list.length} matter${list.length === 1 ? '' : 's'}) was sealed. A fresh start, on paper.`, '🗃️', 'good');
}
