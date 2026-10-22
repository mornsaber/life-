/**
 * Where you stand: a platform of positions on the issues voters care about, the
 * record your votes and decisions write, and the credibility you lose by saying
 * one thing and doing another.
 *
 * Positions run from -2 (the left: the labor bloc's side) to +2 (the right: the
 * business bloc's). A new candidate starts at their party's line; you can change
 * a stance once a year, but moving more than a step — or moving at all in the
 * last year of a campaign — is a flip-flop, and voters remember those. Every vote
 * you cast in a legislature (and every bill you sign or veto) lands on the issue
 * it touches: vote against your own platform and your credibility drops.
 *
 * state.politics.platform    = { [issueId]: -2..2 }
 * state.politics.record      = { [issueId]: { votes, sum } }   your votes, averaged
 * state.politics.credibility = 0..100
 * state.politics.flipflops   = [{ age, issue, from, to }]
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';

/** The issues, and what each end of each one sounds like on the stump. */
export const ISSUES = {
  taxes: { name: 'Taxes', icon: '💵', stances: ['Tax the wealthy and corporations', 'Fairer, more progressive taxes', 'Hold the line on taxes', 'Cut taxes', 'Slash taxes across the board'] },
  services: { name: 'Spending & services', icon: '🏛️', stances: ['Expand public services', 'Invest in services', 'Keep services as they are', 'Trim government', 'Cut government down to size'] },
  crime: { name: 'Crime & policing', icon: '🚓', stances: ['Reimagine policing', 'Police reform', 'Balanced public safety', 'Back the police', 'Tough on crime'] },
  guns: { name: 'Guns', icon: '🔫', stances: ['Ban assault weapons', 'Universal background checks', 'Enforce existing laws', 'Protect gun rights', 'No new gun laws, ever'] },
  immigration: { name: 'Immigration', icon: '🛂', stances: ['A path to citizenship for all', 'Welcoming, with reform', 'Secure and fair', 'Stricter enforcement', 'Close the border'] },
  healthcare: { name: 'Health care', icon: '🏥', stances: ['Single-payer health care', 'A public option', 'Fix what we have', 'Market-based reform', 'Repeal the mandates'] },
  environment: { name: 'Environment', icon: '🌿', stances: ['Climate emergency action', 'Clean-energy investment', 'All of the above', 'Cut red tape for energy', 'Drill, mine and build'] },
  labor: { name: 'Workers & business', icon: '✊', stances: ['Stand with organized labor', 'Raise wages, protect workers', 'Pro-worker and pro-business', 'Free businesses to grow', 'Right to work, no mandates'] },
};
export const ISSUE_IDS = Object.keys(ISSUES);

/** Which issue each law touches (Laws.js). */
export const LAW_ISSUE = {
  minWage: 'labor', rightToWork: 'labor', cardCheck: 'labor', paidLeave: 'labor', nonCompeteBan: 'labor', publicBargaining: 'labor', workplaceSafety: 'labor', licensing: 'labor', antitrust: 'labor',
  businessTax: 'taxes', corporateRate: 'taxes', smallBizCredit: 'taxes', stateIncomeTax: 'taxes', incomeTax: 'taxes', propertyTax: 'taxes',
  infrastructure: 'services', publicPay: 'services', rentControl: 'services', zoning: 'services', privateEms: 'services', privateFire: 'services',
  cannabis: 'crime', privatePolicing: 'crime', privatePrisons: 'crime',
  environmental: 'environment',
};

/** Your party's line on every issue (independents sit in the middle). */
export const partyLine = (bloc) => (bloc === 'labor' ? -1 : bloc === 'business' ? 1 : 0);

export function platformOf(state) {
  const p = state.politics;
  if (!p.platform) {
    const line = partyLine(state.civic?.party?.bloc);
    p.platform = Object.fromEntries(ISSUE_IDS.map((id) => [id, line]));
  }
  for (const id of ISSUE_IDS) p.platform[id] ??= 0;
  return p.platform;
}
/** Read-only (for views and odds): the platform without creating one. */
export const platformView = (state) => state.politics.platform ?? Object.fromEntries(ISSUE_IDS.map((id) => [id, partyLine(state.civic?.party?.bloc)]));

/** Left (-2) to right (+2): the average of your positions. */
export const ideology = (state) => {
  const pf = platformView(state);
  return ISSUE_IDS.reduce((s, id) => s + pf[id], 0) / ISSUE_IDS.length;
};
export const ideologyLabel = (x) => (x <= -1.4 ? 'Progressive' : x <= -0.6 ? 'Left of center' : x < 0.6 ? 'Centrist' : x < 1.4 ? 'Right of center' : 'Hard right');
export const credibility = (state) => state.politics.credibility ?? 70;

/** Change a stance ("issue|value"). One change per issue a year; big moves are flip-flops. */
export function setStance(ctx, arg) {
  const { state } = ctx;
  const [issue, raw] = String(arg).split('|');
  const to = clamp(Math.round(Number(raw)), -2, 2);
  if (!ISSUES[issue] || !Number.isFinite(to)) return false;
  const pf = platformOf(state);
  const from = pf[issue];
  if (from === to) return false;
  if (yearlyCount(state, `platform.${issue}`)) { ctx.toast('You already changed that stance this year.', 'warn'); return false; }
  bumpYearly(state, `platform.${issue}`);
  pf[issue] = to;
  // Running (or in office): voters notice a big shift, and any shift close to an election.
  const exposed = Boolean(state.politics.campaign || state.politics.office);
  const late = state.politics.campaign && state.politics.campaign.electionAge - state.character.age <= 1;
  if (exposed && (Math.abs(to - from) >= 2 || late)) {
    state.politics.flipflops = [...(state.politics.flipflops ?? []).slice(-9), { age: state.character.age, issue, from, to }];
    state.politics.credibility = Math.round(clamp(credibility(state) - 8 * Math.abs(to - from), 0, 100));
    ctx.log(`You changed your position on ${ISSUES[issue].name.toLowerCase()}: "${ISSUES[issue].stances[to + 2]}." Opponents are calling it a flip-flop.`, '🔄', 'warn');
  } else {
    ctx.log(`Your platform on ${ISSUES[issue].name.toLowerCase()}: "${ISSUES[issue].stances[to + 2]}."`, ISSUES[issue].icon);
  }
  return true;
}

/**
 * A vote (or signature) on the record: lands on the law's issue. `side` is -1 for the left's
 * side of the bill, +1 for the right's. Voting against your own stance costs credibility.
 */
export function recordVote(state, lawId, side) {
  return recordStance(state, LAW_ISSUE[lawId], side);
}
/** A position taken in office on an issue (a vote, a decision): the record, and your credibility. */
export function recordStance(state, issue, side) {
  if (!ISSUES[issue] || !side) return null;
  const p = state.politics;
  p.record ??= {};
  const r = (p.record[issue] ??= { votes: 0, sum: 0 });
  r.votes += 1;
  r.sum += side;
  const stance = platformOf(state)[issue];
  const against = stance !== 0 && Math.sign(stance) !== Math.sign(side);
  if (against) p.credibility = Math.round(clamp(credibility(state) - 3 * Math.abs(stance), 0, 100));
  else if (stance !== 0) p.credibility = Math.round(clamp(credibility(state) + 1, 0, 100));
  return { issue, against };
}

/** Where your record actually puts you on an issue (null with no votes). */
export const recordOn = (state, issue) => {
  const r = state.politics.record?.[issue];
  return r?.votes ? r.sum / r.votes : null;
};

/** Credibility recovers slowly while you keep your word. */
export function platformYear(state) {
  const p = state.politics;
  if (p.credibility == null) return;
  p.credibility = Math.round(clamp(p.credibility + (p.credibility < 70 ? 2 : 0), 0, 100));
}
