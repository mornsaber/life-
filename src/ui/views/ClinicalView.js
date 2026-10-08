/** Clinical practice on the Career tab: setting, schedule, the clinical ladder, CE and burnout. */
import { esc, button, card, chip, kv, meter, disclosure } from '../Components.js';
import { SHIFTS, LADDER, clinicalOf, isAdmin, settingOf, settingEligibility, shiftAllowed, clinicalPayAdjust, ceRequired, licenseOf, ladderCheck, professionBoards } from '../../modules/clinical/ClinicalLife.js';
import { hasCredential } from '../../modules/credentials/LicensingEngine.js';
import { credentialName } from '../../modules/credentials/CredentialRegistry.js';
import { yearsInProfession } from '../../core/State.js';

export function clinicalCard(state) {
  const job = state.career.job;
  const prof = clinicalOf(job);
  const c = state.clinical;
  if (!prof || !c) return '';
  const s = settingOf(state, job);
  const admin = isAdmin(job);
  const sh = SHIFTS[c.shift] ?? SHIFTS.days;
  const word = job.professionId === 'physicianAssistant' ? 'Specialty' : prof.group === 'nursing' ? 'Unit' : 'Setting';
  const moved = Boolean(state.yearly['clinical.setting']);
  const bid = Boolean(state.yearly['clinical.shift']);
  const settings = Object.entries(prof.settings).map(([id, x]) => {
    const ok = settingEligibility(state, id, job);
    const board = x.cert ? ` · ${credentialName(x.cert)} pays +4%` : '';
    return button(`${x.icon} ${x.name}`, 'clinical.setting', { arg: id, variant: c.setting === id ? 'small on' : 'small', disabled: c.setting === id || moved || !ok.ok, hint: ok.ok ? `Pay ×${x.pay}${board} · ${x.desc}` : ok.reason });
  }).join('');
  const shifts = Object.entries(SHIFTS).map(([id, x]) => {
    const ok = shiftAllowed(state, id, job);
    return button(`${x.icon} ${x.name}`, 'clinical.shift', { arg: id, variant: c.shift === id ? 'small on' : 'small', disabled: c.shift === id || bid || !ok, hint: ok ? `Pay ×${x.pay} · ${x.desc}` : 'Not offered in your setting' });
  }).join('');
  const lic = licenseOf(job);
  const licensed = lic && hasCredential(state, lic);
  const need = ceRequired(job);
  const burn = c.burnout ?? 0;
  const ladder = prof.ladder && !admin ? ladderCheck(state, job) : null;
  const boards = professionBoards(job).map((b) => chip(`${hasCredential(state, b) ? '✅' : '⬜'} ${esc(credentialName(b))}`, hasCredential(state, b) ? 'good' : '')).join(' ');
  const tally = [['🧑‍⚕️', prof.noun, c.patients], ['🔎', 'catches & saves', c.catches], ['🧑‍🏫', 'preceptees', c.precepted], ['📊', 'QI projects', c.projects], ['🤝', 'loans repaid', c.loanRepaid ? `$${c.loanRepaid.toLocaleString()}` : 0]]
    .filter(([, , n]) => n).map(([i, l, n]) => chip(`${i} ${typeof n === 'number' ? n.toLocaleString() : n} ${l}`)).join(' ');
  const body = `${kv([
    [word, s ? `${s.icon} ${esc(s.name)}` : 'Choosing…'],
    admin ? ['Role', 'Leadership — you manage the people at the bedside'] : ['Schedule', `${sh.icon} ${esc(sh.name)}`],
    ['Pay vs. base', `×${clinicalPayAdjust(state, job).toFixed(2)}`],
    prof.ladder && !admin ? ['Clinical ladder', `${LADDER[(c.ladder ?? 1) - 1].name} · ${c.points ?? 0} points`] : null,
    ['Experience', `${yearsInProfession(state, [job.professionId])} yr`],
    licensed ? ['License renewal', `${Math.min(c.ce ?? 0, need)}/${need} CE hours${c.ceDueAge ? ` · due at ${c.ceDueAge}` : ''}`] : null,
  ])}
    ${meter(burn, { max: 100, label: 'Burnout', suffix: '/100', tone: burn >= 70 ? 'bad' : burn >= 45 ? 'mid' : 'good' })}
    ${licensed ? meter(Math.min(c.ce ?? 0, need), { max: need, label: 'Continuing education', suffix: ` / ${need} h`, tone: (c.ce ?? 0) >= need ? 'good' : 'mid' }) : ''}
    ${tally ? `<div class="chip-row">${tally}</div>` : ''}
    <div class="action-grid">
      ${button('⏰ Incentive shifts', 'clinical.extraShifts', { variant: 'small', disabled: (state.yearly['clinical.extra'] ?? 0) >= 2, hint: 'Extra pay; more burnout' })}
      ${button('🗓️ PRN job elsewhere', 'clinical.prn', { variant: 'small', disabled: !licensed || Boolean(state.yearly['clinical.prn']), hint: licensed ? 'Moonlight at another facility' : 'Needs an active license' })}
      ${button('📚 Continuing education', 'clinical.ce', { variant: 'small', disabled: Boolean(state.yearly['clinical.ce']), hint: 'Courses and a conference' })}
      ${button('🧑‍🏫 Precept a new grad', 'clinical.precept', { variant: 'small', disabled: Boolean(state.yearly['clinical.precept']) || yearsInProfession(state, [job.professionId]) < 2, hint: '+2 ladder points, $1,500 differential (2+ years)' })}
      ${button('🗂️ Practice council', 'clinical.committee', { variant: 'small', disabled: Boolean(state.yearly['clinical.committee']), hint: '+1 ladder point' })}
      ${button('📊 Quality project', 'clinical.project', { variant: 'small', disabled: Boolean(state.yearly['clinical.project']), hint: 'Evidence-based practice; up to +3 points' })}
      ${ladder ? button(`🪜 Apply for ${ladder.next?.name ?? 'the next rung'}`, 'clinical.ladder', { variant: 'small', disabled: !ladder.ok || Boolean(state.yearly['clinical.ladder']), hint: ladder.ok ? `+${Math.round(ladder.next.raise * 100)}% differential` : ladder.reason }) : ''}
    </div>
    ${admin ? '' : disclosure('clinical.where', `${word}${moved ? ' (transferred this year)' : ''}`, `<div class="toggle-row">${settings}</div>`, { count: `${Object.keys(prof.settings).length} options` })}
    ${admin ? '' : disclosure('clinical.shift', `Schedule${bid ? ' (changed this year)' : ''}`, `<div class="toggle-row">${shifts}</div>`, { count: sh.name })}
    ${boards ? `<h4 class="sub">Specialty boards</h4><div class="chip-row">${boards}</div><p class="fine">Earn them on the Licenses tab; the one that matches your ${word.toLowerCase()} pays a premium and counts toward Clinical III.</p>` : ''}`;
  return card('Clinical Practice', body, { icon: s?.icon ?? '🏥', accent: 'green' });
}
