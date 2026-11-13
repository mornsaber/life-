/**
 * The Crown on the Politics tab: the monarch and the heir where you live, a born royal's own
 * life (title, place in the line, popularity, duties), and a peer's title.
 */
import { houseTitle } from '../../modules/world/Houses.js';
import { esc, money, button, card, meter, kv, chip, disclosure, select } from '../Components.js';
import { fullName, ageOf } from '../../modules/people/People.js';
import { styledName } from '../../modules/world/Honours.js';
import { CROWNS, crownOf, monarchName, ROYAL_LEVELS, royalStyledName } from '../../modules/world/Crown.js';
import { currentYear, yearlyCount } from '../../core/State.js';
import { peerAddress, RANKS, numberedTitle, subsidiaryTitles, rankLabel, peerTitle } from '../../modules/world/Peerage.js';
import { estateOf, STRATEGIES, nobleAllowance, isGrandee } from '../../modules/world/Nobility.js';
import { knighthoodsOn, KNIGHTHOODS_DEFAULT } from '../../modules/world/Honours.js';
import { conferOptions, militaryPosts, ROYAL_ORDERS, PEERAGE_GRANTS } from '../../modules/world/RoyalHousehold.js';
import { DECREES, seizeCheck } from '../../modules/world/Sovereign.js';
import { royalEstate, DUCHY_MODES } from '../../modules/world/RoyalLife.js';
import { VICE_REGAL, youAdvise } from '../../modules/politics/ViceRegal.js';
import { OFFICES } from '../../modules/politics/Offices.js';
import { dynasticTitles, dynasticName, supportableHouse, ennobleOptions, ennobled } from '../../modules/world/DynasticTitles.js';
import { FORMER_HOUSES, houseOf, monarchistSupport, leads, nobleBorn, houseStyledName, houseConferOptions } from '../../modules/world/Houses.js';
import { titleInsignia, crownBadge } from '../Insignia.js';
import { lineView, lawFor } from '../../modules/world/RoyalLine.js';
import { throneKind, GOVERNMENTS, BUDGETS, crownPrinceChoices, MY_STATES, rulerTitle } from '../../modules/world/Throne.js';
import { diaryOptions, diaryBudget, daysUsed, diaryOpen } from '../../modules/world/RoyalDiary.js';

/** The sovereign's honours: one row per person, with what you can give them. */
function honoursCard(state) {
  const r = state.royal;
  const o = ROYAL_ORDERS[r.crownId];
  const left = Math.max(0, 3 - yearlyCount(state, 'royalHousehold.confer'));
  const byPerson = new Map();
  for (const x of conferOptions(state)) {
    if (!byPerson.has(x.person.id)) byPerson.set(x.person.id, { p: x.person, opts: [] });
    byPerson.get(x.person.id).opts.push(x);
  }
  const row = (p, opts) => {
    const held = [p.peerage?.title, p.dukedom, p.title && !/ of /.test(p.title) ? p.title : null].filter(Boolean).filter((t, i, a) => a.indexOf(t) === i);
    const what = (x) => x.label.replace(/^\S+ /, '').replace(new RegExp(`\\b${p.firstName}\\b ?`), '');
    return `<li class="honour-row" data-collect-root>
      <span class="who"><b>${esc(`${p.firstName} ${p.lastName}`)}</b> <small>${esc(RELATION[p.relation] ?? p.relation)}${held.length ? ` · ${esc(held.join(', '))}` : ''}</small></span>
      ${opts.length > 1 ? `<select data-part="pick" aria-label="Honour for ${esc(p.firstName)}">${opts.map((x) => `<option value="${esc(`${x.person.id}|${x.id}`)}">${esc(what(x))}</option>`).join('')}</select>` : `<input type="hidden" data-part="pick" value="${esc(`${opts[0].person.id}|${opts[0].id}`)}"><span class="what">${esc(what(opts[0]))}</span>`}
      ${button('Confer', 'royalHousehold.confer', { variant: 'tiny', collect: true, disabled: !left })}
    </li>`;
  };
  const people = [...byPerson.values()];
  const rows = people.map(({ p, opts }) => row(p, opts));
  const pub = `<li class="honour-row"><span class="who"><b>A deserving member of the public</b></span><span class="what">A nurse, a lifeboat coxswain, a national hero</span>${button('Confer', 'royalHousehold.confer', { arg: 'public', variant: 'tiny', disabled: !left })}</li>`;
  return card('Honours', `<p class="muted honour-intro">${chip(`${left} of 3 left this year`, left ? 'good' : '')} Your own gifts: the ${esc(o.great[0])}, the ${esc(o.personal[0])}${PEERAGE_GRANTS[r.crownId] ? ', peerages' : ''}, titles for your family and honorary ranks.</p>
    <ul class="honour-list">${pub}${rows.slice(0, 6).join('')}</ul>
    ${rows.length > 6 ? disclosure('crown.honours.more', 'Everyone else', `<ul class="honour-list">${rows.slice(6).join('')}</ul>`, { count: rows.length - 6 }) : ''}`, { icon: '🎗️' });
}
const RELATION = { bestFriend: 'best friend', coworker: 'colleague', grandchild: 'grandchild', niece: 'niece', nephew: 'nephew' };

/** Powers the sovereign uses by choice: the audience, the State Opening, state visits, charters — and, for the bold, rule. */
function powersCard(state) {
  const r = state.royal;
  const used = (k) => yearlyCount(state, `sovereign.${k}`) > 0;
  const seize = seizeCheck(state);
  const constitutional = `<div class="action-grid">
    ${button('🤝 Audience with the prime minister', 'sovereign.audience', { hint: used('audience') ? 'Done this year' : 'Encourage or warn', disabled: used('audience') })}
    ${r.executive ? '' : button('🏛️ Open Parliament', 'sovereign.openParliament', { hint: used('open') ? 'Done this year' : 'Influence +4', disabled: used('open') })}
    ${button('🌍 Host a state visit', 'sovereign.stateVisit', { hint: used('visit') ? 'Done this year' : 'Influence and popularity', disabled: used('visit') })}
    ${button('📜 Grant a royal charter', 'sovereign.charter', { hint: used('charter') ? 'Done this year' : 'A university, a city, a society', disabled: used('charter') })}
  </div>`;
  const decrees = r.executive ? `<h4 class="sub">Rule by decree <small class="muted">${Math.max(0, 2 - yearlyCount(state, 'sovereign.decree'))} of 2 left this year</small></h4>
    <div class="enroll-form" data-collect-root>${select('decree', Object.entries(DECREES).map(([id, d]) => ({ value: id, label: d.label })))}${button('Issue the decree', 'sovereign.decree', { variant: 'small primary', collect: true, disabled: yearlyCount(state, 'sovereign.decree') >= 2 })}</div>
    <div class="action-grid">${button('🗳️ Dismiss the government', 'sovereign.dismissGovernment', { hint: 'Once a year', disabled: used('dismiss') })}${button('🏛️ Restore parliament', 'sovereign.restoreConstitution', { hint: 'Give the powers back' })}</div>
    <p class="fine">Every decree stirs unrest. Too much, with too little popularity, and the crowds bring the monarchy down.</p>` : '';
  const coup = r.executive ? '' : disclosure('crown.seize', '⚔️ Take real power', `<p class="fine">Suspend parliament and govern yourself. It needs popularity and influence; failing means a referendum on the monarchy.</p>
    <div class="action-grid">${button('⚔️ Dismiss the government and rule', 'sovereign.seizePower', { variant: 'danger', disabled: !seize.ok, hint: seize.ok ? `~${Math.round(seize.odds * 100)}% the army stands by you` : seize.reason })}</div>`);
  return card('Sovereign Powers', `${constitutional}${decrees}${coup}`, { icon: '⚖️' });
}

export function crownParts(state) {
  const r = state.royal;
  const crownId = r?.crownId ?? crownOf(state);
  const c = crownId ? state.world?.crowns?.[crownId] : null;
  const def = crownId ? CROWNS[crownId] : null;
  const parts = {};
  if (c) {
    const realms = def.realms.filter((cc) => !state.world.republics?.[cc]);
    const crises = (state.world.crises ?? []).filter((x) => x.cc === (state.character.countryId ?? 'US'));
    parts.crown = (card('The Crown', `${kv([
      ['Monarch', `${esc(monarchName(state, crownId))}${c.monarch.you ? ' (you)' : ''} · ${esc(houseTitle(c.house).replace(/^the /, ''))}`],
      ['Reigning since', `${c.since} (${currentYear(state) - c.since} yr)`],
      ['Heir', c.monarch.you ? esc(c.heir.name) : `${esc(c.heir.name)}, ${esc(def.titles.heir[c.heir.gender === 'female' ? 1 : 0])}${c.heir.you ? ' (you)' : ''}`],
      realms.length > 1 ? ['Realms', realms.join(' · ')] : null,
      ['Support for the monarchy', `${Math.round(monarchistSupport(state, state.character.countryId ?? crownId))}%${realms.length > 1 ? ` here · ${realms.map((x) => `${x} ${Math.round(monarchistSupport(state, x))}%`).join(', ')}` : ''}`],
      crises.length ? ['Last constitutional crisis', `${crises.at(-1).year}`] : null,
      ...Object.values(state.world?.viceRegal ?? {}).filter((h) => VICE_REGAL[h.postId]?.country === (state.character.countryId ?? 'US') && OFFICES[h.postId]).map((h) => [esc(OFFICES[h.postId].name), `${esc(h.name)}${h.you ? ' (you)' : ` · ${esc(h.background)}`} · until ${h.until}`]),
      (state.character.countryId ?? 'US') in KNIGHTHOODS_DEFAULT ? ['Knighthoods in the national order', knighthoodsOn(state, state.character.countryId) ? 'Awarded' : 'Not awarded (abolished)'] : null,
    ].filter(Boolean))}
    ${Object.entries(state.world?.viceRegal ?? {}).filter(([, h]) => !h.you && youAdvise(state, h.postId)).map(([key, h]) => `<p class="fine">You advise ${esc(state.character.countryId === 'CA' && h.postId === 'ca_lg' ? 'the Governor General' : 'the Crown')} on the ${esc(OFFICES[h.postId].name)}: when ${esc(h.name)}'s term ends, the shortlist comes to you.</p><div class="action-grid">${button(`📜 Advise recalling ${esc(h.name)}`, 'viceRegal.recall', { arg: key, variant: 'danger', hint: 'Rare, and costly' })}</div>`).join('')}
    ${/^(au|nz)_pm$/.test(state.politics?.office?.id ?? '') ? `<div class="action-grid">${button(knighthoodsOn(state, state.character.countryId) ? '📜 Abolish new knighthoods' : '⚔️ Restore knighthoods', 'honours.knighthoods', { hint: 'On your advice; unpopular to restore' })}</div>` : ''}`, { icon: '👑' }));
  }
  if (r) {
    const lv = ROYAL_LEVELS[r.level];
    const working = r.working && !r.reigning;
    const mil = militaryPosts(state);
    const reign = r.reigning && c ? currentYear(state) - c.since : 0;
    parts.royal = (card(r.reigning ? 'Your Reign' : 'Royal Life', `
      <div class="row-end" style="justify-content:flex-start;margin-top:0">${crownBadge(r.reigning ? 'sovereign' : r.line === 1 ? 'heir' : 'royal')}</div>
      ${meter(r.popularity ?? 60, { label: '📰 Popularity' })}
      ${r.reigning ? meter(r.influence ?? 30, { label: '🤝 Influence with the government', tone: 'mid' }) : ''}
      ${r.executive ? meter(r.unrest ?? 0, { label: '🔥 Unrest', tone: (r.unrest ?? 0) >= 50 ? 'bad' : 'mid' }) : ''}
      ${kv([
        ['Styled', esc(royalStyledName(state) ?? `${state.character.firstName} ${state.character.lastName}`)],
        // A royal dukedom is part of the royal style, not a separate peerage.
        state.character.peerage?.kind === 'royal' || state.character.style?.peerage ? ['Royal title', `${esc(state.character.style?.peerage ?? '')}${state.character.peerage?.subsidiary?.length ? ` · also ${esc(state.character.peerage.subsidiary.join(', '))}` : ''}`] : null,
        r.reigning ? ['Reign', `${reign} year${reign === 1 ? '' : 's'}${c && !c.crowned ? ' · not yet crowned' : ''}${r.executive ? ' · ruling by decree' : ''}`] : ['Born', esc(lv?.name ?? r.level)],
        r.reigning ? (c?.heir ? ['Heir', esc(c.heir.name)] : null) : ['Line of succession', r.line == null ? 'Not in the line (the succession law)' : `${r.line}${r.line === 1 ? ' — the heir' : ''}`],
        r.reigning ? null : ['Status', r.working ? 'Working royal' : r.steppedBack ? 'Stepped back' : 'Private life'],
        ['Allowance', r.reigning ? `${money(20000000)}/yr` : r.working ? `${money(r.line === 1 ? ROYAL_LEVELS.heir.allowance : lv?.allowance ?? 0)}/yr from the ${esc(def.grant)} (from 18)` : 'Family trust only'],
        r.patronages?.length ? ['Patronages', esc(r.patronages.join(', '))] : null,
        mil.rank && !r.reigning ? ['Armed forces', `${titleInsignia(mil.rank, state.character.countryId ?? 'GB')} ${esc(mil.rank)}`] : null,
        r.household?.conferred ? ['Honours conferred', String(r.household.conferred)] : null,
      ].filter(Boolean))}
      ${mil.posts.length || (mil.rank && r.reigning) ? disclosure('crown.military', '🎖️ Military appointments', `${mil.rank ? `<p class="fine">${esc(mil.rank)}</p>` : ''}<ul class="history">${mil.posts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`, { count: mil.posts.length }) : ''}
      <div class="action-grid">
        ${!r.reigning && state.character.age >= 18 && state.character.age <= 30 && !state.military.service ? button('🎖️ Serve in the armed forces', 'royalHousehold.serve', { hint: 'As an officer cadet' }) : ''}
        ${working ? button('🚪 Step back from royal duties', 'crown.stepBack', { variant: 'danger', hint: 'No grant, no title in use. For good.' }) : ''}
      </div>
      ${state.character.age >= 18 ? disclosure('crown.leave', r.reigning ? '🚪 Leave the throne' : '🚪 Leave royal life', `<div class="action-grid">
        ${r.reigning ? button('📜 Abdicate', 'crown.abdicate', { variant: 'danger', hint: 'The heir reigns' }) : ''}
        ${button(r.reigning ? '🚪 Abdicate and renounce everything' : '🚪 Renounce your rights and titles', 'crown.renounce', { variant: 'danger', hint: 'Titles, line, grant — for good' })}</div>`) : ''}
      <p class="fine">${r.reigning ? 'Assent, mercy, dissolutions and crises come to you through the year; the powers below are yours to use when you choose.' : 'Working royals live on the grant and in the papers. A commercial job makes headlines; stepping back frees you to have a career of your own.'}</p>`, { icon: '👑', accent: 'yellow' }));
    if (r.reigning) { parts.honours = honoursCard(state); parts.powers = powersCard(state); }
  }
  const p = state.character.peerage;
  if (p && !(r && p.kind === 'royal')) {
    parts.peerage = (card('Your Peerage', `${kv([
      ['Title', esc(numberedTitle(state) ?? '')],
      p.subsidiary?.length ? ['Lesser titles', esc(p.subsidiary.join(', '))] : null,
      ['Rank', esc(rankLabel(p.rank, state.character.gender, p.cc ?? 'GB'))],
      ['Addressed as', esc(peerAddress(state) ?? '')],
      ['Kind', p.kind === 'life' ? 'Life peerage — dies with you' : p.kind === 'royal' ? 'Royal dukedom' : 'Hereditary — passes to your heir'],
      ['House of Lords', p.retiredLords ? `Retired from the House at ${p.retiredLords} (you keep the title)` : p.leave ? 'On leave of absence' : p.seat ? 'You sit' : p.kind === 'hereditary' ? `No seat yet — stand when a hereditary seat falls vacant${p.byElections ? ` (${p.byElections} attempt${p.byElections > 1 ? 's' : ''} so far)` : ''}` : 'No seat'],
    ].filter(Boolean))}
    <div class="action-grid">
      ${p.seat && !p.retiredLords ? button(p.leave ? '🏛️ Return from leave' : '🧳 Take leave of absence', 'peerage.leave', { variant: 'small', hint: p.leave ? 'Take your seat again' : 'Step away from the House for now' }) : ''}
      ${p.seat && !p.retiredLords ? button('🚪 Retire from the House of Lords', 'peerage.retireLords', { variant: 'small danger', hint: 'For good; you keep the title' }) : ''}
      ${p.kind === 'hereditary' ? button('📜 Disclaim the title', 'peerage.disclaim', { variant: 'danger', hint: 'For life — to stand for the Commons' }) : ''}
    </div>`, { icon: '🏰' }));
  }
  const n = state.noble;
  if (n) parts.noble = nobleCard(state);
  parts.house = houseCard(state);
  if (state.royal || state.noble || houseOf(state) || state.character.peerage) parts.tree = familyTreeCard(state);
  return parts;
}

/** The dynasty, generation by generation, with everyone's titles. */
function familyTreeCard(state) {
  const people = (state.people?.list ?? []).filter((p) => p.alive !== false || ['mother', 'father'].includes(p.relation));
  const who = (rel) => people.filter((p) => rel.includes(p.relation));
  const name = (p) => `${p.alive === false ? '✝ ' : ''}${esc(fullName(p))}${p.alive === false ? '' : ` <small class="muted">${ageOf(state, p)}</small>`}`;
  const c = state.character;
  const rows = [
    ['Grandparents', who(['grandmother', 'grandfather'])],
    ['Parents', who(['mother', 'father'])],
    ['You & your siblings', [{ self: true }, ...who(['sibling'])]],
    ['Spouse', who(['spouse'])],
    ['Children', who(['child'])],
    ['Grandchildren', who(['grandchild'])],
  ].filter(([, list]) => list.length);
  const line = (list) => list.map((p) => (p.self ? `<b>${esc(styledName(state))}</b>` : name(p))).join(' · ');
  const crown = state.royal ? state.world?.crowns?.[state.royal.crownId] : null;
  return card('Family Tree', `<ul class="history">${rows.map(([label, list]) => `<li><b>${label}</b><br>${line(list)}</li>`).join('')}</ul>${crown ? `<p class="fine">Line of succession: ${state.royal.reigning ? `you reign; your heir is ${esc(crown.heir?.name ?? '—')}` : state.royal.line == null ? 'you are not in it' : `you are ${state.royal.line}${state.royal.line === 1 ? 'st (the heir)' : state.royal.line === 2 ? 'nd' : state.royal.line === 3 ? 'rd' : 'th'}`}.</p>` : ''}${c.formerRoyal ? `<p class="fine">Formerly of the royal house of ${esc(CROWNS[c.formerRoyal.crownId]?.name ?? c.formerRoyal.crownId)}.</p>` : ''}`, { icon: '🌳' });
}

/** A former ruling house: yours, or the one that claims your country's throne; and the referendums. */
/** The house you belong to, reigning or not: its seat, your place in it, the estates, the heir, the family. */
function reigningHouseCard(state) {
  const r = state.royal;
  const c = state.world?.crowns?.[r.crownId];
  if (!c) return '';
  const def = CROWNS[r.crownId];
  const est = royalEstate(state);
  const head = r.reigning;
  const rows = [
    ['House', `${esc(houseTitle(c.house).replace(/^t/, 'T'))} · reigning`],
    ['Seat', esc(def.palace)],
    ['You', head ? 'Head of the house (the sovereign)' : r.line === 1 ? 'Heir to the head of the house' : r.line != null ? `${r.line}${['st', 'nd', 'rd'][((r.line + 90) % 100 - 10) % 10 - 1] ?? 'th'} in line` : 'A member of the house, outside the line'],
    est ? ['Estate', `${esc(est.name)} · ${money(est.value)} · ${esc(DUCHY_MODES[est.mode])}`] : null,
    head ? ['The heir', `${esc(c.heir.name)} · readiness ${r.heirReady ?? 30}/100`] : null,
  ].filter(Boolean);
  return card(`${esc(houseTitle(c.house).replace(/^t/, 'T'))}`, `${kv(rows)}
    ${est ? `<div class="enroll-form" data-collect-root>${select('mode', Object.entries(DUCHY_MODES).map(([value, label]) => ({ value, label })), { value: est.mode })}${button('🏰 Set the estate\'s course', 'royalLife.estate', { variant: 'small', collect: true })}</div>` : ''}
    <p class="fine">The year's engagements, tours and family time go in the Royal Diary. Relatives ask consent to marry, and the press never sleeps. Your popularity carries the country's view of the monarchy with it.</p>`, { icon: '🏰' });
}

function houseCard(state) {
  if (state.royal && state.world?.crowns?.[state.royal.crownId]) return reigningHouseCard(state);
  const h = houseOf(state);
  const cc = state.character.countryId ?? 'US';
  const local = FORMER_HOUSES[cc] && !state.world?.restored?.[cc] ? FORMER_HOUSES[cc] : null;
  const leader = leads(state, cc);
  const catholic = ['catholic', 'tradCatholic'].includes(state.community?.faith?.traditionId);
  const constantinian = catholic && nobleBorn(state) && state.character.age >= 21 && !state.honors.some((x) => x.id === 'house.constantinian');
  const titles = dynasticTitles(state);
  const support = supportableHouse(state);
  if (!h && !local && !(leader && crownOf(state, cc)) && !constantinian && !titles.length) return '';
  const def = h ? FORMER_HOUSES[h.cc] : null;
  const rows = h ? [
    ['Styled', esc(houseStyledName(state) ?? '')],
    ['House', `${esc(h.name)}${def ? ` · lost the throne in ${def.fell} (${esc(def.how)})` : h.deposed ? ` · deposed ${h.deposed}` : ''}`],
    ['You', h.rank === 'head' ? 'Head of the house: the claimant' : h.rank === 'heir' ? 'Heir to the head of the house' : 'A member of a cadet branch'],
    state.world?.restored?.[h.cc] ? ['Throne', `Restored in ${state.world.restored[h.cc].year}`] : ['Monarchists', `${monarchistSupport(state, h.cc)}% in ${esc(h.cc)} (a referendum needs about 35% to be forced)`],
    def ? ['The law', esc(def.legal)] : null,
    h.conferred ? ['Orders conferred', String(h.conferred)] : null,
    h.banned ? ['Exile', `Banned from ${esc(h.cc)} until ${h.banned}`] : null,
  ].filter(Boolean) : local ? [
    ['Former ruling house', `${esc(houseTitle(local.name).replace(/^t/, 'T'))} (the throne fell in ${local.fell})`],
    ['Monarchists', `${monarchistSupport(state, cc)}%`],
  ] : [];
  if (titles.length) rows.push(['Your titles', titles.map((t) => `⚜️ ${esc(dynasticName(t.cc, t.rank, t.place, state.character.gender))} <small class="muted">(House of ${esc(t.house)}, ${t.age})</small>`).join('<br>')]);
  const revoked = (state.dynastic?.titles ?? []).filter((t) => t.revoked || t.returned);
  if (revoked.length) rows.push(['Former titles', revoked.map((t) => `${esc(dynasticName(t.cc, t.rank, t.place, state.character.gender))} (${t.revoked ? `revoked at ${t.revoked}` : `returned at ${t.returned}`})`).join(' · ')]);
  if (h?.rank === 'head' && ennobled(state).length) rows.push(['Titles you granted', ennobled(state).map((p) => `${esc(p.firstName)}: ${esc(p.dynasticTitle)}`).join(' · ')]);
  return card(h ? `${esc(houseTitle(h.name).replace(/^t/, 'T'))}` : 'The Monarchy Question', `${kv(rows)}
    <div class="action-grid">
      ${h && h.rank !== 'cadet' && !state.world?.restored?.[h.cc] && state.character.age >= 18 ? button('📣 Rally the monarchists', 'houses.campaign', { hint: '$25,000 · once a year' }) : ''}
      ${h?.rank === 'head' ? button('🏰 Gather the house at the old seat', 'royalLife.gathering', { hint: 'Once a year · $40,000' }) : ''}
      ${h?.rank === 'head' ? button('⚜️ Confer the house order', 'houses.confer', { hint: 'On a loyal supporter; twice a year' }) : ''}
      ${h?.rank === 'head' ? houseConferOptions(state).map((p) => button(`⚜️ Invest ${esc(p.firstName)}`, 'houses.confer', { arg: p.id, variant: 'tiny' })).join('') : ''}
      ${local && leader ? button('🗳️ Call a referendum on restoring the monarchy', 'houses.callRestoration', { hint: `Support ~${Math.round(monarchistSupport(state, cc))}%` }) : ''}
      ${crownOf(state, cc) && leader ? button('🏛️ Call a referendum on a republic', 'houses.callRepublic', { variant: 'danger', hint: 'Abolish the monarchy' }) : ''}
      ${constantinian ? button('⚜️ Seek admission to the Constantinian Order', 'houses.constantinian', { hint: nobleBorn(state) ? 'Justice class, on proofs of nobility' : 'Merit class' }) : ''}
      ${support && state.character.age >= 18 ? button(`⚜️ Support ${esc(houseTitle(support.def.name))}`, 'dynastic.support', { hint: '$10,000 · once a year · the house may honour loyal supporters with a title' }) : ''}
      ${titles.map((t) => button(`📜 Return ${esc(dynasticName(t.cc, t.rank, t.place, state.character.gender))}`, 'dynastic.returnTitle', { arg: t.cc, variant: 'tiny ghost' })).join('')}
      ${h?.rank === 'head' ? ennobleOptions(state).map((p) => button(`👑 Ennoble ${esc(p.firstName)}`, 'dynastic.ennoble', { arg: p.id, variant: 'tiny', hint: 'Once a year' })).join('') : ''}
      ${h?.rank === 'head' ? ennobled(state).map((p) => button(`✖ Revoke ${esc(p.firstName)}'s title`, 'dynastic.revokeGrant', { arg: p.id, variant: 'tiny ghost' })).join('') : ''}
      ${h ? button('📜 Renounce your claim', 'houses.renounce', { variant: 'danger', hint: 'For you and your heirs' }) : ''}
    </div>
    ${h ? '<p class="fine">Noble birth counts in the old orders: the Order of Malta admits you in Honour and Devotion (a head of a house as a Bailiff Grand Cross), and the Constantinian Order in its Justice class.</p>' : ''}`, { icon: '⚜️' });
}

/** A titled family's life: the estate, the allowance, society. */
function nobleCard(state) {
  const n = state.noble;
  const e = estateOf(state);
  const age = state.character.age;
  const yours = e?.owner === 'you';
  const cc = n.cc ?? 'GB';
  const parentTitle = yours && state.character.style?.peerage ? state.character.style.peerage : peerTitle(n.rank, n.place, 'male', n.place, cc);
  return card(yours ? `${esc(e.name)}` : 'Your Titled Family', `${kv([
    ['Family title', `${n.number && !yours ? `${n.number}${['th', 'st', 'nd', 'rd'][n.number % 10 > 3 || [11, 12, 13].includes(n.number % 100) ? 0 : n.number % 10]} ` : ''}${esc(parentTitle)}${isGrandee(state) ? ' · Grandee of Spain (Excelentísimo)' : ''}`],
    subsidiaryTitles(n.rank, n.place, 'male', cc).length ? ['Lesser titles', esc(subsidiaryTitles(n.rank, n.place, 'male', cc).join(', '))] : null,
    n.courtesyTitle ? ['Your courtesy title', `${esc(n.courtesyTitle)} — the heir uses the family's second title`] : null,
    ['You', yours ? 'Head of the family' : n.disclaimed ? 'You disclaimed the title' : n.heir ? 'The heir' : cc === 'GB' ? 'A younger child (courtesy style, no title to inherit)' : 'A younger child (no title to inherit)'],
    e ? ['Seat', `${esc(e.name)}${e.owner === null ? ' (sold)' : yours ? ` · worth ≈${money(e.value)}` : ''}`] : null,
    e && yours ? ['Run as', `${esc(STRATEGIES[e.strategy]?.label ?? '')}${e.exemptUntil ? ` · open to the public until ${e.exemptUntil} (tax exemption)` : ''}`] : null,
    e && !yours && e.owner === 'family' && age >= 18 ? ['Allowance', `${money(nobleAllowance(state))}/yr from the family trust`] : null,
    e && yours ? ['Heirlooms', `${e.heirlooms} great piece${e.heirlooms === 1 ? '' : 's'} left`] : null,
    n.patronages?.length ? ['Patron of', esc(n.patronages.join(', '))] : null,
    age >= 16 ? ['Standing in society', `${Math.round(n.standing ?? 55)}/100${n.debut ? ' · presented as a debutante' : ''}`] : null,
  ].filter(Boolean))}
    <div class="action-grid">
      ${age >= 18 ? button('🎯 Host a shooting party', 'nobility.shoot', { hint: 'Useful people come; once a year' }) : ''}
      ${age >= 18 && age <= 32 ? button('💃 Do the Season', 'nobility.season', { hint: 'Balls, Ascot, Henley — matches are made' }) : ''}
      ${age >= 21 ? button('🎗️ Become patron of a county cause', 'nobility.patron', { hint: 'Standing in the county' }) : ''}
      ${yours && e.heirlooms ? button('🖼️ Sell an heirloom at auction', 'nobility.heirloom', { variant: 'danger', hint: 'Money now; the family won\'t forgive it' }) : ''}
      ${yours ? button('🏚️ Sell the estate', 'nobility.sellEstate', { variant: 'danger', hint: 'Keep the title, lose the seat' }) : ''}
    </div>
    ${yours ? `<h4 class="sub">How the estate is run</h4><div class="toggle-row">${Object.entries(STRATEGIES).map(([id, s]) => button(s.label, 'nobility.strategy', { arg: id, variant: e.strategy === id ? 'tiny on' : 'tiny', hint: `${s.desc} · ≈${(s.yield * 100).toFixed(1)}%/yr before upkeep` })).join('')}</div>` : ''}
    <p class="fine">A title opens doors: county society, the lieutenancy, the boards of charities and companies. ${yours ? 'The house costs a fortune to keep; the estate has to pay for it.' : 'When the title passes to you, so do the estate — and its inheritance tax.'}</p>`, { icon: '🏰', accent: 'yellow' });
}

/** Whether this life has a court: a royal (reigning or not), or a member of a former ruling house. */
export const hasCourt = (state) => Boolean(state.royal || houseOf(state));

/** Politics → Office: the Crown where you live, and your peerage — the royal life itself has its own section. */
export function crownCards(state) {
  if (hasCourt(state)) return '';
  const x = crownParts(state);
  return [x.crown, x.peerage, x.noble, x.house].filter(Boolean).join('');
}

/** 👑 Court: your reign or royal life, the Crown, and the powers you use by choice. */
export function courtView(state) {
  const x = crownParts(state);
  const out = [x.royal, throneCard(state), diaryCard(state), x.powers, x.crown, state.royal ? '' : x.house].filter(Boolean).join('');
  return out || card('No Court', '<p class="muted">You are not part of a royal house.</p>', { icon: '👑' });
}
/** 🌳 Succession: the line, drawn, and the family. */
export function successionView(state) {
  const x = crownParts(state);
  return `${successionCard(state)}${x.tree ?? ''}`;
}
/** 🎗️ Household: honours, patronages, the forces, titles. */
export function householdView(state) {
  const x = crownParts(state);
  return [x.honours, militaryCard(state), x.peerage, x.noble].filter(Boolean).join('') || card('Household', '<p class="muted">Honours and appointments come with a working royal life.</p>', { icon: '🎗️' });
}
/** 🏰 Estates: the house, its seat and lands, and the money. */
export function estatesView(state) {
  const x = crownParts(state);
  return `${moneyCard(state)}${state.royal ? x.house ?? '' : ''}`;
}

/** The forces' honorary appointments, on their own. */
function militaryCard(state) {
  if (!state.royal) return '';
  const mil = militaryPosts(state);
  if (!mil.rank && !mil.posts.length) return '';
  return card('The Armed Forces', `${mil.rank ? `<p>${titleInsignia(mil.rank, state.character.countryId ?? 'GB')} <b>${esc(mil.rank)}</b></p>` : ''}${mil.posts.length ? `<ul class="history">${mil.posts.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}`, { icon: '🎖️' });
}

/** What the royal life pays, and where it comes from. */
function moneyCard(state) {
  const r = state.royal;
  if (!r) return '';
  const def = CROWNS[r.crownId];
  const lv = ROYAL_LEVELS[r.level];
  const grant = r.reigning ? 20000000 : r.working ? (r.line === 1 ? ROYAL_LEVELS.heir.allowance : lv?.allowance ?? 0) : 0;
  return card('The Money', kv([
    ['From the state', grant ? `${money(grant)}/yr from the ${esc(def.grant)}` : 'Nothing: you are not a working royal'],
    ['Family trust', r.reigning ? 'The private estates' : `${money(60000)}/yr`],
    ['Palace', esc(def.palace)],
  ]), { icon: '💰' });
}

/** How a relative is related to you, from the tree. */
function relationTo(t, id) {
  const chain = (x) => { const out = []; let n = t.nodes[x]; while (n) { out.push(n.id); n = t.nodes[n.parent]; } return out; };
  const mine = chain('you');
  const theirs = chain(id);
  const lca = theirs.find((x) => mine.includes(x));
  if (!lca) return 'relative';
  const up = mine.indexOf(lca);
  const down = theirs.indexOf(lca);
  const f = t.nodes[id]?.gender === 'female';
  const g = (m, w) => (f ? w : m);
  if (up === 0) return ['you', g('son', 'daughter'), g('grandson', 'granddaughter'), g('great-grandson', 'great-granddaughter')][down] ?? 'descendant';
  if (down === 0) return ['you', g('father', 'mother'), g('grandfather', 'grandmother'), g('great-grandfather', 'great-grandmother')][up] ?? 'ancestor';
  if (up === 1 && down === 1) return g('brother', 'sister');
  if (up === 1 && down === 2) return g('nephew', 'niece');
  if (up === 1 && down === 3) return g('great-nephew', 'great-niece');
  if (up === 2 && down === 1) return g('uncle', 'aunt');
  if (up === 3 && down === 1) return g('great-uncle', 'great-aunt');
  if (up === 2 && down === 2) return 'first cousin';
  if (up === 2 && down === 3) return 'first cousin once removed';
  if (up === 3 && down === 3) return 'second cousin';
  return 'cousin';
}
const LAW_NAME = { absolute: 'equal primogeniture: the eldest child, son or daughter', malePreference: 'male preference: sons before daughters', agnatic: 'the male line only: no daughters, and none of their children' };

/** The line of succession, drawn: the monarch, then everyone in order, you marked. */
function successionCard(state) {
  const r = state.royal;
  const t = r?.tree;
  if (!t) return '';
  const y = currentYear(state);
  const c = state.world?.crowns?.[r.crownId];
  const m = t.nodes[t.monarchId];
  const rows = lineView(state, 10);
  const youRow = rows.find((x) => x.node.you);
  const law = lawFor(r.crownId, y - state.character.age, y);
  const why = r.reigning ? '' : r.line != null ? '' : t.nodes.you?.out ? `You are out of the line: ${t.nodes.you.out}.` : law === 'agnatic' && state.character.gender === 'female' ? 'Only men inherit this crown: you are not in the line.' : 'You are not in the line.';
  let prev = 0;
  const items = rows.map((x) => {
    const gap = x.pos > prev + 1 ? '<li class="fine" style="list-style:none;padding-left:2.2em">⋮</li>' : '';
    prev = x.to;
    const n = x.node;
    const pos = x.to !== x.pos ? `${x.pos}–${x.to}` : String(x.pos);
    const label = n.block ? `<i>${esc(n.name)}</i>` : `${n.you ? '<b>You</b>' : esc(n.name)}`;
    const meta = n.block ? '' : n.you ? '' : `<small class="muted">${esc(relationTo(t, n.id))}${n.born != null ? ` · ${Math.max(0, y - n.born)}` : ''}</small>`;
    return `${gap}<li style="display:flex;gap:8px;align-items:baseline;${n.you ? 'font-weight:600;' : ''}"><span style="min-width:2.4em;text-align:right;font-variant-numeric:tabular-nums">${pos}</span><span>${n.you ? '➤ ' : ''}${label} ${meta}</span></li>`;
  }).join('');
  const top = `<li style="display:flex;gap:8px;align-items:baseline"><span style="min-width:2.4em;text-align:right">👑</span><span><b>${esc(r.reigning ? 'You' : monarchName(state, r.crownId))}</b> <small class="muted">${r.reigning ? 'reigning' : m ? `${esc(relationTo(t, m.id))}${m.born != null ? ` · ${y - m.born}` : ''}` : ''}</small></span></li>`;
  const ahead = youRow ? rows.filter((x) => x.pos < youRow.pos && !x.node.block).length : 0;
  return card('Line of Succession', `<p class="fine">${c?.house ? `${esc(houseTitle(c.house).replace(/^t/, 'T'))}. ` : ''}The law: ${esc(LAW_NAME[law] ?? law)}.</p>
    <ol style="list-style:none;padding:0;margin:6px 0;display:grid;gap:3px">${top}${items}</ol>
    ${why ? `<p class="why">${esc(why)}</p>` : youRow && youRow.pos > 1 ? `<p class="fine">${ahead} ${ahead === 1 ? 'person stands' : 'people stand'} ahead of you that you can see. A birth to anyone above you moves you down; a death or a renunciation moves you up.</p>` : r.line === 1 ? '<p class="fine">You are the heir.</p>' : ''}`, { icon: '🌳', summary: r.reigning ? 'Reigning' : r.line != null ? `${r.line}${['th', 'st', 'nd', 'rd'][(r.line % 100 >= 11 && r.line % 100 <= 13) ? 0 : r.line % 10] ?? 'th'} in line` : 'Not in line' });
}

const signed = (n) => (n > 0 ? `+${n}` : String(n));
/** The Royal Diary: the year's public life in one plan, each entry with what it will likely do. */
function diaryCard(state) {
  const r = state.royal;
  if (!r) return '';
  if (!diaryOpen(state)) return r.working ? card('The Royal Diary', '<p class="muted">Your diary opens at eighteen. Until then: school, and the odd balcony.</p>', { icon: '📅' }) : '';
  const budget = diaryBudget(state);
  const used = daysUsed(state);
  const free = budget - used;
  const { items, headlines } = diaryOptions(state);
  const effects = (days, pop, stress, risk) => [
    `${days} day${days === 1 ? '' : 's'}`,
    pop[1] ? `📰 ${pop[0] === pop[1] ? signed(pop[0]) : `${signed(pop[0])} to ${signed(pop[1])}`}` : null,
    stress ? `😰 ${signed(stress)}` : null,
    risk ? `${Math.round(risk * 100)}% gaffe risk` : null,
  ].filter(Boolean).join(' · ');
  const rows = items.map((x) => {
    const max = Math.min(x.remaining, Math.floor(free / x.days));
    const opts = Array.from({ length: Math.max(0, max) + 1 }, (_, n) => `<option value="${x.id}=${n}">${n}</option>`).join('');
    return `<li class="honour-row"><span class="who"><b>${x.icon} ${esc(x.label)}</b> <small>${esc(x.note)}</small><br><small class="muted">${esc(effects(x.days, x.pop, x.stress, 0))}${x.remaining ? ` · ${x.remaining} left` : ' · done this year'}</small></span>
      ${max > 0 ? `<select data-part="${x.id}" aria-label="${esc(x.label)}" style="width:auto;min-width:4.5em;justify-self:end">${opts}</select>` : `<input type="hidden" data-part="${x.id}" value="${x.id}=0"><span class="what muted">—</span>`}</li>`;
  }).join('');
  const head = headlines.length && free >= 3 ? `<li class="honour-row"><span class="who"><b>⭐ The year's headline event</b> <small>One a year: it defines how the country sees you</small></span>
      <select data-part="headline" aria-label="Headline event"><option value="headline=">None</option>${headlines.map((d) => `<option value="headline=${d.id}">${esc(d.label)} — ${esc(effects(3, [-4, d.pop[1]], d.stress, d.risk))}</option>`).join('')}</select></li>` : '';
  const light = !r.reigning && state.character.age >= 21 && used < 3;
  return card('The Royal Diary', `<p class="muted honour-intro">${chip(`${free} of ${budget} days free`, free ? 'good' : '')} Fill the year: each line shows its likely effect on your popularity (📰) and stress (😰).</p>
    ${free > 0 ? `<div data-collect-root><ul class="honour-list">${head}${rows}</ul>
    <div class="row-end">${button('📅 Set the diary', 'royalDiary.plan', { collect: true, hint: 'Runs now; plan more later in the year' })}</div></div>` : '<p>Your diary is full for the year.</p>'}
    <p class="fine">${light ? 'A working royal who gives fewer than three days a year gets counted by the papers. ' : ''}A diary within two days of full costs you more stress.</p>`, { icon: '📅', summary: `${used}/${budget} days` });
}

/** The throne by its kind: what you hold, and the levers that come with it. */
function throneCard(state) {
  const r = state.royal;
  if (!r) return '';
  const kind = throneKind(state);
  const y = currentYear(state);
  const c = state.world?.crowns?.[r.crownId];
  if (kind === 'elective' && r.crownId === 'MY' && c) {
    const ag = c.agong;
    const mine = c.house;
    const turnsAway = ag ? ((MY_STATES.indexOf(mine) - MY_STATES.indexOf(ag.state) + MY_STATES.length) % MY_STATES.length) : 0;
    const due = ag ? ag.since + 5 + (turnsAway - 1) * 5 : null;
    const rows = MY_STATES.map((s) => `<li style="display:flex;gap:8px"><span style="min-width:1.4em">${ag?.state === s ? '👑' : ''}</span><span>${s === mine ? `<b>${esc(s)}</b> <small class="muted">your state</small>` : esc(s)}</span></li>`).join('');
    return card('An Elected King', `${kv([
      ['Your state', `${esc(mine)} · ruled by its ${esc(rulerTitle(mine))}`],
      ['Yang di-Pertuan Agong', ag ? `${ag.you ? '<b>You</b>' : `The ${esc(rulerTitle(ag.state))} of ${esc(ag.state)}`} · since ${ag.since}` : '—'],
      ['Your state\'s turn', r.agong ? `Now, until ${r.agong.since + 5}` : turnsAway === 0 ? 'Now' : due ? `About ${due}${r.reigning ? '' : ' (if you reign by then)'}` : '—'],
    ])}
      <ol style="list-style:none;padding:0;margin:6px 0;display:grid;gap:2px">${rows}</ol>
      <p class="fine">The nine rulers elect the King from among themselves for five years, by a rotation among the states. When ${esc(mine)}'s turn comes and you rule it, the Conference of Rulers will ask you.</p>`, { icon: '🏛️', summary: r.agong ? 'King' : 'Elective' });
  }
  if (kind === 'elective' && r.crownId === 'KH') {
    const can = !r.reigning && state.character.gender === 'male';
    return card('The Throne Council', `${can ? meter(r.councilFavour ?? 0, { label: '🏛️ The council\'s favour' }) : ''}
      <p class="fine">Cambodia's King is chosen by the Royal Council of the Throne from the men of the royal houses, when the throne falls vacant. Being first in line helps; it doesn't decide.</p>
      ${can && state.character.age >= 18 ? `<div class="action-grid">${button('🏛️ Call on the council\'s members', 'throne.courtCouncil', { hint: 'Once a year · favour' })}</div>` : ''}
      ${!r.reigning && state.character.gender !== 'male' ? '<p class="why">The council chooses only among the men of the houses.</p>' : ''}`, { icon: '🏛️', summary: 'Elective' });
  }
  if (kind === 'executive' && r.reigning) {
    const gov = r.government?.kind;
    const heirs = crownPrinceChoices(state);
    return card('You Rule', `<p class="muted">An executive monarchy: you appoint the government, name the crown prince and set the palace's share of the budget.</p>
      ${kv([['Government', gov ? `${esc(GOVERNMENTS[gov].label)} · since ${r.government.since}` : 'The ministers you inherited'], ['Palace budget', esc(BUDGETS[r.budget ?? 'balanced'].label)], ['Crown prince', esc(c?.heir?.name ?? '—')]])}
      <div class="enroll-form" data-collect-root>${select('gov', Object.entries(GOVERNMENTS).map(([value, g]) => ({ value, label: `${g.label} — ${g.note}` })), { value: gov ?? 'technocrat' })}${button('🏛️ Appoint the government', 'throne.appoint', { variant: 'small', collect: true })}</div>
      <div class="enroll-form" data-collect-root>${select('budget', Object.entries(BUDGETS).map(([value, b]) => ({ value, label: `${b.label} — ${b.note}` })), { value: r.budget ?? 'balanced' })}${button('💰 Set the budget', 'throne.budget', { variant: 'small', collect: true })}</div>
      ${heirs.length ? `<div class="enroll-form" data-collect-root>${select('heir', heirs.map((n) => ({ value: n.id, label: `${n.name} · ${y - n.born}${n.id === state.royal.tree?.designated ? ' (named)' : ''}` })))}${button('👑 Name the crown prince', 'throne.nameHeir', { variant: 'small', collect: true })}</div>` : ''}
      <p class="fine">Passing over the eldest costs you goodwill in the family; a government of hardliners keeps order, at a price.</p>`, { icon: '🏛️', summary: 'Executive' });
  }
  if (kind === 'executive') return card('The Throne', '<p class="muted">An executive monarchy: the sovereign appoints the government and names the crown prince — not always the eldest son.</p>', { icon: '🏛️', summary: 'Executive' });
  return card('The Throne', `<p class="muted">A constitutional monarchy: ${r.reigning ? 'you reign; ministers rule. Your power is to be consulted, to encourage and to warn.' : 'the sovereign reigns; ministers rule.'}</p>`, { icon: '🏛️', summary: 'Constitutional' });
}
