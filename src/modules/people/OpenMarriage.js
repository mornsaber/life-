/**
 * Open marriages (and open relationships), and what the law of the day makes of infidelity.
 *
 *   Asking       you can ask your partner to open things up. Whether they agree depends on who
 *                they are (an adventurous partner more, a homebody or a nurturer less), on how
 *                close you are, on how much spark is left, and on the times: rare before the
 *                1960s, unusual before the 1970s. A refusal costs you; so can a yes.
 *   While open   seeing other people isn't cheating — no secret, nothing to find out. But
 *                jealousy happens, your partner may meet someone of their own, and either of
 *                you can close it again.
 *   Their affair in a closed relationship, a partner with little spark left may stray: you find
 *                out, and forgive, confront or leave.
 *   The law      adultery is a crime in some countries until a date (statute: adultery), and
 *                before no-fault divorce (statute: noFaultDivorce) a divorce needs grounds:
 *                the one at fault comes off worse in the settlement. Both are laws a
 *                legislature in your world can change (politics/StatuteBook.js).
 *
 * state.people.open = { partnerId, since, theirs: name|null, jealousy }
 * state.people.fault = { who: 'you'|'them', age }   who strayed (for a fault divorce)
 */
import { Random, clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, randomName } from '../../core/State.js';
import { partnerOf, ageOf, byId, clampRel } from './People.js';
import { yearNow } from '../world/Eras.js';
import { statuteIn } from '../politics/StatuteBook.js';
import { priceLevel } from '../world/Countries.js';
import { traitOf } from './Bonds.js';

const ROMANTIC = ['partner', 'fiance', 'spouse'];
const local = (state, n) => Math.round(n * priceLevel(state));
const side = (state) => new Random(((state.world?.seed ?? 2) * 48271 + state.character.age * 613 + 0x0be7) >>> 0);

/** Whether things are open with this partner. */
export const openWith = (state, p) => Boolean(p && state.people?.open && state.people.open.partnerId === p.id);
/** Who strayed, for a divorce on grounds. */
export function markFault(state, who) { if (state.people) state.people.fault = { who, age: state.character.age }; }

/** How the times see it: the odds of a partner even entertaining the idea. */
export function eraOpenness(y) { return y < 1920 ? 0.02 : y < 1960 ? 0.05 : y < 1975 ? 0.15 : y < 2010 ? 0.25 : 0.32; }
const word = (p) => (p.relation === 'spouse' ? 'marriage' : 'relationship');

export function openEligibility(state) {
  const p = partnerOf(state);
  if (!p || !ROMANTIC.includes(p.relation)) return { ok: false, reason: 'You need a partner' };
  if (state.character.age < 18 || ageOf(state, p) < 18) return { ok: false, reason: '18+' };
  if (openWith(state, p)) return { ok: false, reason: 'Already open' };
  if (yearlyCount(state, `open.ask.${p.id}`)) return { ok: false, reason: 'Not again this year' };
  return { ok: true, p };
}

/** The odds your partner says yes. */
export function acceptOdds(state, p) {
  const trait = traitOf(p);
  // Who they are scales what the times allow: an adventurous partner in 1900 is still unlikely.
  let m = 1;
  m += trait === 'adventurous' ? 0.6 : ['homebody', 'nurturing'].includes(trait) ? -0.4 : 0;
  m += (p.spark ?? 60) < 40 ? 0.3 : 0;
  m += (p.relationship ?? 60) >= 70 ? 0.3 : (p.relationship ?? 60) < 40 ? -0.2 : 0;
  if (state.people?.affair) m -= 0.5;
  return clamp(eraOpenness(yearNow(state)) * Math.max(0.1, m), 0.005, 0.75);
}

function propose(ctx) {
  const { state } = ctx;
  const e = openEligibility(state);
  if (!e.ok) return ctx.toast(e.reason, 'warn');
  const p = e.p;
  bumpYearly(state, `open.ask.${p.id}`);
  const rng = side(state);
  if (rng.chance(acceptOdds(state, p))) {
    state.people.open = { partnerId: p.id, since: state.character.age, theirs: null, jealousy: 0 };
    // An affair you were already having is no longer a secret.
    state.people.affair = null;
    p.spark = clamp((p.spark ?? 60) + 4, 0, 100);
    ctx.stat('happiness', 4);
    const law = statuteIn(state, 'adultery') ? ' Adultery is still a crime here: you agreed to keep it very quiet.' : '';
    return ctx.log(`You and ${p.firstName} talked late into the night, and agreed to open the ${word(p)}. New rules: honesty, and nobody you both know.${law}`, '🔓', 'good');
  }
  p.relationship = clampRel(p.relationship - 8);
  p.spark = clamp((p.spark ?? 60) - 6, 0, 100);
  ctx.stat('stress', 4);
  if (rng.chance(0.3)) {
    p.suspicious = true;
    return ctx.log(`${p.firstName} said no — and has been checking your phone ever since.`, '🔒', 'bad');
  }
  return ctx.log(`${p.firstName} said no, firmly. "Is there someone else?" It took a while to smooth over.`, '🔒', 'warn');
}

function close(ctx) {
  const { state } = ctx;
  const o = state.people?.open;
  const p = o && byId(state, o.partnerId);
  if (!o || !p) return ctx.toast('Nothing to close', 'warn');
  state.people.open = null;
  if (o.theirs) {
    p.relationship = clampRel(p.relationship - 6);
    return ctx.log(`You asked ${p.firstName} to close the ${word(p)} again. They agreed, and said goodbye to ${o.theirs} — not happily.`, '🔒', 'warn');
  }
  p.spark = clamp((p.spark ?? 60) + 3, 0, 100);
  return ctx.log(`You and ${p.firstName} closed the ${word(p)} again. Just the two of you.`, '🔒', 'good');
}

/** The year with an open relationship: jealousy, their own someone. */
function openYear(ctx) {
  const { state } = ctx;
  const o = state.people?.open;
  if (!o) return;
  const p = byId(state, o.partnerId);
  if (!p || !p.alive || !ROMANTIC.includes(p.relation)) { state.people.open = null; return; }
  if (state.prompts.some((x) => x.type?.startsWith('openMarriage.'))) return;
  const rng = side(state);
  if (!o.theirs && rng.chance(0.25)) {
    const n = randomName(rng, rng.pick(['male', 'female']));
    o.theirs = n.firstName;
    return void ctx.log(`${p.firstName} has started seeing someone: ${n.firstName}. You knew this was the deal.`, '🔓', 'info');
  }
  if (rng.chance(0.22)) {
    const theirs = o.theirs && rng.chance(0.5);
    ctx.prompt({
      type: 'openMarriage.jealousy', icon: '😣', title: 'Jealousy',
      text: theirs ? `${p.firstName} came home late from ${o.theirs}'s again, glowing. It shouldn't bother you. It does.` : `${p.firstName} saw a message from someone you've been seeing. "I know the rules. It still hurts."`,
      data: { personId: p.id, theirs },
      options: [
        { id: 'talk', label: '💬 Talk it through honestly' },
        { id: 'close', label: '🔒 Close things again' },
        { id: 'shrug', label: '🤷 Carry on as agreed' },
      ],
    });
    return;
  }
  // Sometimes their someone becomes more than that.
  if (o.theirs && rng.chance(0.06)) {
    ctx.prompt({
      type: 'openMarriage.fallen', icon: '💘', title: 'More Than the Deal',
      text: `${p.firstName} sits you down. "I think I'm falling for ${o.theirs}."`,
      data: { personId: p.id },
      options: [{ id: 'fight', label: '💞 Fight for us' }, { id: 'release', label: '🕊️ Let them go' }],
    });
  }
}

/** Their affair, in a closed relationship with little spark left. */
function theirAffair(ctx) {
  const { state } = ctx;
  const p = partnerOf(state);
  if (!p || !ROMANTIC.includes(p.relation) || openWith(state, p) || state.character.age < 18 || ageOf(state, p) < 18) return;
  if (state.prompts.some((x) => x.type === 'openMarriage.theirAffair')) return;
  const rng = side(state);
  if (!rng.chance((p.spark ?? 60) < 30 ? 0.05 : 0.008)) return;
  markFault(state, 'them');
  ctx.stat('happiness', -12);
  ctx.prompt({
    type: 'openMarriage.theirAffair', icon: '💔', title: 'You Found Out',
    text: `A hotel receipt in ${p.firstName}'s coat. They've been seeing someone for months.${statuteIn(state, 'adultery') ? ' Adultery is a crime here: you could go to the police.' : ''}`,
    data: { personId: p.id },
    options: [
      { id: 'forgive', label: '🙏 Forgive them' },
      { id: 'confront', label: '🗣️ Have it out' },
      { id: 'leave', label: '🚪 Leave' },
      ...(statuteIn(state, 'adultery') ? [{ id: 'police', label: '👮 Lay a complaint', tone: 'danger', hint: 'A criminal case against them' }] : []),
    ],
  });
}

export const OpenMarriageResolvers = {
  jealousy(ctx, data, optionId) {
    const { state } = ctx;
    const p = byId(state, data.personId);
    if (!p) return;
    if (optionId === 'close') return close(ctx);
    if (optionId === 'talk') {
      p.relationship = clampRel(p.relationship + 4);
      return ctx.log(`A long, honest talk with ${p.firstName}. You set some new rules.`, '💬', 'good');
    }
    p.relationship = clampRel(p.relationship - 5);
    ctx.stat('stress', 4);
    return ctx.log('You carried on as agreed. The silence at dinner said otherwise.', '🤷', 'warn');
  },
  fallen(ctx, data, optionId) {
    const { state, rng } = ctx;
    const p = byId(state, data.personId);
    if (!p) return;
    if (optionId === 'fight' && rng.chance(0.5)) {
      state.people.open = null;
      p.relationship = clampRel(p.relationship + 5);
      return ctx.log(`You fought for it, and ${p.firstName} chose you. The ${word(p)} is closed again.`, '💞', 'good');
    }
    state.people.open = null;
    ctx.stat('happiness', -12);
    ctx.log(optionId === 'fight' ? `You fought for it. ${p.firstName} chose someone else.` : `You let ${p.firstName} go.`, '🕊️', 'bad');
    ctx.emit('bonds:leave', { personId: p.id });
    return undefined;
  },
  theirAffair(ctx, data, optionId) {
    const { state } = ctx;
    const p = byId(state, data.personId);
    if (!p) return;
    if (optionId === 'forgive') {
      p.relationship = clampRel(p.relationship - 10);
      p.spark = clamp((p.spark ?? 50) + 5, 0, 100);
      return ctx.log(`You forgave ${p.firstName}. Some days you even mean it.`, '🙏', 'info');
    }
    if (optionId === 'confront') {
      p.relationship = clampRel(p.relationship - 20);
      ctx.stat('stress', 6);
      return ctx.log(`You had it out with ${p.firstName}: every lie, every late night. They swore it was over.`, '🗣️', 'warn');
    }
    if (optionId === 'police') {
      p.relationship = clampRel(p.relationship - 40);
      ctx.spend(local(state, 1500), 'Lawyer for the adultery complaint', { allowDebt: true });
      ctx.log(`You laid a complaint. ${p.firstName} was charged with adultery and fined; the whole town knows now.`, '👮', 'warn');
      ctx.emit('bonds:leave', { personId: p.id });
      return undefined;
    }
    ctx.log(`You told ${p.firstName} it was over.`, '🚪', 'bad');
    ctx.emit('bonds:leave', { personId: p.id });
    return undefined;
  },
};

export const OpenMarriageModule = {
  id: 'openMarriage',
  order: 22.6,
  onAgeUp(ctx) {
    if (!ctx.state.people || !ctx.state.character.alive) return;
    openYear(ctx);
    theirAffair(ctx);
  },
  actions: { propose, close },
  resolvers: OpenMarriageResolvers,
};
