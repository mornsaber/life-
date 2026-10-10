/**
 * Investing: a taxable brokerage account, Roth and Traditional IRAs,
 * speculative positions (meme stocks, pump-and-dumps), an auto-invest
 * toggle that sweeps surplus cash into a risk profile (delegation-style,
 * like ManagementEngine), and yearly market events.
 *
 * Taxes: dividends and long-term gains (held 1+ yr) are taxed at LTCG rates
 * by Finances; short-term gains and Treasury interest as ordinary income.
 *
 * state.investing = {
 *   holdings: { [asset]: { value, basis, lastBuyAge } },
 *   ira: { roth: { value, basis }, traditional: { value } },
 *   speculative: [{ id, name, kind: 'meme'|'pump', value, basis, boughtAge }],
 *   auto: { enabled, profile, keepMonths }
 * }
 */
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { ASSETS, PROFILES, profileReturn, realReturn, IRA_LIMIT, ROTH_INCOME_LIMIT } from './Assets.js';
import { ACCOUNTS } from '../world/CountryLaw.js';

/** The tax-advantaged accounts where you live: names and yearly limits (the US IRAs share one limit). */
export function accountsHere(state) {
  const a = ACCOUNTS[state.character.countryId];
  if (!a) return { dc: '401(k)/TSP', roth: { name: 'Roth IRA', short: 'Roth' }, traditional: { name: 'Traditional IRA', short: 'Traditional' }, shared: true };
  return { dc: a.dc, roth: a.roth && { ...a.roth, short: a.roth.name }, traditional: a.traditional && { ...a.traditional, short: a.traditional.name }, shared: false };
}
/** Room left this year in an account. */
export function accountRoom(state, kind, earned = state.career.job?.salary ?? 0) {
  const acc = accountsHere(state);
  if (acc.shared) return IRA_LIMIT(state.character.age) - yearlyCount(state, 'ira.contributed');
  const rule = acc[kind];
  if (!rule) return 0;
  const cap = rule.share ? Math.min(rule.limit, Math.round(earned * rule.share)) : rule.limit;
  return cap - yearlyCount(state, `ira.${kind}`);
}

const MEME_TICKERS = ['$GLOW', '$MOON', '$BRRR', '$APE', '$ZOOM', '$YOLO'];

export function portfolioValue(state) {
  const inv = state.investing;
  const brokerage = Object.values(inv.holdings).reduce((s, h) => s + h.value, 0) + inv.speculative.reduce((s, p) => s + p.value, 0);
  return { brokerage: Math.round(brokerage), ira: Math.round(inv.ira.roth.value + inv.ira.traditional.value), total: Math.round(brokerage + inv.ira.roth.value + inv.ira.traditional.value) };
}

function buy(ctx, asset, amount) {
  const { state } = ctx;
  const h = (state.investing.holdings[asset] ??= { value: 0, basis: 0, lastBuyAge: state.character.age });
  h.value += amount;
  h.basis += amount;
  h.lastBuyAge = state.character.age;
  state.finances.cash -= amount;
}

/** Sell `fraction` of a holding; realizes gains/losses for tax. Returns proceeds. */
export function sell(ctx, asset, fraction = 1) {
  const { state } = ctx;
  const h = state.investing.holdings[asset];
  if (!h || h.value <= 0) return 0;
  const value = Math.round(h.value * fraction);
  const basis = Math.round(h.basis * fraction);
  const gain = value - basis;
  const longTerm = state.character.age - h.lastBuyAge >= 1;
  h.value -= value;
  h.basis -= basis;
  if (h.value < 1) delete state.investing.holdings[asset];
  if (gain > 0) {
    state.finances.cash += basis;
    ctx.earn(gain, `${longTerm ? 'Long' : 'Short'}-term capital gain — ${ASSETS[asset].name}`, { ltcg: longTerm });
  } else {
    state.finances.cash += value;
    if (gain < 0) ctx.deduct(Math.min(3000, -gain), 'Capital loss', { nonCash: true });
  }
  return value;
}

/** Sell holdings pro rata to raise `amount` of cash. Returns proceeds. */
export function raiseCash(ctx, amount) {
  const holdings = ctx.state.investing.holdings;
  const total = Object.values(holdings).reduce((s, h) => s + h.value, 0);
  if (total <= 0 || amount <= 0) return 0;
  const fraction = Math.min(1, amount / total);
  return Object.keys(holdings).reduce((s, asset) => s + sell(ctx, asset, fraction), 0);
}

function buyProfile(ctx, profileId, amount) {
  for (const [asset, w] of Object.entries(PROFILES[profileId].mix)) buy(ctx, asset, Math.round(amount * w));
}

function marketEvent(ctx) {
  const { state, rng } = ctx;
  if (state.character.age < 18 || !rng.chance(0.12)) return;
  if (rng.chance(0.5) || state.economy.cryptoMania) {
    const ticker = rng.pick(MEME_TICKERS);
    ctx.prompt({
      type: 'investing.meme',
      icon: '🦍',
      title: `Meme Mania: ${ticker}`,
      text: `${ticker} is up 900% this month. Your group chat is losing its mind.`,
      options: [
        { id: 'yolo', label: '🚀 YOLO $5,000 in', tone: 'danger' },
        { id: 'small', label: '🎲 Put in $500 for fun' },
        { id: 'pass', label: '🧘 Stay with your index funds' },
      ],
      data: { ticker },
    });
  } else {
    ctx.prompt({
      type: 'investing.pump',
      icon: '📣',
      title: 'A Hot Tip',
      text: 'A private Discord says a penny stock is about to "10x." They want you to buy — and to help spread the word for a cut.',
      options: [
        { id: 'buy', label: '💸 Buy $3,000 worth', tone: 'danger' },
        { id: 'promote', label: '📣 Join as a paid promoter', hint: 'Securities fraud', tone: 'danger' },
        { id: 'report', label: '🚩 Report it to the SEC' },
        { id: 'pass', label: '🙅 Ignore it' },
      ],
    });
  }
}

export const BrokerageEngine = {
  id: 'investing',
  order: 86,

  init(state) {
    state.investing ??= { holdings: {}, ira: { roth: { value: 0, basis: 0 }, traditional: { value: 0 } }, speculative: [], auto: { enabled: false, profile: 'balanced', keepMonths: 6 } };
  },

  setup(engine) {
    // The SEC claws back insider-trading profits on conviction.
    engine.bus.on('legal:convicted', ({ ctx, offenseId }) => {
      if (offenseId !== 'insiderTrading') return;
      const h = ctx.state.investing.holdings.finance;
      if (h) {
        ctx.log(`The SEC ordered disgorgement of $${Math.round(h.value).toLocaleString()} from your brokerage account.`, '⚖️', 'bad');
        delete ctx.state.investing.holdings.finance;
      }
    });
    // Insider-trading profits land in the brokerage account.
    engine.bus.on('investing:windfall', ({ ctx, asset, amount }) => {
      const h = (ctx.state.investing.holdings[asset] ??= { value: 0, basis: 0, lastBuyAge: ctx.state.character.age });
      h.value += amount;
    });
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const inv = state.investing;
    const e = state.economy;
    // Auto-invest also works in reverse: it sells to pay off card debt.
    if (inv.auto.enabled && state.finances.cash < 0) {
      const raised = raiseCash(ctx, -state.finances.cash);
      if (raised) ctx.log(`Auto-invest sold $${raised.toLocaleString()} of investments to cover your card balance.`, '🤖', 'finance');
    }
    let dividends = 0;
    let interest = 0;
    for (const [asset, h] of Object.entries(inv.holdings)) {
      const def = ASSETS[asset];
      if (def.interest) {
        interest += h.value * def.ret(e);
        h.value = h.value * (1 + realReturn(e, 0));
      } else h.value = Math.max(0, h.value * (1 + realReturn(e, def.ret(e))));
      dividends += h.value * def.dividend;
      h.value = Math.round(h.value);
    }
    if (dividends) ctx.earn(Math.round(dividends), 'Qualified dividends', { ltcg: true });
    if (interest) ctx.earn(Math.round(interest), 'Treasury interest');

    // Speculative positions resolve fast and brutally.
    for (const p of inv.speculative) {
      const mult = p.kind === 'pump' ? rng.float(0.05, 0.3) : rng.chance(0.4) ? rng.float(1.5, 6) : rng.float(0.05, 0.5);
      p.value = Math.round(p.value * mult);
      ctx.log(`${p.name}: ${mult >= 1 ? `🚀 up ${Math.round((mult - 1) * 100)}%` : `💥 down ${Math.round((1 - mult) * 100)}%`} — now worth $${p.value.toLocaleString()}. You sold.`, p.kind === 'pump' ? '📣' : '🦍', mult >= 1 ? 'good' : 'bad');
      const gain = p.value - p.basis;
      if (gain > 0) {
        state.finances.cash += p.basis;
        ctx.earn(gain, `Short-term gain — ${p.name}`);
      } else {
        state.finances.cash += p.value;
        ctx.deduct(Math.min(3000, -gain), 'Capital loss', { nonCash: true });
      }
    }
    inv.speculative = [];

    // IRAs
    const iraRet = realReturn(e, profileReturn(e, inv.auto.profile));
    inv.ira.roth.value = Math.round(Math.max(0, inv.ira.roth.value * (1 + iraRet)));
    inv.ira.traditional.value = Math.round(Math.max(0, inv.ira.traditional.value * (1 + iraRet)));
    if (state.retirement.retired && state.character.age >= 60) {
      const trad = Math.round(inv.ira.traditional.value * 0.04);
      const roth = Math.round(inv.ira.roth.value * 0.04);
      inv.ira.traditional.value -= trad;
      inv.ira.roth.value -= roth;
      if (trad) ctx.earn(trad, 'Traditional IRA distribution');
      state.finances.cash += roth;
    }
    marketEvent(ctx);
  },

  /**
   * Auto-invest sweeps surplus cash. Finances settles taxes and living costs
   * after this (order 90), so the sweep reserves last year's bills plus an
   * emergency fund of `keepMonths` of expenses.
   */
  onYearEnd(ctx) {
    const { state } = ctx;
    const auto = state.investing.auto;
    if (!auto.enabled || state.character.age < 18) return;
    const ly = state.finances.lastYear ?? {};
    const housing = (state.housing.rental?.rent ?? 0) * 12 + state.housing.properties.reduce((s, p) => s + (p.mortgage?.payment ?? 0), 0);
    const yearly = (ly.living ?? 20000) + (ly.insurance ?? 0) + housing;
    const surplus = Math.round(state.finances.cash - (ly.tax ?? 0) - yearly - (yearly / 12) * auto.keepMonths);
    if (surplus < 1000) return;
    buyProfile(ctx, auto.profile, surplus);
    ctx.log(`Auto-invest swept $${surplus.toLocaleString()} into your ${PROFILES[auto.profile].name} portfolio.`, '🤖', 'finance');
  },

  actions: {
    /** arg 'asset:amount' */
    buy(ctx, arg) {
      const [asset, raw] = String(arg).split(':');
      const amount = Math.round(Number(raw));
      if (!ASSETS[asset] || !(amount > 0)) return;
      if (ctx.state.character.age < 18) return ctx.toast('You need to be 18 to open a brokerage account.', 'warn');
      if (ctx.state.finances.cash < amount) return ctx.toast(`You need $${amount.toLocaleString()} in cash.`, 'warn');
      buy(ctx, asset, amount);
      ctx.log(`You bought $${amount.toLocaleString()} of ${ASSETS[asset].name}.`, ASSETS[asset].icon);
    },
    sell(ctx, asset) {
      const proceeds = sell(ctx, asset, 1);
      if (proceeds) ctx.log(`You sold your ${ASSETS[asset].name} for $${proceeds.toLocaleString()}.`, ASSETS[asset].icon);
    },
    rebalance(ctx) {
      const { state } = ctx;
      let total = 0;
      for (const asset of Object.keys(state.investing.holdings)) total += sell(ctx, asset, 1);
      if (total > 0) buyProfile(ctx, state.investing.auto.profile, total);
      ctx.log(`You rebalanced $${total.toLocaleString()} into the ${PROFILES[state.investing.auto.profile].name} mix.`, '⚖️');
    },
    setProfile(ctx, profileId) {
      if (!PROFILES[profileId]) return;
      ctx.state.investing.auto.profile = profileId;
      ctx.toast(`Risk profile: ${PROFILES[profileId].name}`, 'info');
    },
    toggleAuto(ctx) {
      const auto = ctx.state.investing.auto;
      auto.enabled = !auto.enabled;
      ctx.toast(auto.enabled ? `Auto-invest ON — keeping ${auto.keepMonths} months of expenses in cash` : 'Auto-invest OFF', 'info');
    },
    /** arg 'roth' | 'traditional' — contributes the remaining annual limit you can afford. */
    iraContribute(ctx, kind) {
      const { state } = ctx;
      if (!['roth', 'traditional'].includes(kind)) return;
      const earned = state.finances.ledger.income.filter((i) => i.wage).reduce((s, i) => s + i.amount, 0) || (state.career.job?.salary ?? 0);
      const acc = accountsHere(state);
      if (!acc[kind]) return ctx.toast('There\'s no such account here.', 'warn');
      if (!earned) return ctx.toast('Contributions need earned income.', 'warn');
      if (acc.shared && kind === 'roth' && (state.finances.lastYear?.gross ?? 0) > ROTH_INCOME_LIMIT) return ctx.toast('Your income is over the Roth limit.', 'warn');
      const room = accountRoom(state, kind, earned);
      const amount = Math.min(room, Math.floor(state.finances.cash));
      if (amount <= 0) return ctx.toast(room <= 0 ? `You've maxed your ${acc[kind].name} this year.` : 'No cash to contribute.', 'warn');
      if (acc.shared) state.yearly['ira.contributed'] = yearlyCount(state, 'ira.contributed') + amount;
      else state.yearly[`ira.${kind}`] = yearlyCount(state, `ira.${kind}`) + amount;
      state.finances.cash -= amount;
      if (kind === 'roth') {
        state.investing.ira.roth.value += amount;
        state.investing.ira.roth.basis += amount;
      } else {
        state.investing.ira.traditional.value += amount;
        ctx.deduct(amount, `${acc.traditional.name} contribution`);
      }
      ctx.log(`You contributed $${amount.toLocaleString()} to your ${acc[kind].name}.`, '🏦');
    },
    iraWithdraw(ctx) {
      const { state } = ctx;
      const ira = state.investing.ira;
      const early = state.character.age < 60;
      const fromRoth = Math.min(10000, ira.roth.value, early ? ira.roth.basis : Infinity);
      if (fromRoth > 0) {
        ira.roth.value -= fromRoth;
        ira.roth.basis = Math.max(0, ira.roth.basis - fromRoth);
        state.finances.cash += fromRoth;
        return ctx.log(`You withdrew $${fromRoth.toLocaleString()} of Roth contributions tax-free.`, '🏦');
      }
      const fromTrad = Math.min(10000, ira.traditional.value);
      if (fromTrad <= 0) return ctx.toast('Nothing to withdraw.', 'warn');
      ira.traditional.value -= fromTrad;
      const penalty = early ? Math.round(fromTrad * 0.1) : 0;
      ctx.earn(fromTrad - penalty, 'Traditional IRA withdrawal');
      ctx.log(`You withdrew $${fromTrad.toLocaleString()} from your Traditional IRA${penalty ? ` (penalty $${penalty.toLocaleString()})` : ''}.`, '🏦', penalty ? 'warn' : 'finance');
    },
  },

  resolvers: {
    meme(ctx, data, optionId) {
      const { state } = ctx;
      const amount = optionId === 'yolo' ? 5000 : optionId === 'small' ? 500 : 0;
      if (!amount) return ctx.log('You sat this one out.', '🧘');
      const spend = Math.min(amount, Math.max(0, Math.floor(state.finances.cash)));
      if (spend < 100) return ctx.log('You didn\'t have the cash to get in.', '🧘');
      state.finances.cash -= spend;
      state.investing.speculative.push({ id: ctx.rng.id('spec_'), name: data.ticker, kind: 'meme', value: spend, basis: spend, boughtAge: state.character.age });
      ctx.log(`You bought $${spend.toLocaleString()} of ${data.ticker}. 🚀🚀🚀`, '🦍', 'warn');
    },
    pump(ctx, _data, optionId) {
      const { state, rng } = ctx;
      if (optionId === 'buy') {
        const spend = Math.min(3000, Math.max(0, Math.floor(state.finances.cash)));
        if (spend < 100) return;
        state.finances.cash -= spend;
        state.investing.speculative.push({ id: rng.id('spec_'), name: 'a hyped penny stock', kind: 'pump', value: spend, basis: spend, boughtAge: state.character.age });
        ctx.log('You bought into the "10x" penny stock.', '📣', 'warn');
      } else if (optionId === 'promote') {
        ctx.earn(rng.int(10000, 40000), 'Undisclosed income');
        ctx.emit('legal:offense', { offenseId: 'securitiesFraud', context: 'pump-and-dump promotion', discovery: 0.3, evidence: 0.8 });
        ctx.log('You hyped the stock to strangers and got paid as they bought.', '📣', 'warn');
      } else if (optionId === 'report') {
        ctx.log('You tipped off the SEC. The ring was charged months later.', '🚩', 'good');
        ctx.stat('happiness', 2);
      }
    },
  },
};

