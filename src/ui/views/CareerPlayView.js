/**
 * Your year at work (career/CareerPlay.js): how ready you are for the next rung and what it
 * brings, your record, burnout, the year's plan, the job's own actions with their odds, and
 * the milestones you've reached.
 */
import { button, card, esc, meter } from '../Components.js';
import { yearlyCount } from '../../core/State.js';
import { WORK_PLANS, planOf, shiftActions, shiftOdds, SHIFTS_PER_YEAR, readiness, nextPerk, MILESTONES } from '../../modules/career/CareerPlay.js';
import { PROJECTS, storyKind, projectOf, cantStartProject, pushOdds, peopleOdds } from '../../modules/career/CareerStory.js';

/** The signature project, and the mentor and rival from the org chart (career/CareerStory.js). */
function storyBlock(state, job) {
  const p = projectOf(state);
  const def = PROJECTS[storyKind(state, job)] ?? PROJECTS.general;
  const why = cantStartProject(state);
  const project = p
    ? `<p>${p.icon} <b>${esc(p.name)}</b> · ${Math.max(0, p.startAge + p.years - state.character.age)} yr left</p><div class="stat-line"><span>Progress</span>${meter(p.progress, { tone: p.progress >= 70 ? 'good' : 'warn' })}</div>
       <div class="action-grid">${button('💪 Push it this year', 'careerStory.pushProject', { variant: 'small', disabled: Boolean(yearlyCount(state, 'careerStory.push')), hint: yearlyCount(state, 'careerStory.push') ? 'Pushed this year' : `${Math.round(pushOdds(state) * 100)}% to go well · your plan and record move it every year` })}</div>`
    : `<div class="action-grid">${button(`${def.icon} Take on ${def.name.toLowerCase()}`, 'careerStory.startProject', { variant: 'small', disabled: Boolean(why), hint: why ?? `${def.years} years · finish it and make your name; miss the deadline and it's shelved` })}</div>`;
  const m = job.mentor;
  const r = job.rival;
  const once = (k) => Boolean(yearlyCount(state, `careerStory.${k}`));
  const mentor = m ? `<div class="stat-line"><span>🧭 ${esc(m.name)} <small>${esc(m.title)}</small></span>${meter(m.bond)}</div>
    <div class="action-grid">${button('☕ Ask for advice', 'careerStory.people', { arg: 'advice', variant: 'small ghost', disabled: once('advice'), hint: 'Bond and performance up' })}${button('🗝️ Ask them to put in a word', 'careerStory.people', { arg: 'sponsor', variant: 'small ghost', disabled: once('sponsor') || m.bond < 70, hint: m.bond < 70 ? 'Needs a bond of 70' : 'Your boss warms to you' })}</div>` : '';
  const rival = r ? `<div class="stat-line"><span>${r.mood === 'ally' ? '🤝' : '🥊'} ${esc(r.name)} <small>${r.mood === 'ally' ? 'an ally now' : 'your rival'}</small></span>${meter(r.standing, { tone: r.mood === 'ally' ? 'good' : r.standing > (job.performance ?? 55) ? 'bad' : 'warn' })}</div>
    ${r.mood === 'ally' ? '' : `<div class="action-grid">${['outshine', 'peace', 'undercut'].map((k) => button({ outshine: '🌟 Outshine them', peace: '🤝 Make peace', undercut: '🗡️ Undercut them' }[k], 'careerStory.people', { arg: k, variant: 'small ghost', disabled: once(k), hint: `${Math.round(peopleOdds(state, k) * 100)}%` })).join('')}</div>`}` : '';
  return `<h4 class="sub">Signature project</h4>${project}${m || r ? `<h4 class="sub">People at work</h4>${mentor}${rival}` : ''}`;
}

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
    ${storyBlock(state, job)}
    ${reached ? `<h4 class="sub">Milestones</h4><p>${reached}</p>` : ''}`, { icon: '🎮', accent: 'cyan' });
}
