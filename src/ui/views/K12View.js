/**
 * K-12 cards (School tab): your school and grade, changing schools,
 * extracurriculars, the GED, plus teen part-time jobs (also on the Work
 * tab) and the service-academy checklist.
 */
import { esc, money, button, card, kv, select } from '../Components.js';
import {
  cadetRank, SCHOOL_TYPES, ACTIVITIES, TEEN_JOBS, MAX_ACTIVITIES, gedFee, gradeLabel, inK12, hasDiploma, schoolAccess, teenJobPay,
} from '../../modules/education/K12.js';
import { MAJORS, majorsFor } from '../../modules/education/Catalog.js';
import { admissionChance, enrollmentEligibility } from '../../modules/education/EducationEngine.js';
import { hasFelony } from '../../core/State.js';

const PAYER = { free: 'Free', parents: 'Your parents pay', aid: 'Need-based scholarship', self: 'You pay' };

function schoolCard(state) {
  const k = state.k12;
  const age = state.character.age;
  const t = SCHOOL_TYPES[k.type];
  if (k.dropout) {
    return card('High School', `<p class="neg">You left high school without a diploma.</p>
      <div class="action-grid">${age < 18 ? button('🏫 Go back to school', 'k12.reenroll', { disabled: Boolean(state.yearly['k12.transfer']) }) : ''}${gedButton(state)}</div>`, { icon: '🏫', accent: 'red' });
  }
  return card(`${gradeLabel(age)} · ${t.name}`, `
    ${kv([
      ['School', `${t.icon} ${esc(t.name)}${t.tuition ? ` · ${money(t.tuition)}/yr (${PAYER[k.payer]})` : ''}`],
      ['High-school GPA', k.gpa != null ? `${k.gpa.toFixed(2)} after ${k.hsYears} year${k.hsYears === 1 ? '' : 's'}` : age < 14 ? 'Grades count from 9th grade (age 14)' : '—'],
      ['Standing', k.expelled ? '<span class="neg">Expelled once</span>' : k.suspensions ? `<span class="neg">${k.suspensions} suspension${k.suspensions > 1 ? 's' : ''}</span>` : 'Good standing'],
      k.resume ? ['Activities résumé', `${k.resume} pts`] : null,
    ])}
    <div class="action-grid">
      ${button('📖 Study hard', 'k12.study', { disabled: k.studied, hint: k.studied ? 'Done this year' : '+GPA, +Smarts, +Stress' })}
      ${age >= 11 ? button('🛹 Ditch class', 'k12.skip', { variant: 'ghost', disabled: k.skipped >= 2, hint: '+Happiness, −GPA · risk of suspension' }) : ''}
      ${age >= 16 ? button('🚪 Drop out', 'k12.dropOut', { variant: 'danger', hint: 'No diploma — GED later' }) : ''}
    </div>`, { icon: t.icon, accent: 'yellow' });
}

function gedButton(state) {
  const fee = gedFee(state);
  return button('📄 Take the GED', 'k12.ged', { disabled: Boolean(state.yearly['k12.ged']) || state.finances.cash < fee, hint: `${fee ? money(fee) : 'Free under 21'} · pass odds rise with smarts` });
}

function transferCard(state) {
  const rows = Object.entries(SCHOOL_TYPES).map(([id, t]) => {
    const a = schoolAccess(state, id);
    const current = state.k12.type === id;
    const right = current ? '<span class="chip on">Current</span>'
      : button(a.ok ? 'Apply' : 'Locked', 'k12.transfer', { arg: id, variant: a.ok ? 'tiny' : 'tiny ghost', disabled: !a.ok || Boolean(state.yearly['k12.transfer']), hint: a.ok ? (a.note ?? PAYER[a.payer]) : a.reason });
    return `<li class="fund-row"><span>${t.icon} <b>${esc(t.name)}</b> · ${t.tuition ? money(t.tuition) + '/yr' : 'free'}<br><small class="muted">${esc(t.desc)}${!a.ok && !current ? ` — ${esc(a.reason)}` : ''}</small></span>${right}</li>`;
  }).join('');
  return card('Change Schools', `<p class="muted">One move a year. Selective schools test you; charters hold a lottery; private tuition is paid by your family if they can afford it.</p><ul class="history">${rows}</ul>`, { icon: '🔁' });
}

function activitiesCard(state) {
  const k = state.k12;
  const age = state.character.age;
  const chips = Object.entries(ACTIVITIES).map(([id, a]) => button(`${a.icon} ${a.name}`, 'k12.toggleActivity', {
    arg: id, variant: k.activities.includes(id) ? 'tiny on' : 'tiny', disabled: age < a.minAge || (!k.activities.includes(id) && k.activities.length >= MAX_ACTIVITIES), hint: age < a.minAge ? `Ages ${a.minAge}+` : '',
  })).join('');
  const cadet = cadetRank(state);
  return card('Extracurriculars', `<p class="muted">Up to ${MAX_ACTIVITIES}. They build stats and a résumé that colleges and academy nominations notice.</p><div class="toggle-row chips-row">${chips}</div>${cadet.title ? `<p class="fine">🎖️ ${esc(cadet.program)}: <b>${esc(cadet.title)}</b>. Cadets get stronger academy nominations and ROTC scholarship odds, and enlist up to two grades higher.</p>` : ''}`, { icon: '🏅' });
}

/** Part-time jobs for ages 12–17 (shown on the School and Work tabs). */
export function teenJobsCard(state) {
  const age = state.character.age;
  const k = state.k12;
  if (!k || age < 12 || age >= 18 || state.legal.incarceration) return '';
  if (k.job) {
    const j = TEEN_JOBS[k.job.id];
    return card('Part-Time Job', `<p>${j.icon} <b>${esc(j.name)}</b> since age ${k.job.since} · ~${j.hours} hrs/week · ${money(teenJobPay(j))}/yr</p>
      <div class="toggle-row">${button('👋 Quit', 'k12.quitJob', { variant: 'small ghost' })}</div>`, { icon: '🧾' });
  }
  const rows = Object.entries(TEEN_JOBS).map(([id, j]) => {
    const why = age < j.minAge ? `Ages ${j.minAge}+` : j.minFitness && state.stats.fitness < j.minFitness ? `Fitness ${j.minFitness}+` : j.minSmarts && state.stats.smarts < j.minSmarts ? `Smarts ${j.minSmarts}+` : state.career.job ? 'You already have a job' : '';
    return `<li class="fund-row"><span>${j.icon} <b>${esc(j.name)}</b> · $${j.wage}/hr · ${j.hours} hrs/wk <small class="muted">≈${money(teenJobPay(j))}/yr</small></span>
      ${button(why || 'Apply', 'k12.takeJob', { arg: id, variant: 'tiny', disabled: Boolean(why) || Boolean(state.yearly['k12.job']) })}</li>`;
  }).join('');
  return card('Part-Time Jobs', `<p class="muted">Pocket money and work experience employers like. Long hours can drag your grades.</p><ul class="history">${rows}</ul>`, { icon: '🧾' });
}

/** Service academies: every requirement in one checklist, with the application. */
export function academyCard(state) {
  const age = state.character.age;
  if (age < 15 || age > 23 || state.education.enrolled || !state.campus) return '';
  if (state.education.degrees.some((d) => d.type === 'bachelor')) return '';
  const check = (ok, text) => `<li>${ok ? '✅' : '⬜'} ${text}</li>`;
  const nominated = state.campus.nomination;
  const steps = [
    check(age >= 17, 'Age 17–23 (apply senior year or later)'),
    check(hasDiploma(state), 'High-school diploma or GED'),
    check(nominated, `Congressional nomination ${nominated ? '' : '(apply from 16; JROTC, activities, GPA and military prep schools help)'}`),
    check(state.stats.fitness >= 55 && state.stats.health >= 50, `Candidate fitness assessment (fitness 55+, health 50+ — you: ${state.stats.fitness}/${state.stats.health})`),
    check(!hasFelony(state), 'Clean record'),
  ].join('');
  const eligible = enrollmentEligibility(state, 'bachelor', 'academy', majorsFor('bachelor')[0]);
  const odds = Math.round(admissionChance(state, 'bachelor', 'academy') * 100);
  const majors = majorsFor('bachelor').map((m) => ({ value: m, label: `${MAJORS[m].icon} ${MAJORS[m].name}` }));
  return card('Service Academies', `<p class="muted">West Point, Annapolis, the Air Force and Coast Guard academies: free tuition, a commission at graduation, then a 5-year service obligation.</p>
    <ul class="history checklist">${steps}</ul>
    <div class="toggle-row">${button(nominated ? '🏛️ Nominated' : '🏛️ Seek a nomination', 'campus.seekNomination', { variant: nominated ? 'small on' : 'small', disabled: nominated || age < 16 || Boolean(state.yearly['campus.nomination']), hint: age < 16 ? 'From age 16' : 'One try a year' })}</div>
    <div class="enroll-form" data-collect-root>
      <input type="hidden" data-part="program" value="bachelor"><input type="hidden" data-part="school" value="academy">
      ${select('major', majors)}<input type="hidden" data-part="pace" value="full">
      ${button(`Apply for an appointment${eligible.ok ? ` · ${odds}% odds` : ''}`, 'education.enroll', { variant: 'small primary', collect: true, disabled: !eligible.ok, hint: eligible.ok ? '' : eligible.reason })}
    </div>`, { icon: '⚓', accent: 'blue' });
}

/** Everything K-12 for the School tab (empty once you're out of school with a diploma). */
export function k12View(state) {
  const k = state.k12;
  const age = state.character.age;
  if (!k) return '';
  if (age < 5) return card('School', '<p class="muted">School starts at age 5.</p>', { icon: '🧸' });
  if (inK12(state) || (k.dropout && age < 18)) {
    return [schoolCard(state), k.dropout ? '' : activitiesCard(state), teenJobsCard(state), k.dropout ? '' : transferCard(state)].join('');
  }
  if (!hasDiploma(state) && age >= 16 && !state.legal.incarceration) {
    return card('No Diploma', `<p class="muted">Most colleges, the military and many jobs need a high-school diploma or a GED.</p><div class="action-grid">${gedButton(state)}</div>`, { icon: '📄', accent: 'red' });
  }
  return '';
}
