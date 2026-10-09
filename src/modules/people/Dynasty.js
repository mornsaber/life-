/**
 * Dynasty: raising children who can carry the family on, and handing the
 * family business to them.
 *
 *   traits       every child has smarts, athletics and business sense
 *                (0–100). Born children take after you and your partner;
 *                what you do with them each year moves the numbers, and an
 *                heir you continue as starts with them.
 *   nurture      once a year per child: read together, a tutor, sports, or
 *                bringing them along to the family business
 *   apprentice   adult children working in the family business learn it
 *                (familyBizYears); a trained heir takes over smoothly and
 *                starts with real experience
 *   succession   a succession plan names which child takes over. The
 *                business then passes by agreement: outside probate, valued
 *                at a discount for estate tax, straight to that child, and
 *                staff and customers see it coming.
 *   family life  children who are close to you lift your happiness; adult
 *                children look after you in old age; grandchildren arrive and
 *                become the next generation's children.
 *
 * state.people.plan.succession = childId | null
 * child.traits = { smarts, athletics, business }, child.familyBizYears,
 * child.kids = [{ firstName, gender, bornAge }]   (bornAge: your age when born)
 */
import { clamp } from '../../core/Random.js';
import { randomName, yearlyCount, bumpYearly } from '../../core/State.js';
import { ageOf, livingChildren, byId, clampRel, fullName } from './People.js';

export const SUCCESSION_COST = 12000;
export const SUCCESSION_CHANGE_COST = 1500;
/** Valuation discount for estate tax on a business passing under a succession plan (lack of marketability and control). */
export const SUCCESSION_DISCOUNT = 0.3;
export const READY = 60;

export const NURTURE = {
  read: { label: 'Read together', icon: '📚', cost: 0, ages: [1, 12], trait: 'smarts', gain: [2, 4], rel: 4, desc: 'Free · smarts' },
  tutor: { label: 'Hire a tutor', icon: '🧑‍🏫', cost: 2500, ages: [6, 17], trait: 'smarts', gain: [3, 6], rel: 1, desc: 'Smarts' },
  sports: { label: 'Youth sports', icon: '⚽', cost: 1200, ages: [5, 17], trait: 'athletics', gain: [3, 6], rel: 4, desc: 'Athletics' },
  shadow: { label: 'Bring them to the business', icon: '🏪', cost: 0, ages: [10, 40], trait: 'business', gain: [4, 8], rel: 2, desc: 'Business sense', needsBusiness: true },
};

const allBusinesses = (state) => [state.business?.current, ...(state.business?.holdings ?? [])].filter(Boolean);
export const ownsBusiness = (state) => allBusinesses(state).length > 0;
const traitFrom = (rng, a, b) => Math.round(clamp((a + b) / 2 + rng.int(-14, 14), 5, 98));

/** A newborn takes after both parents; an adopted child is their own person. */
export function newTraits(rng, state, child) {
  if (child.adopted || ageOf(state, child) > 0) return { smarts: rng.int(25, 85), athletics: rng.int(25, 85), business: rng.int(5, 25) };
  const other = byId(state, child.otherParentId);
  const otherSmarts = other?.smarts ?? rng.int(35, 80);
  return {
    smarts: traitFrom(rng, state.stats.smarts, otherSmarts),
    athletics: traitFrom(rng, state.stats.fitness, rng.int(35, 80)),
    business: rng.int(5, 20) + (ownsBusiness(state) ? 5 : 0),
  };
}

export function ensureTraits(rng, state, child) {
  child.traits ??= newTraits(rng, state, child);
  child.familyBizYears ??= 0;
  return child.traits;
}

/** How ready a child is to take over the family business (0–100). */
export const readiness = (child) => Math.round(clamp((child.traits?.business ?? 10) + (child.familyBizYears ?? 0) * 8, 0, 100));
export const readinessLabel = (r) => (r >= READY ? 'Ready to take over' : r >= 30 ? 'Learning the business' : 'Not trained');

export const successorOf = (state) => {
  const id = state.people?.plan?.succession;
  const child = id ? byId(state, id) : null;
  return child?.alive && child.relation === 'child' ? child : null;
};

/** Children working in any family business. */
const inFamilyBusiness = (state, child) => allBusinesses(state).some((b) => (b.family ?? []).includes(child.id));

/** Ordinal for "3rd-generation". */
export const ordinal = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;

function grandchildren(ctx) {
  const { state, rng } = ctx;
  for (const child of livingChildren(state)) {
    const age = ageOf(state, child);
    child.kids ??= [];
    if (age < 24 || age > 42 || child.kids.length >= 3 || child.relationship < 35) continue;
    const lastBorn = child.kids.at(-1)?.bornAge ?? -99;
    if (state.character.age - lastBorn < 2 || !rng.chance(child.kids.length ? 0.1 : 0.13)) continue;
    const gender = rng.pick(['male', 'female']);
    const kid = { firstName: randomName(rng, gender).firstName, gender, bornAge: state.character.age };
    child.kids.push(kid);
    child.partnered = true;
    ctx.stat('happiness', 6);
    child.relationship = clampRel(child.relationship + 4);
    ctx.log(`${child.firstName} had a baby: your grandchild ${kid.firstName}! 👶`, '👵', 'milestone');
  }
}

/** The good parts of a family, each year. */
function familyLife(ctx) {
  const { state } = ctx;
  const age = state.character.age;
  const kids = livingChildren(state).filter((c) => ageOf(state, c) >= 0);
  if (!kids.length) return;
  const close = kids.filter((c) => c.relationship >= 65).length;
  if (close) ctx.stat('happiness', Math.min(3, close));
  const grandkids = kids.reduce((s, c) => s + (c.kids?.length ?? 0), 0);
  if (age >= 55 && grandkids) ctx.stat('happiness', Math.min(2, grandkids));
  // Grown children who are close look in on you as you get older.
  if (age >= 65) {
    const caring = kids.filter((c) => ageOf(state, c) >= 25 && c.relationship >= 55 && !c.away);
    if (caring.length) {
      ctx.stat('stress', -Math.min(3, caring.length));
      if (age >= 75) ctx.stat('health', Math.min(2, caring.length));
      if (age >= 75 && !state.yearly['dynasty.careNote'] && ctx.rng.chance(0.25)) {
        bumpYearly(state, 'dynasty.careNote');
        const c = ctx.rng.pick(caring);
        ctx.log(`${c.firstName} came by to help around the house and drive you to appointments.`, '🫶', 'good');
      }
    }
  }
}

/** Children learn the business by working in it. */
function apprenticeship(ctx) {
  const { state } = ctx;
  for (const child of livingChildren(state)) {
    if (!inFamilyBusiness(state, child)) continue;
    const before = readiness(child);
    child.familyBizYears = (child.familyBizYears ?? 0) + 1;
    child.traits.business = Math.round(clamp(child.traits.business + ctx.rng.int(2, 5), 0, 100));
    if (before < READY && readiness(child) >= READY) ctx.log(`${child.firstName} knows the family business inside and out now — ready to take it over one day.`, '🏪', 'milestone');
  }
}

export const Dynasty = {
  id: 'dynasty',
  order: 17,

  init(state) {
    if (!state.people) return;
    state.people.plan ??= { trust: false, ilit: false, minorsTrust: false, beneficiary: null, exemptionUsed: 0, gifts: {}, giftedThisYear: {} };
    state.people.plan.succession ??= null;
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    if (!state.people || !state.character.alive) return;
    for (const child of livingChildren(state)) ensureTraits(rng, state, child);
    apprenticeship(ctx);
    grandchildren(ctx);
    familyLife(ctx);
    // A named successor who died or was disowned leaves the plan empty.
    if (state.people.plan?.succession && !successorOf(state)) {
      state.people.plan.succession = null;
      if (ownsBusiness(state)) ctx.log('Your succession plan no longer names anyone. Pick another successor.', '📋', 'warn');
    }
  },

  actions: {
    /** arg: "childId:kind" — once per child per year. */
    nurture(ctx, arg) {
      const { state, rng } = ctx;
      const [id, kind] = String(arg).split(':');
      const child = byId(state, id);
      const n = NURTURE[kind];
      if (!child?.alive || child.relation !== 'child' || !n) return;
      const age = ageOf(state, child);
      if (age < n.ages[0] || age > n.ages[1]) return ctx.toast(`For ages ${n.ages[0]}–${n.ages[1]}.`, 'warn');
      if (n.needsBusiness && !ownsBusiness(state)) return ctx.toast('You need a family business to show them.', 'warn');
      if (yearlyCount(state, `dynasty.nurture.${id}`)) return ctx.toast(`You already did something special with ${child.firstName} this year.`, 'warn');
      if (n.cost && !ctx.spend(n.cost, `${n.label} — ${child.firstName}`)) return ctx.toast(`Costs $${n.cost.toLocaleString()}.`, 'warn');
      bumpYearly(state, `dynasty.nurture.${id}`);
      const t = ensureTraits(rng, state, child);
      const gain = rng.int(...n.gain);
      t[n.trait] = Math.round(clamp(t[n.trait] + gain, 0, 100));
      child.relationship = clampRel(child.relationship + n.rel);
      ctx.stat('happiness', 1);
      const lines = {
        read: `You read with ${child.firstName} most nights this year.`,
        tutor: `${child.firstName}'s tutor has their grades climbing.`,
        sports: `${child.firstName} played a full season — you made most of the games.`,
        shadow: `${child.firstName} spent the year learning the family business at your side.`,
      };
      ctx.log(`${lines[kind]} (${n.trait} ${t[n.trait]})`, n.icon, 'good');
    },
    /** arg: child id, or 'none' — who takes over the family business. */
    succession(ctx, id) {
      const { state } = ctx;
      const plan = state.people?.plan;
      if (!plan) return;
      if (id === 'none') {
        plan.succession = null;
        return ctx.log('You set aside your succession plan.', '📋');
      }
      const child = byId(state, id);
      if (!child?.alive || child.relation !== 'child') return;
      if (!ownsBusiness(state)) return ctx.toast('A succession plan needs a business to pass on.', 'warn');
      if (plan.succession === id) return;
      const cost = plan.successionDrafted ? SUCCESSION_CHANGE_COST : SUCCESSION_COST;
      if (!ctx.spend(cost, 'Business succession plan', { credit: true })) return ctx.toast(`An attorney and appraiser charge $${cost.toLocaleString()}.`, 'warn');
      plan.succession = id;
      plan.successionDrafted = true;
      child.relationship = clampRel(child.relationship + 5);
      ctx.log(`Your succession plan names ${fullName(child)} to take over the family business. It will pass outside probate, at a discounted value for estate tax.`, '📋', 'milestone');
    },
  },
};

/* ------------------------------------------------------------------ */
/* At death: handing the family on                                     */
/* ------------------------------------------------------------------ */

/** Grandchildren become the heir's children (with a partner if they had kids). */
export function heirFamily(rng, child, old) {
  const out = [];
  if (!child.kids?.length) return out;
  const heirAge = ageOf(old, child);
  const gender = child.gender === 'male' ? 'female' : 'male';
  const name = randomName(rng, gender);
  const spouse = {
    id: rng.id('per_'), firstName: name.firstName, lastName: child.lastName, gender, relation: 'spouse', ageOffset: rng.int(-3, 3),
    relationship: 70, alive: true, income: heirAge < 65 ? rng.int(40000, 85000) : 0, careerIncome: rng.int(40000, 85000), job: heirAge < 65 ? 'Works locally' : null,
    sector: 'private', nationality: 'US', compatibility: rng.int(55, 85), since: Math.max(18, heirAge - 6),
  };
  out.push(spouse);
  for (const k of child.kids) {
    const kidAge = old.character.age - k.bornAge;
    out.push({
      id: rng.id('per_'), firstName: k.firstName, lastName: child.lastName, gender: k.gender, relation: 'child', ageOffset: kidAge - heirAge,
      relationship: 80, alive: true, income: 0, careerIncome: 0, nationality: 'US', otherParentId: spouse.id, custody: 'you',
      traits: { smarts: traitFrom(rng, child.traits?.smarts ?? 55, 55), athletics: traitFrom(rng, child.traits?.athletics ?? 55, 55), business: rng.int(5, 20) }, familyBizYears: 0,
    });
  }
  return out;
}

/** The heir starts with the child's traits instead of random ones. */
export function heirStats(s, child) {
  const t = child.traits;
  if (!t) return;
  s.stats.smarts = Math.round(clamp(t.smarts, 5, 100));
  s.stats.fitness = Math.round(clamp(25 + t.athletics * 0.6, 20, 90));
}

/** Who among the living children would the business go to? Used by the tombstone and the Dynasty card. */
export function businessHeirId(state) {
  return successorOf(state)?.id ?? null;
}

export { allBusinesses };
