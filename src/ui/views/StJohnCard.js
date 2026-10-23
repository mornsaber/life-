/**
 * The Order of St John on the Civic Service tab: your grade and office, the Service Medal,
 * gifts to the Eye Hospital, and the Alliance orders in Germany, the Netherlands and Sweden.
 */
import { esc, button, card, kv } from '../Components.js';
import { prioryOf, gradeName, stJohnYears, stJohnAmbulanceHere, OFFICES, ALLIANCE, allianceCheck } from '../../modules/world/StJohn.js';

export function stJohnCard(state) {
  if (state.character.age < 16) return '';
  const s = state.stJohn;
  const cc = state.character.countryId ?? 'US';
  const priory = prioryOf(state);
  const alliance = ALLIANCE[cc];
  if (!s && !priory && !alliance) return '';
  const years = stJohnYears(state);
  const medal = state.honors.find((h) => h.id === 'stJohn.serviceMedal');
  if (s && s.order !== 'venerable') {
    const a = ALLIANCE[s.order];
    return card('Order of St John', `${kv([['Order', esc(a.name)], ['Grade', esc(gradeName(state))], s.office ? ['Office', esc(a.head)] : null, ['Member since', `age ${s.since}`]].filter(Boolean))}
      <p class="fine">A Protestant order of the Alliance of the Orders of St John. Its members serve through ${esc(a.work)}.</p>
      <div class="action-grid">${button('🚪 Resign', 'stJohn.resign', { variant: 'danger', disabled: Boolean(s.office) })}</div>`, { icon: '✠' });
  }
  const office = s?.office ? (['prior', 'chancellor'].includes(s.office) ? `${OFFICES[s.office]} of ${s.priory}` : OFFICES[s.office]) : null;
  const rows = [
    s ? ['Grade', esc(gradeName(state))] : null,
    office && s.office !== 'sovereign' ? ['Office', esc(office)] : null,
    s ? ['Member since', `age ${s.since}`] : null,
    priory ? ['Priory', esc(priory)] : null,
    years ? ['Service with St John', `${years} yr${years === 1 ? '' : 's'}${medal ? ' · 🎖️ Service Medal' : years < 10 ? ` · Service Medal at 10` : ''}`] : null,
    state.flags?.stJohnGiving ? ['Given to the Eye Hospital', `$${state.flags.stJohnGiving.toLocaleString()}`] : null,
  ].filter(Boolean);
  const how = s ? '' : `<p class="muted">The Most Venerable Order of St John is a royal order of chivalry. Membership is by nomination, for service: years with ${stJohnAmbulanceHere(cc) ? 'St John Ambulance (join it on the 🚨 Emergency Services tab)' : 'St John'}, medical work, gifts to the St John Eye Hospital in Jerusalem, or a distinguished life.</p>`;
  const join = !s && alliance ? (() => {
    const check = allianceCheck(state);
    return `<p class="fine">${esc(alliance.name)} is the country's Protestant order of St John.</p><div class="action-grid">${button('✠ Seek an invitation', 'stJohn.joinAlliance', { disabled: !check.ok, hint: check.ok ? `~${Math.round(check.odds * 100)}%` : check.reason })}</div>`;
  })() : '';
  return card('Order of St John', `${rows.length ? kv(rows) : ''}${how}
    <p class="fine">Members write MStJ, OStJ, CStJ, KStJ / DStJ or GCStJ after their names, but no title or precedence comes with them: a Knight of St John is not "Sir".</p>
    ${join}
    <div class="action-grid">${priory || s ? button('👁️ Give to the Eye Hospital', 'stJohn.give', { arg: 10000, hint: '$10,000 · once a year' }) : ''}${s && !s.viceRegal && s.office !== 'sovereign' ? button('🚪 Resign', 'stJohn.resign', { variant: 'danger' }) : ''}</div>`, { icon: '✠' });
}
