/**
 * Military units as organizations.
 *
 * Your unit is an organization in state.orgs (org.military = true): a
 * battalion (ship, squadron) whose departments are companies (departments,
 * flights), each with a commander and a senior enlisted leader, and your own
 * platoon (division, flight section) down to named squad leaders and the
 * people in your squad. The rest are headcounts.
 *
 * Your billet comes from your rank: a junior enlisted member, team leader,
 * squad leader, platoon sergeant; a platoon leader, company XO, battalion
 * staff officer. Command posts — company command, first sergeant, battalion
 * command, command sergeant major — are filled by selection boards: you're
 * offered the post, serve a command tour, then move to staff. Commanding
 * well is what gets officers and senior NCOs promoted.
 *
 * As a leader you act on your soldiers: counsel them, recommend (or, as a
 * commander, approve) awards, impose non-judicial punishment (Article 15) —
 * or, below command level, recommend it to your commander. Their
 * performance becomes your unit's readiness, which feeds your evaluation.
 *
 * svc.unit = { orgId, company, billet, commandUntil, commanded: { [billet]: true } }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, randomName } from '../../core/State.js';
import { sideRng, initOrgs } from './Organizations.js';
import { localBillet, localUnitName, localUnitWord, summaryPunishment } from '../world/MilitaryLocal.js';

export const PLAYER = 'PLAYER';
/** Leadership actions per year. */
export const LEADER_ACTIONS = 4;

const FAMILY = { army: 'ground', guard: 'ground', marines: 'ground', navy: 'naval', coastguard: 'naval', airforce: 'air', spaceforce: 'air', usphs: 'corps', noaa: 'corps' };

/** Billet titles by service family. */
export const BILLETS = {
  ground: { member: 'Fire Team Member', teamLeader: 'Team Leader', squadLeader: 'Squad Leader', platoonSergeant: 'Platoon Sergeant', opsNco: 'Operations NCO', firstSergeant: 'First Sergeant', seniorStaffNco: 'Senior Staff NCO', csm: 'Command Sergeant Major', platoonLeader: 'Platoon Leader', xo: 'Company Executive Officer', companyCommander: 'Company Commander', staff: 'Battalion Staff Officer (S-3)', warrant: 'Warrant Officer (technical expert)', battalionCommander: 'Battalion Commander', higher: 'Brigade / Division Staff', units: { squad: 'Squad', platoon: 'Platoon', company: 'Company', battalion: 'Battalion' } },
  naval: { member: 'Sailor', teamLeader: 'Work Center Supervisor', squadLeader: 'Leading Petty Officer', platoonSergeant: 'Leading Chief Petty Officer', opsNco: 'Department Chief', firstSergeant: 'Senior Enlisted Leader', seniorStaffNco: 'Fleet Staff Master Chief', csm: 'Command Master Chief', platoonLeader: 'Division Officer', xo: 'Assistant Department Head', companyCommander: 'Department Head', staff: 'Executive Officer', warrant: 'Chief Warrant Officer (division technical expert)', battalionCommander: 'Commanding Officer', higher: 'Fleet / Group Staff', units: { squad: 'Work Center', platoon: 'Division', company: 'Department', battalion: 'Command' } },
  air: { member: 'Airman', teamLeader: 'Team Lead', squadLeader: 'Section Chief', platoonSergeant: 'Flight Chief', opsNco: 'Superintendent', firstSergeant: 'First Sergeant', seniorStaffNco: 'Wing Staff Chief', csm: 'Command Chief Master Sergeant', platoonLeader: 'Flight Commander', xo: 'Assistant Director of Operations', companyCommander: 'Squadron Commander', staff: 'Group Staff Officer', warrant: 'Warrant Officer (technical expert)', battalionCommander: 'Group Commander', higher: 'Wing / Numbered Air Force Staff', units: { squad: 'Section', platoon: 'Flight', company: 'Squadron', battalion: 'Group' } },
  corps: { member: 'Officer', teamLeader: 'Officer', squadLeader: 'Officer', platoonSergeant: 'Officer', opsNco: 'Officer', firstSergeant: 'Officer', seniorStaffNco: 'Officer', csm: 'Officer', platoonLeader: 'Program Officer', xo: 'Deputy Director', companyCommander: 'Office Director', staff: 'Regional Staff', battalionCommander: 'Commanding Officer', higher: 'Headquarters Staff', units: { squad: 'Team', platoon: 'Branch', company: 'Office', battalion: 'Center' } },
};

/**
 * What each billet is called in a specialty: a JAG lieutenant is a trial counsel, not a platoon
 * leader; an Army doctor is a staff physician; an intelligence captain is the battalion S-2.
 * (Engineers and aviators only differ in the Army's and Marines' ground units.)
 */
export const SPECIALTY_BILLETS = {
  medical: { member: 'Hospital Technician', teamLeader: 'Senior Technician', squadLeader: 'Ward NCOIC', platoonSergeant: 'Department NCOIC', opsNco: 'Clinical Operations NCO', firstSergeant: 'Hospital First Sergeant', seniorStaffNco: 'Chief Medical NCO', csm: 'Hospital Senior Enlisted Leader', platoonLeader: 'Staff Physician / Clinical Nurse', xo: 'Assistant Department Chief', companyCommander: 'Department Chief', staff: 'Chief of a Hospital Service', battalionCommander: 'Hospital Commander', higher: 'Deputy Commander for Clinical Services' },
  legal: { member: 'Paralegal Specialist', teamLeader: 'Senior Paralegal', squadLeader: 'Paralegal NCOIC', platoonSergeant: 'Chief Paralegal NCO', opsNco: 'Senior Paralegal NCO', firstSergeant: 'Legal Office Senior NCO', seniorStaffNco: 'Command Paralegal NCO', csm: 'Command Paralegal NCO', platoonLeader: 'Trial Counsel', xo: 'Defense Counsel', companyCommander: 'Chief of Military Justice', staff: 'Deputy Staff Judge Advocate', battalionCommander: 'Staff Judge Advocate', higher: 'Senior Legal Adviser, division staff' },
  chaplain: { member: 'Religious Affairs Specialist', teamLeader: 'Religious Affairs NCO', squadLeader: 'Senior Religious Affairs NCO', platoonSergeant: 'Senior Religious Affairs NCO', opsNco: 'Religious Support NCO', seniorStaffNco: 'Command Religious Affairs NCO', platoonLeader: 'Battalion Chaplain', xo: 'Battalion Chaplain', companyCommander: 'Brigade Chaplain', staff: 'Brigade Chaplain', battalionCommander: 'Brigade Chaplain', higher: 'Division Chaplain' },
  intel: { member: 'Intelligence Analyst', teamLeader: 'Senior Analyst', squadLeader: 'Analysis Section Sergeant', platoonSergeant: 'Intelligence NCOIC', opsNco: 'Intelligence Operations NCO', seniorStaffNco: 'Senior Intelligence Sergeant', platoonLeader: 'Assistant Intelligence Officer', xo: 'Battalion Intelligence Officer (S-2)', companyCommander: 'Military Intelligence Company Commander', staff: 'Brigade Intelligence Officer (S-2)', battalionCommander: 'Military Intelligence Battalion Commander', higher: 'Division Intelligence Staff (G-2)' },
  cyber: { member: 'Cyber Operator', teamLeader: 'Senior Operator', squadLeader: 'Team Sergeant', platoonSergeant: 'Mission Element NCOIC', opsNco: 'Cyber Operations NCO', seniorStaffNco: 'Senior Cyber NCO', platoonLeader: 'Cyber Operations Officer', xo: 'Mission Element Lead', companyCommander: 'Cyber Protection Team Lead', staff: 'Cyber Mission Force Planner', battalionCommander: 'Cyber Battalion Commander', higher: 'Cyber Command Staff' },
  logistics: { member: 'Supply Specialist', teamLeader: 'Supply Team Leader', squadLeader: 'Supply Sergeant', platoonSergeant: 'Distribution Platoon Sergeant', opsNco: 'Support Operations NCO', platoonLeader: 'Distribution Platoon Leader', xo: 'Support Company Executive Officer', companyCommander: 'Support Company Commander', staff: 'Support Operations Officer', battalionCommander: 'Support Battalion Commander', higher: 'Brigade Logistics Officer (S-4)' },
  engineer: { ground: true, member: 'Combat Engineer', teamLeader: 'Sapper Team Leader', squadLeader: 'Engineer Squad Leader', platoonSergeant: 'Engineer Platoon Sergeant', platoonLeader: 'Engineer Platoon Leader', xo: 'Engineer Company Executive Officer', companyCommander: 'Engineer Company Commander', staff: 'Battalion Engineer Operations Officer', battalionCommander: 'Engineer Battalion Commander' },
  aviation: { ground: true, member: 'Aircraft Crew Chief', teamLeader: 'Flight Line Team Leader', squadLeader: 'Maintenance Section Sergeant', platoonSergeant: 'Flight Platoon Sergeant', platoonLeader: 'Pilot / Section Leader', xo: 'Flight Platoon Leader', companyCommander: 'Aviation Company Commander', staff: 'Aviation Battalion Operations Officer', battalionCommander: 'Aviation Battalion Commander' },
};
const specialtyTitle = (specialty, family, billet) => {
  const t = SPECIALTY_BILLETS[specialty];
  if (!t || (t.ground && family !== 'ground')) return null;
  return t[billet] ?? null;
};
/** The professional corps serve in their own units: a hospital, a legal office. */
const CORPS_UNITS = {
  medical: { word: 'Department', companies: ['Emergency Medicine', 'Surgery', 'Internal Medicine', 'Nursing'], name: (family, rng, nation) => (nation ? `${rng.pick(['Joint', 'Central', 'Garrison'])} Military Hospital` : family === 'naval' ? `Naval Medical Center ${rng.pick(['San Diego', 'Portsmouth', 'Camp Lejeune', 'Okinawa'])}` : family === 'air' ? `${rng.pick(['59th', '88th', '96th', '60th'])} Medical Group` : `${rng.pick(['Brooke', 'Madigan', 'Womack', 'Darnall', 'Tripler'])} Army Medical Center`) },
  legal: { word: 'Section', companies: ['Military Justice', 'Administrative Law', 'Legal Assistance', 'Trial Defense'], name: (family, rng, nation) => (nation ? 'Defence Legal Services Office' : family === 'naval' ? `Region Legal Service Office ${rng.pick(['Southwest', 'Mid-Atlantic', 'Japan', 'Hawaii'])}` : family === 'air' ? `${rng.pick(['4th', '20th', '388th', '97th'])} Wing Legal Office` : `Office of the Staff Judge Advocate, ${rng.pick(['1st Cavalry', '82nd Airborne', '101st Airborne', '3rd Infantry', '10th Mountain'])} Division`) },
};

/** Command posts: filled by boards for a tour of duty. */
export const COMMAND_POSTS = {
  companyCommander: { track: 'officer', grade: 2, tour: 2, label: 'company command' },
  battalionCommander: { track: 'officer', grade: 4, tour: 2, label: 'battalion command' },
  firstSergeant: { track: 'enlisted', grade: 7, tour: 3, label: 'first sergeant' },
  csm: { track: 'enlisted', grade: 8, tour: 3, label: 'command sergeant major' },
};
const LEADS = new Set(['teamLeader', 'squadLeader', 'platoonSergeant', 'platoonLeader', 'xo', 'firstSergeant', 'companyCommander', 'csm', 'battalionCommander']);
const COMMANDERS = new Set(['companyCommander', 'battalionCommander']);
/** Senior NCOs run the enlisted force: their word on discipline and promotions carries with the commander. */
const SENIOR_NCOS = new Set(['firstSergeant', 'csm']);
const NCO_LEADERS = new Set(['teamLeader', 'squadLeader', 'platoonSergeant', 'firstSergeant', 'csm']);
export const isNcoLeader = (billet) => NCO_LEADERS.has(billet);

export const familyOf = (svc) => FAMILY[svc?.branch] ?? 'ground';
export const billetTitle = (svc, billet) => specialtyTitle(svc?.specialty, familyOf(svc), billet) ?? localBillet(svc?.nation, svc?.branch, billet) ?? BILLETS[familyOf(svc)][billet] ?? billet;
export const canImposeNjp = (billet) => COMMANDERS.has(billet);
export const leads = (billet) => LEADS.has(billet);

/** The billet your rank puts you in (command posts only while you hold them). */
export function billetFor(svc) {
  const held = svc.unit?.billet;
  if (held && COMMAND_POSTS[held] && svc.unit.commandUntil != null) return held;
  if (svc.track === 'warrant') return 'warrant';
  if (svc.track === 'enlisted') return svc.grade <= 3 ? 'member' : svc.grade === 4 ? 'teamLeader' : svc.grade === 5 ? 'squadLeader' : svc.grade === 6 ? 'platoonSergeant' : svc.grade === 7 ? 'opsNco' : 'seniorStaffNco';
  return svc.grade <= 1 ? 'platoonLeader' : svc.grade === 2 ? 'xo' : svc.grade <= 4 ? 'staff' : 'higher';
}

const COMPANIES = { ground: ['Alpha', 'Bravo', 'Charlie', 'Headquarters'], naval: ['Operations', 'Engineering', 'Combat Systems', 'Supply'], air: ['Operations', 'Maintenance', 'Mission Support', 'Medical'], corps: ['Operations', 'Programs', 'Field', 'Support'] };
const UNIT_NAMES = {
  ground: (rng) => `${rng.pick(['1st', '2nd', '3rd', '1st', '2nd'])} Battalion, ${rng.pick(['327th', '502nd', '75th', '22nd', '8th', '187th', '5th'])} ${rng.pick(['Infantry Regiment', 'Field Artillery', 'Brigade Support Battalion', 'Cavalry Regiment'])}`,
  naval: (rng) => `USS ${rng.pick(['Arleigh Burke', 'Nimitz', 'Halsey', 'Bunker Hill', 'Gonzalez', 'Truxtun', 'Momsen'])}`,
  air: (rng) => `${rng.pick(['4th', '20th', '388th', '33rd', '97th', '552nd'])} ${rng.pick(['Operations Group', 'Maintenance Group', 'Mission Support Group'])}`,
  corps: (rng) => `${rng.pick(['Region', 'District', 'Field'])} ${rng.int(1, 10)} Office`,
};

function soldier(rng, org, { grade, track = 'enlisted', billet, company = null, ranks }) {
  const gender = rng.pick(['male', 'female', 'male']);
  const n = randomName(rng, gender);
  const p = { id: rng.id('sm_'), name: `${n.firstName} ${n.lastName}`, gender, age: track === 'officer' ? 22 + grade * 3 + rng.int(0, 3) : 18 + grade * 2 + rng.int(0, 4), grade, track, billet, rank: ranks?.[track]?.[grade] ?? '', deptId: company, years: rng.int(0, 3), performance: rng.int(45, 85), rel: rng.int(40, 65), discipline: 0, professionId: null, levelId: billet, title: '' };
  p.title = `${p.rank} — ${specialtyTitle(org.specialty, org.family, billet) ?? localBillet(org.nation, org.branch, billet) ?? BILLETS[org.family][billet] ?? billet}`;
  org.people[p.id] = p;
  return p;
}

/** Find or create your unit at your current station. */
export function ensureUnit(state, svc, ranks) {
  initOrgs(state);
  const family = familyOf(svc);
  // Special operators serve in their own command (the Ranger Regiment, a SEAL Team…), wherever they're based.
  const pre = svc.nation ? `${svc.nation}:` : '';
  // Doctors serve in a hospital and lawyers in a legal office; everyone else in their station's unit.
  const corps = !svc.sof && family !== 'corps' ? CORPS_UNITS[svc.specialty] : null;
  const key = svc.sof ? `unit:${pre}${svc.branch}:sof:${svc.sof.pipeline}` : `unit:${pre}${svc.branch}:${svc.station ?? 'initial'}${corps ? `:${svc.specialty}` : ''}`;
  let org = state.orgs.byId[key];
  const rng = sideRng(state);
  if (!org) {
    org = { id: key, typeId: `unit:${svc.branch}`, military: true, family, branch: svc.branch, nation: svc.nation ?? null, specialty: corps ? svc.specialty : null, name: corps ? corps.name(family, rng, svc.nation) : svc.sof?.unitName ?? localUnitName(svc.nation, svc.branch, rng) ?? UNIT_NAMES[family](rng), sof: Boolean(svc.sof), scope: 'nation', sector: 'federal', regionId: state.character.regionId, size: 'large', head: null, departments: {}, people: {}, founded: state.character.age, csm: null, readiness: 60 };
    org.head = soldier(rng, org, { grade: 4, track: 'officer', billet: 'battalionCommander', ranks }).id;
    org.csm = soldier(rng, org, { grade: 8, billet: 'csm', ranks }).id;
    for (const name of corps?.companies ?? COMPANIES[family]) {
      const id = name.toLowerCase().replace(/\s+/g, '');
      const dept = { id, name: `${name} ${corps?.word ?? localUnitWord(svc.nation, svc.branch, 'company') ?? BILLETS[family].units.company}`, head: null, firstSergeant: null, headcount: rng.int(90, 160), seats: {}, readiness: rng.int(50, 70) };
      org.departments[id] = dept;
      dept.head = soldier(rng, org, { grade: 2, track: 'officer', billet: 'companyCommander', company: id, ranks }).id;
      dept.firstSergeant = soldier(rng, org, { grade: 7, billet: 'firstSergeant', company: id, ranks }).id;
    }
    state.orgs.byId[key] = org;
  }
  if (!svc.unit || svc.unit.orgId !== key) {
    if (svc.unit?.orgId) releaseUnit(state, svc.unit.orgId);
    svc.unit = { orgId: key, company: Object.keys(org.departments)[rng.int(0, 2)], billet: billetFor({ ...svc, unit: null }), commandUntil: null, commanded: svc.unit?.commanded ?? {} };
  }
  return org;
}

/** You left this unit (new station, discharge): your slots go to NPCs. */
export function releaseUnit(state, orgId) {
  const org = state.orgs?.byId?.[orgId];
  if (!org?.military) return;
  const rng = sideRng(state);
  const replace = (billet, grade, track, company) => soldier(rng, org, { grade, track, billet, company }).id;
  if (org.head === PLAYER) org.head = replace('battalionCommander', 4, 'officer');
  if (org.csm === PLAYER) org.csm = replace('csm', 8, 'enlisted');
  for (const d of Object.values(org.departments)) {
    if (d.head === PLAYER) d.head = replace('companyCommander', 2, 'officer', d.id);
    if (d.firstSergeant === PLAYER) d.firstSergeant = replace('firstSergeant', 7, 'enlisted', d.id);
    const pl = d.platoon;
    if (!pl) continue;
    if (pl.leader === PLAYER) pl.leader = null;
    if (pl.sergeant === PLAYER) pl.sergeant = null;
    for (const sq of pl.squads) {
      if (sq.leader === PLAYER) sq.leader = null;
      sq.members = sq.members.filter((id) => id !== PLAYER);
    }
  }
}

/** Make the structure around you match your billet: your platoon, your squad, who leads you. */
export function syncUnit(state, svc, ranks) {
  const org = ensureUnit(state, svc, ranks);
  if (ranks) org.ranks = ranks;
  const rng = sideRng(state);
  const u = svc.unit;
  u.billet = billetFor(svc);
  const dept = org.departments[u.company];
  // Command slots: the player displaces the NPC holder while in command.
  const swapHead = (holderKey, container, billet, grade, track) => {
    const mine = u.billet === billet;
    if (mine && container[holderKey] !== PLAYER) {
      delete org.people[container[holderKey]];
      container[holderKey] = PLAYER;
    } else if (!mine && container[holderKey] === PLAYER) {
      container[holderKey] = soldier(rng, org, { grade, track, billet, company: dept.id, ranks }).id;
    } else if (!mine && !org.people[container[holderKey]]) container[holderKey] = soldier(rng, org, { grade, track, billet, company: dept.id, ranks }).id;
  };
  swapHead('head', org, 'battalionCommander', 4, 'officer');
  swapHead('csm', org, 'csm', 8, 'enlisted');
  for (const d of Object.values(org.departments)) {
    const myCo = d.id === u.company;
    const billet = myCo ? u.billet : null;
    if (d.head === PLAYER && billet !== 'companyCommander') d.head = soldier(rng, org, { grade: 2, track: 'officer', billet: 'companyCommander', company: d.id, ranks }).id;
    if (d.firstSergeant === PLAYER && billet !== 'firstSergeant') d.firstSergeant = soldier(rng, org, { grade: 7, billet: 'firstSergeant', company: d.id, ranks }).id;
    if (myCo && billet === 'companyCommander' && d.head !== PLAYER) { delete org.people[d.head]; d.head = PLAYER; }
    if (myCo && billet === 'firstSergeant' && d.firstSergeant !== PLAYER) { delete org.people[d.firstSergeant]; d.firstSergeant = PLAYER; }
    if (!d.head || (d.head !== PLAYER && !org.people[d.head])) d.head = soldier(rng, org, { grade: 2, track: 'officer', billet: 'companyCommander', company: d.id, ranks }).id;
    if (!d.firstSergeant || (d.firstSergeant !== PLAYER && !org.people[d.firstSergeant])) d.firstSergeant = soldier(rng, org, { grade: 7, billet: 'firstSergeant', company: d.id, ranks }).id;
  }
  // Your platoon (only for billets that live in one).
  const inPlatoon = ['member', 'teamLeader', 'squadLeader', 'platoonSergeant', 'platoonLeader'].includes(u.billet);
  dept.platoon ??= { leader: null, sergeant: null, squads: [{ leader: null, members: [] }, { leader: null, members: [] }, { leader: null, members: [] }] };
  const pl = dept.platoon;
  const fill = (slot, billet, grade, track = 'enlisted') => (slot && slot !== PLAYER && org.people[slot] ? slot : soldier(rng, org, { grade, track, billet, company: dept.id, ranks }).id);
  const clearPlayer = (v) => (v === PLAYER ? null : v);
  pl.leader = clearPlayer(pl.leader);
  pl.sergeant = clearPlayer(pl.sergeant);
  for (const sq of pl.squads) { sq.leader = clearPlayer(sq.leader); sq.members = sq.members.filter((id) => id !== PLAYER && org.people[id]); }
  if (inPlatoon) {
    if (u.billet === 'platoonLeader') { if (pl.leader) delete org.people[pl.leader]; pl.leader = PLAYER; }
    if (u.billet === 'platoonSergeant') { if (pl.sergeant) delete org.people[pl.sergeant]; pl.sergeant = PLAYER; }
    if (u.billet === 'squadLeader') { if (pl.squads[0].leader) delete org.people[pl.squads[0].leader]; pl.squads[0].leader = PLAYER; }
    if (u.billet === 'member' || u.billet === 'teamLeader') pl.squads[0].members.unshift(PLAYER);
  }
  pl.leader = pl.leader ?? fill(null, 'platoonLeader', rng.int(0, 1), 'officer');
  pl.sergeant = pl.sergeant ?? fill(null, 'platoonSergeant', 6);
  for (const sq of pl.squads) {
    sq.leader = sq.leader ?? fill(null, 'squadLeader', 5);
    while (sq.members.filter((id) => id !== PLAYER).length < 4) sq.members.push(soldier(rng, org, { grade: rng.int(0, 4), billet: rng.chance(0.3) ? 'teamLeader' : 'member', company: dept.id, ranks }).id);
  }
  return org;
}

const person = (org, id) => (id && id !== PLAYER ? org.people[id] ?? null : null);

/** Your chain of command and the people you lead (existing data only — safe for views). */
export function unitView(state, svc) {
  const org = svc?.unit && state.orgs?.byId?.[svc.unit.orgId];
  if (!org) return null;
  const u = svc.unit;
  const dept = org.departments[u.company];
  const pl = dept?.platoon;
  const b = u.billet;
  const chain = [];
  // Your leaders carry the unit's titles (an intelligence soldier's battalion is still an infantry battalion).
  const unitSvc = { ...svc, specialty: org.specialty };
  const add = (label, id) => { if (id === PLAYER) return; const p = person(org, id); if (p) chain.push({ label, person: p }); };
  if (['member', 'teamLeader'].includes(b)) add(billetTitle(unitSvc, 'squadLeader'), pl?.squads[0].leader);
  if (['member', 'teamLeader', 'squadLeader'].includes(b)) add(billetTitle(unitSvc, 'platoonSergeant'), pl?.sergeant);
  if (['member', 'teamLeader', 'squadLeader', 'platoonSergeant'].includes(b)) add(billetTitle(unitSvc, 'platoonLeader'), pl?.leader);
  if (b !== 'companyCommander' && b !== 'battalionCommander' && b !== 'csm' && b !== 'higher' && b !== 'staff' && b !== 'seniorStaffNco') add(billetTitle(unitSvc, 'firstSergeant'), dept?.firstSergeant);
  if (!['companyCommander', 'battalionCommander', 'csm', 'higher', 'staff', 'seniorStaffNco'].includes(b)) add(billetTitle(unitSvc, 'companyCommander'), dept?.head);
  if (b !== 'csm') add(billetTitle(unitSvc, 'csm'), org.csm);
  if (b !== 'battalionCommander') add(billetTitle(unitSvc, 'battalionCommander'), org.head);
  let team = [];
  if (b === 'member') team = (pl?.squads[0].members ?? []).filter((id) => id !== PLAYER);
  else if (b === 'teamLeader') team = (pl?.squads[0].members ?? []).filter((id) => id !== PLAYER).slice(0, 3);
  else if (b === 'squadLeader') team = pl?.squads[0].members ?? [];
  else if (b === 'platoonSergeant' || b === 'platoonLeader') team = [...(pl?.squads.map((s) => s.leader) ?? []), ...(pl?.squads.flatMap((s) => s.members.slice(0, 1)) ?? [])];
  else if (b === 'companyCommander' || b === 'firstSergeant' || b === 'xo') team = [pl?.leader, pl?.sergeant, ...(pl?.squads.map((s) => s.leader) ?? [])];
  else if (b === 'battalionCommander' || b === 'csm') team = Object.values(org.departments).flatMap((d) => [d.head, d.firstSergeant]);
  return { org, dept, billet: b, chain, team: team.map((id) => person(org, id)).filter(Boolean), readiness: dept?.readiness ?? 60, command: COMMAND_POSTS[b] ? { ...COMMAND_POSTS[b], until: u.commandUntil } : null };
}

/**
 * Yearly: soldiers rotate out and in, the unit's readiness follows its
 * people, and selection boards may offer you command. Returns an eval bonus.
 */
export function unitTick(ctx, svc, ranks) {
  const { state } = ctx;
  const age = state.character.age;
  // Command tours end.
  if (svc.unit?.commandUntil != null && age >= svc.unit.commandUntil) {
    const post = svc.unit.billet;
    svc.unit.commanded[post] = true;
    svc.unit.commandUntil = null;
    ctx.log(`You relinquished ${COMMAND_POSTS[post].label} at a change-of-command ceremony and moved to a staff job.`, '🎖️', 'military');
  }
  const org = syncUnit(state, svc, ranks);
  const rng = sideRng(state);
  const dept = org.departments[svc.unit.company];
  // Turnover: people PCS, ETS and get promoted out every year.
  for (const p of Object.values(org.people)) {
    p.years += 1;
    p.age += 1;
    p.performance = Math.round(clamp(p.performance + (p.rel - 50) / 30 + rng.float(-5, 5), 15, 98));
    if (rng.chance(0.18)) {
      for (const d of Object.values(org.departments)) {
        if (d.platoon) for (const sq of d.platoon.squads) sq.members = sq.members.filter((id) => id !== p.id);
        if (d.platoon && d.platoon.leader === p.id) d.platoon.leader = null;
        if (d.platoon && d.platoon.sergeant === p.id) d.platoon.sergeant = null;
        if (d.platoon) for (const sq of d.platoon.squads) if (sq.leader === p.id) sq.leader = null;
        if (d.head === p.id) d.head = null;
        if (d.firstSergeant === p.id) d.firstSergeant = null;
      }
      if (org.head === p.id) org.head = null;
      if (org.csm === p.id) org.csm = null;
      delete org.people[p.id];
    }
  }
  syncUnit(state, svc, ranks);
  // Readiness follows the people you lead.
  const v = unitView(state, svc);
  const people = v.team.length ? v.team : Object.values(org.people).filter((p) => p.deptId === dept.id);
  const avg = people.length ? people.reduce((s, p) => s + p.performance - p.discipline * 4, 0) / people.length : 60;
  dept.readiness = Math.round(clamp(dept.readiness + (avg - dept.readiness) * 0.4 + rng.int(-4, 4), 0, 100));
  // Selection boards for command.
  // One command at a time, and not while away on a special-duty tour, in college or in a top post.
  if (!svc.unit.commandUntil && !svc.assignment && !svc.commissioning && !svc.topPost && !state.prompts.some((p) => p.type === 'military.commandOffer')) {
    const post = Object.entries(COMMAND_POSTS).find(([id, c]) => c.track === svc.track && c.grade === svc.grade && !svc.unit.commanded[id]);
    if (post && svc.yearsInGrade >= 1) {
      const [id, c] = post;
      const chance = clamp(0.25 + (svc.eval - 60) / 60 - (svc.disciplinary ?? 0) * 0.1, 0.05, 0.8);
      if (rng.chance(chance)) {
        ctx.prompt({
          type: 'military.commandOffer', icon: '🎖️', title: 'Selected for Command',
          text: `The ${c.label} selection board picked you: ${billetTitle(svc, id)}, ${id === 'companyCommander' || id === 'firstSergeant' ? dept.name : org.name}, for a ${c.tour}-year tour.`,
          options: [{ id: 'accept', label: `🎖️ Take ${c.label}` }, { id: 'decline', label: '🙅 Decline (it will hurt your career)' }],
          data: { post: id },
        });
      } else ctx.log(`The ${c.label} selection board didn't pick you this year.`, '📋', 'military');
    }
  }
  return leads(svc.unit.billet) ? Math.round((dept.readiness - 55) / 5) : 0;
}

/* ------------------------------------------------------------------ */
/* Leadership actions                                                  */
/* ------------------------------------------------------------------ */

function useAction(ctx) {
  if (yearlyCount(ctx.state, 'military.lead') >= LEADER_ACTIONS) {
    ctx.toast(`You've used your ${LEADER_ACTIONS} leadership actions this year.`, 'warn');
    return false;
  }
  bumpYearly(ctx.state, 'military.lead');
  return true;
}

function subordinate(state, svc, id) {
  const v = unitView(state, svc);
  const p = v?.team.find((x) => x.id === id);
  return p && leads(v.billet) ? { v, p } : null;
}

export const LeadershipActions = {
  /** Developmental counseling: the bread and butter of leading people. */
  counsel(ctx, id) {
    const svc = ctx.state.military.service;
    const f = svc && subordinate(ctx.state, svc, id);
    if (!f || !useAction(ctx)) return;
    f.p.rel = Math.min(100, f.p.rel + 8);
    f.p.performance = Math.min(98, f.p.performance + (ctx.state.stats.smarts > 55 ? 6 : 3));
    ctx.log(`You counseled ${f.p.rank} ${f.p.name}. They left with a plan.`, '🗣️', 'military');
  },
  /** Recommend an award (commanders approve their own). */
  award(ctx, id) {
    const { state, rng } = ctx;
    const svc = state.military.service;
    const f = svc && subordinate(state, svc, id);
    if (!f || !useAction(ctx)) return;
    const approved = canImposeNjp(f.v.billet) || rng.chance(f.p.performance >= 70 ? 0.8 : 0.4);
    if (!approved) return ctx.log(`Your award recommendation for ${f.p.name} was downgraded to a certificate of appreciation.`, '📜', 'military');
    f.p.rel = Math.min(100, f.p.rel + 12);
    f.p.awards = (f.p.awards ?? 0) + 1;
    f.v.dept.readiness = Math.min(100, f.v.dept.readiness + 2);
    ctx.log(`${f.p.rank} ${f.p.name} received an ${state.military.service.branch === 'navy' || state.military.service.branch === 'coastguard' ? 'Achievement Medal' : 'Achievement Medal'} on your recommendation.`, '🎖️', 'good');
  },
  /** Non-judicial punishment (Article 15): commanders impose it; other leaders recommend it. */
  njp(ctx, id) {
    const { state, rng } = ctx;
    const svc = state.military.service;
    const f = svc && subordinate(state, svc, id);
    if (!f || !useAction(ctx)) return;
    const justified = f.p.performance < 45 || f.p.discipline >= 1;
    if (!canImposeNjp(f.v.billet)) {
      const cmdr = person(f.v.org, f.v.dept.head);
      // A first sergeant's or sergeant major's recommendation is rarely turned down.
      const weight = SENIOR_NCOS.has(f.v.billet) ? 0.15 : 0;
      if (!rng.chance((justified ? 0.75 : 0.2) + weight)) {
        f.p.rel = Math.max(0, f.p.rel - 10);
        return ctx.log(`${cmdr ? `${cmdr.rank} ${cmdr.name}` : 'Your commander'} declined to give ${f.p.name} ${summaryPunishment(svc.nation)}${justified ? '' : ' — "that\'s a counseling, not a charge"'}.`, '⚖️', 'military');
      }
    }
    f.p.discipline += 1;
    f.p.rel = Math.max(0, f.p.rel - 18);
    if (f.p.grade > 0 && rng.chance(0.6)) {
      f.p.grade -= 1;
      f.p.title = `reduced in rank — ${f.p.title.split(' — ')[1] ?? ''}`;
    }
    f.p.performance = Math.min(98, f.p.performance + (justified ? 8 : 0));
    f.v.dept.readiness = Math.max(0, f.v.dept.readiness + (justified ? 1 : -4));
    ctx.log(`${f.p.name} received ${svc.nation ? summaryPunishment(svc.nation).replace(/^an? /, '') : 'non-judicial punishment (Article 15)'}: extra duty${f.p.grade >= 0 ? ' and loss of rank' : ''}. ${justified ? 'The unit saw it was fair.' : 'The unit thinks it was heavy-handed.'}`, '⚖️', justified ? 'military' : 'warn');
  },
};

Object.assign(LeadershipActions, {
  /** Corrective training: an NCO's own tool — extra drill on the thing that went wrong, no paperwork. */
  correct(ctx, id) {
    const { state, rng } = ctx;
    const svc = state.military.service;
    const f = svc && subordinate(state, svc, id);
    if (!f || !useAction(ctx)) return;
    const needed = f.p.performance < 60 || f.p.discipline >= 1;
    f.p.performance = Math.min(98, f.p.performance + (needed ? rng.int(4, 8) : 1));
    f.p.rel = Math.max(0, f.p.rel - (needed ? 3 : 8));
    ctx.log(`You gave ${f.p.rank} ${f.p.name} corrective training. ${needed ? 'It stuck.' : 'They thought it was petty.'}`, '🏋️', 'military');
  },
  /** Promote junior enlisted: NCOs recommend, senior NCOs and commanders decide. */
  promote(ctx, id) {
    const { state, rng } = ctx;
    const svc = state.military.service;
    const f = svc && subordinate(state, svc, id);
    if (!f) return;
    if (f.p.track !== 'enlisted' || f.p.grade >= 3) return ctx.toast('Promotion to sergeant goes to a board.', 'warn');
    if (!useAction(ctx)) return;
    const decides = canImposeNjp(f.v.billet) || SENIOR_NCOS.has(f.v.billet);
    const deserving = f.p.performance >= 65 && f.p.discipline === 0;
    if (!decides && !rng.chance(deserving ? 0.8 : 0.25)) return ctx.log(`Your recommendation to promote ${f.p.name} was held: "${deserving ? 'next cycle' : 'not ready'}."`, '📋', 'military');
    f.p.grade += 1;
    f.p.rank = f.v.org.ranks?.enlisted?.[f.p.grade] ?? f.p.rank;
    f.p.title = `${f.p.rank} — ${f.p.title.split(' — ')[1] ?? ''}`;
    f.p.rel = Math.min(100, f.p.rel + 10);
    f.v.dept.readiness = Math.min(100, f.v.dept.readiness + (deserving ? 2 : -2));
    ctx.log(`${f.p.name} was promoted to ${f.p.rank}${decides ? '' : ' on your recommendation'}.${deserving ? '' : ' Some in the unit thought it was early.'}`, '⬆️', deserving ? 'good' : 'military');
  },
});

export const LeadershipResolvers = {
  commandOffer(ctx, data, optionId) {
    const svc = ctx.state.military.service;
    if (!svc?.unit) return;
    if (optionId !== 'accept') {
      svc.eval = Math.max(0, svc.eval - 10);
      svc.unit.commanded[data.post] = true;
      ctx.log('You declined command. Boards will remember.', '📋', 'warn');
      return;
    }
    const c = COMMAND_POSTS[data.post];
    svc.unit.billet = data.post;
    svc.unit.commandUntil = ctx.state.character.age + c.tour;
    ctx.log(`You took ${c.label}: ${billetTitle(svc, data.post)}. Your unit's readiness is now your report card.`, '🎖️', 'milestone');
    ctx.stat('stress', 6);
  },
};
