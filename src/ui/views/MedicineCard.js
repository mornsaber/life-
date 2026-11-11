/**
 * Health tab: "Medicine of <year>": what doctors here can and can't do yet, the diseases still
 * about, any epidemic this year, and the vaccines you can have (health/PeriodHealth.js).
 */
import { esc, button, card, chip } from '../Components.js';
import { yearNow, PRESENT } from '../../modules/world/Eras.js';
import { TREATMENTS, DISEASES, available, threat, epidemicsNow, vaccinesOpen, medicineLag } from '../../modules/health/PeriodHealth.js';

export function medicineCard(state) {
  const y = yearNow(state);
  if (!state.periodHealth || y >= PRESENT - 15) return '';
  const ids = Object.keys(TREATMENTS);
  const have = ids.filter((id) => available(state, id));
  const notYet = ids.filter((id) => !available(state, id));
  const recent = have.slice(-4).reverse().map((id) => chip(TREATMENTS[id][0], 'good')).join(' ');
  const coming = notYet.slice(0, 4).map((id) => chip(TREATMENTS[id][0], 'mid')).join(' ');
  const about = Object.values(DISEASES).filter((d) => threat(state, d) >= 0.3).map((d) => `${d.icon} ${esc(d.name)}`);
  const epi = epidemicsNow(state);
  const shots = vaccinesOpen(state);
  const lag = medicineLag(state);
  return card(`Medicine of ${y}`, `
    ${epi.length ? `<p class="why">⚠️ ${epi.map((e) => esc(e.name.replace(/^the /, 'The '))).join(', ')} ${epi.length > 1 ? 'are' : 'is'} going round this year.</p>` : ''}
    ${recent ? `<p>Doctors here have: ${recent}</p>` : ''}
    ${coming ? `<p>Not yet: ${coming}</p>` : ''}
    ${about.length ? `<p class="fine">Still about: ${about.join(', ')}.</p>` : ''}
    ${lag ? `<p class="fine">New medicine reaches here about ${lag} years after the richest countries.</p>` : ''}
    ${shots.length ? `<div class="toggle-row">${shots.map((v) => button(`💉 ${v.treatment}`, 'periodHealth.vaccinate', { arg: v.id, variant: 'small', hint: `$40 · protects you from ${v.name.toLowerCase()}` })).join('')}</div>` : ''}`, { icon: '⚕️', accent: epi.length ? 'yellow' : '' });
}
