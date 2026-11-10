/**
 * Your week (Activities), your skills (School) and your routine (Health).
 */
import { esc, button, card, chip, meter, kv } from '../Components.js';
import { BUCKETS, timeOf, freeHours, usedHours, fixedHours } from '../../modules/life/TimeBudget.js';
import { SKILLS, skillsOf, jobSkills, skillInEra } from '../../modules/life/Skills.js';
import { SLEEP, HABITS, routineOf, physicalWorkBarred } from '../../modules/health/Routine.js';

export function weekCard(state) {
  if (state.character.age < 14) return '';
  const t = timeOf(state);
  const free = freeHours(state);
  const left = free - usedHours(state);
  const rows = Object.entries(BUCKETS).map(([id, b]) => `<li class="region-row"><span>${b.icon} <b>${b.label}</b> <small>${esc(b.hint)}</small></span>
    <span>${button('−', 'time.adjust', { arg: `${id}:-`, variant: 'tiny', disabled: !t.buckets[id] })} <b>${t.buckets[id]}h</b> ${button('+', 'time.adjust', { arg: `${id}:+`, variant: 'tiny', disabled: left < 2 })}</span></li>`).join('');
  const studying = t.study && SKILLS[t.study] ? `${SKILLS[t.study].icon} ${SKILLS[t.study].label}` : 'nothing yet — pick a skill on the School tab';
  return card('Your Week', `${kv([['Fixed', `${fixedHours(state)}h (sleep, ${state.career.job ? 'work' : 'school'}, chores)`], ['Free hours', `${free}h · ${left}h unplanned`], ['Learning', studying]])}
    <ul class="history">${rows}</ul>${meter(t.burnout, { label: '🔥 Burnout', tone: t.burnout >= 70 ? 'bad' : t.burnout >= 40 ? 'mid' : 'good' })}
    <p class="fine">Hours per week, every week of the year. Long working weeks (job + extra work + side hustle over 50h) build burnout; exercise and rest bring it down.</p>`, { icon: '🗓️', summary: `${left}h free` });
}

export function skillsCard(state) {
  if (state.character.age < 6) return '';
  const s = skillsOf(state);
  const t = timeOf(state);
  const job = state.career.job ? jobSkills(state.career.job.professionId) : [];
  const known = Object.entries(s).filter(([, v]) => v >= 1).sort((a, b) => b[1] - a[1]);
  const rows = known.map(([id, v]) => meter(Math.round(v), { label: `${SKILLS[id].icon} ${SKILLS[id].label}${job.includes(id) ? ' · used at work' : ''}`, tone: v >= 70 ? 'good' : v >= 35 ? 'mid' : 'bad' })).join('');
  const pick = Object.entries(SKILLS).filter(([id]) => skillInEra(state, id) || (state.skills?.[id] ?? 0) > 0).map(([id, k]) => button(`${k.icon} ${k.label}`, 'time.study', { arg: id, variant: t.study === id ? 'tiny on' : 'tiny' })).join('');
  return card('Skills', `${rows || '<p class="muted">You\'ll pick up skills from work, hobbies and the hours you spend learning.</p>'}
    <h4 class="sub">Spend your learning hours on</h4><div class="toggle-row chips-row">${pick}</div>
    <p class="fine">Employers hire for the skills a job needs, and life tests them now and then. Skills you stop using fade slowly.</p>`, { icon: '🧰', summary: known.length ? `${known.length} skills` : '' });
}

export function routineCard(state) {
  if (!state.health) return '';
  const r = routineOf(state);
  const sleep = Object.entries(SLEEP).map(([id, label]) => button(label, 'routine.sleep', { arg: id, variant: r.sleep === id ? 'small on' : 'small' })).join('');
  const m = r.months ?? [];
  const spark = m.length ? `<div class="spark" aria-label="Health over the last 12 months">${m.map((v) => `<span style="display:inline-block;width:7%;height:${Math.max(4, Math.round(v / 2.5))}px;margin-right:1%;background:var(--green);vertical-align:bottom;border-radius:2px"></span>`).join('')}</div><p class="fine">Health over the last 12 months.</p>` : '';
  const habits = Object.entries(HABITS).filter(([id]) => (r.habits?.[id] ?? 0) >= 20).map(([id, h]) => meter(r.habits[id], { label: `${h.icon} ${h.label}${r.habits[id] >= 70 ? ' — dependent' : ''}`, tone: r.habits[id] >= 70 ? 'bad' : r.habits[id] >= 45 ? 'mid' : 'good' })).join('');
  return card('Routine', `${spark}<h4 class="sub">Sleep</h4><div class="toggle-row">${sleep}</div>${habits ? `<h4 class="sub">Habits</h4>${habits}` : ''}${physicalWorkBarred(state) ? `<p>${chip('♿ Physical work ruled out', 'warn')}</p>` : ''}`, { icon: '🛌' });
}
