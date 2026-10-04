/**
 * Workforce churn: organizations live on without you.
 *
 * Each year the department you work in hires and loses people (more hiring
 * in good times, layoffs and attrition in bad), the named people around you
 * come and go (Vacancies handles who leaves a seat), and some who left come
 * back — a boomerang hire, an old coworker returning from another agency.
 *
 * org.alumni = [{ id, name, gender, professionId, levelId, title, deptId, why, leftAge }] (most recent 12)
 * dept.lastYear = { hired, left }
 */
import { clamp } from '../../core/Random.js';
import { orgOf, sideRng } from './Organizations.js';
import { seat, seatsAt, NAMED_SEATS } from './Vacancies.js';
import { getProfession } from '../career/JobTrees.js';
import { levelById } from '../career/Ladder.js';

const ALUMNI_KEPT = 12;
const RETURNABLE = /resigned|transferred/;

/** Remember someone who left (so they might come back). */
export function rememberDeparture(state, org, person, why) {
  org.alumni ??= [];
  org.alumni.push({ id: person.id, name: person.name, gender: person.gender, age: person.age, professionId: person.professionId, levelId: person.levelId, title: person.title, deptId: person.deptId, why, leftAge: state.character.age });
  if (org.alumni.length > ALUMNI_KEPT) org.alumni.splice(0, org.alumni.length - ALUMNI_KEPT);
}

/** Yearly hiring and attrition for your department, and the odd boomerang. */
export function churnTick(ctx, job) {
  const { state } = ctx;
  const org = orgOf(state, job?.employer);
  const dept = org?.departments[job.employer.deptId];
  if (!dept) return;
  const rng = sideRng(state);
  const phase = state.economy?.phase ?? 'expansion';
  const privateSector = org.sector === 'private';
  const growth = { expansion: 0.03, peak: 0.01, recession: privateSector ? -0.06 : -0.01, recovery: 0.015 }[phase] ?? 0;
  const attrition = rng.float(0.08, 0.14);
  const left = Math.round(dept.headcount * attrition);
  const hired = Math.max(0, Math.round(dept.headcount * (attrition + growth + rng.float(-0.02, 0.02))));
  dept.headcount = Math.max(5, dept.headcount - left + hired);
  dept.lastYear = { hired, left };

  // Boomerangs: someone who resigned or transferred comes back to their old post.
  // Only into a post with room (named posts have few seats) and never as someone already here.
  const hasRoom = (a) => {
    const profession = getProfession(a.professionId);
    const level = profession && levelById(profession, a.levelId);
    const d = org.departments[a.deptId ?? dept.id];
    if (!level || !d || org.people[a.id]) return false;
    if (org.business) return true;
    const seats = seatsAt(org, d.id, profession, level, job.employer.size);
    const held = (d.seats[a.professionId]?.[a.levelId] ?? []).filter((id) => org.people[id]).length + (job.levelId === a.levelId && job.employer.deptId === d.id ? 1 : 0);
    return seats > NAMED_SEATS || held < seats;
  };
  const back = (org.alumni ?? []).filter((a) => RETURNABLE.test(a.why) && state.character.age - a.leftAge >= 1 && state.character.age - a.leftAge <= 6 && a.professionId === job.professionId && hasRoom(a));
  if (back.length && rng.chance(0.12)) {
    const a = rng.pick(back);
    org.alumni = org.alumni.filter((x) => x !== a);
    const person = { id: a.id, name: a.name, gender: a.gender, age: (a.age ?? 40) + (state.character.age - a.leftAge), professionId: null, levelId: null, title: a.title, deptId: a.deptId, years: 0, performance: rng.int(50, 80), rel: rng.int(45, 65), selection: 'hired', returned: true };
    org.people[person.id] = person;
    seat(org, a.deptId ?? dept.id, a.professionId, a.levelId, person, a.title);
    ctx.log(`${a.name} came back to ${job.employer.name} as ${a.title}.`, '🔁');
  }
  // Big swings are news inside the building.
  if (privateSector && phase === 'recession' && hired < left) job.coworkers = Math.round(clamp(job.coworkers - 3, 0, 100));
}
