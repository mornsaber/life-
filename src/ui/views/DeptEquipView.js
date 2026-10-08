/** Department fleet & facilities on the Career tab. */
import { esc, button, card, chip, meter, disclosure } from '../Components.js';
import { GROUPS, groupOf, deptOf, readiness, canManage, canRequest, capitalBudget } from '../../modules/publicsafety/DeptEquipment.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;
const SIZES = ['small', 'medium', 'large', 'enterprise'];

export function deptEquipCard(state) {
  const job = state.career.job;
  if (!groupOf(job)) return '';
  const d = deptOf(state, job);
  const g = GROUPS[d.group];
  const size = SIZES.includes(job.employer.size) ? job.employer.size : 'medium';
  const r = readiness(state, job);
  const manager = canManage(job);
  const requester = !manager && canRequest(job);
  const pool = d.budget + d.reserve;
  const rows = Object.entries(g.categories).map(([cid, cat]) => {
    const units = d.units[cid] ?? [];
    const needed = cat.need[size] ?? 0;
    if (!needed && !units.length) return '';
    const worn = units.filter((u) => u.age > (cat.models[u.model]?.life ?? 10)).length;
    const avg = units.length ? Math.round(units.reduce((s, u) => s + u.age, 0) / units.length) : 0;
    const mix = Object.entries(units.reduce((acc, u) => ({ ...acc, [u.model]: (acc[u.model] ?? 0) + 1 }), {})).map(([mid, n]) => `${n} × ${esc(cat.models[mid]?.name ?? mid)}${units.some((u) => u.model === mid && u.leased) ? ' (some leased)' : ''}`).join(' · ');
    const buttons = manager ? Object.entries(cat.models).map(([mid, m]) => {
      if (m.build) return button(`🏗️ Bond: build ${m.name.replace(/ \(build with a bond\)/, '').toLowerCase()} (${money(m.cost)})`, 'deptEquip.build', { arg: `${cid}:${mid}`, variant: 'tiny', disabled: Boolean(d.bond) || Boolean(state.yearly['equip.bond']), hint: d.bond ? 'A project is already underway' : 'Council vote; opens in ~2 years' });
      if (m.rent) return button(`📝 Lease ${m.name.replace(/^Leased /, '').toLowerCase()} (${money(m.rent)}/yr)`, 'deptEquip.buy', { arg: `${cid}:${mid}`, variant: 'tiny', disabled: m.rent > pool });
      const leaseCost = Math.round((m.cost / m.life) * 1.3);
      return [
        button(`🆕 ${esc(m.name)} ${money(m.cost)}`, 'deptEquip.buy', { arg: `${cid}:${mid}`, variant: 'tiny', disabled: m.cost > pool, hint: `${m.life}-year service life · ${money(m.upkeep)}/yr upkeep` }),
        m.usedCost ? button(`♻️ Used ${money(m.usedCost)}`, 'deptEquip.buy', { arg: `${cid}:${mid}:used`, variant: 'tiny', disabled: m.usedCost > pool, hint: 'Already partway through its life' }) : '',
        m.lease ? button(`📝 Lease ${money(leaseCost)}/yr`, 'deptEquip.buy', { arg: `${cid}:${mid}:lease`, variant: 'tiny', disabled: leaseCost > pool, hint: 'Comes out of each year\'s budget; returned at end of life' }) : '',
      ].join('');
    }).join('') + (Object.values(cat.models).some((m) => m.refurb || m.remount) ? button(Object.values(cat.models).some((m) => m.remount) ? '🔧 Remount the oldest' : '🔧 Refurbish the oldest', 'deptEquip.refurb', { arg: cid, variant: 'tiny', disabled: !units.length }) : '') + (units.length ? button(cat.facility ? '🚪 Close / end a lease' : '🏷️ Retire & auction the oldest', 'deptEquip.retire', { arg: cid, variant: 'tiny' }) : '')
      : requester ? button('📋 Request a replacement', 'deptEquip.request', { arg: cid, variant: 'tiny', disabled: Boolean(state.yearly['equip.request']) }) : '';
    const tone = units.length < needed || worn > needed / 3 ? 'warn' : 'good';
    return disclosure(`equip.${cid}`, `${cat.icon} ${esc(cat.name)}`, `<p class="fine">${mix || 'None'}${units.length ? ` · average age ${avg} yr` : ''}${worn ? ` · <span class="neg">${worn} past service life</span>` : ''}</p>${buttons ? `<div class="toggle-row">${buttons}</div>` : ''}`, { count: `${units.length}/${needed}${worn ? ` · ${worn} worn` : ''}`, tone });
  }).join('');
  return card(`Department ${g.name}`, `${meter(r, { max: 100, label: 'Readiness', suffix: '%', tone: r >= 75 ? 'good' : r >= 55 ? 'mid' : 'bad' })}
    ${manager ? `<p>${chip(`💰 ${money(d.budget)} left this year`)} ${d.reserve ? chip(`🏦 ${money(d.reserve)} reserve`) : ''} ${d.bond ? chip('🏗️ Station under construction', 'good') : ''}</p>
      <div class="action-grid">${button('🏦 Bank unspent money for a big purchase', 'deptEquip.bank', { variant: 'small', disabled: !d.budget || Boolean(state.yearly['equip.bank']), hint: 'Otherwise it goes back to the general fund at year-end' })}</div>` : ''}
    ${rows}
    <p class="fine">${manager ? `You control the equipment budget (about ${money(capitalBudget(state, job))} a year, depending on ${job.sector === 'private' ? 'the company' : 'the city\'s finances'}). Readiness is part of your evaluation.` : requester ? 'Supervisors can request replacements; the captain or chief holds the budget.' : 'Your chiefs and managers decide what gets bought. Old equipment breaks down on calls.'}</p>`, { icon: '🛠️' });
}
