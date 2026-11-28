/**
 * The industries of the world, the inventions they need, and the ground they stand on.
 *
 * Nothing here is a date. An industry exists where its technology is known and adopted and its
 * raw material is in the ground; it grows with demand and with how well a country makes it
 * against everyone else, and it dies when something replaces it or someone makes it cheaper.
 *
 *   tech       what must be known first (world knowledge: see TECHS)
 *   resource   what the land must have (ENDOWMENT), or nothing
 *   labor      how much of the cost is wages (0–1): high, and it moves to where labour is cheap
 *   skill      how much it needs an educated workforce (0–1): high, and it stays where schools are
 *   elastic    how demand grows with income (food 0.3, cars 1.2, software 1.5)
 *   tradable   made in one country and sold in another (railways and shops are not)
 *   replacedBy [[tech or industry, how much of its market the replacement takes]]
 *   automates  [[tech, share of the jobs the machine takes]]
 *   kind       'extract' (mines, plantations, oil), 'make' (factories), 'serve' (services, utilities)
 *   sector     the ownership sector (OwnershipHistory.SECTORS) a nationalisation takes it into
 *   stock      the stock-market sector its shares trade in
 *   professions the jobs that work in it
 *   union      how readily its workers organise (0–1); hazard: how dangerous (0–1); pollution (0–1)
 *   war        how much a war's orders lift it (munitions, ships, aircraft, steel)
 *   town       what a town built on it is called
 *   reserve    how much the ground holds before it runs thin (seams worked out, whales hunted out)
 */
export const INDUSTRIES = {
  farming: { name: 'Farming', icon: '🌾', tech: [], resource: 'land', labor: 0.7, skill: 0.1, elastic: 0.3, tradable: true, kind: 'extract', sector: 'farming', stock: 'consumer', professions: ['agriculture', 'sheepStation'], union: 0.2, hazard: 0.3, pollution: 0.2, automates: [['automobile', 0.5], ['robotics', 0.2]], town: 'market town', base: 3 },
  plantation: { name: 'Plantations (sugar, tea, rubber, cocoa)', icon: '🌴', tech: [], resource: 'tropical', labor: 0.9, skill: 0.05, elastic: 0.6, tradable: true, kind: 'extract', sector: 'farming', stock: 'consumer', professions: ['plantation', 'hawaiiSugar'], union: 0.3, hazard: 0.4, pollution: 0.1, town: 'estate', base: 0.6 },
  textiles: { name: 'Textiles and clothing', icon: '🧵', tech: ['mechLoom'], labor: 0.85, skill: 0.15, elastic: 0.7, tradable: true, kind: 'make', sector: 'industry', stock: 'consumer', professions: ['millWork'], union: 0.6, hazard: 0.4, pollution: 0.3, automates: [['robotics', 0.3]], town: 'mill town', base: 1.2 },
  coal: { name: 'Coal mining', icon: '⛏️', tech: ['steam'], resource: 'coal', labor: 0.75, skill: 0.1, elastic: 0.8, tradable: true, kind: 'extract', sector: 'coal', stock: 'energy', professions: ['coalMining', 'svalbardCoal'], union: 0.95, hazard: 0.95, pollution: 0.9, replacedBy: [['oilGas', 0.45], ['nuclear', 0.15], ['renewables', 0.5]], automates: [['electricLight', 0.2], ['robotics', 0.3]], town: 'pit village', base: 0.8, reserve: 700 },
  metalMining: { name: 'Metal and gem mining', icon: '💎', tech: ['steam'], resource: 'ore', labor: 0.6, skill: 0.2, elastic: 0.9, tradable: true, kind: 'extract', sector: 'industry', stock: 'materials', professions: ['klondike'], union: 0.8, hazard: 0.85, pollution: 0.8, automates: [['robotics', 0.3]], town: 'mining camp', base: 0.4, reserve: 400 },
  ironSteel: { name: 'Iron and steel', icon: '🔥', tech: ['steam'], boost: 'steel', resource: 'iron', labor: 0.55, skill: 0.3, elastic: 1, tradable: true, kind: 'make', sector: 'industry', stock: 'materials', professions: ['ironworking', 'welding'], union: 0.85, hazard: 0.75, pollution: 0.9, war: 0.6, automates: [['robotics', 0.35]], town: 'steel town', base: 0.6 },
  engineering: { name: 'Machinery and engineering', icon: '⚙️', tech: ['steam'], labor: 0.5, skill: 0.45, elastic: 1.1, tradable: true, kind: 'make', sector: 'industry', stock: 'industrials', professions: ['manufacturing', 'mechanicalEng', 'blacksmith', 'structuralEng', 'craneOperator'], union: 0.7, hazard: 0.5, pollution: 0.5, war: 0.5, automates: [['robotics', 0.35]], town: 'engineering town', base: 0.7 },
  shipbuilding: { name: 'Shipbuilding', icon: '🚢', tech: ['steam'], boost: 'steel', resource: 'coast', labor: 0.6, skill: 0.35, elastic: 0.9, tradable: true, kind: 'make', sector: 'industry', stock: 'industrials', professions: ['welding', 'ironworking', 'craneOperator', 'manufacturing'], union: 0.85, hazard: 0.6, pollution: 0.5, war: 0.9, automates: [['robotics', 0.3]], town: 'shipyard town', base: 0.3 },
  shipping: { name: 'Shipping and the docks', icon: '⚓', tech: [], resource: 'coast', labor: 0.7, skill: 0.15, elastic: 1, tradable: true, kind: 'serve', sector: 'industry', stock: 'transport', professions: ['docks', 'merchantMarine'], union: 0.9, hazard: 0.6, pollution: 0.3, war: 0.3, automates: [['container', 0.75]], town: 'port', base: 0.5 },
  whaling: { name: 'Whaling', icon: '🐋', tech: [], resource: 'whales', labor: 0.8, skill: 0.1, elastic: 0.3, tradable: true, kind: 'extract', sector: 'industry', stock: 'energy', professions: ['whaling'], union: 0.3, hazard: 0.9, pollution: 0.4, replacedBy: [['oilGas', 0.97], ['electricLight', 0.7]], town: 'whaling port', base: 0.03, reserve: 25 },
  fishing: { name: 'Fishing', icon: '🐟', tech: [], resource: 'fish', labor: 0.75, skill: 0.1, elastic: 0.4, tradable: true, kind: 'extract', sector: 'farming', stock: 'consumer', professions: ['fishing'], union: 0.4, hazard: 0.85, pollution: 0.1, automates: [['automobile', 0.3]], town: 'fishing village', base: 0.25, reserve: 1500 },
  timber: { name: 'Timber and paper', icon: '🪵', tech: [], resource: 'forest', labor: 0.6, skill: 0.15, elastic: 0.6, tradable: true, kind: 'extract', sector: 'industry', stock: 'materials', professions: ['forester', 'carpentry'], union: 0.6, hazard: 0.7, pollution: 0.4, automates: [['automobile', 0.3], ['robotics', 0.2]], town: 'mill town', base: 0.3 },
  oilGas: { name: 'Oil and gas', icon: '🛢️', tech: ['oilRefining'], resource: 'oil', labor: 0.2, skill: 0.4, elastic: 1.2, tradable: true, kind: 'extract', sector: 'industry', stock: 'energy', professions: ['oilGas', 'petroleumEng'], union: 0.5, hazard: 0.6, pollution: 0.85, war: 0.4, replacedBy: [['renewables', 0.4]], town: 'oil town', base: 0.4, reserve: 500 },
  chemicals: { name: 'Chemicals and plastics', icon: '⚗️', tech: ['chemistry'], labor: 0.3, skill: 0.65, elastic: 1.1, tradable: true, kind: 'make', sector: 'industry', stock: 'materials', professions: ['chemicalEng'], union: 0.6, hazard: 0.6, pollution: 0.85, war: 0.5, town: 'works town', base: 0.3 },
  pharma: { name: 'Pharmaceuticals', icon: '💊', tech: ['chemistry'], boost: 'antibiotics', labor: 0.2, skill: 0.85, elastic: 1.3, tradable: true, kind: 'make', sector: 'industry', stock: 'health', professions: ['pharmacy', 'research'], union: 0.3, hazard: 0.2, pollution: 0.3, town: 'science town', base: 0.2 },
  automobile: { name: 'Motor cars', icon: '🚗', tech: ['automobile'], labor: 0.45, skill: 0.45, elastic: 1.3, tradable: true, kind: 'make', sector: 'industry', stock: 'industrials', professions: ['automotive'], union: 0.85, hazard: 0.45, pollution: 0.5, war: 0.4, automates: [['robotics', 0.4]], town: 'motor city', base: 0.9 },
  aerospace: { name: 'Aircraft and aerospace', icon: '🛩️', tech: ['aviation'], boost: 'jet', labor: 0.3, skill: 0.8, elastic: 1.3, tradable: true, kind: 'make', sector: 'industry', stock: 'industrials', professions: ['aerospaceEng', 'spaceIndustry'], union: 0.65, hazard: 0.3, pollution: 0.4, war: 1, town: 'aircraft town', base: 0.3 },
  electronics: { name: 'Electrical goods and electronics', icon: '📻', tech: ['electricLight'], boost: 'semis', labor: 0.45, skill: 0.6, elastic: 1.4, tradable: true, kind: 'make', sector: 'industry', stock: 'tech', professions: ['electricalEng'], union: 0.5, hazard: 0.25, pollution: 0.4, war: 0.5, automates: [['robotics', 0.4]], town: 'factory town', base: 0.5 },
  software: { name: 'Software and the internet', icon: '💻', tech: ['personalComputer'], boost: 'internet', labor: 0.35, skill: 0.95, elastic: 1.6, tradable: true, kind: 'serve', sector: null, stock: 'tech', professions: ['tech', 'gameDevelopment', 'cybersecurity', 'dataScience', 'aiOps'], union: 0.1, hazard: 0.05, pollution: 0.05, automates: [['ai', 0.25]], town: 'tech hub', base: 1 },
  railways: { name: 'Railways', icon: '🚂', tech: ['railway'], labor: 0.6, skill: 0.25, elastic: 0.9, tradable: false, kind: 'serve', sector: 'rail', stock: 'transport', professions: ['railroad', 'steamRailway'], union: 0.9, hazard: 0.5, pollution: 0.5, war: 0.3, replacedBy: [['automobile', 0.5], ['airlines', 0.15]], town: 'railway town', base: 0.6 },
  trucking: { name: 'Road haulage and logistics', icon: '🚚', tech: ['automobile'], labor: 0.65, skill: 0.15, elastic: 1, tradable: false, kind: 'serve', sector: 'industry', stock: 'transport', professions: ['trucking', 'logistics', 'coachman'], union: 0.6, hazard: 0.5, pollution: 0.5, automates: [['ai', 0.3]], town: 'depot town', base: 0.5 },
  airlines: { name: 'Airlines', icon: '✈️', tech: ['airTravel'], labor: 0.4, skill: 0.5, elastic: 1.5, tradable: false, kind: 'serve', sector: 'airline', stock: 'transport', professions: ['aviation', 'flightAttendant', 'charterAviation', 'airTrafficControl'], union: 0.75, hazard: 0.2, pollution: 0.5, town: 'airport town', base: 0.3 },
  power: { name: 'Electricity and gas supply', icon: '⚡', tech: ['electricLight'], labor: 0.25, skill: 0.5, elastic: 1.1, tradable: false, kind: 'serve', sector: 'power', stock: 'utilities', professions: ['lineworker', 'nuclearEng', 'waterUtility'], union: 0.75, hazard: 0.4, pollution: 0.7, town: 'power town', base: 0.3 },
  nuclear: { name: 'Nuclear power', icon: '☢️', tech: ['nuclear'], labor: 0.15, skill: 0.9, elastic: 1, tradable: false, kind: 'serve', sector: 'power', stock: 'utilities', professions: ['nuclearEng'], union: 0.5, hazard: 0.3, pollution: 0.2, town: 'reactor town', base: 0.1 },
  renewables: { name: 'Wind and solar power', icon: '🌞', tech: ['solar'], labor: 0.3, skill: 0.65, elastic: 1.3, tradable: true, kind: 'make', sector: 'power', stock: 'utilities', professions: ['renewableEnergy', 'environmental'], union: 0.3, hazard: 0.15, pollution: 0.05, town: 'wind-farm town', base: 0.3 },
  telecom: { name: 'Telegraph and telephones', icon: '☎️', tech: ['telegraph'], boost: 'telephone', labor: 0.45, skill: 0.4, elastic: 1.3, tradable: false, kind: 'serve', sector: 'telecom', stock: 'tech', professions: ['switchboard', 'telegraph'], union: 0.6, hazard: 0.1, pollution: 0.05, automates: [['semis', 0.6]], town: 'exchange town', base: 0.2 },
  banking: { name: 'Banking and insurance', icon: '🏦', tech: [], labor: 0.4, skill: 0.6, elastic: 1.3, tradable: true, kind: 'serve', sector: 'banking', stock: 'finance', professions: ['finance', 'intlFinance', 'insurance', 'actuary', 'accounting'], union: 0.2, hazard: 0.05, pollution: 0, automates: [['personalComputer', 0.3]], town: 'financial centre', base: 0.6 },
  retail: { name: 'Shops and retail', icon: '🛍️', tech: [], labor: 0.7, skill: 0.15, elastic: 0.9, tradable: false, kind: 'serve', sector: 'smallTrade', stock: 'consumer', professions: ['retail', 'travellingSales', 'milkRound', 'sales'], union: 0.3, hazard: 0.05, pollution: 0.05, automates: [['internet', 0.25]], town: 'market town', base: 1.2 },
  construction: { name: 'Building and construction', icon: '🏗️', tech: [], labor: 0.7, skill: 0.25, elastic: 1, tradable: false, kind: 'serve', sector: 'smallTrade', stock: 'industrials', professions: ['trades', 'plumbing', 'hvac', 'carpentry'], union: 0.6, hazard: 0.7, pollution: 0.3, town: 'boom town', base: 1 },
  tourism: { name: 'Hotels, restaurants and tourism', icon: '🏨', tech: [], boost: 'airTravel', labor: 0.75, skill: 0.15, elastic: 1.4, tradable: false, kind: 'serve', sector: 'smallTrade', stock: 'consumer', professions: ['hospitality', 'culinary', 'cruise'], union: 0.3, hazard: 0.1, pollution: 0.1, town: 'resort', base: 0.6 },
  media: { name: 'Press, film and broadcasting', icon: '🎬', tech: [], boost: 'radio', labor: 0.4, skill: 0.6, elastic: 1.4, tradable: true, kind: 'serve', sector: null, stock: 'tech', professions: ['journalism', 'acting', 'music', 'design', 'contentCreator'], union: 0.45, hazard: 0.05, pollution: 0.05, town: 'studio town', base: 0.2 },
};

/**
 * World knowledge. Inventions the rest of the game already knows (the railway, the telephone, the
 * motor car, radio, the PC, the internet) are known when every other screen knows them, so the
 * garage and the factories agree; the rest come from research, at a pace the world's wealth, its
 * wars and its governments' science spending set.
 *   needs   what must be known first;  cost  research needed (world research points)
 *   war     wars speed it up (the jet, the reactor)
 */
export const TECHS = {
  steam: { name: 'the steam engine', known: true },
  mechLoom: { name: 'the power loom', known: true },
  railway: { name: 'the railway', anchor: 'railway' },
  telegraph: { name: 'the electric telegraph', anchor: 'telegraph' },
  telephone: { name: 'the telephone', anchor: 'telephone' },
  electricLight: { name: 'electric light and power', anchor: 'electricLight' },
  automobile: { name: 'the motor car', anchor: 'automobile' },
  radio: { name: 'broadcast radio', anchor: 'radio' },
  airTravel: { name: 'passenger air travel', anchor: 'airTravel' },
  tv: { name: 'television', anchor: 'tv' },
  antibiotics: { name: 'antibiotics', anchor: 'antibiotics' },
  personalComputer: { name: 'the personal computer', anchor: 'personalComputer' },
  internet: { name: 'the internet', anchor: 'internet' },
  steel: { name: 'cheap steel (the Bessemer converter)', needs: ['steam'], cost: 18 },
  oilRefining: { name: 'oil drilling and refining', needs: ['steam'], cost: 19 },
  chemistry: { name: 'industrial chemistry', needs: ['steam'], cost: 19 },
  aviation: { name: 'the aeroplane', needs: ['automobile'], cost: 40, war: 1.5 },
  offshore: { name: 'offshore drilling', needs: ['oilRefining', 'steel'], cost: 118 },
  jet: { name: 'the jet engine', needs: ['aviation'], cost: 78, war: 2 },
  nuclear: { name: 'nuclear power', needs: ['chemistry', 'electricLight'], cost: 95, war: 2 },
  container: { name: 'the shipping container', needs: ['steel'], cost: 95 },
  semis: { name: 'the transistor and the microchip', needs: ['radio'], cost: 88, war: 1.3 },
  robotics: { name: 'industrial robots', needs: ['semis'], cost: 150 },
  solar: { name: 'cheap solar panels and wind turbines', needs: ['semis'], cost: 360 },
  ai: { name: 'machine learning', needs: ['internet'], cost: 500 },
};

/** Countries the world model follows in detail (the rest of the world is their trade partners). */
export const SIM = ['GB', 'US', 'DE', 'FR', 'JP', 'CN', 'IN', 'RU', 'IT', 'BR', 'KR', 'CA', 'AU', 'ES', 'NL', 'BE', 'SE', 'MX', 'ZA', 'NG', 'ID', 'EG', 'AR', 'PL', 'TR', 'SA', 'IR', 'VE', 'BD', 'VN', 'PH', 'TH'];

const LANDLOCKED = 'AF AM AT AZ BY BF BI BO BW CF TD CZ ET HU KZ XK KG LA LS LI LU MW ML MD MN NP NE MK PY RW SM RS SK SS SZ TJ UG UZ VA ZM ZW AD BT CH'.split(' ');
const T = (s) => Object.fromEntries(s.trim().split(/\s+/).map((x) => { const [k, v] = x.split(':'); return [k, Number(v)]; }));
/** What the ground holds (0–1). Geography, not history: where the coal, oil, ore and good land are. */
const RES = {
  coal: T('US:1 GB:1 DE:1 PL:0.9 CN:1 IN:0.8 AU:0.9 ZA:0.9 RU:0.9 UA:0.9 BE:0.7 FR:0.5 JP:0.3 CO:0.5 KZ:0.7 ID:0.6 CZ:0.6 ES:0.3 CA:0.4 TR:0.3 VN:0.4 MN:0.4 SJ:0.6 KR:0.2 KP:0.6 BA:0.4 RS:0.4'),
  iron: T('US:1 GB:0.6 FR:0.7 SE:0.9 AU:1 BR:1 RU:0.8 UA:0.7 IN:0.7 CN:0.6 CA:0.6 ES:0.5 DE:0.4 ZA:0.5 KZ:0.4 LR:0.6 MR:0.6 VE:0.4 LU:0.6 BE:0.3 PL:0.3 JP:0.1 KR:0.1 IT:0.1 MX:0.3 CL:0.3'),
  oil: T('US:0.9 RU:1 SA:1 IR:1 IQ:1 KW:1 AE:1 VE:1 MX:0.8 NG:0.8 CA:0.8 LY:0.8 DZ:0.7 AZ:0.7 ID:0.5 KZ:0.7 QA:0.8 OM:0.6 EG:0.4 MY:0.4 BN:0.5 RO:0.4 TT:0.4 EC:0.4 CO:0.4 AR:0.3 CN:0.4 SY:0.2 GA:0.5 CG:0.5 SD:0.3'),
  offshoreOil: T('GB:0.6 NO:0.9 BR:0.7 AO:0.8 NG:0.3 MY:0.3 AU:0.3 GQ:0.7 GY:0.7 DK:0.2 NL:0.3'),
  tropical: T('IN:0.6 LK:1 ID:1 MY:1 BR:1 GH:1 CI:1 NG:0.7 KE:0.7 JM:0.8 CU:1 PH:0.8 VN:0.7 TH:0.7 CO:0.8 CR:0.8 GT:0.8 HN:0.8 EC:0.8 DO:0.8 HT:0.8 TT:0.6 BB:0.8 FJ:0.8 MU:0.8 TZ:0.7 UG:0.7 CM:0.8 LR:0.8 SL:0.8 CD:0.8 MM:0.8 BD:0.6 PG:0.7 US:0.2 AU:0.2 ZA:0.3 MX:0.5 VE:0.5 PE:0.4 SR:0.8 GY:0.8 BZ:0.8 SG:0.2 MZ:0.6 MW:0.6 ZW:0.4 ET:0.5 CN:0.2 TW:0.4 PR:0.8 MQ:0.8 GP:0.8 RE:0.8'),
  ore: T('ZA:1 AU:1 CL:1 PE:1 CD:1 ZM:1 BO:0.9 CA:0.9 RU:0.8 US:0.7 MY:0.6 ID:0.6 BR:0.7 BW:0.8 NA:0.8 GH:0.6 MX:0.6 KZ:0.7 MN:0.7 PG:0.7 GN:0.7 SL:0.6 ZW:0.7 PH:0.5 CN:0.6 IN:0.4 SE:0.5 NC:0.8 GB:0.2 DE:0.2 ES:0.4'),
  forest: T('CA:1 SE:1 FI:1 NO:0.6 RU:1 US:0.8 BR:0.9 ID:0.8 MY:0.8 NZ:0.6 CL:0.6 DE:0.4 AT:0.5 CD:0.8 GH:0.5 CM:0.6 MM:0.6 FR:0.3 JP:0.3 PL:0.4'),
  fish: T('NO:1 IS:1 JP:0.9 PE:0.8 CL:0.6 GB:0.6 PT:0.6 ES:0.6 CA:0.7 US:0.6 RU:0.6 DK:0.6 FO:1 GL:1 NZ:0.6 IE:0.4 KR:0.6 CN:0.5 TH:0.5 VN:0.5 ID:0.5 PH:0.5 NA:0.5 MA:0.5 SN:0.5 NL:0.4 FR:0.3 IN:0.3'),
  whales: T('US:0.6 GB:0.5 NO:1 JP:0.6 IS:0.5 FO:0.6 NZ:0.4 AU:0.4 NL:0.4 KR:0.2 RU:0.3'),
  land: T('US:1 CA:0.9 AR:1 AU:0.8 RU:0.9 UA:1 FR:0.8 BR:0.9 IN:0.8 CN:0.8 KZ:0.7 DE:0.6 PL:0.7 HU:0.7 RO:0.7 NZ:0.8 UY:0.8 EG:0.4 SA:0.05 AE:0.05 KW:0.05 QA:0.05 SG:0.02 HK:0.02 MO:0.01 NL:0.5 GB:0.5 JP:0.3 KR:0.3 IL:0.3'),
};
/** How much of a resource a country has (coast: has a coastline). */
export function endowment(cc, res) {
  if (!res) return 1;
  if (res === 'coast') return LANDLOCKED.includes(cc) ? 0 : 1;
  if (res === 'land') return RES.land[cc] ?? 0.6;
  // Every coast has its fishermen, even where the great fleets don't sail from.
  if (res === 'fish') return RES.fish[cc] ?? (LANDLOCKED.includes(cc) ? 0 : 0.3);
  if (res === 'oil') return Math.max(RES.oil[cc] ?? 0, RES.offshoreOil[cc] ?? 0);
  return RES[res]?.[cc] ?? 0;
}
/** Oil under the sea: found only once offshore drilling exists (the North Sea, Angola, the Brazilian deep). */
export const offshoreOnly = (cc) => (RES.offshoreOil[cc] ?? 0) > (RES.oil[cc] ?? 0);

/** Which industry a profession works in (first listed wins). */
export const INDUSTRY_OF_PROFESSION = {};
for (const [id, ind] of Object.entries(INDUSTRIES)) for (const p of ind.professions) INDUSTRY_OF_PROFESSION[p] ??= id;

/**
 * What a place is suited to by its geography: its coal and ore, its harbour, its river, its port
 * to the world. In order: the first of them the country actually has, at any real size, is the
 * town's trade (Detroit makes cars once there are cars, engines and ships before). No dates:
 * where the model never grows the trade, the town lives by something else.
 */
export const TOWN_AFFINITY = {
  pittsburgh: ['ironSteel', 'coal', 'engineering'], detroit: ['automobile', 'engineering', 'shipbuilding'], appalachia: ['coal', 'timber'], houston: ['oilGas', 'chemicals', 'shipping'], seattle: ['aerospace', 'software', 'timber'], sf: ['software', 'electronics', 'shipping'], dayton: ['engineering', 'aerospace', 'automobile'], chicago: ['railways', 'ironSteel', 'engineering'], neworleans: ['shipping', 'oilGas'], norfolk: ['shipbuilding', 'shipping'], nantucket: ['whaling', 'fishing'], houghton: ['metalMining'], ely: ['metalMining'], elko: ['metalMining'], losangeles: ['media', 'aerospace', 'oilGas'], anchorage: ['oilGas', 'fishing'], kodiak: ['fishing'],
  manchester: ['textiles', 'engineering', 'chemicals'], birmingham: ['engineering', 'automobile', 'ironSteel'], glasgow: ['shipbuilding', 'engineering', 'textiles'], xs_glasgow: ['shipbuilding', 'engineering', 'textiles'], cardiff: ['coal', 'shipping', 'ironSteel'], xw_cardiff: ['coal', 'shipping', 'ironSteel'], belfast: ['shipbuilding', 'textiles', 'aerospace'], cornwall: ['metalMining', 'fishing', 'tourism'], stornoway: ['fishing', 'textiles'], aberdeen: ['oilGas', 'fishing'],
  essen: ['coal', 'ironSteel'], saarbruecken: ['coal', 'ironSteel'], stuttgart: ['automobile', 'engineering'], hamburg: ['shipping', 'shipbuilding'], kiel: ['shipbuilding'], leipzig: ['engineering', 'textiles'], lille: ['textiles', 'coal'], lyon: ['textiles', 'chemicals'], toulouse: ['aerospace'], brest: ['shipbuilding'], turin: ['automobile', 'engineering'], milan: ['textiles', 'engineering'], bilbao: ['ironSteel', 'shipbuilding'],
  osaka: ['textiles', 'engineering', 'electronics'], nagoya: ['automobile'], busan: ['shipbuilding', 'shipping'], pohang: ['ironSteel'], ulsan: ['automobile', 'shipbuilding'], suwon: ['electronics'],
  shenzhen: ['electronics', 'textiles', 'fishing'], guangzhou: ['textiles', 'electronics', 'automobile'], shanghai: ['shipping', 'textiles', 'electronics'], wuhan: ['ironSteel', 'automobile'], dalian: ['shipbuilding', 'chemicals'], changchun: ['automobile', 'engineering'], taichung: ['engineering', 'electronics'], kaohsiung: ['shipbuilding', 'chemicals', 'shipping'], taipei: ['electronics', 'software'], hk_kowloon: ['textiles', 'shipping'], hk_tuenmun: ['electronics', 'textiles'],
  bengaluru: ['software', 'aerospace', 'textiles'], hyderabad: ['software', 'pharma'], mumbai: ['textiles', 'media', 'banking'], kolkata: ['textiles', 'shipping', 'engineering'], chennai: ['automobile', 'software', 'textiles'], darjeeling: ['plantation', 'tourism'], dhaka: ['textiles'], chattogram: ['shipping', 'textiles'], karachi: ['shipping', 'textiles'],
  saopaulo: ['automobile', 'engineering', 'textiles'], belohorizonte: ['metalMining', 'ironSteel'], ouropreto: ['metalMining'], maracaibo: ['oilGas'], potosi: ['metalMining'], kitwe: ['metalMining'], ndola: ['metalMining'], johannesburg: ['metalMining', 'engineering'], kalgoorlie: ['metalMining'], brokenhill: ['metalMining'], mountisa: ['metalMining'], newcastleau: ['coal'], karaganda: ['coal'], donetsk: ['coal', 'ironSteel'], ostrava: ['coal', 'ironSteel'], katowice: ['coal'], gdansk: ['shipbuilding'], stavanger: ['oilGas', 'fishing'], gothenburg: ['shipbuilding', 'automobile'], eindhoven: ['electronics'], rotterdam: ['shipping', 'chemicals'], antwerp: ['shipping', 'chemicals'], portharcourt: ['oilGas'], dammam: ['oilGas'], basra: ['oilGas'], kuwaitcity: ['oilGas'], abudhabi: ['oilGas'], doha: ['oilGas'],
};
