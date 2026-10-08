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
 */
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
    engine: { name: 'Engines', icon: '🚒', need: need(1, 2, 3, 4), weight: 3, models: { pumper: M('Pumper engine', 850000, 20, 18000, { usedCost: 180000, refurb: true }) } },
    tanker: { name: 'Tankers', icon: '💧', need: need(1, 1, 2, 2), weight: 1.5, models: { tanker: M('Tanker/tender', 400000, 25, 9000, { usedCost: 90000 }) } },
    brush: { name: 'Brush truck', icon: '🌲', need: need(1, 1, 1, 2), weight: 0.5, models: { brush: M('Brush truck', 300000, 15, 6000, { usedCost: 60000 }) } },
    scba: { name: 'SCBA & turnout gear', icon: '🫁', need: need(12, 20, 30, 40), weight: 2, models: { scba: M('SCBA + turnout set', 12000, 10, 400) } },
    house: { name: 'Firehouse', icon: '🏚️', need: need(1, 1, 1, 2), weight: 1, facility: true, models: { own: M('New firehouse (fund drive + loan)', 3500000, 50, 40000, { build: true }) } },
  } },
  volEms: { name: 'Rigs & Building', categories: {
    ambulance: { name: 'Ambulances', icon: '🚑', need: need(2, 3, 4, 6), weight: 3, models: { box: M('Type III ambulance', 240000, 10, 12000, { usedCost: 60000, remount: true }) } },
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

export const SIZES = ['small', 'medium', 'large', 'enterprise'];
