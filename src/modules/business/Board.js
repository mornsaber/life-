/**
 * Boards of directors. Corporations, companies with outside investors, public
 * companies, big chains (10+ locations) and holding companies have one; any
 * other business can form an advisory board.
 *
 *   seats      you (the owner's seat), investor directors in proportion to
 *              their stake, the hired CEO, and independent directors you
 *              appoint — each with an expertise that helps every year
 *   chair      you, while you control a majority; otherwise an independent
 *   meeting    once a year the board reviews results (growth, margins,
 *              quality) and the chief executive: a bonus for a strong year, a
 *              warning for a weak one — and a board you don't control can
 *              replace the CEO, even when the CEO is you
 *
 * biz.board = { seats: [{ id, name, kind, expertise?, skill, fee, since }], advisory, meetings: [{ age, score, verdict, notes }] }
 */
import { clamp } from '../../core/Random.js';
import { randomName } from '../../core/State.js';
import { charge } from './TaxBook.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;

export const EXPERTISE = {
  operator: { label: 'Industry veteran', icon: '🏭', desc: 'Raises quality a little every year.' },
  finance: { label: 'Finance expert', icon: '📊', desc: 'Cost discipline: a little more profit every year.' },
  marketing: { label: 'Marketing executive', icon: '📣', desc: 'Raises reputation a little every year.' },
  people: { label: 'People & culture leader', icon: '🧑‍🤝‍🧑', desc: 'Raises morale a little every year.' },
  governance: { label: 'Governance & legal expert', icon: '⚖️', desc: 'A steadier board: more patience in a bad year.' },
};
export const VERDICTS = {
  strong: { label: 'Strong year', icon: '🌟' },
  steady: { label: 'On track', icon: '👍' },
  concerned: { label: 'Concerned', icon: '😟' },
  crisis: { label: 'Vote of no confidence', icon: '🚨' },
};

/** Does this business need a board? */
export const boardRequired = (biz) => biz.entity === 'ccorp' || Boolean(biz.public) || (1 - biz.ownerPct) >= 0.1 || (biz.scale ?? 1) >= 10;
export const boardSize = (biz) => (biz.public ? 9 : (biz.lastYear?.revenue ?? 0) >= 50_000_000 ? 7 : boardRequired(biz) ? 5 : 3);
/** Your voting control: your stake (family seats aside). */
export const control = (biz) => biz.ownerPct;
export const directorFee = (biz) => Math.round(clamp((biz.lastYear?.revenue ?? 0) * 0.0015, 15000, 250000) / 1000) * 1000;
export const youChair = (biz) => control(biz) >= 0.5;

function person(rng) {
  const g = rng.pick(['male', 'female']);
  const n = randomName(rng, g);
  return `${n.firstName} ${n.lastName}`;
}

/** Make the board's seats match the company: you, the investors, the CEO, then independents. */
export function syncBoard(state, rng, biz, { ceoName = null } = {}) {
  if (!biz.board && !boardRequired(biz)) return null;
  const b = (biz.board ??= { seats: [], meetings: [], advisory: !boardRequired(biz) });
  b.advisory = !boardRequired(biz) && b.advisory !== false;
  const size = boardSize(biz);
  const you = `${state.character.firstName} ${state.character.lastName}`;
  const keep = (kind) => b.seats.filter((s) => s.kind === kind);
  const seats = [];
  seats.push({ ...(keep('owner')[0] ?? { id: rng.id('seat_'), since: state.character.age }), kind: 'owner', name: you, skill: 0, fee: 0 });
  // Investors get seats in proportion to what they own.
  const outside = Math.max(0, 1 - biz.ownerPct);
  const investorSeats = outside >= 0.1 ? clamp(Math.round((size - 1) * outside), 1, size - 2) : 0;
  const inv = keep('investor');
  for (let i = 0; i < investorSeats; i++) seats.push(inv[i] ?? { id: rng.id('seat_'), kind: 'investor', name: person(rng), skill: rng.int(50, 85), fee: 0, since: state.character.age, partner: biz.investors?.at(-1)?.partner ?? biz.investors?.at(-1)?.round ?? 'Investors' });
  if (ceoName) seats.push({ ...(keep('ceo')[0] ?? { id: rng.id('seat_'), since: state.character.age }), kind: 'ceo', name: ceoName, skill: 0, fee: 0 });
  // Independents fill the rest. Public companies must have them; elsewhere the seats wait for you to appoint someone.
  const room = size - seats.length;
  const ind = keep('independent').slice(0, room);
  seats.push(...ind);
  if (biz.public) for (let i = ind.length; i < room; i++) seats.push(newDirector(rng, biz, rng.pick(Object.keys(EXPERTISE)), state.character.age));
  b.seats = seats;
  b.size = size;
  return b;
}

export function newDirector(rng, biz, expertise, age) {
  return { id: rng.id('seat_'), kind: 'independent', name: person(rng), expertise, skill: rng.int(50, 92), fee: directorFee(biz), since: age };
}

export const vacantSeats = (biz) => (biz.board ? Math.max(0, (biz.board.size ?? boardSize(biz)) - biz.board.seats.length) : 0);

export function appointDirector(ctx, biz, expertise) {
  const { state, rng } = ctx;
  if (!EXPERTISE[expertise]) return;
  if (!biz.board) biz.board = { seats: [], meetings: [], advisory: true };
  syncBoard(state, rng, biz);
  if (!vacantSeats(biz)) return ctx.toast('No open seat on the board.', 'warn');
  if (!youChair(biz) && biz.public) return ctx.toast('The nominating committee picks directors — you don\'t control the board.', 'warn');
  const d = newDirector(rng, biz, expertise, state.character.age);
  biz.board.seats.push(d);
  ctx.log(`${biz.name} added ${d.name} (${EXPERTISE[expertise].label.toLowerCase()}, skill ${d.skill}) to its ${biz.board.advisory ? 'advisory board' : 'board of directors'} at ${money(d.fee)} a year.`, EXPERTISE[expertise].icon, 'good');
}

export function removeDirector(ctx, biz, seatId) {
  const seat = biz.board?.seats.find((s) => s.id === seatId);
  if (!seat || seat.kind !== 'independent') return;
  if (!youChair(biz)) return ctx.toast('You need a majority to remove a director.', 'warn');
  biz.board.seats = biz.board.seats.filter((s) => s !== seat);
  ctx.log(`${seat.name} left ${biz.name}'s board.`, '🚪');
}

/** How the year went, 0–100: growth, margin against the company's own record, quality. */
export function boardScore(biz) {
  const books = biz.books ?? [];
  const now = books.at(-1);
  const prev = books.at(-2);
  if (!now) return 55;
  const growth = prev?.revenue ? (now.revenue - prev.revenue) / Math.max(1, prev.revenue) : 0.03;
  const margin = now.revenue ? now.netIncome / now.revenue : 0;
  const pastMargin = books.length > 1 ? books.slice(0, -1).reduce((s, x) => s + (x.revenue ? x.netIncome / x.revenue : 0), 0) / (books.length - 1) : 0.08;
  return Math.round(clamp(55 + growth * 120 + (margin - pastMargin) * 150 + (margin < 0 ? -15 : 0) + ((biz.quality ?? 60) - 60) / 3, 0, 100));
}

/**
 * The annual meeting. `onCeo` hooks: { you: bool, bonus(amount), removeYou(), replaceCeo() }.
 * Returns the meeting record.
 */
export function boardMeeting(ctx, biz, hooks) {
  const { state, rng } = ctx;
  const b = biz.board;
  if (!b) return null;
  const revenue = biz.lastYear?.revenue ?? 0;
  // Directors' expertise, every year.
  for (const s of b.seats.filter((x) => x.kind === 'independent')) {
    const k = s.skill / 70;
    if (s.expertise === 'operator') biz.quality = Math.round(clamp(biz.quality + k, 0, 100));
    if (s.expertise === 'marketing') biz.reputation = Math.round(clamp(biz.reputation + k, 0, 95));
    if (s.expertise === 'people') biz.staff.morale = Math.round(clamp(biz.staff.morale + k * 1.5, 0, 100));
    if (s.expertise === 'finance') biz.cash += Math.round(revenue * 0.002 * k);
  }
  const fees = b.seats.reduce((n, s) => n + (s.fee ?? 0), 0);
  if (fees) charge(biz, fees);
  const score = boardScore(biz);
  const patience = b.seats.some((s) => s.expertise === 'governance') ? 8 : 0;
  const verdict = score >= 68 ? 'strong' : score >= 45 - patience ? 'steady' : score >= 30 - patience ? 'concerned' : 'crisis';
  const notes = [];
  const last = b.meetings.at(-1);
  if (hooks.you) {
    if (verdict === 'strong') notes.push(hooks.bonus());
    if ((verdict === 'crisis' || (verdict === 'concerned' && last?.verdict === 'concerned')) && !youChair(biz)) notes.push(hooks.removeYou());
    else if (verdict === 'crisis') notes.push('Directors pressed you hard, but you control the votes.');
  } else if (hooks.hasCeo && (verdict === 'crisis' || (verdict === 'concerned' && last?.verdict === 'concerned') || (verdict === 'concerned' && rng.chance(0.25)))) notes.push(hooks.replaceCeo());
  const rec = { age: state.character.age, score, verdict, notes: notes.filter(Boolean) };
  b.meetings = [...b.meetings.slice(-4), rec];
  const v = VERDICTS[verdict];
  ctx.log(`${biz.name} ${b.advisory ? 'advisory board' : 'board'} meeting: ${v.icon} ${v.label.toLowerCase()} (score ${score}).${rec.notes.length ? ` ${rec.notes.join(' ')}` : ''}${fees ? ` Director fees: ${money(fees)}.` : ''}`, '🪑', verdict === 'crisis' ? 'bad' : verdict === 'concerned' ? 'warn' : 'finance');
  return rec;
}
