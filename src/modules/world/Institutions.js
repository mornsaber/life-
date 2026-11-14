/**
 * Institutions of their day: the bank that may not open in the morning, the newspaper you
 * might own, and the courtroom where the law gets made.
 *
 *   Bank runs     in a banking panic (1825, 1837, 1857, Overend Gurney in 1866, 1873, 1893,
 *                 1907, the bank failures of 1930–33, Germany and Austria 1931, the corralito
 *                 of 2001, Iceland 2008) savers queue at the doors. Before deposit insurance
 *                 (America's FDIC 1934, Germany 1966, Britain 1979, France 1980, most places by
 *                 the 1990s) a failed bank took your savings with it: queue early and get some
 *                 out, or trust it and hope.
 *   The press     the rich can own a paper, a radio station or a television channel where the
 *                 state allows it: the penny press from 1833, the popular dailies from 1896,
 *                 commercial radio (America 1920, Britain 1973), commercial television (America
 *                 1946, Britain 1955, most of Europe in the 1980s), cable news from 1980, a news
 *                 site from 1995. An editorial line (sober, crusading, scandal) brings readers,
 *                 influence — over elections, if you hold office or back a party — and libel
 *                 writs. Under a regime without a free press, there is nothing to buy.
 *   Landmark      a lawyer's case can become the precedent the textbooks cite: "R v ..." or
 *     cases       "... v. ..." with your client's name, and a line in legal history.
 *
 * state.press = { outlet, kind, scale, line, since, readers, influence, writs }
 * state.landmarks = [{ year, name, point }]
 */
import { Random, clamp } from '../../core/Random.js';
import { yearNow } from './Eras.js';
import { statuteIn } from '../politics/StatuteBook.js';
import { priceLevel } from './Countries.js';
import { regimeHere } from './Regimes.js';
import { addBuzz } from '../life/Fame.js';
import { addHonor } from '../../core/State.js';

const cc = (state) => state.character.countryId ?? 'US';
const side = (state, salt) => new Random(((state.world?.seed ?? 9) * 2654435761 + yearNow(state) * 104729 + salt) >>> 0);
const P = (state, n) => Math.round(n * priceLevel(state));

/* ------------------------------------------------------------------ */
/* Bank runs                                                           */
/* ------------------------------------------------------------------ */
export const BANK_PANICS = [
  { id: 'panic1825', years: [1825, 1826], where: ['GB'], name: 'the Panic of 1825', fail: 0.25 },
  { id: 'panic1837', years: [1837, 1837], where: ['US', 'GB'], name: 'the Panic of 1837', fail: 0.3 },
  { id: 'panic1857', years: [1857, 1857], where: ['US', 'GB'], name: 'the Panic of 1857', fail: 0.2 },
  { id: 'overend', years: [1866, 1866], where: ['GB'], name: 'the collapse of Overend, Gurney', fail: 0.2 },
  { id: 'panic1873', years: [1873, 1873], where: ['US', 'DE', 'AT'], name: 'the Panic of 1873', fail: 0.25 },
  { id: 'panic1893', years: [1893, 1893], where: ['US', 'AU'], name: 'the Panic of 1893', fail: 0.3 },
  { id: 'panic1907', years: [1907, 1907], where: ['US'], name: 'the Panic of 1907', fail: 0.15 },
  { id: 'bankFailures', years: [1930, 1933], where: ['US'], name: 'the bank failures', fail: 0.35 },
  { id: 'creditanstalt', years: [1931, 1931], where: ['DE', 'AT'], name: 'the Creditanstalt crash', fail: 0.3 },
  { id: 'corralito', years: [2001, 2001], where: ['AR'], name: 'the corralito', fail: 0.5, frozen: true },
  { id: 'northernRock', years: [2007, 2008], where: ['GB'], name: 'the run on Northern Rock', fail: 0.1 },
  { id: 'iceland', years: [2008, 2008], where: ['IS'], name: 'the collapse of the Icelandic banks', fail: 0.4 },
];
/** When deposit insurance began. */
/** Insured from history's date, or from the year a bill in this world brought it in (politics/StatuteBook.js). */
export const depositsInsured = (state) => statuteIn(state, 'depositInsurance', cc(state));
export const panicNow = (state) => { const y = yearNow(state); return BANK_PANICS.find((p) => y >= p.years[0] && y <= p.years[1] && p.where.includes(cc(state))) ?? null; };

function bankTick(ctx) {
  const { state } = ctx;
  const p = panicNow(state);
  const done = (state.bankRuns ??= []);
  if (!p || done.includes(p.id) || state.character.age < 18) return;
  const cash = state.finances?.cash ?? 0;
  if (cash < P(state, 2000)) return;
  done.push(p.id);
  if (depositsInsured(state) && !p.frozen) return ctx.log(`${p.name.replace(/^./, (c) => c.toUpperCase())}: queues outside the banks — but your deposits are insured. You stayed home.`, '🏦', 'info');
  ctx.prompt({ type: 'publicLife.bankRun', icon: '🏦', title: 'A Run on the Bank', text: `${p.name.replace(/^./, (c) => c.toUpperCase())}. ${p.frozen ? 'The government has frozen withdrawals; you can take out a little each week.' : 'There is a crowd outside your bank, and the doors open at nine.'} You have $${Math.round(cash).toLocaleString()} in it.`, data: { id: p.id }, options: [
    { id: 'queue', label: '🏃 Join the queue and get your money out', hint: 'If they still have it when you reach the counter' },
    { id: 'trust', label: '🤝 Trust the bank', hint: p.frozen ? 'Wait it out' : 'If everyone stays calm, it survives' },
  ] });
}

/* ------------------------------------------------------------------ */
/* The press                                                           */
/* ------------------------------------------------------------------ */
const PRIVATE_RADIO = { US: 1920, GB: 1973, CA: 1922, AU: 1923 };
const PRIVATE_TV = { US: 1946, GB: 1955, CA: 1961, AU: 1956, JP: 1953, IT: 1976, FR: 1984, DE: 1984 };
export const OUTLETS = {
  paper: { label: (y) => (y < 1896 ? 'a penny newspaper' : y < 1995 ? 'a daily newspaper' : 'a newspaper and its website'), icon: '📰', from: () => 1800, cost: [400000, 25000000] },
  radio: { label: () => 'a radio station', icon: '📻', from: (c) => PRIVATE_RADIO[c] ?? 1985, cost: [600000, 40000000] },
  tv: { label: () => 'a television channel', icon: '📺', from: (c) => PRIVATE_TV[c] ?? 1988, cost: [5000000, 400000000] },
  cable: { label: () => 'a cable news network', icon: '📡', from: (c) => (c === 'US' ? 1980 : 1996), cost: [50000000, 900000000] },
  site: { label: () => 'a news website', icon: '🌐', from: () => 1995, cost: [150000, 15000000] },
};
export const LINES = { sober: 'Sober and reliable', crusading: 'Crusading', scandal: 'Scandal and sensation', partisan: 'Partisan' };
export function outletsNow(state) {
  const y = yearNow(state);
  if (regimeHere(state)?.press && regimeHere(state).press !== 'free') return [];
  return Object.entries(OUTLETS).filter(([, o]) => y >= o.from(cc(state))).map(([id, o]) => ({ id, label: o.label(y), icon: o.icon, local: P(state, o.cost[0]), national: P(state, o.cost[1]) }));
}
function buyOutlet(ctx, arg) {
  const { state, rng } = ctx;
  const [kind, scale] = String(arg).split(':');
  const o = outletsNow(state).find((x) => x.id === kind);
  if (!o) return ctx.toast(regimeHere(state)?.press !== 'free' ? 'The state controls the press' : 'Not in this day', 'warn');
  if (state.press) return ctx.toast('You already own an outlet', 'warn');
  const price = scale === 'national' ? o.national : o.local;
  if ((state.finances?.cash ?? 0) < price) return ctx.toast(`Needs $${price.toLocaleString()}`, 'warn');
  ctx.spend(price, `Bought ${o.label}`);
  const name = `The ${rng.pick(['Morning', 'Evening', 'Daily', 'Weekly', 'Sunday', 'National'])} ${rng.pick(['Courier', 'Herald', 'Chronicle', 'Express', 'Gazette', 'Clarion', 'Post', 'Mirror'])}`;
  state.press = { outlet: kind === 'paper' ? name : `${state.character.lastName} ${kind === 'radio' ? 'Radio' : kind === 'site' ? 'News' : 'Broadcasting'}`, kind, scale, line: 'sober', since: yearNow(state), price, readers: scale === 'national' ? 400000 : 20000, level: priceLevel(state), influence: scale === 'national' ? 30 : 8, writs: 0 };
  ctx.log(`You bought ${o.label}: ${state.press.outlet}. A ${scale} voice is yours.`, o.icon, 'milestone');
}
/** What the outlet is worth now: its price carried forward with the prices of the day. */
const worth = (state, p) => p.price * (p.level ? priceLevel(state) / p.level : 1);
/** A national paper tops out around four million readers, a local one at a quarter of a million. */
const readerCap = (p) => (p.scale === 'national' ? 4000000 : 250000);
/** Half its price for the presses and the name, the rest for its readers: up to 1.5×. */
export const salePrice = (state, p) => Math.round(worth(state, p) * (0.5 + Math.min(p.readers, readerCap(p)) / readerCap(p)));
function pressTick(ctx) {
  const { state } = ctx;
  const p = state.press;
  if (!p) return;
  if (regimeHere(state)?.press && regimeHere(state).press !== 'free') {
    state.press = null;
    return ctx.log(`The new regime closed ${p.outlet} and took the presses. You got nothing.`, '🚫', 'bad');
  }
  const rng = side(state, 53);
  const grow = { sober: 1.02, crusading: 1.05, scandal: 1.15, partisan: 1.04 }[p.line];
  p.readers = Math.min(readerCap(p), Math.round(p.readers * grow * rng.float(0.9, 1.08)));
  p.influence = clamp(p.influence + { sober: 1, crusading: 3, scandal: 0, partisan: 2 }[p.line] - 1, 0, 100);
  const margin = { sober: 0.08, crusading: 0.05, scandal: 0.11, partisan: 0.06 }[p.line];
  const profit = Math.round(worth(state, p) * margin * rng.float(-0.4, 1.4));
  if (profit >= 0) ctx.earn(profit, `${p.outlet}: profits`); else ctx.spend(-profit, `${p.outlet}: losses`, { allowDebt: true });
  if (state.politics?.office || state.politics?.campaign) state.politics.recognition = clamp((state.politics.recognition ?? 0) + Math.round(p.influence / 10), 0, 100);
  addBuzz(state, p.influence >= 50 ? 3 : 1);
  if (['scandal', 'crusading'].includes(p.line) && rng.chance(p.line === 'scandal' ? 0.18 : 0.08)) {
    p.writs += 1;
    const lost = rng.chance(0.45);
    if (lost) ctx.spend(Math.round(worth(state, p) * 0.05), `Libel damages: ${p.outlet}`, { allowDebt: true });
    ctx.log(lost ? `${p.outlet} lost a libel action and paid heavy damages.` : `${p.outlet} was sued for libel and won: the story was true.`, '⚖️', lost ? 'bad' : 'good');
  }
}

/* ------------------------------------------------------------------ */
/* Landmark cases                                                      */
/* ------------------------------------------------------------------ */
const POINTS = ['the duty of care a manufacturer owes its customers', 'the right to silence', 'the limits of free speech', 'what a contract needs to bind', 'the right to a lawyer', 'equal treatment under the law', 'privacy in your own home', 'when an employer is liable for its workers'];
function landmarkTick(ctx) {
  const { state } = ctx;
  const j = state.career?.job;
  if (!j || !['law', 'prosecution', 'publicDefender'].includes(j.professionId) || state.stats.smarts < 65) return;
  const rng = side(state, 71);
  if (!rng.chance(0.02)) return;
  const y = yearNow(state);
  const client = rng.pick(['Donoghue', 'Hadley', 'Carlill', 'Gideon', 'Miranda', 'Fletcher', 'Rylands', 'Entick', 'Wainwright', 'Ashby']);
  const name = cc(state) === 'US' ? `${client} v. ${rng.pick(['State', 'United States', 'Board of Education', 'Smith'])}` : `${client} v ${rng.pick(['Stevenson', 'Carrington', 'the Crown', 'Baxendale'])}`;
  const point = rng.pick(POINTS);
  (state.landmarks ??= []).push({ year: y, name, point });
  addHonor(state, { id: `landmark.${y}`, source: 'civil', name: `Counsel in ${name}`, icon: '⚖️', prestige: 12, precedence: 40, citation: `A landmark case on ${point}.` });
  addBuzz(state, 6);
  ctx.log(`Your case, ${name}, went all the way to the ${cc(state) === 'US' ? 'Supreme Court' : y < 2009 && cc(state) === 'GB' ? 'House of Lords' : 'highest court'}. It is now the leading authority on ${point}.`, '⚖️', 'milestone');
}

export const PublicLifeResolvers = {
  bankRun(ctx, data, optionId) {
    const { state, rng } = ctx;
    const p = BANK_PANICS.find((x) => x.id === data.id);
    if (!p) return;
    const cash = state.finances.cash;
    const fails = rng.chance(p.fail * (optionId === 'trust' ? 1.2 : 1));
    if (optionId === 'queue') {
      if (!fails) return ctx.log('You queued for hours and got every penny out. The bank survived anyway.', '🏦', 'info');
      const got = rng.chance(0.55);
      if (got) return ctx.log('You reached the counter before the shutters came down. Your money was safe under the mattress.', '🏃', 'good');
      state.finances.cash = Math.round(cash * 0.4);
      return ctx.log('The shutters came down three places ahead of you. The bank paid forty cents on the dollar, years later.', '🚪', 'bad');
    }
    if (!fails) return ctx.log('You trusted the bank, and it held.', '🤝', 'good');
    state.finances.cash = Math.round(cash * (p.frozen ? 0.6 : 0.3));
    ctx.stat('happiness', -12);
    ctx.log(p.frozen ? 'Your savings were frozen and converted at a fraction of their value.' : 'The bank failed. Most of your savings went with it.', '💸', 'bad');
  },
};

export const PublicLifeModule = {
  id: 'publicLife',
  order: 34,
  onAgeUp(ctx) { bankTick(ctx); pressTick(ctx); landmarkTick(ctx); },
  actions: {
    buyOutlet,
    line(ctx, line) { if (ctx.state.press && LINES[line]) { ctx.state.press.line = line; ctx.log(`${ctx.state.press.outlet} is now ${LINES[line].toLowerCase()}.`, '🖋️', 'info'); } },
    sellOutlet(ctx) { const p = ctx.state.press; if (!p) return; ctx.earn(salePrice(ctx.state, p), `Sold ${p.outlet}`); ctx.state.press = null; ctx.log(`You sold ${p.outlet}.`, '📰', 'info'); },
  },
  resolvers: PublicLifeResolvers,
};
