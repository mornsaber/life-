/**
 * The holding company's board of directors.
 *
 * Once you form a holding company it gets a board: you chair it (you own the
 * group), and you appoint independent directors — the same kinds of experts
 * an operating company's board has. Their expertise works across every
 * subsidiary each year, and once a year the board reviews the group
 * (revenue growth, profit margin, treasury): a strong year earns you a
 * chairman's bonus from the treasury; a crisis gets the hired Group
 * President replaced. The board grows with the group (3 seats, up to 9).
 *
 * state.business.conglomerate.board = { seats: [{ id, kind, name, expertise?, skill, fee, since }], meetings: [{ age, score, verdict, notes }], history: [{ revenue, profit }] }
 */
import { clamp } from '../../core/Random.js';
import { EXPERTISE, VERDICTS, newDirector } from './Board.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;
const subsOf = (state) => [state.business.current, ...(state.business.holdings ?? [])].filter(Boolean);

/** Seats grow with the group: 3 for a small group, up to 9. */
export const groupBoardSize = (state) => clamp(3 + Math.floor(subsOf(state).length / 2) * 2, 3, 9);
export const groupDirectorFee = (state) => Math.round(clamp(subsOf(state).reduce((s, b) => s + (b.lastYear?.revenue ?? 0), 0) * 0.001, 25000, 300000) / 1000) * 1000;

export function ensureGroupBoard(state) {
  const c = state.business?.conglomerate;
  if (!c) return null;
  c.board ??= { seats: [], meetings: [], history: [] };
  const you = `${state.character.firstName} ${state.character.lastName}`;
  const owner = c.board.seats.find((s) => s.kind === 'owner');
  if (owner) owner.name = you;
  else c.board.seats.unshift({ id: `gseat_owner`, kind: 'owner', name: you, skill: 0, fee: 0, since: state.character.age });
  return c.board;
}

export const groupVacancies = (state) => {
  const b = state.business?.conglomerate?.board;
  return b ? Math.max(0, groupBoardSize(state) - b.seats.length) : groupBoardSize(state) - 1;
};

export function appointGroupDirector(ctx, expertise) {
  const { state, rng } = ctx;
  if (!EXPERTISE[expertise]) return;
  const b = ensureGroupBoard(state);
  if (!b) return ctx.toast('Form a holding company first.', 'warn');
  if (groupVacancies(state) <= 0) return ctx.toast('Every seat on the group board is filled.', 'warn');
  const d = newDirector(rng, { lastYear: { revenue: 0 } }, expertise, state.character.age);
  d.id = rng.id('gseat_');
  d.fee = groupDirectorFee(state);
  b.seats.push(d);
  ctx.log(`${state.business.conglomerate.name} named ${d.name} (${EXPERTISE[expertise].label.toLowerCase()}, skill ${d.skill}) to its board at ${money(d.fee)} a year.`, EXPERTISE[expertise].icon, 'good');
}

export function removeGroupDirector(ctx, seatId) {
  const b = ctx.state.business?.conglomerate?.board;
  const seat = b?.seats.find((s) => s.id === seatId && s.kind === 'independent');
  if (!seat) return;
  b.seats = b.seats.filter((s) => s !== seat);
  ctx.log(`${seat.name} left the ${ctx.state.business.conglomerate.name} board.`, '🚪');
}

/** How the group's year went, 0–100: growth, margin against its own record, treasury health. */
export function groupScore(b) {
  const h = b.history ?? [];
  const now = h.at(-1);
  const prev = h.at(-2);
  if (!now) return 55;
  const growth = prev?.revenue ? (now.revenue - prev.revenue) / Math.max(1, prev.revenue) : 0.03;
  const margin = now.revenue ? now.profit / now.revenue : 0;
  const past = h.length > 1 ? h.slice(0, -1).reduce((s, x) => s + (x.revenue ? x.profit / x.revenue : 0), 0) / (h.length - 1) : 0.08;
  return Math.round(clamp(55 + growth * 120 + (margin - past) * 150 + (margin < 0 ? -15 : 0), 0, 100));
}

/**
 * The year for the group board, after headquarters closes its books (Conglomerate tick).
 * Directors' expertise reaches every subsidiary; then the annual meeting. Returns report lines.
 */
export function groupBoardYear(ctx) {
  const { state } = ctx;
  const c = state.business?.conglomerate;
  const b = c?.board;
  if (!b) return [];
  const subs = subsOf(state);
  const lines = [];
  const revenue = subs.reduce((s, x) => s + (x.lastYear?.revenue ?? 0), 0);
  const profit = subs.reduce((s, x) => s + (x.lastYear?.netIncome ?? 0), 0);
  b.history = [...(b.history ?? []).slice(-6), { revenue, profit }];
  for (const s of b.seats.filter((x) => x.kind === 'independent')) {
    const k = s.skill / 140; // spread across the whole group, so gentler than on one company's board
    for (const x of subs) {
      if (s.expertise === 'operator') x.quality = Math.round(clamp(x.quality + k, 0, 100));
      if (s.expertise === 'marketing') x.reputation = Math.round(clamp(x.reputation + k, 0, 95));
      if (s.expertise === 'people') x.staff.morale = Math.round(clamp(x.staff.morale + k * 1.5, 0, 100));
    }
    if (s.expertise === 'finance') c.treasury += Math.round(Math.max(0, c.treasury) * 0.01 * k * 2 + revenue * 0.0005 * k);
  }
  const fees = b.seats.reduce((n, s) => n + (s.fee ?? 0), 0);
  if (fees) {
    c.treasury -= fees;
    ctx.deduct(fees, `${c.name} director fees`, { nonCash: true });
    lines.push(`paid ${money(fees)} in director fees`);
  }
  const score = groupScore(b);
  const patience = b.seats.some((s) => s.expertise === 'governance') ? 8 : 0;
  const verdict = score >= 68 ? 'strong' : score >= 45 - patience ? 'steady' : score >= 30 - patience ? 'concerned' : 'crisis';
  const notes = [];
  if (verdict === 'strong' && c.treasury > 0) {
    const bonus = Math.round(clamp(profit * 0.01, 25000, 2_000_000));
    if (c.treasury >= bonus) {
      c.treasury -= bonus;
      ctx.earn(bonus, `Chairman's bonus — ${c.name}`, { wage: true });
      notes.push(`The board voted you a ${money(bonus)} chairman's bonus.`);
    }
  }
  const last = b.meetings.at(-1);
  const president = c.executives?.president;
  if (president && (verdict === 'crisis' || (verdict === 'concerned' && last?.verdict === 'concerned'))) {
    const old = president.name;
    delete c.executives.president;
    notes.push(`The board replaced Group President ${old} — hire a successor.`);
  }
  if (b.seats.length < groupBoardSize(state)) notes.push(`${groupBoardSize(state) - b.seats.length} seat${groupBoardSize(state) - b.seats.length === 1 ? '' : 's'} open.`);
  const rec = { age: state.character.age, score, verdict, notes };
  b.meetings = [...b.meetings.slice(-4), rec];
  const v = VERDICTS[verdict];
  ctx.log(`${c.name} board meeting: ${v.icon} ${v.label.toLowerCase()} (score ${score}).${notes.length ? ` ${notes.join(' ')}` : ''}`, '🪑', verdict === 'crisis' ? 'bad' : verdict === 'concerned' ? 'warn' : 'finance');
  lines.push(`board: ${v.label.toLowerCase()}`);
  return lines;
}
