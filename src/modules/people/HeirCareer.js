/**
 * Continuing as a child: the job they had as a family member becomes a real career.
 *
 * Family members work in plain job titles (NpcLives.js). When you take over one of their
 * lives, the title maps to a profession: they're hired into it, at a level that fits their
 * years of work, with the degree and licences the job needs (they had them already).
 * A job that doesn't exist where they live is left as experience on the record.
 */
import { getProfession, professionsFor } from '../career/JobTrees.js';
import { createEmployer } from '../career/Employers.js';
import { hire } from '../career/CareerEngine.js';
import { grantCredential } from '../credentials/LicensingEngine.js';
import { jobFor } from './NpcLives.js';

/** NPC title → profession, the bachelor's major, and any further degree [type, programId]. */
export const NPC_CAREERS = {
  Barista: { prof: 'culinary' }, Cashier: { prof: 'retail' }, 'Warehouse associate': { prof: 'logistics' }, 'Line cook': { prof: 'culinary' },
  'Retail manager': { prof: 'retail' }, 'Delivery driver': { prof: 'logistics' }, 'Administrative assistant': { prof: 'corporate' }, 'Bank teller': { prof: 'finance' },
  'Police officer': { prof: 'police' }, Firefighter: { prof: 'fire' }, 'Mail carrier': { prof: 'postal' }, 'Truck driver': { prof: 'trucking' },
  Electrician: { prof: 'trades' }, Plumber: { prof: 'plumbing' }, 'HVAC technician': { prof: 'hvac' }, Welder: { prof: 'welding' }, 'Auto mechanic': { prof: 'automotive' },
  'Dental hygienist': { prof: 'dentalHygiene', degree: ['associate', 'dentalHygieneProgram'] }, Paralegal: { prof: 'legalSupport', degree: ['associate', 'associate'] },
  'Respiratory therapist': { prof: 'respiratoryTherapy', degree: ['associate', 'respiratoryTech'] }, Chef: { prof: 'culinary' },
  Teacher: { prof: 'education', major: 'education' }, Nurse: { prof: 'nursing', major: 'nursing' }, Accountant: { prof: 'accounting', major: 'accounting' },
  'Software developer': { prof: 'tech', major: 'computerScience' }, Engineer: { prof: 'engineering', major: 'engineering' },
  'Social worker': { prof: 'socialWork', major: 'socialWork' }, 'Graphic designer': { prof: 'design', major: 'arts' }, Realtor: { prof: 'realestate', major: 'business' },
  'Marketing manager': { prof: 'marketing', major: 'marketing' }, 'Financial analyst': { prof: 'finance', major: 'economics' },
  'School principal': { prof: 'education', major: 'education', degree: ['master', 'master'] }, 'Physical therapist': { prof: 'physicalTherapy', major: 'kinesiology', degree: ['professional', 'dpt'] },
  'Nurse practitioner': { prof: 'nursing', major: 'nursing', degree: ['master', 'master'] }, 'Data scientist': { prof: 'dataScience', major: 'mathematics', degree: ['master', 'master'] },
  Lawyer: { prof: 'law', major: 'politicalScience', degree: ['professional', 'jd'] }, Doctor: { prof: 'medical', major: 'biology', degree: ['professional', 'md'] },
  Pharmacist: { prof: 'pharmacy', major: 'chemistry', degree: ['professional', 'pharmd'] }, Dentist: { prof: 'dentistry', major: 'biology', degree: ['professional', 'dds'] },
  Professor: { prof: 'university', major: 'physics', degree: ['doctorate', 'phd'] }, 'Research scientist': { prof: 'research', major: 'chemistry', degree: ['doctorate', 'phd'] },
};
/** Where a profession doesn't exist, the nearest one that does. */
const ALTERNATES = { police: ['statePolice', 'sheriff'], fire: ['stateFire'], postal: ['logistics'] };
const START_AGE = { none: 18, highschool: 18, trade: 20, associate: 20, bachelor: 22, master: 24, professional: 27, doctorate: 28 };

/** What a family member's working life carries into yours: { job, edu, sector, income }. */
export function heirWork(p, rng) {
  if (!p) return null;
  const edu = p.life?.edu ?? (p.degree ? 'bachelor' : 'highschool');
  if (p.job && !/family business|^Owner, |part-time/.test(p.job)) return { job: p.job, edu, income: p.careerIncome ?? p.income ?? 0, employer: p.life?.employer ?? null };
  // Between jobs, but of working age and out of school: the work their schooling fits.
  if (rng && !p.life?.studying && !p.retired && p.ageNow >= 22 && p.ageNow < 65) return { job: jobFor(rng, edu, p.traits?.smarts)[0], edu, income: 0, employer: null, between: true };
  return null;
}

/** The degrees a job needed, on your record if they aren't there already. */
function ensureDegrees(state, map, edu) {
  const d = state.education.degrees;
  const has = (type) => d.some((x) => x.type === type);
  const age = state.character.age;
  if (!has('highschool')) d.push({ type: 'highschool', programId: 'highschool', major: null, year: Math.min(18, age) });
  const needBachelor = map.major || ['bachelor', 'master', 'professional', 'doctorate'].includes(edu) || ['master', 'professional', 'doctorate'].includes(map.degree?.[0]);
  if (needBachelor && !d.some((x) => x.type === 'bachelor' && (!map.major || x.major === map.major))) d.push({ type: 'bachelor', programId: 'bachelor', major: map.major ?? 'business', schoolId: 'state', gpa: 3.2, year: Math.min(22, age) });
  if (map.degree && !d.some((x) => x.programId === map.degree[1])) d.push({ type: map.degree[0], programId: map.degree[1], major: map.major ?? null, schoolId: 'state', gpa: 3.4, year: Math.min(START_AGE[map.degree[0]] ?? 24, age) });
}

/**
 * Hire the heir into the career they had. Returns the job, or null (no job, no match, or the
 * profession doesn't exist here).
 */
export function resumeHeirCareer(ctx, work) {
  const { state, rng } = ctx;
  if (!work || state.character.age < 18 || state.career.job) return null;
  const map = NPC_CAREERS[work.job];
  if (!map) return null;
  // The same work where they live: the national service (the Deutsche Post, a Land police force) if the US-style one isn't there.
  const here = new Set(professionsFor(state).map((p) => p.id));
  const cc = (state.character.countryId ?? 'US').toLowerCase();
  const id = [map.prof, `${cc}_${map.prof}`, ...(ALTERNATES[map.prof] ?? [])].find((x) => here.has(x));
  const profession = id ? getProfession(id) : null;
  if (!profession) {
    state.career.history.push({ professionId: null, title: work.job, employerName: 'previous employer', sector: 'private', peakGrade: 2, startAge: START_AGE[work.edu] ?? 22, endAge: state.character.age, reason: 'Moved on' });
    return null;
  }
  ensureDegrees(state, map, work.edu);
  // Climb from the entry level, one step for every few years of work, on the entry track.
  const levels = profession.levels;
  const entryIdx = Math.max(0, levels.findIndex((l) => l.entry));
  const track = levels[entryIdx].track ?? 'shared';
  const ladder = levels.slice(entryIdx).filter((l) => !l.track || l.track === 'shared' || l.track === track);
  const years = Math.max(0, state.character.age - (START_AGE[map.degree?.[0] ?? work.edu] ?? 22));
  const level = ladder[Math.min(ladder.length - 1, Math.floor(years / 5), 3)] ?? levels[entryIdx];
  // The licences the post requires: they held them already.
  for (const l of levels.slice(0, levels.indexOf(level) + 1)) for (const id of l.req?.credentials ?? []) if (!state.credentials.held[id]) { try { grantCredential(ctx, id, { silent: true }); } catch { /* not a credential here */ } }
  const employer = createEmployer(rng, state, profession, state.character.regionId);
  const job = hire(ctx, { professionId: profession.id, levelId: level.id, employer });
  if (!job) return null;
  job.yearsAtEmployer = work.between ? 0 : Math.min(years, rng.int(1, 8));
  const a = /^[AEIOU]/i.test(job.title) ? 'an' : 'a';
  ctx.log(work.between ? `Between jobs when you took over, you found work as ${a} ${job.title} at ${employer.name}.` : `You carry on as ${a} ${job.title} at ${employer.name}, the job you already had.`, profession.icon ?? '💼', 'info');
  return job;
}
