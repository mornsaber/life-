/**
 * Special operations: volunteer for a selection course, survive it phase by
 * phase (or ring the bell), then serve in a special operations unit with
 * special-duty pay, more deployments and pipeline-specific missions.
 *
 * state.military.selection = { pipeline, phase, track } while you're in a course.
 * svc.sof = sofRecord(...) once you graduate; svc.selectionAttempts[pipeline]
 * counts tries (two per pipeline).
 */
import { clamp } from '../../core/Random.js';
import { bumpYearly, yearlyCount } from '../../core/State.js';
import { PIPELINES, MOS_PIPELINE, sofRecord } from './SpecialOpsCatalog.js';
import { MOS } from './MOS.js';
import { awardForAction, awardMedal } from './MedalEngine.js';
import { grantCredential, hasCredential } from '../credentials/LicensingEngine.js';
import { hasClearance, CLEARANCES } from '../publicservice/PublicServiceEngine.js';

export { PIPELINES };
export const MAX_ATTEMPTS = 2;

/** Grit: the mental side of selection. */
export const grit = (state) => state.stats.smarts * 0.4 + state.stats.happiness * 0.3 + (100 - state.stats.stress) * 0.3;

/** Pass chance for one phase, before effort. */
export function phaseOdds(state, phase) {
  return clamp(phase.base + phase.physical * (state.stats.fitness - 75) / 120 + phase.mental * (grit(state) - 65) / 120, 0.08, 0.96);
}

/** Overall odds of finishing the course (shown to the player). */
export function courseOdds(state, pipelineId) {
  return PIPELINES[pipelineId].phases.reduce((p, ph) => p * phaseOdds(state, ph), 1);
}

export function pipelinesFor(svc) {
  return Object.entries(PIPELINES).filter(([, p]) => p.branches.includes(svc.branch) && p.tracks.includes(svc.track)).map(([id]) => id);
}

export function selectionEligibility(state, pipelineId) {
  const svc = state.military.service;
  const p = PIPELINES[pipelineId];
  if (!svc || !p) return { ok: false, reason: 'Not serving' };
  if (!p.branches.includes(svc.branch) || !p.tracks.includes(svc.track)) return { ok: false, reason: 'Not open to your branch or track' };
  if (svc.sof) return { ok: false, reason: `Already serving with the ${svc.sof.unitName}` };
  if (svc.isNew) return { ok: false, reason: 'Finish initial training first' };
  if (svc.component !== 'active' && !p.allowReserve) return { ok: false, reason: 'Active duty only' };
  if (state.military.selection) return { ok: false, reason: 'Already in a selection course' };
  if ((svc.selectionAttempts?.[pipelineId] ?? 0) >= MAX_ATTEMPTS) return { ok: false, reason: `Two attempts used` };
  const [lo, hi] = p.grades[svc.track];
  if (svc.grade < lo) return { ok: false, reason: `Rank ${svc.track === 'officer' ? 'O' : 'E'}-${lo + 1} or above` };
  if (svc.grade > hi) return { ok: false, reason: 'Too senior for the pipeline' };
  if (state.character.age > p.maxAge) return { ok: false, reason: `Age ${p.maxAge} or under` };
  if (state.stats.fitness < p.minFitness) return { ok: false, reason: `Needs ${p.minFitness}+ fitness` };
  if (p.minSmarts && state.stats.smarts < p.minSmarts) return { ok: false, reason: `Needs ${p.minSmarts}+ smarts` };
  if (state.stats.health < 60) return { ok: false, reason: 'Fails the dive/flight physical' };
  if (svc.disciplinary > 1) return { ok: false, reason: 'Disciplinary record' };
  if (p.clearance && !hasClearance(state, p.clearance)) return { ok: false, reason: `Needs a ${CLEARANCES[p.clearance].name} clearance` };
  if (yearlyCount(state, 'military.selection')) return { ok: false, reason: 'One course a year' };
  return { ok: true };
}

function phasePrompt(ctx, sel) {
  const p = PIPELINES[sel.pipeline];
  const phase = p.phases[sel.phase];
  const odds = phaseOdds(ctx.state, phase);
  ctx.prompt({
    type: 'military.selectionPhase',
    icon: p.icon,
    title: `${p.name} Selection: ${phase.name} (${sel.phase + 1}/${p.phases.length})`,
    text: `${phase.text}\n${phase.physical >= phase.mental ? 'Mostly a test of your body.' : 'Mostly a test of your mind.'} Your odds here: about ${Math.round(odds * 100)}%.`,
    options: [
      { id: 'all', label: '🔥 Give it everything', hint: 'Better odds, risk of injury' },
      { id: 'pace', label: '🧠 Pace yourself and stay healthy', hint: 'Slightly lower odds' },
      { id: 'quit', label: '🔔 Ring the bell (quit)', hint: 'Drop on request', tone: 'danger' },
    ],
    data: { pipeline: sel.pipeline, phase: sel.phase },
  });
}

/** Volunteer: the course starts now and runs as a chain of phase prompts. */
export function volunteer(ctx, pipelineId) {
  const { state } = ctx;
  const check = selectionEligibility(state, pipelineId);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  const svc = state.military.service;
  bumpYearly(state, 'military.selection');
  svc.selectionAttempts = { ...svc.selectionAttempts, [pipelineId]: (svc.selectionAttempts?.[pipelineId] ?? 0) + 1 };
  const sel = { pipeline: pipelineId, phase: 0 };
  state.military.selection = sel;
  ctx.log(`You volunteered for ${PIPELINES[pipelineId].course}.`, PIPELINES[pipelineId].icon, 'military');
  phasePrompt(ctx, sel);
}

function washOut(ctx, pipelineId, phaseName, why) {
  const { state } = ctx;
  const svc = state.military.service;
  state.military.selection = null;
  ctx.stat('happiness', -6);
  const left = MAX_ATTEMPTS - (svc?.selectionAttempts?.[pipelineId] ?? 0);
  ctx.log(`${why} You were returned to your old unit. ${left > 0 ? 'You can try again next year.' : 'That was your last chance.'}`, '🥾', 'warn');
  if (svc) svc.eval = Math.max(0, svc.eval - (why.startsWith('You rang') ? 6 : 0));
  ctx.toast(`Washed out at ${phaseName}`, 'bad');
}

/** You made it: new unit, new job, special pay. */
export function graduate(ctx, svc, pipelineId) {
  const { state } = ctx;
  const p = PIPELINES[pipelineId];
  state.military.selection = null;
  svc.sof = sofRecord(pipelineId, state.character.age);
  const mos = p.mos?.[svc.track];
  if (mos && MOS[mos]) svc.mos = mos;
  else if (MOS[mos?.replace('army.', 'guard.')]) svc.mos = mos.replace('army.', 'guard.');
  svc.specialty = p.specialty ?? svc.specialty;
  svc.eval = Math.min(100, svc.eval + 10);
  ctx.stat('happiness', 10);
  for (const id of p.grants ?? []) if (!hasCredential(state, id)) grantCredential(ctx, id, { sponsor: 'military', silent: true });
  ctx.log(`You earned the ${p.badge} and reported to the ${p.unitName}. Most of the people who started with you didn't make it.`, p.icon, 'milestone');
  ctx.toast(`${p.name}: selected!`, 'good');
}

/** Old-style selection at enlistment (18X, SO, 1Z2, 0372): passing makes you an operator. */
export function tagInitialPipeline(ctx, svc) {
  const id = MOS_PIPELINE[svc.mos];
  if (id && !svc.sof) svc.sof = sofRecord(id, ctx.state.character.age);
}

/** A year as an operator: pipeline missions, aging out, and getting hurt out. */
export function sofTick(ctx, svc) {
  const { state, rng } = ctx;
  if (!svc.sof) return;
  const p = PIPELINES[svc.sof.pipeline];
  if (!p) { svc.sof = null; return; }
  // Bodies wear out: operators rotate to conventional or instructor billets.
  if (state.stats.fitness < 40 || state.stats.health < 40 || (state.character.age >= 45 && !p.mental)) {
    leaveSof(ctx, svc, state.character.age >= 45 ? 'You rotated out of the teams to train the next generation.' : 'Your body couldn\'t keep up any more. You were reassigned to a conventional unit.');
    return;
  }
  ctx.stat('fitness', rng.int(1, 3));
  if (svc.component !== 'active' || !rng.chance(0.5)) return;
  const m = rng.pick(p.missions);
  ctx.prompt({
    type: 'military.sofMission',
    icon: p.icon,
    title: `${p.name}: ${m.title}`,
    text: m.text,
    options: m.options.map((o) => ({ id: o.id, label: o.label, hint: o.risk >= 0.6 ? 'High risk' : o.risk >= 0.3 ? 'Moderate risk' : 'Low risk', tone: o.risk >= 0.7 ? 'danger' : undefined })),
    data: { pipeline: svc.sof.pipeline, title: m.title },
  });
}

export function leaveSof(ctx, svc, text) {
  svc.sofFormer = svc.sof.pipeline;
  svc.sof = null;
  ctx.log(text, '🔁', 'military');
}

export const SpecialOpsActions = {
  volunteerSelection(ctx, pipelineId) {
    volunteer(ctx, pipelineId);
  },
  leaveSof(ctx) {
    const svc = ctx.state.military.service;
    if (!svc?.sof) return ctx.toast('You\'re not in a special operations unit.', 'warn');
    leaveSof(ctx, svc, `You asked to leave the ${svc.sof.unitName} and went back to a conventional unit.`);
  },
};

export const SpecialOpsResolvers = {
  selectionPhase(ctx, data, optionId) {
    const { state, rng } = ctx;
    const svc = state.military.service;
    const sel = state.military.selection;
    if (!svc || !sel || sel.pipeline !== data.pipeline || sel.phase !== data.phase) { state.military.selection = null; return; }
    const p = PIPELINES[sel.pipeline];
    const phase = p.phases[sel.phase];
    if (optionId === 'quit') return washOut(ctx, sel.pipeline, phase.name, `You rang the bell during ${phase.name}.`);
    let odds = phaseOdds(state, phase) + (optionId === 'all' ? 0.08 : -0.04);
    ctx.stat('stress', 4);
    ctx.stat('fitness', rng.int(1, 3));
    if (optionId === 'all' && phase.physical > 0.3 && rng.chance(0.12)) {
      ctx.emit('health:injury', { conditionId: rng.pick(['backInjury', 'arthritis']), severity: rng.int(20, 45), serviceConnected: true });
      ctx.stat('health', -rng.int(5, 12));
      odds -= 0.25;
      ctx.log(`You got hurt in ${phase.name} and kept going on it.`, '🩹', 'warn');
    }
    if (!rng.chance(clamp(odds, 0.05, 0.97))) return washOut(ctx, sel.pipeline, phase.name, `You were dropped during ${phase.name}.`);
    sel.phase += 1;
    if (sel.phase >= p.phases.length) return graduate(ctx, svc, sel.pipeline);
    ctx.log(`You made it through ${phase.name}.`, p.icon, 'military');
    phasePrompt(ctx, sel);
  },

  sofMission(ctx, data, optionId) {
    const { state, rng } = ctx;
    const svc = state.military.service;
    if (!svc?.sof || svc.sof.pipeline !== data.pipeline) return;
    const p = PIPELINES[data.pipeline];
    const m = p.missions.find((x) => x.title === data.title);
    const o = m?.options.find((x) => x.id === optionId);
    if (!o) return;
    svc.sof.missions += 1;
    const success = rng.chance(clamp(o.success + (state.stats.fitness - 60) / 300 + (state.stats.smarts - 55) / (p.mental ? 150 : 400), 0.05, 0.97));
    const wounded = o.risk > 0 && rng.chance(o.risk * (success ? 0.15 : 0.35));
    svc.eval = Math.round(clamp(svc.eval + (success ? o.eval : -3), 0, 100));
    ctx.stat('stress', o.risk > 0 ? 6 : 3);
    if (success) ctx.log(`${m.title}: the mission succeeded.`, p.icon, 'good');
    else ctx.log(`${m.title}: it went wrong, and the after-action review was long.`, p.icon, 'bad');
    if (o.risk > 0) ctx.emit('health:trauma', { amount: success ? 10 : 18, source: 'combat' });
    if (wounded) {
      svc.wounds += 1;
      ctx.stat('health', -rng.int(10, 25));
      ctx.emit('health:injury', { conditionId: rng.pick(['backInjury', 'tbi']), severity: rng.int(30, 65), serviceConnected: true });
      ctx.log('You were wounded on the mission.', '🩸', 'bad');
    }
    if (o.valor) awardForAction(ctx, svc, { valor: o.valor * (success ? 1 : 0.6) + rng.int(-6, 6) + (wounded ? 8 : 0), wounded, success, title: `${m.title} (${p.unitName})` });
    else if (success && rng.chance(0.25)) awardMedal(ctx, 'commendation', { branch: svc.branch, citation: `${m.title} — ${p.unitName}.` });
  },
};
