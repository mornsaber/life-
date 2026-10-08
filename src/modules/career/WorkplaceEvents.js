/**
 * Everyday workplace events for any job (agencies, cities and the military
 * add their own on top). Option fields:
 *   perf, boss, coworkers   job adjustments (career:adjust)
 *   stats                   { stat: delta }
 *   money                   cash in (+) or out (−); income is taxable
 *   check                   stat that must clear ~55 or perf flips negative
 *   risky                   { chance, text, perf, boss, fired?, offense? }
 *   minGrade / remote / sector / mgmt  restrict when an event can appear
 */
import { pickFresh, eligible } from '../../core/Pools.js';
import { FIELD_WORKPLACE_EVENTS } from './FieldWorkplaceEvents.js';

const EVERYDAY_EVENTS = [
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

/** Everyday events plus the ones specific to your field. */
export const WORKPLACE_EVENTS = [...EVERYDAY_EVENTS, ...FIELD_WORKPLACE_EVENTS];

const sectorWeight = { private: 0.24, federal: 0.12, state: 0.12, municipal: 0.12 };

/** Maybe raise an everyday workplace event this year. */
export function workplaceEvent(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  if (!job || state.prompts.some((p) => p.type === 'career.workEvent') || !rng.chance(sectorWeight[job.sector] ?? 0.2)) return;
  const event = pickFresh(rng, state, 'workplace', eligible(WORKPLACE_EVENTS, state));
  if (!event) return;
  ctx.prompt({
    type: 'career.workEvent',
    icon: '🏢',
    title: event.title,
    text: `${job.employer.name}\n${event.text}`,
    options: event.options.map((o) => ({ id: o.id, label: o.label, tone: o.risky?.offense ? 'danger' : undefined })),
    data: { eventId: event.id },
  });
}

export function resolveWorkEvent(ctx, data, optionId) {
  const { state, rng } = ctx;
  const event = WORKPLACE_EVENTS.find((e) => e.id === data.eventId);
  const o = event?.options.find((x) => x.id === optionId);
  if (!o || !state.career.job) return;
  let perf = o.perf ?? 0;
  if (o.check && state.stats[o.check] + rng.int(-15, 15) < 55) {
    perf = -Math.abs(perf || 2);
    ctx.log('It didn\'t land the way you hoped.', '😬', 'warn');
  }
  let { boss = 0, coworkers = 0, money = 0 } = o;
  for (const [k, v] of Object.entries(o.stats ?? {})) ctx.stat(k, v);
  if (o.risky && rng.chance(o.risky.chance)) {
    const r = o.risky;
    ctx.log(r.text, '⚠️', r.money ? 'good' : 'bad');
    perf += r.perf ?? 0;
    boss += r.boss ?? 0;
    money += r.money ?? 0;
    if (r.injury) ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(20, 50) });
    if (r.offense) ctx.emit('legal:offense', { offenseId: r.offense, context: event.title.toLowerCase(), caught: true });
  } else ctx.log(`${event.title}: ${o.text ?? `${o.label.replace(/^\S+\s/, '')}.`}`, '🏢');
  if (money > 0) ctx.earn(money, `${event.title} (${state.career.job?.employer.name ?? 'work'})`);
  else if (money < 0) ctx.spend(-money, event.title, { allowDebt: true });
  if (state.career.job) ctx.emit('career:adjust', { performance: perf, boss, coworkers });
}
