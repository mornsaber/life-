/**
 * Life by stage and circumstance: young adulthood, family, neighbours and home, money,
 * health, midlife, retirement and old age — plus follow-ups that come back years after
 * a choice (`plant`). Written in the rule language (../Rules.js).
 */
import { minorChildren, livingChildren, ageOf } from '../../people/People.js';

const kidAged = (min, max) => (s) => minorChildren(s).some((c) => ageOf(s, c) >= min && ageOf(s, c) <= max);
const grownKid = (min) => (s) => livingChildren(s).some((c) => ageOf(s, c) >= min);
const hasParent = (s) => (s.people?.list ?? []).some((p) => p.relation === 'parent' && p.alive);
const hasSibling = (s) => (s.people?.list ?? []).some((p) => p.relation === 'sibling' && p.alive);

export default {
  id: 'life-stages',
  version: 1,
  events: [
    /* ---------------- Teens & young adults ---------------- */
    { id: 'driversTest', title: 'Driving Test', when: { age: [16, 18] }, text: 'Your road test is tomorrow, and parallel parking still terrifies you.', options: [
      { id: 'practice', label: '🚗 Practice all evening', check: { chance: 0.8 }, pass: { stat: { happiness: 6 }, log: 'You passed. Freedom.' }, fail: { stat: { happiness: -3 }, log: 'You clipped a cone. Retest in two weeks.' } },
      { id: 'wing', label: '🤞 Wing it', check: { chance: 0.5 }, pass: { stat: { happiness: 6 }, log: 'You passed anyway.' }, fail: { stat: { happiness: -4 }, log: 'You rolled through a stop sign. Fail.' } },
    ] },
    { id: 'prom', title: 'Prom', when: { age: [16, 18] }, text: 'Prom is in three weeks and you don\'t have a date.', options: [
      { id: 'ask', label: '💐 Ask your crush', check: { stat: 'looks', difficulty: 60 }, pass: { stat: { happiness: 8 }, log: 'They said yes. Best night of high school.' }, fail: { stat: { happiness: -5 }, log: 'They already had a date. You went with friends.' } },
      { id: 'friends', label: '👯 Go with a group of friends', stat: { happiness: 5 }, log: 'No pressure, all fun.' },
      { id: 'skip', label: '🎮 Skip it', log: 'You stayed home. Your mom was more upset than you were.' },
    ] },
    { id: 'gapYear', title: 'Gap Year?', when: { age: [18, 19], student: false }, text: 'A friend is backpacking through Southeast Asia for six months and wants company.', options: [
      { id: 'go', label: '🎒 Go ($3,000)', afford: 3000, reason: 'Backpacking trip', cantAfford: { log: 'You couldn\'t afford it, so you stayed and worked.' }, stat: { happiness: 10, smarts: 2, stress: -8 }, log: 'You came back with stories and a better sense of who you are.' },
      { id: 'stay', label: '🏠 Stay and save money', run: (ctx) => { ctx.earn(4000, 'Extra shifts', { wage: true }); return 'You banked $4,000.'; } },
    ] },
    { id: 'firstApartment', title: 'First Apartment', when: { age: [19, 28] }, text: 'Your new apartment has no furniture, a weird smell and a neighbor who plays drums.', options: [
      { id: 'ikea', label: '🛋️ Furnish it properly ($1,500)', bill: 1500, reason: 'Furniture', stat: { happiness: 5 }, log: 'It finally feels like home.' },
      { id: 'curb', label: '🪑 Curb finds and a mattress on the floor', stat: { happiness: 2 }, log: 'Free couch. Mysterious stain. Character.' },
    ] },
    { id: 'roadTrip', title: 'Road Trip', when: { age: [18, 35] }, text: 'Three friends, one car, two weeks, no plan.', options: [
      { id: 'go', label: '🛣️ Go ($900)', run: (ctx) => { if (!ctx.spend(900, 'Road trip', { credit: true })) return 'You couldn\'t swing it.'; ctx.stat('happiness', 9); ctx.stat('stress', -8); return ctx.rng.chance(0.2) ? 'The car broke down in the middle of nowhere. Still the best trip of your life.' : ctx.rng.pick(['A canyon at sunrise. Worth every gas station meal.', 'A lake nobody had told you about. Worth every gas station meal.', 'Three cities in four days. Worth every gas station meal.']); } },
      { id: 'no', label: '💼 Can\'t get the time off', log: 'They sent photos. You liked every one.' },
    ] },
    { id: 'datingApp', title: 'Dating Apps', when: { age: [20, 45], partner: false }, text: 'Your friends set up a dating profile for you.', options: [
      { id: 'swipe', label: '📱 Give it a real try', check: { chance: 0.35 }, pass: { stat: { happiness: 6 }, log: 'A few good dates. One second date that went really well.' }, fail: { stat: { happiness: -3 }, log: ['Three ghostings and a man who talked about crypto for two hours.', 'Two no-shows and one date who brought their mother.', 'A week of small talk that went nowhere.'] } },
      { id: 'delete', label: '🗑️ Delete it', log: 'You\'d rather meet someone in real life.' },
    ] },
    { id: 'weddingParty', title: 'Bridesmaid / Groomsman', when: { age: [22, 40] }, text: 'Your best friend asks you to be in their wedding party. The bachelor(ette) trip is in Vegas.', options: [
      { id: 'yes', label: '🥂 Yes, all in ($1,800)', bill: 1800, reason: 'Wedding party costs', stat: { happiness: 7 }, log: 'You gave a toast that made the room cry, in the good way.' },
      { id: 'budget', label: '💸 Yes, but skip Vegas', bill: 400, reason: 'Wedding party costs', stat: { happiness: 3 }, log: 'They understood. Mostly.' },
    ] },

    /* ---------------- Family ---------------- */
    { id: 'inLaws', title: 'The In-Laws', when: { age: [22, null], married: true }, text: 'Your in-laws want to stay with you for a month. Your spouse is already looking at you.', options: [
      { id: 'host', label: '🏠 Host them graciously', stat: { stress: 8 }, relation: { partner: 6 }, log: 'A long month. Your spouse noticed the effort.' },
      { id: 'hotel', label: '🏨 Offer to pay for a nearby rental ($2,500)', afford: 2500, reason: 'In-laws\' rental', cantAfford: { log: 'You couldn\'t afford it, so they stayed with you.' }, relation: { partner: 2 }, log: 'Everyone kept their sanity.' },
      { id: 'no', label: '🙅 Put your foot down', relation: { partner: -8 }, log: 'Thanksgiving was frosty.' },
    ] },
    { id: 'anniversary', title: 'Anniversary', when: { age: [22, null], married: true }, text: 'Your anniversary is next week, and you forgot to plan anything.', options: [
      { id: 'trip', label: '✈️ Book a surprise weekend away ($1,200)', afford: 1200, reason: 'Anniversary trip', cantAfford: { relation: { partner: 5 }, log: 'Money was tight, so you cooked dinner instead. It was lovely.' }, relation: { partner: 10 }, stat: { happiness: 6 }, log: 'It felt like the early days.' },
      { id: 'dinner', label: '🍝 Cook their favorite dinner', relation: { partner: 5 }, log: 'Simple and sweet.' },
      { id: 'forget', label: '😬 Hope they forgot too', relation: { partner: -10 }, log: 'They did not forget.' },
    ] },
    { id: 'kidSports', title: 'Travel Team', when: { age: [25, null], test: kidAged(6, 16) }, text: 'Your kid made the travel soccer team: $4,000 a year and every weekend in a different town.', options: [
      { id: 'yes', label: '⚽ Sign them up', afford: 4000, reason: 'Travel sports', cantAfford: { log: 'It wasn\'t in the budget. Rec league it is.' }, stat: { stress: 4, happiness: 4 }, relation: { minorKids: 6 }, log: 'You learned to love folding chairs and gas station coffee.' },
      { id: 'rec', label: '🥅 Stick with the rec league', relation: { minorKids: -2 }, log: 'They were disappointed for a week.' },
    ] },
    { id: 'teenTrouble', title: 'Call from the School', when: { age: [32, null], test: kidAged(14, 17) }, text: 'Your teenager was caught skipping class, and their grades are slipping.', options: [
      { id: 'talk', label: '🗣️ Sit down and really listen', relation: { minorKids: 6 }, stat: { stress: 3 }, log: 'There was a lot going on with friends. You worked out a plan together.' },
      { id: 'ground', label: '📵 Ground them and take the phone', relation: { minorKids: -6 }, log: 'Their grades came up. The silence at dinner lasted a month.' },
    ] },
    { id: 'kidAskForMoney', title: 'Adult Child Needs Help', when: { age: [45, null], test: grownKid(22) }, text: 'Your grown child needs $10,000 for a down payment on their first home.', options: [
      { id: 'give', label: '🏡 Give it to them', afford: 10000, reason: 'Help with a down payment', cantAfford: { log: 'You couldn\'t spare it right now.' }, relation: { kids: 8 }, stat: { happiness: 5 }, log: 'They sent a photo of the keys.' },
      { id: 'loan', label: '📝 Lend it with a written plan', afford: 10000, reason: 'Loan to your child', cantAfford: { log: 'You couldn\'t spare it right now.' }, plant: { id: 'kidRepays', years: 4 }, log: 'They signed it, a little embarrassed.' },
      { id: 'no', label: '🙅 They need to do it themselves', relation: { kids: -4 }, log: 'They managed, eventually.' },
    ] },
    { id: 'kidRepays', followUp: true, title: 'The Loan, Repaid', icon: '🏡', run: { run: (ctx) => (ctx.rng.chance(0.75) ? ((ctx.state.finances.cash += 10000), 'Your kid paid back the $10,000, every dollar, plus a thank-you card.') : 'Your kid quietly stopped paying on the loan. Neither of you brings it up.') } },
    { id: 'parentHealth', title: 'A Call About Your Parent', when: { age: [35, null], test: hasParent }, text: 'Your parent fell at home. They\'re okay, but the doctor says they shouldn\'t live alone much longer.', options: [
      { id: 'visit', label: '✈️ Fly home for two weeks', bill: 1200, reason: 'Travel home', relation: { parent: 10 }, job: { performance: -2 }, log: 'You set up grab bars, a medical alert button and a meal service.' },
      { id: 'sibling', label: '📞 Coordinate with your siblings', relation: { sibling: 4 }, log: 'You split the visits. Nobody felt it was fair, which probably meant it was.' },
      { id: 'phone', label: '☎️ Call more often', relation: { parent: 2 }, log: 'You called every Sunday after that.' },
    ] },
    { id: 'siblingFeud', title: 'Sibling Feud', when: { age: [25, null], test: hasSibling }, text: 'Your sibling said something cruel at a family dinner, and everyone is waiting to see what you do.', options: [
      { id: 'clear', label: '🫂 Talk it out one-on-one', relation: { sibling: 8 }, log: ['It turned out they were going through a divorce. You hugged it out.', 'They\'d lost their job and hadn\'t told anyone. You hugged it out.'] },
      { id: 'clap', label: '🔥 Say what you\'ve wanted to say for years', tone: 'danger', relation: { sibling: -15 }, stat: { happiness: 2 }, log: 'It felt great for an hour. Holidays have been awkward since.' },
    ] },
    { id: 'familyReunion', title: 'Family Reunion', when: { age: [20, null] }, text: 'Your cousin is organizing the first family reunion in fifteen years.', options: [
      { id: 'go', label: '🧺 Go', stat: { happiness: 6 }, relation: { parents: 4 }, log: ['Your great-uncle told stories nobody had heard before.', 'Your cousins had grown up. The food was better than you remembered.'] },
      { id: 'skip', label: '🙅 Skip it', log: 'You saw the photos online.' },
    ] },
    { id: 'dnaTest', title: 'DNA Test', icon: '🧬', when: { age: [25, null] }, run: { run: (ctx) => {
      const r = ctx.rng.next();
      if (r < 0.06) { ctx.stat('stress', 8); return 'Surprise: a half-sibling you never knew about. You exchanged careful messages.'; }
      if (r < 0.3) { ctx.stat('happiness', 3); return 'You\'re 12% something nobody in your family ever mentioned.'; }
      return 'Exactly what you expected. The health report said to watch your cholesterol.';
    } } },

    /* ---------------- Neighbours & home ---------------- */
    { id: 'treeFell', title: 'Storm Damage', when: { age: [25, null], homeowner: true }, text: 'A storm dropped your neighbor\'s tree on your fence and half your garage.', options: [
      { id: 'insurance', label: '📋 File a claim', bill: 1000, reason: 'Insurance deductible', log: 'Insurance covered the rest after three adjuster visits.' },
      { id: 'neighbor', label: '🤝 Ask the neighbor to split it', check: { chance: 0.5 }, pass: { bill: 2000, reason: 'Half the repair', log: 'They agreed. You split a $4,000 repair.' }, fail: { bill: 4000, reason: 'Garage repair', stat: { stress: 4 }, log: 'They refused: "Act of God." You paid all of it.' } },
    ] },
    { id: 'noisyNeighbor', title: 'The Neighbors', when: { age: [18, null] }, text: 'The new neighbors throw parties until 3 a.m. on weeknights.', options: [
      { id: 'knock', label: '🚪 Knock and ask nicely', check: { chance: 0.6 }, pass: { log: 'They apologized and invited you to the next one.' }, fail: { stat: { stress: 4 }, log: 'They turned it down for a week.' } },
      { id: 'police', label: '🚓 Call in a noise complaint', stat: { stress: 2 }, log: 'It stopped. They glare at you at the mailbox now.' },
      { id: 'earplugs', label: '🎧 Buy good earplugs', stat: { stress: 3 }, log: 'You learned to sleep through anything.' },
    ] },
    { id: 'packageThief', title: 'Porch Pirate', icon: '📦', kind: 'warn', when: { age: [18, null] }, run: { bill: 220, reason: 'Stolen packages', stat: { stress: 2 }, log: 'A porch pirate stole $220 of packages. You posted the video; it got 40 likes and no arrests.' } },
    { id: 'waterHeater', title: 'Flooded Basement', icon: '💧', kind: 'bad', when: { age: [25, null], homeowner: true }, run: { bill: [1500, 4000], reason: 'Water heater replacement', stat: { stress: 4 }, log: 'Your water heater burst and flooded the basement: ${spent}.' } },
    { id: 'garageSale', title: 'Garage Sale', when: { age: [25, null] }, text: 'Your closets are overflowing.', options: [
      { id: 'sell', label: '🏷️ Hold a garage sale', run: (ctx) => { const n = ctx.rng.int(200, 900); ctx.earn(n, 'Garage sale'); return ctx.rng.chance(0.05) ? (ctx.earn(4000, 'Rare find sold online'), `You made $${n}, and the "junk" painting turned out to be worth $4,000.`) : `You made $${n} and got your garage back.`; } },
      { id: 'donate', label: '🎁 Donate it all', stat: { happiness: 3 }, log: 'Lighter house, lighter mind.' },
    ] },

    /* ---------------- Money ---------------- */
    { id: 'savingsMatch', title: 'Savings Challenge', when: { age: [22, 40], job: true }, text: 'Your credit union is running a savings challenge with a matching bonus.', options: [
      { id: 'join', label: '🐷 Join and automate deposits', earn: 1500, source: 'Credit union savings bonus', stat: { stress: -2 }, log: 'You saved all year and they added a $1,500 bonus.' },
      { id: 'skip', label: '🙅 Not this year', log: 'Maybe next year.' },
    ] },
    { id: 'cryptoTip', title: 'Hot Tip', when: { age: [18, 70] }, text: 'A coworker swears a new coin is going to 100x and is putting in his savings.', options: [
      { id: 'buy', label: '🚀 Put in $3,000', tone: 'danger', afford: 3000, reason: 'Crypto speculation', cantAfford: { log: 'You didn\'t have money to gamble with.' }, run: (ctx) => {
        const r = ctx.rng.next();
        if (r < 0.08) { ctx.earn(30000, 'Crypto gains'); return 'It mooned. You sold at $30,000 and never touched crypto again.'; }
        if (r < 0.3) { ctx.earn(4500, 'Crypto gains'); return 'Up 50%. You took the win.'; }
        return 'It went to zero in four months. Your coworker stopped talking about it.';
      } },
      { id: 'pass', label: '🙄 Pass', log: 'You\'ll never know. That\'s fine.' },
    ] },
    { id: 'taxRefund', title: 'Surprise Refund', icon: '🧾', kind: 'good', when: { age: [20, null], job: true }, run: { cash: [400, 2500], log: 'An amended return found a deduction you missed: a ${earned} refund.' } },
    { id: 'phishing', title: 'Suspicious Email', when: { age: [18, null] }, text: 'An email "from your bank" says your account is locked and to log in through the link.', options: [
      { id: 'ignore', label: '🛡️ Delete it and call the bank', log: 'The bank said it was a scam. Good catch.' },
      { id: 'click', label: '🔗 Click and log in', tone: 'danger', bill: [800, 3000], reason: 'Phishing theft', stat: { stress: 8 }, log: 'They drained ${spent} before the bank froze the account.' },
    ] },
    { id: 'carDeal', title: 'The Dealership', when: { age: [18, null] }, text: 'The salesman says this financing deal is only good today.', options: [
      { id: 'walk', label: '🚶 Walk out and sleep on it', log: 'He called twice the next day with a better deal.' },
      { id: 'sign', label: '✍️ Sign today', tone: 'danger', bill: 1500, reason: 'Dealer add-ons you didn\'t need', log: 'You found $1,500 of "protection packages" in the paperwork later.' },
    ] },
    { id: 'unclaimed', title: 'Unclaimed Property', icon: '🔎', kind: 'good', when: { age: [25, null], free: false }, run: { cash: [60, 1800], log: 'You searched the government\'s unclaimed-property site on a whim and found ${earned} from an old deposit.' } },

    /* ---------------- Health & body ---------------- */
    { id: 'gymResolution', title: 'New Year\'s Resolution', when: { age: [18, 70] }, text: 'This is the year you get in shape. Again.', options: [
      { id: 'gym', label: '🏋️ Hire a trainer for three months ($900)', bill: 900, reason: 'Personal trainer', stat: { fitness: 6, happiness: 3 }, log: 'You stuck with it. Your jeans fit better.' },
      { id: 'run', label: '🏃 Start a couch-to-5K plan', check: { chance: 0.5 }, pass: { stat: { fitness: 4 }, log: 'You ran your first 5K in June.' }, fail: { log: 'It lasted until February. Like every year.' } },
    ] },
    { id: 'healthScare', title: 'A Lump', when: { age: [35, null] }, text: 'You found a lump. The earliest appointment is three weeks out.', options: [
      { id: 'push', label: '📞 Push for an earlier scan', stat: { stress: 4 }, checkup: true, log: 'The scan came back benign. You cried in the parking lot anyway.' },
      { id: 'wait', label: '⏳ Wait for the appointment', stat: { stress: 10 }, checkup: true, log: 'Three long weeks. Benign.' },
    ] },
    { id: 'brokenBone', title: 'Broken Arm', icon: '🦴', kind: 'bad', when: { age: [8, 80] }, run: { stat: { health: -8 }, bill: [300, 2500], reason: 'ER visit', log: ['You broke your arm falling off a ladder. Six weeks in a cast.', 'You broke your arm playing pickup basketball. Six weeks in a cast.', 'You broke your arm slipping on ice. Six weeks in a cast.', 'You broke your arm on a trampoline, at your age. Six weeks in a cast.'] } },
    { id: 'sleep', title: 'Snoring', when: { age: [30, null], partner: true }, text: 'Your partner says you stop breathing in your sleep.', options: [
      { id: 'study', label: '😴 Do a sleep study', stat: { health: 4, happiness: 3 }, log: 'Sleep apnea. The CPAP machine changed your life.' },
      { id: 'ignore', label: '🙄 You\'re fine', stat: { health: -3, stress: 3 }, log: 'You stayed tired all year.' },
    ] },

    /* ---------------- Midlife ---------------- */
    { id: 'midlife', title: 'Midlife Moment', when: { age: [42, 55] }, text: 'You saw a convertible at a red light and felt something.', options: [
      { id: 'car', label: '🏎️ Buy a used sports car ($18,000)', afford: 18000, reason: 'Midlife sports car', cantAfford: { log: 'You couldn\'t justify it. Probably for the best.' }, stat: { happiness: 8 }, relation: { partner: -3 }, log: 'Top down, wind in what\'s left of your hair.' },
      { id: 'hobby', label: '🎸 Take up guitar lessons', bill: 600, reason: 'Guitar lessons', stat: { happiness: 5, smarts: 1 }, log: 'You can play three songs. Badly. Happily.' },
      { id: 'therapy', label: '🛋️ Talk to a therapist about it', trauma: -10, why: 'therapy', stat: { happiness: 4 }, log: 'It wasn\'t about the car.' },
    ] },
    { id: 'reunion', title: 'High School Reunion', when: { age: [28, 70] }, text: 'Your 20-year reunion is next month.', options: [
      { id: 'go', label: '🎉 Go', check: { chance: 0.15 }, pass: { stat: { happiness: 6 }, log: 'You reconnected with an old friend who now runs a company. They want to talk business.' }, fail: { stat: { happiness: 4 }, log: 'Everyone looked older. You felt younger.' } },
      { id: 'skip', label: '🙅 Skip it', log: 'You lurked on the photos instead.' },
    ] },
    { id: 'sabbatical', title: 'Burnout', when: { age: [35, 60], job: true }, text: 'You\'ve stopped caring about work, and your body is noticing.', options: [
      { id: 'vacation', label: '🌴 Take two real weeks off', stat: { stress: -15, happiness: 6 }, log: 'You came back with your head on straight.' },
      { id: 'push', label: '☕ Push through', stat: { stress: 8, health: -3 }, log: 'You made it to the next quarter. Barely.' },
    ] },
    { id: 'mentorship', title: 'Someone Asks You for Advice', when: { age: [40, null], job: true }, text: 'A young person starting out in your field asks if you\'ll mentor them.', options: [
      { id: 'yes', label: '🧭 Yes', stat: { happiness: 5 }, plant: { id: 'menteeReturns', years: 8 }, log: 'Coffee once a month. They\'re sharp.' },
      { id: 'no', label: '🙅 Too busy', log: 'You pointed them to a few books.' },
    ] },
    { id: 'menteeReturns', followUp: true, title: 'Your Mentee', icon: '🧭', kind: 'good', run: { stat: { happiness: 6 }, job: { performance: 3 }, log: 'The person you mentored years ago is now a rising star, and they credited you by name in an industry interview.' } },

    /* ---------------- Retirement & old age ---------------- */
    { id: 'grandkids', title: 'Grandparent Duty', when: { age: [50, null], test: grownKid(25) }, text: 'Your kid asks if you can watch the grandkids two days a week.', options: [
      { id: 'yes', label: '🧸 Of course', stat: { happiness: 8, stress: 3 }, relation: { kids: 8 }, log: 'Exhausting, joyful and the best part of your week.' },
      { id: 'some', label: '📅 One day a week', stat: { happiness: 4 }, relation: { kids: 3 }, log: 'Wednesdays are grandparent day.' },
    ] },
    { id: 'downsizing', title: 'Too Much House', when: { age: [60, null], homeowner: true }, text: 'The kids are gone and the stairs are getting harder.', options: [
      { id: 'think', label: '🏡 Start looking at smaller places', stat: { happiness: 2 }, log: 'You toured three condos. (You can sell your home from the 🏠 Home tab.)' },
      { id: 'stay', label: '❤️ Stay; this is home', bill: 3000, reason: 'Stair lift and grab bars', log: 'You installed a stair lift and kept the memories.' },
    ] },
    { id: 'friendsDying', title: 'Another Funeral', when: { age: [68, null] }, text: 'Your third friend\'s funeral this year.', options: [
      { id: 'speak', label: '🎙️ Give a eulogy', stat: { happiness: -3 }, log: 'You made the room laugh and cry. They would have loved it.' },
      { id: 'quiet', label: '🕯️ Sit in the back', stat: { happiness: -5 }, log: 'You called your remaining friends that night.' },
    ] },
    { id: 'techHelp', title: 'The New Phone', when: { age: [65, null] }, text: 'Your new phone keeps asking you to "update your account."', options: [
      { id: 'grandkid', label: '👦 Ask a grandkid for help', stat: { happiness: 3 }, log: 'Fixed in thirty seconds, with only a little eye-rolling.' },
      { id: 'class', label: '📚 Take a class at the library', stat: { smarts: 2, happiness: 2 }, log: 'You now know more than your kids about privacy settings.' },
    ] },
    { id: 'volunteerRetired', title: 'What Now?', when: { age: [62, null], job: false }, text: 'Retirement is quieter than you expected.', options: [
      { id: 'volunteer', label: '🤝 Volunteer at the food bank', stat: { happiness: 7 }, log: 'Tuesdays and Thursdays. You know everyone\'s name.' },
      { id: 'travel', label: '🧳 Plan a big trip ($6,000)', afford: 6000, reason: 'Retirement trip', cantAfford: { log: 'Maybe next year.' }, stat: { happiness: 10 }, log: ['Three weeks in Italy.', 'Three weeks in Japan.', 'Three weeks in New Zealand.', 'Three weeks in Ireland.', 'Three weeks in Peru.'] },
      { id: 'garden', label: '🌱 Start a serious garden', stat: { happiness: 5, fitness: 2 }, log: 'Your tomatoes won a ribbon at the county fair.' },
    ] },
  ],
};
