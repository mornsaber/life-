/**
 * Politics tab: the legislatures over you (makeup, leaders, staff, this
 * session's bills), the laws in force, your seat (bills, leadership,
 * committee, staff) and lobbying.
 */
import { esc, button, card, chip, meter, kv, disclosure } from '../Components.js';
import { bodiesHere, mySeat, myBody, inMajority, billTitle, BODY_DEFS, COMMITTEES, CAUCUSES, POSTS, STAFF_ROLES, legActionsPerYear } from '../../modules/politics/Legislature.js';
import { LAWS, levelValue, lawValue, describeValue, proposedValue } from '../../modules/politics/Laws.js';
import { isOfficer, myUnion } from '../../modules/career/LaborUnions.js';
import { REGIONS } from '../../modules/life/Regions.js';

const LEVEL_LABEL = { city: 'City', state: 'State', federal: 'Federal' };
const STAGE = { law: ['✅ Law', 'green'], dead: ['✖ Dead', 'bad'], introduced: ['📥 In the hopper', ''], floor: ['🗳️ On the floor', 'warn'], desk: ['✍️ On the desk', 'warn'] };

function makeup(body) {
  const pct = Math.round((body.labor / body.seats) * 100);
  return `${meter(pct, { label: `✊ Labor bloc ${body.labor} · 💼 Business bloc ${body.seats - body.labor}`, tone: 'mid' })}`;
}

function bodyBlock(state, body) {
  const d = BODY_DEFS[body.kind];
  const L = body.leaders;
  const bills = (body.bills ?? []).slice().reverse().map((b) => `<li>${LAWS[b.lawId].icon} ${esc(billTitle(b))} <small class="muted">${b.sponsor === 'you' ? 'your bill' : b.sponsor === 'lobby' ? 'lobbied' : `by ${esc(b.sponsor)}`}${b.outcome ? ` — ${esc(b.outcome)}` : ''}</small> ${chip(...(STAGE[b.stage] ?? ['', '']))}</li>`).join('');
  return `<h4 class="sub">${esc(body.name)} <small class="muted">${body.seats} seats · ${body.staffCount.toLocaleString()} staff · election in ${body.nextElection} yr</small></h4>
    ${makeup(body)}
    ${kv([
      [d.presiding, `${esc(L.presiding.name)}${L.presiding.you ? ' (you)' : ''} ${CAUCUSES[L.presiding.caucus].icon}`],
      ['Majority leader', `${esc(L.majority.name)}${L.majority.you ? ' (you)' : ''} ${CAUCUSES[L.majority.caucus].icon}`],
      ['Minority leader', `${esc(L.minority.name)} ${CAUCUSES[L.minority.caucus].icon}`],
      body.executive ? [d.executive, `${esc(body.executive.name)} ${CAUCUSES[body.executive.caucus].icon}`] : null,
    ].filter(Boolean))}
    ${body.chairs ? `<p class="fine">🗂️ Chairs: ${Object.entries(body.chairs).filter(([id]) => COMMITTEES[id]).map(([id, c]) => `${esc(COMMITTEES[id].name)} — ${esc(c.name)}${c.you ? ' (you)' : ''}`).join(' · ')}</p>` : ''}
    ${body.members?.length ? disclosure(`members-${body.id}`, body.members.length < body.seats ? `Senior members (${body.members.length} of ${body.seats})` : `Members (${body.members.length})`, `<ul class="history">${body.members.slice().sort((a, b) => (b.you ? 1 : 0) - (a.you ? 1 : 0) || b.terms - a.terms).map((m) => `<li>${CAUCUSES[m.caucus].icon} <b>${esc(m.name)}</b>${m.you ? ' (you)' : ''} <small class="muted">District ${m.district} · ${m.terms} term${m.terms === 1 ? '' : 's'}</small></li>`).join('')}</ul>`) : ''}
    ${bills ? disclosure(`bills-${body.id}`, 'This session', `<ul class="history">${bills}</ul>`) : ''}
    ${body.history.length ? disclosure(`hist-${body.id}`, 'Recent history', `<ul class="history">${body.history.slice().reverse().map((h) => `<li><small>age ${h.age}</small> ${esc(h.text)}</li>`).join('')}</ul>`) : ''}`;
}

/** Laws where you live, level by level. */
function lawsCard(state) {
  const region = state.character.regionId;
  const st = (REGIONS[region] ?? REGIONS.midcity).state;
  const rows = Object.entries(LAWS).map(([id, law]) => {
    const cell = (level) => (law.levels.includes(level) ? esc(describeValue(id, levelValue(state, id, level, level === 'city' ? region : level === 'state' ? st : null))) : '<span class="muted">—</span>');
    return `<tr><td>${law.icon} ${esc(law.name)}<br><small class="muted">${esc(law.effect)}</small></td><td>${cell('city')}</td><td>${cell('state')}</td><td>${cell('federal')}</td></tr>`;
  }).join('');
  const recent = (state.laws?.enacted ?? []).slice(-6).reverse().map((e) => `<li><small>age ${e.age}</small> ${LAWS[e.lawId].icon} ${LEVEL_LABEL[e.level]}: ${esc(LAWS[e.lawId].name)} → ${esc(describeValue(e.lawId, e.value))}${e.sponsor === 'you' ? ' (your bill)' : ''}</li>`).join('');
  return card('Laws in Force', `
    <p class="fine">Where levels overlap, the highest minimum wage applies; a state's labor laws apply unless federal law sets one. Effective minimum wage here: ${esc(describeValue('minWage', lawValue(state, 'minWage') ?? 7.25))}.</p>
    ${disclosure('laws-table', 'City · State · Federal', `<table class="table"><thead><tr><th>Law</th><th>City</th><th>State</th><th>Federal</th></tr></thead><tbody>${rows}</tbody></table>`)}
    ${recent ? `<h4 class="sub">Recently enacted</h4><ul class="history">${recent}</ul>` : ''}`, { icon: '📚' });
}

/** Your seat: caucus, post, committee, staff, bills. */
function seatCard(state) {
  const seat = mySeat(state);
  const body = myBody(state);
  if (!seat || !body) return '';
  const used = state.yearly['legislature.act'] ?? 0;
  const left = legActionsPerYear(seat) - used;
  const terms = state.politics.office?.terms ?? 1;
  const sponsorRows = Object.entries(LAWS).filter(([, l]) => l.levels.includes(body.level)).map(([id, law]) => {
    const cur = levelValue(state, id, body.level, body.level === 'federal' ? null : body.where);
    const up = proposedValue(id, cur ?? (law.kind === 'number' ? law.min : cur), 'up');
    const down = proposedValue(id, cur ?? (law.kind === 'number' ? law.min : cur), 'down');
    return `<li class="report-row"><div>${law.icon} <b>${esc(law.name)}</b> <small class="muted">now ${esc(describeValue(id, cur))}</small></div><div class="toggle-row">${up !== null ? button(`⬆️ ${esc(describeValue(id, up))}`, 'legislature.sponsor', { arg: `${id}|up`, variant: 'tiny', disabled: left <= 0 }) : ''}${down !== null ? button(`⬇️ ${esc(describeValue(id, down))}`, 'legislature.sponsor', { arg: `${id}|down`, variant: 'tiny', disabled: left <= 0 }) : ''}</div></li>`;
  }).join('');
  const posts = Object.entries(POSTS).map(([id, P]) => button(seat.post === id ? `✓ ${P.title}` : `Run for ${P.title.toLowerCase()}`, 'legislature.runPost', { arg: id, variant: seat.post === id ? 'tiny on' : 'tiny', disabled: seat.post === id || terms < P.minTerms || (P.majority && !inMajority(state)) || Boolean(state.yearly['legislature.runPost']), hint: terms < P.minTerms ? `${P.minTerms} terms` : P.majority && !inMajority(state) ? 'Majority caucus only' : `+${Math.round(P.pay * 100)}% pay` })).join('');
  const staff = seat.staff.map((p) => `<li class="report-row"><div><b>${esc(p.name)}</b> <small class="muted">${esc(STAFF_ROLES[p.role].title)} · skill ${p.skill}</small></div>${button('Let go', 'legislature.fireStaff', { arg: p.id, variant: 'tiny danger' })}</li>`).join('');
  const allowance = BODY_DEFS[body.kind].allowance;
  const pending = body.bills.filter((b) => b.stage === 'introduced');
  return card(`Your Seat: ${esc(body.name)}`, `
    <p>${chip(`${CAUCUSES[seat.caucus].icon} ${CAUCUSES[seat.caucus].name}`, 'cyan')} ${chip(inMajority(state) ? 'In the majority' : 'In the minority', inMajority(state) ? 'green' : 'warn')} ${seat.post ? chip(POSTS[seat.post].title, 'gold') : ''} ${seat.committee ? chip(`🗂️ ${COMMITTEES[seat.committee].name}`) : ''}</p>
    <p class="fine">${left > 0 ? `${left} legislative action${left === 1 ? '' : 's'} left this year.` : 'No legislative actions left this year.'} Bills you introduce come to the floor at year-end; in a close vote, yours decides.</p>
    <h4 class="sub">Introduce a bill</h4><ul class="history">${sponsorRows}</ul>
    ${seat.post && pending.length ? `<h4 class="sub">Whip votes</h4><div class="toggle-row">${pending.map((b) => button(`📋 ${esc(billTitle(b))}`, 'legislature.whip', { arg: b.id, variant: 'tiny', disabled: left <= 0 })).join('')}</div>` : ''}
    <h4 class="sub">Leadership</h4><div class="toggle-row">${posts}</div>
    <h4 class="sub">Committee</h4><div class="toggle-row">${Object.entries(COMMITTEES).map(([id, c]) => button(c.name, 'legislature.committee', { arg: id, variant: seat.committee === id ? 'tiny on' : 'tiny' })).join('')}</div>
    <h4 class="sub">Your staff <small class="muted">${seat.staff.length}/${allowance} funded</small></h4>
    ${staff ? `<ul class="history">${staff}</ul>` : '<p class="muted">No staff yet.</p>'}
    <div class="toggle-row">${Object.entries(STAFF_ROLES).map(([id, r]) => button(`Hire ${r.title.toLowerCase()}`, 'legislature.hireStaff', { arg: id, variant: 'tiny', disabled: seat.staff.length >= allowance, hint: r.desc })).join('')}</div>
    <div class="toggle-row">${Object.entries(CAUCUSES).filter(([id]) => id !== seat.caucus).map(([id, c]) => button(`🔀 Switch to the ${c.name}`, 'legislature.caucus', { arg: id, variant: 'tiny ghost', hint: 'Costs approval' })).join('')}</div>
    ${seat.record.length ? disclosure('my-record', 'Your record', `<ul class="history">${seat.record.slice().reverse().map((r) => `<li><small>age ${r.age}</small> ${esc(r.text)}</li>`).join('')}</ul>`) : ''}`, { icon: '🏛️', accent: 'yellow' });
}

/** Lobbying from outside: a business owner's money or a union officer's clout. */
function lobbyCard(state) {
  if (mySeat(state)) return '';
  const owner = state.business?.current || state.business?.holdings?.length;
  const union = isOfficer(state) && myUnion(state);
  if (!owner && !union) return '';
  const left = 2 - (state.yearly['legislature.lobby'] ?? 0);
  const rows = ['city', 'state', 'federal'].flatMap((level) => Object.entries(LAWS).filter(([, l]) => l.levels.includes(level)).map(([id, law]) => [level, id, law]));
  const list = rows.map(([level, id, law]) => `<li class="report-row"><div>${law.icon} ${esc(law.name)} <small class="muted">${LEVEL_LABEL[level]}</small></div><div class="toggle-row">${button('⬆️ For', 'legislature.lobby', { arg: `${id}|up|${level}`, variant: 'tiny', disabled: left <= 0 })}${button('⬇️ Against', 'legislature.lobby', { arg: `${id}|down|${level}`, variant: 'tiny', disabled: left <= 0 })}</div></li>`).join('');
  return card('Lobbying', `<p class="fine">${union ? 'As a union officer you can put the union\'s clout behind pro-labor bills.' : ''} ${owner ? 'Your companies can fund a lobbying campaign: $25k for the city, $150k for the state, $1M in Washington.' : ''} ${left} campaign${left === 1 ? '' : 's'} left this year.</p>${disclosure('lobby-list', 'Laws you can push', `<ul class="history">${list}</ul>`)}`, { icon: '💼' });
}

export function legislatureCards(state) {
  const bodies = bodiesHere(state);
  if (!bodies.length) return '';
  const groups = ['city', 'state', 'federal'].map((level) => {
    const bs = bodies.filter((b) => b.level === level);
    return bs.length ? disclosure(`leg-${level}`, `${LEVEL_LABEL[level]} legislature`, bs.map((b) => bodyBlock(state, b)).join('')) : '';
  }).join('');
  return `${seatCard(state)}${card('Legislatures', `<p class="fine">Bills pass a floor vote in each chamber, then need the executive's signature (a veto takes two-thirds to override). Unions' clout and business lobbying move votes; elections every two years shift the blocs.</p>${groups}`, { icon: '🏛️' })}${lawsCard(state)}${lobbyCard(state)}`;
}
