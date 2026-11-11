/**
 * The Vocation card: a career's courses, postings, awards, discipline and elite posts
 * (career/Vocations.js), on the Work tab.
 */
import { esc, button, card, kv } from '../Components.js';
import { packFor, vocationOf, peekVocation, courseOptions, courseCurrent, missingCourses, regulatorOf, nameOf } from '../../modules/career/Vocations.js';
import { getProfession } from '../../modules/career/JobTrees.js';
import { nextLevels } from '../../modules/career/Ladder.js';

/** A name as a list heading: no leading article, capitalised. */
const heading = (n) => { const t = String(n).replace(/^(a|an|the) /i, ''); return t.charAt(0).toUpperCase() + t.slice(1); };
const OUTCOME = { none: 'No case to answer', advice: 'Advice', warning: 'Formal warning', conditions: 'Conditions on practice', suspension: 'Suspended', erasure: 'Struck off' };

export function vocationCard(state) {
  const job = state.career?.job;
  const pack = packFor(state);
  if (!job || !pack) return '';
  const v = peekVocation(state, pack);
  const age = state.character.age;
  const profession = getProfession(job.professionId);
  // What the next rungs wait on.
  const next = nextLevels(profession, job.employer?.size ?? 'large', job.levelId);
  const needs = next.flatMap((l) => missingCourses(state, pack, l).map((c) => `${esc(nameOf(state, c))} <small class="muted">for ${esc(l.title)}</small>`));
  const courses = courseOptions(state, pack).map(({ course, reason, cost }) => {
    const current = courseCurrent(state, pack, course);
    const status = current ? `✅ ${course.renew ? `current until age ${v.courses[course.id] + course.renew}` : 'done'}` : '';
    return `<div class="row">${course.icon ?? '📘'} ${esc(heading(nameOf(state, course)))}${course.required?.length || course.gateGrade || course.gateMgmt ? ' <small class="muted">· required for promotion</small>' : ''} ${status}
      ${!current || (course.renew && age >= v.courses[course.id] + course.renew - 1) ? button(current ? 'Renew' : 'Take it', 'vocation.course', { arg: `${pack.id}:${course.id}`, variant: 'small', disabled: Boolean(reason), hint: reason ?? (cost ? `$${cost.toLocaleString()}` : 'Free') }) : ''}</div>`;
  }).join('');
  const postings = v.postings.map((p) => {
    const def = pack.postings.find((x) => x.id === p.id);
    return `${def?.icon ?? '🧳'} ${esc(heading(def ? nameOf(state, def) : p.id))} <small class="muted">(age ${p.age}${p.until > age ? ', now' : ''})</small>`;
  });
  const awards = v.awards.map((id) => {
    const a = pack.awards.find((x) => x.id === id);
    return `${a?.icon ?? '🏅'} ${esc(heading(a ? nameOf(state, a) : id))}`;
  });
  const reg = regulatorOf(state, pack);
  const record = v.record.map((r) => `${esc(pack.complaints.find((k) => k.id === r.id)?.short ?? r.id)}: ${OUTCOME[r.outcome]} <small class="muted">(age ${r.age})</small>`);
  return card(`${pack.name}: Training & Distinctions`, `${kv([
    needs.length ? ['Promotion waits on', needs.join('<br>')] : null,
    v.inCourse ? ['In training', `${esc(nameOf(state, pack.courses.find((c) => c.id === v.inCourse.id)))} · done at ${v.inCourse.until}`] : null,
    v.elite ? ['Appointment', `🏛️ ${esc(v.elite.name)}${v.elite.until < 999 ? ` <small class="muted">until ${v.elite.until}</small>` : ''}`] : null,
    ['Postings', postings.length ? postings.join('<br>') : '<span class="muted">None yet: offers come with seniority</span>'],
    ['Awards', awards.length ? awards.join('<br>') : '<span class="muted">None yet</span>'],
    reg ? ['Regulator', `${esc(reg.name.replace(/^the /, 'The '))}${v.conditionsUntil > age ? ` · <span class="neg">conditions until ${v.conditionsUntil}</span>` : ''}`] : ['Regulator', '<span class="muted">No professional regulator yet</span>'],
    record.length ? ['Record', record.join('<br>')] : null,
  ].filter(Boolean))}${courses ? `<h4 class="sub">Courses & examinations</h4>${courses}` : ''}`, { icon: '🎓' });
}
