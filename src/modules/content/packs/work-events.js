/**
 * Work events, as decks the career module plays (career/WorkplaceEvents.js):
 *   work.everyday   any job (agencies, cities and the military add their own on top)
 *   work.field      events specific to a field of work
 *   work.moments    signature moments only one kind of job has; when you work in one of these
 *                   careers, your own moments come up before the generic ones
 *
 * Option fields:
 *   text                    what happened (the log line)
 *   perf, boss, coworkers   job adjustments (career:adjust)
 *   stats                   { stat: delta }
 *   money                   cash in (+) or out (−); income is taxable
 *   check                   stat that must clear ~55 or perf flips negative
 *   risky                   { chance, text, perf, boss, money, stats, injury, offense }
 * Event fields: when(state), minGrade, remote, sector, mgmt restrict when an event can appear.
 */
import { JOB_FIELDS } from '../../career/JobTrees.js';

const FIELD_OF = {};
for (const [field, def] of Object.entries(JOB_FIELDS)) for (const id of def.ids) FIELD_OF[id] = field;
const inField = (...fields) => (s) => fields.includes(FIELD_OF[s.career.job?.professionId]);
const is = (...ids) => (s) => ids.includes(s.career.job?.professionId);
const M = (id, professions, title, text, options) => ({ id: `moment.${id}`, signature: true, when: is(...professions), title, text, options });

const everyday = [
  { id: 'credit', title: 'Stolen Credit', text: 'Your manager presented your project to leadership as their own idea.', options: [
    { id: 'confront', label: '🗣️ Raise it privately with your manager', text: 'You raised it with your manager one on one.', check: 'smarts', perf: 2, boss: -4 },
    { id: 'skip', label: '⬆️ Email leadership the timeline', text: 'You sent leadership the timeline. Your manager knows exactly who sent it.', perf: 5, boss: -12, risky: { chance: 0.2, text: 'Leadership sided with your manager. You were labeled "not a team player."', perf: -6 } },
    { id: 'let', label: '🤐 Let it go', text: 'You let it go, but it still stings.', stats: { happiness: -4 } },
  ] },
  { id: 'reorg', title: 'Reorganization', text: 'A reorg puts your team under a new director from a rival division.', options: [
    { id: 'ally', label: '🤝 Book a 1:1 and learn their priorities', text: 'You booked a 1:1 with the new director and learned what they care about.', perf: 3, boss: 6 },
    { id: 'head', label: '🙇 Keep your head down', text: 'You kept your head down and waited to see how the new director operates.', perf: 0 },
    { id: 'look', label: '🔎 Quietly start interviewing elsewhere', text: 'You quietly took a couple of interviews. Just knowing you have options helps.', stats: { stress: -2 }, boss: -2 },
  ] },
  { id: 'harass', title: 'Inappropriate Comments', text: 'A senior colleague keeps making comments about a junior coworker\'s appearance. She looks miserable.', options: [
    { id: 'report', label: '📋 Report it to HR', text: 'You reported it to HR. Your coworker thanked you quietly.', coworkers: 4, boss: -2, stats: { happiness: 2 } },
    { id: 'intervene', label: '✋ Call it out in the moment', text: 'You called it out in front of everyone. The comments stopped.', coworkers: 6, boss: -4 },
    { id: 'ignore', label: '🙈 Stay out of it', text: 'You stayed out of it, and felt worse about it every time you saw her.', stats: { happiness: -3 } },
  ] },
  { id: 'overtime', title: 'Crunch Time', text: 'A big deadline means six weeks of nights and weekends.', options: [
    { id: 'all', label: '🔥 Go all in', text: 'Six weeks of nights and weekends. The deadline was met, and you\'re exhausted.', perf: 8, boss: 5, stats: { stress: 12, health: -2 } },
    { id: 'boundaries', label: '⏰ Do your hours and protect your evenings', text: 'You did your hours and protected your evenings. Some people noticed.', perf: -2, stats: { stress: -2 } },
  ] },
  { id: 'expense', title: 'Expense Report', text: 'Your team lead "rounds up" everyone\'s expense reports and suggests you do the same.', options: [
    { id: 'honest', label: '🧾 File honest receipts', text: 'You filed honest receipts.', perf: 1 },
    { id: 'pad', label: '💸 Pad yours a little', text: 'You padded your expense report a little.', money: 1800, risky: { chance: 0.15, text: 'An audit flagged your reports.', perf: -12, boss: -15, offense: 'expenseFraud' } },
  ] },
  { id: 'training', title: 'Leadership Course', text: 'HR offers a spot in a week-long leadership program.', options: [
    { id: 'go', label: '🎓 Attend', text: 'You spent a week in the leadership program and came back with new ideas.', perf: 4, boss: 3, stats: { smarts: 2 } },
    { id: 'pass', label: '📅 Too busy right now', text: 'You passed on the leadership course this year.', perf: 0 },
  ] },
  { id: 'conference', title: 'Conference Talk', text: 'You are invited to speak at an industry conference.', options: [
    { id: 'speak', label: '🎤 Give the talk', text: 'You gave the talk.', check: 'smarts', perf: 6, boss: 3, stats: { stress: 4 } },
    { id: 'decline', label: '🙅 Decline politely', text: 'You politely declined the invitation.', perf: 0 },
  ] },
  { id: 'poach', title: 'Recruiter Call', text: 'A recruiter says a competitor will pay you 20% more.', options: [
    { id: 'counter', label: '💼 Use it to ask for a counteroffer', text: 'You told your boss about the offer. They didn\'t match it, and now they wonder whether you\'re leaving.', boss: -3, risky: { chance: 0.6, text: 'They matched it with a retention bonus.', money: 5000, boss: 0 } },
    { id: 'loyal', label: '🏢 Tell your boss you turned it down', text: 'You told your boss you turned the recruiter down. They appreciated it.', boss: 6 },
    { id: 'ignore', label: '📵 Ignore it', text: 'You let the call go to voicemail.', perf: 0 },
  ] },
  { id: 'coworkerSick', title: 'Covering for a Sick Coworker', text: 'A teammate is out for chemo. Someone has to pick up her accounts.', options: [
    { id: 'cover', label: '🫂 Volunteer to cover', text: 'You took over her accounts. The team won\'t forget it.', perf: 4, coworkers: 10, stats: { stress: 6 } },
    { id: 'split', label: '🧮 Push for the work to be split evenly', text: 'You got the work split evenly across the team.', coworkers: 3, perf: 1 },
  ] },
  { id: 'safety', title: 'Safety Shortcut', text: 'Your supervisor wants you to skip a safety step to hit today\'s target.', when: (s) => ['trades', 'trucking', 'plumbing', 'publicWorks', 'culinary', 'retail'].includes(s.career.job?.professionId), options: [
    { id: 'refuse', label: '🦺 Refuse and do it right', text: 'You did it by the book. The target slipped, but nobody got hurt.', perf: -1, boss: -4, coworkers: 4 },
    { id: 'skip', label: '⏩ Skip it this once', text: 'You skipped the step and hit the target. Nothing went wrong this time.', perf: 3, risky: { chance: 0.15, text: 'Something went wrong. You were hurt.', perf: -4, injury: true } },
  ] },
  { id: 'customer', title: 'The Customer from Hell', text: 'A furious customer is screaming at a teenage coworker over a coupon.', when: (s) => ['retail', 'hospitality', 'culinary', 'cosmetology', 'realestate', 'insurance'].includes(s.career.job?.professionId), options: [
    { id: 'step', label: '🛡️ Step in and take over', text: 'You stepped in and took the heat. Your coworker won\'t forget it.', coworkers: 8, perf: 3 },
    { id: 'manager', label: '📞 Get the manager', text: 'You fetched the manager, who sorted it out.', perf: 1 },
  ] },
  { id: 'remoteSlack', title: 'Always Online', text: 'Your status light is green all day. Your manager pings you at 9 p.m. "just checking in."', when: (s) => Boolean(s.career.job?.remote), options: [
    { id: 'answer', label: '💬 Answer right away', text: 'You answered right away. Your manager loves it; your evenings don\'t.', boss: 4, stats: { stress: 5 } },
    { id: 'morning', label: '🌙 Reply in the morning', text: 'You answered in the morning. The world kept turning.', boss: -2, stats: { stress: -3 } },
  ] },
  { id: 'budgetCut', title: 'Budget Cut', text: 'Your department must cut 10%. You are asked who on your team should go.', when: (s) => (s.career.job?.grade ?? 0) >= 6, options: [
    { id: 'merit', label: '📊 Rank by performance, honestly', text: 'You ranked the team honestly by performance. It was the right call, and it was miserable.', perf: 4, coworkers: -6, stats: { stress: 6 } },
    { id: 'self', label: '🙋 Offer to cut your own bonus instead', text: 'You gave up your bonus to save a job. The team heard about it.', perf: 2, money: -4000, coworkers: 8 },
    { id: 'push', label: '🛑 Push back on the cut', text: 'You pushed back on the cut.', boss: -6, check: 'smarts', perf: 3 },
  ] },
  { id: 'award', title: 'Employee of the Quarter', text: 'Your coworkers nominated you for employee of the quarter.', options: [
    { id: 'accept', label: '🏆 Accept graciously', text: 'You accepted the award: a plaque, a gift card and your photo on the wall.', perf: 3, boss: 3, stats: { happiness: 5 }, money: 500 },
    { id: 'share', label: '🫶 Credit the team in your speech', text: 'You gave the team the credit in your speech. They cheered louder than for anyone.', coworkers: 8, stats: { happiness: 4 }, money: 500 },
  ] },
  { id: 'affair', title: 'Office Romance', text: 'A charming coworker on another team keeps asking you to lunch.', options: [
    { id: 'lunch', label: '🥗 Go to lunch', text: 'You went to lunch. It was fun.', stats: { happiness: 4 }, risky: { chance: 0.15, text: 'Rumors spread around the office.', perf: -3, boss: -3 } },
    { id: 'pass', label: '🙅 Keep it professional', text: 'You kept it professional.', perf: 0 },
  ] },
  { id: 'layoffRumor', title: 'Layoff Rumors', text: 'Rumors say your team is on the chopping block.', options: [
    { id: 'visible', label: '📈 Make your wins visible', text: 'You made sure leadership saw every win your team had.', perf: 5, stats: { stress: 6 } },
    { id: 'network', label: '🔗 Update your résumé and network', text: 'You updated your résumé and caught up with old contacts, just in case.', stats: { stress: -2 } },
  ] },
  { id: 'mistake', title: 'Your Mistake', text: 'You discover a mistake you made last month cost the company money. Nobody has noticed.', options: [
    { id: 'own', label: '🙋 Own it and fix it', text: 'You owned the mistake and fixed it. Your boss respected that.', perf: -2, boss: 5, stats: { happiness: 2 } },
    { id: 'hide', label: '🤫 Quietly fix it and say nothing', text: 'You fixed it quietly and said nothing.', perf: 1, risky: { chance: 0.25, text: 'It came out in a review. Hiding it was worse than the mistake.', perf: -8, boss: -10 } },
  ] },
  { id: 'holiday', title: 'Holiday Party', text: 'The open bar at the holiday party is flowing.', options: [
    { id: 'mingle', label: '🥂 Mingle with leadership', text: 'You worked the room and had real conversations with leadership.', boss: 4, coworkers: 2 },
    { id: 'wild', label: '🍸 Let loose', text: 'You let loose and had a great night.', stats: { happiness: 6 }, risky: { chance: 0.2, text: 'There are photos. HR had a conversation with you.', perf: -4, boss: -6 } },
    { id: 'skip', label: '🏠 Skip it', text: 'You skipped the party. A few people noticed you weren\'t there.', coworkers: -2 },
  ] },
];

const field = [
  /* ---------------- Any field: good news ---------------- */
  { id: 'any.spotBonus', title: 'Spot Bonus', text: 'Your manager put you in for a spot bonus after a great quarter.', when: (s) => s.career.job?.sector === 'private', options: [
    { id: 'thanks', label: '🙏 Say thanks and keep going', text: 'A $2,500 spot bonus landed in your next paycheck.', money: 2500, boss: 3, stats: { happiness: 4 } },
    { id: 'team', label: '🫶 Ask that the team share it', text: 'Your manager split it; the team noticed who asked.', money: 1000, coworkers: 8, stats: { happiness: 4 } },
  ] },
  { id: 'any.referral', title: 'Referral Bonus', text: 'A friend you referred just got hired. HR owes you a referral bonus.', when: (s) => s.career.job?.sector === 'private', options: [
    { id: 'collect', label: '💵 Collect it', text: '$3,000 for a good hire. Your friend is already thriving.', money: 3000, coworkers: 2 },
  ] },
  /* ---------------- Health & social care ---------------- */
  { id: 'hc.shortStaffed', title: 'Short-Staffed Shift', text: 'Two people called out. You have twice the patients you can safely handle.', when: inField('health'), options: [
    { id: 'push', label: '🏃 Run the whole shift and cover everyone', text: 'Everyone got their meds on time. You didn\'t eat until 9 p.m.', perf: 5, coworkers: 6, stats: { stress: 10, health: -2 } },
    { id: 'escalate', label: '📋 Document it and call the supervisor', text: 'The supervisor pulled a float nurse. Your report went up the chain.', perf: 2, boss: -2, stats: { stress: 3 } },
  ] },
  { id: 'hc.familyAnger', title: 'Angry Family', text: 'A patient\'s son is shouting at you about wait times and filming on his phone.', when: inField('health'), options: [
    { id: 'calm', label: '🧘 De-escalate calmly', text: 'You knelt down, explained the delay and got him a coffee. He apologized later.', check: 'smarts', perf: 4 },
    { id: 'security', label: '🛡️ Call security', text: 'Security walked him out. The video never surfaced.', perf: 1 },
  ] },
  { id: 'hc.error', title: 'Near Miss', text: 'You caught a medication error just before it reached a patient. A colleague made it.', when: inField('health'), options: [
    { id: 'report', label: '📝 File a safety report', text: 'The safety committee changed the labeling process. Your colleague was cool to you for a while.', perf: 4, coworkers: -3 },
    { id: 'quiet', label: '🤫 Fix it and talk to them privately', text: 'They were grateful and careful after that.', coworkers: 5, risky: { chance: 0.15, text: 'It happened again, and the review found you knew.', perf: -8, boss: -6 } },
  ] },
  { id: 'hc.thankYou', title: 'A Thank-You Card', text: 'A patient you cared for last year came back to thank you. They\'re cancer-free.', when: inField('health'), options: [
    { id: 'keep', label: '💌 Pin it to your locker', text: 'Some days are worth the whole job.', stats: { happiness: 8, stress: -4 } },
  ] },

  /* ---------------- Public safety & security ---------------- */
  { id: 'ps.bodycam', title: 'Bodycam Footage', text: 'Footage of a tense arrest you made is all over local news. It looks worse than it was.', when: inField('safety', 'federalLE'), options: [
    { id: 'statement', label: '🎙️ Let the department release the full video', text: 'The full video calmed things down. The chief backed you.', perf: 2, boss: 2, stats: { stress: 6 } },
    { id: 'quiet', label: '🤐 Keep your head down', text: 'The story faded after a week. The comments didn\'t.', stats: { stress: 8 } },
  ] },
  { id: 'ps.partner', title: 'Your Partner', text: 'Your partner has been showing up smelling of alcohol.', when: inField('safety', 'federalLE', 'corrections'), options: [
    { id: 'talk', label: '🫂 Talk to them and point them to the peer support team', text: 'They got into a program. Six months sober and back on the street with you.', coworkers: 4, stats: { happiness: 2 } },
    { id: 'report', label: '📋 Report it to the sergeant', text: 'They were put on desk duty. Some of the squad stopped talking to you.', perf: 3, coworkers: -6 },
    { id: 'cover', label: '🙈 Cover for them', text: 'Nothing happened. This time.', coworkers: 6, risky: { chance: 0.25, text: 'They crashed a cruiser. You were asked what you knew.', perf: -10, boss: -10 } },
  ] },
  { id: 'ps.overtime', title: 'Overtime Detail', text: 'A stadium security detail pays time and a half all weekend.', when: inField('safety', 'corrections'), options: [
    { id: 'take', label: '💵 Take every shift', text: 'Three weekends of overtime: about $3,200 before taxes.', money: 3200, stats: { stress: 6 } },
    { id: 'family', label: '🏠 Stay home with family', text: 'Your kid\'s soccer game was worth more than time and a half.', stats: { happiness: 3 } },
  ] },

  /* ---------------- Trades, construction & transport ---------------- */
  { id: 'tr.cashJob', title: 'Cash Side Job', text: 'A homeowner offers $2,500 cash for a weekend job "off the books."', when: inField('trades', 'construction'), options: [
    { id: 'take', label: '💵 Take it and report it', text: 'Good money for a weekend. You reported it, like an honest contractor.', money: 2500, stats: { stress: 3 } },
    { id: 'pass', label: '🙅 Pass; you need the weekend', text: 'You slept in on Saturday.', stats: { happiness: 2 } },
  ] },
  { id: 'tr.inspection', title: 'Failed Inspection', text: 'The city inspector failed your work over something you\'re sure is fine.', when: inField('trades', 'construction'), options: [
    { id: 'redo', label: '🔧 Redo it to the inspector\'s reading', text: 'It passed on the reinspection. Two days lost.', perf: 2, stats: { stress: 3 } },
    { id: 'argue', label: '📖 Pull out the code book and argue', text: 'You showed him the code section. He signed off and nodded.', check: 'smarts', perf: 4, boss: 2 },
  ] },
  { id: 'tr.apprentice', title: 'The New Apprentice', text: 'Your foreman pairs you with a nervous apprentice who keeps making mistakes.', when: inField('trades', 'construction'), options: [
    { id: 'teach', label: '🧰 Take the time to teach them', text: 'By spring they were your best helper.', coworkers: 8, perf: 2 },
    { id: 'ask', label: '🙋 Ask for someone else', text: 'The foreman reassigned them. You worked faster, and alone.', perf: 1, coworkers: -3 },
  ] },
  { id: 'tv.weather', title: 'Storm Warning', text: 'Dispatch wants the run done tonight. The weather service just issued an ice storm warning.', when: inField('transit', 'travel'), options: [
    { id: 'go', label: '🚛 Run it carefully', text: 'You made the delivery at half speed on black ice.', perf: 4, risky: { chance: 0.12, text: 'You slid off the road. Nobody was hurt, but the equipment was.', perf: -6, injury: true } },
    { id: 'refuse', label: '🛑 Refuse: safety first', text: 'Dispatch grumbled, but two other drivers slid off that night.', perf: -2, boss: -3, stats: { stress: -2 } },
  ] },
  { id: 'tv.passenger', title: 'Medical Emergency on Board', text: 'A passenger collapses mid-route.', when: inField('transit', 'travel'), options: [
    { id: 'help', label: '🩺 Stop, call it in, and start CPR', text: 'Paramedics said your CPR saved his life.', perf: 6, stats: { happiness: 6 } },
    { id: 'divert', label: '📻 Radio it in and divert to help', text: 'An ambulance met you at the next stop. He made it.', perf: 4 },
  ] },

  /* ---------------- Business & finance ---------------- */
  { id: 'bz.quarterEnd', title: 'Quarter-End Pressure', text: 'Your boss asks you to book next quarter\'s revenue this quarter, "just this once."', when: inField('business'), options: [
    { id: 'no', label: '📏 Refuse politely', text: 'Your boss found someone else to do it.', perf: -2, boss: -6 },
    { id: 'yes', label: '📈 Do it', text: 'The quarter looked great.', perf: 4, boss: 6, risky: { chance: 0.15, text: 'The auditors found it. You were named in the restatement.', perf: -15, boss: -10, offense: 'falsifiedRecords' } },
  ] },
  { id: 'bz.client', title: 'The Big Client', text: 'Your biggest client wants a discount you know will hurt margins.', when: inField('business'), options: [
    { id: 'hold', label: '🤝 Hold the line and add value instead', text: 'You bundled in extra service; they renewed at full price.', check: 'smarts', perf: 5 },
    { id: 'give', label: '💸 Give them the discount', text: 'They stayed. The margin didn\'t.', perf: 1, boss: -2 },
  ] },
  { id: 'bz.mba', title: 'Company-Paid MBA?', text: 'Your company will pay for an evening MBA if you stay three years after.', when: inField('business', 'tech'), options: [
    { id: 'yes', label: '🎓 Start the program next fall', text: 'Two nights a week for three years. Your manager noticed.', stats: { stress: 6, smarts: 2 }, perf: 2, boss: 3 },
    { id: 'no', label: '🙅 Not now', text: 'You\'ll think about it next year.', perf: 0 },
  ] },

  /* ---------------- Tech, science & engineering ---------------- */
  { id: 'tc.outage', title: '3 a.m. Outage', text: 'Production is down and you\'re on call.', when: inField('tech'), options: [
    { id: 'fix', label: '💻 Fix it, then write the postmortem', text: 'Service was back by 4:10 a.m. Your postmortem became the template.', check: 'smarts', perf: 7, stats: { stress: 6 } },
    { id: 'escalate', label: '📟 Wake up the senior engineer', text: 'She fixed it in twenty minutes and was not thrilled about 3 a.m.', perf: 2, coworkers: -2 },
  ] },
  { id: 'tc.ai', title: 'The New Tool', text: 'Leadership wants every team using an AI coding tool by next quarter.', when: inField('tech'), options: [
    { id: 'champion', label: '🚀 Volunteer to lead the rollout', text: 'Your rollout guide got shared across the company.', perf: 5, boss: 4, stats: { stress: 4 } },
    { id: 'skeptic', label: '🧐 Raise concerns about quality', text: 'Your review checklist became required. Some called you a blocker.', check: 'smarts', perf: 2, boss: -2 },
  ] },
  { id: 'tc.sideProject', title: 'Side Project', text: 'Your weekend side project is getting real users.', when: inField('tech'), options: [
    { id: 'monetize', label: '💳 Add a paid tier', text: 'A few hundred paying users. Nice side income.', money: 4000, stats: { stress: 4 }, risky: { chance: 0.15, text: 'Legal flagged it under your IP agreement. You had to hand it over.', money: -4000, boss: -4 } },
    { id: 'open', label: '🌐 Open-source it', text: 'It got 2,000 GitHub stars and a mention in a newsletter.', stats: { happiness: 5 }, perf: 2 },
  ] },
  { id: 'sc.grant', title: 'Grant Deadline', text: 'The grant that funds your lab is due Friday, and the data isn\'t clean yet.', when: is('research', 'university', 'publicHealth'), options: [
    { id: 'honest', label: '📊 Submit what the data honestly shows', text: 'Reviewers liked the honesty. It was funded at a lower amount.', perf: 3 },
    { id: 'massage', label: '✏️ Leave out the inconvenient runs', text: 'The grant was funded.', perf: 6, risky: { chance: 0.15, text: 'A replication failed and a review board looked at your notebooks.', perf: -15, boss: -10 } },
  ] },

  /* ---------------- Education ---------------- */
  { id: 'ed.parent', title: 'The Parent Email', text: 'A parent sends a furious, all-caps email about their child\'s grade, cc\'ing the principal.', when: is('education'), options: [
    { id: 'meet', label: '📅 Invite them to meet in person', text: 'Face to face, the parent calmed down. The kid\'s grades went up.', check: 'smarts', perf: 4 },
    { id: 'principal', label: '📨 Forward it to the principal', text: 'The principal handled it, and now you owe her one.', perf: 1, boss: -1 },
  ] },
  { id: 'ed.student', title: 'A Student in Trouble', text: 'A quiet student wrote something in an essay that worries you.', when: is('education', 'university', 'childcare'), options: [
    { id: 'counselor', label: '🫂 Walk them to the counselor', text: 'They got help in time. Years later they wrote to thank you.', perf: 4, stats: { happiness: 4 } },
    { id: 'note', label: '📝 Email the counselor about it', text: 'The counselor followed up the next day.', perf: 2 },
  ] },
  { id: 'ed.supplies', title: 'Out-of-Pocket Supplies', text: 'Your classroom budget ran out in October.', when: is('education', 'childcare'), options: [
    { id: 'buy', label: '🛒 Buy supplies yourself', text: '$400 of glue sticks, paper and snacks. Every teacher does it.', money: -400, stats: { happiness: 2 } },
    { id: 'wishlist', label: '📋 Post a wish list for parents', text: 'Parents cleared the list in two days.', perf: 2 },
  ] },

  /* ---------------- Service, arts & sports ---------------- */
  { id: 'sv.review', title: 'Viral Review', text: 'A one-star review naming you is trending on local social media.', when: inField('service'), options: [
    { id: 'respond', label: '💬 Reply professionally', text: 'Your gracious reply got more likes than the review.', check: 'smarts', perf: 3 },
    { id: 'ignore', label: '📵 Ignore it', text: 'It blew over in a week.', stats: { stress: 4 } },
  ] },
  { id: 'sv.tips', title: 'Big Tipper', text: 'A regular leaves you a $500 tip with a note: "You made my year."', when: inField('service'), options: [
    { id: 'keep', label: '💵 Keep it', text: 'You treated yourself to a nice dinner, on the other side of the counter.', money: 500, stats: { happiness: 6 } },
    { id: 'share', label: '🫶 Share it with the kitchen', text: 'The cooks bought you a beer after close.', money: 150, coworkers: 10, stats: { happiness: 5 } },
  ] },
  { id: 'ar.audition', title: 'Big Audition', text: 'You landed an audition that could change everything. It\'s the same day as a paying gig.', when: inField('arts'), options: [
    { id: 'audition', label: '🎭 Go to the audition', text: 'You gave the best read of your life.', stats: { stress: 6 }, risky: { chance: 0.25, text: 'You got the part!', perf: 12, money: 8000 } },
    { id: 'gig', label: '💵 Keep the paying gig', text: 'A paycheck is a paycheck.', money: 600 },
  ] },
  { id: 'ar.injury', title: 'Playing Hurt', text: 'Your coach wants you back in the lineup on a bad ankle.', when: is('athletics'), options: [
    { id: 'play', label: '🏟️ Tape it and play', text: 'You played through it and won.', perf: 5, risky: { chance: 0.3, text: 'It got worse. Season over.', perf: -8, injury: true } },
    { id: 'rest', label: '🧊 Sit out two weeks', text: 'You came back stronger.', perf: -2, stats: { health: 2 } },
  ] },

  /* ---------------- Law & government ---------------- */
  { id: 'lw.client', title: 'A Client Lies', text: 'Mid-trial, you realize your client lied to you about a key fact.', when: inField('law'), options: [
    { id: 'ethics', label: '⚖️ Follow the ethics rules and correct the record', text: 'You did the right thing, and the judge noticed.', perf: 2, stats: { stress: 6 } },
    { id: 'ignore', label: '🙈 Pretend you didn\'t notice', text: 'The case moved on.', perf: 3, risky: { chance: 0.15, text: 'The bar opened an inquiry.', perf: -10, boss: -6 } },
  ] },
  { id: 'lw.billing', title: 'Billable Hours', text: 'You\'re 200 hours short of your target and the partner noticed.', when: is('law'), options: [
    { id: 'grind', label: '⏰ Grind through weekends', text: 'You hit your hours. You also forgot what your apartment looks like.', perf: 5, stats: { stress: 10 } },
    { id: 'pad', label: '🧾 Round up your time entries', text: 'The numbers looked fine.', perf: 4, risky: { chance: 0.1, text: 'A client audited their bills. The firm was not happy.', perf: -12, boss: -12 } },
  ] },
  { id: 'gv.foia', title: 'Records Request', text: 'A reporter\'s public-records request covers emails that would embarrass your director.', when: inField('government'), options: [
    { id: 'release', label: '📂 Release them as the law requires', text: 'The story ran. Your director was furious, and the lawyers said you were right.', perf: 2, boss: -6 },
    { id: 'slow', label: '🐢 Slow-walk it', text: 'The request sat in a queue for months.', boss: 4, risky: { chance: 0.2, text: 'The reporter sued and won. Your name was in the story.', perf: -6 } },
  ] },
];

const moments = [
  /* ---------------- Health & care ---------------- */
  M('dental.phobic', ['dentistry', 'dentalHygiene'], 'A Terrified Patient', 'A grown man is gripping the chair and shaking. He hasn\'t seen a dentist in fifteen years because of a childhood experience.', [
    { id: 'slow', label: '🫶 Go slowly: explain every step, let him raise a hand to stop', text: 'It took twice as long. He booked his next cleaning on the way out — and brought his wife.', perf: 4, stats: { happiness: 5 } },
    { id: 'sedate', label: '💉 Offer sedation', text: 'He slept through it. Efficient, if not exactly a breakthrough.', perf: 2 },
  ]),
  M('dental.upsell', ['dentistry'], 'The Production Target', 'The practice owner wants more crowns this quarter and hints that "borderline" teeth count.', [
    { id: 'honest', label: '🦷 Only recommend what\'s needed', text: 'Your numbers were average. Your patients trust you completely.', perf: -2, boss: -4, stats: { happiness: 3 } },
    { id: 'upsell', label: '💰 Recommend crowns on every borderline tooth', text: 'Production up 30%. The bonus was nice.', money: 9000, boss: 5, risky: { chance: 0.15, text: 'A patient got a second opinion and filed a complaint with the dental board.', perf: -10, offense: 'healthcareFraud' } },
  ]),
  M('vet.euthanasia', ['veterinary'], 'Saying Goodbye', 'A family brings in their 15-year-old dog. The kids want you to "fix him." He\'s in pain and his kidneys are failing.', [
    { id: 'gentle', label: '🕯️ Talk them through it gently', text: 'You explained, they cried, and you sat on the floor with the dog at the end. The family sent a card a month later.', perf: 3, stats: { happiness: -2, stress: 4 } },
    { id: 'treat', label: '💊 Offer aggressive treatment', text: 'Three more weeks, mostly in the hospital. The bill was enormous.', money: 2000, stats: { stress: 3 } },
  ]),
  M('vet.exotic', ['veterinary'], 'Something Unusual', 'Someone carries in a cardboard box. Inside: an injured red-tailed hawk they found by the highway.', [
    { id: 'treat', label: '🦅 Stabilize it and call wildlife rehab', text: 'You splinted the wing. Six weeks later the rehab center sent a video of it flying free.', perf: 3, coworkers: 4, stats: { happiness: 6 } },
    { id: 'refer', label: '📞 Refer them straight to wildlife rehab', text: 'The rehab center took it from there.', perf: 1 },
  ]),
  M('pt.plateau', ['physicalTherapy', 'occupationalTherapy'], 'The Plateau', 'A stroke patient you\'ve worked with for months has stopped improving and wants to quit therapy.', [
    { id: 'goal', label: '🎯 Set a goal that matters to her: holding her grandson', text: 'Two months later she held him for a photo. She framed it for your clinic wall.', perf: 5, stats: { happiness: 6 }, check: 'smarts' },
    { id: 'discharge', label: '📋 Discharge her to a home program', text: 'She went home with a sheet of exercises. You hope she does them.', perf: 1 },
  ]),
  M('slp.firstWord', ['speechPathology'], 'First Words', 'A four-year-old who\'s never spoken has been working with you for a year. Today he points at the bubbles.', [
    { id: 'wait', label: '🫧 Wait, and let him find the word', text: '"Bub." His mother started crying. So did you.', perf: 5, stats: { happiness: 10 } },
  ]),
  M('diet.fad', ['dietitian'], 'The Fad Diet', 'A client arrives convinced that an influencer\'s "carnivore cleanse" will cure her diabetes.', [
    { id: 'meet', label: '🤝 Meet her halfway with a plan she\'ll actually follow', text: 'Her blood sugar came down. She still eats a lot of steak.', perf: 4, check: 'smarts' },
    { id: 'lecture', label: '📚 Walk her through the evidence', text: 'She nodded politely and cancelled her follow-up.', perf: -1 },
  ]),
  M('optometry.tumor', ['optometry'], 'Something Behind the Eye', 'A routine eye exam: the patient just wants new glasses, but the optic disc looks swollen.', [
    { id: 'refer', label: '🚨 Send him for urgent imaging today', text: 'The MRI found a brain tumor — early, and operable. He came back a year later to say thank you.', perf: 6, stats: { happiness: 6 } },
    { id: 'recheck', label: '🗓️ Schedule a recheck in a few months', text: 'At the recheck, it was worse.', perf: -6, stats: { stress: 6 } },
  ]),
  M('chiro.claims', ['chiropractic'], 'The Miracle Claim', 'A patient asks if adjustments can cure her son\'s asthma. Another chiropractor in town advertises exactly that.', [
    { id: 'honest', label: '🙅 Tell her it can\'t, and send her to a pediatrician', text: 'She was disappointed. Her son\'s doctor thanked you.', perf: 2, stats: { happiness: 2 } },
    { id: 'sell', label: '💵 Sell her a 20-visit package', text: 'Easy money.', money: 3000, risky: { chance: 0.2, text: 'The licensing board fined you for false health claims.', perf: -8, money: -5000 } },
  ]),
  M('pharm.forgery', ['pharmacy'], 'A Suspicious Prescription', 'A customer hands over an oxycodone prescription. The prescriber number doesn\'t match the format, and the handwriting looks shaky.', [
    { id: 'verify', label: '📞 Call the prescriber to verify', text: 'The doctor\'s office had never heard of the patient. Police picked up a forger working three pharmacies.', perf: 5, boss: 3 },
    { id: 'fill', label: '💊 Fill it — the line is long', text: 'You filled it and moved on.', risky: { chance: 0.4, text: 'It was forged. Drug-enforcement investigators came asking how it got past you.', perf: -10, boss: -6 } },
  ]),
  M('care.lonely', ['caregiving'], 'The Lonely Client', 'The elderly man you care for has no visitors. Today he asks if you\'ll stay an extra hour, unpaid, to finish a chess game.', [
    { id: 'stay', label: '♟️ Stay and finish the game', text: 'He won, and laughed for the first time in weeks.', stats: { happiness: 6 }, coworkers: 2 },
    { id: 'go', label: '🚪 Head to your next client', text: 'You left on time. He waved from the window.', perf: 1 },
  ]),
  M('imaging.incidental', ['imaging'], 'The Incidental Finding', 'Scanning an ankle, you notice something on the edge of the image that shouldn\'t be there.', [
    { id: 'flag', label: '🚩 Flag it for the radiologist', text: 'It was an early bone tumor. The radiologist made sure your name was on the thank-you.', perf: 5 },
    { id: 'ignore', label: '🤷 Stay in your lane', text: 'Not your job to read the films.', risky: { chance: 0.3, text: 'Months later the patient came back, sicker. The review asked why nobody flagged it.', perf: -6 } },
  ]),
  M('rt.code', ['respiratoryTherapy'], 'The Airway', 'In the ICU, a patient\'s oxygen is crashing and the breathing tube looks displaced. The physician is two floors away.', [
    { id: 'act', label: '🫁 Bag the patient and call the code', text: 'You kept him oxygenated until the team arrived. The intensivist asked for you by name the next week.', perf: 6, check: 'smarts' },
    { id: 'wait', label: '📞 Page the doctor and wait', text: 'The doctor got there in four minutes. Long minutes.', perf: 0, stats: { stress: 6 } },
  ]),
  /* ---------------- Travel & transport ---------------- */
  M('atc.runway', ['airTrafficControl'], 'Two Planes, One Runway', 'A departing jet is rolling when you see another aircraft crossing the far end of the runway without clearance.', [
    { id: 'abort', label: '🛑 "Cancel takeoff clearance!"', text: 'The jet stopped with room to spare. The safety board called it a textbook save.', perf: 8, stats: { stress: 10 }, check: 'smarts' },
    { id: 'expedite', label: '📻 Tell the crossing plane to expedite', text: 'It cleared with seconds to spare. You didn\'t sleep that night.', perf: -2, stats: { stress: 14 } },
  ]),
  M('atc.storm', ['airTrafficControl'], 'Thunderstorm Line', 'A line of storms just shut half your arrival routes. Forty planes are holding, some low on fuel.', [
    { id: 'prioritize', label: '⛽ Sort them by fuel and bring the low ones in first', text: 'Every plane landed safely. Your supervisor bought you dinner.', perf: 6, stats: { stress: 8 }, check: 'smarts' },
    { id: 'divert', label: '↪️ Divert half to other airports', text: 'Safe, if unpopular with a lot of passengers.', perf: 2, stats: { stress: 4 } },
  ]),
  M('fa.medical', ['flightAttendant'], 'Is There a Doctor on Board?', 'Somewhere over the ocean, a passenger collapses in the aisle. No doctor answers the call.', [
    { id: 'aed', label: '❤️ Grab the AED and start CPR', text: 'The AED shocked once. He was talking by the time you landed. The airline gave you an award.', perf: 8, stats: { stress: 8 } },
    { id: 'divert', label: '✈️ Ask the captain to divert', text: 'You landed early. Paramedics took over.', perf: 3 },
  ]),
  M('fa.unruly', ['flightAttendant', 'cruise'], 'The Unruly Passenger', 'A drunk passenger is shouting at the people around him and refuses to sit down.', [
    { id: 'calm', label: '🧘 Calm him down', text: 'You crouched, talked quietly, and he fell asleep ten minutes later.', perf: 4, check: 'smarts' },
    { id: 'restrain', label: '🔗 Restrain him with help from passengers', text: 'He was met by police at the gate.', perf: 2, risky: { chance: 0.1, text: 'You wrenched your shoulder in the struggle.', injury: true } },
  ]),
  M('cruise.overboard', ['cruise'], 'Man Overboard', 'At 2 a.m. a passenger reports seeing someone fall from deck 9.', [
    { id: 'alarm', label: '🚨 Sound the alarm and throw a life ring', text: 'The ship turned around. A rescue boat pulled him out of the water alive.', perf: 7, stats: { stress: 8 } },
  ]),
  M('rail.signal', ['railroad', 'transit'], 'The Signal', 'The signal ahead shows clear, but you can see track workers near the rails around the bend.', [
    { id: 'slow', label: '🐢 Slow to a crawl and lay on the horn', text: 'They hadn\'t been told about your train. Dispatch got an earful — from you.', perf: 5 },
    { id: 'trust', label: '🚦 Trust the signal', text: 'They scrambled clear with feet to spare.', perf: -3, stats: { stress: 12 } },
  ]),
  M('paratransit.rider', ['paratransit'], 'The Regular', 'Your favorite rider, a retired teacher who uses a wheelchair, missed her pickup. She always calls when she\'ll be late.', [
    { id: 'check', label: '🚪 Knock and check on her', text: 'She\'d fallen and couldn\'t reach the phone. You called an ambulance and waited with her.', perf: 5, stats: { happiness: 4 } },
    { id: 'go', label: '📋 Mark a no-show and move on', text: 'You kept to schedule.', risky: { chance: 0.5, text: 'She\'d fallen. A neighbor found her the next day.', perf: -4, stats: { happiness: -8 } } },
  ]),
  M('marine.storm', ['merchantMarine'], 'Heavy Weather', 'A storm is building and containers on deck are straining against their lashings.', [
    { id: 'secure', label: '⛓️ Lead a team to re-lash them', text: 'Soaked and freezing, you got every container secured.', perf: 6, check: 'fitness', risky: { chance: 0.15, text: 'A wave knocked you into a railing.', injury: true } },
    { id: 'course', label: '🧭 Recommend changing course', text: 'The captain turned into the swell. A day late, nothing lost.', perf: 3 },
  ]),
  M('charter.weather', ['charterAviation'], 'The Client Is in a Hurry', 'A wealthy client insists you fly into a mountain airport tonight, in weather below your personal minimums.', [
    { id: 'no', label: '🙅 Refuse and fly in the morning', text: 'He was furious. In the morning he tipped you $2,000.', perf: 3, money: 2000 },
    { id: 'go', label: '🛩️ Fly it', text: 'You landed in sideways rain.', money: 3000, risky: { chance: 0.15, text: 'You ran off the end of the runway. The aviation authority pulled your licence pending review.', perf: -12, injury: true } },
  ]),
  /* ---------------- Safety, security & corrections ---------------- */
  M('tsa.bag', ['tsa'], 'Something in the Bag', 'An X-ray shows an odd shape in a carry-on: wires and a dense block.', [
    { id: 'stop', label: '🛑 Stop the line and call the bomb squad', text: 'A tangle of chargers wrapped around a block of cheese. Your supervisor said you did exactly right.', perf: 4 },
    { id: 'wave', label: '👋 It\'s probably electronics', text: 'It was. This time.', risky: { chance: 0.2, text: 'A covert test team planted it. You failed the test.', perf: -8 } },
  ]),
  M('pi.cheat', ['privateInvestigator'], 'The Photos', 'You\'ve got photos proving your client\'s husband is cheating — and you realize the client plans to use them for revenge, not divorce.', [
    { id: 'deliver', label: '📸 Deliver them; that\'s the job', text: 'You delivered the file and cashed the check.', money: 3000 },
    { id: 'warn', label: '⚠️ Deliver them with a referral to a divorce lawyer and a counselor', text: 'She took the referral. The divorce was ugly but legal.', perf: 3, stats: { happiness: 2 } },
  ]),
  M('pi.trespass', ['privateInvestigator'], 'The Gated Community', 'The subject of your insurance-fraud case lives behind a gate. A neighbor\'s back fence would give you a clear shot of him carrying lumber.', [
    { id: 'public', label: '🚗 Wait on the public road', text: 'Three days of waiting. You got him on the fourth, loading a truck.', perf: 4, money: 2000 },
    { id: 'fence', label: '🧗 Hop the fence', text: 'Great photos.', money: 2500, risky: { chance: 0.25, text: 'The neighbor called the police.', offense: 'trespass' } },
  ]),
  M('bail.skip', ['bailBonds'], 'The Skip', 'A client skipped court on a $50,000 bond. You have 90 days to find him or pay up.', [
    { id: 'hunt', label: '🔎 Work his family and social media', text: 'His cousin\'s Instagram gave him away. You brought him in on day 40.', money: 5000, check: 'smarts' },
    { id: 'pay', label: '💸 Write off the bond', text: 'An expensive lesson in who you bond out.', money: -8000 },
  ]),
  M('security.tailgate', ['privateSecurity'], 'The Tailgater', 'A well-dressed man without a badge slips in behind an employee and heads for the elevators.', [
    { id: 'stop', label: '✋ Stop him and check credentials', text: 'He was a "penetration tester" hired by the company. Your report made the executive summary.', perf: 5 },
    { id: 'let', label: '🙂 He looks like he belongs', text: 'You let it go.', risky: { chance: 0.4, text: 'He was a thief. Laptops vanished from the fourth floor.', perf: -8, boss: -6 } },
  ]),
  M('probation.relapse', ['probation'], 'One Dirty Test', 'A client who\'s been clean for a year and just got a good job tests positive.', [
    { id: 'treatment', label: '🩺 Increase treatment and testing instead of violating', text: 'He went back to meetings and stayed clean. He sends you a card every new year now.', perf: 3, stats: { happiness: 4 } },
    { id: 'violate', label: '📝 File a violation', text: 'He spent 30 days in jail and lost the job.', perf: 1, stats: { happiness: -3 } },
  ]),
  M('prison.contraband', ['privatePrisons', 'federalPrisons', 'corrections', 'jail'], 'The Package', 'An inmate\'s cousin offers you $2,000 to carry a "harmless" package in.', [
    { id: 'report', label: '🚫 Report the offer', text: 'Internal affairs set up a sting and broke up a smuggling ring.', perf: 6, boss: 4 },
    { id: 'carry', label: '📦 Carry it in', text: 'Easy money, once.', money: 2000, risky: { chance: 0.35, text: 'It was drugs. You were arrested at the gate.', offense: 'contraband' } },
  ]),
  M('forensics.mismatch', ['forensics'], 'The Mismatch', 'Detectives are certain they have their man. Your fingerprint analysis says the print isn\'t his.', [
    { id: 'report', label: '🔬 Report exactly what you found', text: 'Two months later the real offender was caught. The detectives grumbled; the DA thanked you.', perf: 5 },
    { id: 'inconclusive', label: '🤐 Call it "inconclusive"', text: 'The detectives were happy.', risky: { chance: 0.3, text: 'An audit found you\'d buried an exclusion. The lab pulled you from casework.', perf: -12, offense: 'falsifiedRecords' } },
  ]),
  M('warden.poacher', ['gameWarden'], 'Spotlights at Night', 'Headlights sweep a field at 2 a.m. — a classic poaching setup. You\'re alone and backup is an hour away.', [
    { id: 'plates', label: '📷 Get the plates and wait for backup', text: 'You caught them at the processor the next morning with three illegal deer.', perf: 5 },
    { id: 'confront', label: '🔦 Approach the truck', text: 'Two men with rifles, startled.', perf: 4, check: 'fitness', risky: { chance: 0.15, text: 'One of them shoved you into a ditch before fleeing.', injury: true } },
  ]),
  M('privateFire.contract', ['privateFire'], 'Not Our Client', 'A wildfire is approaching two houses: the one your company is paid to protect, and an uninsured neighbor\'s.', [
    { id: 'both', label: '🚒 Protect both', text: 'Both houses stood. Your company grumbled about the foam; the neighbor\'s kids drew you a picture.', perf: 2, boss: -3, stats: { happiness: 6 } },
    { id: 'client', label: '📜 Protect only the client', text: 'You saved the client\'s house and watched the neighbor\'s burn.', perf: 3, stats: { happiness: -6 } },
  ]),
  /* ---------------- Trades & field work ---------------- */
  M('weld.inspection', ['welding', 'ironworking'], 'The Weld Inspector', 'An inspector flags one of your welds on a bridge girder. You\'re sure it\'s fine, and redoing it means a day lost.', [
    { id: 'redo', label: '🔥 Grind it out and redo it', text: 'Passed. The foreman noticed you didn\'t argue.', perf: 3, boss: 3 },
    { id: 'argue', label: '🗣️ Argue for an ultrasonic test', text: 'The test came back clean. You were right.', perf: 2, check: 'smarts' },
  ]),
  M('iron.height', ['ironworking', 'craneOperator'], 'The Wind Picks Up', 'Thirty stories up, the wind is gusting past the safe limit. The superintendent wants the last beam set before quitting time.', [
    { id: 'stop', label: '🛑 Call it for the day', text: 'The beam went up the next morning in calm air.', perf: 2, boss: -2 },
    { id: 'set', label: '🏗️ Set the beam', text: 'It swung, but you got it in.', perf: 4, boss: 3, risky: { chance: 0.15, text: 'The load swung into the steel and you were thrown against your harness.', injury: true, perf: -4 } },
  ]),
  M('auto.upsell', ['automotive'], 'The Little Old Lady', 'An elderly customer brings in her car for an oil change. Your service writer wants you to "find" $1,500 of repairs.', [
    { id: 'honest', label: '🔧 Tell her what it actually needs', text: 'Oil change and a wiper blade. She brought her whole church group to your shop.', perf: 3, boss: -3, stats: { happiness: 3 } },
    { id: 'pad', label: '💵 Write it up big', text: 'A great ticket.', money: 400, risky: { chance: 0.2, text: 'Her grandson, a mechanic, checked the work and called the consumer protection office.', perf: -8 } },
  ]),
  M('line.storm', ['lineworker'], 'The Ice Storm', 'An ice storm took out power to 80,000 homes. You\'re on day four of sixteen-hour shifts.', [
    { id: 'keep', label: '⚡ Keep going until the lights are back', text: 'You restored a hospital and a nursing home. Neighbors brought the crew hot soup.', perf: 6, money: 6000, stats: { stress: 12, health: -3 } },
    { id: 'rest', label: '😴 Take your mandatory rest', text: 'You slept twelve hours and came back sharper.', perf: 2 },
  ]),
  M('hvac.carbon', ['hvac'], 'The Cracked Heat Exchanger', 'On a routine furnace check, your meter shows carbon monoxide near the vents. The family has a newborn.', [
    { id: 'shut', label: '🚨 Shut it down and get them out', text: 'A cracked heat exchanger. They called you an angel; your boss sold them a new furnace.', perf: 6, money: 500 },
    { id: 'patch', label: '🩹 Patch it and recommend a replacement', text: 'You patched it and left a quote.', risky: { chance: 0.25, text: 'The patch failed. The family ended up in the ER with CO poisoning.', perf: -12 } },
  ]),
  M('oil.blowout', ['oilGas'], 'Kick on the Rig', 'Pressure on the well is spiking — a kick. The driller hesitates.', [
    { id: 'shutIn', label: '🛑 Hit the blowout preventer', text: 'The well was shut in safely. A week of downtime, and every one of you went home.', perf: 6, boss: 2 },
    { id: 'drill', label: '⛏️ Let the driller handle it', text: 'He handled it. Barely.', stats: { stress: 10 } },
  ]),
  M('fishing.weather', ['fishing'], 'One More Haul', 'The catch has been thin all week. The forecast says a gale arrives in six hours; the skipper wants one more set.', [
    { id: 'set', label: '🎣 Make the set', text: 'Full nets, and you made port with an hour to spare.', money: 4000, risky: { chance: 0.2, text: 'The gale hit early. You were thrown across the deck hauling gear.', injury: true } },
    { id: 'run', label: '⚓ Argue to head in', text: 'The skipper grumbled. The gale was worse than forecast.', perf: 1 },
  ]),
  M('farm.drought', ['agriculture'], 'Drought Year', 'No rain for two months. You can buy expensive feed to keep the herd, or sell half now at rock-bottom prices.', [
    { id: 'feed', label: '🌾 Buy feed and hold on', text: 'The rains came in September. You kept your best stock.', money: -6000, perf: 3 },
    { id: 'sell', label: '🐄 Sell half the herd', text: 'It hurt to watch the trailers leave.', money: 5000, stats: { happiness: -4 } },
  ]),
  M('crane.load', ['craneOperator'], 'The Mislabeled Load', 'The rigger says the load is 8 tons. Your load moment indicator says 11 — right at your limit.', [
    { id: 'stop', label: '✋ Refuse until it\'s reweighed', text: 'It was 11.4 tons. You probably saved your crane and somebody\'s life.', perf: 6 },
    { id: 'lift', label: '🏗️ Lift it carefully', text: 'The boom groaned.', risky: { chance: 0.25, text: 'The crane tipped. Nobody died, but you\'ll be in depositions for years.', perf: -15 } },
  ]),
  M('solar.roof', ['renewableEnergy'], 'The Rotten Roof', 'Halfway through a solar install, you find the roof decking is rotten. The customer wants you to finish anyway.', [
    { id: 'stop', label: '🛑 Stop until it\'s repaired', text: 'The roofer replaced the decking; your panels went on solid. Five-star review.', perf: 4 },
    { id: 'finish', label: '🔩 Finish the install', text: 'Done on schedule.', money: 300, risky: { chance: 0.25, text: 'The first big storm pulled panels and roof off together.', perf: -8 } },
  ]),
  M('water.contamination', ['waterUtility'], 'The Test Result', 'A routine water test shows bacteria in one neighborhood\'s supply. Your manager wants to retest before telling anyone.', [
    { id: 'notice', label: '📢 Push for a boil-water notice now', text: 'The notice went out. The retest confirmed it. No one got sick.', perf: 5, boss: -2 },
    { id: 'retest', label: '🧪 Wait for the retest', text: 'Twenty-four hours.', risky: { chance: 0.35, text: 'Dozens of residents got sick before the retest came back. Regulators investigated.', perf: -10 } },
  ]),
  M('mfg.line', ['manufacturing'], 'Stop the Line', 'You spot a defect on parts coming off the line. Stopping the line costs $10,000 an hour.', [
    { id: 'stop', label: '🛑 Pull the cord', text: 'A bad batch of steel. You saved a recall; the plant manager shook your hand.', perf: 6 },
    { id: 'flag', label: '📝 Flag it for quality to review later', text: 'Quality reviewed it at the end of the shift.', risky: { chance: 0.3, text: 'Ten thousand bad parts shipped. The customer sent them all back.', perf: -6 } },
  ]),
  M('survey.line', ['surveying'], 'The Fence Line', 'Your survey shows the neighbor\'s new garage is four feet over your client\'s property line. Both families are watching you.', [
    { id: 'exact', label: '📐 Mark it exactly where it is', text: 'Lawyers got involved. Your survey held up in court.', perf: 4 },
    { id: 'fudge', label: '🤝 "Round" the line to keep the peace', text: 'Everyone shook hands.', risky: { chance: 0.25, text: 'A later survey found your error. Your license was put on probation.', perf: -10 } },
  ]),
  /* ---------------- Business, money & government ---------------- */
  M('actuary.pension', ['actuary'], 'The Model Says No', 'Your pension model shows the fund is far more underfunded than the board believes. The client wants "more optimistic" assumptions.', [
    { id: 'sign', label: '✍️ Sign only what you believe', text: 'The board raised contributions. Years later, your report is why the pensions still get paid.', perf: 4, boss: -3 },
    { id: 'bend', label: '📈 Use the rosier assumptions', text: 'The client was delighted.', money: 5000, risky: { chance: 0.2, text: 'Regulators found the assumptions indefensible. Your credential was suspended.', perf: -12 } },
  ]),
  M('accounting.cfo', ['accounting'], 'The CFO\'s Request', 'The CFO asks you to book next quarter\'s revenue early so the company makes its numbers.', [
    { id: 'refuse', label: '🙅 Refuse, and document it', text: 'He was cold for months. When the auditors came, you were the one with clean hands.', perf: 2, boss: -6 },
    { id: 'book', label: '📒 Book it', text: 'The quarter looked great.', money: 4000, risky: { chance: 0.25, text: 'The auditors caught it. You were named in the securities regulator\'s complaint.', offense: 'securitiesFraud' } },
  ]),
  M('revenue.audit', ['revenue'], 'The Audit', 'A small-business owner you\'re auditing clearly made honest mistakes — and owes $40,000 she can\'t pay.', [
    { id: 'plan', label: '🤝 Set up a payment plan and waive the penalties', text: 'She kept her shop open and has filed perfectly ever since.', perf: 2, stats: { happiness: 3 } },
    { id: 'full', label: '📋 Assess the full penalties', text: 'By the book.', perf: 3, stats: { happiness: -2 } },
  ]),
  M('benefits.claim', ['benefitsClaims'], 'The Borderline Claim', 'A veteran\'s disability claim is missing one document. Denying it is quick; tracking down the record takes days.', [
    { id: 'track', label: '🔎 Track down the record', text: 'You found it in a warehouse database. He got his benefits — and back pay.', perf: 3, stats: { happiness: 5 } },
    { id: 'deny', label: '📭 Deny it; he can appeal', text: 'Your numbers looked great this month.', perf: 2 },
  ]),
  M('sales.quota', ['sales'], 'The Last Day of the Quarter', 'You\'re $50,000 short of quota. A client will sign today if you promise a feature that doesn\'t exist yet.', [
    { id: 'promise', label: '🤞 Promise it', text: 'Signed. Quota hit, accelerator unlocked.', money: 8000, risky: { chance: 0.3, text: 'The client cancelled when the feature never shipped, and your manager clawed back the commission.', money: -8000, perf: -6 } },
    { id: 'honest', label: '🙅 Sell what exists', text: 'You missed quota by a hair. The client signed next quarter anyway.', perf: -2, boss: -2 },
  ]),
  M('hr.complaint', ['humanResources'], 'The Star\'s Complaint', 'Three employees have complained about the company\'s top salesman. Leadership asks you to "handle it quietly."', [
    { id: 'investigate', label: '🔍 Run a real investigation', text: 'The complaints were substantiated. He was let go, and two more people came forward to thank you.', perf: 4, boss: -4 },
    { id: 'bury', label: '🤐 Have a quiet word and close the file', text: 'Leadership was relieved.', risky: { chance: 0.3, text: 'One of the employees sued and your file became Exhibit A.', perf: -10 } },
  ]),
  M('pm.tenant', ['propertyManagement', 'realestate'], 'The Tenant Who Can\'t Pay', 'A tenant who\'s paid on time for six years lost her job and is two months behind. The owner wants her evicted.', [
    { id: 'plan', label: '🤝 Negotiate a payment plan with the owner', text: 'She caught up within the year and is still your best tenant.', perf: 3, stats: { happiness: 4 } },
    { id: 'evict', label: '📋 File the eviction', text: 'The unit was re-let in a month at higher rent.', money: 500, stats: { happiness: -4 } },
  ]),
  M('re.bidding', ['realestate'], 'The Bidding War', 'Your buyers love a house, and a rival offer just came in. They ask what they should do.', [
    { id: 'advise', label: '🧮 Talk them through what they can really afford', text: 'They capped their offer and lost the house — then found a better one a month later.', perf: 3, stats: { happiness: 3 } },
    { id: 'push', label: '🔥 Tell them to waive the inspection and go high', text: 'They won! Your commission was bigger, too.', money: 3000, risky: { chance: 0.25, text: 'The foundation was cracked. They blamed you, loudly, online.', perf: -6 } },
  ]),
  M('nonprofit.donor', ['nonprofit'], 'The Big Donor', 'A donor offers $500,000 — if the program is renamed after him and you drop the families he calls "undeserving."', [
    { id: 'decline', label: '🙅 Turn the money down', text: 'The board backed you. A smaller donor heard the story and gave $100,000.', perf: 3, money: 0, stats: { happiness: 5 } },
    { id: 'accept', label: '💰 Take it', text: 'The program grew. Some families were turned away.', perf: 5, stats: { happiness: -4 } },
  ]),
  M('inspector.bribe', ['councilInspector'], 'An Envelope', 'A developer slides an envelope across the table and asks you to "overlook" a missing fire exit.', [
    { id: 'refuse', label: '🚫 Refuse and write up the violation', text: 'The fire exit got built. The developer complained to the council; the council backed you.', perf: 5 },
    { id: 'take', label: '✉️ Take it', text: '$5,000 in cash.', money: 5000, risky: { chance: 0.3, text: 'It was a sting by the inspector general.', offense: 'bribery' } },
  ]),
  M('legal.deadline', ['legalSupport'], 'The Filing Deadline', 'It\'s 11:40 p.m. The court\'s e-filing system just crashed, and the brief is due at midnight.', [
    { id: 'drive', label: '🚗 Drive to the courthouse drop box', text: 'Stamped at 11:58. The partner sent you a bottle of champagne.', perf: 6, stats: { stress: 8 } },
    { id: 'motion', label: '📄 Document the outage and file at 12:05', text: 'The judge accepted it with the outage screenshots.', perf: 3, check: 'smarts' },
  ]),
  /* ---------------- Arts, media & tech ---------------- */
  M('journalism.leak', ['journalism'], 'The Leaked Document', 'A source gives you a document showing a city official took kickbacks. It could be real, or a setup.', [
    { id: 'verify', label: '🔍 Spend weeks verifying it', text: 'It was real. Your story ran on the front page, and the official resigned.', perf: 8, stats: { stress: 6 }, check: 'smarts' },
    { id: 'publish', label: '📰 Publish fast before a rival does', text: 'You beat everyone to it.', perf: 4, risky: { chance: 0.3, text: 'The document was forged. Your paper ran a correction, and you were pulled off the beat.', perf: -12 } },
  ]),
  M('journalism.source', ['journalism'], 'Protect Your Source', 'Prosecutors subpoena you to name the source of your last story.', [
    { id: 'refuse', label: '🤐 Refuse to name them', text: 'You spent two nights in jail for contempt — and became a hero of the press.', perf: 6, stats: { stress: 10 } },
    { id: 'name', label: '🗣️ Give up the name', text: 'No jail. No more sources, either.', perf: -8 },
  ]),
  M('acting.audition', ['acting'], 'The Callback', 'A casting director loved your audition, but wants you to lose twenty pounds in a month for the role.', [
    { id: 'crash', label: '🏃 Crash diet and train', text: 'You got the part. You were miserable for a month.', money: 15000, check: 'fitness', stats: { health: -5, stress: 6 } },
    { id: 'pass', label: '🙅 Pass on it', text: 'You passed. Your agent sighed.', stats: { happiness: 2 } },
  ]),
  M('music.label', ['music'], 'The Record Deal', 'A label offers a big advance — for your master recordings and 85% of royalties for ten years.', [
    { id: 'sign', label: '✍️ Sign', text: 'A $40,000 advance and a real marketing budget.', money: 40000, stats: { happiness: 4 } },
    { id: 'indie', label: '🎸 Stay independent', text: 'You kept your masters and toured in a van. The fans who found you stayed.', stats: { happiness: 5 } },
  ]),
  M('design.spec', ['design'], 'Free Work', 'A big brand wants you to "pitch" a full campaign for free, with the chance of a contract.', [
    { id: 'pitch', label: '🎨 Do the spec work', text: 'You won it! A six-month contract.', money: 12000, check: 'smarts', stats: { stress: 6 } },
    { id: 'decline', label: '🙅 Decline unpaid work', text: 'They hired someone who said yes.', stats: { happiness: 1 } },
  ]),
  M('creator.sponsor', ['contentCreator'], 'The Sponsor', 'A sketchy supplement company offers $10,000 for a video saying their pills "melt fat."', [
    { id: 'decline', label: '🙅 Turn it down and tell your audience why', text: 'That video got your most views ever.', perf: 5, stats: { happiness: 3 } },
    { id: 'take', label: '💰 Take the money', text: 'The check cleared.', money: 10000, risky: { chance: 0.3, text: 'Your audience turned on you when the company was sued. You lost a third of your subscribers.', perf: -10 } },
  ]),
  M('game.crunch', ['gameDevelopment'], 'Crunch', 'Launch is in six weeks. The studio wants mandatory 70-hour weeks "just this once" — for the third game in a row.', [
    { id: 'crunch', label: '☕ Crunch', text: 'It shipped on time to great reviews. You don\'t remember the summer.', perf: 6, stats: { stress: 14, health: -4 } },
    { id: 'boundary', label: '🙅 Work your normal hours', text: 'Your lead was annoyed. You kept your sanity.', perf: -2, boss: -3, stats: { happiness: 3 } },
  ]),
  M('meteorology.storm', ['meteorology'], 'The Call', 'Your models disagree about whether a storm will become a tornado outbreak tomorrow. Issuing a warning means closing schools.', [
    { id: 'warn', label: '🌪️ Issue the warning', text: 'Seven tornadoes touched down. Everyone was where they should be.', perf: 6, check: 'smarts' },
    { id: 'watch', label: '👀 Issue a watch and wait', text: 'The storms fizzled. This time.', perf: 0, risky: { chance: 0.3, text: 'Tornadoes touched down with little warning. The review asked why.', perf: -10 } },
  ]),
  M('interpreter.mistake', ['interpreter'], 'Lost in Translation', 'In a hospital, a doctor uses an idiom that would terrify the patient if translated literally.', [
    { id: 'meaning', label: '💬 Interpret the meaning, not the words', text: 'The patient relaxed. The doctor never knew how close it came.', perf: 4, check: 'smarts' },
    { id: 'literal', label: '📖 Translate it word for word', text: 'The patient panicked; you spent ten minutes untangling it.', perf: -2 },
  ]),
  M('funeral.family', ['funeral'], 'The Family Feud', 'At a viewing, two siblings start shouting about the will over their father\'s casket.', [
    { id: 'separate', label: '🕊️ Quietly separate them', text: 'You walked one sibling outside for a coffee. The service went on in peace.', perf: 4, check: 'smarts' },
    { id: 'wait', label: '🤐 Let it run its course', text: 'Twenty minutes of shouting. Everyone left exhausted.', perf: -2 },
  ]),
  M('cosmetology.disaster', ['cosmetology'], 'The Bleach Disaster', 'A walk-in wants platinum blonde in one sitting. Her hair is already damaged from box dye.', [
    { id: 'honest', label: '✋ Talk her into doing it in stages', text: 'She came back three times. Gorgeous, healthy hair — and a loyal client.', perf: 4 },
    { id: 'do', label: '💇 Give her what she wants', text: 'It worked… mostly.', money: 200, risky: { chance: 0.35, text: 'Her hair broke off in chunks. She posted the video.', perf: -6 } },
  ]),
];

export default { id: 'work-events', version: 1, decks: { 'work.everyday': everyday, 'work.field': field, 'work.moments': moments } };
