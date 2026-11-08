/**
 * Pack: the decades. What a year felt like: the music, the crazes, the things everyone did,
 * the moments everyone remembers where they were. Each event has its years (`when.year`), so a
 * life in 1925 hears jazz on a wireless set and a life in 1985 wants MTV. Some belong to a
 * country (rationing in Britain, the Coronation, duck-and-cover drills in America).
 */
export default {
  id: 'life-decades',
  version: 1,
  events: [
    /* ---------------- 1910s–1930s ---------------- */
    { id: 'dec.wireless', title: 'The Wireless', when: { age: [6, 80], year: [1922, 1938] }, text: 'Your family has saved up for a wireless set. It takes pride of place in the front room.', options: [
      { id: 'serials', label: '📻 Never miss the evening serials', stat: { happiness: 4 }, log: 'The whole family gathers round the wireless every evening.' },
      { id: 'dance', label: '🎺 Dance-band music on a Saturday night', stat: { happiness: 4 }, skill: { music: 2 }, log: 'You learned every dance-band tune by heart.' },
    ] },
    { id: 'dec.jazz', title: 'The Jazz Age', when: { age: [16, 35], year: [1920, 1929] }, text: 'Everyone your age is mad about jazz and the Charleston. Your parents think it\'s the end of civilisation.', options: [
      { id: 'dance', label: '💃 Dance the Charleston at the club', stat: { happiness: 6, fitness: 1 }, relation: { parents: -2 }, log: 'You danced until the band packed up, and walked home at dawn.' },
      { id: 'no', label: '🙅 Not for you', log: 'You stayed home with a book.' },
    ] },
    { id: 'dec.speakeasy', title: 'Prohibition', when: { age: [18, 60], year: [1920, 1933], country: ['US'] }, text: 'Alcohol is illegal, and there\'s a speakeasy behind the barber\'s on Fourth Street. You know the password.', options: [
      { id: 'go', label: '🍸 Knock three times', check: { chance: 0.85 }, pass: { stat: { happiness: 5 }, log: 'Bathtub gin, a password at the door, and a very good trumpet player.' }, fail: { stat: { happiness: -3 }, bill: 50, reason: 'Fine (speakeasy raid)', log: 'The place was raided. You were fined and your name was in the paper.' } },
      { id: 'dry', label: '🚫 Stay dry', log: 'You kept to lemonade, and the law.' },
    ] },
    { id: 'dec.talkies', title: 'The Talkies', when: { age: [6, 80], year: [1927, 1935] }, text: 'The picture house is showing a film where the actors actually talk.', options: [
      { id: 'go', label: '🎞️ Queue round the block for it', stat: { happiness: 5 }, log: 'The audience gasped when the first words came out of the screen.' },
    ] },
    { id: 'dec.dustbowl', title: 'Hard Times', when: { age: [8, 70], year: [1930, 1938], economy: ['recession', 'recovery'] }, text: ['Men are queueing at the soup kitchen on the corner. One of them used to be your neighbour\'s foreman.', 'A family who lost their farm is camped by the road out of town.'], options: [
      { id: 'share', label: '🥣 Share what you can', spend: 50, reason: 'Helping out', stat: { happiness: 3 }, log: 'You gave what you could. It wasn\'t much; it was something.' },
      { id: 'look', label: '👀 Look away', stat: { happiness: -2 }, log: 'You walked past quickly.' },
    ] },

    /* ---------------- 1940s ---------------- */
    { id: 'dec.rationing', title: 'Rationing', when: { age: [4, 90], year: [1940, 1953], country: ['GB', 'AU', 'NZ', 'CA', 'IE'] }, text: 'One egg a week, a scrap of butter, sweets on coupons. The ration book rules the kitchen.', options: [
      { id: 'garden', label: '🥕 Dig for Victory: grow your own', stat: { health: 2, happiness: 2 }, skill: { gardening: 5 }, log: 'The back garden is all potatoes and runner beans now.' },
      { id: 'black', label: '🕶️ Buy from a spiv on the black market', check: { chance: 0.8 }, pass: { spend: 40, reason: 'Black-market butter', stat: { happiness: 3 }, log: 'Real butter, wrapped in newspaper, no questions asked.' }, fail: { cash: -80, stat: { happiness: -4 }, log: 'You were fined for black-market goods.' } },
    ] },
    { id: 'dec.swing', title: 'Swing', when: { age: [15, 35], year: [1936, 1949] }, text: 'The big bands are playing at the dance hall tonight. Everyone in uniform will be there.', options: [
      { id: 'jitterbug', label: '🎷 Jitterbug all night', stat: { happiness: 6, fitness: 1 }, log: 'You were flung over a stranger\'s shoulder to "In the Mood".' },
      { id: 'home', label: '🏠 Stay home and write letters', relation: { partner: 2 }, log: 'You wrote three pages to someone far away.' },
    ] },

    /* ---------------- 1950s ---------------- */
    { id: 'dec.tvset', title: 'The Television', when: { age: [5, 90], year: [1950, 1962] }, text: 'The first television on the street has arrived — and it\'s your family\'s. The neighbours keep finding reasons to drop by.', options: [
      { id: 'invite', label: '📺 Invite the whole street round', stat: { happiness: 5 }, log: 'Twenty people in your front room, watching a tiny grey screen in silence.' },
      { id: 'family', label: '🛋️ Keep it for the family', stat: { happiness: 3 }, log: 'Supper on trays in front of the set, every night.' },
    ] },
    { id: 'dec.coronation', title: 'The Coronation', when: { age: [3, 95], year: [1953, 1953], country: ['GB', 'AU', 'NZ', 'CA'] }, text: 'The Coronation is being shown on television. Half the country is crowded round the few sets there are.', options: [
      { id: 'party', label: '🎉 A street party with bunting', stat: { happiness: 6 }, log: 'Trestle tables down the middle of the street, paper crowns and rain.' },
    ] },
    { id: 'dec.rocknroll', title: 'Rock and Roll', when: { age: [12, 25], year: [1955, 1963] }, text: 'There\'s a new sound on the radio and the adults hate it. A boy from Mississippi is shaking his hips on television.', options: [
      { id: 'records', label: '🎸 Spend everything on records', spend: 30, reason: 'Records', stat: { happiness: 6 }, skill: { music: 3 }, log: 'You wore the grooves off your first record.' },
      { id: 'hop', label: '🕺 Go to the sock hop', stat: { happiness: 5 }, log: 'You danced with someone you\'ll remember for a long time.' },
    ] },
    { id: 'dec.duckcover', title: 'Duck and Cover', when: { age: [5, 14], year: [1951, 1963], country: ['US'] }, text: 'At school today you practised hiding under your desk in case of an atom bomb.', options: [
      { id: 'scared', label: '😟 Lie awake thinking about it', stat: { stress: 4 }, log: 'You dreamt about a white flash for weeks.' },
      { id: 'shrug', label: '🤷 Treat it like a fire drill', log: 'It was a good excuse to get out of arithmetic.' },
    ] },
    { id: 'dec.hulahoop', title: 'The Hula Hoop', when: { age: [5, 14], year: [1957, 1960] }, text: 'Every child in the country wants a hula hoop.', options: [
      { id: 'hoop', label: '⭕ Beg for one', stat: { happiness: 5, fitness: 2 }, log: 'You could keep it up for twenty minutes.' },
    ] },

    /* ---------------- 1960s ---------------- */
    { id: 'dec.beatles', title: 'Beatlemania', when: { age: [10, 25], year: [1963, 1966] }, text: 'Four lads from Liverpool are on every radio. Girls are screaming at airports.', options: [
      { id: 'concert', label: '🎤 Queue all night for tickets', check: { chance: 0.4 }, pass: { spend: 25, reason: 'Concert tickets', stat: { happiness: 10 }, log: 'You couldn\'t hear a note over the screaming. Best night of your life.' }, fail: { stat: { happiness: -2 }, log: 'They sold out before you reached the front.' } },
      { id: 'radio', label: '📻 Listen under the covers', stat: { happiness: 4 }, log: 'You knew every word of the B-sides.' },
    ] },
    { id: 'dec.moon', title: 'Men on the Moon', when: { age: [3, 95], year: [1969, 1969] }, text: 'It\'s the middle of the night and the whole world is watching a fuzzy picture of a man climbing down a ladder onto the Moon.', options: [
      { id: 'watch', label: '🌕 Stay up and watch', stat: { happiness: 6 }, log: 'You were there — well, in front of the television — when the first man walked on the Moon.' },
    ] },
    { id: 'dec.woodstock', title: 'A Festival', when: { age: [16, 28], year: [1967, 1971] }, text: 'Everyone\'s heading to a music festival in a muddy field: three days of peace, love and terrible plumbing.', options: [
      { id: 'go', label: '🌼 Hitch a ride and go', stat: { happiness: 8, health: -2 }, relation: { parents: -2 }, log: 'You came back muddy, sunburnt and changed.' },
      { id: 'no', label: '🏠 Watch it on the news', log: 'It looked very wet.' },
    ] },
    { id: 'dec.march', title: 'The March', when: { age: [16, 30], year: [1965, 1972], country: ['US', 'GB', 'AU', 'FR', 'DE'] }, text: 'Students are marching against the war in Vietnam. Your friends are going.', options: [
      { id: 'march', label: '✌️ March with them', stat: { happiness: 4 }, check: { chance: 0.8 }, pass: { log: 'Thousands of you, singing, all the way to the government buildings.' }, fail: { stat: { stress: 5 }, log: 'The police charged the march. You ran.' } },
      { id: 'no', label: '🙅 Stay out of it', log: 'You had exams.' },
    ] },

    /* ---------------- 1970s ---------------- */
    { id: 'dec.disco', title: 'Disco', when: { age: [16, 35], year: [1975, 1980] }, text: 'There\'s a new discotheque in town with a light-up dance floor.', options: [
      { id: 'dance', label: '🪩 Put on the flares and go', spend: 30, reason: 'A night out', stat: { happiness: 6 }, log: 'You did the Hustle under a mirror ball until 3 a.m.' },
      { id: 'punk', label: '🤘 Disco sucks: go to the punk gig instead', stat: { happiness: 5 }, log: 'Three chords, a lot of spit, and the best night you\'d had in years.' },
    ] },
    { id: 'dec.powercut', title: 'Power Cuts', when: { age: [5, 90], year: [1972, 1979], country: ['GB'] }, text: 'Another strike, another power cut. Candles on the kitchen table again.', options: [
      { id: 'cards', label: '🕯️ Family card games by candlelight', stat: { happiness: 2 }, relation: { parents: 2 }, log: 'You got very good at rummy that winter.' },
    ] },

    /* ---------------- 1980s ---------------- */
    { id: 'dec.walkman', title: 'The Walkman', when: { age: [10, 40], year: [1980, 1989] }, text: 'You can carry your music around in your pocket now. Everyone on the bus has headphones on.', options: [
      { id: 'buy', label: '🎧 Buy one and make mixtapes', spend: 100, reason: 'Walkman', stat: { happiness: 5 }, log: 'You spent hours making the perfect mixtape for someone.' },
    ] },
    { id: 'dec.arcade', title: 'The Arcade', when: { age: [8, 20], year: [1980, 1989] }, text: 'There\'s a new arcade at the shopping centre and you have a pocketful of coins.', options: [
      { id: 'play', label: '👾 Go for the high score', stat: { happiness: 4 }, log: 'You got your initials on the high-score table.' },
      { id: 'save', label: '💰 Save the money', cash: 5, log: 'Very sensible. Very boring.' },
    ] },
    { id: 'dec.wall', title: 'The Wall Comes Down', when: { age: [5, 95], year: [1989, 1990] }, text: 'On the news, crowds are standing on the Berlin Wall, hacking at it with hammers.', options: [
      { id: 'watch', label: '🧱 Stay up watching', stat: { happiness: 5 }, log: 'You watched the Wall come down live, and felt the world change.' },
    ] },

    /* ---------------- 1990s ---------------- */
    { id: 'dec.y2k', title: 'Y2K', when: { age: [8, 95], year: [1999, 1999] }, text: 'Experts on the news warn that every computer in the world might crash at midnight on New Year\'s Eve.', options: [
      { id: 'stock', label: '🥫 Stock up on tins, just in case', spend: 150, reason: 'Y2K supplies', log: 'Midnight came. The lights stayed on. You ate tinned peaches until March.' },
      { id: 'party', label: '🎆 Party like it\'s 1999', stat: { happiness: 6 }, log: 'The millennium came in with fireworks and nothing crashed at all.' },
    ] },
    { id: 'dec.dialup', title: 'Dial-Up', when: { age: [8, 60], year: [1996, 2002] }, text: 'The family has the internet now. It screeches when it connects and nobody can use the phone.', options: [
      { id: 'chat', label: '💬 Spend hours in chat rooms', stat: { happiness: 3 }, relation: { parents: -2 }, log: 'You met people from three countries. Your mother couldn\'t ring anyone all evening.' },
    ] },
  ],
};
