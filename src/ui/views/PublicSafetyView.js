/** Police and fire on the Career tab. */
import { esc, button, card, chip, kv, disclosure } from '../Components.js';
import { AREAS, SHIFTS as PSHIFTS, UNITS, BUREAUS, isCop, unitEligibility } from '../../modules/publicsafety/PoliceLife.js';
import { STATIONS, SHIFTS as FSHIFTS, TEAMS, MAX_TEAMS, isFirefighter, stationEligibility, teamEligibility, stationsFor } from '../../modules/publicsafety/FireLife.js';
import { nextExam, REACHABLE } from '../../modules/publicsafety/CivilService.js';

const n = (x) => Number(x ?? 0).toLocaleString();

function examBlock(state, job, action) {
  const next = nextExam(job);
  if (!next) return '';
  const e = job.promoList?.[next.id];
  const taken = Boolean(state.yearly['cs.exam']);
  return `<h4 class="sub">Promotional exam: ${esc(next.title)}</h4>
    <p class="fine">${e ? `You're <b>#${e.rank}</b> on the ${esc(next.title.toLowerCase())}'s list (score ${e.score}), which expires at ${e.expiresAge}. Promotions go down the list as seats open; you're promoted at #${REACHABLE}.` : 'Civil-service rule: you sit a written exam and an oral board, and promotions go down the ranked list. The list expires after two years.'}</p>
    <div class="action-grid">${button('📝 Sit the exam', action, { arg: 'self', variant: 'small', disabled: taken, hint: 'Your smarts and record decide the score' })}${button('📚 Prep course + exam ($800)', action, { arg: 'prep', variant: 'small', disabled: taken, hint: '+10 points' })}</div>`;
}

export function policeCard(state) {
  const job = state.career.job;
  const p = state.police;
  if (!isCop(job) || !p) return '';
  const area = AREAS[p.area] ?? AREAS.downtown;
  const unit = UNITS[p.unit];
  const detective = /detective|investigator|majorCrimes/i.test(job.levelId);
  const areas = Object.entries(AREAS).filter(([, a]) => !a.only || a.only.includes(job.professionId)).map(([id, a]) => button(`${a.icon} ${a.name}`, 'police.area', { arg: id, variant: p.area === id ? 'small on' : 'small', disabled: p.area === id || Boolean(state.yearly['police.area']), hint: a.desc })).join('');
  const shifts = Object.entries(PSHIFTS).map(([id, s]) => button(`${s.icon} ${s.name}`, 'police.shift', { arg: id, variant: p.shift === id ? 'small on' : 'small', disabled: p.shift === id || Boolean(state.yearly['police.shift']), hint: s.pay > 1 ? `+${Math.round((s.pay - 1) * 100)}% differential` : '' })).join('');
  const units = Object.entries(UNITS).map(([id, u]) => {
    const on = p.unit === id;
    const ok = unitEligibility(state, id);
    return button(`${u.icon} ${on ? '✓ ' : ''}${u.name}`, 'police.unit', { arg: id, variant: on ? 'small on' : 'small', disabled: !on && (!ok.ok || Boolean(state.yearly['police.unit'])), hint: on ? 'Return to patrol' : ok.ok ? `${u.pay ? `+$${n(u.pay)}/yr · ` : ''}${u.desc}` : ok.reason });
  }).join('');
  const bureaus = detective ? Object.entries(BUREAUS).map(([id, b]) => button(`${b.icon} ${b.name}`, 'police.bureau', { arg: id, variant: p.bureau === id ? 'small on' : 'small', disabled: p.bureau === id || p.brady, hint: b.desc })).join('') : '';
  const tally = [['📞', 'calls', p.calls], ['🔗', 'arrests', p.arrests], ['📜', 'commendations', p.commendations], ['📄', 'complaints', p.complaints], ['✋', 'uses of force', p.uof], ['🔫', 'shootings', p.ois], ['🤕', 'injuries', p.injuries]].filter(([, , v]) => v).map(([i, l, v]) => chip(`${i} ${n(v)} ${l}`)).join(' ');
  return card('On the Street', `${kv([
    ['Assignment', `${area.icon} ${esc(area.name)}${unit ? ` · ${unit.icon} ${esc(unit.name)}` : ''}${p.bureau ? ` · ${BUREAUS[p.bureau].icon} ${esc(BUREAUS[p.bureau].name)}` : ''}`],
    ['Shift', `${PSHIFTS[p.shift]?.icon ?? ''} ${esc(PSHIFTS[p.shift]?.name ?? 'Days')}`],
    p.brady ? ['Brady list', '<span class="neg">Yes — your credibility can be attacked in every case</span>'] : null,
  ])}
    ${tally ? `<div class="chip-row">${tally}</div>` : ''}
    <div class="action-grid">
      ${button('🦺 Work off-duty details', 'police.details', { variant: 'small', disabled: Boolean(state.yearly['police.details']), hint: 'Paid security and traffic posts: $9k–26k' })}
      ${button('🫂 Peer support', 'police.peer', { variant: 'small', disabled: Boolean(state.yearly['police.peer']), hint: 'Less trauma and stress' })}
    </div>
    ${examBlock(state, job, 'police.exam')}
    ${disclosure('police.units', 'Specialty units', `<div class="toggle-row">${units}</div>`, { count: unit ? unit.name : 'Patrol' })}
    ${bureaus ? disclosure('police.bureaus', 'Detective bureau', `<div class="toggle-row">${bureaus}</div>`, { count: p.bureau ? BUREAUS[p.bureau].name : 'choose' }) : ''}
    ${disclosure('police.where', 'Precinct & shift', `<div class="toggle-row">${areas}</div><div class="toggle-row">${shifts}</div>`, { count: area.name })}
    <p class="fine">Calls you'll remember come as decisions. Complaints, uses of force and an honest report all go in your file; lying in one can put you on the prosecutor's Brady list.</p>`, { icon: '🚓', accent: 'blue' });
}

export function fireCard(state) {
  const job = state.career.job;
  const f = state.fireLife;
  if (!isFirefighter(job) || !f) return '';
  const st = STATIONS[f.station] ?? STATIONS[stationsFor(job.professionId)[0]];
  const stations = Object.entries(STATIONS).filter(([id]) => stationsFor(job.professionId).includes(id)).map(([id, s]) => {
    const ok = stationEligibility(state, id);
    return button(`${s.icon} ${s.name}`, 'fireLife.station', { arg: id, variant: f.station === id ? 'small on' : 'small', disabled: f.station === id || !ok.ok || Boolean(state.yearly['fire.station']), hint: ok.ok ? s.desc : ok.reason });
  }).join('');
  const shifts = Object.entries(FSHIFTS).map(([id, s]) => button(`${s.icon} ${s.name}`, 'fireLife.shift', { arg: id, variant: f.shift === id ? 'small on' : 'small', disabled: f.shift === id || Boolean(state.yearly['fire.shift']), hint: s.desc })).join('');
  const teams = Object.entries(TEAMS).filter(([id]) => !/Not an? .* team/.test(teamEligibility(state, id).reason ?? '')).map(([id, t]) => {
    const on = Boolean(f.teams[id]);
    const ok = teamEligibility(state, id);
    return button(`${t.icon} ${on ? '✓ ' : ''}${t.name}`, 'fireLife.team', { arg: id, variant: on ? 'small on' : 'small', disabled: !on && !ok.ok, hint: on ? 'Leave the team' : ok.ok ? `${t.pay ? `+$${n(t.pay)}/yr · ` : ''}${t.desc}` : ok.reason });
  }).join('');
  const tally = [['🚒', 'runs', f.runs], ['🔥', 'working fires', f.fires], ['🙌', 'saves', f.saves], ['🌲', 'strike-team deployments', f.strikeTeams], ['🤕', 'injuries', f.injuries]].filter(([, , v]) => v).map(([i, l, v]) => chip(`${i} ${n(v)} ${l}`)).join(' ');
  return card('The Firehouse', `${kv([
    ['Station', `${st.icon} ${esc(st.name)}`],
    ['Schedule', `${FSHIFTS[f.shift]?.icon ?? ''} ${esc(FSHIFTS[f.shift]?.name ?? '24/48')}`],
    ['Teams', Object.keys(f.teams).map((id) => `${TEAMS[id].icon} ${esc(TEAMS[id].name)}`).join(', ') || 'None'],
    ['Smoke exposure', `${f.exposure} · ${f.decon ? '🧼 clean-cab practices' : '<span class="neg">no decon</span>'}`],
  ])}
    ${tally ? `<div class="chip-row">${tally}</div>` : ''}
    <div class="action-grid">
      ${button(f.decon ? '🧼 Decon: on' : '🧼 Start clean-cab decon', 'fireLife.decon', { variant: f.decon ? 'small on' : 'small', hint: 'Cuts long-term cancer risk' })}
      ${button('🩺 Annual cancer screening', 'fireLife.screening', { variant: 'small', disabled: Boolean(state.yearly['fire.screen']), hint: 'Catch it early' })}
      ${button(f.sideJob ? '🧰 Side business: on' : '🧰 Start a side business', 'fireLife.sideJob', { variant: f.sideJob ? 'small on' : 'small', hint: '$12k–32k on your days off; more stress' })}
    </div>
    ${examBlock(state, job, 'fireLife.exam')}
    ${disclosure('fire.teams', `Special teams (up to ${MAX_TEAMS})`, `<div class="toggle-row">${teams}</div>`, { count: `${Object.keys(f.teams).length} of ${MAX_TEAMS}` })}
    ${disclosure('fire.station', 'Station & schedule', `<div class="toggle-row">${stations}</div><div class="toggle-row">${shifts}</div>`, { count: st.name })}
    <p class="fine">Most runs are medical; fires are rarer and decide careers. Firefighters get cancer at higher rates — decon and screening help, and presumptive-cancer laws cover treatment.</p>`, { icon: '🚒', accent: 'red' });
}
