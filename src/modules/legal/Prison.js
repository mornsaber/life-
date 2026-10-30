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
import { OFFENSES } from './Offenses.js';

export const APPEAL_COST = 10000;

export const PRISON_JOBS = {
  kitchen: { label: 'Kitchen', icon: '🍳', pay: [300, 600], lines: ['You worked the 4 a.m. breakfast line in the kitchen.', 'You ran the steam trays in the kitchen.'] },
  laundry: { label: 'Laundry', icon: '🧺', pay: [250, 500], lines: ['You folded sheets in the laundry until your hands cracked.'] },
  library: { label: 'Law library clerk', icon: '📚', pay: [250, 450], stats: { smarts: 2 }, lines: ['You clerked in the law library, helping men write their own appeals.', 'You shelved books and read most of them.'], needs: (s) => (s.education.degrees.some((d) => d.type === 'highschool' || d.type === 'ged') ? null : 'Needs a diploma or GED') },
  industries: { label: 'Prison industries', icon: '🪚', pay: [600, 1400], lines: ['You built office furniture for government agencies in the industries shop.', 'You ran a CNC machine in prison industries — a real trade.'] },
  fireCrew: { label: 'Fire crew', icon: '🔥', pay: [900, 1800], behavior: 2, stats: { fitness: 4, stress: 4 }, lines: ['You cut fire line on an inmate hand crew for a dollar an hour and a day off your sentence for each one served.', 'Your crew held a ridge for three days while the fire went around you.'], needs: (s) => (['state', 'jail', 'private'].includes(s.legal.incarceration?.kind) && (s.legal.incarceration?.goodBehavior ?? 0) >= 3 && !OFFENSE_VIOLENT(s) ? null : 'Minimum custody, good behavior, no violent conviction') },
};
const OFFENSE_VIOLENT = (state) => state.legal.record.some((r) => OFFENSES[r.offenseId]?.violent);
export const prisonJobBlock = (state, id) => PRISON_JOBS[id]?.needs?.(state) ?? null;
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

/** Out: three years of rebuilding (crime/PrisonLife.js reentryTick). */
export function startReentry(state, served) {
  if (served < 1) return;
  state.legal.reentry = { since: state.character.age, served, years: 0, steady: 0 };
}

export function release(ctx, how) {
  const { state } = ctx;
  const served = state.legal.incarceration?.served ?? 0;
  state.legal.incarceration = null;
  state.legal.probationYears = Math.max(state.legal.probationYears, 2);
  startReentry(state, served);
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

  /** Arg: a prison job id. The same job year after year builds seniority, pay and trust. */
  prisonWork(ctx, jobId) {
    const { state, rng } = ctx;
    const inc = state.legal.incarceration;
    if (!inc) return;
    const job = PRISON_JOBS[jobId] ?? PRISON_JOBS[inc.job] ?? PRISON_JOBS.kitchen;
    const id = Object.keys(PRISON_JOBS).find((k) => PRISON_JOBS[k] === job);
    const why = prisonJobBlock(state, id);
    if (why) return ctx.toast(why, 'warn');
    if (!once(ctx, 'prison.work')) return;
    if (inc.job !== id) { inc.job = id; inc.jobYears = 0; }
    inc.jobYears = (inc.jobYears ?? 0) + 1;
    ctx.earn(Math.round(rng.int(...job.pay) * (1 + Math.min(4, inc.jobYears) * 0.15)), 'Prison job wages');
    goodBehavior(inc, job.behavior ?? 1);
    for (const [k, v] of Object.entries(job.stats ?? {})) ctx.stat(k, v);
    if (id === 'fireCrew') state.legal.flags.fireCrewYears = (state.legal.flags.fireCrewYears ?? 0) + 1;
    if (id === 'industries' && inc.jobYears >= 3) state.legal.flags.prisonTrade = true;
    if (!inc.trusty && inc.jobYears >= 2 && (inc.goodBehavior ?? 0) >= 5 && !inc.gang) {
      inc.trusty = true;
      return ctx.log('Two clean years on the same job: you were made a trusty. Fewer pat-downs, more freedom of movement, a better word at your parole hearing.', '🗝️', 'good');
    }
    ctx.log(rng.pick(job.lines), job.icon);
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

  /** The hearing itself is a prompt: what you say, and what you can show you'll walk out to. */
  prisonParole(ctx) {
    const { state } = ctx;
    const check = paroleEligibility(state);
    if (!check.ok) return ctx.toast(check.reason, 'warn');
    if (!once(ctx, 'prison.parole', 'The parole board meets once a year.')) return;
    const inc = state.legal.incarceration;
    const plan = releasePlan(state);
    ctx.prompt({
      type: 'legal.paroleHearing', icon: '📋', title: 'Parole Hearing',
      text: `Three board members, your file, and ten minutes.${inc.trusty ? ' Your trusty status is in the file.' : ''}${victimOpposes(state) ? ' The victim has written to oppose your release.' : ''}
Release plan: ${plan.text}.`,
      data: { chance: check.chance },
      options: [
        { id: 'remorse', label: '🙇 Take responsibility, in your own words', hint: 'Boards want insight' },
        { id: 'plan', label: '🗂️ Lead with your release plan', hint: plan.score ? 'A job, a home, people waiting' : 'You don\'t have much of one' },
        { id: 'innocent', label: '✋ Maintain your innocence', hint: 'Honest, maybe — and boards rarely release people who do' },
      ],
    });
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


/** What's waiting outside: family who'll take you in, a trade, an education. */
export function releasePlan(state) {
  const family = (state.people?.list ?? []).some((p) => p.alive && ['mother', 'father', 'spouse', 'sibling', 'partner'].includes(p.relation) && (p.relationship ?? 0) >= 50);
  const trade = state.legal.flags.prisonTrade || state.legal.flags.fireCrewYears;
  const study = (state.legal.incarceration?.collegeYears ?? 0) >= 1;
  const parts = [family && 'family to live with', trade && 'a trade learned inside', study && 'college credits'].filter(Boolean);
  return { score: parts.length, text: parts.length ? parts.join(', ') : 'nowhere to go yet' };
}
const victimOpposes = (state) => {
  const r = [...state.legal.record].reverse().find((x) => /prison/.test(x.sentence ?? ''));
  return Boolean(r && OFFENSES[r.offenseId]?.violent);
};

export const PrisonResolvers = {
  paroleHearing(ctx, data, optionId) {
    const { state, rng } = ctx;
    const inc = state.legal.incarceration;
    if (!inc) return;
    const plan = releasePlan(state);
    let chance = data.chance + (inc.trusty ? 0.1 : 0) - (victimOpposes(state) ? 0.1 : 0);
    if (optionId === 'remorse') chance += 0.08 + (inc.programDone ? 0.07 : 0);
    if (optionId === 'plan') chance += plan.score * 0.07;
    if (optionId === 'innocent') chance -= 0.15;
    if (rng.chance(clamp(chance, 0.03, 0.9))) return release(ctx, `The parole board granted your release${optionId === 'plan' && plan.score ? ` — they liked the plan: ${plan.text}` : ''}.`);
    inc.paroleDenials = (inc.paroleDenials ?? 0) + 1;
    ctx.stat('happiness', -6);
    ctx.log(`The parole board denied you${optionId === 'innocent' ? ': "lack of insight into the offense"' : ''}. Next hearing in a year.`, '📋', 'warn');
  },
};
