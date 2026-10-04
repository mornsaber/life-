/**
 * Head posts: running a department or a whole organization.
 *
 * Every organization type names its head and each department's head
 * (OrgTypes). The player can hold any of them:
 *
 *  - Mapped posts: when a head is tied to a career ladder level (a tech
 *    company's CTO is tech.cto, a hospital's Chief Nursing Officer is
 *    nursing.cno, a corporation's CEO is corporate.ceo), reaching that level
 *    makes you the head; the NPC who held it steps down.
 *  - Posts above the ladder: when a head isn't a ladder level (Public Safety
 *    Commissioner, FBI Director, Director of Pharmacy, a COO), whoever holds
 *    it eventually leaves, and the people who choose a successor — the
 *    appointing official, the board, the CEO — may pick you if you're at the
 *    top of that department's ladder. A department head can rise to head of
 *    the organization the same way. Political appointees serve at the
 *    pleasure of whoever appointed them: a new administration may replace
 *    you, and you return to your previous rank. Elected posts (sheriff, DA)
 *    you win at the ballot box instead (politics).
 *  - Executive search: experienced people (and former owners) can apply for
 *    head posts at other organizations — CEOs want a graduate degree such as
 *    an MBA unless you've already been a senior executive.
 *
 * job.headOf = { orgId, deptId|null, title, selection, appointedBy, since, mapped, prev: { title, payAdjust, abilities } | null }
 * org.playerHead / dept.playerHead mark the seat the player holds.
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, prestige } from '../../core/State.js';
import { REGIONS } from '../life/Regions.js';
import { getProfession } from '../career/JobTrees.js';
import { ladderFor, levelById } from '../career/Ladder.js';
import { ORG_TYPES } from './OrgTypes.js';
import { orgOf, orgType, sideRng, personOf, supervises, ensureOrgOfType, ensureHeads } from './Organizations.js';
import { departure } from './Vacancies.js';
import { rememberDeparture } from './Churn.js';

/** Pay premium for a head post that isn't already an executive ladder level. */
export const HEAD_PAY = { dept: 1.2, org: 1.5 };
/** Executive applications per year. */
export const EXEC_APPLICATIONS = 2;

export const postDef = (org, deptId) => {
  const t = orgType(org?.typeId);
  if (!t) return null;
  return deptId ? t.departments.find((d) => d.id === deptId)?.head ?? null : t.head;
};

/** Posts the player can hold: not elected offices and not politics offices (city manager is hired through politics). */
export const promotable = (def) => Boolean(def) && def.selection !== 'elected' && def.selection !== 'owner' && !def.office;

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z]/g, '');

/**
 * Does this job's ladder level *be* the post? Either the org type ties the
 * post to the level, or the level carries the post's exact title (a
 * "Chief Technology Officer" level is the CTO post) — for a department, only
 * if the department employs that career.
 */
export function levelMatchesPost(def, job, occupations = null) {
  if (!def || !promotable(def)) return false;
  if (def.occupation) return def.occupation === job.professionId && def.levelId === job.levelId;
  const level = levelById(getProfession(job.professionId), job.levelId);
  if (!level || norm(level.title) !== norm(def.title)) return false;
  return !occupations || occupations.includes(job.professionId);
}

/** The head post a job's ladder level *is* in this organization (if any). */
export function mappedPostFor(org, job) {
  const t = orgType(org?.typeId);
  if (!t || org.business) return null;
  if (levelMatchesPost(t.head, job)) return { deptId: null };
  const fits = (x) => org.departments[x.id] && levelMatchesPost(x.head, job, x.occupations);
  const d = t.departments.find((x) => x.id === job.employer.deptId && fits(x)) ?? t.departments.find(fits);
  return d ? { deptId: d.id } : null;
}

/** Remove the NPC in a head seat. */
function vacateHead(state, org, deptId, why) {
  const id = deptId ? org.departments[deptId]?.head : org.head;
  const p = personOf(org, id);
  if (p) {
    rememberDeparture(state, org, p, why);
    delete org.people[p.id];
  }
  if (deptId) org.departments[deptId].head = null;
  else org.head = null;
}

/** The player takes a head post. */
export function takePost(ctx, job, org, deptId, { how = 'promoted' } = {}) {
  const { state } = ctx;
  const def = postDef(org, deptId);
  if (!def || !promotable(def)) return false;
  if (job.headOf) leavePost(state, job, { quiet: true });
  vacateHead(state, org, deptId, how === 'external' ? 'was replaced by an outside hire' : 'stepped down');
  if (deptId) org.departments[deptId].playerHead = true;
  else org.playerHead = true;
  const t = orgType(org.typeId);
  const mapped = levelMatchesPost(def, job, deptId ? t.departments.find((d) => d.id === deptId)?.occupations : null);
  job.headOf = { orgId: org.id, deptId: deptId ?? null, title: def.title, selection: def.selection, appointedBy: def.appointedBy ?? null, since: state.character.age, mapped, prev: mapped ? null : { title: job.title, payAdjust: job.payAdjust ?? 1, abilities: [...job.abilities] } };
  if (!mapped) {
    job.title = def.title;
    job.payAdjust = (job.payAdjust ?? 1) * HEAD_PAY[deptId ? 'dept' : 'org'];
    job.abilities = [...new Set([...job.abilities, 'supervise', 'hire', 'budget', 'delegate', 'policy', ...(deptId ? [] : ['exec'])])];
  }
  return true;
}

/** The player leaves a head post (moving on, replaced, demoted). Restores the previous rank for posts above the ladder. */
export function leavePost(state, job, { quiet = false } = {}) {
  const h = job?.headOf;
  if (!h) return;
  const org = orgOf(state, h.orgId);
  if (org) {
    if (h.deptId && org.departments[h.deptId]) org.departments[h.deptId].playerHead = false;
    else if (!h.deptId) org.playerHead = false;
  }
  job.headedBefore = job.headedBefore === 'org' ? 'org' : h.deptId ? 'dept' : 'org';
  if (!h.mapped && h.prev) {
    job.title = h.prev.title;
    job.payAdjust = h.prev.payAdjust;
    job.abilities = h.prev.abilities;
  }
  job.headOf = null;
  return quiet;
}

/** After any change of level: take or leave the post the level maps to. */
export function syncPostForLevel(ctx, job) {
  const org = orgOf(ctx.state, job?.employer);
  if (!org) return;
  if (job.headOf?.mapped) {
    const still = mappedPostFor(org, job);
    if (!still || still.deptId !== job.headOf.deptId) leavePost(ctx.state, job);
  }
  if (job.headOf) return;
  const post = mappedPostFor(org, job);
  if (!post || !promotable(postDef(org, post.deptId))) return;
  const holder = personOf(org, post.deptId ? org.departments[post.deptId]?.head : org.head);
  if (takePost(ctx, job, org, post.deptId) && holder) ctx.log(`You took over from ${holder.name} as ${postDef(org, post.deptId).title}.`, '🏢', 'milestone');
}

/** Is the player at the top of their department's ladder (nothing promotable above)? */
function atTop(job) {
  const profession = getProfession(job.professionId);
  const ladder = ladderFor(profession, job.employer.size);
  const idx = ladder.findIndex((l) => l.id === job.levelId);
  const current = ladder[idx];
  if (!current) return false;
  return !ladder.slice(idx + 1).some((l) => !l.appointed && (supervises(l) || l.abilities.includes('exec')) && l.grade > current.grade);
}

/** The next head post up for the player (or null): their department's head, or — as a department head — the organization's. */
export function nextPost(state, job) {
  const org = orgOf(state, job?.employer);
  if (!org || org.business) return null;
  if (job.headOf?.deptId) {
    const def = postDef(org, null);
    return promotable(def) && !org.playerHead ? { org, deptId: null, def } : null;
  }
  if (job.headOf) return null;
  if (!atTop(job)) return null;
  const def = postDef(org, job.employer.deptId);
  if (!promotable(def) || (def.occupation && def.levelId)) return null; // ladder-mapped posts come by ordinary promotion
  if (org.departments[job.employer.deptId]?.playerHead) return null;
  return { org, deptId: job.employer.deptId, def };
}

const by = (def) => (def.appointedBy ? def.appointedBy : def.selection === 'board' ? 'the board' : 'leadership');

/**
 * Yearly: the head above you may leave; if you're the natural successor you
 * may be offered the post. Board and internal heads can be removed for poor
 * results. (Political replacement is in Government.politicalTurnover.)
 */
export function postTick(ctx, job) {
  const { state } = ctx;
  const org = orgOf(state, job?.employer);
  if (!org || org.business) return;
  const rng = sideRng(state);
  ensureHeads(state, org);
  // Poor results at the top: the board (or your boss) makes a change.
  if (job.headOf && !job.headOf.mapped && job.performance < 35 && job.headOf.selection !== 'appointed' && rng.chance(0.5)) {
    const title = job.headOf.title;
    leavePost(state, job);
    ctx.log(`After a poor year, ${by(postDef(org, job.headOf?.deptId) ?? {})} replaced you as ${title}. You returned to your previous role.`, '⬇️', 'bad');
    return;
  }
  const next = nextPost(state, job);
  if (!next) return;
  const holderId = next.deptId ? org.departments[next.deptId]?.head : org.head;
  const holder = personOf(org, holderId);
  if (!holder) return;
  holder.age += 1;
  const why = departure(rng, holder) ?? (rng.chance(0.06) ? 'moved on' : null);
  if (!why) return;
  vacateHead(state, org, next.deptId, why);
  const chance = clamp(0.2 + (job.performance - 60) / 70 + (job.boss - 50) / 150 + Math.min(0.15, job.yearsAtEmployer * 0.015), 0.05, 0.85);
  if (state.prompts.some((p) => p.type === 'orgs.postOffer') || !rng.chance(chance)) {
    ensureHeads(state, org);
    const successor = personOf(org, next.deptId ? org.departments[next.deptId].head : org.head);
    ctx.log(`${holder.name} ${why}. ${by(next.def)[0].toUpperCase()}${by(next.def).slice(1)} named ${successor?.name ?? 'someone else'} ${next.def.title}.`, '🏢');
    return;
  }
  ctx.prompt({
    type: 'orgs.postOffer',
    icon: '🏢',
    title: `${next.def.title}?`,
    text: `${holder.name} ${why}. ${by(next.def)[0].toUpperCase()}${by(next.def).slice(1)} wants you to take over as ${next.def.title} of ${next.deptId ? org.departments[next.deptId].name : org.name}.${next.def.selection === 'appointed' ? ' It\'s a political appointment: a new administration could replace you (you\'d return to your current rank).' : ''}`,
    options: [
      { id: 'accept', label: `🏢 Accept — become ${next.def.title}` },
      { id: 'decline', label: '🙅 Stay where you are' },
    ],
    data: { orgId: org.id, deptId: next.deptId ?? null },
  });
}

/* ------------------------------------------------------------------ */
/* Executive search                                                    */
/* ------------------------------------------------------------------ */

const GRAD = ['master', 'professional', 'doctorate', 'phd'];
export const hasMba = (state) => state.education.degrees.some((d) => d.programId === 'mba');
export const hasGraduateDegree = (state) => state.education.degrees.some((d) => GRAD.includes(d.type) || ['mba', 'jd', 'md', 'mpa', 'phd'].includes(d.programId));

/** Your executive résumé. */
export function executiveRecord(state) {
  const jobs = state.career.history;
  const job = state.career.job;
  const years = jobs.reduce((s, h) => s + Math.max(0, h.endAge - h.startAge), 0) + (job ? Math.max(0, state.character.age - job.startAge) : 0);
  const peakGrade = Math.max(0, ...jobs.map((h) => h.peakGrade ?? 0), job?.peakGrade ?? 0, job?.grade ?? 0);
  // Heads you actually held (a 'Director' title alone doesn't count).
  const headed = jobs.some((h) => h.headed) || Boolean(job?.headOf || job?.headedBefore);
  const ranOrg = jobs.some((h) => h.headed === 'org') || job?.headedBefore === 'org' || (job?.headOf && !job.headOf.deptId);
  const owned = (state.business?.history ?? []).concat(state.business?.current ? [{ ...state.business.current, role: state.business.current.role, peakStaff: state.business.current.staff.headcount }] : []);
  const ownerYears = owned.filter((b) => b.role === 'operator').reduce((s, b) => s + (b.years ?? 0), 0);
  const ownerScale = Math.max(0, ...owned.map((b) => b.peakStaff ?? b.staff?.headcount ?? 0));
  const field = (ids) => jobs.filter((h) => ids.includes(h.professionId)).reduce((s, h) => s + Math.max(0, h.endAge - h.startAge), 0) + (job && ids.includes(job.professionId) ? Math.max(0, state.character.age - job.startAge) : 0);
  return { years, peakGrade, headed, ranOrg, ownerYears, ownerScale, field, mba: hasMba(state), graduate: hasGraduateDegree(state) };
}

/** Can you be considered for this post? { ok, reason }. */
export function executiveEligibility(state, listing) {
  const r = executiveRecord(state);
  const ceo = !listing.deptId;
  const ledThings = r.peakGrade >= 6 || r.headed || (r.ownerYears >= 5 && r.ownerScale >= 8);
  if (!ledThings) return { ok: false, reason: 'Needs management experience (a management post, or 5+ years running a business with staff)' };
  if (r.years < (ceo ? 15 : 10)) return { ok: false, reason: `Needs ${ceo ? 15 : 10}+ years of work experience` };
  if (!ceo && r.field(listing.occupations) < 6) return { ok: false, reason: `Needs 6+ years in the field (${listing.occupations.map((o) => getProfession(o)?.name ?? o).join(' / ')})` };
  if (ceo && !r.graduate && r.peakGrade < 9 && !r.ranOrg && r.ownerScale < 50) return { ok: false, reason: 'Boards want an MBA or other graduate degree — or a record running an organization' };
  const level = levelById(getProfession(listing.professionId), listing.levelId);
  if (!level) return { ok: false, reason: 'No such post' };
  return { ok: true };
}

/** The ladder level a head hire sits on: the mapped level, or the top executive level of the field. */
function levelForPost(def, professionId, size) {
  if (def.occupation === professionId && def.levelId) return def.levelId;
  const ladder = ladderFor(getProfession(professionId), size);
  const top = [...ladder].reverse().find((l) => !l.appointed && (l.abilities.includes('exec') || supervises(l)));
  return (top ?? ladder.at(-1)).id;
}

/** This year's executive openings near you (state.career.execSearch, refreshed yearly on the side stream). */
export function refreshExecutiveSearch(state) {
  if (state.character.age < 30) return;
  const search = state.career.execSearch;
  if (search?.age === state.character.age) return;
  const rng = sideRng(state);
  const region = state.character.regionId;
  const types = Object.entries(ORG_TYPES).filter(([, t]) => t.scope !== 'nation' || rng.chance(0.3));
  const listings = [];
  for (let i = 0; i < 12 && listings.length < 5; i++) {
    const [typeId, t] = rng.pick(types);
    const deptPick = rng.chance(0.4) ? null : rng.pick(t.departments);
    const def = deptPick ? deptPick.head : t.head;
    if (!promotable(def)) continue;
    const org = ensureOrgOfType(state, typeId, region, { size: 'large' });
    if (!org || org.playerHead) continue;
    const occupations = deptPick ? deptPick.occupations : [...new Set(t.departments.flatMap((d) => d.occupations))];
    // CEOs of private firms come from the business side unless the head is tied to a field's ladder.
    const professionId = def.occupation ?? (deptPick ? deptPick.occupations[0] : t.sector === 'private' ? 'corporate' : t.departments[0].occupations[0]);
    if (!getProfession(professionId)) continue;
    const id = `${org.id}|${deptPick?.id ?? '-'}`;
    if (listings.some((l) => l.id === id)) continue;
    listings.push({ id, orgId: org.id, orgName: org.name, deptId: deptPick?.id ?? null, deptName: deptPick?.name ?? null, title: def.title, selection: def.selection, appointedBy: def.appointedBy ?? null, sector: t.sector, occupations, professionId, levelId: levelForPost(def, professionId, 'large') });
  }
  state.career.execSearch = { age: state.character.age, listings };
}

/** Odds a search committee picks you. */
export function executiveOdds(state, listing) {
  const r = executiveRecord(state);
  let p = 0.12 + Math.min(0.15, (r.years - 10) * 0.01) + Math.max(0, r.peakGrade - 6) * 0.04 + (r.headed ? 0.1 : 0) + (r.mba ? 0.08 : r.graduate ? 0.04 : 0) + Math.min(0.08, r.ownerYears * 0.01) + Math.min(0.06, prestige(state) / 800) + (state.stats.smarts - 50) / 400;
  if (listing.selection === 'appointed') p *= 0.6; // appointments go to people the appointing official knows
  if (listing.deptId) p += 0.05;
  return clamp(p, 0.03, 0.7);
}

export const ExecutiveActions = {
  /** arg: listing id — apply for an executive opening elsewhere. */
  applyExec(ctx, id) {
    const { state, rng } = ctx;
    const listing = state.career.execSearch?.listings.find((l) => l.id === id);
    if (!listing) return;
    const e = executiveEligibility(state, listing);
    if (!e.ok) return ctx.toast(e.reason, 'warn');
    if (yearlyCount(state, 'orgs.applyExec') >= EXEC_APPLICATIONS) return ctx.toast(`${EXEC_APPLICATIONS} executive searches a year.`, 'warn');
    bumpYearly(state, 'orgs.applyExec');
    state.career.execSearch.listings = state.career.execSearch.listings.filter((l) => l !== listing);
    if (!rng.chance(executiveOdds(state, listing))) {
      ctx.log(`The search committee for ${listing.title} at ${listing.orgName} chose another candidate.`, '📭', 'warn');
      return ctx.toast('Not selected', 'warn');
    }
    ctx.prompt({
      type: 'orgs.execOffer',
      icon: '👔',
      title: `Offer: ${listing.title}`,
      text: `${listing.orgName} wants you as ${listing.title}${listing.deptName ? ` (${listing.deptName})` : ''}.${listing.selection === 'appointed' ? ` It's an appointment by ${listing.appointedBy} — a new administration could replace you.` : ''}${state.career.job ? `\nAccepting means leaving your job as ${state.career.job.title}.` : ''}`,
      options: [{ id: 'accept', label: '✍️ Accept' }, { id: 'decline', label: '🙅 Decline' }],
      data: { listing },
    });
    return undefined;
  },
};

/** Resolvers need the career engine (hire); BusinessEngine-style late binding keeps imports acyclic. */
export function executiveResolvers({ hire, recalcSalary, employerAt, ensureDepartment }) {
  return {
    postOffer(ctx, data, optionId) {
      const { state } = ctx;
      const job = state.career.job;
      const org = orgOf(state, data.orgId);
      if (!job || !org || optionId !== 'accept' || job.employer.orgId !== org.id) {
        if (org) ensureHeads(state, org);
        return;
      }
      takePost(ctx, job, org, data.deptId, { how: 'appointed' });
      ensureDepartment(job, { abilities: job.abilities, reports: data.deptId ? 12 : 25 });
      recalcSalary(state, job);
      ctx.log(`You were named ${job.headOf.title}${data.deptId ? ` of ${org.departments[data.deptId].name}` : ` of ${org.name}`}. $${job.salary.toLocaleString()}/yr.`, '🏢', 'milestone');
      ctx.toast(job.headOf.title, 'good');
      ctx.stat('happiness', 10);
    },
    execOffer(ctx, data, optionId) {
      const { state } = ctx;
      if (optionId !== 'accept') return;
      const l = data.listing;
      const org = orgOf(state, l.orgId);
      const profession = getProfession(l.professionId);
      if (!org || !profession) return;
      if (org.regionId && org.regionId !== state.character.regionId && REGIONS[org.regionId]) ctx.emit('region:relocate', { regionId: org.regionId, reason: `You moved to take the job as ${l.title}.` });
      const employer = employerAt(ctx, org.id, profession);
      employer.size = 'large';
      if (l.deptId) Object.assign(employer, { deptId: l.deptId, deptName: org.departments[l.deptId]?.name ?? l.deptName });
      hire(ctx, { professionId: profession.id, levelId: l.levelId, employer });
      const job = state.career.job;
      if (!job) return;
      job.probationLeft = 0;
      if (!job.headOf) takePost(ctx, job, org, l.deptId, { how: 'external' });
      ensureDepartment(job, { abilities: job.abilities, reports: l.deptId ? 12 : 25 });
      recalcSalary(state, job);
      ctx.log(`You joined ${org.name} as ${job.headOf?.title ?? job.title}: $${job.salary.toLocaleString()}/yr.`, '👔', 'milestone');
    },
  };
}
