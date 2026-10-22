/**
 * Places grow and shrink, and their governments with them.
 *
 * Each place's population drifts from its census figure (Staffing): Sun Belt
 * and mountain metros grow a percent or two a year, big coastal cities hold
 * steady, small towns and rural counties slowly empty out — and now and then
 * something big happens (a plant opens or closes, a boom, a disaster). Public
 * organizations are staffed for the people they serve, so a growing city's
 * police department hires and a shrinking one doesn't replace those who leave.
 *
 * Budgets move them too: a department funded at 110% of normal staffs up; one
 * cut to 85% shrinks. As a department's headcount crosses a size bracket its
 * rank structure changes (Employers.governmentTier): a small-town force that
 * grows into a mid-size department gets lieutenants and captains; a shrinking
 * one loses ranks (your pay is protected if your rank disappears).
 *
 * state.world.pop = { [regionId]: factor }  (1 = the census figure)
 * org.popFactor, dept.fundingFactor — read by Staffing.
 */
import { clamp, Random } from '../../core/Random.js';
import { REGIONS } from '../life/Regions.js';
import { AREA_OF, budgetAt } from '../politics/Budgets.js';
import { orgType } from '../org/Organizations.js';
import { getProfession } from '../career/JobTrees.js';
import { ladderFor } from '../career/Ladder.js';
import { governmentTier } from '../career/Employers.js';
import { recalcSalary } from '../career/Compensation.js';

/** Yearly drift by kind of place. */
const TREND = { 'Sun Belt metro': 0.017, 'Mountain metro': 0.015, Suburb: 0.012, 'Capital region': 0.008, 'Mid-size city': 0.006, 'Small city': 0.003, 'Coastal metro': 0.002, 'High-cost metro': 0, 'Major metro': 0.002, 'Small town': -0.004, Rural: -0.007 };
const SIZE_ORDER = ['micro', 'small', 'medium', 'large', 'enterprise', 'mega'];

export const popFactor = (state, regionId) => state.world?.pop?.[regionId] ?? 1;

const SHOCKS = [
  { delta: 0.06, text: (c) => `A major employer opened a plant outside ${c}. New families are arriving every month.` },
  { delta: 0.04, text: (c) => `${c} is booming: new subdivisions, new schools, traffic.` },
  { delta: -0.06, text: (c) => `The largest employer in ${c} closed. Families are moving away to find work.` },
  { delta: -0.03, text: (c) => `Young people keep leaving ${c} for the cities.` },
];

/** A year for the places you have ties to: population, then every public body there. */
function yearFor(ctx, regionId, rng, here) {
  const { state } = ctx;
  const r = REGIONS[regionId];
  if (!r) return;
  state.world.pop ??= {};
  let f = state.world.pop[regionId] ?? 1;
  f *= 1 + (TREND[r.type] ?? 0.003) + rng.float(-0.004, 0.004) + (state.economy?.phase === 'recession' ? -0.003 : 0);
  if (rng.chance(0.03)) {
    const s = rng.pick(SHOCKS);
    f *= 1 + s.delta;
    if (here) ctx.log(s.text(r.name.split(',')[0]), s.delta > 0 ? '🏗️' : '🏚️', 'info');
  }
  state.world.pop[regionId] = Math.round(clamp(f, 0.5, 2.5) * 1000) / 1000;
}

/** Public bodies follow their place's population and their department's funding. */
function syncOrgs(state) {
  for (const org of Object.values(state.orgs?.byId ?? {})) {
    if (!org || org.business || org.sector === 'private' || org.military || org.volunteer) continue;
    if (org.national) org.popFactor = 1;
    else if (org.regionId) org.popFactor = popFactor(state, org.regionId);
    // Funding: each department follows the budget line of the career it employs.
    const t = orgType(org.typeId);
    for (const d of Object.values(org.departments ?? {})) {
      const occ = t?.departments?.find((x) => x.id === d.id)?.occupations?.[0] ?? org.serviceId;
      const [level, area] = AREA_OF[occ] ?? [];
      if (!level) continue;
      const where = level === 'city' ? org.regionId : level === 'state' ? (org.stateId ?? REGIONS[org.regionId]?.state) : (org.countryId ?? REGIONS[org.regionId]?.country ?? 'US');
      const b = where ? budgetAt(state, level, { where, create: false }) : null;
      d.fundingFactor = b ? Math.round(clamp(b.funding[area] ?? 1, 0.6, 1.4) * 1000) / 1000 : 1;
    }
    org.fundingFactor = Object.values(org.departments ?? {})[0]?.fundingFactor ?? 1;
  }
}

/** Your agency outgrew (or shrank out of) its size bracket: new ranks, or fewer. */
function retier(ctx) {
  const { state } = ctx;
  const job = state.career?.job;
  if (!job || job.sector === 'private' || job.employer?.national) return;
  const profession = getProfession(job.professionId);
  const tier = governmentTier(state, job.employer, profession);
  if (!tier || tier === job.employer.size || job.employer.size === 'mega') return;
  const grew = SIZE_ORDER.indexOf(tier) > SIZE_ORDER.indexOf(job.employer.size);
  const before = ladderFor(profession, job.employer.size).length;
  job.employer.size = tier;
  const ladder = ladderFor(profession, tier);
  const name = job.employer.division ?? job.employer.name;
  if (!ladder.some((l) => l.id === job.levelId)) {
    // Your rank no longer exists here: the nearest one at or below your grade, pay protected.
    const salary = job.salary;
    const level = [...ladder].filter((l) => l.grade <= job.grade && !l.appointed).sort((a, b) => b.grade - a.grade)[0] ?? ladder[0];
    Object.assign(job, { levelId: level.id, title: job.titleMap?.[level.id] ?? level.title, grade: level.grade, abilities: [...level.abilities], track: level.track });
    recalcSalary(state, job);
    job.salary = Math.max(job.salary, salary);
    ctx.log(`${name} shrank below its old size: your rank was folded into ${job.title}, with your pay protected.`, '📉', 'warn');
    return;
  }
  ctx.log(grew
    ? `${name} has grown into a ${tier === 'large' ? 'large' : tier === 'enterprise' ? 'major' : 'bigger'} agency${ladder.length > before ? ': new ranks and command posts above you' : ''}.`
    : `${name} has shrunk${ladder.length < before ? ': some ranks above you are being phased out' : ''}.`, grew ? '📈' : '📉', 'info');
}

export const PopulationModule = {
  id: 'population',
  order: 23.7,
  init(state) {
    state.world ??= {};
    state.world.pop ??= {};
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    const rng = new Random(((state.world?.seed ?? 1) * 3571 + state.character.age * 29 + 13) >>> 0);
    const home = state.character.regionId;
    const places = new Set([home, state.career?.job?.employer?.regionId].filter(Boolean));
    for (const regionId of places) yearFor(ctx, regionId, rng, regionId === home);
    syncOrgs(state);
    retier(ctx);
  },
};
