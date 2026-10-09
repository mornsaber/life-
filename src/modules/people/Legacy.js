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
 * A succession plan (Dynasty.js) passes the family businesses to the named
 * child by agreement: outside probate, at a discounted value for estate tax,
 * as an in-kind bequest ahead of the will's shares.
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
import { SUCCESSION_DISCOUNT, successorOf, readiness, READY, heirFamily, heirStats, allBusinesses } from './Dynasty.js';
import { BUSINESS_TYPES } from '../business/BusinessTypes.js';

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
    + state.housing.properties.reduce((s, p) => s + (p.mortgage?.balance ?? 0) + (p.heloc?.balance ?? 0) + (p.project?.loan?.balance ?? 0), 0)
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

/** The family businesses passing under a succession plan: { successor, equity } or null. */
export function plannedSuccession(state) {
  const equity = businessEquity(state);
  const successor = equity > 0 ? successorOf(state) : null;
  return successor ? { successor, equity } : null;
}

/** Assets that would go through probate (everything not in a trust, passing by designation or under a succession plan). */
export function probateAssets(state) {
  const { assets } = estateBalance(state);
  const designated = designatedPayees(state).reduce((s, p) => s + p.amount, 0);
  if (state.people?.plan?.trust) return 0;
  return Math.max(0, assets - designated - (plannedSuccession(state)?.equity ?? 0));
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
  // A business passing under a succession plan is valued at a discount (lack of marketability and control).
  const succession = plannedSuccession(state);
  const discount = succession ? Math.round(succession.equity * SUCCESSION_DISCOUNT) : 0;
  const tax = Math.min(taxable, Math.max(0, estateTax(state, Math.max(0, taxable - discount) + insured).total - estateTax(state, insured).total));
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
  // The family businesses go to the successor in kind, ahead of the will's shares.
  if (succession) {
    const amount = Math.floor(Math.min(left, succession.equity));
    left -= amount;
    bequests.push({ to: succession.successor.id, label: `${fullName(succession.successor)} (the family business)`, amount, heirTax: 0, inKind: true });
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
  const legacy = {
    assets, debts, funeral, debtsPaid, probate, unpaidDebts: debts - debtsPaid, tax, net, bequests, insurance, will: Boolean(state.people?.will), trust: Boolean(plan.trust), settledYear: currentYear(state),
    succession: succession ? { to: succession.successor.id, name: succession.successor.firstName, equity: succession.equity, discount } : null,
  };
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
  const s = createInitialState(rng, { firstName: child.firstName, lastName: child.lastName, gender: child.gender, countryId: old.character.countryId });
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
  for (const p of heirFamily(rng, child, old)) list.push(p);
  heirStats(s, child);
  passBusinesses(old, s, child, childAge, legacy, new Set(list.map((p) => p.id)));

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
      businesses: allBusinesses(old).map((b) => b.name),
    }],
  };
  addLog(s, `You are ${child.firstName} ${child.lastName}, ${childAge} years old. Your ${old.character.gender === 'female' ? 'mother' : 'father'}, ${old.character.firstName}, has died.`, '🕯️', 'milestone');
  if (inheritance) addLog(s, `You inherited $${inheritance.toLocaleString()}${legacy.insurance.some((x) => x.to === child.id) ? ' (including life insurance)' : ''}${payouts.length ? ` — $${now.toLocaleString()} now, the rest ${payouts.map((p) => `$${p.amount.toLocaleString()} at ${p.age}`).join(', ')}` : ''}.`, '📜', 'good');
  if (gifted) addLog(s, `Over the years your ${old.character.gender === 'female' ? 'mother' : 'father'} gave you $${gifted.toLocaleString()}.`, '🎁', 'good');
  if (fund529) addLog(s, `Your 529 college fund holds $${fund529.toLocaleString()}.`, '🎓', 'good');
  const kids = s.people.list.filter((p) => p.relation === 'child');
  if (kids.length) addLog(s, `You have ${kids.length === 1 ? 'a child' : `${kids.length} children`} of your own: ${kids.map((k) => k.firstName).join(', ')}.`, '👨‍👩‍👧', 'good');
  return s;
}

/**
 * The family businesses pass to the heir: every company, the holding company
 * and its treasury. Under a succession plan they go to the named child (who
 * may not be the one you continue as); otherwise to the heir, counted against
 * their share. A business handed over during your life is theirs already.
 */
function passBusinesses(old, s, child, childAge, legacy, ids) {
  const owned = allBusinesses(old);
  const successorId = legacy.succession?.to ?? null;
  const parent = old.character.gender === 'female' ? 'mother' : 'father';
  const ready = readiness(child) >= READY && childAge >= 21;
  const generation = (b) => (b.heritage?.generation ?? 1) + 1;
  const pass = (b, gift = false) => {
    const nb = structuredClone(b);
    if (gift) {
      Object.assign(nb, { role: 'absentee', autopilot: true, family: [], foundedAge: childAge - (b.years ?? 0) });
      return nb;
    }
    nb.role = 'absentee';
    nb.autopilot = true;
    nb.inherited = true;
    nb.licenseGraceUntil = null;
    nb.licensedManager = false;
    if (!nb.plan || nb.plan.strategy === 'off') nb.plan = { strategy: 'steady', sinceAge: childAge };
    nb.family = (b.family ?? []).filter((id) => ids.has(id) && id !== child.id);
    // Inherited property takes a stepped-up basis: its value at death.
    nb.basis = Math.round(Math.max(0, b.valuation ?? 0) * b.ownerPct);
    nb.foundedAge = childAge - (b.years ?? 0);
    nb.ownedFromAge = childAge;
    nb.heritage = { since: b.heritage?.since ?? (old.character.birthYear ?? START_YEAR) + (b.foundedAge ?? 0), founder: b.heritage?.founder ?? `${old.character.firstName} ${old.character.lastName}`, generation: generation(b) };
    // Staff and customers take a planned, trained successor in stride; an unprepared one rattles them.
    const smooth = ready || successorId === child.id;
    nb.staff.morale = Math.round(Math.max(0, Math.min(100, nb.staff.morale + (smooth ? 3 : -6))));
    nb.reputation = Math.round(Math.max(0, Math.min(100, nb.reputation + (smooth ? 2 : -3))));
    if (childAge < 18) nb.heldInTrustUntil = 18;
    return nb;
  };
  const gifted = child.business ? [child.business] : [];
  const inherits = owned.length && (!successorId || successorId === child.id);
  if (!inherits && !gifted.length) {
    if (owned.length && successorId) {
      const sib = old.people.list.find((p) => p.id === successorId);
      addLog(s, `Under your ${parent}'s succession plan, ${sib?.firstName ?? 'a sibling'} took over the family business${owned.length > 1 ? 'es' : ''}.`, '📋');
    }
    return;
  }
  const passed = [...(inherits ? owned.map(pass) : []), ...gifted.map((b) => pass(b, true))];
  s.business = {
    current: passed[0],
    holdings: passed.slice(1),
    conglomerate: inherits && old.business.conglomerate ? { ...structuredClone(old.business.conglomerate), foundedAge: childAge } : null,
    history: [],
    listings: [],
    rivalGroups: structuredClone(old.business.rivalGroups ?? null) ?? undefined,
  };
  // The same world: the economy's cycle and local property markets continue.
  if (old.economy) s.economy = structuredClone(old.economy);
  if (old.housing?.market) s.housing.market = structuredClone(old.housing.market);
  if (old.housing?.rates) s.housing.rates = structuredClone(old.housing.rates);
  // The same town, the same market: the businesses' organizations, their rivals and the
  // local economy carry over (owned under the heir's name now).
  if (old.orgs && old.character.regionId === s.character.regionId) {
    s.orgs = structuredClone(old.orgs);
    const heirName = `${child.firstName} ${child.lastName}`;
    for (const o of Object.values(s.orgs.byId ?? {})) if (o.owner?.kind === 'player') o.owner = { ...o.owner, name: heirName };
  }
  if (inherits) {
    // In kind: under a succession plan it was this child's bequest; otherwise it counts against their share.
    const inKind = legacy.bequests.filter((b) => b.to === child.id && b.inKind).reduce((t, b) => t + b.amount, 0);
    const equity = businessEquity(old);
    s.finances.cash = Math.max(0, s.finances.cash - (successorId ? inKind : equity));
    const names = owned.map((b) => b.name);
    const gen = generation(owned[0]);
    addLog(s, `You inherited the family business${names.length > 1 ? `es — ${names.join(', ')}` : `, ${names[0]}`}${old.business.conglomerate ? `, held by ${old.business.conglomerate.name}` : ''}${equity ? ` (worth about $${equity.toLocaleString()} to you)` : ''}. ${gen >= 3 ? `The ${ordinalWord(gen)} generation of your family to run it. ` : ''}${childAge < 18 ? 'It\'s held in trust and run by management until you\'re 18.' : 'Management runs it on a steady growth plan for now.'}`, '🏪', 'milestone');
    if (successorId === child.id) addLog(s, `Your ${parent}'s succession plan passed it to you outside probate${legacy.succession.discount ? `, valued $${legacy.succession.discount.toLocaleString()} lower for estate tax` : ''}.`, '📋', 'good');
  }
  if (gifted.length) addLog(s, `You still own ${gifted.map((b) => b.name).join(', ')}, which your ${parent} handed to you years ago.`, '🏪', 'good');
  // A child who grew up in the business starts with real experience in it.
  const main = passed[0];
  const type = BUSINESS_TYPES[main.typeId];
  const years = child.familyBizYears ?? 0;
  if (ready && type?.professions?.[0]) {
    // Years in the trade earned them its licenses, and they can run it themselves (cheaper than a hired manager).
    for (const c of type.credentials ?? []) if (!['barLicense', 'medicalLicense', 'dentalLicense', 'cpa'].includes(c)) s.credentials.held[c] = { earnedAge: Math.max(18, childAge - Math.max(1, years)), renewedAge: childAge, status: 'active' };
    if (childAge >= 21 && main.scale <= 5) {
      main.role = 'operator';
      main.autopilot = false;
    }
    s.career.history.push({ professionId: type.professions[0], title: 'Family business', levelId: 'family', employerName: main.name, sector: 'private', peakGrade: 3, startAge: Math.max(16, childAge - Math.max(1, years)), endAge: childAge, reason: 'Took over the family business' });
    addLog(s, `${years ? `${years} years working in the business` : 'Growing up in the business'} prepared you: the staff trust you to lead it.`, '🧭', 'good');
  } else if (!ready && childAge >= 18) addLog(s, 'You never learned the business. The staff are uneasy — a manager will keep it running while you find your feet.', '😬', 'warn');
}

const ordinalWord = (n) => ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'][n] ?? `${n}th`;
