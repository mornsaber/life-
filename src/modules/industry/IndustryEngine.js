/**
 * The world's industries, year by year: what each country makes, how well, and for whom.
 *
 * Nothing is scheduled. Each year, in every country the model follows:
 *   adoption   a country takes up a known technology at a pace its schools, its wealth, its
 *              neighbours and its government set (a colony's masters build its mines and
 *              plantations, not its mills)
 *   cost       productivity against wages: labour-heavy work moves to where labour is cheap
 *   demand     grows with income, shrinks when something replaces it (whale oil after
 *              kerosene, the railway after the car), lifted by war orders
 *   trade      a country keeps its home market by being good at it or by tariffs; the best
 *              makers win the export trade, more of it as railways, steamships, containers and
 *              the internet make trade cheaper
 *   jobs       output divided by productivity: machines (containers, robots) take jobs even
 *              where output holds
 *   health     how fast output (and jobs) grow or shrink: the number every other system reads
 *   the cycle  credit builds in good years until it breaks; a crash in a big economy spreads
 *              along trade; oil exporters can band together; laws (deposit insurance, a lender
 *              of last resort, leaving gold) soften the fall (EconomyEngine reads the crisis)
 *   policy     governments respond to all this with laws (IndustryPolicy.js)
 *
 * Two simulations. The world (the big economies) runs from 1800 once per session for each of a
 * few variants, in memory: it is everyone's trade rival and market. Your own country runs inside
 * the life (state.industry), from 1800 to the start year when the life begins and then a year at
 * a time, against that world: its laws are your country's law book, so a bill you pass moves it.
 *
 * state.industry = { mode, variant, year, cc, c: {cc: country}, news: [] }
 */
import { Random, clamp } from '../../core/Random.js';
import { INDUSTRIES, TECHS, SIM, endowment, offshoreOnly, INDUSTRY_OF_PROFESSION } from './IndustryData.js';
import { TECH, COLONIES, yearNow, PRESENT } from '../world/Eras.js';
import { demographyAt } from '../world/HistoricalData.js';
import { plannedEconomy } from '../world/OwnershipHistory.js';

export { INDUSTRIES, INDUSTRY_OF_PROFESSION };
export const INDUSTRY_IDS = Object.keys(INDUSTRIES);
const IDS = INDUSTRY_IDS;
const N = IDS.length;
export const IX = Object.fromEntries(IDS.map((id, i) => [id, i]));
const START = 1800;
const US_NOW = 52591;
const VARIANTS = 2;
const r3 = (x) => Math.round(x * 1000) / 1000 + 0;
const p4 = (x) => (x === 0 ? 0 : Math.round(x * 1e4) / 1e4 + 0);
const zeros = () => new Array(N).fill(0);

/** Whether the world model runs this life ('emergent', the default) or history's dates do ('historical'). */
export const emergent = (state) => (state?.industry?.mode ?? 'emergent') === 'emergent';

/* ---- The countries ---- */
const MACRO = new Map();
function macro(cc, y) {
  const key = `${cc}${y}`;
  if (MACRO.has(key)) return MACRO.get(key);
  const d = demographyAt(cc, y);
  const m = d?.gdp && d?.pop ? { income: d.gdp / US_NOW, pop: d.pop / 1000 } : null;
  if (MACRO.size > 20000) MACRO.clear();
  MACRO.set(key, m);
  return m;
}
/** A territory's foreign master in year y (a stage ending on an event counts as still running). */
export function rulerAt(cc, y) {
  for (const st of COLONIES[cc] ?? []) {
    if (st.from && y < st.from) return null;
    if (typeof st.until === 'number' && y >= st.until) continue;
    return st.ruler ?? st.rulers?.[0] ?? null;
  }
  return null;
}
const planned = (cc, y) => Boolean(plannedEconomy(cc, y));
const ENDOW = new Map();
function endowOf(cc) {
  if (!ENDOW.has(cc)) ENDOW.set(cc, Float64Array.from(IDS.map((id) => endowment(cc, INDUSTRIES[id].resource))));
  return ENDOW.get(cc);
}

/* ---- Knowledge ---- */
const anchoredAt = (t, y) => !(TECH[t.anchor] > y);
const hasT = (known, y, id) => { const t = TECHS[id]; return !t || t.known || (t.anchor ? anchoredAt(t, y) : known[id] != null && known[id] <= y); };
const yearsKnown = (known, y, id) => { const t = TECHS[id]; if (!t) return 0; if (t.known) return 99; const k = t.anchor ? TECH[t.anchor] : known[id]; return k == null || k > y ? 0 : y - k; };

/* ---- Laws: read through the policy module ---- */
let lawOf = () => null;
/** (sim, cc, law) → value. The policy module sets it: your country reads the law book, the world its own. */
export const setLawReader = (f) => { lawOf = f; };
let policyStep = () => [];
export const setPolicyStep = (f) => { policyStep = f; };
const TARIFF = { free: 0, revenue: 0.2, protective: 0.5 };

function newCountry() { return { a: zeros(), dep: zeros(), out: zeros(), jobs: zeros(), health: zeros(), jobsHealth: zeros(), share: zeros(), lev: 0.15, growth: 0, last: 0, crisis: null, gov: 'business', govYears: 0 }; }

/** Adoption, cost and demand for one country this year: K (competitiveness) and D (demand). */
function produce(sim, cc, y, ctxY) {
  const c = sim.c[cc];
  const m = macro(cc, y);
  if (!m) return null;
  const { HT, YK, TECH_OK, world, oil, wars } = ctxY;
  const skill = clamp(m.income ** 0.45, 0.05, 1);
  const ruler = rulerAt(cc, y);
  const plan = planned(cc, y);
  const subsidised = lawOf(sim, cc, 'subsidies') ?? {};
  const E = endowOf(cc);
  const K = new Float64Array(N); const D = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const id = IDS[i];
    const I = INDUSTRIES[id];
    const techOk = TECH_OK[i] && (id !== 'oilGas' || !offshoreOnly(cc) || HT.offshore);
    // What is left in the ground: the more a seam or a field is worked, the deeper and dearer it gets.
    c.dep ??= zeros();
    const res = I.reserve && E[i] > 0 ? E[i] * clamp(1 - c.dep[i] / (I.reserve * E[i]), 0.12, 1) : E[i];
    let a = c.a[i];
    if (!techOk || res <= 0) a = 0;
    else {
      // The pace a country takes it up: schools, money, its masters, its government.
      let rate = 0.01 + 0.1 * skill + (a < 0.02 ? 0.02 : 0);
      if (ruler) rate *= I.kind === 'make' ? 0.25 : I.kind === 'extract' ? 1.6 : 0.8;
      if (plan && (I.kind === 'make' || id === 'coal')) rate *= 1.6;
      if (subsidised[id]) rate *= 1.5;
      a = Math.min(1, a + rate * (1 - a) + (a === 0 ? 0.01 : 0));
    }
    c.a[i] = r3(a);
    const boost = I.boost && HT[I.boost] ? 1.5 : 1;
    const p = a * (0.35 + 0.65 * skill ** (0.4 + I.skill)) * (I.resource ? 0.3 + 0.7 * Math.min(1, res) : 1) * boost * (plan ? 0.75 : 1) * (subsidised[id] ? 1.15 : 1);
    // Wages: cheap labour wins labour-heavy work, but below a point roads, ports and power are missing.
    K[i] = p / Math.max(0.07, m.income) ** I.labor;
    let d = m.pop * Math.max(0.02, m.income) ** I.elastic * I.base;
    for (const [rep, share] of I.replacedBy ?? []) {
      if (INDUSTRIES[rep]) { const f = world[IX[rep]] / Math.max(1e-6, world[IX[rep]] + world[i]); d *= 1 - share * clamp(f * 1.5, 0, 1); }
      else d *= 1 - share * clamp(YK[rep] / 30, 0, 1);
    }
    if (wars && I.war) d *= 1 + I.war * 0.4;
    if (id === 'oilGas') d *= 1 / Math.max(0.6, oil.price ** 0.3);
    // A crisis: people put off what they can (cars, holidays) more than bread; worst in its first year.
    if (c.crisis) d *= 1 - (c.crisis.year === y ? 0.07 : 0.04) * Math.min(1.3, I.elastic) * (c.crisis.depth ?? 0.5);
    if (!techOk && I.tech.length) d = 0;
    D[i] = d;
  }
  return { K, D, m, tariff: TARIFF[lawOf(sim, cc, 'tariff')] ?? 0.2 };
}

/** Output, jobs and health from what was sold. */
function settle(c, i, out, income, YK) {
  const I = INDUSTRIES[IDS[i]];
  let mech = 1;
  for (const [t, share] of I.automates ?? []) mech *= 1 + share * clamp(YK[t] / 25, 0, 1) * clamp(income * 2, 0.2, 1) * 2;
  const jobs = out / mech;
  const prev = c.out[i];
  const prevJobs = c.jobs[i];
  const g = prev > 1e-4 ? out / prev - 1 : out > 1e-4 ? 0.3 : 0;
  const gj = prevJobs > 1e-4 ? jobs / prevJobs - 1 : jobs > 1e-4 ? 0.3 : 0;
  c.health[i] = r3(clamp(0.5 * c.health[i] + 0.5 * clamp(g * 6, -1, 1), -1, 1));
  c.jobsHealth[i] = r3(clamp(0.5 * c.jobsHealth[i] + 0.5 * clamp(gj * 6, -1, 1), -1, 1));
  c.out[i] = p4(out);
  c.jobs[i] = p4(jobs);
  if (I.reserve) c.dep[i] = r3((c.dep?.[i] ?? 0) + out);
}

/** The cycle: growth, credit, the crash and its causes. */
function cycle(sim, cc, y, rng, { open, crashedBig, oil }) {
  const c = sim.c[cc];
  const now = c.out.reduce((s, v) => s + v, 0);
  c.growth = r3(c.last ? now / c.last - 1 : 0);
  c.last = p4(now);
  if (c.crisis) {
    c.crisis.left -= 1;
    if (c.crisis.left <= 0) { const cause = c.crisis.cause; c.crisis = null; return { kind: 'recovery', cc, y, cause }; }
    return null;
  }
  const reg = lawOf(sim, cc, 'bankRegulation');
  const loose = reg === 'light' ? 1.5 : reg === 'strict' ? 0.5 : 1;
  c.lev = r3(clamp(c.lev + (c.growth > 0 ? 0.04 * loose : -0.01), 0.05, 1));
  let p = 0.02 + Math.max(0, c.lev - 0.2) * 0.8;
  // A crash in one of the great economies spreads along the trade routes (faster on gold).
  const contagion = crashedBig.some((b) => b !== cc) ? 0.3 * open * (lawOf(sim, cc, 'goldStandard') ? 1.4 : 0.8) : 0;
  p += contagion;
  if (c.growth < -0.04) p += 0.25;
  const importer = !(endowment(cc, 'oil') > 0.5);
  if (oil.shock && importer) p += 0.3;
  if (!(rng.next() < p)) return null;
  const cause = oil.shock && importer ? 'oil' : c.growth < -0.04 ? 'industry' : contagion > 0 && rng.next() < 0.6 ? 'trade' : 'financial';
  // Laws soften the fall: deposit insurance stops the runs, a lender of last resort the panics.
  let left = cause === 'financial' ? 2 : 1;
  if (cause === 'financial' && !lawOf(sim, cc, 'depositInsurance')) left += 1;
  if (cause === 'financial' && !lawOf(sim, cc, 'lenderOfLastResort')) left += 1;
  if (lawOf(sim, cc, 'goldStandard') && cause !== 'industry') left += 1;
  c.crisis = { cause, year: y, left, depth: r3(Math.min(1, c.lev + 0.2)) };
  c.lev = 0.1;
  return { kind: 'crisis', cc, y, cause };
}

/* ---- The world: the big economies, run once per session for each variant ---- */
const WORLDS = new Map();
/** The world of a variant, run to year y. Kept in memory; every life in the variant shares it. */
export function worldAt(variant, y) {
  let w = WORLDS.get(variant);
  if (!w) {
    w = { variant, year: START - 1, research: 0, warResearch: 0, known: {}, c: {}, laws: {}, oil: { price: 1, cartel: 0 }, frontier: {}, rng: new Random((0x9e3779b9 * (variant + 1)) >>> 0), world: true };
    for (const cc of SIM) if (macro(cc, 2000)) w.c[cc] = newCountry();
    WORLDS.set(variant, w);
  }
  while (w.year < y) worldYear(w, w.year + 1);
  return w;
}
const WAR_YEARS = (y) => (y >= 1914 && y <= 1918) || (y >= 1939 && y <= 1945);
function knowledge(known, y) {
  const HT = {}; const YK = {};
  for (const t of Object.keys(TECHS)) { HT[t] = hasT(known, y, t); YK[t] = yearsKnown(known, y, t); }
  return { HT, YK, TECH_OK: IDS.map((id) => INDUSTRIES[id].tech.every((t) => HT[t])) };
}
function worldYear(w, y) {
  const rng = w.rng;
  const wars = WAR_YEARS(y);
  const ccs = Object.keys(w.c);
  // Research: the world's output, faster in a world war for what war wants.
  let pts = 0;
  for (const cc of ccs) { const m = macro(cc, y); if (m) pts += m.income * m.pop * (1 + 0.6 * (lawOf(w, cc, 'science') ? 1 : 0)); }
  pts /= 100;
  w.research = r3(w.research + pts);
  w.warResearch = r3(w.warResearch + (wars ? pts : 0));
  const events = [];
  for (const [id, t] of Object.entries(TECHS)) {
    if (t.known || t.anchor || w.known[id] != null) continue;
    if (!(t.needs ?? []).every((n) => hasT(w.known, y, n))) continue;
    if (w.research + (t.war ? (t.war - 1) * w.warResearch : 0) >= t.cost) { w.known[id] = y; events.push({ kind: 'tech', id, y }); }
  }
  const { HT, YK, TECH_OK } = knowledge(w.known, y);
  // How far goods travel: dear before the railway and the steamship, cheap after the container.
  // Trade takes years to reorganise round a new way of moving goods: it opens gradually.
  const openTarget = 0.2 + (HT.railway ? 0.2 : 0) + (HT.steel ? 0.2 : 0) + (HT.container ? 0.2 : 0) + (HT.internet ? 0.1 : 0);
  w.open = r3(w.open == null ? openTarget : w.open + (openTarget - w.open) * 0.12);
  const open = w.open;
  const world = new Float64Array(N);
  for (const cc of ccs) for (let i = 0; i < N; i++) world[i] += w.c[cc].out[i];
  const oil = w.oil;
  const ctxY = { HT, YK, TECH_OK, world, oil, wars };
  const P = {};
  for (const cc of ccs) { const pr = produce(w, cc, y, ctxY); if (pr) P[cc] = pr; }
  const live = Object.keys(P);
  const fr = { open, wars, top1: new Float64Array(N), top1cc: [], top2: new Float64Array(N), weight: new Float64Array(N), pool: new Float64Array(N), world: Float64Array.from(world), crashedBig: [] };
  for (let i = 0; i < N; i++) {
    const I = INDUSTRIES[IDS[i]];
    let t1 = 0; let t1cc = null; let t2 = 0; let wt = 0;
    for (const cc of live) { const k = P[cc].K[i]; if (k <= 0) continue; wt += k ** 3; if (k > t1) { t2 = t1; t1 = k; t1cc = cc; } else if (k > t2) t2 = k; }
    fr.top1[i] = t1; fr.top1cc[i] = t1cc; fr.top2[i] = t2; fr.weight[i] = wt || 1;
    let pool = 0;
    const home = {};
    for (const cc of live) {
      const k = P[cc].K[i];
      if (!I.tradable) { home[cc] = k > 0 ? 1 : 0; continue; }
      const rival = (t1cc === cc ? t2 : t1) * open * (1 - P[cc].tariff);
      home[cc] = k > 0 ? k ** 2 / (k ** 2 + rival ** 2 + 1e-9) : 0;
      pool += P[cc].D[i] * (1 - home[cc]);
    }
    fr.pool[i] = pool;
    for (const cc of live) {
      const k = P[cc].K[i];
      const exp = I.tradable && k > 0 ? (pool * k ** 3) / fr.weight[i] : 0;
      const out = P[cc].D[i] * home[cc] + exp;
      settle(w.c[cc], i, out, P[cc].m.income, YK);
      w.c[cc].share[i] = r3(I.tradable && world[i] > 0 ? out / world[i] : 0);
    }
  }
  // The cycle in each country; the great economies' crashes go into the frontier for everyone.
  const total = (cc) => w.c[cc].out.reduce((s, v) => s + v, 0);
  // The great economies: the most output by value (output times how rich the country is), whose banks the world's money passes through.
  const weightOf = (cc) => total(cc) * Math.max(0.02, P[cc].m.income);
  const big = live.slice().sort((p, q) => weightOf(q) - weightOf(p)).slice(0, 3);
  const crashedLast = w.frontier[y - 1]?.crashedNow ?? [];
  fr.crashedBig = crashedLast;
  const crashedNow = [];
  for (const cc of live) {
    const ev = cycle(w, cc, y, rng, { open, crashedBig: crashedLast, oil });
    if (ev) { events.push(ev); if (ev.kind === 'crisis' && big.includes(cc)) crashedNow.push(cc); }
  }
  fr.crashedNow = crashedNow;
  // Oil: when the petro-states hold most of the trade and prices are low, they can band together.
  const OIL = IX.oilGas;
  const oilOut = live.reduce((s, cc) => s + w.c[cc].out[OIL], 0);
  const worldOut = live.reduce((s, cc) => s + total(cc), 0);
  const exporters = live.filter((cc) => w.c[cc].out[OIL] > total(cc) * 0.08 && w.c[cc].share[OIL] > 0.03);
  const held = oilOut > worldOut * 0.02 ? exporters.reduce((s, cc) => s + w.c[cc].out[OIL], 0) / Math.max(1e-6, oilOut) : 0;
  oil.shock = false;
  if (oil.cartel > 0) { oil.cartel -= 1; oil.price = r3(oil.price * 0.93 + 0.07); if (oil.cartel === 0) events.push({ kind: 'oilEnd', y }); }
  else if (held > 0.3 && exporters.length >= 2 && oil.price < 1.1 && (oil.lastCartel ?? 0) < y - 15 && rng.next() < 0.12) {
    oil.cartel = 6; oil.price = r3(oil.price * 3); oil.lastCartel = y; oil.shock = true;
    events.push({ kind: 'cartel', y, exporters });
  } else oil.price = r3(clamp(oil.price + (1 - oil.price) * 0.2, 0.6, 5));
  fr.oil = { ...oil };
  for (const ev of policyStep(w, y, rng, null)) events.push(ev);
  fr.events = events;
  fr.known = { ...w.known };
  w.frontier[y] = fr;
  w.year = y;
}

/* ---- Your country: inside the life ---- */
const here = (state) => state.character?.countryId ?? 'US';
/** One year of your country against the world. Returns what happened (for the news). */
export function localYear(state, y, rng) {
  const ind = state.industry;
  const w = worldAt(ind.variant, y);
  const fr = w.frontier[y];
  const events = fr.events.filter((e) => e.kind === 'tech' || e.kind === 'cartel' || e.kind === 'oilEnd' || (e.kind === 'crisis' && fr.crashedNow.includes(e.cc)));
  const { HT, YK, TECH_OK } = knowledge(fr.known, y);
  for (const cc of Object.keys(ind.c)) {
    const c = ind.c[cc];
    const pr = produce(ind, cc, y, { HT, YK, TECH_OK, world: fr.world, oil: fr.oil, wars: fr.wars });
    if (!pr) continue;
    for (let i = 0; i < N; i++) {
      const I = INDUSTRIES[IDS[i]];
      const k = pr.K[i];
      let out;
      if (!I.tradable) out = k > 0 ? pr.D[i] : 0;
      else {
        const rival = (fr.top1cc[i] === cc ? fr.top2[i] : fr.top1[i]) * fr.open * (1 - pr.tariff);
        const home = k > 0 ? k ** 2 / (k ** 2 + rival ** 2 + 1e-9) : 0;
        const exp = k > 0 ? (fr.pool[i] * k ** 3) / (fr.weight[i] + (fr.top1cc[i] === cc ? 0 : k ** 3)) : 0;
        out = pr.D[i] * home + exp;
        c.share[i] = r3(fr.world[i] > 0 ? Math.min(1, out / (fr.world[i] + out)) : 0);
      }
      settle(c, i, out, pr.m.income, YK);
    }
    const ev = cycle(ind, cc, y, rng, { open: fr.open, crashedBig: fr.crashedBig, oil: fr.oil });
    if (ev) events.push(ev);
  }
  for (const ev of policyStep(ind, y, rng, state)) events.push(ev);
  ind.year = y;
  return events;
}

/** Bring your country up to the year before this one (from 1800 at the start of a life). */
export function catchUp(state, until = yearNow(state) - 1) {
  const ind = ensureIndustry(state);
  const rng = new Random((((state.world?.seed ?? 7) * 2654435761) ^ (ind.year * 131) ^ 0x1d57) >>> 0);
  const events = [];
  for (let y = ind.year + 1; y <= until; y++) for (const e of localYear(state, y, rng)) events.push(e);
  return events;
}

export function ensureIndustry(state) {
  const cc = here(state);
  if (state.industry?.c?.[cc]) return state.industry;
  const prev = state.industry;
  const seed = state.world?.seed ?? state.character?.birthYear ?? 1;
  state.industry = { mode: prev?.mode ?? 'emergent', variant: prev?.variant ?? Math.abs(seed) % VARIANTS, year: START - 1, cc, c: { [cc]: newCountry() }, news: prev?.news ?? [] };
  return state.industry;
}

/* ---- What the rest of the game reads ---- */
/** A country's record: yours from the life, the others from the world. */
function countryOf(state, cc) {
  const ind = state?.industry;
  if (!ind) return null;
  if (ind.c[cc]) return ind.c[cc];
  const w = WORLDS.get(ind.variant);
  return w?.c[cc] ?? null;
}
/** How an industry is doing here (−1 collapsing … +1 booming); 0 where the model has no view. */
export const industryHealth = (state, id, cc = here(state)) => countryOf(state, cc)?.health?.[IX[id]] ?? 0;
/** How its jobs are doing (machines and imports can take jobs while output holds). */
export const jobsHealth = (state, id, cc = here(state)) => countryOf(state, cc)?.jobsHealth?.[IX[id]] ?? 0;
/** How big an industry is here: its share of the country's output (0–1). */
export function industryShare(state, id, cc = here(state)) {
  const c = countryOf(state, cc);
  if (!c?.out) return 0;
  const total = c.out.reduce((s, v) => s + v, 0);
  return total > 0 ? c.out[IX[id]] / total : 0;
}
/** Its share of the world's trade in it (0–1). */
export const worldShare = (state, id, cc = here(state)) => countryOf(state, cc)?.share?.[IX[id]] ?? 0;
/** Whether the industry exists here at all. */
export const industryHere = (state, id, cc = here(state)) => (countryOf(state, cc)?.a?.[IX[id]] ?? 0) > 0.02 && (countryOf(state, cc)?.out?.[IX[id]] ?? 0) > 1e-4;
/** The industry a profession works in, or null. */
export const industryOfProfession = (professionId) => INDUSTRY_OF_PROFESSION[professionId] ?? null;
/** The jobs health of the industry a profession works in (0 where it belongs to none). */
export const professionOutlook = (state, professionId, cc = here(state)) => { const id = industryOfProfession(professionId); return id ? jobsHealth(state, id, cc) : 0; };
/** The country's crisis this year, if any: { cause, year, left, depth }. */
export const crisisHere = (state, cc = here(state)) => countryOf(state, cc)?.crisis ?? null;
/** The country's growth last year. */
export const growthHere = (state, cc = here(state)) => countryOf(state, cc)?.growth ?? 0;
/** The industries here, biggest first: [id, share, health, jobsHealth]. */
export function industriesHere(state, cc = here(state), n = 99) {
  const c = countryOf(state, cc);
  if (!c?.out) return [];
  return IDS.filter((id) => industryHere(state, id, cc)).map((id) => [id, industryShare(state, id, cc), c.health[IX[id]], c.jobsHealth[IX[id]]]).sort((p, q) => q[1] - p[1]).slice(0, n);
}
/** An industry's name in its day: software before the internet, the telegraph before the telephone. */
const NAME_THEN = { software: [['internet', 'Software and the internet'], [null, 'Software']], telecom: [['telephone', 'Telegraph and telephones'], [null, 'The telegraph']], media: [['radio', 'Press, film and broadcasting'], [null, 'The press']], electronics: [['radio', 'Electrical goods and electronics'], [null, 'Electrical goods']] };
export function industryName(state, id) {
  const rows = NAME_THEN[id];
  if (!rows) return INDUSTRIES[id].name;
  return rows.find(([t]) => !t || techKnown(state, t))[1];
}
/** The town's trade: the industry a region lives by (steady for a region, from what the country has). */
export function townIndustry(state, regionId, cc = here(state)) {
  const list = industriesHere(state, cc, 14).filter(([id]) => !['retail', 'construction', 'banking'].includes(id));
  if (!list.length) return 'farming';
  let h = 7;
  for (const ch of String(regionId ?? cc)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const total = list.reduce((s, [, sh]) => s + sh, 0);
  let x = ((h % 1000) / 1000) * total;
  for (const [id, sh] of list) { x -= sh; if (x <= 0) return id; }
  return list[0][0];
}
/** Has the world learned this? */
export function techKnown(state, id) {
  const t = TECHS[id];
  if (!t) return false;
  const y = state?.industry?.year ?? yearNow(state);
  if (t.known || t.anchor) return hasT({}, y, id);
  const w = WORLDS.get(state?.industry?.variant ?? 0);
  return Boolean(w && w.known[id] != null && w.known[id] <= y);
}
/** Stock sectors and the industries they hold. */
const STOCK_INDUSTRIES = { tech: ['software', 'electronics', 'telecom'], finance: ['banking'], energy: ['oilGas', 'coal', 'power'], health: ['pharma'], consumer: ['retail', 'textiles', 'tourism', 'farming'] };
/** A sector's return tilt this year from how its industries are doing at home. */
export function sectorTilt(state, sector) {
  if (!state?.industry?.c?.[here(state)] || !emergent(state)) return 0;
  const ids = STOCK_INDUSTRIES[sector] ?? [];
  if (!ids.length) return 0;
  return clamp(ids.reduce((s, id) => s + industryHealth(state, id), 0) / ids.length * 0.15, -0.15, 0.15);
}

/** The oil price against normal (1), this year. */
export const oilPrice = (state) => WORLDS.get(state?.industry?.variant ?? 0)?.frontier?.[state?.industry?.year]?.oil?.price ?? 1;
/**
 * The world's named crashes, as the model produced them (same for every life in a variant): a
 * world crash is two of the great economies going down within three years. The first before
 * 1900 is a long depression, the first after it the great depression, the first a generation
 * after that the great financial crash; the first oil cartel is the oil shock, and the first
 * American crash once the internet exists is the tech bust. { id: year }.
 */
const NAMED = new Map();
export function namedCrashes(state) {
  const variant = ensureIndustry(state).variant;
  if (NAMED.has(variant)) return NAMED.get(variant);
  const w = worldAt(variant, PRESENT + 5);
  const out = {};
  const crashes = [];
  for (let y = START; y <= w.year; y++) {
    const f = w.frontier[y];
    if (!f) continue;
    if (f.events.some((e) => e.kind === 'cartel') && y >= TECH.automobile && out.oilShock == null) out.oilShock = y;
    if (y >= TECH.internet + 2 && out.dotcom == null && f.events.some((e) => e.kind === 'crisis' && e.cc === 'US')) out.dotcom = y;
    if (!f.crashedNow.length || crashes.some((c) => y - c.y <= 3)) continue;
    const hit = new Set();
    for (let k = y; k <= Math.min(w.year, y + 3); k++) for (const cc of w.frontier[k]?.crashedNow ?? []) hit.add(cc);
    if (hit.size >= 2) crashes.push({ y, n: hit.size });
  }
  // The great one: three or more great economies down together; failing that, the first world crash after the Great War.
  const first = (test) => crashes.find(test)?.y ?? null;
  out.longDepression = first((c) => c.y >= TECH.railway + 20 && c.y < 1900);
  out.depression = first((c) => c.y >= 1900 && c.n >= 3) ?? first((c) => c.y >= 1919);
  out.gfc = out.depression != null ? first((c) => c.y >= out.depression + 50) : null;
  if (out.dotcom != null && out.gfc != null && out.dotcom >= out.gfc) out.dotcom = null;
  NAMED.set(variant, out);
  return out;
}
/** Crashes in a country of the world between two years (the model's, for history's conditions). */
export function crashedBetween(state, cc, from, to) {
  const w = worldAt(ensureIndustry(state).variant, to);
  for (let y = from; y <= to; y++) if (w.frontier[y]?.events.some((e) => e.kind === 'crisis' && e.cc === cc)) return true;
  return false;
}
/** The world for reading (other countries' industries, the year's events). */
export const worldOf = (state) => (state?.industry ? worldAt(state.industry.variant, state.industry.year) : null);
export { PRESENT };
