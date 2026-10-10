/**
 * People: family, friends, dating, marriage and divorce, children and the
 * money that comes with them — and what you leave behind.
 *
 * state.people = {
 *   list: [Person]              see People.js
 *   wealth: low|middle|upper    your family of origin (sets inheritances)
 *   orientation: men|women|everyone|null
 *   expecting: { since, adopted? } | null
 *   fund529: { [childId]: balance }
 *   arrears, licenseHold        unpaid child support (suspends licenses)
 *   alimony: { annual, untilAge, pay: bool } | null
 *   prenup, will: { plan }, lifeInsurance: { self?, spouse? }
 *   foreignContact: { personId, reported } | null
 * }
 *
 * Money touches other modules only through the ledger (earn/spend) and the
 * bus (credential:suspend/reinstate, career:clearanceRevoked, legal:offense,
 * retirement:addPension, housing:sell).
 */
import { PROFESSIONS } from '../career/JobTrees.js';
import { randomName, yearlyCount, bumpYearly, isIncarcerated, hasFelony } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { backgroundMortality } from '../life/Lifecycle.js';
import { regionOf, stateIdOf, countryIdOf } from '../life/Regions.js';
import { nationalityCode, nationalityName } from '../world/Immigration.js';
import { profileReturn, realReturn } from '../investing/Assets.js';
import {
  ageOf, people, living, byId, spouseOf, partnerOf, livingChildren, minorChildren, parentsOf, clampRel, fullName, spouseSocialSecurity, RELATION_LABEL,
} from './People.js';
import { settleEstate, buildHeirState, setStateLookup, WILL_PLANS } from './Legacy.js';
import { currentCircle, circleFriends, FRIEND_CAP } from './Friends.js';

const NATIONALITIES = ['Canada', 'Mexico', 'Germany', 'India', 'the Philippines', 'Brazil', 'South Korea', 'Nigeria', 'Ukraine', 'France'];
const JOBS = [['Teacher', 62000, 'public'], ['Nurse', 82000, 'private'], ['Accountant', 78000, 'private'], ['Electrician', 64000, 'private'], ['Software developer', 120000, 'private'], ['Police officer', 72000, 'public'], ['Retail manager', 52000, 'private'], ['Paralegal', 55000, 'private'], ['Graphic designer', 58000, 'private'], ['Chef', 46000, 'private'], ['Social worker', 54000, 'public'], ['Engineer', 105000, 'private'], ['Barista', 30000, 'private'], ['Firefighter', 66000, 'public'], ['Dental hygienist', 82000, 'private'], ['Realtor', 60000, 'private']];
const MAJORS = ['business', 'nursing', 'education', 'computerScience', 'biology', 'economics', 'criminalJustice', 'engineering'];
// Parents' estates, split among siblings. Most families leave little; the mean U.S. inheritance is ≈$100k and is heavily skewed.
const INHERITANCE = { low: [0, 5000], middle: [10000, 150000], upper: [200000, 1500000] };
const CHILD_SUPPORT = { first: 0.17, each: 0.08, cap: 0.35 };
export const ARREARS_HOLD = 5000;
const SPOUSE_OWN_SPENDING = 0.5;
export const WEDDINGS = { courthouse: { label: 'Courthouse wedding', cost: 300, icon: '🏛️' }, small: { label: 'Small wedding', cost: 12000, icon: '💐' }, big: { label: 'Big wedding', cost: 35000, icon: '💒' } };
const HOLD_LICENSES = ['driverLicense', 'cdlA', 'realEstate', 'barLicense', 'cpa', 'rn', 'teachingCert', 'journeymanElectrician', 'journeymanPlumber', 'cosmetologyLicense'];

/* ------------------------------------------------------------------ */
/* People factory                                                      */
/* ------------------------------------------------------------------ */

export function makePerson(ctx, { relation, gender, age, lastName, relationship = 60, ...extra }) {
  const { rng, state } = ctx;
  const g = gender ?? rng.pick(['male', 'female']);
  const name = randomName(rng, g);
  const [title, pay, sector] = rng.pick(JOBS);
  return {
    id: rng.id('per_'), firstName: name.firstName, lastName: lastName ?? name.lastName, gender: g, relation,
    ageOffset: age - state.character.age, relationship: clampRel(relationship), alive: true,
    income: age >= 22 && age < 65 ? Math.round(pay * rng.float(0.75, 1.3)) : 0, careerIncome: Math.round(pay * rng.float(0.75, 1.3)),
    job: age >= 22 && age < 65 ? title : null, sector, nationality: countryIdOf(state), ...extra,
  };
}

/** Family of origin: two parents, 0–3 siblings and a wealth tier. */
function generateFamily(ctx) {
  const { state, rng } = ctx;
  const age = state.character.age;
  const p = (state.people = { list: [], wealth: rng.weighted([{ id: 'low', w: 38 }, { id: 'middle', w: 52 }, { id: 'upper', w: 10 }], (x) => x.w).id, orientation: null, expecting: null, fund529: {}, arrears: 0, licenseHold: false, alimony: null, prenup: false, will: null, lifeInsurance: {}, foreignContact: null, generated: true });
  const last = state.character.lastName;
  const mom = makePerson(ctx, { relation: 'mother', gender: 'female', age: age + rng.int(20, 40), lastName: last, relationship: rng.int(65, 95) });
  const dad = makePerson(ctx, { relation: 'father', gender: 'male', age: age + rng.int(21, 43), lastName: last, relationship: rng.int(60, 92) });
  p.list.push(mom, dad);
  const siblings = rng.weighted([{ n: 0, w: 22 }, { n: 1, w: 40 }, { n: 2, w: 25 }, { n: 3, w: 13 }], (x) => x.w).n;
  for (let i = 0; i < siblings; i++) p.list.push(makePerson(ctx, { relation: 'sibling', age: Math.max(0, age + rng.int(-8, 10)), lastName: last, relationship: rng.int(45, 85) }));
  // Older characters (migrated saves) may already have lost parents.
  for (const person of p.list) {
    for (let a = age; a > 0 && person.alive; a--) {
      if (rng.chance(backgroundMortality(ageOf(state, person) - (age - a)))) {
        person.alive = false;
        person.diedAge = ageOf(state, person) - (age - a);
      }
    }
  }
}

const preferredGender = (state) => {
  const o = state.people.orientation;
  if (o === 'men') return 'male';
  if (o === 'women') return 'female';
  if (o === 'everyone') return null;
  return state.character.gender === 'male' ? 'female' : 'male';
};

/* ------------------------------------------------------------------ */
/* Yearly life of the people around you                               */
/* ------------------------------------------------------------------ */

export function personDies(ctx, person, cause) {
  const { state } = ctx;
  person.alive = false;
  person.diedAge = ageOf(state, person);
  const label = RELATION_LABEL[person.relation]?.toLowerCase() ?? 'friend';
  ctx.log(`Your ${label} ${person.firstName} died at ${person.diedAge}${cause ? ` (${cause})` : ''}.`, '🕯️', 'bad');
  ctx.stat('happiness', person.relation === 'child' ? -35 : person.relation === 'spouse' ? -25 : ['mother', 'father'].includes(person.relation) ? -12 : -4);
  if (['spouse', 'child', 'mother', 'father'].includes(person.relation)) ctx.emit('health:trauma', { amount: person.relation === 'child' ? 25 : 12, source: 'life' });
  if (person.relation === 'spouse') widowed(ctx, person);
  if (['mother', 'father'].includes(person.relation) && !parentsOf(state).some((x) => x.alive)) lastParentDied(ctx);
}

/** Widowhood: life insurance on your spouse, Social Security survivor benefits and survivor pensions. */
function widowed(ctx, spouse) {
  const { state } = ctx;
  const p = state.people;
  const policy = p.lifeInsurance.spouse;
  if (policy && state.character.age <= policy.endsAge) {
    state.finances.cash += policy.benefit;
    ctx.log(`Life insurance on ${spouse.firstName} paid $${policy.benefit.toLocaleString()}.`, '📜', 'good');
  }
  delete p.lifeInsurance.spouse;
  const survivor = spouseSocialSecurity(spouse);
  const r = state.retirement;
  if (r.socialSecurity) r.socialSecurity.annual = Math.max(r.socialSecurity.annual, survivor);
  else r.survivorBenefit = Math.max(r.survivorBenefit ?? 0, survivor);
  if (spouse.sector === 'public' && ageOf(state, spouse) >= 50) {
    const annual = Math.round(spouse.careerIncome * 0.3 * 0.5);
    ctx.emit('retirement:addPension', { pension: { id: `survivor_${spouse.id}`, label: `Survivor pension (${spouse.firstName})`, annual, startAge: Math.max(state.character.age, 55), source: 'survivor', cola: 0.02 } });
  }
  p.alimony = null;
  if (state.housing.withParents === false && !state.housing.rental && !state.housing.properties.length) state.housing.withParents = state.character.age < 45;
}

/** When your last parent dies, siblings split what they left. */
function lastParentDied(ctx) {
  const { state, rng } = ctx;
  const [lo, hi] = INHERITANCE[state.people.wealth] ?? INHERITANCE.low;
  // Long-term care spends down what parents would have left (see ElderCare).
  const estate = state.people.parentAssets != null ? Math.max(0, Math.min(rng.int(lo, hi), state.people.parentAssets)) : rng.int(lo, hi);
  const heirs = 1 + living(state).filter((x) => x.relation === 'sibling').length;
  const share = Math.round(estate / heirs);
  if (share > 0) {
    state.finances.cash += share;
    ctx.log(`Your parents' estate was settled. Your share: $${share.toLocaleString()}.`, '📜', 'good');
  }
  if (state.housing.withParents && state.character.age >= 18) {
    state.housing.withParents = false;
    ctx.log('With your parents gone, the family home was sold.', '🏚️', 'warn');
  }
}

function mortalityTick(ctx) {
  const { state, rng } = ctx;
  for (const person of living(state)) {
    const age = ageOf(state, person);
    if (age < 0) continue;
    const risk = person.relation === 'child' && age < 18 ? 0.0004 : backgroundMortality(age) * 1.4;
    if (rng.chance(risk)) personDies(ctx, person, age >= 85 ? 'old age' : null);
  }
}

/** Relationships drift down unless you put time in; living together and good times push them up. */
function relationshipTick(ctx) {
  const { state, rng } = ctx;
  const stress = state.stats.stress;
  for (const person of living(state)) {
    if (ageOf(state, person) < 0) continue;
    const tended = yearlyCount(state, `people.time.${person.id}`) > 0;
    let delta = tended ? 0 : -rng.int(1, 4);
    // Family ties fade when neglected but rarely vanish: they settle toward a distant-but-civil 35.
    if (['mother', 'father', 'sibling', 'child'].includes(person.relation) && !tended && person.relationship < 45) delta = Math.round((35 - person.relationship) * 0.25) - rng.int(0, 1);
    if (person.relation === 'child' && ageOf(state, person) < 18 && person.custody !== 'ex') delta += 2;
    if (['spouse', 'partner', 'fiance'].includes(person.relation)) {
      // Shared daily life pulls a couple toward a set point their chemistry decides;
      // stress, deployments, addiction and rough patches push them below it.
      const setPoint = 15 + (person.compatibility ?? 60) * 0.6;
      delta = Math.round((setPoint - person.relationship) * 0.2) + (tended ? 3 : 0) - rng.int(0, 2);
      if (rng.chance(0.08)) delta -= rng.int(10, 30);
      if (stress >= 75) delta -= 4;
      if (state.military.service?.deployedThisYear) delta -= 6;
      // Months at sea or on trips: the relationship runs on phone calls.
      const away = state.career.job ? PROFESSIONS[state.career.job.professionId]?.rotation?.away ?? 0 : 0;
      if (away) delta -= Math.round(away * 6);
      if (state.health?.conditions.some((c) => !c.remission && ['alcohol', 'opioids', 'gambling'].includes(c.id))) delta -= 8;
      if (!state.career.job && !state.retirement.retired && state.character.age < 60 && !['operator', 'executive'].includes(state.business?.current?.role)) delta -= 2;
    }
    person.relationship = clampRel(person.relationship + delta);
  }
}

/** Spouse/partner careers, retirement income and the end of relationships. */
function partnerTick(ctx) {
  const { state, rng } = ctx;
  const partner = partnerOf(state);
  if (!partner) return;
  const age = ageOf(state, partner);
  if (age >= 22 && age < 65) {
    partner.careerIncome = Math.round(partner.careerIncome * rng.float(1.0, 1.03));
    partner.income = partner.job ? partner.careerIncome : 0;
  } else if (age >= 65) {
    partner.income = spouseSocialSecurity(partner) + (partner.sector === 'public' ? Math.round(partner.careerIncome * 0.3) : 0);
    partner.job = null;
  }
  if (partner.relation === 'spouse' && partner.income > 0) {
    ctx.earn(partner.income, `${partner.firstName}'s income`, { ssCovered: false });
    // Their own spending (car, phone, clothes, their own savings) — the rest pools into the household.
    ctx.spend(Math.round(partner.income * SPOUSE_OWN_SPENDING), `${partner.firstName}'s personal spending`, { allowDebt: true });
  }
  // Endings: dating partners drift away; unhappy spouses file.
  if (partner.relation !== 'spouse' && partner.relationship < 25 && rng.chance(0.45)) {
    partner.relation = 'friend';
    partner.circle = 'neighborhood';
    partner.formerPartner = true;
    partner.relationship = clampRel(partner.relationship - 10);
    ctx.log(`${partner.firstName} broke up with you.`, '💔', 'bad');
    ctx.stat('happiness', -8);
  } else if (partner.relation === 'spouse' && partner.relationship < 20 && rng.chance(0.3) && !state.prompts.some((p) => p.type === 'people.divorce')) {
    ctx.prompt({
      type: 'people.divorce',
      icon: '💔',
      title: 'Divorce Papers',
      text: `${partner.firstName} has filed for divorce.`,
      options: [
        { id: 'agree', label: '🤝 Agree to an uncontested divorce', hint: '≈$8,000 in legal fees' },
        { id: 'contest', label: '⚖️ Fight it and try to save the marriage', hint: '≈$25,000; sometimes you reconcile' },
      ],
      data: { personId: partner.id, initiatedBy: 'spouse' },
    });
  }
}

/** Kids grow up: costs, childcare, college degrees and moving out. */
function childrenTick(ctx) {
  const { state, rng } = ctx;
  const region = regionOf(state);
  const working = Boolean(state.career.job) && (!spouseOf(state) || spouseOf(state).income > 0);
  let costs = 0;
  let childcare = 0;
  for (const child of livingChildren(state)) {
    const age = ageOf(state, child);
    if (age === 22 && !child.degree && rng.chance(child.giBill ? 0.75 : 0.2 + (child.traits?.smarts ?? 55) / 250)) child.degree = rng.pick(MAJORS);
    if (age < 18 && child.custody !== 'ex') {
      const share = child.custody === 'joint' ? 0.5 : 1;
      costs += 7000 * share;
      if (working) childcare += (age <= 4 ? 10000 * Math.sqrt(region.col) : age <= 12 ? 2500 : 0) * share;
    }
    if (age === 18) ctx.log(`${child.firstName} turned 18${child.custody === 'ex' ? '' : ' and moved out'}.`, '🎓');
  }
  if (costs) ctx.spend(Math.round(costs), 'Child expenses', { allowDebt: true });
  if (childcare) ctx.spend(Math.round(childcare), 'Childcare', { allowDebt: true });
  // 529s grow with a balanced portfolio.
  const ret = realReturn(state.economy, profileReturn(state.economy, 'balanced'));
  for (const id of Object.keys(state.people.fund529)) state.people.fund529[id] = Math.max(0, Math.round(state.people.fund529[id] * (1 + ret)));
}

/** Child support and alimony after divorce; unpaid support becomes arrears and holds your licenses. */
function supportTick(ctx) {
  const { state } = ctx;
  const p = state.people;
  const income = state.career.job?.salary ?? (state.finances.lastYear?.gross ?? 0) * 0.8;
  const owedKids = minorChildren(state).filter((c) => c.custody === 'ex' || c.custody === 'joint');
  let support = 0;
  if (owedKids.length) {
    const exIncome = byId(state, owedKids[0].otherParentId)?.income ?? 0;
    const full = owedKids.filter((c) => c.custody === 'ex').length;
    const joint = owedKids.length - full;
    const rate = (n) => (n ? Math.min(CHILD_SUPPORT.cap, CHILD_SUPPORT.first + CHILD_SUPPORT.each * (n - 1)) : 0);
    support = income * rate(full) + (income > exIncome ? (income - exIncome) * rate(joint) * 0.5 : 0);
  }
  if (p.alimony && state.character.age <= p.alimony.untilAge) {
    if (p.alimony.pay) support += p.alimony.annual;
    else ctx.earn(p.alimony.annual, 'Alimony received');
  } else p.alimony = null;
  support = Math.round(support);
  if (support > 0) {
    const paid = Math.max(0, Math.min(support, Math.floor(state.finances.cash)));
    if (paid) ctx.spend(paid, 'Child support & alimony');
    if (paid < support) {
      p.arrears += support - paid;
      ctx.log(`You fell $${(support - paid).toLocaleString()} behind on support. Arrears: $${p.arrears.toLocaleString()}.`, '⚖️', 'bad');
    }
  }
  if (p.arrears >= ARREARS_HOLD && !p.licenseHold) {
    const held = HOLD_LICENSES.filter((id) => state.credentials.held[id]?.status === 'active');
    p.licenseHold = held;
    if (held.length) ctx.emit('credential:suspend', { ids: held, years: 99, reason: 'child-support arrears' });
    ctx.log('The state suspended your licenses over unpaid child support.', '🚫', 'bad');
  }
}

/** Unreported foreign contacts surface in reinvestigations. */
function foreignContactTick(ctx) {
  const { state, rng } = ctx;
  const fc = state.people.foreignContact;
  if (!fc || fc.reported || !state.publicService.clearance || !rng.chance(0.15)) return;
  ctx.log('A periodic reinvestigation found you never reported your foreign-national spouse.', '🔎', 'bad');
  fc.reported = true;
  ctx.emit('legal:offense', { offenseId: 'falseStatement', context: 'unreported foreign contact on your SF-86', caught: true, evidence: 0.8 });
  ctx.emit('career:clearanceRevoked', {});
  state.publicService.clearance = null;
}

function births(ctx) {
  const { state, rng } = ctx;
  const p = state.people;
  if (!p.expecting) return;
  const partner = partnerOf(state);
  const gender = rng.pick(['male', 'female']);
  // Not the same first name as anyone already in the family (up to a few tries).
  const taken = new Set([state.character.firstName, ...p.list.map((x) => x.firstName)]);
  let name = randomName(rng, gender);
  for (let i = 0; i < 6 && taken.has(name.firstName); i++) name = randomName(rng, gender);
  const adopted = Boolean(p.expecting.adopted);
  const age = adopted ? rng.int(0, 6) : 0;
  const child = { id: rng.id('per_'), firstName: name.firstName, lastName: state.character.lastName, gender, relation: 'child', ageOffset: age - state.character.age, relationship: 85, alive: true, income: 0, careerIncome: 0, nationality: countryIdOf(state), otherParentId: partner?.id ?? null, custody: 'you', ...(adopted ? { adopted: true } : {}) };
  p.list.push(child);
  p.expecting = null;
  ctx.log(adopted ? `You adopted ${child.firstName}, age ${age}. 🍼` : `${child.firstName} was born! 🍼`, '👶', 'milestone');
  ctx.stat('happiness', 15);
  ctx.stat('stress', 8);
  if (state.career.job && !state.prompts.some((x) => x.type === 'people.parentalLeave')) {
    const job = state.career.job;
    const paidWeeks = job.sector === 'federal' ? 12 : job.sector !== 'private' ? 6 : ['large', 'enterprise'].includes(job.employer.size) ? 8 : 0;
    ctx.prompt({
      type: 'people.parentalLeave',
      icon: '🍼',
      title: 'Parental Leave',
      text: `${job.employer.name} offers ${paidWeeks ? `${paidWeeks} weeks of paid leave` : 'unpaid FMLA leave only'}.`,
      options: [
        { id: 'take', label: '🍼 Take 12 weeks', hint: paidWeeks ? `${paidWeeks} weeks paid` : 'Unpaid' },
        { id: 'short', label: '⏱️ Take two weeks and get back to work' },
      ],
      data: { childId: child.id, paidWeeks },
    });
  }
}

/** Singles sometimes meet someone without looking. */
function meetCute(ctx) {
  const { state, rng } = ctx;
  if (partnerOf(state) || state.character.age < 18 || isIncarcerated(state) || !rng.chance(0.12)) return;
  const candidate = candidates(ctx, 1)[0];
  state.people.pending = [candidate];
  ctx.prompt({
    type: 'people.meetCute',
    icon: '💘',
    title: 'Someone Caught Your Eye',
    text: `You hit it off with ${candidate.firstName}, ${ageOf(state, candidate)}, a ${candidate.job?.toLowerCase() ?? 'student'}${nationalityCode(candidate) !== countryIdOf(state) ? ` from ${nationalityName(candidate)}` : ''}.`,
    options: [
      { id: 'ask', label: '💬 Ask them out' },
      { id: 'pass', label: '🙂 Let it go' },
    ],
  });
}

function candidates(ctx, n) {
  const { state, rng } = ctx;
  const age = state.character.age;
  return Array.from({ length: n }, () => makePerson(ctx, {
    relation: 'candidate', gender: preferredGender(state) ?? rng.pick(['male', 'female']), age: Math.max(age < 18 ? 16 : 18, age + rng.int(-5, 5)),
    relationship: rng.int(35, 60), nationality: rng.chance(0.1) ? rng.pick(NATIONALITIES) : countryIdOf(state), compatibility: rng.int(30, 95),
  }));
}

/* ------------------------------------------------------------------ */
/* Divorce                                                             */
/* ------------------------------------------------------------------ */

export function divorce(ctx, spouse, { contested = false } = {}) {
  const { state, rng } = ctx;
  const p = state.people;
  const yearsMarried = state.character.age - (spouse.since ?? state.character.age);
  ctx.spend(contested ? 25000 : 8000, 'Divorce legal fees', { allowDebt: true });
  // Marital property splits 50/50 unless a prenup protects it.
  const share = p.prenup ? 0.2 : 0.5;
  const cashSplit = Math.max(0, Math.round(state.finances.cash * share));
  state.finances.cash -= cashSplit;
  let assets = cashSplit;
  if (state.investing) {
    for (const h of Object.values(state.investing.holdings)) {
      const part = Math.round(h.value * share);
      h.value -= part;
      h.basis = Math.round(h.basis * (1 - share));
      assets += part;
    }
  }
  const dcGrowth = Math.max(0, state.retirement.dc - (spouse.dcAtMarriage ?? 0));
  const dcSplit = p.prenup ? 0 : Math.round(dcGrowth * 0.5);
  state.retirement.dc -= dcSplit;
  assets += dcSplit;
  const home = state.housing.properties.find((x) => x.use === 'primary');
  if (home && !p.prenup) {
    const equity = Math.max(0, home.value - (home.mortgage?.balance ?? 0) - (home.heloc?.balance ?? 0));
    if (equity > 0) {
      if (state.finances.cash >= equity / 2) ctx.spend(Math.round(equity / 2), 'Home equity buyout');
      else {
        ctx.emit('housing:sell', { propertyId: home.id, reason: 'divorce' });
        ctx.spend(Math.round(equity / 2 * 0.94), "Ex-spouse's share of the house", { allowDebt: true });
      }
      assets += Math.round(equity / 2);
    }
  }
  // Alimony for long marriages with an income gap.
  const income = state.career.job?.salary ?? 0;
  if (yearsMarried >= 10 && Math.abs(income - spouse.income) > 30000) {
    p.alimony = { annual: Math.round(Math.abs(income - spouse.income) * 0.2), untilAge: state.character.age + Math.ceil(yearsMarried / 2), pay: income > spouse.income };
  }
  // Custody of minor children.
  for (const child of minorChildren(state).filter((c) => c.otherParentId === spouse.id || !c.otherParentId)) {
    const record = hasFelony(state) || isIncarcerated(state);
    const addiction = state.health?.conditions.some((c) => !c.remission && ['alcohol', 'opioids'].includes(c.id));
    const roll = rng.float(0, 1) + (record || addiction ? 0.4 : 0) - (child.relationship - 70) / 200;
    child.custody = roll < 0.35 ? 'you' : roll < 0.75 ? 'joint' : 'ex';
    child.otherParentId = spouse.id;
  }
  spouse.relation = 'ex';
  p.divorces = (p.divorces ?? 0) + 1;
  spouse.relationship = clampRel(spouse.relationship - 30);
  p.prenup = false;
  delete p.lifeInsurance.spouse;
  const custodyNote = minorChildren(state).length ? ` Custody: ${minorChildren(state).map((c) => `${c.firstName} — ${{ you: 'with you', joint: 'joint', ex: `with ${spouse.firstName}` }[c.custody]}`).join(', ')}.` : '';
  ctx.log(`Your divorce from ${spouse.firstName} was finalized after ${yearsMarried} years. ${spouse.firstName} received about $${assets.toLocaleString()} in marital property.${p.alimony ? ` Alimony: $${p.alimony.annual.toLocaleString()}/yr ${p.alimony.pay ? 'paid by you' : 'paid to you'}.` : ''}${custodyNote}`, '💔', 'bad');
  ctx.stat('happiness', -15);
  ctx.stat('stress', 15);
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

const LIFE_INSURANCE_RATE = (age) => 0.4 + Math.max(0, age - 30) * 0.12; // $ per $1,000 of coverage per year

export const PeopleEngine = {
  id: 'people',
  order: 8,

  init(state, rng) {
    if (!state.people) generateFamily({ state, rng });
    const p = state.people;
    p.fund529 ??= {};
    p.lifeInsurance ??= {};
    p.arrears ??= 0;
  },

  setup(engine) {
    setStateLookup(stateIdOf);
    const { bus } = engine;
    // Estate settlement when you die; continuing as a child picks up from it.
    bus.on('life:ended', ({ ctx }) => settleEstate(ctx.state));
    engine.continueAsChild = (childId) => {
      const old = engine.state;
      if (!old || old.character.alive) return null;
      const heir = buildHeirState(engine.rng, old, childId);
      if (!heir) return null;
      engine.store.state = heir;
      engine.hydrate(heir);
      engine.commit();
      return heir;
    };
    // Strain from life events.
    const strain = (ctx, amount, partnerLeaves = 0) => {
      const partner = partnerOf(ctx.state);
      if (!partner) return;
      partner.relationship = clampRel(partner.relationship - amount);
      if (partner.relation !== 'spouse' && ctx.rng.chance(partnerLeaves)) {
        partner.relation = 'friend';
        partner.circle = 'neighborhood';
        partner.formerPartner = true;
        ctx.log(`${partner.firstName} ended things.`, '💔', 'bad');
      }
    };
    bus.on('legal:incarcerated', ({ ctx }) => strain(ctx, 25, 0.6));
    bus.on('legal:convicted', ({ ctx, severity }) => severity === 'felony' && strain(ctx, 10));
    bus.on('career:separated', ({ ctx }) => ctx.state.career.history.at(-1)?.fired && strain(ctx, 8));
  },

  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.people) return;
    births(ctx);
    mortalityTick(ctx);
    if (!state.character.alive) return;
    relationshipTick(ctx);
    partnerTick(ctx);
    childrenTick(ctx);
    supportTick(ctx);
    foreignContactTick(ctx);
    const li = state.people.lifeInsurance;
    for (const [who, policy] of Object.entries(li)) {
      if (state.character.age > policy.endsAge) {
        delete li[who];
        ctx.log(`Your ${who === 'self' ? '' : "spouse's "}term life insurance expired.`, '📜');
      } else ctx.spend(policy.premium, 'Life insurance premium', { allowDebt: true });
    }
    meetCute(ctx);
  },

  actions: {
    /** arg: person id — time together. */
    spendTime(ctx, id) {
      const { state, rng } = ctx;
      const person = byId(state, id);
      if (!person?.alive || ageOf(state, person) < 0) return;
      if (yearlyCount(state, `people.time.${id}`)) return ctx.toast('You already made time for them this year.', 'warn');
      bumpYearly(state, `people.time.${id}`);
      // Friends who moved away: a visit costs a trip; otherwise it's a video call.
      if (person.away) {
        const visited = ctx.spend(400, `Visit to ${person.firstName}`, { credit: true });
        person.relationship = clampRel(person.relationship + (visited ? rng.int(6, 12) : rng.int(2, 5)));
        ctx.log(visited ? `You flew out to see ${person.firstName}.` : `You caught up with ${person.firstName} over a long video call.`, visited ? '✈️' : '📱');
        return;
      }
      person.relationship = clampRel(person.relationship + rng.int(5, 12));
      ctx.stat('happiness', 2);
      ctx.log(rng.pick([`You spent a weekend with ${person.firstName}.`, `You and ${person.firstName} got dinner and talked for hours.`, `You took ${person.firstName} on a day trip.`]), '🫶');
    },
    gift(ctx, id) {
      const { state, rng } = ctx;
      const person = byId(state, id);
      if (!person?.alive) return;
      if (yearlyCount(state, `people.gift.${id}`)) return ctx.toast('One gift a year is plenty.', 'warn');
      const cost = rng.int(80, 400);
      if (state.finances.cash < cost) return ctx.toast(`You need $${cost}.`, 'warn');
      bumpYearly(state, `people.gift.${id}`);
      ctx.spend(cost, `Gift for ${person.firstName}`);
      person.relationship = clampRel(person.relationship + rng.int(4, 8));
      ctx.log(`You gave ${person.firstName} a gift ($${cost}).`, '🎁');
    },
    argue(ctx, id) {
      const { state, rng } = ctx;
      const person = byId(state, id);
      if (!person?.alive) return;
      person.relationship = clampRel(person.relationship - rng.int(6, 14));
      ctx.stat('stress', -3);
      ctx.log(`You had it out with ${person.firstName}. Things are tense.`, '😤', 'warn');
    },
    /** Ask parents for help. */
    askForMoney(ctx, id) {
      const { state, rng } = ctx;
      const person = byId(state, id);
      if (!person?.alive || !['mother', 'father'].includes(person.relation)) return;
      if (yearlyCount(state, 'people.ask')) return ctx.toast('You already asked this year.', 'warn');
      bumpYearly(state, 'people.ask');
      const tier = { low: 0.3, middle: 1, upper: 4 }[state.people.wealth] ?? 1;
      if (rng.chance(person.relationship / 130)) {
        const amount = Math.round(rng.int(500, 5000) * tier);
        state.finances.cash += amount;
        person.relationship = clampRel(person.relationship - 3);
        ctx.log(`${person.firstName} lent you $${amount.toLocaleString()}. "Pay it forward someday."`, '💵', 'good');
      } else {
        person.relationship = clampRel(person.relationship - 6);
        ctx.log(`${person.firstName} said no.`, '🙅', 'warn');
      }
    },
    makeFriend(ctx) {
      const { state, rng } = ctx;
      if (state.character.age < 5) return;
      if (yearlyCount(state, 'people.friend')) return ctx.toast('Making friends takes time — try again next year.', 'warn');
      bumpYearly(state, 'people.friend');
      if (circleFriends(state).length >= FRIEND_CAP) return ctx.toast('Your friend circle is full.', 'warn');
      const friend = makePerson(ctx, { relation: 'friend', age: Math.max(5, state.character.age + rng.int(-4, 4)), relationship: rng.int(45, 70), circle: currentCircle(state), metAge: state.character.age });
      state.people.list.push(friend);
      ctx.stat('happiness', 3);
      ctx.log(`You became friends with ${friend.firstName}.`, '🤝', 'good');
    },
    setOrientation(ctx, arg) {
      if (!['men', 'women', 'everyone'].includes(arg)) return;
      ctx.state.people.orientation = arg;
      ctx.toast(`Dating: interested in ${arg}.`, 'info');
    },
    /** Go on dates: three people to choose from. */
    date(ctx) {
      const { state } = ctx;
      if (state.character.age < 16) return ctx.toast('Too young to date.', 'warn');
      if (partnerOf(state)) return ctx.toast('You are already in a relationship.', 'warn');
      if (isIncarcerated(state)) return ctx.toast('Not from in here.', 'warn');
      if (yearlyCount(state, 'people.date')) return ctx.toast('You already tried the apps this year.', 'warn');
      bumpYearly(state, 'people.date');
      const list = candidates(ctx, 3);
      state.people.pending = list;
      ctx.prompt({
        type: 'people.date',
        icon: '💘',
        title: 'First Dates',
        text: 'You went on a few first dates. Anyone worth a second?',
        options: [
          ...list.map((c, i) => ({ id: String(i), label: `${c.gender === 'female' ? '👩' : '👨'} ${c.firstName}, ${ageOf(state, c)} — ${c.job ?? 'student'}`, hint: `Chemistry ${c.compatibility}%${nationalityCode(c) !== countryIdOf(state) ? ` · from ${nationalityName(c)}` : ''}` })),
          { id: 'none', label: '🙅 Nobody clicked' },
        ],
      });
    },
    breakUp(ctx, id) {
      const { state } = ctx;
      const person = byId(state, id);
      if (!person || !['partner', 'fiance'].includes(person.relation)) return;
      person.relation = 'friend';
      person.circle = 'neighborhood';
      person.formerPartner = true;
      person.relationship = clampRel(person.relationship - 25);
      ctx.stat('happiness', -6);
      ctx.log(`You broke up with ${person.firstName}.`, '💔', 'warn');
    },
    propose(ctx, id) {
      const { state, rng } = ctx;
      const person = byId(state, id);
      if (!person || person.relation !== 'partner') return;
      if (state.character.age < 18 || ageOf(state, person) < 18) return ctx.toast('You both need to be 18.', 'warn');
      if (state.character.age - (person.since ?? state.character.age) < 1) return ctx.toast('Give it at least a year.', 'warn');
      if (yearlyCount(state, 'people.propose')) return ctx.toast('You already proposed this year.', 'warn');
      bumpYearly(state, 'people.propose');
      if (rng.chance(clamp((person.relationship - 40) / 50 + (person.compatibility ?? 60) / 300, 0.05, 0.95))) {
        person.relation = 'fiance';
        ctx.stat('happiness', 12);
        ctx.log(`${person.firstName} said yes! 💍`, '💍', 'milestone');
        if (nationalityCode(person) !== 'US') foreignContactPrompt(ctx, person);
      } else {
        person.relationship = clampRel(person.relationship - 15);
        ctx.stat('happiness', -10);
        ctx.log(`${person.firstName} said they aren't ready.`, '💔', 'bad');
      }
    },
    togglePrenup(ctx) {
      const p = ctx.state.people;
      if (!partnerOf(ctx.state) || partnerOf(ctx.state).relation !== 'fiance') return;
      if (!p.prenup && !ctx.spend(2500, 'Prenuptial agreement', { credit: true })) return ctx.toast('A prenup costs $2,500 — card declined.', 'warn');
      p.prenup = !p.prenup;
      ctx.log(p.prenup ? 'You signed a prenup.' : 'You tore up the prenup.', '📝');
    },
    /** arg: courthouse | small | big */
    wed(ctx, kind) {
      const { state } = ctx;
      const person = partnerOf(state);
      const w = WEDDINGS[kind];
      if (!person || person.relation !== 'fiance' || !w) return;
      if (!ctx.spend(w.cost, w.label, { credit: true })) return ctx.toast(`A ${w.label.toLowerCase()} costs $${w.cost.toLocaleString()} — more than your cash and credit.`, 'warn');
      person.relation = 'spouse';
      person.since = state.character.age;
      person.dcAtMarriage = state.retirement.dc;
      state.people.marriages = (state.people.marriages ?? 0) + 1;
      person.relationship = clampRel(person.relationship + (kind === 'big' ? 8 : 4));
      ctx.stat('happiness', kind === 'big' ? 18 : 12);
      ctx.log(`You married ${person.firstName}. ${w.icon}`, '💒', 'milestone');
    },
    fileForDivorce(ctx) {
      const spouse = spouseOf(ctx.state);
      if (!spouse) return;
      divorce(ctx, spouse);
    },
    tryForBaby(ctx) {
      const { state, rng } = ctx;
      const partner = partnerOf(state);
      if (!partner || !['spouse', 'fiance', 'partner'].includes(partner.relation)) return ctx.toast('You need a partner for that.', 'warn');
      if (state.people.expecting) return ctx.toast('A baby is already on the way.', 'warn');
      if (yearlyCount(state, 'people.baby')) return ctx.toast('Keep trying — next year.', 'warn');
      bumpYearly(state, 'people.baby');
      const carrier = state.character.gender === 'female' ? state.character.age : partner.gender === 'female' ? ageOf(state, partner) : null;
      if (carrier == null) return ctx.toast('You two would need to adopt.', 'warn');
      const chance = carrier < 18 ? 0 : carrier < 35 ? 0.55 : carrier < 40 ? 0.35 : carrier < 45 ? 0.1 : 0;
      if (rng.chance(chance)) {
        state.people.expecting = { since: state.character.age };
        ctx.log('You\'re expecting a baby! 🤰', '🤰', 'milestone');
        ctx.stat('happiness', 8);
      } else ctx.log('No luck this year.', '🍃');
    },
    adopt(ctx) {
      const { state } = ctx;
      if (state.character.age < 25) return ctx.toast('Adoptive parents must be 25+.', 'warn');
      if (state.people.expecting) return ctx.toast('A child is already on the way.', 'warn');
      if (hasFelony(state)) return ctx.toast('Agencies won\'t approve applicants with a felony record.', 'warn');
      if (state.finances.cash < 25000) return ctx.toast('Adoption costs about $25,000.', 'warn');
      ctx.spend(25000, 'Adoption fees');
      state.people.expecting = { since: state.character.age, adopted: true };
      ctx.log('Your adoption was approved. Your child comes home next year.', '🏠', 'milestone');
    },
    /** arg: 'childId:amount' */
    contribute529(ctx, arg) {
      const { state } = ctx;
      const [childId, raw] = String(arg).split(':');
      const amount = Number(raw);
      const child = byId(state, childId);
      if (!child?.alive || child.relation !== 'child' || !(amount > 0)) return;
      if (state.finances.cash < amount) return ctx.toast(`You need $${amount.toLocaleString()}.`, 'warn');
      ctx.spend(amount, `529 plan — ${child.firstName}`);
      state.people.fund529[childId] = (state.people.fund529[childId] ?? 0) + amount;
      ctx.log(`You put $${amount.toLocaleString()} into ${child.firstName}'s 529 college fund.`, '🎓');
    },
    /** arg: 'self:250000' | 'spouse:250000' | 'self:0' (cancel) */
    lifeInsurance(ctx, arg) {
      const { state } = ctx;
      const [who, raw] = String(arg).split(':');
      const benefit = Number(raw);
      const li = state.people.lifeInsurance;
      if (!['self', 'spouse'].includes(who)) return;
      if (!benefit) {
        delete li[who];
        return ctx.log('You cancelled the life insurance policy.', '📜');
      }
      const insuredAge = who === 'self' ? state.character.age : spouseOf(state) ? ageOf(state, spouseOf(state)) : null;
      if (insuredAge == null) return ctx.toast('You need a spouse to insure.', 'warn');
      if (insuredAge > 70) return ctx.toast('Term policies end at 70.', 'warn');
      const health = who === 'self' ? state.stats.health : 70;
      const premium = Math.round((benefit / 1000) * LIFE_INSURANCE_RATE(insuredAge) * (health < 50 ? 2 : 1));
      li[who] = { benefit, premium, endsAge: state.character.age + Math.min(30, 75 - insuredAge) };
      ctx.log(`You bought a $${benefit.toLocaleString()} term life policy on ${who === 'self' ? 'yourself' : spouseOf(state).firstName}: $${premium.toLocaleString()}/yr.`, '📜', 'good');
    },
    /** arg: will plan id */
    writeWill(ctx, plan) {
      const { state } = ctx;
      if (!WILL_PLANS[plan]) return;
      if (state.character.age < 18) return ctx.toast('You must be 18 to make a will.', 'warn');
      const first = !state.people.will;
      if (!ctx.spend(first ? 1500 : 300, 'Estate attorney', { credit: true })) return ctx.toast(`The estate attorney charges $${first ? '1,500' : '300'} — card declined.`, 'warn');
      state.people.will = { plan, age: state.character.age };
      ctx.log(`You ${first ? 'made' : 'updated'} your will: ${WILL_PLANS[plan].label.toLowerCase()}.`, '📜');
    },
    payArrears(ctx) {
      const { state } = ctx;
      const p = state.people;
      const amount = Math.min(p.arrears, Math.floor(state.finances.cash));
      if (amount <= 0) return ctx.toast(p.arrears ? 'No cash to pay with.' : 'No arrears.', 'warn');
      ctx.spend(amount, 'Child support arrears');
      p.arrears -= amount;
      if (p.arrears < ARREARS_HOLD && p.licenseHold) {
        if (Array.isArray(p.licenseHold) && p.licenseHold.length) ctx.emit('credential:reinstate', { ids: p.licenseHold, reason: 'child support brought current' });
        p.licenseHold = false;
      }
      ctx.log(`You paid $${amount.toLocaleString()} toward child-support arrears.`, '⚖️');
    },
  },

  resolvers: {
    date(ctx, _data, optionId) {
      const { state } = ctx;
      const chosen = state.people.pending?.[Number(optionId)];
      state.people.pending = null;
      if (!chosen) return ctx.log('No sparks this time.', '🍃');
      startDating(ctx, chosen);
    },
    meetCute(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const chosen = state.people.pending?.[0];
      state.people.pending = null;
      if (optionId !== 'ask' || !chosen) return;
      if (rng.chance(0.65)) startDating(ctx, chosen);
      else ctx.log(`${chosen.firstName} wasn't interested.`, '🍃');
    },
    divorce(ctx, data, optionId) {
      const { state, rng } = ctx;
      const spouse = byId(state, data.personId);
      if (!spouse || spouse.relation !== 'spouse') return;
      if (optionId === 'contest' && rng.chance(0.25) && ctx.spend(6000, 'Marriage counseling', { credit: true })) {
        spouse.relationship = clampRel(spouse.relationship + 30);
        return ctx.log(`Counseling worked. You and ${spouse.firstName} are giving it another try.`, '💞', 'good');
      }
      divorce(ctx, spouse, { contested: optionId === 'contest' });
    },
    parentalLeave(ctx, data, optionId) {
      const { state } = ctx;
      const child = byId(state, data.childId);
      const job = state.career.job;
      if (!job) return;
      if (optionId === 'take') {
        const unpaidWeeks = 12 - data.paidWeeks;
        if (unpaidWeeks > 0) ctx.spend(Math.round((job.salary / 52) * unpaidWeeks), 'Unpaid parental leave', { allowDebt: true });
        ctx.emit('career:adjust', { performance: -4 });
        if (child) child.relationship = clampRel(child.relationship + 8);
        ctx.stat('happiness', 6);
        ctx.log(`You took 12 weeks of parental leave${data.paidWeeks ? ` (${data.paidWeeks} paid)` : ' (unpaid)'}.`, '🍼');
      } else {
        ctx.emit('career:adjust', { performance: 2 });
        ctx.stat('stress', 6);
        ctx.log('You were back at work two weeks later.', '💼');
      }
    },
    foreignContact(ctx, data, optionId) {
      const { state, rng } = ctx;
      const fc = (state.people.foreignContact = { personId: data.personId, reported: optionId === 'report' });
      if (fc.reported) {
        if (rng.chance(0.1) && ['intelligence'].includes(state.career.job?.professionId)) ctx.emit('career:adjust', { performance: -6 });
        ctx.log('You reported your foreign-national fiancé(e) to your security office. The review closed without issue.', '🔐', 'good');
      } else ctx.log('You left your engagement off your security paperwork.', '🤐', 'warn');
    },
  },
};

function startDating(ctx, person) {
  const { state } = ctx;
  person.relation = 'partner';
  person.since = state.character.age;
  person.relationship = clampRel(person.relationship + 10);
  delete person.compatibility;
  state.people.list.push(person);
  ctx.stat('happiness', 8);
  ctx.log(`You started dating ${person.firstName}.`, '💘', 'good');
}

function foreignContactPrompt(ctx, person) {
  const { state } = ctx;
  if (!state.publicService.clearance && !state.career.job?.clearance) return;
  ctx.prompt({
    type: 'people.foreignContact',
    icon: '🔐',
    title: 'Reporting Requirement',
    text: `Clearance holders must report close and continuing contact with foreign nationals. ${person.firstName} is a citizen of ${nationalityName(person)}.`,
    options: [
      { id: 'report', label: '🔐 Report it to your security officer' },
      { id: 'hide', label: '🤐 Keep it off the paperwork', tone: 'danger', hint: 'Lying on an SF-86 is a federal crime' },
    ],
    data: { personId: person.id },
  });
}

