/**
 * Power, legal and otherwise: the government desk (Politics) and the empire map (Underworld).
 */
import { esc, button, card, chip, meter, kv, money } from '../Components.js';
import { GROUPS, leadsCountry, deskOf } from '../../modules/politics/GovernmentDesk.js';
import { runsEmpire, empireOf } from '../../modules/legal/Empire.js';
import { meOf, outfitsHere } from '../../modules/legal/Underworld.js';
import { COUNTRIES } from '../../modules/world/Countries.js';
import { flagImg } from '../Flags.js';

export function governmentCard(state) {
  if (!leadsCountry(state)) return '';
  const d = deskOf(state);
  if (!d) return card('Government', '<p class="muted">Your government desk opens at the end of your first year in office.</p>', { icon: '🏛️' });
  const groups = Object.entries(GROUPS).map(([id, g]) => meter(d.groups[id], { label: `${g.icon} ${g.label}`, tone: d.groups[id] >= 55 ? 'good' : d.groups[id] >= 40 ? 'mid' : 'bad' })).join('');
  const used = Boolean(state.yearly['desk.diplomacy']);
  const rel = Object.entries(d.relations).map(([cc, v]) => `<li class="region-row"><span>${flagImg(cc) || ''} <b>${esc(COUNTRIES[cc]?.name ?? cc)}</b> ${chip(`${v}`, v >= 65 ? 'good' : v >= 40 ? '' : 'bad')}${d.deals.filter((x) => x.cc === cc).map((x) => ` ${chip(x.kind === 'trade' ? '🤝 Trade' : x.kind === 'alliance' ? '🛡️ Ally' : '🚫 Sanctioned', x.kind === 'sanction' ? 'bad' : 'good')}`).join('')}</span>
    <span>${button('🤝', 'desk.diplomacy', { arg: `${cc}:trade`, variant: 'tiny', disabled: used, title: 'Trade deal' })}${button('🛡️', 'desk.diplomacy', { arg: `${cc}:alliance`, variant: 'tiny', disabled: used, title: 'Alliance' })}${button('🚫', 'desk.diplomacy', { arg: `${cc}:sanction`, variant: 'tiny', disabled: used, title: 'Sanctions' })}</span></li>`).join('');
  const legacy = d.legacy.slice(-5).reverse().map((l) => `<li><small>age ${l.age}</small> ${esc(l.text)}</li>`).join('');
  return card('Government', `<h4 class="sub">How the country sees you</h4>${groups}
    ${d.crisis ? `<p>${chip(`🚨 Crisis under way`, 'warn')}</p>` : ''}
    <h4 class="sub">Diplomacy ${used ? '<small>(this year\'s move made)</small>' : ''}</h4><ul class="history">${rel}</ul>
    ${legacy ? `<h4 class="sub">Your record</h4><ul class="history">${legacy}</ul>` : ''}
    <p class="fine">Each group judges you on what it cares about — jobs, taxes, pensions, schools, roads, policing — and your approval follows. The budget is on this tab too.</p>`, { icon: '🏛️', summary: `Approval ${state.politics.office.approval}` });
}

export function empireCard(state) {
  if (!runsEmpire(state)) return '';
  const e = empireOf(state);
  const me = meOf(state);
  if (!e) return card('The Map', '<p class="muted">Your map of the city takes shape at the end of the year.</p>', { icon: '🗺️' });
  const names = Object.fromEntries(outfitsHere(state).map((o) => [o.id, o.name]));
  const used = Boolean(state.yearly['empire.move']);
  const rows = e.districts.map((d) => {
    const ours = d.owner === me.outfitId;
    return `<li class="region-row"><span>${ours ? '🟢' : '🔴'} <b>${esc(d.name)}</b> <small>${esc(names[d.owner] ?? 'Unclaimed')} · grip ${d.grip} · heat ${d.heat}</small></span>
      <span>${ours ? `${button('🧱 Dig in', 'empire.move', { arg: `${d.name}|dig`, variant: 'tiny', disabled: used })}${button('🚪 Pull out', 'empire.move', { arg: `${d.name}|pull`, variant: 'tiny', disabled: used })}` : button('⚔️ Push in', 'empire.move', { arg: `${d.name}|push`, variant: 'tiny', disabled: used })}</span></li>`;
  }).join('');
  const held = e.districts.filter((d) => d.owner === me.outfitId).length;
  return card('The Map', `${kv([['Districts held', `${held} of ${e.districts.length}`], ['Dirty money', money(me.dirty ?? 0)], ['Laundered', money(me.laundered ?? 0)]])}
    <ul class="history">${rows}</ul>
    ${me.rank >= 4 ? `<div class="toggle-row">${button('🎩 Take the family legit', 'empire.goLegit', { variant: 'small', hint: 'Needs a clean business and $1M+ laundered' })}</div>` : ''}
    <p class="fine">One move a year. What you hold pays — and heats up; a district too hot draws a task force raid.</p>`, { icon: '🗺️', summary: `${held}/${e.districts.length} districts` });
}
