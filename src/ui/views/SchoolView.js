/**
 * School tab: current enrollment, the program catalog (certificates, trade
 * diplomas, associate's, bachelor's, graduate/professional) with school,
 * major and pace selectors, and earned diplomas.
 */
import { esc, money, button, card, meter, kv, empty, select, disclosure } from '../Components.js';
import { getProfession, professionsFor } from '../../modules/career/JobTrees.js';
import { nationalProfessionId } from '../../modules/world/NationalAgencies.js';
import { ENTRANCE_EXAMS, TRADES, apprenticeshipHere, apprenticeEligibility, expectedScore } from '../../modules/world/SchoolPaths.js';
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
  // Abroad, the careers open here (national agencies stand in for US federal ones).
  const open = state.character.countryId ? new Set(professionsFor(state).map((x) => x.id)) : null;
  const localId = (f) => (!open || open.has(f) ? f : open.has(nationalProfessionId(state.character.countryId, f)) ? nationalProfessionId(state.character.countryId, f) : null);
  const fields = p.fields ? p.fields.map(localId).filter(Boolean) : [];
  const fieldsText = fields.length ? ` · Prepares for: ${fields.map((f) => getProfession(f)?.name ?? f).join(', ')}` : '';
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

/** Abroad: your university entrance exam score. */
function entranceCard(state) {
  const ent = state.education.entrance;
  const e = ENTRANCE_EXAMS[state.character.countryId];
  if (!e || (!ent && state.character.age < 15)) return '';
  if (!ent) return card(`The ${e.name}`, `<p class="muted">You sit it in your last school year (at 17). Universities admit on it${e.weight >= 0.9 ? ' almost entirely' : e.weight >= 0.6 ? ' heavily' : ' in part'}. Expected score now: about ${expectedScore(state)}/100.</p>`, { icon: '📝' });
  return card(`The ${e.name}`, `<p>Score <b>${ent.score}/100</b>${ent.sittings > 1 ? ` (best of ${ent.sittings} sittings)` : ''}. ${ent.score >= 80 ? 'Top universities are within reach.' : ent.score >= 60 ? 'Solid: most universities will take you.' : 'Low: selective universities are a long shot.'}</p>${ent.resitAt ? `<p class="fine">You can re-sit next year.</p>` : ''}`, { icon: '📝' });
}

/** Abroad: apprenticeships in the trades (Germany's dual system and its cousins). */
function apprenticeCard(state) {
  const sys = apprenticeshipHere(state);
  const a = state.apprenticeship;
  if (!sys || (state.character.age < 15 && !a)) return '';
  if (a) {
    const t = TRADES[a.trade];
    return card(sys.name, `<p>${t.icon} Trainee ${esc(t.name.toLowerCase())} with ${esc(a.employer)} · ${a.yearsLeft} yr to the ${esc(sys.exam)} · ${money(a.pay)}/yr</p><div class="toggle-row">${button('🚪 Quit', 'schoolPaths.quitApprenticeship', { variant: 'small ghost' })}</div>`, { icon: '🔧', accent: 'green' });
  }
  const check = apprenticeEligibility(state);
  const rows = Object.entries(TRADES).map(([id, t]) => button(`${t.icon} ${t.name}`, 'schoolPaths.apprentice', { arg: id, variant: 'tiny', disabled: !check.ok || Boolean(state.yearly['schoolPaths.apprentice']) })).join('');
  return card(sys.name, `<p class="muted">${sys.years} years of paid training (${money(sys.pay)}/yr) with an employer and a trade school, ending in the ${esc(sys.exam)}: a full trade qualification, no tuition.</p>${check.ok ? '' : `<p class="why">${esc(check.reason)}</p>`}<div class="toggle-row chips-row">${rows}</div>`, { icon: '🔧' });
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
  return `${k12View(state)}${current}${entranceCard(state)}${apprenticeCard(state)}${phdCard(state)}${state.academia?.phd ? publishingCard(state) : ''}${medTrainingCard(state)}${higherEdCard(state)}${academyCard(state)}${campusView(state)}
    ${kid ? card('College & Trade School', '<p class="muted">Colleges, trade schools and certificate programs open at 17. Your high-school GPA, activities and school will count.</p>', { icon: '🏛️' }) : card('Programs', `<p class="muted">Majors boost related careers but rarely lock you out — only real-world requirements (nursing → RN, engineering → PE, education → teaching license, pre-med → med school) are enforced. Earn as many degrees as you like. Your last GPA: ${lastGpa(state).toFixed(2)}.${giBillEligible(state) ? ' 🎖️ GI Bill eligible.' : ''}</p>${catalog}`, { icon: '🏫' })}
    ${card('Diplomas', `${degrees}${banked}`, { icon: '📜' })}`;
}
