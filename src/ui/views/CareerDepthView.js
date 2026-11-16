/**
 * Career depth (career/CompanyLife.js and friends): the company you work for, your shares,
 * head office.
 */
import { button, card, esc, meter, kv } from '../Components.js';
import { REGIONS } from '../../modules/life/Regions.js';
import { corpPeek, isCorporate, isBig, equityValue } from '../../modules/career/CompanyLife.js';

const money = (n) => `$${Math.round(n).toLocaleString()}`;
const KIND = { acquired: '🤝', merger: '⚖️', reorganized: '🔀', newCeo: '👔', spunOff: '🧬', floated: '🔔', collapsed: '📉' };

export function companyCard(state) {
  const job = state.career?.job;
  if (!isCorporate(job)) return '';
  const c = corpPeek(state, job);
  if (!c) return '';
  const eq = equityValue(state, job);
  const hq = REGIONS[c.hq];
  const atHq = c.hq === state.character.regionId;
  const health = c.health >= 75 ? 'Booming' : c.health >= 55 ? 'Doing well' : c.health >= 35 ? 'Under pressure' : c.health >= 20 ? 'Struggling' : 'In trouble';
  const rows = [
    ['Owned by', c.parent ?? (c.listed ? 'Shareholders (listed)' : c.young ? 'Founders and investors' : 'Privately held')],
    ...(c.listed ? [['Share price', `${c.share} (100 when you joined)`]] : []),
    ...(isBig(job) ? [['Head office', `${esc(hq?.name ?? '—')}${atHq ? ' · you work here' : ''}`]] : []),
    ...(eq.kind && eq.kind !== 'profit' ? [[eq.kind === 'options' ? 'Your options' : 'Your shares', `${eq.vested ? `${money(eq.vested)} vested · ` : ''}${money(eq.unvested)} still vesting${eq.unvested ? ' (lost if you leave)' : ''}`]] : []),
    ...(eq.kind === 'profit' ? [['Profit share', 'Paid in a record year']] : []),
  ];
  const history = c.history.length ? `<h4 class="sub">What's happened</h4><ul class="history">${c.history.slice(0, 5).map((h) => `<li>${KIND[h.kind] ?? '•'} Age ${h.age}: ${esc(h.text)}</li>`).join('')}</ul>` : '';
  const move = isBig(job) && !atHq && (job.grade ?? 0) >= 5
    ? `<div class="row-end">${button(`🏢 Transfer to head office in ${esc(hq?.name.split(',')[0] ?? 'the capital')}`, 'companyLife.headOffice', { variant: 'small', hint: 'The top posts are there: a move for you and the family' })}</div>` : '';
  return card(`${esc(job.employer.name)}`, `<div class="stat-line"><span>🏭 ${health}</span>${meter(c.health, { tone: c.health >= 55 ? 'good' : c.health >= 30 ? 'warn' : 'bad' })}</div>${kv(rows)}${history}${move}`, { icon: '🏢' });
}

/* ---- How promotion happens (career/Advancement.js) ---- */
import { reputationOf, reputationLabel } from '../../modules/career/Reputation.js';
import { RATINGS, upOrOutIn, partnerOdds, wantsAssessment, assessmentOdds, confirmOdds } from '../../modules/career/Advancement.js';

export function advancementCard(state) {
  const job = state.career?.job;
  if (!job) return '';
  const rows = [];
  const rep = reputationOf(state);
  if (rep > 0) rows.push(['Name in the field', `${reputationLabel(rep)} (${rep}/100)${rep >= 30 ? ': headhunters call, offers pay more' : ''}`]);
  if (job.calibration) rows.push(['Calibration', `${RATINGS[job.calibration.rating].icon} ${RATINGS[job.calibration.rating].label} (age ${job.calibration.age})`]);
  if (job.pip) rows.push(['Improvement plan', `📋 Until age ${job.pip.until}: you need a record of 50+`]);
  if (job.acting) rows.push(['Acting', `🪪 ${esc(job.acting.title)} until age ${job.acting.until} · ${Math.round(confirmOdds(job) * 100)}% to be confirmed`]);
  if (job.scheme && !job.scheme.done) rows.push(['Graduate scheme', `🚀 ${esc(job.scheme.name)} until age ${job.scheme.until}`]);
  const uo = upOrOutIn(state, job);
  if (uo != null) rows.push(['Up or out', `🏛️ ${uo ? `Decision in ${uo} yr` : 'Decided this year'} · ${Math.round(partnerOdds(state, job) * 100)}% on today's record`]);
  if (job.upOrOut === 'counsel') rows.push(['Up or out', '📚 Counsel: no further rise here']);
  const assess = wantsAssessment(state, job)
    ? `<div class="row-end">${button('🎯 Sit the senior assessment centre', 'advancement.assessment', { variant: 'small', hint: `${Math.round(assessmentOdds(state, job) * 100)}% · senior public posts are filled through it` })}</div>` : '';
  if (!rows.length && !assess) return '';
  return card('Getting On', `${rows.length ? kv(rows) : ''}${assess}`, { icon: '🪜' });
}

/* ---- Life in a ministry (career/Ministries.js) ---- */
import { isMinistry, ministerTitle } from '../../modules/career/Ministries.js';

export function ministryCard(state) {
  const job = state.career?.job;
  if (!isMinistry(job) || !job.ministry) return '';
  const m = job.ministry;
  const rows = [
    [`Your ${ministerTitle(state)}`, `${esc(m.minister.name)} (since age ${m.minister.since})`],
    ...(m.privateOffice ? [['Private office', `🗝️ Private secretary until age ${m.privateOffice.until}`]] : []),
    ['Next budget round', (job.grade ?? 1) >= 6 ? `In ${Math.max(0, 3 - (state.character.age - m.lastReview))} yr` : 'Above your grade'],
  ];
  return card(job.employer.name, `<div class="stat-line"><span>🤝 The minister's trust</span>${meter(m.minister.trust)}</div><div class="stat-line"><span>💷 Budget settlement</span>${meter(m.budget, { tone: m.budget >= 55 ? 'good' : m.budget >= 35 ? 'warn' : 'bad' })}</div>${kv(rows)}`, { icon: '🏛️' });
}

/* ---- Boards and the top (career/Boardroom.js) ---- */
import { atTheTop, STRATEGIES, MAX_SEATS } from '../../modules/career/Boardroom.js';

export function boardroomCard(state) {
  const job = state.career?.job;
  const seats = state.career?.boards ?? [];
  const top = atTheTop(job);
  if (!seats.length && !top) return '';
  const list = seats.length ? `<h4 class="sub">Your boards (${seats.length} of ${MAX_SEATS})</h4><ul class="history">${seats.map((b) => `<li>${b.kind === 'charity' ? '💚' : b.kind === 'public' ? '🏛️' : '🪑'} <b>${esc(b.name)}</b> <small>${b.fee ? `${money(b.fee)}/yr · ` : 'unpaid · '}term to age ${b.until}</small> ${button('Step down', 'boardroom.resign', { arg: b.id, variant: 'tiny ghost' })}</li>`).join('')}</ul>` : '';
  const strategy = top ? `<h4 class="sub">This year's strategy</h4><div class="action-grid">${Object.entries(STRATEGIES).map(([id, s]) => button(`${s.icon} ${s.label}`, 'boardroom.strategy', { arg: id, variant: (job.strategy ?? 'quality') === id ? 'small on' : 'small ghost', hint: s.hint, disabled: (job.strategy ?? 'quality') === id })).join('')}</div>
    <h4 class="sub">Succession${job.successor ? `: ${job.successor === 'insider' ? 'grooming an insider' : 'an outside search under way'}` : ''}</h4><div class="action-grid">${button('🧑‍💼 Groom an insider', 'boardroom.successor', { arg: 'insider', variant: 'small ghost' })}${button('🔎 Ask for an outside search', 'boardroom.successor', { arg: 'outsider', variant: 'small ghost' })}</div>` : '';
  return card(top ? 'The Top Job' : 'Boards', `${strategy}${list}`, { icon: '🪑' });
}
