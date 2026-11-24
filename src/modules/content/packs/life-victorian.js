/**
 * Pack: the long nineteenth century, and the years either side of 1900. Daily life before the
 * welfare state: harvests and hiring fairs, guilds and apprenticeships, cholera and quarantine,
 * the railway arriving, the telegraph, the first photograph, emigrant ships, poor relief and the
 * workhouse, chapel and temperance, fairs, dowries and courtship, duels, the census taker; then
 * the bicycle craze, the first motor car in town, the picture house and the influenza of 1918.
 * Every event carries its years (`when.year`). Written in the rule language (../Rules.js).
 */
import { statuteIn } from '../../politics/StatuteBook.js';

const poor = (s) => Boolean(s.flags?.poorStart) || (s.finances?.cash ?? 0) < 50;
const male = (s) => s.character.gender === 'male';
const female = (s) => s.character.gender === 'female';
const C19 = [null, 1899];

export default {
  id: 'life-victorian',
  version: 1,
  events: [
    /* ---------------- Work and the land ---------------- */
    { id: 'vic.hiringFair', title: 'The Hiring Fair', when: { age: [14, 40], year: [null, 1914], job: false }, text: 'It\'s the hiring fair. Farm servants stand in the square with a token of their trade, waiting to be hired for the year.', options: [
      { id: 'stand', label: '🌾 Stand with a wisp of straw in your hat', earn: [40, 90], source: 'A year\'s hiring', stat: { fitness: 2 }, log: 'A farmer looked you over, asked a few questions, and gave you the fasten-penny. A year\'s work, bed and board.' },
      { id: 'town', label: '🏙️ Try the town instead', check: { chance: 0.5 }, pass: { earn: [60, 120], source: 'Town work', log: 'You walked to town and found work at a carter\'s yard.' }, fail: { stat: { happiness: -4 }, log: 'You found nothing in town and slept in a barn on the way home.' } },
    ] },
    { id: 'vic.badHarvest', title: 'A Bad Harvest', when: { age: [16, 70], year: [null, 1910] }, text: 'Rain all August. The corn is lying flat in the fields, and the price of bread is going up.', options: [
      { id: 'tighten', label: '🍞 Tighten your belt', stat: { health: -3, stress: 4 }, log: 'Potatoes and thin soup until spring. You got through.' },
      { id: 'pawn', label: '🏷️ Pawn your Sunday best', earn: [5, 15], source: 'Pawnshop', stat: { happiness: -3 }, log: 'Your Sunday clothes went to the pawnshop on Monday, as half the street\'s did.' },
    ] },
    { id: 'vic.guild', title: 'The Masters\' Company', when: { age: [20, 40], year: C19, job: true }, text: 'Your apprenticeship is served. The masters of your trade will admit you as a journeyman, for a fee and a dinner.', options: [
      { id: 'join', label: '🛠️ Pay and be admitted', bill: 30, reason: 'Admission fee', rep: { work: 5 }, job: { salary: 5 }, log: 'You were admitted to the company, and drank to it until midnight.' },
      { id: 'tramp', label: '🚶 Go on the tramp, town to town', skill: { carpentry: 2 }, stat: { fitness: 2 }, log: 'You tramped from town to town with your tools on your back, working where you could.' },
    ] },
    { id: 'vic.strike', title: 'The Strike', when: { age: [16, 60], year: [1830, 1926], job: true }, text: 'The men are coming out on strike for a shorter day. The masters say they\'ll bring in others.', options: [
      { id: 'out', label: '✊ Come out with them', check: { chance: 0.5 }, pass: { job: { salary: 6 }, stat: { happiness: 5 }, log: 'You held out for six weeks, and won a shorter day.' }, fail: { stat: { happiness: -6 }, bill: 20, reason: 'Weeks without pay', log: 'Six weeks out and nothing to show for it. The masters took back who they wanted.' } },
      { id: 'work', label: '🚪 Keep working', rep: { work: 3 }, stat: { happiness: -3 }, log: 'You kept working. The others didn\'t speak to you for a year.' },
    ] },
    { id: 'vic.factoryAccident', title: 'The Machine', when: { age: [12, 60], year: [1820, 1914], job: true }, text: 'A belt snapped on the machine next to yours.', options: [
      { id: 'help', label: '🩹 Go to help', check: { chance: 0.75 }, pass: { rep: { work: 3 }, log: 'You pulled the lad clear before the belt took his arm.' }, fail: { stat: { health: -10 }, log: 'The belt caught your hand. You were off work a month, and nobody paid you for it.' } },
      { id: 'stand', label: '🧍 Keep clear', stat: { stress: 4 }, log: 'You kept clear. The man lost two fingers. The foreman said he was careless.' },
    ] },
    { id: 'vic.inService', title: 'Into Service', when: { age: [13, 25], year: [null, 1939], test: (s) => female(s) && poor(s) }, text: 'A lady in the big house needs a scullery maid. Bed, board and a few pounds a year.', options: [
      { id: 'go', label: '🧹 Go into service', earn: [10, 25], source: 'Wages in service', stat: { fitness: 2, happiness: -2 }, log: 'You were up at five to black the grates. Six days a week and a half day on Sunday.' },
      { id: 'mill', label: '🏭 The mill pays better', earn: [20, 40], source: 'Mill wages', stat: { health: -3 }, log: 'You chose the mill: louder and dirtier, but your evenings were your own.' },
    ] },

    /* ---------------- Health in the age before germs ---------------- */
    { id: 'vic.cholera', title: 'Cholera in the Street', when: { age: [5, 80], year: [1830, 1895] }, text: 'There\'s cholera three doors down. The doctor talks of bad air; others say it\'s the pump.', options: [
      { id: 'boil', label: '🫖 Drink only boiled water and tea', check: { chance: 0.85 }, pass: { log: 'You drank only tea and boiled water. The street lost eleven people. Your house lost none.' }, fail: { stat: { health: -20 }, log: 'You caught it anyway, and nearly died on the kitchen floor.' } },
      { id: 'leave', label: '🚶 Go to relatives in the country', bill: 10, reason: 'Travel', stat: { stress: 3 }, log: 'You went to an aunt in the country until it passed.' },
      { id: 'pray', label: '🙏 Trust to Providence', check: { chance: 0.7 }, pass: { log: 'It passed you by.' }, fail: { stat: { health: -25 }, log: 'The cholera took hold of you. You lived, barely.' } },
    ] },
    { id: 'vic.smallpox', title: 'The Vaccinator', when: { age: [14, 45], year: [1800, 1900] }, text: 'A doctor is going house to house with cowpox lymph to protect against smallpox. Some neighbours want nothing to do with it.', options: [
      { id: 'yes', label: '💉 Be vaccinated', stat: { health: 2 }, log: 'A scratch on the arm, a fever for two days, and a scar for life. No smallpox.' },
      { id: 'no', label: '🙅 Refuse', check: { chance: 0.85 }, pass: { log: 'You refused. You were lucky.' }, fail: { stat: { health: -20, looks: -10 }, log: 'Smallpox came that winter. You lived, pocked for life.' } },
    ] },
    { id: 'vic.quack', title: 'The Patent Medicine', when: { age: [16, 80], year: [null, 1910] }, text: 'A man on a cart is selling a tonic that cures everything from gout to melancholy.', options: [
      { id: 'buy', label: '🧪 Buy a bottle', bill: 3, reason: 'Patent tonic', stat: { happiness: 3, health: -1 }, log: 'It tasted of laudanum and treacle. You felt wonderful, then terrible.' },
      { id: 'no', label: '🙄 Walk on', log: 'You walked on. Your neighbour bought six.' },
    ] },
    { id: 'vic.toothpull', title: 'Toothache', when: { age: [12, 80], year: [null, 1920] }, text: 'Your tooth has throbbed for a week. The blacksmith pulls teeth for a penny.', options: [
      { id: 'pull', label: '🔧 Have it pulled', bill: 1, reason: 'Tooth drawn', stat: { health: 1 }, log: 'Two men held you down. It was over in a moment and you cried anyway.' },
      { id: 'clove', label: '🌿 Oil of cloves and hope', stat: { stress: 4 }, log: 'You chewed cloves for a month until it stopped hurting, or you stopped noticing.' },
    ] },

    /* ---------------- New things: rails, wires, pictures ---------------- */
    { id: 'vic.railway', title: 'The Railway Comes', when: { age: [8, 80], year: [1830, 1900] }, text: 'The railway has reached town. The whole place has turned out to see the first train come in.', options: [
      { id: 'ride', label: '🚂 Buy a ticket for the first run', bill: 2, reason: 'Railway ticket', stat: { happiness: 6 }, log: 'You rode the first train at an unheard-of thirty miles an hour. A woman fainted.' },
      { id: 'watch', label: '👀 Watch from the bridge', stat: { happiness: 3 }, log: 'You watched it come in from the bridge, in a cloud of smoke, and cheered.' },
      { id: 'against', label: '😠 It\'ll ruin the place', log: 'You said it would scare the cows and ruin the town. It did change the town.' },
    ] },
    { id: 'vic.telegraph', title: 'A Telegram', when: { age: [16, 80], year: [1850, 1930] }, text: 'A boy on a bicycle has brought a telegram to your door. Telegrams are usually bad news.', options: [
      { id: 'open', label: '✉️ Open it', check: { chance: 0.6 }, pass: { stat: { happiness: 5 }, log: 'A birth in the family, and all well. You sent one back: CONGRATULATIONS STOP.' }, fail: { stat: { happiness: -8 }, log: 'A death in the family, in eleven words. You read it three times.' } },
    ] },
    { id: 'vic.photograph', title: 'The Photographer\'s Studio', when: { age: [14, 80], year: [1845, 1900] }, text: 'A photographer has opened a studio on the high street. A portrait costs a week\'s wages.', options: [
      { id: 'sit', label: '📸 Sit for your portrait', bill: 8, reason: 'Portrait', stat: { happiness: 4 }, log: 'You sat stock-still for half a minute with your head in a clamp. The picture stayed in the family for a century.' },
      { id: 'no', label: '💸 Too dear', log: 'You decided it was too dear. There is no picture of you at that age.' },
    ] },
    { id: 'vic.gaslight', title: 'Gaslight', when: { age: [8, 80], year: [1815, 1880] }, text: 'They\'ve put gas lamps in your street. The night isn\'t dark any more.', options: [
      { id: 'walk', label: '🌃 Walk out after dark', stat: { happiness: 4 }, log: 'You walked out under the new lamps, just because you could.' },
    ] },
    { id: 'vic.penny', title: 'The Penny Post', when: { age: [12, 80], year: [1840, 1900], country: ['GB', 'IE'] }, text: 'A letter costs only a penny now, anywhere in the country.', options: [
      { id: 'write', label: '✉️ Write to someone far away', skill: { writing: 2 }, stat: { happiness: 3 }, log: 'You wrote to a cousin who\'d moved away. Letters went back and forth for forty years.' },
      { id: 'cant', label: '🤷 Have a neighbour write for you', log: 'A neighbour who could write put down your words, and read the answer out when it came.' },
    ] },
    { id: 'vic.exhibition', title: 'The Great Exhibition', when: { age: [10, 80], year: [1851, 1851], country: ['GB'] }, text: 'The whole world is on show in a palace made of glass in Hyde Park. The railway is running cheap excursions.', options: [
      { id: 'go', label: '🏛️ Take the excursion train', bill: 5, reason: 'Excursion to the Exhibition', stat: { happiness: 8, smarts: 2 }, log: 'You saw the Koh-i-Noor, a steam hammer and an elm tree under glass. You talked about it for years.' },
      { id: 'no', label: '🏠 Hear about it', log: 'You heard all about it from people who went.' },
    ] },

    /* ---------------- Poverty and the parish ---------------- */
    { id: 'vic.poorRelief', title: 'The Relieving Officer', when: { age: [18, 80], year: [null, 1929], cash: [null, 20] }, text: 'There\'s no work and nothing in the cupboard. You could apply to the parish for relief.', options: [
      { id: 'apply', label: '📝 Apply for outdoor relief', earn: [5, 15], source: 'Parish relief', stat: { happiness: -4 }, log: 'The relieving officer asked a great many questions and gave you a loaf and a shilling a week.' },
      { id: 'house', label: '🏚️ Go into the workhouse', stat: { happiness: -12, health: -4 }, log: 'You went into the workhouse. Families separated at the door, uniform, oakum to pick. You got out as soon as you could.' },
      { id: 'pride', label: '😤 Manage somehow', stat: { stress: 8, health: -3 }, log: 'You managed somehow, on pride and odd jobs.' },
    ] },
    { id: 'vic.friendlySociety', title: 'The Friendly Society', when: { age: [18, 60], year: [1800, 1948], job: true }, text: 'The Oddfellows meet at the Red Lion: a few pence a week, and they\'ll pay you when you\'re sick and bury you when you\'re dead.', options: [
      { id: 'join', label: '🤝 Join the lodge', bill: 4, reason: 'Lodge subscription', stat: { happiness: 3 }, log: 'You joined the lodge, learned the handshake, and slept easier for it.' },
      { id: 'no', label: '🙅 Keep your pennies', log: 'You kept your pennies.' },
    ] },
    { id: 'vic.debtors', title: 'The Tallyman', when: { age: [18, 70], year: [null, 1914], cash: [null, 30] }, text: 'The tallyman is at the door for this week\'s payment on the clothes you bought on tick.', options: [
      { id: 'pay', label: '🪙 Pay him', bill: 3, reason: 'Tallyman', log: 'You paid him and went without a dinner.' },
      { id: 'hide', label: '🚪 Hide behind the door', check: { chance: 0.5 }, pass: { log: 'He went away. He\'ll be back.' }, fail: { bill: 6, reason: 'Tallyman, with interest', stat: { stress: 5 }, log: 'He waited. You paid double in the end.' } },
    ] },

    /* ---------------- Faith, temperance, the fair ---------------- */
    { id: 'vic.temperance', title: 'Signing the Pledge', when: { age: [14, 70], year: [1830, 1930] }, text: 'The temperance society is holding a meeting in the chapel. They want you to sign the pledge: not a drop, ever.', options: [
      { id: 'sign', label: '✍️ Sign the pledge', stat: { health: 3, happiness: -1 }, log: 'You signed the pledge and got a card with a ribbon on it.' },
      { id: 'pub', label: '🍺 Go to the pub instead', stat: { happiness: 3, health: -1 }, log: 'You went to the pub and toasted the temperance society.' },
    ] },
    { id: 'vic.revival', title: 'The Revival', when: { age: [14, 70], year: [null, 1910] }, text: 'A travelling preacher is holding a revival in a field outside town. Hundreds are coming.', options: [
      { id: 'go', label: '🔥 Go and hear him', stat: { happiness: 4, stress: -3 }, log: 'The preaching went on for four hours. People wept and sang. You came home changed, for a while.' },
      { id: 'no', label: '🙄 Stay away', log: 'You stayed away. The noise carried for miles.' },
    ] },
    { id: 'vic.fair', title: 'The Fair', when: { age: [6, 70], year: [null, 1930] }, text: 'The fair has come to town: a menagerie, a fortune teller, a strongman and a boxing booth.', options: [
      { id: 'box', label: '🥊 Take on the boxing booth for a prize', check: { stat: 'fitness', difficulty: 65 }, pass: { earn: [5, 10], source: 'Boxing booth prize', stat: { happiness: 6 }, log: 'You lasted three rounds and took the prize money.' }, fail: { stat: { health: -5 }, log: 'You lasted thirty seconds.' } },
      { id: 'fortune', label: '🔮 Have your fortune told', bill: 1, reason: 'Fortune teller', stat: { happiness: 3 }, log: ['She said you\'d cross water and marry a dark stranger.', 'She said you\'d come into money. You\'re still waiting.'] },
      { id: 'animals', label: '🐘 See the menagerie', stat: { happiness: 4 }, log: 'You saw a real elephant, and a lion that looked very tired.' },
    ] },

    /* ---------------- Courtship, honour, the census ---------------- */
    { id: 'vic.courting', title: 'Courting', when: { age: [17, 30], partner: false, year: [null, 1914] }, text: 'You\'ve been walking out with someone after chapel. Their father wants to know your intentions.', options: [
      { id: 'formal', label: '🎩 Call on the father properly', check: { stat: 'smarts', difficulty: 40 }, pass: { stat: { happiness: 5 }, log: 'You called on the father in your best collar. He grunted, which meant yes.' }, fail: { stat: { happiness: -4 }, log: 'The father didn\'t think you were good enough. That was the end of it.' } },
      { id: 'cool', label: '🚶 Cool things off', log: 'You let it drift. People talked anyway.' },
    ] },
    { id: 'vic.dowry', title: 'The Dowry', when: { age: [16, 26], year: [null, 1920], test: female, partner: false }, text: 'A match is proposed. The other family want a dowry: linen, a little money, a cow.', options: [
      { id: 'agree', label: '💍 Let your father agree terms', bill: 25, reason: 'Dowry', stat: { happiness: 2 }, log: 'The terms were agreed over a glass of something strong. You met him properly at the church.' },
      { id: 'refuse', label: '🙅 Refuse the match', relation: { parents: -6 }, stat: { happiness: 3 }, log: 'You refused him. Your father didn\'t speak to you for a month.' },
    ] },
    { id: 'vic.duel', title: 'A Matter of Honour', when: { age: [18, 45], year: [null, 1860], test: (s) => male(s) && !poor(s) }, text: 'A man insulted you in public, and your friends say honour demands satisfaction at dawn.', options: [
      { id: 'duel', label: '🔫 Name your second', check: { stat: 'fitness', difficulty: 50 }, pass: { stat: { happiness: 4 }, rep: { work: 3 }, log: 'Both pistols fired wide, as both men intended. Honour was satisfied.' }, fail: { stat: { health: -25 }, log: 'His ball took you in the shoulder. You were lucky it wasn\'t lower.' } },
      { id: 'apologise', label: '🤝 Let it be smoothed over', rep: { work: -2 }, log: 'Your friends arranged an apology over dinner. Some thought less of you.' },
    ] },
    { id: 'vic.census', title: 'The Census', when: { age: [18, 90], year: [1841, 1911] }, text: 'The census enumerator is at the door with his schedule: names, ages, occupations, where born.', options: [
      { id: 'honest', label: '📋 Tell him straight', log: 'He wrote you down in a careful hand. A hundred years later, someone looking for you will find you there.' },
      { id: 'younger', label: '🤫 Knock a few years off', stat: { happiness: 1 }, log: 'You knocked five years off your age. You\'ve done it every census since.' },
    ] },
    { id: 'vic.ship', title: 'The Emigrant Ship', when: { age: [16, 45], year: [1830, 1914], country: { not: ['US', 'CA', 'AU', 'NZ', 'AR'] } }, text: 'An agent in the market square is selling passages to the New World: land for the taking, wages twice what they are here.', options: [
      { id: 'think', label: '🤔 Take a handbill home', stat: { stress: 2 }, log: 'You took the handbill home and read it until it fell apart. Maybe one day.' },
      { id: 'brother', label: '💸 Help a brother go', bill: 15, reason: 'Passage money', relation: { siblings: 6 }, log: 'You scraped together a brother\'s passage money. His letters came back full of promises.' },
    ] },
    { id: 'vic.hunting', title: 'The Hunt Comes Through', when: { age: [10, 70], year: [null, 1939], country: ['GB', 'IE'] }, text: 'The hunt has come straight across your field and through the hedge.', options: [
      { id: 'complain', label: '😠 Complain to the master', check: { chance: 0.4 }, pass: { earn: 5, source: 'Damages from the hunt', log: 'The master paid for the hedge, with bad grace.' }, fail: { log: 'The master didn\'t stop to listen.' } },
      { id: 'gate', label: '🚪 Open the gate and touch your cap', log: 'You opened the gate and touched your cap. It was easier.' },
    ] },

    /* ---------------- 1890–1925: the turn of the century ---------------- */
    { id: 'tc.bicycle', title: 'The Bicycle Craze', when: { age: [12, 60], year: [1890, 1910] }, text: 'Everyone is mad for the new safety bicycle. Ladies ride in bloomers; the vicar thinks it\'s scandalous.', options: [
      { id: 'buy', label: '🚲 Buy one on the instalment plan', bill: 20, reason: 'A bicycle', stat: { fitness: 3, happiness: 5 }, log: 'You rode out to the country every Sunday, faster than any horse and cart.' },
      { id: 'borrow', label: '🤝 Borrow a friend\'s', check: { stat: 'fitness', difficulty: 35 }, pass: { stat: { happiness: 4 }, log: 'You wobbled, then flew.' }, fail: { stat: { health: -3 }, log: 'You went straight into a hedge.' } },
    ] },
    { id: 'tc.motorCar', title: 'The First Motor Car', when: { age: [6, 80], year: [1896, 1914] }, text: 'A motor car has come through town at twelve miles an hour, frightening every horse in the street.', options: [
      { id: 'chase', label: '🏃 Run after it', stat: { happiness: 4 }, log: 'You ran after it with every child in town. It broke down by the church.' },
      { id: 'tut', label: '😤 It\'ll never catch on', log: 'You said it would never catch on. The horse agreed.' },
    ] },
    { id: 'tc.pictures', title: 'Moving Pictures', when: { age: [6, 80], year: [1897, 1926] }, text: 'There\'s a travelling picture show in the town hall: pictures that move, with a man playing the piano.', options: [
      { id: 'go', label: '🎞️ Go and see', bill: 1, reason: 'Picture show', stat: { happiness: 5 }, log: 'A train came straight at the audience. Half of them ducked.' },
    ] },
    { id: 'tc.electric', title: 'Electric Light', when: { age: [6, 80], year: [1895, 1935] }, text: 'The house is being wired for electric light. No more lamps to trim.', options: [
      { id: 'yes', label: '💡 Have it put in', bill: 15, reason: 'Wiring', stat: { happiness: 5 }, log: 'You switched it on and off a dozen times the first night, just to see.' },
      { id: 'no', label: '🕯️ Lamps were good enough for your mother', log: 'You kept the lamps. You were the last in the street.' },
    ] },
    { id: 'tc.suffrage', title: 'Votes for Women', when: { age: [16, 70], year: [1903, 1918], test: (s) => !statuteIn(s, 'womensSuffrage') }, text: 'The suffragettes are marching through town, and a crowd is jeering.', options: [
      { id: 'march', label: '📣 March with them', stat: { happiness: 4, stress: 4 }, check: { chance: 0.8 }, pass: { log: 'You marched with the suffragettes. Someone threw a cabbage.' }, fail: { offense: { id: 'disorderly', discovery: 1, evidence: 0.5 }, log: 'You were arrested with the others for obstruction.' } },
      { id: 'watch', label: '👀 Watch from the pavement', log: 'You watched. You thought about it for a long time afterwards.' },
    ] },
    { id: 'tc.flu', title: 'The Influenza', when: { age: [3, 80], year: [1918, 1919] }, text: 'The influenza is in the town. Schools are shut; the undertaker has run out of coffins.', options: [
      { id: 'mask', label: '😷 Wear a gauze mask and stay in', check: { chance: 0.8 }, pass: { log: 'You stayed in and kept away from crowds. You came through it.' }, fail: { stat: { health: -15 }, log: 'You caught it and went blue in the face. You lived. Many didn\'t.' } },
      { id: 'nurse', label: '🫶 Nurse the sick next door', stat: { health: -4, happiness: 3 }, skill: { caregiving: 3 }, check: { chance: 0.7 }, pass: { log: 'You nursed the family next door through it. They never forgot.' }, fail: { stat: { health: -15 }, log: 'You nursed them, and caught it yourself.' } },
    ] },
    { id: 'tc.gramophone', title: 'The Gramophone', when: { age: [8, 80], year: [1900, 1930] }, text: 'A neighbour has a gramophone with a great brass horn.', options: [
      { id: 'listen', label: '🎶 Listen through the window', stat: { happiness: 3 }, skill: { music: 1 }, log: 'You heard Caruso sing through the neighbour\'s window, and stood still in the street.' },
    ] },
  ],
};
