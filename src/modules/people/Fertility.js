/**
 * Fertility and the ways to a family beyond "try for a baby":
 *
 *   Trying       a year without luck counts; after one (six months past 35) a doctor suggests
 *                a fertility workup, which names a cause and the best route
 *   IVF          a cycle a year: success falls steeply with the egg's age (about 50% under 35,
 *                12% at 41–42); about one in five IVF pregnancies is twins. Public health
 *                systems fund some cycles (the NHS, France, Israel, the Nordics); in the US a
 *                few states mandate cover and the rest pay about $20,000 a cycle
 *   Egg freezing eggs frozen young keep their age: an IVF cycle with them succeeds at the
 *                freezing age's rate
 *   Donor eggs   about a 50% cycle up to 50, whatever the carrier's age; donor sperm lets a
 *                single woman (or two women) go through IVF too
 *   Surrogacy    for those who can't carry: commercial in the US (about $150,000) and a few
 *                other places, altruistic only (expenses) in Britain, Canada, Australia,
 *                Ireland and the Netherlands, banned in much of Europe, China and Japan
 *   Adoption     an infant through an agency (one to three years' wait, ~$40,000), from
 *                foster care (fast and nearly free, an older child), or internationally
 *                (two to four years, ~$45,000)
 *
 * state.people.fertility = { tryingYears, workup: { cause, route } | null, frozen: { age, eggs } | null,
 *                            cycles, surrogacy: { dueAge } | null }
 * state.people.expecting gains { dueAge?, twins?, via? }: births wait for dueAge.
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, hasFelony } from '../../core/State.js';
import { partnerOf, ageOf } from './People.js';
import { priceLevel } from '../world/Countries.js';
import { stateIdOf } from '../life/Regions.js';

const cc = (state) => state.character.countryId ?? 'US';
const fert = (state) => (state.people.fertility ??= { tryingYears: 0, workup: null, frozen: null, cycles: 0, surrogacy: null });
const money = (n) => `$${Math.round(n).toLocaleString()}`;

/** Publicly funded IVF cycles per person (roughly; age limits apply). */
const PUBLIC_IVF = { GB: 3, FR: 4, IL: 99, SE: 3, DK: 3, NO: 3, FI: 3, BE: 6, NL: 3, DE: 3, AU: 99, NZ: 2, ES: 3, IT: 3, IE: 1, CA: 1, JP: 6, KR: 3, SG: 3 };
/** US states that mandate insurers cover IVF. */
const IVF_MANDATE = ['MA', 'IL', 'NJ', 'NY', 'CT', 'RI', 'MD', 'CA', 'CO', 'DE', 'NH', 'UT'];
/** Surrogacy law: commercial, altruistic (expenses only) or banned. Unlisted: banned. */
const SURROGACY = {
  US: 'commercial', GE: 'commercial', UA: 'commercial', MX: 'commercial', CO: 'commercial', KZ: 'commercial', RU: 'commercial',
  GB: 'altruistic', CA: 'altruistic', AU: 'altruistic', IE: 'altruistic', NL: 'altruistic', NZ: 'altruistic', BE: 'altruistic', GR: 'altruistic', IL: 'altruistic', PT: 'altruistic', ZA: 'altruistic', IN: 'altruistic',
};

/** Who can carry a pregnancy in this couple (or alone): 'you' | 'partner' | null. */
export function carrierOf(state) {
  if (state.character.gender === 'female') return 'you';
  const p = partnerOf(state);
  return p && p.gender === 'female' ? 'partner' : null;
}
const carrierAge = (state) => (carrierOf(state) === 'you' ? state.character.age : carrierOf(state) === 'partner' ? ageOf(state, partnerOf(state)) : null);

/** IVF success with an egg of this age (own, frozen or donor). */
export function ivfOdds(eggAge) {
  if (eggAge < 35) return 0.5;
  if (eggAge < 38) return 0.4;
  if (eggAge < 41) return 0.25;
  if (eggAge < 43) return 0.12;
  return 0.04;
}

/** What a cycle costs you here: free under a public programme, covered by a state mandate, or full price. */
export function ivfCost(state) {
  const cycles = state.people.fertility?.cycles ?? 0;
  const age = carrierAge(state) ?? state.character.age;
  const pub = PUBLIC_IVF[cc(state)] ?? 0;
  if (pub && cycles < pub && age < (cc(state) === 'IL' ? 45 : 40)) return { amount: 0, why: 'publicly funded' };
  if (cc(state) === 'US' && IVF_MANDATE.includes(stateIdOf(state)) && state.career.job) return { amount: 3000, why: 'covered by your insurance (state mandate)' };
  const base = cc(state) === 'US' ? 20000 : 9000;
  return { amount: Math.round(base * (cc(state) === 'US' ? 1 : priceLevel(state))), why: 'self-paid' };
}

export const surrogacyLaw = (state) => SURROGACY[cc(state)] ?? 'banned';
export const surrogacyCost = (state) => (surrogacyLaw(state) === 'commercial' ? Math.round((cc(state) === 'US' ? 150000 : 60000) * (cc(state) === 'US' ? 1 : Math.max(0.5, priceLevel(state)))) : Math.round(30000 * Math.max(0.5, priceLevel(state))));

export const ADOPTION = {
  infant: { label: 'An infant, through an agency', cost: 40000, wait: [1, 3], age: [0, 0] },
  foster: { label: 'From foster care', cost: 2000, wait: [1, 1], age: [3, 12] },
  international: { label: 'Internationally', cost: 45000, wait: [2, 4], age: [1, 5] },
};

/** A year of trying without luck (called from PeopleEngine.tryForBaby). */
export function noLuck(ctx) {
  const { state } = ctx;
  const f = fert(state);
  f.tryingYears += 1;
  const age = carrierAge(state) ?? 30;
  if (!f.workup && (f.tryingYears >= 2 || (age >= 35 && f.tryingYears >= 1))) ctx.log('A year of trying with no luck. Your doctor suggests a fertility workup.', '🩺', 'info');
}
export const conceived = (state) => { fert(state).tryingYears = 0; };

function expecting(ctx, { via, twins = false, dueIn = 1 }) {
  const { state } = ctx;
  state.people.expecting = { since: state.character.age, dueAge: state.character.age + dueIn, via, ...(twins ? { twins: true } : {}) };
  fert(state).tryingYears = 0;
}

export const FertilityModule = {
  id: 'fertility',
  order: 41.5,
  onAgeUp(ctx) {
    const { state } = ctx;
    const f = state.people.fertility;
    if (!f?.surrogacy || state.people.expecting) return;
    if (state.character.age >= f.surrogacy.matchedAge) {
      f.surrogacy = null;
      expecting(ctx, { via: 'surrogacy', twins: ctx.rng.chance(0.12) });
      ctx.log('The embryo transfer worked: your surrogate is pregnant. The baby is due next year.', '🤰', 'milestone');
    }
  },
  actions: {
    /** A fertility workup: a cause, and the route that's likeliest to work. */
    workup(ctx) {
      const { state, rng } = ctx;
      const f = fert(state);
      if (f.workup) return ctx.toast('You have your results', 'warn');
      const cost = cc(state) === 'US' ? 1500 : 0;
      if (cost && !ctx.spend(cost, 'Fertility workup')) return ctx.toast(`About ${money(cost)}`, 'warn');
      const age = carrierAge(state);
      const cause = age == null ? 'none' : age >= 40 ? 'age' : rng.pick(['ovulation', 'tubal', 'male', 'unexplained', 'unexplained', 'none']);
      const route = { age: 'IVF, ideally with donor eggs', ovulation: 'medication first, then IVF', tubal: 'IVF', male: 'IVF with ICSI', unexplained: 'IVF', none: 'keep trying — the odds are still good' }[cause];
      f.workup = { cause, route };
      if (cause === 'ovulation') f.boost = 0.15;
      return ctx.log(`The fertility clinic's verdict: ${{ age: 'egg reserve is low for your age', ovulation: 'irregular ovulation', tubal: 'blocked fallopian tubes', male: 'a low sperm count', unexplained: 'unexplained infertility', none: 'nothing wrong' }[cause]}. Recommended: ${route}.`, '🩺', 'info');
    },
    /** An IVF cycle. arg: 'own' | 'frozen' | 'donor'. */
    ivf(ctx, kind = 'own') {
      const { state, rng } = ctx;
      const f = fert(state);
      if (state.people.expecting) return ctx.toast('A baby is already on the way', 'warn');
      if (carrierOf(state) == null) return ctx.toast('Neither of you can carry a pregnancy: surrogacy or adoption', 'warn');
      if (yearlyCount(state, 'fertility.ivf')) return ctx.toast('One cycle a year', 'warn');
      const age = carrierAge(state);
      if (age < 21 || age > 50) return ctx.toast('Clinics treat carriers 21 to 50', 'warn');
      if (kind === 'frozen' && !f.frozen?.eggs) return ctx.toast('No frozen eggs', 'warn');
      if (kind === 'own' && age >= 46) return ctx.toast('At this age clinics only use donor eggs', 'warn');
      const price = ivfCost(state);
      const extra = kind === 'donor' ? Math.round(15000 * (cc(state) === 'US' ? 1 : Math.max(0.5, priceLevel(state)))) : 0;
      const total = price.amount + extra;
      if (total && !ctx.spend(total, kind === 'donor' ? 'IVF cycle with donor eggs' : 'IVF cycle')) return ctx.toast(`A cycle costs ${money(total)}`, 'warn');
      bumpYearly(state, 'fertility.ivf');
      f.cycles += 1;
      if (kind === 'frozen') f.frozen.eggs -= 1;
      const eggAge = kind === 'donor' ? 28 : kind === 'frozen' ? f.frozen.age : age;
      const odds = clamp(ivfOdds(eggAge) + (f.boost ?? 0) * 0.3 - (age >= 45 && kind !== 'own' ? 0.1 : 0), 0.02, 0.6);
      ctx.stat('stress', 8);
      if (rng.chance(odds)) {
        const twins = rng.chance(0.2);
        expecting(ctx, { via: 'ivf', twins });
        ctx.stat('happiness', 12);
        return ctx.log(`The IVF cycle worked${twins ? ' — and the scan shows twins' : ''}! ${price.amount === 0 && !extra ? 'The cycle was publicly funded.' : ''} 🤰`, '🤰', 'milestone');
      }
      ctx.stat('happiness', -6);
      return ctx.log(`The IVF cycle didn't work${f.cycles > 1 ? `, the ${f.cycles}th attempt` : ''}. The odds per cycle were about ${Math.round(odds * 100)}%.`, '💔', 'bad');
    },
    /** Freeze your eggs (women 25–40). */
    freezeEggs(ctx) {
      const { state } = ctx;
      const age = state.character.age;
      if (state.character.gender !== 'female' || age < 25 || age > 40) return ctx.toast('Women 25 to 40', 'warn');
      if (fert(state).frozen) return ctx.toast('Your eggs are already frozen', 'warn');
      const cost = Math.round((cc(state) === 'US' ? 15000 : 5000) * (cc(state) === 'US' ? 1 : Math.max(0.5, priceLevel(state))));
      if (!ctx.spend(cost, 'Egg freezing')) return ctx.toast(`About ${money(cost)}`, 'warn');
      fert(state).frozen = { age, eggs: 3 };
      ctx.stat('stress', 3);
      return ctx.log(`You froze your eggs at ${age}: enough for about three IVF attempts, each at a ${age}-year-old's odds.`, '❄️', 'info');
    },
    /** A surrogate carries for you. */
    surrogacy(ctx) {
      const { state, rng } = ctx;
      const f = fert(state);
      const law = surrogacyLaw(state);
      if (law === 'banned') return ctx.toast('Surrogacy is illegal here', 'warn');
      if (state.people.expecting || f.surrogacy) return ctx.toast('Already under way', 'warn');
      if (state.character.age < 21) return ctx.toast('21+', 'warn');
      const cost = surrogacyCost(state);
      if (!ctx.spend(cost, law === 'commercial' ? 'Surrogacy agency, surrogate\'s fee and IVF' : 'Surrogate\'s expenses and IVF')) return ctx.toast(`About ${money(cost)}`, 'warn');
      const wait = law === 'commercial' ? rng.int(1, 2) : rng.int(2, 3);
      f.surrogacy = { matchedAge: state.character.age + wait };
      return ctx.log(law === 'commercial' ? `You signed with a surrogacy agency. Matching with a surrogate and the transfer take about ${wait} year${wait > 1 ? 's' : ''}.` : `Paying a surrogate is illegal here, but a woman may carry for expenses: the search for an altruistic surrogate can take ${wait} years.`, '🤝', 'info');
    },
    /** Adopt. arg: 'infant' | 'foster' | 'international'. */
    adopt(ctx, route = 'infant') {
      const { state, rng } = ctx;
      const r = ADOPTION[route];
      if (!r) return ctx.toast('Unknown route', 'warn');
      if (state.character.age < (route === 'foster' ? 21 : 25)) return ctx.toast(`Adoptive parents must be ${route === 'foster' ? 21 : 25}+`, 'warn');
      if (state.people.expecting) return ctx.toast('A child is already on the way', 'warn');
      if (hasFelony(state)) return ctx.toast('Agencies won\'t approve applicants with a felony record', 'warn');
      const cost = Math.round(r.cost * (cc(state) === 'US' ? 1 : Math.max(0.4, priceLevel(state))));
      if (!ctx.spend(cost, `Adoption (${route})`)) return ctx.toast(`About ${money(cost)}`, 'warn');
      const wait = rng.int(r.wait[0], r.wait[1]);
      state.people.expecting = { since: state.character.age, dueAge: state.character.age + wait, adopted: true, via: route, childAge: rng.int(r.age[0], r.age[1]) };
      return ctx.log(route === 'foster' ? 'You were approved as foster-to-adopt parents. A child will be placed with you next year.' : `Your home study was approved. The wait for ${route === 'infant' ? 'a birth mother\'s match' : 'a referral from abroad'} is about ${wait} year${wait > 1 ? 's' : ''}.`, '🏠', 'milestone');
    },
  },
};
