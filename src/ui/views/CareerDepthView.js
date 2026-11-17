/**
 * Career depth (career/CompanyLife.js and friends): the company you work for, your shares,
 * head office.
 */
import { button, card, esc, meter, kv } from '../Components.js';
import { assignmentsFor } from '../../modules/career/Assignments.js';
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
    ...(job.earnOut ? [['Earn-out', `💰 Up to ${money(job.earnOut.bonus)} at age ${job.earnOut.until}, on how ${esc(job.earnOut.name)} does (lost if you leave)`]] : []),
  ];
  const history = c.history.length ? `<h4 class="sub">What's happened</h4><ul class="history">${c.history.slice(0, 5).map((h) => `<li>${KIND[h.kind] ?? '•'} Age ${h.age}: ${esc(h.text)}</li>`).join('')}</ul>` : '';
  const move = isBig(job) && !atHq && (job.grade ?? 0) >= 5
    ? `<div class="row-end">${button(`🏢 Transfer to head office in ${esc(hq?.name.split(',')[0] ?? 'the capital')}`, 'companyLife.headOffice', { variant: 'small', hint: 'The top posts are there: a move for you and the family' })}</div>` : '';
  return card(`${esc(job.employer.name)}`, `<div class="stat-line"><span>🏭 ${health}</span>${meter(c.health, { tone: c.health >= 55 ? 'good' : c.health >= 30 ? 'warn' : 'bad' })}</div>${kv(rows)}${history}${move}`, { icon: '🏢' });
}

/* ---- How promotion happens (career/Advancement.js) ---- */
import { reputationOf, reputationLabel } from '../../modules/career/Reputation.js';
import { marriageBar, equalPayYear } from '../../modules/career/EraPay.js';
import { getProfession } from '../../modules/career/JobTrees.js';
import { yearNow } from '../../modules/world/Eras.js';
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
  if (job.womensRate) rows.push(['Women\'s rate', `💷 ${Math.round(job.womensRate * 100)}% of a man's pay for the job${equalPayYear(state, job) > yearNow(state) ? '' : ' (equal pay is closing it)'}`]);
  const bar = state.character.gender === 'female' ? marriageBar(state, getProfession(job.professionId)) : null;
  if (bar) rows.push(['Marriage bar', `💍 Married women must leave ${esc(bar.what)} (until ${bar.until})`]);
  if (job.stayedOnMarried) rows.push(['Stayed on', '💼 Married and still here: the firm holds it against you']);
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
  // Board seats live on the Part-time Work tab now; here only the top job's own decisions.
  if (!top) return '';
  const list = '' && seats.length ? `<h4 class="sub">Your boards (${seats.length} of ${MAX_SEATS})</h4><ul class="history">${seats.map((b) => `<li>${b.kind === 'charity' ? '💚' : b.kind === 'public' ? '🏛️' : '🪑'} <b>${esc(b.name)}</b> <small>${b.fee ? `${money(b.fee)}/yr · ` : 'unpaid · '}term to age ${b.until}</small> ${button('Step down', 'boardroom.resign', { arg: b.id, variant: 'tiny ghost' })}</li>`).join('')}</ul>` : '';
  const strategy = top ? `<h4 class="sub">This year's strategy</h4><div class="action-grid">${Object.entries(STRATEGIES).map(([id, s]) => button(`${s.icon} ${s.label}`, 'boardroom.strategy', { arg: id, variant: (job.strategy ?? 'quality') === id ? 'small on' : 'small ghost', hint: s.hint, disabled: (job.strategy ?? 'quality') === id })).join('')}</div>
    <h4 class="sub">Succession${job.successor ? `: ${job.successor === 'insider' ? 'grooming an insider' : 'an outside search under way'}` : ''}</h4><div class="action-grid">${button('🧑‍💼 Groom an insider', 'boardroom.successor', { arg: 'insider', variant: 'small ghost' })}${button('🔎 Ask for an outside search', 'boardroom.successor', { arg: 'outsider', variant: 'small ghost' })}</div>` : '';
  return card(top ? 'The Top Job' : 'Boards', `${strategy}${list}`, { icon: '🪑' });
}

/* ---- What the job takes (publicsafety/ServiceWear.js) ---- */
import { uniformedRole } from '../../modules/publicsafety/Uniformed.js';

export function wearCard(state) {
  const role = uniformedRole(state);
  const w = state.wear;
  if (!role || !w?.years) return '';
  const pct = (x) => Math.min(100, Math.round(x));
  const meters = [
    ['🧠 Trauma', state.health?.trauma ?? 0],
    ['👂 Noise', w.noise],
    ...(w.smoke ? [['🌫️ Smoke', w.smoke]] : []),
    ['🦴 Lifting and falls', w.lifting],
  ].map(([label, v]) => `<div class="stat-line"><span>${label}</span>${meter(pct(v), { tone: v >= 60 ? 'bad' : v >= 30 ? 'warn' : 'good' })}</div>`).join('');
  const job = state.career?.job;
  const rows = [
    ['Years in uniform', String(w.years)],
    ...(w.fallen ? [['Colleagues lost', `🕯️ ${w.fallen}`]] : []),
    ...(job?.lightDuty ? [['Light duty', `🗂️ On a desk until age ${job.lightDuty.until}`]] : []),
    ...(w.flags?.agentOrange ? [['Exposure', 'Agent Orange (Vietnam era)']] : []),
    ...(w.flags?.burnPits ? [['Exposure', 'Burn pits (Iraq and Afghanistan era)']] : []),
  ];
  return card('What the Job Takes', `${meters}${kv(rows)}<p class="fine">Exposure adds up: past a point it turns into hearing loss, a bad back, and for firefighters heart disease and cancer. Trauma eases with time, peer support and counselling.</p>`, { icon: '🩹' });
}

/* ---- Command (career/Command.js) ---- */
import { commanderKind, PREPS } from '../../modules/career/Command.js';

export function commandCard(state) {
  const kind = commanderKind(state);
  if (!kind) return '';
  const r = state.command?.readiness ?? { training: 40, kit: 40, plans: 40, mutualAid: 40 };
  const NAMES = { training: '🏋️ Drills', kit: '🧰 Kit', plans: '🗂️ Plans', mutualAid: '🤝 Agreements' };
  const keys = Object.keys(NAMES).filter((k) => PREPS[k][kind]);
  const meters = keys.map((k) => `<div class="stat-line"><span>${NAMES[k]}</span>${meter(r[k], { tone: r[k] >= 60 ? 'good' : r[k] >= 30 ? 'warn' : 'bad' })}</div>`).join('');
  const done = Boolean(state.yearly?.['command.prepare']);
  const buttons = keys.map((k) => button(PREPS[k][kind].label, 'command.prepare', { arg: k, variant: 'small ghost', hint: PREPS[k][kind].hint, disabled: done })).join('');
  const inq = state.command?.inquiry;
  const pending = inq ? `<p class="fine">🔍 An inquiry into ${esc(inq.title.toLowerCase())} reports at age ${inq.age}.</p>` : '';
  return card('Command', `${meters}${pending}<p class="fine">How ready your people are when the big day comes. It fades if you neglect it; one preparation a year.</p><div class="action-grid">${buttons}</div>`, { icon: '🎛️' });
}

/* ---- The chief's office (publicsafety/ChiefsOffice.js) ---- */
import { isServiceHead, masterOf } from '../../modules/publicsafety/ChiefsOffice.js';

export function chiefCard(state) {
  if (!isServiceHead(state) || !state.chief) return '';
  const c = state.chief;
  const rows = [['🏛️ Their confidence', c.confidence], ['🪧 The union', c.union], ['🗞️ The public', c.public], ['💷 Budget', c.budget]];
  const meters = rows.map(([label, v]) => `<div class="stat-line"><span>${label}</span>${meter(v, { tone: v >= 55 ? 'good' : v >= 30 ? 'warn' : 'bad' })}</div>`).join('');
  return card("The Chief's Office", `<p class="fine">You answer to ${esc(masterOf(state))}. Lose their confidence and you'll be asked to go.</p>${meters}`, { icon: '⭐' });
}

/** Postings within your rank: detective work, traffic, the dog section, fire investigation… (career/Assignments.js). */
export function postingsCard(state) {
  const job = state.career?.job;
  const opts = assignmentsFor(state);
  if (!job || !opts.length) return '';
  const cur = job.assignment ? opts.find((o) => o.def.id === job.assignment.id) : null;
  const rows = opts.map(({ def, ok, reason }) => (def.id === job.assignment?.id ? ''
    : `<li class="fund-row"><span>${def.icon} <b>${esc(def.name(state))}</b><br><small class="muted">${esc(def.blurb)}</small></span>${button('Put in for it', 'assignments.request', { arg: def.id, variant: 'small', disabled: !ok, hint: reason ?? undefined })}</li>`)).join('');
  return card('Postings', `${cur ? `<p>${cur.def.icon} Posted to <b>${esc(cur.def.name(state))}</b> since age ${job.assignment.since}: you're <b>${esc(job.title)}</b>. Your rank and its badge stay the same.</p><div class="toggle-row">${button('↩️ Back to general duties', 'assignments.leave', { variant: 'small ghost' })}</div>` : '<p class="fine">A posting changes the work, and sometimes the title, not your rank.</p>'}<ul class="history">${rows}</ul>`, { icon: '🗂️' });
}

/** Board seats and invitations (career/Boardroom.js), for the Part-time Work tab. */
export function boardSeatsCard(state) {
  const seats = state.career?.boards ?? [];
  const offers = state.career?.boardOffers ?? [];
  if (!seats.length && !offers.length) return card('Boards', '<p class="muted">Boards invite the very senior, and people with a real name in their field: a company as a non-executive director (fees), a charity as a trustee (unpaid), a public body (a modest fee). Six meetings a year, three-year terms.</p>', { icon: '🪑' });
  const offerRows = offers.map((o, i) => `<li class="fund-row"><span>${o.kind === 'charity' ? '💚' : o.kind === 'public' ? '🏛️' : '🪑'} <b>${esc(o.name)}</b><br><small class="muted">as ${esc(o.role ?? 'a director')} · ${o.fee ? `${money(o.fee)}/yr` : 'unpaid'} · offer open until age ${o.until}</small></span><span>${button('Accept', 'boardroom.acceptOffer', { arg: i, variant: 'small', disabled: seats.length >= MAX_SEATS, hint: seats.length >= MAX_SEATS ? 'Step down from a board first' : undefined })}${button('Decline', 'boardroom.declineOffer', { arg: i, variant: 'small ghost' })}</span></li>`).join('');
  const seatRows = seats.map((b) => `<li>${b.kind === 'charity' ? '💚' : b.kind === 'public' ? '🏛️' : '🪑'} <b>${esc(b.name)}</b> <small>${b.fee ? `${money(b.fee)}/yr · ` : 'unpaid · '}term to age ${b.until}</small> ${button('Step down', 'boardroom.resign', { arg: b.id, variant: 'tiny ghost' })}</li>`).join('');
  return card('Boards', `${offers.length ? `<h4 class="sub">Invitations</h4><ul class="history">${offerRows}</ul>` : ''}${seats.length ? `<h4 class="sub">Your boards (${seats.length} of ${MAX_SEATS})</h4><ul class="history">${seatRows}</ul>` : ''}`, { icon: '🪑' });
}
