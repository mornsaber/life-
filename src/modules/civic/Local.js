/**
 * Local government you can vote on: ballot measures that raise or cut
 * property taxes, add flat levies, and fund (or starve) public services in
 * your region. Results stick to the region, so moving away leaves them
 * behind — and moving back finds them still in force.
 *
 * state.civic.local[regionId] = { taxMult, levy, services, safety, passed: [measureId], history: [{ id, age, passed, yes }] }
 *
 *   taxMult   multiplier on the state's property-tax rate for homes here
 *   levy      flat yearly charge per household (sales-tax and parcel levies)
 *   services  0–100: schools, parks, transit, libraries (50 = typical)
 *   safety    0–100: police, fire and EMS staffing (50 = typical)
 */
import { clamp } from '../../core/Random.js';
import { REFERENDUMS } from '../world/CountryLaw.js';

export const MEASURES = {
  schoolBond: { name: 'School construction bond', icon: '🏫', support: 0.56, effects: { taxMult: 0.06, services: 7 }, pitch: 'Rebuild aging schools; paid for with a property-tax increase.' },
  transitTax: { name: 'Half-cent transit sales tax', icon: '🚇', support: 0.5, effects: { levy: 260, services: 5 }, pitch: 'More buses and rail; everyone pays a little more at the register.', unless: 'transitTax' },
  safetyLevy: { name: 'Public safety levy', icon: '🚓', support: 0.55, effects: { taxMult: 0.04, safety: 9 }, pitch: 'Hire more police officers, firefighters and paramedics.' },
  parksBond: { name: 'Parks & libraries bond', icon: '🌳', support: 0.53, effects: { taxMult: 0.03, services: 4 }, pitch: 'New trails, a renovated library, longer hours.' },
  housingBond: { name: 'Affordable housing bond', icon: '🏘️', support: 0.5, effects: { taxMult: 0.03, services: 3 }, pitch: 'Build subsidized housing for working families and seniors.' },
  taxCap: { name: 'Property tax cap', icon: '✂️', support: 0.52, effects: { taxMult: -0.1, services: -6, safety: -3 }, pitch: 'Cap property taxes; the city will have to cut somewhere.' },
  repealTransit: { name: 'Repeal the transit tax', icon: '🛑', support: 0.45, effects: { levy: -260, services: -5 }, pitch: 'Scrap the half-cent transit tax.', requires: 'transitTax' },
  fireMerger: { name: 'Fire district consolidation', icon: '🚒', support: 0.48, effects: { levy: -80, safety: 2 }, pitch: 'Merge three small fire districts to save money.' },
  libraryLevy: { name: 'Library operating levy', icon: '📚', support: 0.58, effects: { levy: 60, services: 2 }, pitch: 'Keep branch libraries open on weekends.' },
};

// Each country's referendums, out of sight of the US list.
for (const [cc, list] of Object.entries(REFERENDUMS)) for (const [id, m] of Object.entries(list)) Object.defineProperty(MEASURES, `${cc}_${id}`, { value: { ...m, referendum: true }, enumerable: false });
/** The votes that can come up where you live. */
const measurePool = (state) => {
  const cc = state.character.countryId;
  if (!cc) return Object.entries(MEASURES);
  return Object.keys(REFERENDUMS[cc] ?? {}).map((id) => [`${cc}_${id}`, MEASURES[`${cc}_${id}`]]);
};

export function localPolicy(state, regionId = state.character.regionId) {
  state.civic.local[regionId] ??= { taxMult: 1, levy: 0, services: 50, safety: 50, passed: [], history: [] };
  return state.civic.local[regionId];
}

/** Read-only view (no state mutation) for pure helpers like carrying costs. */
export function localTaxMult(state, regionId) {
  return state?.civic?.local?.[regionId]?.taxMult ?? 1;
}

/** Measures that could qualify for the ballot here this year. */
export function eligibleMeasures(state) {
  const local = localPolicy(state);
  return measurePool(state).filter(([id, m]) => {
    if (m.requires && !local.passed.includes(m.requires)) return false;
    if (m.unless && local.passed.includes(m.unless)) return false;
    // The same measure doesn't come back within 4 years of the last vote.
    const last = local.history.filter((h) => h.id === id).at(-1);
    return !last || state.character.age - last.age >= 4;
  }).map(([id]) => id);
}

/** Apply a passed measure to the region. */
export function enact(state, measureId) {
  const local = localPolicy(state);
  const e = MEASURES[measureId].effects;
  local.taxMult = Math.round(clamp(local.taxMult + (e.taxMult ?? 0), 0.7, 1.6) * 100) / 100;
  local.levy = Math.max(0, local.levy + (e.levy ?? 0));
  local.services = Math.round(clamp(local.services + (e.services ?? 0), 0, 100));
  local.safety = Math.round(clamp(local.safety + (e.safety ?? 0), 0, 100));
  if (measureId === 'repealTransit') local.passed = local.passed.filter((id) => id !== 'transitTax');
  else local.passed.push(measureId);
}

/** How you (and your organizing) move the vote. Positive pushes yes. */
export function playerPush(state, stance) {
  if (stance === 'yes' || stance === 'no') return 0;
  const sign = stance === 'campaignYes' ? 1 : -1;
  const influence = state.civic.activism?.influence ?? 0;
  const office = state.politics?.office ? 0.03 : 0;
  return sign * (0.015 + influence * 0.0007 + office);
}
