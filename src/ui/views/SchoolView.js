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
import { enrollmentEligibility, admissionChance, annualTuition, giBillEligible, lastGpa, transferCredit, movesYou, applicationCap, applicationsThisCycle } from '../../modules/education/EducationEngine.js';
import { universitiesFor, universityOf, universitiesIn, placeOf } from '../../modules/education/Universities.js';
import { phdCard } from './AcademiaView.js';
import { medTrainingCard } from './MedicalView.js';
import { lawTrainingCard } from './LawView.js';
import { higherEdCard, publishingCard } from './HigherEdView.js';
import { edEligibility } from '../../modules/academia/HigherEd.js';

/** Early Decision is open to first-time applicants who haven't used it. */
const edOpen = (state) => state.character.age >= 17 && !state.education.enrolled && state.higherEd && !state.higherEd.edUsed && edEligibility(state, 'state').reason !== 'For first-time college applicants' && state.education.degrees.some((d) => d.type === 'highschool');
import { COUNTRIES } from '../../modules/world/Countries.js';

function programRow(state, id) {
  const p = PROGRAMS[id];
  const majors = majorsFor(id);
  const probeMajor = majors[0];
  const unis = universitiesFor(state, id);
  const probeSchool = unis.find((u) => enrollmentEligibility(state, id, u.id, probeMajor, { applying: true }).ok)?.id ?? unis[0]?.id ?? p.schools[0];
  const check = enrollmentEligibility(state, id, probeSchool, probeMajor, { applying: true });
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
      ${select('school', unis.map((u) => ({ value: u.id, label: `${uniLabel(state, u)} — ${money(annualTuition(id, u.id, state))}/yr · ${Math.round(admissionChance(state, id, u.id) * 100)}% odds` })))}
      ${majors[0] !== null ? select('major', majors.map((m) => ({ value: m, label: `${MAJORS[m].icon} ${MAJORS[m].name}` }))) : '<input type="hidden" data-part="major" value="">'}
      ${select('pace', [{ value: 'full', label: 'Full-time' }, { value: 'part', label: 'Part-time (½ speed)' }])}
      ${button('Apply', 'education.apply', { variant: 'small primary', collect: true, disabled: blocking })}
      ${id === 'bachelor' && edOpen(state) ? button('💌 Early Decision', 'higherEd.earlyDecision', { variant: 'small', collect: true, disabled: blocking, hint: 'Binding; better odds — the school and major you picked' }) : ''}
    </div>
  </li>`;
}

const STARS = ['', '★', '★★', '★★★'];
/** "★★★ University of Oxford (Oxford) 🚚": prestige, name, city, and whether you'd move. */
function uniLabel(state, u) {
  const here = state.character.countryId ?? 'US';
  const flag = u.country !== here ? `${COUNTRIES[u.country]?.flag ?? ''} ` : '';
  return `${flag}${STARS[u.prestige ?? 0] ? `${STARS[u.prestige]} ` : ''}${u.name}${u.region ? ` (${placeOf(u)})` : ' (online)'}${movesYou(state, u) ? ' 🚚' : ''}`;
}

/** This year's applications: offers to take up (or held), and the rejections. */
function applicationsCard(state) {
  const apps = state.education.applications ?? [];
  if (!apps.length) return '';
  const rows = apps.map((a, i) => {
    const u = universityOf(a.universityId);
    const status = a.accepted ? '✅ accepted — you start when you finish where you are' : a.result === 'offer' ? '📬 offer' : a.result === 'rejected' ? '📭 rejected' : a.result === 'declined' ? 'declined' : `${Math.round(admissionChance(state, a.programId, a.universityId) * 100)}% odds`;
    return `<li class="fund-row"><span>✉️ <b>${esc(u?.name ?? a.universityId)}</b> <small>${esc(degreeLabel({ programId: a.programId, major: a.major, type: PROGRAMS[a.programId].type }))} · ${status}</small></span>${a.result === 'offer' && !a.accepted ? button('🎓 Accept', 'education.acceptOffer', { arg: String(i), variant: 'tiny' }) : !a.result ? button('Withdraw', 'education.withdrawApplication', { arg: String(i), variant: 'tiny ghost' }) : ''}</li>`;
  }).join('');
  return card('Applications', `<ul class="funds">${rows}</ul><p class="fine">Decisions come straight back. Hold offers while you apply elsewhere; they stand until next year. ${applicationsThisCycle(state)} sent this year (up to ${applicationCap(state, 'bachelor')}). Universities in another city mean moving there (🚚); abroad, a student visa.</p>`, { icon: '✉️', accent: 'cyan' });
}

/** The universities where you live: selectivity, prestige, city and professional schools. */
function guideCard(state) {
  const cc = state.character.countryId ?? 'US';
  const list = universitiesIn(cc).filter((u) => ['elite', 'state', 'private', 'academy'].includes(u.type)).sort((a, b) => (b.prestige ?? 0) - (a.prestige ?? 0) || a.accept - b.accept);
  const PRO = { med: 'Medicine', law: 'Law', dent: 'Dentistry', vet: 'Veterinary', pharm: 'Pharmacy', opt: 'Optometry', maritime: 'Maritime', phd: 'Doctoral research' };
  const rows = list.map((u) => `<li>${STARS[u.prestige ?? 0] || '·'} <b>${esc(u.name)}</b> <small>${esc(u.region ? placeOf(u) : 'online')} · ${u.accept >= 1 ? 'open admission' : `admits ${u.accept < 0.01 ? '<1' : Math.round(u.accept * 100)}%`}${u.pro?.length ? ` · ${u.pro.map((x) => PRO[x]).filter(Boolean).join(', ')}` : ''}${u.known?.length ? ` · known for ${u.known.map((m) => MAJORS[m]?.name).filter(Boolean).slice(0, 3).join(', ')}` : ''}</small></li>`).join('');
  return disclosure('universities.guide', `University guide — ${COUNTRIES[cc]?.name ?? cc}`, `<ul class="history">${rows}</ul>`, { count: list.length });
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

/** A sovereign is educated by tutors, not admissions officers. */
function royalEducationCard(state) {
  const done = Boolean(state.yearly['royalLife.tutor']);
  return card('A Sovereign\'s Education', `<p class="muted">The throne doesn't sit exams. Constitutional historians, ambassadors and the cabinet secretary come to you: the constitution, the realms, languages, the armed forces you head.</p>
    <div class="toggle-row">${button('📚 A season with your tutors', 'royalLife.tutor', { variant: 'small', disabled: done, hint: done ? 'Done this year' : 'Once a year' })}</div>`, { icon: '👑', accent: 'yellow' });
}

export function schoolView(state) {
  // A reigning monarch: school as a child, then tutors; no applications, apprenticeships or academies.
  if (state.royal?.reigning && !state.royal.abdicated) {
    const diplomas = state.education.degrees.length ? `<ul class="history">${state.education.degrees.map((d) => `<li>🎓 <b>${esc(degreeLabel(d))}</b></li>`).join('')}</ul>` : empty('No diplomas yet.');
    return `${state.character.age < 18 ? k12View(state) : ''}${royalEducationCard(state)}${card('Diplomas', diplomas, { icon: '📜' })}`;
  }
  const e = state.education.enrolled;
  let current = '';
  if (e) {
    const p = PROGRAMS[e.programId];
    current = card(degreeLabel({ programId: e.programId, major: e.major, type: p.type }), `
      <p class="muted">${SCHOOLS[e.schoolId].icon} ${esc(universityOf(e.universityId)?.name ?? SCHOOLS[e.schoolId].name)}${universityOf(e.universityId)?.region ? ` · ${esc(placeOf(universityOf(e.universityId)))}` : ''} · ${e.pace === 'part' ? 'Part-time' : 'Full-time'}</p>
      ${e.totalYears >= 99 ? '' : meter(e.progress, { max: e.totalYears, label: 'Progress', suffix: ` / ${e.totalYears} yrs`, tone: 'good' })}
      ${kv([['GPA', e.yearsAttended ? e.gpa.toFixed(2) : '—'], ['Tuition', `${money(annualTuition(e.programId, e.universityId ?? e.schoolId, state))}/yr`], ['Funding', [giBillEligible(state) && 'GI Bill', state.career.job?.employer.benefits.tuition && 'Employer tuition assistance', SCHOOLS[e.schoolId].needBasedAid && 'Need-based aid'].filter(Boolean).join(', ') || 'Student loans']])}
      <div class="action-grid">${button('📖 Study Hard', 'education.study', { hint: '+GPA, +Stress' })}${button(e.pace === 'part' ? '⏩ Go full-time' : '⏸️ Go part-time', 'education.switchPace')}${button('🚪 Drop Out', 'education.dropOut', { variant: 'danger' })}</div>`, { icon: '🏛️', accent: 'yellow' });
  }
  // Abroad, programmes the country doesn't have (a two-year associate's in Germany) aren't listed.
  const offered = (id) => enrollmentEligibility(state, id, PROGRAMS[id].schools[0], majorsFor(id)[0]).reason !== 'Not offered in this country' && universitiesFor(state, id).length > 0;
  const catalog = PROGRAM_GROUPS.map((g) => ({ ...g, ids: g.ids.filter(offered) })).filter((g) => g.ids.length).map((g) => disclosure(`programs.${g.label}`, g.label, `<ul class="programs">${g.ids.map((id) => programRow(state, id)).join('')}</ul>`, { count: g.ids.length })).join('');
  const degrees = state.education.degrees.length
    ? `<ul class="history">${state.education.degrees.map((d) => `<li>🎓 <b>${esc(degreeLabel(d))}</b>${d.schoolName ? ` · <span data-raw>${esc(d.schoolName)}</span>${d.country && d.country !== (state.character.countryId ?? 'US') ? ` ${COUNTRIES[d.country]?.flag ?? ''}` : ''}` : d.schoolId ? ` · ${esc(SCHOOLS[d.schoolId].name)}` : ''}${d.gpa ? ` <small>GPA ${d.gpa.toFixed(2)}${d.honors ? `, ${d.honors}` : ''}${d.honorsCollege ? ' · Honors College' : ''}</small>` : ''}</li>`).join('')}</ul>`
    : empty('No diplomas yet.');
  const credits = state.education.credits ?? [];
  const banked = credits.length ? `<h4 class="sub">Transfer credit</h4><ul class="history">${credits.map((c) => `<li>📑 ${c.years} yr toward ${esc(PROGRAMS[c.programId].name)} <small>from age ${c.age}${state.character.age - c.age > 10 ? ' · older than 10 yrs, counts half' : ''}</small></li>`).join('')}</ul>` : '';
  const kid = state.character.age < 17 && !state.education.degrees.length;
  // In uniform: officer cadets are at their academy; serving members study through the forces.
  const svc = state.military?.service;
  const uniform = svc ? card(svc.cadet ? 'Officer Cadet' : 'Studying in Uniform', svc.cadet
    ? `<p>🎖️ You are an officer cadet at <b>${esc(svc.academy?.name ?? 'the military academy')}</b>${svc.academy?.yearsLeft ? ` — ${svc.academy.yearsLeft} year${svc.academy.yearsLeft === 1 ? '' : 's'} to commissioning` : ''}. Civilian applications and apprenticeships wait until you leave the forces; the academy is your education now.</p>`
    : '<p class="fine">While serving, civilian study is part-time through the forces\' tuition assistance; apprenticeships and the academies are for civilians.</p>', { icon: '🎖️', accent: 'green' }) : '';
  if (svc?.cadet) return `${uniform}${card('Diplomas', `${degrees}${banked}`, { icon: '📜' })}`;
  return `${uniform}${k12View(state)}${current}${entranceCard(state)}${svc ? '' : apprenticeCard(state)}${phdCard(state)}${state.academia?.phd ? publishingCard(state) : ''}${medTrainingCard(state)}${lawTrainingCard(state)}${higherEdCard(state)}${svc ? '' : academyCard(state)}${applicationsCard(state)}${campusView(state)}
    ${kid ? card('College & Trade School', '<p class="muted">Colleges, trade schools and certificate programs open at 17. Your high-school GPA, activities and school will count.</p>', { icon: '🏛️' }) : card('Programs', `<p class="muted">Majors boost related careers but rarely lock you out — only real-world requirements (nursing → RN, engineering → PE, education → teaching license, pre-med → med school) are enforced. Earn as many degrees as you like. Your last GPA: ${lastGpa(state).toFixed(2)}.${giBillEligible(state) ? ' 🎖️ GI Bill eligible.' : ''}</p>${catalog}`, { icon: '🏫' })}
    ${state.character.age >= 15 ? card('Universities', guideCard(state), { icon: '🏛️' }) : ''}
    ${card('Diplomas', `${degrees}${banked}`, { icon: '📜' })}`;
}
