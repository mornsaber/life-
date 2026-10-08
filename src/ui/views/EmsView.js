/** Life on the ambulance on the Career tab: agency, shift, assignments, calls. */
import { esc, button, card, chip, kv, meter, disclosure } from '../Components.js';
import { AGENCIES, SHIFTS, ASSIGNMENTS, CE_HOURS, EMS_PROFESSIONS, agencyEligibility, assignmentEligibility, emsPayAdjust, shiftAllowed, emsSector } from '../../modules/ems/EmsLife.js';

export function emsCard(state) {
  const job = state.career.job;
  const e = state.ems;
  if (!EMS_PROFESSIONS.includes(job?.professionId) || !e) return '';
  const sector = emsSector(job);
  const a = AGENCIES[e.agency];
  const sh = SHIFTS[e.shift] ?? SHIFTS['24-48'];
  const moved = Boolean(state.yearly['ems.agency']);
  const bid = Boolean(state.yearly['ems.shift']);
  const agencies = Object.entries(AGENCIES).filter(([, x]) => x.sector === sector).map(([id, x]) => {
    const c = agencyEligibility(state, id);
    return button(`${x.icon} ${x.name}`, 'emsLife.agency', { arg: id, variant: e.agency === id ? 'small on' : 'small', disabled: e.agency === id || moved || !c.ok, hint: c.ok ? `Pay ×${x.pay} · ${x.desc}` : c.reason });
  }).join('');
  const shifts = Object.entries(SHIFTS).map(([id, x]) => button(`${x.icon} ${x.name}`, 'emsLife.shift', { arg: id, variant: e.shift === id ? 'small on' : 'small', disabled: e.shift === id || bid || !shiftAllowed(state, id), hint: shiftAllowed(state, id) ? `Pay ×${x.pay} · ${x.desc}` : 'Not offered by your agency' })).join('');
  const assignments = Object.entries(ASSIGNMENTS).map(([id, x]) => {
    const on = Boolean(e.assignments?.[id]);
    const ok = assignmentEligibility(state, id);
    const blocked = !on && !ok.ok;
    const why = ok.ok ? x.desc : ok.reason;
    return button(`${x.icon} ${on ? '✓ ' : ''}${x.name}`, 'emsLife.assignment', { arg: id, variant: on ? 'small on' : 'small', disabled: blocked, hint: blocked ? why : `${x.pay ? `+$${x.pay.toLocaleString()}/yr · ` : ''}${x.desc}` });
  }).join('');
  const burn = e.burnout ?? 0;
  const tally = [
    ['🚑', 'runs', e.calls], ['💓', 'saves', e.saves], ['👶', e.babies === 1 ? 'baby delivered' : 'babies delivered', e.babies], ['💉', 'Narcan given', e.narcan], ['🚌', 'MCIs', e.mci], ['🕯️', 'critical incidents', e.incidents],
  ].filter(([, , n]) => n).map(([i, l, n]) => chip(`${i} ${Number(n).toLocaleString()} ${l}`)).join(' ');
  return card('On the Ambulance', `${kv([
    ['Sector', sector === 'public' ? '🏛️ Public — civil service, union, pension' : '🏢 Private — more overtime, 401(k), no pension'],
    ['Agency', a ? `${a.icon} ${esc(a.name)}` : 'Choosing…'],
    ['Shift', `${sh.icon} ${esc(sh.name)}`],
    ['Pay vs. base', `×${emsPayAdjust(state).toFixed(2)}`],
    ['Recertification', `${Math.min(e.ce ?? 0, CE_HOURS)}/${CE_HOURS} CE hours${e.ceDueAge ? ` · due at ${e.ceDueAge}` : ''}`],
  ])}
    ${meter(burn, { max: 100, label: 'Burnout', suffix: '/100', tone: burn >= 70 ? 'bad' : burn >= 45 ? 'mid' : 'good' })}
    ${meter(Math.min(e.ce ?? 0, CE_HOURS), { max: CE_HOURS, label: 'Continuing education', suffix: ` / ${CE_HOURS} h`, tone: (e.ce ?? 0) >= CE_HOURS ? 'good' : 'mid' })}
    ${tally ? `<div class="chip-row">${tally}</div>` : ''}
    <div class="action-grid">
      ${button('⏰ Pick up overtime', 'emsLife.overtime', { variant: 'small', disabled: (state.yearly['ems.overtime'] ?? 0) >= (sector === 'private' ? 3 : 2), hint: 'Time-and-a-half; more burnout' })}
      ${button('📚 Continuing education', 'emsLife.ce', { variant: 'small', disabled: Boolean(state.yearly['ems.ce']), hint: `+36 hours toward ${CE_HOURS}` })}
      ${button('🫂 Stress debriefing', 'emsLife.cism', { variant: 'small', disabled: Boolean(state.yearly['ems.cism']), hint: 'Less trauma and burnout' })}
    </div>
    ${disclosure('ems.agency', `Agency${moved ? ' (moved this year)' : ''}`, `<div class="toggle-row">${agencies}</div>`, { count: a ? a.name : 'choose' })}
    ${disclosure('ems.shift', `Shift bid${bid ? ' (bid this year)' : ''}`, `<div class="toggle-row">${shifts}</div>`, { count: sh.name })}
    ${disclosure('ems.assign', 'Special assignments (up to two)', `<div class="toggle-row">${assignments}</div>`, { count: `${Object.keys(e.assignments ?? {}).length} of 2` })}
    <p class="fine">EMT → Paramedic → Critical Care → Flight. Recertify every two years. Years on the ambulance count toward PA school, and paramedics get a year off nursing school.</p>`, { icon: '🚑', accent: 'red' });
}
