/**
 * Elected (and council-appointed) executives run real organizations.
 *
 * Some political offices *are* the head of an organization in OrgTypes:
 * the sheriff heads the Sheriff's Office, the district attorney the DA's
 * Office, the county commission chair the county, the city manager the city.
 * While you hold the office:
 *
 *  - you are that head (the NPC holder is gone until you leave office);
 *  - you appoint your second-in-command (undersheriff, first assistant DA)
 *    — a career professional, a loyalist or a reformer;
 *  - you manage named staff: commend, discipline, promote, fire. Deputies
 *    and assistant DAs are civil servants: firing without cause usually ends
 *    in a grievance that puts them back;
 *  - the office's performance (staff quality, morale, your deputy) moves
 *    your approval every year — a badly run office is a campaign issue.
 *
 * Mayors and governors appoint the heads of departments and agencies
 * (Government.js); their appointees' results feed approval there.
 *
 * Office seat state: dept.officeHead / org.officeHead = true, dept.performance,
 * dept.morale (or org.performance / org.morale for an organization seat).
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { REGIONS } from '../life/Regions.js';
import { OFFICES } from '../politics/Offices.js';
import { getProfession } from '../career/JobTrees.js';
import { ladderFor } from '../career/Ladder.js';
import { ORG_TYPES } from './OrgTypes.js';
import { orgType, sideRng, newPerson, personOf, seatHolders, ensureOrgOfType, ensureHeads, supervises } from './Organizations.js';
import { seat, seatsAt, NAMED_SEATS, departure } from './Vacancies.js';
import { rememberDeparture } from './Churn.js';

/** Executive offices that head an organization: officeId → { typeId, deptId|null }, read from OrgTypes. */
export const OFFICE_SEATS = Object.fromEntries(Object.entries(ORG_TYPES).flatMap(([typeId, t]) => [
  ...(t.head.office ? [[t.head.office, { typeId, deptId: null }]] : []),
  ...t.departments.filter((d) => d.head.office).map((d) => [d.head.office, { typeId, deptId: d.id }]),
]).filter(([officeId]) => ['sheriff', 'prosecutor', 'executive'].includes(OFFICES[officeId]?.kind)));

/** Office actions per year. */
export const OFFICE_ACTIONS = 4;
const OFFICE_SIZE = { rural: 'small', smalltown: 'small', gunnison: 'small', midcity: 'medium' };

export const DEPUTY_KINDS = {
  professional: { label: '🏅 A career professional', performance: 82, morale: 3, approval: 0 },
  loyalist: { label: '🤝 A loyal campaign ally', performance: 55, morale: -2, approval: 2 },
  reformer: { label: '🧹 An outside reformer', performance: 72, morale: -5, approval: -1 },
};

const regionOrg = (state, typeId) => Object.values(state.orgs?.byId ?? {}).find((o) => o.typeId === typeId && o.regionId === state.character.regionId && !o.closed);

/** The organization seat the player's office holds (existing data only — safe for views). */
export function officeSeat(state) {
  const officeId = state.politics?.office?.id;
  const def = officeId && OFFICE_SEATS[officeId];
  if (!def) return null;
  const org = regionOrg(state, def.typeId);
  if (!org) return null;
  const dept = def.deptId ? org.departments[def.deptId] : null;
  if (def.deptId && !dept) return null;
  return { officeId, org, deptId: def.deptId, dept, holder: dept ?? org, title: def.deptId ? orgType(org.typeId).departments.find((d) => d.id === def.deptId).head.title : orgType(org.typeId).head.title };
}

/** Make the organization match who holds office: you in your seat, NPCs everywhere else. */
export function syncOfficeSeat(ctx) {
  const { state } = ctx;
  const officeId = state.politics?.office?.id;
  const def = officeId && OFFICE_SEATS[officeId];
  if (def) ensureOrgOfType(state, def.typeId, state.character.regionId, { size: OFFICE_SIZE[state.character.regionId] ?? 'large' });
  const current = officeSeat(state);
  // Seats you no longer hold go back to NPCs.
  for (const org of Object.values(state.orgs?.byId ?? {})) {
    let changed = false;
    if (org.officeHead && !(current && current.org === org && !current.deptId)) { org.officeHead = false; changed = true; }
    for (const d of Object.values(org.departments)) if (d.officeHead && !(current && current.org === org && current.deptId === d.id)) { d.officeHead = false; changed = true; }
    if (changed) ensureHeads(state, org);
  }
  if (!current || current.holder.officeHead) return current;
  // Take the seat: your predecessor is out.
  const prev = personOf(current.org, current.holder.head);
  if (prev) {
    rememberDeparture(state, current.org, prev, 'left office');
    delete current.org.people[prev.id];
  }
  current.holder.head = null;
  current.holder.officeHead = true;
  current.holder.performance ??= 55;
  current.holder.morale ??= 60;
  staffOffice(state, current);
  ctx.log(`You took charge of ${current.deptId ? current.dept.name : current.org.name}${prev ? `, succeeding ${prev.name}` : ''}.`, OFFICES[officeId].icon, 'milestone');
  return current;
}

/** The career ladder an office's staff climb (first occupation of the department). */
function officeLadder(seatInfo) {
  const t = orgType(seatInfo.org.typeId);
  const occs = seatInfo.deptId ? t.departments.find((d) => d.id === seatInfo.deptId).occupations : [];
  return occs.map((id) => ({ id, profession: getProfession(id) })).filter((x) => x.profession);
}

/** Second-in-command level: the top rung of the office's main career (undersheriff, first assistant DA). */
function commandLevel(seatInfo) {
  const [main] = officeLadder(seatInfo);
  if (!main) return null;
  const ladder = ladderFor(main.profession, seatInfo.org.size);
  return { occ: main.id, level: [...ladder].reverse().find((l) => supervises(l) && !l.appointed) ?? ladder.at(-1) };
}

/** Named staff of an office: your deputy plus supervisors and line staff of each career. */
function staffOffice(state, seatInfo) {
  if (!seatInfo.deptId) return;
  const cmd = commandLevel(seatInfo);
  if (cmd) seatHolders(state, seatInfo.org, seatInfo.deptId, cmd.occ, cmd.level.id, 1);
  for (const { id, profession } of officeLadder(seatInfo)) {
    const ladder = ladderFor(profession, seatInfo.org.size).filter((l) => !l.appointed);
    const sup = ladder.filter((l) => supervises(l) && l.id !== cmd?.level.id);
    const line = ladder.filter((l) => !supervises(l));
    const picks = [[sup.at(-1), 1], [sup[0], 2], [line[Math.min(1, line.length - 1)], 3]];
    for (const [level, n] of picks) if (level) {
      const seats = seatsAt(seatInfo.org, seatInfo.deptId, profession, level, seatInfo.org.size);
      seatHolders(state, seatInfo.org, seatInfo.deptId, id, level.id, Math.min(n, seats));
    }
  }
}

/** Your office as people: { deputy, staff[], heads[] } (existing people only). */
export function officeRoster(state) {
  const s = officeSeat(state);
  if (!s) return null;
  if (!s.deptId) {
    const t = orgType(s.org.typeId);
    const heads = t.departments.map((d) => ({ dept: s.org.departments[d.id], def: d, person: personOf(s.org, s.org.departments[d.id]?.head) })).filter((x) => x.dept);
    return { seat: s, deputy: null, staff: [], heads };
  }
  const cmd = commandLevel(s);
  const ids = Object.entries(s.dept.seats).flatMap(([, byLevel]) => Object.values(byLevel).flat());
  const people = ids.map((id) => s.org.people[id]).filter(Boolean);
  const deputy = cmd ? people.find((p) => p.professionId === cmd.occ && p.levelId === cmd.level.id) ?? null : null;
  const staff = people.filter((p) => p !== deputy).sort((a, b) => (getProfession(b.professionId)?.levels.findIndex((l) => l.id === b.levelId) ?? 0) - (getProfession(a.professionId)?.levels.findIndex((l) => l.id === a.levelId) ?? 0));
  return { seat: s, deputy, deputyTitle: cmd?.level.title ?? 'Deputy', staff, heads: [] };
}

/** Yearly: staff come and go, the office performs, and voters notice. */
export function officeTick(ctx) {
  const { state } = ctx;
  const s = syncOfficeSeat(ctx);
  if (!s) return;
  const rng = sideRng(state);
  const h = s.holder;
  const roster = officeRoster(state);
  // Staff age and turn over (replacements are hired in your name).
  for (const p of roster.staff.concat(roster.deputy ? [roster.deputy] : [])) {
    p.age += 1;
    p.years += 1;
    p.performance = Math.round(clamp(p.performance + (p.rel - 50) / 30 + rng.float(-4, 4), 15, 98));
    const why = departure(rng, p);
    if (!why) continue;
    for (const byLevel of Object.values(s.dept?.seats ?? {})) for (const k of Object.keys(byLevel)) byLevel[k] = byLevel[k].filter((id) => id !== p.id);
    rememberDeparture(state, s.org, p, why);
    delete s.org.people[p.id];
    if (p === roster.deputy) ctx.log(`Your ${roster.deputyTitle.toLowerCase()}, ${p.name}, ${why}. Appoint a replacement.`, '🪑', 'warn');
  }
  staffOffice(state, s);
  // Performance: the people, their morale, and who you put in charge.
  const after = officeRoster(state);
  const people = s.deptId ? after.staff : after.heads.map((x) => x.person).filter(Boolean);
  const avg = people.length ? people.reduce((t, p) => t + p.performance, 0) / people.length : 60;
  const deputy = after.deputy?.performance ?? 60;
  h.morale = Math.round(clamp((h.morale ?? 60) + (60 - (h.morale ?? 60)) * 0.15 + rng.int(-4, 4), 0, 100));
  const target = 10 + avg * 0.45 + deputy * 0.2 + h.morale * 0.15;
  h.performance = Math.round(clamp((h.performance ?? 55) + (target - (h.performance ?? 55)) * 0.4 + rng.int(-5, 5), 0, 100));
  const o = state.politics.office;
  o.approval = Math.round(clamp(o.approval + (h.performance - 55) / 8, 0, 100));
  if (h.performance < 35 && rng.chance(0.25)) {
    o.approval = Math.max(0, o.approval - 6);
    ctx.log(`A scandal in ${s.deptId ? s.dept.name : s.org.name}: ${rng.pick(['a botched case made the evening news', 'an audit found missing funds', 'staff complaints leaked to the paper', 'a lawsuit over mismanagement was filed'])}. Your approval took a hit.`, '📰', 'bad');
  } else if (h.performance >= 75) ctx.log(`${s.deptId ? s.dept.name : s.org.name} had a strong year (performance ${h.performance}). Voters noticed.`, '📈', 'good');
}

function useAction(ctx) {
  if (yearlyCount(ctx.state, 'orgs.officeAct') >= OFFICE_ACTIONS) {
    ctx.toast(`You've used your ${OFFICE_ACTIONS} management actions this year.`, 'warn');
    return false;
  }
  bumpYearly(ctx.state, 'orgs.officeAct');
  return true;
}

function staffer(state, personId) {
  const r = officeRoster(state);
  const p = r && [...r.staff, ...(r.deputy ? [r.deputy] : [])].find((x) => x.id === personId);
  return p ? { r, p } : null;
}

function removeFromOffice(state, s, p, why) {
  for (const byLevel of Object.values(s.dept?.seats ?? {})) for (const k of Object.keys(byLevel)) byLevel[k] = byLevel[k].filter((id) => id !== p.id);
  rememberDeparture(state, s.org, p, why);
  delete s.org.people[p.id];
}

export const OfficeActions = {
  /** arg: 'professional' | 'loyalist' | 'reformer' — appoint your second-in-command. */
  officeAppoint(ctx, kind) {
    const { state } = ctx;
    const choice = DEPUTY_KINDS[kind];
    const s = officeSeat(state);
    if (!s?.deptId || !choice) return;
    if (!useAction(ctx)) return;
    const cmd = commandLevel(s);
    const r = officeRoster(state);
    if (r.deputy) removeFromOffice(state, s, r.deputy, 'was replaced');
    const rng = sideRng(state);
    const p = newPerson(rng, s.org, { performance: choice.performance, selection: 'appointed', appointedByPlayer: kind, years: 0, age: rng.int(38, 58) });
    seat(s.org, s.deptId, cmd.occ, cmd.level.id, p, cmd.level.title);
    s.holder.morale = Math.round(clamp((s.holder.morale ?? 60) + choice.morale, 0, 100));
    state.politics.office.approval = Math.round(clamp(state.politics.office.approval + choice.approval, 0, 100));
    ctx.log(`You appointed ${p.name} as ${cmd.level.title} — ${choice.label.replace(/^\S+\s+/, '').toLowerCase()}.${r.deputy ? ` ${r.deputy.name} is out.` : ''}`, '⭐', 'milestone');
  },
  officeCommend(ctx, personId) {
    const f = staffer(ctx.state, personId);
    if (!f || !useAction(ctx)) return;
    f.p.rel = Math.min(100, f.p.rel + 10);
    f.p.performance = Math.min(98, f.p.performance + 3);
    f.r.seat.holder.morale = Math.min(100, (f.r.seat.holder.morale ?? 60) + 2);
    ctx.log(`You commended ${f.p.name} at the staff meeting.`, '🏅', 'good');
  },
  officeDiscipline(ctx, personId) {
    const f = staffer(ctx.state, personId);
    if (!f || !useAction(ctx)) return;
    const fair = f.p.performance < 55;
    f.p.discipline = (f.p.discipline ?? 0) + 1;
    f.p.rel = Math.max(0, f.p.rel - 14);
    if (fair) f.p.performance = Math.min(98, f.p.performance + 6);
    f.r.seat.holder.morale = Math.max(0, (f.r.seat.holder.morale ?? 60) - (fair ? 1 : 5));
    ctx.log(`You disciplined ${f.p.name} (${f.p.discipline} on file). ${fair ? 'It was warranted.' : 'The rank and file think it was political.'}`, '📝', fair ? 'info' : 'warn');
  },
  officePromote(ctx, personId) {
    const { state } = ctx;
    const f = staffer(state, personId);
    if (!f || f.p === f.r.deputy) return;
    const profession = getProfession(f.p.professionId);
    const ladder = ladderFor(profession, f.r.seat.org.size).filter((l) => !l.appointed);
    const next = ladder[ladder.findIndex((l) => l.id === f.p.levelId) + 1];
    if (!next || next.id === commandLevel(f.r.seat)?.level.id) return ctx.toast('Appoint your second-in-command directly.', 'warn');
    const seats = seatsAt(f.r.seat.org, f.r.seat.deptId, profession, next, f.r.seat.org.size);
    const held = (f.r.seat.dept.seats[f.p.professionId]?.[next.id] ?? []).filter((id) => f.r.seat.org.people[id]).length;
    if (seats <= NAMED_SEATS && held >= seats) return ctx.toast(`No open ${next.title} post.`, 'warn');
    if (!useAction(ctx)) return;
    seat(f.r.seat.org, f.r.seat.deptId, f.p.professionId, next.id, f.p, next.title);
    f.p.rel = Math.min(100, f.p.rel + 12);
    ctx.log(`You promoted ${f.p.name} to ${next.title}.`, '⬆️', 'good');
  },
  officeFire(ctx, personId) {
    const { state, rng } = ctx;
    const f = staffer(state, personId);
    if (!f || !useAction(ctx)) return;
    const justified = f.p.performance < 45 || (f.p.discipline ?? 0) >= 2;
    const deputy = f.p === f.r.deputy; // your appointee serves at your pleasure
    if (!justified && !deputy && rng.chance(0.6)) {
      f.r.seat.holder.morale = Math.max(0, (f.r.seat.holder.morale ?? 60) - 6);
      state.politics.office.approval = Math.max(0, state.politics.office.approval - 2);
      ctx.log(`You fired ${f.p.name}, but the union grievance succeeded: they were reinstated with back pay. The rank and file noticed.`, '✊', 'bad');
      return;
    }
    removeFromOffice(state, f.r.seat, f.p, 'was fired');
    f.r.seat.holder.morale = Math.max(0, (f.r.seat.holder.morale ?? 60) - (justified ? 1 : 5));
    ctx.log(`You fired ${f.p.name}${deputy ? `, your ${f.r.deputyTitle.toLowerCase()}` : ''}.${justified ? '' : ' It was not a popular call.'}`, '🚪', justified ? 'info' : 'warn');
  },
};

export { REGIONS };
