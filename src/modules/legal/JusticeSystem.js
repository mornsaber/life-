/**
 * Justice system: offenses → (immediate arrest | open investigation) →
 * charges → court (plea or trial with the lawyer you can afford) → sentence
 * (fine, probation, prison) → a permanent record.
 *
 * Diplomatic immunity: a Foreign Service officer posted abroad who commits a
 * crime under *host-country* law can invoke immunity. They won't be
 * prosecuted locally — but they'll be recalled, their career takes the hit,
 * the host may declare them persona non grata, and serious offenses can
 * still be prosecuted back home. Offenses against U.S. law (visa fraud,
 * smuggling through the pouch) get no immunity at all.
 *
 * Consequences fan out over the bus (`legal:convicted`, `legal:incarcerated`)
 * so each domain applies its own: licenses revoked, jobs lost, clearances
 * pulled, volunteer memberships ended, military discharge.
 *
 * state.legal = { record[], investigations[], incarceration, probationYears, flags }
 */
import { clamp } from '../../core/Random.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { OFFENSES, DEFENSE, SEVERITY_LABEL } from './Offenses.js';

const STATUTE_OF_LIMITATIONS = 7;

export const FACILITIES = { misdemeanor: 'County Jail', felony: 'State Correctional Institution', federal: 'Federal Correctional Institution' };

function priorCount(state, offenseId) {
  return state.legal.record.filter((r) => r.offenseId === offenseId).length;
}

/** Resolve escalation for repeat offenders (3rd DUI → felony DUI, etc.). */
function effectiveOffense(state, offenseId) {
  const o = OFFENSES[offenseId];
  if (o.escalate && priorCount(state, offenseId) >= o.escalate.after) return o.escalate.to;
  return offenseId;
}

function hasImmunity(state, offense) {
  return Boolean(state.career.job?.posting?.immunity) && !offense.federal;
}

/* ------------------------------------------------------------------ */
/* Entry points                                                        */
/* ------------------------------------------------------------------ */

/**
 * Record an offense. `caught`: arrested on the spot. Otherwise an
 * investigation opens with `discovery` chance per year until the statute of
 * limitations runs out.
 */
export function commitOffense(ctx, { offenseId, context = '', caught = false, discovery = 0.2, evidence = 0.75 }) {
  const { state } = ctx;
  const abroad = Boolean(state.career.job?.posting);
  if (caught) return charge(ctx, { offenseId, context, evidence, abroad });
  state.legal.investigations.push({ offenseId, context, discovery, evidence, abroad, yearsLeft: STATUTE_OF_LIMITATIONS });
}

export function charge(ctx, { offenseId, context, evidence = 0.75, abroad = false }) {
  const { state, rng } = ctx;
  const id = effectiveOffense(state, offenseId);
  const offense = OFFENSES[id];

  if (offense.severity === 'civil') return civilPenalty(ctx, id, context);
  if (offense.severity === 'infraction') {
    const fine = rng.int(...offense.fine);
    ctx.spend(fine, offense.name, { allowDebt: true });
    state.legal.record.push({ offenseId: id, name: offense.name, severity: offense.severity, age: state.character.age, sentence: `$${fine} fine` });
    ctx.log(`You got a ticket for ${offense.name.toLowerCase()}: $${fine}.`, offense.icon, 'warn');
    return;
  }

  if (abroad && hasImmunity(state, offense)) {
    ctx.prompt({
      type: 'legal.immunity',
      icon: '🛂',
      title: 'Diplomatic Immunity',
      text: `Host-country police want to charge you with ${offense.name}${context ? ` (${context})` : ''}.\nAs an accredited diplomat you can invoke immunity under the Vienna Convention.`,
      options: [
        { id: 'invoke', label: '🛂 Invoke diplomatic immunity', hint: 'No local prosecution — expect recall and career fallout' },
        { id: 'waive', label: '⚖️ Waive immunity and face the local court', hint: 'Shows integrity — risks a foreign sentence' },
      ],
      data: { offenseId: id, context, evidence },
    });
    return;
  }
  courtPrompt(ctx, id, context, evidence, abroad);
}

function courtPrompt(ctx, offenseId, context, evidence, abroad) {
  const { state } = ctx;
  const offense = OFFENSES[offenseId];
  const options = ['plead', 'publicDefender', 'privateAttorney', 'topFirm'].map((id) => ({
    id,
    label: DEFENSE[id].label,
    hint: DEFENSE[id].cost ? `$${DEFENSE[id].cost.toLocaleString()} retainer` : id === 'plead' ? 'Certain conviction, lighter sentence' : 'Free',
  }));
  if (hasCredential(state, 'barLicense')) options.push({ id: 'self', label: DEFENSE.self.label, hint: 'Free · risky' });
  ctx.prompt({
    type: 'legal.court',
    icon: '⚖️',
    title: `${SEVERITY_LABEL[offense.severity]} Charge: ${offense.name}`,
    text: `${abroad ? 'You stand before a foreign court. ' : ''}${context ? `${context[0].toUpperCase()}${context.slice(1)}. ` : ''}Prosecutors say the evidence is ${evidence >= 0.8 ? 'overwhelming' : evidence >= 0.6 ? 'strong' : 'circumstantial'}.\nHow do you plead?`,
    options,
    data: { offenseId, context, evidence, abroad },
  });
}

function civilPenalty(ctx, offenseId, context) {
  const { state, rng } = ctx;
  const offense = OFFENSES[offenseId];
  const fine = rng.int(...offense.fine);
  state.legal.record.push({ offenseId, name: offense.name, severity: 'civil', age: state.character.age, sentence: `$${fine.toLocaleString()} settlement paid by employer` });
  ctx.log(`The NLRB found your employer committed an unfair labor practice (${context}). The company paid a $${fine.toLocaleString()} settlement and reinstated the workers with back pay.`, offense.icon, 'bad');
  ctx.emit('career:adjust', { performance: -15, boss: -20, coworkers: -15 });
  if (rng.chance(0.35)) ctx.emit('career:resign', { reason: 'Terminated over the labor-law violation', fired: true });
}

/* ------------------------------------------------------------------ */
/* Sentencing                                                          */
/* ------------------------------------------------------------------ */

function sentence(ctx, offenseId, { plea, abroad }) {
  const { state, rng } = ctx;
  const offense = OFFENSES[offenseId];
  const lowHalf = (range) => (plea ? rng.int(range[0], Math.round((range[0] + range[1]) / 2)) : rng.int(...range));
  const fine = lowHalf(offense.fine);
  let prison = offense.prison ? lowHalf(offense.prison) : 0;
  const probation = offense.probation ?? 0;
  // Repeat misdemeanors and probation violations land you in jail.
  if (offense.severity === 'misdemeanor' && (state.legal.probationYears > 0 || state.legal.record.filter((r) => r.severity !== 'infraction').length >= 2)) prison = Math.max(prison, 1);
  if (state.character.age < 18) prison = 0; // juvenile court: probation instead

  state.legal.record.push({
    offenseId,
    name: offense.name,
    severity: offense.severity,
    age: state.character.age,
    abroad,
    sentence: [fine && `$${fine.toLocaleString()} fine`, prison && `${prison} yr prison`, probation && `${probation} yr probation`].filter(Boolean).join(', '),
  });
  ctx.spend(fine, `${offense.name} fine`, { allowDebt: true });
  ctx.log(`Convicted: ${offense.name}. Sentence: ${state.legal.record[state.legal.record.length - 1].sentence || 'time served'}.`, '⚖️', 'bad');
  ctx.toast(`Convicted: ${offense.name}`, 'bad');
  ctx.stat('happiness', -15);
  ctx.stat('stress', 10);

  ctx.emit('legal:convicted', { offenseId, severity: offense.severity, name: offense.name, jobRelated: Boolean(offense.jobRelated) });
  if (prison > 0) {
    const facility = abroad ? 'a foreign prison' : offense.federal ? FACILITIES.federal : FACILITIES[offense.severity];
    state.legal.incarceration = { yearsLeft: prison, total: prison, facility, served: 0 };
    ctx.log(`You were taken into custody at ${facility}.`, '🔒', 'death');
    ctx.emit('legal:incarcerated', { years: prison });
  }
  state.legal.probationYears = Math.max(state.legal.probationYears, probation);
}

/* ------------------------------------------------------------------ */
/* Resolvers & yearly tick                                             */
/* ------------------------------------------------------------------ */

export const JusticeResolvers = {
  court(ctx, data, optionId) {
    const { rng } = ctx;
    const defense = DEFENSE[optionId];
    if (defense.cost) ctx.spend(defense.cost, `Legal fees (${defense.label.slice(2).trim()})`, { allowDebt: true });
    if (optionId === 'plead') return sentence(ctx, data.offenseId, { plea: true, abroad: data.abroad });
    const smartsEdge = optionId === 'self' ? (ctx.state.stats.smarts - 60) / 200 : 0;
    const convict = rng.chance(clamp(data.evidence * defense.factor - smartsEdge, 0.05, 0.95));
    if (convict) {
      ctx.log('The jury returned a guilty verdict.', '🧑‍⚖️', 'bad');
      sentence(ctx, data.offenseId, { plea: false, abroad: data.abroad });
    } else {
      ctx.log(`Not guilty! You were acquitted of ${OFFENSES[data.offenseId].name}.`, '🧑‍⚖️', 'good');
      ctx.toast('Acquitted!', 'good');
      ctx.stat('happiness', 8);
    }
  },

  immunity(ctx, data, optionId) {
    const { rng } = ctx;
    const offense = OFFENSES[data.offenseId];
    if (optionId === 'waive') {
      ctx.log('You waived diplomatic immunity. The Department quietly noted your integrity.', '⚖️');
      ctx.emit('career:adjust', { performance: -5, boss: 2 });
      return courtPrompt(ctx, data.offenseId, data.context, data.evidence, true);
    }
    ctx.log(`You invoked diplomatic immunity. The host government declared you persona non grata and the State Department recalled you.`, '🛂', 'bad');
    ctx.toast('Recalled to Washington', 'bad');
    ctx.emit('career:posting', { posting: null });
    ctx.emit('region:relocate', { regionId: 'dc', reason: 'You were recalled from post.' });
    ctx.emit('career:adjust', { performance: -25, boss: -25 });
    ctx.stat('happiness', -10);
    if (offense.severity === 'felony') {
      if (rng.chance(0.5)) ctx.emit('career:resign', { reason: 'Separated for cause after the incident abroad', fired: true });
      if (rng.chance(0.3)) {
        ctx.log('Back home, the Justice Department decided to prosecute the case itself.', '🇺🇸', 'bad');
        courtPrompt(ctx, data.offenseId, data.context, data.evidence * 0.8, false);
      }
    }
  },

  prisonEvent(ctx, _data, optionId) {
    const { state, rng } = ctx;
    const inc = state.legal.incarceration;
    if (!inc) return;
    if (optionId === 'ged') {
      ctx.emit('education:grantDiploma', { type: 'ged', note: 'You earned your GED behind bars. 🎓' });
      inc.goodBehavior = (inc.goodBehavior ?? 0) + 1;
    } else if (optionId === 'work') {
      ctx.earn(600, 'Prison job wages');
      inc.goodBehavior = (inc.goodBehavior ?? 0) + 1;
      ctx.log('You worked in the prison kitchen for $0.50/hour.', '🍲');
    } else if (optionId === 'fight') {
      ctx.stat('health', -rng.int(5, 20));
      if (rng.chance(0.5)) {
        inc.yearsLeft += 1;
        ctx.log('You got written up for fighting. A year was added to your sentence.', '👊', 'bad');
      } else ctx.log('You stood your ground. Nobody bothers you now.', '👊');
    } else {
      ctx.stat('fitness', 6);
      ctx.log('You spent every free hour in the yard working out.', '🏋️');
    }
  },
};

export function justiceTick(ctx) {
  const { state, rng } = ctx;
  const legal = state.legal;

  // Prison
  const inc = legal.incarceration;
  if (inc) {
    inc.yearsLeft -= 1;
    inc.served += 1;
    ctx.stat('happiness', -6);
    const parole = inc.served >= Math.ceil(inc.total / 2) && rng.chance(0.25 + (inc.goodBehavior ?? 0) * 0.1);
    if (inc.yearsLeft <= 0 || parole) {
      legal.incarceration = null;
      legal.probationYears = Math.max(legal.probationYears, 2);
      ctx.log(parole ? 'The parole board granted you early release.' : 'You were released from prison.', '🔓', 'milestone');
      ctx.toast('Released from prison', 'good');
    } else {
      ctx.log(`Year ${inc.served} at ${inc.facility}. ${inc.yearsLeft} to go.`, '🔒', 'bad');
      if (rng.chance(0.6)) {
        const hasDiploma = state.education.degrees.some((d) => d.type === 'highschool');
        ctx.prompt({
          type: 'legal.prisonEvent',
          icon: '🔒',
          title: 'Life Inside',
          text: 'How do you spend this year?',
          options: [
            hasDiploma ? { id: 'work', label: '🍲 Take a prison job' } : { id: 'ged', label: '🎓 Study for your GED' },
            { id: 'yard', label: '🏋️ Lift weights in the yard' },
            { id: 'fight', label: '👊 Stand up to the yard bully', tone: 'danger' },
          ],
        });
      }
    }
    return;
  }
  if (legal.probationYears > 0) legal.probationYears -= 1;

  // Open investigations: at most one case breaks per year.
  const open = legal.investigations;
  legal.investigations = [];
  let charged = false;
  for (const inv of open) {
    if (!charged && rng.chance(inv.discovery)) {
      charged = true;
      ctx.log(`Investigators uncovered your past misconduct: ${OFFENSES[inv.offenseId].name}${inv.context ? ` (${inv.context})` : ''}.`, '🕵️', 'bad');
      if (OFFENSES[inv.offenseId].jobRelated && state.career.job) ctx.emit('career:resign', { reason: 'Terminated pending criminal investigation', fired: true });
      charge(ctx, { offenseId: inv.offenseId, context: inv.context, evidence: inv.evidence, abroad: inv.abroad });
      continue;
    }
    inv.yearsLeft -= 1;
    if (inv.yearsLeft > 0) legal.investigations.push(inv);
    else ctx.log(`The statute of limitations quietly ran out on your ${OFFENSES[inv.offenseId].name.toLowerCase()}.`, '⌛', 'muted');
  }
}
