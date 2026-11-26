/**
 * Living through history across the rest of the world: each country's own moments as personal
 * choices, in waves by region. Same shape as LivingHistory.EPISODES (merged into ALL_EPISODES);
 * effects: { log, icon, stats, cost, earn, risk, emigrate }.
 *
 * Moments the loose timeline models (state.era.events) wait for it to have happened in this
 * world; the rest are tied to their years. Some are shared by a region (the debt crisis across
 * Latin America, the fall of the Wall across the Eastern bloc, the Arab Spring), told the same
 * way wherever they reach.
 *
 *   Wave A   Mexico, Italy, Korea, Vietnam, South Africa, Argentina, Poland, Turkey, Iran,
 *            Cuba, Nigeria, Kenya, Egypt, Indonesia, the Philippines, Greece, Portugal, Chile.
 *   Wave B   region by region: the Eastern bloc, Yugoslavia, the Gulf, the Sahel, the Horn of
 *            Africa, the Great Lakes, southern Africa, the Andes, Central America, the
 *            Caribbean, South and Southeast Asia, the Pacific, the Nordics and the Low Countries.
 */
const cc = (s) => s.character.countryId ?? 'US';
const age = (s) => s.character.age;
const hap = (s, id) => Boolean(s.era?.events?.[id]);
/** In one of these countries, between these years, at least this old. */
const W = (ccs, from, to, min = 16, max = 99) => (s, y) => ccs.includes(cc(s)) && y >= from && y <= to && age(s) >= min && age(s) <= max;
/** …and only if the timeline's event has happened in this world. */
const WH = (id, ccs, from, to, min = 16) => (s, y) => hap(s, id) && W(ccs, from, to, min)(s, y);
const L = (log, icon, more = {}) => ({ log, icon, ...more });
/** The year this world's breakup came (History.js), or null: our 1991 for a life begun after it. */
const since = (s, id) => s.era?.events?.[id]?.year ?? null;
/** In one of these countries, from–to years after this world's event, at least this old. */
const WA = (id, ccs, from, to, min = 16) => (s, y) => { const e = since(s, id); return e != null && ccs.includes(cc(s)) && y >= e + from && y <= e + to && age(s) >= min; };

const EASTERN_BLOC = ['PL', 'HU', 'CZ', 'SK', 'RO', 'BG', 'DE'];
const POST_SOVIET = ['RU', 'UA', 'BY', 'KZ', 'UZ', 'KG', 'TJ', 'TM', 'AZ', 'AM', 'GE', 'MD', 'EE', 'LV', 'LT'];
const YUGOSLAV = ['BA', 'HR', 'RS', 'SI', 'MK', 'ME', 'XK'];
const GULF = ['SA', 'KW', 'QA', 'AE', 'BH', 'OM'];
const SAHEL = ['ML', 'NE', 'TD', 'BF', 'MR', 'SN', 'SD'];
const LATAM_DEBT = ['MX', 'AR', 'BR', 'PE', 'BO', 'CL', 'VE', 'EC', 'CO', 'UY', 'PY'];
const JUNTAS = ['AR', 'CL', 'UY', 'PY', 'BO', 'BR'];
const ASIA_97 = ['TH', 'ID', 'KR', 'MY', 'PH'];
const ARAB_SPRING = ['TN', 'EG', 'LY', 'SY', 'YE', 'BH'];
const EURO_CRISIS = ['GR', 'PT', 'ES', 'IE', 'CY', 'IT'];
const WINDRUSH = ['JM', 'TT', 'BB', 'GD', 'LC', 'VC', 'DM', 'KN', 'AG', 'GY', 'BZ', 'BS'];
const TSUNAMI = ['ID', 'TH', 'LK', 'IN', 'MV', 'MM', 'SO'];
const CENTRAL_AM = ['GT', 'SV', 'NI', 'HN'];
const SOUTHERN_AFRICA = ['ZW', 'ZM', 'MW', 'MZ', 'BW', 'NA', 'LS', 'SZ', 'AO'];
const PACIFIC = ['FJ', 'KI', 'MH', 'TV', 'SB', 'VU', 'WS', 'TO', 'NR', 'PW', 'FM', 'PG'];
const NORDIC_LOW = ['NO', 'DK', 'NL', 'BE', 'LU'];

export const REGIONAL_EPISODES = [
  /* =============================== Wave A =============================== */
  // ---- Mexico ----
  { id: 'mx.revolution', icon: '🐎', title: 'The Revolution', when: W(['MX'], 1910, 1917, 15),
    text: 'Madero has called the country to arms against Díaz. Villa rides in the north, Zapata in the south: "land and liberty".',
    options: [
      { id: 'zapata', label: '🌽 Ride with Zapata', effect: L('You rode with the Zapatistas for the land the haciendas had taken.', '🌽', { stats: { stress: 8 }, risk: [0.12, 'You were badly wounded in a skirmish with the federales.', { health: -18 }] }) },
      { id: 'north', label: '🚂 Go north, across the border', effect: L('You crossed into Texas with thousands of others to wait out the war.', '🚂', { emigrate: 'US' }) },
      { id: 'endure', label: '🏠 Keep the family safe', effect: L('Armies came and went through the village, each taking the horses. You kept the family alive.', '🏠', { stats: { stress: 6, happiness: -4 } }) },
    ] },
  { id: 'mx.bracero', icon: '🧺', title: 'The Bracero Programme', when: W(['MX'], 1942, 1964, 18, 40),
    text: 'The Americans want farmworkers: contracts for the harvest, a ride north, a wage in dollars.',
    options: [
      { id: 'go', label: '🧺 Sign a contract', effect: L('You picked lettuce and cotton in California for a season, and sent most of it home.', '🧺', { earn: 600, stats: { health: -3 } }) },
      { id: 'stay', label: '🏡 Stay on the ejido', effect: L('You stayed and worked the family\'s plot of ejido land.', '🏡') },
    ] },
  { id: 'mx.quake85', icon: '🏚️', title: 'The Earthquake', when: W(['MX'], 1985, 1985, 10),
    text: 'At 7:19 in the morning the city shook for two minutes. Whole blocks have come down, and the government is slow.',
    options: [
      { id: 'dig', label: '🧱 Dig with the volunteers', effect: L('You dug through rubble with your hands for three days alongside strangers. You pulled out a child alive.', '🧱', { stats: { happiness: 4, health: -4 } }) },
      { id: 'family', label: '👨‍👩‍👧 Find your family first', effect: L('You found your family shaken but alive, in the street with the neighbours.', '👨‍👩‍👧', { stats: { stress: 8 } }) },
    ] },
  // ---- Italy ----
  { id: 'it.emigrate', icon: '🚢', title: 'La Merica', when: W(['IT'], 1880, 1914, 16, 40),
    text: 'Half the village has gone to America or Argentina. The ticket agent comes through every month.',
    options: [
      { id: 'us', label: '🗽 Go to New York', effect: L('You sailed from Naples in steerage to New York.', '🗽', { emigrate: 'US' }) },
      { id: 'ar', label: '🇦🇷 Go to Buenos Aires', effect: L('You sailed to Buenos Aires, where the docks needed men and the pampas needed hands.', '🚢', { emigrate: 'AR' }) },
      { id: 'stay', label: '🍇 Stay with the vines', effect: L('You stayed. The letters came back, and sometimes money.', '🍇') },
    ] },
  { id: 'it.partisans', icon: '🏔️', title: 'The Partisans', when: WH('ww2', ['IT'], 1943, 1945, 16),
    text: 'The king has changed sides; the Germans have taken the north. Young men are going up into the mountains with the partisans.',
    options: [
      { id: 'mountains', label: '🏔️ Go up to the mountains', effect: L('You fought with a partisan brigade through the last winter of the war.', '🏔️', { stats: { stress: 10 }, risk: [0.12, 'You were caught in a German sweep and wounded.', { health: -18 }, 0, { honour: 'Resistance medal' }] }) },
      { id: 'hide', label: '🏚️ Hide from the call-up', effect: L('You hid in an attic to avoid being sent to Germany.', '🏚️', { stats: { stress: 8 } }) },
    ] },
  { id: 'it.miracolo', icon: '🛵', title: 'The Economic Miracle', when: W(['IT'], 1958, 1963, 16, 40),
    text: 'The factories in Turin and Milan are hiring anyone from the south who\'ll come.',
    options: [
      { id: 'north', label: '🏭 Take the train north', effect: L('You took the Train of the Sun north to the car factories, and bought a Vespa within a year.', '🛵', { earn: 400, stats: { happiness: 3 } }) },
      { id: 'stay', label: '☀️ Stay in the south', effect: L('You stayed in the south.', '☀️') },
    ] },
  // ---- Korea ----
  { id: 'kr.refugee', icon: '🧳', title: 'The Retreat South', when: WH('koreanWar', ['KR', 'KP'], 1950, 1951, 8),
    text: 'The front is coming. The roads are full of families carrying everything they own.',
    options: [
      { id: 'south', label: '🚶 Join the column south', effect: L('You walked south for weeks in the snow, to Busan, and lived in a shack of crates.', '🚶', { stats: { health: -8, happiness: -6 } }) },
      { id: 'stay', label: '🏠 Stay', effect: L('You stayed as the front went over you twice.', '🏠', { stats: { stress: 10 }, risk: [0.08, 'You were caught in the fighting.', { health: -20 }] }) },
    ] },
  { id: 'kr.goldDrive', icon: '💍', title: 'The Gold Drive', when: W(['KR'], 1997, 1998, 18),
    text: 'The country is bankrupt and the IMF is in charge. People are queuing to give their gold rings to pay the debt.',
    options: [
      { id: 'give', label: '💍 Give your wedding ring', effect: L('You gave your gold ring to the national debt drive, with millions of others.', '💍', { cost: 200, stats: { happiness: 4 } }) },
      { id: 'keep', label: '🤐 Keep it', effect: L('You kept your gold. Times were hard enough.', '🤐') },
    ] },
  { id: 'kr.june', icon: '✊', title: 'June 1987', when: WH('koreaDemocracy', ['KR'], 1987, 1987, 16),
    text: 'Students and office workers are in the streets demanding a direct election. The tear gas is everywhere.',
    options: [
      { id: 'march', label: '✊ Join the march', effect: L('You marched in your office shirt with a handkerchief over your face. The government gave in.', '✊', { stats: { happiness: 6, stress: 4 } }) },
      { id: 'watch', label: '🏢 Watch from the office window', effect: L('You watched from the office window and cheered quietly.', '🏢') },
    ] },
  // ---- Vietnam ----
  { id: 'vn.boat', icon: '🚤', title: 'The Boats', when: W(['VN'], 1976, 1985, 12, 50),
    text: 'People are leaving at night in fishing boats, paying in gold. Pirates and storms take many.',
    options: [
      { id: 'boat', label: '🚤 Take the boat', effect: L('You left in a fishing boat with ninety others, and reached a camp in Malaysia, and then America.', '🚤', { emigrate: 'US', risk: [0.15, 'The boat was attacked by pirates.', { health: -15, happiness: -15 }] }) },
      { id: 'stay', label: '🏠 Stay', effect: L('You stayed and lived through the re-education years.', '🏠', { stats: { stress: 6 } }) },
    ] },
  { id: 'vn.doiMoi', icon: '🏪', title: 'Đổi Mới', when: W(['VN'], 1986, 1992, 18),
    text: 'The Party says people can run their own businesses now.',
    options: [
      { id: 'shop', label: '🍜 Open a phở stall', effect: L('You opened a stall on the pavement. By the end of the year it was a shop.', '🍜', { earn: 300 }) },
      { id: 'state', label: '🏛️ Keep your state job', effect: L('You kept your state job, and your neighbour got rich.', '🏛️') },
    ] },
  // ---- South Africa ----
  { id: 'za.passLaws', icon: '📕', title: 'The Passbook', when: WH('apartheid', ['ZA'], 1952, 1986, 16),
    text: 'The police are checking passbooks at the station again. Without the right stamp, you can be arrested and sent away.',
    options: [
      { id: 'burn', label: '🔥 Join the pass-burning protest', effect: L('You burned your passbook with the others outside the police station.', '🔥', { stats: { happiness: 4 }, risk: [0.3, 'You were arrested and held for weeks.', { happiness: -12, health: -5 }] }) },
      { id: 'carry', label: '📕 Carry it and keep your head down', effect: L('You carried it every day, and hated it every day.', '📕', { stats: { stress: 6 } }) },
    ] },
  { id: 'za.soweto', icon: '✊', title: 'Soweto', when: WH('apartheid', ['ZA'], 1976, 1976, 12, 25),
    text: 'The students are marching against being taught in Afrikaans. The police are waiting.',
    options: [
      { id: 'march', label: '✊ March with the students', effect: L('You marched with the students on the 16th of June. The police opened fire.', '✊', { stats: { stress: 12 }, risk: [0.15, 'You were shot in the leg.', { health: -20 }] }) },
      { id: 'home', label: '🏠 Stay home', effect: L('You stayed home and heard the shooting from across the township.', '🏠', { stats: { happiness: -6 } }) },
    ] },
  { id: 'za.vote', icon: '🗳️', title: 'The First Vote', when: WH('apartheidEnds', ['ZA'], 1994, 1994, 18),
    text: 'Election day. The queues stretch for miles, and nobody is going home.',
    options: [
      { id: 'queue', label: '🗳️ Queue all day', effect: L('You queued for nine hours to vote for the first time, and would have queued for nine more.', '🗳️', { stats: { happiness: 10 } }) },
    ] },
  // ---- Argentina ----
  { id: 'ar.peron', icon: '🎙️', title: 'Perón', when: W(['AR'], 1945, 1955, 16),
    text: 'The workers have filled the Plaza de Mayo for Perón, and Evita is speaking from the balcony.',
    options: [
      { id: 'plaza', label: '🎉 Go to the Plaza', effect: L('You stood in the Plaza with a hundred thousand others, shirtless in the heat, and roared for Perón.', '🎉', { stats: { happiness: 5 } }) },
      { id: 'against', label: '🙅 Keep your distance', effect: L('You kept your distance. Your father said it would end badly.', '🙅') },
    ] },
  { id: 'ar.disappeared', icon: '🕊️', title: 'The Disappeared', when: W(['AR'], 1976, 1983, 16),
    text: 'A student from your street was taken from his flat at night by men in a green Ford Falcon. Nobody will say where.',
    options: [
      { id: 'mothers', label: '🕊️ Walk with the Mothers of the Plaza', effect: L('You walked in circles in the Plaza de Mayo on Thursdays, in a white headscarf, asking where they were.', '🕊️', { stats: { stress: 8 }, risk: [0.08, 'You were taken in for questioning, and came back changed.', { happiness: -15, health: -8 }] }) },
      { id: 'silent', label: '🤐 Say nothing', effect: L('You said nothing. Everyone said nothing.', '🤐', { stats: { happiness: -5 } }) },
    ] },
  { id: 'ar.corralito', icon: '🏦', title: 'El Corralito', when: W(['AR'], 2001, 2002, 18),
    text: 'The banks have frozen everyone\'s savings. People are banging pots in the street.',
    options: [
      { id: 'pots', label: '🍳 Bang a pot with the neighbours', effect: L('You banged pots outside the bank every night until the president fled by helicopter.', '🍳', { stats: { happiness: 2 }, cost: 300 }) },
      { id: 'barter', label: '🔁 Join a barter club', effect: L('You traded bread for haircuts at a barter club until things settled.', '🔁', { cost: 150 }) },
    ] },
  // ---- Poland ----
  { id: 'pl.solidarity', icon: '✊', title: 'Solidarity', when: W(['PL'], 1980, 1981, 17),
    text: 'The shipyard in Gdańsk is on strike, and the whole country is joining the free trade union.',
    options: [
      { id: 'join', label: '✊ Join Solidarność', effect: L('You joined Solidarity, with ten million others. For sixteen months anything seemed possible.', '✊', { stats: { happiness: 6 } }) },
      { id: 'no', label: '🙅 Stay out of it', effect: L('You stayed out of it, and kept your job.', '🙅') },
    ] },
  { id: 'pl.martialLaw', icon: '🪖', title: 'Martial Law', when: W(['PL'], 1981, 1983, 16),
    text: 'Tanks on the streets in December. The phones are cut; Solidarity\'s leaders have been rounded up.',
    options: [
      { id: 'underground', label: '📄 Print underground leaflets', effect: L('You printed leaflets on a hidden press in a cellar.', '📄', { stats: { stress: 8 }, risk: [0.2, 'You were caught and interned for months.', { happiness: -12 }] }) },
      { id: 'quiet', label: '🕯️ A candle in the window', effect: L('You put a candle in the window on Christmas Eve, as the Pope asked.', '🕯️') },
    ] },
  // ---- Turkey ----
  { id: 'tr.republic', icon: '🌙', title: 'The Republic', when: W(['TR'], 1923, 1935, 10),
    text: 'The new republic has changed everything: the Latin alphabet, surnames, the hat, Sunday as the day of rest.',
    options: [
      { id: 'learn', label: '🔤 Go to the nation\'s schools', effect: L('You learned the new alphabet at an evening class and read the newspaper for the first time.', '🔤', { stats: { smarts: 4 } }) },
      { id: 'old', label: '📜 Keep to the old ways at home', effect: L('You learned the new ways in public and kept the old ones at home.', '📜') },
    ] },
  { id: 'tr.gastarbeiter', icon: '🚆', title: 'To Germany', when: W(['TR'], 1961, 1973, 18, 40),
    text: 'West Germany wants workers. The recruitment office in Istanbul is giving medical checks and train tickets.',
    options: [
      { id: 'go', label: '🚆 Take the train to Munich', effect: L('You took the train to Munich and a job at a car plant. You meant to stay two years.', '🚆', { emigrate: 'DE' }) },
      { id: 'stay', label: '🏡 Stay home', effect: L('You stayed. Your cousin went and sent back a television.', '🏡') },
    ] },
  { id: 'tr.quake99', icon: '🏚️', title: 'The Earthquake', when: W(['TR'], 1999, 1999, 10),
    text: 'At three in the morning the ground heaved for forty-five seconds. The apartment blocks that went up too fast have come down.',
    options: [
      { id: 'dig', label: '🧱 Dig through the night', effect: L('You dug through the night with the neighbours. Help came from Greece, of all places.', '🧱', { stats: { stress: 8, health: -3 } }) },
    ] },
  // ---- Iran ----
  { id: 'ir.revolution', icon: '✊', title: 'The Revolution', when: WH('iranRevolution', ['IR'], 1978, 1979, 15),
    text: 'Millions are in the streets against the Shah, from Marxist students to the ayatollah\'s followers.',
    options: [
      { id: 'march', label: '✊ March against the Shah', effect: L('You marched with the millions. The Shah left in January. Who would rule next was another question.', '✊', { stats: { happiness: 4, stress: 6 } }) },
      { id: 'leave', label: '✈️ Leave while you can', effect: L('You left for Los Angeles while the airport was still open.', '✈️', { emigrate: 'US' }) },
    ] },
  { id: 'ir.warFront', icon: '🪖', title: 'The War with Iraq', when: W(['IR', 'IQ'], 1980, 1988, 16, 45),
    text: 'The war has gone on for years. The front wants more men, and the cities are being shelled.',
    options: [
      { id: 'front', label: '🪖 Go to the front', effect: L('You went to the front, to the marshes and the gas.', '🪖', { stats: { stress: 15 }, risk: [0.15, 'You were wounded in a gas attack.', { health: -25 }] }) },
      { id: 'evade', label: '🏃 Avoid it somehow', effect: L('You avoided the front, with a deferment and luck.', '🏃', { stats: { stress: 6 } }) },
    ] },
  // ---- Cuba ----
  { id: 'cu.revolution', icon: '🧔', title: 'The Revolution', when: W(['CU'], 1959, 1961, 16),
    text: 'Fidel has entered Havana. The land is being shared out, the casinos are shut, and some are packing.',
    options: [
      { id: 'stay', label: '🌴 Stay and build it', effect: L('You stayed and joined the literacy brigades, teaching peasants to read.', '🌴', { stats: { happiness: 5 } }) },
      { id: 'miami', label: '✈️ Leave for Miami', effect: L('You left for Miami with one suitcase, sure you\'d be back in a year.', '✈️', { emigrate: 'US' }) },
    ] },
  { id: 'cu.special', icon: '🚲', title: 'The Special Period', when: W(['CU'], 1991, 1995, 10),
    text: 'The Soviet oil has stopped. No buses, no power, hardly any food. Everyone is riding Chinese bicycles.',
    options: [
      { id: 'bike', label: '🚲 Get by on a bicycle', effect: L('You cycled everywhere and lost twenty pounds, like everyone.', '🚲', { stats: { fitness: 3, health: -4 } }) },
      { id: 'raft', label: '🛟 Build a raft for Florida', effect: L('You left on a raft of inner tubes in the summer of 1994, and were picked up at sea.', '🛟', { emigrate: 'US', risk: [0.2, 'The raft broke up and you nearly drowned.', { health: -20 }] }) },
    ] },
  // ---- Nigeria ----
  { id: 'ng.biafra', icon: '🌅', title: 'Biafra', when: W(['NG'], 1967, 1970, 12),
    text: 'The East has declared itself Biafra. The blockade has closed in, and children are starving.',
    options: [
      { id: 'fight', label: '🪖 Fight for Biafra', effect: L('You fought for the rising sun of Biafra, and lost.', '🪖', { stats: { stress: 15 }, risk: [0.15, 'You were wounded at the front.', { health: -20 }] }) },
      { id: 'survive', label: '🥣 Keep the family alive', effect: L('You kept the family alive on relief food flown in at night.', '🥣', { stats: { health: -10, happiness: -10 } }) },
    ] },
  { id: 'ng.oilBoom', icon: '🛢️', title: 'The Oil Boom', when: W(['NG'], 1973, 1980, 18),
    text: 'Oil money is pouring into Lagos. Contracts, cement, Mercedes and traffic jams.',
    options: [
      { id: 'trade', label: '📦 Get into import trading', effect: L('You imported whatever sold, and did very well while it lasted.', '📦', { earn: 500 }) },
      { id: 'civil', label: '🏛️ Join the civil service', effect: L('You joined the federal service in Lagos.', '🏛️', { earn: 150 }) },
    ] },
  // ---- Kenya ----
  { id: 'ke.emergency', icon: '🌳', title: 'The Emergency', when: W(['KE'], 1952, 1959, 15),
    text: 'The colonial government has declared an Emergency against the Land and Freedom Army. Villages are being fenced in.',
    options: [
      { id: 'forest', label: '🌳 Take the oath and go to the forest', effect: L('You took the oath and went to the forests of the Aberdares with the fighters.', '🌳', { stats: { stress: 12 }, risk: [0.2, 'You were caught and held in a detention camp for years.', { health: -15, happiness: -15 }] }) },
      { id: 'village', label: '🏚️ Endure the village', effect: L('You lived behind the wire of an emergency village until it ended.', '🏚️', { stats: { happiness: -8 } }) },
    ] },
  // ---- Egypt ----
  { id: 'eg.nasser', icon: '🚢', title: 'The Canal', when: W(['EG'], 1956, 1956, 14),
    text: 'Nasser has nationalised the Suez Canal. Britain, France and Israel have attacked. The whole country is behind him.',
    options: [
      { id: 'rally', label: '📻 Listen to Nasser on the radio', effect: L('You listened to Nasser\'s speeches with the whole street gathered round one radio.', '📻', { stats: { happiness: 5 } }) },
    ] },
  { id: 'eg.tahrir', icon: '✊', title: 'Tahrir Square', when: W(['EG'], 2011, 2011, 16),
    text: 'Hundreds of thousands are in Tahrir Square demanding Mubarak go.',
    options: [
      { id: 'square', label: '✊ Camp in the square', effect: L('You slept in Tahrir Square for eighteen days. Mubarak resigned.', '✊', { stats: { happiness: 7, stress: 6 }, risk: [0.1, 'You were hurt when men on camels charged the square.', { health: -12 }] }) },
      { id: 'home', label: '🏠 Watch it on television', effect: L('You watched it on television, and cried when he went.', '🏠') },
    ] },
  // ---- Indonesia ----
  { id: 'id.merdeka', icon: '🇮🇩', title: 'Merdeka!', when: W(['ID'], 1945, 1949, 15),
    text: 'Sukarno has proclaimed independence, and the Dutch want their colony back.',
    options: [
      { id: 'fight', label: '🔥 Join the pemuda', effect: L('You fought with the youth militias against the Dutch return.', '🔥', { stats: { stress: 10 }, risk: [0.12, 'You were wounded in the fighting at Surabaya.', { health: -18 }] }) },
      { id: 'home', label: '🏠 Keep the family safe', effect: L('You kept your family safe through four years of revolution.', '🏠', { stats: { stress: 6 } }) },
    ] },
  { id: 'id.1965', icon: '🌑', title: '1965', when: W(['ID'], 1965, 1966, 16),
    text: 'After the failed coup, the army and the militias are hunting communists, and anyone named as one.',
    options: [
      { id: 'hide', label: '🤫 Hide a neighbour', effect: L('You hid a neighbour in your rice store for a month. Nobody ever talked about that year.', '🤫', { stats: { stress: 12 }, risk: [0.1, 'You were denounced and beaten.', { health: -15 }] }) },
      { id: 'silent', label: '🤐 Look away', effect: L('You looked away, as most people did, and never forgot.', '🤐', { stats: { happiness: -8 } }) },
    ] },
  // ---- The Philippines ----
  { id: 'ph.edsa', icon: '🌼', title: 'People Power', when: W(['PH'], 1986, 1986, 14),
    text: 'A million people are on EDSA, between the army\'s rebels and Marcos\'s tanks, with rosaries and flowers.',
    options: [
      { id: 'edsa', label: '🌼 Go to EDSA', effect: L('You stood in front of the tanks with a rosary and a sandwich. Marcos fled.', '🌼', { stats: { happiness: 8 } }) },
      { id: 'radio', label: '📻 Listen to Radio Veritas', effect: L('You listened to Radio Veritas all night.', '📻') },
    ] },
  { id: 'ph.ofw', icon: '✈️', title: 'Working Abroad', when: W(['PH'], 1975, 2026, 21, 45),
    text: 'An agency in Manila has a contract for you overseas: a nurse in the Gulf, a seaman on a tanker, a domestic helper in Hong Kong.',
    options: [
      { id: 'go', label: '✈️ Sign the contract', effect: L('You worked abroad for three years and sent home a balikbayan box every Christmas.', '✈️', { earn: 800, stats: { happiness: -3 } }) },
      { id: 'stay', label: '🏠 Stay with the family', effect: L('You stayed with your family.', '🏠') },
    ] },
  // ---- Greece, Portugal, Chile ----
  { id: 'gr.junta', icon: '🎓', title: 'The Polytechnic', when: W(['GR'], 1973, 1973, 16, 30),
    text: 'The students have occupied the Athens Polytechnic against the colonels. A tank is at the gates.',
    options: [
      { id: 'inside', label: '📻 Stay inside with the students', effect: L('You were inside when the tank came through the gate.', '🎓', { stats: { stress: 15 }, risk: [0.15, 'You were beaten in the arrests that followed.', { health: -15 }] }) },
      { id: 'outside', label: '🚶 Bring food to the gates', effect: L('You brought bread to the gates. The junta fell within a year.', '🚶') },
    ] },
  { id: 'pt.carnation', icon: '🌹', title: 'The Carnation Revolution', when: WH('carnationRevolution', ['PT'], 1974, 1974, 12),
    text: 'The captains have taken Lisbon, with carnations in their rifles. The colonial wars are over.',
    options: [
      { id: 'street', label: '🌹 Go into the streets', effect: L('You gave a soldier a carnation and he put it in his rifle barrel.', '🌹', { stats: { happiness: 8 } }) },
    ] },
  { id: 'cl.coup', icon: '🪖', title: 'The Eleventh of September', when: W(['CL'], 1973, 1973, 15),
    text: 'Jets are bombing La Moneda. Allende is dead, and the stadium is being used as a prison.',
    options: [
      { id: 'hide', label: '🤫 Lie low', effect: L('You burned your party card and kept very quiet for seventeen years.', '🤫', { stats: { stress: 10 } }) },
      { id: 'exile', label: '✈️ Go into exile', effect: L('You left for Sweden with the help of the embassy.', '✈️', { emigrate: 'SE' }) },
    ] },

  /* =============================== Wave B =============================== */
  // ---- The Eastern bloc ----
  { id: 'eb.hungary56', icon: '🇭🇺', title: 'Budapest, 1956', when: W(['HU'], 1956, 1956, 15),
    text: 'The students have toppled Stalin\'s statue. The Soviet tanks have pulled back, and now they\'re coming again.',
    options: [
      { id: 'fight', label: '🔥 Fight with the students', effect: L('You threw petrol bombs at the tanks from the alleys of Pest.', '🔥', { stats: { stress: 15 }, risk: [0.2, 'You were wounded in the street fighting.', { health: -20 }] }) },
      { id: 'west', label: '🚶 Walk to Austria', effect: L('You walked across the marshes to Austria at night, with two hundred thousand others.', '🚶', { emigrate: 'AT' }) },
    ] },
  { id: 'eb.prague68', icon: '🇨🇿', title: 'The Prague Spring', when: W(['CZ', 'SK'], 1968, 1968, 15),
    text: 'Socialism with a human face, and then, in August, the tanks of five countries.',
    options: [
      { id: 'signs', label: '🪧 Take down the road signs', effect: L('You took down the road signs so the tanks got lost, and argued with Russian boys in the square.', '🪧', { stats: { stress: 6 } }) },
      { id: 'leave', label: '🚂 Leave while the border is open', effect: L('You left for Vienna while the border was still open.', '🚂', { emigrate: 'AT' }) },
    ] },
  { id: 'eb.wall', icon: '🧱', title: 'The Wall Comes Down', when: WA('sovietCollapse', EASTERN_BLOC, 0, 1, 10),
    text: 'The borders are opening. In Berlin people are dancing on the Wall; in Prague they\'re jangling keys in Wenceslas Square.',
    options: [
      { id: 'cross', label: '🎉 Go and see it', effect: L('You crossed where nobody had crossed for forty years, and someone gave you a banana.', '🎉', { stats: { happiness: 10 } }) },
      { id: 'wait', label: '🤔 Wait and see', effect: L('You waited to see what it meant. It meant everything changed.', '🤔') },
    ] },
  { id: 'ps.vouchers', icon: '🧾', title: 'Shock Therapy', when: WA('sovietCollapse', [...POST_SOVIET.filter((c) => c !== 'RU'), 'PL', 'RO', 'BG'], 0, 4, 18),
    text: 'Prices have been freed overnight. Your savings are worth a loaf of bread, and the state factory hasn\'t paid wages in months.',
    options: [
      { id: 'trade', label: '🧳 Become a shuttle trader', effect: L('You carried bags of goods from Turkey and China to sell in the market. It kept the family going.', '🧳', { earn: 300, stats: { stress: 6 } }) },
      { id: 'wait', label: '🏭 Wait for the wages', effect: L('You waited for the wages. They came, eventually, in jars of pickles.', '🏭', { stats: { happiness: -8 } }) },
    ] },
  { id: 'ps.chernobyl', icon: '☢️', title: 'Chernobyl', when: W(['UA', 'BY'], 1986, 1986, 5),
    text: 'Something has happened at the power station. The radio says nothing; the wind is blowing north.',
    options: [
      { id: 'leave', label: '🚌 Get the children away', effect: L('You got the children on a bus to relatives far away.', '🚌', { stats: { stress: 8 } }) },
      { id: 'stay', label: '🏠 Believe the radio', effect: L('You believed the radio. Your thyroid did not.', '🏠', { stats: { health: -8 } }) },
    ] },
  { id: 'ps.balticWay', icon: '🤝', title: 'The Baltic Way', when: (s, y) => W(['EE', 'LV', 'LT'], 1989, 1989, 8)(s, y) && !(since(s, 'sovietCollapse') < y),
    text: 'Two million people are going to hold hands in a human chain from Tallinn to Vilnius.',
    options: [
      { id: 'chain', label: '🤝 Join the chain', effect: L('You held hands with strangers on the road for fifteen minutes, and sang.', '🤝', { stats: { happiness: 8 } }) },
    ] },
  // ---- Yugoslavia ----
  { id: 'yu.war', icon: '💥', title: 'The War', when: WA('yugoslaviaBreakup', YUGOSLAV, 0, 8, 12),
    text: 'Yugoslavia is breaking apart, and neighbours have become enemies. The shelling has reached your town.',
    options: [
      { id: 'flee', label: '🚌 Get out', effect: L('You got out on a convoy, with one bag, and became a refugee in Germany.', '🚌', { emigrate: 'DE' }) },
      { id: 'stay', label: '🏚️ Stay and endure the siege', effect: L('You lived through the siege: water from the brewery, running across the sniper streets.', '🏚️', { stats: { stress: 15, health: -8 }, risk: [0.1, 'You were hit by shrapnel.', { health: -25 }] }) },
    ] },
  // ---- The Gulf ----
  { id: 'gu.oil', icon: '🛢️', title: 'The Oil Money', when: W(GULF, 1973, 1985, 16),
    text: 'Oil money has transformed the country in ten years: roads, hospitals, scholarships abroad.',
    options: [
      { id: 'study', label: '🎓 Take a scholarship abroad', effect: L('You took a government scholarship to study abroad, and came back to run things.', '🎓', { stats: { smarts: 4 } }) },
      { id: 'trade', label: '🏗️ Go into contracting', effect: L('You went into contracting, and built half a suburb.', '🏗️', { earn: 800 }) },
    ] },
  { id: 'gu.invasion', icon: '🪖', title: 'The Invasion', when: W(['KW'], 1990, 1991, 12),
    text: 'Iraqi tanks have rolled into Kuwait City overnight.',
    options: [
      { id: 'flee', label: '🚗 Drive for the Saudi border', effect: L('You drove south across the desert to the Saudi border, and waited out the war.', '🚗', { stats: { stress: 10 } }) },
      { id: 'resist', label: '🤫 Stay and help the resistance', effect: L('You stayed, hiding people and passing messages until liberation.', '🤫', { stats: { stress: 15 }, risk: [0.12, 'You were detained by the occupiers.', { health: -15 }] }) },
    ] },
  // ---- Arab Spring ----
  { id: 'as.spring', icon: '✊', title: 'The Arab Spring', when: W(ARAB_SPRING.filter((c) => c !== 'EG'), 2011, 2011, 16),
    text: 'From Tunisia it has spread: crowds in the squares, the old rulers shaken. Your city is out tonight.',
    options: [
      { id: 'square', label: '✊ Go to the square', effect: L('You chanted in the square until your voice went. What came after was not what anyone hoped.', '✊', { stats: { happiness: 4, stress: 8 }, risk: [0.1, 'You were caught when the security forces cleared the square.', { health: -15 }] }) },
      { id: 'home', label: '🏠 Stay home', effect: L('You stayed home, and watched it on the satellite channels.', '🏠') },
    ] },
  { id: 'sy.refuge', icon: '🚶', title: 'Leaving Syria', when: W(['SY'], 2012, 2018, 12),
    text: 'The war has reached your neighbourhood. People are leaving for Turkey, Lebanon, and then the sea.',
    options: [
      { id: 'turkey', label: '🚶 Go to Turkey', effect: L('You walked over the hills into Turkey and found work in a garment workshop.', '🚶', { emigrate: 'TR' }) },
      { id: 'germany', label: '🚣 Go on, to Germany', effect: L('You crossed to a Greek island in a rubber dinghy and walked the Balkan route to Germany.', '🚣', { emigrate: 'DE', risk: [0.1, 'The dinghy capsized. You were pulled from the water.', { health: -15 }] }) },
      { id: 'stay', label: '🏚️ Stay', effect: L('You stayed, and lived through it.', '🏚️', { stats: { stress: 15, health: -6 } }) },
    ] },
  // ---- The Sahel and the Horn ----
  { id: 'sa.drought', icon: '🏜️', title: 'The Great Drought', when: W(SAHEL, 1968, 1974, 10),
    text: 'The rains have failed for the fifth year. The herds are dying; the wells are dry.',
    options: [
      { id: 'south', label: '🐪 Take the herd south', effect: L('You walked the last of the herd south to the river. Few animals made it.', '🐪', { stats: { health: -6 } }) },
      { id: 'town', label: '🏙️ Go to the town for relief', effect: L('You went to the town, to the relief camps, and never went back to herding.', '🏙️', { stats: { happiness: -6 } }) },
    ] },
  { id: 'et.famine', icon: '🌾', title: 'The Famine', when: W(['ET', 'ER'], 1983, 1985, 6),
    text: 'Drought and war. The relief camps are filling up, and the world is watching on television.',
    options: [
      { id: 'camp', label: '⛺ Go to the relief camp', effect: L('You walked to the camp at Korem, where the food came from a concert half a world away.', '⛺', { stats: { health: -10 } }) },
      { id: 'sudan', label: '🚶 Walk to Sudan', effect: L('You walked for weeks to the camps in Sudan.', '🚶', { stats: { health: -12 } }) },
    ] },
  { id: 'rw.genocide', icon: '🕯️', title: 'A Hundred Days', when: W(['RW'], 1994, 1994, 8),
    text: 'The radio is calling for killing. Roadblocks are going up, and neighbours are carrying machetes.',
    options: [
      { id: 'hide', label: '🤫 Hide a family', effect: L('You hid a family in your house for three months. All of you lived.', '🤫', { stats: { stress: 20 }, risk: [0.15, 'You were found out and beaten.', { health: -20 }, 0, { honour: 'Recognised as one who sheltered the hunted' }] }) },
      { id: 'flee', label: '🚶 Flee over the border', effect: L('You fled over the border into a camp.', '🚶', { stats: { stress: 15, health: -8 } }) },
    ] },
  // ---- Southern Africa ----
  { id: 'sa.liberation', icon: '✊', title: 'The Liberation War', when: W(['ZW', 'MZ', 'AO', 'NA'], 1966, 1980, 16),
    text: 'The guerrillas are in the hills; the colonial army is burning villages that feed them.',
    options: [
      { id: 'join', label: '🌄 Cross the border to join the fighters', effect: L('You crossed into a training camp and came back with a rifle.', '🌄', { stats: { stress: 12 }, risk: [0.15, 'You were wounded in an ambush.', { health: -20 }] }) },
      { id: 'village', label: '🏚️ Feed them in secret', effect: L('You fed the fighters at night and told the soldiers nothing.', '🏚️', { stats: { stress: 8 } }) },
    ] },
  { id: 'zw.inflation', icon: '💸', title: 'The Trillion-Dollar Note', when: W(['ZW'], 2007, 2009, 16),
    text: 'Prices double every day. A loaf costs a wheelbarrow of notes, and the shops are empty.',
    options: [
      { id: 'border', label: '🚌 Cross to South Africa for work', effect: L('You went south to Johannesburg and sent groceries home.', '🚌', { earn: 200 }) },
      { id: 'barter', label: '🔁 Get by on barter and US dollars', effect: L('You got by on barter, and the dollars your cousin sent.', '🔁', { cost: 100 }) },
    ] },
  { id: 'saf.mines', icon: '⛏️', title: 'The Mines', when: W(['MW', 'MZ', 'LS', 'SZ', 'BW'], 1900, 1990, 18, 40),
    text: 'The recruiters for the gold mines on the Rand are signing men up for contracts.',
    options: [
      { id: 'sign', label: '⛏️ Sign up', effect: L('You went deep underground on the Rand for a year, in the heat and the dust, and came home with money.', '⛏️', { earn: 300, stats: { health: -6 } }) },
      { id: 'stay', label: '🌾 Stay and farm', effect: L('You stayed and farmed.', '🌾') },
    ] },
  // ---- Latin America ----
  { id: 'la.debt', icon: '📉', title: 'The Lost Decade', when: W(LATAM_DEBT, 1982, 1989, 18),
    text: 'The debt crisis: the currency has collapsed, the IMF has come, and prices go up every week.',
    options: [
      { id: 'dollars', label: '💵 Keep savings in dollars', effect: L('You changed every peso you had into dollars under the mattress. It saved you.', '💵') },
      { id: 'second', label: '🛠️ Take a second job', effect: L('You took a second job, like everyone, and still fell behind.', '🛠️', { earn: 100, stats: { stress: 8 } }) },
    ] },
  { id: 'la.junta', icon: '🪖', title: 'The Generals', when: (s, y) => JUNTAS.includes(cc(s)) && cc(s) !== 'AR' && cc(s) !== 'CL' && y >= 1964 && y <= 1985 && age(s) >= 16,
    text: 'The generals have taken power, for order, they say. The universities are being purged, and people are disappearing.',
    options: [
      { id: 'quiet', label: '🤐 Keep your head down', effect: L('You kept your head down through the years of the generals.', '🤐', { stats: { stress: 6 } }) },
      { id: 'exile', label: '✈️ Go into exile', effect: L('You left for Paris, and campaigned from there.', '✈️', { emigrate: 'FR' }) },
    ] },
  { id: 'ca.civilWar', icon: '🌋', title: 'The Civil War', when: W(CENTRAL_AM, 1979, 1992, 14),
    text: 'The army and the guerrillas are fighting over the villages. The death squads come at night.',
    options: [
      { id: 'north', label: '🚶 Go north to the United States', effect: L('You walked north through Mexico, and crossed the river into Texas.', '🚶', { emigrate: 'US', risk: [0.1, 'You were robbed on the way north.', { health: -8 }] }) },
      { id: 'stay', label: '🏡 Stay in the village', effect: L('You stayed, and buried too many people.', '🏡', { stats: { stress: 12 } }) },
    ] },
  { id: 'bo.water', icon: '💧', title: 'The Water War', when: W(['BO'], 2000, 2000, 16),
    text: 'The water of Cochabamba has been sold to a foreign company and the bills have tripled.',
    options: [
      { id: 'protest', label: '✊ Blockade the roads', effect: L('You blockaded the roads with the whole city. The company left.', '✊', { stats: { happiness: 6 } }) },
    ] },
  { id: 've.exodus', icon: '🎒', title: 'The Exodus', when: W(['VE'], 2015, 2022, 16),
    text: 'The shelves are empty and the bolívar is worthless. Millions are walking to Colombia.',
    options: [
      { id: 'colombia', label: '🎒 Walk to Colombia', effect: L('You walked across the bridge at Cúcuta with a backpack, and on to Bogotá.', '🎒', { emigrate: 'CO' }) },
      { id: 'stay', label: '🏠 Stay', effect: L('You stayed, and lived on remittances.', '🏠', { stats: { health: -6 } }) },
    ] },
  // ---- The Caribbean ----
  { id: 'cb.windrush', icon: '🚢', title: 'The Mother Country', when: W(WINDRUSH, 1948, 1962, 18, 40),
    text: 'Britain is short of workers: London Transport, the hospitals and the factories are advertising in the papers.',
    options: [
      { id: 'go', label: '🚢 Sail for England', effect: L('You sailed for England in your best suit. It was colder than you imagined, in every way.', '🚢', { emigrate: 'GB' }) },
      { id: 'stay', label: '🌴 Stay home', effect: L('You stayed home.', '🌴') },
    ] },
  { id: 'ht.quake', icon: '🏚️', title: 'The Earthquake', when: W(['HT'], 2010, 2010, 8),
    text: 'Port-au-Prince has fallen down in thirty-five seconds.',
    options: [
      { id: 'dig', label: '🧱 Dig for survivors', effect: L('You dug for survivors with your hands, and slept in the street for months.', '🧱', { stats: { stress: 15, health: -5 } }) },
    ] },
  // ---- South and Southeast Asia ----
  { id: 'bd.liberation', icon: '🇧🇩', title: 'The Liberation War', when: W(['BD', 'PK'], 1971, 1971, 14),
    text: 'The army has cracked down in Dhaka. The Mukti Bahini are fighting for an independent Bangladesh.',
    options: [
      { id: 'mukti', label: '🔥 Join the Mukti Bahini', effect: L('You fought with the freedom fighters until victory in December.', '🔥', { stats: { stress: 12 }, risk: [0.12, 'You were wounded in the fighting.', { health: -18 }] }) },
      { id: 'india', label: '🚶 Flee to India', effect: L('You fled to a refugee camp in West Bengal, with ten million others.', '🚶', { stats: { health: -8 } }) },
    ] },
  { id: 'lk.war', icon: '💥', title: 'The War in the North', when: W(['LK'], 1983, 2009, 14),
    text: 'Black July, then the war: checkpoints, bombs on buses, and the north cut off.',
    options: [
      { id: 'leave', label: '✈️ Go abroad', effect: L('You left for Toronto, like so many.', '✈️', { emigrate: 'CA' }) },
      { id: 'stay', label: '🏠 Stay', effect: L('You stayed, and learned which buses not to take.', '🏠', { stats: { stress: 10 } }) },
    ] },
  { id: 'kh.yearZero', icon: '🌾', title: 'Year Zero', when: W(['KH'], 1975, 1979, 6),
    text: 'The Khmer Rouge have emptied the cities. Everyone is marched to the countryside to farm, and those with glasses are suspect.',
    options: [
      { id: 'hide', label: '🤫 Hide who you were', effect: L('You threw away your glasses and pretended to be a peasant. It kept you alive.', '🤫', { stats: { health: -15, happiness: -15 } }) },
      { id: 'flee', label: '🚶 Try for the Thai border', effect: L('You walked through the jungle to the Thai border, past the mines.', '🚶', { stats: { health: -12 }, risk: [0.15, 'You stepped on a mine.', { health: -30 }] }) },
    ] },
  { id: 'as.crisis97', icon: '📉', title: 'The Asian Crisis', when: W(ASIA_97.filter((c) => c !== 'KR'), 1997, 1998, 18),
    text: 'The currency has crashed by half in a month. The companies with dollar loans are going under.',
    options: [
      { id: 'cut', label: '✂️ Cut back and wait', effect: L('You cut back on everything and waited it out.', '✂️', { cost: 200 }) },
      { id: 'buy', label: '🏠 Buy while it\'s cheap', effect: L('You bought what you could while everything was cheap.', '🏠', { cost: 400, earn: 700 }) },
    ] },
  { id: 'as.tsunami', icon: '🌊', title: 'The Wave', when: W(TSUNAMI, 2004, 2004, 6),
    text: 'On the morning after Christmas the sea drew back, far out, and then it came in.',
    options: [
      { id: 'run', label: '🏃 Run for high ground', effect: L('You ran for the hill when the sea went out, and watched the wave from there.', '🏃', { stats: { stress: 15 } }) },
      { id: 'help', label: '🫶 Help afterwards', effect: L('You spent months helping in the camps afterwards.', '🫶', { stats: { stress: 10, happiness: 2 } }) },
    ] },
  { id: 'mm.saffron', icon: '🧡', title: 'The Saffron Revolution', when: W(['MM'], 2007, 2007, 16),
    text: 'The monks are marching through Yangon with their bowls turned upside down.',
    options: [
      { id: 'line', label: '🧡 Link arms around the monks', effect: L('You linked arms with others to protect the monks from the soldiers.', '🧡', { stats: { stress: 8 }, risk: [0.15, 'You were arrested in the crackdown.', { happiness: -12, health: -8 }] }) },
      { id: 'watch', label: '🏠 Watch from the doorway', effect: L('You watched from your doorway and gave the monks water.', '🏠') },
    ] },
  { id: 'np.quake', icon: '🏔️', title: 'The Earthquake', when: W(['NP'], 2015, 2015, 8),
    text: 'The ground has shaken the old temples of Kathmandu to rubble.',
    options: [
      { id: 'village', label: '🏔️ Go back to the village to help', effect: L('You walked for two days to your village to help rebuild.', '🏔️', { stats: { fitness: 2, stress: 8 } }) },
    ] },
  { id: 'cn.migrant', icon: '🏭', title: 'To the Factories', when: W(['CN'], 1985, 2015, 16, 35),
    text: 'Everyone your age from the village is going to Shenzhen and Dongguan, to the factories.',
    options: [
      { id: 'go', label: '🏭 Go south', effect: L('You went to a factory dormitory in Shenzhen, twelve to a room, and sent money home every month.', '🏭', { earn: 400, stats: { happiness: -2 } }) },
      { id: 'stay', label: '🌾 Stay on the land', effect: L('You stayed and farmed with your grandparents.', '🌾') },
    ] },
  { id: 'tw.martial', icon: '🌸', title: 'The End of Martial Law', when: WH('taiwanDemocracy', ['TW'], 1987, 1990, 16),
    text: 'Thirty-eight years of martial law are over. The students are in Liberty Square with wild lilies.',
    options: [
      { id: 'lilies', label: '🌸 Join the Wild Lily students', effect: L('You sat in the square with the students until the president agreed to reform.', '🌸', { stats: { happiness: 6 } }) },
    ] },
  // ---- The Pacific ----
  { id: 'pc.tests', icon: '☢️', title: 'The Tests', when: W(['MH', 'KI', 'FJ'], 1946, 1962, 6),
    text: 'The great powers are testing bombs on the atolls. White ash fell on the island like snow.',
    options: [
      { id: 'move', label: '🛶 Move to another island', effect: L('Your family was moved to another island, and never went home.', '🛶', { stats: { happiness: -8 } }) },
      { id: 'stay', label: '🏝️ Stay', effect: L('You stayed. The sickness came years later.', '🏝️', { stats: { health: -10 } }) },
    ] },
  { id: 'pc.rising', icon: '🌊', title: 'The Rising Sea', when: W(['KI', 'TV', 'MH', 'FJ', 'SB'], 2005, 2060, 16),
    text: 'The king tides are washing over the island again, and the well water has turned salt.',
    options: [
      { id: 'wall', label: '🪨 Build the sea wall higher', effect: L('You built the sea wall higher with the village, again.', '🪨', { stats: { fitness: 2 } }) },
      { id: 'go', label: '✈️ Move to New Zealand', effect: L('You moved to Auckland on the Pacific quota.', '✈️', { emigrate: 'NZ' }) },
    ] },
  { id: 'pc.coconut', icon: '🥥', title: 'The Copra Boat', when: W(PACIFIC, 1880, 1970, 14),
    text: 'The trading boat is in for copra, with tinned fish, tobacco and news from everywhere.',
    options: [
      { id: 'trade', label: '🥥 Sell your copra', effect: L('You sold your dried coconut and bought a knife, cloth and a tin of biscuits.', '🥥', { earn: 30 }) },
      { id: 'crew', label: '⛵ Sign on as crew', effect: L('You signed on and saw a dozen islands in a year.', '⛵', { stats: { happiness: 5 } }) },
    ] },
  // ---- The Nordics, the Low Countries, the rest of Europe ----
  { id: 'nl.flood', icon: '🌊', title: 'The Flood', when: W(['NL', 'BE'], 1953, 1953, 6),
    text: 'A storm and a spring tide together: the dikes of Zeeland have broken in the night.',
    options: [
      { id: 'roof', label: '🏠 Get up on the roof', effect: L('You spent two days on the roof before a boat came.', '🏠', { stats: { health: -5, stress: 12 } }) },
      { id: 'boat', label: '🚣 Row out to help', effect: L('You rowed out among the drowned farms, taking people off roofs.', '🚣', { stats: { stress: 8 }, risk: [0.05, 'Your boat overturned in the cold water.', { health: -15 }, 0, { honour: 'Flood rescue medal' }] }) },
    ] },
  { id: 'no.oil', icon: '🛢️', title: 'Oil in the North Sea', when: W(['NO', 'DK', 'GB'], 1970, 1985, 18, 45),
    text: 'They\'ve found oil under the North Sea, and the rigs need men.',
    options: [
      { id: 'rig', label: '🛢️ Two weeks on, two weeks off', effect: L('You worked the rigs: two weeks of storms and steel, two weeks at home with money in your pocket.', '🛢️', { earn: 500, stats: { health: -2 } }) },
    ] },
  { id: 'nd.winterWar', icon: '❄️', title: 'The Winter War', when: (s, y) => hap(s, 'ww2') && ['FI'].includes(cc(s)) && y >= 1939 && y <= 1940 && age(s) >= 16,
    text: 'The Soviets have invaded. It is forty below in the forests, and the army is on skis.',
    options: [
      { id: 'ski', label: '⛷️ Fight on skis', effect: L('You fought in white camouflage on skis through the coldest winter in memory.', '⛷️', { stats: { stress: 15, fitness: 3 }, risk: [0.15, 'You were wounded at the front.', { health: -20 }] }) },
      { id: 'lotta', label: '🫶 Serve with the Lottas', effect: L('You served with the women\'s auxiliary, feeding and nursing the troops.', '🫶', { stats: { stress: 8 } }) },
    ] },
  { id: 'eu.euroCrisis', icon: '💶', title: 'The Crisis', when: W(EURO_CRISIS, 2010, 2014, 18),
    text: 'Austerity: wages cut, pensions cut, a quarter of young people out of work.',
    options: [
      { id: 'abroad', label: '✈️ Work abroad for a while', effect: L('You went to work in Germany for a few years, like many of your friends.', '✈️', { earn: 600 }) },
      { id: 'protest', label: '✊ Protest in the square', effect: L('You protested in the square with your neighbours.', '✊', { stats: { stress: 6 } }) },
      { id: 'manage', label: '🏠 Manage', effect: L('You moved back in with your parents and managed.', '🏠', { stats: { happiness: -5 } }) },
    ] },
  { id: 'ie.celticTiger', icon: '🐯', title: 'The Celtic Tiger', when: W(['IE'], 1995, 2007, 18, 50),
    text: 'For the first time anyone remembers, people are coming to Ireland for work instead of leaving it.',
    options: [
      { id: 'buy', label: '🏠 Buy a house while you can', effect: L('You bought a house at the height of it. Then 2008 came.', '🏠', { cost: 500, stats: { happiness: 4 } }) },
      { id: 'home', label: '✈️ Come home from abroad', effect: L('You came home from London for a job in Dublin.', '✈️', { stats: { happiness: 5 } }) },
    ] },
  { id: 'es.transition', icon: '🗳️', title: 'The Transition', when: WH('francoDies', ['ES'], 1976, 1978, 18),
    text: 'Franco is dead. The first free elections in forty years, and the parties are legal again.',
    options: [
      { id: 'vote', label: '🗳️ Vote', effect: L('You voted for the first time in your life, and the old men in your family cried.', '🗳️', { stats: { happiness: 8 } }) },
      { id: 'movida', label: '🎸 Go out to the Movida', effect: L('You went out in Madrid every night of the Movida, and nobody stopped you.', '🎸', { stats: { happiness: 6 } }) },
    ] },
  { id: 'pt.colonies', icon: '🪖', title: 'The Colonial Wars', when: W(['PT'], 1961, 1974, 18, 30),
    text: 'Your call-up papers have come: four years in Angola, Mozambique or Guinea.',
    options: [
      { id: 'serve', label: '🪖 Go', effect: L('You served four years in Africa, and came home not wanting to talk about it.', '🪖', { stats: { stress: 12 }, risk: [0.1, 'You were wounded in an ambush.', { health: -20 }] }) },
      { id: 'france', label: '🚶 Slip over the border to France', effect: L('You went "a salto" over the mountains to France rather than go to the war.', '🚶', { emigrate: 'FR' }) },
    ] },
  { id: 'gr.emigrate', icon: '🚢', title: 'Leaving the Islands', when: W(['GR'], 1950, 1973, 18, 40),
    text: 'The village is emptying: some to Melbourne, some to the factories in Germany.',
    options: [
      { id: 'au', label: '🚢 Sail for Australia', effect: L('You sailed for Melbourne and opened a milk bar.', '🚢', { emigrate: 'AU' }) },
      { id: 'de', label: '🚆 Go to Germany', effect: L('You went to Stuttgart to build cars.', '🚆', { emigrate: 'DE' }) },
      { id: 'stay', label: '🫒 Stay with the olives', effect: L('You stayed with the olives and the goats.', '🫒') },
    ] },
  { id: 'ch.vote71', icon: '🗳️', title: 'Votes for Swiss Women', when: W(['CH'], 1971, 1971, 20),
    text: 'The men of Switzerland have at last voted to let women vote in federal elections.',
    options: [
      { id: 'celebrate', label: '🥂 Celebrate', effect: L('Your mother voted for the first time at sixty, and wore her best hat.', '🥂', { stats: { happiness: 5 } }) },
    ] },
  // ---- North Africa and the Levant ----
  { id: 'dz.independence', icon: '🇩🇿', title: 'The War of Independence', when: W(['DZ'], 1954, 1962, 15),
    text: 'The FLN has risen against France. The army is everywhere, and so are the informers.',
    options: [
      { id: 'fln', label: '🔥 Carry messages for the FLN', effect: L('You carried messages through the Casbah under the soldiers\' noses.', '🔥', { stats: { stress: 12 }, risk: [0.15, 'You were arrested and interrogated.', { health: -18 }] }) },
      { id: 'france', label: '🚢 Go to France for work', effect: L('You went to work in the factories of Lyon.', '🚢', { emigrate: 'FR' }) },
    ] },
  { id: 'lb.civilWar', icon: '💥', title: 'The Civil War', when: W(['LB'], 1975, 1990, 12),
    text: 'The Green Line runs through Beirut. Snipers on the rooftops; you sleep in the corridor.',
    options: [
      { id: 'stay', label: '🏠 Stay', effect: L('You stayed through fifteen years of it, and learned to live between the shelling.', '🏠', { stats: { stress: 12 } }) },
      { id: 'leave', label: '✈️ Leave for Paris', effect: L('You left for Paris, with cousins in Montreal and Sydney.', '✈️', { emigrate: 'FR' }) },
    ] },
  { id: 'ma.greenMarch', icon: '🇲🇦', title: 'The Green March', when: W(['MA'], 1975, 1975, 16),
    text: 'The king has called for 350,000 volunteers to march into the Spanish Sahara carrying Qur\'ans and flags.',
    options: [
      { id: 'march', label: '🚶 March', effect: L('You marched into the desert with the volunteers, waving a flag.', '🚶', { stats: { happiness: 4, fitness: 1 } }) },
    ] },
  /* =============================== Wave C =============================== */
  // ---- Independence days ----
  { id: 'af.uhuru', icon: '🎉', title: 'Independence Day', when: (s, y) => INDEPENDENCE[cc(s)] === y && age(s) >= 6,
    text: 'At midnight the old flag came down and the new one went up. The whole country is dancing.',
    options: [
      { id: 'dance', label: '🎉 Dance in the stadium', effect: L('You were in the stadium at midnight when the new flag went up, and you cheered until you were hoarse.', '🎉', { stats: { happiness: 10 } }) },
      { id: 'radio', label: '📻 Listen at home with the family', effect: L('You listened with your family round the radio, and your grandfather wept.', '📻', { stats: { happiness: 6 } }) },
    ] },
  { id: 'gh.nkrumah', icon: '⭐', title: '"Ghana Is Free Forever"', when: W(['GH'], 1957, 1957, 8),
    text: 'Nkrumah stood up at the Polo Ground at midnight: "At long last, the battle has ended."',
    options: [
      { id: 'go', label: '⭐ Be at the Polo Ground', effect: L('You heard Nkrumah declare Ghana free, the first in black Africa.', '⭐', { stats: { happiness: 10 } }) },
    ] },
  { id: 'cd.congo', icon: '💥', title: 'The Congo Wars', when: W(['CD'], 1996, 2003, 10),
    text: 'Armies from six countries are fighting over the east, and the mines. The militias come to the villages.',
    options: [
      { id: 'flee', label: '🚶 Flee to the city', effect: L('You fled to Goma with nothing, and lived in a camp for years.', '🚶', { stats: { health: -10, happiness: -10 } }) },
      { id: 'mine', label: '⛏️ Dig coltan to survive', effect: L('You dug coltan by hand in the forest mines.', '⛏️', { earn: 100, stats: { health: -8 } }) },
    ] },
  { id: 'ug.asians', icon: '✈️', title: 'Ninety Days', when: W(['UG'], 1972, 1972, 10),
    text: 'Amin has given the Asians ninety days to leave the country. Shops are being handed out to soldiers.',
    options: [
      { id: 'buy', label: '🏪 Take over an abandoned shop', effect: L('You were given a shop whose owner had fled. It was empty within a year.', '🏪', { stats: { happiness: -2 } }) },
      { id: 'grieve', label: '😢 Say goodbye to neighbours', effect: L('You said goodbye at the airport to the family who\'d run the shop on your street for three generations.', '😢', { stats: { happiness: -5 } }) },
    ] },
  { id: 'tz.ujamaa', icon: '🌾', title: 'Ujamaa', when: W(['TZ'], 1973, 1976, 16),
    text: 'Nyerere\'s villagisation: everyone is to move into the new planned villages, to farm together.',
    options: [
      { id: 'move', label: '🏘️ Move to the new village', effect: L('You moved to the new ujamaa village. The school and the clinic were good; the harvests were not.', '🏘️', { stats: { happiness: -2, smarts: 2 } }) },
      { id: 'resist', label: '🌳 Stay on your own land', effect: L('You stayed on your land until the lorries came.', '🌳', { stats: { stress: 6 } }) },
    ] },
  { id: 'zm.copper', icon: '⛏️', title: 'The Copperbelt', when: W(['ZM'], 1964, 1975, 18, 40),
    text: 'Copper is high and the mines of the Copperbelt are hiring at good wages.',
    options: [
      { id: 'mine', label: '⛏️ Go to the Copperbelt', effect: L('You went to Kitwe and worked the copper mines, in the good years.', '⛏️', { earn: 300, stats: { health: -3 } }) },
    ] },
  { id: 'wa.civilWar', icon: '💥', title: 'The Civil War', when: W(['LR', 'SL'], 1990, 2002, 10),
    text: 'The rebels are coming down the road, and they are taking children to fight.',
    options: [
      { id: 'bush', label: '🌳 Hide in the bush', effect: L('You hid in the bush with your family for months, living on cassava.', '🌳', { stats: { health: -10, stress: 12 } }) },
      { id: 'guinea', label: '🚶 Walk to Guinea', effect: L('You walked to a refugee camp across the border in Guinea.', '🚶', { stats: { health: -8 } }) },
    ] },
  { id: 'wa.ebola', icon: '🦠', title: 'Ebola', when: W(['LR', 'SL', 'GN'], 2014, 2015, 8),
    text: 'Ebola is in the town. No handshakes, buckets of chlorine at every door, and the burial teams in white suits.',
    options: [
      { id: 'careful', label: '🧼 Wash, keep apart, stay home', effect: L('You washed in chlorine at every door, and didn\'t touch anyone for a year.', '🧼', { stats: { stress: 10 } }) },
      { id: 'volunteer', label: '🫶 Volunteer with the burial teams', effect: L('You volunteered with a safe-burial team.', '🫶', { stats: { stress: 12, happiness: 2 }, risk: [0.08, 'You caught the virus, and survived.', { health: -30 }] }) },
    ] },
  { id: 'bi.war', icon: '💥', title: 'The Civil War', when: W(['BI'], 1993, 2005, 10),
    text: 'The president has been killed, and the killing has spread to the hills.',
    options: [
      { id: 'tz', label: '🚶 Flee to Tanzania', effect: L('You fled to a camp in Tanzania, and stayed for years.', '🚶', { stats: { health: -8 } }) },
      { id: 'stay', label: '🏚️ Stay on the hill', effect: L('You stayed on your hill and lived through it.', '🏚️', { stats: { stress: 12 } }) },
    ] },
  { id: 'ss.birth', icon: '🇸🇸', title: 'A New Country', when: W(['SS'], 2011, 2011, 8),
    text: 'South Sudan is independent: the newest country in the world.',
    options: [
      { id: 'celebrate', label: '🎉 Celebrate in Juba', effect: L('You danced in Juba as the flag went up. Peace did not last.', '🎉', { stats: { happiness: 8 } }) },
    ] },
  { id: 'gm.election', icon: '🗳️', title: 'The Marbles', when: W(['GM'], 2016, 2016, 18),
    text: 'In the Gambia you vote by dropping a marble into a drum. This time, the president might lose.',
    options: [
      { id: 'vote', label: '⚪ Drop your marble', effect: L('You dropped your marble in the drum. Jammeh lost after twenty-two years.', '⚪', { stats: { happiness: 7 } }) },
    ] },
  { id: 'lu.cv', icon: '🌹', title: 'After the Carnations', when: W(['GW', 'CV', 'ST'], 1974, 1975, 14),
    text: 'Portugal\'s revolution has ended the empire. Independence is coming.',
    options: [
      { id: 'party', label: '🎉 Celebrate', effect: L('You celebrated with the whole island.', '🎉', { stats: { happiness: 8 } }) },
      { id: 'lisbon', label: '✈️ Go to Lisbon', effect: L('You went to Lisbon to find work, and stayed.', '✈️', { emigrate: 'PT' }) },
    ] },
  // ---- The Middle East ----
  { id: 'il.1948', icon: '🇮🇱', title: '1948', when: W(['IL'], 1948, 1949, 14),
    text: 'The state has been declared, and the armies of the neighbours have crossed the borders the next morning.',
    options: [
      { id: 'fight', label: '🪖 Join the fighting', effect: L('You fought in the war of 1948.', '🪖', { stats: { stress: 12 }, risk: [0.12, 'You were wounded in the fighting.', { health: -18 }] }) },
      { id: 'kibbutz', label: '🌾 Hold the kibbutz', effect: L('You held the kibbutz through the war and brought in the harvest.', '🌾', { stats: { stress: 8 } }) },
    ] },
  { id: 'ps.1948', icon: '🗝️', title: '1948', when: W(['PS'], 1948, 1949, 6),
    text: 'The fighting has reached your village. Families are leaving, sure they\'ll be back in a few days. They take their keys.',
    options: [
      { id: 'leave', label: '🗝️ Leave, with the key', effect: L('You left with your family and the key to the house. You still have the key.', '🗝️', { stats: { happiness: -12 } }) },
      { id: 'stay', label: '🏠 Stay', effect: L('You stayed, and became a stranger in your own village.', '🏠', { stats: { stress: 10 } }) },
    ] },
  { id: 'jo.refugees', icon: '⛺', title: 'The Refugees', when: W(['JO'], 1967, 1968, 14),
    text: 'After the war, more refugees are coming across the river. The camps are spreading.',
    options: [
      { id: 'help', label: '🫶 Help in the camps', effect: L('You helped in the camps, carrying water and teaching children.', '🫶', { stats: { happiness: 3, stress: 4 } }) },
    ] },
  { id: 'af.soviet', icon: '🏔️', title: 'The Soviets Come', when: W(['AF'], 1979, 1989, 12),
    text: 'Soviet troops are in the country. The mujahideen are in the mountains, and millions are walking to Pakistan.',
    options: [
      { id: 'pakistan', label: '🚶 Walk to Pakistan', effect: L('You walked over the mountains to a camp outside Peshawar.', '🚶', { emigrate: 'PK', stats: { health: -8 } }) },
      { id: 'mountains', label: '🏔️ Go to the mountains', effect: L('You fought with the mujahideen.', '🏔️', { stats: { stress: 15 }, risk: [0.15, 'You were wounded in a helicopter attack.', { health: -25 }] }) },
      { id: 'kabul', label: '🏙️ Stay in Kabul', effect: L('You stayed in Kabul, and kept your head down.', '🏙️', { stats: { stress: 8 } }) },
    ] },
  // ---- Asia ----
  { id: 'sg.separation', icon: '🇸🇬', title: 'Separation', when: W(['SG'], 1965, 1965, 10),
    text: 'Singapore has been expelled from Malaysia. Lee Kuan Yew wept on television. A tiny island with no water and no army.',
    options: [
      { id: 'build', label: '🏗️ Roll up your sleeves', effect: L('You joined the new national service, and helped build the country from nothing.', '🏗️', { stats: { happiness: 3, fitness: 2 } }) },
    ] },
  // ---- Hong Kong and Macau ----
  { id: 'hk.1967', icon: '🧨', title: 'The 1967 riots', when: W(['HK'], 1967, 1967, 12),
    text: 'Leftist unions, inspired by the Cultural Revolution across the border, are on the streets. There are bombs in the post boxes, real and fake; a radio host who mocked them has been burned alive in his car.',
    options: [
      { id: 'home', label: '🏠 Stay off the streets', effect: L('You kept your head down until the bombs stopped. Afterwards the government built the housing estates and the ICAC: it had learned something.', '🏠', { stats: { stress: 4 } }) },
      { id: 'join', label: '✊ March with the leftists', effect: L('You marched with the little red books. Some of your friends were jailed for it.', '✊', { stats: { stress: 8 }, risk: [0.2, 'You were arrested and held for months.', { happiness: -10 }] }) },
    ] },
  { id: 'hk.1984', icon: '📜', title: 'The Joint Declaration', when: W(['HK'], 1984, 1990, 14),
    text: 'Britain and China have signed: Hong Kong goes back to China in 1997, keeping its way of life "unchanged for fifty years". Then came June 1989 in Beijing. Queues are forming at the consulates for Canadian and Australian passports.',
    options: [
      { id: 'stay', label: '🏙️ Stay and see', effect: L('You stayed. Every June you lit a candle in Victoria Park.', '🕯️', { stats: { stress: 3 } }) },
      { id: 'leave', label: '✈️ Emigrate to Canada', effect: L('You joined the exodus to Vancouver: "Hongcouver", the papers called it.', '✈️', { emigrate: 'CA', stats: { stress: 6 } }) },
    ] },
  { id: 'hk.2003', icon: '😷', title: 'SARS', when: W(['HK'], 2003, 2003, 10),
    text: 'A new pneumonia is killing people in Amoy Gardens and the hospitals. The city wears masks; the streets are empty; and in July half a million march against Article 23.',
    options: [
      { id: 'march', label: '🚶 March on the first of July', effect: L('You marched in the heat. The security bill was shelved.', '🚶', { stats: { happiness: 3 } }) },
      { id: 'home', label: '😷 Stay home', effect: L('You stayed home, washed your hands, and waited it out.', '😷', { stats: { stress: 4 } }) },
    ] },
  { id: 'hk.2019', icon: '☂️', title: 'The protests', when: W(['HK'], 2014, 2020, 16),
    text: 'First the umbrellas in 2014; now, over an extradition bill, a million on the streets, then two million. Tear gas in Mong Kok, the airport occupied, the universities under siege. In 2020 Beijing answers with the National Security Law.',
    options: [
      { id: 'frontline', label: '⛑️ Go to the front line', effect: L('You wore the black and the yellow helmet. Some of your friends are in prison now; some are in London.', '⛑️', { stats: { stress: 15 }, risk: [0.25, 'You were arrested and charged with rioting.', { happiness: -15 }] }) },
      { id: 'leave', label: '✈️ Take the BN(O) route to Britain', effect: L('You left for Britain on the BN(O) visa, like a hundred and fifty thousand others.', '✈️', { emigrate: 'GB', stats: { stress: 8 } }) },
      { id: 'quiet', label: '🤐 Keep quiet', effect: L('You kept quiet, at work and online. Most people did.', '🤐', { stats: { stress: 6 } }) },
    ] },
  { id: 'mo.casinos', icon: '🎰', title: 'The casinos open up', when: W(['MO'], 2002, 2008, 14),
    text: 'Stanley Ho\'s monopoly is over: Las Vegas has come to Macau. The Sands, the Venetian, the Wynn; by 2006 Macau takes more than the Strip, and every school-leaver can deal cards.',
    options: [
      { id: 'deal', label: '🃏 Train as a croupier', effect: L('You trained as a croupier: good money, shifts round the clock.', '🃏', { stats: { happiness: 3 }, earn: 3000 }) },
      { id: 'no', label: '📚 Stay in school', effect: L('You stayed in school, though half your class left for the casinos.', '📚', { stats: { smarts: 2 } }) },
    ] },
  // ---- Self-governing territories ----
  { id: 'pr.migration', icon: '✈️', title: 'The Great Migration', when: W(['PR'], 1947, 1965, 18, 40),
    text: 'Operation Bootstrap is turning the island from cane fields to factories, but there aren\'t enough jobs. The cheap flights to New York leave full every day; whole villages have cousins in the Bronx and East Harlem.',
    options: [
      { id: 'go', label: '✈️ Fly to New York', effect: L('You flew to New York with one suitcase, and found work in a garment factory. You were a citizen; you were still called a foreigner.', '✈️', { emigrate: 'US', stats: { stress: 6 } }) },
      { id: 'stay', label: '🏭 Stay for the new factories', effect: L('You stayed, and found work in one of the new factories.', '🏭', { stats: { happiness: 1 } }) },
    ] },
  { id: 'je.liberation', icon: '🎉', title: 'Liberation Day', when: W(['JE', 'GG'], 1945, 1945, 6),
    text: '9 May 1945: British ships in the harbour, and the German garrison has surrendered. After five years of occupation, the last winter close to starvation, the whole island is in the streets.',
    options: [
      { id: 'harbour', label: '🎉 Go down to the harbour', effect: L('You cheered the Tommies in at the harbour, and someone gave you your first chocolate in years.', '🎉', { stats: { happiness: 8 } }) },
    ] },
  { id: 'im.summerland', icon: '🔥', title: 'The Summerland fire', when: W(['IM'], 1973, 1973, 8),
    text: 'August 1973: the Summerland leisure centre on the Douglas seafront has caught fire with three thousand people inside. Fifty people are dead.',
    options: [
      { id: 'help', label: '🚒 Help on the seafront', effect: L('You helped on the seafront that night. The inquiry blamed the building, its plastic walls and its locked doors.', '🚒', { stats: { stress: 8 } }) },
      { id: 'home', label: '🏠 Stay away', effect: L('You heard the sirens all night. Everyone on the island knew someone who was there.', '🏠', { stats: { stress: 4 } }) },
    ] },
  { id: 'ky.ivan', icon: '🌀', title: 'Hurricane Ivan', when: W(['KY'], 2004, 2004, 8),
    text: 'September 2004: Hurricane Ivan has hit Grand Cayman almost head on. The sea came over the island; most of the houses are damaged.',
    options: [
      { id: 'rebuild', label: '🔨 Stay and rebuild', effect: L('You stayed and rebuilt. Within a year the banks and the hotels were open again.', '🔨', { stats: { stress: 8 }, cost: 4000 }) },
    ] },
  { id: 'gi.frontier', icon: '🚧', title: 'The frontier closes', when: W(['GI'], 1969, 1969, 8),
    text: 'Franco has closed the frontier at La Línea in answer to the new constitution: no road, no ferry, no telephone line to Spain. The Spanish workers can\'t come in; families on either side can only shout across the fence.',
    options: [
      { id: 'stay', label: '🪨 Sit it out on the Rock', effect: L('You sat it out on the Rock. It stayed shut for sixteen years, until 1985.', '🪨', { stats: { stress: 5 } }) },
      { id: 'tangier', label: '⛴️ Take the ferry to Tangier for the weekend', effect: L('The ferry to Tangier became your way out; Morocco was the only foreign country you could reach.', '⛴️', { stats: { happiness: 2 } }) },
    ] },
  { id: 'bm.1977', icon: '🔥', title: 'The 1977 riots', when: W(['BM'], 1977, 1977, 14),
    text: 'Two men have been hanged for the killing of the Governor in 1973. Hamilton is burning: British troops are flying in, and there is a curfew.',
    options: [
      { id: 'home', label: '🏠 Stay home through the curfew', effect: L('You stayed home through the curfew. The royal commission that followed blamed decades of racial division.', '🏠', { stats: { stress: 6 } }) },
      { id: 'street', label: '✊ Go out onto the streets', effect: L('You were out on the streets. Some of your friends were arrested.', '✊', { stats: { stress: 10 }, risk: [0.2, 'You were arrested for breaking the curfew.', { happiness: -8 }] }) },
    ] },
  { id: 'fo.crash', icon: '📉', title: 'The crash', when: W(['FO'], 1992, 1994, 18),
    text: 'The fish have gone and the banks have gone with them: a fifth of the islands are out of work, and the boats are being sold for scrap.',
    options: [
      { id: 'denmark', label: '✈️ Move to Denmark', effect: L('You moved to Denmark, with one Faroese in ten.', '✈️', { emigrate: 'DK', stats: { stress: 6 } }) },
      { id: 'stay', label: '🎣 Stay and wait for the fish', effect: L('You stayed. The fish came back, and so, slowly, did the work.', '🎣', { stats: { stress: 8 } }) },
    ] },
  { id: 'gl.qullissat', icon: '⛏️', title: 'Qullissat closes', when: W(['GL'], 1972, 1972, 14),
    text: 'The Danish government has closed the coal mine at Qullissat, and with it the town: twelve hundred people are being moved to the new blocks in Sisimiut and Nuuk.',
    options: [
      { id: 'move', label: '🏢 Move into the new flats', effect: L('You moved into a concrete block in the new town. A lot of people never got used to it.', '🏢', { stats: { stress: 6 } }) },
      { id: 'protest', label: '✊ Sign the protest', effect: L('You signed the protest. The town was closed anyway; it became one of the reasons for home rule.', '✊', { stats: { stress: 4 } }) },
    ] },
  { id: 'gg.evacuation', icon: '🚢', title: 'The evacuation', when: W(['GG'], 1940, 1940, 5, 15),
    text: 'June 1940: France has fallen and the Germans are a few miles away. The schools are being evacuated to England by boat, the teachers with them; parents have a day to decide.',
    options: [
      { id: 'go', label: '🚢 Go with the school to England', effect: L('You sailed with your class to a mill town in the north of England, and didn\'t see your parents for five years.', '🚢', { stats: { stress: 10 } }) },
      { id: 'stay', label: '🏠 Stay on the island', effect: L('Your parents kept you home. You grew up under the occupation: German soldiers in the lanes, and hunger at the end.', '🏠', { stats: { stress: 8, health: -3 } }) },
    ] },
  { id: 'vu.coconutWar', icon: '🥥', title: 'The Coconut War', when: W(['VU'], 1980, 1980, 14),
    text: 'On the eve of independence Jimmy Stevens and his Nagriamel movement, backed by French planters and an American libertarian foundation, have declared Espiritu Santo the Republic of Vemerana. The British and French can\'t agree what to do; Papua New Guinea is sending troops.',
    options: [
      { id: 'vanuaaku', label: '🇻🇺 Back the independence government', effect: L('You stood with Father Walter Lini\'s government. The PNG troops ended the rebellion within weeks, and Vanuatu was born on 30 July.', '🇻🇺', { stats: { happiness: 4 } }) },
      { id: 'nagriamel', label: '🥥 Side with Nagriamel', effect: L('You sided with the rebels. When the PNG troops came, many of them were arrested.', '🥥', { stats: { stress: 10 }, risk: [0.3, 'You were arrested and jailed after the rebellion.', { happiness: -12 }] }) },
      { id: 'away', label: '🏡 Keep out of it', effect: L('You kept your head down until it was over.', '🏡', { stats: { stress: 3 } }) },
    ] },
  { id: 'bn.oil', icon: '🛢️', title: 'Independence', when: W(['BN'], 1984, 1984, 10),
    text: 'Brunei is fully independent at last, on the first of January, rich with oil.',
    options: [
      { id: 'celebrate', label: '🎉 Celebrate', effect: L('You celebrated in Bandar Seri Begawan.', '🎉', { stats: { happiness: 5 } }) },
    ] },
  { id: 'la.1975', icon: '🌄', title: '1975', when: W(['LA'], 1975, 1980, 14),
    text: 'The Pathet Lao have taken over. The king has gone, and the Hmong who fought for the Americans are fleeing across the Mekong.',
    options: [
      { id: 'mekong', label: '🛶 Cross the Mekong to Thailand', effect: L('You crossed the Mekong at night to a camp in Thailand, and later to America.', '🛶', { emigrate: 'US', risk: [0.12, 'Soldiers fired on the crossing.', { health: -15 }] }) },
      { id: 'stay', label: '🏡 Stay', effect: L('You stayed and went to the seminars.', '🏡', { stats: { stress: 6 } }) },
    ] },
  { id: 'mn.1990', icon: '🐎', title: 'The Democratic Revolution', when: W(['MN'], 1990, 1990, 14),
    text: 'Young people are on hunger strike in Sükhbaatar Square, in the snow, for free elections.',
    options: [
      { id: 'square', label: '✊ Join them in the square', effect: L('You stood in the square in the snow. The Politburo resigned. Nobody was shot.', '✊', { stats: { happiness: 8 } }) },
    ] },
  { id: 'tl.1999', icon: '🗳️', title: 'The Referendum', when: W(['TL'], 1999, 1999, 17),
    text: 'The vote for independence is tomorrow. The militias have said they will burn everything if you vote yes.',
    options: [
      { id: 'yes', label: '🗳️ Vote anyway', effect: L('You voted, with 98 per cent of the country turning out. The militias burned Dili. Then the peacekeepers came, and you were free.', '🗳️', { stats: { happiness: 8, stress: 10 }, risk: [0.1, 'You were hurt in the burning of the town.', { health: -15 }] }) },
    ] },
  { id: 'bt.democracy', icon: '🐉', title: 'The First Election', when: W(['BT'], 2008, 2008, 18),
    text: 'The king has given the country democracy, whether it asked for it or not.',
    options: [
      { id: 'vote', label: '🗳️ Vote', effect: L('You voted in Bhutan\'s first general election, in your best gho or kira.', '🗳️', { stats: { happiness: 4 } }) },
    ] },
  // ---- The Americas ----
  { id: 'cr.army', icon: '🕊️', title: 'No More Army', when: W(['CR'], 1948, 1949, 14),
    text: 'After the civil war, Figueres has taken a sledgehammer to the barracks wall: Costa Rica will have no army. The money goes to schools.',
    options: [
      { id: 'cheer', label: '🕊️ Cheer it', effect: L('You watched the barracks become a museum.', '🕊️', { stats: { happiness: 5 } }) },
    ] },
  { id: 'pa.canal', icon: '🚢', title: 'The Canal Comes Home', when: W(['PA'], 1999, 1999, 8),
    text: 'At noon on the 31st of December, the Canal becomes Panama\'s.',
    options: [
      { id: 'watch', label: '🚢 Watch the ships go through', effect: L('You watched the flag go up over the Canal.', '🚢', { stats: { happiness: 6 } }) },
    ] },
  { id: 'do.trujillo', icon: '🦋', title: 'The End of Trujillo', when: W(['DO'], 1961, 1961, 14),
    text: 'Trujillo has been shot on the coast road. Thirty-one years, and nobody quite believes it.',
    options: [
      { id: 'street', label: '🎉 Go into the street', effect: L('You went into the street and tore down a portrait of El Jefe.', '🎉', { stats: { happiness: 7 } }) },
      { id: 'wait', label: '🤐 Wait to be sure', effect: L('You waited a week to be sure he was really dead.', '🤐') },
    ] },
  { id: 'sr.independence', icon: '✈️', title: 'Independence', when: W(['SR'], 1975, 1975, 16),
    text: 'Independence is coming, and a third of the country is flying to the Netherlands while they still have Dutch passports.',
    options: [
      { id: 'nl', label: '✈️ Go to the Netherlands', effect: L('You flew to Amsterdam and started again in the Bijlmer.', '✈️', { emigrate: 'NL' }) },
      { id: 'stay', label: '🇸🇷 Stay and build the country', effect: L('You stayed for independence day.', '🇸🇷', { stats: { happiness: 5 } }) },
    ] },
  { id: 'ca.expo', icon: '🍁', title: 'Expo 67', when: W(['CA'], 1967, 1967, 8),
    text: 'It\'s the centennial, and the whole world has come to Montreal for the Expo.',
    options: [
      { id: 'go', label: '🎡 Go to Expo', effect: L('You collected stamps in your Expo passport from sixty countries, and saw the future.', '🎡', { cost: 30, stats: { happiness: 7 } }) },
    ] },
  { id: 'au.goldRush', icon: '⛏️', title: 'The Gold Rush', when: W(['AU'], 1851, 1860, 16, 45),
    text: 'Gold at Ballarat and Bendigo! Shepherds, clerks and sailors are walking off their jobs for the diggings.',
    options: [
      { id: 'dig', label: '⛏️ Go to the diggings', effect: L('You bought a licence and dug at Ballarat for two summers, and came away with enough gold to pay for it, just.', '⛏️', { earn: 120, stats: { fitness: 3, health: -3 } }) },
      { id: 'sell', label: '🏪 Sell picks and flour to the diggers', effect: L('You sold flour and picks to the diggers at ten times the price, and did better than most of them.', '🏪', { earn: 200 }) },
    ] },
  { id: 'nz.tour', icon: '🏉', title: 'The Springbok Tour', when: W(['NZ'], 1981, 1981, 14),
    text: 'The South African rugby team is touring. The country has split down the middle: the game, or apartheid.',
    options: [
      { id: 'protest', label: '✊ Protest at the ground', effect: L('You marched against the tour in a crash helmet, and lost friends over it.', '✊', { stats: { stress: 8 } }) },
      { id: 'watch', label: '🏉 Watch the game', effect: L('You watched the game. You were never sure afterwards you\'d been right.', '🏉') },
    ] },
  // ---- Europe ----
  { id: 'se.dagenH', icon: '🚗', title: 'Dagen H', when: W(['SE'], 1967, 1967, 12),
    text: 'At five in the morning, the whole country switches from driving on the left to the right.',
    options: [
      { id: 'drive', label: '🚗 Drive very slowly', effect: L('You drove to work on the right for the first time, at a walking pace.', '🚗', { stats: { stress: 2 } }) },
      { id: 'watch', label: '👀 Stay up to watch', effect: L('You stayed up to watch the cars change sides at dawn.', '👀', { stats: { happiness: 3 } }) },
    ] },
  { id: 'at.treaty', icon: '🇦🇹', title: '"Austria Is Free"', when: W(['AT'], 1955, 1955, 8),
    text: 'The foreign minister has held up the State Treaty on the balcony of the Belvedere. The occupation is over.',
    options: [
      { id: 'belvedere', label: '🎉 Go to the Belvedere', effect: L('You were in the crowd at the Belvedere: "Österreich ist frei!"', '🎉', { stats: { happiness: 8 } }) },
    ] },
  { id: 'mt.siege', icon: '✝️', title: 'The Siege', when: (s, y) => hap(s, 'ww2') && cc(s) === 'MT' && y >= 1940 && y <= 1942 && age(s) >= 8,
    text: 'The most bombed place on earth: raids every day, food nearly gone, the shelters cut into the rock.',
    options: [
      { id: 'shelter', label: '⛰️ Live in the rock shelters', effect: L('You lived for months in the rock shelters under Valletta. The island was given the George Cross.', '⛰️', { stats: { health: -8, stress: 12 } }) },
    ] },
  { id: 'is.codWars', icon: '🐟', title: 'The Cod Wars', when: W(['IS'], 1972, 1976, 16),
    text: 'The coastguard is cutting the nets of British trawlers inside the new fishing limit. The Royal Navy has sent frigates.',
    options: [
      { id: 'cheer', label: '🐟 Cheer the coastguard', effect: L('You cheered every net cut on the radio. Iceland won.', '🐟', { stats: { happiness: 5 } }) },
    ] },
  { id: 'al.exodus', icon: '🚢', title: 'The Ships to Italy', when: W(['AL'], 1990, 1991, 14, 45),
    text: 'The regime is collapsing. Thousands are climbing onto ships in Durrës bound for Italy.',
    options: [
      { id: 'ship', label: '🚢 Climb aboard', effect: L('You climbed onto the Vlora with twenty thousand others, and landed in Bari.', '🚢', { emigrate: 'IT' }) },
      { id: 'stay', label: '🏠 Stay', effect: L('You stayed for the first free elections.', '🏠') },
    ] },
  { id: 'lu.strike', icon: '✊', title: 'The General Strike', when: (s, y) => hap(s, 'ww2') && cc(s) === 'LU' && y === 1942 && age(s) >= 14,
    text: 'The Germans have declared Luxembourgers to be Germans and called the young men up for the Wehrmacht. The country is going on strike.',
    options: [
      { id: 'strike', label: '✊ Strike', effect: L('You stopped work with the rest of the country.', '✊', { stats: { stress: 10 }, risk: [0.1, 'You were arrested and deported.', { health: -15, happiness: -15 }] }) },
      { id: 'hide', label: '🏚️ Hide from the call-up', effect: L('You hid in a farm loft rather than wear the German uniform.', '🏚️', { stats: { stress: 10 } }) },
    ] },
  { id: 'li.vote', icon: '🗳️', title: 'Women Vote', when: W(['LI'], 1984, 1984, 20),
    text: 'Liechtenstein\'s men have voted, narrowly, to let women vote.',
    options: [
      { id: 'celebrate', label: '🥂 Celebrate', effect: L('You celebrated with your mother and your sisters.', '🥂', { stats: { happiness: 4 } }) },
    ] },
  { id: 'mc.wedding', icon: '💍', title: 'The Royal Wedding', when: W(['MC'], 1956, 1956, 8),
    text: 'Prince Rainier is marrying an American film star. The world\'s press has descended on the harbour.',
    options: [
      { id: 'watch', label: '👑 Watch from the harbour', effect: L('You watched the bride arrive at the harbour on a liner.', '👑', { stats: { happiness: 5 } }) },
    ] },
  { id: 'sm.refuge', icon: '🏰', title: 'The Refugees', when: (s, y) => hap(s, 'ww2') && cc(s) === 'SM' && y === 1944 && age(s) >= 10,
    text: 'The front has reached the Adriatic. A hundred thousand refugees are pouring into neutral San Marino, ten times its people.',
    options: [
      { id: 'house', label: '🏠 Take a family in', effect: L('You took a family in. They slept in the railway tunnels when the bombs came.', '🏠', { stats: { happiness: 4, stress: 6 } }) },
    ] },
  { id: 'ad.constitution', icon: '🇦🇩', title: 'The Constitution', when: W(['AD'], 1993, 1993, 18),
    text: 'After seven centuries, Andorra has a written constitution and its own vote.',
    options: [
      { id: 'vote', label: '🗳️ Vote yes', effect: L('You voted for the constitution.', '🗳️', { stats: { happiness: 3 } }) },
    ] },
  // ---- The rest of the world's territories ----
  { id: 'ai.revolution', icon: '🏝️', title: 'The Anguilla Revolution', when: W(['AI'], 1967, 1969, 12),
    text: 'The islanders have thrown the St Kitts police off Anguilla and won\'t be ruled from Basseterre. Now British paratroopers are wading ashore at dawn, expecting a fight.',
    options: [
      { id: 'cheer', label: '🇬🇧 Go down to the beach and cheer them', effect: L('You cheered the paratroopers in. There was no fight: what Anguillans wanted was Britain, not St Kitts. The newspapers called it the Bay of Piglets.', '🇬🇧', { stats: { happiness: 5 } }) },
      { id: 'committee', label: '📣 Stand with the Island Council', effect: L('You stood with Ronald Webster\'s council. Anguilla got its way: a dependency of Britain on its own.', '📣', { stats: { stress: 4, happiness: 4 } }) },
    ] },
  { id: 'vg.offshore', icon: '🏦', title: 'The offshore boom', when: W(['VG'], 1984, 1995, 18),
    text: 'The BVI\'s new International Business Companies Act has made Road Town a place to register companies by the hundred thousand. Every office on Main Street wants staff.',
    options: [
      { id: 'agent', label: '🏦 Work for a registered agent', effect: L('You filed incorporations all day for clients you never met. It paid better than anything else on Tortola.', '🏦', { earn: 3000, stats: { stress: 3 } }) },
      { id: 'boats', label: '⛵ Stay with the charter yachts', effect: L('You stayed with the charter boats: the Baths, Jost Van Dyke, Anegada. Less money, more sea.', '⛵', { stats: { happiness: 4 } }) },
    ] },
  { id: 'tc.directrule', icon: '⚖️', title: 'Direct rule', when: W(['TC'], 2009, 2009, 18),
    text: 'After an inquiry found "a high probability of systemic corruption", London has suspended the constitution and the Governor rules alone.',
    options: [
      { id: 'relief', label: '🧹 Good: clean house', effect: L('You thought it was overdue. The Premier fled; elections came back in 2012.', '🧹') },
      { id: 'angry', label: '✊ March against colonial rule', effect: L('You marched on Grand Turk against London taking the islands\' democracy away.', '✊', { stats: { stress: 4 } }) },
    ] },
  { id: 'ms.volcano', icon: '🌋', title: 'The Soufrière Hills', when: W(['MS'], 1995, 1997, 6),
    text: 'The volcano that had slept for centuries is awake. Plymouth is under ash; the south of the island is an exclusion zone; two-thirds of the people will leave.',
    options: [
      { id: 'stay', label: '🏘️ Stay, in the safe north', effect: L('You stayed in the north, in a shelter and then a new house at Brades. Plymouth is buried, a modern Pompeii.', '🏘️', { stats: { stress: 10 } }) },
      { id: 'uk', label: '✈️ Go to Britain', effect: L('You left for Britain, with the right of abode the islanders were given.', '✈️', { stats: { stress: 6 }, emigrate: 'GB' }) },
    ] },
  { id: 'fk.1982', icon: '⚓', title: 'Liberation', when: W(['FK'], 1982, 1982, 8),
    text: 'Seventy-four days of Argentine occupation are over. The Royal Marines are in Stanley; there are minefields across the peat that will take decades to clear.',
    options: [
      { id: 'welcome', label: '🇬🇧 Welcome them in', effect: L('You stood on Ross Road as the paratroopers came in. Sheep farms, a fishing licence boom, a big new airfield at Mount Pleasant: the islands were never the same.', '🇬🇧', { stats: { happiness: 8, stress: 4 } }) },
      { id: 'mines', label: '🚧 Keep the children off the beaches', effect: L('You put up the red-and-white signs yourself. The last minefield was cleared in 2020.', '🚧', { stats: { stress: 4 } }) },
    ] },
  { id: 'sh.napoleon', icon: '🎩', title: 'The Emperor at Longwood', when: W(['SH'], 1815, 1821, 10),
    text: 'A British warship has brought Napoleon Bonaparte to St Helena. He lives at Longwood House on the windy plateau, guarded by two thousand soldiers.',
    options: [
      { id: 'serve', label: '🍽️ Find work at Longwood', effect: L('You carried water and firewood to Longwood. The Emperor once asked your name. He died there in 1821.', '🍽️', { earn: 30 }) },
      { id: 'watch', label: '🔭 Watch the ships on the signal hill', effect: L('You watched the guard ships from Ladder Hill, for the French rescue that never came.', '🔭') },
    ] },
  { id: 'sh.airport', icon: '✈️', title: 'An airport at last', when: W(['SH'], 2016, 2017, 14),
    text: 'For centuries the only way to St Helena was the sea; the RMS St Helena takes five days from Cape Town. Now there is an airport, and the wind shear has delayed the first flights for a year.',
    options: [
      { id: 'fly', label: '✈️ Take one of the first flights', effect: L('You flew to Johannesburg in six hours. Nobody your grandparents knew had ever left so fast.', '✈️', { stats: { happiness: 5 } }) },
      { id: 'ship', label: '🚢 Take the RMS, one last time', effect: L('You took the old RMS on its last voyages. She was retired in 2018.', '🚢') },
    ] },
  { id: 'gu.liberation', icon: '🇺🇸', title: 'Liberation Day', when: W(['GU'], 1944, 1944, 6),
    text: 'After thirty-one months of Japanese occupation, the Americans have landed at Asan and Agat. The people marched to the camp at Manengon are walking home.',
    options: [
      { id: 'walk', label: '🚶 Walk home from Manengon', effect: L('You walked out of the camp into the American lines, thin and alive.', '🚶', { stats: { health: -3, happiness: 10 } }) },
      { id: 'scout', label: '🧭 Guide the Marines through the jungle', effect: L('You guided a Marine patrol through the hills you knew. Liberation Day, 21 July, became your holiday too.', '🧭', { stats: { stress: 8 } }) },
    ] },
  { id: 'vi.1917', icon: '🇩🇰', title: 'Transfer Day', when: W(['VI'], 1917, 1917, 8),
    text: 'The Dannebrog is coming down over Charlotte Amalie and the Stars and Stripes is going up: Denmark has sold the islands to the United States.',
    options: [
      { id: 'watch', label: '🎺 Watch the ceremony at the fort', effect: L('You watched the flags change at Fort Christian. You\'d be an American citizen in ten years.', '🎺') },
      { id: 'leave', label: '⛵ Keep Danish nationality', effect: L('You kept your Danish nationality, as the treaty allowed, and stayed on as a foreigner in your own town.', '⛵') },
    ] },
  { id: 'as.army', icon: '🎖️', title: 'The recruiter comes to Pago Pago', when: W(['AS'], 1980, 2020, 17, 24),
    text: 'An Army recruiter has set up at the high school. Per head, more American Samoans enlist than anyone else under the flag, though they can\'t vote for the President.',
    options: [
      { id: 'enlist', label: '🎖️ Sign up', effect: L('You signed up. The cannery or the Army: most of your class took one or the other.', '🎖️', { stats: { stress: 3 } }) },
      { id: 'no', label: '🐟 Stay home', effect: L('You stayed home, near your aiga and the village.', '🐟') },
    ] },
  { id: 'mp.saipan', icon: '⛰️', title: 'Marpi Point', when: W(['MP'], 1944, 1944, 8),
    text: 'The Americans have taken Saipan. Japanese soldiers are telling civilians the Americans will torture them; families are walking to the cliffs at Marpi Point.',
    options: [
      { id: 'surrender', label: '🏳️ Walk down to the American lines', effect: L('You walked down the hill with your hands up and a white cloth. The Americans gave you water.', '🏳️', { stats: { stress: 10 } }) },
      { id: 'hide', label: '🕳️ Hide in a cave until it\'s over', effect: L('You hid in a cave for three weeks. When you came out, the island was American.', '🕳️', { stats: { health: -6, stress: 12 } }) },
    ] },
  { id: 'gf.bagne', icon: '⛓️', title: 'The last convicts', when: W(['GF'], 1946, 1953, 10),
    text: 'France is closing the bagne at last. The surviving convicts of Saint-Laurent and Devil\'s Island are being shipped home, ghosts in striped clothes.',
    options: [
      { id: 'watch', label: '⛓️ Watch the camp close', effect: L('You watched the last convicts go down to the river. The camp became a museum.', '⛓️') },
      { id: 'help', label: '🍲 Bring food to the libérés', effect: L('You brought soup to the freed men who had nowhere to go.', '🍲', { stats: { happiness: 3 } }) },
    ] },
  { id: 'gf.kourou', icon: '🚀', title: 'Kourou', when: W(['GF'], 1968, 1990, 16),
    text: 'France has built a spaceport at Kourou, close to the equator: engineers from Paris, contracts for anyone who can drive, weld or cook.',
    options: [
      { id: 'work', label: '🚀 Work at the Centre spatial', effect: L('You got a job at the space centre. You watched Ariane rockets go up from your own country.', '🚀', { earn: 2500 }) },
      { id: 'skip', label: '🌳 Stay on the river', effect: L('You stayed on the river. The rockets went up over the forest anyway.', '🌳') },
    ] },
  { id: 'gp.lkp', icon: '✊', title: 'The general strike', when: W(['GP', 'MQ'], 2009, 2009, 16),
    text: 'Forty-four days of general strike against "pwofitasyon": the price of food and fuel, and who owns the shops. The island has stopped.',
    options: [
      { id: 'march', label: '✊ March with the LKP', effect: L('You marched with the collective. They won a 200-euro pay rise for the lowest paid.', '✊', { stats: { stress: 5, happiness: 4 } }) },
      { id: 'queue', label: '⛽ Queue for petrol and wait', effect: L('You queued for petrol and waited it out.', '⛽', { stats: { stress: 5 } }) },
    ] },
  { id: 'mq.pelee', icon: '🌋', title: 'Mount Pelée', when: W(['MQ'], 1902, 1902, 8),
    text: 'The mountain above Saint-Pierre has been rumbling for weeks. The governor says there is nothing to fear; there is an election on.',
    options: [
      { id: 'leave', label: '🏃 Leave Saint-Pierre now', effect: L('You left for Fort-de-France on 7 May. The next morning a cloud of fire killed nearly everyone in Saint-Pierre: twenty-eight thousand people.', '🏃', { stats: { stress: 15 } }) },
      { id: 'stay', label: '🏠 Trust the governor', effect: L('You stayed outside the town, on a hillside farm, and watched the cloud come down on Saint-Pierre. One of the few survivors was a prisoner in a stone cell.', '🏠', { stats: { stress: 20 }, risk: [0.2, 'The burns on your arms never healed well.', { health: -15 }] }) },
    ] },
  { id: 're.creuse', icon: '🚂', title: 'The children sent to France', when: W(['RE'], 1963, 1982, 6, 16),
    text: 'The prefecture is sending children from poor families to the Creuse and other emptying villages in France, "for their future". Your parents have been visited.',
    options: [
      { id: 'refuse', label: '🏠 Your mother refuses', effect: L('Your mother refused. Over two thousand were sent; France apologised in 2014.', '🏠') },
      { id: 'go', label: '✈️ You are sent', effect: L('You were sent to a farm in the Creuse. You didn\'t see Réunion again for thirty years.', '✈️', { stats: { stress: 15, happiness: -10 } }) },
    ] },
  { id: 'yt.1974', icon: '🗳️', title: 'Staying French', when: W(['YT'], 1974, 1976, 16),
    text: 'The Comoros are voting for independence; Mayotte, on its own, votes to stay with France. The "chatouilleuses", the tickling women, have run the departmentalist campaign.',
    options: [
      { id: 'france', label: '🇫🇷 Vote to stay French', effect: L('You voted with the chatouilleuses. Mayotte stayed French; in 2011 it became a department.', '🇫🇷') },
      { id: 'comoros', label: '🇰🇲 Vote for the Comoros', effect: L('You voted for the Comoros, with the minority. The Comorian state still claims the island.', '🇰🇲', { stats: { stress: 3 } }) },
    ] },
  { id: 'nc.ouvea', icon: '🔥', title: 'Les Événements', when: W(['NC'], 1984, 1988, 16),
    text: 'Kanak activists have burned the ballot boxes; there are barricades on the roads, and settlers with rifles at the farms. In 1988 the Ouvéa cave hostage siege ends with nineteen Kanak dead.',
    options: [
      { id: 'flnks', label: '✊ Stand with the FLNKS', effect: L('You stood with Tjibaou and the FLNKS. The Matignon Accords followed; Tjibaou was killed by a hardliner a year later.', '✊', { stats: { stress: 10 } }) },
      { id: 'loyal', label: '🇫🇷 Stand with the loyalists', effect: L('You stood with Lafleur\'s loyalists. The handshake in Paris brought a peace that held.', '🇫🇷', { stats: { stress: 8 } }) },
    ] },
  { id: 'pf.moruroa', icon: '☢️', title: 'The tests at Moruroa', when: W(['PF'], 1966, 1996, 14),
    text: 'France is testing its bombs at Moruroa and Fangataufa atolls: 193 of them, in the air until 1974, then underground. The Centre d\'expérimentation brings jobs and money to Papeete.',
    options: [
      { id: 'work', label: '🏗️ Work for the CEP', effect: L('You worked for the test centre. Good pay; years later, the claims for the cancers began.', '🏗️', { earn: 2000, risk: [0.08, 'You were diagnosed with a thyroid cancer, decades later.', { health: -15 }] }) },
      { id: 'protest', label: '✊ Protest with Oscar Temaru', effect: L('You marched against the tests. When Chirac resumed them in 1995, Papeete rioted.', '✊', { stats: { stress: 5 } }) },
    ] },
  { id: 'aw.statusaparte', icon: '🇦🇼', title: 'Status Aparte', when: W(['AW'], 1986, 1986, 16),
    text: 'On 1 January 1986 Aruba leaves the Netherlands Antilles: a country of its own within the Kingdom, Betico Croes\'s dream. The same year, the Lago refinery closes.',
    options: [
      { id: 'party', label: '🎉 Celebrate on the Plaza', effect: L('You celebrated in Oranjestad. The refinery jobs went, and the hotels came instead.', '🎉', { stats: { happiness: 6 } }) },
      { id: 'refinery', label: '🏭 Look for work after Lago', effect: L('You lost your refinery job and found one in a new hotel on Palm Beach.', '🏭', { stats: { stress: 6 } }) },
    ] },
  { id: 'cw.1969', icon: '🔥', title: 'Trinta di Mei', when: W(['CW'], 1969, 1969, 14),
    text: 'A strike at the Shell refinery has turned into a march on Willemstad, and the march into a riot: Punda is burning. Dutch marines are being flown in.',
    options: [
      { id: 'march', label: '✊ March with the workers', effect: L('You marched with Wilson "Papa" Godett. After the fires, Afro-Curaçaoans began to govern the island.', '✊', { stats: { stress: 10 } }) },
      { id: 'home', label: '🏠 Stay home and shut the doors', effect: L('You stayed home behind shutters and watched the smoke over Punda.', '🏠', { stats: { stress: 6 } }) },
    ] },
  { id: 'sx.irma', icon: '🌀', title: 'Hurricane Irma', when: W(['SX'], 2017, 2017, 6),
    text: 'A Category 5 hurricane has gone straight over the island. Most roofs are gone; the airport terminal is wrecked; there is looting in Philipsburg.',
    options: [
      { id: 'rebuild', label: '🔨 Rebuild', effect: L('You stayed and rebuilt, with Dutch marines handing out water.', '🔨', { stats: { stress: 12 } }) },
      { id: 'leave', label: '✈️ Go to the Netherlands', effect: L('You flew to the Netherlands on a military flight, with a Dutch passport and nothing else.', '✈️', { stats: { stress: 8 }, emigrate: 'NL' }) },
    ] },
  { id: 'ck.1965', icon: '🌺', title: 'Self-government', when: W(['CK'], 1965, 1965, 14),
    text: 'The Cook Islands govern themselves now, in free association with New Zealand: Albert Henry is Premier, and every Cook Islander keeps a New Zealand passport.',
    options: [
      { id: 'stay', label: '🌺 Stay on Rarotonga', effect: L('You stayed on Rarotonga. Within a generation more Cook Islanders would live in New Zealand than at home.', '🌺') },
      { id: 'nz', label: '✈️ Go to Auckland for work', effect: L('You went to Auckland, like so many, on the passport self-government let you keep.', '✈️', { emigrate: 'NZ' }) },
    ] },
  { id: 'eh.greenmarch', icon: '🏜️', title: 'The Green March', when: W(['EH'], 1975, 1976, 12),
    text: 'Spain is leaving. 350,000 Moroccans are marching across the border, and Moroccan and Mauritanian troops behind them. The Polisario Front has proclaimed a Sahrawi Republic.',
    options: [
      { id: 'tindouf', label: '⛺ Flee to the camps at Tindouf', effect: L('You fled across the desert to the camps in Algeria, under Moroccan air raids. The camps are still there.', '⛺', { stats: { stress: 18, health: -6 } }) },
      { id: 'stay', label: '🏠 Stay in El Aaiún', effect: L('You stayed in El Aaiún under Moroccan rule. The Berm, a sand wall 2,700 kilometres long, divides your country now.', '🏠', { stats: { stress: 10 } }) },
    ] },
  // ---- The smallest places ----
  { id: 'pn.longboat', icon: '🚣', title: 'The longboats', when: W(['PN'], 1850, 2026, 14),
    text: 'A ship is standing off Bounty Bay. There is no harbour: the whole island launches the longboats through the surf to trade carvings and fruit for flour, letters and news.',
    options: [
      { id: 'row', label: '🚣 Take an oar', effect: L('You rowed out through the surf with the men. It was how Pitcairn met the world.', '🚣', { stats: { fitness: 3, happiness: 3 } }) },
      { id: 'carve', label: '🪵 Sell your carvings', effect: L('You sold your miro-wood carvings on the deck. A ship a month, if you were lucky.', '🪵', { earn: 40 }) },
    ] },
  { id: 'nu.heta', icon: '🌀', title: 'Cyclone Heta', when: W(['NU'], 2004, 2004, 6),
    text: 'Cyclone Heta has thrown the sea up over the cliffs at Alofi: the hospital, the museum, the houses on the clifftop are gone. Many say they will move to Auckland now.',
    options: [
      { id: 'stay', label: '🏝️ Stay and rebuild', effect: L('You stayed. Fewer than two thousand of you are left on the Rock.', '🏝️', { stats: { stress: 10 } }) },
      { id: 'nz', label: '✈️ Go to Auckland', effect: L('You went to Auckland, where twenty thousand Niueans already live.', '✈️', { emigrate: 'NZ' }) },
    ] },
  { id: 'tk.vote', icon: '🗳️', title: 'Self-government?', when: W(['TK'], 2006, 2007, 18),
    text: 'Tokelau votes on self-government in free association with New Zealand, like the Cook Islands and Niue. It needs two-thirds.',
    options: [
      { id: 'yes', label: '✅ Vote yes', effect: L('You voted yes. It fell short of two-thirds, twice: 60 per cent in 2006, 64 in 2007.', '✅') },
      { id: 'no', label: '✖️ Vote no', effect: L('You voted no: better New Zealand\'s territory, with its money, than a country of 1,400 people.', '✖️') },
    ] },
  { id: 'nf.2015', icon: '🌲', title: 'The end of self-government', when: W(['NF'], 2015, 2016, 18),
    text: 'Canberra has abolished the Legislative Assembly. Norfolk will be run like a shire of New South Wales; Islanders will pay Australian income tax.',
    options: [
      { id: 'protest', label: '✊ Write to the UN', effect: L('You joined the petition to the UN to put Norfolk on the list of non-self-governing territories.', '✊', { stats: { stress: 4 } }) },
      { id: 'accept', label: '🤷 Accept the Medicare card', effect: L('You took the Medicare card and the pension. It was hard to say no to.', '🤷') },
    ] },
  { id: 'cx.tampa', icon: '🚢', title: 'The Tampa', when: W(['CX'], 2001, 2001, 14),
    text: 'A Norwegian freighter, the Tampa, has rescued 433 asylum seekers from a sinking boat and is anchored off the island. Canberra will not let them land; the SAS have boarded her.',
    options: [
      { id: 'help', label: '🍲 Send food out to the ship', effect: L('You helped send food out to the ship. They were taken to Nauru. Australia built a detention centre on the island.', '🍲', { stats: { stress: 4 } }) },
      { id: 'watch', label: '👀 Watch from the cliffs', effect: L('You watched the ship from the cliffs for a week.', '👀') },
    ] },
  { id: 'cc.1984', icon: '🗳️', title: 'The Act of Self-Determination', when: W(['CC'], 1984, 1984, 18),
    text: 'Under UN observers, the Cocos Malays vote: independence, free association, or integration with Australia. The Clunies-Ross estate has been bought out; no more plastic tokens.',
    options: [
      { id: 'au', label: '🇦🇺 Vote to integrate', effect: L('You voted with the large majority to join Australia.', '🇦🇺') },
      { id: 'free', label: '🏝️ Vote for free association', effect: L('You voted for free association, with the few.', '🏝️') },
    ] },
  { id: 'wf.kings', icon: '👑', title: 'The Lavelua', when: W(['WF'], 1960, 2026, 16),
    text: 'The King of Uvea, the Lavelua, is choosing his chiefs. Under the French Republic the three kings still allot the land and judge the customary cases.',
    options: [
      { id: 'serve', label: '👑 Serve at the royal court', effect: L('You served at the Lavelua\'s court at Mata-Utu: a republic\'s kingdom.', '👑', { stats: { happiness: 3 } }) },
      { id: 'noumea', label: '✈️ Go to Nouméa for work', effect: L('You went to New Caledonia for work, like half of all Wallisians.', '✈️', { emigrate: 'NC' }) },
    ] },
  { id: 'pm.rum', icon: '🥃', title: 'Rum row', when: W(['PM'], 1920, 1933, 16),
    text: 'America has gone dry. Saint-Pierre\'s warehouses are full of Canadian whisky and French champagne for the rum-runners: Al Capone\'s men stay at the Hôtel Robert.',
    options: [
      { id: 'run', label: '🥃 Work the warehouses', effect: L('You loaded cases onto fast boats bound for the New England coast. Saint-Pierre had never been so rich.', '🥃', { earn: 800 }) },
      { id: 'fish', label: '🐟 Stay with the cod', effect: L('You stayed with the cod. When Prohibition ended, so did the boom.', '🐟') },
    ] },
  { id: 'bl.1878', icon: '🇸🇪', title: 'The Swedes leave', when: W(['BL'], 1878, 1878, 10),
    text: 'Sweden has sold St Barthélemy back to France. The Swedish flag comes down over Gustavia, after ninety-four years.',
    options: [
      { id: 'watch', label: '🎺 Watch the ceremony', effect: L('You watched the flags change. The street names stayed Swedish.', '🎺') },
      { id: 'vote', label: '🗳️ Vote in the plebiscite', effect: L('You voted, with all but one of your neighbours, to return to France.', '🗳️') },
    ] },
  { id: 'mf.irma', icon: '🌀', title: 'Irma', when: W(['MF'], 2017, 2017, 6),
    text: 'Hurricane Irma has wrecked nine buildings in ten on the French side. The Dutch side across the road is no better.',
    options: [
      { id: 'rebuild', label: '🔨 Rebuild', effect: L('You stayed and rebuilt, with gendarmes flown in from Guadeloupe.', '🔨', { stats: { stress: 12 } }) },
      { id: 'france', label: '✈️ Go to France', effect: L('You flew to Paris on an evacuation flight.', '✈️', { emigrate: 'FR' }) },
    ] },
  { id: 'bq.2010', icon: '🇳🇱', title: '10-10-10', when: W(['BQ'], 2010, 2010, 16),
    text: 'The Netherlands Antilles are dissolved. Bonaire, Sint Eustatius and Saba become special municipalities of the Netherlands: the dollar, Dutch law, and same-sex marriage from The Hague.',
    options: [
      { id: 'welcome', label: '🇳🇱 Welcome it', effect: L('You welcomed the Dutch money for schools and the hospital.', '🇳🇱') },
      { id: 'resent', label: '😠 Resent it', effect: L('You resented the "recolonisation": the prices went up faster than the pensions.', '😠', { stats: { stress: 3 } }) },
    ] },
  { id: 'ax.bomarsund', icon: '💥', title: 'Bomarsund', when: W(['AX'], 1854, 1854, 8),
    text: 'An Anglo-French fleet is bombarding the new Russian fortress at Bomarsund. The war is in the Crimea, but it has come to Åland too.',
    options: [
      { id: 'watch', label: '⛵ Watch from a fishing boat', effect: L('You watched the fortress surrender. The peace of 1856 forbade anyone to fortify Åland again.', '⛵') },
      { id: 'hide', label: '🏠 Stay at the farm', effect: L('You stayed at the farm and listened to the guns.', '🏠', { stats: { stress: 4 } }) },
    ] },
  { id: 'io.expulsion', icon: '🚢', title: 'The expulsion', when: W(['IO'], 1968, 1973, 1),
    text: 'The plantation is closing. The administrators have gassed the dogs, and the islanders are being loaded onto the Nordvaer for Mauritius, with what they can carry. The island is for the Americans now.',
    options: [
      { id: 'mu', label: '🇲🇺 Go to Mauritius', effect: L('You were put ashore at Port Louis with nothing. The Chagossians never stopped fighting to go home.', '🇲🇺', { stats: { stress: 20, happiness: -15 }, emigrate: 'MU' }) },
      { id: 'sc', label: '🇸🇨 Go to the Seychelles', effect: L('You were taken to the Seychelles, to a prison cell first.', '🇸🇨', { stats: { stress: 20, happiness: -15 }, emigrate: 'SC' }) },
    ] },
];

/** When colonies became countries, for the independence-day moment. */
const INDEPENDENCE = { CI: 1960, BJ: 1960, CF: 1960, CG: 1960, CM: 1960, GA: 1960, TG: 1960, MG: 1960, CD: 1960, GN: 1958, SL: 1961, TZ: 1961, UG: 1962, ZM: 1964, GM: 1965, MU: 1968, GQ: 1968, KM: 1975, SC: 1976, DJ: 1977 };
