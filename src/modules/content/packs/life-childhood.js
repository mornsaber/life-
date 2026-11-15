/**
 * Pack: childhood. The early years (2–5) as short moments that just happen; ages 6–17 as small
 * choices. Each era has its own childhood: before 1900 many children worked by 10 and left
 * school at 12; toys, games and pastimes follow the decades (a hoop and stick, a crystal set,
 * the television, a games console). Written in the rule language (../Rules.js).
 */
import { ageOf } from '../../people/People.js';

const sibs = (s) => (s.people?.list ?? []).filter((p) => p.relation === 'sibling' && p.alive);
const hasSibling = (s) => sibs(s).length > 0;
/** A brother or sister born in the last year or two. */
const newBaby = (s) => sibs(s).some((p) => ageOf(s, p) <= 1);
const hasPet = (s) => (s.pets?.list ?? s.pets ?? []).length > 0;
const faith = (s) => s.community?.faith?.traditionId ?? null;
const poor = (s) => Boolean(s.flags?.poorStart) || (s.finances?.cash ?? 0) < 0;
const OLD = [null, 1899];
const EARLY = [null, 1919];

export default {
  id: 'life-childhood',
  version: 1,
  events: [
    /* ---------------- The early years (2–5): things that happen ---------------- */
    { id: 'ch.firstWords', icon: '🗣️', when: { age: [1, 2] }, run: { stat: { smarts: 1 }, log: ['Your first word was "no". Your parents are still not sure what that says about you.', 'Your first word was the name of the family dog.', 'You said your first words, and then would not stop talking.'] } },
    { id: 'ch.firstSteps', icon: '👣', when: { age: [1, 2] }, run: { stat: { fitness: 1, happiness: 1 }, log: ['You took your first wobbly steps, straight into the furniture.', 'You walked before you crawled, and nobody could keep up after that.'] } },
    { id: 'ch.newSibling', icon: '👶', when: { age: [2, 6], test: newBaby }, run: { stat: { happiness: -1 }, relation: { siblings: 2 }, log: ['There\'s a new baby in the house. You are not impressed.', 'You were told the new baby is your little brother or sister. You asked when it was going back.'] } },
    { id: 'ch.scraped', icon: '🩹', when: { age: [2, 6] }, run: { stat: { health: -1 }, log: ['You fell off the garden wall and scraped both knees. You were very brave about it, eventually.', 'You ran into a door frame and had a bump on your head for a week.'] } },
    { id: 'ch.fear', icon: '🌙', when: { age: [2, 6] }, run: { stat: { stress: 2 }, log: ['You were sure something lived under your bed, and you slept with the door open for a year.', 'Thunder terrified you. You spent every storm under the kitchen table.'] } },
    { id: 'ch.imaginaryFriend', icon: '🧚', when: { age: [3, 6] }, run: { stat: { happiness: 2 }, log: ['You had an imaginary friend called Pip, who was to blame for everything.', 'Your imaginary friend needed a place set at the table. Your mother set it.'] } },
    { id: 'ch.lost', icon: '😢', when: { age: [3, 6] }, run: { stat: { stress: 3 }, relation: { parents: 1 }, log: ['You got lost at the market for half an hour. You remember the fear, and the hug.', 'You wandered off at the fair. A kind stranger walked you home.'] } },
    { id: 'ch.firstFriend', icon: '🧒', when: { age: [3, 6] }, run: { stat: { happiness: 3 }, log: ['You made your first friend, a child down the street who could whistle.', 'You and the neighbour\'s child were inseparable, and mostly muddy.'] } },
    { id: 'ch.measles', icon: '🤒', when: { age: [2, 8], year: [null, 1970] }, run: { stat: { health: -4 }, log: ['You had the measles, three weeks in a darkened room.', 'Whooping cough kept you up for a whole winter, and your mother with you.', 'You had chickenpox, and the scar on your forehead stayed.'] } },
    { id: 'ch.picture', icon: '📷', when: { age: [2, 6], year: [1890, null] }, run: { stat: { happiness: 1 }, log: ['You were dressed in your best and sat very still for a photograph. You cried in it.', 'There\'s a photograph of you at four, scowling at the camera. Your parents kept it on the mantelpiece.'] } },
    { id: 'ch.bedtime', icon: '📖', when: { age: [3, 7] }, run: { stat: { smarts: 2, happiness: 1 }, relation: { parents: 2 }, log: ['Every night there was a story before bed. You knew them all by heart and corrected any changes.', 'Your grandmother told you the old stories, the ones that aren\'t written down.'] } },
    { id: 'ch.tantrum', icon: '😤', when: { age: [2, 4] }, run: { relation: { parents: -1 }, log: ['You lay down on the floor of the shop and screamed. Everyone stared.', 'You refused to eat anything green for a full year.'] } },

    /* ---------------- 6–12: small choices ---------------- */
    { id: 'ch.firstDaySchool', title: 'First Day of School', when: { age: [5, 7], year: [1880, null] }, text: 'It\'s your first day of school. The teacher is tall and the room smells of chalk.', options: [
      { id: 'brave', label: '🎒 March straight in', stat: { happiness: 3 }, log: 'You marched in and sat at the front. Your mother cried more than you did.' },
      { id: 'cling', label: '😭 Cling to the gate', stat: { stress: 3 }, log: 'You held on to the gate until the teacher prised you off. By lunchtime you\'d forgotten why.' },
    ] },
    { id: 'ch.dameSchool', title: 'Your Letters', when: { age: [5, 8], year: [null, 1879] }, text: 'A neighbour teaches a few children their letters for a penny a week, in her front room.', options: [
      { id: 'go', label: '🔤 Learn your letters', bill: 5, reason: 'School pennies', stat: { smarts: 4 }, log: 'You learned to read from a battered primer and the family Bible.' },
      { id: 'home', label: '🏠 Help at home instead', stat: { fitness: 1 }, log: 'There wasn\'t a penny to spare. You helped at home and learned your letters later, if at all.' },
    ] },
    { id: 'ch.bully', title: 'The Bully', when: { age: [7, 13] }, text: 'A bigger child has been taking your lunch every day.', options: [
      { id: 'fight', label: '👊 Stand up to them', check: { stat: 'fitness', difficulty: 45 }, pass: { stat: { happiness: 6 }, log: 'You stood your ground. They never bothered you again.' }, fail: { stat: { health: -3, happiness: -3 }, log: 'You got a black eye, and a reputation for nerve.' } },
      { id: 'tell', label: '🧑‍🏫 Tell a teacher', stat: { stress: -2 }, log: 'The teacher had a word. It mostly worked.' },
      { id: 'share', label: '🍞 Hide your lunch better', log: 'You ate your lunch on the walk to school. Problem solved, sort of.' },
    ] },
    { id: 'ch.brokenWindow', title: 'The Broken Window', when: { age: [7, 12] }, text: 'Your ball went straight through a neighbour\'s window.', options: [
      { id: 'own', label: '🙋 Knock and own up', relation: { parents: 3 }, stat: { happiness: -1 }, log: 'You knocked on the door and owned up. You did their errands for a month to pay for the glass.' },
      { id: 'run', label: '🏃 Run', check: { chance: 0.5 }, pass: { log: 'Nobody saw. You never played on that street again.' }, fail: { relation: { parents: -4 }, log: 'The neighbour knew exactly whose ball it was. Your parents were not pleased.' } },
    ] },
    { id: 'ch.strayAnimal', title: 'A Stray', when: { age: [6, 12], test: (s) => !hasPet(s) }, text: 'A thin stray dog has followed you home and is sitting on the step.', options: [
      { id: 'keep', label: '🐕 Beg to keep it', check: { chance: 0.5 }, pass: { stat: { happiness: 8 }, log: 'Your parents gave in. The dog slept at the foot of your bed for years.' }, fail: { stat: { happiness: -3 }, log: 'Your parents said no. You fed it scraps by the back door until it moved on.' } },
      { id: 'feed', label: '🦴 Feed it and let it go', stat: { happiness: 2 }, log: 'You gave it your supper and it trotted off, happier.' },
    ] },
    { id: 'ch.sibFight', title: 'Brothers and Sisters', when: { age: [6, 14], test: hasSibling }, text: 'You and your sibling have been at war all week over whose turn it is.', options: [
      { id: 'make', label: '🤝 Make it up', relation: { siblings: 5 }, log: 'You made it up, and stayed up late laughing about it.' },
      { id: 'win', label: '⚔️ Win, whatever it takes', relation: { siblings: -5 }, stat: { happiness: 2 }, log: 'You won. They\'ll remember.' },
    ] },
    { id: 'ch.spellingBee', title: 'The Spelling Competition', when: { age: [8, 12], year: [1880, null] }, text: 'You\'ve reached the last round of the school spelling competition.', options: [
      { id: 'go', label: '🔡 Spell it', check: { stat: 'smarts', difficulty: 60 }, pass: { stat: { happiness: 7, smarts: 1 }, log: 'You spelled it right, and won a book with a ribbon in it.' }, fail: { stat: { happiness: -3 }, log: 'One letter wrong. You can still spell that word today.' } },
    ] },
    { id: 'ch.treehouse', title: 'The Den', when: { age: [7, 12] }, text: 'You and your friends want to build a den in the woods.', options: [
      { id: 'build', label: '🪚 Build it properly', skill: { carpentry: 2 }, stat: { happiness: 5 }, log: 'It leaked, it leaned, and it was the best place on earth.' },
      { id: 'raid', label: '⚔️ Raid the rival gang\'s den', check: { chance: 0.6 }, pass: { stat: { happiness: 6 }, log: 'A glorious victory with pine cones.' }, fail: { stat: { health: -2 }, log: 'You fell out of a tree in the retreat.' } },
    ] },
    { id: 'ch.pocketMoney', title: 'Pocket Money', when: { age: [7, 12] }, text: 'You\'ve saved up a little money of your own.', options: [
      { id: 'sweets', label: '🍬 Sweets, all of it', stat: { happiness: 4, health: -1 }, log: 'You spent the lot at the sweet shop and were sick on the way home.' },
      { id: 'save', label: '🫙 Save it in a jar', earn: 5, source: 'Pocket money saved', stat: { happiness: 1 }, log: 'You saved it, and counted it every night.' },
    ] },
    { id: 'ch.lieChoice', title: 'Who Broke It?', when: { age: [6, 11] }, text: 'Your mother\'s favourite dish is in pieces on the floor, and she wants to know who did it.', options: [
      { id: 'truth', label: '😔 Tell the truth', relation: { parents: 3 }, log: 'You owned up. She was sad about the dish and glad about you.' },
      { id: 'blame', label: '🐈 Blame the cat', check: { chance: 0.4 }, pass: { log: 'The cat took the blame. The cat did not mind.' }, fail: { relation: { parents: -4 }, log: 'There is no cat. You were sent to bed early.' } },
    ] },
    { id: 'ch.nativity', title: 'The School Play', when: { age: [6, 11], year: [1880, null] }, text: 'You\'ve been cast in the school play — as a tree.', options: [
      { id: 'tree', label: '🌳 Be the best tree there ever was', stat: { happiness: 4 }, skill: { publicSpeaking: 1 }, log: 'You were a magnificent tree. People talked about it.' },
      { id: 'lead', label: '🎭 Ask for a bigger part', check: { stat: 'looks', difficulty: 55 }, pass: { stat: { happiness: 6 }, skill: { publicSpeaking: 2 }, log: 'You got a speaking part, and remembered every word.' }, fail: { log: 'You stayed a tree. A slightly sulky tree.' } },
    ] },
    { id: 'ch.firstCommunion', title: 'Your First Communion', when: { age: [7, 8], test: (s) => ['catholic', 'tradCatholic'].includes(faith(s)) }, text: 'Your First Communion is on Sunday: new clothes, a photograph, and the whole family at Mass.', options: [
      { id: 'go', label: '🕊️ Do it properly', stat: { happiness: 4 }, relation: { parents: 3 }, log: 'You were scrubbed and dressed in white, and got a medal from your godmother.' },
    ] },
    { id: 'ch.games', title: 'After School', when: { age: [6, 12] }, text: 'School is out and the light lasts until supper.', options: [
      { id: 'out', label: '🏃 Play out in the street', stat: { fitness: 2, happiness: 3 }, log: ['Hopscotch, tag and marbles until you were called in.', 'A football in the street, coats for goalposts, until it was too dark to see.'] },
      { id: 'read', label: '📚 Read under a tree', stat: { smarts: 2, happiness: 2 }, log: 'You read until the light went, and then under the covers.' },
    ] },

    /* Toys and pastimes of the decade */
    { id: 'ch.hoop', title: 'Toys', when: { age: [5, 10], year: [null, 1915] }, text: 'A peddler at the fair is selling tin whistles, spinning tops and a hoop with a stick.', options: [
      { id: 'hoop', label: '⭕ The hoop and stick', bill: 2, reason: 'A toy', stat: { happiness: 4, fitness: 1 }, log: 'You bowled your hoop up and down the lane until the stick broke.' },
      { id: 'carve', label: '🪵 Carve your own toy', skill: { carpentry: 1 }, stat: { happiness: 2 }, log: 'You whittled a horse out of a stick of wood. It looked like a dog.' },
    ] },
    { id: 'ch.crystal', title: 'The Crystal Set', when: { age: [9, 15], year: [1922, 1940] }, text: 'You\'ve built a crystal radio set from a kit and a cat\'s whisker of wire.', options: [
      { id: 'listen', label: '📻 Listen late into the night', skill: { electrical: 2 }, stat: { smarts: 2 }, log: 'Through the hiss you heard a dance band hundreds of miles away.' },
    ] },
    { id: 'ch.comics', title: 'The Comics', when: { age: [7, 14], year: [1935, null] }, text: 'Everyone at school is swapping comics.', options: [
      { id: 'collect', label: '🦸 Start a collection', stat: { happiness: 4 }, log: 'You kept them in a box under the bed, in order.' },
      { id: 'draw', label: '✏️ Draw your own', skill: { design: 2 }, stat: { happiness: 3 }, log: 'You drew your own heroes, and sold copies to friends.' },
    ] },
    { id: 'ch.television', title: 'The Television', when: { age: [5, 14], year: [1950, 1975] }, text: 'A neighbour has a television set, and half the street\'s children crowd into their front room.', options: [
      { id: 'watch', label: '📺 Squeeze in and watch', stat: { happiness: 5 }, log: 'You sat cross-legged on the rug, as close as you were allowed.' },
      { id: 'out', label: '🌳 Play outside instead', stat: { fitness: 2 }, log: 'You had the street to yourself.' },
    ] },
    { id: 'ch.console', title: 'The Games Console', when: { age: [7, 15], year: [1985, null] }, text: 'Everyone at school has the new games console, and you want one more than anything.', options: [
      { id: 'beg', label: '🎮 Beg for it', check: { chance: 0.5 }, pass: { stat: { happiness: 7 }, log: 'It was under the tree. You didn\'t go outside for a month.' }, fail: { stat: { happiness: -3 }, log: 'You were told to wait for your birthday. You waited.' } },
      { id: 'friend', label: '🏠 Play at a friend\'s', stat: { happiness: 3 }, log: 'You played at your friend\'s house, and were awful at it.' },
    ] },
    { id: 'ch.phone', title: 'Your First Phone', when: { age: [10, 14], year: [2008, null] }, text: 'You\'re the last in your class without a phone, apparently.', options: [
      { id: 'get', label: '📱 Get one', stat: { happiness: 5, stress: 2 }, log: 'You got the phone. Your parents set rules. You found ways round them.' },
      { id: 'wait', label: '⏳ Wait a year', stat: { happiness: -2, smarts: 1 }, log: 'You waited. You read more books than anyone in your class.' },
    ] },

    /* Childhood at work: before 1900 most children worked */
    { id: 'ch.mill', title: 'To the Mill', when: { age: [9, 12], year: OLD, test: poor }, text: 'The family needs another wage, and the mill takes children your age.', options: [
      { id: 'mill', label: '🏭 Go to the mill', earn: [20, 40], source: 'Mill wages', stat: { health: -4, smarts: -1 }, log: 'You went to the mill: twelve hours, the noise, the fluff in your lungs. Your wages went to your mother.' },
      { id: 'school', label: '📚 Stay at school a while longer', stat: { smarts: 2, stress: 2 }, log: 'Your parents scraped by so you could stay at school another year.' },
    ] },
    { id: 'ch.farmChores', title: 'Harvest', when: { age: [7, 13], year: EARLY }, text: 'It\'s harvest time, and every pair of hands is needed in the fields.', options: [
      { id: 'work', label: '🌾 Work the harvest', skill: { gardening: 2 }, stat: { fitness: 2, smarts: -1 }, log: 'You missed school for a month, binding sheaves and carrying water.' },
      { id: 'glean', label: '🧺 Glean after the reapers', earn: 5, source: 'Gleaning', stat: { happiness: 1 }, log: 'You gleaned the stubble with the other children, and the bread that winter was partly yours.' },
    ] },
    { id: 'ch.errand', title: 'Errand Boy, Errand Girl', when: { age: [10, 13], year: EARLY }, text: 'The shopkeeper needs someone to run errands after school.', options: [
      { id: 'yes', label: '🧺 Take it', earn: [10, 25], source: 'Errands', stat: { fitness: 1 }, log: 'You ran errands all over town, and knew every street by the end of it.' },
      { id: 'no', label: '🙅 Not for you', log: 'You played instead. The money went to another child.' },
    ] },
    { id: 'ch.chimney', title: 'The Sweep Wants a Boy', when: { age: [6, 10], year: [null, 1875], test: (s) => poor(s) && s.character.gender === 'male' }, text: 'The master sweep wants a small boy to climb chimneys, and has offered your parents money.', options: [
      { id: 'no', label: '🙏 Beg your parents to say no', check: { chance: 0.6 }, pass: { relation: { parents: 4 }, log: 'Your mother said no. You never forgot it.' }, fail: { stat: { health: -8, happiness: -6 }, earn: 15, source: 'Sold to the sweep', log: 'You climbed chimneys in the dark with burned knees, for two years.' } },
    ] },
    { id: 'ch.leaveSchool', title: 'Leaving School', when: { age: [12, 14], year: [null, 1918] }, text: 'You\'re old enough to leave school now. Most of your friends already have.', options: [
      { id: 'work', label: '🧰 Leave and start work', earn: [30, 60], source: 'First wages', stat: { happiness: 2 }, log: 'You left school and brought home your first wage packet. Your mother put it in the tin.' },
      { id: 'stay', label: '📚 Stay on, if they\'ll let you', check: { stat: 'smarts', difficulty: 55 }, pass: { stat: { smarts: 4 }, log: 'The teacher talked your parents into letting you stay on. It changed things.' }, fail: { log: 'There wasn\'t the money. You started work the next month.' } },
    ] },

    /* ---------------- 13–17 ---------------- */
    { id: 'ch.apprentice', title: 'An Apprenticeship', when: { age: [13, 15], year: [null, 1960] }, text: 'A master craftsman will take you on as an apprentice for seven years: bed and board, and a trade at the end.', options: [
      { id: 'yes', label: '🔨 Be bound apprentice', skill: { carpentry: 3, mechanics: 2 }, stat: { smarts: 1 }, log: 'You signed your indentures and learned a trade, one cuff round the ear at a time.' },
      { id: 'no', label: '🙅 Find your own way', log: 'You turned it down. Your father thought you were a fool.' },
    ] },
    { id: 'ch.firstCrush', title: 'A Crush', when: { age: [12, 16] }, text: 'You can\'t stop thinking about someone in your class.', options: [
      { id: 'note', label: '💌 Pass them a note', check: { stat: 'looks', difficulty: 50 }, pass: { stat: { happiness: 7 }, log: 'They wrote back. You kept the note for years.' }, fail: { stat: { happiness: -5 }, log: 'The note was read aloud to the whole class. You wanted the floor to swallow you.' } },
      { id: 'secret', label: '🤐 Keep it to yourself', log: 'You never said a word. They never knew.' },
    ] },
    { id: 'ch.diary', title: 'The Diary', when: { age: [11, 16] }, text: 'You\'ve started keeping a diary.', options: [
      { id: 'write', label: '✍️ Write in it every night', skill: { writing: 3 }, stat: { stress: -3 }, log: 'You filled three notebooks with everything you couldn\'t say out loud.' },
      { id: 'lock', label: '🔒 Hide it from your siblings', check: { chance: 0.6 }, pass: { log: 'Nobody ever found it.' }, fail: { relation: { siblings: -4 }, log: 'Your sibling found it and read it. War.' } },
    ] },
    { id: 'ch.teenJob', title: 'A Saturday Job', when: { age: [14, 17], year: [1919, null] }, text: 'There\'s a Saturday job going at the shop on the corner.', options: [
      { id: 'take', label: '🛒 Take it', earn: [200, 600], source: 'Saturday job', skill: { sales: 2 }, log: 'You earned your own money for the first time, and spent most of it.' },
      { id: 'no', label: '😴 Saturdays are for sleeping', log: 'You kept your Saturdays.' },
    ] },
    { id: 'ch.runAway', title: 'Running Away', when: { age: [12, 16] }, text: 'After a row at home, you\'ve packed a bag.', options: [
      { id: 'go', label: '🎒 Go', check: { chance: 0.7 }, pass: { relation: { parents: 2 }, stat: { stress: 3 }, log: 'You got as far as the next town before it got dark. Your father fetched you home, and didn\'t say a word.' }, fail: { stat: { health: -3, stress: 6 }, log: 'You slept rough for two nights before you came home. Things were different after.' } },
      { id: 'stay', label: '🛏️ Unpack and sulk', log: 'You unpacked and sulked. By morning it was forgotten.' },
    ] },
    { id: 'ch.dare', title: 'The Dare', when: { age: [12, 16] }, text: 'Your friends dare you to jump from the railway bridge into the river.', options: [
      { id: 'jump', label: '🌊 Jump', check: { stat: 'fitness', difficulty: 45 }, pass: { stat: { happiness: 6 }, log: 'You jumped. You were a legend for a summer.' }, fail: { stat: { health: -8 }, log: 'You hit the water wrong and cracked a rib.' } },
      { id: 'no', label: '🙅 Walk away', stat: { happiness: -1 }, log: 'You walked away. One of the others broke an arm.' },
    ] },
    { id: 'ch.smoking', title: 'Behind the Bike Sheds', when: { age: [13, 16], year: [1890, null] }, text: 'Some older children are passing round a cigarette.', options: [
      { id: 'try', label: '🚬 Try it', stat: { health: -1 }, log: 'You coughed until your eyes watered and pretended you liked it.' },
      { id: 'no', label: '🙅 No thanks', log: 'You said no. Nobody cared as much as you thought they would.' },
    ] },
    { id: 'ch.exam', title: 'The Big Exam', when: { age: [11, 11], year: [1944, 1975], country: ['GB'] }, text: 'It\'s the eleven-plus: pass, and you go to the grammar school.', options: [
      { id: 'revise', label: '📖 Revise every evening', check: { stat: 'smarts', difficulty: 55 }, pass: { stat: { happiness: 6, smarts: 2 }, log: 'You passed the eleven-plus. A grammar-school blazer, and a different future.' }, fail: { stat: { happiness: -4 }, log: 'You failed the eleven-plus, and went to the secondary modern with most of your friends.' } },
    ] },
    { id: 'ch.scouts', title: 'The Scouts', when: { age: [10, 15], year: [1908, null] }, text: 'A troop of Scouts (or Guides) meets in the church hall on Tuesdays.', options: [
      { id: 'join', label: '⛺ Join up', skill: { survival: 3, firstAid: 2 }, stat: { fitness: 2, happiness: 3 }, log: 'You learned knots, fires and first aid, and camped in the rain.' },
      { id: 'no', label: '🙅 Not your thing', log: 'You gave it a miss.' },
    ] },
    { id: 'ch.music', title: 'Music Lessons', when: { age: [7, 14] }, text: 'There\'s a battered old instrument in the house, and someone could teach you to play it.', options: [
      { id: 'learn', label: '🎻 Learn to play', skill: { music: 4 }, stat: { happiness: 2 }, log: 'You practised scales until the family begged for mercy, and then you could play.' },
      { id: 'no', label: '🙉 No thanks', log: 'It stayed in the cupboard.' },
    ] },
    { id: 'ch.parentsRow', title: 'Raised Voices', when: { age: [8, 16], test: hasSibling }, text: 'Your parents have been rowing at night. You can hear it through the wall.', options: [
      { id: 'sibling', label: '🫂 Look after the little ones', relation: { siblings: 5 }, stat: { stress: 4 }, log: 'You sat with your brothers and sisters until they fell asleep.' },
      { id: 'pillow', label: '🛏️ Pillow over your head', stat: { stress: 5 }, log: 'You put the pillow over your head. In the morning everyone pretended.' },
    ] },
    { id: 'ch.grandparent', title: 'Grandmother', when: { age: [6, 14] }, text: 'Your grandmother is staying with the family for the summer.', options: [
      { id: 'listen', label: '👵 Sit with her and listen', stat: { smarts: 2, happiness: 3 }, skill: { cooking: 2 }, log: 'She taught you to cook the family recipes and told you who everyone in the photographs was.' },
      { id: 'avoid', label: '🏃 Stay out of her way', log: 'You kept out of her way. Years later, you wished you hadn\'t.' },
    ] },
  ],
};
