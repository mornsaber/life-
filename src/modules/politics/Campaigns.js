/**
 * Campaigns & elections.
 *
 * Declaring starts a year-long campaign: fundraise (donors may want
 * favors), self-fund, chase endorsements (unions, veterans, police, party,
 * editorial boards, the bar), canvass, debate. The election is decided at
 * the next age-up from name recognition, money relative to the race's cost,
 * endorsements, honors/prestige, experience in lower office, and scandals
 * from your legal record.
 */
import { prestige, yearlyCount, bumpYearly, isOnActiveDuty, isIncarcerated } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { residencyYears, stateOf } from '../life/Regions.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { yearsInProfession } from '../../core/State.js';
import { OFFICES, ENDORSEMENTS } from './Offices.js';

export function runEligibility(state, officeId) {
  const office = OFFICES[officeId];
  const p = state.politics;
  if (!office) return { ok: false, reason: 'Unknown office' };
  if (p.campaign) return { ok: false, reason: 'Already campaigning' };
  if (p.office?.id === officeId) return { ok: false, reason: 'You hold this office' };
  if (state.character.age < office.minAge) return { ok: false, reason: `Must be ${office.minAge}+` };
  if (residencyYears(state) < office.residency) return { ok: false, reason: `${office.residency} yr residency in ${stateOf(state).name}` };
  if (isIncarcerated(state)) return { ok: false, reason: 'Incarcerated' };
  if (isOnActiveDuty(state)) return { ok: false, reason: 'Active duty can\'t run (Hatch Act)' };
  if (state.career.job?.sector === 'federal') return { ok: false, reason: 'Federal employees can\'t run (Hatch Act)' };
  if (office.judicial) {
    if (!hasCredential(state, 'barLicense')) return { ok: false, reason: 'Needs a bar license' };
    if (yearsInProfession(state, ['law', 'prosecution', 'publicDefender', 'courts']) < 7) return { ok: false, reason: '7 yrs legal practice' };
  }
  const termsHere = p.history.filter((h) => h.officeId === officeId).reduce((s, h) => s + h.terms, 0);
  if (office.termLimit && termsHere >= office.termLimit) return { ok: false, reason: 'Term-limited' };
  return { ok: true };
}

/** Highest office level held so far (experience). */
export function experienceLevel(state) {
  const levels = state.politics.history.map((h) => OFFICES[h.officeId].level);
  if (state.politics.office) levels.push(OFFICES[state.politics.office.id].level);
  return Math.max(0, ...levels);
}

export function scandalPenalty(state) {
  const age = state.character.age;
  return state.legal.record.reduce((s, r) => {
    const recency = age - r.age <= 10 ? 1 : 0.4;
    return s + (r.severity === 'felony' ? 0.14 : r.severity === 'misdemeanor' ? 0.03 : 0.01) * recency;
  }, 0) + (state.politics.scandals ?? 0) * 0.04;
}

/** Estimated vote share (before election-night noise). */
export function voteShare(state, officeId, campaign, { incumbent = false } = {}) {
  const office = OFFICES[officeId];
  const p = state.politics;
  let share = 0.38;
  share += Math.min(0.12, p.recognition * 0.0015);
  share += 0.08 * Math.min(1, (campaign?.funds ?? 0) / office.cost);
  share += (campaign?.endorsements.length ?? 0) * 0.015;
  share += Math.min(0.04, prestige(state) / 2000);
  const gap = office.level - 1 - experienceLevel(state);
  share += gap <= 0 ? 0.04 : -0.06 * gap;
  share -= (office.level - 1) * 0.028;
  if (office.statewide && !incumbent) share -= 0.04; // millions of voters, statewide media, national money
  if (campaign?.vsIncumbent) share -= 0.06;
  if (incumbent) share += 0.04 + (p.office.approval - 50) / 250;
  share -= scandalPenalty(state);
  return clamp(share, 0.05, 0.85);
}

function endorsementEligible(state, id) {
  const job = state.career.job;
  const hist = state.career.history;
  switch (id) {
    case 'labor': return Boolean(job?.unionMember) || state.politics.laborVotes > 1;
    case 'veterans': return state.military.history.length > 0 || Boolean(state.military.service);
    case 'lawEnforcement': return ['police', 'fire', 'statePolice', 'corrections', 'ems'].some((p) => job?.professionId === p || hist.some((h) => h.professionId === p)) || Object.values(state.emergency).some((m) => m && m.serviceName);
    case 'party': return state.politics.recognition >= 25;
    case 'editorial': return state.stats.smarts >= 60;
    case 'bar': return hasCredential(state, 'barLicense');
    default: return false;
  }
}

export const CampaignActions = {
  run(ctx, officeId) {
    const { state } = ctx;
    const check = runEligibility(state, officeId);
    if (!check.ok) return ctx.toast(check.reason, 'warn');
    const office = OFFICES[officeId];
    if (!ctx.spend(Math.round(office.cost * 0.01), 'Filing fees', { credit: true })) return ctx.toast(`Filing fees: $${Math.round(office.cost * 0.01).toLocaleString()} — card declined.`, 'warn');
    // Statewide seats are usually held by an entrenched incumbent.
    state.politics.campaign = { officeId, funds: 0, endorsements: [], startAge: state.character.age, vsIncumbent: Boolean(office.statewide) && ctx.rng.chance(0.6) };
    ctx.log(`You declared your candidacy for ${office.name}${state.politics.campaign.vsIncumbent ? ' against a popular incumbent' : ' for an open seat'}! The election is next year.`, office.icon, 'milestone');
    ctx.toast(`Running for ${office.name}`, 'good');
  },

  fundraise(ctx) {
    const { state, rng } = ctx;
    const c = state.politics.campaign;
    if (!c) return;
    if (yearlyCount(state, 'politics.fundraise') >= 2) return ctx.toast('Your donor list is tapped out this year.', 'warn');
    bumpYearly(state, 'politics.fundraise');
    const office = OFFICES[c.officeId];
    const network = (state.career.job?.grade ?? 0) * 0.04 + prestige(state) / 1000 + state.politics.recognition / 200;
    const raised = Math.round(office.cost * rng.float(0.12, 0.3) * (0.6 + network));
    c.funds += raised;
    ctx.stat('stress', 5);
    ctx.log(`You spent weeks dialing for dollars and raised $${raised.toLocaleString()}.`, '📞');
    if (rng.chance(0.3)) {
      ctx.prompt({
        type: 'politics.donorFavor',
        icon: '💼',
        title: 'A Generous Donor',
        text: `A developer offers to max out — and have dozens of employees "donate" too, reimbursed by the company. It would double your war chest.`,
        options: [
          { id: 'straw', label: '💸 Take the straw donations', hint: 'Campaign finance fraud', tone: 'danger' },
          { id: 'legal', label: '✅ Accept only his legal personal maximum' },
        ],
      });
    }
  },

  selfFund(ctx) {
    const { state } = ctx;
    const c = state.politics.campaign;
    if (!c) return;
    const amount = Math.max(0, Math.round(state.finances.cash * 0.25));
    if (amount < 1000) return ctx.toast('Not enough cash to self-fund.', 'warn');
    ctx.spend(amount, 'Campaign self-funding');
    c.funds += amount;
    ctx.log(`You loaned your campaign $${amount.toLocaleString()} of your own money.`, '💵');
  },

  endorse(ctx, id) {
    const { state, rng } = ctx;
    const c = state.politics.campaign;
    if (!c || c.endorsements.includes(id) || !ENDORSEMENTS[id]) return;
    if (yearlyCount(state, `politics.endorse.${id}`)) return ctx.toast('Already asked this year.', 'warn');
    bumpYearly(state, `politics.endorse.${id}`);
    if (!endorsementEligible(state, id) || !rng.chance(0.65)) {
      ctx.log(`${ENDORSEMENTS[id].name} endorsed your opponent.`, ENDORSEMENTS[id].icon, 'warn');
      return;
    }
    c.endorsements.push(id);
    ctx.log(`${ENDORSEMENTS[id].name} endorsed you!`, ENDORSEMENTS[id].icon, 'good');
  },

  canvass(ctx) {
    const { state } = ctx;
    if (!state.politics.campaign) return;
    if (yearlyCount(state, 'politics.canvass')) return ctx.toast('Your feet need a rest.', 'warn');
    bumpYearly(state, 'politics.canvass');
    state.politics.recognition = Math.min(100, state.politics.recognition + 6);
    ctx.stat('fitness', 2);
    ctx.stat('stress', 4);
    ctx.log('You knocked on thousands of doors.', '🚪');
  },

  debate(ctx) {
    const { state } = ctx;
    const c = state.politics.campaign;
    if (!c || yearlyCount(state, 'politics.debate')) return;
    bumpYearly(state, 'politics.debate');
    ctx.prompt({
      type: 'politics.debate',
      icon: '🎤',
      title: 'The Debate',
      text: `Your opponent opens by attacking your record. ${state.legal.record.length ? 'They bring up your arrest record.' : 'They call you inexperienced.'}`,
      options: [
        { id: 'policy', label: '📊 Pivot to detailed policy', hint: 'Smarts' },
        { id: 'attack', label: '🗡️ Hit back hard', hint: 'Risky' },
        { id: 'charm', label: '😊 Stay warm and personable', hint: 'Looks' },
      ],
    });
  },
};

export const CampaignResolvers = {
  donorFavor(ctx, _data, optionId) {
    const c = ctx.state.politics.campaign;
    if (!c) return;
    if (optionId === 'straw') {
      c.funds += Math.round(OFFICES[c.officeId].cost * 0.3);
      ctx.log('The straw donations poured in.', '💸', 'warn');
      ctx.emit('legal:offense', { offenseId: 'campaignFinance', context: 'straw donor scheme', discovery: 0.2, evidence: 0.8 });
    } else {
      c.funds += Math.round(OFFICES[c.officeId].cost * 0.03);
      ctx.log('You took the legal maximum and nothing more.', '✅');
    }
  },
  debate(ctx, _data, optionId) {
    const { state, rng } = ctx;
    const stat = optionId === 'policy' ? state.stats.smarts : optionId === 'charm' ? state.stats.looks : 50 + rng.int(-30, 30);
    const won = stat + rng.int(-20, 20) >= 55;
    state.politics.recognition = Math.min(100, state.politics.recognition + (won ? 8 : 2));
    if (won) state.politics.campaign.funds += Math.round(OFFICES[state.politics.campaign.officeId].cost * 0.05);
    ctx.log(won ? 'Pundits scored the debate for you. Donations spiked.' : 'The debate was a wash — or worse.', '🎤', won ? 'good' : 'warn');
  },
};
