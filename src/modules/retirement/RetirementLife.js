/**
 * Life after work. Once you've retired (or simply stopped working past 62), the years fill with
 * what you choose:
 *
 *   A rhythm       how you spend the year: take it easy, travel, volunteer, a passion
 *                  project, the grandchildren, or an encore career (part-time consulting,
 *                  teaching, a shop job for the company) — each with its own costs and rewards
 *   Bucket list    one-off things you always meant to do: the Northern Lights, a cruise, learn
 *                  the piano, a memoir, a marathon, a skydive, the old country
 *   Where to live  stay put, move near the grandchildren, or a retirement community (friends,
 *                  activities, care on hand, and a monthly fee)
 *   The years      a scam aimed at retirees, a class reunion, a new friend at the senior centre,
 *                  a health scare, the grandchildren's milestones
 *
 * Staying busy keeps the mind sharp: hobbies and volunteering slow the decline in smarts.
 *
 * state.retirementLife = { rhythm, bucket: { [id]: age }, community: { since, fee } | null, encore }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { living, ageOf } from '../people/People.js';
import { addFriend } from '../people/Friends.js';

export const RHYTHMS = {
  easy: { label: '🌅 Take it easy', desc: 'Long mornings, the garden, the paper.', happiness: 2, stress: -5 },
  travel: { label: '🧳 Travel', desc: 'A trip or two a year.', cost: 9000, happiness: 5, stress: -3 },
  volunteer: { label: '🤲 Volunteer', desc: 'The food bank, the hospice, mentoring.', happiness: 4, stress: -2, sharp: true },
  passion: { label: '🎨 A passion project', desc: 'Painting, woodwork, the family history, the allotment.', cost: 1500, happiness: 4, stress: -3, sharp: true },
  family: { label: '👵 The grandchildren', desc: 'School runs, holidays, Sunday lunch.', happiness: 5, stress: 1, needsGrandkids: true },
  encore: { label: '💼 An encore career', desc: 'Part-time consulting, teaching or a shop job: income and purpose.', happiness: 2, stress: 2, earns: true, sharp: true },
};

export const BUCKET = {
  aurora: { label: '🌌 See the Northern Lights', cost: 6000, happiness: 6, text: 'Under a sky of green fire in the far north, you cried a little and weren\'t embarrassed.' },
  cruise: { label: '🚢 A world cruise', cost: 25000, happiness: 7, text: 'Ninety days, thirty ports, and more buffet than anyone needs.' },
  piano: { label: '🎹 Learn the piano', cost: 2000, happiness: 4, smarts: 3, text: 'Two years of lessons and you played at your granddaughter\'s birthday. Mostly right.' },
  memoir: { label: '📖 Write your memoir', cost: 0, happiness: 5, smarts: 2, text: 'You wrote it all down: the family will read it long after you\'re gone.', buzz: 3 },
  marathon: { label: '🏃 Run a marathon', cost: 300, happiness: 6, fitness: 5, minFitness: 45, text: 'Six hours and some minutes, and the loudest cheering at the finish was for the oldest runners.' },
  skydive: { label: '🪂 Skydive', cost: 400, happiness: 6, text: 'Fourteen thousand feet. You screamed the whole way down and booked another.' },
  roots: { label: '🗺️ Visit where the family came from', cost: 5000, happiness: 6, text: 'You found the village, the church and a grave with your surname on it.' },
  degree: { label: '🎓 Finish a degree', cost: 6000, happiness: 5, smarts: 5, text: 'You walked across the stage at seventy-something, to the loudest applause of the day.' },
};

const COMMUNITY_FEE = 42000;
const rl = (state) => (state.retirementLife ??= { rhythm: 'easy', bucket: {}, community: null, encore: null });

/** Are you in retirement (the life, not just the pension)? */
export const inRetirement = (state) => state.character.alive && !state.career?.job && (state.retirement?.retired || state.character.age >= 62);
const grandkids = (state) => living(state).filter((p) => p.relation === 'child').reduce((n, c) => n + (c.kids?.length ?? 0), 0);

function rhythmYear(ctx) {
  const { state, rng } = ctx;
  const r = rl(state);
  const rh = RHYTHMS[r.rhythm] ?? RHYTHMS.easy;
  if (rh.needsGrandkids && !grandkids(state)) r.rhythm = 'easy';
  const now = RHYTHMS[r.rhythm];
  if (now.cost && !ctx.spend(now.cost, `Retirement: ${now.label.replace(/^\S+ /, '')}`, { allowDebt: false })) {
    ctx.log('Money was tight this year: you stayed closer to home.', '🏠', 'info');
  } else {
    ctx.stat('happiness', now.happiness);
    ctx.stat('stress', now.stress);
  }
  // A busy mind stays sharp; an idle one drifts.
  if (now.sharp) ctx.stat('smarts', 1);
  else if (state.character.age >= 70 && rng.chance(0.4)) ctx.stat('smarts', -1);
  if (now.earns) {
    const pay = Math.round((state.career?.history?.at(-1)?.salary ?? 40000) * rng.float(0.15, 0.3) / 100) * 100;
    ctx.earn(Math.max(8000, pay), 'Encore work (part-time)', { wage: true });
  }
  if (r.rhythm === 'volunteer' && state.community) state.community.volunteerYears = (state.community.volunteerYears ?? 0) + 1;
  if (r.rhythm === 'family') for (const c of living(state).filter((p) => p.relation === 'child' && p.kids?.length)) c.relationship = clamp((c.relationship ?? 60) + 3, 0, 100);
  if (r.rhythm === 'travel' && rng.chance(0.5)) ctx.log(rng.pick(['A river cruise down the Danube.', 'Three weeks in Japan in cherry-blossom season.', 'A road trip through the national parks.', 'A month somewhere warm in January.']), '🧳', 'good');
}

function communityYear(ctx) {
  const { state, rng } = ctx;
  const c = rl(state).community;
  if (!c) return;
  ctx.spend(c.fee, 'Retirement community fees', { allowDebt: true });
  ctx.stat('happiness', 2);
  ctx.stat('health', 1);
  if (rng.chance(0.35)) addFriend(ctx, 'neighborhood', { ageSpread: 8 });
}

const EVENTS = [
  { id: 'scam', icon: '📞', title: 'A Call from "Your Bank"', text: 'A polite caller says your account is compromised and you must move your savings to a "safe account" today.', options: [
    { id: 'hangup', label: '📵 Hang up and call the bank yourself', text: 'It was a scam. The bank thanked you; your neighbour wasn\'t so lucky.', happiness: 1 },
    { id: 'move', label: '💸 Do as they say', tone: 'danger', lose: 0.3, text: 'The money was gone by the evening. The police said it happens every day.' },
  ] },
  { id: 'reunion', icon: '🎉', title: 'A Class Reunion', text: 'Fifty years since you finished school. The invitation is on the fridge.', options: [
    { id: 'go', label: '🎉 Go', text: 'Everyone had gone grey, and nobody had changed at all.', happiness: 5, friend: true },
    { id: 'skip', label: '🏠 Skip it', text: 'You looked at the photos online instead.' },
  ] },
  { id: 'scare', icon: '🩺', title: 'A Health Scare', text: 'A routine check-up found something the doctor wants to look at more closely.', options: [
    { id: 'tests', label: '🔬 Have every test', text: 'It was caught early, and treated. You eat better now.', health: 3, stress: 4 },
    { id: 'wait', label: '🤞 Wait and see', tone: 'danger', text: 'It went away on its own — this time.', risk: { chance: 0.3, health: -15, text: 'It didn\'t go away. By the time you went back it was serious.' } },
  ] },
  { id: 'senior', icon: '♟️', title: 'The Senior Centre', text: 'The centre down the road runs chess, line dancing and a walking group.', options: [
    { id: 'join', label: '♟️ Join something', text: 'Tuesday chess became the highlight of your week.', happiness: 4, friend: true },
    { id: 'no', label: '🙅 Not for you', text: 'You kept your own company.' },
  ] },
  { id: 'grandkid', icon: '🎓', title: 'A Grandchild\'s Milestone', needsGrandkids: true, text: 'Your grandchild is graduating and money is tight for the family.', options: [
    { id: 'gift', label: '💝 Give $5,000 towards their future', cost: 5000, text: 'They hugged you for a long time.', happiness: 5, family: 6 },
    { id: 'card', label: '💌 A card and your love', text: 'They kept the card.', happiness: 2 },
  ] },
];

function eventYear(ctx) {
  const { state, rng } = ctx;
  if (state.prompts.some((p) => p.type === 'retirementLife.event') || !rng.chance(0.45)) return;
  const pool = EVENTS.filter((e) => !e.needsGrandkids || grandkids(state));
  const e = rng.pick(pool);
  ctx.prompt({ type: 'retirementLife.event', icon: e.icon, title: e.title, text: e.text, options: e.options.map(({ id, label, tone }) => ({ id, label, tone })), data: { id: e.id } });
}

export const RetirementLifeModule = {
  id: 'retirementLife',
  order: 86,
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!inRetirement(ctx.state) || state.legal?.incarceration) return;
    rhythmYear(ctx);
    communityYear(ctx);
    eventYear(ctx);
  },
  actions: {
    rhythm(ctx, id) {
      const { state } = ctx;
      if (!inRetirement(state)) return ctx.toast('Once you\'ve retired', 'warn');
      const r = RHYTHMS[id];
      if (!r) return undefined;
      if (r.needsGrandkids && !grandkids(state)) return ctx.toast('No grandchildren yet', 'warn');
      rl(state).rhythm = id;
      return ctx.log(`Retirement: ${r.label.replace(/^\S+ /, '').toLowerCase()} from now on.`, '🌅', 'info');
    },
    bucket(ctx, id) {
      const { state } = ctx;
      const b = BUCKET[id];
      const r = rl(state);
      if (!b || !inRetirement(state)) return ctx.toast('Once you\'ve retired', 'warn');
      if (r.bucket[id] != null) return ctx.toast('Already done', 'warn');
      if (yearlyCount(state, 'retirementLife.bucket')) return ctx.toast('One a year', 'warn');
      if (b.minFitness && state.stats.fitness < b.minFitness) return ctx.toast(`Fitness ${b.minFitness}+`, 'warn');
      if (b.cost && !ctx.spend(b.cost, b.label.replace(/^\S+ /, ''), { allowDebt: false })) return ctx.toast(`About $${b.cost.toLocaleString()}`, 'warn');
      bumpYearly(state, 'retirementLife.bucket');
      r.bucket[id] = state.character.age;
      for (const k of ['happiness', 'smarts', 'fitness']) if (b[k]) ctx.stat(k, b[k]);
      if (b.buzz) ctx.emit('fame:buzz', { amount: b.buzz });
      return ctx.log(b.text, b.label.split(' ')[0], 'milestone');
    },
    /** Move into a retirement community (or leave it). */
    community(ctx) {
      const { state } = ctx;
      const r = rl(state);
      if (r.community) {
        r.community = null;
        return ctx.log('You moved out of the retirement community.', '🏠', 'info');
      }
      if (!inRetirement(state) || state.character.age < 60) return ctx.toast('From 60, in retirement', 'warn');
      if (state.finances.cash < COMMUNITY_FEE) return ctx.toast(`About $${COMMUNITY_FEE.toLocaleString()} a year`, 'warn');
      r.community = { since: state.character.age, fee: COMMUNITY_FEE };
      return ctx.log('You moved into a retirement community: a flat with a view of the gardens, a dining room, a pool, and a nurse on call.', '🏡', 'milestone');
    },
    /** Move near the grandchildren. */
    nearFamily(ctx) {
      const { state } = ctx;
      if (!inRetirement(state) || !grandkids(state)) return ctx.toast('Retired, with grandchildren', 'warn');
      if (yearlyCount(state, 'retirementLife.move')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'retirementLife.move');
      if (!ctx.spend(8000, 'Moving near the family', { allowDebt: false })) return ctx.toast('Moving costs about $8,000', 'warn');
      for (const c of living(state).filter((p) => p.relation === 'child' && p.kids?.length)) c.relationship = clamp((c.relationship ?? 60) + 10, 0, 100);
      ctx.stat('happiness', 6);
      return ctx.log('You sold up and moved ten minutes from the grandchildren. Sunday lunch is at yours now.', '🏡', 'milestone');
    },
  },
  resolvers: {
    event(ctx, data, optionId) {
      const { state, rng } = ctx;
      const e = EVENTS.find((x) => x.id === data.id);
      const o = e?.options.find((x) => x.id === optionId);
      if (!o) return undefined;
      if (o.cost && !ctx.spend(o.cost, e.title, { allowDebt: false })) { ctx.log('You couldn\'t spare it after all.', '💌', 'info'); return undefined; }
      if (o.lose) {
        const lost = Math.round(Math.max(0, state.finances.cash) * o.lose);
        state.finances.cash -= lost;
        ctx.stat('happiness', -8);
        ctx.stat('stress', 10);
        ctx.log(`${o.text} You lost $${lost.toLocaleString()}.`, '📞', 'bad');
        return undefined;
      }
      for (const k of ['happiness', 'stress', 'health']) if (o[k]) ctx.stat(k, o[k]);
      if (o.friend) addFriend(ctx, 'neighborhood', { ageSpread: 6 });
      if (o.family) for (const c of living(state).filter((p) => p.relation === 'child')) c.relationship = clamp((c.relationship ?? 60) + o.family, 0, 100);
      ctx.log(o.text, e.icon, 'info');
      if (o.risk && rng.chance(o.risk.chance)) { ctx.stat('health', o.risk.health); ctx.log(o.risk.text, '🩺', 'bad'); }
      return undefined;
    },
  },
};

/** For the view. */
export function retirementLifeSummary(state) {
  if (!inRetirement(state)) return null;
  const r = rl(state);
  return { r, grandkids: grandkids(state), rhythms: RHYTHMS, bucket: BUCKET, communityFee: COMMUNITY_FEE, bucketThisYear: Boolean(state.yearly['retirementLife.bucket']) };
}
export { ageOf };
