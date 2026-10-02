/**
 * Random life events — the things that happen between the big decisions:
 * childhood dilemmas, campus moments, lottery tickets, lawsuits, accidents,
 * viral fame, windfalls and scams. Pure content: every effect goes through
 * existing systems (money, stats, legal offenses, health injuries, credit).
 *
 * An event either happens (`run`) or asks (`options`, each with `resolve`).
 * Events are picked with pickFresh, so a long life rarely sees repeats.
 */
import { pickFresh, eligible } from '../../core/Pools.js';
import { isIncarcerated } from '../../core/State.js';

const onCampus = (s) => Boolean(s.education.enrolled && s.campus && ['state', 'private', 'elite', 'academy'].includes(s.education.enrolled.schoolId));
const free = (s) => !isIncarcerated(s);
const stats = (ctx, deltas) => Object.entries(deltas).forEach(([k, v]) => ctx.stat(k, v));
const gift = (ctx, amount, text, icon = '💵') => {
  ctx.state.finances.cash += amount;
  ctx.log(text, icon, 'good');
};

export const LIFE_EVENTS = [
  /* ---------------- Childhood ---------------- */
  { id: 'bully', minAge: 7, maxAge: 15, title: 'The Bully', text: 'An older kid has been taking your lunch money all week.', options: [
    { id: 'tell', label: '🧑‍🏫 Tell a teacher', resolve: (ctx) => { stats(ctx, { happiness: 2 }); return 'The teacher handled it. The bully found someone else.'; } },
    { id: 'fight', label: '👊 Fight back', resolve: (ctx) => (ctx.rng.chance(0.5 + (ctx.state.stats.fitness - 50) / 150) ? (stats(ctx, { happiness: 6, fitness: 1 }), 'You won. Nobody bothered you again.') : (stats(ctx, { health: -5, happiness: -4 }), 'You lost, and got a black eye and detention.')) },
    { id: 'avoid', label: '🚶 Take a different way home', resolve: (ctx) => { stats(ctx, { happiness: -2, stress: 3 }); return 'You avoided him for the rest of the year.'; } },
  ] },
  { id: 'wallet', minAge: 8, maxAge: 17, title: 'Found Wallet', text: 'You found a wallet on the sidewalk with $80 inside and an ID.', options: [
    { id: 'return', label: '📬 Return it', resolve: (ctx) => (ctx.rng.chance(0.5) ? (gift(ctx, 20, 'The owner gave you $20 as a thank-you.'), '') : (stats(ctx, { happiness: 3 }), 'The owner nearly cried. It felt good.')) },
    { id: 'keep', label: '💰 Keep the cash', resolve: (ctx) => { gift(ctx, 80, 'You kept the $80.', '😬'); stats(ctx, { happiness: -1 }); return ''; } },
  ] },
  { id: 'testCheat', minAge: 10, maxAge: 17, title: 'Answer Key', text: 'Someone is passing around the answers to tomorrow\'s math test.', options: [
    { id: 'study', label: '📚 Study for real', resolve: (ctx) => { stats(ctx, { smarts: 2, stress: 2 }); return 'You earned your B+.'; } },
    { id: 'peek', label: '👀 Take a look', resolve: (ctx) => (ctx.rng.chance(0.25) ? (stats(ctx, { happiness: -6 }), 'You got caught. Zero on the test and a call home.') : 'You aced it. It felt hollow.') },
  ] },
  { id: 'vape', minAge: 13, maxAge: 17, title: 'Peer Pressure', text: 'Your friends are vaping behind the gym and hand one to you.', options: [
    { id: 'no', label: '🙅 Pass', resolve: (ctx) => { stats(ctx, { happiness: -1 }); return 'They called you lame for a day, then forgot.'; } },
    { id: 'try', label: '💨 Try it', resolve: (ctx) => { stats(ctx, { happiness: 2, health: -2 }); return ctx.rng.chance(0.2) ? 'You got suspended for a day.' : 'It made you cough. You didn\'t get the appeal.'; } },
  ] },
  { id: 'lemonade', minAge: 6, maxAge: 11, title: 'Lemonade Stand', text: 'It\'s the hottest day of summer.', options: [
    { id: 'sell', label: '🍋 Set up a stand', resolve: (ctx) => { const earned = ctx.rng.int(15, 60); gift(ctx, earned, `Your lemonade stand made $${earned}.`, '🍋'); stats(ctx, { happiness: 3 }); return ''; } },
    { id: 'pool', label: '🏊 Go to the pool instead', resolve: (ctx) => { stats(ctx, { fitness: 2, happiness: 3 }); return 'Best day of the summer.'; } },
  ] },
  { id: 'stray', minAge: 6, maxAge: 17, title: 'A Stray Dog', text: 'A skinny dog followed you home from school.', options: [
    { id: 'keep', label: '🐕 Beg to keep him', resolve: (ctx) => { stats(ctx, { happiness: 8 }); return 'Your parents caved. You named him Biscuit.'; } },
    { id: 'shelter', label: '🏠 Take him to the shelter', resolve: (ctx) => { stats(ctx, { happiness: 2 }); return 'A family adopted him a week later.'; } },
  ] },
  { id: 'window', minAge: 7, maxAge: 14, title: 'Broken Window', text: 'Your baseball went straight through the neighbor\'s window.', options: [
    { id: 'confess', label: '🙋 Knock on the door and confess', resolve: (ctx) => { stats(ctx, { happiness: 1 }); return 'She let you mow her lawn to pay it off. You became friends.'; } },
    { id: 'run', label: '🏃 Run', resolve: (ctx) => (ctx.rng.chance(0.5) ? (stats(ctx, { happiness: -4 }), 'She saw you. Your parents were furious.') : 'Nobody saw. You felt guilty for weeks.') },
  ] },
  { id: 'firstJob', minAge: 15, maxAge: 17, title: 'Summer Job', text: 'The ice cream shop is hiring for summer.', options: [
    { id: 'work', label: '🍦 Take the job', resolve: (ctx) => { ctx.earn(2400, 'Summer job', { wage: true }); stats(ctx, { happiness: 2 }); return 'You earned $2,400 and ate too much ice cream.'; } },
    { id: 'camp', label: '🏕️ Go to summer camp', resolve: (ctx) => { stats(ctx, { happiness: 6, fitness: 2 }); return 'You made friends for life.'; } },
  ] },
  { id: 'talent', minAge: 8, maxAge: 17, title: 'Talent Show', text: 'Sign-ups for the school talent show close today.', options: [
    { id: 'perform', label: '🎤 Perform', resolve: (ctx) => (ctx.rng.chance(0.4 + (ctx.state.stats.looks - 50) / 200) ? (stats(ctx, { happiness: 8, looks: 2 }), 'You brought the house down.') : (stats(ctx, { happiness: -4 }), 'You froze on stage. It became a family story.')) },
    { id: 'watch', label: '👀 Watch from the audience', resolve: () => 'You cheered for your friends.' },
  ] },

  /* ---------------- Campus ---------------- */
  { id: 'roommate', minAge: 17, maxAge: 30, when: onCampus, title: 'Roommate Trouble', text: 'Your roommate has a partner over every night and leaves dishes everywhere.', options: [
    { id: 'talk', label: '🗣️ Have the awkward conversation', resolve: (ctx) => { stats(ctx, { stress: -3 }); return 'You wrote a roommate agreement. It mostly worked.'; } },
    { id: 'ra', label: '📋 Go to the RA', resolve: (ctx) => { stats(ctx, { stress: -1, happiness: -1 }); return 'The RA moved you to a single next semester.'; } },
    { id: 'endure', label: '😩 Endure it', resolve: (ctx) => { stats(ctx, { stress: 6 }); return 'You studied in the library a lot that year.'; } },
  ] },
  { id: 'research', minAge: 18, maxAge: 30, when: onCampus, title: 'Research Assistant', text: 'A professor invites you to work in her lab.', options: [
    { id: 'yes', label: '🧪 Join the lab', resolve: (ctx) => { stats(ctx, { smarts: 3, stress: 4 }); ctx.state.campus.resume += 3; return 'Your name went on a paper as fourth author.'; } },
    { id: 'no', label: '🙅 Focus on classes', resolve: () => 'You thanked her and kept your schedule light.' },
  ] },
  { id: 'protest', minAge: 18, maxAge: 30, when: onCampus, title: 'Campus Protest', text: 'Thousands of students are occupying the quad over the university\'s investments.', options: [
    { id: 'join', label: '✊ Join the occupation', resolve: (ctx) => { stats(ctx, { happiness: 4 }); ctx.state.politics.recognition = Math.min(100, ctx.state.politics.recognition + 1); return ctx.rng.chance(0.15) ? (ctx.emit('legal:offense', { offenseId: 'trespass', context: 'campus occupation', caught: true }), 'Police cleared the quad at 3 a.m. You were cited.') : 'The board agreed to review its holdings.'; } },
    { id: 'skip', label: '📚 Keep studying', resolve: () => 'You watched it on social media.' },
  ] },
  { id: 'springBreak', minAge: 18, maxAge: 26, when: onCampus, title: 'Spring Break', text: 'Your friends are going to Cancún.', options: [
    { id: 'go', label: '🏖️ Go ($1,200)', resolve: (ctx) => { if (!ctx.spend(1200, 'Spring break', { credit: true })) return 'Your card was declined at the airport. You watched it all on Instagram.'; stats(ctx, { happiness: 8, stress: -10 }); return 'Legendary.'; } },
    { id: 'work', label: '💼 Work extra shifts', resolve: (ctx) => { ctx.earn(800, 'Spring break shifts', { wage: true }); return 'You banked $800.'; } },
  ] },

  /* ---------------- Adult life ---------------- */
  { id: 'lottery', minAge: 18, when: free, title: 'Lottery Fever', text: 'The jackpot is $640 million. Everyone at work is buying tickets.', options: [
    { id: 'buy', label: '🎟️ Buy $20 of tickets', resolve: (ctx) => {
      if (!ctx.spend(20, 'Lottery tickets', { credit: true })) return 'Card declined. Not even for a lottery ticket.';
      const roll = ctx.rng.next();
      if (roll < 0.0004) { ctx.earn(2_500_000, 'Lottery prize (lump sum)'); stats(ctx, { happiness: 25 }); ctx.toast('You won the lottery!', 'good'); return 'You matched five numbers plus the Powerball multiplier. $2.5 million, lump sum, before taxes!'; }
      if (roll < 0.006) { ctx.earn(10000, 'Lottery prize'); stats(ctx, { happiness: 8 }); return 'Four numbers! $10,000.'; }
      if (roll < 0.06) { ctx.earn(100, 'Lottery prize'); return 'You won $100. You\'ll take it.'; }
      return 'Not even close.';
    } },
    { id: 'skip', label: '🙄 Keep your $20', resolve: () => 'You did the math. Nobody thanked you for it.' },
  ] },
  { id: 'fenderBender', minAge: 17, when: free, title: 'Sued After a Fender Bender', text: 'The other driver from a minor parking-lot accident is suing you for "chronic neck pain."', options: [
    { id: 'settle', label: '🤝 Let your insurer settle', resolve: (ctx) => { ctx.spend(1000, 'Insurance deductible', { allowDebt: true }); return 'Your insurer settled. You paid the $1,000 deductible and your premiums went up.'; } },
    { id: 'fight', label: '⚖️ Fight it in court ($4,000 legal fees)', resolve: (ctx) => { ctx.spend(4000, 'Legal fees', { allowDebt: true }); return ctx.rng.chance(0.65) ? (stats(ctx, { happiness: 4 }), 'Surveillance showed him moving furniture. Case dismissed.') : (ctx.spend(15000, 'Civil judgment', { allowDebt: true }), stats(ctx, { happiness: -6 }), 'The jury sided with him. $15,000 judgment.'); } },
  ] },
  { id: 'slipFall', minAge: 18, when: free, title: 'Wet Floor', text: 'You slipped on an unmarked wet floor at a big-box store and hurt your wrist.', options: [
    { id: 'sue', label: '⚖️ Hire a lawyer', resolve: (ctx) => (ctx.rng.chance(0.55) ? (ctx.earn(18000, 'Personal-injury settlement'), 'The store settled for $18,000 (after your lawyer\'s third).') : (stats(ctx, { stress: 6 }), 'Their cameras showed a sign. You got nothing.')) },
    { id: 'let', label: '🤷 Let it go', resolve: (ctx) => { stats(ctx, { health: -2 }); return 'Your wrist healed in a month.'; } },
  ] },
  { id: 'viral', minAge: 14, when: free, title: 'Going Viral', text: 'A video you posted is suddenly at 8 million views.', options: [
    { id: 'monetize', label: '📈 Lean in: sponsorships and merch', resolve: (ctx) => {
      if (ctx.rng.chance(0.2)) { stats(ctx, { happiness: -8, stress: 10 }); return 'An old post resurfaced and the internet turned on you. You deleted your accounts.'; }
      const earned = ctx.rng.int(5000, 60000); ctx.earn(earned, 'Influencer income'); stats(ctx, { happiness: 6, looks: 2 }); return `You earned $${earned.toLocaleString()} before the algorithm moved on.`;
    } },
    { id: 'ignore', label: '📵 Log off and let it pass', resolve: (ctx) => { stats(ctx, { happiness: 2 }); return 'Your fifteen minutes passed quietly.'; } },
  ] },
  { id: 'identity', minAge: 18, title: 'Identity Theft', text: 'Someone opened three credit cards in your name.', run: (ctx) => { ctx.emit('credit:event', { type: 'late' }); stats(ctx, { stress: 8 }); return ['🕵️', 'Someone opened credit cards in your name. It took forty hours of phone calls and a police report to clean up.', 'bad']; } },
  { id: 'carBreakdown', minAge: 18, when: free, title: 'Transmission Failure', text: 'Your car\'s transmission died on the highway.', run: (ctx) => { const cost = ctx.rng.int(1800, 4500); ctx.spend(cost, 'Car repair', { allowDebt: true }); stats(ctx, { stress: 4 }); return ['🔧', `Your transmission died: $${cost.toLocaleString()} to fix.`, 'warn']; } },
  { id: 'inheritance', minAge: 25, title: 'Distant Relative', text: '', run: (ctx) => { const amount = ctx.rng.chance(0.15) ? ctx.rng.int(60000, 250000) : ctx.rng.int(3000, 20000); ctx.state.finances.cash += amount; return ['📜', `A great-aunt you met twice left you $${amount.toLocaleString()} in her will.`, 'good']; } },
  { id: 'burglary', minAge: 20, when: free, title: 'Break-In', text: '', run: (ctx) => { const lost = ctx.rng.int(800, 6000); ctx.spend(lost, 'Burglary losses', { allowDebt: true }); stats(ctx, { stress: 6, happiness: -4 }); return ['🚪', `Someone broke in while you were at work and took $${lost.toLocaleString()} worth of electronics.`, 'bad']; } },
  { id: 'lightning', minAge: 10, when: free, title: 'Struck by Lightning', text: '', run: (ctx) => { ctx.stat('health', -ctx.rng.int(15, 35)); if (ctx.rng.chance(0.3)) ctx.emit('health:injury', { conditionId: 'tbi', severity: ctx.rng.int(20, 45) }); return ['⚡', 'You were struck by lightning on a golf course. You survived, with a story nobody believes.', 'bad']; } },
  { id: 'foodPoisoning', minAge: 5, title: 'Bad Sushi', text: '', run: (ctx) => { ctx.stat('health', -6); return ['🍣', 'Gas-station sushi. You lost three days and five pounds.', 'warn']; } },
  { id: 'jury', minAge: 18, when: free, title: 'Jury Duty', text: 'You were summoned for jury duty on a two-week trial.', options: [
    { id: 'serve', label: '⚖️ Serve', resolve: (ctx) => { stats(ctx, { smarts: 1, stress: 3 }); if (ctx.state.career.job) ctx.emit('career:adjust', { performance: -2 }); return 'You served as foreperson. The verdict took two days.'; } },
    { id: 'excuse', label: '📝 Ask to be excused', resolve: (ctx) => (ctx.rng.chance(0.5) ? 'The judge excused you.' : (stats(ctx, { stress: 4 }), 'Denied. You served anyway.')) },
  ] },
  { id: 'scamCall', minAge: 55, when: free, title: 'Urgent Call', text: 'A caller says your grandson is in jail in Mexico and needs $4,000 in gift cards for bail.', options: [
    { id: 'hang', label: '📵 Hang up and call your family', resolve: (ctx) => { stats(ctx, { happiness: 1 }); return 'Your grandson was at home playing video games. It was a scam.'; } },
    { id: 'pay', label: '🎁 Buy the gift cards', resolve: (ctx) => { ctx.spend(4000, 'Phone scam', { allowDebt: true }); stats(ctx, { happiness: -8 }); return 'It was a scam. The money was gone.'; } },
  ] },
  { id: 'contest', minAge: 12, title: 'Contest Win', text: '', run: (ctx) => { const prize = ctx.rng.int(250, 3000); ctx.earn(prize, 'Contest prize'); stats(ctx, { happiness: 5 }); return ['🏆', `You won $${prize.toLocaleString()} in a ${ctx.rng.pick(['radio call-in', 'photography', 'chili cook-off', 'trivia', 'short-story'])} contest.`, 'good']; } },
  { id: 'celebrity', minAge: 12, when: free, title: 'Celebrity Sighting', text: '', run: (ctx) => { stats(ctx, { happiness: 4 }); return ['⭐', `You ended up next to a famous ${ctx.rng.pick(['actor', 'quarterback', 'pop star', 'astronaut', 'chef'])} at a coffee shop. They were nice.`, 'info']; } },
  { id: 'marathon', minAge: 18, maxAge: 75, when: (s) => free(s) && s.stats.fitness >= 55, title: 'Marathon', text: 'A friend dares you to run the city marathon.', options: [
    { id: 'run', label: '🏃 Train and run it', resolve: (ctx) => (ctx.rng.chance(0.35 + ctx.state.stats.fitness / 200) ? (stats(ctx, { fitness: 5, happiness: 8 }), 'You finished in 4:12 and cried at the finish line.') : (stats(ctx, { health: -4, happiness: -2 }), 'Mile 19 broke you. You walked it in.')) },
    { id: 'cheer', label: '📣 Cheer from mile 20', resolve: (ctx) => { stats(ctx, { happiness: 2 }); return 'Your sign said "Run like you stole something."'; } },
  ] },
  { id: 'stranger', minAge: 16, when: free, title: 'Stranger in Need', text: 'A woman\'s car is broken down on the shoulder in the rain, kids in the back.', options: [
    { id: 'help', label: '🛞 Pull over and help', resolve: (ctx) => { stats(ctx, { happiness: 5 }); return ctx.rng.chance(0.1) ? 'Her husband turned out to own a business — he offered you a job lead.' : 'You changed her tire in the rain. She hugged you.'; } },
    { id: 'call', label: '📞 Call it in and keep driving', resolve: () => 'Highway patrol was there in ten minutes.' },
  ] },
  { id: 'audit', minAge: 25, when: (s) => (s.finances.lastYear?.gross ?? 0) > 80000, title: 'IRS Audit Letter', text: 'The IRS is auditing last year\'s return.', options: [
    { id: 'cpa', label: '🧮 Hire a CPA ($2,500)', resolve: (ctx) => { ctx.spend(2500, 'CPA fees', { allowDebt: true }); return ctx.state.legal.flags.taxCheatAge ? (ctx.spend(8000, 'Back taxes and penalties', { allowDebt: true }), 'The CPA limited the damage: $8,000 in back taxes and penalties.') : 'No change. Your records were clean.'; } },
    { id: 'self', label: '📂 Handle it yourself', resolve: (ctx) => (ctx.rng.chance(ctx.state.legal.flags.taxCheatAge ? 0.8 : 0.25) ? (ctx.spend(6000, 'Back taxes and penalties', { allowDebt: true }), stats(ctx, { stress: 8 }), 'You missed a deduction rule. $6,000 owed.') : 'You survived the audit.') },
  ] },
  { id: 'reunion', minAge: 28, when: free, title: 'Class Reunion', text: 'Your high school reunion is this weekend.', options: [
    { id: 'go', label: '🎉 Go', resolve: (ctx) => { const job = ctx.state.career.job; stats(ctx, { happiness: job ? 5 : -2 }); return job ? `Everyone asked about your job as ${job.title}.` : 'Everyone asked what you\'re doing now. It was awkward.'; } },
    { id: 'skip', label: '🛋️ Skip it', resolve: () => 'You looked at the photos online.' },
  ] },
  { id: 'dogBite', minAge: 4, when: free, title: 'Dog Bite', text: '', run: (ctx) => { ctx.stat('health', -5); ctx.spend(400, 'Urgent care', { allowDebt: true }); return ['🐕', 'A neighbor\'s dog bit your calf. Six stitches.', 'warn']; } },
  { id: 'friendLoan', minAge: 22, when: free, title: 'A Friend Needs Money', text: 'Your college friend needs $5,000 to cover rent after a layoff.', options: [
    { id: 'lend', label: '🤝 Lend it', resolve: (ctx) => { if (!ctx.spend(5000, 'Loan to a friend', { credit: true })) return 'You didn\'t have $5,000 to lend, even on credit.'; return ctx.rng.chance(0.55) ? (ctx.state.finances.cash += 5000, 'They paid you back within a year, with a bottle of good bourbon.') : (stats(ctx, { happiness: -4 }), 'They never paid it back. The friendship cooled.'); } },
    { id: 'no', label: '🙅 Say no kindly', resolve: (ctx) => { stats(ctx, { happiness: -2 }); return 'They understood. Mostly.'; } },
  ] },
];

/** How often something happens: kids and young adults have eventful years. */
const yearlyChance = (age) => (age < 6 ? 0 : age < 18 ? 0.35 : age < 30 ? 0.4 : age < 65 ? 0.3 : 0.25);

export const LifeEvents = {
  id: 'lifeEvents',
  order: 7,

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    if (!rng.chance(yearlyChance(state.character.age))) return;
    const event = pickFresh(rng, state, 'life', eligible(LIFE_EVENTS, state));
    if (!event) return;
    if (event.run) {
      const [icon, text, kind] = event.run(ctx);
      if (text) ctx.log(text, icon, kind);
      return;
    }
    ctx.prompt({
      type: 'lifeEvents.event',
      icon: '🎲',
      title: event.title,
      text: event.text,
      options: event.options.map((o) => ({ id: o.id, label: o.label })),
      data: { eventId: event.id },
    });
  },

  resolvers: {
    event(ctx, data, optionId) {
      const event = LIFE_EVENTS.find((e) => e.id === data.eventId);
      const option = event?.options.find((o) => o.id === optionId);
      if (!option) return;
      const text = option.resolve(ctx);
      if (text) ctx.log(`${event.title}: ${text}`, '🎲');
    },
  },
};
