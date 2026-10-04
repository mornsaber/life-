/**
 * Career ↔ credential audit: every license a career level asks for must
 * exist, and someone on that career path must be able to actually get it.
 *
 *   node tests/careers.js
 *
 * Checks:
 *   - referenced credentials, programs, majors and professions exist
 *   - sponsor-only credentials are sponsored by the career that needs them
 *   - every career has at least one entry level an outsider can qualify for
 *   - trainee programs can earn the next level's credentials through the
 *     employer (academy) or on their own
 *   - agency-member courses are open to members of the career that needs them
 */
import { PROFESSIONS } from '../src/modules/career/JobTrees.js';
import { CREDENTIALS, REQUIRED_BY } from '../src/modules/credentials/CredentialRegistry.js';
import { PROGRAMS, MAJORS } from '../src/modules/education/Catalog.js';
import { TRAINEE_LEVELS } from '../src/modules/career/Tenure.js';
import { SERVICES } from '../src/modules/emergency/EmergencyEngine.js';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { pursueEligibility, grantCredential } from '../src/modules/credentials/LicensingEngine.js';
import { credentialPlan } from '../src/modules/career/Tenure.js';

const problems = [];
const flag = (where, msg) => problems.push(`${where}: ${msg}`);
const SERVICE_IDS = new Set(Object.keys(SERVICES ?? {}));

/** All requirement objects (anyOf flattened) in a credential's requirement tree. */
function branches(req) {
  if (!req) return [{}];
  if (req.anyOf) return req.anyOf.flatMap(branches);
  return [req];
}

function checkEducation(where, edu) {
  if (!edu) return;
  for (const e of edu.anyOf ?? [edu]) {
    if (e.program && !PROGRAMS[e.program]) flag(where, `unknown program ${e.program}`);
    for (const m of e.majors ?? []) if (!MAJORS[m]) flag(where, `unknown major ${m}`);
  }
}

function checkReq(where, req) {
  for (const b of branches(req)) {
    for (const c of b.credentials ?? []) if (!CREDENTIALS[c]) flag(where, `unknown credential ${c}`);
    checkEducation(where, b.education);
    for (const p of b.experience?.professions ?? []) if (!PROFESSIONS[p]) flag(where, `unknown profession ${p} in experience`);
  }
}

/**
 * Can a member of `professionId` (or an outsider when null) obtain this credential?
 * Returns null when obtainable, else the reason.
 */
function obtainable(credId, professionId, seen = new Set()) {
  if (seen.has(credId)) return null;
  seen.add(credId);
  const c = CREDENTIALS[credId];
  if (!c) return `${credId} doesn't exist`;
  const sponsors = c.sponsors?.professions ?? [];
  const services = c.sponsors?.services ?? [];
  const fundedByLadder = professionId && REQUIRED_BY[credId]?.has(professionId);
  if (c.sponsoredOnly && !fundedByLadder && !(professionId && (sponsors.includes(professionId) || (c.academy ?? []).includes(professionId))) && !services.length && !c.sponsors?.anyEmployer) {
    return `${credId} is employer-sponsored only, and ${professionId ?? 'outsiders'} can't get it`;
  }
  // At least one requirement branch must be satisfiable.
  const reasons = [];
  for (const b of branches(c.requires)) {
    let ok = true;
    if (b.affiliation && !(professionId && b.affiliation.includes(professionId)) && !b.affiliation.some((a) => SERVICE_IDS.has(a))) {
      reasons.push(`${credId} is only open to members of ${b.affiliation.join('/')}`);
      ok = false;
    }
    for (const pre of b.credentials ?? []) {
      const r = obtainable(pre, professionId, seen);
      if (r) { reasons.push(r); ok = false; }
    }
    if (ok) return null;
  }
  return reasons[0] ?? null;
}

// Credentials: references inside the registry.
for (const [id, c] of Object.entries(CREDENTIALS)) {
  checkReq(`credential ${id}`, c.requires);
  for (const p of [...(c.sponsors?.professions ?? []), ...(c.academy ?? []), ...(c.valuedBy ?? [])]) if (!PROFESSIONS[p]) flag(`credential ${id}`, `unknown profession ${p}`);
  for (const s of c.sponsors?.services ?? []) if (!SERVICE_IDS.has(s)) flag(`credential ${id}`, `unknown service ${s}`);
  for (const i of c.implies ?? []) if (!CREDENTIALS[i]) flag(`credential ${id}`, `implies unknown ${i}`);
}

for (const [pid, p] of Object.entries(PROFESSIONS)) {
  checkReq(`${pid} entry`, p.entry);
  for (const v of p.valued ?? []) if (!CREDENTIALS[v]) flag(pid, `valued credential ${v} doesn't exist`);
  // Entry: an outsider must qualify for some entry level (or the first one).
  const entries = p.levels.filter((l, i) => i === 0 || l.entry);
  const entryReasons = entries.map((l) => {
    for (const b of branches(p.entry)) for (const c of b.credentials ?? []) { const r = obtainable(c, null); if (r) return `${l.id}: entry ${r}`; }
    for (const c of l.req?.credentials ?? []) { const r = obtainable(c, null); if (r) return `${l.id}: ${r}`; }
    return null;
  });
  if (entryReasons.every(Boolean)) flag(pid, `nobody can be hired — ${entryReasons[0]}`);
  // Every level's credentials must be reachable from inside the career.
  for (const l of p.levels) {
    checkReq(`${pid}.${l.id}`, l.req);
    for (const c of l.req?.credentials ?? []) {
      const r = obtainable(c, pid);
      if (r) flag(`${pid}.${l.id}`, r);
    }
  }
}

// Trainee programs: the next level must exist, and its credentials must come through the employer or be self-pursuable.
for (const [key, prog] of Object.entries(TRAINEE_LEVELS)) {
  const [pid, levelId] = key.split('.');
  const p = PROFESSIONS[pid];
  if (!p) { flag(`trainee ${key}`, 'unknown profession'); continue; }
  if (!p.levels.some((l) => l.id === levelId)) flag(`trainee ${key}`, 'unknown trainee level');
  const next = p.levels.find((l) => l.id === prog.next);
  if (!next) { flag(`trainee ${key}`, `unknown next level ${prog.next}`); continue; }
  for (const c of next.req?.credentials ?? []) {
    const cred = CREDENTIALS[c];
    if (prog.academy && cred && !(cred.academy ?? []).includes(pid) && cred.sponsoredOnly) flag(`trainee ${key}`, `${c} is sponsored-only but not run by the ${pid} academy`);
    if (prog.academy && cred && !(cred.academy ?? []).includes(pid)) {
      // Not an academy course: the trainee must pursue it themselves (allowed, but say so if it isn't sponsored either).
      if (!(cred.sponsors?.professions ?? []).includes(pid)) flag(`trainee ${key}`, `${c} is neither run nor paid for by the ${pid} employer`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Runtime: play each career through the engine                        */
/* ------------------------------------------------------------------ */

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

/** A candidate who meets every education and experience bar, so only sponsorship and access can block. */
function candidate(seed, age) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Audit', lastName: 'Case', gender: 'male' });
  Object.assign(state.stats, { health: 95, smarts: 95, fitness: 90, happiness: 80, stress: 5 });
  state.character.age = age;
  state.finances.cash = 2000000;
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', major: null, year: 18 });
  for (const m of Object.keys(MAJORS)) for (const type of ['associate', 'bachelor', 'master']) state.education.degrees.push({ type, programId: type, major: m, year: 22 });
  for (const [id, prog] of Object.entries(PROGRAMS)) state.education.degrees.push({ type: prog.type, programId: id, major: typeof prog.major === 'string' && prog.major !== 'choose' ? prog.major : null, year: 24 });
  const ctx = engine.context();
  for (const id of ['learnerPermit', 'driverLicense']) grantCredential(ctx, id, { silent: true });
  state.credentials.logbook.flightHours = 5000; // pilots build hours flying; not what this audit tests
  return { engine, state, ctx };
}

const ageFor = (p) => Math.max(p.minAge ?? 18, 25) > 30 ? 30 : Math.max(p.minAge ?? 18, 25);

// 1. Every credential a level requires can be earned while working in that career.
for (const [pid, p] of Object.entries(PROFESSIONS)) {
  const { engine, state, ctx } = candidate(1000 + Object.keys(PROFESSIONS).indexOf(pid), ageFor(p));
  for (const other of Object.keys(PROFESSIONS)) state.career.history.push({ professionId: other, startAge: 0, endAge: 15, peakGrade: 5 });
  const employer = createEmployer(engine.rng, state, p, state.character.regionId);
  employer.size = 'enterprise';
  hire(ctx, { professionId: pid, levelId: p.levels[0].id, employer });
  state.prompts = [];
  for (const l of p.levels) {
    for (const c of credentialPlan(state, l.req?.credentials ?? [])) {
      state.yearly = {};
      const e = pursueEligibility(state, c);
      if (!e.ok && !/Held|Covered|In training/.test(e.reason)) flag(`${pid}.${l.id}`, `can't earn ${c} on the job: ${e.reason}`);
      grantCredential(ctx, c, { silent: true });
    }
  }
}

// 2. Trainee programs graduate a capable recruit on schedule (a recruit who also
// pursues any license the program expects them to earn themselves). Random
// layoffs and firings happen, so a program fails only if three recruits all fail.
function runTrainee(key, prog, seed) {
  const [pid, levelId] = key.split('.');
  const p = PROFESSIONS[pid];
  const { engine, state, ctx } = candidate(seed, ageFor(p));
  const employer = createEmployer(engine.rng, state, p, state.character.regionId);
  employer.size = 'enterprise';
  hire(ctx, { professionId: pid, levelId, employer });
  const level = p.levels.find((l) => l.id === levelId);
  const next = p.levels.find((l) => l.id === prog.next);
  for (let y = 0; y < (level?.years ?? 1) + prog.grace + 2 && state.career.job?.levelId === levelId && state.character.alive; y++) {
    state.prompts = [];
    for (const c of credentialPlan(state, next?.req?.credentials ?? [])) if (pursueEligibility(state, c).ok) engine.dispatch('credentials.pursue', c);
    state.prompts = [];
    engine.ageUp();
    for (let g = 0; g < 10 && state.prompts.length; g++) { const pr = state.prompts[0]; engine.resolvePrompt(pr.id, (pr.options.find((o) => !o.disabled) ?? pr.options[0]).id); }
  }
  if (!state.character.alive) return null;
  if (state.career.job?.professionId !== pid) return `washed out: ${state.career.history.at(-1)?.reason ?? 'left'}`;
  if (state.career.job.levelId === levelId) return `never graduated to ${prog.next}`;
  return null;
}
for (const [key, prog] of Object.entries(TRAINEE_LEVELS)) {
  const pid = key.split('.')[0];
  if (!PROFESSIONS[pid] || pid === 'medical' || pid === 'catholicClergy') continue; // the Match and ordination have their own tests
  const results = [0, 1, 2].map((i) => runTrainee(key, prog, 5000 + Object.keys(TRAINEE_LEVELS).indexOf(key) * 7 + i));
  if (results.every(Boolean)) flag(`trainee ${key}`, results[0]);
}

if (problems.length) {
  console.log(problems.map((p) => `  ✘ ${p}`).join('\n'));
  console.log(`\n${problems.length} career/credential problem(s)`);
  process.exit(1);
}
console.log(`✔ Career ↔ credential audit passed — ${Object.keys(PROFESSIONS).length} careers, ${Object.keys(CREDENTIALS).length} credentials`);
