/**
 * Designing your company's organisation: the units it has, what its posts are called, and
 * the named posts you add.
 *
 *   Units    Beyond the departments a business grows on its own, create your own units
 *            (a marketing team, a night shift, a training unit) staffed by one of the
 *            business's occupations. Move staff into them, rename them, or close them
 *            (their people go back to the main department).
 *   Titles   Rename any rung ("Sales Associate" → "Style Advisor") or a unit's head
 *            ("Manager" → "Head of Growth"). New hires on that rung get the new title.
 *   Posts    Add a named post in a unit (Head of Marketing, Executive Chef): a new hire,
 *            on the payroll. Remove it and they're let go.
 *
 * Design changes use the year's organisation-design budget (four changes a year).
 *
 * org.departments[id] = { …, custom: true, occupation, headTitle }   your units
 * org.titles = { 'deptId|levelId' | 'deptId|head': title }           renamed posts
 */
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { currentBusiness, typeOf } from './Business.js';
import { businessOrg, syncBusinessOrg } from '../org/Businesses.js';
import { personOf, sideRng, newPerson, orgType } from '../org/Organizations.js';
import { getProfession } from '../career/JobTrees.js';

export const DESIGN_CHANGES = 4;
const clean = (s, max = 40) => String(s ?? '').replace(/[|:<>]/g, '').trim().slice(0, max);

/** Occupations a unit of this business can be staffed with. */
export function unitOccupations(state, biz) {
  const t = orgType(businessOrg(state, biz)?.typeId);
  return [...new Set((t?.departments ?? []).flatMap((d) => d.occupations))].filter((id) => getProfession(id));
}
/** How many units of your own the business can carry. */
export const unitLimit = (biz) => (biz.staff.headcount < 5 ? 0 : 1 + Math.floor(biz.staff.headcount / 10));
export const customUnits = (org) => Object.values(org?.departments ?? {}).filter((d) => d.custom);
const primaryOf = (org) => Object.values(org.departments).find((d) => !d.branch && !d.custom);

/** Staff not already assigned to a particular unit (who can be moved). */
export function movableStaff(biz) {
  const extra = biz.staff.extra ?? {};
  return Math.max(0, biz.staff.headcount - Object.values(extra).reduce((a, b) => a + b, 0) - 1);
}

/** Apply renamed posts to the people who hold them. */
export function applyTitles(org) {
  const titles = org?.titles;
  if (!titles) return;
  for (const p of Object.values(org.people)) {
    if (p.post) continue;
    const dept = org.departments[p.deptId];
    const t = dept?.head === p.id ? titles[`${p.deptId}|head`] : titles[`${p.deptId}|${p.levelId}`];
    if (t) p.title = t;
  }
}

function designCheck(ctx) {
  const biz = currentBusiness(ctx.state);
  if (!biz) { ctx.toast('No business', 'warn'); return null; }
  const org = businessOrg(ctx.state, biz);
  if (!org) { ctx.toast('Your business has no organisation yet', 'warn'); return null; }
  if (yearlyCount(ctx.state, 'business.orgDesign') >= DESIGN_CHANGES) { ctx.toast(`You've made your ${DESIGN_CHANGES} organisation changes this year.`, 'warn'); return null; }
  return { biz, org };
}
const used = (ctx) => bumpYearly(ctx.state, 'business.orgDesign');

export const OrgDesignActions = {
  /** arg: 'name:occupation' */
  createUnit(ctx, arg) {
    const d = designCheck(ctx);
    if (!d) return;
    const { biz, org } = d;
    const [rawName, occupation] = String(arg ?? '').split(':');
    const name = clean(rawName);
    if (!name) return ctx.toast('Give the unit a name', 'warn');
    if (customUnits(org).length >= unitLimit(biz)) return ctx.toast(unitLimit(biz) ? `With ${biz.staff.headcount} staff you can run ${unitLimit(biz)} unit${unitLimit(biz) === 1 ? '' : 's'} of your own` : 'You need 5+ staff to create units', 'warn');
    const occ = unitOccupations(ctx.state, biz).includes(occupation) ? occupation : unitOccupations(ctx.state, biz)[0];
    const id = `u${Object.keys(org.departments).length}_${Math.round(ctx.state.character.age)}`;
    org.departments[id] = { id, name, head: null, headcount: 0, seats: {}, custom: true, occupation: occ, headTitle: `Head of ${name}` };
    used(ctx);
    return ctx.log(`You set up a new unit: ${name}. Move staff into it to get it working.`, '🧩', 'good');
  },
  /** arg: 'deptId:n' — move n staff into a unit. */
  assignStaff(ctx, arg) {
    const d = designCheck(ctx);
    if (!d) return;
    const { biz, org } = d;
    const [deptId, nRaw] = String(arg ?? '').split(':');
    const unit = org.departments[deptId];
    const n = Math.max(1, Math.round(Number(nRaw) || 1));
    if (!unit?.custom) return ctx.toast('Pick one of your units', 'warn');
    const free = movableStaff(biz);
    if (!free) return ctx.toast('Everyone is already assigned — hire more first', 'warn');
    const k = Math.min(n, free);
    biz.staff.extra ??= {};
    biz.staff.extra[deptId] = (biz.staff.extra[deptId] ?? 0) + k;
    syncBusinessOrg(ctx.state, biz);
    applyTitles(org);
    used(ctx);
    return ctx.log(`${k} staff moved into ${unit.name}.`, '🔀', 'info');
  },
  /** arg: 'deptId:name' */
  renameUnit(ctx, arg) {
    const d = designCheck(ctx);
    if (!d) return;
    const [deptId, rawName] = String(arg ?? '').split(':');
    const unit = d.org.departments[deptId];
    const name = clean(rawName);
    if (!unit || unit.branch || !name) return ctx.toast('Pick a unit and a name', 'warn');
    const old = unit.name;
    unit.name = name;
    used(ctx);
    return ctx.log(`${old} is now called ${name}.`, '✏️', 'info');
  },
  /** arg: deptId — close one of your units; its people rejoin the main department. */
  closeUnit(ctx, deptId) {
    const d = designCheck(ctx);
    if (!d) return;
    const { biz, org } = d;
    const unit = org.departments[deptId];
    if (!unit?.custom) return ctx.toast('Only units you created can be closed', 'warn');
    const main = primaryOf(org);
    for (const p of Object.values(org.people)) {
      if (p.deptId !== deptId) continue;
      if (unit.head === p.id && !p.post) { delete org.people[p.id]; continue; }
      p.deptId = main.id;
      if (p.professionId && p.levelId) ((main.seats[p.professionId] ??= {})[p.levelId] ??= []).push(p.id);
    }
    delete biz.staff.extra?.[deptId];
    delete org.departments[deptId];
    for (const k of Object.keys(org.titles ?? {})) if (k.startsWith(`${deptId}|`)) delete org.titles[k];
    syncBusinessOrg(ctx.state, biz);
    used(ctx);
    return ctx.log(`You closed ${unit.name}; its people moved back into ${main.name}.`, '🧩', 'info');
  },
  /** arg: 'deptId:levelId|head:title' — rename a post. */
  retitle(ctx, arg) {
    const d = designCheck(ctx);
    if (!d) return;
    const { org } = d;
    const [deptId, levelId, rawTitle] = String(arg ?? '').split(':');
    const title = clean(rawTitle);
    if (!org.departments[deptId] || !levelId || !title) return ctx.toast('Pick a post and a title', 'warn');
    (org.titles ??= {})[`${deptId}|${levelId}`] = title;
    if (levelId === 'head') org.departments[deptId].headTitle = title;
    applyTitles(org);
    used(ctx);
    return ctx.log(`Retitled: ${title}.`, '🏷️', 'info');
  },
  /** arg: 'deptId:title' — a new named post, filled by a new hire. */
  createPost(ctx, arg) {
    const d = designCheck(ctx);
    if (!d) return;
    const { biz, org } = d;
    const [deptId, rawTitle] = String(arg ?? '').split(':');
    const dept = org.departments[deptId];
    const title = clean(rawTitle);
    if (!dept || !title) return ctx.toast('Pick a unit and a title', 'warn');
    const rng = sideRng(ctx.state);
    const occ = dept.occupation ?? orgType(org.typeId)?.departments.find((x) => x.id === deptId)?.occupations[0] ?? null;
    const p = newPerson(rng, org, { title, deptId, professionId: occ, selection: 'hired', age: rng.int(28, 55), years: 0, performance: rng.int(55, 80) });
    p.post = true;
    p.handPicked = true;
    biz.staff.headcount += 1;
    biz.staff.extra ??= {};
    biz.staff.extra[deptId] = (biz.staff.extra[deptId] ?? 0) + 1;
    syncBusinessOrg(ctx.state, biz);
    used(ctx);
    return ctx.log(`You created a new post, ${title}, in ${dept.name} — and hired ${p.name} into it.`, '🪑', 'good');
  },
  /** arg: personId — remove a post you created (the holder is let go). */
  removePost(ctx, personId) {
    const d = designCheck(ctx);
    if (!d) return;
    const { biz, org } = d;
    const p = org.people[personId];
    if (!p?.post) return ctx.toast('Only posts you created can be removed', 'warn');
    delete org.people[personId];
    biz.staff.headcount = Math.max(0, biz.staff.headcount - 1);
    if (biz.staff.extra?.[p.deptId]) biz.staff.extra[p.deptId] -= 1;
    syncBusinessOrg(ctx.state, biz);
    used(ctx);
    return ctx.log(`You abolished the post of ${p.title}; ${p.name} was let go with severance.`, '🪑', 'warn');
  },
};

/** The business as a chart: you at the top, the chief executive, then each unit and its people. */
export function businessChart(state, biz) {
  const org = businessOrg(state, biz);
  if (!org) return null;
  const typeName = typeOf(biz).name;
  const groups = (d) => {
    const by = {};
    for (const p of Object.values(org.people)) if (p.deptId === d.id && p.id !== d.head) (by[p.title] ??= []).push(p);
    return Object.entries(by).map(([title, ps]) => ({ title: `${title}${ps.length > 1 ? ` (${ps.length})` : ''}`, name: ps.slice(0, 3).map((p) => p.name).join(', ') + (ps.length > 3 ? ` +${ps.length - 3}` : ''), meta: ps[0].post ? 'a post you created' : null }));
  };
  const units = Object.values(org.departments).map((d) => {
    const head = personOf(org, d.head);
    return { title: d.name, name: head ? `${head.name}` : null, meta: `${head ? `${head.title} · ` : ''}${d.headcount} staff${d.custom ? ' · your unit' : d.branch ? ' · branch' : ''}`, kind: 'unit', children: groups(d) };
  });
  const ceo = personOf(org, org.ceo);
  const top = { title: org.owner?.kind === 'player' ? 'Owner' : 'Owner', name: 'You', you: true, meta: `${biz.name} · ${typeName}`, kind: 'top', open: true, children: ceo ? [{ title: ceo.title, name: ceo.name, kind: 'unit', open: true, children: units }] : units };
  return top;
}
