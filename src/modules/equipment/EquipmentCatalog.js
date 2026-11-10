/**
 * What organizations run on: vehicles, apparatus, aircraft, boats, tools,
 * machines and the buildings that house them. A group is one kind of
 * organization's equipment list; a category is something it needs (with a
 * count by size), and models are the ways to fill it.
 *
 * Model fields: cost, life (years), upkeep (per year), usedCost, lease
 * (can be leased), rent (premises leased by the year), build (built with a
 * bond or loan), refurb (can be refurbished/overhauled), remount (box moves
 * to a new chassis).
 *
 * Why pay more (PERKS, below): a dearer model earns its price one of four ways,
 * and says which in `why`:
 *   quality    more capable or more reliable: readiness, safety, breakdowns
 *   capacity   does the work of more than one unit (a bus for four vans)
 *   upkeep     costs less to run every year (hybrids, electrics, Tier 4)
 *   life       lasts longer before it needs replacing
 * A cheaper alternative says what it gives up (capacity below 1).
 */
import { eraYear, PRESENT as ERA_PRESENT_YEAR } from '../world/Eras.js';

const need = (a, b, c, d) => ({ small: a, medium: b, large: c, enterprise: d });
const M = (name, cost, life, upkeep, extra = {}) => ({ name, cost, life, upkeep, ...extra });

const RADIOS = (n) => ({ name: 'Radios & body cameras', icon: '📻', need: n, weight: 1.5, models: { p25: M('P25 radio + body camera kit', 9000, 6, 600) } });
const COMPUTERS = (n) => ({ name: 'Computers & software', icon: '💻', need: n, weight: 1, models: { pc: M('Workstation + licenses', 2500, 4, 300, { lease: true }) } });

export const GROUPS = {
  /* ---------------- Public safety & government ---------------- */
  police: { name: 'Fleet & Facilities', categories: {
    patrol: { name: 'Patrol cars', icon: '🚓', need: need(6, 20, 60, 150), weight: 3, models: { sedan: M('Patrol sedan', 42000, 4, 6000, { usedCost: 16000 }), suv: M('Police Interceptor SUV', 55000, 5, 7000, { lease: true }), hybrid: M('Hybrid Interceptor', 58000, 5, 4000, { lease: true }) } },
    unmarked: { name: 'Unmarked cars', icon: '🚘', need: need(2, 5, 15, 40), weight: 1, models: { sedan: M('Unmarked sedan', 36000, 6, 4000, { usedCost: 14000, lease: true }) } },
    k9: { name: 'K-9 vehicles', icon: '🐕', need: need(0, 1, 4, 10), weight: 1, models: { k9: M('K-9 SUV with kennel insert', 70000, 5, 7000) } },
    motors: { name: 'Motorcycles', icon: '🏍️', need: need(0, 2, 6, 20), weight: 0.5, models: { motor: M('Police motorcycle', 32000, 5, 3000) } },
    armored: { name: 'Armored rescue vehicle', icon: '🛡️', need: need(0, 0, 1, 2), weight: 0.5, models: { bearcat: M('Armored rescue vehicle', 350000, 15, 12000, { usedCost: 120000 }) } },
    radios: RADIOS(need(8, 25, 75, 190)),
    stations: { name: 'Precincts & substations', icon: '🏢', need: need(1, 2, 4, 8), weight: 1.5, facility: true, models: { own: M('Police precinct (build with a bond)', 6000000, 40, 120000, { build: true }), storefront: M('Leased storefront substation', 0, 99, 0, { rent: 60000 }) } },
  } },
  campusPolice: { name: 'Fleet & Facilities', categories: {
    patrol: { name: 'Patrol cars', icon: '🚓', need: need(3, 6, 12, 25), weight: 3, models: { suv: M('Police Interceptor SUV', 55000, 5, 7000, { lease: true }), hybrid: M('Hybrid Interceptor', 58000, 5, 4000, { lease: true }) } },
    bikes: { name: 'Bicycles & carts', icon: '🚲', need: need(4, 8, 16, 30), weight: 0.5, models: { bike: M('Police mountain bike', 2500, 5, 200), cart: M('Electric patrol cart', 14000, 6, 800) } },
    phones: { name: 'Blue-light emergency phones', icon: '🔵', need: need(20, 50, 120, 250), weight: 1, models: { pole: M('Blue-light emergency call box', 8000, 15, 300) } },
    radios: RADIOS(need(6, 15, 35, 70)),
    cameras: { name: 'Campus security cameras', icon: '📹', need: need(60, 150, 400, 900), weight: 1, models: { cam: M('IP security camera', 2500, 7, 150) } },
    stations: { name: 'Police station & substations', icon: '🏢', need: need(1, 1, 2, 3), weight: 1, facility: true, models: { own: M('Campus police station (build with a bond)', 4000000, 40, 80000, { build: true }), dorm: M('Leased residence-hall substation', 0, 99, 0, { rent: 24000 }) } },
  } },
  airportPolice: { name: 'Fleet & Facilities', categories: {
    patrol: { name: 'Patrol vehicles', icon: '🚓', need: need(4, 10, 25, 50), weight: 3, models: { suv: M('Police Interceptor SUV', 55000, 5, 7000, { lease: true }), cart: M('Electric terminal patrol cart', 14000, 6, 800) } },
    k9: { name: 'Explosives-detection K-9 vehicles', icon: '🐕', need: need(1, 2, 4, 8), weight: 1.5, models: { k9: M('K-9 SUV with kennel insert', 70000, 5, 7000) } },
    radios: RADIOS(need(8, 20, 50, 110)),
    stations: { name: 'Police posts in the terminals', icon: '🛂', need: need(1, 2, 3, 5), weight: 1, facility: true, models: { post: M('Leased terminal police post', 0, 99, 0, { rent: 45000 }) } },
  } },
  federalLE: { name: 'Vehicles & Field Offices', categories: {
    cars: { name: 'Government vehicles (Bucars)', icon: '🚙', need: need(10, 30, 90, 250), weight: 3, models: { sedan: M('Unmarked sedan', 36000, 6, 4000, { lease: true }), suv: M('Unmarked SUV', 48000, 6, 5000, { lease: true }) } },
    armored: { name: 'Armored vehicles', icon: '🛡️', need: need(0, 1, 2, 6), weight: 0.5, models: { bearcat: M('Armored rescue vehicle', 350000, 15, 12000) } },
    radios: RADIOS(need(15, 40, 120, 300)),
    offices: { name: 'Field & resident offices', icon: '🏢', need: need(1, 2, 4, 10), weight: 1, facility: true, models: { gsa: M('GSA-leased office space', 0, 99, 0, { rent: 400000 }) } },
  } },
  borderPatrol: { name: 'Fleet & Stations', categories: {
    trucks: { name: 'Patrol trucks', icon: '🛻', need: need(10, 40, 120, 300), weight: 3, models: { tahoe: M('4x4 patrol truck', 58000, 5, 8000, { lease: true }) } },
    atvs: { name: 'ATVs & horses', icon: '🐎', need: need(4, 10, 30, 80), weight: 1, models: { atv: M('ATV', 14000, 5, 1500), horse: M('Patrol horse', 8000, 15, 4000) } },
    drones: { name: 'Surveillance towers & drones', icon: '🛰️', need: need(1, 3, 8, 20), weight: 1, models: { tower: M('Autonomous surveillance tower', 900000, 12, 40000), drone: M('Long-range drone', 120000, 5, 10000) } },
    stations: { name: 'Border Patrol stations', icon: '🏢', need: need(1, 1, 2, 4), weight: 1, facility: true, models: { own: M('Border Patrol station (build)', 25000000, 50, 400000, { build: true }) } },
  } },
  fire: { name: 'Apparatus & Stations', categories: {
    engine: { name: 'Engines', icon: '🚒', need: need(1, 3, 8, 20), weight: 3, models: { pumper: M('Pumper engine', 850000, 15, 25000, { usedCost: 260000, refurb: true }), quint: M('Quint (engine + 75-ft aerial)', 1200000, 18, 30000, { refurb: true }) } },
    ladder: { name: 'Ladder trucks', icon: '🪜', need: need(0, 1, 3, 8), weight: 2, models: { aerial: M('100-ft aerial ladder truck', 1600000, 20, 35000, { usedCost: 450000, refurb: true }), tiller: M('Tractor-drawn tiller', 1900000, 20, 38000, { refurb: true }) } },
    rescue: { name: 'Heavy rescue', icon: '🧗', need: need(0, 0, 1, 3), weight: 1, models: { rescue: M('Heavy rescue', 1100000, 18, 25000, { refurb: true }) } },
    brush: { name: 'Brush trucks', icon: '🌲', need: need(0, 1, 2, 4), weight: 0.5, models: { brush: M('Type 6 brush truck', 350000, 12, 9000, { usedCost: 90000 }) } },
    scba: { name: 'SCBA air packs', icon: '🫁', need: need(10, 30, 80, 200), weight: 1.5, models: { scba: M('SCBA set', 9000, 10, 400) } },
    stations: { name: 'Fire stations', icon: '🏚️', need: need(1, 3, 8, 20), weight: 1.5, facility: true, models: { own: M('Fire station (build with a bond)', 9000000, 50, 150000, { build: true }), temp: M('Leased temporary quarters', 0, 99, 0, { rent: 80000 }) } },
  } },
  stateFire: { name: 'Apparatus, Aircraft & Stations', categories: {
    engine: { name: 'Wildland engines (Type 3)', icon: '🚒', need: need(4, 12, 40, 120), weight: 3, models: { type3: M('Type 3 wildland engine', 450000, 15, 15000, { usedCost: 140000, refurb: true }) } },
    tender: { name: 'Water tenders', icon: '💧', need: need(1, 3, 10, 30), weight: 1, models: { tender: M('Water tender', 380000, 18, 10000, { usedCost: 110000 }) } },
    dozer: { name: 'Dozers & transports', icon: '🚜', need: need(1, 2, 8, 25), weight: 1.5, models: { dozer: M('D6 dozer with transport', 650000, 18, 30000, { usedCost: 220000, refurb: true }) } },
    helicopter: { name: 'Helicopters (helitack)', icon: '🚁', need: need(0, 1, 4, 12), weight: 1.5, models: { firehawk: M('Firehawk helicopter', 24000000, 25, 900000, { refurb: true }), contract: M('Exclusive-use contract helicopter', 0, 99, 0, { rent: 2500000 }) } },
    airtanker: { name: 'Air tankers', icon: '✈️', need: need(0, 0, 2, 6), weight: 1, models: { contract: M('Contracted large air tanker (fire season)', 0, 99, 0, { rent: 5000000 }) } },
    stations: { name: 'Fire stations & air attack bases', icon: '🏕️', need: need(2, 6, 20, 60), weight: 1, facility: true, models: { own: M('Forest fire station (build)', 7000000, 50, 120000, { build: true }), seasonal: M('Leased seasonal station', 0, 99, 0, { rent: 40000 }) } },
  } },
  arff: { name: 'Apparatus & Stations', categories: {
    crash: { name: 'ARFF crash trucks', icon: '✈️', need: need(2, 3, 5, 8), weight: 3, models: { striker: M('High-reach crash truck', 1200000, 15, 30000, { refurb: true }), compact: M('Rapid-intervention vehicle', 600000, 15, 15000) } },
    scba: { name: 'SCBA air packs', icon: '🫁', need: need(10, 20, 40, 70), weight: 1, models: { scba: M('SCBA set', 9000, 10, 400) } },
    stations: { name: 'ARFF stations', icon: '🛬', need: need(1, 1, 2, 3), weight: 1.5, facility: true, models: { own: M('ARFF station (build with a bond)', 12000000, 50, 180000, { build: true }) } },
  } },
  ems: { name: 'Fleet & Facilities', categories: {
    ambulance: { name: 'Ambulances', icon: '🚑', need: need(2, 6, 18, 45), weight: 3, models: { van: M('Type II van ambulance', 160000, 6, 14000, { usedCost: 55000, lease: true }), box: M('Type III modular ambulance', 240000, 8, 16000, { usedCost: 80000, remount: true, lease: true }) } },
    monitors: { name: 'Cardiac monitors', icon: '💓', need: need(2, 6, 18, 45), weight: 1.5, models: { monitor: M('12-lead cardiac monitor/defibrillator', 40000, 7, 1500, { lease: true }) } },
    stretchers: { name: 'Power-load stretchers', icon: '🛏️', need: need(2, 6, 18, 45), weight: 1, models: { power: M('Power-load stretcher system', 45000, 10, 1200) } },
    stations: { name: 'Stations & posts', icon: '🏠', need: need(1, 2, 6, 15), weight: 1, facility: true, models: { post: M('Leased ambulance post', 0, 99, 0, { rent: 30000 }), own: M('EMS station (build with a bond)', 3000000, 40, 60000, { build: true }) } },
  } },
  corrections: { name: 'Vehicles, Security & Facilities', categories: {
    vans: { name: 'Inmate transport vans & buses', icon: '🚐', need: need(2, 6, 18, 40), weight: 2, models: { van: M('Secure transport van', 85000, 8, 6000), bus: M('Secure transport bus', 400000, 15, 20000) } },
    cameras: { name: 'Cameras & body scanners', icon: '📹', need: need(40, 120, 400, 1000), weight: 1.5, models: { cam: M('Security camera', 3000, 7, 200), scanner: M('Full-body scanner', 150000, 10, 10000) } },
    radios: RADIOS(need(10, 40, 120, 300)),
    units: { name: 'Housing units', icon: '🏢', need: need(2, 6, 18, 40), weight: 1.5, facility: true, models: { own: M('Housing unit (build with bonds)', 30000000, 50, 500000, { build: true }) } },
  } },
  postal: { name: 'Delivery Fleet & Facilities', categories: {
    trucks: { name: 'Delivery vehicles', icon: '📮', need: need(10, 40, 150, 500), weight: 3, models: { llv: M('Long Life Vehicle (aging)', 25000, 25, 5000, { usedCost: 6000 }), ngdv: M('Next Generation Delivery Vehicle (electric)', 70000, 20, 2500) } },
    sorters: { name: 'Sorting machines', icon: '📦', need: need(1, 2, 8, 20), weight: 1.5, models: { dbcs: M('Delivery barcode sorter', 900000, 20, 50000, { refurb: true }) } },
    offices: { name: 'Post offices & plants', icon: '🏤', need: need(1, 3, 10, 30), weight: 1, facility: true, models: { lease: M('Leased post office', 0, 99, 0, { rent: 90000 }) } },
  } },
  parks: { name: 'Vehicles, Boats & Stations', categories: {
    trucks: { name: 'Patrol trucks', icon: '🛻', need: need(4, 10, 30, 80), weight: 3, models: { truck: M('4x4 patrol truck', 55000, 8, 6000, { usedCost: 20000 }) } },
    boats: { name: 'Patrol boats', icon: '🚤', need: need(1, 2, 6, 15), weight: 1, models: { boat: M('Patrol boat', 120000, 15, 8000, { usedCost: 40000 }) } },
    atvs: { name: 'ATVs & snowmobiles', icon: '🏂', need: need(2, 4, 12, 30), weight: 0.5, models: { atv: M('ATV', 14000, 6, 1500), sled: M('Snowmobile', 16000, 8, 1500) } },
    stations: { name: 'Ranger & warden stations', icon: '🏕️', need: need(1, 2, 6, 15), weight: 1, facility: true, models: { own: M('Ranger station (build)', 2500000, 40, 40000, { build: true }) } },
  } },
  dispatch: { name: 'Consoles & Radio System', categories: {
    consoles: { name: 'Dispatch consoles & CAD', icon: '🖥️', need: need(4, 10, 30, 60), weight: 3, models: { console: M('Dispatch console + CAD seat', 60000, 8, 4000) } },
    towers: { name: 'Radio towers & repeaters', icon: '📡', need: need(2, 5, 15, 40), weight: 2, models: { tower: M('Radio tower site & P25 repeater', 400000, 20, 15000, { refurb: true }) } },
    centers: { name: '911 centers & backup', icon: '🏢', need: need(1, 1, 2, 3), weight: 1, facility: true, models: { own: M('911 center (build with a bond)', 12000000, 40, 200000, { build: true }) } },
  } },
  utility: { name: 'Fleet & Yards', categories: {
    buckets: { name: 'Bucket trucks', icon: '🚚', need: need(4, 12, 40, 120), weight: 3, models: { bucket: M('Insulated bucket truck', 250000, 12, 12000, { usedCost: 80000, refurb: true }) } },
    diggers: { name: 'Digger derricks', icon: '🏗️', need: need(1, 4, 12, 35), weight: 1.5, models: { digger: M('Digger derrick', 380000, 15, 15000, { usedCost: 120000 }) } },
    yards: { name: 'Service centers', icon: '🏭', need: need(1, 1, 3, 8), weight: 1, facility: true, models: { own: M('Service center (build)', 15000000, 50, 200000, { build: true }) } },
  } },
  water: { name: 'Plants, Pumps & Fleet', categories: {
    pumps: { name: 'Pump stations', icon: '💧', need: need(3, 8, 25, 60), weight: 3, models: { pump: M('Pump station rebuild', 800000, 25, 30000, { refurb: true }) } },
    trucks: { name: 'Service & vac trucks', icon: '🚛', need: need(2, 6, 20, 50), weight: 1.5, models: { truck: M('Service truck', 90000, 10, 6000, { usedCost: 30000 }), vac: M('Vacuum excavator truck', 450000, 12, 20000) } },
    plants: { name: 'Treatment plants', icon: '🏭', need: need(1, 1, 2, 4), weight: 1, facility: true, models: { own: M('Treatment plant upgrade (bond)', 60000000, 40, 1500000, { build: true }) } },
  } },
  transit: { name: 'Fleet & Facilities', categories: {
    bus: { name: 'Buses', icon: '🚌', need: need(10, 40, 150, 500), weight: 3, models: { diesel: M('Diesel bus', 600000, 12, 40000, { usedCost: 150000 }), hybrid: M('Hybrid bus', 850000, 12, 30000), electric: M('Battery-electric bus', 1100000, 12, 18000) } },
    vans: { name: 'Paratransit vans', icon: '♿', need: need(4, 12, 40, 120), weight: 1, models: { van: M('Wheelchair-lift van', 90000, 6, 9000, { lease: true }) } },
    garages: { name: 'Bus garages', icon: '🏭', need: need(1, 1, 3, 8), weight: 1, facility: true, models: { own: M('Bus garage (build with a bond)', 40000000, 50, 600000, { build: true }) } },
  } },
  schoolBus: { name: 'Bus Fleet', categories: {
    bus: { name: 'School buses', icon: '🚌', need: need(10, 40, 120, 300), weight: 3, models: { diesel: M('Type C school bus', 140000, 12, 9000, { usedCost: 35000 }), electric: M('Electric school bus', 380000, 14, 5000) } },
    lots: { name: 'Bus depots', icon: '🅿️', need: need(1, 1, 2, 4), weight: 1, facility: true, models: { lease: M('Leased bus lot', 0, 99, 0, { rent: 60000 }) } },
  } },
  publicWorks: { name: 'Fleet & Facilities', categories: {
    plows: { name: 'Plow & dump trucks', icon: '🚛', need: need(4, 12, 35, 90), weight: 3, models: { tandem: M('Tandem-axle plow/dump truck', 250000, 12, 15000, { usedCost: 70000 }) } },
    loaders: { name: 'Loaders & backhoes', icon: '🚜', need: need(1, 3, 8, 20), weight: 1.5, models: { loader: M('Wheel loader', 280000, 15, 14000, { usedCost: 90000, lease: true }) } },
    yards: { name: 'Public works yards', icon: '🏗️', need: need(1, 1, 2, 4), weight: 1, facility: true, models: { own: M('Public works yard (build with a bond)', 15000000, 50, 200000, { build: true }), shed: M('Leased salt shed & yard', 0, 99, 0, { rent: 50000 }) } },
  } },
  hospitalUnit: { name: 'Unit Equipment', categories: {
    monitors: { name: 'Patient monitors', icon: '📟', need: need(8, 20, 40, 80), weight: 2, models: { monitor: M('Bedside patient monitor', 18000, 8, 800, { lease: true }) } },
    pumps: { name: 'Smart IV pumps', icon: '💧', need: need(10, 30, 60, 120), weight: 1.5, models: { pump: M('Smart infusion pump', 4000, 8, 200, { lease: true }) } },
    beds: { name: 'Hospital beds', icon: '🛏️', need: need(8, 20, 40, 80), weight: 1, models: { bed: M('Electric hospital bed', 9000, 10, 300) } },
    imaging: { name: 'Imaging (CT/MRI)', icon: '🧲', need: need(0, 1, 2, 4), weight: 1.5, models: { ct: M('CT scanner', 1500000, 10, 120000, { lease: true, refurb: true }), mri: M('3T MRI', 3000000, 12, 200000, { lease: true }) } },
  } },

  /* ---------------- Businesses ---------------- */
  kitchen: { name: 'Equipment & Premises', categories: {
    line: { name: 'Ranges, ovens & fryers', icon: '🍳', need: need(2, 4, 8, 16), weight: 3, models: { range: M('Commercial range/oven', 9000, 10, 600, { usedCost: 3000 }), combi: M('Combi oven', 25000, 10, 900) } },
    cold: { name: 'Walk-ins & refrigeration', icon: '🧊', need: need(1, 2, 4, 8), weight: 2, models: { walkin: M('Walk-in cooler', 15000, 15, 900, { usedCost: 6000 }) } },
    pos: { name: 'Point of sale', icon: '💳', need: need(1, 3, 6, 12), weight: 1, models: { pos: M('POS terminal', 1500, 5, 600, { lease: true }) } },
  } },
  salon: { name: 'Equipment', categories: {
    chairs: { name: 'Styling chairs & stations', icon: '💺', need: need(2, 5, 10, 20), weight: 3, models: { chair: M('Hydraulic styling chair', 1200, 10, 50, { usedCost: 400 }) } },
    wash: { name: 'Shampoo bowls & dryers', icon: '🚿', need: need(1, 3, 6, 12), weight: 1.5, models: { bowl: M('Shampoo unit', 2500, 12, 100) } },
  } },
  autoShop: { name: 'Shop Equipment', categories: {
    lifts: { name: 'Vehicle lifts', icon: '🔩', need: need(2, 4, 8, 16), weight: 3, models: { lift: M('2-post lift', 5500, 15, 300, { usedCost: 2000 }), alignment: M('Alignment rack', 45000, 12, 1500) } },
    scanners: { name: 'Diagnostic scanners', icon: '🖥️', need: need(1, 2, 4, 8), weight: 2, models: { scanner: M('OEM-level scan tool', 9000, 5, 2000) } },
  } },
  clinic: { name: 'Clinical Equipment', categories: {
    rooms: { name: 'Exam & treatment rooms', icon: '🩺', need: need(2, 5, 10, 20), weight: 3, models: { room: M('Exam room build-out', 12000, 12, 300) } },
    imaging: { name: 'Imaging', icon: '🩻', need: need(0, 1, 2, 4), weight: 1.5, models: { xray: M('Digital X-ray', 90000, 12, 5000, { usedCost: 35000, lease: true }) } },
    ehr: COMPUTERS(need(3, 8, 16, 32)),
  } },
  dental: { name: 'Clinical Equipment', categories: {
    chairs: { name: 'Dental operatories', icon: '🦷', need: need(2, 4, 8, 16), weight: 3, models: { op: M('Dental chair & delivery unit', 30000, 15, 1000, { usedCost: 10000 }) } },
    imaging: { name: 'Imaging', icon: '🩻', need: need(1, 1, 2, 4), weight: 1.5, models: { pano: M('Panoramic X-ray', 45000, 12, 2000), cbct: M('Cone-beam CT', 120000, 10, 5000, { lease: true }) } },
  } },
  gym: { name: 'Equipment', categories: {
    cardio: { name: 'Cardio machines', icon: '🏃', need: need(10, 30, 60, 120), weight: 2, models: { tread: M('Commercial treadmill', 9000, 7, 400, { usedCost: 3000, lease: true }) } },
    strength: { name: 'Racks & strength machines', icon: '🏋️', need: need(6, 15, 30, 60), weight: 2, models: { rack: M('Power rack & plates', 4000, 15, 100, { usedCost: 1500 }) } },
  } },
  office: { name: 'Equipment', categories: {
    computers: COMPUTERS(need(2, 8, 30, 120)),
    servers: { name: 'Servers & network', icon: '🗄️', need: need(1, 1, 3, 8), weight: 1, models: { server: M('Server & networking rack', 25000, 5, 2000, { lease: true }), cloud: M('Cloud subscription', 0, 99, 0, { rent: 12000 }) } },
  } },
  retail: { name: 'Store Equipment', categories: {
    pos: { name: 'Point of sale', icon: '💳', need: need(1, 3, 6, 12), weight: 2, models: { pos: M('POS terminal', 1500, 5, 600, { lease: true }) } },
    fixtures: { name: 'Shelving & refrigeration', icon: '🧊', need: need(4, 10, 20, 40), weight: 2, models: { shelf: M('Gondola shelving run', 2000, 15, 50, { usedCost: 600 }), cooler: M('Reach-in cooler', 7000, 12, 500) } },
  } },
  care: { name: 'Classrooms & Equipment', categories: {
    rooms: { name: 'Classroom furniture & materials', icon: '🧸', need: need(2, 6, 12, 24), weight: 2, models: { room: M('Classroom outfit', 8000, 8, 400) } },
    playground: { name: 'Playground', icon: '🛝', need: need(1, 1, 2, 3), weight: 1.5, models: { play: M('Commercial playground', 60000, 15, 1500) } },
    buses: { name: 'Vans & buses', icon: '🚌', need: need(0, 1, 3, 6), weight: 1, models: { van: M('15-passenger van', 50000, 8, 4000, { usedCost: 18000 }), bus: M('School bus', 140000, 12, 9000, { usedCost: 35000 }) } },
  } },
  funeral: { name: 'Fleet & Equipment', categories: {
    hearses: { name: 'Hearses & limousines', icon: '🚙', need: need(1, 2, 4, 8), weight: 3, models: { hearse: M('Hearse', 95000, 10, 4000, { usedCost: 30000 }), limo: M('Family limousine', 85000, 10, 4000, { usedCost: 25000 }) } },
    prep: { name: 'Preparation room', icon: '⚱️', need: need(1, 1, 2, 3), weight: 1, models: { room: M('Preparation room equipment', 60000, 20, 2000) } },
  } },
  machine: { name: 'Machines', categories: {
    cnc: { name: 'CNC machines', icon: '🏭', need: need(2, 4, 10, 25), weight: 3, models: { mill: M('5-axis CNC mill', 250000, 15, 12000, { usedCost: 90000, lease: true, refurb: true }), lathe: M('CNC lathe', 150000, 15, 8000, { usedCost: 55000 }) } },
    tools: { name: 'Inspection & tooling', icon: '📏', need: need(1, 2, 4, 8), weight: 1, models: { cmm: M('Coordinate measuring machine', 120000, 15, 5000) } },
  } },
  warehouse: { name: 'Warehouse Equipment', categories: {
    forklifts: { name: 'Forklifts', icon: '🚜', need: need(3, 8, 20, 50), weight: 3, models: { forklift: M('Electric forklift', 38000, 10, 2500, { usedCost: 14000, lease: true }) } },
    racking: { name: 'Racking & conveyors', icon: '🧱', need: need(10, 30, 80, 200), weight: 1.5, models: { rack: M('Pallet racking bay', 2500, 20, 50) } },
  } },
  studio: { name: 'Studio Gear', categories: {
    gear: { name: 'Cameras, consoles & lights', icon: '🎬', need: need(2, 5, 10, 20), weight: 3, models: { kit: M('Pro camera / console package', 40000, 6, 2000, { usedCost: 15000, lease: true }) } },
    computers: COMPUTERS(need(2, 5, 12, 25)),
  } },
  kennel: { name: 'Kennels & Equipment', categories: {
    runs: { name: 'Kennel runs', icon: '🐕', need: need(10, 25, 50, 100), weight: 3, models: { run: M('Indoor/outdoor kennel run', 3000, 15, 100) } },
    grooming: { name: 'Grooming stations', icon: '🛁', need: need(1, 2, 4, 8), weight: 1, models: { tub: M('Grooming tub & table', 6000, 12, 200) } },
  } },
  range: { name: 'Range Equipment', categories: {
    lanes: { name: 'Shooting lanes & target systems', icon: '🎯', need: need(6, 12, 24, 40), weight: 3, models: { lane: M('Lane with target retriever', 15000, 15, 500, { refurb: true }) } },
    hvac: { name: 'Ventilation & lead abatement', icon: '🌬️', need: need(1, 1, 2, 3), weight: 2, models: { hvac: M('Range ventilation system', 250000, 20, 12000, { refurb: true }) } },
  } },

  /* ---------------- Employers' fleets & plants (job managers) ---------------- */
  truckFleet: { name: 'Fleet & Terminals', categories: {
    tractors: { name: 'Tractors', icon: '🚛', need: need(5, 25, 120, 600), weight: 3, models: { daycab: M('Day-cab tractor', 150000, 6, 18000, { usedCost: 55000, lease: true }), sleeper: M('Sleeper tractor', 185000, 6, 20000, { usedCost: 65000, lease: true }) } },
    trailers: { name: 'Trailers', icon: '📦', need: need(8, 40, 200, 1000), weight: 1.5, models: { dry: M('53-ft dry van', 45000, 12, 1500, { usedCost: 15000, lease: true }), reefer: M('Reefer trailer', 75000, 10, 4000, { usedCost: 25000, lease: true }) } },
    eld: { name: 'ELDs & dash cameras', icon: '📟', need: need(5, 25, 120, 600), weight: 0.5, models: { eld: M('ELD + dual-facing camera', 1200, 4, 400, { lease: true }) } },
    terminal: { name: 'Terminals & shops', icon: '🏭', need: need(1, 1, 3, 8), weight: 1, facility: true, models: { own: M('Truck terminal & shop (build)', 5000000, 40, 100000, { build: true }), yard: M('Leased yard & shop', 0, 99, 0, { rent: 120000 }) } },
  } },
  construction: { name: 'Heavy Equipment', categories: {
    pickups: { name: 'Crew trucks', icon: '🛻', need: need(3, 10, 30, 80), weight: 1.5, models: { pickup: M('Crew-cab pickup', 60000, 7, 4000, { usedCost: 25000, lease: true }) } },
    earth: { name: 'Excavators & loaders', icon: '🚜', need: need(1, 4, 12, 30), weight: 2, models: { excavator: M('Excavator', 320000, 12, 20000, { usedCost: 120000, lease: true, refurb: true }), skid: M('Skid steer', 70000, 8, 4000, { usedCost: 25000 }) } },
    cranes: { name: 'Cranes', icon: '🏗️', need: need(0, 1, 4, 10), weight: 1.5, models: { crawler: M('Crawler crane', 1500000, 25, 60000, { usedCost: 500000, refurb: true }), rental: M('Rented tower crane (per year)', 0, 99, 0, { rent: 180000 }) } },
    tools: { name: 'Tools & lifts', icon: '🧰', need: need(4, 12, 40, 100), weight: 1, models: { lift: M('Scissor lift / tool trailer', 25000, 8, 1000, { usedCost: 9000 }) } },
  } },
  screening: { name: 'Checkpoint Equipment', categories: {
    ct: { name: 'CT bag scanners', icon: '🧳', need: need(2, 6, 20, 60), weight: 3, models: { ct: M('Checkpoint CT scanner', 600000, 10, 40000, { refurb: true }) } },
    ait: { name: 'Body scanners', icon: '🧍', need: need(2, 6, 20, 60), weight: 2, models: { ait: M('Advanced imaging body scanner', 170000, 10, 12000) } },
    etd: { name: 'Explosive trace detectors', icon: '🧪', need: need(4, 12, 40, 120), weight: 1, models: { etd: M('Trace detector', 40000, 8, 3000) } },
  } },
  animalControl: { name: 'Trucks & Shelter', categories: {
    trucks: { name: 'Animal control trucks', icon: '🛻', need: need(2, 5, 12, 30), weight: 3, models: { truck: M('Truck with animal box', 85000, 8, 6000, { usedCost: 30000 }) } },
    kennels: { name: 'Shelter kennels', icon: '🐕', need: need(20, 60, 150, 300), weight: 2, models: { run: M('Shelter kennel run', 3000, 15, 100) } },
    shelter: { name: 'Animal shelter', icon: '🏠', need: need(1, 1, 2, 3), weight: 1, facility: true, models: { own: M('Animal shelter (build with a bond)', 8000000, 40, 150000, { build: true }) } },
  } },
  railroad: { name: 'Motive Power & Track Equipment', categories: {
    locos: { name: 'Locomotives', icon: '🚂', need: need(4, 20, 80, 400), weight: 3, models: { ac44: M('AC4400 road locomotive', 3200000, 30, 150000, { usedCost: 900000, lease: true, refurb: true }), tier4: M('Tier 4 locomotive', 4000000, 30, 120000, { lease: true }) } },
    mow: { name: 'Track maintenance equipment', icon: '🛤️', need: need(2, 8, 30, 100), weight: 1.5, models: { tamper: M('Tamper / regulator', 1500000, 25, 50000, { usedCost: 400000, refurb: true }) } },
    hirail: { name: 'Hi-rail trucks', icon: '🛻', need: need(3, 12, 40, 150), weight: 1, models: { hirail: M('Hi-rail pickup', 110000, 8, 6000, { usedCost: 35000 }) } },
  } },
  airline: { name: 'Fleet & Ground Equipment', categories: {
    aircraft: { name: 'Aircraft', icon: '✈️', need: need(2, 10, 60, 300), weight: 3, models: { narrow: M('Narrowbody jet', 50000000, 25, 3000000, { usedCost: 18000000, lease: true, refurb: true }), regional: M('Regional jet', 30000000, 25, 2000000, { usedCost: 9000000, lease: true }), turboprop: M('Turboprop (charter)', 6000000, 25, 500000, { usedCost: 2000000, lease: true }) } },
    gse: { name: 'Ground support equipment', icon: '🛄', need: need(4, 20, 120, 600), weight: 1, models: { tug: M('Tug / belt loader', 60000, 12, 3000, { usedCost: 20000, lease: true }) } },
    hangar: { name: 'Hangars & gates', icon: '🛬', need: need(1, 1, 3, 10), weight: 1, facility: true, models: { own: M('Maintenance hangar (build)', 30000000, 40, 600000, { build: true }), gates: M('Leased gates & hangar space', 0, 99, 0, { rent: 2000000 }) } },
  } },
  farm: { name: 'Machinery & Buildings', categories: {
    tractors: { name: 'Tractors', icon: '🚜', need: need(1, 3, 8, 20), weight: 3, models: { row: M('Row-crop tractor', 350000, 15, 12000, { usedCost: 120000, lease: true, refurb: true }), utility: M('Utility tractor', 70000, 20, 3000, { usedCost: 25000 }) } },
    combine: { name: 'Combines & harvesters', icon: '🌾', need: need(0, 1, 3, 8), weight: 2, models: { combine: M('Combine with header', 650000, 15, 25000, { usedCost: 220000, refurb: true }), custom: M('Custom-harvest contract', 0, 99, 0, { rent: 60000 }) } },
    bins: { name: 'Grain bins & barns', icon: '🏚️', need: need(2, 4, 10, 25), weight: 1, models: { bin: M('Grain bin / pole barn', 90000, 30, 2000) } },
  } },
  fishingFleet: { name: 'Vessels & Gear', categories: {
    vessels: { name: 'Fishing vessels', icon: '🚢', need: need(1, 2, 6, 15), weight: 3, models: { trawler: M('Trawler / longliner', 2500000, 30, 150000, { usedCost: 700000, refurb: true }), crabber: M('Crab boat', 3500000, 30, 200000, { usedCost: 1000000, refurb: true }) } },
    gear: { name: 'Nets, pots & electronics', icon: '🎣', need: need(2, 4, 12, 30), weight: 1.5, models: { gear: M('Gear & electronics package', 120000, 6, 8000) } },
  } },
  lab: { name: 'Instruments & Facilities', categories: {
    instruments: { name: 'Major instruments', icon: '🔬', need: need(2, 6, 20, 60), weight: 3, models: { ms: M('Mass spectrometer', 600000, 10, 50000, { lease: true, refurb: true }), microscope: M('Confocal microscope', 450000, 12, 30000), cryoem: M('Cryo-electron microscope', 7000000, 15, 500000) } },
    computing: { name: 'Computing cluster', icon: '🖥️', need: need(1, 2, 4, 10), weight: 1.5, models: { cluster: M('HPC cluster node rack', 400000, 5, 40000, { lease: true }), cloud: M('Cloud compute allocation', 0, 99, 0, { rent: 150000 }) } },
    building: { name: 'Lab buildings', icon: '🏛️', need: need(1, 1, 2, 4), weight: 1, facility: true, models: { own: M('Research building (build)', 60000000, 50, 1200000, { build: true }) } },
  } },
  library: { name: 'Collections & Branches', categories: {
    computers: COMPUTERS(need(10, 40, 120, 300)),
    bookmobile: { name: 'Bookmobiles', icon: '🚌', need: need(0, 1, 2, 4), weight: 0.5, models: { bus: M('Bookmobile', 250000, 15, 10000) } },
    branches: { name: 'Branches', icon: '📚', need: need(1, 3, 10, 30), weight: 2, facility: true, models: { own: M('Branch library (build with a bond)', 9000000, 50, 150000, { build: true }), storefront: M('Leased storefront branch', 0, 99, 0, { rent: 90000 }) } },
  } },
  security: { name: 'Vehicles & Systems', categories: {
    vehicles: { name: 'Patrol vehicles', icon: '🚙', need: need(2, 6, 20, 60), weight: 2, models: { suv: M('Marked patrol SUV', 45000, 6, 5000, { usedCost: 15000, lease: true }), cart: M('Patrol cart', 12000, 6, 800) } },
    radios: { name: 'Radios', icon: '📻', need: need(8, 25, 80, 250), weight: 1, models: { radio: M('Two-way radio', 900, 6, 50) } },
    cameras: { name: 'Cameras & access control', icon: '📹', need: need(30, 100, 300, 900), weight: 1.5, models: { cam: M('Camera / card reader', 1500, 7, 100) } },
  } },

  /* ---------------- More employers ---------------- */
  vessel: { name: 'Fleet & Ship Systems', categories: {
    ships: { name: 'Ships', icon: '🚢', need: need(1, 3, 10, 30), weight: 3, models: { cargo: M('Container / cargo ship', 60000000, 30, 3000000, { usedCost: 20000000, lease: true, refurb: true }), cruise: M('Cruise ship', 900000000, 35, 40000000, { lease: true, refurb: true }) } },
    tugs: { name: 'Tugs & tenders', icon: '⛴️', need: need(0, 1, 3, 8), weight: 1, models: { tug: M('Harbor tug / tender', 9000000, 30, 400000, { usedCost: 3000000, refurb: true }) } },
    safety: { name: 'Lifeboats & safety gear', icon: '🛟', need: need(4, 12, 40, 120), weight: 1.5, models: { lifeboat: M('Enclosed lifeboat & davit', 250000, 20, 8000) } },
    nav: { name: 'Navigation & engine controls', icon: '🧭', need: need(1, 3, 10, 30), weight: 1, models: { bridge: M('Integrated bridge system', 1500000, 12, 60000, { refurb: true }) } },
  } },
  rig: { name: 'Rigs & Field Equipment', categories: {
    rigs: { name: 'Drilling rigs', icon: '🛢️', need: need(1, 3, 12, 40), weight: 3, models: { land: M('Land drilling rig', 20000000, 25, 800000, { usedCost: 6000000, refurb: true }), contract: M('Contracted rig (day rate, per year)', 0, 99, 0, { rent: 7000000 }) } },
    workover: { name: 'Workover & frac equipment', icon: '⚙️', need: need(1, 2, 8, 25), weight: 1.5, models: { spread: M('Workover unit / frac spread share', 3000000, 15, 150000, { usedCost: 900000, lease: true }) } },
    trucks: { name: 'Field trucks', icon: '🛻', need: need(4, 12, 40, 120), weight: 1, models: { pickup: M('Heavy-duty field pickup', 65000, 6, 5000, { usedCost: 25000, lease: true }) } },
    safety: { name: 'Gas monitors & safety gear', icon: '☢️', need: need(10, 30, 100, 300), weight: 1, models: { kit: M('H2S monitor & fall-protection kit', 2500, 4, 200) } },
  } },
  atc: { name: 'Systems & Facilities', categories: {
    radar: { name: 'Radar', icon: '📡', need: need(1, 1, 2, 4), weight: 3, models: { asr: M('Terminal surveillance radar', 15000000, 25, 500000, { refurb: true }) } },
    scopes: { name: 'Controller positions', icon: '🖥️', need: need(4, 10, 30, 80), weight: 2, models: { stars: M('STARS display position', 250000, 12, 15000, { refurb: true }) } },
    radios: { name: 'Radios & backups', icon: '📻', need: need(4, 10, 30, 80), weight: 1.5, models: { radio: M('VHF/UHF radio set', 40000, 15, 2000) } },
    tower: { name: 'Towers & TRACONs', icon: '🗼', need: need(1, 1, 2, 3), weight: 1, facility: true, models: { own: M('Control tower (federal construction)', 30000000, 50, 500000, { build: true }) } },
  } },
  weather: { name: 'Observing Systems', categories: {
    radar: { name: 'Doppler radar', icon: '🌀', need: need(1, 1, 2, 4), weight: 3, models: { nexrad: M('Doppler weather radar (service life extension)', 8000000, 25, 300000, { refurb: true }) } },
    stations: { name: 'Surface stations', icon: '🌡️', need: need(6, 15, 40, 100), weight: 1.5, models: { asos: M('Automated surface station', 120000, 15, 6000) } },
    balloons: { name: 'Upper-air sounding systems', icon: '🎈', need: need(1, 1, 2, 4), weight: 1, models: { ua: M('Radiosonde ground system', 300000, 15, 60000) } },
    computing: COMPUTERS(need(6, 15, 40, 100)),
  } },
  crimeLab: { name: 'Instruments & Lab', categories: {
    dna: { name: 'DNA instruments', icon: '🧬', need: need(1, 2, 6, 15), weight: 3, models: { seq: M('DNA analyzer / rapid DNA', 150000, 8, 12000, { lease: true }) } },
    chem: { name: 'Drug chemistry (GC-MS)', icon: '⚗️', need: need(1, 2, 5, 12), weight: 2, models: { gcms: M('GC-MS', 120000, 10, 9000, { lease: true, refurb: true }) } },
    vans: { name: 'Crime scene vans', icon: '🚐', need: need(1, 2, 5, 12), weight: 1, models: { van: M('Crime scene unit', 140000, 10, 6000, { usedCost: 45000 }) } },
    evidence: { name: 'Evidence storage', icon: '🗄️', need: need(1, 1, 2, 4), weight: 1, facility: true, models: { own: M('Evidence & lab building (bond)', 20000000, 40, 300000, { build: true }) } },
  } },
  campus: { name: 'Classrooms, Labs & Buildings', categories: {
    classrooms: { name: 'Classroom technology', icon: '📽️', need: need(20, 60, 200, 500), weight: 2, models: { room: M('Smart classroom refresh', 25000, 8, 1000) } },
    labs: { name: 'Teaching labs', icon: '🧪', need: need(4, 12, 40, 100), weight: 2, models: { lab: M('Teaching lab outfit', 300000, 15, 15000, { refurb: true }) } },
    computing: COMPUTERS(need(80, 300, 1200, 4000)),
    buildings: { name: 'Academic buildings', icon: '🏛️', need: need(2, 6, 20, 60), weight: 1.5, facility: true, models: { own: M('Academic building (bond)', 45000000, 50, 900000, { build: true }), leased: M('Leased classroom space', 0, 99, 0, { rent: 400000 }) } },
  } },
  publicHealth: { name: 'Clinics & Labs', categories: {
    clinics: { name: 'Clinic rooms', icon: '🩺', need: need(3, 8, 25, 60), weight: 2, models: { room: M('Exam room build-out', 12000, 12, 300) } },
    lab: { name: 'Public health lab instruments', icon: '🧫', need: need(1, 3, 10, 25), weight: 2, models: { pcr: M('PCR / sequencing instrument', 250000, 8, 20000, { lease: true }) } },
    mobile: { name: 'Mobile clinics', icon: '🚐', need: need(0, 1, 3, 8), weight: 1, models: { van: M('Mobile clinic / vaccination van', 300000, 12, 15000, { usedCost: 90000 }) } },
    cold: { name: 'Vaccine cold storage', icon: '❄️', need: need(2, 5, 15, 40), weight: 1.5, models: { fridge: M('Medical-grade freezer', 15000, 10, 600) } },
  } },
  probation: { name: 'Vehicles & Monitoring', categories: {
    cars: { name: 'Field cars', icon: '🚗', need: need(3, 10, 30, 80), weight: 2, models: { sedan: M('Unmarked sedan', 34000, 7, 3500, { usedCost: 13000, lease: true }) } },
    monitors: { name: 'GPS ankle monitors', icon: '📍', need: need(30, 100, 300, 900), weight: 2, models: { gps: M('GPS monitor (leased per unit)', 1200, 3, 900, { lease: true }) } },
    testing: { name: 'Drug-testing equipment', icon: '🧪', need: need(1, 2, 6, 15), weight: 1, models: { kit: M('Instant-test analyzer', 9000, 6, 2000) } },
  } },
  fieldScience: { name: 'Field Equipment', categories: {
    trucks: { name: 'Field trucks', icon: '🛻', need: need(2, 6, 20, 60), weight: 2, models: { truck: M('4x4 field truck', 55000, 8, 4000, { usedCost: 20000, lease: true }) } },
    instruments: { name: 'GPS, total stations & samplers', icon: '📐', need: need(2, 6, 20, 60), weight: 2, models: { gnss: M('Survey-grade GNSS / total station', 45000, 7, 2500, { lease: true }), sampler: M('Air & water sampling kit', 30000, 8, 2000) } },
    drones: { name: 'Mapping drones', icon: '🛸', need: need(1, 2, 6, 15), weight: 1, models: { lidar: M('LiDAR mapping drone', 60000, 4, 4000) } },
  } },
  renewables: { name: 'Crews & Equipment', categories: {
    trucks: { name: 'Crew trucks & trailers', icon: '🛻', need: need(2, 6, 20, 60), weight: 2, models: { truck: M('Crew truck with ladder rack', 60000, 7, 4500, { usedCost: 22000, lease: true }) } },
    lifts: { name: 'Lifts & cranes', icon: '🏗️', need: need(1, 2, 6, 20), weight: 2, models: { boom: M('Boom lift', 120000, 10, 6000, { usedCost: 45000, lease: true }), crane: M('Rented crane for turbine work (per year)', 0, 99, 0, { rent: 250000 }) } },
    tools: { name: 'Climbing & electrical gear', icon: '🧗', need: need(6, 20, 60, 200), weight: 1, models: { kit: M('Fall-arrest & arc-flash kit', 3000, 5, 200) } },
  } },
  pmc: { name: 'Vehicles & Kit', categories: {
    armored: { name: 'Armored SUVs', icon: '🚙', need: need(2, 8, 30, 100), weight: 3, models: { b6: M('B6 armored SUV', 250000, 7, 15000, { usedCost: 90000, lease: true }) } },
    kit: { name: 'Body armor & comms', icon: '🦺', need: need(10, 40, 150, 500), weight: 2, models: { kit: M('Plate carrier, radio & night vision', 15000, 6, 800) } },
    aircraft: { name: 'Aircraft', icon: '🚁', need: need(0, 1, 4, 12), weight: 1, models: { helo: M('Medium helicopter', 12000000, 25, 1000000, { usedCost: 4000000, lease: true }) } },
  } },

  /* ---------------- Offices & everything else ---------------- */
  corpOffice: { name: 'Offices & Technology', categories: {
    computers: COMPUTERS(need(10, 40, 200, 1000)),
    servers: { name: 'Servers, network & security', icon: '🗄️', need: need(1, 2, 6, 20), weight: 1.5, models: { rack: M('Server & network rack', 40000, 5, 3000, { lease: true }), cloud: M('Cloud & SaaS contract', 0, 99, 0, { rent: 60000 }) } },
    phones: { name: 'Phones & conferencing', icon: '📞', need: need(10, 40, 200, 1000), weight: 0.5, models: { kit: M('Laptop dock, headset & phone', 600, 4, 60, { lease: true }) } },
    offices: { name: 'Office space', icon: '🏢', need: need(1, 1, 3, 10), weight: 1, facility: true, models: { lease: M('Leased office floor', 0, 99, 0, { rent: 300000 }), own: M('Headquarters building (build)', 40000000, 50, 800000, { build: true }) } },
  } },
  designOffice: { name: 'Studio & Technology', categories: {
    workstations: { name: 'CAD workstations & licenses', icon: '🖥️', need: need(5, 20, 80, 300), weight: 2, models: { cad: M('CAD/BIM workstation & license', 9000, 4, 2500, { lease: true }) } },
    plotters: { name: 'Plotters & 3D printers', icon: '🖨️', need: need(1, 2, 6, 15), weight: 1, models: { plotter: M('Large-format plotter / 3D printer', 15000, 7, 1500) } },
    survey: { name: 'Site & test equipment', icon: '📏', need: need(1, 2, 6, 15), weight: 1, models: { kit: M('Scanner & test instruments', 40000, 8, 2000, { lease: true }) } },
  } },
  emergencyOps: { name: 'Fleet & Facilities', categories: {
    vehicles: { name: 'Response vehicles', icon: '🚙', need: need(4, 10, 25, 60), weight: 2, models: { ute: M('4x4 response vehicle', 65000, 6, 6000, { lease: true, usedCost: 26000 }) } },
    boats: { name: 'Flood rescue boats', icon: '🚤', need: need(1, 3, 8, 20), weight: 1, models: { flood: M('Flood rescue boat & trailer', 85000, 12, 3000), jet: M('Jet-drive swift-water boat', 140000, 15, 4500) } },
    generators: { name: 'Generators & lighting towers', icon: '🔦', need: need(4, 10, 25, 60), weight: 1, models: { gen: M('Trailer generator & lighting tower', 30000, 12, 1200) } },
    eoc: { name: 'Emergency operations centres', icon: '🏢', need: need(1, 1, 2, 4), weight: 1.5, facility: true, models: { own: M('Emergency operations centre (build with a bond)', 8000000, 40, 150000, { build: true }), leased: M('Leased operations centre', 0, 99, 0, { rent: 120000 }) } },
  } },
  agencyOffice: { name: 'Offices, Systems & Fleet', categories: {
    computers: COMPUTERS(need(15, 60, 250, 1000)),
    systems: { name: 'Case-management systems', icon: '🗄️', need: need(1, 1, 2, 4), weight: 2, models: { modern: M('Case-management system modernization', 2000000, 12, 200000, { refurb: true }) } },
    cars: { name: 'Motor pool', icon: '🚗', need: need(2, 6, 25, 80), weight: 1, models: { sedan: M('Government sedan', 30000, 8, 3000, { usedCost: 11000, lease: true }) } },
    offices: { name: 'Field offices', icon: '🏛️', need: need(1, 2, 6, 20), weight: 1, facility: true, models: { lease: M('Leased field office', 0, 99, 0, { rent: 180000 }), own: M('Government office building (bond)', 25000000, 50, 500000, { build: true }) } },
  } },
  courthouse: { name: 'Courtrooms & Systems', categories: {
    courtrooms: { name: 'Courtroom technology', icon: '⚖️', need: need(2, 6, 20, 60), weight: 2, models: { av: M('Evidence display, recording & video arraignment', 60000, 8, 3000) } },
    efiling: { name: 'E-filing & case system', icon: '🗄️', need: need(1, 1, 1, 2), weight: 2, models: { cms: M('Court case-management system', 3000000, 12, 300000, { refurb: true }) } },
    security: { name: 'Screening & security', icon: '🛂', need: need(1, 2, 4, 10), weight: 1.5, models: { mag: M('Magnetometer & X-ray station', 50000, 10, 3000) } },
    building: { name: 'Courthouse', icon: '🏛️', need: need(1, 1, 2, 4), weight: 1, facility: true, models: { own: M('New courthouse (bond)', 60000000, 60, 1200000, { build: true }) } },
  } },
  intel: { name: 'Facilities & Systems', categories: {
    scif: { name: 'SCIFs', icon: '🔒', need: need(1, 2, 6, 20), weight: 2, facility: true, models: { own: M('Accredited SCIF build-out', 3000000, 30, 100000, { build: true }) } },
    systems: { name: 'Classified networks & analytic tools', icon: '🛰️', need: need(10, 40, 200, 800), weight: 2, models: { ts: M('TS/SCI workstation & tools', 15000, 4, 3000) } },
    collection: { name: 'Collection equipment', icon: '📡', need: need(1, 2, 6, 20), weight: 1.5, models: { kit: M('Collection system (sustainment)', 5000000, 10, 400000, { refurb: true }) } },
  } },
  newsroom: { name: 'Newsroom Gear', categories: {
    cameras: { name: 'Cameras & audio kits', icon: '🎥', need: need(2, 6, 20, 60), weight: 2, models: { kit: M('Camera & audio kit', 15000, 5, 800, { usedCost: 5000 }) } },
    vans: { name: 'Live trucks', icon: '🚐', need: need(0, 1, 3, 8), weight: 1.5, models: { van: M('Live/satellite truck', 400000, 12, 20000, { usedCost: 100000 }), bonded: M('Bonded cellular backpack', 25000, 4, 6000, { lease: true }) } },
    cms: { name: 'Publishing & editing systems', icon: '🖥️', need: need(4, 15, 60, 200), weight: 1.5, models: { suite: M('Editing workstation & CMS seat', 6000, 4, 1500, { lease: true }) } },
  } },
  church: { name: 'Buildings & Equipment', categories: {
    sanctuary: { name: 'Sanctuary & roof', icon: '⛪', need: need(1, 1, 2, 4), weight: 3, models: { renovation: M('Roof, HVAC & sanctuary repairs', 60000, 20, 4000, { refurb: true }) } },
    av: { name: 'Sound, video & livestream', icon: '🎙️', need: need(1, 1, 2, 4), weight: 1, models: { av: M('Sound & livestream system', 40000, 8, 1500) } },
    vans: { name: 'Church vans & buses', icon: '🚐', need: need(1, 1, 2, 4), weight: 1, models: { van: M('15-passenger van', 50000, 10, 3500, { usedCost: 18000 }) } },
    hall: { name: 'Fellowship hall & school', icon: '🏫', need: need(0, 1, 2, 4), weight: 1, facility: true, models: { own: M('Fellowship hall (capital campaign)', 3000000, 50, 60000, { build: true }) } },
  } },
  therapyOffice: { name: 'Practice Equipment', categories: {
    rooms: { name: 'Therapy & testing rooms', icon: '🛋️', need: need(2, 6, 20, 60), weight: 2, models: { room: M('Therapy room outfit', 6000, 10, 200) } },
    tests: { name: 'Assessments & clinical tools', icon: '🧩', need: need(1, 3, 10, 30), weight: 1.5, models: { kit: M('Standardized test kits / therapy materials', 4000, 6, 300) } },
    telehealth: { name: 'Telehealth & EHR', icon: '💻', need: need(2, 6, 20, 60), weight: 1.5, models: { seat: M('Telehealth workstation & EHR seat', 3000, 4, 900, { lease: true }) } },
  } },
  athletics: { name: 'Facilities & Equipment', categories: {
    training: { name: 'Training & medical equipment', icon: '🏋️', need: need(10, 30, 80, 200), weight: 2, models: { rig: M('Training rig / recovery equipment', 15000, 8, 600) } },
    analytics: { name: 'Performance tracking', icon: '📊', need: need(1, 2, 4, 8), weight: 1, models: { gps: M('GPS vest & video analytics package', 120000, 4, 20000, { lease: true }) } },
    venue: { name: 'Training facility & stadium', icon: '🏟️', need: need(1, 1, 2, 3), weight: 2, facility: true, models: { own: M('Training facility (build)', 80000000, 40, 2000000, { build: true }), lease: M('Leased practice facility', 0, 99, 0, { rent: 1500000 }) } },
  } },
  homeCare: { name: 'Vehicles & Equipment', categories: {
    vans: { name: 'Accessible vans', icon: '🚐', need: need(1, 3, 10, 30), weight: 2, models: { van: M('Wheelchair-accessible van', 60000, 8, 4000, { usedCost: 22000 }) } },
    lifts: { name: 'Patient lifts & aids', icon: '🦽', need: need(4, 12, 40, 120), weight: 2, models: { lift: M('Patient lift & transfer aids', 4000, 8, 200) } },
    evv: { name: 'Visit-verification tablets', icon: '📱', need: need(10, 30, 100, 300), weight: 1, models: { tab: M('EVV tablet & plan', 500, 3, 240, { lease: true }) } },
  } },

  /* ---------------- Volunteer emergency services ---------------- */
  volFire: { name: 'Apparatus & Firehouse', categories: {
    engine: { name: 'Engines', icon: '🚒', need: need(1, 2, 3, 4), weight: 3, models: { pumper: M('Pumper engine', 850000, 20, 18000, { usedCost: 180000, refurb: true }), cafs: M('Custom pumper with foam system', 1050000, 22, 16000, { refurb: true }) } },
    tanker: { name: 'Tankers', icon: '💧', need: need(1, 1, 2, 2), weight: 1.5, models: { tanker: M('Tanker/tender', 400000, 25, 9000, { usedCost: 90000 }) } },
    brush: { name: 'Brush truck', icon: '🌲', need: need(1, 1, 1, 2), weight: 0.5, models: { brush: M('Brush truck', 300000, 15, 6000, { usedCost: 60000 }) } },
    scba: { name: 'SCBA & turnout gear', icon: '🫁', need: need(12, 20, 30, 40), weight: 2, models: { scba: M('SCBA + turnout set', 12000, 10, 400) } },
    house: { name: 'Firehouse', icon: '🏚️', need: need(1, 1, 1, 2), weight: 1, facility: true, models: { own: M('New firehouse (fund drive + loan)', 3500000, 50, 40000, { build: true }) } },
  } },
  volEms: { name: 'Rigs & Building', categories: {
    ambulance: { name: 'Ambulances', icon: '🚑', need: need(2, 3, 4, 6), weight: 3, models: { box: M('Type III ambulance', 240000, 10, 12000, { usedCost: 60000, remount: true }), powered: M('Type I ambulance with powered stretcher', 310000, 12, 11000, { remount: true }) } },
    monitors: { name: 'Cardiac monitors & AEDs', icon: '💓', need: need(2, 3, 4, 6), weight: 1.5, models: { monitor: M('Cardiac monitor', 40000, 8, 1200, { usedCost: 12000 }) } },
    building: { name: 'Squad building', icon: '🏠', need: need(1, 1, 1, 1), weight: 1, facility: true, models: { own: M('New squad building (fund drive + loan)', 1500000, 40, 20000, { build: true }) } },
  } },
  sar: { name: 'Team Equipment', categories: {
    trucks: { name: 'Team trucks & trailers', icon: '🛻', need: need(1, 2, 3, 4), weight: 2, models: { truck: M('4x4 team truck', 60000, 10, 4000, { usedCost: 20000 }) } },
    drones: { name: 'Thermal drones', icon: '🛸', need: need(1, 2, 3, 4), weight: 1.5, models: { drone: M('Thermal search drone', 15000, 4, 800) } },
    radios: { name: 'Radios & GPS', icon: '📻', need: need(10, 15, 25, 40), weight: 1.5, models: { radio: M('Handheld radio + GPS', 1500, 6, 100) } },
    rope: { name: 'Rope & technical gear', icon: '🧗', need: need(1, 2, 3, 4), weight: 1, models: { cache: M('Technical rope cache', 12000, 6, 500) } },
  } },
  auxiliary: { name: 'Facilities (members\' boats)', categories: {
    boats: { name: 'Operational facilities (boats)', icon: '🚤', need: need(1, 2, 3, 4), weight: 3, models: { boat: M('Patrol-qualified member vessel', 70000, 20, 4000, { usedCost: 25000 }) } },
    radios: { name: 'Radios', icon: '📻', need: need(2, 4, 6, 8), weight: 1, models: { vhf: M('Marine VHF & radio facility', 3000, 10, 100) } },
  } },
  cap: { name: 'Aircraft & Vans', categories: {
    aircraft: { name: 'Aircraft', icon: '🛩️', need: need(1, 1, 2, 3), weight: 3, models: { c182: M('Cessna 182 with search equipment', 650000, 30, 30000, { usedCost: 180000, refurb: true }) } },
    vans: { name: 'Ground-team vans', icon: '🚐', need: need(1, 1, 2, 3), weight: 1, models: { van: M('Ground-team van', 55000, 10, 3000, { usedCost: 15000 }) } },
  } },
  cert: { name: 'Team Equipment', categories: {
    trailers: { name: 'Response trailers', icon: '🚛', need: need(1, 1, 2, 3), weight: 2, models: { trailer: M('CERT response trailer', 25000, 15, 800, { usedCost: 8000 }) } },
    kits: { name: 'Member kits', icon: '🎒', need: need(15, 25, 40, 60), weight: 1.5, models: { kit: M('Helmet, vest & go-bag', 250, 6, 0) } },
  } },
  redcross: { name: 'Vehicles & Supplies', categories: {
    erv: { name: 'Emergency response vehicles', icon: '🚐', need: need(1, 2, 4, 8), weight: 3, models: { erv: M('Emergency response vehicle', 120000, 12, 6000, { usedCost: 40000 }) } },
    shelter: { name: 'Shelter trailers', icon: '⛺', need: need(1, 2, 4, 8), weight: 1.5, models: { trailer: M('Shelter supply trailer (200 cots)', 45000, 15, 1500) } },
  } },
  skiPatrol: { name: 'Patrol Equipment', categories: {
    sleds: { name: 'Snowmobiles & toboggans', icon: '🛷', need: need(2, 4, 6, 10), weight: 3, models: { sled: M('Snowmobile', 16000, 8, 1500, { usedCost: 6000 }), tobog: M('Rescue toboggan', 4000, 10, 100) } },
    aeds: { name: 'AEDs & trauma packs', icon: '💓', need: need(3, 5, 8, 12), weight: 1.5, models: { aed: M('AED & trauma pack', 3500, 8, 150) } },
  } },
  wildlandVol: { name: 'Crew Equipment', categories: {
    engines: { name: 'Type 6 engines', icon: '🚒', need: need(1, 2, 3, 4), weight: 3, models: { type6: M('Type 6 engine', 250000, 15, 6000, { usedCost: 60000 }) } },
    saws: { name: 'Saws & hand tools', icon: '🪚', need: need(4, 8, 12, 20), weight: 1, models: { saw: M('Chainsaw & tool cache', 2500, 5, 200) } },
  } },
  mrc: { name: 'Clinic Supplies', categories: {
    trailers: { name: 'Mobile clinic trailers', icon: '🚛', need: need(1, 1, 2, 3), weight: 2, models: { trailer: M('Mobile clinic/POD trailer', 60000, 15, 2000) } },
    kits: { name: 'Vaccination & first-aid kits', icon: '💉', need: need(4, 8, 12, 20), weight: 1, models: { kit: M('Clinic kit', 2000, 5, 100) } },
  } },

  volPolice: { name: 'Vehicles & Kit', categories: {
    cars: { name: 'Reserve patrol cars', icon: '🚓', need: need(1, 2, 4, 6), weight: 3, models: { cruiser: M('Patrol car (retired from the regular fleet)', 55000, 5, 6000, { usedCost: 12000 }) } },
    radios: { name: 'Radios & body armor', icon: '📻', need: need(8, 15, 25, 40), weight: 2, models: { kit: M('Radio + vest', 5000, 6, 200) } },
  } },
  fema: { name: 'Deployment Kit', categories: {
    kits: { name: 'Laptops, phones & go-kits', icon: '💼', need: need(10, 20, 40, 80), weight: 2, models: { kit: M('Deployment laptop & go-kit', 3500, 4, 300) } },
    vehicles: { name: 'Mobile units', icon: '🚐', need: need(1, 2, 4, 8), weight: 1.5, models: { mdrc: M('Mobile disaster recovery center', 400000, 15, 15000) } },
  } },
  dmat: { name: 'Field Hospital Cache', categories: {
    tents: { name: 'Shelters & power', icon: '⛺', need: need(4, 8, 12, 20), weight: 2, models: { shelter: M('Field hospital shelter with generator', 120000, 12, 5000) } },
    medical: { name: 'Medical cache', icon: '🩺', need: need(1, 2, 3, 4), weight: 3, models: { cache: M('35-person team medical cache', 600000, 8, 30000, { refurb: true }) } },
    trucks: { name: 'Cache trucks', icon: '🚚', need: need(1, 2, 3, 4), weight: 1, models: { truck: M('Box truck', 90000, 12, 5000, { usedCost: 30000 }) } },
  } },
  usar: { name: 'Task Force Cache', categories: {
    cache: { name: 'Rescue equipment cache', icon: '🧱', need: need(1, 1, 2, 3), weight: 3, models: { cache: M('USAR equipment cache (search cameras, shoring, breaching)', 2500000, 10, 100000, { refurb: true }) } },
    trucks: { name: 'Tractor-trailers', icon: '🚛', need: need(1, 2, 3, 4), weight: 1.5, models: { rig: M('Tractor-trailer', 220000, 12, 12000, { usedCost: 70000 }) } },
    k9: { name: 'Search dogs', icon: '🐕', need: need(2, 4, 6, 8), weight: 1, models: { dog: M('Certified search dog (training)', 30000, 8, 4000) } },
  } },
  teamRubicon: { name: 'Team Equipment', categories: {
    saws: { name: 'Chainsaws & muck-out kits', icon: '🪚', need: need(6, 10, 20, 30), weight: 2, models: { saw: M('Chainsaw & PPE kit', 2000, 4, 200) } },
    trailers: { name: 'Equipment trailers', icon: '🚛', need: need(1, 2, 3, 4), weight: 2, models: { trailer: M('Enclosed equipment trailer', 30000, 15, 1000, { usedCost: 10000 }) } },
    heavy: { name: 'Heavy equipment', icon: '🚜', need: need(0, 1, 2, 3), weight: 1, models: { skid: M('Skid steer', 70000, 10, 4000, { usedCost: 25000 }) } },
  } },
  ares: { name: 'Radio Equipment', categories: {
    radios: { name: 'Go-kits', icon: '📻', need: need(4, 8, 15, 25), weight: 2, models: { kit: M('HF/VHF go-kit with battery', 2500, 8, 100) } },
    comms: { name: 'Communications trailer', icon: '📡', need: need(1, 1, 1, 2), weight: 2, models: { trailer: M('Emergency comms trailer with mast', 80000, 15, 2000, { usedCost: 25000 }) } },
    repeaters: { name: 'Repeaters', icon: '🗼', need: need(1, 2, 3, 5), weight: 1, models: { repeater: M('Repeater with backup power', 8000, 12, 300) } },
  } },
  sdf: { name: 'Equipment', categories: {
    vehicles: { name: 'Vehicles', icon: '🚙', need: need(2, 4, 8, 12), weight: 2, models: { suv: M('Surplus SUV / van', 40000, 8, 3000, { usedCost: 12000 }) } },
    comms: { name: 'Radios & comms', icon: '📻', need: need(10, 20, 40, 60), weight: 2, models: { radio: M('Interoperable radio', 3000, 8, 100) } },
    shelter: { name: 'Shelter & POD kits', icon: '⛺', need: need(1, 2, 4, 6), weight: 1, models: { pod: M('Point-of-distribution kit', 20000, 10, 500) } },
  } },

  /* ---------------- Military ---------------- */
  milGround: { name: 'Equipment Readiness', categories: {
    tactical: { name: 'Tactical vehicles', icon: '🚙', need: need(10, 30, 120, 400), weight: 3, models: { hmmwv: M('HMMWV', 220000, 20, 15000, { refurb: true }), jltv: M('JLTV', 450000, 25, 12000, { refurb: true }) } },
    combat: { name: 'Combat vehicles', icon: '🪖', need: need(4, 14, 44, 120), weight: 3, models: { bradley: M('M2 Bradley', 4300000, 30, 180000, { refurb: true }), stryker: M('Stryker', 4900000, 30, 160000, { refurb: true }), abrams: M('M1A2 Abrams', 9000000, 35, 300000, { refurb: true }) } },
    comms: { name: 'Radios & mission command', icon: '📡', need: need(20, 60, 200, 600), weight: 1.5, models: { radio: M('Tactical radio set', 40000, 12, 1500) } },
    night: { name: 'Night vision & optics', icon: '🥽', need: need(30, 100, 400, 1200), weight: 1, models: { pvs31: M('Night-vision goggles', 13000, 10, 300) } },
  } },
  milNaval: { name: 'Ship & Aircraft Readiness', categories: {
    systems: { name: 'Shipboard systems', icon: '⚓', need: need(4, 10, 30, 80), weight: 3, models: { system: M('Engineering/combat system', 3000000, 25, 120000, { refurb: true }) } },
    boats: { name: 'Small boats', icon: '🚤', need: need(1, 2, 4, 8), weight: 1, models: { rhib: M('RHIB', 400000, 15, 20000, { refurb: true }) } },
    aircraft: { name: 'Embarked aircraft', icon: '🚁', need: need(0, 2, 6, 40), weight: 2, models: { seahawk: M('MH-60R Seahawk', 40000000, 30, 2500000, { refurb: true }), hornet: M('F/A-18E/F Super Hornet', 67000000, 30, 4000000, { refurb: true }) } },
  } },
  milAir: { name: 'Aircraft Readiness', categories: {
    aircraft: { name: 'Aircraft', icon: '✈️', need: need(6, 18, 54, 100), weight: 3, models: { f16: M('F-16', 63000000, 40, 3000000, { refurb: true }), c130: M('C-130J', 75000000, 40, 3500000, { refurb: true }), f35: M('F-35A', 82000000, 40, 4000000, { refurb: true }) } },
    age: { name: 'Aerospace ground equipment', icon: '🔧', need: need(10, 30, 90, 200), weight: 1.5, models: { cart: M('Ground power & air cart', 80000, 15, 4000, { refurb: true }) } },
    vehicles: { name: 'Flightline vehicles', icon: '🚚', need: need(6, 18, 50, 120), weight: 1, models: { truck: M('Flightline truck', 60000, 12, 3000) } },
  } },
  milMarine: { name: 'Equipment Readiness', categories: {
    tactical: { name: 'Tactical vehicles', icon: '🚙', need: need(10, 30, 100, 300), weight: 3, models: { hmmwv: M('HMMWV', 220000, 20, 15000, { refurb: true }), jltv: M('JLTV', 450000, 25, 12000, { refurb: true }) } },
    amphib: { name: 'Amphibious & light armored vehicles', icon: '🐊', need: need(2, 12, 40, 120), weight: 3, models: { aav: M('AAV-7 amphibious assault vehicle', 3000000, 30, 120000, { refurb: true }), acv: M('Amphibious Combat Vehicle', 7000000, 30, 150000, { refurb: true }), lav: M('LAV-25', 3000000, 30, 100000, { refurb: true }) } },
    aircraft: { name: 'Aircraft', icon: '🚁', need: need(0, 2, 12, 40), weight: 1.5, models: { mv22: M('MV-22 Osprey', 90000000, 30, 5000000, { refurb: true }), f35b: M('F-35B', 110000000, 40, 6000000, { refurb: true }) } },
    comms: { name: 'Radios & mission command', icon: '📡', need: need(20, 60, 200, 600), weight: 1.5, models: { radio: M('Tactical radio set', 40000, 12, 1500) } },
  } },
  milSpace: { name: 'Space Systems Readiness', categories: {
    ground: { name: 'Satellite ground stations & antennas', icon: '📡', need: need(2, 4, 10, 25), weight: 3, models: { afscn: M('Satellite control antenna', 40000000, 30, 1500000, { refurb: true }) } },
    radar: { name: 'Missile-warning & space-tracking radars', icon: '🛰️', need: need(0, 1, 3, 6), weight: 2, models: { upgrade: M('Phased-array radar (sustainment)', 300000000, 40, 10000000, { refurb: true }) } },
    ops: { name: 'Operations floor consoles', icon: '🖥️', need: need(10, 30, 90, 200), weight: 1.5, models: { console: M('Ops console & cyber suite', 150000, 7, 12000) } },
  } },
  milUsphs: { name: 'Clinical Readiness', categories: {
    clinics: { name: 'Clinic & hospital equipment', icon: '🏥', need: need(4, 12, 40, 100), weight: 3, models: { suite: M('Exam / procedure suite', 250000, 12, 15000, { refurb: true }) } },
    deploy: { name: 'Deployable medical caches', icon: '🎒', need: need(1, 2, 6, 15), weight: 2, models: { cache: M('Rapid Deployment Force medical cache', 900000, 10, 40000, { refurb: true }) } },
    vehicles: { name: 'Service vehicles', icon: '🚐', need: need(2, 6, 20, 60), weight: 1, models: { van: M('Government van', 45000, 8, 3500) } },
  } },
  milNoaa: { name: 'Ship & Aircraft Readiness', categories: {
    ships: { name: 'Research & survey ships', icon: '🚢', need: need(1, 2, 4, 8), weight: 3, models: { survey: M('Hydrographic survey ship', 150000000, 35, 8000000, { refurb: true }) } },
    launches: { name: 'Survey launches', icon: '🚤', need: need(2, 4, 8, 16), weight: 1.5, models: { launch: M('Survey launch', 2000000, 20, 80000, { refurb: true }) } },
    aircraft: { name: 'Hurricane-hunter aircraft', icon: '✈️', need: need(0, 1, 2, 4), weight: 2, models: { p3: M('WP-3D Orion', 120000000, 50, 6000000, { refurb: true }), g4: M('Gulfstream IV-SP', 60000000, 40, 3000000, { refurb: true }) } },
  } },
  milCoastGuard: { name: 'Cutters & Boats', categories: {
    cutters: { name: 'Cutters', icon: '🚢', need: need(1, 2, 4, 10), weight: 3, models: { frc: M('Fast Response Cutter', 65000000, 30, 2000000, { refurb: true }) } },
    boats: { name: 'Response boats', icon: '🚤', need: need(2, 4, 8, 16), weight: 2, models: { rbm: M('45-ft Response Boat–Medium', 4000000, 20, 150000, { refurb: true }) } },
    helos: { name: 'Helicopters', icon: '🚁', need: need(0, 1, 2, 4), weight: 1.5, models: { jayhawk: M('MH-60T Jayhawk', 40000000, 30, 2500000, { refurb: true }) } },
  } },
};

/** What the dearer (or cheaper) model buys you: `group.category.model` → { why, quality, capacity }. */
const PERKS = {
  'police.patrol.suv': { quality: 1.06, why: 'Room for gear and a prisoner partition; better in snow' },
  'police.patrol.hybrid': { quality: 1.06, why: 'The SUV, but $3,000 a year less in fuel and upkeep — it pays back its premium' },
  'campusPolice.patrol.hybrid': { why: '$3,000 a year less in fuel and upkeep than the gas SUV' },
  'campusPolice.bikes.cart': { capacity: 3, why: 'Carries two officers and an AED: covers the ground of three bike posts' },
  'airportPolice.patrol.cart': { capacity: 0.5, why: 'Cheap and nimble in the terminal, but no pursuits: half a patrol car' },
  'federalLE.cars.suv': { quality: 1.06, why: 'Room for tactical and surveillance gear' },
  'borderPatrol.atvs.horse': { why: 'Quiet, goes where ATVs can\'t and lasts 15 years — but costs more to keep' },
  'borderPatrol.drones.drone': { capacity: 0.35, why: 'Far cheaper, but watches a fraction of what a fixed tower does' },
  'fire.engine.quint': { quality: 1.15, why: 'Pump and a 75-ft aerial in one: does more on the fireground and lasts longer' },
  'fire.ladder.tiller': { quality: 1.1, why: 'Rear-steer: gets a 100-ft aerial down narrow streets' },
  'arff.crash.compact': { capacity: 0.5, why: 'Half the price, half the firefighting agent' },
  'ems.ambulance.box': { quality: 1.1, why: 'More room to work a cardiac arrest, and two more years of service' },
  'corrections.vans.bus': { capacity: 4, why: 'Moves forty prisoners at once: does the work of four vans' },
  'corrections.cameras.scanner': { quality: 1.15, why: 'Body scanning finds the contraband cameras miss' },
  'postal.trucks.ngdv': { quality: 1.1, why: 'Air conditioning, airbags and half the upkeep of an LLV' },
  'water.trucks.vac': { capacity: 3, why: 'Hydro-excavation: digs out a main break in hours, the work of three crews' },
  'transit.bus.hybrid': { why: '$10,000 a year less in fuel and maintenance' },
  'transit.bus.electric': { quality: 1.05, why: 'The lowest running cost of all — $22,000 a year less than diesel — and quiet' },
  'schoolBus.bus.electric': { quality: 1.05, why: 'Half the upkeep, no diesel fumes at the bus stop, and two more years of life' },
  'hospitalUnit.imaging.mri': { quality: 1.15, why: 'Images soft tissue a CT can\'t — the referrals follow' },
  'kitchen.line.combi': { capacity: 2, why: 'Steams, roasts and bakes: replaces two ranges on the line' },
  'autoShop.lifts.alignment': { quality: 1.15, why: 'Alignment work: high-margin jobs a plain lift can\'t do' },
  'dental.imaging.cbct': { quality: 1.15, why: '3D scans for implants and root canals' },
  'retail.fixtures.cooler': { quality: 1.1, why: 'Cold drinks and food sell at better margins' },
  'care.buses.bus': { capacity: 2.5, why: 'Carries what two and a half vans do' },
  'truckFleet.tractors.sleeper': { quality: 1.06, why: 'Long-haul runs without motel nights' },
  'truckFleet.trailers.reefer': { quality: 1.12, why: 'Refrigerated freight pays more a mile' },
  'construction.earth.skid': { capacity: 0.35, why: 'Cheap, but small jobs only' },
  'railroad.locos.tier4': { quality: 1.05, why: 'Cleaner and $30,000 a year cheaper to run' },
  'airline.aircraft.regional': { capacity: 0.6, why: 'Fewer seats: about 60% of a narrowbody\'s flying' },
  'airline.aircraft.turboprop': { capacity: 0.25, why: 'Short hops only: a quarter of a narrowbody\'s flying' },
  'farm.tractors.utility': { capacity: 0.4, why: 'Chores and small fields, not row crops' },
  'fishingFleet.vessels.crabber': { quality: 1.1, why: 'Fishes the higher-value crab seasons' },
  'lab.instruments.cryoem': { quality: 1.15, why: 'Atomic-resolution structures: the papers and grants follow' },
  'security.vehicles.cart': { capacity: 0.5, why: 'Fine for a campus or mall, but half a patrol vehicle' },
  'newsroom.vans.bonded': { capacity: 0.5, why: 'Live from anywhere with a backpack kit — but not a full truck' },
  'skiPatrol.sleds.tobog': { capacity: 0.4, why: 'Cheap, but a patroller has to ski it down' },
  'volFire.engine.cafs': { quality: 1.12, why: 'Foam knocks fire down faster with less water — vital where there are no hydrants' },
  'volEms.ambulance.powered': { quality: 1.1, why: 'A powered stretcher saves backs (fewer crew injuries) and lasts longer' },
  'milGround.tactical.jltv': { quality: 1.12, why: 'Survives blasts a Humvee doesn\'t, and cheaper to keep' },
  'milGround.combat.stryker': { quality: 1.04, why: 'Faster on roads; carries a full squad' },
  'milGround.combat.abrams': { quality: 1.15, why: 'A main battle tank: firepower and armour nothing else in the company has' },
  'milMarine.tactical.jltv': { quality: 1.12, why: 'Survives blasts a Humvee doesn\'t, and cheaper to keep' },
  'milMarine.amphib.acv': { quality: 1.12, why: 'Faster in the surf and far better protected than the AAV' },
  'milNaval.aircraft.hornet': { quality: 1.1, why: 'Strike and air defence a helicopter can\'t give' },
  'milAir.aircraft.f35': { quality: 1.15, why: 'Stealth and sensors: the most capable jet on the ramp' },
  'milMarine.aircraft.f35b': { quality: 1.1, why: 'A stealth jet that lands vertically on an amphibious ship' },
};
for (const [path, perk] of Object.entries(PERKS)) {
  const [g, c, m] = path.split('.');
  const model = GROUPS[g]?.categories[c]?.models[m];
  if (model) Object.assign(model, perk);
}
// A category with stated perks is judged by them: the rest of its models are standard (quality 1).
for (const g of Object.values(GROUPS)) for (const cat of Object.values(g.categories)) {
  if (Object.values(cat.models).some((m) => m.why)) for (const m of Object.values(cat.models)) m.quality ??= 1;
}


/* ------------------------------------------------------------------ */
/* Equipment of its day                                                */
/* ------------------------------------------------------------------ */

/**
 * The catalogue as it was in the year being played. A category that didn't exist yet (body
 * cameras, drones, CT scanners, CNC machines) isn't needed and isn't offered; one that existed in
 * an older form shows that form (horses and wagons before motor vehicles, horse-drawn steam
 * engines, call boxes and whistles before radios, typewriters before computers, iceboxes before
 * refrigeration); models that came later (SUVs, hybrids, electrics, P25 radios) are left off the
 * list, though units already bought keep their records.
 */
const ERA_CATEGORIES = [
  // [pattern on the category's name, first year, what stood in for it before (or null: nothing)]
  [/^Radios & body cameras$/, 1935, { name: 'Call boxes & whistles', model: ['Police call box & whistle', 1500, 30, 50] }],
  [/^Computers & software$/, 1980, { name: 'Typewriters & filing', model: ['Typewriters & filing cabinets', 900, 15, 60] }],
  [/^Publishing & editing systems$/, 1985, { name: 'Typewriters & copy desk', model: ['Typewriters & copy desk', 900, 15, 60] }],
  [/^CAD workstations/, 1985, { name: 'Drafting tables', model: ['Drafting table & instruments', 700, 20, 40] }],
  [/^Servers/, 1965, null], [/^Case-management systems$/, 1990, null], [/^E-filing/, 1995, null], [/^Telehealth/, 2000, null], [/^Classified networks/, 1985, null], [/^Computing cluster$/, 1960, null], [/^Laptops/, 1995, null], [/^ELDs/, 2010, null],
  [/^Dispatch consoles & CAD$/, 1975, { name: 'Switchboard & dispatch desk', model: ['Telephone switchboard & dispatch desk', 6000, 20, 300] }],
  [/^Point of sale$/, 1975, { name: 'Cash registers', model: ['Mechanical cash register', 900, 25, 40] }],
  [/^Classroom technology$/, 1980, { name: 'Blackboards & slates', model: ['Blackboards, slates & maps', 400, 20, 20] }],
  [/^Phones & conferencing$/, 1880, null],
  [/^Walk-ins & refrigeration$|^Shelving & refrigeration$|^Vaccine cold storage$/, 1925, { name: 'Ice room & iceboxes', model: ['Icebox & ice deliveries', 600, 15, 400] }],
  [/^CNC machines$/, 1975, { name: 'Lathes & milling machines', model: ['Belt-driven lathe & mill', 12000, 30, 600] }],
  [/^Forklifts$/, 1925, { name: 'Hand trucks & hoists', model: ['Hand truck & chain hoist', 800, 15, 50] }],
  [/^Vehicle lifts$/, 1925, { name: 'Inspection pits', model: ['Inspection pit', 3000, 40, 50] }],
  [/^Diagnostic scanners$/, 1996, null],
  [/camera|Cameras & access control|Cameras & body scanners/i, 1975, null, /Cameras, consoles & lights|Cameras & audio kits/],
  [/^Cameras, consoles & lights$|^Cameras & audio kits$/, 1900, null],
  [/drone|Surveillance towers/i, 2005, null],
  [/^ELDs/, 2010, null],
  [/K-9/, 1960, null],
  [/Armored/, 1935, null],
  [/^Blue-light emergency phones$/, 1970, null],
  [/SCBA/, 1945, { name: 'Smoke helmets & leather turnout', model: ['Smoke helmet & leather coat', 300, 10, 20] }],
  [/^Air tankers$/, 1955, null], [/Helicopters|helitack/i, 1950, null], [/^Aircraft$|^Embarked aircraft$|^Aerospace ground equipment$|^Flightline vehicles$|^Ground support equipment$|^Hangars & gates$/, 1915, null], [/Hurricane-hunter/, 1944, null],
  [/^ARFF/, 1945, null],
  [/Cardiac monitors|AEDs/, 1970, null], [/^Power-load stretchers$/, 2010, { name: 'Stretchers', model: ['Stretcher', 200, 10, 10] }],
  [/^Smart IV pumps$/, 1990, null], [/^Patient monitors$/, 1960, null], [/^Imaging \(CT\/MRI\)$/, 1975, null], [/^Imaging$/, 1900, null],
  [/^911 centers/, 1968, { name: 'Telephone exchange & fire alarm boxes', model: ['Fire alarm telegraph', 20000, 30, 1000] }],
  [/^Radio towers & repeaters$|^Repeaters$|^Radios & backups$|^Radios & comms$|^Radios$|^Radios & GPS$|^Communications trailer$/, 1935, null],
  [/^Radios & mission command$/, 1935, { name: 'Field telegraph & signals', model: ['Field telegraph & signal flags', 6000, 15, 300] }],
  [/GPS/, 1995, null], [/^Plotters & 3D printers$/, 1985, null], [/^Sound, video & livestream$/, 1930, null], [/^Live trucks$/, 1955, null],
  [/Body scanners|CT bag scanners|Explosive trace/, 2002, null], [/^Doppler radar$/, 1988, null], [/^Radar$/, 1940, null], [/^Satellite ground stations|Missile-warning/, 1960, null],
  [/^Night vision/, 1960, { name: 'Small arms & field glasses', model: ['Rifles, bayonets & field glasses', 2500, 20, 150] }], [/^DNA instruments$/, 1987, null], [/^Drug chemistry/, 1970, null], [/^Drug-testing equipment$/, 1985, null], [/^Upper-air sounding/, 1930, null],
  [/^Hi-rail trucks$/, 1940, null], [/^Shampoo bowls & dryers$/, 1920, null], [/^Cardio machines$/, 1970, { name: 'Rowing machines & bicycles', model: ['Rowing machine & stationary bicycle', 1200, 15, 60] }], [/^Racks & strength machines$/, 1950, { name: 'Barbells & Indian clubs', model: ['Barbells, dumbbells & Indian clubs', 800, 25, 20] }], [/^Performance tracking$/, 2000, null],
  [/Snowmobiles/, 1960, null], [/^ATVs & horses$/, 1975, { name: 'Horses', model: ['Patrol horse', 8000, 15, 4000] }], [/^ATVs & snowmobiles$/, 1960, null],
  [/Dozers|^Loaders & backhoes$|^Excavators & loaders$|^Heavy equipment$/, 1930, null], [/^Bucket trucks$|^Digger derricks$/, 1950, null],
  [/^Paratransit vans$|^Accessible vans$/, 1975, null], [/Visit-verification/, 2010, null], [/^Gas monitors/, 1970, null], [/^Workover & frac/, 1950, null], [/^Body armor|^Radios & body armor$/, 1975, null],
  [/^Tactical vehicles$/, 1916, { name: 'Horses & wagons', model: ['Cavalry horses & supply wagons', 4000, 12, 1500] }], [/^Combat vehicles$/, 1916, { name: 'Field artillery', model: ['Horse-drawn field gun', 15000, 25, 2000] }], [/^Amphibious & light armored vehicles$/, 1940, null], [/^Generators & lighting towers$/, 1910, null], [/^Mobile clinic|^Mobile units$|^Bookmobiles$|^Mobile clinics$/, 1910, null],
  [/^Brush trucks?$|^Water tenders$|^Type 6 engines$|^Wildland engines/, 1920, null], [/^Tankers$/, 1910, null], [/^Thermal drones$|^Mapping drones$/, 2010, null],
  [/trailers?$|^Tractor-trailers$/i, 1915, null], [/^Cache trucks$|^Shelter & POD kits$/, 1915, null],
  [/^Courtroom technology$/, 1990, null], [/^Screening & security$/, 1970, null], [/^Ventilation & lead abatement$/, 1970, null], [/^Controller positions$|^Towers & TRACONs$/, 1930, null],
  // Motor vehicles: horses and wagons before 1905.
  [/^Engines$|^Heavy rescue$/, 1910, { name: 'Horse-drawn steam fire engines', model: ['Horse-drawn steam fire engine', 15000, 20, 3000] }],
  [/^Ladder trucks$/, 1910, { name: 'Horse-drawn ladder wagons', model: ['Horse-drawn hook-and-ladder wagon', 8000, 20, 2500] }],
  [/^Ambulances$/, 1910, { name: 'Horse-drawn ambulances', model: ['Horse-drawn ambulance', 4000, 15, 2000] }],
  [/^Hearses & limousines$/, 1910, { name: 'Horse-drawn hearses', model: ['Horse-drawn glass hearse', 5000, 20, 2500] }],
  [/^Buses$|^School buses$|^Vans & buses$|^Church vans & buses$|^Inmate transport vans/, 1905, { name: 'Horse buses & wagons', model: ['Horse-drawn omnibus', 4000, 15, 2500] }],
  [/^Motorcycles$/, 1910, null],
  [/^Delivery vehicles$/, 1905, { name: 'Mail wagons', model: ['Horse-drawn mail wagon', 2500, 15, 1500] }],
  [/car|vehicle|truck|van\b|vans|^Motor pool$|Bucars|^Field cars$|^Armored SUVs$/i, 1905, { name: 'Horses & wagons', model: ['Horse and wagon', 3000, 12, 1500] }],
  [/^Tractors$/, 1915, { name: 'Draught horses', model: ['Draught horse team', 2500, 12, 1500] }],
  [/^Combines & harvesters$/, 1930, { name: 'Reapers & threshers', model: ['Horse-drawn reaper & threshing machine', 6000, 20, 400] }],
];
/** Models that came later than their category. */
/** Categories known by a plainer name before a year: [pattern, until, older name]. */
const NAME_OLD = [
  [/^Radios & body cameras$/, 2014, 'Radios'], [/^Radios & GPS$/, 1995, 'Radios'], [/^Sound, video & livestream$/, 2010, 'Sound system'], [/^Nets, pots & electronics$/, 1950, 'Nets & pots'],
  [/^Bicycles & carts$/, 1960, 'Bicycles'], [/^Body armor & comms$/, 1975, 'Radios & kit'],
];
/** Models known by an older name before a year: [pattern, until, older name] (the unit keeps its id). */
const MODEL_OLD = [
  [/^Digital X-ray$/, 1990, 'X-ray machine'], [/^Panoramic X-ray$/, 1960, 'Dental X-ray'], [/^Electric hospital bed$/, 1960, 'Hospital bed'],
  [/^Commercial range\/oven$/, 1920, 'Coal-fired kitchen range'], [/^Hydraulic styling chair$/, 1930, 'Barber\'s chair'],
  [/^Delivery barcode sorter$/, 1960, 'Pigeonhole sorting cases'], [/^Delivery barcode sorter$/, 1985, 'Letter-sorting machine'],
  [/^Coordinate measuring machine$/, 1960, 'Gauges & surface plate'], [/^Pallet racking bay$/, 1940, 'Warehouse shelving'],
  [/^Pro camera \/ console package$/, 1950, 'Studio camera & lights'], [/^Camera & audio kit$/, 1950, 'Press camera & notebook'],
  [/^53-ft dry van$/, 1990, '40-ft van trailer'], [/^Crawler crane$/, 1920, 'Steam crane'], [/^Scissor lift \/ tool trailer$/, 1970, 'Scaffolding & hand tools'],
  [/^AC4400 road locomotive$/, 1950, 'Steam locomotive'], [/^AC4400 road locomotive$/, 1994, 'Diesel road locomotive'], [/^Tamper \/ regulator$/, 1950, 'Section gang & handcar'],
  [/^Grain bin \/ pole barn$/, 1940, 'Barn & granary'], [/^Trawler \/ longliner$/, 1920, 'Sailing schooner'], [/^Gear & electronics package$/, 1950, 'Nets & pots'],
  [/^Cruise ship$/, 1965, 'Ocean liner'], [/^Enclosed lifeboat & davit$/, 1975, 'Open lifeboat & davit'], [/^Integrated bridge system$/, 1950, 'Bridge telegraph & compass'], [/^Integrated bridge system$/, 1990, 'Radar & gyrocompass'],
  [/^Land drilling rig$/, 1930, 'Cable-tool derrick'], [/^STARS display position$/, 1950, 'Flight-strip board'], [/^STARS display position$/, 2000, 'Radar scope position'],
  [/^Automated surface station$/, 1990, 'Weather station & observer'], [/^Lane with target retriever$/, 1950, 'Shooting lane & target butts'],
  [/^PCR \/ sequencing instrument$/, 1985, 'Bacteriology bench'], [/^Accredited SCIF build-out$/, 1960, 'Secure vault & strongroom'],
  [/^Training rig \/ recovery equipment$/, 1990, 'Training equipment & rubdown table'], [/^Patient lift & transfer aids$/, 1960, 'Invalid chair & bedside aids'],
  [/^Chainsaw & tool cache$/, 1950, 'Axes, crosscut saws & hand tools'], [/^Rapid Deployment Force medical cache$/, 1980, 'Field medical chest'],
  [/^Terminal surveillance radar$/, 1960, 'Search radar'], [/^Bedside patient monitor$/, 1970, 'Bedside monitor (scope)'], [/^Magnetometer & X-ray station$/, 1990, 'Metal detector & bag search'],
  [/^Evidence & lab building/, 1930, 'Evidence room'], [/^Shelter kennel run$/, 1950, 'Dog pound pen'], [/^Commercial playground$/, 1950, 'Swings & sandpit'],
  [/^Commercial treadmill$/, 1990, 'Exercise bicycle'], [/^Power rack & plates$/, 1970, 'Barbells & benches'], [/^Classroom outfit$/, 1950, 'Desks, slates & primers'],
  [/^Workstation \+ licenses$/, 1995, 'Desktop computer & software'], [/^Server & networking rack$|^Server & network rack$/, 1995, 'Minicomputer & terminals'],
  [/^Dispatch console \+ CAD seat$/, 1985, 'Radio dispatch console'], [/^POS terminal$/, 1985, 'Electronic cash register'], [/^5-axis CNC mill$/, 1990, 'NC milling machine'],
  [/^HPC cluster node rack$/, 1995, 'Mainframe time'], [/^Live\/satellite truck$/, 1985, 'Microwave live truck'], [/^Ops console & cyber suite$/, 2005, 'Ops console'],
  [/^P25 radio \+ body camera kit$/, 1960, 'Two-way car radio'], [/^P25 radio \+ body camera kit$/, 1995, 'Handheld two-way radio'], [/^P25 radio \+ body camera kit$/, 2014, 'P25 radio'],
  [/^GSA-leased office space$/, 1949, 'Leased office space'],
  [/^Police mountain bike$/, 1985, 'Police bicycle'], [/^Radio tower site & P25 repeater$/, 1995, 'Radio tower & repeater'], [/^Type II van ambulance$/, 1970, 'Ambulance car'],
  [/^Type III ambulance$/, 1975, 'Ambulance'], [/^Pro camera \/ console package$/, 1980, 'Film camera & lights'], [/^Crew-cab pickup$/, 1960, 'Flatbed truck'], [/^15-passenger van$/, 1960, 'Station wagon'],
  [/^Sound & livestream system$/, 2010, 'Sound system'], [/^Handheld radio \+ GPS$/, 1995, 'Handheld radio'], [/^Cessna 182/, 1956, 'Piper Cub with search equipment'],
  [/^Surplus SUV \/ van$/, 1990, 'Surplus truck / van'], [/^Point-of-distribution kit$/, 2000, 'Relief supply cache'],
];
const MODEL_FROM = [
  [/Bonded cellular/, 2008], [/K-9 SUV/, 1990],
  [/Firehawk/, 1990], [/Skid steer/, 1958], [/Type III/, 1975], [/Type I ambulance/, 1974], [/powered stretcher/, 2010],
  [/Combi oven/, 1976], [/Cone-beam/, 2001], [/Reefer/, 1940], [/tower crane/i, 1950], [/Confocal/, 1987], [/Cryo-electron/, 2013], [/Mass spectrometer/, 1950], [/Cloud/, 2008], [/rapid DNA/, 2012],
  [/hybrid/i, 2000], [/electric (bus|school bus|patrol cart|terminal patrol cart)|battery-electric|\(electric\)|\bEV\b/i, 2012], [/SUV|Interceptor/i, 1990], [/P25/i, 1995], [/Next Generation/i, 2023], [/Long Life Vehicle/i, 1987], [/Tier 4/i, 2014],
  [/Full-body scanner/i, 2008], [/IP /, 1998], [/LED/i, 2005], [/laptop|tablet|smart/i, 1995], [/jet/i, 1955], [/container/i, 1960], [/solar/i, 1980], [/MRI/i, 1980], [/\bCT\b/, 1975],
  [/ultrasound/i, 1965], [/Abrams/, 1980], [/Bradley/, 1981], [/Stryker/, 2002], [/HMMWV/, 1985], [/JLTV/, 2019], [/LAV-25/, 1983], [/AAV-7/, 1972], [/Amphibious Combat Vehicle/, 2020],
  [/F-35/, 2015], [/F-16/, 1978], [/Super Hornet/, 1999], [/C-130J/, 1999], [/C-130/, 1956], [/Osprey/, 2007], [/Seahawk|Jayhawk/, 1990], [/Gulfstream/, 1987], [/WP-3D/, 1975], [/RHIB/, 1965],
  [/Response Boat/, 2008], [/Fast Response Cutter/, 2012], [/Night-vision/, 1960], [/phased-array/i, 1975], [/cyber/i, 2005], [/defibrillator|\bAED\b/i, 1965], [/digital/i, 1990], [/autonomous/i, 2015], [/drone/i, 2005],
];
/** The older type when every listed model is too new: a jeep before the Humvee, a Sherman before the Abrams. */
const OLDER_TYPE = {
  'K-9 vehicles': () => 'K-9 car', 'Explosives-detection K-9 vehicles': () => 'K-9 car',
  'Patrol cars': () => 'Patrol car', 'Patrol vehicles': () => 'Patrol car', 'Delivery vehicles': (y) => (y < 1987 ? 'Mail truck' : 'Delivery van'),
  'Helicopters (helitack)': (y) => (y < 1965 ? 'Bell 47 helicopter' : 'UH-1 Huey'),
  'Major instruments': (y) => (y < 1950 ? 'Microscopes & glassware' : 'Spectrometers & centrifuges'),
  'Phones & conferencing': (y) => (y < 1960 ? 'Desk telephones' : 'Office phone system'),
  'Computing cluster': (y) => (y < 1995 ? 'Mainframe time' : 'Compute cluster'),
  'Radios & body cameras': (y) => (y < 1960 ? 'Two-way car radio' : 'Handheld two-way radio'),
  'Tactical vehicles': (y) => (y < 1941 ? 'Liberty truck' : y < 1960 ? 'Willys jeep' : 'M151 MUTT'),
  'Combat vehicles': (y) => (y < 1930 ? 'Renault FT light tank' : y < 1950 ? 'M4 Sherman' : y < 1960 ? 'M48 Patton' : 'M60 tank'),
  'Amphibious & light armored vehicles': (y) => (y < 1960 ? 'LVT amphibian tractor' : 'LVTP-5'),
  Aircraft: (y) => (y < 1925 ? 'Biplane' : y < 1945 ? 'Piston fighter' : y < 1960 ? 'F-86 Sabre' : 'F-4 Phantom'),
  'Embarked aircraft': (y) => (y < 1945 ? 'Carrier biplane / Wildcat' : y < 1956 ? 'F9F Panther' : y < 1974 ? 'A-4 Skyhawk' : 'F-14 Tomcat'),
  Helicopters: (y) => (y < 1965 ? 'H-34 Choctaw' : 'UH-1 Huey'),
  'Hurricane-hunter aircraft': (y) => (y < 1960 ? 'B-29 weather recon' : 'WC-130'),
  Cutters: (y) => (y < 1936 ? 'Steam cutter' : y < 1960 ? 'Treasury-class cutter' : y < 1986 ? 'Point-class cutter' : 'Island-class cutter'),
  'Response boats': (y) => (y < 1945 ? 'Motor lifeboat' : '44-ft motor lifeboat'),
  'Small boats': (y) => (y < 1965 ? 'Motor whaleboat' : 'Rigid inflatable'),
};
/** The icon of each stand-in. */
const SUB_ICON = {
  'Blackboards & slates': '🏫', 'Call boxes & whistles': '📣', 'Cash registers': '💰', 'Drafting tables': '📐', 'Draught horses': '🐴', 'Field artillery': '💣',
  'Hand trucks & hoists': '⛓️', 'Horse buses & wagons': '🐎', 'Horse-drawn ambulances': '🐎', 'Horse-drawn hearses': '🐎', 'Horse-drawn ladder wagons': '🐎',
  'Horse-drawn steam fire engines': '🐎', Horses: '🐎', 'Horses & wagons': '🐎', 'Ice room & iceboxes': '🧊', 'Inspection pits': '🔧', 'Lathes & milling machines': '⚙️',
  'Mail wagons': '🐎', 'Reapers & threshers': '🌾', 'Smoke helmets & leather turnout': '⛑️', Stretchers: '🛏️', 'Switchboard & dispatch desk': '☎️',
  'Telephone exchange & fire alarm boxes': '🔔', 'Typewriters & copy desk': '📝', 'Typewriters & filing': '📝', 'Field telegraph & signals': '🚩',
  'Small arms & field glasses': '🔭', 'Rowing machines & bicycles': '🚣', 'Barbells & Indian clubs': '🏋️',
};
const ZERO_NEED = { small: 0, medium: 0, large: 0, enterprise: 0 };
const toModel = ([name, cost, life, upkeep]) => ({ name, cost, life, upkeep });
function eraOf(raw, y) {
  const v = eraOfBare(raw, y);
  // The stand-in of earlier years stays resolvable for units bought then.
  const sub = ERA_CATEGORIES.find(([re, , , unless]) => re.test(raw.name) && !(unless && unless.test(raw.name)))?.[2];
  if (sub && !('period' in v.models)) {
    v.models = withHidden(v.models, v.models);
    Object.defineProperty(v.models, 'period', { value: toModel(sub.model), enumerable: false });
  }
  return v;
}
function eraOfBare(raw, y) {
  if (y >= ERA_PRESENT_YEAR) return { name: raw.name, need: raw.need, models: raw.models };
  const name = NAME_OLD.find(([re, until]) => re.test(raw.name) && y < until)?.[2] ?? raw.name;
  const rule = ERA_CATEGORIES.find(([re, , , unless]) => re.test(raw.name) && !(unless && unless.test(raw.name)));
  if (rule && y < rule[1]) {
    const sub = rule[2];
    if (!sub) return { name: raw.name, need: ZERO_NEED, models: hiddenAll(raw.models), absent: true };
    return { name: sub.name, icon: SUB_ICON[sub.name], need: raw.need, models: withHidden({ period: toModel(sub.model) }, raw.models) };
  }
  const renamed = Object.fromEntries(Object.entries(raw.models).map(([id, m]) => {
    const old = MODEL_OLD.find(([re, until]) => re.test(m.name) && y < until);
    return [id, old ? { ...m, name: old[2], older: true } : m];
  }));
  const ok = Object.fromEntries(Object.entries(renamed).filter(([, m]) => m.older || !MODEL_FROM.some(([re, from]) => re.test(m.name) && y < from)));
  if (!Object.keys(ok).length) {
    const [id, first] = Object.entries(raw.models)[0];
    const plain = first.name.replace(/\b(IP|digital|smart|LED|hybrid|electric|P25|SUV)\b ?/gi, '').trim();
    const older = OLDER_TYPE[raw.name]?.(y) ?? (plain && plain !== first.name ? plain[0].toUpperCase() + plain.slice(1) : null);
    return { name, need: raw.need, models: withHidden({ [id]: older ? { ...first, name: older } : first }, raw.models) };
  }
  return { name, need: raw.need, models: withHidden(ok, raw.models) };
}
/** Listed models first; models of other years kept for units already bought, unlisted. */
function withHidden(listed, all) {
  const out = { ...listed };
  for (const [id, m] of Object.entries(all)) if (!(id in out)) Object.defineProperty(out, id, { value: m, enumerable: false });
  return out;
}
const hiddenAll = (all) => withHidden({}, all);

/** Outfits that came later as a whole: no air traffic control before the 1930s, no wind farms before the 1980s. */
const GROUP_FROM = {
  atc: 1930, screening: 1970, airline: 1920, arff: 1945, milSpace: 1957, pmc: 1990, cert: 1993, dmat: 1984, usar: 1989, teamRubicon: 2010,
  ares: 1935, cap: 1941, mrc: 2002, fema: 1979, auxiliary: 1939, skiPatrol: 1938, renewables: 1980, milAir: 1907, airportPolice: 1950, campusPolice: 1900, borderPatrol: 1904, crimeLab: 1910,
};
for (const [gid, group] of Object.entries(GROUPS)) {
  const siblings = Object.values(group.categories);
  siblings.forEach((cat, i) => {
    const raw = { name: cat.name, need: cat.need, models: cat.models, icon: cat.icon };
    let memo = null;
    const compute = (y) => {
      if (GROUP_FROM[gid] > y) return { name: raw.name, need: ZERO_NEED, models: hiddenAll(raw.models), absent: true };
      const v = eraOf(raw, y);
      // Two categories that both fall back to the same thing (patrol and unmarked cars both horses) are one.
      if (!v.absent && v.name !== raw.name && siblings.slice(0, i).some((c) => !c.absent && c.name === v.name)) return { ...v, need: ZERO_NEED, absent: true };
      return v;
    };
    const now = () => { const y = eraYear(); if (!memo || memo.y !== y) memo = { y, v: compute(y) }; return memo.v; };
    Object.defineProperty(cat, 'name', { get: () => now().name, enumerable: true, configurable: true });
    Object.defineProperty(cat, 'need', { get: () => now().need, enumerable: true, configurable: true });
    Object.defineProperty(cat, 'models', { get: () => now().models, enumerable: true, configurable: true });
    Object.defineProperty(cat, 'icon', { get: () => now().icon ?? raw.icon, enumerable: true, configurable: true });
    Object.defineProperty(cat, 'absent', { get: () => Boolean(now().absent), enumerable: false, configurable: true });
  });
}

export const SIZES = ['small', 'medium', 'large', 'enterprise'];
