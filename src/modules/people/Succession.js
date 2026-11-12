/**
 * Succession: property passing in kind, under the law of its day (world/SuccessionLaw.js).
 *
 *   Your death      a house left to someone (realestate/Title.js leaveTo) goes to them whole;
 *                   a home held jointly goes to your spouse by survivorship; the will's shares
 *                   are cut back to the children's reserved portion where the law has one, or
 *                   replaced by the fixed Islamic shares. Playing on as your child, the family
 *                   home comes with the brothers and sisters who share it: buy them out, keep it
 *                   together, or sell and split.
 *   Their deaths    when your last parent dies, the family home may come to you and your
 *                   siblings — whole to the eldest son under primogeniture (landed families in
 *                   England before 1925) or customary law, twice a daughter's share for a son
 *                   under Islamic law. A will that cuts someone out can be contested.
 *   Your spouse     a home held jointly is yours alone when they die.
 *
 * Its own random stream: the rest of the year rolls as it always did.
 */
import { Random } from '../../core/Random.js';
import { living, livingChildren, spouseOf, fullName, byId, ageOf, clampRel } from './People.js';
import { successionLaw, lawfulShares } from '../world/SuccessionLaw.js';
import { titleOf, passesBySurvivorship } from '../realestate/Title.js';
import { PROPERTY_TYPES, priceOf } from '../realestate/PropertyMarket.js';
import { yearNow } from '../world/Eras.js';
import { REGIONS } from '../life/Regions.js';

const srng = (state) => {
  state.succession ??= {};
  state.succession.seed = ((state.succession.seed ?? (((state.world?.seed ?? 3) * 2654435761) >>> 0)) * 1664525 + 1013904223) >>> 0;
  return new Random(state.succession.seed);
};
const equityOf = (p) => Math.max(0, Math.round((p.value ?? 0) - (p.mortgage?.balance ?? 0) - (p.heloc?.balance ?? 0) - (p.project?.loan?.balance ?? 0)));

/* ---------------------------------------------------------------- your death */

/** The will's division as the law of the day allows it: [{ to, label, share }]. */
export function lawfulHeirShares(state, willShares) {
  const law = successionLaw(state);
  if (law.family === 'common') return willShares;
  const spouse = spouseOf(state);
  const kids = livingChildren(state);
  if (!spouse && !kids.length) return willShares;
  const label = (id) => (id === 'charity' ? 'Charity' : fullName(byId(state, id) ?? { firstName: '?', lastName: '' }));
  const plan = state.people?.will?.plan;
  const shares = lawfulShares(state, {
    spouse: spouse?.id ?? null, spouseGender: spouse?.gender, children: kids.map((k) => ({ id: k.id, gender: k.gender })),
    will: state.people?.will ? { shares: willShares.filter((s) => s.to !== 'state'), charity: plan === 'charity' } : null,
  });
  return shares.map((s) => ({ ...s, label: label(s.to) }));
}

/** Specific bequests of property, ahead of the will's shares: [{ property, to, amount }]. */
export function propertyBequests(state) {
  return (state.housing?.properties ?? []).filter((p) => !passesBySurvivorship(state, p) && titleOf(p).leaveTo && byId(state, titleOf(p).leaveTo)?.alive)
    .map((p) => ({ property: p, to: titleOf(p).leaveTo, amount: Math.round(equityOf(p) * (titleOf(p).share ?? 1)) }));
}

/** Playing on as your child: the houses that come to them in kind, and the family home to settle with the others. */
export function passProperties(old, s, child, legacy) {
  const out = [];
  let owed = 0;
  for (const b of legacy.bequests.filter((x) => x.propertyId && x.to === child.id)) {
    const p = old.housing.properties.find((x) => x.id === b.propertyId);
    if (!p) continue;
    out.push(inherited(p, old, s.character.age));
    owed += b.amount;
  }
  // The family home not left to anyone: shared by the residual heirs, if you're one of them.
  const home = old.housing.properties.find((p) => p.use === 'primary' && !passesBySurvivorship(old, p) && !titleOf(p).leaveTo && p.id !== old.dynasty?.seat?.propertyId);
  const residual = legacy.bequests.filter((x) => !x.designated && !x.inKind && !x.propertyId && x.to !== 'state' && x.to !== 'charity');
  const total = residual.reduce((a, x) => a + x.amount, 0);
  const mine = residual.filter((x) => x.to === child.id).reduce((a, x) => a + x.amount, 0);
  if (home && total > 0 && mine > 0) {
    const share = Math.round((mine / total) * 1000) / 1000;
    const others = residual.filter((x) => x.to !== child.id).map((x) => ({ name: x.label.split(' (')[0], share: Math.round((x.amount / total) * 1000) / 1000 }));
    s.succession = { ...(s.succession ?? {}), familyHome: { property: inherited(home, old, s.character.age), equity: equityOf(home), share, others } };
  }
  s.housing.properties.push(...out);
  // With no home of your own in that town, the house you were left becomes it.
  const where = s.character.regionId;
  if (!s.housing.properties.some((p) => p.use === 'primary')) {
    const home = out.find((p) => p.regionId === where && p.use === 'vacant' && PROPERTY_TYPES[p.type]?.kind !== 'land');
    if (home) { home.use = 'primary'; s.housing.withParents = false; s.housing.rental = null; }
  }
  // A house you were left was counted in your inheritance as money: it's the house instead.
  s.finances.cash -= Math.min(Math.max(0, s.finances.cash), owed);
  return out;
}
function inherited(p, old, age) {
  const q = structuredClone(p);
  q.title = { form: 'sole', share: 1, with: null, leaveTo: null, how: 'inherited', since: age, from: `${old.character.firstName} ${old.character.lastName}` };
  // An inherited house takes a stepped-up basis: its value at the death.
  q.purchasePrice = Math.round(p.value);
  q.purchaseAge = age;
  q.tenants = q.tenants ?? [];
  // It was their home, not yet yours: empty until you move in, rent it or sell it.
  if (q.use === 'primary') q.use = 'vacant';
  return q;
}

/** The first year as the heir: what to do with the family home you share with the others. */
export function familyHomePrompt(ctx) {
  const fh = ctx.state.succession?.familyHome;
  if (!fh || fh.asked) return;
  fh.asked = true;
  const p = fh.property;
  const yours = Math.round(fh.equity * fh.share);
  const buyout = fh.equity - yours;
  const names = fh.others.map((o) => o.name).join(' and ') || 'the estate';
  ctx.prompt({
    type: 'succession.familyHome', icon: '🏡', title: 'The Family Home',
    text: `The ${p.typeName.toLowerCase()} you grew up in is now shared: ${Math.round(fh.share * 100)}% is yours, the rest belongs to ${names}. Your share of it was counted in what you inherited.`,
    data: {},
    options: [
      { id: 'buyout', label: `🔑 Buy the others out ($${buyout.toLocaleString()})`, hint: 'It\'s yours alone', disabled: ctx.state.finances.cash < fh.equity },
      { id: 'share', label: '🤝 Keep it together, as co-owners', hint: 'Live there; a sale one day is split' },
      { id: 'sell', label: '🪧 Sell it and split the money', hint: 'Nothing changes: you have your share already' },
    ],
  });
}

/* ---------------------------------------------------------------- your parents' and spouse's deaths */

/** How likely a family of this means owned its home, in its day. */
function ownedOdds(state, wealth) {
  const y = yearNow(state);
  const base = y < 1900 ? 0.35 : y < 1940 ? 0.45 : y < 1970 ? 0.6 : 0.68;
  return Math.min(0.95, base * ({ low: 0.5, middle: 1.1, upper: 1.5 }[wealth] ?? 1));
}

/**
 * Your last parent has died: their house (if they owned one) and the rest, divided under the law.
 * Returns true when it handled the estate (PeopleEngine's cash share is then skipped).
 */
export function parentsEstate(ctx, cash) {
  const { state } = ctx;
  const rng = srng(state);
  const law = successionLaw(state);
  const sibs = living(state).filter((p) => p.relation === 'sibling');
  const me = { id: 'you', gender: state.character.gender, age: state.character.age };
  const kids = [me, ...sibs.map((p) => ({ id: p.id, gender: p.gender, age: ageOf(state, p) }))];
  const eldestSon = kids.filter((k) => k.gender === 'male').sort((a, b) => b.age - a.age)[0] ?? null;
  const wealth = state.people.wealth ?? 'low';
  const landed = law.primogeniture && wealth === 'upper';
  // The house, if they owned it: a family home where they lived, at today's prices there.
  const regionId = state.character.birthRegion ?? state.character.regionId;
  const type = wealth === 'upper' ? (landed ? 'mansion' : 'luxury') : wealth === 'middle' ? 'family' : 'starter';
  const owned = REGIONS[regionId] && PROPERTY_TYPES[type] && rng.chance(ownedOdds(state, wealth));
  const houseValue = owned ? Math.round(priceOf(state, type, regionId) * (0.7 + rng.float(0, 0.4))) : 0;
  // Who gets what: the law of the day.
  let shares;
  if (landed || law.family === 'customary') shares = eldestSon ? kids.map((k) => ({ to: k.id, share: k.id === eldestSon.id ? (landed ? 0.8 : 1) : landed ? 0.2 / (kids.length - 1 || 1) : 0 })) : null;
  else if (law.family === 'islamic') { const units = kids.reduce((a, k) => a + (k.gender === 'male' ? 2 : 1), 0); shares = kids.map((k) => ({ to: k.id, share: (k.gender === 'male' ? 2 : 1) / units })); }
  shares ??= kids.map((k) => ({ to: k.id, share: 1 / kids.length }));
  // Sometimes a parent's will cut someone out (where the law lets it): that can be fought.
  const contested = law.family === 'common' && kids.length > 1 && rng.chance(0.08);
  if (contested) {
    const out = rng.pick(kids);
    const rest = kids.filter((k) => k !== out);
    shares = kids.map((k) => ({ to: k.id, share: k === out ? 0 : 1 / rest.length }));
    state.succession.contest = { out: out.id, age: state.character.age, value: cash + houseValue };
  }
  const mine = shares.find((x) => x.to === 'you')?.share ?? 0;
  const money = Math.round(cash * mine);
  if (money > 0) state.finances.cash += money;
  const why = landed && eldestSon ? (eldestSon.id === 'you' ? ' As the eldest son you took the estate, as the law of entail requires; your brothers and sisters had portions.' : ` The estate went to the eldest son, ${byId(state, eldestSon.id)?.firstName ?? 'your brother'}, by primogeniture.`)
    : law.family === 'customary' && eldestSon ? (eldestSon.id === 'you' ? ' By custom the family land is now yours to hold for the family.' : ` By custom the family land went to ${byId(state, eldestSon.id)?.firstName ?? 'your eldest brother'}.`)
      : law.family === 'islamic' && kids.length > 1 ? ' It was divided by the farāʾiḍ: a son\'s share twice a daughter\'s.' : '';
  if (houseValue && mine > 0) {
    const p = { id: rng.id('prop_'), type, typeName: PROPERTY_TYPES[type].name, regionId, value: houseValue, valueAdj: 1, purchasePrice: houseValue, purchaseAge: state.character.age, condition: rng.int(40, 80), use: 'vacant', mortgage: null, heloc: null, tenants: [], insured: true, floodInsured: false,
      title: { form: mine >= 0.999 ? 'sole' : 'common', share: Math.round(mine * 1000) / 1000, with: null, leaveTo: null, how: 'inherited', since: state.character.age, from: 'your parents', coOwners: shares.filter((x) => x.to !== 'you' && x.share > 0).map((x) => ({ name: byId(state, x.to)?.firstName ?? 'a sibling', share: Math.round(x.share * 1000) / 1000 })) } };
    state.succession.parentsHome = { property: p, asked: false };
    ctx.log(`Your parents' estate was settled.${money ? ` Your share of their savings: $${money.toLocaleString()}.` : ''} Their ${p.typeName.toLowerCase()} is ${mine >= 0.999 ? 'yours' : `${Math.round(mine * 100)}% yours`}.${why}`, '📜', 'good');
    ctx.prompt({
      type: 'succession.parentsHome', icon: '🏡', title: 'Your Parents\' House',
      text: `Worth about $${houseValue.toLocaleString()}${mine < 0.999 ? `, ${Math.round(mine * 100)}% of it yours` : ''}. What will you do with it?`,
      data: {},
      options: [
        { id: 'move', label: '🏡 Move in', hint: 'Live where you grew up' },
        { id: 'rent', label: '🔑 Keep it and rent it out', hint: 'An income, and upkeep' },
        { id: 'sell', label: '🪧 Sell it', hint: `About $${Math.round(houseValue * mine * 0.93).toLocaleString()} to you` },
      ],
    });
  } else if (money > 0 || why) ctx.log(`Your parents' estate was settled.${money ? ` Your share: $${money.toLocaleString()}.` : ' You were left nothing.'}${why}`, '📜', money ? 'good' : 'info');
  if (contested) {
    const out = state.succession.contest.out;
    if (out === 'you') ctx.prompt({ type: 'succession.contest', icon: '⚖️', title: 'Cut Out of the Will', text: 'Your parent\'s will left you nothing. A lawyer thinks you have a claim.', data: { value: cash + houseValue, heirs: kids.length }, options: [{ id: 'contest', label: '⚖️ Contest the will', hint: 'Costs money; family will take sides' }, { id: 'accept', label: '🕊️ Let it go' }] });
    else { const p = byId(state, out); if (p) { p.relationship = clampRel((p.relationship ?? 50) - 25); ctx.log(`${p.firstName} was cut out of the will, and blames the rest of you.`, '💔', 'bad'); } }
  }
  return true;
}

/** Your spouse has died: a home you held jointly is now yours alone. */
export function spouseDied(ctx, spouse) {
  for (const p of ctx.state.housing?.properties ?? []) {
    const t = titleOf(p);
    if (t.form === 'joint' && t.with === spouse.id) { p.title = { ...t, form: 'sole', with: null }; ctx.log(`Your ${p.typeName.toLowerCase()} is yours alone now: it passed to you by survivorship.`, '📜', 'info'); }
  }
}

export const SuccessionModule = {
  id: 'succession',
  order: 16.5,
  init(state) { state.succession ??= {}; },
  onAgeUp(ctx) { familyHomePrompt(ctx); },
  resolvers: {
    familyHome(ctx, data, optionId) {
      const { state } = ctx;
      const fh = state.succession?.familyHome;
      if (!fh) return;
      const p = fh.property;
      if (optionId === 'buyout' && ctx.spend(fh.equity, 'Bought the family home from the other heirs')) {
        state.housing.properties.push(p);
        if (!state.housing.properties.some((x) => x.use === 'primary' && x !== p)) { p.use = 'primary'; state.housing.withParents = false; state.housing.rental = null; }
        ctx.log(`The family home is yours alone now: you bought the others out.`, '🔑', 'milestone');
      } else if (optionId === 'share' || optionId === 'buyout') {
        if (!ctx.spend(Math.round(fh.equity * fh.share), 'Your share of the family home, kept in the house')) return ctx.log('You couldn\'t keep your share in the house; it was sold.', '🪧', 'info');
        p.title = { ...p.title, form: 'common', share: fh.share, coOwners: fh.others };
        state.housing.properties.push(p);
        if (!state.housing.properties.some((x) => x.use === 'primary' && x !== p)) { p.use = 'primary'; state.housing.withParents = false; state.housing.rental = null; }
        ctx.log(`You kept the family home together with ${fh.others.map((o) => o.name).join(' and ') || 'the others'}, and live in it.`, '🤝', 'good');
      } else ctx.log('The family home was sold and the money split.', '🪧', 'info');
      state.succession.familyHome = null;
    },
    parentsHome(ctx, data, optionId) {
      const { state } = ctx;
      const ph = state.succession?.parentsHome;
      if (!ph) return;
      const p = ph.property;
      const share = p.title.share ?? 1;
      if (optionId === 'sell') {
        const net = Math.round(p.value * share * 0.93);
        state.finances.cash += net;
        ctx.log(`You sold your parents' house: $${net.toLocaleString()} was yours.`, '🪧', 'info');
      } else {
        p.use = optionId === 'move' && !state.housing.properties.some((x) => x.use === 'primary') ? 'primary' : 'rental';
        state.housing.properties.push(p);
        if (p.use === 'primary') { state.housing.withParents = false; state.housing.rental = null; state.character.regionId = p.regionId; }
        ctx.log(p.use === 'primary' ? 'You moved into the house you grew up in.' : 'You kept your parents\' house and let it.', p.use === 'primary' ? '🏡' : '🔑', 'good');
      }
      state.succession.parentsHome = null;
    },
    contest(ctx, data, optionId) {
      const { state, rng } = ctx;
      if (optionId !== 'contest') return ctx.log('You let it go. Some things matter more than money.', '🕊️', 'info');
      if (!ctx.spend(8000, 'Lawyer: contesting the will', { credit: true })) return ctx.toast('A lawyer wants $8,000 up front.', 'warn');
      for (const p of living(state).filter((x) => x.relation === 'sibling')) p.relationship = clampRel((p.relationship ?? 50) - 15);
      if (rng.chance(0.45)) {
        const award = Math.round((data.value / data.heirs) * 0.8);
        state.finances.cash += award;
        ctx.log(`The court set the will aside: you were awarded $${award.toLocaleString()}. Your brothers and sisters haven't forgiven you.`, '⚖️', 'good');
      } else ctx.log('The court upheld the will. The fight cost you money, and your family.', '⚖️', 'bad');
    },
  },
};
