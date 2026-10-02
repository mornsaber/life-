/**
 * Politics tab: current office and approval, an active campaign (funds,
 * endorsements, projected vote share), offices you could run for, history.
 */
import { esc, money, button, card, chip, meter, kv, empty } from '../Components.js';
import { OFFICES, OFFICE_ORDER, ENDORSEMENTS, runEligibility, voteShare, scandalPenalty } from '../../modules/politics/index.js';
import { stateOf } from '../../modules/life/Regions.js';

export function politicsView(state) {
  const p = state.politics;
  const o = p.office;
  const c = p.campaign;
  const office = o && OFFICES[o.id];
  const current = o
    ? card(`${office.icon} ${office.name}`, `
        ${meter(o.approval, { label: '🗳️ Approval' })}
        ${kv([['Term', `${o.terms}${office.termLimit ? ` of ${office.termLimit}` : ''} · ${o.termYearsLeft} yr left`], ['Salary', `${money(office.salary)}/yr`], ['Type', office.fullTime ? 'Full-time' : 'Part-time (keep your job)'], ['Pension', office.pension === 'fers' ? 'FERS' : 'Elected Officials Retirement Plan']])}
        <div class="row-end">${button('👋 Resign', 'politics.resign', { variant: 'danger small' })}</div>`, { icon: '🏛️', accent: 'yellow' })
    : '';
  const campaign = c
    ? card(`Campaign: ${OFFICES[c.officeId].name}`, `
        ${meter(Math.min(100, (c.funds / OFFICES[c.officeId].cost) * 100), { label: `💰 War chest ${money(c.funds)} of ~${money(OFFICES[c.officeId].cost)}`, suffix: '%' })}
        ${meter(Math.round(voteShare(state, c.officeId, c) * 100), { label: '📊 Projected vote share', tone: voteShare(state, c.officeId, c) > 0.5 ? 'good' : 'mid' })}
        ${c.vsIncumbent ? `<p class="why">You're challenging an entrenched incumbent.</p>` : ''}
        <div class="abilities">${Object.entries(ENDORSEMENTS).map(([id, e]) => c.endorsements.includes(id) ? chip(`${e.icon} ${e.name} ✓`, 'good') : button(`${e.icon} Seek ${e.name}`, 'politics.endorse', { arg: id, variant: 'tiny' })).join(' ')}</div>
        <div class="action-grid">
          ${button('📞 Fundraise', 'politics.fundraise', { hint: 'Twice a year' })}
          ${button('💵 Self-fund (25% of cash)', 'politics.selfFund')}
          ${button('🚪 Canvass', 'politics.canvass', { hint: '+Name recognition' })}
          ${button('🎤 Debate', 'politics.debate', { hint: 'Once' })}
          ${button('🏳️ Drop out', 'politics.dropOut', { variant: 'danger' })}
        </div>
        <p class="fine">The election is held when you next age up. Scandal drag: −${Math.round(scandalPenalty(state) * 100)} pts.</p>`, { icon: '🗳️', accent: 'green' })
    : '';
  const ladder = OFFICE_ORDER.map((id) => {
    const of = OFFICES[id];
    const check = runEligibility(state, id);
    const est = check.ok ? Math.round(voteShare(state, id, { funds: of.cost * 0.4, endorsements: [] }) * 100) : null;
    return `<li class="job-row ${check.ok ? '' : 'locked'}">
      <span class="job-icon">${of.icon}</span>
      <div class="job-info"><b>${of.name}</b><small>${money(of.salary)}/yr · ${of.term}-yr term${of.termLimit ? `, ${of.termLimit}-term limit` : ''} · ${of.fullTime ? 'full-time' : 'part-time'} · campaign ~${money(of.cost)}${of.judicial ? ' · usually filled by appointment' : ''}</small>
        ${est !== null ? `<small class="req">Projected ≈${est}% with a typical campaign</small>` : ''}</div>
      ${button(check.ok ? 'Run' : '🔒', 'politics.run', { arg: id, variant: 'small', disabled: !check.ok || Boolean(c), title: check.reason ?? '' })}
      ${check.ok ? '' : `<span class="why">${esc(check.reason)}</span>`}
    </li>`;
  }).join('');
  const history = p.history.length ? `<ul class="history">${p.history.map((h) => `<li>${OFFICES[h.officeId].icon} <b>${OFFICES[h.officeId].name}</b> <small>age ${h.startAge}–${h.endAge}, ${h.terms} term${h.terms > 1 ? 's' : ''} — ${esc(h.reason)}</small></li>`).join('')}</ul>` : empty('No offices held yet.');
  return `${current}${campaign}
    ${card('Run for Office', `<p class="muted">${esc(stateOf(state).name)} · name recognition ${p.recognition}/100. Experience in lower office, money, endorsements and honors win races; your legal record loses them. Governors appoint judges and agency heads.</p><ul class="job-board">${ladder}</ul>`, { icon: '🗳️' })}
    ${card('Political History', history, { icon: '🗂️' })}`;
}
