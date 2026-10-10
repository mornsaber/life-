/**
 * Hard-hat careers: union construction (carpenters, ironworkers, crane
 * operators), oil and gas drilling, commercial fishing and farm work.
 *
 *  - hazard { injury, death, cause } — yearly odds of getting hurt or killed
 *    on the job (ironworkers and fishermen have some of the highest fatality
 *    rates of any occupation).
 *  - cyclical — multiplies recession layoff risk (construction stops first).
 *  - Oil and gas follows its own boom-and-bust oil price: overtime and
 *    bonuses in a boom, mass layoffs in a bust.
 *  - Fishing crews are paid in shares of the catch: a great season pays a
 *    year's wages in months; a bad one barely covers the trip.
 *
 * state.oil = { price (index, 1 = normal), phase: 'boom'|'normal'|'bust' }
 */
import { L } from './Ladder.js';
import { unemploymentBenefit, severancePay } from '../world/CountryLaw.js';
import { Random } from '../../core/Random.js';
import { leaveJob } from './CareerEngine.js';
import { JUSTICE_EVENTS, INCIDENT_ICONS } from './JusticeCareers.js';

export const TRADE_PROFESSIONS = {
  carpentry: {
    id: 'carpentry', name: 'Union Carpentry', icon: '🪚', sector: 'private', payMultiplier: 0.9, promotionOdds: 0.7, minAge: 18, sizes: { small: 3, medium: 3, large: 2 }, background: 'lenient',
    union: { chance: 0.6, name: 'United Brotherhood of Carpenters Local 1', strike: true },
    benefits: { unionPension: 'union' },
    employers: ['Summit Builders', 'Keystone General Contractors', 'Riverbend Construction', 'Metro Framing Co.'],
    cyclical: 1.8, hazard: { injury: 0.04, death: 0.0001, cause: 'Construction accident' },
    levels: [
      L('apprentice', 'Apprentice Carpenter', 2, { years: 4 }),
      L('journeyman', 'Journeyman Carpenter', 4, { req: { credentials: ['journeymanCarpenter'] } }),
      L('finish', 'Finish Carpenter', 5, { track: 'ic' }),
      L('foreman', 'Carpentry Foreman', 5, { track: 'mgmt', abilities: ['supervise'], reports: 10 }),
      L('superintendent', 'Construction Superintendent', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 80 }),
      L('pm', 'Construction Project Manager', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'sign'], reports: 200 }),
    ],
  },
  ironworking: {
    id: 'ironworking', name: 'Ironworking', icon: '🏗️', sector: 'private', payMultiplier: 1.0, promotionOdds: 0.7, minAge: 18, sizes: { medium: 3, large: 3, enterprise: 1 }, background: 'lenient',
    union: { chance: 0.7, name: 'Iron Workers Local 40', strike: true },
    benefits: { unionPension: 'union' },
    employers: ['Skyline Steel Erectors', 'Bridgeworks Ironworkers', 'Atlas Structural', 'Harbor Steel'],
    cyclical: 1.8, hazard: { injury: 0.05, death: 0.0004, cause: 'Fell from a steel structure' },
    levels: [
      L('apprentice', 'Apprentice Ironworker', 2, { years: 3 }),
      L('journeyman', 'Journeyman Ironworker', 5, { req: { credentials: ['ironworkerCard'] } }),
      L('connector', 'Connector (High Steel)', 6, { track: 'ic', req: { fitness: 55 } }),
      L('foreman', 'Ironworker Foreman', 6, { track: 'mgmt', abilities: ['supervise'], reports: 12 }),
      L('generalForeman', 'General Foreman', 7, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 60 }),
    ],
  },
  craneOperator: {
    id: 'craneOperator', name: 'Crane & Heavy Equipment', icon: '🏗️', sector: 'private', payMultiplier: 1.05, promotionOdds: 0.7, minAge: 18, sizes: { medium: 3, large: 3, enterprise: 1 }, background: 'standard',
    union: { chance: 0.7, name: 'Operating Engineers Local 150', strike: true },
    benefits: { unionPension: 'union' },
    employers: ['Titan Crane Rental', 'Midwest Heavy Lift', 'Coastal Crane & Rigging', 'Granite Earthmovers'],
    cyclical: 1.6, hazard: { injury: 0.02, death: 0.0002, cause: 'Crane collapse' },
    levels: [
      L('oiler', 'Oiler / Equipment Apprentice', 2, { years: 2 }),
      L('operator', 'Crane Operator', 5, { req: { credentials: ['nccco'] } }),
      L('tower', 'Tower Crane Operator', 6, { track: 'ic', minSize: 'large' }),
      L('liftDirector', 'Lift Director', 7, { track: 'mgmt', abilities: ['supervise', 'command'], reports: 15 }),
      L('equipmentManager', 'Equipment Manager', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 60 }),
    ],
  },
  oilGas: {
    id: 'oilGas', name: 'Oil & Gas Drilling', icon: '🛢️', sector: 'private', payMultiplier: 1.15, promotionOdds: 0.65, minAge: 18, sizes: { medium: 2, large: 3, enterprise: 2 }, background: 'standard',
    employers: ['Permian Drilling Co.', 'Bakken Energy Services', 'Gulf Offshore Drilling', 'High Plains Petroleum'],
    rotation: { label: 'on 14-days-on, 14-off hitches', away: 0.5 },
    hazard: { injury: 0.05, death: 0.0003, cause: 'Drilling rig accident' },
    oil: true,
    levels: [
      L('roustabout', 'Roustabout', 2),
      L('floorhand', 'Floorhand (Roughneck)', 3, { req: { credentials: ['h2s'] } }),
      L('derrickhand', 'Derrickhand', 4),
      L('driller', 'Driller', 5, { req: { credentials: ['wellControl'] } }),
      L('mwd', 'MWD / Directional Field Engineer', 7, { track: 'ic', req: { education: { level: 'bachelor' } } }),
      L('toolpusher', 'Toolpusher', 6, { track: 'mgmt', req: { credentials: ['wellControl'] }, abilities: ['supervise'], reports: 20 }),
      L('rigManager', 'Rig Manager', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 40 }),
      L('superintendent', 'Drilling Superintendent', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 400 }),
    ],
  },
  fishing: {
    id: 'fishing', name: 'Commercial Fishing', icon: '🎣', sector: 'private', payMultiplier: 0.75, minAge: 18, sizes: { small: 4, medium: 2 }, background: 'lenient',
    employers: ['F/V Northern Dawn', 'F/V Bering Star', 'F/V Lady Grace', 'Gulf Shrimp Partners', 'Gloucester Groundfish Co.'],
    rotation: { label: 'at sea for the season', away: 0.45 },
    hazard: { injury: 0.06, death: 0.001, cause: 'Lost at sea' },
    shares: true,
    levels: [
      L('greenhorn', 'Greenhorn Deckhand', 2, { years: 1 }),
      L('deckhand', 'Deckhand', 3),
      L('engineer', 'Boat Engineer', 4, { track: 'ic' }),
      L('mate', 'Mate', 5, { track: 'mgmt', abilities: ['supervise'], reports: 5 }),
      L('captain', 'Captain (Skipper)', 7, { track: 'mgmt', req: { credentials: ['fishingMaster'] }, abilities: ['supervise', 'hire', 'command'], reports: 8 }),
    ],
  },
  agriculture: {
    id: 'agriculture', name: 'Farm & Ranch Work', icon: '🚜', sector: 'private', payMultiplier: 0.8, minAge: 16, sizes: { small: 4, medium: 3, large: 2 }, background: 'lenient',
    employers: ['Prairie Grain Cooperative', 'Lazy K Ranch', 'Heartland Agri Corp', 'Valley Dairy Farms'],
    hazard: { injury: 0.04, death: 0.0002, cause: 'Farm equipment accident' },
    levels: [
      L('farmhand', 'Farmhand', 1),
      L('operator', 'Equipment Operator / Ranch Hand', 2),
      L('herdsman', 'Herdsman', 3),
      L('agronomist', 'Agronomist', 6, { track: 'ic', req: { education: { level: 'bachelor', majors: ['agriculture', 'biology', 'environmentalScience'] } } }),
      L('manager', 'Farm Manager', 5, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 15 }),
      L('operations', 'Director of Farm Operations', 7, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 120 }),
    ],
  },
};

export const TRADE_EVENTS = {
  carpentry: [
    { title: 'Unsafe Scaffold', text: 'The scaffolding on the job is missing guardrails. The foreman says to work anyway.', options: [
      { id: 'refuse', label: '🛑 Refuse and call the union safety rep', perf: -2 },
      { id: 'work', label: '🪜 Work carefully', perf: 3, risk: 0.15 },
    ] },
  ],
  ironworking: [
    { title: 'Wind on the Iron', text: 'Gusts are hitting 30 mph forty stories up.', options: [
      { id: 'down', label: '⬇️ Call it and come down', perf: 1 },
      { id: 'finish', label: '🔩 Finish bolting the beam', perf: 5, risk: 0.2 },
    ] },
  ],
  craneOperator: [
    { title: 'Overloaded Pick', text: 'The rigging crew says the load is 8 tons. Your load chart says it\'s heavier.', options: [
      { id: 'stop', label: '🛑 Stop the lift and reweigh', perf: 5 },
      { id: 'pick', label: '🏗️ Make the pick', perf: 2, risk: 0.2 },
    ] },
  ],
  oilGas: [
    { title: 'Kick!', text: 'Gas is coming up the well. The driller yells for the blowout preventer.', options: [
      { id: 'shut', label: '🛑 Shut in the well by the book', perf: 7, risk: 0.1 },
      { id: 'run', label: '🏃 Get off the rig floor', perf: -3 },
    ] },
  ],
  fishing: [
    { title: 'Storm Coming', text: 'A 40-knot gale is forecast. You\'re 60% to your quota and the season closes in three days.', options: [
      { id: 'fish', label: '🎣 Keep fishing through it', perf: 7, risk: 0.25 },
      { id: 'run', label: '⚓ Run for the harbor', perf: -2 },
    ] },
  ],
  agriculture: [
    { title: 'Harvest Crunch', text: 'Rain is coming in two days and half the field is still standing.', options: [
      { id: 'night', label: '🌙 Run the combine all night', perf: 6, stress: 6, risk: 0.05 },
      { id: 'wait', label: '⏳ Get what you can and wait out the rain', perf: 1 },
    ] },
  ],
};

Object.assign(JUSTICE_EVENTS, TRADE_EVENTS);
for (const [id, p] of Object.entries(TRADE_PROFESSIONS)) INCIDENT_ICONS[id] = p.icon;

/** Oil price walk: mean-reverting with occasional shocks. */
export function oilTick(state, rng) {
  const o = state.oil;
  const shock = rng.chance(0.08) ? rng.pick([0.5, 1.7]) : 1;
  o.price = Math.round(Math.max(0.3, Math.min(2.5, (o.price + (1 - o.price) * 0.3) * Math.exp(rng.float(-0.25, 0.25)) * shock)) * 100) / 100;
  o.phase = o.price >= 1.3 ? 'boom' : o.price <= 0.7 ? 'bust' : 'normal';
  return o.phase;
}

export const TradesModule = {
  id: 'trades',
  order: 30.95,

  init(state, engineRng) {
    state.oil ??= { price: 1, phase: 'normal', seed: ((engineRng?.seed ?? 1) ^ 0x011) >>> 0 };
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const prev = state.oil.phase;
    // The world oil market runs on its own random stream, so it doesn't reshuffle every other roll in the life.
    state.oil.seed = ((state.oil.seed ?? 1) * 1664525 + 1013904223) >>> 0;
    const phase = oilTick(state, new Random(state.oil.seed));
    if (phase !== prev && phase !== 'normal') ctx.log(phase === 'boom' ? `📰 Oil prices spiked (index ${state.oil.price}). Drilling rigs are hiring everyone they can find.` : `📰 Oil prices crashed (index ${state.oil.price}). Rigs are stacking up idle across the oil patch.`, '🛢️');

    const job = state.career.job;
    const profession = job && TRADE_PROFESSIONS[job.professionId];
    if (!profession || !job.paidThisYear || state.legal.incarceration) return;

    // Danger.
    const h = profession.hazard;
    if (h && rng.chance(h.death)) {
      ctx.log(`${h.cause}. Your crew carried your coffin.`, '🕯️', 'death');
      ctx.die(h.cause);
      return;
    }
    if (h && rng.chance(h.injury)) {
      ctx.stat('health', -rng.int(8, 25));
      if (rng.chance(0.4)) ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(25, 60) });
      ctx.log(rng.pick(['You were hurt on the job and spent weeks on workers\' comp.', 'A dropped load clipped you. Workers\' comp covered the bills.', 'You tore your shoulder and missed half a season.']), '🩹', 'bad');
    }

    // Oil patch boom and bust.
    if (profession.oil) {
      if (state.oil.phase === 'boom') {
        const bonus = Math.round(job.salary * rng.float(0.15, 0.35) / 100) * 100;
        ctx.earn(bonus, 'Oilfield overtime & boom bonuses', { wage: true });
      } else if (state.oil.phase === 'bust' && rng.chance(job.yearsAtEmployer < 5 ? 0.35 : 0.12)) {
        leaveJob(ctx, 'Laid off in the oil bust when the rig was stacked');
        { const ui = unemploymentBenefit(ctx.state.character.countryId, job.salary); ctx.earn(ui.amount, ui.name); }
        ctx.stat('happiness', -8);
        return;
      }
    }
    // Fishing shares: the season decides your pay.
    if (profession.shares) {
      // Base pay is the guaranteed day rate; the crew share on top swings with the season.
      const season = rng.pick([['a record season', 1.0], ['a good season', 0.5], ['an average season', 0.25], ['a poor season', 0.05], ['a bust — the fish never showed', 0]]);
      const share = Math.round(job.salary * season[1] / 100) * 100;
      if (share) ctx.earn(share, 'Crew share of the catch', { wage: true });
      if (!season[1]) ctx.stat('happiness', -4);
      ctx.log(`Fishing: ${season[0]}${share ? ` — a $${share.toLocaleString()} crew share` : ''}.`, '🎣', season[1] >= 0.25 ? 'good' : 'warn');
    }
  },
};
