/**
 * Unions on the Career tab: your local (power, money, leadership, your post
 * and what officers can do) and the labor movement in your state.
 */
import { esc, money, button, card, chip, meter, kv, disclosure } from '../Components.js';
import { unionFor, unionById, unionsInState, unionPower, myUnion, myRole, runEligibility, electionOdds, UNION_ROLES, UNION_ACTIONS, DUES_LEVELS, presidentPay, officerPay, STEWARD_STIPEND, rightToWork } from '../../modules/career/LaborUnions.js';
import { lawValue } from '../../modules/politics/Laws.js';
import { stateOf } from '../../modules/life/Regions.js';

const pct = (x) => `${Math.round(x * 100)}%`;
const tone = (p) => (p >= 60 ? 'good' : p >= 35 ? 'mid' : 'bad');

/** Lookup without creating anything (views never mutate state). */
function recordFor(state, eu) {
  if (!eu) return null;
  return unionById(state, eu.unionId) ?? Object.values(state.unions?.byId ?? {}).find((u) => u.name === eu.name && u.stateId === eu.stateId) ?? null;
}

function stats(u) {
  return `${meter(unionPower(u), { label: '✊ Union power', tone: tone(unionPower(u)) })}
    ${kv([
      ['Members', `${u.members.toLocaleString()} · ${pct(u.density)} of the industry`],
      ['Treasury', money(u.treasury)],
      ['Strike fund', money(u.strikeFund)],
      ['Militancy', `${u.militancy}/100`],
      ['Political clout', `${u.clout}/100`],
      ['President', `${esc(u.president.name)}${u.president.player ? ' (you)' : ''} · ${u.president.years} yr`],
      ['Last settlement', u.lastSettlement ? `+${u.lastSettlement}% over three years` : '—'],
      ['Next election', `${u.electionIn} yr`],
    ])}`;
}

/** The union panel inside your job card. */
export function unionPanel(state, job) {
  const eu = job.employer.union;
  if (!eu) return '';
  const u = recordFor(state, eu);
  const supervisor = job.abilities.includes('supervise');
  const head = `<b>✊ ${esc(eu.name)}</b> ${chip(eu.strike ? 'Strikes allowed' : 'No-strike clause → arbitration', eu.strike ? 'warn' : '')} ${chip(`Contract: ${eu.contractYearsLeft} yr left`)} ${u ? chip(`Power ${unionPower(u)}/100`, tone(unionPower(u)) === 'good' ? 'green' : '') : ''}`;
  if (supervisor) return `<div class="union">${head}<p class="fine">Supervisors are excluded from the bargaining unit.</p></div>`;
  if (!job.unionMember) return `<div class="union">${head}<p class="fine">You're covered by the contract but not a member.</p>${button('✊ Join the union', 'career.joinUnion', { variant: 'small' })}</div>`;
  const role = myRole(state) ?? 'member';
  return `<div class="union">${head}<p class="fine">${UNION_ROLES[role].title} · dues ${((u?.duesRate ?? eu.duesRate) * 100).toFixed(1)}% · grievance protection · contract votes. See "Your Union" below.</p>${button('Leave union', 'career.leaveUnion', { variant: 'ghost small' })}</div>`;
}

/** Your local in full: its numbers, your post, elections and officer actions. */
function myUnionCard(state) {
  const u = myUnion(state);
  const mine = state.unions?.mine;
  if (!u || !mine) return '';
  const role = mine.role;
  const officer = ['officer', 'president'].includes(role);
  const left = UNION_ACTIONS - (state.yearly['unions.act'] ?? 0);
  const runs = ['steward', 'officer', 'president'].filter((r) => UNION_ROLES[r].rank > UNION_ROLES[role].rank).map((r) => {
    const check = runEligibility(state, r);
    const odds = r === 'steward' ? null : Math.round(electionOdds(state, r) * 100);
    return button(r === 'steward' ? '🦺 Become a shop steward' : `🗳️ Run for ${UNION_ROLES[r].title.toLowerCase()}`, 'unions.run', { arg: r, variant: 'small', disabled: !check.ok, title: check.reason ?? '', hint: check.ok ? (odds !== null ? `≈${odds}% to win · election in ${u.electionIn} yr` : `${money(STEWARD_STIPEND)}/yr stipend`) : check.reason });
  }).join('');
  const pay = role === 'president' ? presidentPay(u) : role === 'officer' ? officerPay(u) : role === 'steward' ? STEWARD_STIPEND : 0;
  const actions = officer ? `<h4 class="sub">Officer actions <small class="muted">${left} left this year</small></h4>
    <div class="action-grid">
      ${button('📈 Organize a new shop', 'unions.organize', { disabled: left <= 0, hint: `${money(Math.round(Math.min(250000, Math.max(15000, u.members * 6))))} from the treasury` })}
      ${button('📣 Mobilize the members', 'unions.mobilize', { disabled: left <= 0, hint: '+Militancy' })}
      ${button('🏦 Build the strike fund', 'unions.strikeFund', { disabled: left <= 0, hint: '30% of the general fund' })}
      ${button(state.politics?.campaign && role === 'president' ? '🗳️ Endorse your own campaign' : '🗳️ Endorse pro-labor candidates', 'unions.endorse', { disabled: left <= 0, hint: state.politics?.campaign && role === 'president' ? 'Labor endorsement + PAC money' : '+Political clout' })}
    </div>
    ${role === 'president' ? `<div class="toggle-row">${Object.entries(DUES_LEVELS).map(([k, d]) => button(d.label, 'unions.dues', { arg: k, variant: Math.abs(u.duesRate - d.rate) < 1e-6 ? 'tiny on' : 'tiny' })).join('')}</div>
    <div class="toggle-row">${button('💼 Skim the treasury', 'unions.embezzle', { variant: 'tiny danger', hint: 'Embezzlement' })}</div>` : ''}
    <p class="fine">At contract time you sit at the bargaining table yourself. Lobby the legislature from the Politics tab.</p>` : '';
  return card(`Your Union: ${esc(u.name)}`, `
    <p>${chip(`${UNION_ROLES[role].title}`, role === 'member' ? '' : 'cyan')} ${chip(`Standing ${mine.standing}/100`)} ${mine.candidacy ? chip(`🗳️ Running for ${UNION_ROLES[mine.candidacy].title.toLowerCase()}`, 'warn') : ''} ${pay ? chip(`${money(pay)}/yr`) : ''}</p>
    ${stats(u)}
    <div class="toggle-row">${runs}${role !== 'member' ? button('Step down', 'unions.stepDown', { variant: 'ghost small' }) : ''}</div>
    ${actions}
    ${u.history.length ? disclosure(`union-${u.id}`, 'Recent history', `<ul class="history">${u.history.slice().reverse().map((h) => `<li>${h.icon} <small>age ${h.age}</small> ${esc(h.text)}</li>`).join('')}</ul>`) : ''}`, { icon: '✊', accent: 'red' });
}

/** Every union local in your state. */
function movementCard(state) {
  const list = unionsInState(state);
  if (!list.length) return '';
  const rtw = rightToWork(state);
  const rows = list.map((u) => `<li class="report-row"><div><b>${esc(u.name)}</b> <small class="muted">${u.members.toLocaleString()} members · ${pct(u.density)} density · president ${esc(u.president.name)}${u.onStrike ? ' · ✊ struck this year' : ''}</small></div><div>${chip(`Power ${unionPower(u)}`, tone(unionPower(u)) === 'good' ? 'green' : '')}</div></li>`).join('');
  return card(`Labor in ${esc(stateOf(state).name)}`, `
    <p class="fine">${rtw ? '✊ Right-to-work state: no agency fees, weaker unions.' : '✊ Union-security clauses allowed.'} ${lawValue(state, 'cardCheck') ? '🗳️ Card-check recognition.' : ''}</p>
    ${disclosure('labor-movement', `${list.length} union locals`, `<ul class="history">${rows}</ul>`)}`, { icon: '🏭' });
}

export function unionCards(state) {
  return myUnionCard(state) + movementCard(state);
}

/** A unionized business: its local and contract. */
export function businessUnionPanel(state, biz) {
  if (!biz.staff?.unionized) return '';
  const u = unionById(state, biz.union?.unionId);
  if (!u) return `<p class="fine">✊ Unionized — the local's contract arrives at the next year-end.</p>`;
  return `<h4 class="sub">✊ ${esc(u.name)}</h4>${kv([
    ['Contract', `${biz.union.contractYearsLeft} yr left${biz.union.lastRaise ? ` · last deal +${biz.union.lastRaise}%` : ''}`],
    ['Union power', `${unionPower(u)}/100 · strike fund ${money(u.strikeFund)}`],
    ['Labor cost premium', `+${Math.round(biz.staff.costPremium * 100)}% over market`],
    biz.union.grievances ? ['Grievances lost', String(biz.union.grievances)] : null,
    biz.lastYear?.strikeWeeks ? ['Last year', `${biz.lastYear.strikeWeeks} weeks on strike`] : null,
  ].filter(Boolean))}`;
}

export { unionFor };
