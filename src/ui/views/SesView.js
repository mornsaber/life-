/** The Senior Executive Service on the Career tab: readiness, the routes in, and life as an executive. */
import { esc, button, card, chip, kv } from '../Components.js';
import { sesReadiness, slstReadiness, sesLevelFor, corpsName, SES_PAY, CDP_YEARS } from '../../modules/publicservice/SeniorExecutive.js';
import { getProfession } from '../../modules/career/JobTrees.js';
import { hasCredential } from '../../modules/credentials/LicensingEngine.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;

export function sesCard(state) {
  const job = state.career.job;
  const s = state.ses;
  if (!s || !job || getProfession(job.professionId)?.sector !== 'federal') return '';
  const corps = corpsName(job.professionId);
  const applied = Boolean(state.yearly['ses.apply']);
  if (s.stage === 'member') {
    const years = state.character.age - s.since;
    return card(s.type === 'slst' ? 'Senior Level / Senior Technical' : corps, `${kv([
      ['Appointment', s.type === 'pas' ? 'Presidential appointee (Senate-confirmed)' : s.type === 'slst' ? 'SL/ST expert' : `Career ${corps.replace('Senior ', '')}`],
      ['Since', `age ${s.since} (${years} yr)${s.probationUntil != null ? ' · on probation' : ''}`],
      ['Pay', `${money(s.pay ?? job.salary)} · band ${money(SES_PAY.min)}–${money(SES_PAY.max)}, no locality pay`],
      ['Last appraisal', s.rating ?? 'Due at year\'s end'],
      s.awards ? ['Performance awards', String(s.awards)] : null,
    ])}
      <div class="action-grid">${button('⬇️ Step down to GS-15', 'ses.stepDown', { variant: 'small', hint: 'Your fallback right as a career employee' })}</div>
      <p class="fine">Pay moves with your annual appraisal; Outstanding and Exceeds ratings earn 5–20% performance awards. After three years you can be nominated for a Presidential Rank Award. Executives can be reassigned anywhere on short notice, and every new administration brings new political bosses.</p>`, { icon: '🏛️', accent: 'yellow' });
  }
  if (s.stage === 'cdp') {
    return card('SES Candidate Development Program', `${kv([
      ['Year', `${s.cdpYears + 1} of ${CDP_YEARS}`],
      ['Developmental assignments', s.cdpDetails.length ? s.cdpDetails.join(', ') : 'Coming up'],
    ])}<p class="fine">Executive courses, a mentor, 360-degree feedback and a four-month assignment outside your job. Then your ECQs go to OPM's Qualifications Review Board.</p>`, { icon: '🎓', accent: 'yellow' });
  }
  const r = sesReadiness(state);
  const t = slstReadiness(state);
  if ((job.grade ?? 0) < 6 && !hasCredential(state, 'sesCert')) return '';
  const next = sesLevelFor(job);
  const checklist = (list) => `<div class="chip-row">${list.map(([label, ok]) => chip(`${ok ? '✅' : '⬜'} ${esc(label)}`, ok ? 'good' : '')).join(' ')}</div>`;
  return card(corps, `<p class="muted">The top rungs of federal careers${next ? ` — like ${esc(next.title)}` : ''} are executive posts. Getting one takes certification of your Executive Core Qualifications by OPM's Qualifications Review Board: Leading Change, Leading People, Results Driven, Business Acumen, Building Coalitions.</p>
    ${s.stage === 'certified' ? `<p>${chip('🏛️ QRB-certified', 'honor')} You can be appointed to an executive post without competing again — offers come from your agency.</p>` : ''}
    <h4 class="sub">Ready to apply?</h4>${checklist(r.checks)}
    <div class="action-grid">
      ${s.stage === 'certified' ? '' : button('🎓 Apply to the Candidate Development Program', 'ses.cdp', { variant: 'small', disabled: !r.ok || applied, hint: r.ok ? 'Competitive: a two-year program, then near-certain certification' : 'Meet the checklist first' })}
      ${button(s.stage === 'certified' ? '📨 Apply to an SES vacancy' : '📝 Write ECQs and apply to an SES vacancy', 'ses.ecq', { variant: 'small', disabled: !r.ok || applied, hint: s.stage === 'certified' ? 'Certified: no narratives needed' : 'Ten pages of accomplishment narratives; the agency picks, then the QRB reviews' })}
    </div>
    <h4 class="sub">Or the expert's route: Senior Level / Senior Technical</h4>${checklist(t.checks)}
    <div class="action-grid">${button('🔬 Apply for an SL/ST position', 'ses.slst', { variant: 'small', disabled: !t.ok || applied, hint: 'Executive pay for top specialists — no management' })}</div>
    <p class="fine">One SES application a year. Executive pay runs ${money(SES_PAY.min)}–${money(SES_PAY.max)} with no locality pay.</p>`, { icon: '🏛️', accent: 'yellow' });
}
