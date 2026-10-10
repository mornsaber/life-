/**
 * Life inside: what you can do with a year in prison, and death row.
 *
 *   Study       GED, then college by correspondence (Pell grants for
 *               prisoners were restored in 2023): two years earns an
 *               associate degree
 *   Work        prison jobs pay cents an hour but count for parole
 *   Programs    drug treatment / anger management — finishing one can take
 *               up to a year off your sentence (like the federal RDAP)
 *   Visits      family keeps you human (and your relationships alive)
 *   Yard, gang  fitness; a gang means protection, at a price
 *   Appeal      a lawyer (or a pro se brief) asks a higher court to vacate
 *   Parole      a hearing after a third of the sentence; good behavior helps
 *   Escape      almost never works; when it does, you're a fugitive
 *
 * Death row: no parole; appeals, clemency, and — only in states that still
 * carry out executions — an execution date years later.
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { STATES } from '../life/States.js';
import { deathPenaltyIn } from './JusticeSystem.js';

export const APPEAL_COST = 10000;
export const DEATH_ROW_YEARS_BEFORE_EXECUTION = 10;

const once = (ctx, key, message = 'Already done this year.') => {
  if (yearlyCount(ctx.state, key)) {
    ctx.toast(message, 'warn');
    return false;
  }
  bumpYearly(ctx.state, key);
  return true;
};

const goodBehavior = (inc, n) => {
  inc.goodBehavior = Math.max(0, (inc.goodBehavior ?? 0) + n);
};

/** Parole hearings: after a third of the sentence; never on death row or a life term. */
export function paroleEligibility(state) {
  const inc = state.legal.incarceration;
  if (!inc) return { ok: false, reason: 'Not incarcerated' };
  if (inc.deathRow) return { ok: false, reason: 'No parole on death row' };
  if (inc.total >= 25) return { ok: false, reason: 'Life sentence — no parole' };
  const needed = Math.ceil(inc.total / 3);
  if (inc.served < needed) return { ok: false, reason: `Eligible after ${needed} yr served` };
  return { ok: true, chance: clamp(0.2 + (inc.goodBehavior ?? 0) * 0.08 - (inc.gang ? 0.15 : 0), 0.05, 0.85) };
}

export function release(ctx, how) {
  const { state } = ctx;
  state.legal.incarceration = null;
  state.legal.probationYears = Math.max(state.legal.probationYears, 2);
  ctx.log(how, '🔓', 'milestone');
  ctx.toast('Released from prison', 'good');
}

export const PrisonActions = {
  prisonStudy(ctx) {
    const { state, rng } = ctx;
    const inc = state.legal.incarceration;
    if (!inc || !once(ctx, 'prison.study')) return;
    goodBehavior(inc, 1);
    ctx.stat('smarts', rng.int(1, 3));
    if (!state.education.degrees.some((d) => d.type === 'highschool')) {
      if (rng.chance(clamp(0.35 + state.stats.smarts / 150, 0.3, 0.95))) ctx.emit('education:grantDiploma', { type: 'ged', note: 'You earned your GED behind bars. 🎓' });
      else ctx.log('You studied for the GED. Not quite there yet.', '📚');
      return;
    }
    inc.collegeYears = (inc.collegeYears ?? 0) + 1;
    if (inc.collegeYears >= 2 && !state.education.degrees.some((d) => d.type === 'associate' || d.type === 'bachelor')) {
      state.education.degrees.push({ type: 'associate', programId: 'associate', major: 'business', schoolId: 'online', gpa: Math.round(clamp(2.4 + state.stats.smarts / 100 + rng.float(-0.3, 0.3), 2, 4) * 100) / 100, year: state.character.age });
      ctx.log("You earned an associate's degree through the prison education program. 🎓", '🎓', 'milestone');
    } else ctx.log(`You took college courses by correspondence (${inc.collegeYears} yr).`, '📚');
  },

  prisonWork(ctx) {
    const inc = ctx.state.legal.incarceration;
    if (!inc || !once(ctx, 'prison.work')) return;
    ctx.earn(ctx.rng.int(400, 900), 'Prison job wages');
    goodBehavior(inc, 1);
    ctx.log(ctx.rng.pick(['You worked in the prison kitchen for 50 cents an hour.', 'You ran a sewing machine in the prison industries shop.', 'You fought wildfires on an inmate hand crew.', 'You mopped the infirmary floors.']), '🧹');
  },

  prisonProgram(ctx) {
    const { state } = ctx;
    const inc = state.legal.incarceration;
    if (!inc || !once(ctx, 'prison.program')) return;
    goodBehavior(inc, 2);
    ctx.stat('stress', -4);
    ctx.emit('health:treatAddiction', {});
    if (!inc.programDone && inc.yearsLeft > 1 && !inc.deathRow && inc.total < 25) {
      inc.programDone = true;
      inc.yearsLeft -= 1;
      ctx.log('You completed a residential treatment program. A year came off your sentence.', '🧠', 'good');
    } else ctx.log('You kept going to group sessions. It helps.', '🧠');
  },

  prisonVisit(ctx) {
    const { state } = ctx;
    if (!state.legal.incarceration || !once(ctx, 'prison.visit', 'Visiting days are booked up.')) return;
    const family = (state.people?.list ?? []).filter((p) => p.alive && ['mother', 'father', 'spouse', 'child', 'sibling', 'partner'].includes(p.relation));
    if (!family.length) return ctx.log('Nobody came on visiting day.', '🪑', 'warn');
    for (const p of family) p.relationship = Math.min(100, p.relationship + 4);
    ctx.stat('happiness', 6);
    ctx.log(`${family[0].firstName} came to see you on visiting day.`, '🤝', 'good');
  },

  prisonWorkout(ctx) {
    if (!ctx.state.legal.incarceration || !once(ctx, 'prison.workout')) return;
    ctx.stat('fitness', ctx.rng.int(3, 7));
    ctx.stat('health', 2);
    ctx.log('You spent every free hour in the yard working out.', '🏋️');
  },

  prisonGang(ctx) {
    const { state, rng } = ctx;
    const inc = state.legal.incarceration;
    if (!inc || inc.gang || !once(ctx, 'prison.gang')) return;
    inc.gang = true;
    goodBehavior(inc, -2);
    ctx.stat('happiness', 2);
    ctx.log('You joined a prison gang. Nobody messes with you now — but they own you.', '🦂', 'warn');
    if (rng.chance(0.15)) {
      inc.yearsLeft += 1;
      inc.total += 1;
      ctx.log('The gang made you take part in a stabbing. A year was added to your sentence.', '🔪', 'bad');
    }
  },

  prisonAppeal(ctx, mode) {
    const { state, rng } = ctx;
    const inc = state.legal.incarceration;
    if (!inc || !once(ctx, 'prison.appeal', 'Your appeal is already pending.')) return;
    const lawyer = mode !== 'proSe' && ctx.spend(APPEAL_COST, 'Appellate attorney', { credit: true });
    const chance = (lawyer ? 0.08 : 0.025) + (inc.deathRow ? 0.04 : 0);
    if (!rng.chance(chance)) return ctx.log(`The appeals court affirmed your conviction${lawyer ? '' : ' (you filed pro se)'}.`, '⚖️', 'warn');
    const record = [...state.legal.record].reverse().find((r) => /prison|death/.test(r.sentence ?? ''));
    if (record) {
      record.vacated = true;
      record.sealed = true;
    }
    if (inc.deathRow && rng.chance(0.5)) {
      delete inc.deathRow;
      inc.facility = 'a maximum-security prison';
      ctx.log('An appeals court threw out your death sentence. You were resentenced to life.', '⚖️', 'good');
      return;
    }
    release(ctx, 'An appeals court vacated your conviction. You walked out a free person.');
  },

  prisonParole(ctx) {
    const { state, rng } = ctx;
    const check = paroleEligibility(state);
    if (!check.ok) return ctx.toast(check.reason, 'warn');
    if (!once(ctx, 'prison.parole', 'The parole board meets once a year.')) return;
    if (rng.chance(check.chance)) release(ctx, 'The parole board granted your release.');
    else ctx.log('The parole board denied you this year.', '📋', 'warn');
  },

  prisonEscape(ctx) {
    const { state, rng } = ctx;
    const inc = state.legal.incarceration;
    if (!inc || !once(ctx, 'prison.escape')) return;
    if (rng.chance(inc.deathRow ? 0.01 : 0.04)) {
      state.legal.fugitive = { yearsLeft: inc.yearsLeft, deathRow: Boolean(inc.deathRow) };
      state.legal.incarceration = null;
      ctx.emit('legal:offense', { offenseId: 'escape', context: 'escaped from custody', discovery: 0.45, evidence: 0.95, yearsLeft: 99 });
      ctx.log('You escaped. Every marshal in the country has your photo.', '🏃', 'bad');
      ctx.stat('stress', 15);
      return;
    }
    inc.yearsLeft += 2;
    inc.total += 2;
    inc.goodBehavior = 0;
    ctx.stat('health', -rng.int(5, 15));
    state.legal.record.push({ offenseId: 'escape', name: 'Attempted Escape', severity: 'felony', age: state.character.age, sentence: '2 yr added' });
    ctx.log('Guards caught you at the fence. Two years were added to your sentence.', '🚨', 'bad');
  },
};

/** Death row each year: appeals and clemency may spare you; executions only where the state still carries them out. */
export function deathRowTick(ctx) {
  const { state, rng } = ctx;
  const inc = state.legal.incarceration;
  const row = inc.deathRow;
  const years = state.character.age - row.sentencedAge;
  if (rng.chance(0.03)) {
    delete inc.deathRow;
    inc.facility = 'a maximum-security prison';
    ctx.log('A court found errors at your trial. Your death sentence was commuted to life.', '⚖️', 'good');
    return;
  }
  const dp = deathPenaltyIn(row.state);
  const status = dp?.status;
  if (status === 'active' && years >= DEATH_ROW_YEARS_BEFORE_EXECUTION && rng.chance(0.08)) {
    ctx.die(dp.country ? `Executed by ${dp.method} in ${dp.where}` : `Executed by the State of ${STATES[row.state].name}`);
    return;
  }
  ctx.log(`Year ${years} on death row${status === 'active' ? '' : ` (${dp?.where ?? 'the state'} has not carried out an execution in years)`}.`, '⛓️', 'bad');
}

