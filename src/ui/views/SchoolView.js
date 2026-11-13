/**
 * School tab: current enrollment, the program catalog (certificates, trade
 * diplomas, associate's, bachelor's, graduate/professional) with school,
 * major and pace selectors, and earned diplomas.
 */
import { esc, money, button, card, meter, kv, empty, select, disclosure, chip } from '../Components.js';
import { getProfession, professionsFor } from '../../modules/career/JobTrees.js';
import { nationalProfessionId } from '../../modules/world/NationalAgencies.js';
import { ENTRANCE_EXAMS, TRADES, apprenticeshipHere, apprenticeEligibility, expectedScore } from '../../modules/world/SchoolPaths.js';
import { SCHOOLS, MAJORS, PROGRAMS, PROGRAM_GROUPS, majorsFor, degreeLabel } from '../../modules/education/Catalog.js';
import { campusView } from './CampusView.js';
import { k12View, academyCard } from './K12View.js';
import { enrollmentEligibility, admissionChance, annualTuition, giBillEligible, lastGpa, transferCredit, movesYou, applicationCap, applicationsThisCycle, APPLICATION_FEE } from '../../modules/education/EducationEngine.js';
import { universitiesFor, universityOf, universitiesIn, placeOf } from '../../modules/education/Universities.js';
import { phdCard } from './AcademiaView.js';
import { medTrainingCard } from './MedicalView.js';
import { lawTrainingCard } from './LawView.js';
import { higherEdCard, publishingCard } from './HigherEdView.js';
import { edEligibility } from '../../modules/academia/HigherEd.js';

/** Early Decision is open to first-time applicants who haven't used it. */
const edOpen = (state) => state.character.age >= 17 && !state.education.enrolled && state.higherEd && !state.higherEd.edUsed && edEligibility(state, 'state').reason !== 'For first-time college applicants' && state.education.degrees.some((d) => d.type === 'highschool');
import { COUNTRIES } from '../../modules/world/Countries.js';
import { uniInEra, majorInEra, programInEra, programIdInEra } from '../../modules/world/Eras.js';
import { flagImg } from '../Flags.js';
import { schoolingCard } from './SchoolingCard.js';


const STARS = ['', '★', '★★', '★★★'];
/** "★★★ University of Oxford (Oxford) 🚚": prestige, name, city, and whether you'd move. */
function uniLabel(state, u) {
  const here = state.character.countryId ?? 'US';
  const flag = u.country !== here ? `${COUNTRIES[u.country]?.flag ?? ''} ` : '';
  return `${flag}${STARS[u.prestige ?? 0] ? `${STARS[u.prestige]} ` : ''}${u.name}${u.region || u.offshore ? ` (${placeOf(u)})` : ' (online)'}${movesYou(state, u) ? ' 🚚' : ''}`;
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
  const list = universitiesIn(cc).filter((u) => ['elite', 'state', 'private', 'academy'].includes(u.type) && uniInEra(state, u)).sort((a, b) => (b.prestige ?? 0) - (a.prestige ?? 0) || a.accept - b.accept);
  const PRO = { med: 'Medicine', law: 'Law', dent: 'Dentistry', vet: 'Veterinary', pharm: 'Pharmacy', opt: 'Optometry', maritime: 'Maritime', phd: 'Doctoral research' };
  const rows = list.map((u) => `<li>${STARS[u.prestige ?? 0] || '·'} <b>${esc(u.name)}</b> <small>${esc(u.region || u.offshore ? placeOf(u) : 'online')} · ${u.accept >= 1 ? 'open admission' : `admits ${u.accept < 0.01 ? '<1' : Math.round(u.accept * 100)}%`}${u.pro?.length ? ` · ${u.pro.map((x) => PRO[x]).filter(Boolean).join(', ')}` : ''}${u.known?.length ? ` · known for ${u.known.filter((m) => majorInEra(state, m)).map((m) => MAJORS[m]?.name).filter(Boolean).slice(0, 3).join(', ')}` : ''}</small></li>`).join('');
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

export function schoolView(state, ui = {}) {
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
  const offered = (id) => programInEra(state, PROGRAMS[id].name) && programIdInEra(state, id) && enrollmentEligibility(state, id, PROGRAMS[id].schools[0], majorsFor(id)[0]).reason !== 'Not offered in this country' && universitiesFor(state, id).length > 0;
  const degrees = state.education.degrees.length
    ? `<ul class="history">${state.education.degrees.map((d) => `<li>🎓 <b>${esc(degreeLabel(d))}</b>${d.schoolName ? ` · <span data-raw>${esc(d.schoolName)}</span>${d.country && d.country !== (state.character.countryId ?? 'US') ? ` ${flagImg(d.country) || ''}` : ''}` : d.schoolId ? ` · ${esc(SCHOOLS[d.schoolId].name)}` : ''}${d.gpa ? ` <small>GPA ${d.gpa.toFixed(2)}${d.honors ? `, ${d.honors}` : ''}${d.honorsCollege ? ' · Honors College' : ''}</small>` : ''}</li>`).join('')}</ul>`
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
  return `${uniform}${schoolingCard(state)}${k12View(state)}${current}${entranceCard(state)}${svc ? '' : apprenticeCard(state)}${phdCard(state)}${state.academia?.phd ? publishingCard(state) : ''}${medTrainingCard(state)}${lawTrainingCard(state)}${higherEdCard(state)}${svc ? '' : academyCard(state)}${applicationsCard(state)}${campusView(state)}
    ${kid ? card('College & Trade School', '<p class="muted">Colleges, trade schools and certificate programs open at 17. Your high-school GPA, activities and school will count.</p>', { icon: '🏛️' }) : admissionsCard(state, ui, offered)}
    ${card('Diplomas', `${degrees}${banked}`, { icon: '📜' })}`;
}

const TAG = (p) => (p >= 0.75 ? ['🛟 Safety', 'good'] : p >= 0.4 ? ['🎯 Match', ''] : ['🚀 Reach', 'warn']);

/**
 * Admissions, planned: pick a programme (and major), see a suggested shortlist — a reach, matches,
 * a safety — with your odds at each and the chance of at least one offer, then send them together.
 */
function admissionsCard(state, ui, offered) {
  const ids = PROGRAM_GROUPS.flatMap((g) => g.ids.filter(offered));
  const pid = ids.includes(ui.admProgram) ? ui.admProgram : null;
  const lock = (id) => {
    const unis = universitiesFor(state, id);
    const m = majorsFor(id)[0];
    return !unis.some((u) => enrollmentEligibility(state, id, u.id, m, { applying: true }).ok);
  };
  const picker = `<label class="country-pick">Programme<select data-ui-set="admProgram" aria-label="Programme"><option value="">Choose a programme…</option>${PROGRAM_GROUPS.map((g) => { const gi = g.ids.filter(offered); return gi.length ? `<optgroup label="${esc(g.label)}">${gi.map((id) => `<option value="${id}"${id === pid ? ' selected' : ''}>${esc(PROGRAMS[id].name)}${lock(id) ? ' 🔒' : ''}</option>`).join('')}</optgroup>` : ''; }).join('')}</select></label>`;
  const intro = `<p class="muted">Majors boost related careers but rarely lock you out — only real-world requirements (nursing → RN, engineering → PE, education → teaching license, pre-med → med school) are enforced. Your last GPA: ${lastGpa(state).toFixed(2)}.${giBillEligible(state) ? ' 🎖️ GI Bill eligible.' : ''}</p>`;
  return card('Admissions', `${intro}${picker}${pid ? admissionsPlan(state, pid, ui) : ''}${state.character.age >= 15 ? guideCard(state) : ''}`, { icon: '🏫', summary: pid ? esc(PROGRAMS[pid].name) : '' });
}

function admissionsPlan(state, id, ui) {
  const p = PROGRAMS[id];
  const majors = majorsFor(id).filter((m) => m === null || (majorInEra(state, m) && programInEra(state, MAJORS[m]?.name)));
  const major = majors.includes(ui.admMajor) ? ui.admMajor : majors[0];
  const unis = universitiesFor(state, id).map((u) => ({ u, p: admissionChance(state, id, u.id), c: enrollmentEligibility(state, id, u.id, major, { applying: true }) })).filter((x) => x.c.ok || x.c.reason === 'Not offered there' ? x.c.ok : true);
  const ok = unis.filter((x) => x.c.ok);
  const credit = transferCredit(state, id).years;
  const facts = `<p class="fine">${p.years} yr full-time${credit ? ` (−${credit} yr transfer credit)` : ''}${p.stipend ? ` · funded + ${money(p.stipend)} stipend` : ''}${p.minGpa ? ` · GPA ${p.minGpa}+` : ''}${p.minSmarts ? ` · smarts ${p.minSmarts}+` : ''}</p>`;
  const majorPick = majors[0] !== null ? `<label class="country-pick">Major<select data-ui-set="admMajor" aria-label="Major">${majors.map((m) => `<option value="${m}"${m === major ? ' selected' : ''}>${MAJORS[m].icon} ${esc(MAJORS[m].name)}</option>`).join('')}</select></label>` : '';
  if (!ok.length) return `${facts}${majorPick}<p class="why">${esc(unis[0]?.c.reason ?? 'Not open to you yet')}</p>`;
  const label = (x) => `${uniLabel(state, x.u)} — ${Math.round(x.p * 100)}% · ${money(annualTuition(id, x.u.id, state))}/yr`;
  // Open admission: no shortlist, just enrol.
  if (ok.every((x) => x.p >= 1)) {
    return `${facts}${majorPick}<div class="enroll-form" data-collect-root><input type="hidden" data-part="program" value="${id}">${select('school', ok.map((x) => ({ value: x.u.id, label: label(x) })))}<input type="hidden" data-part="major" value="${major ?? ''}">${select('pace', [{ value: 'full', label: 'Full-time' }, { value: 'part', label: 'Part-time (½ speed)' }])}${button('🎓 Enrol', 'education.apply', { variant: 'small primary', collect: true })}</div><p class="fine">Open admission: no application needed.</p>`;
  }
  // The suggested shortlist: the best reach, the best matches, a safety — as many as you can still send.
  const left = Math.max(0, applicationCap(state, p.type === 'bachelor' ? 'bachelor' : p.type) - applicationsThisCycle(state));
  if (!left) return `${facts}${majorPick}<p class="why">You've sent all your applications for this year.</p>`;
  const byPrestige = [...ok].sort((a, b) => (b.u.prestige ?? 0) - (a.u.prestige ?? 0) || a.p - b.p);
  const pick = [];
  const take = (x) => { if (x && !pick.includes(x) && pick.length < left) pick.push(x); };
  take(byPrestige.find((x) => x.p < 0.4 && x.p >= 0.05));
  for (const x of byPrestige.filter((y) => y.p >= 0.4 && y.p < 0.75).slice(0, 2)) take(x);
  take([...ok].sort((a, b) => b.p - a.p || (b.u.prestige ?? 0) - (a.u.prestige ?? 0))[0]);
  // Then the best of the rest: good odds and a good name, at home before abroad; no long shots.
  const home = state.character.countryId ?? 'US';
  for (const x of ok.filter((y) => y.p >= 0.15).sort((a, b) => (a.u.country === home ? 0 : 1) - (b.u.country === home ? 0 : 1) || b.p * (1 + (b.u.prestige ?? 0)) - a.p * (1 + (a.u.prestige ?? 0)))) take(x);
  const slots = Math.min(left, 5);
  const options = (sel) => `<option value="">— none —</option>${ok.map((x) => `<option value="${x.u.id}"${x === sel ? ' selected' : ''}>${esc(label(x))}</option>`).join('')}`;
  const anyOffer = 1 - pick.slice(0, slots).reduce((q, x) => q * (1 - x.p), 1);
  const rows = pick.slice(0, slots).map((x) => `<li>${chip(TAG(x.p)[0], TAG(x.p)[1])} <b>${esc(x.u.name)}</b> <small class="muted">${Math.round(x.p * 100)}% · ${money(annualTuition(id, x.u.id, state))}/yr${movesYou(state, x.u) ? ' · 🚚 a move' : ''}</small></li>`).join('');
  const ed = id === 'bachelor' && edOpen(state) ? `<div class="enroll-form" data-collect-root><input type="hidden" data-part="program" value="${id}">${select('school', byPrestige.map((x) => ({ value: x.u.id, label: label(x) })), { value: pick[0]?.u.id ?? '' })}<input type="hidden" data-part="major" value="${major ?? ''}"><input type="hidden" data-part="pace" value="full">${button('💌 Apply Early Decision', 'higherEd.earlyDecision', { variant: 'small', collect: true, hint: 'Binding; better odds at that one school' })}</div>` : '';
  return `${facts}${majorPick}
    <h4 class="sub">Suggested shortlist</h4><ul class="plain">${rows}</ul>
    <p>Chance of at least one offer: <b>${Math.round(anyOffer * 100)}%</b> <small class="muted">(${left} application${left === 1 ? '' : 's'} left this year · ${money(APPLICATION_FEE)} each)</small></p>
    <div data-collect-root><input type="hidden" data-part="program" value="${id}"><input type="hidden" data-part="major" value="${major ?? ''}">
      <div class="enroll-form">${select('pace', [{ value: 'full', label: 'Full-time' }, { value: 'part', label: 'Part-time (½ speed)' }])}</div>
      ${Array.from({ length: slots }, (_, i) => `<label class="country-pick">Choice ${i + 1}<select data-part="u${i}" aria-label="Choice ${i + 1}">${options(pick[i])}</select></label>`).join('')}
      <div class="row-end">${button('✉️ Send applications', 'education.applyMany', { variant: 'small primary', collect: true, hint: 'Decisions come straight back' })}</div></div>
    ${ed}<p class="fine">Hold offers while you apply elsewhere; they stand until next year. Universities in another city mean moving there (🚚); abroad, a student visa.</p>`;
}
