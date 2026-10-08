/**
 * Move panel: compare regions and states before relocating — cost of living,
 * pay, state income tax, laws, disaster risk, which of your licenses would
 * need transferring, and what happens to your job and pension.
 */
import { esc, money, button, card, chip, disclosure } from '../Components.js';
import { REGIONS, MOVE_COST, regionOf, residencyYears } from '../../modules/life/Regions.js';
import { STATES, topStateRate, DISASTER_LABEL, stateIncomeTax } from '../../modules/life/States.js';
import { CREDENTIALS, RECIPROCITY_LABEL } from '../../modules/credentials/CredentialRegistry.js';
import { PENSION_PLANS } from '../../modules/retirement/PensionPlans.js';
import { tierRent } from '../../modules/realestate/index.js';

function licenseImpact(state, toState) {
  const out = [];
  for (const [id, h] of Object.entries(state.credentials.held)) {
    const c = CREDENTIALS[id];
    if (h.status !== 'active' || c.jurisdiction !== 'state' || h.states?.includes(toState)) continue;
    if (c.reciprocity === 'automatic') continue;
    if (c.reciprocity === 'compact' && STATES[toState].nlc && h.states?.some((s) => STATES[s].nlc)) continue;
    out.push(`${c.icon} ${c.name}: ${RECIPROCITY_LABEL[c.reciprocity]}`);
  }
  return out;
}

export function moveView(state) {
  const here = regionOf(state);
  const job = state.career.job;
  const income = state.finances.lastYear?.gross ?? job?.salary ?? 0;
  const pensionPlan = job?.employer.benefits.pension;
  const row = (r) => {
    const st = STATES[r.state];
    const isHere = r.id === here.id;
    const crossState = r.state !== here.state;
    const licenses = crossState ? licenseImpact(state, r.state) : [];
    const disasters = Object.entries(st.disasters).map(([d, p]) => `${DISASTER_LABEL[d].icon}${Math.round(p * 100)}%`).join(' ');
    const impacts = [];
    if (!isHere && job) impacts.push(job.remote ? `🌐 Remote job stays (pay ×${(r.market / here.market).toFixed(2)})` : job.sector === 'federal' || ['large', 'enterprise'].includes(job.employer.size) ? '📍 Ask for a transfer instead (Career tab)' : '🚪 You\'d leave your job');
    if (!isHere && pensionPlan && !job?.remote) impacts.push(`🏦 ${PENSION_PLANS[pensionPlan].short} pension frozen (deferred)`);
    if (!isHere && crossState) impacts.push('🎓 Out-of-state tuition for 1 yr');
    if (!isHere && state.housing.properties.some((p) => p.use === 'primary')) impacts.push('🏡 Sell or rent out your home');
    return `<li class="move-row ${isHere ? 'here' : ''}">
      <div class="move-head"><span>${r.icon} <b>${esc(r.name)}</b> <small>${r.type} · ${st.name}</small></span>
        ${isHere ? chip('You live here', 'good') : button(`Move (${money(MOVE_COST)})`, 'region.move', { arg: r.id, variant: 'tiny', disabled: state.character.age < 18 })}</div>
      <div class="move-stats">
        ${chip(`🏷️ COL ×${r.col.toFixed(2)}`)} ${chip(`💼 Pay ×${r.market.toFixed(2)}`)} ${chip(`🦅 Fed locality +${Math.round(r.locality * 100)}%`)}
        ${chip(`🧾 State tax ${topStateRate(r.state) ? `${(topStateRate(r.state) * 100).toFixed(1)}% top${income ? ` (~${money(stateIncomeTax(r.state, income))})` : ''}` : 'none'}`, topStateRate(r.state) ? '' : 'good')}
        ${chip(`🔑 Apt ${money(tierRent(state, 'apartment', r.id))}/mo`)}
        ${chip(st.rightToWork ? '✊ Right-to-work' : '✊ Union-friendly')} ${chip(st.cannabis ? '🌿 Cannabis legal' : '🚫 Cannabis illegal')} ${chip(`🍺 DUI ×${st.dui.fineMult}`)} ${chip(`💵 Min wage $${st.minWage}`)}
        ${disasters ? chip(`⚠️ ${disasters}`, 'warn') : ''}
      </div>
      ${licenses.length ? `<small class="why">🪪 Licenses to transfer: ${licenses.map(esc).join(' · ')}</small>` : ''}
      ${impacts.length ? `<small class="fine">${impacts.map(esc).join(' · ')}</small>` : ''}
    </li>`;
  };
  // Your state first, then the rest by name; each state folds open.
  const states = [...new Set(Object.values(REGIONS).map((r) => r.state))].sort((a, b) => (a === here.state ? -1 : b === here.state ? 1 : STATES[a].name.localeCompare(STATES[b].name)));
  const rows = states.map((sid) => {
    const list = Object.values(REGIONS).filter((r) => r.state === sid);
    return disclosure(`move.${sid}`, `${esc(STATES[sid].name)}`, `<ul class="move-list">${list.map(row).join('')}</ul>`, { open: sid === here.state, count: list.map((r) => r.icon).join(' ') });
  }).join('');
  return card('Move', `<p class="muted">You've lived in ${STATES[here.state].name} for ${residencyYears(state)} years. Moving between states changes your taxes, which licenses you can use, your tuition and your union protections.</p>${rows}`, { icon: '🗺️', accent: 'cyan' });
}
