/**
 * What a move leaves behind. Everything tied to a place is settled when you
 * move: local roles end or transfer, and a move abroad ends memberships that
 * only exist in the country you left.
 *
 *   Any move to a new town   PTA, neighbourhood watch, the transit board and
 *                             veterans' posts end; your neighbours are new;
 *                             a child changes school; your congregation is
 *                             a new one (and any lay role stays behind).
 *                             (Volunteer units transfer in EmergencyEngine.)
 *   A new state               the state defence force discharges you.
 *   A new country             disaster teams, national service and
 *                             apprenticeships end; party membership lapses.
 */
import { REGIONS } from '../life/Regions.js';
import { STATES } from '../life/States.js';
import { leaveTeam } from '../service/DisasterTeams.js';
import { leaveSdf } from '../service/StateForces.js';
import { leavePost } from '../service/VeteranPosts.js';
import { completeTerm } from '../service/NationalService.js';
import { congregationName } from '../community/Religions.js';
import { COUNTRIES } from './Countries.js';
import { Random } from '../../core/Random.js';

/** Schools you can keep attending from anywhere. */
const PORTABLE_SCHOOLS = ['online', 'homeschool', 'boarding'];

function newTown(ctx, from, to) {
  const { state } = ctx;
  const town = REGIONS[to]?.name ?? 'your new town';
  const c = state.civic;
  if (c) {
    if (c.pta) { c.pta = null; ctx.log('You left the PTA when you moved.', '🍎', 'muted'); }
    if (c.watch) { c.watch = null; ctx.log('You left the neighborhood watch when you moved.', '👀', 'muted'); }
    if (c.transitBoard && c.transitBoard.regionId !== to) { c.transitBoard = null; ctx.log('You gave up your transit board seat: it belongs to the old city.', '🚌', 'muted'); }
    c.neighbors = [];
    c.neighborsAt = null;
  }
  for (const [id, m] of Object.entries(state.service?.posts ?? {})) if (m) leavePost(ctx, id, `Moved to ${town}`);
  // A child goes to a school in the new town.
  const k = state.k12;
  if (k?.type && !PORTABLE_SCHOOLS.includes(k.type) && state.character.age < 18) {
    k.type = 'public';
    ctx.log(`You started at a new school in ${town}.`, '🏫', 'info');
  }
  // The faith travels; the congregation and any lay role don't.
  const faith = state.community?.faith;
  if (faith?.congregation && faith.traditionId) {
    const rng = new Random(((state.world?.seed ?? 1) * 7919 + state.character.age * 31 + to.length) >>> 0);
    if (faith.role) ctx.log(`You handed over your role as ${faith.role} at ${faith.congregation}.`, '🙏', 'muted');
    faith.congregation = congregationName(rng, faith.traditionId);
    faith.role = null;
  }
}

function newState(ctx, fromState, toState) {
  const { state } = ctx;
  if (state.service?.sdf && state.service.sdf.stateId !== toState) leaveSdf(ctx, `Moved out of ${STATES[fromState]?.name ?? 'the state'}`);
}

function newCountry(ctx, from, to) {
  const { state } = ctx;
  const where = COUNTRIES[to]?.name ?? 'abroad';
  for (const [id, m] of Object.entries(state.service?.teams ?? {})) if (m) leaveTeam(ctx, id, `Moved to ${where}`);
  if (state.service?.program) completeTerm(ctx, false);
  if (state.apprenticeship) {
    state.apprenticeship = null;
    ctx.log(`Your apprenticeship ended when you moved to ${where}; the years served count toward a trade qualification there.`, '🧰', 'warn');
  }
  if (state.civic?.party) {
    state.civic.party = null;
    ctx.log(`Your party membership in ${COUNTRIES[from]?.name ?? 'your old country'} lapsed when you moved.`, '🗳️', 'muted');
  }
}

export const MoveAftermathModule = {
  id: 'moveAftermath',
  order: 4.5,
  setup(engine) {
    engine.bus.on('region:changed', ({ ctx, from, to, fromState, toState }) => {
      if (from === to) return;
      newTown(ctx, from, to);
      if (fromState !== toState) newState(ctx, fromState, toState);
    });
    engine.bus.on('migration:moved', ({ ctx, from, to }) => { if (from !== to) newCountry(ctx, from, to); });
  },
};
