/**
 * Organisational charts: who sits where, from the top of the organisation down to you.
 *
 *   Civilian   The organisation's head → its departments (head and headcount) → in your
 *              department, your occupation's ranks from the top down, each with its named
 *              holders and how many seats it has; you are marked on your rung.
 *   Military   The battalion (commander and senior NCO) → its companies → in yours, the
 *              platoon → its squads and their soldiers.
 *
 * Read-only: charts never generate people (names appear once the game has met them).
 *
 * Node = { title, name?, meta?, you?, kind?, children?: Node[] }
 */
import { orgOf, chainOfCommand } from './Organizations.js';
import { getProfession } from '../career/JobTrees.js';
import { ladderFor } from '../career/Ladder.js';
import { seatsAt } from './Vacancies.js';
import { PLAYER, billetTitle } from './MilitaryUnits.js';

const named = (org, id) => (id && org.people?.[id]) || null;
const personNode = (p, title) => ({ title: title ?? p.title, name: p.name, meta: p.years != null ? `${p.years} yr` : null });

/** The chart of a civilian workplace. */
export function workplaceChart(state, job) {
  const org = orgOf(state, job?.employer);
  if (!org) return null;
  const myDept = org.departments[job.employer.deptId];
  const c = chainOfCommand(state, job, { generate: false });
  const head = named(org, org.head) ?? named(org, org.ceo);
  const profession = getProfession(job.professionId);
  const ladder = ladderFor(profession, job.employer.size);
  const depts = Object.values(org.departments).map((d) => {
    const dh = named(org, d.head);
    const node = { title: d.name, name: dh?.name ?? null, meta: `${dh?.title ? `${dh.title} · ` : ''}${(d.headcount ?? 0).toLocaleString()} staff`, kind: 'unit' };
    if (d !== myDept) return node;
    // Your department: your occupation's ranks, top down, with who holds them.
    const ranks = [...ladder].reverse().map((l) => {
      const holders = (d.seats?.[job.professionId]?.[l.id] ?? []).map((id) => org.people[id]).filter(Boolean);
      const seats = org.business ? null : seatsAt(org, d.id, profession, l, job.employer.size);
      const you = l.id === job.levelId;
      const names = holders.slice(0, 3).map((p) => p.name);
      return {
        title: l.title, you,
        name: you ? ['You', ...names.slice(0, 2)].join(', ') : names.join(', ') || null,
        meta: [seats && seats < 1e6 ? `${seats.toLocaleString()} post${seats === 1 ? '' : 's'}` : null, l.track === 'mgmt' ? 'management' : l.track === 'ic' ? 'specialist' : null].filter(Boolean).join(' · ') || null,
        kind: 'rank',
      };
    });
    const unitName = job.employer.division || (job.employer.name !== d.name && job.employer.name !== org.name ? job.employer.name : c?.division);
    const division = unitName && unitName !== d.name ? [{ title: unitName, kind: 'unit', open: true, children: ranks }] : ranks;
    return { ...node, open: true, children: division };
  });
  return { title: head?.title ?? (org.owner ? 'Owner' : 'Leadership'), name: head?.name ?? org.owner?.name ?? null, meta: org.name, kind: 'top', open: true, children: depts };
}

/** The chart of a military unit (battalion → companies → your platoon → squads). */
export function unitChart(state, svc) {
  const org = svc?.unit && state.orgs?.byId?.[svc.unit.orgId];
  if (!org) return null;
  const u = svc.unit;
  const unitSvc = { ...svc, specialty: org.specialty };
  const who = (id, billet) => {
    if (id === PLAYER) return { title: billetTitle(unitSvc, billet), name: 'You', you: true };
    const p = named(org, id);
    return p ? { title: billetTitle(unitSvc, billet), name: `${p.rank ?? ''} ${p.name}`.trim() } : { title: billetTitle(unitSvc, billet), name: 'Vacant' };
  };
  const you = (billet) => (u.billet === billet ? { name: 'You', you: true } : {});
  const companies = Object.values(org.departments).map((d) => {
    const mine = d.id === u.company;
    const co = { ...who(d.head, 'companyCommander'), ...(mine ? you('companyCommander') : {}) };
    const node = { title: d.name, name: co.name, meta: `${co.title}${d.firstSergeant ? ` · ${billetTitle(unitSvc, 'firstSergeant')}: ${named(org, d.firstSergeant)?.name ?? (d.firstSergeant === PLAYER ? 'You' : '—')}` : ''}`, kind: 'unit', you: co.you };
    if (!mine || !d.platoon) return node;
    const pl = d.platoon;
    const squads = pl.squads.map((s, i) => ({
      title: `${i + 1}${['st', 'nd', 'rd'][i] ?? 'th'} squad`,
      name: s.leader === PLAYER ? 'You' : named(org, s.leader) ? `${named(org, s.leader).rank ?? ''} ${named(org, s.leader).name}`.trim() : 'Vacant',
      meta: billetTitle(unitSvc, 'squadLeader'), you: s.leader === PLAYER, kind: 'unit',
      children: s.members.map((id) => (id === PLAYER ? { title: billetTitle(unitSvc, u.billet === 'teamLeader' ? 'teamLeader' : 'member'), name: 'You', you: true } : named(org, id) ? personNode({ ...named(org, id), name: `${named(org, id).rank ?? ''} ${named(org, id).name}`.trim() }, named(org, id).title?.split(' — ')[1] ?? 'Soldier') : null)).filter(Boolean),
    }));
    const platoon = { title: 'Platoon', ...who(pl.leader, 'platoonLeader'), meta: `${billetTitle(unitSvc, 'platoonLeader')} · ${billetTitle(unitSvc, 'platoonSergeant')}: ${pl.sergeant === PLAYER ? 'You' : named(org, pl.sergeant)?.name ?? '—'}`, kind: 'unit', open: true, children: squads };
    platoon.title = 'Platoon';
    return { ...node, open: true, children: [platoon] };
  });
  const top = who(org.head, 'battalionCommander');
  return { title: org.name, name: top.name, meta: `${top.title} · ${billetTitle(unitSvc, 'csm')}: ${org.csm === PLAYER ? 'You' : named(org, org.csm)?.name ?? '—'}`, kind: 'top', you: top.you, open: true, children: companies };
}
