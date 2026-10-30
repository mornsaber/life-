/**
 * Living with the hazard where you are, not just the day it hits.
 *
 *   The season   in risky places, each year brings a choice before fire, flood or storm season:
 *                harden the house (defensible space, flood vents, storm shutters, bolting it to
 *                its foundation), add flood cover, pack a go-bag and make a plan — or do nothing.
 *   Hardening    a hardened home takes about half the damage from that hazard, and insurers
 *                knock something off the premium.
 *   The market   after a severe disaster, premiums across the state jump; after a catastrophic
 *                one, insurers stop renewing policies. Then it's the insurer of last resort
 *                (the FAIR plan, Flood Re, a state-backed pool), shopping around, or going bare.
 *
 * property.hardened = [hazard]   property.premiumLoad (×)   state.disasterPrep = { kit }
 */
import { Random } from '../../core/Random.js';
import { stateIdOf } from './Regions.js';
import { STATES, DISASTER_LABEL } from './States.js';
import { REGIONS } from './Regions.js';
import { priceLevel } from '../world/Countries.js';

export const HARDEN = {
  wildfire: { label: '🌲 Clear defensible space, ember-proof vents, a Class A roof', cost: 15000, season: 'Fire season is coming' },
  flood: { label: '🧱 Flood vents, raise the boiler and wiring, flood barriers', cost: 12000, season: 'The river rises every spring' },
  hurricane: { label: '🪟 Storm shutters, hurricane straps, a fortified roof', cost: 18000, season: 'Hurricane season starts in June' },
  earthquake: { label: '🔩 Bolt the house to its foundation, brace the cripple walls', cost: 9000, season: 'The fault hasn\'t moved in a century' },
  tornado: { label: '🛖 Build a safe room', cost: 8000, season: 'Tornado season' },
  blizzard: { label: '🔥 A generator and insulated pipes', cost: 6000, season: 'Winter is coming' },
};
const LAST_RESORT = { US: 'the state FAIR plan', GB: 'a Flood Re–backed policy', AU: 'the cyclone reinsurance pool', FR: 'the state CatNat scheme', NZ: 'Natural Hazards Commission cover' };
export const lastResortHere = (state) => LAST_RESORT[state.character.countryId ?? 'US'] ?? 'the state-backed insurer of last resort';

const local = (state, n) => Math.round(n * priceLevel(state));
const prepOf = (state) => (state.disasterPrep ??= { kit: false });
export const disasterPrepOf = prepOf;
const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 31847 + state.character.age * 541 + 0xd15) >>> 0);
const homeOf = (state) => (state.housing?.properties ?? []).find((p) => p.use === 'primary' && p.regionId === state.character.regionId) ?? null;

/** The year's biggest local hazard and how likely it is. */
export function topHazard(state) {
  const d = STATES[stateIdOf(state)]?.disasters ?? {};
  const [type, p] = Object.entries(d).sort((a, b) => b[1] - a[1])[0] ?? [];
  return type ? { type, p, total: Object.values(d).reduce((s, x) => s + x, 0) } : null;
}

export function seasonTick(main) {
  const { state } = main;
  if (state.character.age < 18 || state.legal?.incarceration) return;
  const hz = topHazard(state);
  if (!hz || hz.total < 0.06) return;
  const rng = sideRng(state);
  if (!rng.chance(0.3)) return;
  const home = homeOf(state);
  const h = HARDEN[hz.type];
  if (!h) return;
  const options = [];
  if (home && !(home.hardened ?? []).includes(hz.type)) options.push({ id: 'harden', label: h.label, hint: `$${local(state, h.cost).toLocaleString()} · about half the damage, a cheaper premium` });
  if (home && hz.type === 'flood' && !home.floodInsured) options.push({ id: 'flood', label: '🌊 Add flood insurance', hint: 'Standard policies exclude floods' });
  if (!prepOf(state).kit) options.push({ id: 'kit', label: '🎒 A go-bag, a plan, copies of your documents', hint: `$${local(state, 300).toLocaleString()} · safer and cheaper if you have to leave` });
  options.push({ id: 'cert', label: '🦺 Train with the community emergency response team', hint: 'Help your neighbours when it comes' });
  options.push({ id: 'nothing', label: '🤞 It won\'t happen this year' });
  main.prompt({ type: 'disasterSeason.season', icon: DISASTER_LABEL[hz.type]?.icon ?? '⚠️', title: h.season, text: `Where you live, ${hz.type}s are the big one (about ${Math.round(hz.p * 100)}% a year). What will you do before the season?`, data: { type: hz.type }, options });
}

/** Big disasters move the insurance market for everyone in the state. */
export function insuranceShock(ctx, disaster) {
  const { state } = ctx;
  if (disaster.severity < 2) return;
  const rng = sideRng(state);
  let dropped = null;
  for (const p of state.housing?.properties ?? []) {
    if (REGIONS[p.regionId]?.state !== disaster.stateId || !p.insured) continue;
    p.premiumLoad = Math.min(3, Math.round((p.premiumLoad ?? 1) * (disaster.severity === 3 ? rng.float(1.25, 1.5) : rng.float(1.08, 1.2)) * 100) / 100);
    if (disaster.severity === 3 && !dropped && rng.chance(0.3)) { p.insured = false; dropped = p; }
  }
  if (!dropped) {
    if ((state.housing?.properties ?? []).some((p) => REGIONS[p.regionId]?.state === disaster.stateId && p.insured)) ctx.log(`After ${disaster.name}, insurers raised premiums across ${STATES[disaster.stateId]?.name ?? 'the region'}.`, '📈', 'warn');
    return;
  }
  ctx.prompt({ type: 'disasterSeason.nonRenewal', icon: '📄', title: 'Your Insurer Won\'t Renew', text: `After ${disaster.name}, your insurer is pulling out of the area. Your ${dropped.typeName.toLowerCase()} has no cover from next month.`, data: { propertyId: dropped.id }, options: [
    { id: 'lastResort', label: `🏛️ ${lastResortHere(state).charAt(0).toUpperCase() + lastResortHere(state).slice(1)}`, hint: 'Always available; roughly double the premium, less cover' },
    { id: 'shop', label: '🔎 Shop around with a broker', hint: 'Maybe someone will take it' },
    { id: 'bare', label: '🎲 Go without', hint: 'A mortgage lender may not allow it' },
  ] });
}

export const DisasterSeasonResolvers = {
  season(ctx, data, optionId) {
    const { state } = ctx;
    const home = homeOf(state);
    if (optionId === 'harden' && home) {
      ctx.spend(local(state, HARDEN[data.type].cost), `Hardening the house against ${data.type}s`, { allowDebt: true });
      home.hardened = [...(home.hardened ?? []), data.type];
      return ctx.log(`You hardened the house against ${data.type}s. Your insurer knocked a little off the premium.`, '🏗️', 'good');
    }
    if (optionId === 'flood' && home) { home.floodInsured = true; return ctx.log('You added flood insurance.', '🌊', 'good'); }
    if (optionId === 'kit') { ctx.spend(local(state, 300), 'Go-bag and emergency plan'); prepOf(state).kit = true; return ctx.log('A go-bag by the door, a meeting place, documents in the cloud.', '🎒', 'good'); }
    if (optionId === 'cert') { prepOf(state).cert = true; ctx.stat('smarts', 1); return ctx.log('Six Saturday sessions: triage, light search and rescue, shutting off the gas. You know your neighbours\' names now.', '🦺', 'good'); }
    ctx.log('You crossed your fingers.', '🤞', 'muted');
  },
  nonRenewal(ctx, data, optionId) {
    const { state, rng } = ctx;
    const p = (state.housing?.properties ?? []).find((x) => x.id === data.propertyId);
    if (!p) return;
    if (optionId === 'lastResort') { p.insured = true; p.premiumLoad = Math.max(2, (p.premiumLoad ?? 1) * 1.6); p.lastResort = true; return ctx.log(`You moved to ${lastResortHere(state)}. It costs about twice as much and covers less.`, '🏛️', 'warn'); }
    if (optionId === 'shop') {
      if (rng.chance((p.hardened?.length ? 0.6 : 0.3))) { p.insured = true; p.premiumLoad = Math.max(1.4, p.premiumLoad ?? 1); return ctx.log(`A broker found a smaller insurer willing to write the policy${p.hardened?.length ? ' — the hardening helped' : ''}.`, '🔎', 'good'); }
      p.insured = true; p.premiumLoad = Math.max(2, (p.premiumLoad ?? 1) * 1.6); p.lastResort = true;
      return ctx.log(`Nobody would take it. You ended up with ${lastResortHere(state)} anyway.`, '🔎', 'warn');
    }
    ctx.log(`You went without insurance on your ${p.typeName.toLowerCase()}.`, '🎲', 'warn');
  },
};

export const DisasterSeasonModule = {
  id: 'disasterSeason',
  order: 3.2,
  setup(engine) { engine.bus.on('disaster:struck', ({ ctx, disaster }) => insuranceShock(ctx, disaster)); },
  onAgeUp: seasonTick,
  resolvers: DisasterSeasonResolvers,
};
