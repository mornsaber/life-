/**
 * Dorms: campus housing as provided housing. Room & board is billed with
 * tuition (cash first, then student loans; the GI Bill housing allowance and
 * academies cover it). Housing status reads 'dorm' while you live there.
 */
import { onCampus } from './Network.js';

export const ROOM_AND_BOARD = { state: 12500, private: 15500, elite: 17500, academy: 0 };

export function moveIntoDorm(ctx, { quiet = false } = {}) {
  const { state } = ctx;
  if (!onCampus(state)) return ctx.toast('Dorms are for full-time students at a residential campus.', 'warn');
  if (state.campus.housing === 'dorm') return;
  if (state.housing.rental) {
    ctx.log('You gave up your apartment and moved into the dorms.', '🔑');
    state.housing.rental = null;
  }
  state.campus.housing = 'dorm';
  if (!quiet) ctx.log(state.campus.academy ? 'You moved into the barracks.' : 'You moved into a dorm — cinderblock walls, a roommate and a meal plan.', '🛏️');
}

export function leaveDorm(ctx, reason) {
  const { state } = ctx;
  if (state.campus.housing !== 'dorm') return;
  state.campus.housing = null;
  // Students go back home unless they rent or own something.
  if (!state.housing.rental && !state.housing.properties.some((p) => p.use === 'primary')) state.housing.withParents = true;
  if (reason) ctx.log(reason, '📦');
}

/** Yearly room & board while in the dorms. */
export function dormTick(ctx) {
  const { state } = ctx;
  const e = state.education.enrolled;
  if (state.campus.housing !== 'dorm') return;
  if (!onCampus(state)) return leaveDorm(ctx, 'You moved out of the dorms.');
  const cost = ROOM_AND_BOARD[e.schoolId] ?? 0;
  if (!cost || e.giBillThisYear) return;
  const fromCash = Math.max(0, Math.min(cost, Math.floor(state.finances.cash) - 1000));
  if (fromCash) ctx.spend(fromCash, 'Room & board');
  if (cost > fromCash) state.finances.loans += cost - fromCash;
}
