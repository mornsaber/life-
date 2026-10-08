/**
 * Ways to get in trouble.
 *
 * Temptations: job-specific opportunities keyed to the *abilities* your
 * current level grants (signing authority, inspection power, arrest powers,
 * classified access, diplomatic status...). Taking one pays off now and opens
 * an investigation that may surface years later.
 *
 * Risky behavior: personal choices anyone can make (drunk driving,
 * shoplifting, bar fights, drugs, tax cheating, speeding) — plus the
 * street and organized crimes in StreetCrime.js.
 */
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { commitOffense } from './JusticeSystem.js';
import { stateOf } from '../life/Regions.js';
import { crimeForMoney, CRIMES } from './StreetCrime.js';

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
  if (take.money) {
    const amount = rng.int(...take.money);
    // Insider profits land in the brokerage account (zero basis) — and are clawed back on conviction.
    if (take.offenseId === 'insiderTrading' && ctx.state.investing) ctx.emit('investing:windfall', { asset: 'finance', amount });
    else ctx.earn(amount, 'Undisclosed income');
  }
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
  { id: 'speed', group: 'personal', label: 'Floor It on the Highway', icon: '🏎️', minAge: 16, desc: 'Thrills, maybe a ticket' },
  { id: 'driveDrunk', group: 'personal', label: 'Drive Home After Drinks', icon: '🍺', minAge: 18, desc: 'DUI risk, crash risk' },
  { id: 'shoplift', group: 'petty', label: 'Shoplift', icon: '🛒', minAge: 10, desc: 'Free stuff, arrest risk' },
  { id: 'barFight', group: 'personal', label: 'Start a Bar Fight', icon: '👊', minAge: 18, desc: 'Assault charge risk' },
  { id: 'drugs', group: 'personal', label: 'Try Recreational Drugs', icon: '💊', minAge: 16, desc: 'Ruins clearances for 7 yrs' },
  { id: 'taxCheat', group: 'fraud', label: 'Fudge Your Taxes', icon: '🧾', minAge: 18, desc: 'Save now, audit later' },
  { id: 'vandalism', group: 'petty', label: 'Vandalize Property', icon: '🎨', minAge: 10, desc: 'Cheap thrill, misdemeanor' },
  { id: 'affair', group: 'personal', label: 'Cheat on Your Partner', icon: '💋', minAge: 18, desc: 'Not a crime — but it can end a marriage', needsPartner: true },
  { id: 'scam', group: 'fraud', label: 'Run an Online Scam', icon: '📧', minAge: 16, desc: 'Prey on strangers; federal wire fraud' },
  { id: 'insuranceFraud', group: 'fraud', label: 'Fake an Insurance Claim', icon: '🩼', minAge: 18, desc: 'Easy payout, felony fraud' },
  { id: 'burglary', group: 'property', label: 'Burglarize a House', icon: '🏚️', minAge: 14, desc: 'Felony; prison likely if caught' },
  { id: 'carTheft', group: 'property', label: 'Steal a Car', icon: '🚙', minAge: 14, desc: 'Felony auto theft' },
  { id: 'dealDrugs', group: 'organized', label: 'Sell Drugs', icon: '💰', minAge: 15, desc: 'Big money, long sentences' },
  { id: 'armedRobbery', group: 'violent', label: 'Rob a Store at Gunpoint', icon: '🔫', minAge: 16, desc: 'Violent felony — if someone dies, it\'s murder' },
  ...CRIMES,
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
  vandalism(ctx) {
    if (!once(ctx, 'vandalism')) return;
    ctx.stat('happiness', 2);
    if (ctx.rng.chance(0.25)) return commitOffense(ctx, { offenseId: 'vandalism', caught: true, context: 'caught on a doorbell camera', evidence: 0.85 });
    ctx.log('You spray-painted an overpass. It wasn\'t art.', '🎨', 'warn');
  },
  affair(ctx) {
    const { state, rng } = ctx;
    const partner = (state.people?.list ?? []).find((p) => p.alive && ['spouse', 'partner', 'fiance'].includes(p.relation));
    if (!partner) return ctx.toast('You\'re single — that\'s just dating.', 'warn');
    if (!once(ctx, 'affair')) return;
    ctx.stat('happiness', 3);
    if (rng.chance(0.4)) {
      partner.relationship = Math.max(0, partner.relationship - rng.int(35, 60));
      ctx.stat('happiness', -10);
      ctx.stat('stress', 10);
      return ctx.log(`${partner.firstName} found the messages. ${partner.relationship < 20 ? 'They\'re talking to a lawyer.' : 'Trust is shattered.'}`, '💔', 'bad');
    }
    ctx.log(`You cheated on ${partner.firstName}. Nobody found out — yet.`, '💋', 'warn');
    state.legal.flags.affairAge = state.character.age;
  },
  scam(ctx) {
    if (!once(ctx, 'scam')) return;
    crimeForMoney(ctx, { id: 'scam', group: 'fraud', offenseId: 'wireFraud', money: [3000, 25000], caughtNow: 0.05, discovery: 0.25, evidence: 0.85, context: 'online romance scam', text: 'You scammed lonely strangers out of their savings.', icon: '📧' });
  },
  insuranceFraud(ctx) {
    if (!once(ctx, 'insuranceFraud')) return;
    crimeForMoney(ctx, { id: 'insuranceFraud', group: 'fraud', offenseId: 'insuranceFraud', money: [5000, 30000], caughtNow: 0.1, discovery: 0.2, evidence: 0.8, context: 'staged injury claim', text: 'You faked a slip-and-fall and the insurer paid.', icon: '🩼' });
  },
  burglary(ctx) {
    if (!once(ctx, 'burglary')) return;
    ctx.stat('stress', 4);
    crimeForMoney(ctx, { id: 'burglary', group: 'property', offenseId: 'burglary', money: [500, 8000], caughtNow: 0.25, discovery: 0.12, evidence: 0.75, context: 'neighborhood break-in', text: 'You broke into a house and fenced what you took.', icon: '🏚️' });
  },
  carTheft(ctx) {
    if (!once(ctx, 'carTheft')) return;
    crimeForMoney(ctx, { id: 'carTheft', group: 'property', offenseId: 'autoTheft', money: [1000, 6000], caughtNow: 0.3, discovery: 0.1, evidence: 0.8, context: 'stolen car', text: 'You stole a car and sold it to a chop shop.', icon: '🚙' });
  },
  dealDrugs(ctx) {
    if (!once(ctx, 'dealDrugs')) return;
    ctx.stat('stress', 6);
    crimeForMoney(ctx, { id: 'dealDrugs', group: 'organized', offenseId: 'drugDistribution', money: [5000, 40000], caughtNow: 0.2, discovery: 0.2, evidence: 0.8, context: 'undercover buy', text: 'You moved product all year. The money was good.', icon: '💰' });
  },
  armedRobbery(ctx) {
    const { rng } = ctx;
    if (!once(ctx, 'armedRobbery')) return;
    ctx.stat('stress', 10);
    // Robberies that go wrong: someone dies, and it's felony murder.
    if (rng.chance(0.03)) {
      ctx.log('The clerk reached under the counter. In the chaos, someone was killed.', '⚰️', 'death');
      return commitOffense(ctx, { offenseId: 'felonyMurder', caught: rng.chance(0.8), context: 'a robbery that turned deadly', discovery: 0.5, evidence: 0.9, yearsLeft: 99 });
    }
    crimeForMoney(ctx, { id: 'armedRobbery', group: 'violent', offenseId: 'armedRobbery', money: [300, 5000], caughtNow: 0.45, discovery: 0.3, evidence: 0.85, context: 'convenience store robbery', text: 'You robbed a convenience store at gunpoint and got away.', icon: '🔫' });
  },
  taxCheat(ctx) {
    const { state } = ctx;
    if (!once(ctx, 'taxCheat')) return;
    state.legal.flags.taxCheatAge = state.character.age;
    ctx.log('You "forgot" to report some income. This year\'s tax bill will be lighter.', '🧾', 'warn');
    commitOffense(ctx, { offenseId: 'taxEvasion', discovery: 0.12, evidence: 0.8, context: 'IRS audit' });
  },
};
