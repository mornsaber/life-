/**
 * Scenes: the calls you remember, played step by step. A scene is a short chain of decisions —
 * arrive, act, deal with what goes wrong, face the aftermath — where every choice moves four
 * scores and some depend on a skill check (your skills, stats and, for responders, how much your
 * partner trusts you). The last step closes the scene: lives saved or lost, your crew's safety,
 * the damage, and public trust decide the outcome — commendations or an inquiry, injuries,
 * trauma, the news, and how you're seen at work.
 *
 *   scores  lives  people saved (or lost)
 *           crew   your crew's and your own safety
 *           city   property and the wider damage
 *           trust  what the public, the press and your bosses make of it
 *
 * Scenes are content (content/packs/scenes-emergency.js); this module plays them.
 *
 * state.scene = { id, step, score: { lives, crew, city, trust }, flags: [], data, startedAge } | null
 * state.careerLife.partner = { name, trust, since, professionId } — your partner or crew mate
 */
import { clamp } from '../../core/Random.js';
import { addHonor, randomName } from '../../core/State.js';
import { skill } from '../life/Skills.js';
import { rep } from '../life/Reputation.js';
import { SCENES, UNITS } from '../content/packs/scenes-emergency.js';

export { SCENES, UNITS };
const DIMS = ['lives', 'crew', 'city', 'trust'];
const sceneOf = (state) => state.scene ?? null;

/** Your partner on the job (created the first time you need one). */
export function partnerOf(state, rng) {
  const job = state.career?.job;
  if (!job) return null;
  const cl = (state.careerLife ??= {});
  if (cl.partner && cl.partner.professionId === job.professionId) return cl.partner;
  if (!rng) return null;
  const n = randomName(rng, rng.chance(0.5) ? 'male' : 'female');
  cl.partner = { name: `${n.firstName} ${n.lastName}`, first: n.firstName, trust: 50, since: state.character.age, professionId: job.professionId, scenes: 0 };
  return cl.partner;
}

/** The odds a check passes: skills and stats against the bar, nudged by your partner's trust. */
export function checkOdds(state, check = {}) {
  const sk = (check.skills ?? []).reduce((s, id) => s + skill(state, id), 0) / Math.max(1, (check.skills ?? []).length);
  const st = Object.entries(check.stats ?? {}).reduce((s, [k, w]) => s + (state.stats[k] ?? 50) * w, 0) / Math.max(1, Object.values(check.stats ?? {}).reduce((a, b) => a + b, 0));
  const parts = [check.skills?.length ? sk : null, check.stats ? st : null].filter((x) => x != null);
  const ability = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 50;
  const partner = state.careerLife?.partner ? (state.careerLife.partner.trust - 50) / 5 : 0;
  return clamp(0.5 + (ability + partner - (check.bar ?? 50)) / 70, 0.08, 0.92);
}

const fill = (t, data, state) => String(typeof t === 'function' ? t(data, state) : t ?? '')
  .replace(/\{partner\}/g, state.careerLife?.partner?.first ?? 'your partner')
  .replace(/\{place\}/g, data.place ?? 'the scene').replace(/\{name\}/g, data.name ?? 'it')
  .replace(/^./, (c) => c.toUpperCase());

function promptStep(ctx, def, stepId) {
  const { state } = ctx;
  const sc = sceneOf(state);
  const step = def.steps[stepId];
  sc.step = stepId;
  const options = step.options.filter((o) => !o.when || o.when(state, sc)).map((o) => ({ id: o.id, label: fill(o.label, sc.data, state), ...(o.hint ? { hint: fill(o.hint, sc.data, state) } : {}), ...(o.tone ? { tone: o.tone } : {}) }));
  ctx.prompt({ type: 'scenes.step', icon: step.icon ?? def.icon, title: `${def.title}${def.stepTitles === false ? '' : ` — ${step.title}`}`, text: fill(step.text, sc.data, state), options, data: { sceneId: def.id, step: stepId } });
}

/** Start a scene (if none is running). data: anything the text needs ({ name, place, severity }). */
export function startScene(ctx, id, data = {}) {
  const { state } = ctx;
  const def = SCENES[id];
  if (!def || sceneOf(state) || state.prompts.some((p) => p.type === 'scenes.step')) return false;
  if (def.partner) partnerOf(state, ctx.rng);
  state.scene = { id, step: null, score: Object.fromEntries(DIMS.map((d) => [d, 0])), flags: [], data: { severity: 2, ...(def.data?.(state, ctx.rng) ?? {}), ...data }, startedAge: state.character.age };
  promptStep(ctx, def, def.start ?? 'start');
  return true;
}

function bump(score, fx = {}) { for (const d of DIMS) if (fx[d]) score[d] += fx[d]; }

/** The outcome tier from the scores. */
export function tierOf(score, severity = 2) {
  const total = score.lives * 2 + score.crew * 1.5 + score.city + score.trust - (severity - 2);
  return total >= 6 ? 'outstanding' : total >= 2 ? 'good' : total >= -2 ? 'mixed' : 'bad';
}

function finish(ctx) {
  const { state, rng } = ctx;
  const sc = sceneOf(state);
  const def = SCENES[sc.id];
  state.scene = null;
  if (!def) return;
  const job = state.career.job;
  const tier = tierOf(sc.score, sc.data.severity);
  const o = def.outcome?.(sc, tier, state) ?? {};
  const text = fill(o.text ?? def.tiers?.[tier] ?? '', sc.data, state);
  const perf = { outstanding: 10, good: 5, mixed: -1, bad: -8 }[tier];
  if (job) job.performance = Math.round(clamp((job.performance ?? 50) + perf, 0, 100));
  rep(ctx, def.circle ?? 'work', { outstanding: 6, good: 3, mixed: 0, bad: -6 }[tier], def.title);
  // What it costs you: trauma always, injury when the crew score went badly.
  ctx.emit('health:trauma', { amount: (def.trauma ?? 6) + (tier === 'bad' ? 6 : 0), source: def.title.toLowerCase() });
  if (sc.score.crew <= -2 && rng.chance(0.5)) ctx.emit('health:injury', { conditionId: def.injury ?? 'backInjury', severity: rng.int(20, 50) });
  ctx.stat('stress', tier === 'bad' ? 10 : 5);
  ctx.stat('happiness', { outstanding: 6, good: 3, mixed: -1, bad: -5 }[tier]);
  // Your partner remembers how it went.
  const p = state.careerLife?.partner;
  if (p && def.partner) {
    p.scenes = (p.scenes ?? 0) + 1;
    p.trust = Math.round(clamp(p.trust + ({ outstanding: 8, good: 4, mixed: 0, bad: -6 }[tier]) + (sc.flags.includes('leftPartner') ? -12 : 0) + (sc.flags.includes('coveredPartner') ? 8 : 0), 0, 100));
  }
  // Honours and inquiries.
  if (tier === 'outstanding' && rng.chance(def.honorChance ?? 0.6)) {
    const name = def.honor ?? 'Commendation';
    const id = `scene.${sc.id}.${state.character.age}`;
    addHonor(state, { id, source: 'civil', name: `${name} — ${def.title}`, icon: '🎖️', prestige: 3, precedence: 55, citation: text });
  }
  if (tier === 'bad' && def.inquiry !== false) {
    ctx.log(`${def.inquiryText ?? 'There will be a review of how it was handled.'}`, '🔍', 'warn');
    if (job) job.warnings = (job.warnings ?? 0) + (sc.flags.includes('misconduct') ? 2 : 1);
  }
  const headline = typeof def.news === 'string' ? def.news : def.news?.[tier];
  if (headline && (tier === 'outstanding' || tier === 'bad')) ctx.emit('news:story', { tier: 'local', headline: fill(headline, sc.data, state), weight: 4, icon: def.icon, you: true });
  if (o.rep) rep(ctx, def.circle ?? 'work', o.rep, def.title);
  o.effects?.(ctx, sc, tier);
  ctx.log(text, def.icon, { outstanding: 'milestone', good: 'good', mixed: 'info', bad: 'bad' }[tier]);
  ((state.careerLife ??= {}).scenes ??= []).unshift({ age: state.character.age, id: sc.id, title: def.title, tier });
  state.careerLife.scenes.splice(12);
}

/** A record of good calls brings an offer from a specialist unit (SWAT, K9, hazmat, technical rescue, flight medic). */
function unitOffer(ctx) {
  const { state, rng } = ctx;
  const job = state.career?.job;
  const cl = state.careerLife;
  if (!job || !cl || cl.unit || state.prompts.some((p) => p.type === 'scenes.unit')) return;
  const units = Object.entries(UNITS).filter(([, u]) => u.for(state, job));
  if (!units.length) return;
  const good = (cl.scenes ?? []).filter((s) => s.tier === 'outstanding' || s.tier === 'good').length;
  if (good < 3 || (cl.unitAsked != null && state.character.age - cl.unitAsked < 4) || !rng.chance(0.4)) return;
  cl.unitAsked = state.character.age;
  ctx.prompt({ type: 'scenes.unit', icon: '🎖️', title: 'A Specialist Unit', text: 'Your record on the calls has been noticed. The specialist units have openings, and they want you to try out.', options: [
    ...units.map(([id, u]) => ({ id, label: `${u.icon} ${u.name}`, hint: u.hint })),
    { id: 'stay', label: '🙂 Stay where you are' },
  ], data: {} });
}

/** Partners move on: a soured partnership ends in a transfer; a long one, sometimes, in a promotion. */
function partnerTurnover(ctx) {
  const { state, rng } = ctx;
  const p = state.careerLife?.partner;
  if (!p) return;
  const years = state.character.age - p.since;
  if (p.trust < 20) {
    ctx.log(`${p.name} put in for a transfer. Nobody needed to ask why.`, '🔁', 'warn');
    state.careerLife.partner = null;
  } else if (years >= 4 && rng.chance(0.08)) {
    const why = p.trust >= 70 ? `${p.first} made rank and moved to another station. They still ring you before every big call.` : `${p.first} transferred to another unit. You'll ride with someone new.`;
    ctx.log(why, '🔁', 'info');
    state.careerLife.partner = null;
  }
}

export const ScenesModule = {
  id: 'scenes',
  order: 30.8,

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    // A scene left hanging (a reload drops prompts): close it on what was decided.
    if (sceneOf(state) && !state.prompts.some((p) => p.type === 'scenes.step')) finish(ctx);
    const job = state.career?.job ?? null;
    if (sceneOf(state)) return;
    const inside = Boolean(state.legal?.incarceration);
    if (job) partnerTurnover(ctx);
    unitOffer(ctx);
    // Most scenes are a job's; some are service in uniform (noJob) or life inside (inPrison).
    let pool = Object.values(SCENES).filter((s) => s.trigger !== 'manual' && Boolean(s.inPrison) === inside && (job || s.noJob || s.inPrison) && s.for?.(state, job));
    if (!pool.length || !rng.chance(Math.max(...pool.map((s) => s.chance ?? 0.35)))) return;
    // Not the same call two years running.
    const last = state.careerLife?.scenes?.[0];
    if (pool.length > 1 && last?.age >= state.character.age - 1) pool = pool.filter((s) => s.id !== last.id);
    let r = rng.next() * pool.reduce((a, s) => a + (s.weight ?? 1), 0);
    const def = pool.find((s) => (r -= s.weight ?? 1) < 0) ?? pool[pool.length - 1];
    startScene(ctx, def.id);
  },

  resolvers: {
    unit(ctx, data, optionId) {
      const { state, rng } = ctx;
      const u = UNITS[optionId];
      if (!u) return void ctx.log('You stayed with your crew. Somebody has to answer the ordinary calls.', '🙂');
      const odds = checkOdds(state, u.selection);
      if (!rng.chance(odds)) return void ctx.log(`You tried out for ${u.name} and didn't make the cut. You can try again in a few years.`, u.icon, 'warn');
      state.careerLife.unit = { id: optionId, since: state.character.age };
      const job = state.career.job;
      if (job) job.salary = Math.round(job.salary * 1.06);
      ctx.log(`You passed selection and joined ${u.name}. ${u.joined}`, u.icon, 'milestone');
    },
    step(ctx, data, optionId) {
      const { state, rng } = ctx;
      const sc = sceneOf(state);
      const def = SCENES[data.sceneId];
      if (!sc || !def || sc.id !== data.sceneId) return;
      const step = def.steps[data.step];
      const o = step?.options.find((x) => x.id === optionId);
      if (!o) return void finish(ctx);
      bump(sc.score, o.score);
      if (o.flag) sc.flags.push(o.flag);
      let line = o.text;
      let next = o.next;
      if (o.check) {
        const pass = rng.chance(checkOdds(state, o.check));
        const branch = pass ? o.pass ?? {} : o.fail ?? {};
        bump(sc.score, branch.score);
        if (branch.flag) sc.flags.push(branch.flag);
        line = branch.text ?? line;
        next = branch.next ?? next;
      }
      if (line) ctx.log(fill(line, sc.data, state), step.icon ?? def.icon, 'info');
      // A complication slot: one of the scene's complications, picked for this run.
      if (next === 'complication' && def.complications) {
        const pick = rng.pick(Object.keys(def.complications));
        def.steps[`complication:${pick}`] ??= def.complications[pick];
        next = `complication:${pick}`;
      }
      if (next && def.steps[next]) promptStep(ctx, def, next);
      else finish(ctx);
    },
  },
};
