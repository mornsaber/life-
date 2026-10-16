/**
 * Foreign armed forces fuzz: careers in every other country's forces, taking
 * random actions and answering prompts at random, scanning the log, prompts
 * and the Service tab for broken text and for US-only terms that shouldn't
 * appear in a British, German or Korean career — and checking that a war at
 * home sends the country's own forces to it.
 *
 *   node tests/milabroad.js [livesPerCountry=4] [seed=1]
 */
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { FORCES } from '../src/modules/world/NationalForces.js';
import { unitView } from '../src/modules/org/MilitaryUnits.js';
import { declareWar } from '../src/modules/world/War.js';
import { VIEWS } from '../src/ui/Renderer.js';

const PER = Number(process.argv[2] ?? 4);
const SEED = Number(process.argv[3] ?? 1);
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const problems = new Map();
const flag = (msg, where) => { if (!problems.has(msg)) problems.set(msg, where); };
const BAD_TEXT = /undefined|NaN|\[object |\bnull\b|Infinity/;
/** Terms that belong to the US forces only. */
const US_TERMS = /Article 15|\bPCS\b|stateside|Pentagon|(?<!National |People's |Progressives )Congress(ional)?\b|ASVAB|Landstuhl|Fort (Jackson|Bragg|Hood|Benning)|Parris Island|West Point|\bUSS\b|(?<!Scout )Ranger Regiment|Green Beret|Navy SEAL|Joint Chiefs of Staff(?! \()|Secretary of Defense|Senate Armed Services|Marine Security Guard|(?<!Regimental )Sergeant Major of the Army|Green to Gold|STA-21|Arlington|Air Assault (School|Badge)/;

const ACTIONS = [
  ['military.pt'], ['military.extraDuty'], ['military.requestDeployment', null, 0.3], ['military.applyOCS', null, 0.2],
  ['military.transferBranch', 'branch', 0.05], ['military.counsel', 'soldier'], ['military.award', 'soldier'], ['military.njp', 'soldier', 0.2],
  ['military.correct', 'soldier'], ['military.promote', 'soldier'],
  ['military.volunteerSelection', 'pipeline', 0.3], ['military.attendSchool', 'school'], ['military.applyAssignment', 'assignment', 0.5], ['military.applyCommissioning', null, 0.3],
];
function argFor(kind, state, rng, cc) {
  const s = state.military.service;
  switch (kind) {
    case 'branch': return rng.pick(Object.keys(FORCES[cc].branches));
    case 'soldier': { const v = s && unitView(state, s); return v ? rng.pick(v.team.map((p) => p.id).concat(['none'])) : 'none'; }
    case 'pipeline': return rng.pick(['ranger', 'greenBeret', 'seal', 'pararescue', 'raider']);
    case 'school': return rng.pick(['pme1', 'pme2', 'pme3', 'opme1', 'opme2', 'opme3', 'airborne', 'airAssault', 'rangerSchool', 'sniper', 'expertBadge', 'sere', 'instructor', 'dli']);
    case 'assignment': return rng.pick(['drill', 'recruiter', 'msg', 'honorGuard', 'rotc', 'academy', 'aide', 'joint', 'fellow']);
    default: return undefined;
  }
}
const scan = (text, where, seen) => {
  if (seen.has(text)) return;
  seen.add(text);
  if (BAD_TEXT.test(text)) flag(`broken text: "${text.slice(0, 140)}"`, where);
  const us = text.match(US_TERMS);
  if (us) flag(`US-only term "${us[0]}": "…${text.replace(/\d+/g, "#").slice(Math.max(0, us.index - 80), us.index + 60)}"`, where);
};

let warTours = 0;
let served = 0;
function life(cc, seed) {
  const rng = new Random(seed * 7919);
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, gender: rng.pick(['male', 'female']) });
  const seen = new Set();
  const solve = () => { for (let g = 0; g < 15 && state.prompts.length; g++) { const pr = state.prompts[0]; const opts = pr.options.filter((o) => !o.disabled && o.id !== 'cancel'); engine.resolvePrompt(pr.id, rng.pick(opts.length ? opts : pr.options).id); } };
  const tryDo = (fn, where) => { try { fn(); } catch (e) { flag(`threw: ${e.message.split('\n')[0]}`, `${where}\n${e.stack.split('\n').slice(1, 4).join('\n')}`); } };
  state.stats.fitness = Math.max(state.stats.fitness ?? 60, rng.int(60, 95));
  state.stats.smarts = Math.max(state.stats.smarts, rng.int(50, 90));
  const war = rng.chance(0.5);
  while (state.character.alive && state.character.age < 60) {
    const age = state.character.age;
    if (age === 18 && !state.military.service) {
      const track = rng.pick(['enlisted', 'enlisted', 'officer']);
      if (track === 'officer') state.education.degrees.push({ type: 'bachelor', major: 'history', gpa: 3.3, age });
      tryDo(() => { engine.dispatch('military.enlist', `${rng.pick(Object.keys(FORCES[cc].branches).filter((b) => b !== 'guard'))}:${track}:active`); solve(); }, `enlist ${cc}`);
    }
    if (war && age === 24 && state.military.service) tryDo(() => declareWar(engine.context(), cc), 'declare war');
    if (state.military.service) {
      for (let k = 0; k < 3; k++) {
        const [action, kind, p = 0.5] = rng.pick(ACTIONS);
        if (!rng.chance(p)) continue;
        tryDo(() => { engine.dispatch(action, argFor(kind, state, rng, cc)); solve(); }, `${action} ${cc} @${age} seed ${seed}`);
      }
    }
    if (age % 3 === 0 && state.military.service) tryDo(() => {
      const html = VIEWS.military(state, {});
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      for (const chunk of text.split(/(?<=[.!?])\s/)) scan(chunk, `${cc} service view @${age}`, seen);
    }, `render ${cc}`);
    tryDo(() => { state.prompts = []; engine.ageUp(); }, `ageUp ${cc} @${age} seed ${seed}`);
    for (const p of state.prompts) scan([p.title, p.text, ...p.options.map((o) => `${o.label} ${o.hint ?? ''}`)].join(' | '), `${cc} prompt ${p.type} @${age}`, seen);
    tryDo(solve, `solve ${cc} @${age}`);
    for (const block of state.log.slice(-2)) for (const e of block.entries ?? []) if (typeof e?.text === 'string') scan(e.text, `${cc} log @${state.character.age} seed ${seed}`, seen);
  }
  if (state.military.service || state.military.history?.length) served += 1;
  warTours += state.log.flatMap((y) => y.entries ?? []).filter((e) => /deployed to Operation/.test(e?.text ?? '')).length;
  warTours += state.military.service?.warTours ?? 0;
  for (const h of state.military.history ?? []) warTours += h.warTours ?? 0;
}

for (const cc of Object.keys(FORCES)) for (let i = 0; i < PER; i++) life(cc, SEED * 100 + i);
if (served < PER * Object.keys(FORCES).length * 0.6) flag(`only ${served} lives served`, 'enlistment');
if (!warTours) flag('no one deployed to a war at home', 'wars');
if (problems.size) {
  for (const [msg, where] of problems) console.log(`  ✘ ${msg}\n      ${String(where).split('\n').join('\n      ')}`);
  console.log(`\n${problems.size} distinct problem(s)`);
  process.exit(1);
}
console.log(`✔ Foreign forces fuzz passed — ${served} of ${PER * Object.keys(FORCES).length} lives served in ${Object.keys(FORCES).length} countries' forces; ${warTours} war tours`);
