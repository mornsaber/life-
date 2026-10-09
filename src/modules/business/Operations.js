/**
 * Operations for businesses that run on equipment and crews: a trucking
 * company is its trucks and drivers, an ambulance service its rigs and
 * EMT/paramedic crews, a security company its guards on contract.
 *
 *   Fleet       Units you own — trucks, vans, ambulances, boats, aircraft,
 *               excavators. Buy them new or used, with cash or an equipment
 *               loan, and sell them. Older units cost more to keep running
 *               and break down more.
 *   Crews       Each unit needs a crew (one driver, two medics, a four-person
 *               roofing crew). Capacity is whichever runs out first: units or
 *               crews. Staff-only businesses (guards, cleaners) have no units.
 *   Contracts   Steady work at a set rate for a set term: a shipper's
 *               dedicated lanes, a county 911 contract, a school district's
 *               bus routes. Some want a bigger fleet, a better reputation or
 *               a credential. Commit capacity you don't have and you pay
 *               penalties — and can lose the client.
 *   Spot work   Whatever capacity isn't under contract chases one-off jobs:
 *               more volatile, and it dries up in a recession.
 *
 * biz.ops = {
 *   units: [{ id, age, used }],            // empty for staff-only businesses
 *   contracts: [{ id, client, units, rate, yearsLeft, years }],
 *   offers: [{ id, client, units, rate, years, minUnits, minRep, needs }],
 *   loan: { balance, rate, annual } | null, // equipment financing
 *   lastUtil, breakdowns, bids
 * }
 */
import { clamp } from '../../core/Random.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { credentialName } from '../credentials/CredentialRegistry.js';

const U = (name, plural, icon, newCost, usedCost, life) => ({ name, plural, icon, newCost, usedCost, life });

/**
 * unit: the equipment (null = staff only). crew: people per unit (or per post).
 * perUnit: revenue a fully booked unit earns a year. upkeep: fuel-free running
 * costs per unit (maintenance, registration, insurance riders); fuel and
 * supplies are already in the type's cost of goods. start: units at opening.
 * clients: who offers contracts.
 */
export const OPERATIONS = {
  trucking: { unit: U('truck', 'trucks', '🚛', 165000, 70000, 10), crew: 1, crewName: 'driver', perUnit: 200000, upkeep: 18000, start: 3,
    clients: [['Midwest Grocers (dedicated lanes)', 2, 1.08], ['Lakeside Steel', 1, 1.05], ['A big-box retailer\'s distribution center', 4, 1.12, { minRep: 60 }], ['Hazardous chemicals hauler', 2, 1.25, { needs: 'hazmatEndorsement' }], ['A freight broker\'s load board', 1, 0.92]] },
  courier: { unit: U('cargo van', 'cargo vans', '🚐', 52000, 22000, 7), crew: 1, crewName: 'driver', perUnit: 85000, upkeep: 6000, start: 6,
    clients: [['Last-mile delivery for an online retailer', 4, 0.95], ['Regional lab specimen runs', 2, 1.15, { minRep: 55 }], ['Law-firm document courier', 1, 1.1], ['Pharmacy home delivery', 2, 1.05]] },
  charterOperator: { unit: U('jet', 'jets', '🛩️', 3200000, 1300000, 25), crew: 2, crewName: 'pilot', perUnit: 2200000, upkeep: 180000, start: 1,
    clients: [['Corporate shuttle for a Fortune 500 company', 1, 1.15, { minRep: 60 }], ['Organ-transport standby', 1, 1.2, { minRep: 65 }], ['A sports team\'s road trips', 1, 1.1]] },
  fishingBoat: { unit: U('fishing boat', 'fishing boats', '🎣', 900000, 380000, 30), crew: 4, crewName: 'deckhand', perUnit: 700000, upkeep: 45000, start: 1,
    clients: [['A seafood processor\'s season contract', 1, 1.05], ['A restaurant group\'s direct buy', 1, 1.12, { minRep: 60 }]] },
  plumbing: { unit: U('service van', 'service vans', '🚐', 60000, 25000, 8), crew: 1, crewName: 'plumber', perUnit: 205000, upkeep: 7000, start: 5,
    clients: [['A property manager\'s 40 buildings', 2, 1.05], ['A home builder\'s new subdivision', 3, 1.0], ['School district maintenance', 1, 1.08, { minRep: 55 }]] },
  electrical: { unit: U('service van', 'service vans', '🚐', 60000, 25000, 8), crew: 1, crewName: 'electrician', perUnit: 225000, upkeep: 7000, start: 5,
    clients: [['A general contractor\'s office build-out', 3, 1.05], ['A hospital\'s maintenance agreement', 1, 1.12, { minRep: 60 }], ['Solar installer subcontract', 2, 1.0]] },
  hvacContractor: { unit: U('service van', 'service vans', '🚐', 62000, 26000, 8), crew: 1, crewName: 'technician', perUnit: 205000, upkeep: 7000, start: 5,
    clients: [['Maintenance agreements for 300 homes', 2, 1.05], ['A school district\'s boiler contract', 1, 1.1, { minRep: 55 }], ['A builder\'s new homes', 3, 0.98]] },
  constructionCo: { unit: U('crew truck and equipment', 'crew trucks and equipment', '🏗️', 140000, 60000, 10), crew: 4, crewName: 'tradesperson', perUnit: 800000, upkeep: 25000, start: 3,
    clients: [['A public library renovation (prevailing wage)', 2, 1.1, { minRep: 55 }], ['A developer\'s townhouses', 3, 1.0], ['A school addition', 2, 1.08, { minUnits: 3 }]] },
  cleaning: { unit: U('cleaning van', 'cleaning vans', '🚐', 38000, 15000, 7), crew: 2, crewName: 'cleaner', perUnit: 113000, upkeep: 4000, start: 3,
    clients: [['Nightly janitorial for an office park', 2, 1.0], ['A medical office building', 1, 1.12, { minRep: 55 }], ['Move-out cleans for a property manager', 1, 0.95]] },
  securityCompany: { unit: null, crew: 1, crewName: 'guard', perUnit: 64000, upkeep: 1500, start: 14,
    clients: [['An office tower\'s lobby posts', 4, 1.0], ['A hospital\'s security contract', 6, 1.1, { minRep: 60 }], ['Construction-site night watch', 2, 0.95], ['Concert and stadium events', 5, 1.15, { minRep: 55 }]] },
  // Businesses grown out of driving, EMS, trades, aviation and marine careers.
  // Contract fire & rescue: each unit is an apparatus with a crew of four across shifts.
  privateFireService: { unit: U('fire apparatus', 'fire apparatus', '🚒', 900000, 320000, 15), crew: 4, crewName: 'firefighter', perUnit: 520000, upkeep: 35000, start: 2,
    clients: [['A refinery\'s industrial fire brigade', 1, 1.15, { minRep: 50 }], ['Film-set and event fire watch', 1, 0.85], ['A state agency\'s fire-season engine contract', 2, 1.05, { needs: 'wildlandFF2' }], ['A military base\'s fire services (federal contract)', 2, 1.0, { minRep: 60, minUnits: 3 }], ['A hospital campus fire watch', 1, 0.9], ['A private airfield\'s crash-rescue standby', 1, 1.1, { minRep: 45 }]] },
  ambulanceService: { unit: U('ambulance', 'ambulances', '🚑', 240000, 95000, 8), crew: 2, crewName: 'EMT or paramedic', perUnit: 300000, upkeep: 30000, start: 3,
    clients: [['A hospital system\'s transfer contract', 2, 1.05], ['Nursing-home network discharges', 1, 0.95], ['The county\'s 911 contract', 6, 1.2, { minUnits: 6, minRep: 60, needs: 'paramedic' }], ['Stadium and event standby', 1, 1.1]] },
  nemt: { unit: U('wheelchair van', 'wheelchair vans', '♿', 70000, 30000, 7), crew: 1, crewName: 'driver', perUnit: 95000, upkeep: 6000, start: 5,
    clients: [['The state Medicaid broker', 3, 1.0], ['A dialysis-center network', 2, 1.08], ['A senior-living community', 1, 1.05]] },
  towing: { unit: U('tow truck', 'tow trucks', '🛻', 120000, 50000, 10), crew: 1, crewName: 'operator', perUnit: 140000, upkeep: 12000, start: 3,
    clients: [['The police rotation list', 1, 1.1, { minRep: 55 }], ['A motor club\'s roadside calls', 2, 0.95], ['Apartment-complex enforcement', 1, 1.0], ['Heavy-duty highway recovery', 1, 1.25, { needs: 'cdlA' }]] },
  busCharter: { unit: U('motorcoach', 'motorcoaches', '🚌', 600000, 200000, 15), crew: 1, crewName: 'driver', perUnit: 320000, upkeep: 30000, start: 3,
    clients: [['School district routes', 2, 1.0, { needs: 'schoolBusEndorsement' }], ['A university\'s campus shuttle', 2, 1.08], ['A casino\'s day-trip runs', 1, 1.05], ['A college football team\'s travel', 1, 1.15, { minRep: 60 }]] },
  movingCompany: { unit: U('box truck', 'box trucks', '📦', 85000, 35000, 10), crew: 3, crewName: 'mover', perUnit: 230000, upkeep: 8000, start: 3,
    clients: [['Corporate relocations for a tech company', 2, 1.12, { minRep: 55 }], ['Military household moves', 2, 1.0], ['An office-furniture installer', 1, 0.98]] },
  landscaping: { unit: U('crew truck and mowers', 'crew trucks and mowers', '🌿', 60000, 25000, 8), crew: 3, crewName: 'landscaper', perUnit: 190000, upkeep: 7000, start: 2,
    clients: [['An HOA\'s common grounds', 1, 1.0], ['A corporate campus', 2, 1.08], ['The city parks department', 2, 1.05, { minRep: 55 }], ['Snow removal for a shopping center', 1, 1.1]] },
  demolitionCo: { unit: U('excavator with demolition shears', 'demolition excavators', '🧨', 420000, 160000, 12), crew: 3, crewName: 'demolition laborer', perUnit: 560000, upkeep: 40000, start: 2,
    clients: [['Teardowns for a home builder', 2, 1.0], ['An abandoned mall', 2, 1.12, { minRep: 55 }], ['The city\'s blighted-property program', 1, 1.05], ['A hospital wing interior demolition', 3, 1.18, { minUnits: 3, minRep: 60 }]] },
  excavation: { unit: U('excavator and dump truck', 'excavators and dump trucks', '🚜', 350000, 140000, 12), crew: 2, crewName: 'equipment operator', perUnit: 450000, upkeep: 35000, start: 2,
    clients: [['Site work for a new subdivision', 2, 1.0], ['The water utility\'s pipe replacement', 1, 1.1, { minRep: 55 }], ['Highway widening subcontract', 3, 1.15, { minUnits: 3, minRep: 60 }]] },
  craneRental: { unit: U('crane', 'cranes', '🏗️', 900000, 350000, 20), crew: 2, crewName: 'crane operator', perUnit: 700000, upkeep: 60000, start: 1,
    clients: [['A high-rise general contractor', 1, 1.1], ['Wind-farm tower erection', 1, 1.2, { minRep: 60 }], ['Steel-erection subcontract', 1, 1.0]] },
  roofing: { unit: U('crew truck and trailer', 'crew trucks and trailers', '🏠', 70000, 30000, 8), crew: 4, crewName: 'roofer', perUnit: 400000, upkeep: 8000, start: 3,
    clients: [['Storm-damage claims for an insurer', 2, 1.1], ['A builder\'s new homes', 2, 0.98], ['A school district\'s re-roofs', 1, 1.08, { minRep: 55 }]] },
  wasteHauling: { unit: U('roll-off truck', 'roll-off trucks', '🗑️', 280000, 110000, 12), crew: 1, crewName: 'driver', perUnit: 260000, upkeep: 25000, start: 3,
    clients: [['Construction dumpsters for a builder', 2, 1.0], ['A town\'s residential trash contract', 3, 1.1, { minUnits: 3, minRep: 55 }], ['Hospital medical waste', 1, 1.2, { needs: 'hazmatEndorsement' }]] },
  flightSchool: { unit: U('training airplane', 'training airplanes', '🛩️', 450000, 120000, 30), crew: 1, crewName: 'flight instructor', perUnit: 210000, upkeep: 25000, start: 3,
    clients: [['A regional airline\'s pilot pathway', 2, 1.1, { minRep: 60 }], ['A university aviation program', 2, 1.05], ['Veterans using GI Bill flight training', 1, 1.0]] },
  cdlSchool: { unit: U('training truck', 'training trucks', '🚛', 140000, 60000, 10), crew: 1, crewName: 'instructor', perUnit: 190000, upkeep: 12000, start: 3,
    clients: [['A national carrier\'s sponsored students', 2, 1.0], ['The state workforce board', 1, 1.05], ['A school district\'s bus-driver training', 1, 1.1]] },
  tourBoat: { unit: U('tour boat', 'tour boats', '⛴️', 500000, 180000, 25), crew: 2, crewName: 'deckhand', perUnit: 400000, upkeep: 35000, start: 1,
    clients: [['A cruise line\'s shore excursions', 1, 1.15, { minRep: 60 }], ['Hotel-concierge harbor tours', 1, 1.0], ['A wedding-venue charter package', 1, 1.08]] },
  pestControl: { unit: U('service truck', 'service trucks', '🐜', 55000, 22000, 8), crew: 1, crewName: 'technician', perUnit: 110000, upkeep: 6000, start: 3,
    clients: [['Quarterly service for an apartment company', 1, 1.0], ['Restaurant chain inspections', 1, 1.1, { minRep: 55 }], ['A school district', 1, 1.05]] },
  fireProtection: { unit: U('inspection van', 'inspection vans', '🧯', 60000, 25000, 8), crew: 1, crewName: 'inspector', perUnit: 200000, upkeep: 6000, start: 3,
    clients: [['Annual sprinkler inspections for a hospital system', 2, 1.1, { minRep: 55 }], ['Fire-extinguisher service for a retail chain', 1, 0.98], ['Alarm testing for the school district', 1, 1.05]] },
};

export const opsOf = (biz) => (biz?.ops && OPERATIONS[biz.typeId] ? OPERATIONS[biz.typeId] : null);
export const EQUIPMENT_LOAN = { rate: 0.085, years: 5, down: 0.15 };

let seq = 0;
const uid = (rng, p) => (rng?.id ? rng.id(p) : `${p}${Date.now().toString(36)}${(seq += 1)}`);

/** A fresh operation: the starting fleet (scaled), no contracts yet. */
export function newOps(rng, typeId, scale = 1, years = 0) {
  const o = OPERATIONS[typeId];
  if (!o) return null;
  const n = Math.max(1, Math.round(o.start * scale));
  return {
    units: o.unit ? Array.from({ length: n }, () => ({ id: uid(rng, 'u_'), age: Math.min(years, Math.floor(o.unit.life * 0.6)), used: false })) : [],
    contracts: [],
    offers: [],
    loan: null,
    lastUtil: null,
    breakdowns: 0,
  };
}

/** Units, crews, and how much work you can take. */
export function capacity(biz) {
  const o = opsOf(biz);
  if (!o) return { units: 0, crews: 0, capacity: 0 };
  // An owner who works in the business is one more pair of hands (an owner-operator drives their own truck).
  const people = biz.staff.headcount + (biz.role === 'operator' ? 1 : 0);
  const crews = Math.floor(people / o.crew);
  const units = o.unit ? biz.ops.units.length : crews;
  return { units, crews, capacity: Math.min(units, crews), staffNeeded: units * o.crew };
}

export const contracted = (biz) => (biz.ops?.contracts ?? []).reduce((s, c) => s + c.units, 0);

/** Upkeep climbs as equipment ages past half its life. */
export const unitUpkeep = (o, u) => Math.round(o.upkeep * (1 + Math.max(0, u.age - o.unit.life / 2) * 0.12));
/** What a unit would sell for. */
export const resaleValue = (o, u) => Math.round((u.used ? o.unit.usedCost : o.unit.newCost) * Math.max(0.12, 0.85 ** u.age));

/**
 * Revenue from contracts and spot work; deterministic given rng (used by the
 * yearly P&L and by estimates). `demand` is the business's demand index.
 */
export function opsRevenue(biz, demand, rng) {
  const o = opsOf(biz);
  const { capacity: cap } = capacity(biz);
  let booked = 0;
  let contractRevenue = 0;
  for (const c of biz.ops.contracts) {
    const served = Math.min(c.units, Math.max(0, cap - booked));
    booked += served;
    contractRevenue += served * o.perUnit * c.rate;
  }
  const spare = Math.max(0, cap - booked);
  // Spot work rises and falls with demand (reputation, quality, the economy); contracts don't.
  const util = clamp(demand * 0.92 + rng.float(-0.1, 0.1), 0.15, 1.15);
  const spotRevenue = spare * o.perUnit * util;
  const shortfall = Math.max(0, contracted(biz) - cap);
  return { contractRevenue: Math.round(contractRevenue), spotRevenue: Math.round(spotRevenue), util: cap ? (booked + spare * util) / cap : 0, shortfall };
}

export function fleetUpkeep(biz) {
  const o = opsOf(biz);
  if (!o) return 0;
  if (!o.unit) return Math.round(o.upkeep * biz.staff.headcount);
  return biz.ops.units.reduce((s, u) => s + unitUpkeep(o, u), 0);
}

/** Can you take this contract? (Committing capacity you don't have is allowed — with penalties.) */
export function offerEligibility(state, biz, offer) {
  const o = opsOf(biz);
  if (!o) return { ok: false, reason: 'No operations' };
  if (offer.minUnits && capacity(biz).units < offer.minUnits) return { ok: false, reason: `Needs a fleet of ${offer.minUnits}+ ${o.unit?.plural ?? `${o.crewName}s`}` };
  if (offer.minRep && biz.reputation < offer.minRep) return { ok: false, reason: `Wants a reputation of ${offer.minRep}+` };
  if (offer.needs && !hasCredential(state, offer.needs)) return { ok: false, reason: `Needs ${credentialName(offer.needs)}` };
  return { ok: true };
}

/**
 * Clients scale their asks to the operation they're dealing with. An outfit
 * several times its opening size gets regional accounts; a big one gets
 * multi-state and national work: more units, longer terms, a volume
 * discount, and they want a fleet (and reputation) that can carry it.
 */
export const ACCOUNT_TIERS = [
  { label: null, mult: 1, years: [1, 4], rate: 1, minRep: 0 },
  { label: 'regional', mult: 2, years: [2, 4], rate: 1, minRep: 45 },
  { label: 'multi-state', mult: 4, years: [3, 5], rate: 0.97, minRep: 55 },
  { label: 'national', mult: 8, years: [3, 6], rate: 0.94, minRep: 65 },
];

/** 0–3: how big this operation is next to the one it opened with. */
export function growthTier(biz) {
  const o = opsOf(biz);
  if (!o) return 0;
  const cap = capacity(biz);
  const size = Math.max(cap.units, cap.crews) / Math.max(1, o.start);
  return size >= 8 ? 3 : size >= 4 ? 2 : size >= 2 ? 1 : 0;
}

/** A year's contract offers: more of them, and bigger ones, as the business grows. */
export function makeOffers(rng, biz, n = null) {
  const o = opsOf(biz);
  const tier = growthTier(biz);
  const count = n ?? rng.int(2, 3) + tier;
  const picks = rng.shuffle ? [...rng.shuffle([...o.clients]), ...rng.shuffle([...o.clients])].slice(0, count) : Array.from({ length: count }, () => rng.pick(o.clients));
  // Bigger operations still see some small jobs, but most asks match their size.
  return picks.map((c) => offerFrom(rng, c, rng.chance(0.25) ? rng.int(0, tier) : tier));
}

function offerFrom(rng, [client, units, rate, opts = {}], tier = 0) {
  const t = ACCOUNT_TIERS[tier];
  const size = Math.max(1, Math.round((units + rng.int(-1, 1)) * t.mult * (tier ? rng.float(0.8, 1.25) : 1)));
  return {
    id: uid(rng, 'k_'),
    client: t.label ? `${client} — ${t.label} account` : client,
    units: size,
    rate: Math.round(rate * t.rate * rng.float(0.95, 1.05) * 100) / 100,
    years: rng.int(...t.years),
    minUnits: Math.max(opts.minUnits ?? 0, tier >= 2 ? Math.round(size * 0.6) : 0),
    minRep: Math.max(opts.minRep ?? 0, t.minRep),
    needs: opts.needs ?? null,
    tier,
  };
}
