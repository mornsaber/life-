/**
 * The ruling party of a one-party state: in China (the Communist Party), North Korea (the
 * Workers' Party of Korea) and Vietnam (the Communist Party of Vietnam), real power runs
 * through the Party. China's ladder is described below; the others share it under their
 * own titles (RULING_PARTIES).
 *
 * Joining: apply at 18 (Communist Youth League members have an edge), pass a
 * political review — no criminal record, no religious belief, no suspect
 * foreign ties — and serve a probationary year before full membership. Members
 * pay dues (about 1% of income).
 *
 * The cadre ladder (nomenklatura), each rung appointed by the Organization
 * Department above it:
 *
 *   0 Party member              5 Provincial Standing Committee member
 *   1 Branch secretary          6 Provincial Party Secretary
 *   2 Township Party secretary  7 Politburo member
 *   3 County Party secretary    8 Politburo Standing Committee member
 *   4 City Party secretary      9 General Secretary (and President of the PRC)
 *
 * Promotion comes at evaluations (every year low down; at the five-yearly Party
 * Congress near the top) and turns on your record (growth, stability, campaigns
 * delivered), your patron and your network, and age limits: county posts go to
 * cadres under 55, provincial posts to under 63, and "seven up, eight down" —
 * 67 may join the Standing Committee, 68 retires. A Party Secretary outranks
 * the mayor or governor beside them: city secretaries and up write their
 * city's or province's budget, and the General Secretary the nation's.
 *
 * And the Central Commission for Discipline Inspection is always watching:
 * graft (or a patron's fall) can mean investigation, expulsion and prison.
 *
 * state.cpc = { status: null|'youthLeague'|'applicant'|'probationary'|'member'|'expelled', since, rank, record,
 *               network, patron: { name, rank, fallen } | null, graft, dues }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, randomName, criminalRecord } from '../../core/State.js';
import { budgetAt } from './Budgets.js';
import { isCitizen } from '../world/Countries.js';

export const CPC_RANKS = [
  { title: 'Party member', salary: 0, maxAge: 99 },
  { title: 'Party branch secretary', salary: 4000, maxAge: 60 },
  { title: 'Township Party secretary', salary: 9000, maxAge: 55 },
  { title: 'County Party secretary', salary: 14000, maxAge: 55, level: null },
  { title: 'City Party secretary', salary: 20000, maxAge: 60, level: 'city' },
  { title: 'Member of the Provincial Standing Committee', salary: 24000, maxAge: 60 },
  { title: 'Provincial Party Secretary', salary: 30000, maxAge: 63, level: 'state' },
  { title: 'Member of the Politburo', salary: 34000, maxAge: 67 },
  { title: 'Member of the Politburo Standing Committee', salary: 38000, maxAge: 67 },
  { title: 'General Secretary of the Communist Party', salary: 45000, maxAge: 99, level: 'national' },
];
/** Retirement at the top: "seven up, eight down". */
export const RETIRE_AGE = 68;
const DUES = 0.01;

/**
 * The ruling parties of the one-party states, on the same cadre ladder: China's Communist
 * Party, North Korea's Workers' Party and the Communist Party of Vietnam.
 */
export const RULING_PARTIES = {
  CN: { name: 'the Communist Party of China', short: 'the Party', youth: 'the Communist Youth League', capital: 'Beijing', thought: 'Xi Jinping Thought', office: 'cn_president', topNote: 'The National People\'s Congress will make you President of the PRC.', flag: '🇨🇳' },
  KP: { name: 'the Workers\' Party of Korea', short: 'the Party', youth: 'the Socialist Patriotic Youth League', capital: 'Pyongyang', thought: 'Kimilsungism–Kimjongilism', office: 'kp_president', topNote: 'The Supreme People\'s Assembly will name you President of the State Affairs Commission.', flag: '🇰🇵',
    titles: ['Party member', 'Party cell secretary', 'Ri (village) Party committee secretary', 'County Party committee chief secretary', 'City Party committee chief secretary', 'Member of a provincial Party committee', 'Provincial Party committee chief secretary', 'Member of the Politburo', 'Member of the Presidium of the Politburo', 'General Secretary of the Workers\' Party of Korea'] },
  VN: { name: 'the Communist Party of Vietnam', short: 'the Party', youth: 'the Ho Chi Minh Communist Youth Union', capital: 'Hanoi', thought: 'Ho Chi Minh Thought', office: 'vn_president', topNote: 'The Central Committee leads the state; the National Assembly will confirm your colleagues in the top posts.', flag: '🇻🇳',
    titles: ['Party member', 'Party cell secretary', 'Commune Party secretary', 'District Party secretary', 'City Party secretary', 'Member of a provincial Party standing committee', 'Provincial Party secretary', 'Member of the Politburo', 'Standing member of the Secretariat', 'General Secretary of the Communist Party of Vietnam'] },
};
export const partyHere = (state) => RULING_PARTIES[state.character.countryId ?? 'US'] ?? null;
const inChina = (state) => Boolean(partyHere(state));
/** A cadre rank's title in this country's party. */
export const rankTitle = (state, rank) => partyHere(state)?.titles?.[rank] ?? CPC_RANKS[rank]?.title;
export const cpcOf = (state) => state.cpc ?? null;
export const isMember = (state) => ['member', 'probationary'].includes(state.cpc?.status);
/** The level of government a Party post runs (a city, a province, the nation), or null. */
export function cpcLevel(state) {
  const c = state.cpc;
  if (!c || c.status !== 'member' || !inChina(state)) return null;
  return CPC_RANKS[c.rank]?.level ?? null;
}

/** Why you can't join (null: you can). */
export function joinBlock(state) {
  if (!inChina(state)) return 'Only in a one-party state';
  if (!isCitizen(state, state.character.countryId)) return 'Citizens only';
  if (state.regime?.songbun === 'hostile') return 'Your songbun (family background) bars you from the Party';
  if (state.character.age < 18) return 'Join the Communist Youth League first (14–28); the Party from 18';
  const c = state.cpc;
  if (c?.status === 'expelled') return 'Expelled members are not readmitted';
  if (c && ['applicant', 'probationary', 'member'].includes(c.status)) return 'Already a member or applicant';
  if (criminalRecord(state).length) return 'The political review rejects a criminal record';
  if (state.community?.faith && state.community.faith !== 'none') return 'Members must be atheists: leave your religion first';
  return null;
}

function ensure(state) {
  state.cpc ??= { status: null, since: null, rank: 0, record: 50, network: 10, patron: null, graft: 0 };
  return state.cpc;
}

/** A promotion's odds at an evaluation: record, network, patron, age. */
export function promotionOdds(state) {
  const c = state.cpc;
  const next = CPC_RANKS[c.rank + 1];
  if (!next) return 0;
  if (state.character.age > next.maxAge - 2) return 0;
  // Cadres serve a full term or so in each post before the next.
  if (state.character.age - (c.postSince ?? c.since ?? 0) < 2 + Math.floor(c.rank / 2) * 2) return 0;
  const patron = c.patron && !c.patron.fallen && c.patron.rank > c.rank + 1 ? 0.12 : 0;
  return clamp(0.05 + (c.record - 60) / 150 + c.network / 500 + patron - c.rank * 0.03, 0.01, 0.45);
}

/** Party Congress years (every five; the top ranks only move then). */
const congressYear = (state) => (state.character.birthYear + state.character.age) % 5 === 2;

export const CommunistPartyModule = {
  id: 'cpc',
  order: 33.2,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const c = state.cpc;
    if (!c || !inChina(state) || !['applicant', 'probationary', 'member'].includes(c.status)) return;
    const age = state.character.age;
    if (c.status === 'applicant') {
      // The branch reviews you: activists and the well-connected get in.
      if (rng.chance(0.55 + c.network / 200)) { c.status = 'probationary'; c.since = age; ctx.log('Your Party branch accepted you as a probationary member. A year of study and service, then full membership.', '☭', 'good'); }
      else ctx.log('Your application is still pending. The branch wants to see more of your political activity.', '☭');
      return;
    }
    if (c.status === 'probationary') {
      c.status = 'member';
      ctx.log(`You were admitted as a full member of ${partyHere(state).name} and took the oath before the Party flag.`, '☭', 'milestone');
      return;
    }
    // Dues, and the post's stipend.
    const income = state.career.job?.salary ?? 0;
    if (income) ctx.spend(Math.round(income * DUES), 'Party membership dues');
    const post = CPC_RANKS[c.rank];
    if (post.salary) ctx.earn(post.salary, `${post.title} (Party post)`, { wage: true });
    c.record = Math.round(clamp(c.record + (50 - c.record) * 0.18 + rng.int(-4, 4) + (state.economy?.phase === 'recession' ? -4 : 1), 0, 100));
    // Discipline inspection: graft is found eventually, and a fallen patron drags you down.
    const exposure = c.graft * 0.08 + (c.patron?.fallen ? 0.15 : 0) + (rng.chance(0.03) ? 0.05 : 0);
    if (exposure && rng.chance(Math.min(0.7, exposure))) {
      ctx.prompt({
        type: 'cpc.investigation', icon: '🔍', title: 'The Discipline Inspectors',
        text: `The Central Commission for Discipline Inspection has summoned you for "questioning at a designated time and place".${c.graft ? ' They have bank records.' : ' Your patron\'s fall has put everyone near them under suspicion.'}`,
        options: [{ id: 'confess', label: '📝 Confess and cooperate' }, { id: 'deny', label: '🙅 Deny everything', tone: 'danger' }],
      });
      return;
    }
    // Patrons rise and fall.
    if (c.patron && !c.patron.fallen && rng.chance(0.06)) {
      c.patron.fallen = true;
      ctx.log(`Your patron ${c.patron.name} was placed under investigation. Old allies are suddenly hard to reach.`, '📉', 'warn');
    }
    // Age limits: retirement from the post (and the system).
    if (c.rank > 0 && (age >= RETIRE_AGE || age > post.maxAge) && !c.retiredFrom) {
      ctx.log(`You reached the age limit for ${rankTitle(state, c.rank)} and retired from your Party post. Retired cadres keep their membership — and some influence.`, '🎐', 'info');
      c.retiredFrom = post.title;
      c.rank = 0;
      if (state.politics.office?.id === partyHere(state)?.office) ctx.emit('politics:leave', { reason: 'Retired' });
      return;
    }
    if (c.retiredFrom) return;
    // Evaluations: the top ranks move only at a Party Congress.
    if (c.rank >= 6 && !congressYear(state)) { yearEvent(ctx); return; }
    if (rng.chance(promotionOdds(state))) {
      c.rank += 1;
      c.postSince = age;
      ctx.log(`The Organization Department appointed you ${rankTitle(state, c.rank)}.`, '☭', 'milestone');
      ctx.stat('happiness', 8);
      if (c.rank === 9) {
        const pt = partyHere(state);
        ctx.log(`The Central Committee elected you General Secretary. ${pt.topNote}`, pt.flag, 'milestone');
        ctx.emit('politics:take', { officeId: pt.office, appointed: true });
      }
      return;
    }
    yearEvent(ctx);
  },
  actions: {
    /** Join the Communist Youth League (14–28): the usual road into the Party. */
    joinLeague(ctx) {
      const { state } = ctx;
      if (!inChina(state)) return ctx.toast('Only in a one-party state', 'warn');
      if (state.character.age < 14 || state.character.age > 28) return ctx.toast('Ages 14 to 28', 'warn');
      const c = ensure(state);
      if (c.status) return ctx.toast('Already a member', 'warn');
      c.status = 'youthLeague';
      c.network += 10;
      ctx.log(`You joined ${partyHere(state).youth}.`, '🔴', 'good');
    },
    apply(ctx) {
      const { state } = ctx;
      const why = joinBlock(state);
      if (why) return ctx.toast(why, 'warn');
      const c = ensure(state);
      c.status = 'applicant';
      c.since = state.character.age;
      ctx.log(`You submitted your application to join ${partyHere(state).name}, with an essay on your political convictions.`, '☭', 'good');
    },
    /** Political study: Xi Jinping Thought sessions, the study app's points. */
    study(ctx) {
      const { state } = ctx;
      const c = state.cpc;
      if (!c || !isMember(state)) return ctx.toast('Members only', 'warn');
      if (yearlyCount(state, 'cpc.study')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'cpc.study');
      c.record = Math.min(100, c.record + 4);
      ctx.log(`You led your branch's study sessions on ${partyHere(state)?.thought ?? 'Party doctrine'} and came top of the political-study rankings.`, '📕');
    },
    /** Cultivate a patron (guanxi): banquets, favors, loyalty. */
    network(ctx) {
      const { state, rng } = ctx;
      const c = state.cpc;
      if (!c || c.status !== 'member') return ctx.toast('Full members only', 'warn');
      if (yearlyCount(state, 'cpc.network')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'cpc.network');
      if (!ctx.spend(3000 + c.rank * 2000, 'Banquets and gifts', { credit: true })) return ctx.toast('You can\'t afford the banquets', 'warn');
      c.network = Math.min(100, c.network + rng.int(6, 14));
      if (!c.patron || c.patron.fallen) {
        const n = randomName(rng, rng.pick(['male', 'female']));
        c.patron = { name: `${n.lastName} ${n.firstName}`, rank: Math.min(9, c.rank + rng.int(2, 4)), fallen: false };
        ctx.log(`${c.patron.name}, ${rankTitle(state, c.patron.rank).toLowerCase()}, has taken an interest in your career.`, '🤝', 'good');
      } else ctx.log(`Dinner with ${c.patron.name}'s circle went well.`, '🍶');
    },
  },
  resolvers: {
    investigation(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const c = state.cpc;
      if (!c) return;
      const caught = c.graft > 0 ? rng.chance(optionId === 'confess' ? 1 : 0.85) : rng.chance(0.3);
      if (!caught) {
        c.patron = null;
        c.record = Math.max(0, c.record - 10);
        return ctx.log('The inspectors found nothing to charge. You kept your membership — and learned who your friends were.', '😮‍💨', 'warn');
      }
      c.status = 'expelled';
      c.rank = 0;
      ctx.log('You were expelled from the Party "for serious violations of discipline" and handed to prosecutors.', '⛓️', 'bad');
      if (c.graft) ctx.emit('legal:offense', { offenseId: 'publicCorruption', context: 'abuse of a Party post', caught: true, evidence: optionId === 'confess' ? 0.95 : 0.8 });
      if (state.politics.office?.id?.startsWith(`${(state.character.countryId ?? '').toLowerCase()}_`)) ctx.emit('politics:leave', { reason: 'Expelled from the Party' });
    },
    event(ctx, data, optionId) {
      const { state, rng } = ctx;
      const c = state.cpc;
      const e = EVENTS.find((x) => x.id === data.id);
      const o = e?.options.find((x) => x.id === optionId);
      if (!c || !o) return;
      c.record = Math.round(clamp(c.record + (o.record ?? 0) + (o.gamble ? (rng.chance(0.5) ? o.gamble : -o.gamble) : 0), 0, 100));
      c.network = Math.round(clamp(c.network + (o.network ?? 0), 0, 100));
      if (o.graft) { c.graft += 1; ctx.earn(rng.int(50000, 400000), 'Undisclosed income'); }
      const level = CPC_RANKS[c.rank]?.level;
      if (o.fund && level) {
        const b = budgetAt(state, level);
        for (const [area, k] of Object.entries(o.fund)) if (b.funding[area] != null) b.funding[area] = Math.round(clamp(b.funding[area] * k, 0.6, 1.4) * 1000) / 1000;
        if (o.debt) b.debt = Math.round((b.debt + o.debt) * 100) / 100;
      }
      ctx.log(`${e.title}: ${o.label.replace(/^\S+\s/, '')}.`, '☭');
    },
  },
};

/** A Party cadre's year: targets, campaigns and temptations. */
const EVENTS = [
  { id: 'growth', title: 'The Growth Target', text: 'Your jurisdiction is behind on its GDP target. A developer offers a giant project.', options: [
    { id: 'build', label: '🏗️ Approve it: growth first', record: 6, gamble: 5, fund: { works: 1.08, roads: 1.08, infrastructure: 1.05 }, debt: 0.1 },
    { id: 'green', label: '🌳 Hold out for a cleaner project', record: -2, network: -2 },
    { id: 'graft', label: '💰 Approve it — for a stake in the company', record: 6, graft: true },
  ] },
  { id: 'petition', title: 'Petitioners', text: 'Villagers whose land was taken for a factory are planning to petition in the capital.', options: [
    { id: 'settle', label: '🤝 Meet them and pay fair compensation', record: 3, fund: { housing: 1.03, welfare: 1.02 } },
    { id: 'stop', label: '🚧 Stop them reaching the capital', record: 1, gamble: 6 },
  ] },
  { id: 'campaign', title: 'A Central Campaign', text: 'The centre has launched a campaign (production targets, a loyalty drive, a "speed battle"). Everyone is watching who delivers.', options: [
    { id: 'zeal', label: '📣 Throw everything at it', record: 7, network: 2, gamble: 4 },
    { id: 'steady', label: '📋 Deliver it by the book', record: 3 },
  ] },
  { id: 'gift', title: 'A Red Envelope', text: 'A businessman leaves a thick red envelope after a meeting about a license.', options: [
    { id: 'refuse', label: '🙅 Return it', record: 1 },
    { id: 'take', label: '🧧 Keep it', graft: true },
  ] },
];
function yearEvent(ctx) {
  const { state, rng } = ctx;
  if (state.cpc.rank < 1 || !rng.chance(0.6)) return;
  const e = rng.pick(EVENTS);
  ctx.prompt({
    type: 'cpc.event', icon: '☭', title: e.title,
    text: `${rankTitle(state, state.cpc.rank)} · record ${state.cpc.record}\n${e.text}`,
    options: e.options.map((o) => ({ id: o.id, label: o.label, tone: o.graft ? 'danger' : undefined })),
    data: { id: e.id },
  });
}
