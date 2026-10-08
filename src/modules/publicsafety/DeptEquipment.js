/**
 * The equipment a department runs on — and the managers who keep it running.
 *
 *   Fleets       Patrol cars (sedans, SUVs or hybrids), unmarked cars, K-9
 *                trucks, motorcycles, an armored rescue vehicle; engines,
 *                ladder trucks, heavy rescues, brush trucks, airport crash
 *                trucks; ambulances (van or modular box); buses (diesel,
 *                hybrid, electric); plows and dump trucks. Plus radios and
 *                body cameras, SCBA, cardiac monitors.
 *   Facilities   Stations and precincts you own, build (with a bond the
 *                council has to approve) or renovate, and storefront
 *                substations or posts you lease.
 *   Money        A yearly capital budget, set by the city's finances (or the
 *                company's), that you lose if you don't spend. Buy new or
 *                used, lease, refurbish an old engine, remount an ambulance
 *                box on a new chassis, or auction off what's worn out.
 *   Readiness    How much of what the department needs is in service and
 *                within its service life. Everyone feels it — old rigs break
 *                down at the worst time — and it's on the manager's
 *                evaluation.
 *
 * Who decides: anyone with budget authority (captains, battalion chiefs,
 * chiefs, managers). Supervisors can put in a request. Everyone sees it.
 *
 * state.deptEquip[employerId] = { group, units: { [catId]: [{ model, age, used, leased }] },
 *   budget, budgetAge, reserve, readiness, bond: { catId, readyAge } | null }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';

const SIZES = ['small', 'medium', 'large', 'enterprise'];
const need = (a, b, c, d) => ({ small: a, medium: b, large: c, enterprise: d });
const M = (name, cost, life, upkeep, extra = {}) => ({ name, cost, life, upkeep, ...extra });

/** Equipment groups. A category is what the department needs; models are how to fill it. */
export const GROUPS = {
  police: {
    name: 'Fleet & Facilities', categories: {
      patrol: { name: 'Patrol cars', icon: '🚓', need: need(6, 20, 60, 150), weight: 3, models: {
        sedan: M('Patrol sedan', 42000, 4, 6000, { usedCost: 16000 }),
        suv: M('Police Interceptor SUV', 55000, 5, 7000, { lease: true }),
        hybrid: M('Hybrid Interceptor', 58000, 5, 4000, { lease: true }),
      } },
      unmarked: { name: 'Unmarked cars', icon: '🚘', need: need(2, 5, 15, 40), weight: 1, models: { sedan: M('Unmarked sedan', 36000, 6, 4000, { usedCost: 14000, lease: true }) } },
      k9: { name: 'K-9 vehicles', icon: '🐕', need: need(0, 1, 4, 10), weight: 1, models: { k9: M('K-9 SUV with kennel insert', 70000, 5, 7000) } },
      motors: { name: 'Motorcycles', icon: '🏍️', need: need(0, 2, 6, 20), weight: 0.5, models: { motor: M('Police motorcycle', 32000, 5, 3000) } },
      armored: { name: 'Armored rescue vehicle', icon: '🛡️', need: need(0, 0, 1, 2), weight: 0.5, models: { bearcat: M('Armored rescue vehicle', 350000, 15, 12000, { usedCost: 120000 }) } },
      radios: { name: 'Radios & body cameras', icon: '📻', need: need(8, 25, 75, 190), weight: 1.5, models: { p25: M('P25 radio + body camera kit', 9000, 6, 600) } },
      stations: { name: 'Precincts & substations', icon: '🏢', need: need(1, 2, 4, 8), weight: 1.5, facility: true, models: {
        own: M('Police precinct (build with a bond)', 6000000, 40, 120000, { build: true }),
        storefront: M('Leased storefront substation', 0, 99, 0, { rent: 60000 }),
      } },
    },
  },
  airportPolice: {
    name: 'Fleet & Facilities', categories: {
      patrol: { name: 'Patrol vehicles', icon: '🚓', need: need(4, 10, 25, 50), weight: 3, models: { suv: M('Police Interceptor SUV', 55000, 5, 7000, { lease: true }), cart: M('Electric terminal patrol cart', 14000, 6, 800) } },
      k9: { name: 'Explosives-detection K-9 vehicles', icon: '🐕', need: need(1, 2, 4, 8), weight: 1.5, models: { k9: M('K-9 SUV with kennel insert', 70000, 5, 7000) } },
      radios: { name: 'Radios & body cameras', icon: '📻', need: need(8, 20, 50, 110), weight: 1.5, models: { p25: M('P25 radio + body camera kit', 9000, 6, 600) } },
      stations: { name: 'Police posts in the terminals', icon: '🛂', need: need(1, 2, 3, 5), weight: 1, facility: true, models: { post: M('Leased terminal police post', 0, 99, 0, { rent: 45000 }) } },
    },
  },
  campusPolice: {
    name: 'Fleet & Facilities', categories: {
      patrol: { name: 'Patrol cars', icon: '🚓', need: need(3, 6, 12, 25), weight: 3, models: { suv: M('Police Interceptor SUV', 55000, 5, 7000, { lease: true }), hybrid: M('Hybrid Interceptor', 58000, 5, 4000, { lease: true }) } },
      bikes: { name: 'Bicycles & carts', icon: '🚲', need: need(4, 8, 16, 30), weight: 0.5, models: { bike: M('Police mountain bike', 2500, 5, 200), cart: M('Electric patrol cart', 14000, 6, 800) } },
      phones: { name: 'Blue-light emergency phones', icon: '🔵', need: need(20, 50, 120, 250), weight: 1, models: { pole: M('Blue-light emergency call box', 8000, 15, 300) } },
      radios: { name: 'Radios & body cameras', icon: '📻', need: need(6, 15, 35, 70), weight: 1.5, models: { p25: M('P25 radio + body camera kit', 9000, 6, 600) } },
      cameras: { name: 'Campus security cameras', icon: '📹', need: need(60, 150, 400, 900), weight: 1, models: { cam: M('IP security camera', 2500, 7, 150) } },
      stations: { name: 'Police station & substations', icon: '🏢', need: need(1, 1, 2, 3), weight: 1, facility: true, models: { own: M('Campus police station (build with a bond)', 4000000, 40, 80000, { build: true }), dorm: M('Leased residence-hall substation', 0, 99, 0, { rent: 24000 }) } },
    },
  },
  fire: {
    name: 'Apparatus & Stations', categories: {
      engine: { name: 'Engines', icon: '🚒', need: need(1, 3, 8, 20), weight: 3, models: {
        pumper: M('Pumper engine', 850000, 15, 25000, { usedCost: 260000, refurb: true }),
        quint: M('Quint (engine + 75-ft aerial)', 1200000, 18, 30000, { refurb: true }),
      } },
      ladder: { name: 'Ladder trucks', icon: '🪜', need: need(0, 1, 3, 8), weight: 2, models: {
        aerial: M('100-ft aerial ladder truck', 1600000, 20, 35000, { usedCost: 450000, refurb: true }),
        tiller: M('Tractor-drawn tiller', 1900000, 20, 38000, { refurb: true }),
      } },
      rescue: { name: 'Heavy rescue', icon: '🧗', need: need(0, 0, 1, 3), weight: 1, models: { rescue: M('Heavy rescue', 1100000, 18, 25000, { refurb: true }) } },
      brush: { name: 'Brush trucks', icon: '🌲', need: need(0, 1, 2, 4), weight: 0.5, models: { brush: M('Type 6 brush truck', 350000, 12, 9000, { usedCost: 90000 }) } },
      scba: { name: 'SCBA air packs', icon: '🫁', need: need(10, 30, 80, 200), weight: 1.5, models: { scba: M('SCBA set', 9000, 10, 400) } },
      stations: { name: 'Fire stations', icon: '🏚️', need: need(1, 3, 8, 20), weight: 1.5, facility: true, models: {
        own: M('Fire station (build with a bond)', 9000000, 50, 150000, { build: true }),
        temp: M('Leased temporary quarters', 0, 99, 0, { rent: 80000 }),
      } },
    },
  },
  arff: {
    name: 'Apparatus & Stations', categories: {
      crash: { name: 'ARFF crash trucks', icon: '✈️', need: need(2, 3, 5, 8), weight: 3, models: { striker: M('High-reach crash truck', 1200000, 15, 30000, { refurb: true }), compact: M('Rapid-intervention vehicle', 600000, 15, 15000) } },
      scba: { name: 'SCBA air packs', icon: '🫁', need: need(10, 20, 40, 70), weight: 1, models: { scba: M('SCBA set', 9000, 10, 400) } },
      stations: { name: 'ARFF stations', icon: '🛬', need: need(1, 1, 2, 3), weight: 1.5, facility: true, models: { own: M('ARFF station (build with a bond)', 12000000, 50, 180000, { build: true }) } },
    },
  },
  ems: {
    name: 'Fleet & Facilities', categories: {
      ambulance: { name: 'Ambulances', icon: '🚑', need: need(2, 6, 18, 45), weight: 3, models: {
        van: M('Type II van ambulance', 160000, 6, 14000, { usedCost: 55000, lease: true }),
        box: M('Type III modular ambulance', 240000, 8, 16000, { usedCost: 80000, remount: true, lease: true }),
      } },
      monitors: { name: 'Cardiac monitors', icon: '💓', need: need(2, 6, 18, 45), weight: 1.5, models: { monitor: M('12-lead cardiac monitor/defibrillator', 40000, 7, 1500, { lease: true }) } },
      stretchers: { name: 'Power-load stretchers', icon: '🛏️', need: need(2, 6, 18, 45), weight: 1, models: { power: M('Power-load stretcher system', 45000, 10, 1200) } },
      stations: { name: 'Stations & posts', icon: '🏠', need: need(1, 2, 6, 15), weight: 1, facility: true, models: { post: M('Leased ambulance post', 0, 99, 0, { rent: 30000 }), own: M('EMS station (build with a bond)', 3000000, 40, 60000, { build: true }) } },
    },
  },
  transit: {
    name: 'Fleet & Facilities', categories: {
      bus: { name: 'Buses', icon: '🚌', need: need(10, 40, 150, 500), weight: 3, models: {
        diesel: M('Diesel bus', 600000, 12, 40000, { usedCost: 150000 }),
        hybrid: M('Hybrid bus', 850000, 12, 30000),
        electric: M('Battery-electric bus', 1100000, 12, 18000),
      } },
      vans: { name: 'Paratransit vans', icon: '♿', need: need(4, 12, 40, 120), weight: 1, models: { van: M('Wheelchair-lift van', 90000, 6, 9000, { lease: true }) } },
      garages: { name: 'Bus garages', icon: '🏭', need: need(1, 1, 3, 8), weight: 1, facility: true, models: { own: M('Bus garage (build with a bond)', 40000000, 50, 600000, { build: true }) } },
    },
  },
  publicWorks: {
    name: 'Fleet & Facilities', categories: {
      plows: { name: 'Plow & dump trucks', icon: '🚛', need: need(4, 12, 35, 90), weight: 3, models: { tandem: M('Tandem-axle plow/dump truck', 250000, 12, 15000, { usedCost: 70000 }) } },
      loaders: { name: 'Loaders & backhoes', icon: '🚜', need: need(1, 3, 8, 20), weight: 1.5, models: { loader: M('Wheel loader', 280000, 15, 14000, { usedCost: 90000, lease: true }) } },
      yards: { name: 'Public works yards', icon: '🏗️', need: need(1, 1, 2, 4), weight: 1, facility: true, models: { own: M('Public works yard (build with a bond)', 15000000, 50, 200000, { build: true }), shed: M('Leased salt shed & yard', 0, 99, 0, { rent: 50000 }) } },
    },
  },
};

const PROFESSION_GROUP = {
  police: 'police', sheriff: 'police', statePolice: 'police', transitPolice: 'police', privatePolice: 'police', airportPolice: 'airportPolice', universityPolice: 'campusPolice',
  fire: 'fire', airportFire: 'arff', ems: 'ems', privateEms: 'ems', transit: 'transit', schoolBus: 'transit', paratransit: 'transit', publicWorks: 'publicWorks',
};

export const groupOf = (job) => (job ? PROFESSION_GROUP[job.professionId] ?? null : null);
export const canManage = (job) => Boolean(job?.abilities?.includes('budget'));
export const canRequest = (job) => Boolean(job?.abilities?.includes('supervise'));
const sizeOf = (job) => (SIZES.includes(job?.employer?.size) ? job.employer.size : 'medium');
const needOf = (cat, job) => cat.need[sizeOf(job)] ?? 0;

/** The department's equipment record (created on first look, with the fleet it already had). */
export function deptOf(state, job = state.career.job, rng = null) {
  const g = groupOf(job);
  if (!g) return null;
  state.deptEquip ??= {};
  let d = state.deptEquip[job.employer.id];
  if (!d) {
    const r = rng ?? { int: (a, b) => Math.floor((a + b) / 2), float: (a, b) => (a + b) / 2, chance: () => false };
    d = { group: g, units: {}, budget: 0, budgetAge: null, reserve: 0, readiness: null, bond: null };
    for (const [cid, cat] of Object.entries(GROUPS[g].categories)) {
      const [mid, model] = Object.entries(cat.models)[0];
      const n = Math.round(needOf(cat, job) * r.float(0.75, 1));
      d.units[cid] = Array.from({ length: n }, () => ({ model: mid, age: r.int(0, Math.round(model.life * 1.3)), used: false, leased: false }));
    }
    d.budget = Math.max(0, capitalBudget(state, job) - fixedCosts(d));
    d.budgetAge = state.character.age;
    state.deptEquip[job.employer.id] = d;
  }
  return d;
}

/** 0–100: how much of what's needed is in service and within its service life. */
export function readiness(state, job = state.career.job) {
  const d = deptOf(state, job);
  if (!d) return null;
  let total = 0;
  let weight = 0;
  for (const [cid, cat] of Object.entries(GROUPS[d.group].categories)) {
    const n = needOf(cat, job);
    if (!n) continue;
    const units = d.units[cid] ?? [];
    const life = (u) => cat.models[u.model]?.life ?? 10;
    const good = units.reduce((s, u) => s + (u.age <= life(u) ? 1 : 0.45), 0);
    total += Math.min(1, good / n) * cat.weight;
    weight += cat.weight;
  }
  return weight ? Math.round((total / weight) * 100) : 100;
}

/** Yearly capital budget: replacing everything on schedule, scaled by how flush the city is. */
export function capitalBudget(state, job) {
  const g = GROUPS[groupOf(job)];
  const schedule = Object.values(g.categories).filter((c) => !c.facility).reduce((s, cat) => {
    const m = Object.values(cat.models)[0];
    return s + needOf(cat, job) * (m.cost / m.life);
  }, 0);
  const fiscal = job.sector === 'private' ? 1 : clamp((state.publicService?.city?.fiscalHealth ?? 60) / 65, 0.55, 1.3);
  return Math.round((schedule * fiscal) / 1000) * 1000;
}

/** Running costs that come out of the capital budget: leases and leased premises. */
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

/** Replace the most overdue units with new ones of the same model, up to `share` of the remaining budget. */
function autoReplace(d, job, share) {
  let money = Math.round(d.budget * share);
  let spent = 0;
  const cats = GROUPS[d.group].categories;
  const candidates = Object.entries(d.units).flatMap(([cid, units]) => (cats[cid]?.facility ? [] : units.filter((u) => !u.leased).map((u) => ({ cid, u, over: u.age / (cats[cid]?.models[u.model]?.life ?? 10) }))))
    .sort((a, b) => b.over - a.over);
  // Fill shortfalls first, then replace the oldest.
  for (const [cid, cat] of Object.entries(cats)) {
    if (cat.facility) continue;
    const [mid, m] = Object.entries(cat.models)[0];
    while ((d.units[cid]?.length ?? 0) < needOf(cat, job) && m.cost <= money) {
      (d.units[cid] ??= []).push({ model: mid, age: 0, used: false, leased: false });
      money -= m.cost;
      spent += m.cost;
    }
  }
  for (const { cid, u, over } of candidates) {
    const m = cats[cid].models[u.model];
    if (over < 1 || m.cost > money) continue;
    u.age = 0;
    u.used = false;
    money -= m.cost;
    spent += m.cost;
  }
  d.budget -= spent;
  return spent;
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

const BAD = {
  campusPolice: ['Three blue-light phones on the north quad have been dead for a month; a student reported it after a scary night.', 'The camera system\'s server failed during a burglary investigation.'],
  police: ['A patrol car\'s transmission died in the middle of a pursuit.', 'Radios dropped out during a shooting call — the system is past its life.', 'Officers doubled up two to a car because a third of the fleet is in the shop.'],
  airportPolice: ['A patrol truck broke down on the airfield perimeter road.', 'The K-9 vehicle\'s climate system failed in August; the dog was pulled from duty.'],
  fire: ['An engine broke down on the way to a house fire; the second-due engine arrived four minutes later.', 'The ladder truck failed its annual aerial test and sat out for a month.', 'An SCBA failed a firefighter mid-fire. He made it out.'],
  arff: ['A crash truck failed its FAA response-time drill. The airport\'s certificate is at risk.', 'A crash truck\'s foam system failed inspection.'],
  ems: ['An ambulance broke down with a patient on board; another unit had to come.', 'A cardiac monitor failed mid-code. The crew used the backup AED.'],
  transit: ['Buses broke down on three routes during rush hour.', 'A bus caught fire in the depot — no injuries, one less bus.'],
  publicWorks: ['Half the plow fleet was down in the first big storm; side streets went unplowed for days.', 'A dump truck\'s brakes failed on a hill. Nobody was hurt.'],
};

export const DeptEquipmentModule = {
  id: 'deptEquip',
  order: 30.95,
  init(state) {
    state.deptEquip ??= {};
  },
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    if (!groupOf(job) || !job.paidThisYear) return;
    const d = deptOf(state, job, rng);
    // Everything ages; leases end after their term and the units go back.
    for (const [cid, units] of Object.entries(d.units)) {
      const cat = GROUPS[d.group].categories[cid];
      for (const u of units) u.age += 1;
      d.units[cid] = units.filter((u) => !(u.leased && u.age >= (cat?.models[u.model]?.life ?? 5)));
    }
    // A bond-built station opens.
    if (d.bond && state.character.age >= d.bond.readyAge) {
      const cat = GROUPS[d.group].categories[d.bond.catId];
      (d.units[d.bond.catId] ??= []).push({ model: d.bond.model, age: 0, used: false, leased: false });
      ctx.log(`The new ${cat.models[d.bond.model].name.replace(/ \(build with a bond\)/, '').toLowerCase()} opened. Ribbon, scissors, the mayor.`, cat.icon, 'good');
      d.bond = null;
    }
    // Last year's money: the fleet staff spend what's left on the oldest equipment (all of it when you're not
    // the one deciding); whatever they can't use goes back to the general fund.
    if (d.budgetAge != null && d.budget > 0) {
      const spent = autoReplace(d, job, canManage(job) ? 0.5 : 1);
      if (canManage(job) && spent) ctx.log(`Your fleet staff spent $${spent.toLocaleString()} of your leftover equipment budget replacing the oldest units; the rest went back to the general fund.`, '🔧');
    }
    d.budget = Math.max(0, capitalBudget(state, job) - fixedCosts(d));
    d.budgetAge = state.character.age;
    // Readiness: everyone lives with it; managers are judged on it.
    const r = readiness(state, job);
    const prev = d.readiness;
    d.readiness = r;
    if (r < 55 && rng.chance((60 - r) / 60)) {
      ctx.log(rng.pick(BAD[d.group] ?? BAD.police), '🔧', 'bad');
      ctx.stat('stress', 3);
      if (!canManage(job) && rng.chance(0.15)) ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(10, 25) });
    }
    if (canManage(job)) {
      job.performance = Math.round(clamp(job.performance + clamp((r - 60) / 8, -4, 4), 0, 100));
      if (prev != null && r > prev + 5) ctx.log(`Department readiness rose to ${r}%.`, '📈', 'good');
    }
  },
  actions: {
    /** arg: 'catId:modelId[:used|:lease]' */
    buy(ctx, arg) {
      const { state } = ctx;
      const job = state.career.job;
      if (!canManage(job)) return ctx.toast('Only managers with budget authority can buy equipment', 'warn');
      const [cid, mid, how] = String(arg).split(':');
      const d = deptOf(state, job, ctx.rng);
      const cat = GROUPS[d.group].categories[cid];
      const m = cat?.models[mid];
      if (!m || m.build) return;
      if (how === 'used' && !m.usedCost) return;
      if (how === 'lease' && !m.lease && !m.rent) return;
      const price = m.rent ? m.rent : how === 'used' ? m.usedCost : how === 'lease' ? Math.round((m.cost / m.life) * 1.3) : m.cost;
      const pool = d.budget + d.reserve;
      if (price > pool) return ctx.toast(`$${price.toLocaleString()} — you have $${pool.toLocaleString()} this year`, 'warn');
      const fromBudget = Math.min(d.budget, price);
      d.budget -= fromBudget;
      d.reserve -= price - fromBudget;
      (d.units[cid] ??= []).push({ model: mid, age: how === 'used' ? Math.round(m.life * 0.6) : 0, used: how === 'used', leased: how === 'lease' });
      ctx.log(m.rent ? `You leased a ${m.name.replace(/^Leased /, '').toLowerCase()} for $${m.rent.toLocaleString()} a year.` : `You ${how === 'lease' ? 'leased' : 'bought'} ${how === 'used' ? 'a used' : 'a new'} ${m.name.toLowerCase()} for $${price.toLocaleString()}${how === 'lease' ? ' a year' : ''}.`, cat.icon, 'good');
    },
    /** Refurbish (fire apparatus) or remount (ambulance box onto a new chassis) the oldest unit of a category. */
    refurb(ctx, cid) {
      const { state } = ctx;
      const job = state.career.job;
      if (!canManage(job)) return;
      const d = deptOf(state, job, ctx.rng);
      const cat = GROUPS[d.group].categories[cid];
      const u = (d.units[cid] ?? []).filter((x) => !x.leased && (cat.models[x.model]?.refurb || cat.models[x.model]?.remount)).sort((a, b) => b.age - a.age)[0];
      if (!u) return ctx.toast('Nothing to refurbish', 'warn');
      const m = cat.models[u.model];
      const price = Math.round(m.cost * (m.remount ? 0.6 : 0.35));
      if (price > d.budget + d.reserve) return ctx.toast(`$${price.toLocaleString()} — over budget`, 'warn');
      const fromBudget = Math.min(d.budget, price);
      d.budget -= fromBudget;
      d.reserve -= price - fromBudget;
      u.age = m.remount ? 0 : Math.max(0, u.age - 6);
      ctx.log(m.remount ? `You remounted a ${m.name.toLowerCase()} box onto a new chassis for $${price.toLocaleString()} — like new for 60% of the price.` : `You sent a ${m.name.toLowerCase()} out for a refurbishment ($${price.toLocaleString()}): six more years of service.`, cat.icon, 'good');
    },
    /** Retire and auction the oldest unit. */
    retire(ctx, cid) {
      const { state } = ctx;
      const job = state.career.job;
      if (!canManage(job)) return;
      const d = deptOf(state, job, ctx.rng);
      const cat = GROUPS[d.group].categories[cid];
      const units = d.units[cid] ?? [];
      const u = units.filter((x) => !x.leased).sort((a, b) => b.age - a.age)[0];
      if (!u) return;
      const m = cat.models[u.model];
      const value = m.rent ? 0 : Math.round((m.cost * 0.6 ** (u.age / Math.max(1, m.life) * 3)) / 1000) * 1000;
      d.units[cid] = units.filter((x) => x !== u);
      d.reserve += value;
      ctx.log(m.rent ? `You gave up the lease on a ${m.name.replace(/^Leased /, '').toLowerCase()}.` : `You retired a ${u.age}-year-old ${m.name.toLowerCase()} and sold it at surplus auction for $${value.toLocaleString()}.`, cat.icon);
    },
    /** Bank this year's unspent money toward a big purchase next year. */
    bank(ctx) {
      const { state } = ctx;
      const job = state.career.job;
      if (!canManage(job)) return;
      const d = deptOf(state, job, ctx.rng);
      if (yearlyCount(state, 'equip.bank')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'equip.bank');
      const cap = capitalBudget(state, job) * 2;
      const moved = Math.min(d.budget, Math.max(0, cap - d.reserve));
      d.reserve += moved;
      d.budget -= moved;
      ctx.log(`You moved $${moved.toLocaleString()} into the capital reserve for a big purchase.`, '🏦');
    },
    /** Ask the council for a bond to build a station. */
    build(ctx, arg) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!canManage(job)) return;
      const [cid, mid] = String(arg).split(':');
      const d = deptOf(state, job, rng);
      const cat = GROUPS[d.group].categories[cid];
      const m = cat?.models[mid];
      if (!m?.build) return;
      if (d.bond) return ctx.toast('A building project is already underway', 'warn');
      if (yearlyCount(state, 'equip.bond')) return ctx.toast('One bond request a year', 'warn');
      bumpYearly(state, 'equip.bond');
      const approval = state.publicService?.city?.approval ?? 55;
      const odds = clamp(0.25 + approval / 150 + (readiness(state, job) < 60 ? 0.15 : 0) + (job.performance - 60) / 200, 0.1, 0.85);
      if (rng.chance(odds)) {
        d.bond = { catId: cid, model: mid, readyAge: state.character.age + 2 };
        ctx.log(`The ${job.sector === 'private' ? 'board' : 'council'} approved a $${(m.cost / 1e6).toFixed(1)} million bond for a new ${m.name.replace(/ \(build with a bond\)/, '').toLowerCase()}. It opens in about two years.`, cat.icon, 'milestone');
        job.performance = Math.min(100, job.performance + 5);
      } else ctx.log(`The ${job.sector === 'private' ? 'board' : 'council'} voted down your bond for a new ${m.name.replace(/ \(build with a bond\)/, '').toLowerCase()}. Try again next year — with better numbers.`, cat.icon, 'warn');
    },
    /** Supervisors: put in a request for a replacement. */
    request(ctx, cid) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!canRequest(job) || canManage(job)) return;
      if (yearlyCount(state, 'equip.request')) return ctx.toast('One request a year', 'warn');
      bumpYearly(state, 'equip.request');
      const d = deptOf(state, job, rng);
      const cat = GROUPS[d.group].categories[cid];
      const [mid, m] = Object.entries(cat.models).find(([, x]) => !x.build && !x.rent) ?? [];
      if (!m) return;
      if (rng.chance(clamp(0.3 + job.performance / 200, 0.2, 0.8))) {
        (d.units[cid] ??= []).push({ model: mid, age: 0, used: false, leased: false });
        ctx.log(`Your request went through: a new ${m.name.toLowerCase()} for your unit.`, cat.icon, 'good');
      } else ctx.log('Your equipment request died in the budget office.', '📋', 'warn');
    },
  },
};
