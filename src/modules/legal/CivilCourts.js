/**
 * Civil justice for ordinary people: jury duty, getting sued (debt
 * collectors, injuries on your property, contract fights, malpractice) and
 * suing (small claims, personal injury, contractors and landlords).
 *
 * state.civil = {
 *   suits: [{ id, role: 'plaintiff'|'defendant', kind, amount, stage, years, lawyer, contingency }]
 *   history: [{ kind, role, result, amount, age }]
 *   juries: number of trials you sat on
 *   judgments: unpaid court judgments (garnished from wages)
 * }
 */
import { clamp } from '../../core/Random.js';
import { hasFelony, isIncarcerated } from '../../core/State.js';
import { currentCourt } from './Judiciary.js';
import { JUSTICE } from '../world/CountryLaw.js';

/** Things that get you sued, and how big they are. */
const DEFENSE = {
  debt: { label: 'Debt collection suit', icon: '📬', text: (s) => `A debt buyer sued you over $${s.amount.toLocaleString()} in old card debt (plus fees).`, defense: 0.35 },
  slipFall: { label: 'Slip-and-fall', icon: '🧊', text: (s) => `A delivery driver slipped on your icy steps and is suing for $${s.amount.toLocaleString()}.`, defense: 0.45, insurable: 'home' },
  dogBite: { label: 'Dog bite', icon: '🐕', text: (s) => `A neighbor's kid was bitten by a dog in your yard. Their lawyer wants $${s.amount.toLocaleString()}.`, defense: 0.3, insurable: 'home' },
  contract: { label: 'Contract dispute', icon: '📑', text: (s) => `A former client says you broke a contract and wants $${s.amount.toLocaleString()}.`, defense: 0.5 },
  malpractice: { label: 'Malpractice', icon: '🩺', text: (s) => `A former patient filed a malpractice suit seeking $${s.amount.toLocaleString()}.`, defense: 0.7, insurable: 'professional' },
  car: { label: 'Car accident lawsuit', icon: '🚗', text: (s) => `The other driver in your crash is suing for $${s.amount.toLocaleString()} — more than your policy covers.`, defense: 0.35 },
  defamation: { label: 'Defamation', icon: '📱', text: (s) => `Someone you called a scammer online sued you for defamation: $${s.amount.toLocaleString()}.`, defense: 0.55 },
};

/** Things you can sue over. */
export const CLAIMS = {
  smallClaims: { label: 'Small claims (deposit, bad repair, unpaid loan)', icon: '🧾', max: 10000, fee: 75, odds: 0.6, desc: 'No lawyer needed; up to $10,000.' },
  contractor: { label: 'Sue a contractor who botched a job', icon: '🔨', min: 15000, max: 80000, fee: 400, odds: 0.5, lawyer: 0.25, needs: 'home', desc: 'Lawyer on retainer; you front the fees.' },
  injury: { label: 'Personal injury (car crash)', icon: '🚑', min: 20000, max: 400000, fee: 0, odds: 0.65, contingency: 0.33, needs: 'injury', desc: 'Contingency: the lawyer takes a third of any recovery.' },
  landlord: { label: 'Sue a landlord (habitability, deposit)', icon: '🏚️', min: 3000, max: 30000, fee: 75, odds: 0.55, needs: 'renter', desc: 'Mold, no heat, a stolen deposit.' },
};

export function claimEligibility(state, kind) {
  const c = CLAIMS[kind];
  if (!c) return { ok: false, reason: 'Unknown' };
  if (state.character.age < 18) return { ok: false, reason: '18+' };
  if (isIncarcerated(state)) return { ok: false, reason: 'Incarcerated' };
  if (state.civil.suits.some((s) => s.role === 'plaintiff' && s.kind === kind)) return { ok: false, reason: 'Already in court over that' };
  if (c.needs === 'home' && !state.housing.properties.length) return { ok: false, reason: 'Own a home' };
  if (c.needs === 'renter' && !state.housing.rental) return { ok: false, reason: 'Rent your home' };
  if (c.needs === 'injury' && !(state.vehicles?.injuries ?? []).some((i) => state.character.age - i.age <= 2)) return { ok: false, reason: 'A crash that wasn\'t your fault (2-year limit)' };
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Jury duty                                                           */
/* ------------------------------------------------------------------ */

const TRIALS = [
  { kind: 'criminal', text: 'A man is charged with burglary. A neighbor\'s camera caught someone his height in a hoodie; his phone pinged a nearby tower.', strength: 0.55 },
  { kind: 'criminal', text: 'A woman is charged with embezzling $300,000 from a nonprofit. The bank records are damning.', strength: 0.9 },
  { kind: 'criminal', text: 'A teenager is charged with assault after a fight outside a party. Every witness tells a different story.', strength: 0.35 },
  { kind: 'civil', text: 'A family sues a hospital: their father died after his heart attack was misread as indigestion.', strength: 0.6 },
  { kind: 'civil', text: 'A delivery company is sued after its driver, on his 14th straight hour, ran a red light.', strength: 0.8 },
];

function juryTick(ctx) {
  const { state, rng } = ctx;
  if (state.character.age < 18 || isIncarcerated(state) || hasFelony(state) || currentCourt(state) || state.prompts.some((p) => p.type === 'civil.jury')) return;
  // Countries without juries (Mexico, the Philippines, India) never summon you; lay-judge systems pick fewer people.
  const j = JUSTICE[state.character.countryId];
  if (j && j.trial === 'bench') return;
  if (!rng.chance(j?.trial === 'lay' ? 0.02 : 0.06)) return;
  ctx.prompt({
    type: 'civil.jury', icon: '📨', title: j?.trial === 'lay' ? 'Selected as a Lay Judge' : 'Jury Summons',
    text: j ? `You've been selected for ${j.juror}. Pay is $${j.jurorPay} a day.` : 'You\'ve been summoned for jury duty at the county courthouse. Pay is $40 a day.',
    options: [
      { id: 'serve', label: '🧑‍⚖️ Show up' },
      { id: 'postpone', label: '📅 Request a postponement' },
      { id: 'ignore', label: '🗑️ Throw it away', hint: 'Contempt of court', tone: 'danger' },
    ],
    data: {},
  });
}

/* ------------------------------------------------------------------ */
/* Lawsuits                                                            */
/* ------------------------------------------------------------------ */

function suedTick(ctx) {
  const { state, rng } = ctx;
  if (state.character.age < 18 || isIncarcerated(state) || state.prompts.some((p) => p.type === 'civil.sued')) return;
  const debt = Math.max(0, -state.finances.cash);
  const weights = [
    { kind: 'debt', w: debt > 8000 ? 0.06 : 0 },
    { kind: 'slipFall', w: state.housing.properties.length ? 0.006 : 0 },
    { kind: 'dogBite', w: state.housing.properties.length ? 0.003 : 0 },
    { kind: 'contract', w: state.business?.current || state.gig?.active ? 0.012 : 0.002 },
    { kind: 'malpractice', w: ['medical', 'nursing', 'pharmacy'].includes(state.career.job?.professionId) ? 0.025 : 0 },
    { kind: 'car', w: (state.vehicles?.record.accidents ?? []).includes(state.character.age) ? 0.25 : 0 },
    { kind: 'defamation', w: 0.002 },
  ].filter((x) => x.w > 0);
  const total = weights.reduce((s, x) => s + x.w, 0);
  if (!total || !rng.chance(total)) return;
  const kind = rng.weighted(weights, (x) => x.w).kind;
  const amount = kind === 'debt' ? Math.round(Math.min(debt, rng.int(3000, 25000)) * 1.25) : Math.round(rng.int(...{ slipFall: [20000, 150000], dogBite: [10000, 80000], contract: [15000, 120000], malpractice: [200000, 1500000], car: [40000, 250000], defamation: [25000, 200000] }[kind]) / 1000) * 1000;
  const d = DEFENSE[kind];
  const covered = d.insurable === 'home' ? Boolean(state.housing.properties.some((p) => p.insured)) : d.insurable === 'professional' ? true : false;
  const suit = { id: rng.id('suit_'), role: 'defendant', kind, amount, stage: 'filed', years: 0, covered };
  ctx.prompt({
    type: 'civil.sued', icon: d.icon, title: 'You\'ve Been Served',
    text: `${d.text(suit)}${covered ? '\nYour insurance will defend you and pay any covered judgment (after the deductible).' : ''}`,
    options: covered
      ? [{ id: 'insurer', label: '🛡️ Hand it to your insurer', hint: '$1,000 deductible' }]
      : [
          { id: 'settle', label: `🤝 Settle for about $${Math.round(amount * 0.4).toLocaleString()}` },
          { id: 'fight', label: '⚖️ Hire a lawyer and fight', hint: `≈$${kind === 'debt' ? '3,000' : '15,000+'} in fees` },
          { id: 'ignore', label: '🙈 Ignore it', hint: 'A default judgment and wage garnishment', tone: 'danger' },
        ],
    data: { suit },
  });
}

/** Open cases move once a year. */
function suitTick(ctx) {
  const { state, rng } = ctx;
  for (const s of [...state.civil.suits]) {
    s.years += 1;
    if (s.years < (s.role === 'plaintiff' && s.kind === 'smallClaims' ? 1 : rng.int(1, 3))) continue;
    if (s.role === 'plaintiff') {
      const c = CLAIMS[s.kind];
      const won = rng.chance(c.odds + (s.lawyer ? 0.05 : 0));
      const settled = won && s.kind !== 'smallClaims' && rng.chance(0.75);
      const gross = won ? Math.round(s.amount * (settled ? rng.float(0.4, 0.8) : 1)) : 0;
      const fee = Math.round(gross * (c.contingency ?? 0));
      // Personal-injury awards for physical injuries aren't taxable; other recoveries are.
      if (gross - fee > 0) {
        if (s.kind === 'injury') state.finances.cash += gross - fee;
        else ctx.earn(gross - fee, 'Court judgment / settlement');
      }
      finish(ctx, s, won ? (settled ? 'settled' : 'won') : 'lost', gross - fee, won ? `${settled ? 'They settled' : 'You won'}: $${(gross - fee).toLocaleString()}${fee ? ` after your lawyer's third` : ''}.` : `You lost your ${c.label.toLowerCase().split(' (')[0]} case.`);
    } else {
      const d = DEFENSE[s.kind];
      if (rng.chance((s.defense ?? d.defense) + 0.15)) finish(ctx, s, 'won', 0, `The court dismissed the ${d.label.toLowerCase()} against you.`);
      else {
        const award = Math.round(s.amount * rng.float(0.5, 1));
        judgment(ctx, award);
        finish(ctx, s, 'lost', -award, `You lost the ${d.label.toLowerCase()}: a $${award.toLocaleString()} judgment.`);
      }
    }
  }
}

function finish(ctx, s, result, amount, text) {
  const { state } = ctx;
  state.civil.suits = state.civil.suits.filter((x) => x.id !== s.id);
  state.civil.history.push({ kind: s.kind, role: s.role, result, amount, age: state.character.age });
  ctx.stat('stress', -4);
  ctx.log(text, '⚖️', amount > 0 || (s.role === 'defendant' && result === 'won') ? 'good' : 'bad');
}

/** Judgments you can't pay become a garnishment of wages. */
function judgment(ctx, amount) {
  const { state } = ctx;
  const pay = Math.min(amount, Math.max(0, state.finances.cash));
  if (pay) ctx.spend(pay, 'Court judgment');
  state.civil.judgments += amount - pay;
  if (amount - pay > 0) ctx.emit('credit:event', { type: 'default' });
}

function garnishTick(ctx) {
  const { state } = ctx;
  const owed = state.civil.judgments;
  if (owed <= 0) return;
  const wages = state.career.job?.salary ?? 0;
  const take = Math.min(owed, Math.round(wages * 0.25));
  if (take > 0) {
    ctx.spend(take, 'Wage garnishment', { allowDebt: true });
    state.civil.judgments -= take;
    ctx.log(`A court judgment garnished $${take.toLocaleString()} from your paychecks.${state.civil.judgments ? ` $${state.civil.judgments.toLocaleString()} still owed.` : ''}`, '🏦', 'warn');
  }
}

export const CivilCourts = {
  id: 'civil',
  order: 36,

  init(state) {
    state.civil ??= { suits: [], history: [], juries: 0, judgments: 0 };
  },

  onAgeUp(ctx) {
    if (!ctx.state.civil) return;
    suitTick(ctx);
    garnishTick(ctx);
    juryTick(ctx);
    suedTick(ctx);
  },

  actions: {
    sue(ctx, kind) {
      const { state, rng } = ctx;
      const check = claimEligibility(state, kind);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      const c = CLAIMS[kind];
      const injury = (state.vehicles?.injuries ?? []).filter((i) => state.character.age - i.age <= 2).at(-1);
      const amount = kind === 'injury' ? Math.round(rng.int(c.min, injury?.severe ? c.max : c.max / 4) / 1000) * 1000 : Math.round(rng.int(c.min ?? 1000, c.max) / 100) * 100;
      const upfront = c.fee + (c.lawyer ? Math.round(amount * c.lawyer) : 0);
      if (upfront && !ctx.spend(upfront, `Lawsuit costs — ${c.label.split(' (')[0]}`, { credit: true })) return ctx.toast(`You need $${upfront.toLocaleString()} up front.`, 'warn');
      if (kind === 'injury' && injury) state.vehicles.injuries = state.vehicles.injuries.filter((i) => i !== injury);
      state.civil.suits.push({ id: rng.id('suit_'), role: 'plaintiff', kind, amount, stage: 'filed', years: 0, lawyer: Boolean(c.lawyer || c.contingency) });
      ctx.log(`You filed suit: ${c.label.split(' (')[0].toLowerCase()} seeking $${amount.toLocaleString()}.`, c.icon);
    },
  },

  resolvers: {
    jury(ctx, data, optionId) {
      const { state, rng } = ctx;
      if (optionId === 'ignore') {
        if (rng.chance(0.15)) {
          ctx.spend(500, 'Contempt of court fine', { allowDebt: true });
          return ctx.log('The judge held you in contempt for ignoring a jury summons: a $500 fine.', '⚖️', 'bad');
        }
        return ctx.log('You tossed the summons. Nothing happened — this time.', '🗑️', 'warn');
      }
      if (optionId === 'postpone') return ctx.log('The clerk pushed your service back a year.', '📅');
      if (!rng.chance(0.35)) return ctx.log('You spent a day in the jury assembly room and were sent home unpicked.', '🪑');
      const t = rng.pick(TRIALS);
      ctx.prompt({
        type: 'civil.verdict', icon: '🧑‍⚖️', title: t.kind === 'criminal' ? 'You\'re on a Jury' : 'You\'re on a Civil Jury',
        text: `${t.text}\n${t.kind === 'criminal' ? 'The standard is proof beyond a reasonable doubt.' : 'The standard is a preponderance of the evidence.'}`,
        options: t.kind === 'criminal'
          ? [{ id: 'guilty', label: '🔨 Guilty' }, { id: 'acquit', label: '🕊️ Not guilty' }, { id: 'hold', label: '✋ Hold out (hung jury)' }]
          : [{ id: 'plaintiff', label: '💰 Find for the plaintiff' }, { id: 'defense', label: '🛡️ Find for the defense' }],
        data: { strength: t.strength, kind: t.kind },
      });
    },
    verdict(ctx, data, optionId) {
      const { state, rng } = ctx;
      state.civil.juries += 1;
      const convicts = ['guilty', 'plaintiff'].includes(optionId);
      const sure = data.strength >= 0.75;
      const unsure = data.strength <= 0.4;
      ctx.stat('smarts', 1);
      if (optionId === 'hold') {
        ctx.stat('stress', 5);
        return ctx.log('You wouldn\'t budge. The judge declared a mistrial; the prosecutor may try again.', '✋');
      }
      if ((convicts && unsure) || (!convicts && sure)) {
        ctx.stat('happiness', -2);
        return ctx.log(`The jury ${convicts ? 'convicted' : 'acquitted'}. Driving home, you weren't sure you got it right.`, '🤔');
      }
      ctx.stat('happiness', 2);
      ctx.log(`The jury ${convicts ? (data.kind === 'criminal' ? 'convicted' : 'found for the plaintiff') : (data.kind === 'criminal' ? 'acquitted' : 'found for the defense')} after ${rng.int(2, 9)} hours of deliberation. You did your civic duty.`, '🧑‍⚖️', 'good');
    },
    sued(ctx, data, optionId) {
      const { state } = ctx;
      const s = data.suit;
      if (optionId === 'insurer') {
        ctx.spend(1000, 'Insurance deductible', { allowDebt: true });
        state.civil.history.push({ kind: s.kind, role: 'defendant', result: 'covered by insurance', amount: -1000, age: state.character.age });
        return ctx.log('Your insurer\'s lawyers handled it and settled within the policy.', '🛡️');
      }
      if (optionId === 'settle') {
        const amount = Math.round(s.amount * 0.4);
        judgment(ctx, amount);
        state.civil.history.push({ kind: s.kind, role: 'defendant', result: 'settled', amount: -amount, age: state.character.age });
        return ctx.log(`You settled the ${DEFENSE[s.kind].label.toLowerCase()} for $${amount.toLocaleString()}.`, '🤝', 'warn');
      }
      if (optionId === 'ignore') {
        // Default judgment: the full claim plus costs.
        const amount = Math.round(s.amount * 1.1);
        judgment(ctx, amount);
        state.civil.history.push({ kind: s.kind, role: 'defendant', result: 'default judgment', amount: -amount, age: state.character.age });
        return ctx.log(`You didn't respond, so the court entered a default judgment: $${amount.toLocaleString()}.`, '⚖️', 'bad');
      }
      const fees = s.kind === 'debt' ? 3000 : clamp(Math.round(s.amount * 0.1), 15000, 150000);
      ctx.spend(fees, 'Defense attorney', { allowDebt: true });
      // Debt buyers often can't prove they own the debt.
      state.civil.suits.push({ ...s, lawyer: true, defense: (DEFENSE[s.kind].defense ?? 0.4) + (s.kind === 'debt' ? 0.15 : 0) });
      ctx.log(`You hired a lawyer to fight the ${DEFENSE[s.kind].label.toLowerCase()}.`, '⚖️');
    },
  },
};
