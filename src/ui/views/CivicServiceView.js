/**
 * Civic Service tab: national service (AmeriCorps, Peace Corps), your
 * state's State Defense Force, federal disaster teams and veterans' posts.
 */
import { esc, money, button, card, chip, kv, disclosure, optionRow } from '../Components.js';
import { ROLES, MAX_ROLES, roleEligibility, activeRoles } from '../../modules/service/Volunteering.js';
import { PROGRAMS, programEligibility } from '../../modules/service/NationalService.js';
import { equipmentCard } from './EquipmentView.js';
import { STATE_DEFENSE_FORCES, SDF_RANKS, SDF_SCHOOLS, sdfEligibility, sdfNextRank } from '../../modules/service/StateForces.js';
import { TEAMS, teamEligibility } from '../../modules/service/DisasterTeams.js';
import { POSTS, POST_RANKS, postEligibility, postLeader } from '../../modules/service/VeteranPosts.js';
import { stateIdOf } from '../../modules/life/Regions.js';
import { STATES } from '../../modules/life/States.js';

function nationalService(state) {
  const s = state.service;
  if (s.program) {
    const p = PROGRAMS[s.program.id];
    return card(p.name, `<p>${chip(`${p.icon} ${esc(p.tracks[s.program.track].name)}`, 'green')} ${chip(`📍 ${esc(s.program.site)}`)}</p>
      ${kv([['Year', `${s.program.years + 1} of ${s.program.term}`], ['Living allowance', `${money(p.stipend)}/yr`], ['When you finish', p.award ? `${money(p.award)}/yr education award` : `${money(p.readjustment)} readjustment allowance`]])}
      <p class="fine">Federal student loans are paused while you serve.</p>
      <div class="action-grid">${button('🚪 Leave early', 'service.quitProgram', { variant: 'danger', hint: 'No award' })}</div>`, { icon: p.icon, accent: 'green' });
  }
  const rows = Object.entries(PROGRAMS).flatMap(([id, p]) => Object.entries(p.tracks).map(([tid, t]) => {
    const check = programEligibility(state, id, tid);
    return { ok: check.ok, html: optionRow({ icon: p.icon, title: esc(t.name), sub: `${esc(t.desc)}`, meta: check.ok ? `${p.termYears === 1 ? '1-year term' : '27 months abroad'} · ${money(p.stipend)}/yr stipend` : esc(check.reason), tone: check.ok ? '' : 'warn', locked: !check.ok, action: button('Serve', 'service.joinProgram', { arg: `${id}:${tid}`, disabled: !check.ok, variant: 'small' }) }) };
  }));
  const open = rows.filter((r) => r.ok).length;
  const perks = [];
  if ((s.nceUntil ?? 0) >= state.character.age) perks.push(chip(`🏛️ Federal hiring eligibility through age ${s.nceUntil}`, 'green'));
  if (state.education.segalAward) perks.push(chip(`🎓 ${money(state.education.segalAward)} education award saved`, 'green'));
  for (const a of s.alumni.filter((x) => x.completed)) perks.push(chip(`${PROGRAMS[a.id].icon} ${a.id === 'peaceCorps' ? 'Returned Peace Corps Volunteer' : 'AmeriCorps alum'}`));
  return card('National Service', `<p class="muted">A year or two of full-time service for a living stipend. Finishing earns an education award (AmeriCorps) or a readjustment allowance (Peace Corps), plus an edge in federal hiring.</p>
    ${perks.length ? `<div class="chip-row">${perks.join('')}</div>` : ''}
    ${disclosure('civic.programs', 'AmeriCorps & Peace Corps programs', `<ul class="job-board">${rows.map((r) => r.html).join('')}</ul>`, { count: `${open} open` })}`, { icon: '🤝' });
}

function stateGuard(state) {
  const s = state.service;
  const stateId = stateIdOf(state);
  const name = STATE_DEFENSE_FORCES[stateId];
  if (s.sdf) {
    const nr = sdfNextRank(state);
    const done = Object.entries(SDF_SCHOOLS).filter(([id]) => s.sdf.schools?.[id]);
    const todo = Object.entries(SDF_SCHOOLS).filter(([id]) => !s.sdf.schools?.[id]);
    const usedSchool = Boolean(state.yearly['service.sdfSchool']);
    const todoRows = todo.map(([id, sc]) => {
      const reachable = sc.forRank <= s.sdf.rankIndex + 1;
      return optionRow({ icon: '📚', title: esc(sc.name), sub: `Needed for ${SDF_RANKS[sc.forRank]}`, meta: reachable ? (usedSchool ? 'One course a year' : '') : `Open to ${SDF_RANKS[sc.forRank - 1]}s and above`, tone: 'warn', locked: !reachable, action: button('Enroll', 'service.sdfSchool', { arg: id, variant: 'small', disabled: !reachable || usedSchool }) });
    }).join('');
    return card(s.sdf.name, `<p>${chip(`🛡️ ${SDF_RANKS[s.sdf.rankIndex]}`, 'green')} </p>${done.length ? `<div class="chip-row">${done.map(([, sc]) => chip(`✓ ${esc(sc.short ?? sc.name)}`)).join('')}</div>` : ''}
      ${kv([['Years', s.sdf.years], ['Time in rank', `${s.sdf.yearsInRank ?? 0} yrs`], ['Activations', s.sdf.activations]])}
      <div class="next-step">${nr?.next ? (nr.missing.length ? `🪜 <b>${esc(nr.next)}</b> needs: ${esc(nr.missing.join(' · '))}` : `🌟 Ready for <b>${esc(nr.next)}</b> when the next promotions are announced`) : '⭐ Top rank'}</div>
      ${todo.length ? disclosure('civic.sdfSchools', 'State Guard schools', `<ul class="job-board">${todoRows}</ul>`, { count: `${todo.length} left` }) : ''}
      <p class="fine">No promotion boards and no up-or-out: you move up after your time in rank, with the school for the next rank, when a slot opens above you.</p>
      <div class="action-grid">${button('🚪 Resign', 'service.leaveSdf', { variant: 'danger' })}</div>`, { icon: '🛡️' });
  }
  if (!name) return card('State Defense Force', `<p class="muted">${esc(STATES[stateId].name)} has no State Defense Force. Texas, New York, California, Florida, Ohio and Washington do.</p>`, { icon: '🛡️' });
  const check = sdfEligibility(state);
  return card(name, `<p class="muted">Your state's volunteer defense force: shelters, communications and search and rescue when the governor calls. Unpaid except on state active duty; prior service keeps its rank. Promotion is far easier than in the federal military.</p>
    <div class="action-grid">${button('🛡️ Join', 'service.joinSdf', { disabled: !check.ok, hint: check.reason ?? 'Ages 18–65' })}</div>`, { icon: '🛡️' });
}

function disasterTeams(state) {
  const rows = Object.entries(TEAMS).map(([id, t]) => {
    const m = state.service.teams[id];
    if (m) return optionRow({ icon: t.icon, title: esc(t.name), sub: `${esc(t.ranks[m.rankIndex])} · ${m.years} yrs · ${m.deployments} deployments`, meta: m.declined ? `${m.declined}/3 declines` : 'On the roster', tone: m.declined ? 'warn' : 'good', action: button('Resign', 'service.leaveTeam', { arg: id, variant: 'small danger' }) });
    const check = teamEligibility(state, id);
    return optionRow({ icon: t.icon, title: esc(t.name), sub: esc(t.desc), meta: check.ok ? (t.dailyPay ? `≈${money(t.dailyPay)}/day deployed` : 'Volunteer — expenses covered') : esc(check.reason), tone: check.ok ? '' : 'warn', locked: !check.ok, action: button('Join', 'service.joinTeam', { arg: id, disabled: !check.ok, variant: 'small' }) });
  }).join('');
  return card('Disaster Response Teams', `<p class="muted">Keep your job and deploy when disasters strike: paid federal teams (FEMA, DMAT, Urban Search &amp; Rescue) and volunteer ones (Team Rubicon, ARES ham radio).</p><ul class="job-board">${rows}</ul>`, { icon: '🏕️' });
}

function veteranPosts(state) {
  const left = 3 - (state.yearly['service.post'] ?? 0);
  const rows = Object.entries(POSTS).map(([id, p]) => {
    const m = state.service.posts[id];
    const org = m && state.orgs?.byId?.[m.orgId];
    if (org) {
      const lead = postLeader(org);
      const act = (kind, label) => button(label, 'service.postActivity', { arg: `${id}:${kind}`, variant: 'tiny', disabled: left <= 0 });
      return optionRow({
        icon: p.icon, title: esc(org.name),
        sub: `${esc(POST_RANKS[m.rankIndex])} · ${m.years} yrs · ${org.members} members${lead ? ` · post funds ${money(org.funds)}` : ''}<span class="toggle-row">${act('volunteer', '🐟 Volunteer')}${act('honorGuard', '🎺 Honor guard')}${act('mentor', '📋 Help a vet')}${lead ? `${act('fundraise', '💵 Fundraiser')}${act('scholarship', '🎓 Scholarship')}${act('advocate', '🏛️ Testify')}` : ''}</span>`,
        meta: `Standing ${m.standing} · officers elected every year`,
        action: button('Leave', 'service.leavePost', { arg: id, variant: 'small danger' }),
      });
    }
    const check = postEligibility(state, id);
    return optionRow({ icon: p.icon, title: esc(p.name), sub: `${esc(p.needs)} · $${p.dues}/yr dues`, meta: check.ok ? '' : esc(check.reason), tone: 'warn', locked: !check.ok, action: button('Join', 'service.joinPost', { arg: id, disabled: !check.ok, variant: 'small' }) });
  }).join('');
  const member = Object.values(state.service.posts).some(Boolean);
  return card('Veterans Posts', `<p class="muted">Fish fries, honor guards and helping younger veterans. Members elect officers every year; a post commander is a voice in local politics.</p><ul class="job-board">${rows}</ul>${member ? `<p class="fine">${left > 0 ? `${left} post activit${left === 1 ? 'y' : 'ies'} left this year.` : 'No post activities left this year.'}</p>` : ''}`, { icon: '🎖️' });
}

function volunteerRoles(state) {
  const mine = activeRoles(state);
  const rows = Object.entries(ROLES).map(([id, r]) => {
    const m = state.service.roles[id];
    if (m) return optionRow({ icon: r.icon, title: esc(r.name), sub: `${state.character.age - m.since} yrs · ${m.hours.toLocaleString()} hours${id === 'blood' && m.cases ? ` · ${m.cases} pints` : ''}${id === 'casa' && m.cases ? ` · ${m.cases} children` : ''}`, meta: r.paid ? `$${r.paid} per election` : 'Active', tone: 'good', action: button('Step down', 'volunteering.leave', { arg: id, variant: 'small' }) });
    const ok = roleEligibility(state, id);
    return optionRow({ icon: r.icon, title: esc(r.name), sub: `${esc(r.desc)} · ~${r.hours} hrs/yr`, meta: ok.ok ? (r.training ? esc(r.training) : '') : esc(ok.reason), tone: ok.ok ? '' : 'warn', locked: !ok.ok, action: button('Sign up', 'volunteering.join', { arg: id, variant: 'small', disabled: !ok.ok }) });
  }).join('');
  const total = state.service.volunteerHours ?? 0;
  return card('Volunteer Roles', `<p class="muted">Up to ${MAX_ROLES} commitments at once (${mine.length} now). Hours count toward the President's Volunteer Service Award (100 / 250 / 500 hours in a year) and the Lifetime Achievement Award at 4,000. Roles near your career make you better at it.</p>
    <p class="fine">Lifetime volunteer hours: <b>${total.toLocaleString()}</b></p><ul class="job-board">${rows}</ul>`, { icon: '🤲', accent: 'green' });
}

export function civicServiceView(state) {
  if (!state.service) return '';
  const history = state.service.history.length
    ? card('Past Service', `<ul class="history">${[...state.service.history].reverse().map((h) => `<li><b>${esc(h.name)}</b> · ${esc(h.title)} <small>${h.years} yrs, ended at ${h.endAge} — ${esc(h.reason)}</small></li>`).join('')}</ul>`, { icon: '🗂️' })
    : '';
  const gear = ['team.sdf', ...Object.keys(TEAMS).map((id) => `team.${id}`)].map((ref) => equipmentCard(state, ref)).join('');
  // AmeriCorps, the Peace Corps, State Defense Forces and FEMA teams are US programs: abroad, show only what you're already in.
  const abroad = Boolean(state.character.countryId);
  const s2 = state.service;
  const us = abroad
    ? `${s2.program ? `<div class="grid-2">${nationalService(state)}</div>` : ''}${s2.sdf ? stateGuard(state) : ''}${Object.values(s2.teams ?? {}).some(Boolean) ? disasterTeams(state) : ''}`
    : `<div class="grid-2">${nationalService(state)}${stateGuard(state)}</div>${disasterTeams(state)}`;
  return `${volunteerRoles(state)}${us}${gear}${veteranPosts(state)}${history}`;
}
