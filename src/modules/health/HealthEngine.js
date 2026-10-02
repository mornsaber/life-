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
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, isIncarcerated } from '../../core/State.js';
import { ACUTE, CONDITIONS, BOARD_LICENSES, REHAB_COST, activeConditions, getCondition, vaRatingFor, combinedVaRating, VA_COMPENSATION } from './Conditions.js';
import { coverage, outOfPocket } from './Insurance.js';
import { primaryInsuranceAmount } from '../retirement/RetirementEngine.js';
import { highAverage } from '../retirement/PensionPlans.js';
import { discharge } from '../military/MilitaryEngine.js';

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
  return c;
}

function diagnose(ctx, c, how) {
  const def = CONDITIONS[c.id];
  c.diagnosed = true;
  c.treated = true;
  ctx.log(`${how} ${def.name} — ${c.severity >= 60 ? 'caught late' : 'caught early'}. You started treatment.`, def.icon, c.severity >= 60 ? 'bad' : 'warn');
  record(ctx.state, `Diagnosed: ${def.name}`);
}

/** Yearly onset probability for each condition. */
function onsetChance(state, id, h) {
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
    default: return 0;
  }
}

function onsets(ctx) {
  const { state, rng } = ctx;
  const h = state.health;
  for (const id of ['hypertension', 'diabetes', 'heartDisease', 'cancer', 'arthritis', 'asthma', 'depression', 'anxiety', 'ptsd', 'alcohol', 'opioids', 'gambling']) {
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
  if (def.dui && state.character.age >= 16 && rng.chance(def.dui * (c.severity / 60))) {
    ctx.emit('legal:offense', { offenseId: 'dui', context: 'driving after drinking', discovery: 0.6, evidence: 0.8 });
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
    if (c.treated && def.annualCost) medicalBill(ctx, def.annualCost, def.name, c);
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
  if (h.medicalDebt >= 30000 && h.medicalDebt > income * 0.6 && !yearlyCount(state, 'health.bankruptcyAsked')) {
    bumpYearly(state, 'health.bankruptcyAsked');
    ctx.prompt({
      type: 'health.bankruptcy',
      icon: '⚖️',
      title: 'Buried in Medical Bills',
      text: `You owe $${h.medicalDebt.toLocaleString()} in medical debt — more than you can ever pay on your income.`,
      options: [
        { id: 'file', label: '⚖️ File Chapter 7 bankruptcy', hint: 'Wipes medical and card debt; brokerage accounts go to creditors; retirement accounts and your home are protected', tone: 'danger' },
        { id: 'plan', label: '🤝 Negotiate a payment plan', hint: 'Hospitals often settle for less' },
      ],
    });
  }
  if (h.medicalDebt <= 0) {
    h.medicalDebt = 0;
    h.collections = false;
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
  if (state.retirement.ssEarnings.length >= 5 && age < 67 && !h.disability.benefits.some((b) => b.source === 'ssdi')) {
    h.disability.benefits.push({ source: 'ssdi', label: 'Social Security Disability (SSDI)', annual: primaryInsuranceAmount(state.retirement.ssEarnings) * 12, endAge: 67 });
  }
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
  ctx.prompt({
    type: 'health.duty',
    icon: '🩺',
    title: military ? 'Medical Evaluation Board' : 'Fitness-for-Duty Evaluation',
    text: `${where} ordered a fitness-for-duty evaluation. Your ${def.name.toLowerCase()} doesn't meet the medical standard.`,
    options: [
      { id: 'treat', label: def.kind === 'addiction' ? '🏥 Go to rehab on medical leave' : '🩺 Take medical leave for treatment', hint: 'Keep the job if treatment works' },
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
  const pool = Object.entries(ACUTE).filter(([, a]) => age >= a.minAge && !(a.minAge >= 16 && isIncarcerated(state)));
  const [id, a] = rng.pick(pool);
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
    bus.on('health:trauma', ({ ctx, amount, source }) => {
      const h = ctx.state.health;
      h.trauma = Math.round(h.trauma + amount);
      if (source === 'combat' || ctx.state.military.service) h.serviceTrauma = Math.round(h.serviceTrauma + amount);
    });
    bus.on('health:injury', ({ ctx, conditionId, severity, serviceConnected }) => addCondition(ctx, conditionId, { severity, serviceConnected }));
    bus.on('health:checkup', ({ ctx }) => {
      for (const c of activeConditions(ctx.state)) if (!c.diagnosed && ctx.rng.chance(c.id === 'cancer' ? 0.7 : 0.9)) diagnose(ctx, c, 'Your checkup caught');
    });
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
    acuteEvent(ctx);
    fitnessForDuty(ctx);
    disabilityTick(ctx);
    medicalDebtTick(ctx);
    refreshVaRating(ctx);
    h.trauma = Math.round(h.trauma * 0.8);
    h.serviceTrauma = Math.round(Math.min(h.serviceTrauma, h.trauma));
  },

  actions: {
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
      c.treated = !c.treated;
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
    acute(ctx, data, optionId) {
      const { state, rng } = ctx;
      const a = ACUTE[data.id];
      if (optionId === 'treat') {
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
      if (optionId === 'retire') {
        goOnDisability(ctx, def.name.toLowerCase());
        return;
      }
      if (optionId === 'hide') {
        if (rng.chance(0.35)) {
          ctx.log(`The department's doctor saw through it. Your ${def.name.toLowerCase()} came out.`, '🩺', 'bad');
          if (state.military.service) discharge(ctx, 'medical', `Unfit for duty (${def.name.toLowerCase()}).`);
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
      const f = state.finances;
      const inv = state.investing;
      const seized = inv ? Object.values(inv.holdings).reduce((s, x) => s + x.value, 0) : 0;
      if (inv) inv.holdings = {};
      ctx.log(`You filed for Chapter 7 bankruptcy. $${(h.medicalDebt + Math.max(0, -f.cash)).toLocaleString()} in debt was discharged${seized ? `; the trustee liquidated $${seized.toLocaleString()} of brokerage holdings` : ''}. Retirement accounts and your home were protected.`, '⚖️', 'bad');
      h.medicalDebt = 0;
      h.collections = false;
      f.cash = Math.max(0, f.cash);
      f.bankruptcies += 1;
      ctx.emit('credit:event', { type: 'bankruptcy' });
      ctx.stat('happiness', -10);
      ctx.stat('stress', -5);
    },
  },
};
