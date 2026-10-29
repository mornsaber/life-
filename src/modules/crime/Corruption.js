/**
 * Corruption: the law, for sale — as much as it is where you live.
 *
 *   At the roadside   Caught in a country where the police take money, you can try paying the
 *                     officer on the spot. Where they don't, it's a second charge.
 *   On the payroll    A detective on a retainer tells you about raids and slows your cases down.
 *                     If internal affairs gets them, they trade you for their pension.
 *   Fixing a case     Pay someone to make one case go away (a clerk, a detective, a prosecutor).
 *   In the court      The plea stage of a felony case offers a "fix" where courts are corrupt
 *                     (JusticeSystem offerPrompt).
 *   The other side    Police, prosecutors and customs officers are offered payoffs (Misconduct.js).
 *
 * How likely any of this is to work is the country's corruption level (CrimeWorld.js).
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, randomName } from '../../core/State.js';
import { OFFENSES } from '../legal/Offenses.js';
import { charge, commitOffense } from '../legal/JusticeSystem.js';
import { corruptionHere } from './CrimeWorld.js';
import { priceLevel } from '../world/Countries.js';
import { caseById, refresh } from './Cases.js';
import { crimeOf } from '../legal/StreetCrime.js';

const local = (state, n) => Math.round(n * priceLevel(state));

/** JusticeSystem onArrest hook: the officer who caught you might take money. */
export function arrestBribe(ctx, { offenseId, context, evidence }) {
  const { state } = ctx;
  const offense = OFFENSES[offenseId];
  const corrupt = corruptionHere(state);
  if (corrupt < 0.45 || state.character.age < 16 || !['misdemeanor', 'felony'].includes(offense.severity) || offense.capital) return false;
  const cost = local(state, offense.severity === 'felony' ? 3000 : 400);
  ctx.prompt({
    type: 'crime.roadside', icon: '👮', title: 'The Officer Lingers',
    text: `The officer who caught you (${context || offense.name.toLowerCase()}) hasn't called it in yet. He looks at his notebook, then at your wallet.`,
    options: [
      { id: 'pay', label: `💵 "Can we settle this here?" ($${cost.toLocaleString()})`, tone: 'danger', illegal: 'bribing a police officer' },
      { id: 'go', label: '🚓 Go to the station' },
    ],
    data: { offenseId, context, evidence, cost },
  });
  return true;
}

export const CorruptionResolvers = {
  roadside(ctx, data, optionId) {
    const { state, rng } = ctx;
    if (optionId === 'pay') {
      ctx.spend(data.cost, 'Cash for an officer', { allowDebt: true });
      if (rng.chance(clamp(corruptionHere(state) + 0.15, 0, 0.95))) return ctx.log('The notebook closed. "Drive carefully." Nobody will ever write it down.', '💵', 'warn');
      ctx.log('He took the money — and arrested you for that too.', '🚓', 'bad');
      commitOffense(ctx, { offenseId: 'briberyOfficer', discovery: 0.7, evidence: 0.85, context: 'offering cash to an arresting officer', yearsLeft: 3 });
    }
    return charge(ctx, { offenseId: data.offenseId, context: data.context, evidence: data.evidence });
  },
};

const crimeState = (state) => crimeOf(state);

export const CorruptionActions = {
  /** A cop on the payroll: warnings about raids, and slower cases. */
  payrollCop(ctx) {
    const { state, rng } = ctx;
    const c = crimeState(state);
    if (c.cop) return ctx.toast(`${c.cop.name} is already on your payroll`, 'warn');
    if ((state.legal.crime?.heat ?? 0) < 10 && !(state.legal.crime?.drugs?.stash)) return ctx.toast('You have nothing worth protecting', 'warn');
    const corrupt = corruptionHere(state);
    if (yearlyCount(state, 'crime.payroll')) return ctx.toast('Once a year', 'warn');
    bumpYearly(state, 'crime.payroll');
    const fee = local(state, 15000);
    if (!rng.chance(clamp(corrupt + 0.1, 0.1, 0.9))) {
      ctx.log('The detective you approached reported it. Internal affairs is very interested in you.', '🚔', 'bad');
      return commitOffense(ctx, { offenseId: 'briberyOfficer', discovery: 0.5, evidence: 0.8, context: 'an attempt to put a detective on retainer' });
    }
    const n = randomName(rng, rng.chance(0.7) ? 'male' : 'female');
    c.cop = { name: `Detective ${n.lastName}`, fee, since: state.character.age };
    ctx.spend(fee, 'A detective\'s retainer', { allowDebt: true });
    ctx.log(`${c.cop.name} is on your payroll now: $${fee.toLocaleString()} a year for a phone call before every raid.`, '🚔', 'warn');
  },
  dropCop(ctx) {
    const c = crimeState(ctx.state);
    if (!c.cop) return;
    ctx.log(`You stopped paying ${c.cop.name}. He'll remember.`, '🚔', 'info');
    c.cop = null;
  },
  /** Pay someone to make a case go away. */
  fixCase(ctx, caseId) {
    const { state, rng } = ctx;
    const inv = caseById(state, caseId);
    if (!inv) return ctx.toast('No such case', 'warn');
    const corrupt = corruptionHere(state);
    if (corrupt < 0.3 && !crimeState(state).cop) return ctx.toast('Nobody here would take it — and asking is a crime', 'warn');
    if (yearlyCount(state, `case.${inv.id}.fix`)) return ctx.toast('Once a year for each case', 'warn');
    bumpYearly(state, `case.${inv.id}.fix`);
    const offense = OFFENSES[inv.offenseId];
    const cost = local(state, offense.severity === 'felony' ? 25000 : 5000);
    ctx.spend(cost, 'Making a case go away', { allowDebt: true });
    const odds = clamp(corrupt * 0.9 + (crimeState(state).cop ? 0.2 : 0) - (offense.violent ? 0.2 : 0), 0.05, 0.9);
    if (rng.chance(odds)) {
      state.legal.investigations = state.legal.investigations.filter((c) => c !== inv);
      return ctx.log(`$${cost.toLocaleString()} changed hands. The ${offense.name.toLowerCase()} file went to the back of a cabinet and stayed there.`, '💰', 'warn');
    }
    inv.discovery = clamp(inv.discovery + 0.15, 0, 0.9);
    inv.items.push({ kind: 'financial', strength: 0.4 });
    refresh(inv);
    ctx.log('The money went, and the case didn\'t. Now there\'s a payment on record.', '💰', 'bad');
  },
};

/** Yearly: the cop on the payroll earns his money — or gets caught. */
export function corruptionTick(ctx) {
  const { state, rng } = ctx;
  const cop = state.legal.crime?.cop;
  if (!cop || state.legal.incarceration) return;
  ctx.spend(cop.fee, `${cop.name}'s retainer`, { allowDebt: true });
  for (const inv of state.legal.investigations) inv.discovery = clamp(inv.discovery * 0.75, 0, 0.9);
  if (state.legal.crime) state.legal.crime.heat = Math.round(state.legal.crime.heat * 0.8);
  if (rng.chance(clamp(0.06 + (1 - corruptionHere(state)) * 0.1, 0.05, 0.2))) {
    ctx.log(`Internal affairs arrested ${cop.name}. He gave them your name in the first hour.`, '🚔', 'bad');
    state.legal.crime.cop = null;
    commitOffense(ctx, { offenseId: 'briberyOfficer', discovery: 0.6, evidence: 0.85, context: 'a corrupt detective\'s testimony' });
  }
}
