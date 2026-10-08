/**
 * The bench: state and federal courts from magistrate to the Supreme Court,
 * how each state picks its judges (election, merit selection with retention
 * votes, or appointment), cases to rule on, reversals, retention, senate
 * confirmation, senior status and judicial pensions.
 *
 * The elected state trial-court seat is the politics module's 'judge'
 * office (campaigns and re-election live there); every other seat lives in
 * state.judiciary.seat = { court, since, termLeft, reputation, approval, rulings, reversals }.
 * state.judiciary.history = [{ court, startAge, endAge, reason }]
 */
import { clamp } from '../../core/Random.js';
import { yearsInProfession, addHonor } from '../../core/State.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { stateIdOf } from '../life/Regions.js';

export const COURTS = {
  magistrate: { name: 'State Magistrate', icon: '🔨', system: 'state', rank: 1, salary: 140000, term: 4, desc: 'Arraignments, bail, small claims and traffic court.' },
  stateTrial: { name: 'State Trial Court Judge', icon: '⚖️', system: 'state', rank: 2, salary: 185000, term: 6, politics: true, desc: 'Felony trials, civil suits, family court.' },
  stateAppellate: { name: 'State Court of Appeals Judge', icon: '📜', system: 'state', rank: 3, salary: 205000, term: 8, desc: 'Reviews trial courts on the record; writes opinions.' },
  stateSupreme: { name: 'State Supreme Court Justice', icon: '🏛️', system: 'state', rank: 4, salary: 225000, term: 10, desc: 'The last word on state law.' },
  fedMagistrate: { name: 'U.S. Magistrate Judge', icon: '🔨', system: 'federal', rank: 1, salary: 226000, term: 8, desc: 'Warrants, detention hearings and pretrial motions in federal court.' },
  fedDistrict: { name: 'U.S. District Judge', icon: '🦅', system: 'federal', rank: 2, salary: 243000, term: 0, life: true, desc: 'Article III: life tenure. Federal trials.' },
  fedCircuit: { name: 'U.S. Court of Appeals Judge', icon: '🦅', system: 'federal', rank: 3, salary: 257000, term: 0, life: true, desc: 'Binding precedent across a whole circuit.' },
  scotus: { name: 'Associate Justice of the U.S. Supreme Court', icon: '🏛️', system: 'federal', rank: 4, salary: 298000, term: 0, life: true, desc: 'Nine seats. The final word on the Constitution.' },
};

const NEXT = { magistrate: 'stateTrial', stateTrial: 'stateAppellate', stateAppellate: 'stateSupreme', fedMagistrate: 'fedDistrict', fedDistrict: 'fedCircuit', fedCircuit: 'scotus' };

/**
 * How states fill their benches: 'elected' (run for it), 'merit' (governor
 * picks from a commission list; retention votes after) or 'appointed'.
 */
export const SELECTION = {
  TX: { trial: 'elected', appellate: 'elected' },
  OH: { trial: 'elected', appellate: 'elected' },
  IL: { trial: 'elected', appellate: 'elected' },
  WA: { trial: 'elected', appellate: 'elected' },
  MT: { trial: 'elected', appellate: 'elected' },
  NY: { trial: 'elected', appellate: 'appointed' },
  CA: { trial: 'elected', appellate: 'merit' },
  FL: { trial: 'elected', appellate: 'merit' },
  CO: { trial: 'merit', appellate: 'merit' },
  IA: { trial: 'merit', appellate: 'merit' },
  DC: { trial: 'appointed', appellate: 'appointed' },
  GA: { trial: 'elected', appellate: 'elected' },
  NC: { trial: 'elected', appellate: 'elected' },
  PA: { trial: 'elected', appellate: 'elected' },
  MI: { trial: 'elected', appellate: 'elected' },
  MN: { trial: 'elected', appellate: 'elected' },
  LA: { trial: 'elected', appellate: 'elected' },
  NV: { trial: 'elected', appellate: 'elected' },
  OR: { trial: 'elected', appellate: 'elected' },
  WV: { trial: 'elected', appellate: 'elected' },
  TN: { trial: 'elected', appellate: 'merit' },
  AZ: { trial: 'merit', appellate: 'merit' },
  UT: { trial: 'merit', appellate: 'merit' },
  AK: { trial: 'merit', appellate: 'merit' },
  VA: { trial: 'appointed', appellate: 'appointed' },
  MA: { trial: 'appointed', appellate: 'appointed' },
  HI: { trial: 'appointed', appellate: 'appointed' },
};
export const MANDATORY_RETIREMENT = 75;

export const selectionFor = (state, court) => {
  const s = SELECTION[stateIdOf(state)] ?? SELECTION.OH;
  return COURTS[court].system === 'federal' ? 'appointed' : court === 'stateTrial' || court === 'magistrate' ? s.trial : s.appellate;
};

/** Your current court, including the elected trial seat held through politics. */
export function currentCourt(state) {
  if (state.judiciary?.seat) return state.judiciary.seat.court;
  if (state.politics?.office?.id === 'judge') return 'stateTrial';
  return null;
}

/** Years on any bench. */
export function benchYears(state) {
  const past = (state.judiciary?.history ?? []).reduce((s, h) => s + h.endAge - h.startAge, 0) + (state.politics?.history ?? []).filter((h) => h.officeId === 'judge').reduce((s, h) => s + h.endAge - h.startAge, 0);
  const seat = state.judiciary?.seat;
  const now = seat ? state.character.age - seat.since : state.politics?.office?.id === 'judge' ? state.character.age - state.politics.office.startAge : 0;
  return past + now;
}

const lawYears = (state) => yearsInProfession(state, ['law', 'prosecution', 'publicDefender', 'courts', 'legalSupport']);

/** Can you be considered for a court right now? */
export function benchEligibility(state, court) {
  const c = COURTS[court];
  if (!hasCredential(state, 'barLicense')) return { ok: false, reason: 'A law license' };
  if (state.legal.incarceration || (state.legal.record ?? []).some((r) => r.severity === 'felony' && !r.pardoned)) return { ok: false, reason: 'A felony record disqualifies you' };
  if (state.character.age >= MANDATORY_RETIREMENT && !c.life) return { ok: false, reason: `Mandatory retirement at ${MANDATORY_RETIREMENT}` };
  const here = currentCourt(state);
  const prior = here ? COURTS[here] : null;
  const years = lawYears(state) + benchYears(state);
  if (c.rank === 1) return years >= 5 ? { ok: true } : { ok: false, reason: '5 years of legal practice' };
  if (c.rank === 2) return years >= 10 ? { ok: true } : { ok: false, reason: '10 years in law or on the bench' };
  if (!prior || prior.rank < c.rank - 1) return { ok: false, reason: `Serve on a ${c.rank === 3 ? 'trial' : 'appellate'} court first` };
  return benchYears(state) >= 4 ? { ok: true } : { ok: false, reason: '4 years on the bench' };
}

/* ------------------------------------------------------------------ */
/* Cases                                                               */
/* ------------------------------------------------------------------ */

const CASES = {
  trial: [
    { id: 'sentence', title: 'Sentencing', text: 'A 19-year-old first offender pleaded guilty to armed robbery of a gas station. Nobody was hurt; the gun was unloaded.', options: [['lenient', '🕊️ Probation and a diversion program', { approval: -3, rep: 1 }], ['guideline', '📖 A guideline sentence', { rep: 2 }], ['harsh', '⛓️ The maximum, as a message', { approval: 4, rep: -2, reverse: 0.2 }]] },
    { id: 'suppress', title: 'Motion to Suppress', text: 'Police found 4 kilos of fentanyl in a car — after a search with no warrant, no consent and a pretextual stop.', options: [['grant', '📖 Grant: the search was unconstitutional', { approval: -6, rep: 3 }], ['deny', '🚔 Deny: let the jury see the evidence', { approval: 4, rep: -3, reverse: 0.6 }]] },
    { id: 'bail', title: 'Bail Hearing', text: 'A man charged with domestic assault, no record, steady job. The victim is terrified.', options: [['release', '🔓 Release with an ankle monitor and no-contact order', { approval: -2, rep: 1, risk: 0.08 }], ['hold', '🔒 Hold without bail', { approval: 2, rep: -1, reverse: 0.3 }]] },
    { id: 'civil', title: 'Civil Trial Ruling', text: 'A widow sues a trucking company. The evidence of negligence is thin, but the jury plainly wants to award millions.', options: [['jnov', '📖 Overturn the verdict as unsupported', { approval: -4, rep: 3 }], ['let', '💰 Let the jury\'s verdict stand', { approval: 3, rep: -2, reverse: 0.5 }]] },
    { id: 'custody', title: 'Custody Dispute', text: 'Both parents are decent. One is moving across the country for a better job.', options: [['joint', '🤝 Joint custody with long summers', { rep: 2 }], ['stay', '🏠 Primary custody to the parent who stays', { rep: 1 }]] },
  ],
  appellate: [
    { id: 'affirm', title: 'Appeal from a Murder Conviction', text: 'The trial judge let in a confession obtained after the defendant asked for a lawyer. The other evidence is strong.', options: [['harmless', '📖 Affirm: harmless error', { rep: 1, approval: 2 }], ['reverse', '⚖️ Reverse and order a new trial', { rep: 2, approval: -5 }]] },
    { id: 'statute', title: 'Statutory Interpretation', text: 'Does the state\'s consumer-protection law cover online gig platforms? The text is ambiguous.', options: [['text', '📖 Read the text narrowly', { rep: 2 }], ['purpose', '🧭 Read it in light of its purpose', { rep: 1, approval: 2 }]] },
    { id: 'dissent', title: 'A Divided Panel', text: 'Your two colleagues want to reverse a big jury award. You disagree.', options: [['join', '🤝 Join them for a unanimous opinion', { rep: 0 }], ['dissent', '✍️ Write a sharp dissent', { rep: 3, approval: 1 }]] },
  ],
  supreme: [
    { id: 'constitutional', title: 'A Constitutional Showdown', text: 'A challenge to the legislature\'s new law on {issue}.', issues: ['police surveillance of phones', 'school funding', 'voting districts', 'abortion', 'gun permits'], options: [['uphold', '🏛️ Uphold the law', { approval: 3, rep: 1 }], ['strike', '⚖️ Strike it down', { approval: -3, rep: 2 }], ['narrow', '📖 Decide narrowly on procedure', { rep: 2 }]] },
    { id: 'cert', title: 'Petitions for Review', text: 'Thousands of petitions; the court will hear a few dozen.', options: [['busy', '📚 Push to take more cases', { rep: 2 }], ['few', '🗄️ Keep the docket lean', { rep: 1 }]] },
  ],
};

function casePrompt(ctx, court) {
  const { rng } = ctx;
  const pool = COURTS[court].rank <= 2 ? CASES.trial : COURTS[court].rank === 3 ? CASES.appellate : CASES.supreme;
  const k = rng.pick(pool);
  ctx.prompt({
    type: 'judiciary.case', icon: COURTS[court].icon, title: k.title,
    text: k.text.replace('{issue}', k.issues ? rng.pick(k.issues) : ''),
    options: k.options.map(([id, label]) => ({ id, label })),
    data: { caseId: k.id, court },
  });
}

/** State seat payroll, terms, retention and promotions. */
function seatTick(ctx) {
  const { state, rng } = ctx;
  const j = state.judiciary;
  const seat = j.seat;
  const court = currentCourt(state);
  if (!court) return;
  const c = COURTS[court];
  if (seat) {
    ctx.earn(c.salary, `Judicial salary — ${c.name}`, { wage: true });
    if (!c.life) {
      seat.termLeft -= 1;
      if (state.character.age >= MANDATORY_RETIREMENT) return leaveBench(ctx, `Reached mandatory retirement at ${MANDATORY_RETIREMENT}`);
      if (seat.termLeft <= 0) retention(ctx);
    }
  }
  if (!state.character.alive || !currentCourt(state)) return;
  // Cases on the docket.
  if (!state.prompts.some((p) => p.type === 'judiciary.case')) casePrompt(ctx, court);
  // Elevation.
  const next = NEXT[court];
  const rep = seat?.reputation ?? 55;
  if (next && benchEligibility(state, next).ok && !state.prompts.some((p) => p.type === 'judiciary.nomination')) {
    const odds = clamp(0.03 + (rep - 55) / 400 + (state.politics?.recognition ?? 0) / 2000, 0.005, 0.2) * (next === 'scotus' ? 0.15 : 1);
    if (rng.chance(odds)) nominate(ctx, next);
  }
  // Federal judges can take senior status at full pay under the Rule of 80.
  if (c.life && state.character.age >= 65 && state.character.age + benchYears(state) >= 80 && !state.prompts.some((p) => p.type === 'judiciary.senior') && rng.chance(0.25)) {
    ctx.prompt({ type: 'judiciary.senior', icon: '🦅', title: 'Senior Status', text: `Under the Rule of 80 you can take senior status: keep your full salary of $${c.salary.toLocaleString()} for life and hear as many cases as you like.`, options: [{ id: 'senior', label: '🌅 Take senior status' }, { id: 'stay', label: '⚖️ Stay in active service' }], data: {} });
  }
}

function retention(ctx) {
  const { state, rng } = ctx;
  const seat = state.judiciary.seat;
  const method = selectionFor(state, seat.court);
  const c = COURTS[seat.court];
  if (method === 'appointed') {
    seat.termLeft = c.term;
    return ctx.log(`You were reappointed to the ${c.name.replace(/ Judge| Justice/, '')}.`, c.icon, 'good');
  }
  // Retention votes almost always pass; contested elections are real races.
  const share = method === 'merit' ? clamp(0.72 + (seat.approval - 50) / 150 + rng.float(-0.08, 0.08), 0.3, 0.9) : clamp(0.52 + (seat.approval - 50) / 120 + rng.float(-0.1, 0.1), 0.25, 0.8);
  if (share > 0.5) {
    seat.termLeft = c.term;
    ctx.log(`${method === 'merit' ? 'Voters retained you' : 'You won re-election'} with ${Math.round(share * 100)}% of the vote.`, '🗳️', 'good');
  } else leaveBench(ctx, method === 'merit' ? 'Voted out in a retention election' : 'Lost re-election to the bench');
}

function nominate(ctx, court) {
  const c = COURTS[court];
  const method = selectionFor(ctx.state, court);
  const text = c.system === 'federal'
    ? `The President intends to nominate you as ${c.name}. The Senate Judiciary Committee will hold a confirmation hearing.`
    : method === 'elected' ? `Party leaders and the bar want you to run for an open seat as ${c.name}.` : `The ${method === 'merit' ? 'judicial nominating commission sent your name to the governor, who chose you' : 'governor wants to appoint you'} as ${c.name}.`;
  ctx.prompt({
    type: 'judiciary.nomination', icon: c.icon, title: c.system === 'federal' ? 'A Call from the White House' : 'Elevation',
    text,
    options: [{ id: 'accept', label: `${c.icon} Accept`, hint: c.system === 'federal' ? 'Confirmation hearing next' : method === 'elected' ? 'A statewide campaign (≈$250,000)' : '' }, { id: 'decline', label: '🙅 Decline' }],
    data: { court, method },
  });
}

function takeSeat(ctx, court) {
  const { state } = ctx;
  const c = COURTS[court];
  const j = state.judiciary;
  const prevRep = j.seat?.reputation ?? 60;
  if (j.seat) j.history.push({ court: j.seat.court, startAge: j.seat.since, endAge: state.character.age, reason: `Elevated to ${c.name}` });
  if (state.politics?.office?.id === 'judge') ctx.emit('politics:leave', { reason: `Elevated to ${c.name}` });
  if (state.career.job) ctx.emit('career:resign', { reason: `Took the bench as ${c.name}` });
  j.seat = { court, since: state.character.age, termLeft: c.term, reputation: prevRep, approval: 55, rulings: 0, reversals: 0 };
  ctx.log(`You were sworn in as ${c.name}.`, c.icon, 'milestone');
  ctx.toast(`${c.icon} ${c.name}`, 'honor');
  ctx.stat('happiness', 12);
  if (court === 'scotus') addHonor(state, { id: 'judiciary.scotus', source: 'civil', name: 'Justice of the Supreme Court', icon: '🏛️', ribbon: ['#1a1a1a', '#bfa14a', '#1a1a1a'], prestige: 40, precedence: 5, citation: 'Confirmed by the United States Senate.' });
}

export function leaveBench(ctx, reason, { senior = false } = {}) {
  const { state } = ctx;
  const j = state.judiciary;
  const seat = j.seat;
  if (!seat) return;
  const c = COURTS[seat.court];
  const years = benchYears(state);
  j.history.push({ court: seat.court, startAge: seat.since, endAge: state.character.age, reason });
  j.seat = null;
  // Judicial pensions: federal Article III judges keep full salary (Rule of 80); state judges ≈3%/yr, capped at 75%.
  let annual = 0;
  if (c.life && state.character.age >= 65 && state.character.age + years >= 80) annual = c.salary;
  else if (c.system === 'state' && years >= 8) annual = Math.round(c.salary * Math.min(0.75, years * 0.03));
  else if (c.system === 'federal' && !c.life && years >= 8) annual = Math.round(c.salary * Math.min(0.6, years * 0.025));
  if (annual) ctx.emit('retirement:addPension', { pension: { id: `judiciary.${seat.court}`, label: `${senior ? 'Senior status' : 'Judicial pension'} (${c.name})`, annual, startAge: Math.max(state.character.age, c.system === 'federal' ? state.character.age : 60), source: 'pension', cola: c.life ? 0.02 : 0.015 } });
  ctx.log(`You left the bench as ${c.name}: ${reason}.${annual ? ` Pension: $${annual.toLocaleString()}/yr.` : ''}`, c.icon);
}

export const Judiciary = {
  id: 'judiciary',
  order: 34,

  init(state) {
    state.judiciary ??= { seat: null, history: [] };
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    if (!state.judiciary || state.legal.incarceration) {
      if (state.legal.incarceration && state.judiciary?.seat) leaveBench(ctx, 'Removed from the bench after a criminal conviction');
      return;
    }
    seatTick(ctx);
    // Lawyers without a seat: magistrate openings.
    if (!currentCourt(state) && benchEligibility(state, 'magistrate').ok && state.career.job && ['law', 'prosecution', 'publicDefender', 'courts'].includes(state.career.job.professionId) && rng.chance(0.03) && !state.prompts.some((p) => p.type === 'judiciary.nomination')) {
      nominate(ctx, rng.chance(0.3) ? 'fedMagistrate' : 'magistrate');
    }
  },

  actions: {
    resign(ctx) {
      if (ctx.state.judiciary.seat) leaveBench(ctx, 'Resigned from the bench');
    },
  },

  resolvers: {
    case(ctx, data, optionId) {
      const { state, rng } = ctx;
      const pool = [...CASES.trial, ...CASES.appellate, ...CASES.supreme];
      const k = pool.find((x) => x.id === data.caseId);
      const opt = k?.options.find(([id]) => id === optionId);
      if (!opt) return;
      const fx = opt[2];
      const seat = state.judiciary.seat;
      const pol = state.politics?.office?.id === 'judge' ? state.politics.office : null;
      if (seat) {
        seat.rulings += 1;
        seat.reputation = Math.round(clamp(seat.reputation + (fx.rep ?? 0), 0, 100));
        seat.approval = Math.round(clamp(seat.approval + (fx.approval ?? 0), 0, 100));
      }
      if (pol) pol.approval = Math.round(clamp(pol.approval + (fx.approval ?? 0), 0, 100));
      let note = '';
      if (fx.reverse && rng.chance(fx.reverse)) {
        if (seat) {
          seat.reversals += 1;
          seat.reputation = Math.max(0, seat.reputation - 4);
        }
        note = ' The appeals court reversed you.';
      }
      if (fx.risk && rng.chance(fx.risk)) {
        note += ' The defendant violated the order and hurt someone. The headlines named you.';
        if (seat) seat.approval = Math.max(0, seat.approval - 12);
        if (pol) pol.approval = Math.max(0, pol.approval - 12);
      }
      ctx.log(`${k.title}: ${opt[1].replace(/^\S+\s/, '')}.${note}`, '⚖️', note ? 'warn' : undefined);
    },
    nomination(ctx, data, optionId) {
      const { state, rng } = ctx;
      const c = COURTS[data.court];
      if (state.legal.incarceration) return ctx.log('Your nomination was withdrawn.', '📭', 'bad');
      if (optionId !== 'accept') return ctx.log(`You declined to be considered for ${c.name}.`, '🙅');
      if (c.system === 'federal' && c.rank >= 2) {
        ctx.prompt({
          type: 'judiciary.hearing', icon: '🏛️', title: 'Confirmation Hearing',
          text: `Senators grill you for two days. One asks how you would rule on a hot-button case likely to come before ${data.court === 'scotus' ? 'the Court' : 'you'}.`,
          options: [
            { id: 'decline', label: '🤐 "I can\'t comment on cases that may come before me."', hint: 'The Ginsburg rule — safe, unsatisfying' },
            { id: 'candid', label: '🗣️ Answer candidly', hint: 'Wins one side, loses the other' },
            { id: 'record', label: '📚 Walk through your record and published opinions', hint: 'Depends on your reputation' },
          ],
          data,
        });
        return;
      }
      if (data.method === 'elected') {
        ctx.spend(250000 * (c.rank >= 3 ? 1 : 0.4), 'Judicial campaign', { allowDebt: true });
        if (!rng.chance(clamp(0.45 + ((state.judiciary.seat?.approval ?? 55) - 50) / 100 + (state.politics?.recognition ?? 0) / 300, 0.15, 0.8))) {
          return ctx.log(`You lost the election for ${c.name}.`, '📉', 'bad');
        }
      }
      takeSeat(ctx, data.court);
    },
    hearing(ctx, data, optionId) {
      const { state, rng } = ctx;
      const rep = state.judiciary.seat?.reputation ?? 55;
      const odds = clamp({ decline: 0.7, candid: 0.5, record: 0.4 + rep / 150 }[optionId] - (data.court === 'scotus' ? 0.1 : 0), 0.1, 0.95);
      if (rng.chance(odds)) {
        ctx.log(`The Senate confirmed you, ${rng.int(51, 90)}–${rng.int(8, 49)}.`, '🏛️', 'good');
        takeSeat(ctx, data.court);
      } else ctx.log('Your nomination stalled in committee and was withdrawn.', '🏛️', 'bad');
    },
    senior(ctx, data, optionId) {
      if (optionId === 'senior') leaveBench(ctx, 'Took senior status', { senior: true });
    },
  },
};
