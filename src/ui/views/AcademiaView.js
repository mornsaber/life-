/**
 * Academic life on screen: the Ph.D. (School tab) and the research record,
 * tenure clock, academic job market and sabbaticals (Career tab).
 */
import { esc, button, card, chip, kv, meter } from '../Components.js';
import { MAJORS } from '../../modules/education/Catalog.js';
import { ACADEMIC_JOBS, PHD_TIME_LIMIT, TENURE_CLOCK, marketEligibility, competitiveness, sabbaticalAvailable, tenureSummary, tenureOdds } from '../../modules/academia/Academia.js';

const STAGES = [['coursework', 'Coursework'], ['quals', 'Qualifying exams'], ['candidacy', 'Candidacy (ABD)'], ['research', 'Dissertation research'], ['defense', 'Defense']];

function stageOf(phd, e) {
  if (phd.defended) return 4;
  if (phd.candidacy) return 3;
  if (phd.quals) return 2;
  return e.progress >= 1 ? 1 : 0;
}

/** The Ph.D. in progress. */
export function phdCard(state) {
  const e = state.education.enrolled;
  const phd = state.academia?.phd;
  if (e?.programId !== 'phd' || !phd) return '';
  const stage = stageOf(phd, e);
  const steps = STAGES.map(([, label], i) => chip(`${i < stage ? '✅' : i === stage ? '▶️' : '⬜'} ${label}`, i === stage ? 'good' : '')).join(' ');
  const a = phd.advisor;
  return card('Your Ph.D.', `<div class="chip-row">${steps}</div>
    ${kv([
      ['Field', esc(MAJORS[phd.field]?.name ?? '—')],
      ['Advisor', a ? `${esc(a.name)} <small>(fame ${a.fame}, support ${a.support})</small>` : 'Not chosen yet'],
      ['Funding', { ta: 'Teaching assistantship', ra: 'Research assistantship', fellowship: `NSF fellowship (${phd.grfp} yr left)` }[phd.funding] ?? '—'],
      ['Papers', `${phd.papers} (${phd.firstAuthor} first-author)${phd.conference ? ` · ${phd.conference} conference talk${phd.conference > 1 ? 's' : ''}` : ''}`],
      ['Year', `${Math.floor(e.progress) + 1} of at most ${PHD_TIME_LIMIT}`],
    ])}
    <p class="fine">Most doctorates take 5–7 years. Your committee lets you defend once you have about three first-author papers (fewer later on). Fail quals twice, or hit year ${PHD_TIME_LIMIT}, and you leave with a master's.</p>`, { icon: '🔬', accent: 'cyan' });
}

/** Research record, tenure clock, job market and sabbatical. */
export function researchCard(state) {
  const s = state.science;
  const job = state.career.job;
  const academic = job && ACADEMIC_JOBS.includes(job.professionId);
  const hasPhd = state.education.degrees.some((d) => d.programId === 'phd');
  if (!academic && !hasPhd && !(s?.papers > 0)) return '';
  const market = marketEligibility(state);
  const record = kv([
    ['Papers', `${s.papers}${s.firstAuthor ? ` (${s.firstAuthor} first-author)` : ''}${s.retractions ? ` · ${s.retractions} retracted` : ''}`],
    ['Citations', `${(s.citations ?? 0).toLocaleString()} · h-index ${s.hIndex ?? 0}`],
    s.grantsWon ? ['Grants won', String(s.grantsWon)] : null,
    s.grant ? ['Current grant', `${esc(s.grant.agency)}, $${s.grant.amount.toLocaleString()}/yr · ${s.grant.yearsLeft} yr left`] : null,
    s.students ? ['Ph.D. students graduated', String(s.students)] : null,
    job?.teaching != null && academic ? ['Teaching evaluations', `${job.teaching}/100`] : null,
  ]);
  let tenure = '';
  if (job?.tenureClock && job.levelId === 'assistant') {
    tenure = job.terminal
      ? '<div class="next-step">📁 Tenure denied: this is your terminal year. Go on the market.</div>'
      : `${meter(Math.min(job.yearsInLevel, TENURE_CLOCK), { max: TENURE_CLOCK, label: 'Tenure clock', suffix: ` / ${TENURE_CLOCK} yrs`, tone: 'mid' })}<p class="fine">${esc(tenureSummary(state, job))} Odds today: about ${Math.round(tenureOdds(state, job) * 100)}%.</p>`;
  } else if (job?.tenured || job?.abilities?.includes('tenure')) tenure = `<p class="fine">${chip('🔒 Tenured', 'good')}</p>`;
  const sab = job ? sabbaticalAvailable(state, job) : { ok: false };
  const buttons = `<div class="action-grid">
    ${button('📬 Go on the academic job market', 'academia.goOnMarket', { disabled: !market.ok, hint: market.ok ? `Competitiveness ${Math.round(competitiveness(state))}` : market.reason })}
    ${job && (job.tenured || job.abilities?.includes('tenure')) ? button('🌍 Take a sabbatical', 'academia.sabbatical', { disabled: !sab.ok, hint: sab.ok ? 'A year of research, no teaching' : sab.reason }) : ''}
  </div>`;
  return card('Research & Academia', `${record}${tenure}${buttons}
    <p class="fine">Tenure-track jobs are scarce: first-author papers, citations, your advisor's name, your Ph.D. school, postdoc years and your field all count. Postdocs, national labs, industry and community colleges are the other doors.</p>`, { icon: '🔬' });
}
