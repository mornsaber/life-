/**
 * A second chance for a criminal record.
 *
 *   Sealing / expungement  State convictions only (there's no federal
 *                          expungement). Misdemeanors after 3 crime-free
 *                          years, non-violent felonies after 7. Violent
 *                          crimes and DUIs can't be sealed. Sealed records
 *                          vanish from employer and licensing background
 *                          checks (federal clearance investigators still see them).
 *   Pardon                 The governor (state crimes) or the President
 *                          (federal crimes), at least 5 years after the
 *                          sentence ends. Rare — better odds with a clean
 *                          record since and service to the community. A
 *                          pardon restores your rights: the felony stops
 *                          counting against you.
 *   Clemency               On death row, the governor can commute to life.
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, prestige } from '../../core/State.js';
import { OFFENSES } from './Offenses.js';
import { stateOf } from '../life/Regions.js';

export const SEAL_COST = 1200;
export const PARDON_WAIT = 5;
const SEAL_WAIT = { misdemeanor: 3, felony: 7 };

const sinceLastConviction = (state) => {
  const last = state.legal.record.filter((r) => r.severity !== 'infraction' && r.severity !== 'civil').reduce((m, r) => Math.max(m, r.age), -Infinity);
  return state.character.age - last;
};

/** Why a record entry can or can't be sealed. */
export function sealStatus(state, r) {
  const offense = OFFENSES[r.offenseId] ?? {};
  if (r.sealed) return { ok: false, reason: 'Sealed' };
  if (!['misdemeanor', 'felony'].includes(r.severity)) return { ok: false, reason: 'Nothing to seal' };
  if (offense.violent) return { ok: false, reason: 'Violent offenses can never be sealed' };
  if (offense.noSeal) return { ok: false, reason: 'DUIs can\'t be sealed here' };
  if (offense.federal || r.abroad) return { ok: false, reason: 'Federal and foreign convictions can only be pardoned' };
  const wait = SEAL_WAIT[r.severity];
  if (state.character.age - r.age < wait) return { ok: false, reason: `Eligible ${wait} yr after conviction` };
  if (sinceLastConviction(state) < wait) return { ok: false, reason: `Needs ${wait} crime-free years` };
  return { ok: true };
}

export function pardonStatus(state, r) {
  if (r.pardoned) return { ok: false, reason: 'Pardoned' };
  if (r.severity !== 'felony') return { ok: false, reason: 'Pardons are for felonies' };
  if (sinceLastConviction(state) < PARDON_WAIT) return { ok: false, reason: `Needs ${PARDON_WAIT} crime-free years` };
  const federal = Boolean(OFFENSES[r.offenseId]?.federal);
  const service = Object.entries(state.emergency ?? {}).some(([k, m]) => k !== 'history' && m) || state.military.history.some((h) => ['honorable', 'retired', 'medical'].includes(h.discharge));
  const chance = clamp((federal ? 0.02 : 0.08) + (service ? 0.05 : 0) + Math.min(0.05, prestige(state) / 2000) + Math.min(0.05, (sinceLastConviction(state) - PARDON_WAIT) * 0.005), 0.01, 0.25);
  return { ok: true, federal, chance, by: federal ? 'the President' : `the Governor of ${stateOf(state).name}` };
}

export const ClemencyActions = {
  /** One petition seals every eligible conviction. */
  sealRecord(ctx) {
    const { state, rng } = ctx;
    if (state.legal.probationYears > 0) return ctx.toast('Finish your probation first.', 'warn');
    const eligible = state.legal.record.filter((r) => sealStatus(state, r).ok);
    if (!eligible.length) return ctx.toast('No convictions are eligible to seal yet.', 'warn');
    if (yearlyCount(state, 'legal.seal')) return ctx.toast('One petition a year.', 'warn');
    if (!ctx.spend(SEAL_COST, 'Record-sealing petition', { credit: true })) return ctx.toast(`An attorney and court fees run $${SEAL_COST.toLocaleString()}.`, 'warn');
    bumpYearly(state, 'legal.seal');
    const sealed = eligible.filter((r) => rng.chance(r.severity === 'felony' ? 0.6 : 0.85));
    for (const r of sealed) r.sealed = true;
    if (sealed.length) {
      ctx.log(`The judge granted your petition: ${sealed.map((r) => r.name).join(', ')} ${sealed.length > 1 ? 'are' : 'is'} sealed.`, '🗃️', 'good');
      ctx.stat('happiness', 6);
    } else ctx.log('The judge denied your petition to seal your record. You can try again next year.', '🗃️', 'warn');
  },

  /** Petition for a pardon for your most serious unpardoned felony (or clemency from death row). */
  seekPardon(ctx) {
    const { state, rng } = ctx;
    if (yearlyCount(state, 'legal.pardon')) return ctx.toast('One petition a year.', 'warn');
    const inc = state.legal.incarceration;
    if (inc?.deathRow) {
      bumpYearly(state, 'legal.pardon');
      if (rng.chance(0.03)) {
        delete inc.deathRow;
        inc.facility = 'a maximum-security prison';
        return ctx.log('The governor granted clemency and commuted your sentence to life.', '🕊️', 'good');
      }
      return ctx.log('Your clemency petition was denied.', '🕊️', 'bad');
    }
    if (inc) return ctx.toast('Pardon petitions open after you finish your sentence.', 'warn');
    const target = state.legal.record.filter((r) => pardonStatus(state, r).ok).sort((a, b) => (OFFENSES[b.offenseId]?.prison?.[1] ?? 0) - (OFFENSES[a.offenseId]?.prison?.[1] ?? 0))[0];
    if (!target) return ctx.toast('No felonies eligible for a pardon yet.', 'warn');
    bumpYearly(state, 'legal.pardon');
    const p = pardonStatus(state, target);
    if (rng.chance(p.chance)) {
      target.pardoned = true;
      ctx.log(`${p.by[0].toUpperCase()}${p.by.slice(1)} pardoned you for ${target.name}. Your rights are restored.`, '🕊️', 'milestone');
      ctx.toast('Pardoned!', 'good');
      ctx.stat('happiness', 12);
    } else ctx.log(`Your pardon petition to ${p.by} was denied.`, '🕊️', 'warn');
  },
};
