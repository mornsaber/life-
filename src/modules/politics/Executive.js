/**
 * Running a government: what a mayor, governor, premier, president or prime
 * minister actually does — and what a ceremonial head of state does.
 *
 * Approval is earned, not rolled: it follows the economy, the budget (deficits,
 * downgrades), what you fund and cut, how you handle the year's crisis, and
 * scandals, with a honeymoon at the start. The crisis is a real decision with
 * real consequences: settle the teachers' strike (and fund the schools), seek
 * a stimulus (and borrow), sweep the encampments — each moves the budget, the
 * laws or the services, not just a number.
 *
 * Executives also send the legislature their agenda (Legislature.executiveBill),
 * write the budget (Budgets), reorganize services (PublicServices), address the
 * public, freeze hiring, and grant pardons. Presidents can be impeached when
 * scandal meets an opposition legislature; a vice president succeeds them.
 *
 * Ceremonial heads of state (a Bundespräsident, a Governor-General) sign laws —
 * or refer them to the court — grant honours and pardons, and ask a party to
 * form a government after an election.
 *
 * Also here: being picked as a presidential running mate, a cabinet post offered
 * by a president of your party, and the vice president's succession.
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { OFFICES } from './Offices.js';
import { budgetAt, executiveLevel, AREAS } from './Budgets.js';
import { executiveOf, unifiedGovernment } from './Legislature.js';
import { enact, lawValue } from './Laws.js';
import { experienceLevel } from './Campaigns.js';

const CAP = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ------------------------------------------------------------------ */
/* Approval                                                            */
/* ------------------------------------------------------------------ */

/** Why approval moved this year: [{ label, delta }]. */
export function approvalDrivers(state) {
  const o = state.politics.office;
  const level = executiveLevel(o?.id);
  const b = level ? budgetAt(state, level, { create: false }) : null;
  const out = [];
  const economy = { recession: -7, recovery: -1, expansion: 1, peak: 3 }[state.economy?.phase] ?? 0;
  if (economy) out.push({ label: state.economy.phase === 'recession' ? 'A recession on your watch' : 'A good economy', delta: economy });
  if (b) {
    if (b.balance < -0.04) out.push({ label: 'Running big deficits', delta: -3 });
    if (b.health < 35) out.push({ label: 'A budget crisis', delta: -4 });
    else if (b.health > 75) out.push({ label: 'Sound finances', delta: 2 });
    // Services voters notice: popular areas cut back (or generously funded).
    const pop = Object.entries(AREAS[b.level]).filter(([, a]) => a.popular >= 0.8);
    const avg = pop.reduce((s, [id]) => s + (b.funding[id] ?? 1), 0) / Math.max(1, pop.length);
    if (avg < 0.92) out.push({ label: 'Cuts to services people use', delta: -Math.round((0.95 - avg) * 60) });
    else if (avg > 1.06) out.push({ label: 'Well-funded schools, police and hospitals', delta: 2 });
  }
  const years = state.character.age - (o?.startAge ?? state.character.age);
  if (years <= 1) out.push({ label: 'Honeymoon', delta: 3 });
  else if (years >= 6) out.push({ label: 'Voter fatigue', delta: -2 });
  if ((state.politics.scandals ?? 0) > 0 && state.politics.scandalAge === state.character.age) out.push({ label: 'Scandal', delta: -8 });
  return out;
}

function approvalYear(ctx) {
  const { state, rng } = ctx;
  const o = state.politics.office;
  const drivers = approvalDrivers(state);
  const delta = drivers.reduce((s, d) => s + d.delta, 0);
  o.approval = Math.round(clamp(o.approval + (50 - o.approval) * 0.1 + delta + rng.int(-3, 3), 0, 100));
  o.drivers = drivers;
}

/* ------------------------------------------------------------------ */
/* The year's crisis                                                   */
/* ------------------------------------------------------------------ */

/**
 * A crisis per level: each option's `fx` changes the budget (fund: { area: factor }, levy, debt),
 * a law (law: [lawId, value]) or approval, and may gamble on the outcome.
 */
export const ISSUES = {
  city: [
    { id: 'policeContract', title: 'The Police Contract', text: 'The police union\'s contract is up. They want a 9% raise and won\'t take less without a fight.', options: [
      { id: 'settle', label: '🤝 Settle at 7%', fx: { fund: { police: 1.05 }, approval: 2 } },
      { id: 'hold', label: '🧱 Hold the line at 2%', fx: { approval: -2, gamble: 6, fail: 'Sick-outs swept the department for a week.' } },
      { id: 'reform', label: '⚖️ Trade money for reforms (body cameras, oversight)', fx: { fund: { police: 1.03 }, approval: 3 } },
    ] },
    { id: 'homeless', title: 'Encampments Downtown', text: 'Tents line the riverfront and businesses are furious. Advocates want housing; the business district wants them gone.', options: [
      { id: 'housing', label: '🏘️ Fund supportive housing', fx: { fund: { housing: 1.12 }, approval: 1 } },
      { id: 'sweep', label: '🚓 Clear the encampments', fx: { fund: { police: 1.03 }, approval: 0, gamble: 8 } },
      { id: 'wait', label: '🗄️ Form a task force', fx: { approval: -4 } },
    ] },
    { id: 'potholes', title: 'The Pothole Year', text: 'A harsh winter left the streets cratered. Every neighborhood meeting is about roads.', options: [
      { id: 'pay', label: '🛣️ Emergency road repairs from the budget', fx: { fund: { works: 1.08 }, approval: 4 } },
      { id: 'bond', label: '🏗️ A road bond (borrow)', fx: { debt: 0.08, fund: { works: 1.12 }, approval: 5 } },
      { id: 'patch', label: '🩹 Patch what you can', fx: { approval: -3 } },
    ] },
    { id: 'stadium', title: 'The Stadium Deal', text: 'The team wants a new stadium and says it\'ll move without public money.', options: [
      { id: 'yes', label: '🏟️ Publicly finance it', fx: { debt: 0.12, approval: 2, gamble: 6 } },
      { id: 'no', label: '🙅 Not a dime of public money', fx: { approval: 0, gamble: 6, fail: 'The team announced it\'s moving. Fans blame you.' } },
    ] },
  ],
  state: [
    { id: 'teachers', title: 'Teachers\' Strike', text: 'Teachers walked out over pay and class sizes. Parents are scrambling.', options: [
      { id: 'settle', label: '🍎 Settle: raise school funding', fx: { fund: { education: 1.06 }, approval: 4 } },
      { id: 'wait', label: '⏳ Wait them out', fx: { approval: -6, gamble: 6 } },
      { id: 'order', label: '📜 Order them back to work', fx: { approval: -3, law: ['publicBargaining', false], gamble: 8 } },
    ] },
    { id: 'prisons', title: 'Overcrowded Prisons', text: 'A federal judge says your prisons are unconstitutionally overcrowded.', options: [
      { id: 'build', label: '🏗️ Build more prison space', fx: { debt: 0.06, fund: { corrections: 1.1 }, approval: 0 } },
      { id: 'release', label: '🔓 Early release for nonviolent offenders', fx: { fund: { corrections: 0.95 }, approval: -2, gamble: 8 } },
      { id: 'contract', label: '🏢 Contract beds to a private prison company', fx: { approval: -1, privatePrisons: true } },
    ] },
    { id: 'medicaid', title: 'Health-Care Costs', text: 'Health spending is eating the budget. Hospitals warn of closures if payments fall.', options: [
      { id: 'protect', label: '🏥 Protect it: raise taxes', fx: { levy: 0.03, approval: -1 } },
      { id: 'trim', label: '✂️ Trim payments to providers', fx: { fund: { health: 0.94 }, approval: -3 } },
      { id: 'expand', label: '➕ Expand coverage', fx: { fund: { health: 1.08 }, approval: 3 } },
    ] },
    { id: 'incentive', title: 'The Factory Incentive', text: 'A manufacturer will bring 4,000 jobs for a $1 billion tax-incentive package.', options: [
      { id: 'yes', label: '🏭 Offer the package', fx: { levy: -0.02, approval: 4, gamble: 6 } },
      { id: 'no', label: '🙅 Corporate welfare — no', fx: { approval: -1 } },
    ] },
  ],
  national: [
    { id: 'stimulus', title: 'Stimulus or Restraint', text: 'Growth is stalling. Economists split between a stimulus package and fiscal restraint.', options: [
      { id: 'stimulus', label: '💵 A big stimulus (borrow)', fx: { debt: 0.3, fund: { welfare: 1.08, infrastructure: 1.15 }, approval: 4 } },
      { id: 'targeted', label: '🎯 A targeted package', fx: { debt: 0.1, fund: { infrastructure: 1.06 }, approval: 2 } },
      { id: 'restraint', label: '🧾 Restraint: balance the books', fx: { fund: { welfare: 0.96, admin: 0.95 }, approval: -2 } },
    ] },
    { id: 'defense', title: 'The Defense Review', text: 'The generals want a bigger budget; your finance minister wants cuts.', options: [
      { id: 'build', label: '🎖️ Build up the military', fx: { fund: { defense: 1.08 }, approval: 1 } },
      { id: 'hold', label: '⚖️ Hold it flat', fx: { approval: 0 } },
      { id: 'cut', label: '✂️ Cut it and spend at home', fx: { fund: { defense: 0.92, health: 1.03 }, approval: 0, gamble: 5 } },
    ] },
    { id: 'pensions', title: 'The Pension Shortfall', text: 'Actuaries say the pension system runs short in a decade.', options: [
      { id: 'tax', label: '🧾 Raise payroll taxes', fx: { levy: 0.03, approval: -3 } },
      { id: 'age', label: '👵 Raise the retirement age', fx: { fund: { pensions: 0.95 }, approval: -5 } },
      { id: 'kick', label: '🥫 Kick the can', fx: { approval: 0, debt: 0.1 } },
    ] },
    { id: 'taxReform', title: 'Tax Reform', text: 'Your party wants a tax bill before the next election.', options: [
      { id: 'cut', label: '✂️ Cut income taxes', fx: { law: ['incomeTax', 'cut'], approval: 3 } },
      { id: 'hike', label: '🏦 Raise taxes on top earners', fx: { law: ['incomeTax', 'hike'], approval: 0, gamble: 5 } },
      { id: 'none', label: '🧾 Leave rates alone', fx: { approval: 0 } },
    ] },
  ],
};
const DEBT_CEILING = { id: 'debtCeiling', title: 'The Debt Ceiling', text: 'The other party controls Congress and won\'t raise the debt limit without spending cuts.', options: [
  { id: 'deal', label: '🤝 Cut a deal: trim discretionary spending', fx: { fund: { admin: 0.94, education: 0.97 }, approval: 1 } },
  { id: 'clean', label: '📣 Demand a clean increase', fx: { approval: 0, gamble: 7, fail: 'The standoff dragged on. Markets wobbled and the government shut down.', shutdown: true } },
] };

function issuePrompt(ctx, level) {
  const { state, rng } = ctx;
  const pool = [...ISSUES[level]];
  if (level === 'national' && (state.character.countryId ?? 'US') === 'US' && !unifiedGovernment(state, 'national')) pool.push(DEBT_CEILING);
  const issue = rng.pick(pool);
  const b = budgetAt(state, level);
  ctx.prompt({
    type: 'executive.issue', icon: '🏛️', title: issue.title,
    text: `${CAP(b.name)} · approval ${state.politics.office.approval}% · fiscal health ${b.health}\n${issue.text}`,
    options: issue.options.map((o) => ({ id: o.id, label: o.label })),
    data: { level, issueId: issue.id },
  });
}

/** Apply an option's effects to the budget, the law and your approval. */
function applyFx(ctx, level, fx) {
  const { state, rng } = ctx;
  const b = budgetAt(state, level);
  const o = state.politics.office;
  for (const [area, k] of Object.entries(fx.fund ?? {})) if (b.funding[area] != null) b.funding[area] = Math.round(clamp(b.funding[area] * k, 0.6, 1.4) * 1000) / 1000;
  if (fx.levy) b.levy = Math.round(((b.levy ?? 0) + fx.levy) * 1000) / 1000 || 0;
  if (fx.debt) b.debt = Math.round((b.debt + fx.debt) * 100) / 100;
  if (fx.law) {
    const [lawId, value] = fx.law;
    const lv = level === 'national' ? 'federal' : level;
    enact(state, { level: lv, where: lv === 'federal' ? (state.character.countryId && state.character.countryId !== 'US' ? state.character.countryId : null) : b.where, lawId, value, sponsor: 'you', age: state.character.age });
  }
  if (fx.privatePrisons && lawValue(state, 'privatePrisons')?.state === false) b.funding.corrections = Math.round(b.funding.corrections * 1.04 * 1000) / 1000;
  let delta = fx.approval ?? 0;
  let failed = false;
  if (fx.gamble) {
    failed = !rng.chance(0.5 + (state.stats.smarts - 50) / 200);
    delta += failed ? -fx.gamble : fx.gamble;
  }
  if (failed && fx.shutdown) b.shutdown = true;
  o.approval = Math.round(clamp(o.approval + delta, 0, 100));
  return { failed, delta };
}

/* ------------------------------------------------------------------ */
/* Ceremonial heads of state                                           */
/* ------------------------------------------------------------------ */

const HEAD_DUTIES = [
  { id: 'bill', title: 'A Law on Your Desk', text: 'Parliament passed a controversial law. Constitutional scholars doubt it\'s legal. You must sign it — or refer it to the constitutional court.', options: [
    { id: 'sign', label: '✍️ Sign it: parliament decides', approval: 0, recognition: 1 },
    { id: 'refer', label: '⚖️ Refer it to the court', approval: 2, recognition: 4, gamble: 6 },
  ] },
  { id: 'government', title: 'A Hung Parliament', text: 'The election left no majority. Party leaders are in your office one after another.', options: [
    { id: 'largest', label: '🤝 Ask the largest party to form a government', approval: 2 },
    { id: 'coalition', label: '🧩 Broker a coalition', approval: 3, recognition: 5, gamble: 5 },
    { id: 'dissolve', label: '🗳️ Dissolve parliament: new elections', approval: -3, recognition: 3 },
  ] },
  { id: 'visit', title: 'A State Visit', text: 'A foreign head of state is coming, and your country\'s relations with theirs are tense.', options: [
    { id: 'warm', label: '🍽️ A warm state banquet', approval: 1 },
    { id: 'frank', label: '🎤 A frank speech on human rights', approval: 3, recognition: 4, gamble: 4 },
  ] },
  { id: 'pardon', title: 'A Petition for Clemency', text: 'A prisoner whose case divided the country petitions you for a pardon.', options: [
    { id: 'grant', label: '🕊️ Grant it', approval: 0, gamble: 8 },
    { id: 'deny', label: '🙅 Deny it', approval: 0 },
  ] },
];

/* ------------------------------------------------------------------ */
/* The year                                                            */
/* ------------------------------------------------------------------ */

/** Is this office one that runs a government (approval, budget, crises)? */
export const runsGovernment = (officeId) => Boolean(executiveLevel(officeId));

/** Called by PoliticsEngine for an executive's year in place of the generic decision. */
export function executiveYear(ctx) {
  const { state, rng } = ctx;
  const o = state.politics.office;
  const level = executiveLevel(o.id);
  approvalYear(ctx);
  if (rng.chance(0.75)) issuePrompt(ctx, level);
  // Impeachment: scandal, unpopularity, and an opposition legislature.
  if (level !== 'city' && (state.politics.scandals ?? 0) >= 2 && o.approval < 35 && !unifiedGovernment(state, level) && rng.chance(0.4)) {
    ctx.prompt({
      type: 'executive.impeach', icon: '⚖️', title: 'Impeachment',
      text: `The legislature has voted articles of impeachment against you (approval ${o.approval}%). A trial follows.`,
      options: [{ id: 'fight', label: '🥊 Fight it at trial', hint: 'Removal takes a supermajority' }, { id: 'resign', label: '👋 Resign' }],
    });
  }
}

/** A ceremonial head of state's year: a duty or two, and a little standing. */
export function headYear(ctx) {
  const { state, rng } = ctx;
  const o = state.politics.office;
  o.approval = Math.round(clamp(o.approval + (62 - o.approval) * 0.15 + rng.int(-3, 3), 0, 100));
  const duty = rng.pick(HEAD_DUTIES);
  ctx.prompt({
    type: 'executive.headDuty', icon: OFFICES[o.id].icon, title: duty.title,
    text: `${OFFICES[o.id].name} · approval ${o.approval}%\n${duty.text}`,
    options: duty.options.map((x) => ({ id: x.id, label: x.label })),
    data: { dutyId: duty.id },
  });
}

/**
 * Offers that come to people outside the top job: a running mate, a cabinet post, a
 * Governor-Generalship — and the vice president's succession.
 */
export function offersYear(ctx) {
  const { state, rng } = ctx;
  const p = state.politics;
  const cc = state.character.countryId ?? 'US';
  const o = p.office;
  // The vice president: if the president can't go on, you take the oath.
  if (o?.id === 'vicePresident' && rng.chance(0.03)) {
    ctx.log(`The President ${rng.pick(['died suddenly', 'resigned', 'was removed from office'])}. You took the oath of office.`, '🇺🇸', 'milestone');
    ctx.emit('politics:take', { officeId: 'president', appointed: true });
    return;
  }
  if (cc === 'US' && !o?.id?.match(/^(president|vicePresident)$/) && !p.campaign) {
    const nat = executiveOf(state, 'national');
    const bloc = state.civic?.party?.bloc;
    // A running mate: a governor, senator or member of Congress of the nominee's party, in an election year.
    const electionNext = (nat?.nextElection ?? 0) === 1;
    if (electionNext && bloc && ['governor', 'usSenator', 'usRep', 'cabinetSecretary'].includes(o?.id) && p.recognition >= 45 && rng.chance(0.12)) {
      ctx.prompt({
        type: 'executive.runningMate', icon: '🎟️', title: 'The Shortlist',
        text: `The ${bloc === nat?.caucus ? 'President' : 'presidential nominee'} wants you as their running mate. If the ticket wins, you'll be Vice President — a heartbeat from the presidency.`,
        options: [{ id: 'accept', label: '🎟️ Join the ticket', hint: o ? `You'd give up ${OFFICES[o.id].name} if you win` : '' }, { id: 'decline', label: '🙅 Decline' }],
      });
    } else if (nat && !nat.you && bloc === nat.caucus && (experienceLevel(state) >= 4 || (state.career.job?.grade ?? 0) >= 9) && p.recognition >= 35 && !o?.id?.startsWith('cabinet') && rng.chance(0.05)) {
      ctx.prompt({
        type: 'executive.cabinet', icon: '💼', title: 'A Call from the White House',
        text: `President ${nat.name} wants you in the cabinet. Which department?`,
        options: [...Object.entries(CABINET).map(([id, c]) => ({ id, label: `${c.icon} ${c.title}` })), { id: 'decline', label: '🙅 Decline' }],
      });
    }
  }
  // Governors-General: appointed on the prime minister's advice from people of standing.
  const gg = { CA: 'ca_gg', AU: 'au_gg', NZ: 'nz_gg' }[cc];
  if (gg && !o && state.character.age >= 50 && (experienceLevel(state) >= 4 || p.recognition >= 70 || state.character.style?.knighthood || state.character.style?.peerage) && rng.chance(0.03)) {
    ctx.prompt({
      type: 'executive.ggOffer', icon: OFFICES[gg].icon, title: `${OFFICES[gg].name}`,
      text: `The Prime Minister will recommend you to the King as the next ${OFFICES[gg].name}: five years at Government House as the representative of the Crown.`,
      options: [{ id: 'accept', label: '👑 Accept' }, { id: 'decline', label: '🙅 Decline' }],
      data: { officeId: gg },
    });
  }
}

/** Cabinet departments: the budget area a secretary fights for. */
export const CABINET = {
  defense: { title: 'Secretary of Defense', icon: '🎖️', area: 'defense' },
  treasury: { title: 'Secretary of the Treasury', icon: '🏦', area: 'admin' },
  justice: { title: 'Attorney General', icon: '⚖️', area: 'policing' },
  homeland: { title: 'Secretary of Homeland Security', icon: '🛂', area: 'policing' },
  health: { title: 'Secretary of Health and Human Services', icon: '🏥', area: 'health' },
  education: { title: 'Secretary of Education', icon: '🎓', area: 'education' },
  transportation: { title: 'Secretary of Transportation', icon: '🚆', area: 'infrastructure' },
  interior: { title: 'Secretary of the Interior', icon: '🏞️', area: 'environment' },
  state: { title: 'Secretary of State', icon: '🌐', area: 'foreign' },
};

/* ------------------------------------------------------------------ */
/* Actions and resolvers                                               */
/* ------------------------------------------------------------------ */

export const ExecutiveModule = {
  id: 'executive',
  order: 33.05,
  actions: {
    /** A major address (a State of the Union, a State of the City): one a year. */
    address(ctx) {
      const { state, rng } = ctx;
      const o = state.politics.office;
      if (!o || !runsGovernment(o.id)) return ctx.toast('Only an executive gives this address.', 'warn');
      if (yearlyCount(state, 'executive.address')) return ctx.toast('Once a year.', 'warn');
      bumpYearly(state, 'executive.address');
      const good = rng.chance(0.35 + (state.stats.smarts + state.stats.looks) / 400);
      o.approval = Math.round(clamp(o.approval + (good ? 4 : -2), 0, 100));
      state.politics.recognition = Math.min(100, state.politics.recognition + 2);
      ctx.log(good ? 'Your address landed: the clips went everywhere for the right reasons.' : 'Your address fell flat. The commentators were merciless.', '🎤', good ? 'good' : 'warn');
    },
    /** Freeze government hiring: every area ~3% leaner, unions unhappy. */
    hiringFreeze(ctx) {
      const { state } = ctx;
      const o = state.politics.office;
      const level = executiveLevel(o?.id);
      if (!level) return ctx.toast('Only an executive can freeze hiring.', 'warn');
      if (yearlyCount(state, 'executive.freeze')) return ctx.toast('Once a year.', 'warn');
      bumpYearly(state, 'executive.freeze');
      const b = budgetAt(state, level);
      for (const id of Object.keys(b.funding)) b.funding[id] = Math.round(clamp(b.funding[id] * 0.97, 0.6, 1.4) * 1000) / 1000;
      o.approval = Math.round(clamp(o.approval - 1, 0, 100));
      ctx.log(`You froze hiring across ${b.name}: every department runs ~3% leaner this year.`, '🧊', 'info');
    },
    /** A pardon (governors, presidents): a gamble with the public. */
    pardon(ctx) {
      const { state, rng } = ctx;
      const o = state.politics.office;
      if (!o || !['state', 'national'].includes(executiveLevel(o.id))) return ctx.toast('Governors and presidents grant pardons.', 'warn');
      if (yearlyCount(state, 'executive.pardon')) return ctx.toast('Once a year.', 'warn');
      bumpYearly(state, 'executive.pardon');
      const wise = rng.chance(0.5 + (state.stats.smarts - 50) / 150);
      o.approval = Math.round(clamp(o.approval + (wise ? 2 : -6), 0, 100));
      ctx.log(wise ? 'You pardoned a man wrongly convicted thirty years ago. Even your critics praised it.' : 'You pardoned a donor\'s son. The story ran for weeks.', '🕊️', wise ? 'good' : 'bad');
    },
    /** As a cabinet secretary: fight for your department's budget. */
    lobbyDepartment(ctx) {
      const { state, rng } = ctx;
      const o = state.politics.office;
      if (o?.id !== 'cabinetSecretary') return;
      if (yearlyCount(state, 'executive.lobby')) return ctx.toast('Once a budget cycle.', 'warn');
      bumpYearly(state, 'executive.lobby');
      const dept = CABINET[o.dept];
      const b = budgetAt(state, 'national');
      if (rng.chance(0.45 + (o.approval - 50) / 200)) {
        b.funding[dept.area] = Math.round(clamp((b.funding[dept.area] ?? 1) * 1.04, 0.6, 1.4) * 1000) / 1000;
        ctx.log(`The White House backed you: ${AREAS.national[dept.area].label} gets 4% more next year.`, '💼', 'good');
      } else ctx.log('The budget office turned you down this year.', '📋', 'warn');
    },
  },
  resolvers: {
    issue(ctx, data, optionId) {
      const issue = [...ISSUES[data.level], DEBT_CEILING].find((i) => i.id === data.issueId);
      const opt = issue?.options.find((x) => x.id === optionId);
      if (!opt || !ctx.state.politics.office) return;
      const { failed } = applyFx(ctx, data.level, opt.fx);
      ctx.log(`${issue.title}: ${opt.label.replace(/^\S+\s/, '')}.${failed && opt.fx.fail ? ` ${opt.fx.fail}` : failed ? ' It backfired.' : ''} Approval ${ctx.state.politics.office.approval}%.`, '🏛️', failed ? 'warn' : undefined);
    },
    impeach(ctx, _data, optionId) {
      const { state, rng } = ctx;
      if (!state.politics.office) return;
      if (optionId === 'resign') return ctx.emit('politics:leave', { ctx, reason: 'Resigned facing impeachment' });
      if (rng.chance(0.3 + (35 - state.politics.office.approval) / 100)) {
        ctx.log('The trial ended in conviction. You were removed from office.', '⚖️', 'bad');
        ctx.emit('politics:leave', { ctx, reason: 'Removed by impeachment' });
      } else {
        state.politics.office.approval = Math.round(clamp(state.politics.office.approval + 6, 0, 100));
        ctx.log('Acquitted. You survived impeachment — and your base rallied.', '⚖️', 'good');
      }
    },
    headDuty(ctx, data, optionId) {
      const { state, rng } = ctx;
      const o = state.politics.office;
      const opt = HEAD_DUTIES.find((d) => d.id === data.dutyId)?.options.find((x) => x.id === optionId);
      if (!o || !opt) return;
      let delta = opt.approval ?? 0;
      if (opt.gamble) delta += rng.chance(0.55) ? opt.gamble : -opt.gamble;
      o.approval = Math.round(clamp(o.approval + delta, 0, 100));
      if (opt.recognition) state.politics.recognition = Math.min(100, state.politics.recognition + opt.recognition);
      ctx.log(`${opt.label.replace(/^\S+\s/, '')} (approval ${o.approval}%).`, '🎩');
    },
    runningMate(ctx, _data, optionId) {
      if (optionId !== 'accept') return ctx.log('You turned down a place on the ticket.', '🙅');
      ctx.state.politics.ticket = { age: ctx.state.character.age };
      ctx.log('You joined the presidential ticket. The election is next year.', '🎟️', 'milestone');
    },
    cabinet(ctx, _data, optionId) {
      if (optionId === 'decline' || !CABINET[optionId]) return ctx.log('You declined the cabinet post.', '🙅');
      ctx.emit('politics:take', { officeId: 'cabinetSecretary', appointed: true, dept: optionId });
    },
    ggOffer(ctx, data, optionId) {
      if (optionId !== 'accept') return ctx.log('You declined the vice-regal appointment.', '🙅');
      ctx.emit('politics:take', { officeId: data.officeId, appointed: true });
    },
  },
};

/** The ticket's election: the nominee's party wins or loses, and you with it. */
export function ticketYear(ctx) {
  const { state, rng } = ctx;
  const t = state.politics.ticket;
  if (!t || t.age >= state.character.age) return;
  state.politics.ticket = null;
  const nat = executiveOf(state, 'national');
  const ours = nat?.caucus === state.civic?.party?.bloc;
  const win = rng.chance(clamp(0.5 + (ours ? ((nat?.approval ?? 50) - 50) / 100 : 0) + state.politics.recognition / 1000, 0.25, 0.75));
  if (win) {
    ctx.log('Election night: your ticket won. You will be sworn in as Vice President.', '🎉', 'milestone');
    ctx.emit('politics:take', { officeId: 'vicePresident' });
  } else {
    state.politics.recognition = Math.min(100, state.politics.recognition + 8);
    ctx.log('Election night: your ticket lost. A national profile is a consolation prize.', '📉', 'bad');
  }
}
