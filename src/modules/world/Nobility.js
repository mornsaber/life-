/**
 * A titled (not royal) family's life: the estate, the money, and what a peer's family does.
 *
 *   The estate      the family seat ("Ashby Hall") and its land, held by the title-holder. Run it
 *                   as a farm, let it out, open it to the public, host weddings and film crews, or
 *                   rewild it; every strategy pays something and the house costs a fortune to keep.
 *   Allowance       until you inherit, the family trust pays you an allowance from 18 (less for a
 *                   younger child than for the heir)
 *   Succession      when you inherit, inheritance tax falls due on the estate: pay it, sell land,
 *                   or open the house to the public for the conditional exemption
 *   Society         shooting parties, the Season's balls (where matches are made), county charities,
 *                   the deputy lieutenancy; a title opens doors — boards, clubs, introductions
 *   Heirlooms       a few great pictures and pieces: sell one at auction when money is tight (the
 *                   family will not forgive you)
 *   Spain           a duke is a Grandee of Spain (Grande de España): "Excelentísimo Señor"
 *
 * state.noble.estate = { name, value, strategy, owner: 'family' | 'you' | null, heirlooms, exemptUntil }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { RANKS } from './Peerage.js';
import { makePerson } from '../people/PeopleEngine.js';

const RANK_ORDER = ['baron', 'viscount', 'earl', 'marquess', 'duke'];
const ESTATE_VALUE = { baron: 2.5e6, viscount: 4e6, earl: 7e6, marquess: 12e6, duke: 30e6 };
const ALLOWANCE = { baron: 18000, viscount: 25000, earl: 40000, marquess: 60000, duke: 110000 };
const HOUSE = { baron: 'Hall', viscount: 'House', earl: 'Park', marquess: 'Court', duke: 'Castle' };
const HOUSE_ES = { baron: 'Casa', viscount: 'Casa', earl: 'Palacio', marquess: 'Palacio', duke: 'Castillo' };
/** Each way of running the estate: yield on its value a year, and what it does to you. */
export const STRATEGIES = {
  farm: { label: '🚜 Farm it in hand', yield: 0.022, desc: 'Steady, unglamorous' },
  let: { label: '🏘️ Let the farms and cottages', yield: 0.026, desc: 'Tenants pay; you deal with them' },
  open: { label: '🎟️ Open the house to the public', yield: 0.032, desc: 'Tourists in the state rooms; counts for the tax exemption' },
  events: { label: '💒 Weddings, festivals and film shoots', yield: 0.04, desc: 'The best money, and the most stress' },
  rewild: { label: '🦫 Rewild the land', yield: 0.012, desc: 'Beavers and grants; the neighbours grumble' },
};
const UPKEEP = 0.018;
export const INHERITANCE_TAX = { rate: 0.4, threshold: 500000 };

const rankOf = (state) => state.noble?.rank;
const female = (state) => state.character.gender === 'female';

/** The estate, made when first needed (older saves and new noble births alike). */
export function estateOf(state) {
  const n = state.noble;
  if (!n) return null;
  if (n.estate === undefined) {
    const es = state.character.countryId === 'ES';
    n.estate = { name: es ? `${HOUSE_ES[n.rank]} de ${n.place}` : `${n.place} ${HOUSE[n.rank]}`, value: ESTATE_VALUE[n.rank], strategy: 'farm', owner: 'family', heirlooms: 1 + RANK_ORDER.indexOf(n.rank), exemptUntil: null };
  }
  return n.estate;
}
/** Do you hold the title (and so the estate)? */
const holder = (state) => state.character.peerage?.kind === 'hereditary';
const grandee = (state) => state.character.countryId === 'ES' && rankOf(state) === 'duke';

/** A noble family's year: allowance or estate income, succession, the house. */
function nobilityYear(ctx) {
  const { state, rng } = ctx;
  const n = state.noble;
  if (!n || !state.character.alive) return;
  const e = estateOf(state);
  const age = state.character.age;
  // Succession: you now hold the title, and with it the estate — and the tax bill.
  if (holder(state) && e.owner === 'family' && !n.disclaimed) {
    e.owner = 'you';
    const tax = Math.max(0, Math.round((e.value - INHERITANCE_TAX.threshold) * INHERITANCE_TAX.rate));
    ctx.prompt({
      type: 'nobility.succession', icon: '🏰', title: `${e.name} Is Yours`,
      text: `With the title comes ${e.name} and its land (worth about $${Math.round(e.value).toLocaleString()}). Inheritance tax of about $${tax.toLocaleString()} falls due.`,
      options: [
        { id: 'pay', label: '💰 Pay it in full', hint: `$${tax.toLocaleString()}` },
        { id: 'sell', label: '🌾 Sell land to pay it', hint: 'The estate shrinks by half' },
        { id: 'exempt', label: '🎟️ Open the house to the public for the exemption', hint: 'No tax — but the public are in your house for 10 years' },
      ],
      data: { tax },
    });
    return;
  }
  if (e.owner === 'you') {
    // The estate pays (or doesn't), and the roof always needs mending.
    const s = STRATEGIES[e.strategy] ?? STRATEGIES.farm;
    const swing = rng.float(-0.006, 0.006) + (state.economy?.phase === 'recession' ? -0.006 : 0);
    const net = Math.round(e.value * (s.yield + swing - UPKEEP));
    if (net >= 0) ctx.earn(net, `${e.name} estate income`);
    else ctx.spend(-net, `${e.name}: upkeep beyond what the estate earns`, { allowDebt: true });
    e.value = Math.round(e.value * (1 + rng.float(-0.01, 0.03)));
    if (e.strategy === 'events') ctx.stat('stress', 4);
    if (e.strategy === 'rewild') ctx.stat('happiness', 2);
    if (e.strategy === 'open') state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + 1);
    if (rng.chance(0.08)) {
      const bill = Math.round(e.value * rng.float(0.01, 0.03));
      ctx.spend(bill, `${e.name}: ${rng.pick(['the roof', 'dry rot in the west wing', 'storm damage to the estate woods', 'rewiring the house'])}`, { allowDebt: true });
      ctx.log(`${e.name} needed urgent repairs: $${bill.toLocaleString()}.`, '🏚️', 'warn');
    }
    if (e.exemptUntil && age >= e.exemptUntil) { e.exemptUntil = null; ctx.log('The tax exemption\'s public-access conditions have run their course: the house can close again if you wish.', '🎟️', 'info'); }
    return;
  }
  // Before you inherit: the family trust's allowance.
  if (age >= 18 && e.owner === 'family') {
    const a = Math.round(ALLOWANCE[n.rank] * (n.heir ? 1 : 0.5));
    ctx.earn(a, 'Allowance from the family trust');
  }
}

export const NobilityModule = {
  id: 'nobility',
  order: 33.7,
  onAgeUp(ctx) {
    nobilityYear(ctx);
  },
  actions: {
    /** A shooting party (or a hunt ball): the county comes, and so do useful people. */
    shoot(ctx) {
      const { state, rng } = ctx;
      if (!state.noble || state.character.age < 18) return ctx.toast('From 18, in a titled family', 'warn');
      if (yearlyCount(state, 'nobility.party')) return ctx.toast('Once a year', 'warn');
      const cost = Math.round(8000 + RANK_ORDER.indexOf(rankOf(state)) * 6000);
      if (!ctx.spend(cost, 'Shooting party and dinner', { credit: true })) return ctx.toast('You can\'t afford it', 'warn');
      bumpYearly(state, 'nobility.party');
      state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + 4);
      ctx.stat('happiness', 5);
      if (rng.chance(0.4)) {
        state.people.list.push(makePerson(ctx, { relation: 'friend', gender: rng.pick(['male', 'female']), age: state.character.age + rng.int(-10, 15), relationship: 60, circle: 'society' }));
        return ctx.log('A shooting party at the estate: a minister, a banker and a newspaper editor came, and one of them is now a friend.', '🎯', 'good');
      }
      return ctx.log('A shooting party at the estate: good birds, a long lunch and a longer dinner.', '🎯', 'good');
    },
    /** The Season: balls, Ascot, Henley — where matches are still made. */
    season(ctx) {
      const { state, rng } = ctx;
      const age = state.character.age;
      if (!state.noble || age < 18 || age > 32) return ctx.toast('18 to 32', 'warn');
      if (yearlyCount(state, 'nobility.season')) return ctx.toast('Once a year', 'warn');
      if (!ctx.spend(6000, 'The Season: balls, Ascot, Henley', { credit: true })) return ctx.toast('You can\'t afford it', 'warn');
      bumpYearly(state, 'nobility.season');
      ctx.stat('happiness', 6);
      ctx.stat('stress', -3);
      const single = !(state.people?.list ?? []).some((p) => p.alive !== false && ['spouse', 'partner', 'fiance'].includes(p.relation));
      if (single && rng.chance(0.45)) {
        state.people.list.push(makePerson(ctx, { relation: 'partner', gender: female(state) ? 'male' : 'female', age: age + rng.int(-3, 4), relationship: 65, since: age }));
        return ctx.log('At a ball in the Season you danced all night with someone from another old family. You\'re seeing each other now.', '💃', 'good');
      }
      return ctx.log('The Season: a blur of balls, regattas and racing. The gossip columns mentioned you twice.', '🎩', 'good');
    },
    /** The family's patronage of a county cause: the hospice, the cathedral, the cricket club. */
    patron(ctx) {
      const { state, rng } = ctx;
      const n = state.noble;
      if (!n || state.character.age < 21) return ctx.toast('From 21, in a titled family', 'warn');
      if (yearlyCount(state, 'nobility.patron')) return ctx.toast('One a year', 'warn');
      bumpYearly(state, 'nobility.patron');
      const cause = rng.pick(['the county hospice', 'the cathedral restoration appeal', 'the agricultural show', 'the air ambulance', 'the county cricket club', 'a children\'s charity', 'the local museum']);
      n.patronages = [...(n.patronages ?? []), cause].slice(-6);
      ctx.spend(5000, `Donation: ${cause}`, { allowDebt: true });
      state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + 3);
      return ctx.log(`You became patron of ${cause}. Speeches, garden parties and a cheque.`, '🎗️', 'good');
    },
    /** How the estate is run. arg: strategy id. */
    strategy(ctx, arg) {
      const { state } = ctx;
      const e = estateOf(state);
      if (!e || e.owner !== 'you') return ctx.toast('Once the estate is yours', 'warn');
      if (!STRATEGIES[arg]) return undefined;
      if (e.exemptUntil && arg !== 'open') return ctx.toast(`The tax exemption keeps the house open until you're ${e.exemptUntil}`, 'warn');
      if (yearlyCount(state, 'nobility.strategy')) return ctx.toast('One change a year', 'warn');
      bumpYearly(state, 'nobility.strategy');
      e.strategy = arg;
      return ctx.log(`${e.name}: ${STRATEGIES[arg].label.replace(/^\S+ /, '')}.`, '🏰', 'info');
    },
    /** Sell one of the great pieces at auction. */
    heirloom(ctx) {
      const { state, rng } = ctx;
      const e = estateOf(state);
      if (!e || state.character.age < 18) return undefined;
      if (e.owner !== 'you') return ctx.toast('The heirlooms belong to the title-holder', 'warn');
      if (!e.heirlooms) return ctx.toast('Nothing left worth selling', 'warn');
      e.heirlooms -= 1;
      const piece = rng.pick(['a Gainsborough portrait of the 3rd Earl', 'a Canaletto view of Venice', 'the Chinese porcelain', 'a Stubbs racehorse', 'the library\'s first folio', 'a set of Chippendale chairs']);
      const price = Math.round(e.value * rng.float(0.05, 0.2) / 1000) * 1000;
      ctx.earn(price, `Auction: ${piece}`);
      for (const p of state.people?.list ?? []) if (p.alive !== false && ['mother', 'father', 'sibling'].includes(p.relation)) p.relationship = clamp((p.relationship ?? 60) - 12, 0, 100);
      return ctx.log(`You sold ${piece} at auction for $${price.toLocaleString()}. The family will not forget it.`, '🖼️', 'warn');
    },
    /** Sell the family seat. */
    sellEstate(ctx) {
      const { state } = ctx;
      const e = estateOf(state);
      if (!e || e.owner !== 'you') return ctx.toast('The estate isn\'t yours to sell', 'warn');
      if (e.exemptUntil) return ctx.toast('Selling would claw back the exempted tax', 'warn');
      const price = Math.round(e.value * 0.9);
      ctx.earn(price, `Sale of ${e.name}`);
      e.owner = null;
      ctx.stat('happiness', -8);
      for (const p of state.people?.list ?? []) if (p.alive !== false && ['mother', 'father', 'sibling', 'child'].includes(p.relation)) p.relationship = clamp((p.relationship ?? 60) - 20, 0, 100);
      return ctx.log(`You sold ${e.name} for $${price.toLocaleString()}. After centuries, the family no longer lives there. You keep the title.`, '🏚️', 'milestone');
    },
  },
  resolvers: {
    succession(ctx, data, optionId) {
      const { state } = ctx;
      const e = estateOf(state);
      if (!e) return undefined;
      if (optionId === 'pay') {
        ctx.spend(data.tax, 'Inheritance tax on the estate', { allowDebt: true });
        return ctx.log(`You paid the inheritance tax: $${data.tax.toLocaleString()}. The estate is whole.`, '💰', 'info');
      }
      if (optionId === 'sell') {
        e.value = Math.round(e.value / 2);
        e.heirlooms = Math.max(0, e.heirlooms - 1);
        return ctx.log('You sold half the land and a painting to pay the tax. The house stands, smaller in its park.', '🌾', 'warn');
      }
      e.strategy = 'open';
      e.exemptUntil = state.character.age + 10;
      return ctx.log('You agreed to open the house and its collection to the public for the conditional exemption: no tax, and coach parties in the state rooms every summer.', '🎟️', 'info');
    },
  },
};

/** For the view. */
export const nobleAllowance = (state) => (state.noble ? Math.round(ALLOWANCE[state.noble.rank] * (state.noble.heir ? 1 : 0.5)) : 0);
export const isGrandee = grandee;
export const rankName = (state) => RANKS[rankOf(state)]?.[female(state) ? 'female' : 'male'] ?? '';
