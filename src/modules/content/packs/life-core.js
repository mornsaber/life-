/**
 * Pack: everyday life events — childhood, campus, adult life. Written in the rule language
 * (content/Rules.js); a few options keep a `run` for logic the rules don't cover.
 */
import { JUSTICE } from '../../world/CountryLaw.js';

const onCampus = (s) => Boolean(s.education.enrolled && s.campus && ['state', 'private', 'elite', 'academy'].includes(s.education.enrolled.schoolId));
const juryCountry = (s) => ['jury', undefined].includes(JUSTICE[s.character.countryId]?.trial);

export default {
  id: 'life-core',
  version: 1,
  events: [
    /* ---------------- Childhood ---------------- */
    { id: 'bully', title: 'The Bully', when: { age: [7, 15] }, text: ['An older kid has been taking your lunch money all week.', 'A bigger kid has been shoving you into lockers every morning.'], options: [
      { id: 'tell', label: '🧑‍🏫 Tell a teacher', stat: { happiness: 2 }, log: 'The teacher handled it. The bully found someone else.' },
      { id: 'fight', label: '👊 Fight back', check: { stat: 'fitness', difficulty: 50 }, pass: { stat: { happiness: 6, fitness: 1 }, log: 'You won. Nobody bothered you again.' }, fail: { stat: { happiness: -4, health: -3 }, log: 'You lost, badly. A black eye and a week of whispers.' } },
      { id: 'avoid', label: '🚶 Take a different way home', stat: { happiness: -2, stress: 3 }, log: 'You avoided him for the rest of the year.' },
    ] },
    { id: 'wallet', title: 'Found Wallet', when: { age: [8, 17] }, text: 'You found a wallet on the sidewalk with $80 inside and an ID.', options: [
      { id: 'return', label: '📬 Return it', check: { chance: 0.5 }, pass: { cash: 20, log: 'The owner gave you $20 as a thank-you.' }, fail: { stat: { happiness: 3 }, log: 'The owner nearly cried. It felt good.' } },
      { id: 'keep', label: '💰 Keep the cash', cash: 80, stat: { happiness: -1 }, log: 'You kept the $80.' },
    ] },
    { id: 'testCheat', title: 'Answer Key', when: { age: [10, 17] }, text: 'Someone is passing around the answers to tomorrow\'s math test.', options: [
      { id: 'study', label: '📚 Study for real', stat: { smarts: 2, stress: 2 }, log: 'You earned your B+.' },
      { id: 'peek', label: '👀 Take a look', check: { chance: 0.75 }, pass: { log: 'You aced it. It felt hollow.' }, fail: { stat: { happiness: -6 }, log: 'You got caught. Zero on the test and a call home.' } },
    ] },
    { id: 'vape', title: 'Peer Pressure', when: { age: [13, 17] }, text: 'Your friends are vaping behind the gym and hand one to you.', options: [
      { id: 'no', label: '🙅 Pass', stat: { happiness: -1 }, log: 'They called you lame for a day, then forgot.' },
      { id: 'try', label: '💨 Try it', check: { chance: 0.8 }, pass: { stat: { happiness: 2, health: -2 }, log: 'It made you cough. You didn\'t get the appeal.' }, fail: { stat: { happiness: 2, health: -2 }, log: 'You got suspended for a day.' } },
    ] },
    { id: 'lemonade', title: 'Lemonade Stand', when: { age: [6, 11] }, text: 'It\'s the hottest day of summer.', options: [
      { id: 'sell', label: '🍋 Set up a stand', cash: [15, 60], stat: { happiness: 3 }, log: 'Your lemonade stand did a roaring trade.' },
      { id: 'pool', label: '🏊 Go to the pool instead', stat: { fitness: 2, happiness: 3 }, log: 'Best day of the summer.' },
    ] },
    { id: 'stray', title: 'A Stray Dog', when: { age: [6, 17] }, text: 'A skinny dog followed you home from school.', options: [
      { id: 'keep', label: '🐕 Beg to keep him', stat: { happiness: 8 }, log: ['Your parents caved. You named him Biscuit.', 'Your parents caved. You named him Pepper.'] },
      { id: 'shelter', label: '🏠 Take him to the shelter', stat: { happiness: 2 }, log: 'A family adopted him a week later.' },
    ] },
    { id: 'window', title: 'Broken Window', when: { age: [7, 14] }, text: 'Your ball went straight through the neighbour\'s window.', options: [
      { id: 'confess', label: '🙋 Knock on the door and confess', stat: { happiness: 1 }, log: 'She let you mow her lawn to pay it off. You became friends.' },
      { id: 'run', label: '🏃 Run', check: { chance: 0.5 }, pass: { log: 'Nobody saw. You felt guilty for weeks.' }, fail: { stat: { happiness: -4 }, relation: { parents: -3 }, log: 'She saw you. Your parents were furious.' } },
    ] },
    { id: 'firstJob', title: 'Summer Job', when: { age: [15, 17] }, text: 'The ice cream shop is hiring for summer.', options: [
      { id: 'work', label: '🍦 Take the job', earn: 2400, source: 'Summer job', stat: { happiness: 2 }, skill: { sales: 4 }, log: 'You earned $2,400 and ate too much ice cream.' },
      { id: 'camp', label: '🏕️ Go to summer camp', stat: { happiness: 6, fitness: 2 }, skill: { survival: 4 }, log: 'You made friends for life.' },
    ] },
    { id: 'talent', title: 'Talent Show', when: { age: [8, 17] }, text: 'Sign-ups for the school talent show close today.', options: [
      { id: 'perform', label: '🎤 Perform', check: { stat: 'looks', difficulty: 70 }, pass: { stat: { happiness: 8, looks: 2 }, skill: { publicSpeaking: 5 }, log: 'You brought the house down.' }, fail: { stat: { happiness: -4 }, skill: { publicSpeaking: 2 }, log: 'You froze on stage. It became a family story.' } },
      { id: 'watch', label: '👀 Watch from the audience', log: 'You cheered for your friends.' },
    ] },

    /* ---------------- Campus ---------------- */
    { id: 'roommate', title: 'Roommate Trouble', when: { age: [17, 30], test: onCampus }, text: 'Your roommate has a partner over every night and leaves dishes everywhere.', options: [
      { id: 'talk', label: '🗣️ Have the awkward conversation', stat: { stress: -3 }, skill: { negotiation: 3 }, log: 'You wrote a roommate agreement. It mostly worked.' },
      { id: 'ra', label: '📋 Go to the RA', stat: { stress: -1, happiness: -1 }, log: 'The RA moved you to a single next semester.' },
      { id: 'endure', label: '😩 Endure it', stat: { stress: 6 }, log: 'You studied in the library a lot that year.' },
    ] },
    { id: 'research', title: 'Research Assistant', when: { age: [18, 30], test: onCampus }, text: 'A professor invites you to work in her lab.', options: [
      { id: 'yes', label: '🧪 Join the lab', stat: { smarts: 3, stress: 4 }, skill: { research: 8 }, run: (ctx) => { ctx.state.campus.resume += 3; return ''; }, log: 'Your name went on a paper as fourth author.' },
      { id: 'no', label: '🙅 Focus on classes', log: 'You thanked her and kept your schedule light.' },
    ] },
    { id: 'protest', title: 'Campus Protest', when: { age: [18, 30], test: onCampus }, text: 'Thousands of students are occupying the quad over the university\'s investments.', options: [
      { id: 'join', label: '✊ Join the occupation', stat: { happiness: 4 }, run: (ctx) => { ctx.state.politics.recognition = Math.min(100, ctx.state.politics.recognition + 1); if (ctx.rng.chance(0.15)) { ctx.emit('legal:offense', { offenseId: 'trespass', context: 'campus occupation', caught: true }); return 'Police cleared the quad at 3 a.m. You were cited.'; } return 'The board agreed to review its holdings.'; } },
      { id: 'skip', label: '📚 Keep studying', log: 'You watched it on social media.' },
    ] },
    { id: 'springBreak', title: 'Spring Break', when: { age: [18, 26], test: onCampus }, text: 'Your friends are going to Cancún.', options: [
      { id: 'go', label: '🏖️ Go ($1,200)', run: (ctx) => { if (!ctx.spend(1200, 'Spring break', { credit: true })) return 'Your card was declined at the airport. You watched it all on Instagram.'; ctx.stat('happiness', 8); ctx.stat('stress', -10); return 'Legendary.'; } },
      { id: 'work', label: '💼 Work extra shifts', earn: 800, source: 'Spring break shifts', log: 'You banked $800.' },
    ] },

    /* ---------------- Adult life ---------------- */
    { id: 'lottery', title: 'Lottery Fever', when: { age: [18, 120] }, text: 'The jackpot is $640 million. Everyone at work is buying tickets.', options: [
      { id: 'buy', label: '🎟️ Buy $20 of tickets', run: (ctx) => {
        if (!ctx.spend(20, 'Lottery tickets', { credit: true })) return 'Card declined. Not even for a lottery ticket.';
        const roll = ctx.rng.next();
        if (roll < 0.0004) { ctx.earn(2_500_000, 'Lottery prize (lump sum)'); ctx.stat('happiness', 25); ctx.toast('You won the lottery!', 'good'); return 'You matched five numbers plus the multiplier. $2.5 million, lump sum, before taxes!'; }
        if (roll < 0.006) { ctx.earn(10000, 'Lottery prize'); ctx.stat('happiness', 8); return 'Four numbers! $10,000.'; }
        if (roll < 0.06) { ctx.earn(100, 'Lottery prize'); return 'You won $100. You\'ll take it.'; }
        return 'Not even close.';
      } },
      { id: 'skip', label: '🙄 Keep your $20', log: 'You did the math. Nobody thanked you for it.' },
    ] },
    { id: 'fenderBender', title: 'Sued After a Fender Bender', when: { age: [17, 120] }, text: 'The other driver from a minor parking-lot accident is suing you for "chronic neck pain."', options: [
      { id: 'settle', label: '🤝 Let your insurer settle', spend: 1000, reason: 'Insurance deductible', log: 'Your insurer settled. You paid the $1,000 deductible and your premiums went up.' },
      { id: 'fight', label: '⚖️ Fight it in court ($4,000 legal fees)', spend: 4000, reason: 'Legal fees', check: { chance: 0.65 }, pass: { stat: { happiness: 4 }, log: 'Surveillance showed him moving furniture. Case dismissed.' }, fail: { spend: 15000, reason: 'Civil judgment', stat: { happiness: -6 }, log: 'The court sided with him. $15,000 judgment.' } },
    ] },
    { id: 'slipFall', title: 'Wet Floor', when: { age: [18, 120] }, text: 'You slipped on an unmarked wet floor at a big-box store and hurt your wrist.', options: [
      { id: 'sue', label: '⚖️ Hire a lawyer', check: { chance: 0.55 }, pass: { earn: 18000, source: 'Personal-injury settlement', log: 'The store settled for $18,000 (after your lawyer\'s third).' }, fail: { stat: { stress: 6 }, log: 'Their cameras showed a sign. You got nothing.' } },
      { id: 'let', label: '🤷 Let it go', stat: { health: -2 }, log: 'Your wrist healed in a month.' },
    ] },
    { id: 'viral', title: 'Going Viral', when: { age: [14, 120] }, text: 'A video you posted is suddenly at 8 million views.', options: [
      { id: 'monetize', label: '📈 Lean in: sponsorships and merch', check: { chance: 0.8 }, pass: { earn: [5000, 60000], source: 'Influencer income', stat: { happiness: 6, looks: 2 }, rep: { online: 6 }, log: 'You cashed in before the algorithm moved on.' }, fail: { stat: { happiness: -8, stress: 10 }, rep: { online: -12 }, log: 'An old post resurfaced and the internet turned on you. You deleted your accounts.' } },
      { id: 'ignore', label: '📵 Log off and let it pass', stat: { happiness: 2 }, log: 'Your fifteen minutes passed quietly.' },
    ] },
    { id: 'identity', title: 'Identity Theft', icon: '🕵️', kind: 'bad', when: { age: [18, 120], free: false }, run: { stat: { stress: 8 }, run: (ctx) => { ctx.emit('credit:event', { type: 'late' }); return ''; }, log: 'Someone opened credit cards in your name. It took forty hours of phone calls and a police report to clean up.' } },
    { id: 'carBreakdown', title: 'Transmission Failure', icon: '🔧', kind: 'warn', when: { age: [18, 120] }, run: { spend: [1800, 4500], reason: 'Car repair', stat: { stress: 4 }, log: 'Your transmission died on the highway. The repair bill was brutal.' } },
    { id: 'inheritance', title: 'Distant Relative', icon: '📜', kind: 'good', when: { age: [25, 120], free: false }, run: { run: (ctx) => { const amount = ctx.rng.chance(0.15) ? ctx.rng.int(60000, 250000) : ctx.rng.int(3000, 20000); ctx.state.finances.cash += amount; return `A great-aunt you met twice left you $${amount.toLocaleString()} in her will.`; } } },
    { id: 'burglary', title: 'Break-In', icon: '🚪', kind: 'bad', when: { age: [20, 120] }, run: { spend: [800, 6000], reason: 'Burglary losses', stat: { stress: 6, happiness: -4 }, log: 'Someone broke in while you were at work and took your electronics.' } },
    { id: 'lightning', title: 'Struck by Lightning', icon: '⚡', kind: 'bad', weight: 0.1, when: { age: [10, 120] }, run: { run: (ctx) => { ctx.stat('health', -ctx.rng.int(15, 35)); if (ctx.rng.chance(0.3)) ctx.emit('health:injury', { conditionId: 'tbi', severity: ctx.rng.int(20, 45) }); return 'You were struck by lightning on a golf course. You survived, with a story nobody believes.'; } } },
    { id: 'foodPoisoning', title: 'Bad Sushi', icon: '🍣', kind: 'warn', when: { age: [5, 120], free: false }, run: { stat: { health: -6 }, log: ['Gas-station sushi. You lost three days and five pounds.', 'A dodgy kebab. You lost three days and your dignity.'] } },
    { id: 'jury', title: 'Jury Duty', when: { age: [18, 120], test: juryCountry }, text: 'You were summoned for jury duty on a two-week trial.', options: [
      { id: 'serve', label: '⚖️ Serve', stat: { smarts: 1, stress: 3 }, job: { performance: -2 }, log: 'You served as foreperson. The verdict took two days.' },
      { id: 'excuse', label: '📝 Ask to be excused', check: { chance: 0.5 }, pass: { log: 'The judge excused you.' }, fail: { stat: { stress: 4 }, log: 'Denied. You served anyway.' } },
    ] },
    { id: 'scamCall', title: 'Urgent Call', when: { age: [55, 120] }, text: 'A caller says your grandson is in jail abroad and needs $4,000 in gift cards for bail.', options: [
      { id: 'hang', label: '📵 Hang up and call your family', stat: { happiness: 1 }, log: 'Your grandson was at home playing video games. It was a scam.' },
      { id: 'pay', label: '🎁 Buy the gift cards', spend: 4000, reason: 'Phone scam', stat: { happiness: -8 }, log: 'It was a scam. The money was gone.' },
    ] },
    { id: 'contest', title: 'Contest Win', icon: '🏆', kind: 'good', when: { age: [12, 120], free: false }, run: { earn: [250, 3000], source: 'Contest prize', stat: { happiness: 5 }, log: ['You won a radio call-in contest.', 'You won a photography contest.', 'You won the chili cook-off.', 'You won a pub trivia jackpot.', 'You won a short-story contest.'] } },
    { id: 'celebrity', title: 'Celebrity Sighting', icon: '⭐', when: { age: [12, 120] }, run: { stat: { happiness: 4 }, log: ['You ended up next to a famous actor at a coffee shop. They were nice.', 'A pop star held the door for you. You didn\'t recover all day.', 'You shared a lift with an astronaut. They were shorter than you expected.'] } },
    { id: 'marathon', title: 'Marathon', when: { age: [18, 75], stat: { fitness: [55, 100] } }, text: 'A friend dares you to run the city marathon.', options: [
      { id: 'run', label: '🏃 Train and run it', check: { stat: 'fitness', difficulty: 70 }, pass: { stat: { fitness: 5, happiness: 8 }, skill: { athletics: 6 }, log: 'You finished in 4:12 and cried at the finish line.' }, fail: { stat: { health: -4, happiness: -2 }, skill: { athletics: 3 }, log: 'Mile 19 broke you. You walked it in.' } },
      { id: 'cheer', label: '📣 Cheer from mile 20', stat: { happiness: 2 }, log: 'Your sign said "Run like you stole something."' },
    ] },
    { id: 'stranger', title: 'Stranger in Need', when: { age: [16, 120] }, text: 'A woman\'s car is broken down on the shoulder in the rain, kids in the back.', options: [
      { id: 'help', label: '🛞 Pull over and help', stat: { happiness: 5 }, skill: { mechanics: 2 }, rep: { neighbourhood: 2 }, check: { chance: 0.9 }, pass: { log: 'You changed her tire in the rain. She hugged you.' }, fail: { log: 'Her husband turned out to own a business — he offered you a job lead.' } },
      { id: 'call', label: '📞 Call it in and keep driving', log: 'The police were there in ten minutes.' },
    ] },
    { id: 'dogBite', title: 'Dog Bite', icon: '🐕', kind: 'warn', when: { age: [4, 120] }, run: { stat: { health: -5 }, spend: 400, reason: 'Urgent care', log: 'A neighbour\'s dog bit your calf. Six stitches.' } },
    { id: 'friendLoan', title: 'A Friend Needs Money', when: { age: [22, 120] }, text: 'Your college friend needs $5,000 to cover rent after a layoff.', options: [
      { id: 'lend', label: '🤝 Lend it', run: (ctx) => { if (!ctx.spend(5000, 'Loan to a friend', { credit: true })) return 'You didn\'t have $5,000 to lend, even on credit.'; if (ctx.rng.chance(0.55)) { ctx.state.finances.cash += 5000; return 'They paid you back within a year, with a bottle of something good.'; } ctx.stat('happiness', -4); return 'They never paid it back. The friendship cooled.'; } },
      { id: 'no', label: '🙅 Say no kindly', stat: { happiness: -2 }, log: 'They understood. Mostly.' },
    ] },
  ],
};
