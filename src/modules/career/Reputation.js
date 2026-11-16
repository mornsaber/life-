/**
 * Your name in your field: what people in your line of work think of you, beyond your employer.
 * Built by strong years, the top of the calibration curve, finished signature projects and making
 * partner; it fades while you're out of the field. Headhunters call those with a name, offers to
 * them pay more, and they negotiate from strength.
 *
 * state.career.reputation = { [professionId]: 0–100 }
 */
import { clamp } from '../../core/Random.js';

export const reputationOf = (state, professionId = state.career?.job?.professionId) => (professionId ? state.career?.reputation?.[professionId] ?? 0 : 0);
export function addReputation(state, professionId, n) {
  if (!professionId) return 0;
  const r = (state.career.reputation ??= {});
  r[professionId] = Math.round(clamp((r[professionId] ?? 0) + n, 0, 100));
  return r[professionId];
}
export const reputationLabel = (n) => (n >= 80 ? 'A name in the field' : n >= 55 ? 'Well regarded' : n >= 30 ? 'Known around' : n >= 10 ? 'Building a name' : 'Unknown');

/** The year's change: your record, your rating, what you finished; a fade for fields you've left. */
export function reputationYear(state) {
  const job = state.career?.job;
  const r = (state.career.reputation ??= {});
  for (const id of Object.keys(r)) if (id !== job?.professionId) r[id] = Math.max(0, r[id] - 2);
  if (!job) return;
  const perf = job.performance ?? 55;
  let n = perf >= 85 ? 4 : perf >= 70 ? 2 : perf >= 50 ? 1 : -2;
  if (job.calibration?.rating === 'top' && job.calibration.age === state.character.age) n += 2;
  if ((state.career.projectsDone ?? []).some((p) => p.age === state.character.age)) n += 6;
  if (job.upOrOut === 'partner') n += 1;
  if ((job.grade ?? 1) >= 8) n += 1;
  addReputation(state, job.professionId, n);
}
