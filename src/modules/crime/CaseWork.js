/**
 * The other side of the crime system: the cases people in the justice careers handle.
 *
 * Police and federal agents investigate, prosecutors decide what to charge, defenders defend
 * whoever they're given, judges sentence, probation officers and social workers deal with what
 * comes after. Each year one hard case lands on your desk — gang shootings, overdose deaths, a
 * corrupt colleague, and the sexual-offence and child-abuse cases these jobs are full of. The
 * choices are professional ones (what to charge, how hard to push a witness, whether to take a
 * plea), and they cost performance, stress and trauma either way.
 */
import { currentCourt } from '../legal/Judiciary.js';
import { recordCase } from './DocketRecord.js';

const ROLE = {
  police: 'police', statePolice: 'police', sheriff: 'police', transitPolice: 'police', airportPolice: 'police', universityPolice: 'police', fbi: 'police', dea: 'police',
  prosecution: 'prosecutor', publicDefender: 'defender', probation: 'probation', cps: 'social', socialWork: 'social',
};

/** role → cases: { title, text, options: [{ id, label, perf, stress, trauma, text }] } */
const CASES = {
  police: [
    { id: 'gangShooting', title: 'A Drive-By', text: 'A sixteen-year-old was shot dead outside a takeaway. Everybody on the street saw it; nobody saw anything.', options: [
      { id: 'canvass', label: '🚪 Knock every door, every night, for a month', perf: 6, stress: 8, text: 'A grandmother finally talked, behind closed curtains. You made the arrest.' },
      { id: 'informant', label: '🐀 Lean on an informant facing his own charges', perf: 4, stress: 3, text: 'He gave you a name — and you have to hope it was the right one.' },
      { id: 'shelve', label: '🗂️ Move on to the cases you can solve', perf: -3, stress: -2, text: 'The file went cold. The boy\'s mother still calls.' },
    ] },
    { id: 'svu', title: 'A Statement', text: 'A woman reports she was raped by a man she met on a dating app. There\'s no CCTV, the forensic results will take months, and his lawyer says it was consensual.', options: [
      { id: 'thorough', label: '📱 Pull every message, every location record, every witness', perf: 6, stress: 6, trauma: 4, text: 'It took nine months. The messages he deleted were on her phone. The prosecutor charged.' },
      { id: 'refer', label: '🫂 Make sure she has an advocate, then build the case slowly', perf: 3, stress: 3, trauma: 3, text: 'She stayed with the case because someone stayed with her.' },
      { id: 'nfa', label: '🗂️ Write it up as "word against word"', perf: -2, trauma: 2, text: 'No further action. You wonder about it more than you expected.' },
    ] },
    { id: 'child', title: 'The Child Protection Referral', text: 'A teacher has reported bruises on a seven-year-old, and a drawing she made in class.', options: [
      { id: 'joint', label: '🤝 Joint visit with social services, today', perf: 5, stress: 8, trauma: 8, text: 'You took her into protective custody that night. Her stepfather was charged.' },
      { id: 'wait', label: '📅 Schedule an interview for next week', perf: -4, trauma: 6, text: 'By next week the family had moved. The school is still looking for her.' },
    ] },
    { id: 'dirtyPartner', title: 'Your Partner', text: 'Your partner has been taking money from a dealer. You have seen the envelope.', options: [
      { id: 'report', label: '📋 Report it to professional standards', perf: 4, stress: 10, text: 'He was arrested. Half the station stopped speaking to you.' },
      { id: 'confront', label: '🗣️ Tell him to stop, or you will', perf: 0, stress: 6, text: 'He stopped. Probably.' },
      { id: 'silent', label: '🤐 Look the other way', perf: 0, stress: 4, text: 'You looked the other way. You keep looking.' },
    ] },
    { id: 'overdose', title: 'Five Overdoses in a Night', text: 'Five people overdosed on one estate in one night, two of them dead. Pills sold as oxycodone; pressed fentanyl.', options: [
      { id: 'trace', label: '🔎 Trace the pills back up the chain', perf: 7, stress: 6, trauma: 4, text: 'Three weeks of phones and surveillance led to a pill press in a garage.' },
      { id: 'warn', label: '📢 Push a public warning and naloxone out first', perf: 4, stress: 2, trauma: 3, text: 'Nobody else died that week. The press is still out there.' },
    ] },
  ],
  prosecutor: [
    { id: 'weakRape', title: 'A Hard Case to Charge', text: 'A sexual-assault case: the victim is credible and consistent, but the forensic evidence is inconclusive and the defence will attack her history.', options: [
      { id: 'charge', label: '⚖️ Charge it and take it to trial', perf: 4, stress: 8, trauma: 3, text: 'The jury believed her. It doesn\'t always go that way.' },
      { id: 'plea', label: '🤝 Offer a plea to a lesser count', perf: 2, stress: 3, text: 'He pleaded to a lesser offence. She said she could live with it; you weren\'t sure she meant it.' },
      { id: 'decline', label: '🗂️ Decline to charge', perf: -3, trauma: 3, text: 'You declined. You told her yourself, which most prosecutors don\'t.' },
    ] },
    { id: 'juvenileWaiver', title: 'Fifteen', text: 'A fifteen-year-old shot a rival gang member. The police want him tried as an adult.', options: [
      { id: 'adult', label: '⚖️ Move to try him as an adult', perf: 3, stress: 5, text: 'He was sentenced to twenty-two years. He\'ll be thirty-seven.' },
      { id: 'youth', label: '🧒 Keep it in youth court', perf: -1, stress: 3, text: 'Youth detention until twenty-one, and a programme that might work.' },
    ] },
    { id: 'kingpin', title: 'The Cooperator', text: 'A mid-level dealer will testify against his supplier — if you drop his own trafficking charges.', options: [
      { id: 'deal', label: '🤝 Take the deal', perf: 6, stress: 3, text: 'The supplier went down for twenty years. The cooperator is back on the street.' },
      { id: 'both', label: '⚖️ Charge them both', perf: 2, stress: 6, text: 'Without him, the case against the supplier fell apart.' },
    ] },
  ],
  defender: [
    { id: 'abuseClient', title: 'Your Client', text: 'You have been appointed to defend a man accused of abusing his stepdaughter. He insists he is innocent. Everyone, including you, wants to believe the child.', options: [
      { id: 'vigorous', label: '⚖️ Defend him as the law requires', perf: 6, stress: 10, trauma: 6, text: 'You tested every piece of evidence. The verdict was guilty, and it was a fair trial because you were there.' },
      { id: 'plea', label: '🤝 Push him to take a plea', perf: 2, stress: 5, trauma: 4, text: 'He pleaded. The child didn\'t have to testify.' },
    ] },
    { id: 'caseload', title: 'One Hundred and Forty Files', text: 'You have 140 open felony cases and fifteen minutes before a client\'s sentencing.', options: [
      { id: 'triage', label: '🗂️ Triage: the cases with real defences get your time', perf: 3, stress: 6, text: 'You won two you shouldn\'t have. You lost track of three.' },
      { id: 'everyone', label: '🌙 Work every night until each one is ready', perf: 5, stress: 14, text: 'You were ready for all of them. You weren\'t ready for anything else.' },
    ] },
  ],
  probation: [
    { id: 'registry', title: 'Supervision', text: 'You supervise a man on the sex-offender register who has asked to move in with a girlfriend who has two young children.', options: [
      { id: 'refuse', label: '🚫 Refuse and notify the child-protection team', perf: 5, stress: 5, trauma: 3, text: 'He was angry. The children are safe.' },
      { id: 'assess', label: '📋 Do a full risk assessment first', perf: 3, stress: 6, trauma: 2, text: 'The assessment took six weeks. You lost sleep over all six.' },
    ] },
  ],
  social: [
    { id: 'removal', title: 'An Emergency Removal', text: 'Three children, a flat with no food and needles on the floor, a mother who loves them and can\'t stop using.', options: [
      { id: 'remove', label: '🚪 Remove them tonight', perf: 4, stress: 12, trauma: 10, text: 'The youngest screamed for her mother all the way to the foster carer\'s.' },
      { id: 'plan', label: '📋 A safety plan, daily visits and a rehab place for her', perf: 3, stress: 8, trauma: 6, text: 'Some days it holds. You check every morning.' },
    ] },
  ],
  judge: [
    { id: 'sentencing', title: 'Sentencing', text: 'A nineteen-year-old runner who sold the pills that killed a girl at a festival. Her parents are in the front row; his mother is behind them.', options: [
      { id: 'severe', label: '⚖️ The full guideline sentence', perf: 3, stress: 6, trauma: 3, text: 'Eight years. Her parents nodded. His mother didn\'t make a sound.' },
      { id: 'mercy', label: '🕊️ Weigh his age and his remorse', perf: 1, stress: 6, trauma: 3, text: 'Four years. The papers called you soft. The appeal court agreed with you.' },
    ] },
  ],
};

const roleOf = (state) => (currentCourt(state) ? 'judge' : ROLE[state.career.job?.professionId] ?? null);

/** Yearly: one hard case. */
export function caseWorkTick(ctx) {
  const { state, rng } = ctx;
  const role = roleOf(state);
  if (!role || !rng.chance(0.3)) return;
  const pool = CASES[role];
  const c = rng.pick(pool);
  ctx.prompt({ type: 'crime.casework', icon: '🗂️', title: c.title, text: c.text, options: c.options.map(({ id, label }) => ({ id, label })), data: { role, caseId: c.id } });
}

export const CaseWorkResolvers = {
  casework(ctx, data, optionId) {
    const c = CASES[data.role]?.find((x) => x.id === data.caseId);
    const o = c?.options.find((x) => x.id === optionId);
    if (!o) return;
    if (o.perf) ctx.emit('career:adjust', { performance: o.perf });
    if (o.stress) ctx.stat('stress', o.stress);
    if (o.trauma) ctx.emit('health:trauma', { amount: o.trauma, source: 'casework' });
    ctx.log(o.text, '🗂️', o.perf >= 3 ? 'good' : o.perf < 0 ? 'bad' : 'info');
    recordCase(ctx.state, { role: data.role, title: c.title, result: o.perf >= 3 ? 'win' : o.perf < 0 ? 'loss' : 'settle', note: o.text });
  },
};
