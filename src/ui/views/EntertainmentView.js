/**
 * Music and film (business/Entertainment.js): your band, your record label, your film studio.
 */
import { esc, button, card, kv } from '../Components.js';
import { genreOf, formatOf, budgetsNow } from '../../modules/business/Entertainment.js';
import { yearNow } from '../../modules/world/Eras.js';

const money = (n) => `$${Math.round(n).toLocaleString()}`;

export function entertainmentCard(state) {
  if (state.character.age < 14) return '';
  const y = yearNow(state);
  const cc = state.character.countryId ?? 'US';
  const b = state.band;
  const band = b && !b.split
    ? `<h4 class="sub">🎸 ${esc(b.name)}</h4>${kv([['Music', esc(b.genre)], ['Members', esc(b.members.join(', '))], ['Following', b.following.toLocaleString()], ['Deal', b.deal ? 'Signed to a label' : 'Independent']])}
      ${b.records.length ? `<ul class="history">${b.records.slice(-4).reverse().map((r) => `<li>${r.year}: "${esc(r.title)}" · ${r.chart <= 40 ? `No. ${r.chart}` : 'didn\'t chart'}</li>`).join('')}</ul>` : ''}
      <div class="action-grid">${button('🎤 Play a gig', 'entertainment.gig', { variant: 'small', disabled: (state.yearly['band.gig'] ?? 0) >= 2 })}${button(`💿 Put out a record`, 'entertainment.record', { variant: 'small', disabled: Boolean(state.yearly['band.record']), hint: formatOf(y) })}</div>`
    : `<div class="action-grid">${b?.split ? button('🎸 Reunion tour', 'entertainment.reunion', { variant: 'small', hint: `${esc(b.name)}, ten years on` }) : ''}${button('🎸 Form a band', 'entertainment.formBand', { variant: 'small', hint: genreOf(y, cc) })}</div>`;
  if (state.character.age < 20) return card('Music', band, { icon: '🎸' });
  const l = state.label;
  const label = l
    ? `<h4 class="sub">💿 ${esc(l.name)}</h4>${kv([['Roster', l.acts.length ? esc(l.acts.map((a) => a.name).join(', ')) : 'No one yet'], ['Hits', l.hits]])}<div class="action-grid">${button('✍️ Sign an act', 'entertainment.signAct', { variant: 'small' })}</div>`
    : y >= 1900 ? `<div class="action-grid">${button('💿 Start a record label', 'entertainment.startLabel', { variant: 'small' })}</div>` : '';
  const s = state.studio;
  const studio = s
    ? `<h4 class="sub">🎬 ${esc(s.name)}</h4>${s.films.length ? `<ul class="history">${s.films.slice(-4).reverse().map((f) => `<li>${f.year}: ${esc(f.title)} · ${money(f.gross)}${f.award ? ' · 🏆' : ''}</li>`).join('')}</ul>` : ''}<div class="action-grid">${budgetsNow(state).map((x) => button(`🎬 ${x.label}`, 'entertainment.makeFilm', { arg: x.id, variant: 'small', disabled: Boolean(state.yearly['studio.film']), hint: money(x.cost) })).join('')}</div>`
    : y >= 1910 ? `<div class="action-grid">${button('🎬 Found a film studio', 'entertainment.startStudio', { variant: 'small' })}</div>` : '';
  return card('Music & Film', `${band}${label}${studio}`, { icon: '🎬' });
}
