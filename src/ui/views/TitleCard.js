/**
 * Home tab: "Title & Inheritance" — how you hold each property, who it's left to, and the law of
 * succession here and now (realestate/Title.js, world/SuccessionLaw.js).
 */
import { esc, card, button, select, money } from '../Components.js';
import { titleOf, titleLabel, legatees, undercoverture } from '../../modules/realestate/Title.js';
import { successionLaw } from '../../modules/world/SuccessionLaw.js';
import { spouseOf, livingChildren } from '../../modules/people/People.js';

function lawLine(state) {
  const law = successionLaw(state);
  const kids = livingChildren(state).length;
  const parts = [];
  if (law.family === 'common') parts.push('You may leave your property as you like (freedom of testation).');
  if (law.reserve && kids) parts.push(`Under ${law.name}, your ${kids === 1 ? 'child is' : `${kids} children are`} owed ${kids === 1 ? 'half' : kids === 2 ? 'two-thirds' : 'three-quarters'} of your estate, whatever your will says; you may leave the rest as you like.`);
  if (law.family === 'islamic') parts.push(`Under ${law.name}, your heirs' shares are fixed (a son's twice a daughter's); you may will away no more than a third, and not to an heir.`);
  if (law.family === 'customary') parts.push('By custom, family land passes to the eldest son to hold for the family.');
  if (law.family === 'socialist') parts.push('The state owns the land; your home and belongings pass to your family.');
  if (law.primogeniture) parts.push('A landed estate goes whole to the eldest son (entail and primogeniture).');
  if (law.coverture) parts.push(state.character.gender === 'female' ? 'A married woman\'s property is her husband\'s to hold and manage.' : 'Your wife\'s property is yours to hold and manage (coverture).');
  return parts.join(' ');
}

export function titleCard(state) {
  const props = state.housing?.properties ?? [];
  if (!props.length && !state.people?.list?.some((p) => p.relation === 'child')) return '';
  const spouse = spouseOf(state);
  const heirs = legatees(state);
  const covered = undercoverture(state);
  const rows = props.map((p) => {
    const t = titleOf(p);
    const joint = spouse && !covered && t.form !== 'common' ? button(t.form === 'joint' ? '📜 Back to your name alone' : `📜 Joint names with ${spouse.firstName}`, 'title.joint', { arg: p.id, variant: 'tiny', hint: t.form === 'joint' ? '' : '$400 · passes to the survivor, outside the will' }) : '';
    const leave = !covered && t.form !== 'joint' && heirs.length
      ? `<span data-collect-root><input type="hidden" data-part="id" value="${esc(p.id)}">${select('who', [{ value: '', label: '— with the rest of the estate —' }, ...heirs.map((h) => ({ value: h.id, label: `${h.firstName} (${h.relation})` }))], { label: 'Leave to', value: t.leaveTo ?? '' })}${button('Set', 'title.leave', { variant: 'tiny', collect: true })}</span>` : '';
    return `<li class="move-row"><div class="move-head"><b>${esc(p.typeName)}</b> <small class="muted">${money(Math.round(p.value * (t.share ?? 1)))}${t.how === 'inherited' ? ` · inherited from ${esc(t.from ?? 'family')}` : ''}</small></div>
      <small class="fine">${esc(titleLabel(state, p))}</small><div class="toggle-row">${joint}${leave}</div></li>`;
  }).join('');
  return card('Title & Inheritance', `<p class="fine">${esc(lawLine(state))}</p>${rows ? `<ul class="move-list">${rows}</ul>` : '<p class="muted">You own no property.</p>'}`, { icon: '📜' });
}
