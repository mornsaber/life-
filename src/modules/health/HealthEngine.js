/**
 * Health: conditions that start, progress, get diagnosed and treated (or
 * not), the insurance that pays for them, and everything that follows —
 * medical debt and bankruptcy, addiction and rehab, licensing-board
 * suspensions, PTSD from combat and first-responder work, fitness-for-duty
 * evaluations, disability insurance / SSDI / disability retirement and VA
 * ratings. Mortality from conditions is read by Lifecycle.
 *
 * state.health = {
 *   conditions: [{ id, onsetAge, severity, diagnosed, treated, remission, serviceConnected }],
 *   trauma, serviceTrauma,            // accumulated traumatic exposure (decays yearly)
 *   medicalDebt, collections,         // unpaid bills
 *   marketplace,                      // buy an ACA plan when nothing else covers you
 *   disability: { policy, benefits: [{ source, label, annual, endAge }], ssdiYears },
 *   va: { rating },
 *   rehabs, boardSuspended: [credentialIds], history: [{ age, text }]
 * }
 */
import { fileBankruptcy, insolvencyHere, routeName } from '../life/Bankruptcy.js';
import { ruralRisk } from '../life/RuralLife.js';
import { clamp, Random } from '../../core/Random.js';
import { yearlyCount, bumpYearly, isIncarcerated } from '../../core/State.js';
import { ACUTE, CONDITIONS, BOARD_LICENSES, REHAB_COST, activeConditions, getCondition, vaRatingFor, combinedVaRating, VA_COMPENSATION } from './Conditions.js';
import { coverage, outOfPocket } from './Insurance.js';
import { waitYears, systemHere, goPrivateCost, levySurcharge } from './HealthSystems.js';
import { highAverage } from '../retirement/PensionPlans.js';
import { discharge } from '../military/MilitaryEngine.js';
import { lifestyleRisk, lifestyleTick, LifestyleActions, LifestyleResolvers } from './Lifestyle.js';
import { endOfLifeTick, EndOfLifeActions, EndOfLifeResolvers } from './EndOfLife.js';

/** Yearly traumatic exposure by profession (before calls/combat added over the bus). */
export const OCCUPATIONAL_TRAUMA = { police: 4, statePolice: 4, fire: 4, ems: 5, corrections: 4, cps: 4, gameWarden: 2, medical: 2, nursing: 2, intelligence: 1, prosecution: 1, publicDefender: 1 };

/** Jobs with fitness-for-duty standards, and the medical standard each uses. */
export const DUTY_STANDARD = { police: 'protective', statePolice: 'protective', fire: 'protective', ems: 'protective', corrections: 'protective', gameWarden: 'protective', aviation: 'faa', trucking: 'dot' };

const DISABLING_LABEL = 'Medical disability';
const isVeteran = (state) => state.military.history.some((h) => !['dishonorable', 'kia'].includes(h.discharge));

function record(state, text) {
  state.health.history.push({ age: state.character.age, text });
  if (state.health.history.length > 40) state.health.history.shift();
}

/* ------------------------------------------------------------------ */
/* Conditions                                                          */
/* ------------------------------------------------------------------ */

export function addCondition(ctx, id, { severity, serviceConnected = false, diagnosed, quiet = false } = {}) {
  const { state, rng } = ctx;
  const def = CONDITIONS[id];
  const existing = getCondition(state, id);
  if (existing && !existing.remission) {
    existing.severity = clamp(Math.max(existing.severity, severity ?? existing.severity + 10), 0, 100);
    existing.serviceConnected ||= serviceConnected;
    return existing;
  }
  const obvious = def.kind !== 'chronic' || ['backInjury', 'tbi', 'hearingLoss', 'asthma'].includes(id);
  const c = {
    id,
    onsetAge: state.character.age,
    severity: Math.round(severity ?? rng.int(20, 45)),
    diagnosed: diagnosed ?? obvious,
    // People follow doctors' orders for physical conditions; mental health and addiction need you to seek help.
    treated: (diagnosed ?? obvious) && def.kind === 'chronic',
    remission: false,
    serviceConnected: serviceConnected || Boolean(state.military.service),
  };
  if (existing) Object.assign(existing, c);
  else state.health.conditions.push(c);
  if (!quiet && c.diagnosed) {
    ctx.log(`${def.kind === 'chronic' ? 'You were diagnosed with' : 'You are struggling with'} ${def.name.toLowerCase()}.`, def.icon, 'warn');
    record(state, `Onset: ${def.name}`);
  }
  const target = existing ?? c;
  if (target.treated) queueForTreatment(ctx, target, quiet);
  return target;
}

/** Public systems with waiting lists: elective specialist care starts when your turn comes. */
function queueForTreatment(ctx, c, quiet = false) {
  const { state } = ctx;
  const wait = waitYears(state, c.id);
  if (!wait) return;
  c.treated = false;
  c.waitUntil = state.character.age + wait;
  if (!quiet) ctx.log(`You're on the ${systemHere(state).waitName} for ${CONDITIONS[c.id].name.toLowerCase()} treatment: about ${systemHere(state).wait} months. You could pay to go private.`, '⏳', 'warn');
}

function diagnose(ctx, c, how) {
  const def = CONDITIONS[c.id];
  c.diagnosed = true;
  c.treated = true;
  ctx.log(`${how} ${def.name} — ${c.severity >= 60 ? 'caught late' : 'caught early'}. You started treatment.`, def.icon, c.severity >= 60 ? 'bad' : 'warn');
  record(ctx.state, `Diagnosed: ${def.name}`);
  queueForTreatment(ctx, c);
}

/** Yearly onset probability for each condition: its base rate, times what your habits do to it. */
function onsetChance(state, id, h) {
  return baseOnset(state, id, h) * lifestyleRisk(state, id);
}
function baseOnset(state, id, h) {
  const age = state.character.age;
  const { stress, fitness, happiness } = state.stats;
  const has = (x) => activeConditions(state).some((c) => c.id === x);
  const untreated = (x) => activeConditions(state).some((c) => c.id === x && !c.treated);
  switch (id) {
    case 'hypertension': return age < 30 ? 0 : 0.003 + (age - 30) * 0.0005 + (stress > 60 ? 0.006 : 0) + (fitness < 40 ? 0.004 : 0);
    case 'diabetes': return age < 30 ? 0 : 0.001 + (age - 30) * 0.00015 + (fitness < 40 ? 0.004 : 0);
    case 'heartDisease': return age < 45 ? 0 : 0.0015 + (age - 45) * 0.0003 + (untreated('hypertension') ? 0.008 : 0) + (has('diabetes') ? 0.004 : 0) + (fitness < 35 ? 0.003 : 0);
    case 'cancer': return age < 35 ? 0.0002 : 0.001 + (age - 35) * 0.00022;
    case 'arthritis': return age < 45 ? 0 : 0.005;
    case 'asthma': return age < 12 ? 0.005 : 0;
    case 'depression': return age < 13 ? 0 : 0.003 + (happiness < 35 ? 0.02 : 0) + (stress > 75 ? 0.012 : 0) + (state.housing.homelessYears ? 0.02 : 0) + (isIncarcerated(state) ? 0.02 : 0);
    case 'anxiety': return age < 13 ? 0 : 0.003 + (stress > 65 ? 0.015 : 0);
    case 'ptsd': return h.trauma <= 26 ? 0 : Math.min(0.25, (h.trauma - 26) * 0.003) * (happiness > 70 ? 0.7 : 1);
    case 'alcohol': return age < 16 ? 0 : 0.0025 + (stress > 75 ? 0.006 : 0) + (has('ptsd') ? 0.03 : 0) + (has('depression') ? 0.01 : 0);
    case 'opioids': return age < 16 ? 0 : 0.0005 + (has('backInjury') ? 0.012 : 0) + (has('ptsd') ? 0.004 : 0);
    case 'gambling': return age < 18 ? 0 : 0.0015;
    case 'copd': return age < 40 ? 0 : 0.0003 + (age - 40) * 0.00002;
    case 'stroke': return age < 45 ? 0 : 0.001 + (age - 45) * 0.00018 + (untreated('hypertension') ? 0.006 : 0) + (has('diabetes') ? 0.002 : 0) + (has('heartDisease') ? 0.003 : 0);
    case 'dementia': return age < 65 ? 0 : 0.002 + (age - 65) * 0.0012 + (has('stroke') ? 0.01 : 0);
    case 'kidneyDisease': return age < 40 ? 0 : 0.0006 + (has('diabetes') ? 0.005 : 0) + (untreated('hypertension') ? 0.003 : 0);
    case 'liverDisease': return age < 25 ? 0 : 0.0002 + (has('alcohol') ? 0.012 : 0) + (has('hepatitisC') ? 0.01 : 0);
    case 'hiv': return age < 16 || age > 70 ? 0 : 0.0002;
    case 'hepatitisC': return age < 16 ? 0 : 0.0002;
    case 'stimulants': return age < 16 ? 0 : 0.0006 + (stress > 75 ? 0.002 : 0);
    default: return 0;
  }
}

/** Conditions added after the first set roll on their own dice, so they never shift the older ones' rolls. */
const LATER = ['copd', 'stroke', 'dementia', 'kidneyDisease', 'liverDisease', 'hiv', 'hepatitisC', 'stimulants'];
export function healthSideRng(state) {
  const h = state.health;
  h.seed = ((h.seed ?? 11) * 1664525 + 1013904223) >>> 0;
  return new Random(h.seed);
}

function onsets(ctx) {
  const { state } = ctx;
  const h = state.health;
  const side = healthSideRng(state);
  for (const id of ['hypertension', 'diabetes', 'heartDisease', 'cancer', 'arthritis', 'asthma', 'depression', 'anxiety', 'ptsd', 'alcohol', 'opioids', 'gambling', ...LATER]) {
    const rng = LATER.includes(id) ? side : ctx.rng;
    const existing = getCondition(state, id);
    if (existing && !existing.remission) continue;
    // Recurrence after remission is less likely than a first onset for cancer, more likely for addiction.
    const mult = existing ? (CONDITIONS[id].kind === 'addiction' ? 6 : 0.5) : 1;
    if (!rng.chance(onsetChance(state, id, h) * mult)) continue;
    const serviceConnected = id === 'ptsd' && h.serviceTrauma >= h.trauma * 0.5;
    const severity = id === 'ptsd' ? rng.int(35, 60) : CONDITIONS[id].kind === 'chronic' ? rng.int(15, 40) : rng.int(30, 50);
    addCondition(ctx, id, { severity, serviceConnected });
    if (existing && CONDITIONS[id].kind === 'addiction') ctx.log(`You relapsed (${CONDITIONS[id].name.toLowerCase()}).`, CONDITIONS[id].icon, 'bad');
  }
}

/** Severity drift, remission, symptoms, and each condition's yearly effects. */
function progress(ctx) {
  const { state, rng } = ctx;
  for (const c of activeConditions(state)) {
    const def = CONDITIONS[c.id];
    if (c.waitUntil != null && state.character.age >= c.waitUntil) {
      delete c.waitUntil;
      c.treated = true;
      ctx.log(`Your turn came: treatment for your ${def.name.toLowerCase()} started.`, def.icon, 'good');
    }
    // Untreated mental illness waxes and wanes; physical disease and addiction march on.
    const drift = c.treated ? def.progress * rng.float(-1.3, 0.35) : def.kind === 'mental' ? def.progress * rng.float(-0.9, 1.0) : def.progress * rng.float(0.4, 1.4);
    c.severity = Math.round(clamp(c.severity + drift, 0, 100));
    // Treatment drives remission; mental illness and addiction sometimes lift on their own.
    const remissionChance = c.treated ? def.remission : def.kind === 'mental' || def.kind === 'addiction' ? (def.remission ?? 0.1) * 0.3 : 0;
    if (remissionChance && (c.severity <= 12 || rng.chance(remissionChance))) {
      c.remission = true;
      c.treated = false;
      ctx.log(`${def.name} is in remission.`, '🌤️', 'good');
      record(state, `Remission: ${def.name}`);
      continue;
    }
    if (!c.diagnosed && c.severity >= 60) diagnose(ctx, c, 'Symptoms finally sent you to a doctor:');
    const weight = c.severity / 100;
    const factor = c.treated ? def.treatedFactor : 1;
    if (def.drain) ctx.stat('health', -Math.round(def.drain * weight * factor));
    if (def.happiness) ctx.stat('happiness', Math.round(def.happiness * weight * (c.treated ? 0.3 : 1)));
    if (def.stress) ctx.stat('stress', Math.round(def.stress * weight * (c.treated ? 0.3 : 1)));
    if (def.kind === 'addiction') addictionEffects(ctx, c, def);
    if ((def.kind === 'mental' || def.kind === 'addiction') && !c.treated && state.career.job && c.severity >= 45) ctx.emit('career:adjust', { performance: -Math.round(c.severity / 12) });
  }
}

function addictionEffects(ctx, c, def) {
  const { state, rng } = ctx;
  // Only someone with a car out front faces the choice to drive.
  if (def.dui && state.character.age >= 16 && (state.vehicles?.owned ?? []).length && !state.prompts.some((p) => p.type === 'health.driveDrunk') && rng.chance(def.dui * (c.severity / 60) * 2)) {
    ctx.prompt({
      type: 'health.driveDrunk', icon: '🍺', title: 'Last Call',
      text: 'You\'ve had far too much to drink, and your car is outside.',
      options: [
        { id: 'ride', label: '🚕 Get a ride home', hint: '≈$40' },
        { id: 'couch', label: '🛋️ Sleep it off on a friend\'s couch' },
        { id: 'drive', label: '🚗 Drive yourself home', illegal: 'drunk driving' },
      ],
      data: {},
    });
  }
  if (def.losses) {
    const lost = rng.int(...def.losses);
    ctx.spend(lost, 'Gambling losses', { allowDebt: true });
    ctx.log(`You lost $${lost.toLocaleString()} gambling this year.`, '🎰', 'bad');
  }
  if (def.board && rng.chance(def.board)) {
    const held = BOARD_LICENSES.filter((id) => state.credentials.held[id]?.status === 'active');
    if (held.length) {
      ctx.emit('credential:suspend', { ids: held, years: 3, reason: 'substance use — licensing board / medical certificate' });
      state.health.boardSuspended = [...new Set([...state.health.boardSuspended, ...held])];
      if (state.career.job && DUTY_STANDARD[state.career.job.professionId] !== undefined) ctx.emit('career:resign', { reason: 'Lost license over substance use', fired: true });
    }
  }
}

/* ------------------------------------------------------------------ */
/* Billing, medical debt and bankruptcy                                */
/* ------------------------------------------------------------------ */

/** Run a bill through insurance. Pays what you can; the rest becomes medical debt. Returns out-of-pocket. */
export function medicalBill(ctx, cost, reason, condition) {
  const { state } = ctx;
  const plan = coverage(state);
  const oop = outOfPocket(state, cost, { condition });
  if (oop <= 0) return 0;
  const toDeductible = Math.min(oop, Math.max(0, plan.deductible - yearlyCount(state, 'health.deductible')));
  state.yearly['health.deductible'] = yearlyCount(state, 'health.deductible') + toDeductible;
  state.yearly['health.oop'] = yearlyCount(state, 'health.oop') + oop;
  const paid = Math.max(0, Math.min(oop, Math.floor(state.finances.cash)));
  if (paid) ctx.spend(paid, `Medical — ${reason}`);
  if (oop > paid) state.health.medicalDebt += oop - paid;
  return oop;
}

function treatmentBills(ctx) {
  for (const c of activeConditions(ctx.state)) {
    const def = CONDITIONS[c.id];
    // Mental-health care plans are billed by MentalHealth (therapy and medication separately).
    if (c.treated && def.annualCost && !c.care) medicalBill(ctx, def.annualCost, def.name, c);
  }
}

function medicalDebtTick(ctx) {
  const { state } = ctx;
  const h = state.health;
  if (h.medicalDebt <= 0) return;
  const payment = Math.min(h.medicalDebt, Math.max(1500, Math.round(h.medicalDebt * 0.1)));
  if (state.finances.cash >= payment) {
    ctx.spend(payment, 'Medical debt payment');
    h.medicalDebt -= payment;
  } else if (!h.collections) {
    h.collections = true;
    ctx.emit('credit:event', { type: 'default' });
    ctx.log(`$${h.medicalDebt.toLocaleString()} in medical bills went to collections.`, '📞', 'bad');
  }
  const income = state.finances.lastYear?.gross ?? 0;
  // Charity care: nonprofit hospitals must run a financial-assistance policy, and most forgive
  // much or all of the bill for patients under about four times the poverty line who apply.
  if (h.medicalDebt >= 5000 && income < 60000 && !h.charityCare && ctx.rng.chance(0.6)) {
    h.charityCare = true;
    const forgiven = Math.round(h.medicalDebt * (income < 30000 ? 1 : ctx.rng.float(0.4, 0.75)));
    h.medicalDebt -= forgiven;
    ctx.log(`You applied for the hospital's financial assistance programme: $${forgiven.toLocaleString()} of your bills ${h.medicalDebt <= 0 ? 'were' : 'was'} written off.`, '🏥', 'good');
  }
  if (h.medicalDebt >= 30000 && h.medicalDebt > income * 0.6 && !yearlyCount(state, 'health.bankruptcyAsked')) {
    bumpYearly(state, 'health.bankruptcyAsked');
    ctx.prompt({
      type: 'health.bankruptcy',
      icon: '⚖️',
      title: 'Buried in Medical Bills',
      text: `You owe $${h.medicalDebt.toLocaleString()} in medical debt — more than you can ever pay on your income.`,
      options: [
        insolvencyHere(state)?.none ? null : { id: 'file', label: '⚖️ File for bankruptcy', hint: insolvencyHere(state)
          ? `${routeName(state, 7)} wipes medical and card debt (non-exempt assets are sold); higher earners go into a ${routeName(state, 13)} instead. Retirement savings are protected.`
          : 'Chapter 7 wipes medical and card debt (non-exempt assets are sold); above the median income it becomes a Chapter 13 plan. Retirement accounts are protected.', tone: 'danger' },
        { id: 'plan', label: '🤝 Negotiate a payment plan', hint: 'Hospitals often settle for less' },
      ].filter(Boolean),
    });
  }
  if (h.medicalDebt <= 0) {
    h.medicalDebt = 0;
    h.collections = false;
    h.charityCare = false;
  }
}

/* ------------------------------------------------------------------ */
/* Disability                                                          */
/* ------------------------------------------------------------------ */

export const disablingConditions = (state) => activeConditions(state).filter((c) => CONDITIONS[c.id].disabling && c.severity >= CONDITIONS[c.id].disabling);
const hasEmployerLtd = (job) => Boolean(job && (job.employer.sector !== 'private' || ['large', 'enterprise'].includes(job.employer.size)));

/** Leave work on disability: LTD, SSDI and disability retirement from any vested pension. */
export function goOnDisability(ctx, why) {
  const { state } = ctx;
  const h = state.health;
  const age = state.character.age;
  const job = state.career.job;
  if (state.military.service) {
    discharge(ctx, 'medical', `A Medical Evaluation Board found you unfit for duty (${why}).`);
    return;
  }
  if (job) {
    if (h.disability.policy || hasEmployerLtd(job)) {
      h.disability.benefits.push({ source: 'ltd', label: 'Long-term disability insurance', annual: Math.round(job.salary * 0.6), endAge: 65 });
    }
    ctx.emit('career:resign', { reason: DISABLING_LABEL });
  } else if (h.disability.policy && state.career.history.length) {
    const last = state.career.history[state.career.history.length - 1];
    h.disability.benefits.push({ source: 'ltd', label: 'Long-term disability insurance', annual: Math.round((last.salary ?? 30000) * 0.6), endAge: 65 });
  }
  // SSDI is an application, not an automatic benefit (see SSDI.js).
  if (age < 67 && !h.disability.benefits.some((b) => b.source === 'ssdi')) ctx.emit('ssdi:apply', { onsetAge: age, why });
  for (const [planId, plan] of Object.entries(state.retirement.plans)) {
    if (plan.started || plan.years < 5) continue;
    plan.started = true;
    const annual = Math.round(highAverage(plan.salaries) * Math.max(0.4, Math.min(0.75, plan.years * 0.02)));
    ctx.emit('retirement:addPension', { pension: { id: `disability_${planId}`, label: `Disability retirement (${planId})`, annual, startAge: age, source: 'disability', cola: 0.02 } });
  }
  const total = h.disability.benefits.reduce((s, b) => s + b.annual, 0);
  ctx.log(`You stopped working on medical disability (${why}).${total ? ` Benefits: $${total.toLocaleString()}/yr.` : ' You had no disability coverage.'}`, '♿', 'warn');
  record(state, `Went on disability: ${why}`);
}

function disabilityTick(ctx) {
  const { state } = ctx;
  const h = state.health;
  const age = state.character.age;
  const stillDisabled = disablingConditions(state).length > 0;
  h.disability.benefits = h.disability.benefits.filter((b) => {
    if (age >= b.endAge || (!stillDisabled && b.source !== 'ssdi') || (!stillDisabled && age < 60 && b.source === 'ssdi')) {
      ctx.log(`${b.label} ended${stillDisabled ? '' : ' — you recovered enough to work'}.`, '♿');
      return false;
    }
    ctx.earn(b.annual, b.label, { ssCovered: false });
    if (b.source === 'ssdi') h.disability.ssdiYears = (h.disability.ssdiYears ?? 0) + 1;
    return true;
  });
  if (h.disability.policy && state.career.job) ctx.spend(Math.round(state.career.job.salary * 0.015), 'Disability insurance premium', { allowDebt: true });

  const disabling = disablingConditions(state);
  if (disabling.length && state.career.job && !state.military.service && !yearlyCount(state, 'health.disablingAsked')) {
    bumpYearly(state, 'health.disablingAsked');
    const names = disabling.map((c) => CONDITIONS[c.id].name.toLowerCase()).join(', ');
    ctx.prompt({
      type: 'health.disabling',
      icon: '♿',
      title: 'Can You Keep Working?',
      text: `Your ${names} has made it nearly impossible to do your job.`,
      options: [
        { id: 'claim', label: '♿ Stop working and claim disability', hint: h.disability.policy || hasEmployerLtd(state.career.job) ? 'Long-term disability pays 60% of salary' : 'No long-term disability policy' },
        { id: 'work', label: '💪 Push through', hint: 'Performance and health suffer' },
      ],
      data: { names },
    });
  }
}

/* ------------------------------------------------------------------ */
/* VA ratings                                                          */
/* ------------------------------------------------------------------ */

export function refreshVaRating(ctx, { announce = false } = {}) {
  const { state } = ctx;
  if (!isVeteran(state)) return;
  const h = state.health;
  const rating = combinedVaRating(h.conditions.filter((c) => c.serviceConnected).map(vaRatingFor));
  if (rating === h.va.rating) {
    if (announce) ctx.log(`The VA confirmed your ${rating}% disability rating.`, '🇺🇸');
    return;
  }
  const before = h.va.rating;
  h.va.rating = rating;
  const annual = VA_COMPENSATION[rating];
  const pensions = state.retirement.pensions;
  const existing = pensions.find((p) => p.id === 'va');
  if (existing && annual) existing.annual = annual;
  else if (existing) pensions.splice(pensions.indexOf(existing), 1);
  else if (annual) ctx.emit('retirement:addPension', { pension: { id: 'va', label: 'VA disability compensation', annual, startAge: state.character.age, source: 'va', cola: 0.025 } });
  ctx.log(`The VA ${before ? 'changed' : 'set'} your service-connected disability rating to ${rating}%${annual ? ` ($${annual.toLocaleString()}/yr, tax-free)` : ''}.`, '🇺🇸', 'milestone');
  record(state, `VA rating ${rating}%`);
}

/* ------------------------------------------------------------------ */
/* Fitness for duty                                                    */
/* ------------------------------------------------------------------ */

/** The condition (if any) that fails your job's medical standard. */
export function dutyDisqualifier(state) {
  const job = state.career.job;
  const standard = state.military.service ? 'military' : DUTY_STANDARD[job?.professionId];
  if (!standard) return null;
  return activeConditions(state).find((c) => {
    const sev = c.severity;
    if (CONDITIONS[c.id].kind === 'addiction') return sev >= 40;
    switch (standard) {
      case 'military': return (c.id === 'ptsd' && !c.treated && sev >= 65) || (['heartDisease', 'cancer', 'backInjury', 'tbi', 'diabetes'].includes(c.id) && sev >= 70);
      case 'protective': return (c.id === 'ptsd' && !c.treated && sev >= 60) || (c.id === 'backInjury' && sev >= 70) || (c.id === 'heartDisease' && sev >= 60) || (c.id === 'tbi' && sev >= 70);
      default: return (c.id === 'heartDisease' && sev >= 50) || (c.id === 'diabetes' && !c.treated) || (c.id === 'ptsd' && !c.treated && sev >= 60) || (c.id === 'tbi' && sev >= 50);
    }
  }) ?? null;
}

function fitnessForDuty(ctx) {
  const { state } = ctx;
  const c = dutyDisqualifier(state);
  if (!c || yearlyCount(state, 'health.dutyAsked')) return;
  bumpYearly(state, 'health.dutyAsked');
  const def = CONDITIONS[c.id];
  const military = Boolean(state.military.service);
  const where = military ? 'your command' : state.career.job.employer.name;
  const addiction = def.kind === 'addiction';
  // In uniform, an addiction is a command referral to the substance abuse program, not a medical board.
  if (military && addiction) {
    ctx.prompt({
      type: 'health.duty',
      icon: '🩺',
      title: 'Substance Abuse Program Referral',
      text: `Your command referred you to the substance abuse program for your ${def.name.toLowerCase()}. Complete treatment and you keep your career; fail it and you face administrative separation.`,
      options: [
        { id: 'treat', label: '🏥 Complete the program', hint: 'Keep your career if treatment works' },
        { id: 'hide', label: '🤐 Downplay it to the counselor', hint: 'If they find out, you are separated', tone: 'danger' },
      ],
      data: { conditionId: c.id },
    });
    return;
  }
  ctx.prompt({
    type: 'health.duty',
    icon: '🩺',
    title: military ? 'Medical Evaluation Board' : 'Fitness-for-Duty Evaluation',
    text: `${where} ordered a fitness-for-duty evaluation. Your ${def.name.toLowerCase()} doesn't meet the medical standard.`,
    options: [
      { id: 'treat', label: addiction ? '🏥 Go to rehab on medical leave' : '🩺 Take medical leave for treatment', hint: 'Keep the job if treatment works' },
      { id: 'hide', label: '🤐 Downplay it to the doctor', hint: 'If they find out, you are fired', tone: 'danger' },
      { id: 'retire', label: military ? '🎗️ Accept medical separation' : '♿ Take a medical retirement', hint: 'Disability benefits and VA/pension where eligible' },
    ],
    data: { conditionId: c.id },
  });
}

/* ------------------------------------------------------------------ */
/* Acute events                                                        */
/* ------------------------------------------------------------------ */

function acuteEvent(ctx) {
  const { state, rng } = ctx;
  const age = state.character.age;
  const chance = 0.035 + (state.stats.fitness < 35 ? 0.015 : 0) + (age > 60 ? 0.025 : 0);
  if (!rng.chance(chance)) return;
  const pool = Object.entries(ACUTE).filter(([, a]) => !a.inflicted && age >= a.minAge && !(a.minAge >= 16 && isIncarcerated(state)));
  const [id, a] = rng.pick(pool);
  // Vaccinated this year: flu and pneumonia mostly pass you by.
  if (['flu', 'pneumonia'].includes(id) && state.health.vaccinatedAge === age - 1 && rng.chance(0.6)) return;
  if (a.trauma) ctx.emit('health:trauma', { amount: a.trauma, source: 'accident' });
  ctx.stat('health', a.health);
  if (a.fitness) ctx.stat('fitness', a.fitness);
  if (a.injury && rng.chance(0.3)) addCondition(ctx, a.injury, { severity: rng.int(25, 55) });
  // Children and prisoners are simply treated.
  if (age < 18 || isIncarcerated(state)) {
    medicalBill(ctx, a.cost, a.name);
    ctx.log(`${a.name}: you were treated and recovered.`, a.icon);
    return;
  }
  const plan = coverage(state);
  const oop = outOfPocket(state, a.cost);
  ctx.prompt({
    type: 'health.acute',
    icon: a.icon,
    title: a.name,
    text: `${a.name === 'Car accident' ? 'You were in a car accident.' : `You came down with ${a.name.toLowerCase()}.`} The ER visit would cost about $${a.cost.toLocaleString()} (${plan.name}: you'd owe ~$${oop.toLocaleString()}).`,
    options: [
      { id: 'treat', label: '🏥 Go to the ER', hint: oop ? `~$${oop.toLocaleString()} out of pocket` : 'Covered' },
      { id: 'wait', label: '🛌 Tough it out at home', hint: a.untreatedDeath >= 0.05 ? 'This could kill you' : 'Slower recovery', tone: a.untreatedDeath >= 0.05 ? 'danger' : undefined },
    ],
    data: { id },
  });
}

/** Age-appropriate screenings a checkup runs. */
export const SCREENINGS = [
  { id: 'bp', name: 'A blood-pressure check', from: 30, to: 120, finds: ['hypertension', 'kidneyDisease'] },
  { id: 'glucose', name: 'A blood-sugar test', from: 40, to: 120, finds: ['diabetes'] },
  { id: 'colon', name: 'Bowel cancer screening', from: 45, to: 75, finds: ['cancer'] },
  { id: 'mammogram', name: 'A mammogram', from: 50, to: 74, gender: 'female', finds: ['cancer'] },
  { id: 'psa', name: 'A PSA test', from: 55, to: 69, gender: 'male', finds: ['cancer'] },
  { id: 'lung', name: 'A low-dose lung CT (for smokers)', from: 50, to: 80, smokers: true, finds: ['cancer', 'copd'] },
  { id: 'bloodborne', name: 'An HIV and hepatitis test', from: 16, to: 120, atRisk: true, finds: ['hiv', 'hepatitisC'] },
  { id: 'memory', name: 'A memory assessment', from: 70, to: 120, finds: ['dementia'] },
];
export function screeningsFor(state) {
  const age = state.character.age;
  const l = state.health?.lifestyle;
  return SCREENINGS.filter((s) => age >= s.from && age <= s.to && (!s.gender || s.gender === state.character.gender) && (!s.smokers || (l && l.smoking !== 'never' && l.packYears >= 20)) && (!s.atRisk || l?.injecting || isIncarcerated(state)));
}

/** An injury someone else did to you (or an overdose): treated in the emergency department. */
export function inflictAcute(ctx, id) {
  const { state, rng } = ctx;
  const a = ACUTE[id];
  if (!a) return;
  if (a.trauma) ctx.emit('health:trauma', { amount: a.trauma, source: 'violence' });
  ctx.stat('health', a.health);
  if (a.fitness) ctx.stat('fitness', a.fitness);
  // Critical injuries kill some people before help arrives.
  if (rng.chance(a.untreatedDeath * 0.15 * (1 + ruralRisk(state)))) return void ctx.die(a.name);
  if (a.injury && rng.chance(0.25)) addCondition(ctx, a.injury, { severity: rng.int(25, 55) });
  const oop = medicalBill(ctx, a.cost, a.name);
  ctx.stat('health', Math.round(-a.health * 0.6));
  ctx.log(`${a.name}: ${isIncarcerated(state) ? 'the prison infirmary' : 'the emergency department'} patched you up${oop ? ` ($${oop.toLocaleString()} out of pocket)` : ''}.`, a.icon, 'bad');
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export const HealthEngine = {
  id: 'health',
  order: 42,

  init(state) {
    state.health ??= {
      conditions: [],
      trauma: 0,
      serviceTrauma: 0,
      medicalDebt: 0,
      collections: false,
      marketplace: true,
      disability: { policy: false, benefits: [], ssdiYears: 0 },
      va: { rating: 0 },
      rehabs: 0,
      boardSuspended: [],
      history: [],
    };
  },

  setup(engine) {
    const { bus } = engine;
    // Free treatment programs (prison RDAP, drug courts): a real shot at recovery.
    bus.on('health:treatAddiction', ({ ctx }) => {
      const c = activeConditions(ctx.state).find((x) => CONDITIONS[x.id].kind === 'addiction');
      if (!c || !ctx.rng.chance(0.4)) return;
      c.remission = true;
      c.treated = false;
      c.severity = 10;
      ctx.log(`The program worked: you're in recovery from ${CONDITIONS[c.id].name.toLowerCase()}.`, '🌱', 'good');
    });
    bus.on('health:trauma', ({ ctx, amount, source }) => {
      const h = ctx.state.health;
      h.trauma = Math.max(0, Math.round(h.trauma + amount));
      if (source === 'combat' || ctx.state.military.service) h.serviceTrauma = Math.round(h.serviceTrauma + amount);
    });
    bus.on('health:injury', ({ ctx, conditionId, severity, serviceConnected }) => addCondition(ctx, conditionId, { severity, serviceConnected }));
    bus.on('health:checkup', ({ ctx }) => {
      const screened = screeningsFor(ctx.state);
      for (const c of activeConditions(ctx.state)) {
        if (c.diagnosed) continue;
        // An age-appropriate screening finds it sooner, before it has done much damage.
        const screen = screened.find((s) => s.finds.includes(c.id));
        if (!ctx.rng.chance(screen ? 0.95 : c.id === 'cancer' ? 0.5 : c.id === 'hiv' || c.id === 'hepatitisC' ? 0.3 : 0.85)) continue;
        if (screen) c.severity = Math.max(5, Math.round(c.severity * 0.7));
        diagnose(ctx, c, screen ? `${screen.name} caught` : 'Your checkup caught');
      }
    });
    // Other systems inflict injuries (a stabbing, a shooting, a beating, an overdose): bill them and treat.
    bus.on('health:acute', ({ ctx, id }) => inflictAcute(ctx, id));
    bus.on('disaster:struck', ({ ctx }) => ctx.emit('health:trauma', { amount: 8, source: 'disaster' }));
    bus.on('military:discharged', ({ ctx, type }) => {
      if (type === 'kia' || type === 'dishonorable') return;
      const h = ctx.state.health;
      if (type === 'medical' && !h.conditions.some((c) => c.serviceConnected && !c.remission)) {
        addCondition(ctx, ctx.rng.pick(['backInjury', 'tbi']), { severity: ctx.rng.int(60, 85), serviceConnected: true, quiet: true });
      }
      // Conditions that began in uniform are service-connected; the VA rates them at separation.
      refreshVaRating(ctx, { announce: true });
    });
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const h = state.health;
    const job = state.career.job;
    // Traumatic exposure: the job, prison, and life's random blows. It fades with time.
    if (job && OCCUPATIONAL_TRAUMA[job.professionId]) ctx.emit('health:trauma', { amount: OCCUPATIONAL_TRAUMA[job.professionId], source: 'work' });
    if (isIncarcerated(state)) ctx.emit('health:trauma', { amount: 6, source: 'prison' });
    if (rng.chance(0.025)) ctx.emit('health:trauma', { amount: rng.int(15, 30), source: 'life' });
    onsets(ctx);
    progress(ctx);
    if (!state.character.alive) return;
    treatmentBills(ctx);
    // Australia: higher earners without private hospital cover pay the Medicare Levy Surcharge.
    const mls = levySurcharge(ctx.state);
    if (mls) ctx.spend(mls, 'Medicare Levy Surcharge', { allowDebt: true });
    acuteEvent(ctx);
    const side = { ...ctx, rng: healthSideRng(state) };
    lifestyleTick(side);
    endOfLifeTick(side);
    fitnessForDuty(ctx);
    disabilityTick(ctx);
    medicalDebtTick(ctx);
    refreshVaRating(ctx);
    h.trauma = Math.round(h.trauma * 0.8);
    h.serviceTrauma = Math.round(Math.min(h.serviceTrauma, h.trauma));
  },

  actions: {
    ...LifestyleActions,
    ...EndOfLifeActions,
    /** The yearly flu jab: cuts the odds of flu and pneumonia this year. */
    fluShot(ctx) {
      const { state } = ctx;
      if (yearlyCount(state, 'health.fluShot')) return ctx.toast('Already vaccinated this year', 'warn');
      bumpYearly(state, 'health.fluShot');
      state.health.vaccinatedAge = state.character.age;
      if (coverage(state).id === 'none') ctx.spend(40, 'Flu vaccine', { allowDebt: true });
      ctx.log('You had your flu jab. A sore arm for a day.', '💉', 'info');
    },
    checkup(ctx) {
      const { state } = ctx;
      if (yearlyCount(state, 'health.checkup')) return ctx.toast('You already had a checkup this year.', 'warn');
      bumpYearly(state, 'health.checkup');
      // Preventive care is free on any ACA-compliant plan.
      const plan = coverage(state);
      if (plan.id === 'none') ctx.spend(350, 'Checkup', { allowDebt: true });
      ctx.stat('health', 2);
      const before = activeConditions(state).filter((c) => !c.diagnosed).length;
      ctx.emit('health:checkup', {});
      const found = before - activeConditions(state).filter((c) => !c.diagnosed).length;
      if (!found) ctx.log('Your annual physical came back clean.', '🩺', 'good');
    },
    /** arg: condition id — start or stop treatment / therapy. */
    treat(ctx, id) {
      const c = getCondition(ctx.state, id);
      if (!c || c.remission || !c.diagnosed) return;
      if (CONDITIONS[id].kind === 'addiction') return ctx.toast('Addiction treatment means rehab.', 'warn');
      if (c.waitUntil != null) return ctx.toast(`You're on the waiting list until age ${c.waitUntil} — or go private.`, 'warn');
      c.treated = !c.treated;
      if (c.treated) {
        queueForTreatment(ctx, c);
        if (!c.treated) return;
      }
      delete c.care; // the generic toggle resets any mental-health plan (MentalHealth assigns a default one)
      ctx.log(c.treated ? `You started ${CONDITIONS[id].kind === 'mental' ? 'therapy and medication' : 'treatment'} for ${CONDITIONS[id].name.toLowerCase()}.` : `You stopped treating your ${CONDITIONS[id].name.toLowerCase()}.`, CONDITIONS[id].icon);
    },
    rehab(ctx, id) {
      const { state, rng } = ctx;
      const c = activeConditions(state).find((x) => x.id === id && CONDITIONS[x.id].kind === 'addiction') ?? activeConditions(state).find((x) => CONDITIONS[x.id].kind === 'addiction');
      if (!c) return ctx.toast('Nothing to go to rehab for.', 'warn');
      if (yearlyCount(state, 'health.rehab')) return ctx.toast('You already went to rehab this year.', 'warn');
      bumpYearly(state, 'health.rehab');
      const h = state.health;
      medicalBill(ctx, REHAB_COST, 'Residential rehab', c);
      h.rehabs += 1;
      ctx.stat('stress', -10);
      const success = rng.chance(clamp(0.38 + Math.min(h.rehabs - 1, 3) * 0.1 + (state.stats.happiness > 50 ? 0.06 : 0) - c.severity / 400, 0.15, 0.85));
      if (success) {
        c.remission = true;
        c.treated = false;
        c.severity = 10;
        ctx.log(`You completed 30 days of residential rehab. You're in recovery from ${CONDITIONS[c.id].name.toLowerCase()}.`, '🌱', 'good');
        record(state, `Recovery: ${CONDITIONS[c.id].name}`);
        ctx.stat('happiness', 8);
        if (h.boardSuspended.length) {
          ctx.emit('credential:reinstate', { ids: h.boardSuspended, reason: 'completed a monitored recovery program' });
          h.boardSuspended = [];
        }
      } else {
        c.severity = Math.max(20, c.severity - 15);
        ctx.log(`You left rehab early. The cravings came back within weeks.`, '🥀', 'bad');
      }
    },
    /** Skip the public waiting list: pay a private clinic. */
    goPrivate(ctx, id) {
      const { state } = ctx;
      const c = getCondition(state, id);
      if (!c || c.waitUntil == null) return;
      const cost = goPrivateCost(state, CONDITIONS[id]);
      if (!ctx.spend(cost, `Private treatment — ${CONDITIONS[id].name}`, { credit: true })) return ctx.toast(`Private treatment costs about $${cost.toLocaleString()}.`, 'warn');
      delete c.waitUntil;
      c.treated = true;
      ctx.log(`You paid to go private and started treatment for your ${CONDITIONS[id].name.toLowerCase()} straight away.`, '🏥', 'good');
    },
    togglePrivateCover(ctx) {
      const h = ctx.state.health;
      const sys = systemHere(ctx.state);
      if (!sys?.private) return ctx.toast('No private top-up insurance here.', 'warn');
      h.privateCover = !h.privateCover;
      ctx.toast(h.privateCover ? `You bought ${sys.private.name}.` : `You cancelled your ${sys.private.name}.`, h.privateCover ? 'good' : 'info');
    },
    toggleMarketplace(ctx) {
      const h = ctx.state.health;
      h.marketplace = !h.marketplace;
      ctx.toast(h.marketplace ? 'You will buy a marketplace plan when nothing else covers you.' : 'You dropped marketplace coverage. You are on your own if uninsured.', h.marketplace ? 'good' : 'warn');
    },
    toggleDisabilityPolicy(ctx) {
      const { state } = ctx;
      const d = state.health.disability;
      if (!d.policy && disablingConditions(state).length) return ctx.toast('Insurers won\'t cover a condition that already disables you.', 'warn');
      d.policy = !d.policy;
      ctx.toast(d.policy ? 'You bought long-term disability insurance (1.5% of salary).' : 'You cancelled your disability policy.', 'info');
    },
    claimDisability(ctx) {
      const disabling = disablingConditions(ctx.state);
      if (!disabling.length) return ctx.toast('Nothing currently disables you from working.', 'warn');
      if (ctx.state.health.disability.benefits.length) return ctx.toast('You are already on disability.', 'warn');
      goOnDisability(ctx, CONDITIONS[disabling[0].id].name.toLowerCase());
    },
    payMedicalDebt(ctx) {
      const { state } = ctx;
      const h = state.health;
      const amount = Math.min(h.medicalDebt, Math.floor(state.finances.cash));
      if (amount <= 0) return ctx.toast(h.medicalDebt ? 'No cash to pay with.' : 'No medical debt.', 'warn');
      ctx.spend(amount, 'Medical debt payoff');
      h.medicalDebt -= amount;
      if (!h.medicalDebt) h.collections = false;
      ctx.log(`You paid $${amount.toLocaleString()} toward medical bills.`, '🧾');
    },
    vaClaim(ctx) {
      if (!isVeteran(ctx.state)) return ctx.toast('Only veterans can file a VA claim.', 'warn');
      refreshVaRating(ctx, { announce: true });
    },
  },

  resolvers: {
    ...LifestyleResolvers,
    ...EndOfLifeResolvers,
    driveDrunk(ctx, _data, optionId) {
      const { rng } = ctx;
      if (optionId === 'ride') {
        ctx.spend(40, 'Taxi home', { allowDebt: true });
        return ctx.log('You took a taxi home. Your car was still there in the morning.', '🚕');
      }
      if (optionId === 'couch') return ctx.log('You slept it off on a friend\'s couch.', '🛋️');
      if (rng.chance(0.15)) {
        ctx.stat('health', -12);
        ctx.log('You drove home drunk and wrapped your car around a pole.', '🚗', 'bad');
      } else ctx.log('You drove home drunk. You don\'t remember the drive.', '🚗', 'warn');
      ctx.emit('legal:offense', { offenseId: 'dui', context: 'driving after drinking', discovery: 0.5, evidence: 0.8 });
      if (!ctx.state.credentials.held.driverLicense || ctx.state.credentials.held.driverLicense.status !== 'active') ctx.emit('legal:offense', { offenseId: 'unlicensed', context: 'driving without a licence', discovery: 0.5, evidence: 0.8 });
    },
    acute(ctx, data, optionId) {
      const { state, rng } = ctx;
      const a = ACUTE[data.id];
      if (optionId === 'treat') {
        // Far from a hospital, the serious ones are a race against the clock.
        const far = a.untreatedDeath >= 0.05 ? ruralRisk(state) : 0;
        if (far) {
          if (rng.chance(a.untreatedDeath * far)) return void ctx.die(`${a.name} (too far from a hospital)`);
          if (far >= 0.3) medicalBill(ctx, 12000, 'Air ambulance');
          ctx.log(far >= 0.3 ? 'The nearest emergency room was too far to drive. A rescue helicopter flew you there.' : 'It was a long drive to the nearest emergency room.', '🚁', 'warn');
        }
        const oop = medicalBill(ctx, a.cost, a.name);
        ctx.stat('health', Math.round(-a.health * 0.9));
        ctx.log(`You were treated for ${a.name.toLowerCase()}${oop ? ` ($${oop.toLocaleString()} out of pocket)` : ''}.`, a.icon);
        return;
      }
      if (rng.chance(a.untreatedDeath)) {
        ctx.die(`${a.name} (untreated)`);
        return;
      }
      ctx.stat('health', Math.round(a.health / 4));
      ctx.log(`You rode out the ${a.name.toLowerCase()} at home. It took a toll.`, a.icon, 'warn');
    },
    duty(ctx, data, optionId) {
      const { state, rng } = ctx;
      const c = getCondition(state, data.conditionId);
      if (!c) return;
      const def = CONDITIONS[c.id];
      if (optionId === 'retire' && !(state.military.service && def.kind === 'addiction')) {
        goOnDisability(ctx, def.name.toLowerCase());
        return;
      }
      if (optionId === 'hide') {
        if (rng.chance(0.35)) {
          ctx.log(`The department's doctor saw through it. Your ${def.name.toLowerCase()} came out.`, '🩺', 'bad');
          if (state.military.service && def.kind === 'addiction') discharge(ctx, 'general', `Separated for failing the substance abuse program (${def.name.toLowerCase()}).`);
          else if (state.military.service) discharge(ctx, 'medical', `Unfit for duty (${def.name.toLowerCase()}).`);
          else ctx.emit('career:resign', { reason: 'Failed fitness-for-duty evaluation', fired: true });
        } else ctx.log('You passed the evaluation. For now.', '🤐', 'warn');
        return;
      }
      ctx.emit('career:adjust', { performance: -5 });
      if (def.kind === 'addiction') {
        HealthEngine.actions.rehab(ctx, c.id);
        return;
      }
      c.treated = true;
      c.diagnosed = true;
      c.severity = Math.max(0, c.severity - 15);
      medicalBill(ctx, def.annualCost / 2, `${def.name} (medical leave)`, c);
      ctx.log(`You took medical leave to treat your ${def.name.toLowerCase()}.`, '🩺');
    },
    disabling(ctx, _data, optionId) {
      const { state } = ctx;
      const c = disablingConditions(state)[0];
      if (optionId === 'claim' && c) goOnDisability(ctx, CONDITIONS[c.id].name.toLowerCase());
      else {
        ctx.emit('career:adjust', { performance: -8 });
        ctx.stat('stress', 8);
        ctx.stat('health', -3);
      }
    },
    bankruptcy(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const h = state.health;
      if (optionId === 'plan') {
        const settled = Math.round(h.medicalDebt * rng.float(0.3, 0.6));
        ctx.log(`The hospital agreed to settle for $${(h.medicalDebt - settled).toLocaleString()}.`, '🤝', 'good');
        h.medicalDebt -= settled;
        return;
      }
      // Chapter 7 if you pass the means test, otherwise a Chapter 13 plan.
      if (!fileBankruptcy(ctx, 7) && !fileBankruptcy(ctx, 13)) ctx.log("A bankruptcy attorney said you can't file right now. The medical bills stay with you.", '⚖️', 'bad');
    },
  },
};
