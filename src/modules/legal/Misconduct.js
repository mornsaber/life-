/**
 * Ways to get in trouble.
 *
 * Temptations: job-specific opportunities keyed to the *abilities* your
 * current level grants (signing authority, inspection power, arrest powers,
 * classified access, diplomatic status...). Taking one pays off now and opens
 * an investigation that may surface years later.
 *
 * Risky behavior: personal choices anyone can make (drunk driving,
 * shoplifting, bar fights, drugs, tax cheating, speeding).
 */
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { commitOffense } from './JusticeSystem.js';
import { stateOf } from '../life/Regions.js';

/**
 * when(job): does this temptation apply?
 * take: { offenseId, money?, perf?, discovery, evidence, text }
 * Some temptations offer an honorable alternative with its own reward.
 */
export const TEMPTATIONS = [
  {
    id: 'expense', when: (job) => job.grade >= 3 && job.sector === 'private', title: 'Expense Report',
    text: 'Nobody really checks the expense reports. A few "client dinners" would cover your vacation.',
    take: { label: '🧾 Pad the expense report', offenseId: 'expenseFraud', money: [2000, 5000], discovery: 0.15, evidence: 0.8, text: 'You padded your expenses.' },
  },
  {
    id: 'embezzle', when: (job) => job.abilities.includes('sign'), title: 'Signing Authority',
    text: 'You approve payments without a second signature. A shell vendor would never be noticed… probably.',
    take: { label: '💼 Route payments to a shell company', offenseId: 'embezzlement', money: [40000, 150000], discovery: 0.25, evidence: 0.85, text: 'You quietly embezzled from your employer.' },
  },
  {
    id: 'kickback', when: (job) => job.abilities.includes('budget'), title: 'Vendor Kickback',
    text: 'A contractor bidding on your department\'s work offers you a "consulting fee" if they win.',
    take: { label: '🤝 Take the kickback', offenseId: 'kickback', money: [15000, 40000], discovery: 0.2, evidence: 0.7, text: 'You steered the contract and pocketed the fee.' },
  },
  {
    id: 'inspection', when: (job) => job.abilities.includes('inspect'), title: 'Failing Inspection',
    text: 'A developer\'s project fails your inspection. He slides an envelope across the hood of your truck.',
    take: { label: '💵 Take the envelope and sign off', offenseId: 'bribery', money: [5000, 20000], discovery: 0.2, evidence: 0.7, text: 'You signed off on the failing project.' },
    honest: { label: '📞 Report the bribe attempt to the Inspector General', perf: 6, text: 'You reported the bribe. The developer was charged.' },
  },
  {
    id: 'insider', when: (job) => job.abilities.includes('trade'), title: 'A Hot Tip',
    text: 'A friend on a deal team hints that a merger will be announced Monday.',
    take: { label: '📈 Load up on call options', offenseId: 'insiderTrading', money: [30000, 120000], discovery: 0.3, evidence: 0.8, text: 'You traded on the tip. It paid off big.' },
  },
  {
    id: 'force', when: (job) => job.abilities.includes('arrest'), title: 'Use of Force',
    text: 'A handcuffed suspect spits in your face and taunts you. Your partner looks away.',
    take: { label: '👊 Teach him a lesson', offenseId: 'excessiveForce', perf: 0, discovery: 0.5, evidence: 0.85, text: 'You lost your temper on a restrained suspect. The body cam was running.' },
    honest: { label: '🧘 Stay professional and document it', perf: 3, text: 'You kept your cool and wrote it up.' },
  },
  {
    id: 'pharma', when: (job) => job.abilities.includes('prescribe') && job.professionId === 'medical', title: 'Speaker Fees',
    text: 'A pharma rep offers generous "speaker fees" if your opioid prescribing numbers go up.',
    take: { label: '💊 Write more prescriptions', offenseId: 'prescriptionFraud', money: [20000, 60000], discovery: 0.25, evidence: 0.75, text: 'You took the speaker fees and the prescriptions flowed.' },
  },
  {
    id: 'visas', when: (job) => job.abilities.includes('diplomatic') && job.posting, title: 'Consular Window',
    text: 'A local fixer offers $10,000 per visa approval, no questions asked.',
    take: { label: '🛂 Start approving his clients', offenseId: 'visaFraud', money: [60000, 150000], discovery: 0.3, evidence: 0.85, text: 'You sold visas. Diplomatic immunity won\'t cover crimes against the U.S.' },
  },
  {
    id: 'pouch', when: (job) => job.abilities.includes('diplomatic') && job.posting, title: 'The Diplomatic Pouch',
    text: 'A collector will pay handsomely if you ship antiquities home in the diplomatic pouch, which customs can\'t open.',
    take: { label: '🎒 Use the pouch', offenseId: 'smuggling', money: [15000, 40000], discovery: 0.25, evidence: 0.8, text: 'You smuggled artifacts through the pouch.' },
  },
  {
    id: 'nightOut', when: (job) => job.abilities.includes('diplomatic') && job.posting, title: 'Embassy Reception',
    text: 'After a long embassy reception, you\'ve had far too much to drink. Your car is outside.',
    take: { label: '🚗 Drive home anyway — you have diplomatic plates', offenseId: 'dui', crash: true, discovery: 0, evidence: 0.95, text: 'You drove home drunk on diplomatic plates and rear-ended a taxi.' },
    honest: { label: '🚕 Call the embassy motor pool', perf: 0, text: 'You took the embassy car home.' },
  },
  {
    id: 'leak', when: (job) => job.abilities.includes('classified'), title: 'A Reporter Calls',
    text: 'A journalist wants documents showing your agency misled Congress. You believe the public deserves to know.',
    take: { label: '📰 Leak the documents', offenseId: 'leak', discovery: 0.35, evidence: 0.85, text: 'You leaked classified documents to the press.' },
    honest: { label: '📣 File a protected whistleblower complaint with the IG', perf: -4, text: 'You went through lawful whistleblower channels. Your boss is furious, but you\'re protected.' },
  },
  {
    id: 'contraband', when: (job) => job.abilities.includes('custody'), title: 'A Favor for an Inmate',
    text: 'A gang shot-caller offers $2,000 a week if you carry phones and drugs through the staff entrance.',
    take: { label: '📦 Carry the package', offenseId: 'contraband', money: [20000, 60000], discovery: 0.35, evidence: 0.85, text: 'You smuggled contraband into the prison.' },
    honest: { label: '🚨 Report the offer to Internal Affairs', perf: 5, text: 'You reported it. The investigation took down a smuggling ring.' },
  },
  {
    id: 'visits', when: (job) => job.professionId === 'cps', title: 'Impossible Caseload',
    text: 'You have 34 open cases and can\'t possibly make every monthly home visit. Coworkers just mark them "completed."',
    take: { label: '📝 Log visits you didn\'t make', offenseId: 'falsifiedRecords', perf: 5, discovery: 0.25, evidence: 0.8, text: 'You falsified home-visit records.' },
    honest: { label: '📢 Document the backlog and tell your supervisor', perf: -2, text: 'You flagged the backlog. Nobody thanked you, but the record is honest.' },
  },
  {
    id: 'brady', when: (job) => job.professionId === 'prosecution', title: 'Exculpatory Evidence',
    text: 'Days before trial you find a witness statement that undercuts your case. The defense doesn\'t know it exists.',
    take: { label: '🗄️ Leave it in the file', offenseId: 'prosecutorialMisconduct', perf: 6, discovery: 0.3, evidence: 0.8, text: 'You withheld exculpatory evidence and won the conviction.' },
    honest: { label: '📤 Turn it over to the defense', perf: -2, text: 'You disclosed it. The case got harder, but it was the right call.' },
  },
  {
    id: 'lobbying', when: (job) => job.professionId === 'legislativeStaff', title: 'The Lobbying Offer',
    text: 'A lobbying firm offers you $300K — starting next month — to work your old boss on a bill. State law requires a two-year cooling-off period.',
    take: { label: '🚪 Take the job and start calling your old office', offenseId: 'illegalLobbying', money: [60000, 120000], discovery: 0.3, evidence: 0.75, text: 'You started lobbying your former colleagues right away.' },
    honest: { label: '⏳ Wait out the cooling-off period', perf: 0, text: 'You turned it down for now.' },
  },
  {
    id: 'revolvingDoor', when: (job) => job.sector === 'federal' && job.abilities.includes('inspect'), title: 'The Revolving Door',
    text: 'An executive at a company you regulate hints at a $400K job for you — if this year\'s findings are "softened."',
    take: { label: '🚪 Soften the findings', offenseId: 'bribery', perf: 2, discovery: 0.15, evidence: 0.6, text: 'You softened your findings. The job offer is "in the works."' },
  },
];

const DECLINE = { label: '🙅 Walk away', text: 'You walked away. Your conscience is clean.' };

export function temptationTick(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  if (!job || !rng.chance(0.22)) return;
  const pool = TEMPTATIONS.filter((t) => t.when(job));
  if (!pool.length) return;
  const t = rng.pick(pool);
  const options = [{ id: 'take', label: t.take.label, tone: 'danger' }];
  if (t.honest) options.push({ id: 'honest', label: t.honest.label });
  options.push({ id: 'decline', label: DECLINE.label });
  ctx.prompt({ type: 'legal.temptation', icon: '😈', title: t.title, text: `${job.employer.name}${job.posting ? ` · ${job.posting.city}` : ''}\n${t.text}`, options, data: { id: t.id } });
}

export function resolveTemptation(ctx, data, optionId) {
  const { rng } = ctx;
  const t = TEMPTATIONS.find((x) => x.id === data.id);
  if (optionId === 'decline') return ctx.log(DECLINE.text, '🙅');
  if (optionId === 'honest') {
    ctx.log(t.honest.text, '🫡', 'good');
    ctx.emit('career:adjust', { performance: t.honest.perf ?? 0, boss: t.id === 'leak' ? -10 : 0 });
    return;
  }
  const take = t.take;
  ctx.log(take.text, '😈', 'warn');
  if (take.money) ctx.earn(rng.int(...take.money), 'Undisclosed income');
  if (take.perf) ctx.emit('career:adjust', { performance: take.perf });
  if (take.crash) {
    ctx.stat('health', -rng.int(3, 12));
    commitOffense(ctx, { offenseId: take.offenseId, context: 'crash in diplomatic vehicle', caught: true, evidence: take.evidence });
    return;
  }
  commitOffense(ctx, { offenseId: take.offenseId, context: t.title.toLowerCase(), discovery: take.discovery, evidence: take.evidence });
}

/* ------------------------------------------------------------------ */
/* Risky personal behavior                                             */
/* ------------------------------------------------------------------ */

export const RISKY_ACTIONS = [
  { id: 'speed', label: 'Floor It on the Highway', icon: '🏎️', minAge: 16, desc: 'Thrills, maybe a ticket' },
  { id: 'driveDrunk', label: 'Drive Home After Drinks', icon: '🍺', minAge: 18, desc: 'DUI risk, crash risk' },
  { id: 'shoplift', label: 'Shoplift', icon: '🛒', minAge: 10, desc: 'Free stuff, arrest risk' },
  { id: 'barFight', label: 'Start a Bar Fight', icon: '👊', minAge: 18, desc: 'Assault charge risk' },
  { id: 'drugs', label: 'Try Recreational Drugs', icon: '💊', minAge: 16, desc: 'Ruins clearances for 7 yrs' },
  { id: 'taxCheat', label: 'Fudge Your Taxes', icon: '🧾', minAge: 18, desc: 'Save now, audit later' },
];

function once(ctx, id) {
  if (yearlyCount(ctx.state, `risky.${id}`)) {
    ctx.toast('Lay low for the rest of the year.', 'warn');
    return false;
  }
  bumpYearly(ctx.state, `risky.${id}`);
  return true;
}

export const RiskyActions = {
  speed(ctx) {
    if (!once(ctx, 'speed')) return;
    ctx.stat('happiness', 3);
    if (!hasCredential(ctx.state, 'driverLicense')) return commitOffense(ctx, { offenseId: 'unlicensed', caught: ctx.rng.chance(0.4), discovery: 0, context: 'pulled over without a license' });
    if (ctx.rng.chance(0.35)) commitOffense(ctx, { offenseId: ctx.rng.chance(0.2) ? 'reckless' : 'speeding', caught: true, context: '95 in a 55' });
    else ctx.log('You opened it up on the interstate. What a rush.', '🏎️');
  },
  driveDrunk(ctx) {
    const { rng } = ctx;
    if (!once(ctx, 'driveDrunk')) return;
    if (rng.chance(0.08)) {
      ctx.stat('health', -rng.int(10, 30));
      ctx.log('You crashed into a guardrail.', '💥', 'bad');
      return commitOffense(ctx, { offenseId: 'dui', caught: true, context: 'single-car crash', evidence: 0.95 });
    }
    if (rng.chance(0.25)) return commitOffense(ctx, { offenseId: 'dui', caught: true, context: 'checkpoint stop', evidence: 0.9 });
    ctx.log('You made it home. This time.', '🍺', 'warn');
  },
  shoplift(ctx) {
    const { rng } = ctx;
    if (!once(ctx, 'shoplift')) return;
    if (rng.chance(0.3)) return commitOffense(ctx, { offenseId: 'shoplifting', caught: true, context: 'caught by store security', evidence: 0.9 });
    ctx.stat('happiness', 2);
    ctx.log(`You walked out with $${rng.int(40, 300)} of merchandise.`, '🛒', 'warn');
  },
  barFight(ctx) {
    const { rng } = ctx;
    if (!once(ctx, 'barFight')) return;
    ctx.stat('health', -rng.int(2, 12));
    if (rng.chance(0.35)) return commitOffense(ctx, { offenseId: 'assault', caught: true, context: 'bar brawl', evidence: 0.75 });
    ctx.log('You threw the first punch and got out before the cops showed up.', '👊', 'warn');
  },
  drugs(ctx) {
    const { state, rng } = ctx;
    if (!once(ctx, 'drugs')) return;
    state.legal.flags.drugUseAge = state.character.age;
    ctx.stat('happiness', 5);
    ctx.stat('health', -3);
    if (stateOf(state).cannabis && rng.chance(0.7)) {
      ctx.log(`You bought legal cannabis at a ${stateOf(state).name} dispensary. (Still illegal federally — clearance investigators will ask.)`, '🌿', 'warn');
      return;
    }
    if (rng.chance(0.1)) return commitOffense(ctx, { offenseId: 'drugPossession', caught: true, context: 'searched at a concert', evidence: 0.85 });
    ctx.log('You had a wild night. (Security clearance investigators ask about the last 7 years.)', '💊', 'warn');
  },
  taxCheat(ctx) {
    const { state } = ctx;
    if (!once(ctx, 'taxCheat')) return;
    state.legal.flags.taxCheatAge = state.character.age;
    ctx.log('You "forgot" to report some income. This year\'s tax bill will be lighter.', '🧾', 'warn');
    commitOffense(ctx, { offenseId: 'taxEvasion', discovery: 0.12, evidence: 0.8, context: 'IRS audit' });
  },
};
