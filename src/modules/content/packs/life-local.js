/**
 * Pack: local colour. The same kinds of moments the rest of the pool has (a feast day, a match,
 * a family meal, a wedding), told where you live and by what your family believes: Diwali and
 * Eid, Lunar New Year, Carnival, the Day of the Dead, Songkran, Nowruz, Hanukkah, midsummer, a
 * cricket Test, a derby, a sumo tournament. Faith follows state.community.faith; places follow
 * the country you live in. Written in the rule language (../Rules.js).
 */
const faith = (s) => s.community?.faith?.traditionId ?? '';
const is = (...ids) => (s) => ids.includes(faith(s));
const MUSLIM = ['sunni', 'shia', 'salafi'];
const JEWISH = ['reformJewish', 'conservativeJewish', 'orthodoxJewish', 'hasidic'];
const CHRISTIAN = ['catholic', 'tradCatholic', 'anglican', 'lutheran', 'mainline', 'orthodoxChristian', 'evangelical', 'baptist', 'pentecostal', 'conservativeMethodist', 'apostolic', 'ifb', 'churchPlant', 'lds'];

const LATAM = ['MX', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'CU', 'DO', 'CO', 'VE', 'EC', 'PE', 'BO', 'CL', 'AR', 'UY', 'PY', 'BR'];
const CARNIVAL = ['BR', 'TT', 'DO', 'CO', 'BO', 'UY', 'HT', 'CU', 'PA'];
const CHINESE_NY = ['CN', 'TW', 'SG', 'MY', 'VN', 'KR', 'ID'];
const CRICKET = ['GB', 'IN', 'PK', 'BD', 'LK', 'AU', 'NZ', 'ZA', 'JM', 'TT', 'BB', 'AF'];
const NORDIC = ['SE', 'NO', 'FI', 'DK', 'IS', 'EE', 'LV', 'LT'];
const WEST_AFRICA = ['NG', 'GH', 'SN', 'CI', 'ML', 'BF', 'NE', 'GN', 'SL', 'LR', 'TG', 'BJ', 'GM', 'CM'];
const EAST_AFRICA = ['KE', 'TZ', 'UG', 'RW', 'ET', 'BI', 'SO', 'SS'];
const PERSIAN_NY = ['IR', 'AF', 'TJ', 'AZ', 'UZ', 'TM', 'KG', 'KZ', 'IQ'];
const SE_ASIA_WATER = ['TH', 'LA', 'KH', 'MM'];
const FOOTBALL = ['GB', 'ES', 'IT', 'DE', 'FR', 'PT', 'NL', 'AR', 'BR', 'UY', 'TR', 'GR', 'NG', 'GH', 'EG', 'MX', 'CO', 'CL', 'IE', 'BE', 'HR', 'RS', 'PL', 'SE', 'DK'];

export default {
  id: 'life-local',
  version: 1,
  events: [
    /* ---------------- Feasts of the faiths ---------------- */
    { id: 'loc.diwali', title: 'Diwali', when: { age: [4, null], test: is('hindu', 'sikh') }, text: 'It\'s Diwali: the house is full of lamps, sweets are piled on every plate, and the sky is crackling.', options: [
      { id: 'lamps', label: '🪔 Light the diyas with the family', stat: { happiness: 6 }, relation: { parents: 2 }, log: 'You lit the clay lamps along the windowsill and ate far too many laddoos.' },
      { id: 'crackers', label: '🎆 Fireworks with the cousins', check: { chance: 0.85 }, pass: { stat: { happiness: 7 }, log: 'You let off rockets with your cousins until your aunt shouted.' }, fail: { stat: { health: -3 }, log: 'A cracker went off in your hand. A small burn, and a story for every Diwali after.' } },
    ] },
    { id: 'loc.holi', title: 'Holi', when: { age: [4, 60], test: is('hindu') }, text: 'It\'s Holi. The street is a riot of coloured powder and water.', options: [
      { id: 'play', label: '🎨 Throw yourself into it', stat: { happiness: 7 }, log: 'You came home pink, green and purple, and your clothes never recovered.' },
      { id: 'watch', label: '🏠 Watch from the roof', stat: { happiness: 2 }, log: 'You watched from the roof, and were ambushed with a bucket anyway.' },
    ] },
    { id: 'loc.eid', title: 'Eid', when: { age: [4, null], test: is(...MUSLIM) }, text: 'Ramadan is over. It\'s Eid: new clothes, prayers in the morning and visits all day.', options: [
      { id: 'visit', label: '🤲 Visit every relative', stat: { happiness: 6 }, relation: { parents: 2 }, log: 'You visited every relative in the family, and were fed at every house.' },
      { id: 'give', label: '🎁 Give to those with less', bill: 20, reason: 'Eid charity', stat: { happiness: 4 }, log: 'You gave to the poor of the neighbourhood, as you were taught.' },
    ] },
    { id: 'loc.ramadan', title: 'The Fast', when: { age: [12, 70], test: is(...MUSLIM) }, text: 'It\'s a hot Ramadan, and the days are long.', options: [
      { id: 'fast', label: '🌙 Keep the whole fast', stat: { health: -1, happiness: 3, stress: -2 }, log: 'You kept every day of the fast. The first date at sunset was the best thing you ever tasted.' },
      { id: 'iftar', label: '🍽️ Host an iftar', bill: 40, reason: 'Iftar', stat: { happiness: 5 }, log: 'You hosted the neighbours for iftar and the talk went on past midnight.' },
    ] },
    { id: 'loc.hanukkah', title: 'Hanukkah', when: { age: [4, null], test: is(...JEWISH) }, text: 'It\'s Hanukkah: eight nights of candles, and latkes frying in the kitchen.', options: [
      { id: 'candles', label: '🕎 Light the menorah', stat: { happiness: 5 }, relation: { parents: 2 }, log: 'You lit the candles and sang, and played dreidel for chocolate coins.' },
    ] },
    { id: 'loc.passover', title: 'The Seder', when: { age: [5, null], test: is(...JEWISH) }, text: 'The whole family is coming for the Passover seder.', options: [
      { id: 'ask', label: '❓ Ask the four questions', stat: { happiness: 4 }, skill: { publicSpeaking: 1 }, log: 'You asked the four questions, and the seder went on until midnight.' },
      { id: 'afikoman', label: '🫓 Hunt for the afikoman', stat: { happiness: 5 }, log: 'You found the hidden matzah, and drove a hard bargain for it.' },
    ] },
    { id: 'loc.vesak', title: 'Vesak', when: { age: [5, null], test: is('buddhist') }, text: 'It\'s Vesak: lanterns at the temple and alms for the monks.', options: [
      { id: 'temple', label: '🏮 Go to the temple', stat: { happiness: 4, stress: -4 }, log: 'You lit lanterns at the temple and gave food to the monks at dawn.' },
    ] },
    { id: 'loc.christmas', title: 'Christmas', when: { age: [3, null], test: is(...CHRISTIAN) }, text: 'It\'s Christmas, and the family is gathering.', options: [
      { id: 'family', label: '🎄 The whole family, every argument', stat: { happiness: 5, stress: 3 }, relation: { parents: 2, siblings: 1 }, log: ['A full house, too much food and one argument about politics. A good Christmas.', 'Midnight Mass, then presents, then a very long lunch.'] },
      { id: 'quiet', label: '🕯️ A quiet one', stat: { happiness: 3, stress: -3 }, log: 'A quiet Christmas, and a walk in the cold.' },
    ] },
    { id: 'loc.easterOrthodox', title: 'Pascha', when: { age: [4, null], test: is('orthodoxChristian') }, text: 'It\'s Orthodox Easter. The candles are passed from hand to hand at midnight: Christ is risen!', options: [
      { id: 'vigil', label: '🕯️ Keep the midnight vigil', stat: { happiness: 5 }, log: 'You carried your candle home without letting it go out, and cracked red eggs with the family.' },
    ] },

    /* ---------------- Festivals of the place ---------------- */
    { id: 'loc.lunarNewYear', title: 'Lunar New Year', when: { age: [3, null], country: CHINESE_NY }, text: 'It\'s the New Year: the house is swept, red paper on the door, and the whole family is coming home.', options: [
      { id: 'home', label: '🧧 Go home for the reunion dinner', stat: { happiness: 6 }, relation: { parents: 3 }, log: 'Dumplings, fish for abundance, and red envelopes for the children. Your aunt asked when you\'d marry.' },
      { id: 'away', label: '🧳 Stay away this year', relation: { parents: -3 }, log: 'You stayed away this year. Your mother mentioned it every month until the next.' },
    ] },
    { id: 'loc.carnival', title: 'Carnival', when: { age: [12, 65], country: CARNIVAL }, text: 'Carnival is here: four days of music, costumes and no sleep.', options: [
      { id: 'parade', label: '🎭 Join a parade group', bill: 50, reason: 'Carnival costume', stat: { happiness: 9, fitness: 1 }, log: 'You danced in the parade in feathers and sequins until your feet bled. Worth it.' },
      { id: 'street', label: '🥁 Dance in the street', stat: { happiness: 6 }, log: 'You followed the drums through the streets until dawn.' },
    ] },
    { id: 'loc.dayDead', title: 'The Day of the Dead', when: { age: [4, null], country: ['MX', 'GT'] }, text: 'It\'s the Day of the Dead. The family is building the altar: marigolds, candles, and the photographs.', options: [
      { id: 'altar', label: '🌼 Build the ofrenda together', stat: { happiness: 4, stress: -2 }, relation: { parents: 2 }, log: 'You laid out pan de muerto and your grandfather\'s favourite cigarettes, and told stories about him.' },
      { id: 'cemetery', label: '🕯️ Keep vigil at the cemetery', stat: { happiness: 3 }, log: 'You spent the night at the graves with candles and music, as the whole town did.' },
    ] },
    { id: 'loc.songkran', title: 'Songkran', when: { age: [5, 60], country: SE_ASIA_WATER }, text: 'It\'s the New Year water festival, and the whole country is armed with buckets.', options: [
      { id: 'soak', label: '💦 Join the water fight', stat: { happiness: 7 }, log: 'You were soaked from head to foot in the first minute, and stayed that way for three days.' },
      { id: 'elders', label: '🙏 Pour water on the elders\' hands', relation: { parents: 3 }, stat: { happiness: 3 }, log: 'You poured scented water over your grandparents\' hands for their blessing.' },
    ] },
    { id: 'loc.nowruz', title: 'Nowruz', when: { age: [4, null], country: PERSIAN_NY }, text: 'It\'s Nowruz, the New Year at the spring equinox. The haft-sin table is laid.', options: [
      { id: 'jump', label: '🔥 Jump the bonfires', stat: { happiness: 6 }, log: 'You jumped the bonfires on the last Wednesday of the year: "my yellow to you, your red to me".' },
      { id: 'visit', label: '🌱 Visit the family', relation: { parents: 2 }, stat: { happiness: 4 }, log: 'Thirteen days of visits, sweets and new clothes.' },
    ] },
    { id: 'loc.midsummer', title: 'Midsummer', when: { age: [4, null], country: NORDIC }, text: 'It\'s midsummer, and the sun barely sets.', options: [
      { id: 'pole', label: '🌸 Dance round the maypole', stat: { happiness: 6 }, log: 'You danced round the pole, ate herring and new potatoes, and sang the frog song.' },
      { id: 'lake', label: '🏊 Swim in the lake at midnight', stat: { happiness: 6, fitness: 1 }, log: 'You swam in the lake at midnight in broad daylight.' },
    ] },
    { id: 'loc.oktoberfest', title: 'The Beer Festival', when: { age: [18, 80], country: ['DE', 'AT'], year: [1810, null] }, text: 'The beer tents are up for the autumn festival.', options: [
      { id: 'go', label: '🍺 A day in the tents', bill: 40, reason: 'Festival', stat: { happiness: 6, health: -1 }, log: 'You sang on the benches with strangers, and lost your hat.' },
      { id: 'no', label: '🙅 Avoid the crowds', log: 'You stayed well away.' },
    ] },
    { id: 'loc.bastille', title: 'The Fourteenth of July', when: { age: [5, null], country: ['FR'], year: [1880, null] }, text: 'It\'s the Fête nationale: a parade in the morning, a dance at the fire station at night.', options: [
      { id: 'bal', label: '💃 Go to the firemen\'s ball', stat: { happiness: 6 }, log: 'You danced at the bal des pompiers until the fireworks.' },
    ] },
    { id: 'loc.obon', title: 'Obon', when: { age: [4, null], country: ['JP'] }, text: 'It\'s Obon, when the ancestors come home. Lanterns are lit, and the town dances in the square.', options: [
      { id: 'dance', label: '🏮 Dance the bon odori', stat: { happiness: 5 }, log: 'You danced in a yukata under the lanterns, and floated a lantern down the river for your grandparents.' },
      { id: 'grave', label: '🪦 Tend the family grave', relation: { parents: 2 }, stat: { stress: -2 }, log: 'You washed the family gravestone and left flowers and rice.' },
    ] },
    { id: 'loc.chuseok', title: 'Chuseok', when: { age: [4, null], country: ['KR', 'KP'] }, text: 'It\'s Chuseok, the harvest festival. The whole country is on the road home.', options: [
      { id: 'home', label: '🌕 Go home to the family', stat: { happiness: 5 }, relation: { parents: 3 }, log: 'You made songpyeon with your grandmother and bowed at the ancestors\' graves.' },
    ] },
    { id: 'loc.durbar', title: 'The Festival', when: { age: [5, null], country: WEST_AFRICA }, text: 'The town is celebrating its festival: drums, horsemen and the chiefs in their finest robes.', options: [
      { id: 'watch', label: '🥁 Watch the procession', stat: { happiness: 5 }, log: 'The horsemen charged and pulled up a hand\'s width from the chief. You\'ll never forget the noise.' },
      { id: 'dance', label: '💃 Dance with your age-mates', stat: { happiness: 6, fitness: 1 }, log: 'You danced with your age-mates until the drummers gave up.' },
    ] },
    { id: 'loc.wedding', title: 'A Family Wedding', when: { age: [6, null], country: ['IN', 'PK', 'BD', 'NP', 'LK'] }, text: 'A cousin is getting married: four days, a thousand guests and three changes of clothes.', options: [
      { id: 'dance', label: '💃 Dance at the sangeet', stat: { happiness: 7 }, log: 'You danced at the sangeet until three in the morning, and your aunts started looking for a match for you.' },
      { id: 'help', label: '🍛 Help in the kitchens', skill: { cooking: 2 }, relation: { parents: 2 }, log: 'You stirred biryani in pots big enough to bathe in.' },
    ] },
    { id: 'loc.harambee', title: 'Harambee', when: { age: [18, null], country: EAST_AFRICA }, text: 'The village is holding a harambee to raise money for a new classroom. Everyone gives what they can.', options: [
      { id: 'give', label: '🤝 Give generously', bill: 40, reason: 'Harambee', rep: { work: 2 }, stat: { happiness: 4 }, log: 'Your name was read out among the givers. The classroom went up by the rains.' },
      { id: 'little', label: '🪙 Give a little', bill: 5, reason: 'Harambee', log: 'You gave what you could spare.' },
    ] },

    /* ---------------- The national game ---------------- */
    { id: 'loc.cricket', title: 'The Test Match', when: { age: [8, null], country: CRICKET, year: [1877, null] }, text: 'There\'s a Test match on, and the whole country has stopped to follow it.', options: [
      { id: 'ground', label: '🏏 Go to the ground', bill: 20, reason: 'Match ticket', stat: { happiness: 6 }, log: 'Five days in the sun, a dramatic last session, and a sunburned nose.' },
      { id: 'radio', label: '📻 Follow every ball from home', stat: { happiness: 3 }, log: 'You followed every ball, and bowled the last over in your head all night.' },
    ] },
    { id: 'loc.derby', title: 'The Derby', when: { age: [8, null], country: FOOTBALL, year: [1880, null] }, text: 'It\'s the derby against the team from across the city.', options: [
      { id: 'go', label: '⚽ Stand with the fans', bill: 15, reason: 'Match ticket', check: { chance: 0.5 }, pass: { stat: { happiness: 8 }, log: 'A winner in the last minute. You hugged strangers.' }, fail: { stat: { happiness: -5 }, log: 'You lost, at home, to them. A long week at work.' } },
      { id: 'no', label: '🙄 It\'s only a game', log: 'You said it was only a game. Nobody spoke to you.' },
    ] },
    { id: 'loc.sumo', title: 'The Basho', when: { age: [8, null], country: ['JP'] }, text: 'The grand sumo tournament is on.', options: [
      { id: 'watch', label: '🎌 Watch the final bouts', stat: { happiness: 4 }, log: 'The yokozuna was thrown out of the ring on the last day. Cushions flew.' },
    ] },
    { id: 'loc.rugby', title: 'The Big Match', when: { age: [8, null], country: ['NZ', 'ZA', 'FJ', 'TO', 'WS', 'IE'], year: [1890, null] }, text: 'The national rugby side is playing, and nothing else matters this weekend.', options: [
      { id: 'watch', label: '🏉 Watch with everyone', check: { chance: 0.6 }, pass: { stat: { happiness: 7 }, log: 'A famous win. The whole country was hoarse on Monday.' }, fail: { stat: { happiness: -4 }, log: 'A loss. The country went into mourning.' } },
    ] },

    /* ---------------- Food and home ---------------- */
    { id: 'loc.market', title: 'Market Day', when: { age: [8, null], country: { not: ['US', 'CA', 'AU', 'NZ'] } }, text: 'It\'s market day, and you\'ve been sent with a basket and a list.', options: [
      { id: 'haggle', label: '🗣️ Haggle hard', skill: { negotiation: 2 }, earn: 3, source: 'Haggling', log: 'You got the price down by a third and came home proud.' },
      { id: 'gossip', label: '💬 Stop and talk to everyone', stat: { happiness: 3 }, log: 'You came home two hours late with all the news of the town.' },
    ] },
    { id: 'loc.familyMeal', title: 'Sunday Lunch', when: { age: [6, null] }, text: 'The whole family is round the table for the long weekly meal.', options: [
      { id: 'stay', label: '🍲 Stay all afternoon', stat: { happiness: 4 }, relation: { parents: 2, siblings: 2 }, log: 'Three courses, two arguments and one old story you\'ve heard a hundred times. You laughed anyway.' },
      { id: 'leave', label: '🚪 Make an excuse', relation: { parents: -2 }, log: 'You made an excuse and left early. Your mother kept a plate for you.' },
    ] },
  ],
};
