/**
 * Government organizations answer to politics.
 *
 * Every public organization and department head says how they got the job
 * (OrgTypes: selection 'elected' | 'appointed' | 'board'). Here that wiring
 * becomes real:
 *
 *  - Administrations change. Elected heads (sheriffs, district attorneys,
 *    commission chairs) face the voters every four years; when a mayor,
 *    governor or president changes, many of their appointees are replaced.
 *    If one of them sits in your chain of command, you get a new boss.
 *  - If YOU hold the office, you hold the power: a mayor appoints the public
 *    safety commissioner, a governor the state secretaries, a county
 *    commissioner the health director, a school board member votes on the
 *    superintendent, a council member on the city manager. Pick a career
 *    professional, a loyalist or a reformer — the department's performance
 *    follows, and so does your approval.
 *  - If you're the elected sheriff or DA, you are the head of that office.
 *
 * org.performance (0–100) tracks how well a government organization is run.
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { OFFICES } from '../politics/Offices.js';
import { orgOf, orgType, sideRng, newPerson, personOf, initOrgs, ensureOrgOfType } from './Organizations.js';
import { ORG_TYPES } from './OrgTypes.js';
import { getProfession } from '../career/JobTrees.js';
import { REGIONS } from '../life/Regions.js';

/** Which elected office holds the power behind an "appointed by …" phrase. */
export const APPOINTING_OFFICE = {
  'the mayor': 'mayor',
  'the governor': 'governor',
  'the city council': 'cityCouncil',
  'the county commission': 'countyCommissioner',
  'the school board': 'schoolBoard',
  'the city manager': 'cityManager',
};

/** How each office's jurisdiction is matched to an organization. */
const JURISDICTION = { mayor: 'region', cityCouncil: 'region', countyCommissioner: 'region', schoolBoard: 'region', cityManager: 'region', governor: 'state', sheriff: 'region', districtAttorney: 'region' };

export const APPOINTEE_KINDS = {
  professional: { label: '🏅 A career professional', perf: 8, approval: 1, hint: 'Best results, no political payoff' },
  loyalist: { label: '🤝 A loyal political ally', perf: -6, approval: 3, hint: 'Your coalition is pleased; the work may suffer' },
  reformer: { label: '🧹 An outside reformer', perf: 4, approval: -1, hint: 'Shakes things up; the rank and file push back' },
};

const OVERSIGHT_PER_YEAR = 2;

function inJurisdiction(state, org, officeId) {
  const scope = JURISDICTION[officeId];
  if (scope === 'region') return org.regionId === state.character.regionId;
  if (scope === 'state') return org.scope === 'state' && org.stateId === (REGIONS[state.character.regionId] ?? REGIONS.midcity).state;
  return false;
}

/** The posts the player's office appoints: [{ org, deptId|null, title, holder }]. */
export function appointmentsInReach(state, { ensure = true } = {}) {
  const officeId = state.politics?.office?.id;
  if (!officeId) return [];
  if (ensure) ensureJurisdictionOrgs(state, officeId);
  const out = [];
  for (const org of Object.values(state.orgs?.byId ?? {})) {
    if (!inJurisdiction(state, org, officeId)) continue;
    const t = orgType(org.typeId);
    if (!t) continue;
    if (APPOINTING_OFFICE[t.head.appointedBy] === officeId) out.push({ org, deptId: null, title: t.head.title, holder: personOf(org, org.head) });
    for (const d of t.departments) {
      if (APPOINTING_OFFICE[d.head.appointedBy] === officeId) out.push({ org, deptId: d.id, title: d.head.title, holder: personOf(org, org.departments[d.id]?.head) });
    }
  }
  return out;
}

/** Make sure the governments you run exist even if you never worked for them. */
function ensureJurisdictionOrgs(state, officeId) {
  initOrgs(state);
  const scope = JURISDICTION[officeId];
  for (const [typeId, t] of Object.entries(ORG_TYPES)) {
    if (t.scope !== scope) continue;
    const appoints = [t.head, ...t.departments.map((d) => d.head)].some((h) => APPOINTING_OFFICE[h.appointedBy] === officeId);
    if (appoints) ensureOrgOfType(state, typeId, state.character.regionId);
  }
}

/** Elected department heads the player personally holds (sheriff, DA). */
export function officeHeld(state, org, deptId) {
  const officeId = state.politics?.office?.id;
  const t = orgType(org.typeId);
  const head = deptId ? t?.departments.find((d) => d.id === deptId)?.head : t?.head;
  return Boolean(officeId && head?.office === officeId && inJurisdiction(state, org, officeId));
}

/**
 * Yearly, for the organization you work in: elections and changes of
 * administration replace heads. Returns log lines about your chain.
 */
export function politicalTurnover(ctx, job) {
  const { state } = ctx;
  const org = orgOf(state, job?.employer);
  if (!org || org.sector === 'private') return;
  const t = orgType(org.typeId);
  if (!t) return;
  const rng = sideRng(state);
  org.adminSince ??= state.character.age - rng.int(0, 3);
  org.performance ??= rng.int(40, 70);
  // A four-year cycle: elections for elected heads, a possible new administration for appointed ones.
  if ((state.character.age - org.adminSince) % 4 !== 0 || state.character.age === org.adminSince) return;
  const newAdministration = rng.chance(0.4);
  const replace = (current, head, deptId) => {
    if (officeHeld(state, org, deptId)) return current;
    const losesElection = head.selection === 'elected' && rng.chance(0.25);
    const swept = head.selection === 'appointed' && newAdministration && rng.chance(0.55);
    if (!losesElection && !swept) return current;
    const old = personOf(org, current);
    const p = newPerson(rng, org, { title: head.title, selection: head.selection, deptId, age: rng.int(42, 64), years: 0 });
    if (old) delete org.people[old.id];
    const mine = deptId === job.employer.deptId || deptId === null;
    if (mine) ctx.log(losesElection ? `${old?.name ?? 'The incumbent'} lost the election. ${p.name} is the new ${head.title}.` : `The new administration replaced ${old?.name ?? 'the incumbent'} with ${p.name} as ${head.title}.`, '🏛️');
    return p.id;
  };
  org.head = replace(org.head, t.head, null);
  for (const d of t.departments) if (org.departments[d.id]) org.departments[d.id].head = replace(org.departments[d.id].head, d.head, d.id);
}

/** Your appointees' performance moves your approval each year in office. */
export function oversightTick(ctx) {
  const { state } = ctx;
  const o = state.politics?.office;
  if (!o) return;
  const posts = appointmentsInReach(state).filter((a) => a.holder?.appointedByPlayer);
  if (!posts.length) return;
  const avg = posts.reduce((s, a) => s + (a.org.performance ?? 50), 0) / posts.length;
  o.approval = Math.round(clamp(o.approval + (avg - 55) / 8, 0, 100));
}

export const GovernmentActions = {
  /** arg: 'orgId|deptId|kind' (deptId '-' for the organization head) */
  appoint(ctx, arg) {
    const { state } = ctx;
    const [orgId, deptKey, kind] = String(arg).split('|');
    const choice = APPOINTEE_KINDS[kind];
    const post = appointmentsInReach(state).find((a) => a.org.id === orgId && (a.deptId ?? '-') === deptKey);
    if (!post || !choice) return;
    if (yearlyCount(state, 'orgs.appoint') >= OVERSIGHT_PER_YEAR) return ctx.toast(`${OVERSIGHT_PER_YEAR} appointments per year.`, 'warn');
    bumpYearly(state, 'orgs.appoint');
    const org = post.org;
    const rng = sideRng(state);
    const p = newPerson(rng, org, { title: post.title, selection: 'appointed', deptId: post.deptId, age: rng.int(40, 62), years: 0, appointedByPlayer: kind });
    if (post.holder) delete org.people[post.holder.id];
    if (post.deptId) org.departments[post.deptId].head = p.id;
    else org.head = p.id;
    org.performance = Math.round(clamp((org.performance ?? 55) + choice.perf, 0, 100));
    state.politics.office.approval = Math.round(clamp(state.politics.office.approval + choice.approval, 0, 100));
    ctx.log(`You appointed ${p.name} as ${post.title} (${org.name}) — ${choice.label.replace(/^\S+\s+/, '').toLowerCase()}.${post.holder ? ` ${post.holder.name} is out.` : ''}`, '⭐', 'milestone');
    // If you also work there, the rank and file react.
    const job = state.career.job;
    if (job?.employer?.orgId === org.id && job.department) job.department.morale = Math.round(clamp(job.department.morale + (kind === 'reformer' ? -6 : kind === 'professional' ? 3 : -2), 0, 100));
  },
};

export { OFFICES };
