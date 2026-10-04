/**
 * The regional transit authority's board of directors: appointed by the
 * mayor and county, unpaid but for a stipend, and responsible for fares,
 * service and big capital projects. Decisions change transit service in
 * your region for everyone.
 *
 * state.civic.transitBoard = { regionId, years, chair } | null
 * state.civic.local[regionId].transitBoost: extra transit coverage from board decisions
 */
import { clamp } from '../../core/Random.js';
import { yearsInProfession } from '../../core/State.js';
import { regionOf } from '../life/Regions.js';

export const BOARD_TERM = 4;
export const BOARD_STIPEND = 12000;

export function transitBoardEligibility(state) {
  const region = regionOf(state);
  if (state.character.age < 25) return { ok: false, reason: 'Must be 25+' };
  if ((region.transit ?? 0) < 20) return { ok: false, reason: 'There\'s no transit authority here' };
  if (state.civic.transitBoard) return { ok: false, reason: 'Already on the board' };
  const qualified = state.politics.recognition >= 30 || state.politics.office || yearsInProfession(state, ['transit', 'transitMaintenance', 'transitPolice', 'planning', 'dot', 'engineering', 'municipalAdmin']) >= 5;
  if (!qualified) return { ok: false, reason: 'Needs local standing (30+ recognition), an office, or 5 yrs in transit, planning or engineering' };
  return { ok: true };
}

export const BOARD_DECISIONS = [
  { title: 'Fare Increase', text: 'Staff propose raising the base fare 25 cents to close a deficit.', options: [
    { id: 'raise', label: '💵 Raise fares', boost: 0, levy: 0, recognition: -1 },
    { id: 'cut', label: '✂️ Cut weekend service instead', boost: -4, recognition: -2 },
    { id: 'levy', label: '🗳️ Ask voters for a dedicated levy', boost: 3, levy: 40, recognition: 3 },
  ] },
  { title: 'Rail Extension', text: 'A $2 billion light-rail extension to the suburbs needs a vote to apply for federal funding.', options: [
    { id: 'build', label: '🚈 Vote to build it', boost: 8, levy: 60, recognition: 4 },
    { id: 'brt', label: '🚌 Bus rapid transit instead — a third of the cost', boost: 4, levy: 20, recognition: 2 },
    { id: 'no', label: '🛑 Vote no', boost: 0, recognition: -1 },
  ] },
  { title: 'Safety on Trains', text: 'A string of assaults on late-night trains has riders scared.', options: [
    { id: 'police', label: '🚓 More transit police', boost: 1, levy: 20, recognition: 2 },
    { id: 'ambassadors', label: '🦺 Unarmed safety ambassadors and outreach workers', boost: 2, levy: 15, recognition: 2 },
    { id: 'cameras', label: '📹 Cameras and better lighting', boost: 1, levy: 5, recognition: 1 },
  ] },
  { title: 'Operator Shortage', text: 'Buses are skipping trips because there aren\'t enough drivers.', options: [
    { id: 'pay', label: '💵 Raise operator pay', boost: 4, levy: 30, recognition: 2 },
    { id: 'cut', label: '📉 Trim the schedule to match staffing', boost: -3, recognition: -1 },
  ] },
];

export function boardTick(ctx) {
  const { state, rng } = ctx;
  const b = state.civic.transitBoard;
  if (!b) return;
  if (b.regionId !== state.character.regionId) {
    state.civic.transitBoard = null;
    return ctx.log('You moved away and resigned from the transit board.', '🚇');
  }
  b.years += 1;
  ctx.earn(BOARD_STIPEND, 'Transit board stipend', { wage: true });
  state.politics.recognition = Math.min(100, state.politics.recognition + (b.chair ? 3 : 1));
  if (!b.chair && b.years >= 2 && rng.chance(0.3)) {
    b.chair = true;
    ctx.log('Your fellow directors elected you chair of the transit board.', '🏅', 'good');
  }
  if (b.years >= BOARD_TERM && b.years % BOARD_TERM === 0 && !rng.chance(0.6)) {
    state.civic.transitBoard = null;
    return ctx.log('Your term on the transit board ended and you weren\'t reappointed.', '🚇');
  }
  if (rng.chance(0.6) && !state.prompts.some((p) => p.type === 'civic.transitDecision')) {
    const i = rng.int(0, BOARD_DECISIONS.length - 1);
    const d = BOARD_DECISIONS[i];
    ctx.prompt({ type: 'civic.transitDecision', icon: '🚇', title: `Transit Board: ${d.title}`, text: d.text, options: d.options.map((o) => ({ id: o.id, label: o.label })), data: { index: i } });
  }
}

export function resolveBoardDecision(ctx, data, optionId, local) {
  const o = BOARD_DECISIONS[data.index]?.options.find((x) => x.id === optionId);
  if (!o) return;
  local.transitBoost = clamp((local.transitBoost ?? 0) + (o.boost ?? 0), -15, 25);
  local.levy = Math.max(0, local.levy + (o.levy ?? 0));
  ctx.state.politics.recognition = clamp(ctx.state.politics.recognition + (o.recognition ?? 0), 0, 100);
  ctx.log(`Transit board: ${o.label.replace(/^\S+ /, '')}.`, '🚇');
}
