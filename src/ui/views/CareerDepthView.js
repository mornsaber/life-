/**
 * Career depth (career/CompanyLife.js and friends): the company you work for, your shares,
 * head office.
 */
import { button, card, esc, meter, kv } from '../Components.js';
import { REGIONS } from '../../modules/life/Regions.js';
import { corpOf, isCorporate, isBig, equityValue } from '../../modules/career/CompanyLife.js';

const money = (n) => `$${Math.round(n).toLocaleString()}`;
const KIND = { acquired: '🤝', merger: '⚖️', reorganized: '🔀', newCeo: '👔', spunOff: '🧬', floated: '🔔', collapsed: '📉' };

export function companyCard(state) {
  const job = state.career?.job;
  if (!isCorporate(job)) return '';
  const c = corpOf(state, job);
  if (!c) return '';
  const eq = equityValue(state, job);
  const hq = REGIONS[c.hq];
  const atHq = c.hq === state.character.regionId;
  const health = c.health >= 75 ? 'Booming' : c.health >= 55 ? 'Doing well' : c.health >= 35 ? 'Under pressure' : c.health >= 20 ? 'Struggling' : 'In trouble';
  const rows = [
    ['Owned by', c.parent ?? (c.listed ? 'Shareholders (listed)' : c.young ? 'Founders and investors' : 'Privately held')],
    ...(c.listed ? [['Share price', `${c.share} (100 when you joined)`]] : []),
    ...(isBig(job) ? [['Head office', `${esc(hq?.name ?? '—')}${atHq ? ' · you work here' : ''}`]] : []),
    ...(eq.kind && eq.kind !== 'profit' ? [[eq.kind === 'options' ? 'Your options' : 'Your shares', `${eq.vested ? `${money(eq.vested)} vested · ` : ''}${money(eq.unvested)} still vesting${eq.unvested ? ' (lost if you leave)' : ''}`]] : []),
    ...(eq.kind === 'profit' ? [['Profit share', 'Paid in a record year']] : []),
  ];
  const history = c.history.length ? `<h4 class="sub">What's happened</h4><ul class="history">${c.history.slice(0, 5).map((h) => `<li>${KIND[h.kind] ?? '•'} Age ${h.age}: ${esc(h.text)}</li>`).join('')}</ul>` : '';
  const move = isBig(job) && !atHq && (job.grade ?? 0) >= 5
    ? `<div class="row-end">${button(`🏢 Transfer to head office in ${esc(hq?.name.split(',')[0] ?? 'the capital')}`, 'companyLife.headOffice', { variant: 'small', hint: 'The top posts are there: a move for you and the family' })}</div>` : '';
  return card(`${esc(job.employer.name)}`, `<div class="stat-line"><span>🏭 ${health}</span>${meter(c.health, { tone: c.health >= 55 ? 'good' : c.health >= 30 ? 'warn' : 'bad' })}</div>${kv(rows)}${history}${move}`, { icon: '🏢' });
}
