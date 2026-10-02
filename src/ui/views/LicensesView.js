/**
 * Licenses tab: every credential in the unified registry, grouped by
 * category, with status, requirements, who pays (employer / unit budget /
 * academy / you), training in progress and the pilot logbook.
 */
import { esc, money, button, card, chip, statusPill } from '../Components.js';
import { CREDENTIAL_LIST, CATEGORIES, FLIGHT_BLOCK } from '../../modules/credentials/CredentialRegistry.js';
import { pursueEligibility, hasCredential, findSponsor } from '../../modules/credentials/LicensingEngine.js';

function payerHint(state, cred) {
  const sponsor = findSponsor(state, cred);
  if (sponsor?.academy) return `🎓 ${sponsor.label} pays`;
  if (sponsor && sponsor.left >= cred.cost) return `🏢 ${sponsor.label} pays`;
  if (cred.sponsoredOnly) return sponsor ? '⏳ Budget spent this year' : '🔒 Employer-sponsored only';
  return cred.cost ? `💳 You pay ${money(cred.cost)}` : 'Free';
}

function credentialRow(state, cred) {
  const held = state.credentials.held[cred.id];
  const training = state.credentials.training.find((t) => t.id === cred.id);
  const implied = !held && hasCredential(state, cred.id);
  let action = '';
  if (training) action = chip(`📚 ${training.yearsLeft} yr training left`, 'cyan');
  else if (held?.status === 'expired') action = button('Reinstate', 'credentials.renew', { arg: cred.id, variant: 'tiny', hint: money(cred.renewCost * 2) });
  else if (!held && !implied) {
    const elig = pursueEligibility(state, cred.id);
    action = `${button(cred.trainingYears ? `Enroll (${cred.trainingYears} yr)` : 'Take exam', 'credentials.pursue', { arg: cred.id, variant: 'tiny', disabled: !elig.ok, title: elig.reason ?? '' })}<span class="${elig.ok ? 'fine' : 'why'}">${esc(elig.ok ? payerHint(state, cred) : elig.reason)}</span>`;
  }
  const status = held ? statusPill(held.status === 'suspended' ? `suspended → ${held.until}` : held.status) : implied ? chip('covered', 'good') : '';
  return `<li class="cert ${held?.status === 'active' || implied ? 'done' : ''}" title="${esc(cred.kind)}">
    <span>${cred.icon} ${esc(cred.name)}</span> ${status}
    ${cred.renewYears && held?.status === 'active' ? `<small class="fine">renews every ${cred.renewYears} yr</small>` : ''}
    <span class="cert-action">${action}</span>
  </li>`;
}

export function licensesView(state) {
  const byCat = {};
  for (const c of CREDENTIAL_LIST) (byCat[c.category] ??= []).push(c);
  const held = Object.values(state.credentials.held).filter((h) => h.status === 'active').length;
  const cards = Object.entries(CATEGORIES).map(([id, cat]) => {
    const extra = id === 'aviation' ? `<p class="fine">Logbook: <b>${state.credentials.logbook.flightHours} flight hours</b>. Aviation jobs and military aviators log hours automatically.</p>${button(`🛩️ Rent aircraft (${FLIGHT_BLOCK.hours} hrs)`, 'credentials.fly', { variant: 'small', hint: money(FLIGHT_BLOCK.cost) })}` : '';
    return card(cat.name, `${extra}<ul class="certs">${byCat[id].map((c) => credentialRow(state, c)).join('')}</ul>`, { icon: cat.icon });
  });
  return `${card('Credentials', `<p class="muted">One registry for every license and certification. Employers, agencies and volunteer units pay for job-relevant credentials from their annual training budgets; police, fire, EMS, federal and airline employers run funded academies for their own hires. Convictions can suspend or revoke credentials.</p><p><b>${held}</b> active · ${state.credentials.training.length} in training</p>`, { icon: '🪪', accent: 'cyan' })}<div class="grid-2">${cards.join('')}</div>`;
}
