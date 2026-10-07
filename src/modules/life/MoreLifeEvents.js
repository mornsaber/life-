/**
 * More life events, by stage of life and circumstance: young adulthood,
 * family, neighbors, money, health scares, midlife, retirement and old age,
 * plus follow-ups that come back years after a choice (`plant`).
 *
 * Same shape as LIFE_EVENTS; follow-up events (`followUp: true`) never come
 * up at random, only when an earlier choice planted them.
 */
import { isIncarcerated } from '../../core/State.js';
import { spouseOf, partnerOf, livingChildren, minorChildren, parentsOf, people, ageOf, clampRel } from '../people/People.js';
import { primaryHome } from '../realestate/HousingEngine.js';

const free = (s) => !isIncarcerated(s);
const stats = (ctx, deltas) => Object.entries(deltas).forEach(([k, v]) => ctx.stat(k, v));
const working = (s) => free(s) && Boolean(s.career.job);
const hasKids = (s) => free(s) && livingChildren(s).length > 0;
const hasMinor = (s) => free(s) && minorChildren(s).length > 0;
const married = (s) => free(s) && Boolean(spouseOf(s));
const livingParent = (s) => parentsOf(s).find((p) => p.alive);
const sibling = (s) => people(s).find((p) => p.relation === 'sibling' && p.alive);
const owner = (s) => free(s) && Boolean(primaryHome(s));
const bump = (p, d) => { if (p) p.relationship = clampRel(p.relationship + d); };

/** Schedule a follow-up event `years` from now. */
export function plant(ctx, id, years) {
  const s = ctx.state;
  s.eventSeeds = [...(s.eventSeeds ?? []), { id, dueAge: s.character.age + years }];
}

export const MORE_LIFE_EVENTS = [
  /* ---------------- Teens & young adults ---------------- */
  { id: 'driversTest', minAge: 16, maxAge: 18, when: free, title: 'Driving Test', text: 'Your road test is tomorrow, and parallel parking still terrifies you.', options: [
    { id: 'practice', label: '🚗 Practice all evening', resolve: (ctx) => (ctx.rng.chance(0.8) ? (stats(ctx, { happiness: 6 }), 'You passed. Freedom.') : (stats(ctx, { happiness: -3 }), 'You clipped a cone. Retest in two weeks.')) },
    { id: 'wing', label: '🤞 Wing it', resolve: (ctx) => (ctx.rng.chance(0.5) ? (stats(ctx, { happiness: 6 }), 'You passed anyway.') : (stats(ctx, { happiness: -4 }), 'You rolled through a stop sign. Fail.')) },
  ] },
  { id: 'prom', minAge: 16, maxAge: 18, when: free, title: 'Prom', text: 'Prom is in three weeks and you don\'t have a date.', options: [
    { id: 'ask', label: '💐 Ask your crush', resolve: (ctx) => (ctx.rng.chance(0.4 + (ctx.state.stats.looks - 50) / 150) ? (stats(ctx, { happiness: 8 }), 'They said yes. Best night of high school.') : (stats(ctx, { happiness: -5 }), 'They already had a date. You went with friends.')) },
    { id: 'friends', label: '👯 Go with a group of friends', resolve: (ctx) => { stats(ctx, { happiness: 5 }); return 'No pressure, all fun.'; } },
    { id: 'skip', label: '🎮 Skip it', resolve: () => 'You stayed home. Your mom was more upset than you were.' },
  ] },
  { id: 'gapYear', minAge: 18, maxAge: 19, when: (s) => free(s) && !s.education.enrolled, title: 'Gap Year?', text: 'A friend is backpacking through Southeast Asia for six months and wants company.', options: [
    { id: 'go', label: '🎒 Go ($3,000)', resolve: (ctx) => { if (!ctx.spend(3000, 'Backpacking trip', { credit: true })) return 'You couldn\'t afford it.'; stats(ctx, { happiness: 10, smarts: 2, stress: -8 }); return 'You came back with stories and a better sense of who you are.'; } },
    { id: 'stay', label: '🏠 Stay and save money', resolve: (ctx) => { ctx.earn(4000, 'Extra shifts', { wage: true }); return 'You banked $4,000.'; } },
  ] },
  { id: 'firstApartment', minAge: 19, maxAge: 28, when: free, title: 'First Apartment', text: 'Your new apartment has no furniture, a weird smell and a neighbor who plays drums.', options: [
    { id: 'ikea', label: '🛋️ Furnish it properly ($1,500)', resolve: (ctx) => { ctx.spend(1500, 'Furniture', { allowDebt: true }); stats(ctx, { happiness: 5 }); return 'It finally feels like home.'; } },
    { id: 'curb', label: '🪑 Curb finds and a mattress on the floor', resolve: (ctx) => { stats(ctx, { happiness: 2 }); return 'Free couch. Mysterious stain. Character.'; } },
  ] },
  { id: 'roadTrip', minAge: 18, maxAge: 35, when: free, title: 'Road Trip', text: 'Three friends, one car, two weeks, no plan.', options: [
    { id: 'go', label: '🛣️ Go ($900)', resolve: (ctx) => { if (!ctx.spend(900, 'Road trip', { credit: true })) return 'You couldn\'t swing it.'; stats(ctx, { happiness: 9, stress: -8 }); return ctx.rng.chance(0.2) ? 'The car broke down in Nevada. Still the best trip of your life.' : 'Grand Canyon at sunrise. Worth every gas station meal.'; } },
    { id: 'no', label: '💼 Can\'t get the time off', resolve: () => 'They sent photos. You liked every one.' },
  ] },
  { id: 'datingApp', minAge: 20, maxAge: 45, when: (s) => free(s) && !partnerOf(s), title: 'Dating Apps', text: 'Your friends set up a dating profile for you.', options: [
    { id: 'swipe', label: '📱 Give it a real try', resolve: (ctx) => (ctx.rng.chance(0.35) ? (stats(ctx, { happiness: 6 }), 'A few good dates. One second date that went really well.') : (stats(ctx, { happiness: -3 }), 'Three ghostings and a man who talked about crypto for two hours.')) },
    { id: 'delete', label: '🗑️ Delete it', resolve: () => 'You\'d rather meet someone in real life.' },
  ] },
  { id: 'weddingParty', minAge: 22, maxAge: 40, when: free, title: 'Bridesmaid / Groomsman', text: 'Your best friend asks you to be in their wedding party. The bachelor(ette) trip is in Vegas.', options: [
    { id: 'yes', label: '🥂 Yes, all in ($1,800)', resolve: (ctx) => { ctx.spend(1800, 'Wedding party costs', { allowDebt: true }); stats(ctx, { happiness: 7 }); return 'You gave a toast that made the room cry, in the good way.'; } },
    { id: 'budget', label: '💸 Yes, but skip Vegas', resolve: (ctx) => { ctx.spend(400, 'Wedding party costs', { allowDebt: true }); stats(ctx, { happiness: 3 }); return 'They understood. Mostly.'; } },
  ] },

  /* ---------------- Family ---------------- */
  { id: 'inLaws', minAge: 22, when: married, title: 'The In-Laws', text: 'Your in-laws want to stay with you for a month. Your spouse is already looking at you.', options: [
    { id: 'host', label: '🏠 Host them graciously', resolve: (ctx) => { stats(ctx, { stress: 8 }); bump(spouseOf(ctx.state), 6); return 'A long month. Your spouse noticed the effort.'; } },
    { id: 'hotel', label: '🏨 Offer to pay for a nearby rental ($2,500)', resolve: (ctx) => { ctx.spend(2500, 'In-laws\' rental', { allowDebt: true }); bump(spouseOf(ctx.state), 2); return 'Everyone kept their sanity.'; } },
    { id: 'no', label: '🙅 Put your foot down', resolve: (ctx) => { bump(spouseOf(ctx.state), -8); return 'Thanksgiving was frosty.'; } },
  ] },
  { id: 'anniversary', minAge: 22, when: married, title: 'Anniversary', text: 'Your anniversary is next week, and you forgot to plan anything.', options: [
    { id: 'trip', label: '✈️ Book a surprise weekend away ($1,200)', resolve: (ctx) => { if (!ctx.spend(1200, 'Anniversary trip', { credit: true })) return 'Card declined. You cooked dinner instead.'; bump(spouseOf(ctx.state), 10); stats(ctx, { happiness: 6 }); return 'It felt like the early days.'; } },
    { id: 'dinner', label: '🍝 Cook their favorite dinner', resolve: (ctx) => { bump(spouseOf(ctx.state), 5); return 'Simple and sweet.'; } },
    { id: 'forget', label: '😬 Hope they forgot too', resolve: (ctx) => { bump(spouseOf(ctx.state), -10); return 'They did not forget.'; } },
  ] },
  { id: 'kidSports', minAge: 25, when: (s) => hasMinor(s) && minorChildren(s).some((c) => ageOf(s, c) >= 6 && ageOf(s, c) <= 16), title: 'Travel Team', text: 'Your kid made the travel soccer team: $4,000 a year and every weekend in a different town.', options: [
    { id: 'yes', label: '⚽ Sign them up', resolve: (ctx) => { ctx.spend(4000, 'Travel sports', { allowDebt: true }); stats(ctx, { stress: 4, happiness: 4 }); minorChildren(ctx.state).forEach((c) => bump(c, 6)); return 'You learned to love folding chairs and gas station coffee.'; } },
    { id: 'rec', label: '🥅 Stick with the rec league', resolve: (ctx) => { minorChildren(ctx.state).forEach((c) => bump(c, -2)); return 'They were disappointed for a week.'; } },
  ] },
  { id: 'teenTrouble', minAge: 32, when: (s) => hasMinor(s) && minorChildren(s).some((c) => ageOf(s, c) >= 14), title: 'Call from the School', text: 'Your teenager was caught skipping class, and their grades are slipping.', options: [
    { id: 'talk', label: '🗣️ Sit down and really listen', resolve: (ctx) => { minorChildren(ctx.state).forEach((c) => bump(c, 6)); stats(ctx, { stress: 3 }); return 'There was a lot going on with friends. You worked out a plan together.'; } },
    { id: 'ground', label: '📵 Ground them and take the phone', resolve: (ctx) => { minorChildren(ctx.state).forEach((c) => bump(c, -6)); return 'Their grades came up. The silence at dinner lasted a month.'; } },
  ] },
  { id: 'kidAskForMoney', minAge: 45, when: (s) => free(s) && livingChildren(s).some((c) => ageOf(s, c) >= 22), title: 'Adult Child Needs Help', text: 'Your grown child needs $10,000 for a down payment on their first home.', options: [
    { id: 'give', label: '🏡 Give it to them', resolve: (ctx) => { if (!ctx.spend(10000, 'Help with a down payment', { credit: true })) return 'You couldn\'t spare it.'; livingChildren(ctx.state).forEach((c) => bump(c, 8)); stats(ctx, { happiness: 5 }); return 'They sent a photo of the keys.'; } },
    { id: 'loan', label: '📝 Lend it with a written plan', resolve: (ctx) => { if (!ctx.spend(10000, 'Loan to your child', { credit: true })) return 'You couldn\'t spare it.'; plant(ctx, 'kidRepays', 4); return 'They signed it, a little embarrassed.'; } },
    { id: 'no', label: '🙅 They need to do it themselves', resolve: (ctx) => { livingChildren(ctx.state).forEach((c) => bump(c, -4)); return 'They managed, eventually.'; } },
  ] },
  { id: 'kidRepays', followUp: true, title: 'The Loan, Repaid', text: '', run: (ctx) => (ctx.rng.chance(0.75) ? (ctx.state.finances.cash += 10000, ['🏡', 'Your kid paid back the $10,000, every dollar, plus a thank-you card.', 'good']) : ['🏡', 'Your kid quietly stopped paying on the loan. Neither of you brings it up.', 'warn']) },
  { id: 'parentHealth', minAge: 35, when: (s) => free(s) && Boolean(livingParent(s)), title: 'A Call About Your Parent', text: 'Your parent fell at home. They\'re okay, but the doctor says they shouldn\'t live alone much longer.', options: [
    { id: 'visit', label: '✈️ Fly home for two weeks', resolve: (ctx) => { ctx.spend(1200, 'Travel home', { allowDebt: true }); bump(livingParent(ctx.state), 10); if (ctx.state.career.job) ctx.emit('career:adjust', { performance: -2 }); return 'You set up grab bars, a medical alert button and a meal service.'; } },
    { id: 'sibling', label: '📞 Coordinate with your siblings', resolve: (ctx) => { bump(sibling(ctx.state), 4); return 'You split the visits. Nobody felt it was fair, which probably meant it was.'; } },
    { id: 'phone', label: '☎️ Call more often', resolve: (ctx) => { bump(livingParent(ctx.state), 2); return 'You called every Sunday after that.'; } },
  ] },
  { id: 'siblingFeud', minAge: 25, when: (s) => free(s) && Boolean(sibling(s)), title: 'Sibling Feud', text: 'Your sibling said something cruel at a family dinner, and everyone is waiting to see what you do.', options: [
    { id: 'clear', label: '🫂 Talk it out one-on-one', resolve: (ctx) => { bump(sibling(ctx.state), 8); return 'It turned out they were going through a divorce. You hugged it out.'; } },
    { id: 'clap', label: '🔥 Say what you\'ve wanted to say for years', resolve: (ctx) => { bump(sibling(ctx.state), -15); stats(ctx, { happiness: 2 }); return 'It felt great for an hour. Holidays have been awkward since.'; } },
  ] },
  { id: 'familyReunion', minAge: 20, when: free, title: 'Family Reunion', text: 'Your cousin is organizing the first family reunion in fifteen years.', options: [
    { id: 'go', label: '🧺 Go', resolve: (ctx) => { stats(ctx, { happiness: 6 }); parentsOf(ctx.state).filter((p) => p.alive).forEach((p) => bump(p, 4)); return 'Your great-uncle told stories nobody had heard before.'; } },
    { id: 'skip', label: '🙅 Skip it', resolve: () => 'You saw the photos online.' },
  ] },
  { id: 'dnaTest', minAge: 25, when: free, title: 'DNA Test', text: 'You got a home DNA test as a gift.', run: (ctx) => {
    const r = ctx.rng.next();
    if (r < 0.06) { stats(ctx, { stress: 8 }); return ['🧬', 'Surprise: a half-sibling you never knew about. You exchanged careful messages.', 'warn']; }
    if (r < 0.3) { stats(ctx, { happiness: 3 }); return ['🧬', 'You\'re 12% something nobody in your family ever mentioned.', 'info']; }
    return ['🧬', 'Exactly what you expected. The health report said to watch your cholesterol.', 'info'];
  } },

  /* ---------------- Neighbors & home ---------------- */
  { id: 'treeFell', minAge: 25, when: owner, title: 'Storm Damage', text: 'A storm dropped your neighbor\'s tree on your fence and half your garage.', options: [
    { id: 'insurance', label: '📋 File a claim', resolve: (ctx) => { ctx.spend(1000, 'Insurance deductible', { allowDebt: true }); return 'Insurance covered the rest after three adjuster visits.'; } },
    { id: 'neighbor', label: '🤝 Ask the neighbor to split it', resolve: (ctx) => (ctx.rng.chance(0.5) ? (ctx.spend(2000, 'Half the repair', { allowDebt: true }), 'He agreed. You split a $4,000 repair.') : (ctx.spend(4000, 'Garage repair', { allowDebt: true }), stats(ctx, { stress: 4 }), 'He refused: "Act of God." You paid all of it.')) },
  ] },
  { id: 'noisyNeighbor', minAge: 18, when: free, title: 'The Neighbors', text: 'The new neighbors throw parties until 3 a.m. on weeknights.', options: [
    { id: 'knock', label: '🚪 Knock and ask nicely', resolve: (ctx) => (ctx.rng.chance(0.6) ? 'They apologized and invited you to the next one.' : (stats(ctx, { stress: 4 }), 'They turned it down for a week.')) },
    { id: 'police', label: '🚓 Call in a noise complaint', resolve: (ctx) => { stats(ctx, { stress: 2 }); return 'It stopped. They glare at you at the mailbox now.'; } },
    { id: 'earplugs', label: '🎧 Buy good earplugs', resolve: (ctx) => { stats(ctx, { stress: 3 }); return 'You learned to sleep through anything.'; } },
  ] },
  { id: 'packageThief', minAge: 18, when: free, title: 'Porch Pirate', text: 'Your doorbell camera caught someone stealing three packages.', run: (ctx) => { ctx.spend(220, 'Stolen packages', { allowDebt: true }); stats(ctx, { stress: 2 }); return ['📦', 'A porch pirate stole $220 of packages. You posted the video; it got 40 likes and no arrests.', 'warn']; } },
  { id: 'waterHeater', minAge: 25, when: owner, title: 'Flooded Basement', text: '', run: (ctx) => { const c = ctx.rng.int(1500, 4000); ctx.spend(c, 'Water heater replacement', { allowDebt: true }); stats(ctx, { stress: 4 }); return ['💧', `Your water heater burst and flooded the basement: $${c.toLocaleString()}.`, 'bad']; } },
  { id: 'garageSale', minAge: 25, when: free, title: 'Garage Sale', text: 'Your closets are overflowing.', options: [
    { id: 'sell', label: '🏷️ Hold a garage sale', resolve: (ctx) => { const n = ctx.rng.int(200, 900); ctx.earn(n, 'Garage sale'); return ctx.rng.chance(0.05) ? (ctx.earn(4000, 'Rare find sold online'), `You made $${n}, and the "junk" painting turned out to be worth $4,000.`) : `You made $${n} and got your garage back.`; } },
    { id: 'donate', label: '🎁 Donate it all', resolve: (ctx) => { stats(ctx, { happiness: 3 }); return 'Lighter house, lighter mind.'; } },
  ] },

  /* ---------------- Money ---------------- */
  { id: 'cryptoTip', minAge: 18, maxAge: 70, when: free, title: 'Hot Tip', text: 'A coworker swears a new coin is going to 100x and is putting in his savings.', options: [
    { id: 'buy', label: '🚀 Put in $3,000', resolve: (ctx) => { if (!ctx.spend(3000, 'Crypto speculation', { credit: true })) return 'You didn\'t have it.'; const r = ctx.rng.next(); if (r < 0.08) { ctx.earn(30000, 'Crypto gains'); return 'It mooned. You sold at $30,000 and never touched crypto again.'; } if (r < 0.3) { ctx.earn(4500, 'Crypto gains'); return 'Up 50%. You took the win.'; } return 'It went to zero in four months. Your coworker stopped talking about it.'; } },
    { id: 'pass', label: '🙄 Pass', resolve: () => 'You\'ll never know. That\'s fine.' },
  ] },
  { id: 'taxRefund', minAge: 20, when: working, title: 'Surprise Refund', text: '', run: (ctx) => { const n = ctx.rng.int(400, 2500); ctx.state.finances.cash += n; return ['🧾', `An amended return found a deduction you missed: a $${n.toLocaleString()} refund.`, 'good']; } },
  { id: 'phishing', minAge: 18, when: free, title: 'Suspicious Email', text: 'An email "from your bank" says your account is locked and to log in through the link.', options: [
    { id: 'ignore', label: '🛡️ Delete it and call the bank', resolve: () => 'The bank said it was a scam. Good catch.' },
    { id: 'click', label: '🔗 Click and log in', resolve: (ctx) => { const n = ctx.rng.int(800, 5000); ctx.spend(n, 'Phishing theft', { allowDebt: true }); ctx.emit('credit:event', { type: 'late' }); stats(ctx, { stress: 8 }); return `They drained $${n.toLocaleString()} before the bank froze the account.`; } },
  ] },
  { id: 'carDeal', minAge: 18, when: free, title: 'The Dealership', text: 'The salesman says this financing deal is only good today.', options: [
    { id: 'walk', label: '🚶 Walk out and sleep on it', resolve: () => 'He called twice the next day with a better deal.' },
    { id: 'sign', label: '✍️ Sign today', resolve: (ctx) => { ctx.spend(1500, 'Dealer add-ons you didn\'t need', { allowDebt: true }); return 'You found $1,500 of "protection packages" in the paperwork later.'; } },
  ] },
  { id: 'unclaimed', minAge: 25, title: 'Unclaimed Property', text: '', run: (ctx) => { const n = ctx.rng.int(60, 1800); ctx.state.finances.cash += n; return ['🔎', `You searched the state unclaimed-property site on a whim and found $${n.toLocaleString()} from an old deposit.`, 'good']; } },

  /* ---------------- Health & body ---------------- */
  { id: 'gymResolution', minAge: 18, maxAge: 70, when: free, title: 'New Year\'s Resolution', text: 'This is the year you get in shape. Again.', options: [
    { id: 'gym', label: '🏋️ Hire a trainer for three months ($900)', resolve: (ctx) => { ctx.spend(900, 'Personal trainer', { allowDebt: true }); stats(ctx, { fitness: 6, happiness: 3 }); return 'You stuck with it. Your jeans fit better.'; } },
    { id: 'run', label: '🏃 Start a couch-to-5K plan', resolve: (ctx) => (ctx.rng.chance(0.5) ? (stats(ctx, { fitness: 4 }), 'You ran your first 5K in June.') : 'It lasted until February. Like every year.') },
  ] },
  { id: 'healthScare', minAge: 35, when: free, title: 'A Lump', text: 'You found a lump. The earliest appointment is three weeks out.', options: [
    { id: 'push', label: '📞 Push for an earlier scan', resolve: (ctx) => { stats(ctx, { stress: 4 }); ctx.emit('health:checkup', {}); return 'The scan came back benign. You cried in the parking lot anyway.'; } },
    { id: 'wait', label: '⏳ Wait for the appointment', resolve: (ctx) => { stats(ctx, { stress: 10 }); ctx.emit('health:checkup', {}); return 'Three long weeks. Benign.'; } },
  ] },
  { id: 'brokenBone', minAge: 8, maxAge: 80, when: free, title: 'Broken Arm', text: '', run: (ctx) => { ctx.stat('health', -8); ctx.spend(ctx.rng.int(300, 2500), 'ER visit', { allowDebt: true }); return ['🦴', `You broke your arm ${ctx.rng.pick(['falling off a ladder', 'playing pickup basketball', 'slipping on ice', 'on a trampoline, at your age'])}. Six weeks in a cast.`, 'bad']; } },
  { id: 'sleep', minAge: 30, when: free, title: 'Snoring', text: 'Your partner says you stop breathing in your sleep.', options: [
    { id: 'study', label: '😴 Do a sleep study', resolve: (ctx) => { stats(ctx, { health: 4, happiness: 3 }); return 'Sleep apnea. The CPAP machine changed your life.'; } },
    { id: 'ignore', label: '🙄 You\'re fine', resolve: (ctx) => { stats(ctx, { health: -3, stress: 3 }); return 'You stayed tired all year.'; } },
  ] },

  /* ---------------- Midlife ---------------- */
  { id: 'midlife', minAge: 42, maxAge: 55, when: free, title: 'Midlife Moment', text: 'You saw a convertible at a red light and felt something.', options: [
    { id: 'car', label: '🏎️ Buy a used sports car ($18,000)', resolve: (ctx) => { if (!ctx.spend(18000, 'Midlife sports car', { credit: true })) return 'Financing fell through. Probably for the best.'; stats(ctx, { happiness: 8 }); bump(spouseOf(ctx.state), -3); return 'Top down, wind in what\'s left of your hair.'; } },
    { id: 'hobby', label: '🎸 Take up guitar lessons', resolve: (ctx) => { ctx.spend(600, 'Guitar lessons', { allowDebt: true }); stats(ctx, { happiness: 5, smarts: 1 }); return 'You can play three songs. Badly. Happily.'; } },
    { id: 'therapy', label: '🛋️ Talk to a therapist about it', resolve: (ctx) => { ctx.emit('health:trauma', { amount: -10, source: 'therapy' }); stats(ctx, { happiness: 4 }); return 'It wasn\'t about the car.'; } },
  ] },
  { id: 'reunion', minAge: 28, maxAge: 70, when: free, title: 'High School Reunion', text: 'Your 20-year reunion is next month.', options: [
    { id: 'go', label: '🎉 Go', resolve: (ctx) => (ctx.rng.chance(0.15) ? (stats(ctx, { happiness: 6 }), 'You reconnected with an old friend who now runs a company. They want to talk business.') : (stats(ctx, { happiness: 4 }), 'Everyone looked older. You felt younger.')) },
    { id: 'skip', label: '🙅 Skip it', resolve: () => 'You lurked on the photos instead.' },
  ] },
  { id: 'sabbatical', minAge: 35, maxAge: 60, when: working, title: 'Burnout', text: 'You\'ve stopped caring about work, and your body is noticing.', options: [
    { id: 'vacation', label: '🌴 Take two real weeks off', resolve: (ctx) => { stats(ctx, { stress: -15, happiness: 6 }); return 'You came back with your head on straight.'; } },
    { id: 'push', label: '☕ Push through', resolve: (ctx) => { stats(ctx, { stress: 8, health: -3 }); return 'You made it to the next quarter. Barely.'; } },
  ] },
  { id: 'mentorship', minAge: 40, when: working, title: 'Someone Asks You for Advice', text: 'A young person starting out in your field asks if you\'ll mentor them.', options: [
    { id: 'yes', label: '🧭 Yes', resolve: (ctx) => { stats(ctx, { happiness: 5 }); plant(ctx, 'menteeReturns', 8); return 'Coffee once a month. They\'re sharp.'; } },
    { id: 'no', label: '🙅 Too busy', resolve: () => 'You pointed them to a few books.' },
  ] },
  { id: 'menteeReturns', followUp: true, title: 'Your Mentee', text: '', run: (ctx) => { stats(ctx, { happiness: 6 }); if (ctx.state.career.job) ctx.emit('career:adjust', { performance: 3 }); return ['🧭', 'The person you mentored years ago is now a rising star, and they credited you by name in an industry interview.', 'good']; } },

  /* ---------------- Retirement & old age ---------------- */
  { id: 'grandkids', minAge: 50, when: (s) => free(s) && livingChildren(s).some((c) => ageOf(s, c) >= 25), title: 'Grandparent Duty', text: 'Your kid asks if you can watch the grandkids two days a week.', options: [
    { id: 'yes', label: '🧸 Of course', resolve: (ctx) => { stats(ctx, { happiness: 8, stress: 3 }); livingChildren(ctx.state).forEach((c) => bump(c, 8)); return 'Exhausting, joyful and the best part of your week.'; } },
    { id: 'some', label: '📅 One day a week', resolve: (ctx) => { stats(ctx, { happiness: 4 }); livingChildren(ctx.state).forEach((c) => bump(c, 3)); return 'Wednesdays are grandma/grandpa day.'; } },
  ] },
  { id: 'downsizing', minAge: 60, when: owner, title: 'Too Much House', text: 'The kids are gone and the stairs are getting harder.', options: [
    { id: 'think', label: '🏡 Start looking at smaller places', resolve: (ctx) => { stats(ctx, { happiness: 2 }); return 'You toured three condos. (You can sell your home from the 🏠 Home tab.)'; } },
    { id: 'stay', label: '❤️ Stay; this is home', resolve: (ctx) => { ctx.spend(3000, 'Stair lift and grab bars', { allowDebt: true }); return 'You installed a stair lift and kept the memories.'; } },
  ] },
  { id: 'friendsDying', minAge: 68, when: free, title: 'Another Funeral', text: 'Your third friend\'s funeral this year.', options: [
    { id: 'speak', label: '🎙️ Give a eulogy', resolve: (ctx) => { stats(ctx, { happiness: -3 }); return 'You made the room laugh and cry. They would have loved it.'; } },
    { id: 'quiet', label: '🕯️ Sit in the back', resolve: (ctx) => { stats(ctx, { happiness: -5 }); return 'You called your remaining friends that night.'; } },
  ] },
  { id: 'techHelp', minAge: 65, when: free, title: 'The New Phone', text: 'Your new phone keeps asking you to "update your Apple ID."', options: [
    { id: 'grandkid', label: '👦 Ask a grandkid for help', resolve: (ctx) => { stats(ctx, { happiness: 3 }); return 'Fixed in thirty seconds, with only a little eye-rolling.'; } },
    { id: 'class', label: '📚 Take a class at the library', resolve: (ctx) => { stats(ctx, { smarts: 2, happiness: 2 }); return 'You now know more than your kids about privacy settings.'; } },
  ] },
  { id: 'volunteerRetired', minAge: 62, when: (s) => free(s) && !s.career.job, title: 'What Now?', text: 'Retirement is quieter than you expected.', options: [
    { id: 'volunteer', label: '🤝 Volunteer at the food bank', resolve: (ctx) => { stats(ctx, { happiness: 7 }); return 'Tuesdays and Thursdays. You know everyone\'s name.'; } },
    { id: 'travel', label: '🧳 Plan a big trip ($6,000)', resolve: (ctx) => { if (!ctx.spend(6000, 'Retirement trip', { credit: true })) return 'Maybe next year.'; stats(ctx, { happiness: 10 }); return `Three weeks in ${ctx.rng.pick(['Italy', 'Japan', 'New Zealand', 'Ireland', 'Peru'])}.`; } },
    { id: 'garden', label: '🌱 Start a serious garden', resolve: (ctx) => { stats(ctx, { happiness: 5, fitness: 2 }); return 'Your tomatoes won a ribbon at the county fair.'; } },
  ] },
];

/** Follow-up events by id. */
export const FOLLOW_UPS = Object.fromEntries(MORE_LIFE_EVENTS.filter((e) => e.followUp).map((e) => [e.id, e]));
