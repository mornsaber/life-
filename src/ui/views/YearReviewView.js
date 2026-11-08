/**
 * The year in review (Life tab, top): what changed since your last birthday, at a glance.
 * Built by the engine (core/YearReview.js); this only draws it.
 */
import { esc, money, card, chip } from '../Components.js';
import { STAT_META } from '../../core/State.js';
import { CONDITIONS } from '../../modules/health/Conditions.js';

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
