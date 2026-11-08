/**
 * The year in review (Life tab, top): what changed since your last birthday, at a glance.
 * Built by the engine (core/YearReview.js); this only draws it.
 */
import { esc, money, card, chip, meter } from '../Components.js';
import { STAT_META } from '../../core/State.js';
import { CONDITIONS } from '../../modules/health/Conditions.js';
import { nextSteps, tipsFor } from '../../modules/life/Guide.js';
import { ASPIRATIONS, aspirationsOf, progressOf } from '../../modules/life/Aspirations.js';
import { button } from '../Components.js';

const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}`;
const moneyDelta = (n) => `${n >= 0 ? '+' : '−'}${money(Math.abs(n))}`;

export function yearReviewCard(state) {
  const y = state.lastYear;
  if (!y || y.age !== state.character.age || state.character.age < 1) return '';
  const stats = Object.entries(y.stats ?? {}).map(([k, d]) => {
    const good = STAT_META[k]?.inverse ? d < 0 : d > 0;
    return chip(`${STAT_META[k]?.icon ?? ''} ${STAT_META[k]?.label ?? k} ${signed(d)}`, good ? 'good' : 'bad');
  }).join(' ');
  const rows = [];
  if (y.job) rows.push(`<li class="${y.job.kind}">💼 ${esc(y.job.text)}</li>`);
  for (const p of y.people ?? []) rows.push(`<li>${p.icon} ${esc(p.text)}</li>`);
  for (const h of y.health ?? []) rows.push(`<li>${h.icon} ${esc(h.condition ? `${h.verb}: ${CONDITIONS[h.condition]?.name ?? h.condition}` : h.text)}</li>`);
  const highlights = (y.highlights ?? []).map((h) => `<li class="${h.kind}">${h.icon} ${esc(h.text)}</li>`).join('');
  const worthy = Math.abs(y.worth ?? 0) >= 100 || Math.abs(y.cash ?? 0) >= 100;
  const flows = [y.earned && y.earned.amount >= 100 ? `Most came from <b>${esc(y.earned.label)}</b> (${money(y.earned.amount)})` : '', y.spent && y.spent.amount >= 100 ? `most went on <b>${esc(y.spent.label)}</b> (${money(y.spent.amount)})` : ''].filter(Boolean).join('; ');
  const moneyLine = worthy && state.character.age >= 16 ? `<p class="yr-money">💵 Cash <b class="${y.cash >= 0 ? 'pos' : 'neg'}">${moneyDelta(y.cash)}</b> · Net worth <b class="${y.worth >= 0 ? 'pos' : 'neg'}">${moneyDelta(y.worth)}</b>${flows ? `<br><small class="muted">${flows.replace(/^m/, 'M')}.</small>` : ''}</p>` : '';
  const quiet = !stats && !rows.length && !highlights && !moneyLine;
  const body = quiet
    ? '<p class="muted">A quiet year. Nothing much changed.</p>'
    : `${stats ? `<div class="chip-row">${stats}</div>` : ''}${moneyLine}${rows.length ? `<ul class="yr-list">${rows.join('')}</ul>` : ''}${highlights ? `<h4 class="sub">Moments</h4><ul class="yr-list">${highlights}</ul>` : ''}${y.entries > (y.highlights?.length ?? 0) ? '<p class="fine">The full year is in your Life Story below.</p>' : ''}`;
  return card(`Age ${y.age}: The Year in Review`, body, { icon: '🗓️', accent: 'blue', className: 'year-review', fold: false });
}

/** "This year": a few things you could do now, each a button to the tab where you'd do it. */
export function thisYearCard(state) {
  const steps = nextSteps(state);
  if (!steps.length) return '';
  const rows = steps.map((x) => `<li>${button(`${x.icon} ${x.text}`, 'ui.tab', { arg: x.tab, variant: 'small ghost', hint: x.why })}</li>`).join('');
  return card('This Year', `<ul class="next-steps">${rows}</ul>`, { icon: '🧭', className: 'this-year', summary: `${steps.length} idea${steps.length > 1 ? 's' : ''}` });
}

/** First-life tips; hidden for good from the card or in Settings. */
export function tipsCard(state, show) {
  if (!show || state.character.age > 30) return '';
  const tips = tipsFor(state).map(([icon, html]) => `<li><span aria-hidden="true">${icon}</span> ${html}</li>`).join('');
  return card('How to Play', `<ul class="tips">${tips}</ul><div class="row-end">${button('Got it — hide tips', 'ui.hideTips', { variant: 'small ghost' })}</div>`, { icon: '💡', accent: 'yellow', className: 'tips-card', fold: false });
}

/** Aspirations: what you're working toward, with progress, and what you've already done. */
export function aspirationsCard(state) {
  const a = aspirationsOf(state);
  if (state.character.age < 16 || (!a.active.length && !a.done.length)) return '';
  const active = a.active.map((x) => {
    const d = ASPIRATIONS[x.id];
    return `<div class="aspiration">${meter(progressOf(state, x.id), { label: `${d.icon} ${esc(d.name)}`, tone: 'auto' })}<p class="fine">${esc(d.desc)} <small>Since ${x.since}.</small> ${button('Let it go', 'aspirations.drop', { arg: x.id, variant: 'tiny ghost' })}</p></div>`;
  }).join('');
  const done = a.done.map((x) => chip(`${ASPIRATIONS[x.id]?.icon ?? ''} ${ASPIRATIONS[x.id]?.name ?? x.id} · ${x.age}`, 'good')).join(' ');
  return card('Aspirations', `${active || '<p class="muted">Nothing you\'re chasing right now. New aims come along every few years.</p>'}${done ? `<h4 class="sub">Fulfilled</h4><div class="chip-row">${done}</div>` : ''}`, { icon: '🌠', summary: a.active.length ? `${a.active.length} active` : '' });
}
