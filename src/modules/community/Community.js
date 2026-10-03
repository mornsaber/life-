/**
 * Faith and community: congregation membership, lay leadership, giving,
 * volunteering and mentoring — and what happens when a congregation splits
 * or you walk away from a high-control group.
 *
 * state.community = {
 *   upbringing        tradition you were raised in (null = none)
 *   faith             { traditionId, congregation, attendance, joinedAge, raised, role, devoutYears } | null
 *   giving            % of income given each year (tithing is 10)
 *   givenThisYear     dollars given this year (an itemized deduction)
 *   volunteering      [orgId] — at most two at a time
 *   volunteerYears    cumulative years of service
 *   mentoring         { since, mentee } | null
 *   former            [{ traditionId, leftAge, why }]
 * }
 *
 * Clergy careers live in the job tree (profession 'clergy'); ordination is
 * gated by clergyEligibility() and titles come from your tradition.
 */
import { Random } from '../../core/Random.js';
import { addHonor, hasFelony, isIncarcerated, bumpYearly, yearlyCount } from '../../core/State.js';
import { TRADITIONS, upbringing, congregationName, membership, newCommunity, LAY_ROLE } from './Religions.js';
import { living, parentsOf, spouseOf, minorChildren, clampRel } from '../people/People.js';
import { addFriend, friendsOf, dropFriend } from '../people/Friends.js';

export const ATTENDANCE = {
  devout: { label: 'Devout', icon: '🙏', desc: 'Services weekly and more: study groups, holy days, serving.', happiness: 2, stress: -3, load: 0.5 },
  regular: { label: 'Regular', icon: '⛪', desc: 'Most weeks.', happiness: 1, stress: -2, load: 0.25 },
  occasional: { label: 'Occasional', icon: '🕯️', desc: 'Holidays, weddings and funerals.', happiness: 0, stress: 0, load: 0 },
};

export const GIVING_LEVELS = [0, 2, 5, 10];

export const VOLUNTEER_ORGS = {
  foodBank: { name: 'Food bank', icon: '🥫', minAge: 12, desc: 'Sorting donations and serving meals.' },
  habitat: { name: 'Habitat for Humanity', icon: '🔨', minAge: 16, desc: 'Building homes on Saturdays.', fitness: 1 },
  tutoring: { name: 'Literacy tutoring', icon: '📖', minAge: 16, desc: 'Teaching adults and kids to read.', smarts: 1 },
  animalShelter: { name: 'Animal shelter', icon: '🐶', minAge: 14, desc: 'Walking dogs and socializing cats.' },
  hospice: { name: 'Hospice volunteer', icon: '🕊️', minAge: 18, desc: 'Sitting with the dying and their families.', stress: 1, happiness: 1 },
  crisisLine: { name: 'Crisis line (988)', icon: '☎️', minAge: 18, desc: 'Trained listener on overnight shifts.', stress: 2, happiness: 1 },
  campaign: { name: 'Community organizing', icon: '📣', minAge: 16, desc: 'Tenant unions, voter drives, town halls.' },
};

const fresh = (rng) => {
  const t = upbringing(rng);
  return newCommunity(t, t ? congregationName(rng, t) : null, 0);
};

export const CLERGY_PROFESSIONS = ['clergy', 'catholicClergy'];
export const isClergy = (state) => CLERGY_PROFESSIONS.includes(state.career.job?.professionId);

/* ------------------------------------------------------------------ */
/* Leaving a faith                                                     */
/* ------------------------------------------------------------------ */

/** Leave your congregation. High-control groups shun you; family raised in it takes it hard. */
export function leaveFaith(ctx, why) {
  const { state } = ctx;
  const c = state.community;
  const faith = c.faith;
  if (!faith) return;
  const t = TRADITIONS[faith.traditionId];
  c.former.push({ traditionId: faith.traditionId, leftAge: state.character.age, why });
  c.faith = null;
  c.giving = 0;
  const congregants = friendsOf(state).filter((f) => f.circle === 'faith');
  if (t.fundamentalist) {
    // Shunning: the congregation cuts you off, and so does family that stayed.
    for (const f of congregants) dropFriend(state, f);
    const hit = t.isolated ? 45 : 25;
    if (faith.raised) for (const p of living(state).filter((x) => ['mother', 'father', 'sibling'].includes(x.relation))) p.relationship = clampRel(p.relationship - hit);
    ctx.stat('happiness', -10);
    ctx.stat('stress', 10);
    ctx.emit('health:trauma', { amount: t.isolated ? 20 : 10, source: 'life' });
    ctx.log(`You left ${faith.congregation}. ${congregants.length ? 'Everyone you knew there stopped speaking to you' : 'The congregation declared you an outsider'}${faith.raised ? ', and your family was told to keep their distance' : ''}.`, '🚪', 'bad');
  } else {
    for (const f of congregants) f.relationship = clampRel(f.relationship - 8);
    if (faith.raised && faith.attendance === 'devout') for (const p of parentsOf(state).filter((x) => x.alive)) p.relationship = clampRel(p.relationship - 6);
    ctx.log(`You stopped going to ${faith.congregation}${why ? ` (${why})` : ''}.`, '🚪');
  }
  if (isClergy(state)) ctx.emit('career:resign', { reason: 'You left the ministry when you left the faith' });
}

/** Join (or convert to) a tradition. */
function joinFaith(ctx, traditionId) {
  const { state, rng } = ctx;
  const c = state.community;
  const t = TRADITIONS[traditionId];
  const age = state.character.age;
  if (c.faith) leaveFaith(ctx, `converted to ${t.name}`);
  const congregation = congregationName(rng, traditionId);
  const returning = c.upbringing === traditionId;
  c.faith = membership(traditionId, congregation, age, { raised: returning, attendance: t.fundamentalist ? 'devout' : 'regular' });
  if (t.fundamentalist) c.giving = Math.max(c.giving, 10);
  if (t.isolated) {
    for (const p of living(state).filter((x) => ['mother', 'father', 'sibling'].includes(x.relation))) p.relationship = clampRel(p.relationship - 15);
    for (const f of friendsOf(state).filter((x) => x.circle !== 'faith')) f.relationship = clampRel(f.relationship - 20);
    ctx.log(`You moved into ${congregation}. Contact with outsiders is discouraged.`, t.icon, 'warn');
  } else ctx.log(`${returning ? 'You returned to your roots and joined' : 'You joined'} ${congregation} (${t.name}).`, t.icon, 'milestone');
  ctx.stat('happiness', 3);
}

/* ------------------------------------------------------------------ */
/* Yearly                                                              */
/* ------------------------------------------------------------------ */

function comingOfAge(ctx) {
  const { state, rng } = ctx;
  const faith = state.community.faith;
  if (state.character.age !== 18 || !faith?.raised) return;
  const t = TRADITIONS[faith.traditionId];
  // About 3 in 10 raised religious leave as young adults (Pew); devout homes and isolated sects keep more.
  const leave = t.isolated ? 0.2 : faith.attendance === 'devout' ? 0.2 : 0.35;
  if (rng.chance(leave)) leaveFaith(ctx, 'drifted away after high school');
}

/** Some adults return to faith (or find one), most often once they have young kids. */
function returnTick(ctx) {
  const { state, rng } = ctx;
  const c = state.community;
  const age = state.character.age;
  if (c.faith || age < 22 || age > 70 || isIncarcerated(state)) return;
  const kids = minorChildren(state).length > 0;
  if (!rng.chance((kids ? 0.035 : 0.012) * (c.upbringing ? 1 : 0.4))) return;
  const left = c.former.at(-1);
  // Nobody wanders back into a high-control group they escaped.
  const traditionId = c.upbringing && !TRADITIONS[c.upbringing].fundamentalist ? c.upbringing : upbringing(rng);
  if (!traditionId || TRADITIONS[traditionId].fundamentalist || (left && left.traditionId === traditionId && left.why === 'your own choice')) return;
  joinFaith(ctx, traditionId);
  c.faith.attendance = 'occasional';
}

function faithTick(ctx) {
  const { state, rng } = ctx;
  const c = state.community;
  const faith = c.faith;
  if (!faith) return;
  const t = TRADITIONS[faith.traditionId];
  const a = ATTENDANCE[faith.attendance];
  ctx.stat('happiness', a.happiness);
  ctx.stat('stress', a.stress);
  if (faith.attendance === 'devout') faith.devoutYears += 1;
  // Congregations are where many adults make friends.
  if (faith.attendance !== 'occasional' && friendsOf(state).filter((f) => f.circle === 'faith').length < 2 && rng.chance(0.3)) addFriend(ctx, 'faith', { ageSpread: 15 });
  // Lay leadership after years of devotion.
  if (!faith.role && faith.devoutYears >= 5 && state.character.age >= 25 && !isClergy(state) && rng.chance(0.3)) {
    faith.role = t.clergy.lay ? (state.character.gender === 'male' ? 'Ward Bishop (lay)' : 'Relief Society President') : LAY_ROLE[t.group] ?? 'Lay Leader';
    ctx.log(`${faith.congregation} asked you to serve as ${faith.role}.`, t.icon, 'good');
    ctx.stat('happiness', 3);
  }
  // Schisms: congregations split over doctrine.
  if (t.schism && rng.chance(t.schism.risk * 0.03) && !state.prompts.some((p) => p.type === 'community.schism')) {
    const b = TRADITIONS[t.schism.breakaway];
    ctx.prompt({
      type: 'community.schism',
      icon: '⚡',
      title: 'Your Congregation Is Splitting',
      text: `After a bitter fight over ${t.schism.issue}, half of ${faith.congregation} is voting to leave ${t.name} and join ${b.name}.`,
      options: [
        { id: 'stay', label: `${t.icon} Stay with ${t.name}`, hint: 'Some friends will leave' },
        { id: 'follow', label: `${b.icon} Go with the breakaway`, hint: b.fundamentalist ? 'Stricter rules; leaving later means shunning' : 'A new congregation' },
        { id: 'leave', label: '🚪 Walk away from both' },
      ],
      data: { from: faith.traditionId, to: t.schism.breakaway },
    });
  }
}

/** Charitable giving: a share of last year's income, never into debt. */
function givingTick(ctx) {
  const { state } = ctx;
  const c = state.community;
  c.givenThisYear = 0;
  if (!c.giving || state.character.age < 18) return;
  const income = state.finances.lastYear?.gross ?? 0;
  const gift = Math.round(Math.min(income * c.giving / 100, Math.max(0, state.finances.cash - 2000)));
  if (gift < 50) return;
  ctx.spend(gift, c.faith ? `Tithes & offerings — ${c.faith.congregation}` : 'Charitable giving');
  c.givenThisYear = gift;
}

function serviceTick(ctx) {
  const { state, rng } = ctx;
  const c = state.community;
  if (isIncarcerated(state)) return;
  for (const id of c.volunteering) {
    const org = VOLUNTEER_ORGS[id];
    ctx.stat('happiness', 2 + (org.happiness ?? 0));
    ctx.stat('stress', (org.stress ?? 0) - 2);
    if (org.fitness) ctx.stat('fitness', org.fitness);
    if (org.smarts) ctx.stat('smarts', org.smarts);
  }
  if (c.volunteering.length) {
    c.volunteerYears += 1;
    if (c.volunteerYears === 5) honor(ctx, 'volunteer.pvsa', "President's Volunteer Service Award", '🤲', 2, ['#002868', '#ffffff', '#bf0a30'], 'Five years of service to the community.');
    if (c.volunteerYears === 20) honor(ctx, 'volunteer.lifetime', "President's Lifetime Achievement Award", '🏅', 5, ['#bf9b30', '#002868', '#bf9b30'], 'Twenty years of volunteer service.');
    if (friendsOf(state).filter((f) => f.circle === 'volunteer').length < 1 && rng.chance(0.2)) addFriend(ctx, 'volunteer', { ageSpread: 20 });
  }
  const m = c.mentoring;
  if (m) {
    c.mentorYears += 1;
    ctx.stat('happiness', 2);
    const years = state.character.age - m.since;
    if (years === 3) ctx.log(rng.chance(0.7) ? `${m.mentee}, your mentee, made the honor roll and wants to go to college.` : `${m.mentee} is struggling, but still shows up every week.`, '🌱');
    if (years === 8) {
      ctx.log(`${m.mentee} aged out of the program. They sent you a graduation photo with a thank-you note.`, '🎓', 'good');
      ctx.stat('happiness', 5);
      c.mentoring = { since: state.character.age, mentee: menteeName(ctx) };
    }
    if (c.mentorYears === 6) honor(ctx, 'mentor.year', 'Mentor of the Year', '🌱', 2, ['#2e7d32', '#ffffff', '#2e7d32'], 'Big Brothers Big Sisters recognized years of mentoring.');
  }
}

function honor(ctx, id, name, icon, prestige, ribbon, citation) {
  addHonor(ctx.state, { id, source: 'community', name, icon, ribbon, prestige, precedence: 40, citation });
  ctx.log(`You received the ${name}. ${citation}`, icon, 'honor');
}

const menteeName = (ctx) => ctx.rng.pick(['Jayden', 'Aaliyah', 'Marcus', 'Destiny', 'Luis', 'Kayla', 'Tyrell', 'Maria', 'DeShawn', 'Emily']);

/** Celibate clergy who marry are laicized; ministers without a congregation can't serve. */
function clergyTick(ctx) {
  const { state } = ctx;
  if (!isClergy(state)) return;
  const faith = state.community.faith;
  const t = faith && TRADITIONS[faith.traditionId];
  if (!faith) return ctx.emit('career:resign', { reason: 'You no longer belong to a faith' });
  if (t.clergy.celibate && spouseOf(state)) {
    ctx.log('Marrying broke your vow of celibacy. The bishop removed you from ministry (laicization).', '⛓️', 'bad');
    ctx.emit('career:resign', { reason: 'Laicized after marrying' });
    return;
  }
  conclave(ctx);
}

const PAPAL_NAMES = ['Leo', 'John', 'Paul', 'Benedict', 'Pius', 'Gregory', 'Clement', 'Innocent', 'Francis', 'Celestine'];

/** Cardinals under 80 vote in conclaves — and every so often, the smoke is white for you. */
function conclave(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  if (job.professionId !== 'catholicClergy' || job.levelId !== 'cardinal' || job.pope || state.character.age >= 80 || !rng.chance(0.06)) return;
  if (rng.chance(0.06)) {
    const name = `${rng.pick(PAPAL_NAMES)} ${rng.pick(['XIV', 'XV', 'XVI', 'XVII', 'II', 'III', 'XXIV', 'XIII', 'VII'])}`;
    job.pope = true;
    job.title = `Pope ${name}`;
    job.employer.name = 'The Holy See';
    addHonor(state, { id: 'catholic.pope', source: 'civil', name: 'Supreme Pontiff', icon: '🇻🇦', ribbon: ['#ffe000', '#ffffff', '#ffe000'], prestige: 100, precedence: 1, citation: `Elected Bishop of Rome, taking the name ${name}.` });
    ctx.log(`White smoke over the Sistine Chapel. The conclave elected you Bishop of Rome. You took the name ${name}.`, '🇻🇦', 'milestone');
    ctx.stat('happiness', 15);
  } else ctx.log('You traveled to Rome for a conclave and cast your ballots under Michelangelo\'s ceiling. Another cardinal was elected.', '⛪');
}

export const Community = {
  id: 'community',
  order: 14,

  setup(engine) {
    engine.bus.on('career:hired', ({ ctx, job }) => {
      // Clergy serve a congregation of their own tradition.
      if (!CLERGY_PROFESSIONS.includes(job.professionId)) return;
      const faith = ctx.state.community?.faith;
      // Returning from military leave to a pulpit you no longer believe in: the right to return lapses.
      if (!faith) return ctx.emit('career:resign', { reason: 'No longer a member of the faith' });
      // Dioceses keep their own names; other clergy serve a named congregation.
      if (job.professionId === 'clergy') job.employer.name = job.employer.size === 'small' ? faith.congregation : congregationName(ctx.rng, faith.traditionId);
    });
  },

  init(state, engineRng) {
    if (!state.community) {
      // A side stream, so adding this slice doesn't reshuffle every other roll in the life.
      const rng = new Random((engineRng.seed ^ 0x5eed) >>> 0);
      state.community = fresh(rng);
      // Adults from older saves: most raised in a faith still claim it.
      if (state.character.age >= 18 && state.community.faith && rng.chance(0.4)) {
        state.community.former.push({ traditionId: state.community.faith.traditionId, leftAge: 18, why: 'drifted away' });
        state.community.faith = null;
        state.community.giving = 0;
      }
    }
    state.community.mentorYears ??= 0;
  },

  guard(state, actionId) {
    if (['community.volunteer', 'community.mentor'].includes(actionId) && isIncarcerated(state)) return 'Not from prison.';
    return null;
  },

  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.community) return;
    comingOfAge(ctx);
    returnTick(ctx);
    faithTick(ctx);
    givingTick(ctx);
    serviceTick(ctx);
    clergyTick(ctx);
  },

  actions: {
    join(ctx, traditionId) {
      const { state } = ctx;
      const t = TRADITIONS[traditionId];
      if (!t) return;
      if (state.character.age < 16) return ctx.toast('You can choose your own faith at 16.', 'warn');
      if (state.community.faith?.traditionId === traditionId) return ctx.toast('You already belong.', 'warn');
      if (yearlyCount(state, 'community.join')) return ctx.toast('Give it a year before changing again.', 'warn');
      bumpYearly(state, 'community.join');
      joinFaith(ctx, traditionId);
    },
    leave(ctx) {
      if (!ctx.state.community.faith) return;
      if (ctx.state.character.age < 16) return ctx.toast('Your parents still decide that.', 'warn');
      leaveFaith(ctx, 'your own choice');
    },
    attendance(ctx, level) {
      const faith = ctx.state.community.faith;
      if (!faith || !ATTENDANCE[level]) return;
      faith.attendance = level;
      if (level !== 'devout') faith.devoutYears = Math.min(faith.devoutYears, 4);
      ctx.toast(`Attendance: ${ATTENDANCE[level].label}.`, 'info');
    },
    give(ctx, pct) {
      const n = Number(pct);
      if (!GIVING_LEVELS.includes(n)) return;
      ctx.state.community.giving = n;
      ctx.toast(n ? `You'll give ${n}% of your income each year.` : 'You stopped regular giving.', 'info');
    },
    stepDown(ctx) {
      const faith = ctx.state.community.faith;
      if (!faith?.role) return;
      ctx.log(`You stepped down as ${faith.role}.`, '🙏');
      faith.role = null;
      faith.devoutYears = 0;
    },
    /** Toggle a volunteer commitment. */
    volunteer(ctx, orgId) {
      const { state } = ctx;
      const c = state.community;
      const org = VOLUNTEER_ORGS[orgId];
      if (!org) return;
      if (c.volunteering.includes(orgId)) {
        c.volunteering = c.volunteering.filter((v) => v !== orgId);
        return ctx.log(`You stopped volunteering at the ${org.name.toLowerCase()}.`, org.icon);
      }
      if (state.character.age < org.minAge) return ctx.toast(`Volunteers must be ${org.minAge}+.`, 'warn');
      if (c.volunteering.length >= 2) return ctx.toast('Two volunteer commitments is plenty.', 'warn');
      if (orgId === 'crisisLine' && hasFelony(state)) return ctx.toast('The crisis line requires a clean background check.', 'warn');
      c.volunteering.push(orgId);
      ctx.log(`You started volunteering: ${org.name}.`, org.icon, 'good');
    },
    mentor(ctx) {
      const { state } = ctx;
      const c = state.community;
      if (c.mentoring) {
        ctx.log(`You said goodbye to ${c.mentoring.mentee}.`, '🌱');
        c.mentoring = null;
        return;
      }
      if (state.character.age < 21) return ctx.toast('Mentors must be 21+.', 'warn');
      if (hasFelony(state)) return ctx.toast('Mentoring programs require a clean background check.', 'warn');
      c.mentoring = { since: state.character.age, mentee: menteeName(ctx) };
      ctx.log(`Big Brothers Big Sisters matched you with ${c.mentoring.mentee}, age ${ctx.rng.int(8, 12)}.`, '🌱', 'good');
    },
  },

  resolvers: {
    schism(ctx, data, optionId) {
      const { state, rng } = ctx;
      const c = state.community;
      if (!c.faith) return;
      const congregants = friendsOf(state).filter((f) => f.circle === 'faith');
      // Roughly half your congregation goes the other way; those friendships take a hit.
      const split = (n) => congregants.filter(() => rng.chance(0.5)).forEach((f) => (f.relationship = clampRel(f.relationship - n)));
      if (optionId === 'stay') {
        split(15);
        ctx.log(`You stayed. ${c.faith.congregation} is half empty on Sundays now.`, '⚡', 'warn');
        return;
      }
      if (optionId === 'leave') {
        split(10);
        leaveFaith(ctx, 'the split was the last straw');
        return;
      }
      split(15);
      const old = c.faith.congregation;
      const t = TRADITIONS[data.to];
      c.faith = { ...c.faith, traditionId: data.to, congregation: congregationName(rng, data.to), role: null };
      if (t.fundamentalist) c.giving = Math.max(c.giving, 10);
      ctx.log(`You left ${old} with the breakaway and helped found ${c.faith.congregation} (${t.name}).`, t.icon, 'milestone');
      const job = state.career.job;
      if (isClergy(state)) {
        if (t.clergy.maleOnly && state.character.gender !== 'male') ctx.emit('career:resign', { reason: `${t.name} does not ordain women` });
        else {
          job.employer.name = c.faith.congregation;
          job.titleMap = t.clergy.titles;
        }
      }
    },
  },
};

export { TRADITIONS };
