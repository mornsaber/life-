/**
 * Companies that live and die: the private employer you work for has a life of its own.
 *
 *   Health      0–100, moved each year by the economy, its industry's swings and luck. A record
 *               year pays a profit-share bonus; a bad one freezes hiring and raises layoff risk.
 *   Shares      listed companies have a share price (an index, 100 when you joined).
 *   Events      at most one every few years, and they land on you:
 *                 acquired       a new parent: your title mapped onto theirs, overlapping roles cut
 *                 merger         two people for every senior seat
 *                 reorganized    your department merged or moved, and a new boss
 *                 new CEO        brings their own people; senior staff are managed out
 *                 spun off       your division becomes a company of its own
 *                 floated        a young company goes public (startup options pay out)
 *                 collapsed      administration or bankruptcy: the job and the shares go
 *   Head office large firms have one, in the country's biggest city. The top rungs sit there:
 *               from a regional office you transfer to head office to compete for them.
 *   Equity      share grants that vest a quarter a year at listed firms (lost if you leave early),
 *               options at young firms (worth something only if it floats or is bought), profit
 *               shares before either existed.
 *
 * org.corp = { health, share, listed, young, hq, parent, ceo, history: [{ age, kind, text }], lastEvent }
 * job.equity = { kind: 'shares' | 'options' | 'profit', grants: [{ value, share, vested, age }] }
 */
import { clamp, Random } from '../../core/Random.js';
import { orgOf } from '../org/Organizations.js';
import { cityPopulation } from '../org/Staffing.js';
import { REGIONS, regionsHere } from '../life/Regions.js';
import { yearNow } from '../world/Eras.js';
import { familyOf } from './CareerPlay.js';
import { getProfession } from './JobTrees.js';
import { nextLevels } from './Ladder.js';
import { PROMO_GATES, leaveJob, demote } from './CareerEngine.js';
import { showResult } from '../life/ResultCards.js';

/** How each kind of business swings: yearly volatility, drift, and how hard a recession hits. */
const INDUSTRY = {
  tech: { vol: 14, drift: 2, recession: -12, noun: 'Technologies' },
  business: { vol: 9, drift: 1, recession: -10, noun: 'Group' },
  trades: { vol: 10, drift: 0, recession: -14, noun: 'Construction' },
  medical: { vol: 5, drift: 1, recession: -3, noun: 'Health' },
  arts: { vol: 13, drift: 0, recession: -9, noun: 'Media' },
  legal: { vol: 6, drift: 1, recession: -5, noun: 'Partners' },
  general: { vol: 8, drift: 0, recession: -9, noun: 'Industries' },
};
const PHASE = { expansion: 3, peak: 1, recession: -1, recovery: 2 };
const PREFIX = ['Consolidated', 'United', 'General', 'National', 'Amalgamated', 'Continental', 'Allied', 'Standard', 'Imperial', 'Northern', 'Atlas', 'Meridian'];
const EVENT_GAP = 4;
const money = (n) => `$${Math.round(n).toLocaleString()}`;
const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 4099 + state.character.age * 613 + 0x1c0) >>> 0);

/** The biggest sizes: head office, listings, mergers of equals. */
const BIG = ['large', 'enterprise', 'mega'];
export const isBig = (job) => BIG.includes(job?.employer?.size);
/** A company with a life of its own: mid-size and up, or a young tech firm. */
export const isCorporate = (job) => Boolean(job && job.sector === 'private' && job.employer && !job.informal && !getProfession(job.professionId)?.church
  && (['medium', ...BIG].includes(job.employer.size) || (job.employer.size === 'small' && familyOf(job) === 'tech')));
const industryOf = (job) => INDUSTRY[familyOf(job)] ?? INDUSTRY.general;
const kindOf = (state) => { const y = yearNow(state); return { shares: y >= 1990, options: y >= 1975, ipoWord: y >= 1975 ? 'went public' : 'floated on the stock exchange' }; };

/** The company you work for (created the first time it's needed). */
export function corpOf(state, job = state.career?.job) {
  if (!isCorporate(job)) return null;
  const org = orgOf(state, job.employer);
  const holder = org ?? job.employer;
  if (!holder.corp) {
    const rng = sideRng(state);
    const big = isBig(job);
    const regions = regionsHere(state);
    const hq = big ? [...regions].sort((a, b) => (b.pop?.[1] ?? cityPopulation(b.id)) - (a.pop?.[1] ?? cityPopulation(a.id)))[0]?.id ?? state.character.regionId : state.character.regionId;
    holder.corp = { health: rng.int(45, 70), share: 100, listed: big && rng.chance(0.75), young: !big && familyOf(job) === 'tech' && rng.chance(0.5), hq, parent: null, history: [], lastEvent: -99 };
  }
  return holder.corp;
}
/** The company, if it has one yet (for views: never creates). */
export function corpPeek(state, job = state.career?.job) {
  if (!isCorporate(job)) return null;
  return (orgOf(state, job.employer) ?? job.employer).corp ?? null;
}
export const atHeadOffice = (state, job = state.career?.job) => { const c = corpOf(state, job); return !c || c.hq === state.character.regionId; };

/* ------------------------------------------------------------------ */
/* Equity                                                              */
/* ------------------------------------------------------------------ */

/** A grant on joining or promotion: shares at a listed firm, options at a young one, a profit share otherwise. */
export function grantEquity(state, job, reason = 'joining') {
  const c = corpOf(state, job);
  if (!c) return null;
  const k = kindOf(state);
  const grade = job.grade ?? 1;
  if (grade < 3) return null;
  const kind = c.young && k.options ? 'options' : c.listed && k.shares ? 'shares' : 'profit';
  if (kind === 'profit') { job.equity = { kind, grants: [] }; return job.equity; }
  const share = kind === 'options' ? 0.15 + grade * 0.04 : 0.05 + Math.max(0, grade - 3) * 0.06;
  const value = Math.round((job.salary ?? 0) * share);
  if (!value) return null;
  job.equity ??= { kind, grants: [] };
  job.equity.kind = kind;
  job.equity.grants.push({ value, share: c.share, vested: 0, age: jobAge(state), reason });
  return job.equity;
}
const jobAge = (state) => state.character.age;
/** What your shares are worth now (vested and not), and what leaving would forfeit. */
export function equityValue(state, job = state.career?.job) {
  const c = corpPeek(state, job);
  const e = job?.equity;
  if (!c || !e || e.kind === 'profit') return { vested: 0, unvested: 0, kind: e?.kind ?? null };
  const price = (g) => (e.kind === 'options' ? g.value : Math.round(g.value * (c.share / g.share)));
  return {
    kind: e.kind,
    vested: e.grants.reduce((t, g) => t + (e.kind === 'options' ? price(g) * g.vested : 0), 0),
    unvested: e.grants.reduce((t, g) => t + price(g) * (1 - g.vested), 0),
  };
}
function vestYear(ctx, job, c) {
  const e = job.equity;
  if (!e || e.kind === 'profit') return;
  let paid = 0;
  for (const g of e.grants) {
    if (g.vested >= 1) continue;
    g.vested = Math.min(1, g.vested + 0.25);
    if (e.kind === 'shares') paid += Math.round(g.value * 0.25 * (c.share / g.share));
  }
  if (paid > 0) ctx.earn(paid, 'Shares vested', { wage: true });
  e.grants = e.grants.filter((g) => g.vested < 1 || e.kind === 'options');
}
/** Options pay at a float or a sale: vested ones at a multiple, unvested ones accelerate at a sale. */
function cashOptions(ctx, job, multiple, why) {
  const e = job?.equity;
  if (!e || e.kind !== 'options' || !e.grants.length) return 0;
  const accelerate = why === 'sale';
  const pay = Math.round(e.grants.reduce((t, g) => t + g.value * (accelerate ? 1 : g.vested), 0) * multiple);
  e.grants = accelerate ? [] : e.grants.filter((g) => g.vested < 1).map((g) => ({ ...g, value: Math.round(g.value * multiple), share: 100 }));
  e.kind = 'shares';
  if (pay > 0) ctx.earn(pay, 'Stock options cashed', { wage: true });
  return pay;
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

function remember(state, c, kind, text) {
  c.history.unshift({ age: state.character.age, kind, text });
  c.history = c.history.slice(0, 10);
  c.lastEvent = state.character.age;
}
function rename(job, name) {
  job.employer.name = name;
  job.employerName = name;
}
const newParent = (rng, job) => `${rng.pick(PREFIX)} ${industryOf(job).noun}`;
const package_ = (job) => Math.round((job.salary ?? 0) * (0.25 + Math.min(1, (job.yearsAtEmployer ?? 0) * 0.05)));

function event(ctx, job, c, rng) {
  const { state } = ctx;
  const size = job.employer.size;
  const grade = job.grade ?? 1;
  const k = kindOf(state);
  if (state.character.age - c.lastEvent < EVENT_GAP) return;
  // Collapse: only from the edge.
  if (c.health < 15 && rng.chance(0.3)) {
    remember(state, c, 'collapsed', `${job.employer.name} collapsed.`);
    c.share = 0;
    if (job.equity) job.equity.grants = [];
    const kept = rng.chance(0.35);
    if (kept) {
      job.salary = Math.round((job.salary ?? 0) * 0.9);
      ctx.stat('stress', 12);
      return ctx.log(`${job.employer.name} went into administration. The administrators kept your part running, at a pay cut; the shares are worthless.`, '📉', 'bad');
    }
    ctx.log(`${job.employer.name} collapsed into bankruptcy. Everyone was told to leave the building by noon.`, '📉', 'bad');
    showResult(ctx, { icon: '📉', title: 'The company collapsed', big: job.employer.name, sub: 'The job and the shares went with it.', tone: 'bad', popup: true });
    leaveJob(ctx, `${job.employer.name} went bankrupt`);
    ctx.stat('happiness', -10);
    return;
  }
  // A young company floats (startup options pay out).
  if (c.young && !c.listed && c.health >= 65 && rng.chance(0.12)) {
    c.listed = true; c.young = false; c.share = 100;
    const mult = rng.float(2, 12);
    const pay = cashOptions(ctx, job, mult, 'float');
    remember(state, c, 'floated', `${job.employer.name} ${k.ipoWord}.`);
    ctx.log(`${job.employer.name} ${k.ipoWord}. The bell rang, the shares jumped${pay ? `, and your vested options came to ${money(pay)}` : ''}.`, '🔔', 'milestone');
    if (pay) showResult(ctx, { icon: '🔔', title: `The company ${k.ipoWord}`, big: money(pay), sub: 'Your vested options, cashed out', tone: 'good', popup: true });
    return;
  }
  const roll = rng.next();
  // Acquired: smaller and weaker companies get bought.
  if (roll < (['enterprise', 'mega'].includes(size) ? 0.02 : c.health < 45 ? 0.1 : 0.05)) {
    const parent = newParent(rng, job);
    const old = job.employer.name;
    c.parent = parent;
    remember(state, c, 'acquired', `${old} was bought by ${parent}.`);
    const mult = c.young ? rng.float(0.5, 5) : 1;
    const paid = cashOptions(ctx, job, mult, 'sale');
    if (job.equity?.kind === 'shares') for (const g of job.equity.grants) g.share = c.share; // converted into the buyer's shares
    rename(job, `${old} (part of ${parent})`);
    if (paid) ctx.log(`The sale accelerated your options: ${money(paid)}.`, '💵', 'good');
    if (grade >= 4 && rng.chance(0.4)) {
      return ctx.prompt({ type: 'companyLife.overlap', icon: '🤝', title: 'Bought', text: `${parent} has bought ${old}. They already have someone doing your job, and you've been asked to a meeting with the new owners' people.`,
        options: [
          { id: 'package', label: `💼 Take the package (${money(package_(job))})` },
          { id: 'down', label: '🪜 Stay, mapped onto their grades a rung lower' },
          { id: 'fight', label: `🥊 Make the case that you're the better one (${Math.round(overlapOdds(job) * 100)}%)` },
        ], data: {} });
    }
    return ctx.log(`${old} was bought by ${parent}. New logo, new systems, and your job title mapped onto theirs.`, '🤝', 'info');
  }
  // A merger of equals: two people for every senior seat.
  if (BIG.includes(size) && roll < 0.14) {
    const partner = newParent(rng, job);
    remember(state, c, 'merger', `${job.employer.name} merged with ${partner}.`);
    if (grade >= 5) return ctx.prompt({ type: 'companyLife.overlap', icon: '⚖️', title: 'A Merger of Equals', text: `${job.employer.name} is merging with ${partner}. There are two of everyone at your level, and one seat.`,
      options: [
        { id: 'fight', label: `🥊 Compete for the seat (${Math.round(overlapOdds(job) * 100)}%)` },
        { id: 'package', label: `💼 Take the package (${money(package_(job))})` },
        { id: 'down', label: '🪜 Take the role below' },
      ], data: { merger: true } });
    return ctx.log(`${job.employer.name} merged with ${partner}. Two of every department became one.`, '⚖️', 'info');
  }
  // A reorganization: a new boss.
  if (roll < 0.26) {
    remember(state, c, 'reorganized', `${job.employer.name} reorganized.`);
    job.boss = 50;
    if (job.mentor && rng.chance(0.4)) { ctx.log(`${job.mentor.name} moved to another division in the reorganization.`, '🧭', 'info'); job.mentor = null; }
    return ctx.log(`${job.employer.name} reorganized: your department was merged into another, with a new boss to win over.`, '🔀', 'warn');
  }
  // A new chief executive brings their own people.
  if (BIG.includes(size) && roll < 0.33) {
    remember(state, c, 'newCeo', `A new chief executive took over ${job.employer.name}.`);
    if (grade >= 7 && rng.chance(0.3 + Math.max(0, 60 - (job.boss ?? 50)) / 100)) {
      ctx.log(`The new chief executive brought their own people. You were thanked for your service and given a package.`, '👔', 'bad');
      const pay = package_(job);
      leaveJob(ctx, 'Managed out by the new chief executive');
      ctx.earn(pay, 'Settlement package', { wage: true });
      return;
    }
    return ctx.log(`A new chief executive took over ${job.employer.name} with a hundred-day plan.`, '👔', 'info');
  }
  // A spin-off: your division becomes its own company.
  if (['enterprise', 'mega'].includes(size) && roll < 0.36) {
    const spun = `${job.employer.name.split(' (')[0].split(' ')[0]} ${industryOf(job).noun} Holdings`;
    remember(state, c, 'spunOff', `Your division was spun off as ${spun}.`);
    rename(job, spun);
    job.employer.size = 'large';
    if (job.equity?.kind === 'shares') for (const g of job.equity.grants) g.share = c.share;
    grantEquity(state, job, 'spin-off');
    return ctx.log(`Your division was spun off as ${spun}: a company of its own, with a founders' share grant for the people who ran it.`, '🧬', 'good');
  }
}

/** The odds of keeping your seat when there are two of you. */
export const overlapOdds = (job) => clamp(0.3 + ((job.performance ?? 55) - 55) / 120 + ((job.boss ?? 50) - 50) / 160, 0.1, 0.85);

/* ------------------------------------------------------------------ */
/* The year                                                            */
/* ------------------------------------------------------------------ */

/** Layoff risk on top of the economy's, from how the company is doing. */
export function corpLayoffRisk(state, job) {
  const c = isCorporate(job) ? corpOf(state, job) : null;
  if (!c) return 0;
  // A no-layoffs guarantee won at the bargaining table (career/CompanyUnions.js).
  if ((job.noLayoffUntil ?? 0) > state.character.age) return 0;
  return c.health < 25 ? 0.08 : c.health < 40 ? 0.03 : 0;
}

function year(ctx) {
  const { state } = ctx;
  const job = state.career?.job;
  if (!isCorporate(job)) return;
  const c = corpOf(state, job);
  const rng = sideRng(state);
  const ind = industryOf(job);
  const phase = state.economy?.phase ?? 'expansion';
  const move = (phase === 'recession' ? ind.recession : PHASE[phase] ?? 0) + ind.drift + rng.int(-ind.vol, ind.vol) + Math.round((55 - c.health) / 8);
  c.health = Math.round(clamp(c.health + move, 0, 100));
  if (c.listed) c.share = Math.max(1, Math.round(c.share * (1 + move / 60 + rng.float(-0.08, 0.1))));
  // The company's year in your pay packet.
  if (c.health >= 78) {
    const bonus = Math.round((job.salary ?? 0) * (job.equity?.kind === 'profit' ? 0.08 : 0.05));
    if (bonus) ctx.earn(bonus, 'Profit-share bonus', { wage: true });
    if (rng.chance(0.5)) ctx.log(yearNow(state) >= 1950 ? `A record year at ${job.employer.name}: a profit-share bonus for everyone.` : `A record year at ${job.employer.name}: the master stood everyone a dinner and a sovereign apiece.`.replace('a sovereign', ['GB', 'IE', 'AU', 'NZ', 'CA'].includes(state.character.countryId ?? 'US') ? 'a sovereign' : 'a gold coin'), '📈', 'good');
  } else if (c.health <= 25 && rng.chance(0.6)) {
    ctx.stat('stress', 4);
    ctx.log(`A hard year at ${job.employer.name}: hiring frozen, bonuses cancelled, rumours of cuts.`, '📉', 'warn');
  }
  vestYear(ctx, job, c);
  // A struggling company cuts jobs on top of whatever the economy does.
  if (rng.chance(corpLayoffRisk(state, job) * ((job.performance ?? 55) >= 75 ? 0.4 : 1))) {
    const pay = package_(job);
    ctx.log(`${job.employer.name} cut a fifth of its staff to survive, and your name was on the list.`, '📉', 'bad');
    leaveJob(ctx, `Cut when ${job.employer.name} was struggling`);
    ctx.earn(pay, 'Severance pay', { wage: true });
    ctx.stat('happiness', -8);
    return;
  }
  event(ctx, job, c, rng);
}

// Senior posts sit at head office.
PROMO_GATES.push((state, job, level) => {
  if (!isCorporate(job) || !isBig(job) || (level.grade ?? 0) < 7) return null;
  // Read-only: views ask about promotions too.
  const c = corpPeek(state, job);
  if (!c || c.hq === state.character.regionId) return null;
  return `${level.title} posts are at head office in ${REGIONS[c.hq]?.name.split(',')[0] ?? 'the capital'}: transfer there to compete`;
});

export const CompanyLifeModule = {
  id: 'companyLife',
  // After the year's plan and story (29, 29.5), before the career engine's review and layoffs (30).
  order: 29.7,
  setup(engine) {
    engine.bus.on('career:hired', ({ ctx }) => { const job = ctx?.state.career.job; if (job && isCorporate(job) && !job.equity) grantEquity(ctx.state, job); });
    engine.bus.on('career:promoted', ({ ctx, job }) => { if (ctx && job && isCorporate(job) && (job.grade ?? 0) >= 4) grantEquity(ctx.state, job, 'promotion'); });
    engine.bus.on('career:separated', ({ ctx, job }) => {
      if (!ctx || !job?.equity) return;
      const left = equityValue(ctx.state, job).unvested;
      if (left > 1000) ctx.log(`Leaving cost you ${money(left)} in unvested ${job.equity.kind === 'options' ? 'options' : 'shares'}.`, '🔒', 'warn');
    });
  },
  onAgeUp(ctx) { year(ctx); },
  actions: {
    /** Transfer to head office (a move to its city) to compete for the top posts. */
    headOffice(ctx) {
      const { state } = ctx;
      const job = state.career.job;
      const c = corpOf(state, job);
      if (!c || c.hq === state.character.regionId) return ctx.toast('You work at head office already.', 'info');
      ctx.emit('region:relocate', { regionId: c.hq, reason: `${job.employer.name} transferred you to head office.` });
      job.employer.city = REGIONS[c.hq]?.name.split(',')[0] ?? job.employer.city;
      job.boss = Math.round(clamp((job.boss ?? 50) + 4, 0, 100));
      ctx.log(`You transferred to head office in ${REGIONS[c.hq]?.name ?? 'the capital'}: closer to the people who decide.`, '🏢', 'good');
    },
  },
  resolvers: {
    overlap(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!job) return;
      if (optionId === 'package') {
        const pay = package_(job);
        leaveJob(ctx, data?.merger ? 'Took a package in the merger' : 'Took a package after the takeover');
        ctx.earn(pay, 'Settlement package', { wage: true });
        return ctx.log(`You took the package: ${money(pay)} and a reference.`, '💼', 'info');
      }
      if (optionId === 'down') {
        demote(ctx, 'Mapped onto the new grades a rung lower');
        return ctx.log('You stayed, a rung lower on the new organization chart.', '🪜', 'warn');
      }
      if (rng.chance(overlapOdds(job))) {
        job.boss = Math.round(clamp((job.boss ?? 50) + 6, 0, 100));
        return ctx.log('You made your case and kept the seat. The other one took the package.', '🥊', 'good');
      }
      ctx.stat('happiness', -6);
      ctx.log('They chose the other one. You were offered the role below, or the door.', '🥊', 'bad');
      if (rng.chance(0.5)) demote(ctx, 'Lost the seat in the takeover');
      else { const pay = Math.round(package_(job) * 0.7); leaveJob(ctx, 'Lost the seat in the takeover'); ctx.earn(pay, 'Settlement package', { wage: true }); }
    },
  },
};
