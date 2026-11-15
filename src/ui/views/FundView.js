/**
 * Your fund (investing/HedgeFund.js): launch it, run it, close it.
 */
import { esc, button, card, kv } from '../Components.js';
import { launchEligibility, strategiesNow, fundWord, STRATEGIES } from '../../modules/investing/HedgeFund.js';
import { yearNow } from '../../modules/world/Eras.js';

const money = (n) => `$${Math.round(n).toLocaleString()}`;

export function fundCard(state) {
  if (state.character.age < 21) return '';
  const f = state.fund;
  if (!f) {
    const e = launchEligibility(state);
    const word = fundWord(state, null);
    const picks = strategiesNow(state).map((s) => button(`${s.icon} ${s.label}`, 'hedgeFund.launch', { arg: s.id, variant: 'small', disabled: !e.ok, hint: e.ok ? s.desc : e.reason })).join('');
    return card(`Start ${word === 'hedge fund' ? 'a Hedge Fund' : 'an Investment Partnership'}`, `<p class="fine">Other people's money, your judgement: 2% a year on what they give you and 20% of the gains above the fund's last high. ${e.seed ? `You'll need ${money(e.seed)} of your own to seed it.` : ''}</p><div class="action-grid">${picks}</div>`, { icon: '💼', summary: e.ok ? 'Ready to launch' : e.reason });
  }
  const s = STRATEGIES[f.strategy];
  const y = yearNow(state);
  const record = f.record.slice(-6).map((r) => `<span class="${r.ret >= 0 ? 'pos' : 'neg'}">${r.year}: ${r.ret >= 0 ? '+' : ''}${Math.round(r.ret * 100)}%</span>`).join(' · ');
  const strategies = strategiesNow(state).map((x) => button(`${x.icon} ${x.label}`, 'hedgeFund.strategy', { arg: x.id, variant: x.id === f.strategy ? 'tiny on' : 'tiny', hint: x.desc })).join('');
  const lev = [1, 2, 3, 5].map((n) => button(`${n}×`, 'hedgeFund.leverage', { arg: n, variant: f.leverage === n ? 'tiny on' : 'tiny', hint: n >= 3 ? 'Magnifies everything — including the crash' : '' })).join('');
  return card(f.name, `${kv([
    ['Kind', `${esc(fundWord(state))} · ${s.icon} ${esc(s.label)}`],
    ['Assets', `${money(f.yours + f.outside)} (yours ${money(f.yours)}${f.closedToOutside ? '' : `, investors ${money(f.outside)}`})`],
    ['Reputation', `${Math.round(f.rep)}/100${f.gated ? ' · 🚧 redemptions suspended' : ''}`],
    ['Staff', `${f.staff}`],
    ['Since', `${f.since}`],
  ])}
    ${record ? `<p class="fine">Recent years: ${record}</p>` : ''}
    <h4 class="sub">Strategy</h4><div class="toggle-row chips-row">${strategies}</div>
    <h4 class="sub">Borrowing</h4><div class="toggle-row chips-row">${lev}</div>
    <div class="action-grid">
      ${f.closedToOutside ? '' : button('✈️ Raise money', 'hedgeFund.roadshow', { variant: 'small', disabled: Boolean(state.yearly['fund.roadshow']), hint: 'A roadshow to pension funds and the rich' })}
      ${button('🧑‍💼 Hire', 'hedgeFund.hire', { variant: 'small', hint: 'Sharper research; higher costs' })}
      ${y >= 1985 ? button('📣 Activist campaign', 'hedgeFund.activist', { variant: 'small', disabled: Boolean(state.yearly['fund.activist']), hint: 'Take a stake, push the board' }) : ''}
      ${button('💰 Put more in', 'hedgeFund.invest', { variant: 'small', hint: 'Half your cash' })}
      ${button('💸 Take some out', 'hedgeFund.withdraw', { variant: 'small', hint: 'Half your stake' })}
      ${button(f.closedToOutside ? '🏁 Wind it up' : '🏛️ Return outside money', 'hedgeFund.close', { variant: 'small ghost', hint: f.closedToOutside ? 'Take everything out' : 'Becomes your family office' })}
    </div>`, { icon: '💼', summary: `${money(f.yours + f.outside)} · ${f.record.at(-1) ? `${f.record.at(-1).ret >= 0 ? '+' : ''}${Math.round(f.record.at(-1).ret * 100)}% last year` : 'new'}` });
}
