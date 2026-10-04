/**
 * Internships: a summer with a real employer. Do well and you may leave
 * with a mentor (a lasting hiring edge in that field) and a return offer that
 * starts you one level above a normal new hire, honored at graduation.
 */
import { getProfession } from '../career/JobTrees.js';
import { levelById, nextLevels } from '../career/Ladder.js';
import { bestEntryLevel, hire, levelCheck } from '../career/CareerEngine.js';
import { createEmployer } from '../career/Employers.js';
import { schoolPrestige, educationFields, MAJORS } from '../education/Catalog.js';
import { yearlyCount, bumpYearly, visibleRecord } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { CLUBS } from './Network.js';

const MENTOR_NAMES = ['Dana Okafor', 'Priya Raman', 'Marcus Webb', 'Elena Sokolova', 'Tom Hargrove', 'Grace Liu', 'Andre Baptiste', 'Hannah Stein'];

export function internshipEligibility(state, professionId) {
  const e = state.education.enrolled;
  const profession = getProfession(professionId);
  if (!profession) return { ok: false, reason: 'Unknown field' };
  if (!e) return { ok: false, reason: 'Internships are for enrolled students' };
  if (state.character.age < 18) return { ok: false, reason: 'Must be 18+' };
  if (['certificate', 'vocational'].includes(e.programId) || e.programId === 'highschool') return { ok: false, reason: 'Degree students only' };
  if (e.yearsAttended < 1 && e.programId === 'bachelor') return { ok: false, reason: 'After your first year' };
  if (yearlyCount(state, 'campus.internship')) return { ok: false, reason: 'One internship per summer' };
  if (state.military.service?.component === 'active') return { ok: false, reason: 'On active duty' };
  return { ok: true };
}

export function internshipChance(state, professionId) {
  const profession = getProfession(professionId);
  const c = state.campus;
  const e = state.education.enrolled;
  let chance = 0.25 + ((e?.gpa || 3) - 3) * 0.2 + (state.stats.smarts - 60) / 300;
  if (educationFields(state).has(professionId) || MAJORS[e?.major]?.fields.includes(professionId)) chance += 0.15;
  chance += c.clubs.filter((id) => CLUBS[id].fields.includes(professionId)).length * 0.04;
  chance += schoolPrestige(state) * 0.04 + Math.min(0.1, c.resume * 0.01);
  if (c.mentors.some((m) => m.professionId === professionId)) chance += 0.1;
  if (state.economy.phase === 'recession') chance -= 0.1;
  if (profession.background === 'strict' && visibleRecord(state).length) chance -= 0.2;
  return clamp(chance, 0.05, 0.9);
}

export function applyInternship(ctx, professionId) {
  const { state, rng } = ctx;
  const check = internshipEligibility(state, professionId);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  bumpYearly(state, 'campus.internship');
  const profession = getProfession(professionId);
  if (!rng.chance(internshipChance(state, professionId))) {
    ctx.log(`No ${profession.name} internship this summer — the rejections piled up.`, '📭', 'warn');
    return;
  }
  const employer = createEmployer(rng, state, profession, state.character.regionId);
  ctx.prompt({
    type: 'campus.internship',
    icon: profession.icon,
    title: `Summer Internship: ${employer.name}`,
    text: `You landed a ${profession.name.toLowerCase()} internship at ${employer.name}. How do you spend the summer?`,
    options: [
      { id: 'impress', label: '🔥 Outwork every other intern', hint: 'Best shot at a return offer; stressful' },
      { id: 'network', label: '🤝 Get to know everyone', hint: 'Find a mentor' },
      { id: 'coast', label: '😎 Coast and enjoy the city' },
    ],
    data: { professionId, employer },
  });
}

export function resolveInternship(ctx, data, optionId) {
  const { state, rng } = ctx;
  const profession = getProfession(data.professionId);
  const c = state.campus;
  const entry = bestEntryLevel(state, profession, data.employer.size) ?? profession.levels[0];
  const pay = Math.round(18 * 40 * 11 * profession.payMultiplier * (1 + entry.grade * 0.08));
  ctx.earn(pay, `Internship — ${data.employer.name}`, { wage: true });
  const perf = { impress: 0.75, network: 0.5, coast: 0.2 }[optionId] + (state.stats.smarts - 60) / 200 + rng.float(-0.15, 0.15);
  if (optionId === 'impress') ctx.stat('stress', 8);
  if (optionId === 'coast') ctx.stat('happiness', 4);
  c.internships.push({ professionId: data.professionId, employerName: data.employer.name, age: state.character.age, rating: Math.round(clamp(perf, 0, 1) * 100) });
  c.resume += 2;
  let text = `You finished your internship at ${data.employer.name} ($${pay.toLocaleString()}).`;
  if (rng.chance(optionId === 'network' ? 0.7 : optionId === 'impress' ? 0.35 : 0.1)) {
    const mentor = { name: rng.pick(MENTOR_NAMES), professionId: data.professionId, employerName: data.employer.name, age: state.character.age };
    c.mentors.push(mentor);
    text += ` ${mentor.name} offered to mentor you.`;
  }
  const offerChance = clamp(perf * (state.economy.phase === 'recession' ? 0.5 : 0.85), 0, 0.85);
  if (rng.chance(offerChance)) {
    c.offers = c.offers.filter((o) => o.professionId !== data.professionId);
    c.offers.push({ professionId: data.professionId, employer: data.employer, age: state.character.age });
    text += ' They extended a return offer for after graduation!';
    ctx.toast(`Return offer: ${data.employer.name}`, 'good');
  }
  ctx.log(text, profession.icon, 'good');
}

/** The level a return offer starts at: one rung above a normal new hire when you qualify for it. */
export function returnOfferLevel(state, profession, employer) {
  const entry = bestEntryLevel(state, profession, employer.size);
  if (!entry) return null;
  const up = nextLevels(profession, employer.size, entry.id).find((l) => l.track !== 'mgmt' && levelCheck(state, l).ok && !levelCheck(state, l).clearanceNeeded);
  return up ?? entry;
}

export function offerPrompt(ctx) {
  const { state } = ctx;
  const offers = state.campus.offers;
  if (!offers.length || state.career.job) {
    if (offers.length) ctx.log('Your internship return offers expired — you already have a job.', '📨');
    state.campus.offers = [];
    return;
  }
  ctx.prompt({
    type: 'campus.returnOffer',
    icon: '📨',
    title: 'Return Offers',
    text: 'Your internship employers want you back full-time.',
    options: [
      ...offers.map((o, i) => {
        const profession = getProfession(o.professionId);
        const level = returnOfferLevel(state, profession, o.employer);
        return { id: String(i), label: `${profession.icon} ${o.employer.name} — ${level ? level.title : 'no eligible role'}`, hint: level ? `G${level.grade}${level !== profession.levels[0] ? ' · above normal entry' : ''}` : 'You lack a required license or degree', disabled: !level };
      }),
      { id: 'decline', label: '🙅 Decline and job-hunt' },
    ],
  });
}

export function resolveReturnOffer(ctx, _data, optionId) {
  const { state } = ctx;
  const offer = state.campus.offers[Number(optionId)];
  state.campus.offers = [];
  if (!offer || state.career.job) return ctx.log('You declined your return offers.', '🙅');
  const profession = getProfession(offer.professionId);
  const level = returnOfferLevel(state, profession, offer.employer);
  if (!level) return;
  // Some careers have their own gate (clergy need a faith; judges a bench).
  const gate = profession.eligible?.(state);
  if (gate && !gate.ok) return ctx.log(`${offer.employer.name} withdrew its offer: ${gate.reason.toLowerCase()}.`, '📭', 'warn');
  hire(ctx, { professionId: offer.professionId, levelId: level.id, employer: offer.employer, step: 2 });
  state.campus.returnHire = { professionId: offer.professionId, levelId: level.id, age: state.character.age };
  ctx.log(`You accepted the return offer from ${offer.employer.name} as ${levelById(profession, level.id).title}.`, '🤝', 'milestone');
}
