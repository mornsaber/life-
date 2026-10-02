/**
 * Legal tab: criminal record, probation, incarceration and open exposure;
 * life in prison (what to do with the year, appeals, parole, death row);
 * and second chances (sealing records, pardons).
 */
import { esc, money, button, card, chip, kv, empty } from '../Components.js';
import { SEVERITY_LABEL } from '../../modules/legal/index.js';
import { paroleEligibility, APPEAL_COST } from '../../modules/legal/Prison.js';
import { sealStatus, pardonStatus, SEAL_COST } from '../../modules/legal/Clemency.js';
import { stateOf } from '../../modules/life/Regions.js';
import { STATES } from '../../modules/life/States.js';

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
    const status = r.sealed ? chip('Sealed', 'good') : r.pardoned ? chip('Pardoned', 'good') : '';
    const notes = [!r.sealed && !r.pardoned ? (seal.ok ? '✅ can be sealed' : `Seal: ${seal.reason}`) : '', !r.pardoned && r.severity === 'felony' ? (pardon.ok ? `🕊️ pardon odds ${Math.round(pardon.chance * 100)}% (${pardon.by})` : `Pardon: ${pardon.reason}`) : ''].filter(Boolean).join(' · ');
    return `<li><b>${esc(r.name)}</b> <small>age ${r.age}</small> ${status}<br><small class="muted">${esc(notes)}</small></li>`;
  }).join('');
  const canSeal = l.record.some((r) => sealStatus(state, r).ok);
  const canPardon = l.record.some((r) => pardonStatus(state, r).ok);
  return card('Second Chances', `<p class="muted">Sealed records disappear from employer and licensing background checks. A pardon restores your rights. Violent crimes can't be sealed; federal crimes can only be pardoned.</p>
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
  const death = stateOf(state).deathPenalty;
  return `${card('Legal Status', `${status}${kv([
    ['Felonies', l.record.filter((r) => r.severity === 'felony' && !r.sealed && !r.pardoned).length],
    ['Misdemeanors', l.record.filter((r) => r.severity === 'misdemeanor' && !r.sealed).length],
    ['Things that could still catch up with you', l.investigations.length ? `<span class="neg">${l.investigations.length}</span>` : '0'],
  ])}<p class="fine">Felonies bar most licensed professions, clearances, police reserves and military enlistment. Diplomatic immunity only shields you from host-country law. ${esc(stateOf(state).name)} ${death ? DEATH_PENALTY_LABEL[death] : 'has no death penalty'}.</p>`, { icon: '⚖️', accent: 'red' })}
  ${prisonCard(state)}
  ${secondChanceCard(state)}
  ${card('Criminal Record', record, { icon: '🗂️' })}`;
}

