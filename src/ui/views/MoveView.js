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
import { regionsHere } from '../../modules/life/Regions.js';
import { isAbroad, COUNTRIES, citizenshipsOf } from '../../modules/world/Countries.js';
import { IMMIGRATION, nationalityCode, residencyOf, prYearsLeft, naturalizationYearsLeft, speaksLocal, localLanguage, nativeLanguages, birthCountryOf, LANGUAGE_FLUENT, EMIGRATION_COST, onTemporaryVisa } from '../../modules/world/Immigration.js';
import { routesTo, departureBlock, LANGUAGE_CLASS_COST } from '../../modules/world/Migration.js';
import { optionRow } from '../Components.js';

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
  const places = regionsHere(state);
  const states = [...new Set(places.map((r) => r.state))].sort((a, b) => (a === here.state ? -1 : b === here.state ? 1 : STATES[a].name.localeCompare(STATES[b].name)));
  const rows = states.map((sid) => {
    const list = places.filter((r) => r.state === sid);
    return disclosure(`move.${sid}`, `${esc(STATES[sid].name)}`, `<ul class="move-list">${list.map(row).join('')}</ul>`, { open: sid === here.state, count: list.map((r) => r.icon).join(' ') });
  }).join('');
  return passportCard(state) + card('Move', `<p class="muted">You've lived in ${STATES[here.state].name} for ${residencyYears(state)} years. Moving between ${isAbroad(state) ? 'provinces and regions' : 'states'} changes your taxes, which licenses you can use, your tuition and your union protections.</p>${rows}`, { icon: '🗺️', accent: 'cyan' }) + abroadCard(state);
}

const STATUS_LABEL = { visa: 'Temporary visa', permanent: 'Permanent resident' };

/** Passports, your status where you live, and the road to staying for good. */
function passportCard(state) {
  const here = state.character.countryId ?? 'US';
  const passports = citizenshipsOf(state).map((c) => chip(`${COUNTRIES[c].flag} ${COUNTRIES[c].demonym}`, c === here ? 'good' : '')).join(' ');
  const res = residencyOf(state);
  const law = IMMIGRATION[here];
  const lines = [];
  if (res) {
    const visa = law.visas[res.visa]?.name ?? (res.visa === 'family' ? 'Dependent residence' : 'Residence');
    lines.push(`<p>${chip(STATUS_LABEL[res.status] ?? res.status, res.status === 'permanent' ? 'good' : 'warn')} ${esc(visa)}${res.expires != null ? ` · renews at ${res.expires}` : ''}${res.grace != null ? ` · ${chip(`⚠️ Conditions not met: leave by ${res.grace}`, 'bad')}` : ''}${res.removal ? ` ${chip('Removal ordered', 'bad')}` : ''}</p>`);
    if (law.surcharge && res.status === 'visa') lines.push(`<small class="fine">Immigration Health Surcharge ${money(law.surcharge)}/yr while on a visa.</small>`);
    if (onTemporaryVisa(state)) lines.push('<small class="fine">🎓 International-student tuition applies while you\'re on a visa.</small>');
    const pr = prYearsLeft(state);
    if (res.status === 'visa') {
      lines.push(pr == null ? `<small class="why">No route to permanent residence on this visa.</small>`
        : pr > 0 ? `<small class="fine">🪪 ${esc(law.pr.name)} in ${pr} yr</small>`
          : button(`🪪 Apply for ${law.pr.name}`, 'migration.applyPR', { variant: 'small', hint: money(law.pr.fee), disabled: Boolean(state.yearly['migration.pr']) }));
      const spouseHere = state.people.list.find((p) => p.alive && p.relation === 'spouse' && nationalityCode(p) === here);
      if (spouseHere && res.visa !== 'family' && law.visas.family) lines.push(button(`💍 Switch to a ${law.visas.family.name}`, 'migration.adjust', { arg: 'family', variant: 'small', hint: money(law.visas.family.fee) }));
      if (res.visa === 'student' && state.career.job && law.visas.work) lines.push(button(`💼 Switch to a ${law.visas.work.name}`, 'migration.adjust', { arg: 'work', variant: 'small', hint: money(law.visas.work.fee) }));
    }
    const nat = naturalizationYearsLeft(state);
    const dualNote = law.dualIn ? '' : ' · you must give up your other passports';
    lines.push(nat == null ? `<small class="fine">🛂 Citizenship: ${law.nat.needsPR ? 'permanent residence first, then ' : ''}${law.nat.years} yr${law.nat.married ? ` (${law.nat.married} if married to a citizen)` : ''}</small>`
      : nat > 0 ? `<small class="fine">🛂 Citizenship in ${nat} yr${esc(dualNote)}</small>`
        : `${button(`🛂 Apply for ${COUNTRIES[here].demonym} citizenship`, 'migration.naturalize', { variant: 'small', hint: money(law.nat.fee), disabled: !speaksLocal(state, here) || Boolean(state.yearly['migration.nat']) })}<span class="${speaksLocal(state, here) ? 'fine' : 'why'}">${speaksLocal(state, here) ? `Citizenship test${esc(dualNote)}` : `Needs working ${esc(localLanguage(here))}`}</span>`);
  }
  // Languages: what you speak and what you're learning.
  const native = nativeLanguages(birthCountryOf(state));
  const studied = Object.entries(state.migration?.languages ?? {}).filter(([l]) => !native.includes(l));
  const target = localLanguage(here);
  const langs = [...native.map((l) => chip(`🗣️ ${l}`, 'good')), ...studied.map(([l, v]) => chip(`🗣️ ${l} ${v >= LANGUAGE_FLUENT ? '' : `${v}%`}`.trim(), v >= LANGUAGE_FLUENT ? 'good' : ''))].join(' ');
  const learnable = [...new Set([target, ...Object.values(COUNTRIES).map((c) => c.languages[0])])].filter((l) => !native.includes(l) && (state.migration?.languages?.[l] ?? 0) < LANGUAGE_FLUENT);
  const classes = state.character.age >= 12 && learnable.length ? `<div class="btn-row">${learnable.slice(0, 6).map((l) => button(`📚 ${l}`, 'migration.study', { arg: l, variant: 'tiny ghost', hint: money(LANGUAGE_CLASS_COST), disabled: Boolean(state.yearly['migration.study']) })).join('')}</div>` : '';
  const renounce = citizenshipsOf(state).length > 1 ? citizenshipsOf(state).filter((c) => c !== here).map((c) => button(`Renounce ${COUNTRIES[c].demonym}`, 'migration.renounce', { arg: c, variant: 'tiny ghost' })).join('') : '';
  return card('Passports & Residency', `<p>${passports}</p>${lines.join('')}<p>${langs}</p>${classes}${renounce ? `<div class="btn-row">${renounce}</div>` : ''}`, { icon: '🛂', accent: 'cyan', summary: `${citizenshipsOf(state).map((c) => COUNTRIES[c].flag).join('')}${res ? ` · ${STATUS_LABEL[res.status]}` : ''}` });
}

/** Every other country, with each route in and your odds. */
function abroadCard(state) {
  const here = state.character.countryId ?? 'US';
  const block = departureBlock(state);
  const rows = Object.values(COUNTRIES).filter((c) => c.id !== here).map((c) => {
    const routes = routesTo(state, c.id);
    const anyOk = routes.some((r) => r.ok);
    const list = routes.map((r) => optionRow({
      icon: '',
      title: esc(r.label),
      meta: r.ok ? `${r.odds < 1 ? `${Math.round(r.odds * 100)}% approval · ` : ''}${money(EMIGRATION_COST + r.fee)} with the move` : esc(r.reason),
      tone: r.ok ? '' : 'why',
      locked: !r.ok,
      action: button('Apply', 'migration.emigrate', { arg: `${c.id}:${r.kind}`, variant: 'tiny', disabled: !r.ok || Boolean(block) || Boolean(state.yearly[`migration.apply.${c.id}`]) }),
    })).join('');
    const notes = [speaksLocal(state, c.id) ? null : `🗣️ ${localLanguage(c.id)}`, IMMIGRATION[c.id].dualIn ? null : '🛂 No dual citizenship', IMMIGRATION[c.id].birthright === true ? '👶 Birthright citizenship' : null].filter(Boolean).join(' · ');
    return disclosure(`abroad.${c.id}`, `${c.flag} ${esc(c.name)}`, `${notes ? `<small class="fine">${esc(notes)}</small>` : ''}<ul class="job-list">${list}</ul>`, { count: anyOk ? '✓' : null });
  }).join('');
  return card('Move Abroad', `<p class="muted">Your job, home and office stay behind (an intra-company transfer keeps the job). Licenses need recognizing; pension records stay with each country and pay out together.</p>${block ? `<p class="why">${esc(block)}</p>` : ''}${rows}`, { icon: '✈️', accent: 'cyan' });
}
