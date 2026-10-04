/**
 * Volunteer services as organizations. Your fire company, rescue squad, SAR
 * team or flotilla is an organization in state.orgs (org.volunteer = true)
 * with a roster of named members and a few officer seats.
 *
 * Officer ranks are seats, not just experience: you're promoted into one
 * when a seat opens (members retire, move or step down). The top posts of
 * member-run services are elected: volunteer fire companies elect their
 * chief, rescue squads their captain and chief, Coast Guard Auxiliary
 * flotillas and divisions their commanders.
 *
 * As the elected leader you run the organization: recruit, fundraise,
 * apply for federal grants, appoint officers and discipline members.
 *
 * org.seats = { [rankIndex]: [memberId | 'PLAYER' | null] }
 * member.orgId links your membership to its organization.
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, randomName } from '../../core/State.js';
import { sideRng, initOrgs } from './Organizations.js';

export const PLAYER = 'PLAYER';
export const CHIEF_ACTIONS = 3;

/** Officer seats per rank index, and which are elected by the membership. */
export const LEADERSHIP = {
  fire: { seats: { 4: 3, 5: 2, 6: 1 }, elected: [6], word: 'chief' },
  ambulance: { seats: { 4: 2, 5: 1, 6: 1 }, elected: [5, 6], word: 'captain' },
  sar: { seats: { 3: 4, 4: 2, 5: 1, 6: 1 }, elected: [6], word: 'commander' },
  police: { seats: { 4: 3, 5: 2, 6: 1 }, elected: [] },
  wildland: { seats: { 3: 4, 4: 2, 5: 1, 6: 1 }, elected: [] },
  auxiliary: { seats: { 3: 1, 4: 1 }, elected: [3, 4], word: 'commander' },
  cap: { seats: { 5: 1 }, elected: [] },
  cert: { seats: { 2: 2, 3: 1 }, elected: [] },
  redcross: { seats: { 2: 2, 3: 1 }, elected: [] },
  skiPatrol: { seats: { 3: 2, 4: 1 }, elected: [] },
  mrc: { seats: { 2: 2, 3: 1 }, elected: [] },
};

const leadershipOf = (serviceId) => LEADERSHIP[serviceId] ?? { seats: {}, elected: [] };
export const isSeatRank = (serviceId, idx) => Boolean(leadershipOf(serviceId).seats[idx]);
export const isElectedRank = (serviceId, idx) => leadershipOf(serviceId).elected.includes(idx);
export const topRank = (serviceId) => Math.max(-1, ...Object.keys(leadershipOf(serviceId).seats).map(Number));

function npc(rng, org, rankIndex, ranks) {
  const gender = rng.pick(['male', 'female']);
  const n = randomName(rng, gender);
  const p = { id: rng.id('vm_'), name: `${n.firstName} ${n.lastName}`, gender, age: rng.int(19, 66), rankIndex, title: ranks[rankIndex]?.title ?? '', years: rng.int(0, 20), rel: rng.int(35, 70), performance: rng.int(40, 85), discipline: 0 };
  org.people[p.id] = p;
  return p;
}

/** Find or build the organization behind your membership. */
export function ensureVolunteerOrg(state, service, member) {
  initOrgs(state);
  const key = `vol:${service.id}:${member.unit}`;
  let org = state.orgs.byId[key];
  const rng = sideRng(state);
  if (!org) {
    org = { id: key, typeId: `volunteer:${service.id}`, volunteer: true, serviceId: service.id, name: member.unit, regionId: state.character.regionId, people: {}, departments: {}, head: null, seats: {}, readiness: rng.int(50, 70), funds: service.trainingBudget * 2, nextElection: state.character.age + rng.int(1, 2) };
    const roster = rng.int(12, 30);
    for (let i = 0; i < roster; i++) npc(rng, org, rng.weighted([[0, 4], [1, 4], [2, 3], [3, 2]], ([, w]) => w)[0], service.ranks);
    for (const [idx, n] of Object.entries(leadershipOf(service.id).seats)) org.seats[idx] = Array.from({ length: n }, () => npc(rng, org, Number(idx), service.ranks).id);
    state.orgs.byId[key] = org;
  }
  member.orgId = key;
  // Old saves: a member already at an officer rank holds a seat.
  if (isSeatRank(service.id, member.rankIndex) && !org.seats[member.rankIndex].includes(PLAYER)) seatPlayer(org, member.rankIndex);
  return org;
}

function seatPlayer(org, idx) {
  for (const seats of Object.values(org.seats)) {
    const i = seats.indexOf(PLAYER);
    if (i >= 0) seats[i] = null;
  }
  const seats = org.seats[idx];
  if (!seats) return;
  let i = seats.indexOf(null);
  if (i < 0) {
    // Displace the least senior holder back to the ranks.
    i = 0;
    const p = org.people[seats[0]];
    if (p) p.rankIndex = Math.max(0, Number(idx) - 1);
  }
  seats[i] = PLAYER;
}

/** Is there a seat open for you at this rank (or no seat needed)? */
export function seatOpen(org, serviceId, idx) {
  if (!isSeatRank(serviceId, idx)) return true;
  if (isElectedRank(serviceId, idx)) return false;
  return (org.seats[idx] ?? []).includes(null);
}

export function takeSeat(org, idx) {
  if (org.seats[idx]) seatPlayer(org, idx);
}

/** You left: your seat goes to the next member in line. */
export function releaseVolunteerOrg(state, orgId) {
  const org = state.orgs?.byId?.[orgId];
  if (!org?.volunteer) return;
  for (const seats of Object.values(org.seats)) {
    const i = seats.indexOf(PLAYER);
    if (i >= 0) seats[i] = null;
  }
}

export const officers = (org, ranks) => Object.entries(org.seats).sort(([a], [b]) => Number(b) - Number(a))
  .flatMap(([idx, seats]) => seats.map((id) => ({ idx: Number(idx), title: ranks[idx]?.title ?? '', person: id === PLAYER ? 'PLAYER' : id ? org.people[id] : null })));

export const roster = (org) => Object.values(org.people).filter((p) => !Object.values(org.seats).some((s) => s.includes(p.id)));
export const leadsOrg = (org, serviceId) => {
  const top = topRank(serviceId);
  return top >= 0 && (org.seats[top] ?? []).includes(PLAYER);
};

/** Yearly: turnover opens seats, members fill them, readiness drifts, elections come due. */
export function volunteerOrgTick(ctx, service, member) {
  const { state, rng } = ctx;
  const org = ensureVolunteerOrg(state, service, member);
  for (const p of Object.values(org.people)) p.years += 1;
  // Members leave (moves, burnout, age).
  for (const p of Object.values(org.people)) {
    if (!rng.chance(p.age > 62 ? 0.25 : 0.1)) continue;
    delete org.people[p.id];
    for (const seats of Object.values(org.seats)) { const i = seats.indexOf(p.id); if (i >= 0) seats[i] = null; }
  }
  const size = Object.keys(org.people).length;
  for (let i = size; i < 10 + (org.recruited ?? 0); i++) npc(rng, org, 0, service.ranks);
  org.recruited = Math.max(0, (org.recruited ?? 0) - 2);
  // Empty non-elected seats go to the most senior member below (if you're not ready for it).
  for (const [idx, seats] of Object.entries(org.seats)) {
    for (let i = 0; i < seats.length; i++) {
      if (seats[i] !== null) continue;
      if (Number(idx) === member.rankIndex + 1 && !isElectedRank(service.id, Number(idx)) && rng.chance(0.6)) continue; // held open for you
      const pick = roster(org).filter((p) => p.rankIndex >= Number(idx) - 1).sort((a, b) => b.years - a.years)[0];
      if (pick) { pick.rankIndex = Number(idx); pick.title = service.ranks[idx].title; seats[i] = pick.id; }
    }
  }
  const avgPerf = Object.values(org.people).reduce((s, p) => s + p.performance, 0) / Math.max(1, Object.keys(org.people).length);
  org.readiness = Math.round(clamp(org.readiness * 0.6 + avgPerf * 0.4 + (org.funds > service.trainingBudget ? 3 : -3), 0, 100));
  if (leadsOrg(org, service.id)) {
    org.funds = Math.max(0, org.funds - service.trainingBudget);
    member.xp += 10;
    if (org.readiness < 35 && rng.chance(0.3)) ctx.log(`${org.name} is struggling: too few members show up for calls. The membership is grumbling about leadership.`, service.icon, 'warn');
  }
  // Elections.
  const elected = leadershipOf(service.id).elected;
  if (elected.length && state.character.age >= org.nextElection) {
    org.nextElection = state.character.age + 2;
    const post = [...elected].reverse().find((idx) => member.rankIndex >= idx - 1) ?? null;
    if (post != null && !state.prompts.some((p) => p.type === 'emergency.election')) {
      const incumbentIsYou = (org.seats[post] ?? []).includes(PLAYER);
      ctx.prompt({
        type: 'emergency.election',
        icon: '🗳️',
        title: `${org.name}: Election for ${service.ranks[post].title}`,
        text: incumbentIsYou ? `Your term as ${service.ranks[post].title} is up. The membership votes this month.` : `The membership elects a new ${service.ranks[post].title} this month. Members have asked whether you'll run.`,
        options: [
          { id: 'run', label: incumbentIsYou ? '🗳️ Run for another term' : '🗳️ Run for the post', hint: `About ${Math.round(electionOdds(org, member, post, incumbentIsYou) * 100)}% to win` },
          { id: 'pass', label: incumbentIsYou ? '🙋 Step down' : '🙅 Don\'t run' },
        ],
        data: { serviceId: service.id, post },
      });
    }
  }
  return org;
}

export function electionOdds(org, member, post, incumbent) {
  const people = Object.values(org.people);
  const rel = people.length ? people.reduce((s, p) => s + p.rel, 0) / people.length : 50;
  return clamp(0.3 + (rel - 50) / 80 + Math.min(member.years, 15) * 0.015 + Math.min(member.saves, 20) * 0.006 + (incumbent ? 0.15 + (org.readiness - 55) / 150 : 0) + (member.rankIndex >= post ? 0.05 : 0), 0.05, 0.92);
}

/** Resolve an election: win the seat (and the rank), or someone else does. */
export function resolveElection(ctx, service, member, post, run) {
  const { state, rng } = ctx;
  const org = ensureVolunteerOrg(state, service, member);
  const incumbent = (org.seats[post] ?? []).includes(PLAYER);
  const title = service.ranks[post].title;
  if (run && rng.chance(electionOdds(org, member, post, incumbent))) {
    takeSeat(org, post);
    member.rankIndex = Math.max(member.rankIndex, post);
    member.elected = { post, since: member.elected?.post === post ? member.elected.since : state.character.age };
    ctx.log(incumbent ? `The membership re-elected you ${title} of ${org.name}.` : `You were elected ${title} of ${org.name}!`, '🗳️', 'milestone');
    ctx.toast(`Elected ${title}`, 'good');
    ctx.stat('happiness', 6);
    return true;
  }
  // You lose (or step down): the post goes to another member.
  if (incumbent) {
    const i = org.seats[post].indexOf(PLAYER);
    org.seats[post][i] = null;
    member.rankIndex = Math.max(0, post - 1);
    member.elected = null;
    if (org.seats[post - 1]) seatPlayer(org, post - 1);
  }
  const winner = roster(org).sort((a, b) => b.years - a.years)[0] ?? npc(rng, org, post, service.ranks);
  winner.rankIndex = post;
  winner.title = title;
  const seats = org.seats[post];
  const free = seats.indexOf(null);
  if (free >= 0) seats[free] = winner.id;
  else if (!seats.includes(PLAYER)) seats[0] = winner.id;
  ctx.log(run ? `${winner.name} won the election for ${title}.` : `${winner.name} was elected ${title}.`, '🗳️', run ? 'warn' : 'muted');
  if (run) ctx.stat('happiness', -4);
  return false;
}

/* ------------------------------------------------------------------ */
/* Leading a volunteer organization                                    */
/* ------------------------------------------------------------------ */

function useAction(ctx) {
  if (yearlyCount(ctx.state, 'emergency.lead') >= CHIEF_ACTIONS) {
    ctx.toast(`You've used your ${CHIEF_ACTIONS} leadership actions this year.`, 'warn');
    return false;
  }
  bumpYearly(ctx.state, 'emergency.lead');
  return true;
}

/** Actions for the elected (or appointed) head: arg = `${serviceId}` or `${serviceId}:${memberId}`. */
export function leaderAction(ctx, services, kind, arg) {
  const { state, rng } = ctx;
  const [serviceId, targetId] = String(arg).split(':');
  const service = services[serviceId];
  const member = state.emergency[serviceId];
  if (!service || !member) return;
  const org = ensureVolunteerOrg(state, service, member);
  if (!leadsOrg(org, serviceId)) return ctx.toast(`Only the ${service.ranks[topRank(serviceId)].title} can do that.`, 'warn');
  if (!useAction(ctx)) return;
  if (kind === 'recruit') {
    org.recruited = (org.recruited ?? 0) + rng.int(2, 5);
    for (let i = 0; i < rng.int(2, 4); i++) npc(rng, org, 0, service.ranks);
    ctx.log(`You ran a recruitment drive for ${org.name}: open house, social media and a booth at the county fair.`, '📣', 'good');
  } else if (kind === 'fundraise') {
    const raised = rng.int(4, 15) * 1000;
    org.funds += raised;
    ctx.stat('stress', 2);
    ctx.log(`${rng.pick(['The pancake breakfast', 'The boot drive', 'The gun raffle', 'The chicken barbecue', 'The holiday tree sale'])} raised $${raised.toLocaleString()} for ${org.name}.`, '🥞', 'good');
  } else if (kind === 'grant') {
    if (rng.chance(clamp(0.25 + (state.stats.smarts - 50) / 200, 0.1, 0.6))) {
      const grant = rng.int(40, 300) * 1000;
      org.funds += grant;
      org.readiness = Math.min(100, org.readiness + 8);
      ctx.log(`${org.name} won a $${grant.toLocaleString()} federal ${serviceId === 'fire' ? 'Assistance to Firefighters' : 'preparedness'} grant for new equipment.`, '🏛️', 'good');
      ctx.toast('Grant awarded', 'good');
    } else ctx.log('The federal grant application was turned down this cycle.', '🏛️', 'warn');
  } else {
    const p = org.people[targetId];
    if (!p) return ctx.toast('No such member', 'warn');
    if (kind === 'commend') {
      p.rel = Math.min(100, p.rel + 10);
      p.performance = Math.min(100, p.performance + 4);
      ctx.log(`You recognized ${p.name} at the monthly meeting.`, '🎖️', 'good');
    } else if (kind === 'discipline') {
      p.discipline += 1;
      p.performance = Math.min(100, p.performance + 6);
      p.rel = Math.max(0, p.rel - 12);
      for (const o of Object.values(org.people)) if (o !== p && rng.chance(0.2)) o.rel = Math.max(0, o.rel - 3);
      if (p.discipline >= 3) {
        delete org.people[p.id];
        for (const seats of Object.values(org.seats)) { const i = seats.indexOf(p.id); if (i >= 0) seats[i] = null; }
        ctx.log(`The membership voted to expel ${p.name}.`, '🚪', 'warn');
      } else ctx.log(`You suspended ${p.name} from responding for a month.`, '⚖️', 'warn');
    } else if (kind === 'appoint') {
      const idx = Object.keys(org.seats).map(Number).filter((i) => !isElectedRank(serviceId, i) && i < topRank(serviceId)).find((i) => org.seats[i].includes(null));
      if (idx == null) return ctx.toast('No open officer seat', 'warn');
      org.seats[idx][org.seats[idx].indexOf(null)] = p.id;
      p.rankIndex = idx;
      p.title = service.ranks[idx].title;
      p.rel = Math.min(100, p.rel + 15);
      ctx.log(`You appointed ${p.name} ${p.title}.`, '⭐', 'good');
    }
  }
}
