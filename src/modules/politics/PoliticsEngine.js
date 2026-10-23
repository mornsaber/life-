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
import { SEAT_OFFICES, executiveOf } from './Legislature.js';
import { voteShare, appointmentEligibility } from './Campaigns.js';
import { CampaignTrail, campaignYear } from './CampaignTrail.js';
import { newCampaign, outsideCalendar, electorateOf, distance } from './Elections.js';
import { platformOf, platformView, platformYear, recordStance, ISSUES, partyLine } from './Platform.js';
import { currentYear } from '../../core/State.js';
import { runsGovernment, executiveYear, headYear, offersYear, ticketYear, CABINET } from './Executive.js';
import { COUNTRIES } from '../world/Countries.js';

function takeOffice(ctx, officeId, { appointed = false } = {}) {
  const { state } = ctx;
  const office = OFFICES[officeId];
  const p = state.politics;
  // A prime minister (or premier) leads from their seat in the house and keeps it.
  const seatOffice = office.leader && office.requires?.includes(p.office?.id) ? p.office.id : null;
  if (p.office) leaveOffice(ctx, `Sworn in as ${office.name}`, { keepSeat: Boolean(seatOffice) });
  if (office.fullTime && state.career.job) ctx.emit('career:resign', { reason: `Took office as ${office.name}` });
  p.office = { id: officeId, termYearsLeft: office.term, terms: 1, approval: appointed ? 55 : 60, startAge: state.character.age, fullTime: office.fullTime, ...(seatOffice ? { seatOffice } : {}) };
  p.recognition = Math.min(100, p.recognition + office.level * 6);
  const country = COUNTRIES[state.character.countryId ?? 'US']?.name ?? 'the United States';
  const where = office.national || office.headOfState || office.cabinet ? country : office.provincial || office.level >= 5 || officeId === 'stateRep' || officeId === 'stateSenator' ? stateOf(state).name : regionOf(state).name.split(',')[0];
  ctx.log(`${appointed ? 'Appointed' : 'Sworn in'} as ${office.name} (${where}). ${office.fullTime ? '' : 'It\'s a part-time citizen office — keep your day job.'}`, office.icon, 'milestone');
  ctx.toast(`${office.icon} ${office.name}`, 'honor');
  ctx.stat('happiness', 10);
  ctx.emit('politics:officeChanged', { officeId });
}

/** Reasons that end a political career outright (a prime minister otherwise falls back to the backbenches). */
const OUT_OF_POLITICS = /felony|incarcerat|jurisdiction|Retired/i;

function leaveOffice(ctx, reason, { keepSeat = false } = {}) {
  const { state } = ctx;
  const p = state.politics;
  if (!p.office) return;
  const was = p.office;
  p.history.push({ officeId: was.id, startAge: was.startAge, endAge: state.character.age, terms: was.terms, reason, ...(was.viaParty ? { viaParty: true } : {}) });
  ctx.log(`You left office as ${OFFICES[was.id].name}: ${reason}.`, '🏛️');
  p.office = null;
  ctx.emit('politics:left', { officeId: was.id, reason, years: state.character.age - (was.startAge ?? state.character.age) });
  // Out of the top job but still a member of the house you led from.
  if (was.seatOffice && OFFICES[was.seatOffice] && !OUT_OF_POLITICS.test(reason)) {
    const seat = OFFICES[was.seatOffice];
    p.office = { id: was.seatOffice, termYearsLeft: Math.max(1, was.termYearsLeft ?? seat.term), terms: 1, approval: Math.max(40, was.approval ?? 50), startAge: state.character.age, fullTime: seat.fullTime };
    ctx.log(`You return to the backbenches as ${seat.name}.`, '🪑');
  }
  if (!keepSeat) ctx.emit('politics:officeChanged', { officeId: p.office?.id ?? null });
}

/**
 * The decisions of an office, each on a real issue. An option's `side` is where it puts you:
 * -1 the left's side, +1 the right's, 'district' however your voters lean, 'platform' your own
 * stance, 'party' your party's line. Siding with your voters is popular; going against your own
 * platform costs credibility; donors fill your war chest.
 */
const DECISIONS = {
  legislative: {
    title: 'Floor Vote',
    text: 'A contentious bill is up for a vote: {issue}.',
    issues: [
      { text: 'a minimum-wage increase', issue: 'labor', yes: -1 }, { text: 'police reform', issue: 'crime', yes: -1 }, { text: 'a gas tax for road repair', issue: 'taxes', yes: -1 },
      { text: 'school vouchers', issue: 'services', yes: 1 }, { text: 'a public-sector pay raise', issue: 'services', yes: -1 }, { text: 'a permitless-carry bill', issue: 'guns', yes: 1 },
      { text: 'a clean-energy mandate', issue: 'environment', yes: -1 }, { text: 'Medicaid expansion', issue: 'healthcare', yes: -1 }, { text: 'a sanctuary-policy ban', issue: 'immigration', yes: 1 },
    ],
    options: [
      { id: 'district', label: '📊 Vote the way your district leans', side: 'district' },
      { id: 'platform', label: '🧭 Vote your platform', side: 'platform', recognition: 2 },
      { id: 'party', label: '🏛️ Vote the party line', side: 'party', partyLoyal: true },
      { id: 'donors', label: '💼 Vote with your donors', side: 1, warChest: 0.12 },
    ],
  },
  executive: {
    title: 'Executive Decision',
    text: 'Your administration must decide on {issue}.',
    issues: [
      { text: 'a budget shortfall: raise fees or cut programs', issue: 'taxes', yes: -1 }, { text: 'a prison overcrowding crisis: build or release', issue: 'crime', yes: 1 },
      { text: 'a teachers\' strike', issue: 'labor', yes: -1 }, { text: 'a corporate relocation incentive package', issue: 'taxes', yes: 1 }, { text: 'emergency housing for the homeless', issue: 'services', yes: -1 },
    ],
    options: [
      { id: 'district', label: '📊 Do what the voters want', side: 'district' },
      { id: 'platform', label: '🧭 Do what you ran on', side: 'platform', recognition: 2 },
      { id: 'compromise', label: '🤝 Broker a compromise', side: 0, approval: 2 },
      { id: 'bold', label: '⚡ Bold action', side: 'platform', gamble: 12 },
    ],
  },
  prosecutor: {
    title: 'Charging Decision',
    text: 'As District Attorney you have to decide on {issue}.',
    issues: [
      { text: 'charging a police officer who shot an unarmed man', issue: 'crime', yes: -1 }, { text: 'seeking the death penalty in a triple homicide', issue: 'crime', yes: 1 },
      { text: 'ending cash bail for misdemeanors', issue: 'crime', yes: -1 }, { text: 'a plea deal for a well-connected developer', issue: 'crime', yes: -1 }, { text: 'reopening a 20-year-old conviction with new DNA evidence', issue: 'crime', yes: -1 },
    ],
    options: [
      { id: 'law', label: '📖 Follow the evidence wherever it leads', side: 0, approval: 1, recognition: 4 },
      { id: 'tough', label: '🔨 Take the tough-on-crime line', side: 1 },
      { id: 'reform', label: '⚖️ Take the reform line', side: -1 },
      { id: 'donors', label: '💼 Do what your donors want', side: 0, approval: -4, warChest: 0.12 },
    ],
  },
  sheriff: {
    title: 'Sheriff\'s Decision',
    text: 'Your office has to decide on {issue}.',
    issues: [
      { text: 'honoring federal immigration detainers at the jail', issue: 'immigration', yes: 1 }, { text: 'jail overcrowding and early releases', issue: 'crime', yes: -1 },
      { text: 'a deputy caught on video beating a handcuffed man', issue: 'crime', yes: -1 }, { text: 'buying an armored vehicle with a federal grant', issue: 'crime', yes: 1 }, { text: 'enforcing a state gun law you disagree with', issue: 'guns', yes: -1 },
    ],
    options: [
      { id: 'district', label: '📊 Go with the county\'s mood', side: 'district' },
      { id: 'platform', label: '🧭 Do what you think is right', side: 'platform', recognition: 4 },
      { id: 'bold', label: '⚡ Make a bold public stand', side: 'platform', gamble: 14 },
    ],
  },
  judicial: {
    title: 'High-Profile Ruling',
    text: 'A case on {issue} has the whole state watching.',
    issues: [{ text: 'police use of force', issue: 'crime', yes: 0 }, { text: 'a corporate fraud', issue: 'labor', yes: 0 }, { text: 'a death-penalty appeal', issue: 'crime', yes: 0 }, { text: 'a contested election result', issue: 'services', yes: 0 }],
    options: [
      { id: 'law', label: '📖 Rule strictly on the law', side: 0, approval: 2, recognition: 3 },
      { id: 'popular', label: '📣 Rule with public opinion', side: 'district', approval: 2 },
    ],
  },
};

function officeDecision(ctx) {
  const { state, rng } = ctx;
  const office = OFFICES[state.politics.office.id];
  const kind = office.kind ?? (office.judicial ? 'judicial' : office.executive || state.politics.office.id === 'mayor' ? 'executive' : 'legislative');
  const d = DECISIONS[kind] ?? DECISIONS.legislative;
  const item = rng.pick(d.issues);
  const e = electorateOf(state, state.politics.office.id);
  const lean = e.median[item.issue];
  const mine = platformOf(state)[item.issue];
  ctx.prompt({
    type: 'politics.decision',
    icon: office.icon,
    title: d.title,
    text: `${office.name} · Approval ${state.politics.office.approval}%\n${d.text.replace('{issue}', item.text)}\n${ISSUES[item.issue].icon} Your voters: "${ISSUES[item.issue].stances[Math.round(lean) + 2]}" · You: "${ISSUES[item.issue].stances[mine + 2]}"`,
    options: d.options.map((o) => ({ id: o.id, label: o.label })),
    data: { kind, issue: item.issue, yes: item.yes },
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
    // Offices that come by offer: a cabinet post, the vice presidency, succession, a Governor-General.
    bus.on('politics:take', ({ ctx, officeId, appointed, dept }) => {
      takeOffice(ctx, officeId, { appointed });
      const o = ctx.state.politics.office;
      if (o && dept && CABINET[dept]) { o.dept = dept; o.title = CABINET[dept].title; }
    });
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
    platformYear(state);
    // On the trail, or election night (CampaignTrail).
    if (p.campaign) campaignYear(ctx);

    const o = p.office;
    if (o) {
      const office = OFFICES[o.id];
      ctx.earn(o.salary ?? office.salary, `${office.name} salary`, { wage: true });
      ctx.emit('retirement:accrue', { planId: office.pension, salary: office.salary, employer: office.name });
      p.recognition = Math.min(100, p.recognition + 3);
      ctx.stat('stress', office.fullTime ? 6 : 3);
      o.termYearsLeft -= 1;
      // Executives govern (approval from the economy, the budget and their choices; a real crisis);
      // ceremonial heads of state have their duties; legislators vote on real bills (Legislature);
      // everyone else faces a decision of their office.
      if (runsGovernment(o.id)) executiveYear(ctx);
      else if (office.kind === 'head') headYear(ctx);
      else {
        // Approval drifts toward how well you fit your voters: a centrist in a swing seat sits higher.
        const fit = distance(platformView(state), electorateOf(state, o.id));
        o.approval = Math.round(clamp(o.approval + (64 - fit * 9 - o.approval) * 0.1 + rng.int(-6, 5), 0, 100));
        if (rng.chance(0.6)) { if (!SEAT_OFFICES[o.id] && office.kind !== 'head') officeDecision(ctx); }
      }
      if (rng.chance(0.15)) bribeOffer(ctx);
      if (office.executive && office.kind !== 'executive' && rng.chance(0.5)) {
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
      // Elected on the calendar, you decide a year before your term ends, so there's a year to campaign;
      // a re-election race under way keeps you in office until the count.
      const served = p.history.filter((h) => h.officeId === o.id).reduce((s, h) => s + h.terms, 0) + o.terms;
      const limited = office.termLimit && served >= office.termLimit;
      const onCalendar = !office.appointedBy && !outsideCalendar(state, o.id);
      // Appointed and indirectly chosen offices have no electorate to poll.
      const projected = voteShare(state, o.id, { funds: office.cost * 0.6, endorsements: [] }, { incumbent: true });
      const reelectionPrompt = () => ctx.prompt({
        type: 'politics.reelection',
        icon: '🗳️',
        title: onCalendar ? 'Your Term Ends Next Year' : 'Your Term Is Up',
        text: `Approval ${o.approval}%. ${office.termLimit ? `Term ${served} of ${office.termLimit}.` : ''} Run again?`,
        options: [
          { id: 'run', label: '🗳️ Run for re-election', hint: Number.isFinite(projected) ? `≈${Math.round(projected * 100)}% projected` : `${office.chosenBy ? `Up to ${office.chosenBy}` : 'Up to those who chose you'}` },
          { id: 'retire', label: onCalendar ? '👋 Don\'t seek re-election' : '👋 Retire from office' },
        ],
      });
      // Cabinet members serve at the President's pleasure: a new president brings a new cabinet.
      const nat = office.cabinet ? executiveOf(state, 'national') : null;
      if (nat && !nat.you) o.under ??= nat.name;
      if (office.cabinet && nat && !nat.you && o.under !== nat.name) {
        leaveOffice(ctx, `President ${nat.name} took office with a cabinet of their own`);
      } else if (o.viaParty) {
        // A post the Party gave you: no campaign, no re-election — you hold it until the Party moves you (CommunistParty.js).
        if (o.termYearsLeft <= 0) { o.terms += 1; o.termYearsLeft = office.term; }
      } else if (p.campaign?.officeId === o.id) { /* the campaign decides */ }
      else if (onCalendar && o.termYearsLeft === 1 && !limited && !o.retiring && !o.asked) {
        o.asked = true;
        reelectionPrompt();
      } else if (o.termYearsLeft <= 0) {
        if (limited) leaveOffice(ctx, 'Term-limited');
        else if (office.selection === 'appointed') {
          // Appointed for a fixed term (a Governor-General, a lord-lieutenant, a party state's president):
          // usually one term; those who serve "until 75" go on to that age; a party state's
          // president stays as long as they lead the Party.
          const age = state.character.age;
          const partyHead = ['cn_president', 'kp_president', 'vn_president'].includes(o.id);
          const again = partyHead ? state.cpc?.status === 'member' && state.cpc.rank >= 9 && !state.cpc.retiredFrom
            : office.serveTo ? age < office.serveTo : o.terms < 2 && o.approval >= 55 && rng.chance(0.15);
          if (again) {
            o.terms += 1;
            o.termYearsLeft = office.serveTo ? Math.min(office.term, office.serveTo - age) : partyHead ? office.term : Math.min(office.term, 2);
            ctx.log(`${office.chosenBy ? `${office.chosenBy[0].toUpperCase()}${office.chosenBy.slice(1)}` : 'The government'} ${partyHead ? 're-elected' : 'extended'} your appointment as ${office.name}.`, '✍️', 'good');
          } else leaveOffice(ctx, office.serveTo && age >= office.serveTo ? `Retired at ${office.serveTo}` : 'Your term of appointment ended');
        } else if (office.cabinet) {
          // A president's two terms are the most a cabinet secretary can serve them.
          if (o.terms < 2 && o.approval >= 45 && rng.chance(0.6)) {
            o.terms += 1;
            o.termYearsLeft = office.term;
            ctx.log(`The President won a second term and kept you on as ${office.name}.`, '✍️', 'good');
          } else leaveOffice(ctx, o.terms >= 2 ? 'The administration ended' : 'Left the cabinet at the end of the President\'s term');
        } else if (office.appointedBy) {
          // Appointed on contract (a city manager): the council renews if things are going well, less readily each time.
          if (o.approval >= 45 && rng.chance(clamp(0.9 - (o.terms - 1) * 0.15, 0.25, 0.9))) {
            o.terms += 1;
            o.termYearsLeft = office.term;
            ctx.log(`${office.appointedBy[0].toUpperCase()}${office.appointedBy.slice(1)} renewed your contract as ${office.name}.`, '✍️', 'good');
          } else leaveOffice(ctx, `${office.appointedBy[0].toUpperCase()}${office.appointedBy.slice(1)} declined to renew your contract`);
        } else if (onCalendar) leaveOffice(ctx, o.retiring ? 'Retired from office' : 'Did not seek re-election');
        else reelectionPrompt();
      }
    }

    // The national ticket, cabinet calls, succession and vice-regal appointments.
    ticketYear(ctx);
    offersYear(ctx);

    // Being appointed: judgeships for seasoned lawyers, agency heads for top performers.
    if (!o && !p.campaign) {
      const job = state.career.job;
      const status = job ? promotionStatus(state) : null;
      const us = (state.character.countryId ?? 'US') === 'US';
      if (status?.appointable && job.performance >= 75 && rng.chance(0.15)) {
        const level = status.appointable[0];
        ctx.prompt({
          type: 'politics.appointmentOffer',
          icon: '⭐',
          title: us ? 'A Call from the Governor' : 'A Government Appointment',
          text: `${us ? 'The governor wants' : `${level.appointedBy ? `${level.appointedBy.charAt(0).toUpperCase()}${level.appointedBy.slice(1)} wants` : 'The government wants'}`} to appoint you ${level.title}.`,
          options: [{ id: 'accept', label: '🤝 Accept the appointment' }, { id: 'decline', label: '🙅 Decline' }],
          data: { kind: 'agency', levelId: level.id },
        });
      // US state trial courts only: abroad, the country's own courts make their appointments (legal/Judiciary).
      } else if (us && hasCredential(state, 'barLicense') && yearsInProfession(state, ['law', 'prosecution', 'publicDefender', 'courts']) >= 7 && state.character.age >= 35 && rng.chance(0.04 + p.recognition / 1000)) {
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
    ...CampaignTrail.actions,
    /** Apply for an appointed office (city manager). */
    applyAppointed(ctx, officeId) {
      const { state, rng } = ctx;
      const check = appointmentEligibility(state, officeId);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      if (state.yearly[`politics.apply.${officeId}`]) return ctx.toast('You already interviewed this year.', 'warn');
      state.yearly[`politics.apply.${officeId}`] = 1;
      const office = OFFICES[officeId];
      const odds = 0.25 + (state.career.job?.performance ?? 50) / 300 + yearsInProfession(state, ['municipalAdmin']) * 0.015;
      if (!rng.chance(Math.min(0.75, odds))) return ctx.log(`${office.appointedBy[0].toUpperCase()}${office.appointedBy.slice(1)} hired another candidate as ${office.name}.`, '📭', 'warn');
      takeOffice(ctx, officeId, { appointed: true });
      return undefined;
    },
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
    ...CampaignTrail.resolvers,
    decision(ctx, data, optionId) {
      const { state, rng } = ctx;
      const o = state.politics.office;
      if (!o) return;
      const d = DECISIONS[data.kind] ?? DECISIONS.legislative;
      const opt = d.options.find((x) => x.id === optionId);
      if (!opt) return;
      const issue = data.issue;
      const e = issue ? electorateOf(state, o.id) : null;
      const lean = e ? e.median[issue] : 0;
      const stance = issue ? platformOf(state)[issue] : 0;
      // Which side this puts you on.
      const side = opt.side === 'district' ? Math.sign(Math.round(lean)) : opt.side === 'platform' ? Math.sign(stance) : opt.side === 'party' ? partyLine(state.civic?.party?.bloc) : opt.side ?? 0;
      let delta = opt.approval ?? 0;
      // Your voters: with them is popular, against them costs — more where they feel strongly.
      if (issue && side) delta += Math.round(side * Math.sign(lean) * (1 + Math.abs(lean) * 2.5));
      if (opt.gamble) delta += rng.chance(0.5) ? opt.gamble : -opt.gamble;
      o.approval = Math.round(clamp(o.approval + delta, 0, 100));
      // On the record: going against your own platform costs credibility.
      if (issue && side) recordStance(state, issue, side);
      if (opt.recognition) state.politics.recognition = Math.min(100, state.politics.recognition + opt.recognition);
      if (opt.warChest) state.politics.warChest = (state.politics.warChest ?? 0) + Math.round(OFFICES[o.id].cost * opt.warChest);
      if (side < 0 && issue === 'labor') state.politics.laborVotes = (state.politics.laborVotes ?? 0) + 1;
      ctx.log(`${d.title}: ${opt.label.slice(2).trim()} (approval ${o.approval}%${delta ? `, ${delta > 0 ? '+' : ''}${delta}` : ''}).`, '🏛️');
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
      if (optionId === 'retire') {
        if (outsideCalendar(state, o.id) || o.termYearsLeft <= 0) return leaveOffice(ctx, 'Retired from office');
        o.retiring = true;
        return ctx.log(`You announced you won't seek another term as ${office.name}. You serve out this year.`, '👋');
      }
      // Party leaders and appointed-by-parliament offices: the old one-step vote.
      if (outsideCalendar(state, o.id)) {
        const share = clamp(voteShare(state, o.id, { funds: office.cost * 0.6, endorsements: [] }, { incumbent: true }) + rng.float(-0.07, 0.07), 0.05, 0.85);
        if (share > 0.5) {
          o.terms += 1;
          o.termYearsLeft = office.term;
          ctx.log(`Re-elected as ${office.name} with ${Math.round(share * 1000) / 10}%!`, '🎉', 'good');
        } else {
          ctx.log(`You lost your re-election bid (${Math.round(share * 1000) / 10}%).`, '📉', 'bad');
          leaveOffice(ctx, 'Lost re-election');
        }
        return undefined;
      }
      // A real race: a primary challenge if your base is restless, then the other party's nominee.
      const c = newCampaign(state, o.id, rng, { incumbent: true, electionYear: currentYear(state) + Math.max(0, o.termYearsLeft) });
      c.funds += Math.round(office.cost * 0.4) + (state.politics.warChest ?? 0);
      state.politics.warChest = 0;
      state.politics.campaign = c;
      ctx.log(`You're running for re-election as ${office.name}. ${c.rivals.length ? `${c.rivals[0].name} is challenging you in the primary. ` : ''}The other side is running ${c.opponent.name}, ${c.opponent.background}.`, '🗳️');
      return undefined;
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
