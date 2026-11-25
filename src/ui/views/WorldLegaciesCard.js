/**
 * What your lives leave in the world: places, institutions, the paper, the schools, firsts and
 * records, the war memorial, the land, the seat (modules/life/WorldLegacies.js).
 */
import { esc, money, button, card } from '../Components.js';
import { yearNow } from '../../modules/world/Eras.js';
import { PLACES, placeCheck, INSTITUTIONS, institutionCheck, institutionsHere, PAPER_LINES, CURRICULA, RITES, canSetCurriculum, isBishop, firstsOf, recordsOf, memorialsHere, earlyMilestones, improvementsNow, seatNames } from '../../modules/life/WorldLegacies.js';
import { EXPEDITIONS } from '../../modules/career/Feats.js';
import { CLASSES, classNow, originOf, welfareHere } from '../../modules/life/ClassOfTheDay.js';

const rich = (state) => ({ ...state, finances: { ...state.finances, cash: Infinity } });
const sub = (t, body) => (body ? `<h4 class="sub">${t}</h4>${body}` : '');

export function worldLegaciesCard(state) {
  if (state.character.age < 18) return '';
  const y = yearNow(state);
  const gen = state.lineage?.generation ?? 1;
  const places = Object.entries(PLACES).filter(([k]) => !/Not of its day|No frontier|Not here|one already/.test(placeCheck(rich(state), k) ?? '')).map(([k, p]) => button(`${p.icon} ${p.label}`, 'worldLegacies.place', { arg: k, variant: 'small', disabled: Boolean(placeCheck(state, k)), hint: placeCheck(state, k) ?? '' })).join('');
  const found = Object.entries(INSTITUTIONS).filter(([k]) => !/not allowed|belongs to the state|already/.test(institutionCheck(rich(state), k) ?? '')).map(([k, i]) => button(`${i.icon} ${i.label}`, 'worldLegacies.found', { arg: k, variant: 'small', disabled: Boolean(institutionCheck(state, k)), hint: institutionCheck(state, k) ?? '' })).join('');
  const insts = institutionsHere(state).map((i) => `<li>${INSTITUTIONS[i.kind].icon} <b>${esc(i.name)}</b> <small class="muted">founded ${i.founded} by ${i.gen === gen ? 'you' : esc(i.by)} · standing ${i.rep}/100${i.politics ? ` · ${PAPER_LINES[i.politics]}` : ''}</small>
    ${i.kind === 'newspaper' && i.gen === gen ? `<div class="toggle-row">${Object.entries(PAPER_LINES).map(([l, lab]) => button(lab, 'worldLegacies.paperLine', { arg: `${i.id}|${l}`, variant: i.politics === l ? 'tiny primary' : 'tiny' })).join('')}${button('✏️ New masthead', 'worldLegacies.renamePaper', { arg: i.id, variant: 'tiny' })}</div>` : ''}</li>`).join('');
  const bring = earlyMilestones(state).map((o) => button(`${o.icon} Bring ${o.id === 'railway' ? 'the railway' : o.id === 'gas' ? 'gas lamps' : o.id === 'water' ? 'clean water' : o.id === 'trams' ? 'trams' : 'electric light'} now (due ${o.due})`, 'worldLegacies.bring', { arg: o.id, variant: 'small', hint: money(o.cost) })).join('');
  const land = improvementsNow(state).map((o) => button(`${o.icon} ${o.label}`, 'worldLegacies.improve', { arg: o.id, variant: 'small', hint: money(o.cost) })).join('');
  const cur = state.era?.curriculum?.[state.character.countryId ?? 'US'];
  const schools = canSetCurriculum(state) ? `<div class="action-grid">${Object.entries(CURRICULA).map(([k, c]) => button(c.label, 'worldLegacies.curriculum', { arg: k, variant: cur?.emphasis === k ? 'small primary' : 'small', hint: c.note })).join('')}</div>` : '';
  const rite = isBishop(state) ? `<div class="action-grid">${Object.entries(RITES).map(([k, l]) => button(l, 'worldLegacies.rite', { arg: k, variant: 'small' })).join('')}</div>` : '';
  const seat = state.dynasty?.seat ? `<div class="action-grid">${seatNames(state).map((n) => button(`🏰 ${n}`, 'worldLegacies.nameSeat', { arg: n, variant: state.dynasty.seat.name === n ? 'small primary' : 'small' })).join('')}</div>` : '';
  const facts = [
    ...firstsOf(state).map((f) => `🧭 First: ${esc(EXPEDITIONS[f.id]?.label ?? f.id)} — ${esc(f.by)}, ${f.year}`),
    ...recordsOf(state).map((r) => `⏱️ World record (${esc(r.discipline)}) — ${esc(r.by)}, ${r.year}${r.broken ? ` <small class="muted">(broken ${r.broken})</small>` : ' <small>(still stands)</small>'}`),
    ...memorialsHere(state).map((m) => `🪦 On the war memorial: ${esc(m.name)} <small class="muted">${esc(m.cause)}</small>`),
    cur ? `🏫 The schools teach ${esc(CURRICULA[cur.emphasis]?.label.slice(3).toLowerCase() ?? '')} (since ${cur.year}, ${esc(cur.by)})` : '',
    ...(state.farm?.improvements ?? []).map((i) => `🌾 ${esc(i.id)} the land (${i.year}, ${esc(i.by)})`),
  ].filter(Boolean).map((x) => `<li>${x}</li>`).join('');
  if (!places && !found && !insts && !bring && !land && !schools && !rite && !seat && !facts) return '';
  return card('What Your Lives Leave', `${facts ? `<ul class="history">${facts}</ul>` : ''}${insts ? `<ul class="history">${insts}</ul>` : ''}
    ${sub('Put your name on the map', places ? `<div class="action-grid">${places}</div>` : '')}
    ${sub('Found something that outlasts you', found ? `<div class="action-grid">${found}</div>` : '')}
    ${sub('Bring it to town early', bring ? `<div class="action-grid">${bring}</div>` : '')}
    ${sub('Improve the land', land ? `<div class="action-grid">${land}</div>` : '')}
    ${sub('What the schools teach', schools)}${sub('The rite of the church', rite)}${sub('Name the family seat', seat)}
    <p class="fine">All of this stays in the world for your heirs: they live with what you built.</p>`, { icon: '🗺️', summary: y ? '' : '' });
}

/** Class: where you started, where you are, and the friendly society. */
export function classCard(state) {
  if (state.character.age < 18) return '';
  const c = state.classDay ?? {};
  const y = yearNow(state);
  const origin = originOf(state);
  const now = classNow(state);
  const rows = [
    `<li>🏠 Born: <b>${esc(CLASSES[origin])}</b></li>`,
    `<li>🪜 Now: <b>${esc(CLASSES[now])}</b>${now !== origin ? ' <small class="muted">(moved in your own lifetime)</small>' : ''}</li>`,
    c.polished ? '<li>🎩 Elocution and a good tailor: most people can\'t place you</li>' : '',
    c.society ? `<li>🤝 Member of ${esc(c.society.name)} since age ${c.society.since}</li>` : '',
  ].join('');
  const acts = [
    !welfareHere(state) || c.society ? button(c.society ? '🤝 Leave the friendly society' : '🤝 Join a friendly society (sick pay, a decent funeral)', 'classDay.join', { variant: 'small' }) : '',
    y < 1975 && !c.polished && ['working', 'lowerMiddle'].includes(origin) ? button('🎩 Elocution lessons', 'classDay.polish', { variant: 'small', hint: 'Doors open a little wider' }) : '',
  ].join('');
  return card('Class', `<ul class="history">${rows}</ul>${acts ? `<div class="action-grid">${acts}</div>` : ''}
    <p class="fine">${y < 1970 ? 'The right accent and the right school still open the best doors: the diplomatic service, the bar, the City.' : 'Where you started still counts, but less than it did.'}</p>`, { icon: '🪜', summary: CLASSES[now] });
}
