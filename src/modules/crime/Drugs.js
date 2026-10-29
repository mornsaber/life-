/**
 * The drug trade, as a supply chain.
 *
 *   Source      Buy from a connect — an ounce-level street connect, a wholesaler (needs a name on
 *               the street), or import by the hundred kilos (needs an outfit or a very big name).
 *               Or produce: a grow house (cannabis), a meth lab (fires and fumes), a pill press
 *               (counterfeit pills pressed with fentanyl).
 *   Process     Cut it: more weight, lower purity, more complaints. Or stretch it with fentanyl:
 *               twice the weight and customers who stop breathing.
 *   Distribute  Sell hand to hand (retail money, retail risk), sell weight to other dealers
 *               (less money, less risk, more informants), or put runners on corners. Runners
 *               sell all year, take a cut, get arrested — and some of them flip. Territory is the
 *               share of the local market you hold; outfits notice.
 *   Money       All of it is dirty (StreetCrime's dirty money): spend it and the tax authority
 *               notices, launder it and laundering is a crime of its own.
 *   The law     What you're charged with depends on the weight you're caught with, and the
 *               country's drug laws scale the sentence — to death in Singapore, Saudi Arabia,
 *               China and others.
 *
 * Prices are per kilo in US terms, scaled by where you are: cheap where it's produced, dear
 * in Australia, Japan and the Gulf, and converted to local money.
 *
 * state.legal.crime.drugs = { product, stash, purity, runners, territory, lab, laced, shipment, sold }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { commitOffense } from '../legal/JusticeSystem.js';
import { crimeOf } from '../legal/StreetCrime.js';
import { meOf, outfitsHere } from '../legal/Underworld.js';
import { priceLevel } from '../world/Countries.js';
import { drugLawHere } from './CrimeWorld.js';
import { lifestyleOf } from '../health/Lifestyle.js';

export const PRODUCTS = {
  cannabis: { label: 'Cannabis', icon: '🌿', wholesale: 2500, retail: 7000, origin: ['MX', 'CO', 'MA', 'TH', 'CA', 'US'], harm: 0, lab: 'grow' },
  cocaine: { label: 'Cocaine', icon: '❄️', wholesale: 25000, retail: 70000, origin: ['CO', 'PE', 'BO'], harm: 0.004 },
  heroin: { label: 'Heroin', icon: '💉', wholesale: 45000, retail: 120000, origin: ['AF', 'MM', 'MX'], harm: 0.02 },
  meth: { label: 'Methamphetamine', icon: '🧪', wholesale: 7000, retail: 40000, origin: ['MX', 'MM', 'CN'], harm: 0.006, lab: 'cook' },
  mdma: { label: 'MDMA (ecstasy)', icon: '💊', wholesale: 9000, retail: 35000, origin: ['NL', 'BE'], harm: 0.002 },
  fentanyl: { label: 'Fentanyl pills', icon: '☠️', wholesale: 12000, retail: 150000, origin: ['MX', 'CN'], harm: 0.06, lab: 'press' },
};
export const LABS = {
  grow: { label: 'Grow house', icon: '🌱', product: 'cannabis', cost: 20000, yield: 12, risk: 0.08, hazard: 0.01, text: 'a rented house full of lights and the smell you can never quite air out' },
  cook: { label: 'Meth lab', icon: '🧪', product: 'meth', cost: 35000, yield: 15, risk: 0.1, hazard: 0.08, text: 'a trailer in the woods with blacked-out windows and the fumes that eat your teeth' },
  press: { label: 'Pill press', icon: '⚙️', product: 'fentanyl', cost: 25000, yield: 8, risk: 0.1, hazard: 0.02, text: 'a garage with a pill press and precursors shipped in as "industrial chemicals"' },
};
/** Buying: how much, and the name on the street you need to be trusted with it. */
export const BUYS = {
  ounce: { label: 'A few ounces', kg: 0.25, rep: 0, markup: 1.6 },
  kilo: { label: 'Two kilos', kg: 2, rep: 25, markup: 1.2 },
  weight: { label: 'Twenty kilos', kg: 20, rep: 50, markup: 1 },
};
const MARKET = { AU: 2.4, NZ: 2, JP: 2.6, SG: 2.5, KR: 2.2, AE: 2.2, SA: 2.4, QA: 2.2, GB: 1.3, IE: 1.3, FR: 1.2, DE: 1.2, NL: 0.8, BE: 0.9, ES: 0.9, IT: 1.1, SE: 1.5, NO: 1.6, CH: 1.5, CA: 1.1 };
const CUSTOMS = { AU: 0.2, NZ: 0.2, SG: 0.35, JP: 0.25, US: 0.15, GB: 0.15, CN: 0.2, AE: 0.25 };

export const drugsOf = (state) => (crimeOf(state).drugs ??= { product: null, stash: 0, purity: 1, runners: 0, territory: 0, lab: null, laced: false, shipment: null, sold: 0 });
const cc = (state) => state.character.countryId ?? 'US';
const origin = (state, product) => PRODUCTS[product].origin.includes(cc(state));
/** Price per kilo here: wholesale (to buy) or retail (on the street). */
export function priceHere(state, product, kind = 'wholesale') {
  const p = PRODUCTS[product];
  const m = origin(state, product) ? (kind === 'wholesale' ? 0.2 : 0.4) : MARKET[cc(state)] ?? 1;
  return Math.round(p[kind] * m * priceLevel(state));
}
const repOf = (state) => crimeOf(state).rep ?? 0;
const outfitRank = (state) => meOf(state)?.rank ?? -1;
export const canImport = (state) => repOf(state) >= 60 || outfitRank(state) >= 2;
export const kg = (n) => (n >= 10 ? Math.round(n).toLocaleString() : n.toFixed(n < 1 ? 2 : 1));

/** The charge for being caught with this much. */
export function drugCharge(state, weight) {
  if (weight > 10) return 'drugTrafficking';
  if (weight > 1) return 'drugDistribution';
  return 'possessionWithIntent';
}

function dirty(ctx, amount, label) {
  const c = crimeOf(ctx.state);
  const me = meOf(ctx.state);
  // A member kicks up to the outfit.
  const kick = me ? Math.round(amount * 0.3) : 0;
  if (me) { me.respect = clamp(me.respect + 2, 0, 100); }
  const take = amount - kick;
  c.earned += take;
  c.dirty = (c.dirty ?? 0) + take;
  drugsOf(ctx.state).sold += take;
  ctx.earn(take, 'Undisclosed income');
  return { take, kick, label };
}
const once = (ctx, key) => {
  if (yearlyCount(ctx.state, key)) { ctx.toast('Once a year', 'warn'); return false; }
  bumpYearly(ctx.state, key);
  return true;
};
function heat(state, n) {
  const c = crimeOf(state);
  c.heat = clamp(c.heat + n, 0, 100);
  c.rep = clamp((c.rep ?? 0) + Math.ceil(n / 3), 0, 100);
}
const legalCannabis = (state, product) => product === 'cannabis' && drugLawHere(state).cannabis !== 'crime';

export const DrugActions = {
  /** arg: 'product:size' */
  drugBuy(ctx, arg) {
    const { state } = ctx;
    if (state.character.age < 14) return ctx.toast('Too young', 'warn');
    const [product, size] = String(arg ?? '').split(':');
    const p = PRODUCTS[product];
    const b = BUYS[size];
    if (!p || !b) return ctx.toast('Pick a product and an amount', 'warn');
    const d = drugsOf(state);
    if (d.stash > 0.01 && d.product !== product) return ctx.toast(`Move your ${PRODUCTS[d.product].label.toLowerCase()} first`, 'warn');
    if (repOf(state) < b.rep && outfitRank(state) < 1) return ctx.toast(`Nobody will front you that much yet (needs ${b.rep} street rep)`, 'warn');
    const cost = Math.round(priceHere(state, product) * b.kg * b.markup);
    if (!ctx.spend(cost, `${b.label} of ${p.label.toLowerCase()}`, { allowDebt: false })) return ctx.toast(`You need $${cost.toLocaleString()} in cash`, 'warn');
    d.purity = d.stash > 0.01 ? (d.purity * d.stash + 0.85 * b.kg) / (d.stash + b.kg) : 0.85;
    d.product = product;
    d.stash += b.kg;
    d.laced = d.stash > b.kg ? d.laced : false;
    heat(state, size === 'weight' ? 6 : 2);
    ctx.log(`You bought ${kg(b.kg)} kg of ${p.label.toLowerCase()} for $${cost.toLocaleString()}.`, p.icon, 'warn');
  },
  /** arg: 'cut' | 'fentanyl' — stretch the stash. */
  drugCut(ctx, how) {
    const { state } = ctx;
    const d = drugsOf(state);
    if (d.stash < 0.05) return ctx.toast('Nothing to cut', 'warn');
    if (!once(ctx, 'drug.cut')) return;
    if (how === 'fentanyl') {
      if (!['heroin', 'cocaine'].includes(d.product)) return ctx.toast('Fentanyl goes into heroin and cocaine', 'warn');
      d.stash *= 2;
      d.laced = true;
      ctx.emit('crime:guilt', { amount: 5 });
      return ctx.log('You stretched the batch with fentanyl. Twice the weight. Nobody can tell how much is in any one bag — including you.', '☠️', 'warn');
    }
    d.stash *= 1.5;
    d.purity = Math.max(0.2, d.purity * 0.66);
    ctx.log(`You cut the ${PRODUCTS[d.product].label.toLowerCase()} with ${d.product === 'cocaine' ? 'levamisole and baby laxative' : 'whatever was cheap'}: half again the weight, ${Math.round(d.purity * 100)}% pure.`, '⚖️', 'warn');
  },
  /** arg: 'street' | 'weight' — sell yourself, or sell on to other dealers. */
  drugSell(ctx, mode = 'street') {
    const { state, rng } = ctx;
    const d = drugsOf(state);
    if (d.stash < 0.05) return ctx.toast('Nothing to sell', 'warn');
    if (!once(ctx, `drug.sell.${mode}`)) return;
    const c = crimeOf(state);
    const qty = mode === 'street' ? Math.min(d.stash, 2) : d.stash;
    const price = mode === 'street' ? priceHere(state, d.product, 'retail') * Math.sqrt(d.purity) : priceHere(state, d.product) * 1.5 * d.purity;
    const cop = state.legal.crime?.cop ? 0.6 : 1;
    const risk = clamp((mode === 'street' ? 0.12 : 0.08) * (1 + c.heat / 100) * cop * (legalCannabis(state, d.product) ? 0.4 : 1), 0.02, 0.6);
    heat(state, mode === 'street' ? 5 : 8);
    if (rng.chance(risk)) {
      const weight = d.stash;
      d.stash = 0;
      ctx.log(mode === 'street' ? 'You sold to an undercover officer.' : 'The buyer was wearing a wire.', '🚓', 'bad');
      return commitOffense(ctx, { offenseId: drugCharge(state, weight), caught: true, context: `caught with ${kg(weight)} kg of ${PRODUCTS[d.product].label.toLowerCase()}`, evidence: 0.9 });
    }
    d.stash -= qty;
    const { take, kick } = dirty(ctx, Math.round(qty * price), 'drug sales');
    ctx.log(`You sold ${kg(qty)} kg ${mode === 'street' ? 'hand to hand' : 'to other dealers'} for $${take.toLocaleString()}${kick ? ` (after $${kick.toLocaleString()} kicked up to the outfit)` : ''}.`, '💰', 'warn');
    if (mode === 'weight') commitOffense(ctx, { offenseId: drugCharge(state, qty), discovery: 0.15, evidence: 0.7, context: 'a dealer you sold weight to was arrested' });
    overdoses(ctx, qty);
  },
  /** arg: n — put runners on corners (n ≤ 0 lets them all go). */
  drugRunners(ctx, n) {
    const { state, rng } = ctx;
    const d = drugsOf(state);
    const want = Math.max(0, Math.round(Number(n) || 0));
    if (want === 0) { d.runners = 0; return ctx.log('You took your runners off the corners.', '🧢', 'info'); }
    const cap = 2 + Math.floor(repOf(state) / 10) + (outfitRank(state) >= 1 ? 4 : 0);
    if (want > cap) return ctx.toast(`You can trust ${cap} runners with your name`, 'warn');
    if (!once(ctx, 'drug.runners')) return;
    const young = rng.chance(0.6);
    d.runners = want;
    heat(state, want);
    ctx.log(`You put ${want} runner${want === 1 ? '' : 's'} on corners.${young ? ' Most of them are fifteen; kids get lighter sentences, and everyone knows it.' : ''}`, '🧢', 'warn');
  },
  /** arg: 'grow' | 'cook' | 'press' */
  drugLab(ctx, type) {
    const { state } = ctx;
    const lab = LABS[type];
    if (!lab) return;
    const d = drugsOf(state);
    if (state.character.age < 18) return ctx.toast('18+', 'warn');
    if (d.lab) return ctx.toast(`You already run a ${LABS[d.lab].label.toLowerCase()}`, 'warn');
    if (d.stash > 0.01 && d.product !== lab.product) return ctx.toast(`Move your ${PRODUCTS[d.product].label.toLowerCase()} first`, 'warn');
    const cost = Math.round(lab.cost * priceLevel(state));
    if (!ctx.spend(cost, `Setting up a ${lab.label.toLowerCase()}`, { allowDebt: false })) return ctx.toast(`You need $${cost.toLocaleString()} in cash`, 'warn');
    d.lab = type;
    d.product = lab.product;
    heat(state, 4);
    ctx.log(`You set up ${lab.text}.`, lab.icon, 'warn');
  },
  closeLab(ctx) {
    const d = drugsOf(ctx.state);
    if (!d.lab) return;
    ctx.log(`You shut down the ${LABS[d.lab].label.toLowerCase()} and bleached everything.`, '🧽', 'info');
    d.lab = null;
  },
  /** Import a shipment: it arrives next year — or customs finds it. */
  drugImport(ctx, product) {
    const { state } = ctx;
    const p = PRODUCTS[product];
    if (!p) return;
    if (!canImport(state)) return ctx.toast('Importing takes an outfit behind you, or 60+ street rep', 'warn');
    const d = drugsOf(state);
    if (d.shipment) return ctx.toast('A shipment is already on its way', 'warn');
    if (d.stash > 0.01 && d.product !== product) return ctx.toast(`Move your ${PRODUCTS[d.product].label.toLowerCase()} first`, 'warn');
    const weight = 100;
    const cost = Math.round(p.wholesale * 0.3 * weight * priceLevel(state));
    if (!ctx.spend(cost, `A ${weight} kg shipment of ${p.label.toLowerCase()}`, { allowDebt: false })) return ctx.toast(`You need $${cost.toLocaleString()} in cash`, 'warn');
    d.shipment = { product, weight, cost };
    heat(state, 10);
    ctx.log(`You paid $${cost.toLocaleString()} for ${weight} kg of ${p.label.toLowerCase()} hidden in a container of ${product === 'cocaine' ? 'bananas' : 'machine parts'}. It lands next year.`, '🚢', 'warn');
  },
  /** Get out: dump the stash, let the runners go, close the lab. */
  drugQuit(ctx) {
    const d = drugsOf(ctx.state);
    Object.assign(d, { stash: 0, runners: 0, lab: null, laced: false, territory: 0 });
    ctx.log('You flushed what was left, let your runners go and changed your number.', '🚽', 'info');
  },
};

/** Customers who die from what you sold. */
function overdoses(ctx, qty) {
  const { state, rng } = ctx;
  const d = drugsOf(state);
  const p = PRODUCTS[d.product];
  const risk = clamp(qty * p.harm * (d.laced ? 6 : 1) * (d.purity > 0.8 ? 1.5 : 1), 0, 0.9);
  if (!rng.chance(risk)) return;
  const age = rng.int(16, 45);
  ctx.log(`A ${age}-year-old was found dead in a ${rng.pick(['car park', 'stairwell', 'bedroom', 'fast-food toilet'])}. It was your product.`, '⚰️', 'death');
  ctx.emit('crime:guilt', { amount: d.laced ? 18 : 10 });
  heat(state, 10);
  if (d.laced || rng.chance(0.3)) commitOffense(ctx, { offenseId: 'drugInducedHomicide', discovery: 0.25, evidence: 0.7, context: `the overdose death of a ${age}-year-old traced back to your supply` });
}

/** Yearly: the lab produces, runners sell, shipments land, territory shifts. */
export function drugsTick(ctx) {
  const { state, rng } = ctx;
  const d = crimeOf(state).drugs;
  if (!d) return;
  if (state.legal.incarceration) { if (d.runners || d.lab) ctx.log('With you inside, your corners went to someone else.', '🧢', 'info'); Object.assign(d, { runners: 0, lab: null, territory: 0 }); return; }
  const c = crimeOf(state);
  const cop = state.legal.crime?.cop ? 0.6 : 1;
  // The shipment lands — or doesn't.
  if (d.shipment) {
    const s = d.shipment;
    d.shipment = null;
    const caught = clamp((CUSTOMS[cc(state)] ?? 0.12) * cop * (1 + c.heat / 200), 0.03, 0.5);
    if (rng.chance(caught)) {
      ctx.log(`Customs found the ${s.weight} kg in your container. ${rng.chance(0.4) ? 'They swapped it for flour and followed the truck: a controlled delivery.' : 'They\'re tracing who paid for it.'}`, '🚢', 'bad');
      commitOffense(ctx, { offenseId: 'drugImportation', caught: rng.chance(0.4), discovery: 0.4, evidence: 0.85, context: `a ${s.weight} kg seizure at the port` });
    } else {
      d.product = s.product;
      d.stash += s.weight;
      d.purity = 0.9;
      ctx.log(`The container came through. ${s.weight} kg of ${PRODUCTS[s.product].label.toLowerCase()} is in a lock-up only you know about.`, '🚢', 'warn');
    }
  }
  // The lab produces — and sometimes burns, or is smelled from the street.
  if (d.lab) {
    const lab = LABS[d.lab];
    if (rng.chance(lab.hazard)) {
      ctx.stat('health', -rng.int(15, 45));
      ctx.log(`The ${lab.label.toLowerCase()} caught fire. You got out with burns; the fire brigade found what was inside.`, '🔥', 'bad');
      d.lab = null;
      commitOffense(ctx, { offenseId: 'drugManufacturing', caught: rng.chance(0.5), discovery: 0.6, evidence: 0.9, context: `a fire at your ${lab.label.toLowerCase()}` });
    } else if (rng.chance(lab.risk * cop)) {
      d.lab = null;
      commitOffense(ctx, { offenseId: 'drugManufacturing', discovery: 0.5, evidence: 0.85, context: `a raid on an empty ${lab.label.toLowerCase()} rented in a false name` });
      ctx.log(`Police raided your ${lab.label.toLowerCase()}. You weren't there; your fingerprints were.`, '🚓', 'bad');
    } else {
      d.stash += lab.yield;
      d.purity = d.lab === 'cook' ? 0.7 : 0.9;
      if (d.lab === 'cook') ctx.stat('health', -3);
    }
  }
  // Runners sell all year.
  if (d.runners && d.stash > 0.05) {
    const qty = Math.min(d.stash, d.runners * 1.5 * (0.6 + d.territory / 100));
    d.stash -= qty;
    const { take } = dirty(ctx, Math.round(qty * priceHere(state, d.product, 'retail') * Math.sqrt(d.purity) * 0.6), 'corner sales');
    ctx.log(`Your ${d.runners} runner${d.runners === 1 ? '' : 's'} moved ${kg(qty)} kg: $${take.toLocaleString()} after their cut.`, '🧢', 'warn');
    heat(state, d.runners * 2);
    d.territory = clamp(d.territory + d.runners * 2, 0, 60);
    overdoses(ctx, qty);
    // Runners get arrested; some talk.
    for (let i = 0; i < d.runners; i++) {
      if (!rng.chance(0.12 * (1 + c.heat / 100) * cop)) continue;
      d.runners -= 1;
      ctx.log('One of your runners was arrested on a corner.', '🚓', 'bad');
      if (rng.chance(0.3)) { commitOffense(ctx, { offenseId: drugCharge(state, qty), discovery: 0.35, evidence: 0.75, context: 'a runner who gave the police your name' }); break; }
    }
  }
  // Dealers who use: the product is always there.
  const hard = { heroin: 'opioids', fentanyl: 'opioids', meth: 'stimulants', cocaine: 'stimulants' }[d.product];
  if (hard && d.stash > 0.05 && !d.using && rng.chance(0.04 + (state.stats.stress > 70 ? 0.06 : 0))) {
    d.using = true;
    ctx.log(`You started using your own ${PRODUCTS[d.product].label.toLowerCase()}. Just to get through the nights, at first.`, PRODUCTS[d.product].icon, 'bad');
    ctx.emit('health:injury', { conditionId: hard, severity: rng.int(30, 50) });
    if (d.product === 'heroin' && state.health) lifestyleOf(state).injecting = true;
  }
  if (d.using && hard && rng.chance(d.laced ? 0.15 : 0.05)) ctx.emit('health:acute', { id: 'overdose' });
  // Holding territory brings the outfits.
  const outfits = outfitsHere(state, rng);
  if (d.territory >= 15 && outfits.length && !meOf(state) && rng.chance(0.35)) {
    const o = rng.pick(outfits);
    ctx.prompt({
      type: 'crime.turf', icon: '🗺️', title: 'Someone Else\'s Corners',
      text: `Men from ${o.name} came to see you. The corners you're selling on are theirs; so is a third of what you've made.`,
      options: [
        { id: 'pay', label: '💵 Pay the tax', hint: 'A third of your takings' },
        { id: 'refuse', label: '✊ Refuse', tone: 'danger', hint: 'They will come back with more people' },
        { id: 'pull', label: '🏳️ Pull back off their corners' },
      ],
      data: { outfitId: o.id },
    });
  }
}
