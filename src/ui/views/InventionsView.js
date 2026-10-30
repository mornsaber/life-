/**
 * The workshop card (Business tab): inventions in development, patents and
 * what they earn.
 */
import { esc, money, button, card, chip, empty } from '../Components.js';
import { FIELDS, inventionsOf, patentFee, PATENT_YEARS } from '../../modules/business/Inventions.js';

const STATUS = { held: ['🗄️ Held', ''], licensed: ['📃 Licensed', 'good'], sold: ['💰 Sold', ''], company: ['🚀 In your company', 'good'], expired: ['⌛ Expired', ''], open: ['🌍 Open design', 'good'] };

export function inventionsCard(state) {
  if (state.character.age < 16) return '';
  const inv = inventionsOf(state);
  const projects = inv.projects.map((p) => `<li class="region-row"><span>💡 <b>${esc(p.name)}</b> <small>${esc(FIELDS[p.field].label)}</small></span>
    <small>${p.pendingAt != null ? 'Patent pending' : p.done ? 'Prototype works — decide what to do' : `${Math.min(99, p.progress)}% built · quality ${p.quality}`} · ${money(p.spent)} spent</small>
    ${p.pendingAt == null && !p.done ? button('Abandon', 'inventions.abandon', { arg: p.id, variant: 'tiny' }) : ''}</li>`).join('');
  const patents = inv.patents.map((p) => `<li class="region-row"><span>📜 <b>${esc(p.name)}</b> ${chip(...STATUS[p.status])}</span>
    <small>quality ${p.quality}${p.status === 'licensed' ? ` · ${money(p.royalty)}/yr from ${esc(p.licensee)}` : ''}${['held', 'licensed', 'company'].includes(p.status) ? ` · expires at ${p.expires}` : ''}</small>
    ${p.status === 'held' ? button('Shop it', 'inventions.shop', { arg: p.id, variant: 'tiny' }) : ''}</li>`).join('');
  const fields = Object.entries(FIELDS).map(([id, f]) => button(f.label, 'inventions.start', { arg: id, variant: 'small', hint: `${money(Math.round(f.cost))}/yr · ~${f.work} yr${f.work > 1 ? 's' : ''}${f.smarts ? ` · smarts ${f.smarts}+` : ''}`, disabled: state.stats.smarts < f.smarts })).join('');
  return card('Workshop', `
    ${projects ? `<ul class="history">${projects}</ul>` : ''}
    ${patents ? `<h4 class="sub">Patents</h4><ul class="history">${patents}</ul>` : ''}
    ${!projects && !patents ? empty('No inventions yet.') : ''}
    ${inv.founding ? '<p class="fine">🚀 Your next business launches with your patent.</p>' : ''}
    <h4 class="sub">Start inventing</h4><div class="action-grid">${fields}</div>
    <p class="fine">A patent costs about ${money(patentFee(state))} to file and lasts ${PATENT_YEARS} years from filing. License it, sell it, or build a company on it — and be ready to defend it.</p>`, { icon: '💡', summary: inv.patents.filter((p) => p.status === 'licensed').length ? `${money(inv.patents.reduce((s, p) => s + (p.status === 'licensed' ? p.royalty : 0), 0))}/yr royalties` : '' });
}
