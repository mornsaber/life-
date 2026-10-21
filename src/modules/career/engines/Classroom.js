/**
 * K-12 classrooms: each school year you get a class — named students with
 * their own needs (gifted, struggling, learning English, an IEP, the
 * troublemaker, the quiet one) — and choose how to teach: test prep,
 * engaging projects, or differentiated small groups. You can tutor one
 * student a year. The spring test decides your school's mood about you;
 * years later, a former student may come back to say thank you.
 *
 * state.careerLife.classroom = { professionId, approach, klass: { grade, students: [...] }, years: [{ age, grade, pass, avg }], alumni: [{ name, age }] }
 */
import { clamp } from '../../../core/Random.js';
import { yearlyCount, bumpYearly, randomName } from '../../../core/State.js';
import { lifeOf, peekLife, applyFx, skill } from './Kit.js';

/** growth by student need under each approach */
export const APPROACHES = {
  testPrep: { name: 'Teach to the test', icon: '📝', desc: 'Scores go up. Curiosity goes down.', growth: { gifted: 3, struggling: 8, ell: 6, iep: 4, troublemaker: 3, quiet: 6, typical: 7 }, engagement: -6, stress: 2 },
  engaging: { name: 'Projects & discussion', icon: '🧪', desc: 'Kids who love school. Scores catch up — mostly.', growth: { gifted: 9, struggling: 4, ell: 5, iep: 4, troublemaker: 7, quiet: 5, typical: 6 }, engagement: 8, stress: 3 },
  differentiated: { name: 'Small groups', icon: '👥', desc: 'Everyone at their level. Exhausting to plan.', growth: { gifted: 7, struggling: 8, ell: 8, iep: 8, troublemaker: 5, quiet: 7, typical: 6 }, engagement: 4, stress: 6 },
};
export const NEEDS = {
  gifted: { label: 'gifted', icon: '🌟', base: [78, 92] },
  struggling: { label: 'struggling', icon: '📉', base: [30, 50] },
  ell: { label: 'learning English', icon: '🗣️', base: [35, 55] },
  iep: { label: 'has an IEP', icon: '🧩', base: [35, 55] },
  troublemaker: { label: 'disruptive', icon: '😈', base: [45, 65] },
  quiet: { label: 'quiet', icon: '🤫', base: [55, 75] },
  typical: { label: '', icon: '🙂', base: [55, 75] },
};
const PASS = 60;

const isClassroom = (job) => job?.professionId === 'education' && job.track !== 'mgmt';
const fresh = () => ({ approach: 'engaging', klass: null, years: [], alumni: [] });

export function classroomView(state) {
  const job = state.career.job;
  if (!isClassroom(job)) return null;
  const rec = peekLife(state, 'classroom');
  return { rec: rec?.professionId === job.professionId ? rec : null };
}

function newClass(rng, state, rec) {
  const grade = rec.klass?.grade ?? rng.int(1, 12);
  const needs = ['gifted', 'struggling', 'ell', 'iep', 'troublemaker', 'quiet', 'typical', 'typical'];
  rec.klass = {
    grade,
    students: needs.map((need, i) => {
      const n = randomName(rng, rng.pick(['male', 'female']));
      return { id: `s${state.character.age}.${i}`, name: n.firstName, need, score: rng.int(...NEEDS[need].base), engagement: rng.int(40, 70), tutored: false };
    }),
  };
}

const gradeLabel = (g) => (g === 0 ? 'kindergarten' : `${g}${['th', 'st', 'nd', 'rd'][g % 10 > 3 || [11, 12, 13].includes(g) ? 0 : g % 10]} grade`);

function moment(ctx, rec) {
  const { state, rng } = ctx;
  const s = rng.pick(rec.klass.students);
  const need = s.need;
  const decks = {
    troublemaker: { icon: '😈', title: `${s.name} Again`, text: `${s.name} threw a chair today. The principal wants a suspension; you think something is going on at home.`, options: [{ id: 'home', label: '🏠 Call home and talk to the counselor' }, { id: 'suspend', label: '🚪 Support the suspension' }] },
    ell: { icon: '🗣️', title: `${s.name}'s Parents`, text: `${s.name}'s parents don't speak English and missed every conference.`, options: [{ id: 'interpreter', label: '🗣️ Arrange an interpreter and a home visit' }, { id: 'note', label: '📝 Send a note home' }] },
    gifted: { icon: '🌟', title: `${s.name} Is Bored`, text: `${s.name} finished the year's math in October and is acting out.`, options: [{ id: 'enrich', label: '🚀 Build an independent project' }, { id: 'skip', label: '⏭️ Push for a grade skip' }] },
    struggling: { icon: '📉', title: `${s.name} Can't Read`, text: `${s.name} is in ${gradeLabel(rec.klass.grade)} and reading two years below level.`, options: [{ id: 'refer', label: '🔍 Refer for evaluation' }, { id: 'lunch', label: '🥪 Read with them at lunch every day' }] },
    iep: { icon: '🧩', title: 'The IEP Meeting', text: `${s.name}'s parents arrive at the IEP meeting with a lawyer.`, options: [{ id: 'listen', label: '👂 Listen and offer more support' }, { id: 'defend', label: '📑 Defend the current plan' }] },
    quiet: { icon: '🤫', title: `${s.name}'s Notebook`, text: `You notice drawings in ${s.name}'s notebook that worry you.`, options: [{ id: 'report', label: '🛡️ Report it to the counselor today' }, { id: 'wait', label: '⏳ Keep an eye on it' }] },
    typical: { icon: '🍎', title: 'Parent Complaint', text: `${s.name}'s parent emails the principal that you grade unfairly.`, options: [{ id: 'meet', label: '🤝 Meet and show the rubric' }, { id: 'change', label: '✏️ Bump the grade' }] },
  };
  const d = decks[need];
  ctx.prompt({ type: 'classroom.moment', icon: d.icon, title: d.title, text: d.text, options: d.options, data: { studentId: s.id, need } });
}

export const ClassroomModule = {
  id: 'classroom',
  order: 30.81,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    if (!isClassroom(job) || !job.paidThisYear || state.legal.incarceration) return;
    const rec = lifeOf(state, 'classroom', job.professionId, fresh());
    if (!rec.klass) newClass(rng, state, rec);
    const a = APPROACHES[rec.approach] ?? APPROACHES.engaging;
    const sk = skill(state, { smarts: 2, happiness: 1 });
    // The school year.
    for (const s of rec.klass.students) {
      s.score = Math.round(clamp(s.score + a.growth[s.need] * (0.6 + sk / 120) + (s.tutored ? 10 : 0) + (s.engagement - 50) / 10 + rng.int(-5, 5), 0, 100));
      s.engagement = Math.round(clamp(s.engagement + a.engagement + rng.int(-6, 6), 0, 100));
    }
    ctx.stat('stress', a.stress);
    const pass = Math.round(rec.klass.students.filter((s) => s.score >= PASS).length / rec.klass.students.length * 100);
    const avg = Math.round(rec.klass.students.reduce((t, s) => t + s.score, 0) / rec.klass.students.length);
    rec.years = [{ age: state.character.age, grade: rec.klass.grade, pass, avg }, ...rec.years].slice(0, 12);
    if (pass >= 80) applyFx(ctx, rec, { text: `Spring test results for your ${gradeLabel(rec.klass.grade)} class: ${pass}% proficient. The principal put your name in the newsletter.`, perf: 6, rep: 6, happiness: 4 }, '📈');
    else if (pass < 45) applyFx(ctx, rec, { text: `Spring test results: ${pass}% proficient. You're on the district's "support" list — walkthroughs every week.`, perf: -6, rep: -4, stress: 6 }, '📉');
    else ctx.log(`Spring test results for your ${gradeLabel(rec.klass.grade)} class: ${pass}% proficient.`, '📝');
    // The students who loved it remember.
    const star = rec.klass.students.slice().sort((x, y) => y.engagement - x.engagement)[0];
    if (star.engagement >= 80) rec.alumni = [{ name: star.name, age: state.character.age }, ...rec.alumni].slice(0, 30);
    if (rec.alumni.length && rng.chance(0.08)) {
      const old = rng.pick(rec.alumni.filter((x) => state.character.age - x.age >= 8));
      if (old) applyFx(ctx, rec, { text: `${old.name}, from your class ${state.character.age - old.age} years ago, wrote to say you're the reason they became ${rng.pick(['a teacher', 'a nurse', 'an engineer', 'the first in their family to finish college', 'a scientist'])}.`, happiness: 12 }, '💌');
    }
    if (pass >= 85 && rec.years.filter((y) => y.pass >= 80).length >= 3 && rng.chance(0.25)) applyFx(ctx, rec, { honor: { id: 'teacher.year', name: 'District Teacher of the Year', icon: '🍎' }, happiness: 8 }, '🍎');
    // Next year's class.
    newClass(rng, state, rec);
    if (rng.chance(0.7) && !state.prompts.some((p) => p.type === 'classroom.moment')) moment(ctx, rec);
  },
  actions: {
    approach(ctx, id) {
      const { state } = ctx;
      const job = state.career.job;
      if (!isClassroom(job) || !APPROACHES[id]) return;
      if (yearlyCount(state, 'classroom.approach')) return ctx.toast('You set your approach once a year', 'warn');
      bumpYearly(state, 'classroom.approach');
      lifeOf(state, 'classroom', job.professionId, fresh()).approach = id;
      ctx.log(`This year you'll teach with ${APPROACHES[id].name.toLowerCase()}. ${APPROACHES[id].desc}`, APPROACHES[id].icon);
      return undefined;
    },
    tutor(ctx, studentId) {
      const { state } = ctx;
      const job = state.career.job;
      const rec = peekLife(state, 'classroom');
      if (!isClassroom(job) || rec?.professionId !== job.professionId || !rec.klass) return;
      const s = rec.klass.students.find((x) => x.id === studentId);
      if (!s) return;
      if (yearlyCount(state, 'classroom.tutor')) return ctx.toast('You can tutor one student a year after school', 'warn');
      bumpYearly(state, 'classroom.tutor');
      s.tutored = true;
      s.engagement = Math.min(100, s.engagement + 15);
      ctx.stat('stress', 2);
      ctx.log(`You stayed after school with ${s.name} twice a week.`, '✏️', 'good');
      return undefined;
    },
  },
  resolvers: {
    moment(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      const rec = peekLife(state, 'classroom');
      if (!isClassroom(job) || !rec?.klass) return;
      const s = rec.klass.students.find((x) => x.id === data.studentId) ?? rng.pick(rec.klass.students);
      const good = (txt, eng = 15, perf = 3) => { s.engagement = Math.min(100, s.engagement + eng); applyFx(ctx, rec, { text: txt, perf, happiness: 3 }, '🍎'); };
      switch (`${data.need}.${optionId}`) {
        case 'troublemaker.home': good(`${s.name}'s father had lost his job and they were living in a car. The counselor found them help, and ${s.name} came back different.`, 25, 2); break;
        case 'troublemaker.suspend': s.engagement = Math.max(0, s.engagement - 15); ctx.log(`${s.name} was suspended for three days and came back angrier.`, '🚪'); break;
        case 'ell.interpreter': good(`${s.name}'s parents came to the next conference with a neighbour translating, and cried. ${s.name}'s English took off.`, 20); s.score += 5; break;
        case 'gifted.enrich': good(`${s.name} built a weather station for the school roof. It's still there.`); s.score += 3; break;
        case 'gifted.skip': ctx.log(`${s.name} skipped a grade. You'll never know how it turned out.`, '⏭️'); break;
        case 'struggling.refer': ctx.log(`${s.name} was diagnosed with dyslexia and finally got the right help.`, '🔍', 'good'); s.need = 'iep'; break;
        case 'struggling.lunch': good(`By spring, ${s.name} read a whole chapter book. You gave up a lot of lunches for it.`, 20, 4); s.score += 8; ctx.stat('stress', 3); break;
        case 'iep.listen': good('The plan got more support. The lawyer put away the binder.', 10, 2); break;
        case 'iep.defend': if (rng.chance(0.5)) ctx.log('The district backed you. The parents filed a complaint anyway.', '📑'); else applyFx(ctx, rec, { text: 'The parents won a due-process hearing. The district was not pleased with you.', perf: -6 }, '⚖️'); break;
        case 'quiet.report': good(`${s.name} was being hurt at home. Child protective services stepped in. You may have saved a life.`, 20, 3); break;
        case 'quiet.wait': if (rng.chance(0.3)) applyFx(ctx, rec, { text: `${s.name} stopped coming to school. You wish you'd said something sooner.`, happiness: -8 }, '🕯️'); break;
        case 'typical.meet': good('The parent left satisfied — and became your biggest supporter.', 5, 2); break;
        case 'typical.change': applyFx(ctx, rec, { text: 'The complaint went away. Other parents noticed it worked.', perf: -2 }, '✏️'); break;
        default: break;
      }
    },
  },
};
