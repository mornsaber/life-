/**
 * Legacy: what happens to everything when you die, and continuing the story
 * as one of your children.
 *
 * settleEstate() runs once at death. Order of payment (and the conservation
 * identity the tests check):
 *
 *   gross estate = funeral + debts paid + probate + estate tax + Σ bequests
 *
 * Life insurance pays beneficiaries directly, outside probate (but it counts
 * toward estate tax unless an irrevocable life-insurance trust owns it).
 * Without a will, intestacy applies: spouse and children share, then
 * parents and siblings, then the state.
 *
 * Estate planning (state.people.plan, see EstatePlanning.js):
 *   trust        revocable living trust — skips probate (≈3% of probate assets)
 *   ilit         irrevocable life-insurance trust — policy proceeds leave the taxable estate
 *   minorsTrust  heirs under 25 get a third now, a third at 25, the rest at 30
 *                (without it, a minor's share goes through a court guardianship)
 *   beneficiary  401(k)/IRA designation: a person id, 'children', or null (the estate)
 *   exemptionUsed  lifetime gift-tax exemption spent on gifts above the annual exclusion
 *   gifts        { [personId]: balance } given during your life
 */
import { newCommunity } from '../community/Religions.js';
import { createInitialState, currentYear, addLog, START_YEAR, businessEquity } from '../../core/State.js';
import { ageOf, livingChildren, spouseOf, living, fullName, clampRel } from './People.js';

export const FUNERAL_COST = 9000;
export const PROBATE_RATE = 0.03;
export const GUARDIANSHIP_RATE = 0.05;
/** Income tax heirs pay on inherited pre-tax accounts: spread over 10 years when named, 5 when they pass through the estate. */
export const HEIR_TAX = { named: 0.22, estate: 0.3 };
export const FEDERAL_ESTATE_EXEMPTION = 13990000;
export const FEDERAL_ESTATE_RATE = 0.4;
/** State estate taxes (simplified flat rate above the exemption) for states that have one. */
export const STATE_ESTATE_TAX = {
  NY: { exemption: 7160000, rate: 0.12, name: 'New York' },
  IL: { exemption: 4000000, rate: 0.12, name: 'Illinois' },
  WA: { exemption: 3000000, rate: 0.15, name: 'Washington' },
  DC: { exemption: 4870000, rate: 0.12, name: 'D.C.' },
  MA: { exemption: 2000000, rate: 0.12, name: 'Massachusetts' },
  MN: { exemption: 3000000, rate: 0.13, name: 'Minnesota' },
  OR: { exemption: 1000000, rate: 0.12, name: 'Oregon' },
  HI: { exemption: 5490000, rate: 0.15, name: 'Hawaii' },
};

export const WILL_PLANS = {
  spouse: { label: 'Everything to my spouse', icon: '💍' },
  split: { label: 'Half to my spouse, half to my children', icon: '👨‍👩‍👧' },
  children: { label: 'Equally to my children', icon: '🧒' },
  charity: { label: 'Half to charity, the rest to family', icon: '🎗️' },
};

/** Everything you own and owe, for the estate (and the Legacy card). */
export function estateBalance(state) {
  const inv = state.investing;
  const holdings = inv ? Object.values(inv.holdings).reduce((s, h) => s + h.value, 0) + inv.speculative.reduce((s, p) => s + (p.value ?? 0), 0) : 0;
  const iras = inv ? inv.ira.roth.value + inv.ira.traditional.value : 0;
  const homes = state.housing.properties.reduce((s, p) => s + p.value, 0);
  const business = businessEquity(state);
  const owned = (state.vehicles?.owned ?? []).filter((v) => !v.lease);
  const vehicles = owned.reduce((s, v) => s + v.value, 0);
  const assets = Math.max(0, state.finances.cash) + holdings + iras + state.retirement.dc + homes + business + vehicles;
  const debts = Math.max(0, -state.finances.cash)
    + state.housing.properties.reduce((s, p) => s + (p.mortgage?.balance ?? 0) + (p.heloc?.balance ?? 0), 0)
    + state.finances.loans + (state.health?.medicalDebt ?? 0) + (state.people?.arrears ?? 0)
    + owned.reduce((s, v) => s + (v.loan?.balance ?? 0), 0) + (state.finances.tax?.debt ?? 0) + (state.civil?.judgments ?? 0);
  return { assets: Math.round(assets), debts: Math.round(debts) };
}

export function estateTax(state, taxable) {
  // Gifts above the annual exclusion use up part of the lifetime exemption.
  const exemption = Math.max(0, FEDERAL_ESTATE_EXEMPTION - (state.people?.plan?.exemptionUsed ?? 0));
  const federal = Math.max(0, taxable - exemption) * FEDERAL_ESTATE_RATE;
  const st = STATE_ESTATE_TAX[stateOfResidence(state)];
  const stateTax = st ? Math.max(0, taxable - st.exemption) * st.rate : 0;
  return { federal: Math.round(federal), state: Math.round(stateTax), total: Math.round(federal + stateTax) };
}

let stateOfResidence = () => null;
/** Region → state lookup is injected by the people module (keeps this file free of module imports). */
export function setStateLookup(fn) {
  stateOfResidence = fn;
}

/** Who gets what share of the net estate. Returns [{ to, label, share }] summing to 1. */
export function heirShares(state) {
  const spouse = spouseOf(state);
  const kids = livingChildren(state);
  const plan = state.people?.will?.plan;
  const shares = [];
  const toKids = (fraction) => kids.forEach((k) => shares.push({ to: k.id, label: fullName(k), share: fraction / kids.length }));
  const family = (fraction) => {
    if (spouse && kids.length) {
      shares.push({ to: spouse.id, label: fullName(spouse), share: fraction / 2 });
      toKids(fraction / 2);
    } else if (spouse) shares.push({ to: spouse.id, label: fullName(spouse), share: fraction });
    else if (kids.length) toKids(fraction);
    else {
      const relatives = living(state).filter((p) => ['mother', 'father', 'sibling'].includes(p.relation));
      if (relatives.length) relatives.forEach((r) => shares.push({ to: r.id, label: fullName(r), share: fraction / relatives.length }));
      else shares.push({ to: 'state', label: 'The state (no heirs)', share: fraction });
    }
  };
  if (plan === 'spouse' && spouse) shares.push({ to: spouse.id, label: fullName(spouse), share: 1 });
  else if (plan === 'split' && spouse && kids.length) {
    shares.push({ to: spouse.id, label: fullName(spouse), share: 0.5 });
    toKids(0.5);
  } else if (plan === 'children' && kids.length) toKids(1);
  else if (plan === 'charity') {
    shares.push({ to: 'charity', label: 'Charity', share: 0.5 });
    family(0.5);
  } else family(1);
  return shares;
}

/** Retirement accounts and who they pass to by beneficiary designation (outside the will and probate). */
export function retirementAccounts(state) {
  const inv = state.investing;
  return { k401: state.retirement.dc, traditional: inv?.ira.traditional.value ?? 0, roth: inv?.ira.roth.value ?? 0 };
}

/**
 * Resolve the designation into payees. A 401(k) still naming an ex-spouse
 * pays the ex (federal ERISA law beats state revocation-on-divorce); an IRA
 * naming an ex reverts to the estate.
 */
export function designatedPayees(state) {
  const plan = state.people?.plan;
  const acct = retirementAccounts(state);
  const who = plan?.beneficiary;
  if (!who) return [];
  if (who === 'children') {
    const kids = livingChildren(state);
    const total = acct.k401 + acct.traditional + acct.roth;
    return kids.map((k) => ({ to: k.id, label: fullName(k), amount: total / kids.length, pretax: (acct.k401 + acct.traditional) / kids.length }));
  }
  const person = (state.people?.list ?? []).find((p) => p.id === who && p.alive);
  if (!person) return [];
  if (person.relation === 'ex') return acct.k401 ? [{ to: person.id, label: `${fullName(person)} (ex-spouse, still named on your 401(k))`, amount: acct.k401, pretax: acct.k401 }] : [];
  return [{ to: person.id, label: fullName(person), amount: acct.k401 + acct.traditional + acct.roth, pretax: acct.k401 + acct.traditional }];
}

/** Assets that would go through probate (everything not in a trust or passing by designation). */
export function probateAssets(state) {
  const { assets } = estateBalance(state);
  const designated = designatedPayees(state).reduce((s, p) => s + p.amount, 0);
  if (state.people?.plan?.trust) return 0;
  return Math.max(0, assets - designated);
}

/** Settle the estate at death. Stores the result on state.legacy and returns it. */
export function settleEstate(state) {
  const { assets, debts } = estateBalance(state);
  const plan = state.people?.plan ?? {};
  const funeral = Math.min(assets, FUNERAL_COST);
  const debtsPaid = Math.min(assets - funeral, debts);
  const probate = Math.min(assets - funeral - debtsPaid, Math.round(probateAssets(state) * PROBATE_RATE));
  const taxable = assets - funeral - debtsPaid - probate;
  const insurance = lifeInsurancePayouts(state);
  // Policies you own count toward estate tax (not probate) unless an ILIT owns them.
  const insured = plan.ilit ? 0 : insurance.reduce((s, x) => s + x.amount, 0);
  const tax = Math.min(taxable, Math.max(0, estateTax(state, taxable + insured).total - estateTax(state, insured).total));
  const net = taxable - tax;
  // Retirement accounts go to their named beneficiaries first; the will divides the rest.
  const acct = retirementAccounts(state);
  const pretaxTotal = acct.k401 + acct.traditional;
  const designated = designatedPayees(state);
  let left = net;
  const bequests = [];
  for (const d of designated) {
    const amount = Math.floor(Math.min(left, d.amount));
    left -= amount;
    bequests.push({ to: d.to, label: d.label, amount, heirTax: Math.round(Math.min(amount, d.pretax) * HEIR_TAX.named), designated: true });
  }
  // Pre-tax money left in the estate is withdrawn faster (5 years) and taxed harder.
  const designatedPretax = designated.reduce((s, d) => s + d.pretax, 0);
  const estatePretaxShare = left > 0 ? Math.min(1, Math.max(0, pretaxTotal - designatedPretax) / left) : 0;
  const shares = heirShares(state);
  const residual = shares.map((s) => ({ to: s.to, label: s.label, amount: Math.floor(left * s.share) }));
  const rounding = left - residual.reduce((s, b) => s + b.amount, 0);
  if (residual.length) residual[0].amount += rounding;
  for (const r of residual) r.heirTax = ['charity', 'state'].includes(r.to) ? 0 : Math.round(r.amount * estatePretaxShare * HEIR_TAX.estate);
  bequests.push(...residual);
  const legacy = { assets, debts, funeral, debtsPaid, probate, unpaidDebts: debts - debtsPaid, tax, net, bequests, insurance, will: Boolean(state.people?.will), trust: Boolean(plan.trust), settledYear: currentYear(state) };
  state.legacy = legacy;
  return legacy;
}

/** Life insurance on your own life pays your beneficiaries (children, else spouse) directly. */
function lifeInsurancePayouts(state) {
  const policy = state.people?.lifeInsurance?.self;
  if (!policy || state.character.age > policy.endsAge) return [];
  const kids = livingChildren(state);
  const spouse = spouseOf(state);
  const to = spouse ? [spouse] : kids;
  if (!to.length) return [{ to: 'estate', label: 'Your estate', amount: 0 }];
  return to.map((p) => ({ to: p.id, label: fullName(p), amount: Math.round(policy.benefit / to.length) }));
}

/** Total a given person receives from the estate and life insurance. */
export function inheritanceFor(legacy, personId) {
  const b = legacy?.bequests.filter((x) => x.to === personId).reduce((s, x) => s + x.amount - (x.heirTax ?? 0), 0) ?? 0;
  const i = legacy?.insurance.filter((x) => x.to === personId).reduce((s, x) => s + x.amount, 0) ?? 0;
  return b + i;
}

/* ------------------------------------------------------------------ */
/* Continue as your child                                              */
/* ------------------------------------------------------------------ */

/**
 * Build the next generation's state: the chosen child becomes the player,
 * inherits their share (and their 529), and keeps the family — the
 * surviving parent, siblings, and the lineage of everyone before.
 */
export function buildHeirState(rng, old, childId) {
  const child = old.people.list.find((p) => p.id === childId && p.relation === 'child' && p.alive);
  if (!child) return null;
  const legacy = old.legacy ?? settleEstate(old);
  const childAge = ageOf(old, child);
  const year = currentYear(old);
  const s = createInitialState(rng, { firstName: child.firstName, lastName: child.lastName, gender: child.gender });
  s.character.age = childAge;
  s.character.birthYear = year - childAge;
  s.character.regionId = old.character.regionId;
  s.character.residencySince = 0;
  s.log = [{ age: childAge, year, entries: [] }];
  const inheritance = inheritanceFor(legacy, child.id);
  const fund529 = Math.round(old.people.fund529?.[child.id] ?? 0);
  // Young heirs: a trust pays out in stages; without one, a minor's share sits with a court-appointed guardian until 18.
  const payouts = [];
  let now = inheritance;
  if (old.people.plan?.minorsTrust && childAge < 30 && inheritance > 0) {
    const stages = [[childAge < 25 ? childAge : null, 1], [childAge < 25 ? 25 : null, 1], [30, 1]].filter(([age]) => age != null);
    const each = Math.floor(inheritance / stages.length);
    now = inheritance - each * (stages.length - 1);
    for (const [age] of stages.slice(1)) payouts.push({ age, amount: each, label: 'Family trust distribution' });
  } else if (childAge < 18 && inheritance > 0) {
    const fee = Math.round(inheritance * GUARDIANSHIP_RATE);
    payouts.push({ age: 18, amount: inheritance - fee, label: 'Guardianship account released' });
    now = 0;
  }
  // What your parent gave you while alive was yours all along.
  const gifted = Math.round(old.people.plan?.gifts?.[child.id] ?? 0);
  s.finances.cash = now + gifted;
  if (payouts.length) s.finances.trustPayouts = payouts;
  if (childAge >= 18) s.education.degrees.push({ type: 'highschool', programId: 'highschool', major: null, year: Math.min(18, childAge) });
  if (child.degree && childAge >= 22) s.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: child.degree, schoolId: 'state', gpa: 3.1, year: 22 });
  if (fund529) s.education.fund529 = fund529;
  // A parent's transferred GI Bill.
  if (child.giBill) s.education.giBillTransferred = child.giBill;

  // Family: the parent who died, the other parent, and siblings — ages re-based on the heir.
  const rebase = ({ custody, since, dcAtMarriage, otherParentId, ...p }, relation, extra = {}) => ({ ...p, relation, ageOffset: p.ageOffset - child.ageOffset, ...extra });
  const deceasedParent = {
    id: rng.id('per_'), firstName: old.character.firstName, lastName: old.character.lastName, gender: old.character.gender,
    relation: old.character.gender === 'female' ? 'mother' : 'father', ageOffset: old.character.age - childAge,
    relationship: child.relationship, alive: false, diedAge: old.character.age, income: 0, nationality: 'US',
  };
  const list = [deceasedParent];
  const spouse = spouseOf(old);
  const otherParent = spouse && (child.otherParentId ? child.otherParentId === spouse.id : true) ? spouse : old.people.list.find((p) => p.id === child.otherParentId);
  if (otherParent) list.push(rebase(otherParent, otherParent.gender === 'female' ? 'mother' : 'father', { relationship: clampRel((child.relationship + otherParent.relationship) / 2) }));
  for (const sib of old.people.list.filter((p) => p.relation === 'child' && p.id !== child.id)) list.push(rebase(sib, 'sibling', { relationship: clampRel(55 + rng.int(-15, 20)) }));
  s.people = {
    list,
    wealth: legacy.net + inheritance > 1000000 ? 'upper' : legacy.net > 150000 ? 'middle' : 'low',
    orientation: null,
    fund529: {},
    arrears: 0,
    will: null,
    lifeInsurance: {},
    generated: true,
  };
  // The family business passes to the heir in kind: it counts against their share of the estate.
  const biz = old.business?.current;
  if (biz) {
    const equity = businessEquity(old);
    s.finances.cash = Math.max(0, s.finances.cash - equity);
    const ids = new Set(list.map((p) => p.id));
    s.business = { current: { ...structuredClone(biz), role: 'absentee', family: biz.family.filter((id) => ids.has(id) && id !== child.id) }, history: [], listings: [] };
    addLog(s, `You inherited the family business, ${biz.name}${equity ? ` (worth about $${equity.toLocaleString()} to you)` : ''}. A manager runs it for now.`, '🏪', 'milestone');
  }

  // Children are raised in the family's faith.
  const faith = old.community?.faith;
  if (faith) s.community = newCommunity(faith.traditionId, faith.congregation, childAge);

  // Minors live with the surviving parent (or a guardian); young adults may still be at home.
  s.housing.withParents = childAge < 18 || (childAge < 26 && Boolean(otherParent?.alive));
  s.lineage = {
    generation: (old.lineage?.generation ?? 1) + 1,
    founderYear: old.lineage?.founderYear ?? old.character.birthYear ?? START_YEAR,
    ancestors: [...(old.lineage?.ancestors ?? []), {
      name: `${old.character.firstName} ${old.character.lastName}`, born: old.character.birthYear, died: year, age: old.character.age,
      cause: old.character.causeOfDeath, netWorth: legacy.assets - legacy.debts, generation: old.lineage?.generation ?? 1,
    }],
  };
  addLog(s, `You are ${child.firstName} ${child.lastName}, ${childAge} years old. Your ${old.character.gender === 'female' ? 'mother' : 'father'}, ${old.character.firstName}, has died.`, '🕯️', 'milestone');
  if (inheritance) addLog(s, `You inherited $${inheritance.toLocaleString()}${legacy.insurance.some((x) => x.to === child.id) ? ' (including life insurance)' : ''}${payouts.length ? ` — $${now.toLocaleString()} now, the rest ${payouts.map((p) => `$${p.amount.toLocaleString()} at ${p.age}`).join(', ')}` : ''}.`, '📜', 'good');
  if (gifted) addLog(s, `Over the years your ${old.character.gender === 'female' ? 'mother' : 'father'} gave you $${gifted.toLocaleString()}.`, '🎁', 'good');
  if (fund529) addLog(s, `Your 529 college fund holds $${fund529.toLocaleString()}.`, '🎓', 'good');
  return s;
}
