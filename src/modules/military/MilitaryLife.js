/**
 * Life around the uniform: duty-station moves and overseas tours (and what
 * they do to a family and a spouse's career), fitness reports and
 * below-the-zone promotion, the Blended Retirement System, transferring the
 * GI Bill to your children, and retiree recall.
 *
 * svc.overseas = { country, base, accompanied, until } during a tour abroad.
 * svc.reports  = [{ age, score, block }] (last five fitness reports).
 * svc.retirementPlan = 'legacy' | 'brs'; svc.giBillTransferred.
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { BASES } from '../life/Regions.js';
import { spouseOf, partnerOf, minorChildren, livingChildren, ageOf, clampRel } from '../people/People.js';
import { warFactor, atWar } from '../world/War.js';
import { BRANCHES, monthlyBasePay, annualActivePay, branchOf } from './MilitaryEngine.js';
import { branchDetailTick } from './CareerFields.js';
import { nationalBases, nationalOverseas } from '../world/NationalForces.js';

/** Bases and overseas postings: your own country's when you serve in a national force. */
const basesFor = (svc) => (svc.nation ? nationalBases(svc.nation, svc.branch) : BASES[svc.branch] ?? []);
const overseasFor = (svc) => (svc.nation ? nationalOverseas(svc.nation, svc.branch) : OVERSEAS[svc.branch] ?? []);

/** Overseas duty stations: [country, base, tour years, accompanied tour possible]. */
export const OVERSEAS = {
  army: [['Germany', 'U.S. Army Garrison Bavaria (Grafenwöhr)', 3, true], ['Germany', 'U.S. Army Garrison Stuttgart', 3, true], ['South Korea', 'Camp Humphreys', 1, false], ['Italy', 'Caserma Del Din, Vicenza', 3, true], ['Japan', 'Camp Zama', 3, true]],
  marines: [['Japan', 'Camp Butler, Okinawa', 3, true], ['Japan', 'MCAS Iwakuni', 3, true], ['South Korea', 'Camp Mujuk', 1, false]],
  navy: [['Japan', 'Fleet Activities Yokosuka', 3, true], ['Bahrain', 'NSA Bahrain', 2, true], ['Italy', 'NSA Naples', 3, true], ['Spain', 'Naval Station Rota', 3, true], ['Guam', 'Naval Base Guam', 3, true]],
  airforce: [['Germany', 'Ramstein Air Base', 3, true], ['Japan', 'Kadena Air Base, Okinawa', 3, true], ['South Korea', 'Osan Air Base', 1, false], ['United Kingdom', 'RAF Lakenheath', 3, true], ['Italy', 'Aviano Air Base', 3, true]],
  spaceforce: [['United Kingdom', 'RAF Fylingdales', 2, true], ['Greenland', 'Pituffik Space Base', 1, false], ['Japan', 'Yokota Air Base', 3, true]],
  coastguard: [['Japan', 'Activities Far East, Tokyo', 3, true], ['Bahrain', 'Patrol Forces Southwest Asia', 1, false]],
};
const OVERSEAS_SHARE = 0.35;

const LIFE_ABROAD = {
  Germany: ['Weekend trips to Prague and Paris on the train.', 'Christmas markets, Volksmarches and a Bavarian beer hall that knows your order.'],
  'South Korea': ['Twelve-hour days on the peninsula, a tight unit and noodles at 2 a.m. in Pyeongtaek.'],
  Italy: ['Espresso before PT and long weekends in Venice and the Dolomites.'],
  Japan: ['Ramen, onsens and learning to drive on the left.', 'Typhoon season, cherry blossoms and a neighbor who brings you oranges.'],
  Bahrain: ['Desert heat, a busy port and Friday brunches.'],
  Spain: ['Late dinners and beach weekends in Cádiz.'],
  Guam: ['Island life: snorkeling, typhoons and a 13-hour flight home.'],
  'United Kingdom': ['Pub quizzes, rain and weekend trips to London.'],
  Greenland: ['Polar night, the northern lights and a base with one bar.'],
};

/** Fitness report names by branch and track. */
const REPORT = {
  army: { enlisted: 'NCOER', officer: 'OER' }, guard: { enlisted: 'NCOER', officer: 'OER' },
  navy: { enlisted: 'EVAL', officer: 'FITREP' }, marines: { enlisted: 'FITREP', officer: 'FITREP' },
  airforce: { enlisted: 'EPB', officer: 'OPB' }, spaceforce: { enlisted: 'EPB', officer: 'OPB' },
  coastguard: { enlisted: 'EER', officer: 'OER' },
};
export const reportName = (svc) => REPORT[svc.branch]?.[svc.track === 'warrant' ? 'officer' : svc.track] ?? 'evaluation';
export const blockFor = (score) => (score >= 88 ? 'Most Qualified' : score >= 75 ? 'Highly Qualified' : score >= 55 ? 'Qualified' : 'Not Qualified');

/* ------------------------------------------------------------------ */
/* Moves                                                               */
/* ------------------------------------------------------------------ */

const hasFamily = (state) => Boolean(spouseOf(state)) || minorChildren(state).length > 0;

/** A military move costs a working spouse their job, at least for a while. */
export function spouseMove(ctx, why) {
  const { state, rng } = ctx;
  const spouse = spouseOf(state);
  if (!spouse?.job || !rng.chance(0.65)) return;
  spouse.pcsJob = spouse.job;
  spouse.job = null;
  spouse.income = 0;
  spouse.careerIncome = Math.round((spouse.careerIncome ?? 0) * 0.93);
  ctx.log(`${spouse.firstName} had to leave their job as ${spouse.pcsJob} for ${why}. Military spouses start over with every move.`, '🧳', 'warn');
}

/** Orders: a new stateside base, or a tour overseas. */
export function pcsOrders(ctx, svc) {
  const { state, rng } = ctx;
  if (svc.overseas) return returnStateside(ctx, svc);
  const abroad = overseasFor(svc);
  if (abroad.length && rng.chance(OVERSEAS_SHARE)) {
    const [country, base, years, accompaniable] = rng.pick(abroad);
    if (accompaniable && hasFamily(state)) {
      ctx.prompt({
        type: 'military.overseasOrders',
        icon: '🌍',
        title: `Orders: ${base}, ${country}`,
        text: `You've been assigned to ${base} for ${years} years.\nYour family can come with you (command-sponsored, with housing, schools and a cost-of-living allowance), or you can serve the tour unaccompanied.${spouseOf(state)?.job ? `\n${spouseOf(state).firstName} would probably have to leave their job.` : ''}`,
        options: [
          { id: 'family', label: '👨‍👩‍👧 Bring the family', hint: 'An adventure together; a spouse\'s career pauses' },
          { id: 'alone', label: '🧳 Go unaccompanied', hint: 'Shorter tour, hard on a marriage' },
          { id: 'defer', label: '📝 Request a humanitarian deferment', hint: 'Rarely approved' },
        ],
        data: { country, base, years },
      });
      return;
    }
    return startTour(ctx, svc, { country, base, years: hasFamily(state) && !accompaniable ? 1 : years, accompanied: false });
  }
  const options = basesFor(svc).filter(([regionId]) => regionId !== state.character.regionId);
  if (!options.length) return;
  const [regionId, base] = rng.pick(options);
  svc.stationYears = 0;
  svc.tourLength = 3;
  svc.station = base;
  ctx.emit('region:relocate', { regionId, reason: `PCS orders: report to ${base}.` });
  if (hasFamily(state)) spouseMove(ctx, `the move to ${base}`);
}

function startTour(ctx, svc, { country, base, years, accompanied }) {
  const { state } = ctx;
  svc.overseas = { country, base, accompanied, until: state.character.age + years };
  svc.station = base;
  svc.stationYears = 0;
  svc.tourLength = years;
  ctx.log(`You reported to ${base}, ${country}${accompanied ? ' with your family' : hasFamily(state) ? ', leaving your family stateside' : ''}. ${years > 1 ? `A ${years}-year tour.` : 'A one-year remote tour.'}`, '🌍', 'milestone');
  if (accompanied) spouseMove(ctx, `the move to ${country}`);
}

function returnStateside(ctx, svc) {
  const { state, rng } = ctx;
  const o = svc.overseas;
  svc.overseas = null;
  ctx.log(`Your tour in ${o.country} ended.${o.accompanied ? ' The kids came home with a passport full of stamps.' : ''}`, '🛬', 'military');
  const options = basesFor(svc);
  // A remote tour earns an assignment of choice.
  const pick = options.find(([r]) => r === state.character.regionId) ?? rng.pick(options);
  if (!pick) return;
  svc.station = pick[1];
  svc.stationYears = 0;
  svc.tourLength = 3;
  if (pick[0] !== state.character.regionId) ctx.emit('region:relocate', { regionId: pick[0], reason: `PCS orders: report to ${pick[1]}.` });
  else ctx.log(`${o.accompanied ? '' : 'After a remote tour you got your assignment of choice: '}${pick[1]}, close to home.`, '🏠', 'good');
}

/** A year abroad. */
function overseasTick(ctx, svc) {
  const { state, rng } = ctx;
  const o = svc.overseas;
  if (!o) return;
  ctx.earn(Math.round(monthlyBasePay(svc) * (o.accompanied ? 1.8 : 0.8)), `Overseas housing allowance & COLA (${o.country})`);
  if (rng.chance(0.5)) ctx.log(rng.pick(LIFE_ABROAD[o.country] ?? ['Life overseas: new food, new language, new friends.']), '🌍');
  if (o.accompanied) {
    ctx.stat('happiness', 2);
  } else {
    ctx.stat('stress', 4);
    const p = partnerOf(state);
    if (p) {
      p.relationship = clampRel(p.relationship - rng.int(5, 12));
      if (rng.chance(0.3)) ctx.log(`Video calls with ${p.firstName} across ${rng.int(7, 14)} time zones are getting shorter.`, '📱', 'warn');
    }
    if (minorChildren(state).length) ctx.stat('happiness', -3);
  }
}

/* ------------------------------------------------------------------ */
/* Fitness reports & below-the-zone                                    */
/* ------------------------------------------------------------------ */

export function writeReport(ctx, svc) {
  const score = svc.eval;
  const block = blockFor(score);
  svc.reports = [...(svc.reports ?? []), { age: ctx.state.character.age, score, block }].slice(-5);
}

/** The board reads your last three reports, not just this year's. */
export function boardScore(svc) {
  const last = (svc.reports ?? []).slice(-3).map((r) => r.score);
  if (!last.length) return svc.eval;
  return Math.round((last.reduce((s, x) => s + x, 0) / last.length) * 0.6 + svc.eval * 0.4);
}

/** Top performers can be promoted a year early ("below the zone"). */
export function belowZone(svc, tig, threshold) {
  if (svc.yearsInGrade !== tig - 1 || tig < 2) return false;
  const window = svc.track === 'officer' ? [1, 4] : svc.track === 'warrant' ? [1, 3] : [2, 5];
  if (svc.grade < window[0] || svc.grade > window[1]) return false;
  return boardScore(svc) >= threshold + 15 && (svc.reports ?? []).slice(-2).every((r) => r.block === 'Most Qualified');
}

/* ------------------------------------------------------------------ */
/* Retirement: BRS, TSP, continuation pay; GI Bill transfer; recall    */
/* ------------------------------------------------------------------ */

/** BRS: 2% per year (not 2.5%), but a matched TSP and continuation pay. */
export const multiplierFor = (svc) => (svc.retirementPlan === 'brs' ? 0.02 : 0.025);

function brsTick(ctx, svc) {
  const { state } = ctx;
  if (svc.retirementPlan !== 'brs' || svc.component !== 'active') return;
  const pay = monthlyBasePay(svc) * 12;
  const own = Math.round(pay * 0.05);
  ctx.spend(own, 'TSP contribution (5%)');
  const match = Math.round(pay * (svc.yearsOfService >= 2 ? 0.05 : 0.01));
  state.retirement.dc += own + match;
  if (svc.yearsOfService === 12 && !svc.continuationPaid) {
    svc.continuationPaid = true;
    const cp = Math.round(monthlyBasePay(svc) * 2.5);
    ctx.earn(cp, 'BRS continuation pay', { wage: true });
    svc.contractYearsLeft = Math.max(svc.contractYearsLeft, 4);
    ctx.log(`You took BRS continuation pay ($${cp.toLocaleString()}) for four more years.`, '💵', 'good');
  }
}

export function giBillTransferEligibility(state) {
  const svc = state.military.service;
  if (!svc) return { ok: false, reason: 'Only while serving' };
  if (svc.giBillTransferred) return { ok: false, reason: 'Already transferred' };
  if (svc.yearsOfService < 6) return { ok: false, reason: 'After 6 years of service' };
  if (!livingChildren(state).length) return { ok: false, reason: 'No children to transfer to' };
  return { ok: true };
}

/** Lock in four more years; your children get your GI Bill. */
export function transferGiBill(ctx) {
  const { state } = ctx;
  const check = giBillTransferEligibility(state);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  const svc = state.military.service;
  const kids = livingChildren(state).filter((c) => ageOf(state, c) < 26);
  if (!kids.length) return ctx.toast('Your children are past college age', 'warn');
  svc.giBillTransferred = true;
  svc.contractYearsLeft = Math.max(svc.contractYearsLeft, 4);
  const years = Math.max(1, Math.floor(4 / kids.length));
  for (const c of kids) c.giBill = years;
  ctx.log(`You transferred your Post-9/11 GI Bill to ${kids.map((c) => c.firstName).join(' and ')} and signed on for four more years.`, '🎓', 'milestone');
  ctx.toast('GI Bill transferred', 'good');
}

/** Retirees under 60 can be recalled to active duty in a major war. */
function recallTick(ctx) {
  const { state, rng } = ctx;
  if (state.military.service || !atWar(state) || state.character.age >= 60 || state.legal.incarceration) return;
  const last = state.military.history.at(-1);
  if (!last || last.discharge !== 'retired' || state.military.recalledAt === state.character.age - 1) return;
  if (!rng.chance(0.06 * (warFactor(state) - 0.5))) return;
  state.military.recalledAt = state.character.age;
  const pay = Math.round(annualActivePay({ track: last.track, grade: Math.max(0, Number(last.rankCode.slice(2)) - 1), yearsOfService: last.yearsOfService, component: 'active' }) * 0.75);
  if (state.career.job) ctx.emit('career:militaryLeave', { reason: 'retiree recall to active duty' });
  ctx.earn(pay, `Retiree recall — ${last.rankTitle}`, { wage: true });
  ctx.stat('stress', 8);
  ctx.log(`With the war widening, the ${branchOf(last).name} recalled you from retirement for a year: ${rng.pick(['training replacements', 'a staff job at a joint headquarters', 'running a mobilization center', 'backfilling a deployed unit stateside'])}.`, branchOf(last).icon, 'military');
  ctx.emit('military:releasedFromActive', {});
}

/** A spouse who lost a job to a move eventually finds another. */
function spouseRecovery(ctx) {
  const { state, rng } = ctx;
  const spouse = spouseOf(state);
  if (!spouse?.pcsJob || spouse.job || !rng.chance(0.5)) return;
  spouse.job = spouse.pcsJob;
  spouse.pcsJob = null;
  ctx.log(`${spouse.firstName} found work again as ${spouse.job}.`, '💼', 'good');
}

/** Called every year, serving or not. */
export function militaryLifeTick(ctx) {
  spouseRecovery(ctx);
  recallTick(ctx);
}

/** Called in the active/reserve tick, after evaluations. */
export function serviceLifeTick(ctx, svc) {
  writeReport(ctx, svc);
  branchDetailTick(ctx, svc);
  overseasTick(ctx, svc);
  brsTick(ctx, svc);
  if (svc.component === 'active' && svc.yearsOfService === 2 && !svc.retirementPlan && !ctx.state.prompts.some((p) => p.type === 'military.brs')) {
    ctx.prompt({
      type: 'military.brs',
      icon: '🏦',
      title: 'Choose a Retirement Plan',
      text: 'You can opt into the Blended Retirement System:\n• Legacy: a pension of 2.5% of base pay per year after 20 years, and nothing if you leave sooner.\n• BRS: 2% per year after 20 years, plus a Thrift Savings Plan with up to a 5% government match that you keep however long you serve, plus continuation pay at 12 years.',
      options: [
        { id: 'brs', label: '📈 Opt into BRS', hint: 'Best if you might not stay 20 years' },
        { id: 'legacy', label: '🏛️ Keep the legacy pension', hint: 'Best for a full career' },
      ],
    });
  }
}

export const MilitaryLifeActions = {
  transferGiBill(ctx) {
    transferGiBill(ctx);
  },
};

export const MilitaryLifeResolvers = {
  overseasOrders(ctx, data, optionId) {
    const { state, rng } = ctx;
    const svc = state.military.service;
    if (!svc) return;
    if (optionId === 'defer') {
      if (!yearlyCount(state, 'military.deferment') && rng.chance(0.25)) {
        bumpYearly(state, 'military.deferment');
        svc.stationYears = Math.max(0, (svc.tourLength ?? 3) - 1);
        return ctx.log('Your deferment was approved. You stay put for another year.', '📝', 'good');
      }
      ctx.log('The deferment was denied. Orders are orders.', '📝', 'warn');
      svc.eval = Math.max(0, svc.eval - 3);
      return startTour(ctx, svc, { ...data, accompanied: false, years: Math.min(data.years, 2) });
    }
    startTour(ctx, svc, { ...data, years: optionId === 'alone' ? Math.min(data.years, 2) : data.years, accompanied: optionId === 'family' });
  },
  brs(ctx, _data, optionId) {
    const svc = ctx.state.military.service;
    if (!svc) return;
    svc.retirementPlan = optionId === 'brs' ? 'brs' : 'legacy';
    ctx.log(optionId === 'brs' ? 'You opted into the Blended Retirement System. The TSP match starts now.' : 'You kept the legacy high-3 pension.', '🏦');
  },
};
