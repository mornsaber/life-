/**
 * Conversations: talking to someone properly, about something.
 *
 *   Topics      depend on who they are and how old you both are: a parent's stories, asking
 *               them for money, career advice, coming out; with a partner, the future, kids,
 *               money worries, feeling distant; with your child, school, first love, and their
 *               own coming out; with a sibling, childhood and old rivalries; with a friend,
 *               gossip, a favour, a secret; with any adult, the politics of the day.
 *   Replies     two or three ways to answer, and what you say matters. Their personality —
 *               a second side to them (warm, blunt, anxious, proud, playful) — colours how
 *               they speak and how they take it.
 *   Memory      a promise ("I'll visit more", "I'll pay you back") comes due a year later:
 *               keep it or break it. A grudge sours everything until you apologise. They bring
 *               up the moments you shared.
 *   Distance    someone far away before the telephone gets a letter; later a call; later
 *               still a video call.
 *
 * A conversation uses one of the year's three times with that person (Bonds.js).
 * person.temperament, person.grudge = { about, age }, state.people.promises = [{ personId, what, made, cost }]
 */
import { Random, clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { ageOf, byId, clampRel, living } from './People.js';
import { INTERACTIONS_PER_YEAR, traitOf, TRAITS, isRomantic } from './Bonds.js';
import { livesAbroad } from './FamilyAbroad.js';
import { yearNow } from '../world/Eras.js';
import { priceLevel } from '../world/Countries.js';

const local = (state, n) => Math.round(n * priceLevel(state));
const side = (state, p, salt) => new Random(((state.world?.seed ?? 7) * 9973 + state.character.age * 211 + [...String(p.id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, salt)) >>> 0);

/** A second side to everyone, stable from who they are. */
export const TEMPERAMENTS = {
  warm: { icon: '🤗', open: (n) => `${n} takes your hand.`, hears: 1.1 },
  blunt: { icon: '🗿', open: (n) => `${n} doesn't do small talk: "Out with it."`, hears: 0.9 },
  anxious: { icon: '😟', open: (n) => `${n} has clearly been worrying about this too.`, hears: 1 },
  proud: { icon: '🦚', open: (n) => `${n} listens, chin up.`, hears: 0.85 },
  playful: { icon: '😜', open: (n) => `${n} grins: "This sounds serious."`, hears: 1.05 },
};
export function temperamentOf(p) {
  if (p.temperament && TEMPERAMENTS[p.temperament]) return p.temperament;
  const keys = Object.keys(TEMPERAMENTS);
  let h = 7;
  for (const ch of String(p.id ?? p.firstName)) h = (h * 131 + ch.charCodeAt(0)) >>> 0;
  return keys[h % keys.length];
}
/** How you reach them: in person, by letter, on the telephone, on a video call. */
export function howYouTalk(state, p) {
  const y = yearNow(state);
  const far = livesAbroad(state, p) || (p.relation === 'friend' && p.movedAway);
  if (!far) return { verb: 'sat down with', icon: '💬' };
  return y < 1920 ? { verb: 'wrote a long letter to', icon: '✉️' } : y < 2008 ? { verb: 'telephoned', icon: '☎️' } : { verb: 'video-called', icon: '📱' };
}
const parent = (p) => ['mother', 'father', 'guardian'].includes(p.relation);
const adultsBoth = (state, p) => state.character.age >= 18 && ageOf(state, p) >= 18;
/** The argument of the day, for the politics topic. */
function hotTopic(y) {
  return y < 1832 ? 'reform of Parliament' : y < 1865 ? 'slavery' : y < 1920 ? 'votes for women' : y < 1939 ? 'the Depression and what\'s happening in Europe' : y < 1946 ? 'the war' : y < 1960 ? 'the Bomb and the Communists' : y < 1975 ? 'civil rights and the war in Vietnam' : y < 1990 ? 'the unions, taxes and the Cold War' : y < 2008 ? 'the war in Iraq' : y < 2020 ? 'the crash and who should pay for it' : 'immigration, climate and the cost of living';
}

/**
 * Topics. who(state, p): whether it's open; opener(state, p): what they say (the temperament's
 * opening is added); replies: [{ id, label, hint, go(ctx, p, rng) → { delta, text, promise?, grudge?, memory? } }].
 */
export const TOPICS = {
  theirStory: { label: '📖 "What were you like at my age?"', who: (s, p) => parent(p) && s.character.age >= 10,
    opener: (s, p) => `${p.firstName} laughs and starts on a story you've never heard: the year ${yearNow(s) - s.character.age} and ${p.relation === 'mother' ? 'a dance hall, a boy, and a bicycle' : 'a borrowed car, a girl, and a very angry farmer'}.`,
    replies: [
      { id: 'listen', label: '👂 Listen to all of it', go: (c, p) => ({ delta: 6, text: `You listened to ${p.firstName}'s stories until late. You'd never really known them before.`, memory: true }) },
      { id: 'more', label: '❓ Ask what they regret', go: (c, p, r) => (r.chance(0.6) ? { delta: 9, text: `${p.firstName} told you what they regret most. Neither of you will forget that conversation.`, memory: true } : { delta: -2, text: `${p.firstName} changed the subject. "Some things you keep to yourself."` }) },
    ] },
  askMoney: { label: '💵 Ask for money', who: (s, p) => parent(p) && s.character.age >= 16 && ageOf(s, p) >= 35,
    opener: (s, p) => `${p.firstName} puts down the newspaper. "How much, and what for?"`,
    replies: [
      { id: 'straight', label: '💬 Ask straight out', go: (c, p, r) => giveMoney(c, p, r, 0.35) },
      { id: 'explain', label: '📋 Explain your plan properly', go: (c, p, r) => giveMoney(c, p, r, 0.35 + c.state.stats.smarts / 250, true) },
      { id: 'never', label: '🙅 Never mind', go: (c, p) => ({ delta: 1, text: `You couldn't bring yourself to ask ${p.firstName}.` }) },
    ] },
  career: { label: '🧭 Ask about your future', who: (s, p) => (parent(p) || (p.relation === 'friend' && ageOf(s, p) >= s.character.age + 10)) && s.character.age >= 14,
    opener: (s, p) => `${p.firstName} has opinions. "${s.career.job ? 'Are you happy there? Really?' : 'You need a plan. A real one.'}"`,
    replies: [
      { id: 'take', label: '✅ Take their advice to heart', go: (c, p) => { c.stat('smarts', 1); c.stat('stress', -3); return { delta: 5, text: `${p.firstName}'s advice stayed with you.` }; } },
      { id: 'argue', label: '🗣️ Tell them they don\'t understand', go: (c, p, r) => (r.chance(0.4) ? { delta: 2, text: `You argued, and ${p.firstName} came round to your way of seeing it.` } : { delta: -6, text: `It turned into a row. ${p.firstName} thinks you're throwing your life away.` }) },
    ] },
  comingOut: { label: '🏳️‍🌈 Come out to them', who: (s, p) => (parent(p) || p.relation === 'sibling' || p.relation === 'friend') && s.character.age >= 14 && Boolean(s.people?.orientation) && s.people.orientation !== (s.character.gender === 'male' ? 'women' : 'men') && !(s.people.outTo ?? []).includes(p.id),
    opener: (s, p) => `You've rehearsed it a hundred times. ${p.firstName} can tell something's coming.`,
    replies: [
      { id: 'tell', label: '💬 Tell them who you are', go: (c, p, r) => comeOut(c, p, r) },
      { id: 'notYet', label: '🤐 Not yet', go: (c, p) => { c.stat('stress', 3); return { delta: 0, text: `You talked about something else. Not yet.` }; } },
    ] },
  care: { label: '🏡 Talk about getting older', who: (s, p) => parent(p) && ageOf(s, p) >= 70 && s.character.age >= 25,
    opener: (s, p) => `${p.firstName} has been finding the stairs harder. "I don't want to be a burden."`,
    replies: [
      { id: 'promise', label: '🤝 "I\'ll look after you"', go: (c, p) => ({ delta: 10, text: `You promised ${p.firstName} you'd be there.`, promise: 'to be there as they got older', cost: 4000, memory: true }) },
      { id: 'home', label: '🏥 Talk about a good care home', go: (c, p, r) => (r.chance(0.5) ? { delta: 2, text: `${p.firstName} agreed, eventually, that it might be for the best.` } : { delta: -8, text: `${p.firstName} heard "put away". It hurt them.`, grudge: 'the care home talk' }) },
    ] },
  future: { label: '💍 Talk about the future', who: (s, p) => isRomantic(p) && adultsBoth(s, p),
    opener: (s, p) => (p.relation === 'spouse' ? `${p.firstName} asks where you see the two of you in ten years.` : `${p.firstName} has been dropping hints: "So… where is this going?"`),
    replies: [
      { id: 'all', label: '❤️ "With you. Always."', go: (c, p) => { p.spark = clamp((p.spark ?? 60) + 8, 0, 100); return { delta: 6, text: `You told ${p.firstName} you see them in every version of the future.`, memory: true }; } },
      { id: 'kids', label: '👶 Bring up children', go: (c, p, r) => wantKids(c, p, r) },
      { id: 'dodge', label: '🙃 Make a joke and dodge it', go: (c, p) => { p.spark = clamp((p.spark ?? 60) - 4, 0, 100); return { delta: -3, text: `You dodged it. ${p.firstName} noticed.` }; } },
    ] },
  money: { label: '🧾 Talk about money worries', who: (s, p) => isRomantic(p) && adultsBoth(s, p) && (p.livingTogether || p.relation === 'spouse'),
    opener: (s, p) => `The bills are on the kitchen table between you and ${p.firstName}.`,
    replies: [
      { id: 'plan', label: '📊 Make a budget together', go: (c) => { c.stat('stress', -6); return { delta: 4, text: 'You made a budget together. It felt like being on the same team.' }; } },
      { id: 'blame', label: '😤 Point out who spends what', go: (c, p, r) => (r.chance(0.3) ? { delta: 0, text: `${p.firstName} admitted it, grudgingly.` } : { delta: -8, text: `It became a fight about everything but money.`, grudge: 'the money row' }) },
    ] },
  distant: { label: '🌫️ Say you\'ve felt distant', who: (s, p) => isRomantic(p) && adultsBoth(s, p) && (p.spark ?? 60) < 55,
    opener: (s, p) => `${p.firstName} goes very still.`,
    replies: [
      { id: 'honest', label: '💬 Say all of it, gently', go: (c, p, r) => { const ok = r.chance(0.65); p.spark = clamp((p.spark ?? 50) + (ok ? 12 : -4), 0, 100); return ok ? { delta: 6, text: `It was hard, and it helped. You and ${p.firstName} are trying again.`, memory: true } : { delta: -4, text: `${p.firstName} heard it as an accusation.` }; } },
      { id: 'date', label: '🕯️ Suggest a night away together', go: (c, p) => { c.spend(local(c.state, 400), 'A night away', { allowDebt: true }); p.spark = clamp((p.spark ?? 50) + 9, 0, 100); return { delta: 4, text: `A night away with ${p.firstName}. Something came back.` }; } },
    ] },
  school: { label: '🎒 "How\'s school?"', who: (s, p) => p.relation === 'child' && ageOf(s, p) >= 5 && ageOf(s, p) <= 17,
    opener: (s, p) => `${p.firstName} shrugs. "Fine."`,
    replies: [
      { id: 'really', label: '🫶 Ask again, and really listen', go: (c, p, r) => (r.chance(0.6) ? { delta: 7, text: `It came out in a rush: a friend who dropped them, a teacher who's unfair. You listened to all of it.`, memory: true } : { delta: 2, text: `"Fine," said ${p.firstName} again. But they stayed in the room.` }) },
      { id: 'grades', label: '📈 Ask about their grades', go: (c, p, r) => (r.chance(0.5) ? { delta: 1, text: `${p.firstName} promised to work harder.` } : { delta: -5, text: `${p.firstName} slammed their bedroom door.` }) },
    ] },
  firstLove: { label: '💌 Their first love', who: (s, p) => p.relation === 'child' && ageOf(s, p) >= 13 && ageOf(s, p) <= 19,
    opener: (s, p) => `${p.firstName} is texting someone and smiling.`,
    replies: [
      { id: 'warm', label: '🤗 Be glad for them', go: (c, p) => ({ delta: 6, text: `${p.firstName} told you all about them. You remembered being that age.` }) },
      { id: 'strict', label: '🚫 Lay down some rules', go: (c, p, r) => (r.chance(0.4) ? { delta: 0, text: `${p.firstName} rolled their eyes but agreed to the rules.` } : { delta: -7, text: `${p.firstName} said you don't trust them.`, grudge: 'the rules' }) },
    ] },
  childComesOut: { label: '🏳️‍🌈 A talk they started', event: true, who: (s, p) => p.relation === 'child' && ageOf(s, p) >= 14 && ageOf(s, p) <= 25 && p.queer === true && !p.outToYou,
    opener: (s, p) => `${p.firstName} sits down, hands shaking. "I need to tell you something. I'm gay."`,
    replies: [
      { id: 'hug', label: '🤗 "I love you. Nothing changes that."', go: (c, p) => { p.outToYou = true; return { delta: 20, text: `You held ${p.firstName} for a long time. They'll remember what you said for the rest of their life.`, memory: true }; } },
      { id: 'time', label: '😶 "I need some time"', go: (c, p) => { p.outToYou = true; return { delta: -10, text: `You needed time. ${p.firstName} went to their room and didn't come down.`, grudge: 'the day they came out' }; } },
    ] },
  childhood: { label: '🧸 Remember childhood', who: (s, p) => p.relation === 'sibling' && s.character.age >= 12,
    opener: (s, p) => `${p.firstName} brings up the summer the two of you ${['built the treehouse', 'ran away for an afternoon', 'broke the kitchen window', 'stayed up all night at the coast'][ageOf(s, p) % 4]}.`,
    replies: [
      { id: 'laugh', label: '😂 Laugh until you cry', go: (c, p) => ({ delta: 7, text: `You and ${p.firstName} laughed until you cried.`, memory: true }) },
      { id: 'old', label: '😒 Bring up who got the blame', go: (c, p, r) => (r.chance(0.5) ? { delta: 3, text: `It was a joke between you now.` } : { delta: -6, text: `An old argument, thirty years on, as fresh as ever.`, grudge: 'old rivalries' }) },
    ] },
  borrow: { label: '🤲 They need a loan', who: (s, p) => (p.relation === 'sibling' || p.relation === 'friend') && adultsBoth(s, p) && (s.finances?.cash ?? 0) > local(s, 5000),
    opener: (s, p) => `${p.firstName} is embarrassed to ask: could you lend them ${'$'}${local(s, 3000).toLocaleString()} until things pick up?`,
    replies: [
      { id: 'lend', label: '💵 Lend it', go: (c, p, r) => { c.spend(local(c.state, 3000), `Loan to ${p.firstName}`, { allowDebt: true }); if (r.chance(0.55)) c.state.people.repay = [...(c.state.people.repay ?? []), { personId: p.id, amount: local(c.state, 3000), due: c.state.character.age + 2 }]; return { delta: 10, text: `You lent ${p.firstName} the money. They promised to pay it back.`, memory: true }; } },
      { id: 'refuse', label: '🙅 Say no, kindly', go: (c, p) => ({ delta: -5, text: `You said no. ${p.firstName} said they understood.` }) },
    ] },
  gossip: { label: '🗞️ Gossip', who: (s, p) => p.relation === 'friend' && s.character.age >= 12,
    opener: (s, p) => `${p.firstName} leans in: "You will not believe what I heard."`,
    replies: [
      { id: 'join', label: '😏 Tell them something better', go: (c, p, r) => (r.chance(0.8) ? { delta: 6, text: `An afternoon of gossip with ${p.firstName}. Wicked and wonderful.` } : { delta: -6, text: `What you said got back to the person you said it about.` }) },
      { id: 'stop', label: '🙊 "We shouldn\'t…"', go: (c, p) => ({ delta: 1, text: `You changed the subject. ${p.firstName} thinks you're a saint, or a bore.` }) },
    ] },
  favour: { label: '📦 They need a hand', who: (s, p) => p.relation === 'friend' && adultsBoth(s, p),
    opener: (s, p) => `${p.firstName} is moving house on Saturday and the van is booked.`,
    replies: [
      { id: 'yes', label: '💪 "I\'ll be there"', go: (c, p) => ({ delta: 5, text: `You said you'd help ${p.firstName} move.`, promise: 'to help them move', cost: 0 }) },
      { id: 'no', label: '😬 Make an excuse', go: (c, p) => ({ delta: -4, text: `You made an excuse. ${p.firstName} found someone else.` }) },
    ] },
  secret: { label: '🤫 Share a secret', who: (s, p) => (p.relation === 'friend' || p.relation === 'sibling') && s.character.age >= 12,
    opener: (s, p) => `You tell ${p.firstName} something you've never told anyone.`,
    replies: [
      { id: 'trust', label: '🤝 Trust them with it', go: (c, p, r) => (r.chance(0.85) ? { delta: 9, text: `${p.firstName} kept your secret, and told you one of theirs.`, memory: true } : { delta: -10, text: `Within a month, everyone knew. ${p.firstName} swore it wasn't them.`, grudge: 'the secret' }) },
    ] },
  politics: { label: '🗳️ The news', who: (s, p) => adultsBoth(s, p) && !p.child,
    opener: (s, p) => `${p.firstName} has strong views on ${hotTopic(yearNow(s))}.`,
    replies: [
      { id: 'agree', label: '👍 Agree with them', go: (c, p) => ({ delta: 3, text: `You and ${p.firstName} agreed about ${hotTopic(yearNow(c.state))}, mostly.` }) },
      { id: 'argue', label: '🗣️ Argue the other side', go: (c, p, r) => (r.chance(0.4) ? { delta: 4, text: `A proper argument with ${p.firstName}, and you both enjoyed it.` } : { delta: -7, text: `You and ${p.firstName} don't talk about politics any more.` }) },
      { id: 'change', label: '☕ Change the subject', go: (c, p) => ({ delta: 0, text: `You talked about the weather instead.` }) },
    ] },
};

function giveMoney(ctx, p, rng, odds, explained = false) {
  const { state } = ctx;
  const has = p.life?.netWorth ?? (p.income ?? 0) * 3;
  const amount = Math.min(Math.round(Math.max(0, has) * 0.05), local(state, explained ? 8000 : 4000));
  if (amount <= local(state, 100) || !rng.chance(clamp(odds + (p.relationship - 60) / 150, 0.05, 0.9))) return { delta: -3, text: `${p.firstName} said no. "When I was your age…"` };
  ctx.earn(amount, `From ${p.firstName}`);
  return { delta: 1, text: `${p.firstName} gave you $${amount.toLocaleString()}${explained ? ', impressed that you had a plan' : ''}.`, promise: 'to pay them back', cost: amount };
}
function wantKids(ctx, p, rng) {
  const theirs = p.wantsKids ?? rng.chance(0.7);
  p.wantsKids = theirs;
  if (theirs) { p.spark = clamp((p.spark ?? 60) + 5, 0, 100); return { delta: 6, text: `${p.firstName} lit up: they want children too.`, memory: true }; }
  p.spark = clamp((p.spark ?? 60) - 6, 0, 100);
  return { delta: -4, text: `${p.firstName} doesn't want children. A long silence.` };
}
/** How coming out goes depends on them, and very much on the times. */
function comeOut(ctx, p, rng) {
  const { state } = ctx;
  const y = yearNow(state);
  const era = y < 1960 ? 0.15 : y < 1990 ? 0.4 : y < 2010 ? 0.65 : 0.82;
  const t = temperamentOf(p);
  const odds = clamp(era * (t === 'warm' ? 1.25 : t === 'proud' ? 0.8 : 1) + (p.relationship - 60) / 200, 0.05, 0.97);
  (state.people.outTo ??= []).push(p.id);
  if (rng.chance(odds)) { ctx.stat('happiness', 8); ctx.stat('stress', -6); return { delta: 10, text: `${p.firstName} hugged you. "I know. I've always known. I love you."`, memory: true }; }
  ctx.stat('happiness', -10);
  return { delta: -15, text: y < 1970 ? `${p.firstName} said it was an illness, and that you must never tell anyone else.` : `${p.firstName} went quiet, then said they needed time.`, grudge: 'the day you came out' };
}

export function topicsFor(state, p) {
  return Object.entries(TOPICS).filter(([, t]) => !t.event && t.who(state, p)).map(([id, t]) => ({ id, ...t }));
}

/** Start a conversation: pick what to talk about. */
function start(ctx, personId) {
  const { state } = ctx;
  const p = byId(state, personId);
  if (!p?.alive) return ctx.toast('Not here', 'warn');
  if (yearlyCount(state, `bonds.${p.id}`) >= INTERACTIONS_PER_YEAR) return ctx.toast(`${INTERACTIONS_PER_YEAR} times a year`, 'warn');
  const topics = topicsFor(state, p);
  if (!topics.length) return ctx.toast('Nothing to talk about yet', 'warn');
  const rng = side(state, p, 0x7a1);
  const pick = rng.shuffle(topics).slice(0, 4);
  const how = howYouTalk(state, p);
  const fond = (p.memories ?? []).filter((m) => m.tone !== 'bad');
  const memo = fond.length && rng.chance(0.4) ? ` ${p.firstName} brings up something from years ago: "${fond.at(-1).text.replace(/\.$/, '')}." ` : ' ';
  const grudge = p.grudge ? ` There's still a coldness about ${p.grudge.about}.` : '';
  ctx.prompt({ type: 'conversations.topic', icon: how.icon, title: `Talking with ${p.firstName}`, text: `You ${how.verb} ${p.firstName}.${memo}${grudge}`.replace(/\s+/g, ' ').trim(), data: { personId: p.id },
    options: [...pick.map((t) => ({ id: t.id, label: t.label })), ...(p.grudge ? [{ id: 'clear', label: `🙏 Clear the air about ${p.grudge.about}` }] : []), { id: 'none', label: '👋 Just catch up' }] });
  return undefined;
}

export const ConversationsResolvers = {
  topic(ctx, data, optionId) {
    const { state } = ctx;
    const p = byId(state, data.personId);
    if (!p) return undefined;
    bumpYearly(state, `bonds.${p.id}`);
    if (optionId === 'none') { p.relationship = clampRel(p.relationship + 2); return ctx.log(`You caught up with ${p.firstName}. Nothing big; it was nice.`, '💬'); }
    if (optionId === 'clear') {
      const ok = side(state, p, 0xc1).chance(0.6);
      if (ok) { const about = p.grudge.about; p.grudge = null; p.relationship = clampRel(p.relationship + 8); return ctx.log(`You and ${p.firstName} finally talked about ${about}. It's behind you now.`, '🙏', 'good'); }
      return ctx.log(`You tried to clear the air with ${p.firstName}. Not yet.`, '🙏', 'warn');
    }
    const t = TOPICS[optionId];
    if (!t) return undefined;
    const tm = TEMPERAMENTS[temperamentOf(p)];
    ctx.prompt({ type: 'conversations.reply', icon: tm.icon, title: t.label.replace(/^\S+ /, ''), text: `${tm.open(p.firstName)} ${t.opener(state, p)}`, data: { personId: p.id, topic: optionId },
      options: t.replies.map((r) => ({ id: r.id, label: r.label, ...(r.hint ? { hint: r.hint } : {}) })) });
    return undefined;
  },
  reply(ctx, data, optionId) {
    const { state } = ctx;
    const p = byId(state, data.personId);
    const t = TOPICS[data.topic];
    const r = t?.replies.find((x) => x.id === optionId);
    if (!p || !r) return undefined;
    const rng = side(state, p, 0x5e);
    const out = r.go(ctx, p, rng) ?? { delta: 0, text: '' };
    // How they take it: their temperament, and any grudge that's still there.
    let delta = Math.round(out.delta * (out.delta > 0 ? TEMPERAMENTS[temperamentOf(p)].hears : 1) * (out.delta > 0 && p.grudge ? 0.5 : 1));
    if (TRAITS[traitOf(p)] && ['intellectual', 'nurturing'].includes(traitOf(p)) && delta > 0) delta += 1;
    p.relationship = clampRel(p.relationship + delta);
    if (out.grudge) p.grudge = { about: out.grudge, age: state.character.age };
    if (out.memory) p.memories = [...(p.memories ?? []), { age: state.character.age, text: out.text }].slice(-6);
    if (out.promise) state.people.promises = [...(state.people.promises ?? []), { personId: p.id, what: out.promise, made: state.character.age, cost: out.cost ?? 0 }];
    ctx.log(out.text, delta >= 5 ? '🫶' : delta < 0 ? '😞' : '💬', delta >= 5 ? 'good' : delta < -5 ? 'bad' : undefined);
    return undefined;
  },
  promise(ctx, data, optionId) {
    const { state } = ctx;
    const p = byId(state, data.personId);
    state.people.promises = (state.people.promises ?? []).filter((x) => !(x.personId === data.personId && x.what === data.what));
    if (!p) return undefined;
    if (optionId === 'keep') {
      if (data.cost) ctx.spend(data.cost, `Keeping a promise to ${p.firstName}`, { allowDebt: true });
      p.relationship = clampRel(p.relationship + 6);
      return ctx.log(`You kept your promise to ${p.firstName}: ${data.what}.`, '🤝', 'good');
    }
    p.relationship = clampRel(p.relationship - 12);
    p.grudge = { about: `the promise you broke`, age: state.character.age };
    return ctx.log(`You didn't keep your promise to ${p.firstName}. They haven't forgotten.`, '💔', 'bad');
  },
};

/** The year: promises come due, loans come back (or don't), a grown child may come out. */
function conversationsYear(ctx) {
  const { state } = ctx;
  if (!state.people) return;
  const age = state.character.age;
  // A child who is gay, decided once, stably.
  for (const c of living(state).filter((x) => x.relation === 'child' && x.queer == null)) c.queer = side(state, c, 0x9).chance(0.06);
  // A grown child who has something to tell you starts the conversation themselves.
  const kid = living(state).find((c) => TOPICS.childComesOut.who(state, c));
  if (kid && !state.prompts.some((x) => x.type?.startsWith('conversations.')) && side(state, kid, 0x51).chance(0.2)) {
    const t = TOPICS.childComesOut;
    ctx.prompt({ type: 'conversations.reply', icon: TEMPERAMENTS[temperamentOf(kid)].icon, title: 'Something to Tell You', text: t.opener(state, kid), data: { personId: kid.id, topic: 'childComesOut' }, options: t.replies.map((r) => ({ id: r.id, label: r.label })) });
    return;
  }
  const due = (state.people.promises ?? []).find((x) => age - x.made >= 1);
  if (due && !state.prompts.some((x) => x.type === 'conversations.promise')) {
    const p = byId(state, due.personId);
    if (!p?.alive) state.people.promises = state.people.promises.filter((x) => x !== due);
    else ctx.prompt({ type: 'conversations.promise', icon: '🤝', title: 'A Promise', text: `You promised ${p.firstName} ${due.what}.`, data: { personId: p.id, what: due.what, cost: due.cost },
      options: [{ id: 'keep', label: '🤝 Keep it', hint: due.cost ? `$${due.cost.toLocaleString()}` : 'Your time' }, { id: 'break', label: '🙈 Let it slide' }] });
  }
  for (const l of (state.people.repay ?? []).filter((x) => x.due <= age)) {
    const p = byId(state, l.personId);
    if (p?.alive) { ctx.earn(l.amount, `${p.firstName} paid you back`); ctx.log(`${p.firstName} paid back every penny of the loan.`, '💵', 'good'); }
  }
  state.people.repay = (state.people.repay ?? []).filter((x) => x.due > age);
}

export const ConversationsModule = {
  id: 'conversations',
  order: 22.7,
  onAgeUp(ctx) { if (ctx.state.character.alive) conversationsYear(ctx); },
  actions: { start },
  resolvers: ConversationsResolvers,
};
