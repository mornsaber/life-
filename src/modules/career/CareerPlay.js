/**
 * Career play: the job as something you play each year, not just a salary.
 *
 *   Work plan     how you approach the year (coast, steady, grind, network, learn): it moves
 *                 performance, your boss, colleagues, stress and burnout at year's end.
 *   Shift actions three a year, the job's own: a nurse takes an extra shift or speaks up about
 *                 staffing, a lawyer takes a pro bono case, an officer works overtime. Each shows
 *                 its odds (your skill and record) before you try it.
 *   Burnout       grinding fills it, easy years empty it; full, it costs health and performance.
 *   Rank perks    what each rung brings (a desk of your own, people under you, an expense account,
 *                 a car, a corner office, the top table), shown for the rung above.
 *   Milestones    first job, first promotion, ten and twenty-five years in a field, star performer,
 *                 leading people, the top of the ladder, running the place: each logged once.
 *   End card      leaving a job you held for a while shows what it came to.
 *
 * state.career.plan = 'steady' | …; job.burnout 0–100; state.career.milestones = { id: age }.
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { skill as skillOf, practise } from '../life/Skills.js';
import { showResult } from '../life/ResultCards.js';
import { promotionStatus } from './CareerEngine.js';
import { getProfession } from './JobTrees.js';
import { levelById, nextLevels } from './Ladder.js';
import { yearNow } from '../world/Eras.js';
import { eraScale } from '../economy/EraEconomy.js';

/* ------------------------------------------------------------------ */
/* Work plan                                                           */
/* ------------------------------------------------------------------ */

export const WORK_PLANS = {
  coast: { label: 'Coast', icon: '😌', hint: 'Do the minimum: less stress, burnout drains, the boss notices', perf: -6, boss: -3, coworkers: 0, stress: -6, burnout: -15 },
  steady: { label: 'Steady', icon: '⚖️', hint: 'A fair day\'s work: nothing gained, nothing lost', perf: 1, boss: 0, coworkers: 1, stress: 0, burnout: -4 },
  grind: { label: 'Grind', icon: '🔥', hint: 'Early starts, late nights: performance up, burnout builds', perf: 8, boss: 3, coworkers: -1, stress: 7, burnout: 14 },
  network: { label: 'Network', icon: '🤝', hint: 'Lunches, favours, being seen: the boss and colleagues warm to you', perf: -1, boss: 5, coworkers: 6, stress: 2, burnout: 3 },
  learn: { label: 'Learn', icon: '📚', hint: 'Courses and new skills: slower now, stronger later', perf: 2, boss: 1, coworkers: 1, stress: 3, burnout: 2, learn: true },
};
export const planOf = (state) => WORK_PLANS[state.career?.plan] ? state.career.plan : 'steady';

/* ------------------------------------------------------------------ */
/* Shift actions, by line of work                                      */
/* ------------------------------------------------------------------ */

const A = (id, icon, label, skill, pass, fail, hint = '') => ({ id, icon, label, skill, pass, fail, hint });
/** Families of work and their actions. A pass and fail each: { perf, boss, coworkers, stress, health, earn (share of pay), log }. */
export const SHIFT_FAMILIES = [
  { id: 'medical', re: /nurs|medic|physician|doctor|clinic|ems|dental|pharm|therap|surgeon|midwi|health|hospital|paramedic/, actions: [
    A('extraShift', '🏥', 'Take an extra shift', 'medicine', { perf: 5, earn: 0.03, stress: 5, log: 'You covered a double shift on a short-staffed ward. The charge nurse remembered.' }, { stress: 8, health: -2, log: 'A brutal double shift. You made a small charting mistake and were too tired to care.' }),
    A('mentor', '🧑‍⚕️', 'Mentor a new starter', 'teaching', { coworkers: 8, perf: 2, log: 'Your new starter found their feet. They tell everyone you taught them everything.' }, { coworkers: -2, log: 'The new starter struggled anyway. You did what you could.' }),
    A('speakUp', '📢', 'Speak up about staffing', 'persuasion', { coworkers: 10, perf: 2, boss: 2, log: 'Management listened: two more staff on nights. The ward bought you cake.' }, { boss: -8, coworkers: 6, log: 'Management didn\'t like it. Your colleagues did.' }),
  ] },
  { id: 'legal', re: /law|legal|judge|prosecut|defen|paralegal|court|attorney|solicitor|barrister|notary/, actions: [
    A('proBono', '⚖️', 'Take a pro bono case', 'law', { perf: 2, boss: 1, coworkers: 3, log: 'You won a tenant\'s case for nothing. It was the best work you did all year.' }, { stress: 4, log: 'You lost the pro bono case, and the hours came out of your evenings.' }),
    A('billHard', '⏱️', 'Bill every hour you can', 'law', { perf: 6, earn: 0.05, stress: 6, log: 'Your billables led the floor. The partners noticed.' }, { stress: 8, boss: -2, log: 'A client queried your bill. Awkward conversations followed.' }),
    A('courtClient', '🍽️', 'Court a big client', 'negotiation', { perf: 6, boss: 5, log: 'The client signed. You brought in real business.' }, { boss: -2, log: 'Three dinners and a round of golf, and they went with another firm.' }),
  ] },
  { id: 'police', re: /police|sheriff|trooper|warden|security|correction|border|detective|fbi|dea|atf|marshal|gendarm|constab|customs/, actions: [
    A('overtime', '🚓', 'Work overtime', 'investigation', { perf: 4, earn: 0.04, stress: 5, log: 'Overtime every weekend: the money came in, and so did an arrest that made the papers.' }, { stress: 8, health: -2, log: 'Too many double shifts. You were short with everyone at home.' }),
    A('specialist', '🎯', 'Try for a specialist unit', 'marksmanship', { perf: 6, boss: 3, log: 'You passed the selection day. They want you on the specialist team.' }, { stress: 3, log: 'You didn\'t make the cut this year. They told you to try again.' }),
    A('community', '🧒', 'Walk the beat, know the street', 'persuasion', { coworkers: 4, perf: 3, log: 'The shopkeepers know your name now. Tips come your way.' }, { log: 'A quiet year on the beat.' }),
  ] },
  { id: 'fire', re: /fire|rescue|lifeguard|coastguard/, actions: [
    A('drills', '🧯', 'Lead the station drills', 'firstAid', { perf: 4, coworkers: 5, log: 'Your crew ran the drills faster than any in the district.' }, { coworkers: -2, log: 'The drill went badly. The captain was not impressed.' }),
    A('overtime', '🚒', 'Take extra shifts', 'athletics', { perf: 3, earn: 0.04, stress: 5, log: 'You covered shifts all summer. A long, hot, well-paid summer.' }, { stress: 6, health: -2, log: 'You wore yourself out covering shifts.' }),
    A('schools', '🏫', 'Visit the schools', 'publicSpeaking', { coworkers: 2, perf: 2, log: 'You gave the fire-safety talk at every school in the district.' }, { log: 'The children mostly wanted to sit in the engine.' }),
  ] },
  { id: 'teaching', re: /teach|education|professor|faculty|academ|school|lectur|tutor|instructor/, actions: [
    A('club', '🎭', 'Run an after-school club', 'teaching', { coworkers: 4, perf: 3, log: 'Your club won the regional prize. The head mentioned you in assembly.' }, { stress: 4, log: 'Three children came to the club, then two, then one.' }),
    A('overhaul', '📝', 'Rewrite your lessons', 'writing', { perf: 6, stress: 3, log: 'Your new lessons worked: the results went up.' }, { stress: 5, log: 'A summer rewriting lessons, and the inspectors preferred the old ones.' }),
    A('mentorStudent', '🌱', 'Take a struggling pupil under your wing', 'caregiving', { perf: 2, coworkers: 3, happiness: 4, log: 'The pupil passed. They wrote you a card you\'ll keep forever.' }, { happiness: -2, log: 'You tried. It wasn\'t enough this year.' }),
  ] },
  { id: 'tech', re: /tech|software|developer|cyber|data|programm|computer|it\b|engineer/, actions: [
    A('ship', '🚀', 'Ship something big', 'coding', { perf: 8, boss: 3, stress: 5, log: 'You shipped it on time. The launch went well, and your name was on it.' }, { perf: -3, stress: 7, log: 'It slipped, then slipped again. Not your year.' }),
    A('legacy', '🧹', 'Fix the old system nobody wants', 'mechanics', { perf: 4, coworkers: 6, log: 'You fixed the thing that broke every Friday. Quiet heroics.' }, { stress: 4, log: 'The old system fought back, and won.' }),
    A('talk', '🎤', 'Give a talk', 'publicSpeaking', { perf: 3, boss: 2, log: 'Your talk went down well. A recruiter emailed you that afternoon.' }, { stress: 3, log: 'Your demo crashed live. You laughed it off, mostly.' }),
  ] },
  { id: 'business', re: /sales|retail|realestate|insurance|financ|account|bank|corporate|consult|market|manag|broker|trade|merchant|clerk|office|admin/, actions: [
    A('bigDeal', '🤝', 'Chase the big deal', 'sales', { perf: 7, earn: 0.06, boss: 3, log: 'You closed the biggest deal of your year. The bonus came through.' }, { perf: -2, stress: 5, log: 'The deal fell through at the last minute.' }),
    A('numbers', '📊', 'Stay late on the numbers', 'finance', { perf: 5, stress: 4, log: 'Your report caught a problem nobody else had seen.' }, { stress: 5, log: 'Hours on the spreadsheet, and the meeting was cancelled.' }),
    A('presentation', '📽️', 'Present to the bosses', 'publicSpeaking', { boss: 6, perf: 2, log: 'Your presentation went up the chain. People above your boss know your name now.' }, { boss: -3, log: 'You froze on slide four.' }),
  ] },
  { id: 'trades', re: /trade|plumb|electric|carpent|construct|mechanic|hvac|weld|mason|build|labour|labor|factory|mill|mine|farm|crafts|smith/, actions: [
    A('rush', '⏰', 'Take the rush job', 'carpentry', { perf: 4, earn: 0.04, log: 'You finished the rush job a day early, and the customer paid extra.' }, { health: -2, stress: 4, log: 'The rush job ran late and the customer shouted.' }),
    A('apprentice', '🧰', 'Train an apprentice', 'teaching', { coworkers: 6, perf: 2, log: 'Your apprentice is good now. They\'ll be good for forty years.' }, { stress: 3, log: 'The apprentice quit after a month.' }),
    A('quality', '🔍', 'Do it properly, however long it takes', 'mechanics', { perf: 5, boss: 2, log: 'Your work passed every inspection. Word gets round.' }, { boss: -2, log: 'Slower than the boss wanted.' }),
  ] },
  { id: 'arts', re: /journal|writer|author|art|music|actor|act\b|media|design|film|photograph|broadcast|news|show|perform/, actions: [
    A('pitch', '💡', 'Pitch your own idea', 'writing', { perf: 7, boss: 2, log: 'They took your idea. It\'s yours, with your name on it.' }, { boss: -1, log: 'They passed. Politely.' }),
    A('deadline', '⌛', 'Hit an impossible deadline', 'design', { perf: 5, stress: 5, log: 'You made the deadline with an hour to spare.' }, { stress: 7, log: 'You missed it, by a day. It felt like a year.' }),
    A('collab', '🎨', 'Collaborate with a rising star', 'persuasion', { coworkers: 6, perf: 3, log: 'The collaboration was a hit. You both did well out of it.' }, { log: 'Creative differences.' }),
  ] },
  { id: 'general', re: /./, actions: [
    A('overtime', '⏱️', 'Put in extra hours', 'leadership', { perf: 4, earn: 0.03, stress: 4, log: 'The extra hours showed in your work, and your pay.' }, { stress: 6, log: 'Extra hours, and nobody noticed.' }),
    A('helpColleague', '🙌', 'Help a colleague out', 'persuasion', { coworkers: 7, perf: 1, log: 'You helped a colleague through a bad patch. They won\'t forget it.' }, { log: 'You tried to help. It didn\'t take.' }),
    A('project', '📌', 'Volunteer for a new project', 'leadership', { perf: 6, boss: 3, log: 'The project went well, and you were the one who ran it.' }, { perf: -2, stress: 4, log: 'The project went nowhere.' }),
  ] },
];

/** The actions for this job. */
export function shiftActions(job) {
  if (!job) return [];
  const family = SHIFT_FAMILIES.find((f) => f.re.test(job.professionId)) ?? SHIFT_FAMILIES.at(-1);
  return family.actions;
}
export const SHIFTS_PER_YEAR = 3;

/** The odds of an action going well: your skill in it, your record, how you're getting on. */
export function shiftOdds(state, action) {
  const job = state.career?.job;
  if (!job) return 0;
  const s = skillOf(state, action.skill);
  return clamp(0.35 + s / 160 + ((job.performance ?? 55) - 55) / 200 + ((job.boss ?? 50) - 50) / 300 - (job.burnout ?? 0) / 400, 0.12, 0.92);
}

/* ------------------------------------------------------------------ */
/* Perks by rank                                                       */
/* ------------------------------------------------------------------ */

/** What each grade brings (the first grade that has it). */
export function perksAt(state, grade) {
  const y = yearNow(state);
  return [
    [3, '🪪 A desk and a drawer of your own'],
    [4, '🧑‍🤝‍🧑 People who report to you'],
    [5, '💼 An expense account'],
    [6, y >= 1915 ? '🚗 A car that comes with the job' : '🐎 A horse and trap on the firm'],
    [7, '🏢 A corner office and an assistant'],
    [8, '🎩 A seat at the top table'],
  ].filter(([g]) => g <= grade);
}
/** What the rung above brings that this one doesn't. */
export function nextPerk(state, job) {
  const profession = getProfession(job.professionId);
  const next = nextLevels(profession, job.employer.size, job.levelId).filter((l) => !l.appointed)[0];
  if (!next) return null;
  const now = perksAt(state, job.grade ?? 0).map(([, p]) => p);
  const then = perksAt(state, next.grade ?? 0).map(([, p]) => p).filter((p) => !now.includes(p));
  return { level: next, perks: then };
}

/** How ready you are for the next rung, and what's in the way. */
export function readiness(state) {
  const job = state.career?.job;
  if (!job) return null;
  const status = promotionStatus(state);
  const profession = getProfession(job.professionId);
  const level = levelById(profession, job.levelId);
  const need = level?.years ?? 2;
  const time = clamp((job.yearsInLevel ?? 0) / Math.max(1, need), 0, 1);
  const record = clamp(((job.performance ?? 55) - 40) / 45, 0, 1);
  const standing = clamp(((job.boss ?? 50) - 30) / 50, 0, 1);
  const score = Math.round((time * 0.4 + record * 0.4 + standing * 0.2) * 100);
  const tips = [];
  if ((job.performance ?? 55) < 70) tips.push('raise your performance (grind, or a good shift)');
  if ((job.boss ?? 50) < 55) tips.push('win over your boss (network)');
  if (time < 1) tips.push(`${Math.max(1, Math.ceil(need - (job.yearsInLevel ?? 0)))} more year${need - (job.yearsInLevel ?? 0) > 1 ? 's' : ''} in role`);
  return { score, eligible: status.eligible, reason: status.reason, tips };
}

/* ------------------------------------------------------------------ */
/* Milestones                                                          */
/* ------------------------------------------------------------------ */

export const MILESTONES = {
  firstJob: { icon: '🎉', name: 'First job' },
  firstPromotion: { icon: '⬆️', name: 'First promotion' },
  leader: { icon: '🧑‍🤝‍🧑', name: 'Leading people' },
  starPerformer: { icon: '🌟', name: 'Star performer' },
  tenYears: { icon: '🔟', name: 'Ten years in the field' },
  quarterCentury: { icon: '🏅', name: 'Twenty-five years in the field' },
  sixFigures: { icon: '💰', name: 'Six figures (in today\'s money)' },
  topOfLadder: { icon: '🏔️', name: 'Top of the ladder' },
  runsThePlace: { icon: '👑', name: 'Running the place' },
};
function reach(ctx, id, sub, popup = false) {
  const { state } = ctx;
  const m = (state.career.milestones ??= {});
  if (m[id] != null) return;
  m[id] = state.character.age;
  const def = MILESTONES[id];
  ctx.log(`Career milestone: ${def.name}${sub ? ` — ${sub}` : ''}.`, def.icon, 'milestone');
  showResult(ctx, { icon: def.icon, title: 'Career milestone', big: def.name, sub, tone: 'good', popup });
}
/** Years in this line of work, this job and earlier ones. */
function yearsInField(state, professionId) {
  const past = (state.career.history ?? []).filter((h) => h.professionId === professionId).reduce((t, h) => t + Math.max(0, (h.endAge ?? 0) - (h.startAge ?? 0)), 0);
  const job = state.career.job;
  return past + (job && job.professionId === professionId ? state.character.age - (job.startAge ?? state.character.age) : 0);
}
function checkMilestones(ctx) {
  const { state } = ctx;
  const job = state.career.job;
  if (!job) return;
  if ((job.performance ?? 0) >= 90) reach(ctx, 'starPerformer', job.title);
  if (job.abilities?.includes('supervise')) reach(ctx, 'leader', job.title);
  const field = yearsInField(state, job.professionId);
  if (field >= 10) reach(ctx, 'tenYears', getProfession(job.professionId)?.name ?? job.title);
  if (field >= 25) reach(ctx, 'quarterCentury', getProfession(job.professionId)?.name ?? job.title, true);
  if ((job.salary ?? 0) / Math.max(0.05, eraScale(state, 'wage')) >= 100000) reach(ctx, 'sixFigures', job.title);
  const profession = getProfession(job.professionId);
  if (!nextLevels(profession, job.employer.size, job.levelId).some((l) => !l.appointed)) reach(ctx, 'topOfLadder', job.title, true);
  if (job.headOf && !job.headOf.deptId) reach(ctx, 'runsThePlace', job.employer.name, true);
}

/* ------------------------------------------------------------------ */
/* Actions and the year                                                */
/* ------------------------------------------------------------------ */

function apply(ctx, job, fx) {
  for (const [k, key] of [['perf', 'performance'], ['boss', 'boss'], ['coworkers', 'coworkers']]) if (fx[k]) job[key] = Math.round(clamp((job[key] ?? 50) + fx[k], 0, 100));
  if (fx.stress) ctx.stat('stress', fx.stress);
  if (fx.health) ctx.stat('health', fx.health);
  if (fx.happiness) ctx.stat('happiness', fx.happiness);
  if (fx.earn) ctx.earn(Math.round((job.salary ?? 0) * fx.earn), 'Extra pay at work', { wage: true });
}

export const CareerPlayActions = {
  /** Set how you approach the year at work. */
  plan(ctx, id) {
    if (!WORK_PLANS[id]) return;
    ctx.state.career.plan = id;
    ctx.toast(`${WORK_PLANS[id].icon} This year: ${WORK_PLANS[id].label.toLowerCase()}`, 'info');
  },
  /** One of the job's own actions. */
  shift(ctx, id) {
    const { state, rng } = ctx;
    const job = state.career.job;
    if (!job) return ctx.toast('You don\'t have a job.', 'warn');
    const action = shiftActions(job).find((a) => a.id === id);
    if (!action) return;
    if (yearlyCount(state, 'careerPlay.shift') >= SHIFTS_PER_YEAR) return ctx.toast(`${SHIFTS_PER_YEAR} a year: the rest of the year is the job itself.`, 'warn');
    if (yearlyCount(state, `careerPlay.shift.${id}`)) return ctx.toast('Once a year.', 'warn');
    bumpYearly(state, 'careerPlay.shift');
    bumpYearly(state, `careerPlay.shift.${id}`);
    const ok = rng.chance(shiftOdds(state, action));
    const fx = ok ? action.pass : action.fail;
    apply(ctx, job, fx);
    practise(state, action.skill, ok ? 4 : 2);
    ctx.log(fx.log, action.icon, ok ? 'good' : 'warn');
  },
};

export const CareerPlayModule = {
  id: 'careerPlay',
  // Before the career engine's year (order 30): the plan feeds this year's review.
  order: 29,
  setup(engine) {
    engine.bus.on('career:hired', ({ ctx }) => { if (ctx && !(ctx.state.career.history ?? []).length) reach(ctx, 'firstJob', ctx.state.career.job?.title); });
    engine.bus.on('career:promoted', ({ ctx, job }) => {
      if (!ctx) return;
      reach(ctx, 'firstPromotion', job?.title, true);
      // A new perk with the new rung.
      const gained = perksAt(ctx.state, job?.grade ?? 0).filter(([g]) => g === job?.grade);
      for (const [, p] of gained) { ctx.stat('happiness', 2); ctx.log(`With the promotion: ${p}.`, '🎁', 'good'); }
    });
    // Leaving a job you held a while: what it came to.
    engine.bus.on('career:separated', ({ ctx, job }) => {
      if (!ctx || !job) return;
      const years = ctx.state.character.age - (job.startAge ?? ctx.state.character.age);
      if (years < 3) return;
      const peak = job.peakGrade ?? job.grade ?? 0;
      showResult(ctx, { icon: getProfession(job.professionId)?.icon ?? '💼', title: `${years} years at ${job.employer?.name ?? 'work'}`, big: job.title, sub: `Highest grade G${peak} · ${Object.keys(ctx.state.career.milestones ?? {}).length} career milestones`, tone: 'info', popup: false });
    });
  },
  init(state) {
    state.career.plan ??= 'steady';
    state.career.milestones ??= {};
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    const job = state.career.job;
    if (!job) return;
    const plan = WORK_PLANS[planOf(state)];
    apply(ctx, job, plan);
    job.burnout = Math.round(clamp((job.burnout ?? 0) + plan.burnout, 0, 100));
    if (plan.learn) for (const a of shiftActions(job)) practise(state, a.skill, 2);
    if (job.burnout >= 80) {
      ctx.stat('health', -3);
      job.performance = Math.round(clamp((job.performance ?? 55) - 6, 0, 100));
      ctx.log('You\'re burned out: tired all the time, short with everyone, and the work is slipping. Ease off (Coast or Steady) for a year.', '🪫', 'bad');
    }
  },
  onYearEnd(ctx) { checkMilestones(ctx); },
  actions: CareerPlayActions,
};
