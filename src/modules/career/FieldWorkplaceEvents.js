/**
 * Workplace events specific to a field of work, on top of the everyday ones
 * every job shares (same option fields as WORKPLACE_EVENTS).
 */
import { JOB_FIELDS } from './JobTrees.js';

const FIELD_OF = {};
for (const [field, def] of Object.entries(JOB_FIELDS)) for (const id of def.ids) FIELD_OF[id] = field;
const inField = (...fields) => (s) => fields.includes(FIELD_OF[s.career.job?.professionId]);
const is = (...ids) => (s) => ids.includes(s.career.job?.professionId);

export const FIELD_WORKPLACE_EVENTS = [
  /* ---------------- Any field: good news ---------------- */
  { id: 'any.spotBonus', title: 'Spot Bonus', text: 'Your manager put you in for a spot bonus after a great quarter.', when: (s) => s.career.job?.sector === 'private', options: [
    { id: 'thanks', label: '🙏 Say thanks and keep going', money: 2500, boss: 3, stats: { happiness: 4 } },
    { id: 'team', label: '🫶 Ask that the team share it', money: 1000, coworkers: 8, stats: { happiness: 4 } },
  ] },
  { id: 'any.referral', title: 'Referral Bonus', text: 'A friend you referred just got hired. HR owes you a referral bonus.', when: (s) => s.career.job?.sector === 'private', options: [
    { id: 'collect', label: '💵 Collect it', money: 3000, coworkers: 2 },
  ] },
  /* ---------------- Health & social care ---------------- */
  { id: 'hc.shortStaffed', title: 'Short-Staffed Shift', text: 'Two people called out. You have twice the patients you can safely handle.', when: inField('health'), options: [
    { id: 'push', label: '🏃 Run the whole shift and cover everyone', perf: 5, coworkers: 6, stats: { stress: 10, health: -2 } },
    { id: 'escalate', label: '📋 Document it and call the supervisor', perf: 2, boss: -2, stats: { stress: 3 } },
  ] },
  { id: 'hc.familyAnger', title: 'Angry Family', text: 'A patient\'s son is shouting at you about wait times and filming on his phone.', when: inField('health'), options: [
    { id: 'calm', label: '🧘 De-escalate calmly', check: 'smarts', perf: 4 },
    { id: 'security', label: '🛡️ Call security', perf: 1 },
  ] },
  { id: 'hc.error', title: 'Near Miss', text: 'You caught a medication error just before it reached a patient. A colleague made it.', when: inField('health'), options: [
    { id: 'report', label: '📝 File a safety report', perf: 4, coworkers: -3 },
    { id: 'quiet', label: '🤫 Fix it and talk to them privately', coworkers: 5, risky: { chance: 0.15, text: 'It happened again, and the review found you knew.', perf: -8, boss: -6 } },
  ] },
  { id: 'hc.thankYou', title: 'A Thank-You Card', text: 'A patient you cared for last year came back to thank you. They\'re cancer-free.', when: inField('health'), options: [
    { id: 'keep', label: '💌 Pin it to your locker', stats: { happiness: 8, stress: -4 } },
  ] },

  /* ---------------- Public safety & security ---------------- */
  { id: 'ps.bodycam', title: 'Bodycam Footage', text: 'Footage of a tense arrest you made is all over local news. It looks worse than it was.', when: inField('safety', 'federalLE'), options: [
    { id: 'statement', label: '🎙️ Let the department release the full video', perf: 2, boss: 2, stats: { stress: 6 } },
    { id: 'quiet', label: '🤐 Keep your head down', stats: { stress: 8 } },
  ] },
  { id: 'ps.partner', title: 'Your Partner', text: 'Your partner has been showing up smelling of alcohol.', when: inField('safety', 'federalLE', 'corrections'), options: [
    { id: 'talk', label: '🫂 Talk to them and point them to the peer support team', coworkers: 4, stats: { happiness: 2 } },
    { id: 'report', label: '📋 Report it to the sergeant', perf: 3, coworkers: -6 },
    { id: 'cover', label: '🙈 Cover for them', coworkers: 6, risky: { chance: 0.25, text: 'They crashed a cruiser. You were asked what you knew.', perf: -10, boss: -10 } },
  ] },
  { id: 'ps.overtime', title: 'Overtime Detail', text: 'A stadium security detail pays time and a half all weekend.', when: inField('safety', 'corrections'), options: [
    { id: 'take', label: '💵 Take every shift', money: 3200, stats: { stress: 6 } },
    { id: 'family', label: '🏠 Stay home with family', stats: { happiness: 3 } },
  ] },

  /* ---------------- Trades, construction & transport ---------------- */
  { id: 'tr.cashJob', title: 'Cash Side Job', text: 'A homeowner offers $2,500 cash for a weekend job "off the books."', when: inField('trades', 'construction'), options: [
    { id: 'take', label: '💵 Take it and report it', money: 2500, stats: { stress: 3 } },
    { id: 'pass', label: '🙅 Pass; you need the weekend', stats: { happiness: 2 } },
  ] },
  { id: 'tr.inspection', title: 'Failed Inspection', text: 'The city inspector failed your work over something you\'re sure is fine.', when: inField('trades', 'construction'), options: [
    { id: 'redo', label: '🔧 Redo it to the inspector\'s reading', perf: 2, stats: { stress: 3 } },
    { id: 'argue', label: '📖 Pull out the code book and argue', check: 'smarts', perf: 4, boss: 2 },
  ] },
  { id: 'tr.apprentice', title: 'The New Apprentice', text: 'Your foreman pairs you with a nervous apprentice who keeps making mistakes.', when: inField('trades', 'construction'), options: [
    { id: 'teach', label: '🧰 Take the time to teach them', coworkers: 8, perf: 2 },
    { id: 'ask', label: '🙋 Ask for someone else', perf: 1, coworkers: -3 },
  ] },
  { id: 'tv.weather', title: 'Storm Warning', text: 'Dispatch wants the run done tonight. The weather service just issued an ice storm warning.', when: inField('transit', 'travel'), options: [
    { id: 'go', label: '🚛 Run it carefully', perf: 4, risky: { chance: 0.12, text: 'You slid off the road. Nobody was hurt, but the equipment was.', perf: -6, injury: true } },
    { id: 'refuse', label: '🛑 Refuse: safety first', perf: -2, boss: -3, stats: { stress: -2 } },
  ] },
  { id: 'tv.passenger', title: 'Medical Emergency on Board', text: 'A passenger collapses mid-route.', when: inField('transit', 'travel'), options: [
    { id: 'help', label: '🩺 Stop, call it in, and start CPR', perf: 6, stats: { happiness: 6 } },
    { id: 'divert', label: '📻 Radio it in and divert to help', perf: 4 },
  ] },

  /* ---------------- Business & finance ---------------- */
  { id: 'bz.quarterEnd', title: 'Quarter-End Pressure', text: 'Your boss asks you to book next quarter\'s revenue this quarter, "just this once."', when: inField('business'), options: [
    { id: 'no', label: '📏 Refuse politely', perf: -2, boss: -6 },
    { id: 'yes', label: '📈 Do it', perf: 4, boss: 6, risky: { chance: 0.15, text: 'The auditors found it. You were named in the restatement.', perf: -15, boss: -10, offense: 'falsifiedRecords' } },
  ] },
  { id: 'bz.client', title: 'The Big Client', text: 'Your biggest client wants a discount you know will hurt margins.', when: inField('business'), options: [
    { id: 'hold', label: '🤝 Hold the line and add value instead', check: 'smarts', perf: 5 },
    { id: 'give', label: '💸 Give them the discount', perf: 1, boss: -2 },
  ] },
  { id: 'bz.mba', title: 'Company-Paid MBA?', text: 'Your company will pay for an evening MBA if you stay three years after.', when: inField('business', 'tech'), options: [
    { id: 'yes', label: '🎓 Start the program next fall', stats: { stress: 6, smarts: 2 }, perf: 2, boss: 3 },
    { id: 'no', label: '🙅 Not now', perf: 0 },
  ] },

  /* ---------------- Tech, science & engineering ---------------- */
  { id: 'tc.outage', title: '3 a.m. Outage', text: 'Production is down and you\'re on call.', when: inField('tech'), options: [
    { id: 'fix', label: '💻 Fix it, then write the postmortem', check: 'smarts', perf: 7, stats: { stress: 6 } },
    { id: 'escalate', label: '📟 Wake up the senior engineer', perf: 2, coworkers: -2 },
  ] },
  { id: 'tc.ai', title: 'The New Tool', text: 'Leadership wants every team using an AI coding tool by next quarter.', when: inField('tech'), options: [
    { id: 'champion', label: '🚀 Volunteer to lead the rollout', perf: 5, boss: 4, stats: { stress: 4 } },
    { id: 'skeptic', label: '🧐 Raise concerns about quality', check: 'smarts', perf: 2, boss: -2 },
  ] },
  { id: 'tc.sideProject', title: 'Side Project', text: 'Your weekend side project is getting real users.', when: inField('tech'), options: [
    { id: 'monetize', label: '💳 Add a paid tier', money: 4000, stats: { stress: 4 }, risky: { chance: 0.15, text: 'Legal flagged it under your IP agreement. You had to hand it over.', money: -4000, boss: -4 } },
    { id: 'open', label: '🌐 Open-source it', stats: { happiness: 5 }, perf: 2 },
  ] },
  { id: 'sc.grant', title: 'Grant Deadline', text: 'The grant that funds your lab is due Friday, and the data isn\'t clean yet.', when: is('research', 'university', 'publicHealth'), options: [
    { id: 'honest', label: '📊 Submit what the data honestly shows', perf: 3 },
    { id: 'massage', label: '✏️ Leave out the inconvenient runs', perf: 6, risky: { chance: 0.15, text: 'A replication failed and a review board looked at your notebooks.', perf: -15, boss: -10 } },
  ] },

  /* ---------------- Education ---------------- */
  { id: 'ed.parent', title: 'The Parent Email', text: 'A parent sends a furious, all-caps email about their child\'s grade, cc\'ing the principal.', when: is('education'), options: [
    { id: 'meet', label: '📅 Invite them to meet in person', check: 'smarts', perf: 4 },
    { id: 'principal', label: '📨 Forward it to the principal', perf: 1, boss: -1 },
  ] },
  { id: 'ed.student', title: 'A Student in Trouble', text: 'A quiet student wrote something in an essay that worries you.', when: is('education', 'university', 'childcare'), options: [
    { id: 'counselor', label: '🫂 Walk them to the counselor', perf: 4, stats: { happiness: 4 } },
    { id: 'note', label: '📝 Email the counselor about it', perf: 2 },
  ] },
  { id: 'ed.supplies', title: 'Out-of-Pocket Supplies', text: 'Your classroom budget ran out in October.', when: is('education', 'childcare'), options: [
    { id: 'buy', label: '🛒 Buy supplies yourself', money: -400, stats: { happiness: 2 } },
    { id: 'wishlist', label: '📋 Post a wish list for parents', perf: 2 },
  ] },

  /* ---------------- Service, arts & sports ---------------- */
  { id: 'sv.review', title: 'Viral Review', text: 'A one-star review naming you is trending on local social media.', when: inField('service'), options: [
    { id: 'respond', label: '💬 Reply professionally', check: 'smarts', perf: 3 },
    { id: 'ignore', label: '📵 Ignore it', stats: { stress: 4 } },
  ] },
  { id: 'sv.tips', title: 'Big Tipper', text: 'A regular leaves you a $500 tip with a note: "You made my year."', when: inField('service'), options: [
    { id: 'keep', label: '💵 Keep it', money: 500, stats: { happiness: 6 } },
    { id: 'share', label: '🫶 Share it with the kitchen', money: 150, coworkers: 10, stats: { happiness: 5 } },
  ] },
  { id: 'ar.audition', title: 'Big Audition', text: 'You landed an audition that could change everything. It\'s the same day as a paying gig.', when: inField('arts'), options: [
    { id: 'audition', label: '🎭 Go to the audition', stats: { stress: 6 }, risky: { chance: 0.25, text: 'You got the part!', perf: 12, money: 8000 } },
    { id: 'gig', label: '💵 Keep the paying gig', money: 600 },
  ] },
  { id: 'ar.injury', title: 'Playing Hurt', text: 'Your coach wants you back in the lineup on a bad ankle.', when: is('athletics'), options: [
    { id: 'play', label: '🏟️ Tape it and play', perf: 5, risky: { chance: 0.3, text: 'It got worse. Season over.', perf: -8, injury: true } },
    { id: 'rest', label: '🧊 Sit out two weeks', perf: -2, stats: { health: 2 } },
  ] },

  /* ---------------- Law & government ---------------- */
  { id: 'lw.client', title: 'A Client Lies', text: 'Mid-trial, you realize your client lied to you about a key fact.', when: inField('law'), options: [
    { id: 'ethics', label: '⚖️ Follow the ethics rules and correct the record', perf: 2, stats: { stress: 6 } },
    { id: 'ignore', label: '🙈 Pretend you didn\'t notice', perf: 3, risky: { chance: 0.15, text: 'The bar opened an inquiry.', perf: -10, boss: -6 } },
  ] },
  { id: 'lw.billing', title: 'Billable Hours', text: 'You\'re 200 hours short of your target and the partner noticed.', when: is('law'), options: [
    { id: 'grind', label: '⏰ Grind through weekends', perf: 5, stats: { stress: 10 } },
    { id: 'pad', label: '🧾 Round up your time entries', perf: 4, risky: { chance: 0.1, text: 'A client audited their bills. The firm was not happy.', perf: -12, boss: -12 } },
  ] },
  { id: 'gv.foia', title: 'Records Request', text: 'A reporter\'s public-records request covers emails that would embarrass your director.', when: inField('government'), options: [
    { id: 'release', label: '📂 Release them as the law requires', perf: 2, boss: -6 },
    { id: 'slow', label: '🐢 Slow-walk it', boss: 4, risky: { chance: 0.2, text: 'The reporter sued and won. Your name was in the story.', perf: -6 } },
  ] },
];
