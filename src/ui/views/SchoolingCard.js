/**
 * School tab: "Schooling in <year>" — the leaving age here, the exam at eleven, who got to
 * university, and evening classes for those who never learned to read (education/SchoolingOfTheDay.js).
 */
import { card, button, esc } from '../Components.js';
import { yearNow, PRESENT } from '../../modules/world/Eras.js';
import { leavingAgeHere, trackHere, womenAtUniversity, enrolment, nightSchoolOpen, nightSchoolName, NIGHT_SCHOOL } from '../../modules/education/SchoolingOfTheDay.js';

export function schoolingCard(state) {
  const y = yearNow(state);
  const s = state.schooling ?? {};
  const extra = nightSchoolOpen(state) || Boolean(s.nightSchool && !s.nightSchool.done) || Boolean(s.indenture);
  if (!state.era && !extra) return '';
  const late = !state.era || y >= PRESENT - 20;
  if (late && !(state.schoolDays?.exams ?? []).length && !extra) return '';
  const leave = leavingAgeHere(state);
  const t = trackHere(state);
  const lines = late ? [] : [
    leave ? `Most children leave school at ${leave} for work.` : 'Children stay at school into their late teens.',
    enrolment(state) < 0.8 ? `Perhaps ${Math.round((1 - enrolment(state)) * 10)} children in ten never go to school at all.` : '',
    t ? `At ${t.age}, an exam decides between the ${t.academic} (the road to university) and the ${t.general}.` : '',
    !womenAtUniversity(state) ? 'The universities don\'t admit women yet.' : '',
    y < 1945 ? 'University is for the well-off, and a few scholarship winners.' : '',
  ].filter(Boolean);
  const you = s.unschooled ? (s.literate ? 'You never went to school, but you learned to read at evening classes.' : 'You never went to school, and you can\'t read.') : s.track ? `You were at the ${s.track === 'academic' ? t?.academic ?? 'academic school' : t?.general ?? 'general school'}.` : '';
  const learn = s.literate === false && state.character.age >= 14 ? `<div class="toggle-row">${button('📖 Evening classes: learn to read', 'schooling.literacy', { variant: 'small', hint: '$150 · a year after work' })}</div>` : '';
  const ns = s.nightSchool;
  const night = ns && !ns.done ? `<p class="fine">🌙 At night school for ${esc(ns.name)}: ${ns.yearsLeft} year${ns.yearsLeft === 1 ? '' : 's'} to go.</p>`
    : nightSchoolOpen(state) ? `<div class="toggle-row">${button(`🌙 Night school: ${nightSchoolName(state)}`, 'schooling.nightSchool', { variant: 'small', hint: `$${NIGHT_SCHOOL.cost} a year · ${NIGHT_SCHOOL.years} years of evenings` })}</div>` : '';
  const ind = s.indenture ? `<p class="fine">🔨 Bound apprentice until you're ${s.indenture.until}.</p>` : '';
  const exams = (state.schoolDays?.exams ?? []).map((e) => `<li>${e.pass ? '🎓' : '📉'} ${esc(e.name[0].toUpperCase() + e.name.slice(1))} (${e.year}): ${e.pass ? 'passed' : 'not passed'}</li>`).join('');
  const record = exams ? `<h4 class="sub">Your school record</h4><ul class="history">${exams}</ul><p class="fine">Employers ask to see these when you have no degree.</p>` : '';
  return card(late ? 'Your School Record' : `Schooling in ${y}`, `${lines.length ? `<p>${esc(lines.join(' '))}</p>` : ''}${late ? '' : you ? `<p class="fine">${esc(you)}</p>` : ''}${record}${learn}${night}${ind}`, { icon: '📚' });
}
