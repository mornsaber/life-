/**
 * The campaign trail: declaring, the work of a campaign, and election night.
 *
 * You declare within the filing window (a year before most elections, two before a
 * governor's, senator's or president's race) and pick what your campaign is about.
 * Then it's work: dial for dollars, buy ads (or attack ads), knock doors, hold town
 * halls on the issue you want the race to turn on, dig up opposition research, debate
 * the other candidate, chase endorsements. Polls tell you where you stand. Multi-year
 * races bring events: gaffes, attack ads, an interest group's questionnaire.
 *
 * Election night, in the election year: the party primary first (if there is one),
 * then — after you choose how to run the general (pivot to the middle, fire up the
 * base, go negative, stay positive) — the general election against the other party's
 * nominee.
 */
import { clamp, Random } from '../../core/Random.js';
import { currentYear, prestige, yearlyCount, bumpYearly, criminalRecord } from '../../core/State.js';
import { OFFICES, ENDORSEMENTS } from './Offices.js';
import { runEligibility, voteShare, endorsementEligible } from './Campaigns.js';
import { ISSUES, ISSUE_IDS, platformOf, setStance } from './Platform.js';
import { executiveOf } from './Legislature.js';
import { electorateOf, newCampaign, nextElectionYear, FILING_WINDOW, outsideCalendar, generalShare, primaryShare, takePoll, opponentLabel, distance } from './Elections.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;
const abroad = (state) => (state.character.countryId ?? 'US') !== 'US';
const pct = (x) => `${Math.round(x * 1000) / 10}%`;
const raceRng = (state) => new Random(((state.world?.seed ?? 1) * 7919 + state.character.age * 131 + (state.politics.recognition ?? 0) * 17 + (state.politics.campaign?.funds ?? 0) % 9973) >>> 0);

/* ------------------------------------------------------------------ */
/* Election night                                                      */
/* ------------------------------------------------------------------ */

function remember(state, c, stage, share, won, against) {
  const p = state.politics;
  p.results = [...(p.results ?? []).slice(-11), { age: state.character.age, year: currentYear(state), officeId: c.officeId, stage, share: Math.round(share * 1000) / 10, won, against }];
  p.everRan = true;
}

/** The old one-step contest: party leaderships, parliaments' choices, China's appointments. */
function legacyElection(ctx) {
  const { state, rng } = ctx;
  const p = state.politics;
  const c = p.campaign;
  p.campaign = null;
  const office = OFFICES[c.officeId];
  const abroad = state.character.countryId && state.character.countryId !== 'US';
  if (office.level >= 3) {
    const primary = voteShare(state, c.officeId, c) + rng.float(-0.08, 0.08);
    if (primary <= 0.5) {
      p.recognition = Math.min(100, p.recognition + 3);
      ctx.log(abroad ? `🗳️ Your party didn't select you as its candidate for ${office.name}.` : `🗳️ You lost the primary for ${office.name}.`, '📉', 'bad');
      ctx.stat('happiness', -6);
      p.everRan = true;
      return;
    }
    ctx.log(abroad ? `🗳️ Your party selected you as its candidate for ${office.name}!` : `🗳️ You won the primary for ${office.name}!`, '🗳️', 'good');
  }
  const share = clamp(voteShare(state, c.officeId, c) + rng.float(-0.08, 0.08), 0.02, 0.9);
  remember(state, c, 'general', share, share > 0.5, null);
  if (share > 0.5) {
    ctx.log(`🗳️ You won ${office.name} with ${pct(share)} of the vote!`, '🎉', 'good');
    ctx.emit('politics:take', { officeId: c.officeId });
  } else {
    p.recognition = Math.min(100, p.recognition + 4);
    ctx.log(`🗳️ You lost the race for ${office.name} (${pct(share)}).`, '📉', 'bad');
    ctx.stat('happiness', -8);
  }
}

function runPrimary(ctx, c) {
  const { state, rng } = ctx;
  const p = state.politics;
  const office = OFFICES[c.officeId];
  const share = clamp(primaryShare(state, c.officeId, c) + rng.float(-0.06, 0.06), 0.03, 0.97);
  const rival = c.rivals[0];
  remember(state, c, 'primary', share, share > 0.5, rival?.name);
  if (share <= 0.5) {
    p.campaign = null;
    p.recognition = Math.min(100, p.recognition + 3);
    ctx.stat('happiness', -7);
    ctx.log(abroad(state) ? `🗳️ Your party chose ${rival?.name ?? 'another candidate'} over you as its candidate for ${office.name}.` : `🗳️ Primary night: ${rival?.name ?? 'a challenger'} beat you for the nomination for ${office.name} (you got ${pct(share)}). The base wanted someone else.`, '📉', 'bad');
    if (c.incumbent && p.office?.id === c.officeId) ctx.emit('politics:leave', { reason: 'Lost the primary' });
    return;
  }
  ctx.log(abroad(state) ? `🗳️ Your party selected you as its candidate for ${office.name}${rival ? ` over ${rival.name}` : ''}.` : `🗳️ Primary night: you won the nomination for ${office.name} with ${pct(share)}${rival ? `, beating ${rival.name}` : ''}.`, '🗳️', 'good');
  c.stage = 'general';
  c.rivals = [];
  generalPrompt(ctx, c);
}

function generalPrompt(ctx, c) {
  const { state } = ctx;
  const office = OFFICES[c.officeId];
  const { share } = generalShare(state, c.officeId, c, { incumbent: c.incumbent });
  ctx.prompt({
    type: 'politics.general', icon: '🗳️', title: `The General Election: ${office.name}`,
    text: `You against ${opponentLabel(state, c.opponent)}, ${c.opponent.background}. The last poll has you at ${Math.round(share * 100)}%. How do you close the campaign?`,
    options: [
      { id: 'center', label: '🧭 Pivot to the middle', hint: 'Win swing voters; your base and your credibility notice' },
      { id: 'base', label: '📣 Fire up the base', hint: 'Turnout: best where the district leans your way' },
      { id: 'attack', label: '🗡️ Go negative', hint: 'Can work. Can backfire.' },
      { id: 'positive', label: '🌅 Stay positive', hint: 'Safe; a little momentum' },
    ],
    data: { officeId: c.officeId },
  });
}

function runGeneral(ctx, c) {
  const { state, rng } = ctx;
  const p = state.politics;
  const office = OFFICES[c.officeId];
  p.campaign = null;
  const { share: projected } = generalShare(state, c.officeId, c, { incumbent: c.incumbent });
  const share = clamp(projected + rng.float(-0.04, 0.04), 0.02, 0.95);
  const opp = opponentLabel(state, c.opponent);
  remember(state, c, 'general', share, share > 0.5, c.opponent.name);
  if (share > 0.5) {
    ctx.stat('happiness', 10);
    if (c.incumbent && p.office?.id === c.officeId) {
      p.office.terms += 1;
      p.office.termYearsLeft = office.term;
      delete p.office.asked;
      ctx.log(`🗳️ Re-elected as ${office.name} with ${pct(share)} over ${opp}!`, '🎉', 'good');
    } else {
      ctx.log(`🗳️ Election night: you beat ${opp} for ${office.name}, ${pct(share)} to ${pct(1 - share)}!`, '🎉', 'good');
      ctx.emit('politics:take', { officeId: c.officeId });
    }
  } else {
    p.recognition = Math.min(100, p.recognition + 4);
    ctx.stat('happiness', -8);
    ctx.log(`🗳️ Election night: ${opp} beat you for ${office.name}, ${pct(1 - share)} to ${pct(share)}.`, '📉', 'bad');
    if (c.incumbent && p.office?.id === c.officeId) ctx.emit('politics:leave', { reason: 'Lost re-election' });
  }
}

/* ------------------------------------------------------------------ */
/* A year on the trail                                                 */
/* ------------------------------------------------------------------ */

const TRAIL_EVENTS = [
  { id: 'gaffe', title: 'A Hot Mic', text: 'A microphone you thought was off caught you mocking voters on the other side.', options: [{ id: 'apologize', label: '🙏 Apologize, sincerely' }, { id: 'double', label: '😤 Double down' }, { id: 'ignore', label: '🤐 Say nothing' }] },
  { id: 'attackAd', title: 'The Attack Ad', text: '{opp} is running ads calling you {charge}.', options: [{ id: 'respond', label: '📺 Answer it with your own ad', hint: 'Costs money' }, { id: 'counter', label: '🗡️ Hit back on their record' }, { id: 'ignore', label: '🙄 Ignore it' }] },
  { id: 'questionnaire', title: 'The Questionnaire', text: 'An influential {group} wants you to sign a pledge on {issue}. Their endorsement and their volunteers come with it.', options: [{ id: 'sign', label: '✍️ Sign the pledge', hint: 'Commits your stance' }, { id: 'decline', label: '🙅 Decline' }] },
  { id: 'skeleton', needs: (s) => Boolean(skeletonOf(s)), title: 'Your Past Comes Out', text: 'A reporter has found {skeleton}, and {opp}\'s campaign is making sure every voter hears about it.', options: [{ id: 'own', label: '🙋 Own it in a long, honest interview' }, { id: 'deny', label: '🙅 Deny and attack the reporter', hint: 'If it unravels, it\'s over' }, { id: 'silent', label: '🤐 "No comment"' }] },
  { id: 'volunteers', title: 'A Wave of Volunteers', text: 'Hundreds of people have signed up to volunteer since your last speech. Your field office can\'t cope.', options: [{ id: 'data', label: '📊 Spend on voter data and organisers to use them well', hint: 'Costs money' }, { id: 'rally', label: '📣 Throw a big rally', hint: 'Energy; less targeted' }] },
  { id: 'manager', title: 'A Hired Gun', text: 'A campaign manager who has won three tough races is available — at a price.', options: [{ id: 'hire', label: '💼 Hire them', hint: 'Costs money; a sharper campaign' }, { id: 'friend', label: '🤝 Stick with your friend who\'s running it now', hint: 'Loyal, inexperienced' }] },
  { id: 'news', title: 'The Issue of the Moment', text: '{news} Suddenly every voter wants to hear about {issueName}.', options: [{ id: 'lead', label: '🎤 Lead on it' }, { id: 'change', label: '🔀 Change the subject' }] },
];
const CHARGES = { taxes: 'a tax-and-spend extremist', services: 'out to gut services', crime: 'soft on crime', guns: 'coming for people\'s guns', immigration: 'for open borders', healthcare: 'a threat to your health care', environment: 'a puppet of polluters', labor: 'anti-worker' };
const NEWS = { crime: 'A string of shootings leads the evening news.', taxes: 'Property tax bills just went up 12%.', services: 'A bridge failed inspection and the library cut its hours.', healthcare: 'The county hospital is closing its maternity ward.', environment: 'A chemical spill fouled the river.', immigration: 'A border surge dominates cable news.', labor: 'The biggest employer in town announced layoffs.', guns: 'A school lockdown shook the town.' };
const GROUPS = { taxes: 'taxpayers\' association', services: 'teachers\' union', crime: 'police union', guns: 'gun-rights group', immigration: 'immigrant-rights coalition', healthcare: 'nurses\' association', environment: 'environmental group', labor: 'labor federation' };

/** Something in your past a reporter could dig up, or null. */
export function skeletonOf(state) {
  if (state.legal?.yearsInside) return `that you served ${state.legal.yearsInside} year${state.legal.yearsInside === 1 ? '' : 's'} in prison`;
  const felony = (state.legal?.record ?? []).find((r) => r.severity === 'felony' && !r.vacated);
  if (felony) return `your conviction for ${felony.name.toLowerCase()}`;
  if (state.finances?.bankruptcies) return 'your bankruptcy';
  if ((state.legal?.record ?? []).some((r) => r.offenseId === 'dui')) return 'your drink-driving conviction';
  if (state.people?.affair) return 'your affair';
  return null;
}

function trailEvent(ctx, c) {
  const { state, rng } = ctx;
  if (state.prompts.some((x) => x.type === 'politics.trail')) return;
  const e = rng.pick(TRAIL_EVENTS.filter((x) => !x.needs || x.needs(state)));
  const pf = platformOf(state);
  const electorate = electorateOf(state, c.officeId);
  // Attacks land on your most exposed issue: where you're furthest from the voters.
  const exposed = ISSUE_IDS.reduce((a, b) => (Math.abs(pf[b] - electorate.median[b]) > Math.abs(pf[a] - electorate.median[a]) ? b : a));
  const issue = e.id === 'attackAd' ? exposed : rng.pick(ISSUE_IDS);
  const side = rng.chance(0.5) ? -2 : 2;
  const text = e.text.replace('{opp}', c.opponent.name).replace('{charge}', CHARGES[issue]).replace('{group}', GROUPS[issue]).replace('{issue}', `"${ISSUES[issue].stances[side + 2]}"`).replace('{skeleton}', skeletonOf(state) ?? '').replace('{news}', NEWS[issue]).replace('{issueName}', ISSUES[issue].name.toLowerCase());
  ctx.prompt({ type: 'politics.trail', icon: '🗞️', title: e.title, text, options: e.options, data: { event: e.id, issue, side } });
}

/** Every age-up while campaigning: either the trail goes on, or it's election night. */
export function campaignYear(ctx) {
  const { state, rng } = ctx;
  const c = state.politics.campaign;
  if (!c) return;
  if (c.legacy) {
    if (c.startAge < state.character.age) legacyElection(ctx);
    return;
  }
  if (currentYear(state) < c.electionYear) {
    // The other side raises money too; there's news; there's a poll.
    const office = OFFICES[c.officeId];
    c.opponent.funds += Math.round(office.cost * rng.float(0.15, 0.35) * (0.6 + c.opponent.quality / 100));
    c.momentum = (c.momentum ?? 0) * 0.5;
    takePoll(state, c, rng);
    if (rng.chance(0.75)) trailEvent(ctx, c);
    ctx.log(`On the trail for ${office.name}: the election is in ${c.electionYear}. Latest poll: ${c.polls.at(-1).you}%.`, '🗳️');
    return;
  }
  if (c.stage === 'primary') runPrimary(ctx, c);
  else generalPrompt(ctx, c);
}

/**
 * A mayor's, governor's or president's race is against the person actually in office (the
 * executive the legislature works with) — unless they're term-limited. In your own party,
 * that's a primary against them.
 */
function seatHolder(state, c, rng) {
  const level = { mayor: 'city', governor: 'state', president: 'federal' }[c.officeId];
  const ex = level ? executiveOf(state, level) : null;
  const office = OFFICES[c.officeId];
  if (!ex?.name || ex.you) return;
  if (office.termLimit && (ex.terms ?? 1) >= office.termLimit) {
    c.vsIncumbent = false;
    c.opponent.incumbent = false;
    if (c.opponent.background === 'the incumbent') c.opponent.background = 'a former state legislator';
    c.openSeat = `${ex.name} is term-limited`;
    return;
  }
  const mine = state.civic?.party?.bloc;
  if (mine && ex.caucus === mine) {
    c.rivals = [{ name: ex.name, quality: Math.min(95, c.opponent.quality + 12), platform: Object.fromEntries(ISSUE_IDS.map((id) => [id, Math.max(-2, Math.min(2, (mine === 'labor' ? -1 : 1) + rng.int(-1, 0) * (mine === 'labor' ? -1 : 1)))])), funds: Math.round(office.cost * 0.5), incumbent: true }, ...c.rivals.slice(0, 1)];
    c.stage = 'primary';
    c.challengingIncumbent = ex.name;
    return;
  }
  Object.assign(c.opponent, { name: ex.name, bloc: ex.caucus, incumbent: true, background: 'the incumbent', quality: Math.min(95, c.opponent.quality + (c.opponent.incumbent ? 0 : 12)) });
  c.vsIncumbent = true;
}

/** One use of each campaign action a year (fundraising twice). */
function once(ctx, key, max = 1, msg = 'Already done this year.') {
  if (yearlyCount(ctx.state, key) >= max) { ctx.toast(msg, 'warn'); return false; }
  bumpYearly(ctx.state, key);
  return true;
}

/** After the first real work each year, sometimes the trail answers back. */
function maybeEvent(ctx, c) {
  if (c.legacy || yearlyCount(ctx.state, 'politics.trailEvent')) return;
  bumpYearly(ctx.state, 'politics.trailEvent');
  if (ctx.rng.chance(0.4)) trailEvent(ctx, c);
}

export const CampaignTrail = {
  actions: {
    run(ctx, officeId) {
      const { state, rng } = ctx;
      const check = runEligibility(state, officeId);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      const office = OFFICES[officeId];
      const p = state.politics;
      const legacy = outsideCalendar(state, officeId);
      const year = legacy ? currentYear(state) + 1 : nextElectionYear(state, officeId);
      if (!legacy && year - currentYear(state) > FILING_WINDOW(officeId)) return ctx.toast(`The next election for ${office.name} is in ${year}. Filing opens in ${year - FILING_WINDOW(officeId)}.`, 'warn');
      if (!ctx.spend(Math.round(office.cost * 0.01), 'Filing fees', { credit: true })) return ctx.toast(`Filing fees: ${money(office.cost * 0.01)} — card declined.`, 'warn');
      platformOf(state);
      if (legacy) {
        p.campaign = { officeId, funds: 0, endorsements: [], startAge: state.character.age, electionAge: state.character.age + 1, vsIncumbent: Boolean(office.statewide) && rng.chance(0.6), legacy: true };
        ctx.log(`You declared your candidacy for ${office.name}. It's decided next year.`, office.icon, 'milestone');
        return ctx.toast(`Running for ${office.name}`, 'good');
      }
      const c = newCampaign(state, officeId, rng);
      seatHolder(state, c, rng);
      // Money you banked in office (or from donors you did favors for) goes into the race.
      c.funds += p.warChest ?? 0;
      p.warChest = 0;
      p.campaign = c;
      const opp = c.opponent;
      ctx.log(`You declared for ${office.name} — election in ${c.electionYear}. ${opp.incumbent ? `You're taking on the incumbent, ${opponentLabel(state, opp)}.` : `The other side's likely nominee: ${opponentLabel(state, opp)}, ${opp.background}.`}${c.rivals.length ? ` First, a primary against ${c.rivals.map((r) => r.name).join(' and ')}.` : ''}`, office.icon, 'milestone');
      ctx.toast(`Running for ${office.name}`, 'good');
      // What is this campaign about? (Raises that issue in the race.)
      const e = electorateOf(state, officeId);
      const best = [...ISSUE_IDS].sort((a, b) => e.salience[b] - e.salience[a]).slice(0, 4);
      ctx.prompt({
        type: 'politics.launch', icon: '🎤', title: 'Your Announcement',
        text: `You announce at a rally in your hometown. What is this campaign about?`,
        options: best.map((id) => ({ id, label: `${ISSUES[id].icon} ${ISSUES[id].name}`, hint: `You: "${ISSUES[id].stances[platformOf(state)[id] + 2]}"` })),
        data: { officeId },
      });
      takePoll(state, c, rng);
      return undefined;
    },

    fundraise(ctx) {
      const { state, rng } = ctx;
      const c = state.politics.campaign;
      if (!c || !once(ctx, 'politics.fundraise', 2, 'Your donor list is tapped out this year.')) return;
      const office = OFFICES[c.officeId];
      const network = (state.career.job?.grade ?? 0) * 0.04 + prestige(state) / 1000 + state.politics.recognition / 200;
      const raised = Math.round(office.cost * rng.float(0.12, 0.3) * (0.6 + network));
      c.funds += raised;
      ctx.stat('stress', 5);
      ctx.log(`You spent weeks dialing for dollars and raised ${money(raised)}.`, '📞');
      if (rng.chance(0.3)) {
        ctx.prompt({
          type: 'politics.donorFavor', icon: '💼', title: 'A Generous Donor',
          text: 'A developer offers to max out — and have dozens of employees "donate" too, reimbursed by the company. It would double your war chest.',
          options: [{ id: 'straw', label: '💸 Take the straw donations', hint: 'Campaign finance fraud', tone: 'danger' }, { id: 'legal', label: '✅ Accept only his legal personal maximum' }],
        });
      } else maybeEvent(ctx, c);
    },

    selfFund(ctx) {
      const { state } = ctx;
      const c = state.politics.campaign;
      if (!c) return;
      const amount = Math.max(0, Math.round(state.finances.cash * 0.25));
      if (amount < 1000) return ctx.toast('Not enough cash to self-fund.', 'warn');
      ctx.spend(amount, 'Campaign self-funding');
      c.funds += amount;
      ctx.log(`You loaned your campaign ${money(amount)} of your own money.`, '💵');
      return undefined;
    },

    endorse(ctx, id) {
      const { state, rng } = ctx;
      const c = state.politics.campaign;
      if (!c || c.endorsements.includes(id) || !ENDORSEMENTS[id]) return;
      if (!once(ctx, `politics.endorse.${id}`, 1, 'Already asked this year.')) return;
      if (!endorsementEligible(state, id) || !rng.chance(0.65)) {
        ctx.log(`${ENDORSEMENTS[id].name} endorsed your opponent.`, ENDORSEMENTS[id].icon, 'warn');
        return;
      }
      c.endorsements.push(id);
      ctx.log(`${ENDORSEMENTS[id].name} endorsed you!`, ENDORSEMENTS[id].icon, 'good');
    },

    canvass(ctx) {
      const { state } = ctx;
      const c = state.politics.campaign;
      if (!c || !once(ctx, 'politics.canvass', 1, 'Your feet need a rest.')) return;
      state.politics.recognition = Math.min(100, state.politics.recognition + 6);
      c.momentum = (c.momentum ?? 0) + 0.01;
      ctx.stat('fitness', 2);
      ctx.stat('stress', 4);
      ctx.log('You knocked on thousands of doors.', '🚪');
      maybeEvent(ctx, c);
    },

    /** Buy airtime: "positive" or "attack". Costs a tenth of a typical race. */
    ad(ctx, kind = 'positive') {
      const { state, rng } = ctx;
      const c = state.politics.campaign;
      if (!c || c.legacy) return;
      const office = OFFICES[c.officeId];
      const cost = Math.round(office.cost * 0.1);
      if (c.funds < cost) return ctx.toast(`An ad buy costs ${money(cost)} — your war chest has ${money(c.funds)}.`, 'warn');
      if (!once(ctx, 'politics.ad', 3, 'Three ad flights a year is all the airtime there is.')) return;
      c.funds -= cost;
      c.ads = (c.ads ?? 0) + 1;
      if (kind === 'attack') {
        if (rng.chance(0.2)) {
          c.momentum = (c.momentum ?? 0) - 0.02;
          return ctx.log(`Your attack ad on ${c.opponent.name} backfired: fact-checkers called it misleading.`, '📺', 'warn');
        }
        c.opponent.quality = Math.max(5, c.opponent.quality - rng.int(3, 6));
        c.momentum = (c.momentum ?? 0) + 0.01;
        ctx.log(`Your attack ad on ${c.opponent.name} (${money(cost)}) is running in heavy rotation.`, '📺');
      } else {
        c.momentum = (c.momentum ?? 0) + 0.015;
        state.politics.recognition = Math.min(100, state.politics.recognition + 3);
        ctx.log(`Your ad (${money(cost)}) introduced you to voters who'd never heard your name.`, '📺', 'good');
      }
      maybeEvent(ctx, c);
      return undefined;
    },

    /** Make the race about an issue: town halls on it. Good if you're closer to voters on it than your opponent. */
    townHall(ctx, issue) {
      const { state } = ctx;
      const c = state.politics.campaign;
      if (!c || c.legacy || !ISSUES[issue]) return;
      if (!once(ctx, 'politics.townHall', 1, 'One town-hall tour a year.')) return;
      c.focus[issue] = (c.focus[issue] ?? 0) + 1;
      const e = electorateOf(state, c.officeId);
      const mine = Math.abs(platformOf(state)[issue] - e.median[issue]);
      const theirs = Math.abs(c.opponent.platform[issue] - e.median[issue]);
      if (mine < theirs) ctx.log(`Your town halls on ${ISSUES[issue].name.toLowerCase()} packed the room. On this one, voters are with you.`, ISSUES[issue].icon, 'good');
      else if (mine > theirs) ctx.log(`Your town halls on ${ISSUES[issue].name.toLowerCase()} got heated: voters here are closer to ${c.opponent.name} on it.`, ISSUES[issue].icon, 'warn');
      else ctx.log(`Your town halls on ${ISSUES[issue].name.toLowerCase()} drew a crowd.`, ISSUES[issue].icon);
      ctx.stat('stress', 3);
      maybeEvent(ctx, c);
    },

    /** Opposition research: find what there is to find on the other candidate. */
    oppo(ctx) {
      const { state, rng } = ctx;
      const c = state.politics.campaign;
      if (!c || c.legacy) return;
      const cost = Math.round(OFFICES[c.officeId].cost * 0.05);
      if (c.funds < cost) return ctx.toast(`Opposition research costs ${money(cost)}.`, 'warn');
      if (!once(ctx, 'politics.oppo', 1, 'Your researchers are already digging.')) return;
      c.funds -= cost;
      c.oppoDone = true;
      if (c.opponent.weakness === 'nothing anyone has found' || rng.chance(0.25)) return ctx.log(`Your opposition researchers came up empty on ${c.opponent.name}.`, '🔎');
      ctx.prompt({
        type: 'politics.oppo', icon: '🔎', title: 'Opposition Research',
        text: `Your researchers found it: ${c.opponent.name} has ${c.opponent.weakness}. What do you do with it?`,
        options: [{ id: 'leak', label: '📰 Leak it to a reporter' }, { id: 'debate', label: '🎤 Save it for the debate' }, { id: 'bury', label: '🗄️ Leave it alone', hint: 'Some things are beneath you' }],
      });
      return undefined;
    },

    debate(ctx) {
      const { state } = ctx;
      const c = state.politics.campaign;
      if (!c || !once(ctx, 'politics.debate', 1, 'There\'s one debate a year.')) return;
      const name = c.opponent?.name ?? 'Your opponent';
      ctx.prompt({
        type: 'politics.debate', icon: '🎤', title: 'The Debate',
        text: `${name} opens by attacking your record. ${criminalRecord(state).length ? 'They bring up your criminal record.' : 'They call you out of your depth.'}`,
        options: [
          { id: 'policy', label: '📊 Pivot to detailed policy', hint: 'Smarts' },
          { id: 'contrast', label: '⚖️ Draw the contrast on the issues', hint: 'Wins where you\'re closer to voters' },
          { id: 'attack', label: '🗡️ Hit back hard', hint: c.heldOppo ? 'You have their file' : 'Risky' },
          { id: 'charm', label: '😊 Stay warm and personable', hint: 'Looks' },
        ],
      });
    },

    /** Change a stance: "issue|value" (-2 … +2). */
    stance(ctx, arg) {
      setStance(ctx, arg);
    },

    dropOut(ctx) {
      if (!ctx.state.politics.campaign) return;
      ctx.state.politics.campaign = null;
      ctx.log('You suspended your campaign.', '🏳️');
    },
  },

  resolvers: {
    launch(ctx, data, optionId) {
      const c = ctx.state.politics.campaign;
      if (!c || !ISSUES[optionId]) return;
      c.focus[optionId] = (c.focus[optionId] ?? 0) + 1;
      ctx.log(`"This campaign is about ${ISSUES[optionId].name.toLowerCase()}." The launch made the evening news.`, ISSUES[optionId].icon);
    },
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
      const c = state.politics.campaign;
      if (!c) return;
      let score;
      if (optionId === 'contrast' && c.opponent) {
        const e = electorateOf(state, c.officeId);
        const edge = distance(c.opponent.platform, e, c.focus) - distance(platformOf(state), e, c.focus);
        score = 55 + edge * 25 + rng.int(-15, 15);
      } else if (optionId === 'attack') score = (c.heldOppo ? 75 : 50) + rng.int(-30, 30);
      else score = (optionId === 'policy' ? state.stats.smarts : state.stats.looks) + rng.int(-20, 20);
      const won = score >= 55;
      state.politics.recognition = Math.min(100, state.politics.recognition + (won ? 8 : 2));
      if (won) {
        c.funds += Math.round(OFFICES[c.officeId].cost * 0.05);
        c.momentum = (c.momentum ?? 0) + 0.02;
        if (optionId === 'attack' && c.heldOppo && c.opponent) { c.opponent.scandal = (c.opponent.scandal ?? 0) + 1; c.heldOppo = false; }
      } else c.momentum = (c.momentum ?? 0) - 0.01;
      ctx.log(won ? 'Pundits scored the debate for you. Donations spiked.' : 'The debate was a wash — or worse.', '🎤', won ? 'good' : 'warn');
    },
    oppo(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const c = state.politics.campaign;
      if (!c?.opponent) return;
      if (optionId === 'leak') {
        c.opponent.scandal = (c.opponent.scandal ?? 0) + 1;
        if (rng.chance(0.2)) { c.momentum = (c.momentum ?? 0) - 0.01; ctx.log(`The story about ${c.opponent.name} ran — and so did one about who leaked it.`, '📰', 'warn'); } else ctx.log(`The story about ${c.opponent.name} is everywhere.`, '📰', 'good');
      } else if (optionId === 'debate') {
        c.heldOppo = true;
        ctx.log('You put the file in your debate prep binder.', '🗂️');
      } else {
        state.politics.credibility = Math.min(100, (state.politics.credibility ?? 70) + 2);
        ctx.log('You decided not to use it.', '🗄️');
      }
    },
    trail(ctx, data, optionId) {
      const { state, rng } = ctx;
      const c = state.politics.campaign;
      if (!c) return;
      const office = OFFICES[c.officeId];
      const bump = (x) => { c.momentum = (c.momentum ?? 0) + x; };
      switch (data.event) {
        case 'gaffe':
          if (optionId === 'apologize') { bump(-0.005); ctx.log('Your apology was accepted, mostly.', '🙏'); }
          else if (optionId === 'double') { if (rng.chance(0.4)) { bump(0.01); ctx.log('Your base loved it.', '😤', 'warn'); } else { bump(-0.03); ctx.log('Doubling down made it a week-long story.', '😤', 'bad'); } }
          else { bump(-0.015); ctx.log('Silence let it fester.', '🤐', 'warn'); }
          break;
        case 'attackAd':
          if (optionId === 'respond') {
            const cost = Math.round(office.cost * 0.08);
            if (c.funds >= cost) { c.funds -= cost; bump(0.005); ctx.log(`Your response ad (${money(cost)}) blunted the attack.`, '📺', 'good'); } else { bump(-0.02); ctx.log('You couldn\'t afford to answer it. It stuck.', '📺', 'warn'); }
          } else if (optionId === 'counter') { c.opponent.quality = Math.max(5, c.opponent.quality - 3); bump(-0.005); ctx.log('You hit back. It turned into a mud fight.', '🗡️'); }
          else { bump(-0.02); ctx.log('The attack ad went unanswered.', '🙄', 'warn'); }
          break;
        case 'questionnaire':
          if (optionId === 'sign') {
            const pf = platformOf(state);
            const prior = pf[data.issue];
            if (Math.sign(prior) !== Math.sign(data.side) && prior !== 0) { state.politics.credibility = Math.max(0, (state.politics.credibility ?? 70) - 8); ctx.log(`Signing contradicted what you've said on ${ISSUES[data.issue].name.toLowerCase()}. It's being called a flip-flop.`, '🔄', 'warn'); }
            pf[data.issue] = data.side;
            c.funds += Math.round(office.cost * 0.06);
            bump(0.01);
            ctx.log(`You signed the pledge: "${ISSUES[data.issue].stances[data.side + 2]}." Their volunteers are knocking doors for you.`, '✍️', 'good');
          } else ctx.log('You declined to sign anyone\'s pledge.', '🙅');
          break;
        case 'skeleton':
          if (optionId === 'own') { bump(rng.chance(0.55) ? -0.005 : -0.02); state.politics.credibility = Math.min(100, (state.politics.credibility ?? 70) + 4); ctx.log('You told the whole story yourself. Some voters respected it.', '🙋', 'info'); }
          else if (optionId === 'deny') { if (rng.chance(0.35)) { bump(0.005); ctx.log('The story faded under your counter-attack.', '🙅', 'warn'); } else { bump(-0.05); state.politics.credibility = Math.max(0, (state.politics.credibility ?? 70) - 15); ctx.log('The documents came out the next day. The denial became the story.', '🙅', 'bad'); } }
          else { bump(-0.025); ctx.log('"No comment" ran for a week.', '🤐', 'warn'); }
          break;
        case 'volunteers':
          if (optionId === 'data') { const cost = Math.round(office.cost * 0.05); if (c.funds >= cost) { c.funds -= cost; bump(0.02); ctx.log('Organisers, lists and an app: the volunteers knocked 40,000 doors.', '📊', 'good'); } else { bump(0.005); ctx.log('No money for organisers; half the volunteers drifted away.', '📊', 'warn'); } }
          else { bump(0.01); ctx.log('A packed rally, wall-to-wall coverage, and a sore throat.', '📣', 'good'); }
          break;
        case 'manager':
          if (optionId === 'hire') { const cost = Math.round(office.cost * 0.1); if (c.funds >= cost) { c.funds -= cost; c.manager = true; bump(0.015); ctx.log('Your new campaign manager rebuilt the operation in a month.', '💼', 'good'); } else ctx.log('You couldn\'t afford them. They went to work for the other side.', '💼', 'warn'); }
          else { bump(rng.chance(0.5) ? 0.005 : -0.01); ctx.log('You stuck with your friend.', '🤝'); }
          break;
        case 'news':
          if (optionId === 'lead') c.focus[data.issue] = (c.focus[data.issue] ?? 0) + 1;
          ctx.log(optionId === 'lead' ? `You made ${ISSUES[data.issue].name.toLowerCase()} your issue this month.` : 'You kept to your own message.', '🗞️');
          break;
        default: break;
      }
    },
    general(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const c = state.politics.campaign;
      if (!c || c.stage !== 'general' || c.legacy) return;
      const e = electorateOf(state, c.officeId);
      const mine = state.civic?.party?.bloc;
      if (optionId === 'center') {
        c.pivot = true;
        state.politics.credibility = Math.max(0, (state.politics.credibility ?? 70) - 3);
        ctx.log('You spent the fall talking about bipartisanship and common ground.', '🧭');
      } else if (optionId === 'base') {
        const yours = mine === 'business' ? e.lean : mine === 'labor' ? -e.lean : -0.05;
        c.momentum = (c.momentum ?? 0) + (yours > 0 ? 0.02 : -0.01);
        ctx.log('You ran to your base: big rallies, red meat.', '📣');
      } else if (optionId === 'attack') {
        if (rng.chance(0.65)) { c.opponent.quality = Math.max(5, c.opponent.quality - 6); ctx.log(`Your closing ads tore into ${c.opponent.name}.`, '🗡️'); } else { c.momentum = (c.momentum ?? 0) - 0.02; ctx.log('Your negative closing turned voters off.', '🗡️', 'warn'); }
      } else {
        c.momentum = (c.momentum ?? 0) + 0.01;
        ctx.log('You closed on hope and a plan.', '🌅');
      }
      runGeneral(ctx, c);
    },
  },
};
