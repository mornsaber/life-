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
import { COUNTRIES, priceLevel } from '../world/Countries.js';
import { STATES } from '../life/States.js';
import { knob } from '../../core/Difficulty.js';
import { juvenileCourt } from './JuvenileCourt.js';
import { drugLawHere, corruptionHere } from '../crime/CrimeWorld.js';

/**
 * Hooks the crime modules set (crime/index.js), so they can shape what happens without the
 * justice system importing them: openCase turns a new investigation into a visible case;
 * onArrest can intercept an arrest on the spot (a bribe in a corrupt country) and returns true
 * when it has dealt with it.
 */
const HOOKS = { openCase: null, onArrest: null };
export const setJusticeHooks = (h) => Object.assign(HOOKS, h);

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
  juvenile: { stress: 3, note: 'Youth detention: school in the morning, fights in the afternoon, and counsellors who mostly mean well.' },
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
  if (caught) {
    if (!abroad && HOOKS.onArrest?.(ctx, { offenseId, context, evidence })) return undefined;
    return charge(ctx, { offenseId, context, evidence, abroad });
  }
  const inv = { offenseId, context, discovery, evidence, abroad, yearsLeft };
  HOOKS.openCase?.(ctx, inv);
  state.legal.investigations.push(inv);
  return inv;
}

export function charge(ctx, { offenseId, context, evidence = 0.75, abroad = false }) {
  const { state, rng } = ctx;
  const id = effectiveOffense(state, offenseId);
  const offense = OFFENSES[id];

  if (offense.severity === 'civil') return civilPenalty(ctx, id, context);
  if (offense.severity === 'infraction') {
    const fine = Math.round(rng.int(...offense.fine) * priceLevel(state));
    ctx.spend(fine, offense.name, { allowDebt: true });
    state.legal.record.push({ offenseId: id, name: offense.name, severity: offense.severity, age: state.character.age, sentence: `$${fine} fine` });
    ctx.log(`You got a ticket for ${offense.name.toLowerCase()}: $${fine}.`, offense.icon, 'warn');
    return;
  }

  // Children go to the youth court (unless prosecutors move a serious case to adult court).
  if (state.character.age < 18 && !abroad && juvenileCourt(ctx, { offenseId: id, context, evidence })) return;

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
  // A felony at home is a case with stages: the arraignment (plead, or pick counsel), bail, a plea offer, trial, sentencing, appeal.
  const q = state.prompts.at(-1);
  if (q?.type === 'legal.court' && offense.severity === 'felony' && !abroad && state.character.age >= 18) q.data = { ...q.data, felonyCase: true };
}

/* ------------------------------------------------------------------ */
/* A felony case, stage by stage                                       */
/* ------------------------------------------------------------------ */

const money0 = (state, n) => Math.round(n * priceLevel(state));
function bailPrompt(ctx, data) {
  const { state } = ctx;
  const { offenseId, context } = data;
  const offense = OFFENSES[offenseId];
  const bail = money0(state, offense.capital ? 1000000 : (offense.prison?.[1] ?? 2) >= 10 ? 250000 : 25000);
  const remand = offense.capital || justiceHere(state)?.remand === 'strict';
  ctx.prompt({ type: 'legal.bail', icon: '🔐', title: 'The Bail Hearing', text: `You were arrested and charged with ${offense.name}${context ? ` (${context})` : ''}. ${remand ? 'The prosecution asks that you be held until trial.' : `The judge set bail at $${bail.toLocaleString()}.`}`, options: [
    ...(remand ? [] : [{ id: 'pay', label: `💵 Post bail ($${bail.toLocaleString()}, back if you show up)` }, { id: 'bond', label: `🏦 Use a bail bondsman ($${Math.round(bail / 10).toLocaleString()}, not refundable)` }]),
    { id: 'custody', label: remand ? '🔒 Remanded in custody until trial' : '🔒 Stay in jail until trial', hint: 'You may lose your job; the time counts' },
  ], data: { ...data, bail } });
}

/** The prosecutor's offer: a lesser plea for a lighter sentence. */
function offerPrompt(ctx, data) {
  const offense = OFFENSES[data.offenseId];
  // Where the courts are for sale, someone always knows someone.
  const corrupt = corruptionHere(ctx.state);
  const fix = corrupt >= 0.5 ? [{ id: 'fix', label: `💰 Pay to make the file disappear ($${money0(ctx.state, 20000 * (offense.prison?.[1] ?? 3)).toLocaleString()})`, tone: 'danger', illegal: 'bribery of a judicial officer', hint: 'Your lawyer knows a clerk who knows the judge' }] : [];
  ctx.prompt({ type: 'legal.offer', icon: '🤝', title: 'A Plea Offer', text: `The prosecutor offers a deal: plead guilty to a reduced count of ${offense.name.toLowerCase()} and they will ask for about half the usual sentence. ${data.evidence >= 0.8 ? 'Your lawyer says the evidence is strong.' : data.evidence >= 0.6 ? 'Your lawyer calls the case "winnable, but risky".' : 'Your lawyer thinks their case is thin.'}`, options: [
    { id: 'accept', label: '✍️ Take the deal', hint: 'Certain conviction, about half the time' },
    { id: 'counter', label: '🗣️ Have your lawyer push for better', hint: 'Better counsel, better odds' },
    { id: 'trial', label: '⚖️ Reject it: go to trial' },
    ...fix,
  ], data });
}

function trialPrompt(ctx, data) {
  ctx.prompt({ type: 'legal.trial', icon: '🧑‍⚖️', title: 'The Trial', text: `The trial of the year, as far as you are concerned. ${justiceHere(ctx.state)?.trial === 'judge' ? 'A judge alone will decide.' : 'Twelve strangers will decide.'} What is your defence's strategy?`, options: [
    { id: 'suppress', label: '📑 Attack the evidence (motion to suppress)', hint: 'Can gut the case; depends on your lawyer' },
    { id: 'testify', label: '🎤 Take the stand yourself', hint: 'Persuasive or a disaster' },
    { id: 'witnesses', label: '👥 Character witnesses and an alibi' },
    { id: 'silent', label: '🤐 Say nothing: make them prove it' },
  ], data });
}

function verdict(ctx, data, edge) {
  const { state, rng } = ctx;
  const defense = DEFENSE[data.defense] ?? DEFENSE.publicDefender;
  const smarts = data.defense === 'self' ? (state.stats.smarts - 60) / 200 : 0;
  const convict = rng.chance(clamp(data.evidence * defense.factor - smarts - edge, 0.03, 0.95));
  if (!convict) {
    ctx.log(`Not guilty! You were acquitted of ${OFFENSES[data.offenseId].name}.`, '🧑‍⚖️', 'good');
    ctx.toast('Acquitted!', 'good');
    ctx.stat('happiness', 10);
    if (data.custody) ctx.log('You walked out of the courtroom free, after months inside awaiting trial.', '🚪', 'info');
    return;
  }
  const trial = justiceHere(state)?.trial ?? 'jury';
  ctx.log(trial === 'jury' ? 'The jury returned a guilty verdict.' : 'The court found you guilty.', '🧑‍⚖️', 'bad');
  ctx.prompt({ type: 'legal.sentencing', icon: '⚖️', title: 'Sentencing', text: 'Before the judge passes sentence, you may speak.', options: [
    { id: 'remorse', label: '🙇 Express remorse and accept responsibility', hint: 'Lighter sentence' },
    { id: 'letters', label: '✉️ Letters from family, employers and your community' },
    { id: 'innocent', label: '✊ Maintain your innocence', hint: 'Keeps an appeal credible; heavier sentence' },
  ], data });
}

function appealPrompt(ctx, data) {
  const { state } = ctx;
  if (!state.legal.incarceration) return;
  const cost = money0(state, data.defense === 'topFirm' ? 150000 : 40000);
  ctx.prompt({ type: 'legal.appeal', icon: '📜', title: 'An Appeal?', text: `Your lawyers think there are grounds to appeal${data.innocent ? ', and you never admitted guilt' : ''}. It will cost about $${cost.toLocaleString()} and take a year or two.`, options: [
    { id: 'appeal', label: '📜 Appeal the conviction', hint: 'Most appeals fail' },
    { id: 'accept', label: '🙇 Serve the sentence' },
  ], data: { ...data, cost } });
}

function courtPrompt(ctx, offenseId, context, evidence, abroad) {
  const { state } = ctx;
  const offense = OFFENSES[offenseId];
  const aid = justiceHere(state)?.legalAid;
  const options = ['plead', 'publicDefender', 'privateAttorney', 'topFirm'].map((id) => ({
    id,
    label: id === 'publicDefender' && aid ? `🧑‍⚖️ Go to trial with a ${aid}` : DEFENSE[id].label,
    hint: DEFENSE[id].cost ? `$${Math.round(DEFENSE[id].cost * priceLevel(state)).toLocaleString()} retainer` : id === 'plead' ? 'Certain conviction, lighter sentence' : 'Free',
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

function sentence(ctx, offenseId, { plea, abroad, factor = 1 }) {
  const { state, rng } = ctx;
  const offense = OFFENSES[offenseId];
  const lowHalf = (range) => (plea ? rng.int(range[0], Math.round((range[0] + range[1]) / 2)) : rng.int(...range));
  // Fines and fees are set in local money: scaled to the country's wage level.
  const fine = Math.round(lowHalf(offense.fine) * (offenseId.toLowerCase().includes('dui') ? stateOf(state).dui.fineMult : 1) * priceLevel(state));
  let prison = offense.prison ? Math.round(lowHalf(offense.prison) * factor) : 0;
  // Other countries jail fewer people for less time (life terms stay life).
  const j = justiceHere(state);
  if (j && prison > 0 && prison < 25) prison = Math.max(offense.severity === 'felony' ? 1 : 0, Math.round(prison * j.sentence));
  // Drug supply is punished by the country's own drug laws.
  const drugLaw = offense.drug ? drugLawHere(state) : null;
  if (drugLaw && prison > 0) prison = Math.max(1, Math.round(prison * drugLaw.mult));
  const probation = offense.probation ?? 0;
  // Repeat misdemeanors and probation violations land you in jail.
  if (offense.severity === 'misdemeanor' && (state.legal.probationYears > 0 || state.legal.record.filter((r) => r.severity !== 'infraction').length >= 2)) prison = Math.max(prison, 1);
  // A child tried as an adult serves an adult term (capped below life); otherwise the youth court decides.
  const minor = state.character.age < 18;
  if (minor && !state.legal.flags.tryAsAdult) prison = 0;
  if (minor) prison = Math.min(prison, 20);
  delete state.legal.flags.tryAsAdult;

  state.legal.record.push({
    offenseId,
    name: offense.name,
    severity: offense.severity,
    age: state.character.age,
    abroad,
    ...(minor ? { triedAsAdult: true } : {}),
    ...(offense.registry ? { registry: true } : {}),
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
    const capital = offense.capital || (drugLaw?.death && offense.drug === 'trafficking');
    if (!abroad && !minor && ((capital && !plea && odds > 0 && rng.chance(drugLaw?.death ? odds * 4 : odds)) || fugitive?.deathRow)) {
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
    if (defense.cost) ctx.spend(Math.round(defense.cost * priceLevel(ctx.state)), `Legal fees (${defense.label.slice(2).trim()})`, { allowDebt: true });
    if (optionId === 'plead') return sentence(ctx, data.offenseId, { plea: true, abroad: data.abroad, factor: data.custody ? 0.85 : 1 });
    // A felony case goes on: the prosecutor's offer, then (if you refuse) the trial.
    if (data.felonyCase) return bailPrompt(ctx, { ...data, defense: optionId });
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

  bail(ctx, data, optionId) {
    const { state, rng } = ctx;
    if (optionId === 'pay' && !ctx.spend(data.bail, 'Bail (returned if you appear)', { allowDebt: false })) optionId = 'bond';
    if (optionId === 'pay') { ctx.earn(data.bail, 'Bail returned'); ctx.log('You posted bail and went home to wait for trial.', '💵', 'info'); }
    else if (optionId === 'bond') { ctx.spend(Math.round(data.bail / 10), 'Bail bondsman\'s fee', { allowDebt: true }); ctx.log('A bondsman put up your bail for a ten per cent fee you will never see again.', '🏦', 'info'); }
    else {
      ctx.stat('happiness', -12);
      ctx.log('You waited for trial in a county jail cell.', '🔒', 'bad');
      if (state.career.job && rng.chance(0.5)) ctx.emit('career:resign', { reason: 'Jailed awaiting trial', fired: true });
    }
    return offerPrompt(ctx, { ...data, custody: optionId === 'custody' });
  },
  offer(ctx, data, optionId) {
    const { rng } = ctx;
    if (optionId === 'fix') {
      const cost = money0(ctx.state, 20000 * (OFFENSES[data.offenseId].prison?.[1] ?? 3));
      ctx.spend(cost, 'An envelope for the court', { allowDebt: true });
      if (rng.chance(corruptionHere(ctx.state) * 0.85)) return ctx.log('A week later the case file was "lost". The charges were dropped for want of evidence.', '💰', 'warn');
      ctx.log('The clerk was an anti-corruption informant. Now there are two cases against you.', '💰', 'bad');
      commitOffense(ctx, { offenseId: 'judicialBribery', discovery: 0.9, evidence: 0.9, context: 'a recorded payment to a court clerk', yearsLeft: 3 });
    }
    if (optionId === 'accept') return sentence(ctx, data.offenseId, { plea: true, abroad: false, factor: 0.5 * (data.custody ? 0.85 : 1) });
    if (optionId === 'counter') {
      const good = rng.chance({ topFirm: 0.7, privateAttorney: 0.5, self: 0.4 }[data.defense] ?? 0.25);
      if (good) {
        ctx.log('Your lawyer got the charge reduced: a plea to a lesser count, and a much shorter sentence.', '🤝', 'good');
        return sentence(ctx, data.offenseId, { plea: true, abroad: false, factor: 0.3 });
      }
      ctx.log('The prosecutor withdrew the offer. It\'s trial.', '🤝', 'warn');
    }
    return trialPrompt(ctx, data);
  },
  trial(ctx, data, optionId) {
    const { state, rng } = ctx;
    const counsel = { topFirm: 0.25, privateAttorney: 0.15, self: 0.1 }[data.defense] ?? 0.06;
    let edge = 0;
    if (optionId === 'suppress') {
      if (rng.chance(counsel + 0.1)) { edge = 0.3; ctx.log('The judge threw out the key evidence: an unlawful search. The prosecution\'s case is in pieces.', '📑', 'good'); } else ctx.log('The motion to suppress failed.', '📑', 'info');
    } else if (optionId === 'testify') {
      const good = rng.chance(0.4 + (state.stats.smarts - 50) / 200 + (state.stats.looks - 50) / 300);
      edge = good ? 0.15 : -0.15;
      ctx.log(good ? 'On the stand you were calm and believable.' : 'Cross-examination took you apart.', '🎤', good ? 'good' : 'bad');
    } else if (optionId === 'witnesses') edge = 0.06;
    return verdict(ctx, data, edge);
  },
  sentencing(ctx, data, optionId) {
    const factor = { remorse: 0.75, letters: 0.85, innocent: 1.15 }[optionId] ?? 1;
    sentence(ctx, data.offenseId, { plea: false, abroad: false, factor: factor * (data.custody ? 0.85 : 1) });
    return appealPrompt(ctx, { ...data, innocent: optionId === 'innocent' });
  },
  appeal(ctx, data, optionId) {
    const { state, rng } = ctx;
    if (optionId !== 'appeal') return undefined;
    ctx.spend(data.cost, 'Appeal (legal fees)', { allowDebt: true });
    const odds = ({ topFirm: 0.2, privateAttorney: 0.12, self: 0.08 }[data.defense] ?? 0.07) + (data.innocent ? 0.04 : 0) + (data.evidence < 0.6 ? 0.08 : 0);
    if (!rng.chance(odds)) return ctx.log('The appeals court upheld your conviction.', '📜', 'bad');
    const rec = [...state.legal.record].reverse().find((r) => r.offenseId === data.offenseId);
    if (rec) state.legal.record = state.legal.record.filter((r) => r !== rec);
    state.legal.incarceration = null;
    ctx.stat('happiness', 20);
    return ctx.log('The appeals court overturned your conviction. You walked out a free person, the record wiped.', '📜', 'milestone');
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
    let discovery = inv.discovery * knob(state, 'justice');
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
