/**
 * Prison as a place people live, and the years after.
 *
 *   Inside     a yearly event: a new cellmate, contraband, a fight on the tier, a lockdown, a
 *              guard who wants something. Gangs (Prison.js) collect their dues.
 *   Reentry    three years after release: a halfway house or a parole officer, the box on job
 *              applications, the old crew, family who did or didn't wait. Steady years add up;
 *              a man who stays out three years mostly stays out.
 *
 * state.legal.reentry = { since, served, years, steady }
 */
import { clamp } from '../../core/Random.js';
import { randomName } from '../../core/State.js';
import { commitOffense } from '../legal/JusticeSystem.js';
import { priceLevel } from '../world/Countries.js';

const name = (rng) => { const n = randomName(rng, 'male'); return n.firstName; };

const INSIDE = [
  { id: 'cellmate', title: 'A New Cellmate', text: (n) => `${n} moved into your cell. Nineteen, scared, and trying hard not to look it.`, options: [
    { id: 'mentor', label: '🤝 Show him how it works', behavior: 1, happiness: 4 },
    { id: 'ignore', label: '🧱 Mind your own time', stress: -1 },
  ] },
  { id: 'contraband', title: 'A Phone for Sale', text: (n) => `${n} has a smuggled phone. Ten minutes a night with your family — for a price.`, options: [
    { id: 'buy', label: '📱 Buy time on it', cost: 300, happiness: 6, risk: 0.3, behavior: -3 },
    { id: 'refuse', label: '🙅 Wait for the payphone', stress: 2 },
  ] },
  { id: 'fight', title: 'Trouble on the Tier', text: (n) => `${n} has decided you disrespected him in the chow line.`, options: [
    { id: 'fight', label: '👊 Fight — or everyone will try you', health: -8, behavior: -3, respect: true },
    { id: 'guards', label: '🚪 Ask to be moved', behavior: 0, stress: 6 },
    { id: 'talk', label: '🗣️ Talk it down', check: 'smarts' },
  ] },
  { id: 'lockdown', title: 'Lockdown', text: () => 'A stabbing two blocks over: everyone is locked in their cells for three weeks. No yard, no visits, no showers some days.', options: [
    { id: 'read', label: '📖 Read everything you can get', smarts: 2, stress: 4 },
    { id: 'write', label: '✉️ Write letters home', happiness: 3, stress: 3 },
  ] },
  { id: 'guard', title: 'A Guard Wants Something', text: () => 'An officer offers to look the other way on your cell — if you tell him who\'s moving drugs on the block.', options: [
    { id: 'inform', label: '🗣️ Give him a name', behavior: 3, risk: 0.25, snitch: true },
    { id: 'no', label: '🤐 You don\'t know anything', stress: 3 },
  ] },
  { id: 'dues', title: 'Dues', gang: true, text: () => 'The gang wants its share: your commissary, and a package held in your cell.', options: [
    { id: 'pay', label: '💵 Pay and hold it', cost: 200, risk: 0.2, behavior: -2 },
    { id: 'out', label: '🚪 Try to get out of the gang', health: -12, stress: 10, leave: true },
  ] },
];

export function insideTick(ctx) {
  const { state, rng } = ctx;
  const inc = state.legal.incarceration;
  if (!inc || inc.deathRow || inc.kind === 'juvenile' || !rng.chance(0.55)) return;
  const pool = INSIDE.filter((e) => !e.gang || inc.gang);
  const e = rng.pick(pool);
  const who = name(rng);
  ctx.prompt({ type: 'crime.inside', icon: '🔒', title: e.title, text: e.text(who), data: { id: e.id }, options: e.options.map((o) => ({ id: o.id, label: o.label, hint: o.cost ? `$${Math.round(o.cost * priceLevel(state)).toLocaleString()}` : undefined, tone: o.risk ? 'danger' : undefined })) });
}

function resolveInside(ctx, data, optionId) {
  const { state, rng } = ctx;
  const inc = state.legal.incarceration;
  const e = INSIDE.find((x) => x.id === data.id);
  const o = e?.options.find((x) => x.id === optionId);
  if (!inc || !o) return;
  if (o.cost) ctx.spend(Math.round(o.cost * priceLevel(state)), 'Commissary', { allowDebt: true });
  for (const k of ['happiness', 'stress', 'health', 'smarts']) if (o[k]) ctx.stat(k, o[k]);
  if (o.check) {
    const ok = rng.chance(clamp(state.stats.smarts / 120, 0.2, 0.8));
    return ctx.log(ok ? 'You talked him down. People noticed that too.' : 'Talking didn\'t work. You took a beating in the shower block.', '🗣️', ok ? 'good' : 'bad');
  }
  inc.goodBehavior = Math.max(0, (inc.goodBehavior ?? 0) + (o.behavior ?? 0));
  if (o.leave) { inc.gang = false; return ctx.log('You walked away from the gang. They made sure you paid for it, once. Then they let you be.', '🚪', 'warn'); }
  if (o.risk && rng.chance(o.risk)) {
    if (o.snitch) { ctx.stat('health', -rng.int(10, 25)); return ctx.log('Word got around about who talked. You were jumped in the yard.', '🩸', 'bad'); }
    inc.goodBehavior = Math.max(0, (inc.goodBehavior ?? 0) - 3);
    inc.yearsLeft += 1; inc.total += 1;
    return ctx.log('A cell search found it. A disciplinary write-up, solitary, and a year added.', '🚨', 'bad');
  }
  ctx.log({ mentor: 'He made it through his first year. He says it was because of you.', fight: 'You fought. Nobody tried you again — but it\'s in your file.', guards: 'They moved you to another block.', read: 'Three weeks, eleven books.', write: 'Your letters went out every day.', inform: 'The guard kept his word. So far.', buy: 'You heard your kids\' voices every night.', pay: 'You paid. It\'s the cost of protection.' }[optionId] ?? 'You got through it.', '🔒', 'info');
}

/* ------------------------------------------------------------------ */
/* Reentry                                                             */
/* ------------------------------------------------------------------ */

const REENTRY = [
  { id: 'box', title: 'The Box', text: 'Every application asks: "Have you ever been convicted of a felony?"', options: [
    { id: 'honest', label: '☑️ Tick it, and explain at interview', hint: 'Fewer calls; the ones that come are real' },
    { id: 'lie', label: '⬜ Leave it blank', hint: 'Background checks exist', tone: 'danger' },
    { id: 'program', label: '🤝 Go through a reentry employment program', hint: 'Employers who hire people like you' },
  ] },
  { id: 'crew', title: 'The Old Crew', text: (n) => `${n} picked you up from the bus station. He has an easy job lined up — a week's work, a year's money.`, options: [
    { id: 'no', label: '🙅 Not this time. Not any time.' },
    { id: 'yes', label: '💰 One job', tone: 'danger' },
  ] },
  { id: 'officer', title: 'Your Parole Officer', text: 'Check-ins every two weeks, a curfew, drug tests, and permission to change jobs or leave the county.', options: [
    { id: 'comply', label: '📋 Never miss one' },
    { id: 'skip', label: '😤 Skip one for a job interview across the state', hint: 'A violation is a violation', tone: 'danger' },
  ] },
  { id: 'family', title: 'Coming Home', text: 'The people who waited for you have got used to life without you.', options: [
    { id: 'patient', label: '🫶 Take it slowly' },
    { id: 'push', label: '🏃 Try to make up for lost time all at once' },
  ] },
];

export function reentryTick(ctx) {
  const { state, rng } = ctx;
  const r = state.legal.reentry;
  if (!r || state.legal.incarceration) return;
  r.years += 1;
  if (state.career.job) r.steady += 1;
  if (r.years > 3) {
    state.legal.reentry = null;
    ctx.log(r.steady >= 2 ? 'Three years out, with a job and a place to live. The odds say you\'ll stay out now.' : 'Three years out. It has been hard — but you\'re still out.', '🌅', 'milestone');
    ctx.emit('health:trauma', { amount: -6, source: 'rebuilding' });
    return;
  }
  ctx.stat('stress', r.years === 1 ? 6 : 3);
  if (!rng.chance(0.75)) return;
  const pool = REENTRY.filter((e) => (e.id !== 'officer' || state.legal.probationYears > 0) && (e.id !== 'box' || !state.career.job));
  const e = rng.pick(pool);
  ctx.prompt({ type: 'crime.reentry', icon: '🌅', title: e.title, text: `${typeof e.text === 'function' ? e.text(name(rng)) : e.text}\nYear ${r.years} out, after ${r.served} inside.`, data: { id: e.id }, options: e.options });
}

function resolveReentry(ctx, data, optionId) {
  const { state, rng } = ctx;
  const r = state.legal.reentry;
  const family = (state.people?.list ?? []).filter((p) => p.alive && ['mother', 'father', 'spouse', 'child', 'sibling', 'partner'].includes(p.relation));
  switch (`${data.id}:${optionId}`) {
    case 'box:honest': state.legal.flags.reentryHonest = true; return ctx.log('Forty applications, three interviews. One manager said everyone deserves a second chance — and meant it.', '☑️', 'info');
    case 'box:lie': state.legal.flags.liedOnApplication = state.character.age; return ctx.log('You left it blank. If the background check comes back, it\'s fraud on top of the record.', '⬜', 'warn');
    case 'box:program': state.legal.flags.reentryProgram = true; ctx.stat('happiness', 4); return ctx.log('The reentry program set you up with a warehouse that hires people coming home. It\'s a start.', '🤝', 'good');
    case 'crew:no': if (r) r.steady += 1; ctx.stat('stress', 4); return ctx.log('You said no. He shrugged, and drove off.', '🙅', 'good');
    case 'crew:yes': commitOffense(ctx, { offenseId: 'burglary', context: 'a job with the old crew while on parole', discovery: 0.55, evidence: 0.8 }); ctx.earn(Math.round(rng.int(4000, 12000) * priceLevel(state)), 'Cash from a job'); return ctx.log('One job. Everyone says that.', '💰', 'bad');
    case 'officer:comply': state.legal.probationYears = Math.max(0, state.legal.probationYears - 1); return ctx.log('A clean year of check-ins. Your officer recommended early discharge.', '📋', 'good');
    case 'officer:skip':
      if (rng.chance(0.5)) { state.legal.incarceration = { yearsLeft: 1, total: 1, facility: 'the county jail', kind: 'jail', served: 0 }; return ctx.log('A technical violation. Your officer sent you back for a year.', '🚨', 'bad'); }
      return ctx.log('Your officer let it go, with a warning in the file.', '📋', 'warn');
    case 'family:patient': for (const p of family) p.relationship = Math.min(100, (p.relationship ?? 50) + 6); return ctx.log('Slowly, you became part of the house again.', '🫶', 'good');
    case 'family:push': for (const p of family) p.relationship = Math.max(0, (p.relationship ?? 50) + (rng.chance(0.5) ? 5 : -6)); return ctx.log('Some of them were ready. Some weren\'t.', '🏃', 'info');
    default: return undefined;
  }
}

export const PrisonLifeResolvers = { inside: resolveInside, reentry: resolveReentry };
