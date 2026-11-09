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
 * Node = { title, name?, meta?, you?, kind?, children?: Node[], levelId? (civilian rank), track?/grade? (military rank) }
 */
import { orgOf, chainOfCommand, orgType, supervises } from './Organizations.js';
import { getProfession } from '../career/JobTrees.js';
import { ladderFor } from '../career/Ladder.js';
import { seatsAt, layerExists } from './Vacancies.js';
import { PLAYER, billetTitle } from './MilitaryUnits.js';
import { regimeOf } from '../world/Regimes.js';
import { OFFICES } from '../politics/Offices.js';
import { LEGISLATURES, MONARCHIES, NATIONAL_OFFICES } from '../politics/NationalOffices.js';
import { crownOf, ensureCrown, monarchName, monarchTitles } from '../world/Crown.js';
import { currentYear } from '../../core/State.js';
import { executiveOf } from '../politics/Legislature.js';
import { DEPTS } from '../politics/Ministers.js';

const named = (org, id) => (id && org.people?.[id]) || null;
/** A service member's rank, for the chart's insignia. */
const rk = (p) => (p?.track && Number.isFinite(p.grade) ? { track: p.track, grade: p.grade } : {});
const personNode = (p, title) => ({ title: title ?? p.title, name: p.name, meta: p.years != null ? `${p.years} yr` : null });

/**
 * The chart of a civilian workplace, as a reporting tree. Who the organisation answers to sits on
 * top; then its head; its departments (the others folded, with their heads and headcounts); and in
 * yours, your occupation's ranks nested as people actually report: each rank under the nearest
 * supervising rank above it (specialists under the manager above their grade), layers the
 * department is too small to have left out. The path from the top to you is open, and so is your
 * own team below you.
 */
export function workplaceChart(state, job) {
  const org = orgOf(state, job?.employer);
  if (!org) return null;
  const myDept = org.departments[job.employer.deptId];
  const c = chainOfCommand(state, job, { generate: false });
  const head = named(org, org.head) ?? named(org, org.ceo);
  const profession = getProfession(job.professionId);
  const size = job.employer.size;
  const ladder = ladderFor(profession, size);
  const title = (l) => job.titleMap?.[l.id] ?? l.title;
  // Ranks the department really has: a layer of management it's too small for doesn't exist.
  const present = myDept ? ladder.filter((l) => l.id === job.levelId || layerExists(org, myDept.id, profession, l, size) || (myDept.seats?.[job.professionId]?.[l.id] ?? []).length) : ladder;
  const order = (l) => present.indexOf(l);
  // Each rank's boss: the lowest supervising rank above it in grade (or above it on the ladder).
  const bossOf = (l) => present.filter((b) => b !== l && supervises(b) && (b.grade > l.grade || (b.grade === l.grade && order(b) > order(l)))).sort((a, b) => a.grade - b.grade || order(a) - order(b))[0] ?? null;
  const rankNode = (l) => {
    const holders = (myDept?.seats?.[job.professionId]?.[l.id] ?? []).map((id) => org.people[id]).filter(Boolean);
    const seats = org.business || !myDept ? null : seatsAt(org, myDept.id, profession, l, size);
    const you = l.id === job.levelId;
    const names = holders.slice(0, 3).map((p) => p.name);
    return {
      title: title(l), you, levelId: l.id, kind: 'rank',
      name: you ? ['You', ...names.slice(0, 2)].join(', ') : names.join(', ') || (seats === 0 ? 'Vacant' : null),
      meta: [seats && seats < 1e6 ? `${seats.toLocaleString()} post${seats === 1 ? '' : 's'}` : null, l.track === 'mgmt' ? 'management' : l.track === 'ic' ? 'specialist' : null].filter(Boolean).join(' · ') || null,
    };
  };
  // Build the rank tree.
  const nodes = new Map(present.map((l) => [l, rankNode(l)]));
  const tops = [];
  for (const l of [...present].sort((a, b) => b.grade - a.grade || order(b) - order(a))) {
    const boss = bossOf(l);
    const n = nodes.get(l);
    if (boss && nodes.has(boss)) (nodes.get(boss).children ??= []).push(n);
    else tops.push(n);
  }
  // Open the path to you, and your own team below you.
  const mine = present.find((l) => l.id === job.levelId);
  for (let l = mine; l; l = bossOf(l)) nodes.get(l).open = true;
  if (mine && nodes.get(mine).children) nodes.get(mine).open = true;
  const depts = Object.values(org.departments).map((d) => {
    const dh = named(org, d.head);
    const node = { title: d.name, name: dh?.name ?? null, meta: `${dh?.title ? `${dh.title} · ` : ''}${(d.headcount ?? 0).toLocaleString()} staff`, kind: 'unit' };
    if (d !== myDept) return node;
    const unitName = job.employer.division || (job.employer.name !== d.name && job.employer.name !== org.name ? job.employer.name : c?.division);
    const ranks = unitName && unitName !== d.name ? [{ title: unitName, kind: 'unit', open: true, children: tops }] : tops;
    return { ...node, open: true, children: ranks };
  });
  // Your department first, the rest after it.
  depts.sort((a, b) => Number(Boolean(b.open)) - Number(Boolean(a.open)));
  const t = orgType(org.typeId);
  const top = { title: head?.title ?? (org.owner ? 'Owner' : 'Leadership'), name: head?.name ?? org.owner?.name ?? null, meta: org.name, kind: 'top', open: true, children: depts };
  // Who the organisation answers to: the government, a council, a board, the voters.
  const above = org.authority ?? t?.head?.appointedBy ?? (org.owner ? null : t?.head?.selection === 'elected' ? 'the voters' : t?.head?.selection === 'board' || org.business ? 'the board' : null);
  return above ? { title: 'Answers to', name: above[0].toUpperCase() + above.slice(1), kind: 'top', open: true, children: [top] } : top;
}

/** The chart of a military unit (battalion → companies → your platoon → squads). */
export function unitChart(state, svc) {
  const org = svc?.unit && state.orgs?.byId?.[svc.unit.orgId];
  if (!org) return null;
  const u = svc.unit;
  const unitSvc = { ...svc, specialty: org.specialty };
  const who = (id, billet) => {
    if (id === PLAYER) return { title: billetTitle(unitSvc, billet), name: 'You', you: true, ...rk(svc) };
    const p = named(org, id);
    return p ? { title: billetTitle(unitSvc, billet), name: `${p.rank ?? ''} ${p.name}`.trim(), ...rk(p) } : { title: billetTitle(unitSvc, billet), name: 'Vacant' };
  };
  const you = (billet) => (u.billet === billet ? { name: 'You', you: true, ...rk(svc) } : {});
  const companies = Object.values(org.departments).map((d) => {
    const mine = d.id === u.company;
    const co = { ...who(d.head, 'companyCommander'), ...(mine ? you('companyCommander') : {}) };
    const node = { title: d.name, name: co.name, track: co.track, grade: co.grade, meta: `${co.title}${d.firstSergeant ? ` · ${billetTitle(unitSvc, 'firstSergeant')}: ${named(org, d.firstSergeant)?.name ?? (d.firstSergeant === PLAYER ? 'You' : '—')}` : ''}`, kind: 'unit', you: co.you };
    if (!mine || !d.platoon) return node;
    const pl = d.platoon;
    const squads = pl.squads.map((s, i) => ({
      title: `${i + 1}${['st', 'nd', 'rd'][i] ?? 'th'} squad`,
      name: s.leader === PLAYER ? 'You' : named(org, s.leader) ? `${named(org, s.leader).rank ?? ''} ${named(org, s.leader).name}`.trim() : 'Vacant',
      meta: billetTitle(unitSvc, 'squadLeader'), you: s.leader === PLAYER, kind: 'unit', ...rk(s.leader === PLAYER ? svc : named(org, s.leader)),
      children: s.members.map((id) => (id === PLAYER ? { title: billetTitle(unitSvc, u.billet === 'teamLeader' ? 'teamLeader' : 'member'), name: 'You', you: true, ...rk(svc) } : named(org, id) ? { ...personNode({ ...named(org, id), name: `${named(org, id).rank ?? ''} ${named(org, id).name}`.trim() }, named(org, id).title?.split(' — ')[1] ?? 'Soldier'), ...rk(named(org, id)) } : null)).filter(Boolean),
    }));
    const platoon = { title: 'Platoon', ...who(pl.leader, 'platoonLeader'), meta: `${billetTitle(unitSvc, 'platoonLeader')} · ${billetTitle(unitSvc, 'platoonSergeant')}: ${pl.sergeant === PLAYER ? 'You' : named(org, pl.sergeant)?.name ?? '—'}`, kind: 'unit', open: true, children: squads };
    platoon.title = 'Platoon';
    return { ...node, open: true, children: [platoon] };
  });
  const top = who(org.head, 'battalionCommander');
  const battalion = { title: org.name, name: top.name, track: top.track, grade: top.grade, meta: `${top.title} · ${billetTitle(unitSvc, 'csm')}: ${org.csm === PLAYER ? 'You' : named(org, org.csm)?.name ?? '—'}`, kind: 'top', you: top.you, open: true, children: companies };
  return higherCommand(state, svc, battalion);
}

/**
 * The chain of command above a battalion: the brigade and division (or the fleet and the air
 * wing), the service chief, the defence minister and the commander-in-chief.
 */
const FORMATIONS = {
  army: [['Brigade', 'Brigade Commander'], ['Division', 'Division Commander']],
  marines: [['Regiment', 'Regimental Commander'], ['Marine Division', 'Division Commander']],
  navy: [['Squadron / Group', 'Commodore'], ['Fleet', 'Fleet Commander']],
  coastguard: [['Sector', 'Sector Commander'], ['District', 'District Commander']],
  airforce: [['Wing', 'Wing Commander'], ['Air Command', 'Air Officer Commanding']],
  guard: [['Brigade', 'Brigade Commander'], ['State / Regional Command', 'Adjutant General']],
};
const CHIEF = { army: 'Chief of the General Staff', navy: 'Chief of Naval Staff', airforce: 'Chief of the Air Staff', marines: 'Commandant', coastguard: 'Commandant', guard: 'Chief of the Reserve' };
function higherCommand(state, svc, battalion) {
  const branch = svc.branch ?? 'army';
  const us = (svc.nation ?? state.character.countryId ?? 'US') === 'US';
  const [lower, upper] = FORMATIONS[branch] ?? FORMATIONS.army;
  const regime = regimeOf(svc.nation ?? state.character.countryId ?? 'US');
  const cinc = us ? 'The President' : regime.kind === 'monarchy' || regime.kind === 'absoluteMonarchy' ? 'The Sovereign' : regime.leader ? regime.leader[0].toUpperCase() + regime.leader.slice(1) : 'The Head of State';
  const usChief = { army: 'Chief of Staff of the Army', navy: 'Chief of Naval Operations', airforce: 'Chief of Staff of the Air Force', marines: 'Commandant of the Marine Corps', coastguard: 'Commandant of the Coast Guard', guard: 'Chief of the National Guard Bureau' };
  const node = (title, name, children) => ({ title, name, kind: 'unit', open: true, children });
  return node('Commander-in-Chief', cinc, [
    node(us ? 'Secretary of Defense' : 'Minister of Defence', null, [
      node(us ? usChief[branch] ?? 'Chief of Staff' : CHIEF[branch] ?? 'Chief of the Defence Staff', null, [
        node(upper[0], upper[1], [node(lower[0], lower[1], [battalion])]),
      ]),
    ]),
  ]);
}

/**
 * How the country is governed, as a chart: head of state, head of government and the cabinet,
 * the legislature's chambers; or, where there are no elections, the junta, the party or the
 * colonial government. You are marked where you sit.
 */
export function governmentChart(state) {
  const cc = state.character.countryId ?? 'US';
  const r = regimeOf(cc);
  const office = state.politics?.office;
  const def = office ? OFFICES[office.id] : null;
  const ministry = state.politics?.ministry;
  const mark = (n, on) => (on ? { ...n, you: true, name: n.name ? `You · ${n.name}` : 'You' } : n);
  const node = (title, name, meta, children = null, open = true) => ({ title, name, meta, kind: 'unit', open, children });
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  // A colony: the Colonial Office, the Governor and his councils.
  if (r.kind === 'colony') {
    return node('Ruled from abroad', r.name, null, [node(cap(r.leader ?? 'the Governor'), null, 'Appointed by the ruling power', [
      node('Executive Council', null, 'Officials and a few appointed notables'),
      node('Legislative Council', null, 'Appointed, with a handful of elected members late on'),
      node('Colonial service', null, 'District officers, police, the courts'),
    ])]);
  }
  // A junta, a party-state, an absolute ruler: power at the top, no chamber that can say no.
  if (r.elections === 'none' || r.party || ['junta', 'absoluteMonarchy', 'dictatorship', 'totalitarian', 'theocracy'].includes(r.kind)) {
    const ruler = cap(r.leader ?? 'the ruler');
    const red = /communis|soviet|socialist|people's/i.test(`${r.kind} ${r.name ?? ''} ${r.party ?? ''}`);
    const kids = r.party && red ? [node('Politburo', null, 'The party\'s leadership: where decisions are made'), node('Council of Ministers', null, 'Ministers appointed by the party'), node('Assembly', null, 'Deputies nominated by the party; it approves, it doesn\'t decide'), node('Courts and security organs', null, 'Answer to the party')]
      : r.party || r.kind === 'totalitarian' ? [node('The ruling party', null, 'Its leadership and its organisations reach into everything'), node('Cabinet', null, 'Ministers who carry out the leader\'s orders'), node('Rubber-stamp parliament', null, 'It sits to applaud'), node('Secret police', null, 'Answers to the leader, not the courts')]
      : r.kind === 'junta' ? [node('Military council', null, 'The generals who took power'), node('Appointed government', null, 'Ministers named by the council')]
        : [node('Court and ministers', null, 'Appointed by the ruler'), node('Advisory council', null, 'It advises; it doesn\'t decide')];
    return node(r.name ? cap(r.name) : 'The state', ruler, null, kids);
  }
  // A parliamentary or presidential state.
  const leg = LEGISLATURES[cc];
  const monarchy = MONARCHIES.includes(cc);
  const hos = Object.entries({ ...OFFICES, ...NATIONAL_OFFICES }).find(([, o]) => o.country === cc && o.headOfState && o.selection !== 'appointed' && !o.provincial)?.[0] ?? null;
  const crown = crownOf(state, cc);
  const crownTitle = crown ? monarchTitles(crown, currentYear(state))[ensureCrown(state, crown)?.monarch.gender === 'female' ? 1 : 0] : null;
  const hosTitle = cc === 'US' ? 'President of the United States' : monarchy ? (crownTitle ? `The ${crownTitle}` : 'The Crown') : hos ? (OFFICES[hos] ?? NATIONAL_OFFICES[hos]).name : 'Head of State';
  const hosName = monarchy ? (crown ? monarchName(state, crown) : cap(r.leader ?? 'the Sovereign')) : null;
  const execTitle = cc === 'US' ? null : leg?.exec ?? 'Prime Minister';
  const execOffice = cc === 'US' ? 'president' : leg?.execOffice;
  const exec = executiveOf(state, 'national');
  const cabinet = node('Cabinet', null, null, Object.entries(DEPTS).map(([id, d]) => mark(node(cc === 'US' ? ({ foreign: 'Secretary of State', finance: 'Secretary of the Treasury', defence: 'Secretary of Defense', interior: 'Secretary of Homeland Security', justice: 'Attorney General', health: 'Secretary of Health and Human Services', education: 'Secretary of Education', transport: 'Secretary of Transportation', environment: 'Secretary of the Interior' }[id]) : d[cc] ?? d.title, null, null), ministry?.dept === id && ministry?.rank === 'cabinet')), false);
  const chambers = cc === 'US'
    ? [mark(node('House of Representatives', null, '435 members'), office?.id === 'usRep'), mark(node('Senate', null, '100 senators'), office?.id === 'usSenator')]
    : [leg?.lower ? mark(node(leg.lower.name, null, `${leg.lower.seats} seats`), def?.kind === 'legislative' && office?.id === leg.lower.office) : null, leg?.upper ? mark(node(leg.upper.name, null, `${leg.upper.seats} seats${leg.upper.office ? '' : ' · not directly elected'}`), def?.kind === 'legislative' && office?.id === leg.upper.office) : null].filter(Boolean);
  const government = execTitle ? mark(node(execTitle, exec && !exec.you ? exec.name : null, 'Head of government', [cabinet]), office?.id === execOffice) : null;
  const legislature = node(({ US: 'Congress', JP: 'National Diet', MX: 'Congress of the Union', PH: 'Congress', KR: 'National Assembly' })[cc] ?? 'Parliament', null, null, chambers);
  const courts = node(cc === 'US' ? 'Supreme Court' : 'The courts', null, cc === 'US' ? 'Nine justices, nominated by the President and confirmed by the Senate' : 'Independent of the government');
  const vp = cc === 'US' ? mark(node('Vice President', null, 'Presides over the Senate'), office?.id === 'vicePresident') : null;
  const kids = cc === 'US' ? [vp, cabinet, legislature, courts] : [government, legislature, courts].filter(Boolean);
  const head = mark(node(hosTitle, monarchy ? hosName : cc === 'US' && exec && !exec.you ? exec.name : null, monarchy ? 'Head of state' : cc === 'US' ? 'Head of state and of government' : 'Head of state', kids), office?.id === hos || (cc === 'US' && office?.id === 'president'));
  return head;
}
