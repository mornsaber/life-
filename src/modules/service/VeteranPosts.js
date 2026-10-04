/**
 * Veterans service organizations: the local VFW and American Legion posts.
 * Each post is an organization with a roster of veterans and officers
 * elected every year: adjutant and quartermaster, junior and senior vice
 * commander, then post commander. Members volunteer (fish fries, poppy
 * drives, funeral honor guards, helping younger veterans with VA claims);
 * the commander raises money, funds scholarships and speaks for local
 * veterans, which earns name recognition in local politics.
 *
 * VFW membership needs an overseas campaign or combat deployment; the
 * Legion takes any veteran who served honorably (and those still serving).
 *
 * state.service.posts[id] = { orgId, rankIndex, years, standing, joinedAge }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, randomName } from '../../core/State.js';
import { sideRng, initOrgs } from '../org/Organizations.js';

export const PLAYER = 'PLAYER';
export const POST_RANKS = ['Member', 'Post Adjutant', 'Junior Vice Commander', 'Senior Vice Commander', 'Post Commander'];
const SEATS = { 1: 2, 2: 1, 3: 1, 4: 1 };

export const POSTS = {
  vfw: { name: 'Veterans of Foreign Wars', short: 'VFW', icon: '🎖️', dues: 50, needs: 'An overseas or combat deployment' },
  legion: { name: 'American Legion', short: 'Legion', icon: '🇺🇸', dues: 45, needs: 'Honorable service' },
};

const honorable = (h) => !['dishonorable', 'bcd', 'oth'].includes(h.discharge);

export function postEligibility(state, id) {
  if (!POSTS[id]) return { ok: false, reason: 'Unknown post' };
  if (state.service.posts[id]) return { ok: false, reason: 'Already a member' };
  const svc = state.military.service;
  const record = state.military.history.filter(honorable);
  if (!record.length && !svc) return { ok: false, reason: 'Veterans and service members only' };
  if (id === 'vfw' && !record.some((h) => h.deployments > 0) && !(svc?.deployments > 0)) return { ok: false, reason: POSTS.vfw.needs };
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  return { ok: true };
}

function veteran(rng, org, rankIndex) {
  const gender = rng.pick(['male', 'male', 'male', 'female']);
  const n = randomName(rng, gender);
  const era = rng.pick([['Vietnam', 72, 82], ['Gulf War', 52, 62], ['Iraq', 36, 50], ['Afghanistan', 30, 45], ['Korea DMZ', 40, 70]]);
  const p = { id: rng.id('vet_'), name: `${n.firstName} ${n.lastName}`, gender, age: rng.int(era[1], era[2]), era: era[0], rankIndex, title: POST_RANKS[rankIndex], years: rng.int(1, 30), rel: rng.int(35, 70), performance: rng.int(40, 80) };
  org.people[p.id] = p;
  return p;
}

export function ensurePostOrg(state, id) {
  initOrgs(state);
  const regionId = state.character.regionId;
  const key = `post:${id}:${regionId}`;
  let org = state.orgs.byId[key];
  if (!org) {
    const rng = sideRng(state);
    org = { id: key, typeId: `post:${id}`, veteranPost: true, name: `${id === 'vfw' ? 'VFW Post' : 'American Legion Post'} ${rng.int(12, 9800)}`, regionId, people: {}, departments: {}, head: null, seats: {}, funds: rng.int(8, 40) * 1000, members: rng.int(80, 400), nextElection: state.character.age + 1 };
    for (let i = 0; i < rng.int(10, 18); i++) veteran(rng, org, 0);
    for (const [idx, n] of Object.entries(SEATS)) org.seats[idx] = Array.from({ length: n }, () => veteran(rng, org, Number(idx)).id);
    state.orgs.byId[key] = org;
  }
  return org;
}

export function joinPost(ctx, id) {
  const { state } = ctx;
  const check = postEligibility(state, id);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  const org = ensurePostOrg(state, id);
  state.service.posts[id] = { orgId: org.id, rankIndex: 0, years: 0, standing: 20, joinedAge: state.character.age };
  ctx.spend(POSTS[id].dues, `${POSTS[id].short} dues`);
  ctx.log(`You joined ${org.name}. The bartender knew your unit before you finished your first beer.`, POSTS[id].icon, 'milestone');
}

function release(org) {
  for (const seats of Object.values(org.seats)) { const i = seats.indexOf(PLAYER); if (i >= 0) seats[i] = null; }
}

export function leavePost(ctx, id, reason) {
  const { state } = ctx;
  const m = state.service.posts[id];
  if (!m) return;
  const org = state.orgs?.byId?.[m.orgId];
  if (org) release(org);
  state.service.history.push({ kind: id, name: org?.name ?? POSTS[id].name, title: POST_RANKS[m.rankIndex], years: m.years, endAge: state.character.age, reason });
  state.service.posts[id] = null;
  ctx.log(`You left ${org?.name ?? POSTS[id].name}. ${reason}.`, POSTS[id].icon);
}

export const postLeader = (org) => (org?.seats[4] ?? []).includes(PLAYER);

export function postsTick(ctx) {
  const { state, rng } = ctx;
  for (const [id, m] of Object.entries(state.service.posts)) {
    if (!m) continue;
    const org = state.orgs.byId[m.orgId];
    if (!org) { state.service.posts[id] = null; continue; }
    if (org.regionId !== state.character.regionId) { leavePost(ctx, id, 'Moved away (transferred to a post near your new home)'); continue; }
    m.years += 1;
    ctx.spend(POSTS[id].dues, `${POSTS[id].short} dues`);
    m.standing = Math.max(0, m.standing - 3);
    // Turnover among aging members.
    for (const p of Object.values(org.people)) {
      p.age += 1;
      if (rng.chance(p.age > 75 ? 0.18 : 0.06)) {
        delete org.people[p.id];
        for (const seats of Object.values(org.seats)) { const i = seats.indexOf(p.id); if (i >= 0) seats[i] = null; }
      }
    }
    while (Object.keys(org.people).length < 10) veteran(rng, org, 0);
    if (postLeader(org)) {
      state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + 3);
      org.members = Math.max(40, org.members + rng.int(-15, 10) + Math.round((org.funds - 20000) / 5000));
    }
    if (state.character.age >= org.nextElection) postElection(ctx, id, m, org);
  }
}

/** Annual officer elections: you run for the next chair up (or to keep yours). */
function postElection(ctx, id, m, org) {
  const { state, rng } = ctx;
  org.nextElection = state.character.age + 1;
  // NPCs move up the chairs.
  for (let idx = 4; idx >= 1; idx--) {
    for (let i = 0; i < org.seats[idx].length; i++) {
      if (org.seats[idx][i] === PLAYER) continue;
      if (org.seats[idx][i] && !rng.chance(0.35)) continue;
      const below = idx > 1 ? org.seats[idx - 1].find((x) => x && x !== PLAYER) : Object.values(org.people).filter((p) => p.rankIndex === 0).sort((a, b) => b.years - a.years)[0]?.id;
      if (!below) continue;
      if (org.seats[idx][i] && org.people[org.seats[idx][i]]) org.people[org.seats[idx][i]].rankIndex = 0;
      if (idx > 1) org.seats[idx - 1][org.seats[idx - 1].indexOf(below)] = null;
      org.seats[idx][i] = below;
      org.people[below].rankIndex = idx;
      org.people[below].title = POST_RANKS[idx];
    }
  }
  const target = Math.min(4, m.rankIndex + (m.rankIndex === 4 ? 0 : 1));
  if (m.years < 1 || state.prompts.some((p) => p.type === 'service.postElection')) return;
  ctx.prompt({
    type: 'service.postElection', icon: POSTS[id].icon,
    title: `${org.name}: Officer Elections`,
    text: m.rankIndex === 4 ? 'Your year as Post Commander is up. Members are asking if you\'ll serve another.' : `The nominating committee asked if you'd stand for ${POST_RANKS[target]}.`,
    options: [
      { id: 'run', label: `🗳️ Stand for ${POST_RANKS[target]}`, hint: `About ${Math.round(postOdds(m, target) * 100)}%` },
      { id: 'pass', label: m.rankIndex ? '🙋 Step back to the membership' : '🙅 Not this year' },
    ],
    data: { id, target },
  });
}

const postOdds = (m, target) => clamp(0.35 + m.standing / 150 + Math.min(m.years, 10) * 0.02 - (target - m.rankIndex) * 0.05, 0.1, 0.92);

function useAction(ctx) {
  if (yearlyCount(ctx.state, 'service.post') >= 3) { ctx.toast('You\'ve done enough at the post this year.', 'warn'); return false; }
  bumpYearly(ctx.state, 'service.post');
  return true;
}

export const PostActions = {
  joinPost: (ctx, id) => joinPost(ctx, id),
  leavePost: (ctx, id) => leavePost(ctx, id, 'Let your membership lapse'),
  /** arg = `${postId}:${activity}` */
  postActivity(ctx, arg) {
    const { state, rng } = ctx;
    const [id, kind] = String(arg).split(':');
    const m = state.service.posts[id];
    const org = m && state.orgs.byId[m.orgId];
    if (!org) return;
    const leaderOnly = ['fundraise', 'scholarship', 'advocate'];
    if (leaderOnly.includes(kind) && !postLeader(org)) return ctx.toast('Only the Post Commander can do that', 'warn');
    if (!useAction(ctx)) return;
    if (kind === 'volunteer') {
      m.standing += 8;
      ctx.stat('happiness', 3);
      ctx.log(rng.pick(['You worked the Friday fish fry.', 'You ran the Buddy Poppy drive outside the grocery store.', 'You called bingo on Tuesday night.', 'You helped place flags on graves for Memorial Day.']), POSTS[id].icon);
    } else if (kind === 'honorGuard') {
      m.standing += 10;
      ctx.stat('happiness', 2);
      ctx.log('You stood with the post honor guard at a veteran\'s funeral. Taps, then the flag folded for the family.', '🎺');
    } else if (kind === 'mentor') {
      m.standing += 6;
      ctx.stat('happiness', 4);
      ctx.log(`You helped a younger ${rng.pick(['Marine', 'soldier', 'sailor', 'airman'])} file a VA disability claim that had been stuck for a year.`, '📋', 'good');
    } else if (kind === 'fundraise') {
      const raised = rng.int(5, 25) * 1000;
      org.funds += raised;
      ctx.log(`The post's ${rng.pick(['golf outing', 'Veterans Day dinner', 'motorcycle poker run', 'raffle'])} raised $${raised.toLocaleString()}.`, '💵', 'good');
    } else if (kind === 'scholarship') {
      if (org.funds < 5000) return ctx.toast('The post can\'t afford it this year', 'warn');
      org.funds -= 5000;
      state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + 3);
      ctx.log('The post funded a $5,000 scholarship for a local senior headed to college. Your photo ran in the paper.', '🎓', 'good');
    } else if (kind === 'advocate') {
      state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + 5);
      ctx.stat('stress', 2);
      ctx.log(`You testified at the ${rng.pick(['state capitol', 'county board', 'city council'])} for veterans' property-tax relief.`, '🏛️', 'good');
    }
  },
};

export const PostResolvers = {
  postElection(ctx, data, optionId) {
    const { state, rng } = ctx;
    const m = state.service.posts[data.id];
    const org = m && state.orgs.byId[m.orgId];
    if (!org) return;
    if (optionId !== 'run') {
      if (m.rankIndex) { release(org); m.rankIndex = 0; ctx.log('You stepped back to the membership after your year in the chairs.', POSTS[data.id].icon); }
      return;
    }
    if (!rng.chance(postOdds(m, data.target))) return ctx.log(`Another member won the vote for ${POST_RANKS[data.target]}.`, '🗳️', 'warn');
    release(org);
    const seats = org.seats[data.target];
    const i = seats.indexOf(null) >= 0 ? seats.indexOf(null) : 0;
    if (seats[i] && org.people[seats[i]]) org.people[seats[i]].rankIndex = 0;
    seats[i] = PLAYER;
    m.rankIndex = data.target;
    m.standing += 5;
    ctx.log(`You were elected ${POST_RANKS[data.target]} of ${org.name}.`, '🗳️', 'milestone');
    if (data.target === 4) ctx.toast('Elected Post Commander', 'good');
  },
};
