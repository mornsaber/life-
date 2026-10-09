/**
 * The equipment an organization runs on — and the people who keep it
 * running. One engine, four kinds of owner:
 *
 *   job        Your department (police, fire, EMS, corrections, postal,
 *              parks, transit, utilities, hospital units…). Managers with
 *              budget authority spend a yearly capital budget set by the
 *              city's (or company's) finances; it's lost if unspent.
 *              Supervisors can put in requests.
 *   business   Your own business: kitchens, salon chairs, lifts, dental
 *              operatories, CNC machines, forklifts… bought from the
 *              business account. Condition shows up in quality.
 *   volunteer  Your volunteer company or team: engines bought used from
 *              career departments, ambulances, boats, aircraft. Chiefs and
 *              captains decide; money comes from a small district levy,
 *              fundraisers and grants.
 *   military   Your company or battalion: tactical and combat vehicles,
 *              aircraft, ships and boats. Commanders don't buy — they spend
 *              O&M funds on overhauls and request new equipment from the
 *              fielding process. Readiness is on the commander's evaluation.
 *
 * Common: units age, wear out past their service life and break down;
 * readiness is how much of what's needed is in service and in life.
 *
 * state.deptEquip[key] = { group, units: { [catId]: [{ model, age, used, leased }] },
 *   budget, budgetAge, reserve, readiness, bond, pending: [{ catId, model, age }] }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { GROUPS, SIZES } from './EquipmentCatalog.js';
import { currentBusiness } from '../business/Business.js';
import { SERVICES } from '../emergency/EmergencyEngine.js';
import { billetFor } from '../org/MilitaryUnits.js';
import { TEAMS } from '../service/DisasterTeams.js';
import { SDF_RANKS } from '../service/StateForces.js';

export { GROUPS };

/* ------------------------------------------------------------------ */
/* Who owns what                                                       */
/* ------------------------------------------------------------------ */

const JOB_GROUP = {
  privateFire: 'arff',
  police: 'police', sheriff: 'police', statePolice: 'police', transitPolice: 'police', privatePolice: 'police', universityPolice: 'campusPolice', airportPolice: 'airportPolice',
  fbi: 'federalLE', dea: 'federalLE', atf: 'federalLE', usms: 'federalLE', usss: 'federalLE', borderPatrol: 'borderPatrol',
  fire: 'fire', stateFire: 'stateFire', forester: 'stateFire', airportFire: 'arff', ems: 'ems', privateEms: 'ems',
  corrections: 'corrections', jail: 'corrections', federalPrisons: 'corrections', privatePrisons: 'corrections',
  postal: 'postal', parkService: 'parks', gameWarden: 'parks', dispatch: 'dispatch', lineworker: 'utility', waterUtility: 'water',
  transit: 'transit', paratransit: 'transit', schoolBus: 'schoolBus', publicWorks: 'publicWorks', dot: 'publicWorks',
  nursing: 'hospitalUnit', medical: 'hospitalUnit', respiratoryTherapy: 'hospitalUnit', imaging: 'hospitalUnit', travelNursing: 'hospitalUnit',
  transitMaintenance: 'transit', tsa: 'screening', animalControl: 'animalControl', library: 'library', privateSecurity: 'security',
  trucking: 'truckFleet', logistics: 'warehouse', manufacturing: 'machine', welding: 'machine', railroad: 'railroad',
  aviation: 'airline', charterAviation: 'airline', agriculture: 'farm', fishing: 'fishingFleet',
  trades: 'construction', carpentry: 'construction', ironworking: 'construction', craneOperator: 'construction', plumbing: 'construction', hvac: 'construction',
  research: 'lab', nationalLab: 'lab', culinary: 'kitchen', hospitality: 'kitchen', cosmetology: 'salon', automotive: 'autoShop',
  dentistry: 'dental', physicalTherapy: 'clinic', chiropractic: 'clinic', optometry: 'clinic', veterinary: 'clinic', occupationalTherapy: 'clinic',
  fitness: 'gym', retail: 'retail', childcare: 'care', funeral: 'funeral',
  merchantMarine: 'vessel', cruise: 'vessel', oilGas: 'rig', airTrafficControl: 'atc', meteorology: 'weather', forensics: 'crimeLab',
  college: 'campus', communityCollege: 'campus', university: 'campus', publicHealth: 'publicHealth', probation: 'probation',
  surveying: 'fieldScience', environmental: 'fieldScience', renewableEnergy: 'renewables', privateMilitary: 'pmc', dentalHygiene: 'dental',
  music: 'studio', acting: 'studio', contentCreator: 'studio', education: 'campus', pharmacy: 'retail',
  // Desk jobs run on computers, systems and office space; managers keep them up like any other fleet.
  tech: 'corpOffice', corporate: 'corpOffice', finance: 'corpOffice', accounting: 'corpOffice', law: 'corpOffice', legalSupport: 'corpOffice',
  realestate: 'corpOffice', insurance: 'corpOffice', propertyManagement: 'corpOffice', actuary: 'corpOffice', marketing: 'corpOffice', sales: 'corpOffice',
  humanResources: 'corpOffice', design: 'corpOffice', cybersecurity: 'corpOffice', dataScience: 'corpOffice', gameDevelopment: 'corpOffice',
  interpreter: 'corpOffice', nonprofit: 'corpOffice', privateInvestigator: 'corpOffice', bailBonds: 'corpOffice',
  engineering: 'designOffice', architecture: 'designOffice', journalism: 'newsroom', clergy: 'church', catholicClergy: 'church',
  flightAttendant: 'airline', physicianAssistant: 'clinic', counseling: 'therapyOffice', psychology: 'therapyOffice', dietitian: 'therapyOffice', speechPathology: 'therapyOffice',
  socialWork: 'agencyOffice', cps: 'agencyOffice', benefitsClaims: 'agencyOffice', revenue: 'agencyOffice', regulatory: 'agencyOffice', municipalAdmin: 'agencyOffice',
  planning: 'agencyOffice', oig: 'agencyOffice', legislativeStaff: 'agencyOffice', foreignService: 'agencyOffice', prosecution: 'agencyOffice', publicDefender: 'agencyOffice',
  courts: 'courthouse', caseOfficer: 'intel', sigint: 'intel', intelligence: 'intel', athletics: 'athletics', caregiving: 'homeCare',
};
const BUSINESS_GROUP = {
  restaurant: 'kitchen', catering: 'kitchen', foodTruck: 'kitchen', salon: 'salon', autoShop: 'autoShop',
  practice: 'clinic', ptClinic: 'clinic', chiroClinic: 'clinic', opticalShop: 'clinic', vetClinic: 'clinic', dentalPractice: 'dental',
  gym: 'gym', personalTraining: 'gym', retail: 'retail', pharmacyStore: 'retail', daycare: 'care', privateSchool: 'care',
  funeralHome: 'funeral', machineShop: 'machine', warehouse3pl: 'warehouse', productionCompany: 'studio', recordingStudio: 'studio',
  kennel: 'kennel', shootingRange: 'range',
  lawFirm: 'office', cpaFirm: 'office', consulting: 'office', engineeringFirm: 'office', softwareShop: 'office', marketingAgency: 'office', designStudio: 'office',
  architecturePractice: 'office', insuranceAgency: 'office', brokerage: 'office', propertyMgmt: 'office', staffingAgency: 'office', translationAgency: 'office',
  itSecurityFirm: 'office', medicalBilling: 'office', answeringService: 'office', piAgency: 'office', bailBondsAgency: 'office', homeInspection: 'office',
  counselingPractice: 'office', nutritionPractice: 'office', tutoring: 'office', testPrep: 'office', privateTutoring: 'office', surveyFirm: 'office',
  homeHealth: 'office', homeCareAgency: 'office', indieGameStudio: 'office', techStartup: 'office', solarInstaller: 'renewables',
};
const VOLUNTEER_GROUP = { police: 'volPolice', fire: 'volFire', ambulance: 'volEms', sar: 'sar', auxiliary: 'auxiliary', cap: 'cap', cert: 'cert', redcross: 'redcross', skiPatrol: 'skiPatrol', wildland: 'wildlandVol', mrc: 'mrc' };
const MILITARY_GROUP = { army: 'milGround', guard: 'milGround', marines: 'milMarine', navy: 'milNaval', airforce: 'milAir', spaceforce: 'milSpace', coastguard: 'milCoastGuard', usphs: 'milUsphs', noaa: 'milNoaa' };
/** Disaster teams (Civic Service tab). Federal teams draw from a government cache; nonprofits buy their own. */
const TEAM_GROUP = { fema: 'fema', dmat: 'dmat', usar: 'usar', teamRubicon: 'teamRubicon', ares: 'ares' };
const ISSUED = ['fema', 'dmat', 'usar', 'sdf'];
const COMMANDERS = ['companyCommander', 'battalionCommander'];
const MIL_REQUESTERS = ['firstSergeant', 'csm', 'platoonSergeant', 'platoonLeader', 'xo'];

/** Equipment a government issues: units overhaul and requisition rather than buy. */
export const isIssued = (c) => c.kind === 'military' || Boolean(c.issued);
const bizSize = (scale) => (scale < 1 ? 'small' : scale < 2 ? 'medium' : scale < 4 ? 'large' : 'enterprise');

/** Every equipment owner the player belongs to right now. */
export function contexts(state) {
  const out = [];
  const job = state.career?.job;
  if (job && JOB_GROUP[job.professionId]) {
    out.push({ kind: 'job', ref: 'job', key: job.employer.id, group: JOB_GROUP[job.professionId], size: SIZES.includes(job.employer.size) ? job.employer.size : 'medium', label: job.employer.name,
      manager: job.abilities.includes('budget'), requester: job.abilities.includes('supervise'), money: 'budget', sector: job.sector });
  }
  const biz = currentBusiness(state);
  if (biz && BUSINESS_GROUP[biz.typeId]) out.push({ kind: 'business', ref: 'business', key: `biz:${biz.id}`, group: BUSINESS_GROUP[biz.typeId], size: bizSize(biz.scale ?? 1), label: biz.name, manager: true, requester: false, money: 'cash', biz });
  for (const [sid, gid] of Object.entries(VOLUNTEER_GROUP)) {
    const m = state.emergency?.[sid];
    if (!m || m.onLeave) continue;
    const ranks = SERVICES[sid]?.ranks ?? [];
    out.push({ kind: 'volunteer', ref: `vol.${sid}`, key: `vol:${sid}:${m.unit}`, group: gid, size: 'small', label: m.unit, serviceId: sid, member: m,
      manager: m.rankIndex >= ranks.length - 2, requester: m.rankIndex >= ranks.length - 3, money: 'funds' });
  }
  for (const [tid, gid] of Object.entries(TEAM_GROUP)) {
    const m = state.service?.teams?.[tid];
    if (!m) continue;
    const n = TEAMS[tid].ranks.length;
    out.push({ kind: 'volunteer', ref: `team.${tid}`, key: `team:${tid}`, group: gid, size: 'medium', label: TEAMS[tid].name, serviceId: tid, member: m, issued: ISSUED.includes(tid),
      manager: m.rankIndex >= n - 2, requester: m.rankIndex >= n - 3, money: ISSUED.includes(tid) ? 'om' : 'funds' });
  }
  const sdf = state.service?.sdf;
  if (sdf) {
    out.push({ kind: 'volunteer', ref: 'team.sdf', key: `sdf:${sdf.stateId}`, group: 'sdf', size: 'medium', label: sdf.name, serviceId: 'sdf', member: sdf, issued: true,
      manager: sdf.rankIndex >= SDF_RANKS.length - 3, requester: sdf.rankIndex >= 4, money: 'om' });
  }
  const svc = state.military?.service;
  if (svc?.unit?.orgId && MILITARY_GROUP[svc.branch]) {
    const billet = billetFor(svc);
    const battalion = billet === 'battalionCommander' || billet === 'csm';
    out.push({ kind: 'military', ref: 'military', key: `mil:${svc.unit.orgId}${battalion ? '' : `:${svc.unit.company}`}`, group: MILITARY_GROUP[svc.branch], size: battalion ? 'large' : 'medium', label: battalion ? 'Battalion' : 'Company',
      manager: COMMANDERS.includes(billet), requester: MIL_REQUESTERS.includes(billet), money: 'om' });
  }
  return out;
}
/** One owner by ref: 'job', 'business', 'military', 'vol.<serviceId>' or 'team.<teamId|sdf>'. */
export const contextOf = (state, ref) => contexts(state).find((c) => c.ref === ref) ?? null;

/* ------------------------------------------------------------------ */
/* The record                                                          */
/* ------------------------------------------------------------------ */

const needOf = (cat, c) => cat.need[c.size] ?? 0;
const cats = (c) => GROUPS[c.group].categories;

/** A small RNG seeded by the owner's key, so the inherited fleet is the same whether it's first seen or first used. */
function seeded(key) {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const next = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  return { int: (a, b) => a + Math.floor(next() * (b - a + 1)), float: (a, b) => a + next() * (b - a) };
}

/** The equipment record for an owner (created on first use, with what it already had). `peek` builds it without saving — for views. */
export function recordOf(state, c, { peek = false } = {}) {
  let d = state.deptEquip?.[c.key];
  if (!d || d.group !== c.group) {
    const r = seeded(`${c.key}:${c.group}`);
    d = { group: c.group, units: {}, budget: 0, budgetAge: null, reserve: 0, readiness: null, bond: null, pending: [] };
    for (const [cid, cat] of Object.entries(cats(c))) {
      const [mid, model] = Object.entries(cat.models)[0];
      // A new business starts with the basics, new; everyone else inherits a fleet of mixed ages.
      const n = Math.round(needOf(cat, c) * (c.kind === 'business' ? 1 : r.float(0.75, 1)));
      d.units[cid] = Array.from({ length: n }, () => ({ model: mid, age: c.kind === 'business' ? 0 : r.int(0, Math.round(model.life * 1.3)), used: false, leased: false }));
    }
    d.budget = c.money === 'cash' ? 0 : Math.max(0, annualMoney(state, c) - extraCosts(c, d));
    d.budgetAge = state.character.age;
    if (peek) return d;
    state.deptEquip ??= {};
    state.deptEquip[c.key] = d;
  }
  d.pending ??= [];
  return d;
}

/** 0–100: how much of what's needed is in service and within its service life. */
export function readiness(state, c) {
  const d = recordOf(state, c, { peek: true });
  let total = 0;
  let weight = 0;
  for (const [cid, cat] of Object.entries(cats(c))) {
    const n = needOf(cat, c);
    if (!n) continue;
    const good = (d.units[cid] ?? []).reduce((s, u) => s + (u.age <= (cat.models[u.model]?.life ?? 10) ? 1 : 0.45), 0);
    total += Math.min(1, good / n) * cat.weight;
    weight += cat.weight;
  }
  return weight ? Math.round((total / weight) * 100) : 100;
}

/** What it costs to replace everything on schedule, per year. */
function schedule(c) {
  return Object.values(cats(c)).filter((x) => !x.facility).reduce((s, cat) => {
    const m = Object.values(cat.models)[0];
    return s + needOf(cat, c) * (m.cost / m.life);
  }, 0);
}

/** The yearly money: capital budget, district levy, or O&M allocation. */
export function annualMoney(state, c) {
  if (c.money === 'cash') return 0;
  if (c.money === 'funds') return Math.round((schedule(c) * 0.4) / 1000) * 1000;
  if (c.money === 'om') return Math.round((schedule(c) * 0.12) / 1000) * 1000;
  const fiscal = c.sector === 'private' ? 1 : clamp((state.publicService?.city?.fiscalHealth ?? 60) / 65, 0.55, 1.3);
  return Math.round((schedule(c) * fiscal) / 1000) * 1000;
}

/** Premises the organization already rents when you arrive are in its operating budget, not your equipment budget. */
function baseRent(c) {
  return Object.values(cats(c)).reduce((sum, cat) => {
    const first = Object.values(cat.models)[0];
    return sum + (first.rent ? first.rent * needOf(cat, c) : 0);
  }, 0);
}
const extraCosts = (c, d) => Math.max(0, fixedCosts(d) - (c.money === 'cash' ? 0 : baseRent(c)));

function fixedCosts(d) {
  let rent = 0;
  for (const [cid, units] of Object.entries(d.units)) {
    const cat = GROUPS[d.group].categories[cid];
    for (const u of units) {
      const m = cat?.models[u.model];
      if (!m) continue;
      if (m.rent) rent += m.rent;
      if (u.leased) rent += Math.round((m.cost / m.life) * 1.3);
    }
  }
  return rent;
}

/** Money available to spend now. */
export function available(c, d) {
  return c.money === 'cash' ? Math.max(0, Math.round(c.biz.cash)) : d.budget + d.reserve;
}
function pay(c, d, amount) {
  if (c.money === 'cash') { c.biz.cash -= amount; (c.biz.taxBook ??= { expense: 0, capex: 0 }).capex += Math.round(amount); return; }
  const fromBudget = Math.min(d.budget, amount);
  d.budget -= fromBudget;
  d.reserve -= amount - fromBudget;
}

/** What each kind of owner can do. */
export function powers(c) {
  const mil = c.kind === 'military';
  const issued = mil || c.issued;
  return { buy: !issued, used: !issued, lease: c.kind === 'job' || c.kind === 'business', retire: true, refurb: true, build: !issued, bank: c.money === 'budget', requisition: issued, fundraise: c.kind === 'volunteer' && !issued };
}
const refurbShare = (c, m) => (isIssued(c) ? 0.06 : m.remount ? 0.6 : 0.35);
export const refurbCost = (c, m) => Math.round(m.cost * refurbShare(c, m));

/** Fill shortfalls, then replace the most overdue, up to `share` of the money left. */
function autoReplace(c, d, share) {
  // The reserve exists for big items, so staff may draw all of it.
  let money = c.money === 'cash' ? Math.round(available(c, d) * share) : Math.round(d.budget * share + d.reserve);
  let spent = 0;
  const all = cats(c);
  for (const [cid, cat] of Object.entries(all)) {
    if (cat.facility || isIssued(c)) continue;
    const [mid, m] = Object.entries(cat.models)[0];
    while ((d.units[cid]?.length ?? 0) < needOf(cat, c) && m.cost <= money) {
      (d.units[cid] ??= []).push({ model: mid, age: 0, used: false, leased: false });
      money -= m.cost;
      spent += m.cost;
    }
  }
  const overdue = Object.entries(d.units).flatMap(([cid, units]) => (all[cid]?.facility ? [] : units.filter((u) => !u.leased).map((u) => ({ cid, u, over: u.age / (all[cid]?.models[u.model]?.life ?? 10) }))))
    .filter((x) => x.over >= 1).sort((a, b) => b.over - a.over);
  for (const { cid, u } of overdue) {
    const m = all[cid].models[u.model];
    // Replace if affordable; otherwise refurbish what can be refurbished.
    const refurb = isIssued(c) || (m.cost > money && m.refurb);
    const price = refurb ? refurbCost(c, m) : m.cost;
    if (price > money) continue;
    u.age = refurb ? Math.max(0, u.age - (isIssued(c) ? Math.round(m.life / 3) : 6)) : 0;
    u.used = false;
    money -= price;
    spent += price;
  }
  pay(c, d, spent);
  return spent;
}

function bigOverdue(c, d, annual) {
  return Object.entries(d.units).some(([cid, units]) => units.some((u) => {
    const m = cats(c)[cid]?.models[u.model];
    return m && !u.leased && u.age > m.life && m.cost > annual;
  }));
}

/* ------------------------------------------------------------------ */
/* The year                                                            */
/* ------------------------------------------------------------------ */

const BAD = {
  police: ['A patrol car\'s transmission died in the middle of a pursuit.', 'Radios dropped out during a shooting call — the system is past its life.'],
  campusPolice: ['Three blue-light phones on the north quad have been dead for a month.', 'The camera server failed during a burglary investigation.'],
  fire: ['An engine broke down on the way to a house fire; the second-due engine arrived four minutes later.', 'An SCBA failed a firefighter mid-fire. He made it out.'],
  stateFire: ['A dozer threw a track on the fire line, and the fire jumped the gap.', 'The helitack ship was grounded for maintenance on the worst day of the season.'],
  ems: ['An ambulance broke down with a patient on board.', 'A cardiac monitor failed mid-code. The crew used the backup AED.'],
  volFire: ['The old engine wouldn\'t start at 3 a.m.; the neighboring company took the call.', 'The SCBA bottles failed hydrostatic testing — half the company can\'t go interior.'],
  volEms: ['Your only ambulance was in the shop; a commercial service took 25 minutes to arrive.'],
  milGround: ['Half the company\'s vehicles were "non-mission capable" for the inspection.', 'A Bradley threw a track at the gunnery range. The whole platoon re-qualified a month late.'],
  milNaval: ['A main engine casualty cut the deployment short.', 'Cannibalizing parts from one helicopter to fly another wrecked the maintenance schedule.'],
  milAir: ['The mission-capable rate fell below 60%; the wing missed a tasking.', 'An aircraft sat on the ramp for months waiting for a part.'],
  milCoastGuard: ['A cutter missed patrol days waiting for parts.', 'A response boat\'s engine failed on a rescue; a second boat finished it.'],
};
const breakdown = (c) => BAD[c.group] ?? ['Equipment broke down at the worst moment — the fleet is past its service life.', 'Repairs on aging equipment ate into the budget.'];

function yearFor(ctx, c) {
  const { state, rng } = ctx;
  const d = recordOf(state, c);
  // Everything ages; leases end; deliveries arrive; a building opens.
  for (const [cid, units] of Object.entries(d.units)) {
    const cat = cats(c)[cid];
    for (const u of units) u.age += 1;
    d.units[cid] = units.filter((u) => !(u.leased && u.age >= (cat?.models[u.model]?.life ?? 5)));
  }
  for (const p of d.pending.filter((x) => state.character.age >= x.age)) {
    const cat = cats(c)[p.catId];
    const units = (d.units[p.catId] ??= []);
    const oldest = units.sort((a, b) => b.age - a.age)[0];
    if (oldest && units.length >= needOf(cat, c)) Object.assign(oldest, { model: p.model, age: 0, used: false });
    else units.push({ model: p.model, age: 0, used: false, leased: false });
    ctx.log(`A new ${cat.models[p.model].name} was fielded to your ${c.label.toLowerCase()}.`, cat.icon, 'good');
  }
  d.pending = d.pending.filter((x) => state.character.age < x.age);
  if (d.bond && state.character.age >= d.bond.readyAge) {
    const cat = cats(c)[d.bond.catId];
    (d.units[d.bond.catId] ??= []).push({ model: d.bond.model, age: 0, used: false, leased: false });
    ctx.log(`The new ${cat.models[d.bond.model].name.replace(/ \(.*\)$/, '').toLowerCase()} opened.`, cat.icon, 'good');
    d.bond = null;
  }
  // Money: what's left is spent by staff (all of it when you don't decide), then the new year's arrives.
  if (c.money !== 'cash' && d.budgetAge != null && d.budget > 0) autoReplace(c, d, c.manager ? 0.5 : 1);
  // Staff carry part of what's left into the reserve when something big is overdue.
  if (c.money === 'budget' && d.budget > 0 && bigOverdue(c, d, annualMoney(state, c))) d.reserve += Math.min(d.budget / 2, Math.max(0, annualMoney(state, c) * 2 - d.reserve));
  if (c.money === 'cash' && c.biz.equipAuto) d.auto = true;
  if (c.money === 'cash' && c.biz.role !== 'operator') autoReplace(c, d, d.auto ? 0.5 : 0.05);
  // You handed equipment to your staff: they keep it at standard within what you can afford.
  else if (d.auto && c.manager && c.money !== 'cash' && powers(c).buy) autoReplace(c, d, 1);
  if (c.money === 'funds') d.budget += annualMoney(state, c);
  else if (c.money !== 'cash') d.budget = Math.max(0, annualMoney(state, c) - extraCosts(c, d));
  else {
    c.biz.cash -= fixedCosts(d);
    (c.biz.taxBook ??= { expense: 0, capex: 0 }).expense += Math.round(fixedCosts(d));
  }
  d.budgetAge = state.character.age;
  // Readiness and what it does.
  const r = readiness(state, c);
  const prev = d.readiness;
  d.readiness = r;
  if (r < 55 && rng.chance((60 - r) / 60)) {
    ctx.log(`${c.label}: ${rng.pick(breakdown(c))}`, '🔧', 'bad');
    ctx.stat('stress', 2);
    if (c.money === 'cash') c.biz.cash -= Math.round(schedule(c) * 0.08);
  }
  // Neutral at the readiness staff keep on their own; better management shows up in your evaluation.
  const shift = clamp((r - 75) / 6, -4, 4);
  if (c.kind === 'job' && c.manager) state.career.job.performance = Math.round(clamp(state.career.job.performance + shift, 0, 100));
  if (c.kind === 'business') c.biz.quality = Math.round(clamp(c.biz.quality + shift / 1.5, 0, 100));
  if (c.kind === 'military' && c.manager) state.military.service.eval = Math.round(clamp(state.military.service.eval + shift, 0, 100));
  if (c.kind === 'volunteer' && c.manager && typeof c.member?.xp === 'number') c.member.xp = Math.max(0, c.member.xp + Math.round(shift * 3));
  if (c.manager && prev != null && r > prev + 5) ctx.log(`${c.label}: readiness rose to ${r}%.`, '📈', 'good');
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

/** Action args are 'ref|rest' so one set of actions serves every owner. */
function resolve(ctx, arg) {
  const [ref, rest = ''] = String(arg).split('|');
  const c = contextOf(ctx.state, ref);
  if (!c) { ctx.toast('Not available', 'warn'); return {}; }
  return { c, d: recordOf(ctx.state, c), parts: rest.split(':') };
}
const GRANT_NAME = { volFire: 'The federal Assistance to Firefighters grant', volEms: 'The state EMS equipment grant', volPolice: 'The Justice Assistance Grant', wildlandVol: 'The Volunteer Fire Assistance grant', sar: 'The state SAR equipment grant', cert: 'The Citizen Corps grant', mrc: 'The ASPR preparedness grant' };
const nice = (name) => name.replace(/ \(.*\)$/, '').replace(/^Leased /, '').toLowerCase();

export const EquipmentModule = {
  id: 'deptEquip',
  order: 30.95,
  init(state) {
    state.deptEquip ??= {};
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    for (const c of contexts(state)) {
      if (c.kind === 'job' && !state.career.job.paidThisYear) continue;
      yearFor(ctx, c);
    }
  },
  actions: {
    /** 'kind|catId:modelId[:used|:lease]' */
    buy(ctx, arg) {
      const { c, d, parts } = resolve(ctx, arg);
      if (!c) return;
      if (!c.manager) return ctx.toast('Only whoever holds the budget can buy', 'warn');
      if (!powers(c).buy) return ctx.toast(c.kind === 'military' ? 'Military units request equipment through fielding' : 'Equipment is issued — request it from the program', 'warn');
      const [cid, mid, how] = parts;
      const cat = cats(c)[cid];
      const m = cat?.models[mid];
      if (!m || m.build) return;
      if ((how === 'used' && !m.usedCost) || (how === 'lease' && !m.lease)) return;
      const price = m.rent ? m.rent : how === 'used' ? m.usedCost : how === 'lease' ? Math.round((m.cost / m.life) * 1.3) : m.cost;
      if (price > available(c, d)) return ctx.toast(`$${price.toLocaleString()} — you have $${available(c, d).toLocaleString()}`, 'warn');
      pay(c, d, price);
      (d.units[cid] ??= []).push({ model: mid, age: how === 'used' ? Math.round(m.life * 0.6) : 0, used: how === 'used', leased: how === 'lease' });
      if (c.kind === 'business') c.biz.assets += Math.round(price * 0.7);
      ctx.log(m.rent ? `You leased ${nice(m.name)} for $${m.rent.toLocaleString()} a year.` : `You ${how === 'lease' ? 'leased' : 'bought'} ${how === 'used' ? 'a used' : 'a new'} ${nice(m.name)} for $${price.toLocaleString()}${how === 'lease' ? ' a year' : ''}.`, cat.icon, 'good');
    },
    /**
     * 'kind|catId:modelId:worn|short' — in one go: replace every worn-out unit in a category, or
     * bring the category up to standard. Buys as many as the money covers.
     */
    bulk(ctx, arg) {
      const { c, d, parts } = resolve(ctx, arg);
      if (!c?.manager || !powers(c).buy) return;
      const [cid, mid, mode] = parts;
      const cat = cats(c)[cid];
      const m = cat?.models[mid];
      if (!m || m.build || m.rent) return;
      const units = (d.units[cid] ??= []);
      let money = available(c, d);
      let n = 0;
      if (mode === 'worn') {
        for (const u of units.filter((x) => !x.leased && x.age > (cat.models[x.model]?.life ?? 10)).sort((a, b) => b.age - a.age)) {
          if (m.cost > money) break;
          Object.assign(u, { model: mid, age: 0, used: false });
          money -= m.cost;
          n += 1;
        }
      } else {
        while (units.length < needOf(cat, c) && m.cost <= money) {
          units.push({ model: mid, age: 0, used: false, leased: false });
          money -= m.cost;
          n += 1;
        }
      }
      if (!n) return ctx.toast(`Each ${nice(m.name)} costs $${m.cost.toLocaleString()} — not enough money.`, 'warn');
      pay(c, d, n * m.cost);
      if (c.kind === 'business') c.biz.assets += Math.round(n * m.cost * 0.7);
      ctx.log(`${mode === 'worn' ? 'Replaced' : 'Added'} ${n} ${nice(m.name)}${n > 1 ? 's' : ''} for $${(n * m.cost).toLocaleString()}.`, cat.icon, 'good');
    },
    /** 'kind|' — replace everything past its service life and fill every shortfall, as far as the money goes. */
    replaceAll(ctx, arg) {
      const { c, d } = resolve(ctx, arg);
      if (!c?.manager || !powers(c).buy) return;
      const spent = autoReplace(c, d, 1);
      ctx.log(spent ? `Staff replaced worn-out equipment and filled shortfalls: $${spent.toLocaleString()}.` : 'Nothing affordable needed replacing.', '🛠️', spent ? 'good' : undefined);
    },
    /** 'kind|' — hand day-to-day equipment decisions to your staff (or take them back). */
    autoManage(ctx, arg) {
      const { c, d } = resolve(ctx, arg);
      if (!c?.manager) return;
      d.auto = !d.auto;
      ctx.toast(d.auto ? 'Staff now keep equipment at standard each year' : 'You decide equipment purchases again', 'info');
    },
    /** 'kind|catId' — refurbish / overhaul / remount the oldest unit. */
    refurb(ctx, arg) {
      const { c, d, parts } = resolve(ctx, arg);
      if (!c?.manager) return;
      const cat = cats(c)[parts[0]];
      const u = (d.units[parts[0]] ?? []).filter((x) => !x.leased && (isIssued(c) || cat.models[x.model]?.refurb || cat.models[x.model]?.remount)).sort((a, b) => b.age - a.age)[0];
      if (!u) return ctx.toast('Nothing to refurbish', 'warn');
      const m = cat.models[u.model];
      const price = refurbCost(c, m);
      if (price > available(c, d)) return ctx.toast(`$${price.toLocaleString()} — over budget`, 'warn');
      pay(c, d, price);
      u.age = m.remount ? 0 : Math.max(0, u.age - (isIssued(c) ? Math.round(m.life / 3) : 6));
      ctx.log(isIssued(c) ? `You put a ${m.name} through depot overhaul ($${price.toLocaleString()} of ${c.kind === 'military' ? 'O&M' : 'program'} funds).` : m.remount ? `You remounted a ${nice(m.name)} box onto a new chassis for $${price.toLocaleString()}.` : `You refurbished a ${nice(m.name)} ($${price.toLocaleString()}): years more service.`, cat.icon, 'good');
    },
    /** 'kind|catId' — retire the oldest (auction; or turn in, for the military). */
    retire(ctx, arg) {
      const { c, d, parts } = resolve(ctx, arg);
      if (!c?.manager) return;
      const cid = parts[0];
      const cat = cats(c)[cid];
      const units = d.units[cid] ?? [];
      const u = units.filter((x) => !x.leased).sort((a, b) => b.age - a.age)[0];
      if (!u) return;
      const m = cat.models[u.model];
      const value = m.rent || isIssued(c) ? 0 : Math.round((m.cost * 0.6 ** ((u.age / Math.max(1, m.life)) * 3)) / 100) * 100;
      d.units[cid] = units.filter((x) => x !== u);
      if (c.money === 'cash') c.biz.cash += value;
      else d.reserve += value;
      ctx.log(m.rent ? `You ended the lease on ${nice(m.name)}.` : isIssued(c) ? `You turned in a worn-out ${m.name}.` : `You retired a ${u.age}-year-old ${nice(m.name)} and sold it for $${value.toLocaleString()}.`, cat.icon);
    },
    bank(ctx, arg) {
      const { c, d } = resolve(ctx, arg);
      if (!c?.manager || !powers(c).bank) return;
      if (yearlyCount(ctx.state, `equip.bank.${c.ref}`)) return ctx.toast('Once a year', 'warn');
      bumpYearly(ctx.state, `equip.bank.${c.ref}`);
      const moved = Math.min(d.budget, Math.max(0, annualMoney(ctx.state, c) * 2 - d.reserve));
      d.reserve += moved;
      d.budget -= moved;
      ctx.log(`You moved $${moved.toLocaleString()} into the capital reserve for a big purchase.`, '🏦');
    },
    /** 'kind|catId:modelId' — a new building: a bond (government), a loan (business) or a fund drive (volunteers). */
    build(ctx, arg) {
      const { state, rng } = ctx;
      const { c, d, parts } = resolve(ctx, arg);
      if (!c?.manager || !powers(c).build) return;
      const [cid, mid] = parts;
      const m = cats(c)[cid]?.models[mid];
      if (!m?.build) return;
      if (d.bond) return ctx.toast('A building project is already underway', 'warn');
      if (yearlyCount(state, `equip.bond.${c.ref}`)) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, `equip.bond.${c.ref}`);
      const approval = c.kind === 'volunteer' ? 50 + Math.min(30, d.budget / 50000) : state.publicService?.city?.approval ?? 55;
      const odds = clamp(0.25 + approval / 150 + (readiness(state, c) < 60 ? 0.15 : 0), 0.1, 0.85);
      const who = c.kind === 'volunteer' ? 'The township and your members' : c.sector === 'private' ? 'The board' : 'The council';
      if (rng.chance(odds)) {
        d.bond = { catId: cid, model: mid, readyAge: state.character.age + 2 };
        ctx.log(`${who} approved $${(m.cost / 1e6).toFixed(1)} million for a new ${nice(m.name)}. It opens in about two years.`, cats(c)[cid].icon, 'milestone');
      } else ctx.log(`${who} voted down your plan for a new ${nice(m.name)}. Try again next year.`, cats(c)[cid].icon, 'warn');
    },
    /** Supervisors / NCOs: ask for a replacement. */
    request(ctx, arg) {
      const { state, rng } = ctx;
      const { c, d, parts } = resolve(ctx, arg);
      if (!c || c.manager || !c.requester) return;
      if (yearlyCount(state, `equip.request.${c.ref}`)) return ctx.toast('One request a year', 'warn');
      bumpYearly(state, `equip.request.${c.ref}`);
      const cat = cats(c)[parts[0]];
      const [mid, m] = Object.entries(cat.models).find(([, x]) => !x.build && !x.rent) ?? [];
      if (!m) return;
      if (rng.chance(0.4)) {
        (d.units[parts[0]] ??= []).push({ model: mid, age: 0, used: false, leased: false });
        ctx.log(`Your request went through: a new ${nice(m.name)}.`, cat.icon, 'good');
      } else ctx.log('Your equipment request died in the budget process.', '📋', 'warn');
    },
    /** Military: request fielding of a newer model (arrives next year if approved). */
    requisition(ctx, arg) {
      const { state, rng } = ctx;
      const { c, d, parts } = resolve(ctx, arg);
      if (!c?.manager || !isIssued(c)) return;
      if (yearlyCount(state, `equip.requisition.${c.ref}`)) return ctx.toast('One fielding request a year', 'warn');
      bumpYearly(state, `equip.requisition.${c.ref}`);
      const [cid, mid] = parts;
      const cat = cats(c)[cid];
      if (!cat?.models[mid]) return;
      const n = rng.chance(0.45) ? Math.max(1, Math.round(needOf(cat, c) * rng.float(0.1, 0.3))) : 0;
      if (!n) return ctx.log(`Your request for ${cat.models[mid].name}s went up the chain — other units are ahead of you in the fielding schedule.`, cat.icon, 'warn');
      for (let i = 0; i < n; i++) d.pending.push({ catId: cid, model: mid, age: state.character.age + 1 });
      ctx.log(`Approved: ${n} new ${cat.models[mid].name}${n > 1 ? 's' : ''} will be fielded to your unit next year.`, cat.icon, 'good');
    },
    /** Volunteers: fundraisers and grants. */
    fundraise(ctx, arg) {
      const { state, rng } = ctx;
      const { c, d } = resolve(ctx, arg);
      if (!c || !powers(c).fundraise) return;
      if (yearlyCount(state, `equip.fund.${c.ref}`)) return ctx.toast('One fund drive a year', 'warn');
      bumpYearly(state, `equip.fund.${c.ref}`);
      const raised = rng.int(4000, 22000) + (c.manager ? rng.int(0, 10000) : 0);
      d.budget += raised;
      ctx.stat('happiness', 2);
      ctx.log(`${rng.pick(['The pancake breakfast', 'The boot drive at the intersection', 'The annual fund letter', 'The carnival and raffle'])} raised $${raised.toLocaleString()} for ${c.label}.`, '🥞', 'good');
    },
    grant(ctx, arg) {
      const { state, rng } = ctx;
      const { c, d, parts } = resolve(ctx, arg);
      if (!c?.manager || !powers(c).fundraise) return;
      if (yearlyCount(state, `equip.grant.${c.ref}`)) return ctx.toast('One grant application a year', 'warn');
      bumpYearly(state, `equip.grant.${c.ref}`);
      const [cid, mid] = parts;
      const m = cats(c)[cid]?.models[mid];
      if (!m || m.build || m.rent) return;
      const match = Math.round(m.cost * 0.1);
      if (d.budget < match) return ctx.toast(`You need the 10% match ($${match.toLocaleString()}) in the bank first`, 'warn');
      ctx.stat('stress', 3);
      if (rng.chance(0.3 + state.stats.smarts / 400)) {
        d.budget -= match;
        (d.units[cid] ??= []).push({ model: mid, age: 0, used: false, leased: false });
        ctx.log(`${GRANT_NAME[c.group] ?? 'The grant'} came through: a new ${nice(m.name)} for a $${match.toLocaleString()} local match.`, cats(c)[cid].icon, 'milestone');
      } else ctx.log('The grant panel turned you down this round. Most first applications fail.', '📄', 'warn');
    },
  },
};
