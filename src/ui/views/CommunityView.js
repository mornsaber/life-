/**
 * Community tab: your faith and congregation, giving, ministry, volunteering
 * and mentoring.
 */
import { esc, money, button, card, kv, chip } from '../Components.js';
import { TRADITIONS, ATTENDANCE, GIVING_LEVELS, VOLUNTEER_ORGS } from '../../modules/community/Community.js';
import { clergyEligibility } from '../../modules/community/Religions.js';
import { TRAITS as NEIGHBOR_TRAITS } from '../../modules/civic/Neighbors.js';
import { LIEN_AT as HOA_LIEN_AT } from '../../modules/civic/HOA.js';
import { CAUSES, TACTICS } from '../../modules/civic/Activism.js';
import { MEASURES } from '../../modules/civic/Local.js';
import { schoolKids } from '../../modules/civic/index.js';
import { atWar } from '../../modules/world/War.js';

function faithCard(state) {
  const c = state.community;
  const f = c.faith;
  const age = state.character.age;
  const raisedIn = c.upbringing ? TRADITIONS[c.upbringing].name : 'no religion';
  if (!f) {
    const former = c.former.at(-1);
    return card('Faith', `<p class="muted">You don't belong to a congregation. Raised in ${esc(raisedIn)}${former ? `; you left ${esc(TRADITIONS[former.traditionId].name)} at ${former.leftAge}` : ''}.</p>`, { icon: '🕊️' });
  }
  const t = TRADITIONS[f.traditionId];
  const elig = clergyEligibility(state);
  return card(f.congregation, `
    ${kv([
      ['Tradition', `${t.icon} ${esc(t.name)}${t.fundamentalist ? ` ${chip('high-control', 'bad')}` : ''}`],
      ['Member since', f.raised ? 'birth' : `age ${f.joinedAge}`],
      ['Attendance', `${ATTENDANCE[f.attendance].icon} ${ATTENDANCE[f.attendance].label}${f.attendance === 'devout' ? ` · ${f.devoutYears} yr` : ''}`],
      f.role ? ['Lay role', esc(f.role)] : null,
      ['Giving', c.giving ? `${c.giving}% of income${c.givenThisYear ? ` · ${money(c.givenThisYear)} this year` : ''}` : 'None'],
      ['Ordination', elig.ok ? `Eligible — apply for ${['catholic', 'tradCatholic'].includes(f.traditionId) ? 'Catholic Priesthood (seminary through your diocese)' : 'Clergy & Ministry'} on the Career tab` : `<span class="why">${esc(elig.reason)}</span>`],
    ])}
    ${t.schism ? `<p class="fine">Tensions over ${esc(t.schism.issue)} could split this ${t.house.toLowerCase()}.</p>` : ''}
    ${t.fundamentalist ? '<p class="fine">Leaving a high-control group usually means being shunned by the congregation and by family who stay.</p>' : ''}
    <h4 class="sub">Attendance</h4><div class="toggle-row">${Object.entries(ATTENDANCE).map(([id, a]) => button(`${a.icon} ${a.label}`, 'community.attendance', { arg: id, variant: f.attendance === id ? 'small on' : 'small', hint: a.desc })).join('')}</div>
    <h4 class="sub">Giving</h4><div class="toggle-row">${GIVING_LEVELS.map((n) => button(n ? `${n}%${n === 10 ? ' (tithe)' : ''}` : 'None', 'community.give', { arg: String(n), variant: c.giving === n ? 'tiny on' : 'tiny' })).join('')}</div>
    <div class="toggle-row">
      ${f.role ? button('Step down', 'community.stepDown', { variant: 'small ghost' }) : ''}
      ${button('🚪 Leave', 'community.leave', { variant: 'small danger', disabled: age < 16 })}
    </div>`, { icon: t.icon, accent: 'yellow' });
}

function joinCard(state) {
  const c = state.community;
  const age = state.character.age;
  const groups = {};
  for (const [id, t] of Object.entries(TRADITIONS)) (groups[t.group] ??= []).push([id, t]);
  const disabled = age < 16 || Boolean(state.yearly['community.join']);
  return card(c.faith ? 'Convert' : 'Find a Congregation', `
    ${age < 16 ? '<p class="muted">You can choose your own faith at 16.</p>' : ''}
    ${Object.entries(groups).map(([g, list]) => `<h4 class="sub">${esc(g)}</h4><div class="toggle-row">${list.map(([id, t]) => button(`${t.icon} ${t.name}`, 'community.join', { arg: id, variant: c.faith?.traditionId === id ? 'tiny on' : 'tiny', disabled: disabled || c.faith?.traditionId === id })).join('')}</div>`).join('')}`, { icon: '🙏' });
}

function serviceCard(state) {
  const c = state.community;
  const age = state.character.age;
  const orgs = Object.entries(VOLUNTEER_ORGS).map(([id, o]) => {
    const on = c.volunteering.includes(id);
    return button(`${o.icon} ${o.name}`, 'community.volunteer', { arg: id, variant: on ? 'small on' : 'small', disabled: !on && (age < o.minAge || c.volunteering.length >= 2), hint: `${o.desc}${age < o.minAge ? ` (${o.minAge}+)` : ''}` });
  }).join('');
  return card('Volunteering & Mentoring', `
    ${kv([
      ['Years of service', String(c.volunteerYears)],
      ['Mentoring', c.mentoring ? `🌱 ${esc(c.mentoring.mentee)} since age ${c.mentoring.since}` : 'None'],
    ])}
    <h4 class="sub">Volunteer (up to two)</h4><div class="toggle-row">${orgs}</div>
    <h4 class="sub">Mentoring</h4><div class="toggle-row">${button(c.mentoring ? 'End the match' : '🌱 Become a Big Brother / Big Sister', 'community.mentor', { variant: c.mentoring ? 'small ghost' : 'small', disabled: !c.mentoring && age < 21, hint: '21+ · background check' })}</div>
    <p class="fine">Service counts toward a pardon, earns the President's Volunteer Service Award after five years, and is a good place to make friends.</p>`, { icon: '🤲', accent: 'green' });
}

export function communityView(state) {
  if (!state.community) return '';
  return `${faithCard(state)}${civicView(state)}${serviceCard(state)}${joinCard(state)}`;
}

/* ------------------------------------------------------------------ */
/* Civic life                                                          */
/* ------------------------------------------------------------------ */

function neighborsCard(state) {
  const c = state.civic;
  if (!c?.neighbors.length) return '';
  const rows = c.neighbors.map((n) => `<li>${n.icon} <b>${esc(n.name)}</b> <small>${esc(n.household)} · ${esc(NEIGHBOR_TRAITS[n.trait].label)} · ${n.rel >= 70 ? '💚 close' : n.rel >= 45 ? '🙂 friendly' : n.rel >= 25 ? '😐 cool' : '😠 feuding'}${n.friend ? ' · friend' : ''}</small> ${button('☕ Visit', 'civic.visitNeighbor', { arg: n.id, variant: 'tiny', disabled: Boolean(state.yearly[`civic.visit.${n.id}`]) })}</li>`).join('');
  const w = c.watch;
  return card('Neighbors', `<ul class="history">${rows}</ul>
    <h4 class="sub">Neighborhood watch</h4>
    <p class="fine">${w ? `${w.captain ? '🔦 Block captain' : '🔦 Member'} · ${w.years} yr` : 'Patrols, a phone tree and a sign at the end of the street.'}</p>
    <div class="toggle-row">${w ? button('Leave the watch', 'civic.watchLeave', { variant: 'small ghost' }) : button('🔦 Join the watch', 'civic.watchJoin', { variant: 'small', disabled: state.character.age < 18 })}</div>`, { icon: '🏡' });
}

function hoaCard(state) {
  const h = state.civic?.hoa;
  if (!h) return '';
  return card(h.name, `${kv([
    ['Dues', `${money(h.dues)}/yr`],
    ['Your role', h.president ? '🏅 Board president' : h.board ? '🗳️ Board member' : 'Homeowner'],
    ['Violations', String(h.violations)],
    ['Fines owed', h.fines ? `<span class="neg">${money(h.fines)}</span>${h.fines >= HOA_LIEN_AT ? ' · lien recorded' : ''}` : '$0'],
    h.open ? ['Open violation', '<span class="warn-text">Unresolved — fines accrue monthly</span>'] : null,
  ])}
    <div class="toggle-row">
      ${button('🗳️ Run for the board', 'civic.hoaRun', { variant: 'small', disabled: h.board || Boolean(state.yearly['civic.hoaRun']) })}
      ${button('🧾 Pay fines', 'civic.hoaFight', { arg: 'pay', variant: 'small', disabled: !h.fines })}
      ${button('⚖️ Sue the HOA', 'civic.hoaFight', { arg: 'sue', variant: 'small danger', hint: 'Attorney fees; may void fines', disabled: Boolean(state.yearly['civic.hoaFight']) })}
      ${button('📣 Recall the board', 'civic.hoaFight', { arg: 'recall', variant: 'small', disabled: h.board || Boolean(state.yearly['civic.hoaFight']) })}
    </div>`, { icon: '📘' });
}

function schoolCard(state) {
  const kids = schoolKids(state);
  const p = state.civic?.pta;
  if (!kids.length && !p) return '';
  return card('PTA & School Board', `
    <p class="muted">${p ? `PTA ${p.role === 'president' ? 'president' : p.role === 'officer' ? 'officer' : 'member'} · ${p.years} yr` : `${kids.length} kid${kids.length > 1 ? 's' : ''} in school.`} The PTA is where local politics starts: officers earn the parents' endorsement, and the school board is the first rung of the ladder (Politics tab).</p>
    <div class="toggle-row">
      ${!p ? button('🍎 Join the PTA', 'civic.ptaJoin', { variant: 'small' }) : ''}
      ${p?.role === 'member' ? button('🗳️ Run for PTA office', 'civic.ptaRun', { variant: 'small', disabled: Boolean(state.yearly['civic.ptaRun']) }) : ''}
      ${p ? button('Step back', 'civic.ptaLeave', { variant: 'small ghost' }) : ''}
    </div>`, { icon: '🍎' });
}

function activismCard(state) {
  const a = state.civic?.activism;
  if (state.character.age < 14) return '';
  const war = atWar(state);
  const causes = Object.entries(CAUSES).filter(([, c]) => !c.warOnly || war).map(([id, c]) => button(`${c.icon} ${c.name}`, 'civic.joinCause', { arg: id, variant: a?.cause === id ? 'tiny on' : 'tiny' })).join('');
  const tactics = a?.cause ? Object.entries(TACTICS).map(([id, t]) => button(t.label, 'civic.protest', { arg: id, variant: 'small', hint: t.desc, disabled: (t.minInfluence && a.influence < t.minInfluence) || (state.yearly['civic.protest'] ?? 0) >= 2 })).join('') : '';
  return card('Causes & Protest', `
    ${a ? kv([['Cause', a.cause ? `${CAUSES[a.cause].icon} ${esc(CAUSES[a.cause].name)}` : '—'], ['Influence', `${a.influence}/100`], ['Protests', String(a.protests)], ['Arrests', a.arrests ? `<span class="neg">${a.arrests}</span>` : '0']]) : '<p class="muted">Pick a cause. Influence moves ballot measures, earns the activists\' endorsement and helps you on election day — and civil disobedience can get you arrested.</p>'}
    <h4 class="sub">Cause</h4><div class="toggle-row chips-row">${causes}</div>
    ${tactics ? `<h4 class="sub">Take action (2 per year)</h4><div class="action-grid">${tactics}</div>${button('Step back from activism', 'civic.leaveCause', { variant: 'small ghost' })}` : ''}`, { icon: '🪧' });
}

function localCard(state) {
  if (!state.civic) return '';
  const local = state.civic.local[state.character.regionId];
  const recent = local?.history.slice(-4).reverse() ?? [];
  const war = state.world?.war;
  return card('Local Government & the World', `${kv([
    ['Property-tax rate', local ? `×${local.taxMult.toFixed(2)} of the state rate` : 'Standard'],
    ['Voter-approved levies', local?.levy ? `${money(local.levy)}/yr per household` : 'None'],
    ['Public services', `${local?.services ?? 50}/100`],
    ['Public safety', `${local?.safety ?? 50}/100`],
    ['National', war ? `⚔️ At war: ${esc(war.operation)}${war.draft ? ' · draft in effect' : ''}` : '🕊️ At peace'],
  ])}
    ${recent.length ? `<h4 class="sub">Recent ballot measures</h4><ul class="history">${recent.map((h) => `<li>${MEASURES[h.id].icon} ${esc(MEASURES[h.id].name)} <small>age ${h.age} · ${h.passed ? 'passed' : 'failed'} (${h.yes}% yes)</small></li>`).join('')}</ul>` : '<p class="fine">Local measures appear on your ballot most years.</p>'}`, { icon: '🗳️' });
}

export function civicView(state) {
  return `${neighborsCard(state)}${hoaCard(state)}${schoolCard(state)}${activismCard(state)}${localCard(state)}`;
}
