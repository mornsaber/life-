/**
 * Vocations: the military's depth for civilian careers, as data.
 *
 * A pack (career/vocations/*.js) describes one family of jobs the way the services describe a
 * career, and this module runs it:
 *
 *   Courses     Training a promotion waits on (ACLS before you're an attending, a leadership
 *               programme before you head a department), some renewed every few years, each
 *               existing only from its year.
 *   Postings    A year or two somewhere else: a mission abroad, a rural practice, a visiting
 *               chair. Offered, not ordered; abroad ones use world/Posting.js.
 *   Awards      Recognition by record: years, rank, performance, the postings and courses you
 *               did. Honours that feed your prestige (and so the national honours list).
 *   Regulator   The profession's own discipline: a complaint, a hearing, an outcome from
 *               "no case to answer" to erasure, through the licence (credentials/).
 *   Elite posts Appointments held alongside the job: presidencies of the college, a royal
 *               household post, the team doctor at the Games.
 *
 * Everything is dated (`from`/`until`), may be limited to countries (`countries`, or `realm`:
 * the Crown's realms) and to the pack's traits (a specialty: `traits`). A pack's `traits(state)`
 * says what you are within the field; `risk(state)` weighs complaints.
 *
 * state.vocation[packId] = { courses: { id: ageDone }, inCourse: { id, until }, postings: [{ id, age, until }],
 *   awards: [id], record: [{ age, id, outcome }], conditionsUntil, elite: { id, since, until } | null, history: [id] }
 */
import { clamp, Random } from '../../core/Random.js';
import { addHonor, yearlyCount, bumpYearly, yearsInProfession } from '../../core/State.js';
import { yearNow } from '../world/Eras.js';
import { crownOf } from '../world/Crown.js';
import { COUNTRIES } from '../world/Countries.js';
import { postAbroad, postingOf } from '../world/Posting.js';
import { getProfession } from './JobTrees.js';
import { nextLevels } from './Ladder.js';
import { PACKS } from './vocations/index.js';
import { scopeOfType } from '../../core/PromptScope.js';
import { addLevelGate, leaveJob } from './CareerEngine.js';

const LISTS = ['courses', 'postings', 'awards', 'complaints', 'elite', 'specialties'];
/**
 * A pack with its shared blocks (`use`) folded in: their courses, postings, awards, complaints
 * and posts are added to the pack's own (the pack's own come first; an id the pack already has wins).
 */
export function compose(pack) {
  const out = { ...pack };
  for (const k of LISTS) {
    const own = pack[k] ?? [];
    const ids = new Set(own.map((x) => x.id));
    out[k] = [...own, ...(pack.use ?? []).flatMap((b) => b[k] ?? []).filter((x) => !ids.has(x.id) && ids.add(x.id))];
  }
  return out;
}
/** Every pack, by id. Add new families in career/vocations/index.js. */
export const VOCATIONS = Object.fromEntries(PACKS.map((p) => [p.id, compose(p)]));
const BY_PROFESSION = {};
for (const pack of Object.values(VOCATIONS)) for (const id of pack.professions) BY_PROFESSION[id] = pack;

/**
 * The vocations' own random stream (a seed kept in the save), so adding a pack never shifts the
 * rolls of the rest of the game: a layoff or a diagnosis comes out the same with or without it.
 */
function vrng(state) {
  state.vocation ??= {};
  const seed = state.vocation.seed ?? (((state.world?.seed ?? 1) * 2654435761) >>> 0);
  state.vocation.seed = (seed * 1664525 + 1013904223) >>> 0;
  return new Random(state.vocation.seed);
}
let ENABLED = true;
/** Tests compare careers with and without the packs. */
export const setVocationsEnabled = (on) => { ENABLED = on; };
/** The pack for your job (or a profession id), or null. */
export function packFor(state, professionId = state.career?.job?.professionId) {
  if (!professionId || !ENABLED) return null;
  return BY_PROFESSION[professionId] ?? BY_PROFESSION[getProfession(professionId)?.template] ?? null;
}
export const vocationOf = (state, pack) => {
  state.vocation ??= {};
  return (state.vocation[pack.id] ??= { courses: {}, inCourse: null, postings: [], awards: [], record: [], conditionsUntil: null, elite: null, history: [] });
};

const cc = (state) => state.character.countryId ?? 'US';
const gradeOf = (state) => {
  const job = state.career?.job;
  return job ? getProfession(job.professionId).levels.find((l) => l.id === job.levelId)?.grade ?? 0 : 0;
};
const yearsIn = (state, pack) => yearsInProfession(state, pack.professions);
const traitsOf = (state, pack) => {
  const job = state.career?.job;
  const p = job ? getProfession(job.professionId) : null;
  const v = vocationOf(state, pack);
  return [p?.id, p?.template, v.specialty, ...(pack.traits?.(state) ?? [])].filter(Boolean);
};
export const vocationTraits = traitsOf;

/** Does a dated, placed, specialised item apply to you this year? */
export function applies(state, pack, item) {
  const y = yearNow(state);
  if (item.from && y < item.from) return false;
  if (item.until && y >= item.until) return false;
  if (item.countries && !item.countries.includes(cc(state))) return false;
  if (item.realm && crownOf(state) !== 'GB') return false;
  if (item.traits && !item.traits.some((t) => traitsOf(state, pack).includes(t))) return false;
  if (item.professions && !item.professions.includes(state.career?.job?.professionId) && !item.professions.includes(getProfession(state.career?.job?.professionId ?? 'retail')?.template)) return false;
  if (item.when && !item.when(state)) return false;
  return true;
}
/** A name that may depend on the year, the country or you. */
export const nameOf = (state, item) => (typeof item.name === 'function' ? item.name(state) : item.name);

/* ------------------------------------------------------------------ */
/* Courses                                                             */
/* ------------------------------------------------------------------ */

/** Is a course done and still current? */
export function courseCurrent(state, pack, course) {
  const done = vocationOf(state, pack).courses[course.id];
  if (done == null) return false;
  return !course.renew || state.character.age - done < course.renew;
}
/** Does a course gate this rung? By id (`required`), by grade (`gateGrade`: this grade and up) or management (`gateMgmt`). */
export const gates = (c, level) => Boolean(level && (c.required?.includes(level.id) || (c.gateGrade && level.grade >= c.gateGrade) || (c.gateMgmt && level.track === 'mgmt')));
/** Courses this rung needs that you haven't got (or have let lapse). Takes a level (or a level id of your job's ladder). */
export function missingCourses(state, pack, level) {
  const lv = typeof level === 'string' ? getProfession(state.career.job.professionId).levels.find((l) => l.id === level) : level;
  return pack.courses.filter((c) => gates(c, lv) && applies(state, pack, c) && !courseCurrent(state, pack, c));
}
const isRequired = (c) => Boolean(c.required?.length || c.gateGrade || c.gateMgmt);
/** The courses open to you now, with why not where not. */
export function courseOptions(state, pack) {
  const v = vocationOf(state, pack);
  return pack.courses.filter((c) => applies(state, pack, c)).map((c) => {
    let reason = null;
    if (v.inCourse) reason = v.inCourse.id === c.id ? `Under way, done at ${v.inCourse.until}` : 'One course at a time';
    else if (courseCurrent(state, pack, c)) reason = c.renew ? `Current until ${v.courses[c.id] + c.renew}` : 'Done';
    else if (c.minGrade && gradeOf(state) < c.minGrade) reason = 'Not at your stage yet';
    else if (c.minYears && yearsIn(state, pack) < c.minYears) reason = `After ${c.minYears} years in the field`;
    else if (yearlyCount(state, `vocation.course.${pack.id}`)) reason = 'One course a year';
    return { course: c, reason, cost: costOf(state, c) };
  });
}
/** What you pay: a big employer funds required courses. */
function costOf(state, c) {
  const big = ['large', 'enterprise'].includes(state.career?.job?.employer?.size);
  const publicJob = state.career?.job && getProfession(state.career.job.professionId).sector !== 'private';
  return Math.round((c.cost ?? 0) * ((big || publicJob) && isRequired(c) ? 0.2 : 1));
}
/** What finishing a course does beyond the record: optional courses sharpen your work. */
function courseDone(state, c) {
  const job = state.career?.job;
  if (job && c.perf) job.performance = clamp((job.performance ?? 50) + c.perf, 0, 100);
}
function takeCourse(ctx, pack, id) {
  const { state } = ctx;
  if (packFor(state) !== pack) return ctx.toast('Only while you work in the field.', 'warn');
  const opt = courseOptions(state, pack).find((o) => o.course.id === id);
  if (!opt) return ctx.toast('Not offered.', 'warn');
  if (opt.reason) return ctx.toast(opt.reason, 'warn');
  const c = opt.course;
  if (opt.cost && !ctx.spend(opt.cost, nameOf(state, c), { credit: true })) return ctx.toast(`It costs $${opt.cost.toLocaleString()}.`, 'warn');
  bumpYearly(state, `vocation.course.${pack.id}`);
  const v = vocationOf(state, pack);
  ctx.stat('stress', c.stress ?? 3);
  if (c.years) {
    v.inCourse = { id: c.id, until: state.character.age + c.years };
    return ctx.log(`You started ${nameOf(state, c)}: ${c.years} year${c.years > 1 ? 's' : ''} alongside the job.`, c.icon ?? '📘', 'info');
  }
  // A pass is likely, not certain: the exams that matter are hard.
  if (c.passRate && !vrng(state).chance(clamp(c.passRate + (state.stats.smarts - 60) / 200, 0.2, 0.97))) {
    return ctx.log(`You sat ${nameOf(state, c)} and failed. You can try again next year.`, '📝', 'bad');
  }
  v.courses[c.id] = state.character.age;
  courseDone(state, c);
  ctx.log(`${c.renew && v.history.includes(c.id) ? 'You renewed' : 'You completed'} ${nameOf(state, c)}.${c.post ? ` You can use the letters ${c.post} now.` : ''}`, c.icon ?? '📘', 'good');
  if (!v.history.includes(c.id)) v.history.push(c.id);
}

/* ------------------------------------------------------------------ */
/* Postings, awards, the regulator, elite posts                        */
/* ------------------------------------------------------------------ */

function offerPosting(ctx, pack) {
  const { state } = ctx;
  const rng = vrng(state);
  const v = vocationOf(state, pack);
  if (postingOf(state) || v.postings.some((p) => p.until > state.character.age)) return false;
  const open = (pack.postings ?? []).filter((p) => applies(state, pack, p) && gradeOf(state) >= (p.minGrade ?? 0) && yearsIn(state, pack) >= (p.minYears ?? 0) && !(p.once && v.postings.some((x) => x.id === p.id)));
  if (!open.length || !rng.chance(pack.postingOdds ?? 0.1)) return false;
  const p = rng.pick(open);
  const place = p.places ? rng.pick(p.places.filter((c) => COUNTRIES[c] && c !== cc(state))) : null;
  ctx.prompt({
    type: 'vocation.posting', icon: p.icon ?? '🧳', title: nameOf(state, p),
    text: typeof p.text === 'function' ? p.text(state, place) : `${p.text}${place ? ` In ${COUNTRIES[place].name}.` : ''}`,
    options: [{ id: 'go', label: `${p.icon ?? '🧳'} Go, for ${p.years} year${p.years > 1 ? 's' : ''}`, hint: p.hint ?? '' }, { id: 'stay', label: '🏠 Not now' }],
    data: { pack: pack.id, id: p.id, place },
  });
  return true;
}
function startPosting(ctx, pack, id, place) {
  const { state } = ctx;
  const p = pack.postings.find((x) => x.id === id);
  if (!p) return;
  const v = vocationOf(state, pack);
  v.postings.push({ id, age: state.character.age, until: state.character.age + p.years, place });
  if (place) postAbroad(ctx, { place: COUNTRIES[place].name, kind: 'secondment', years: p.years, country: COUNTRIES[place].name });
  ctx.stat('stress', p.stress ?? 4);
  ctx.stat('happiness', p.happiness ?? 3);
  const job = state.career?.job;
  if (job && p.performance) job.performance = clamp((job.performance ?? 50) + p.performance, 0, 100);
  ctx.log(p.start ? p.start(state, place) : `You began ${nameOf(state, p).replace(/^A /, 'a ')}${place ? ` in ${COUNTRIES[place].name}` : ''}.`, p.icon ?? '🧳', 'milestone');
}

function awardTick(ctx, pack) {
  const { state } = ctx;
  const rng = vrng(state);
  const v = vocationOf(state, pack);
  for (const a of pack.awards ?? []) {
    if (v.awards.includes(a.id) || !applies(state, pack, a)) continue;
    if (gradeOf(state) < (a.minGrade ?? 0) || yearsIn(state, pack) < (a.minYears ?? 0)) continue;
    if ((state.career.job?.performance ?? 0) < (a.minPerformance ?? 0)) continue;
    if (a.posting && !v.postings.some((p) => p.id === a.posting && p.until <= state.character.age)) continue;
    if (a.course && !v.history.includes(a.course)) continue;
    if (a.awards && !a.awards.every((id) => v.awards.includes(id))) continue;
    if (!rng.chance(a.chance ?? 0.1)) continue;
    v.awards.push(a.id);
    addHonor(state, { id: `vocation.${pack.id}.${a.id}`, source: 'civil', name: nameOf(state, a), icon: a.icon ?? '🏅', prestige: a.prestige ?? 2, precedence: a.precedence ?? 70, ...(a.post ? { post: a.post } : {}), citation: typeof a.citation === 'function' ? a.citation(state) : a.citation });
    ctx.log(`${a.icon ?? '🏅'} ${typeof a.text === 'function' ? a.text(state) : a.text ?? `You were awarded the ${nameOf(state, a)}.`}`, a.icon ?? '🏅', 'honor');
    return; // one a year
  }
}

/** The body that disciplines the profession here, if there is one yet. */
export function regulatorOf(state, pack) {
  const r = pack.regulator?.(state);
  return r && yearNow(state) >= (r.from ?? 0) ? r : null;
}
function complaintTick(ctx, pack) {
  const { state } = ctx;
  const rng = vrng(state);
  const reg = regulatorOf(state, pack);
  if (!reg || state.prompts.some((q) => q.type === 'vocation.complaint')) return false;
  const odds = clamp((pack.complaintOdds ?? 0.02) + (pack.risk?.(state) ?? 0), 0, 0.25);
  if (!rng.chance(odds)) return false;
  const kinds = pack.complaints.filter((k) => applies(state, pack, k));
  const total = kinds.reduce((s, k) => s + (typeof k.weight === 'function' ? k.weight(state) : k.weight), 0);
  let roll = rng.float(0, total);
  const kind = kinds.find((k) => (roll -= typeof k.weight === 'function' ? k.weight(state) : k.weight) <= 0) ?? kinds[0];
  const fee = Math.round((pack.lawyerFee ?? 8000) * (kind.severity + 1));
  ctx.prompt({
    type: 'vocation.complaint', icon: '⚖️', title: `A Complaint to ${reg.name}`,
    text: `${typeof kind.text === "function" ? kind.text(state) : kind.text} ${reg.name.charAt(0).toUpperCase()}${reg.name.slice(1)} has opened a case.`,
    options: [
      { id: 'cooperate', label: '🤝 Cooperate fully, and show insight', hint: 'Best for honest mistakes' },
      { id: 'lawyer', label: '🧑‍⚖️ Instruct a defence lawyer', hint: `About $${fee.toLocaleString()} · fewer harsh outcomes` },
      { id: 'contest', label: '🛡️ Contest every point', hint: 'Cleared, or worse' },
    ],
    data: { pack: pack.id, kind: kind.id, severity: kind.severity, fee, guilty: rng.chance(kind.founded ?? 0.5) },
  });
  return true;
}
/** none · advice · warning · conditions · suspension · erasure */
const OUTCOMES = ['none', 'advice', 'warning', 'conditions', 'suspension', 'erasure'];
function hearing(ctx, pack, data, optionId) {
  const { state } = ctx;
  const rng = vrng(state);
  const v = vocationOf(state, pack);
  const reg = regulatorOf(state, pack) ?? { name: 'the regulator' };
  if (optionId === 'lawyer' && !ctx.spend(data.fee, 'Defence lawyer', { credit: true })) optionId = 'cooperate';
  // Where the case lands: founded or not, how serious, how you met it, your past.
  const prior = v.record.filter((r) => r.outcome !== 'none' && state.character.age - r.age < 10).length;
  let level = data.guilty ? data.severity + 1 + prior : rng.chance(0.25) ? 1 : 0;
  if (optionId === 'cooperate') level -= data.severity <= 1 ? 1 : 0;
  if (optionId === 'lawyer') level -= 1;
  if (optionId === 'contest') level += data.guilty ? 1 : -1;
  const outcome = OUTCOMES[clamp(level, 0, OUTCOMES.length - 1)];
  v.record.push({ age: state.character.age, id: data.kind, outcome });
  const lic = typeof pack.licence === 'function' ? pack.licence(state) : pack.licence;
  const held = lic && state.credentials.held[lic]?.status === 'active';
  const Reg = reg.name.charAt(0).toUpperCase() + reg.name.slice(1);
  const job = state.career.job;
  const kind = pack.complaints.find((k) => k.id === data.kind);
  const what = kind?.short ?? 'the complaint';
  ctx.stat('stress', 6 + data.severity * 3);
  switch (outcome) {
    case 'none': return ctx.log(`${Reg} found no case to answer over ${what}.`, '⚖️', 'good');
    case 'advice': return ctx.log(`${Reg} closed the case over ${what} with advice. Nothing on your public record.`, '⚖️', 'info');
    case 'warning': return ctx.log(`${Reg} issued a formal warning over ${what}. It stays on your record for five years.`, '⚖️', 'warn');
    case 'conditions':
      v.conditionsUntil = state.character.age + 3;
      if (job) job.performance = clamp((job.performance ?? 50) - 10, 0, 100);
      return ctx.log(held ? `${Reg} put conditions on your practice over ${what}: supervision and retraining for three years. No promotion until they lift.` : `${Reg} gave you a final written warning over ${what}. No promotion for three years.`, '⚖️', 'bad');
    case 'suspension':
      if (held) {
        ctx.emit('credential:suspend', { ids: [lic], years: 1, reason: `${reg.name}: ${what}` });
        return ctx.log(`${Reg} suspended you for a year over ${what}.`, '⚖️', 'bad');
      }
      v.conditionsUntil = state.character.age + 3;
      if (job) ctx.spend(Math.round((job.salary ?? 30000) / 12), 'Unpaid suspension', { credit: true });
      return ctx.log(`${Reg} suspended you without pay for a month over ${what}, with a final warning on file.`, '⚖️', 'bad');
    default:
      if (held) {
        ctx.emit('credential:revoke', { ids: [lic], reason: `${reg.name}: ${what}` });
        return ctx.log(`${Reg} ${pack.erasureWord ?? 'struck you off'} over ${what}.`, '⚖️', 'bad');
      }
      if (job) leaveJob(ctx, `Dismissed after a hearing over ${what}`, { fired: true });
      return ctx.log(`${Reg} dismissed you over ${what}.`, '⚖️', 'bad');
  }
}

function offerElite(ctx, pack) {
  const { state } = ctx;
  const rng = vrng(state);
  const v = vocationOf(state, pack);
  if (v.elite && v.elite.until > state.character.age) return false;
  if (v.elite) { ctx.log(`Your term as ${v.elite.name} ended.`, '🏛️', 'info'); v.elite = null; }
  const clean = !v.record.some((r) => ['conditions', 'suspension', 'erasure'].includes(r.outcome));
  const open = (pack.elite ?? []).filter((e) => applies(state, pack, e) && clean && gradeOf(state) >= (e.minGrade ?? 0) && yearsIn(state, pack) >= (e.minYears ?? 0) && v.awards.length >= (e.minAwards ?? 0) && !v.history.includes(`elite.${e.id}`));
  if (!open.length || !rng.chance(pack.eliteOdds ?? 0.06)) return false;
  const e = rng.pick(open);
  const name = nameOf(state, e);
  ctx.prompt({
    type: 'vocation.elite', icon: e.icon ?? '🏛️', title: name, text: typeof e.text === 'function' ? e.text(state) : e.text,
    options: [{ id: 'accept', label: `${e.icon ?? '🏛️'} Accept`, hint: `${e.years ? `${e.years}-year term` : 'Until you retire'}${e.stipend ? ` · $${e.stipend.toLocaleString()}/yr` : ''}` }, { id: 'decline', label: '🙅 Decline' }],
    data: { pack: pack.id, id: e.id, name },
  });
  return true;
}

/** Promotion gates from the packs (career/CareerEngine.js levelCheck). */
export function vocationGate(state, level) {
  const job = state.career?.job;
  const pack = packFor(state);
  if (!job || !pack || !getProfession(job.professionId).levels.includes(level)) return [];
  const missing = missingCourses(state, pack, level).map((c) => nameOf(state, c));
  const v = vocationOf(state, pack);
  if (v.conditionsUntil && state.character.age < v.conditionsUntil) missing.push(`conditions on your practice lifted (age ${v.conditionsUntil})`);
  return missing;
}

addLevelGate(vocationGate);

/** The specialties open to you now (a field without one of its own, such as trades or law). */
export const specialtiesOpen = (state, pack) => (pack.specialties ?? []).filter((x) => applies(state, pack, x) && (!x.professions || x.professions.includes(state.career.job?.professionId)));
function specialtyPrompt(ctx, pack) {
  const { state } = ctx;
  const v = vocationOf(state, pack);
  const open = specialtiesOpen(state, pack);
  if (v.specialty || open.length < 2 || gradeOf(state) < (pack.specialtyAt ?? 2) || state.prompts.some((q) => q.type === 'vocation.specialty')) return false;
  ctx.prompt({
    type: 'vocation.specialty', icon: '🧭', title: pack.specialtyTitle ?? 'Your Specialty',
    text: pack.specialtyText ?? 'You know the work now. Which part of it will you make yours?',
    options: open.slice(0, 6).map((x) => ({ id: x.id, label: `${x.icon ?? '🧭'} ${nameOf(state, x)}`, hint: x.hint ?? '' })),
    data: { pack: pack.id },
  });
  return true;
}
/**
 * The employer sends you on what your next rung needs, as the services send you to school: a
 * public body or a big employer most years, a small one sometimes. Nobody's career stalls on a
 * course nobody told them about.
 */
function sentOnCourse(ctx, pack) {
  const { state } = ctx;
  const rng = vrng(state);
  const job = state.career.job;
  const v = vocationOf(state, pack);
  if (v.inCourse || yearlyCount(state, `vocation.course.${pack.id}`)) return;
  const profession = getProfession(job.professionId);
  const next = nextLevels(profession, job.employer?.size ?? 'large', job.levelId);
  const due = [...new Set(next.flatMap((l) => missingCourses(state, pack, l)))].filter((c) => gradeOf(state) >= (c.minGrade ?? 0) && yearsIn(state, pack) >= (c.minYears ?? 0));
  // Lapsed renewals too: they're the employer's problem as much as yours.
  const lapsed = pack.courses.filter((c) => c.renew && v.courses[c.id] != null && !courseCurrent(state, pack, c) && applies(state, pack, c) && isRequired(c));
  const c = [...lapsed, ...due][0];
  if (!c) return;
  const odds = profession.sector !== 'private' || ['large', 'enterprise', 'mega'].includes(job.employer?.size) ? 0.8 : 0.45;
  if (!rng.chance(odds)) return;
  bumpYearly(state, `vocation.course.${pack.id}`);
  if (c.years) { v.inCourse = { id: c.id, until: state.character.age + c.years }; return ctx.log(`${job.employer?.name ?? 'Your employer'} sent you on ${nameOf(state, c)}.`, c.icon ?? '📘', 'info'); }
  if (c.passRate && !rng.chance(clamp(c.passRate + (state.stats.smarts - 60) / 200 + 0.1, 0.3, 0.97))) return ctx.log(`You sat ${nameOf(state, c)} on your employer's account, and failed. Another try next year.`, '📝', 'bad');
  v.courses[c.id] = state.character.age;
  if (!v.history.includes(c.id)) v.history.push(c.id);
  ctx.log(`${job.employer?.name ?? 'Your employer'} sent you on ${nameOf(state, c)}, and you passed.${c.post ? ` You can use the letters ${c.post} now.` : ''}`, c.icon ?? '📘', 'good');
}
/** Prompts already waiting this year: a vocation adds nothing on a crowded year. */
const crowded = (state) => state.prompts.filter((q) => scopeOfType(q.type) === 'job').length >= 2;

export const VocationModule = {
  id: 'vocation',
  order: 6.5,

  onAgeUp(ctx) {
    const { state } = ctx;
    const pack = packFor(state);
    if (!pack || !state.career.job) return;
    const v = vocationOf(state, pack);
    // A long course finishes.
    if (v.inCourse && state.character.age >= v.inCourse.until) {
      const c = pack.courses.find((x) => x.id === v.inCourse.id);
      v.courses[v.inCourse.id] = state.character.age;
      if (c) courseDone(state, c);
      if (!v.history.includes(v.inCourse.id)) v.history.push(v.inCourse.id);
      v.inCourse = null;
      if (c) ctx.log(`You finished ${nameOf(state, c)}.${c.post ? ` You can use the letters ${c.post} now.` : ''}`, c.icon ?? '🎓', 'good');
    }
    // A required course lapsing.
    for (const c of pack.courses) {
      const done = v.courses[c.id];
      if (c.renew && done != null && state.character.age - done === c.renew && applies(state, pack, c)) ctx.log(`Your ${nameOf(state, c)} has lapsed: renew it (Work tab).`, '📅', 'warn');
    }
    // A posting's end.
    for (const p of v.postings) {
      if (p.until !== state.character.age || p.done) continue;
      p.done = true;
      const def = pack.postings.find((x) => x.id === p.id);
      if (def?.end) ctx.log(def.end(state, p.place), def.icon ?? '🧳', 'info');
    }
    // An elite post's stipend.
    const e = v.elite && pack.elite.find((x) => x.id === v.elite.id);
    if (e?.stipend) ctx.earn(e.stipend, nameOf(state, e));
    sentOnCourse(ctx, pack);
    awardTick(ctx, pack);
    // At most one big thing a year, and none on a crowded one: a specialty, a complaint, an elite post, a posting.
    if (crowded(state)) return;
    if (!specialtyPrompt(ctx, pack) && !complaintTick(ctx, pack) && !offerElite(ctx, pack)) offerPosting(ctx, pack);
  },

  actions: {
    /** arg: "pack:course" */
    course(ctx, arg) {
      const [packId, id] = String(arg).split(':');
      const pack = VOCATIONS[packId];
      if (pack) takeCourse(ctx, pack, id);
    },
  },

  resolvers: {
    specialty(ctx, data, optionId) {
      const pack = VOCATIONS[data.pack];
      const x = (pack.specialties ?? []).find((s2) => s2.id === optionId);
      if (!x) return;
      vocationOf(ctx.state, pack).specialty = x.id;
      ctx.log(x.start ?? `You made ${nameOf(ctx.state, x)} your specialty.`, x.icon ?? '🧭', 'milestone');
    },
    posting(ctx, data, optionId) {
      if (optionId === 'go') startPosting(ctx, VOCATIONS[data.pack], data.id, data.place);
    },
    complaint(ctx, data, optionId) { hearing(ctx, VOCATIONS[data.pack], data, optionId); },
    elite(ctx, data, optionId) {
      const { state } = ctx;
      const pack = VOCATIONS[data.pack];
      const e = pack.elite.find((x) => x.id === data.id);
      const v = vocationOf(state, pack);
      v.history.push(`elite.${data.id}`);
      if (optionId !== 'accept') return ctx.log(`You declined to be ${data.name}.`, '🙅', 'info');
      v.elite = { id: e.id, name: data.name, since: state.character.age, until: e.years ? state.character.age + e.years : 999 };
      addHonor(state, { id: `vocation.${pack.id}.elite.${e.id}`, source: 'civil', name: data.name, icon: e.icon ?? '🏛️', prestige: e.prestige ?? 4, precedence: 60, citation: typeof e.citation === 'function' ? e.citation(state) : e.citation ?? null });
      ctx.stat('happiness', 5);
      return ctx.log(`You became ${data.name}.`, e.icon ?? '🏛️', 'milestone');
    },
  },
};
