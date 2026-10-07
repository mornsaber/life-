/**
 * Organization fuzzer: random lives full of job moves, promotions,
 * supervision, business ownership and owner actions, checking structural
 * invariants every year.
 *
 *   node tests/orgfuzz.js [lives=40] [seed=1]
 */
import { MOS } from '../src/modules/military/MOS.js';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { PROFESSION_LIST } from '../src/modules/career/JobTrees.js';
import { BUSINESS_TYPES } from '../src/modules/business/BusinessTypes.js';
import { businessOrg } from '../src/modules/org/Businesses.js';
import { orgType } from '../src/modules/org/Organizations.js';
import { seatsAt, NAMED_SEATS } from '../src/modules/org/Vacancies.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { levelById } from '../src/modules/career/Ladder.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { appointmentsInReach } from '../src/modules/org/Government.js';
import { officeRoster, officeSeat } from '../src/modules/org/ElectedOffices.js';
import { unitView } from '../src/modules/org/MilitaryUnits.js';
import { licensesFor } from '../src/modules/business/BusinessLicenses.js';
import { businessAdvice } from '../src/modules/business/Advisor.js';

const LIVES = Number(process.argv[2] ?? 40);
const SEED = Number(process.argv[3] ?? 1);
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const problems = new Map();
const seenPaths = new Set();
let maxOrgKb = 0;
const flag = (msg, where) => { if (!problems.has(msg)) problems.set(msg, where); };

function nanScan(obj, path, depth = 0) {
  if (depth > 4 || !obj || typeof obj !== 'object') return;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number' && !Number.isFinite(v)) flag(`non-finite number at ${path}.${k}`, v);
    else if (v && typeof v === 'object') nanScan(v, `${path}.${k}`, depth + 1);
  }
}

function check(state, where) {
  const orgs = state.orgs?.byId ?? {};
  if (Object.keys(orgs).length > 600) flag('organizations pile up (>600)', where);
  // Military units: you hold exactly one slot, in your current unit only.
  let slots = 0;
  for (const org of Object.values(orgs)) {
    if (!org.military) continue;
    const json = JSON.stringify(org);
    const n = (json.match(/"PLAYER"/g) ?? []).length;
    slots += n;
    if (n && state.military.service?.unit?.orgId !== org.id) flag('player still holds a slot in a unit they left', where);
    for (const d of Object.values(org.departments)) for (const k of ['head', 'firstSergeant']) if (d[k] && d[k] !== 'PLAYER' && !org.people[d[k]]) flag(`unit ${k} missing from people`, where);
  }
  if (slots > 1) flag(`player holds ${slots} unit slots`, where);
  if (state.military.service?.unit) seenPaths.add(`military billet ${state.military.service.unit.billet}`);
  if (state.military.service?.sof) seenPaths.add(`special operations ${state.military.service.sof.pipeline}`);
  if (state.military.service?.overseas) seenPaths.add('overseas tour');
  if (state.military.service?.njp?.length) seenPaths.add('article 15');
  if (state.legal.record.some((r) => r.court === 'court-martial')) seenPaths.add('court-martial conviction');
  if (state.military.selection && !state.prompts.some((p) => p.type === 'military.selectionPhase')) flag('selection course with no phase prompt', where);
  // Volunteer organizations and veterans posts: one seat at most, only where you're a member.
  for (const org of Object.values(orgs)) {
    if (!org.volunteer && !org.veteranPost) continue;
    const n = Object.values(org.seats).flat().filter((x) => x === 'PLAYER').length;
    if (n > 1) flag(`player holds ${n} seats in ${org.name}`, where);
    const member = org.volunteer ? state.emergency[org.serviceId] : state.service.posts[org.typeId.split(':')[1]];
    if (n && member?.orgId !== org.id) flag('player holds a seat in an organization they left', where);
    if (n && org.volunteer && !(org.seats[member.rankIndex] ?? []).includes('PLAYER')) flag('volunteer seat does not match rank', where);
    for (const seats of Object.values(org.seats)) for (const id of seats) if (id && id !== 'PLAYER' && !org.people[id]) flag('seat holder missing from roster', where);
    if (n && org.volunteer && (org.seats[6] ?? org.seats[4] ?? []).includes('PLAYER')) seenPaths.add('elected volunteer chief');
    if (n && org.veteranPost && org.seats[4].includes('PLAYER')) seenPaths.add('post commander');
  }
  if (state.military.service?.track === 'warrant') seenPaths.add('warrant officer');
  if (state.career.job?.cleared) seenPaths.add('cleared program role');
  if (state.military.service?.lastRetrain) seenPaths.add('retrained');
  if (state.military.service?.branchDetail) seenPaths.add('branch detail');
  if (state.service?.program) seenPaths.add(`national service ${state.service.program.id}`);
  if (Object.values(state.service?.teams ?? {}).some((t) => t?.deployments)) seenPaths.add('disaster team deployment');
  if (state.service?.sdf) {
    seenPaths.add('state defense force');
    const o = orgs[`sdf:${state.service.sdf.stateId}`];
    if (o) for (let r = 2; r < 10; r++) {
      const n = Object.values(o.people).filter((p) => p.rankIndex === r).length + (state.service.sdf.rankIndex === r ? 1 : 0);
      const cap = [Infinity, Infinity, 10, 6, 4, 2, 4, 3, 2, 1][r];
      if (n > cap) flag(`State Guard rank ${r} over its slots (${n}/${cap})`, where);
    }
    if (state.service.sdf.rankIndex >= 3) seenPaths.add('State Guard NCO+');
  }
  if (Object.keys(state.military.service?.schools ?? {}).some((k) => !k.startsWith('pme') && !k.startsWith('opme'))) seenPaths.add('military qualification');
  if (state.career.job?.professionId === 'privateMilitary') seenPaths.add('military contractor');
  for (const org of Object.values(orgs)) {
    if (org.military || org.volunteer || org.veteranPost || org.sdf) continue;
    if (org.branches?.length) seenPaths.add('branches');
    if (org.mergedInto) seenPaths.add('merged/acquired');
    if (org.business && org.owner?.kind === 'npc' && org.business.founderId) seenPaths.add('employee founded rival');
    if (org.business && org.owner?.kind === 'npc' && !org.closed && Object.keys(org.people).length && org.ceo) seenPaths.add('sold business lives on');
    if (Object.values(org.people).some((p) => p.appointedByPlayer)) seenPaths.add('player appointment');
    if (Object.values(org.people).some((p) => p.returned)) seenPaths.add('boomerang');
    const seen = new Map();
    for (const d of Object.values(org.departments)) {
      if (d.head && !org.people[d.head]) flag(`dept head missing from people (${org.typeId}.${d.id})`, where);
      for (const [pid, byLevel] of Object.entries(d.seats ?? {})) {
        for (const [lid, ids] of Object.entries(byLevel)) {
          if (new Set(ids).size !== ids.length) flag(`duplicate id in one seat list (${org.typeId}.${d.id}.${pid}.${lid})`, where);
          for (const id of ids) {
            if (!org.people[id]) continue;
            if (seen.has(id)) flag(`person in two seats (${org.typeId})`, `${where} ${seen.get(id)} & ${d.id}.${lid}`);
            seen.set(id, `${d.id}.${lid}`);
            const p = org.people[id];
            if (p.levelId !== lid) flag(`seat level ≠ person.levelId (${org.typeId})`, `${where} ${lid} vs ${p.levelId}`);
            if (p.deptId !== d.id) flag(`seat dept ≠ person.deptId (${org.typeId})`, `${where} ${d.id} vs ${p.deptId}`);
          }
          // Named posts never hold more people than seats (vacancy filled on top of a regenerated holder).
          if (!org.business && org.size) {
            const prof = getProfession(pid);
            const level = prof && levelById(prof, lid);
            if (level) {
              const seats = seatsAt(org, d.id, prof, level, org.size);
              const live = ids.filter((id) => org.people[id]).length;
              const playerHere = state.career.job?.employer?.orgId === org.id && state.career.job.employer.deptId === d.id && state.career.job.levelId === lid ? 1 : 0;
              if (seats <= NAMED_SEATS && live + playerHere > seats) flag(`named post over capacity (${org.typeId} ${lid}: ${live}+${playerHere} > ${seats})`, where);
            }
          }
        }
      }
    }
    if (org.ceo && !org.people[org.ceo]) flag('business ceo missing from people', where);
    if (org.business && !orgType(org.typeId)) flag(`business org with unknown type ${org.typeId}`, where);
  }
  // Head posts: the player's seat is marked exactly where they hold it.
  const job0 = state.career.job;
  for (const org of Object.values(orgs)) {
    const mine = job0?.headOf?.orgId === org.id;
    if (org.playerHead && !(mine && !job0.headOf.deptId)) flag('org marked as player-headed but the player is not its head', where);
    if (org.playerHead && org.head) flag('player-headed org also has an NPC head', where);
    for (const d of Object.values(org.departments)) {
      if (d.playerHead && !(mine && job0.headOf.deptId === d.id)) flag('department marked as player-headed but the player is not its head', where);
      if (d.playerHead && d.head) flag('player-headed department also has an NPC head', where);
    }
  }
  if (job0?.headOf) seenPaths.add(job0.headOf.deptId ? 'department head' : 'organization head');
  // Elected seats: marked only where the player's current office sits.
  const seatNow = officeSeat(state);
  for (const org of Object.values(orgs)) {
    if (org.officeHead && !(seatNow && seatNow.org === org && !seatNow.deptId)) flag('org marked as run by the player\'s office, but it is not', where);
    if (org.officeHead && org.head) flag('office-run org also has an NPC head', where);
    for (const d of Object.values(org.departments)) {
      if (d.officeHead && !(seatNow && seatNow.org === org && seatNow.deptId === d.id)) flag('department marked as run by the player\'s office, but it is not', where);
      if (d.officeHead && d.head) flag('office-run department also has an NPC head', where);
    }
  }
  if (seatNow?.holder.officeHead) seenPaths.add(`runs ${seatNow.officeId}`);
  const job = state.career.job;
  if (job) {
    nanScan(job, 'job');
    const org = orgs[job.employer.orgId];
    if (!org) flag('job without organization', where);
    else if (!org.departments[job.employer.deptId]) flag(`job dept missing (${org.typeId} ${job.employer.deptId})`, where);
  }
  for (const biz of [state.business.current, ...(state.business.holdings ?? [])].filter(Boolean)) {
    nanScan(biz, 'biz');
    const org = businessOrg(state, biz);
    if (!org) flag('business without organization', where);
    else {
      if (org.owner?.kind !== 'player') flag('own business not owned by player', where);
      if (org.closed) flag('own business org marked closed', where);
      const named = Object.keys(org.people).length;
      if (named > 80) flag(`business names too many people (${named})`, where);
    }
  }
  for (const h of state.business.history) {
    const org = h.orgId && orgs[h.orgId];
    if (org && org.owner?.kind === 'player' && !org.closed) flag('sold/closed business still owned by player', `${where} ${h.outcome}`);
  }
  if (state.business.current && state.business.holdings?.includes(state.business.current)) flag('business both current and held', where);
  if (state.business.holdings?.length) seenPaths.add('holdings');
  if (state.business.current?.investors?.length) seenPaths.add('stake sold / merger');
  if (Object.values(state.business.current?.licenses ?? {}).some((l) => l.status === 'pending')) seenPaths.add('license pending');
  if (Object.values(state.business.current?.licenses ?? {}).some((l) => l.status === 'suspended' || l.status === 'lapsed')) seenPaths.add('license suspended/lapsed');
  if (state.career.job && state.orgs.byId[state.career.job.employer.orgId]?.business) seenPaths.add('employed at an NPC business');
  if (state.career.history.some((h) => /went out of business/.test(h.reason))) seenPaths.add('laid off when employer closed');
}

const ACTIONS = [
  ['career.requestPromotion'], ['career.workHarder'], ['career.quit', 0.02],
  ['orgs.commend', 'report'], ['orgs.discipline', 'report'], ['orgs.recommend', 'report'], ['orgs.transferOut', 'report'], ['orgs.terminate', 'report'],
  ['orgs.internalMove', 'move'], ['orgs.rehire', 'former'],
  ['business.staffCommend', 'staff'], ['business.staffRaise', 'staff'], ['business.staffPromote', 'staff'], ['business.staffDemote', 'staff'], ['business.staffFire', 'staff'], ['business.staffTransfer', 'transfer'],
  ['business.appointCeo'], ['business.makePassive'], ['business.takeBack', 'holding'], ['business.sellHolding', 'holding', 0.1],
  ['business.setRole', 'role'], ['business.setPrice', 'price'], ['business.setPay', 'pay'], ['business.setSupplier', 'supplier'], ['business.invest', 'invest'], ['business.payDown'],
  ['business.expand', 'expand'], ['business.closeLocation', 'branch'], ['business.acquire', 'rival'], ['business.merge', 'rival'], ['business.sellStake', 'stake'], ['business.hire', 'n'], ['business.layoff', null, 0.1],
  ['orgs.appoint', 'appoint', 0.5], ['military.counsel', 'soldier'], ['military.award', 'soldier'], ['military.njp', 'soldier'], ['military.volunteerSelection', 'pipeline'], ['military.transferGiBill', null, 0.2], ['military.leaveSof', null, 0.05], ['orgs.officeAppoint', 'deputyKind'], ['orgs.officeCommend', 'officeStaff'], ['orgs.officeDiscipline', 'officeStaff'], ['orgs.officePromote', 'officeStaff'], ['orgs.officeFire', 'officeStaff'], ['orgs.applyExec', 'exec'], ['business.getLicense', 'license'], ['business.toggleAutopilot', null, 0.2], ['business.relocate', null, 0.3], ['business.advice', 'advice'], ['business.sell', null, 0.05], ['business.close', null, 0.02], ['business.giveToFamily', 'family', 0.02],
  ['emergency.join', 'volService', 0.3], ['emergency.fundraise', 'volService'], ['emergency.recruit', 'volService'], ['emergency.grant', 'volService'], ['emergency.disciplineMember', 'volMember'], ['emergency.appointMember', 'volMember'], ['emergency.commendMember', 'volMember'], ['emergency.resign', 'volService', 0.03],
  ['service.joinProgram', 'program', 0.1], ['service.quitProgram', null, 0.05], ['service.joinSdf', null, 0.1], ['service.sdfSchool', 'sdfSchool'], ['military.attendSchool', 'milSchool'], ['military.retrain', 'retrainMos'], ['cleared.requestSponsorship', null, 0.3], ['military.applyWarrant', 'warrantMos'], ['service.joinTeam', 'team', 0.2], ['service.joinPost', 'post', 0.3], ['service.postActivity', 'postAct'],
];

function argFor(kind, state, rng) {
  const job = state.career.job;
  const biz = state.business.current;
  const org = biz && businessOrg(state, biz);
  switch (kind) {
    case 'report': { const o = job && state.orgs.byId[job.employer.orgId]; const ids = o ? Object.values(o.people).filter((p) => p.deptId === job.employer.deptId).map((p) => p.id) : []; return rng.pick(ids.length ? ids : ['none']); }
    case 'move': return rng.pick(PROFESSION_LIST).id;
    case 'former': return rng.pick(state.career.history.map((h) => h.orgId).filter(Boolean).concat(['none']));
    case 'staff': return org ? rng.pick(Object.keys(org.people).concat(['none'])) : 'none';
    case 'transfer': return org ? `${rng.pick(Object.keys(org.people).concat(['none']))}:${rng.pick(Object.keys(org.departments))}` : 'none';
    case 'holding': return rng.pick((state.business.holdings ?? []).map((h) => h.id).concat(['none']));
    case 'role': return rng.pick(['operator', 'absentee']);
    case 'price': return rng.pick(['budget', 'standard', 'premium']);
    case 'pay': return rng.pick(['below', 'market', 'above']);
    case 'supplier': return rng.pick(['cheap', 'standard', 'premium']);
    case 'invest': return rng.pick(['equipment', 'technology']);
    case 'expand': return rng.pick(['cash', 'sba']);
    case 'branch': return org ? rng.pick(org.branches.map((b) => b.deptId).concat(['none'])) : 'none';
    case 'rival': return rng.pick(Object.values(state.orgs.byId).filter((o) => o.business && o.owner?.kind === 'npc' && !o.closed).map((o) => o.id).concat(['none']));
    case 'stake': return rng.pick(['0.25', '0.49']);
    case 'appoint': { const a = rng.pick(appointmentsInReach(state, { ensure: false }).concat([null])); return a ? `${a.org.id}|${a.deptId ?? '-'}|${rng.pick(['professional', 'loyalist', 'reformer'])}` : 'none'; }
    case 'license': return biz ? rng.pick(licensesFor(biz.typeId)) : 'none';
    case 'exec': return rng.pick((state.career.execSearch?.listings ?? []).map((l) => l.id).concat(['none']));
    case 'deputyKind': return rng.pick(['professional', 'loyalist', 'reformer']);
    case 'officeStaff': { const r = officeRoster(state); return r ? rng.pick(r.staff.concat(r.deputy ? [r.deputy] : []).map((p) => p.id).concat(['none'])) : 'none'; }
    case 'pipeline': return rng.pick(['ranger', 'greenBeret', 'seal', 'pararescue', 'raider', 'orbitalWarfare']);
    case 'soldier': { const v = state.military.service && unitView(state, state.military.service); return v ? rng.pick(v.team.map((p) => p.id).concat(['none'])) : 'none'; }
    case 'volService': return rng.pick(['fire', 'ambulance', 'sar', 'auxiliary', 'police', 'cert']);
    case 'volMember': { const id = rng.pick(Object.keys(state.emergency).filter((k) => state.emergency[k]?.orgId)); const o = id && state.orgs.byId[state.emergency[id].orgId]; return o ? `${id}:${rng.pick(Object.keys(o.people).concat(['none']))}` : 'none'; }
    case 'program': return rng.pick(['americorps:state', 'americorps:vista', 'americorps:nccc', 'peaceCorps:health', 'peaceCorps:education']);
    case 'sdfSchool': return rng.pick(['bot', 'mems', 'nco', 'woc', 'ocs', 'memsSenior', 'staff']);
    case 'milSchool': return rng.pick(['pme1', 'pme2', 'pme3', 'opme1', 'opme2', 'airborne', 'airAssault', 'rangerSchool', 'sniper', 'dli', 'instructor', 'sere']);
    case 'retrainMos': { const s = state.military.service; return s ? rng.pick(Object.values(MOS).filter((m) => m.branch === s.branch && m.track === s.track).map((m) => m.id).concat(['none'])) : 'none'; }
    case 'warrantMos': { const s = state.military.service; return s ? rng.pick(Object.values(MOS).filter((m) => m.branch === s.branch && m.track === 'warrant').map((m) => m.id).concat(['none'])) : 'none'; }
    case 'team': return rng.pick(['fema', 'dmat']);
    case 'post': return rng.pick(['vfw', 'legion']);
    case 'postAct': return `${rng.pick(['vfw', 'legion'])}:${rng.pick(['volunteer', 'honorGuard', 'mentor', 'fundraise', 'scholarship', 'advocate'])}`;
    case 'n': return '3';
    case 'family': return rng.pick((state.people?.list ?? []).map((p) => p.id).concat(['none']));
    default: return undefined;
  }
}

function life(seed) {
  const rng = new Random(seed * 7919);
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Fuzz', lastName: `L${seed}`, gender: rng.pick(['male', 'female']) });
  const solve = () => { for (let g = 0; g < 12 && state.prompts.length; g++) { const pr = state.prompts[0]; const opts = pr.options.filter((o) => !o.disabled); engine.resolvePrompt(pr.id, (rng.pick(opts.length ? opts : pr.options)).id); } };
  const tryDo = (fn, where) => { try { fn(); } catch (e) { flag(`threw: ${e.message.split('\n')[0]}`, `${where}\n${e.stack.split('\n').slice(1, 4).join('\n')}`); } };
  while (state.character.alive && state.character.age < 85) {
    const age = state.character.age;
    if (age >= 18) {
      // Join the military now and then.
      if (!state.military.service && !state.career.job && age <= 32 && rng.chance(0.08)) tryDo(() => { engine.dispatch('military.enlist', `${rng.pick(['army', 'navy', 'airforce', 'marines', 'guard', 'spaceforce'])}:${rng.pick(['enlisted', 'enlisted', 'officer', 'warrant'])}:${rng.pick(['active', 'reserve'])}`); solve(); }, 'enlist');
      // Get a job now and then.
      if (!state.career.job && rng.chance(0.6)) tryDo(() => { engine.dispatch('career.apply', rng.pick(PROFESSION_LIST).id); solve(); }, 'apply');
      // Start a business now and then.
      if (!state.business.current && age >= 22 && rng.chance(0.12)) {
        state.finances.cash = Math.max(state.finances.cash, 3000000);
        tryDo(() => engine.dispatch('business.start', `${rng.pick(Object.keys(BUSINESS_TYPES))}:cash:llc:${rng.pick(['solo', 'standard', 'large'])}:`), 'start');
        // Licenses gate most types; force one that needs none sometimes.
        if (!state.business.current && rng.chance(0.5)) tryDo(() => engine.dispatch('business.start', `${rng.pick(['consulting', 'retail', 'cleaning', 'testPrep', 'softwareShop'])}:cash:llc`), 'start2');
      }
      for (let i = 0; i < 6; i++) {
        const [action, kind, p = 0.6] = rng.pick(ACTIONS);
        if (!rng.chance(p)) continue;
        if (action === 'business.advice') {
          // Follow the advisor's top suggestion.
          tryDo(() => { const biz = state.business.current; const tip = biz && businessAdvice(state, biz).find((t) => t.action); if (tip) { engine.dispatch(tip.action, tip.arg ?? undefined); solve(); } }, 'advice');
        } else tryDo(() => { engine.dispatch(action, argFor(kind, state, rng)); solve(); }, action);
        check(state, `${action} @${state.character.age} seed ${seed}`);
      }
    }
    if (state.politics.office && rng.chance(0.08)) state.politics.office = null;
    // Sometimes hold an office that appoints agency heads.
    if (age >= 30 && !state.politics.office && rng.chance(0.03)) state.politics.office = { id: rng.pick(['mayor', 'governor', 'countyCommissioner', 'schoolBoard', 'sheriff', 'districtAttorney', 'cityManager']), termYearsLeft: 4, terms: 1, approval: 55, startAge: age, fullTime: true };
    // Every tab renders, and rendering changes nothing.
    if (age % 3 === 0) tryDo(() => {
      const before = JSON.stringify(state);
      for (const [tab, view] of Object.entries(VIEWS)) if (typeof view(state, {}) !== 'string') flag(`view ${tab} returned no HTML`, age);
      if (JSON.stringify(state) !== before) flag('rendering a view changed the game state', `seed ${seed} @${age}`);
    }, `render @${age}`);
    tryDo(() => { state.prompts = []; engine.ageUp(); solve(); }, `ageUp @${age}`);
    check(state, `ageUp @${state.character.age} seed ${seed}`);
  }
  const kb = Math.round(JSON.stringify(state.orgs).length / 1024);
  maxOrgKb = Math.max(maxOrgKb, kb);
  if (kb > 600) flag(`organization data too large (${kb} KB)`, `seed ${seed}`);
  // The save must round-trip.
  tryDo(() => { const restored = new Store(engine.store.storage).load(); if (JSON.stringify(restored.orgs) !== JSON.stringify(state.orgs)) flag('orgs do not round-trip through the save', `seed ${seed}`); }, 'roundtrip');
}

for (let i = 0; i < LIVES; i++) life(SEED * 1000 + i);
if (problems.size) {
  for (const [msg, where] of problems) console.log(`  ✘ ${msg}\n      ${String(where).split('\n').join('\n      ')}`);
  console.log(`\n${problems.size} distinct problem(s)`);
  process.exit(1);
}
console.log(`✔ Organization fuzz passed — ${LIVES} lives; paths reached: ${[...seenPaths].sort().join(', ')}; largest org data ${maxOrgKb} KB`);
