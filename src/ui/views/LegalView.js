/**
 * Legal tab: criminal record, probation, incarceration and open exposure;
 * life in prison (what to do with the year, appeals, parole, death row);
 * and second chances (sealing records, pardons).
 */
import { esc, money, button, card, chip, kv, empty } from '../Components.js';
import { SEVERITY_LABEL } from '../../modules/legal/index.js';
import { paroleEligibility, APPEAL_COST } from '../../modules/legal/Prison.js';
import { sealStatus, pardonStatus, SEAL_COST, spentStatus } from '../../modules/legal/Clemency.js';
import { stateOf } from '../../modules/life/Regions.js';
import { deathPenaltyHere } from '../../modules/legal/JusticeSystem.js';
import { STATES } from '../../modules/life/States.js';
import { COUNTRIES } from '../../modules/world/Countries.js';
import { courtDef, courtTitle, courtsHere, benchHere, currentCourt, benchEligibility, benchYears, selectionFor, layEligibility, examEligibility, MANDATORY_RETIREMENT } from '../../modules/legal/Judiciary.js';
import { CLAIMS, claimEligibility } from '../../modules/legal/CivilCourts.js';

const SELECTION_LABEL = { elected: 'elected', merit: 'merit selection + retention votes', appointed: 'appointed', career: 'career judiciary: by seniority' };

/** The bench: your seat, record and the ladder above you — the country's own courts abroad. */
function benchCard(state) {
  const court = currentCourt(state);
  const j = state.judiciary;
  const bench = benchHere(state);
  const lawyer = state.credentials?.held?.barLicense || (state.education?.degrees ?? []).some((d) => d.programId === 'jd');
  const layOpen = bench?.lay && state.character.age >= 18;
  if (!court && !lawyer && !(j?.history.length) && !j?.lay && !j?.school && !layOpen) return '';
  const seat = j?.seat;
  const c = court ? courtDef(court) : null;
  const ladder = courtsHere(state).map((id) => {
    const d = courtDef(id);
    const e = benchEligibility(state, id);
    const how = d.system === 'national' ? (d.pick === 'seniority' ? `by seniority after ${d.after} yr` : d.pick === 'entry' ? 'by exam' : d.pick === 'elected' ? 'elected' : `appointed by ${d.appointedBy}`) : SELECTION_LABEL[selectionFor(state, id)];
    return `<li>${d.icon} <b>${esc(courtTitle(state, id))}</b> <small>${money(d.salary)}/yr${d.partTime ? ' (part-time)' : ''} · ${d.life ? 'life tenure' : d.term ? `${d.term}-yr term` : `to age ${d.retire ?? MANDATORY_RETIREMENT}`} · ${esc(how)}</small> ${court === id ? chip('your seat', 'good') : e.ok ? chip('eligible', '') : `<span class="why">${esc(e.reason)}</span>`}</li>`;
  }).join('');
  const intro = !bench
    ? 'Judges come from the ranks of experienced lawyers. Trial benches are filled by election, merit selection or appointment depending on the state; federal judges are nominated by the President and confirmed by the Senate.'
    : bench.route === 'career' ? `Judging here is a career of its own: you enter young through the ${esc(bench.school?.exam ?? 'judicial exam')}${bench.school?.years ? ` and ${esc(bench.school.name)}` : ''}, then rise by seniority; ${esc(bench.appointedBy)} fills the top courts.`
      : bench.route === 'elected' ? 'Judges here stand for election.' : `Judges are appointed from experienced lawyers by ${esc(bench.appointedBy)}. Years of practice open each court.`;
  const school = j?.school ? `<p>${chip(`🎓 ${esc(j.school.name)} — until age ${j.school.until}`, 'good')}</p>` : '';
  const exam = bench?.route === 'career' && !seat && !j?.school ? (() => { const e = examEligibility(state); return button(`📝 Sit the ${esc(bench.school.exam)}`, 'judiciary.sitExam', { variant: 'small', disabled: !e.ok, hint: e.ok ? `≈${Math.round(e.odds * 100)}% to place` : e.reason }); })() : '';
  const lay = bench?.lay ? (j?.lay
    ? `<p>${chip(`${bench.lay.icon} ${esc(j.lay.name)} since ${j.lay.since} · ${j.lay.sittings} sittings`, 'good')}</p>${button('Stand down', 'judiciary.leaveLay', { variant: 'small' })}`
    : (() => { const e = layEligibility(state); return `<p class="fine">${esc(bench.lay.desc)}</p>${button(`${bench.lay.icon} Apply to be a ${esc(bench.lay.name)}`, 'judiciary.applyLay', { variant: 'small', disabled: !e.ok, hint: e.ok ? `≈${Math.round(e.odds * 100)}% selected` : e.reason })}`; })()) : '';
  return card('The Bench', `
    ${c ? kv([
      ['Seat', `${c.icon} ${esc(courtTitle(state, court))}`],
      ['Years on the bench', String(benchYears(state))],
      seat ? ['Reputation (bar & bench)', `${seat.reputation}/100`] : null,
      seat ? ['Public approval', `${seat.approval}%`] : null,
      seat ? ['Rulings', `${seat.rulings}${seat.reversals ? ` · ${seat.reversals} reversed on appeal` : ''}`] : null,
      seat && !c.life && c.system !== 'national' ? ['Term', `${seat.termLeft} yr left${c.system === 'state' ? ` · mandatory retirement at ${MANDATORY_RETIREMENT}` : ''}`] : null,
      seat && c.system === 'national' ? ['Term', c.term ? `${seat.termLeft} yr left of a fixed term` : `Until retirement at ${c.retire}`] : null,
    ]) : `<p class="muted">${intro}</p>`}
    ${school}
    ${lawyer || court ? `<ul class="history">${ladder}</ul>` : ''}
    ${seat || exam ? `<div class="toggle-row">${exam}${seat ? button('Resign from the bench', 'judiciary.resign', { variant: 'small danger' }) : ''}</div>` : ''}
    ${lay ? `<h4 class="sub">Lay bench</h4>${lay}` : ''}
    <p class="fine">${bench ? 'Strong reputations draw invitations to higher courts; judges must be citizens, and moving abroad ends a seat.' : 'The elected trial seat is on the Politics tab. Strong reputations draw nominations to higher courts; reversals and unpopular rulings cost you at retention time. Federal judges can take senior status at full pay under the Rule of 80.'}</p>`, { icon: '⚖️', accent: 'yellow' });
}

/** Lawsuits, judgments and jury service. */
function civilCard(state) {
  const c = state.civil;
  if (!c || state.character.age < 18) return '';
  const open = c.suits.map((s) => `<li>${s.role === 'plaintiff' ? '📤 You vs.' : '📥 Suing you:'} <b>${esc(CLAIMS[s.kind]?.label.split(' (')[0] ?? s.kind)}</b> <small>$${s.amount.toLocaleString()} · year ${s.years + 1}${s.lawyer ? ' · represented' : ''}</small></li>`).join('');
  const past = c.history.slice(-6).reverse().map((h) => `<li><small>${h.age}: ${h.role === 'plaintiff' ? 'you sued' : 'you were sued'} (${esc(h.kind)}) — ${esc(h.result)}${h.amount ? ` ${h.amount > 0 ? '+' : '−'}${money(Math.abs(h.amount))}` : ''}</small></li>`).join('');
  const sue = Object.entries(CLAIMS).map(([id, k]) => {
    const e = claimEligibility(state, id);
    return button(`${k.icon} ${k.label}`, 'civil.sue', { arg: id, variant: 'small', disabled: !e.ok, hint: e.ok ? k.desc : e.reason });
  }).join('');
  return card('Civil Court', `
    ${kv([
      c.judgments ? ['Unpaid judgments', `<span class="neg">${money(c.judgments)}</span> · wages garnished 25%`] : null,
      ['Jury service', c.juries ? `${c.juries} trial${c.juries > 1 ? 's' : ''}` : 'Never picked'],
    ])}
    ${open ? `<h4 class="sub">Open cases</h4><ul class="history">${open}</ul>` : ''}
    <h4 class="sub">File a lawsuit</h4><div class="toggle-row">${sue}</div>
    ${past ? `<h4 class="sub">Past cases</h4><ul class="history">${past}</ul>` : ''}
    <p class="fine">Ignore a lawsuit and the court enters a default judgment; unpaid judgments are garnished from your wages. Homeowner's and malpractice insurance defend covered claims.</p>`, { icon: '🏛️' });
}

const COUNTRY_NAME = (state) => COUNTRIES[state.character.countryId]?.name ?? 'The country';
const DEATH_PENALTY_LABEL = { active: 'carries out executions', moratorium: 'has the death penalty but a moratorium on executions', rare: 'has the death penalty but almost never uses it' };

function prisonCard(state) {
  const inc = state.legal.incarceration;
  if (!inc) return '';
  const done = (key) => Boolean(state.yearly[key]);
  const parole = paroleEligibility(state);
  const hasDiploma = state.education.degrees.some((d) => d.type === 'highschool');
  const actions = [
    button(hasDiploma ? '📚 Take college courses' : '📚 Study for the GED', 'legal.prisonStudy', { disabled: done('prison.study'), hint: hasDiploma ? `${inc.collegeYears ?? 0}/2 yrs toward an associate's` : '+Good behavior' }),
    button('🧹 Work a prison job', 'legal.prisonWork', { disabled: done('prison.work'), hint: 'Cents an hour · +Good behavior' }),
    button('🧠 Treatment program', 'legal.prisonProgram', { disabled: done('prison.program'), hint: inc.programDone || inc.deathRow ? 'Recovery and good behavior' : 'Can take a year off your sentence' }),
    button('🤝 Visiting day', 'legal.prisonVisit', { disabled: done('prison.visit'), hint: '+Happiness, family ties' }),
    button('🏋️ Work out in the yard', 'legal.prisonWorkout', { disabled: done('prison.workout'), hint: '+Fitness' }),
    button('🦂 Join a gang', 'legal.prisonGang', { variant: 'danger', disabled: Boolean(inc.gang) || done('prison.gang'), hint: 'Protection now, trouble later' }),
    button('⚖️ Appeal (attorney)', 'legal.prisonAppeal', { arg: 'lawyer', disabled: done('prison.appeal'), hint: `${money(APPEAL_COST)} · long odds` }),
    button('📝 Appeal pro se', 'legal.prisonAppeal', { arg: 'proSe', variant: 'ghost', disabled: done('prison.appeal'), hint: 'Free · longer odds' }),
    button('📋 Parole hearing', 'legal.prisonParole', { disabled: !parole.ok || done('prison.parole'), hint: parole.ok ? `${Math.round(parole.chance * 100)}% odds` : parole.reason }),
    inc.deathRow ? button('🕊️ Petition for clemency', 'legal.seekPardon', { disabled: done('legal.pardon'), hint: 'The governor can commute to life' }) : '',
    button('🏃 Try to escape', 'legal.prisonEscape', { variant: 'danger', disabled: done('prison.escape'), hint: 'Almost never works' }),
  ].join('');
  const deathNote = inc.deathRow
    ? `<p class="neg">⛓️ Sentenced to death in ${esc(STATES[inc.deathRow.state]?.name ?? inc.deathRow.state)} at age ${inc.deathRow.sentencedAge}. Appeals and clemency are your only way out.</p>`
    : '';
  return card(inc.deathRow ? 'Death Row' : 'Life Inside', `${deathNote}${kv([
    ['Facility', esc(inc.facility)],
    ['Served', `${inc.served} yr${inc.deathRow ? '' : ` · ${inc.yearsLeft} to go`}`],
    ['Good behavior', inc.goodBehavior ?? 0],
    inc.gang ? ['Gang', '<span class="neg">Affiliated</span>'] : null,
  ])}<div class="action-grid">${actions}</div>`, { icon: '🔒', accent: 'red' });
}

function secondChanceCard(state) {
  const l = state.legal;
  if (l.incarceration || !l.record.some((r) => ['misdemeanor', 'felony'].includes(r.severity))) return '';
  const rows = l.record.filter((r) => ['misdemeanor', 'felony'].includes(r.severity)).map((r) => {
    const seal = sealStatus(state, r);
    const pardon = pardonStatus(state, r);
    const spent = spentStatus(state, r);
    const status = r.spent ? chip('Spent', 'good') : r.sealed ? chip('Sealed', 'good') : r.pardoned ? chip('Pardoned', 'good') : spent ? chip(`Spent at ${spent.at} if you stay clean`, '') : '';
    const notes = [!r.sealed && !r.pardoned ? (seal.ok ? '✅ can be sealed' : `Seal: ${seal.reason}`) : '', !r.pardoned && r.severity === 'felony' ? (pardon.ok ? `🕊️ pardon odds ${Math.round(pardon.chance * 100)}% (${pardon.by})` : `Pardon: ${pardon.reason}`) : ''].filter(Boolean).join(' · ');
    return `<li><b>${esc(r.name)}</b> <small>age ${r.age}</small> ${status}<br><small class="muted">${esc(notes)}</small></li>`;
  }).join('');
  const canSeal = l.record.some((r) => sealStatus(state, r).ok);
  const canPardon = l.record.some((r) => pardonStatus(state, r).ok);
  return card('Second Chances', `<p class="muted">Sealed records disappear from employer and licensing background checks. A pardon restores your rights. Violent crimes can't be sealed; federal crimes can only be pardoned. Most convictions also become <b>spent</b> on their own after enough crime-free years (5–10), hidden from ordinary employers — though police, schools and care work still see them.</p>
    <ul class="history">${rows}</ul>
    <div class="toggle-row">${button('🗃️ Petition to seal', 'legal.sealRecord', { variant: 'small', disabled: !canSeal || l.probationYears > 0 || Boolean(state.yearly['legal.seal']), hint: l.probationYears > 0 ? 'After probation' : `${money(SEAL_COST)} attorney & fees` })}${button('🕊️ Apply for a pardon', 'legal.seekPardon', { variant: 'small', disabled: !canPardon || Boolean(state.yearly['legal.pardon']), hint: 'Rarely granted' })}</div>`, { icon: '🕊️', accent: 'green' });
}

export function legalView(state) {
  const l = state.legal;
  const inc = l.incarceration;
  const status = inc
    ? `<p class="why">🔒 ${inc.deathRow ? 'On death row' : `Incarcerated at ${esc(inc.facility)} — ${inc.yearsLeft} of ${inc.total} years remaining`}. Most actions are unavailable.</p>`
    : l.fugitive ? `<p class="why">🏃 You're a fugitive. If you're caught, you'll serve the rest of your sentence and more.</p>`
      : l.probationYears ? `<p>${chip(`⚖️ On probation: ${l.probationYears} yr`, 'warn')}</p>` : '<p class="pos">No current sentence.</p>';
  const record = l.record.length
    ? `<ul class="history">${[...l.record].reverse().map((r) => `<li>${chip(SEVERITY_LABEL[r.severity] ?? r.severity, r.severity === 'felony' ? 'bad' : r.severity === 'misdemeanor' ? 'warn' : '')} <b>${esc(r.name)}</b>${r.abroad ? ' (abroad)' : ''}${r.sealed ? ` ${chip(r.vacated ? 'Vacated' : 'Sealed', 'good')}` : ''}${r.pardoned ? ` ${chip('Pardoned', 'good')}` : ''} <small>age ${r.age} — ${esc(r.sentence || 'no sentence')}</small></li>`).join('')}</ul>`
    : empty('Clean record.');
  const dp = deathPenaltyHere(state);
  const death = dp?.status;
  return `${card('Legal Status', `${status}${kv([
    ['Felonies', l.record.filter((r) => r.severity === 'felony' && !r.sealed && !r.pardoned).length],
    ['Misdemeanors', l.record.filter((r) => r.severity === 'misdemeanor' && !r.sealed).length],
    ['Things that could still catch up with you', l.investigations.length ? `<span class="neg">${l.investigations.length}</span>` : '0'],
  ])}<p class="fine">Felonies bar most licensed professions, clearances, police reserves and military enlistment. Diplomatic immunity only shields you from host-country law. ${esc(dp?.where ?? (state.character.countryId ? COUNTRY_NAME(state) : stateOf(state).name))} ${death ? DEATH_PENALTY_LABEL[death] : 'has no death penalty'}.</p>`, { icon: '⚖️', accent: 'red' })}
  ${prisonCard(state)}
  ${civilCard(state)}
  ${benchCard(state)}
  ${secondChanceCard(state)}
  ${card('Criminal Record', record, { icon: '🗂️' })}`;
}

