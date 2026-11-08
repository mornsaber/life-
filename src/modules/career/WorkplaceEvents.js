/**
 * Workplace events for any job: when one comes up, and what each choice does. The events
 * themselves are decks in content/packs/work-events.js (see there for the option fields).
 */
import { pickFresh, eligible } from '../../core/Pools.js';
import { deck } from '../content/decks.js';
import { offenseName } from '../legal/Offenses.js';


/** Signature moments only one kind of job has. */
export const PROFESSION_MOMENTS = deck('work.moments');
/** Everyday events, the ones specific to your field, and the signature moments (content/packs/work-events.js). */
export const WORKPLACE_EVENTS = [...deck('work.everyday'), ...deck('work.field'), ...PROFESSION_MOMENTS];

const sectorWeight = { private: 0.24, federal: 0.12, state: 0.12, municipal: 0.12 };

/** Maybe raise an everyday workplace event this year. */
export function workplaceEvent(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  // Careers with moments of their own (a dentist's terrified patient, a controller's runway incursion) see a few more events.
  const signature = eligible(PROFESSION_MOMENTS, state);
  if (!job || state.prompts.some((p) => p.type === 'career.workEvent') || !rng.chance((sectorWeight[job.sector] ?? 0.2) + (signature.length ? 0.12 : 0))) return;
  const event = (signature.length && rng.chance(0.6) ? pickFresh(rng, state, 'moments', signature) : null) ?? pickFresh(rng, state, 'workplace', eligible(WORKPLACE_EVENTS, state));
  if (!event) return;
  ctx.prompt({
    type: 'career.workEvent',
    icon: '🏢',
    title: event.title,
    text: `${job.employer.name}\n${event.text}`,
    options: event.options.map((o) => ({ id: o.id, label: o.label, tone: o.risky?.offense ? 'danger' : undefined, illegal: o.risky?.offense ? offenseName(o.risky.offense) : undefined })),
    data: { eventId: event.id },
  });
}

export function resolveWorkEvent(ctx, data, optionId) {
  const { state, rng } = ctx;
  const event = WORKPLACE_EVENTS.find((e) => e.id === data.eventId);
  const o = event?.options.find((x) => x.id === optionId);
  if (!o || !state.career.job) return;
  let perf = o.perf ?? 0;
  if (o.check && state.stats[o.check] + rng.int(-15, 15) < 55) {
    perf = -Math.abs(perf || 2);
    ctx.log('It didn\'t land the way you hoped.', '😬', 'warn');
  }
  let { boss = 0, coworkers = 0, money = 0 } = o;
  for (const [k, v] of Object.entries(o.stats ?? {})) ctx.stat(k, v);
  if (o.risky && rng.chance(o.risky.chance)) {
    const r = o.risky;
    ctx.log(r.text, '⚠️', r.money ? 'good' : 'bad');
    perf += r.perf ?? 0;
    boss += r.boss ?? 0;
    money += r.money ?? 0;
    for (const [k, v] of Object.entries(r.stats ?? {})) ctx.stat(k, v);
    if (r.injury) ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(20, 50) });
    if (r.offense) ctx.emit('legal:offense', { offenseId: r.offense, context: event.title.toLowerCase(), caught: true });
  } else ctx.log(`${event.title}: ${o.text ?? `${o.label.replace(/^\S+\s/, '')}.`}`, '🏢');
  if (money > 0) ctx.earn(money, `${event.title} (${state.career.job?.employer.name ?? 'work'})`);
  else if (money < 0) ctx.spend(-money, event.title, { allowDebt: true });
  if (state.career.job) ctx.emit('career:adjust', { performance: perf, boss, coworkers });
}
