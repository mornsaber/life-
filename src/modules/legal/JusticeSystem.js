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
import { stateOf, stateIdOf, regionOf } from '../life/Regions.js';
import { PRIVATE_PRISON_SHARE } from '../career/JusticeCareers.js';
import { deathRowTick } from './Prison.js';
import { JUSTICE } from '../world/CountryLaw.js';
import { COUNTRIES } from '../world/Countries.js';
import { STATES } from '../life/States.js';

/** The courts where you live: null in the US (state and federal rules below). */
export const justiceHere = (state) => JUSTICE[state.character.countryId] ?? null;
/** Capital punishment where you live: { status, method, where } or null. */
export function deathPenaltyHere(state) {
  const j = justiceHere(state);
  if (j) return j.death ? { ...j.death, where: COUNTRIES[state.character.countryId].name } : null;
  const st = stateOf(state);
  return st.deathPenalty ? { status: st.deathPenalty, method: 'lethal injection', where: st.name } : null;
}
/** Capital punishment for a death-row prisoner sentenced in `provinceId`. */
export function deathPenaltyIn(provinceId) {
  const cc = STATES[provinceId]?.country;
  if (cc && cc !== 'US') return JUSTICE[cc]?.death ? { ...JUSTICE[cc].death, where: COUNTRIES[cc].name, country: true } : null;
  const st = STATES[provinceId];
  return st?.deathPenalty ? { status: st.deathPenalty, method: 'lethal injection', where: st.name } : null;
}

const STATUTE_OF_LIMITATIONS = 7;

export const FACILITIES = { misdemeanor: 'County Jail', felony: 'State Correctional Institution', federal: 'Federal Correctional Institution' };
const PRIVATE_FACILITY = ['Crossroads Correctional Center', 'Prairie Correctional Facility', 'Red Rock Correctional Center', 'Bayside Detention Center'];

/** Where you serve: county jail for short terms, a state or federal prison — or a privately run one under contract. */
export function assignFacility(state, rng, offense, years) {
  const j = justiceHere(state);
  if (j) {
    const city = regionOf(state).name.split(',')[0];
    if (years <= 1 || offense.severity === 'misdemeanor') return { facility: j.jail(city), kind: 'jail' };
    if (j.privatePrisons && rng.chance(j.privatePrisons)) return { facility: `${rng.pick(PRIVATE_FACILITY)} (privately operated)`, kind: 'private' };
    return { facility: j.prison, kind: 'state' };
  }
  if (offense.federal) return { facility: FACILITIES.federal, kind: 'federal' };
  if (years <= 1 || offense.severity === 'misdemeanor') return { facility: `${regionOf(state).name.split(',')[0]} County Jail`, kind: 'jail' };
  if (rng.chance(PRIVATE_PRISON_SHARE[stateIdOf(state)] ?? 0)) return { facility: `${rng.pick(PRIVATE_FACILITY)} (privately operated)`, kind: 'private' };
  return { facility: FACILITIES.felony, kind: 'state' };
}

/** How the facility itself shapes a year inside. */
export const FACILITY_EFFECTS = {
  jail: { stress: 4, note: 'County jails are built for short stays: no programs, no yard most days.' },
  state: { stress: 0 },
  federal: { stress: -2, happiness: 2, note: 'Federal prison: cleaner, calmer, real education programs.' },
  brig: { stress: -1, note: 'Military confinement: a strict routine, work details and rehabilitation programs.' },
  private: { stress: 3, health: -3, note: 'The private prison ran short-staffed again; lockdowns and fights were routine.' },
};

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
export function commitOffense(ctx, { offenseId, context = '', caught = false, discovery = 0.2, evidence = 0.75, yearsLeft = STATUTE_OF_LIMITATIONS }) {
  const { state } = ctx;
  const abroad = Boolean(state.career.job?.posting);
  if (caught) return charge(ctx, { offenseId, context, evidence, abroad });
  state.legal.investigations.push({ offenseId, context, discovery, evidence, abroad, yearsLeft });
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
  const aid = justiceHere(state)?.legalAid;
  const options = ['plead', 'publicDefender', 'privateAttorney', 'topFirm'].map((id) => ({
    id,
    label: id === 'publicDefender' && aid ? `🧑‍⚖️ Go to trial with a ${aid}` : DEFENSE[id].label,
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
  const fine = Math.round(lowHalf(offense.fine) * (offenseId.toLowerCase().includes('dui') ? stateOf(state).dui.fineMult : 1));
  let prison = offense.prison ? lowHalf(offense.prison) : 0;
  // Other countries jail fewer people for less time (life terms stay life).
  const j = justiceHere(state);
  if (j && prison > 0 && prison < 25) prison = Math.max(offense.severity === 'felony' ? 1 : 0, Math.round(prison * j.sentence));
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
  // A recaptured fugitive also serves the rest of the old sentence.
  const fugitive = state.legal.fugitive;
  if (fugitive && state.character.age >= 18) {
    prison += fugitive.yearsLeft;
    state.legal.fugitive = null;
  }
  if (prison > 0) {
    const placed = abroad ? { facility: 'a foreign prison', kind: 'foreign' } : assignFacility(state, rng, offense, prison);
    const { facility } = placed;
    const inc = { yearsLeft: prison, total: prison, facility, kind: placed.kind, served: 0 };
    state.legal.incarceration = inc;
    // Capital punishment: only for capital crimes, only after a trial, only in states that have it — and rarely even then.
    const dp = deathPenaltyHere(state);
    const death = dp?.status;
    const odds = { active: 0.03, moratorium: 0.02, rare: 0.01 }[death] ?? 0;
    if (!abroad && ((offense.capital && !plea && odds > 0 && rng.chance(odds)) || fugitive?.deathRow)) {
      inc.deathRow = { state: stateIdOf(state), sentencedAge: state.character.age };
      inc.yearsLeft = inc.total = 99;
      inc.facility = `death row in ${dp.where}`;
      state.legal.record[state.legal.record.length - 1].sentence = 'death sentence';
      ctx.log(`${justiceHere(state) ? 'The court' : 'The jury'} sentenced you to death. You were transferred to ${inc.facility}.`, '⛓️', 'death');
    } else ctx.log(`You were taken into custody at ${facility}.`, '🔒', 'death');
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
      const trial = justiceHere(ctx.state)?.trial ?? 'jury';
      ctx.log(trial === 'jury' ? 'The jury returned a guilty verdict.' : trial === 'lay' ? 'The panel of judges and lay judges found you guilty.' : 'The judge found you guilty.', '🧑‍⚖️', 'bad');
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
  if (inc?.deathRow) {
    inc.served += 1;
    ctx.stat('happiness', -6);
    deathRowTick(ctx);
    return;
  }
  if (inc) {
    inc.yearsLeft -= 1;
    inc.served += 1;
    ctx.stat('happiness', -6);
    // Life terms (25+ years) carry no parole.
    const parole = inc.total < 25 && inc.served >= Math.ceil(inc.total / 2) && rng.chance(0.25 + (inc.goodBehavior ?? 0) * 0.1);
    if (inc.yearsLeft <= 0 || parole) {
      legal.incarceration = null;
      legal.probationYears = Math.max(legal.probationYears, 2);
      ctx.log(parole ? 'The parole board granted you early release.' : 'You were released from prison.', '🔓', 'milestone');
      ctx.toast('Released from prison', 'good');
    } else {
      ctx.log(`Year ${inc.served} at ${inc.facility}. ${inc.yearsLeft} to go.`, '🔒', 'bad');
      const fx = FACILITY_EFFECTS[inc.kind];
      if (fx) {
        if (fx.stress) ctx.stat('stress', fx.stress);
        if (fx.happiness) ctx.stat('happiness', fx.happiness);
        if (fx.health) ctx.stat('health', fx.health);
        if (fx.note && rng.chance(0.3)) ctx.log(fx.note, '🔒');
      }
      if (rng.chance(0.35)) {
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
    let discovery = inv.discovery;
    // Revenue departments audit their own staff, and income-tax states audit harder.
    if (inv.offenseId === 'taxEvasion') discovery *= (stateOf(state).incomeTax.length ? 1.3 : 1) * (state.career.job?.professionId === 'revenue' ? 3 : 1);
    if (!charged && rng.chance(discovery)) {
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
