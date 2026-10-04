/**
 * Where you live drives cost of living, private-sector market pay,
 * public-sector locality pay, and — through its state — taxes, laws,
 * licensing and disasters.
 *
 *   col:      cost-of-living multiplier on living expenses and rents
 *   market:   private/municipal pay multiplier
 *   locality: federal locality-pay percentage (GS-style) added to base pay
 *   state:    parent state (see States.js)
 *
 * Every relocation — a voluntary move, a PCS, a duty-station assignment, a
 * corporate transfer — goes through changeRegion(), which emits
 * `region:changed` so housing, licenses, careers and residency can react.
 */
import { canAfford } from '../../core/State.js';
import { STATES } from './States.js';

export const REGIONS = {
  rural: { id: 'rural', name: 'Glacier Valley, MT', icon: '🏔️', type: 'Rural', state: 'MT', col: 0.72, market: 0.86, locality: 0.17 },
  smalltown: { id: 'smalltown', name: 'Cedar Falls, IA', icon: '🌽', type: 'Small town', state: 'IA', col: 0.82, market: 0.9, locality: 0.17 },
  midcity: { id: 'midcity', name: 'Columbus, OH', icon: '🏙️', type: 'Mid-size city', state: 'OH', col: 0.95, market: 0.98, locality: 0.22 },
  sunbelt: { id: 'sunbelt', name: 'Austin, TX', icon: '🌵', type: 'Sun Belt metro', state: 'TX', col: 1.05, market: 1.05, locality: 0.21 },
  chicago: { id: 'chicago', name: 'Chicago, IL', icon: '🌬️', type: 'Major metro', state: 'IL', col: 1.15, market: 1.12, locality: 0.31 },
  dc: { id: 'dc', name: 'Washington, D.C.', icon: '🏛️', type: 'Capital region', state: 'DC', col: 1.3, market: 1.18, locality: 0.33 },
  nyc: { id: 'nyc', name: 'New York City', icon: '🗽', type: 'High-cost metro', state: 'NY', col: 1.55, market: 1.3, locality: 0.37 },
  sf: { id: 'sf', name: 'San Francisco Bay Area', icon: '🌉', type: 'High-cost metro', state: 'CA', col: 1.65, market: 1.4, locality: 0.46 },
  miami: { id: 'miami', name: 'Miami, FL', icon: '🌴', type: 'Coastal metro', state: 'FL', col: 1.2, market: 1.06, locality: 0.24 },
  seattle: { id: 'seattle', name: 'Seattle, WA', icon: '🌲', type: 'High-cost metro', state: 'WA', col: 1.4, market: 1.3, locality: 0.3 },
  denver: { id: 'denver', name: 'Denver, CO', icon: '⛰️', type: 'Mountain metro', state: 'CO', col: 1.15, market: 1.12, locality: 0.3 },
  gunnison: { id: 'gunnison', name: 'Gunnison, CO', icon: '🦌', type: 'Rural', state: 'CO', col: 0.85, market: 0.88, locality: 0.17 },
};

/** Military installations by branch, for PCS moves. */
export const BASES = {
  army: [['sunbelt', 'Fort Cavazos'], ['denver', 'Fort Carson'], ['seattle', 'Joint Base Lewis-McChord'], ['dc', 'Fort Myer']],
  marines: [['miami', 'MCAS Beaufort detachment'], ['sf', 'Camp Pendleton'], ['dc', 'Marine Barracks Washington']],
  navy: [['miami', 'NAS Jacksonville'], ['seattle', 'Naval Base Kitsap'], ['sf', 'Naval Base San Diego'], ['dc', 'Naval Support Activity Washington']],
  airforce: [['rural', 'Malmstrom AFB'], ['denver', 'Buckley SFB'], ['sunbelt', 'JBSA-Lackland'], ['dc', 'Joint Base Andrews']],
  coastguard: [['miami', 'Sector Miami'], ['seattle', 'Sector Puget Sound'], ['nyc', 'Sector New York'], ['sf', 'Sector San Francisco']],
  guard: [],
  usphs: [['dc', 'HHS headquarters, Rockville'], ['rural', 'Indian Health Service, Billings Area'], ['denver', 'Indian Health Service, Navajo Area'], ['seattle', 'FDA Pacific Region'], ['sunbelt', 'Federal Medical Center, Fort Worth']],
  noaa: [['seattle', 'Marine Operations Center–Pacific'], ['miami', 'Aircraft Operations Center, Lakeland'], ['dc', 'NOAA headquarters, Silver Spring'], ['sf', 'NOAA Ship Reuben Lasker, San Diego']],
};

export const MOVE_COST = 3500;

export const regionOf = (state) => REGIONS[state.character.regionId] ?? REGIONS.midcity;
export const stateIdOf = (state) => regionOf(state).state;
export const stateOf = (state) => STATES[stateIdOf(state)];
export const regionsInState = (stateId) => Object.values(REGIONS).filter((r) => r.state === stateId);

/** Years you've been a resident of your current state (in-state tuition, candidacy). */
export const residencyYears = (state) => state.character.age - (state.character.residencySince ?? 0);

/** The one place a relocation happens. */
export function changeRegion(ctx, regionId, reason, { voluntary = false } = {}) {
  const { state } = ctx;
  const from = state.character.regionId;
  if (!REGIONS[regionId] || from === regionId) return false;
  const fromState = REGIONS[from]?.state;
  state.character.regionId = regionId;
  if (REGIONS[regionId].state !== fromState) state.character.residencySince = state.character.age;
  ctx.log(`${reason ? `${reason} ` : ''}You relocated to ${REGIONS[regionId].name}.`, REGIONS[regionId].icon, 'milestone');
  ctx.emit('region:changed', { from, to: regionId, fromState, toState: REGIONS[regionId].state, voluntary });
  return true;
}

function completeMove(ctx, regionId) {
  const { state } = ctx;
  const region = REGIONS[regionId];
  if (!ctx.spend(MOVE_COST, 'Moving costs', { credit: true })) {
    ctx.toast(`Moving costs $${MOVE_COST.toLocaleString()} — more than your cash and credit.`, 'warn');
    return false;
  }
  const job = state.career.job;
  if (job && !job.remote) ctx.emit('career:resign', { reason: `Moved to ${region.name}` });
  changeRegion(ctx, regionId, 'You packed up the truck.', { voluntary: true });
  ctx.toast(`Moved to ${region.name}`, 'good');
  ctx.stat('stress', 6);
}

export const Relocation = {
  id: 'region',
  order: 4,

  init(state) {
    state.character.regionId ??= 'midcity';
    state.character.residencySince ??= 0;
  },

  setup(engine) {
    // Employers with duty stations, PCS orders and transfers relocate you.
    engine.bus.on('region:relocate', ({ ctx, regionId, reason }) => changeRegion(ctx, regionId, reason));
  },

  actions: {
    move(ctx, regionId) {
      const { state } = ctx;
      if (!REGIONS[regionId] || state.character.regionId === regionId) return;
      if (state.character.age < 18) return ctx.toast('You can move out at 18.', 'warn');
      if (state.military.service?.component === 'active') return ctx.toast('The military decides where you live (PCS orders).', 'warn');
      const home = state.housing.properties.find((p) => p.use === 'primary');
      if (home) {
        ctx.prompt({
          type: 'region.homeDecision',
          icon: '🏡',
          title: 'What About Your Home?',
          text: `You own your home in ${REGIONS[home.regionId].name} (worth ~$${Math.round(home.value).toLocaleString()}).`,
          options: [
            { id: 'sell', label: '🪧 Sell it before you go', hint: 'Agent commission + closing costs' },
            { id: 'rent', label: '🔑 Keep it and rent it out', hint: 'Landlord from afar' },
            { id: 'vacant', label: '🚪 Keep it empty', hint: 'Pay the carrying costs' },
            { id: 'cancel', label: '↩️ Stay put' },
          ],
          data: { regionId },
        });
        return;
      }
      completeMove(ctx, regionId);
    },
  },

  resolvers: {
    homeDecision(ctx, data, optionId) {
      if (optionId === 'cancel') return;
      // Selling raises the money; keeping the house means paying the movers from cash or credit.
      if (optionId !== 'sell' && !canAfford(ctx.state, MOVE_COST)) return ctx.toast(`Moving costs $${MOVE_COST.toLocaleString()} — more than your cash and credit.`, 'warn');
      ctx.emit('housing:leavingPrimary', { decision: optionId });
      completeMove(ctx, data.regionId);
    },
  },
};
