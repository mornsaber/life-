/**
 * Move panel: compare regions and states before relocating — cost of living,
 * pay, state income tax, laws, disaster risk, which of your licenses would
 * need transferring, and what happens to your job and pension.
 */
import { servicePassports, PASSPORT_LABEL, ISSUERS, PASSPORT_ICON } from '../../modules/world/Passports.js';
import { esc, money, button, card, chip, disclosure } from '../Components.js';
import { REGIONS, MOVE_COST, regionOf, residencyYears } from '../../modules/life/Regions.js';
import { STATES, topStateRate, DISASTER_LABEL, stateIncomeTax } from '../../modules/life/States.js';
import { CREDENTIALS, RECIPROCITY_LABEL } from '../../modules/credentials/CredentialRegistry.js';
import { PENSION_PLANS } from '../../modules/retirement/PensionPlans.js';
import { tierRent } from '../../modules/realestate/index.js';
import { regionsHere } from '../../modules/life/Regions.js';
import { isAbroad, COUNTRIES, citizenshipsOf } from '../../modules/world/Countries.js';
import { GAP_YEAR, gapYearCheck } from '../../modules/world/Expat.js';
import { livingAbroad, expatOf } from '../../modules/world/ExpatLife.js';
import { UK_PENSION_FROZEN_IN } from '../../modules/retirement/RetirementEngine.js';
import { IMMIGRATION, ASYLUM, nationalityCode, residencyOf, prYearsLeft, naturalizationYearsLeft, speaksLocal, localLanguage, nativeLanguages, birthCountryOf, LANGUAGE_FLUENT, EMIGRATION_COST, onTemporaryVisa, ASYLUM_COST } from '../../modules/world/Immigration.js';
import { routesTo, departureBlock, LANGUAGE_CLASS_COST, regularizeOptions, keepsBerth } from '../../modules/world/Migration.js';
import { optionRow, kv } from '../Components.js';
import { regimeSummary } from '../../modules/world/Regimes.js';
import { CONTINENT, TRIPS, travelBlock, bestEntry, tripCost, advisory } from '../../modules/world/Travel.js';

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
    if (!isHere && job) impacts.push(keepsBerth(job) ? '🚢 You keep sailing: fly out to each ship' : job.remote ? `🌐 Remote job stays (pay ×${(r.market / here.market).toFixed(2)})` : job.sector === 'federal' || ['large', 'enterprise'].includes(job.employer.size) ? '📍 Ask for a transfer instead (Career tab)' : '🚪 You\'d leave your job');
    if (!isHere && pensionPlan && !job?.remote) impacts.push(`🏦 ${PENSION_PLANS[pensionPlan].short} pension frozen (deferred)`);
    if (!isHere && crossState && !isAbroad(state)) impacts.push('🎓 Out-of-state tuition for 1 yr');
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
  return regimeCard(state) + passportCard(state) + card('Move', `<p class="muted">You've lived in ${STATES[here.state].name} for ${residencyYears(state)} years. Moving between ${isAbroad(state) ? 'provinces and regions' : 'states'} changes your taxes, which licenses you can use, your tuition and your union protections.</p>${rows}`, { icon: '🗺️', accent: 'cyan' }) + expatLifeCard(state) + abroadCard(state) + travelCard(state) + gapYearCard(state) + retireAbroadCard(state);
}

/** Where you could retire, and what follows you there. */
function retireAbroadCard(state) {
  if (state.character.age < 50) return '';
  const here = state.character.countryId ?? 'US';
  const rows = Object.values(COUNTRIES).filter((c) => c.id !== here && IMMIGRATION[c.id].visas.retiree).map((c) => {
    const v = IMMIGRATION[c.id].visas.retiree;
    return `<li>${c.flag} <b>${esc(c.name)}</b> — ${esc(v.name)} <small class="fine">age ${v.minAge}+ · show ${money(v.amount)}${v.permanent ? ' · permanent' : ''}</small></li>`;
  }).join('');
  const ukFrozen = (state.retirement.records?.GB?.length || here === 'GB') ? `<p class="fine">🧊 A UK State Pension is frozen (never uprated) if you retire to ${UK_PENSION_FROZEN_IN.map((c) => COUNTRIES[c].name).join(', ')}.</p>` : '';
  return card('Retiring Abroad', `<p class="muted">Public pensions follow you: each country you worked in pays its share wherever you live. Retiree visas need private health insurance — about ${money(2500 + Math.max(0, state.character.age - 45) * 220)} a year at your age.</p><ul class="history">${rows}</ul>${ukFrozen}`, { icon: '🌴' });
}

/** A year out between school and what comes next. */
const CIRCLE_LABEL = { expat: '🍻 The expat crowd', local: '🏘️ Locals', exchange: '🗣️ Language exchange' };
function expatLifeCard(state) {
  const e = expatOf(state);
  if (!livingAbroad(state) || !e || e.cc !== (state.character.countryId ?? 'US') || e.returnedAt != null) return '';
  const years = state.character.age - e.since;
  const btns = Object.entries(CIRCLE_LABEL).map(([id, label]) => button(label, 'expatLife.circle', { arg: id, variant: e.circle === id ? 'small primary' : 'small' })).join('');
  return card('Life Abroad', `${kv([['Here for', `${years} year${years === 1 ? '' : 's'}`], ['Belonging', `${e.belonging}/100`], ['Your circle', CIRCLE_LABEL[e.circle] ?? 'Still finding it'], ['Settled', e.settled ? 'Yes — this is home' : 'Not yet']])}<p class="muted">Locals and language partners make it feel like home faster; the expat crowd is easier but keeps you a visitor. After a few years you'll decide where to settle.</p><div class="action-grid">${btns}</div>`, { icon: '🧳', accent: 'cyan', summary: `Belonging ${e.belonging}` });
}

function gapYearCard(state) {
  const check = gapYearCheck(state);
  if (state.character.age < 17 || state.character.age > 26 || state.migration?.gapYear) return '';
  const rows = Object.entries(GAP_YEAR).map(([id, g]) => button(g.label, 'expat.gapYear', { arg: id, variant: 'small', hint: g.cost ? money(g.cost) : 'Earn instead', disabled: !check.ok })).join('');
  return card('Gap Year', `<p class="muted">A year off: travel, volunteer abroad or work and save. Working-holiday visas (Move Abroad below) let young people work their way around partner countries.</p>${check.ok ? '' : `<p class="why">${esc(check.reason)}</p>`}<div class="action-grid">${rows}</div>`, { icon: '🎒' });
}

const STATUS_LABEL = { visa: 'Temporary visa', permanent: 'Permanent resident', asylum: 'Asylum seeker', refugee: 'Refugee', undocumented: 'No legal status' };

/** Passports, your status where you live, and the road to staying for good. */
const REGIME_WORDS = {
  elections: { free: 'Free and contested', controlled: 'Held, but the ruling side always wins', sham: 'One candidate per seat; turnout 99.9%', none: 'None' },
  press: { free: 'Free', state: 'State-controlled' },
  exit: { free: 'Free to leave', restricted: 'Exit permits; travel bans for critics', closed: 'Leaving without permission is a crime' },
  business: { free: 'Free enterprise', restricted: 'Licences go to the connected', state: 'Illegal: the state owns everything' },
  religion: { free: 'Free', state: 'A state religion; apostasy is a crime', restricted: 'Registered congregations only', banned: 'Banned' },
  internet: { open: 'Open', censored: 'Censored (VPNs needed)', none: 'None: a national intranet' },
  women: { equal: 'Equal in law', restricted: 'Dress codes, guardianship, some jobs closed', barred: 'No school past 12, no university, most work closed' },
  banking: { open: 'Open', domestic: 'Cut off from Visa, Mastercard and SWIFT', state: 'No consumer credit; cash only' },
};

/** What life is like under this government, and what you can do about it. */
function regimeCard(state) {
  const { r, s } = regimeSummary(state);
  const c = COUNTRIES[state.character.countryId ?? 'US'];
  if (r.kind === 'democracy' && !s) return '';
  const g = state.regime ?? {};
  const rows = [
    ['Government', esc(r.name ?? r.kind)],
    r.leader ? ['Rules', esc(r.leader)] : null,
    ['Elections', esc(REGIME_WORDS.elections[r.elections])],
    ['Press', esc(REGIME_WORDS.press[r.press] ?? r.press)],
    ['Leaving', esc(REGIME_WORDS.exit[r.exit])],
    r.business !== 'free' ? ['Business', esc(REGIME_WORDS.business[r.business])] : null,
    r.religion !== 'free' ? ['Religion', esc(REGIME_WORDS.religion[r.religion])] : null,
    r.internet !== 'open' ? ['Internet', esc(REGIME_WORDS.internet[r.internet])] : null,
    r.women !== 'equal' ? ['Women', esc(REGIME_WORDS.women[r.women])] : null,
    r.banking !== 'open' ? ['Banking', esc(REGIME_WORDS.banking[r.banking])] : null,
    r.jobs === 'assigned' ? ['Work', 'Assigned by the state'] : null,
    r.alcohol === false ? ['Alcohol', 'Prohibited'] : null,
    r.songbun && g.songbun ? ['Your songbun', `${esc(g.songbun)} class${g.songbun === 'hostile' ? ' — barred from the Party, university and Pyongyang' : g.songbun === 'core' ? ' — trusted by the state' : ''}`] : null,
    s ? ['Sanctions', `${chip(`🚫 Level ${s.level}`, s.level >= 2 ? 'bad' : 'warn')} by ${esc(s.by)}<br><small class="fine">${esc(s.note)}</small>`] : null,
    g.sanctioned ? ['You', `<span class="neg">Personally sanctioned by ${esc(g.sanctioned.by)}${g.sanctioned.travelBan ? ': no travel to the West' : ''}</span>`] : null,
  ];
  const adult = state.character.age >= 16;
  const btns = [
    adult ? button('📢 Speak out', 'regime.speakOut', { hint: r.press === 'free' ? 'Free speech' : `Risky: ≈${Math.round(Math.min(0.9, r.surveillance * (1 + (g.dissent ?? 0) * 0.4)) * 100)}% arrest`, disabled: Boolean(state.yearly['regime.speakOut']) }) : '',
    r.business === 'state' && adult ? button('🧺 Trade at the market', 'regime.trade', { hint: 'Jangmadang: the real economy', disabled: Boolean(state.yearly['regime.trade']) }) : '',
    r.foreignMedia && state.character.age >= 14 ? button(g.foreignMedia ? '💾 Stop watching foreign dramas' : '💾 Watch smuggled foreign dramas', 'regime.foreignMedia', { hint: g.foreignMedia ? 'Safer' : '+Happiness, but the 109 Group raids' }) : '',
    r.exit === 'closed' && adult ? button('🌊 Defect', 'regime.defect', { variant: 'danger', hint: 'Across the river, then to Seoul' }) : '',
  ].join('');
  return card(`Life in ${esc(c.name)}`, `${kv(rows.filter(Boolean))}${btns ? `<div class="action-grid">${btns}</div>` : ''}`, { icon: c.flag, accent: r.kind === 'democracy' ? 'yellow' : 'red', summary: esc(r.name ?? '') });
}

/** Holidays abroad, on your passports. */
function travelCard(state) {
  if (state.character.age < 18) return '';
  const here = state.character.countryId ?? 'US';
  const tr = state.travel ?? { countries: [] };
  const KIND = { free: ['✅', 'good'], eta: ['📝', 'good'], evisa: ['💻', ''], tour: ['🚌', 'warn'], visa: ['🛂', 'warn'] };
  const groups = Object.entries(CONTINENT).map(([name, list]) => {
    const rows = list.filter((cc) => COUNTRIES[cc] && cc !== here).map((cc) => {
      const c = COUNTRIES[cc];
      const why = travelBlock(state, cc);
      const e = why ? null : bestEntry(state, cc);
      const warn = why ? null : advisory(state, cc);
      const k = e ? KIND[e.kind] ?? ['🛂', ''] : null;
      return `<li class="move-row"><div class="move-head">${c.flag} <b>${esc(c.name)}</b>${tr.countries?.includes(cc) ? ' <small class="fine">✓ visited</small>' : ''}</div>
        ${why ? `<small class="why">${esc(why)}</small>` : `<div class="chips">${chip(`${k[0]} ${COUNTRIES[e.passport]?.flag ?? ''} ${e.note}${e.refusal >= 0.1 ? ` · ≈${Math.round(e.refusal * 100)}% refused` : ''}`, k[1])}${warn ? ` ${chip(`⚠️ ${warn}`, 'bad')}` : ''} ${chip(`from ${money(tripCost(state, cc, 'budget'))}`)}</div>${button('✈️ Plan a trip', 'travel.plan', { arg: cc, variant: 'small', disabled: (state.yearly['travel.trip'] ?? 0) >= 2 })}`}
      </li>`;
    }).join('');
    return disclosure(`travel.${name}`, esc(name), `<ul class="move-list">${rows}</ul>`, { count: list.filter((cc) => cc !== here && COUNTRIES[cc] && !travelBlock(state, cc)).length });
  }).join('');
  const out = travelBlock(state, Object.keys(COUNTRIES).find((cc) => cc !== here));
  return card('Travel Abroad', `<p class="muted">Holidays on your own passports — ${Object.keys(TRIPS).length} styles, up to two trips a year. Free movement, e-visas and visa-free deals depend on the passport; some countries refuse some passports outright.</p>${out && /leave|travel ban|Undocumented|asylum|custody/i.test(out) ? `<p class="why">${esc(out)}</p>` : groups}`, { icon: '✈️', accent: 'cyan', summary: tr.countries?.length ? `${tr.countries.length} countries visited` : '' });
}

function passportCard(state) {
  const here = state.character.countryId ?? 'US';
  const passports = citizenshipsOf(state).map((c) => chip(`${COUNTRIES[c].flag} ${COUNTRIES[c].demonym}`, c === here ? 'good' : '')).join(' ');
  const res = residencyOf(state);
  const law = IMMIGRATION[here];
  const lines = [];
  if (res) {
    const asylumLaw = ASYLUM[here];
    const visa = res.status === 'undocumented' ? `Overstayed since age ${res.overstaySince}: cash work only, and removal with a re-entry ban if caught`
      : res.status === 'asylum' ? `${asylumLaw.name}${res.tolerated ? ' (refused — tolerated stay)' : res.appealed ? ' (on appeal)' : ''}`
      : res.temporary ? asylumLaw.temporary
        : res.status === 'refugee' ? 'Refugee status'
          : res.visa === 'freeMovement' ? `Right to live and work (${res.scheme ?? 'free movement'})`
          : res.status === 'permanent' && !law.visas[res.visa]?.permanent ? law.pr?.name ?? 'Permanent residence' : law.visas[res.visa]?.name ?? (res.visa === 'family' ? 'Dependent residence' : 'Residence');
    lines.push(`<p>${chip(STATUS_LABEL[res.status] ?? res.status, res.status === 'permanent' ? 'good' : 'warn')} ${esc(visa)}${res.expires != null ? ` · renews at ${res.expires}` : ''}${res.grace != null ? ` · ${chip(`⚠️ Conditions not met: leave by ${res.grace}`, 'bad')}` : ''}${res.removal ? ` ${chip('Removal ordered', 'bad')}` : ''}</p>`);
    if (res.status === 'undocumented') {
      const opts = regularizeOptions(state);
      lines.push(`<small class="fine">${res.irregular ? 'You crossed without papers' : 'You overstayed'}. Getting legal status is hard, and applying means coming forward: a refusal can end in removal.</small>`);
      lines.push(`<div class="toggle-row">${opts.map((o) => button(o.label, 'migration.regularize', { arg: o.id, variant: 'small', disabled: !o.ok || Boolean(state.yearly['migration.regularize']), hint: o.ok ? `≈${Math.round(o.odds * 100)}% · ${money(o.fee)} with a lawyer` : o.reason })).join('')}</div>`);
    }
    if (res.status === 'asylum') {
      lines.push(`<small class="fine">⏳ Decision ${res.decisionAt > state.character.age ? `in ${res.decisionAt - state.character.age} yr` : 'due this year'} · ${state.character.age < res.workFrom ? 'no permission to work yet' : 'may work'} · reception housing${asylumLaw.support ? ` · ${money(asylumLaw.support)}/yr support` : ''}</small>`);
    }
    if (res.status === 'refugee') {
      const pr = prYearsLeft(state);
      lines.push(pr == null ? '<small class="fine">🛡️ Protected as a refugee. No route to permanent residence here.</small>'
        : pr > 0 ? `<small class="fine">🛡️ Protected as a refugee · permanent residence in ${pr} yr</small>`
          : button('🪪 Apply for permanent residence', 'migration.applyPR', { variant: 'small', hint: money(law.pr?.fee ?? 0), disabled: Boolean(state.yearly['migration.pr']) }));
    }
    if (law.surcharge && res.status === 'visa') lines.push(`<small class="fine">Immigration Health Surcharge ${money(law.surcharge)}/yr while on a visa.</small>`);
    if (onTemporaryVisa(state) && (res.visa === 'student' || state.education.enrolled)) lines.push('<small class="fine">🎓 International-student tuition applies while you\'re on a visa.</small>');
    const pr = prYearsLeft(state);
    if (res.status === 'visa') {
      lines.push(pr == null ? `<small class="why">No route to permanent residence on this visa.</small>`
        : pr > 0 ? `<small class="fine">🪪 ${esc(law.pr.name)} in ${pr} yr</small>`
          : button(`🪪 Apply for ${law.pr.name}`, 'migration.applyPR', { variant: 'small', hint: money(law.pr.fee), disabled: Boolean(state.yearly['migration.pr']) }));
      const spouseHere = state.people.list.find((p) => p.alive && p.relation === 'spouse' && nationalityCode(p) === here);
      if (spouseHere && res.visa !== 'family' && law.visas.family) lines.push(button(`💍 Switch to a ${law.visas.family.name}`, 'migration.adjust', { arg: 'family', variant: 'small', hint: money(law.visas.family.fee) }));
      if (['student', 'workingHoliday', 'nomad'].includes(res.visa) && state.career.job && law.visas.work) lines.push(button(`💼 Switch to a ${law.visas.work.name}`, 'migration.adjust', { arg: 'work', variant: 'small', hint: money(law.visas.work.fee) }));
    }
    const nat = naturalizationYearsLeft(state);
    const dualNote = law.dualIn ? '' : ' · you must give up your other passports';
    lines.push(nat == null ? `<small class="fine">🛂 Citizenship: ${law.nat.fromArrival ? `${law.nat.years} yr here, the last ${law.nat.prMin} as a permanent resident` : `${law.nat.needsPR ? 'permanent residence first, then ' : ''}${law.nat.years} yr`}${law.nat.married ? ` (${law.nat.married} if married to a citizen)` : ''}</small>`
      : nat > 0 ? `<small class="fine">🛂 Citizenship in ${nat} yr${esc(dualNote)}</small>`
        : `${button(`🛂 Apply for ${COUNTRIES[here].demonym} citizenship`, 'migration.naturalize', { variant: 'small', hint: money(law.nat.fee), disabled: !speaksLocal(state, here) || Boolean(state.yearly['migration.nat']) })}<span class="${speaksLocal(state, here) ? 'fine' : 'why'}">${speaksLocal(state, here) ? `Citizenship test${esc(dualNote)}` : `Needs working ${esc(localLanguage(here))}`}</span>`);
  }
  const a = state.migration?.assignment;
  if (a) lines.push(`<p>${chip('🌐 Overseas assignment', 'good')} <small class="fine">From ${esc(COUNTRIES[a.home].name)} · ends at ${a.endsAt} · housing paid · ${Math.round(a.uplift * 100)}% allowance</small></p>`);
  // Languages: what you speak and what you're learning.
  const native = nativeLanguages(birthCountryOf(state));
  const studied = Object.entries(state.migration?.languages ?? {}).filter(([l]) => !native.includes(l));
  const target = localLanguage(here);
  const langs = [...native.map((l) => chip(`🗣️ ${l}`, 'good')), ...studied.map(([l, v]) => chip(`🗣️ ${l} ${v >= LANGUAGE_FLUENT ? '' : `${v}%`}`.trim(), v >= LANGUAGE_FLUENT ? 'good' : ''))].join(' ');
  const learnable = [...new Set([target, ...Object.values(COUNTRIES).map((c) => c.languages[0])])].filter((l) => !native.includes(l) && (state.migration?.languages?.[l] ?? 0) < LANGUAGE_FLUENT);
  const classes = state.character.age >= 12 && learnable.length ? `<div class="btn-row">${learnable.slice(0, 6).map((l) => button(`📚 ${l}`, 'migration.study', { arg: l, variant: 'tiny ghost', hint: money(LANGUAGE_CLASS_COST), disabled: Boolean(state.yearly['migration.study']) })).join('')}</div>` : '';
  const renounce = citizenshipsOf(state).length > 1 ? citizenshipsOf(state).filter((c) => c !== here).map((c) => button(`Renounce ${COUNTRIES[c].demonym}`, 'migration.renounce', { arg: c, variant: 'tiny ghost' })).join('') : '';
  const service = servicePassports(state).map((p) => chip(`${PASSPORT_ICON[p.kind]} ${COUNTRIES[p.country]?.flag ?? ISSUERS[p.country]?.flag ?? ''} ${PASSPORT_LABEL[p.kind]} · ${esc(p.why)}`, p.kind === 'diplomatic' ? 'honor' : 'cyan')).join(' ');
  return card('Passports & Residency', `<p>${passports}${service ? ` ${service}` : ''}</p>${service ? '<p class="fine">Official and diplomatic passports belong to the state: they\'re for travel on duty, and go back when the job ends — except that former heads of state and government, foreign ministers and sovereigns keep a diplomatic passport for life. Immunity comes with accreditation, not the passport.</p>' : ''}${lines.join('')}<p>${langs}</p>${classes}${renounce ? `<div class="btn-row">${renounce}</div>` : ''}`, { icon: '🛂', accent: 'cyan', summary: `${citizenshipsOf(state).map((c) => COUNTRIES[c].flag).join('')}${res ? ` · ${STATUS_LABEL[res.status]}` : ''}` });
}

/** Every other country, with each route in and your odds: your best options first, the rest by continent. */
function abroadCard(state) {
  const here = state.character.countryId ?? 'US';
  const block = departureBlock(state);
  const routesFor = {};
  const country = (c) => {
    const routes = routesFor[c.id] ?? routesTo(state, c.id);
    const anyOk = routes.some((r) => r.ok);
    const list = routes.map((r) => optionRow({
      icon: '',
      title: esc(r.label),
      meta: r.ok ? (r.kind === 'irregular' ? `⚠️ Illegal · ${money(r.fee)} to a smuggler · caught: sent back and banned · then life without papers` : r.kind === 'asylum' ? `${r.temporary ? 'Granted on arrival' : `≈${Math.round(r.odds * 100)}% recognized`} · ${money(ASYLUM_COST)} to get out` : `${r.odds < 1 ? `${Math.round(r.odds * 100)}% approval · ` : ''}${money(EMIGRATION_COST + r.fee)} with the move`) : esc(r.reason),
      tone: r.ok ? '' : 'why',
      locked: !r.ok,
      action: button(r.kind === 'irregular' ? 'Cross' : 'Apply', 'migration.emigrate', { arg: `${c.id}:${r.kind}`, variant: r.kind === 'irregular' ? 'tiny danger' : 'tiny', disabled: !r.ok || Boolean(block) || Boolean(state.yearly[`migration.apply.${c.id}`]) }),
    })).join('');
    const notes = [speaksLocal(state, c.id) ? null : `🗣️ ${localLanguage(c.id)}`, IMMIGRATION[c.id].dualIn ? null : '🛂 No dual citizenship', IMMIGRATION[c.id].birthright === true ? '👶 Birthright citizenship' : null].filter(Boolean).join(' · ');
    return disclosure(`abroad.${c.id}`, `${c.flag} ${esc(c.name)}`, `${notes ? `<small class="fine">${esc(notes)}</small>` : ''}<ul class="job-list">${list}</ul>`, { count: anyOk ? '✓' : null });
  };
  const others = Object.values(COUNTRIES).filter((c) => c.id !== here);
  for (const c of others) routesFor[c.id] = routesTo(state, c.id);
  // The easiest legal routes for you: home, free movement, then visas by their odds.
  const RANK = { citizen: 0, resident: 1, freeMovement: 2 };
  const best = others.map((c) => ({ c, r: routesFor[c.id].filter((r) => r.ok && r.kind !== 'irregular' && r.kind !== 'asylum').sort((a, b) => (RANK[a.kind] ?? 3) - (RANK[b.kind] ?? 3) || (b.odds ?? 0) - (a.odds ?? 0))[0] }))
    .filter((x) => x.r).sort((a, b) => (RANK[a.r.kind] ?? 3) - (RANK[b.r.kind] ?? 3) || (b.r.odds ?? 0) - (a.r.odds ?? 0) || a.c.name.localeCompare(b.c.name)).slice(0, 8);
  const top = best.length ? `<h4 class="sub">⭐ Your best options</h4>${best.map(({ c }) => country(c)).join('')}` : '<p class="muted">No legal route is open to you right now — study, a job offer, family or savings open most of them.</p>';
  const groups = Object.entries(CONTINENT).map(([name, ids]) => {
    const list = ids.map((id) => COUNTRIES[id]).filter((c) => c && c.id !== here).sort((a, b) => a.name.localeCompare(b.name));
    const open = list.filter((c) => routesFor[c.id].some((r) => r.ok && r.kind !== 'irregular')).length;
    return disclosure(`abroad.group.${name}`, esc(name), list.map(country).join(''), { count: `${open}/${list.length}` });
  }).join('');
  return card('Move Abroad', `<p class="muted">Your job, home and office stay behind (an intra-company transfer keeps the job). Licenses need recognizing; pension records stay with each country and pay out together.</p>${keepsBerth(state.career.job) ? '<p class="fine">🚢 Seafarers live anywhere: you keep your berth and fly out from your new home to join each ship. STCW certificates are valid worldwide.</p>' : ''}${block ? `<p class="why">${esc(block)}</p>` : ''}${top}<h4 class="sub">🌍 Every country</h4>${groups}`, { icon: '✈️', accent: 'cyan' });
}
