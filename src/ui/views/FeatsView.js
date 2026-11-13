/**
 * Expeditions and feats: the goals open in this day, and what you've discovered, reached,
 * built and done in the shadows.
 */
import { esc, button, card, kv } from '../Components.js';
import { expeditionOptions, expeditionEligibility, featsOf, EXPEDITIONS } from '../../modules/career/Feats.js';

export function featsCard(state) {
  if (state.character.age < 18) return '';
  const f = featsOf(state);
  const opts = expeditionOptions(state);
  const rows = opts.map((e) => {
    const el = expeditionEligibility(state, e.id);
    return button(`${e.icon} ${e.label}`, 'feats.expedition', { arg: e.id, variant: 'small', disabled: !el.ok, hint: el.ok ? `${e.firstYet ? 'Nobody has done it yet · ' : ''}$${el.cost.toLocaleString()} · ${Math.round(e.death * 100)}% don't come back` : el.reason });
  }).join('');
  const done = [
    ...f.discoveries.map((d) => `💡 ${d.year}: ${esc(d.name)} (${esc(d.topic)})`),
    ...f.expeditions.filter((e) => e.success).map((e) => `${EXPEDITIONS[e.id]?.icon ?? '🧭'} ${e.year}: ${esc(EXPEDITIONS[e.id]?.label ?? e.id)}${e.first ? ' — the first' : ''}`),
    ...f.built.map((b) => `🏛️ ${b.year}: ${esc(b.name)}`),
  ];
  return card('Expeditions & Feats', `${rows ? `<p class="muted">The great journeys of this day. Sponsors pay if you're famous enough.</p><div class="action-grid">${rows}</div>` : '<p class="muted">No great journeys left to make in this day.</p>'}
    ${done.length ? `<h4 class="sub">What you've done</h4><ul class="history">${done.map((d) => `<li>${d}</li>`).join('')}</ul>` : ''}
    ${f.spy?.agents || f.spy?.drops ? kv([['Agents run', f.spy.agents], ['Dead drops serviced', f.spy.drops]]) : ''}`, { icon: '🧭' });
}
