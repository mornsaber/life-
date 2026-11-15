/**
 * Pack: later life. Grandchildren; retirement by era (before a state pension you work until you
 * can't, and then your children keep you); living with your children (before 1950) or a care
 * home (after); widowhood and its customs; friends of your generation going; reunions, memoirs,
 * old quarrels over money and the will; memory going; last wishes. Written in the rule language
 * (../Rules.js).
 */
import { livingChildren } from '../../people/People.js';
import { statuteIn } from '../../politics/StatuteBook.js';

const grandkids = (s) => livingChildren(s).some((c) => (c.kids?.length ?? 0) > 0);
const widowed = (s) => (s.people?.list ?? []).some((p) => (p.relation === 'spouse' || p.relation === 'partner') && p.alive === false);
const pension = (s) => statuteIn(s, 'statePension');
const female = (s) => s.character.gender === 'female';

export default {
  id: 'life-later',
  version: 1,
  events: [
    /* ---------------- Grandchildren ---------------- */
    { id: 'old.grandStory', title: 'Tell Us a Story', when: { age: [55, null], test: grandkids }, text: 'Your grandchildren want a story about when you were young.', options: [
      { id: 'true', label: '📖 Tell them a true one', stat: { happiness: 5 }, relation: { kids: 2 }, log: 'You told them about the year you were their age. They didn\'t believe half of it, and the half they didn\'t believe was true.' },
      { id: 'tall', label: '🐉 Make one up', stat: { happiness: 4 }, skill: { writing: 1 }, log: 'You told them a tale with a dragon in it. They asked for it every visit after that.' },
    ] },
    { id: 'old.grandSpoil', title: 'Spoiling Them', when: { age: [55, null], test: grandkids }, text: 'Your grandchild wants something their parents have said no to.', options: [
      { id: 'yes', label: '🍭 Grandparents\' rules', stat: { happiness: 4 }, relation: { kids: -2 }, log: 'You said yes. Your child gave you a look you remembered giving your own mother.' },
      { id: 'no', label: '🤝 Back up their parents', relation: { kids: 4 }, log: 'You backed up their parents. They noticed, and were grateful.' },
    ] },
    { id: 'old.grandSkill', title: 'Teach Them Something', when: { age: [58, null], test: grandkids }, text: 'Your grandchild is staying for the week.', options: [
      { id: 'cook', label: '🍳 Teach them the family recipe', skill: { cooking: 1 }, stat: { happiness: 5 }, log: 'You taught them the recipe your own grandmother taught you. They wrote it down wrong. It doesn\'t matter.' },
      { id: 'garden', label: '🌱 Plant something together', skill: { gardening: 2 }, stat: { happiness: 4, fitness: 1 }, log: 'You planted a tree together. It will outlive you, and that\'s the point.' },
      { id: 'cards', label: '🃏 Teach them cards', stat: { happiness: 4 }, log: 'You taught them to play cards, and to cheat, and to know when someone else is cheating.' },
    ] },
    { id: 'old.grandWedding', title: 'A Grandchild\'s Wedding', when: { age: [68, null], test: grandkids }, text: 'Your eldest grandchild is getting married, and wants you there.', options: [
      { id: 'go', label: '💒 Go, whatever it takes', bill: 300, reason: 'Wedding travel', stat: { happiness: 9, health: -2 }, log: 'You danced at your grandchild\'s wedding. Everyone said you were the life of it.' },
      { id: 'letter', label: '✉️ Send a letter to be read out', stat: { happiness: 3 }, log: 'You couldn\'t manage the journey. Your letter was read at the dinner, and people cried.' },
    ] },

    /* ---------------- Work and money in old age ---------------- */
    { id: 'old.noPension', title: 'Too Old to Work?', when: { age: [62, 80], job: true, test: (s) => !pension(s) }, text: 'Your back is going and your hands aren\'t what they were, but there is no pension to stop for.', options: [
      { id: 'on', label: '💪 Keep going', stat: { health: -4, stress: 3 }, log: 'You kept working. There was nothing else for it.' },
      { id: 'kids', label: '🏠 Ask your children to keep you', relation: { kids: -2 }, stat: { happiness: -2, health: 3 }, log: 'You stopped work and your children took you in. It was what was done.' },
    ] },
    { id: 'old.pensionDay', title: 'Pension Day', when: { age: [65, 75], job: false, test: pension }, text: 'Your first pension payment has arrived.', options: [
      { id: 'treat', label: '🍰 Treat yourself', stat: { happiness: 4 }, log: 'You bought yourself a cake and ate it all. You\'d earned it.' },
      { id: 'save', label: '🫙 Put it by for a rainy day', log: 'You put it by. Old habits.' },
    ] },
    { id: 'old.scam', title: 'A Kind Stranger', when: { age: [70, null], year: [1990, null] }, text: 'A very polite caller says your bank account has been compromised and needs your details to protect it.', options: [
      { id: 'hang', label: '📵 Hang up', stat: { happiness: 1 }, log: 'You hung up. Your grandson had warned you about exactly this.' },
      { id: 'give', label: '🔢 Give the details', check: { chance: 0.2 }, pass: { log: 'Something felt wrong and you rang the bank yourself. Just in time.' }, fail: { bill: 2000, reason: 'Fraud', stat: { happiness: -10 }, log: 'They emptied your savings account by teatime. You were too ashamed to tell anyone for a week.' } },
    ] },
    { id: 'old.willFight', title: 'Who Gets What', when: { age: [70, null], kids: true }, text: 'Your children have started asking, a little too often, what will happen to the house.', options: [
      { id: 'even', label: '⚖️ Split it evenly and say so', relation: { kids: 3 }, log: 'You told them it would be split evenly, and that was the end of it. Mostly.' },
      { id: 'favour', label: '🏠 Leave the house to whoever looks after you', relation: { kids: -4 }, stat: { happiness: 2 }, log: 'You said the house would go to whoever looked after you. Suddenly they all visited more.' },
      { id: 'spend', label: '🛳️ Say you\'re spending it all', stat: { happiness: 5 }, relation: { kids: -2 }, log: 'You told them you were spending it on cruises. Two of them laughed.' },
    ] },

    /* ---------------- Where you live ---------------- */
    { id: 'old.moveIn', title: 'Living With the Children', when: { age: [70, null], kids: true, year: [null, 1950] }, text: 'You can\'t manage alone any more. Your eldest has a room for you.', options: [
      { id: 'yes', label: '🏠 Move in with them', stat: { happiness: 2, health: 3 }, relation: { kids: 2 }, log: 'You moved into the back bedroom. You minded the children and gave advice nobody asked for.' },
      { id: 'no', label: '🚪 Stay in your own home', stat: { happiness: 3, health: -4 }, log: 'You stayed in your own home, as stubborn as ever.' },
    ] },
    { id: 'old.careHome', title: 'A Care Home?', when: { age: [78, null], year: [1950, null] }, text: 'After your fall, the doctor and your family think you might be safer in a care home.', options: [
      { id: 'go', label: '🏥 Go and look at one', stat: { happiness: -3, health: 4 }, log: 'It was cleaner and kinder than you expected, and the food was better than yours.' },
      { id: 'home', label: '🏠 Stay at home with help', bill: 1500, reason: 'Home help', stat: { happiness: 3 }, log: 'You stayed at home with a carer coming in twice a day.' },
    ] },
    { id: 'old.almshouse', title: 'The Almshouse', when: { age: [65, null], year: [null, 1945], cash: [null, 200] }, text: 'There\'s a place going in the parish almshouses: a room of your own, coal in winter, and a gown to wear on Sundays.', options: [
      { id: 'yes', label: '🏘️ Take it', stat: { happiness: 3, health: 3 }, log: 'You moved into the almshouse with the other old folk, and outlived most of them.' },
      { id: 'no', label: '😤 Not charity', stat: { health: -3 }, log: 'You said you didn\'t need charity. You managed, just.' },
    ] },

    /* ---------------- Widowhood ---------------- */
    { id: 'old.widowMourning', title: 'Mourning', when: { age: [40, null], year: [null, 1920], test: (s) => widowed(s) && female(s) }, text: 'Custom says a widow wears black for two years, and doesn\'t go out in society.', options: [
      { id: 'keep', label: '🖤 Keep full mourning', stat: { happiness: -3 }, log: 'You wore black crape for a year and grey for another. People nodded to you in the street.' },
      { id: 'break', label: '🌸 Put off black early', stat: { happiness: 3 }, log: 'You put off black after six months. The neighbours had a great deal to say.' },
    ] },
    { id: 'old.widowAlone', title: 'The Empty Chair', when: { age: [55, null], test: widowed }, text: 'It\'s been a year. You still set two cups out some mornings.', options: [
      { id: 'club', label: '🫖 Join something', stat: { happiness: 5, stress: -3 }, log: 'You joined a club for people on their own. You went for the tea and stayed for the people.' },
      { id: 'kids', label: '👨‍👩‍👧 Lean on the family', relation: { kids: 4 }, stat: { happiness: 3 }, log: 'You let your family look after you for a while. It did you all good.' },
      { id: 'alone', label: '🪑 Keep your own company', stat: { happiness: -3 }, log: 'You kept your own company. Some days were harder than others.' },
    ] },
    { id: 'old.newLove', title: 'Late Love', when: { age: [62, null], partner: false, test: widowed }, text: 'Someone at the club has been saving you a seat.', options: [
      { id: 'yes', label: '💕 Let them', stat: { happiness: 8 }, relation: { kids: -1 }, log: 'You started walking out together. Your children were embarrassed. You didn\'t care.' },
      { id: 'no', label: '🙅 Not at your age', log: 'You said you were too old for all that. You weren\'t.' },
    ] },

    /* ---------------- Memory, friends, reunions ---------------- */
    { id: 'old.forgetful', title: 'Where Did I Put…', when: { age: [72, null] }, text: 'You found your glasses in the bread bin, and you can\'t remember putting them there.', options: [
      { id: 'doctor', label: '🩺 See the doctor', checkup: true, log: 'The doctor asked you to draw a clock. You drew a very good clock.' },
      { id: 'laugh', label: '😄 Laugh it off', stat: { happiness: 1 }, log: 'You laughed it off. It\'s your age, you said.' },
      { id: 'puzzles', label: '🧩 Crosswords every morning', stat: { smarts: 2 }, log: 'You started doing the crossword every morning, in ink.' },
    ] },
    { id: 'old.lastOfFriends', title: 'The Last of Them', when: { age: [80, null] }, text: 'You went through your address book and crossed out another name. There are very few left from school.', options: [
      { id: 'write', label: '✉️ Write to the ones still here', stat: { happiness: 4 }, skill: { writing: 1 }, log: 'You wrote to the three still living. Two wrote back. The third\'s daughter answered.' },
      { id: 'young', label: '🧑 Make younger friends', stat: { happiness: 5 }, log: 'You decided to make friends with people who\'d outlast you. It worked.' },
    ] },
    { id: 'old.reunion', title: 'The Reunion', when: { age: [50, 80], year: [1900, null] }, text: 'There\'s a reunion of your old school year.', options: [
      { id: 'go', label: '🥂 Go', check: { chance: 0.7 }, pass: { stat: { happiness: 6 }, log: 'Everyone had grown old except you. You laughed until you ached.' }, fail: { stat: { happiness: -2 }, log: 'The school bully was now a bishop. You left early.' } },
      { id: 'no', label: '🙅 Remember them as they were', log: 'You stayed home and remembered them as they were.' },
    ] },
    { id: 'old.memoir', title: 'Writing It Down', when: { age: [65, null], stat: { smarts: [40, null] } }, text: 'Your family keeps saying someone should write down your stories.', options: [
      { id: 'write', label: '✍️ Write your memoirs', skill: { writing: 4 }, stat: { happiness: 6 }, log: 'You filled four notebooks. Your grandchildren will read them one day, and understand you better than they ever did.' },
      { id: 'tell', label: '🗣️ Tell them, and let someone else write', stat: { happiness: 4 }, relation: { kids: 2 }, log: 'You talked for three afternoons while your granddaughter wrote it all down.' },
    ] },
    { id: 'old.photos', title: 'The Box of Photographs', when: { age: [65, null], year: [1880, null] }, text: 'You found a box of old photographs in the attic. Half the faces you can\'t name.', options: [
      { id: 'label', label: '🖊️ Write names on the back', stat: { happiness: 3 }, relation: { kids: 2 }, log: 'You wrote names and dates on the back of every one you could. Your family will thank you.' },
      { id: 'cry', label: '😢 Sit with them a while', stat: { happiness: -1, stress: -3 }, log: 'You sat in the attic with them until it got dark.' },
    ] },
    { id: 'old.lastWish', title: 'Last Wishes', when: { age: [75, null] }, text: 'Your family want to know what you\'d like, at the end.', options: [
      { id: 'home', label: '🏡 To be at home', stat: { stress: -4 }, relation: { kids: 3 }, log: 'You said you wanted to be at home, with the window open. They promised.' },
      { id: 'party', label: '🎉 A party, not a wake', stat: { happiness: 4 }, log: 'You told them you wanted a party: music, the good whisky, and no long faces.' },
      { id: 'place', label: '⛰️ To be scattered somewhere that matters', stat: { happiness: 3 }, log: 'You named the place: the hill you climbed the summer you were nineteen.' },
    ] },
    { id: 'old.birthdayLetter', title: 'Ninety', when: { age: [90, 99] }, text: 'You\'re ninety. The family have hired a hall.', options: [
      { id: 'speech', label: '🎤 Make a speech', skill: { publicSpeaking: 2 }, stat: { happiness: 8 }, log: 'You made a speech. It went on a bit. Nobody minded.' },
      { id: 'quiet', label: '🫖 Just tea with the family', stat: { happiness: 6 }, log: 'You had tea with the family and fell asleep in your chair, very content.' },
    ] },
    { id: 'old.hundred', title: 'A Hundred', when: { age: [100, null] }, text: 'You\'re a hundred years old. There\'s a card from the head of state.', options: [
      { id: 'secret', label: '🤫 Share the secret of a long life', stat: { happiness: 8 }, log: ['You told the local paper the secret was a nip of whisky every night and never marrying a fool.', 'You told the local paper the secret was hard work, good soup, and outliving your enemies.'] },
    ] },
    { id: 'old.hobby', title: 'Something New', when: { age: [65, null], job: false }, text: 'You\'ve always wanted to learn something, and now there\'s time.', options: [
      { id: 'paint', label: '🎨 Painting', skill: { design: 3 }, stat: { happiness: 5 }, log: 'You took up painting. Mostly the view from your window, in every season.' },
      { id: 'lang', label: '🌐 A language', skill: { languages: 3 }, stat: { smarts: 2 }, log: 'You started learning a language. You can order a coffee, and argue about the bill.' },
      { id: 'walk', label: '🥾 Long walks', stat: { fitness: 3, health: 2 }, log: 'You walked every morning, and knew every bird in the hedges.' },
    ] },
    { id: 'old.wartime', title: 'Remembrance', when: { age: [60, null], test: (s) => Boolean(s.military?.history?.length || s.military?.service) }, text: 'It\'s the anniversary of the war you served in. There\'s a parade.', options: [
      { id: 'march', label: '🎖️ March with your old comrades', stat: { happiness: 4, stress: -2 }, log: 'You marched with what was left of your old unit, a little slower than last year.' },
      { id: 'home', label: '🏠 Stay home and remember', stat: { happiness: -1 }, log: 'You stayed home, and thought about the ones who didn\'t come back.' },
    ] },
  ],
};
