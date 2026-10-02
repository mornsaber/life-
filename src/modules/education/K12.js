/**
 * K-12: the kind of school you attend (public, magnet, charter, religious,
 * private, boarding, military prep, online, homeschool), high-school GPA,
 * extracurriculars, teen part-time jobs, dropping out and the GED.
 *
 * Runs before the college engine (order 9). Graduation happens here at 18:
 * the diploma carries your high-school GPA, which college admissions read.
 *
 * state.k12 = {
 *   type, payer: 'free'|'parents'|'aid'|'self', gpa, hsYears, studied, skipped,
 *   activities: [id], job: { id, since } | null, jobYears, resume,
 *   suspensions, expelled, dropout, history: [{ type, age }],
 * }
 */
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { clamp } from '../../core/Random.js';

export const SCHOOL_TYPES = {
  public: { name: 'Public school', icon: '🏫', tuition: 0, rigor: 0, smarts: 0, desc: 'Free, close to home, a bit of everything' },
  magnet: { name: 'Magnet / STEM school', icon: '🔬', tuition: 0, minAge: 11, minSmarts: 65, rigor: 0.3, smarts: 1, collegeBonus: 3, desc: 'Free and selective: entrance exam, heavy workload' },
  charter: { name: 'Charter school', icon: '🎒', tuition: 0, lottery: 0.45, rigor: 0.1, smarts: 0.5, desc: 'Free; admission by lottery' },
  religious: { name: 'Religious school', icon: '⛪', tuition: 9000, rigor: 0.1, smarts: 0.5, happiness: 1, desc: 'Parochial school: small classes, uniforms, discipline' },
  private: { name: 'Private day school', icon: '🏛️', tuition: 28000, minSmarts: 50, rigor: 0.2, smarts: 1, collegeBonus: 4, desc: 'College-prep, well connected' },
  boarding: { name: 'Boarding school', icon: '🏰', tuition: 65000, minAge: 13, minSmarts: 60, rigor: 0.3, smarts: 1.5, fitness: 1, collegeBonus: 7, away: true, desc: 'Elite prep, living on campus' },
  militaryPrep: { name: 'Military prep academy', icon: '🎖️', tuition: 38000, minAge: 12, rigor: 0.2, smarts: 0.5, fitness: 2, nomination: 0.15, away: true, desc: 'Structure, drill and fitness; strong academy pipeline' },
  online: { name: 'Online school', icon: '💻', tuition: 0, rigor: -0.1, smarts: 0, happiness: -1, desc: 'Free virtual public school, at your own pace' },
  homeschool: { name: 'Homeschool', icon: '🏡', tuition: 1500, rigor: 0, smarts: 0.5, happiness: -1, desc: 'Taught at home; results depend on you' },
};

/** What families pay toward tuition by wealth tier. */
export const FAMILY_BUDGET = { low: 2000, middle: 12000, upper: Infinity };

export const ACTIVITIES = {
  sports: { name: 'Varsity sports', icon: '🏈', minAge: 13, stats: { fitness: 3, happiness: 1 }, resume: 1 },
  band: { name: 'Band & orchestra', icon: '🎺', minAge: 10, stats: { smarts: 1, happiness: 2 }, resume: 1 },
  debate: { name: 'Debate & Model UN', icon: '🎤', minAge: 13, stats: { smarts: 2 }, resume: 1.5 },
  robotics: { name: 'Robotics club', icon: '🤖', minAge: 12, stats: { smarts: 2 }, resume: 1.5 },
  drama: { name: 'Theater', icon: '🎭', minAge: 10, stats: { looks: 1, happiness: 2 }, resume: 1 },
  council: { name: 'Student council', icon: '🗳️', minAge: 12, stats: { happiness: 1 }, resume: 2 },
  jrotc: { name: 'JROTC', icon: '🎖️', minAge: 14, stats: { fitness: 2 }, resume: 1.5, nomination: 0.1 },
  scouts: { name: 'Scouting', icon: '⛺', minAge: 8, stats: { fitness: 1, happiness: 1 }, resume: 1 },
  volunteer: { name: 'Community service', icon: '🤝', minAge: 12, stats: { happiness: 2 }, resume: 1 },
};
export const MAX_ACTIVITIES = 3;

/** Teen part-time jobs: hourly wage, hours per week during the school year. */
export const TEEN_JOBS = {
  babysitter: { name: 'Babysitter', icon: '🍼', minAge: 12, wage: 13, hours: 6 },
  lawnCare: { name: 'Lawn mowing & yard work', icon: '🌱', minAge: 12, wage: 14, hours: 6 },
  dogWalker: { name: 'Dog walker', icon: '🐕', minAge: 12, wage: 12, hours: 5 },
  bagger: { name: 'Grocery bagger', icon: '🛒', minAge: 14, wage: 13, hours: 12 },
  farmhand: { name: 'Farm hand', icon: '🚜', minAge: 14, wage: 13, hours: 12, fitness: 1 },
  fastFood: { name: 'Fast-food crew', icon: '🍔', minAge: 15, wage: 14, hours: 15 },
  lifeguard: { name: 'Lifeguard', icon: '🏊', minAge: 15, wage: 16, hours: 12, minFitness: 55, fitness: 1 },
  cashier: { name: 'Retail cashier', icon: '🛍️', minAge: 16, wage: 15, hours: 15 },
  tutor: { name: 'Tutor', icon: '📚', minAge: 16, wage: 22, hours: 5, minSmarts: 70, smarts: 1 },
  counselor: { name: 'Summer camp counselor', icon: '🏕️', minAge: 16, wage: 14, hours: 8 },
};
const WORK_WEEKS = 46;
export const GED_FEE = 150;
/** Most states subsidize the GED for young adults. */
export const gedFee = (state) => (state.character.age < 21 ? 0 : GED_FEE);

export const gradeLabel = (age) => (age <= 4 ? 'Preschool' : age === 5 ? 'Kindergarten' : `Grade ${age - 5}`);
export const inK12 = (state) => Boolean(state.k12) && state.character.age >= 5 && state.character.age < 18 && !state.k12.dropout && !state.legal.incarceration;
export const hasDiploma = (state) => state.education.degrees.some((d) => d.type === 'highschool' || d.type === 'ged');
export const teenJobPay = (job) => job.wage * job.hours * WORK_WEEKS;

/** Admission bonus a college sees from where you went to high school (0–0.28). */
export function prepBonus(state) {
  const hs = state.education.degrees.find((d) => d.type === 'highschool');
  const type = SCHOOL_TYPES[hs?.k12 ?? state.k12?.type];
  return ((type?.collegeBonus ?? 0) + Math.min(4, state.k12?.resume ?? 0)) / 25;
}

/** Extra odds of a congressional nomination from high school (JROTC, military prep, activities). */
export function nominationBonus(state) {
  const k = state.k12;
  if (!k) return 0;
  return (SCHOOL_TYPES[k.type]?.nomination ?? 0) + (k.activities.includes('jrotc') || k.jrotcYears ? 0.1 : 0) + Math.min(0.12, k.resume * 0.015) + (k.gpa != null ? (k.gpa - 3) * 0.08 : 0);
}

/** Who pays tuition at a school type, or why you can't go. */
export function schoolAccess(state, typeId) {
  const t = SCHOOL_TYPES[typeId];
  const age = state.character.age;
  const k = state.k12;
  if (!t) return { ok: false, reason: 'Unknown school' };
  if (age < 5) return { ok: false, reason: 'School starts at 5' };
  if (age >= 18) return { ok: false, reason: 'Too old for K-12' };
  if (k.type === typeId && !k.dropout) return { ok: false, reason: 'Your current school' };
  if (t.minAge && age < t.minAge) return { ok: false, reason: `Ages ${t.minAge}+` };
  if (k.expelled && ['private', 'boarding', 'religious', 'magnet', 'militaryPrep'].includes(typeId)) return { ok: false, reason: 'Expelled students are turned away' };
  if (t.minSmarts && state.stats.smarts < t.minSmarts) return { ok: false, reason: `Entrance exam: smarts ${t.minSmarts}+` };
  if (!t.tuition) return { ok: true, payer: 'free', cost: 0 };
  const budget = FAMILY_BUDGET[state.people?.wealth ?? 'middle'] ?? FAMILY_BUDGET.middle;
  if (budget >= t.tuition) return { ok: true, payer: 'parents', cost: 0 };
  if (['private', 'boarding'].includes(typeId) && state.stats.smarts >= 78) return { ok: true, payer: 'aid', cost: 0, note: 'Need-based scholarship' };
  if (state.finances.cash >= t.tuition) return { ok: true, payer: 'self', cost: t.tuition, note: 'You pay' };
  return { ok: false, reason: `Your family can't afford $${t.tuition.toLocaleString()}/yr` };
}

function defaultK12(state) {
  return { type: 'public', payer: 'free', gpa: null, hsYears: 0, studied: false, skipped: 0, activities: [], job: null, jobYears: 0, resume: 0, suspensions: 0, expelled: false, dropout: false, history: [], done: state.character.age >= 18 };
}

function graduate(ctx) {
  const { state } = ctx;
  const k = state.k12;
  k.done = true;
  if (hasDiploma(state) || state.legal.incarceration) return;
  if (k.dropout) {
    ctx.log("You're 18 without a high-school diploma. A GED is still an option.", '📄', 'warn');
    return;
  }
  if (k.gpa != null && k.gpa < 1.0) {
    k.dropout = true;
    ctx.log(`You failed too many classes to graduate (GPA ${k.gpa.toFixed(2)}). You can still earn a GED.`, '📄', 'bad');
    ctx.stat('happiness', -6);
    return;
  }
  const gpa = k.gpa ?? 3.0;
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', major: null, year: state.character.age, gpa, k12: k.type });
  const honors = gpa >= 3.8 ? ' with honors' : '';
  ctx.log(`You graduated from ${SCHOOL_TYPES[k.type].name.toLowerCase()}${honors}! 🎓 GPA ${gpa.toFixed(2)}. Your family chipped in $2,000 to get you started.`, '🎓', 'milestone');
  state.finances.cash += 2000;
  ctx.stat('happiness', 5);
}

function changeSchool(ctx, typeId, access, why = '') {
  const { state } = ctx;
  const k = state.k12;
  k.history.push({ type: k.type, age: state.character.age });
  if (k.history.length > 12) k.history.shift();
  k.type = typeId;
  k.payer = access.payer;
  k.dropout = false;
  const t = SCHOOL_TYPES[typeId];
  ctx.log(`${why}You started at a ${t.name.toLowerCase()}${access.note ? ` (${access.note.toLowerCase()})` : ''}.`, t.icon, 'milestone');
}

export const K12Engine = {
  id: 'k12',
  order: 9,

  init(state) {
    state.k12 ??= defaultK12(state);
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const k = state.k12;
    const age = state.character.age;
    if (k.job && (age > 18 || state.legal.incarceration)) k.job = null;
    if (!k.done && age > 18) k.done = true; // adults who skipped ahead (old saves)
    if (k.done || age < 6) {
      if (age >= 18) k.job = null;
      if (age === 5) ctx.log('You started kindergarten.', '🎒', 'milestone');
      return;
    }
    if (state.legal.incarceration) {
      k.activities = [];
      if (age >= 18) k.done = true;
      return;
    }
    const t = SCHOOL_TYPES[k.type];
    const prev = age - 1; // the school year just finished

    if (!k.dropout) {
      // Tuition for the year: parents, a scholarship or your own savings.
      if (k.payer === 'self') {
        if (!ctx.spend(t.tuition, `${t.name} tuition`)) {
          changeSchool(ctx, 'public', { payer: 'free' }, "You couldn't cover tuition. ");
        }
      }
      const growth = (SCHOOL_TYPES[k.type].smarts ?? 0) + (k.type === 'homeschool' ? rng.float(-1, 1.5) : 0);
      if (growth) ctx.stat('smarts', Math.round(growth + rng.float(-0.4, 0.4)));
      if (t.fitness) ctx.stat('fitness', t.fitness);
      if (t.happiness) ctx.stat('happiness', t.happiness);
      for (const id of k.activities) {
        const a = ACTIVITIES[id];
        for (const [stat, d] of Object.entries(a.stats)) ctx.stat(stat, d);
        k.resume = Math.round((k.resume + a.resume * (prev >= 14 ? 1 : 0.4)) * 10) / 10;
        if (id === 'jrotc') k.jrotcYears = (k.jrotcYears ?? 0) + 1;
      }
      // High school (grades 9–12) is graded.
      if (prev >= 14 && prev <= 17) {
        const jobDrag = k.job ? Math.max(0, TEEN_JOBS[k.job.id].hours - 10) * 0.025 : 0;
        const yearGpa = clamp(0.7 + state.stats.smarts / 34 + (k.studied ? 0.45 : 0) - k.skipped * 0.25 - (t.rigor ?? 0) * 0.35 - jobDrag
          - Math.max(0, state.stats.stress - 65) / 60 + rng.float(-0.45, 0.4), 0, 4);
        k.gpa = Math.round((((k.gpa ?? 0) * k.hsYears + yearGpa) / (k.hsYears + 1)) * 100) / 100;
        k.hsYears += 1;
        if (yearGpa < 1.2) ctx.log(`Rough year: you failed several classes (${yearGpa.toFixed(1)} GPA).`, '📉', 'bad');
        else if (yearGpa >= 3.9) ctx.log('Straight A\'s this year.', '🅰️', 'good');
        // ≈1 in 8 students leave without graduating on time: failing grades,
        // money pressure at home and unhappiness all raise the odds.
        if (age >= 16 && age < 18 && !k.studied) {
          const risk = 0.025 + (k.gpa < 1.4 ? 0.25 : k.gpa < 2.2 ? 0.08 : 0) + (state.people?.wealth === 'low' ? 0.04 : 0)
            + (state.stats.happiness < 30 ? 0.05 : 0) + (k.job && TEEN_JOBS[k.job.id].hours >= 15 ? 0.02 : 0);
          if (rng.chance(risk)) {
            k.dropout = true;
            k.activities = [];
            ctx.log(k.gpa < 2.2 ? 'Failing and fed up, you dropped out of high school.' : 'You dropped out of high school to work and help out at home.', '🚪', 'bad');
          }
        }
      }
      if (age === 14 && !k.dropout) ctx.log('You started high school.', '🏫', 'milestone');
    }

    // Part-time work.
    if (k.job) {
      const job = TEEN_JOBS[k.job.id];
      ctx.earn(teenJobPay(job), job.name, { wage: true });
      k.jobYears += 1;
      if (job.fitness) ctx.stat('fitness', job.fitness);
      if (job.smarts) ctx.stat('smarts', job.smarts);
      ctx.stat('happiness', 1);
    }

    k.studied = false;
    k.skipped = 0;
    if (age >= 18) {
      k.job = null;
      k.activities = [];
      graduate(ctx);
    }
  },

  actions: {
    transfer(ctx, typeId) {
      const { state, rng } = ctx;
      const access = schoolAccess(state, typeId);
      if (!access.ok) return ctx.toast(access.reason, 'warn');
      if (yearlyCount(state, 'k12.transfer')) return ctx.toast('You already changed schools this year.', 'warn');
      bumpYearly(state, 'k12.transfer');
      const t = SCHOOL_TYPES[typeId];
      if (t.lottery && !rng.chance(t.lottery)) {
        ctx.log(`You lost the ${t.name.toLowerCase()} admission lottery.`, '🎟️', 'warn');
        return ctx.toast('Lost the lottery — try next year', 'warn');
      }
      if (t.minSmarts && !rng.chance(clamp(0.45 + (state.stats.smarts - t.minSmarts) / 30, 0.15, 0.95))) {
        ctx.log(`${t.name} turned down your application.`, '📭', 'warn');
        return ctx.toast('Application declined', 'warn');
      }
      changeSchool(ctx, typeId, access);
      if (t.away) ctx.stat('happiness', -3);
    },
    study(ctx) {
      const { state } = ctx;
      if (!inK12(state)) return;
      if (state.k12.studied) return ctx.toast('Already hitting the books this year.', 'warn');
      state.k12.studied = true;
      ctx.stat('smarts', 1);
      ctx.stat('stress', 4);
      ctx.log('You buckled down on schoolwork.', '📖');
    },
    skip(ctx) {
      const { state, rng } = ctx;
      const k = state.k12;
      if (!inK12(state) || state.character.age < 11) return;
      if (k.skipped >= 2) return ctx.toast("You've ditched enough for one year.", 'warn');
      k.skipped += 1;
      ctx.stat('happiness', 3);
      if (rng.chance(0.25)) {
        k.suspensions += 1;
        ctx.stat('happiness', -4);
        if (k.suspensions >= 3 && !k.expelled) {
          k.expelled = true;
          ctx.log(`You were expelled from your ${SCHOOL_TYPES[k.type].name.toLowerCase()} for truancy.`, '🚫', 'bad');
          changeSchool(ctx, k.type === 'public' ? 'online' : 'public', { payer: 'free' }, '');
        } else ctx.log('You got caught ditching class and were suspended.', '🚫', 'bad');
      } else ctx.log('You ditched class and spent the day at the mall.', '🛹');
    },
    toggleActivity(ctx, id) {
      const { state } = ctx;
      const k = state.k12;
      const a = ACTIVITIES[id];
      if (!a || !inK12(state)) return;
      if (k.activities.includes(id)) {
        k.activities = k.activities.filter((x) => x !== id);
        return ctx.log(`You quit ${a.name.toLowerCase()}.`, a.icon);
      }
      if (state.character.age < a.minAge) return ctx.toast(`Ages ${a.minAge}+`, 'warn');
      if (k.activities.length >= MAX_ACTIVITIES) return ctx.toast(`You can juggle ${MAX_ACTIVITIES} activities at most.`, 'warn');
      if (id === 'sports' && state.stats.fitness < 45) return ctx.toast('You got cut at tryouts — get fitter.', 'warn');
      k.activities.push(id);
      ctx.log(`You joined ${a.name.toLowerCase()}.`, a.icon);
    },
    takeJob(ctx, id) {
      const { state, rng } = ctx;
      const job = TEEN_JOBS[id];
      const k = state.k12;
      const age = state.character.age;
      if (!job || age >= 18) return;
      if (age < job.minAge) return ctx.toast(`Ages ${job.minAge}+`, 'warn');
      if (state.career.job) return ctx.toast('You already have a job.', 'warn');
      if (job.minFitness && state.stats.fitness < job.minFitness) return ctx.toast(`Needs fitness ${job.minFitness}+ for the swim test`, 'warn');
      if (job.minSmarts && state.stats.smarts < job.minSmarts) return ctx.toast(`Needs smarts ${job.minSmarts}+`, 'warn');
      if (yearlyCount(state, 'k12.job')) return ctx.toast('You already job-hunted this year.', 'warn');
      bumpYearly(state, 'k12.job');
      if (!rng.chance(job.minAge >= 15 ? 0.75 : 0.9)) {
        ctx.log(`You didn't get the ${job.name.toLowerCase()} job.`, '📭', 'warn');
        return ctx.toast('Not hired this time', 'warn');
      }
      k.job = { id, since: age };
      ctx.log(`You got a part-time job: ${job.name} (~$${teenJobPay(job).toLocaleString()}/yr).`, job.icon, 'good');
    },
    quitJob(ctx) {
      const k = ctx.state.k12;
      if (!k.job) return;
      ctx.log(`You quit your job as a ${TEEN_JOBS[k.job.id].name.toLowerCase()}.`, '👋');
      k.job = null;
    },
    dropOut(ctx) {
      const { state } = ctx;
      if (!inK12(state)) return;
      if (state.character.age < 16) return ctx.toast('You must stay in school until 16.', 'warn');
      state.k12.dropout = true;
      state.k12.activities = [];
      ctx.stat('happiness', 2);
      ctx.log('You dropped out of high school.', '🚪', 'bad');
    },
    reenroll(ctx) {
      const { state } = ctx;
      const k = state.k12;
      if (!k.dropout || state.character.age >= 18 || hasDiploma(state)) return;
      if (yearlyCount(state, 'k12.transfer')) return ctx.toast('Try again next year.', 'warn');
      bumpYearly(state, 'k12.transfer');
      changeSchool(ctx, 'public', { payer: 'free' }, 'You went back to school. ');
    },
    ged(ctx) {
      const { state, rng } = ctx;
      const age = state.character.age;
      if (hasDiploma(state)) return ctx.toast('You already have a diploma.', 'warn');
      if (age < 16 || (age < 18 && !state.k12.dropout)) return ctx.toast('The GED is for those 16+ who left school.', 'warn');
      if (yearlyCount(state, 'k12.ged')) return ctx.toast('You can retake the GED next year.', 'warn');
      const fee = gedFee(state);
      if (fee && !ctx.spend(fee, 'GED exam')) return ctx.toast(`The exam costs $${fee}.`, 'warn');
      bumpYearly(state, 'k12.ged');
      if (rng.chance(clamp(0.3 + state.stats.smarts / 120, 0.2, 0.95))) {
        state.k12.done = true;
        state.k12.dropout = false;
        ctx.emit('education:grantDiploma', { type: 'ged', note: 'You passed the GED. 🎓' });
      } else ctx.log('You failed part of the GED. You can retake it next year.', '📄', 'warn');
    },
  },
};

