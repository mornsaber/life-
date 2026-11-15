/**
 * Your year at work (career/CareerPlay.js): how ready you are for the next rung and what it
 * brings, your record, burnout, the year's plan, the job's own actions with their odds, and
 * the milestones you've reached.
 */
import { button, card, esc, meter } from '../Components.js';
import { yearlyCount } from '../../core/State.js';
import { WORK_PLANS, planOf, shiftActions, shiftOdds, SHIFTS_PER_YEAR, readiness, nextPerk, MILESTONES } from '../../modules/career/CareerPlay.js';

export function careerPlayCard(state) {
  const job = state.career?.job;
  if (!job) return '';
  const r = readiness(state);
  const next = nextPerk(state, job);
  const used = yearlyCount(state, 'careerPlay.shift');
  const plan = planOf(state);
  const ladder = next
    ? `<p><b>Next: ${esc(next.level.title)}</b>${next.perks.length ? ` · brings ${next.perks.map(esc).join(', ')}` : ''}</p>
       <div class="stat-line"><span>Ready for promotion</span>${meter(r.score, { tone: r.score >= 75 ? 'good' : r.score >= 45 ? 'warn' : 'bad' })}</div>
       <p class="fine">${r.eligible ? '✅ You can ask for it now (Workplace).' : `⏳ ${esc(r.reason ?? '')}`}${r.tips.length ? ` · To get there: ${r.tips.map(esc).join('; ')}.` : ''}</p>`
    : `<p class="fine">🏔️ You're at the top of this ladder.${r.reason ? ` ${esc(r.reason)}` : ''}</p>`;
  const record = `<div class="stat-line"><span>📈 Performance</span>${meter(job.performance ?? 55)}</div>
    <div class="stat-line"><span>🧑‍💼 Your boss</span>${meter(job.boss ?? 50)}</div>
    <div class="stat-line"><span>🧑‍🤝‍🧑 Colleagues</span>${meter(job.coworkers ?? 55)}</div>
    <div class="stat-line"><span>🪫 Burnout</span>${meter(job.burnout ?? 0, { tone: (job.burnout ?? 0) >= 60 ? 'bad' : (job.burnout ?? 0) >= 35 ? 'warn' : 'good' })}</div>`;
  const plans = Object.entries(WORK_PLANS).map(([id, p]) => button(`${p.icon} ${p.label}`, 'careerPlay.plan', { arg: id, variant: id === plan ? 'small on' : 'small ghost', hint: p.hint, disabled: id === plan })).join('');
  const actions = shiftActions(job).map((a) => {
    const done = Boolean(yearlyCount(state, `careerPlay.shift.${a.id}`));
    return button(`${a.icon} ${a.label}`, 'careerPlay.shift', { arg: a.id, variant: 'small', disabled: done || used >= SHIFTS_PER_YEAR, hint: done ? 'Done this year' : `${Math.round(shiftOdds(state, a) * 100)}% to go well · uses your ${a.skill.replace(/([A-Z])/g, ' $1').toLowerCase()}` });
  }).join('');
  const reached = Object.entries(state.career.milestones ?? {}).map(([id, age]) => MILESTONES[id] ? `<span class="chip" title="Age ${age}">${MILESTONES[id].icon} ${esc(MILESTONES[id].name)}</span>` : '').join(' ');
  return card('Your Year at Work', `${ladder}${record}
    <h4 class="sub">This year's plan</h4><div class="action-grid">${plans}</div>
    <h4 class="sub">On the job (${Math.max(0, SHIFTS_PER_YEAR - used)} of ${SHIFTS_PER_YEAR} left this year)</h4><div class="action-grid">${actions}</div>
    ${reached ? `<h4 class="sub">Milestones</h4><p>${reached}</p>` : ''}`, { icon: '🎮', accent: 'cyan' });
}
