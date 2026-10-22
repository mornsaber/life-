/**
 * Elections: who votes, when, and against whom.
 *
 *   Electorate   Every office answers to an electorate with a partisan lean (rural
 *                counties lean right, big-city wards left, states and countries in
 *                between) and its own view on each issue — a sheriff's voters care
 *                about crime, a school board's about services. The closer your
 *                platform sits to them, the better you do.
 *   Calendar     Elections fall in their cycle years: the House and the statehouse
 *                every even year, governors in the midterms, presidents every four,
 *                city races in odd years, a Senate seat every six. You file at most
 *                two years out; the campaign runs until the election.
 *   Opponents    Named candidates with a party, a platform, a war chest and a quality
 *                rating; an incumbent is hard to beat. Partisan races have a primary
 *                first: your party's base wants someone on its side of every issue —
 *                then the general electorate wants someone near the middle.
 *   The count    Party and district lean, the national mood (a president's party
 *                loses ground in the midterms and in a recession), the fit of the
 *                platforms, money, endorsements, the candidates' quality and scandals.
 *
 * A campaign: state.politics.campaign = { officeId, electionYear, electionAge, stage,
 *   partisan, primary, funds, endorsements[], opponent, rivals[], focus{}, polls[],
 *   incumbent, attacks, ads, momentum }
 */
import { clamp, Random } from '../../core/Random.js';
import { currentYear, prestige, randomName } from '../../core/State.js';
import { REGIONS, stateIdOf } from '../life/Regions.js';
import { STATES } from '../life/States.js';
import { OFFICES } from './Offices.js';
import { ISSUES, ISSUE_IDS, partyLine, platformView, credibility, ideology } from './Platform.js';
import { partyBonus, partyName } from './Parties.js';
import { influenceVoteBonus } from '../civic/Activism.js';

/* ------------------------------------------------------------------ */
/* Who votes                                                           */
/* ------------------------------------------------------------------ */

/** Partisan lean by kind of place (+ right, - left). */
const TYPE_LEAN = { Rural: 0.2, 'Small town': 0.13, 'Small city': 0.05, Suburb: 0.02, 'Mid-size city': -0.01, 'Sun Belt metro': 0.01, 'Mountain metro': -0.03, 'Capital region': -0.12, 'Coastal metro': -0.12, 'Major metro': -0.14, 'High-cost metro': -0.16 };
/** Statewide lean (Cook-style, as a share). */
const STATE_LEAN = { MT: 0.11, IA: 0.06, OH: 0.06, TX: 0.05, IL: -0.07, DC: -0.4, NY: -0.1, CA: -0.13, FL: 0.04, WA: -0.08, CO: -0.04, GA: 0.01, NC: 0.02, AZ: 0.02, MA: -0.15, PA: 0.01, MI: 0, MN: -0.01, OR: -0.06, TN: 0.14, VA: -0.02, NV: 0, WI: 0.01, UT: 0.11, NM: -0.03, LA: 0.12, MO: 0.1, IN: 0.11, KY: 0.16, AL: 0.15, SC: 0.08, OK: 0.17, KS: 0.1, NE: 0.1, ID: 0.18, WY: 0.25, ND: 0.2, SD: 0.16, WV: 0.22, AR: 0.16, MS: 0.11, NJ: -0.06, MD: -0.15, CT: -0.07, HI: -0.14, VT: -0.16, NH: 0, ME: -0.02, RI: -0.08, DE: -0.07, AK: 0.08 };
/** How each kind of place leans on particular issues, beyond its overall lean. */
const TYPE_ISSUES = {
  Rural: { guns: 0.8, environment: 0.4, immigration: 0.3, crime: 0.2 },
  'Small town': { guns: 0.6, environment: 0.3, immigration: 0.2 },
  'Major metro': { guns: -0.6, environment: -0.4, immigration: -0.4, crime: 0.2 },
  'High-cost metro': { guns: -0.6, environment: -0.5, immigration: -0.4, services: -0.2 },
  'Coastal metro': { guns: -0.5, environment: -0.6, immigration: -0.3 },
  'Sun Belt metro': { taxes: 0.3, environment: 0.2 },
};
/** What voters weigh, by office: a sheriff's voters care about crime; a school board's about schools. */
const OFFICE_SALIENCE = {
  sheriff: { crime: 4, guns: 1.5, immigration: 1.5 },
  districtAttorney: { crime: 4 },
  schoolBoard: { services: 4, taxes: 2, guns: 0.2, immigration: 0.2 },
  judge: { crime: 2 },
  cityCouncil: { services: 2, crime: 1.5, guns: 0.3, immigration: 0.3, healthcare: 0.4 },
  mayor: { services: 2, crime: 2, guns: 0.3, immigration: 0.4, healthcare: 0.4 },
  countyCommissioner: { services: 2, taxes: 1.5, guns: 0.4, immigration: 0.4 },
};
const BASE_SALIENCE = { taxes: 1.3, services: 1, crime: 1, guns: 0.7, immigration: 0.8, healthcare: 1.1, environment: 0.7, labor: 0.9 };

const hash = (s) => [...String(s)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
const here = (state) => state.character.countryId ?? 'US';
const scope = (office) => (office.national || office.headOfState || (office.country && office.statewide && office.level >= 5) ? 'national' : office.statewide || office.level >= 5 ? 'state' : office.level >= 3 || ['stateRep', 'usRep'].includes(office.id) ? 'district' : 'local');

export function electorateOf(state, officeId) {
  const office = { ...OFFICES[officeId], id: officeId };
  const region = REGIONS[state.character.regionId] ?? REGIONS.midcity;
  const st = stateIdOf(state);
  const foreign = here(state) !== 'US';
  // A foreign state or province: a small deterministic lean around the national middle.
  const stLean = foreign ? ((hash(st) % 11) - 5) / 100 : STATE_LEAN[st] ?? (STATES[st]?.rightToWork ? 0.06 : -0.05);
  const local = (TYPE_LEAN[region.type] ?? 0) + stLean * 0.3;
  const sc = scope(office);
  const lean = sc === 'national' ? 0 : sc === 'state' ? stLean : sc === 'district' ? local * 0.6 + stLean * 0.4 : local;
  const tweak = sc === 'national' ? {} : TYPE_ISSUES[region.type] ?? {};
  const median = Object.fromEntries(ISSUE_IDS.map((id) => [id, clamp(lean * 5 + (tweak[id] ?? 0) * (sc === 'state' ? 0.4 : 1), -2, 2)]));
  const sal = OFFICE_SALIENCE[officeId] ?? {};
  const recession = state.economy?.phase === 'recession';
  const salience = Object.fromEntries(ISSUE_IDS.map((id) => [id, (sal[id] ?? BASE_SALIENCE[id]) * (recession && (id === 'taxes' || id === 'labor') ? 1.4 : 1)]));
  return { lean, median, salience, scope: sc, label: leanLabel(lean) };
}
export const leanLabel = (lean) => (lean >= 0.15 ? 'Safe right' : lean >= 0.06 ? 'Leans right' : lean > -0.06 ? 'Swing' : lean > -0.15 ? 'Leans left' : 'Safe left');

/** Distance (0–4) between a platform and the voters, weighted by what they care about (and what the race is about). */
export function distance(platform, electorate, focus = {}) {
  let num = 0;
  let den = 0;
  for (const id of ISSUE_IDS) {
    const w = electorate.salience[id] * (1 + (focus[id] ?? 0) * 0.5);
    num += w * Math.abs((platform[id] ?? 0) - electorate.median[id]);
    den += w;
  }
  return den ? num / den : 0;
}

/** Where a party's primary voters stand: on their side of every issue. */
const baseOf = (bloc) => ({ median: Object.fromEntries(ISSUE_IDS.map((id) => [id, partyLine(bloc) * 1.4])), salience: BASE_SALIENCE });

/** Non-partisan races: the ballot shows no party (school boards, judges, most city councils). */
export const isPartisan = (officeId) => !['schoolBoard', 'judge', 'cityCouncil'].includes(officeId);

/* ------------------------------------------------------------------ */
/* When                                                                */
/* ------------------------------------------------------------------ */

/** The office's election cycle: every N years, in years where (year - offset) % N === 0. */
export function cycleOf(state, officeId) {
  const o = OFFICES[officeId];
  const st = stateIdOf(state);
  const pick = (opts, key) => opts[hash(key) % opts.length];
  if (o.country) return { every: o.term, offset: hash(`${o.country}:${officeId}`) % o.term };
  switch (officeId) {
    case 'president': return { every: 4, offset: 0 };
    case 'usRep': case 'stateRep': return { every: 2, offset: 0 };
    case 'usSenator': return { every: 6, offset: pick([0, 2, 4], `sen:${st}`) };
    case 'stateSenator': return { every: 4, offset: pick([0, 2], `ss:${st}`) };
    case 'governor': return { every: 4, offset: pick([2, 2, 2, 0, 1], `gov:${st}`) };
    case 'mayor': case 'cityCouncil': case 'schoolBoard': return { every: 4, offset: pick([1, 3], `city:${state.character.regionId}:${officeId}`) };
    case 'judge': return { every: 6, offset: pick([0, 2, 4], `judge:${st}`) };
    default: return { every: o.term || 4, offset: 2 % (o.term || 4) };
  }
}
export function nextElectionYear(state, officeId, from = currentYear(state) + 1) {
  const { every, offset } = cycleOf(state, officeId);
  let y = from;
  while (((y - offset) % every + every) % every !== 0) y += 1;
  return y;
}
/** How many years before the election you can declare. */
export const FILING_WINDOW = (officeId) => (OFFICES[officeId].level >= 5 ? 2 : 1);

/** Offices still decided the old way: party leaders, parliaments' choices, and China's appointments. */
export const outsideCalendar = (state, officeId) => {
  const o = OFFICES[officeId];
  return Boolean(o.leader || o.selection || here(state) === 'CN');
};

/* ------------------------------------------------------------------ */
/* Against whom                                                        */
/* ------------------------------------------------------------------ */

const fullName = (rng) => { const n = randomName(rng, rng.pick(['male', 'female'])); return `${n.firstName} ${n.lastName}`; };
const BACKGROUNDS = ['a two-term county commissioner', 'a retired Army colonel', 'a small-business owner', 'a former prosecutor', 'a school principal', 'a state legislator', 'a self-funding millionaire', 'a pastor', 'a union organizer', 'a former TV anchor', 'a physician', 'a farmer', 'a city council member', 'a former mayor', 'a tech executive'];

/** A candidate's platform: their party's line, pulled toward the district when they've had to win it. */
function platformFor(bloc, electorate, rng, moderate) {
  return Object.fromEntries(ISSUE_IDS.map((id) => {
    // No party (a non-partisan race): a candidate with views of their own.
    const line = bloc ? partyLine(bloc) * 1.3 : rng.pick([-1, -0.5, 0, 0.5, 1]);
    const pos = moderate ? line * 0.55 + electorate.median[id] * 0.45 : line;
    return [id, clamp(Math.round(pos + rng.float(-0.6, 0.6)), -2, 2)];
  }));
}

/** The other side's candidate (or, in a non-partisan race, the strongest of the field). */
export function makeOpponent(state, officeId, rng, { vsIncumbent = false, playerIncumbent = false } = {}) {
  const office = OFFICES[officeId];
  const e = electorateOf(state, officeId);
  const mine = state.civic?.party?.bloc ?? null;
  // In a partisan race, the other party; for an independent, whichever party the place favors.
  const bloc = isPartisan(officeId) ? (mine ? (mine === 'labor' ? 'business' : 'labor') : e.lean >= 0 ? 'business' : 'labor') : null;
  const incumbent = vsIncumbent && !playerIncumbent;
  const quality = Math.round(clamp(25 + office.level * 5 + rng.int(-10, 18) + (incumbent ? 12 : 0) - (playerIncumbent ? 10 : 0), 15, 95));
  return {
    name: fullName(rng),
    bloc,
    background: incumbent ? 'the incumbent' : rng.pick(BACKGROUNDS),
    incumbent,
    quality,
    platform: platformFor(bloc, e, rng, incumbent || rng.chance(0.5)),
    funds: Math.round(office.cost * rng.float(0.15, 0.4) * (0.6 + quality / 100) * (incumbent ? 1.5 : 1)),
    scandal: 0,
    weakness: rng.pick(['a lobbyist-funded junket', 'missed votes', 'a donor who went to prison', 'a business that went bankrupt', 'old posts online', 'a DUI decades ago', 'a lawsuit from former employees', 'nothing anyone has found']),
  };
}

/** Primary rivals: your party's other candidates. */
export function makeRivals(state, officeId, rng, { open = true } = {}) {
  const office = OFFICES[officeId];
  const bloc = state.civic?.party?.bloc;
  if (!bloc || !isPartisan(officeId) || office.level < 2) return [];
  const e = baseOf(bloc);
  const n = open ? rng.int(1, office.level >= 4 ? 3 : 2) : rng.chance(0.25) ? 1 : 0;
  return Array.from({ length: n }, () => ({
    name: fullName(rng),
    quality: Math.round(clamp(25 + office.level * 6 + rng.int(-12, 15), 10, 90)),
    // Primary challengers run to the base; a few run as the moderate.
    platform: Object.fromEntries(ISSUE_IDS.map((id) => [id, clamp(Math.round(e.median[id] * (rng.chance(0.25) ? 0.3 : 1.1) + rng.float(-0.5, 0.5)), -2, 2)])),
    funds: Math.round(office.cost * rng.float(0.05, 0.25)),
  }));
}

/* ------------------------------------------------------------------ */
/* The count                                                           */
/* ------------------------------------------------------------------ */

/** Your quality as a candidate (0–100): recognition, experience, standing, record. */
export function candidateQuality(state, officeId) {
  const office = OFFICES[officeId];
  const p = state.politics;
  const levels = p.history.map((h) => OFFICES[h.officeId]?.level ?? 0);
  if (p.office) levels.push(OFFICES[p.office.id]?.level ?? 0);
  const exp = Math.max(0, ...levels);
  const gap = office.level - 1 - exp;
  return Math.round(clamp(30 + p.recognition * 0.35 + (gap <= 0 ? 10 : -9 * gap) + Math.min(10, prestige(state) / 40) + (credibility(state) - 70) / 3, 0, 100));
}

/** The president's (or governing) party and how the national mood runs against it. */
export function nationalMood(state, officeId) {
  const office = OFFICES[officeId];
  const sc = scope(office);
  const exec = state.legislature?.bodies ? Object.values(state.legislature.bodies).find((b) => b.level === 'federal')?.executive : null;
  const inParty = exec?.caucus ?? null;
  if (!inParty || sc === 'local') return { inParty, swing: 0, why: [] };
  let swing = 0;
  const why = [];
  const y = currentYear(state);
  if (here(state) === 'US' && y % 4 === 2 && officeId !== 'president') { swing -= 0.03; why.push('midterm backlash'); }
  if (state.economy?.phase === 'recession') { swing -= 0.03; why.push('the recession'); }
  if (state.economy?.phase === 'boom') { swing += 0.015; why.push('a strong economy'); }
  return { inParty, swing, why };
}

const moneyEdge = (mine, theirs, cost) => 0.05 * Math.tanh(Math.log((mine + 0.1 * cost) / (theirs + 0.1 * cost)));

/** Scandals in your record (legal, political) as a vote penalty. */
export function scandalDrag(state) {
  const age = state.character.age;
  return state.legal.record.reduce((s, r) => {
    const recency = age - r.age <= 10 ? 1 : 0.4;
    return s + (r.severity === 'felony' ? 0.14 : r.severity === 'misdemeanor' ? 0.03 : 0.01) * recency;
  }, 0) + (state.politics.scandals ?? 0) * 0.04;
}

/**
 * Your share of the two-way vote in the general election. Returns { share, parts } where parts
 * explain it (for the campaign card).
 */
export function generalShare(state, officeId, c, { incumbent = false } = {}) {
  const office = OFFICES[officeId];
  const e = electorateOf(state, officeId);
  const mine = state.civic?.party?.bloc ?? null;
  const partisan = isPartisan(officeId);
  const opp = c?.opponent ?? typicalOpponent(state, officeId, { playerIncumbent: incumbent });
  const parts = [];
  const add = (label, v) => { if (Math.abs(v) >= 0.005) parts.push({ label, v }); return v; };
  let share = 0.5;
  if (partisan) {
    // The district's lean, toward your party or away from it; independents have no base.
    const dir = mine === 'business' ? 1 : mine === 'labor' ? -1 : 0;
    share += add(dir ? `${e.label} ${dir * e.lean >= 0 ? 'district, your way' : 'district, against you'}` : 'No party behind you', dir ? dir * e.lean : -0.07);
    const mood = nationalMood(state, officeId);
    if (mine && mood.swing) share += add(`National mood (${mood.why.join(', ')})`, mood.inParty === mine ? mood.swing : -mood.swing * 0.6);
    share += add('Your standing in the party', partyBonus(state));
  }
  // The platforms against what voters want.
  // Pivoting to the middle for the general moves you a third of the way to the voters.
  const pf = platformView(state);
  const yours = c?.pivot ? Object.fromEntries(ISSUE_IDS.map((id) => [id, pf[id] + (e.median[id] - pf[id]) / 3])) : pf;
  const fit = (distance(opp.platform, e, c?.focus) - distance(yours, e, c?.focus)) * (partisan ? 0.07 : 0.08);
  share += add(fit >= 0 ? 'Closer to the voters on the issues' : 'Further from the voters on the issues', fit);
  share += add('Candidate quality', clamp((candidateQuality(state, officeId) - opp.quality) / 450, -0.08, 0.08));
  share += add('Money', moneyEdge(c?.funds ?? 0, opp.funds ?? 0, office.cost));
  share += add('Endorsements', (c?.endorsements?.length ?? 0) * 0.012);
  if (incumbent) share += add('Incumbency', 0.03 + ((state.politics.office?.approval ?? 50) - 50) / 250);
  if (opp.incumbent) share += add(`${opp.name} is the incumbent`, -0.04);
  share += add('Momentum', clamp(c?.momentum ?? 0, -0.06, 0.06));
  share += add('Opponent\'s scandals', (opp.scandal ?? 0) * 0.03);
  share += add('Scandals', -scandalDrag(state));
  share += add('Movement behind you', influenceVoteBonus(state) * (office.level <= 2 ? 1 : 0.5));
  return { share: clamp(share, 0.08, 0.84), parts, opponent: opp };
}

/** Your share in the party primary, against the strongest rival. */
export function primaryShare(state, officeId, c) {
  const office = OFFICES[officeId];
  const bloc = state.civic?.party?.bloc;
  const rivals = c?.rivals ?? [];
  if (!rivals.length) return 1;
  const base = baseOf(bloc);
  const best = rivals.reduce((a, b) => ((b.quality - distance(b.platform, base) * 20) > (a.quality - distance(a.platform, base) * 20) ? b : a));
  let share = 0.5
    + (distance(best.platform, base) - distance(platformView(state), base)) * 0.12
    + (candidateQuality(state, officeId) - best.quality) / 250
    + partyBonus(state) * 2
    + (c.endorsements ?? []).filter((x) => ['party', 'activists', 'labor'].includes(x)).length * 0.03
    + moneyEdge(c.funds ?? 0, best.funds ?? 0, office.cost) * 0.8
    + (c.incumbent ? 0.15 : 0)
    - (best.incumbent ? 0.12 : 0)
    - scandalDrag(state);
  // A crowded field splits the anti-you vote.
  if (rivals.length >= 2) share += 0.04 * (rivals.length - 1);
  return clamp(share, 0.05, 0.95);
}

/** A typical opponent for projections (deterministic, not stored). */
export function typicalOpponent(state, officeId, opts = {}) {
  const rng = new Random(hash(`${officeId}:${state.character.regionId}:${currentYear(state)}`));
  return makeOpponent(state, officeId, rng, opts);
}

/** Start a race. */
export function newCampaign(state, officeId, rng, { incumbent = false, electionYear = null } = {}) {
  const office = OFFICES[officeId];
  const y = electionYear ?? nextElectionYear(state, officeId);
  // Is the seat held? Statewide seats usually are; an incumbent running again is tough to beat.
  const vsIncumbent = !incumbent && rng.chance(office.statewide ? 0.55 : 0.45);
  const partisan = isPartisan(officeId);
  const rivals = incumbent ? makeRivals(state, officeId, rng, { open: false }) : makeRivals(state, officeId, rng, { open: true });
  return {
    officeId,
    startAge: state.character.age,
    electionYear: y,
    electionAge: state.character.age + (y - currentYear(state)),
    stage: rivals.length ? 'primary' : 'general',
    partisan,
    incumbent,
    vsIncumbent,
    funds: 0,
    endorsements: [],
    opponent: makeOpponent(state, officeId, rng, { vsIncumbent, playerIncumbent: incumbent }),
    rivals,
    focus: {},
    polls: [],
    momentum: 0,
    ads: 0,
  };
}

/** A poll: the projected share, plus a margin of error the size of a real poll's. */
export function takePoll(state, c, rng) {
  const { share } = c.stage === 'primary' ? { share: primaryShare(state, c.officeId, c) } : generalShare(state, c.officeId, c, { incumbent: c.incumbent });
  const poll = Math.round(clamp(share + rng.float(-0.03, 0.03), 0.02, 0.98) * 100);
  c.polls = [...(c.polls ?? []).slice(-5), { age: state.character.age, stage: c.stage, you: poll }];
  return poll;
}

/** How your voters take a vote on a law (side -1 the left's, +1 the right's): approval points. */
export function voteReaction(state, officeId, issue, side) {
  if (!issue || !side || !OFFICES[officeId]) return 0;
  const lean = electorateOf(state, officeId).median[issue];
  return Math.round(side * Math.sign(lean) * Math.min(3, Math.abs(lean) * 2));
}

export const opponentLabel = (state, opp) => `${opp.name}${opp.bloc ? ` (${partyName(state, opp.bloc)})` : ''}`;
export const stanceText = (issue, v) => ISSUES[issue].stances[clamp(Math.round(v), -2, 2) + 2];
export { ideology };
