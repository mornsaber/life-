/**
 * Transportation careers beyond trucking: airline pilots (the aviation
 * profession in JobTrees), corporate/cargo/charter flying, flight attendants,
 * the merchant marine and cruise-ship crews. Their year-to-year life —
 * seniority bids, the FAA medical, the age-65 rule, furloughs, rotations at
 * sea — lives in Transport.js.
 *
 * Extra profession fields used here:
 *   rotation   { label, away } — share of the year away from home (strains relationships)
 *   seniority  pay, schedules and furlough order follow years at the airline/company
 *   furlough   recession furlough with recall rights instead of a plain layoff
 *   tips       [min, max] yearly gratuities at service levels
 * Level fields:
 *   part121    airline flying: FAA age-65 limit
 *   flying     a pilot seat: needs a current first-class medical
 */
import { L } from '../../career/Ladder.js';

const careers = {
  charterAviation: {
    id: 'charterAviation', name: 'Corporate, Cargo & Charter Flying', icon: '🛩️', sector: 'private', payMultiplier: 1.1, minAge: 18,
    sizes: { small: 4, medium: 3, large: 2, enterprise: 1 }, background: 'strict',
    union: { chance: 0.3, name: 'Teamsters Airline Division', strike: true },
    employers: ['Summit Air Charter', 'Blue Ridge Aerial Services', 'NightHawk Express Cargo', 'Meridian Executive Jets', 'Prairie Ag Aviation'],
    flightHoursPerYear: 500, seniority: true, furlough: true,
    ladder: [
      ['agPilot', 'Banner Tow & Tour Pilot', 2, { req: { credentials: ['commercialPilot'] }, flying: true }],
      ['charterFo', 'Charter First Officer (Part 135)', 3, { entry: true, req: { credentials: ['commercialPilot', 'instrumentRating'] }, flying: true }],
      ['charterCaptain', 'Charter Captain', 5, { req: { credentials: ['atp'] }, flying: true }],
      ['corporatePilot', 'Corporate Jet Captain', 6, { track: 'ic', minSize: 'medium', req: { credentials: ['atp', 'typeRating'] }, flying: true }],
      ['cargoFo', 'Cargo Airline First Officer', 7, { track: 'ic', minSize: 'large', req: { credentials: ['atp'] }, flying: true, part121: true }],
      ['cargoCaptain', 'Cargo Airline Captain (Widebody)', 8, { track: 'ic', minSize: 'large', req: { credentials: ['atp', 'typeRating'] }, flying: true, part121: true }],
      ['leadPilot', 'Lead Pilot / Aviation Safety Officer', 6, { track: 'mgmt', abilities: ['supervise'], reports: 12, flying: true }],
      ['flightDeptManager', 'Flight Department Manager', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 40 }],
      ['vpFlightOps', 'VP of Flight Operations', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 800 }],
    ],
  },

  flightAttendant: {
    id: 'flightAttendant', name: 'Flight Attendant', icon: '🧳', sector: 'private', payMultiplier: 0.95, minAge: 20,
    sizes: { medium: 3, large: 3, enterprise: 2 }, background: 'strict',
    union: { chance: 0.7, name: 'Association of Flight Attendants–CWA', strike: false },
    employers: ['SkyBridge Regional', 'TransAmerica Airways', 'Pacific Crest Air', 'Bluewing Airlines'],
    entry: { education: { level: 'highschool' } },
    rotation: { label: 'on trips', away: 0.45 }, seniority: true, furlough: true,
    ladder: [
      ['trainee', 'Flight Attendant Trainee', 1, { years: 1 }],
      ['reserve', 'Reserve Flight Attendant', 2, { req: { credentials: ['faCertificate'] } }],
      ['line', 'Line Flight Attendant', 3, { req: { credentials: ['faCertificate'] } }],
      ['purser', 'Purser / Lead Flight Attendant', 4, { track: 'ic' }],
      ['intlPurser', 'International Purser', 5, { track: 'ic', minSize: 'large' }],
      ['supervisor', 'Inflight Supervisor', 5, { track: 'mgmt', abilities: ['supervise'], reports: 40 }],
      ['baseManager', 'Inflight Base Manager', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 400 }],
      ['director', 'Director of Inflight Services', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 6000 }],
    ],
  },

  merchantMarine: {
    id: 'merchantMarine', name: 'Merchant Marine', icon: '🚢', sector: 'private', payMultiplier: 1.25, minAge: 18,
    sizes: { small: 2, medium: 3, large: 3, enterprise: 1 }, background: 'strict',
    union: { chance: 0.65, name: 'Seafarers International Union', strike: true },
    benefits: { unionPension: 'union' },
    employers: ['Seaboard Tanker Co.', 'Pacific Basin Lines', 'Great Lakes Ore Carriers', 'Gulf Coast Offshore', 'Liberty Bell Shipping'],
    entry: { credentials: ['twic'] },
    rotation: { label: 'at sea', away: 0.55 }, seniority: true,
    ladder: [
      ['ordinary', 'Ordinary Seaman / Wiper', 1, { req: { credentials: ['twic'] } }],
      ['able', 'Able Seaman', 2, { req: { credentials: ['mmc', 'stcw'] } }],
      ['qmed', 'QMED / Oiler', 3, { track: 'ic', req: { credentials: ['mmc', 'stcw'] } }],
      ['thirdAE', 'Third Assistant Engineer', 5, { track: 'ic', entry: true, req: { credentials: ['engineerLicense'] } }],
      ['firstAE', 'First Assistant Engineer', 7, { track: 'ic', req: { credentials: ['engineerLicense'] } }],
      ['chiefEngineer', 'Chief Engineer', 8, { track: 'ic', minSize: 'medium', req: { credentials: ['chiefEngineerLicense'] } }],
      ['bosun', 'Bosun', 3, { track: 'mgmt', abilities: ['supervise'], reports: 8 }],
      ['thirdMate', 'Third Mate', 5, { track: 'mgmt', entry: true, req: { credentials: ['mateLicense'] }, abilities: ['supervise'], reports: 6 }],
      ['chiefMate', 'Chief Mate', 7, { track: 'mgmt', req: { credentials: ['chiefMateLicense'] }, abilities: ['supervise', 'hire'], reports: 20 }],
      ['master', 'Master (Ship\'s Captain)', 9, { track: 'mgmt', minSize: 'medium', req: { credentials: ['masterLicense'] }, abilities: ['supervise', 'hire', 'budget', 'command', 'sign'], reports: 28 }],
      ['portCaptain', 'Port Captain / Marine Superintendent', 9, { track: 'mgmt', minSize: 'large', req: { credentials: ['masterLicense'] }, abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 300 }],
    ],
  },

  cruise: {
    id: 'cruise', name: 'Cruise Ships', icon: '🛳️', sector: 'private', payMultiplier: 0.75, minAge: 21, promotionOdds: 0.5,
    sizes: { medium: 2, large: 3, enterprise: 3 }, background: 'standard',
    employers: ['Azure Horizon Cruises', 'Coral Crown Line', 'Northstar Voyages', 'Meridian Seas Cruise Co.'],
    benefits: { housing: true },
    rotation: { label: 'on contract at sea', away: 0.7 }, furlough: true, tips: [3000, 14000],
    ladder: [
      ['steward', 'Cabin Steward', 1],
      ['waiter', 'Dining Room Waiter', 2, { req: { credentials: ['stcw'] } }],
      ['bartender', 'Bartender', 3, { track: 'ic' }],
      ['host', 'Entertainment Host', 3, { track: 'ic', entry: true }],
      ['asstCd', 'Assistant Cruise Director', 5, { track: 'ic', minSize: 'large' }],
      ['cruiseDirector', 'Cruise Director', 6, { track: 'ic', minSize: 'large' }],
      ['headWaiter', 'Head Waiter', 3, { track: 'mgmt', abilities: ['supervise'], reports: 12 }],
      ['maitred', 'Maître d\'Hôtel', 5, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 120 }],
      ['hotelDirector', 'Hotel Director', 7, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 1000 }],
      ['vpHotelOps', 'VP of Hotel Operations', 9, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec'], reports: 20000 }],
    ],
  },
};

export default { id: 'careers-transport', version: 1, careers };
