/**
 * More moments of history, for forty countries that had only their region's shared one, and
 * follow-ups that come back years later to a choice you made (the key kept from 1948, the
 * brother who stayed behind, the Stasi file).
 *
 * Same shape as RegionalEpisodes (merged into LivingHistory.ALL_EPISODES); effects:
 * { log, icon, stats, cost, earn, risk, emigrate }. The lived record keeps the option you chose
 * (state.lived: { id, year, option }), which `chose` reads.
 */
const cc = (s) => s.character.countryId ?? 'US';
const age = (s) => s.character.age;
const hap = (s, id) => Boolean(s.era?.events?.[id]);
const female = (s) => s.character.gender === 'female';
const male = (s) => s.character.gender !== 'female';
/** In one of these countries, between these years, between these ages. */
const W = (ccs, from, to, min = 16, max = 99) => (s, y) => ccs.includes(cc(s)) && y >= from && y <= to && age(s) >= min && age(s) <= max;
/** …and only if the timeline's event has happened in this world. */
const WH = (id, ccs, from, to, min = 16, max = 99) => (s, y) => hap(s, id) && W(ccs, from, to, min, max)(s, y);
const L = (log, icon, more = {}) => ({ log, icon, ...more });

/** The lived record of an episode, if you lived it. */
const livedOf = (s, id) => (s.lived ?? []).find((l) => l.id === id) ?? null;
/** You lived this episode (and made this choice, if one is named). */
export const chose = (s, id, option = null) => { const l = livedOf(s, id); return Boolean(l) && (!option || l.option === option); };
/** Years since you lived it. */
const since = (s, id, y) => y - (livedOf(s, id)?.year ?? y);
/** A follow-up: you made this choice, at least `after` years ago (and no more than `within`), and you're old enough. */
const F = (id, option, after, within = 60, min = 16) => (s, y) => chose(s, id, option) && since(s, id, y) >= after && since(s, id, y) <= within && age(s) >= min;

export const MORE_EPISODES = [
  // ---- Pakistan ----
  { id: 'pk.partition', icon: '🚂', title: 'Partition', when: W(['PK'], 1947, 1947, 8),
    text: "The line has been drawn. Trains are arriving at Lahore full of people fleeing the other way, and some arrive full of the dead. Your Sikh and Hindu neighbours are packing in the night.",
    options: [
      { id: 'shelter', label: "🏠 Hide the neighbours until they can leave safely", effect: L("You hid the family next door in your storeroom for nine days, then walked them to the convoy. They wept, and so did you.", '🏠', { stats: { stress: 10, happiness: 2 }, risk: [0.08, "A mob came to the house looking for them. You talked them away, but not before they beat you.", { health: -10 }] }) },
      { id: 'camp', label: "⛺ Work in the refugee camps", effect: L("You carried water and dug latrines at the Walton camp for the families pouring in from East Punjab.", '⛺', { stats: { health: -3, happiness: 3 } }) },
      { id: 'home', label: "🚪 Keep your own family indoors", effect: L("You kept your family indoors while the city burned, and came out to a different country.", '🚪', { stats: { stress: 8 } }) },
    ] },
  { id: 'pk.gulf', icon: '🏗️', title: 'Work in the Gulf', when: W(['PK'], 1975, 1995, 18, 40),
    text: "Dubai and Riyadh are building cities out of sand, and they need men. An agent in Rawalpindi has a visa for a construction job, if you can pay his fee.",
    options: [
      { id: 'go', label: "✈️ Go to the Gulf", effect: L("You poured concrete in Dubai for six years, sleeping twelve to a room, and built your parents a brick house with the money.", '✈️', { cost: 800, earn: 7000, stats: { health: -4, happiness: -2 } }) },
      { id: 'stay', label: "🏡 Stay home", effect: L("You stayed. Half the young men of the village went; the new houses with tin water tanks were theirs.", '🏡') },
    ] },
  { id: 'pk.quake05', icon: '🏔️', title: 'The Kashmir Earthquake', when: W(['PK'], 2005, 2005, 12),
    text: "At 8:50 on a Saturday morning the mountains shook. Whole towns in Kashmir and the north are gone, schools full of children among them.",
    options: [
      { id: 'drive', label: "🚚 Drive supplies north", effect: L("You filled a truck with blankets and flour and drove it up the broken roads to Muzaffarabad.", '🚚', { cost: 300, stats: { happiness: 5, stress: 6 } }) },
      { id: 'give', label: "💵 Give what you can", effect: L("You gave to the relief fund at the mosque.", '💵', { cost: 100, stats: { happiness: 2 } }) },
    ] },
  // ---- Bangladesh ----
  { id: 'bd.cyclone70', icon: '🌀', title: 'The Great Cyclone', when: W(['BD'], 1970, 1970, 6),
    text: "A cyclone has come in from the Bay of Bengal at night, with a storm surge over the islands. Hundreds of thousands are dead, and the government in the West is barely sending help.",
    options: [
      { id: 'help', label: "🛶 Go to the islands to help", effect: L("You went out on a boat to Bhola and helped bury the dead and feed the living. You never forgot what you saw, or who didn't come.", '🛶', { stats: { stress: 10, happiness: -3 } }) },
      { id: 'home', label: "🏠 Stay and look after your own", effect: L("You looked after your own, and listened to the news from the coast with growing anger.", '🏠', { stats: { stress: 4 } }) },
    ] },
  { id: 'bd.garment', icon: '🧵', title: 'The Garment Factories', when: (s, y) => W(['BD'], 1985, 2012, 15, 35)(s, y) && female(s),
    text: "Every month girls from the villages take the bus to Dhaka, to the factories sewing shirts for the West. The wage is small, but it's yours.",
    options: [
      { id: 'go', label: "🧵 Go to Dhaka and work in a factory", effect: L("You sewed collars on shirts for an American brand, twelve hours a day, and sent money home. Your own money, for the first time.", '🧵', { earn: 1500, stats: { health: -3, happiness: 2 } }) },
      { id: 'stay', label: "🌾 Stay in the village", effect: L("You stayed in the village. Your cousin went, and came back at Eid in a new sari.", '🌾') },
    ] },
  { id: 'bd.rana', icon: '🏚️', title: 'Rana Plaza', when: W(['BD'], 2013, 2013, 12),
    text: "Yesterday there were cracks in the walls of the Rana Plaza factory building. This morning the managers ordered everyone back in. Now it has collapsed with three thousand people inside.",
    options: [
      { id: 'dig', label: "🧱 Go to Savar and dig", effect: L("You dug with the volunteers for days, passing water down to people trapped under the floors. Over a thousand never came out.", '🧱', { stats: { stress: 12, happiness: 2, health: -3 } }) },
      { id: 'protest', label: "✊ March for the workers", effect: L("You marched with the garment unions for safe buildings. Some of the brands signed an accord.", '✊', { stats: { happiness: 2 } }) },
    ] },
  // ---- Ethiopia ----
  { id: 'et.adwa', icon: '🛡️', title: 'Adwa', when: (s, y) => W(['ET'], 1896, 1896, 16, 45)(s, y) && male(s),
    text: "Italy has marched in from Eritrea to make Ethiopia its colony. Emperor Menelik has called every man who can carry a spear or a rifle to march north.",
    options: [
      { id: 'march', label: "🛡️ March with the emperor", effect: L("You marched north and fought at Adwa, where the Italians were routed. Africa's victory, and yours.", '🛡️', { stats: { happiness: 8 }, risk: [0.15, "You were wounded by Italian shellfire on the slopes.", { health: -18 }] }) },
      { id: 'farm', label: "🌾 Stay and work the fields", effect: L("You stayed and kept the farm going. The news of Adwa came south like a song.", '🌾', { stats: { happiness: 3 } }) },
    ] },
  { id: 'et.patriots', icon: '🏔️', title: 'The Patriots', when: W(['ET'], 1936, 1940, 16, 50),
    text: "The Italians have taken Addis Ababa with gas and aeroplanes, and the emperor is in exile. In the hills the arbegnoch, the patriots, fight on.",
    options: [
      { id: 'join', label: "🏔️ Join the patriots in the hills", effect: L("You fought with the arbegnoch in the highlands for years, until the emperor came home in 1941.", '🏔️', { stats: { stress: 10, happiness: 4 }, risk: [0.15, "You were wounded in an ambush on an Italian column.", { health: -15 }] }) },
      { id: 'feed', label: "🍞 Feed and hide them", effect: L("You left bread and news for the patriots at the edge of the forest, and told the Italians nothing.", '🍞', { stats: { stress: 6 } }) },
      { id: 'keep', label: "🤐 Keep your head down", effect: L("You kept your head down under the occupation, and waited.", '🤐', { stats: { happiness: -3 } }) },
    ] },
  { id: 'et.redterror', icon: '🩸', title: 'The Red Terror', when: W(['ET'], 1977, 1978, 15, 40),
    text: "The Derg is hunting its enemies in the cities. Bodies are left in the streets with signs on them, and families are charged for the bullets.",
    options: [
      { id: 'hide', label: "🤐 Burn your pamphlets and lie low", effect: L("You burned everything with writing on it and kept away from your old friends. Some of them disappeared.", '🤐', { stats: { stress: 12, happiness: -4 } }) },
      { id: 'flee', label: "🚶 Walk to Sudan", effect: L("You walked for weeks to the Sudanese border, and on from the camps to a new life abroad.", '🚶', { emigrate: 'US', stats: { health: -6 } }) },
    ] },
  // ---- Colombia ----
  { id: 'co.bogotazo', icon: '🔥', title: 'El Bogotazo', when: W(['CO'], 1948, 1948, 12),
    text: "Jorge Eliécer Gaitán, the Liberal people's man, has been shot dead on a Bogotá street. The city is burning, and the countryside will follow.",
    options: [
      { id: 'streets', label: "🔥 Go into the streets", effect: L("You were in the crowds that burned the centre of Bogotá. What came after was called La Violencia, and it lasted ten years.", '🔥', { stats: { stress: 8 }, risk: [0.1, "You were shot in the street fighting.", { health: -18 }] }) },
      { id: 'home', label: "🚪 Bar the door", effect: L("You barred the door while the city burned, and listened to the radio.", '🚪', { stats: { stress: 6 } }) },
    ] },
  { id: 'co.medellin', icon: '💣', title: 'The Cartel Years', when: W(['CO'], 1989, 1993, 12),
    text: "The cartel is at war with the state: car bombs in the cities, judges and candidates shot, a plane blown up in the air.",
    options: [
      { id: 'carry', label: "🚌 Carry on, as everyone does", effect: L("You took different routes to work and stayed away from crowds, and carried on, as everyone did.", '🚌', { stats: { stress: 8 } }) },
      { id: 'leave', label: "✈️ Leave for Miami", effect: L("You left for Miami, where half your neighbourhood seemed to end up.", '✈️', { emigrate: 'US' }) },
    ] },
  // ---- Algeria ----
  { id: 'dz.war', icon: '⛰️', title: 'The War of Independence', when: W(['DZ'], 1955, 1961, 15, 45),
    text: "The FLN has risen against France. The army is herding villages into camps; in the Casbah of Algiers there are bombs and paratroopers.",
    options: [
      { id: 'maquis', label: "⛰️ Join the maquis", effect: L("You went up into the mountains with the FLN.", '⛰️', { stats: { stress: 12, happiness: 3 }, risk: [0.18, "You were wounded and taken prisoner by the paratroopers.", { health: -18, happiness: -8 }] }) },
      { id: 'carry', label: "📦 Carry messages in the city", effect: L("You carried messages and money for the FLN through the checkpoints of Algiers.", '📦', { stats: { stress: 10 }, risk: [0.1, "You were picked up in a sweep and interrogated for days.", { health: -10, happiness: -8 }] }) },
      { id: 'france', label: "🚢 Go to work in France", effect: L("You took the boat to Marseille and work on the building sites around Paris.", '🚢', { emigrate: 'FR' }) },
    ] },
  { id: 'dz.decade', icon: '🌑', title: 'The Black Decade', when: W(['DZ'], 1993, 1998, 14),
    text: "The army cancelled the election the Islamists were winning, and now there's a war with no front: massacres in the villages at night, bombs in the cities.",
    options: [
      { id: 'endure', label: "🚪 Stay, and be home before dark", effect: L("You lived through it by being home before dark and trusting no one.", '🚪', { stats: { stress: 12, happiness: -5 } }) },
      { id: 'leave', label: "✈️ Leave for France", effect: L("You left for France, like so many journalists, doctors and teachers did.", '✈️', { emigrate: 'FR' }) },
    ] },
  { id: 'dz.hirak', icon: '🇩🇿', title: 'The Hirak', when: W(['DZ'], 2019, 2019, 16),
    text: "The ailing president wants a fifth term. Every Friday, millions are marching peacefully against it.",
    options: [
      { id: 'march', label: "🚶 March on Fridays", effect: L("You marched every Friday with your family. He resigned in April.", '🚶', { stats: { happiness: 6 } }) },
      { id: 'watch', label: "📺 Watch", effect: L("You watched it on television, half hoping, half afraid.", '📺') },
    ] },
  // ---- Sudan ----
  { id: 'sd.october', icon: '✊', title: 'The October Revolution', when: W(['SD'], 1964, 1964, 16),
    text: "The students, the doctors and the railway workers are on general strike against General Abboud. Khartoum has stopped.",
    options: [
      { id: 'strike', label: "✊ Join the strike", effect: L("You struck with everyone else. The general stepped down within a week.", '✊', { stats: { happiness: 6 } }) },
      { id: 'home', label: "🏠 Stay home", effect: L("You stayed home and listened to the radio until the general fell.", '🏠') },
    ] },
  { id: 'sd.sitin', icon: '🎶', title: 'The Sit-In', when: W(['SD'], 2019, 2019, 14),
    text: "After months of bread protests, a sit-in has taken over the square outside army headquarters in Khartoum: poetry, songs, and a young woman in white chanting on a car roof.",
    options: [
      { id: 'join', label: "⛺ Join the sit-in", effect: L("You camped at the sit-in. Bashir fell in April; in June the militias broke it up with gunfire.", '⛺', { stats: { happiness: 4, stress: 10 }, risk: [0.08, "You were caught in the June massacre and badly hurt.", { health: -15 }] }) },
      { id: 'supply', label: "🍲 Bring food and water", effect: L("You brought food and water to the sit-in every evening.", '🍲', { stats: { happiness: 4 } }) },
    ] },
  // ---- Iraq ----
  { id: 'iq.iranwar', icon: '🪖', title: 'The War with Iran', when: (s, y) => W(['IQ'], 1980, 1988, 18, 45)(s, y) && male(s),
    text: "The war with Iran has no end in sight. Your call-up papers have come.",
    options: [
      { id: 'serve', label: "🪖 Go to the front", effect: L("You served years on the southern front, in trenches like the last world war's.", '🪖', { stats: { stress: 15, happiness: -6 }, risk: [0.2, "You were wounded in a human-wave attack near Basra.", { health: -22 }] }) },
      { id: 'dodge', label: "🏃 Hide from the call-up", effect: L("You hid with relatives in the countryside. Deserters were shot, so you kept very still.", '🏃', { stats: { stress: 14 } }) },
    ] },
  { id: 'iq.sanctions', icon: '🍞', title: 'The Sanctions Years', when: W(['IQ'], 1992, 2002, 12),
    text: "After the Gulf War the sanctions have emptied the shops. The dinar is worthless; doctors sell their books to eat; the ration card is what keeps the family alive.",
    options: [
      { id: 'sell', label: "📚 Sell what you own, piece by piece", effect: L("You sold the books, then the furniture, then your mother's gold.", '📚', { cost: 500, stats: { stress: 8, happiness: -5 } }) },
      { id: 'leave', label: "🚌 Leave for Jordan", effect: L("You took the long road through the desert to Amman, and worked wherever you could.", '🚌', { emigrate: 'JO' }) },
    ] },
  { id: 'iq.2003', icon: '🛩️', title: 'The Invasion', when: W(['IQ'], 2003, 2003, 10),
    text: "The Americans have crossed the border, and Baghdad is being bombed at night. The statue in Firdos Square comes down; then the looting starts.",
    options: [
      { id: 'guard', label: "🏛️ Guard the hospital (or the museum)", effect: L("You stood with neighbours guarding the hospital from looters with a borrowed rifle.", '🏛️', { stats: { stress: 10, happiness: 3 } }) },
      { id: 'home', label: "🏠 Stay inside and wait", effect: L("You stayed inside with the windows taped and waited for it to end. It didn't end for years.", '🏠', { stats: { stress: 10 } }) },
    ] },
  // ---- Canada ----
  { id: 'ca.vimy', icon: '🍁', title: 'The Canadian Corps', when: (s, y) => WH('ww1', ['CA'], 1915, 1917, 18, 40)(s, y) && male(s),
    text: "The recruiting posters are everywhere and the casualty lists are long. Your friends from school have signed up.",
    options: [
      { id: 'enlist', label: "🍁 Enlist", effect: L("You enlisted and went over with the Canadian Corps. At Vimy Ridge, in April 1917, the four divisions took the ridge together.", '🍁', { stats: { stress: 15 }, risk: [0.22, "You were badly wounded at Vimy.", { health: -25 }] }) },
      { id: 'farm', label: "🌾 Farm for the war effort", effect: L("You farmed, and the wheat went to feed the armies.", '🌾', { earn: 400 }) },
    ] },
  { id: 'ca.flag', icon: '🍁', title: 'A Flag of Our Own', when: W(['CA'], 1965, 1965, 8),
    text: "After a bitter fight in Parliament, the Red Ensign comes down and a new red-and-white flag with a single maple leaf goes up.",
    options: [
      { id: 'cheer', label: "🍁 Cheer it", effect: L("You watched the maple leaf go up on Parliament Hill and liked it more every year.", '🍁', { stats: { happiness: 3 } }) },
      { id: 'miss', label: "🇬🇧 Miss the old one", effect: L("You missed the Red Ensign. Your children never knew it.", '🇬🇧') },
    ] },
  // ---- Uzbekistan ----
  { id: 'uz.cotton', icon: '☁️', title: 'The Cotton Harvest', when: W(['UZ'], 1950, 1990, 12, 50),
    text: "It's September, and Moscow's cotton plan must be met. Schools and offices are emptied; everyone goes to the fields to pick.",
    options: [
      { id: 'pick', label: "☁️ Pick your quota", effect: L("You picked cotton for two months under the sun, as everyone did, every autumn.", '☁️', { stats: { health: -3, happiness: -2 } }) },
      { id: 'pay', label: "💵 Pay someone to pick for you", effect: L("You paid a farmer's son to pick your quota. Everyone knew how it worked.", '💵', { cost: 150 }) },
    ] },
  { id: 'uz.quake66', icon: '🏚️', title: 'The Tashkent Earthquake', when: W(['UZ'], 1966, 1966, 8),
    text: "An earthquake right under the city has brought down the old mud-brick quarters. Builders are coming from every republic to put up a new Tashkent.",
    options: [
      { id: 'tent', label: "⛺ Live in the tent city", effect: L("You lived in a tent for a summer, then got a flat in a new block built by workers from Leningrad.", '⛺', { stats: { stress: 6 } }) },
      { id: 'build', label: "🏗️ Help rebuild", effect: L("You worked on the rebuilding with brigades from all over the Union.", '🏗️', { earn: 300, stats: { happiness: 3 } }) },
    ] },
  // ---- Morocco ----
  { id: 'ma.agadir', icon: '🏚️', title: 'The Agadir Earthquake', when: W(['MA'], 1960, 1960, 8),
    text: "Fifteen seconds near midnight, and Agadir is flattened. A third of the city is dead under the rubble.",
    options: [
      { id: 'help', label: "🧱 Go and help", effect: L("You went south to help dig, and stayed to help build the new city on safer ground.", '🧱', { stats: { stress: 8, happiness: 3 } }) },
      { id: 'give', label: "💵 Give what you can", effect: L("You gave to the relief, and prayed for the dead.", '💵', { cost: 60 }) },
    ] },
  { id: 'ma.europe', icon: '🏭', title: 'Work in Europe', when: W(['MA'], 1963, 1974, 18, 40),
    text: "The agreements with France, Belgium and the Netherlands are signed: the mines and factories of the North want Moroccan workers.",
    options: [
      { id: 'fr', label: "🇫🇷 Go to France", effect: L("You went to work in the car plants outside Paris.", '🏭', { emigrate: 'FR' }) },
      { id: 'be', label: "🇧🇪 Go to Belgium", effect: L("You went down the coal mines of Wallonia.", '⛏️', { emigrate: 'BE' }) },
      { id: 'stay', label: "🏡 Stay home", effect: L("You stayed. Every summer the cars came back down through Spain, loaded to the roof.", '🏡') },
    ] },
  { id: 'ma.greenmarch', icon: '🟩', title: 'The Green March', when: W(['MA'], 1975, 1975, 16, 55),
    text: "The king has called for 350,000 volunteers to march, unarmed, carrying Qurans and flags, into the Spanish Sahara.",
    options: [
      { id: 'march', label: "🟩 March", effect: L("You marched into the desert with the Green March, waving the flag and the Quran.", '🟩', { stats: { happiness: 5, health: -2 } }) },
      { id: 'stay', label: "📻 Follow it on the radio", effect: L("You followed it on the radio, day by day.", '📻') },
    ] },
  // ---- Angola ----
  { id: 'ao.1975', icon: '🇦🇴', title: 'Independence, and War', when: W(['AO'], 1975, 1976, 12),
    text: "The Portuguese are leaving in a hurry, in an airlift of everything they own. Three movements are fighting for Luanda, and foreign armies are coming.",
    options: [
      { id: 'luanda', label: "🏙️ Stay in Luanda", effect: L("You stayed in Luanda and saw the flag go up at midnight on the eleventh of November, with gunfire on the edge of the city.", '🏙️', { stats: { stress: 10, happiness: 3 } }) },
      { id: 'village', label: "🌾 Go back to the village", effect: L("You went back to your family's village, out of the way of the armies, for as long as that lasted.", '🌾', { stats: { stress: 6 } }) },
    ] },
  { id: 'ao.peace', icon: '🕊️', title: 'Peace at Last', when: W(['AO'], 2002, 2002, 10),
    text: "Savimbi is dead, and after twenty-seven years the war is over. The roads are opening, full of landmines.",
    options: [
      { id: 'home', label: "🏡 Go home to the province", effect: L("You went back to your home province for the first time in decades. The house was gone; the people mostly too.", '🏡', { stats: { happiness: 4, stress: 4 } }) },
      { id: 'city', label: "🏙️ Stay in the city", effect: L("You stayed in Luanda, where the oil money was starting to flow.", '🏙️') },
    ] },
  { id: 'ao.boom', icon: '🛢️', title: 'The Oil Boom', when: W(['AO'], 2005, 2014, 18, 55),
    text: "Oil at a hundred dollars a barrel: Luanda has cranes on every skyline and the dearest rents in the world, beside the musseques.",
    options: [
      { id: 'hustle', label: "🛻 Start a trade", effect: L("You started a candonga trade, buying in Namibia and selling in Luanda, and did well while the boom lasted.", '🛻', { earn: 1500, stats: { stress: 4 } }) },
      { id: 'steady', label: "🧾 Keep your steady job", effect: L("You kept your job and watched the towers go up.", '🧾') },
    ] },
  // ---- Afghanistan ----
  { id: 'af.1996', icon: '🏚️', title: 'The Taliban Take Kabul', when: W(['AF'], 1996, 1996, 12),
    text: "After four years of the factions shelling Kabul to ruins, the Taliban have taken the city. Girls' schools are closed, music is banned, and men must grow beards.",
    options: [
      { id: 'school', label: "📚 Teach girls in secret", effect: L("You taught girls to read in a back room, a few at a time, with lookouts at the door.", '📚', { stats: { stress: 12, happiness: 4 }, risk: [0.08, "The school was found. You were beaten in the street.", { health: -12 }] }) },
      { id: 'peshawar', label: "🚌 Go to Peshawar", effect: L("You took the road through the Khyber to Peshawar, like millions before you.", '🚌', { emigrate: 'PK' }) },
      { id: 'endure', label: "🤐 Endure", effect: L("You endured, and buried the radio in the yard.", '🤐', { stats: { happiness: -6 } }) },
    ] },
  { id: 'af.2004', icon: '🗳️', title: 'The First Vote', when: W(['AF'], 2004, 2004, 18),
    text: "After the Taliban's fall, a presidential election: ten million registered, women among them, despite the threats.",
    options: [
      { id: 'vote', label: "🗳️ Vote", effect: L("You queued for hours in the dust and voted, with ink on your finger.", '🗳️', { stats: { happiness: 5 } }) },
      { id: 'stay', label: "🏠 Stay home, it's dangerous", effect: L("You stayed home: there had been threats against the polling stations.", '🏠') },
    ] },
  { id: 'af.2021', icon: '🛫', title: 'The Airport', when: W(['AF'], 2021, 2021, 14),
    text: "The Taliban have walked into Kabul and the government has fled. At the airport, thousands are pressing at the gates for a seat on the last planes.",
    options: [
      { id: 'airport', label: "🛫 Go to the airport", effect: L("You waited days at the Abbey Gate with your papers held up, and got onto a plane.", '🛫', { emigrate: 'US', stats: { stress: 15 }, risk: [0.06, "You were caught in the bombing at the gate.", { health: -20 }] }) },
      { id: 'stay', label: "🏠 Stay", effect: L("You stayed, and the world you had built in twenty years closed up around you.", '🏠', { stats: { happiness: -8 } }) },
    ] },
  // ---- Saudi Arabia ----
  { id: 'sau.boom', icon: '🛢️', title: 'The Oil Boom', when: W(['SA'], 1974, 1981, 16),
    text: "The price of oil has quadrupled. There are new roads, new hospitals, scholarships abroad, and cranes over every city.",
    options: [
      { id: 'study', label: "🎓 Take a scholarship abroad", effect: L("You studied in America on a government scholarship and came home to a good job in the ministry.", '🎓', { stats: { smarts: 4, happiness: 3 } }) },
      { id: 'trade', label: "🏗️ Go into business", effect: L("You went into business supplying the building sites, and did very well.", '🏗️', { earn: 6000 }) },
    ] },
  { id: 'sau.mecca', icon: '🕋', title: 'The Siege of the Grand Mosque', when: W(['SA'], 1979, 1979, 12),
    text: "On the first day of the new century in the Islamic calendar, armed men have seized the Grand Mosque in Mecca with worshippers inside.",
    options: [
      { id: 'pray', label: "🤲 Pray for it to end", effect: L("You prayed for the pilgrims. After two weeks the security forces took the mosque back; afterwards the country became more careful and more conservative.", '🤲', { stats: { stress: 4 } }) },
    ] },
  { id: 'sau.drive', icon: '🚗', title: 'Women at the Wheel', when: (s, y) => W(['SA'], 2018, 2018, 18)(s, y) && female(s),
    text: "From today, women may drive. The licence centres are open.",
    options: [
      { id: 'drive', label: "🚗 Get your licence", effect: L("You took your test and drove yourself to work, the first time in your life.", '🚗', { cost: 400, stats: { happiness: 7 } }) },
      { id: 'later', label: "🕰️ Not yet", effect: L("You decided to wait and see. Your sister went the first week.", '🕰️') },
    ] },
  // ---- Peru ----
  { id: 'pe.yungay', icon: '🏔️', title: 'The Ancash Earthquake', when: W(['PE'], 1970, 1970, 8),
    text: "An earthquake has shaken loose the face of Huascarán. An avalanche of ice and rock has buried the town of Yungay; only the people in the cemetery on the hill survived.",
    options: [
      { id: 'help', label: "🧱 Go up to help", effect: L("You went up into the Callejón de Huaylas to help. You never forgot the palm trees sticking out of the mud where the plaza had been.", '🧱', { stats: { stress: 10, happiness: 2 } }) },
      { id: 'give', label: "💵 Give what you can", effect: L("You gave to the relief.", '💵', { cost: 60 }) },
    ] },
  { id: 'pe.sendero', icon: '🔦', title: 'Shining Path', when: W(['PE'], 1983, 1992, 14),
    text: "Shining Path is killing village leaders in Ayacucho, the army is killing suspected supporters, and now the car bombs and blackouts have reached Lima.",
    options: [
      { id: 'lima', label: "🏙️ Move to Lima", effect: L("You left the sierra for a shack on a hillside in Lima, like hundreds of thousands of others.", '🏙️', { stats: { stress: 8 } }) },
      { id: 'ronda', label: "🛡️ Join the village ronda", effect: L("You joined the rondas campesinas that patrolled the village at night against Sendero.", '🛡️', { stats: { stress: 12 }, risk: [0.12, "You were wounded in a raid.", { health: -16 }] }) },
      { id: 'endure', label: "🕯️ Endure the blackouts", effect: L("You lived by candlelight through the blackouts, and kept away from crowds.", '🕯️', { stats: { stress: 8 } }) },
    ] },
  { id: 'pe.fujishock', icon: '💸', title: 'The Fujishock', when: W(['PE'], 1990, 1990, 16),
    text: "Overnight, the new government has freed prices: petrol up thirty times, bread twelve. Prices were already rising thousands of per cent a year.",
    options: [
      { id: 'olla', label: "🍲 Cook in the communal kitchen", effect: L("You cooked with the other women in the comedor popular, feeding the street on what you had.", '🍲', { stats: { happiness: 2, stress: 6 } }) },
      { id: 'dollars', label: "💵 Get what savings you have into dollars", effect: L("You changed everything into dollars on the street. It was the only thing that held.", '💵', { stats: { stress: 6 } }) },
    ] },
  // ---- Malaysia ----
  { id: 'my.merdeka', icon: '🇲🇾', title: 'Merdeka!', when: W(['MY'], 1957, 1957, 8),
    text: "At midnight on 31 August the Union Jack comes down in Kuala Lumpur, and in the morning the Tunku cries \"Merdeka!\" in the new stadium.",
    options: [
      { id: 'stadium', label: "🏟️ Be in the stadium", effect: L("You were in the Merdeka Stadium and shouted with the Tunku, seven times.", '🏟️', { stats: { happiness: 7 } }) },
      { id: 'radio', label: "📻 Listen at home", effect: L("You listened at home with the whole family.", '📻', { stats: { happiness: 3 } }) },
    ] },
  { id: 'my.may13', icon: '🚨', title: 'The Thirteenth of May', when: W(['MY'], 1969, 1969, 10),
    text: "After the election, rioting has broken out between Malays and Chinese in Kuala Lumpur. There's a curfew, and smoke over the city.",
    options: [
      { id: 'shelter', label: "🏠 Shelter neighbours of the other race", effect: L("You took in the family across the road until the curfew lifted. You stayed friends for life.", '🏠', { stats: { stress: 10, happiness: 3 } }) },
      { id: 'inside', label: "🚪 Stay inside", effect: L("You stayed inside under the curfew while the city burned.", '🚪', { stats: { stress: 8 } }) },
    ] },
  { id: 'my.reformasi', icon: '✊', title: 'Reformasi', when: W(['MY'], 1998, 1998, 16),
    text: "The deputy prime minister has been sacked and arrested, and has a black eye in court. Crowds are chanting \"Reformasi!\" on the streets.",
    options: [
      { id: 'march', label: "✊ March", effect: L("You marched for Reformasi and got tear-gassed on Jalan Tuanku Abdul Rahman.", '✊', { stats: { stress: 6, happiness: 2 } }) },
      { id: 'quiet', label: "🤐 Keep out of it", effect: L("You kept out of it. The economy was bad enough.", '🤐') },
    ] },
  // ---- Madagascar ----
  { id: 'mg.1947', icon: '🔥', title: 'The 1947 Rising', when: W(['MG'], 1947, 1948, 15),
    text: "The island has risen against the French. The rebels have spears and a few rifles; the colonial army has the rest, and is burning villages.",
    options: [
      { id: 'forest', label: "🌳 Go into the forest with the rebels", effect: L("You fled into the eastern forests with the rebels. Many died of hunger and fever there.", '🌳', { stats: { stress: 15, health: -8 }, risk: [0.15, "You were caught and imprisoned for years.", { happiness: -15 }] }) },
      { id: 'village', label: "🏠 Stay in the village", effect: L("You stayed and kept your head down while the soldiers came through.", '🏠', { stats: { stress: 10 } }) },
    ] },
  { id: 'mg.1972', icon: '📢', title: 'Rotaka', when: W(['MG'], 1972, 1972, 14, 40),
    text: "The students are on strike against French-run schools and the old regime. Tananarive's streets are full.",
    options: [
      { id: 'join', label: "📢 Join the students", effect: L("You marched with the students. The president handed power to the army within weeks.", '📢', { stats: { happiness: 4 }, risk: [0.08, "You were hurt when the police fired on the crowd.", { health: -12 }] }) },
      { id: 'home', label: "🏠 Stay home", effect: L("You stayed home and watched the old order fall.", '🏠') },
    ] },
  // ---- Nepal ----
  { id: 'np.peoplewar', icon: '⛰️', title: "The People's War", when: W(['NP'], 1997, 2005, 14),
    text: "The Maoists hold the hills. They want young people for their army, the army suspects everyone, and the villages are emptying.",
    options: [
      { id: 'city', label: "🏙️ Go to Kathmandu", effect: L("You left the village for Kathmandu, away from both sides.", '🏙️', { stats: { stress: 6 } }) },
      { id: 'abroad', label: "✈️ Go abroad to work", effect: L("You took a work visa to Malaysia and sent money home for years.", '✈️', { earn: 3000, stats: { health: -3 } }) },
      { id: 'stay', label: "🏡 Stay in the village", effect: L("You stayed in the village between the Maoists and the army.", '🏡', { stats: { stress: 12 } }) },
    ] },
  { id: 'np.2006', icon: '🕯️', title: 'Jana Andolan', when: W(['NP'], 2006, 2006, 14),
    text: "Nineteen days of curfews and protests against the king's direct rule. Kathmandu's ring road is full of people.",
    options: [
      { id: 'march', label: "🕯️ March", effect: L("You marched on the ring road with hundreds of thousands. The king gave up power; two years later the monarchy was gone.", '🕯️', { stats: { happiness: 6 } }) },
      { id: 'home', label: "🏠 Stay home", effect: L("You stayed home through the curfews.", '🏠') },
    ] },
  // ---- Yemen ----
  { id: 'ye.unity', icon: '🇾🇪', title: 'Unification', when: W(['YE'], 1990, 1990, 10),
    text: "North and South Yemen are one country. The border posts are coming down.",
    options: [
      { id: 'travel', label: "🚌 Go and see the other half", effect: L("You took the bus to Aden (or Sanaa) for the first time in your life.", '🚌', { stats: { happiness: 5 } }) },
    ] },
  { id: 'ye.saudi', icon: '🧳', title: 'Sent Home', when: W(['YE'], 1990, 1991, 18, 50),
    text: "Yemen didn't back the war against Iraq, so Saudi Arabia is expelling Yemeni workers: nearly a million, sent back with what they can carry.",
    options: [
      { id: 'home', label: "🧳 Take in returning relatives", effect: L("Your cousins came back from Jeddah with nothing, and lived with you for a year.", '🧳', { cost: 300, stats: { stress: 6 } }) },
    ] },
  { id: 'ye.2015', icon: '💥', title: 'The War', when: W(['YE'], 2015, 2016, 12),
    text: "The Houthis have taken Sanaa, and a Saudi-led coalition is bombing. The ports are blockaded; food and fuel are running short.",
    options: [
      { id: 'stay', label: "🏠 Stay and endure", effect: L("You stayed, rationing water and listening to the planes at night.", '🏠', { stats: { stress: 15, health: -5 } }) },
      { id: 'flee', label: "⛵ Cross to Djibouti", effect: L("You crossed the Bab-el-Mandeb in a fishing boat to Djibouti.", '⛵', { emigrate: 'DJ' }) },
    ] },
  // ---- Cameroon ----
  { id: 'cm.lions', icon: '⚽', title: 'The Indomitable Lions', when: W(['CM'], 1990, 1990, 6),
    text: "At the World Cup in Italy, Cameroon have beaten the champions Argentina, and Roger Milla, thirty-eight, is dancing at the corner flag.",
    options: [
      { id: 'dance', label: "💃 Dance in the street", effect: L("You danced in the street all night. Cameroon reached the quarter-finals, the first African side ever.", '💃', { stats: { happiness: 8 } }) },
    ] },
  { id: 'cm.anglophone', icon: '🔥', title: 'The Anglophone Crisis', when: W(['CM'], 2017, 2019, 12),
    text: "In the English-speaking regions, protests by lawyers and teachers have become a war between separatists and the army. Schools are shut, villages burned.",
    options: [
      { id: 'leave', label: "🚌 Leave for Douala or Yaoundé", effect: L("You left Bamenda for Douala with what you could carry.", '🚌', { stats: { stress: 8 } }) },
      { id: 'stay', label: "🏠 Stay", effect: L("You stayed through the ghost-town Mondays and the curfews.", '🏠', { stats: { stress: 12 } }) },
    ] },
  // ---- Ghana ----
  { id: 'gh.mustgo', icon: '🧳', title: 'Ghana Must Go', when: W(['GH'], 1983, 1983, 12),
    text: "Nigeria has expelled its foreign workers, a million of them Ghanaian. They're coming home along the coast road with striped plastic bags, into a drought and a famine.",
    options: [
      { id: 'host', label: "🏠 Take in returning family", effect: L("Your brother came back from Lagos with one bag and four children. You fed them through Rawlings' chain year.", '🏠', { cost: 300, stats: { stress: 8 } }) },
      { id: 'farm', label: "🌽 Plant whatever grows", effect: L("You planted cassava in every corner of the yard. Everyone was thin that year.", '🌽', { stats: { health: -4 } }) },
    ] },
  { id: 'gh.1992', icon: '🗳️', title: 'Back to the Ballot', when: W(['GH'], 1992, 1992, 18),
    text: "After eleven years of military rule there's a new constitution and a presidential election.",
    options: [
      { id: 'vote', label: "🗳️ Vote", effect: L("You voted in the first election in eleven years.", '🗳️', { stats: { happiness: 3 } }) },
      { id: 'boycott', label: "✋ Sit it out", effect: L("You sat it out; you didn't trust it. The next ones were better.", '✋') },
    ] },
  // ---- Côte d'Ivoire ----
  { id: 'ci.miracle', icon: '🍫', title: 'The Ivorian Miracle', when: W(['CI'], 1965, 1978, 16, 50),
    text: "Cocoa and coffee prices are high, Abidjan has skyscrapers and a lagoon lined with hotels, and the whole region is coming to work here.",
    options: [
      { id: 'plant', label: "🌱 Plant cocoa", effect: L("You cleared forest land and planted cocoa. For a decade it paid very well.", '🌱', { earn: 2500 }) },
      { id: 'city', label: "🏙️ Work in Abidjan", effect: L("You got a job in Abidjan, in the city that called itself the Paris of West Africa.", '🏙️', { stats: { happiness: 3 } }) },
    ] },
  { id: 'ci.2002', icon: '⚔️', title: 'The Country Splits', when: W(['CI'], 2002, 2003, 12),
    text: "A failed coup has become a civil war: the rebels hold the north, the government the south, and French troops sit between them.",
    options: [
      { id: 'south', label: "🚌 Go south to Abidjan", effect: L("You left Bouaké for Abidjan, and the country stayed cut in two for years.", '🚌', { stats: { stress: 8 } }) },
      { id: 'stay', label: "🏠 Stay", effect: L("You stayed where you were, on the wrong side of a line nobody had drawn before.", '🏠', { stats: { stress: 10 } }) },
    ] },
  { id: 'ci.2011', icon: '🔥', title: 'The Post-Election Crisis', when: W(['CI'], 2011, 2011, 12),
    text: "Two men both say they won the election. Abidjan is fighting street by street.",
    options: [
      { id: 'hide', label: "🏠 Shelter at home", effect: L("You sheltered at home for weeks with the mattresses against the windows.", '🏠', { stats: { stress: 14 } }) },
      { id: 'flee', label: "🚶 Flee to Liberia or Ghana", effect: L("You fled across the border until it was over.", '🚶', { stats: { stress: 10 } }) },
    ] },
];

MORE_EPISODES.push(
  // ---- North Korea ----
  { id: 'kp.chollima', icon: '🐎', title: 'Chollima', when: W(['KP'], 1958, 1961, 14, 50),
    text: "The Party calls for Chollima speed, the winged horse that runs a thousand li a day: double the plan, rebuild everything the war flattened.",
    options: [
      { id: 'brigade', label: "🐎 Join a Chollima work team", effect: L("Your work team was named a Chollima brigade, and you got a medal and a photograph.", '🐎', { stats: { happiness: 3, health: -3 } }) },
      { id: 'steady', label: "🔧 Do your quota and no more", effect: L("You did your quota and kept your opinions to yourself.", '🔧') },
    ] },
  { id: 'kp.march', icon: '🥣', title: 'The Arduous March', when: W(['KP'], 1995, 1998, 6),
    text: "The floods came, the Soviet aid stopped, and the public distribution system has collapsed. People are eating grass and bark, and the markets are where food is.",
    options: [
      { id: 'market', label: "🧺 Trade at the jangmadang", effect: L("You traded at the black market: noodles, then cigarettes, then anything from China. It kept your family alive.", '🧺', { stats: { stress: 10, health: -6 } }) },
      { id: 'forage', label: "🌿 Forage in the hills", effect: L("You foraged for roots and pine bark in the hills, as everyone did.", '🌿', { stats: { health: -12, happiness: -6 } }) },
    ] },
  { id: 'kp.river', icon: '🌊', title: 'The River', when: W(['KP'], 1997, 2015, 16, 50),
    text: "A broker says he can get you across the frozen Tumen into China, and from there, maybe, all the way to Seoul. If you're caught, it's a camp.",
    options: [
      { id: 'cross', label: "🌊 Cross the river", effect: L("You crossed the Tumen at night, hid for a year in China, and went overland through Laos to Thailand and a plane to Seoul.", '🌊', { emigrate: 'KR', stats: { stress: 18 }, risk: [0.15, "You were caught in China and sent back to a labour camp for two years.", { health: -18, happiness: -15 }] }) },
      { id: 'stay', label: "🏠 Stay", effect: L("You stayed. Someone from your street went, and the family was questioned for weeks.", '🏠') },
    ] },
  // ---- Australia ----
  { id: 'au.anzac', icon: '🎖️', title: 'Gallipoli', when: (s, y) => WH('ww1', ['AU'], 1914, 1916, 18, 40)(s, y) && male(s),
    text: "The AIF wants men. The first convoy has gone, and the papers say there'll be a landing somewhere in the Dardanelles.",
    options: [
      { id: 'enlist', label: "🎖️ Enlist in the AIF", effect: L("You enlisted and went ashore at Anzac Cove. You remembered the twenty-fifth of April for the rest of your life.", '🎖️', { stats: { stress: 15 }, risk: [0.22, "You were badly wounded on the ridges above the cove.", { health: -25 }] }) },
      { id: 'home', label: "🐑 Stay on the land", effect: L("You stayed on the land. The white feathers came in the post.", '🐑', { stats: { happiness: -2 } }) },
    ] },
  { id: 'au.sydney2000', icon: '🏅', title: 'The Sydney Olympics', when: W(['AU'], 2000, 2000, 6),
    text: "Sydney has the Olympics. Cathy Freeman is in the final of the 400 metres in her green-and-gold suit.",
    options: [
      { id: 'there', label: "🏟️ Get tickets", effect: L("You were in the stadium when Cathy Freeman won, with 112,000 people roaring.", '🏟️', { cost: 400, stats: { happiness: 8 } }) },
      { id: 'tv', label: "📺 Watch at the pub", effect: L("You watched it at the pub, and the whole pub stood up.", '📺', { stats: { happiness: 5 } }) },
    ] },
  // ---- Taiwan ----
  { id: 'tw.1949', icon: '🚢', title: 'The Mainlanders Arrive', when: W(['TW'], 1949, 1949, 8),
    text: "The Nationalists have lost the mainland. Two million soldiers and refugees are arriving at Keelung, and Taipei is now the capital of all China, they say.",
    options: [
      { id: 'help', label: "🍚 Share what you have", effect: L("You shared rice with a soldier's family from Shandong who had nothing. Your children grew up together.", '🍚', { stats: { happiness: 3 } }) },
      { id: 'wary', label: "🤐 Keep your distance", effect: L("You kept your distance. After 1947, everyone was careful.", '🤐') },
    ] },
  { id: 'tw.921', icon: '🏚️', title: 'The 921 Earthquake', when: W(['TW'], 1999, 1999, 8),
    text: "At 1:47 in the morning the island shook for a long time. In Nantou and Taichung, buildings are down and the power is out across the island.",
    options: [
      { id: 'volunteer', label: "🦺 Volunteer", effect: L("You drove to Nantou with a car full of water and stayed a week with the volunteers.", '🦺', { stats: { happiness: 4, stress: 6 } }) },
      { id: 'donate', label: "💵 Donate", effect: L("You gave to the relief at a convenience store, like everyone did.", '💵', { cost: 100 }) },
    ] },
  { id: 'tw.2000', icon: '🗳️', title: 'The Opposition Wins', when: W(['TW'], 2000, 2000, 20),
    text: "For the first time, the Kuomintang may lose the presidency, to the opposition DPP.",
    options: [
      { id: 'dpp', label: "🟢 Vote for the opposition", effect: L("You voted DPP, and they won. Power changed hands peacefully, for the first time in Chinese history.", '🟢', { stats: { happiness: 4 } }) },
      { id: 'kmt', label: "🔵 Vote for the KMT", effect: L("You voted KMT. They lost, and handed over power without a fuss.", '🔵') },
    ] },
  // ---- Kenya ----
  { id: 'ke.sabasaba', icon: '✊', title: 'Saba Saba', when: W(['KE'], 1990, 1990, 16),
    text: "On the seventh of the seventh, opposition leaders have called a rally for multiparty democracy. The government has banned it, and arrested them.",
    options: [
      { id: 'kamukunji', label: "✊ Go to Kamukunji anyway", effect: L("You went to Kamukunji grounds; the police fired on the crowds. A year later, Moi allowed multiparty politics.", '✊', { stats: { stress: 8, happiness: 3 }, risk: [0.08, "You were hurt in the riots.", { health: -12 }] }) },
      { id: 'home', label: "🏠 Stay home", effect: L("You stayed home, and heard about it from those who went.", '🏠') },
    ] },
  { id: 'ke.2007', icon: '🔥', title: 'After the Election', when: W(['KE'], 2007, 2008, 12),
    text: "The election count was stopped, then the president was sworn in at dusk. In the Rift Valley and the slums of Nairobi, neighbours are turning on neighbours.",
    options: [
      { id: 'shelter', label: "🏠 Shelter neighbours of the other tribe", effect: L("You hid the family next door in your house until the mobs passed.", '🏠', { stats: { stress: 12, happiness: 3 } }) },
      { id: 'flee', label: "🚌 Go to your home area", effect: L("You took the family to your home area until the peace deal was signed.", '🚌', { stats: { stress: 10 } }) },
    ] },
  { id: 'ke.mpesa', icon: '📱', title: 'Money on the Phone', when: W(['KE'], 2007, 2010, 16),
    text: "Safaricom's M-Pesa lets you send money by text message. Your mother in the village could get your money in a minute.",
    options: [
      { id: 'use', label: "📱 Start using it", effect: L("You sent your mother money by phone, and never queued at a bus stop with an envelope again.", '📱', { stats: { happiness: 3 } }) },
      { id: 'agent', label: "🏪 Become an M-Pesa agent", effect: L("You opened an M-Pesa kiosk by the market and earned on every deposit.", '🏪', { cost: 500, earn: 1500 }) },
    ] },
  // ---- Sweden ----
  { id: 'se.america', icon: '🚢', title: 'Amerika', when: W(['SE'], 1867, 1913, 16, 40),
    text: "The harvests failed again. A million Swedes have gone to America; the letters from Minnesota talk of land for anyone who'll farm it.",
    options: [
      { id: 'go', label: "🚢 Go to America", effect: L("You took the boat from Gothenburg and the train to Minnesota.", '🚢', { emigrate: 'US' }) },
      { id: 'stay', label: "🌾 Stay", effect: L("You stayed. Every family had someone in America.", '🌾') },
    ] },
  { id: 'se.dagenh', icon: '🚗', title: 'Dagen H', when: W(['SE'], 1967, 1967, 12),
    text: "At 4:50 this morning all traffic stopped, crossed carefully to the other side of the road, and waited. At five, Sweden drove on the right.",
    options: [
      { id: 'watch', label: "👀 Get up to watch", effect: L("You got up in the dark to watch the cars change sides on the main street. Nobody crashed.", '👀', { stats: { happiness: 3 } }) },
    ] },
  { id: 'se.palme', icon: '🌹', title: 'The Prime Minister Is Shot', when: W(['SE'], 1986, 1986, 10),
    text: "Olof Palme was shot dead on Sveavägen walking home from the cinema with his wife, with no bodyguards. Nobody saw who did it.",
    options: [
      { id: 'roses', label: "🌹 Lay a rose", effect: L("You laid a red rose on the pavement where he fell. The pile was waist-high.", '🌹', { stats: { happiness: -3 } }) },
    ] },
  // ---- Austria ----
  { id: 'at.1918', icon: '👑', title: 'The End of the Empire', when: W(['AT'], 1918, 1919, 10),
    text: "The emperor has gone, the empire has broken into new countries, and Vienna, capital of fifty million last year, is the capital of six and a half. There's no coal and little bread.",
    options: [
      { id: 'queue', label: "🥖 Queue for bread", effect: L("You queued for bread in the cold, and burned furniture for heat that winter.", '🥖', { stats: { health: -5, happiness: -4 } }) },
      { id: 'farm', label: "🚂 Go to relatives in the country", effect: L("You took the train to relatives on a farm in Styria, and ate.", '🚂') },
    ] },
  { id: 'at.anschluss', icon: '🦅', title: 'The Anschluss', when: W(['AT'], 1938, 1938, 12),
    text: "German troops have crossed the border to cheering crowds. On the Heldenplatz they're cheering Hitler; in the Leopoldstadt Jews are being made to scrub the pavements.",
    options: [
      { id: 'help', label: "🤝 Help a Jewish neighbour get out", effect: L("You helped a Jewish family next door sell up for something and get papers for England.", '🤝', { stats: { stress: 10, happiness: 4 } }) },
      { id: 'leave', label: "🚂 Leave yourself", effect: L("You left for Switzerland on one of the last ordinary trains.", '🚂', { emigrate: 'CH' }) },
      { id: 'silent', label: "🤐 Keep quiet", effect: L("You kept quiet, as most did.", '🤐', { stats: { happiness: -4 } }) },
    ] },
  // ---- Switzerland ----
  { id: 'ch.strike18', icon: '✊', title: 'The General Strike', when: W(['CH'], 1918, 1918, 16),
    text: "Prices have doubled in the war and wages haven't. The unions have called a general strike, and the army is in the streets of Zurich.",
    options: [
      { id: 'strike', label: "✊ Strike", effect: L("You struck for three days, until the army ended it. Most of what you asked for came later anyway.", '✊', { stats: { stress: 6, happiness: 2 } }) },
      { id: 'work', label: "🏭 Keep working", effect: L("You kept working through it.", '🏭') },
    ] },
  { id: 'ch.aktivdienst', icon: '🏔️', title: 'Aktivdienst', when: (s, y) => WH('ww2', ['CH'], 1939, 1945, 20, 48)(s, y) && male(s),
    text: "General Guisan has mobilised the army. You'll spend months at a time on the frontier or in the Alpine redoubt.",
    options: [
      { id: 'serve', label: "🏔️ Serve", effect: L("You did your Aktivdienst on the northern frontier and in the mountains, year after year.", '🏔️', { stats: { stress: 6, health: 2 } }) },
    ] },
  // ---- Israel ----
  { id: 'il.1967', icon: '🏜️', title: 'The Six-Day War', when: W(['IL'], 1967, 1967, 10),
    text: "For three weeks the country waited, digging trenches and preparing parks as cemeteries. Now the war has started, and on the third day the paratroopers are at the Western Wall.",
    options: [
      { id: 'serve', label: "🪖 Go with your reserve unit", effect: L("You went with your reserve unit, and it was over in six days.", '🪖', { stats: { stress: 10, happiness: 4 }, risk: [0.1, "You were wounded in the fighting.", { health: -18 }] }) },
      { id: 'wall', label: "🕍 Go to the Wall when it opens", effect: L("You went to the Western Wall with half the country when the Old City opened.", '🕍', { stats: { happiness: 5 } }) },
    ] },
  { id: 'il.1973', icon: '🚨', title: 'Yom Kippur', when: W(['IL'], 1973, 1973, 18, 50),
    text: "The sirens are sounding on the holiest day of the year, with the radio off. Egypt and Syria have attacked together; the reserves are being called up from the synagogues.",
    options: [
      { id: 'front', label: "🪖 Go to the front", effect: L("You went straight from the synagogue to your unit, and to the Golan.", '🪖', { stats: { stress: 15 }, risk: [0.15, "You were wounded on the Golan.", { health: -22 }] }) },
      { id: 'home', label: "🏠 Hold the home front", effect: L("You held the home front: the shops, the children, the waiting for news.", '🏠', { stats: { stress: 10 } }) },
    ] },
  { id: 'il.1991', icon: '🎭', title: 'The Sealed Room', when: W(['IL'], 1991, 1991, 6),
    text: "Iraq is firing Scud missiles at Tel Aviv. Every family has gas masks and a sealed room with plastic on the windows. Meanwhile a million new immigrants are arriving from the Soviet Union.",
    options: [
      { id: 'room', label: "🎭 Wait it out in the sealed room", effect: L("You spent nights in the sealed room in your gas mask, listening to the radio.", '🎭', { stats: { stress: 8 } }) },
      { id: 'olim', label: "🧳 Help the new immigrants", effect: L("You helped a family from Kharkiv learn Hebrew and find work. The father, a surgeon, swept streets for a year.", '🧳', { stats: { happiness: 4 } }) },
    ] },
  // ---- Norway ----
  { id: 'no.occupation', icon: '🏔️', title: 'The Occupation', when: WH('ww2', ['NO'], 1940, 1944, 15),
    text: "The Germans have occupied Norway and Quisling runs a puppet government. The teachers refuse to join his party; boats leave for Shetland at night.",
    options: [
      { id: 'resist', label: "📻 Join the Home Front", effect: L("You carried illegal newspapers and messages for Milorg.", '📻', { stats: { stress: 12, happiness: 3 }, risk: [0.1, "You were arrested and sent to Grini.", { health: -12, happiness: -10 }] }) },
      { id: 'shetland', label: "⛵ Take the Shetland Bus", effect: L("You crossed to Shetland in a fishing boat and joined the Norwegian forces in Britain.", '⛵', { stats: { stress: 10 } }) },
      { id: 'quiet', label: "🧊 Give the cold shoulder", effect: L("You kept the cold shoulder: nobody sat next to a German on the tram.", '🧊') },
    ] },
  { id: 'no.may45', icon: '🇳🇴', title: '17 May 1945', when: W(['NO'], 1945, 1945, 6),
    text: "The Germans surrendered a week ago. It's Constitution Day, the first in five years that anyone can celebrate in the open: flags that were hidden in attics are out, and the children's parade is marching again.",
    options: [
      { id: 'parade', label: "🎺 March in the parade", effect: L("You marched down the street behind the school band, waving a flag that had been hidden under the floorboards since 1940.", '🎺', { stats: { happiness: 10 } }) },
      { id: 'reckon', label: "⚖️ Watch the reckoning begin", effect: L("You watched the police lead away a neighbour who had joined Quisling's party. The trials (the landssvik cases) would run for years.", '⚖️', { stats: { stress: 4 } }) },
    ] },
  // ---- Denmark ----
  { id: 'dk.1943', icon: '⛵', title: 'October 1943', when: WH('ww2', ['DK'], 1943, 1943, 14),
    text: "Word has leaked: the Germans will round up Denmark's Jews on the night of Rosh Hashanah. People are hiding Jewish neighbours and taking them to the coast, to fishing boats for Sweden.",
    options: [
      { id: 'boat', label: "⛵ Get a family to the boats", effect: L("You hid a Jewish family and drove them to a fishing harbour at night. They reached Sweden.", '⛵', { stats: { stress: 12, happiness: 6 }, risk: [0.06, "You were stopped and questioned by the Gestapo.", { stress: 10 }] }) },
      { id: 'money', label: "💵 Give money for the crossings", effect: L("You gave money for the fishermen's fares.", '💵', { cost: 300, stats: { happiness: 3 } }) },
    ] },
  { id: 'dk.1989', icon: '🏳️‍🌈', title: 'Registered Partnership', when: W(['DK'], 1989, 1989, 18),
    text: "Denmark has become the first country in the world where two men or two women can register as partners. Eleven couples are at Copenhagen city hall today.",
    options: [
      { id: 'cheer', label: "🎉 Go and cheer", effect: L("You stood outside Copenhagen city hall throwing rice.", '🎉', { stats: { happiness: 4 } }) },
      { id: 'shrug', label: "🤷 Read about it", effect: L("You read about it in Politiken.", '🤷') },
    ] },
  // ---- Finland ----
  { id: 'fi.1918', icon: '⚔️', title: 'The Civil War', when: W(['FI'], 1918, 1918, 15),
    text: "Months after independence, Finland is at war with itself: the Reds hold the south and the cities, the Whites the north.",
    options: [
      { id: 'red', label: "🔴 Side with the Reds", effect: L("You were with the Reds. When they lost, the prison camps were worse than the fighting.", '🔴', { stats: { stress: 15, health: -8 } }) },
      { id: 'white', label: "⚪ Side with the Whites", effect: L("You were with the Whites, and won, and the country took a generation to heal.", '⚪', { stats: { stress: 10 } }) },
      { id: 'away', label: "🌲 Keep out of it", effect: L("You kept out of it, as far as anyone could.", '🌲', { stats: { stress: 6 } }) },
    ] },
  { id: 'fi.winter', icon: '❄️', title: 'The Winter War', when: W(['FI'], 1939, 1940, 16),
    text: "The Soviet Union has invaded. At forty below, ski troops in white are holding the line, and Karelia is being evacuated.",
    options: [
      { id: 'ski', label: "🎿 Serve (or work the home front)", effect: L("You held out through the Winter War, the coldest in memory. Karelia was lost, but Finland was not.", '🎿', { stats: { stress: 15 }, risk: [0.15, "You were wounded (or frostbitten) on the front.", { health: -18 }] }) },
      { id: 'evacuee', label: "🧳 Take in Karelian evacuees", effect: L("You took in a Karelian family, one of four hundred thousand who lost their homes.", '🧳', { stats: { happiness: 3, stress: 4 } }) },
    ] },
  { id: 'fi.lama', icon: '📉', title: 'The Depression of the Nineties', when: W(['FI'], 1991, 1993, 18, 60),
    text: "The Soviet trade has vanished, the banks have collapsed and the markka has been devalued. Unemployment is heading for twenty per cent.",
    options: [
      { id: 'retrain', label: "📚 Retrain", effect: L("You retrained, in computing, as the country did. Nokia was hiring by the end of the decade.", '📚', { stats: { smarts: 3, stress: 6 } }) },
      { id: 'hold', label: "🏠 Hold on", effect: L("You held on, and lost the house you'd bought at the top.", '🏠', { cost: 2000, stats: { stress: 10 } }) },
    ] },
  // ---- New Zealand ----
  { id: 'nz.1893', icon: '🗳️', title: 'Votes for Women', when: (s, y) => W(['NZ'], 1893, 1893, 21)(s, y) && female(s),
    text: "New Zealand women have won the vote, the first in any self-governing country. The election is in ten weeks.",
    options: [
      { id: 'vote', label: "🗳️ Enrol and vote", effect: L("You enrolled and voted, with more than four in five women in the country.", '🗳️', { stats: { happiness: 6 } }) },
    ] },
  { id: 'nz.anzac', icon: '🎖️', title: 'The Main Body Sails', when: (s, y) => WH('ww1', ['NZ'], 1914, 1916, 18, 40)(s, y) && male(s),
    text: "The Main Body of the New Zealand Expeditionary Force is mustering. Your mates from the farm are going.",
    options: [
      { id: 'enlist', label: "🎖️ Enlist", effect: L("You enlisted and fought at Gallipoli, and on Chunuk Bair.", '🎖️', { stats: { stress: 15 }, risk: [0.22, "You were badly wounded on Chunuk Bair.", { health: -25 }] }) },
      { id: 'farm', label: "🐑 Stay on the farm", effect: L("You stayed on the farm. Wool went to war too.", '🐑') },
    ] },
  { id: 'nz.nuclear', icon: '☮️', title: 'Nuclear-Free', when: W(['NZ'], 1985, 1985, 14),
    text: "New Zealand has banned nuclear ships, and the Americans are furious. Now French agents have bombed the Rainbow Warrior in Auckland harbour.",
    options: [
      { id: 'proud', label: "☮️ Stand behind it", effect: L("You put a nuclear-free sticker on the car and meant it.", '☮️', { stats: { happiness: 3 } }) },
      { id: 'worry', label: "🤔 Worry about the alliance", effect: L("You worried about ANZUS. It ended anyway.", '🤔') },
    ] },
  // ---- Singapore ----
  { id: 'sg.1942', icon: '🏳️', title: 'The Fall of Singapore', when: WH('ww2', ['SG'], 1942, 1942, 10),
    text: "The fortress has surrendered. The Japanese are screening Chinese men at checkpoints; some are taken to the beaches and never come back.",
    options: [
      { id: 'hide', label: "🏚️ Hide the men of the family", effect: L("You hid your father and brothers under the floorboards through the Sook Ching.", '🏚️', { stats: { stress: 15 } }) },
      { id: 'endure', label: "🍠 Endure the occupation", effect: L("You lived three and a half years on tapioca and banana money.", '🍠', { stats: { health: -8, happiness: -6 } }) },
    ] },
  { id: 'sg.hdb', icon: '🏢', title: 'Your Own Flat', when: W(['SG'], 1968, 1985, 21, 45),
    text: "The Housing Board's new estates are going up all over the island, and now you can buy your flat with your CPF savings.",
    options: [
      { id: 'buy', label: "🏢 Buy a flat", effect: L("You moved from the kampong into a new HDB flat with a lift, and owned it.", '🏢', { cost: 1500, stats: { happiness: 6 } }) },
      { id: 'kampong', label: "🏡 Stay in the kampong", effect: L("You stayed in the kampong until it was cleared.", '🏡') },
    ] },
  { id: 'sg.sars', icon: '🌡️', title: 'SARS', when: W(['SG'], 2003, 2003, 8),
    text: "A new pneumonia from China has reached the hospitals. Temperatures are taken at every door, and the schools are shut.",
    options: [
      { id: 'careful', label: "🌡️ Take your temperature twice a day", effect: L("You took your temperature twice a day and wore a mask, and it passed.", '🌡️', { stats: { stress: 4 } }) },
    ] },
  // ---- Lebanon ----
  { id: 'lb.1975', icon: '🧱', title: 'The Civil War', when: W(['LB'], 1975, 1976, 12),
    text: "A bus was ambushed in Ain el-Remmaneh, and the country has split. Beirut is divided by a Green Line; snipers own the crossings.",
    options: [
      { id: 'stay', label: "🏠 Stay in Beirut", effect: L("You stayed in Beirut, and learned which streets the snipers watched.", '🏠', { stats: { stress: 15 }, risk: [0.08, "You were hit by shrapnel in the shelling.", { health: -15 }] }) },
      { id: 'abroad', label: "✈️ Go abroad", effect: L("You left for Paris, as so many did.", '✈️', { emigrate: 'FR' }) },
      { id: 'mountain', label: "⛰️ Go up to the mountain village", effect: L("You went up to the family village in the mountains until it calmed down. It didn't, for fifteen years.", '⛰️', { stats: { stress: 8 } }) },
    ] },
  { id: 'lb.2006', icon: '💥', title: 'The July War', when: W(['LB'], 2006, 2006, 8),
    text: "Israel is bombing the south and the southern suburbs of Beirut; the airport is closed and the roads are cut.",
    options: [
      { id: 'host', label: "🏠 Take in families from the south", effect: L("You took in a family from the south for a month.", '🏠', { stats: { stress: 8, happiness: 3 } }) },
      { id: 'syria', label: "🚗 Drive to Damascus", effect: L("You drove over the mountains to Damascus until the ceasefire.", '🚗', { stats: { stress: 8 } }) },
    ] },
  { id: 'lb.port', icon: '💥', title: 'The Port Explosion', when: W(['LB'], 2020, 2020, 8),
    text: "A warehouse of ammonium nitrate in the port has exploded. Half of Beirut's windows are gone, and the savings in the banks were frozen a year ago.",
    options: [
      { id: 'sweep', label: "🧹 Sweep glass with the volunteers", effect: L("You swept glass in Gemmayzeh with thousands of young people. The state never came.", '🧹', { stats: { happiness: 2, stress: 10 } }) },
      { id: 'leave', label: "✈️ Leave", effect: L("You left. Everyone who could did.", '✈️', { emigrate: 'FR' }) },
    ] },
  // ---- Tunisia ----
  { id: 'tn.1956', icon: '🇹🇳', title: 'Independence', when: W(['TN'], 1956, 1956, 10),
    text: "Tunisia is independent, and Bourguiba is already changing everything: a code of personal status bans polygamy and gives women divorce.",
    options: [
      { id: 'celebrate', label: "🎉 Celebrate", effect: L("You celebrated in the streets of Tunis.", '🎉', { stats: { happiness: 5 } }) },
    ] },
  { id: 'tn.bread', icon: '🥖', title: 'The Bread Riots', when: W(['TN'], 1984, 1984, 14),
    text: "The government has doubled the price of bread overnight. The south rose first; now it's Tunis.",
    options: [
      { id: 'riot', label: "✊ Join the protests", effect: L("You were in the protests. Bourguiba went on television and put the price back.", '✊', { stats: { stress: 6 }, risk: [0.08, "You were caught when the army fired on the crowds.", { health: -14 }] }) },
      { id: 'home', label: "🏠 Stay home", effect: L("You stayed home and bought flour while you could.", '🏠') },
    ] },
  { id: 'tn.2014', icon: '📜', title: 'The New Constitution', when: W(['TN'], 2014, 2014, 18),
    text: "Three years after the revolution, a new constitution, agreed between Islamists and secularists, after a national dialogue.",
    options: [
      { id: 'proud', label: "📜 Celebrate", effect: L("You celebrated: the only Arab Spring that ended with a constitution.", '📜', { stats: { happiness: 4 } }) },
    ] },
  // ---- Dominican Republic ----
  { id: 'do.1965', icon: '🔫', title: 'The April Revolution', when: W(['DO'], 1965, 1965, 14),
    text: "The constitutionalists have risen to bring back the elected president, and handed out guns in Santo Domingo. American Marines are landing.",
    options: [
      { id: 'fight', label: "🔫 Take a gun", effect: L("You held a street in the old city with the constitutionalists until the truce.", '🔫', { stats: { stress: 12 }, risk: [0.12, "You were wounded.", { health: -18 }] }) },
      { id: 'home', label: "🏠 Stay home", effect: L("You stayed home while the Marines and the rebels faced off down the street.", '🏠', { stats: { stress: 8 } }) },
    ] },
  { id: 'do.york', icon: '🗽', title: 'Nueva York', when: W(['DO'], 1966, 2000, 18, 40),
    text: "Half your street has a cousin in Washington Heights. A visa, a job in a factory or a bodega, and you could send dollars home.",
    options: [
      { id: 'go', label: "🗽 Go to New York", effect: L("You went to New York and worked in a garment shop in the Heights.", '🗽', { emigrate: 'US' }) },
      { id: 'stay', label: "🏝️ Stay", effect: L("You stayed. The remittances came every month from your brother.", '🏝️') },
    ] },
  { id: 'do.georges', icon: '🌀', title: 'Hurricane Georges', when: W(['DO'], 1998, 1998, 8),
    text: "Georges has crossed the whole island. The rivers are over their banks and the cane fields are flattened.",
    options: [
      { id: 'rebuild', label: "🔨 Rebuild the roof", effect: L("You rebuilt the roof with the neighbours, one sheet at a time.", '🔨', { cost: 300, stats: { stress: 6 } }) },
    ] },
  // ---- Haiti ----
  { id: 'ht.1986', icon: '✈️', title: 'Baby Doc Flees', when: W(['HT'], 1986, 1986, 12),
    text: "Jean-Claude Duvalier has flown out to France in the night. The crowds are tearing down the statues and hunting the Tontons Macoutes.",
    options: [
      { id: 'dechoukaj', label: "🎉 Celebrate in the street", effect: L("You danced in Port-au-Prince. The Duvaliers were gone after twenty-nine years.", '🎉', { stats: { happiness: 7 } }) },
      { id: 'careful', label: "🤐 Wait and see", effect: L("You waited to see what came next. It was a long list of generals.", '🤐') },
    ] },
  { id: 'ht.boat', icon: '⛵', title: 'The Boats', when: W(['HT'], 1980, 1994, 16, 45),
    text: "A boat is leaving from the north coast for Florida, nine hundred kilometres away, overloaded. The US Coast Guard turns most of them back.",
    options: [
      { id: 'sail', label: "⛵ Get on the boat", effect: L("You reached Florida after five days at sea.", '⛵', { emigrate: 'US', stats: { stress: 15 }, risk: [0.2, "The Coast Guard stopped your boat and sent you back to Port-au-Prince.", { happiness: -10 }] }) },
      { id: 'stay', label: "🏠 Stay", effect: L("You stayed. Some of the boats never arrived anywhere.", '🏠') },
    ] },
  { id: 'ht.1990', icon: '🐓', title: 'The First Free Election', when: W(['HT'], 1990, 1990, 18),
    text: "A young priest from the slums, Jean-Bertrand Aristide, is running for president in the first free election.",
    options: [
      { id: 'vote', label: "🐓 Vote for Titid", effect: L("You voted Lavalas with two-thirds of the country. Within a year there was a coup.", '🐓', { stats: { happiness: 4 } }) },
      { id: 'other', label: "🗳️ Vote for someone else", effect: L("You voted for someone else, and he lost.", '🗳️') },
    ] },
  // ---- Guatemala ----
  { id: 'gt.1954', icon: '✈️', title: 'The Coup', when: W(['GT'], 1954, 1954, 14),
    text: "President Árbenz gave United Fruit's idle land to peasants. Now planes are dropping leaflets, an exile army has crossed the border, and the CIA radio says the capital will fall.",
    options: [
      { id: 'land', label: "🌽 Hold on to your plot", effect: L("You kept your plot of reform land, until the new government took it back.", '🌽', { stats: { happiness: -5 } }) },
      { id: 'quiet', label: "🤐 Keep quiet", effect: L("You kept quiet. The lists of the land-reform beneficiaries became lists of suspects.", '🤐', { stats: { stress: 6 } }) },
    ] },
  { id: 'gt.1982', icon: '🔥', title: 'The Highlands', when: W(['GT'], 1981, 1983, 10),
    text: "The army is burning Maya villages it says support the guerrillas. Whole communities are fleeing into the mountains or across the border to Mexico.",
    options: [
      { id: 'mexico', label: "🚶 Flee to Mexico", effect: L("You walked through the mountains to the refugee camps in Chiapas, and stayed for years.", '🚶', { emigrate: 'MX', stats: { stress: 15 } }) },
      { id: 'mountains', label: "⛰️ Hide in the mountains", effect: L("You lived in the mountains with a community in resistance, moving every few weeks.", '⛰️', { stats: { stress: 15, health: -10 } }) },
    ] },
  { id: 'gt.peace', icon: '🕊️', title: 'The Peace Accords', when: W(['GT'], 1996, 1996, 12),
    text: "After thirty-six years, the government and the guerrillas have signed a peace. A truth commission will say what happened.",
    options: [
      { id: 'testify', label: "🗣️ Give testimony", effect: L("You told the commission what you saw. It was written down, and it called it genocide.", '🗣️', { stats: { happiness: 3, stress: 4 } }) },
      { id: 'forget', label: "🌱 Try to move on", effect: L("You tried to move on.", '🌱') },
    ] },
  // ---- Cambodia ----
  { id: 'kh.1975', icon: '🚶', title: 'Year Zero', when: W(['KH'], 1975, 1975, 6),
    text: "The Khmer Rouge have taken Phnom Penh, and they're emptying the city: everyone out to the countryside, \"for three days\", they say.",
    options: [
      { id: 'peasant', label: "🌾 Pretend you've always been a peasant", effect: L("You threw away your glasses and said you were a taxi driver. You worked the dykes for nearly four years and survived.", '🌾', { stats: { health: -18, happiness: -15 }, risk: [0.2, "You were taken away for questioning, and badly beaten.", { health: -15 }] }) },
      { id: 'border', label: "🚶 Try for the Thai border", effect: L("You walked through the jungle and the minefields to Thailand, and on to a camp.", '🚶', { emigrate: 'TH', stats: { stress: 18 }, risk: [0.2, "You were wounded by a mine.", { health: -20 }] }) },
    ] },
  { id: 'kh.1979', icon: '🍚', title: 'After the Khmer Rouge', when: W(['KH'], 1979, 1979, 6),
    text: "Vietnam has driven out the Khmer Rouge. People are walking home across the country looking for whoever is left.",
    options: [
      { id: 'search', label: "🚶 Walk home and search", effect: L("You walked home and found one cousin. You heard about the others, one by one, for years.", '🚶', { stats: { happiness: -8, stress: 10 } }) },
      { id: 'camp', label: "⛺ Go to the border camps", effect: L("You went to the camps on the Thai border, where there was rice.", '⛺', { stats: { stress: 6 } }) },
    ] },
  { id: 'kh.1993', icon: '🗳️', title: 'The UN Election', when: W(['KH'], 1993, 1993, 18),
    text: "UN blue helmets are running an election. The Khmer Rouge have threatened to kill anyone who votes.",
    options: [
      { id: 'vote', label: "🗳️ Vote", effect: L("You voted, with nine in ten Cambodians, despite the threats.", '🗳️', { stats: { happiness: 5 } }) },
    ] },
);

/**
 * Follow-ups: years later, a choice comes back. Each needs the choice you made then (chose; 
 * names the episode and option),
 * enough years since, and you still alive to meet it, wherever you live now.
 */
export const FOLLOW_UPS = [
  { id: 'fu.ps.key', from: ['ps.1948', 'leave'], icon: '🗝️', title: 'The Key', when: F('ps.1948', 'leave', 25, 70, 30),
    text: "You still have the key to the house your family left in 1948. Your grandchildren ask you about it.",
    options: [
      { id: 'give', label: "🗝️ Give it to your eldest grandchild", effect: L("You gave the key to your eldest grandchild and told them which village, which street, which door.", '🗝️', { stats: { happiness: 3 } }) },
      { id: 'keep', label: "🧳 Keep it with you", effect: L("You kept the key on its string by your bed, as you always had.", '🧳') },
    ] },
  { id: 'fu.kr.reunion', from: ['kr.refugee', 'south'], icon: '🤝', title: 'The Reunion Lottery', when: (s, y) => chose(s, 'kr.refugee', 'south') && y >= 1985 && y <= 2018 && age(s) >= 40 && cc(s) === 'KR',
    text: "The two Koreas are holding family reunions. A hundred families on each side, picked by lottery from the tens of thousands who apply. Your family from the North is still out there, if they're alive.",
    options: [
      { id: 'apply', label: "📝 Put your name in", effect: L("You put your name in the lottery, and waited for the phone call.", '📝', { stats: { stress: 4 }, risk: [0.25, "Your name was drawn. At Mount Kumgang you held your sister's hands for two hours, after sixty years, and then she got back on the bus.", { happiness: 12 }] }) },
      { id: 'not', label: "😔 Let it go", effect: L("You couldn't face it. You'd buried them in your mind long ago.", '😔', { stats: { happiness: -2 } }) },
    ] },
  { id: 'fu.windrush', from: ['cb.windrush', 'go'], icon: '✉️', title: 'A Letter from the Home Office', when: (s, y) => chose(s, 'cb.windrush', 'go') && y >= 2013 && y <= 2018 && cc(s) === 'GB',
    text: "A letter from the Home Office says you have no right to be in Britain, and asks you to prove you've lived here since before 1973. You came as a child on your parents' passports, and the landing cards were destroyed.",
    options: [
      { id: 'fight', label: "📂 Gather fifty years of proof", effect: L("You gathered school reports, payslips and tax letters, year by year. In 2018 the scandal broke, the Home Secretary resigned, and you got your papers and an apology.", '📂', { stats: { stress: 15 } }) },
      { id: 'mp', label: "🗣️ Go to your MP and the papers", effect: L("You went to your MP and a reporter. Your story was in the paper the week the government apologised.", '🗣️', { stats: { stress: 10, happiness: 3 } }) },
    ] },
  { id: 'fu.cu.visit', from: ['cu.revolution', 'miami'], icon: '🛬', title: 'Back to Havana', when: (s, y) => chose(s, 'cu.revolution', 'miami') && y >= 2016 && y <= 2019 && age(s) >= 50,
    text: "There are direct flights from Miami to Havana now. You left with one suitcase, sure you'd be back in a year.",
    options: [
      { id: 'go', label: "🛬 Go back and see", effect: L("You walked down your old street in Vedado. The house was still there, divided into four flats, painted another colour.", '🛬', { cost: 900, stats: { happiness: 6 } }) },
      { id: 'never', label: "🚫 Not while they're in power", effect: L("You said you wouldn't go back while they were in power, and you didn't.", '🚫') },
    ] },
  { id: 'fu.vn.return', from: ['vn.boat', 'boat'], icon: '🛬', title: 'Việt Kiều', when: (s, y) => chose(s, 'vn.boat', 'boat') && y >= 1995 && since(s, 'vn.boat', y) >= 12,
    text: "Relations are normal now, and Vietnamese abroad are going home for Tết, with suitcases of presents.",
    options: [
      { id: 'go', label: "🧳 Go home for Tết", effect: L("You went home for Tết. Your mother had kept your room exactly as it was.", '🧳', { cost: 1500, stats: { happiness: 8 } }) },
      { id: 'send', label: "💵 Send money instead", effect: L("You sent money, as you always had.", '💵', { cost: 500 }) },
    ] },
  { id: 'fu.it.brother', from: ['it.emigrate', 'stay'], icon: '✉️', title: 'A Letter from America', when: (s, y) => chose(s, 'it.emigrate', 'stay') && since(s, 'it.emigrate', y) >= 8 && since(s, 'it.emigrate', y) <= 25,
    text: "A letter from your brother in Brooklyn, with a money order inside and a ticket from Naples, paid. \"There's work here,\" he writes. \"Come.\"",
    options: [
      { id: 'go', label: "🚢 Go to him", effect: L("You went to your brother in Brooklyn, after all those years.", '🚢', { emigrate: 'US', stats: { happiness: 4 } }) },
      { id: 'stay', label: "🍇 Send the ticket back", effect: L("You sent the ticket back, and kept the money for the roof.", '🍇', { earn: 300 }) },
    ] },
  { id: 'fu.mx.fund', from: ['mx.bracero', 'go'], icon: '💵', title: "The Braceros' Ten Per Cent", when: (s, y) => chose(s, 'mx.bracero', 'go') && y >= 2005 && y <= 2012 && age(s) >= 60,
    text: "Ten per cent of every bracero's wages was held back for a savings fund, and never paid out. After years of protests, the government is paying the old men something, at last.",
    options: [
      { id: 'claim', label: "📝 Claim it", effect: L("You queued with your old contract and got your 38,000 pesos, sixty years late.", '📝', { earn: 2500, stats: { happiness: 4 } }) },
    ] },
  { id: 'fu.de.file', from: ['eb.wall'], icon: '📂', title: 'Your Stasi File', when: (s, y) => chose(s, 'eb.wall') && cc(s) === 'DE' && y >= 1992 && y <= 2015 && age(s) >= 30,
    text: "The Stasi files are open. You can ask to read yours, and learn who informed on you.",
    options: [
      { id: 'read', label: "📂 Read it", effect: L("You read your file. Four hundred pages, and one of the informers was your best friend from school.", '📂', { stats: { happiness: -6, stress: 8 } }) },
      { id: 'leave', label: "🚪 Leave it closed", effect: L("You left it closed. Some things it's better not to know.", '🚪') },
    ] },
  { id: 'fu.tr.retire', from: ['tr.gastarbeiter', 'go'], icon: '🏡', title: 'Going Home?', when: (s, y) => chose(s, 'tr.gastarbeiter', 'go') && since(s, 'tr.gastarbeiter', y) >= 25 && cc(s) === 'DE',
    text: "You came for two years and stayed a working life. Now you're retiring: go back to the house you built in your village in Anatolia, or stay near the grandchildren in Germany?",
    options: [
      { id: 'home', label: "🇹🇷 Go home to Turkey", effect: L("You went home to the house you'd built over thirty summers. The village thought you were German now.", '🇹🇷', { emigrate: 'TR', stats: { happiness: 3 } }) },
      { id: 'stay', label: "👨‍👩‍👧 Stay with the grandchildren", effect: L("You stayed with the grandchildren, and spent summers in the village.", '👨‍👩‍👧', { stats: { happiness: 4 } }) },
    ] },
  { id: 'fu.ar.grandchild', from: ['ar.disappeared', 'mothers'], icon: '🧬', title: 'The Grandmothers', when: (s, y) => chose(s, 'ar.disappeared', 'mothers') && y >= 2000 && age(s) >= 45,
    text: "The Grandmothers of the Plaza de Mayo have a DNA bank now. Children stolen from the disappeared and raised by others are coming forward, one by one.",
    options: [
      { id: 'help', label: "🧬 Give blood to the bank", effect: L("You gave your blood to the genetic bank for the student who was taken from your street. Two years later, his son was found.", '🧬', { stats: { happiness: 6 } }) },
      { id: 'march', label: "🤍 Keep marching on Thursdays", effect: L("You kept marching on Thursdays, older now, the headscarf the same.", '🤍', { stats: { happiness: 2 } }) },
    ] },
  { id: 'fu.ph.kids', from: ['ph.ofw', 'go'], icon: '📦', title: 'The Children Grew Up', when: (s, y) => chose(s, 'ph.ofw', 'go') && since(s, 'ph.ofw', y) >= 15 && age(s) >= 40,
    text: "You sent home a balikbayan box every Christmas, and the children grew up in photographs. Your eldest is graduating, and asks if you'll be there.",
    options: [
      { id: 'go', label: "🎓 Fly home for it", effect: L("You flew home for the graduation and cried through all of it.", '🎓', { cost: 800, stats: { happiness: 8 } }) },
      { id: 'video', label: "📹 Watch by video call", effect: L("You watched on a video call from the other side of the world.", '📹', { stats: { happiness: -2 } }) },
    ] },
  { id: 'fu.pk.border', from: ['pk.partition', 'shelter'], icon: '✉️', title: 'Across the Border', when: (s, y) => chose(s, 'pk.partition', 'shelter') && since(s, 'pk.partition', y) >= 40 && age(s) >= 50,
    text: "A letter from India, from the grandson of the family you hid in 1947. His grandfather never forgot you, he writes, and spoke of you until the end.",
    options: [
      { id: 'reply', label: "✉️ Write back", effect: L("You wrote back, and the letters went back and forth for years, across a border neither family could easily cross.", '✉️', { stats: { happiness: 8 } }) },
      { id: 'visit', label: "🚌 Take the bus to Amritsar", effect: L("You took the bus over the Wagah border and sat in their courtyard, an old man among strangers who knew your name.", '🚌', { cost: 300, stats: { happiness: 10 } }) },
    ] },
  { id: 'fu.kh.tribunal', from: ['kh.1975'], icon: '⚖️', title: 'The Tribunal', when: (s, y) => chose(s, 'kh.1975') && y >= 2009 && y <= 2018 && age(s) >= 40,
    text: "The Khmer Rouge leaders are on trial at last, before judges from Cambodia and the world. The court is asking survivors to come forward.",
    options: [
      { id: 'testify', label: "🗣️ Testify", effect: L("You testified about the dykes and the hunger and the people taken away. It was the first time you had said it aloud.", '🗣️', { stats: { stress: 8, happiness: 4 } }) },
      { id: 'watch', label: "📺 Watch from home", effect: L("You watched the verdicts on television with your children, and told them a little.", '📺') },
    ] },
  { id: 'fu.dk.righteous', from: ['dk.1943', 'boat'], icon: '🌳', title: 'Remembered', when: (s, y) => chose(s, 'dk.1943', 'boat') && since(s, 'dk.1943', y) >= 20 && age(s) >= 40,
    text: "A letter from Israel: the family you drove to the fishing boats in 1943 has never forgotten. Their children would like to meet you.",
    options: [
      { id: 'meet', label: "🤝 Meet them", effect: L("You met them in Copenhagen: the little girl you'd carried to the boat was a grandmother now.", '🤝', { stats: { happiness: 10 } }) },
    ] },
  { id: 'fu.kp.summit', from: ['kp.river', 'cross'], icon: '📺', title: 'The Summit', when: (s, y) => chose(s, 'kp.river', 'cross') && y >= 2018 && y <= 2019 && cc(s) === 'KR',
    text: "On television, the leader of the country you escaped is shaking hands with the South's president at Panmunjom. Your mother is still in Hamgyong.",
    options: [
      { id: 'hope', label: "🙏 Hope", effect: L("You let yourself hope, for a few months.", '🙏', { stats: { happiness: 2 } }) },
      { id: 'broker', label: "💵 Pay a broker to get a message to your mother", effect: L("You paid a broker to get a phone and a message to your mother. You heard her voice for three minutes.", '💵', { cost: 1500, stats: { happiness: 6 } }) },
    ] },
];
