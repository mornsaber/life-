/**
 * The map of your life (Move tab): the world in the year you're living, drawn from Natural Earth
 * outlines (ui/WorldShapes.js).
 *
 *   Who ruled where   colonies and dominions tinted in their ruler's colour (the British Empire's
 *                     pink, France's blue…), named as they were then.
 *   Your life         the countries you have lived in, the one you live in now, the ones you have
 *                     visited; a line through your moves in order; dots for family abroad.
 *   The world now     countries at war outlined in red.
 */
import { esc, card } from '../Components.js';
import { SHAPES, CENTRES, MAP_W, MAP_H } from '../WorldShapes.js';
import { colonyStage, periodCountryName, yearNow, rulerName } from '../../modules/world/Eras.js';
import { COUNTRIES } from '../../modules/world/Countries.js';

/** Places too small for the 1:110m outlines: [lon, lat]. */
const SMALL = { SG: [103.8, 1.35], HK: [114.2, 22.3], MO: [113.5, 22.2], MT: [14.4, 35.9], BH: [50.5, 26], LU: [6.1, 49.8], MC: [7.4, 43.7], AD: [1.5, 42.5], LI: [9.5, 47.2], SM: [12.4, 43.9], VA: [12.45, 41.9], BB: [-59.5, 13.1], MU: [57.5, -20.2], KM: [43.3, -11.7], CV: [-23.6, 15.1], ST: [6.6, 0.3], SC: [55.5, -4.6], MV: [73.5, 4.2], TO: [-175.2, -21.2], WS: [-172.1, -13.8], KI: [-157, 1.9], FM: [158.2, 6.9], MH: [171.2, 7.1], PW: [134.6, 7.5], NR: [166.9, -0.5], TV: [179.2, -8.5], AG: [-61.8, 17.1], DM: [-61.4, 15.4], GD: [-61.7, 12.1], KN: [-62.8, 17.3], LC: [-61, 13.9], VC: [-61.2, 13.2] };
const centre = (cc) => CENTRES[cc] ?? (SMALL[cc] ? [Math.round((SMALL[cc][0] + 180) * 2), Math.round((84 - SMALL[cc][1]) * 2)] : null);

/** A ruler's colour on the old school maps. */
const EMPIRE = { GB: '#f4b6c2', FR: '#a9c4ea', NL: '#f6c99a', PT: '#b9dfb0', ES: '#f2e29b', DE: '#c8c8c8', BE: '#d3b8e6', IT: '#d8d3a3', RU: '#e2c2a4', TR: '#a8d8d0', JP: '#f0a9a0', US: '#b7d3c2', AT: '#e8d6b0', DK: '#c9e0ef', CN: '#f3d1a6', SE: '#c4d7f2' };

export function lifeMap(state) {
  const y = yearNow(state);
  const here = state.character.countryId ?? 'US';
  const moves = (state.migration?.history ?? []).map((m) => m.to).filter(Boolean);
  const born = state.migration?.history?.[0]?.from ?? (moves.length ? null : here) ?? here;
  const lived = new Set([born, ...moves, here].filter(Boolean));
  const visited = new Set((state.travel?.trips ?? []).map((t) => t.country).filter((c) => c && !lived.has(c)));
  const family = new Set((state.people?.list ?? []).filter((p) => p.alive && p.livesIn && p.livesIn !== here).map((p) => p.livesIn));
  const wars = new Set(Object.keys(state.world?.wars ?? {}));
  const rulers = new Map();
  const paths = Object.entries(SHAPES).map(([cc, d]) => {
    const st = state.era ? colonyStage(state, cc) : null;
    const ruler = st?.ruler && st.ruler !== cc ? st.ruler : null;
    if (ruler && EMPIRE[ruler]) rulers.set(ruler, (rulers.get(ruler) ?? 0) + 1);
    const fill = cc === here ? 'var(--accent, #3b82f6)' : lived.has(cc) ? '#7aa7e0' : visited.has(cc) ? '#c9dcf3' : ruler && EMPIRE[ruler] ? EMPIRE[ruler] : 'var(--map-land, #e6e2d8)';
    const stroke = wars.has(cc) ? '#d33' : 'var(--map-edge, #9a9486)';
    const name = st?.name ?? periodCountryName(state, cc, COUNTRIES[cc]?.name ?? cc);
    return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${wars.has(cc) ? 1.4 : 0.4}"><title>${esc(name)}${ruler ? ` (${esc(rulerName(ruler))})` : ''}${wars.has(cc) ? ' · at war' : ''}</title></path>`;
  }).join('');
  // The road you travelled: birthplace, then each move.
  const route = [born, ...moves].map(centre).filter(Boolean);
  const line = route.length > 1 ? `<polyline points="${route.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#1d4ed8" stroke-width="1.5" stroke-dasharray="4 3"/>` : '';
  const dots = [...family].map(centre).filter(Boolean).map(([x, yy]) => `<circle cx="${x}" cy="${yy}" r="3" fill="#f59e0b" stroke="#fff" stroke-width="0.8"/>`).join('');
  const you = centre(here);
  const pin = you ? `<circle cx="${you[0]}" cy="${you[1]}" r="4.5" fill="#1d4ed8" stroke="#fff" stroke-width="1.2"><title>You are here</title></circle>` : '';
  const legend = [
    ['var(--accent, #3b82f6)', 'Where you live'], ['#7aa7e0', 'Where you have lived'], visited.size ? ['#c9dcf3', 'Visited'] : null, family.size ? ['#f59e0b', 'Family abroad'] : null, wars.size ? ['#d33', 'At war'] : null,
    ...[...rulers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([r]) => [EMPIRE[r], `Ruled by ${rulerName(r)}`]),
  ].filter(Boolean).map(([c, t]) => `<span class="map-key"><i style="display:inline-block;width:.8em;height:.8em;margin-right:.3em;border-radius:2px;vertical-align:middle;background:${c}"></i>${esc(t)}</span>`).join('');
  const svg = `<svg class="life-map" viewBox="0 0 ${MAP_W} ${MAP_H}" role="img" aria-label="Map of the world in ${y}" style="width:100%;height:auto;background:var(--map-sea, #cfe3ee);border-radius:8px">${paths}${line}${dots}${pin}</svg>`;
  return card(`The World in ${y}`, `${svg}<div class="map-legend" style="display:flex;flex-wrap:wrap;gap:.25rem .75rem;font-size:.8em;margin-top:.4rem">${legend}</div><p class="fine">Borders are today's outlines; the names and the colours are the world as it was. Tap a country for its name in ${y}.</p>`, { icon: '🗺️', open: false, summary: `${lived.size} countr${lived.size === 1 ? 'y' : 'ies'} lived in` });
}
