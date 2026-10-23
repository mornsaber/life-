/**
 * "Your Government": who runs your city, state and country, their budgets
 * (revenue, balance, debt, credit rating, how each area is funded), and — when
 * you hold an executive office — the budget you write.
 */
import { esc, money, button, card, meter, kv, disclosure } from '../Components.js';
import { LEVELS, AREAS, budgetAt, annualDollars, fundingLabel, pct, myBudget, BUDGET_MOVES, passShare } from '../../modules/politics/Budgets.js';
import { executiveOf } from '../../modules/politics/Legislature.js';
import { partyName, PARTY_ICON } from '../../modules/politics/Parties.js';
import { CPC_RANKS, joinBlock, promotionOdds, partyHere, rankTitle } from '../../modules/politics/CommunistParty.js';

const LEVEL_LABEL = { city: '🏙️ City', state: '🗺️ State', national: '🏛️ National' };
const big = (x) => (x >= 1e12 ? `$${(x / 1e12).toFixed(1)} trillion` : x >= 1e9 ? `$${(x / 1e9).toFixed(1)} billion` : `$${Math.round(x / 1e6)} million`);

function budgetBlock(state, level, mine) {
  const b = budgetAt(state, level, { create: false });
  if (!b) return '<p class="fine">Its budget appears after your next birthday.</p>';
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
  if (!state.gov?.budgets || !Object.keys(state.gov.budgets).length) return '';
  const mine = myBudget(state, { create: false });
  const body = LEVELS.map((level) => `<h4 class="sub">${LEVEL_LABEL[level]}: ${esc(budgetAt(state, level, { create: false })?.name ?? '')}</h4>${budgetBlock(state, level, mine?.level === level)}`).join('');
  return card('Your Government', `${body}<p class="fine">Taxes the legislatures set fund these budgets; recessions shrink them. Public employees feel their area's funding (equipment, hiring, layoffs, frozen step increases); residents feel taxes and services.</p>`, { icon: '🏛️', accent: mine ? 'yellow' : undefined });
}

/** A one-party state (China, North Korea, Vietnam): your place in the ruling party. */
export function partyCard(state) {
  const pt = partyHere(state);
  if (!pt || state.character.age < 14) return '';
  const c = state.cpc;
  const cap = (s) => s.replace(/^the /, '');
  const why = joinBlock(state);
  const status = { youthLeague: `${cap(pt.youth)} member`, applicant: 'Applicant (under review)', probationary: 'Probationary member', member: 'Party member', expelled: 'Expelled' }[c?.status] ?? 'Not a member';
  const next = c?.status === 'member' && !c.retiredFrom && CPC_RANKS[c.rank + 1] ? rankTitle(state, c.rank + 1) : null;
  return card(cap(pt.name), `
    ${kv([
      ['Status', esc(status)],
      c?.status === 'member' ? ['Post', c.retiredFrom ? `Retired ${esc(c.retiredFrom)}` : esc(rankTitle(state, c.rank))] : null,
      c?.status === 'member' && next ? ['Next', `${esc(next)} · ≈${Math.round(promotionOdds(state) * 100)}% at the next evaluation`] : null,
      c?.patron ? ['Patron', `${esc(c.patron.name)} (${esc(rankTitle(state, c.patron.rank))})${c.patron.fallen ? ' <span class="neg">— under investigation</span>' : ''}`] : null,
    ].filter(Boolean))}
    ${c?.status === 'member' ? `${meter(c.record, { label: '📈 Record (growth, stability, campaigns)' })}${meter(c.network, { label: '🤝 Network (guanxi)' })}` : ''}
    <div class="action-grid">
      ${!c?.status && state.character.age <= 28 ? button(`🔴 Join ${pt.youth}`, 'cpc.joinLeague') : ''}
      ${!['applicant', 'probationary', 'member', 'expelled'].includes(c?.status) ? button('☭ Apply to join the Party', 'cpc.apply', { disabled: Boolean(why), hint: why ?? 'A political review, then a probationary year' }) : ''}
      ${['member', 'probationary'].includes(c?.status) ? button('📕 Lead political study', 'cpc.study', { hint: 'Once a year: +record' }) : ''}
      ${c?.status === 'member' ? button('🍶 Cultivate a patron', 'cpc.network', { hint: 'Banquets and favors: +network' }) : ''}
    </div>
    <p class="fine">${pt.flag} Here, power runs through ${esc(pt.short)}: posts from branch secretary to General Secretary are appointed by the Organization Department on your record, your patron and your age (county posts under 55, provincial under 63; "seven up, eight down" at the top). A city or provincial Party Secretary writes that budget; the General Secretary rules the state. ${esc(pt.topNote)} The discipline inspectors are always watching.</p>`, { icon: '☭', accent: 'red' });
}
