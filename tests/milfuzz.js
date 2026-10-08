/**
 * Military fuzzer: lives spent mostly in uniform (every branch, track and
 * component), taking random military actions and answering prompts at
 * random, checking service invariants every year and scanning every log
 * line and prompt for broken text (undefined, NaN, [object Object]).
 *
 *   node tests/milfuzz.js [lives=60] [seed=1]
 */
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { MOS } from '../src/modules/military/MOS.js';
import { BRANCHES, rankOf, annualActivePay, RETIREMENT_YEARS } from '../src/modules/military/MilitaryEngine.js';
import { unitView } from '../src/modules/org/MilitaryUnits.js';
import { VIEWS } from '../src/ui/Renderer.js';

const LIVES = Number(process.argv[2] ?? 60);
const SEED = Number(process.argv[3] ?? 1);
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const problems = new Map();
const paths = new Set();
const flag = (msg, where) => { if (!problems.has(msg)) problems.set(msg, where); };
const BAD_TEXT = /undefined|NaN|\[object |\bnull\b|Infinity/;

const BRANCH_IDS = Object.keys(BRANCHES);
const ACTIONS = [
  ['military.pt'], ['military.extraDuty'], ['military.requestDeployment', null, 0.2], ['military.applyOCS', null, 0.2],
  ['military.switchComponent', null, 0.03], ['military.transferBranch', 'branch', 0.02], ['military.leaveService', null, 0.03], ['military.retire', null, 0.15],
  ['military.counsel', 'soldier'], ['military.award', 'soldier'], ['military.njp', 'soldier', 0.2],
  ['military.volunteerSelection', 'pipeline', 0.2], ['military.leaveSof', null, 0.03], ['military.transferGiBill', null, 0.1],
  ['military.attendSchool', 'school'], ['military.retrain', 'retrain', 0.1], ['military.applyWarrant', 'warrant', 0.1], ['military.skillBridge', 'civilian', 0.3],
];

function argFor(kind, state, rng) {
  const s = state.military.service;
  switch (kind) {
    case 'branch': return rng.pick(BRANCH_IDS);
    case 'soldier': { const v = s && unitView(state, s); return v ? rng.pick(v.team.map((p) => p.id).concat(['none'])) : 'none'; }
    case 'pipeline': return rng.pick(['ranger', 'greenBeret', 'seal', 'pararescue', 'raider', 'orbitalWarfare']);
    case 'school': return rng.pick(['pme1', 'pme2', 'pme3', 'opme1', 'opme2', 'opme3', 'wpme1', 'wpme2', 'airborne', 'airAssault', 'rangerSchool', 'jumpmaster', 'pathfinder', 'freefall', 'combatDiver', 'sniper', 'expertBadge', 'sere', 'instructor', 'dli']);
    case 'retrain': return s ? rng.pick(Object.values(MOS).filter((m) => m.branch === s.branch && m.track === s.track).map((m) => m.id).concat(['none'])) : 'none';
    case 'warrant': return s ? rng.pick(Object.values(MOS).filter((m) => m.branch === s.branch && m.track === 'warrant').map((m) => m.id).concat(['none'])) : 'none';
    case 'civilian': return rng.pick(['logistics', 'cybersecurity', 'police', 'ems', 'trades', 'tech']);
    default: return undefined;
  }
}

function check(state, where, seen) {
  const s = state.military.service;
  // Broken text in this year's log and in open prompts.
  for (const block of state.log.slice(-2)) for (const e of block.entries ?? []) {
    const t = typeof e === 'string' ? e : e.text;
    if (typeof t !== 'string') flag('log entry without text', where);
    else if (BAD_TEXT.test(t) && !seen.has(t)) { seen.add(t); flag(`broken log text: "${t.slice(0, 140)}"`, where); }
  }
  for (const p of state.prompts) {
    const t = [p.title, p.text, ...p.options.map((o) => `${o.label} ${o.hint ?? ''}`)].join(' | ');
    if (BAD_TEXT.test(t)) flag(`broken prompt text (${p.type}): "${t.slice(0, 160)}"`, where);
    if (!p.options.length) flag(`prompt with no options (${p.type})`, where);
  }
  if (!s) return;
  const b = BRANCHES[s.branch];
  if (!b) flag(`unknown branch ${s.branch}`, where);
  let rank;
  try { rank = rankOf(s); } catch (e) { flag(`rankOf threw: ${e.message}`, where); }
  if (!rank?.title) flag(`no rank title (${s.branch} ${s.track} grade ${s.grade})`, where);
  if (s.mos && !MOS[s.mos]) flag(`unknown MOS ${s.mos}`, where);
  if (s.mos && MOS[s.mos] && MOS[s.mos].branch !== s.branch) flag(`MOS from another branch (${s.mos} in ${s.branch})`, where);
  if (s.mos && MOS[s.mos] && MOS[s.mos].track !== s.track && !s.branchDetail) flag(`MOS track mismatch (${s.mos} ${MOS[s.mos].track} vs ${s.track})`, where);
  for (const k of ['grade', 'yearsOfService', 'eval', 'contractYearsLeft']) if (s[k] != null && !Number.isFinite(s[k])) flag(`non-finite svc.${k}`, where);
  if (s.eval < 0 || s.eval > 100) flag(`eval out of range (${s.eval})`, where);
  if (s.grade < 0) flag(`grade below 0 (${s.grade})`, where);
  if (s.contractYearsLeft < 0) flag(`negative contract years (${s.contractYearsLeft})`, where);
  const pay = annualActivePay(s);
  if (!Number.isFinite(pay) || pay <= 0) flag(`bad active pay (${pay}) for ${s.track} grade ${s.grade}`, where);
  if (s.yearsOfService > state.character.age - 16) flag(`more years of service than possible (${s.yearsOfService} at ${state.character.age})`, where);
  if (s.component === 'active' && state.career.job && !state.career.job.militaryLeave) flag('active duty while holding a civilian job', where);
  if (state.legal.incarceration && state.legal.incarceration.kind !== 'brig') flag('still in service while in prison', where);
  if (s.track === 'warrant') paths.add('warrant');
  if (s.sof) paths.add('special operations');
  if (s.overseas) paths.add('overseas');
  if (s.branchDetail) paths.add('branch detail');
  if (s.lastRetrain) paths.add('retrained');
  if (s.track === 'officer') paths.add('officer');
  if (s.grade >= 6 && s.track === 'enlisted') paths.add('senior NCO');
  if (s.grade >= 3 && s.track === 'officer') paths.add('field grade');
  paths.add(`${s.branch} ${s.component}`);
}

function life(seed) {
  const rng = new Random(seed * 104729);
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ firstName: 'Mil', lastName: `F${seed}`, gender: rng.pick(['male', 'female']) });
  const seen = new Set();
  const solve = () => { for (let g = 0; g < 15 && state.prompts.length; g++) { const pr = state.prompts[0]; const opts = pr.options.filter((o) => !o.disabled && o.id !== 'cancel'); engine.resolvePrompt(pr.id, rng.pick(opts.length ? opts : pr.options).id); } };
  const tryDo = (fn, where) => { try { fn(); } catch (e) { flag(`threw: ${e.message.split('\n')[0]}`, `${where}\n${e.stack.split('\n').slice(1, 4).join('\n')}`); } };
  // Make them fit and bright enough that most doors are open.
  state.stats.fitness = Math.max(state.stats.fitness ?? 60, rng.int(55, 95));
  state.stats.smarts = Math.max(state.stats.smarts, rng.int(45, 90));
  let tours = 0;
  while (state.character.alive && state.character.age < 75) {
    const age = state.character.age;
    if (age >= 18 && !state.military.service && tours < 3 && age <= 34 && rng.chance(age === 18 ? 0.9 : 0.25)) {
      // Officers usually need a degree: give some of them one.
      const track = rng.pick(['enlisted', 'enlisted', 'officer', 'warrant']);
      if (track === 'officer' && !state.education.degrees.some((d) => d.type === 'bachelor') && rng.chance(0.7)) state.education.degrees.push({ type: 'bachelor', major: rng.pick(['engineering', 'business', 'computerScience', 'history']), gpa: 3.2, age });
      tryDo(() => { engine.dispatch('military.enlist', `${rng.pick(BRANCH_IDS)}:${track}:${rng.pick(['active', 'active', 'reserve'])}`); solve(); }, 'enlist');
      if (state.military.service) tours += 1;
    }
    if (state.military.service) {
      for (let k = 0; k < 3; k++) {
        const [action, kind, p = 0.5] = rng.pick(ACTIONS);
        if (!rng.chance(p)) continue;
        tryDo(() => { engine.dispatch(action, argFor(kind, state, rng)); solve(); }, `${action} @${age} seed ${seed}`);
        check(state, `${action} @${state.character.age} seed ${seed}`, seen);
      }
    } else if (age >= 18 && !state.career.job && rng.chance(0.3)) tryDo(() => { engine.dispatch('career.apply', rng.pick(['logistics', 'police', 'cybersecurity', 'retail', 'trades'])); solve(); }, 'apply');
    if (age % 4 === 0) tryDo(() => {
      const before = JSON.stringify(state);
      for (const [tab, view] of Object.entries(VIEWS)) {
        const html = view(state, {});
        if (typeof html !== 'string') flag(`view ${tab} returned no HTML`, age);
        else if (/>[^<]*(undefined|NaN|\[object )[^<]*</.test(html)) flag(`view ${tab} shows broken text: ${html.match(/>[^<]*(undefined|NaN|\[object )[^<]*</)[0].slice(0, 120)}`, `seed ${seed} @${age}`);
      }
      if (JSON.stringify(state) !== before) flag('rendering a view changed the game state', `seed ${seed} @${age}`);
    }, `render @${age}`);
    const yosBefore = state.military.service?.yearsOfService;
    tryDo(() => { state.prompts = []; engine.ageUp(); solve(); }, `ageUp @${age} seed ${seed}`);
    const svc = state.military.service;
    if (svc && yosBefore != null && svc.yearsOfService < yosBefore) flag(`years of service went down (${yosBefore} → ${svc.yearsOfService})`, `seed ${seed} @${state.character.age}`);
    check(state, `ageUp @${state.character.age} seed ${seed}`, seen);
  }
  for (const h of state.military.history) {
    if (h.discharge === 'retired') {
      paths.add('retired');
      if ((h.yearsOfService ?? 0) < RETIREMENT_YEARS && !h.medical) flag(`retired with ${h.yearsOfService} years`, `seed ${seed}`);
    }
    if (h.discharge) paths.add(`discharge ${h.discharge}`);
  }
}

for (let i = 0; i < LIVES; i++) life(SEED * 1000 + i);
if (problems.size) {
  for (const [msg, where] of problems) console.log(`  ✘ ${msg}\n      ${String(where).split('\n').join('\n      ')}`);
  console.log(`\n${problems.size} distinct problem(s); paths: ${[...paths].sort().join(', ')}`);
  process.exit(1);
}
console.log(`✔ Military fuzz passed — ${LIVES} lives; paths: ${[...paths].sort().join(', ')}`);
