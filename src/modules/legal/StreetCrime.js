/**
 * A life of crime: petty theft up through fraud, cybercrime, organized crime
 * and armed robbery.
 *
 *   heat     police attention (0–100). Every job adds some; it fades each
 *            year (faster if you lay low). Heat makes arrests on the spot
 *            likelier and helps old cases surface — above 70 a task force
 *            starts building cases against you.
 *   skill    experience per kind of crime: bigger scores and fewer
 *            mistakes, up to a point.
 *   earned   lifetime criminal income (laundering needs something to launder).
 *
 * state.legal.crime = { heat, skill: { [crimeId]: n }, earned, layingLow }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { commitOffense } from './JusticeSystem.js';
import { regionOf } from '../life/Regions.js';
import { currentBusiness } from '../business/Business.js';
import { VEHICLE_TYPES } from '../vehicles/Vehicles.js';

export const CRIME_GROUPS = {
  personal: { label: 'Reckless choices', icon: '🍺' },
  petty: { label: 'Petty crime', icon: '👛' },
  property: { label: 'Property crime', icon: '🏚️' },
  fraud: { label: 'Fraud & cybercrime', icon: '💻' },
  organized: { label: 'Organized crime', icon: '🕴️' },
  violent: { label: 'Armed crime', icon: '🔫' },
};
/** Heat each kind of job draws. */
const HEAT = { personal: 2, petty: 4, property: 8, fraud: 6, organized: 12, violent: 22 };
export const TASK_FORCE_HEAT = 70;

export const crimeOf = (state) => (state.legal.crime ??= { heat: 0, skill: {}, earned: 0, layingLow: false });
const skillBonus = (state, id) => Math.min(5, crimeOf(state).skill[id] ?? 0);

/**
 * Commit a crime for money: arrested on the spot, or paid — with an open
 * case that may surface later. Heat and experience shift the odds.
 */
export function crimeForMoney(ctx, { id, group = 'property', offenseId, money, caughtNow, discovery, evidence, context, text, icon }) {
  const { state, rng } = ctx;
  const c = crimeOf(state);
  const skill = skillBonus(state, id ?? offenseId);
  c.heat = clamp(c.heat + (HEAT[group] ?? 6), 0, 100);
  c.layingLow = false;
  const arrest = clamp(caughtNow * (1 + c.heat / 100) * (1 - skill * 0.06), 0.01, 0.95);
  if (rng.chance(arrest)) return commitOffense(ctx, { offenseId, caught: true, context, evidence });
  const take = Math.round(rng.int(...money) * (1 + skill * 0.1));
  c.skill[id ?? offenseId] = (c.skill[id ?? offenseId] ?? 0) + 1;
  c.earned += take;
  ctx.earn(take, 'Undisclosed income');
  ctx.log(`${text} (+$${take.toLocaleString()})`, icon, 'warn');
  if (discovery) commitOffense(ctx, { offenseId, context, discovery: clamp(discovery * (1 + c.heat / 150), 0, 0.9), evidence });
  return undefined;
}

/** Yearly: heat fades; a hot record draws a task force. */
export function crimeTick(ctx) {
  const { state } = ctx;
  const c = state.legal.crime;
  if (!c) return;
  if (c.heat >= TASK_FORCE_HEAT && state.legal.investigations.length) {
    for (const inv of state.legal.investigations) inv.discovery = clamp(inv.discovery + 0.15, 0, 0.9);
    ctx.log('Word on the street: a multi-agency task force is asking questions about you.', '🕵️', 'bad');
    ctx.stat('stress', 6);
  }
  c.heat = Math.round(c.heat * (c.layingLow ? 0.3 : 0.6));
  c.layingLow = false;
}

const once = (ctx, id) => {
  if (yearlyCount(ctx.state, `risky.${id}`)) {
    ctx.toast('Lay low for the rest of the year.', 'warn');
    return false;
  }
  bumpYearly(ctx.state, `risky.${id}`);
  return true;
};

/**
 * The new crimes. `needs(state)` returns a reason it's not possible, or null.
 */
export const CRIMES = [
  { id: 'pickpocket', group: 'petty', label: 'Pickpocket Tourists', icon: '👛', minAge: 12, desc: 'Small money, misdemeanor',
    run: { offenseId: 'pettyTheft', money: [50, 600], caughtNow: 0.2, discovery: 0, evidence: 0.85, context: 'caught with a tourist\'s wallet', text: 'You worked the crowds downtown.' } },
  { id: 'porchPirate', group: 'petty', label: 'Steal Packages off Porches', icon: '📦', minAge: 14, desc: 'Mail theft is a federal crime',
    run: { offenseId: 'mailTheft', money: [200, 2500], caughtNow: 0.12, discovery: 0.1, evidence: 0.8, context: 'doorbell camera footage', text: 'You followed delivery vans and lifted packages.' } },
  { id: 'fakeIds', group: 'petty', label: 'Sell Fake IDs', icon: '🪪', minAge: 16, desc: 'Felony forgery',
    run: { offenseId: 'forgery', money: [1000, 8000], caughtNow: 0.1, discovery: 0.15, evidence: 0.8, context: 'a customer got caught at a bar', text: 'You sold fake driver\'s licenses to college freshmen.' } },
  { id: 'streetRace', group: 'petty', label: 'Street Race for Money', icon: '🏁', minAge: 16, desc: 'Win pink slips — or crash',
    needs: (state) => (state.credentials.held.driverLicense ? null : 'Needs a driver\'s license'),
    custom: 'streetRace' },
  { id: 'poach', group: 'petty', label: 'Poach Game Out of Season', icon: '🦌', minAge: 14, desc: 'Game wardens are watching',
    needs: (state) => (['Rural', 'Small town', 'Mountain metro'].includes(regionOf(state).type) ? null : 'You need to live near hunting land'),
    run: { offenseId: 'poaching', money: [300, 3000], caughtNow: 0.15, discovery: 0.05, evidence: 0.8, context: 'a game warden\'s checkpoint', text: 'You took a trophy buck out of season and sold the antlers.' } },
  { id: 'catalytic', group: 'property', label: 'Steal Catalytic Converters', icon: '🔧', minAge: 15, desc: 'Two minutes with a saw',
    run: { offenseId: 'grandTheft', money: [1500, 9000], caughtNow: 0.15, discovery: 0.1, evidence: 0.75, context: 'caught under a car with a reciprocating saw', text: 'You cut converters off parked cars and sold them to a scrap yard.' } },
  { id: 'fence', group: 'property', label: 'Fence Stolen Goods', icon: '🛍️', minAge: 18, desc: 'Buy hot merchandise cheap, sell it online',
    run: { offenseId: 'receivingStolen', money: [3000, 20000], caughtNow: 0.08, discovery: 0.15, evidence: 0.75, context: 'an undercover sting', text: 'You moved stolen electronics through online marketplaces.' } },
  { id: 'torchCar', group: 'property', label: 'Torch Your Car for the Insurance', icon: '🔥', minAge: 18, desc: 'Arson and insurance fraud',
    needs: (state) => ((state.vehicles?.owned ?? []).some((v) => !v.lease) ? null : 'You need a car you own'),
    custom: 'torchCar' },
  { id: 'identity', group: 'fraud', label: 'Steal Identities', icon: '🪪', minAge: 16, desc: 'Open cards in other people\'s names',
    run: { offenseId: 'identityTheft', money: [4000, 30000], caughtNow: 0.05, discovery: 0.2, evidence: 0.85, context: 'victims\' fraud reports traced back to you', text: 'You bought stolen identities on the dark web and ran up credit cards.' } },
  { id: 'counterfeit', group: 'fraud', label: 'Print Counterfeit Money', icon: '💵', minAge: 18, desc: 'The Secret Service investigates',
    needs: (state) => (state.stats.smarts >= 55 ? null : 'Needs 55+ smarts'),
    run: { offenseId: 'counterfeiting', money: [5000, 40000], caughtNow: 0.08, discovery: 0.25, evidence: 0.9, context: 'bills flagged by a bank', text: 'You printed twenties and passed them at busy stores.' } },
  { id: 'knockoffs', group: 'fraud', label: 'Sell Knockoff Designer Goods', icon: '👜', minAge: 16, desc: 'Fake handbags, real profits',
    run: { offenseId: 'counterfeitGoods', money: [3000, 25000], caughtNow: 0.06, discovery: 0.12, evidence: 0.8, context: 'a customs seizure', text: 'You imported fake handbags and sold them at a flea market.' } },
  { id: 'ransomware', group: 'fraud', label: 'Run a Ransomware Attack', icon: '💻', minAge: 16, desc: 'Lock a company\'s files, demand bitcoin',
    needs: (state) => (state.stats.smarts >= 70 ? null : 'Needs 70+ smarts'),
    run: { offenseId: 'computerIntrusion', money: [20000, 200000], caughtNow: 0.03, discovery: 0.2, evidence: 0.85, context: 'the FBI traced the bitcoin', text: 'You encrypted a hospital chain\'s servers and got paid in bitcoin.' } },
  { id: 'launder', group: 'fraud', label: 'Launder Your Dirty Money', icon: '🧺', minAge: 18, desc: 'Run it through a business: old cases go cold, but laundering is its own crime',
    needs: (state) => ((state.legal.crime?.earned ?? 0) >= 20000 ? null : 'You need $20,000+ in criminal earnings to launder'),
    custom: 'launder' },
  { id: 'bookie', group: 'organized', label: 'Run a Sports Book', icon: '🎲', minAge: 18, desc: 'Take bets, collect debts',
    run: { offenseId: 'illegalGambling', money: [8000, 50000], caughtNow: 0.05, discovery: 0.15, evidence: 0.8, context: 'a wiretap', text: 'You ran an illegal sports book out of a bar\'s back room.' } },
  { id: 'loanShark', group: 'organized', label: 'Loan Shark', icon: '🦈', minAge: 18, desc: '20% a week, and you collect',
    run: { offenseId: 'extortion', money: [10000, 60000], caughtNow: 0.08, discovery: 0.2, evidence: 0.8, context: 'a borrower went to the police', text: 'You lent money at 20% a week and made sure people paid.' } },
  { id: 'growOp', group: 'organized', label: 'Run a Grow House', icon: '🌱', minAge: 18, desc: 'Hydroponics in a rented house',
    run: { offenseId: 'drugManufacturing', money: [15000, 80000], caughtNow: 0.1, discovery: 0.2, evidence: 0.85, context: 'the power company flagged your usage', text: 'You turned a rental house into a grow operation.' } },
  { id: 'gunRunning', group: 'organized', label: 'Traffic Guns', icon: '🔫', minAge: 21, desc: 'Straw purchases, sold up the I-95 "iron pipeline"',
    run: { offenseId: 'gunTrafficking', money: [15000, 70000], caughtNow: 0.1, discovery: 0.25, evidence: 0.85, context: 'an ATF trace of a crime gun', text: 'You moved guns bought in loose-law states to buyers up north.' } },
  { id: 'carjack', group: 'violent', label: 'Carjack Someone', icon: '🚘', minAge: 16, desc: 'Violent federal felony',
    run: { offenseId: 'carjacking', money: [2000, 15000], caughtNow: 0.35, discovery: 0.3, evidence: 0.85, context: 'a carjacking at a gas station', text: 'You pulled a driver out at a gas station and sold the car.' } },
  { id: 'bankRobbery', group: 'violent', label: 'Rob a Bank', icon: '🏦', minAge: 18, desc: 'The FBI solves most of these',
    custom: 'bankRobbery' },
];

const CUSTOM = {
  streetRace(ctx) {
    const { state, rng } = ctx;
    const c = crimeOf(state);
    c.heat = clamp(c.heat + HEAT.petty, 0, 100);
    if (rng.chance(0.1)) {
      ctx.stat('health', -rng.int(10, 35));
      ctx.log('You lost control at 120 mph. The car is gone; you were lucky.', '💥', 'bad');
      return commitOffense(ctx, { offenseId: 'reckless', caught: true, context: 'a street-race crash', evidence: 0.95 });
    }
    if (rng.chance(0.15)) return commitOffense(ctx, { offenseId: 'streetRacing', caught: true, context: 'a police sweep of a street-race meetup', evidence: 0.9 });
    const won = rng.chance(0.45 + skillBonus(state, 'streetRace') * 0.05);
    c.skill.streetRace = (c.skill.streetRace ?? 0) + 1;
    if (won) {
      const purse = rng.int(1000, 8000);
      c.earned += purse;
      ctx.earn(purse, 'Undisclosed income');
      ctx.stat('happiness', 5);
      return ctx.log(`You won the race and $${purse.toLocaleString()}.`, '🏁', 'warn');
    }
    const lost = rng.int(500, 3000);
    ctx.spend(lost, 'Lost a street-race bet', { allowDebt: true });
    ctx.log(`You lost the race — and $${lost.toLocaleString()}.`, '🏁', 'warn');
  },
  torchCar(ctx) {
    const { state, rng } = ctx;
    const car = (state.vehicles.owned ?? []).filter((v) => !v.lease).sort((a, b) => b.value - a.value)[0];
    const c = crimeOf(state);
    c.heat = clamp(c.heat + HEAT.property, 0, 100);
    const name = VEHICLE_TYPES[car.typeId]?.name ?? 'car';
    // The insurer pays the lender first.
    const payout = Math.max(0, Math.round(car.value * 1.1) - (car.loan?.balance ?? 0));
    state.vehicles.owned = state.vehicles.owned.filter((v) => v !== car);
    if (rng.chance(0.25 * (1 + c.heat / 100))) {
      ctx.log(`The fire investigator found an accelerant pattern in your ${name}. The insurer denied the claim${car.loan?.balance ? ' — and you still owe on the loan' : ''}.`, '🔥', 'bad');
      if (car.loan?.balance) ctx.spend(Math.round(car.loan.balance), 'Loan balance on a burned car', { allowDebt: true });
      return commitOffense(ctx, { offenseId: 'arson', caught: true, context: 'a burned-out car with an accelerant pattern', evidence: 0.85 });
    }
    if (payout) ctx.earn(payout, 'Insurance payout');
    ctx.log(`You torched your ${name} on a back road and reported it stolen. The insurer ${car.loan?.balance ? 'paid off the loan and ' : ''}sent you $${payout.toLocaleString()}.`, '🔥', 'warn');
    commitOffense(ctx, { offenseId: 'arson', discovery: 0.15, evidence: 0.75, context: 'a suspicious vehicle fire' });
  },
  launder(ctx) {
    const { state, rng } = ctx;
    const c = crimeOf(state);
    const biz = currentBusiness(state);
    c.heat = clamp(c.heat + HEAT.fraud, 0, 100);
    // A real business gives cover; a cash-heavy front without one draws a SAR from the bank.
    const risk = biz ? 0.12 : 0.25;
    for (const inv of state.legal.investigations) inv.discovery = clamp(inv.discovery * 0.6, 0, 0.9);
    const fee = Math.round(Math.min(c.earned, 200000) * rng.float(0.1, 0.2));
    ctx.spend(fee, 'Laundering costs', { allowDebt: true });
    c.earned = Math.round(c.earned * 0.5);
    ctx.log(`You ran your dirty money through ${biz ? biz.name : 'a car wash and a few cash businesses'} ($${fee.toLocaleString()} in costs). The paper trail on your old jobs went cold.`, '🧺', 'warn');
    commitOffense(ctx, { offenseId: 'moneyLaundering', discovery: risk, evidence: 0.8, context: 'a bank filed suspicious-activity reports' });
  },
  bankRobbery(ctx) {
    const { state, rng } = ctx;
    const c = crimeOf(state);
    c.heat = clamp(c.heat + HEAT.violent, 0, 100);
    ctx.stat('stress', 12);
    // Most bank robbers are caught: dye packs, cameras, the FBI.
    if (rng.chance(clamp(0.55 * (1 + c.heat / 200) - skillBonus(state, 'bankRobbery') * 0.04, 0.2, 0.9))) return commitOffense(ctx, { offenseId: 'bankRobbery', caught: true, context: 'a dye pack exploded in the getaway car', evidence: 0.95 });
    const take = rng.int(3000, 40000);
    c.skill.bankRobbery = (c.skill.bankRobbery ?? 0) + 1;
    c.earned += take;
    ctx.earn(take, 'Undisclosed income');
    ctx.log(`You passed a note to a teller and walked out with $${take.toLocaleString()}. The FBI has your picture.`, '🏦', 'warn');
    commitOffense(ctx, { offenseId: 'bankRobbery', discovery: 0.4, evidence: 0.9, context: 'surveillance photos of a bank robbery' });
  },
};

export const CrimeActions = Object.fromEntries(CRIMES.map((cr) => [cr.id, (ctx) => {
  const why = cr.needs?.(ctx.state);
  if (why) return ctx.toast(why, 'warn');
  if (!once(ctx, cr.id)) return;
  if (cr.custom) return CUSTOM[cr.custom](ctx);
  return crimeForMoney(ctx, { id: cr.id, group: cr.group, icon: cr.icon, ...cr.run });
}]));

/** Spend a year keeping your head down: heat falls much faster. */
CrimeActions.layLow = (ctx) => {
  const { state } = ctx;
  const c = crimeOf(state);
  if (c.layingLow) return ctx.toast('Already laying low this year', 'warn');
  c.layingLow = true;
  ctx.stat('happiness', -2);
  ctx.log('You stayed home, changed your number and stayed away from your old crew.', '🙈');
};
