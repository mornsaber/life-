/**
 * The Crown on the Politics tab: the monarch and the heir where you live, a born royal's own
 * life (title, place in the line, popularity, duties), and a peer's title.
 */
import { esc, money, button, card, meter, kv } from '../Components.js';
import { CROWNS, crownOf, monarchName, ROYAL_LEVELS } from '../../modules/world/Crown.js';
import { currentYear } from '../../core/State.js';
import { peerAddress, RANKS } from '../../modules/world/Peerage.js';
import { knighthoodsOn, KNIGHTHOODS_DEFAULT } from '../../modules/world/Honours.js';

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
      (state.character.countryId ?? 'US') in KNIGHTHOODS_DEFAULT ? ['Knighthoods in the national order', knighthoodsOn(state, state.character.countryId) ? 'Awarded' : 'Not awarded (abolished)'] : null,
    ].filter(Boolean))}
    ${/^(au|nz)_pm$/.test(state.politics?.office?.id ?? '') ? `<div class="action-grid">${button(knighthoodsOn(state, state.character.countryId) ? '📜 Abolish new knighthoods' : '⚔️ Restore knighthoods', 'honours.knighthoods', { hint: 'On your advice; unpopular to restore' })}</div>` : ''}`, { icon: '👑' }));
  }
  if (r) {
    const lv = ROYAL_LEVELS[r.level];
    const working = r.working && !r.reigning;
    cards.push(card(r.reigning ? 'Your Reign' : 'Royal Life', `
      ${meter(r.popularity ?? 60, { label: '📰 Popularity' })}
      ${kv([
        ['Born', esc(lv?.name ?? r.level)],
        ['Line of succession', r.reigning ? 'You reign' : r.line == null ? 'Not in the line (the succession law)' : `${r.line}${r.line === 1 ? ' — the heir' : ''}`],
        ['Status', r.reigning ? 'Monarch' : r.working ? 'Working royal' : r.steppedBack ? 'Stepped back' : 'Private life'],
        ['Allowance', r.reigning ? `${money(20000000)}/yr` : r.working ? `${money(r.line === 1 ? ROYAL_LEVELS.heir.allowance : lv?.allowance ?? 0)}/yr from the ${esc(def.grant)} (from 18)` : 'Family trust only'],
        r.patronages?.length ? ['Patronages', esc(r.patronages.join(', '))] : null,
      ].filter(Boolean))}
      <div class="action-grid">
        ${r.working || r.reigning ? button('🤝 Royal engagement', 'crown.engagement', { hint: '3 a year' }) : ''}
        ${r.working ? button('🎗️ Take a patronage', 'crown.patronage', { hint: 'One a year' }) : ''}
        ${r.working || r.reigning ? button('✈️ Royal tour', 'crown.tour', { hint: 'Senior royals' }) : ''}
        ${working ? button('🚪 Step back from royal duties', 'crown.stepBack', { variant: 'danger', hint: 'No grant, no title in use. For good.' }) : ''}
        ${r.reigning ? button('📜 Abdicate', 'crown.abdicate', { variant: 'danger', hint: 'The heir reigns' }) : ''}
      </div>
      <p class="fine">Working royals live on the grant and in the papers. A commercial job makes headlines; stepping back frees you to have a career of your own.</p>`, { icon: '👑', accent: 'yellow' }));
  }
  const p = state.character.peerage;
  if (p) {
    cards.push(card('Your Peerage', `${kv([
      ['Title', esc(state.character.style?.peerage ?? '')],
      ['Rank', esc(RANKS[p.rank][state.character.gender === 'female' ? 'female' : 'male'])],
      ['Addressed as', esc(peerAddress(state) ?? '')],
      ['Kind', p.kind === 'life' ? 'Life peerage — dies with you' : p.kind === 'royal' ? 'Royal dukedom' : 'Hereditary — passes to your heir'],
      ['House of Lords', p.seat ? 'You sit' : p.kind === 'hereditary' ? `No seat yet — stand when a hereditary seat falls vacant${p.byElections ? ` (${p.byElections} attempt${p.byElections > 1 ? 's' : ''} so far)` : ''}` : 'No seat'],
    ])}
    ${p.kind === 'hereditary' ? `<div class="action-grid">${button('📜 Disclaim the title', 'peerage.disclaim', { variant: 'danger', hint: 'For life — to stand for the Commons' })}</div>` : ''}`, { icon: '🏰' }));
  }
  return cards.join('');
}
