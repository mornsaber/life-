/**
 * School tab: "Schooling in <year>" — the leaving age here, the exam at eleven, who got to
 * university, and evening classes for those who never learned to read (education/SchoolingOfTheDay.js).
 */
import { card, button, esc } from '../Components.js';
import { yearNow, PRESENT } from '../../modules/world/Eras.js';
import { leavingAgeHere, trackHere, womenAtUniversity, enrolment } from '../../modules/education/SchoolingOfTheDay.js';

export function schoolingCard(state) {
  const y = yearNow(state);
  if (!state.era || y >= PRESENT - 20) return '';
  const s = state.schooling ?? {};
  const leave = leavingAgeHere(state);
  const t = trackHere(state);
  const lines = [
    leave ? `Most children leave school at ${leave} for work.` : 'Children stay at school into their late teens.',
    enrolment(state) < 0.8 ? `Perhaps ${Math.round((1 - enrolment(state)) * 10)} children in ten never go to school at all.` : '',
    t ? `At ${t.age}, an exam decides between the ${t.academic} (the road to university) and the ${t.general}.` : '',
    !womenAtUniversity(state) ? 'The universities don\'t admit women yet.' : '',
    y < 1945 ? 'University is for the well-off, and a few scholarship winners.' : '',
  ].filter(Boolean);
  const you = s.unschooled ? (s.literate ? 'You never went to school, but you learned to read at evening classes.' : 'You never went to school, and you can\'t read.') : s.track ? `You were at the ${s.track === 'academic' ? t?.academic ?? 'academic school' : t?.general ?? 'general school'}.` : '';
  const learn = s.literate === false && state.character.age >= 14 ? `<div class="toggle-row">${button('📖 Evening classes: learn to read', 'schooling.literacy', { variant: 'small', hint: '$150 · a year after work' })}</div>` : '';
  return card(`Schooling in ${y}`, `<p>${esc(lines.join(' '))}</p>${you ? `<p class="fine">${esc(you)}</p>` : ''}${learn}`, { icon: '📚' });
}
