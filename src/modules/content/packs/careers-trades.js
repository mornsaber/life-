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
import { L } from '../../career/Ladder.js';

const careers = {
  carpentry: {
    id: 'carpentry', name: 'Union Carpentry', icon: '🪚', sector: 'private', payMultiplier: 0.9, promotionOdds: 0.7, minAge: 18, sizes: { small: 3, medium: 3, large: 2 }, background: 'lenient',
    union: { chance: 0.6, name: 'United Brotherhood of Carpenters Local 1', strike: true },
    benefits: { unionPension: 'union' },
    employers: ['Summit Builders', 'Keystone General Contractors', 'Riverbend Construction', 'Metro Framing Co.'],
    cyclical: 1.8, hazard: { injury: 0.04, death: 0.0001, cause: 'Construction accident' },
    ladder: [
      ['apprentice', 'Apprentice Carpenter', 2, { years: 4 }],
      ['journeyman', 'Journeyman Carpenter', 4, { req: { credentials: ['journeymanCarpenter'] } }],
      ['finish', 'Finish Carpenter', 5, { track: 'ic' }],
      ['foreman', 'Carpentry Foreman', 5, { track: 'mgmt', abilities: ['supervise'], reports: 10 }],
      ['superintendent', 'Construction Superintendent', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 80 }],
      ['pm', 'Construction Project Manager', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'sign'], reports: 200 }],
    ],
  },
  ironworking: {
    id: 'ironworking', name: 'Ironworking', icon: '🏗️', sector: 'private', payMultiplier: 1.0, promotionOdds: 0.7, minAge: 18, sizes: { medium: 3, large: 3, enterprise: 1 }, background: 'lenient',
    union: { chance: 0.7, name: 'Iron Workers Local 40', strike: true },
    benefits: { unionPension: 'union' },
    employers: ['Skyline Steel Erectors', 'Bridgeworks Ironworkers', 'Atlas Structural', 'Harbor Steel'],
    cyclical: 1.8, hazard: { injury: 0.05, death: 0.0004, cause: 'Fell from a steel structure' },
    ladder: [
      ['apprentice', 'Apprentice Ironworker', 2, { years: 3 }],
      ['journeyman', 'Journeyman Ironworker', 5, { req: { credentials: ['ironworkerCard'] } }],
      ['connector', 'Connector (High Steel)', 6, { track: 'ic', req: { fitness: 55 } }],
      ['foreman', 'Ironworker Foreman', 6, { track: 'mgmt', abilities: ['supervise'], reports: 12 }],
      ['generalForeman', 'General Foreman', 7, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 60 }],
    ],
  },
  craneOperator: {
    id: 'craneOperator', name: 'Crane & Heavy Equipment', icon: '🏗️', sector: 'private', payMultiplier: 1.05, promotionOdds: 0.7, minAge: 18, sizes: { medium: 3, large: 3, enterprise: 1 }, background: 'standard',
    union: { chance: 0.7, name: 'Operating Engineers Local 150', strike: true },
    benefits: { unionPension: 'union' },
    employers: ['Titan Crane Rental', 'Midwest Heavy Lift', 'Coastal Crane & Rigging', 'Granite Earthmovers'],
    cyclical: 1.6, hazard: { injury: 0.02, death: 0.0002, cause: 'Crane collapse' },
    ladder: [
      ['oiler', 'Oiler / Equipment Apprentice', 2, { years: 2 }],
      ['operator', 'Crane Operator', 5, { req: { credentials: ['nccco'] } }],
      ['tower', 'Tower Crane Operator', 6, { track: 'ic', minSize: 'large' }],
      ['liftDirector', 'Lift Director', 7, { track: 'mgmt', abilities: ['supervise', 'command'], reports: 15 }],
      ['equipmentManager', 'Equipment Manager', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 60 }],
    ],
  },
  oilGas: {
    id: 'oilGas', name: 'Oil & Gas Drilling', icon: '🛢️', sector: 'private', payMultiplier: 1.15, promotionOdds: 0.65, minAge: 18, sizes: { medium: 2, large: 3, enterprise: 2 }, background: 'standard',
    employers: ['Permian Drilling Co.', 'Bakken Energy Services', 'Gulf Offshore Drilling', 'High Plains Petroleum'],
    rotation: { label: 'on 14-days-on, 14-off hitches', away: 0.5 },
    hazard: { injury: 0.05, death: 0.0003, cause: 'Drilling rig accident' },
    oil: true,
    ladder: [
      ['roustabout', 'Roustabout', 2],
      ['floorhand', 'Floorhand (Roughneck)', 3, { req: { credentials: ['h2s'] } }],
      ['derrickhand', 'Derrickhand', 4],
      ['driller', 'Driller', 5, { req: { credentials: ['wellControl'] } }],
      ['mwd', 'MWD / Directional Field Engineer', 7, { track: 'ic', req: { education: { level: 'bachelor' } } }],
      ['toolpusher', 'Toolpusher', 6, { track: 'mgmt', req: { credentials: ['wellControl'] }, abilities: ['supervise'], reports: 20 }],
      ['rigManager', 'Rig Manager', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 40 }],
      ['superintendent', 'Drilling Superintendent', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 400 }],
    ],
  },
  fishing: {
    id: 'fishing', name: 'Commercial Fishing', icon: '🎣', sector: 'private', payMultiplier: 0.75, minAge: 18, sizes: { small: 4, medium: 2 }, background: 'lenient',
    employers: ['F/V Northern Dawn', 'F/V Bering Star', 'F/V Lady Grace', 'Gulf Shrimp Partners', 'Gloucester Groundfish Co.'],
    rotation: { label: 'at sea for the season', away: 0.45 },
    hazard: { injury: 0.06, death: 0.001, cause: 'Lost at sea' },
    shares: true,
    ladder: [
      ['greenhorn', 'Greenhorn Deckhand', 2, { years: 1 }],
      ['deckhand', 'Deckhand', 3],
      ['engineer', 'Boat Engineer', 4, { track: 'ic' }],
      ['mate', 'Mate', 5, { track: 'mgmt', abilities: ['supervise'], reports: 5 }],
      ['captain', 'Captain (Skipper)', 7, { track: 'mgmt', req: { credentials: ['fishingMaster'] }, abilities: ['supervise', 'hire', 'command'], reports: 8 }],
    ],
  },
  agriculture: {
    id: 'agriculture', name: 'Farm & Ranch Work', icon: '🚜', sector: 'private', payMultiplier: 0.8, minAge: 16, sizes: { small: 4, medium: 3, large: 2 }, background: 'lenient',
    employers: ['Prairie Grain Cooperative', 'Lazy K Ranch', 'Heartland Agri Corp', 'Valley Dairy Farms'],
    hazard: { injury: 0.04, death: 0.0002, cause: 'Farm equipment accident' },
    ladder: [
      ['farmhand', 'Farmhand', 1],
      ['operator', 'Equipment Operator / Ranch Hand', 2],
      ['herdsman', 'Herdsman', 3],
      ['agronomist', 'Agronomist', 6, { track: 'ic', req: { education: { level: 'bachelor', majors: ['agriculture', 'biology', 'environmentalScience'] } } }],
      ['manager', 'Farm Manager', 5, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 15 }],
      ['operations', 'Director of Farm Operations', 7, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 120 }],
    ],
  },
};

export default { id: 'careers-trades', version: 1, careers };
