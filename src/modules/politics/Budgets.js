/**
 * Government budgets: your city, your state (or province) and your country each
 * run one, and it is the thing politics is mostly about.
 *
 * Revenue comes from taxes — the rates the legislatures set (Laws: the city's
 * property tax, the state's income tax, the national income and corporate
 * taxes) — and from the economy: a recession takes a tenth of it. Spending goes
 * to areas (police, fire, schools, health, roads, defense…), each funded at some
 * share of normal. Whatever doesn't balance is borrowed; debt costs interest;
 * a government that keeps borrowing gets downgraded, and then something gives.
 *
 * Who decides: the executive proposes and the legislature passes. NPC
 * administrations govern by their party — labor governments spend more on
 * people and raise taxes when money runs short, business governments cut — and
 * if you hold the office (mayor, governor, president, premier, prime
 * minister), you write the budget yourself.
 *
 * It reaches you:
 *  - working for a government, your area's funding sets your equipment money,
 *    hiring and layoffs (reductions in force), and in a fiscal emergency your
 *    step increase is frozen;
 *  - as a resident, taxes rise and fall, and service levels (police, fire,
 *    EMS, health, welfare) shift what happens to you;
 *  - in the US, a deadlocked federal budget can shut the government down.
 *
 * Every number is a share of a normal year's revenue (1.0); dollar figures for
 * display come from the jurisdiction's population.
 *
 * state.gov = { budgets: { [key]: Budget } }
 * Budget = { key, level, where, name, funding: { [area]: share }, debt, balance, health, rating,
 *            levy, history: [{ age, balance, health }], since, shutdown, ask: { [area]: share } | null }
 */
import { regimeOf } from '../world/Regimes.js';
import { clamp, Random } from '../../core/Random.js';
import { REGIONS } from '../life/Regions.js';
import { STATES } from '../life/States.js';
import { COUNTRIES } from '../world/Countries.js';
import { nationalWageLevel } from '../career/PayGrades.js';
import { lawValue } from './Laws.js';
import { LEGISLATURES } from './NationalOffices.js';
import { executiveOf, unifiedGovernment } from './Legislature.js';
import { cpcLevel } from './CommunistParty.js';

export const LEVELS = ['city', 'state', 'national'];

/** What each level of government spends on, with each area's share of a normal budget. */
export const AREAS = {
  city: {
    police: { label: 'Police', icon: '🚓', weight: 0.22, popular: 1 },
    fire: { label: 'Fire', icon: '🚒', weight: 0.13, popular: 1 },
    ems: { label: 'Ambulance (EMS)', icon: '🚑', weight: 0.05, popular: 1 },
    works: { label: 'Roads, water & sanitation', icon: '🛣️', weight: 0.17, popular: 0.6 },
    transit: { label: 'Transit', icon: '🚌', weight: 0.08, popular: 0.5, social: true },
    parks: { label: 'Parks & libraries', icon: '🌳', weight: 0.08, popular: 0.6, social: true },
    housing: { label: 'Housing & social services', icon: '🏘️', weight: 0.08, popular: 0.4, social: true },
    health: { label: 'Public health', icon: '🩺', weight: 0.05, popular: 0.5, social: true },
    admin: { label: 'City administration', icon: '🏢', weight: 0.14, popular: 0.1 },
  },
  state: {
    education: { label: 'Schools & universities', icon: '🎓', weight: 0.3, popular: 1, social: true },
    health: { label: 'Health care', icon: '🏥', weight: 0.26, popular: 0.9, social: true },
    welfare: { label: 'Welfare & child services', icon: '🤝', weight: 0.08, popular: 0.4, social: true },
    corrections: { label: 'Prisons & probation', icon: '🔒', weight: 0.07, popular: 0.2 },
    police: { label: 'State police & wildlife', icon: '🚔', weight: 0.05, popular: 0.8 },
    justice: { label: 'Courts & prosecutors', icon: '⚖️', weight: 0.04, popular: 0.3 },
    roads: { label: 'Highways & transport', icon: '🛣️', weight: 0.1, popular: 0.7 },
    environment: { label: 'Environment & forests', icon: '🌲', weight: 0.03, popular: 0.4 },
    admin: { label: 'State administration', icon: '🏛️', weight: 0.07, popular: 0.1 },
  },
  national: {
    pensions: { label: 'Pensions', icon: '👵', weight: 0.24, popular: 1, social: true },
    health: { label: 'Health', icon: '🏥', weight: 0.24, popular: 0.9, social: true },
    defense: { label: 'Defense & intelligence', icon: '🎖️', weight: 0.13, popular: 0.6 },
    welfare: { label: 'Welfare & unemployment', icon: '🤝', weight: 0.1, popular: 0.4, social: true },
    policing: { label: 'Federal law enforcement & borders', icon: '🦅', weight: 0.04, popular: 0.7 },
    infrastructure: { label: 'Infrastructure & transport', icon: '🏗️', weight: 0.05, popular: 0.6 },
    education: { label: 'Education & research', icon: '🔬', weight: 0.04, popular: 0.7, social: true },
    environment: { label: 'Parks & environment', icon: '🏞️', weight: 0.02, popular: 0.4 },
    foreign: { label: 'Diplomacy & aid', icon: '🌐', weight: 0.01, popular: 0.1 },
    admin: { label: 'Government operations', icon: '🏛️', weight: 0.13, popular: 0.1 },
  },
};

/** Which budget a public career is paid from: level and area. */
export const AREA_OF = {
  police: ['city', 'police'], sheriff: ['city', 'police'], jail: ['city', 'police'], dispatch: ['city', 'police'], airportPolice: ['city', 'police'], transitPolice: ['city', 'transit'],
  fire: ['city', 'fire'], airportFire: ['city', 'fire'], ems: ['city', 'ems'],
  publicWorks: ['city', 'works'], waterUtility: ['city', 'works'], councilInspector: ['city', 'admin'], planning: ['city', 'admin'], municipalAdmin: ['city', 'admin'],
  transit: ['city', 'transit'], transitMaintenance: ['city', 'transit'], schoolBus: ['state', 'education'], library: ['city', 'parks'],
  publicHealth: ['city', 'health'], animalControl: ['city', 'health'], education: ['state', 'education'], communityCollege: ['state', 'education'],
  university: ['state', 'education'], universityPolice: ['state', 'education'],
  probation: ['state', 'corrections'], corrections: ['state', 'corrections'], forensics: ['state', 'justice'], courts: ['state', 'justice'], prosecution: ['state', 'justice'], publicDefender: ['state', 'justice'],
  statePolice: ['state', 'police'], gameWarden: ['state', 'police'], stateFire: ['state', 'environment'], forester: ['state', 'environment'], environmental: ['state', 'environment'],
  cps: ['state', 'welfare'], revenue: ['state', 'admin'], dot: ['state', 'roads'], legislativeStaff: ['state', 'admin'], emergencyManagement: ['state', 'admin'],
  fbi: ['national', 'policing'], dea: ['national', 'policing'], atf: ['national', 'policing'], usms: ['national', 'policing'], usss: ['national', 'policing'], borderPatrol: ['national', 'policing'], tsa: ['national', 'policing'], federalPrisons: ['national', 'policing'],
  caseOfficer: ['national', 'defense'], sigint: ['national', 'defense'], intelligence: ['national', 'defense'],
  benefitsClaims: ['national', 'pensions'], airTrafficControl: ['national', 'infrastructure'], postal: ['national', 'admin'], meteorology: ['national', 'education'], nationalLab: ['national', 'education'],
  regulatory: ['national', 'admin'], oig: ['national', 'admin'], foreignService: ['national', 'foreign'], parkService: ['national', 'environment'],
};
/** Each sector's default level, for public careers not listed. */
const SECTOR_LEVEL = { municipal: 'city', state: 'state', public: 'state', federal: 'national' };

/** Debt that is normal at each level (years of revenue), and what it costs. */
const DEBT_NORM = { city: 0.6, state: 0.8, national: 4 };
const RATE = { city: 0.035, state: 0.035, national: 0.03 };

/* ------------------------------------------------------------------ */
/* Jurisdictions                                                       */
/* ------------------------------------------------------------------ */

const cc = (state) => state.character.countryId ?? 'US';
const regionHere = (state) => REGIONS[state.character.regionId] ?? REGIONS.midcity;
/** Where each level is, for someone living here: a region id, a state id, a country code. */
export function whereAt(state, level) {
  if (level === 'city') return state.character.regionId ?? 'midcity';
  if (level === 'state') return regionHere(state).state;
  return cc(state);
}
export const budgetKey = (level, where) => `${level}:${where}`;

/** People served, for dollar figures (cities by kind, states by size, countries by census). */
const CITY_POP = { Rural: 12000, 'Small town': 40000, 'Small city': 120000, Suburb: 90000, 'Mid-size city': 600000, 'Sun Belt metro': 1400000, 'Mountain metro': 900000, 'Coastal metro': 1500000, 'High-cost metro': 2500000, 'Major metro': 3000000, 'Capital region': 1000000 };
const STATE_POP = { small: 1200000, medium: 4000000, large: 9000000, enterprise: 15000000, mega: 30000000 };
const NATION_POP = { US: 335e6, CA: 40e6, GB: 68e6, AU: 27e6, DE: 84e6, FR: 68e6, IT: 59e6, JP: 124e6, KR: 52e6, MX: 129e6, PH: 115e6, IN: 1430e6, NZ: 5.2e6, IE: 5.3e6, ES: 48e6, NL: 18e6, SE: 10.5e6, BR: 216e6, SG: 6e6, IL: 9.8e6, PS: 5.4e6, CN: 1410e6, NG: 224e6, KE: 55e6, ZA: 62e6, ID: 278e6 };
/** Government spending per person, US dollars (a big-state country spends more of its income). */
const PER_HEAD = { city: 2600, state: 6000, national: 20000 };
const GOV_SIZE = { FR: 1.3, SE: 1.25, IT: 1.2, DE: 1.15, NL: 1.1, GB: 1.05, CA: 1.05, ES: 1.05, IE: 0.8, KR: 0.8, JP: 0.95, AU: 0.95, NZ: 1, SG: 0.6, IL: 1, MX: 0.6, BR: 0.9, IN: 0.5, PH: 0.5, CN: 0.7, NG: 0.3, KE: 0.5, ZA: 0.8, ID: 0.5, PS: 0.6 };

export function population(level, where) {
  if (level === 'city') return CITY_POP[REGIONS[where]?.type] ?? 200000;
  if (level === 'state') return STATE_POP[STATES[where]?.population] ?? 4000000;
  return NATION_POP[where] ?? 30e6;
}
/** A normal year's revenue in dollars (display). */
export function annualDollars(level, where) {
  const country = level === 'national' ? where : level === 'state' ? STATES[where]?.country ?? 'US' : REGIONS[where]?.country ?? 'US';
  const wages = country === 'US' ? 1 : nationalWageLevel(country) * (GOV_SIZE[country] ?? 1);
  return population(level, where) * PER_HEAD[level] * wages;
}

export function jurisdictionName(state, level, where) {
  if (level === 'city') return REGIONS[where]?.name?.split(',')[0] ?? 'Your city';
  if (level === 'state') return STATES[where]?.name ?? where;
  return where === 'US' ? 'the federal government' : `${COUNTRIES[where]?.name ?? where}'s national government`;
}

/* ------------------------------------------------------------------ */
/* The budget record                                                   */
/* ------------------------------------------------------------------ */

const baseSpend = (level) => 0.985 - DEBT_NORM[level] * RATE[level];

function newBudget(state, level, where) {
  const r = new Random(((state.world?.seed ?? 1) * 7919 + where.split('').reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 17)) >>> 0);
  const funding = {};
  for (const id of Object.keys(AREAS[level])) funding[id] = Math.round(r.float(0.92, 1.06) * 100) / 100;
  const b = { key: budgetKey(level, where), level, where, name: jurisdictionName(state, level, where), funding, debt: Math.round(DEBT_NORM[level] * r.float(0.6, 1.4) * 100) / 100, balance: 0, health: 60, rating: 'AA', levy: 0, history: [], since: state.character.age, shutdown: false, ask: null };
  b.health = healthOf(b);
  b.rating = ratingOf(b.health);
  return b;
}

/** The budget at a level where you live (made the first time it's needed). */
export function budgetAt(state, level, { where = whereAt(state, level), create = true } = {}) {
  state.gov ??= { budgets: {} };
  const key = budgetKey(level, where);
  if (!state.gov.budgets[key] && create) state.gov.budgets[key] = newBudget(state, level, where);
  return state.gov.budgets[key] ?? null;
}

/** The share of normal revenue the taxes raise, from the rates the legislatures set. */
export function taxFactor(state, level, where) {
  if (level === 'city') return { cut: 0.94, standard: 1, hike: 1.08 }[state.laws?.cities?.[where]?.propertyTax ?? 'standard'] ?? 1;
  if (level === 'state') {
    const income = { cut: 0.92, standard: 1, hike: 1.07 }[lawValue(state, 'stateIncomeTax', where)] ?? 1;
    return income + (lawValue(state, 'businessTax', where) ?? 0) * 0.6;
  }
  const income = { cut: 0.92, standard: 1, hike: 1.07 }[lawValue(state, 'incomeTax')] ?? 1;
  const corp = where === 'US' ? ((lawValue(state, 'corporateRate') ?? 0.21) - 0.21) * 0.5 : 0;
  return income + corp;
}
const ECONOMY = { expansion: 1, peak: 1.03, recovery: 0.96, recession: 0.9 };

/** What spending on an area costs relative to its weight: contracting out and privatizing save money, abolishing saves it all. */
export const ARRANGEMENT_COST = { own: 1, contracted: 0.85, private: 0.82, volunteer: 0.45, merged: 0.9, abolished: 0 };

export function spending(state, b, { funding = b.funding } = {}) {
  const areas = AREAS[b.level];
  const total = Object.values(areas).reduce((s, a) => s + a.weight, 0);
  const scale = baseSpend(b.level) / total;
  let spend = 0;
  for (const [id, a] of Object.entries(areas)) spend += a.weight * scale * (funding[id] ?? 1) * arrangementCost(state, b, id);
  // A legislated public-sector pay raise (or cut) moves the payroll, about half of spending.
  const pay = lawValue(state, 'publicPay', b.level === 'state' ? b.where : null, b.level === 'city' ? b.where : null);
  const adj = b.level === 'city' ? pay?.city : b.level === 'state' ? pay?.state : pay?.federal;
  return spend * (1 + (adj ?? 0) * 0.5);
}

/** Services in this area run on other arrangements (ServiceReform registers the lookup). */
let arrangementLookup = () => 1;
export const setArrangementLookup = (fn) => { arrangementLookup = fn; };
const arrangementCost = (state, b, area) => arrangementLookup(state, b, area) ?? 1;

export function revenue(state, b) {
  return (ECONOMY[state.economy?.phase] ?? 1) * taxFactor(state, b.level, b.where) + (b.levy ?? 0);
}

/** 0–100: a balanced budget with normal debt is ~65; deficits and heavy debt pull it down. */
export function healthOf(b) {
  const excess = Math.max(0, b.debt - DEBT_NORM[b.level]) / DEBT_NORM[b.level];
  return Math.round(clamp(65 + b.balance * 300 - excess * 30, 0, 100));
}
export function ratingOf(health) {
  return health >= 80 ? 'AAA' : health >= 62 ? 'AA' : health >= 48 ? 'A' : health >= 35 ? 'BBB' : health >= 22 ? 'BB' : 'B';
}

/** This year's books: revenue, spending, interest; the balance goes to (or comes off) the debt. */
export function closeBooks(state, b) {
  const rev = revenue(state, b);
  const spend = spending(state, b);
  const interest = b.debt * RATE[b.level];
  b.balance = Math.round((rev - spend - interest) * 1000) / 1000 || 0;
  b.debt = Math.round(Math.max(0, b.debt - b.balance) * 100) / 100;
  b.health = healthOf(b);
  b.rating = ratingOf(b.health);
  b.history = [...b.history.slice(-11), { age: state.character.age, balance: b.balance, health: b.health }];
  return b;
}

/* ------------------------------------------------------------------ */
/* What a budget means for you                                         */
/* ------------------------------------------------------------------ */

/** The level and area a public job is paid from (null for private work). */
export function jobArea(job) {
  if (!job || job.sector === 'private') return null;
  const [level, area] = AREA_OF[job.professionId] ?? [SECTOR_LEVEL[job.sector] ?? 'state', 'admin'];
  return { level, area };
}
/** The budget a public job is paid from, where the employer is. */
export function jobBudget(state, job, { create = false } = {}) {
  const a = jobArea(job);
  if (!a) return null;
  const regionId = job.employer?.regionId ?? state.character.regionId;
  const where = a.level === 'city' ? regionId : a.level === 'state' ? (REGIONS[regionId]?.state ?? whereAt(state, 'state')) : cc(state);
  return budgetAt(state, a.level, { where, create });
}
/** How well your job's area is funded (1 = normal; private work: 1). */
export function jobFunding(state, job) {
  const a = jobArea(job);
  if (!a) return 1;
  const b = jobBudget(state, job);
  return b ? (b.funding[a.area] ?? 1) : 1;
}
/** Fiscal health behind a public job (60 when unknown). */
export const jobFiscalHealth = (state, job) => jobBudget(state, job)?.health ?? 60;
/** A fiscal emergency freezes within-grade step increases. */
export const stepFreeze = (state, job) => Boolean(jobArea(job)) && jobFiscalHealth(state, job) < 22;

/** A service level where you live (1 = normal funding) — e.g. serviceLevel(state, 'city', 'police'). */
export function serviceLevel(state, level, area) {
  const b = budgetAt(state, level, { create: false });
  return b ? (b.funding[area] ?? 1) * arrangementCost(state, b, area) || 0 : 1;
}

/* ------------------------------------------------------------------ */
/* The year                                                            */
/* ------------------------------------------------------------------ */

/**
 * An NPC administration governs its budget by its party's lights. `bloc` is 'labor' or
 * 'business'. Returns a short sentence when it does something you'd notice.
 */
export function npcBudgetYear(state, b, bloc, rng) {
  const areas = AREAS[b.level];
  const labor = bloc === 'labor';
  let note = null;
  for (const [id, a] of Object.entries(areas)) {
    const drift = (labor ? (a.social ? 0.012 : 0.004) : (a.social ? -0.012 : id === 'police' || id === 'defense' ? 0.008 : -0.004)) + rng.float(-0.01, 0.01);
    b.funding[id] = Math.round(clamp((b.funding[id] ?? 1) + drift, 0.6, 1.4) * 1000) / 1000;
  }
  // Money running out: labor raises revenue, business cuts. A city must balance its books.
  const short = b.health < 35 || (b.level === 'city' && b.balance < -0.02 && b.debt > DEBT_NORM.city * 1.2);
  if (short) {
    if (labor && (b.levy ?? 0) < 0.06) {
      b.levy = Math.round(((b.levy ?? 0) + 0.025) * 1000) / 1000 || 0;
      note = `${cap(b.name)} raised taxes and fees to close a budget gap.`;
    } else {
      for (const id of Object.keys(areas)) b.funding[id] = Math.round(clamp(b.funding[id] * 0.95, 0.6, 1.4) * 1000) / 1000;
      note = `${cap(b.name)} cut spending across the board by 5% to close a budget gap.`;
    }
  } else if (b.health > 78) {
    if (labor) for (const [id, a] of Object.entries(areas)) { if (a.social) b.funding[id] = Math.round(clamp(b.funding[id] * 1.03, 0.6, 1.4) * 1000) / 1000; }
    else if ((b.levy ?? 0) > -0.04) b.levy = Math.round(((b.levy ?? 0) - 0.02) * 1000) / 1000 || 0;
    note = labor || regimeOf(state.character.countryId ?? 'US').jobs === 'assigned' ? `${cap(b.name)} put its surplus into services.` : `${cap(b.name)} returned its surplus as a tax rebate.`;
  }
  // Temporary levies fade as budgets recover.
  if (!short && (b.levy ?? 0) > 0 && b.health > 55) b.levy = Math.round(Math.max(0, b.levy - 0.01) * 1000) / 1000 || 0;
  return note;
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Most of a budget's change is the year; an executive's requested changes (`ask`) pass if the legislature lets them. */
export function applyAsk(b, share = 1) {
  if (!b.ask) return 0;
  let moved = 0;
  for (const [id, target] of Object.entries(b.ask)) {
    const cur = b.funding[id] ?? 1;
    const next = Math.round(clamp(cur + (target - cur) * share, 0.6, 1.4) * 1000) / 1000;
    if (next !== cur) moved += 1;
    b.funding[id] = next;
  }
  b.ask = null;
  return moved;
}

/** Labels for the view. */
export const pct = (x) => `${Math.round((x ?? 1) * 100)}%`;
export function fundingLabel(f) {
  return f >= 1.12 ? 'Generous' : f >= 1.02 ? 'Well funded' : f >= 0.94 ? 'Normal' : f >= 0.84 ? 'Tight' : f >= 0.72 ? 'Cut back' : 'Starved';
}
export const DEBT_NORMS = DEBT_NORM;

/* ------------------------------------------------------------------ */
/* The module                                                          */
/* ------------------------------------------------------------------ */

/** Which level of government an office runs (null for legislators, judges and the like). */
export function executiveLevel(officeId) {
  if (!officeId) return null;
  if (officeId === 'mayor') return 'city';
  if (officeId === 'governor') return 'state';
  if (officeId === 'president') return 'national';
  if (['cn_governor', 'vn_governor', 'kp_governor'].includes(officeId)) return 'state';
  if (['vn_pm', 'kp_premier'].includes(officeId)) return 'national';
  for (const L of Object.values(LEGISLATURES)) {
    if (L.execOffice === officeId) return 'national';
    if (L.prov?.execOffice === officeId) return 'state';
  }
  return null;
}
/** The budget you write, if you hold an executive office. */
export function myBudget(state, { create = true } = {}) {
  // In China a Party Secretary writes the budget beside (and above) the mayor or governor.
  const level = executiveLevel(state.politics?.office?.id) ?? cpcLevel(state);
  return level ? budgetAt(state, level, { create }) : null;
}

/** How much of your budget request the legislature gives you: all of it with your party in charge. */
export function passShare(state, level) {
  if (unifiedGovernment(state, level)) return 1;
  const approval = state.politics?.office?.approval ?? 50;
  return approval >= 60 ? 0.75 : 0.5;
}

const RATING_ORDER = ['B', 'BB', 'BBB', 'A', 'AA', 'AAA'];

/** Changes an executive can ask for in one budget. */
export const BUDGET_MOVES = 4;
export const STEP = 0.05;

export const BudgetsModule = {
  id: 'budgets',
  order: 23.5,
  actions: {
    /** 'area|up' or 'area|down': ask the legislature for 5% more (or less) for an area in next year's budget. */
    fund(ctx, arg) {
      const { state } = ctx;
      const b = myBudget(state);
      if (!b) return ctx.toast('Only a mayor, governor, president or prime minister writes a budget', 'warn');
      const [area, dir] = String(arg).split('|');
      if (!AREAS[b.level][area]) return;
      b.ask ??= {};
      const moves = Object.keys(b.ask).length;
      if (!(area in b.ask) && moves >= BUDGET_MOVES) return ctx.toast(`A budget can change ${BUDGET_MOVES} areas a year`, 'warn');
      const cur = b.ask[area] ?? b.funding[area] ?? 1;
      const next = Math.round(clamp(cur + (dir === 'up' ? STEP : -STEP), 0.6, 1.4) * 100) / 100;
      if (Math.abs(next - (b.funding[area] ?? 1)) < 0.001) delete b.ask[area];
      else b.ask[area] = next;
      // Popular areas: voters notice the announcement before the legislature acts.
      const o = state.politics.office;
      if (o) o.approval = Math.round(clamp(o.approval + (dir === 'up' ? 1 : -1.5) * AREAS[b.level][area].popular, 0, 100));
    },
  },
  init(state) {
    state.gov ??= { budgets: {} };
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    const rng = new Random(((state.world?.seed ?? 1) * 2654435761 + state.character.age * 97 + 3) >>> 0);
    const job = state.career?.job;
    const mine = myBudget(state);
    const seen = new Set();
    const books = [...LEVELS.map((level) => budgetAt(state, level)), jobBudget(state, job, { create: true })].filter(Boolean);
    for (const b of books) {
      if (seen.has(b.key)) continue;
      seen.add(b.key);
      const ratingBefore = b.rating;
      const here = b.where === whereAt(state, b.level);
      const exec = here ? executiveOf(state, b.level) : null;
      if (b === mine) {
        const share = passShare(state, b.level);
        const moved = applyAsk(b, share);
        if (moved) ctx.log(`The ${b.level === 'city' ? 'council' : 'legislature'} passed your budget${share < 1 ? ', trimmed: the other party controls it' : ''}.`, '📑', 'good');
      } else {
        b.ask = null;
        const note = npcBudgetYear(state, b, exec?.caucus ?? (rng.chance(0.5) ? 'labor' : 'business'), rng);
        if (note && here && (b.level !== 'national' || rng.chance(0.5))) ctx.log(note, '🏛️', 'info');
      }
      closeBooks(state, b);
      // Ratings agencies notice; residents and public employees hear about it.
      // Closed and sanctioned states have no rating to lose: nobody lends to them.
      if (!regimeOf(state.character.countryId ?? 'US').ratings) b.rating = ratingBefore;
      if (b.rating !== ratingBefore && (here || b === jobBudget(state, job, { create: false }))) {
        const up = RATING_ORDER.indexOf(b.rating) > RATING_ORDER.indexOf(ratingBefore);
        ctx.log(`${cap(b.name)}'s credit rating was ${up ? 'upgraded' : 'downgraded'} to ${b.rating}${up ? '' : ': borrowing costs more, and cuts are coming'}.`, up ? '📈' : '📉', up ? 'good' : 'warn');
      }
      // A US federal budget standoff: divided government and a deficit can shut it down.
      b.shutdown = b.level === 'national' && b.where === 'US' && !unifiedGovernment(state, 'national') && rng.chance(b.health < 40 ? 0.3 : 0.08);
    }
    // The city you work for: its books and your department's view of them move together.
    const city = state.publicService?.city;
    const cb = job?.sector === 'municipal' ? jobBudget(state, job, { create: false }) : null;
    if (city && cb) city.fiscalHealth = Math.round(clamp(city.fiscalHealth * 0.5 + cb.health * 0.5, 0, 100));
  },
};
