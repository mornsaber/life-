/**
 * Elected office: election night, taking and leaving office, salary and the
 * elected-officials pension, approval, legislative votes and executive
 * decisions, term limits and re-election, scandals, disaster response, and
 * appointments — governors appoint judges and agency heads, and a
 * well-placed player can *be* appointed (to the bench, or to the top of a
 * state agency).
 *
 * state.politics = { office: { id, termYearsLeft, terms, approval, startAge, fullTime } | null,
 *                    campaign, history[], recognition, scandals, laborVotes }
 */
import { clamp } from '../../core/Random.js';
import { yearsInProfession } from '../../core/State.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { stateOf, regionOf } from '../life/Regions.js';
import { promotionStatus } from '../career/CareerEngine.js';
import { OFFICES } from './Offices.js';
import { voteShare, CampaignActions, CampaignResolvers } from './Campaigns.js';

function takeOffice(ctx, officeId, { appointed = false } = {}) {
  const { state } = ctx;
  const office = OFFICES[officeId];
  const p = state.politics;
  if (p.office) leaveOffice(ctx, `Sworn in as ${office.name}`);
  if (office.fullTime && state.career.job) ctx.emit('career:resign', { reason: `Took office as ${office.name}` });
  p.office = { id: officeId, termYearsLeft: office.term, terms: 1, approval: appointed ? 55 : 60, startAge: state.character.age, fullTime: office.fullTime };
  p.recognition = Math.min(100, p.recognition + office.level * 6);
  const where = office.level >= 5 || officeId === 'stateRep' || officeId === 'stateSenator' ? stateOf(state).name : regionOf(state).name.split(',')[0];
  ctx.log(`${appointed ? 'Appointed' : 'Sworn in'} as ${office.name} (${where}). ${office.fullTime ? '' : 'It\'s a part-time citizen office — keep your day job.'}`, office.icon, 'milestone');
  ctx.toast(`${office.icon} ${office.name}`, 'honor');
  ctx.stat('happiness', 10);
}

function leaveOffice(ctx, reason) {
  const { state } = ctx;
  const p = state.politics;
  if (!p.office) return;
  p.history.push({ officeId: p.office.id, startAge: p.office.startAge, endAge: state.character.age, terms: p.office.terms, reason });
  ctx.log(`You left office as ${OFFICES[p.office.id].name}: ${reason}.`, '🏛️');
  p.office = null;
}

function resolveElection(ctx) {
  const { state, rng } = ctx;
  const p = state.politics;
  const c = p.campaign;
  p.campaign = null;
  const office = OFFICES[c.officeId];
  // Higher offices have a contested primary before the general election.
  if (office.level >= 3) {
    const primary = voteShare(state, c.officeId, c) + rng.float(-0.08, 0.08);
    if (primary <= 0.5) {
      p.recognition = Math.min(100, p.recognition + 3);
      ctx.log(`🗳️ You lost the primary for ${office.name}.`, '📉', 'bad');
      ctx.stat('happiness', -6);
      p.everRan = true;
      return;
    }
    ctx.log(`🗳️ You won the primary for ${office.name}!`, '🗳️', 'good');
  }
  const share = clamp(voteShare(state, c.officeId, c) + rng.float(-0.08, 0.08), 0.02, 0.9);
  const pct = Math.round(share * 1000) / 10;
  if (share > 0.5) {
    ctx.log(`🗳️ Election night: you won ${office.name} with ${pct}% of the vote!`, '🎉', 'good');
    takeOffice(ctx, c.officeId);
  } else {
    p.recognition = Math.min(100, p.recognition + 4);
    ctx.log(`🗳️ Election night: you lost the race for ${office.name} (${pct}%).`, '📉', 'bad');
    ctx.stat('happiness', -8);
  }
  p.everRan = true;
}

const DECISIONS = {
  legislative: {
    title: 'Floor Vote',
    text: 'A contentious bill is up for a vote: {issue}.',
    issues: ['a minimum-wage increase', 'police reform', 'a gas tax for road repair', 'school vouchers', 'a public-sector pay raise', 'a data-privacy law'],
    options: [
      { id: 'popular', label: '📊 Vote with the polls', approval: 5, funds: 0 },
      { id: 'principle', label: '🧭 Vote your conscience', approval: -2, recognition: 4 },
      { id: 'donors', label: '💼 Vote with your donors', approval: -4, funds: 0.15 },
      { id: 'labor', label: '✊ Vote with organized labor', approval: 1, labor: 1 },
    ],
  },
  executive: {
    title: 'Executive Decision',
    text: 'Your administration must decide on {issue}.',
    issues: ['a budget shortfall', 'a prison overcrowding crisis', 'a teachers\' strike', 'a corporate relocation incentive package', 'emergency housing for the homeless'],
    options: [
      { id: 'bold', label: '⚡ Bold action', approval: 0, gamble: 14 },
      { id: 'compromise', label: '🤝 Broker a compromise', approval: 4 },
      { id: 'delay', label: '🗄️ Commission a study', approval: -3 },
    ],
  },
  judicial: {
    title: 'High-Profile Ruling',
    text: 'A case on {issue} has the whole state watching.',
    issues: ['police use of force', 'a corporate fraud', 'a death-penalty appeal', 'a contested election result'],
    options: [
      { id: 'law', label: '📖 Rule strictly on the law', approval: 2, recognition: 3 },
      { id: 'popular', label: '📣 Rule with public opinion', approval: 5 },
    ],
  },
};

function officeDecision(ctx) {
  const { state, rng } = ctx;
  const office = OFFICES[state.politics.office.id];
  const kind = office.judicial ? 'judicial' : office.executive || state.politics.office.id === 'mayor' ? 'executive' : 'legislative';
  const d = DECISIONS[kind];
  ctx.prompt({
    type: 'politics.decision',
    icon: office.icon,
    title: d.title,
    text: `${office.name} · Approval ${state.politics.office.approval}%\n${d.text.replace('{issue}', rng.pick(d.issues))}`,
    options: d.options.map((o) => ({ id: o.id, label: o.label })),
    data: { kind },
  });
}

function bribeOffer(ctx) {
  const office = OFFICES[ctx.state.politics.office.id];
  ctx.prompt({
    type: 'politics.bribe',
    icon: '😈',
    title: office.judicial ? 'An Envelope in Chambers' : office.executive ? 'Pay to Play' : 'A Vote for Sale',
    text: office.judicial ? 'A litigant\'s "friend" offers $250,000 for a favorable ruling.' : office.executive ? 'A contractor offers a $500,000 "consulting retainer" for your spouse if they win a state contract.' : 'A lobbyist offers $150,000 through a shell company for your vote on a bill.',
    options: [
      { id: 'take', label: '💰 Take it', tone: 'danger' },
      { id: 'refuse', label: '🙅 Refuse' },
      { id: 'report', label: '📞 Report it to the FBI' },
    ],
  });
}

export const PoliticsEngine = {
  id: 'politics',
  order: 33,

  init(state) {
    state.politics ??= { office: null, campaign: null, history: [], recognition: 0 };
    state.politics.scandals ??= 0;
    state.politics.laborVotes ??= 0;
  },

  setup(engine) {
    const bus = engine.bus;
    // Other modules can end a term (e.g. a trial judge elevated to a higher court).
    bus.on('politics:leave', ({ ctx, reason }) => leaveOffice(ctx, reason));
    bus.on('legal:convicted', ({ ctx, severity, name }) => {
      const p = ctx.state.politics;
      p.scandals += severity === 'felony' ? 3 : severity === 'misdemeanor' ? 1 : 0;
      if (!p.office) return;
      if (severity === 'felony') {
        ctx.log(`Convicted of ${name}, you were removed from office.`, '🗳️', 'bad');
        leaveOffice(ctx, 'Removed after a felony conviction');
      } else {
        p.office.approval = Math.max(0, p.office.approval - 20);
        ctx.log(`Your ${name} conviction became a front-page scandal.`, '📰', 'bad');
      }
    });
    bus.on('legal:incarcerated', ({ ctx }) => {
      ctx.state.politics.campaign = null;
      if (ctx.state.politics.office) leaveOffice(ctx, 'Resigned upon incarceration');
    });
    bus.on('region:changed', ({ ctx, fromState, toState }) => {
      const p = ctx.state.politics;
      if (fromState === toState) return;
      p.campaign = null;
      if (p.office) leaveOffice(ctx, 'Moved out of the jurisdiction');
      p.recognition = Math.round(p.recognition / 3);
    });
    bus.on('disaster:struck', ({ ctx, disaster }) => {
      const p = ctx.state.politics;
      if (!p.office || !['governor', 'mayor'].includes(p.office.id)) return;
      ctx.prompt({
        type: 'politics.disaster',
        icon: '🆘',
        title: `${disaster.name}: Your Response`,
        text: 'The cameras are on you. What does your administration do?',
        options: [
          { id: 'declare', label: '🚨 Declare an emergency and request federal aid immediately' },
          { id: 'visit', label: '🥾 Visit the hardest-hit areas in work boots' },
          { id: 'vacation', label: '🏝️ Stay on your out-of-state vacation' },
        ],
        data: { severity: disaster.severity },
      });
    });
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const p = state.politics;
    if (p.campaign && p.campaign.startAge < state.character.age) resolveElection(ctx);

    const o = p.office;
    if (o) {
      const office = OFFICES[o.id];
      ctx.earn(office.salary, `${office.name} salary`, { wage: true });
      ctx.emit('retirement:accrue', { planId: office.pension, salary: office.salary, employer: office.name });
      p.recognition = Math.min(100, p.recognition + 3);
      o.approval = Math.round(clamp(o.approval + (55 - o.approval) * 0.1 + rng.int(-6, 5), 0, 100));
      ctx.stat('stress', office.fullTime ? 6 : 3);
      o.termYearsLeft -= 1;
      if (rng.chance(0.6)) officeDecision(ctx);
      else if (rng.chance(0.25)) bribeOffer(ctx);
      if (office.executive && rng.chance(0.5)) {
        ctx.prompt({
          type: 'politics.appoint',
          icon: '⭐',
          title: 'Appointments',
          text: `A seat on the ${rng.pick(['state supreme court', 'appeals court', 'public utilities commission', 'parole board'])} is open. Who gets it?`,
          options: [
            { id: 'merit', label: '🏅 The most qualified career professional' },
            { id: 'donor', label: '💼 A loyal major donor' },
            { id: 'sell', label: '💰 Whoever pays you under the table', tone: 'danger' },
          ],
        });
      }
      if (o.termYearsLeft <= 0) {
        const served = p.history.filter((h) => h.officeId === o.id).reduce((s, h) => s + h.terms, 0) + o.terms;
        if (office.termLimit && served >= office.termLimit) leaveOffice(ctx, 'Term-limited');
        else {
          ctx.prompt({
            type: 'politics.reelection',
            icon: '🗳️',
            title: 'Your Term Is Up',
            text: `Approval ${o.approval}%. ${office.termLimit ? `Term ${served} of ${office.termLimit}.` : ''} Run again?`,
            options: [
              { id: 'run', label: '🗳️ Run for re-election', hint: `≈${Math.round(voteShare(state, o.id, { funds: office.cost * 0.6, endorsements: [] }, { incumbent: true }) * 100)}% projected` },
              { id: 'retire', label: '👋 Retire from office' },
            ],
          });
        }
      }
    }

    // Being appointed: judgeships for seasoned lawyers, agency heads for top performers.
    if (!o && !p.campaign) {
      const job = state.career.job;
      const status = job ? promotionStatus(state) : null;
      if (status?.appointable && job.performance >= 75 && rng.chance(0.15)) {
        const level = status.appointable[0];
        ctx.prompt({
          type: 'politics.appointmentOffer',
          icon: '⭐',
          title: 'A Call from the Governor',
          text: `The governor wants to appoint you ${level.title}.`,
          options: [{ id: 'accept', label: '🤝 Accept the appointment' }, { id: 'decline', label: '🙅 Decline' }],
          data: { kind: 'agency', levelId: level.id },
        });
      } else if (hasCredential(state, 'barLicense') && yearsInProfession(state, ['law', 'prosecution', 'publicDefender', 'courts']) >= 7 && state.character.age >= 35 && rng.chance(0.04 + p.recognition / 1000)) {
        ctx.prompt({
          type: 'politics.appointmentOffer',
          icon: '⚖️',
          title: 'Judicial Appointment',
          text: 'The governor has nominated you to fill a vacancy on the state trial court.',
          options: [{ id: 'accept', label: '⚖️ Accept and take the bench' }, { id: 'decline', label: '🙅 Decline' }],
          data: { kind: 'judge' },
        });
      }
    }
  },

  actions: {
    ...CampaignActions,
    resign(ctx) {
      if (ctx.state.politics.office) leaveOffice(ctx, 'Resigned');
    },
    dropOut(ctx) {
      if (!ctx.state.politics.campaign) return;
      ctx.state.politics.campaign = null;
      ctx.log('You suspended your campaign.', '🏳️');
    },
  },

  resolvers: {
    ...CampaignResolvers,
    decision(ctx, data, optionId) {
      const { state, rng } = ctx;
      const o = state.politics.office;
      if (!o) return;
      const opt = DECISIONS[data.kind].options.find((x) => x.id === optionId);
      let delta = opt.approval ?? 0;
      if (opt.gamble) delta += rng.chance(0.5) ? opt.gamble : -opt.gamble;
      o.approval = Math.round(clamp(o.approval + delta, 0, 100));
      if (opt.recognition) state.politics.recognition = Math.min(100, state.politics.recognition + opt.recognition);
      if (opt.labor) state.politics.laborVotes += 1;
      ctx.log(`${DECISIONS[data.kind].title}: ${opt.label.slice(2).trim()} (approval ${o.approval}%).`, '🏛️');
    },
    bribe(ctx, _data, optionId) {
      const { state, rng } = ctx;
      if (optionId === 'take') {
        ctx.earn(rng.int(150000, 500000), 'Undisclosed income');
        ctx.emit('legal:offense', { offenseId: 'publicCorruption', context: 'selling official acts', discovery: 0.2, evidence: 0.8 });
        ctx.log('You took the money.', '😈', 'warn');
      } else if (optionId === 'report') {
        state.politics.recognition = Math.min(100, state.politics.recognition + 10);
        if (state.politics.office) state.politics.office.approval = Math.min(100, state.politics.office.approval + 8);
        ctx.log('You wore a wire for the FBI. The briber was indicted and you were hailed as a reformer.', '🕵️', 'good');
      } else ctx.log('You showed them the door.', '🙅');
    },
    appoint(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const o = state.politics.office;
      if (!o) return;
      if (optionId === 'merit') o.approval = Math.min(100, o.approval + 3);
      else if (optionId === 'donor') o.approval = Math.max(0, o.approval - 4);
      else {
        ctx.earn(rng.int(200000, 600000), 'Undisclosed income');
        ctx.emit('legal:offense', { offenseId: 'publicCorruption', context: 'selling an appointment', discovery: 0.25, evidence: 0.8 });
      }
      ctx.log({ merit: 'You appointed a respected professional.', donor: 'You rewarded a loyal donor. Editorial boards noticed.', sell: 'You sold the appointment.' }[optionId], '⭐');
    },
    reelection(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const o = state.politics.office;
      if (!o) return;
      const office = OFFICES[o.id];
      if (optionId === 'retire') return leaveOffice(ctx, 'Retired from office');
      const share = clamp(voteShare(state, o.id, { funds: office.cost * 0.6, endorsements: [] }, { incumbent: true }) + rng.float(-0.07, 0.07), 0.05, 0.85);
      if (share > 0.5) {
        o.terms += 1;
        o.termYearsLeft = office.term;
        ctx.log(`Re-elected as ${office.name} with ${Math.round(share * 1000) / 10}%!`, '🎉', 'good');
      } else {
        ctx.log(`You lost your re-election bid (${Math.round(share * 1000) / 10}%).`, '📉', 'bad');
        leaveOffice(ctx, 'Lost re-election');
      }
    },
    appointmentOffer(ctx, data, optionId) {
      if (optionId !== 'accept') return ctx.log('You declined the governor\'s offer.', '🙅');
      if (data.kind === 'judge') takeOffice(ctx, 'judge', { appointed: true });
      else ctx.emit('career:appoint', { levelId: data.levelId });
    },
    disaster(ctx, data, optionId) {
      const o = ctx.state.politics.office;
      if (!o) return;
      const delta = { declare: 6, visit: 3, vacation: -15 }[optionId] * data.severity;
      o.approval = Math.round(clamp(o.approval + delta, 0, 100));
      ctx.log(optionId === 'vacation' ? 'Photos of you on the beach during the disaster went viral.' : 'Your disaster response won praise.', optionId === 'vacation' ? '📸' : '🆘', optionId === 'vacation' ? 'bad' : 'good');
    },
  },
};

export { OFFICES };
