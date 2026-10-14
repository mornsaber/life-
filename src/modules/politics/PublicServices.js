/**
 * Politics decides who polices and protects a town.
 *
 * A city can run its own police department (and fire department) or
 * contract the service out: to the county sheriff in the US, to the RCMP or
 * the OPP in Canada, to the Carabinieri in Italy. Where municipal police
 * exist at all, a mayor can disband the city force and contract it out
 * (cheaper, less local control), or found one where the town has been
 * contracting (expensive, popular). City councils sometimes do the same on
 * their own.
 *
 * The people who work there feel it: when a department is disbanded its
 * officers are offered transfers to the contract provider — or laid off
 * with severance; when one is founded, deputies who covered the town can
 * join it a rank up.
 *
 * state.world.municipal[regionId] = { police: 'own' | 'contracted', fire: 'own' | 'contracted' }
 */
import { REGIONS } from '../life/Regions.js';
import { getProfession } from '../career/JobTrees.js';
import { agencyExists } from '../world/LocalAgencies.js';
import { hire, leaveJob } from '../career/CareerEngine.js';
import { createEmployer } from '../career/Employers.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { clamp, Random } from '../../core/Random.js';

export const SERVICES = ['police', 'fire'];
/** Who a town contracts with, by country (and the career that provider's staff follow). */
const PROVIDERS = {
  US: { police: { name: 'the county sheriff', profession: 'sheriff' }, fire: { name: 'the county fire district', profession: 'fire' } },
  CA: { police: { name: 'the RCMP (provincial policing contract)', profession: 'statePolice', ON: { name: 'the Ontario Provincial Police', profession: 'statePolice' } }, fire: { name: 'a regional fire service', profession: 'fire' } },
  FR: { police: { name: 'the Police nationale and Gendarmerie alone', profession: 'statePolice' } },
  IT: { police: { name: 'the Carabinieri', profession: 'statePolice' } },
  MX: { police: { name: 'the state police (mando único)', profession: 'statePolice' } },
};
const LABEL = { police: 'police department', fire: 'fire department' };

const cc = (state) => state.character.countryId ?? 'US';
const cityName = (regionId) => REGIONS[regionId]?.name?.split(',')[0] ?? 'the city';
export const providerOf = (state, service) => {
  const p = PROVIDERS[cc(state)]?.[service];
  if (!p) return null;
  const province = REGIONS[state.character.regionId]?.state?.split('-')[1];
  return p[province] ?? p;
};

/** How the city you live in delivers a service. */
export function arrangementOf(state, service, regionId = state.character.regionId) {
  return state.world?.municipal?.[regionId]?.[service] ?? 'own';
}
const setArrangement = (state, service, value, regionId = state.character.regionId) => {
  state.world.municipal ??= {};
  state.world.municipal[regionId] = { ...(state.world.municipal[regionId] ?? {}), [service]: value };
};

/** Can this city choose? Only where local forces exist (no city police in Britain or Japan). */
export function canChoose(state, service) {
  const province = REGIONS[state.character.regionId]?.state;
  if (!providerOf(state, service)) return false;
  return agencyExists(cc(state), service, province);
}

/** The mayor's options for a service: { ok, reason, action, label, effect }. */
export function mayorChoice(state, service) {
  const office = state.politics?.office;
  if (office?.id !== 'mayor' && !/mayor/i.test(office?.id ?? '')) return { ok: false, reason: 'Mayors only' };
  if (!canChoose(state, service)) return { ok: false, reason: 'Cities here don\'t run their own force' };
  if (yearlyCount(state, `municipal.${service}`)) return { ok: false, reason: 'One change a year' };
  const p = providerOf(state, service);
  const own = arrangementOf(state, service) === 'own';
  return own
    ? { ok: true, action: 'contract', label: `📃 Disband the city ${LABEL[service]} and contract with ${p.name}`, effect: 'Saves ~15% of its budget · less local control · layoffs or transfers' }
    : { ok: true, action: 'establish', label: `🏛️ Found a city ${LABEL[service]}`, effect: 'Popular, but costs money to stand up · new jobs' };
}

/** Change how a city delivers a service — by the mayor or a council vote — and deal with the staff. */
export function changeService(ctx, service, to, { byMayor = false, regionId = ctx.state.character.regionId } = {}) {
  const { state } = ctx;
  const city = cityName(regionId);
  const p = providerOf(state, service);
  setArrangement(state, service, to, regionId);
  const fiscal = state.publicService?.city;
  if (fiscal) fiscal.fiscalHealth = Math.round(clamp(fiscal.fiscalHealth + (to === 'contracted' ? 8 : -10), 0, 100));
  if (byMayor && state.politics.office) state.politics.office.approval = Math.round(clamp(state.politics.office.approval + (to === 'contracted' ? -6 : 4), 0, 100));
  ctx.log(to === 'contracted'
    ? `${city} disbanded its ${LABEL[service]} and contracted the service to ${p.name}.${byMayor ? ' Your budget office counts the savings; the union counts the votes.' : ''}`
    : `${city} founded its own ${LABEL[service]}${byMayor ? ' — your campaign promise kept' : ''}. It's hiring.`, service === 'police' ? '🚓' : '🚒', 'milestone');
  // Staff affected.
  const job = state.career.job;
  if (!job) return;
  const inCity = (job.employer.cityName ?? REGIONS[job.employer.regionId]?.name) === REGIONS[regionId]?.name || job.employer.name.includes(city);
  if (to === 'contracted' && job.professionId === service && job.sector === 'municipal' && inCity) {
    ctx.prompt({
      type: 'cityServices.transfer', icon: '📃', title: `${city} Disbands Its ${service === 'police' ? 'Police' : 'Fire'} Department`,
      text: `${p.name[0].toUpperCase()}${p.name.slice(1)} is taking over. Officers and staff can transfer — at their current rank where there's a place, otherwise one lower — or take severance.`,
      options: [{ id: 'transfer', label: `🔁 Transfer to ${p.name}`, hint: 'Keep working; your seniority partly carries over' }, { id: 'rif', label: '📦 Take severance (laid off)', hint: 'A quarter-year\'s pay and unemployment benefits' }],
      data: { service, regionId },
    });
  } else if (to === 'own' && job.professionId === p?.profession && job.professionId !== service) {
    ctx.prompt({
      type: 'cityServices.newDepartment', icon: '🏛️', title: `${city} Is Starting a ${service === 'police' ? 'Police' : 'Fire'} Department`,
      text: `The new department wants experienced people who know the town. You covered ${city} for ${p.name}.`,
      options: [{ id: 'join', label: '🏛️ Join the new department', hint: 'A rank up — and the uncertainty of a start-up' }, { id: 'stay', label: '🙅 Stay where you are' }],
      data: { service, regionId },
    });
  }
}

/** The level in another ladder at (or just below) your grade. */
function matchingLevel(profession, size, grade, stepDown) {
  const levels = profession.levels.filter((l) => !l.appointed && !l.id.endsWith('_cmd1'));
  const target = grade - (stepDown ? 1 : 0);
  return [...levels].filter((l) => l.grade <= target).sort((a, b) => b.grade - a.grade)[0] ?? levels.find((l) => l.entry) ?? levels[0];
}

function moveTo(ctx, professionId, { gradeShift = 0, why, employerName = null }) {
  const { state, rng } = ctx;
  const old = state.career.job;
  const profession = getProfession(professionId);
  if (!profession) return false;
  const employer = createEmployer(rng, state, profession, state.character.regionId);
  if (employerName) employer.name = employerName;
  const level = matchingLevel(profession, employer.size, old.grade + gradeShift, gradeShift < 0);
  const years = old.yearsAtEmployer ?? 0;
  const salary = old.salary;
  leaveJob(ctx, why, { fired: false });
  const job = hire(ctx, { professionId, levelId: level.id, employer });
  if (!job) return false;
  // Seniority partly carries over in a transfer.
  job.yearsAtEmployer = Math.round(years * 0.5);
  job.salary = Math.max(job.salary, Math.round(salary * (gradeShift > 0 ? 1.08 : 0.97)));
  return job;
}

export const PublicServiceActions = {
  /** The mayor changes how the city delivers a service: arg = 'police' | 'fire'. */
  decide(ctx, service) {
    const { state } = ctx;
    const c = mayorChoice(state, service);
    if (!c.ok) return ctx.toast(c.reason, 'warn');
    bumpYearly(state, `municipal.${service}`);
    changeService(ctx, service, c.action === 'contract' ? 'contracted' : 'own', { byMayor: true });
  },
};

export const PublicServiceResolvers = {
  transfer(ctx, data, optionId) {
    const { state } = ctx;
    const job = state.career.job;
    if (!job) return;
    const p = providerOf(state, data.service);
    if (optionId === 'transfer' && p) {
      const sameCareer = p.profession === data.service;
      const moved = moveTo(ctx, p.profession, { gradeShift: ctx.rng.chance(0.5) ? 0 : -1, why: `Department disbanded: transferred to ${p.name}`, employerName: sameCareer ? `${cityName(data.regionId)} Area Fire Protection District` : null });
      if (moved) return ctx.log(`You transferred to ${p.name} as ${moved.title}.`, '🔁', 'good');
    }
    const severance = Math.round(job.salary * 0.25);
    leaveJob(ctx, 'Laid off when the department was disbanded (reduction in force)', { fired: false });
    ctx.earn(severance, 'Severance pay', { wage: true });
    ctx.emit('career:laidOff', { reason: 'rif' });
    ctx.log(`You took severance ($${severance.toLocaleString()}) when the department closed.`, '📦', 'warn');
  },
  newDepartment(ctx, data, optionId) {
    if (optionId !== 'join' || !ctx.state.career.job) return;
    const moved = moveTo(ctx, data.service, { gradeShift: 1, why: `Joined the new city ${LABEL[data.service]}` });
    if (moved) ctx.log(`You joined the new city ${LABEL[data.service]} as ${moved.title}.`, '🏛️', 'milestone');
  },
};

export const PublicServicesModule = {
  id: 'cityServices',
  order: 33.6,
  init(state) {
    state.world ??= {};
    state.world.municipal ??= {};
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    // Its own random stream, so council politics doesn't shift the rest of the life.
    const rng = new Random(((state.world?.seed ?? 1) * 40503 + state.character.age * 131 + 7) >>> 0);
    // Councils sometimes change course on their own (not while you're the mayor deciding).
    if (state.politics?.office?.id === 'mayor') return;
    for (const service of SERVICES) {
      if (!canChoose(state, service) || !rng.chance(0.012)) continue;
      changeService(ctx, service, arrangementOf(state, service) === 'own' ? 'contracted' : 'own');
    }
  },
  actions: { decide: PublicServiceActions.decide },
  resolvers: PublicServiceResolvers,
};
