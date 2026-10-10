/**
 * Laws on the books, at three levels: city ordinances, state statutes and
 * federal law. Legislatures (Legislature.js) pass bills that change them;
 * the rest of the game reads them here.
 *
 *   levels    where the law can be made
 *   kind      'flag' (on/off), 'number' (a value with a step), 'choice' (named settings)
 *   lean      'labor' or 'business': which side a stronger version favors (for bloc votes)
 *   combine   how levels stack: 'max' (the highest applies — minimum wage), 'state' (the
 *             state's law, unless federal law sets one), 'federal' (federal only)
 *
 * state.laws = { federal: { [id]: value }, states: { [ST]: { [id]: value } }, cities: { [regionId]: { [id]: value } },
 *                enacted: [{ age, level, where, lawId, value, sponsor }] }
 *
 * A missing value means the law is at its default (from the state's profile, or the
 * federal baseline).
 */
import { STATES } from '../life/States.js';
import { REGIONS } from '../life/Regions.js';

export const LAWS = {
  minWage: {
    name: 'Minimum wage', icon: '💵', kind: 'number', levels: ['city', 'state', 'federal'], step: 1.5, min: 7.25, max: 25, lean: 'labor', combine: 'max',
    unit: (v) => `$${v.toFixed(2)}/hr`,
    base: { federal: 7.25, state: (st) => STATES[st]?.minWage ?? 7.25, city: () => null },
    effect: 'Raises pay floors and low-wage businesses\' payroll.',
  },
  rightToWork: {
    name: 'Right-to-work', icon: '✊', kind: 'flag', levels: ['state', 'federal'], lean: 'business', combine: 'state',
    base: { federal: null, state: (st) => Boolean(STATES[st]?.rightToWork) },
    effect: 'Bans union-security clauses: no agency fees, weaker unions.',
  },
  cardCheck: {
    name: 'Card-check recognition', icon: '🗳️', kind: 'flag', levels: ['state', 'federal'], lean: 'labor', combine: 'state',
    base: { federal: null, state: () => false },
    effect: 'A union is recognized once a majority signs cards: organizing drives win far more often.',
  },
  paidLeave: {
    name: 'Paid family & sick leave', icon: '🍼', kind: 'flag', levels: ['city', 'state', 'federal'], lean: 'labor', combine: 'any',
    base: { federal: false, state: () => false, city: () => false },
    effect: 'Employers fund paid leave: payroll +1.5%, staff morale up.',
  },
  businessTax: {
    name: 'State corporate tax surcharge', icon: '🏢', kind: 'number', levels: ['state'], step: 0.01, min: 0, max: 0.06, lean: 'labor', combine: 'state',
    unit: (v) => `${(v * 100).toFixed(0)}% on C-corp profits`,
    base: { state: () => 0 },
    effect: 'An extra state tax on corporate profits.',
  },
  corporateRate: {
    name: 'Federal corporate tax rate', icon: '🦅', kind: 'number', levels: ['federal'], step: 0.03, min: 0.15, max: 0.35, lean: 'labor', combine: 'federal',
    unit: (v) => `${Math.round(v * 100)}%`,
    base: { federal: 0.21 },
    effect: 'The federal tax on C-corporation profits.',
  },
  smallBizCredit: {
    name: 'Small-business tax credit', icon: '🧾', kind: 'flag', levels: ['state', 'federal'], lean: 'business', combine: 'any',
    base: { federal: false, state: () => false },
    effect: 'Businesses under $5M in revenue get a credit worth 10% of their tax.',
  },
  licensing: {
    name: 'Occupational licensing', icon: '🪪', kind: 'choice', levels: ['state'], choices: ['strict', 'standard', 'reformed'], lean: 'labor', combine: 'state',
    labels: { strict: 'Strict', standard: 'Standard', reformed: 'Reformed (fewer hoops)' },
    base: { state: () => 'standard' },
    effect: 'Reform cuts what staff certifications and licensed managers cost; strict raises it.',
  },
  antitrust: {
    name: 'Antitrust enforcement', icon: '⚖️', kind: 'choice', levels: ['federal'], choices: ['lax', 'standard', 'aggressive'], lean: 'labor', combine: 'federal',
    labels: { lax: 'Lax', standard: 'Standard', aggressive: 'Aggressive' },
    base: { federal: 'standard' },
    effect: 'How hard regulators look at dominant companies and big mergers — up to breaking them up.',
  },
  rentControl: {
    name: 'Rent stabilization', icon: '🏘️', kind: 'flag', levels: ['city', 'state'], lean: 'labor', combine: 'any',
    base: { state: () => false, city: () => false },
    effect: 'Caps rent increases: landlords\' rental income grows slower.',
  },
  infrastructure: {
    name: 'Infrastructure spending', icon: '🏗️', kind: 'choice', levels: ['city', 'state', 'federal'], choices: ['austerity', 'normal', 'boom'], lean: 'labor', combine: 'best',
    labels: { austerity: 'Austerity', normal: 'Normal', boom: 'Building boom' },
    base: { federal: 'normal', state: () => 'normal', city: () => 'normal' },
    effect: 'A building program lifts construction and trade businesses; austerity cuts public contracts.',
  },
  stateIncomeTax: {
    name: 'State income tax', icon: '🧾', kind: 'choice', levels: ['state'], choices: ['cut', 'standard', 'hike'], lean: 'labor', combine: 'state',
    labels: { cut: 'Cut 20%', standard: 'Current rates', hike: 'Raised 20%' },
    base: { state: () => 'standard' },
    effect: 'Scales the state income tax everyone in the state pays.',
  },
  cannabis: {
    name: 'Recreational cannabis', icon: '🌿', kind: 'flag', levels: ['state'], lean: 'labor', combine: 'state',
    base: { state: (st) => Boolean(STATES[st]?.cannabis) },
    effect: 'Legal to buy at a dispensary under state law (still federally illegal).',
  },
  nonCompeteBan: {
    name: 'Non-compete ban', icon: '📜', kind: 'flag', levels: ['state', 'federal'], lean: 'labor', combine: 'any',
    base: { federal: false, state: (st) => ['CA', 'MN', 'ND', 'OK'].includes(st) },
    effect: 'Courts won\'t enforce non-compete agreements: switch employers freely.',
  },
  publicBargaining: {
    name: 'Public-employee bargaining', icon: '🏛️', kind: 'flag', levels: ['state'], lean: 'labor', combine: 'state',
    base: { state: (st) => !['NC', 'TX', 'GA'].includes(st) },
    effect: 'Government workers can unionize and bargain contracts. Without it, few public workplaces have unions.',
  },
  workplaceSafety: {
    name: 'Workplace safety rules', icon: '🦺', kind: 'choice', levels: ['state', 'federal'], choices: ['lax', 'standard', 'strict'], lean: 'labor', combine: 'state',
    labels: { lax: 'Lax', standard: 'Standard (OSHA)', strict: 'Strict' },
    base: { federal: null, state: () => 'standard' },
    effect: 'Stricter rules raise businesses\' insurance and compliance costs; lax rules lower them.',
  },
  environmental: {
    name: 'Environmental regulation', icon: '🌳', kind: 'choice', levels: ['state', 'federal'], choices: ['lax', 'standard', 'strict'], lean: 'labor', combine: 'state',
    labels: { lax: 'Lax', standard: 'Standard', strict: 'Strict' },
    base: { federal: null, state: () => 'standard' },
    effect: 'Raises (or lowers) operating costs for construction, trucking, waste, manufacturing and fishing.',
  },
  zoning: {
    name: 'Zoning', icon: '🏙️', kind: 'choice', levels: ['city'], choices: ['restrictive', 'standard', 'upzoned'], lean: 'business', combine: 'city',
    labels: { restrictive: 'Restrictive', standard: 'Standard', upzoned: 'Upzoned (build more)' },
    base: { city: () => 'standard' },
    effect: 'Upzoning means more building work for builders and trades; restrictive zoning means less.',
  },
  publicPay: {
    name: 'Public-employee pay', icon: '🏛️', kind: 'number', levels: ['city', 'state', 'federal'], step: 0.02, min: -0.04, max: 0.12, lean: 'labor', combine: 'level',
    unit: (v) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}% pay adjustment`,
    base: { federal: 0, state: () => 0, city: () => 0 },
    effect: 'A raise (or cut) for government employees at that level.',
  },
};

const LEVEL_ORDER = ['city', 'state', 'federal'];

/**
 * Corporate income tax on a small private company, national plus typical local (2025):
 * Canada's small-business rate, the UK's small-profits band with marginal relief,
 * Australia's base-rate entities, France's reduced rate, the Philippines' CREATE rate.
 */
const CORPORATE_RATE = { CA: 0.122, GB: 0.22, DE: 0.3, JP: 0.25, KR: 0.2, IT: 0.28, MX: 0.3, PH: 0.2, IN: 0.25, AU: 0.25, FR: 0.22 };
/**
 * National law outside the US: provinces already carry the national minimum wage, every
 * other country has statutory paid leave, and corporate tax is the country's own.
 */
const NATIONAL_BASE = { minWage: () => null, paidLeave: () => true, corporateRate: (cc) => CORPORATE_RATE[cc] ?? 0.25 };
const countryOfProvince = (st) => STATES[st]?.country ?? 'US';

export function ensureLaws(state) {
  state.laws ??= { federal: {}, states: {}, cities: {}, enacted: [] };
  state.laws.federal ??= {};
  state.laws.states ??= {};
  state.laws.cities ??= {};
  state.laws.enacted ??= [];
  return state.laws;
}

const stateOfRegion = (regionId) => (REGIONS[regionId] ?? REGIONS.midcity).state;

/** The value of one law at one level in one place (the default when nothing was enacted). */
export function levelValue(state, lawId, level, where) {
  const law = LAWS[lawId];
  if (!law?.levels.includes(level)) return null;
  // National law: where is the country (absent: the US).
  const abroad = level === 'federal' && where && where !== 'US';
  const book = level === 'federal' ? (abroad ? state.laws?.nations?.[where] : state.laws?.federal) : level === 'state' ? state.laws?.states?.[where] : state.laws?.cities?.[where];
  if (book && lawId in book) return book[lawId];
  if (abroad && NATIONAL_BASE[lawId]) return NATIONAL_BASE[lawId](where);
  const base = law.base?.[level];
  return typeof base === 'function' ? base(where) : base ?? null;
}

/**
 * The law in force for someone in `stateId` (and city `regionId`).
 * Defaults to where the character lives.
 */
export function lawValue(state, lawId, stateId = null, regionId = null) {
  const law = LAWS[lawId];
  if (!law) return null;
  const region = regionId ?? (stateId ? null : state.character?.regionId);
  const st = stateId ?? stateOfRegion(region);
  const fed = levelValue(state, lawId, 'federal', countryOfProvince(st));
  const stv = levelValue(state, lawId, 'state', st);
  const city = region && stateOfRegion(region) === st ? levelValue(state, lawId, 'city', region) : null;
  const vals = [city, stv, fed].filter((v) => v !== null && v !== undefined);
  switch (law.combine) {
    case 'max': return vals.length ? Math.max(...vals) : null;
    case 'any': return vals.some(Boolean);
    case 'federal': return fed;
    case 'best': {
      const rank = { austerity: 0, normal: 1, boom: 2 };
      return vals.sort((a, b) => rank[b] - rank[a])[0] ?? 'normal';
    }
    case 'level': return { city, state: stv, federal: fed };
    case 'city': return city;
    default: return fed !== null && fed !== undefined ? fed : stv;
  }
}

/** Change a law. Returns the record. */
export function enact(state, { level, where = null, lawId, value, sponsor = null, age }) {
  const laws = ensureLaws(state);
  const book = level === 'federal' ? (where && where !== 'US' ? ((laws.nations ??= {})[where] ??= {}) : laws.federal) : level === 'state' ? (laws.states[where] ??= {}) : (laws.cities[where] ??= {});
  book[lawId] = value;
  const rec = { age, level, where, lawId, value, sponsor };
  laws.enacted = [...laws.enacted.slice(-39), rec];
  return rec;
}

export function describeValue(lawId, value) {
  const law = LAWS[lawId];
  if (value === null || value === undefined) return '—';
  if (law.kind === 'flag') return value ? 'Yes' : 'No';
  if (law.kind === 'choice') return law.labels[value] ?? value;
  return law.unit ? law.unit(value) : String(value);
}

/** The change a bill proposes: one step up or down (or a flip). Returns null when it can't move that way. */
export function proposedValue(lawId, current, direction) {
  const law = LAWS[lawId];
  if (law.kind === 'flag') return direction === 'up' ? (current ? null : true) : (current ? false : null);
  if (law.kind === 'choice') {
    const i = law.choices.indexOf(current ?? law.choices[1]);
    const j = direction === 'up' ? i + 1 : i - 1;
    return j >= 0 && j < law.choices.length ? law.choices[j] : null;
  }
  const cur = current ?? law.min;
  const next = Math.round((cur + (direction === 'up' ? law.step : -law.step)) * 1000) / 1000;
  return next < law.min - 1e-9 || next > law.max + 1e-9 ? null : next;
}

/** Does moving a law this way favor labor? (bloc votes, union and business lobbying) */
export function favorsLabor(lawId, direction) {
  const up = LAWS[lawId].lean === 'labor';
  return direction === 'up' ? up : !up;
}

/* ------------------------------------------------------------------ */
/* What the laws do to a business                                      */
/* ------------------------------------------------------------------ */

/** Effective minimum wage where a business operates, compared with the state's baseline. */
export function wageFloorFactor(state, regionId, typeWage) {
  const st = stateOfRegion(regionId);
  const now = lawValue(state, 'minWage', st, regionId) ?? 7.25;
  const was = Math.max(7.25, STATES[st]?.minWage ?? 7.25);
  if (now <= was) return 1;
  // Only low-wage work feels it: a $30k job is near the floor, a $70k one isn't.
  const exposure = Math.max(0, Math.min(1, (45000 - typeWage) / 20000));
  return 1 + ((now - was) / was) * 0.45 * exposure;
}

/** Payroll and tax effects of the laws for a business in `regionId`. */
export function businessLawEffects(state, regionId, { wage = 40000, revenue = 0, construction = false, heavy = false } = {}) {
  const st = stateOfRegion(regionId);
  const leave = lawValue(state, 'paidLeave', st, regionId) ? 1.015 : 1;
  const infra = lawValue(state, 'infrastructure', st, regionId);
  const safety = { lax: 0.92, standard: 1, strict: 1.08 }[lawValue(state, 'workplaceSafety', st)] ?? 1;
  const green = heavy ? ({ lax: 0.97, standard: 1, strict: 1.04 }[lawValue(state, 'environmental', st)] ?? 1) : 1;
  const zoning = construction ? ({ restrictive: 0.93, standard: 1, upzoned: 1.08 }[lawValue(state, 'zoning', st, regionId)] ?? 1) : 1;
  return {
    insurance: safety,
    cogs: green,
    payroll: wageFloorFactor(state, regionId, wage) * leave,
    corporateRate: (lawValue(state, 'corporateRate', st) ?? 0.21) + (lawValue(state, 'businessTax', st) ?? 0),
    taxCredit: revenue < 5_000_000 && lawValue(state, 'smallBizCredit', st) ? 0.1 : 0,
    demand: (construction ? ({ austerity: 0.92, normal: 1, boom: 1.1 }[infra] ?? 1) : 1) * zoning,
    licensing: { strict: 1.25, standard: 1, reformed: 0.7 }[lawValue(state, 'licensing', st)] ?? 1,
  };
}

export { LEVEL_ORDER };
