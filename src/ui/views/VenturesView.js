/**
 * Other ventures on the Business screen: the ones you run are always shown; the rest wait behind
 * one picker (a band, a label or a studio; a fund; a sports club; a newspaper or station), so the
 * screen isn't a wall of buttons.
 */
import { esc, card } from '../Components.js';
import { entertainmentCard } from './EntertainmentView.js';
import { fundCard } from './FundView.js';
import { clubCard } from './ClubView.js';
import { pressCard } from './PressView.js';

const VENTURES = {
  entertainment: { label: '🎸 Music & film', card: entertainmentCard, owned: (s) => Boolean((s.band && !s.band.split) || s.label || s.studio), minAge: 14 },
  fund: { label: '💼 A hedge fund', card: fundCard, owned: (s) => Boolean(s.fund), minAge: 21 },
  club: { label: '🏟️ A sports club', card: clubCard, owned: (s) => Boolean(s.club), minAge: 21 },
  press: { label: '📰 A newspaper or station', card: pressCard, owned: (s) => Boolean(s.press), minAge: 21 },
};

export function venturesView(state, ui = {}) {
  const age = state.character.age;
  const owned = Object.values(VENTURES).filter((v) => v.owned(state)).map((v) => v.card(state)).join('');
  const open = Object.entries(VENTURES).filter(([, v]) => !v.owned(state) && age >= v.minAge);
  if (!open.length) return owned;
  const pick = ui.venture && VENTURES[ui.venture] && !VENTURES[ui.venture].owned(state) ? ui.venture : '';
  const picker = `<label class="country-pick">Something else to run<select data-ui-set="venture" aria-label="Other ventures"><option value="">Choose…</option>${open.map(([id, v]) => `<option value="${id}"${id === pick ? ' selected' : ''}>${esc(v.label)}</option>`).join('')}</select></label>`;
  return `${owned}${card('Other Ventures', picker, { icon: '🧭' })}${pick ? VENTURES[pick].card(state) : ''}`;
}
