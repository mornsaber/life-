/**
 * The Crown on the Politics tab: the monarch and the heir where you live, a born royal's own
 * life (title, place in the line, popularity, duties), and a peer's title.
 */
import { esc, money, button, card, meter, kv, chip, disclosure, select } from '../Components.js';
import { fullName, ageOf } from '../../modules/people/People.js';
import { styledName } from '../../modules/world/Honours.js';
import { CROWNS, crownOf, monarchName, ROYAL_LEVELS, royalStyledName } from '../../modules/world/Crown.js';
import { currentYear, yearlyCount } from '../../core/State.js';
import { peerAddress, RANKS, numberedTitle, subsidiaryTitles } from '../../modules/world/Peerage.js';
import { estateOf, STRATEGIES, nobleAllowance, isGrandee } from '../../modules/world/Nobility.js';
import { knighthoodsOn, KNIGHTHOODS_DEFAULT } from '../../modules/world/Honours.js';
import { conferOptions, militaryPosts, ROYAL_ORDERS, PEERAGE_GRANTS } from '../../modules/world/RoyalHousehold.js';
import { DECREES, seizeCheck } from '../../modules/world/Sovereign.js';
import { VICE_REGAL, youAdvise } from '../../modules/politics/ViceRegal.js';
import { OFFICES } from '../../modules/politics/Offices.js';
import { FORMER_HOUSES, houseOf, monarchistSupport, leads, nobleBorn, houseStyledName, houseConferOptions } from '../../modules/world/Houses.js';

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

export function crownCards(state) {
  const r = state.royal;
  const crownId = r?.crownId ?? crownOf(state);
  const c = crownId ? state.world?.crowns?.[crownId] : null;
  const def = crownId ? CROWNS[crownId] : null;
  const cards = [];
  if (c) {
    const realms = def.realms.filter((cc) => !state.world.republics?.[cc]);
    const crises = (state.world.crises ?? []).filter((x) => x.cc === (state.character.countryId ?? 'US'));
    cards.push(card('The Crown', `${kv([
      ['Monarch', `${esc(monarchName(state, crownId))}${c.monarch.you ? ' (you)' : ''} · House of ${esc(c.house.replace(/^the /, ''))}`],
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
    cards.push(card(r.reigning ? 'Your Reign' : 'Royal Life', `
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
        mil.rank && !r.reigning ? ['Armed forces', esc(mil.rank)] : null,
        r.household?.conferred ? ['Honours conferred', String(r.household.conferred)] : null,
      ].filter(Boolean))}
      ${mil.posts.length || (mil.rank && r.reigning) ? disclosure('crown.military', '🎖️ Military appointments', `${mil.rank ? `<p class="fine">${esc(mil.rank)}</p>` : ''}<ul class="history">${mil.posts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`, { count: mil.posts.length }) : ''}
      <div class="action-grid">
        ${r.working || r.reigning ? button('🤝 Royal engagement', 'crown.engagement', { hint: '3 a year' }) : ''}
        ${r.working ? button('🎗️ Take a patronage', 'crown.patronage', { hint: 'One a year' }) : ''}
        ${r.working || r.reigning ? button('✈️ Royal tour', 'crown.tour', { hint: 'Senior royals' }) : ''}
        ${r.reigning || (r.working && r.line != null && r.line <= 4 && state.character.age >= 25) ? button('⚔️ Hold an investiture', 'royalHousehold.investiture', { hint: 'Two a year' }) : ''}
        ${r.reigning || (r.working && r.line === 1) ? button('🏷️ Grant a royal warrant', 'royalHousehold.warrant', { hint: 'One a year' }) : ''}
        ${!r.reigning && state.character.age >= 18 && state.character.age <= 30 && !state.military.service ? button('🎖️ Serve in the armed forces', 'royalHousehold.serve', { hint: 'As an officer cadet' }) : ''}
        ${working ? button('🚪 Step back from royal duties', 'crown.stepBack', { variant: 'danger', hint: 'No grant, no title in use. For good.' }) : ''}
      </div>
      ${state.character.age >= 18 ? disclosure('crown.leave', r.reigning ? '🚪 Leave the throne' : '🚪 Leave royal life', `<div class="action-grid">
        ${r.reigning ? button('📜 Abdicate', 'crown.abdicate', { variant: 'danger', hint: 'The heir reigns' }) : ''}
        ${button(r.reigning ? '🚪 Abdicate and renounce everything' : '🚪 Renounce your rights and titles', 'crown.renounce', { variant: 'danger', hint: 'Titles, line, grant — for good' })}</div>`) : ''}
      <p class="fine">${r.reigning ? 'Assent, mercy, dissolutions and crises come to you through the year; the powers below are yours to use when you choose.' : 'Working royals live on the grant and in the papers. A commercial job makes headlines; stepping back frees you to have a career of your own.'}</p>`, { icon: '👑', accent: 'yellow' }));
    if (r.reigning) cards.push(honoursCard(state), powersCard(state));
  }
  const p = state.character.peerage;
  if (p && !(r && p.kind === 'royal')) {
    cards.push(card('Your Peerage', `${kv([
      ['Title', esc(numberedTitle(state) ?? '')],
      p.subsidiary?.length ? ['Lesser titles', esc(p.subsidiary.join(', '))] : null,
      ['Rank', esc(RANKS[p.rank][state.character.gender === 'female' ? 'female' : 'male'])],
      ['Addressed as', esc(peerAddress(state) ?? '')],
      ['Kind', p.kind === 'life' ? 'Life peerage — dies with you' : p.kind === 'royal' ? 'Royal dukedom' : 'Hereditary — passes to your heir'],
      ['House of Lords', p.seat ? 'You sit' : p.kind === 'hereditary' ? `No seat yet — stand when a hereditary seat falls vacant${p.byElections ? ` (${p.byElections} attempt${p.byElections > 1 ? 's' : ''} so far)` : ''}` : 'No seat'],
    ].filter(Boolean))}
    ${p.kind === 'hereditary' ? `<div class="action-grid">${button('📜 Disclaim the title', 'peerage.disclaim', { variant: 'danger', hint: 'For life — to stand for the Commons' })}</div>` : ''}`, { icon: '🏰' }));
  }
  const n = state.noble;
  if (n) cards.push(nobleCard(state));
  cards.push(houseCard(state));
  if (state.royal || state.noble || houseOf(state) || state.character.peerage) cards.push(familyTreeCard(state));
  return cards.join('');
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
function houseCard(state) {
  const h = houseOf(state);
  const cc = state.character.countryId ?? 'US';
  const local = FORMER_HOUSES[cc] && !state.world?.restored?.[cc] ? FORMER_HOUSES[cc] : null;
  const leader = leads(state, cc);
  const catholic = ['catholic', 'tradCatholic'].includes(state.community?.faith?.traditionId);
  const constantinian = catholic && nobleBorn(state) && state.character.age >= 21 && !state.honors.some((x) => x.id === 'house.constantinian');
  if (!h && !local && !(leader && crownOf(state, cc)) && !constantinian) return '';
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
    ['Former ruling house', `The House of ${esc(local.name)} (the throne fell in ${local.fell})`],
    ['Monarchists', `${monarchistSupport(state, cc)}%`],
  ] : [];
  return card(h ? `The House of ${esc(h.name)}` : 'The Monarchy Question', `${kv(rows)}
    <div class="action-grid">
      ${h && h.rank !== 'cadet' && !state.world?.restored?.[h.cc] && state.character.age >= 18 ? button('📣 Rally the monarchists', 'houses.campaign', { hint: '$25,000 · once a year' }) : ''}
      ${h?.rank === 'head' ? button('⚜️ Confer the house order', 'houses.confer', { hint: 'On a loyal supporter; twice a year' }) : ''}
      ${h?.rank === 'head' ? houseConferOptions(state).map((p) => button(`⚜️ Invest ${esc(p.firstName)}`, 'houses.confer', { arg: p.id, variant: 'tiny' })).join('') : ''}
      ${local && leader ? button('🗳️ Call a referendum on restoring the monarchy', 'houses.callRestoration', { hint: `Support ~${Math.round(monarchistSupport(state, cc))}%` }) : ''}
      ${crownOf(state, cc) && leader ? button('🏛️ Call a referendum on a republic', 'houses.callRepublic', { variant: 'danger', hint: 'Abolish the monarchy' }) : ''}
      ${constantinian ? button('⚜️ Seek admission to the Constantinian Order', 'houses.constantinian', { hint: nobleBorn(state) ? 'Justice class, on proofs of nobility' : 'Merit class' }) : ''}
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
  const rank = RANKS[n.rank];
  const parentTitle = yours && state.character.style?.peerage ? state.character.style.peerage : `${rank.male} ${rank.of ? 'of ' : ''}${n.place}`;
  return card(yours ? `${esc(e.name)}` : 'Your Titled Family', `${kv([
    ['Family title', `${n.number && !yours ? `${n.number}${['th', 'st', 'nd', 'rd'][n.number % 10 > 3 || [11, 12, 13].includes(n.number % 100) ? 0 : n.number % 10]} ` : ''}${esc(parentTitle)}${isGrandee(state) ? ' · Grandee of Spain (Excelentísimo)' : ''}`],
    subsidiaryTitles(n.rank, n.place).length ? ['Lesser titles', esc(subsidiaryTitles(n.rank, n.place).join(', '))] : null,
    n.courtesyTitle ? ['Your courtesy title', `${esc(n.courtesyTitle)} — the heir uses the family's second title`] : null,
    ['You', yours ? 'Head of the family' : n.disclaimed ? 'You disclaimed the title' : n.heir ? 'The heir' : 'A younger child (courtesy style, no title to inherit)'],
    e ? ['Seat', `${esc(e.name)}${e.owner === null ? ' (sold)' : yours ? ` · worth ≈${money(e.value)}` : ''}`] : null,
    e && yours ? ['Run as', `${esc(STRATEGIES[e.strategy]?.label ?? '')}${e.exemptUntil ? ` · open to the public until ${e.exemptUntil} (tax exemption)` : ''}`] : null,
    e && !yours && e.owner === 'family' && age >= 18 ? ['Allowance', `${money(nobleAllowance(state))}/yr from the family trust`] : null,
    e && yours ? ['Heirlooms', `${e.heirlooms} great piece${e.heirlooms === 1 ? '' : 's'} left`] : null,
    n.patronages?.length ? ['Patron of', esc(n.patronages.join(', '))] : null,
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
