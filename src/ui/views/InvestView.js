/**
 * Invest panel (Money tab): brokerage holdings, buy/sell, risk profile,
 * auto-invest, IRAs and the 401(k)/TSP fund lineup.
 */
import { esc, money, button, card, chip, kv, empty, select, disclosure } from '../Components.js';
import { accountsHere, accountRoom } from '../../modules/investing/Brokerage.js';
import { STOCK_INDEX } from '../../modules/world/CountryLaw.js';
import { ASSETS, PROFILES, DC_FUNDS, IRA_LIMIT, portfolioValue } from '../../modules/investing/index.js';
import { yearlyCount } from '../../core/State.js';
import { DC_RATES, DEFAULT_DC_RATE } from '../../modules/retirement/RetirementEngine.js';

const pct = (x) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`;

export function investView(state) {
  const inv = state.investing;
  if (!inv) return '';
  const age = state.character.age;
  const e = state.economy;
  const pv = portfolioValue(state);

  const rows = Object.entries(inv.holdings).map(([id, h]) => {
    const a = ASSETS[id];
    const gain = h.value - h.basis;
    return `<li class="region-row"><span>${a.icon} <b>${esc(a.name)}</b></span>
      <small>${money(h.value)} · basis ${money(h.basis)} · <span class="${gain >= 0 ? 'pos' : 'neg'}">${gain >= 0 ? '+' : ''}${money(gain)}</span>${age - h.lastBuyAge < 1 ? ' · short-term' : ''}</small>
      ${button('Sell', 'investing.sell', { arg: id, variant: 'tiny' })}</li>`;
  }).join('');
  const spec = inv.speculative.map((p) => `<li>${p.kind === 'pump' ? '📣' : '🦍'} <b>${esc(p.name)}</b> — ${money(p.value)} <small>resolves next year</small></li>`).join('');

  const amounts = [1000, 5000, 10000, 25000, 100000].map((v) => ({ value: String(v), label: money(v), disabled: state.finances.cash < v }));
  const buyForm = age >= 18 ? `<div class="toggle-row" data-collect-root>
      ${select('asset', Object.entries(ASSETS).map(([id, a]) => ({ value: id, label: `${a.icon} ${a.name} (last yr ${pct(id === 'treasuries' ? e.interestRate : a.ret(e))})` })), { label: 'Buy' })}
      ${select('amount', amounts, { label: 'Amount' })}
      ${button('🛒 Buy', 'investing.buy', { variant: 'small', collect: true, disabled: state.finances.cash < 1000 })}
    </div>` : '<p class="muted">You can open a brokerage account at 18.</p>';

  const profiles = Object.entries(PROFILES).map(([id, p]) => button(`${p.icon} ${p.name}`, 'investing.setProfile', { arg: id, variant: inv.auto.profile === id ? 'small on' : 'small' })).join('');
  const funds = Object.entries(DC_FUNDS).map(([id, f]) => button(`${f.icon} ${f.name}`, 'retirement.setDcFund', { arg: id, variant: (state.retirement.dcFund ?? 'balanced') === id ? 'small on' : 'small' })).join('');
  const iraRoom = IRA_LIMIT(age) - yearlyCount(state, 'ira.contributed');
  const acc = accountsHere(state);

  return card('Invest', `
    <p>${chip(`Market: ${e.phase}`, e.phase === 'recession' ? 'bad' : e.phase === 'expansion' ? 'good' : '')} ${chip(`${STOCK_INDEX[state.character.countryId ?? 'US'] ?? 'S&P'} last yr ${pct(e.returns.index)}`, e.returns.index >= 0 ? 'green' : 'bad')} ${e.cryptoMania ? chip('🪙 Crypto mania', 'warn') : ''}</p>
    ${kv([['Brokerage', money(pv.brokerage)], [acc.shared ? 'IRAs' : 'Tax-free & pension savings', `${money(pv.ira)} <small>(${[acc.roth || inv.ira.roth.value ? `${esc(acc.roth?.short ?? 'Tax-free')} ${money(inv.ira.roth.value)}` : '', acc.traditional ? `${esc(acc.traditional.short)} ${money(inv.ira.traditional.value)}` : ''].filter(Boolean).join(' · ')})</small>`], ['Total invested', `<b>${money(pv.total)}</b>`]])}
    <h4 class="sub">Holdings</h4>${rows ? `<ul class="history">${rows}</ul>` : empty('No investments yet.')}
    ${spec ? `<h4 class="sub">Speculative bets</h4><ul class="history">${spec}</ul>` : ''}
    ${buyForm}
    ${disclosure('invest.settings', `⚙️ Risk profile, auto-invest, ${acc.shared ? 'IRAs & 401(k)' : 'savings accounts & pension'}`, `
    <h4 class="sub">Risk profile</h4><div class="toggle-row">${profiles}
      ${button(inv.auto.enabled ? '🤖 Auto-invest: ON' : '🤖 Auto-invest: OFF', 'investing.toggleAuto', { variant: inv.auto.enabled ? 'small on' : 'small', hint: `Sweeps cash beyond ${inv.auto.keepMonths} months of expenses` })}
      ${button('⚖️ Rebalance', 'investing.rebalance', { variant: 'small', disabled: !rows, hint: 'Sells everything (taxable) and rebuys the mix' })}</div>
    <h4 class="sub">${acc.shared ? `IRAs (${money(Math.max(0, iraRoom))} room left this year)` : 'Tax-advantaged accounts'}</h4><div class="toggle-row">
      ${acc.roth ? button(`🌱 ${acc.roth.name}`, 'investing.iraContribute', { arg: 'roth', variant: 'small', disabled: age < 18 || accountRoom(state, 'roth') <= 0, hint: acc.shared ? 'After-tax, tax-free later' : `Tax-free growth · ${money(Math.max(0, accountRoom(state, 'roth')))} room` }) : ''}
      ${acc.traditional ? button(`🏦 ${acc.traditional.name}`, 'investing.iraContribute', { arg: 'traditional', variant: 'small', disabled: age < 18 || accountRoom(state, 'traditional') <= 0, hint: acc.shared ? 'Tax deduction now' : `Tax relief now · ${money(Math.max(0, accountRoom(state, 'traditional')))} room` }) : ''}
      ${button('🏧 Withdraw $10K', 'investing.iraWithdraw', { variant: 'small', disabled: pv.ira <= 0, hint: age < 60 ? 'Roth contributions first; 10% penalty on Traditional' : 'Penalty-free' })}</div>
    <h4 class="sub">${esc(acc.dc)} contribution</h4><div class="toggle-row">${DC_RATES.map((r) => button(`${Math.round(r * 100)}%`, 'retirement.setDcRate', { arg: String(r), variant: (state.retirement.dcRate ?? DEFAULT_DC_RATE) === r ? 'tiny on' : 'tiny' })).join('')}</div>
    <p class="fine">Pre-tax, from each paycheck. Employers match what you put in, up to their match rate.</p>
    <h4 class="sub">${esc(acc.dc)} fund</h4><div class="toggle-row">${funds}</div>
    `)}
    <p class="fine">Dividends and gains on holdings kept 1+ year are taxed at long-term capital gains rates (0/15/20%); short-term gains and Treasury interest as ordinary income. Up to $3,000/yr of losses offset income.</p>`, { icon: '📈', accent: 'cyan' });
}
