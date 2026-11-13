/**
 * Living through history outside Britain and America: the moments of each country's own
 * story, as personal choices. Each waits for the event to have happened in this world
 * (state.era.events — the timeline can run differently) and for the right year, place and age.
 *
 *   Russia     the Emancipation (1861), the Revolution (1917–18), the famine on the farms
 *              (1932–33), the siege of Leningrad, the vouchers of 1992.
 *   France     the Commune (1871), forced labour in Germany (1943), the Liberation (1944),
 *              May 1968.
 *   Germany    the hunger winter and the rubble women (1945–47), the Wall (1961).
 *   Japan      the end of the samurai (1871–77), the black markets of 1946.
 *   China      the Great Leap famine (1959–61), the Cultural Revolution and the countryside
 *              (1966–76), Tiananmen (1989).
 *   India      Quit India (1942), Partition (1947), the Emergency (1975–77).
 *   Ireland    the Easter Rising (1916).
 *   Spain      choosing a side in 1936.
 *   Brazil     the Golden Law (1888).
 *
 * Same shape as LivingHistory.EPISODES; effects: { log, icon, stats, cost, earn, risk, emigrate }.
 */
const cc = (s) => s.character.countryId ?? 'US';
const age = (s) => s.character.age;
const male = (s) => s.character.gender === 'male';
const hap = (s, id) => Boolean(s.era?.events?.[id]);
const at = (s, id) => s.era?.events?.[id]?.year ?? null;
const inServices = (s) => Boolean(s.military?.service);

export const WORLD_EPISODES = [
  // ---------------- Russia and the Soviet Union ----------------
  { id: 'emancipation', icon: '⛓️', title: 'The Emancipation', when: (s, y) => cc(s) === 'RU' && hap(s, 'serfdomEnds') && y >= at(s, 'serfdomEnds') && y <= at(s, 'serfdomEnds') + 2 && age(s) >= 16,
    text: 'The Tsar has freed the serfs. The land comes with redemption payments for forty-nine years, and the commune still decides who farms what.',
    options: [
      { id: 'commune', label: '🌾 Stay on the commune', effect: { log: 'You stayed on the land, free in name, paying for it every year.', icon: '🌾', stats: { happiness: 3 } } },
      { id: 'city', label: '🏭 Go to the city factories', effect: { log: 'You took a passport from the commune and went to the factories in the city.', icon: '🏭', earn: 300, stats: { health: -3, happiness: 2 } } },
    ] },
  { id: 'redOrWhite', icon: '⭐', title: 'Red or White', when: (s, y) => cc(s) === 'RU' && hap(s, 'russianRevolution') && y >= at(s, 'russianRevolution') && y <= at(s, 'russianRevolution') + 2 && age(s) >= 17,
    text: 'The Bolsheviks hold the cities; the Whites gather in the south. Neighbours are choosing sides.',
    options: [
      { id: 'red', label: '⭐ Side with the Reds', effect: { log: 'You joined the Bolsheviks. The future, they said, belonged to you.', icon: '⭐', stats: { stress: 6 }, risk: [0.08, 'You were wounded in the civil war.', { health: -15 }] } },
      { id: 'white', label: '🦅 Go south to the Whites — and then abroad', effect: { log: 'You went south with the Whites, and when they lost, you left on a ship from the Crimea.', icon: '🚢', emigrate: 'FR' } },
      { id: 'quiet', label: '🤐 Keep your head down', effect: { log: 'You kept your head down and your opinions to yourself.', icon: '🤐', stats: { stress: 4 } } },
    ] },
  { id: 'farmFamine', icon: '🌾', title: 'Grain for the State', when: (s, y) => ['UA', 'RU', 'KZ'].includes(cc(s)) && hap(s, 'russianRevolution') && y >= 1932 && y <= 1933 && age(s) >= 14,
    text: 'The brigades take the grain, the seed corn, the beans in the jar. The village is starving.',
    options: [
      { id: 'hide', label: '🕳️ Hide grain under the floor', effect: { log: 'You hid a sack of grain under the floorboards. It kept the family alive.', icon: '🕳️', stats: { health: -8 }, risk: [0.2, 'The brigade found the grain. You were sent to a camp.', { health: -20, happiness: -20 }] } },
      { id: 'flee', label: '🚶 Try to get to the city', effect: { log: 'You slipped past the checkpoints to the city and found work, without the papers to be there.', icon: '🚶', stats: { health: -6, stress: 8 } } },
      { id: 'endure', label: '🙏 Endure it', effect: { log: 'You lived through the famine on bark and nettles. Many in the village did not.', icon: '🙏', stats: { health: -15, happiness: -15 }, risk: [0.1, 'Hunger took you.', null, 0, { die: 'starvation' }] } },
    ] },
  { id: 'leningrad', icon: '🥶', title: 'The Siege', when: (s, y) => cc(s) === 'RU' && y >= 1941 && y <= 1943 && s.world?.wars?.RU?.id === 'ww2' && s.character.regionId === 'stpetersburg',
    text: 'The city is cut off. 125 grams of bread a day, and the winter is the coldest anyone remembers.',
    options: [
      { id: 'stay', label: '🍞 Stay and endure', effect: { log: 'You lived through the siege on the bread ration and wallpaper paste.', icon: '🍞', stats: { health: -20, happiness: -15 }, risk: [0.25, 'You died in the siege winter.', null, 0, { die: 'starvation in the siege' }] } },
      { id: 'road', label: '🧊 Leave over the Road of Life', effect: { log: 'You were evacuated over the frozen lake in the back of a lorry.', icon: '🧊', stats: { health: -8 }, risk: [0.08, 'The lorry went through the ice.', null, 0, { die: 'drowned on the Road of Life' }] } },
    ] },
  { id: 'vouchers', icon: '📜', title: 'Privatisation Vouchers', when: (s, y) => cc(s) === 'RU' && hap(s, 'sovietCollapse') && y >= 1992 && y <= 1994 && age(s) >= 18,
    text: 'Every citizen gets a voucher for a share of the nation\'s factories. Men in leather jackets are buying them for a bottle of vodka.',
    options: [
      { id: 'sell', label: '🍾 Sell it for cash', effect: { log: 'You sold your voucher for a few thousand roubles. Someone else became an oligarch.', icon: '🍾', earn: 30 } },
      { id: 'fund', label: '📈 Put it in an investment fund', effect: { log: 'You put your voucher in a fund advertised on television.', icon: '📈', risk: [0.6, 'The fund was a pyramid. It vanished overnight.', { happiness: -6 }] } },
      { id: 'factory', label: '🏭 Buy shares in your own factory', effect: { log: 'You bought shares in the factory where you worked. The director bought more.', icon: '🏭', stats: { happiness: 2 } } },
    ] },
  // ---------------- France ----------------
  { id: 'commune', icon: '🚩', title: 'The Commune', when: (s, y) => cc(s) === 'FR' && hap(s, 'francoPrussianWar') && y === 1871 && s.character.regionId === 'paris' && age(s) >= 16,
    text: 'Paris has risen against the government at Versailles. The barricades are going up and the army is coming.',
    options: [
      { id: 'barricade', label: '🚩 Man the barricades', effect: { log: 'You fought for the Commune in the Bloody Week.', icon: '🚩', stats: { stress: 10 }, risk: [0.3, 'You were taken prisoner and transported to New Caledonia.', { happiness: -20, health: -10 }] } },
      { id: 'leave', label: '🚶 Leave Paris', effect: { log: 'You left Paris for the provinces until it was over.', icon: '🚶' } },
      { id: 'home', label: '🏠 Stay indoors', effect: { log: 'You stayed indoors while Paris burned around you.', icon: '🏠', stats: { stress: 8 } } },
    ] },
  { id: 'sto', icon: '🏭', title: 'Forced Labour in Germany', when: (s, y) => cc(s) === 'FR' && s.world?.wars?.FR?.id === 'ww2' && y >= 1943 && y <= 1944 && male(s) && age(s) >= 20 && age(s) <= 23 && !inServices(s),
    text: 'Your year is called for the Service du travail obligatoire: work in German factories.',
    options: [
      { id: 'go', label: '🚂 Go', effect: { log: 'You spent the rest of the war in a factory in Germany, bombed by your own side.', icon: '🚂', stats: { health: -10, happiness: -12 } } },
      { id: 'hide', label: '🏚️ Hide on a farm', effect: { log: 'You went into hiding on a farm, a réfractaire with false papers.', icon: '🏚️', stats: { stress: 10 } } },
      { id: 'maquis', label: '🌲 Join the maquis', effect: { log: 'You took to the hills with the maquis.', icon: '🌲', stats: { stress: 12, fitness: 3 }, risk: [0.12, 'Your group was betrayed. You were wounded escaping.', { health: -18 }] } },
    ] },
  { id: 'liberation', icon: '🇫🇷', title: 'The Liberation', when: (s, y) => cc(s) === 'FR' && hap(s, 'ww2') && !s.era.events.ww2.axisWon && y === 1944 && age(s) >= 8,
    text: 'The Allies and the Free French are in Paris. The bells ring; the women who slept with Germans are being shaved in the square.',
    options: [
      { id: 'cheer', label: '🎉 Cheer in the streets', effect: { log: 'You cheered the Liberation in the streets.', icon: '🎉', stats: { happiness: 10 } } },
      { id: 'stop', label: '✋ Try to stop the shaving', effect: { log: 'You stood between a girl and the crowd with the scissors. Some never forgave you.', icon: '✋', stats: { happiness: 2, stress: 6 } } },
    ] },
  { id: 'mai68', icon: '🧱', title: 'May 1968', when: (s, y) => cc(s) === 'FR' && y === 1968 && age(s) >= 16 && age(s) <= 35,
    text: 'The students are prising up the cobbles in the Latin Quarter; ten million workers are on strike. "Beneath the paving stones, the beach!"',
    options: [
      { id: 'barricade', label: '🧱 Join the students on the barricades', effect: { log: 'You threw cobbles at the CRS in the Latin Quarter. It was the best month of your life.', icon: '🧱', stats: { happiness: 8 }, risk: [0.2, 'You were truncheoned and spent a night in the cells.', { health: -6 }] } },
      { id: 'strike', label: '✊ Join the general strike', effect: { log: 'You occupied the factory with the others. The Grenelle agreements raised wages by a third.', icon: '✊', earn: 600 } },
      { id: 'home', label: '📺 Watch it on television', effect: { log: 'You watched it all on television and voted for de Gaulle in June.', icon: '📺' } },
    ] },
  // ---------------- Germany ----------------
  { id: 'rubble', icon: '🧱', title: 'Stunde Null', when: (s, y) => cc(s) === 'DE' && hap(s, 'ww2') && y >= 1945 && y <= 1947 && age(s) >= 12,
    text: 'The cities are rubble. The hunger winter is coming, the Reichsmark is worthless and cigarettes are money.',
    options: [
      { id: 'rubble', label: '🧱 Clear rubble with the Trümmerfrauen', effect: { log: 'You passed bricks hand to hand all day, cleaning each one with a hammer.', icon: '🧱', stats: { fitness: 3, health: -3 } } },
      { id: 'hamster', label: '🥔 Take the hamster trains to the farms', effect: { log: 'You rode the overcrowded trains to the country and traded the good china for potatoes.', icon: '🥔', stats: { health: 3 } } },
      { id: 'black', label: '🚬 Deal on the black market', effect: { log: 'You traded American cigarettes on the black market.', icon: '🚬', earn: 400, risk: [0.15, 'The military police caught you dealing.', { happiness: -6 }, 200] } },
    ] },
  { id: 'wall', icon: '🧱', title: 'The Wall', when: (s, y) => cc(s) === 'DE' && hap(s, 'coldWar') && y === 1961 && s.character.regionId === 'berlin' && age(s) >= 14,
    text: 'Overnight, barbed wire across the streets of Berlin. Families are on either side of it.',
    options: [
      { id: 'over', label: '🏃 Get over before it\'s a wall', effect: { log: 'You went over the wire in the first days, with nothing but the clothes you wore.', icon: '🏃', stats: { stress: 10 }, risk: [0.1, 'The guards fired. You were hit, and made it anyway.', { health: -15 }] } },
      { id: 'stay', label: '🏠 Stay where you are', effect: { log: 'You stayed. The city you knew was cut in two for twenty-eight years.', icon: '🏠', stats: { happiness: -6 } } },
    ] },
  // ---------------- Japan ----------------
  { id: 'samurai', icon: '⚔️', title: 'The End of the Samurai', when: (s, y) => cc(s) === 'JP' && hap(s, 'meiji') && y >= 1876 && y <= 1877 && male(s) && age(s) >= 16,
    text: 'The swords are banned, the stipends ended. In Satsuma, Saigō Takamori\'s men are rising against the new government.',
    options: [
      { id: 'rebel', label: '⚔️ Join the Satsuma rebels', effect: { log: 'You fought with Saigō\'s rebels to the end at Shiroyama.', icon: '⚔️', risk: [0.5, 'You fell at Shiroyama.', null, 0, { die: 'killed in the Satsuma Rebellion' }] } },
      { id: 'army', label: '🎖️ Join the new conscript army', effect: { log: 'You joined the Emperor\'s new army of peasants in Western uniforms.', icon: '🎖️', stats: { fitness: 3 } } },
      { id: 'trade', label: '💼 Cut your topknot and go into trade', effect: { log: 'You cut your topknot and went into business. A new age.', icon: '💼', earn: 400 } },
    ] },
  { id: 'yamiichi', icon: '🍚', title: 'The Black Markets', when: (s, y) => cc(s) === 'JP' && hap(s, 'ww2') && y >= 1946 && y <= 1947 && age(s) >= 12,
    text: 'The rations come late and short. Under the railway arches, the black markets sell everything.',
    options: [
      { id: 'buy', label: '🍚 Buy rice on the black market', effect: { log: 'You bought black-market rice with your mother\'s kimono.', icon: '🍚', stats: { health: 3 } } },
      { id: 'ration', label: '📕 Live on the ration', effect: { log: 'You lived on the ration. A judge famously starved to death doing the same.', icon: '📕', stats: { health: -10 } } },
    ] },
  // ---------------- China ----------------
  { id: 'leapFamine', icon: '🍂', title: 'The Great Leap', when: (s, y) => cc(s) === 'CN' && hap(s, 'prc') && y >= 1959 && y <= 1961 && age(s) >= 10,
    text: 'The steel furnaces in the back yards, the quotas reported ten times over, and now nothing to eat.',
    options: [
      { id: 'endure', label: '🍂 Eat what can be found', effect: { log: 'You lived on elm bark and wild grass through the hungry years.', icon: '🍂', stats: { health: -15, happiness: -12 }, risk: [0.08, 'The famine took you.', null, 0, { die: 'starvation' }] } },
      { id: 'hk', label: '🌊 Swim for Hong Kong', effect: { log: 'You swam across Deep Bay at night to Hong Kong.', icon: '🌊', risk: [0.2, 'You drowned in the bay.', null, 0, { die: 'drowned swimming to Hong Kong' }] } },
    ] },
  { id: 'culturalRev', icon: '📕', title: 'The Cultural Revolution', when: (s, y) => cc(s) === 'CN' && hap(s, 'prc') && y >= 1966 && y <= 1969 && age(s) >= 15 && age(s) <= 24,
    text: 'The schools are closed. Red Guards are smashing temples and parading teachers in dunce caps.',
    options: [
      { id: 'guard', label: '📕 Put on the armband', effect: { log: 'You marched with the Red Guards. Years later you could not look your old teacher in the eye.', icon: '📕', stats: { happiness: -4 } } },
      { id: 'sentDown', label: '🌾 Go "up to the mountains, down to the villages"', effect: { log: 'You were sent down to a village to learn from the peasants. You stayed eight years.', icon: '🌾', stats: { fitness: 4, smarts: -4, happiness: -8 } } },
      { id: 'quiet', label: '🤐 Keep your head down', effect: { log: 'You kept your head down and your books hidden.', icon: '🤐', stats: { stress: 8 } } },
    ] },
  { id: 'tiananmen', icon: '🕯️', title: 'The Square', when: (s, y) => cc(s) === 'CN' && hap(s, 'prc') && y === 1989 && age(s) >= 17 && age(s) <= 30,
    text: 'The students have been in Tiananmen Square for weeks. The army is gathering outside the city.',
    options: [
      { id: 'join', label: '🕯️ Join them in the square', effect: { log: 'You joined the students in the square.', icon: '🕯️', risk: [0.15, 'On the night of June the 4th you were shot in the street.', { health: -25 }] } },
      { id: 'away', label: '🏠 Stay away', effect: { log: 'You stayed away. Nobody spoke of it afterwards.', icon: '🏠' } },
    ] },
  // ---------------- India ----------------
  { id: 'quitIndia', icon: '✊', title: 'Quit India', when: (s, y) => cc(s) === 'IN' && hap(s, 'ww2') && y === 1942 && age(s) >= 16,
    text: 'Gandhi has called on the British to quit India: "Do or die." The Congress leaders are already in jail.',
    options: [
      { id: 'join', label: '✊ Join the movement', effect: { log: 'You marched and picketed for Quit India.', icon: '✊', risk: [0.35, 'You were arrested and held without trial for two years.', { happiness: -10 }] } },
      { id: 'out', label: '🏠 Stay out of it', effect: { log: 'You stayed out of it, and wondered afterwards whether you should have.', icon: '🏠' } },
    ] },
  { id: 'partition', icon: '🚂', title: 'Partition', when: (s, y) => ['IN', 'PK'].includes(cc(s)) && y === 1947 && age(s) >= 12 && ['lahore', 'delhi', 'kolkata', 'karachi'].includes(s.character.regionId),
    text: 'The new border runs past your town. The trains arrive full of the dead.',
    options: [
      { id: 'stay', label: '🏠 Stay and hope', effect: { log: 'You stayed, and kept your head down while the killing went on.', icon: '🏠', stats: { stress: 15 }, risk: [0.1, 'A mob came to the street.', { health: -20 }] } },
      { id: 'cross', label: '🚶 Cross with the columns', effect: { log: 'You walked across the new border in a column a mile long, carrying what you could.', icon: '🚶', stats: { health: -10, happiness: -10 } } },
    ] },
  { id: 'emergency', icon: '🚫', title: 'The Emergency', when: (s, y) => cc(s) === 'IN' && y >= 1975 && y <= 1977 && male(s) && age(s) >= 25 && age(s) <= 50,
    text: 'The sterilisation drive has quotas. The man from the block office says your ration card depends on it.',
    options: [
      { id: 'refuse', label: '🙅 Refuse', effect: { log: 'You refused, and lost your ration card for a year.', icon: '🙅', stats: { stress: 8 } } },
      { id: 'accept', label: '💉 Go to the camp', effect: { log: 'You went to the camp and came back with a transistor radio.', icon: '📻', stats: { happiness: -6 } } },
    ] },
  // ---------------- Ireland, Spain, Brazil ----------------
  { id: 'rising', icon: '☘️', title: 'The Rising', when: (s, y) => cc(s) === 'IE' && y === 1916 && age(s) >= 16 && s.character.regionId === 'dublin',
    text: 'Easter Monday: the Volunteers have taken the General Post Office and proclaimed a Republic.',
    options: [
      { id: 'join', label: '☘️ Join them in the GPO', effect: { log: 'You fought in the Rising.', icon: '☘️', risk: [0.5, 'You were interned at Frongoch after the surrender.', { happiness: -8 }] } },
      { id: 'away', label: '🏠 Stay off the streets', effect: { log: 'You stayed home while the centre of Dublin burned.', icon: '🏠' } },
    ] },
  { id: 'spainSides', icon: '⚔️', title: '1936', when: (s, y) => cc(s) === 'ES' && hap(s, 'spanishCivilWar') && y === at(s, 'spanishCivilWar') && age(s) >= 17 && !inServices(s),
    text: 'The generals have risen against the Republic. The country is splitting town by town.',
    options: [
      { id: 'republic', label: '🔴 Fight for the Republic', effect: { log: 'You joined the militias for the Republic.', icon: '🔴', risk: [0.2, 'You were wounded at the front.', { health: -20 }] } },
      { id: 'nationalist', label: '⚪ Join the Nationalists', effect: { log: 'You went over to the Nationalists.', icon: '⚪', risk: [0.15, 'You were wounded at the front.', { health: -20 }] } },
      { id: 'france', label: '🏔️ Cross the Pyrenees to France', effect: { log: 'You crossed the mountains into France.', icon: '🏔️', emigrate: 'FR' } },
    ] },
  { id: 'goldenLaw', icon: '📜', title: 'The Golden Law', when: (s, y) => cc(s) === 'BR' && y === 1888 && age(s) >= 10,
    text: 'Princess Isabel has signed the Lei Áurea: slavery is abolished in Brazil, the last country in the Americas to do it.',
    options: [
      { id: 'celebrate', label: '🎉 Celebrate in the streets', effect: { log: 'You celebrated the end of slavery in the streets for three days.', icon: '🎉', stats: { happiness: 8 } } },
      { id: 'quiet', label: '🏠 Watch the planters\' fury', effect: { log: 'The planters said the Empire would pay for it. A year later it did.', icon: '🏠' } },
    ] },
];
