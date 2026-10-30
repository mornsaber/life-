/**
 * Community tab: your faith and congregation, giving, ministry, volunteering
 * and mentoring.
 */
import { esc, money, button, card, kv, chip, meter } from '../Components.js';
import { TRADITIONS, ATTENDANCE, GIVING_LEVELS, VOLUNTEER_ORGS } from '../../modules/community/Community.js';
import { clergyEligibility, traditionName } from '../../modules/community/Religions.js';
import { ordersOf } from '../../modules/community/HolyOrders.js';
import { faithInstitutionSummary } from '../../modules/community/FaithInstitutions.js';
import { RITES, COMING_OF_AGE } from '../../modules/community/FaithBodies.js';
import { RELIGIOUS_ORDERS, religiousSummary, entryCheck } from '../../modules/community/ReligiousOrders.js';
import { TRAITS as NEIGHBOR_TRAITS } from '../../modules/civic/Neighbors.js';
import { LIEN_AT as HOA_LIEN_AT } from '../../modules/civic/HOA.js';
import { CAUSES, TACTICS } from '../../modules/civic/Activism.js';
import { movementOf, STRATEGIES } from '../../modules/civic/Movements.js';
import { sectOf, STYLES as SECT_STYLES } from '../../modules/community/Sects.js';
import { MEASURES } from '../../modules/civic/Local.js';
import { schoolKids } from '../../modules/civic/index.js';
import { atWar, warHere, PHASE_LABEL, INTENSITY_LABEL, frontLabel, homeDanger } from '../../modules/world/War.js';
import { COUNTRIES } from '../../modules/world/Countries.js';
import { PARTY_ROLES, PARTY_ICON, PARTY_DUES, partyName, partyOf, canVote } from '../../modules/politics/Parties.js';
import { transitBoardEligibility } from '../../modules/civic/TransitBoard.js';
import { warRoles } from '../../modules/military/WarRoles.js';

function faithCard(state) {
  const c = state.community;
  const f = c.faith;
  const age = state.character.age;
  const raisedIn = c.upbringing ? traditionName(c.upbringing, state.character.countryId ?? 'US') : 'no religion';
  if (!f) {
    const former = c.former.at(-1);
    return card('Faith', `<p class="muted">You don't belong to a congregation. Raised in ${esc(raisedIn)}${former ? `; you left ${esc(traditionName(former.traditionId, state.character.countryId ?? 'US'))} at ${former.leftAge}` : ''}.</p>`, { icon: '🕊️' });
  }
  const t = TRADITIONS[f.traditionId];
  const elig = clergyEligibility(state);
  const orders = ordersOf(state);
  return card(f.congregation, `
    ${kv([
      ['Tradition', `${t.icon} ${esc(traditionName(f.traditionId, state.character.countryId ?? 'US'))}${t.fundamentalist ? ` ${chip('high-control', 'bad')}` : ''}`],
      ['Member since', f.raised ? 'birth' : `age ${f.joinedAge}`],
      ['Attendance', `${ATTENDANCE[f.attendance].icon} ${ATTENDANCE[f.attendance].label}${f.attendance === 'devout' ? ` · ${f.devoutYears} yr` : ''}`],
      f.role ? ['Lay role', esc(f.role)] : null,
      ['Giving', c.giving ? `${c.giving}% of income${c.givenThisYear ? ` · ${money(c.givenThisYear)} this year` : ''}` : 'None'],
      orders ? ['Holy orders', `${esc({ deacon: 'Deacon', priest: 'Priest', bishop: 'Bishop', minister: 'Ordained minister' }[orders.grade])} since age ${orders.since}${orders.diocese ? ` · ${esc(orders.diocese)}` : ''} <small class="muted">(for life: you return to ministry at this order)</small>`] : ['Ordination', elig.ok ? `Eligible — apply for ${['catholic', 'tradCatholic'].includes(f.traditionId) ? 'Catholic Priesthood (seminary through your diocese)' : f.traditionId === 'anglican' ? 'Anglican Holy Orders (selection through your diocese)' : 'Clergy & Ministry'} on the Career tab` : `<span class="why">${esc(elig.reason)}</span>`],
    ])}
    ${t.schism ? `<p class="fine">Tensions over ${esc(t.schism.issue)} could split this ${t.house.toLowerCase()}.</p>` : ''}
    ${t.fundamentalist ? '<p class="fine">Leaving a high-control group usually means being shunned by the congregation and by family who stay.</p>' : ''}
    <h4 class="sub">Attendance</h4><div class="toggle-row">${Object.entries(ATTENDANCE).map(([id, a]) => button(`${a.icon} ${a.label}`, 'community.attendance', { arg: id, variant: f.attendance === id ? 'small on' : 'small', hint: a.desc })).join('')}</div>
    <h4 class="sub">Giving</h4><div class="toggle-row">${GIVING_LEVELS.map((n) => button(n ? `${n}%${n === 10 ? ' (tithe)' : ''}` : 'None', 'community.give', { arg: String(n), variant: c.giving === n ? 'tiny on' : 'tiny' })).join('')}</div>
    <div class="toggle-row">
      ${f.role ? button('Step down', 'community.stepDown', { variant: 'small ghost' }) : ''}
      ${orders ? button(['catholic', 'tradCatholic', 'anglican'].includes(orders.tradition) ? '📜 Seek laicization' : '📜 Give up your credentials', 'holyOrders.laicize', { variant: 'small ghost', hint: 'Out of ministry first' }) : ''}
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

const RITE_NAME = Object.fromEntries([...RITES, ...COMING_OF_AGE].map((r) => [r.id, `${r.icon} ${r.name}`]));

/** Your faith's wider body, its offices, and the rites and pilgrimages you can keep. */
function institutionsCard(state) {
  const s = faithInstitutionSummary(state);
  if (!s || (!s.body && !s.rites.length)) return '';
  const rec = s.rec;
  const rows = s.rites.map(({ rite, check, done }) => `<li class="fund-row"><span><b>${rite.icon} ${esc(rite.name)}</b> <small>${rite.cost ? `≈${money(rite.cost)}` : 'free'}${rite.once ? ' · once in a life' : ''}${done != null ? ` · kept at ${done}` : ''}${check.ok ? '' : ` <span class="why">${esc(check.reason)}</span>`}</small></span>${button(rite.years ? 'Answer the call' : 'Go', 'faithInstitutions.rite', { arg: rite.id, variant: 'tiny', disabled: !check.ok })}</li>`).join('');
  return card('Faith & Its Institutions', `
    ${kv([
      s.body ? ['Body', esc(s.body)] : null,
      s.training ? ['Clergy trained at', esc(s.training)] : null,
      s.inst ? ['Your part', s.inst.role === 'minister' ? 'A minister of the body' : 'A lay leader (a delegate now and then)'] : null,
      rec ? ['Standing', meter(rec.standing)] : null,
      rec?.office ? ['Office', `${esc(rec.office.title)} since ${rec.office.since}${rec.office.until ? ` · term to ${rec.office.until}` : ''}`] : null,
      s.history.length ? ['Former offices', s.history.map((h) => `${esc(h.title)} (${h.from}–${h.to})`).join(', ')] : null,
      s.honorific ? ['Honorific', esc(s.honorific)] : null,
      s.mission ? ['Mission', `📛 Serving in ${esc(s.mission.place)} until ${s.mission.until}`] : null,
      s.kept.length ? ['Rites kept', s.kept.map(([id, age]) => `${RITE_NAME[id] ?? esc(id)} (${age})`).join(' · ')] : null,
    ])}
    ${s.inst?.role === 'minister' && s.offices.length && !rec?.office ? `<p class="fine">Offices of the body, by seniority: ${s.offices.map((o) => esc(o.title)).join(' → ')}. Standing in the body and your own seniority decide who is chosen.</p>` : ''}
    ${rec?.office ? `<div class="toggle-row">${button('Step down from office', 'faithInstitutions.resignOffice', { variant: 'small ghost' })}</div>` : ''}
    ${rows ? `<h4 class="sub">Rites & pilgrimages</h4><ul class="funds">${rows}</ul>` : ''}`, { icon: '🕍', accent: 'yellow' });
}

/** Religious life: the Jesuits, Opus Dei and the Missionaries of Charity. */
function religiousCard(state) {
  const r = religiousSummary(state);
  if (r) {
    return card(r.order.name, `${kv([
      ['Stage', `${esc(r.stage)}${r.kind ? ` · ${esc(r.kind)}` : ''}${r.nextIn != null ? ` <small class="muted">(${r.nextIn ? `${r.nextIn} yr to the next step` : 'next step this year'})</small>` : ''}`],
      ['Since', `age ${r.since}`],
      ['Vows', r.vows === 'final' ? (r.order === RELIGIOUS_ORDERS.opusDei ? 'The Fidelity (for life)' : 'Final vows (for life)') : r.vows === 'first' ? 'Temporary vows' : 'None yet'],
      r.apostolate ? ['Mission', esc(r.apostolate)] : null,
      r.office ? ['Office', esc(r.office)] : null,
    ])}
    <div class="toggle-row">${r.apostolate ? button('🔄 Ask for a new mission', 'religiousOrders.reassign', { variant: 'small ghost' }) : ''}${button(r.vows === 'final' ? '📜 Seek a dispensation' : '🚪 Leave', 'religiousOrders.leave', { variant: 'small danger' })}</div>`, { icon: r.order.icon, accent: 'yellow' });
  }
  if (!['catholic', 'tradCatholic'].includes(state.community.faith?.traditionId) || state.character.age < 18) return '';
  const rows = [['jesuits', '✝️ The Society of Jesus', 'Men. A dozen years of formation to final vows and the priesthood; schools, universities, refugees, missions.'],
    ['moc', '🤍 Missionaries of Charity', 'Women. The white sari; homes for the dying, children and the homeless, here and abroad.'],
    ['opusDei:numerary', '✝️ Opus Dei — numerary', 'Keep your job; celibacy, life in a centre, your salary given to the Work.'],
    ['opusDei:supernumerary', '✝️ Opus Dei — supernumerary', 'Keep your job and your family: daily prayer and a weekly circle.']]
    .map(([arg, label, desc]) => {
      const [id, kind] = arg.split(':');
      const c = entryCheck(state, id, kind);
      return `<li class="fund-row"><span><b>${label}</b> <small>${desc}${c.ok ? '' : ` <span class="why">${esc(c.reason)}</span>`}</small></span>${button('Ask to enter', 'religiousOrders.enter', { arg, variant: 'tiny', disabled: !c.ok })}</li>`;
    }).join('');
  return card('Religious Life', `<ul class="funds">${rows}</ul>`, { icon: '📿' });
}

export function communityView(state) {
  if (!state.community) return '';
  return `${warCard(state)}${warRolesCard(state)}${partyCard(state)}${faithCard(state)}${institutionsCard(state)}${religiousCard(state)}${civicView(state)}${serviceCard(state)}${joinCard(state)}`;
}

/** Party membership and how you've voted. */
function partyCard(state) {
  if (!state.civic || state.character.age < 16) return '';
  const p = partyOf(state);
  const votes = (state.civic.votes ?? []).slice(-5).reverse();
  const join = ['labor', 'business'].map((b) => button(`${PARTY_ICON[b]} ${esc(partyName(state, b))}`, 'party.join', { arg: b, variant: p?.bloc === b ? 'tiny on' : 'tiny', hint: `${money(PARTY_DUES)}/yr` })).join('');
  const role = p ? PARTY_ROLES[p.role] : null;
  return card('Party & Elections', `
    ${p ? `<p>${chip(`${PARTY_ICON[p.bloc]} ${esc(partyName(state, p.bloc))}`, 'good')} ${chip(role.label)} <small class="fine">since age ${p.since}${role.next ? ` · canvass in campaigns to rise to ${PARTY_ROLES[role.next].label.toLowerCase()}` : ''}</small></p>` : '<p class="muted">Join a party to canvass in national elections, rise in the local party and get its backing when you run.</p>'}
    ${canVote(state) ? '' : '<p class="why">Only citizens 18+ vote in national elections here.</p>'}
    <div class="toggle-row chips-row">${join}</div>
    ${p ? button('Leave the party', 'party.leave', { variant: 'small ghost' }) : ''}
    ${votes.length ? `<h4 class="sub">Your votes</h4><ul class="history">${votes.map((v) => `<li>Age ${v.age} · ${esc(v.body)}: ${v.choice === 'skip' ? 'didn\'t vote' : esc(partyName(state, v.choice))} ${v.choice === v.winner ? '✅' : v.choice === 'skip' ? '' : '❌'}</li>`).join('')}</ul>` : ''}`, { icon: '🗳️', summary: p ? partyName(state, p.bloc) : 'No party' });
}

/** The war your country is fighting, and conflicts elsewhere. */
/** Your part in the war, and contracts abroad. */
export function warRolesCard(state) {
  const r = warRoles(state);
  const c = state.military?.contract;
  if (!r.leader && !r.legislator && !r.general && !r.soldier && !c) return '';
  const done = (k) => Boolean(state.yearly[k]);
  const rows = [];
  if (r.leader) rows.push(`<h4 class="sub">As head of government</h4><div class="action-grid">${[['surge', '⚔️ Commit more forces'], ['negotiate', '🕊️ Offer talks'], ['fund', '💵 An emergency war budget'], ['mobilize', '📨 Draft / mobilize'], ['address', '🎙️ Address the nation']].map(([id, l]) => button(l, 'warRoles.lead', { arg: id, variant: 'small', disabled: done(`warRoles.lead.${id}`) })).join('')}</div>`);
  if (r.legislator) rows.push(`<h4 class="sub">In the legislature</h4><div class="action-grid">${button('✅ Vote for war funding', 'warRoles.vote', { arg: 'for', variant: 'small', disabled: done('warRoles.vote') })}${button('❌ Vote against', 'warRoles.vote', { arg: 'against', variant: 'small', disabled: done('warRoles.vote') })}</div>`);
  if (r.general) rows.push(`<h4 class="sub">Your campaign this year</h4><div class="action-grid">${[['offensive', '🗡️ Offensive'], ['defensive', '🛡️ Hold the line'], ['raid', '🎯 A deep raid']].map(([id, l]) => button(l, 'warRoles.campaign', { arg: id, variant: 'small', disabled: done('warRoles.campaign') })).join('')}</div>`);
  if (r.soldier) rows.push(`<div class="action-grid">${button('⚔️ Volunteer for the front line', 'warRoles.front', { variant: 'small danger', disabled: done('warRoles.front'), hint: 'Combat, glory, and real danger' })}</div>`);
  const war = r.war ?? r.svcWar;
  return card('Your Part in the War', `${war ? `<p class="muted">${esc(war.operation)}: front ${war.front > 0 ? '+' : ''}${Math.round(war.front)}, public support ${war.support}%.</p>` : ''}${rows.join('')}${c ? `<p>✈️ On contract: <b>${esc(c.title)}</b> in ${esc(COUNTRIES[c.country]?.name ?? c.country)} until ${c.until} (${money(c.pay)}/yr).</p>` : ''}`, { icon: '🎖️', accent: 'red' });
}

function warCard(state) {
  const w = state.world;
  if (!w?.wars) return '';
  const war = warHere(state);
  const here = state.character.countryId ?? 'US';
  const elsewhere = Object.values(w.wars).filter((x) => x.country !== here);
  if (!war && !elsewhere.length && !w.global?.length) return '';
  const main = war ? `<p><b>${esc(war.operation)}</b> — ${esc(war.name)} against ${esc(war.adversary)}</p>
    <p>${chip(PHASE_LABEL[war.phase], war.phase === 'active' ? 'bad' : war.phase === 'talks' ? 'warn' : 'good')} ${chip(INTENSITY_LABEL[war.intensity])} ${war.draft ? chip(here === 'US' ? '📨 Draft in force' : '📨 Call-ups', 'warn') : ''} ${war.mobilized ? chip('🚫 General mobilization', 'bad') : ''}</p>
    ${kv([['Front', frontLabel(war.front)], ['Year', String(war.years + 1)], ['Military dead', war.casualties.toLocaleString()], ['Danger at home', homeDanger(state) >= 0.3 ? '<span class="neg">High</span>' : homeDanger(state) > 0 ? 'Some' : 'None']])}
    <h4 class="sub">Public support</h4>${meter(war.support, { label: 'Back the war' })}` : '<p class="muted">Your country is at peace.</p>';
  const others = [...elsewhere.map((x) => `${COUNTRIES[x.country]?.flag ?? ''} ${esc(x.name)} (${esc(PHASE_LABEL[x.phase].toLowerCase())})`), ...(w.global ?? []).map((g) => `🌍 ${esc(g.name)}`)];
  return card('War & World', `${main}${others.length ? `<h4 class="sub">Elsewhere</h4><ul class="history">${others.map((o) => `<li>${o}</li>`).join('')}</ul>` : ''}`, { icon: war ? '⚔️' : '🌍', accent: war ? 'red' : undefined, summary: war ? `${PHASE_LABEL[war.phase]} · ${frontLabel(war.front)}` : 'At peace' });
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

function movementBlock(state, a) {
  const m = movementOf(state);
  if (m) return `<h4 class="sub">${esc(m.name)}</h4>${kv([['Members', m.members.toLocaleString()], ['Funds', money(m.funds)], ['Strength', `${m.strength}/100`], ['Campaign wins', String(m.wins)], ['Strategy', esc(STRATEGIES[m.strategy]?.label ?? '')]])}<p class="fine">Each year you choose a strategy; at strength 60+ campaigns start to win.</p>`;
  if (!a?.cause) return '';
  return `<div class="toggle-row">${button('🏛️ Found a movement', 'movements.found', { variant: 'small', disabled: (a.influence ?? 0) < 25, hint: (a.influence ?? 0) < 25 ? 'Needs influence 25+' : 'Members, money, strategy — and backlash' })}</div>`;
}

function sectCard(state) {
  if (state.character.age < 21) return '';
  const S = sectOf(state);
  if (!S) return card('Found a Church', `<p class="muted">Start your own congregation: a rented hall, thirty people, and whatever you preach.</p><div class="toggle-row">${button('⛪ Found a church', 'sects.found', { variant: 'small' })}</div>`, { icon: '⛪' });
  return card(esc(S.name), `${kv([['Members', S.members.toLocaleString()], ['Preaching', esc(SECT_STYLES[S.style]?.label ?? '')], ['Church funds', money(S.funds)], ['Controversy', `${S.controversy}/100`], ['Building', S.building ? 'Your own' : 'Rented hall'], ['TV ministry', S.tv ? 'Yes' : 'No']])}<div class="toggle-row">${button('Close the church', 'sects.close', { variant: 'small ghost' })}</div>`, { icon: '⛪' });
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
    ${tactics ? `<h4 class="sub">Take action (2 per year)</h4><div class="action-grid">${tactics}</div>${button('Step back from activism', 'civic.leaveCause', { variant: 'small ghost' })}` : ''}
    ${movementBlock(state, a)}`, { icon: '🪧' });
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
    <h4 class="sub">Transit authority board</h4>${state.civic.transitBoard ? `<p class="fine">🚇 ${state.civic.transitBoard.chair ? 'Board chair' : 'Director'} · ${state.civic.transitBoard.years} yr · $12,000 stipend</p>` : `<div class="toggle-row">${button('🚇 Seek an appointment', 'civic.transitBoard', { variant: 'small', hint: transitBoardEligibility(state).ok ? 'The mayor appoints directors' : transitBoardEligibility(state).reason, disabled: !transitBoardEligibility(state).ok })}</div>`}
    ${recent.length ? `<h4 class="sub">Recent ballot measures</h4><ul class="history">${recent.map((h) => `<li>${MEASURES[h.id].icon} ${esc(MEASURES[h.id].name)} <small>age ${h.age} · ${h.passed ? 'passed' : 'failed'} (${h.yes}% yes)</small></li>`).join('')}</ul>` : '<p class="fine">Local measures appear on your ballot most years.</p>'}`, { icon: '🗳️' });
}

export function civicView(state) {
  return `${neighborsCard(state)}${hoaCard(state)}${schoolCard(state)}${activismCard(state)}${sectCard(state)}${localCard(state)}`;
}
