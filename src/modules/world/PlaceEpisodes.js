/**
 * Moments for places that were once states of their own, or are territories still: Newfoundland,
 * Hawaii, Texas, Tibet, Hyderabad, Réunion and Guam. Same shape as RegionalEpisodes (merged into
 * LivingHistory.ALL_EPISODES); effects: { log, icon, stats, cost, earn, risk, emigrate }.
 */
import { REGIONS } from '../life/Regions.js';

const cc = (s) => s.character.countryId ?? 'US';
const age = (s) => s.character.age;
const here = (s) => s.character.regionId;
/** A US state (Hawaii, Texas), by the region's state code. */
const usState = (code) => (s) => cc(s) === 'US' && REGIONS[here(s)]?.state === code;
const city = (...ids) => (s) => ids.includes(here(s));
const country = (code) => (s) => cc(s) === code;
/** In this place, between these years, at least this old. */
const At = (where, from, to, min = 16, max = 99) => (s, y) => where(s) && y >= from && y <= to && age(s) >= min && age(s) <= max;
const L = (log, icon, more = {}) => ({ log, icon, ...more });

const NEWFOUNDLAND = city('ca_stjohns');
const HAWAII = usState('HI');
const TEXAS = usState('TX');
const LHASA = city('lhasa');
const HYDERABAD = city('hyderabad');
const REUNION = country('RE');
const GUAM = country('GU');

export const PLACE_EPISODES = [
  // ---- Newfoundland ----
  { id: 'nl.commission', icon: '🏛️', title: 'The Dominion Gives Up', when: At(NEWFOUNDLAND, 1933, 1934, 18),
    text: 'Newfoundland cannot pay its debts. The fish prices have collapsed, the dole is six cents a day, and the legislature has voted to suspend itself: a Commission of Government appointed from London will rule instead.',
    options: [
      { id: 'protest', label: '✊ March on the Colonial Building', effect: L('You were in the crowd at the Colonial Building. It changed nothing, and you would do it again.', '✊', { stats: { stress: 5 }, risk: [0.15, 'A constable\'s baton caught you in the crush.', { health: -6 }] }) },
      { id: 'dole', label: '🍞 Get by on the dole', effect: L('Six cents a day, molasses and flour. You got by, and so did the neighbours, just.', '🍞', { stats: { happiness: -6, health: -2 } }) },
      { id: 'boston', label: '🚢 Go to Boston, like everyone', effect: L('You went up to "the Boston States", as half the outports had before you.', '🚢', { emigrate: 'US' }) },
    ] },
  { id: 'nl.confederation', icon: '🗳️', title: 'Confederation?', when: At(NEWFOUNDLAND, 1948, 1948, 21),
    text: 'A referendum on what Newfoundland should be: Joey Smallwood says join Canada and get the baby bonus; the Responsible Government League says Newfoundland is a country and should stay one; some want economic union with the United States.',
    options: [
      { id: 'canada', label: '🍁 Confederation with Canada', effect: L('You voted for Confederation. It won by 52 per cent in the second round, and Smallwood called himself the last Father of Confederation.', '🍁') },
      { id: 'country', label: '🏳️ Responsible government: our own country', effect: L('You voted for the old Dominion. You lost, narrowly, and some houses flew black flags on the first of April 1949.', '🏳️', { stats: { happiness: -4 } }) },
      { id: 'us', label: '🇺🇸 Economic union with the States', effect: L('You voted for union with America. It wasn\'t even on the second ballot.', '🇺🇸') },
    ] },
  { id: 'nl.cod', icon: '🐟', title: 'The Cod Moratorium', when: At(NEWFOUNDLAND, 1992, 1992, 18, 64),
    text: 'The northern cod are gone. Ottawa has closed the fishery, the biggest lay-off in Canadian history: thirty thousand people, and five hundred years of a way of life.',
    options: [
      { id: 'alberta', label: '🛢️ Go out to Alberta, to the oil', effect: L('You went out west to Fort McMurray, home for two weeks in every six. Half the plane was from the Rock.', '🛢️', { earn: 30000, stats: { stress: 6 } }) },
      { id: 'retrain', label: '📚 Take the retraining package', effect: L('You took the package and retrained. Nobody knew what for.', '📚', { earn: 8000 }) },
      { id: 'stay', label: '🏠 Stay in the outport', effect: L('You stayed. The wharf rotted, the school closed, the young ones left. You stayed.', '🏠', { stats: { happiness: -6 } }) },
    ] },
  // ---- Hawaii ----
  { id: 'hi.overthrow', icon: '👑', title: 'The Queen Is Overthrown', when: At(HAWAII, 1893, 1893, 16),
    text: 'A Committee of Safety of sugar planters and businessmen, with US Marines landed from the Boston, has deposed Queen Liliʻuokalani. She has yielded "to the superior force of the United States", under protest, to avoid bloodshed.',
    options: [
      { id: 'queen', label: '👑 Stand with the Queen', effect: L('You joined the Hui Aloha ʻĀina, the patriotic league, and wore the Queen\'s colours.', '👑', { stats: { stress: 4 } }) },
      { id: 'planters', label: '🎩 Side with the Provisional Government', effect: L('You took the oath to the new government. It was good for business.', '🎩', { earn: 1500 }) },
      { id: 'quiet', label: '🌺 Keep your head down', effect: L('You kept out of it. The Queen\'s portrait stayed on the wall, inside.', '🌺') },
    ] },
  { id: 'hi.kue', icon: '📜', title: 'The Kūʻē Petitions', when: At(HAWAII, 1897, 1897, 16),
    text: 'Washington is debating a treaty to annex Hawaii. The patriotic leagues are going door to door with a petition against it, Kūʻē, "to oppose", for the Senate.',
    options: [
      { id: 'sign', label: '✍️ Sign it', effect: L('You signed, one of more than twenty thousand Hawaiians: over half of them. The treaty failed in the Senate.', '✍️', { stats: { happiness: 4 } }) },
      { id: 'carry', label: '🚪 Carry it door to door', effect: L('You walked the petition through the valleys for weeks. The treaty failed; a joint resolution annexed Hawaii the next year anyway.', '🚪', { stats: { happiness: 3, stress: 3 } }) },
      { id: 'no', label: '🙅 Don\'t sign', effect: L('You didn\'t sign. Annexation came in 1898.', '🙅') },
    ] },
  { id: 'hi.pearl', icon: '✈️', title: 'Pearl Harbor', when: At(HAWAII, 1941, 1941, 12),
    text: 'A Sunday morning, a few minutes before eight: aircraft with red circles on their wings are coming in low over the harbour, and the battleships are burning.',
    options: [
      { id: 'help', label: '🩸 Go to help', effect: L('You drove to the harbour and carried wounded sailors to the hospital until night. Martial law was declared by evening.', '🩸', { stats: { stress: 12 } }) },
      { id: 'shelter', label: '🏠 Take cover', effect: L('You took cover with the family as the smoke rose over the harbour. Hawaii was under martial law until 1944.', '🏠', { stats: { stress: 10 } }) },
    ] },
  { id: 'hi.statehood', icon: '⭐', title: 'Statehood', when: At(HAWAII, 1959, 1959, 21),
    text: 'Congress has passed the Admission Act. Now Hawaii votes: should it become the fiftieth state? (Independence is not on the ballot.)',
    options: [
      { id: 'yes', label: '⭐ Yes to statehood', effect: L('You voted yes, with ninety-four per cent of the islands. The fiftieth star went on the flag.', '⭐', { stats: { happiness: 4 } }) },
      { id: 'no', label: '✖️ Vote no', effect: L('You voted no, one of the few. Some said later that the choice should have included independence.', '✖️') },
    ] },
  // ---- Texas ----
  { id: 'tx.revolution', icon: '⭐', title: 'Come and Take It', when: At(TEXAS, 1835, 1836, 16),
    text: 'Santa Anna has torn up the constitution of 1824. The settlers at Gonzales would not give up their cannon; now there is a Texian army, and the Mexican army is marching north.',
    options: [
      { id: 'fight', label: '🔫 Join Houston\'s army', effect: L('You marched with Sam Houston, and charged at San Jacinto crying "Remember the Alamo!" Eighteen minutes, and Texas was free.', '🔫', { stats: { stress: 10 }, risk: [0.15, 'You took a musket ball at San Jacinto.', { health: -20 }] }) },
      { id: 'flee', label: '🐎 Join the Runaway Scrape', effect: L('You fled east with the family ahead of Santa Anna\'s army, through the spring floods.', '🐎', { stats: { stress: 8, health: -3 } }) },
      { id: 'mexico', label: '🇲🇽 Stay loyal to Mexico', effect: L('You stayed loyal to Mexico. After San Jacinto, that was hard to live down.', '🇲🇽', { stats: { happiness: -4 } }) },
    ] },
  { id: 'tx.annexation', icon: '🗳️', title: 'Annexation', when: At(TEXAS, 1845, 1845, 21),
    text: 'The Republic of Texas has been its own country for nine years, broke and raided. The United States has offered to take it in as a state, slavery and all. The convention has put it to the voters.',
    options: [
      { id: 'yes', label: '🇺🇸 Join the Union', effect: L('You voted for annexation, with almost everyone. Texas became the twenty-eighth state, and Mexico went to war over it.', '🇺🇸') },
      { id: 'no', label: '⭐ Keep the Lone Star Republic', effect: L('You voted to stay a republic, and lost by four thousand to a few hundred.', '⭐') },
    ] },
  { id: 'tx.secession', icon: '📜', title: 'Secession', when: At(TEXAS, 1861, 1861, 21),
    text: 'Lincoln is elected. The secession convention has voted Texas out of the Union; now the people vote on it. Governor Sam Houston, the old hero of San Jacinto, is against it.',
    options: [
      { id: 'yes', label: '🏴 Vote to secede', effect: L('You voted to secede, with three in four. Texas joined the Confederacy.', '🏴') },
      { id: 'houston', label: '🇺🇸 Stand with Sam Houston', effect: L('You voted to stay in the Union. Houston was thrown out of office for refusing the Confederate oath.', '🇺🇸', { stats: { stress: 6 } }) },
    ] },
  { id: 'tx.spindletop', icon: '🛢️', title: 'Spindletop', when: At(TEXAS, 1901, 1902, 16, 50),
    text: 'A gusher at Spindletop, near Beaumont: oil shooting a hundred and fifty feet in the air, a hundred thousand barrels a day. Everyone is going.',
    options: [
      { id: 'go', label: '🛢️ Go to the oil field', effect: L('You went to Spindletop and worked the rigs in the mud and the stink. The pay was better than cotton.', '🛢️', { earn: 900, risk: [0.08, 'A blowout on the rig nearly killed you.', { health: -15 }] }) },
      { id: 'lease', label: '📜 Buy a lease', effect: L('You bought a quarter-acre lease off a man in a hotel lobby.', '📜', { cost: 300, risk: [0.7, 'It was a dry hole, like most of them.', { happiness: -3 }] }) },
      { id: 'stay', label: '🌾 Stay with the cotton', effect: L('You stayed on the farm. Texas would never be the same.', '🌾') },
    ] },
  // ---- Tibet ----
  { id: 'ti.pla', icon: '🏔️', title: 'The People\'s Liberation Army', when: At(LHASA, 1950, 1951, 16),
    text: 'Chinese troops have crossed the Drichu and routed the Tibetan army at Chamdo. In Beijing, the Dalai Lama\'s delegates have signed a Seventeen Point Agreement; the soldiers are marching into Lhasa.',
    options: [
      { id: 'work', label: '🧱 Work on the new roads', effect: L('You worked on the road from China for silver dayuan. The prices in Lhasa doubled with all the soldiers.', '🧱', { earn: 400 }) },
      { id: 'monastery', label: '🙏 Go to the monastery', effect: L('You spent the year at Drepung, praying for the Dalai Lama.', '🙏', { stats: { happiness: 2 } }) },
      { id: 'wait', label: '⏳ Wait and see', effect: L('You waited. For a while, the new rulers promised, nothing would change.', '⏳') },
    ] },
  { id: 'ti.uprising', icon: '🔥', title: 'The Uprising', when: At(LHASA, 1959, 1959, 15),
    text: 'Thousands have surrounded the Norbulingka to stop the Dalai Lama from going to a Chinese theatre show without his bodyguards. He has slipped out in disguise, south towards India; the artillery has opened fire on the palace.',
    options: [
      { id: 'exile', label: '🥾 Follow him over the passes', effect: L('You walked over the Himalaya to India with eighty thousand others, and lived in a camp at Missamari, then Dharamsala.', '🥾', { emigrate: 'IN', stats: { health: -6, happiness: -8 } }) },
      { id: 'fight', label: '⚔️ Fight at the Norbulingka', effect: L('You fought at the Norbulingka with old rifles against the guns.', '⚔️', { stats: { stress: 15 }, risk: [0.35, 'You were taken prisoner, and spent years in a labour camp.', { health: -25, happiness: -20 }] }) },
      { id: 'stay', label: '🏠 Stay and keep quiet', effect: L('You stayed in Lhasa. The struggle sessions began.', '🏠', { stats: { stress: 10 } }) },
    ] },
  { id: 'ti.cultrev', icon: '📕', title: 'Red Guards at the Jokhang', when: At(LHASA, 1966, 1968, 12),
    text: 'Red Guards are smashing the statues in the Jokhang temple, the holiest in Tibet. "Destroy the Four Olds."',
    options: [
      { id: 'hide', label: '🕯️ Hide a statue', effect: L('You hid a small Buddha in the wall of your house, where it stayed for twenty years.', '🕯️', { risk: [0.2, 'A neighbour denounced you; you were paraded in a dunce cap.', { happiness: -12, stress: 10 }] }) },
      { id: 'along', label: '📕 Wave the Little Red Book', effect: L('You chanted the slogans with the rest. Everyone did.', '📕', { stats: { happiness: -6 } }) },
    ] },
  { id: 'ti.2008', icon: '🔥', title: 'Lhasa, March 2008', when: At(LHASA, 2008, 2008, 15),
    text: 'Monks marched on the anniversary of the uprising; now there are riots on the Barkhor, shops burning, and armoured cars in the streets. The internet has been cut.',
    options: [
      { id: 'home', label: '🏠 Stay indoors', effect: L('You stayed indoors for a week. The checkpoints never really came down.', '🏠', { stats: { stress: 8 } }) },
      { id: 'march', label: '🏳️ Join the protest', effect: L('You joined the crowd on the Barkhor.', '🏳️', { stats: { stress: 12 }, risk: [0.45, 'You were picked out from the surveillance footage and sentenced.', { happiness: -20, stress: 15 }] }) },
    ] },
  // ---- Hyderabad ----
  { id: 'hy.musi', icon: '🌊', title: 'The Musi Flood', when: At(HYDERABAD, 1908, 1908, 10),
    text: 'The Musi has burst its banks in the night: a wall of water through the city, whole mohallas gone. The Nizam has opened his palaces to the homeless.',
    options: [
      { id: 'tamarind', label: '🌳 Climb the old tamarind tree', effect: L('You spent the night in the tamarind tree at the Osmania hospital with a hundred and fifty others. You lived.', '🌳', { stats: { stress: 10 } }) },
      { id: 'help', label: '🛶 Help pull people out', effect: L('You pulled people from the water until dawn.', '🛶', { stats: { happiness: 3, health: -4 } }) },
    ] },
  { id: 'hy.polo', icon: '🪖', title: 'The Police Action', when: At(HYDERABAD, 1948, 1948, 16),
    text: 'The Nizam will not join India. The Razakars, his militia, are terrorising the villages; now the Indian Army has crossed the border in "Operation Polo". The Nizam\'s army is not expected to last the week.',
    options: [
      { id: 'india', label: '🇮🇳 Welcome the Indian Army', effect: L('You welcomed the Indian troops. Hyderabad acceded to India within five days.', '🇮🇳') },
      { id: 'nizam', label: '👑 Stay loyal to the Nizam', effect: L('You stayed loyal to the Nizam. He became the state\'s Rajpramukh, and kept his jewels.', '👑') },
      { id: 'hide', label: '🏠 Shelter your neighbours', effect: L('In the reprisals that followed, you sheltered the family next door until it was over.', '🏠', { stats: { stress: 12, happiness: 3 } }) },
    ] },
  { id: 'hy.telangana', icon: '✊', title: 'A State for Telangana', when: At(HYDERABAD, 2009, 2013, 18),
    text: 'KCR is on hunger strike for a separate state of Telangana, with Hyderabad as its capital. The students at Osmania University have shut the city.',
    options: [
      { id: 'join', label: '✊ Join the agitation', effect: L('You marched for Telangana. In 2014 it became India\'s twenty-ninth state.', '✊', { stats: { stress: 5, happiness: 4 } }) },
      { id: 'united', label: '🤝 Keep Andhra united', effect: L('You were for a united Andhra Pradesh. You lost.', '🤝') },
      { id: 'work', label: '💻 Keep your head down at work', effect: L('You kept going to work in HITEC City between the bandhs.', '💻') },
    ] },
  // ---- Réunion ----
  { id: 're.departement', icon: '🇫🇷', title: 'A Department of France', when: At(REUNION, 1946, 1946, 18),
    text: 'The colony is no more: Réunion is a département of France, like the Creuse or the Gironde. The deputies, Raymond Vergès and Léon de Lépervanche, have won it in Paris.',
    options: [
      { id: 'celebrate', label: '🎉 Celebrate', effect: L('You danced to the maloya in Saint-Denis. French social laws were slow to follow.', '🎉', { stats: { happiness: 4 } }) },
      { id: 'doubt', label: '🤔 Wait for the pay to match', effect: L('You waited for the wages and allowances of France. You waited a long time.', '🤔') },
    ] },
  { id: 're.bumidom', icon: '✈️', title: 'The BUMIDOM', when: At(REUNION, 1963, 1981, 18, 30),
    text: 'The government\'s migration bureau, the BUMIDOM, is recruiting young Réunionnais for jobs in France: the Post Office, the hospitals, the factories. (Its sister scheme is taking children from Réunion\'s orphanages to repopulate the Creuse.)',
    options: [
      { id: 'go', label: '✈️ Go to France', effect: L('You flew to Paris with a BUMIDOM contract, and found a job at the PTT. It was colder than anyone had said.', '✈️', { emigrate: 'FR' }) },
      { id: 'stay', label: '🌋 Stay on the island', effect: L('You stayed on the island, under the volcano.', '🌋') },
    ] },
  { id: 're.chik', icon: '🦟', title: 'Chikungunya', when: At(REUNION, 2005, 2006, 5),
    text: 'A mosquito fever is sweeping the island: crippling joint pain, "the disease that bends you". A third of Réunion will catch it.',
    options: [
      { id: 'clear', label: '🧹 Clear the standing water', effect: L('You emptied every flowerpot and gutter on the street. You caught it anyway.', '🧹', { stats: { health: -8 } }) },
      { id: 'repellent', label: '🧴 Live in repellent', effect: L('You lived in long sleeves and repellent, and got lucky.', '🧴') },
    ] },
  // ---- Guam ----
  { id: 'gu.occupation', icon: '🎌', title: 'Ōmiya-jima', when: At(GUAM, 1941, 1943, 12),
    text: 'Two days after Pearl Harbor the Japanese took Guam, and renamed it Ōmiya-jima, "Great Shrine Island". One American radioman, George Tweed, is still hiding in the jungle, and the islanders are feeding him.',
    options: [
      { id: 'tweed', label: '🍚 Take food to Tweed', effect: L('You took food to Tweed\'s hiding place in the cliffs for months. Others were beheaded for less.', '🍚', { risk: [0.15, 'The kempeitai beat you for days to make you talk. You didn\'t.', { health: -20, stress: 15 }] }) },
      { id: 'endure', label: '🌾 Work the rice fields', effect: L('You were put to work in the rice fields and on the airfields. You learned the Japanese songs at school.', '🌾', { stats: { happiness: -8 } }) },
    ] },
  { id: 'gu.organic', icon: '🗽', title: 'American Citizens', when: At(GUAM, 1950, 1950, 18),
    text: 'After the Guam Congress walked out on the naval governor, Washington has passed the Organic Act: civilian government, and US citizenship for the Chamorros. Not a vote for the President, though.',
    options: [
      { id: 'celebrate', label: '🎉 Celebrate', effect: L('You became an American citizen with the stroke of a pen in Washington.', '🎉', { stats: { happiness: 4 } }) },
      { id: 'land', label: '🏝️ Ask about the land', effect: L('You asked when the military would give back the land it took for the bases. Some of it, decades later.', '🏝️') },
    ] },
  { id: 'gu.pongsona', icon: '🌀', title: 'Supertyphoon Pongsona', when: At(GUAM, 2002, 2002, 10),
    text: 'Pongsona is coming in at 150 miles an hour. The concrete houses will stand; the tin roofs won\'t.',
    options: [
      { id: 'shelter', label: '🏫 Shelter at the school', effect: L('You rode it out in a school shelter. The fuel tanks at the port burned for days.', '🏫', { stats: { stress: 8 } }) },
      { id: 'home', label: '🏠 Board up and stay home', effect: L('You boarded up and stayed home.', '🏠', { risk: [0.3, 'The roof went in the night.', { stress: 12 }, 4000] }) },
    ] },
];
