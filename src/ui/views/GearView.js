/** Work gear on the Career tab: equipment you buy for your own job. */
import { esc, button, card, chip, optionRow } from '../Components.js';
import { GEAR, GEAR_LOAN, gearFor, buyEligibility, activeFor } from '../../modules/career/WorkGear.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;
const MODE = { perf: 'Better at the job', side: 'Side income', ownerOp: 'Paid what you net, not a wage', booth: 'Keep your clients\' payments' };

export function gearCard(state) {
  const gs = state.gear;
  const job = state.career.job;
  if (!gs) return '';
  const owned = gs.owned.map((x) => {
    const item = GEAR[x.itemId];
    const working = activeFor(item, job);
    const last = gs.lastYear?.[x.id];
    return optionRow({
      icon: item.icon,
      title: esc(item.name),
      sub: `${x.used ? 'Bought used · ' : ''}${x.age} yr old${x.age > item.life ? ' · worn out' : ''} · worth ${money(x.value)}`,
      meta: working ? (last != null ? `Last year: ${money(last)}${item.mode === 'ownerOp' || item.mode === 'booth' ? ' net' : ''}` : MODE[item.mode]) : 'Idle — not for your current job',
      tone: working ? 'good' : 'warn',
      action: button('Sell', 'gear.sell', { arg: x.id, variant: 'small' }),
    });
  }).join('');
  const shop = gearFor(job).filter(([id]) => !gs.owned.some((x) => x.itemId === id)).map(([id, item]) => {
    const ok = buyEligibility(state, id);
    const used = item.usedCost ? buyEligibility(state, id, true) : null;
    const finance = item.cost >= 10000;
    return `<li class="program ${ok.ok ? '' : 'locked'}"><div><b>${item.icon} ${esc(item.name)}</b> ${chip(MODE[item.mode])}<small>${esc(item.desc)}${item.rent ? ` · ${money(item.rent)}/yr rent` : ''}</small>${ok.ok ? '' : `<small class="why">${esc(ok.reason)}</small>`}</div>
      <div class="toggle-row">
        ${button(`💵 ${money(item.cost)}`, 'gear.buy', { arg: id, variant: 'tiny', disabled: !ok.ok || state.finances.cash < item.cost })}
        ${finance ? button(`🏦 Finance (${money(item.cost * GEAR_LOAN.down)} down)`, 'gear.buy', { arg: `${id}:loan`, variant: 'tiny', disabled: !ok.ok, hint: `${Math.round(GEAR_LOAN.rate * 1000) / 10}% over ${GEAR_LOAN.years} years` }) : ''}
        ${used ? button(`♻️ Used ${money(item.usedCost)}`, 'gear.buy', { arg: `${id}:used`, variant: 'tiny', disabled: !used.ok || state.finances.cash < item.usedCost, hint: 'Cheaper; wears out sooner' }) : ''}
        ${used && item.usedCost >= 10000 ? button('🏦 Finance used', 'gear.buy', { arg: `${id}:used:loan`, variant: 'tiny', disabled: !used.ok }) : ''}
      </div></li>`;
  }).join('');
  if (!owned && !shop) return '';
  return card('Your Work Gear', `${owned ? `<ul class="job-board">${owned}</ul>` : ''}
    ${gs.loan ? `<p class="fine">🏦 Equipment loan: ${money(gs.loan.balance)} left · ${money(gs.loan.annual)}/yr</p>` : ''}
    ${shop ? `<h4 class="sub">Buy for your job</h4><ul class="programs">${shop}</ul>` : ''}
    <p class="fine">Equipment you own yourself: it makes you better at the work, earns on the side, or changes how you're paid. It wears out, and you can sell it.</p>`, { icon: '🧰' });
}
