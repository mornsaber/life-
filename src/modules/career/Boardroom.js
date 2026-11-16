/**
 * Boards and the top of the tree.
 *
 *   Board seats     senior people (and those with a name in their field) are invited onto boards:
 *                   a company's as a non-executive director (fees), a charity's as a trustee
 *                   (unpaid), a public body's (a modest fee). Three-year terms; too many seats and
 *                   people say you're overboarded. A scandal at one asks what you knew.
 *   Running it      at the very top (chief executive, head of the organization) you set the
 *                   strategy each year, groom a successor, and face what tops face: an activist
 *                   investor when the shares lag, and a board that loses confidence.
 *   After the top   the years after a big career: chairing a commission, advisory work, a memoir,
 *                   and (in countries that give them) an honour.
 *
 * state.career.boards = [{ id, name, kind, fee, since, until }]; job.strategy; job.successor
 * state.career.after = { commission, advisory: untilAge, memoir, honour }
 */
import { clamp, Random } from '../../core/Random.js';
import { addHonor, yearlyCount, bumpYearly } from '../../core/State.js';
import { showResult } from '../life/ResultCards.js';
import { yearNow } from '../world/Eras.js';
import { localWage } from '../world/Countries.js';
import { leaveJob } from './CareerEngine.js';
import { corpOf } from './CompanyLife.js';
import { reputationOf, addReputation } from './Reputation.js';

const money = (n) => `$${Math.round(n).toLocaleString()}`;
const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 1913 + state.character.age * 227 + 0xb0a) >>> 0);
export const MAX_SEATS = 3;
const PREFIX = ['Meridian', 'Northern', 'Atlas', 'Consolidated', 'Harbour', 'Crown', 'Union', 'Summit', 'Westbrook', 'Ironside'];
const SUFFIX = ['Holdings', 'Group', 'Industries', 'Insurance', 'Utilities', 'Bank', 'Logistics', 'Foods'];
const CHARITY = ['the Children\'s Hospital Trust', 'the City Orchestra', 'a housing charity', 'the University Council', 'the Museum Trustees', 'a medical research foundation'];
const PUBLIC = ['the Regional Health Board', 'the National Audit Board', 'the Arts Council', 'the Transport Authority', 'the Broadcasting Board'];

/** Your highest grade, in this job or any before. */
export const peakGrade = (state) => Math.max(state.career?.job?.peakGrade ?? state.career?.job?.grade ?? 0, ...(state.career?.history ?? []).map((h) => h.peakGrade ?? 0));
export const boardsOf = (state) => (state.career.boards ??= []);
const nedWord = (state) => (yearNow(state) >= 1970 ? 'non-executive director' : 'director');
/** Boards want the very senior, or a real name in the field. */
const eligible = (state) => peakGrade(state) >= 9 || reputationOf(state) >= 75;

/** At the very top: chief executive, or head of the whole organization. */
export function atTheTop(job) {
  if (!job) return false;
  if (job.headOf && !job.headOf.deptId) return true;
  return (job.grade ?? 0) >= 10 && Boolean(job.abilities?.includes('exec'));
}

/* ------------------------------------------------------------------ */
/* Board seats                                                         */
/* ------------------------------------------------------------------ */

function invite(ctx, rng) {
  const { state } = ctx;
  const kind = rng.weighted([{ k: 'company', w: 5 }, { k: 'charity', w: 3 }, { k: 'public', w: 2 }], (x) => x.w).k;
  const name = kind === 'company' ? `${rng.pick(PREFIX)} ${rng.pick(SUFFIX)}` : kind === 'charity' ? rng.pick(CHARITY) : rng.pick(PUBLIC);
  if (boardsOf(state).some((b) => b.name === name)) return;
  const wage = localWage(state);
  const fee = kind === 'company' ? Math.round(rng.int(30, 120) * 1000 * wage / 1000) * 1000 : kind === 'public' ? Math.round(rng.int(10, 30) * 1000 * wage / 100) * 100 : 0;
  const role = kind === 'charity' ? 'a trustee' : kind === 'public' ? 'a board member' : `a ${nedWord(state)}`;
  ctx.prompt({ type: 'boardroom.invite', icon: '🪑', title: 'A Seat on the Board', text: `The chair of ${name} would like you to join as ${role}${fee ? `, for ${money(fee)} a year` : ''}: six meetings a year, a three-year term.${boardsOf(state).length >= MAX_SEATS - 1 ? ' You already sit on several boards.' : ''}`,
    options: [
      { id: 'yes', label: '🪑 Accept', hint: fee ? 'Fees, prestige, and responsibility for what the board signs off' : 'Unpaid; good works and good company' },
      { id: 'no', label: '🙅 Decline' },
    ], data: { kind, name, fee } });
}

function boardsYear(ctx, rng) {
  const { state } = ctx;
  const seats = boardsOf(state);
  for (const b of [...seats]) {
    if (b.fee) ctx.earn(b.fee, `Board fees — ${b.name}`);
    if (b.kind === 'charity') ctx.stat('happiness', 1);
    if (state.character.age >= b.until) {
      if (rng.chance(0.6) && state.character.age < 75) { b.until = state.character.age + 3; ctx.log(`You were reappointed to the board of ${b.name}.`, '🪑', 'good'); }
      else { state.career.boards = seats.filter((x) => x !== b); ctx.log(`Your term on the board of ${b.name} ended.`, '🪑', 'info'); }
      continue;
    }
    if (b.kind === 'company' && rng.chance(0.04) && !state.prompts.some((p) => p.type === 'boardroom.scandal')) {
      ctx.prompt({ type: 'boardroom.scandal', icon: '📰', title: 'Trouble at the Company', text: `${b.name} is in the papers: an accounting scandal the auditors missed. Shareholders ask what the board knew, and the regulator is asking too.`,
        options: [
          { id: 'fight', label: '🛡️ Stay and clean it up', hint: 'Long nights, and your name on the report' },
          { id: 'whistle', label: '📣 Push for a full, public inquiry', hint: 'Right, and the rest of the board won\'t thank you' },
          { id: 'resign', label: '🚪 Resign from the board' },
        ], data: { id: b.id } });
    }
  }
  if (seats.length >= MAX_SEATS) ctx.stat('stress', 2);
  if (eligible(state) && state.character.age >= 40 && state.character.age < 78 && seats.length < MAX_SEATS && rng.chance(0.06) && !state.prompts.some((p) => p.type === 'boardroom.invite')) invite(ctx, rng);
}

/* ------------------------------------------------------------------ */
/* Running the place                                                   */
/* ------------------------------------------------------------------ */

export const STRATEGIES = {
  growth: { label: 'Growth', icon: '🚀', hint: 'Expand, acquire, hire: bigger swings', health: [-6, 10] },
  cost: { label: 'Cost discipline', icon: '✂️', hint: 'Cut, consolidate, pay down debt: safer, unloved', health: [0, 4] },
  quality: { label: 'Quality and people', icon: '🌱', hint: 'Invest in staff and service: slower, steadier', health: [-2, 6] },
};

function topYear(ctx, job, rng) {
  const { state } = ctx;
  const c = corpOf(state, job);
  const s = STRATEGIES[job.strategy ?? 'quality'];
  if (c) c.health = Math.round(clamp(c.health + rng.int(...s.health), 0, 100));
  if (job.strategy === 'cost') job.coworkers = Math.round(clamp((job.coworkers ?? 55) - 3, 0, 100));
  if (job.strategy === 'quality') job.coworkers = Math.round(clamp((job.coworkers ?? 55) + 2, 0, 100));
  if (c?.listed && c.health < 45 && rng.chance(0.15) && !state.prompts.some((p) => p.type === 'boardroom.activist')) {
    return ctx.prompt({ type: 'boardroom.activist', icon: '🦈', title: 'An Activist Investor', text: `A hedge fund has built a stake in ${job.employer.name} and published a letter: the shares have lagged, and they want board seats, a break-up, and your head.`,
      options: [
        { id: 'fight', label: `🛡️ Fight them at the shareholder meeting (${Math.round(activistOdds(job, c) * 100)}%)` },
        { id: 'settle', label: '🤝 Give them two board seats', hint: 'Peace, at a price: they will watch everything you do' },
        { id: 'sell', label: '💰 Agree to sell a division', hint: 'They go away; the company is smaller' },
      ], data: {} });
  }
  // A board that has lost confidence.
  if ((c ? c.health < 25 : true) && (job.performance ?? 55) < 40 && rng.chance(0.3)) {
    const pay = Math.round((job.salary ?? 0) * 1.5);
    ctx.log(`The board met without you and lost confidence. You were thanked for your service and left with ${money(pay)}.`, '🪑', 'bad');
    showResult(ctx, { icon: '🪑', title: 'Ousted', big: job.employer.name, sub: 'The board lost confidence', tone: 'bad', popup: true });
    leaveJob(ctx, 'Ousted by the board');
    ctx.earn(pay, 'Departure package', { wage: true });
  }
}
export const activistOdds = (job, c) => clamp(0.35 + ((job.performance ?? 55) - 55) / 120 + ((c?.health ?? 50) - 40) / 150, 0.1, 0.8);

/* ------------------------------------------------------------------ */
/* After the top                                                       */
/* ------------------------------------------------------------------ */

const HONOURS = {
  GB: { from: 1917, name: 'Commander of the Order of the British Empire (CBE)', order: 'obe', grade: 3 },
  FR: { from: 1802, name: 'Chevalier of the Légion d\'honneur', order: 'legion', grade: 1 },
  JP: { from: 1875, name: 'Order of the Rising Sun', order: 'risingSun', grade: 1 },
  AU: { from: 1975, name: 'Officer of the Order of Australia (AO)', order: 'oa', grade: 2 },
  CA: { from: 1967, name: 'Officer of the Order of Canada', order: 'oc', grade: 2 },
  NZ: { from: 1996, name: 'Officer of the New Zealand Order of Merit (ONZM)', order: 'nzom', grade: 2 },
  IN: { from: 1954, name: 'Padma Shri', order: 'padma', grade: 1 },
};

function afterYear(ctx, rng) {
  const { state } = ctx;
  const a = (state.career.after ??= {});
  if (a.advisory && state.character.age < a.advisory) ctx.earn(Math.round(40000 * localWage(state)), 'Advisory work');
  if (state.career.job || peakGrade(state) < 9 || state.character.age < 50 || state.character.age > 80 || state.prompts.some((p) => p.type === 'boardroom.after')) return;
  if (!rng.chance(0.18)) return;
  const options = [
    !a.commission && { id: 'commission', label: '📜 Chair a public commission', hint: 'Two years, a report with your name on it' },
    !a.advisory && { id: 'advisory', label: '🧭 Take on advisory work', hint: 'A few days a month, well paid' },
    !a.memoir && reputationOf(state) >= 40 && { id: 'memoir', label: '📖 Write your memoir', hint: 'A publisher has offered an advance' },
  ].filter(Boolean);
  if (!options.length) return;
  ctx.prompt({ type: 'boardroom.after', icon: '🌅', title: 'After the Top Job', text: 'People still call. Your experience is in demand, for a while longer.', options: [...options, { id: 'rest', label: '🏡 Enjoy the quiet' }], data: {} });
}

function maybeHonour(ctx) {
  const { state } = ctx;
  const a = (state.career.after ??= {});
  const h = HONOURS[state.character.countryId ?? 'US'];
  if (a.honour || !h || yearNow(state) < h.from || peakGrade(state) < 9) return;
  if (!new Random(state.character.age * 31 + 7).chance(0.12)) return;
  a.honour = true;
  addHonor(state, { id: `career.${h.order}`, source: 'civil', name: h.name, icon: '🎖️', prestige: 40, precedence: 40, order: h.order, grade: h.grade, citation: 'For services to the nation in a long career.' });
  ctx.log(`You were appointed ${h.name}, for services in a long career.`, '🎖️', 'milestone');
  showResult(ctx, { icon: '🎖️', title: 'An honour', big: h.name, sub: 'For services in a long career', tone: 'good', popup: true });
}

/* ------------------------------------------------------------------ */
/* The module                                                          */
/* ------------------------------------------------------------------ */

export const BoardroomModule = {
  id: 'boardroom',
  order: 30.8,
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.career || state.character.age < 18) return;
    const rng = sideRng(state);
    boardsYear(ctx, rng);
    const job = state.career.job;
    if (atTheTop(job)) topYear(ctx, job, rng);
    afterYear(ctx, rng);
    maybeHonour(ctx);
  },
  actions: {
    /** Set the year's strategy, at the top. */
    strategy(ctx, id) {
      const job = ctx.state.career.job;
      if (!atTheTop(job) || !STRATEGIES[id]) return;
      job.strategy = id;
      ctx.toast(`${STRATEGIES[id].icon} Strategy: ${STRATEGIES[id].label}`, 'info');
    },
    /** Groom a successor: an insider you've brought on, or an outsider the board will like. */
    successor(ctx, kind) {
      const { state } = ctx;
      const job = state.career.job;
      if (!atTheTop(job) || !['insider', 'outsider'].includes(kind)) return;
      if (yearlyCount(state, 'boardroom.successor')) return ctx.toast('Once a year.', 'warn');
      bumpYearly(state, 'boardroom.successor');
      job.successor = kind;
      job.boss = Math.round(clamp((job.boss ?? 50) + 4, 0, 100));
      ctx.log(kind === 'insider' ? 'You began grooming an insider to succeed you. The board likes a plan.' : 'You asked the board to start an outside search for your successor, in good time.', '🧑‍💼', 'good');
    },
    /** Step down from a board. */
    resign(ctx, id) {
      const { state } = ctx;
      const b = boardsOf(state).find((x) => x.id === id);
      if (!b) return;
      state.career.boards = boardsOf(state).filter((x) => x !== b);
      ctx.log(`You stepped down from the board of ${b.name}.`, '🪑', 'info');
    },
  },
  resolvers: {
    invite(ctx, data, optionId) {
      const { state } = ctx;
      if (optionId !== 'yes') return ctx.log(`You declined a seat on the board of ${data.name}.`, '🪑');
      boardsOf(state).push({ id: ctx.rng.id('board_'), name: data.name, kind: data.kind, fee: data.fee, since: state.character.age, until: state.character.age + 3 });
      addReputation(state, state.career.job?.professionId ?? state.career.history?.at(-1)?.professionId, 2);
      ctx.log(`You joined the board of ${data.name}.`, '🪑', 'good');
    },
    scandal(ctx, data, optionId) {
      const { state, rng } = ctx;
      const b = boardsOf(state).find((x) => x.id === data.id);
      if (!b) return;
      if (optionId === 'resign') { state.career.boards = boardsOf(state).filter((x) => x !== b); return ctx.log(`You resigned from the board of ${b.name}. Some called it principled; some said you ran.`, '🚪', 'info'); }
      if (optionId === 'whistle') { addReputation(state, state.career.job?.professionId, 4); ctx.stat('stress', 6); return ctx.log('You pushed for a full public inquiry. It found what you suspected, and the chair resigned.', '📣', 'good'); }
      ctx.stat('stress', 8);
      if (rng.chance(0.6)) return ctx.log(`You stayed and helped clean up ${b.name}. The report praised the board's response.`, '🛡️', 'good');
      ctx.log(`The regulator found the board had missed the warning signs, yours included. Your name was in the report.`, '🛡️', 'bad');
    },
    activist(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!job) return;
      const c = corpOf(state, job);
      if (optionId === 'settle') { job.boss = Math.round(clamp((job.boss ?? 50) - 6, 0, 100)); return ctx.log('You gave the activists two seats. Board meetings got longer.', '🤝', 'info'); }
      if (optionId === 'sell') { if (c) c.health = Math.round(clamp(c.health + 8, 0, 100)); job.employer.size = job.employer.size === 'enterprise' ? 'large' : job.employer.size; return ctx.log('You sold a division. The shares jumped, and the activists sold out at a profit.', '💰', 'info'); }
      if (rng.chance(activistOdds(job, c))) { addReputation(state, job.professionId, 4); return ctx.log('You won the vote at the shareholder meeting. The activists sold their stake.', '🛡️', 'good'); }
      ctx.log('You lost the shareholder vote. Their nominees joined the board, and one of them chairs it now.', '🦈', 'bad');
      job.boss = Math.round(clamp((job.boss ?? 50) - 15, 0, 100));
      job.performance = Math.round(clamp((job.performance ?? 55) - 10, 0, 100));
    },
    after(ctx, data, optionId) {
      const { state } = ctx;
      const a = (state.career.after ??= {});
      if (optionId === 'commission') { a.commission = true; ctx.earn(Math.round(60000 * localWage(state)), 'Commission chair'); addReputation(state, state.career.history?.at(-1)?.professionId, 6); return ctx.log('You chaired a public commission. Its report bears your name, and some of it became law.', '📜', 'milestone'); }
      if (optionId === 'advisory') { a.advisory = state.character.age + 5; return ctx.log('You took on advisory work: a few days a month, for five years.', '🧭', 'good'); }
      if (optionId === 'memoir') { a.memoir = true; const adv = Math.round((20000 + reputationOf(state, state.career.history?.at(-1)?.professionId) * 1500) * localWage(state)); ctx.earn(adv, 'Memoir advance'); return ctx.log(`You wrote your memoir, for a ${money(adv)} advance. Former colleagues read the index first.`, '📖', 'good'); }
      ctx.log('You enjoyed the quiet.', '🏡');
    },
  },
};
