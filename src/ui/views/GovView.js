/**
 * Public Service tab: civil-service exams, security clearance, and the
 * state of your city (municipal) or the federal government.
 */
import { currentCountry } from '../../core/Locale.js';
import { vettingForm } from '../../modules/world/MilitaryLocal.js';
import { CLEARANCE_PREMIUM, sponsorEligibility } from '../../modules/career/ClearedWork.js';
import { esc, button, card, chip, meter, kv, empty } from '../Components.js';
import { COMPETITIONS, competitionCheck } from '../../modules/world/IntlOrgs.js';
import { EXAMS, CLEARANCES, PASSING_SCORE, examStatus, veteranPreference, backgroundIssues, CLEARANCE_GRACE_YEARS } from '../../modules/publicservice/PublicServiceEngine.js';
import { MUNICIPAL_PROFESSIONS } from '../../modules/publicservice/MunicipalGov.js';
import { FEDERAL_PROFESSIONS } from '../../modules/publicservice/FederalAgencies.js';
import { STATE_PROFESSIONS } from '../../modules/publicservice/StateAgencies.js';
import { professionsFor } from '../../modules/career/JobTrees.js';

export function govView(state) {
  const ps = state.publicService;
  const vet = veteranPreference(state);
  const abroad = (state.character.countryId ?? 'US') !== 'US';
  // Abroad: only the exams for public jobs that exist here (no US federal assessments).
  const pool = abroad ? professionsFor(state) : [...Object.values(MUNICIPAL_PROFESSIONS), ...Object.values(STATE_PROFESSIONS), ...Object.values(FEDERAL_PROFESSIONS)];
  const exams = Object.entries(EXAMS).filter(([id]) => !abroad || pool.some((p) => p.exam === id)).map(([id, exam]) => {
    const st = examStatus(state, id);
    const usedBy = [...new Set(pool.filter((p) => p.exam === id).map((p) => p.name))];
    return `<li class="exam-row">
      <div><b>${exam.icon} ${exam.name}</b><small>${esc(exam.desc)} Used by: ${esc(usedBy.join(', '))}.</small>
        ${st.taken ? `<small>Score <b class="${st.passed ? 'pos' : 'neg'}">${st.score}</b>${vet ? ` (+${vet} veterans' preference = ${st.rankedScore})` : ''} · ${st.valid ? `valid until age ${st.expiresAge}` : 'expired'}</small>` : ''}</div>
      ${button(st.taken ? 'Retake' : 'Take exam', 'publicservice.takeExam', { arg: id, variant: 'small', hint: exam.cost ? `$${exam.cost}` : 'Free', disabled: state.yearly[`exam.${id}`] > 0 })}
    </li>`;
  }).join('');

  const c = ps.clearance;
  const issues = backgroundIssues(state).filter((i) => !i.hidden);
  const clearance = card('Security Clearance', `
    ${c ? `<p>${CLEARANCES[c.level].icon} <b>${CLEARANCES[c.level].name}</b> ${chip(c.status === 'active' ? 'Active' : 'Current (reinstatable)', c.status === 'active' ? 'good' : 'warn')}</p>
      ${kv([['Granted', `age ${c.grantedAge}`], ['Last investigation', `age ${c.lastInvestigationAge}`], ['Reinvestigation', `every ${CLEARANCES[c.level].reinvestYears} yrs`]])}
      ${c.concealed ? `<p class="why">⚠️ You concealed information on your ${vettingForm(currentCountry())}. Reinvestigations may uncover it.</p>` : ''}
      <h4 class="sub">What it's worth</h4>
      <ul class="history">
        <li>💵 <b>+${Math.round(CLEARANCE_PREMIUM[c.level] * 100)}%</b> pay in a cleared private-sector role${c.level === 'topSecret' ? ' (more with a polygraph)' : ''}${state.career.job?.cleared ? ' <span class="pos">· you\'re in one</span>' : ''}</li>
        <li>📞 Defense contractor recruiters call clearance holders in tech, cyber, engineering, analytics, logistics and security</li>
        <li>🦅 A hiring edge for any job that needs a clearance: agencies skip a year-long investigation</li>
        <li>⌛ ${c.status === 'active' ? 'Stays active while your job (or military service) needs it.' : `Lapses at age ${c.sinceAge + CLEARANCE_GRACE_YEARS + 1} unless you take a cleared job.`}</li>
      </ul>`
      : empty('No clearance. Cleared government jobs sponsor your investigation when they hire you, and large defense-adjacent employers can put you on a classified program.')}
    ${((sp) => (state.career.job && (sp.ok || sp.reason !== 'Your field has no classified work') && !state.career.job.cleared ? `<div class="action-grid">${button('🔐 Ask for a classified program', 'cleared.requestSponsorship', { hint: sp.ok ? 'Your employer sponsors the clearance' : sp.reason, disabled: !sp.ok })}</div>` : ''))(sponsorEligibility(state))}
    <h4 class="sub">What an investigator would find</h4>
    ${issues.length ? `<ul class="history">${issues.map((i) => `<li>⚠️ ${esc(i.label)}</li>`).join('')}</ul>` : '<p class="pos">A clean background.</p>'}
    <p class="fine">Disclosing problems mitigates them. Concealing them is ${currentCountry() === 'US' ? 'a federal crime (18 U.S.C. § 1001)' : 'a crime'} if discovered.</p>`, { icon: '🔐' });
  // A US clearance means nothing to a life abroad unless you already hold one.
  const showClearance = !abroad || Boolean(c);

  const fed = ps.federal;
  const gov = card('Government Climate', `
    ${meter(fed.stability, { label: abroad ? '🏛️ National political stability' : '🏛️ Federal political stability' })}
    ${fed.shutdown ? '<p class="why">🏚️ The federal government is shut down. Federal workers are furloughed.</p>' : ''}
    ${ps.city ? `<h4 class="sub">${esc(ps.city.name)}</h4>${meter(ps.city.approval, { label: '🗳️ Community approval' })}${meter(ps.city.fiscalHealth, { label: '💰 City fiscal health' })}` : '<p class="fine">Work for a city to track its budget and approval rating.</p>'}
    <p class="fine">Public employers' training budgets rise and fall with these numbers.</p>`, { icon: '🦅', accent: 'blue' });

  // International organisations recruit through their own competitions (world/IntlOrgs).
  const comps = Object.entries(COMPETITIONS).map(([id, c]) => {
    const s = state.intlOrgs?.competitions?.[id];
    const check = competitionCheck(state, id);
    if (!s?.passed && !check.ok && /citizens only|and under|From 21/.test(check.reason)) return '';
    return `<li class="exam-row">
      <div><b>${c.icon} ${c.name}</b><small>${esc(c.desc)}</small>${s?.passed ? '<small class="pos">Passed — on the reserve list: apply on the job board (International Organisations).</small>' : s?.sittings ? `<small>${s.sittings} sitting${s.sittings > 1 ? 's' : ''} so far</small>` : ''}${!s?.passed && !check.ok ? `<small class="why">${esc(check.reason)}</small>` : ''}</div>
      ${s?.passed ? '' : button('Sit it', 'intlOrgs.sit', { arg: id, variant: 'small', disabled: !check.ok, hint: check.ok ? `≈${Math.round(check.odds * 100)}% pass` : '' })}
    </li>`;
  }).join('');
  const intl = comps ? `<h4 class="sub">🌐 International organisations</h4><ul class="history">${comps}</ul>` : '';
  return `${card('Civil Service Exams', `<p class="muted">Public jobs hire from ranked eligibility lists. ${PASSING_SCORE}+ passes; higher scores rank higher. Scores last 4 years.</p><ul class="history">${exams}</ul>${intl}`, { icon: '📝', accent: 'cyan' })}${showClearance ? clearance : ''}${gov}`;
}
