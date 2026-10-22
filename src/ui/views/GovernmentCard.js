/**
 * "Your Government": who runs your city, state and country, their budgets
 * (revenue, balance, debt, credit rating, how each area is funded), and — when
 * you hold an executive office — the budget you write.
 */
import { esc, money, button, card, meter, kv, disclosure } from '../Components.js';
import { LEVELS, AREAS, budgetAt, annualDollars, fundingLabel, pct, myBudget, BUDGET_MOVES, passShare } from '../../modules/politics/Budgets.js';
import { executiveOf } from '../../modules/politics/Legislature.js';
import { partyName, PARTY_ICON } from '../../modules/politics/Parties.js';

const LEVEL_LABEL = { city: '🏙️ City', state: '🗺️ State', national: '🏛️ National' };
const big = (x) => (x >= 1e12 ? `$${(x / 1e12).toFixed(1)} trillion` : x >= 1e9 ? `$${(x / 1e9).toFixed(1)} billion` : `$${Math.round(x / 1e6)} million`);

function budgetBlock(state, level, mine) {
  const b = budgetAt(state, level);
  const exec = executiveOf(state, level);
  const dollars = annualDollars(level, b.where);
  const rows = Object.entries(AREAS[level]).map(([id, a]) => {
    const f = b.funding[id] ?? 1;
    const ask = b.ask?.[id];
    return `<li class="report-row"><div>${a.icon} ${esc(a.label)} <small class="muted">${pct(f)} · ${fundingLabel(f)}${ask ? ` → asking ${pct(ask)}` : ''}</small></div>${mine ? `<div class="toggle-row">${button('▼ 5%', 'budgets.fund', { arg: `${id}|down`, variant: 'tiny' })}${button('▲ 5%', 'budgets.fund', { arg: `${id}|up`, variant: 'tiny' })}</div>` : ''}</li>`;
  }).join('');
  const head = `${kv([
    exec ? [exec.title, `${esc(exec.name)}${exec.you ? ' (you)' : ''} ${PARTY_ICON[exec.caucus] ?? ''} ${esc(partyName(state, exec.caucus))}`] : null,
    ['Budget', `≈${big(dollars)} a year`],
    ['Last year', `<span class="${b.balance >= 0 ? 'pos' : 'neg'}">${b.balance >= 0 ? 'surplus' : 'deficit'} ${Math.abs(Math.round(b.balance * 1000) / 10)}%</span> of revenue`],
    ['Debt', `${big(b.debt * dollars)} (${b.debt.toFixed(1)} years of revenue)`],
    ['Credit rating', b.rating],
    b.levy ? ['Temporary levy', `${b.levy > 0 ? '+' : ''}${Math.round(b.levy * 100)}% of revenue`] : null,
    b.shutdown ? ['Status', '<span class="neg">Government shutdown</span>'] : null,
  ].filter(Boolean))}${meter(b.health, { label: '💰 Fiscal health' })}`;
  const note = mine ? `<p class="fine">You write this budget: up to ${BUDGET_MOVES} changes a year, voted on at year end. ${passShare(state, level) < 1 ? 'The other party controls the legislature: expect to get part of what you ask.' : 'Your party controls the legislature.'} Cuts to popular services cost approval; deficits pile up debt and downgrades.</p>` : '';
  return `${head}${disclosure(`gov.${level}`, `${LEVEL_LABEL[level]} spending by area`, `<ul class="history">${rows}</ul>${note}`, { open: mine })}`;
}

export function governmentCard(state) {
  const mine = myBudget(state);
  const body = LEVELS.map((level) => `<h4 class="sub">${LEVEL_LABEL[level]}: ${esc(budgetAt(state, level).name)}</h4>${budgetBlock(state, level, mine?.level === level)}`).join('');
  return card('Your Government', `${body}<p class="fine">Taxes the legislatures set fund these budgets; recessions shrink them. Public employees feel their area's funding (equipment, hiring, layoffs, frozen step increases); residents feel taxes and services.</p>`, { icon: '🏛️', accent: mine ? 'yellow' : undefined });
}
