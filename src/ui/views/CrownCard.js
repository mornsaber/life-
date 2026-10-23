/**
 * The Crown on the Politics tab: the monarch and the heir where you live, a born royal's own
 * life (title, place in the line, popularity, duties), and a peer's title.
 */
import { esc, money, button, card, meter, kv } from '../Components.js';
import { CROWNS, crownOf, monarchName, ROYAL_LEVELS, royalStyledName } from '../../modules/world/Crown.js';
import { currentYear } from '../../core/State.js';
import { peerAddress, RANKS, numberedTitle, subsidiaryTitles } from '../../modules/world/Peerage.js';
import { estateOf, STRATEGIES, nobleAllowance, isGrandee } from '../../modules/world/Nobility.js';
import { knighthoodsOn, KNIGHTHOODS_DEFAULT } from '../../modules/world/Honours.js';
import { conferOptions, militaryPosts, ROYAL_ORDERS } from '../../modules/world/RoyalHousehold.js';
import { VICE_REGAL, youAdvise } from '../../modules/politics/ViceRegal.js';
import { OFFICES } from '../../modules/politics/Offices.js';
import { FORMER_HOUSES, houseOf, monarchistSupport, leads, nobleBorn, houseStyledName } from '../../modules/world/Houses.js';

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
    cards.push(card(r.reigning ? 'Your Reign' : 'Royal Life', `
      ${meter(r.popularity ?? 60, { label: '📰 Popularity' })}
      ${kv([
        ['Styled', esc(royalStyledName(state) ?? `${state.character.firstName} ${state.character.lastName}`)],
        // A royal dukedom is part of the royal style, not a separate peerage.
        state.character.peerage?.kind === 'royal' || state.character.style?.peerage ? ['Royal title', `${esc(state.character.style?.peerage ?? '')}${state.character.peerage?.subsidiary?.length ? ` · also ${esc(state.character.peerage.subsidiary.join(', '))}` : ''}`] : null,
        ['Born', esc(lv?.name ?? r.level)],
        ['Line of succession', r.reigning ? 'You reign' : r.line == null ? 'Not in the line (the succession law)' : `${r.line}${r.line === 1 ? ' — the heir' : ''}`],
        ['Status', r.reigning ? 'Monarch' : r.working ? 'Working royal' : r.steppedBack ? 'Stepped back' : 'Private life'],
        ['Allowance', r.reigning ? `${money(20000000)}/yr` : r.working ? `${money(r.line === 1 ? ROYAL_LEVELS.heir.allowance : lv?.allowance ?? 0)}/yr from the ${esc(def.grant)} (from 18)` : 'Family trust only'],
        r.patronages?.length ? ['Patronages', esc(r.patronages.join(', '))] : null,
        militaryPosts(state).rank ? ['Armed forces', esc(militaryPosts(state).rank)] : null,
        militaryPosts(state).posts.length ? ['Military appointments', esc(militaryPosts(state).posts.join(' · '))] : null,
        r.household?.conferred ? ['Honours you have conferred', String(r.household.conferred)] : null,
      ].filter(Boolean))}
      <div class="action-grid">
        ${r.working || r.reigning ? button('🤝 Royal engagement', 'crown.engagement', { hint: '3 a year' }) : ''}
        ${r.working ? button('🎗️ Take a patronage', 'crown.patronage', { hint: 'One a year' }) : ''}
        ${r.working || r.reigning ? button('✈️ Royal tour', 'crown.tour', { hint: 'Senior royals' }) : ''}
        ${working ? button('🚪 Step back from royal duties', 'crown.stepBack', { variant: 'danger', hint: 'No grant, no title in use. For good.' }) : ''}
        ${r.reigning || (r.working && r.line != null && r.line <= 4 && state.character.age >= 25) ? button('⚔️ Hold an investiture', 'royalHousehold.investiture', { hint: 'Two a year' }) : ''}
        ${r.reigning || (r.working && r.line === 1) ? button('🏷️ Grant a royal warrant', 'royalHousehold.warrant', { hint: 'One a year' }) : ''}
        ${!r.reigning && state.character.age >= 18 && state.character.age <= 30 && !state.military.service ? button('🎖️ Serve in the armed forces', 'royalHousehold.serve', { hint: 'As an officer cadet' }) : ''}
        ${r.reigning ? button('📜 Abdicate', 'crown.abdicate', { variant: 'danger', hint: 'The heir reigns' }) : ''}
        ${state.character.age >= 18 ? button(r.reigning ? '🚪 Abdicate and renounce everything' : '🚪 Renounce your rights and titles', 'crown.renounce', { variant: 'danger', hint: 'Leave the royal family for good — titles, line, grant' }) : ''}
      </div>
      ${r.reigning ? `<h4 class="sub">Confer honours <small class="muted">three a year · ${esc(ROYAL_ORDERS[r.crownId]?.great[0] ?? '')}, ${esc(ROYAL_ORDERS[r.crownId]?.personal[0] ?? '')}</small></h4>
      <div class="toggle-row chips-row">${button('🎗️ Honour a deserving member of the public', 'royalHousehold.confer', { arg: 'public', variant: 'tiny' })}${conferOptions(state).map((o) => button(o.label, 'royalHousehold.confer', { arg: `${o.person.id}|${o.id}`, variant: 'tiny' })).join('')}</div>
      <p class="fine">As sovereign you give royal assent, grant mercy, dissolve parliament and, in a crisis, use the reserved powers — the decisions come to you through the year.</p>` : ''}
      <p class="fine">Working royals live on the grant and in the papers. A commercial job makes headlines; stepping back frees you to have a career of your own.</p>`, { icon: '👑', accent: 'yellow' }));
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
  return cards.join('');
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
  ].filter(Boolean) : local ? [
    ['Former ruling house', `The House of ${esc(local.name)} (the throne fell in ${local.fell})`],
    ['Monarchists', `${monarchistSupport(state, cc)}%`],
  ] : [];
  return card(h ? `The House of ${esc(h.name)}` : 'The Monarchy Question', `${kv(rows)}
    <div class="action-grid">
      ${h && h.rank !== 'cadet' && !state.world?.restored?.[h.cc] && state.character.age >= 18 ? button('📣 Rally the monarchists', 'houses.campaign', { hint: '$25,000 · once a year' }) : ''}
      ${h?.rank === 'head' ? button('⚜️ Confer the house order', 'houses.confer', { hint: 'On a loyal supporter; once a year' }) : ''}
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
