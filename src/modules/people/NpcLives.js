/**
 * The lives of the people around you: family, friends and exes go to school,
 * graduate, get jobs and raises, get laid off, retire, rent and buy homes,
 * and build (or lose) savings — whether or not you're watching.
 *
 * person.life = {
 *   edu         none | highschool | trade | associate | bachelor | master | professional | doctorate
 *   studying    { degree, until } | null   (age they finish)
 *   home        { kind: own|rent|parents|withYou|dorm|yourRental|care, type?, value?, mortgage?, propertyId? }
 *   netWorth    savings and home equity
 *   car         what they drive
 *   employer    where they work
 * }
 * person.job / income / careerIncome / sector stay where PeopleEngine keeps them.
 *
 * You can help: rent them one of your places, help with a down payment, or
 * pay a year of tuition.
 */
import { clamp, Random } from '../../core/Random.js';
import { ageOf, living, byId, clampRel } from './People.js';
import { priceOf, marketRent } from '../realestate/PropertyMarket.js';
import { rentableUnits } from '../realestate/Landlording.js';

export const EDU_LABEL = {
  none: 'No diploma', highschool: 'High school', trade: 'Trade school', associate: "Associate's", bachelor: "Bachelor's", master: "Master's", professional: 'Professional degree', doctorate: 'PhD',
};
const EDU_RANK = { none: 0, highschool: 1, trade: 2, associate: 2, bachelor: 3, master: 4, professional: 5, doctorate: 5 };
const STUDY_YEARS = { trade: 2, associate: 2, bachelor: 4, master: 2, professional: 3, doctorate: 5 };

/** [title, pay, sector, education needed] */
export const NPC_JOBS = [
  ['Barista', 30000, 'private', 'none'], ['Cashier', 29000, 'private', 'none'], ['Warehouse associate', 38000, 'private', 'none'], ['Line cook', 34000, 'private', 'none'],
  ['Retail manager', 52000, 'private', 'highschool'], ['Delivery driver', 42000, 'private', 'highschool'], ['Administrative assistant', 44000, 'private', 'highschool'], ['Bank teller', 38000, 'private', 'highschool'],
  ['Police officer', 72000, 'public', 'highschool'], ['Firefighter', 66000, 'public', 'highschool'], ['Mail carrier', 56000, 'public', 'highschool'], ['Truck driver', 58000, 'private', 'highschool'],
  ['Electrician', 64000, 'private', 'trade'], ['Plumber', 62000, 'private', 'trade'], ['HVAC technician', 58000, 'private', 'trade'], ['Welder', 52000, 'private', 'trade'], ['Auto mechanic', 50000, 'private', 'trade'],
  ['Dental hygienist', 82000, 'private', 'associate'], ['Paralegal', 55000, 'private', 'associate'], ['Respiratory therapist', 74000, 'private', 'associate'], ['Chef', 46000, 'private', 'associate'],
  ['Teacher', 62000, 'public', 'bachelor'], ['Nurse', 82000, 'private', 'bachelor'], ['Accountant', 78000, 'private', 'bachelor'], ['Software developer', 120000, 'private', 'bachelor'], ['Engineer', 105000, 'private', 'bachelor'],
  ['Social worker', 54000, 'public', 'bachelor'], ['Graphic designer', 58000, 'private', 'bachelor'], ['Realtor', 60000, 'private', 'bachelor'], ['Marketing manager', 98000, 'private', 'bachelor'], ['Financial analyst', 92000, 'private', 'bachelor'],
  ['School principal', 105000, 'public', 'master'], ['Physical therapist', 98000, 'private', 'master'], ['Nurse practitioner', 125000, 'private', 'master'], ['Data scientist', 135000, 'private', 'master'],
  ['Lawyer', 145000, 'private', 'professional'], ['Doctor', 240000, 'private', 'professional'], ['Pharmacist', 132000, 'private', 'professional'], ['Dentist', 175000, 'private', 'professional'],
  ['Professor', 95000, 'public', 'doctorate'], ['Research scientist', 110000, 'private', 'doctorate'],
];
const EMPLOYERS = ['the county', 'a regional hospital', 'a local school district', 'a national retailer', 'a tech company', 'a family-owned shop', 'a big logistics firm', 'the state', 'a bank', 'a small firm downtown', 'a startup', 'a construction company'];
const CARS = ['a used sedan', 'a pickup truck', 'an SUV', 'a minivan', 'an electric car', 'a beat-up hatchback', 'a luxury sedan', 'a motorcycle'];
const HOME_TYPES = ['condo', 'starter', 'starter', 'family', 'family', 'townhouse'];

/** Their own random stream, so other people's lives don't reshuffle yours. */
function lifeRng(state) {
  const p = state.people;
  p.lifeSeed = (((p.lifeSeed ?? (state.character.birthYear ?? 1) * 7919) * 1664525) + 1013904223) >>> 0;
  return new Random(p.lifeSeed);
}

const LIVES = ['mother', 'father', 'sibling', 'partner', 'fiance', 'spouse', 'ex', 'child', 'friend'];
/** Jobs the game already manages: working for you, owning your old business, or a spouse's career (PeopleEngine). */
const managedJob = (p) => /family business|^Owner, /.test(p.job ?? '');
const isPartner = (p) => ['partner', 'fiance', 'spouse'].includes(p.relation);

function jobFor(rng, edu, smarts = 55) {
  const rank = EDU_RANK[edu] ?? 0;
  // Most people work at (or just below) their education level; brighter ones reach the top of it.
  const fits = NPC_JOBS.filter(([, , , need]) => EDU_RANK[need] <= rank && EDU_RANK[need] >= rank - 1 - (rng.chance(0.25) ? 1 : 0));
  const pool = fits.length ? fits : NPC_JOBS.filter(([, , , need]) => EDU_RANK[need] <= rank);
  const sorted = [...pool].sort((a, b) => a[1] - b[1]);
  const lean = clamp((smarts - 30) / 70, 0, 1);
  return sorted[Math.min(sorted.length - 1, Math.floor(rng.float(lean * 0.4, 0.6 + lean * 0.4) * sorted.length))];
}

const eduFromJob = (title) => NPC_JOBS.find((j) => j[0] === title)?.[3] ?? null;

/** Pick an education for someone who is already an adult. */
function pastEducation(rng, age, p) {
  const known = eduFromJob(p.job);
  if (known) return known;
  if (p.degree) return 'bachelor';
  if (age < 18) return 'none';
  return rng.weighted([{ e: 'none', w: 9 }, { e: 'highschool', w: 36 }, { e: 'trade', w: 10 }, { e: 'associate', w: 10 }, { e: 'bachelor', w: 24 }, { e: 'master', w: 8 }, { e: 'professional', w: 2 }, { e: 'doctorate', w: 1 }], (x) => x.w).e;
}

function homeValue(state, home) {
  return Math.round(priceOf(state, home.type, state.character.regionId) * (home.valueAdj ?? 1));
}

/** A first look at someone's life: fills in what PeopleEngine didn't track. */
export function ensureLife(rng, state, p) {
  if (p.life) return p.life;
  const age = ageOf(state, p);
  const life = { edu: age < 18 ? 'none' : pastEducation(rng, age, p), studying: null, home: null, netWorth: 0, car: null, employer: null };
  p.life = life;
  if (age >= 22 && age < 65 && p.job && !managedJob(p) && !isPartner(p)) life.employer = rng.pick(EMPLOYERS);
  const income = p.income || p.careerIncome || 40000;
  const tier = { low: 0.4, middle: 1, upper: 3.5 }[state.people?.wealth] ?? 1;
  if (age >= 25) life.netWorth = Math.round(income * Math.min(8, (age - 22) / 6) * rng.float(0.2, 1.2) * (['mother', 'father'].includes(p.relation) ? tier : 1));
  if (age >= 17) life.car = rng.pick(CARS);
  life.home = startingHome(rng, state, p, age, life);
  return life;
}

function startingHome(rng, state, p, age, life) {
  if (p.relation === 'child' && age < 18) return { kind: p.custody === 'ex' ? 'withEx' : 'withYou' };
  if (p.relation === 'spouse' || p.relation === 'fiance') return { kind: 'withYou' };
  if (age < 18) return { kind: 'parents' };
  if (age >= 82 && rng.chance(0.3)) return { kind: 'care' };
  const ownOdds = age < 25 ? 0.05 : age < 35 ? 0.35 : age < 55 ? 0.62 : 0.78;
  if (rng.chance(ownOdds)) {
    const type = age >= 60 && rng.chance(0.3) ? 'condo' : rng.pick(HOME_TYPES);
    const home = { kind: 'own', type, valueAdj: Math.round(rng.float(0.85, 1.15) * 100) / 100 };
    home.value = homeValue(state, home);
    home.mortgage = Math.round(home.value * clamp(0.85 - (age - 30) * 0.03, 0, 0.8));
    life.netWorth += home.value - home.mortgage;
    return home;
  }
  return { kind: age < 24 && rng.chance(0.4) ? 'parents' : 'rent' };
}

const close = (p) => p.relationship >= 55 && ['mother', 'father', 'sibling', 'child', 'spouse', 'partner', 'fiance', 'friend'].includes(p.relation);

/** One year of someone's life. */
function yearOf(ctx, p) {
  const { state, rng } = ctx;
  const age = ageOf(state, p);
  if (age < 0) return;
  const life = ensureLife(rng, state, p);
  const say = (text, icon, kind) => close(p) && ctx.log(text, icon, kind);
  const recession = state.economy?.phase === 'recession';

  // School and graduation (a college degree PeopleEngine already handed out counts).
  if (p.degree && EDU_RANK[life.edu] < EDU_RANK.bachelor && !life.studying) life.edu = 'bachelor';
  if (age === 18 && life.edu === 'none' && rng.chance(0.9)) life.edu = 'highschool';
  if (age === 18 && !life.studying && life.edu === 'highschool') {
    const smarts = p.traits?.smarts ?? rng.int(30, 85);
    const r = rng.next();
    const college = 0.15 + smarts / 160 + (p.relation === 'child' && state.people.fund529?.[p.id] ? 0.15 : 0);
    if (r < college) life.studying = { degree: 'bachelor', until: age + STUDY_YEARS.bachelor };
    else if (r < college + 0.15) life.studying = { degree: rng.pick(['trade', 'associate']), until: age + 2 };
    if (life.studying) {
      if (life.studying.degree === 'bachelor' && p.relation === 'child') life.home = { kind: 'dorm' };
      say(`${p.firstName} started ${life.studying.degree === 'bachelor' ? 'college' : life.studying.degree === 'trade' ? 'trade school' : 'community college'}.`, '🎒');
    }
  }
  if (life.studying && age >= life.studying.until) {
    life.edu = life.studying.degree;
    if (life.edu === 'bachelor' && p.relation === 'child') p.degree ??= rng.pick(['business', 'education', 'biology', 'economics', 'nursing', 'computerScience']);
    say(`${p.firstName} graduated — ${EDU_LABEL[life.edu].toLowerCase()}! 🎓`, '🎓', 'good');
    life.studying = null;
    life.netWorth -= life.edu === 'bachelor' ? (p.tuitionPaid ? 0 : 30000) : 8000; // student loans
    if (life.home?.kind === 'dorm') life.home = { kind: 'rent' };
    // Some go on to graduate school.
    const smarts = p.traits?.smarts ?? 55;
    if (life.edu === 'bachelor' && rng.chance(0.12 + smarts / 500)) {
      const degree = rng.weighted([{ d: 'master', w: 7 }, { d: 'professional', w: 2 }, { d: 'doctorate', w: 1 }], (x) => x.w).d;
      life.studying = { degree, until: age + STUDY_YEARS[degree] };
      say(`${p.firstName} was accepted to ${degree === 'professional' ? 'law/medical school' : degree === 'doctorate' ? 'a PhD program' : 'a master\'s program'}.`, '📚', 'good');
    }
  }

  // Work.
  const working = !managedJob(p) && !life.studying && age >= 18 && age < 70;
  if (working && !p.retired) {
    if (!p.job && rng.chance(recession ? 0.45 : 0.75)) {
      const [title, pay, sector] = jobFor(rng, life.edu, p.traits?.smarts);
      p.job = title;
      p.sector = sector;
      p.careerIncome = Math.round(pay * rng.float(0.8, 1.05) * (1 + Math.max(0, age - 25) * 0.01));
      if (!isPartner(p)) p.income = p.careerIncome;
      life.employer = rng.pick(EMPLOYERS);
      say(`${p.firstName} got a job as ${/^[AEIOU]/i.test(title) ? 'an' : 'a'} ${title.toLowerCase()} at ${life.employer}.`, '💼', 'good');
    } else if (p.job) {
      if (rng.chance(recession ? 0.07 : 0.025)) {
        say(`${p.firstName} was laid off from ${life.employer ?? 'work'}.`, '📦', 'warn');
        p.job = null;
        if (!isPartner(p)) p.income = 0;
      } else if (rng.chance(0.07)) {
        p.careerIncome = Math.round(p.careerIncome * rng.float(1.08, 1.18));
        if (!isPartner(p)) p.income = p.careerIncome;
        say(`${p.firstName} got promoted at ${life.employer ?? 'work'}.`, '📈', 'good');
      } else if (!isPartner(p)) {
        p.careerIncome = Math.round(p.careerIncome * rng.float(1.0, 1.04));
        p.income = p.careerIncome;
      }
    }
  }
  // Retirement.
  if (!p.retired && age >= 62 && !managedJob(p) && (age >= 70 || rng.chance(age >= 67 ? 0.4 : 0.15))) {
    p.retired = true;
    if (p.job) say(`${p.firstName} retired${life.employer ? ` from ${life.employer}` : ''}.`, '🏖️', 'good');
    p.job = null;
    if (!isPartner(p)) p.income = Math.round(Math.min(45000, (p.careerIncome || 30000) * 0.4));
  }

  // Money: people save a slice of what they earn; markets move what they have.
  const ret = recession ? -0.08 : 0.05;
  life.netWorth = Math.round(life.netWorth * (life.netWorth > 0 ? 1 + ret * 0.6 : 1.05) + (p.income || 0) * (p.retired ? -0.15 : 0.08));

  homeYear(ctx, p, age, life, say);
}

function homeYear(ctx, p, age, life, say) {
  const { state, rng } = ctx;
  const home = life.home ?? (life.home = { kind: 'rent' });
  if (p.relation === 'child' && age < 18) {
    home.kind = p.custody === 'ex' ? 'withEx' : 'withYou';
    return;
  }
  if (p.relation === 'spouse' || p.relation === 'fiance') {
    life.home = { kind: 'withYou' };
    return;
  }
  // Your adult children move out (or back in).
  if (home.kind === 'withYou' || home.kind === 'withEx') life.home = { kind: age < 22 && rng.chance(0.4) ? 'parents' : 'rent' };
  if (home.kind === 'yourRental' && !state.housing.properties.some((x) => x.id === home.propertyId && (x.tenants ?? []).some((t) => t.personId === p.id))) life.home = { kind: 'rent' };
  if (home.kind === 'own') {
    const value = homeValue(state, home);
    life.netWorth += value - (home.value ?? value);
    home.value = value;
    if (home.mortgage > 0) {
      const paid = Math.min(home.mortgage, Math.round(home.value * 0.025));
      home.mortgage -= paid;
      life.netWorth += Math.round(paid * 0.3);
    }
    // Downsizing in old age, or into care.
    if (age >= 80 && rng.chance(0.08)) {
      life.home = { kind: 'care' };
      say(`${p.firstName} sold the house and moved into assisted living.`, '🏥');
    } else if (life.netWorth < -50000 && rng.chance(0.3)) {
      say(`${p.firstName} lost the house to foreclosure.`, '🏚️', 'bad');
      life.home = { kind: 'rent' };
    }
    return;
  }
  if (home.kind === 'rent' || home.kind === 'parents') {
    if (home.kind === 'parents' && age >= 22 && p.income > 30000 && rng.chance(0.4)) {
      life.home = { kind: 'rent' };
      say(`${p.firstName} moved into their own apartment.`, '🔑');
      return;
    }
    const type = p.income > 120000 ? 'family' : rng.pick(HOME_TYPES);
    const price = priceOf(state, type, state.character.regionId);
    const down = price * 0.1;
    if (age >= 24 && age < 70 && p.income > price / 5.5 && life.netWorth >= down && rng.chance(0.18)) {
      life.home = { kind: 'own', type, valueAdj: 1, value: Math.round(price), mortgage: Math.round(price * 0.9) };
      life.netWorth -= Math.round(price * 0.03);
      say(`${p.firstName} bought ${/^[aeiou]/i.test(type) ? 'an' : 'a'} ${HOME_NAME[type] ?? 'home'}.`, '🏡', 'good');
    }
  }
}

const HOME_NAME = { condo: 'condo', starter: 'starter home', family: 'family home', townhouse: 'townhouse', luxury: 'luxury home' };

/** "Owns a family home ($540,000)", "Rents an apartment", … */
export function homeLabel(p) {
  const h = p.life?.home;
  if (!h) return null;
  switch (h.kind) {
    case 'own': return `owns a ${HOME_NAME[h.type] ?? 'home'} ($${Math.round(h.value / 1000)}k)`;
    case 'rent': return 'rents';
    case 'parents': return 'lives with their parents';
    case 'withYou': return 'lives with you';
    case 'withEx': return 'lives with your ex';
    case 'dorm': return 'in the dorms';
    case 'yourRental': return 'rents from you';
    case 'care': return 'in assisted living';
    default: return null;
  }
}

/** Someone you could rent to: an adult relative or friend who rents or lives with their parents. */
export const canHouse = (state, p) => p.alive && ageOf(state, p) >= 18 && ['rent', 'parents'].includes(p.life?.home?.kind) && !isPartner(p);

/** Your properties with a free unit. */
export const vacancies = (state) => state.housing.properties.filter((x) => !x.project && rentableUnits({ ...x, use: x.use === 'vacant' ? 'rental' : x.use }) > (x.tenants ?? []).length && x.use !== 'primary' && x.use !== 'vacation');

export const NpcLives = {
  id: 'npcLives',
  order: 8.5,

  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.people || !state.character.alive) return;
    const sub = { ...ctx, rng: lifeRng(state) };
    for (const p of living(state)) if (LIVES.includes(p.relation)) yearOf(sub, p);
  },

  actions: {
    /** arg: "personId:propertyId" — they move into one of your places at a family discount. */
    offerHome(ctx, arg) {
      const { state } = ctx;
      const rng = lifeRng(state);
      const [pid, propId] = String(arg).split(':');
      const p = byId(state, pid);
      const prop = vacancies(state).find((x) => x.id === propId);
      if (!p || !prop) return;
      ensureLife(rng, state, p);
      if (!canHouse(state, p)) return ctx.toast(`${p.firstName} isn't looking for a place.`, 'warn');
      const rent = Math.round(marketRent(state, prop.type, prop.regionId) * 0.8);
      if (prop.use === 'vacant') prop.use = 'rental';
      prop.tenants = [...(prop.tenants ?? []), { name: p.firstName, rent, reliability: 0.97, personId: p.id }];
      p.life.home = { kind: 'yourRental', propertyId: prop.id };
      p.relationship = clampRel(p.relationship + 10);
      ctx.log(`${p.firstName} moved into your ${prop.typeName} at a family rate ($${rent.toLocaleString()}/mo).`, '🔑', 'good');
    },
    /** arg: personId — help with a down payment on their first home. */
    helpBuy(ctx, pid) {
      const { state } = ctx;
      const rng = lifeRng(state);
      const p = byId(state, pid);
      if (!p?.alive) return;
      ensureLife(rng, state, p);
      if (!['rent', 'parents', 'yourRental'].includes(p.life.home?.kind) || ageOf(state, p) < 21) return ctx.toast(`${p.firstName} isn't in a position to buy.`, 'warn');
      const type = (p.income ?? 0) > 100000 ? 'family' : 'starter';
      const price = Math.round(priceOf(state, type, state.character.regionId));
      const gift = Math.round(price * 0.1);
      if (state.finances.cash < gift) return ctx.toast(`A down payment is about $${gift.toLocaleString()}.`, 'warn');
      ctx.spend(gift, `Down payment help — ${p.firstName}`);
      const plan = state.people.plan;
      if (plan && ['child', 'sibling', 'mother', 'father'].includes(p.relation)) plan.gifts[p.id] = (plan.gifts[p.id] ?? 0) + gift;
      if (plan) plan.exemptionUsed += Math.max(0, gift - 19000);
      p.life.home = { kind: 'own', type, valueAdj: 1, value: price, mortgage: price - gift };
      p.relationship = clampRel(p.relationship + 15);
      ctx.stat('happiness', 3);
      ctx.log(`You gave ${p.firstName} $${gift.toLocaleString()} toward a ${HOME_NAME[type]}. They got the keys this year.`, '🏡', 'good');
    },
    /** arg: personId — pay this year's tuition for someone in school. */
    payTuition(ctx, pid) {
      const { state } = ctx;
      const rng = lifeRng(state);
      const p = byId(state, pid);
      if (!p?.alive) return;
      ensureLife(rng, state, p);
      if (!p.life.studying) return ctx.toast(`${p.firstName} isn't in school.`, 'warn');
      if (state.yearly[`npc.tuition.${pid}`]) return ctx.toast('Already paid this year.', 'warn');
      const cost = p.life.studying.degree === 'bachelor' ? 14000 : p.life.studying.degree === 'professional' ? 45000 : 9000;
      if (!ctx.spend(cost, `Tuition — ${p.firstName}`, { credit: true })) return ctx.toast(`Tuition is $${cost.toLocaleString()}.`, 'warn');
      state.yearly[`npc.tuition.${pid}`] = 1;
      p.tuitionPaid = true;
      p.relationship = clampRel(p.relationship + 6);
      ctx.log(`You paid ${p.firstName}'s tuition this year ($${cost.toLocaleString()}). One less loan.`, '🎓', 'good');
    },
  },
};

