/**
 * Shared pieces for the career engines (shift & incident, caseload, book of
 * business, projects, seasons, audience): a record per engine, skill checks,
 * and one vocabulary of effects for the decisions they raise.
 *
 * state.careerLife[engineId] = { professionId, ...engine fields }
 *   reset when you change careers.
 *
 * Effect fields (all optional):
 *   perf      job performance ±          stress / happiness / health   stats ±
 *   money     paid (a bonus, a settlement, a commission)
 *   cost      paid out of pocket
 *   rep       the engine's reputation ±  (0–100)
 *   commend   chance of a commendation   complaint  chance of a complaint
 *   trauma    critical-incident stress   injury     chance of an on-the-job injury
 *   offense   a crime you committed (legal system decides if you're caught)
 *   honor     { id, name, icon } awarded once
 *   fired     you're let go
 */
import { clamp } from '../../../core/Random.js';
import { addHonor } from '../../../core/State.js';
import { offenseName } from '../../legal/Offenses.js';

export const lifeOf = (state, engineId, professionId, init = {}) => {
  state.careerLife ??= {};
  const r = state.careerLife[engineId];
  if (r && r.professionId === professionId) return r;
  state.careerLife[engineId] = { professionId, rep: 50, commendations: 0, complaints: 0, ...structuredClone(init) };
  return state.careerLife[engineId];
};
/** The record without creating one (for views). */
export const peekLife = (state, engineId) => state.careerLife?.[engineId] ?? null;

/** A skill score 0–100 from weighted stats, experience and performance. */
export function skill(state, weights = { smarts: 1 }) {
  const job = state.career.job;
  const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  const stats = Object.entries(weights).reduce((s, [k, w]) => s + (state.stats[k] ?? 50) * w, 0) / total;
  const years = Math.min(15, job?.yearsAtEmployer ?? 0);
  return clamp(stats * 0.7 + years * 1.5 + (job?.performance ?? 50) * 0.15 - (state.stats.stress ?? 30) * 0.1, 0, 100);
}

/** Does a check pass? check: 0–100 difficulty. */
export const passes = (rng, state, check, weights) => check == null || skill(state, weights) + rng.int(-20, 20) >= check;

export function applyFx(ctx, rec, fx, icon = '💼') {
  const { state, rng } = ctx;
  if (!fx) return;
  const job = state.career.job;
  if (fx.text) ctx.log(fx.text, icon, (fx.perf ?? 0) > 0 || (fx.rep ?? 0) > 0 || fx.money ? 'good' : (fx.perf ?? 0) < 0 || (fx.rep ?? 0) < 0 || fx.fired ? 'warn' : undefined);
  if (fx.perf && job) job.performance = Math.round(clamp(job.performance + fx.perf, 0, 100));
  for (const k of ['stress', 'happiness', 'health']) if (fx[k]) ctx.stat(k, fx[k]);
  if (fx.money) ctx.earn(fx.money, fx.moneyLabel ?? 'Bonus', { wage: true });
  if (fx.cost) ctx.spend(fx.cost, fx.costLabel ?? 'Out of pocket', { allowDebt: true });
  if (fx.rep && rec) rec.rep = Math.round(clamp((rec.rep ?? 50) + fx.rep, 0, 100));
  if (fx.commend && rng.chance(fx.commend) && rec) { rec.commendations += 1; ctx.log('You were commended for it.', '📜', 'good'); }
  if (fx.complaint && rng.chance(fx.complaint) && rec) { rec.complaints += 1; ctx.log('A complaint was filed against you.', '📄', 'warn'); }
  if (fx.trauma) ctx.emit('health:trauma', { amount: fx.trauma, source: 'a critical incident at work' });
  if (fx.injury && rng.chance(fx.injury)) ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(15, 45) });
  if (fx.offense) ctx.emit('legal:offense', { offenseId: fx.offense, context: fx.offenseContext ?? 'misconduct at work', discovery: fx.discovery ?? 0.3, evidence: 0.6 });
  if (fx.honor && !state.honors.some((h) => h.id === fx.honor.id)) {
    addHonor(state, { source: 'civil', precedence: 50, prestige: 5, citation: fx.honor.citation ?? fx.honor.name, ...fx.honor });
    ctx.log(`${fx.honor.icon ?? '🏅'} ${fx.honor.name}.`, fx.honor.icon ?? '🏅', 'honor');
  }
  if (fx.fired && job) ctx.emit('career:resign', { reason: fx.fired, fired: true });
}

/** Resolve a decision option: a check picks the success or `fail` branch; `risk` may follow success. */
export function resolveOption(ctx, rec, option, icon, weights) {
  const { state, rng } = ctx;
  if (!option) return;
  const ok = passes(rng, state, option.check, option.weights ?? weights);
  const fx = ok ? option : option.fail ?? option;
  applyFx(ctx, rec, fx, icon);
  if (ok && option.risk && rng.chance(option.risk.chance)) applyFx(ctx, rec, option.risk, icon);
  return ok;
}

/** Prompt options from a decision's options (keeps hidden fields out of the prompt). */
export const promptOptions = (options) => options.map(({ id, label, hint, tone, offense }) => ({ id, label, ...(hint ? { hint } : {}), ...(tone ? { tone } : {}), ...(offense ? { illegal: offenseName(offense) } : {}) }));
