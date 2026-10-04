/**
 * Military justice for the player (UCMJ). Misconduct goes to your commander,
 * who can drop it, impose non-judicial punishment (Article 15 / captain's
 * mast / office hours) or prefer charges. You can refuse an Article 15 and
 * demand a court-martial: a summary court for minor cases, a special court
 * (up to a year in the brig and a bad-conduct discharge) or a general court
 * (years in the brig and a dishonorable discharge).
 *
 * Court-martial convictions (special and general) are federal convictions on
 * your legal record; confinement of a year or more is served in a military
 * prison through the legal system's incarceration, after a punitive discharge.
 *
 * svc.njp = [{ age, offense, punishment }], svc.reprimand (officers: a career
 * killer at boards), svc.courtsMartial.
 */
import { clamp } from '../../core/Random.js';
import { OFFENSES } from '../legal/Offenses.js';
import { rankOf, rankTitles, discharge, monthlyBasePay, BRANCHES } from './MilitaryEngine.js';

/**
 * Military offenses. `record` is the legal-record offense a conviction at a
 * special or general court-martial produces; `court` the forum charges go to
 * when they're too serious for an Article 15 (or the accused refuses one).
 */
export const UCMJ_OFFENSES = {
  awol: { article: 86, name: 'Absence without leave', record: 'ucmjAwol', njp: true, court: 'special', evidence: 0.85 },
  disobey: { article: 92, name: 'Failure to obey an order or regulation', record: 'ucmjDisobey', njp: true, court: 'special', evidence: 0.8 },
  dereliction: { article: 92, name: 'Dereliction of duty', record: 'ucmjDisobey', njp: true, court: 'summary', evidence: 0.75 },
  maltreatment: { article: 93, name: 'Maltreatment of a subordinate (hazing)', record: 'ucmjMaltreatment', njp: true, court: 'special', evidence: 0.7 },
  falseStatement: { article: 107, name: 'False official statement', record: 'ucmjFalseStatement', njp: true, court: 'general', evidence: 0.75 },
  drugs: { article: '112a', name: 'Wrongful use of a controlled substance', record: 'ucmjDrugs', njp: true, court: 'special', evidence: 0.9, separate: true },
  drunkOnDuty: { article: 112, name: 'Drunk on duty', record: 'ucmjDisobey', njp: true, court: 'summary', evidence: 0.8 },
  dui: { article: 113, name: 'Drunken operation of a vehicle', record: 'ucmjDui', njp: true, court: 'special', evidence: 0.85 },
  larceny: { article: 121, name: 'Larceny of military property', record: 'ucmjLarceny', njp: false, court: 'general', evidence: 0.75 },
  assault: { article: 128, name: 'Aggravated assault', record: 'ucmjAssault', njp: false, court: 'general', evidence: 0.75 },
  fraternization: { article: 134, name: 'Fraternization', record: 'ucmjFraternization', njp: true, court: 'special', evidence: 0.65, officerOnly: false },
};

export const COURTS = {
  summary: { name: 'Summary Court-Martial', maxBrigMonths: 1, discharge: null, record: false, enlistedOnly: true },
  special: { name: 'Special Court-Martial', maxBrigMonths: 12, discharge: 'bcd', record: true },
  general: { name: 'General Court-Martial', maxBrigMonths: 60, discharge: 'dd', record: true },
};

const BRIG = { navy: 'Naval Consolidated Brig Miramar', marines: 'Naval Consolidated Brig Miramar', coastguard: 'Naval Consolidated Brig Miramar' };
const brigFor = (branch, months) => (months >= 60 ? 'the U.S. Disciplinary Barracks, Fort Leavenworth' : BRIG[branch] ?? 'the Joint Regional Correctional Facility, Fort Leavenworth');
const MAST = { navy: "captain's mast", coastguard: "captain's mast", marines: 'office hours' };
export const njpName = (branch) => MAST[branch] ?? 'an Article 15';

/** Your commander learns of misconduct. Returns true if something follows. */
export function reportMisconduct(ctx, offenseId, context = '') {
  const { state, rng } = ctx;
  const svc = state.military.service;
  const o = UCMJ_OFFENSES[offenseId];
  if (!svc || !o) return false;
  // A strong record buys a counseling statement instead, for minor things.
  if (o.njp && o.court === 'summary' && rng.chance(clamp(0.1 + (svc.eval - 60) / 150, 0, 0.4))) {
    ctx.log(`Your commander gave you a written counseling for ${o.name.toLowerCase()} and left it there.`, '📝', 'warn');
    svc.eval = Math.max(0, svc.eval - 4);
    return true;
  }
  if (!o.njp || (svc.disciplinary >= 3 && o.court !== 'summary')) return preferCharges(ctx, offenseId, context, 'general' === o.court ? 'general' : o.court);
  ctx.prompt({
    type: 'military.njpOffer',
    icon: '⚖️',
    title: `${njpName(svc.branch)[0].toUpperCase()}${njpName(svc.branch).slice(1)}: ${o.name}`,
    text: `${context ? `${context}\n` : ''}Your commander intends to impose non-judicial punishment under Article 15 for ${o.name.toLowerCase()} (Art. ${o.article}).\n${svc.track === 'officer' ? 'For an officer, even an Article 15 usually ends any chance of promotion.' : 'Likely punishment: reduction in rank, forfeiture of pay and extra duty.'} You may refuse and demand trial by court-martial.`,
    options: [
      { id: 'accept', label: '🫡 Accept the Article 15', hint: 'Not a criminal conviction' },
      { id: 'refuse', label: '🧑‍⚖️ Refuse and demand a court-martial', hint: `${COURTS[o.court === 'summary' ? 'summary' : 'special'].name}: a conviction is a federal record`, tone: 'danger' },
    ],
    data: { offenseId, context },
  });
  return true;
}

/** Non-judicial punishment: the commander decides; it stays out of civilian court. */
export function imposeNjp(ctx, offenseId) {
  const { state, rng } = ctx;
  const svc = state.military.service;
  const o = UCMJ_OFFENSES[offenseId];
  const parts = [];
  svc.disciplinary += 1;
  svc.eval = Math.max(0, svc.eval - 12);
  const forfeit = Math.round(monthlyBasePay(svc) * 0.5 * rng.int(1, 2));
  ctx.spend(forfeit, 'Forfeiture of pay (Article 15)', { allowDebt: true });
  parts.push(`forfeiture of $${forfeit.toLocaleString()}`);
  if (svc.track === 'officer') {
    svc.reprimand = true;
    parts.push('a letter of reprimand in your official file');
  } else if (svc.grade > 0 && rng.chance(svc.grade <= 3 ? 0.75 : 0.45)) {
    reduce(svc, 1);
    parts.push(`reduction to ${rankOf(svc).title}`);
  }
  parts.push(`${rng.pick([14, 30, 45])} days of extra duty and restriction`);
  (svc.njp ??= []).push({ age: state.character.age, offense: o.name, punishment: parts.join(', ') });
  ctx.stat('happiness', -6);
  ctx.log(`Non-judicial punishment for ${o.name.toLowerCase()}: ${parts.join(', ')}.`, '⚖️', 'bad');
  ctx.toast('Article 15 imposed', 'bad');
  // A positive drug test (or a pattern of misconduct) also starts an administrative separation.
  if (o.separate || svc.disciplinary >= 4) adminSeparation(ctx, svc, o.separate ? 'a positive urinalysis' : 'a pattern of misconduct');
}

function reduce(svc, grades) {
  svc.grade = Math.max(0, svc.grade - grades);
  svc.yearsInGrade = 0;
}

/** Administrative separation board: an OTH (or general) discharge, not a conviction. */
export function adminSeparation(ctx, svc, why) {
  const type = svc.yearsOfService >= 6 && svc.eval >= 50 && ctx.rng.chance(0.5) ? 'general' : 'oth';
  discharge(ctx, type, `An administrative separation board separated you for ${why}.`);
}

/** Charges go to a court-martial: pick a defense. */
export function preferCharges(ctx, offenseId, context = '', courtId = null) {
  const svc = ctx.state.military.service;
  const o = UCMJ_OFFENSES[offenseId];
  let court = courtId ?? o.court;
  if (court === 'summary' && svc.track === 'officer') court = 'special';
  const c = COURTS[court];
  ctx.prompt({
    type: 'military.courtMartial',
    icon: '🧑‍⚖️',
    title: `${c.name}: ${o.name}`,
    text: `${context ? `${context}\n` : ''}You're charged under Article ${o.article}. ${court === 'summary' ? 'A single officer hears the case; the most it can give is 30 days\' confinement and a reduction.' : `A panel of officers${svc.track === 'enlisted' ? ' (one-third enlisted, if you ask)' : ''} will hear it. A conviction is a federal conviction${c.discharge ? ` and can carry a ${c.discharge === 'dd' ? 'dishonorable' : 'bad-conduct'} discharge` : ''}.`}`,
    options: [
      { id: 'tds', label: '🪖 Free military defense counsel', hint: 'An experienced JAG defense attorney' },
      { id: 'civilian', label: '💼 Hire a civilian military-law attorney', hint: '$25,000, better odds' },
      { id: 'plead', label: '🤝 Take a plea deal', hint: 'Certain conviction, lighter sentence' },
    ],
    data: { offenseId, court },
  });
  return true;
}

function courtMartialVerdict(ctx, data, optionId) {
  const { state, rng } = ctx;
  const svc = state.military.service;
  if (!svc) return;
  const o = UCMJ_OFFENSES[data.offenseId];
  const c = COURTS[data.court];
  svc.courtsMartial = (svc.courtsMartial ?? 0) + 1;
  if (optionId === 'civilian') ctx.spend(25000, 'Civilian defense counsel', { allowDebt: true });
  const factor = optionId === 'civilian' ? 0.75 : 0.88;
  const convicted = optionId === 'plead' || rng.chance(clamp(o.evidence * factor - (state.stats.smarts - 60) / 400, 0.05, 0.95));
  if (!convicted) {
    ctx.log(`The ${c.name.toLowerCase()} found you not guilty of ${o.name.toLowerCase()}.`, '🧑‍⚖️', 'good');
    ctx.toast('Acquitted', 'good');
    svc.eval = Math.max(0, svc.eval - 5);
    ctx.stat('happiness', 6);
    return;
  }
  const lenient = optionId === 'plead' ? 0.5 : 1;
  const months = Math.round(rng.int(0, c.maxBrigMonths) * lenient * (data.court === 'general' ? 1 : rng.next()));
  const punitive = c.discharge && (data.court === 'general' ? rng.chance(0.85 * lenient + 0.1) : rng.chance(0.5 * lenient));
  const parts = [];
  svc.disciplinary += 2;
  svc.eval = Math.max(0, svc.eval - 25);
  if (svc.track === 'enlisted' && svc.grade > 0) {
    const to = data.court === 'summary' ? Math.max(0, svc.grade - 1) : 0;
    if (to < svc.grade) { reduce(svc, svc.grade - to); parts.push(`reduction to ${rankTitles(svc)[svc.grade]}`); }
  } else if (svc.track === 'officer') svc.reprimand = true;
  if (months) parts.push(`${months} month${months > 1 ? 's' : ''} of confinement`);
  if (punitive) parts.push(c.discharge === 'dd' ? (svc.track === 'officer' ? 'dismissal from the service' : 'a dishonorable discharge') : 'a bad-conduct discharge');
  const sentenceText = parts.join(', ') || 'a reprimand';
  ctx.log(`Convicted at a ${c.name.toLowerCase()} of ${o.name.toLowerCase()} (Art. ${o.article}). Sentence: ${sentenceText}.`, '⚖️', 'bad');
  ctx.toast(`Court-martial: convicted`, 'bad');
  ctx.stat('happiness', -15);
  ctx.stat('stress', 10);
  if (c.record) {
    const offense = OFFENSES[o.record];
    state.legal.record.push({ offenseId: o.record, name: offense.name, severity: data.court === 'general' ? 'felony' : offense.severity, age: state.character.age, court: 'court-martial', sentence: sentenceText });
    ctx.emit('legal:convicted', { offenseId: o.record, severity: data.court === 'general' ? 'felony' : offense.severity, name: offense.name, courtMartial: true });
  }
  if (!state.military.service) return; // already separated by a listener
  const branch = svc.branch;
  if (punitive) discharge(ctx, c.discharge === 'dd' ? 'dishonorable' : 'bcd', `Punitive discharge adjudged by a ${c.name.toLowerCase()}.`);
  else if (data.court !== 'summary' && svc.disciplinary >= 3) adminSeparation(ctx, svc, 'misconduct after your court-martial');
  if (months >= 12) {
    if (state.military.service) discharge(ctx, 'oth', 'Separated while confined.');
    const years = Math.round(months / 12);
    state.legal.incarceration = { yearsLeft: years, total: years, facility: brigFor(branch, months), kind: 'brig', served: 0 };
    ctx.log(`You were taken to ${brigFor(branch, months)}.`, '🔒', 'death');
    ctx.emit('legal:incarcerated', { years });
  } else if (months) {
    ctx.stat('happiness', -8);
    ctx.log(`You served ${months} month${months > 1 ? 's' : ''} in the ${BRANCHES[branch].theater === 'naval' ? 'brig' : 'confinement facility'}.`, '🔒', 'bad');
  }
}

export const UcmjResolvers = {
  njpOffer(ctx, data, optionId) {
    if (!ctx.state.military.service) return;
    if (optionId === 'refuse') return preferCharges(ctx, data.offenseId, data.context, UCMJ_OFFENSES[data.offenseId].court === 'summary' ? 'summary' : 'special');
    imposeNjp(ctx, data.offenseId);
  },
  courtMartial: courtMartialVerdict,
};
