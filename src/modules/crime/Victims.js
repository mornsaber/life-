/**
 * Crime happens to you, too.
 *
 * Each year, depending on how dangerous your country and city are (CrimeWorld.js), you can be
 * burgled, robbed, assaulted, defrauded, or have your car stolen; a partner can be abusive; and,
 * rarely, you can be sexually assaulted. Sexual offences are never something the player can do —
 * they exist here, written without graphic detail, so the game can show what happens to the
 * people they happen to: the choice to report or not, the forensic exam, the long wait, the trial
 * where you are the witness and the defence attacks your credibility, and the support (crisis
 * lines, victim advocates, therapy) that helps.
 *
 *   Reporting    Police may or may not solve it (clearance rates are low for burglary and sexual
 *                violence, higher for assault). Insurance pays when you have it.
 *   Support      Victim services and therapy cut the trauma; doing it alone carries it.
 *   Trials       When a case reaches court you testify; the verdict follows realistic odds.
 */
import { clamp } from '../../core/Random.js';
import { randomName } from '../../core/State.js';
import { crimeLevelHere } from './CrimeWorld.js';
import { priceLevel } from '../world/Countries.js';
import { divorce } from '../people/PeopleEngine.js';
import { victimJustice } from './VictimJustice.js';

const partnerOf = (state) => (state.people?.list ?? []).find((p) => p.alive && ['spouse', 'partner'].includes(p.relation));
const local = (state, n) => Math.round(n * priceLevel(state));

const EVENTS = [
  { id: 'burglary', weight: 5, minAge: 18, text: (s) => 'You came home to a smashed back door. The TV, a laptop, your grandmother\'s ring — gone.', loss: [800, 6000] },
  { id: 'mugging', weight: 3, minAge: 12, text: () => 'Two men stopped you on the walk home. One had a knife. You gave them your phone and wallet and they were gone in seconds.', loss: [100, 800], trauma: 8 },
  { id: 'assault', weight: 2, minAge: 14, text: () => 'A stranger attacked you outside a bar for no reason anyone could find. You woke up in A&E with a broken cheekbone.', health: [8, 25], trauma: 10 },
  { id: 'carTheft', weight: 3, minAge: 17, needs: (s) => (s.vehicles?.owned ?? []).length > 0, text: () => 'Your car was gone from where you parked it. Just glass on the road.' },
  { id: 'scam', weight: 3, minAge: 30, text: (s) => (s.character.age >= 65 ? 'A polite man from "your bank\'s fraud team" talked you into moving your savings to a "safe account". It wasn\'t.' : 'An investment app your friend recommended stopped letting anyone withdraw. Then it stopped existing.'), loss: [2000, 20000] },
  { id: 'abuse', weight: 1.5, minAge: 18, needs: (s) => partnerOf(s) && (partnerOf(s).relationship ?? 60) < 45, text: (s) => `${partnerOf(s).firstName} has been checking your phone, deciding who you can see, controlling the money. Last night, for the first time, ${partnerOf(s).firstName} hit you.`, trauma: 14 },
  { id: 'sexualAssault', weight: 0.12, minAge: 16, text: () => 'Someone you trusted — someone you had known for months — sexually assaulted you. It was not your fault.', trauma: 30 },
];

/** Yearly: is this the year it happens to you? */
export function victimTick(ctx) {
  const { state, rng } = ctx;
  if (state.legal.incarceration || state.character.age < 12) return;
  const level = crimeLevelHere(state);
  if (!rng.chance(clamp(0.03 + level * 0.12, 0.02, 0.18))) return;
  const pool = EVENTS.filter((e) => state.character.age >= e.minAge && (!e.needs || e.needs(state)));
  const e = rng.weighted(pool, (x) => x.weight);
  if (!e) return;
  const v = { id: e.id };
  if (e.loss) {
    v.loss = local(state, rng.int(...e.loss));
    ctx.spend(Math.min(v.loss, Math.max(0, state.finances.cash)), e.id === 'scam' ? 'Lost to a scam' : 'Stolen');
  }
  if (e.health) ctx.stat('health', -rng.int(...e.health));
  if (e.id === 'mugging' && rng.chance(0.15)) ctx.emit('health:acute', { id: 'stabWound' });
  if (e.id === 'assault') ctx.emit('health:acute', { id: 'beating' });
  if (e.id === 'carTheft') {
    const car = state.vehicles.owned.sort((a, b) => b.value - a.value)[0];
    v.car = car.value;
    v.insured = car.insured;
    state.vehicles.owned = state.vehicles.owned.filter((x) => x !== car);
  }
  if (e.trauma) ctx.emit('health:trauma', { amount: e.trauma, source: 'crime' });
  ctx.stat('happiness', -(e.trauma ? Math.round(e.trauma / 2) : 5));
  const n = randomName(rng, rng.chance(0.85) ? 'male' : 'female');
  v.offender = `${n.firstName} ${n.lastName}`;
  const options = OPTIONS[e.id] ?? OPTIONS.default;
  ctx.prompt({ type: 'crime.victim', icon: e.id === 'sexualAssault' || e.id === 'abuse' ? '🫂' : '🚨', title: TITLES[e.id] ?? 'A Crime Against You', text: `${e.text(state)}${v.loss ? ` ($${v.loss.toLocaleString()})` : ''}`, options, data: v });
}

const TITLES = { burglary: 'Burgled', mugging: 'Robbed', assault: 'Assaulted', carTheft: 'Car Stolen', scam: 'Scammed', abuse: 'At Home', sexualAssault: 'After' };
const OPTIONS = {
  default: [{ id: 'report', label: '🚓 Report it to the police' }, { id: 'ignore', label: '🤷 Let it go' }],
  abuse: [
    { id: 'leave', label: '🚪 Leave — call a domestic-abuse line and go to a refuge', hint: 'Hard, frightening, and safer' },
    { id: 'report', label: '🚓 Call the police' },
    { id: 'stay', label: '🤐 Stay and hope it was once', hint: 'It rarely is' },
  ],
  sexualAssault: [
    { id: 'report', label: '🏥 Go to a sexual-assault referral centre and report it', hint: 'A forensic exam, a statement, a long wait for a decision' },
    { id: 'support', label: '📞 Call a crisis line and get support, without the police', hint: 'You can still report later' },
    { id: 'alone', label: '🤐 Tell no one' },
  ],
};

export const VictimResolvers = {
  victim(ctx, data, optionId) {
    const { state, rng } = ctx;
    const id = data.id;
    if (id === 'sexualAssault') return sexualAssault(ctx, data, optionId);
    if (id === 'abuse') return abuse(ctx, data, optionId);
    if (optionId !== 'report') {
      if (id === 'carTheft' && data.insured) { ctx.earn(Math.round(data.car * 0.8), 'Insurance payout'); ctx.log('The insurer paid out, less the excess.', '📄', 'info'); }
      return ctx.log('You didn\'t bother the police. Most people don\'t.', '🤷', 'muted');
    }
    // Clearance rates: burglaries and car thefts are rarely solved; violent crimes more often.
    const solved = rng.chance({ burglary: 0.12, carTheft: 0.15, mugging: 0.25, assault: 0.45, scam: 0.08 }[id] ?? 0.2);
    if (id === 'carTheft' && data.insured) ctx.earn(Math.round(data.car * 0.8), 'Insurance payout');
    if (id === 'burglary' && rng.chance(0.6)) ctx.earn(Math.round((data.loss ?? 0) * 0.7), 'Home insurance claim');
    if (!solved) {
      ctx.log(`You were given a crime reference number. ${rng.pick(['Nobody ever called back.', 'An officer came, took photos, and left.', 'The case was closed after three weeks: no lines of enquiry.'])}`, '🗂️', 'muted');
      return victimJustice(ctx, { id, offender: data.offender, outcome: 'unsolved' });
    }
    const convicted = rng.chance(0.85);
    ctx.log(`Police arrested ${data.offender}. ${!convicted ? `You testified at the trial. The jury acquitted.` : rng.chance(0.6) ? `${data.offender} pleaded guilty.` : `You testified at the trial, and ${data.offender} was convicted.`}`, '⚖️', convicted ? 'good' : 'warn');
    ctx.emit('health:trauma', { amount: convicted ? -4 : 3, source: 'justice' });
    ctx.stat('happiness', convicted ? 4 : -3);
    victimJustice(ctx, { id, offender: data.offender, outcome: convicted ? 'convicted' : 'acquitted' });
  },
};

function abuse(ctx, data, optionId) {
  const { state, rng } = ctx;
  const partner = partnerOf(state);
  if (!partner) return;
  if (optionId === 'stay') {
    partner.relationship = Math.max(0, (partner.relationship ?? 40) - 10);
    state.legal.flags.abuseYears = (state.legal.flags.abuseYears ?? 0) + 1;
    ctx.emit('health:trauma', { amount: 10, source: 'domestic abuse' });
    return ctx.log(`${partner.firstName} cried and promised it would never happen again.`, '🥀', 'bad');
  }
  if (partner.relation === 'spouse') divorce(ctx, partner, { contested: true });
  else partner.relation = 'ex';
  partner.relationship = 0;
  if (optionId === 'report') {
    const convicted = rng.chance(0.4);
    ctx.log(convicted ? `${partner.firstName} was arrested and later convicted of domestic abuse. A protective order keeps them away from you.` : `${partner.firstName} was arrested, but the case was dropped for lack of evidence. You got a protective order.`, '🚓', convicted ? 'good' : 'warn');
    victimJustice(ctx, { id: 'abuse', offender: `${partner.firstName} ${partner.lastName ?? ''}`.trim(), outcome: convicted ? 'convicted' : 'acquitted' });
  } else ctx.log('You left with a bag and your phone. A refuge took you in; a support worker helped you with the rest.', '🚪', 'info');
  ctx.emit('health:trauma', { amount: -6, source: 'safety' });
  ctx.stat('stress', -10);
}

function sexualAssault(ctx, data, optionId) {
  const { rng } = ctx;
  if (optionId === 'alone') {
    ctx.emit('health:trauma', { amount: 15, source: 'sexual assault' });
    ctx.stat('stress', 12);
    return ctx.log('You told no one. It stays with you anyway: in crowds, at night, in the shower.', '🌑', 'bad');
  }
  if (optionId === 'support') {
    ctx.emit('health:trauma', { amount: -10, source: 'crisis support' });
    victimJustice(ctx, { id: 'sexualAssault', offender: data.offender, outcome: 'unsolved' });
    return ctx.log('A crisis-line volunteer listened for an hour and helped you find a counsellor. Healing isn\'t a straight line, but it has started.', '🫂', 'info');
  }
  // Reporting: a forensic exam, a statement, and the slow arithmetic of the justice system.
  ctx.emit('health:trauma', { amount: 5, source: 'reporting' });
  ctx.log('At the referral centre, a nurse examined you gently and an officer took your statement. A victim advocate gave you her number.', '🏥', 'info');
  const charged = rng.chance(0.3);
  if (!charged) victimJustice(ctx, { id: 'sexualAssault', offender: data.offender, outcome: 'uncharged' });
  if (!charged) return ctx.log('Months later, the prosecutor decided there wasn\'t enough evidence to charge. Your advocate said it didn\'t mean they didn\'t believe you.', '🗂️', 'bad');
  const convicted = rng.chance(0.55);
  ctx.emit('health:trauma', { amount: convicted ? -12 : 8, source: 'trial' });
  victimJustice(ctx, { id: 'sexualAssault', offender: data.offender, outcome: convicted ? 'convicted' : 'acquitted' });
  return ctx.log(convicted ? `${data.offender} was convicted of sexual assault after you testified, and placed on the sex-offender register. You read your victim impact statement aloud.` : `You testified for two days while the defence picked at every detail. The jury acquitted ${data.offender}.`, '⚖️', convicted ? 'good' : 'bad');
}
