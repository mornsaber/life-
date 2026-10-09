/**
 * Licenses tab: every credential in the unified registry, grouped by
 * category, with status, requirements, who pays (employer / unit budget /
 * academy / you), training in progress and the pilot logbook.
 */
import { esc, money, button, card, chip, statusPill } from '../Components.js';
import { CREDENTIAL_LIST, CATEGORIES, FLIGHT_BLOCK } from '../../modules/credentials/CredentialRegistry.js';
import { pursueEligibility, hasCredential, findSponsor, transferStatus, validHere, passChance, prepCost, ATTEMPTS_PER_YEAR, reinstatementStatus } from '../../modules/credentials/LicensingEngine.js';
import { RECIPROCITY_LABEL } from '../../modules/credentials/CredentialRegistry.js';

function payerHint(state, cred) {
  const sponsor = findSponsor(state, cred);
  if (sponsor?.academy) return `🎓 ${sponsor.label} pays`;
  if (sponsor && sponsor.left >= cred.cost) return `🏢 ${sponsor.label} pays`;
  if (cred.sponsoredOnly) return sponsor ? '⏳ Budget spent this year' : '🔒 Employer-sponsored only';
  return cred.cost ? `💳 You pay ${money(cred.cost)}` : 'Free';
}

export function credentialRow(state, cred) {
  const held = state.credentials.held[cred.id];
  const training = state.credentials.training.find((t) => t.id === cred.id);
  const implied = !held && hasCredential(state, cred.id);
  let action = '';
  const transfer = held?.status === 'active' && !validHere(state, cred.id) ? transferStatus(state, cred.id) : null;
  if (transfer?.needed) action = `${button(transfer.exam ? 'Take transfer exam' : 'Apply by motion', 'credentials.transfer', { arg: cred.id, variant: 'tiny', hint: money(transfer.cost) })}<span class="why">${esc(RECIPROCITY_LABEL[transfer.method])}</span>`;
  else if (training) action = chip(`📚 ${training.yearsLeft} yr training left`, 'cyan');
  else if (held?.status === 'expired') action = button('Reinstate', 'credentials.renew', { arg: cred.id, variant: 'tiny', hint: money(cred.renewCost * 2) });
  else if (held?.status === 'revoked') {
    const r = reinstatementStatus(state, cred.id);
    action = r.permanent ? `<span class="why">${esc(r.reason)}</span>`
      : `${button(r.exam ? 'Re-sit the exam' : '⚖️ Petition for reinstatement', 'credentials.reinstate', { arg: cred.id, variant: 'tiny', disabled: !r.ok || Boolean(state.yearly[`cred.reinstate.${cred.id}`]), hint: r.ok ? money(r.cost) : '' })}<span class="${r.ok ? 'fine' : 'why'}">${esc(r.ok ? (r.exam ? `Board approved · ${Math.round(r.odds * 100)}% pass odds` : `${money(r.cost)} with a lawyer · ~${Math.round(r.odds * 100)}% odds${held.denials ? ` · denied ${held.denials}×` : ''}`) : r.reason)}</span>`;
  }
  else if (!held && !implied) {
    const elig = pursueEligibility(state, cred.id);
    const prepped = Boolean(state.credentials.prep?.[cred.id]);
    const odds = Math.round(passChance(state, cred) * 100);
    const fails = state.credentials.failures?.[cred.id];
    const label = elig.retake ? 'Retest' : cred.trainingYears ? `Enroll (${cred.trainingYears} yr)` : 'Take exam';
    const payer = elig.retake ? `💳 Retest ${money(elig.cost)} — no retraining` : payerHint(state, cred);
    const prepBtn = elig.ok && !prepped ? button('📚 Prep', 'credentials.prep', { arg: cred.id, variant: 'tiny ghost', hint: `${money(prepCost(cred))} · +12% odds` }) : '';
    action = `${button(label, 'credentials.pursue', { arg: cred.id, variant: 'tiny', disabled: !elig.ok, title: elig.reason ?? '' })}${prepBtn}<span class="${elig.ok ? 'fine' : 'why'}">${esc(elig.ok ? payer : elig.reason)}${elig.ok ? ` · ${odds}% pass odds${prepped ? ' (prepped)' : ''}` : ''}${fails ? ` · failed ${fails}×` : ''}</span>`;
  }
  const status = held ? statusPill(held.status === 'suspended' ? `suspended → ${held.until}` : held.status === 'revoked' && held.permanent ? 'revoked for good' : held.status === 'active' && held.probationUntil >= state.character.age ? `probation → ${held.probationUntil}` : held.status) : implied ? chip('covered', 'good') : '';
  return `<li class="cert ${held?.status === 'active' || implied ? 'done' : ''}" title="${esc(cred.kind)}">
    <span>${cred.icon} ${esc(cred.name)}</span> ${status}
    ${cred.renewYears && held?.status === 'active' ? `<small class="fine">renews every ${cred.renewYears} yr</small>` : ''}
    ${cred.jurisdiction === 'state' ? `<small class="fine">📍 ${held?.states ? held.states.join(', ') : 'state-issued'}</small>` : ''}
    <span class="cert-action">${action}</span>
  </li>`;
}

const VIEWS_LABEL = { mine: '🪪 Mine', available: '✅ Can pursue now', browse: '🗂️ Browse by category' };

function logbook(state) {
  return `<p class="fine">Logbook: <b>${state.credentials.logbook.flightHours} flight hours</b>. Aviation jobs and military aviators log hours automatically.</p>${button(`🛩️ Rent aircraft (${FLIGHT_BLOCK.hours} hrs)`, 'credentials.fly', { variant: 'small', hint: money(FLIGHT_BLOCK.cost) })}`;
}

/** Rows grouped under small category headings. */
function groupedList(state, creds) {
  const byCat = {};
  for (const c of creds) (byCat[c.category] ??= []).push(c);
  return Object.entries(CATEGORIES).filter(([id]) => byCat[id]).map(([id, cat]) => `<h4 class="sub">${cat.icon} ${esc(cat.name)}</h4><ul class="certs">${byCat[id].map((c) => credentialRow(state, c)).join('')}</ul>`).join('');
}

/**
 * Three views instead of one endless page: what you hold (and are training
 * for), what you could start right now, and the full registry one category
 * at a time.
 */
export function licensesView(state, ui = {}) {
  const isMine = (c) => Boolean(state.credentials.held[c.id]) || hasCredential(state, c.id) || state.credentials.training.some((t) => t.id === c.id);
  const mine = CREDENTIAL_LIST.filter(isMine);
  const available = CREDENTIAL_LIST.filter((c) => !isMine(c) && pursueEligibility(state, c.id).ok);
  const view = VIEWS_LABEL[ui.licView] ? ui.licView : mine.length ? 'mine' : 'available';
  const held = Object.values(state.credentials.held).filter((h) => h.status === 'active').length;
  const left = Math.max(0, ATTEMPTS_PER_YEAR - (state.yearly['cred.attempts'] ?? 0));

  const counts = { mine: mine.length, available: available.length };
  const tabs = Object.entries(VIEWS_LABEL).map(([id, label]) => button(`${label}${counts[id] != null ? ` (${counts[id]})` : ''}`, 'ui.set', { arg: `licView=${id}`, variant: view === id ? 'tiny on' : 'tiny' })).join('');

  let body;
  if (view === 'browse') {
    const cat = CATEGORIES[ui.licCat] ? ui.licCat : Object.keys(CATEGORIES)[0];
    const catChips = Object.entries(CATEGORIES).map(([id, c]) => {
      const all = CREDENTIAL_LIST.filter((x) => x.category === id);
      const have = all.filter(isMine).length;
      return button(`${c.icon} ${c.name} ${have}/${all.length}`, 'ui.set', { arg: `licCat=${id}`, variant: id === cat ? 'tiny on' : 'tiny' });
    }).join('');
    const list = CREDENTIAL_LIST.filter((c) => c.category === cat);
    body = `<div class="toggle-row chips-row">${catChips}</div>${cat === 'aviation' ? logbook(state) : ''}<ul class="certs">${list.map((c) => credentialRow(state, c)).join('')}</ul>`;
  } else {
    const list = view === 'mine' ? mine : available;
    const emptyText = view === 'mine' ? 'You don\'t hold any credentials yet. Check "Can pursue now".' : 'Nothing you can start right now — browse by category to see what each one needs.';
    const showLog = view === 'mine' && (state.credentials.logbook.flightHours > 0 || list.some((c) => c.category === 'aviation'));
    body = `${showLog ? logbook(state) : ''}${list.length ? groupedList(state, list) : `<p class="muted">${emptyText}</p>`}`;
  }

  return `${card('Licenses & Certifications', `
    <p><b>${held}</b> active · ${state.credentials.training.length} in training · ${left} of ${ATTEMPTS_PER_YEAR} new credentials left this year</p>
    <details class="fine"><summary>How credentials work</summary>
      <p>One registry for every license and certification. Employers, agencies and volunteer units pay for job-relevant credentials from their training budgets; police, fire, EMS, federal, airline and transit employers run funded academies for their own hires. Convictions can suspend or revoke credentials.</p>
      <p>Exams can be failed — odds depend on your smarts (or fitness and health for physical tests). A prep course helps; failing a training program's final lets you retest without retraining for 2 years. Agency courses are open only to members, and pilots, drivers and academy recruits must pass a medical. State-issued licenses may need a transfer exam when you move.</p>
    </details>
    <div class="toggle-row chips-row">${tabs}</div>
    ${body}`, { icon: '🪪', accent: 'cyan' })}`;
}
