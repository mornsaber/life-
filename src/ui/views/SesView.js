/** The Senior Executive Service on the Career tab: readiness, the routes in, and life as an executive. */
import { esc, button, card, chip, kv } from '../Components.js';
import { sesReadiness, slstReadiness, sesLevelFor, corpsFor, CDP_YEARS } from '../../modules/publicservice/SeniorExecutive.js';
import { getProfession } from '../../modules/career/JobTrees.js';
import { hasCredential } from '../../modules/credentials/LicensingEngine.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;

export function sesCard(state) {
  const job = state.career.job;
  const s = state.ses;
  if (!s || !job || getProfession(job.professionId)?.sector !== 'federal') return '';
  const C = corpsFor(state, job.professionId);
  const corps = C.name;
  const applied = Boolean(state.yearly['ses.apply']);
  if (s.stage === 'member') {
    const years = state.character.age - s.since;
    return card(s.type === 'slst' ? 'Senior Level / Senior Technical' : corps, `${kv([
      ['Appointment', s.type === 'pas' ? 'Presidential appointee (Senate-confirmed)' : s.type === 'slst' ? 'SL/ST expert' : C.us ? `Career ${corps.replace('Senior ', '')}` : `${corps} (career)`],
      ['Since', `age ${s.since} (${years} yr)${s.probationUntil != null ? ' · on probation' : ''}`],
      ['Pay', `${money(s.pay ?? job.salary)} · band ${money(C.payMin)}–${money(C.payMax)}${C.us ? ', no locality pay' : ''}`],
      ['Last appraisal', s.rating ?? 'Due at year\'s end'],
      s.awards ? ['Performance awards', String(s.awards)] : null,
    ])}
      <div class="action-grid">${button(`⬇️ Step down to ${C.fallback}`, 'ses.stepDown', { variant: 'small', hint: 'Your fallback right as a career employee' })}</div>
      <p class="fine">Pay moves with your annual appraisal; top ratings earn 5–20% performance awards.${C.us ? ' After three years you can be nominated for a Presidential Rank Award.' : ''} Executives can be reassigned on short notice, and every new ${C.us ? 'administration' : 'government'} brings new political bosses.</p>`, { icon: '🏛️', accent: 'yellow' });
  }
  if (s.stage === 'cdp') {
    return card(C.us ? 'SES Candidate Development Program' : C.programme, `${kv([
      ['Year', `${s.cdpYears + 1} of ${CDP_YEARS}`],
      ['Developmental assignments', s.cdpDetails.length ? s.cdpDetails.join(', ') : 'Coming up'],
    ])}<p class="fine">Executive courses, a mentor, 360-degree feedback and a four-month assignment outside your job. Then ${esc(C.board)} assesses you against ${esc(C.quals)}.</p>`, { icon: '🎓', accent: 'yellow' });
  }
  const r = sesReadiness(state);
  const t = slstReadiness(state);
  if ((job.grade ?? 0) < 6 && !hasCredential(state, 'sesCert')) return '';
  const next = sesLevelFor(job);
  const checklist = (list) => `<div class="chip-row">${list.map(([label, ok]) => chip(`${ok ? '✅' : '⬜'} ${esc(label)}`, ok ? 'good' : '')).join(' ')}</div>`;
  return card(corps, `<p class="muted">${C.us ? `The top rungs of federal careers${next ? ` — like ${esc(next.title)}` : ''} are executive posts. Getting one takes certification of your Executive Core Qualifications by OPM's Qualifications Review Board: Leading Change, Leading People, Results Driven, Business Acumen, Building Coalitions.` : `The top posts of the national civil service${next ? ` — like ${esc(next.title)}` : ''} belong to the ${esc(corps)}. Selection is by ${esc(C.board)}, against ${esc(C.quals)}.`}</p>
    ${s.stage === 'certified' ? `<p>${chip(C.us ? '🏛️ QRB-certified' : `🏛️ ${esc(C.short)}-ready`, 'honor')} You can be appointed to an executive post without competing again — offers come from your agency.</p>` : ''}
    <h4 class="sub">Ready to apply?</h4>${checklist(r.checks)}
    <div class="action-grid">
      ${s.stage === 'certified' ? '' : button(`🎓 Apply to the ${esc(C.us ? 'Candidate Development Program' : C.programme)}`, 'ses.cdp', { variant: 'small', disabled: !r.ok || applied, hint: r.ok ? 'Competitive: a two-year program, then near-certain certification' : 'Meet the checklist first' })}
      ${button(s.stage === 'certified' ? `📨 Apply to a ${esc(C.short)} vacancy` : C.us ? '📝 Write ECQs and apply to an SES vacancy' : `📝 Apply to a ${esc(C.short)} vacancy`, 'ses.ecq', { variant: 'small', disabled: !r.ok || applied, hint: s.stage === 'certified' ? 'Already assessed: no written statement needed' : C.us ? 'Ten pages of accomplishment narratives; the agency picks, then the QRB reviews' : `A written statement and an assessment centre; ${C.board} approves` })}
    </div>
    ${C.us ? `<h4 class="sub">Or the expert's route: Senior Level / Senior Technical</h4>${checklist(t.checks)}
    <div class="action-grid">${button('🔬 Apply for an SL/ST position', 'ses.slst', { variant: 'small', disabled: !t.ok || applied, hint: 'Executive pay for top specialists — no management' })}</div>` : ''}
    <p class="fine">One application a year. Executive pay runs ${money(C.payMin)}–${money(C.payMax)}${C.us ? ' with no locality pay' : ''}.</p>`, { icon: '🏛️', accent: 'yellow' });
}
