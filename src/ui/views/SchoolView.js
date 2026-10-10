/**
 * School tab: current enrollment, the program catalog (certificates, trade
 * diplomas, associate's, bachelor's, graduate/professional) with school,
 * major and pace selectors, and earned diplomas.
 */
import { esc, money, button, card, meter, kv, empty, select, disclosure } from '../Components.js';
import { getProfession } from '../../modules/career/JobTrees.js';
import { SCHOOLS, MAJORS, PROGRAMS, PROGRAM_GROUPS, majorsFor, degreeLabel } from '../../modules/education/Catalog.js';
import { campusView } from './CampusView.js';
import { k12View, academyCard } from './K12View.js';
import { enrollmentEligibility, admissionChance, annualTuition, giBillEligible, lastGpa, transferCredit } from '../../modules/education/EducationEngine.js';
import { phdCard } from './AcademiaView.js';
import { medTrainingCard } from './MedicalView.js';
import { higherEdCard, publishingCard } from './HigherEdView.js';

function programRow(state, id) {
  const p = PROGRAMS[id];
  const majors = majorsFor(id);
  const probeMajor = majors[0];
  const probeSchool = p.schools[0];
  const check = enrollmentEligibility(state, id, probeSchool, probeMajor);
  const blocking = !check.ok && !['Not offered there'].includes(check.reason);
  const fieldsText = p.fields ? ` · Prepares for: ${p.fields.map((f) => getProfession(f)?.name ?? f).join(', ')}` : '';
  const credit = transferCredit(state, id).years;
  return `<li class="program ${blocking ? 'locked' : ''}" data-collect-root>
    <div><b>${esc(p.name)}</b><small>${p.years} yr full-time${credit ? ` (−${credit} yr transfer credit)` : ''}${p.stipend ? ` · funded + ${money(p.stipend)} stipend` : ''}${p.minGpa ? ` · GPA ${p.minGpa}+` : ''}${p.minSmarts ? ` · smarts ${p.minSmarts}+` : ''}${esc(fieldsText)}</small>
      ${blocking ? `<small class="why">${esc(check.reason)}</small>` : ''}</div>
    <div class="enroll-form">
      <input type="hidden" data-part="program" value="${id}">
      ${select('school', p.schools.map((s) => ({ value: s, label: `${SCHOOLS[s].icon} ${SCHOOLS[s].name} — ${money(annualTuition(id, s, state))}/yr · ${Math.round(admissionChance(state, id, s) * 100)}% admit` })))}
      ${majors[0] !== null ? select('major', majors.map((m) => ({ value: m, label: `${MAJORS[m].icon} ${MAJORS[m].name}` }))) : '<input type="hidden" data-part="major" value="">'}
      ${select('pace', [{ value: 'full', label: 'Full-time' }, { value: 'part', label: 'Part-time (½ speed)' }])}
      ${button('Apply', 'education.enroll', { variant: 'small primary', collect: true, disabled: blocking })}
    </div>
  </li>`;
}

export function schoolView(state) {
  const e = state.education.enrolled;
  let current = '';
  if (e) {
    const p = PROGRAMS[e.programId];
    current = card(degreeLabel({ programId: e.programId, major: e.major, type: p.type }), `
      <p class="muted">${SCHOOLS[e.schoolId].icon} ${esc(SCHOOLS[e.schoolId].name)} · ${e.pace === 'part' ? 'Part-time' : 'Full-time'}</p>
      ${e.totalYears >= 99 ? '' : meter(e.progress, { max: e.totalYears, label: 'Progress', suffix: ` / ${e.totalYears} yrs`, tone: 'good' })}
      ${kv([['GPA', e.yearsAttended ? e.gpa.toFixed(2) : '—'], ['Tuition', `${money(annualTuition(e.programId, e.schoolId, state))}/yr`], ['Funding', [giBillEligible(state) && 'GI Bill', state.career.job?.employer.benefits.tuition && 'Employer tuition assistance', SCHOOLS[e.schoolId].needBasedAid && 'Need-based aid'].filter(Boolean).join(', ') || 'Student loans']])}
      <div class="action-grid">${button('📖 Study Hard', 'education.study', { hint: '+GPA, +Stress' })}${button(e.pace === 'part' ? '⏩ Go full-time' : '⏸️ Go part-time', 'education.switchPace')}${button('🚪 Drop Out', 'education.dropOut', { variant: 'danger' })}</div>`, { icon: '🏛️', accent: 'yellow' });
  }
  const catalog = PROGRAM_GROUPS.map((g) => disclosure(`programs.${g.label}`, g.label, `<ul class="programs">${g.ids.map((id) => programRow(state, id)).join('')}</ul>`, { count: g.ids.length })).join('');
  const degrees = state.education.degrees.length
    ? `<ul class="history">${state.education.degrees.map((d) => `<li>🎓 <b>${esc(degreeLabel(d))}</b>${d.schoolId ? ` · ${esc(SCHOOLS[d.schoolId].name)}` : ''}${d.gpa ? ` <small>GPA ${d.gpa.toFixed(2)}${d.honors ? `, ${d.honors}` : ''}${d.honorsCollege ? ' · Honors College' : ''}</small>` : ''}</li>`).join('')}</ul>`
    : empty('No diplomas yet.');
  const credits = state.education.credits ?? [];
  const banked = credits.length ? `<h4 class="sub">Transfer credit</h4><ul class="history">${credits.map((c) => `<li>📑 ${c.years} yr toward ${esc(PROGRAMS[c.programId].name)} <small>from age ${c.age}${state.character.age - c.age > 10 ? ' · older than 10 yrs, counts half' : ''}</small></li>`).join('')}</ul>` : '';
  const kid = state.character.age < 17 && !state.education.degrees.length;
  return `${k12View(state)}${current}${phdCard(state)}${state.academia?.phd ? publishingCard(state) : ''}${medTrainingCard(state)}${higherEdCard(state)}${academyCard(state)}${campusView(state)}
    ${kid ? card('College & Trade School', '<p class="muted">Colleges, trade schools and certificate programs open at 17. Your high-school GPA, activities and school will count.</p>', { icon: '🏛️' }) : card('Programs', `<p class="muted">Majors boost related careers but rarely lock you out — only real-world requirements (nursing → RN, engineering → PE, education → teaching license, pre-med → med school) are enforced. Earn as many degrees as you like. Your last GPA: ${lastGpa(state).toFixed(2)}.${giBillEligible(state) ? ' 🎖️ GI Bill eligible.' : ''}</p>${catalog}`, { icon: '🏫' })}
    ${card('Diplomas', `${degrees}${banked}`, { icon: '📜' })}`;
}
