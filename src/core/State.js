/**
 * Global game state: shape, persistence (LocalStorage) and shared selectors.
 *
 * The state tree is plain JSON — no functions, no class instances — so it can
 * be saved after every mutation and restored verbatim. Each domain module owns
 * one top-level slice (career, military, credentials, legal, ...) and may
 * *read* other slices through the selectors exported here, but only mutates
 * its own. Cross-domain effects travel over the engine's event bus.
 */
import { clamp } from './Random.js';

export const STATE_VERSION = 2;
export const SAVE_KEY = 'lifesim.save.v2';
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
const HOMETOWNS = ['smalltown', 'midcity', 'sunbelt', 'chicago'];

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
    retirement: { retired: false, dc: 0, pensions: [], plans: {}, ssEarnings: [], socialSecurity: null },
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

export class Store {
  constructor(storage = defaultStorage(), key = SAVE_KEY) {
    this.storage = storage;
    this.key = key;
    this.state = null;
  }

  load() {
    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.version !== STATE_VERSION) return null;
      this.state = parsed;
      return parsed;
    } catch {
      return null;
    }
  }

  save() {
    if (!this.state) return;
    try {
      this.storage.setItem(this.key, JSON.stringify(this.state));
    } catch {
      /* quota exceeded or storage unavailable — game keeps running in memory */
    }
  }

  clear() {
    this.state = null;
    try {
      this.storage.removeItem(this.key);
    } catch {
      /* ignore */
    }
  }
}

/* ------------------------------------------------------------------ */
/* Mutation helpers shared by all modules                              */
/* ------------------------------------------------------------------ */

export function currentYearBlock(state) {
  return state.log[state.log.length - 1];
}

export function addLog(state, text, icon = '•', kind = 'info') {
  currentYearBlock(state).entries.push({ text, icon, kind });
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

export function netWorth(state) {
  const f = state.finances;
  return Math.round(f.cash + state.retirement.dc - f.loans);
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

export const hasFelony = (state) => state.legal.record.some((r) => r.severity === 'felony');
export const isIncarcerated = (state) => Boolean(state.legal.incarceration);

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
  const school = state.education.enrolled;
  if (school) list.push({ id: 'school', label: `School (${school.pace === 'part' ? 'part-time' : 'full-time'})`, load: school.pace === 'part' ? 1.5 : 3 });
  for (const t of state.credentials.training) list.push({ id: `train.${t.id}`, label: `Training: ${t.name}`, load: 1 });
  const svc = state.military.service;
  if (svc) list.push({ id: 'military', label: svc.component === 'active' ? 'Active duty' : 'Military reserves', load: svc.component === 'active' ? 4 : 1.5 });
  for (const key of ['fire', 'police', 'sar']) {
    const member = state.emergency[key];
    if (member && !member.onLeave) list.push({ id: key, label: member.serviceName, load: 1.5 });
  }
  return list;
}

export const commitmentLoad = (state) => getCommitments(state).reduce((sum, c) => sum + c.load, 0);

export function prestige(state) {
  return state.honors.reduce((sum, h) => sum + (h.prestige ?? 0), 0);
}
