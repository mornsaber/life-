/**
 * Where you live drives cost of living, private-sector market pay,
 * public-sector locality pay, and — through its state — taxes, laws,
 * licensing and disasters.
 *
 *   col:      cost-of-living multiplier on living expenses and rents
 *   market:   private/municipal pay multiplier
 *   locality: federal locality-pay percentage (GS-style) added to base pay
 *   state:    parent state (see States.js)
 *   transit:  public-transit coverage 0–100 (bus/rail frequency and reach)
 *   fare:     monthly transit pass
 *   walkable: dense enough to live without any vehicle
 *   size:     how big local government is (city departments, county offices)
 *
 * Every relocation — a voluntary move, a PCS, a duty-station assignment, a
 * corporate transfer — goes through changeRegion(), which emits
 * `region:changed` so housing, licenses, careers and residency can react.
 */
import { canAfford } from '../../core/State.js';
import { STATES } from './States.js';
import { FOREIGN_CITIES } from '../world/Countries.js';

export const REGIONS = {
  rural: { id: 'rural', name: 'Glacier Valley, MT', icon: '🏔️', type: 'Rural', state: 'MT', col: 0.72, market: 0.86, locality: 0.17, transit: 3, fare: 0, walkable: false },
  smalltown: { id: 'smalltown', name: 'Cedar Falls, IA', icon: '🌽', type: 'Small town', state: 'IA', col: 0.82, market: 0.9, locality: 0.17, transit: 10, fare: 30, walkable: false },
  midcity: { id: 'midcity', name: 'Columbus, OH', icon: '🏙️', type: 'Mid-size city', state: 'OH', col: 0.95, market: 0.98, locality: 0.22, transit: 30, fare: 62, walkable: false },
  sunbelt: { id: 'sunbelt', name: 'Austin, TX', icon: '🌵', type: 'Sun Belt metro', state: 'TX', col: 1.05, market: 1.05, locality: 0.21, transit: 25, fare: 41, walkable: false },
  chicago: { id: 'chicago', name: 'Chicago, IL', icon: '🌬️', type: 'Major metro', state: 'IL', col: 1.15, market: 1.12, locality: 0.31, transit: 75, fare: 75, walkable: true },
  dc: { id: 'dc', name: 'Washington, D.C.', icon: '🏛️', type: 'Capital region', state: 'DC', col: 1.3, market: 1.18, locality: 0.33, transit: 80, fare: 108, walkable: true },
  nyc: { id: 'nyc', name: 'New York City', icon: '🗽', type: 'High-cost metro', state: 'NY', col: 1.55, market: 1.3, locality: 0.37, transit: 95, fare: 132, walkable: true },
  sf: { id: 'sf', name: 'San Francisco Bay Area', icon: '🌉', type: 'High-cost metro', state: 'CA', col: 1.65, market: 1.4, locality: 0.46, transit: 70, fare: 98, walkable: true },
  miami: { id: 'miami', name: 'Miami, FL', icon: '🌴', type: 'Coastal metro', state: 'FL', col: 1.2, market: 1.06, locality: 0.24, transit: 40, fare: 112, walkable: false },
  seattle: { id: 'seattle', name: 'Seattle, WA', icon: '🌲', type: 'High-cost metro', state: 'WA', col: 1.4, market: 1.3, locality: 0.3, transit: 60, fare: 99, walkable: true },
  denver: { id: 'denver', name: 'Denver, CO', icon: '⛰️', type: 'Mountain metro', state: 'CO', col: 1.15, market: 1.12, locality: 0.3, transit: 45, fare: 88, walkable: false },
  gunnison: { id: 'gunnison', name: 'Gunnison, CO', icon: '🦌', type: 'Rural', state: 'CO', col: 0.85, market: 0.88, locality: 0.17, transit: 8, fare: 0, walkable: false },
  atlanta: { id: 'atlanta', name: 'Atlanta, GA', icon: '🍑', type: 'Major metro', state: 'GA', col: 1.08, market: 1.06, locality: 0.25, transit: 35, fare: 95, walkable: false, size: 'enterprise' },
  charlotte: { id: 'charlotte', name: 'Charlotte, NC', icon: '🏦', type: 'Sun Belt metro', state: 'NC', col: 1.0, market: 1.03, locality: 0.2, transit: 20, fare: 88, walkable: false, size: 'large' },
  raleigh: { id: 'raleigh', name: 'Raleigh–Fayetteville, NC', icon: '🌳', type: 'Mid-size city', state: 'NC', col: 1.0, market: 1.03, locality: 0.21, transit: 15, fare: 0, walkable: false, size: 'large' },
  asheville: { id: 'asheville', name: 'Asheville, NC', icon: '🏞️', type: 'Small town', state: 'NC', col: 0.95, market: 0.9, locality: 0.17, transit: 10, fare: 0, walkable: false, size: 'small' },
  norfolk: { id: 'norfolk', name: 'Norfolk–Virginia Beach, VA', icon: '⚓', type: 'Coastal metro', state: 'VA', col: 1.0, market: 0.99, locality: 0.2, transit: 20, fare: 50, walkable: false, size: 'large' },
  philadelphia: { id: 'philadelphia', name: 'Philadelphia, PA', icon: '🔔', type: 'Major metro', state: 'PA', col: 1.12, market: 1.09, locality: 0.29, transit: 70, fare: 99, walkable: true, size: 'enterprise' },
  pittsburgh: { id: 'pittsburgh', name: 'Pittsburgh, PA', icon: '🌉', type: 'Mid-size city', state: 'PA', col: 0.92, market: 0.97, locality: 0.23, transit: 45, fare: 99, walkable: false, size: 'large' },
  boston: { id: 'boston', name: 'Boston, MA', icon: '🦞', type: 'High-cost metro', state: 'MA', col: 1.5, market: 1.3, locality: 0.34, transit: 75, fare: 90, walkable: true, size: 'enterprise' },
  detroit: { id: 'detroit', name: 'Detroit, MI', icon: '🚗', type: 'Major metro', state: 'MI', col: 0.9, market: 0.98, locality: 0.3, transit: 20, fare: 70, walkable: false, size: 'enterprise' },
  minneapolis: { id: 'minneapolis', name: 'Minneapolis–St. Paul, MN', icon: '❄️', type: 'Major metro', state: 'MN', col: 1.05, market: 1.07, locality: 0.27, transit: 45, fare: 76, walkable: false, size: 'large' },
  nashville: { id: 'nashville', name: 'Nashville, TN', icon: '🎸', type: 'Sun Belt metro', state: 'TN', col: 1.05, market: 1.03, locality: 0.19, transit: 15, fare: 0, walkable: false, size: 'large' },
  neworleans: { id: 'neworleans', name: 'New Orleans, LA', icon: '🎺', type: 'Coastal metro', state: 'LA', col: 0.98, market: 0.95, locality: 0.19, transit: 35, fare: 55, walkable: true, size: 'large' },
  phoenix: { id: 'phoenix', name: 'Phoenix, AZ', icon: '☀️', type: 'Sun Belt metro', state: 'AZ', col: 1.03, market: 1.02, locality: 0.22, transit: 20, fare: 64, walkable: false, size: 'enterprise' },
  lasvegas: { id: 'lasvegas', name: 'Las Vegas, NV', icon: '🎰', type: 'Sun Belt metro', state: 'NV', col: 1.0, market: 0.98, locality: 0.19, transit: 25, fare: 65, walkable: false, size: 'large' },
  elko: { id: 'elko', name: 'Elko, NV', icon: '⛏️', type: 'Rural', state: 'NV', col: 0.85, market: 0.95, locality: 0.17, transit: 2, fare: 0, walkable: false, size: 'small' },
  saltlake: { id: 'saltlake', name: 'Salt Lake City, UT', icon: '🏔️', type: 'Mountain metro', state: 'UT', col: 1.05, market: 1.04, locality: 0.21, transit: 35, fare: 90, walkable: false, size: 'large' },
  portland: { id: 'portland', name: 'Portland, OR', icon: '🌧️', type: 'High-cost metro', state: 'OR', col: 1.2, market: 1.12, locality: 0.26, transit: 50, fare: 100, walkable: true, size: 'large' },
  bend: { id: 'bend', name: 'Bend, OR', icon: '🌲', type: 'Small town', state: 'OR', col: 1.1, market: 0.95, locality: 0.17, transit: 8, fare: 0, walkable: false, size: 'small' },
  anchorage: { id: 'anchorage', name: 'Anchorage, AK', icon: '🐻', type: 'Mid-size city', state: 'AK', col: 1.2, market: 1.15, locality: 0.3, transit: 10, fare: 60, walkable: false, size: 'medium' },
  fairbanks: { id: 'fairbanks', name: 'Fairbanks, AK', icon: '🌌', type: 'Rural', state: 'AK', col: 1.15, market: 1.1, locality: 0.29, transit: 3, fare: 0, walkable: false, size: 'small' },
  honolulu: { id: 'honolulu', name: 'Honolulu, HI', icon: '🌺', type: 'High-cost metro', state: 'HI', col: 1.7, market: 1.12, locality: 0.21, transit: 45, fare: 80, walkable: false, size: 'large' },
  appalachia: { id: 'appalachia', name: 'Beckley, WV', icon: '⛰️', type: 'Rural', state: 'WV', col: 0.7, market: 0.82, locality: 0.17, transit: 3, fare: 0, walkable: false, size: 'small' },
  amarillo: { id: 'amarillo', name: 'Amarillo, TX', icon: '🐂', type: 'Small town', state: 'TX', col: 0.82, market: 0.9, locality: 0.17, transit: 8, fare: 0, walkable: false, size: 'medium' },
};

/** Military installations by branch, for PCS moves. */
export const BASES = {
  army: [['sunbelt', 'Fort Cavazos'], ['denver', 'Fort Carson'], ['seattle', 'Joint Base Lewis-McChord'], ['dc', 'Fort Myer'], ['raleigh', 'Fort Bragg'], ['honolulu', 'Schofield Barracks'], ['fairbanks', 'Fort Wainwright'], ['atlanta', 'Fort Moore']],
  marines: [['miami', 'MCAS Beaufort detachment'], ['sf', 'Camp Pendleton'], ['dc', 'Marine Barracks Washington'], ['raleigh', 'Camp Lejeune'], ['honolulu', 'MCB Hawaii'], ['phoenix', 'MCAS Yuma']],
  navy: [['miami', 'NAS Jacksonville'], ['seattle', 'Naval Base Kitsap'], ['sf', 'Naval Base San Diego'], ['dc', 'Naval Support Activity Washington'], ['norfolk', 'Naval Station Norfolk'], ['honolulu', 'Joint Base Pearl Harbor-Hickam']],
  airforce: [['rural', 'Malmstrom AFB'], ['denver', 'Buckley SFB'], ['sunbelt', 'JBSA-Lackland'], ['dc', 'Joint Base Andrews'], ['lasvegas', 'Nellis AFB'], ['phoenix', 'Luke AFB'], ['saltlake', 'Hill AFB'], ['anchorage', 'JB Elmendorf-Richardson'], ['norfolk', 'JB Langley-Eustis']],
  spaceforce: [['denver', 'Peterson Space Force Base'], ['denver', 'Schriever Space Force Base'], ['sf', 'Vandenberg Space Force Base'], ['miami', 'Patrick Space Force Base'], ['dc', 'the Pentagon (Space Staff)']],
  coastguard: [['miami', 'Sector Miami'], ['seattle', 'Sector Puget Sound'], ['nyc', 'Sector New York'], ['sf', 'Sector San Francisco'], ['norfolk', 'Sector Virginia'], ['neworleans', 'Sector New Orleans'], ['boston', 'Sector Boston'], ['anchorage', 'Sector Anchorage'], ['honolulu', 'Sector Honolulu']],
  guard: [],
  usphs: [['dc', 'HHS headquarters, Rockville'], ['rural', 'Indian Health Service, Billings Area'], ['denver', 'Indian Health Service, Navajo Area'], ['seattle', 'FDA Pacific Region'], ['sunbelt', 'Federal Medical Center, Fort Worth']],
  noaa: [['seattle', 'Marine Operations Center–Pacific'], ['miami', 'Aircraft Operations Center, Lakeland'], ['dc', 'NOAA headquarters, Silver Spring'], ['sf', 'NOAA Ship Reuben Lasker, San Diego']],
};

export const MOVE_COST = 3500;

// Foreign cities resolve by id but stay out of US iteration (seeds, lists and picks are unchanged).
for (const [id, r] of Object.entries(FOREIGN_CITIES)) Object.defineProperty(REGIONS, id, { value: r, enumerable: false });

/** The cities of a country, in order (the US list is exactly Object.values(REGIONS)). */
export const regionsIn = (countryId = 'US') => (countryId === 'US' ? Object.values(REGIONS) : Object.values(FOREIGN_CITIES).filter((r) => r.country === countryId));
/** The country of the place you live. */
export const countryIdOf = (state) => state?.character?.countryId ?? 'US';
/** Cities in your country. */
export const regionsHere = (state) => regionsIn(countryIdOf(state));

export const regionOf = (state) => REGIONS[state.character.regionId] ?? REGIONS.midcity;
export const stateIdOf = (state) => regionOf(state).state;
export const stateOf = (state) => STATES[stateIdOf(state)];
export const regionsInState = (stateId) => regionsIn(STATES[stateId]?.country ?? 'US').filter((r) => r.state === stateId);

/** Years you've been a resident of your current state (in-state tuition, candidacy). */
export const residencyYears = (state) => state.character.age - (state.character.residencySince ?? 0);

/** The one place a relocation happens. */
export function changeRegion(ctx, regionId, reason, { voluntary = false } = {}) {
  const { state } = ctx;
  const from = state.character.regionId;
  if (!REGIONS[regionId] || from === regionId) return false;
  // Moving between countries (visas, residency, credential recognition) isn't modeled yet.
  if ((REGIONS[regionId].country ?? 'US') !== countryIdOf(state)) return false;
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
  if (!region || (region.country ?? 'US') !== countryIdOf(state)) return ctx.toast('Moving to another country isn\'t possible yet.', 'warn');
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
