/**
 * Bonds: what it's like to know someone.
 *
 *   personality  everyone has one (adventurous, homebody, foodie, intellectual, funny,
 *                sporty, artsy, nurturing). Doing what they love brings you closer;
 *                dragging a homebody to a festival doesn't.
 *   hanging out  talk, a deep conversation, an activity of your choosing, a compliment,
 *                asking for advice, apologizing when things are strained. Three a year
 *                with anyone.
 *   memories     the moments you share are remembered (the last six).
 *   moments      a birthday party, a friend's wedding, someone in trouble, a falling-out,
 *                reconnecting with someone you lost touch with.
 *
 *   romance      a partner's `spark` (0–100) fades a little every year unless you look
 *                after it: date nights, romantic gestures, the first "I love you",
 *                moving in together, anniversaries. When it runs low you drift apart.
 *                Temptation happens; affairs come out more often than people think.
 *   intimacy     adults only (18+): spending the night together is a choice about
 *                protection, with realistic odds of pregnancy and infection.
 *   nightlife    singles (18+) can go out: meet someone, a hookup, or a number.
 *
 * person.trait, person.memories [{ age, text }], person.spark, person.saidLove,
 * person.livingTogether, person.lastAnniversary, person.casual.
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, randomName } from '../../core/State.js';
import { ageOf, living, byId, clampRel, partnerOf } from './People.js';

export const TRAITS = {
  adventurous: { name: 'Adventurous', icon: '🧗', likes: ['hike', 'trip', 'concert'] },
  homebody: { name: 'Homebody', icon: '🛋️', likes: ['cook', 'movie', 'games'] },
  foodie: { name: 'Foodie', icon: '🍜', likes: ['dinner', 'cook', 'trip'] },
  intellectual: { name: 'Bookish', icon: '📚', likes: ['museum', 'talk', 'games'] },
  funny: { name: 'Funny', icon: '😂', likes: ['comedy', 'games', 'dinner'] },
  sporty: { name: 'Sporty', icon: '⚽', likes: ['sports', 'hike', 'game'] },
  artsy: { name: 'Artsy', icon: '🎨', likes: ['museum', 'concert', 'movie'] },
  nurturing: { name: 'Nurturing', icon: '🌻', likes: ['cook', 'talk', 'volunteer'] },
};

/** Things to do together: cost, and the age you need to be. */
export const ACTIVITIES = {
  dinner: { label: '🍽️ Dinner out', cost: 80, minAge: 12 },
  movie: { label: '🎬 A movie', cost: 30, minAge: 6 },
  hike: { label: '🥾 A hike', cost: 0, minAge: 8 },
  concert: { label: '🎸 A concert', cost: 150, minAge: 14 },
  museum: { label: '🖼️ A museum', cost: 25, minAge: 6 },
  cook: { label: '🍳 Cook together', cost: 40, minAge: 10 },
  games: { label: '🎲 Game night', cost: 0, minAge: 6 },
  comedy: { label: '🎤 A comedy club', cost: 60, minAge: 18 },
  sports: { label: '🏀 Play a sport', cost: 10, minAge: 6 },
  game: { label: '🏟️ Watch a game', cost: 120, minAge: 6 },
  trip: { label: '🧳 A weekend trip', cost: 600, minAge: 16 },
  volunteer: { label: '🤲 Volunteer together', cost: 0, minAge: 12 },
};

export const INTERACTIONS_PER_YEAR = 3;
const ROMANTIC = ['partner', 'fiance', 'spouse'];
export const isRomantic = (p) => ROMANTIC.includes(p?.relation);

/** A stable personality from the person's id. */
export function traitOf(p) {
  if (p.trait && TRAITS[p.trait]) return p.trait;
  const keys = Object.keys(TRAITS);
  let h = 0;
  for (const ch of String(p.id ?? p.firstName)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return keys[h % keys.length];
}

export const closeness = (rel) => (rel >= 85 ? 'Inseparable' : rel >= 70 ? 'Close' : rel >= 50 ? 'Good terms' : rel >= 30 ? 'Strained' : 'Estranged');
const remember = (state, p, text) => {
  p.memories = [...(p.memories ?? []), { age: state.character.age, text }].slice(-6);
};
const used = (state, p) => yearlyCount(state, `bonds.${p.id}`);
const adults = (state, p) => state.character.age >= 18 && ageOf(state, p) >= 18;

/* ------------------------------------------------------------------ */
/* Hanging out                                                         */
/* ------------------------------------------------------------------ */

export function interactEligibility(state, p) {
  if (!p?.alive) return { ok: false, reason: 'Not here' };
  if (ageOf(state, p) < 3) return { ok: false, reason: 'Too young' };
  if (state.legal?.incarceration) return { ok: false, reason: 'You\'re incarcerated' };
  if (used(state, p) >= INTERACTIONS_PER_YEAR) return { ok: false, reason: `${INTERACTIONS_PER_YEAR} a year` };
  return { ok: true };
}

/** Talk, compliment, advice, apology. Returns the change in relationship. */
export function interact(ctx, p, kind) {
  const { state, rng } = ctx;
  const e = interactEligibility(state, p);
  if (!e.ok) return ctx.toast(e.reason, 'warn');
  bumpYearly(state, `bonds.${p.id}`);
  const trait = traitOf(p);
  let delta = 0;
  let text = '';
  switch (kind) {
    case 'talk': {
      delta = rng.int(2, 6) + (trait === 'intellectual' || trait === 'nurturing' ? 3 : 0);
      text = rng.pick([`You and ${p.firstName} talked late into the night about everything and nothing.`, `${p.firstName} told you about a dream they've never told anyone.`, `A long phone call with ${p.firstName}. You both needed it.`]);
      break;
    }
    case 'compliment': {
      const lands = rng.chance(0.75);
      delta = lands ? rng.int(2, 5) : -1;
      text = lands ? `You told ${p.firstName} what you admire about them. They went quiet, then hugged you.` : `Your compliment to ${p.firstName} came out a little weird.`;
      break;
    }
    case 'joke': {
      const lands = rng.chance(trait === 'funny' ? 0.85 : 0.55);
      delta = lands ? rng.int(3, 6) : -2;
      text = lands ? `You had ${p.firstName} crying with laughter.` : `${p.firstName} didn't find it funny.`;
      break;
    }
    case 'advice': {
      delta = rng.int(1, 5);
      ctx.stat('stress', -3);
      text = `You asked ${p.firstName} for advice. ${rng.pick(['It was exactly what you needed to hear.', 'They were honest — maybe too honest — and right.', 'They made you feel less alone with it.'])}`;
      break;
    }
    case 'apologize': {
      const strained = p.relationship < 50;
      delta = strained ? (rng.chance(0.7) ? rng.int(8, 15) : 2) : 1;
      text = strained ? (delta > 5 ? `You apologized to ${p.firstName}. It took a while, but they forgave you.` : `You apologized. ${p.firstName} isn't ready to let it go.`) : `You apologized to ${p.firstName}, who wasn't sure what for.`;
      break;
    }
    default: return undefined;
  }
  p.relationship = clampRel(p.relationship + delta);
  if (delta >= 5) remember(state, p, text);
  ctx.log(text, delta >= 0 ? '💬' : '😬', delta >= 5 ? 'good' : undefined);
  return delta;
}

/** An activity together; better if it's their kind of thing. */
export function activity(ctx, p, id) {
  const { state, rng } = ctx;
  const a = ACTIVITIES[id];
  const e = interactEligibility(state, p);
  if (!a || !e.ok) return ctx.toast(e.reason ?? 'Pick something to do', 'warn');
  if (state.character.age < a.minAge || ageOf(state, p) < a.minAge) return ctx.toast(`Ages ${a.minAge}+`, 'warn');
  if (a.cost && state.character.age >= 16 && !ctx.spend(a.cost, `${a.label.replace(/^\S+ /, '')} with ${p.firstName}`, { credit: true })) return ctx.toast(`Costs $${a.cost}`, 'warn');
  bumpYearly(state, `bonds.${p.id}`);
  const loved = TRAITS[traitOf(p)].likes.includes(id);
  const delta = loved ? rng.int(8, 14) : rng.int(2, 6);
  p.relationship = clampRel(p.relationship + delta);
  if (isRomantic(p)) p.spark = clamp((p.spark ?? 60) + (loved ? 8 : 3), 0, 100);
  ctx.stat('happiness', loved ? 4 : 2);
  const what = a.label.replace(/^\S+ /, '').toLowerCase();
  const text = loved ? `${what[0].toUpperCase()}${what.slice(1)} with ${p.firstName} — exactly their kind of thing. One of the best days you've had together.` : `You went for ${what} with ${p.firstName}. Nice, if not really their thing.`;
  if (loved) remember(state, p, text);
  ctx.log(text, '🫶', loved ? 'good' : undefined);
  return delta;
}

/* ------------------------------------------------------------------ */
/* Romance                                                             */
/* ------------------------------------------------------------------ */

export const DATE_NIGHTS = {
  stayIn: { label: '🕯️ A night in: candles, takeout, no phones', cost: 40, spark: 6 },
  fancy: { label: '🥂 A fancy dinner', cost: 220, spark: 9 },
  dance: { label: '💃 Go dancing', cost: 90, spark: 10 },
  getaway: { label: '🏝️ A weekend getaway', cost: 1200, spark: 16 },
  surprise: { label: '🎁 A surprise planned around them', cost: 300, spark: 12, trait: true },
};
export const GESTURES = {
  letter: { label: '💌 Write them a love letter', cost: 0, spark: 7 },
  flowers: { label: '💐 Flowers, for no reason', cost: 60, spark: 5 },
  playlist: { label: '🎶 Make them a playlist of "your" songs', cost: 0, spark: 5 },
  breakfast: { label: '🥞 Breakfast in bed', cost: 20, spark: 6 },
};

export function dateNight(ctx, p, id) {
  const { state, rng } = ctx;
  const d = DATE_NIGHTS[id];
  if (!d || !isRomantic(p)) return;
  if (yearlyCount(state, `romance.date.${p.id}`) >= 2) return ctx.toast('Two big date nights a year — keep it special', 'warn');
  if (!ctx.spend(d.cost, 'Date night', { credit: true })) return ctx.toast(`Costs $${d.cost}`, 'warn');
  bumpYearly(state, `romance.date.${p.id}`);
  const fit = d.trait ? 6 : 0;
  p.spark = clamp((p.spark ?? 60) + d.spark + fit + rng.int(-2, 3), 0, 100);
  p.relationship = clampRel(p.relationship + rng.int(3, 7));
  ctx.stat('happiness', 4);
  const text = { stayIn: `A quiet night in with ${p.firstName}. You talked like you did when you first met.`, fancy: `Dinner somewhere expensive with ${p.firstName}. You both dressed up.`, dance: `You took ${p.firstName} dancing. Neither of you can dance; it didn't matter.`, getaway: `A weekend away with ${p.firstName} — no work, no chores, just the two of you.`, surprise: `You planned a day entirely around ${p.firstName}'s favourite things. They teared up.` }[id];
  remember(state, p, text);
  ctx.log(text, '💞', 'good');
}

export function gesture(ctx, p, id) {
  const { state, rng } = ctx;
  const g = GESTURES[id];
  if (!g || !isRomantic(p)) return;
  if (yearlyCount(state, `romance.gesture.${p.id}`)) return ctx.toast('One a year — keep it meaningful', 'warn');
  if (g.cost && !ctx.spend(g.cost, 'A romantic gesture', { credit: true })) return ctx.toast(`Costs $${g.cost}`, 'warn');
  bumpYearly(state, `romance.gesture.${p.id}`);
  p.spark = clamp((p.spark ?? 60) + g.spark + rng.int(-1, 3), 0, 100);
  p.relationship = clampRel(p.relationship + 3);
  ctx.log(`${g.label.replace(/^\S+ /, '')}. ${p.firstName} ${rng.pick(['kept it.', 'smiled for the rest of the day.', 'told all their friends.'])}`, '💗', 'good');
}

export function sayILoveYou(ctx, p) {
  const { state, rng } = ctx;
  if (!isRomantic(p) || p.saidLove) return;
  const months = state.character.age - (p.since ?? state.character.age);
  const ready = (p.relationship + (p.spark ?? 60)) / 2;
  p.saidLove = state.character.age;
  if (rng.chance(clamp((ready - 35) / 50 + (months >= 1 ? 0.15 : -0.1), 0.1, 0.95))) {
    p.relationship = clampRel(p.relationship + 8);
    p.spark = clamp((p.spark ?? 60) + 8, 0, 100);
    ctx.stat('happiness', 10);
    remember(state, p, `The first time you said "I love you" — and ${p.firstName} said it back.`);
    ctx.log(`You told ${p.firstName} you love them. "I love you too."`, '❤️', 'milestone');
  } else {
    p.relationship = clampRel(p.relationship - 4);
    ctx.stat('happiness', -6);
    ctx.log(`You told ${p.firstName} you love them. They said "…thank you." Ouch.`, '💔', 'warn');
    p.saidLove = null;
  }
}

export function moveIn(ctx, p) {
  const { state } = ctx;
  if (!['partner', 'fiance'].includes(p?.relation) || p.livingTogether) return;
  if (state.character.age < 18 || ageOf(state, p) < 18) return ctx.toast('You both need to be 18', 'warn');
  if (state.character.age - (p.since ?? state.character.age) < 1) return ctx.toast('Give it a year first', 'warn');
  p.livingTogether = true;
  p.relationship = clampRel(p.relationship + 5);
  ctx.stat('happiness', 6);
  remember(state, p, `The day you moved in together and argued about where the couch goes.`);
  ctx.log(`You and ${p.firstName} moved in together.`, '🗝️', 'milestone');
}

/** Adults only. Protection is the choice; pregnancy and infection odds are realistic. */
export function intimacy(ctx, p, protection = 'protected') {
  const { state, rng } = ctx;
  if (!p?.alive || !adults(state, p)) return ctx.toast('Adults only', 'warn');
  if (!isRomantic(p) && !p.casual) return;
  if (yearlyCount(state, `romance.night.${p.id}`)) return ctx.toast('Once a year here — the rest stays private', 'info');
  bumpYearly(state, `romance.night.${p.id}`);
  p.spark = clamp((p.spark ?? 60) + rng.int(4, 9), 0, 100);
  p.relationship = clampRel(p.relationship + 3);
  ctx.stat('happiness', 5);
  ctx.stat('stress', -4);
  ctx.log(`You and ${p.firstName} spent the night together.`, '🌙');
  consequences(ctx, p, protection, { casual: Boolean(p.casual) });
  return undefined;
}

/** What can follow: a pregnancy (if one of you can carry) and, with new partners, an infection. */
export function consequences(ctx, p, protection, { casual = false } = {}) {
  const { state, rng } = ctx;
  const carrierAge = state.character.gender === 'female' ? state.character.age : p.gender === 'female' ? ageOf(state, p) : null;
  const differentSex = state.character.gender !== p.gender;
  const fertile = carrierAge != null && carrierAge >= 18 && carrierAge < 45 && differentSex;
  // Condoms fail about 2% of the time used perfectly (~13% a year as typically used); a single night unprotected ~5%.
  const pregnancy = !fertile ? 0 : protection === 'protected' ? 0.01 : 0.05 * (carrierAge < 35 ? 1 : 0.5);
  if (!state.people.expecting && rng.chance(pregnancy)) {
    if (casual) return casualPregnancy(ctx, p);
    state.people.expecting = { since: state.character.age };
    ctx.log(`A few weeks later: ${state.character.gender === 'female' ? 'you\'re' : `${p.firstName} is`} pregnant. 🤰`, '🤰', 'milestone');
  }
  if (casual && rng.chance(protection === 'protected' ? 0.005 : 0.04)) {
    ctx.prompt({
      type: 'bonds.sti', icon: '🧪', title: 'Something\'s Not Right',
      text: 'A few weeks after a new partner, you have symptoms. It\'s probably a common, treatable infection — chlamydia, most likely.',
      options: [{ id: 'treat', label: '🩺 Get tested and treated', hint: 'A clinic visit and antibiotics' }, { id: 'ignore', label: '🙈 Wait and see', tone: 'danger', hint: 'Untreated infections cause lasting harm' }],
    });
  }
  return undefined;
}

function casualPregnancy(ctx, p) {
  const { state } = ctx;
  const you = state.character.gender === 'female';
  ctx.prompt({
    type: 'bonds.pregnancy', icon: '🤰', title: 'An Unexpected Pregnancy',
    text: you ? `You're pregnant — from your night with ${p.firstName}. It's your decision.` : `${p.firstName} called: she's pregnant, and it's yours.`,
    options: you
      ? [{ id: 'keep', label: '👶 Have the baby' }, { id: 'end', label: '🏥 End the pregnancy' }, { id: 'adoption', label: '🏡 Carry it and place the baby for adoption' }]
      : [{ id: 'involved', label: '🤝 Be part of the child\'s life', hint: 'Child support and a child' }, { id: 'distant', label: '💵 Pay support from a distance' }],
    data: { personId: p.id },
  });
}

/* ------------------------------------------------------------------ */
/* Nightlife                                                           */
/* ------------------------------------------------------------------ */

export function goOut(ctx) {
  const { state, rng } = ctx;
  if (state.character.age < 18) return ctx.toast('18+', 'warn');
  if (state.legal?.incarceration) return ctx.toast('Not from in here', 'warn');
  if (yearlyCount(state, 'bonds.goOut')) return ctx.toast('Once a year', 'warn');
  bumpYearly(state, 'bonds.goOut');
  ctx.spend(rng.int(60, 200), 'A night out', { allowDebt: true });
  ctx.stat('happiness', 3);
  const partner = partnerOf(state);
  const pref = state.people.orientation ?? (state.character.gender === 'male' ? 'women' : 'men');
  const gender = pref === 'women' ? 'female' : pref === 'men' ? 'male' : rng.pick(['male', 'female']);
  const name = randomName(rng, gender);
  const age = clamp(state.character.age + rng.int(-6, 6), 18, 90);
  const stranger = { id: rng.id('per_'), firstName: name.firstName, lastName: name.lastName, gender, relation: 'friend', ageOffset: age - state.character.age, relationship: 45, alive: true, income: 0, careerIncome: 0, circle: 'neighborhood', metAge: state.character.age };
  state.people.stranger = stranger;
  ctx.prompt({
    type: 'bonds.night', icon: '🌃', title: 'A Night Out',
    text: `At a bar downtown you get talking to ${stranger.firstName}, ${age}. There's definitely something there.${partner ? ` You're with ${partner.firstName}, though.` : ''}`,
    options: [
      { id: 'number', label: '📱 Swap numbers', hint: partner ? 'Harmless? Maybe.' : 'Maybe a first date' },
      { id: 'home', label: '🌙 Go home together', hint: partner ? `Cheating on ${partner.firstName}` : 'A one-night stand', tone: partner ? 'danger' : undefined },
      { id: 'home_protected', label: '🛡️ Go home together — with protection', hint: partner ? `Still cheating on ${partner.firstName}` : 'Safer', tone: partner ? 'danger' : undefined },
      { id: 'leave', label: '🚕 Call it a night' },
    ],
  });
  return undefined;
}

/* ------------------------------------------------------------------ */
/* The year                                                            */
/* ------------------------------------------------------------------ */

function romanceYear(ctx) {
  const { state, rng } = ctx;
  const p = partnerOf(state);
  if (!p) return;
  p.spark ??= 70;
  const years = state.character.age - (p.since ?? state.character.age);
  // Sparks fade with time, stress and small children — unless you tend them.
  const kids = living(state).filter((x) => x.relation === 'child' && ageOf(state, x) < 6).length;
  p.spark = clamp(p.spark - 1.5 - Math.min(1.5, years / 12) - kids * 0.75 - (state.stats.stress > 70 ? 2 : 0), 0, 100);
  // Settled couples who still like each other find their way back to each other.
  // (less than it fades: it still drifts down untended, but a good marriage doesn't hit bottom).
  if (p.relationship >= 50) p.spark = clamp(p.spark + rng.int(0, 1) + (state.stats.happiness > 60 ? 0.5 : 0) + (p.spark < 30 && p.relationship >= 60 ? 2 : 0), 0, 100);
  // Spark feeds the relationship; a dead spark wears it down.
  if (p.spark < 15) p.relationship = clampRel(p.relationship - (rng.chance(0.5) ? 2 : 1));
  else if (p.spark < 30 && rng.chance(0.3)) p.relationship = clampRel(p.relationship - 1);
  else if (p.spark > 70) p.relationship = clampRel(p.relationship + 1);
  // Anniversaries.
  if (p.relation === 'spouse' && years >= 1 && p.lastAnniversary !== state.character.age && !state.prompts.some((x) => x.type === 'bonds.anniversary')) {
    p.lastAnniversary = state.character.age;
    const forgot = rng.chance(clamp((state.stats.stress - 40) / 150, 0.03, 0.35));
    if (forgot) {
      p.relationship = clampRel(p.relationship - 8);
      p.spark = clamp(p.spark - 8, 0, 100);
      ctx.log(`You forgot your ${ordinal(years)} wedding anniversary. ${p.firstName} did not.`, '🗓️', 'bad');
    } else if (years % 5 === 0 || years === 1) {
      ctx.prompt({
        type: 'bonds.anniversary', icon: '💍', title: `Your ${ordinal(years)} Anniversary`,
        text: `${years === 1 ? 'One year married.' : `${years} years married.`} How do you mark it?`,
        options: [{ id: 'trip', label: '✈️ A trip somewhere new', hint: '$2,500' }, { id: 'dinner', label: '🍷 Dinner where you had your first date', hint: '$150' }, { id: 'renew', label: '💒 Renew your vows', hint: '$4,000' }, { id: 'nothing', label: '🛋️ A quiet night in' }],
        data: { personId: p.id, years },
      });
    }
  }
  // Drifting apart.
  if (p.spark < 25 && !state.prompts.some((x) => x.type === 'bonds.drift') && rng.chance(0.3)) {
    ctx.prompt({
      type: 'bonds.drift', icon: '🌫️', title: 'Drifting Apart',
      text: `You and ${p.firstName} feel more like roommates than partners lately. Conversations are about logistics. Nobody remembers the last date night.`,
      options: [{ id: 'counsel', label: '🛋️ Couples counseling', hint: '$2,000' }, { id: 'talk', label: '💬 Have the hard conversation' }, { id: 'ignore', label: '🙈 It\'s just a phase' }],
      data: { personId: p.id },
    });
  }
  // Temptation (adults).
  if (state.character.age >= 18 && rng.chance(p.spark < 40 ? 0.08 : 0.025) && !state.prompts.some((x) => x.type === 'bonds.temptation')) {
    ctx.prompt({
      type: 'bonds.temptation', icon: '🔥', title: 'Temptation',
      text: `A ${state.career.job ? 'coworker' : 'friend of a friend'} has been flirting with you for weeks — and tonight, after drinks, they make it very clear they're interested.`,
      options: [{ id: 'no', label: `🙅 Go home to ${p.firstName}` }, { id: 'affair', label: '🌙 Start an affair', tone: 'danger', hint: 'Affairs usually come out' }],
      data: { personId: p.id },
    });
  }
  // An ongoing affair may come out.
  if (state.people.affair && rng.chance(0.35)) {
    state.people.affair = null;
    p.relationship = clampRel(p.relationship - 40);
    p.spark = clamp(p.spark - 30, 0, 100);
    ctx.stat('happiness', -15);
    ctx.log(`${p.firstName} found the messages. You've never seen them so hurt.`, '💔', 'bad');
    if (p.relationship < 35) ctx.emit('bonds:leave', { personId: p.id });
  }
}

function momentsYear(ctx) {
  const { state, rng } = ctx;
  if (state.character.age < 8 || !rng.chance(0.3) || state.prompts.some((x) => x.type === 'bonds.moment')) return;
  const circle = living(state).filter((x) => ['friend', 'sibling', 'mother', 'father', 'child'].includes(x.relation) && ageOf(state, x) >= 8);
  if (!circle.length) return;
  const p = rng.pick(circle);
  const age = ageOf(state, p);
  const pool = [
    { id: 'birthday', ok: true, text: `${p.firstName} is having a birthday party and really wants you there.`, options: [{ id: 'go', label: '🎉 Go, with a thoughtful gift' }, { id: 'skip', label: '📱 Send a text instead' }] },
    { id: 'trouble', ok: age >= 16, text: `${p.firstName} calls at 2 a.m. They're in trouble and don't know who else to call.`, options: [{ id: 'go', label: '🚗 Drive over right now' }, { id: 'phone', label: '📞 Talk them through it on the phone' }, { id: 'skip', label: '😴 Let it go to voicemail' }] },
    { id: 'wedding', ok: p.relation === 'friend' || p.relation === 'sibling' ? age >= 22 : false, text: `${p.firstName} is getting married — and asks you to stand up beside them.`, options: [{ id: 'go', label: '🥂 Say yes, and give a speech' }, { id: 'guest', label: '🎟️ Just attend as a guest' }] },
    { id: 'falling', ok: age >= 14, text: `${p.firstName} heard something you said about them behind their back.`, options: [{ id: 'own', label: '🙏 Own it and apologize' }, { id: 'deny', label: '🙅 Deny it' }] },
    { id: 'reconnect', ok: p.relationship < 40, text: `Out of nowhere, ${p.firstName} reaches out. "I miss how things used to be."`, options: [{ id: 'go', label: '☕ Meet for coffee' }, { id: 'skip', label: '🚪 Leave the past in the past' }] },
    { id: 'loan', ok: age >= 20 && state.character.age >= 20, text: `${p.firstName} asks to borrow $2,000 until next month.`, options: [{ id: 'lend', label: '💵 Lend it' }, { id: 'no', label: '🙅 Say no kindly' }] },
  ].filter((x) => x.ok);
  const m = rng.pick(pool);
  ctx.prompt({ type: 'bonds.moment', icon: TRAITS[traitOf(p)].icon, title: { birthday: 'A Birthday Party', trouble: 'A Call at 2 a.m.', wedding: 'Will You Stand With Me?', falling: 'A Falling-Out', reconnect: 'Reconnecting', loan: 'Can You Spot Me?' }[m.id], text: m.text, options: m.options, data: { personId: p.id, momentId: m.id } });
}

const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] ?? ['th', 'st', 'nd', 'rd'][n % 100] ?? 'th'}`;

export const BondsModule = {
  id: 'bonds',
  order: 22.5,

  setup(engine) {
    engine.bus.on('bonds:leave', ({ ctx, personId }) => {
      const p = byId(ctx.state, personId);
      if (!p) return;
      if (p.relation === 'spouse') ctx.prompt({ type: 'people.divorce', icon: '💔', title: 'Divorce', text: `${p.firstName} wants a divorce.`, options: [{ id: 'accept', label: '🖊️ Agree to it' }, { id: 'contest', label: '⚖️ Fight to save it' }], data: { personId: p.id } });
      else if (['partner', 'fiance'].includes(p.relation)) {
        p.relation = 'friend';
        p.formerPartner = true;
        p.livingTogether = false;
        ctx.log(`${p.firstName} left you.`, '💔', 'bad');
      }
    });
  },

  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.people || !state.character.alive) return;
    romanceYear(ctx);
    momentsYear(ctx);
  },

  actions: {
    /** arg: 'personId:talk|compliment|joke|advice|apologize' */
    interact(ctx, arg) {
      const [id, kind] = String(arg).split(':');
      interact(ctx, byId(ctx.state, id), kind);
    },
    /** arg: personId — choose an activity. */
    hangOut(ctx, id) {
      const { state } = ctx;
      const p = byId(state, id);
      const e = interactEligibility(state, p);
      if (!e.ok) return ctx.toast(e.reason, 'warn');
      const options = Object.entries(ACTIVITIES).filter(([, a]) => state.character.age >= a.minAge && ageOf(state, p) >= a.minAge && !(isRomantic(p) === false && a.minAge >= 18 && ageOf(state, p) < 18))
        .map(([aid, a]) => ({ id: aid, label: a.label, hint: a.cost ? `$${a.cost}` : 'Free' }));
      if (!options.length) return ctx.toast(`Nothing you and ${p.firstName} can do together yet.`, 'warn');
      ctx.prompt({ type: 'bonds.hangOut', icon: '🫶', title: `Time With ${p.firstName}`, text: `What do you want to do with ${p.firstName}? (${TRAITS[traitOf(p)].icon} ${TRAITS[traitOf(p)].name.toLowerCase()} — what would they love?)`, options, data: { personId: p.id } });
      return undefined;
    },
    dateNight(ctx, id) {
      const p = byId(ctx.state, id);
      if (!isRomantic(p)) return;
      ctx.prompt({ type: 'bonds.dateNight', icon: '💞', title: `Date Night With ${p.firstName}`, text: 'What kind of night?', options: Object.entries(DATE_NIGHTS).map(([did, d]) => ({ id: did, label: d.label, hint: d.cost ? `$${d.cost}` : 'Free' })), data: { personId: p.id } });
    },
    gesture(ctx, id) {
      const p = byId(ctx.state, id);
      if (!isRomantic(p)) return;
      ctx.prompt({ type: 'bonds.gesture', icon: '💗', title: `Something for ${p.firstName}`, text: 'A little romance.', options: Object.entries(GESTURES).map(([gid, g]) => ({ id: gid, label: g.label, hint: g.cost ? `$${g.cost}` : 'Free' })), data: { personId: p.id } });
    },
    loveYou: (ctx, id) => sayILoveYou(ctx, byId(ctx.state, id)),
    moveIn: (ctx, id) => moveIn(ctx, byId(ctx.state, id)),
    /** arg: personId — adults only. */
    intimacy(ctx, id) {
      const { state } = ctx;
      const p = byId(state, id);
      if (!p || !adults(state, p) || (!isRomantic(p) && !p.casual)) return ctx.toast('Adults only', 'warn');
      ctx.prompt({ type: 'bonds.intimacy', icon: '🌙', title: `A Night With ${p.firstName}`, text: 'Things are heading to the bedroom.', options: [{ id: 'protected', label: '🛡️ With protection' }, { id: 'unprotected', label: '🎲 Without', hint: 'Pregnancy is possible' }, { id: 'notTonight', label: '🙂 Not tonight' }], data: { personId: p.id } });
      return undefined;
    },
    goOut: (ctx) => goOut(ctx),
  },

  resolvers: {
    hangOut(ctx, data, optionId) {
      activity(ctx, byId(ctx.state, data.personId), optionId);
    },
    dateNight(ctx, data, optionId) {
      dateNight(ctx, byId(ctx.state, data.personId), optionId);
    },
    gesture(ctx, data, optionId) {
      gesture(ctx, byId(ctx.state, data.personId), optionId);
    },
    intimacy(ctx, data, optionId) {
      if (optionId === 'notTonight') return ctx.log('You fell asleep watching a movie together instead.', '🛋️');
      return intimacy(ctx, byId(ctx.state, data.personId), optionId);
    },
    night(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const s = state.people.stranger;
      delete state.people.stranger;
      if (!s || optionId === 'leave') return ctx.log('You called it a night and went home alone.', '🚕');
      const partner = partnerOf(state);
      if (optionId === 'number') {
        if (!partner && rng.chance(0.55)) {
          s.relation = 'partner';
          s.since = state.character.age;
          s.spark = 75;
          s.relationship = 60;
          state.people.list.push(s);
          ctx.stat('happiness', 6);
          return ctx.log(`You texted ${s.firstName} the next day. Coffee became dinner became a second date — you're seeing each other now.`, '💘', 'good');
        }
        if (partner) partner.relationship = clampRel(partner.relationship - 2);
        return ctx.log(`You swapped numbers with ${s.firstName}. ${partner ? 'You never texted.' : 'They never texted back.'}`, '📱');
      }
      // A night together.
      s.casual = true;
      s.relation = 'friend';
      s.relationship = 50;
      state.people.list.push(s);
      ctx.stat('happiness', 5);
      ctx.log(`You went home with ${s.firstName}.`, '🌙');
      if (partner) {
        partner.spark = clamp((partner.spark ?? 60) - 5, 0, 100);
        if (rng.chance(0.3)) {
          partner.relationship = clampRel(partner.relationship - 35);
          ctx.stat('happiness', -12);
          ctx.log(`${partner.firstName} found out.`, '💔', 'bad');
          if (partner.relationship < 35) ctx.emit('bonds:leave', { personId: partner.id });
        }
      }
      consequences(ctx, s, optionId === 'home_protected' ? 'protected' : 'unprotected', { casual: true });
      return undefined;
    },
    sti(ctx, _data, optionId) {
      if (optionId === 'treat') {
        ctx.spend(180, 'Clinic visit and antibiotics', { allowDebt: true });
        return ctx.log('A quick test, a course of antibiotics, and an awkward text to a recent partner. All clear.', '🩺', 'good');
      }
      ctx.stat('health', -8);
      ctx.stat('stress', 4);
      return ctx.log('You ignored it. It cleared up on the surface — the damage it did didn\'t.', '🧪', 'bad');
    },
    pregnancy(ctx, data, optionId) {
      const { state } = ctx;
      const p = byId(state, data.personId);
      if (optionId === 'end') return ctx.log('You ended the pregnancy. It was your choice to make.', '🏥');
      if (optionId === 'adoption') {
        ctx.stat('happiness', -4);
        return ctx.log('You carried the pregnancy and placed the baby with an adoptive family you chose yourself.', '🏡');
      }
      state.people.expecting = { since: state.character.age, otherParentId: p?.id ?? null, apart: optionId === 'distant' };
      if (p) p.relationship = clampRel(p.relationship + (optionId === 'distant' ? -5 : 10));
      return ctx.log(optionId === 'distant' ? 'You agreed to pay support and keep your distance.' : `You and ${p?.firstName ?? 'the other parent'} are going to raise a child together — even if you're not together.`, '👶', 'milestone');
    },
    anniversary(ctx, data, optionId) {
      const p = byId(ctx.state, data.personId);
      if (!p) return;
      const cost = { trip: 2500, dinner: 150, renew: 4000, nothing: 0 }[optionId] ?? 0;
      if (cost && !ctx.spend(cost, 'Anniversary', { credit: true })) return ctx.log('You couldn\'t afford it; you had a quiet night in.', '🛋️');
      const lift = { trip: 14, dinner: 8, renew: 18, nothing: 4 }[optionId] ?? 4;
      p.spark = clamp((p.spark ?? 60) + lift, 0, 100);
      p.relationship = clampRel(p.relationship + Math.round(lift / 2));
      remember(ctx.state, p, { trip: `Your anniversary trip — ${data.years} years in.`, dinner: 'Anniversary dinner at the place you had your first date.', renew: `Renewing your vows after ${data.years} years.`, nothing: 'A quiet anniversary on the couch.' }[optionId]);
      ctx.log({ trip: 'You took an anniversary trip somewhere new.', dinner: 'You went back to where you had your first date.', renew: `You renewed your vows in front of family and friends.`, nothing: 'A quiet anniversary at home. Perfect, actually.' }[optionId], '💍', 'good');
    },
    drift(ctx, data, optionId) {
      const { rng } = ctx;
      const p = byId(ctx.state, data.personId);
      if (!p) return;
      if (optionId === 'counsel') {
        if (!ctx.spend(2000, 'Couples counseling', { credit: true })) return ctx.log('You couldn\'t afford counseling.', '🛋️');
        p.spark = clamp(p.spark + 25, 0, 100);
        p.relationship = clampRel(p.relationship + 10);
        return ctx.log(`Months of counseling. You and ${p.firstName} learned to talk again.`, '🛋️', 'good');
      }
      if (optionId === 'talk') {
        const ok = rng.chance(0.6);
        p.spark = clamp(p.spark + (ok ? 18 : 2), 0, 100);
        return ctx.log(ok ? `A long, hard, honest conversation with ${p.firstName}. Something came back to life.` : 'You talked. Nothing changed.', '💬', ok ? 'good' : undefined);
      }
      p.relationship = clampRel(p.relationship - 8);
      if (p.relationship < 30) ctx.emit('bonds:leave', { personId: p.id });
      return ctx.log('You told yourself it was a phase.', '🙈', 'warn');
    },
    temptation(ctx, data, optionId) {
      const { state } = ctx;
      const p = byId(state, data.personId);
      if (optionId === 'no') {
        if (p) p.spark = clamp((p.spark ?? 60) + 3, 0, 100);
        return ctx.log(`You went home to ${p?.firstName ?? 'your partner'}.`, '🏠');
      }
      state.people.affair = { since: state.character.age };
      ctx.stat('happiness', 4);
      ctx.stat('stress', 8);
      return ctx.log('You started an affair. The secret sits heavy.', '🌙', 'warn');
    },
    moment(ctx, data, optionId) {
      const { state, rng } = ctx;
      const p = byId(state, data.personId);
      if (!p) return;
      const say = (text, delta, kind) => {
        p.relationship = clampRel(p.relationship + delta);
        if (delta >= 8) remember(state, p, text);
        ctx.log(text, delta >= 0 ? '🫶' : '😞', kind);
      };
      switch (`${data.momentId}.${optionId}`) {
        case 'birthday.go': ctx.spend(60, `Gift for ${p.firstName}`, { allowDebt: true }); return say(`You went to ${p.firstName}'s birthday with a gift that made them laugh.`, 7, 'good');
        case 'birthday.skip': return say(`You texted ${p.firstName} happy birthday.`, -2);
        case 'trouble.go': ctx.stat('stress', 4); return say(`You drove over at 2 a.m. for ${p.firstName}. They'll never forget it.`, 14, 'good');
        case 'trouble.phone': return say(`You stayed on the phone with ${p.firstName} until the sun came up.`, 8, 'good');
        case 'trouble.skip': return say(`You let ${p.firstName}'s call go to voicemail. In the morning, they didn't call back.`, -12, 'bad');
        case 'wedding.go': ctx.spend(400, 'Wedding party costs', { allowDebt: true }); return say(`Your speech at ${p.firstName}'s wedding had the whole room in tears and laughter.`, 12, 'good');
        case 'wedding.guest': return say(`You were there when ${p.firstName} said "I do."`, 3);
        case 'falling.own': return say(rng.chance(0.65) ? `You apologized to ${p.firstName}. It hurt, but you're okay.` : `${p.firstName} heard you out, but something has changed.`, rng.chance(0.65) ? 2 : -6);
        case 'falling.deny': return say(`You denied it. ${p.firstName} knew.`, -14, 'bad');
        case 'reconnect.go': return say(`Coffee with ${p.firstName} turned into three hours. It's like no time passed.`, 18, 'good');
        case 'reconnect.skip': return say(`You left ${p.firstName}'s message unanswered.`, -3);
        case 'loan.lend': {
          ctx.spend(2000, `Loan to ${p.firstName}`, { allowDebt: true });
          if (rng.chance(0.7)) {
            ctx.earn(2000, `${p.firstName} paid you back`);
            return say(`${p.firstName} paid you back right on time.`, 6);
          }
          return say(`${p.firstName} never paid you back, and now things are awkward.`, -10, 'warn');
        }
        case 'loan.no': return say(`You told ${p.firstName} no, kindly. They understood — mostly.`, -3);
        default: return undefined;
      }
    },
  },
};
