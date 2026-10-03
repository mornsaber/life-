/**
 * Global game state: shape, persistence (LocalStorage) and shared selectors.
 *
 * The state tree is plain JSON — no functions, no class instances — so it can
 * be saved after every mutation and restored verbatim. Each domain module owns
 * one top-level slice (career, military, credentials, legal, ...) and may
 * *read* other slices through the selectors exported here, but only mutates
 * its own. Cross-domain effects travel over the engine's event bus.
 */
import { migrate } from './Migrations.js';
import { clamp, Random } from './Random.js';

export const STATE_VERSION = 4;
export const SAVE_KEY = 'lifesim.save.v4';
export const START_YEAR = 2026;

export const STAT_KEYS = ['health', 'happiness', 'smarts', 'looks', 'fitness', 'stress'];

export const STAT_META = {
  health: { label: 'Health', icon: '❤️' },
  happiness: { label: 'Happiness', icon: '😊' },
  smarts: { label: 'Smarts', icon: '🧠' },
  looks: { label: 'Looks', icon: '✨' },
  fitness: { label: 'Fitness', icon: '💪' },
  stress: { label: 'Stress', icon: '😰', inverse: true },
};

const FIRST_NAMES = {
  male: ['James', 'Marcus', 'Diego', 'Ethan', 'Malik', 'Noah', 'Hiro', 'Liam', 'Mateo', 'Owen', 'Caleb', 'Andre', 'Ravi', 'Wyatt'],
  female: ['Ava', 'Maya', 'Sofia', 'Zoe', 'Priya', 'Harper', 'Elena', 'Nia', 'Chloe', 'Grace', 'Aaliyah', 'Mei', 'Riley', 'Camila'],
};
const LAST_NAMES = ['Carter', 'Nguyen', 'Okafor', 'Ramirez', 'Kowalski', 'Bennett', 'Hayes', 'Patel', 'Morales', 'Sullivan', 'Kim', 'Reyes', 'Brooks', 'Lindqvist', 'Washington', 'Adeyemi'];
const HOMETOWNS = ['smalltown', 'midcity', 'sunbelt', 'chicago', 'denver', 'miami'];

export function randomName(rng, gender) {
  return { firstName: rng.pick(FIRST_NAMES[gender] ?? FIRST_NAMES.male), lastName: rng.pick(LAST_NAMES) };
}

export function createInitialState(rng, options = {}) {
  const gender = options.gender === 'female' || options.gender === 'male' ? options.gender : rng.pick(['male', 'female']);
  const generated = randomName(rng, gender);
  const firstName = (options.firstName || '').trim() || generated.firstName;
  const lastName = (options.lastName || '').trim() || generated.lastName;

  return {
    version: STATE_VERSION,
    lifeId: rng.id('life_'),
    character: {
      firstName,
      lastName,
      gender,
      age: 0,
      birthYear: START_YEAR,
      alive: true,
      causeOfDeath: null,
      regionId: rng.pick(HOMETOWNS),
      residencySince: 0,
    },
    stats: {
      health: rng.int(75, 100),
      happiness: rng.int(65, 100),
      smarts: rng.int(25, 95),
      looks: rng.int(25, 95),
      fitness: rng.int(40, 75),
      stress: rng.int(5, 15),
    },
    finances: {
      cash: 0,
      loans: 0,
      lifetimeEarnings: 0,
      taxesPaid: 0,
      bankruptcies: 0,
      ledger: { income: [], expenses: [], deductions: [] },
      lastYear: null,
    },
    education: { degrees: [], enrolled: null },
    credentials: { held: {}, training: [], logbook: { flightHours: 0 } },
    career: { job: null, history: [] },
    publicService: { exams: {}, clearance: null, federal: { stability: 60, shutdown: false } },
    military: { service: null, history: [] },
    emergency: { fire: null, police: null, sar: null, history: [] },
    legal: { record: [], investigations: [], incarceration: null, probationYears: 0, flags: {} },
    retirement: { retired: false, dc: 0, dcFund: 'balanced', pensions: [], plans: {}, ssEarnings: [], socialSecurity: null },
    housing: {
      withParents: true,
      everOwned: false,
      rental: null,
      properties: [],
      listings: [],
      credit: { score: 680, onTime: 0, events: [] },
      market: {},
      rates: { base: 0.065 },
      homelessYears: 0,
      manager: false,
    },
    politics: { office: null, campaign: null, history: [], recognition: 0 },
    honors: [],
    yearly: {},
    prompts: [],
    log: [{ age: 0, year: START_YEAR, entries: [{ text: `${firstName} ${lastName} was born. Welcome to the world!`, icon: '👶', kind: 'milestone' }] }],
    flags: { promptSeq: 0 },
  };
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

function defaultStorage() {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    /* storage blocked (private mode, sandboxed iframe) */
  }
  const memory = new Map();
  return {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: (key) => memory.delete(key),
  };
}

export const SAVE_INDEX_KEY = 'lifesim.saves';
const SLOT_PREFIX = 'lifesim.slot.';
const LEGACY_KEYS = ['lifesim.save.v4', 'lifesim.save.v3', 'lifesim.save.v2', 'lifesim.save.v1'];
export const EXPORT_FORMAT = 'lifesim-life';

/** A fresh state used as the shape template for migrations. */
const migrationTemplate = () => createInitialState(new Random(1));

/**
 * Persistence with multiple save slots. Each slot holds one life under
 * `lifesim.slot.<id>`; `lifesim.saves` indexes them ({ active, slots }).
 * Saves from any earlier STATE_VERSION are migrated on load (Migrations.js),
 * and pre-slot saves are adopted into a slot the first time the game runs.
 *
 * Passing an explicit `key` keeps the old single-key behavior (tests, tools).
 */
export class Store {
  constructor(storage = defaultStorage(), key = null) {
    this.storage = storage;
    this.fixedKey = key;
    this.state = null;
    this.migratedFrom = null;
  }

  /* ---- raw storage ---- */
  read(key) {
    try {
      const raw = this.storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  write(key, value) {
    try {
      this.storage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false; /* quota exceeded or storage unavailable — game keeps running in memory */
    }
  }

  remove(key) {
    try {
      this.storage.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  /* ---- slot index ---- */
  index() {
    if (this.fixedKey) return { active: 'fixed', slots: {} };
    let idx = this.read(SAVE_INDEX_KEY);
    if (!idx?.slots) {
      idx = { active: 'slot1', slots: {} };
      // Adopt a pre-slot save (any version) into the first slot.
      for (const key of LEGACY_KEYS) {
        const legacy = this.read(key);
        if (legacy?.character) {
          this.write(SLOT_PREFIX + idx.active, legacy);
          idx.slots[idx.active] = slotMeta(legacy);
          this.remove(key);
          break;
        }
      }
      this.write(SAVE_INDEX_KEY, idx);
    }
    return idx;
  }

  get activeSlot() {
    return this.index().active;
  }

  get key() {
    return this.fixedKey ?? SLOT_PREFIX + this.activeSlot;
  }

  listSlots() {
    const idx = this.index();
    return Object.entries(idx.slots).map(([id, meta]) => ({ id, ...meta, active: id === idx.active }));
  }

  /** Switch to a slot (creating it if new). Returns the loaded state or null for an empty slot. */
  useSlot(id) {
    const idx = this.index();
    idx.active = id;
    idx.slots[id] ??= { empty: true, updated: Date.now() };
    this.write(SAVE_INDEX_KEY, idx);
    this.state = null;
    return this.load();
  }

  newSlotId() {
    const ids = Object.keys(this.index().slots);
    let n = ids.length + 1;
    while (ids.includes(`slot${n}`)) n += 1;
    return `slot${n}`;
  }

  deleteSlot(id) {
    const idx = this.index();
    delete idx.slots[id];
    this.remove(SLOT_PREFIX + id);
    if (idx.active === id) {
      idx.active = Object.keys(idx.slots)[0] ?? 'slot1';
      this.state = null;
    }
    this.write(SAVE_INDEX_KEY, idx);
  }

  /* ---- life load/save ---- */
  load() {
    const raw = this.read(this.key);
    if (!raw) return null;
    const result = migrate(raw, STATE_VERSION, migrationTemplate());
    if (!result) return null;
    this.state = result.state;
    this.migratedFrom = result.from < STATE_VERSION ? result.from : null;
    return this.state;
  }

  save() {
    if (!this.state) return;
    this.write(this.key, this.state);
    if (this.fixedKey) return;
    const idx = this.index();
    idx.slots[idx.active] = slotMeta(this.state);
    this.write(SAVE_INDEX_KEY, idx);
  }

  clear() {
    this.state = null;
    this.remove(this.key);
    if (this.fixedKey) return;
    const idx = this.index();
    idx.slots[idx.active] = { empty: true, updated: Date.now() };
    this.write(SAVE_INDEX_KEY, idx);
  }

  /* ---- export / import ---- */
  exportLife(state = this.state) {
    return JSON.stringify({ format: EXPORT_FORMAT, version: state.version, exportedAt: new Date().toISOString(), state }, null, 1);
  }

  /** Parse an exported life (or a bare saved state). Returns { state, from } or throws with a readable reason. */
  parseImport(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('That file is not valid JSON.');
    }
    const raw = data?.format === EXPORT_FORMAT ? data.state : data;
    if (raw?.version > STATE_VERSION) throw new Error(`That life was saved by a newer version (v${raw.version}).`);
    const result = migrate(raw, STATE_VERSION, migrationTemplate());
    if (!result) throw new Error('That file is not a LIFE//SIM save.');
    return result;
  }
}

function slotMeta(state) {
  const c = state.character;
  return { name: `${c.firstName} ${c.lastName}`, age: c.age, alive: c.alive, version: state.version, updated: Date.now() };
}

/* ------------------------------------------------------------------ */
/* Mutation helpers shared by all modules                              */
/* ------------------------------------------------------------------ */

export function currentYearBlock(state) {
  return state.log[state.log.length - 1];
}

export function addLog(state, text, icon = '•', kind = 'info') {
  const entries = currentYearBlock(state).entries;
  if (entries.length < LOG_MAX_PER_YEAR) entries.push({ text, icon, kind });
}

/** Log growth caps: full detail for recent years; older years keep only their headline moments. */
export const LOG_DETAIL_YEARS = 25;
export const LOG_MAX_PER_YEAR = 60;
const LOG_HEADLINE_KINDS = new Set(['milestone', 'death', 'good', 'bad', 'honor']);
const LOG_HEADLINES_KEPT = 4;

export function compactLog(state) {
  const cutoff = state.log.length - LOG_DETAIL_YEARS;
  for (let i = 0; i < cutoff; i++) {
    const block = state.log[i];
    if (block.compacted) continue;
    const headlines = block.entries.filter((e) => LOG_HEADLINE_KINDS.has(e.kind)).slice(0, LOG_HEADLINES_KEPT);
    block.entries = headlines.length ? headlines : block.entries.slice(0, 1);
    block.compacted = true;
  }
}

export function adjustStat(state, key, delta) {
  if (!(key in state.stats)) throw new Error(`Unknown stat: ${key}`);
  state.stats[key] = clamp(Math.round(state.stats[key] + delta), 0, 100);
  return state.stats[key];
}

export function addHonor(state, honor) {
  state.honors.push({ ...honor, age: state.character.age, year: currentYear(state) });
}

/** Per-year counters (reset every age-up) used for diminishing returns. */
export function yearlyCount(state, key) {
  return state.yearly[key] ?? 0;
}

export function bumpYearly(state, key) {
  state.yearly[key] = yearlyCount(state, key) + 1;
  return state.yearly[key];
}

/* ------------------------------------------------------------------ */
/* Read-only selectors                                                 */
/* ------------------------------------------------------------------ */

export const fullName = (state) => `${state.character.firstName} ${state.character.lastName}`;

export const currentYear = (state) => state.character.birthYear + state.character.age;

/** Market value minus mortgage and HELOC balances across all properties. */
export function homeEquity(state) {
  return state.housing.properties.reduce((sum, p) => sum + p.value - (p.mortgage?.balance ?? 0) - (p.heloc?.balance ?? 0), 0);
}

export function netWorth(state) {
  const f = state.finances;
  return Math.round(f.cash + state.retirement.dc + homeEquity(state) + investmentsValue(state) + businessEquity(state) + vehicleEquity(state) - f.loans - (state.health?.medicalDebt ?? 0) - (f.tax?.debt ?? 0));
}

/** Vehicles you own, net of their loans (leases carry no equity). Mirrors vehicles/Vehicles.js. */
export function vehicleEquity(state) {
  return (state.vehicles?.owned ?? []).reduce((s, v) => s + (v.lease ? 0 : v.value - (v.loan?.balance ?? 0)), 0);
}

/** Your share of your business's equity value (valuation is already net of business debt). */
export function businessEquity(state) {
  const b = state.business?.current;
  return b ? Math.max(0, Math.round(b.valuation * b.ownerPct)) : 0;
}

/** Brokerage holdings, speculative positions and IRAs. */
export function investmentsValue(state) {
  const inv = state.investing;
  if (!inv) return 0;
  const holdings = Object.values(inv.holdings).reduce((s, h) => s + h.value, 0);
  const spec = inv.speculative.reduce((s, p) => s + (p.value ?? 0), 0);
  return holdings + spec + inv.ira.roth.value + inv.ira.traditional.value;
}

/** Academic rank of each degree type. Certificates/diplomas sit beside high school. */
export const DEGREE_RANK = {
  highschool: 1,
  certificate: 1,
  vocational: 1,
  associate: 2,
  bachelor: 3,
  master: 4,
  professional: 5,
  doctorate: 5,
};

/**
 * Education requirement check. `req` may be:
 *   { level: 'bachelor' }                         — any degree at or above that rank
 *   { level: 'bachelor', majors: ['nursing'] }    — at/above rank in one of these majors
 *   { program: 'jd' }                             — a specific program (jd, md, mba, paralegal...)
 *   { anyOf: [req, req] }                         — any alternative satisfies
 */
export function meetsEducation(state, req) {
  if (!req) return true;
  if (req.anyOf) return req.anyOf.some((r) => meetsEducation(state, r));
  const degrees = state.education.degrees;
  if (req.program) return degrees.some((d) => d.programId === req.program);
  const rank = DEGREE_RANK[req.level] ?? 0;
  return degrees.some((d) => DEGREE_RANK[d.type] >= rank && (!req.majors?.length || req.majors.includes(d.major)));
}

export function highestDegree(state) {
  return state.education.degrees.reduce((best, d) => (!best || DEGREE_RANK[d.type] > DEGREE_RANK[best.type] ? d : best), null);
}

/** Convictions employers, licensing boards and recruiters can see: sealed records are hidden and pardons restore your rights. */
export const visibleRecord = (state) => state.legal.record.filter((r) => !r.sealed && !r.pardoned);
export const hasFelony = (state) => visibleRecord(state).some((r) => r.severity === 'felony');
export const isIncarcerated = (state) => Boolean(state.legal.incarceration);

/**
 * Credit-card limit: what you can put on cards for things you choose to buy.
 * Set by credit score and income; a recent bankruptcy leaves only a secured card.
 * Bills, fines and taxes still pile up past it — they aren't purchases.
 */
export function creditLimit(state) {
  if (state.character.age < 18) return 0;
  const score = state.housing?.credit?.score ?? 650;
  const f = state.finances;
  const income = Math.max(state.career?.job?.salary ?? 0, f.lastYear?.gross ?? 0);
  if (f.lastBankruptcy && state.character.age - f.lastBankruptcy.age < 2) return 500;
  const share = score >= 740 ? 0.3 : score >= 670 ? 0.2 : score >= 580 ? 0.1 : 0.03;
  return Math.round(Math.min(60000, Math.max(score >= 580 ? 1000 : 300, income * share)));
}

/** Remaining room on your cards (0 once you're past the limit). */
export const availableCredit = (state) => Math.max(0, creditLimit(state) + Math.min(0, state.finances.cash));

/** Can you pay for a purchase with cash plus remaining credit? */
export const canAfford = (state, amount) => state.finances.cash - amount >= -creditLimit(state);

export function isOnActiveDuty(state) {
  return state.military.service?.component === 'active';
}

export function isDeployed(state) {
  return Boolean(state.military.service?.deployedThisYear);
}

/** Total years worked in any of the given professions (past jobs + current). */
export function yearsInProfession(state, professionIds) {
  const ids = Array.isArray(professionIds) ? professionIds : [professionIds];
  const past = state.career.history.filter((h) => ids.includes(h.professionId)).reduce((sum, h) => sum + (h.endAge - h.startAge), 0);
  const job = state.career.job;
  return past + (job && ids.includes(job.professionId) ? job.yearsAtEmployer : 0);
}

/** Everything competing for the character's time this year. */
export function getCommitments(state) {
  const list = [];
  const job = state.career.job;
  if (job) {
    const micro = job.department ? Object.values(job.department.delegation).filter((d) => !d).length * (job.department.headcount >= 8 ? 0.5 : 0) : 0;
    list.push({ id: 'job', label: job.department ? `${job.title} (+team)` : job.title, load: 3 + micro });
  }
  const biz = state.business?.current;
  if (biz) {
    const delegated = biz.staff.headcount >= 8 ? Object.values(biz.staff.delegation).filter(Boolean).length : 0;
    list.push({ id: 'business', label: biz.role === 'operator' ? `Running ${biz.name}` : `Owner of ${biz.name}`, load: biz.role === 'operator' ? 3 - delegated * 0.5 : 0.5 });
  }
  const k12 = state.k12;
  if (k12?.job && state.character.age < 18) list.push({ id: 'teenJob', label: 'Part-time job', load: 1 });
  if (k12?.activities.length && state.character.age < 18) list.push({ id: 'activities', label: `${k12.activities.length} activit${k12.activities.length > 1 ? 'ies' : 'y'}`, load: 0.5 * k12.activities.length });
  const school = state.education.enrolled;
  if (school) list.push({ id: 'school', label: `School (${school.pace === 'part' ? 'part-time' : 'full-time'})`, load: school.pace === 'part' ? 1.5 : 3 });
  for (const t of state.credentials.training) list.push({ id: `train.${t.id}`, label: `Training: ${t.name}`, load: 1 });
  const svc = state.military.service;
  if (svc) list.push({ id: 'military', label: svc.component === 'active' ? 'Active duty' : 'Military reserves', load: svc.component === 'active' ? 4 : 1.5 });
  const c = state.campus;
  if (c && school) {
    if (c.greek) list.push({ id: 'greek', label: c.greek.name, load: 0.5 });
    if (c.sport) list.push({ id: 'sport', label: `Varsity ${c.sport.name}`, load: 1 });
    if (c.rotc) list.push({ id: 'rotc', label: 'ROTC', load: 1 });
    if (c.studentGov) list.push({ id: 'studentGov', label: 'Student government', load: 0.5 });
    if (c.clubs.length) list.push({ id: 'clubs', label: `${c.clubs.length} club${c.clubs.length > 1 ? 's' : ''}`, load: 0.25 * c.clubs.length });
  }
  // Elder care (see people/ElderCare ARRANGEMENTS — kept in sync by hand to avoid an import cycle).
  const CARE_LOAD = { self: { help: 1, full: 2.5 }, moveIn: { help: 0.75, full: 2 }, aide: { help: 0.25, full: 0.5 }, assisted: { help: 0.25, full: 0.25 }, nursing: { help: 0.25, full: 0.25 } };
  for (const c of Object.values(state.elderCare?.cases ?? {})) {
    const load = CARE_LOAD[c.arrangement]?.[c.level];
    const parent = state.people?.list.find((p) => p.id === c.personId);
    if (load && parent?.alive) list.push({ id: `care.${c.personId}`, label: `Caring for ${parent.firstName}`, load });
  }
  const cm = state.community;
  if (cm) {
    const faith = cm.faith;
    if (faith && faith.attendance !== 'occasional' && job?.professionId !== 'clergy') list.push({ id: 'faith', label: faith.congregation, load: (faith.attendance === 'devout' ? 0.5 : 0.25) + (faith.role ? 0.25 : 0) });
    if (cm.volunteering.length) list.push({ id: 'volunteer', label: `Volunteering (${cm.volunteering.length})`, load: 0.5 * cm.volunteering.length });
    if (cm.mentoring) list.push({ id: 'mentor', label: 'Mentoring', load: 0.5 });
  }
  for (const [key, member] of Object.entries(state.emergency)) {
    if (key === 'history') continue;
    if (member && !member.onLeave) list.push({ id: key, label: member.serviceName, load: 1.5 });
  }
  return list;
}

export const commitmentLoad = (state) => getCommitments(state).reduce((sum, c) => sum + c.load, 0);

export function prestige(state) {
  return state.honors.reduce((sum, h) => sum + (h.prestige ?? 0), 0);
}
