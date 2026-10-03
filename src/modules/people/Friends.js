/**
 * Friend groups. Every friend belongs to a circle — where you met — and
 * circles grow on their own while you are part of that world (school,
 * college, work, the service, a congregation, volunteering).
 *
 * Friends move away (and sometimes back), ask for help, and drift out of
 * your life when nobody makes the effort. School reunions come around every
 * ten years. Having no close friends is its own health risk.
 *
 * Person fields added here: circle, away, owes { amount, sinceAge }.
 */
import { yearlyCount, isIncarcerated, netWorth } from '../../core/State.js';
import { living, ageOf, partnerOf, clampRel } from './People.js';
import { makePerson } from './PeopleEngine.js';

export const CIRCLES = {
  childhood: { label: 'Childhood friends', icon: '🧸' },
  school: { label: 'School friends', icon: '🏫' },
  college: { label: 'College friends', icon: '🎓' },
  work: { label: 'Work friends', icon: '💼' },
  military: { label: 'Service buddies', icon: '🎖️' },
  faith: { label: 'Congregation', icon: '🙏' },
  volunteer: { label: 'Volunteer friends', icon: '🤲' },
  neighborhood: { label: 'Neighborhood & other', icon: '🏘️' },
};

export const FRIEND_CAP = 10;
const AUTO_CAP = 8;

export const friendsOf = (state) => living(state).filter((p) => p.relation === 'friend' && ageOf(state, p) >= 0);
/** Friends who count against the cap (exes who stayed friends don't). */
export const circleFriends = (state) => friendsOf(state).filter((f) => !f.formerPartner);
export const closeFriends = (state) => friendsOf(state).filter((f) => f.relationship >= 50);
const inCircle = (state, circle) => friendsOf(state).filter((f) => (f.circle ?? 'neighborhood') === circle);

/** Remove a friend from your life (kept when they're a parent of your child — that tie doesn't end). */
export function dropFriend(state, f) {
  if (state.people.list.some((p) => p.otherParentId === f.id)) {
    f.relationship = Math.min(f.relationship, 10);
    return false;
  }
  state.people.list.splice(state.people.list.indexOf(f), 1);
  // They also stop working for you.
  const biz = state.business?.current;
  if (biz) biz.family = biz.family.filter((id) => id !== f.id);
  return true;
}

/** The circle you'd meet someone in right now. */
export function currentCircle(state) {
  const age = state.character.age;
  if (age < 18 && state.k12 && !state.k12.done) return age < 10 ? 'childhood' : 'school';
  if (state.education?.enrolled && age < 30) return 'college';
  if (state.military?.service?.component === 'active') return 'military';
  if (state.career?.job) return 'work';
  return 'neighborhood';
}

/** Add a friend in a circle (other modules call this, e.g. congregations). */
export function addFriend(ctx, circle, { relationship, ageSpread = 4, quiet = false } = {}) {
  const { state, rng } = ctx;
  if (circleFriends(state).length >= FRIEND_CAP) return null;
  const friend = makePerson(ctx, { relation: 'friend', age: Math.max(5, state.character.age + rng.int(-ageSpread, ageSpread)), relationship: relationship ?? rng.int(45, 70), circle, metAge: state.character.age });
  state.people.list.push(friend);
  if (!quiet) ctx.log(`You became friends with ${friend.firstName}${circle !== 'neighborhood' ? ` (${CIRCLES[circle].label.toLowerCase().replace(/s$/, '')})` : ''}.`, '🤝', 'good');
  return friend;
}

/* ------------------------------------------------------------------ */
/* Yearly                                                              */
/* ------------------------------------------------------------------ */

/** Circles fill in while you're part of them. */
function meetPeople(ctx) {
  const { state, rng } = ctx;
  if (isIncarcerated(state) || circleFriends(state).length >= AUTO_CAP || state.character.age < 6) return;
  const circle = currentCircle(state);
  const odds = { childhood: 0.35, school: 0.35, college: 0.35, military: 0.25, work: 0.12, neighborhood: 0.04 }[circle] ?? 0;
  if (inCircle(state, circle).length < 2 && rng.chance(odds)) addFriend(ctx, circle, { ageSpread: circle === 'work' ? 10 : 1 });
}

/** Adult friends move for jobs, partners and cheaper rent; some come back. */
function movesTick(ctx) {
  const { state, rng } = ctx;
  for (const f of friendsOf(state)) {
    const age = ageOf(state, f);
    if (age < 18) continue;
    if (!f.away && rng.chance(age <= 30 ? 0.1 : 0.04)) {
      f.away = true;
      ctx.log(`${f.firstName} moved ${rng.pick(['across the country', 'to the coast', 'back home', 'overseas for work', 'three states away'])}.`, '📦', 'warn');
      ctx.stat('happiness', f.relationship >= 60 ? -3 : -1);
    } else if (f.away && rng.chance(0.04)) {
      f.away = false;
      ctx.log(`${f.firstName} moved back to town!`, '🏡', 'good');
    }
  }
}

/** Neglected friendships fade faster at a distance and eventually end. */
function driftTick(ctx) {
  const { state, rng } = ctx;
  for (const f of friendsOf(state)) {
    const tended = yearlyCount(state, `people.time.${f.id}`) > 0;
    if (f.away && !tended) f.relationship = clampRel(f.relationship - rng.int(1, 3));
    if (f.owes && state.character.age - f.owes.sinceAge >= 1) {
      if (rng.chance(0.35)) {
        state.finances.cash += f.owes.amount;
        ctx.log(`${f.firstName} paid back the $${f.owes.amount.toLocaleString()} you lent them.`, '💵', 'good');
        f.relationship = clampRel(f.relationship + 5);
        delete f.owes;
      } else if (state.character.age - f.owes.sinceAge >= 4) {
        ctx.log(`You've given up on the $${f.owes.amount.toLocaleString()} ${f.firstName} owes you.`, '💸', 'warn');
        f.relationship = clampRel(f.relationship - 10);
        delete f.owes;
      }
    }
    if (f.relationship <= 8 && !tended && dropFriend(state, f)) ctx.log(`You and ${f.firstName} lost touch.`, '🍂', 'muted');
  }
}

/** Social connection: isolation hurts health about as much as smoking; a few close friends help. */
function connectionTick(ctx) {
  const { state } = ctx;
  if (state.character.age < 25) return;
  const close = closeFriends(state).length;
  if (close === 0 && !partnerOf(state)) {
    ctx.stat('happiness', -3);
    ctx.stat('stress', 3);
    if (state.character.age >= 60) ctx.stat('health', -1);
    if (state.character.age % 5 === 0) ctx.log('You realize you have no one to call. Loneliness has crept in.', '🌧️', 'warn');
  } else if (close >= 3) ctx.stat('happiness', 2);
}

const HELP = [
  { id: 'loan', icon: '💵', title: 'A Friend Needs Money', text: (f, d) => `${f.firstName} lost their job and asks to borrow $${d.amount.toLocaleString()} for rent.` },
  { id: 'crisis', icon: '📞', title: 'A 2 A.M. Call', text: (f) => `${f.firstName} calls in the middle of the night. They're not okay, and they don't know who else to call.` },
  { id: 'moving', icon: '📦', title: 'Moving Day', text: (f) => `${f.firstName} is moving and needs a hand with the heavy stuff this weekend.` },
  { id: 'sick', icon: '🏥', title: 'Bad News', text: (f) => `${f.firstName} was diagnosed with cancer and starts chemo next month.` },
  { id: 'wedding', icon: '💐', title: 'Wedding Party', text: (f) => `${f.firstName} is getting married and wants you in the wedding party (travel, outfit and the bachelor/bachelorette weekend: ≈$1,500).` },
];

function helpTick(ctx) {
  const { state, rng } = ctx;
  if (isIncarcerated(state) || state.character.age < 16 || state.prompts.some((p) => p.type === 'friends.help')) return;
  const pool = friendsOf(state).filter((f) => f.relationship >= 35 && ageOf(state, f) >= 16);
  if (!pool.length || !rng.chance(0.08)) return;
  const friend = rng.pick(pool);
  const kinds = HELP.filter((h) => (h.id !== 'loan' || ageOf(state, friend) >= 21) && (h.id !== 'sick' || ageOf(state, friend) >= 30) && (h.id !== 'wedding' || ageOf(state, friend) <= 45));
  const kind = rng.pick(kinds);
  const data = { personId: friend.id, kind: kind.id, amount: kind.id === 'loan' ? rng.int(10, 60) * 100 : 0 };
  const options = {
    loan: [{ id: 'help', label: `🤝 Lend $${data.amount.toLocaleString()}`, hint: 'Maybe you\'ll see it again' }, { id: 'gift', label: '🎁 Give $500, no strings' }, { id: 'no', label: '🙅 Say no' }],
    crisis: [{ id: 'help', label: '🚗 Drive over and stay with them', hint: 'Exhausting, but it matters' }, { id: 'refer', label: '☎️ Stay on the phone and connect them with 988' }, { id: 'no', label: '😴 Let it go to voicemail' }],
    moving: [{ id: 'help', label: '💪 Show up with gloves on' }, { id: 'gift', label: '🚚 Pay for movers ($500)' }, { id: 'no', label: '🙅 You\'re busy that weekend' }],
    sick: [{ id: 'help', label: '🫶 Drive them to treatments' }, { id: 'refer', label: '💌 Send a card and a meal train' }, { id: 'no', label: '😶 Keep your distance' }],
    wedding: [{ id: 'help', label: '🥂 Of course — I\'m in', hint: '≈$1,500' }, { id: 'no', label: '🙅 Decline (just attend)' }],
  }[kind.id];
  ctx.prompt({ type: 'friends.help', icon: kind.icon, title: kind.title, text: kind.text(friend, data), options, data });
}

/** High-school and college reunions every ten years. */
function reunionTick(ctx) {
  const { state, rng } = ctx;
  if (isIncarcerated(state)) return;
  const age = state.character.age;
  for (const d of state.education.degrees) {
    const kind = d.type === 'highschool' && d.programId === 'highschool' ? 'high school' : d.type === 'bachelor' ? 'college' : null;
    if (!kind || age - d.year <= 0 || (age - d.year) % 10 !== 0 || age - d.year > 50) continue;
    if (state.prompts.some((p) => p.type === 'friends.reunion')) return;
    const years = age - d.year;
    ctx.prompt({
      type: 'friends.reunion',
      icon: '🎉',
      title: `${years}-Year ${kind === 'college' ? 'College' : 'High School'} Reunion`,
      text: `Your ${kind} class is holding its ${years}-year reunion${rng.chance(0.5) ? ' in the old gym' : ' at a hotel ballroom'}.`,
      options: [
        { id: 'go', label: '🎉 Go', hint: 'Travel and tickets ≈$400' },
        { id: 'skip', label: '🛋️ Skip it' },
      ],
      data: { kind, years },
    });
    return;
  }
}

export const Friends = {
  id: 'friends',
  order: 13,

  setup(engine) {
    // When you move, most local friends stay behind; you may land near someone who moved away.
    engine.bus.on('region:changed', ({ ctx }) => {
      const { state, rng } = ctx;
      for (const f of friendsOf(state)) {
        if (!f.away && rng.chance(0.75)) f.away = true;
        else if (f.away && rng.chance(0.2)) {
          f.away = false;
          ctx.log(`${f.firstName} lives nearby now — you're neighbors again.`, '🏡', 'good');
        }
      }
    });
  },

  init(state) {
    for (const f of state.people?.list ?? []) if (f.relation === 'friend') f.circle ??= 'neighborhood';
  },

  onAgeUp(ctx) {
    if (!ctx.state.people) return;
    meetPeople(ctx);
    movesTick(ctx);
    driftTick(ctx);
    connectionTick(ctx);
    helpTick(ctx);
    reunionTick(ctx);
  },

  resolvers: {
    help(ctx, data, optionId) {
      const { state, rng } = ctx;
      const f = living(state).find((p) => p.id === data.personId);
      if (!f) return;
      const bump = (n) => (f.relationship = clampRel(f.relationship + n));
      if (optionId === 'no') {
        bump(data.kind === 'crisis' || data.kind === 'sick' ? -15 : -8);
        ctx.log(`You let ${f.firstName} down.`, '😞', 'warn');
        return;
      }
      if (data.kind === 'loan') {
        const amount = optionId === 'gift' ? 500 : data.amount;
        if (!ctx.spend(amount, `${optionId === 'gift' ? 'Gift' : 'Loan'} to ${f.firstName}`, { credit: true })) {
          bump(-3);
          return ctx.log(`You couldn't come up with the money for ${f.firstName}.`, '💸', 'warn');
        }
        if (optionId === 'help') f.owes = { amount, sinceAge: state.character.age };
        bump(optionId === 'gift' ? 8 : 12);
        return ctx.log(`You helped ${f.firstName} make rent.`, '🤝', 'good');
      }
      if (data.kind === 'wedding') {
        if (!ctx.spend(1500, `${f.firstName}'s wedding`, { credit: true })) {
          bump(-5);
          return ctx.log(`You couldn't afford to be in ${f.firstName}'s wedding party.`, '💸', 'warn');
        }
        bump(12);
        ctx.stat('happiness', 4);
        return ctx.log(`You stood up at ${f.firstName}'s wedding and gave a toast people still talk about.`, '🥂', 'good');
      }
      if (optionId === 'gift') {
        if (!ctx.spend(500, `Movers for ${f.firstName}`, { credit: true })) return ctx.log('Your card was declined.', '💳', 'warn');
        bump(6);
        return ctx.log(`You paid for ${f.firstName}'s movers.`, '🚚', 'good');
      }
      if (optionId === 'refer') {
        bump(data.kind === 'crisis' ? 6 : 4);
        return ctx.log(data.kind === 'crisis' ? `You stayed on the line until ${f.firstName} was talking to a 988 counselor.` : `You organized a meal train for ${f.firstName}.`, data.kind === 'crisis' ? '☎️' : '💌', 'good');
      }
      bump(rng.int(10, 15));
      if (data.kind === 'crisis') ctx.stat('stress', 4);
      if (data.kind === 'moving') ctx.stat('fitness', 1);
      if (data.kind === 'sick') ctx.stat('happiness', -2);
      ctx.stat('happiness', 2);
      ctx.log({ crisis: `You sat with ${f.firstName} until sunrise. They'll remember it.`, moving: `You hauled ${f.firstName}'s couch up three flights of stairs.`, sick: `You drove ${f.firstName} to every chemo appointment.` }[data.kind], '🫶', 'good');
    },

    reunion(ctx, data, optionId) {
      const { state, rng } = ctx;
      if (optionId === 'skip') return ctx.log(`You skipped your ${data.years}-year reunion.`, '🛋️', 'muted');
      if (!ctx.spend(400, 'Reunion', { credit: true })) return ctx.log('You couldn\'t afford the trip to your reunion.', '💸', 'warn');
      // How it feels depends on how life turned out compared with your classmates.
      const doingWell = netWorth(state) > 50000 * (data.years / 10) || Boolean(state.career.job && state.career.job.grade >= 6) || Boolean(state.business?.current);
      ctx.stat('happiness', doingWell ? rng.int(4, 8) : rng.int(-3, 3));
      const circle = data.kind === 'college' ? 'college' : 'school';
      const lost = friendsOf(state).find((f) => f.circle === circle && f.relationship < 40);
      if (lost) {
        lost.relationship = clampRel(lost.relationship + 20);
        ctx.log(`At your ${data.years}-year reunion you and ${lost.firstName} picked up right where you left off.`, '🎉', 'good');
      } else if (rng.chance(0.5) && circleFriends(state).length < FRIEND_CAP) {
        const old = addFriend(ctx, circle, { relationship: rng.int(50, 70), ageSpread: 1, quiet: true });
        if (old) ctx.log(`At your ${data.years}-year reunion you reconnected with ${old.firstName}, who sat behind you in ${rng.pick(['chemistry', 'homeroom', 'study hall', 'band'])}.`, '🎉', 'good');
      } else ctx.log(`Your ${data.years}-year reunion: ${doingWell ? 'you had stories worth telling.' : 'name tags, awkward small talk and a cash bar.'}`, '🎉');
    },
  },
};
