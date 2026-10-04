/**
 * What an owner can do with the organization they own: people decisions on
 * named employees (the same people and career ladders as any employer),
 * who runs the place, policy (prices, pay, suppliers), investment,
 * locations, deals with competitors, and partial or family exits.
 *
 * Money moves through the business's books (biz.cash / debts); the yearly
 * P&L in Business.yearFinancials reads the policies set here.
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { getProfession } from '../career/JobTrees.js';
import { ladderFor } from '../career/Ladder.js';
import { BUSINESS_TYPES } from './BusinessTypes.js';
import { currentBusiness, typeOf, valuation, exitProceeds, debtBalance } from './Business.js';
import {
  businessOrg, syncBusinessOrg, competitorsOf, closeBranch, openBranch, sizeForHeadcount, ownerPosition, dissolve,
} from '../org/Businesses.js';
import { personOf, sideRng, newPerson } from '../org/Organizations.js';
import { seat } from '../org/Vacancies.js';
import { rememberDeparture } from '../org/Churn.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;

export const PRICE_LEVELS = {
  budget: { label: 'Budget', revenue: 0.9, demand: 1.1, reputation: -1 },
  standard: { label: 'Market rate', revenue: 1, demand: 1, reputation: 0 },
  premium: { label: 'Premium', revenue: 1.12, demand: 0.88, reputation: 1 },
};
export const PAY_LEVELS = {
  below: { label: 'Below market', payroll: 0.92, morale: -8 },
  market: { label: 'Market', payroll: 1, morale: 0 },
  above: { label: 'Above market', payroll: 1.08, morale: 8 },
};
export const SUPPLIERS = {
  cheap: { label: 'Cheapest suppliers', cogs: 0.95, quality: -3 },
  standard: { label: 'Standard suppliers', cogs: 1, quality: 0 },
  premium: { label: 'Premium suppliers', cogs: 1.05, quality: 3 },
};
/** Owner decisions on people and deals per year. */
export const OWNER_DECISIONS = 4;

const withBiz = (ctx) => {
  const biz = currentBusiness(ctx.state);
  if (!biz) ctx.toast('You don\'t own a business.', 'warn');
  return biz;
};

function decide(ctx) {
  if (yearlyCount(ctx.state, 'business.decide') >= OWNER_DECISIONS) {
    ctx.toast(`You've made your ${OWNER_DECISIONS} big decisions this year.`, 'warn');
    return false;
  }
  bumpYearly(ctx.state, 'business.decide');
  return true;
}

function staffMember(state, biz, personId) {
  const org = businessOrg(state, biz);
  const p = personOf(org, personId);
  return p && p.id !== org.ceo ? { org, p } : { org, p: null };
}

/** Move a person one rung up (or down) their career's ladder inside the business. */
function moveRung(org, p, dir) {
  // Department heads and branch managers sit above the ladder.
  if (!p.levelId || Object.values(org.departments).some((d) => d.head === p.id)) return null;
  const profession = getProfession(p.professionId);
  if (!profession) return null;
  const ladder = ladderFor(profession, org.size);
  const idx = ladder.findIndex((l) => l.id === p.levelId);
  const next = ladder[idx + dir];
  if (!next || next.abilities.includes('exec')) return null;
  seat(org, p.deptId, p.professionId, next.id, p, next.title);
  return next;
}

/** Candidates to run the business: [{ id, name, label, performance, salaryNote }]. */
function ceoCandidates(state, biz) {
  const rng = sideRng(state);
  const org = businessOrg(state, biz);
  const insider = Object.values(org.people).filter((p) => p.id !== org.ceo).sort((a, b) => b.performance - a.performance)[0];
  const name = () => { const g = rng.pick(['male', 'female']); return { gender: g, ...rng.pick([{ n: 'Alex Moreno' }, { n: 'Jordan Lee' }, { n: 'Casey Brooks' }, { n: 'Morgan Patel' }, { n: 'Riley Chen' }, { n: 'Taylor Okafor' }]) }; };
  const ext = name();
  const cheap = name();
  return [
    insider && { id: `inside:${insider.id}`, label: `🏠 Promote ${insider.name} (${insider.title})`, hint: 'Knows the business; loyal team', performance: Math.min(90, insider.performance + 4) },
    { id: `outside:${ext.n}:${ext.gender}:${rng.int(68, 88)}`, label: `🎓 Hire ${ext.n}, an experienced executive`, hint: 'Strongest operator, costs more' },
    { id: `cheap:${cheap.n}:${cheap.gender}:${rng.int(45, 65)}`, label: `💸 Hire ${cheap.n}, a budget manager`, hint: 'Cheap; results vary' },
  ].filter(Boolean);
}

export const OwnerActions = {
  /* -------- People -------- */
  staffCommend(ctx, personId) {
    const biz = withBiz(ctx);
    const { p } = biz ? staffMember(ctx.state, biz, personId) : {};
    if (!p || !decide(ctx)) return;
    p.rel = Math.min(100, p.rel + 10);
    p.performance = Math.min(98, p.performance + 3);
    biz.staff.morale = Math.min(100, biz.staff.morale + 1);
    ctx.log(`You recognized ${p.name}'s work in front of the whole team.`, '🏅', 'good');
  },
  staffRaise(ctx, personId) {
    const biz = withBiz(ctx);
    const { p } = biz ? staffMember(ctx.state, biz, personId) : {};
    if (!p || !decide(ctx)) return;
    p.rel = Math.min(100, p.rel + 12);
    p.raises = (p.raises ?? 0) + 1;
    biz.staff.costPremium = Math.round(((biz.staff.costPremium ?? 0) + 0.04 / Math.max(1, biz.staff.headcount)) * 10000) / 10000;
    ctx.log(`You gave ${p.name} a raise. They're staying.`, '💵', 'good');
  },
  staffPromote(ctx, personId) {
    const biz = withBiz(ctx);
    const { org, p } = biz ? staffMember(ctx.state, biz, personId) : {};
    if (!p || !decide(ctx)) return;
    const next = moveRung(org, p, 1);
    if (!next) return ctx.toast(`There's no rung above ${p.name} here.`, 'warn');
    p.rel = Math.min(100, p.rel + 15);
    biz.staff.costPremium = Math.round(((biz.staff.costPremium ?? 0) + 0.05 / Math.max(1, biz.staff.headcount)) * 10000) / 10000;
    ctx.log(`You promoted ${p.name} to ${next.title}.`, '⬆️', 'good');
  },
  staffDemote(ctx, personId) {
    const biz = withBiz(ctx);
    const { org, p } = biz ? staffMember(ctx.state, biz, personId) : {};
    if (!p || !decide(ctx)) return;
    const prev = moveRung(org, p, -1);
    if (!prev) return ctx.toast(`${p.name} can't be moved down a rung here.`, 'warn');
    p.rel = Math.max(0, p.rel - 25);
    biz.staff.morale = Math.max(0, biz.staff.morale - 3);
    ctx.log(`You demoted ${p.name} to ${prev.title}.`, '⬇️', 'warn');
  },
  staffFire(ctx, personId) {
    const { state, rng } = ctx;
    const biz = withBiz(ctx);
    const { org, p } = biz ? staffMember(state, biz, personId) : {};
    if (!p || !decide(ctx)) return;
    const justified = p.performance < 45 || (p.discipline ?? 0) >= 2;
    const dept = org.departments[p.deptId];
    if (dept?.head === p.id) dept.head = null;
    for (const byLevel of Object.values(dept?.seats ?? {})) for (const k of Object.keys(byLevel)) byLevel[k] = byLevel[k].filter((id) => id !== p.id);
    rememberDeparture(state, org, p, 'was fired');
    delete org.people[p.id];
    biz.staff.morale = Math.round(clamp(biz.staff.morale + (justified ? -1 : -6), 0, 100));
    if (!justified && rng.chance(0.15)) {
      const cost = rng.int(15000, 60000);
      biz.cash -= cost;
      ctx.log(`You fired ${p.name}, who sued for wrongful termination. The settlement cost ${money(cost)}.`, '⚖️', 'bad');
    } else ctx.log(`You fired ${p.name}${justified ? '' : '. The team didn\'t see it coming'}.`, '🚪', justified ? 'info' : 'warn');
    syncBusinessOrg(state, biz);
  },
  /** arg: 'personId:deptId' — move someone to another department or branch. */
  staffTransfer(ctx, arg) {
    const biz = withBiz(ctx);
    const [personId, deptId] = String(arg).split(/[|:]/);
    const { org, p } = biz ? staffMember(ctx.state, biz, personId) : {};
    if (!p || !org.departments[deptId] || p.deptId === deptId || !decide(ctx)) return;
    const from = org.departments[p.deptId];
    for (const byLevel of Object.values(from?.seats ?? {})) for (const k of Object.keys(byLevel)) byLevel[k] = byLevel[k].filter((id) => id !== p.id);
    if (from?.head === p.id) from.head = null;
    const to = org.departments[deptId];
    if (!personOf(org, to.head)) {
      to.head = p.id;
      p.deptId = deptId;
      p.levelId = null;
      p.title = to.branch ? 'Branch Manager' : `${to.name} Manager`;
      ctx.log(`You put ${p.name} in charge of ${to.name}.`, '🔀', 'good');
    } else if (!p.levelId) {
      return ctx.toast(`${to.name} already has a manager.`, 'warn');
    } else {
      const level = p.levelId;
      p.levelId = null;
      seat(org, deptId, p.professionId, level, p, p.title);
      ctx.log(`You moved ${p.name} to ${to.name}.`, '🔀');
    }
    p.rel = Math.round(clamp(p.rel + 2, 0, 100));
  },
  /** Hire someone to run the business (you become Owner & Chairman). */
  appointCeo(ctx) {
    const { state } = ctx;
    const biz = withBiz(ctx);
    if (!biz) return;
    if (!businessOrg(state, biz)) return;
    ctx.prompt({
      type: 'business.appointCeo', icon: '👔', title: `Who Runs ${biz.name}?`,
      text: `${ownerPosition(state, biz).ceo ? `${ownerPosition(state, biz).ceo.name} runs it today. ` : ''}Pick someone to run the business day to day. You stay the owner.`,
      options: [...ceoCandidates(state, biz), { id: 'keep', label: '✋ Never mind' }],
    });
  },

  /* -------- Policy -------- */
  setPrice(ctx, level) {
    const biz = withBiz(ctx);
    if (biz && PRICE_LEVELS[level]) biz.priceLevel = level;
  },
  setPay(ctx, level) {
    const biz = withBiz(ctx);
    if (biz && PAY_LEVELS[level]) biz.payLevel = level;
  },
  setSupplier(ctx, level) {
    const biz = withBiz(ctx);
    if (biz && SUPPLIERS[level]) biz.supplier = level;
  },
  /** arg: 'equipment' | 'technology' — spend from the business account to raise quality. */
  invest(ctx, kind) {
    const { state } = ctx;
    const biz = withBiz(ctx);
    if (!biz || !['equipment', 'technology'].includes(kind)) return;
    if (yearlyCount(state, `business.invest.${kind}`)) return ctx.toast('One investment of each kind per year.', 'warn');
    const cost = Math.round(typeOf(biz).cost * (kind === 'equipment' ? 0.15 : 0.08) * Math.max(1, biz.scale));
    if (biz.cash < cost) return ctx.toast(`Needs ${money(cost)} in the business account.`, 'warn');
    bumpYearly(state, `business.invest.${kind}`);
    biz.cash -= cost;
    biz.assets += Math.round(cost * 0.7);
    biz.quality = Math.min(100, biz.quality + (kind === 'equipment' ? 5 : 4));
    ctx.log(`${biz.name} invested ${money(cost)} in new ${kind}.`, kind === 'equipment' ? '🛠️' : '🖥️', 'good');
  },
  /** Pay down the SBA loan from the business account. */
  payDown(ctx) {
    const biz = withBiz(ctx);
    const sba = biz?.debts.sba;
    if (!sba) return ctx.toast('No bank debt to pay down.', 'info');
    const amount = Math.min(sba.balance, Math.max(0, biz.cash - 10000));
    if (amount <= 0) return ctx.toast('Not enough spare cash in the business.', 'warn');
    sba.balance -= amount;
    biz.cash -= amount;
    if (sba.balance <= 0) biz.debts.sba = null;
    ctx.log(`${biz.name} paid down ${money(amount)} of its loan${biz.debts.sba ? '' : ' — debt-free'}.`, '🏦', 'good');
  },

  /* -------- Locations -------- */
  /** arg: branch deptId */
  closeLocation(ctx, deptId) {
    const { state } = ctx;
    const biz = withBiz(ctx);
    if (!biz || biz.scale <= 1) return;
    if (!closeBranch(state, biz, deptId)) return;
    const type = typeOf(biz);
    biz.scale -= 1;
    biz.staff.headcount = Math.round(type.staff * biz.scale) + biz.family.length;
    biz.assets = Math.round(biz.assets * 0.8);
    biz.staff.morale = Math.max(0, biz.staff.morale - 6);
    syncBusinessOrg(state, biz);
    ctx.log(`${biz.name} closed a location. ${biz.scale} remain${biz.scale === 1 ? 's' : ''}.`, '🔒', 'warn');
  },
  /** Choose where the next location opens (then expand). arg: regionId */
  expandTo(ctx, regionId) {
    const biz = withBiz(ctx);
    if (biz) biz.expandTo = regionId;
  },

  /* -------- Deals -------- */
  /** Buy a competitor outright: it becomes one of your branches. arg: orgId */
  acquire(ctx, orgId) {
    const { state } = ctx;
    const biz = withBiz(ctx);
    if (!biz) return;
    const target = competitorsOf(state, biz).find((o) => o.id === orgId);
    if (!target || !decide(ctx)) return;
    const price = acquisitionPrice(biz, target);
    if (biz.cash < price) return ctx.toast(`${target.name} wants ${money(price)}; the business has ${money(biz.cash)}.`, 'warn');
    biz.cash -= price;
    biz.assets += Math.round(price * 0.5);
    absorb(state, biz, target, 'acquired');
    ctx.log(`${biz.name} acquired ${target.name} for ${money(price)}. Its ${target.business.staff} staff now work for you.`, '🤝', 'milestone');
  },
  /** All-stock merger: combine with a competitor; its owner takes a share of yours. arg: orgId */
  merge(ctx, orgId) {
    const { state } = ctx;
    const biz = withBiz(ctx);
    if (!biz) return;
    const target = competitorsOf(state, biz).find((o) => o.id === orgId);
    if (!target || !decide(ctx)) return;
    const theirs = acquisitionPrice(biz, target);
    const mine = Math.max(1, biz.valuation);
    const share = Math.round((theirs / (mine + theirs)) * 100) / 100;
    if (share > 0.6) return ctx.toast(`${target.name} is bigger than you — they'd be buying you.`, 'warn');
    biz.ownerPct = Math.round(biz.ownerPct * (1 - share) * 10000) / 10000;
    biz.investors.push({ round: 'merger', pct: share, invested: 0, partner: target.owner.name });
    absorb(state, biz, target, 'merged');
    ctx.log(`${biz.name} merged with ${target.name}. ${target.owner.name} owns ${Math.round(share * 100)}% of the combined company; you own ${Math.round(biz.ownerPct * 100)}%.`, '🔗', 'milestone');
  },
  /** Sell part of your stake to an investor. arg: '0.25' | '0.49' */
  sellStake(ctx, pctArg) {
    const { state } = ctx;
    const biz = withBiz(ctx);
    const pct = Number(pctArg);
    if (!biz || ![0.25, 0.49].includes(pct)) return;
    if (biz.ownerPct - pct < 0.2) return ctx.toast('You\'d have almost nothing left.', 'warn');
    if (yearlyCount(state, 'business.sellStake')) return ctx.toast('One stake sale per year.', 'warn');
    if (biz.valuation <= 0) return ctx.toast('Nobody will buy into a business with no value.', 'warn');
    bumpYearly(state, 'business.sellStake');
    const price = Math.round(biz.valuation * pct * 0.9);
    const portion = { ...biz, ownerPct: pct, basis: Math.round(biz.basis * (pct / biz.ownerPct)) };
    const e = exitProceeds(portion, biz.valuation * 0.9);
    state.finances.cash += e.basisBack;
    if (e.taxable) ctx.earn(e.taxable, `Capital gain — stake in ${biz.name}`, { ltcg: true });
    biz.basis -= portion.basis;
    biz.ownerPct = Math.round((biz.ownerPct - pct) * 10000) / 10000;
    biz.investors.push({ round: 'private', pct, invested: price });
    ctx.log(`You sold ${Math.round(pct * 100)}% of ${biz.name} to an investor for ${money(price)}. You keep ${Math.round(biz.ownerPct * 100)}%.`, '💼', 'finance');
  },
};

export function acquisitionPrice(biz, target) {
  const type = BUSINESS_TYPES[biz.typeId];
  return Math.round(type.cost * (0.6 + (target.business.reputation ?? 50) / 100) * Math.max(0.5, (target.business.staff ?? type.staff) / Math.max(1, type.staff)));
}

/** A competitor's people and customers become one of your branches. */
function absorb(state, biz, target, how) {
  const type = typeOf(biz);
  const branch = openBranch(state, biz, target.regionId ?? state.character.regionId);
  branch.name = `${target.name} (${how})`;
  biz.scale += 1;
  biz.staff.headcount += Math.max(1, target.business.staff ?? type.staff);
  biz.reputation = Math.round((biz.reputation * 2 + (target.business.reputation ?? 50)) / 3);
  // Their people move over with their jobs.
  const org = businessOrg(state, biz);
  for (const p of Object.values(target.people ?? {})) {
    if (!p.professionId || !p.levelId) continue;
    org.people[p.id] = { ...p, deptId: branch.id };
    seat(org, branch.id, p.professionId, p.levelId, org.people[p.id], p.title);
  }
  dissolve(target, state.character.age);
  target.mergedInto = org.id;
  org.size = sizeForHeadcount(biz.staff.headcount);
  syncBusinessOrg(state, biz);
}

export const OwnerResolvers = {
  appointCeo(ctx, _data, optionId) {
    const { state } = ctx;
    const biz = currentBusiness(state);
    const org = biz && businessOrg(state, biz);
    if (!org || optionId === 'keep') return;
    const rng = sideRng(state);
    const [kind, a, gender, perf] = optionId.split(':');
    let person;
    if (kind === 'inside') {
      person = personOf(org, a);
      if (!person) return;
      const dept = org.departments[person.deptId];
      if (dept?.head === person.id) dept.head = null;
      for (const byLevel of Object.values(dept?.seats ?? {})) for (const k of Object.keys(byLevel)) byLevel[k] = byLevel[k].filter((id) => id !== person.id);
      person.performance = Math.min(90, person.performance + 4);
      person.selection = 'internal';
      biz.staff.morale = Math.min(100, biz.staff.morale + 5);
    } else {
      person = newPerson(rng, org, { name: a, gender, performance: Number(perf), selection: 'hired', years: 0, age: rng.int(38, 60) });
      if (kind === 'outside') biz.staff.costPremium = Math.round(((biz.staff.costPremium ?? 0) + 0.01) * 10000) / 10000;
    }
    if (org.ceo && org.ceo !== person.id) {
      const old = personOf(org, org.ceo);
      if (old) rememberDeparture(state, org, old, 'was replaced');
      delete org.people[org.ceo];
    }
    org.ceo = person.id;
    person.title = biz.staff.headcount >= 50 ? 'Chief Executive Officer' : 'General Manager';
    person.deptId = null;
    person.levelId = null;
    biz.role = 'absentee';
    syncBusinessOrg(state, biz);
    ctx.log(`${person.name} now runs ${biz.name} as ${person.title}. You're the owner${biz.staff.headcount >= 50 ? ' and chairman' : ''}.`, '👔', 'milestone');
  },
};

export { debtBalance, valuation };
