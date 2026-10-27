/**
 * Work that takes you abroad, on the Career tab: your ship (merchant navy) and your bureau
 * (foreign correspondents).
 */
import { esc, button, card, kv, select } from '../Components.js';
import { SHIP_TYPES, flagName, routeOf } from '../../modules/career/Seafaring.js';
import { BUREAUS, bureauCheck, bureausFor } from '../../modules/career/Correspondent.js';
import { COUNTRIES } from '../../modules/world/Countries.js';
import { DISCIPLINES, activeAthlete, olympian, international, rating } from '../../modules/career/Sport.js';

export function shipCard(state) {
  const job = state.career.job;
  if (job?.professionId !== 'merchantMarine' || !job.ship) return '';
  const s = job.ship;
  const t = SHIP_TYPES[s.type];
  return card('Your Ship', `${kv([
    ['Vessel', `${t.icon} ${esc(s.name)}, a ${esc(t.name)}`],
    ['Flag', `${esc(flagName(s.flag))}${['PA', 'LR', 'MH', 'MT', 'BS'].includes(s.flag) ? ' (a flag of convenience)' : ''}`],
    ['Trade', esc(routeOf(job).name)],
    job.contract ? ['Contract', `Nine months at sea through ${esc(job.contract.agency)}`] : null,
  ].filter(Boolean))}
    <div class="enroll-form" data-collect-root>${select('type', Object.entries(SHIP_TYPES).map(([id, x]) => ({ value: id, label: `${x.icon} ${x.name}${x.pay > 1 ? ` (+${Math.round((x.pay - 1) * 100)}% pay)` : ''}` })), { value: s.type })}${button('⚓ Find a berth on another ship', 'seafaring.changeShip', { variant: 'small', collect: true, hint: 'Once a year' })}</div>
    <p class="fine">Most ships fly a flag of convenience and are crewed through manning agencies. Piracy haunts some routes; a bankrupt owner can leave a crew stranded in port.</p>`, { icon: '🚢' });
}

export function bureauCard(state) {
  const job = state.career.job;
  if (job?.professionId !== 'journalism') return '';
  const b = job.bureau;
  if (b && b.until > state.character.age) {
    const bureau = BUREAUS[b.id];
    return card('Foreign Bureau', `<p>You are the <b>${esc(bureau.city)}</b> correspondent (${esc(COUNTRIES[bureau.cc]?.name ?? bureau.cc)}) until age ${b.until}. ${b.scoops} big stor${b.scoops === 1 ? 'y' : 'ies'} so far.</p>`, { icon: '🌍' });
  }
  const check = bureauCheck(state);
  if (!check.ok && /Journalists only/.test(check.reason)) return '';
  return card('Foreign Bureau', `<p class="muted">Senior reporters can ask the foreign desk for a bureau abroad: three years, a story a year, and in some countries a real risk.</p>
    <div class="enroll-form" data-collect-root>${select('bureau', bureausFor(state).map(([id, x]) => ({ value: id, label: `${x.city}${x.war ? ' (conflict)' : ''}` })))}${button('🌍 Ask for the posting', 'correspondent.ask', { variant: 'small primary', collect: true, disabled: !check.ok, hint: check.ok ? '' : check.reason })}</div>${b?.expelled ? '<p class="fine">You were expelled from your last posting.</p>' : ''}`, { icon: '🌍' });
}

/** International sport: your country's colours, the Games, and running sport afterwards. */
export function sportCard(state) {
  const s = state.sport;
  const athlete = activeAthlete(state);
  if (!athlete && !s?.caps && !olympian(state) && !s?.federation && !s?.ioc) return '';
  const d = DISCIPLINES[s?.discipline];
  const medals = (s?.olympics ?? []).filter((o) => o.place);
  const games = (s?.olympics ?? []).map((o) => `${o.city} ${o.year}${o.place ? ` ${{ 1: '🥇', 2: '🥈', 3: '🥉' }[o.place]}` : ''}${o.stripped ? ' (medal stripped)' : ''}`).join(', ');
  const rows = [
    d ? ['Sport', d.label] : null,
    athlete ? ['Form', `${rating(state)}/100`] : null,
    ['International caps', `${s?.caps ?? 0}${s?.captain ? ' · ©️ captain' : ''}`],
    games ? ['Olympic Games', esc(games)] : null,
    (s?.cups ?? []).length ? ['World Cups', esc(s.cups.map((c) => `${c.year}${c.won ? ' 🏆' : ''}`).join(', '))] : null,
    s?.federation ? ['Federation', s.federation === 'president' ? 'President' : 'Board member'] : null,
    s?.ioc ? ['IOC', `Member since age ${s.ioc.since}`] : null,
    s?.fifa ? ['FIFA Council', `Since age ${s.fifa.since}`] : null,
    s?.banUntil && s.banUntil > state.character.age ? ['Ban', `<span class="neg">Banned from competition until age ${s.banUntil}</span>`] : null,
  ].filter(Boolean);
  const choose = athlete && !s?.caps ? `<div class="enroll-form" data-collect-root>${select('sport', Object.entries(DISCIPLINES).map(([id, x]) => ({ value: id, label: x.label })), { value: s?.discipline ?? 'football' })}${button('Commit to this sport', 'sport.discipline', { variant: 'small', collect: true })}</div>` : '';
  const after = athlete ? '' : `<div class="toggle-row">${s?.federation ? '' : button('🏅 Stand for the federation board', 'sport.federation', { variant: 'small', disabled: !international(state), hint: 'Former internationals' })}${s?.ioc ? '' : button('🏅 Seek IOC membership', 'sport.ioc', { variant: 'small', disabled: !olympian(state) && s?.federation !== 'president', hint: 'Olympians and federation presidents' })}${s?.discipline === 'football' && s?.federation === 'president' && !s?.fifa ? button('⚽ Stand for the FIFA Council', 'sport.fifa', { variant: 'small' }) : ''}</div>`;
  return card('International Sport', `${kv(rows)}${choose}${after}<p class="fine">${medals.length ? `${medals.length} Olympic medal${medals.length > 1 ? 's' : ''}. ` : ''}Good form gets you called up; the Olympics come every four years.</p>`, { icon: '🏟️' });
}
