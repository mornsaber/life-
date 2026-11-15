/**
 * Your own fund: other people's money, your strategy, your fees.
 *
 *   Launch      seed capital of your own, and either a few years in finance or a mind for it.
 *               Before 1949 (Alfred Jones's first hedged fund) it is an investment partnership.
 *   Strategy    long/short equity (from 1949), global macro (from 1970), quant (from 1982),
 *               activist (from 1985). Each has its own beta to the market, volatility and
 *               edge, and borrowing magnifies all of it.
 *   Fees        the classic 2 and 20: 2% of investors' money a year, and 20% of their gains —
 *               only above the fund's previous high (the high-water mark).
 *   Investors   come after good years, leave after bad ones. A big redemption: pay out, or put
 *               up the gates (and your reputation with it).
 *   Crashes     1987, 1998 (the year a famous fund lost $4.6 billion in weeks), 2007 (the quant
 *               quake) and 2008; any recession hurts a fund borrowed to the hilt.
 *   Temptation  a tip from inside a company: trade on it, or don't (insider trading is a
 *               felony, and investigators look hard at funds that are always right).
 *   Activism    take a stake in a listed company and push the board: a seat, a sale, a fight.
 *   Closing     return the outside money; what's left is your family office.
 *
 * state.fund = { name, kind, strategy, leverage, yours, outside, nav, hwm, rep, staff, since,
 *                record: [{ year, ret }], gated, closedToOutside }
 */
import { Random, clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, yearsInProfession } from '../../core/State.js';
import { yearNow } from '../world/Eras.js';
import { priceLevel } from '../world/Countries.js';
import { commitOffense } from '../legal/JusticeSystem.js';
import { addBuzz } from '../life/Fame.js';

const local = (state, n) => Math.round(n * priceLevel(state));
const side = (state, salt) => new Random(((state.world?.seed ?? 4) * 69621 + state.character.age * 1031 + salt) >>> 0);

export const STRATEGIES = {
  longShort: { label: 'Long/short equity', icon: '⚖️', from: 1949, beta: 0.5, vol: 0.12, edge: 1, desc: 'Own the good companies, short the bad: half the market\'s swings.' },
  macro: { label: 'Global macro', icon: '🌍', from: 1970, beta: 0, vol: 0.22, edge: 1.2, crisis: 0.15, desc: 'Bets on currencies, rates and countries. Often wins when everyone else loses.' },
  quant: { label: 'Quant', icon: '🧮', from: 1982, beta: 0.2, vol: 0.08, edge: 1.4, smarts: 1.5, desc: 'Models and machines. Steady — until everyone\'s model breaks at once.' },
  activist: { label: 'Activist', icon: '📣', from: 1985, beta: 0.9, vol: 0.16, edge: 0.9, desc: 'Big stakes in a few companies, and a fight with each board.' },
};
/** History's fund crashes: [year, how hard, which strategies it hit, what happened]. */
const CRASHES = [
  [1987, 0.25, ['longShort', 'activist', 'quant'], 'Black Monday: the market fell 22% in a day.'],
  [1998, 0.35, ['macro', 'quant'], 'Russia defaulted, and the most famous fund on Wall Street lost $4.6 billion in weeks. Lenders pulled credit from everyone using leverage.'],
  [2007, 0.2, ['quant'], 'The quant quake: every model sold the same stocks in the same week.'],
  [2008, 0.3, ['longShort', 'activist', 'quant', 'macro'], 'Lehman Brothers failed. Prime brokers froze, investors ran.'],
];

export const fundWord = (state, f = state.fund) => (f?.closedToOutside ? 'family office' : yearNow(state) < 1949 ? 'investment partnership' : 'hedge fund');
export const fundValue = (state) => Math.max(0, state.fund?.yours ?? 0);
/** The strategies of the day (before 1949 a partnership simply picks stocks and bonds). */
export const strategiesNow = (state) => {
  const y = yearNow(state);
  return Object.entries(STRATEGIES).filter(([id, s]) => id === 'longShort' || y >= s.from)
    .map(([id, s]) => (id === 'longShort' && y < 1949 ? { id, ...s, label: 'Stocks and bonds', desc: 'A partnership picking stocks and bonds for its partners.' } : { id, ...s }));
};

export function launchEligibility(state) {
  if (state.fund) return { ok: false, reason: 'You already run one' };
  if (state.character.age < 25) return { ok: false, reason: 'Age 25+' };
  const seed = local(state, 1000000);
  if ((state.finances?.cash ?? 0) < seed) return { ok: false, reason: `Needs $${seed.toLocaleString()} of your own to seed it`, seed };
  const finance = yearsInProfession(state, ['finance', 'investment', 'banking']) >= 3 || ['finance', 'investment'].includes(state.career.job?.professionId);
  if (!finance && state.stats.smarts < 80) return { ok: false, reason: 'Needs 3 years in finance, or smarts 80+', seed };
  return { ok: true, seed };
}

function launch(ctx, strategy = 'longShort') {
  const { state, rng } = ctx;
  const e = launchEligibility(state);
  if (!e.ok) return ctx.toast(e.reason, 'warn');
  const s = strategiesNow(state).find((x) => x.id === strategy) ?? strategiesNow(state)[0];
  ctx.spend(e.seed, 'Seed capital for your fund');
  const name = `${state.character.lastName} ${rng.pick(['Capital', 'Partners', 'Asset Management', 'Investors', 'Advisors'])}`;
  // Old colleagues and rich friends put in something at the start.
  const friends = local(state, rng.int(1, 4) * 1000000) * (yearsInProfession(state, ['finance', 'investment']) >= 5 ? 2 : 1);
  state.fund = { name, strategy: s.id, leverage: 1, yours: e.seed, outside: friends, nav: 100, hwm: 100, rep: 30, staff: 1, since: yearNow(state), record: [], gated: false, closedToOutside: false };
  ctx.log(`You launched ${name}, a ${fundWord(state).replace('hedge fund', `${s.label.toLowerCase()} fund`)}, with $${e.seed.toLocaleString()} of your own and $${friends.toLocaleString()} from friends and old colleagues.`, '💼', 'milestone');
  return undefined;
}

/** The fund's year: the return, the fees, the investors. */
function fundYear(ctx) {
  const { state } = ctx;
  const f = state.fund;
  if (!f) return;
  const rng = side(state, 0xf0d);
  const y = yearNow(state);
  const e = state.economy;
  const s = STRATEGIES[f.strategy] ?? STRATEGIES.longShort;
  const market = e?.returns?.index ?? 0.06;
  // Skill: how sharp you are, how many good people you have, how known you are.
  const skill = clamp((state.stats.smarts / 100) * (s.smarts ?? 1) * 0.6 + Math.min(f.staff, 8) * 0.03 + f.rep / 400, 0, 1.4);
  const alpha = (skill - 0.55) * 0.12 * s.edge;
  let r = s.beta * market + alpha + rng.float(-1, 1) * s.vol + (s.crisis && e?.phase === 'recession' ? s.crisis : 0);
  // Borrowing magnifies the result, and costs interest.
  r = r * f.leverage - (f.leverage - 1) * (e?.interestRate ?? 0.04);
  const crash = CRASHES.find(([yr, , hits]) => yr === y && hits.includes(f.strategy));
  if (crash) {
    r -= crash[1] * f.leverage * rng.float(0.6, 1.2);
    ctx.log(`${crash[3]} ${f.name} was hit.`, '💥', 'bad');
  } else if (e?.phase === 'recession' && f.leverage >= 3 && rng.chance(0.25)) {
    r -= rng.float(0.2, 0.5) * f.leverage / 2;
    ctx.log(`Your lenders called in their loans at the worst moment. ${f.name} had to sell everything at once.`, '📉', 'bad');
  }
  r = Math.max(-1, r);
  // Fees on outside money: 2% of assets, 20% of gains above the high-water mark.
  const outsideBefore = f.outside;
  const navAfter = f.nav * (1 + r);
  const above = Math.max(0, navAfter - Math.max(f.hwm, f.nav)) / f.nav;
  const mgmt = Math.round(outsideBefore * 0.02);
  const perf = Math.round(outsideBefore * above * 0.2);
  f.outside = Math.max(0, Math.round(outsideBefore * (1 + r)) - mgmt - perf);
  f.yours = Math.max(0, Math.round(f.yours * (1 + r)));
  f.nav = Math.max(0.01, navAfter);
  f.hwm = Math.max(f.hwm, f.nav);
  // Running costs: about 1% of assets (offices, data, lawyers, the prime broker), pay for each
  // hire beyond you, and from 2010 the compliance of a registered adviser.
  const costs = Math.max(local(state, 30000), Math.round((f.yours + f.outside) * 0.01)) + local(state, 150000) * Math.max(0, f.staff - 1) + (y >= 2010 && f.outside > 0 ? local(state, 100000) : 0);
  const fees = mgmt + perf - costs;
  if (fees >= 0) ctx.earn(fees, `${f.name}: fees`); else ctx.spend(-fees, `${f.name}: running costs`, { allowDebt: true });
  f.record = [...f.record.slice(-9), { year: y, ret: Math.round(r * 1000) / 1000 }];
  f.rep = clamp(f.rep + (r > 0.2 ? 8 : r > 0.08 ? 4 : r > 0 ? 1 : r > -0.1 ? -4 : -12), 0, 100);
  if (r > 0.25) addBuzz(state, 4);
  // Wiped out.
  if (f.nav < 5 || (f.yours + f.outside) < local(state, 100000)) {
    state.fund = null;
    ctx.stat('happiness', -20);
    return void ctx.log(`${f.name} is finished: a ${Math.round(-r * 100)}% loss, and the lenders took what was left. The papers called it the blow-up of the year.`, '💀', 'bad');
  }
  ctx.log(`${f.name} returned ${r >= 0 ? '+' : ''}${Math.round(r * 100)}% this year${fees > 0 ? `; your fees came to $${fees.toLocaleString()}` : ''}.`, r >= 0 ? '📈' : '📉', r >= 0 ? 'good' : 'warn');
  if (f.closedToOutside) return;
  // Investors follow performance (and the gates you put up).
  const flow = r > 0.15 ? rng.float(0.15, 0.45) : r > 0 ? rng.float(0, 0.15) : r > -0.1 ? -rng.float(0.05, 0.2) : -rng.float(0.25, 0.5);
  if (flow < -0.2 && f.outside > 0 && !state.prompts.some((p) => p.type === 'hedgeFund.redemptions')) {
    ctx.prompt({ type: 'hedgeFund.redemptions', icon: '🚪', title: 'Redemptions', text: `Investors want ${Math.round(-flow * 100)}% of their money back from ${f.name}: $${Math.round(f.outside * -flow).toLocaleString()}.`, data: { flow },
      options: [{ id: 'pay', label: '💸 Pay them out', hint: 'Sell positions, keep your name' }, { id: 'gate', label: '🚧 Put up the gates', hint: 'Keep the money; lose the trust' }] });
  } else f.outside = Math.max(0, Math.round(f.outside * (1 + flow * (0.6 + f.rep / 100))));
  // A tip from someone who knows.
  if (f.outside > 0 && rng.chance(0.06) && !state.prompts.some((p) => p.type === 'hedgeFund.tip')) {
    ctx.prompt({ type: 'hedgeFund.tip', icon: '🤫', title: 'A Tip', text: 'A friend at a company you follow says, over drinks, that the results next week will be a disaster. Nobody else knows.',
      options: [{ id: 'trade', label: '📉 Short it before the news', tone: 'danger', hint: 'Insider trading' }, { id: 'pass', label: '🙅 Pretend you never heard it' }] });
  }
}

export const HedgeFundResolvers = {
  redemptions(ctx, data, optionId) {
    const f = ctx.state.fund;
    if (!f) return;
    if (optionId === 'gate') {
      f.gated = true;
      f.rep = clamp(f.rep - 15, 0, 100);
      return ctx.log(`You suspended redemptions at ${f.name}. Investors were furious; the trade press was worse.`, '🚧', 'bad');
    }
    f.outside = Math.max(0, Math.round(f.outside * (1 + data.flow)));
    return ctx.log(`You paid every investor who asked. Painful, but they'll remember it.`, '💸', 'info');
  },
  tip(ctx, _data, optionId) {
    const { state, rng } = ctx;
    const f = state.fund;
    if (!f) return;
    if (optionId === 'pass') return ctx.log('You changed the subject and never traded on it.', '🙅', 'good');
    const gain = Math.round((f.yours + f.outside) * rng.float(0.02, 0.05));
    f.yours += Math.round(gain * 0.3);
    f.outside += Math.round(gain * 0.7);
    ctx.log(`You shorted the stock. When the results came out, ${f.name} made $${gain.toLocaleString()} in a day.`, '🤫', 'warn');
    commitOffense(ctx, { offenseId: 'insiderTrading', context: `at ${f.name}`, discovery: 0.25, evidence: 0.7 });
    return undefined;
  },
};

export const HedgeFundModule = {
  id: 'hedgeFund',
  order: 41,
  onAgeUp(ctx) { if (ctx.state.character.alive) fundYear(ctx); },
  actions: {
    launch,
    strategy(ctx, id) {
      const f = ctx.state.fund;
      const s = strategiesNow(ctx.state).find((x) => x.id === id);
      if (!f || !s) return ctx.toast('Not in this day', 'warn');
      f.strategy = id;
      return ctx.log(`${f.name} is now a ${s.label.toLowerCase()} fund.`, s.icon, 'info');
    },
    leverage(ctx, n) {
      const f = ctx.state.fund;
      if (!f) return undefined;
      f.leverage = clamp(Number(n) || 1, 1, 5);
      return ctx.log(`${f.name} is now borrowing ${f.leverage}× its capital.`, '🏦', f.leverage >= 3 ? 'warn' : 'info');
    },
    invest(ctx) {
      const { state } = ctx;
      const f = state.fund;
      const amt = Math.floor((state.finances.cash ?? 0) * 0.5);
      if (!f || amt <= 0) return ctx.toast('No spare cash', 'warn');
      ctx.spend(amt, `More of your money into ${f.name}`);
      f.yours += amt;
      return ctx.log(`You put another $${amt.toLocaleString()} of your own into ${f.name}.`, '💰', 'info');
    },
    withdraw(ctx) {
      const { state } = ctx;
      const f = state.fund;
      if (!f || f.yours <= 0) return ctx.toast('Nothing to take out', 'warn');
      const amt = Math.round(f.yours * 0.5);
      f.yours -= amt;
      ctx.earn(amt, `Withdrawal from ${f.name}`);
      return ctx.log(`You took $${amt.toLocaleString()} of your own money out of ${f.name}.`, '💸', 'info');
    },
    roadshow(ctx) {
      const { state, rng } = ctx;
      const f = state.fund;
      if (!f || f.closedToOutside) return ctx.toast('Not raising money', 'warn');
      if (yearlyCount(state, 'fund.roadshow')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'fund.roadshow');
      ctx.spend(local(state, 80000), 'Fundraising roadshow', { allowDebt: true });
      const good = f.record.filter((x) => x.ret > 0.08).length;
      const raised = Math.round(local(state, 1000000) * rng.float(0.5, 3) * (1 + good) * (0.4 + f.rep / 60) * (f.gated ? 0.3 : 1));
      f.outside += raised;
      f.gated = false;
      return ctx.log(`You flew from pension funds to family offices with your track record. ${f.name} raised $${raised.toLocaleString()}.`, '✈️', 'good');
    },
    hire(ctx) {
      const f = ctx.state.fund;
      if (!f) return undefined;
      if (f.staff >= 12) return ctx.toast('Big enough', 'warn');
      f.staff += 1;
      return ctx.log(`${f.name} hired another ${rng(ctx).pick(['analyst', 'trader', 'portfolio manager', 'quant', 'risk officer'])}.`, '🧑‍💼', 'info');
    },
    activist(ctx) {
      const { state, rng } = ctx;
      const f = state.fund;
      if (!f || yearNow(state) < 1985) return ctx.toast('Not in this day', 'warn');
      if (yearlyCount(state, 'fund.activist')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'fund.activist');
      const target = rng.pick(['a sleepy conglomerate', 'a retailer with too many stores', 'a bank sitting on cash', 'a media company with a feuding family board']);
      addBuzz(state, 5);
      if (rng.chance(0.4 + f.rep / 250)) {
        const gain = Math.round((f.yours + f.outside) * rng.float(0.03, 0.08));
        f.yours += Math.round(gain * (f.yours / (f.yours + f.outside || 1)));
        f.outside += gain - Math.round(gain * (f.yours / (f.yours + f.outside || 1)));
        f.rep = clamp(f.rep + 6, 0, 100);
        return ctx.log(`You took a stake in ${target} and wrote the board a public letter. They gave you two seats and sold a division; the shares jumped.`, '📣', 'good');
      }
      f.rep = clamp(f.rep - 4, 0, 100);
      return ctx.log(`You went after ${target}. The board adopted a poison pill and the shareholders sided with management.`, '📣', 'warn');
    },
    close(ctx) {
      const { state } = ctx;
      const f = state.fund;
      if (!f) return undefined;
      if (f.closedToOutside) {
        state.fund = null;
        ctx.earn(f.yours, `Winding up ${f.name}`);
        return ctx.log(`You wound up ${f.name} and took out $${f.yours.toLocaleString()}.`, '🏁', 'info');
      }
      f.outside = 0;
      f.closedToOutside = true;
      return ctx.log(`You returned every outside investor's money. ${f.name} is your family office now: just your fortune, no clients.`, '🏛️', 'milestone');
    },
  },
  resolvers: HedgeFundResolvers,
};
const rng = (ctx) => ctx.rng;
